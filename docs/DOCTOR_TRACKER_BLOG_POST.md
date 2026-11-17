---
title: "Engineering Doctor Tracker: How I Built a High-Trust, Role-Scoped Clinical Administration SaaS"
slug: "engineering-doctor-tracker-healthcare-saas"
date: "2026-11-18"
author: "Mfaruk"
readingTime: "12 min read"
tags: ["Next.js", "React 19", "Node.js", "Express", "MongoDB", "Healthcare Tech", "System Architecture", "Security", "Puppeteer"]
featuredImage: "/images/blog/doctor-tracker-banner.jpg"
excerpt: "A deep architectural breakdown of Doctor Tracker — a clinical workforce and patient tracking SaaS. From solving hospital caseload blindspots and designing a zero-PHI logging architecture, to atomic MongoDB audit transactions and automated 85-point headless browser QA."
---

# Engineering Doctor Tracker: How I Built a High-Trust, Role-Scoped Clinical Administration SaaS

![Doctor Tracker Hero Banner](/images/blog/doctor-tracker-banner.jpg)

In a fast-paced inpatient hospital ward, information latency is a patient safety issue. 

When a patient’s vitals suddenly drop from stable to critical at 2:00 AM, the care team cannot afford to spend minutes cross-referencing outdated spreadsheets, calling around to see which attending physician owns the caseload, or guessing whether the on-duty cardiologist is already operating at maximum capacity.

Yet, despite billions poured into enterprise electronic health record (EHR) systems, everyday clinical administration often degenerates into brittle Google Sheets, whiteboards, and unmonitored email handoffs. These ad-hoc solutions suffer from three fatal flaws:
1. **Zero Caseload Guardrails:** Doctors get overloaded without warning, creating burnout and clinical risk.
2. **Untracked Handoffs:** Patients transferred between specialists lose their context, with no audit log of *why* the transfer occurred or who authorized it.
3. **Severe Privacy & Compliance Hazards:** Spreading Protected Health Information (PHI) across informal tools invites data breaches and HIPAA violations.

To solve this, I designed, built, and open-sourced **Doctor Tracker** — a modern, secure healthcare administrative web portal built with **Next.js 16**, **Node.js 22 / Express**, and **MongoDB Atlas**. 

In this article, I want to take you behind the scenes: how we engineered the architecture from scratch, how we hardened it through an intensive 10-point security audit, and why we verified every flow with automated headless browser QA.

---

## 1. Product Vision: Clinical Clarity Over Bureaucratic Clutter

Before writing a line of code, I established three design principles:

### Principle 1: Color is Clinical Information, Never Decoration
In consumer apps, vibrant colors create emotional engagement. In clinical tools, decorative colors cause alert fatigue. We reserved high-saturation semantic colors strictly for the **Five Inpatient Stages**:
- <span style="color:#ef4444; font-weight:600;">🔴 Critical</span> — Immediate physician intervention required.
- <span style="color:#f59e0b; font-weight:600;">🟡 Under Observation</span> — Requires continuous monitoring and regular vitals.
- <span style="color:#3b82f6; font-weight:600;">🔵 Recovering</span> — Showing positive clinical trajectory.
- <span style="color:#10b981; font-weight:600;">🟢 Stable</span> — Standard ward care.
- <span style="color:#64748b; font-weight:600;">⚪ Discharged</span> — Cleared and archived; feeds Average Length of Stay (ALOS) metrics.

The rest of the user interface utilizes a tranquil **Deep Pine (`#112620`)** and slate palette. When a patient turns critical, that red badge cuts through the screen like a beacon.

### Principle 2: Drawers Over Page Bounces
Healthcare workers operate in high-interrupt environments. If a nurse is reviewing a ward table of 40 patients and clicks to update a note, navigating them to a new URL causes loss of scroll position and cognitive context. In Doctor Tracker, **every operational form (admissions, transfers, shift creation, account settings) opens in a right-hand slide-over drawer (`<Drawer>`)**. The data table stays visible behind the action, and closing the drawer restores focus instantly.

### Principle 3: Keyboard-First Efficiency
Navigating complex rosters should not require dozens of mouse clicks. Pressing **`Ctrl + K`** (or `Cmd + K`) summons a custom Command Palette that indexes doctors and patients in real-time, allowing ward managers to jump directly to any patient record or physician roster in milliseconds.

