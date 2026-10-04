(function () {
  let history = []; // [{role, content}]

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
      const text = input.value.trim();
      if (!text) return;

      const blockedHit = window.BV.checkBlockedWords(text);
      if (blockedHit.length) {
        addMessage("system-note", `Message blocked — contains: ${blockedHit.join(", ")}`);
        return;
      }

      addMessage("user", text);
      history.push({ role: "user", content: text });
      input.value = "";
      input.style.height = "auto";

      const url = window.BV.getNgrokUrl();
      if (!url) {
        addMessage("system-note", "No ngrok URL saved — set one in the Connection tab first.");
        return;
      }

      const thinking = addMessage("assistant", "…");

      try {
        const citations = window.BV.matchCitations(text);
        const systemPrompt = window.BV.buildFullSystemPrompt(citations);

        const messages = [];
        if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
        messages.push(...history);

        const res = await fetch(url + "/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({
            model: "local-model",
            messages,
            temperature: 0.7,
            stream: false
          })
        });

        if (!res.ok) {
          const errBody = await res.text();
          thinking.textContent = `Error ${res.status} — ${errBody}`;
          window.BV.updateStatusDot(false);
          return;
        }

        const data = await res.json();
        let reply = data?.choices?.[0]?.message?.content ?? "(empty response)";

        const outHit = window.BV.checkBlockedWords(reply);
        if (outHit.length) {
          reply = "[response withheld — contained a blocked word]";
        }

        thinking.textContent = reply;
        history.push({ role: "assistant", content: reply });
        window.BV.updateStatusDot(true);
      } catch (err) {
        thinking.textContent = "Couldn't reach the server. Is ngrok running, and is the URL current?";
        window.BV.updateStatusDot(false);
      }

      log.scrollTop = log.scrollHeight;
    });
  }

  function addMessage(role, text) {
    const log = document.getElementById("chat-log");
    const el = document.createElement("div");
    el.className = "msg " + role;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
})();
