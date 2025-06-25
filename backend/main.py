from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
from dotenv import load_dotenv
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from rag import ingest_document, retrieve_context
from tools import calculator_tool, web_search_tool
from langgraph_orchestrator import run_workflow
from fastapi.responses import StreamingResponse
import json
import time
from backend import presentation_creator

load_dotenv()

# HuggingFace API credentials (commented out)
# HF_API_TOKEN = os.getenv("HF_API_TOKEN")
# HF_MODEL = os.getenv("HF_MODEL", "HuggingFaceH4/zephyr-7b-beta")
# HF_MODEL_DEEPSEEK = os.getenv("HF_MODEL_DEEPSEEK", "deepseek-ai/DeepSeek-R1")
# HF_EMBEDDINGS_MODEL = os.getenv("HF_EMBEDDINGS_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
# API_URL_TEMPLATE = "https://router.huggingface.co/hf-inference/models/{model}/v1/chat/completions"

# OpenRouter API credentials
OPENROUTER_API_KEY = "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"
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "http://localhost:8000")
OPENROUTER_SITE_NAME = os.getenv("OPENROUTER_SITE_NAME", "GenAI App")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

app = FastAPI()
app.include_router(presentation_creator.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://glorious-meme-jjg97qj9qpvqcppww-8080.app.github.dev",
        "https://glorious-meme-jjg97qj9qpvqcppww-8000.app.github.dev",
        "http://localhost:8080",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization", "Content-Type"],
    expose_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    history: list = []

class IngestRequest(BaseModel):
    text: str

@app.post("/api/agent/chat")
async def agent_chat(req: ChatRequest, model: str = Query("deepseek/deepseek-r1-0528:free", enum=["deepseek/deepseek-r1-0528:free", "moonshotai/kimi-dev-72b:free"])):
    try:
        print(f"[LangGraph] Starting agent_chat endpoint with model: {model}")
        start_time = time.time()
        # Retrieve context (RAG)
        docs = retrieve_context(req.message)
        context = "\n".join([d.page_content for d in docs])
        print(f"[LangGraph] Retrieved context in {time.time() - start_time:.2f}s")
        messages = []
        if context:
            messages.append({"role": "system", "content": f"Context: {context}"})
        for h in req.history:
            if 'user' in h:
                messages.append({"role": "user", "content": h['user']})
            if 'ai' in h:
                messages.append({"role": "assistant", "content": h['ai']})
        messages.append({"role": "user", "content": req.message})
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": OPENROUTER_SITE_URL,
            "X-Title": OPENROUTER_SITE_NAME
        }
        # Set max_tokens based on model context window, but keep a safe default for normal chat
        if model == "moonshotai/kimi-dev-72b:free":
            max_tokens = 4096  # Use a reasonable default for chat, not the full context window
        else:
            max_tokens = 2048  # Default for Deepseek and others
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": True
        }
        def stream_openrouter():
            full_response = ""
            print("[LangGraph] Sending request to OpenRouter...")
            with requests.post(
                url=OPENROUTER_API_URL,
                headers=headers,
                json=payload,
                stream=True,
                timeout=120
            ) as response:
                print(f"[LangGraph] OpenRouter response status: {response.status_code}")
                if response.status_code != 200:
                    yield json.dumps({"error": f"OpenRouter API error: {response.text}"})
                    return
                for line in response.iter_lines():
                    if line:
                        try:
                            data = line.decode("utf-8")
                            print(f"[LangGraph] Raw line: {data}")
                            if data.startswith("data: "):
                                data = data[6:]
                            if data.strip() == "[DONE]":
                                print("[LangGraph] Received [DONE] from OpenRouter.")
                                break
                            # Defensive: Only process lines that are valid JSON and have 'choices'
                            try:
                                chunk = json.loads(data)
                                delta = ""
                                if 'choices' in chunk and isinstance(chunk['choices'], list):
                                    choice = chunk['choices'][0]
                                    if 'delta' in choice and 'content' in choice['delta']:
                                        delta = choice['delta']['content']
                                    elif 'message' in choice and 'content' in choice['message']:
                                        delta = choice['message']['content']
                                if not isinstance(delta, str) or not delta:
                                    continue
                                full_response += delta
                                print(f"[LangGraph] Streaming token: {delta}")
                                yield delta
                            except Exception as ex:
                                print(f"[LangGraph] JSON decode error: {ex}")
                                continue
                        except Exception as ex:
                            print(f"[LangGraph] Line decode error: {ex}")
                            continue
            print("\n[OpenRouter LLM Response]:\n" + full_response + "\n")
            print(f"[LangGraph] Total LLM call time: {time.time() - start_time:.2f}s")
        return StreamingResponse(stream_openrouter(), media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/ingest")
async def ingest(req: IngestRequest):
    num_chunks = ingest_document(req.text)
    return {"chunks_ingested": num_chunks}

@app.post("/api/agent/tool")
async def use_tool(tool: str = Query(..., enum=["calculator", "web_search"]), input: str = Query(...)):
    if tool == "calculator":
        return {"result": calculator_tool(input)}
    elif tool == "web_search":
        return {"result": web_search_tool(input)}
    else:
        raise HTTPException(status_code=400, detail="Unknown tool")

@app.post("/api/agent/langgraph")
async def langgraph_agent(req: ChatRequest):
    result = run_workflow(req.message, req.history)
    return {"result": result}

@app.get("/api/health")
async def health():
    return {"status": "ok"}
