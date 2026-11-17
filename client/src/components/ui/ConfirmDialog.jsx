'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, busy, error }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 animate-fade-in bg-pine-950/40" onClick={() => !busy && onCancel()} />
      <div className="relative w-full max-w-md animate-pop-in rounded-panel bg-white p-6 shadow-lift">
        <div className="flex gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-critical-soft text-critical">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 id="confirm-title" className="text-base font-semibold text-ink">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{message}</p>
            {error && <p className="mt-3 rounded-control bg-critical-soft px-3 py-2 text-sm text-critical">{error}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy} autoFocus>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
