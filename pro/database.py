import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from openai import OpenAI
from pymongo import MongoClient

MONGO_URI = "mongodb://127.0.0.1:27017"
DB_NAME = "Clienti"
DATI_COLLECTION = "dati"
MEMORY_COLLECTION = "memory_entries"
SCHEMA_FILE = "schema_memory.json"

UNOROUTER_API_KEY = "sk-faXYvhqiEdA2rHaULCPWIrO6AbuYykcoAckLdqkwO2Rm0fLU"
MODEL_NAME = "gemma-4-26b:free"

# Async client for FastAPI
async_client = AsyncIOMotorClient(MONGO_URI)
db = async_client[DB_NAME]
dati_coll = db[DATI_COLLECTION]
memory_coll = db[MEMORY_COLLECTION]

# OpenAI Client
ai_client = OpenAI(
    base_url="https://api.unorouter.com/v1", api_key=UNOROUTER_API_KEY
)


def format_document(doc: dict) -> dict:
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def build_or_load_schema() -> dict:
    if os.path.exists(SCHEMA_FILE):
        with open(SCHEMA_FILE, "r") as f:
            return json.load(f)

    sync_client = MongoClient(MONGO_URI)
    sample_docs = sync_client[DB_NAME][DATI_COLLECTION].find().limit(50)
    schema_memory = {}
    for doc in sample_docs:
        for key, value in doc.items():
            if key not in schema_memory:
                schema_memory[key] = type(value).__name__

    with open(SCHEMA_FILE, "w") as f:
        json.dump(schema_memory, f, indent=2)

    return schema_memory