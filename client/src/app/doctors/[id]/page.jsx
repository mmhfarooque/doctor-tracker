'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UserCheck,
  Building2,
  Mail,
  Phone,
  Calendar,
  UserPlus,
  Trash2,
  Edit,
  Search,
  AlertCircle,
  Users,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import api from '../../../lib/api';
import Modal from '../../../components/common/Modal';
import Pagination from '../../../components/common/Pagination';

export default function DoctorDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [doctor, setDoctor] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters for doctor's patient list
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Add Patient Modal
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
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
  const [submittingPatient, setSubmittingPatient] = useState(false);
  const [patientError, setPatientError] = useState('');

  // Edit Doctor Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDoctorData, setEditDoctorData] = useState({});
  const [updatingDoctor, setUpdatingDoctor] = useState(false);

  // Delete Patient confirmation
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [deletingPatient, setDeletingPatient] = useState(false);

  // Fetch Doctor details & their patients
  const fetchDoctorData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch doctor details
      const docRes = await api.get(`/doctors/${id}`);
      if (docRes.data.success) {
        setDoctor(docRes.data.data);
        setEditDoctorData(docRes.data.data);
      }

      // Fetch patients under this doctor
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search.trim()) params.append('search', search.trim());
      if (conditionFilter !== 'all') params.append('condition', conditionFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const patRes = await api.get(`/doctors/${id}/patients?${params.toString()}`);
      if (patRes.data.success) {
        setPatients(patRes.data.data);
        setPagination(patRes.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load doctor profile');
    } finally {
      setLoading(false);
    }
  }, [id, page, search, conditionFilter, statusFilter]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

  // Handle Add Patient Under This Doctor
  const handleAddPatient = async (e) => {
    e.preventDefault();
    setPatientError('');
    setSubmittingPatient(true);

    try {
      const res = await api.post(`/doctors/${id}/patients`, newPatient);
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
        fetchDoctorData();
      }
    } catch (err) {
      setPatientError(err.response?.data?.message || 'Error adding patient');
    } finally {
      setSubmittingPatient(false);
    }
  };

  // Handle Delete Patient from Doctor's list
  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    setDeletingPatient(true);

    try {
      const res = await api.delete(`/doctors/${id}/patients/${patientToDelete._id}`);
      if (res.data.success) {
        setPatientToDelete(null);
        fetchDoctorData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error removing patient');
    } finally {
      setDeletingPatient(false);
    }
  };

  // Handle Update Doctor Info
  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    setUpdatingDoctor(true);

    try {
      const res = await api.put(`/doctors/${id}`, editDoctorData);
      if (res.data.success) {
        setDoctor(res.data.data);
        setShowEditModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating doctor profile');
    } finally {
      setUpdatingDoctor(false);
    }
  };

  if (loading && !doctor) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p className="font-semibold">Error Loading Profile</p>
        <p className="text-xs text-rose-600 mt-1">{error || 'Doctor not found'}</p>
        <Link
          href="/doctors"
          className="mt-3 inline-block rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
        >
          Return to Doctors Roster
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Physicians Roster</span>
        </Link>
      </div>

      {/* Doctor Summary Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 text-white font-extrabold text-2xl shadow-lg shadow-teal-600/20 shrink-0">
              {doctor.name.charAt(4) || 'D'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">{doctor.name}</h1>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  {doctor.status}
                </span>
              </div>
              <p className="text-xs font-semibold text-teal-600">{doctor.specialization}</p>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>{doctor.hospital}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{doctor.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{doctor.phone}</span>
                </div>
              </div>

              {doctor.bio && (
                <p className="mt-3 text-xs text-slate-500 leading-relaxed max-w-2xl">
                  {doctor.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={() => setShowAddPatientModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Patient</span>
            </button>
          </div>
        </div>
      </div>

      {/* Doctor's Patients Section Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assigned Patient Roster</h2>
            <p className="text-xs text-slate-400">
              Active patients under direct care of {doctor.name} ({pagination.total} total)
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Patients Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Patient Name</th>
                <th className="pb-3">Age / Gender</th>
                <th className="pb-3">Diagnosis / Condition</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3">Admission</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {patients.length > 0 ? (
                patients.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50">
                    <td className="py-3 pl-2 font-semibold text-slate-900">{p.name}</td>
                    <td className="py-3">{p.age} yrs • {p.gender}</td>
                    <td className="py-3 font-medium text-slate-800">{p.condition}</td>
                    <td className="py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                    <td className="py-3 text-slate-500">{p.phone || p.email || '—'}</td>
                    <td className="py-3 text-slate-500">{new Date(p.admissionDate).toLocaleDateString()}</td>
                    <td className="py-3 pr-2 text-right">
                      <button
                        onClick={() => setPatientToDelete(p)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Remove Patient From Doctor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No patients currently assigned to this doctor.
                  </td>
                </tr>
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
        isOpen={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        title={`Admit Patient under ${doctor.name}`}
      >
        {patientError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {patientError}
          </div>
        )}

        <form onSubmit={handleAddPatient} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Patient Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Jessica Alba"
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
              <label className="block text-xs font-semibold text-slate-700">Diagnosis / Condition *</label>
              <input
                type="text"
                required
                placeholder="e.g. Hypertension"
                value={newPatient.condition}
                onChange={(e) => setNewPatient({ ...newPatient, condition: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Clinical Status</label>
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
              <label className="block text-xs font-semibold text-slate-700">Phone</label>
              <input
                type="tel"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email</label>
              <input
                type="email"
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
              disabled={submittingPatient}
              className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submittingPatient ? 'Admitting...' : 'Admit Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Patient Confirmation Modal */}
      <Modal
        isOpen={!!patientToDelete}
        onClose={() => setPatientToDelete(null)}
        title="Remove Patient"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-3 text-rose-700 text-xs">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>
              Are you sure you want to remove <strong>{patientToDelete?.name}</strong> from this doctor&apos;s roster? This action cannot be undone.
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
              disabled={deletingPatient}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deletingPatient ? 'Removing...' : 'Confirm Remove'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
