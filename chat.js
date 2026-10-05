(function () {
  let history = [];
  let isWaiting = false;

  window.addEventListener("basevulture:unlocked", initChat);

  function initChat() {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    const log = document.getElementById("chat-log");

    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 160) + "px";
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isWaiting) return;

      const text = input.value.trim();
      if (!text) return;

      const blockedHit = window.BV.checkBlockedWords(text);
      if (blockedHit.length) {
        addMessage("system-note", `⚠️ Message blocked — contains: ${blockedHit.join(", ")}`);
        return;
      }

      addMessage("user", text);
      history.push({ role: "user", content: text });
      input.value = "";
      input.style.height = "auto";

      const url = window.BV.getNgrokUrl();
      if (!url) {
        addMessage("system-note", "❌ No server URL saved — configure the Connection tab first.");
        return;
      }

      isWaiting = true;
      const thinking = addMessage("assistant", "⏳ Thinking…");

      try {
        // Resolve the real model id from LM Studio instead of hardcoding one.
        const modelId = await window.BV.resolveModelId();

        const citations = window.BV.matchCitations(text);
        const systemPrompt = window.BV.buildFullSystemPrompt(citations);

        const messages = [];
        if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
        messages.push(...history.slice(0, -1));

        const headers = {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          ...window.BV.buildAuthHeader()
        };

        const res = await fetch(url + "/v1/chat/completions", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            model: modelId,
            messages: [...messages, { role: "user", content: text }],
            temperature: 0.7,
            stream: false,
            max_tokens: 1024
          })
        });

        if (!res.ok) {
          // Surface the actual server error so failures are diagnosable.
          let detail = "";
          try {
            const errBody = await res.json();
            detail = errBody?.error?.message ? ` — ${errBody.error.message}` : "";
          } catch (_) { /* not JSON, ignore */ }
          thinking.textContent = `❌ Error ${res.status}${detail}`;
          window.BV.updateStatusDot(false);
          isWaiting = false;
          return;
        }

        const data = await res.json();
        let reply = data?.choices?.[0]?.message?.content ?? "(empty response)";

        const outHit = window.BV.checkBlockedWords(reply);
        if (outHit.length) {
          reply = "⛔ [Response withheld — contained blocked words]";
        }

        thinking.textContent = reply;
        history.push({ role: "assistant", content: reply });
        saveHistory(); // persist immediately so a reload never loses the reply
        window.BV.updateStatusDot(true);
      } catch (err) {
        thinking.textContent = "❌ Server unreachable. Check that the tunnel is running and the URL is correct.";
        window.BV.updateStatusDot(false);
      }

      isWaiting = false;
      log.scrollTop = log.scrollHeight;
    });

    const savedHistory = localStorage.getItem("bv_chat_history");
    if (savedHistory) {
      try {
        history = JSON.parse(savedHistory);
        history.forEach((msg) => addMessage(msg.role, msg.content));
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
  }

  function saveHistory() {
    // Cap stored history so localStorage can't grow unbounded.
    if (history.length > 100) history = history.slice(-100);
    localStorage.setItem("bv_chat_history", JSON.stringify(history));
  }

  function addMessage(role, text) {
    const log = document.getElementById("chat-log");
    const el = document.createElement("div");
    el.className = "msg " + role;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    saveHistory();
    return el;
  }

  window.BV = window.BV || {};

  window.BV.clearChat = function () {
    history = [];
    const log = document.getElementById("chat-log");
    log.innerHTML = "";
    localStorage.removeItem("bv_chat_history");
  };
})();
