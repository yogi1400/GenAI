# ...existing code...

## Advanced GenAI Backend Features

- **Retrieval-Augmented Generation (RAG):**
  - Ingest documents via `/api/agent/ingest`.
  - Retrieve context for chat using vector search.
- **LangGraph Orchestration:**
  - Orchestrate retrieval, generation, and tool use via `/api/agent/langgraph`.
- **Tool Usage:**
  - Calculator and web search tools via `/api/agent/tool`.
- **Extensible for more tools and workflows.**

### Example Usage

- Ingest a document:
  ```bash
  curl -X POST http://localhost:8000/api/agent/ingest -H "Content-Type: application/json" -d '{"text": "Your document text here."}'
  ```
- Use a tool:
  ```bash
  curl -X POST "http://localhost:8000/api/agent/tool?tool=calculator&input=2*3+5"
  ```
- Use LangGraph workflow:
  ```bash
  curl -X POST http://localhost:8000/api/agent/langgraph -H "Content-Type: application/json" -d '{"message": "What is the sum of 2 and 3?", "history": []}'
  ```
# ...existing code...