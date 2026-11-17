export default function Logo({ inverted = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="9" className={inverted ? 'fill-pine-500' : 'fill-pine-700'} />
        <path d="M6 17h5l2.5-6 4 11 3-8 1.5 3H26" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-[17px] font-semibold tracking-[-0.01em] ${inverted ? 'text-white' : 'text-ink'}`}>Doctor Tracker</span>
    </span>
  );
}
