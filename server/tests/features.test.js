/**
 * Feature tests: roles & permissions, history, transfers, follow-ups, discharge / length of stay,
 * capacity, alerts, shifts, archive / restore, bulk actions, CSV export and staff accounts.
 * Runs against its own isolated database (dropped afterwards).
 */
import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test_secret_that_is_definitely_longer_than_32_chars';

const { default: app } = await import('../src/app.js');
const { default: User } = await import('../src/models/User.js');
const { default: Doctor } = await import('../src/models/Doctor.js');
const { default: Patient } = await import('../src/models/Patient.js');
const { default: Activity } = await import('../src/models/Activity.js');
const { default: Shift } = await import('../src/models/Shift.js');

let server;
let base;
const tokens = {};
let docA;
let docB;

const call = async (who, method, path, body) => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(tokens[who] ? { Authorization: `Bearer ${tokens[who]}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, body: json, text, headers: res.headers };
};

const login = async (email) => {
  const res = await call(null, 'POST', '/auth/login', { email, password: 'Secret123!' });
  assert.equal(res.status, 200, `login ${email}`);
  return res.body.data.token;
};

const admit = (who, body) => call(who, 'POST', '/patients', { age: 40, gender: 'Female', condition: 'Observation', ...body });

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'doctor_tracker_test_features' });
  await mongoose.connection.dropDatabase();
  await Promise.all([User, Doctor, Patient, Activity, Shift].map((m) => m.syncIndexes()));
  docA = await Doctor.create({ name: 'Dr. Alpha', specialization: 'Cardiology', hospital: 'H1', phone: '+1 555 000 0001', email: 'a@example.com', maxPatients: 2 });
  docB = await Doctor.create({ name: 'Dr. Beta', specialization: 'Neurology', hospital: 'H2', phone: '+1 555 000 0002', email: 'b@example.com' });
  await User.create([
    { name: 'Admin', email: 'admin@t.com', password: 'Secret123!', role: 'admin' },
    { name: 'Dr. Alpha', email: 'doc@t.com', password: 'Secret123!', role: 'doctor', doctor: docA._id },
    { name: 'Nurse', email: 'nurse@t.com', password: 'Secret123!', role: 'nurse' },
  ]);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  tokens.admin = await login('admin@t.com');
  tokens.doctor = await login('doc@t.com');
  tokens.nurse = await login('nurse@t.com');
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

const ids = {};

test('login returns the role', async () => {
  const me = await call('doctor', 'GET', '/auth/me');
  assert.equal(me.body.data.role, 'doctor');
  assert.equal(me.body.data.doctor.name, 'Dr. Alpha');
});

test('admin admits patients under any doctor', async () => {
  const a1 = await admit('admin', { name: 'Ann A', doctor: String(docA._id) });
  const a2 = await admit('admin', { name: 'Ben A', doctor: String(docA._id), status: 'Critical' });
  const b1 = await admit('admin', { name: 'Cal B', doctor: String(docB._id) });
  assert.equal(a1.status, 201);
  assert.equal(b1.status, 201);
  ids.a1 = a1.body.data._id;
  ids.a2 = a2.body.data._id;
  ids.b1 = b1.body.data._id;
});

test('doctor sees only their own patients', async () => {
  const list = await call('doctor', 'GET', '/patients?limit=50');
  assert.equal(list.body.pagination.total, 2);
  assert.ok(list.body.data.every((p) => p.doctor._id === String(docA._id)));
  assert.equal((await call('doctor', 'GET', `/patients/${ids.b1}`)).status, 404);
  assert.equal((await call('doctor', 'GET', `/doctors/${docB._id}/patients`)).status, 403);
});

test('doctor cannot manage doctors; admitting is forced under themselves', async () => {
  assert.equal((await call('doctor', 'POST', '/doctors', { name: 'X' })).status, 403);
  const p = await admit('doctor', { name: 'Dee A', doctor: String(docB._id) });
  assert.equal(p.status, 201);
  assert.equal(p.body.data.doctor._id, String(docA._id));
  ids.a3 = p.body.data._id;
});

test('nurse can update status / notes / follow-up but nothing else', async () => {
  const ok = await call('nurse', 'PUT', `/patients/${ids.b1}`, { status: 'Recovering', notes: 'Walking today' });
  assert.equal(ok.status, 200);
  const bad = await call('nurse', 'PUT', `/patients/${ids.b1}`, { name: 'Renamed' });
  assert.equal(bad.status, 403);
  assert.equal((await admit('nurse', { name: 'Nope', doctor: String(docA._id) })).status, 403);
  assert.equal((await call('nurse', 'POST', `/patients/${ids.b1}/archive`)).status, 403);
  assert.equal((await call('nurse', 'GET', '/users')).status, 403);
});

test('status changes are recorded in the patient history', async () => {
  await call('admin', 'PUT', `/patients/${ids.a1}`, { status: 'Critical' });
  const h = await call('admin', 'GET', `/patients/${ids.a1}/history`);
  assert.equal(h.status, 200);
  const types = h.body.data.map((e) => e.type);
  assert.ok(types.includes('patient.admitted'));
  const change = h.body.data.find((e) => e.type === 'patient.status');
  assert.equal(change.from, 'Stable');
  assert.equal(change.to, 'Critical');
  assert.equal(change.actor.role, 'admin');
});

test('critical alerts: unread count, scoped per doctor, mark as seen', async () => {
  const nurseAlerts = await call('nurse', 'GET', '/alerts');
  assert.ok(nurseAlerts.body.data.unread >= 2); // Ben admitted Critical + Ann → Critical
  await call('nurse', 'POST', '/alerts/seen');
  assert.equal((await call('nurse', 'GET', '/alerts')).body.data.unread, 0);
  const docAlerts = await call('doctor', 'GET', '/alerts');
  assert.ok(docAlerts.body.data.items.every((a) => a.doctors.map(String).includes(String(docA._id))));
});

test('doctor transfers own patient; it leaves their list and is logged', async () => {
  const t = await call('doctor', 'POST', `/patients/${ids.a3}/transfer`, { doctor: String(docB._id), reason: 'Neurology review' });
  assert.equal(t.status, 200);
  assert.equal((await call('doctor', 'GET', `/patients/${ids.a3}`)).status, 404);
  const h = await call('admin', 'GET', `/patients/${ids.a3}/history`);
  const ev = h.body.data.find((e) => e.type === 'patient.transferred');
  assert.equal(ev.from, 'Dr. Alpha');
  assert.equal(ev.to, 'Dr. Beta');
  assert.equal(ev.note, 'Neurology review');
});

test('follow-ups: overdue / today filters and dashboard counts', async () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);
  await call('nurse', 'PUT', `/patients/${ids.a1}`, { followUpDate: yesterday });
  await call('nurse', 'PUT', `/patients/${ids.a2}`, { followUpDate: noon.toISOString() });
  assert.equal((await call('admin', 'GET', '/patients?followUp=overdue')).body.pagination.total, 1);
  assert.equal((await call('admin', 'GET', '/patients?followUp=today')).body.pagination.total, 1);
  const dash = await call('admin', 'GET', '/dashboard/stats');
  assert.equal(dash.body.data.followUps.overdue, 1);
  assert.equal(dash.body.data.followUps.today, 1);
});

test('discharge sets a discharge date and feeds length of stay', async () => {
  const r = await call('admin', 'PUT', `/patients/${ids.b1}`, { status: 'Discharged' });
  assert.ok(r.body.data.dischargeDate);
  const dash = await call('admin', 'GET', '/dashboard/stats');
  assert.equal(typeof dash.body.data.totals.avgLengthOfStay, 'number');
  const back = await call('admin', 'PUT', `/patients/${ids.b1}`, { status: 'Stable' });
  assert.equal(back.body.data.dischargeDate, null);
});

test('capacity: a doctor at their maximum is flagged', async () => {
  const dash = await call('admin', 'GET', '/dashboard/stats');
  const alpha = dash.body.data.overCapacity.find((d) => d.doctorName === 'Dr. Alpha');
  assert.ok(alpha, 'Dr. Alpha (2/2) should be flagged');
  const list = await call('admin', 'GET', '/doctors?search=Alpha');
  assert.equal(list.body.data[0].maxPatients, 2);
});

test('doctor dashboard only counts their own patients', async () => {
  const dash = await call('doctor', 'GET', '/dashboard/stats');
  assert.equal(dash.body.data.scope, 'doctor');
  assert.equal(dash.body.data.totals.patients, 2);
});

test('archive hides, restore brings back, permanent delete removes', async () => {
  assert.equal((await call('admin', 'POST', `/patients/${ids.a2}/archive`)).status, 200);
  assert.equal((await call('admin', 'GET', `/patients/${ids.a2}`)).status, 404);
  const archived = await call('admin', 'GET', '/patients?archived=true');
  assert.equal(archived.body.pagination.total, 1);
  // non-admins cannot list archived records
  assert.equal((await call('nurse', 'GET', '/patients?archived=true')).body.data.some((p) => p._id === ids.a2), false);
  assert.equal((await call('admin', 'POST', `/patients/${ids.a2}/restore`)).status, 200);
  assert.equal((await call('admin', 'GET', `/patients/${ids.a2}`)).status, 200);
});

test('bulk status update by nurse; bulk archive needs admin', async () => {
  const r = await call('nurse', 'POST', '/patients/bulk', { action: 'status', status: 'Stable', ids: [ids.a1, ids.a2, 'not-an-id'] });
  assert.equal(r.status, 200);
  assert.equal(r.body.updated, 2);
  assert.equal((await call('nurse', 'POST', '/patients/bulk', { action: 'archive', ids: [ids.a1] })).status, 403);
  const empty = await call('admin', 'POST', '/patients/bulk', { action: 'status', status: 'Stable', ids: [] });
  assert.equal(empty.status, 400);
});

test('CSV export is scoped and neutralises spreadsheet formulas', async () => {
  await admit('admin', { name: '=HYPERLINK("http://evil")', doctor: String(docA._id) });
  const r = await fetch(`${base}/api/patients/export`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/csv/);
  const bytes = new Uint8Array(await r.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], 'UTF-8 BOM so Excel reads names correctly');
  const csv = new TextDecoder().decode(bytes);
  assert.match(csv, /^Name,Age,Gender/);
  assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"")"`), 'formula cell must be prefixed with a quote');
  const docCsv = await (await fetch(`${base}/api/patients/export`, { headers: { Authorization: `Bearer ${tokens.doctor}` } })).text();
  assert.ok(!docCsv.includes('Cal B'), 'doctor export must not include other doctors’ patients');
});

