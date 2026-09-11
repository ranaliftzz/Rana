// Dashboard screen, rebuilt against real stored data (PRD section 3).
// Replaces the old hardcoded placeholder version and its demo toggle —
// everything below reads from Rana.storage / Rana.data / Rana.plan / Rana.game.

async function main() {
  const profile = Rana.storage.getProfile();
  const plan = Rana.storage.getPlan();

  if (!profile || !plan) {
    window.location.href = "onboarding.html";
    return;
  }
  if (plan.status !== "active") {
    // Questionnaire finished but the results screen's "lock in" step didn't
    // happen yet — send them back to finish that, not into a dashboard for
    // a plan that was never actually confirmed.
    window.location.href = "results.html";
    return;
  }

  const data = await Rana.data.load();
  const allLoggedSets = Rana.storage.getAllLoggedSets();

  // --- Header: date, name, level/tier ---
  const today = new Date();
  document.getElementById("dashboard-date").textContent = today.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
  document.getElementById("dashboard-greeting").textContent = `Welcome back, ${profile.name}`;

  const slotsBySlotId = new Map(data.slots.map((s) => [s.slot_id, s]));
  const xp = Rana.game.totalXp(allLoggedSets, slotsBySlotId);
  const level = Rana.game.levelForXp(xp);
  const tier = Rana.game.tierForLevel(level);
  document.getElementById("dashboard-tier").textContent = tier;
  document.getElementById("dashboard-level").textContent = `LV ${level}`;

  // --- Today's workout card ---
  const todayStr = Rana.plan.todayStr();
  const loggedToday = Rana.storage.getLoggedSetsForDate(todayStr);
  const todaySession = Rana.plan.getSessionForDate(todayStr, plan, data, loggedToday);

  const todayCard = document.getElementById("today-card");
  const todayType = document.getElementById("today-type");
  const todayStart = document.getElementById("today-start");
  const todayRestNote = document.getElementById("today-rest-note");

  if (todaySession.isRestDay) {
    todayCard.dataset.state = "rest";
    const quotes = await fetch("data/quotes.json").then((r) => r.json());
    const restQuotes = quotes.filter((q) => q.context.includes("rest"));
    const quote = restQuotes[Math.floor(Math.random() * restQuotes.length)];
    todayType.textContent = "Rest day";
    todayRestNote.textContent = `"${quote.text}" — ${quote.author}`;
  } else {
    todayCard.dataset.state = "training";
    todayType.textContent = todaySession.workout.day_name;
    todayStart.textContent = todaySession.status === "completed" ? "View session" : "Start workout";
    todayStart.addEventListener("click", () => {
      window.location.href = `session-detail.html?date=${todayStr}`;
    });
  }

  // --- Week strip: the calendar week (Mon-Sun) containing today ---
  const weekStrip = document.getElementById("week-strip");
  weekStrip.innerHTML = "";

  const dayOfWeekMonFirst = (today.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeekMonFirst);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = Rana.plan.toDateStr(date);
    const loggedForDay = Rana.storage.getLoggedSetsForDate(dateStr);
    const daySession = Rana.plan.getSessionForDate(dateStr, plan, data, loggedForDay);

    const li = document.createElement("li");
    li.className = "week-day";
    li.dataset.state = daySession.status;
    const label = document.createElement("span");
    label.className = "week-day-label";
    label.textContent = daySession.weekday;
    li.appendChild(label);
    weekStrip.appendChild(li);
  }
}

main();
