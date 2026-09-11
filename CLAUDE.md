# Rana — Fitness Coaching App

**v1 PRD:** `rana-prd-v1-910` — approved 2026-09-11, supersedes the sections below where noted. See especially the decision log (§2) and open questions (§13).

## What this is
A web app (not native mobile) that gives college students a structured workout plan based on their goals and available equipment. Built by a fitness expert who is new to coding — I am learning as we build, so favor clear, simple code over clever code, and explain non-obvious choices in comments or in your responses.

## Current status
_Last updated: 2026-09-03 (onboarding → account creation → dashboard wired up)_
- Toolkit is set up (VS Code, terminal basics).
- `index.html` exists (placeholder "hello world" page, now with proper `<meta charset>`/viewport tags and linked to `styles.css`).
- Three screens now exist and are connected in one direction: `onboarding.html` → `account-creation.html` → `dashboard.html`, navigated with plain `window.location.href` (no framework router). There is no back navigation from the dashboard — this flow is one-directional for now.
- `onboarding.html` is built and interactive. Contains all required fields: name, height, weight, goal (radio group, 4 placeholder options — not final, see below), equipment access (radio group: dorm / rec center / full gym), days-per-week (`<select>`, 2–6), and split options grouped by day count (`.split-group[data-days="N"]` divs). `onboarding.js` filters these groups to show only the one matching the selected day count, and clears a split selection if its group is hidden.
- `onboarding.js` handles split filtering (above) and the Continue button: prevents the default page-reload submit, validates required fields, shows an inline confirmation/error message (`#onboarding-status` in the HTML, `.status-message` in CSS), and — on success — navigates to `account-creation.html`. Answers are still only `console.log`ged, not saved or passed forward — that's roadmap step 5 (localStorage).
- Goal handling in the JS is intentionally generic — it reads whichever `goal` radio is checked via `FormData`, with no hardcoded count or list of values, so the placeholder 4 goals can change without touching `onboarding.js`.
- `account-creation.html` + `account-creation.js` are built. Email + masked password field, Continue button. Validation: both fields non-empty, email checked against a deliberately loose "shape" regex (not RFC-strict — see comment in the JS). **This screen is intentionally non-functional**: no auth service, no backend call, no user record is created, and the password is never stored or logged. Continue advances to `dashboard.html` regardless of what was actually typed, as long as basic validation passes. To be upgraded into a real signup once the data layer is built.
- `dashboard.html` + `dashboard.js` are built, **placeholder-level with hardcoded data** (no data layer, no state, no persistence). Three sections: header (live date via `Date`/`toLocaleDateString`, hardcoded greeting name), today's workout card (day type + Start button, full prominence, minimal by design), and a 7-day weekly strip (`completed` / `today` / `upcoming` / `rest` states, rest days affirmatively marked, never a blank cell). The Start button is a real, full-strength button that is currently inert — there's no workout detail screen yet to send it to; the one line to change is commented in `dashboard.js`. A temporary `#demo-toggle` button lets both today-card states (training/rest) be previewed without editing code — it's marked `data-demo-only` and should be deleted once the dashboard reads a real plan.
- `styles.css` is built — single shared stylesheet, mobile-first, plain CSS (no framework). Styles `index.html`, `onboarding.html`, `account-creation.html` (reuses onboarding's `.onboarding`/`.field`/`.btn-continue`/`.status-message` classes), and `dashboard.html` (new `.dashboard`, `.today-card`, `.week-strip` sections).
- Git repo initialized and pushed to GitHub (`github.com/bhaynes215/Rana`, remote `origin`, branch `main`).
- No data storage, no deployment yet.
- **2026-09-11: v1 PRD approved (`rana-prd-v1-910`).** It supersedes several assumptions above and below: equipment tiers are cut from the product entirely, onboarding is being rebuilt as a one-question-per-screen questionnaire (not extended incrementally), a new Results/projection screen is added before account creation, a full stat/XP/tier game layer is added, and exercise references move to a keyed library. See "Product scope — v1" below for the reconciled picture.
- **2026-09-11: Exercise library repair done (PRD §4).** `scripts/build_library.py` reads `workout-data/workout_splits_database.xlsx`, merges the original 56 `exercise_library` rows with 43 newly authored entries and 8 confirmed alias resolutions (naming drift, e.g. "Hack Squat" → the existing `hack_squat` entry — not new exercises), and exports `data/exercises.json` (99 keyed entries), `data/splits.json`, `data/workouts.json`, and `data/slots.json` (193 slots / 579 slot_options — each old `exercises_master` row became one slot with its primary + 2 alternatives as ranked `slot_option`s). `scripts/validate_library.py` is the standalone, dependency-free check the PRD asked for — it confirms every `slot_option.exercise_key` resolves against `exercises.json` and fails loudly (non-zero exit, lists every dangling reference) otherwise; not yet wired into a pre-commit hook or CI, just runnable on demand. **The 43 new entries are a first draft** — drafted with standard exercise-science classifications matching the existing library's voice, but not yet reviewed by the fitness expert (see `scripts/build_library.py`'s `NEW_ENTRIES`, or `data/exercises.json`).

