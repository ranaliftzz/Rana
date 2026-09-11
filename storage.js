// The one module allowed to touch localStorage directly (PRD section 6).
// Every screen goes through Rana.storage.* instead of calling
// localStorage.getItem/setItem itself — so when this moves to a real
// database later, this is the only file that has to change.
//
// What's saved here is the small, ever-changing stuff: the user's answers,
// the plan they were assigned, and every set they've actually logged.
// Reference data (exercises, splits) never comes through here — see data.js.
//
// Known limits (also called out in CLAUDE.md): localStorage is per-browser,
// per-device, holds ~5MB, and is wiped if the user clears site data. Fine
// for an MVP, but nothing here should be presented as durably "saved."

window.Rana = window.Rana || {};

Rana.storage = (() => {
  const KEYS = {
    profile: "rana:v1:profile",
    plan: "rana:v1:plan",
    loggedSets: "rana:v1:logged_sets",
    sessionFeedback: "rana:v1:session_feedback",
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn(`Rana.storage: couldn't read ${key}, using fallback.`, e);
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // --- Profile (the questionnaire's answers) ---
  function getProfile() {
    return read(KEYS.profile, null);
  }
  function saveProfile(profile) {
    write(KEYS.profile, profile);
  }

  // --- Plan (which split was assigned, and which weekdays are training days) ---
  function getPlan() {
    return read(KEYS.plan, null);
  }
  function savePlan(plan) {
    write(KEYS.plan, plan);
  }

  // --- Logged sets: one record per set actually performed ---
  // Stored as a flat array; date is a "YYYY-MM-DD" string so it sorts and
  // compares as plain text without needing a date-parsing library.
  function getAllLoggedSets() {
    return read(KEYS.loggedSets, []);
  }
  function getLoggedSetsForDate(dateStr) {
    return getAllLoggedSets().filter((s) => s.date === dateStr);
  }
  function addLoggedSet(entry) {
    const all = getAllLoggedSets();
    all.push(entry);
    write(KEYS.loggedSets, all);
    return entry;
  }

  // --- Session feedback: one tap, once, per date ---
  function getSessionFeedback(dateStr) {
    const all = read(KEYS.sessionFeedback, {});
    return all[dateStr] ?? null;
  }
  function saveSessionFeedback(dateStr, difficulty) {
    const all = read(KEYS.sessionFeedback, {});
    all[dateStr] = difficulty;
    write(KEYS.sessionFeedback, all);
  }

  return {
    getProfile,
    saveProfile,
    getPlan,
    savePlan,
    getAllLoggedSets,
    getLoggedSetsForDate,
    addLoggedSet,
    getSessionFeedback,
    saveSessionFeedback,
  };
})();
