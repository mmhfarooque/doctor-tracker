import Link from 'next/link';

/**
 * Ranked horizontal bars with readable labels (replaces rotated chart axis labels).
 * rows: [{ key, label, sub, value, href }]
 */
export default function BarList({ rows, unit }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.key}>
          <Link href={r.href} className="group block">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-ink group-hover:text-pine-700">
                {r.label}
                {r.sub && <span className="ml-2 font-normal text-faint">{r.sub}</span>}
              </span>
              <span className="num shrink-0 text-muted">
                {r.value} <span className="text-faint">{unit}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full origin-left animate-grow rounded-full bg-pine-600 group-hover:bg-pine-700"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
