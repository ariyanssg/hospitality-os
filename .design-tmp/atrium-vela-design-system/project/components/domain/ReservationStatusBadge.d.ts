import * as React from 'react';

export type ReservationStatus =
  | 'inquiry'
  | 'tentative'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show'
  | 'released';

/** ReservationStatusBadge — maps a reservation status to its canonical label + tone. */
export interface ReservationStatusBadgeProps {
  /** The reservation status key. */
  status: ReservationStatus | string;
}

export declare function ReservationStatusBadge(props: ReservationStatusBadgeProps): React.ReactElement;
