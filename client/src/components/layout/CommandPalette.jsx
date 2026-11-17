'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Stethoscope, User, CornerDownLeft } from 'lucide-react';
import api from '../../lib/api';
import useDebounce from '../../hooks/useDebounce';
import Avatar from '../ui/Avatar';

/**
 * Global quick search (⌘K / Ctrl+K). Looks up doctors and patients in parallel and
 * jumps straight to the doctor's profile or the filtered patient list.
 */
export default function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 200);
  const inputRef = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = debounced.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const params = `search=${encodeURIComponent(q)}&limit=5`;
    Promise.all([api.get(`/doctors?${params}`), api.get(`/patients?${params}`)])
      .then(([d, p]) => {
        if (id !== seq.current) return;
        setResults([
          ...d.data.data.map((doc) => ({
            key: 'd' + doc._id,
            type: 'Doctor',
            title: doc.name,
            meta: `${doc.specialization} · ${doc.hospital}`,
            href: `/doctors/${doc._id}`,
          })),
          ...p.data.data.map((pat) => ({
            key: 'p' + pat._id,
            type: 'Patient',
            title: pat.name,
            meta: `${pat.condition}${pat.doctor?.name ? ` · ${pat.doctor.name}` : ''}`,
            href: `/patients?search=${encodeURIComponent(pat.name)}`,
          })),
        ]);
        setActive(0);
      })
      .catch(() => id === seq.current && setResults([]))
      .finally(() => id === seq.current && setLoading(false));
  }, [debounced, open]);

  if (!open) return null;

  const go = (item) => {
    onClose();
    router.push(item.href);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Quick search">
      <div className="absolute inset-0 animate-fade-in bg-pine-950/40" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-pop-in overflow-hidden rounded-panel bg-white shadow-lift">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-faint" />
          <input
            ref={inputRef}
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search doctors and patients"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="palette-results"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <ul id="palette-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {!query.trim() && <li className="px-3 py-6 text-center text-sm text-muted">Type a name, specialty, hospital or condition.</li>}
          {query.trim() && !loading && results.length === 0 && debounced === query && (
            <li className="px-3 py-6 text-center text-sm text-muted">No doctors or patients match “{query.trim()}”.</li>
          )}
          {results.map((item, i) => (
            <li key={item.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item)}
                className={`flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left ${i === active ? 'bg-pine-50' : ''}`}
              >
                <Avatar name={item.title} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                  <span className="block truncate text-xs text-muted">{item.meta}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-faint">
                  {item.type === 'Doctor' ? <Stethoscope className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  {item.type}
                </span>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-pine-600" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
