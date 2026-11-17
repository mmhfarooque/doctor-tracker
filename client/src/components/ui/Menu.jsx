'use client';

import { useEffect, useRef, useState } from 'react';

/** Small dropdown menu. `trigger` is a render function receiving { open, toggle, ref props }. */
export default function Menu({ trigger, items, align = 'right', direction = 'down' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={`absolute z-40 min-w-[200px] animate-pop-in overflow-hidden rounded-control border border-line bg-white py-1 shadow-lift ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {items.map((item) =>
            item.divider ? (
              <div key={item.key} className="my-1 border-t border-line" />
            ) : item.header ? (
              <div key={item.key} className="px-3 py-2">
                {item.header}
              </div>
            ) : (
              <button
                key={item.key}
                role="menuitem"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-canvas ${
                  item.danger ? 'text-critical' : 'text-ink'
                }`}
              >
                {item.icon && <item.icon className="h-4 w-4 opacity-70" />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
