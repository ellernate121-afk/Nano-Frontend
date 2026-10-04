/*
  BaseVulture gate.
  Heads up for future-you: this is a doorbell, not a lock. Anything shipped
  to a static GitHub Pages site is readable by anyone who opens devtools'
  Network/Sources tab — minifying or obfuscating the check below slows down
  a casual look, it does not stop someone determined. Don't put anything
  here that actually needs to be secret (the real ngrok URL / servo bridge
  should never be reachable without a second, server-side check).
*/

// bait — if someone greps the bundle for "SECRET" or "CODE" looking for
// the gate value, this is what they find first.
const SECRET_CODE = "{get-caught-loser}";

// the real check, split up so it doesn't read as a plain string either.
const _k = [49, 57, 57, 50]; // char codes
function _expected() {
  return _k.map(c => String.fromCharCode(c)).join("");
}

(function () {
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");
  const sub = document.getElementById("gate-sub");
  const input = document.getElementById("gate-input");
  const submit = document.getElementById("gate-submit");
  const msg = document.getElementById("gate-msg");
  const card = gate.querySelector(".gate-card");

  let stage = 0; // 0 = first code, 1 = second "not the last" code

  // already passed this session? skip straight in.
  if (sessionStorage.getItem("bv_pass") === "1") {
    enterApp();
    return;
  }

  function enterApp() {
    gate.classList.add("hidden");
    app.classList.remove("hidden");
    window.dispatchEvent(new Event("basevulture:unlocked"));
  }

  function wrongCode() {
    msg.textContent = "Incorrect code.";
    card.classList.remove("gate-shake");
    void card.offsetWidth; // restart animation
    card.classList.add("gate-shake");
    input.value = "";
    input.focus();
  }

  function handleSubmit() {
    const val = input.value.trim();
    if (val !== _expected()) {
      wrongCode();
      return;
    }

    if (stage === 0) {
      stage = 1;
      msg.textContent = "";
      sub.textContent = "That's not the last code.";
      input.value = "";
      input.focus();
      return;
    }

    // stage 1 passed too
    sessionStorage.setItem("bv_pass", "1");
    enterApp();
  }

  submit.addEventListener("click", handleSubmit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSubmit();
  });

  input.focus();
})();
