'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import api from '../../lib/api';
import useApi from '../../hooks/useApi';
import { describeActivity } from './describe';
import { relativeTime } from '../../lib/format';

/**
 * Critical-patient alerts. Polls every 60 s; opening the panel marks everything as seen.
 * `tone="dark"` renders for the sidebar, "light" for the mobile top bar.
 */
export default function AlertsBell({ tone = 'dark' }) {
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const [seenLocally, setSeenLocally] = useState(false);
  const ref = useRef(null);
  const { data } = useApi(`/alerts?t=${tick}`);
  const alerts = data?.data;
  const unread = seenLocally ? 0 : alerts?.unread || 0;

  useEffect(() => {
    const id = setInterval(() => {
      setSeenLocally(false);
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(id);
  }, []);

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

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setSeenLocally(true);
      api.post('/alerts/seen').catch(() => {});
    }
  };

  const seenAt = alerts?.seenAt ? new Date(alerts.seenAt).getTime() : 0;
  const btn = tone === 'dark' ? 'text-[#C6D3CE] hover:bg-white/10 hover:text-white' : 'text-muted hover:bg-canvas hover:text-ink';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className={`icon-btn relative ${btn}`}
        aria-label={unread ? `${unread} new critical alert${unread === 1 ? '' : 's'}` : 'Critical alerts'}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="num absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white ring-2 ring-pine-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-2 w-[min(360px,calc(100vw-2rem))] animate-pop-in overflow-hidden rounded-panel border border-line bg-white text-ink shadow-lift ${
            tone === 'dark' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Critical alerts</p>
            <p className="text-xs text-muted">Patients who became critical</p>
          </div>
          <ul className="max-h-[360px] overflow-y-auto">
            {!alerts?.items?.length && <li className="px-4 py-8 text-center text-sm text-muted">No critical alerts.</li>}
            {alerts?.items?.map((a) => (
              <li key={a._id}>
                <Link
                  href={a.patient ? `/patients/${a.patient}` : '/patients?status=Critical'}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-canvas"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${new Date(a.createdAt).getTime() > seenAt ? 'bg-critical' : 'bg-line-strong'}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm">{describeActivity(a)}</span>
                    <span className="block text-xs text-faint">{relativeTime(a.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/patients?status=Critical"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-center text-sm font-medium text-pine-700 hover:bg-canvas"
          >
            View all critical patients
          </Link>
        </div>
      )}
    </div>
  );
}
