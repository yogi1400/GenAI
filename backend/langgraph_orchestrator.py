from langgraph.graph import StateGraph, END
from rag import retrieve_context
def run_workflow(user_message, history, tools=None):
    # Define a simple workflow: retrieve context -> generate -> tool use (if needed)
    context = retrieve_context(user_message)
    # Here, you would add nodes for generation and tool use
    # For now, just return context
    return context