test('shifts: admin schedules, overlaps rejected, nurse cannot schedule, on-call shows on dashboard', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000);
  const day = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const s = await call('admin', 'POST', '/shifts', { doctor: String(docB._id), date: today, type: 'Day' });
  assert.equal(s.status, 201);
  assert.equal((await call('admin', 'POST', '/shifts', { doctor: String(docB._id), date: today, type: 'On-call' })).status, 409);
  assert.equal((await call('nurse', 'POST', '/shifts', { doctor: String(docB._id), date: today, type: 'Night' })).status, 403);
  assert.equal((await call('admin', 'POST', '/shifts', { doctor: String(docB._id), date: 'tomorrow', type: 'Day' })).status, 400);
  // 24h on-call that started yesterday 08:00 may or may not cover "now"; create one that certainly does
  await Shift.create({ doctor: docA._id, type: 'On-call', start: new Date(Date.now() - 3600000), end: new Date(Date.now() + 3600000) });
  const list = await call('nurse', 'GET', `/shifts?from=${day}&days=3`);
  assert.ok(list.body.data.length >= 2);
  const dash = await call('nurse', 'GET', '/dashboard/stats');
  assert.ok(dash.body.data.onCall.some((x) => x.doctor.name === 'Dr. Alpha'));
});

test('staff accounts: admin creates a linked doctor login; rules enforced', async () => {
  const weak = await call('admin', 'POST', '/users', { name: 'D', email: 'd2@t.com', password: 'short', role: 'nurse' });
  assert.equal(weak.status, 400);
  const dupLink = await call('admin', 'POST', '/users', { name: 'Dup', email: 'dup@t.com', password: 'Secret123!', role: 'doctor', doctor: String(docA._id) });
  assert.equal(dupLink.status, 400);
  const ok = await call('admin', 'POST', '/users', { name: 'Dr. Beta', email: 'beta@t.com', password: 'Secret123!', role: 'doctor', doctor: String(docB._id) });
  assert.equal(ok.status, 201);
  const users = await call('admin', 'GET', '/users');
  assert.equal(users.body.data.length, 4);
  assert.ok(users.body.data.every((u) => u.password === undefined));
  const self = users.body.data.find((u) => u.email === 'admin@t.com');
  assert.equal((await call('admin', 'DELETE', `/users/${self._id}`)).status, 400);
});

