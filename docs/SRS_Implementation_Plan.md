# Software Requirements Specification & Implementation Plan
## Scaler AI/ML Certification Tracker — Web App

**Document version:** 1.0
**Prepared for:** Build execution in Google Antigravity (agentic IDE)
**Target deployment:** GitHub Pages (static) or Firebase Hosting (recommended)
**Source of truth for content:** `seed_data.json` (bundled alongside this document) — 15 modules, 270 syllabus items, 404 AM/PM schedule blocks, extracted directly from the user's real Scaler dashboard pages.

---

## 0. How to use this document with Antigravity

This SRS is written so it can be handed to an Antigravity agent almost verbatim as a task brief. Each functional requirement (FR) has an ID, an unambiguous acceptance criterion, and maps to exactly one implementation task in Section 9. Recommended workflow:

1. Create a new Antigravity workspace, paste **Section 2 (Tech Stack)** and **Section 5 (Data Model)** first so the agent scaffolds the project correctly.
2. Feed Section 9 (Implementation Plan) to the agent **phase by phase**, not all at once — let it verify each phase (build + browser check) before moving on. Antigravity's browser-verification loop works best with small, testable increments.
3. Drop `seed_data.json` into `src/data/seed_data.json` before Phase 2 — every screen in this spec is built to read from that exact shape.
4. Use Section 11 (Acceptance Test Checklist) as the final verification pass before deployment.

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for a personal, single-user, mobile-first web application that replaces the Excel-based "Scaler AI/ML Certification Tracker" (Overview / Module Tracker / Class Syllabus / Daily Tracker) with an interactive, always-available tracker the user can update daily from a phone or laptop.

### 1.2 Scope
The app will:
- Store and display the real syllabus (15 modules, 270 items: classes, research papers, skill tests, mock interviews, capstones) extracted from the user's Scaler dashboard.
- Present a day-by-day, AM/PM-block schedule from **1 Aug 2026 to 18 Feb 2027** (203 days / 404 blocks, including 2 buffer weeks and recurring travel weekends).
- Let the user log actual hours studied and sleep hours per day, and mark syllabus items complete.
- Recompute progress, pace, and a **projected finish date** live, based on what was actually logged — not just the plan.
- Work fully offline as an installable PWA, and sync across devices when Firebase is used.
- Be deployable as a 100%-static bundle to GitHub Pages, or with cloud sync to Firebase Hosting + Firestore.

### 1.3 Out of scope (v1)
- Multi-user support / account sharing.
- Editing the Scaler video content itself or embedding video playback.
- Push notifications (listed as a v2 stretch goal, Section 12).
- Native mobile app (PWA install is sufficient).

### 1.4 Definitions
| Term | Meaning |
|---|---|
| Block | One AM or PM study session on a given date (404 total) |
| Item | One unit of syllabus content: a Class, Paper, Test, Mock interview, or Capstone (270 total) |
| Pace | Hours logged per week, used to project finish date |
| Buffer days | The 14 days appended after all content is scheduled, for catch-up/revision |
| Travel weekend | Every 4th Saturday+Sunday, pre-flagged with reduced target hours |

---

## 2. Tech Stack (recommended — instruct the agent to use exactly this)

| Layer | Choice | Why |
|---|---|---|
| Framework | **React 18 + TypeScript + Vite** | Fast dev/build, static output works on both GH Pages and Firebase Hosting |
| Styling | **Tailwind CSS** | Fast to scaffold with an agent, easy mobile-first responsive utility classes |
| Charts | **Recharts** | Burn-down chart, sleep trend, hours-per-week bar chart |
| Routing | **react-router-dom** (HashRouter) | `HashRouter`, not `BrowserRouter` — required for GitHub Pages (no server-side rewrite rules) |
| State | **Zustand** (or React Context if the agent prefers) | Small, no boilerplate, easy to persist |
| Local persistence | **IndexedDB via `idb`** | Works fully offline, required for the GitHub-Pages-only deployment path |
| Cloud persistence (optional) | **Firebase Firestore + Firebase Auth (Google sign-in)** | Enables cross-device sync; only used if `VITE_USE_FIREBASE=true` |
| PWA | **vite-plugin-pwa** | Installable, offline-first, service worker caches the app shell + seed data |
| Deployment | **GitHub Actions → GitHub Pages** *or* **Firebase Hosting via `firebase deploy`** | Both configs included; user picks one (Section 10) |
| Testing | **Vitest** (unit) + **Playwright** (smoke/e2e) | Matches Antigravity's own browser-verification loop |

