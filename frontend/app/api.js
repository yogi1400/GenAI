// Centralized API client for backend endpoints
export const API_BASE = "http://localhost:8000/api";

export async function fetchConcepts(q = "") {
  const res = await fetch(`${API_BASE}/concepts?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Failed to fetch concepts");
  return res.json();
}

export async function fetchPapers(q = "") {
  const res = await fetch(`${API_BASE}/papers?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Failed to fetch papers");
  return res.json();
}

export async function fetchDemos() {
  const res = await fetch(`${API_BASE}/demos`);
  if (!res.ok) throw new Error("Failed to fetch demos");
  return res.json();
}

export async function runPlayground(code) {
  const res = await fetch(`${API_BASE}/playground`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });
  if (!res.ok) throw new Error("Failed to run code");
  return res.json();
}

export async function fetchQuizzes() {
  const res = await fetch(`${API_BASE}/quizzes`);
  if (!res.ok) throw new Error("Failed to fetch quizzes");
  return res.json();
}

export async function chatAgent(message, history = [], model = "zephyr") {
  const res = await fetch(`${API_BASE}/agent/chat?model=${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history })
  });
  if (!res.ok) throw new Error("Failed to chat with agent");
  return res.json();
}
