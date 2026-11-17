'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Stethoscope, Users, Search, LogOut, ChevronsUpDown, X } from 'lucide-react';
import Logo from './Logo';
import Avatar from '../ui/Avatar';
import Menu from '../ui/Menu';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/patients', label: 'Patients', icon: Users },
];

export default function Sidebar({ open, onClose, onOpenSearch }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      {open && <div className="fixed inset-0 z-40 animate-fade-in bg-pine-950/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-pine-900 text-[#C6D3CE] transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" onClick={onClose} aria-label="Doctor Tracker home">
            <Logo inverted />
          </Link>
          <button className="icon-btn text-[#C6D3CE] hover:bg-white/10 hover:text-white lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pb-2 pt-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex h-10 w-full items-center gap-2.5 rounded-control bg-white/[0.06] px-3 text-sm text-[#93A69F] ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 font-sans text-[11px] text-[#93A69F] sm:inline">⌘K</kbd>
          </button>
        </div>

        <nav className="mt-3 flex-1 space-y-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-10 items-center gap-3 rounded-control px-3 text-[14px] font-medium transition-colors ${
                  active ? 'bg-white/[0.09] text-white' : 'hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                {active && <span className="absolute -left-3 top-2 h-6 w-[3px] rounded-r bg-pine-200" aria-hidden="true" />}
                <Icon className={`h-[18px] w-[18px] ${active ? 'text-pine-200' : ''}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Menu
            align="left"
            direction="up"
            items={[
              {
                key: 'who',
                header: (
                  <div>
                    <p className="text-sm font-medium text-ink">{user?.name}</p>
                    <p className="truncate text-xs text-muted">{user?.email}</p>
                  </div>
                ),
              },
              { key: 'd1', divider: true },
              { key: 'logout', label: 'Sign out', icon: LogOut, onClick: logout, danger: true },
            ]}
            trigger={({ toggle, open: menuOpen }) => (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex w-full items-center gap-3 rounded-control p-2 text-left transition-colors hover:bg-white/[0.06]"
              >
                <Avatar name={user?.name || ''} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{user?.name}</span>
                  <span className="block truncate text-xs text-[#93A69F]">Administrator</span>
                </span>
                <ChevronsUpDown className="h-4 w-4 text-[#93A69F]" />
              </button>
            )}
          />
        </div>
      </aside>
    </>
  );
}
