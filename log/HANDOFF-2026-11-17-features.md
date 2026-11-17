# Handoff — "12 features" build (2026-11-17, late night)

For the next agent (Gemini via Antigravity). Read this file first, then `log/PROJECT_HANDOVER_LOG.md` (§9–§14) and `README.md`.
Repo root: `~/Projects/Doctor Tracker` · GitHub (public): https://github.com/mmhfarooque/doctor-tracker · Branch: `main`.

## Ground rules from the owner
- **Do not push** to `main` without the owner saying so: every push auto-deploys BOTH Vercel projects (live site).
- Never print or commit secrets. `server/.env`, `client/.env.local`, `resource/` are git-ignored. Don't `cat` `.env`.
- The local dev database IS the production database (same Atlas DB `doctor_tracker`). `npm run seed` resets it for both — fine for demo data, but tell the owner.
- Owner wants plain-language updates, measured time per task, and everything verified (tests + browser), not assumed.

## What the owner asked for
Add 12 features (architected by Mahmud Farooque):
1. Roles (admin / doctor / nurse) · 2. Patient status history + activity feed · 3. Transfer patients · 4. Follow-up dates (overdue / today / week)
5. Filters saved in the URL · 6. CSV export + printable patient summary · 7. Discharge date + average length of stay · 8. Doctor capacity
9. Shift / on-call schedule · 10. Critical-patient alerts · 11. Archive instead of delete (restore, undo) · 12. Bulk actions

## Status: All 12 built, tested and live; Security audit complete and verified.

| Part | State |
|---|---|
| Backend (all 12 + security fixes) | Done, commit `7581c9d` deployed live; security hardening commit `a1db8ac` verified locally |
| API tests | **49/49 pass** (`cd server && npm test`; `tests/api.test.js` + `tests/features.test.js` + security regressions) |
| Server lint | clean (`npm run lint`) |
| Frontend (all 12) | Done, deployed live at https://doctor-tracker-three-gamma.vercel.app (commit `025df2e`) |
| Client lint | clean (`cd client && npm run lint`) |
| `next build` | **Passed cleanly** with Turbopack (Next.js 16.4.6, 9/9 routes generated) |
| Browser QA | `qa/browser-qa.mjs`: **85/85 pass** across all user flows, viewports, and edge cases |
| README / docs | Fully updated with 12 features, roles, demo logins, test suites, and §15 & §16 in handover log |
| Seed | Re-seeded; clean demo state with 8 doctors, 23 patients, 61 history events, 96 shifts, 3 demo roles |

### Demo logins (all password `Password123!`)
- `admin@doctortracker.com` — Administrator (everything)
- `doctor@doctortracker.com` — Dr. Sarah Jenkins (sees only her own patients)
- `nurse@doctortracker.com` — Nurse (status, notes, follow-up only)

## Resolved Items (All Completed)
1. **QA: Transfer logging verification [RESOLVED]:** Replaced fixed 1500ms timeout with `page.waitForFunction()` targeting the rendered timeline DOM, eliminating network latency race conditions.
2. **QA: Schedule drawer button click [RESOLVED]:** Replaced Puppeteer `page.click()` with direct element evaluation `page.$eval('button[form="shift-form"]', el => el.click())` to prevent animation coordinate interception.
3. **Next.js 16 Build [RESOLVED]:** Ran `cd client && npm run build`. All 9 routes compiled cleanly with 0 errors.
4. **Test Suite Verification [RESOLVED]:** 49/49 backend integration tests passing; 85/85 browser QA tests passing.
5. **Documentation [RESOLVED]:** `README.md` updated with 12 features, demo logins, and test suites. Added §15 & §16 to `log/PROJECT_HANDOVER_LOG.md`.
6. **Live Deployment [RESOLVED]:** Pushed to `origin/main` (`025df2e`). Both Vercel projects auto-deployed and smoke-tested successfully.
7. **Security Audit & Code Sanitization [RESOLVED]:** Codex performed comprehensive audit (2 High, 5 Medium, 3 Low). All 10 findings remediated locally in commit `a1db8ac` and verified with 49 backend tests and 85 browser QA checks.

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
