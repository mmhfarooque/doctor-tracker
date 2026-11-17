'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu as MenuIcon, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import Logo from './Logo';
import CommandPalette from './CommandPalette';
import { useAuth } from '../../context/AuthContext';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { user, hydrated } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  if (pathname === '/login') return <main className="min-h-screen">{children}</main>;

  if (!hydrated || !user) {
    return (
      <div className="flex h-screen items-center justify-center" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-pine-200 border-t-pine-700" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-control focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} onOpenSearch={() => setSearchOpen(true)} />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-2 backdrop-blur lg:hidden">
        <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Open menu">
          <MenuIcon className="h-5 w-5" />
        </button>
        <Link href="/" aria-label="Doctor Tracker home">
          <Logo />
        </Link>
        <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
          <Search className="h-5 w-5" />
        </button>
      </div>

      <main id="main" className="lg:pl-[260px]">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</div>
      </main>

      <CommandPalette open={searchOpen} onClose={closeSearch} />
    </div>
  );
}
