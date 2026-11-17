import Link from 'next/link';

/**
 * Ranked horizontal bars with readable labels.
 * rows: [{ key, label, sub, value, href, max? }] — when `max` is given the bar shows value / max (capacity).
 */
export default function BarList({ rows, unit }) {
  const scale = Math.max(1, ...rows.map((r) => r.max || r.value));
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => {
        const ratio = r.max ? r.value / r.max : null;
        const tone = ratio === null ? 'bg-pine-600' : ratio >= 1 ? 'bg-critical' : ratio >= 0.8 ? 'bg-watch' : 'bg-pine-600';
        return (
          <li key={r.key}>
            <Link href={r.href} className="group block">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-ink group-hover:text-pine-700">
                  {r.label}
                  {r.sub && <span className="ml-2 font-normal text-faint">{r.sub}</span>}
                </span>
                <span className={`num shrink-0 ${ratio !== null && ratio >= 1 ? 'font-medium text-critical' : 'text-muted'}`}>
                  {r.value}
                  {r.max ? ` / ${r.max}` : ''} <span className="text-faint">{unit}</span>
                </span>
              </div>
              <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
                <div
                  className={`h-full origin-left animate-grow rounded-full ${tone}`}
                  style={{ width: `${Math.min(100, (r.value / (r.max || scale)) * 100)}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
