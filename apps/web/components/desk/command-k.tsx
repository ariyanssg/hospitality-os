'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, LogOut, Moon, PlusCircle, Search, Sun, Users } from 'lucide-react';
import { CommandPalette, Kbd, useTheme, type CommandItem } from '@vela/ui';
import { useSession } from '@/lib/store';

/** ⌘K everything (doc 18 §4): nav + actions in one field. Entity/AI sources plug in next. */
export function CommandK() {
  const router = useRouter();
  const { toggle, theme } = useTheme();
  const clear = useSession((s) => s.clear);
  const [open, setOpen] = useState(false);

  const items: CommandItem[] = [
    { id: 'nav-arrivals', group: 'Navigate', label: 'Arrivals board', icon: <CalendarDays className="size-4" />, hint: 'g a', run: () => router.push('/arrivals') },
    { id: 'nav-inhouse', group: 'Navigate', label: 'In-house', icon: <Users className="size-4" />, run: () => router.push('/arrivals?view=inhouse') },
    { id: 'act-create', group: 'Actions', label: 'New reservation', icon: <PlusCircle className="size-4" />, run: () => router.push('/arrivals?create=1') },
    { id: 'act-theme', group: 'Actions', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, icon: theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />, run: toggle },
    { id: 'act-signout', group: 'Session', label: 'Sign out', icon: <LogOut className="size-4" />, run: () => { clear(); router.replace('/login'); } },
  ];

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
