'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { DensityProvider, cn, useTheme } from '@vela/ui';
import { useSession, useUiPrefs } from '@/lib/store';
import { ToastViewport } from '@/components/desk/toast';

const NAV: Array<[string, string, typeof Building2]> = [
  ['/admin', 'Hotels', Building2],
  ['/admin/superadmins', 'Superadmins', ShieldCheck],
];

/**
 * The Vela Platform shell — the superadmin console. Gated client-side: no token ⇒ login,
 * non-platform users ⇒ the desk. Deliberately sparser than the Desk (no pulse bar, no rail):
 * this surface manages hotels, not a hotel.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useSession((s) => s.token);
  const me = useSession((s) => s.me);
  const clear = useSession((s) => s.clear);
  const density = useUiPrefs((s) => s.density);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (!token) router.replace('/login');
    else if (me && !me.isPlatformAdmin) router.replace('/today');
  }, [token, me, router]);

  if (!token || !me?.isPlatformAdmin) return null;

  return (
    <DensityProvider density={density} asChild>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-canvas)]" data-density={density}>
        <header className="flex h-14 items-center gap-[var(--gap-lg)] border-b border-[var(--line-hairline)] bg-[var(--bg-raised)] px-[var(--space-4)]">
          <div className="flex items-center gap-2 pr-2">
            <span className="grid size-7 place-items-center rounded-[var(--radius-md)] bg-[var(--ink-primary)] font-display text-sm font-bold text-[var(--ink-inverse)]">
              ▲
            </span>
            <span className="font-display text-[var(--text-heading)] font-semibold tracking-tight">
              Vela Platform
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {NAV.map(([href, label, Icon]) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-[13px] font-medium',
                    active
                      ? 'bg-[var(--interactive-selected)] text-[var(--ink-accent)]'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]',
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <span className="px-1 text-[var(--text-caption)] text-[var(--ink-tertiary)]" title={me.email}>
              {me.name}
            </span>
            <button
              onClick={() => {
                clear();
                router.replace('/login');
              }}
              aria-label="Sign out"
              title="Sign out"
              className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-[var(--space-6)]">{children}</main>
        <ToastViewport />
      </div>
    </DensityProvider>
  );
}
