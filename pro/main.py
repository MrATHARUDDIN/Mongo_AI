import json
from pathlib import Path
from typing import List, Optional
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Path as PathParam, Query
from openai import APIError
from pymongo.errors import PyMongoError

from database import (
    MODEL_NAME,
    ai_client,
    build_or_load_schema,
    dati_coll,
    format_document,
)
from memory import (
    calculate_weighted_memories,
    delete_memory_by_id,
    fetch_memories,
    insert_memory,
    update_memory_by_id,  
)
from models import MemoryCreate, MemoryResponse, MemoryUpdate, QueryRequest

app = FastAPI(title="Agent Memory & Data API")

FALLBACK_MODEL_NAME = "gemma-4-26b:free"
EXAMPLES_FILE = Path("few_shot_examples.json")


def load_few_shot_examples() -> list:
    """Helper function to load natural language query translation examples."""
    if EXAMPLES_FILE.exists():
        try:
            with open(EXAMPLES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []


def safe_chat_completion(messages: list, temperature: float = 0.0):
    """Executes chat completion with error handling and fallback model routing."""
    try:
        return ai_client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=temperature,
        )
    except APIError as e:
        if getattr(e, "status_code", None) in [503, 429]:
            try:
                return ai_client.chat.completions.create(
                    model=FALLBACK_MODEL_NAME,
                    messages=messages,
                    temperature=temperature,
                )
            except Exception:
                raise HTTPException(
                    status_code=503,
                    detail="AI service provider is overloaded. Please try again in a few moments.",
                )
        raise HTTPException(status_code=500, detail=f"AI Provider Error: {str(e)}")


# --- MEMORY ENDPOINTS ---
@app.post("/api/memories", response_model=MemoryResponse)
async def create_memory_endpoint(entry: MemoryCreate):
    return await insert_memory(entry)


@app.get("/api/memories", response_model=List[MemoryResponse])
async def get_memories_endpoint(include_overridden: bool = Query(True)):
    return await fetch_memories(include_overridden)


@app.get("/api/memories/consult")
async def consult_memories_endpoint(
    min_authority: float = Query(0.0, ge=0.0, le=10.0),
    limit: int = Query(10, ge=1, le=50),
):
    return await calculate_weighted_memories(min_authority, limit)


# NEW: Endpoint to modify existing memory entries
@app.put("/api/memories/{memory_id}", response_model=MemoryResponse)
async def update_memory_endpoint(
    memory_id: str = PathParam(..., description="The ID of the memory entry to update"),
    entry: MemoryUpdate = ...,
):
    updated_memory = await update_memory_by_id(memory_id, entry)
    if not updated_memory:
        raise HTTPException(status_code=404, detail="Memory entry not found")
    return updated_memory