### Next pass
The PRD's build order (§3) is now the plan, replacing the old roadmap steps 5–7. Library repair (above) is done — next:
1. **Storage layer** — `storage.js` on `localStorage`, one module, no screen touches `localStorage` directly. Comes before any screen work; onboarding currently discards its answers.
2. Questionnaire rebuild (one-question-per-screen).
3. Results/projection screen (new — the emotional centerpiece).
4. Dashboard rebuild against real plan data.
5. Session detail screen (new).
6. Active session / logging screen (new).
7. Session complete screen (new — carries the level-up moment).
8. Account creation restyle (stays functionally inert).

## Locked design decisions
These were deliberate calls made while building the onboarding → account creation → dashboard flow — don't revisit them without a reason.
1. **Rest days are prescribed and non-overridable.** The dashboard's rest-day card has no start affordance at all (not even a disabled one), and rest days are always shown with an explicit "Rest" marker in the weekly strip rather than an empty cell. There is no "train anyway" path.
2. **Today's workout card is minimal by design.** It shows only the day type and a start affordance — no exercise list, no movement-pattern slots. That detail belongs on the (not-yet-built) workout detail screen.
3. **Dashboard → session detail → active session is a deliberate three-way split.** Browsing today's session must not start it. Looking ahead at what's planned and committing to logging sets are different intents and will stay on different screens. (Reinforced, not contradicted, by the PRD's screen inventory — session detail, active session, and session complete are three separate screens.)
4. **Equipment access is removed from the product, not just the questionnaire** (PRD D1). The plan matrix collapses from 4 goals × 3 equipment tiers to 4 goal templates. This is a reversal of the original scope, which called equipment tier "the key differentiator, don't drop it" — the PRD's own cost callout (§2.1) says v1 now assumes full-gym access, and a dorm-gym user can't run these plans. Equipment may return later as a profile setting, not an onboarding question.
5. **No Google Calendar in v1**, but the fixed-weekly-schedule rule stands unchanged: a missed day is marked "missed," never silently rescheduled. The data model must not make Calendar hard to add later.
6. **Exercise references use `exercise_key`** (stable slug), never free-text names. Done — `data/exercises.json` is now the keyed source of truth (see "Current status").
7. **Calorie/macro targets are display-only.** Shown once on the results screen as part of the projection — no logging, no daily tracking, no nutrition screen. Safety guardrails apply: calorie floor (1,500 kcal men / 1,200 kcal women, clamp don't compute below), rate cap (~1% bodyweight/week, extend timeline rather than raise deficit).
8. **Stats never decrease; XP rewards adherence, not tonnage.** A completed prescribed set is worth the same XP on a deload week as a heavy week — the game layer must never punish someone for correctly following its own prescription.
9. **Original naming throughout.** The user's own name (from the questionnaire) is the character name. No borrowed character names, rank ladders, or system dialogue. Stoic quotes must use public-domain translations (e.g. Marcus Aurelius via George Long, 1862) — not modern copyrighted translations.

## Build philosophy for this project
- We are deliberately going slow and building understanding, not just shipping fast. Prefer vanilla HTML/CSS/JS over frameworks for now — no React, no build tooling — until the fundamentals are solid.
- Static structure first, interactivity later, storage later, deployment later. Don't jump ahead to logic or persistence unless asked.
- Explain what new code does in plain language when introducing a new concept (e.g. first time using `localStorage`, first `fetch` call, first loop).
- Once reference data (`data/exercises.json`, `data/splits.json`, etc.) is loaded via `fetch` at startup, double-clicking the HTML file stops working — browsers block `fetch` against `file://`. From that point, testing needs a local server: `python3 -m http.server` from the project folder, then visit `localhost:8000`.

## Product scope — v1
**Not in v1:** AI-generated plans, Google Calendar, nutrition logging, video, cardio programming, native app, social/leaderboard features, **equipment tiers**, real authentication, cross-device sync, notifications, college-specific personalization. These are deferred on purpose — don't suggest adding them. (Equipment tiers moved into this list per PRD D1 — see locked decision #4 above; this is a reversal of the original scope.)

**Flow:** Onboarding questionnaire → results/projection screen → account creation → home dashboard.
Questionnaire comes *before* signup, so the user sees their plan before committing to an account. The results screen (new in the PRD) is what actually delivers on that — the questionnaire alone doesn't show a plan.

**Onboarding captures** (PRD §8, 13 questions, one per screen): name, gender, age, height, current weight, target weight (skippable), primary goal, focus area, fitness level, activity level outside the gym, limitations (knee/shoulder/lower back/wrist — filters exercise options), training days/week (starts at 3, not 2 — the lowest split is a 3-day full body), and which specific weekdays. Equipment access is gone (see locked decision #4). Training days and split are still coupled the way rest days and split were before.

**Data model** (keep prescription and record separate — this is intentional, not to be merged; full schema in PRD §5):
- `exercise` — each exercise defined once, keyed by stable `exercise_key`
- `split` / `workout_day` — a split's training days
- `slot` / `slot_option` — replaces flat plan-template exercise rows. A slot is a movement-pattern requirement (e.g. "pulling movement"); `slot_option` lists 2–3 exercises that satisfy it, ranked primary/alternative. This is what makes exercise-swapping actually work.
- `profile` / `plan` — the user's questionnaire answers and their assigned split/training weekdays/start date
- `scheduled_session` — a plan's session targeted onto a specific real calendar date
- `logged_set` — one record per set actually performed, referencing the `exercise_key` actually used (may differ from the slot's primary if the user swapped)
- `session_feedback` — one-tap difficulty rating per session, feeds Recovery

**Plan structure:** One continuous plan (not week-by-week). It holds the split, training days, and slot skeletons. Sessions generate onto real calendar dates; a 7-day view is just a window into that. A missed day is marked "missed," never silently rescheduled onto another day — this is a fixed weekly schedule (Monday is always push, etc.), not an adaptive queue.

A training day is a set of movement-pattern slots, compound movements first. Each slot offers a few exercise options (e.g. "pulling movement" → pull-ups or lat pulldowns), so the user has a fallback if equipment is busy — the framing is "the rack is taken," not "you don't own this equipment." Working weights are tracked per specific `exercise_key`, underneath the slot, so swapping to a dumbbell variant doesn't inherit the barbell version's loads.

**v1 plan generation is a lookup, not AI:** goal → one of 4 hand-written templates (equipment tiers removed the other axis — see locked decision #4). Days/week adjusts how many of that template's sessions appear per week. **Open question (PRD §13.2):** focus area (4 options) needs a decision during build — either it selects A/B day variants within a split, or it's advisory-only and shown back to the user without driving selection. Don't let it silently do nothing.

**Calibration → progression:** Weeks 1–3, the structure is prescribed but load is up to the user to find (no starting weights assumed). Graduation out of calibration happens per movement pattern (roughly 3 logged sessions per pattern), not all at once globally. After graduation: simple rule-based linear progression (e.g. add weight when reps/sets are hit). **Open question (PRD §13.3):** confirm this still ships in v1 before building INT (below) — it's the only mechanic that makes INT move early.

**Game layer (new in v1, PRD §7):** Four stats — STR, AGI, VIT, INT — rise automatically from logged work (no spendable points, no `[+]` buttons). Each is derived from a distinct real training quality (e.g. STR from heavy compound sets, INT from adherence to the plan as prescribed) and grows sub-linearly so early progress feels fast. XP rewards adherence, not tonnage, and drives levels and six named tiers (DORMANT → SOVEREIGN). A Recovery meter shows `—` rather than a fabricated number when there's no data yet. Full formulas are in the PRD — don't duplicate them here, read §7 before implementing.

**Visual design (new in v1, PRD §10):** A dark "system HUD" identity — deep black/neon cyan, Chakra Petch for display type, zero border-radius (notched panels via `clip-path` instead), segmented (not gradient) stat bars, glow via `box-shadow` never blur. Full token list and rationale in PRD §10 — read it before styling new screens rather than guessing at the palette.

## Screens (in build order per PRD §3)
1. **Questionnaire** — currently built as a single scrolling form (`onboarding.html`); being rebuilt as one-question-per-screen (PRD §8): progress indicator, back navigation that preserves answers, browser back steps back one question (`history.pushState` per question), single-choice questions auto-advance, text/number entry needs explicit continue, validation per question not at the end.
2. **Results / projection** — does not exist yet; new in the PRD, and the emotional centerpiece (§9): a sequenced reveal (current vs. projected stats, plan assignment, calorie/macro display) ending in "are you ready to lock in."
3. **Account creation** — ✅ built, intentionally non-functional (see Current status). PRD target: restyle only, stays inert.
4. **Dashboard (home)** — ✅ built, placeholder-level with hardcoded data; PRD target: rebuild against real plan data.
5. **Session detail** — does not exist yet; list of movement-pattern slots for that day, with set counts (what the dashboard's Start button leads to).
6. **Active session / logging** — does not exist yet; actual set logging with weights/reps and exercise swapping (what starting a session from detail leads to).
7. **Session complete** — does not exist yet; carries the level-up moment (stat/XP movement shown here).

## Roadmap (check current status against this before proposing a plan)
1. Toolkit setup — ✅ done
2. Build one static screen — ✅ done (onboarding.html + styles.css built 2026-09-01; structure only, no JS); extended 2026-09-03 with two more static/placeholder screens, account-creation.html and dashboard.html
3. Git & GitHub basics — ✅ done (repo initialized, pushed to GitHub at bhaynes215/Rana, 2026-09-01)
4. Add interactivity (JavaScript) — ✅ done (onboarding.js: split filtering + Continue validation, 2026-09-01); extended 2026-09-03 with account-creation.js (validation) and dashboard.js (date + demo toggle), plus forward navigation wiring all three screens together

**Steps 5–7 below are superseded by the PRD's build order (§3), approved 2026-09-11 — see "Next pass" above for the current sequence:**
5. ~~Exercise library repair~~ ✅ done (2026-09-11) → storage layer (`localStorage`) → questionnaire rebuild → results screen → dashboard rebuild → session detail → active session → session complete → account creation restyle
6. Later: deploy (free hosting), migrate storage to Supabase, equipment access returns as a profile setting (not onboarding), Google Calendar

## Open questions (PRD §13 — unresolved, don't guess at answers)
1. **Under-18 users** — in scope or gated out? Affects the calorie display and account-screen obligations. Needs an answer before the results screen is considered done.
2. **Focus area's actual function** (§8 Q8) — selects A/B split variants, or advisory-only? See "Product scope — v1" above.
3. **Calibration graduation and INT** — confirm the per-movement-pattern graduation mechanic stays in v1, since it's the only thing that makes INT move early.
4. **Session length** — not currently asked, but splits run 60–85 minutes and 85 minutes is a hard sell between classes. Worth a 14th question, or accept that goal selection implies it.

## How to work with me
- I'm the fitness expert, not the engineer — defer to me on training/programming questions, but push back if a technical choice I suggest would cause real problems (e.g. data modeling issues, security, unmaintainable structure).
- I'm new to app development — walk me through *why*, not just *what*, especially for new concepts.
- Before making changes, use plan mode: read existing files first, propose the plan, wait for approval.
