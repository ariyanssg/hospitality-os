'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BedDouble,
  CalendarCheck,
  CornerDownLeft,
  DoorOpen,
  LayoutGrid,
  LogOut,
  Moon,
  MoonStar,
  Receipt,
  Rows3,
  Search,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import { CommandPalette, Kbd, useTheme, type CommandItem } from '@vela/ui';
import { useSdk } from '@/lib/sdk';
import { useDeskIntent, useSession, useUiPrefs } from '@/lib/store';

/**
 * ⌘K everything (doc 18 §4) — boards, actions, and today's guests in one field.
 * Picking a guest deep-links into the check-in drawer on the arrivals board.
 */
export function CommandK() {
  const router = useRouter();
  const sdk = useSdk();
  const { toggle, theme } = useTheme();
  const clear = useSession((s) => s.clear);
  const propertyId = useSession((s) => s.activePropertyId);
  const cycleDensity = useUiPrefs((s) => s.cycleDensity);
  const requestCheckin = useDeskIntent((s) => s.requestCheckin);
  const [open, setOpen] = useState(false);

  const { data: arrivals } = useQuery({
    queryKey: ['arrivals', propertyId],
    queryFn: () => sdk.arrivals(),
    enabled: !!propertyId && open,
  });

  const items: CommandItem[] = useMemo(
    () => [
      { id: 'nav-today', group: 'Navigate', label: 'Today', icon: <LayoutGrid className="size-4" />, run: () => router.push('/today') },
      { id: 'nav-arrivals', group: 'Navigate', label: 'Arrivals board', icon: <CalendarCheck className="size-4" />, run: () => router.push('/arrivals') },
      { id: 'nav-rack', group: 'Navigate', label: 'The Rack', keywords: 'rooms calendar grid', icon: <BedDouble className="size-4" />, run: () => router.push('/rack') },
      { id: 'nav-inhouse', group: 'Navigate', label: 'In-house', keywords: 'folio guests', icon: <Users className="size-4" />, run: () => router.push('/inhouse') },
      { id: 'nav-departures', group: 'Navigate', label: 'Departures', keywords: 'checkout express', icon: <DoorOpen className="size-4" />, run: () => router.push('/departures') },
      { id: 'nav-folios', group: 'Navigate', label: 'Folios', keywords: 'ledger charges payments', icon: <Receipt className="size-4" />, run: () => router.push('/folios') },
      { id: 'nav-hk', group: 'Navigate', label: 'Housekeeping', keywords: 'rooms clean inspect', icon: <Sparkles className="size-4" />, run: () => router.push('/housekeeping') },
      { id: 'nav-audit', group: 'Navigate', label: 'Night audit', keywords: 'business date roll cashier', icon: <MoonStar className="size-4" />, run: () => router.push('/audit') },
      ...(arrivals ?? [])
        .filter((a) => a.status === 'confirmed')
        .map((a) => ({
          id: `checkin-${a.id}`,
          group: "Today's arrivals",
          label: `Check in ${a.guestName}`,
          hint: a.confirmationNumber,
          keywords: `${a.confirmationNumber} ${a.roomTypeCode} arrival guest`,
          icon: <CornerDownLeft className="size-4" />,
          run: () => {
            requestCheckin(a.id);
            router.push('/arrivals');
          },
        })),
      { id: 'act-theme', group: 'Actions', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, icon: theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />, run: toggle },
      { id: 'act-density', group: 'Actions', label: 'Cycle density (comfortable → compact → touch)', icon: <Rows3 className="size-4" />, run: cycleDensity },
      { id: 'act-signout', group: 'Session', label: 'Sign out', icon: <LogOut className="size-4" />, run: () => { clear(); router.replace('/login'); } },
    ],
    [arrivals, theme, toggle, cycleDensity, clear, router, requestCheckin],
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 min-w-[260px] flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 text-left text-[var(--ink-tertiary)] hover:bg-[var(--bg-sunken)]"
      >
        <Search className="size-4" />
        <span className="flex-1 text-[var(--font-size-ui)]">Search &amp; command…</span>
        <Kbd>⌘K</Kbd>
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} items={items} />
    </>
  );
}
