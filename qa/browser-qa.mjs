// Browser QA for Doctor Tracker: responsive layout, wrong input, attacks via the UI, error handling.
// Creates only records prefixed "QA"/"qa-" and deletes them at the end.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const OUT = process.argv[2];
const APP = 'http://localhost:3000';
const API = 'http://localhost:5000/api';
const results = [];
const check = (area, name, pass, detail = '') => {
  results.push({ area, name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${area}] ${name}${detail ? ' — ' + detail : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Clear a React-controlled input the way a user does (select all + delete), so onChange fires
const clear = async (sel) => {
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
};
const safe = async (area, name, fn) => {
  try {
    await fn();
  } catch (e) {
    check(area, name, false, 'threw: ' + e.message.slice(0, 140));
  }
};

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
let dialogs = 0;
page.on('dialog', async (d) => {
  dialogs++;
  await d.dismiss();
});
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 150)));
await page.setViewport({ width: 1440, height: 900 });
let H = {};
let docId;

// ---------- AUTH ----------
await safe('Auth', 'login flow', async () => {
  await page.goto(APP + '/patients', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => location.pathname === '/login', { timeout: 8000 }).catch(() => {});
  check('Auth', 'Protected page without login redirects to /login', page.url().endsWith('/login'), page.url());

  await page.type('#email', 'admin@doctortracker.com');
  await page.type('#password', 'WrongPassword1');
  await page.click('button[type=submit]');
  await page.waitForSelector('[role=alert]', { timeout: 8000 }).catch(() => {});
  const loginErr = await page.$eval('[role=alert]', (e) => e.textContent).catch(() => '');
  check('Auth', 'Wrong password shows a clear error and stays on login', /incorrect|invalid/i.test(loginErr) && page.url().endsWith('/login'), loginErr.trim());

  await clear('#email');
  await page.type('#email', '{"$ne":null}');
  check('Auth', 'Injection text in email field fails validation', !(await page.$eval('#email', (e) => e.checkValidity())));
  check('Auth', 'Password field length capped', (await page.$eval('#password', (e) => e.maxLength)) === 128);

  await page.click('button[aria-label="Show password"]');
  check('Auth', 'Show-password toggle reveals the text', (await page.$eval('#password', (e) => e.type)) === 'text');

  await clear('#email');
  await clear('#password');
  await page.type('#email', 'admin@doctortracker.com');
  await page.type('#password', 'Password123!');
  await Promise.all([page.waitForFunction(() => location.pathname === '/', { timeout: 20000 }), page.click('button[type=submit]')]);
  check('Auth', 'Correct credentials reach the dashboard', true);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  docId = (await (await fetch(API + '/doctors?limit=1&sortBy=name&order=asc', { headers: H })).json()).data[0]._id;
});

// ---------- RESPONSIVE ----------
await safe('Responsive', 'widths', async () => {
  const routes = { dashboard: '/', doctors: '/doctors', profile: `/doctors/${docId}`, patients: '/patients' };
  for (const w of [320, 375, 414, 768, 1024, 1280, 1920]) {
    await page.setViewport({ width: w, height: 860, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 });
    const overflows = [];
    for (const [name, path] of Object.entries(routes)) {
      await page.goto(APP + path, { waitUntil: 'networkidle0' });
      await wait(400);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w) overflows.push(`${name}:${sw}px`);
      if (w === 320 || w === 768) await page.screenshot({ path: `${OUT}/resp-${w}-${name}.png`, fullPage: true });
    }
    check('Responsive', `${w}px — no page scrolls sideways`, overflows.length === 0, overflows.join(', '));
  }
});
await safe('Responsive', 'mobile menu', async () => {
  await page.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true });
  await page.goto(APP + '/', { waitUntil: 'networkidle0' });
  const hidden = await page.$eval('aside', (a) => a.getBoundingClientRect().right <= 0);
  await page.click('button[aria-label="Open menu"]');
  await wait(350);
  const shown = await page.$eval('aside', (a) => a.getBoundingClientRect().left >= 0);
  await page.click('aside a[href="/patients"]');
  await page.waitForFunction(() => location.pathname === '/patients');
  await wait(350);
  const closed = await page.$eval('aside', (a) => a.getBoundingClientRect().right <= 0);
  check('Responsive', 'Mobile menu: hidden, opens, closes after navigating', hidden && shown && closed);
  const small = await page.$$eval('main button, main a, main select, main input', (els) =>
    els.filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.height < 24;
    }).map((e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 20))
  );
  check('Responsive', 'No tiny tap targets (<24px) on mobile Patients page', small.length === 0, small.join(', '));
  await page.setViewport({ width: 1024, height: 800 });
  await page.goto(APP + '/', { waitUntil: 'networkidle0' });
  check('Responsive', 'Sidebar permanently visible at 1024px', await page.$eval('aside', (a) => a.getBoundingClientRect().left === 0));
});

