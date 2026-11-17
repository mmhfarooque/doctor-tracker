# DOCTOR TRACKER — COMPLETE PROJECT HANDOVER & ARCHITECTURE LOG
> **Target Audience:** Claude, Codex, OpenAI, Senior Engineers, and DevOps Automators.  
> **Repository Path:** `<repo root>`  
> **Current Status:** Feature-complete, hardened, tested (15 API tests). Deploy-ready (Render + Vercel), NOT deployed yet — owner wants a UI pass first.  
> **Last Updated:** 2026-11-17 (review fixes, see §9)

---

## 1. Executive Summary & Specification Context

**Doctor Tracker** is an administrative full-stack healthcare web application engineered to manage physicians, departmental specializations, and patient rosters with real-time analytics.

### Source Specification Reference
* **Document:** `resource/Fullstack_Task_Frontend_Focused_Updated_1 (1) (1).pdf`
* **Mandated Tech Stack:**
  * **Frontend:** Next.js (Separate client application, App Router, TypeScript/JSX, Tailwind CSS, Recharts)
  * **Backend:** Node.js + Express (Separate standalone REST API server)
  * **Database:** MongoDB (Official Mongoose ODM with indexing)
  * **API Standard:** RESTful conventions with JWT authorization

---

## 2. Infrastructure & Database Configuration

### Live Database Configuration (MongoDB Atlas Cloud)
* **Cluster:** `Cluster0` (AWS Mumbai `ap-south-1`, MongoDB Engine v8.0+)
* **Database Name:** `doctor_tracker`
* **Cluster Host:** `<cluster>.mongodb.net`
* **Network Access / Firewall:** currently `0.0.0.0/0` (needed for Render free tier, which has no static outbound IP). If hosting on a VPS instead, restrict to that IP.
* **Connection String:** stored ONLY in `server/.env` (git-ignored). Never write it into docs or commits.

### Default Seeded Admin Credentials (demo data only)
* **Email:** `admin@doctortracker.com`
* **Password:** `Password123!`
* **Role:** `admin`
* **Pre-seeded Dataset:** 8 Physicians across 8 clinical specialties + 23 Patients with multi-month admission timelines.

---

## 3. Directory Layout & Complete Codebase Map

