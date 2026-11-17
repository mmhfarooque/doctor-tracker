# DOCTOR TRACKER — COMPLETE PROJECT HANDOVER & ARCHITECTURE LOG
> **Target Audience:** Claude, Codex, OpenAI, Senior Engineers, and DevOps Automators.  
> **Repository Path:** `/home/mimos/Projects/Doctor Tracker`  
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
* **Cluster Host:** `cluster0.lfzluek.mongodb.net`
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
│   ├── package.json                            # Next.js 14.2.35, React 18, Recharts, Lucide
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
cd "/home/mimos/Projects/Doctor Tracker"
npm run dev:server
# Server will output:
# [Doctor Tracker Server] running in development mode on port 5000
# [MongoDB] Connected successfully: ac-vfdn9ar-shard-00-00.lfzluek.mongodb.net
```

### Terminal 2 — Start Frontend Client (Port 3000)
```bash
cd "/home/mimos/Projects/Doctor Tracker"
npm run dev:client
# Open browser at http://localhost:3000
```

### Re-seeding Data (If needed)
```bash
cd "/home/mimos/Projects/Doctor Tracker"
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

*This document serves as the single source of truth for the Doctor Tracker full-stack codebase. Any subsequent AI assistant or software engineer can read this file and have complete technical context.*
