# Rana — Fitness Coaching App

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

### Next steps for onboarding screen specifically
- Goal options are still placeholders (build muscle, lose fat, get stronger, general fitness) since CLAUDE.md didn't enumerate exact goal labels — confirm these match the 4 goals used in the plan-template matrix before building plan generation. The JS doesn't assume exactly 4, so changing them later is just an HTML edit.

### Next pass
- Workout detail screen (what the dashboard's Start button will lead to).
- Active session / logging screen (what starting a workout from detail leads to).
- Then: localStorage (roadmap step 5) so onboarding answers, account info, and dashboard state stop being hardcoded/placeholder.

## Locked design decisions
These were deliberate calls made while building the onboarding → account creation → dashboard flow — don't revisit them without a reason.
1. **Rest days are prescribed and non-overridable.** The dashboard's rest-day card has no start affordance at all (not even a disabled one), and rest days are always shown with an explicit "Rest" marker in the weekly strip rather than an empty cell. There is no "train anyway" path.
2. **Today's workout card is minimal by design.** It shows only the day type and a start affordance — no exercise list, no movement-pattern slots. That detail belongs on the (not-yet-built) workout detail screen.
3. **Dashboard → workout detail → active session is a deliberate three-way split.** Browsing today's session must not start it. Looking ahead at what's planned and committing to logging sets are different intents and will stay on different screens.

## Build philosophy for this project
- We are deliberately going slow and building understanding, not just shipping fast. Prefer vanilla HTML/CSS/JS over frameworks for now — no React, no build tooling — until the fundamentals are solid.
- Static structure first, interactivity later, storage later, deployment later. Don't jump ahead to logic or persistence unless asked.
- Explain what new code does in plain language when introducing a new concept (e.g. first time using `localStorage`, first `fetch` call, first loop).

## Product scope — v1
**Not in v1:** AI-generated plans, video, nutrition tracking, cardio programming, native app, college-specific personalization. These are deferred on purpose — don't suggest adding them.

**Flow:** Onboarding questionnaire → account creation → plan generated → home dashboard.
Questionnaire comes *before* signup, so the user sees their plan before committing to an account.

**Onboarding captures:** name, height, weight, goal, equipment access (dorm / rec center / full gym — this is a key differentiator, don't drop it), rest days, and split. Rest days and split are coupled — the split choice should be filtered/limited by how many training days the user picked.

**Data model** (keep prescription and record separate — this is intentional, not to be merged):
- Exercise library — each exercise defined once
- Plan templates — hand-written, matched to goal × equipment (12 total: 4 goals × 3 equipment tiers)
- Scheduled session — a plan's session targeted onto a specific date
- Logged session — one record per set actually performed
- History — derived from logged sessions, feeds progression logic

**Plan structure:** One continuous plan (not week-by-week). It holds the split, training days, and slot skeletons. Sessions generate onto real calendar dates; a 7-day view is just a window into that. A missed day is marked "missed," never silently rescheduled onto another day — this is a fixed weekly schedule (Monday is always push, etc.), not an adaptive queue.

A training day is a set of movement-pattern slots, compound movements first. Each slot offers a few exercise options (e.g. "pulling movement" → pull-ups or lat pulldowns), so the user has a fallback if equipment is busy. Working weights are tracked per specific exercise, underneath the slot.

**v1 plan generation is a lookup, not AI:** goal × equipment → one of 12 hand-written templates. Days/week adjusts how many of that template's sessions appear per week; it is not a 13th axis in the matrix.

**Calibration → progression:** Weeks 1–3, the structure is prescribed but load is up to the user to find (no starting weights assumed). Graduation out of calibration happens per movement pattern (roughly 3 logged sessions per pattern), not all at once globally. After graduation: simple rule-based linear progression (e.g. add weight when reps/sets are hit).

## Screens (in build order)
1. **Onboarding** — ✅ built and interactive; navigates to account creation on Continue.
2. **Account creation** — ✅ built, intentionally non-functional (see Current status); navigates to the dashboard on Continue.
3. **Dashboard (home)** — ✅ built, placeholder-level with hardcoded data. Action-first design: today's workout front and center with a big start button, plus a week strip below. Still first-time-only in behavior (no "every day after" logic yet, since there's no data to distinguish first-time from returning).
4. **Calendar** — 7-day fixed week view, dot states per day: done / missed / rest / today.
5. **Day view** — list of movement-pattern slots for that day, with set counts.
6. **Exercise detail** — combines exercise selection, muscles-worked reference, and set logging on one screen. Reference info (muscles/video placeholder) collapses once the user is mid-workout so it doesn't compete with logging; expanded by default the first time they do a given exercise, collapsed after.

## Roadmap (original sequencing — check current status against this before proposing a plan)
1. Toolkit setup — ✅ done
2. Build one static screen — ✅ done (onboarding.html + styles.css built 2026-09-01; structure only, no JS); extended 2026-09-03 with two more static/placeholder screens, account-creation.html and dashboard.html
3. Git & GitHub basics — ✅ done (repo initialized, pushed to GitHub at bhaynes215/Rana, 2026-09-01)
4. Add interactivity (JavaScript) — ✅ done (onboarding.js: split filtering + Continue validation, 2026-09-01); extended 2026-09-03 with account-creation.js (validation) and dashboard.js (date + demo toggle), plus forward navigation wiring all three screens together
5. Make the app remember things (localStorage first, real database later)
6. Deploy (free hosting)
7. Build the real differentiator: equipment- and time-block-aware programming

## How to work with me
- I'm the fitness expert, not the engineer — defer to me on training/programming questions, but push back if a technical choice I suggest would cause real problems (e.g. data modeling issues, security, unmaintainable structure).
- I'm new to app development — walk me through *why*, not just *what*, especially for new concepts.
- Before making changes, use plan mode: read existing files first, propose the plan, wait for approval.
