# Browser QA

`browser-qa.mjs` drives the running app in headless Chrome and checks 61 things:
auth (wrong password, forged token, redirects), responsive layout at 320–1920 px, form validation with wrong
data, stored-XSS and injection attempts through the UI, search abuse, URL tampering, keyboard use, delete
confirmations, and error states when the API is unreachable. It creates only `QA`/`qa-` records and deletes
them at the end.

```bash
# with the API (:5000) and client (:3000) running and the demo data seeded
mkdir -p /tmp/qa-runner && cd /tmp/qa-runner && npm init -y >/dev/null && npm i puppeteer-core@23
cp "<repo>/qa/browser-qa.mjs" . && mkdir -p out
node browser-qa.mjs ./out        # expects Chrome at /usr/bin/google-chrome
```

Latest run: `results-2026-11-17.json` — 61 / 61 passed.
