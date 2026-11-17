'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, MoreHorizontal, Pencil, Trash2, Users, SlidersHorizontal } from 'lucide-react';
import api from '../../lib/api';
import useDebounce from '../../hooks/useDebounce';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import FilterChips from '../../components/ui/FilterChips';
import Pagination from '../../components/ui/Pagination';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import Menu from '../../components/ui/Menu';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';
import PatientForm from '../../components/forms/PatientForm';
import { useToast } from '../../components/ui/Toast';
import { PATIENT_STATUSES, findStatus } from '../../lib/constants';
import { apiError, formatDate } from '../../lib/format';

const LIMIT = 10;
const SORTS = [
  { value: 'admissionDate:desc', label: 'Admitted, newest' },
  { value: 'admissionDate:asc', label: 'Admitted, oldest' },
  { value: 'name:asc', label: 'Name, A to Z' },
  { value: 'age:desc', label: 'Age, oldest first' },
];

function PatientsView() {
  const params = useSearchParams();
  const notify = useToast();

  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState(params.get('status') || '');
  const [condition, setCondition] = useState('');
  const [doctor, setDoctor] = useState(params.get('doctor') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState(SORTS[0].value);
  const [page, setPage] = useState(1);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(undefined); // undefined closed, null new, object edit
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const debouncedSearch = useDebounce(search, 300);
  const debouncedCondition = useDebounce(condition, 300);
  const requestSeq = useRef(0);

  useEffect(() => {
    api
      .get('/doctors?limit=100&sortBy=name&order=asc')
      .then((res) => setDoctors(res.data.data))
      .catch(() => {});
  }, []);

  const fetchPatients = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    const [sortBy, order] = sort.split(':');
    const q = new URLSearchParams({ page, limit: LIMIT, sortBy, order });
    if (debouncedSearch.trim()) q.set('search', debouncedSearch.trim());
    if (debouncedCondition.trim()) q.set('condition', debouncedCondition.trim());
    if (status) q.set('status', status);
    if (doctor) q.set('doctor', doctor);
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    try {
      const res = await api.get(`/patients?${q}`);
      if (seq !== requestSeq.current) return;
      setPatients(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(apiError(err, 'Patients could not be loaded.'));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [page, debouncedSearch, debouncedCondition, status, doctor, startDate, endDate, sort]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const doctorName = doctors.find((d) => d._id === doctor)?.name;
  const chips = [
    debouncedSearch && { key: 's', label: `“${debouncedSearch}”`, onRemove: () => withReset(setSearch)('') },
    debouncedCondition && { key: 'c', label: `Condition: ${debouncedCondition}`, onRemove: () => withReset(setCondition)('') },
    doctor && { key: 'd', label: doctorName || 'Selected doctor', onRemove: () => withReset(setDoctor)('') },
    startDate && { key: 'from', label: `Admitted from ${formatDate(startDate)}`, onRemove: () => withReset(setStartDate)('') },
    endDate && { key: 'to', label: `Admitted until ${formatDate(endDate)}`, onRemove: () => withReset(setEndDate)('') },
  ].filter(Boolean);

  const clearAll = () => {
    setSearch('');
    setCondition('');
    setStatus('');
    setDoctor('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/patients/${toDelete._id}`);
      notify(`${toDelete.name} deleted`);
      setToDelete(null);
      // Step back a page if this was the last row on it
      if (patients.length === 1 && page > 1) setPage(page - 1);
      else fetchPatients();
    } catch (err) {
      setDeleteError(apiError(err, 'The patient could not be deleted.'));
    } finally {
      setDeleting(false);
    }
  };

  const rowMenu = (p) => [
    { key: 'edit', label: 'Edit patient', icon: Pencil, onClick: () => setEditing(p) },
    { key: 'delete', label: 'Delete patient', icon: Trash2, danger: true, onClick: () => setToDelete(p) },
  ];

  const tabs = [{ value: '', label: 'All patients' }, ...PATIENT_STATUSES];

  return (
    <>
      <PageHeader
        title="Patients"
        description="Every patient across all doctors. Select a row to edit their record."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            Admit patient
          </button>
        }
      />

      <div className="panel overflow-visible">
        {/* Status tabs */}
        <div className="overflow-x-auto border-b border-line px-2 sm:px-3" role="tablist" aria-label="Filter by clinical status">
          <div className="flex min-w-max">
            {tabs.map((t) => {
              const active = status === t.value;
              return (
                <button
                  key={t.value || 'all'}
                  role="tab"
                  aria-selected={active}
                  onClick={() => withReset(setStatus)(t.value)}
                  className={`relative flex h-12 items-center gap-2 px-3 text-sm font-medium transition-colors ${
                    active ? 'text-ink' : 'text-muted hover:text-ink'
                  }`}
                >
                  {t.bar && <span className={`h-2 w-2 rounded-full ${t.bar}`} aria-hidden="true" />}
                  {t.label}
                  {active && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-pine-700" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={withReset(setSearch)} placeholder="Search patients" className="lg:max-w-sm lg:flex-1" />
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-1 sm:flex-wrap lg:justify-end">
            <select
              className="select col-span-2 sm:w-auto"
              value={doctor}
              onChange={(e) => withReset(setDoctor)(e.target.value)}
              aria-label="Attending doctor"
            >
              <option value="">All doctors</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select className="select sm:w-auto" value={sort} onChange={(e) => withReset(setSort)(e.target.value)} aria-label="Sort order">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`btn btn-secondary ${showMoreFilters ? 'bg-canvas' : ''}`}
              onClick={() => setShowMoreFilters((v) => !v)}
              aria-expanded={showMoreFilters}
            >
              <SlidersHorizontal className="h-4 w-4" />
              More filters
            </button>
          </div>
        </div>

        {showMoreFilters && (
          <div className="grid gap-3 border-t border-line bg-[#FAFBFB] p-4 sm:grid-cols-3 sm:p-5">
            <label className="block">
              <span className="field-label">Condition contains</span>
              <input
                className="input"
                value={condition}
                maxLength={100}
                onChange={(e) => withReset(setCondition)(e.target.value)}
                placeholder="e.g. diabetes"
              />
            </label>
            <label className="block">
              <span className="field-label">Admitted from</span>
              <input
                type="date"
                className="input num"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => withReset(setStartDate)(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="field-label">Admitted until</span>
              <input
                type="date"
                className="input num"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => withReset(setEndDate)(e.target.value)}
              />
            </label>
          </div>
        )}

        <FilterChips chips={chips} onClearAll={clearAll} />

        <div className="border-t border-line">
          {error ? (
            <EmptyState
              icon={Users}
              title="Patients could not be loaded"
              message={error}
              action={
                <button className="btn btn-secondary" onClick={fetchPatients}>
                  Try again
                </button>
              }
            />
          ) : loading && !patients.length ? (
            <TableSkeleton />
          ) : !patients.length ? (
            <EmptyState
              icon={Users}
              title={chips.length || status ? 'No patients match these filters' : 'No patients yet'}
              message={chips.length || status ? 'Remove a filter or try a different search.' : 'Admit the first patient to start tracking care.'}
              action={
                chips.length || status ? (
                  <button className="btn btn-secondary" onClick={clearAll}>
                    Clear filters
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => setEditing(null)}>
                    <Plus className="h-4 w-4" />
                    Admit patient
                  </button>
                )
              }
            />
          ) : (
            <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
              <table className="hidden w-full md:table">
                <thead className="table-head">
                  <tr>
                    <th scope="col">Patient</th>
                    <th scope="col">Condition</th>
                    <th scope="col" className="hidden lg:table-cell">
                      Attending doctor
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col" className="hidden xl:table-cell">
                      Admitted
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p._id} className="table-row group cursor-pointer hover:bg-[#FAFBFB]" onClick={() => setEditing(p)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} />
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-ink group-hover:text-pine-700">{p.name}</span>
                            <span className="num block text-[13px] text-muted">
                              {p.age} yrs, {p.gender}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[220px] truncate text-ink">{p.condition}</td>
                      <td className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                        {p.doctor ? (
                          <Link href={`/doctors/${p.doctor._id}`} className="hover:text-pine-700 hover:underline">
                            {p.doctor.name}
                          </Link>
                        ) : (
                          <span className="text-faint">Unassigned</span>
                        )}
                        {p.doctor?.specialization && <span className="block text-[13px] text-muted">{p.doctor.specialization}</span>}
                      </td>
                      <td>
                        <StatusBadge status={findStatus(PATIENT_STATUSES, p.status)} />
                      </td>
                      <td className="num hidden whitespace-nowrap text-ink-soft xl:table-cell">{formatDate(p.admissionDate)}</td>
                      <td className="w-12 text-right" onClick={(e) => e.stopPropagation()}>
                        <Menu
                          items={rowMenu(p)}
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

              <ul className="divide-y divide-line md:hidden">
                {patients.map((p) => (
                  <li key={p._id} className="flex items-start gap-3 px-4 py-4">
                    <button type="button" onClick={() => setEditing(p)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <Avatar name={p.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{p.name}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {p.condition}, {p.age} yrs
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <StatusBadge status={findStatus(PATIENT_STATUSES, p.status)} size="sm" />
                          <span className="truncate text-xs text-muted">{p.doctor?.name}</span>
                        </span>
                      </span>
                    </button>
                    <Menu
                      items={rowMenu(p)}
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
      </div>

      <PatientForm
        open={editing !== undefined}
        patient={editing || null}
        doctors={doctors}
        onClose={() => setEditing(undefined)}
        onSaved={fetchPatients}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete ${toDelete?.name}?`}
        message="Their record, condition and notes are removed permanently. This cannot be undone."
        confirmLabel="Delete patient"
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setToDelete(null);
          setDeleteError('');
        }}
      />
    </>
  );
}

export default function PatientsPage() {
  return (
    <Suspense>
      <PatientsView />
    </Suspense>
  );
}
