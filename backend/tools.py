import math
import requests

def calculator_tool(expression: str) -> str:
    try:
        result = eval(expression, {"__builtins__": None}, math.__dict__)
        return str(result)
    except Exception as e:
        return f"Error: {e}"

def web_search_tool(query: str) -> str:
    # Placeholder: Replace with real web search API
    return f"Web search results for '{query}' (mocked)"
