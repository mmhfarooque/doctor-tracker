import { ChevronLeft, ChevronRight } from 'lucide-react';

// Compact page list: 1 … 4 5 6 … 12
const pageList = (current, total) => {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap-' + p);
    out.push(p);
  });
  return out;
};

export default function Pagination({ page, totalPages, total, limit, onPageChange, noun = 'records' }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3.5 sm:flex-row" aria-label="Pagination">
      <p className="num text-[13px] text-muted">
        Showing{' '}
        <span className="font-medium text-ink">
          {from}–{to}
        </span>{' '}
        of <span className="font-medium text-ink">{total}</span> {noun}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button className="icon-btn" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageList(page, totalPages).map((p) =>
            typeof p === 'string' ? (
              <span key={p} className="px-1 text-faint">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`num h-9 min-w-9 rounded-control px-2 text-sm font-medium transition-colors ${
                  p === page ? 'bg-pine-700 text-white' : 'text-ink-soft hover:bg-canvas'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button className="icon-btn" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </nav>
  );
}
