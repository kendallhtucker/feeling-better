import { reminders } from './reminders.js';
import { checklist, categories, ratingLabels, getScoreRange } from './burns-checklist.js';

// =============================================
// Auth
// =============================================
let authToken = localStorage.getItem('fb-auth-token') || '';

// =============================================
// Typewriter Sound — Word 99 / beige keyboard clack
// =============================================
let audioCtx = null;
function playKeyClick() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioCtx.currentTime;

  // Layer 1: sharp attack "tick" — the plastic key bottoming out
  const tickLen = 0.012;
  const tickBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * tickLen, audioCtx.sampleRate);
  const tickData = tickBuf.getChannelData(0);
  for (let i = 0; i < tickData.length; i++) {
    const t = i / tickData.length;
    tickData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 20);
  }
  const tickSrc = audioCtx.createBufferSource();
  tickSrc.buffer = tickBuf;

  const tickFilter = audioCtx.createBiquadFilter();
  tickFilter.type = 'highpass';
  tickFilter.frequency.value = 4000 + Math.random() * 1500;

  const tickGain = audioCtx.createGain();
  tickGain.gain.setValueAtTime(0.18, now);
  tickGain.gain.exponentialRampToValueAtTime(0.001, now + tickLen);

  tickSrc.connect(tickFilter).connect(tickGain).connect(audioCtx.destination);
  tickSrc.start(now);
  tickSrc.stop(now + tickLen);

  // Layer 2: low thunk — the key hitting the membrane/board
  const thunkLen = 0.03;
  const thunkBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * thunkLen, audioCtx.sampleRate);
  const thunkData = thunkBuf.getChannelData(0);
  for (let i = 0; i < thunkData.length; i++) {
    const t = i / thunkData.length;
    thunkData[i] = Math.sin(t * Math.PI * 2 * (800 + Math.random() * 400)) * Math.pow(1 - t, 6) * 0.5
      + (Math.random() * 2 - 1) * Math.pow(1 - t, 10) * 0.5;
  }
  const thunkSrc = audioCtx.createBufferSource();
  thunkSrc.buffer = thunkBuf;

  const thunkFilter = audioCtx.createBiquadFilter();
  thunkFilter.type = 'bandpass';
  thunkFilter.frequency.value = 1200 + Math.random() * 600;
  thunkFilter.Q.value = 0.8;

  const thunkGain = audioCtx.createGain();
  thunkGain.gain.setValueAtTime(0.12, now);
  thunkGain.gain.exponentialRampToValueAtTime(0.001, now + thunkLen);

  thunkSrc.connect(thunkFilter).connect(thunkGain).connect(audioCtx.destination);
  thunkSrc.start(now);
  thunkSrc.stop(now + thunkLen);
}

// Spacebar and Enter get a slightly heavier sound
function playBigKeyClick() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioCtx.currentTime;

  const len = 0.045;
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / d.length;
    d[i] = Math.sin(t * Math.PI * 2 * 600) * Math.pow(1 - t, 4) * 0.4
      + (Math.random() * 2 - 1) * Math.pow(1 - t, 12) * 0.6;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2500;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + len);

  src.connect(filter).connect(gain).connect(audioCtx.destination);
  src.start(now);
  src.stop(now + len);
}

// Attach to all textareas
document.addEventListener('keydown', (e) => {
  if (e.target.tagName !== 'TEXTAREA') return;
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'Backspace') {
    playBigKeyClick();
  } else if (e.key.length === 1) {
    playKeyClick();
  }
});

// =============================================
// Daily Reminder
// =============================================
function setDailyReminder() {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % reminders.length;
  document.getElementById('reminder-text').textContent = reminders[index];
}

