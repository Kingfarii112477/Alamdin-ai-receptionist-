(() => {
  const STORAGE_KEY = "alamdin_conversation_id";

  const chatScroll = document.getElementById("chatScroll");
  const emptyState = document.getElementById("emptyState");
  const form = document.getElementById("composerForm");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const resetBtn = document.getElementById("resetBtn");

  let conversationId = localStorage.getItem(STORAGE_KEY) || null;
  let busy = false;

  const SUMMARY_MARKERS = ["Appointment Request", "اپائنٹمنٹ کی درخواست"];
  const RECEIVED_MARKERS = ["request has been received", "درخواست موصول ہو گئی ہے", "request receive ho gayi"];

  function isSummary(text) {
    return SUMMARY_MARKERS.some((m) => text.includes(m)) && text.includes(":");
  }
  function isReceived(text) {
    return RECEIVED_MARKERS.some((m) => text.includes(m));
  }

  function hideEmptyState() {
    if (emptyState) emptyState.style.display = "none";
  }

  function scrollToBottom() {
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }

  function appendMessage(role, content) {
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

    if (role === "assistant" && isReceived(content)) {
      bubble.classList.add("request-received");
    } else if (role === "assistant" && isSummary(content)) {
      bubble.classList.add("summary-card");
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatScroll.appendChild(row);

    if (role === "assistant" && isReceived(content)) {
      const banner = document.createElement("div");
      banner.className = "status-banner";
      banner.textContent = "✓ Request received — not yet confirmed";
      chatScroll.appendChild(banner);
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
            appendMessage(m.role, m.content);
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