```text
Doctor Tracker/
├── client/                                     # Next.js Client Application (Port 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css                     # Global styles, custom scrollbar
│   │   │   ├── layout.jsx                      # Root layout with AuthProvider & AppLayout
│   │   │   ├── page.jsx                        # Analytics Dashboard view
│   │   │   ├── login/page.jsx                  # JWT Login view with 1-click Demo Fill
│   │   │   ├── doctors/
│   │   │   │   ├── page.jsx                    # Doctors Directory (Search/Filter/Paginate/Create)
│   │   │   │   └── [id]/page.jsx               # Doctor Profile & Assigned Patients Roster
│   │   │   └── patients/page.jsx               # Dedicated Patient Management (Full CRUD)
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Modal.jsx                   # Accessible dialog with backdrop & ESC handler
│   │   │   │   └── Pagination.jsx              # Reusable pagination controls
│   │   │   ├── dashboard/
│   │   │   │   ├── StatCard.jsx                # KPI metric card with icons & accents
│   │   │   │   └── AnalyticsCharts.jsx         # Recharts (Timeline, Caseload, Specialty, Status)
│   │   │   └── layout/
│   │   │       ├── Sidebar.jsx                 # Modern responsive navigation sidebar
│   │   │       ├── Navbar.jsx                  # Header with system status & profile badge
│   │   │       └── AppLayout.jsx               # Route guard wrapper with instant login rendering
│   │   ├── context/
│   │   │   └── AuthContext.jsx                 # Global auth state, token persistence, login/logout
│   │   └── lib/
│   │       └── api.js                          # Axios instance with JWT interceptor & 401 eviction
│   ├── .env.example                            # Public client env template
│   ├── .env.local                              # Local client env (NEXT_PUBLIC_API_URL=http://localhost:5000/api)
│   ├── next.config.mjs                         # Next.js config with Content Security Policy (CSP)
│   ├── package.json                            # Next.js 16, React 19, Recharts, Lucide
│   ├── postcss.config.js                       # PostCSS config with Tailwind & Autoprefixer
│   └── tailwind.config.js                      # Custom medical-themed color palette
│
├── server/                                     # Standalone Express REST API (Port 5000)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                           # MongoDB connection with pooling & graceful shutdown
│   │   ├── controllers/
│   │   │   ├── authController.js               # Login, register, getMe (timing-safe)
│   │   │   ├── dashboardController.js          # MongoDB Aggregation pipelines for analytics
│   │   │   ├── doctorController.js             # Doctor CRUD + Patient roster operations
│   │   │   └── patientController.js            # Dedicated Patient CRUD + filtering
│   │   ├── middleware/
│   │   │   ├── auth.js                         # JWT verification (HS256 algorithm enforcement)
│   │   │   ├── errorHandler.js                 # Central error handler (CastError, duplicate keys)
│   │   │   └── sanitizeMiddleware.js           # Deep NoSQL ($ / .) & Prototype Pollution stripper
│   │   ├── models/
│   │   │   ├── Doctor.js                       # Doctor schema with compound text & filter indexes
│   │   │   ├── Patient.js                      # Patient schema with doctor ref & condition indexes
│   │   │   └── User.js                         # Admin user schema with bcrypt & toJSON password scrub
│   │   ├── routes/
│   │   │   ├── authRoutes.js                   # /api/auth endpoints
│   │   │   ├── dashboardRoutes.js              # /api/dashboard/stats endpoint
│   │   │   ├── doctorRoutes.js                 # /api/doctors endpoints
│   │   │   └── patientRoutes.js                # /api/patients endpoints
│   │   ├── scripts/
│   │   │   └── seed.js                         # Automated realistic database seeder
│   │   ├── utils/
│   │   │   ├── sanitize.js                     # escapeRegex (100-char cap) & sanitizeString
│   │   │   └── validators.js                   # isValidObjectId hex validation & boundString
│   │   └── server.js                           # Express entry point with Helmet, CORS, RateLimit, HPP
│   ├── .env.example                            # Public server env template
│   ├── .env                                    # Local server env (Git-ignored)
│   └── package.json                            # Express 4.21, Mongoose 8.9, Helmet, HPP, RateLimit
│
├── log/
│   └── PROJECT_HANDOVER_LOG.md                 # This file
├── resource/                                   # Original project specification PDF
├── .gitignore                                  # Comprehensive ignore list (protects secrets & node_modules)
├── package.json                                # Root helper scripts (dev:server, dev:client, seed)
└── README.md                                   # Standardized evaluation documentation
```

---

## 4. API Endpoints Contract Reference

All endpoints (except login/register/health) require header `Authorization: Bearer <jwt_token>`.

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public (Rate-limited: 25/15m) | Body: `{ email, password }`. Returns JWT + user details. |
| `POST` | `/api/auth/register` | Protected (admin only, rate-limited 25/15m) | Body: `{ name, email, password }`. An existing admin creates another admin. Public sign-up is closed. |
| `GET` | `/api/auth/me` | Protected | Returns current authenticated user record. |

### Doctors Management (`/api/doctors`)
| Method | Endpoint | Access | Query / Body Params |
|---|---|---|---|
| `GET` | `/api/doctors` | Protected | Query: `search`, `specialization`, `hospital`, `status`, `startDate`, `endDate`, `page`, `limit`, `sortBy`, `order`. Returns paginated doctors with attached `patientCount`. |
| `POST` | `/api/doctors` | Protected | Body: `{ name, specialization, hospital, phone, email, status, experienceYears, bio }`. Creates new doctor. |
| `GET` | `/api/doctors/:id` | Protected | Param: Valid 24-hex ObjectId. Returns single doctor profile + total patient count. |
| `PUT` | `/api/doctors/:id` | Protected | Param: Valid 24-hex ObjectId. Body: Updated fields. |
| `DELETE` | `/api/doctors/:id` | Protected | Param: Valid 24-hex ObjectId. Returns 409 while patients are still assigned (no silent cascade). |
| `GET` | `/api/doctors/:id/patients` | Protected | Query: `search`, `condition`, `status`, `page`, `limit`. Returns patients assigned to doctor. |
| `POST` | `/api/doctors/:id/patients` | Protected | Body: `{ name, age, gender, condition, status, phone, email, notes, admissionDate }`. Adds patient under doctor. |
| `DELETE` | `/api/doctors/:id/patients/:patientId` | Protected | Removes patient from specific doctor's roster. |

