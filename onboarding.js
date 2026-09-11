// Questionnaire interactivity (PRD section 8).
// One page, thirteen .q-question divs; only one has the "active" class at
// a time. Because nothing is ever removed from the DOM — just hidden — the
// browser's own form state (what's typed, what's checked) IS the answer
// state. There's no separate JS object mirroring it, so there's nothing to
// keep in sync when the user goes back and changes an earlier answer.

const TOTAL_QUESTIONS = 13;
const questionEls = Array.from(document.querySelectorAll(".q-question"));
const progressText = document.getElementById("q-progress");
const progressFill = document.getElementById("q-progress-fill");
const backBtn = document.getElementById("q-back");
const statusEl = document.getElementById("onboarding-status");

let currentIndex = 0;

function showQuestion(index) {
  currentIndex = index;
  questionEls.forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.index) === index);
  });
  progressText.textContent = `Question ${index + 1} of ${TOTAL_QUESTIONS}`;
  progressFill.style.width = `${((index + 1) / TOTAL_QUESTIONS) * 100}%`;
  backBtn.hidden = index === 0;
  clearStatus();
  if (index === 12) refreshWeekdaysHint();

  const firstInput = questionEls[index].querySelector("input");
  if (firstInput) firstInput.focus();
}

function goTo(index) {
  history.pushState({ index }, "", `#q${index + 1}`);
  showQuestion(index);
}

// Browser back button steps back one question instead of leaving the page,
// because every question push a history entry (see goTo above) — going
// back just pops to the previous one.
window.addEventListener("popstate", (event) => {
  showQuestion(event.state ? event.state.index : 0);
});

history.replaceState({ index: 0 }, "", "#q1");
showQuestion(0);

backBtn.addEventListener("click", () => history.back());

function showError(message) {
  statusEl.textContent = message;
  statusEl.classList.add("status-message--error");
}

function clearStatus() {
  statusEl.textContent = "";
  statusEl.classList.remove("status-message--error");
}

// --- Validation happens per question, right when the user tries to leave it ---
function validate(index) {
  switch (index) {
    case 0:
      return document.getElementById("q-name").value.trim()
        ? null : "Let us know what to call you.";
    case 1:
      return document.querySelector('input[name="gender"]:checked')
        ? null : "Pick one.";
    case 2: {
      const v = Number(document.getElementById("q-age").value);
      return v >= 13 && v <= 100 ? null : "Enter an age between 13 and 100.";
    }
    case 3:
      return document.getElementById("q-height").value
        ? null : "Enter your height.";
    case 4:
      return document.getElementById("q-weight-current").value
        ? null : "Enter your current weight.";
    case 5:
      return null; // skippable — see the Skip button, not required here
    case 6:
      return document.querySelector('input[name="goal"]:checked')
        ? null : "Pick one.";
    case 7:
      return document.querySelector('input[name="focus_area"]:checked')
        ? null : "Pick one.";
    case 8:
      return document.querySelector('input[name="fitness_level"]:checked')
        ? null : "Pick one.";
    case 9:
      return document.querySelector('input[name="activity_level"]:checked')
        ? null : "Pick one.";
    case 10:
      return document.querySelectorAll('input[name="limitations"]:checked').length > 0
        ? null : 'Pick at least one, or "None of these."';
    case 11:
      return document.querySelector('input[name="training_days"]:checked')
        ? null : "Pick one.";
    case 12: {
      const wanted = Number(document.querySelector('input[name="training_days"]:checked').value);
      const picked = document.querySelectorAll('input[name="training_weekdays"]:checked').length;
      return picked === wanted
        ? null
        : `Select exactly ${wanted} day${wanted === 1 ? "" : "s"} — you picked ${picked}.`;
    }
    default:
      return null;
  }
}

function tryAdvance(index) {
  const error = validate(index);
  if (error) {
    showError(error);
    return;
  }
  if (index === TOTAL_QUESTIONS - 1) {
    finish();
    return;
  }
  goTo(index + 1);
}

document.querySelectorAll("[data-continue]").forEach((btn) => {
  btn.addEventListener("click", () => {
    tryAdvance(Number(btn.closest(".q-question").dataset.index));
  });
});

