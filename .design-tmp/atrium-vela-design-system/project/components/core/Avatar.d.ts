import * as React from 'react';

/** Avatar — initials/photo identity chip with optional presence dot. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name; used for initials fallback and the title tooltip. */
  name?: string;
  /** Image URL; falls back to initials if omitted. */
  src?: string;
  /** Size token. @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Live-presence dot. */
  presence?: 'online' | 'away' | 'busy';
}

export declare function Avatar(props: AvatarProps): React.ReactElement;
