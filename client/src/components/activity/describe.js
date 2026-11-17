// Turns an activity record into a readable sentence for timelines, feeds and alerts.
export const describeActivity = (e, { withPatient = true } = {}) => {
  const who = e.actor?.name || 'Someone';
  const p = withPatient ? e.patientName : 'the patient';
  switch (e.type) {
    case 'patient.admitted':
      return `${who} admitted ${p}${e.note ? ` (${e.note.replace(/^Admitted /, '')})` : ''}`;
    case 'patient.status':
      return `${who} changed ${p} from ${e.from || '—'} to ${e.to}`;
    case 'patient.transferred':
      return `${who} transferred ${p} from ${e.from} to ${e.to}`;
    case 'patient.followup':
      return e.to
        ? `${who} set a follow-up for ${p} on ${new Date(e.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : `${who} cleared the follow-up for ${p}`;
    case 'patient.archived':
      return `${who} archived ${p}`;
    case 'patient.restored':
      return `${who} restored ${p}`;
    case 'patient.deleted':
      return `${who} permanently deleted ${p}`;
    default:
      return `${who} updated ${p}'s record`;
  }
};
