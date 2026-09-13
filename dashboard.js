// Dashboard, rebuilt against design/rana-dashboard-mockup.html (PRD §7, §10).
// Renders purely from Rana.storage.getDashboardState() — this file never
// touches localStorage, and never calls Rana.data/Rana.plan/Rana.game
// directly for data; js/storage.js already assembled everything into one
// plain object shaped for rendering. (Rana.plan.todayStr() below is the one
// exception — it's a pure date-formatting helper, not a data read.)

const SEGMENTS = 20; // verified legible at 390px — see CLAUDE.md if that changes

function renderSegments(container, filledCount, total = SEGMENTS) {
  container.innerHTML = "";
  const clamped = Math.max(0, Math.min(total, Math.round(filledCount)));
  for (let i = 0; i < total; i++) {
    const span = document.createElement("span");
    if (i < clamped) span.classList.add("filled");
    container.appendChild(span);
  }
}

function segmentsFor(value, max) {
  if (!max) return 0;
  return (value / max) * SEGMENTS;
}

async function main() {
  const state = await Rana.storage.getDashboardState();

  // --- Vitals bar (persistent chrome, pinned via CSS position: sticky) ---
  document.getElementById("vitals-name").textContent = state.name;
  document.getElementById("vitals-tier").textContent = state.tier;
  document.getElementById("level-text").textContent = `LV ${state.level}`;

  document.getElementById("xp-text").textContent =
    `${state.xp} / ${state.xpNeed} XP TO LV ${state.level + 1}`;
  renderSegments(document.getElementById("xp-bar"), segmentsFor(state.xp, state.xpNeed));

  const recoveryText = document.getElementById("recovery-text");
  const recoveryBar = document.getElementById("recovery-bar");
  if (state.recovery === null) {
    // Never a placeholder percentage, never 100%, never a guess.
    recoveryText.textContent = "— NO DATA";
    recoveryText.classList.add("vitals-meter-value--dash");
    renderSegments(recoveryBar, 0);
  } else {
    recoveryText.textContent = `${state.recovery}%`;
    recoveryText.classList.remove("vitals-meter-value--dash");
    recoveryBar.classList.add("stat-bar--recovery");
    renderSegments(recoveryBar, segmentsFor(state.recovery, 100));
  }

  // --- Session card ---
  const today = state.today;
  const cta = document.getElementById("session-cta");
  const restNote = document.getElementById("rest-note");
  const sessionMeta = document.getElementById("session-meta");
  const sessionYield = document.getElementById("session-yield");

  if (today.isRestDay) {
    // Rest days are prescribed and non-overridable — no start affordance
    // at all, not even a disabled one (locked design decision #1).
    document.getElementById("session-label").textContent = "Today";
    document.getElementById("session-day").textContent = "Rest day";
    document.getElementById("session-focus").textContent = "";
    sessionMeta.hidden = true;
    sessionYield.hidden = true;
    cta.hidden = true;
    restNote.hidden = false;

    fetch("data/quotes.json")
      .then((r) => r.json())
      .then((quotes) => {
        const restQuotes = quotes.filter((q) => q.context.includes("rest"));
        const quote = restQuotes[Math.floor(Math.random() * restQuotes.length)];
        restNote.textContent = `"${quote.text}" — ${quote.author}`;
      })
      .catch(() => {
        restNote.textContent = "Rest days are part of the plan.";
      });
  } else {
    document.getElementById("session-label").textContent = "Today";
    document.getElementById("session-day").textContent = today.dayName;
    document.getElementById("session-focus").textContent = today.focusMuscles;
    document.getElementById("meta-slots").textContent = today.slotCount;
    document.getElementById("meta-sets").textContent = today.workingSets;
    document.getElementById("meta-time").textContent = `${today.estMinutes}m`;

    const chipsEl = document.getElementById("yield-chips");
    chipsEl.innerHTML = "";
    today.statYield.forEach((stat) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = `+${stat}`;
      chipsEl.appendChild(chip);
    });

    cta.hidden = false;
    cta.textContent = today.completed ? "View session" : "Start session";
    cta.addEventListener("click", () => {
      window.location.href = `session-detail.html?date=${Rana.plan.todayStr()}`;
    });
  }

  // --- Status matrix: current vs. 12-week target, not progress to next level ---
  const statRows = document.getElementById("stat-rows");
  statRows.innerHTML = "";
  state.stats.forEach((stat) => {
    const row = document.createElement("div");
    row.className = "stat-matrix-row";

    const head = document.createElement("div");
    head.className = "stat-matrix-head";
    head.innerHTML =
      `<span class="stat-matrix-name">${stat.key}</span>` +
      `<span class="stat-matrix-values"><span class="num">${stat.current}</span>` +
      `<span class="stat-matrix-arrow">&rarr;</span>` +
      `<span class="num stat-matrix-target">${stat.target}</span></span>`;
    row.appendChild(head);

    const bar = document.createElement("div");
    bar.className = "stat-bar projected";
    row.appendChild(bar);

    statRows.appendChild(row);
    renderSegments(bar, segmentsFor(stat.current, stat.target));
  });

  // --- Microcycle: one cell shape for all seven days, state via border/marker only ---
  document.getElementById("week-number").textContent = `week ${state.weekNumber}`;
  const weekStrip = document.getElementById("week-strip");
  weekStrip.innerHTML = "";
  state.week.forEach((day) => {
    const cell = document.createElement("div");
    cell.className = "microcycle-day";
    cell.dataset.state = day.state;
    cell.innerHTML =
      `<span class="microcycle-day-name">${day.weekday}</span>` +
      `<span class="microcycle-day-marker"></span>` +
      `<span class="microcycle-day-label">${day.state === "rest" ? "REST" : day.label}</span>`;
    weekStrip.appendChild(cell);
  });

  // --- Footer ---
  document.getElementById("footer-consistency").textContent = `${state.consistencyDays} days`;
  document.getElementById("footer-logged").textContent = state.sessionsLogged;
  document.getElementById("footer-next").textContent = state.nextTier;
}

main();
