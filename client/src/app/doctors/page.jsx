'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, MoreHorizontal, UserPlus, Pencil, Eye, Stethoscope, SlidersHorizontal } from 'lucide-react';
import useApi from '../../hooks/useApi';
import useDebounce from '../../hooks/useDebounce';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import FilterChips from '../../components/ui/FilterChips';
import Pagination from '../../components/ui/Pagination';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import Menu from '../../components/ui/Menu';
import EmptyState from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import DoctorForm from '../../components/forms/DoctorForm';
import PatientForm from '../../components/forms/PatientForm';
import { DOCTOR_STATUSES, findStatus } from '../../lib/constants';
import { formatDate } from '../../lib/format';

const LIMIT = 10;
const SORTS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'name:asc', label: 'Name, A to Z' },
  { value: 'experienceYears:desc', label: 'Most experienced' },
  { value: 'specialization:asc', label: 'Specialty' },
];

function DoctorsView() {
  const router = useRouter();
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get('search') || '');
  const [specialization, setSpecialization] = useState(params.get('specialization') || '');
  const [hospital, setHospital] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState(SORTS[0].value);
  const [page, setPage] = useState(1);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [admitFor, setAdmitFor] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  const query = useMemo(() => {
    const [sortBy, order] = sort.split(':');
    const q = new URLSearchParams({ page, limit: LIMIT, sortBy, order });
    if (debouncedSearch.trim()) q.set('search', debouncedSearch.trim());
    if (specialization) q.set('specialization', specialization);
    if (hospital) q.set('hospital', hospital);
    if (status) q.set('status', status);
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    return q.toString();
  }, [page, debouncedSearch, specialization, hospital, status, startDate, endDate, sort]);

  const list = useApi(`/doctors?${query}`, 'Doctors could not be loaded.');
  const filters = useApi('/doctors/filters');
  const doctors = list.data?.data || [];
  const pagination = list.data?.pagination || { total: 0, totalPages: 1 };
  const options = filters.data?.data || { specializations: [], hospitals: [] };
  const { loading, error } = list;
  const fetchDoctors = list.reload;
  const loadOptions = filters.reload;

  // Any filter change returns to the first page
  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const chips = [
    debouncedSearch && { key: 's', label: `“${debouncedSearch}”`, onRemove: () => withReset(setSearch)('') },
    specialization && { key: 'sp', label: specialization, onRemove: () => withReset(setSpecialization)('') },
    hospital && { key: 'h', label: hospital, onRemove: () => withReset(setHospital)('') },
    status && { key: 'st', label: findStatus(DOCTOR_STATUSES, status).label, onRemove: () => withReset(setStatus)('') },
    startDate && { key: 'from', label: `Joined from ${formatDate(startDate)}`, onRemove: () => withReset(setStartDate)('') },
    endDate && { key: 'to', label: `Joined until ${formatDate(endDate)}`, onRemove: () => withReset(setEndDate)('') },
  ].filter(Boolean);

  const clearAll = () => {
    setSearch('');
    setSpecialization('');
    setHospital('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const rowMenu = (doc) => [
    { key: 'view', label: 'View profile', icon: Eye, onClick: () => router.push(`/doctors/${doc._id}`) },
    { key: 'admit', label: 'Admit a patient', icon: UserPlus, onClick: () => setAdmitFor(doc) },
    { key: 'edit', label: 'Edit details', icon: Pencil, onClick: () => setEditing(doc) },
  ];

  return (
    <>
      <PageHeader
        title="Doctors"
        description="Find a doctor, check their caseload, and admit patients under their care."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            Add doctor
          </button>
        }
      />

      <div className="panel overflow-visible">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={withReset(setSearch)} placeholder="Search doctors" className="lg:max-w-sm lg:flex-1" />
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-1 sm:flex-wrap lg:justify-end">
            <select
              className="select sm:w-auto"
              value={specialization}
              onChange={(e) => withReset(setSpecialization)(e.target.value)}
              aria-label="Specialty"
            >
              <option value="">All specialties</option>
              {options.specializations.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select className="select sm:w-auto" value={status} onChange={(e) => withReset(setStatus)(e.target.value)} aria-label="Availability">
              <option value="">Any availability</option>
              {DOCTOR_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
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
              <span className="field-label">Hospital</span>
              <select className="select" value={hospital} onChange={(e) => withReset(setHospital)(e.target.value)}>
                <option value="">All hospitals</option>
                {options.hospitals.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Joined from</span>
              <input
                type="date"
                className="input num"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => withReset(setStartDate)(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="field-label">Joined until</span>
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

        {/* Results */}
        <div className="border-t border-line">
          {error ? (
            <EmptyState
              icon={Stethoscope}
              title="Doctors could not be loaded"
              message={error}
              action={
                <button className="btn btn-secondary" onClick={fetchDoctors}>
                  Try again
                </button>
              }
            />
          ) : loading && !doctors.length ? (
            <TableSkeleton />
          ) : !doctors.length ? (
            <EmptyState
              icon={Stethoscope}
              title={chips.length ? 'No doctors match these filters' : 'No doctors yet'}
              message={chips.length ? 'Remove a filter or try a different search.' : 'Add the first doctor to start tracking patients.'}
              action={
                chips.length ? (
                  <button className="btn btn-secondary" onClick={clearAll}>
                    Clear filters
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => setEditing(null)}>
                    <Plus className="h-4 w-4" />
                    Add doctor
                  </button>
                )
              }
            />
          ) : (
            <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
              {/* Desktop table */}
              <table className="hidden w-full md:table">
                <thead className="table-head">
                  <tr>
                    <th scope="col">Doctor</th>
                    <th scope="col">Specialty</th>
                    <th scope="col" className="hidden xl:table-cell">
                      Hospital
                    </th>
                    <th scope="col" className="text-right">
                      Patients
                    </th>
                    <th scope="col">Availability</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc) => (
                    <tr
                      key={doc._id}
                      className="table-row group cursor-pointer hover:bg-[#FAFBFB]"
                      onClick={() => router.push(`/doctors/${doc._id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={doc.name} />
                          <div className="min-w-0">
                            <Link
                              href={`/doctors/${doc._id}`}
                              className="block truncate font-medium text-ink group-hover:text-pine-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {doc.name}
                            </Link>
                            <span className="block truncate text-[13px] text-muted">{doc.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-ink">{doc.specialization}</span>
                        <span className="num block text-[13px] text-muted">{doc.experienceYears} yrs experience</span>
                      </td>
                      <td className="hidden max-w-[220px] truncate text-ink-soft xl:table-cell">{doc.hospital}</td>
                      <td className="num text-right font-medium text-ink">{doc.patientCount}</td>
                      <td>
                        <StatusBadge status={findStatus(DOCTOR_STATUSES, doc.status)} />
                      </td>
                      <td className="w-12 text-right" onClick={(e) => e.stopPropagation()}>
                        <Menu
                          items={rowMenu(doc)}
                          trigger={({ toggle, open }) => (
                            <button
                              className="icon-btn"
                              onClick={toggle}
                              aria-haspopup="menu"
                              aria-expanded={open}
                              aria-label={`Actions for ${doc.name}`}
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

              {/* Mobile cards */}
              <ul className="divide-y divide-line md:hidden">
                {doctors.map((doc) => (
                  <li key={doc._id} className="flex items-start gap-3 px-4 py-4">
                    <Link href={`/doctors/${doc._id}`} className="flex min-w-0 flex-1 items-start gap-3">
                      <Avatar name={doc.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{doc.name}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {doc.specialization}, {doc.hospital}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={findStatus(DOCTOR_STATUSES, doc.status)} size="sm" />
                          <span className="num text-xs text-muted">
                            {doc.patientCount} patient{doc.patientCount === 1 ? '' : 's'}
                          </span>
                        </span>
                      </span>
                    </Link>
                    <Menu
                      items={rowMenu(doc)}
                      trigger={({ toggle, open }) => (
                        <button
                          className="icon-btn -mr-2"
                          onClick={toggle}
                          aria-haspopup="menu"
                          aria-expanded={open}
                          aria-label={`Actions for ${doc.name}`}
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

        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={LIMIT} onPageChange={setPage} noun="doctors" />
      </div>

      <DoctorForm
        open={editing !== undefined}
        doctor={editing || null}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          fetchDoctors();
          loadOptions();
        }}
      />
      <PatientForm open={Boolean(admitFor)} patient={null} fixedDoctor={admitFor} onClose={() => setAdmitFor(null)} onSaved={fetchDoctors} />
    </>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense>
      <DoctorsView />
    </Suspense>
  );
}
