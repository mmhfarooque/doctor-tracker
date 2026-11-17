'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  UserPlus,
  Users,
  Phone,
  Mail,
  Building2,
  Calendar,
  AlertCircle,
  Eye,
  Trash2,
  Edit,
  X,
  Stethoscope,
} from 'lucide-react';
import api from '../../lib/api';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('all');
  const [status, setStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Add Doctor Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialization: '',
    hospital: '',
    phone: '',
    email: '',
    status: 'Active',
    experienceYears: 5,
    bio: '',
  });
  const [addDoctorSubmitting, setAddDoctorSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Add Patient under Doctor Modal State
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [targetDoctor, setTargetDoctor] = useState(null);
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    condition: '',
    status: 'Stable',
    phone: '',
    email: '',
    notes: '',
  });
  const [addPatientSubmitting, setAddPatientSubmitting] = useState(false);
  const [patientFormError, setPatientFormError] = useState('');

  // Fetch Doctors with filters
  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 9);
      if (search.trim()) params.append('search', search.trim());
      if (specialization !== 'all') params.append('specialization', specialization);
      if (status !== 'all') params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/doctors?${params.toString()}`);
      if (res.data.success) {
        setDoctors(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch doctor roster');
    } finally {
      setLoading(false);
    }
  }, [page, search, specialization, status, startDate, endDate]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // Handle Create Doctor
  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setFormError('');
    setAddDoctorSubmitting(true);

    try {
      const res = await api.post('/doctors', newDoctor);
      if (res.data.success) {
        setShowAddModal(false);
        setNewDoctor({
          name: '',
          specialization: '',
          hospital: '',
          phone: '',
          email: '',
          status: 'Active',
          experienceYears: 5,
          bio: '',
        });
        fetchDoctors();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error creating doctor');
    } finally {
      setAddDoctorSubmitting(false);
    }
  };

  // Handle Add Patient under specific Doctor
  const handleAddPatientToDoctor = async (e) => {
    e.preventDefault();
    if (!targetDoctor) return;
    setPatientFormError('');
    setAddPatientSubmitting(true);

    try {
      const res = await api.post(`/doctors/${targetDoctor._id}/patients`, newPatient);
      if (res.data.success) {
        setShowAddPatientModal(false);
        setNewPatient({
          name: '',
          age: '',
          gender: 'Male',
          condition: '',
          status: 'Stable',
          phone: '',
          email: '',
          notes: '',
        });
        fetchDoctors(); // Refresh counts
      }
    } catch (err) {
      setPatientFormError(err.response?.data?.message || 'Error adding patient to doctor');
    } finally {
      setAddPatientSubmitting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setSpecialization('all');
    setStatus('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const specializationsList = [
    'Cardiology',
    'Neurology',
    'Pediatrics',
    'Orthopedics',
    'Endocrinology',
    'Dermatology',
    'Oncology',
    'General Surgery',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Physicians & Specialists</h1>
          <p className="text-xs text-slate-500">
            Manage physician credentials, departmental specializations, and assigned patient rosters
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Doctor</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, specialization, hospital, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          {/* Specialization Filter */}
          <div>
            <select
              value={specialization}
              onChange={(e) => {
                setSpecialization(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
            >
              <option value="all">All Specializations</option>
              {specializationsList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div className="flex items-center gap-2">
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
            <span className="text-[11px] font-medium">Date Range Filter:</span>
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

          {(search || specialization !== 'all' || status !== 'all' || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Stethoscope className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-bold text-slate-800">No doctors found</h3>
          <p className="mt-1 text-xs text-slate-400">
            Try adjusting your search query, specialty filter, or date ranges.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 rounded-xl bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        /* Doctor Cards Grid */
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <div
              key={doctor._id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{doctor.name}</h3>
                    <p className="text-xs font-semibold text-teal-600">{doctor.specialization}</p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      doctor.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : doctor.status === 'On Leave'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {doctor.status}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{doctor.hospital}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{doctor.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{doctor.phone}</span>
                  </div>
                </div>

                {/* Patient Count Metric */}
                <div className="mt-4 rounded-xl bg-teal-50/60 p-2.5 flex items-center justify-between text-xs">
                  <span className="text-teal-800 font-medium">Assigned Patients:</span>
                  <span className="font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded-full">
                    {doctor.patientCount || 0}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-3">
                <Link
                  href={`/doctors/${doctor._id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View Patients</span>
                </Link>
                <button
                  onClick={() => {
                    setTargetDoctor(doctor);
                    setShowAddPatientModal(true);
                  }}
                  title="Add Patient Under This Doctor"
                  className="flex items-center justify-center rounded-xl bg-teal-50 border border-teal-200 p-2 text-teal-700 transition-colors hover:bg-teal-100"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Create Doctor Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Doctor"
      >
        {formError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateDoctor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Doctor Full Name *</label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Dr. Jennifer Lawrence"
              value={newDoctor.name}
              onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Specialization *</label>
              <select
                required
                value={newDoctor.specialization}
                onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              >
                <option value="">Select Specialty</option>
                {specializationsList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Status</label>
              <select
                value={newDoctor.status}
                onChange={(e) => setNewDoctor({ ...newDoctor, status: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Hospital / Clinic *</label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g. St. Jude Memorial Hospital"
              value={newDoctor.hospital}
              onChange={(e) => setNewDoctor({ ...newDoctor, hospital: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Phone Number *</label>
              <input
                type="tel"
                required
                maxLength={30}
                placeholder="+1 (555) 000-0000"
                value={newDoctor.phone}
                onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address *</label>
              <input
                type="email"
                required
                maxLength={100}
                placeholder="doctor@hospital.org"
                value={newDoctor.email}
                onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Professional Bio / Notes</label>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Clinical focus, board certifications..."
              value={newDoctor.bio}
              onChange={(e) => setNewDoctor({ ...newDoctor, bio: e.target.value })}
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
              disabled={addDoctorSubmitting}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {addDoctorSubmitting ? 'Registering...' : 'Register Doctor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Patient Under Doctor Modal */}
      <Modal
        isOpen={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        title={`Add Patient under ${targetDoctor?.name || 'Doctor'}`}
      >
        {patientFormError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {patientFormError}
          </div>
        )}

        <form onSubmit={handleAddPatientToDoctor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Patient Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Eleanor Vance"
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
                placeholder="42"
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
                placeholder="e.g. Hypertension, Asthma"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Contact Phone</label>
              <input
                type="tel"
                placeholder="+1 555-000-0000"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Contact Email</label>
              <input
                type="email"
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
              placeholder="Initial symptoms, treatment plan..."
              value={newPatient.notes}
              onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddPatientModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addPatientSubmitting}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {addPatientSubmitting ? 'Adding...' : 'Add Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
