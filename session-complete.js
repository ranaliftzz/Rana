// Session complete (PRD screen 7) — carries the level-up/tier-up moment.
// Compares total XP/stats from before this session's sets to after, so a
// level-up or tier-up can be detected and celebrated without storing any
// separate "current level" value anywhere (see game.js's design note).

function getDateParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get("date") || Rana.plan.todayStr();
}

async function main() {
  const profile = Rana.storage.getProfile();
  const plan = Rana.storage.getPlan();
  if (!profile || !plan) {
    window.location.href = "dashboard.html";
    return;
  }

  const data = await Rana.data.load();
  const dateStr = getDateParam();
  const slotsBySlotId = new Map(data.slots.map((s) => [s.slot_id, s]));

  const allSets = Rana.storage.getAllLoggedSets();
  const beforeSets = allSets.filter((s) => s.date !== dateStr);
  const afterSets = allSets;

  const xpBefore = Rana.game.totalXp(beforeSets, slotsBySlotId);
  const xpAfter = Rana.game.totalXp(afterSets, slotsBySlotId);
  const gained = xpAfter - xpBefore;

  document.getElementById("xp-gain").textContent = `+${gained} XP`;

  const levelBefore = Rana.game.levelForXp(xpBefore);
  const levelAfter = Rana.game.levelForXp(xpAfter);
  const tierBefore = Rana.game.tierForLevel(levelBefore);
  const tierAfter = Rana.game.tierForLevel(levelAfter);

  // --- Stat gains ---
  const baseline = Rana.game.computeBaselineStats(profile);
  const pointsBefore = Rana.game.computeStatPoints(beforeSets, data.exerciseByKey);
  const pointsAfter = Rana.game.computeStatPoints(afterSets, data.exerciseByKey);

  const statGainsEl = document.getElementById("stat-gains");
  statGainsEl.innerHTML = "";
  ["STR", "AGI", "VIT", "INT"].forEach((stat) => {
    const before = Rana.game.statValue(pointsBefore[stat], baseline[stat]);
    const after = Rana.game.statValue(pointsAfter[stat], baseline[stat]);
    const row = document.createElement("p");
    row.className = "slot-prescription";
    const delta = after - before;
    row.innerHTML = `${stat}: <span class="num">${before}</span> ${delta > 0 ? `&rarr; <span class="num">${after}</span>` : "(no change)"}`;
    statGainsEl.appendChild(row);
  });

  // --- Quote ---
  const quotes = await fetch("data/quotes.json").then((r) => r.json());
  const completeQuotes = quotes.filter((q) => q.context.includes("session-complete"));
  const quote = completeQuotes[Math.floor(Math.random() * completeQuotes.length)];
  document.getElementById("quote-text").textContent = `"${quote.text}"`;
  document.getElementById("quote-attribution").textContent = `— ${quote.author}`;

  // --- Level-up / tier-up modals ---
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".modal-backdrop").hidden = true;
    });
  });

  if (tierAfter !== tierBefore) {
    document.getElementById("tier-up-value").textContent = tierAfter;
    document.getElementById("tier-up-backdrop").hidden = false;
  } else if (levelAfter > levelBefore) {
    document.getElementById("level-up-value").textContent = `LV ${levelAfter}`;
    document.getElementById("level-up-backdrop").hidden = false;
  }
}

main();