// =============================================
// Tab Navigation
// =============================================
function setupTabs() {
  const buttons = document.querySelectorAll('.nav-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// =============================================
// Chat
// =============================================
let conversationMessages = []; // messages sent to API {role, content}

function setupChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const messagesEl = document.getElementById('chat-messages');
  const newChatBtn = document.getElementById('new-chat-btn');
  const initialInput = document.getElementById('initial-input');
  const initialTextarea = document.getElementById('initial-thought');
  const initialSendBtn = document.getElementById('initial-send-btn');
  const chatContainer = document.getElementById('chat-container');

  // Handle initial input → transition to chat
  function handleInitialSend() {
    const text = initialTextarea.value.trim();
    if (!text) return;

    // Hide initial input, show chat
    initialInput.style.display = 'none';
    chatContainer.style.display = 'block';

    // Inject the text into the chat input and send
    input.value = text;
    sendMessage();
  }

  initialSendBtn.addEventListener('click', handleInitialSend);
  initialTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInitialSend();
    }
  });

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    // Show user message
    const userMsg = document.createElement('div');
    userMsg.className = 'msg-user';
    userMsg.textContent = text;
    messagesEl.appendChild(userMsg);

    // Track in conversation
    conversationMessages.push({ role: 'user', content: text });

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Show typing indicator
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Disable input
    sendBtn.disabled = true;
    input.disabled = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': authToken },
        body: JSON.stringify({ messages: conversationMessages })
      });

      const data = await res.json();

      // Remove typing indicator
      typing.remove();

      if (data.error) {
        showBotText(messagesEl, 'Sorry, something went wrong. Try again?');
        conversationMessages.pop(); // remove the failed user message
        return;
      }

      // Always render the full structured response
      renderResponse(messagesEl, data);
      conversationMessages.push({
        role: 'assistant',
        content: JSON.stringify(data)
      });

      // Show "new conversation" button after first exchange
      newChatBtn.style.display = 'block';

    } catch (err) {
      typing.remove();
      showBotText(messagesEl, 'Something went wrong. Is the server running?');
      conversationMessages.pop();
      console.error(err);
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  sendBtn.addEventListener('click', sendMessage);

  // Enter to send, Shift+Enter for newline
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // New conversation — reset to initial input state
  newChatBtn.addEventListener('click', () => {
    conversationMessages = [];
    messagesEl.innerHTML = '';
    chatContainer.style.display = 'none';
    newChatBtn.style.display = 'none';
    document.querySelector('.chat-input-area').style.display = 'flex';

    // Show initial input again
    initialInput.style.display = 'block';
    initialTextarea.value = '';
    initialTextarea.focus();
  });
}

function renderResponse(container, data) {
  const wrapper = document.createElement('div');
  wrapper.className = 'msg-bot';

  if (data.type === 'wisdom') {
    // Sage wisdom when they accepted the analysis
    const wisdom = document.createElement('div');
    wisdom.className = 'chat-wisdom';
    wisdom.innerHTML = `<h4>Something to remember</h4><p>${escapeHtml(data.message)}</p>`;
    wrapper.appendChild(wisdom);
    container.appendChild(wrapper);

    // Hide input, they're done (until new conversation)
    document.querySelector('.chat-input-area').style.display = 'none';
    return;
  }

  // Distortions
  if (data.distortions && data.distortions.length > 0) {
    data.distortions.forEach(d => {
      const card = document.createElement('div');
      card.className = 'chat-distortion';
      card.innerHTML = `<h4>${escapeHtml(d.name)}</h4><p>${escapeHtml(d.explanation)}</p>`;
      wrapper.appendChild(card);
    });
  }

  // Reframe
  if (data.reframe) {
    const reframe = document.createElement('div');
    reframe.className = 'chat-reframe';
    reframe.innerHTML = `<h4>A different way to see it</h4><p>${escapeHtml(data.reframe)}</p>`;
    wrapper.appendChild(reframe);
  }

  // "Does this feel right?" prompt with buttons
  const prompt = document.createElement('div');
  prompt.className = 'chat-prompt';
  prompt.innerHTML = `
    <p>Does this feel right?</p>
    <div class="prompt-buttons">
      <button class="prompt-btn prompt-yes">Yes, that's it</button>
      <button class="prompt-btn prompt-no">Not quite</button>
    </div>
  `;
  wrapper.appendChild(prompt);

  container.appendChild(wrapper);

  // Hide the text input while buttons are showing
  document.querySelector('.chat-input-area').style.display = 'none';

  // Handle button clicks
  const yesBtn = prompt.querySelector('.prompt-yes');
  const noBtn = prompt.querySelector('.prompt-no');

  yesBtn.addEventListener('click', () => {
    // Disable buttons
    yesBtn.disabled = true;
    noBtn.disabled = true;
    prompt.classList.add('answered');
    yesBtn.classList.add('chosen');

    // Send acceptance to get wisdom
    sendAcceptance(container);
  });

  noBtn.addEventListener('click', () => {
    // Disable buttons
    yesBtn.disabled = true;
    noBtn.disabled = true;
    prompt.classList.add('answered');
    noBtn.classList.add('chosen');

    // Show input with updated placeholder
    const inputArea = document.querySelector('.chat-input-area');
    inputArea.style.display = 'flex';
    const input = document.getElementById('chat-input');
    input.placeholder = "What's off? Tell me more...";
    input.focus();
  });

  // Scroll
  container.scrollTop = container.scrollHeight;
}

