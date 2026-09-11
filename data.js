// Reference data loader.
// The exercise library, splits, workouts and slots are static — they ship
// with the app and never change at runtime, so they live in data/*.json
// (built by scripts/build_library.py) instead of localStorage. This module
// fetches them once and caches the result in memory for the rest of the
// page's life.
//
// Why fetch() needs a server: browsers block fetch() against file:// URLs
// for security reasons, so opening any page that calls Rana.data.load() by
// double-clicking the HTML file will fail silently. Run a local server from
// the project folder instead — `python3 -m http.server` — then visit
// http://localhost:8000.

window.Rana = window.Rana || {};

Rana.data = (() => {
  let cache = null;

  async function load() {
    if (cache) return cache;

    const [exercises, splits, workouts, slotsDoc] = await Promise.all([
      fetch("data/exercises.json").then((r) => r.json()),
      fetch("data/splits.json").then((r) => r.json()),
      fetch("data/workouts.json").then((r) => r.json()),
      fetch("data/slots.json").then((r) => r.json()),
    ]);

    const exerciseByKey = new Map(exercises.map((e) => [e.exercise_key, e]));
    const splitById = new Map(splits.map((s) => [s.split_id, s]));
    const workoutById = new Map(workouts.map((w) => [w.workout_id, w]));

    const workoutsBySplit = new Map();
    workouts.forEach((w) => {
      const list = workoutsBySplit.get(w.split_id) || [];
      list.push(w);
      workoutsBySplit.set(w.split_id, list);
    });
    workoutsBySplit.forEach((list) => list.sort((a, b) => a.day_order - b.day_order));

    const slotsByWorkout = new Map();
    slotsDoc.slots.forEach((s) => {
      const list = slotsByWorkout.get(s.workout_id) || [];
      list.push(s);
      slotsByWorkout.set(s.workout_id, list);
    });
    slotsByWorkout.forEach((list) => list.sort((a, b) => a.slot_order - b.slot_order));

    const optionsBySlot = new Map();
    slotsDoc.slot_options.forEach((o) => {
      const list = optionsBySlot.get(o.slot_id) || [];
      list.push(o);
      optionsBySlot.set(o.slot_id, list);
    });
    optionsBySlot.forEach((list) => list.sort((a, b) => a.option_rank - b.option_rank));

    cache = {
      exercises,
      splits,
      workouts,
      slots: slotsDoc.slots,
      slotOptions: slotsDoc.slot_options,
      exerciseByKey,
      splitById,
      workoutById,
      workoutsBySplit,
      slotsByWorkout,
      optionsBySlot,
    };
    return cache;
  }

  return { load };
})();