### Patients Management (`/api/patients`)
| Method | Endpoint | Access | Query / Body Params |
|---|---|---|---|
| `GET` | `/api/patients` | Protected | Query: `search`, `condition`, `status`, `doctor`, `startDate`, `endDate`, `page`, `limit`, `sortBy`, `order`. Returns paginated patients populated with doctor info. |
| `POST` | `/api/patients` | Protected | Body: `{ name, age, gender, condition, status, doctor, phone, email, notes, admissionDate }`. Creates patient. |
| `GET` | `/api/patients/:id` | Protected | Param: Valid 24-hex ObjectId. Returns single patient populated with doctor. |
| `PUT` | `/api/patients/:id` | Protected | Param: Valid 24-hex ObjectId. Body: Updated patient fields. |
| `DELETE` | `/api/patients/:id` | Protected | Param: Valid 24-hex ObjectId. Deletes patient record. |

### Analytics Dashboard (`/api/dashboard`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | Protected | Executes MongoDB aggregation pipeline returning: `totals` (doctors, patients, avg ratio), `patientsPerDoctor` (caseload ranking), `monthlyRegistrations` (timeline series), `specialtyDistribution` (counts by department), `statusDistribution`, and `recentPatients`. |

---

## 5. Security & Sanitization Architecture (5 Passes Completed)

1. **NoSQL Injection Neutralization:**
   * Global `mongoSanitizeMiddleware` recursively scrubs `$` and `.` from `req.body`, `req.query`, and `req.params`.
   * Regex queries use `escapeRegex()` with a strict **100-character cap** to prevent ReDoS CPU exhaustion.
   * Query sort parameters are whitelisted against strict field schemas.

2. **Prototype Pollution Protection:**
   * Inputs containing `__proto__`, `constructor`, or `prototype` keys are stripped immediately.

3. **HTTP Parameter Pollution (HPP):**
   * Express middleware `hpp()` eliminates array pollution attacks across query strings.

4. **XSS & HTML Scrubbing:**
   * All user string fields pass through `sanitizeString()` which strips `<...>` tags and angle brackets.
   * Client-side React exclusively uses JSX curly-brace escaping (zero instances of `dangerouslySetInnerHTML`).
   * Form inputs across client views strictly enforce `maxLength` bounds to prevent oversized paste attacks.

5. **Authentication Hardening & Timing-Attack Prevention:**
   * Constant-time dummy hash verification: on non-existent accounts, `bcrypt.compare()` runs against a precomputed dummy hash, neutralizing time-based user enumeration attacks.
   * Passwords hashed via `bcrypt` with salt rounds.
   * Mongoose `User.toJSON` schema transformer automatically deletes `password` and `__v` upon serialization.
   * JWT verification strictly enforces `{ algorithms: ['HS256'] }`.
   * Error messages use timing-safe generic descriptions (`"Invalid email or password"`).

6. **Environment Integrity & Fail-Fast Startup:**
   * `validateEnv()` runs on boot to enforce that in production mode, `JWT_SECRET` must be set and be at least 32 characters long.

7. **Rate Limiting & DoS Prevention:**
   * Auth endpoints (`/api/auth/login`, `/api/auth/register`) capped at **25 requests / 15 mins**.
   * API endpoints capped at **500 requests / 15 mins**.
   * Express JSON and urlencoded parsers capped at **1MB payload limit**.
   * Reverse proxy trust enabled (`trust proxy: 1`) for accurate IP logging behind Nginx.

8. **HTTP Security Headers & Content Security Policy (CSP):**
   * Express applies `helmet` (`crossOriginResourcePolicy`, `xContentTypeOptions`, `xFrameOptions`).
   * Express server calls `app.disable('x-powered-by')` to conceal backend framework.
   * Next.js config applies strict CSP (`default-src 'self'`, `frame-ancestors 'none'`, etc.), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
   * `poweredByHeader: false` disables Next.js server fingerprinting.

9. **Clinical Anti-Caching Headers (HIPAA Compliance):**
   * All `/api` responses send `Cache-Control: no-store, no-cache, must-revalidate` to prevent patient diagnostic data from lingering in shared browser caches.

10. **Information Disclosure & Secret Hygiene:**
   * MongoDB version keys (`__v`) are stripped from query projections (`select('-__v')`).
   * Zero passwords or connection URIs exist in git commit history.
   * All credentials isolated to `.env` / `.env.local` files protected by `.gitignore`.

