import Link from 'next/link';
import { ArrowRightLeft, Archive, CalendarClock, HeartPulse, PencilLine, RotateCcw, Trash2, UserPlus } from 'lucide-react';
import { describeActivity } from './describe';
import { relativeTime } from '../../lib/format';
import { DOT_CLASSES, PATIENT_STATUSES, findStatus } from '../../lib/constants';

const ICONS = {
  'patient.admitted': UserPlus,
  'patient.status': HeartPulse,
  'patient.transferred': ArrowRightLeft,
  'patient.followup': CalendarClock,
  'patient.archived': Archive,
  'patient.restored': RotateCcw,
  'patient.deleted': Trash2,
  'patient.updated': PencilLine,
};

/**
 * Vertical list of activity events. `timeline` draws a connecting rail (patient history);
 * otherwise each row links to the patient (dashboard feed, alerts).
 */
export default function ActivityList({ items = [], timeline = false, empty = 'No activity yet.' }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className={timeline ? 'relative ml-3 border-l border-line pl-6' : '-mx-2 divide-y divide-line'}>
      {items.map((e) => {
        const Icon = ICONS[e.type] || PencilLine;
        const critical = e.to === 'Critical';
        const tone = e.type === 'patient.status' ? DOT_CLASSES[findStatus(PATIENT_STATUSES, e.to).tone] : 'bg-faint';
        const body = (
          <>
            <span className="text-sm text-ink">{describeActivity(e, { withPatient: !timeline })}</span>
            {e.note && e.type !== 'patient.admitted' && e.type !== 'patient.followup' && (
              <span className="mt-0.5 block text-[13px] text-muted">“{e.note}”</span>
            )}
            <span className="mt-0.5 block text-xs text-faint">
              {relativeTime(e.createdAt)}
              {e.actor?.role ? ` · ${e.actor.role}` : ''}
            </span>
          </>
        );
        return timeline ? (
          <li key={e._id} className="relative pb-5 last:pb-0">
            <span
              className={`absolute -left-[37px] top-0 flex h-[22px] w-[22px] items-center justify-center rounded-full ring-4 ring-white ${
                critical ? 'bg-critical text-white' : 'bg-canvas text-muted'
              }`}
            >
              <Icon className="h-3 w-3" />
            </span>
            {body}
          </li>
        ) : (
          <li key={e._id}>
            <Link href={e.patient ? `/patients/${e.patient}` : '/patients'} className="flex gap-3 rounded-control px-2 py-2.5 hover:bg-canvas">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${critical ? 'bg-critical' : tone}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">{body}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
