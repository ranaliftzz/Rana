// Plan matching + the fixed weekly schedule.
//
// v1 plan generation is a lookup, not AI (PRD section 8): goal, fitness
// level and training days pick the best-fitting split out of the ones
// already authored in data/splits.json. Equipment is not an input (PRD D1).
//
// A note on "goal -> 4 templates": the PRD's decision log describes the
// target model as 4 goal templates, but the actual workbook has 7 real
// splits that already vary by days/week and experience level too (e.g. a
// 3-day beginner full-body split and a 6-day advanced PPL split are both
// "Hypertrophy"-flavored but very different programs). Picking the best of
// the 7 real splits by goal + days + experience serves the user better than
// forcing a 4-way choice the authored content doesn't actually have, and it
// doesn't reintroduce equipment as an axis — just uses the days/experience
// axes that were already there. Worth flagging to the fitness expert.
//
// Fixed weekly schedule: PRD/CLAUDE.md are explicit that a missed day is
// never silently rescheduled — Monday is always push, every week, forever.
// So instead of storing which workout happens on which date, we store which
// workout happens on which WEEKDAY (Mon/Tue/etc). The split's ordered
// workout days are assigned to the user's chosen training weekdays in order
// once, at plan-assignment time, and that mapping never changes.

window.Rana = window.Rana || {};

Rana.plan = (() => {
  const GOAL_TO_PRIMARY_GOAL = {
    "build-muscle": "Hypertrophy",
    "lose-fat": "Hypertrophy", // preserve muscle in a deficit — same structural need as hypertrophy
    "get-stronger": "Strength",
    "general-fitness": "General Fitness",
  };

  const FITNESS_LEVEL_TO_EXPERIENCE = {
    "never-trained": "Beginner",
    "returning": "Beginner",
    "consistently": "Intermediate",
    // Note: no split matches "Advanced" from a v1 questionnaire answer, since
    // none of the 3 fitness-level options self-report as advanced. The
    // Arnold split (Advanced-only) is in the library but currently
    // unreachable by the matcher — fine for v1, worth a future "advanced"
    // self-report option if that split should ever get used.
  };

  const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function scoreSplit(split, profile) {
    const wantGoal = GOAL_TO_PRIMARY_GOAL[profile.goal];
    const wantExperience = FITNESS_LEVEL_TO_EXPERIENCE[profile.fitness_level];
    const wantDays = Number(profile.training_days_per_week);

    let score = 0;
    score += split.primary_goal === wantGoal ? 1000 : 0;
    score -= Math.abs(split.days_per_week - wantDays) * 50;
    score += split.experience_level === wantExperience ? 10 : 0;
    return score;
  }

  // Picks the single best-fitting split for this profile. Returns the
  // split_id (not the full split object) — callers fetch details from
  // Rana.data when they need them, keeping this function free of a
  // dependency on data.js having already loaded.
  function matchSplit(profile, splits) {
    let best = null;
    let bestScore = -Infinity;
    for (const split of splits) {
      const score = scoreSplit(split, profile);
      if (score > bestScore) {
        bestScore = score;
        best = split;
      }
    }
    return best ? best.split_id : null;
  }

  // Assigns the split's workout days to the user's chosen training weekdays,
  // in order, once. E.g. split has [Push, Pull, Legs] and user trains
  // [Mon, Wed, Fri] -> Mon is always Push, Wed always Pull, Fri always Legs.
  function buildWeekdayMap(splitWorkouts, trainingWeekdays) {
    const sortedWeekdays = [...trainingWeekdays].sort(
      (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)
    );
    const map = {};
    sortedWeekdays.forEach((day, i) => {
      map[day] = splitWorkouts[i] ? splitWorkouts[i].workout_id : null;
    });
    return map;
  }

  function weekdayAbbrev(date) {
    return WEEKDAY_ORDER[(date.getDay() + 6) % 7]; // JS getDay(): 0=Sun; rotate so 0=Mon
  }

  function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function todayStr() {
    return toDateStr(new Date());
  }

  // Everything the dashboard/session-detail screens need to know about one
  // calendar date, given the plan and what's actually been logged.
  function getSessionForDate(dateStr, plan, data, loggedSetsForDate) {
    const date = new Date(dateStr + "T00:00:00");
    const weekday = weekdayAbbrev(date);
    const workoutId = plan.weekday_map[weekday];

    if (!workoutId) {
      return { date: dateStr, weekday, isRestDay: true, status: "rest" };
    }

    const workout = data.workoutById.get(workoutId);
    const slots = data.slotsByWorkout.get(workoutId) || [];
    const hasLogged = loggedSetsForDate && loggedSetsForDate.length > 0;

    let status;
    if (dateStr === todayStr()) {
      status = hasLogged ? "completed" : "today";
    } else if (dateStr < todayStr()) {
      // A training weekday before the plan's own start_date was never
      // actually scheduled — marking it "missed" would tell a brand-new
      // user they failed a workout that didn't exist yet. Caught this by
      // actually looking at a fresh dashboard: every weekday earlier in
      // the current calendar week showed up red on day one.
      status = hasLogged ? "completed" : (dateStr < plan.start_date ? "not-started" : "missed");
    } else {
      status = "upcoming";
    }

    return {
      date: dateStr,
      weekday,
      isRestDay: false,
      status,
      workoutId,
      workout,
      slots,
    };
  }

  return {
    GOAL_TO_PRIMARY_GOAL,
    FITNESS_LEVEL_TO_EXPERIENCE,
    WEEKDAY_ORDER,
    matchSplit,
    buildWeekdayMap,
    weekdayAbbrev,
    toDateStr,
    todayStr,
    getSessionForDate,
  };
})();
