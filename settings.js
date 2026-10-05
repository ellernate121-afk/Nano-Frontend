window.BV = window.BV || {};

const CENSOR_BLOCKS = {
  none: "",
  some: "Avoid giving step-by-step instructions for anything that could cause serious physical harm. Otherwise answer questions normally and don't lecture.",
  strict: "Be conservative. Decline requests that seem borderline on safety, legality, or ethics. Suggest safer alternatives.",
  lockdown: "Decline every request with a brief refusal. This mode is for testing refusal behavior only."
};

(function () {
  const LS = {
    prompt: "bv_system_prompt",
    censor: "bv_censor_level",
    citations: "bv_citations",
    blocked: "bv_blocked_words",
    ngrok: "bv_ngrok_url",
    ngrokUser: "bv_ngrok_user",
    ngrokPass: "bv_ngrok_pass"
  };

  function get(key, fallback) {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    try { return JSON.parse(v); } catch { return v; }
  }

  function set(key, val) {
    localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
  }

  window.BV.getSystemPrompt = function () {
    return get(LS.prompt, "You are a helpful AI assistant. Be concise and direct.");
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

  window.BV.getNgrokAuth = function () {
    const user = get(LS.ngrokUser, "");
    const pass = get(LS.ngrokPass, "");
    return { user, pass };
  };

  window.BV.buildAuthHeader = function () {
    const { user, pass } = window.BV.getNgrokAuth();
    if (user && pass) {
      const credentials = btoa(`${user}:${pass}`);
      return { "Authorization": `Basic ${credentials}` };
    }
    return {};
  };

  window.BV.buildFullSystemPrompt = function (relevantCitations) {
    const parts = [];
    const custom = window.BV.getSystemPrompt();
    if (custom) parts.push(custom);

    const level = window.BV.getCensorLevel();
    const block = CENSOR_BLOCKS[level] || "";
    if (block) parts.push(block);

    if (relevantCitations && relevantCitations.length) {
      const citeText = relevantCitations
        .map((c) => `[${c.label}]\nSource: ${c.source}\n${c.text}`)
        .join("\n\n");
      parts.push("Knowledge base:\n" + citeText);
    }

    return parts.join("\n\n");
  };

  window.BV.matchCitations = function (userMessage) {
    const all = window.BV.getCitations();
    const lower = userMessage.toLowerCase();
    return all.filter((c) => lower.includes(c.label.toLowerCase()));
  };

  window.BV.checkBlockedWords = function (text) {
    const words = window.BV.getBlockedWords();
    const lower = text.toLowerCase();
    return words.filter((w) => lower.includes(w.toLowerCase()));
  };

  window.addEventListener("basevulture:unlocked", initSettingsUI);

  function initSettingsUI() {
    const promptText = document.getElementById("prompt-text");
    const promptSave = document.getElementById("prompt-save");
    const promptSaved = document.getElementById("prompt-saved");

    promptText.value = window.BV.getSystemPrompt();
    promptSave.addEventListener("click", (e) => {
      e.preventDefault();
      set(LS.prompt, promptText.value.trim());
      promptSaved.textContent = "✓ Saved";
      setTimeout(() => (promptSaved.textContent = ""), 2000);
    });

    const level = window.BV.getCensorLevel();
    document.querySelectorAll('input[name="censor"]').forEach((r) => {
      r.checked = r.value === level;
      r.addEventListener("change", () => set(LS.censor, r.value));
    });

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
          <button class="cit-remove" data-i="${i}" title="Remove">×</button>
          <div class="cit-label">${escapeHtml(c.label)}</div>
          <div class="cit-source">${escapeHtml(c.source)}</div>
          <div class="cit-text">${escapeHtml(c.text)}</div>
        `;
        citList.appendChild(li);
      });

      citList.querySelectorAll(".cit-remove").forEach((btn) => {
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
      const label = citLabel.value.trim();
      const source = citSource.value.trim();
      const text = citText.value.trim();
      if (!label || !source || !text) return;

      const items = window.BV.getCitations();
      items.push({ label, source, text });
      set(LS.citations, items);
      citForm.reset();
      renderCitations();
    });
    renderCitations();

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

      blockedList.querySelectorAll("button").forEach((btn) => {
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
      if (!words.includes(val)) {
        words.push(val);
        set(LS.blocked, words);
        blockedInput.value = "";
        renderBlocked();
      }
    });
    renderBlocked();

    const ngrokInput = document.getElementById("ngrok-url");
    const ngrokSave = document.getElementById("ngrok-save");
    const ngrokUser = document.getElementById("ngrok-user");
    const ngrokPass = document.getElementById("ngrok-pass");
    const ngrokAuthSave = document.getElementById("ngrok-auth-save");
    const ngrokTest = document.getElementById("ngrok-test");
    const ngrokMsg = document.getElementById("ngrok-msg");

    if (ngrokInput && ngrokSave && ngrokTest && ngrokMsg) {
      ngrokInput.value = window.BV.getNgrokUrl();
      const auth = window.BV.getNgrokAuth();
      if (ngrokUser) ngrokUser.value = auth.user;
      if (ngrokPass) ngrokPass.value = auth.pass;

      ngrokSave.addEventListener("click", (e) => {
        e.preventDefault();
        const url = ngrokInput.value.trim().replace(/\/+$/, "");
        set(LS.ngrok, url);
        ngrokMsg.textContent = "✓ URL Saved";
        updateStatusDot(false);
        setTimeout(() => (ngrokMsg.textContent = ""), 2000);
      });

      if (ngrokAuthSave) {
        ngrokAuthSave.addEventListener("click", (e) => {
          e.preventDefault();
          const user = ngrokUser.value.trim();
          const pass = ngrokPass.value.trim();
          set(LS.ngrokUser, user);
          set(LS.ngrokPass, pass);
          ngrokMsg.textContent = user ? "✓ Auth Saved" : "✓ Auth Cleared";
          updateStatusDot(false);
          setTimeout(() => (ngrokMsg.textContent = ""), 2000);
        });
      }

      ngrokTest.addEventListener("click", async (e) => {
        e.preventDefault();
        ngrokMsg.textContent = "🔄 Testing…";
        const url = window.BV.getNgrokUrl();
        if (!url) {
          ngrokMsg.textContent = "❌ No URL saved yet.";
          return;
        }

        try {
          const headers = {
            "ngrok-skip-browser-warning": "true",
            ...window.BV.buildAuthHeader()
          };

          const res = await fetch(url + "/v1/models", {
            headers: headers
          });

          if (res.ok) {
            ngrokMsg.textContent = "✓ Connected successfully";
            updateStatusDot(true);
          } else {
            ngrokMsg.textContent = `❌ Server error: ${res.status}`;
            updateStatusDot(false);
          }
        } catch (err) {
          ngrokMsg.textContent = "❌ Could not reach server. Check URL and CORS settings.";
          updateStatusDot(false);
        }
      });
    }
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
