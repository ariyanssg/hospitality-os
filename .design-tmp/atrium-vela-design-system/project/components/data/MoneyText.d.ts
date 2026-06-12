import * as React from 'react';

/** MoneyText — formats string-safe money with the brand's sign/color conventions. */
export interface MoneyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Decimal string or number, e.g. "240.00". Negative renders in the refund hue. */
  amount: string | number;
  /** ISO currency code. @default "USD" */
  currency?: string;
  /** Show an explicit + for positive values (deltas). @default false */
  signed?: boolean;
}

export declare function MoneyText(props: MoneyTextProps): React.ReactElement;
