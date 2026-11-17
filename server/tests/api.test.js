/**
 * API integration tests (node:test, no extra dependencies).
 * Uses the same cluster as MONGODB_URI but an isolated database named `doctor_tracker_test`,
 * which is dropped afterwards, so demo data is never touched.
 * Run: npm test
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

let server;
let base;
let token;

const api = async (method, path, body, auth = true) => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'doctor_tracker_test' });
  await mongoose.connection.dropDatabase();
  await Promise.all([User.syncIndexes(), Doctor.syncIndexes(), Patient.syncIndexes()]);
  await User.create({ name: 'Test Admin', email: 'test@example.com', password: 'Secret123!' });
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

test('protected routes reject requests without a token', async () => {
  const res = await api('GET', '/doctors', null, false);
  assert.equal(res.status, 401);
});

test('login rejects a wrong password with a generic message', async () => {
  const res = await api('POST', '/auth/login', { email: 'test@example.com', password: 'wrong' }, false);
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'Invalid email or password');
});

test('login succeeds and returns a JWT', async () => {
  const res = await api('POST', '/auth/login', { email: 'test@example.com', password: 'Secret123!' }, false);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.token.split('.').length, 3);
  assert.equal(res.body.data.password, undefined);
  token = res.body.data.token;
});

test('public self-registration is closed', async () => {
  const res = await api('POST', '/auth/register', { name: 'x', email: 'x@example.com', password: 'Secret123!' }, false);
  assert.equal(res.status, 401);
});

test('NoSQL operator injection in login is neutralised', async () => {
  const res = await api('POST', '/auth/login', { email: { $ne: null }, password: { $ne: null } }, false);
  assert.equal(res.status, 400);
});

let doctorId;
let patientId;

test('creates a doctor and rejects a duplicate email', async () => {
  const doc = { name: 'Dr. Test', specialization: 'Cardiology', hospital: 'City', phone: '123', email: 'dr@example.com' };
  const res = await api('POST', '/doctors', doc);
  assert.equal(res.status, 201);
  doctorId = res.body.data._id;
  const dup = await api('POST', '/doctors', doc);
  assert.equal(dup.status, 400);
});

test('rejects non-string doctor fields with 400 instead of crashing', async () => {
  const res = await api('POST', '/doctors', { name: ['a'], specialization: 'x', hospital: 'y', phone: '1', email: 1 });
  assert.equal(res.status, 400);
});

test('lists, searches and paginates doctors', async () => {
  const res = await api('GET', '/doctors?search=cardio&page=1&limit=5');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.pagination.total, 1);
  assert.equal(res.body.data[0].patientCount, 0);
});

test('adds a patient under a doctor and validates email', async () => {
  const bad = await api('POST', `/doctors/${doctorId}/patients`, { name: 'P', age: 30, gender: 'Female', condition: 'Flu', email: 'nope' });
  assert.equal(bad.status, 400);
  const res = await api('POST', `/doctors/${doctorId}/patients`, { name: 'Jane Roe', age: 30, gender: 'Female', condition: 'Influenza' });
  assert.equal(res.status, 201);
  patientId = res.body.data._id;
});

test('edits a patient and rejects an invalid age', async () => {
  const bad = await api('PUT', `/patients/${patientId}`, { age: 500 });
  assert.equal(bad.status, 400);
  const res = await api('PUT', `/patients/${patientId}`, { status: 'Recovering', condition: 'Influenza A' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'Recovering');
});

test('filters patients by condition and status', async () => {
  const res = await api('GET', '/patients?condition=influenza&status=Recovering');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
});

test('refuses to delete a doctor who still has patients', async () => {
  const res = await api('DELETE', `/doctors/${doctorId}`);
  assert.equal(res.status, 409);
});

test('dashboard returns aggregated stats', async () => {
  const res = await api('GET', '/dashboard/stats');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.totals.doctors, 1);
  assert.equal(res.body.data.totals.patients, 1);
  assert.equal(res.body.data.patientsPerDoctor[0].patientCount, 1);
});

test('removes the patient from the doctor roster, then the doctor can be deleted', async () => {
  const del = await api('DELETE', `/doctors/${doctorId}/patients/${patientId}`);
  assert.equal(del.status, 200);
  const res = await api('DELETE', `/doctors/${doctorId}`);
  assert.equal(res.status, 200);
});

test('invalid ObjectId returns 400', async () => {
  const res = await api('GET', '/patients/not-an-id');
  assert.equal(res.status, 400);
});
