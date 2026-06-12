'use client';
import Link from 'next/link';
import { ChefHat, CloudOff, Gauge, Moon, NotebookPen, Sun, Wifi, WifiOff } from 'lucide-react';
import type { PosOutlet } from '@vela/contracts';
import { Avatar, PulseBar, cn, useTheme, type PulseChip } from '@vela/ui';
import { useSession } from '@/lib/store';
import { usePos, type PosScreen } from '@/lib/pos-store';
import { usePosOps, useNow } from '@/lib/pos-api';
import { OUTLETS, clockOf } from '@/lib/pos-data';

/** Terminal chrome: brand block, outlet switcher, screen tabs, connectivity + theme, identity. */
export function PosTopBar({ outlets }: { outlets: PosOutlet[] }) {
  const me = useSession((s) => s.me);
  const { theme, toggle } = useTheme();
  const now = useNow(1000);
  const { replayQueue } = usePosOps();
  const screen = usePos((s) => s.screen);
  const outletCode = usePos((s) => s.outletCode);
  const offline = usePos((s) => s.offline);
  const opQueue = usePos((s) => s.opQueue);
  const set = usePos((s) => s.set);
  const showToast = usePos((s) => s.showToast);

  const current = OUTLETS[outletCode] ?? OUTLETS.VISTA!;
  const navDefs: Array<{ id: PosScreen; label: string; icon: typeof Gauge }> = [
    { id: 'floor', label: current.floorLabel, icon: current.floorIcon },
    { id: 'order', label: 'Order', icon: NotebookPen },
    { id: 'kds', label: 'Kitchen', icon: ChefHat },
    { id: 'manager', label: 'Manager', icon: Gauge },
  ];

  const toggleOffline = () => {
    if (!offline) {
      set({ offline: true });
      showToast('Connection lost — operations queue locally with idempotency keys.');
      return;
    }
    set({ offline: false });
    const queued = opQueue.length;
    if (!queued) {
      showToast('Back online — op log idle.');
      return;
    }
    void replayQueue()
      .then((n) => {
        usePos.getState().set({ locallyClosed: {} });
        showToast(`Back online — ${n} queued op${n === 1 ? '' : 's'} replayed and revalidated server-side.`);
      })
      .catch(() => showToast('Replay hit an exception — routed to the manager exception queue.'));
  };

  return (
    <div className="flex h-16 flex-none items-center gap-5 border-b border-[var(--line-hairline)] bg-[var(--bg-surface)] px-4">
      <Link href="/today" className="flex items-center gap-2.5" title="Back to The Desk">
        <span className="flex size-[34px] flex-none items-center justify-center rounded-[9px] bg-[var(--interactive-default)] text-[14px] text-[var(--ink-inverse)]">
          ▲
        </span>
        <span className="flex flex-col leading-[1.2]">
          <span className="whitespace-nowrap font-display text-[16px] font-semibold tracking-tight">Vela POS</span>
          <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-tertiary)]">
            Grand Vela — Ocean Club
          </span>
        </span>
      </Link>

      <div className="flex gap-[3px] rounded-[10px] bg-[var(--bg-sunken)] p-[3px]">
        {outlets.map((o) => {
          const cfg = OUTLETS[o.code];
          if (!cfg) return null;
          const active = o.code === outletCode;
          const Icon = cfg.icon;
          return (
            <button
              key={o.id}
              onClick={() =>
                set({
                  outletCode: o.code,
                  screen: 'floor',
                  activeCheckId: null,
                  payStep: null,
                  cat: (o.code === 'VISTA' ? 'raw' : o.code === 'LAGOON' ? 'beach' : 'ird'),
                })
              }
              className={cn(
                'flex h-[42px] items-center gap-2 rounded-lg px-3.5 text-[13.5px] font-semibold transition-colors duration-[var(--motion-fast)]',
                active
                  ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-[var(--shadow-e3)]'
                  : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]',
              )}
            >
              <Icon className="size-4" />
              {o.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 justify-center gap-1">
        {navDefs.map((n) => {
          const active = screen === n.id;
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              onClick={() => set({ screen: n.id })}
              className={cn(
                'flex h-11 items-center gap-[9px] rounded-[10px] px-[18px] text-[14.5px] font-semibold transition-colors duration-[var(--motion-fast)]',
                active
                  ? 'bg-[var(--interactive-selected)] text-[var(--ink-accent)]'
                  : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]',
              )}
            >
              <Icon className="size-[18px]" />
              {n.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5">
        {offline && (
          <span className="flex h-9 items-center gap-[7px] rounded-[var(--radius-full)] border border-[var(--status-caution-line)] bg-[var(--status-caution-bg)] px-3 text-[12.5px] font-semibold text-[var(--status-caution-ink)]">
            <CloudOff className="size-3.5" />
            Offline — {opQueue.length} op{opQueue.length === 1 ? '' : 's'} queued
          </span>
        )}
        <button
          onClick={toggleOffline}
          title="Simulate connectivity"
          className="flex size-11 items-center justify-center rounded-[10px] border border-[var(--line-hairline)] hover:bg-[var(--bg-sunken)]"
          style={{ color: offline ? 'var(--status-caution-ink)' : 'var(--ink-secondary)' }}
        >
          {offline ? <WifiOff className="size-[19px]" /> : <Wifi className="size-[19px]" />}
        </button>
        <button
          onClick={toggle}
          title="Day / night service"
          className="flex size-11 items-center justify-center rounded-[10px] border border-[var(--line-hairline)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
        >
          {theme === 'dark' ? <Sun className="size-[19px]" /> : <Moon className="size-[19px]" />}
        </button>
        <span data-numeric className="px-1 font-mono text-[15px] text-[var(--ink-secondary)]">
          {clockOf(new Date(now))}
        </span>
        <span className="h-7 w-px bg-[var(--line-hairline)]" />
        <div className="flex items-center gap-2.5 py-1 pl-1 pr-1.5">
          <Avatar name={me?.name ?? 'Server'} size="md" />
          <span className="flex flex-col leading-[1.25]">
            <span className="text-[13.5px] font-semibold">{me?.name ?? 'Server'}</span>
            <span className="text-[11px] text-[var(--ink-tertiary)]">Server · shift 16:00–23:00</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Live vitals strip + sync state. */
export function PosPulseStrip({ openChecks, e86Count }: { openChecks: number; e86Count: number }) {
  const outletCode = usePos((s) => s.outletCode);
  const offline = usePos((s) => s.offline);
  const cfg = OUTLETS[outletCode] ?? OUTLETS.VISTA!;

  const chipsByOutlet: Record<string, PulseChip[]> = {
    VISTA: [
      { id: 'cov', label: 'Covers', value: '86', delta: { dir: 'up', value: '12' } },
      { id: 'open', label: 'Open checks', value: String(openChecks) },
      { id: 'avg', label: 'Avg check', value: '$71.20', delta: { dir: 'up', value: '4%' } },
      { id: 'kit', label: 'Kitchen avg', value: '6:48', tone: 'caution' },
      { id: 'e86', label: "86'd", value: String(e86Count), tone: e86Count ? 'caution' : 'default' },
      { id: 'tips', label: 'Tips', value: '$612' },
    ],
    LAGOON: [
      { id: 'tabs', label: 'Open tabs', value: String(openChecks) },
      { id: 'cov', label: 'Covers', value: '38' },
      { id: 'avg', label: 'Avg tab', value: '$24.60', delta: { dir: 'up', value: '9%' } },
      { id: 'kit', label: 'Bar avg', value: '3:12', tone: 'positive' },
      { id: 'tips', label: 'Tips', value: '$284' },
    ],
    RS: [
      { id: 'open', label: 'Open orders', value: '3' },
      { id: 'sla', label: 'Avg delivery', value: '22m', tone: 'positive' },
      { id: 'ontime', label: 'On-time', value: '96%' },
      { id: 'qr', label: 'QR mix', value: '60%', delta: { dir: 'up', value: '8%' } },
    ],
  };

  return (
    <div className="flex flex-none items-center justify-between gap-4 border-b border-[var(--line-hairline)] bg-[var(--bg-surface)] px-4 py-2">
      <PulseBar chips={chipsByOutlet[outletCode] ?? []} className="border-b-0 bg-transparent px-0 py-0" />
      <div className="flex flex-none items-center gap-3">
        <span className="text-[12.5px] text-[var(--ink-tertiary)]">{cfg.serviceWindow}</span>
        <span
          className="flex h-8 items-center gap-[7px] rounded-[var(--radius-full)] border px-3 text-xs font-semibold"
          style={{
            background: offline ? 'var(--status-caution-bg)' : 'var(--status-positive-bg)',
            borderColor: offline ? 'var(--status-caution-line)' : 'var(--status-positive-line)',
            color: offline ? 'var(--status-caution-ink)' : 'var(--status-positive-ink)',
          }}
        >
          <span
            className="size-[7px] rounded-full"
            style={{
              background: offline ? 'var(--status-caution-ink)' : 'var(--status-positive-ink)',
              animation: offline ? 'pos-blink 1.4s var(--ease-standard) infinite' : 'none',
            }}
          />
          {offline ? 'Op log queueing' : 'Live · in sync'}
        </span>
      </div>
    </div>
  );
}
