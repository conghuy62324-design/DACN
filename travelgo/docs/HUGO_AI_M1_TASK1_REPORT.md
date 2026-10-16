# HuGo Intelligence 2.0 — M1 Task 1 Report

> Task: Preserve explicit Customer preferences through Tour Planner → Save Trip → reopen  
> Date: 2026-10-12 (Asia/Ho_Chi_Minh)  
> Result: **PASS**

## 1. Scope

Only M1 Task 1 was implemented. Events, Impressions, Favorites and AI model training were not changed.

No database migration was required because `trip_sessions.preferences JSONB NOT NULL DEFAULT '[]'` already exists in migration 03. No database was reset, truncated or deleted.

Writable target: `travelgo_ai_m0_test` only, protected by:

- loopback host check;
- `ALLOW_TEST_DB_WRITES=true`;
- exact `TEST_DATABASE_NAME=travelgo_ai_m0_test`;
- sentinel `hugotravel-isolated-test-database-v1`.

`travelgo_phase35_test` and `travelgo_dev` were queried read-only only.

## 2. Root cause and fixed data flow

Previous flow:

```text
Customer selections
  → PlannerInput.preferences
  → recommendation uses preferences
  → GeneratedItinerary omitted preferences
  → frontend saved only itinerary
  → TripSessionService hard-coded preferences: []
```

Fixed flow:

```text
Customer explicitly selects zero or more allowlisted values
  → POST /api/tours/plan validates input
  → GeneratedItinerary.preferences contains the validated values
  → POST /api/trips sends the itinerary only
  → TripSessionService validates preferences again
  → trip_sessions.preferences persists the values
  → GET /api/trips/:id returns them after refresh/reopen
  → PUT /api/trips/:id can edit or clear them
```

No preference is inferred from itinerary summary, reviews, places or behavior.

## 3. Validation and privacy behavior

Server allowlist:

- `bien`
- `thien-nhien`
- `van-hoa`
- `am-thuc`
- `nghi-duong`
- `check-in`
- `phieu-luu`
- `mua-sam`

Rules:

- input must be an array;
- maximum 8 submitted values;
- each value must be a string, non-empty after trim and at most 32 characters;
- each value must be in the allowlist;
- duplicates are removed while preserving order;
- missing/null preferences become `[]` for backward compatibility;
- an explicit `[]` clears stored preferences;
- planner, trip creation and trip update all validate server-side;
- user identity comes from the auth token, not the Save Trip request body.

Frontend behavior:

- Planner now starts with no preference preselected;
- Customer can remove the final selected value;
- generated itinerary displays the preferences returned by the server;
- Trip Detail shows, edits, saves and clears explicit preferences;
- old Trips with `[]` show a safe empty state.

## 4. Test results

| Check | Result | Evidence |
|---|---|---|
| Backend build | PASS | TypeScript `tsc` |
| Frontend production build | PASS | Vite, 1,720 modules transformed |
| RBAC regression | PASS | auth, roles, ownership, isolation, price/capacity/transitions |
| Unit/algorithm suite | PASS 14/14 | 3 preference-policy tests plus planner propagation assertion |
| HTTP/PostgreSQL integration | PASS 14 checks | real database/API |
| Intelligence regression | PASS 7 checks | no event changes/regression |
| Playwright E2E | PASS 3/3 | Customer, Partner, Super Admin |
| Schema verifier | PASS | 4 migrations, 18 application tables, 28 FKs, PostGIS 3.4.3 |
| `git diff --check` | PASS | no whitespace errors |

### HTTP preference assertions

- planner returns exactly `['van-hoa', 'am-thuc']`;
- unsupported planner preference returns HTTP 400;
- Save Trip response and PostgreSQL record contain the exact values;
- reopen returns the exact values;
- forged/inferred preference on create returns HTTP 400;
- update to `['nghi-duong', 'bien']` persists;
- inferred value on update returns HTTP 400;
- update with `[]` clears preferences;
- legacy itinerary without `preferences` saves and reopens with `[]`;
- cross-customer Trip access remains 404.

### Playwright Customer assertions

The browser test performs:

1. select `am-thuc` and `van-hoa` explicitly;
2. generate itinerary and verify both labels;
3. Save Trip and verify both values on Trip Detail;
4. refresh and verify both values remain;
5. add `nghi-duong`, save, refresh and verify it remains;
6. clear all, refresh and verify the backward-compatible empty state.

The final database snapshot has 5 Trips and all 5 have empty preferences because the final E2E/HTTP steps intentionally exercise deletion. Before deletion, both the HTTP test and Playwright refresh assertions verified non-empty persistence. No unsupported stored value was found.

## 5. Protected database verification

Read-only fingerprint after tests:

| Database | Migrations | Users | Places | Trips |
|---|---:|---:|---:|---:|
| `travelgo_phase35_test` | 4 | 21 | 9 | 8 |
| `travelgo_dev` | 3 | 0 | 0 | 0 |

No write command targeted either protected database.

## 6. Files changed for M1 Task 1

Backend:

- `backend/src/utils/travelPreferences.ts`
- `backend/src/services/tourPlannerService.ts`
- `backend/src/controllers/tourController.ts`
- `backend/src/services/tripSessionService.ts`
- `backend/src/controllers/tripController.ts`
- `backend/src/tests/algorithm.test.ts`
- `backend/src/tests/integration.postgres.test.ts`

Frontend:

- `frontend/src/constants/travelPreferences.ts`
- `frontend/src/types/index.ts`
- `frontend/src/pages/TourPlannerPage.tsx`
- `frontend/src/services/tripService.ts`
- `frontend/src/pages/TripDetailPage.tsx`
- `frontend/e2e/roles.spec.ts`

Report:

- `docs/HUGO_AI_M1_TASK1_REPORT.md`

## 7. PASS / FAIL / BLOCKED

### PASS

- explicit preferences survive plan, save, PostgreSQL persistence and reopen;
- edit and delete work through authenticated owner APIs and UI;
- server allowlist/count/length/type validation;
- no inference from summary or review;
- legacy empty/missing preferences remain compatible;
- unit, HTTP integration, E2E, RBAC and builds.

### FAIL

- None in M1 Task 1.

### BLOCKED

- None in M1 Task 1.

**M1 Task 1 = COMPLETE.** This result does not start or complete Events, Impressions, Favorites or model training tasks.