---

## 2. High-Level System Architecture

Doctor Tracker is organized around a strict separation of concerns, decoupling the user presentation tier from the business and data storage tier.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16 CLIENT (APP ROUTER)                  │
│                                                                        │
│   ┌─────────────────────┐   ┌───────────────────┐   ┌──────────────┐   │
│   │ AppShell & Nav      │   │ Command Palette   │   │ Alerts Bell  │   │
│   │ (Pine Theme)        │   │ (Ctrl+K Search)   │   │ (Polling)    │   │
│   └──────────┬──────────┘   └─────────┬─────────┘   └───────┬──────┘   │
│              │                        │                     │          │
│              ▼                        ▼                     ▼          │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ useApi Hook (Debouncing, AbortController, URL Query Sync)      │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ Axios (Bearer JWT + JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   STANDALONE NODE.JS 22 + EXPRESS API                  │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Middleware: Helmet, CORS, 10kb Parser, Distributed Rate Limits │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────▼────────────────────────────────┐   │
│   │ Auth & RBAC Guard: authenticateToken, authorize(roles), scope  │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────┬───────────────┼───────────────┬────────────────┐   │
│   ▼               ▼               ▼               ▼                ▼   │
│ Patients      Doctors         Dashboard        Shifts          Audit   │
│ Controller    Controller      Aggregation     Controller     Mutations │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ Mongoose 8 ODM (Transactions)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     MONGODB ATLAS REPLICA CLUSTER                      │
│                                                                        │
│   [( Users )]    [( Doctors )]    [( Patients )]    [( Activity )]     │
│   Compound Indexes: { doctor: 1, status: 1 }, { specialization: 1 }    │
└────────────────────────────────────────────────────────────────────────┘
```

### Why a Standalone Backend Beats Next.js Route Handlers Here
While Next.js Route Handlers are convenient for simple JAMstack sites, a clinical SaaS poses unique infrastructure demands:
1. **Persistent Database Connection Pooling:** Next.js serverless functions spin up and down unpredictably, risking database socket exhaustion under rapid ward traffic. Our Node.js Express server keeps a warm, pooled connection to MongoDB Atlas.
2. **Heavy Aggregation Pipeline Isolation:** Computing live multi-month admissions vs. discharges, average length of stay (ALOS), and departmental caseload breakdowns requires complex aggregation queries. Isolating these pipelines prevents CPU competition with SSR page generation.
3. **Deployment Flexibility:** The REST backend can be deployed anywhere — as an auto-scaling container on Render, a Vercel Serverless Function, or an on-premise private cloud instance within a hospital intranet.

---

## 3. Core Operational Features: What Makes It Powerful

### Feature 1: The Live Ward Census Bar
At the top of the analytics dashboard sits the Ward Distribution Bar. Rather than hiding patient health states inside separate sub-pages, this live component visualizes the exact percentage of patients in each clinical state. Clicking any segment (e.g., clicking the red Critical segment) automatically navigates to `/patients?status=Critical`, letting administrators address emergencies in one click.

### Feature 2: Smart Physician Caseload & Capacity Safeguards
Every doctor document stores `maxPatients` (caseload ceiling) and calculates `patientCount` in real time. 
- In the UI, each physician's profile features a dynamic **Capacity Meter**:
  - Green when below 80% capacity.
  - Amber when approaching the limit.
  - Red with a warning indicator when the physician is at or over capacity.
- While admissions aren't hard-blocked (emergency exceptions happen), administrators are explicitly alerted before transferring more cases to an overloaded doctor.

### Feature 3: Safe Patient Transfers with Mandatory Audit Reasons
Transferring a patient from an internist to a neurologist should never happen silently. In Doctor Tracker, submitting a transfer requires:
1. Selecting the destination physician (filtered to eliminate the current attending).
2. Inputting a mandatory **Clinical Reason** (e.g., *"Reassigned following post-op telemetry results"*).
3. The mutation writes to the patient record and simultaneously commits an immutable audit event containing the prior attending, the new attending, the timestamp, and the actor.

### Feature 4: Clash-Proof Duty Shifts & "On Duty Now" Badging
The shift management engine (`/schedule`) provides a 7-day visual grid dividing clinical coverage into **Day**, **Night**, and **On-Call** shifts. 
- When an administrator schedules a doctor, the backend executes an overlap query:
  ```javascript
  const clash = await Shift.findOne({
    doctor: doctorId,
    date: shiftDate,
    $or: [{ startTime: { $lt: endTime, $gt: startTime } }, { endTime: { $gt: startTime, $lt: endTime } }]
  });
  if (clash) return res.status(409).json({ message: "Physician already has an active shift during this window" });
  ```
- Doctors currently on active shifts are badged with a glowing **"On duty now"** indicator on the dashboard, making it effortless to see who is physically in the hospital.

### Feature 5: Multi-Role Scoping (Admin, Doctor, Nurse)
Healthcare platforms must balance collaboration with horizontal privacy:
- **Administrator (`admin`):** Global access, duty rosters, staff accounts provisioning, permanent archiving.
- **Attending Doctor (`doctor`):** **Strictly Sandboxed.** A doctor logging into Doctor Tracker sees only the patients assigned to them. Querying `/api/patients` automatically injects `{ doctor: req.user.doctor }`. Even if a doctor tampers with URL IDs to request another physician’s patient, the API returns a strict `404 Not Found`.
- **Floor Nurse (`nurse`):** High-efficiency triage. Nurses can view patient records across wards, update clinical status pills, record progress notes, and adjust follow-up dates, but cannot delete, transfer, admit, or alter staff access.

---

## 4. The Security Audit: 10 Vulnerabilities Identified and Neutralized

Prior to production release, we subjected Doctor Tracker to a rigorous, line-by-line security audit performed with OpenAI Codex. The review uncovered **2 High, 5 Medium, and 3 Low findings**. 

Here is how we remediated the most critical ones:

### Finding 1 (High): Eliminating PHI Leakage in Server Error Logs
- **The Vulnerability:** Standard Express error handlers often log `err.message` or `err.stack`. When Mongoose cast errors or validation exceptions fired, rejected clinical payloads (such as patient diagnoses or names) were being printed into `stderr` and server log files. Furthermore, requests to unknown routes echoed back the raw URL (which could contain a patient name in an unencoded parameter).
- **The Remediation:**
  - We modified the logger middleware to record fixed route templates or `/unmatched` on 404s, never echoing raw request paths.
  - Centralized error handling was updated to output fixed, sanitized operational messages. Production responses never reveal stack traces, database schema structures, or clinical parameters.

### Finding 2 (High): Activity Feed Access Revocation After Patient Transfer
- **The Vulnerability:** The audit log recorded historical doctor assignments in an `Activity.doctors` array. If Doctor A transferred a patient to Doctor B, Doctor A’s activity feed continued polling and displaying new updates for that patient.
- **The Remediation:** We rewrote `readActivity(req)` in `server/src/utils/scope.js`. For doctor accounts, the system executes an indexed cross-check against the `Patient` collection to ensure the querying physician is *currently* the active attending doctor before returning any timeline events. The moment a transfer completes, the former doctor's read privileges are revoked.

### Finding 3 (Medium): Atomic Audited Mutations via MongoDB Transactions
- **The Vulnerability:** In the original prototype, patient mutations were saved first, followed by an asynchronous `Activity.create()` call wrapped in a try/catch. If the audit database operation failed, the error was logged but the patient mutation remained committed — creating unaudited medical changes.
- **The Remediation:** We engineered `withAuditTransaction` in `server/src/utils/auditedMutation.js`:
  ```javascript
  export const withAuditTransaction = async (req, operation) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  };
  ```
  Every status change, transfer, admission, and archive operation runs inside a multi-document transaction. If the audit event fails to record, the clinical mutation automatically rolls back.

### Finding 4 (Medium): Serverless Distributed Rate Limiting
- **The Vulnerability:** The Express rate limiter used memory storage. On platforms like Vercel, serverless containers spin up on demand and recycle frequently, resetting the in-memory request counter and allowing attackers to bypass rate limits.
- **The Remediation:** We implemented `MongoRateLimitStore` (`server/src/utils/rateLimitStore.js`). Every request atomically increments a counter in a dedicated MongoDB collection (`$inc`) with a native TTL index that automatically expires after 15 minutes. Authenticated staff are rate-limited per user ID (1500 req / 15 min), while unauthenticated visitors are limited per normalized IP (300 req / 15 min).

### Finding 5 (Low): CSV Spreadsheet Formula Injection Guard
- **The Vulnerability:** The CSV export endpoint allowed clinical administrators to download patient rosters. If a patient’s condition or note contained formula characters (`=`, `+`, `-`, `@`), spreadsheet applications like Microsoft Excel or LibreOffice Calc could execute external commands when opened.
- **The Remediation:** We hardened the sanitizer regex:
  ```javascript
  if (/^(?:[\t\r\n]|\s*[=+\-@])/u.test(fieldValue)) {
    fieldValue = `'${fieldValue}`;
  }
  ```
  Prepending an apostrophe neutralizes formula evaluation while preserving human-readable text.

---

## 5. Testing & Verification: 134 Automated Checks

Reliability cannot be assumed; it must be proven on every commit.

```
┌────────────────────────────────────────────────────────┐
│               AUTOMATED VERIFICATION SUITE              │
├────────────────────────────────────────────────────────┤
│  ✔ Backend Integration Tests (node:test)    49 / 49   │
│  ✔ Puppeteer Headless Browser QA            85 / 85   │
│  ✔ Next.js 16 (Turbopack) Production Build  0 Errors   │
│  ✔ ESLint 9 (React 19 Hook Rules)           0 Warnings │
└────────────────────────────────────────────────────────┘
```

### The 85-Point Puppeteer Browser QA Suite
In `qa/browser-qa.mjs`, we run an end-to-end headless Chrome browser suite that drives the live application through realistic and hostile scenarios:
- **Responsive Viewport Sweeps:** Tests CSS layouts at 320px, 375px, 414px, 768px, 1024px, 1280px, and 1920px, confirming zero horizontal overflow and verifying tap targets exceed 24px on mobile touchscreens.
- **Stored XSS Injection Attacks:** Attempts to submit HTML tags (`<script>alert(1)</script>`, `<img src=x onerror=...>`) into patient names, notes, and doctor bios, verifying that all output is safely escaped in the DOM.
- **Search Abuse & ReDoS:** Passes ReDoS regex patterns (`(a+)+$`), SQL injection strings (`'; DROP TABLE patients;--`), and NoSQL operators (`{"$ne":null}`) into the debounced search bar, confirming graceful empty states and zero server errors.
- **Simulated API Outages:** Uses Puppeteer request interception to simulate a complete backend failure, confirming that the client gracefully renders descriptive error boundaries and recovers seamlessly when the "Try again" action is triggered.

