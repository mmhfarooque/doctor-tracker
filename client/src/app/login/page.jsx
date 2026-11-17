'use client';

import { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/layout/Logo';
import { PATIENT_STATUSES } from '../../lib/constants';

// Demo credentials box is for reviewers; hide it on a real deployment with NEXT_PUBLIC_SHOW_DEMO_LOGIN=false
const SHOW_DEMO_LOGIN = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN !== 'false';
const DEMO_PASSWORD = 'Password123!';
const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@doctortracker.com', note: 'Full access' },
  { role: 'Doctor', email: 'doctor@doctortracker.com', note: 'Dr. Sarah Jenkins — own patients only' },
  { role: 'Nurse', email: 'nurse@doctortracker.com', note: 'Status, notes and follow-ups' },
];

// Decorative preview of the dashboard's status bar on the brand panel
const PREVIEW = [3, 5, 5, 9, 1];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await login(email, password);
      if (!res.success) setError(res.message || 'Email or password is incorrect.');
    } catch (err) {
      setError(err.response?.data?.message || 'Sign-in failed. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-pine-900 p-12 text-white lg:flex">
        <Logo inverted />
        <div className="max-w-md">
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em]">Every doctor, every patient, and how they are doing.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#A9BDB6]">
            Manage your medical staff and their patients, and see clinical status and admissions at a glance.
          </p>
          <div className="mt-10 rounded-panel bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10" aria-hidden="true">
            <div className="flex h-9 gap-[3px] overflow-hidden rounded-lg">
              {PATIENT_STATUSES.map((s, i) => (
                <div
                  key={s.value}
                  className={`${s.bar} origin-left animate-grow`}
                  style={{ flex: PREVIEW[i], animationDelay: `${200 + i * 80}ms` }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {PATIENT_STATUSES.map((s) => (
                <span key={s.value} className="flex items-center gap-1.5 text-xs text-[#A9BDB6]">
                  <span className={`h-2 w-2 rounded-sm ${s.bar}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-[#7F958D]">For authorised hospital administrators only.</p>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-[26px] font-semibold tracking-[-0.01em] text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your administrator account.</p>

          {error && (
            <div className="mt-6 flex items-start gap-2.5 rounded-control bg-critical-soft px-3.5 py-3 text-sm text-critical" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                maxLength={100}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input h-11"
                placeholder="you@hospital.org"
              />
            </div>
            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary h-11 w-full text-[15px]">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {SHOW_DEMO_LOGIN && (
            <div className="mt-8 rounded-panel border border-dashed border-line-strong p-4">
              <p className="text-sm font-medium text-ink">Reviewing the demo?</p>
              <p className="mt-1 text-[13px] text-muted">
                Pick a role to fill in its login. Password for all: <span className="font-medium text-ink">{DEMO_PASSWORD}</span>
              </p>
              <div className="mt-3 space-y-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.role}
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(DEMO_PASSWORD);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-control border border-line px-3 py-2 text-left hover:bg-canvas"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{a.role}</span>
                      <span className="block truncate text-xs text-muted">{a.note}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-pine-700">Use</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