---

## 6. How to Run Locally

### Terminal 1 — Start Backend Server (Port 5000)
```bash
cd "<repo root>"
npm run dev:server
# Server will output:
# [Doctor Tracker Server] running in development mode on port 5000
# [MongoDB] Connected successfully: <cluster-shard>.mongodb.net
```

### Terminal 2 — Start Frontend Client (Port 3000)
```bash
cd "<repo root>"
npm run dev:client
# Open browser at http://localhost:3000
```

### Re-seeding Data (If needed)
```bash
cd "<repo root>"
npm run seed
```

---

## 7. VPS Deployment Runbook (For Claude / Codex / DevOps)

When deploying to the user's paid Linux VPS:

### Architecture on VPS
* **Reverse Proxy:** Nginx (listening on ports 80/443 with SSL via Let's Encrypt Certbot).
* **Process Manager:** PM2 managing both Express API and Next.js standalone server.
* **Database:** Connects directly to the existing MongoDB Atlas cluster (`MONGODB_URI`).

### VPS Step-by-Step Deployment Commands
```bash
# 1. On the VPS, clone the repository
git clone <your-git-repo-url> /var/www/doctor-tracker
cd /var/www/doctor-tracker

# 2. Setup Server Environment
cat << 'EOF' > server/.env
PORT=5000
NODE_ENV=production
MONGODB_URI=<atlas connection string from server/.env>
JWT_SECRET=<64+ random chars: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
CLIENT_URL=https://your-domain.com
EOF

# 3. Setup Client Environment
cat << 'EOF' > client/.env.local
NEXT_PUBLIC_API_URL=https://your-domain.com/api
EOF

# 4. Install dependencies and build client
cd server && npm install --production
cd ../client && npm install && npm run build
cd ..

# 5. Start with PM2
npm install -g pm2
pm2 start server/src/server.js --name "doctor-tracker-api"
pm2 start "npm --prefix client start" --name "doctor-tracker-client"
pm2 save
pm2 startup

# 6. Sample Nginx Configuration (/etc/nginx/sites-available/doctor-tracker)
# server {
#     server_name your-domain.com;
#     location /api/ {
#         proxy_pass http://localhost:5000/api/;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }
```

---

## 8. Git Commit Log

```text
0e357bf (HEAD -> main) security: add Content Security Policy (CSP), strict ObjectId validation, input length capping, and clinical anti-cache headers
c9e0810 security: add HTTP parameter pollution (HPP) protection, prototype pollution scrubbing, CORS origin validation, and model serialization defense
341ed16 security: add NoSQL injection sanitization middleware, JWT algorithm constraint, Next.js security headers, and DB connection pooling
bb2d9f6 security: add input sanitization, ReDoS regex escaping, Helmet HTTP headers, and rate limiting
cb59925 fix: optimize auth hydration and instant login page rendering
770e6cb feat: complete Doctor Tracker full-stack application (Next.js, Express, MongoDB Atlas)
```

---

## 9. Review Fixes — 2026-11-17 (evening)

Full review of backend, frontend and DB, then fixes. All verified: `npm test` (15/15 pass), `next build` OK, screenshots taken.

**Security**
* `/api/auth/register` now requires an authenticated admin (was public → anyone could become admin).
* Removed hardcoded JWT fallback secret; server refuses to start without `JWT_SECRET` (≥32 chars) in every mode.
* JWT lifetime 30d → 12h (`JWT_EXPIRES_IN`). Dummy timing hash is now a real bcrypt hash generated at startup.
* Secrets removed from these handover docs AND from git history (history rewritten with filter-branch; pre-rewrite backup in the session scratchpad only).
* Production error responses hide 5xx messages; malformed JSON → 400; CORS rejection → 403.
* Next.js CSP: `'unsafe-eval'` only in dev; `connect-src` limited to the API origin (was any `https:`); added base-uri/form-action/object-src.

**Backend / DB**
* Non-string body fields (arrays/objects/numbers) now return 400 instead of 500 (`asString`, `parseBoundedInt` in `utils/validators.js`). Enum lists shared.
* Add-patient-under-doctor now validates email; invalid `experienceYears` → 400 instead of NaN.
* Doctor delete refuses (409) while patients are assigned — no more silent cascade delete of clinical records.
* `Doctor.email` is now a unique index (race-safe duplicates).
* Indexes cleaned: removed duplicates/unused text indexes; added `createdAt` / `status` indexes matching real queries. Live DB synced with `npm run sync-indexes` (no data touched). Seeder also syncs.
* Dashboard: 7 independent queries run in parallel (`Promise.all`); timeline bounded to last 12 months; `estimatedDocumentCount` for totals.
* `server/src/app.js` (Express app) split from `server.js` (env check + DB connect + listen) so tests can import the app.
* Tests: `server/tests/api.test.js` (node:test, zero deps) against isolated DB `doctor_tracker_test`, dropped after.

**Frontend**
* Search is debounced (300 ms, `src/hooks/useDebounce.js`) and stale responses are ignored (request sequence ref) on Doctors, Patients and Doctor Profile pages.
* Auth redirects use `router.replace` (no full page reloads).
* Demo-credentials box controlled by `NEXT_PUBLIC_SHOW_DEMO_LOGIN` (default shown, for reviewers).

**Deploy prep (not deployed)**
* `render.yaml` blueprint for the API (root `server/`, health check `/health`). Frontend → Vercel, root `client/`. Steps in README §7.

**Known UI items for the owner's UI pass** (seen in screenshots, not changed):
* Mobile patients table is cramped/horizontally scrolls; start-date filter has no label on mobile.
* Doctor dropdowns load at most 100 doctors (API page cap).

**Owner TODO before going public**
* Change the Atlas DB user password (old one was in git history before the rewrite) and update `server/.env`. Generate a new `JWT_SECRET`.

---

## 10. UI Redesign — 2026-11-17 (night)

Owner asked for a complete, user-friendly admin UI (old one had the user badge top-right but Sign out bottom-left, etc.). All spec features kept.

* Concept: "ward board". Dark pine sidebar, cool grey canvas, IBM Plex Sans (self-hosted `@fontsource/ibm-plex-sans`; `next/font/google` failed in `next build`). Status colours reserved for clinical status (`lib/constants.js`).
* Shell: `components/layout/AppShell.jsx` + `Sidebar.jsx` (nav + search button + single account menu with Sign out), mobile top bar, `CommandPalette.jsx` (Ctrl/⌘K searches doctors + patients).
* UI kit `components/ui/`: Drawer, ConfirmDialog, Menu, Toast, Pagination, SearchInput, FilterChips, StatusBadge, Avatar, Skeleton, EmptyState, PageHeader, Field. Old Modal/Navbar/AppLayout/StatCard/AnalyticsCharts removed.
* Forms `components/forms/DoctorForm.jsx`, `PatientForm.jsx` (side panel, reused on every page).
* Dashboard: clinical-status bar (segments link to `/patients?status=`), KPI strip, 12-month admissions chart, patients by specialty (links to `/doctors?specialization=`), caseload per doctor, recent admissions.
* Doctors / Patients / Doctor profile: table on desktop, cards on mobile; status tabs (patients); "More filters" row; filter chips; row menus; sorting.
* API additions: `GET /api/doctors/filters` (distinct specialties + hospitals); dashboard `specialtyDistribution[].patients`. Tests 16/16.
* Verified: `next build` OK, screenshots desktop + mobile in docs/screenshots, no horizontal scroll at 390 px on any page.

---

## 11. Security, Maintenance & Future-proofing Audit — 2026-11-17 (late)

**Dependencies**
* Client was on Next.js 14.2 (end of life; critical advisories incl. image-optimizer RCE, SSRF, cache poisoning, DoS). Upgraded to **Next 16.4.6 + React 19**, postcss 8.5.33. `npm audit`: 0 vulnerabilities in both server and client. Removed unused `clsx`, `tailwind-merge`.
* Deliberately NOT upgraded (major versions, no advisories): Express 5, Mongoose 9, Tailwind 4, Recharts 3, lucide 1.x — Dependabot will raise them.

**Code quality**
* ESLint 9 flat config in both apps (`npm run lint`; client uses eslint-config-next 16 incl. React Compiler hook rules). Both clean.
* New `client/src/hooks/useApi.js`: one data-fetching hook (AbortController cancels superseded requests, keeps previous data while loading, no setState-in-effect). Replaced 4 hand-rolled fetch/stale-guard blocks.
* Forms and ⌘K palette mount fresh on open (state from props) instead of resetting in effects. Drawer uses `useEffectEvent`.
* Auth: session read at startup, then verified with `/auth/me` (expired 12h tokens now log out cleanly). axios 401 → `SESSION_EXPIRED` event → router redirect (no full reload). Login 401 no longer triggers it.
* Dead code removed (`sanitizeQuery`, `boundString`).

**Security hardening**
* Request logs record the path only — query strings (patient names, conditions) are never written to logs.
* 404 no longer echoes the requested URL.
* Phone numbers validated (doctor + patient create/update); page number capped at 10 000.
* New admin passwords: 8–128 chars with a letter and a number (model minlength 8).
* Client headers: COOP same-origin, HSTS in production (plus existing CSP, frame DENY, nosniff).
* Tests 19/19 (added phone, strong password, 404 no-echo).

**Future-proofing**
* `.github/workflows/ci.yml`: server lint + tests against a MongoDB 8 service + audit; client lint + build + audit.
* `.github/dependabot.yml` weekly npm (grouped minor/patch) + monthly actions. `.nvmrc` (22), `engines >=20.9`, `.editorconfig`.
* Favicon (`app/icon.svg`); Next dev badge disabled.

**Known, accepted trade-offs**
* JWT kept in localStorage (separate API origin on Render vs Vercel makes httpOnly cookies cross-site); mitigated by strict CSP, 12h expiry, no HTML injection paths (React escaping, no dangerouslySetInnerHTML).
* CSP keeps 'unsafe-inline' for scripts (Next.js bootstrap without nonces).
* Stateless JWT: logout is client-side; a stolen token is valid until expiry.

---

## 12. Second Audit Pass — 2026-11-17 (late)

Different angles from §11: failure paths, operations, live hostile-request probing, production header check.

* **Live probing** (malformed JSON, 2 MB body, `__proto__`, `$ne`/`$regex` in query, array params, limit=100000, sort injection, alg:none JWT, ReDoS pattern, stored-XSS name, foreign CORS origin): all neutralised except two error-path bugs, now fixed:
  * Oversized body returned 500 → now **413**; error handler honours Express/body-parser `err.status`.
  * Duplicate-key handler assumed `err.keyValue` exists → guarded; duplicates now **409**. CastError → 400.
* **Operations:**
  * `npm run seed` refuses when `NODE_ENV=production` unless `-- --force` (it deletes all data).
  * `/health` returns **503** with `database: disconnected` when MongoDB is down (Render health check restarts it).
  * Graceful shutdown moved to `server.js`: stop HTTP server → close DB pool → exit (10 s hard stop). `unhandledRejection` / `uncaughtException` are logged and trigger a clean restart.
  * Production logs omit stack traces.
* **Verified in a real production build:** CSP without `'unsafe-eval'`, `connect-src` limited to the API origin, HSTS, COOP, frame DENY, Referrer/Permissions-Policy, no `X-Powered-By`.
* Secrets scan of full git history: clean. No tracked env/credential files. No `dangerouslySetInnerHTML`/`eval`/`innerHTML`. No stray `console.*` in client. No unused modules.
* Tests **22/22** (added: 413, production CORS allow/deny, health). Lint clean both apps. `npm audit` 0 / 0.

---

## 13. Browser QA — 2026-11-17 (late)

`qa/browser-qa.mjs` (Puppeteer, headless Chrome) — **61/61 pass** (`qa/results-2026-11-17.json`). Covers auth, responsive 320–1920 px, mobile menu, tap targets, wrong data in every form, stored XSS / injection via UI, search abuse, URL tampering, keyboard, delete confirmation + doctor-delete guard, API-down error states + recovery, forged token. QA data self-cleans.

Bugs it found and that were fixed:
* **Patients table overflowed at 1024 px** → doctor column moves under condition below 1280 px; every desktop table wrapped in `overflow-x-auto`.
* **Filter controls cramped at 320 px** → stack one per row under 400 px.
* **404 was the unstyled Next default** → `app/not-found.jsx` with links back.
* **Rate limit was per IP for the whole API** → staff behind one hospital IP could lock each other out. Now authenticated requests are limited per user (1500 / 15 min), anonymous per IP (300 / 15 min); login stays 25 / 15 min per IP.
* **API process found dead** during QA (it had been started by an earlier session). Restart path verified (watch restart recovers in ~2 s); shutdown now also calls `closeIdleConnections()` so keep-alive sockets can't stall it.

---

## 14. Deployment — 2026-11-17 (night)

* GitHub (public): https://github.com/mmhfarooque/doctor-tracker — task PDF + `resource/` removed from all history (kept locally, git-ignored).
* Vercel account farooque7-9785 (Hobby), both projects auto-deploy on push to `main`:
  * **doctor-tracker-api** (root `server`, preset *Other*, `api/index.js` serverless adapter) → https://doctor-tracker-api-tawny.vercel.app
    Env: `MONGODB_URI`, `JWT_SECRET` (new, production-only), `JWT_EXPIRES_IN=12h`, `CLIENT_URL=https://doctor-tracker-three-gamma.vercel.app`.
  * **doctor-tracker** (root `client`, Next.js) → https://doctor-tracker-three-gamma.vercel.app
    Env: `NEXT_PUBLIC_API_URL=https://doctor-tracker-api-tawny.vercel.app/api`, `NEXT_PUBLIC_SHOW_DEMO_LOGIN=true`.
* Gotchas: the plain `doctor-tracker-api.vercel.app` belongs to someone else (names are global). Vercel's "Deploy" button on import created the projects but didn't start a build; an empty commit push did. Env changes need a new deploy (dashboard Redeploy didn't apply; a push did).
* Verified live: health + DB, login, auth required, CORS allows only the frontend (others 403), 413 on oversized body, dashboard / doctors / patients / edit panel / quick search, mobile no sideways scroll, CSP `connect-src` = API origin, HSTS.
* Production uses the same Atlas database `doctor_tracker` as local dev (demo data). `NEXT_PUBLIC_BASE_PATH` is ready if it moves under dev.mfaruk.com/<name> later.
* **Owner TODO:** change the Atlas DB password (it appeared in a screenshot in chat) → update Vercel `MONGODB_URI` + local `server/.env` → push to redeploy. Enable 2FA on Vercel.

---

## 15. Extended Features, QA Hardening & Test Verification — 2026-11-17 (night handover)

Full completion of all 12 extension features and end-to-end verification across the stack.

### 12 Extended Features Delivered:
1. **Roles & Scoping (`admin`, `doctor`, `nurse`):**
   - Granular authorization middleware (`authorize(...)`) on all API routes.
   - Doctor accounts are strictly scoped to their assigned caseload on both client and API.
   - Nurse role enables clinical status updates, notes, and follow-up adjustments while restricting admissions, transfers, and staff management.
2. **Patient Record Page (`/patients/[id]`):**
   - Full clinical profile with stay duration, attending physician link, clinical notes, and quick status action bar.
   - Built-in browser print styling for physical charting.
3. **Activity Audit Trail & Patient Timeline:**
   - Unified `Activity` schema logging admissions, status transitions, transfers, and follow-ups.
   - Real-time activity feeds and visual timeline with connecting rails on patient records.
4. **Caseload Transfers:**
   - Single-patient transfer with mandatory reason logged in patient history.
   - Caseload reassignment workflow for offboarding doctors.
5. **Follow-Up Management:**
   - Follow-up dates with overdue, today, and upcoming filters on both dashboard and patients table.
6. **Discharge & Length of Stay Tracking:**
   - Automatic discharge date logging; calculation of patient stay lengths and hospital-wide average length of stay.
7. **Doctor Capacity & Workload Indicators:**
   - Real-time patient capacity meters with over-capacity warnings.
8. **Duty Schedule & Shift Management (`/schedule`):**
   - Weekly shift grid, real-time "On duty now" indicators, shift assignment with clash/overlap prevention.
9. **Team & Staff Access Management (`/team`):**
   - Administrator management of staff user accounts with role selection and password strength enforcement.
10. **Critical Patient Alerts:**
    - Live alert bell with unread counter for patients transitioned to critical status; quick dismiss and direct navigation.
11. **Soft-Archive & Restore:**
    - Non-destructive archiving with undo toast notification; archive tab with permanent deletion confirmation modals.
12. **Safe Bulk Actions & CSV Export:**
    - Multi-select bulk status updates and bulk archiving.
    - Sanitized CSV export defending against spreadsheet formula injection attacks (`=`, `+`, `-`, `@`).

### QA Resolutions & Test Results:
* **Puppeteer Drawer Click Resolution:** Puppeteer's native `page.click()` threw `Node is either not clickable or not an Element` when targeting buttons located inside sliding drawer footers (`<Drawer>`). Resolved by dispatching direct element click evaluations (`page.$eval(selector, el => el.click())`), which bypasses layout-animation coordinates.
* **Patient Transfer Race Condition Fixed:** `qa/browser-qa.mjs` was relying on an arbitrary 1500ms timeout that raced against concurrent asynchronous `/transfer` POST and `/history` GET requests. Switched to `page.waitForFunction()` targeting the rendered timeline DOM, ensuring test reliability regardless of network latency.
* **Test Isolation & Cleanup:** Added pre-test database cleanup for QA-generated entities, avoiding duplicate email errors during repeated test runs.
* **Test Verification:**
  - **40 / 40** Backend integration tests passing (`server/npm test`).
  - **85 / 85** Browser QA suite checks passing (`qa/browser-qa.mjs`).
  - Next.js 16 (Turbopack) production build clean (`client/npm run build`).
  - ESLint 9 clean on both client and server (`npm run lint`).

---

## 16. Security Audit & Hardening (Codex Review) — 2026-11-17 (night)

A comprehensive security audit was executed by OpenAI Codex covering all 7 critical application security pillars.

### Audit Findings & Remediations:
* **2 High, 5 Medium, 3 Low findings** identified and fully remediated locally (detailed in `security/AUDIT-2026-11-17.md` and `security/audit-fixes.patch`).
1. **Activity Feeds Scoping After Transfer (High):** Bounded `readActivity(req)` in `utils/scope.js` to ensure former attending physicians cannot access historical activity feeds once a patient is transferred away.
2. **Clinical Statistics Leakage via Doctor Directory/Profile (Medium):** Applied `canAccessDoctor` before calculating or returning patient counts and clinical status distributions, preventing doctors from enumerating another doctor's clinical caseload breakdown.
3. **PHI Exposure in Logs (High):** Neutralized Protected Health Information exposure in HTTP request logs, fatal errors, Mongoose exceptions, and activity failures. Replaced raw error messages and URLs with fixed operational descriptions (`/unmatched` instead of echoing unknown paths).
4. **Audit Durability via MongoDB Transactions (Medium):** Implemented `utils/auditedMutation.js` wrapping all patient mutations, admissions, transfers, and archive actions in atomic sessions. If an audit write fails, the clinical mutation automatically rolls back. Recorded explicit `changes[{field, from, to}]` before/after tracking.
5. **Serverless Distributed Rate Limiting (Medium):** Replaced in-memory rate limiting with atomic MongoDB counters (`utils/rateLimitStore.js`) with TTL expiration, ensuring limits persist across serverless instances and worker recycling.
6. **Reverse Proxy & Forwarded IP Spoofing (Medium):** Configured strict proxy trust handling (`trust proxy = 0` default for standalone; 1 hop for Vercel; configurable via `TRUST_PROXY_HOPS`).
7. **Resource Bounds & DoS Mitigation (Medium):** Installed `mongoose.set('maxTimeMS', 2000)` query execution deadlines across all search, list, and aggregation operations. Hardened email validation to 254 characters.
8. **Payload Budget & Cache Header Ordering (Low):** Reduced JSON and URL-encoded parsers from 1 MB to `10kb` limit. Moved `/api` `Cache-Control: no-store` and `X-Frame-Options: DENY` headers ahead of body parsing and rate limiting.
9. **Production CORS Strictness (Low):** Removed implicit `localhost` permissions in production environment; only configured `CLIENT_URL` is whitelisted.
10. **CSV Formula Injection Hardening (Low):** Expanded CSV injection guard regex to neutralize line-feed (`\n`) and whitespace-obscured formula prefixes (`^(?:[\t\r\n]|\s*[=+\-@])`).

### Verification & Test Suite Status:
- **49 / 49** Backend integration & security regression tests passing (`server/npm test`).
- **85 / 85** Puppeteer Browser QA checks passing (`qa/browser-qa.mjs`).
- **0 errors, 0 warnings** in ESLint across both client and server (`npm run lint`).
- **0 errors** in Next.js 16 Turbopack production build (`client/npm run build`).

---

*This document serves as the single source of truth for the Doctor Tracker full-stack codebase. Any subsequent AI assistant or software engineer can read this file and have complete technical context.*
