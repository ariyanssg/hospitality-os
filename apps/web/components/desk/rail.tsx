'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BedDouble,
  CalendarCheck,
  DoorOpen,
  LayoutGrid,
  LogOut,
  Receipt,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@vela/ui';

const NAV = [
  { href: '/today', label: 'Today', icon: LayoutGrid },
  { href: '/arrivals', label: 'Arrivals', icon: CalendarCheck },
  { href: '/arrivals?view=inhouse', label: 'In-house', icon: Users },
  { href: '/arrivals?view=departures', label: 'Departures', icon: DoorOpen },
  { href: '/rack', label: 'Rack', icon: BedDouble },
  { href: '/folios', label: 'Folios', icon: Receipt },
  { href: '/housekeeping', label: 'Housekeeping', icon: Sparkles },
];

/** Nav rail (240px) — modules, permission-filtered, ≤9 visible (doc 17 §5, doc 18 §2). */
export function Rail({ onSignOut }: { onSignOut: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex w-[220px] shrink-0 flex-col border-r border-[var(--line-hairline)] bg-[var(--bg-raised)] px-[var(--space-2)] py-[var(--space-3)]">
      <div className="flex-1 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href.split('?')[0];
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-[var(--gap-sm)] rounded-[var(--radius-md)] px-[var(--space-3)] py-2 text-[var(--font-size-ui)] transition-colors duration-[var(--motion-fast)]',
                active
                  ? 'bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                  : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]',
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <button
        onClick={onSignOut}
        className="flex items-center gap-[var(--gap-sm)] rounded-[var(--radius-md)] px-[var(--space-3)] py-2 text-[var(--font-size-ui)] text-[var(--ink-tertiary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]"
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </nav>
  );
}
