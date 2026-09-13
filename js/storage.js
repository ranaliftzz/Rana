// The dashboard's one and only door to persistence. Nothing else in
// dashboard.html/dashboard.js touches localStorage — everything the
// dashboard needs comes back from getDashboardState() below.
//
// Note on scope: the rest of the app (questionnaire, results, session
// screens) still uses the original /storage.js at the project root, and
// that file still calls localStorage directly — it's untouched this
// session on purpose (out of scope). This file reads the SAME
// localStorage keys that root storage.js writes, so real data from a
// completed questionnaire shows up here too, not just the fixture.
//
// getDashboardState() also leans on the existing data.js / plan.js /
// game.js modules (loaded as separate <script> tags in dashboard.html) for
// the exercise-library lookups and stat/XP/schedule math — this file
// doesn't reimplement any of that, it only owns the localStorage read and
// assembles the final shape the dashboard renders.

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
      console.warn(`Rana.storage: couldn't read ${key}.`, e);
      return fallback;
    }
  }

  // Matches the PRD's results-screen mockup numbers (section 9) and the
  // dashboard mockup's own "Day 1 — nothing logged" toggle state, so the
  // two design references stay consistent with each other.
  const FIXTURE = {
    name: "RANA",
    tier: "DORMANT",
    level: 1,
    xp: 0,
    xpNeed: 80,
    recovery: null,
    consistencyDays: 0,
    sessionsLogged: 0,
    nextTier: "Awakened · LV 5",
    weekNumber: 1,
    stats: [
      { key: "STR", current: 12, target: 31 },
      { key: "AGI", current: 9, target: 24 },
      { key: "VIT", current: 15, target: 38 },
      { key: "INT", current: 5, target: 40 },
    ],
    today: {
      isRestDay: false,
      dayName: "Legs",
      focusMuscles: "Quadriceps · Hamstrings · Glutes · Calves",
      slotCount: 6,
      workingSets: 20,
      estMinutes: 75,
      statYield: ["STR", "VIT"],
    },
    week: [
      { weekday: "Mon", state: "rest", label: "" },
      { weekday: "Tue", state: "today", label: "LEGS" },
      { weekday: "Wed", state: "rest", label: "" },
      { weekday: "Thu", state: "planned", label: "PUSH" },
      { weekday: "Fri", state: "planned", label: "PULL" },
      { weekday: "Sat", state: "rest", label: "" },
      { weekday: "Sun", state: "rest", label: "" },
    ],
  };

  function titleCase(word) {
    return word.charAt(0) + word.slice(1).toLowerCase();
  }

  // A short caption for the microcycle strip ("Push Day A (Chest Focus)"
  // -> "PUSH"). The real workout names are longer than the mockup's
  // one-word examples, so this is a first-pass abbreviation, not an
  // authored short name — 4 letters (not more) specifically to avoid
  // truncations that accidentally read as a real word, e.g. "Shoulders"
  // at 6 chars becomes "SHOULD", which looks like a typo, not a label.
  // Still worth an authored short-name field per split eventually.
  function shortLabel(dayName) {
    const firstWord = (dayName || "").split(/[^A-Za-z]+/)[0] || "";
    return firstWord.slice(0, 4).toUpperCase();
  }

  async function computeRealState(profile, plan) {
    const data = await Rana.data.load();
    const allLoggedSets = read(KEYS.loggedSets, []);
    const sessionFeedback = read(KEYS.sessionFeedback, {});
    const slotsBySlotId = new Map(data.slots.map((s) => [s.slot_id, s]));

    const xp = Rana.game.totalXp(allLoggedSets, slotsBySlotId);
    const level = Rana.game.levelForXp(xp);
    const tier = Rana.game.tierForLevel(level);
    const xpNeed = Rana.game.xpForLevel(level + 1);

    const baseline = Rana.game.computeBaselineStats(profile);
    const projected = Rana.game.computeProjectedStats(baseline, profile);
    const points = Rana.game.computeStatPoints(allLoggedSets, data.exerciseByKey);
    const stats = ["STR", "AGI", "VIT", "INT"].map((key) => ({
      key,
      current: Rana.game.statValue(points[key], baseline[key]),
      target: projected[key],
    }));

    const recovery = Rana.game.computeRecovery(allLoggedSets, plan, sessionFeedback);

    const tierIndex = Rana.game.TIERS.findIndex((t) => t.name === tier);
    const nextTierDef = Rana.game.TIERS[tierIndex + 1];
    const nextTier = nextTierDef
      ? `${titleCase(nextTierDef.name)} · LV ${nextTierDef.minLevel}`
      : "Max tier reached";

    const startDate = new Date(plan.start_date + "T00:00:00");
    const now = new Date();
    const dayDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.max(1, Math.floor(dayDiff / 7) + 1);

    // --- Today ---
    const todayStr = Rana.plan.todayStr();
    const loggedToday = allLoggedSets.filter((s) => s.date === todayStr);
    const todaySession = Rana.plan.getSessionForDate(todayStr, plan, data, loggedToday);

    let today;
    if (todaySession.isRestDay) {
      today = { isRestDay: true };
    } else {
      const slots = todaySession.slots;
      const primaryExercises = slots
        .map((slot) => {
          const opt = (data.optionsBySlot.get(slot.slot_id) || []).find((o) => o.option_rank === 1);
          return opt ? data.exerciseByKey.get(opt.exercise_key) : null;
        })
        .filter(Boolean);

      const muscleGroups = [...new Set(primaryExercises.map((e) => e.muscle_group))];
      const workingSets = slots.reduce((sum, s) => sum + s.working_sets, 0);
      const hasCompound = primaryExercises.some((e) => e.is_compound);
      const hasUnilateral = primaryExercises.some((e) => e.is_unilateral);

      const statYield = ["VIT"]; // every completed session yields VIT (PRD 7.1)
      if (hasCompound) statYield.unshift("STR");
      if (hasUnilateral) statYield.push("AGI");

      today = {
        isRestDay: false,
        dayName: todaySession.workout.day_name,
        focusMuscles: muscleGroups.join(" · "),
        slotCount: slots.length,
        workingSets,
        estMinutes: todaySession.workout.est_session_minutes,
        statYield,
        completed: todaySession.status === "completed",
      };
    }

    // --- Week strip: Mon-Sun containing today ---
    const dowMonFirst = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dowMonFirst);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = Rana.plan.toDateStr(d);
      const loggedForDay = allLoggedSets.filter((s) => s.date === dateStr);
      const session = Rana.plan.getSessionForDate(dateStr, plan, data, loggedForDay);

      let state;
      if (session.isRestDay) state = "rest";
      else if (session.status === "completed") state = "done";
      else if (session.status === "today") state = "today";
      else if (session.status === "missed") state = "missed";
      else state = "planned"; // upcoming, or a training weekday before plan.start_date

      week.push({
        weekday: Rana.plan.WEEKDAY_ORDER[i],
        state,
        label: session.isRestDay ? "" : shortLabel(session.workout.day_name),
      });
    }

    // --- Consistency streak: consecutive days back from today where a
    // rest day auto-passes and a training day must have been completed,
    // stopping at the first uncompleted training day or the plan's own
    // start_date. First-pass definition, not from the PRD — flag for review.
    let consistencyDays = 0;
    for (let i = 1; i <= 90; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = Rana.plan.toDateStr(d);
      if (dateStr < plan.start_date) break;
      const loggedForDay = allLoggedSets.filter((s) => s.date === dateStr);
      const session = Rana.plan.getSessionForDate(dateStr, plan, data, loggedForDay);
      if (session.isRestDay || session.status === "completed") {
        consistencyDays++;
      } else {
        break;
      }
    }

    const sessionsLogged = new Set(allLoggedSets.map((s) => s.date)).size;

    return {
      name: profile.name,
      tier,
      level,
      xp,
      xpNeed,
      recovery,
      consistencyDays,
      sessionsLogged,
      nextTier,
      weekNumber,
      stats,
      today,
      week,
    };
  }

  async function getDashboardState() {
    const profile = read(KEYS.profile, null);
    const plan = read(KEYS.plan, null);

    if (!profile || !plan || plan.status !== "active") {
      console.warn(
        "Rana.storage.getDashboardState: no active profile/plan in localStorage — " +
        "showing the day-1 fixture instead of real data. Complete the questionnaire " +
        "(onboarding.html) through the results screen's lock-in to wire this up."
      );
      return FIXTURE;
    }

    return computeRealState(profile, plan);
  }

  return { getDashboardState };
})();
