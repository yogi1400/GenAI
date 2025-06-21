import os
import requests

API_URL = "https://router.huggingface.co/hf-inference/models/Qwen/Qwen3-235B-A22B/v1/chat/completions"
HF_TOKEN = os.getenv('HF_TOKEN')
if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN environment variable is not set. Please set it to your Hugging Face API token.")
headers = {
    "Authorization": f"Bearer {HF_TOKEN}",
}

def qwen_chat(messages):
    payload = {
        "messages": messages,
        "model": "Qwen/Qwen3-235B-A22B"
    }
    response = requests.post(API_URL, headers=headers, json=payload)
    result = response.json()
    return result["choices"][0]["message"]["content"]
