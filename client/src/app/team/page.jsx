'use client';

import { useState } from 'react';
import { Check, Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, can } from '../../lib/permissions';
import PageHeader from '../../components/ui/PageHeader';
import Avatar from '../../components/ui/Avatar';
import Drawer from '../../components/ui/Drawer';
import Field from '../../components/ui/Field';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { apiError, formatDate } from '../../lib/format';

const ROLE_TONES = { admin: 'bg-ink text-white', doctor: 'bg-recovering-soft text-recovering', nurse: 'bg-pine-50 text-pine-800' };

// Mirrors the API's rules so admins can see exactly what each role is allowed to do
const MATRIX = [
  ['See patients', 'All', 'Own only', 'All'],
  ['Admit, edit and transfer patients', true, 'Own only', false],
  ['Update status, notes and follow-ups', true, 'Own only', true],
  ['Archive, restore and delete patients', true, false, false],
  ['Add and edit doctors', true, false, false],
  ['Manage shifts', true, false, false],
  ['Manage staff accounts', true, false, false],
];

const Cell = ({ v }) =>
  v === true ? (
    <Check className="mx-auto h-4 w-4 text-stable" aria-label="Allowed" />
  ) : v === false ? (
    <Minus className="mx-auto h-4 w-4 text-faint" aria-label="Not allowed" />
  ) : (
    <span className="text-[13px] text-ink-soft">{v}</span>
  );

export default function TeamPage() {
  const { user } = useAuth();
  const notify = useToast();
  const allowed = can(user, 'team.manage');
  const usersReq = useApi(allowed ? '/users' : null, 'Staff accounts could not be loaded.');
  const users = usersReq.data?.data || [];
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!allowed) {
    return (
      <div className="panel">
        <EmptyState icon={ShieldCheck} title="Administrators only" message="Ask an administrator if you need an account created or changed." />
      </div>
    );
  }

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await api.delete(`/users/${removing._id}`);
      notify(`${removing.name}'s account removed`);
      setRemoving(null);
      usersReq.reload();
    } catch (err) {
      setError(apiError(err, 'The account could not be removed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Team & access"
        description="Staff accounts and what each role can do. Every rule here is enforced by the API, not just hidden in the interface."
        actions={
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add account
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="panel overflow-hidden xl:col-span-3">
          {usersReq.loading && !users.length ? (
            <TableSkeleton rows={3} />
          ) : (
            <ul className="divide-y divide-line">
              {users.map((u) => (
                <li key={u._id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {u.name}
                      {String(u._id) === String(user._id) && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}
                    </p>
                    <p className="truncate text-[13px] text-muted">
                      {u.email}
                      {u.doctor?.name ? ` · linked to ${u.doctor.name}` : ''}
                    </p>
                  </div>
                  <span className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline ${ROLE_TONES[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                  <span className="num hidden text-xs text-faint lg:inline">since {formatDate(u.createdAt)}</span>
                  {String(u._id) !== String(user._id) && (
                    <button className="icon-btn" onClick={() => setRemoving(u)} aria-label={`Remove ${u.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel overflow-hidden xl:col-span-2" aria-labelledby="perm-title">
          <h2 id="perm-title" className="border-b border-line px-5 py-4 text-[15px] font-semibold text-ink">
            What each role can do
          </h2>
          <div className="relative overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th scope="col">Action</th>
                  <th scope="col" className="text-center">
                    Admin
                  </th>
                  <th scope="col" className="text-center">
                    Doctor
                  </th>
                  <th scope="col" className="text-center">
                    Nurse
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map(([label, a, d, n]) => (
                  <tr key={label} className="table-row">
                    <td className="text-[13px] text-ink">{label}</td>
                    <td className="text-center">
                      <Cell v={a} />
                    </td>
                    <td className="text-center">
                      <Cell v={d} />
                    </td>
                    <td className="text-center">
                      <Cell v={n} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {adding && <AddAccountPanel users={users} onClose={() => setAdding(false)} onSaved={usersReq.reload} />}
      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${removing?.name}'s account?`}
        message="They will no longer be able to sign in. Patient records and history are not affected."
        confirmLabel="Remove account"
        busy={busy}
        error={error}
        onConfirm={remove}
        onCancel={() => {
          setRemoving(null);
          setError('');
        }}
      />
    </>
  );
}

function AddAccountPanel({ users, onClose, onSaved }) {
  const notify = useToast();
  const doctors = useApi('/doctors?limit=100&sortBy=name&order=asc').data?.data || [];
  const linked = new Set(users.map((u) => u.doctor?._id).filter(Boolean));
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'nurse', doctor: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/users', form);
      notify(`Account created for ${form.name}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(apiError(err, 'The account could not be created.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Add account"
      description="The new user signs in with this email and password."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="account-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </>
      }
    >
      <form id="account-form" onSubmit={submit} className="space-y-5">
        {error && <p className="rounded-control bg-critical-soft px-3 py-2.5 text-sm text-critical">{error}</p>}
        <fieldset>
          <legend className="field-label">Role</legend>
          <div className="grid grid-cols-3 gap-2">
            {['nurse', 'doctor', 'admin'].map((r) => (
              <label
                key={r}
                className={`flex h-10 cursor-pointer items-center justify-center rounded-control border text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine-500 ${
                  form.role === r ? 'border-pine-700 bg-pine-50 text-pine-800' : 'border-line-strong text-ink-soft hover:bg-canvas'
                }`}
              >
                <input type="radio" name="a-role" value={r} checked={form.role === r} onChange={set('role')} className="sr-only" />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </fieldset>
        {form.role === 'doctor' && (
          <Field id="a-doc" label="Linked doctor record" required hint="A doctor login only sees this doctor's patients.">
            <select id="a-doc" className="select" required value={form.doctor} onChange={set('doctor')}>
              <option value="" disabled>
                Choose a doctor
              </option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id} disabled={linked.has(d._id)}>
                  {d.name}
                  {linked.has(d._id) ? ' (already has a login)' : ''}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id="a-name" label="Full name" required>
          <input id="a-name" className="input" required maxLength={100} value={form.name} onChange={set('name')} />
        </Field>
        <Field id="a-email" label="Email" required>
          <input id="a-email" className="input" type="email" required maxLength={100} autoComplete="off" value={form.email} onChange={set('email')} />
        </Field>
        <Field id="a-pass" label="Temporary password" required hint="At least 8 characters with a letter and a number.">
          <input
            id="a-pass"
            className="input"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
          />
        </Field>
      </form>
    </Drawer>
  );
}