// ---------- DOCTOR FORM ----------
const fill = async (v) => {
  for (const [id, val] of Object.entries(v)) {
    await clear('#' + id);
    if (val !== '') await page.type('#' + id, String(val));
  }
};
const submit = async (formId) => {
  const valid = await page.$eval('#' + formId, (f) => f.checkValidity());
  if (!valid) return { blocked: true, msg: await page.$eval('#' + formId, (f) => [...f.elements].find((e) => !e.checkValidity())?.validationMessage) };
  await page.click(`button[form="${formId}"]`);
  await wait(1000);
  const err = await page.$eval(`#${formId} p.bg-critical-soft`, (e) => e.textContent).catch(() => null);
  return { blocked: false, err, open: !!(await page.$('#' + formId)) };
};
let qaDoc;
await safe('Doctor form', 'flow', async () => {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP + '/doctors', { waitUntil: 'networkidle0' });
  await page.click('main header button.btn-primary');
  await page.waitForSelector('#d-name');
  let r = await submit('doctor-form');
  check('Doctor form', 'Empty form cannot be submitted', r.blocked, r.msg);

  await fill({ 'd-name': 'QA Doctor', 'd-spec': 'Cardiology', 'd-hosp': 'QA Hospital', 'd-email': 'not-an-email', 'd-phone': '+1 555 000 1234' });
  r = await submit('doctor-form');
  check('Doctor form', 'Invalid email blocked in the browser', r.blocked, r.msg);

  await fill({ 'd-email': 'qa@nodomain' });
  r = await submit('doctor-form');
  check('Doctor form', 'Email without a domain ending rejected by server, message shown', !r.blocked && /valid email/i.test(r.err || ''), r.err);

  await fill({ 'd-email': 'qa-doc@example.com', 'd-phone': 'call me maybe' });
  r = await submit('doctor-form');
  check('Doctor form', 'Invalid phone rejected with message', /phone/i.test(r.err || ''), r.err);

  await fill({ 'd-phone': '+1 555 000 1234', 'd-exp': '500' });
  r = await submit('doctor-form');
  check('Doctor form', 'Experience of 500 years blocked', r.blocked, r.msg);
  await fill({ 'd-exp': '-3' });
  r = await submit('doctor-form');
  check('Doctor form', 'Negative experience blocked', r.blocked, r.msg);
  await fill({ 'd-exp': '7' });

  const existing = (await (await fetch(API + '/doctors?limit=1', { headers: H })).json()).data[0].email;
  await fill({ 'd-email': existing });
  r = await submit('doctor-form');
  check('Doctor form', 'Duplicate doctor email rejected with message', /already exists/i.test(r.err || ''), r.err);
  check('Doctor form', 'Name field length capped', (await page.$eval('#d-name', (e) => e.maxLength)) === 100);

  await fill({ 'd-name': 'Dr. José Ñúñez 李 <img src=x onerror=alert(1)>', 'd-email': 'qa-xss@example.com', 'd-bio': '<script>alert("bio")</script>Bio text' });
  r = await submit('doctor-form');
  check('Doctor form', 'Valid doctor (unicode + HTML in fields) saves and panel closes', !r.blocked && !r.open, r.err || '');
  await page.waitForSelector('[aria-live] div', { timeout: 3000 }).catch(() => {});
  const toast = await page.$eval('[aria-live]', (e) => e.textContent).catch(() => '');
  check('Doctor form', 'Success message shown', /added/i.test(toast), toast.trim());

  qaDoc = (await (await fetch(API + '/doctors?search=qa-xss', { headers: H })).json()).data[0];
  check('Security', 'HTML tags stripped before saving (stored XSS)', qaDoc && !/[<>]/.test(qaDoc.name + qaDoc.bio), qaDoc ? JSON.stringify(qaDoc.name) : 'not found');
  await page.goto(APP + '/doctors/' + qaDoc._id, { waitUntil: 'networkidle0' });
  await wait(500);
  check('Security', 'Profile renders that data without running any script', dialogs === 0, `alerts=${dialogs}`);
});