async function sendAcceptance(container) {
  const messagesEl = container;
  const newChatBtn = document.getElementById('new-chat-btn');

  // Show typing
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  messagesEl.appendChild(typing);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  conversationMessages.push({ role: 'user', content: '[ACCEPTED]' });

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationMessages })
    });

    const data = await res.json();
    typing.remove();

    conversationMessages.push({
      role: 'assistant',
      content: JSON.stringify(data)
    });

    renderResponse(messagesEl, data);
    newChatBtn.style.display = 'block';

    // Save to history
    if (data.type === 'wisdom' && data.message) {
      saveConversation(data.message, data.image_keyword);
    }
  } catch (err) {
    typing.remove();
    showBotText(messagesEl, 'Something went wrong. Try again?');
    conversationMessages.pop();
    console.error(err);
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function saveConversation(wisdom, imageKeyword) {
  const history = JSON.parse(localStorage.getItem('fb-conversations') || '[]');
  history.push({
    date: new Date().toISOString(),
    wisdom: wisdom,
    imageKeyword: imageKeyword || '',
  });
  localStorage.setItem('fb-conversations', JSON.stringify(history));
  renderPastConversations();
}

// =============================================
// Collage Background
// =============================================
const collageGradients = [
  'linear-gradient(135deg, #f472b6, #ec4899)',
  'linear-gradient(135deg, #a78bfa, #8b5cf6)',
  'linear-gradient(135deg, #60a5fa, #3b82f6)',
  'linear-gradient(135deg, #34d399, #10b981)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
  'linear-gradient(135deg, #fb923c, #f97316)',
  'linear-gradient(135deg, #f87171, #ef4444)',
  'linear-gradient(135deg, #2dd4bf, #14b8a6)',
];

// Seeded random for consistent placement per conversation
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function renderCollage() {
  const layer = document.getElementById('collage-layer');
  const history = JSON.parse(localStorage.getItem('fb-conversations') || '[]');

  layer.innerHTML = '';

  if (history.length === 0) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Place wisdom cards scattered around the viewport
  history.forEach((conv, i) => {
    const seed = conv.date ? new Date(conv.date).getTime() : i * 1000;

    // Wisdom text card
    const card = document.createElement('div');
    card.className = 'collage-item collage-wisdom';
    const gradIdx = Math.floor(seededRandom(seed + 1) * collageGradients.length);
    card.style.background = collageGradients[gradIdx];

    const d = new Date(conv.date);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    card.innerHTML = `${escapeHtml(conv.wisdom)}<span class="collage-date">${dateStr}</span>`;

    // Position: distribute around edges, avoiding center where app content is
    const angle = (i / Math.max(history.length, 1)) * Math.PI * 2 + seededRandom(seed + 2) * 0.5;
    const radiusX = vw * 0.32 + seededRandom(seed + 3) * vw * 0.12;
    const radiusY = vh * 0.28 + seededRandom(seed + 4) * vh * 0.15;
    const cx = vw / 2;
    const cy = vh / 2;

    let x = cx + Math.cos(angle) * radiusX - 120;
    let y = cy + Math.sin(angle) * radiusY - 60;

    // Clamp to viewport
    x = Math.max(10, Math.min(x, vw - 260));
    y = Math.max(10, Math.min(y, vh - 140));

    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    card.style.transform = `rotate(${(seededRandom(seed + 5) - 0.5) * 16}deg)`;
    card.style.opacity = '0.9';
    card.style.zIndex = '0';
    layer.appendChild(card);
  });

}

// Re-render collage on resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderCollage, 300);
});

function radiusAvg(vw, vh) {
  return (vw * 0.35 + vh * 0.3) / 2;
}

function renderPastConversations() {
  // Past conversations now live in the collage background only
  renderCollage();
}

