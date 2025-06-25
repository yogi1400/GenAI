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

// --- AI Presentation Creator Multi-Step UI ---
const presentationWizard = document.createElement('div');
presentationWizard.id = 'presentationWizard';
presentationWizard.innerHTML = `
  <div class="wizard-step" id="wizStep1">
    <h2>Step 1: Presentation Topic & Structure</h2>
    <label>Presentation Title:<br><input type="text" id="wizTitle" required></label><br>
    <label>Subtitle:<br><input type="text" id="wizSubtitle"></label><br>
    <label>Sections & Slides:<br>
      <textarea id="wizSections" rows="5" placeholder="Section: Introduction\n- Bullet: What is AI?\n- Image: AI in daily life\nSection: Trends\n- Chart: AI Adoption by Industry\n..."></textarea>
    </label><br>
    <button id="wizNext1">Next</button>
  </div>
  <div class="wizard-step" id="wizStep2" style="display:none">
    <h2>Step 2: Design & Branding</h2>
    <label>Font:<br><select id="wizFont">
      <option value="Calibri">Calibri</option>
      <option value="Arial">Arial</option>
      <option value="Helvetica">Helvetica</option>
      <option value="Times New Roman">Times New Roman</option>
    </select></label><br>
    <label>Text Color:<br><input type="color" id="wizTextColor" value="#1e1e1e"></label><br>
    <label>Accent Color:<br><input type="color" id="wizAccentColor" value="#4f8cff"></label><br>
    <label>Logo (URL, optional):<br><input type="text" id="wizLogo"></label><br>
    <button id="wizPrev2">Back</button>
    <button id="wizNext2">Next</button>
  </div>
  <div class="wizard-step" id="wizStep3" style="display:none">
    <h2>Step 3: Preview & Generate</h2>
    <div id="wizPreview"></div>
    <button id="wizPrev3">Back</button>
    <button id="wizGenerate">Generate Presentation</button>
    <div id="wizStatus"></div>
  </div>
`;
document.body.appendChild(presentationWizard);

// Wizard navigation logic
const wizSteps = [
  document.getElementById('wizStep1'),
  document.getElementById('wizStep2'),
  document.getElementById('wizStep3')
];
function showStep(idx) {
  wizSteps.forEach((step, i) => step.style.display = i === idx ? '' : 'none');
}
document.getElementById('wizNext1').onclick = () => {
  showStep(1);
};
document.getElementById('wizPrev2').onclick = () => {
  showStep(0);
};
document.getElementById('wizNext2').onclick = () => {
  // Build preview
  const title = document.getElementById('wizTitle').value.trim();
  const subtitle = document.getElementById('wizSubtitle').value.trim();
  const sectionsRaw = document.getElementById('wizSections').value.trim();
  const previewDiv = document.getElementById('wizPreview');
  let previewHtml = `<h3>${title}</h3><p>${subtitle}</p><ol>`;
  const lines = sectionsRaw.split('\n');
  let currentSection = '';
  lines.forEach(line => {
    if (/^Section:/i.test(line)) {
      currentSection = line.replace(/^Section:/i, '').trim();
      previewHtml += `<li><b>Section:</b> ${currentSection}<ul>`;
    } else if (/^-\s*(Bullet|Image|Chart):/i.test(line)) {
      const [, type] = line.match(/^-\s*(Bullet|Image|Chart):/i) || [];
      const content = line.replace(/^-\s*(Bullet|Image|Chart):/i, '').trim();
      previewHtml += `<li><b>${type}:</b> ${content}</li>`;
    } else if (line.trim() === '') {
      previewHtml += '</ul></li>';
    }
  });
  previewHtml += '</ol>';
  previewDiv.innerHTML = previewHtml;
  showStep(2);
};
document.getElementById('wizPrev3').onclick = () => {
  showStep(1);
};

