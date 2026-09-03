// Account creation screen interactivity.
// Loaded with `defer`, so the HTML is fully parsed before this runs.

const form = document.querySelector("form");
const statusEl = document.getElementById("account-status");

// A deliberately loose "does this look like an email" check: something,
// then @, then something, a dot, then something, with no spaces anywhere.
// This is NOT strict RFC-correct email validation — that's a famous rabbit
// hole, and the only real proof an address works is sending mail to it,
// which is the actual auth service's job later, not ours here.
function isRoughlyEmailShaped(value) {
  return /^\S+@\S+\.\S+$/.test(value);
}

form.addEventListener("submit", (event) => {
  // Same reasoning as onboarding.js: stop the default page-reload submit
  // so we can validate and navigate ourselves.
  event.preventDefault();

  const formData = new FormData(form);
  const email = formData.get("email").trim();
  const password = formData.get("password");

  if (!email || !password) {
    showStatus("Please enter an email and password.", true);
    return;
  }

  if (!isRoughlyEmailShaped(email)) {
    showStatus("That email doesn't look right — check for a typo.", true);
    return;
  }

  // No account is actually created here — there's no backend to send this
  // to yet. We just move on to the dashboard. The email/password are never
  // stored or logged.
  window.location.href = "dashboard.html";
});

function showStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle("status-message--error", isError);
}
