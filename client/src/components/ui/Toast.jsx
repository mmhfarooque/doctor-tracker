'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:left-auto sm:right-6 sm:translate-x-0"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex animate-pop-in items-center gap-3 rounded-control bg-pine-950 px-4 py-3 text-sm text-white shadow-lift"
          >
            {t.type === 'error' ? (
              <XCircle className="h-4 w-4 shrink-0 text-[#F2A39C]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-pine-200" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
