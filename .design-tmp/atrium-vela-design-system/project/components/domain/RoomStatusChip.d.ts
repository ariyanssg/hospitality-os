import * as React from 'react';

export type RoomState =
  | 'vacant-clean'
  | 'vacant-dirty'
  | 'occupied'
  | 'inspected'
  | 'ooo'
  | 'oos'
  | 'arrival'
  | 'departure';

/** RoomStatusChip — sacred room-status color + label, identical across every surface. */
export interface RoomStatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The room state; drives the dot color from the --room-* tokens. */
  state: RoomState;
  /** Override the default label. */
  label?: React.ReactNode;
  /** Render as a filled pill instead of bare dot + text. @default false */
  chip?: boolean;
}

export declare function RoomStatusChip(props: RoomStatusChipProps): React.ReactElement;