function showBotText(container, text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'msg-bot';
  const bubble = document.createElement('div');
  bubble.className = 'chat-text';
  bubble.textContent = text;
  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =============================================
// Weekly Check-in (Burns Checklist)
// =============================================
let ratings = {};

function setupChecklist() {
  const container = document.getElementById('checklist-questions');

  categories.forEach(cat => {
    // Section header
    const header = document.createElement('div');
    header.className = `checklist-section-header${cat.key === 'suicidal' ? ' sensitive' : ''}`;
    header.textContent = cat.label;
    container.appendChild(header);

    // Items in this category
    const items = checklist.filter(i => i.category === cat.key);
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = `checklist-item${item.sensitive ? ' sensitive' : ''}`;
      div.innerHTML = `
        <div class="checklist-text">${item.id}. ${item.text}</div>
        <div class="rating-options">
          ${ratingLabels.map((label, i) => `
            <button class="rating-btn" data-id="${item.id}" data-value="${i}">${label}</button>
          `).join('')}
        </div>
      `;
      container.appendChild(div);
    });
  });

  // Handle rating clicks
  container.addEventListener('click', (e) => {
    if (!e.target.classList.contains('rating-btn')) return;

    const id = e.target.dataset.id;
    const value = parseInt(e.target.dataset.value);

    ratings[id] = value;

    // Update visual state
    const siblings = e.target.parentElement.querySelectorAll('.rating-btn');
    siblings.forEach(s => s.classList.remove('selected'));
    e.target.classList.add('selected');
  });

  // Submit check-in
  document.getElementById('submit-checkin').addEventListener('click', () => {
    if (Object.keys(ratings).length < checklist.length) {
      alert('Please answer all questions before submitting.');
      return;
    }

    const score = Object.values(ratings).reduce((sum, v) => sum + v, 0);
    const range = getScoreRange(score);

    document.getElementById('score-number').textContent = score;
    document.getElementById('score-number').style.color = range.color;
    document.getElementById('score-label').textContent = range.label;
    document.getElementById('score-label').style.color = range.color;
    document.getElementById('score-description').textContent = range.description;

    // Check for safety-sensitive answers
    const safetyItems = checklist.filter(i => i.sensitive);
    const hasSafetyConcern = safetyItems.some(i => ratings[i.id] >= 2);
    document.getElementById('safety-notice').style.display = hasSafetyConcern ? 'block' : 'none';

    document.getElementById('checkin-result').style.display = 'block';
    document.getElementById('save-confirmation').style.display = 'none';

    // Scroll to result
    document.getElementById('checkin-result').scrollIntoView({ behavior: 'smooth' });
  });

  // Save check-in
  document.getElementById('save-checkin').addEventListener('click', () => {
    const score = Object.values(ratings).reduce((sum, v) => sum + v, 0);
    const history = JSON.parse(localStorage.getItem('fb-checkins') || '[]');

    history.push({
      date: new Date().toISOString(),
      score: score,
      ratings: { ...ratings }
    });

    localStorage.setItem('fb-checkins', JSON.stringify(history));
    document.getElementById('save-confirmation').style.display = 'block';

    // Reset form
    ratings = {};
    document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
  });
}

// =============================================
// Progress Chart
// =============================================
let chart = null;

function setupProgress() {
  renderProgress();

  // Re-render when tab is shown
  document.querySelector('[data-tab="progress"]').addEventListener('click', () => {
    setTimeout(renderProgress, 100);
  });

  document.getElementById('clear-data').addEventListener('click', () => {
    if (confirm('This will delete all your check-in history. Are you sure?')) {
      localStorage.removeItem('fb-checkins');
      renderProgress();
    }
  });
}

