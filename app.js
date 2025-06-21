// Productivity Agent JS
// Task Manager
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');

function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    taskList.innerHTML = '';
    tasks.forEach((task, idx) => {
        const li = document.createElement('li');
        li.textContent = task;
        const btn = document.createElement('button');
        btn.textContent = 'Remove';
        btn.className = 'remove-task';
        btn.onclick = () => removeTask(idx);
        li.appendChild(btn);
        taskList.appendChild(li);
    });
}
function addTask(task) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    loadTasks();
}
function removeTask(idx) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.splice(idx, 1);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    loadTasks();
}
taskForm.addEventListener('submit', e => {
    e.preventDefault();
    if (taskInput.value.trim()) {
        addTask(taskInput.value.trim());
        taskInput.value = '';
    }
});
loadTasks();

// Notes
const notesArea = document.getElementById('notesArea');
const saveNotes = document.getElementById('saveNotes');
notesArea.value = localStorage.getItem('notes') || '';
saveNotes.onclick = () => {
    localStorage.setItem('notes', notesArea.value);
    saveNotes.textContent = 'Saved!';
    setTimeout(() => saveNotes.textContent = 'Save Notes', 1200);
};

// AI Productivity Chat (Agentic, async)
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
let chatHistory = [];

// Remove JS-inserted modelSelector, use the one in HTML
const modelSelector = document.getElementById('modelSelector');

function appendMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendSubMessage(text) {
    // Create a closable sub-textbox for <think> content
    const subDiv = document.createElement('div');
    subDiv.className = 'sub-message-box';
    subDiv.innerHTML = `<span>${text}</span><button class="close-sub-msg" title="Close">&times;</button>`;
    subDiv.querySelector('.close-sub-msg').onclick = () => subDiv.remove();
    chatBox.appendChild(subDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function getSelectedModel() {
    return modelSelector.value;
}

// Helper to get backend URL for Codespaces or local
function getBackendUrl() {
    // Codespaces: expose 8000 as https://<CODESPACE_NAME>-8000.app.github.dev
    const codespace = window.location.hostname.match(/^(.*)-\d+\.app\.github\.dev$/);
    let base = codespace ? `https://${codespace[1]}-8000.app.github.dev/api/agent/chat` : 'http://localhost:8000/api/agent/chat';
    // Add model param
    return `${base}?model=${getSelectedModel()}`;
}

async function sendToAgent(message) {
    appendMessage('You', message);
    // Insert a placeholder for GenAI response and keep a reference
    const aiMsgDiv = document.createElement('div');
    aiMsgDiv.innerHTML = `<strong>GenAI:</strong> <em>Thinking...</em>`;
    chatBox.appendChild(aiMsgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    try {
        const res = await fetch(getBackendUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history: chatHistory })
        });
        if (!res.ok) throw new Error('Agent error');
        const data = await res.json();
        let response = data.response;
        // If response contains <think>...</think>, extract and show in subtextbox
        const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/i);
        if (thinkMatch) {
            appendSubMessage(thinkMatch[1].trim());
            response = response.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
        }
        aiMsgDiv.innerHTML = `<strong>GenAI:</strong> ${response}`;
        chatHistory.push({ user: message, ai: data.response });
    } catch (err) {
        aiMsgDiv.innerHTML = `<strong>GenAI:</strong> <span style='color:red'>Error: ${err.message}</span>`;
    }
}

chatForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;
    userInput.value = '';
    sendToAgent(message);
});

appendMessage('GenAI', 'Welcome! Ask for productivity tips, manage tasks, or take notes.');

// Dark mode
const toggleTheme = document.getElementById('toggleTheme');
toggleTheme.addEventListener('click', function() {
    document.body.classList.toggle('dark');
});
