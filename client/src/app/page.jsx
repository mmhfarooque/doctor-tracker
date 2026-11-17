'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Stethoscope, RefreshCw, AlertTriangle, CalendarClock } from 'lucide-react';
import useApi from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { can } from '../lib/permissions';
import PageHeader from '../components/ui/PageHeader';
import WardStatus from '../components/dashboard/WardStatus';
import AdmissionsChart from '../components/dashboard/AdmissionsChart';
import BarList from '../components/dashboard/BarList';
import ActivityList from '../components/activity/ActivityList';
import FollowUpBadge from '../components/ui/FollowUpBadge';
import Skeleton from '../components/ui/Skeleton';
import DoctorForm from '../components/forms/DoctorForm';
import PatientForm from '../components/forms/PatientForm';
import { findShiftType } from '../lib/constants';
import { greeting, monthLabel } from '../lib/format';

function Panel({ title, description, action, children, className = '' }) {
  return (
    <section className={`panel flex min-w-0 flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 px-5 pb-5 pt-4 sm:px-6">{children}</div>
    </section>
  );
}

const FOLLOW_TILES = [
  { key: 'overdue', label: 'Overdue', tone: 'text-critical', href: '/patients?followUp=overdue' },
  { key: 'today', label: 'Due today', tone: 'text-watch', href: '/patients?followUp=today' },
  { key: 'week', label: 'Next 7 days', tone: 'text-recovering', href: '/patients?followUp=week' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [doctorFormOpen, setDoctorFormOpen] = useState(false);
  const [patientFormOpen, setPatientFormOpen] = useState(false);

  const statsReq = useApi('/dashboard/stats', 'Dashboard figures could not be loaded.');
  const doctorReq = useApi(patientFormOpen && user?.role === 'admin' ? '/doctors?limit=100&sortBy=name&order=asc' : null);
  const stats = statsReq.data?.data || null;
  const { error } = statsReq;
  const doctorScope = stats?.scope === 'doctor';

  const series = useMemo(
    () =>
      (stats?.monthlyRegistrations || []).map((m) => {
        const [y, mo] = m.period.split('-').map(Number);
        return { ...m, label: monthLabel(m.period), full: new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
      }),
    [stats],
  );
  const yearAdmissions = series.reduce((s, m) => s + m.admissions, 0);
  const thisMonth = series[series.length - 1]?.admissions ?? 0;
  const lastMonth = series[series.length - 2]?.admissions ?? 0;
  const critical = stats?.statusDistribution?.find((s) => s.status === 'Critical')?.count || 0;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const summary = stats
    ? doctorScope
      ? `${today}. You have ${stats.totals.activePatients} active patient${stats.totals.activePatients === 1 ? '' : 's'}${critical ? `, ${critical} critical` : ''}.`
      : `${today}. ${stats.totals.activePatients} active patients under ${stats.totals.doctors} doctors${critical ? `, and ${critical} ${critical === 1 ? 'is' : 'are'} critical` : ''}.`
    : today;

  const kpis = stats
    ? [
        { label: 'Active patients', value: stats.totals.activePatients, href: '/patients' },
        doctorScope
          ? { label: 'Your capacity', value: `${stats.patientsPerDoctor[0]?.patientCount ?? 0} / ${stats.patientsPerDoctor[0]?.maxPatients ?? '—'}` }
          : { label: 'Doctors on record', value: stats.totals.doctors, href: '/doctors' },
        {
          label: doctorScope ? 'All-time patients' : 'Active patients per doctor',
          value: doctorScope ? stats.totals.patients : stats.totals.avgPatientsPerDoctor,
        },
        {
          label: 'Average length of stay',
          value: stats.totals.avgLengthOfStay === null ? '—' : `${stats.totals.avgLengthOfStay} d`,
          note: stats.totals.dischargedLast12Months ? `${stats.totals.dischargedLast12Months} discharged` : null,
        },
        { label: 'Admitted this month', value: thisMonth, note: lastMonth ? `${lastMonth} last month` : null },
      ]
    : [];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name || 'there'}`}
        description={summary}
        actions={
          <>
            {can(user, 'doctor.manage') && (
              <button className="btn btn-secondary" onClick={() => setDoctorFormOpen(true)}>
                <Stethoscope className="h-4 w-4" />
                Add doctor
              </button>
            )}
            {can(user, 'patient.create') && (
              <button className="btn btn-primary" onClick={() => setPatientFormOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Admit patient
              </button>
            )}
          </>
        }
      />

      {error && (
        <div className="panel mb-6 flex items-center justify-between gap-4 border-critical/30 bg-critical-soft px-5 py-4 text-sm text-critical">
          {error}
          <button className="btn btn-sm btn-secondary" onClick={statsReq.reload}>
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      )}

      {!stats && !error ? (
        <div className="space-y-6">
          <Skeleton className="h-[210px] rounded-panel" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-[330px] rounded-panel lg:col-span-2" />
            <Skeleton className="h-[330px] rounded-panel" />
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {!doctorScope && stats.overCapacity.length > 0 && (
            <div className="flex items-start gap-3 rounded-panel border border-watch/30 bg-watch-soft px-5 py-3.5 text-sm text-[#7A4E00]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <span className="font-medium">
                  {stats.overCapacity.length} doctor{stats.overCapacity.length === 1 ? ' is' : 's are'} at or over capacity:{' '}
                </span>
                {stats.overCapacity.map((d, i) => (
                  <span key={d._id}>
                    {i > 0 && ', '}
                    <Link href={`/doctors/${d._id}`} className="underline underline-offset-2 hover:text-ink">
                      {d.doctorName}
                    </Link>{' '}
                    <span className="num">
                      ({d.patientCount}/{d.maxPatients})
                    </span>
                  </span>
                ))}
                . Consider transferring new admissions.
              </p>
            </div>
          )}

          <WardStatus distribution={stats.statusDistribution} total={stats.totals.patients} />

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line lg:grid-cols-5">
            {kpis.map((kpi, i) => {
              const body = (
                <>
                  <dt className="text-[13px] text-muted">{kpi.label}</dt>
                  <dd className="mt-1 flex items-baseline gap-2">
                    <span className="num text-2xl font-semibold tracking-[-0.01em] text-ink">{kpi.value}</span>
                    {kpi.note && <span className="num text-xs text-faint">{kpi.note}</span>}
                  </dd>
                </>
              );
              const cls = `bg-white px-5 py-4 ${i === kpis.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`;
              return kpi.href ? (
                <Link key={kpi.label} href={kpi.href} className={`${cls} transition-colors hover:bg-[#FAFBFB]`}>
                  {body}
                </Link>
              ) : (
                <div key={kpi.label} className={cls}>
                  {body}
                </div>
              );
            })}
          </dl>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Follow-ups" description="Planned reviews for active patients">
              <div className="grid grid-cols-3 gap-2">
                {FOLLOW_TILES.map((t) => (
                  <Link key={t.key} href={t.href} className="rounded-control border border-line px-3 py-2.5 hover:bg-canvas">
                    <span className={`num block text-2xl font-semibold ${stats.followUps[t.key] ? t.tone : 'text-faint'}`}>
                      {stats.followUps[t.key]}
                    </span>
                    <span className="block text-xs text-muted">{t.label}</span>
                  </Link>
                ))}
              </div>
              <ul className="-mx-2 mt-4 divide-y divide-line">
                {stats.followUps.due.length === 0 && (
                  <li className="flex items-center gap-2 px-2 py-4 text-sm text-muted">
                    <CalendarClock className="h-4 w-4" />
                    Nothing due in the next 7 days.
                  </li>
                )}
                {stats.followUps.due.map((p) => (
                  <li key={p._id}>
                    <Link href={`/patients/${p._id}`} className="flex items-center gap-3 rounded-control px-2 py-2.5 hover:bg-canvas">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {p.condition}
                          {p.doctor?.name && !doctorScope ? `, ${p.doctor.name}` : ''}
                        </span>
                      </span>
                      <FollowUpBadge date={p.followUpDate} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              className="lg:col-span-2"
              title="Admissions and discharges"
              description={`Last 12 months: ${yearAdmissions} admitted, ${stats.totals.dischargedLast12Months} discharged`}
              action={
                <div className="hidden items-center gap-3 text-xs text-muted sm:flex">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded-sm bg-pine-700" />
                    Admitted
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0 w-3 border-t-2 border-dashed border-recovering" />
                    Discharged
                  </span>
                </div>
              }
            >
              <AdmissionsChart series={series} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title={doctorScope ? 'Your caseload' : 'Caseload against capacity'}
              description="Active patients per doctor; red means at or over the maximum"
            >
              <BarList
                unit="patients"
                rows={stats.patientsPerDoctor.map((d) => ({
                  key: d._id,
                  label: d.doctorName,
                  sub: d.specialization,
                  value: d.patientCount,
                  max: d.maxPatients,
                  href: `/doctors/${d._id}`,
                }))}
              />
            </Panel>
            <Panel
              title="Recent activity"
              description="Admissions, status changes, transfers and follow-ups"
              action={
                <Link href="/patients" className="whitespace-nowrap text-sm font-medium text-pine-700 hover:underline">
                  All patients
                </Link>
              }
            >
              <ActivityList items={stats.recentActivity} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel
              title="On duty now"
              action={
                <Link href="/schedule" className="whitespace-nowrap text-sm font-medium text-pine-700 hover:underline">
                  Schedule
                </Link>
              }
            >
              {stats.onCall.length ? (
                <ul className="-mx-2 divide-y divide-line">
                  {stats.onCall.map((s) => (
                    <li key={s._id}>
                      <Link
                        href={`/doctors/${s.doctor._id}`}
                        className="flex items-center justify-between gap-3 rounded-control px-2 py-2.5 hover:bg-canvas"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{s.doctor.name}</span>
                          <span className="block truncate text-xs text-muted">{s.doctor.specialization}</span>
                        </span>
                        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${findShiftType(s.type).tone}`}>
                          {findShiftType(s.type).label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted">Nobody is on shift right now.</p>
              )}
            </Panel>
            <Panel className="lg:col-span-2" title="Patients by specialty" description="Select a specialty to see its doctors">
              <BarList
                unit="patients"
                rows={stats.specialtyDistribution.map((s) => ({
                  key: s.specialty,
                  label: s.specialty,
                  sub: `${s.count} doctor${s.count === 1 ? '' : 's'}`,
                  value: s.patients,
                  href: `/doctors?specialization=${encodeURIComponent(s.specialty)}`,
                }))}
              />
            </Panel>
          </div>
        </div>
      ) : null}

      <DoctorForm open={doctorFormOpen} doctor={null} onClose={() => setDoctorFormOpen(false)} onSaved={statsReq.reload} />
      <PatientForm
        open={patientFormOpen}
        patient={null}
        doctors={doctorReq.data?.data || []}
        onClose={() => setPatientFormOpen(false)}
        onSaved={statsReq.reload}
      />
    </>
  );
}
