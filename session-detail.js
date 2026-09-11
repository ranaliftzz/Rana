// Session detail: what's planned for one day, browse-only (PRD screen 5).
// Movement-pattern slots with set counts — deliberately no exercise-swap
// control here, since swapping ("the rack is taken") is a decision made
// while about to log a set, not while browsing (see active-session.js).

function getDateParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get("date") || Rana.plan.todayStr();
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

  const dateObj = new Date(dateStr + "T00:00:00");
  document.getElementById("session-date").textContent = dateObj.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  if (session.isRestDay) {
    document.getElementById("session-title").textContent = "Rest day";
    document.getElementById("session-note").textContent =
      "Rest days are part of the plan — there's nothing to log today.";
    return;
  }

  document.getElementById("session-title").textContent = session.workout.day_name;

  const list = document.getElementById("slot-list");
  list.innerHTML = "";

  session.slots.forEach((slot) => {
    const options = data.optionsBySlot.get(slot.slot_id) || [];
    const primaryOption = options.find((o) => o.option_rank === 1);
    const primaryExercise = primaryOption ? data.exerciseByKey.get(primaryOption.exercise_key) : null;

    const card = document.createElement("div");
    card.className = "panel slot-card";

    const pattern = document.createElement("p");
    pattern.className = "slot-pattern";
    pattern.textContent = slot.movement_pattern;
    card.appendChild(pattern);

    const name = document.createElement("h2");
    name.className = "slot-exercise-name";
    name.textContent = primaryExercise ? primaryExercise.exercise_name : "(exercise unavailable)";
    card.appendChild(name);

    const prescription = document.createElement("p");
    prescription.className = "slot-prescription";
    prescription.innerHTML =
      `<span class="num">${slot.working_sets}</span> sets &times; ${slot.rep_range} reps · RPE <span class="num">${slot.target_rpe}</span> · rest <span class="num">${slot.rest_seconds}</span>s`;
    card.appendChild(prescription);

    if (options.length > 1) {
      const altNote = document.createElement("p");
      altNote.className = "slot-prescription";
      altNote.textContent = `${options.length - 1} alternate${options.length > 2 ? "s" : ""} available if this station is taken — swap while logging.`;
      card.appendChild(altNote);
    }

    list.appendChild(card);
  });

  const beginBtn = document.getElementById("begin-btn");
  const isToday = dateStr === Rana.plan.todayStr();
  const note = document.getElementById("session-note");

  if (isToday && session.status !== "completed") {
    beginBtn.hidden = false;
    beginBtn.addEventListener("click", () => {
      window.location.href = `active-session.html?date=${dateStr}`;
    });
  } else if (session.status === "completed") {
    note.textContent = "Already logged.";
  } else if (session.status === "missed") {
    note.textContent = "This session was missed — it stays on the schedule, not rescheduled.";
  } else {
    note.textContent = "This is an upcoming session — you can start it once it's today.";
  }
}

main();
