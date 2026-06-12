import * as React from 'react';

export interface PulseChip {
  id: string;
  /** Caps micro label. */
  label: React.ReactNode;
  /** Display-numeral value. */
  value: React.ReactNode;
  /** Optional segmented day-progress meter, 0..1. */
  progress?: number;
  /** Optional change indicator. */
  delta?: { dir: 'up' | 'down'; value: string };
  /** Color the value by status meaning. @default "default" */
  tone?: 'default' | 'positive' | 'caution' | 'critical' | 'info';
  /** Click-through to the chip's board. */
  onClick?: () => void;
}

/**
 * PulseBar — the signature Desk strip of live property vitals.
 *
 * @startingPoint section="Data" subtitle="Live property-vitals strip — the Desk heartbeat" viewport="900x96"
 */
export interface PulseBarProps extends React.HTMLAttributes<HTMLDivElement> {
  chips: PulseChip[];
}

export declare function PulseBar(props: PulseBarProps): React.ReactElement;
