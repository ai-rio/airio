'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { api } from 'airio-convex/_generated/api';
import { useQuery } from 'convex/react';
import { CreditCard, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function DashboardNav() {
  const pathname = usePathname();
  const [dark, setDark] = useState(true);

  if (pathname === '/sign-in' || pathname.startsWith('/report/')) return null;

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
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.getMe);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('airio-theme');
    const isDark = stored !== 'light';
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, [setDark]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('airio-theme', next ? 'dark' : 'light');
  }

  type NavLink = { label: string; href: string; isActive?: (pathname: string) => boolean };
  const navLinks: NavLink[] = [
    { label: 'Dashboard', href: '/' },
    { label: 'Auditar Site', href: '/audit/new' },
    {
      label: 'Monitoramento',
      href: '/monitoring',
      isActive: (p) =>
        p.startsWith('/monitoring') || (p.startsWith('/sites/') && p.endsWith('/monitoring')),
    },
    { label: 'Histórico', href: '/audits' },
  ];

  const initial = me?.email ? me.email[0].toUpperCase() : '?';

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

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 bg-[var(--brand)] text-[var(--brand-fg)] flex items-center justify-center font-[family-name:var(--font-bebas)] text-[16px] cursor-pointer hover:opacity-90 transition-opacity"
          >
            {initial}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-56 bg-card border border-border z-50">
              {me?.email && (
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground truncate">
                    {me.email}
                  </p>
                </div>
              )}
              <div className="border-b border-border">
                <Link
                  href="/billing"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-3 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.1em] text-foreground hover:bg-muted transition-colors"
                >
                  <CreditCard size={13} />
                  Faturamento
                </Link>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="w-full text-left flex items-center gap-2 px-4 py-3 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.1em] text-foreground hover:bg-muted transition-colors"
              >
                <LogOut size={13} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
