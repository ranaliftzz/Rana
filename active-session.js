// Active session / logging (PRD screen 6). Committing to log sets is a
// separate intent from browsing (session-detail.html) — this is the only
// screen that writes logged_set records.
//
// The slot records what was prescribed; the log records what actually
// happened (PRD section 5.3) — so swapping exercises here doesn't touch
// the slot, it just changes which exercise_key the next logged set uses.

function getDateParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get("date") || Rana.plan.todayStr();
}

const selectedExerciseKeyBySlot = new Map();

function buildSlotCard(slot, data, dateStr) {
  const options = data.optionsBySlot.get(slot.slot_id) || [];
  const alreadyLogged = Rana.storage.getLoggedSetsForDate(dateStr).filter((s) => s.slot_id === slot.slot_id);
  const lastLogged = alreadyLogged[alreadyLogged.length - 1];
  const defaultKey = lastLogged ? lastLogged.exercise_key : (options.find((o) => o.option_rank === 1) || {}).exercise_key;
  selectedExerciseKeyBySlot.set(slot.slot_id, defaultKey);

  const card = document.createElement("div");
  card.className = "panel slot-card";
  card.dataset.slotId = slot.slot_id;

  const pattern = document.createElement("p");
  pattern.className = "slot-pattern";
  pattern.textContent = slot.movement_pattern;
  card.appendChild(pattern);

  const nameEl = document.createElement("h2");
  nameEl.className = "slot-exercise-name";
  card.appendChild(nameEl);

  function updateName() {
    const ex = data.exerciseByKey.get(selectedExerciseKeyBySlot.get(slot.slot_id));
    nameEl.textContent = ex ? ex.exercise_name : "(unavailable)";
  }
  updateName();

  const prescription = document.createElement("p");
  prescription.className = "slot-prescription";
  prescription.innerHTML =
    `<span class="num">${slot.working_sets}</span> sets &times; ${slot.rep_range} reps · RPE <span class="num">${slot.target_rpe}</span>`;
  card.appendChild(prescription);

  // --- Swap picker ---
  if (options.length > 1) {
    const swapRow = document.createElement("div");
    swapRow.className = "slot-swap";
    options.forEach((opt) => {
      const ex = data.exerciseByKey.get(opt.exercise_key);
      if (!ex) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot-swap-option";
      btn.textContent = `${ex.exercise_name} (${ex.equipment})`;
      btn.dataset.exerciseKey = opt.exercise_key;
      btn.setAttribute("aria-pressed", String(opt.exercise_key === defaultKey));
      btn.addEventListener("click", () => {
        selectedExerciseKeyBySlot.set(slot.slot_id, opt.exercise_key);
        swapRow.querySelectorAll(".slot-swap-option").forEach((b) => {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        updateName();
      });
      swapRow.appendChild(btn);
    });
    card.appendChild(swapRow);
  }

  // --- Set rows ---
  const rows = document.createElement("div");
  rows.style.display = "flex";
  rows.style.flexDirection = "column";
  rows.style.gap = "8px";
  rows.style.marginTop = "8px";

  for (let i = 1; i <= slot.working_sets; i++) {
    const row = document.createElement("div");
    row.className = "set-row";

    const indexEl = document.createElement("span");
    indexEl.className = "set-row-index num";
    indexEl.textContent = i;
    row.appendChild(indexEl);

    const weightInput = document.createElement("input");
    weightInput.type = "number";
    weightInput.inputMode = "decimal";
    weightInput.placeholder = "lb";
    row.appendChild(weightInput);

    const repsInput = document.createElement("input");
    repsInput.type = "number";
    repsInput.inputMode = "numeric";
    repsInput.placeholder = "reps";
    row.appendChild(repsInput);

    const logBtn = document.createElement("button");
    logBtn.type = "button";
    logBtn.className = "set-log-btn";
    logBtn.textContent = "Log";
    row.appendChild(logBtn);

    const existing = alreadyLogged.find((s) => s.set_index === i);
    if (existing) {
      weightInput.value = existing.weight;
      repsInput.value = existing.reps;
      weightInput.disabled = true;
      repsInput.disabled = true;
      logBtn.disabled = true;
      logBtn.setAttribute("aria-pressed", "true");
      logBtn.textContent = "Logged";
    } else {
      logBtn.addEventListener("click", () => {
        const weight = Number(weightInput.value);
        const reps = Number(repsInput.value);
        if (!weightInput.value || !repsInput.value || Number.isNaN(weight) || Number.isNaN(reps)) {
          logBtn.textContent = "Enter both";
          setTimeout(() => { logBtn.textContent = "Log"; }, 1200);
          return;
        }
        Rana.storage.addLoggedSet({
          date: dateStr,
          slot_id: slot.slot_id,
          exercise_key: selectedExerciseKeyBySlot.get(slot.slot_id),
          set_index: i,
          rep_range: slot.rep_range,
          weight,
          reps,
          completed_at: new Date().toISOString(),
        });
        weightInput.disabled = true;
        repsInput.disabled = true;
        logBtn.disabled = true;
        logBtn.setAttribute("aria-pressed", "true");
        logBtn.textContent = "Logged";
      });
    }

    rows.appendChild(row);
  }

  card.appendChild(rows);
  return card;
}

async function main() {
  const profile = Rana.storage.getProfile();
  const plan = Rana.storage.getPlan();
  if (!profile || !plan || plan.status !== "active") {
    window.location.href = "dashboard.html";
    return;
  }

  const data = await Rana.data.load();
  const dateStr = getDateParam();
  const loggedForDay = Rana.storage.getLoggedSetsForDate(dateStr);
  const session = Rana.plan.getSessionForDate(dateStr, plan, data, loggedForDay);

  if (session.isRestDay) {
    window.location.href = "dashboard.html";
    return;
  }

  document.getElementById("session-title").textContent = session.workout.day_name;

  const list = document.getElementById("slot-list");
  list.innerHTML = "";
  session.slots.forEach((slot) => {
    list.appendChild(buildSlotCard(slot, data, dateStr));
  });

  document.getElementById("finish-btn").addEventListener("click", () => {
    const panel = document.getElementById("difficulty-panel");
    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.querySelectorAll("[data-difficulty]").forEach((btn) => {
    btn.addEventListener("click", () => {
      Rana.storage.saveSessionFeedback(dateStr, Number(btn.dataset.difficulty));
      window.location.href = `session-complete.html?date=${dateStr}`;
    });
  });
}

main();
