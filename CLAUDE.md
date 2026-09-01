# Rana — Fitness Coaching App

## What this is
A web app (not native mobile) that gives college students a structured workout plan based on their goals and available equipment. Built by a fitness expert who is new to coding — I am learning as we build, so favor clear, simple code over clever code, and explain non-obvious choices in comments or in your responses.

## Current status
_Last updated: 2026-09-01 (onboarding JS interactivity added)_
- Toolkit is set up (VS Code, terminal basics).
- `index.html` exists (placeholder "hello world" page, now with proper `<meta charset>`/viewport tags and linked to `styles.css`).
- `onboarding.html` is built and interactive. Contains all required fields: name, height, weight, goal (radio group, 4 placeholder options — not final, see below), equipment access (radio group: dorm / rec center / full gym), days-per-week (`<select>`, 2–6), and split options grouped by day count (`.split-group[data-days="N"]` divs). `onboarding.js` now filters these groups to show only the one matching the selected day count, and clears a split selection if its group is hidden.
- `onboarding.js` is built — first JS in the project. Handles split filtering (above) and the Continue button: prevents the default page-reload submit, validates required fields, and shows an inline confirmation/error message (`#onboarding-status` in the HTML, `.status-message` in CSS). On success it `console.log`s the collected answers as a placeholder — no navigation or storage yet, since account-creation.html and localStorage are later steps.
- Goal handling in the JS is intentionally generic — it reads whichever `goal` radio is checked via `FormData`, with no hardcoded count or list of values, so the placeholder 4 goals can change without touching `onboarding.js`.
- `styles.css` is built — single shared stylesheet, mobile-first, plain CSS (no framework). Styles `index.html`, `onboarding.html`, and the new status-message states.
- Git repo initialized and pushed to GitHub (`github.com/bhaynes215/Rana`, remote `origin`, branch `main`).
- No data storage, no deployment yet.

### Next steps for onboarding screen specifically
- Goal options are still placeholders (build muscle, lose fat, get stronger, general fitness) since CLAUDE.md didn't enumerate exact goal labels — confirm these match the 4 goals used in the plan-template matrix before building account creation/plan generation. The JS doesn't assume exactly 4, so changing them later is just an HTML edit.
- Continue currently just validates and shows an inline confirmation — no navigation to account creation and no persistence yet (those are roadmap steps 5+ and require account-creation.html, which doesn't exist yet).

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
1. **Onboarding** — the questionnaire above, structure only right now.
2. **Account creation** — comes right after onboarding, before the plan is shown for real use.
3. **Dashboard (home)** — action-first design: today's workout front and center with a big start button, plus a week strip and light stats below. Two states: first-time (just generated a plan) vs. every day after (show today's workout).
4. **Calendar** — 7-day fixed week view, dot states per day: done / missed / rest / today.
5. **Day view** — list of movement-pattern slots for that day, with set counts.
6. **Exercise detail** — combines exercise selection, muscles-worked reference, and set logging on one screen. Reference info (muscles/video placeholder) collapses once the user is mid-workout so it doesn't compete with logging; expanded by default the first time they do a given exercise, collapsed after.

## Roadmap (original sequencing — check current status against this before proposing a plan)
1. Toolkit setup — ✅ done
2. Build one static screen — ✅ done (onboarding.html + styles.css built 2026-09-01; structure only, no JS)
3. Git & GitHub basics — ✅ done (repo initialized, pushed to GitHub at bhaynes215/Rana, 2026-09-01)
4. Add interactivity (JavaScript) — ✅ done (onboarding.js: split filtering + Continue validation, 2026-09-01)
5. Make the app remember things (localStorage first, real database later)
6. Deploy (free hosting)
7. Build the real differentiator: equipment- and time-block-aware programming

## How to work with me
- I'm the fitness expert, not the engineer — defer to me on training/programming questions, but push back if a technical choice I suggest would cause real problems (e.g. data modeling issues, security, unmaintainable structure).
- I'm new to app development — walk me through *why*, not just *what*, especially for new concepts.
- Before making changes, use plan mode: read existing files first, propose the plan, wait for approval.
