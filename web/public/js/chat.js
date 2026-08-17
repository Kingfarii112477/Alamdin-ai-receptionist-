(() => {
  const STORAGE_KEY = "skincenter_conversation_id";
  const SOUND_KEY = "skincenter_sound_enabled";

  const chatScroll = document.getElementById("chatScroll");
  const emptyState = document.getElementById("emptyState");
  const form = document.getElementById("composerForm");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const resetBtn = document.getElementById("resetBtn");
  const soundBtn = document.getElementById("soundBtn");
  const soundOnIcon = document.getElementById("soundOnIcon");
  const soundOffIcon = document.getElementById("soundOffIcon");
  const micBtn = document.getElementById("micBtn");

  let conversationId = localStorage.getItem(STORAGE_KEY) || null;
  let busy = false;
  let soundEnabled = localStorage.getItem(SOUND_KEY) !== "off";
  let lastRenderedDateKey = null;

  const SUMMARY_MARKERS = ["Appointment Request", "اپائنٹمنٹ کی درخواست"];
  const RECEIVED_MARKERS = ["request has been submitted", "درخواست جمع ہو گئی ہے", "request submit ho gayi"];

  function isSummary(text) {
    return SUMMARY_MARKERS.some((m) => text.includes(m)) && text.includes(":");
  }
  function isReceived(text) {
    return RECEIVED_MARKERS.some((m) => text.includes(m));
  }

  // ---------- Playful synthesized sound effects (no audio files needed) ----------

  let audioCtx = null;

  function getAudioCtx() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function beep({ freqStart, freqEnd, duration, type = "sine", gain = 0.05 }) {
    if (!soundEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ctx.currentTime + duration);
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gainNode).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // audio unsupported/blocked — fail silently, sound is a nice-to-have
    }
  }

  function playSend() {
    beep({ freqStart: 480, freqEnd: 780, duration: 0.11, type: "sine", gain: 0.045 });
  }
  function playReceive() {
    beep({ freqStart: 640, freqEnd: 400, duration: 0.16, type: "sine", gain: 0.045 });
  }
  function playCelebrate() {
    beep({ freqStart: 520, freqEnd: 1040, duration: 0.22, type: "triangle", gain: 0.05 });
  }

  function updateSoundIcon() {
    soundOnIcon.style.display = soundEnabled ? "block" : "none";
    soundOffIcon.style.display = soundEnabled ? "none" : "block";
    soundBtn.classList.toggle("muted", !soundEnabled);
  }

  soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off");
    updateSoundIcon();
    if (soundEnabled) playSend();
  });

  updateSoundIcon();

  // ---------- Chat rendering ----------

  function hideEmptyState() {
    if (emptyState) emptyState.style.display = "none";
  }

  function scrollToBottom() {
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }

  function dateKey(d) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function maybeInsertDateSeparator(when) {
    const key = dateKey(when);
    if (key === lastRenderedDateKey) return;
    lastRenderedDateKey = key;

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let label = when.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
    if (key === dateKey(today)) label = "Today";
    else if (key === dateKey(yesterday)) label = "Yesterday";

    const sep = document.createElement("div");
    sep.className = "date-sep";
    sep.textContent = label;
    chatScroll.appendChild(sep);
  }

  function formatTime(when) {
    return when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function appendMessage(role, content, { silent = false, when = new Date() } = {}) {
    hideEmptyState();
    maybeInsertDateSeparator(when);

    const row = document.createElement("div");
    row.className = `msg-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = "S";

    const col = document.createElement("div");
    col.className = "msg-col";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.setAttribute("dir", "auto");
    bubble.textContent = content;

    const received = role === "assistant" && isReceived(content);

    if (received) {
      bubble.classList.add("request-received");
    } else if (role === "assistant" && isSummary(content)) {
      bubble.classList.add("summary-card");
    }

    const meta = document.createElement("div");
    meta.className = "msg-meta";
    const time = document.createElement("span");
    time.textContent = formatTime(when);
    meta.appendChild(time);

    if (role === "user") {
      meta.insertAdjacentHTML(
        "beforeend",
        `<svg class="read-receipt" width="14" height="10" viewBox="0 0 16 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 5.5 4.5 9 11 1.5"/><path d="M5.5 5.5 9 9 15.5 1.5"/></svg>`
      );
    } else {
      const dot = document.createElement("span");
      dot.className = "status-dot";
      meta.appendChild(dot);
    }

    col.appendChild(bubble);
    col.appendChild(meta);
    row.appendChild(avatar);
    row.appendChild(col);
    chatScroll.appendChild(row);

    if (received) {
      const banner = document.createElement("div");
      banner.className = "status-banner";
      banner.textContent = "✓ Request received — not yet confirmed";
      chatScroll.appendChild(banner);
    }

    if (!silent) {
      if (role === "user") playSend();
      else if (received) playCelebrate();
      else playReceive();
    }

    scrollToBottom();
  }

  function showTyping() {
    const row = document.createElement("div");
    row.className = "typing-row";
    row.id = "typingRow";
    row.innerHTML = "<span></span><span></span><span></span>";
    chatScroll.appendChild(row);
    scrollToBottom();
  }

  function hideTyping() {
    const row = document.getElementById("typingRow");
    if (row) row.remove();
  }

  function setBusy(state) {
    busy = state;
    sendBtn.disabled = state;
    input.disabled = state;
  }

  async function loadExistingConversation() {
    if (!conversationId) return;
    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}`);
      if (!res.ok) {
        conversationId = null;
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const data = await res.json();
      if (data.messages && data.messages.length) {
        for (const m of data.messages) {
          if (m.role === "user" || m.role === "assistant") {
            appendMessage(m.role, m.content, { silent: true, when: m.createdAt ? new Date(m.createdAt) : new Date() });
          }
        }
      }
    } catch {
      // offline / server not reachable yet — leave empty state showing
    }
  }

  async function sendMessage(text) {
    appendMessage("user", text);
    setBusy(true);
    showTyping();

    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId || undefined, message: text })
      });

      hideTyping();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        appendMessage("assistant", err.error || "Something went wrong. Please try again.");
        return;
      }

      const data = await res.json();
      conversationId = data.conversationId;
      localStorage.setItem(STORAGE_KEY, conversationId);
      appendMessage("assistant", data.message);
    } catch {
      hideTyping();
      appendMessage("assistant", "Connection issue — please check your network and try again.");
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (busy) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    input.style.height = "auto";
    sendMessage(text);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  });

  function bindQuickTriggers(selector) {
    document.querySelectorAll(selector).forEach((el) => {
      el.addEventListener("click", () => {
        if (busy) return;
        const msg = el.getAttribute("data-msg");
        if (msg) sendMessage(msg);
      });
    });
  }
  bindQuickTriggers(".quick-card");
  bindQuickTriggers(".chip");

  resetBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    conversationId = null;
    lastRenderedDateKey = null;
    chatScroll.innerHTML = "";
    chatScroll.appendChild(emptyState);
    emptyState.style.display = "block";
  });

  // ---------- Optional voice input (browser dictation, feature-detected) ----------

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition && micBtn) {
    micBtn.hidden = false;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    let listening = false;

    recognition.addEventListener("result", (e) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) {
        input.value = input.value ? `${input.value} ${transcript}` : transcript;
        input.dispatchEvent(new Event("input"));
      }
    });
    recognition.addEventListener("end", () => {
      listening = false;
      micBtn.classList.remove("listening");
    });
    recognition.addEventListener("error", () => {
      listening = false;
      micBtn.classList.remove("listening");
    });

    micBtn.addEventListener("click", () => {
      if (busy) return;
      if (listening) {
        recognition.stop();
        return;
      }
      try {
        recognition.start();
        listening = true;
        micBtn.classList.add("listening");
      } catch {
        listening = false;
      }
    });
  }

  loadExistingConversation();
})();
