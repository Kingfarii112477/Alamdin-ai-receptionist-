(() => {
  const STORAGE_KEY = "alamdin_conversation_id";
  const SOUND_KEY = "alamdin_sound_enabled";

  const chatScroll = document.getElementById("chatScroll");
  const emptyState = document.getElementById("emptyState");
  const form = document.getElementById("composerForm");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const resetBtn = document.getElementById("resetBtn");
  const soundBtn = document.getElementById("soundBtn");
  const soundOnIcon = document.getElementById("soundOnIcon");
  const soundOffIcon = document.getElementById("soundOffIcon");

  let conversationId = localStorage.getItem(STORAGE_KEY) || null;
  let busy = false;
  let soundEnabled = localStorage.getItem(SOUND_KEY) !== "off";

  const SUMMARY_MARKERS = ["Appointment Request", "اپائنٹمنٹ کی درخواست"];
  const RECEIVED_MARKERS = ["request has been received", "درخواست موصول ہو گئی ہے", "request receive ho gayi"];

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

  function appendMessage(role, content, { silent = false } = {}) {
    hideEmptyState();

    const row = document.createElement("div");
    row.className = `msg-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = role === "user" ? "You" : "A";

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

    row.appendChild(avatar);
    row.appendChild(bubble);
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
            appendMessage(m.role, m.content, { silent: true });
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

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (busy) return;
      const msg = chip.getAttribute("data-msg");
      sendMessage(msg);
    });
  });

  resetBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    conversationId = null;
    chatScroll.innerHTML = "";
    chatScroll.appendChild(emptyState);
    emptyState.style.display = "block";
  });

  loadExistingConversation();
})();
