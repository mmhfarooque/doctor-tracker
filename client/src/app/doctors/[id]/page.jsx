'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  CalendarDays,
  Award,
  Pencil,
  UserPlus,
  MoreHorizontal,
  Trash2,
  Users,
  ArrowRightLeft,
  FileText,
  Archive,
  Lock,
  Clock,
} from 'lucide-react';
import api from '../../../lib/api';
import useDebounce from '../../../hooks/useDebounce';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/permissions';
import Avatar from '../../../components/ui/Avatar';
import StatusBadge from '../../../components/ui/StatusBadge';
import FollowUpBadge from '../../../components/ui/FollowUpBadge';
import CapacityMeter from '../../../components/ui/CapacityMeter';
import SearchInput from '../../../components/ui/SearchInput';
import Pagination from '../../../components/ui/Pagination';
import Menu from '../../../components/ui/Menu';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Drawer from '../../../components/ui/Drawer';
import Field from '../../../components/ui/Field';
import Skeleton, { TableSkeleton } from '../../../components/ui/Skeleton';
import DoctorForm from '../../../components/forms/DoctorForm';
import PatientForm from '../../../components/forms/PatientForm';
import TransferDialog from '../../../components/forms/TransferDialog';
import { useToast } from '../../../components/ui/Toast';
import { DOCTOR_STATUSES, PATIENT_STATUSES, findShiftType, findStatus } from '../../../lib/constants';
import { apiError, formatDate } from '../../../lib/format';

