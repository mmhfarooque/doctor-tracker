'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRightLeft, Archive, CalendarClock, Mail, Pencil, Phone, Printer, Stethoscope, UserRound } from 'lucide-react';
import api from '../../../lib/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/permissions';
import { PATIENT_STATUSES, findStatus } from '../../../lib/constants';
import { apiError, formatDate, lengthOfStay } from '../../../lib/format';
import Avatar from '../../../components/ui/Avatar';
import StatusBadge from '../../../components/ui/StatusBadge';
import FollowUpBadge from '../../../components/ui/FollowUpBadge';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';
import ActivityList from '../../../components/activity/ActivityList';
import PatientForm from '../../../components/forms/PatientForm';
import TransferDialog from '../../../components/forms/TransferDialog';
import { useToast } from '../../../components/ui/Toast';

export default function PatientRecordPage() {
  const { id } = useParams();
  const router = useRouter();
  const notify = useToast();
  const { user } = useAuth();

  const record = useApi(`/patients/${id}`, 'This patient could not be loaded.');
  const history = useApi(`/patients/${id}/history`);
  const patient = record.data?.data;

  const [editing, setEditing] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [statusSaving, setStatusSaving] = useState('');

  const refresh = () => {
    record.reload();
    history.reload();
  };

  const setStatus = async (status) => {
    if (status === patient.status) return;
    setStatusSaving(status);
    try {
      await api.put(`/patients/${id}`, { status });
      notify(`Status changed to ${findStatus(PATIENT_STATUSES, status).label}`);
      refresh();
    } catch (err) {
      notify(apiError(err, 'Status could not be changed.'), 'error');
    } finally {
      setStatusSaving('');
    }
  };

  const archive = async () => {
    try {
      await api.post(`/patients/${id}/archive`);
      notify(`${patient.name} archived`, 'success', {
        label: 'Undo',
        onClick: async () => {
          await api.post(`/patients/${id}/restore`);
          notify(`${patient.name} restored`);
        },
      });
      router.push('/patients');
    } catch (err) {
      notify(apiError(err, 'The patient could not be archived.'), 'error');
    }
  };

  if (record.error && !patient) {
    return (
      <div className="panel">
        <EmptyState
          icon={UserRound}
          title="Patient not found"
          message="The record may have been archived, transferred to another doctor, or the link is wrong."
          action={
            <Link href="/patients" className="btn btn-secondary">
              Back to patients
            </Link>
          }
        />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-panel" />
        <Skeleton className="h-64 rounded-panel" />
      </div>
    );
  }

  const stay = lengthOfStay(patient.admissionDate, patient.dischargeDate);
  const canEdit = Boolean(user); // every role may edit something; the form limits nurses to status / notes / follow-up
  const facts = [
    {
      icon: Stethoscope,
      label: 'Attending doctor',
      value: patient.doctor?.name || 'Unassigned',
      href: patient.doctor ? `/doctors/${patient.doctor._id}` : null,
      sub: patient.doctor?.specialization,
    },
    {
      icon: CalendarClock,
      label: 'Admitted',
      value: formatDate(patient.admissionDate),
      sub: patient.dischargeDate ? `Discharged ${formatDate(patient.dischargeDate)}` : `${stay} day${stay === 1 ? '' : 's'} so far`,
    },
    { icon: CalendarClock, label: 'Next follow-up', value: patient.followUpDate ? null : 'None planned', badge: patient.followUpDate },
    { icon: Phone, label: 'Phone', value: patient.phone || '—', href: patient.phone ? `tel:${patient.phone}` : null },
    { icon: Mail, label: 'Email', value: patient.email || '—', href: patient.email ? `mailto:${patient.email}` : null },
  ];

  return (
    <>
      <Link href="/patients" className="no-print mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Patients
      </Link>

      <section className="panel mb-6 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-start">
          <Avatar name={patient.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.01em] text-ink">{patient.name}</h1>
              <StatusBadge status={findStatus(PATIENT_STATUSES, patient.status)} />
            </div>
            <p className="mt-1 text-[15px] text-ink-soft">
              {patient.condition}
              <span className="num text-faint">
                {' '}
                · {patient.age} yrs, {patient.gender}
              </span>
            </p>
            {patient.dischargeDate && (
              <p className="num mt-2 text-sm text-muted">
                Length of stay: <span className="font-medium text-ink">{stay} days</span>
              </p>
            )}
          </div>
          <div className="no-print flex shrink-0 flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </button>
            {can(user, 'patient.transfer') && (
              <button className="btn btn-secondary" onClick={() => setTransferring(true)}>
                <ArrowRightLeft className="h-4 w-4" />
                Transfer
              </button>
            )}
            {can(user, 'patient.archive') && (
              <button className="btn btn-secondary" onClick={archive}>
                <Archive className="h-4 w-4" />
                Archive
              </button>
            )}
            {canEdit && (
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Quick status change */}
        <div className="no-print border-t border-line bg-[#FAFBFB] px-5 py-4 sm:px-7">
          <p className="mb-2 text-[13px] font-medium text-ink-soft">Update clinical status</p>
          <div className="flex flex-wrap gap-2">
            {PATIENT_STATUSES.map((s) => {
              const active = patient.status === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  disabled={Boolean(statusSaving)}
                  onClick={() => setStatus(s.value)}
                  aria-pressed={active}
                  className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors disabled:opacity-60 ${
                    active ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-ink-soft hover:bg-canvas'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${s.bar}`} aria-hidden="true" />
                  {statusSaving === s.value ? 'Saving…' : s.label}
                </button>
              );
            })}
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {facts.map((f) => (
            <div key={f.label} className="flex items-start gap-3 bg-white px-5 py-4 sm:px-7 lg:px-5">
              <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
              <div className="min-w-0">
                <dt className="text-xs text-muted">{f.label}</dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-ink">
                  {f.badge ? (
                    <FollowUpBadge date={f.badge} />
                  ) : f.href ? (
                    <a href={f.href} className="hover:text-pine-700 hover:underline">
                      {f.value}
                    </a>
                  ) : (
                    f.value
                  )}
                </dd>
                {f.sub && <dd className="truncate text-xs text-muted">{f.sub}</dd>}
              </div>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panel p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-[15px] font-semibold text-ink">Clinical notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{patient.notes || 'No notes recorded yet.'}</p>
        </section>
        <section className="panel p-5 sm:p-6 lg:col-span-3">
          <h2 className="mb-4 text-[15px] font-semibold text-ink">History</h2>
          <ActivityList items={history.data?.data || []} timeline empty="No history recorded for this patient yet." />
        </section>
      </div>

      <PatientForm
        open={editing}
        patient={patient}
        doctors={patient.doctor ? [patient.doctor] : []}
        onClose={() => setEditing(false)}
        onSaved={refresh}
      />
      <TransferDialog patient={transferring ? patient : null} onClose={() => setTransferring(false)} onDone={refresh} />
    </>
  );
}