// ---------- PATIENT FORM ----------
await safe('Patient form', 'flow', async () => {
  await page.click('main button.btn-primary');
  await page.waitForSelector('#p-name');
  let r = await submit('patient-form');
  check('Patient form', 'Empty form cannot be submitted', r.blocked, r.msg);
  await fill({ 'p-name': 'QA Patient', 'p-age': '-5', 'p-cond': 'QA condition' });
  await page.select('#p-gender', 'Female');
  r = await submit('patient-form');
  check('Patient form', 'Negative age blocked', r.blocked, r.msg);
  await fill({ 'p-age': '131' });
  r = await submit('patient-form');
  check('Patient form', 'Age above 130 blocked', r.blocked, r.msg);
  await fill({ 'p-age': '45', 'p-email': 'bad@@mail' });
  r = await submit('patient-form');
  check('Patient form', 'Malformed email blocked', r.blocked, r.msg);
  await fill({ 'p-email': 'qa@x', 'p-phone': '12' });
  r = await submit('patient-form');
  check('Patient form', 'Server rejects short phone / bad email with a message', !r.blocked && !!r.err, r.err);
  await fill({ 'p-email': 'qa-patient@example.com', 'p-phone': '+44 20 7946 0958', 'p-notes': '"; db.dropDatabase(); //' });
  r = await submit('patient-form');
  check('Patient form', 'Valid patient (injection text in notes) saves', !r.blocked && !r.open, r.err || '');
});

// ---------- SEARCH ABUSE ----------
await safe('Search abuse', 'flow', async () => {
  await page.goto(APP + '/patients', { waitUntil: 'networkidle0' });
  for (const term of ['.*', '{"$ne":null}', "'; DROP TABLE patients;--", '<script>alert(1)</script>', '(a+)+$', 'ü李'.repeat(60)]) {
    await clear('input[type=search]');
    await page.type('input[type=search]', term);
    await wait(800);
    const txt = await page.$eval('main', (m) => m.textContent);
    const ok = /No patients match|Showing/.test(txt) && !/could not be loaded/.test(txt);
    check('Search abuse', `Search "${term.slice(0, 24)}" handled safely`, ok && dialogs === 0, /No patients match/.test(txt) ? 'empty state' : 'results');
  }
  const len = await page.$eval('input[type=search]', (e) => e.value.length);
  check('Search abuse', 'Search box capped at 100 characters', len <= 100, `${len} chars`);
  const dotStar = await (await fetch(API + '/patients?search=' + encodeURIComponent('.*'), { headers: H })).json();
  check('Search abuse', '".*" is matched literally, not as a wildcard', dotStar.pagination.total === 0, `total=${dotStar.pagination.total}`);
});

// ---------- URL TAMPERING ----------
await safe('URL tampering', 'flow', async () => {
  for (const id of ['not-a-real-id', '000000000000000000000000']) {
    await page.goto(APP + '/doctors/' + id, { waitUntil: 'networkidle0' });
    await wait(700);
    check('URL tampering', `/doctors/${id.slice(0, 12)}… shows "Doctor not found"`, await page.$eval('main', (m) => /Doctor not found/.test(m.textContent)));
  }
  await page.screenshot({ path: `${OUT}/doctor-not-found.png` });
  await page.goto(APP + '/patients?status=' + encodeURIComponent('<img src=x onerror=alert(2)>'), { waitUntil: 'networkidle0' });
  await wait(600);
  check('URL tampering', 'Script injected via ?status= does not run', dialogs === 0);
  await page.goto(APP + '/doctors?specialization=' + encodeURIComponent('{"$gt":""}'), { waitUntil: 'networkidle0' });
  await wait(700);
  check('URL tampering', 'Operator object in ?specialization= leaks nothing', await page.$eval('main', (m) => /No doctors match/.test(m.textContent)));
  const nf = await page.goto(APP + '/this-page-does-not-exist', { waitUntil: 'networkidle0' });
  check('URL tampering', 'Unknown page returns 404', nf.status() === 404, `status ${nf.status()}`);
  await page.screenshot({ path: `${OUT}/404.png` });
});

// ---------- KEYBOARD ----------
await safe('Keyboard', 'flow', async () => {
  await page.goto(APP + '/patients', { waitUntil: 'networkidle0' });
  await page.click('tbody tr td:nth-child(2)');
  await page.waitForSelector('[role=dialog]');
  await page.keyboard.press('Escape');
  await wait(300);
  check('Keyboard', 'Escape closes the edit panel', !(await page.$('[role=dialog]')));
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await wait(300);
  const open = !!(await page.$('[aria-label="Quick search"]'));
  await page.keyboard.press('Escape');
  await wait(200);
  check('Keyboard', 'Ctrl+K opens quick search, Escape closes it', open && !(await page.$('[aria-label="Quick search"]')));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const visible = await page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return el !== document.body && (s.boxShadow !== 'none' || s.outlineStyle !== 'none');
  });
  check('Keyboard', 'Keyboard focus is visible', visible);
});

