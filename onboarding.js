// Onboarding screen interactivity.
// Loaded with the `defer` attribute, which means: wait until the HTML has
// been fully parsed (so every element below already exists), then run this
// script — but don't block the page from rendering while the file downloads.

const daysSelect = document.getElementById("days");
const splitGroups = document.querySelectorAll(".split-group");
const form = document.querySelector("form");
const statusEl = document.getElementById("onboarding-status");

// --- 1. Rest-days <-> split filtering ---
// Show only the split options that match the selected day count, hide the
// rest. Each .split-group has a data-days attribute (set in the HTML) that
// we compare against the <select>'s current value.
function applyDaysFilter() {
  const selectedDays = daysSelect.value;

  splitGroups.forEach((group) => {
    const matches = group.dataset.days === selectedDays;
    group.hidden = !matches;

    // If a group is being hidden and it has a checked split radio inside
    // it, uncheck it. Otherwise that split stays "selected" even though
    // it's invisible and no longer matches the chosen day count.
    if (!matches) {
      const checkedRadio = group.querySelector('input[name="split"]:checked');
      if (checkedRadio) {
        checkedRadio.checked = false;
      }
    }
  });
}

applyDaysFilter();
daysSelect.addEventListener("change", applyDaysFilter);

// --- 2. Continue button ---
form.addEventListener("submit", (event) => {
  // A form submit normally reloads the page (or navigates to whatever the
  // form's `action` points to). There's no backend or next screen to send
  // this to yet, so we stop that default behavior and handle everything
  // ourselves below.
  event.preventDefault();

  // FormData reads every named field out of the form for us — including
  // whichever radio button in a group is currently checked — without us
  // having to look up each input by hand.
  const formData = new FormData(form);

  const name = formData.get("name").trim();
  const goal = formData.get("goal");
  const equipment = formData.get("equipment");
  const split = formData.get("split");

  // Minimal validation: just check that something was picked. This doesn't
  // hardcode which goal, equipment, or split values are valid — it works
  // the same regardless of how many options each group ends up having.
  if (!name || !goal || !equipment || !split) {
    showStatus("Please fill in your name and make a selection for goal, equipment, and split.", true);
    return;
  }

  const answers = {
    name,
    height: formData.get("height"),
    weight: formData.get("weight"),
    goal,
    equipment,
    days: formData.get("days"),
    split,
  };

  console.log("Onboarding answers:", answers);
  showStatus(`Got it, ${name} — next up is account creation.`, false);
});

function showStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle("status-message--error", isError);
}