---

## 6. Live Demo, Credentials & GitHub Repository

Doctor Tracker is deployed live and open to explore:

* **Live Frontend Portal:** [https://doctor-tracker-three-gamma.vercel.app](https://doctor-tracker-three-gamma.vercel.app)
* **Live REST API Health:** [https://doctor-tracker-api-tawny.vercel.app/health](https://doctor-tracker-api-tawny.vercel.app/health)
* **GitHub Repository:** [https://github.com/mmhfarooque/doctor-tracker](https://github.com/mmhfarooque/doctor-tracker)

### Try the Live Demo Accounts (Password for all: `Password123!`):
| Role | Email | Best Workflows to Test |
|---|---|---|
| **Administrator** | `admin@doctortracker.com` | Duty shift scheduling, staff accounts management, caseload transfers, and CSV export. |
| **Attending Doctor** | `doctor@doctortracker.com` | Dr. Sarah Jenkins: Notice that only her 4 cardiology patients are visible; access to other physicians' caseloads is strictly locked. |
| **Floor Nurse** | `nurse@doctortracker.com` | Nina Patel: Try updating patient clinical status pills, writing progress notes, and scheduling follow-ups. |

---

## 7. Lessons Learned & Key Takeaways

1. **Healthcare UX Requires Restraint:** The best healthcare software is quiet. Keeping visual decoration minimal and letting semantic clinical status colors do the talking prevents cognitive fatigue in high-stress wards.
2. **Audit Trails Must Be First-Class Citizens:** Auditing is not an afterthought to log into a file. Wrapping mutations and activity records in atomic database transactions guarantees that patient histories remain 100% reliable.
3. **Automate Browser QA Early:** Unit tests verify functions; browser automation verifies user workflows. Catching animation click intercepts and drawer race conditions with Puppeteer saved hours of manual testing.

If you are building healthcare software or designing multi-role SaaS applications with Next.js and Node, feel free to inspect the codebase, fork the repository, or reach out with questions.