document.getElementById('wizGenerate').onclick = async () => {
  const title = document.getElementById('wizTitle').value.trim();
  const subtitle = document.getElementById('wizSubtitle').value.trim();
  const font = document.getElementById('wizFont').value;
  const textColor = document.getElementById('wizTextColor').value;
  const accentColor = document.getElementById('wizAccentColor').value;
  const logo = document.getElementById('wizLogo').value.trim();
  const sectionsRaw = document.getElementById('wizSections').value.trim();
  // Parse structure
  const lines = sectionsRaw.split('\n');
  let sections = [], currentSection = null;
  lines.forEach(line => {
    if (/^Section:/i.test(line)) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.replace(/^Section:/i, '').trim(), slides: [] };
    } else if (/^-\s*(Bullet|Image|Chart):/i.test(line)) {
      const [, type] = line.match(/^-\s*(Bullet|Image|Chart):/i) || [];
      const content = line.replace(/^-\s*(Bullet|Image|Chart):/i, '').trim();
      if (currentSection) currentSection.slides.push({ type: type.toLowerCase(), title: content });
    }
  });
  if (currentSection) sections.push(currentSection);
  // Color parsing
  function hexToRgb(hex) {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [30,30,30];
  }
  const color_scheme = {
    text: hexToRgb(textColor),
    accent: hexToRgb(accentColor)
  };
  const structure = {
    title,
    subtitle,
    sections,
    final_slide: { title: 'Thank You!', content: 'Questions & Discussion' }
  };
  const payload = {
    topic: title,
    structure,
    font,
    color_scheme,
    branding: logo ? { logo_url: logo } : undefined
  };
  const statusDiv = document.getElementById('wizStatus');
  statusDiv.textContent = 'Generating presentation...';
  try {
    const res = await fetch('/api/presentation/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate presentation');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    statusDiv.innerHTML = `<a href="${url}" download="${title.replace(/\s+/g, '_')}.pptx">Download Presentation</a>`;
  } catch (err) {
    statusDiv.textContent = 'Error: ' + err.message;
  }
};

// --- One-Click AI Presentation Creator ---
const autoForm = document.createElement('form');
autoForm.id = 'autoPresentationForm';
autoForm.innerHTML = `
  <h2>One-Click AI Presentation</h2>
  <label>Topic:<br><input type="text" id="autoTopic" required placeholder="e.g. The Future of Robotics"></label><br>
  <label>Font:<br><select id="autoFont">
    <option value="Calibri">Calibri</option>
    <option value="Arial">Arial</option>
    <option value="Helvetica">Helvetica</option>
    <option value="Times New Roman">Times New Roman</option>
  </select></label><br>
  <label>Text Color:<br><input type="color" id="autoTextColor" value="#1e1e1e"></label><br>
  <label>Accent Color:<br><input type="color" id="autoAccentColor" value="#4f8cff"></label><br>
  <label>Logo (URL, optional):<br><input type="text" id="autoLogo"></label><br>
  <button type="submit">Generate Presentation</button>
  <div id="autoStatus"></div>
`;
document.body.appendChild(autoForm);

autoForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const topic = document.getElementById('autoTopic').value.trim();
  const font = document.getElementById('autoFont').value;
  const textColor = document.getElementById('autoTextColor').value;
  const accentColor = document.getElementById('autoAccentColor').value;
  const logo = document.getElementById('autoLogo').value.trim();
  function hexToRgb(hex) {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [30,30,30];
  }
  const color_scheme = {
    text: hexToRgb(textColor),
    accent: hexToRgb(accentColor)
  };
  const payload = {
    topic,
    font,
    color_scheme,
    branding: logo ? { logo_url: logo } : undefined
  };
  const statusDiv = document.getElementById('autoStatus');
  statusDiv.textContent = 'Generating presentation...';
  try {
    const res = await fetch('https://glorious-meme-jjg97qj9qpvqcppww-8000.app.github.dev/api/presentation/auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate presentation');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    statusDiv.innerHTML = `<a href="${url}" download="${topic.replace(/\s+/g, '_')}.pptx">Download Presentation</a>`;
  } catch (err) {
    statusDiv.textContent = 'Error: ' + err.message;
  }
});
