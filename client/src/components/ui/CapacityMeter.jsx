// Active caseload against the doctor's maximum. Amber from 80 %, red at or above capacity.
export default function CapacityMeter({ count = 0, max = 10, showLabel = true, className = '' }) {
  const ratio = max ? count / max : 0;
  const tone = ratio >= 1 ? 'bg-critical' : ratio >= 0.8 ? 'bg-watch' : 'bg-pine-600';
  const text = ratio >= 1 ? 'text-critical' : ratio >= 0.8 ? 'text-watch' : 'text-ink';
  return (
    <div className={`min-w-[96px] ${className}`}>
      {showLabel && (
        <div className="num flex items-baseline justify-between text-[13px]">
          <span className={`font-medium ${text}`}>
            {count} / {max}
          </span>
          {ratio >= 1 && <span className="text-[11px] font-medium text-critical">Full</span>}
        </div>
      )}
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={count}
        aria-label="Caseload"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
    </div>
  );
}
