from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument

from database import format_document, memory_coll
from models import MemoryCreate, MemoryUpdate


async def insert_memory(entry: MemoryCreate) -> dict:
    doc = entry.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)

    if entry.replaces_id:
        if not ObjectId.is_valid(entry.replaces_id):
            raise HTTPException(
                status_code=400, detail="Invalid replaces_id ObjectId format"
            )
        target = await memory_coll.find_one(
            {"_id": ObjectId(entry.replaces_id)}
        )
        if not target:
            raise HTTPException(
                status_code=404, detail="Target memory to replace not found"
            )

    result = await memory_coll.insert_one(doc)
    new_id = str(result.inserted_id)
    doc["id"] = new_id

    if entry.replaces_id:
        await memory_coll.update_one(
            {"_id": ObjectId(entry.replaces_id)},
            {"$set": {"superseded_by": new_id}},
        )

    return doc


async def fetch_memories(include_overridden: bool = True):
    memories = []
    async for doc in memory_coll.find():
        formatted = format_document(doc)
        formatted["is_overridden"] = "superseded_by" in doc
        if include_overridden or not formatted["is_overridden"]:
            memories.append(formatted)
    return memories


async def calculate_weighted_memories(
    min_authority: float = 0.0, limit: int = 10
):
    now = datetime.now(timezone.utc)
    query = {
        "superseded_by": {"$exists": False},
        "authority_level": {"$gte": min_authority},
        "$or": [{"expires_at": {"$gt": now}}, {"expires_at": None}],
    }

    memories = []
    async for doc in memory_coll.find(query):
        item = format_document(doc)
        created_at = item.get("created_at", now)
        # Ensure created_at is offset-aware for datetime subtraction
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        age_hours = (now - created_at).total_seconds() / 3600.0
        decay = 1.0 / (1.0 + (0.005 * age_hours))
        item["score"] = round(item["authority_level"] * decay, 3)
        memories.append(item)

    memories.sort(key=lambda x: x["score"], reverse=True)
    return memories[:limit]


# --- NEW FUNCTIONS TO FIX IMPORT ERROR ---

async def update_memory_by_id(
    memory_id: str, entry: MemoryUpdate
) -> Optional[dict]:
    """Modifies an existing memory document by ID."""
    if not ObjectId.is_valid(memory_id):
        return None

    # Exclude fields that were not explicitly passed in the request body
    update_data = entry.model_dump(exclude_unset=True)
    if not update_data:
        doc = await memory_coll.find_one({"_id": ObjectId(memory_id)})
        return format_document(doc) if doc else None

    updated_doc = await memory_coll.find_one_and_update(
        {"_id": ObjectId(memory_id)},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )

    if updated_doc:
        return format_document(updated_doc)
    return None


async def delete_memory_by_id(memory_id: str) -> bool:
    """Deletes a memory document from MongoDB by ID."""
    if not ObjectId.is_valid(memory_id):
        return False

    result = await memory_coll.delete_one({"_id": ObjectId(memory_id)})
    return result.deleted_count > 0