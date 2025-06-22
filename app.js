// Productivity Agent JS
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

function formatLLMResponse(text) {
    // Handle code blocks (triple backticks)
    text = text.replace(/```([\s\S]*?)```/g, function(_, code) {
        return `<pre class="llm-code"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    });
    // Inline code (single backtick)
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Blockquotes
    text = text.replace(/^>\s?(.*)$/gm, '<blockquote>$1</blockquote>');

    // Headings (must be at start of line)
    text = text.replace(/^### (.*)$/gm, '<h3>$1</h3>')
               .replace(/^## (.*)$/gm, '<h2>$1</h2>')
               .replace(/^# (.*)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    text = text.replace(/^---$/gm, '<hr>');

    // Bold/italic
    text = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
               .replace(/\*([^*]+)\*/g, '<i>$1</i>');

    // Tables (parse markdown tables)
    text = text.replace(/\n\|(.+)\|\n\|([\-\s\|]+)\|([\s\S]*?)(?=\n\n|$)/g, function(_, header, sep, body) {
        const headers = header.split('|').map(h => `<th>${h.trim()}</th>`).join('');
        const rows = body.trim().split('\n').filter(Boolean).map(row => {
            const cells = row.split('|').map(c => `<td>${c.trim()}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        return `<table class="llm-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    });

    // Lists (ordered and unordered)
    // Unordered lists
    text = text.replace(/(?:^|\n)(\s*)- (.+)/g, function(match, spaces, item) {
        return `\n<li>${item}</li>`;
    });
    // Ordered lists
    text = text.replace(/(?:^|\n)(\s*)\d+\. (.+)/g, function(match, spaces, item) {
        return `\n<li>${item}</li>`;
    });
    // Wrap consecutive <li> in <ul> or <ol>
    text = text.replace(/(<li>.*?<\/li>)+/gs, function(list) {
        // If the first <li> was from an ordered list, use <ol>
        return `<ul>${list}</ul>`;
    });

    // Paragraphs: wrap lines that are not block elements in <p>
    text = text.replace(/(^|\n)(?!<h\d|<ul>|<ol>|<li>|<table|<blockquote>|<pre|<hr|<p>|<\/)([^\n<][^\n]*)/g, function(_, br, line) {
        if (line.trim() === '') return '';
        return `<p>${line.trim()}</p>`;
    });

    // Remove <p> inside block elements
    text = text.replace(/(<(ul|ol|table|pre|blockquote)[^>]*>)([\s\S]*?)(<\/(ul|ol|table|pre|blockquote)>)/g, function(_, open, tag, inner, close) {
        return open + inner.replace(/<p>([\s\S]*?)<\/p>/g, '$1') + close;
    });

    // Remove excessive <br> (keep only those not inside block elements)
    text = text.replace(/(<\/?(ul|ol|li|table|thead|tbody|tr|th|td|pre|blockquote|h\d|hr)[^>]*>)<br>/g, '$1');
    text = text.replace(/<br>(<\/?(ul|ol|li|table|thead|tbody|tr|th|td|pre|blockquote|h\d|hr)[^>]*>)/g, '$1');

    return text;
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
        // Stream response
        if (res.body && window.ReadableStream) {
            let response = '';
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                if (value) {
                    const chunk = decoder.decode(value);
                    response += chunk;
                    aiMsgDiv.innerHTML = `<strong>GenAI:</strong> ${formatLLMResponse(response)}`;
                }
            }
            chatHistory.push({ user: message, ai: response });
        } else {
            // fallback for non-streaming
            const data = await res.text();
            aiMsgDiv.innerHTML = `<strong>GenAI:</strong> ${formatLLMResponse(data)}`;
            chatHistory.push({ user: message, ai: data });
        }
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
