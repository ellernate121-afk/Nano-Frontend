(function () {
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");

  if (gate) {
    gate.style.display = "none";
    gate.style.pointerEvents = "none";
  }

  if (app) {
    app.classList.remove("hidden");
  }

  window.dispatchEvent(new Event("basevulture:unlocked"));
})();
