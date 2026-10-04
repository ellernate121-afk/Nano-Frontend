(function () {
  const CORRECT_CODE = "0000";

  function initGate() {
    const gateInput = document.getElementById("gate-input");
    const gateSubmit = document.getElementById("gate-submit");
    const gateMsg = document.getElementById("gate-msg");
    const gateCard = document.querySelector(".gate-card");

    gateSubmit.addEventListener("click", () => {
      const code = gateInput.value.trim();
      if (code === CORRECT_CODE) {
        unlock();
      } else {
        gateMsg.textContent = "Incorrect code. Try again.";
        gateCard.classList.add("gate-shake");
        setTimeout(() => gateCard.classList.remove("gate-shake"), 320);
        gateInput.value = "";
      }
    });

    gateInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") gateSubmit.click();
    });

    gateInput.focus();
  }

  function unlock() {
    const gate = document.getElementById("gate");
    const app = document.getElementById("app");

    gate.style.opacity = "0";
    gate.style.pointerEvents = "none";
    app.classList.remove("hidden");

    setTimeout(() => {
      window.dispatchEvent(new Event("basevulture:unlocked"));
    }, 200);
  }

  initGate();
})();
