// The game layer: stats, XP, levels, tiers, calorie/macro display, recovery.
// Formulas are from PRD rana-prd-v1-910 section 7 where the PRD gives one
// explicitly; where it only describes a formula in words (baseline stats,
// projected stats, recovery), this is a first-pass implementation and
// flagged as such below — worth the fitness expert's review, same as the
// new exercise-library entries.
//
// Design note: nothing about "current stat totals" is stored directly.
// Stat points are always recomputed from the full history of logged sets
// (Rana.storage.getAllLoggedSets()). That's what makes "stats never
// decrease" true by construction — it's a monotonic function of a log that
// only ever grows — instead of a rule someone has to remember to enforce
// every time a stat gets updated.

window.Rana = window.Rana || {};

Rana.game = (() => {
  const TIERS = [
    { name: "DORMANT", minLevel: 1 },
    { name: "AWAKENED", minLevel: 5 },
    { name: "FORGED", minLevel: 12 },
    { name: "RELENTLESS", minLevel: 21 },
    { name: "UNBROKEN", minLevel: 33 },
    { name: "SOVEREIGN", minLevel: 50 },
  ];

  function xpForLevel(n) {
    return Math.round(80 * Math.pow(n, 1.4));
  }

  // Highest level whose XP requirement is met or passed.
  function levelForXp(xp) {
    let level = 1;
    while (xpForLevel(level + 1) <= xp) level++;
    return level;
  }

  function tierForLevel(level) {
    let current = TIERS[0].name;
    for (const t of TIERS) {
      if (level >= t.minLevel) current = t.name;
    }
    return current;
  }

  function statValue(points, baseline) {
    return Math.floor(4 * Math.sqrt(points)) + baseline;
  }

  // --- Baseline (current) stats from the questionnaire, before any logged work ---
  // First-pass formula: a flat starting point, nudged by fitness level and
  // activity level (both self-reported) and by how demanding the assigned
  // goal/split is. Not derived from the PRD's own math (it doesn't give
  // one) — needs fitness-expert sign-off before it's load-bearing.
  function computeBaselineStats(profile) {
    const base = { STR: 8, AGI: 8, VIT: 8, INT: 5 };

    const fitnessBonus = { "never-trained": 0, "returning": 3, "consistently": 7 };
    const bump = fitnessBonus[profile.fitness_level] ?? 0;
    base.STR += bump;
    base.AGI += bump;
    base.VIT += bump;

    const activityBonus = { "mostly-sitting": 0, "moderately-active": 3, "on-feet-all-day": 6 };
    base.VIT += activityBonus[profile.activity_level] ?? 0;

    if (profile.goal === "get-stronger") base.STR += 4;
    if (profile.goal === "build-muscle") base.VIT += 2;

    return base;
  }

  // --- Projected stats after 12 weeks of full adherence to the assigned plan ---
  // Estimates points earned from training_days_per_week * 12 weeks of
  // "average" sessions, then converts through the same statValue() curve.
  // This is a forecast conditional on showing up, and must be labeled as
  // one in the UI (PRD section 7.5) — never presented as a guarantee.
  function computeProjectedStats(baseline, profile) {
    const sessionsOver12Weeks = Number(profile.training_days_per_week) * 12;
    const avgSetsPerSession = 18; // rough average across the workbook's splits

    const points = {
      STR: sessionsOver12Weeks * avgSetsPerSession * 0.35,
      AGI: sessionsOver12Weeks * avgSetsPerSession * 0.25,
      VIT: sessionsOver12Weeks * avgSetsPerSession * 1.0,
      INT: sessionsOver12Weeks * 4, // one INT-relevant award per completed session, not per set
    };

    return {
      STR: statValue(points.STR, baseline.STR),
      AGI: statValue(points.AGI, baseline.AGI),
      VIT: statValue(points.VIT, baseline.VIT),
      INT: statValue(points.INT, baseline.INT),
    };
  }

  // --- Stat points earned from real logged sets ---
  function computeStatPoints(loggedSets, exerciseByKey) {
    const points = { STR: 0, AGI: 0, VIT: 0, INT: 0 };

    for (const set of loggedSets) {
      const ex = exerciseByKey.get(set.exercise_key);
      if (!ex) continue;

      points.VIT += 1; // every completed set counts toward work capacity
      if (["Hip Hinge", "Hip Extension", "Trunk Flexion", "Anti-Extension"].includes(ex.movement_pattern)) {
        points.VIT += 0.5; // posterior-chain / core bonus
      }

      const topsOutAt8OrBelow = /^\s*(\d+)/.test(set.rep_range || "") &&
        Math.max(...(set.rep_range || "").split("-").map(Number)) <= 8;
      if (ex.is_compound && topsOutAt8OrBelow) points.STR += 1.5;

      if (ex.is_unilateral) points.AGI += 1;
      const repsNum = Number(set.reps) || 0;
      if (repsNum >= 12) points.AGI += 1;
    }

    return points;
  }

  // --- Session XP: adherence, not tonnage ---
  // A completed prescribed set is worth the same XP whether it's a heavy
  // week or a deload week (PRD section 7.3) — so this counts completed sets
  // against what was prescribed, never the weight used.
  const XP_PER_COMPLETED_SET = 10;

  function computeSessionXp(slots, loggedSetsForSession) {
    let xp = 0;
    for (const slot of slots) {
      const completed = loggedSetsForSession.filter((s) => s.slot_id === slot.slot_id).length;
      const credited = Math.min(completed, slot.working_sets);
      xp += credited * XP_PER_COMPLETED_SET;
    }
    return xp;
  }

  function totalXp(allLoggedSets, slotsBySlotId) {
    // Group logged sets by (date, slot) "session" and award XP per slot the
    // same way computeSessionXp does, without needing session boundaries
    // tracked separately.
    let xp = 0;
    const bySlot = new Map();
    for (const set of allLoggedSets) {
      const list = bySlot.get(set.slot_id) || [];
      list.push(set);
      bySlot.set(set.slot_id, list);
    }
    bySlot.forEach((sets, slotId) => {
      const slot = slotsBySlotId.get(slotId);
      if (!slot) return;
      xp += Math.min(sets.length, slot.working_sets) * XP_PER_COMPLETED_SET;
    });
    return xp;
  }

  // --- Calorie / macro targets (display-only, PRD D4 + safety guardrails section 11) ---
  function computeCalorieTargets(profile) {
    const weightKg = Number(profile.weight_current) * 0.453592;
    const heightCm = Number(profile.height); // assumed already in cm; see questionnaire note
    const age = Number(profile.age);

    // Mifflin-St Jeor
    let bmr;
    if (profile.gender === "male") {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }

    const activityMultiplier = {
      "mostly-sitting": 1.35,
      "moderately-active": 1.55,
      "on-feet-all-day": 1.75,
    }[profile.activity_level] ?? 1.45;

    let target = bmr * activityMultiplier;

    if (profile.goal === "lose-fat") target -= 500;
    if (profile.goal === "build-muscle") target += 300;

    // Safety guardrail: rate cap. If current -> target weight implies losing
    // faster than ~1% bodyweight/week, we don't have a timeline UI yet to
    // extend, so the honest move for v1 is to soften the deficit itself
    // rather than imply an unsafe rate.
    if (profile.goal === "lose-fat" && profile.weight_target) {
      const weeklyCapLb = Number(profile.weight_current) * 0.01;
      const totalToLoseLb = Number(profile.weight_current) - Number(profile.weight_target);
      if (totalToLoseLb > 0) {
        const impliedWeeklyLossLb = 500 / 3500 * 7; // a 500 kcal/day deficit ≈ 1 lb/week
        if (impliedWeeklyLossLb > weeklyCapLb) {
          target = bmr * activityMultiplier - weeklyCapLb * 500; // scale deficit down to the cap
        }
      }
    }

    // Safety guardrail: calorie floor, never below regardless of the math above.
    const floor = profile.gender === "male" ? 1500 : 1200;
    target = Math.max(Math.round(target), floor);

    const proteinG = Math.round(Number(profile.weight_current) * 0.9); // ~0.9g/lb bodyweight
    const fatG = Math.round((target * 0.25) / 9);
    const remainingKcal = target - proteinG * 4 - fatG * 9;
    const carbsG = Math.max(Math.round(remainingKcal / 4), 0);

    return { calories: target, proteinG, carbsG, fatG, waterCups: 10 };
  }

  // --- Recovery: only ever computed from real data, `—` otherwise (PRD section 7.4) ---
  function computeRecovery(allLoggedSets, plan, sessionFeedbackByDate) {
    if (!allLoggedSets || allLoggedSets.length === 0) return null;

    const dates = [...new Set(allLoggedSets.map((s) => s.date))].sort();
    const lastDate = dates[dates.length - 1];
    const daysSinceLast = Math.round(
      (new Date() - new Date(lastDate + "T00:00:00")) / (1000 * 60 * 60 * 24)
    );

    const feedbackValues = Object.values(sessionFeedbackByDate || {});
    const avgDifficulty = feedbackValues.length
      ? feedbackValues.reduce((a, b) => a + b, 0) / feedbackValues.length
      : 3;

    // Simple 0-100 blend: more days rested nudges recovery up, recent hard
    // sessions nudge it down. First-pass formula, not from the PRD.
    let score = 70 + daysSinceLast * 8 - (avgDifficulty - 3) * 8;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  return {
    TIERS,
    xpForLevel,
    levelForXp,
    tierForLevel,
    statValue,
    computeBaselineStats,
    computeProjectedStats,
    computeStatPoints,
    computeSessionXp,
    totalXp,
    computeCalorieTargets,
    computeRecovery,
    XP_PER_COMPLETED_SET,
  };
})();
