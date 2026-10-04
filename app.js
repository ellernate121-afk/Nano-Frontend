(function () {
  function initTabs() {
    const buttons = document.querySelectorAll(".rail-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        const target = document.getElementById("tab-" + btn.dataset.tab);
        if (target) target.classList.add("active");
      });
    });
  }

  if (document.getElementById("app").classList.contains("hidden")) {
    window.addEventListener("basevulture:unlocked", initTabs);
  } else {
    initTabs();
  }
})();
