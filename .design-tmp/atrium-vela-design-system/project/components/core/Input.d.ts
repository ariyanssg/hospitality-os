import * as React from 'react';

/** Input — Atrium Tier-A text field on the density + accent-focus tokens. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Flip the border + focus ring to critical for inline validation errors. @default false */
  invalid?: boolean;
  /** Use the mono face with tabular numerals (codes, amounts, IDs). @default false */
  mono?: boolean;
}

export declare function Input(props: InputProps): React.ReactElement;
