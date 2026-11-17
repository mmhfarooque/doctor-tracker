'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  AlertCircle,
  X,
  Stethoscope,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import api from '../../lib/api';
import useDebounce from '../../hooks/useDebounce';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const requestSeq = useRef(0); // ignore responses from requests that a newer one has superseded
  const [conditionFilter, setConditionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Add Patient Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    condition: '',
    status: 'Stable',
    doctor: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [addingPatient, setAddingPatient] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit Patient Modal State
  const [editingPatient, setEditingPatient] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Patient State
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch doctors for doctor filter & assigned doctor dropdowns
  useEffect(() => {
    const fetchDoctorsDropdown = async () => {
      try {
        const res = await api.get('/doctors?limit=100');
        if (res.data.success) {
          setDoctorsList(res.data.data);
          if (res.data.data.length > 0 && !newPatient.doctor) {
            setNewPatient((prev) => ({ ...prev, doctor: res.data.data[0]._id }));
          }
        }
      } catch (err) {
        console.error('Failed to load doctors list', err);
      }
    };
    fetchDoctorsDropdown();
  }, []);

  // Fetch Patients
  const fetchPatients = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (conditionFilter !== 'all') params.append('condition', conditionFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (doctorFilter !== 'all') params.append('doctor', doctorFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/patients?${params.toString()}`);
      if (seq !== requestSeq.current) return;
      if (res.data.success) {
        setPatients(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err.response?.data?.message || 'Failed to fetch patients list');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [page, debouncedSearch, conditionFilter, statusFilter, doctorFilter, startDate, endDate]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Handle Create Patient
  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddingPatient(true);

    try {
      const res = await api.post('/patients', newPatient);
      if (res.data.success) {
        setShowAddModal(false);
        setNewPatient({
          name: '',
          age: '',
          gender: 'Male',
          condition: '',
          status: 'Stable',
          doctor: doctorsList[0]?._id || '',
          phone: '',
          email: '',
          notes: '',
        });
        fetchPatients();
      }
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error creating patient');
    } finally {
      setAddingPatient(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (patient) => {
    setEditingPatient(patient);
    setEditFormData({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      condition: patient.condition,
      status: patient.status,
      doctor: patient.doctor?._id || patient.doctor,
      phone: patient.phone || '',
      email: patient.email || '',
      notes: patient.notes || '',
    });
    setEditError('');
  };

  // Handle Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setSavingEdit(true);

    try {
      const res = await api.put(`/patients/${editingPatient._id}`, editFormData);
      if (res.data.success) {
        setEditingPatient(null);
        fetchPatients();
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update patient');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Delete Patient
  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    setDeleting(true);

    try {
      const res = await api.delete(`/patients/${patientToDelete._id}`);
      if (res.data.success) {
        setPatientToDelete(null);
        fetchPatients();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete patient');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setConditionFilter('all');
    setStatusFilter('all');
    setDoctorFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Dedicated Patient Management
          </h1>
          <p className="text-xs text-slate-500">
            Comprehensive patient directory with diagnosis records, assigned physicians, and admission tracking
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          <span>Admit New Patient</span>
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search Bar */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, diagnosis, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          {/* Condition Filter */}
          <div>
            <input
              type="text"
              placeholder="Filter by diagnosis..."
              value={conditionFilter === 'all' ? '' : conditionFilter}
              onChange={(e) => {
                setConditionFilter(e.target.value.trim() === '' ? 'all' : e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
            >
              <option value="all">All Clinical Statuses</option>
              <option value="Stable">Stable</option>
              <option value="Critical">Critical</option>
              <option value="Under Observation">Under Observation</option>
              <option value="Recovering">Recovering</option>
              <option value="Discharged">Discharged</option>
            </select>
          </div>

          {/* Assigned Doctor Filter */}
          <div>
            <select
              value={doctorFilter}
              onChange={(e) => {
                setDoctorFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
            >
              <option value="all">All Attending Doctors</option>
              {doctorsList.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
              title="Start Date"
            />
          </div>
        </div>

        {/* Date End & Clear Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium">Admission End Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 py-1 px-2.5 text-xs text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
              title="End Date"
            />
          </div>

          {(search || conditionFilter !== 'all' || statusFilter !== 'all' || doctorFilter !== 'all' || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Patients Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 pl-4">Patient Name</th>
                <th className="py-3.5">Age / Gender</th>
                <th className="py-3.5">Condition / Diagnosis</th>
                <th className="py-3.5">Assigned Physician</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5">Contact</th>
                <th className="py-3.5">Admission Date</th>
                <th className="py-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                      <span className="text-slate-400 text-xs">Loading patient records...</span>
                    </div>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">No patients matched criteria</p>
                    <p className="text-xs text-slate-400">Try modifying search or filter parameters.</p>
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-4 font-bold text-slate-900">
                      {p.name}
                    </td>
                    <td className="py-3.5 text-slate-600">
                      {p.age} yrs • {p.gender}
                    </td>
                    <td className="py-3.5">
                      <span className="font-semibold text-slate-800">{p.condition}</span>
                    </td>
                    <td className="py-3.5">
                      {p.doctor ? (
                        <Link
                          href={`/doctors/${p.doctor._id}`}
                          className="font-semibold text-teal-700 hover:underline"
                        >
                          {p.doctor.name}
                        </Link>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          p.status === 'Critical'
                            ? 'bg-rose-100 text-rose-700'
                            : p.status === 'Recovering'
                            ? 'bg-sky-100 text-sky-700'
                            : p.status === 'Under Observation'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {p.phone || p.email || '—'}
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {new Date(p.admissionDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Edit Patient Information"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPatientToDelete(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Patient Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Add Patient Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Admit New Patient"
      >
        {addError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {addError}
          </div>
        )}

        <form onSubmit={handleCreatePatient} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Patient Full Name *</label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Thomas Shelby"
              value={newPatient.name}
              onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Age *</label>
              <input
                type="number"
                min="0"
                max="130"
                required
                value={newPatient.age}
                onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Gender *</label>
              <select
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Condition / Diagnosis *</label>
              <input
                type="text"
                required
                maxLength={150}
                placeholder="e.g. Type 2 Diabetes"
                value={newPatient.condition}
                onChange={(e) => setNewPatient({ ...newPatient, condition: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Status</label>
              <select
                value={newPatient.status}
                onChange={(e) => setNewPatient({ ...newPatient, status: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              >
                <option value="Stable">Stable</option>
                <option value="Critical">Critical</option>
                <option value="Under Observation">Under Observation</option>
                <option value="Recovering">Recovering</option>
                <option value="Discharged">Discharged</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Assign Attending Doctor *</label>
            <select
              required
              value={newPatient.doctor}
              onChange={(e) => setNewPatient({ ...newPatient, doctor: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            >
              <option value="">Select Doctor</option>
              {doctorsList.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.name} — {doc.specialization} ({doc.hospital})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Contact Phone</label>
              <input
                type="tel"
                maxLength={30}
                placeholder="+1 (555) 000-0000"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Contact Email</label>
              <input
                type="email"
                maxLength={100}
                placeholder="patient@example.com"
                value={newPatient.email}
                onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Clinical Notes</label>
            <textarea
              rows={2}
              maxLength={1000}
              placeholder="Clinical observation, ongoing prescription..."
              value={newPatient.notes}
              onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingPatient}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {addingPatient ? 'Admitting...' : 'Admit Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal
        isOpen={!!editingPatient}
        onClose={() => setEditingPatient(null)}
        title="Edit Patient Information"
      >
        {editError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {editError}
          </div>
        )}

        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Patient Full Name *</label>
            <input
              type="text"
              required
              value={editFormData.name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Age *</label>
              <input
                type="number"
                min="0"
                max="130"
                required
                value={editFormData.age || ''}
                onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Gender *</label>
              <select
                value={editFormData.gender || 'Male'}
                onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Condition / Diagnosis *</label>
              <input
                type="text"
                required
                value={editFormData.condition || ''}
                onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Status</label>
              <select
                value={editFormData.status || 'Stable'}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              >
                <option value="Stable">Stable</option>
                <option value="Critical">Critical</option>
                <option value="Under Observation">Under Observation</option>
                <option value="Recovering">Recovering</option>
                <option value="Discharged">Discharged</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Assigned Physician</label>
            <select
              value={editFormData.doctor || ''}
              onChange={(e) => setEditFormData({ ...editFormData, doctor: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            >
              {doctorsList.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.name} — {doc.specialization} ({doc.hospital})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Phone</label>
              <input
                type="tel"
                value={editFormData.phone || ''}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Clinical Notes</label>
            <textarea
              rows={2}
              value={editFormData.notes || ''}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingPatient(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {savingEdit ? 'Saving...' : 'Update Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Patient Confirmation */}
      <Modal
        isOpen={!!patientToDelete}
        onClose={() => setPatientToDelete(null)}
        title="Delete Patient Record"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-3 text-rose-700 text-xs">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>
              Are you sure you want to permanently delete patient <strong>{patientToDelete?.name}</strong>? All medical records for this patient will be removed.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setPatientToDelete(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeletePatient}
              disabled={deleting}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
