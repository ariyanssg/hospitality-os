'use client';
import type { ReactNode } from 'react';
import { Badge } from '@vela/ui';
import { stockStatus, type MovementType, type StockStatus } from '@/lib/inventory-demo';

/** Table atoms — identical strings to the front-desk boards so density tokens apply. */
export const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
export const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';
export const TH_NUM = TH + ' text-right';
export const TD_NUM = TD + ' text-right font-mono tabular-nums';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={
        'overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] ' +
        (className ?? '')
      }
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  sub,
  right,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-[var(--gap-md)] border-b border-[var(--line-hairline)] px-[var(--space-4)] py-[var(--space-3)]">
      <div>
        <h2 className="font-display text-[var(--text-body-lg)] font-semibold tracking-tight">
          {title}
        </h2>
        {sub && <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ----------------------------------------------------------- status visuals */

const STATUS_LABEL: Record<StockStatus, string> = {
  out: 'Out of stock',
  reorder: 'Reorder',
  low: 'Running low',
  ok: 'In stock',
};

const STATUS_TONE: Record<StockStatus, 'critical' | 'caution' | 'info' | 'neutral'> = {
  out: 'critical',
  reorder: 'caution',
  low: 'info',
  ok: 'neutral',
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot={status !== 'ok'}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const GAUGE_FILL: Record<StockStatus, string> = {
  out: 'var(--status-critical-ink)',
  reorder: 'var(--status-caution-ink)',
  low: 'var(--status-info-ink)',
  ok: 'var(--status-positive-ink)',
};

/**
 * ParGauge — the module's signature mark. A par-level fill bar: the track is par, the fill is
 * on-hand, the tick is the reorder point. One glance answers "what do I have vs what should I
 * have" for any SKU (doc 04 stock control).
 */
export function ParGauge({
  onHand,
  par,
  reorderPoint,
  className,
}: {
  onHand: number;
  par: number;
  reorderPoint: number;
  className?: string;
}) {
  const status = stockStatus(onHand, par, reorderPoint);
  const fillPct = Math.max(0, Math.min(100, (onHand / Math.max(par, 1)) * 100));
  const tickPct = Math.max(0, Math.min(100, (reorderPoint / Math.max(par, 1)) * 100));
  return (
    <div
      className={'relative h-[6px] w-[110px] rounded-[var(--radius-full)] bg-[var(--bg-sunken)] ' + (className ?? '')}
      role="img"
      aria-label={`${onHand} on hand of ${par} par, reorder at ${reorderPoint}`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-[var(--radius-full)] transition-[width] duration-[var(--motion-base)]"
        style={{ width: `${fillPct}%`, background: GAUGE_FILL[status] }}
      />
      <div
        aria-hidden
        className="absolute top-[-2px] h-[10px] w-[1.5px] bg-[var(--ink-tertiary)] opacity-70"
        style={{ left: `${tickPct}%` }}
      />
    </div>
  );
}

/* --------------------------------------------------------- movement visuals */

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  receive: 'Receive',
  transfer: 'Transfer',
  issue: 'Issue',
  waste: 'Waste',
  depletion: 'POS depletion',
  adjust: 'Adjustment',
};

export const MOVEMENT_TONE: Record<
  MovementType,
  'positive' | 'info' | 'neutral' | 'critical' | 'caution'
> = {
  receive: 'positive',
  transfer: 'info',
  issue: 'neutral',
  waste: 'critical',
  depletion: 'neutral',
  adjust: 'caution',
};

/** Signed money in the GL idiom: receipts ink positive, consumption quiet, waste critical. */
export function DeltaMoney({ minor, text }: { minor: number; text: string }) {
  const color =
    minor > 0
      ? 'var(--fin-settled)'
      : minor < 0
        ? 'var(--ink-secondary)'
        : 'var(--ink-tertiary)';
  return (
    <span className="font-mono tabular-nums" style={{ color }}>
      {minor > 0 ? '+' : ''}
      {text}
    </span>
  );
}

/** Horizontal mini-bar for compositional breakdowns (store value, cost dimensions). */
export function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-[5px] w-full rounded-[var(--radius-full)] bg-[var(--bg-sunken)]">
      <div
        className="h-full rounded-[var(--radius-full)] transition-[width] duration-[var(--motion-slow)]"
        style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color }}
      />
    </div>
  );
}

/** Filter chip row used across sections (mirrors the arrivals view selector). */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={
              'inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-full)] border px-3 text-[12px] transition-colors duration-[var(--motion-fast)] ' +
              (active
                ? 'border-transparent bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                : 'border-[var(--line-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]')
            }
          >
            {o.label}
            {typeof o.count === 'number' && (
              <span className="font-mono text-[10.5px] tabular-nums opacity-70">{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
