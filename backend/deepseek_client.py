import os
from huggingface_hub import InferenceClient

HF_API_TOKEN = os.getenv("HF_API_TOKEN") or os.getenv("HF_TOKEN")
HF_MODEL_DEEPSEEK = os.getenv("HF_MODEL_DEEPSEEK", "deepseek-ai/DeepSeek-R1")

client = InferenceClient(
    provider="auto",
    api_key=HF_API_TOKEN,
)

def deepseek_chat(messages):
    """
    messages: list of dicts, each with 'role' and 'content'
    Returns: response string from DeepSeek LLM
    """
    completion = client.chat.completions.create(
        model=HF_MODEL_DEEPSEEK,
        messages=messages,
    )
    return completion.choices[0].message.content
