import Link from 'next/link';
import { PATIENT_STATUSES } from '../../lib/constants';

/**
 * The dashboard's lead element: every patient on one bar, split by clinical status.
 * Each segment and each legend entry opens the patient list filtered to that status.
 */
export default function WardStatus({ distribution = [], total = 0 }) {
  const counts = Object.fromEntries(distribution.map((d) => [d.status, d.count]));
  const rows = PATIENT_STATUSES.map((s) => ({ ...s, count: counts[s.value] || 0 }));
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <section className="panel overflow-hidden" aria-labelledby="ward-title">
      <div className="px-5 pb-6 pt-5 sm:px-7 sm:pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ward-title" className="text-[15px] font-semibold text-ink">
            Patients by clinical status
          </h2>
          <Link href="/patients" className="text-sm font-medium text-pine-700 hover:text-pine-800 hover:underline">
            Open patient list
          </Link>
        </div>

        <div
          className="mt-5 flex h-12 w-full gap-[3px] overflow-hidden rounded-[10px] sm:h-14"
          role="img"
          aria-label={rows.map((r) => `${r.label} ${r.count}`).join(', ')}
        >
          {total === 0 && <div className="w-full bg-canvas" />}
          {rows
            .filter((r) => r.count > 0)
            .map((r, i) => (
              <Link
                key={r.value}
                href={`/patients?status=${encodeURIComponent(r.value)}`}
                title={`${r.label}: ${r.count}`}
                className={`${r.bar} origin-left animate-grow transition-[filter] hover:brightness-110 focus-visible:ring-offset-0`}
                style={{ width: `${(r.count / total) * 100}%`, animationDelay: `${i * 70}ms` }}
              >
                <span className="sr-only">
                  {r.label}: {r.count}
                </span>
              </Link>
            ))}
        </div>

        <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((r) => (
            <li key={r.value}>
              <Link href={`/patients?status=${encodeURIComponent(r.value)}`} className="group block rounded-control">
                <span className="flex items-center gap-2 text-[13px] text-muted group-hover:text-ink">
                  <span className={`h-2.5 w-2.5 rounded-sm ${r.bar}`} aria-hidden="true" />
                  {r.label}
                </span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className="num text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">{r.count}</span>
                  <span className="num text-[13px] text-faint">{pct(r.count)}%</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
