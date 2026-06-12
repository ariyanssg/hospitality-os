'use client';
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, CircleCheck, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';
import type { PosKdsItem, PosOutlet, PosTable } from '@vela/contracts';
import { cn } from '@vela/ui';
import { usePos } from '@/lib/pos-store';
import { useSdk } from '@/lib/sdk';
import { useKdsItems, useNow, usePosOps } from '@/lib/pos-api';
import { TICKET_ALLERGIES, VIP_CHECKS, clockOf, mmss, parseCourseTag, stationFor } from '@/lib/pos-data';

const STATIONS = [
  { id: 'expo', label: 'Expo' },
  { id: 'grill', label: 'Grill' },
  { id: 'fry', label: 'Fry' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'bar', label: 'Bar' },
];

const SLA_SEC = 600;
const WARN_SEC = 360;

interface Ticket {
  key: string;
  checkId: string;
  checkNumber: string;
  table: string;
  course: string;
  tag: string;
  firedAtMs: number;
  items: PosKdsItem[];
}

/** Kitchen display — always dark: station load, SLA meters, item check-off, bump/recall, all-day. */
export function KdsScreen({
  outlets,
  tablesByOutlet,
}: {
  outlets: PosOutlet[];
  tablesByOutlet: Map<string, PosTable[]>;
}) {
  const sdk = useSdk();
  const now = useNow(1000);
  const { invalidate } = usePosOps();
  const s = usePos();
  const { data: kdsItems } = useKdsItems();

  const outletCode = useMemo(() => new Map(outlets.map((o) => [o.id, o.code])), [outlets]);
  const tableLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const [, tables] of tablesByOutlet) for (const t of tables) m.set(t.id, t.label);
    return m;
  }, [tablesByOutlet]);

  const ready = useMutation({
    mutationFn: (itemId: string) => sdk.markKdsItemReady(itemId, { idempotencyKey: `kds-ready-${itemId}` }),
    onSuccess: () => invalidate(),
  });

  const tickets: Ticket[] = useMemo(() => {
    const groups = new Map<string, Ticket>();
    for (const item of kdsItems ?? []) {
      const tag = parseCourseTag(item.course);
      if (tag.kind === 'adj' || tag.kind === 'svc') continue;
      const courseN = tag.kind === 'course' ? tag.course : 0;
      const key = `${item.checkId}:${courseN}`;
      const code = outletCode.get(item.outletId) ?? 'VISTA';
      const label = item.tableId ? tableLabel.get(item.tableId) : undefined;
      const table = label ? (code === 'VISTA' ? `Table ${label}` : label) : `Tab #${item.checkNumber}`;
      const firedAtMs = item.firedAt ? Date.parse(item.firedAt) : now;
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
        existing.firedAtMs = Math.min(existing.firedAtMs, firedAtMs);
      } else {
        groups.set(key, {
          key,
          checkId: item.checkId,
          checkNumber: item.checkNumber,
          table: `${table} · #${item.checkNumber}`,
          course: courseN ? `Course ${courseN}` : 'Single fire',
          tag: code,
          firedAtMs,
          items: [item],
        });
      }
    }
    return [...groups.values()];
  }, [kdsItems, now, outletCode, tableLabel]);

  const forStation = (sid: string) =>
    sid === 'expo' ? tickets : tickets.filter((t) => t.items.some((i) => stationFor(i.name) === sid));

  const openTickets = (sid: string) =>
    forStation(sid).filter((t) => !(s.bumped[t.key] && t.items.every((i) => i.status === 'ready')));

  const maxLoad = Math.max(1, ...STATIONS.map((st) => openTickets(st.id).length));
  const visible = openTickets(s.station).sort((a, b) => a.firedAtMs - b.firedAtMs);

  const allDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of visible) for (const i of t.items) counts.set(i.name, (counts.get(i.name) ?? 0) + i.quantity);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [visible]);

  const bump = (t: Ticket) => {
    for (const i of t.items) {
      if (i.status === 'fired') ready.mutate(i.id);
    }
    s.set({ bumped: { ...s.bumped, [t.key]: true }, lastBump: t.key });
  };

  const lastB = s.lastBump && s.bumped[s.lastBump] ? s.lastBump : null;

  return (
    <div className="dark flex min-h-0 flex-1 flex-col bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      <div className="flex flex-none items-center gap-2.5 border-b border-[var(--line-hairline)] px-4 py-3">
        {STATIONS.map((st) => {
          const n = openTickets(st.id).length;
          const active = s.station === st.id;
          return (
            <button
              key={st.id}
              onClick={() => s.set({ station: st.id })}
              className="flex h-[54px] min-w-[104px] flex-col justify-center gap-[5px] rounded-[var(--radius-md)] border px-3.5 pb-[9px] pt-2 text-[14px] font-semibold transition-colors duration-[var(--motion-fast)]"
              style={{
                background: active ? 'var(--interactive-selected)' : 'var(--bg-surface)',
                color: active ? 'var(--ink-accent)' : 'var(--ink-secondary)',
                borderColor: active ? 'var(--interactive-default)' : 'var(--line-hairline)',
              }}
            >
              <span className="flex w-full items-center gap-[9px]">
                <span>{st.label}</span>
                <span className="flex-1" />
                <span data-numeric className="rounded-[var(--radius-xs)] bg-[var(--bg-sunken)] px-[7px] py-px font-mono text-xs text-[var(--ink-secondary)]">
                  {n}
                </span>
              </span>
              <span className="h-[3px] w-full overflow-hidden rounded-sm bg-[var(--bg-sunken)]">
                <span
                  className="block h-full rounded-sm transition-[width] duration-[var(--motion-slow)]"
                  style={{
                    width: `${Math.round((n / maxLoad) * 100)}%`,
                    background: n >= 4 ? 'var(--status-caution-ink)' : 'var(--interactive-default)',
                  }}
                />
              </span>
            </button>
          );
        })}
        {lastB && (
          <button
            onClick={() => s.set({ bumped: { ...s.bumped, [lastB]: false }, lastBump: null })}
            className="flex h-[46px] items-center gap-[7px] rounded-[var(--radius-md)] border border-dashed border-[var(--line-strong)] px-3.5 text-[13px] font-semibold text-[var(--ink-secondary)]"
          >
            <RotateCcw className="size-[15px]" />
            Recall
          </button>
        )}
        <div className="flex-1" />
        <span data-numeric className="pr-1.5 font-mono text-[22px] font-semibold tracking-[0.02em]">
          {clockOf(new Date(now))}
        </span>
        <span className="h-7 w-px bg-[var(--line-hairline)]" />
        <span className="flex items-center gap-3.5 text-[12.5px] text-[var(--ink-secondary)]">
          <span>
            Avg ticket <span data-numeric className="font-mono font-semibold text-[var(--ink-primary)]">6:48</span>
          </span>
          <span>
            On-time <span data-numeric className="font-mono font-semibold text-[var(--status-positive-ink)]">92%</span>
          </span>
          <span className="flex items-center gap-[5px]">
            <span className="size-[9px] rounded-[3px] border border-[var(--status-caution-line)] bg-[var(--status-caution-bg)]" />
            &gt; 6 min
          </span>
          <span className="flex items-center gap-[5px]">
            <span className="size-[9px] rounded-[3px] border border-[var(--status-critical-line)] bg-[var(--status-critical-bg)]" />
            &gt; 10 min
          </span>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-3.5">
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2.5 text-[var(--ink-tertiary)]">
              <CircleCheck className="size-[34px]" />
              <span className="text-[15px] font-semibold text-[var(--ink-secondary)]">
                All clear — no open tickets at {STATIONS.find((x) => x.id === s.station)?.label}.
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-3">
            {visible.map((t) => {
              const el = Math.max(0, (now - t.firedAtMs) / 1000);
              const breach = el > SLA_SEC;
              const warn = el > WARN_SEC;
              const allergy = TICKET_ALLERGIES[t.checkNumber];
              const allPlated = t.items.every((i) => i.status === 'ready');
              return (
                <div
                  key={t.key}
                  className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--bg-surface)]"
                  style={{ borderColor: breach ? 'var(--status-critical-line)' : warn ? 'var(--status-caution-line)' : 'var(--line-hairline)' }}
                >
                  <div
                    className="flex items-center gap-2.5 border-b border-[var(--line-hairline)] px-3 py-2.5"
                    style={{ background: breach ? 'var(--status-critical-bg)' : warn ? 'var(--status-caution-bg)' : 'var(--bg-sunken)' }}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="truncate text-[14.5px] font-semibold">{t.table}</span>
                      <span className="text-[11px] text-[var(--ink-tertiary)]">{t.course}</span>
                    </div>
                    {VIP_CHECKS.has(t.checkNumber) && (
                      <span className="flex h-[22px] items-center rounded-[var(--radius-full)] bg-[var(--interactive-selected)] px-2 text-[10.5px] font-bold text-[var(--ink-accent)]">
                        VIP
                      </span>
                    )}
                    {s.station === 'expo' && t.tag !== 'VISTA' && (
                      <span className="flex h-[22px] items-center rounded-[var(--radius-xs)] bg-[var(--bg-sunken)] px-2 font-mono text-[10px] font-semibold tracking-[0.05em] text-[var(--ink-tertiary)]">
                        {t.tag}
                      </span>
                    )}
                    <div className="flex flex-col items-end leading-[1.1]">
                      <span
                        data-numeric
                        className="font-mono text-[17px] font-bold"
                        style={{
                          color: breach ? 'var(--status-critical-ink)' : warn ? 'var(--status-caution-ink)' : 'var(--ink-primary)',
                          animation: breach ? 'pos-blink 1.4s var(--ease-standard) infinite' : 'none',
                        }}
                      >
                        {mmss(el)}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--ink-tertiary)]">#{t.checkNumber}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-[var(--bg-sunken)]">
                    <div
                      className="h-full transition-[width] duration-1000 ease-linear"
                      style={{
                        width: `${Math.min(100, Math.round((el / SLA_SEC) * 100))}%`,
                        background: breach ? 'var(--status-critical-ink)' : warn ? 'var(--status-caution-ink)' : 'var(--interactive-default)',
                      }}
                    />
                  </div>
                  {allergy && (
                    <div className="flex items-center gap-2 border-b border-[var(--status-critical-line)] bg-[var(--status-critical-bg)] px-3 py-2 text-xs font-bold text-[var(--status-critical-ink)]">
                      <TriangleAlert className="size-3.5" />
                      {allergy}
                    </div>
                  )}
                  <div className="flex flex-col py-1.5">
                    {t.items.map((i) => {
                      const done = i.status === 'ready';
                      const station = stationFor(i.name);
                      const dim = s.station !== 'expo' && station !== s.station;
                      const tag = parseCourseTag(i.course);
                      return (
                        <button
                          key={i.id}
                          onClick={() => !done && ready.mutate(i.id)}
                          title="Tap when plated"
                          className="flex w-full items-start gap-2.5 px-3 py-[7px] text-left hover:bg-[var(--bg-sunken)]"
                          style={{ opacity: dim ? 0.35 : done ? 0.6 : 1 }}
                        >
                          <span
                            className="mt-px flex size-5 flex-none items-center justify-center rounded-full border-[1.5px] text-[var(--ink-inverse)] transition-colors duration-[var(--motion-fast)]"
                            style={{
                              borderColor: done ? 'var(--status-positive-ink)' : 'var(--line-strong)',
                              background: done ? 'var(--status-positive-ink)' : 'transparent',
                            }}
                          >
                            {done && <Check className="size-3" />}
                          </span>
                          <span data-numeric className="flex-none font-mono text-[14px] font-bold">
                            {i.quantity}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-px">
                            <span className={cn('text-[14px] font-semibold', done && 'line-through')}>{i.name.split(' — ')[0]}</span>
                            {i.name.includes(' — ') && (
                              <span className="text-[11.5px] text-[var(--ink-tertiary)]">{i.name.split(' — ')[1]}</span>
                            )}
                          </span>
                          {tag.kind === 'course' && (
                            <span className="rounded-[var(--radius-xs)] bg-[var(--bg-sunken)] px-[5px] py-0.5 text-[10px] font-semibold text-[var(--ink-tertiary)]">
                              S{tag.seat}
                            </span>
                          )}
                          {s.station === 'expo' && (
                            <span className="rounded-[var(--radius-xs)] border border-[var(--line-hairline)] px-[5px] py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.06em] text-[var(--ink-tertiary)]">
                              {station.toUpperCase()}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => bump(t)}
                    className="mx-2.5 mb-2.5 mt-1.5 flex h-[52px] items-center justify-center gap-[9px] rounded-[var(--radius-md)] text-[14.5px] font-semibold text-[var(--ink-inverse)] transition-colors duration-[var(--motion-fast)]"
                    style={{ background: allPlated ? 'var(--status-positive-ink)' : 'var(--interactive-default)' }}
                  >
                    <Check className="size-[17px]" />
                    {allPlated ? 'Bump — all plated' : 'Bump'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-none items-center gap-2.5 overflow-x-auto border-t border-[var(--line-hairline)] bg-[var(--bg-surface)] px-4 py-2.5">
        <span className="flex-none text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">All day</span>
        {allDay.map(([name, count]) => (
          <span key={name} className="inline-flex h-8 flex-none items-center gap-[7px] whitespace-nowrap rounded-[var(--radius-full)] bg-[var(--bg-sunken)] px-[11px] text-[12.5px] text-[var(--ink-secondary)]">
            {name.split(' — ')[0]}{' '}
            <span data-numeric className="font-mono font-bold text-[var(--ink-primary)]">
              ×{count}
            </span>
          </span>
        ))}
        <div className="flex-1" />
        <span className="flex flex-none items-center gap-[7px] text-xs text-[var(--ink-tertiary)]">
          <Sparkles className="size-[13px]" />
          Pacing hint: T8 desserts in ~6 min
        </span>
      </div>
    </div>
  );
}
