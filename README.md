# 🧠 AI-Powered Memory & Dynamic Database Agent

A full-stack intelligent data exploration and memory management system built with **FastAPI**, **React**, and **MongoDB**. 

This system allows users to query database records using natural language, translates requests dynamically into optimized PyMongo queries/aggregation pipelines, and applies a weighted context memory mechanism to maintain rules, business constraints, and logic over time.

---

## ✨ Features

* **Natural Language Query Translation**: Converts standard natural language prompts into structured PyMongo filter dictionaries or multi-stage aggregation pipelines.
* **Weighted Memory System**: Store, update, and override business logic, operational rules, and decisions with configurable authority levels ($1.0 - 10.0$).
* **Fast-Path Matching**: Built-in few-shot match engine that evaluates pre-validated queries for common prompts to reduce latency and API usage.
* **Dynamic Table Visualization**: Renders MongoDB query results into flexible, auto-generated UI tables (handling complex nested objects and ObjectIDs gracefully).
* **AI Summary Engine**: Produces concise textual summaries of retrieved database records in real time, factoring in active operational rules.
* **Resilient Fallback Routing**: Automatic error handling for LLM rate limits (503 / 429) with seamless failover execution.

---

## 🏗️ Architecture & Tech Stack

### Backend
* **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
* **Database**: [MongoDB](https://www.mongodb.com/) (using PyMongo / Motor for async operations)
* **LLM Engine**: OpenAI API / OpenRouter Integration

### Frontend
* **Library**: [React](https://react.dev/) (Vite / CRA)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)

---

## 📂 Project Structure

```text
├── backend/
│   ├── database.py             # MongoDB connection & schema inspection helpers
│   ├── main.py                 # FastAPI endpoints & AI agent translation pipeline
│   ├── memory.py               # Memory calculation & authority weighting logic
│   ├── models.py               # Pydantic models for validation
│   └── few_shot_examples.json  # Pre-validated sample queries for fast-path processing
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AgentSandbox.jsx # Interactive Query Interface
    │   │   └── MemoryForm.jsx   # Rules & Knowledge Management Form
    │   └── data.json            # Preset suggestion prompts
