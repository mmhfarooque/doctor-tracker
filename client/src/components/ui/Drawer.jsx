'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Right-side panel for create / edit forms. Keeps the list visible behind it,
 * closes on Escape or backdrop click, and traps initial focus inside.
 */
export default function Drawer({ open, onClose, title, description, children, footer }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Runs only when the drawer opens/closes, so parent re-renders never move focus while typing
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const first = panelRef.current?.querySelector('input, select, textarea');
    first?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div className="absolute inset-0 animate-fade-in bg-pine-950/40" onClick={onClose} />
      <div ref={panelRef} className="absolute inset-y-0 right-0 flex w-full max-w-[480px] animate-slide-in flex-col bg-white shadow-lift">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 id="drawer-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Close panel">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-[#FAFBFB] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
