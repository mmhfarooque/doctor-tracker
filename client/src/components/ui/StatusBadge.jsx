import { DOT_CLASSES, TONE_CLASSES } from '../../lib/constants';

export default function StatusBadge({ status, size = 'md' }) {
  const tone = status?.tone || 'discharged';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ${TONE_CLASSES[tone]} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`} aria-hidden="true" />
      {status?.label}
    </span>
  );
}
