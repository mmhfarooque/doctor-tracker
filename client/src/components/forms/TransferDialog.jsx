'use client';

import { useState } from 'react';
import Drawer from '../ui/Drawer';
import Field from '../ui/Field';
import api from '../../lib/api';
import useApi from '../../hooks/useApi';
import { apiError } from '../../lib/format';
import { useToast } from '../ui/Toast';
import CapacityMeter from '../ui/CapacityMeter';

/** Move one patient to another doctor, with a reason that is kept in the patient's history. */
export default function TransferDialog({ patient, onClose, onDone }) {
  return patient ? <TransferPanel patient={patient} onClose={onClose} onDone={onDone} /> : null;
}

function TransferPanel({ patient, onClose, onDone }) {
  const notify = useToast();
  const currentId = patient.doctor?._id || patient.doctor;
  const doctors = (useApi('/doctors?limit=100&sortBy=name&order=asc').data?.data || []).filter((d) => d._id !== currentId);
  const [doctor, setDoctor] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const chosen = doctors.find((d) => d._id === doctor);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/patients/${patient._id}/transfer`, { doctor, reason });
      notify(`${patient.name} transferred to ${res.data.data.doctor.name}`);
      onDone(res.data.data);
      onClose();
    } catch (err) {
      setError(apiError(err, 'The transfer could not be completed.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Transfer patient"
      description={`${patient.name} is currently under ${patient.doctor?.name || 'another doctor'}.`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="transfer-form" className="btn btn-primary" disabled={saving || !doctor}>
            {saving ? 'Transferring…' : 'Transfer patient'}
          </button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={submit} className="space-y-5">
        {error && <p className="rounded-control bg-critical-soft px-3 py-2.5 text-sm text-critical">{error}</p>}
        <Field id="t-doc" label="Transfer to" required>
          <select id="t-doc" className="select" required value={doctor} onChange={(e) => setDoctor(e.target.value)}>
            <option value="" disabled>
              Choose a doctor
            </option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} — {d.specialization} ({d.patientCount}/{d.maxPatients})
              </option>
            ))}
          </select>
        </Field>
        {chosen && (
          <div className="rounded-control bg-canvas p-3">
            <p className="mb-1 text-[13px] text-muted">Current caseload of {chosen.name}</p>
            <CapacityMeter count={chosen.patientCount} max={chosen.maxPatients} />
            {chosen.patientCount >= chosen.maxPatients && (
              <p className="mt-2 text-[13px] text-critical">This doctor is at capacity. You can still transfer, but consider someone else.</p>
            )}
          </div>
        )}
        <Field id="t-reason" label="Reason" hint="Saved in the patient's history.">
          <textarea
            id="t-reason"
            className="input"
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Needs a neurology review"
          />
        </Field>
      </form>
    </Drawer>
  );
}