const LIMIT = 10;
const shiftLabel = (s) =>
  `${findShiftType(s.type).label}, ${new Date(s.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${new Date(s.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

export default function DoctorProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const notify = useToast();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [editingDoctor, setEditingDoctor] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [transferring, setTransferring] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const isOwn = user?.role === 'doctor' && String(user.doctor?._id || user.doctor) === id;
  const canSeeRoster = user?.role !== 'doctor' || isOwn;
  const canAdmit = can(user, 'patient.create') && (user.role === 'admin' || isOwn);

  const rosterQuery = useMemo(() => {
    const q = new URLSearchParams({ page, limit: LIMIT });
    if (debouncedSearch.trim()) q.set('search', debouncedSearch.trim());
    if (status) q.set('status', status);
    return q.toString();
  }, [page, debouncedSearch, status]);

  const doctorReq = useApi(`/doctors/${id}`, 'This doctor could not be loaded.');
  const roster = useApi(canSeeRoster ? `/doctors/${id}/patients?${rosterQuery}` : null, 'Patients could not be loaded.');
  const doctor = doctorReq.data?.data || null;
  const patients = roster.data?.data || [];
  const pagination = roster.data?.pagination || { total: 0, totalPages: 1 };

  const refreshAll = () => {
    doctorReq.reload();
    roster.reload();
  };

  const removeFromList = async (p) => {
    try {
      await api.delete(`/doctors/${id}/patients/${p._id}`);
      notify(`${p.name} removed from the list`, 'success', {
        label: 'Undo',
        onClick: async () => {
          await api.post(`/patients/${p._id}/restore`);
          notify(`${p.name} restored`);
          refreshAll();
        },
      });
      if (patients.length === 1 && page > 1) setPage(page - 1);
      refreshAll();
    } catch (err) {
      notify(apiError(err, 'The patient could not be removed.'), 'error');
    }
  };

  const deleteDoctor = async () => {
    setBusy(true);
    setDialogError('');
    try {
      await api.delete(`/doctors/${id}`);
      notify(`${doctor.name} deleted`);
      router.push('/doctors');
    } catch (err) {
      if (err.response?.status === 409) {
        setConfirmDelete(false);
        setReassigning(true);
      } else setDialogError(apiError(err, 'The doctor could not be deleted.'));
    } finally {
      setBusy(false);
    }
  };

  if (doctorReq.error && !doctor) {
    return (
      <div className="panel">
        <EmptyState
          icon={Users}
          title="Doctor not found"
          message={doctorReq.error}
          action={
            <Link href="/doctors" className="btn btn-secondary">
              Back to doctors
            </Link>
          }
        />
      </div>
    );
  }

  const facts = doctor
    ? [
        { icon: Building2, label: 'Hospital', value: doctor.hospital },
        { icon: Mail, label: 'Email', value: doctor.email, href: `mailto:${doctor.email}` },
        { icon: Phone, label: 'Phone', value: doctor.phone, href: `tel:${doctor.phone}` },
        { icon: Award, label: 'Experience', value: `${doctor.experienceYears} years` },
        { icon: CalendarDays, label: 'On record since', value: formatDate(doctor.createdAt) },
      ]
    : [];
  const totalWithStatus = doctor ? Object.values(doctor.statusCounts || {}).reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <Link href="/doctors" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Doctors
      </Link>

      <section className="panel mb-6 overflow-hidden">
        {!doctor ? (
          <div className="flex items-center gap-5 p-6">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-start">
              <Avatar name={doctor.name} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.01em] text-ink">{doctor.name}</h1>
                  <StatusBadge status={findStatus(DOCTOR_STATUSES, doctor.status)} />
                  {doctor.currentShift && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-700 px-2.5 py-1 text-xs font-medium text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pine-200" />
                      On duty now · {findShiftType(doctor.currentShift.type).label}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[15px] text-ink-soft">{doctor.specialization}</p>
                {!doctor.currentShift && doctor.nextShift && (
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    Next shift: {shiftLabel(doctor.nextShift)}
                  </p>
                )}
                {doctor.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{doctor.bio}</p>}
              </div>
              <div className="flex shrink-0 flex-col gap-3 md:w-56">
                <div className="rounded-control border border-line p-3">
                  <p className="mb-1 text-xs text-muted">Active caseload</p>
                  <CapacityMeter count={doctor.patientCount} max={doctor.maxPatients} />
                </div>
                <div className="flex gap-2">
                  {canAdmit && (
                    <button className="btn btn-primary flex-1" onClick={() => setAdmitting(true)}>
                      <UserPlus className="h-4 w-4" />
                      Admit
                    </button>
                  )}
                  {can(user, 'doctor.manage') && (
                    <>
                      <button className="btn btn-secondary flex-1" onClick={() => setEditingDoctor(true)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <Menu
                        items={[{ key: 'del', label: 'Delete doctor', icon: Trash2, danger: true, onClick: () => setConfirmDelete(true) }]}
                        trigger={({ toggle, open }) => (
                          <button
                            className="btn btn-secondary w-10 px-0"
                            onClick={toggle}
                            aria-haspopup="menu"
                            aria-expanded={open}
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {totalWithStatus > 0 && (
              <div className="border-t border-line px-5 py-4 sm:px-7">
                <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full">
                  {PATIENT_STATUSES.filter((s) => doctor.statusCounts?.[s.value]).map((s) => (
                    <div
                      key={s.value}
                      className={s.bar}
                      style={{ width: `${(doctor.statusCounts[s.value] / totalWithStatus) * 100}%` }}
                      title={`${s.label}: ${doctor.statusCounts[s.value]}`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {PATIENT_STATUSES.filter((s) => doctor.statusCounts?.[s.value]).map((s) => (
                    <span key={s.value} className="num flex items-center gap-1.5 text-xs text-muted">
                      <span className={`h-2 w-2 rounded-sm ${s.bar}`} />
                      {s.label} {doctor.statusCounts[s.value]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <dl className="grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start gap-3 bg-[#FAFBFB] px-5 py-4 sm:px-7 lg:px-5">
                  <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted">{f.label}</dt>
                    <dd className="mt-0.5 truncate text-sm font-medium text-ink">
                      {f.href ? (
                        <a href={f.href} className="hover:text-pine-700 hover:underline">
                          {f.value}
                        </a>
                      ) : (
                        f.value
                      )}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>

      <section className="panel overflow-visible" aria-labelledby="roster-title">
        <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="roster-title" className="text-[15px] font-semibold text-ink">
            Patients under this doctor
          </h2>
          {canSeeRoster && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Search this list"
                className="sm:w-64"
              />
              <select
                className="select sm:w-48"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                aria-label="Clinical status"
              >
                <option value="">Any status</option>
                {PATIENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="border-t border-line">
          {!canSeeRoster ? (
            <EmptyState icon={Lock} title="Visible to this doctor's care team" message="Doctors can only open their own patients' records." />
          ) : roster.loading && !patients.length ? (
            <TableSkeleton rows={4} />
          ) : !patients.length ? (
            <EmptyState
              icon={Users}
              title={search || status ? 'No patients match' : 'No patients yet'}
              message={search || status ? 'Try a different search or status.' : 'Admit a patient to start this list.'}
              action={
                !(search || status) &&
                canAdmit && (
                  <button className="btn btn-primary" onClick={() => setAdmitting(true)}>
                    <UserPlus className="h-4 w-4" />
                    Admit patient
                  </button>
                )
              }
            />
          ) : (
            <div className={`transition-opacity ${roster.loading ? 'opacity-60' : ''}`} aria-busy={roster.loading}>
              <ul className="divide-y divide-line">
                {patients.map((p) => (
                  <li key={p._id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFB] sm:px-5">
                    <Link href={`/patients/${p._id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={p.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{p.name}</span>
                        <span className="num block truncate text-[13px] text-muted">
                          {p.condition}, {p.age} yrs
                        </span>
                      </span>
                      <span className="hidden sm:block">
                        {p.status !== 'Discharged' && p.followUpDate && <FollowUpBadge date={p.followUpDate} />}
                      </span>
                      <StatusBadge status={findStatus(PATIENT_STATUSES, p.status)} />
                    </Link>
                    <Menu
                      items={[
                        { key: 'open', label: 'Open record', icon: FileText, onClick: () => router.push(`/patients/${p._id}`) },
                        ...(can(user, 'patient.transfer')
                          ? [{ key: 'tr', label: 'Transfer', icon: ArrowRightLeft, onClick: () => setTransferring({ ...p, doctor }) }]
                          : []),
                        ...(can(user, 'patient.archive')
                          ? [{ key: 'rm', label: 'Remove from list', icon: Archive, danger: true, onClick: () => removeFromList(p) }]
                          : []),
                      ]}
                      trigger={({ toggle, open }) => (
                        <button
                          className="icon-btn -mr-2"
                          onClick={toggle}
                          aria-haspopup="menu"
                          aria-expanded={open}
                          aria-label={`Actions for ${p.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {canSeeRoster && (
          <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={LIMIT} onPageChange={setPage} noun="patients" />
        )}
      </section>

      <DoctorForm open={editingDoctor} doctor={doctor} onClose={() => setEditingDoctor(false)} onSaved={refreshAll} />
      <PatientForm open={admitting} patient={null} fixedDoctor={doctor} onClose={() => setAdmitting(false)} onSaved={refreshAll} />
      <TransferDialog patient={transferring} onClose={() => setTransferring(null)} onDone={refreshAll} />
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${doctor?.name}?`}
        message="The doctor is removed from the directory and their shifts are cancelled. If they still have patients you'll be asked who takes over."
        confirmLabel="Delete doctor"
        busy={busy}
        error={dialogError}
        onConfirm={deleteDoctor}
        onCancel={() => {
          setConfirmDelete(false);
          setDialogError('');
        }}
      />
      {reassigning && doctor && (
        <ReassignPanel
          doctor={doctor}
          onClose={() => setReassigning(false)}
          onDone={() => {
            setReassigning(false);
            refreshAll();
            setConfirmDelete(true);
          }}
        />
      )}
    </>
  );
}

/** Before a doctor with patients can be deleted, their whole caseload moves to a colleague. */
function ReassignPanel({ doctor, onClose, onDone }) {
  const notify = useToast();
  const others = (useApi('/doctors?limit=100&sortBy=name&order=asc').data?.data || []).filter((d) => d._id !== doctor._id);
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/doctors/${doctor._id}/reassign`, { doctor: target });
      notify(res.data.message);
      onDone();
    } catch (err) {
      setError(apiError(err, 'Patients could not be reassigned.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Reassign patients first"
      description={`${doctor.name} still has patient records. Choose who takes them over; then you can delete the doctor.`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="reassign-form" className="btn btn-primary" disabled={saving || !target}>
            {saving ? 'Moving…' : 'Move all patients'}
          </button>
        </>
      }
    >
      <form id="reassign-form" onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-control bg-critical-soft px-3 py-2.5 text-sm text-critical">{error}</p>}
        <Field id="r-doc" label="New attending doctor" required>
          <select id="r-doc" className="select" required value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="" disabled>
              Choose a doctor
            </option>
            {others.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} — {d.specialization} ({d.patientCount}/{d.maxPatients})
              </option>
            ))}
          </select>
        </Field>
        <p className="text-[13px] text-muted">Every move is recorded in the patients&apos; history.</p>
      </form>
    </Drawer>
  );
}
