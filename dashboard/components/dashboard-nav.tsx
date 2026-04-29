'use client';

import { useConvexAuth } from 'convex/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function DashboardNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const [dark, setDark] = useState(true);

  // Hide on sign-in and report routes
  if (pathname === '/sign-in' || pathname.startsWith('/report/')) return null;

  // Auth guard
  if (!isAuthenticated) return null;

  return <NavInner dark={dark} setDark={setDark} pathname={pathname} />;
}

function NavInner({
  dark,
  setDark,
  pathname,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
  pathname: string;
}) {
  useEffect(() => {
    const stored = localStorage.getItem('airio-theme');
    const isDark = stored !== 'light'; // default dark
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, [setDark]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('airio-theme', next ? 'dark' : 'light');
  }

  const navLinks = [
    { label: 'Dashboard', href: '/' },
    { label: 'Faturamento', href: '/billing' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="flex items-center gap-6 px-6 h-12">
        {/* Logo */}
        <Link
          href="/"
          className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide leading-none mr-2"
        >
          AIR<span className="text-[var(--brand-text)]">IO</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-4 flex-1">
          {navLinks.map(({ label, href }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'text-[11px] uppercase tracking-[0.1em] border-b pb-0.5 bg-transparent transition-colors',
                  isActive
                    ? 'text-foreground border-[var(--brand)]'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-[var(--brand)]',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-9 h-9 bg-muted border border-border text-foreground flex items-center justify-center hover:bg-muted/80 transition-colors text-base leading-none"
        >
          ◐
        </button>

        {/* User avatar — fallback "U" since no viewer query exists */}
        <div className="w-8 h-8 bg-[var(--brand)] text-[var(--brand-fg)] flex items-center justify-center text-sm font-bold uppercase">
          U
        </div>
      </div>
    </nav>
  );
}
