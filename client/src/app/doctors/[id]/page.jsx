'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Mail, Phone, CalendarDays, Award, Pencil, UserPlus, MoreHorizontal, Trash2, Users } from 'lucide-react';
import api from '../../../lib/api';
import useDebounce from '../../../hooks/useDebounce';
import useApi from '../../../hooks/useApi';
import Avatar from '../../../components/ui/Avatar';
import StatusBadge from '../../../components/ui/StatusBadge';
import SearchInput from '../../../components/ui/SearchInput';
import Pagination from '../../../components/ui/Pagination';
import Menu from '../../../components/ui/Menu';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Skeleton, { TableSkeleton } from '../../../components/ui/Skeleton';
import DoctorForm from '../../../components/forms/DoctorForm';
import PatientForm from '../../../components/forms/PatientForm';
import { useToast } from '../../../components/ui/Toast';
import { DOCTOR_STATUSES, PATIENT_STATUSES, findStatus } from '../../../lib/constants';
import { apiError, formatDate } from '../../../lib/format';

const LIMIT = 10;

export default function DoctorProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const notify = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [editingDoctor, setEditingDoctor] = useState(false);
  const [patientForm, setPatientForm] = useState(undefined); // undefined closed, null admit, object edit
  const [toRemove, setToRemove] = useState(null);
  const [confirmDoctorDelete, setConfirmDoctorDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const rosterQuery = useMemo(() => {
    const q = new URLSearchParams({ page, limit: LIMIT });
    if (debouncedSearch.trim()) q.set('search', debouncedSearch.trim());
    if (status) q.set('status', status);
    return q.toString();
  }, [page, debouncedSearch, status]);

  const doctorReq = useApi(`/doctors/${id}`, 'This doctor could not be loaded.');
  const roster = useApi(`/doctors/${id}/patients?${rosterQuery}`, 'Patients could not be loaded.');
  const doctor = doctorReq.data?.data || null;
  const doctorError = doctorReq.error;
  const patients = roster.data?.data || [];
  const pagination = roster.data?.pagination || { total: 0, totalPages: 1 };
  const loading = roster.loading;
  const fetchDoctor = doctorReq.reload;
  const fetchRoster = roster.reload;

  const refreshAll = () => {
    fetchDoctor();
    fetchRoster();
  };

  const removePatient = async () => {
    setBusy(true);
    setDialogError('');
    try {
      await api.delete(`/doctors/${id}/patients/${toRemove._id}`);
      notify(`${toRemove.name} removed from ${doctor.name}'s patients`);
      setToRemove(null);
      if (patients.length === 1 && page > 1) setPage(page - 1);
      refreshAll();
    } catch (err) {
      setDialogError(apiError(err, 'The patient could not be removed.'));
    } finally {
      setBusy(false);
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
      setDialogError(apiError(err, 'The doctor could not be deleted.'));
    } finally {
      setBusy(false);
    }
  };

  const closeDialogs = () => {
    setToRemove(null);
    setConfirmDoctorDelete(false);
    setDialogError('');
  };

  if (doctorError) {
    return (
      <div className="panel">
        <EmptyState
          icon={Users}
          title="Doctor not found"
          message={doctorError}
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

  return (
    <>
      <Link href="/doctors" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Doctors
      </Link>

      {/* Profile */}
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
                </div>
                <p className="mt-1 text-[15px] text-ink-soft">
                  {doctor.specialization}
                  <span className="text-faint"> with </span>
                  <span className="num font-medium text-ink">
                    {doctor.patientCount} patient{doctor.patientCount === 1 ? '' : 's'}
                  </span>
                </p>
                {doctor.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{doctor.bio}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="btn btn-secondary" onClick={() => setEditingDoctor(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button className="btn btn-primary" onClick={() => setPatientForm(null)}>
                  <UserPlus className="h-4 w-4" />
                  Admit patient
                </button>
                <Menu
                  items={[{ key: 'del', label: 'Delete doctor', icon: Trash2, danger: true, onClick: () => setConfirmDoctorDelete(true) }]}
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
              </div>
            </div>
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

      {/* Patient roster */}
      <section className="panel overflow-visible" aria-labelledby="roster-title">
        <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="roster-title" className="text-[15px] font-semibold text-ink">
            Patients under this doctor
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search name, condition or phone"
              className="sm:w-72"
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
        </div>

        <div className="border-t border-line">
          {loading && !patients.length ? (
            <TableSkeleton rows={4} />
          ) : !patients.length ? (
            <EmptyState
              icon={Users}
              title={search || status ? 'No patients match' : 'No patients yet'}
              message={
                search || status ? 'Try a different search or status.' : `Admit a patient under ${doctor?.name || 'this doctor'} to start their list.`
              }
              action={
                !(search || status) && (
                  <button className="btn btn-primary" onClick={() => setPatientForm(null)}>
                    <UserPlus className="h-4 w-4" />
                    Admit patient
                  </button>
                )
              }
            />
          ) : (
            <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th scope="col">Patient</th>
                      <th scope="col">Condition</th>
                      <th scope="col">Status</th>
                      <th scope="col">Admitted</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr key={p._id} className="table-row group cursor-pointer hover:bg-[#FAFBFB]" onClick={() => setPatientForm(p)}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={p.name} size="sm" />
                            <div>
                              <span className="block font-medium text-ink group-hover:text-pine-700">{p.name}</span>
                              <span className="num block text-[13px] text-muted">
                                {p.age} yrs, {p.gender}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="text-ink">{p.condition}</td>
                        <td>
                          <StatusBadge status={findStatus(PATIENT_STATUSES, p.status)} />
                        </td>
                        <td className="num whitespace-nowrap text-ink-soft">{formatDate(p.admissionDate)}</td>
                        <td className="w-12 text-right" onClick={(e) => e.stopPropagation()}>
                          <Menu
                            items={[
                              { key: 'edit', label: 'Edit patient', icon: Pencil, onClick: () => setPatientForm(p) },
                              { key: 'rm', label: 'Remove from list', icon: Trash2, danger: true, onClick: () => setToRemove(p) },
                            ]}
                            trigger={({ toggle, open }) => (
                              <button
                                className="icon-btn"
                                onClick={toggle}
                                aria-haspopup="menu"
                                aria-expanded={open}
                                aria-label={`Actions for ${p.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            )}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line md:hidden">
                {patients.map((p) => (
                  <li key={p._id} className="flex items-start gap-3 px-4 py-4">
                    <button type="button" onClick={() => setPatientForm(p)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <Avatar name={p.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{p.name}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {p.condition}, {p.age} yrs
                        </span>
                        <span className="mt-2 flex items-center gap-2">
                          <StatusBadge status={findStatus(PATIENT_STATUSES, p.status)} size="sm" />
                          <span className="num text-xs text-faint">{formatDate(p.admissionDate)}</span>
                        </span>
                      </span>
                    </button>
                    <Menu
                      items={[
                        { key: 'edit', label: 'Edit patient', icon: Pencil, onClick: () => setPatientForm(p) },
                        { key: 'rm', label: 'Remove from list', icon: Trash2, danger: true, onClick: () => setToRemove(p) },
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

        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={LIMIT} onPageChange={setPage} noun="patients" />
      </section>

      <DoctorForm open={editingDoctor} doctor={doctor} onClose={() => setEditingDoctor(false)} onSaved={fetchDoctor} />
      <PatientForm
        open={patientForm !== undefined}
        patient={patientForm || null}
        fixedDoctor={patientForm ? undefined : doctor}
        doctors={doctor ? [doctor] : []}
        onClose={() => setPatientForm(undefined)}
        onSaved={refreshAll}
      />
      <ConfirmDialog
        open={Boolean(toRemove)}
        title={`Remove ${toRemove?.name}?`}
        message={`${toRemove?.name} is removed from ${doctor?.name}'s patients and their record is deleted. This cannot be undone.`}
        confirmLabel="Remove patient"
        busy={busy}
        error={dialogError}
        onConfirm={removePatient}
        onCancel={closeDialogs}
      />
      <ConfirmDialog
        open={confirmDoctorDelete}
        title={`Delete ${doctor?.name}?`}
        message={
          doctor?.patientCount
            ? `${doctor.name} still has ${doctor.patientCount} patient${doctor.patientCount === 1 ? '' : 's'}. Remove or reassign them first; the delete will be refused until then.`
            : 'The doctor is removed from the directory permanently.'
        }
        confirmLabel="Delete doctor"
        busy={busy}
        error={dialogError}
        onConfirm={deleteDoctor}
        onCancel={closeDialogs}
      />
    </>
  );
}
