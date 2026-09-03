// Dashboard screen interactivity.
// Loaded with `defer`, so the HTML is fully parsed before this runs.
// Everything on this screen is hardcoded placeholder data — there's no
// data layer yet (that's roadmap step 5+), so nothing here is read from
// or written to storage.

const dateEl = document.getElementById("dashboard-date");
const todayCard = document.getElementById("today-card");
const startBtn = document.getElementById("today-start");
const weekToday = document.getElementById("week-today");
const demoToggle = document.getElementById("demo-toggle");

// --- a) Header date ---
// toLocaleDateString formats a Date using the browser's locale rules. This
// is just today's real date/day of week for display — not persistence.
const today = new Date();
dateEl.textContent = today.toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

// --- b) Today's workout card ---
// The card is a real, full-strength button, but it's intentionally inert:
// there's no workout detail screen to send the user to yet. When that
// screen exists, this is the one line that changes:
//   window.location.href = "workout-detail.html";
startBtn.addEventListener("click", () => {
  // Placeholder — start affordance is not wired to anything yet.
});

// --- Demo toggle (temporary, not part of the real app) ---
// Lets both today-card states (training vs. rest) be previewed without
// editing code. Flips the card's data-state and keeps the week strip's
// "today" cell in agreement with it, so the two never disagree. Delete
// this whole block, the button in dashboard.html, and its CSS once the
// dashboard reads a real plan and today's state comes from real data.
demoToggle.addEventListener("click", () => {
  const isRestNow = todayCard.dataset.state === "rest";
  const nextState = isRestNow ? "training" : "rest";

  todayCard.dataset.state = nextState;
  weekToday.dataset.state = nextState === "rest" ? "rest" : "today";
  demoToggle.textContent = nextState === "rest" ? "Preview training day" : "Preview rest day";
});
