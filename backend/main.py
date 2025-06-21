from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
from langchain.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from dotenv import load_dotenv
import sys

load_dotenv()

HF_API_TOKEN = os.getenv("HF_API_TOKEN")
HF_MODEL = os.getenv("HF_MODEL", "HuggingFaceH4/zephyr-7b-beta")
HF_MODEL_DEEPSEEK = os.getenv("HF_MODEL_DEEPSEEK", "deepseek-ai/DeepSeek-R1")
HF_EMBEDDINGS_MODEL = os.getenv("HF_EMBEDDINGS_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

API_URL_TEMPLATE = "https://router.huggingface.co/hf-inference/models/{model}/v1/chat/completions"

app = FastAPI()

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

# Setup RAG (ChromaDB) with HuggingFace Embeddings
embeddings = HuggingFaceEmbeddings(model_name=HF_EMBEDDINGS_MODEL)
vectorstore = Chroma(embedding_function=embeddings)
retriever = vectorstore.as_retriever()

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from deepseek_client import qwen_chat

@app.post("/api/agent/chat")
async def agent_chat(req: ChatRequest, model: str = Query("zephyr", enum=["zephyr", "qwen"])):
    try:
        # Retrieve context (RAG)
        docs = retriever.get_relevant_documents(req.message)
        context = "\n".join([d.page_content for d in docs])
        # Prepare chat history for OpenAI-compatible API
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
            "Authorization": f"Bearer {HF_API_TOKEN}",
            "Content-Type": "application/json"
        }
        # Choose model
        if model == "qwen":
            response_text = qwen_chat(messages)
            return {"response": response_text}
        else:
            model_name = HF_MODEL
            api_url = API_URL_TEMPLATE.format(model=model_name)
            payload = {
                "messages": messages,
                "model": model_name,
                "max_tokens": 256
            }
            response = requests.post(
                api_url,
                headers=headers,
                json=payload,
                timeout=60
            )
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"HF API error: {response.text}")
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                return {"response": result["choices"][0]["message"]["content"]}
            return {"response": str(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health():
    return {"status": "ok"}