**Design principle:** build a `DataService` interface (Section 6.4) so the storage backend (IndexedDB vs Firestore) is swappable with one config flag, not a rewrite. This is the single most important architectural decision in this spec — do not let the agent hard-wire Firestore calls directly into components.

---

## 3. User Characteristics & Constraints

- Single user: a working professional, 7:30 AM–6:30 PM job, 5 days/week, targeting a 6-hour sleep floor.
- Primary device for logging: **phone**, primarily at 5:00–6:30 AM and 8:00–11:00 PM — the UI must be thumb-usable, large tap targets, minimal typing (steppers/sliders over free-text number entry where possible).
- Secondary device: laptop, for weekly review / analytics.
- No technical setup tolerance beyond opening a URL — no login required for the GitHub-Pages/IndexedDB path; optional Google sign-in only for the Firebase path.
- Intermittent connectivity (travel weekends) — app must not break offline.

---

## 4. Overall Functional Description

The app has 5 primary views, matching the 4 sheets of the source workbook plus a new home dashboard:

1. **Today** (home) — the AM/PM blocks for today, with quick-log controls. Default landing screen.
2. **Timetable** — the full 404-block calendar (replaces "Daily Tracker" sheet), filterable and searchable.
3. **Modules** — the 15-module progress view (replaces "Module Tracker" sheet).
4. **Syllabus** — the flat, searchable 270-item list (replaces "Class Syllabus" sheet).
5. **Insights** — computed totals, verdict, and live pace projection (replaces "Overview" sheet's Section 3–5).

---

## 5. Data Model

Ship `seed_data.json` (already generated from the user's real syllabus) with this exact shape. The app **seeds** local/cloud storage from this file on first run only; after that, all reads/writes go through storage, never the static file.

```
seed_data.json
├── modules: Module[15]
├── syllabusItems: SyllabusItem[270]
├── scheduleBlocks: ScheduleBlock[404]
└── settings: Settings
```

### 5.1 `Module`
```ts
interface Module {
  id: string;                 // "M4".."M18"
  moduleNumber: number;       // 4..18
  name: string;                // e.g. "MLOps — Productionization of ML Systems"
  weeks: string;                // "4 weeks"
  classesTotal: number;
  papersTotal: number;
  skillTestRequired: boolean;
  mockInterviewRequired: boolean;
  mockInterviewStatus: "Pending" | "Expired" | "Not Required";
  capstoneRequired: boolean;
  estimatedHours: {
    video: number; homework: number; papers: number;
    skillTest: number; mockInterview: number; capstone: number; total: number;
  };
  cumulativeHours: number;     // running total through this module, in curriculum order
  status: "not_started" | "in_progress" | "completed";
  isDataConfirmed: boolean;    // false only if a module's source page was ever a placeholder
  notes: string;
}
```

### 5.2 `SyllabusItem`
```ts
interface SyllabusItem {
  id: string;                  // "item_0001".."item_0270"
  sequence: number;            // schedule order, 1-based
  moduleId: string;            // FK -> Module.id, or "C1"/"C2" for capstones
  type: "Class" | "Paper" | "Test" | "Mock" | "Capstone";
  title: string;                // real extracted class/paper/test title
  estimatedHours: number;
  completed: boolean;           // USER-WRITABLE
}
```

### 5.3 `ScheduleBlock`
```ts
interface ScheduleBlock {
  id: string;                   // "block_0001".."block_0404"
  date: string;                 // ISO "2026-08-01"
  dayOfWeek: string;
  block: "AM" | "PM";
  timeWindow: string;            // "5:00-6:30 AM"
  targetHours: number;
  isTravelWeekend: boolean;
  isBuffer: boolean;
  focusItems: string[];          // display labels; resolved to SyllabusItem.id on first load (5.5)
  actualHours: number | null;    // USER-WRITABLE
  sleepHours: number | null;     // USER-WRITABLE, logged once/day on the AM block
  notes: string;                 // USER-WRITABLE
  completed: boolean;            // USER-WRITABLE
}
```

### 5.4 `Settings`
```ts
interface Settings {
  courseStartDate: string;       // "2026-08-01"
  targetDeadline: string;         // "2026-12-31" (user's original ask)
  sustainablePaceFinish: string;  // "2027-03-30"
  chosenPaceFinish: string;       // "2027-02-18" — plan the user picked
  weeklyTemplate: Record<DayName, {AM: number; PM: number}>;
  sleepFloorHours: number;        // 6.0
  travelWeekendFrequencyWeeks: number; // 4
  assumptions: { /* see seed file — editable in Settings screen, FR-19 */ }
}
```

### 5.5 One-time migration step (build this — FR-2)
`focusItems` in the seed file are **display strings**, not IDs (they were generated by a greedy hour-packing simulation, so a long item can be split "(part 1.2h of 2.8h)" across two blocks). On first load, run a linking pass:
1. Strip any `" (part Xh of Yh)"` suffix.
2. Match the remaining string to `SyllabusItem.title` via the `M{n} Class i/N:` / `M{n} Research Paper i/N` / etc. prefix (already unique per item — this was generated deterministically, so exact string match after suffix-stripping is sufficient).
3. Store the resolved `itemId[]` on the block (`ScheduleBlock.itemIds: string[]`, add this field at runtime — not in the static seed).
4. Persist the linked result so this only runs once.

This lets "mark item complete" from the Timetable view automatically check it off in the Syllabus view and vice versa.

---

## 6. Functional Requirements

Each FR below is scoped to one screen and has a concrete acceptance criterion. IDs are stable — reference them in commits/PRs.

### 6.1 Today (Home) screen

**FR-1 — Show today's blocks.**
Display the `ScheduleBlock` row(s) where `date == today` (2 rows: AM, PM; or 1 for a fully-protected Friday PM). Show time window, target hours, and the resolved syllabus item titles as a checklist.
*Acceptance:* Opening the app on any date within the plan range shows exactly that date's blocks; outside the range shows a "Course not active" state with the nearest date's blocks as reference.

**FR-2 — One-tap item completion.**
Each focus item on today's blocks is a checkbox. Tapping toggles `SyllabusItem.completed` and updates `Module.status` (auto: `in_progress` on first item, `completed` when all module items done).
*Acceptance:* Checking all items in a block visually marks the block complete; unchecking any un-marks it.

**FR-3 — Log actual hours & sleep.**
A stepper/slider (0–8 hrs, 0.25 increments) for `actualHours` per block, and a single sleep-hours slider (0–10, 0.25 increments) shown once per day on the AM block only.
*Acceptance:* Values persist immediately (no separate "save" button) and survive an app reload.

**FR-4 — Sleep-floor warning.**
If the trailing 5 logged days all have `sleepHours < settings.sleepFloorHours`, show a persistent (non-dismissable-until-acknowledged) banner: *"Sleep has been under 6 hrs for 5+ days — cut scope, not sleep."* Link to the Insights screen's scope-cutting suggestions (FR-16).
*Acceptance:* Banner appears exactly when the condition is met using real logged data, not target data; disappears once the condition breaks.

**FR-5 — Streak & quick stats.**
Show: current on-track streak (consecutive days where `actualHours >= targetHours * 0.8`), days elapsed / days remaining to `chosenPaceFinish`, % of items completed.
*Acceptance:* All three numbers recompute correctly after any log entry, verified against a seeded test dataset (Section 11).

### 6.2 Timetable screen

**FR-6 — Full scrollable/virtualized block list.**
Render all 404 blocks grouped by date (AM+PM shown as a merged two-row card, matching the spreadsheet's merged-cell layout). Use virtualization (e.g. `react-window`) — do not render all 404 cards to the DOM at once.
*Acceptance:* Scroll performance stays smooth (60fps) on a mid-range phone; verified via Chrome DevTools performance trace during Antigravity's browser-verification step.

**FR-7 — Filter & jump.**
Filters: by module, by day type (Weekday/Weekend/Travel/Buffer), by completion status. A "Jump to today" button and a date picker.
*Acceptance:* Each filter combination narrows the list correctly against the seed data; "Jump to today" scrolls the virtualized list to the correct index without a full re-render jank.

**FR-8 — Inline edit from Timetable.**
Same log controls as FR-3, editable inline on any past or future date (not just today) — the user will backfill missed days.
*Acceptance:* Editing a historical block updates Insights (FR-13–16) immediately.

**FR-9 — Travel-weekend & buffer visual treatment.**
Travel weekend blocks render with a distinct color/badge; buffer blocks likewise. Match the workbook's color coding (blue-ish for travel, grey for buffer) for user familiarity.
*Acceptance:* Visual regression check (screenshot diff) against a reference screenshot the agent generates in Phase 4.

### 6.3 Modules screen

**FR-10 — Module cards.**
One card per module (15 total) in curriculum order (4→18), each showing: name, weeks, classes done/total, papers done/total, skill-test status, mock-interview status (with the real `Pending`/`Expired`/`Not Required` value), capstone flag, estimated vs. logged hours, and a progress bar.
*Acceptance:* Progress bar % = (completed items / total items) for that module, computed from `SyllabusItem`, not hardcoded.

**FR-11 — Module detail drill-down.**
Tapping a card opens the full ordered item list for that module (classes in original recorded order, then papers, then test, then mock, then capstone if applicable), each with its own completion checkbox — this is the one place in the app the *real, extracted class titles* are front and center (e.g. "Git & GitHub: Setup for MLOps").
*Acceptance:* Every title shown matches `seed_data.json` verbatim — no paraphrasing, no truncation below 60 characters (use a "show more" expand instead of clipping silently).

**FR-12 — Editable assumptions per module.**
`isDataConfirmed`, `notes`, and the capstone flag are editable per module (the user may later confirm/correct the 2 assumed capstones).
*Acceptance:* Edits persist and immediately recompute that module's `estimatedHours.total` and all downstream `cumulativeHours` for later modules.

### 6.4 Insights screen

**FR-13 — Live totals.**
Recompute and display, from live data (not the static seed): total hours needed, total hours logged so far, hours remaining.
*Acceptance:* Matches a hand-computed check on the seeded seven-day test fixture (Section 11) to within 0.05 hr (floating point tolerance).

**FR-14 — Burn-down chart.**
Recharts line/area chart: cumulative target hours (plan) vs. cumulative actual hours (logged), by date, from `courseStartDate` to `chosenPaceFinish`.
*Acceptance:* Two lines render; where no actual hours are logged yet, the actual-hours line simply stops (does not draw zeros forward).

**FR-15 — Live pace & projected finish date.**
Compute `hoursLoggedLast14Days / 14 * 7` as current weekly pace; project a finish date as `today + (hoursRemaining / currentWeeklyPace weeks)`. Show this next to the original `chosenPaceFinish` with a delta ("+9 days behind plan" / "−3 days ahead of plan").
*Acceptance:* With a synthetic fixture logging exactly the target hours every day, projected finish date equals `chosenPaceFinish` (±1 day for rounding).

**FR-16 — Scope-cutting suggestions.**
When projected finish date is more than 14 days behind `chosenPaceFinish`, surface actionable suggestions pulled from a static list (increase playback speed to 1.75x, skip Additional Problems, single-pass papers, use buffer weeks) with an estimated hours-saved per suggestion.
*Acceptance:* Suggestions list only appears when the behind-schedule condition is true; each suggestion's hour-savings estimate is a static, clearly-labeled number (not falsely precise).

**FR-17 — Sleep trend chart.**
Bar chart of logged `sleepHours` over the last 30 days with a horizontal reference line at `sleepFloorHours`.
*Acceptance:* Bars below the floor line render in a warning color (e.g. amber/red); at/above in normal color.

### 6.5 Syllabus screen

**FR-18 — Searchable flat list.**
All 270 items, searchable by title (substring match) and filterable by type (Class/Paper/Test/Mock/Capstone) and module.
*Acceptance:* Typing "Docker" filters to the Module 14 Docker class within 100ms (client-side filter, no network call).

### 6.6 Settings screen

**FR-19 — Editable assumptions.**
Expose `settings.assumptions` (recording length, playback speed, HW hours/recording, paper hours, test hours, mock hours, capstone hours) as editable numeric fields, matching the yellow input cells of the original Overview sheet.
*Acceptance:* Changing any assumption recomputes every module's `estimatedHours` and the Insights totals live, without a page reload.

**FR-20 — Data export / import.**
Export all current data (modules, items, blocks, settings — i.e. everything, including user-logged values) as a single JSON file; import restores from such a file, overwriting local state after a confirmation dialog.
*Acceptance:* Export → clear all data → import round-trips with zero data loss, verified by a deep-equality check the agent writes as a Vitest test.

**FR-21 — Reset to seed.**
A clearly-labeled, double-confirmation "Reset all progress" action that restores from `seed_data.json`, wiping all logged hours/completions.
*Acceptance:* Cannot be triggered by a single tap; requires typing a confirmation phrase.

---

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Offline-first.** All 6 screens must render and remain interactive with no network connection, using the IndexedDB-cached data and a service-worker-cached app shell. |
| NFR-2 | **Mobile-first responsive.** Fully usable at 360px width; log-entry controls must have ≥44px tap targets. |
| NFR-3 | **Load performance.** First contentful paint < 2s on a throttled 3G profile (Antigravity's browser tooling can measure this directly). |
| NFR-4 | **No backend required for the GitHub Pages path.** The IndexedDB `DataService` implementation must not call any network API. |
| NFR-5 | **Data privacy.** If Firebase is used, Firestore security rules restrict all reads/writes to the authenticated owner's UID only (Section 8.3). |
| NFR-6 | **Installable PWA.** Passes Lighthouse PWA checklist (manifest, service worker, icons, offline fallback). |
| NFR-7 | **No data loss on refresh.** Every write in Sections 6.1–6.6 marked "USER-WRITABLE" is persisted before the UI shows it as saved (optimistic UI acceptable, but must reconcile on failure). |
| NFR-8 | **Browser support.** Latest 2 versions of Chrome, Safari (iOS), and Firefox. |
| NFR-9 | **Accessibility.** All interactive controls keyboard-navigable and screen-reader-labeled (this is a personal app, but cost is near-zero if built in from the start with semantic HTML). |

---

## 8. System Architecture

### 8.1 High-level diagram (describe to the agent; it can render this as an actual diagram in its plan)
```
┌─────────────────────────────────────────────────────┐
│                     React SPA (Vite)                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────┐ │
│  │  Today    │ │ Timetable │ │  Modules  │ │Syllabus│ │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └───┬────┘ │
│        └─────────────┴──────┬──────┴───────────┘      │
│                       Zustand store                     │
│                              │                           │
│                     DataService (interface)              │
│              ┌───────────────┴───────────────┐          │
│      IndexedDBDataService          FirestoreDataService  │
│         (idb, offline)              (Firestore + Auth)   │
└──────────────┬───────────────────────────────┬──────────┘
               │                                 │
       seed_data.json (bundled)          Firebase project
       GitHub Pages (static hosting)     Firebase Hosting + Firestore
```

### 8.2 `DataService` interface (build this first — everything else depends on it)
```ts
interface DataService {
  init(): Promise<void>;                          // seeds from seed_data.json if empty
  getModules(): Promise<Module[]>;
  getSyllabusItems(): Promise<SyllabusItem[]>;
  getScheduleBlocks(range?: {from: string; to: string}): Promise<ScheduleBlock[]>;
  getSettings(): Promise<Settings>;
  updateModule(id: string, patch: Partial<Module>): Promise<void>;
  updateSyllabusItem(id: string, patch: Partial<SyllabusItem>): Promise<void>;
  updateScheduleBlock(id: string, patch: Partial<ScheduleBlock>): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  exportAll(): Promise<string>;                     // JSON string, FR-20
  importAll(json: string): Promise<void>;            // FR-20
  resetToSeed(): Promise<void>;                       // FR-21
}
```
Select implementation at boot via `import.meta.env.VITE_USE_FIREBASE`.

### 8.3 Firestore data structure (only if Firebase path is chosen)
```
/users/{uid}/modules/{moduleId}
/users/{uid}/syllabusItems/{itemId}
/users/{uid}/scheduleBlocks/{blockId}
/users/{uid}/settings/main
```
Security rule (exact — give this to the agent verbatim):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## 9. Implementation Plan (phased — feed to Antigravity one phase at a time)

### Phase 0 — Scaffold (0.5 day)
- `npm create vite@latest scaler-tracker -- --template react-ts`
- Install: `tailwindcss`, `zustand`, `idb`, `recharts`, `react-router-dom`, `react-window`, `vite-plugin-pwa`.
- Configure Tailwind, `HashRouter`, base folder structure:
  ```
  src/
    data/seed_data.json
    types/ (Module, SyllabusItem, ScheduleBlock, Settings interfaces)
    services/ (dataService.ts interface, indexedDbService.ts, firestoreService.ts)
    store/ (zustand store)
    screens/ (Today, Timetable, Modules, Syllabus, Insights, Settings)
    components/ (BlockCard, ModuleCard, ItemRow, ProgressBar, Charts/*)
  ```
- **Verify:** blank app builds and deploys to a scratch GH Pages branch.

### Phase 1 — Data layer (0.5–1 day)
- Implement `IndexedDBDataService` fully (Section 8.2), including the seed-linking migration (Section 5.5).
- Write Vitest unit tests: seed loads, `updateScheduleBlock` persists, `exportAll`/`importAll` round-trips.
- **Verify:** open browser devtools → IndexedDB → confirm 15/270/404 records present after first load.

### Phase 2 — Today + Timetable screens (1–1.5 days)
- Implement FR-1 through FR-9.
- Wire the Zustand store to `DataService`; all screens read through the store, never the service directly.
- **Verify (Antigravity browser loop):** load app on a mocked "today" date mid-plan, check an item, confirm it appears checked in Timetable too.

### Phase 3 — Modules + Syllabus screens (1 day)
- Implement FR-10 through FR-12, FR-18.
- **Verify:** every one of the 15 module cards' `classesTotal`/`papersTotal` matches `seed_data.json` exactly (write this as an automated test, not a manual check).

### Phase 4 — Insights + Settings (1–1.5 days)
- Implement FR-13 through FR-17, FR-19 through FR-21.
- Build the burn-down and sleep-trend charts.
- **Verify:** feed the synthetic 7-day fixture (Section 11.1) through the app and confirm computed totals match the hand-calculated expected values.

### Phase 5 — PWA + offline (0.5 day)
- Configure `vite-plugin-pwa`: manifest (name, icons, theme color), `injectManifest` or `generateSW` strategy caching the app shell + `seed_data.json`.
- **Verify:** Lighthouse PWA audit passes; toggling devtools "offline" mode keeps the app fully functional.

### Phase 6 — Firebase path (optional, 1 day, only if user wants cross-device sync)
- Add `FirestoreDataService`, Firebase Auth (Google sign-in only), deploy the security rules from Section 8.3.
- Gate behind `VITE_USE_FIREBASE` env var so the GitHub-Pages build stays backend-free.
- **Verify:** sign in on two browser profiles, confirm a change in one reflects in the other within a few seconds.

### Phase 7 — Deployment configs (0.5 day)
- Both deployment paths configured and documented (Section 10).
- **Verify:** a real deploy to a live URL, checked from a phone.

### Phase 8 — Polish & acceptance pass (0.5–1 day)
- Run the full checklist in Section 11.
- Fix any FR not meeting its stated acceptance criterion.

**Total estimate: 6–8 focused days**, well-suited to being split across several Antigravity agent sessions (one phase per session keeps context small and verification tight).

---

## 10. Deployment

### 10.1 GitHub Pages (static, no backend, `VITE_USE_FIREBASE=false`)
- `vite.config.ts`: set `base: '/scaler-tracker/'` (or your repo name).
- Use `HashRouter` (already specified in Section 2) — GitHub Pages has no server-side rewrites, so a `BrowserRouter` breaks on refresh of any non-root route.
- GitHub Actions workflow (`.github/workflows/deploy.yml`): on push to `main`, `npm ci && npm run build`, then deploy `dist/` to the `gh-pages` branch via `peaceiris/actions-gh-pages` (or the official `actions/deploy-pages`).
- Enable GitHub Pages in repo settings, source = GitHub Actions.
- Data lives only in that browser's IndexedDB — no cross-device sync. Use Export/Import (FR-20) to move data between devices manually.

### 10.2 Firebase Hosting (recommended if the user wants phone + laptop sync)
- `firebase init hosting` (public dir = `dist`, SPA rewrite: all routes → `/index.html`) and `firebase init firestore`.
- Set `VITE_USE_FIREBASE=true` and the Firebase config (`apiKey`, `projectId`, etc.) as Vite env vars — **do not commit these to the repo**; use `.env.local` + GitHub Actions secrets for CI deploys.
- Deploy: `npm run build && firebase deploy --only hosting,firestore:rules`.
- Optional CI: GitHub Actions workflow using `w9jds/firebase-action`, triggered on push to `main`.
- Because `BrowserRouter` works fine here (Firebase Hosting supports rewrites), the agent may switch off `HashRouter` for this path — but keeping `HashRouter` everywhere is simpler and works identically on both hosts, so the spec defaults to it for both.

### 10.3 Recommendation
Ship the GitHub Pages / IndexedDB-only version first (Phases 0–5, 7) — it's genuinely finished and useful with zero ongoing cost or account setup. Treat Phase 6 (Firebase) as an upgrade once the offline-only version has been used for a week or two and cross-device sync is a felt need, not a guess.

---

## 11. Acceptance Test Checklist

### 11.1 Synthetic 7-day fixture (build once, reuse for FR-13–17 tests)
Seed a test-only dataset: 7 consecutive days from `courseStartDate`, each logged with `actualHours == targetHours` and `sleepHours == 6.5`. Expected: 0 days behind schedule, sleep-floor banner absent, burn-down actual line exactly tracks the plan line.

### 11.2 Manual pass (run once before calling the app "done")
- [ ] All 15 modules show the correct real class titles (spot-check Module 14 "Git & GitHub: Setup for MLOps" and Module 16 "Introduction to Computer Vision(CNN)" specifically — these were the two modules re-extracted after the original placeholder data).
- [ ] Checking every item in a module flips its status to `completed` and its progress bar to 100%.
- [ ] Logging sleep < 6 hrs for 5 straight days shows the warning banner; logging one good night clears it.
- [ ] Export → Reset to seed → Import restores everything exactly.
- [ ] App installs as a PWA on an Android phone and opens in airplane mode with all 5 screens working.
- [ ] Timetable correctly renders all 6 travel weekends and the 14 buffer days with distinct styling.
- [ ] Deployed GitHub Pages URL loads correctly on first visit (no blank screen / 404 on refresh).

---

## 12. Future Enhancements (v2, not in this build)
- Push/local notifications reminding of the AM/PM block ~15 min before it starts.
- Calendar (Google Calendar) two-way sync of blocks.
- Weekly email/WhatsApp digest of progress vs. plan.
- Multi-user support if the tracker pattern is reused for other Scaler cohort-mates.

---

## Appendix A — File manifest for this handoff
| File | Purpose |
|---|---|
| `SRS_Implementation_Plan.md` | This document |
| `seed_data.json` | Real extracted data: 15 modules, 270 syllabus items, 404 schedule blocks, settings — drop into `src/data/` in Phase 0 |
