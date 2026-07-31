# Waygood Backend Assignment — Walkthrough

## Result

All 5 required backend tasks completed. **23/23 tests pass.** 7 incremental commits, one per task.  
Zero files changed inside `frontend/`. Zero bonus features implemented.

---

## Commit History

| Commit | Task |
|---|---|
| `7ce89fe` | Task 1 — JWT auth with role support |
| `2f98f3f` | Task 2 — Discovery comments + minTuition filter |
| `ae2efe9` | Task 3 — MongoDB aggregation recommendation engine |
| `74eb67e` | Task 4 — Application workflow (create + transitions) |
| `593e892` | Task 5 — Cache flush() + index documentation |
| `8c0a602` | Tests — 23 tests across 2 suites |
| `7356b9a` | Docs — README sections appended |

---

## Files Changed

### Task 1 — Auth
- **`backend/src/controllers/authController.js`** — Replaced 3 stubs. `register` checks for duplicate email (409), creates student (bcrypt handled by model hook). `login` calls `comparePassword()` and signs a JWT with `{ sub, role }`. `me` returns `req.user` (set by middleware).
- **`backend/src/middleware/auth.js`** — Added `requireRole(role)` factory function alongside the existing `requireAuth`. Usage: `requireAuth, requireRole('counselor')` on any route that needs role restriction.

### Task 2 — Discovery
- **`backend/src/controllers/universityController.js`** — Added purpose comments to all functions and the caching strategy explanation.
- **`backend/src/controllers/programController.js`** — Added `minTuition` filter (budget range, not just max), comments on every block.

### Task 3 — Recommendations
- **`backend/src/services/recommendationService.js`** — Full rewrite from JS `.find()/.map()/.sort()` to a 5-stage MongoDB aggregation pipeline: `$match` (pre-filter by country + budget) → `$addFields: matchScore` (scoring with `$cond`) → `$addFields: matchReasons` (human-readable strings via `$concat`) → `$sort` → `$limit 10`.
- **`backend/src/controllers/recommendationController.js`** — Added comment, cleaned up response shape.

### Task 4 — Applications
- **`backend/src/controllers/applicationController.js`** — Implemented `createApplication` (student ID from JWT, program lookup, duplicate check → 409, timeline init) and `updateApplicationStatus` (validates against `validStatusTransitions` map, appends to timeline, returns clear error on invalid jump).
- **`backend/src/routes/applicationRoutes.js`** — Added `requireAuth` to POST and PATCH routes.

### Task 5 — Caching & Performance
- **`backend/src/services/cacheService.js`** — Added `flush()` (for test isolation) and `size()` (observability). Added detailed comment block explaining the TTL strategy, staleness tradeoff, and multi-instance limitation.
- **`backend/src/models/Program.js`** — Added `intakes: 1` multikey index. Added inline comment to every index explaining which query pattern it supports.

### Tests
- **`backend/tests/mongoSingleton.js`** — Shared MongoMemoryServer singleton. Starts once, reused by all test files via Node module caching. Prevents the 30s hook timeout that occurs when each test file cold-starts its own MongoDB binary.
- **`backend/tests/testSetup.js`** — `connectTestDb()` (no-op if already connected), `clearDatabase()` (per-test isolation), `disconnectTestDb()` (called only by the last test file).
- **`backend/tests/auth.test.js`** — 11 tests: register → login → me full flow. Covers duplicate email (409), wrong password (401), missing fields (400), invalid token (401).
- **`backend/tests/applications.test.js`** — 12 tests: create → status transition flow. Covers duplicate application (409), invalid transition (400), terminal status transition (400), valid jump through all statuses.
- **`backend/src/app.js`** — Morgan suppressed when `NODE_ENV=test` so test output is readable.
- **`backend/package.json`** — Added test script (direct Jest binary to avoid npm workspace hoisting conflicts), `jest` config section, `forceExit: true`, `testTimeout: 60000`.

### README
- **`README.md`** — Appended at bottom (original untouched): Setup instructions, Environment variables table, Assumptions made, Architecture decisions (recommendation scoring weights + caching strategy), Known frontend gaps.

---

## Test Results

```
PASS tests/applications.test.js (10.692 s)
PASS tests/auth.test.js (5.313 s)

Test Suites: 2 passed, 2 total
Tests:       23 passed, 23 total
Time:        16.19 s
```

---

## What Was NOT Changed

- Nothing in `frontend/` — zero changes
- No bonus features (no AI, no Docker, no rate limiting, no dashboard UI)
- No new models, no restructuring of existing working code
- `dashboardController.js`, `healthController.js`, `seed.js` — all untouched

---

## Pre-Submission Checklist

- [x] Every function has a purpose comment
- [x] Code is as simple as possible while working correctly  
- [x] No `frontend/` files touched
- [x] No bonus/optional features built
- [x] Every response follows `{ success, data, meta }` shape
- [x] One commit per task with clear message
- [x] `npm test` passes with 23/23 tests
- [x] `npm run seed` + `npm run dev` would work from a fresh clone