// ---------- DELETE ----------
await safe('Delete', 'flow', async () => {
  await page.goto(APP + '/patients', { waitUntil: 'networkidle0' });
  await page.type('input[type=search]', 'QA Patient');
  await wait(900);
  await page.click('tbody tr button[aria-haspopup="menu"]');
  await page.click('[role=menuitem]:last-child');
  await page.waitForSelector('[role=alertdialog]');
  await page.click('[role=alertdialog] .btn-secondary');
  await wait(300);
  check('Delete', 'Cancel on the confirmation keeps the patient', (await page.$$eval('tbody tr', (t) => t.length)) === 1);
  await page.click('tbody tr button[aria-haspopup="menu"]');
  await page.click('[role=menuitem]:last-child');
  await page.waitForSelector('[role=alertdialog]');
  await page.click('[role=alertdialog] .btn-danger');
  await wait(1200);
  check('Delete', 'Confirmed delete removes the patient', await page.$eval('main', (m) => /No patients match/.test(m.textContent)));

  await page.goto(APP + '/doctors/' + docId, { waitUntil: 'networkidle0' });
  await page.click('button[aria-label="More actions"]');
  await page.click('[role=menuitem]');
  await page.waitForSelector('[role=alertdialog]');
  await page.click('[role=alertdialog] .btn-danger');
  await wait(1000);
  const msg = await page.$eval('[role=alertdialog]', (d) => d.textContent).catch(() => '');
  check('Delete', 'Deleting a doctor who still has patients is refused with an explanation', /still has/i.test(msg), msg.replace(/\s+/g, ' ').slice(0, 110));
  await page.click('[role=alertdialog] .btn-secondary');
});

// ---------- API DOWN ----------
await safe('Errors', 'flow', async () => {
  await page.setRequestInterception(true);
  const block = (req) => (req.url().startsWith(API) ? req.abort() : req.continue());
  page.on('request', block);
  for (const [name, path] of [['Doctors', '/doctors'], ['Patients', '/patients'], ['Dashboard', '/']]) {
    await page.goto(APP + path, { waitUntil: 'networkidle0' });
    await wait(900);
    const ok = await page.$eval('main', (m) => /could not be loaded/i.test(m.textContent) && /Try again/i.test(m.textContent));
    check('Errors', `API unreachable → clear error + "Try again" (${name})`, ok);
  }
  await page.screenshot({ path: `${OUT}/api-down.png` });
  page.off('request', block);
  await page.setRequestInterception(false);
  for (const b of await page.$$('main button')) {
    if ((await b.evaluate((e) => e.textContent.trim())) === 'Try again') {
      await b.click();
      break;
    }
  }
  await wait(1500);
  check('Errors', '"Try again" recovers once the API is back', await page.$eval('main', (m) => /Patients by clinical status/.test(m.textContent)));
});

// ---------- FORGED SESSION ----------
await safe('Auth', 'forged token', async () => {
  await page.evaluate(() => localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImhhY2tlciJ9.forgedsignature'));
  await page.goto(APP + '/patients', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => location.pathname === '/login', { timeout: 8000 }).catch(() => {});
  check('Auth', 'Forged token → logged out to /login', page.url().endsWith('/login'));
  check('Auth', 'Forged token wiped from storage', (await page.evaluate(() => localStorage.getItem('token'))) === null);
});

// ---------- CLEANUP ----------
await safe('Cleanup', 'flow', async () => {
  const qa = (await (await fetch(API + '/doctors?search=qa-&limit=100', { headers: H })).json()).data;
  for (const d of qa) {
    const pts = (await (await fetch(`${API}/doctors/${d._id}/patients?limit=100`, { headers: H })).json()).data;
    for (const p of pts) await fetch(`${API}/doctors/${d._id}/patients/${p._id}`, { method: 'DELETE', headers: H });
    await fetch(`${API}/doctors/${d._id}`, { method: 'DELETE', headers: H });
  }
  const left = (await (await fetch(API + '/patients?search=QA&limit=100', { headers: H })).json()).data.filter((p) => p.name.startsWith('QA'));
  for (const p of left) await fetch(`${API}/patients/${p._id}`, { method: 'DELETE', headers: H });
  const totals = (await (await fetch(API + '/dashboard/stats', { headers: H })).json()).data.totals;
  check('Cleanup', 'QA records removed, demo data intact (8 doctors / 23 patients)', totals.doctors === 8 && totals.patients === 23, JSON.stringify(totals));
});

check('Runtime', 'No JavaScript errors on any page', pageErrors.length === 0, pageErrors.join(' | '));
const failed = results.filter((x) => !x.pass);
console.log(`\nTOTAL ${results.length}  PASS ${results.length - failed.length}  FAIL ${failed.length}`);
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
await browser.close();
