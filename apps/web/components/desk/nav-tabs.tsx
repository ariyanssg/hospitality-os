'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  AlarmClock,
  BadgePercent,
  Ban,
  BedDouble,
  CalendarCheck,
  CalendarX,
  ContactRound,
  DoorOpen,
  LayoutGrid,
  MoonStar,
  Receipt,
  SlidersHorizontal,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import { cn } from '@vela/ui';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';

const TABS = [
  { href: '/today', label: 'Today', icon: LayoutGrid, badge: null },
  { href: '/arrivals', label: 'Arrivals', icon: CalendarCheck, badge: 'arrivals' },
  { href: '/rack', label: 'Rack', icon: BedDouble, badge: null },
  { href: '/available', label: 'Available', icon: DoorOpen, badge: null },
  { href: '/groups', label: 'Groups', icon: ContactRound, badge: null },
  { href: '/rates', label: 'Rates', icon: BadgePercent, badge: null },
  { href: '/inhouse', label: 'In-house', icon: Users, badge: null },
  { href: '/departures', label: 'Departures', icon: DoorOpen, badge: 'departures' },
  { href: '/folios', label: 'Folios', icon: Receipt, badge: null },
  { href: '/housekeeping', label: 'Housekeeping', icon: Sparkles, badge: null },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench, badge: null },
  { href: '/out-of-service', label: 'Out of service', icon: Ban, badge: null },
  { href: '/wake-up-calls', label: 'Wake-up calls', icon: AlarmClock, badge: null },
  { href: '/no-shows', label: 'No-shows', icon: CalendarX, badge: null },
  { href: '/audit', label: 'Night audit', icon: MoonStar, badge: null },
  { href: '/pos', label: 'POS terminal', icon: UtensilsCrossed, badge: null },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal, badge: null },
] as const;

/**
 * The Desk rail (doc 18 §2): permission-ready module navigation with live exception badges.
 * Unassigned arrivals and remaining departures float the work to the chrome itself.
 */
export function NavTabs() {
  const pathname = usePathname();
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);

  const { data: arrivals } = useQuery({
    queryKey: ['arrivals', propertyId],
    queryFn: () => sdk.arrivals(),
    enabled: !!propertyId,
  });
  const { data: departures } = useQuery({
    queryKey: ['departures', propertyId],
    queryFn: () => sdk.departures(),
    enabled: !!propertyId,
  });

  const badges: Record<string, number> = {
    arrivals: arrivals?.filter((a) => !a.roomAssigned).length ?? 0,
    departures: departures?.length ?? 0,
  };

  return (
    <nav
      aria-label="Boards"
      className="flex h-11 flex-none gap-1 overflow-x-auto border-b border-[var(--line-hairline)] bg-[var(--bg-raised)] px-[var(--space-3)] md:h-auto md:w-[240px] md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-[var(--space-3)]"
    >
      {TABS.map((t) => {
        const active = pathname === t.href;
        const Icon = t.icon;
        const count = t.badge ? (badges[t.badge] ?? 0) : 0;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'relative inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] px-3 text-[var(--font-size-ui)] transition-colors duration-[var(--motion-fast)] md:w-full',
              active
                ? 'bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]',
            )}
          >
            <Icon className="size-[15px]" />
            <span className="min-w-0 flex-1 truncate">{t.label}</span>
            {count > 0 && (
              <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full border border-[var(--status-caution-line)] bg-[var(--status-caution-bg)] px-[5px] text-[10.5px] font-semibold tabular-nums text-[var(--status-caution-ink)]">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
