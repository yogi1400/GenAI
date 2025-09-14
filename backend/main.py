from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
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

embeddings = HuggingFaceEmbeddings(model_name=HF_EMBEDDINGS_MODEL)
vectorstore = Chroma(embedding_function=embeddings)
retriever = vectorstore.as_retriever()

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from deepseek_client import deepseek_chat

# --- New Models ---
class Concept(BaseModel):
    id: str
    name: str
    description: str
    tags: list[str] = []

class Paper(BaseModel):
    id: str
    title: str
    abstract: str
    authors: list[str] = []
    url: str = ""

class Demo(BaseModel):
    id: str
    title: str
    description: str
    code: str

class PlaygroundRequest(BaseModel):
    code: str

class Quiz(BaseModel):
    id: str
    question: str
    options: list[str]
    answer: int

# --- New Endpoints ---
@app.get("/api/concepts")
async def get_concepts(q: str = ""):
    try:
        demo_concepts = [
            Concept(id="1", name="Gradient Descent", description="Optimization algorithm for ML.", tags=["optimization", "ml"]),
            Concept(id="2", name="Transformer", description="Deep learning architecture for sequence modeling.", tags=["nlp", "deep learning"])
        ]
        if q:
            filtered = [c for c in demo_concepts if q.lower() in c.name.lower() or q.lower() in c.description.lower()]
            return filtered
        return demo_concepts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/papers")
async def get_papers(q: str = ""):
    try:
        demo_papers = [
            Paper(id="1", title="Attention Is All You Need", abstract="Transformer architecture for NLP.", authors=["Vaswani et al."], url="https://arxiv.org/abs/1706.03762"),
            Paper(id="2", title="Adam: A Method for Stochastic Optimization", abstract="Adam optimizer for deep learning.", authors=["Kingma, Ba"], url="https://arxiv.org/abs/1412.6980")
        ]
        if q:
            filtered = [p for p in demo_papers if q.lower() in p.title.lower() or q.lower() in p.abstract.lower()]
            return filtered
        return demo_papers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/demos")
async def get_demos():
    try:
        demo_demos = [
            Demo(id="1", title="Gradient Descent Demo", description="Visualize gradient descent steps.", code="# Python code for gradient descent demo"),
            Demo(id="2", title="Transformer Demo", description="Explore transformer attention.", code="# Python code for transformer demo")
        ]
        return demo_demos
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/playground")
async def run_playground(req: PlaygroundRequest):
    if not req.code or len(req.code) > 1000:
        raise HTTPException(status_code=400, detail="Invalid code input.")
    # TODO: Secure code execution, sandbox
    return {"output": f"Executed: {req.code[:40]}..."}

@app.get("/api/quizzes")
async def get_quizzes():
    try:
        demo_quizzes = [
            Quiz(id="1", question="What is the main advantage of transformers?", options=["Speed", "Sequence modeling", "Memory"], answer=1),
            Quiz(id="2", question="Which optimizer is best for deep learning?", options=["SGD", "Adam", "RMSProp"], answer=1)
        ]
        return demo_quizzes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/chat")
async def agent_chat(req: ChatRequest, model: str = Query("zephyr", enum=["zephyr", "deepseek"])):
    try:
        docs = retriever.get_relevant_documents(req.message)
        context = "\n".join([d.page_content for d in docs])
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
        if model == "deepseek":
            response_text = deepseek_chat(messages)
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
