import { cn } from '../lib/cn';

export type RoomState =
  | 'vacant-clean'
  | 'vacant-dirty'
  | 'occupied'
  | 'inspected'
  | 'ooo'
  | 'oos'
  | 'arrival'
  | 'departure';

const LABELS: Record<RoomState, string> = {
  'vacant-clean': 'Vacant · Clean',
  'vacant-dirty': 'Vacant · Dirty',
  occupied: 'Occupied',
  inspected: 'Inspected',
  ooo: 'Out of order',
  oos: 'Out of service',
  arrival: 'Arrival',
  departure: 'Departure',
};

/**
 * RoomStatusChip — the room-status colors are sacred (doc 17 §3): identical across rack, boards,
 * mobile, reports. Pairs a color dot with a label (color-never-alone, a11y).
 */
export function RoomStatusChip({ state, className }: { state: RoomState; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-[var(--gap-xs)] text-[var(--text-caption)] text-[var(--ink-secondary)]', className)}
    >
      <span
        aria-hidden
        className="size-2.5 rounded-full"
        style={{ background: `var(--room-${state})` }}
      />
      {LABELS[state]}
    </span>
  );
}
