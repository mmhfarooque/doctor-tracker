# Handoff — "12 features" build (2026-11-17, late night)

For the next agent (Gemini via Antigravity). Read this file first, then `log/PROJECT_HANDOVER_LOG.md` (§9–§14) and `README.md`.
Repo root: `~/Projects/Doctor Tracker` · GitHub (public): https://github.com/mmhfarooque/doctor-tracker · Branch: `main`.

## Ground rules from the owner
- **Do not push** to `main` without the owner saying so: every push auto-deploys BOTH Vercel projects (live site).
- Never print or commit secrets. `server/.env`, `client/.env.local`, `resource/` are git-ignored. Don't `cat` `.env`.
- The local dev database IS the production database (same Atlas DB `doctor_tracker`). `npm run seed` resets it for both — fine for demo data, but tell the owner.
- Owner wants plain-language updates, measured time per task, and everything verified (tests + browser), not assumed.

## What the owner asked for
Add 12 features (from a list Claude proposed):
1. Roles (admin / doctor / nurse) · 2. Patient status history + activity feed · 3. Transfer patients · 4. Follow-up dates (overdue / today / week)
5. Filters saved in the URL · 6. CSV export + printable patient summary · 7. Discharge date + average length of stay · 8. Doctor capacity
9. Shift / on-call schedule · 10. Critical-patient alerts · 11. Archive instead of delete (restore, undo) · 12. Bulk actions

## Status: all 12 built. Backend pushed & live; frontend committed LOCALLY, NOT pushed.

| Part | State |
|---|---|
| Backend (all 12) | Done, commit `7581c9d`, **pushed and live** on https://doctor-tracker-api-tawny.vercel.app |
| API tests | **40/40 pass** (`cd server && npm test`; `tests/api.test.js` + new `tests/features.test.js`) |
| Server lint | clean (`npm run lint`) |
| Frontend (all 12) | Done, committed locally in the commit that adds this file — **not pushed** (live UI is still the previous version; it works with the new API) |
| Client lint | clean (`cd client && npm run lint`) |
| `next build` | **not re-run since the frontend changes** — do this before pushing |
| Browser QA | `qa/browser-qa.mjs`: **83/85 pass** on the latest run. 2 open items below. |
| README / screenshots | **not yet updated** for the 12 features |
| Seed | Re-seeded; nurse display name changed to "Nina Patel" (seed edited, included in commit) |

### Demo logins (all password `Password123!`)
- `admin@doctortracker.com` — Administrator (everything)
- `doctor@doctortracker.com` — Dr. Sarah Jenkins (sees only her own patients)
- `nurse@doctortracker.com` — Nurse (status, notes, follow-up only)

## Open items (in order)
1. **QA: "Transfer with reason is applied and logged" fails.** After submitting the Transfer drawer on a patient record, the newest history entry is still the earlier status change. Not yet diagnosed: either the transfer request failed (check the drawer for an error / network `POST /api/patients/:id/transfer`) or the record page's history didn't refresh (`TransferDialog` → `onDone` → `refresh()` in `client/src/app/patients/[id]/page.jsx`, which calls `record.reload()` + `history.reload()` from `useApi`). The API side is covered by a passing test (`features.test.js` → "doctor transfers own patient…"), so suspect the UI/test timing first. Claude had written a debug script but the run was interrupted.
2. **QA: "schedule" step throws "Node is either not clickable"** — likely `page.click('button[form="shift-form"]')` in the drawer footer. Probably test-side; try `el.evaluate(e => e.click())` like `clickText` does, then confirm the add-shift UI manually.
3. Run `cd client && npm run build` (Next 16 / Turbopack) and fix anything it reports.
4. Re-run: `cd server && npm test` (expect 40/40), then browser QA (below). Re-seed before QA for a clean state.
5. Update `README.md`: features section (the 12), roles + demo logins, new pages (Patient record, Schedule, Team & access), refresh screenshots in `docs/screenshots/` (desktop + mobile). Add §15 to `log/PROJECT_HANDOVER_LOG.md`.
6. Ask the owner, then push to `main` (deploys both Vercel projects) and smoke-test the live site with all three logins.

## How to run locally
```bash
cd server && npm run dev      # API :5000 (node --watch)
cd client && npm run dev      # UI  :3000
cd server && npm run seed     # reset demo data (same DB as live!)
cd server && npm test         # 40 API tests (isolated test DBs, dropped afterwards)
```
Browser QA needs `puppeteer-core` (not a project dependency): see `qa/README.md`. Chrome at `/usr/bin/google-chrome`.
Note: running QA repeatedly can hit the API rate limiter (per user 1500 / per IP 300 per 15 min); restarting the API clears it.

## Where things are
- **Permissions:** server `src/middleware/auth.js` (`authorize`), `src/utils/scope.js` (doctor → own patients everywhere); client `src/lib/permissions.js` (hides controls only — API enforces).
- **History / alerts:** `models/Activity.js`, `utils/activity.js`, `controllers/activityController.js`; client `components/activity/*` (feed, timeline, `AlertsBell` polls `/api/alerts` every 60 s).
- **Patients API:** `controllers/patientController.js` (list/export/history/transfer/archive/restore/bulk); nurses limited to status/notes/followUpDate in `updatePatient`.
- **Doctors API:** `controllers/doctorController.js` (capacity = active patients vs `maxPatients`, reassign whole caseload, delete guarded).
- **Dashboard API:** `controllers/dashboardController.js` (scoped; follow-ups, length of stay, over-capacity, on-call, activity).
- **Shifts / users:** `controllers/shiftController.js`, `controllers/userController.js`.
- **New pages:** `client/src/app/patients/[id]` (record), `app/schedule`, `app/team`. Rewritten: `app/page.jsx` (dashboard), `app/patients/page.jsx`, `app/doctors/[id]/page.jsx`.
- **Data fetching:** always via `src/hooks/useApi.js` (AbortController, keeps previous data). Lint uses React 19 hook rules — don't call `setState` synchronously in effects or `Date.now()` during render.

## Gotchas found tonight
- Recharts: a `<Line>` inside `<AreaChart>` is silently ignored → use `<ComposedChart>` (fixed).
- An absolutely positioned `sr-only` element inside an `overflow-x-auto` wrapper escapes it and widens the page unless the wrapper is `relative` (fixed on all tables).
- CSV export: UTF-8 BOM + formula-injection guard (`utils/csv.js`); `fetch().text()` strips the BOM, so tests check raw bytes.
