import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter

HF_EMBEDDINGS_MODEL = os.getenv("HF_EMBEDDINGS_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

embeddings = HuggingFaceEmbeddings(model_name=HF_EMBEDDINGS_MODEL)
vectorstore = Chroma(embedding_function=embeddings)
retriever = vectorstore.as_retriever()

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

def ingest_document(text: str):
    """Ingest and chunk a document into the vectorstore."""
    chunks = text_splitter.split_text(text)
    vectorstore.add_texts(chunks)
    return len(chunks)

def retrieve_context(query: str, k: int = 4):
    docs = retriever.get_relevant_documents(query, k=k)
    return "\n".join([d.page_content for d in docs])
