import * as React from 'react';

/**
 * StatTile — KPI tile with display numeral and optional delta.
 *
 * @startingPoint section="Data" subtitle="KPI tile: display numeral + delta + sub-label" viewport="700x150"
 */
export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Caps micro label, e.g. "Occupancy". */
  label: React.ReactNode;
  /** The headline value, e.g. "84%" or "$241". */
  value: React.ReactNode;
  /** Optional change indicator. */
  delta?: { dir: 'up' | 'down'; value: string };
  /** Optional caption under the value. */
  sub?: React.ReactNode;
}

export declare function StatTile(props: StatTileProps): React.ReactElement;