test('doctor cannot read another caseload through directory or profile', async () => {
  const list = await call('doctor', 'GET', '/doctors?limit=100');
  assert.equal(list.body.data.find((d) => d._id === String(docB._id)).patientCount, undefined);
  const profile = await call('doctor', 'GET', `/doctors/${docB._id}`);
  assert.equal(profile.body.data.statusCounts, undefined);
  assert.equal(profile.body.data.patientCount, undefined);
});

test('transfers require reasons and revoke all former doctor activity access', async () => {
  const patient = await admit('doctor', { name: 'Transferred private record', status: 'Critical' });
  const id = patient.body.data._id;
  assert.equal((await call('doctor', 'POST', `/patients/${id}/transfer`, { doctor: String(docB._id) })).status, 400);
  assert.equal((await call('admin', 'PUT', `/patients/${id}`, { doctor: String(docB._id) })).status, 403);
  assert.equal((await call('doctor', 'POST', `/patients/${id}/transfer`, { doctor: String(docB._id), reason: 'Specialist review' })).status, 200);
  for (const path of ['/activity', '/alerts', '/dashboard/stats']) {
    const result = await call('doctor', 'GET', path);
    assert.equal(JSON.stringify(result.body).includes('Transferred private record'), false, path);
  }
  assert.equal((await call('doctor', 'GET', `/patients/${id}/history`)).status, 404);
});