function renderProgress() {
  const history = JSON.parse(localStorage.getItem('fb-checkins') || '[]');
  const noDataMsg = document.getElementById('no-data-msg');
  const clearBtn = document.getElementById('clear-data');
  const historyContainer = document.getElementById('progress-history');

  if (history.length === 0) {
    noDataMsg.style.display = 'block';
    clearBtn.style.display = 'none';
    if (chart) {
      chart.destroy();
      chart = null;
    }
    historyContainer.innerHTML = '';
    return;
  }

  noDataMsg.style.display = 'none';
  clearBtn.style.display = 'block';

  // Chart
  const ctx = document.getElementById('progress-chart').getContext('2d');

  const labels = history.map(h => {
    const d = new Date(h.date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const scores = history.map(h => h.score);
  const colors = history.map(h => getScoreRange(h.score).color);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Score',
        data: scores,
        borderColor: '#6b5ce7',
        backgroundColor: 'rgba(107, 92, 231, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: colors,
        pointBorderColor: colors,
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: '#f0ece6' },
          ticks: {
            font: { family: 'Times New Roman' },
            color: '#7a746b',
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Times New Roman' },
            color: '#7a746b',
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#2d2a26',
          titleFont: { family: 'Times New Roman' },
          bodyFont: { family: 'Times New Roman' },
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => {
              const range = getScoreRange(ctx.parsed.y);
              return `Score: ${ctx.parsed.y} — ${range.label}`;
            }
          }
        }
      }
    }
  });

  // History list
  historyContainer.innerHTML = history
    .slice()
    .reverse()
    .map(h => {
      const d = new Date(h.date);
      const dateStr = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      const range = getScoreRange(h.score);
      return `
        <div class="history-item">
          <span class="history-date">${dateStr}</span>
          <span class="history-score" style="color: ${range.color}">${h.score}</span>
          <span class="history-label" style="background: ${range.color}">${range.label}</span>
        </div>
      `;
    })
    .join('');
}

// =============================================
// Tagline
// =============================================
const taglines = [
  "Your brain is a little broken. That's okay — let's work with it.",
  "You're not crazy. Your thoughts are just being dramatic.",
  "Think of this as a mirror that talks back nicely.",
  "Your inner critic could use an editor.",
  "Brains lie sometimes. Let's fact-check yours.",
  "You showed up. That's already the hard part.",
  "Somewhere between fine and not fine? Same.",
  "Your feelings are valid. Your conclusions might not be.",
  "Therapy is expensive. This is free and kind of fun.",
  "Let's gently bully your negative thoughts.",
  "Your brain's autocorrect is broken. Let's fix it.",
  "Not a therapist. Just a friend who read the book.",
  "You're doing better than your brain thinks you are.",
  "Step one: stop believing everything you think.",
  "Feelings are real. But they're not always right.",
  "Your worst thoughts are usually your least accurate.",
  "Be nice to yourself. You're the only you you've got.",
  "Today's vibe: challenging unhelpful thoughts with love.",
  "Your brain is a beautiful disaster. Let's tidy up.",
  "Plot twist: you're actually doing okay.",
];

function setTagline() {
  const el = document.getElementById('tagline');
  if (el) el.textContent = taglines[Math.floor(Math.random() * taglines.length)];
}

// =============================================
// Initialize
// =============================================
async function init() {
  // Check if auth is required by trying a test request
  const authGate = document.getElementById('auth-gate');
  const mainApp = document.getElementById('main-app');
  const collage = document.getElementById('collage-layer');

  let needsAuth = false;
  try {
    const test = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': authToken },
      body: JSON.stringify({ messages: [] })
    });
    // 400 = auth works, we just sent empty messages. 401 = needs auth.
    if (test.status === 401) needsAuth = true;
  } catch (e) {
    // Server down — proceed without auth
  }

  if (needsAuth && !authToken) {
    // Show auth gate
    authGate.style.display = 'flex';
    mainApp.style.display = 'none';
    collage.style.display = 'none';

    const authInput = document.getElementById('auth-input');
    const authBtn = document.getElementById('auth-btn');
    const authError = document.getElementById('auth-error');

    async function tryAuth() {
      const passphrase = authInput.value.trim();
      if (!passphrase) return;
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passphrase })
        });
        const data = await res.json();
        if (data.token) {
          authToken = data.token;
          localStorage.setItem('fb-auth-token', authToken);
          authGate.style.display = 'none';
          mainApp.style.display = '';
          collage.style.display = '';
          startApp();
        } else {
          authError.style.display = 'block';
          authInput.value = '';
          authInput.focus();
        }
      } catch (e) {
        authError.style.display = 'block';
      }
    }

    authBtn.addEventListener('click', tryAuth);
    authInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryAuth();
    });
    authInput.focus();
  } else {
    if (authGate) authGate.style.display = 'none';
    startApp();
  }
}

function startApp() {
  setTagline();
  setupTabs();
  setupChat();
  setupChecklist();
  setupProgress();
  renderPastConversations();
}

init();
