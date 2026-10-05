/*
  BaseVulture initialization.
  Gate removed. App loads directly.
*/

(function () {
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");

  if (gate) {
    gate.classList.add("hidden");
  }

  if (app) {
    app.classList.remove("hidden");
  }

  window.dispatchEvent(new Event("basevulture:unlocked"));
})();
