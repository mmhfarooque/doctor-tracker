'use client';

import { useState } from 'react';
import Drawer from '../ui/Drawer';
import Field from '../ui/Field';
import api from '../../lib/api';
import { GENDERS, PATIENT_STATUSES } from '../../lib/constants';
import { apiError, toDateInput } from '../../lib/format';
import { useToast } from '../ui/Toast';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Admit or edit a patient in a side drawer.
 * - `patient` null  → admit new patient
 * - `fixedDoctor`   → admitting under a specific doctor (doctor picker hidden)
 * - `doctors`       → options for the attending doctor picker
 */
export default function PatientForm({ open, ...props }) {
  return open ? <PatientFormPanel {...props} /> : null;
}

const initialForm = (patient, fixedDoctor) => ({
  name: patient?.name || '',
  age: patient?.age ?? '',
  gender: patient?.gender || '',
  condition: patient?.condition || '',
  status: patient?.status || 'Stable',
  doctor: patient?.doctor?._id || patient?.doctor || fixedDoctor?._id || '',
  admissionDate: patient ? toDateInput(patient.admissionDate) : today(),
  phone: patient?.phone || '',
  email: patient?.email || '',
  notes: patient?.notes || '',
});

// Mounted fresh on every open, so state always starts from the given patient
function PatientFormPanel({ patient, fixedDoctor, doctors = [], onClose, onSaved }) {
  const notify = useToast();
  const editing = Boolean(patient?._id);
  const [form, setForm] = useState(() => initialForm(patient, fixedDoctor));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let res;
      if (editing) res = await api.put(`/patients/${patient._id}`, form);
      else if (fixedDoctor) res = await api.post(`/doctors/${fixedDoctor._id}/patients`, form);
      else res = await api.post('/patients', form);
      notify(editing ? 'Patient record saved' : `${form.name} admitted`);
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(apiError(err, 'The patient could not be saved. Check the fields and try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? 'Edit patient' : 'Admit patient'}
      description={editing ? patient.name : fixedDoctor ? `Under the care of ${fixedDoctor.name}` : 'Fields marked * are required.'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="patient-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Admit patient'}
          </button>
        </>
      }
    >
      <form id="patient-form" onSubmit={submit} className="grid grid-cols-2 gap-x-4 gap-y-5">
        {error && <p className="col-span-2 rounded-control bg-critical-soft px-3 py-2.5 text-sm text-critical">{error}</p>}
        <Field id="p-name" label="Full name" required className="col-span-2">
          <input id="p-name" className="input" required maxLength={100} value={form.name || ''} onChange={set('name')} placeholder="Jane Roe" />
        </Field>
        <Field id="p-age" label="Age" required>
          <input
            id="p-age"
            className="input num"
            type="number"
            required
            min={0}
            max={130}
            value={form.age ?? ''}
            onChange={set('age')}
            placeholder="42"
          />
        </Field>
        <Field id="p-gender" label="Gender" required>
          <select id="p-gender" className="select" required value={form.gender || ''} onChange={set('gender')}>
            <option value="" disabled>
              Select
            </option>
            {GENDERS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field id="p-cond" label="Condition or diagnosis" required className="col-span-2">
          <input
            id="p-cond"
            className="input"
            required
            maxLength={150}
            value={form.condition || ''}
            onChange={set('condition')}
            placeholder="Type 2 diabetes"
          />
        </Field>
        <fieldset className="col-span-2">
          <legend className="field-label">Clinical status</legend>
          <div className="flex flex-wrap gap-2">
            {PATIENT_STATUSES.map((s) => (
              <label
                key={s.value}
                className={`flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine-500 ${
                  form.status === s.value ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-soft hover:bg-canvas'
                }`}
              >
                <input type="radio" name="p-status" value={s.value} checked={form.status === s.value} onChange={set('status')} className="sr-only" />
                <span className={`h-2 w-2 rounded-full ${s.bar}`} aria-hidden="true" />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        {!fixedDoctor && (
          <Field id="p-doc" label="Attending doctor" required className="col-span-2">
            <select id="p-doc" className="select" required value={form.doctor || ''} onChange={set('doctor')}>
              <option value="" disabled>
                Choose a doctor
              </option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} — {d.specialization}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id="p-date" label="Admission date" className="col-span-2 sm:col-span-1">
          <input id="p-date" className="input num" type="date" value={form.admissionDate || ''} onChange={set('admissionDate')} />
        </Field>
        <Field id="p-phone" label="Phone" className="col-span-2 sm:col-span-1">
          <input id="p-phone" className="input" type="tel" maxLength={30} value={form.phone || ''} onChange={set('phone')} />
        </Field>
        <Field id="p-email" label="Email" className="col-span-2">
          <input id="p-email" className="input" type="email" maxLength={100} value={form.email || ''} onChange={set('email')} />
        </Field>
        <Field id="p-notes" label="Clinical notes" className="col-span-2">
          <textarea id="p-notes" className="input" rows={4} maxLength={2000} value={form.notes || ''} onChange={set('notes')} />
        </Field>
      </form>
    </Drawer>
  );
}
