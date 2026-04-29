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

  type NavLink = { label: string; href: string; isActive?: (pathname: string) => boolean };
  const navLinks: NavLink[] = [
    { label: 'Dashboard', href: '/' },
    { label: 'Faturamento', href: '/billing' },
    {
      label: 'Monitoramento',
      href: '/monitoring',
      isActive: (p) =>
        p.startsWith('/monitoring') || (p.startsWith('/sites/') && p.endsWith('/monitoring')),
    },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border flex items-center justify-between px-8 h-14">
      <Link
        href="/"
        className="font-[family-name:var(--font-bebas)] text-[24px] tracking-[1px] leading-none text-foreground"
      >
        AIR<span className="text-[var(--brand-text)]">IO</span>
      </Link>

      <div className="flex items-center gap-4">
        {navLinks.map((link) => {
          const isActive = link.isActive
            ? link.isActive(pathname)
            : link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                'text-[13px] uppercase tracking-[0.05em] border-b border-transparent pb-0.5 transition-colors',
                isActive
                  ? 'text-foreground border-[var(--brand)]'
                  : 'text-muted-foreground hover:text-foreground hover:border-[var(--brand)]',
              ].join(' ')}
            >
              {link.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-9 h-9 bg-muted border border-muted-foreground text-foreground flex items-center justify-center hover:bg-muted/80 transition-colors text-base leading-none"
        >
          ◐
        </button>

        <div className="w-8 h-8 bg-[var(--brand)] text-[var(--brand-fg)] flex items-center justify-center font-[family-name:var(--font-bebas)] text-[16px]">
          U
        </div>
      </div>
    </nav>
  );
}