document.querySelectorAll("[data-skip]").forEach((btn) => {
  btn.addEventListener("click", () => {
    goTo(Number(btn.closest(".q-question").dataset.index) + 1);
  });
});

// Text/number questions need an explicit Continue per the PRD, but Enter
// should do the same thing as clicking it — that's just a convenience, not
// a second way to advance.
document.querySelectorAll('.q-question input[type="text"], .q-question input[type="number"]')
  .forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const btn = input.closest(".q-question").querySelector("[data-continue]");
      if (btn) btn.click();
    });
  });

// Single-choice questions advance automatically after a short beat, so the
// user doesn't have to also tap Continue for a decision they've already made.
const AUTO_ADVANCE_GROUPS = [
  "gender", "goal", "focus_area", "fitness_level", "activity_level", "training_days",
];
AUTO_ADVANCE_GROUPS.forEach((name) => {
  document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
    radio.addEventListener("change", () => {
      const index = Number(radio.closest(".q-question").dataset.index);
      setTimeout(() => tryAdvance(index), 350);
    });
  });
});

// "None of these" is mutually exclusive with every other limitation.
const limitationCheckboxes = document.querySelectorAll('input[name="limitations"]');
const noneCheckbox = document.getElementById("q-limitations-none");
limitationCheckboxes.forEach((cb) => {
  cb.addEventListener("change", () => {
    if (!cb.checked) return;
    if (cb === noneCheckbox) {
      limitationCheckboxes.forEach((other) => {
        if (other !== noneCheckbox) other.checked = false;
      });
    } else {
      noneCheckbox.checked = false;
    }
  });
});

// Which-days question's count is locked to whatever day count was picked
// two questions earlier — the hint text is refreshed each time this
// question becomes active (see showQuestion above) in case the user went
// back and changed it.
function refreshWeekdaysHint() {
  const selected = document.querySelector('input[name="training_days"]:checked');
  const hint = document.getElementById("q-weekdays-hint");
  if (selected) {
    hint.textContent = `Pick exactly ${selected.value} days.`;
  }
}

// --- Done: build the profile, match a split, save both, move on ---
async function finish() {
  clearStatus();
  statusEl.textContent = "Building your plan…";

  const profile = {
    name: document.getElementById("q-name").value.trim(),
    gender: document.querySelector('input[name="gender"]:checked').value,
    age: document.getElementById("q-age").value,
    height: document.getElementById("q-height").value,
    weight_current: document.getElementById("q-weight-current").value,
    weight_target: document.getElementById("q-weight-target").value || null,
    goal: document.querySelector('input[name="goal"]:checked').value,
    focus_area: document.querySelector('input[name="focus_area"]:checked').value,
    fitness_level: document.querySelector('input[name="fitness_level"]:checked').value,
    activity_level: document.querySelector('input[name="activity_level"]:checked').value,
    limitations: Array.from(document.querySelectorAll('input[name="limitations"]:checked')).map((cb) => cb.value),
    training_days_per_week: document.querySelector('input[name="training_days"]:checked').value,
    training_weekdays: Array.from(document.querySelectorAll('input[name="training_weekdays"]:checked')).map((cb) => cb.value),
    created_at: new Date().toISOString(),
  };

  try {
    const data = await Rana.data.load();
    const splitId = Rana.plan.matchSplit(profile, data.splits);
    const splitWorkouts = data.workoutsBySplit.get(splitId) || [];
    const weekdayMap = Rana.plan.buildWeekdayMap(splitWorkouts, profile.training_weekdays);

    const plan = {
      split_id: splitId,
      training_weekdays: profile.training_weekdays,
      weekday_map: weekdayMap,
      start_date: null, // set on the results screen, when the user locks in
      status: "draft",
    };

    Rana.storage.saveProfile(profile);
    Rana.storage.savePlan(plan);

    window.location.href = "results.html";
  } catch (err) {
    console.error(err);
    showError("Couldn't build your plan — if you opened this file directly, run a local server first (see CLAUDE.md).");
  }
}
