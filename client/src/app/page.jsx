'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Users,
  TrendingUp,
  Activity,
  PlusCircle,
  Calendar,
  Building2,
  Stethoscope,
  ArrowUpRight,
} from 'lucide-react';
import api from '../lib/api';
import StatCard from '../components/dashboard/StatCard';
import AnalyticsCharts from '../components/dashboard/AnalyticsCharts';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p className="font-semibold">Unable to load dashboard data</p>
        <p className="text-xs text-rose-600 mt-1">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { totals = {}, recentPatients = [] } = stats || {};

  return (
    <div className="space-y-8">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Administrative Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Real-time medical workforce metrics, patient caseloads, and admission trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/doctors"
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-teal-700"
          >
            <UserCheck className="h-4 w-4" />
            <span>Manage Doctors</span>
          </Link>
          <Link
            href="/patients"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            <Users className="h-4 w-4" />
            <span>View All Patients</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Doctors"
          value={totals.doctors || 0}
          icon={UserCheck}
          color="teal"
          subtitle="Active medical staff on record"
        />
        <StatCard
          title="Total Patients"
          value={totals.patients || 0}
          icon={Users}
          color="blue"
          subtitle="Admitted across all clinical specialties"
        />
        <StatCard
          title="Patients per Doctor"
          value={totals.avgPatientsPerDoctor || 0}
          icon={Activity}
          color="indigo"
          subtitle="Average caseload per physician"
        />
      </div>

      {/* Analytics Visualizations */}
      {stats && <AnalyticsCharts stats={stats} />}

      {/* Recent Patients Activity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Patient Admissions</h2>
            <p className="text-xs text-slate-400">Latest patients admitted to the tracking system</p>
          </div>
          <Link
            href="/patients"
            className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
          >
            <span>View Full Roster</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Patient</th>
                <th className="pb-3">Diagnosis / Condition</th>
                <th className="pb-3">Attending Physician</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Admission Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentPatients.length > 0 ? (
                recentPatients.map((patient) => (
                  <tr key={patient._id} className="hover:bg-slate-50/50">
                    <td className="py-3 pl-2 font-medium text-slate-900">
                      {patient.name}
                      <span className="block text-[11px] text-slate-400">
                        {patient.age} yrs • {patient.gender}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-slate-800">{patient.condition}</td>
                    <td className="py-3">
                      <span className="font-medium text-slate-900">{patient.doctor?.name || 'Unassigned'}</span>
                      <span className="block text-[10px] text-slate-400">{patient.doctor?.specialization}</span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          patient.status === 'Critical'
                            ? 'bg-rose-100 text-rose-700'
                            : patient.status === 'Recovering'
                            ? 'bg-sky-100 text-sky-700'
                            : patient.status === 'Under Observation'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-right text-slate-500">
                      {new Date(patient.admissionDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
                    No recent admissions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
