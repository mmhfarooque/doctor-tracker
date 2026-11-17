'use client';

import { useEffect, useState } from 'react';
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
  return open ? <Palette onClose={onClose} /> : null;
}

const toItems = (doctors, patients) => [
  ...doctors.map((doc) => ({
    key: 'd' + doc._id,
    type: 'Doctor',
    title: doc.name,
    meta: `${doc.specialization}, ${doc.hospital}`,
    href: `/doctors/${doc._id}`,
  })),
  ...patients.map((pat) => ({
    key: 'p' + pat._id,
    type: 'Patient',
    title: pat.name,
    meta: `${pat.condition}${pat.doctor?.name ? `, with ${pat.doctor.name}` : ''}`,
    href: `/patients/${pat._id}`,
  })),
];

// Mounted fresh each time the palette opens, so the query always starts empty
function Palette({ onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState({ query: '', items: [] });
  const [active, setActive] = useState(0);
  const debounced = useDebounce(query, 200).trim();

  useEffect(() => {
    if (!debounced) return undefined;
    const controller = new AbortController();
    const params = `search=${encodeURIComponent(debounced)}&limit=5`;
    Promise.all([api.get(`/doctors?${params}`, { signal: controller.signal }), api.get(`/patients?${params}`, { signal: controller.signal })])
      .then(([d, p]) => setResponse({ query: debounced, items: toItems(d.data.data, p.data.data) }))
      .catch(() => !controller.signal.aborted && setResponse({ query: debounced, items: [] }));
    return () => controller.abort();
  }, [debounced]);

  const results = debounced && response.query === debounced ? response.items : [];
  const loading = Boolean(debounced) && response.query !== debounced;
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  const go = (item) => {
    onClose();
    router.push(item.href);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      go(results[activeIndex]);
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
            autoFocus
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
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
          {debounced && !loading && results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">No doctors or patients match “{debounced}”.</li>
          )}
          {results.map((item, i) => (
            <li key={item.key} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item)}
                className={`flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left ${i === activeIndex ? 'bg-pine-50' : ''}`}
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
                {i === activeIndex && <CornerDownLeft className="h-3.5 w-3.5 text-pine-600" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
