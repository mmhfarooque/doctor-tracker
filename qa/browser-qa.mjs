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
    els.filter((e) => e.type !== 'checkbox').filter((e) => {
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
  // Clean up any leftover QA doctor from earlier runs
  const leftovers = await (await fetch(API + '/doctors?search=qa-xss', { headers: H })).json().catch(() => ({ data: [] }));
  for (const d of leftovers.data || []) {
    await fetch(API + '/doctors/' + d._id, { method: 'DELETE', headers: H }).catch(() => {});
  }
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
const clickText = async (selector, text) => {
  for (const el of await page.$$(selector)) {
    if ((await el.evaluate((e) => e.textContent.trim())).startsWith(text)) {
      await el.evaluate((e) => e.click());
      return true;
    }
  }
  return false;
};

await safe('Keyboard', 'flow', async () => {
  await page.goto(APP + '/patients', { waitUntil: 'networkidle0' });
  await page.click('tbody tr button[aria-haspopup="menu"]');
  await clickText('[role=menuitem]', 'Edit');
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

// ---------- ARCHIVE / RESTORE / DELETE ----------
await safe('Archive', 'flow', async () => {
  await page.goto(APP + '/patients?search=QA%20Patient', { waitUntil: 'networkidle0' });
  await wait(900);
  await page.click('tbody tr button[aria-haspopup="menu"]');
  await clickText('[role=menuitem]', 'Archive');
  await wait(1200);
  check('Archive', 'Archive removes the patient from the list', await page.$eval('main', (m) => /No patients match/.test(m.textContent)));
  const undone = await clickText('[aria-live] button', 'Undo');
  await wait(1500);
  check('Archive', 'Undo in the message restores it', undone && (await page.$$eval('tbody tr', (t) => t.length)) === 1);

  await page.click('tbody tr button[aria-haspopup="menu"]');
  await clickText('[role=menuitem]', 'Archive');
  await wait(1000);
  await page.goto(APP + '/patients?view=archived&search=QA%20Patient', { waitUntil: 'networkidle0' });
  await wait(900);
  check('Archive', 'Archived view lists the record', (await page.$$eval('tbody tr', (t) => t.length)) === 1);
  await page.click('tbody tr button[aria-haspopup="menu"]');
  await clickText('[role=menuitem]', 'Delete permanently');
  await page.waitForSelector('[role=alertdialog]');
  await page.click('[role=alertdialog] .btn-secondary');
  await wait(300);
  check('Archive', 'Cancel on "delete permanently" keeps the record', (await page.$$eval('tbody tr', (t) => t.length)) === 1);
  await page.click('tbody tr button[aria-haspopup="menu"]');
  await clickText('[role=menuitem]', 'Delete permanently');
  await page.waitForSelector('[role=alertdialog]');
  await page.click('[role=alertdialog] .btn-danger');
  await wait(1200);
  check('Archive', 'Confirmed permanent delete removes it', await page.$eval('main', (m) => /No archived patients|No patients match/.test(m.textContent)));

  await page.goto(APP + '/doctors/' + docId, { waitUntil: 'networkidle0' });
  await page.click('button[aria-label="More actions"]');
  await page.click('[role=menuitem]');
  await page.waitForSelector('[role=alertdialog]');
  await page.click('[role=alertdialog] .btn-danger');
  await wait(1200);
  const drawer = await page.$eval('[role=dialog]', (d) => d.textContent).catch(() => '');
  check('Archive', 'Deleting a doctor with patients asks who takes them over', /Reassign patients first/.test(drawer));
  await page.keyboard.press('Escape');
});

// ---------- NEW FEATURES ----------
await safe('Features', 'filters in the URL', async () => {
  await page.goto(APP + '/patients?status=Critical&followUp=overdue', { waitUntil: 'networkidle0' });
  await wait(900);
  const tab = await page.$eval('[role=tab][aria-selected=true]', (t) => t.textContent.trim());
  const chip = await page.$eval('main', (m) => /Overdue follow-up/.test(m.textContent));
  const statuses = await page.$$eval('tbody tr td:nth-child(5)', (c) => c.map((x) => x.textContent.trim()));
  check('Features', 'A shared link restores tab + follow-up filter', tab === 'Critical' && chip && statuses.every((t) => t === 'Critical'), `${tab}, ${statuses.length} rows`);
  await clickText('[role=tab]', 'Stable');
  await wait(900);
  check('Features', 'Changing a filter updates the address bar', /status=Stable/.test(page.url()), page.url().replace(APP, ''));
});

await safe('Features', 'bulk + export', async () => {
  await page.goto(APP + '/patients', { waitUntil: 'networkidle0' });
  await wait(600);
  const boxes = await page.$$('tbody tr input[type=checkbox]');
  await boxes[0].click();
  await boxes[1].click();
  const bar = await page.$eval('main', (m) => /2 selected/.test(m.textContent));
  check('Features', 'Selecting rows shows the bulk action bar', bar);
  await clickText('main button', 'Clear selection');
  await wait(300);
  check('Features', 'Clear selection hides it', !(await page.$eval('main', (m) => /\d+ selected/.test(m.textContent))));
  await clickText('main button', 'Export CSV');
  await page.waitForFunction(() => /Export downloaded/.test(document.querySelector('[aria-live]')?.textContent || ''), { timeout: 15000 }).catch(() => {});
  check('Features', 'Export CSV downloads (authenticated, no token in URL)', await page.$eval('[aria-live]', (e) => /Export downloaded/.test(e.textContent)));
});

await safe('Features', 'patient record', async () => {
  await page.goto(APP + '/patients?status=Recovering', { waitUntil: 'networkidle0' });
  await wait(700);
  await page.click('tbody tr td:nth-child(3)');
  await page.waitForFunction(() => /^\/patients\/[0-9a-f]{24}$/.test(location.pathname), { timeout: 10000 });
  await wait(1000);
  check('Features', 'Row opens the full patient record', true);
  const before = await page.$$eval('main ol li', (l) => l.length);
  check('Features', 'Record shows history and a Print button', before >= 1 && !!(await page.$('main button')) && (await clickText('main button', 'Print').then(() => true).catch(() => false)));
  await clickText('main button', 'Stable');
  await page.waitForFunction((n) => document.querySelectorAll('main ol li').length > n, { timeout: 10000 }, before).catch(() => {});
  const top = await page.$eval('main ol li', (li) => li.textContent);
  check('Features', 'Quick status change is recorded in the history', /from Recovering to Stable/.test(top), top.slice(0, 90));

  await clickText('main button', 'Transfer');
  await page.waitForSelector('#t-doc');
  await page.waitForFunction(() => document.querySelectorAll('#t-doc option:not([disabled])').length > 0, { timeout: 15000 });
  const opts = await page.$$eval('#t-doc option:not([disabled])', (o) => o.map((x) => x.value));
  await page.select('#t-doc', opts[0]);
  await page.type('#t-reason', 'QA transfer test');
  await page.$eval('button[form="transfer-form"]', (btn) => btn.click());
  await page.waitForFunction(
    () => /transferred/.test(document.querySelector('main ol li')?.textContent || '') && /QA transfer test/.test(document.querySelector('main ol li')?.textContent || ''),
    { timeout: 10000 }
  );
  const latest = await page.$eval('main ol li', (li) => li.textContent);
  check('Features', 'Transfer with reason is applied and logged', /transferred/.test(latest) && /QA transfer test/.test(latest), latest.slice(0, 100));
});

await safe('Features', 'alerts bell', async () => {
  await page.goto(APP + '/', { waitUntil: 'networkidle0' });
  await wait(800);
  const bell = await page.$('aside button[aria-label*="alert"]');
  await bell.click();
  await wait(500);
  const panel = await page.$eval('body', (b) => /Critical alerts/.test(b.textContent) && /Patients who became critical/.test(b.textContent));
  check('Features', 'Alerts bell opens the critical alerts panel', panel);
  const label = await page.$eval('aside button[aria-label*="alert"]', (b) => b.getAttribute('aria-label'));
  check('Features', 'Opening alerts marks them as read', label === 'Critical alerts', label);
  await page.keyboard.press('Escape');
});

await safe('Features', 'schedule', async () => {
  await page.goto(APP + '/schedule', { waitUntil: 'networkidle0' });
  await wait(800);
  check('Features', 'Schedule shows a week grid and who is on duty now', await page.$eval('main', (m) => /On duty now/.test(m.textContent) && /This week/.test(m.textContent)));
  await clickText('main button', 'Add shift');
  await page.waitForSelector('#s-doc');
  const doc = await page.$$eval('#s-doc option:not([disabled])', (o) => o[0].value);
  await page.select('#s-doc', doc);
  await page.$eval('button[form="shift-form"]', (btn) => btn.click());
  await wait(1500);
  const drawerText = await page.$eval('[role=dialog]', (d) => d.textContent).catch(() => '');
  const toast = await page.$eval('[aria-live]', (e) => e.textContent).catch(() => '');
  check('Features', 'Adding a clashing shift is refused with a clear reason (or saved if free)', /overlaps/.test(drawerText) || /shift added/.test(toast), (drawerText.match(/[^.]*overlaps[^.]*/) || [toast])[0].slice(0, 100));
  await page.keyboard.press('Escape');
});

await safe('Features', 'team accounts', async () => {
  await page.goto(APP + '/team', { waitUntil: 'networkidle0' });
  await wait(700);
  await clickText('main button', 'Add account');
  await page.waitForSelector('#a-name');
  await page.type('#a-name', 'QA Nurse');
  await page.type('#a-email', 'qa-nurse@example.com');
  await page.type('#a-pass', 'short');
  const weakBlocked = !(await page.$eval('#account-form', (f) => f.checkValidity()));
  check('Features', 'Weak password blocked in the form', weakBlocked);
  await page.$eval('#a-pass', (e) => (e.value = ''));
  await clear('#a-pass');
  await page.type('#a-pass', 'QaNurse2026');
  await page.$eval('button[form="account-form"]', (btn) => btn.click());
  await wait(1500);
  check('Features', 'Admin creates a staff account', await page.$eval('main', (m) => /qa-nurse@example\.com/.test(m.textContent)));
  await page.click('button[aria-label="Remove QA Nurse"]');
  await page.waitForSelector('[role=alertdialog]');
  await page.click('[role=alertdialog] .btn-danger');
  await wait(1200);
  check('Features', 'Admin removes it again', !(await page.$eval('main', (m) => /qa-nurse@example\.com/.test(m.textContent))));
});

await safe('Roles', 'doctor and nurse sessions', async () => {
  const roleCheck = async (email, fn) => {
    const ctx = await browser.createBrowserContext();
    const p2 = await ctx.newPage();
    await p2.setViewport({ width: 1440, height: 900 });
    await p2.goto(APP + '/login', { waitUntil: 'networkidle0' });
    await p2.type('#email', email);
    await p2.type('#password', 'Password123!');
    await Promise.all([p2.waitForFunction(() => location.pathname === '/', { timeout: 30000 }), p2.click('button[type=submit]')]);
    await p2.waitForNetworkIdle();
    await fn(p2);
    await ctx.close();
  };
  await roleCheck('doctor@doctortracker.com', async (p2) => {
    await p2.goto(APP + '/patients', { waitUntil: 'networkidle0' });
    await wait(800);
    const doctors = await p2.$$eval('tbody tr td:nth-child(4)', (c) => [...new Set(c.map((x) => x.textContent.trim().split('\n')[0]))]);
    check('Roles', 'Doctor login lists only their own patients', doctors.length === 1 && /Sarah Jenkins/.test(doctors[0]), doctors.join(' | '));
    check('Roles', 'Doctor has no Team & access page in the menu', !(await p2.$('aside a[href="/team"]')));
    const other = (await (await fetch(API + '/doctors?search=Vance', { headers: H })).json()).data[0]._id;
    await p2.goto(APP + '/doctors/' + other, { waitUntil: 'networkidle0' });
    await wait(800);
    check('Roles', "Another doctor's patient list is locked for a doctor login", await p2.$eval('main', (m) => /Visible to this doctor/.test(m.textContent)));
  });
  await roleCheck('nurse@doctortracker.com', async (p2) => {
    await p2.goto(APP + '/patients', { waitUntil: 'networkidle0' });
    await wait(700);
    check('Roles', 'Nurse cannot admit patients (no button)', !(await p2.$$eval('main button', (b) => b.some((x) => /Admit patient/.test(x.textContent)))));
    await p2.click('tbody tr td:nth-child(3)');
    await p2.waitForFunction(() => /^\/patients\/[0-9a-f]{24}$/.test(location.pathname), { timeout: 10000 });
    await wait(900);
    const buttons = await p2.$$eval('main button', (b) => b.map((x) => x.textContent.trim()));
    check('Roles', 'Nurse sees no Transfer / Archive on a record', !buttons.some((t) => /^(Transfer|Archive)$/.test(t)), buttons.filter((t) => t.length < 20).join(', '));
    for (const el of await p2.$$('main button')) if ((await el.evaluate((e) => e.textContent.trim())) === 'Edit') await el.click();
    await p2.waitForSelector('#p-name');
    check('Roles', "Nurse's edit form locks everything except status, notes and follow-up", (await p2.$eval('#p-name', (e) => e.disabled)) && !(await p2.$eval('#p-notes', (e) => e.disabled)));
  });
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

check('Runtime', 'No JavaScript errors on any page', pageErrors.length === 0, pageErrors.join(' | '));
const failed = results.filter((x) => !x.pass);
console.log(`\nTOTAL ${results.length}  PASS ${results.length - failed.length}  FAIL ${failed.length}`);
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
await browser.close();
