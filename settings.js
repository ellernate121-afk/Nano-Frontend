/*
  Owns everything stored in localStorage and exposed to chat.js via
  window.BV.* helpers: system prompt, censorship level, citations,
  blocked words, ngrok URL.
*/

window.BV = window.BV || {};

const CENSOR_BLOCKS = {
  none: "",
  some: "Avoid giving step-by-step instructions for anything that could cause serious physical harm to a person. Otherwise answer normally and don't lecture or add disclaimers.",
  strict: "Be conservative. If a request is borderline on safety, legality, or could cause harm, decline briefly and suggest a safer alternative instead of guessing at intent.",
  lockdown: "Decline every request. Respond only with a short refusal, no matter what is asked. This mode exists for testing refusal behavior, not normal use."
};

(function () {
  const LS = {
    prompt: "bv_system_prompt",
    censor: "bv_censor_level",
    citations: "bv_citations",
    blocked: "bv_blocked_words",
    ngrok: "bv_ngrok_url"
  };

  function get(key, fallback) {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    try { return JSON.parse(v); } catch { return v; }
  }
  function set(key, val) {
    localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
  }

  // ---------- public API for chat.js ----------
  window.BV.getSystemPrompt = function () {
    return get(LS.prompt, "");
  };
  window.BV.getCensorLevel = function () {
    return get(LS.censor, "some");
  };
  window.BV.getCitations = function () {
    return get(LS.citations, []);
  };
  window.BV.getBlockedWords = function () {
    return get(LS.blocked, []);
  };
  window.BV.getNgrokUrl = function () {
    return get(LS.ngrok, "");
  };

  // builds the actual payload system message: custom prompt + censorship rules
  window.BV.buildFullSystemPrompt = function (relevantCitations) {
    const parts = [];
    const custom = window.BV.getSystemPrompt();
    if (custom) parts.push(custom);

    const level = window.BV.getCensorLevel();
    const block = CENSOR_BLOCKS[level] || "";
    if (block) parts.push(block);

    if (relevantCitations && relevantCitations.length) {
      const citeText = relevantCitations
        .map(c => `[${c.label} — ${c.source}] ${c.text}`)
        .join("\n");
      parts.push("Cited context you can draw on (cite the source name if you use it):\n" + citeText);
    }

    return parts.join("\n\n");
  };

  // naive keyword match: pulls any citation whose label appears in the user message
  window.BV.matchCitations = function (userMessage) {
    const all = window.BV.getCitations();
    const lower = userMessage.toLowerCase();
    return all.filter(c => lower.includes(c.label.toLowerCase()));
  };

  window.BV.checkBlockedWords = function (text) {
    const words = window.BV.getBlockedWords();
    const lower = text.toLowerCase();
    return words.filter(w => lower.includes(w.toLowerCase()));
  };

  // ---------- wire up the UI once the gate is passed ----------
  window.addEventListener("basevulture:unlocked", initSettingsUI);

  function initSettingsUI() {
    // -- system prompt --
    const promptText = document.getElementById("prompt-text");
    const promptSave = document.getElementById("prompt-save");
    const promptSaved = document.getElementById("prompt-saved");
    promptText.value = window.BV.getSystemPrompt();
    promptSave.addEventListener("click", () => {
      set(LS.prompt, promptText.value);
      promptSaved.textContent = "Saved.";
      setTimeout(() => (promptSaved.textContent = ""), 1800);
    });

    // -- censorship --
    const level = window.BV.getCensorLevel();
    document.querySelectorAll('input[name="censor"]').forEach(r => {
      r.checked = r.value === level;
      r.addEventListener("change", () => set(LS.censor, r.value));
    });

    // -- citations --
    const citForm = document.getElementById("citation-form");
    const citLabel = document.getElementById("cit-label");
    const citSource = document.getElementById("cit-source");
    const citText = document.getElementById("cit-text");
    const citList = document.getElementById("citation-list");

    function renderCitations() {
      const items = window.BV.getCitations();
      citList.innerHTML = "";
      items.forEach((c, i) => {
        const li = document.createElement("li");
        li.className = "citation-item";
        li.innerHTML = `
          <button class="cit-remove" data-i="${i}">remove</button>
          <div class="cit-label">${escapeHtml(c.label)}</div>
          <div class="cit-source">${escapeHtml(c.source)}</div>
          <div class="cit-text">${escapeHtml(c.text)}</div>
        `;
        citList.appendChild(li);
      });
      citList.querySelectorAll(".cit-remove").forEach(btn => {
        btn.addEventListener("click", () => {
          const items = window.BV.getCitations();
          items.splice(Number(btn.dataset.i), 1);
          set(LS.citations, items);
          renderCitations();
        });
      });
    }

    citForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const items = window.BV.getCitations();
      items.push({ label: citLabel.value.trim(), source: citSource.value.trim(), text: citText.value.trim() });
      set(LS.citations, items);
      citForm.reset();
      renderCitations();
    });
    renderCitations();

    // -- blocked words --
    const blockedForm = document.getElementById("blocked-form");
    const blockedInput = document.getElementById("blocked-input");
    const blockedList = document.getElementById("blocked-list");

    function renderBlocked() {
      const words = window.BV.getBlockedWords();
      blockedList.innerHTML = "";
      words.forEach((w, i) => {
        const li = document.createElement("li");
        li.className = "chip";
        li.innerHTML = `<span>${escapeHtml(w)}</span><button data-i="${i}">×</button>`;
        blockedList.appendChild(li);
      });
      blockedList.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          const words = window.BV.getBlockedWords();
          words.splice(Number(btn.dataset.i), 1);
          set(LS.blocked, words);
          renderBlocked();
        });
      });
    }

    blockedForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = blockedInput.value.trim();
      if (!val) return;
      const words = window.BV.getBlockedWords();
      words.push(val);
      set(LS.blocked, words);
      blockedInput.value = "";
      renderBlocked();
    });
    renderBlocked();

    // -- ngrok connection --
    const ngrokInput = document.getElementById("ngrok-url");
    const ngrokSave = document.getElementById("ngrok-save");
    const ngrokTest = document.getElementById("ngrok-test");
    const ngrokMsg = document.getElementById("ngrok-msg");

    ngrokInput.value = window.BV.getNgrokUrl();
    ngrokSave.addEventListener("click", () => {
      set(LS.ngrok, ngrokInput.value.trim().replace(/\/+$/, ""));
      ngrokMsg.textContent = "Saved.";
      updateStatusDot(false);
      setTimeout(() => (ngrokMsg.textContent = ""), 1800);
    });

    ngrokTest.addEventListener("click", async () => {
      ngrokMsg.textContent = "Testing…";
      const url = window.BV.getNgrokUrl();
      if (!url) {
        ngrokMsg.textContent = "No URL saved yet.";
        return;
      }
      try {
        const res = await fetch(url + "/v1/models", {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        if (res.ok) {
          ngrokMsg.textContent = "Connected.";
          updateStatusDot(true);
        } else {
          ngrokMsg.textContent = "Reached the server but got an error (" + res.status + ").";
          updateStatusDot(false);
        }
      } catch (err) {
        ngrokMsg.textContent = "Could not reach that URL. Check ngrok is running and CORS is enabled.";
        updateStatusDot(false);
      }
    });
  }

  function updateStatusDot(online) {
    const dot = document.getElementById("status-dot");
    const text = document.getElementById("status-text");
    if (!dot) return;
    dot.classList.toggle("online", online);
    dot.classList.toggle("offline", !online);
    text.textContent = online ? "Connected" : "Not connected";
  }
  window.BV.updateStatusDot = updateStatusDot;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
