'use client';
import { useRouter } from 'next/navigation';
import { Bell, Moon, Rows2, Rows3, Rows4, Sun } from 'lucide-react';
import { Button, useTheme } from '@vela/ui';
import { useSession, useUiPrefs } from '@/lib/store';
import { PropertySwitcher } from './property-switcher';
import { CommandK } from './command-k';

/** Top bar (56px) — property switcher · ⌘K search · create · density · theme · bell · avatar (doc 18 §2). */
export function TopBar() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const me = useSession((s) => s.me);
  const density = useUiPrefs((s) => s.density);
  const cycleDensity = useUiPrefs((s) => s.cycleDensity);
  const DensityIcon = density === 'compact' ? Rows4 : density === 'touch' ? Rows2 : Rows3;
  const initials = (me?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

  return (
    <header className="flex h-14 items-center gap-[var(--gap-lg)] border-b border-[var(--line-hairline)] bg-[var(--bg-raised)] px-[var(--space-4)]">
      <div className="flex items-center gap-2 pr-2">
        <span className="grid size-7 place-items-center rounded-[var(--radius-md)] bg-[var(--interactive-default)] font-display text-sm font-bold text-[var(--ink-inverse)]">
          ▲
        </span>
        <span className="font-display text-[var(--text-heading)] font-semibold tracking-tight">Vela</span>
      </div>

      <PropertySwitcher />
      <CommandK />

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="primary" size="sm" onClick={() => router.push('/arrivals?create=1')}>
          + Create
        </Button>
        <button
          onClick={cycleDensity}
          aria-label="Cycle density"
          title={`Density: ${density}`}
          className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
        >
          <DensityIcon className="size-4" />
        </button>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <button
          aria-label="Notifications"
          className="relative grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
        >
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[var(--status-critical-ink)]" />
        </button>
        <span
          className="grid size-8 place-items-center rounded-full bg-[var(--interactive-selected)] text-[var(--text-caption)] font-semibold text-[var(--ink-accent)]"
          title={me?.email}
        >
          {initials.toUpperCase()}
        </span>
      </div>
    </header>
  );
}
