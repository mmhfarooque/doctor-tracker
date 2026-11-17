import { CalendarClock } from 'lucide-react';
import { followUpState, formatDate } from '../../lib/format';

const STYLES = {
  overdue: 'bg-critical-soft text-critical',
  today: 'bg-watch-soft text-watch',
  soon: 'bg-recovering-soft text-recovering',
  later: 'bg-canvas text-muted',
};
const PREFIX = { overdue: 'Overdue', today: 'Today', soon: '', later: '' };

export default function FollowUpBadge({ date, compact = false }) {
  const state = followUpState(date);
  if (!state) return <span className="text-faint">—</span>;
  const label = PREFIX[state]
    ? compact || state === 'today'
      ? PREFIX[state]
      : `${PREFIX[state]} · ${formatDate(date, { day: 'numeric', month: 'short' })}`
    : formatDate(date, { day: 'numeric', month: 'short' });
  return (
    <span className={`num inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[state]}`}>
      <CalendarClock className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
