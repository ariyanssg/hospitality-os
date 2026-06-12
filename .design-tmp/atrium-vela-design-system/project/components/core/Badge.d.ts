import * as React from 'react';

/** Badge / Tag — status tone uses the semantic status triplets; color always carries meaning. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Status tone. @default "neutral" */
  tone?: 'neutral' | 'positive' | 'caution' | 'critical' | 'info' | 'accent';
  /** Render a leading status dot in the current ink. @default false */
  dot?: boolean;
}

export declare function Badge(props: BadgeProps): React.ReactElement;