# NEW: Endpoint to delete memory entries
@app.delete("/api/memories/{memory_id}")
async def delete_memory_endpoint(
    memory_id: str = PathParam(..., description="The ID of the memory entry to delete")
):
    success = await delete_memory_by_id(memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory entry not found")
    return {"status": "success", "message": f"Memory {memory_id} deleted successfully"}


# --- DATA COLLECTION ENDPOINTS ---
@app.get("/api/dati")
async def get_all_dati(
    family_code: Optional[str] = Query(None, alias="familyCode"),
    customer_code: Optional[int] = Query(None, alias="customerCode"),
    row_type: Optional[str] = Query(None, alias="rowType"),
    country_code: Optional[int] = Query(None, alias="countryCode"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    query = {}
    if family_code is not None:
        query["familyCode"] = family_code
    if customer_code is not None:
        query["customerCode"] = customer_code
    if row_type is not None:
        query["rowType"] = row_type
    if country_code is not None:
        query["countryCode"] = country_code

    results = []
    cursor = dati_coll.find(query).skip(skip).limit(limit)
    async for doc in cursor:
        results.append(format_document(doc))
    return results


@app.get("/api/dati/{doc_id}")
async def get_dati_by_id(doc_id: str):
    if not ObjectId.is_valid(doc_id):
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")

    doc = await dati_coll.find_one({"_id": ObjectId(doc_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return format_document(doc)

# --- AGENT QUERY PIPELINE ---
@app.post("/api/agent/query")
async def run_agent_query(req: QueryRequest):
    few_shot_examples = load_few_shot_examples()

    # Exact match fast-path
    matched_example = next(
        (
            ex
            for ex in few_shot_examples
            if ex.get("question", "").strip().lower() == req.user_prompt.strip().lower()
        ),
        None,
    )

    if matched_example:
        parsed_query = matched_example.get("mongo_query", {})
    else:
        schema_info = build_or_load_schema()

        system_instruction = (
            "You are a database expert translator. Convert the user prompt into a valid PyMongo filter dictionary "
            "or an aggregation pipeline array.\n"
            "CRITICAL SYNTAX RULES:\n"
            "1. Output MUST be strict, raw valid JSON (a dictionary or a list of stage objects).\n"
            "2. Do NOT use literal comparison strings like '> 100'. Always translate numeric range filters into MongoDB operators "
            "like {\"field\": {\"$gt\": 100}} or {\"field\": {\"$lt\": 50}}.\n"
            "3. If returning aggregation stages ($match, $group, $sort, etc.), return them inside a JSON list []."
        )

        user_content = (
            f"Database Schema Context:\n{json.dumps(schema_info, default=str)}\n\n"
            f"Few-Shot Examples:\n{json.dumps(few_shot_examples, default=str)}\n\n"
            f"User Prompt: {req.user_prompt}"
        )

        try:
            # Enforce JSON output format directly from OpenAI API
            ai_response = ai_client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.0,
                response_format={"type": "json_object"} if "gpt-4" in MODEL_NAME or "gpt-3.5" in MODEL_NAME else None
            )
            raw_content = ai_response.choices[0].message.content.strip()

            # Clean markdown code block artifacts if fallback occurs
            if "```" in raw_content:
                raw_content = raw_content.split("```")[1]
                if raw_content.startswith("json"):
                    raw_content = raw_content[4:]
                raw_content = raw_content.strip()

            parsed_query = json.loads(raw_content)
            
            # Handle root-level dictionary aggregation stage wrap (e.g. {"$match": ...} -> [{"$match": ...}])
            if isinstance(parsed_query, dict) and any(k.startswith("$") for k in parsed_query.keys()):
                # If root keys are pipeline stages like $match/$group, wrap in a list
                pipeline_stages = {"$match", "$group", "$sort", "$project", "$unwind", "$lookup", "$limit"}
                if any(k in pipeline_stages for k in parsed_query.keys()):
                    parsed_query = [parsed_query]

        except (json.JSONDecodeError, Exception) as e:
            print(f"[AI Query Translation Error]: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Unable to convert prompt to a valid JSON query: {str(e)}",
            )

    active_memories = await calculate_weighted_memories(min_authority=1.0, limit=5)
    memory_context = [
        f"[{m['type'].upper()}] (Livello Autorità: {m['authority_level']}): {m['content']}"
        for m in active_memories
    ]

    results = []
    try:
        if isinstance(parsed_query, list):
            cursor = dati_coll.aggregate(parsed_query)
            results = [format_document(doc) async for doc in cursor]
        elif isinstance(parsed_query, dict):
            cursor = dati_coll.find(parsed_query).limit(100)
            results = [format_document(doc) async for doc in cursor]
    except PyMongoError as e:
        print(f"[PyMongo Query Execution Error]: {str(e)} | Query: {parsed_query}")
        raise HTTPException(
            status_code=400,
            detail=f"MongoDB execution error with query {json.dumps(parsed_query)}: {str(e)}",
        )

    summary_prompt = """
Sei un assistente che presenta risultati di analisi dati.

Rispondi in italiano.

Devi:
- rispondere direttamente alla domanda;
- usare esclusivamente i risultati forniti;
- non inventare numeri;
- distinguere tra numero di record e numero di clienti unici;
- spiegare brevemente eventuali filtri applicati;
- se il risultato è una somma/media/conteggio, mostrare chiaramente il risultato finale.

DOMANDA:
{question}

PIANO:
{plan}

RISULTATO DATABASE:
{results}
"""


    
    summary_resp = safe_chat_completion(
        messages=[
            {"role": "system", "content": summary_prompt},
            {
                "role": "user",
                "content": f"Question: {req.user_prompt}\nRules: {memory_context}\nData: {json.dumps(results, indent=2)}",
            },
        ],
        temperature=0.3,
    )

    return {
        "generated_filter": parsed_query,
        "raw_results_count": len(results),
        "summary": summary_resp.choices[0].message.content.strip(),
        "applied_memories": active_memories,
        "data": results,
    }