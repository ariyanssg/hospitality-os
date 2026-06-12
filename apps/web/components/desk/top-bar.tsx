'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftCircle,
  Bell,
  CalendarPlus,
  ChevronDown,
  LogIn,
  Moon,
  Rows2,
  Rows3,
  Rows4,
  Sun,
} from 'lucide-react';
import { Button, useTheme } from '@vela/ui';
import { useDeskIntent, useSession, useUiPrefs } from '@/lib/store';
import { useHotelSwitch } from '@/lib/platform';
import { PropertySwitcher } from './property-switcher';
import { CommandK } from './command-k';

/** Top bar (56px) — property switcher · ⌘K search · create · density · theme · bell · avatar (doc 18 §2). */
export function TopBar() {
  const { theme, toggle } = useTheme();
  const me = useSession((s) => s.me);
  const switchHotel = useHotelSwitch();
  const density = useUiPrefs((s) => s.density);
  const cycleDensity = useUiPrefs((s) => s.cycleDensity);
  const openReservationCreate = useDeskIntent((s) => s.openReservationCreate);
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const DensityIcon = density === 'compact' ? Rows4 : density === 'touch' ? Rows2 : Rows3;
  const initials = (me?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

  useEffect(() => {
    if (!createOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!createRef.current?.contains(event.target as Node)) setCreateOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [createOpen]);

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
        {me?.isPlatformAdmin && (
          <Button variant="ghost" size="sm" onClick={() => void switchHotel(null)}>
            <ArrowLeftCircle className="size-3.5" /> Back to Platform
          </Button>
        )}
        <div ref={createRef} className="relative">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={createOpen}
          >
            + Reservation <ChevronDown className="size-3.5" />
          </Button>
          {createOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] z-[var(--z-overlay)] w-[230px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-1.5 shadow-[var(--shadow-e4)]"
            >
              <button
                role="menuitem"
                onClick={() => {
                  openReservationCreate('reservation');
                  setCreateOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-left text-[13px] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]"
              >
                <CalendarPlus className="size-4 text-[var(--ink-accent)]" />
                <span>
                  <span className="block font-medium text-[var(--ink-primary)]">Reservation</span>
                  <span className="block text-[11.5px] text-[var(--ink-tertiary)]">
                    Check-in and check-out dates
                  </span>
                </span>
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  openReservationCreate('walk_in');
                  setCreateOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-left text-[13px] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]"
              >
                <LogIn className="size-4 text-[var(--ink-accent)]" />
                <span>
                  <span className="block font-medium text-[var(--ink-primary)]">Walk-in</span>
                  <span className="block text-[11.5px] text-[var(--ink-tertiary)]">
                    Checkout date and room numbers
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
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
