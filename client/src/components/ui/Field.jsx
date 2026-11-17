// Label + control + optional hint, wired together for screen readers.
export default function Field({ id, label, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="text-critical"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}
