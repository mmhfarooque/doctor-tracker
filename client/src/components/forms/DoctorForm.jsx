'use client';

import { useState } from 'react';
import useApi from '../../hooks/useApi';
import Drawer from '../ui/Drawer';
import Field from '../ui/Field';
import api from '../../lib/api';
import { DOCTOR_STATUSES } from '../../lib/constants';
import { apiError } from '../../lib/format';
import { useToast } from '../ui/Toast';

const EMPTY = { name: '', specialization: '', hospital: '', phone: '', email: '', status: 'Active', experienceYears: '', bio: '' };

const fromDoctor = (doctor) =>
  doctor
    ? {
        name: doctor.name || '',
        specialization: doctor.specialization || '',
        hospital: doctor.hospital || '',
        phone: doctor.phone || '',
        email: doctor.email || '',
        status: doctor.status || 'Active',
        experienceYears: doctor.experienceYears ?? '',
        bio: doctor.bio || '',
      }
    : EMPTY;

/**
 * Create or edit a doctor in a side drawer. `doctor` = null creates a new one.
 * The panel is mounted fresh on every open, so its state always starts from the given doctor.
 */
export default function DoctorForm({ open, ...props }) {
  return open ? <DoctorFormPanel {...props} /> : null;
}

function DoctorFormPanel({ doctor, onClose, onSaved }) {
  const notify = useToast();
  const [form, setForm] = useState(() => fromDoctor(doctor));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const editing = Boolean(doctor?._id);
  const options = useApi('/doctors/filters').data?.data || { specializations: [], hospitals: [] };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, experienceYears: form.experienceYears === '' ? undefined : form.experienceYears };
      const res = editing ? await api.put(`/doctors/${doctor._id}`, payload) : await api.post('/doctors', payload);
      notify(editing ? 'Doctor details saved' : `${res.data.data.name} added`);
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(apiError(err, 'The doctor could not be saved. Check the fields and try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? 'Edit doctor' : 'Add doctor'}
      description={editing ? doctor.name : 'Name, specialty, hospital and contact details are required.'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="doctor-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add doctor'}
          </button>
        </>
      }
    >
      <form id="doctor-form" onSubmit={submit} className="grid grid-cols-2 gap-x-4 gap-y-5">
        {error && <p className="col-span-2 rounded-control bg-critical-soft px-3 py-2.5 text-sm text-critical">{error}</p>}
        <Field id="d-name" label="Full name" required className="col-span-2">
          <input id="d-name" className="input" required maxLength={100} value={form.name} onChange={set('name')} placeholder="Dr. Amina Rahman" />
        </Field>
        <Field id="d-spec" label="Specialty" required className="col-span-2 sm:col-span-1">
          <input
            id="d-spec"
            className="input"
            required
            maxLength={100}
            list="spec-options"
            value={form.specialization}
            onChange={set('specialization')}
            placeholder="Cardiology"
          />
          <datalist id="spec-options">
            {options.specializations.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field id="d-exp" label="Years of experience" className="col-span-2 sm:col-span-1">
          <input
            id="d-exp"
            className="input num"
            type="number"
            min={0}
            max={70}
            value={form.experienceYears}
            onChange={set('experienceYears')}
            placeholder="8"
          />
        </Field>
        <Field id="d-hosp" label="Hospital" required className="col-span-2">
          <input
            id="d-hosp"
            className="input"
            required
            maxLength={150}
            list="hosp-options"
            value={form.hospital}
            onChange={set('hospital')}
            placeholder="Metropolitan General Hospital"
          />
          <datalist id="hosp-options">
            {options.hospitals.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </Field>
        <Field id="d-email" label="Email" required className="col-span-2 sm:col-span-1">
          <input
            id="d-email"
            className="input"
            type="email"
            required
            maxLength={100}
            value={form.email}
            onChange={set('email')}
            placeholder="name@hospital.org"
          />
        </Field>
        <Field id="d-phone" label="Phone" required className="col-span-2 sm:col-span-1">
          <input
            id="d-phone"
            className="input"
            type="tel"
            required
            maxLength={30}
            value={form.phone}
            onChange={set('phone')}
            placeholder="+1 555 010 2030"
          />
        </Field>
        <fieldset className="col-span-2">
          <legend className="field-label">Availability</legend>
          <div className="grid grid-cols-3 gap-2">
            {DOCTOR_STATUSES.map((s) => (
              <label
                key={s.value}
                className={`flex h-10 cursor-pointer items-center justify-center rounded-control border text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine-500 ${
                  form.status === s.value ? 'border-pine-700 bg-pine-50 text-pine-800' : 'border-line-strong text-ink-soft hover:bg-canvas'
                }`}
              >
                <input type="radio" name="d-status" value={s.value} checked={form.status === s.value} onChange={set('status')} className="sr-only" />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field id="d-bio" label="Short bio" className="col-span-2" hint="Optional. Shown on the doctor's profile.">
          <textarea id="d-bio" className="input" rows={3} maxLength={1000} value={form.bio} onChange={set('bio')} />
        </Field>
      </form>
    </Drawer>
  );
}