test('audit failure rolls back clinical changes', async () => {
  const patient = await admit('doctor', { name: 'Audit rollback', notes: 'Original' });
  const id = patient.body.data._id;
  const original = Activity.insertMany;
  try {
    Activity.insertMany = async () => { throw new Error('Synthetic audit failure'); };
    assert.equal((await call('doctor', 'PUT', `/patients/${id}`, { notes: 'Must roll back' })).status, 500);
    assert.equal((await Patient.findById(id)).notes, 'Original');
  } finally { Activity.insertMany = original; }
});

test('detail audit records capture actor and before/after values', async () => {
  const patient = await admit('doctor', { name: 'Audit detail', notes: 'Before' });
  const id = patient.body.data._id;
  assert.equal((await call('doctor', 'PUT', `/patients/${id}`, { notes: 'After' })).status, 200);
  const event = await Activity.findOne({ patient: id, type: 'patient.updated' });
  assert.equal(event.changes[0].field, 'notes');
  assert.equal(event.changes[0].from, 'Before');
  assert.equal(event.changes[0].to, 'After');
  assert.equal(event.actor.role, 'doctor');
  assert.ok(event.actor.id);
  assert.ok(event.createdAt);
});

test('independent limiter instances share atomic counters', async () => {
  const { MongoRateLimitStore } = await import('../src/utils/rateLimitStore.js');
  const stores = [new MongoRateLimitStore('test'), new MongoRateLimitStore('test')];
  stores.forEach((store) => store.init({ windowMs: 900000 }));
  await stores[0].resetKey('shared');
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => stores[i % 2].increment('shared')));
  assert.deepEqual(results.map((r) => r.totalHits).sort((a, b) => a - b), [1,2,3,4,5,6,7,8,9,10]);
});

test('reassign a whole caseload, then the doctor can be deleted', async () => {
  assert.equal((await call('admin', 'DELETE', `/doctors/${docA._id}`)).status, 409);
  const r = await call('admin', 'POST', `/doctors/${docA._id}/reassign`, { doctor: String(docB._id) });
  assert.equal(r.status, 200);
  assert.ok(r.body.moved >= 2);
  // the doctor login linked to Alpha must go too before the doctor record is removed in a real flow; record delete itself is allowed now
  assert.equal((await call('admin', 'DELETE', `/doctors/${docA._id}`)).status, 200);
});
