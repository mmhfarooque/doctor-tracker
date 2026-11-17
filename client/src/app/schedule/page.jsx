'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, X, CalendarDays } from 'lucide-react';
import api from '../../lib/api';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import PageHeader from '../../components/ui/PageHeader';
import Drawer from '../../components/ui/Drawer';
import Field from '../../components/ui/Field';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { SHIFT_TYPES, findShiftType } from '../../lib/constants';
import { apiError } from '../../lib/format';

const DAY = 86400000;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mondayOf = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const time = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function ShiftChip({ s, now, manage, onRemove }) {
  const t = findShiftType(s.type);
  const live = new Date(s.start).getTime() <= now && new Date(s.end).getTime() > now;
  return (
    <span
      className={`group/chip flex items-center justify-between gap-1 rounded-md border px-2 py-1 text-[11px] font-medium leading-tight ${t.tone}`}
    >
      <span>
        {live && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current align-middle" />}
        {t.label}
        <span className="num block font-normal opacity-80">
          {time(s.start)}–{time(s.end)}
        </span>
      </span>
      {manage && (
        <button
          type="button"
          onClick={() => onRemove(s)}
          className="rounded p-0.5 opacity-0 hover:bg-black/10 focus:opacity-100 group-hover/chip:opacity-100"
          aria-label={`Remove ${t.label} shift for ${s.doctor.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export default function SchedulePage() {
  const { user } = useAuth();
  const notify = useToast();
  const manage = can(user, 'shift.manage');
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [adding, setAdding] = useState(null); // { doctor, date }
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY)), [weekStart]);
  const shiftsReq = useApi(`/shifts?from=${iso(weekStart)}&days=7`, 'The schedule could not be loaded.');
  const doctorsReq = useApi('/doctors?limit=100&sortBy=name&order=asc');
  const shifts = useMemo(() => shiftsReq.data?.data || [], [shiftsReq.data]);
  const doctors = doctorsReq.data?.data || [];
  // "now" is state so render stays pure; it ticks every minute to keep the on-duty highlight current
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const onDuty = shifts.filter((s) => new Date(s.start).getTime() <= now && new Date(s.end).getTime() > now);
  const todayIso = iso(new Date());

  // shifts[doctorId][yyyy-mm-dd] = [...]
  const grid = useMemo(() => {
    const g = {};
    shifts.forEach((s) => {
      const key = iso(new Date(s.start));
      g[s.doctor._id] ??= {};
      (g[s.doctor._id][key] ??= []).push(s);
    });
    return g;
  }, [shifts]);

  const weekLabel = `${days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/shifts/${removing._id}`);
      notify('Shift removed');
      setRemoving(null);
      shiftsReq.reload();
    } catch (err) {
      notify(apiError(err, 'The shift could not be removed.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Who is on duty, and when. Shifts are shown in your local time."
        actions={
          manage && (
            <button className="btn btn-primary" onClick={() => setAdding({ doctor: '', date: iso(new Date()) })}>
              <Plus className="h-4 w-4" />
              Add shift
            </button>
          )
        }
      />

      <section className="panel mb-6 p-4 sm:p-5" aria-label="On duty now">
        <p className="mb-3 text-sm font-semibold text-ink">On duty now</p>
        {shiftsReq.loading && !shiftsReq.data ? (
          <Skeleton className="h-8 w-2/3" />
        ) : onDuty.length ? (
          <div className="flex flex-wrap gap-2">
            {onDuty.map((s) => (
              <Link
                key={s._id}
                href={`/doctors/${s.doctor._id}`}
                className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-sm hover:bg-canvas"
              >
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${findShiftType(s.type).tone}`}>
                  {findShiftType(s.type).label}
                </span>
                <span className="font-medium text-ink">{s.doctor.name}</span>
                <span className="text-muted">{s.doctor.specialization}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Nobody is on shift right now.</p>
        )}
      </section>

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:px-5">
          <div className="flex items-center gap-1">
            <button className="icon-btn" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * DAY))} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="icon-btn" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * DAY))} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="ml-2 text-[15px] font-semibold text-ink">{weekLabel}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SHIFT_TYPES.map((t) => (
              <span key={t.value} className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${t.tone}`} title={t.hours}>
                {t.label} <span className="font-normal opacity-80">{t.hours}</span>
              </span>
            ))}
            <button className="btn btn-sm btn-secondary" onClick={() => setWeekStart(mondayOf(new Date()))}>
              This week
            </button>
          </div>
        </div>

        {shiftsReq.error ? (
          <EmptyState icon={CalendarDays} title="Schedule unavailable" message={shiftsReq.error} />
        ) : (
          <>
            {/* Desktop grid */}
            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full table-fixed">
                <thead className="table-head">
                  <tr>
                    <th scope="col" className="w-44">
                      Doctor
                    </th>
                    {days.map((d) => (
                      <th key={iso(d)} scope="col" className={iso(d) === todayIso ? '!bg-pine-50 !text-pine-800' : ''}>
                        {d.toLocaleDateString('en-GB', { weekday: 'short' })} <span className="num font-normal">{d.getDate()}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc) => (
                    <tr key={doc._id} className="table-row align-top">
                      <td>
                        <Link href={`/doctors/${doc._id}`} className="block truncate text-sm font-medium text-ink hover:text-pine-700">
                          {doc.name}
                        </Link>
                        <span className="block truncate text-xs text-muted">{doc.specialization}</span>
                      </td>
                      {days.map((d) => {
                        const list = grid[doc._id]?.[iso(d)] || [];
                        return (
                          <td key={iso(d)} className={`!px-1.5 ${iso(d) === todayIso ? 'bg-pine-50/40' : ''}`}>
                            <div className="flex min-h-[44px] flex-col gap-1">
                              {list.map((s) => (
                                <ShiftChip key={s._id} s={s} now={now} manage={manage} onRemove={setRemoving} />
                              ))}
                              {manage && !list.length && (
                                <button
                                  type="button"
                                  onClick={() => setAdding({ doctor: doc._id, date: iso(d) })}
                                  className="flex h-[44px] items-center justify-center rounded-md border border-dashed border-transparent text-faint hover:border-line-strong hover:text-ink"
                                  aria-label={`Add shift for ${doc.name} on ${d.toLocaleDateString('en-GB')}`}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: day by day */}
            <div className="divide-y divide-line md:hidden">
              {days.map((d) => {
                const list = shifts.filter((s) => iso(new Date(s.start)) === iso(d));
                return (
                  <div key={iso(d)} className="px-4 py-3">
                    <p className={`mb-2 text-sm font-semibold ${iso(d) === todayIso ? 'text-pine-700' : 'text-ink'}`}>
                      {d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                      {iso(d) === todayIso && ' · Today'}
                    </p>
                    {list.length ? (
                      <ul className="space-y-1.5">
                        {list.map((s) => (
                          <li key={s._id} className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-sm text-ink">{s.doctor.name}</span>
                            <ShiftChip s={s} now={now} manage={manage} onRemove={setRemoving} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">No shifts.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {adding && <AddShiftPanel initial={adding} doctors={doctors} onClose={() => setAdding(null)} onSaved={shiftsReq.reload} />}
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this shift?"
        message={
          removing
            ? `${removing.doctor.name}, ${findShiftType(removing.type).label} on ${new Date(removing.start).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}.`
            : ''
        }
        confirmLabel="Remove shift"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}

function AddShiftPanel({ initial, doctors, onClose, onSaved }) {
  const notify = useToast();
  const [form, setForm] = useState({ doctor: initial.doctor, date: initial.date, type: 'Day', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/shifts', form);
      notify(`${findShiftType(form.type).label} shift added for ${res.data.data.doctor.name}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(apiError(err, 'The shift could not be added.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Add shift"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="shift-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add shift'}
          </button>
        </>
      }
    >
      <form id="shift-form" onSubmit={submit} className="space-y-5">
        {error && <p className="rounded-control bg-critical-soft px-3 py-2.5 text-sm text-critical">{error}</p>}
        <Field id="s-doc" label="Doctor" required>
          <select id="s-doc" className="select" required value={form.doctor} onChange={set('doctor')}>
            <option value="" disabled>
              Choose a doctor
            </option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} — {d.specialization}
              </option>
            ))}
          </select>
        </Field>
        <Field id="s-date" label="Date" required>
          <input id="s-date" type="date" className="input num" required value={form.date} onChange={set('date')} />
        </Field>
        <fieldset>
          <legend className="field-label">Shift</legend>
          <div className="grid grid-cols-2 gap-2">
            {SHIFT_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex cursor-pointer flex-col rounded-control border px-3 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine-500 ${
                  form.type === t.value ? 'border-pine-700 bg-pine-50' : 'border-line-strong hover:bg-canvas'
                }`}
              >
                <input type="radio" name="s-type" value={t.value} checked={form.type === t.value} onChange={set('type')} className="sr-only" />
                <span className="font-medium text-ink">{t.label}</span>
                <span className="num text-xs text-muted">{t.hours}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field id="s-note" label="Note" hint="Optional, e.g. ward or cover arrangement.">
          <input id="s-note" className="input" maxLength={200} value={form.note} onChange={set('note')} />
        </Field>
      </form>
    </Drawer>
  );
}
