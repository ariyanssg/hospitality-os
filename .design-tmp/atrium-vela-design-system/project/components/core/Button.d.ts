import * as React from 'react';

/**
 * Button — Atrium Tier-A primitive. One primary action per view region (color usage law).
 *
 * @startingPoint section="Core" subtitle="Primary / secondary / ghost / danger / link, 3 sizes" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual intent. Only `primary` carries the accent hue. @default "primary" */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  /** Control height; maps to the density tokens. @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Show a spinner and disable the button. @default false */
  loading?: boolean;
}

export declare function Button(props: ButtonProps): React.ReactElement;
