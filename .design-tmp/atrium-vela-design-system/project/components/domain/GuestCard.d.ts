import * as React from 'react';

/**
 * GuestCard — guest identity card with VIP, stay summary, traits and an LTV chip.
 *
 * @startingPoint section="Domain" subtitle="Guest identity card: VIP, traits, lifetime value" viewport="700x200"
 */
export interface GuestCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Guest full name. */
  name: string;
  /** Optional photo URL; falls back to initials. */
  photo?: string;
  /** Show the VIP badge. @default false */
  vip?: boolean;
  /** One-line stay summary, e.g. "King Ocean View \u00B7 2 nights \u00B7 BK-1042". */
  summary?: React.ReactNode;
  /** Trait chips, e.g. ["3rd stay", "prefers high floor", "allergy: nuts"]. */
  traits?: React.ReactNode[];
  /** Lifetime value as a money string/number; renders an LTV chip. */
  ltv?: string | number;
  /** Currency for the LTV chip. @default "USD" */
  currency?: string;
}

export declare function GuestCard(props: GuestCardProps): React.ReactElement;
