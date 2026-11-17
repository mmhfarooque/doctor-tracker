'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Stethoscope, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import WardStatus from '../components/dashboard/WardStatus';
import AdmissionsChart from '../components/dashboard/AdmissionsChart';
import BarList from '../components/dashboard/BarList';
import Avatar from '../components/ui/Avatar';
import StatusBadge from '../components/ui/StatusBadge';
import Skeleton from '../components/ui/Skeleton';
import DoctorForm from '../components/forms/DoctorForm';
import PatientForm from '../components/forms/PatientForm';
import { PATIENT_STATUSES, findStatus } from '../lib/constants';
import { apiError, formatDate, greeting, monthLabel } from '../lib/format';

// The API only returns months that had admissions; fill the last 12 months so gaps show as zero.
const lastTwelveMonths = (rows = []) => {
  const byPeriod = Object.fromEntries(rows.map((r) => [r.period, r.admissions]));
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return {
      period,
      label: monthLabel(period),
      full: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      admissions: byPeriod[period] || 0,
    };
  });
};

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [doctorFormOpen, setDoctorFormOpen] = useState(false);
  const [patientFormOpen, setPatientFormOpen] = useState(false);
  const [doctorOptions, setDoctorOptions] = useState([]);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data.data);
    } catch (err) {
      setError(apiError(err, 'Dashboard figures could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdmit = async () => {
    setPatientFormOpen(true);
    if (!doctorOptions.length) {
      const res = await api.get('/doctors?limit=100&sortBy=name&order=asc').catch(() => null);
      if (res) setDoctorOptions(res.data.data);
    }
  };

  const series = useMemo(() => lastTwelveMonths(stats?.monthlyRegistrations), [stats]);
  const yearTotal = series.reduce((sum, m) => sum + m.admissions, 0);
  const thisMonth = series[series.length - 1]?.admissions ?? 0;
  const lastMonth = series[series.length - 2]?.admissions ?? 0;
  const critical = stats?.statusDistribution?.find((s) => s.status === 'Critical')?.count || 0;

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name || 'there'}`}
        description={
          stats
            ? `${today}. ${stats.totals.patients} patients are under the care of ${stats.totals.doctors} doctors${
                critical ? `, and ${critical} ${critical === 1 ? 'is' : 'are'} critical` : ''
              }.`
            : today
        }
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setDoctorFormOpen(true)}>
              <Stethoscope className="h-4 w-4" />
              Add doctor
            </button>
            <button className="btn btn-primary" onClick={openAdmit}>
              <UserPlus className="h-4 w-4" />
              Admit patient
            </button>
          </>
        }
      />

      {error && (
        <div className="panel mb-6 flex items-center justify-between gap-4 border-critical/30 bg-critical-soft px-5 py-4 text-sm text-critical">
          {error}
          <button className="btn btn-sm btn-secondary" onClick={load}>
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
          <WardStatus distribution={stats.statusDistribution} total={stats.totals.patients} />

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line lg:grid-cols-4">
            {[
              { label: 'Doctors on record', value: stats.totals.doctors, href: '/doctors' },
              { label: 'Patients on record', value: stats.totals.patients, href: '/patients' },
              { label: 'Average patients per doctor', value: stats.totals.avgPatientsPerDoctor },
              { label: 'Admitted this month', value: thisMonth, note: lastMonth ? `${lastMonth} last month` : null },
            ].map((kpi) => {
              const body = (
                <>
                  <dt className="text-[13px] text-muted">{kpi.label}</dt>
                  <dd className="mt-1 flex items-baseline gap-2">
                    <span className="num text-2xl font-semibold tracking-[-0.01em] text-ink">{kpi.value}</span>
                    {kpi.note && <span className="num text-xs text-faint">{kpi.note}</span>}
                  </dd>
                </>
              );
              return kpi.href ? (
                <Link key={kpi.label} href={kpi.href} className="bg-white px-5 py-4 transition-colors hover:bg-[#FAFBFB]">
                  {body}
                </Link>
              ) : (
                <div key={kpi.label} className="bg-white px-5 py-4">
                  {body}
                </div>
              );
            })}
          </dl>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel className="lg:col-span-2" title="Admissions over the last 12 months" description={`${yearTotal} patients admitted in this period`}>
              <AdmissionsChart series={series} />
            </Panel>
            <Panel title="Patients by specialty" description="Select a specialty to see its doctors">
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

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Patients per doctor" description="Current caseload, highest first">
              <BarList
                unit="patients"
                rows={stats.patientsPerDoctor.map((d) => ({
                  key: d._id,
                  label: d.doctorName,
                  sub: d.specialization,
                  value: d.patientCount,
                  href: `/doctors/${d._id}`,
                }))}
              />
            </Panel>

            <Panel
              title="Recent admissions"
              description="The five most recently added patients"
              action={
                <Link href="/patients" className="whitespace-nowrap text-sm font-medium text-pine-700 hover:underline">
                  View all
                </Link>
              }
            >
              <ul className="-mx-2 divide-y divide-line">
                {stats.recentPatients.map((p) => (
                  <li key={p._id}>
                    <Link
                      href={`/patients?search=${encodeURIComponent(p.name)}`}
                      className="flex items-center gap-3 rounded-control px-2 py-3 hover:bg-canvas"
                    >
                      <Avatar name={p.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {p.condition}
                          {p.doctor?.name ? `, with ${p.doctor.name}` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={findStatus(PATIENT_STATUSES, p.status)} size="sm" />
                        <span className="num text-[11px] text-faint">{formatDate(p.admissionDate, { day: 'numeric', month: 'short' })}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      ) : null}

      <DoctorForm open={doctorFormOpen} doctor={null} onClose={() => setDoctorFormOpen(false)} onSaved={load} />
      <PatientForm open={patientFormOpen} patient={null} doctors={doctorOptions} onClose={() => setPatientFormOpen(false)} onSaved={load} />
    </>
  );
}
