'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  SlidersHorizontal,
  Download,
  Archive,
  RotateCcw,
  ArrowRightLeft,
  FileText,
  X,
} from 'lucide-react';
import api from '../../lib/api';
import useApi from '../../hooks/useApi';
import useDebounce from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import FilterChips from '../../components/ui/FilterChips';
import Pagination from '../../components/ui/Pagination';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import FollowUpBadge from '../../components/ui/FollowUpBadge';
import Checkbox from '../../components/ui/Checkbox';
import Menu from '../../components/ui/Menu';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';
import PatientForm from '../../components/forms/PatientForm';
import TransferDialog from '../../components/forms/TransferDialog';
import { useToast } from '../../components/ui/Toast';
import { FOLLOW_UP_FILTERS, PATIENT_STATUSES, findStatus } from '../../lib/constants';
import { apiError, downloadBlob, formatDate } from '../../lib/format';

const LIMIT = 10;
const SORTS = [
  { value: 'admissionDate:desc', label: 'Admitted, newest' },
  { value: 'admissionDate:asc', label: 'Admitted, oldest' },
  { value: 'followUpDate:asc', label: 'Follow-up, soonest' },
  { value: 'name:asc', label: 'Name, A to Z' },
  { value: 'age:desc', label: 'Age, oldest first' },
];

function PatientsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const notify = useToast();
  const { user } = useAuth();

  // Filters start from the URL, so a filtered list can be bookmarked, shared, and restored with Back
  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState(params.get('status') || '');
  const [condition, setCondition] = useState(params.get('condition') || '');
  const [doctor, setDoctor] = useState(params.get('doctor') || '');
  const [followUp, setFollowUp] = useState(params.get('followUp') || '');
  const [startDate, setStartDate] = useState(params.get('from') || '');
  const [endDate, setEndDate] = useState(params.get('to') || '');
  const [sort, setSort] = useState(params.get('sort') || SORTS[0].value);
  const [page, setPage] = useState(Number(params.get('page')) || 1);
  const [view, setView] = useState(params.get('view') === 'archived' && can(user, 'patient.viewArchived') ? 'archived' : 'active');
  const [showMoreFilters, setShowMoreFilters] = useState(Boolean(params.get('condition') || params.get('from') || params.get('to')));

  const [editing, setEditing] = useState(undefined); // undefined closed, null new, object edit
  const [transferring, setTransferring] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'delete', patient }
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const debouncedCondition = useDebounce(condition, 300);
  const archived = view === 'archived';

  const filterQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (debouncedSearch.trim()) q.set('search', debouncedSearch.trim());
    if (debouncedCondition.trim()) q.set('condition', debouncedCondition.trim());
    if (status) q.set('status', status);
    if (doctor) q.set('doctor', doctor);
    if (followUp) q.set('followUp', followUp);
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    if (archived) q.set('archived', 'true');
    return q;
  }, [debouncedSearch, debouncedCondition, status, doctor, followUp, startDate, endDate, archived]);

  const listQuery = useMemo(() => {
    const q = new URLSearchParams(filterQuery);
    const [sortBy, order] = sort.split(':');
    q.set('page', page);
    q.set('limit', LIMIT);
    q.set('sortBy', sortBy);
    q.set('order', order);
    return q.toString();
  }, [filterQuery, sort, page]);

  // Keep the address bar in sync (replace, not push, so typing doesn't flood history)
  useEffect(() => {
    const q = new URLSearchParams();
    if (debouncedSearch.trim()) q.set('search', debouncedSearch.trim());
    if (status) q.set('status', status);
    if (debouncedCondition.trim()) q.set('condition', debouncedCondition.trim());
    if (doctor) q.set('doctor', doctor);
    if (followUp) q.set('followUp', followUp);
    if (startDate) q.set('from', startDate);
    if (endDate) q.set('to', endDate);
    if (sort !== SORTS[0].value) q.set('sort', sort);
    if (page > 1) q.set('page', page);
    if (archived) q.set('view', 'archived');
    const next = q.toString();
    if (next !== window.location.search.replace(/^\?/, '')) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [debouncedSearch, debouncedCondition, status, doctor, followUp, startDate, endDate, sort, page, archived, pathname, router]);

  const list = useApi(`/patients?${listQuery}`, 'Patients could not be loaded.');
  const doctorList = useApi(user?.role === 'doctor' ? null : '/doctors?limit=100&sortBy=name&order=asc');
  const patients = list.data?.data || [];
  const pagination = list.data?.pagination || { total: 0, totalPages: 1 };
  const doctors = doctorList.data?.data || [];
  const { loading, error } = list;

  const reload = () => {
    setSelected(new Set());
    list.reload();
  };

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
    setSelected(new Set());
  };

  const doctorName = doctors.find((d) => d._id === doctor)?.name;
  const chips = [
    debouncedSearch && { key: 's', label: `“${debouncedSearch}”`, onRemove: () => withReset(setSearch)('') },
    debouncedCondition && { key: 'c', label: `Condition: ${debouncedCondition}`, onRemove: () => withReset(setCondition)('') },
    doctor && { key: 'd', label: doctorName || 'Selected doctor', onRemove: () => withReset(setDoctor)('') },
    followUp && { key: 'f', label: FOLLOW_UP_FILTERS.find((f) => f.value === followUp)?.label, onRemove: () => withReset(setFollowUp)('') },
    startDate && { key: 'from', label: `Admitted from ${formatDate(startDate)}`, onRemove: () => withReset(setStartDate)('') },
    endDate && { key: 'to', label: `Admitted until ${formatDate(endDate)}`, onRemove: () => withReset(setEndDate)('') },
  ].filter(Boolean);

  const clearAll = () => {
    setSearch('');
    setCondition('');
    setStatus('');
    setDoctor('');
    setFollowUp('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setSelected(new Set());
  };

  // ----- actions -----
  const archivePatients = async (ids, label) => {
    try {
      await api.post('/patients/bulk', { action: 'archive', ids });
      reload();
      notify(`${label} archived`, 'success', {
        label: 'Undo',
        onClick: async () => {
          await api.post('/patients/bulk', { action: 'restore', ids });
          notify(`${label} restored`);
          list.reload();
        },
      });
    } catch (err) {
      notify(apiError(err, 'Archiving failed.'), 'error');
    }
  };

  const restorePatients = async (ids, label) => {
    try {
      await api.post('/patients/bulk', { action: 'restore', ids });
      notify(`${label} restored`);
      reload();
    } catch (err) {
      notify(apiError(err, 'Restoring failed.'), 'error');
    }
  };

  const bulkStatus = async (value) => {
    const ids = [...selected];
    try {
      const res = await api.post('/patients/bulk', { action: 'status', status: value, ids });
      notify(`${res.data.updated} patient(s) set to ${findStatus(PATIENT_STATUSES, value).label}`);
      reload();
    } catch (err) {
      notify(apiError(err, 'Bulk update failed.'), 'error');
    }
  };

  const deletePermanently = async () => {
    setBusy(true);
    setDialogError('');
    try {
      await api.delete(`/patients/${confirm.patient._id}`);
      notify(`${confirm.patient.name} permanently deleted`);
      setConfirm(null);
      if (patients.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      setDialogError(apiError(err, 'The patient could not be deleted.'));
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const q = new URLSearchParams(filterQuery);
      const [sortBy, order] = sort.split(':');
      q.set('sortBy', sortBy);
      q.set('order', order);
      const res = await api.get(`/patients/export?${q}`, { responseType: 'blob' });
      downloadBlob(res.data, `patients-${new Date().toISOString().slice(0, 10)}.csv`);
      notify('Export downloaded');
    } catch (err) {
      notify(apiError(err, 'Export failed.'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const rowMenu = (p) =>
    archived
      ? [
          { key: 'restore', label: 'Restore', icon: RotateCcw, onClick: () => restorePatients([p._id], p.name) },
          { key: 'delete', label: 'Delete permanently', icon: Trash2, danger: true, onClick: () => setConfirm({ kind: 'delete', patient: p }) },
        ]
      : [
          { key: 'open', label: 'Open record', icon: FileText, onClick: () => router.push(`/patients/${p._id}`) },
          { key: 'edit', label: 'Edit', icon: Pencil, onClick: () => setEditing(p) },
          ...(can(user, 'patient.transfer') ? [{ key: 'transfer', label: 'Transfer', icon: ArrowRightLeft, onClick: () => setTransferring(p) }] : []),
          ...(can(user, 'patient.archive')
            ? [{ key: 'archive', label: 'Archive', icon: Archive, danger: true, onClick: () => archivePatients([p._id], p.name) }]
            : []),
        ];

  const allOnPage = patients.length > 0 && patients.every((p) => selected.has(p._id));
  const someOnPage = patients.some((p) => selected.has(p._id));
  const toggle = (id, on) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleAll = (on) =>
    setSelected((prev) => {
      const next = new Set(prev);
      patients.forEach((p) => (on ? next.add(p._id) : next.delete(p._id)));
      return next;
    });

  const tabs = [{ value: '', label: 'All patients' }, ...PATIENT_STATUSES];
  const openRow = (p) => (archived ? null : router.push(`/patients/${p._id}`));

  return (
    <>
      <PageHeader
        title={archived ? 'Archived patients' : 'Patients'}
        description={
          archived
            ? 'Archived records are hidden everywhere else. Restore them, or delete them permanently.'
            : user?.role === 'doctor'
              ? 'Your patients. Select a row to open the full record.'
              : 'Every patient across all doctors. Select a row to open the full record.'
        }
        actions={
          <>
            <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting || !pagination.total}>
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            {!archived && can(user, 'patient.create') && (
              <button className="btn btn-primary" onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4" />
                Admit patient
              </button>
            )}
          </>
        }
      />

      <div className="panel overflow-visible">
        {/* Status tabs (+ Archived for admins) */}
        <div className="flex items-center overflow-x-auto border-b border-line px-2 sm:px-3" role="tablist" aria-label="Filter by clinical status">
          <div className="flex min-w-max flex-1">
            {!archived &&
              tabs.map((t) => {
                const active = status === t.value;
                return (
                  <button
                    key={t.value || 'all'}
                    role="tab"
                    aria-selected={active}
                    onClick={() => withReset(setStatus)(t.value)}
                    className={`relative flex h-12 items-center gap-2 px-3 text-sm font-medium transition-colors ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
                  >
                    {t.bar && <span className={`h-2 w-2 rounded-full ${t.bar}`} aria-hidden="true" />}
                    {t.label}
                    {active && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-pine-700" />}
                  </button>
                );
              })}
            {archived && <span className="flex h-12 items-center px-3 text-sm font-medium text-ink">Archived records</span>}
          </div>
          {can(user, 'patient.viewArchived') && (
            <button
              type="button"
              onClick={() => {
                withReset(setView)(archived ? 'active' : 'archived');
                setStatus('');
              }}
              className="ml-2 flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
            >
              {archived ? <Users className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {archived ? 'Back to active' : 'Archived'}
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={withReset(setSearch)} placeholder="Search patients" className="lg:max-w-xs lg:flex-1" />
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:flex sm:flex-1 sm:flex-wrap lg:justify-end">
            {user?.role !== 'doctor' && (
              <select
                className="select sm:w-auto"
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
            )}
            {!archived && (
              <select className="select sm:w-auto" value={followUp} onChange={(e) => withReset(setFollowUp)(e.target.value)} aria-label="Follow-up">
                <option value="">Any follow-up</option>
                {FOLLOW_UP_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            )}
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

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-pine-50 px-4 py-2.5 sm:px-5">
            <span className="num mr-2 text-sm font-medium text-pine-800">{selected.size} selected</span>
            {!archived && can(user, 'patient.bulkStatus') && (
              <Menu
                align="left"
                items={PATIENT_STATUSES.map((s) => ({ key: s.value, label: `Set to ${s.label}`, onClick: () => bulkStatus(s.value) }))}
                trigger={({ toggle: t, open }) => (
                  <button className="btn btn-sm btn-secondary" onClick={t} aria-haspopup="menu" aria-expanded={open}>
                    Change status
                  </button>
                )}
              />
            )}
            {!archived && can(user, 'patient.archive') && (
              <button className="btn btn-sm btn-secondary" onClick={() => archivePatients([...selected], `${selected.size} patient(s)`)}>
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
            )}
            {archived && (
              <button className="btn btn-sm btn-secondary" onClick={() => restorePatients([...selected], `${selected.size} patient(s)`)}>
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </button>
            )}
            <button className="btn btn-sm btn-ghost ml-auto" onClick={() => setSelected(new Set())}>
              <X className="h-3.5 w-3.5" />
              Clear selection
            </button>
          </div>
        )}

        <div className="border-t border-line">
          {error ? (
            <EmptyState
              icon={Users}
              title="Patients could not be loaded"
              message={error}
              action={
                <button className="btn btn-secondary" onClick={list.reload}>
                  Try again
                </button>
              }
            />
          ) : loading && !patients.length ? (
            <TableSkeleton />
          ) : !patients.length ? (
            <EmptyState
              icon={archived ? Archive : Users}
              title={archived ? 'No archived patients' : chips.length || status ? 'No patients match these filters' : 'No patients yet'}
              message={
                archived
                  ? 'Archived records will appear here.'
                  : chips.length || status
                    ? 'Remove a filter or try a different search.'
                    : 'Admit the first patient to start tracking care.'
              }
              action={
                chips.length || status ? (
                  <button className="btn btn-secondary" onClick={clearAll}>
                    Clear filters
                  </button>
                ) : null
              }
            />
          ) : (
            <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
              <div className="relative hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th scope="col" className="w-10">
                        <Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} onChange={toggleAll} label="Select all on this page" />
                      </th>
                      <th scope="col">Patient</th>
                      <th scope="col">Condition</th>
                      <th scope="col" className="hidden xl:table-cell">
                        Attending doctor
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col">{archived ? 'Archived' : 'Follow-up'}</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr
                        key={p._id}
                        className={`table-row group ${archived ? '' : 'cursor-pointer'} ${selected.has(p._id) ? 'bg-pine-50/60' : 'hover:bg-[#FAFBFB]'}`}
                        onClick={() => openRow(p)}
                      >
                        <td className="w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selected.has(p._id)} onChange={(on) => toggle(p._id, on)} label={`Select ${p.name}`} />
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={p.name} />
                            <div className="min-w-0">
                              {archived ? (
                                <span className="block truncate font-medium text-ink">{p.name}</span>
                              ) : (
                                <Link
                                  href={`/patients/${p._id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="block truncate font-medium text-ink group-hover:text-pine-700"
                                >
                                  {p.name}
                                </Link>
                              )}
                              <span className="num block text-[13px] text-muted">
                                {p.age} yrs, {p.gender}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[240px] text-ink">
                          <span className="block truncate">{p.condition}</span>
                          {p.doctor?.name && <span className="block truncate text-[13px] text-muted xl:hidden">{p.doctor.name}</span>}
                        </td>
                        <td className="hidden xl:table-cell" onClick={(e) => e.stopPropagation()}>
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
                        <td className="whitespace-nowrap">
                          {archived ? (
                            <span className="num text-sm text-ink-soft">{formatDate(p.archivedAt)}</span>
                          ) : p.status === 'Discharged' ? (
                            <span className="text-faint">—</span>
                          ) : (
                            <FollowUpBadge date={p.followUpDate} />
                          )}
                        </td>
                        <td className="w-12 text-right" onClick={(e) => e.stopPropagation()}>
                          <Menu
                            items={rowMenu(p)}
                            trigger={({ toggle: t, open }) => (
                              <button className="icon-btn" onClick={t} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${p.name}`}>
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
                  <li key={p._id} className={`flex items-start gap-3 px-4 py-4 ${selected.has(p._id) ? 'bg-pine-50/60' : ''}`}>
                    <div className="pt-3">
                      <Checkbox checked={selected.has(p._id)} onChange={(on) => toggle(p._id, on)} label={`Select ${p.name}`} />
                    </div>
                    <button type="button" onClick={() => openRow(p)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <Avatar name={p.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{p.name}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {p.condition}, {p.age} yrs
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <StatusBadge status={findStatus(PATIENT_STATUSES, p.status)} size="sm" />
                          {!archived && p.status !== 'Discharged' && p.followUpDate && <FollowUpBadge date={p.followUpDate} compact />}
                          <span className="truncate text-xs text-muted">{p.doctor?.name}</span>
                        </span>
                      </span>
                    </button>
                    <Menu
                      items={rowMenu(p)}
                      trigger={({ toggle: t, open }) => (
                        <button className="icon-btn -mr-2" onClick={t} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${p.name}`}>
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

        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={LIMIT}
          onPageChange={(n) => {
            setPage(n);
            setSelected(new Set());
          }}
          noun="patients"
        />
      </div>

      <PatientForm open={editing !== undefined} patient={editing || null} doctors={doctors} onClose={() => setEditing(undefined)} onSaved={reload} />
      <TransferDialog patient={transferring} onClose={() => setTransferring(null)} onDone={reload} />
      <ConfirmDialog
        open={confirm?.kind === 'delete'}
        title={`Permanently delete ${confirm?.patient?.name}?`}
        message="The record, condition and notes are removed for good. This cannot be undone. (Its history entries stay in the audit log.)"
        confirmLabel="Delete permanently"
        busy={busy}
        error={dialogError}
        onConfirm={deletePermanently}
        onCancel={() => {
          setConfirm(null);
          setDialogError('');
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
