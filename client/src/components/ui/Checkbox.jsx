import { useEffect, useRef } from 'react';

// The visible box is 16px, but the clickable area is 32px so it is easy to hit on a phone.
export default function Checkbox({ checked, indeterminate = false, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className="-m-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-canvas" onClick={(e) => e.stopPropagation()}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="h-4 w-4 cursor-pointer rounded border-line-strong accent-pine-700"
      />
    </label>
  );
}
