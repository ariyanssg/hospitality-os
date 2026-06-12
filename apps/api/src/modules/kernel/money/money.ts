/**
 * The Money value object (doc 14 §2). Amounts are exact: stored as BigInt minor units at scale 4,
 * the same precision as the DB's numeric(14,4). All money arithmetic goes through this type — there
 * is no float math on money anywhere in the system.
 */
const SCALE = 4;

function pow10(n: number): bigint {
  return 10n ** BigInt(n);
}

function roundDiv(num: bigint, den: bigint): bigint {
  // Half-up rounding, sign-aware.
  const negative = num < 0n;
  const a = negative ? -num : num;
  const q = a / den;
  const r = a % den;
  const rounded = r * 2n >= den ? q + 1n : q;
  return negative ? -rounded : rounded;
}

function parseDecimal(input: string): { value: bigint; scale: number } {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(input.trim());
  if (!match) throw new Error(`Invalid decimal amount: "${input}"`);
  const sign = match[1] === '-' ? -1n : 1n;
  const frac = match[3] ?? '';
  return { value: sign * BigInt(match[2] + frac), scale: frac.length };
}

function rescale(value: bigint, from: number, to: number): bigint {
  if (from === to) return value;
  if (from < to) return value * pow10(to - from);
  return roundDiv(value, pow10(from - to));
}

export interface MoneyJSON {
  amount: string;
  currency: string;
}

export class Money {
  private constructor(
    readonly minorUnits: bigint,
    readonly currency: string,
  ) {}

  static of(amount: string, currency: string): Money {
    const { value, scale } = parseDecimal(amount);
    return new Money(rescale(value, scale, SCALE), currency.toUpperCase());
  }

  static fromJSON(m: MoneyJSON): Money {
    return Money.of(m.amount, m.currency);
  }

  static zero(currency: string): Money {
    return new Money(0n, currency.toUpperCase());
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  negate(): Money {
    return new Money(-this.minorUnits, this.currency);
  }

  /** Multiply by a quantity or factor given as a decimal string/number (e.g. nights, units). */
  times(factor: string | number): Money {
    const { value, scale } = parseDecimal(String(factor));
    const product = this.minorUnits * value;
    return new Money(rescale(product, SCALE + scale, SCALE), this.currency);
  }

  /** amount × pct / 100, half-up (tax + derivation math). */
  percentage(pct: string | number): Money {
    const scaled = this.times(pct);
    return new Money(roundDiv(scaled.minorUnits, 100n), this.currency);
  }

  /** Divide by a positive integer count (ADR/RevPAR-style stats), half-up. */
  dividedBy(divisor: number): Money {
    if (!Number.isInteger(divisor) || divisor <= 0) {
      throw new Error(`Money division requires a positive integer divisor, got ${divisor}`);
    }
    return new Money(roundDiv(this.minorUnits, BigInt(divisor)), this.currency);
  }

  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  isNegative(): boolean {
    return this.minorUnits < 0n;
  }

  isPositive(): boolean {
    return this.minorUnits > 0n;
  }

  /** -1 | 0 | 1 */
  compare(other: Money): number {
    this.assertSameCurrency(other);
    if (this.minorUnits < other.minorUnits) return -1;
    if (this.minorUnits > other.minorUnits) return 1;
    return 0;
  }

  get amount(): string {
    const negative = this.minorUnits < 0n;
    const abs = (negative ? -this.minorUnits : this.minorUnits).toString().padStart(SCALE + 1, '0');
    const int = abs.slice(0, abs.length - SCALE);
    const frac = abs.slice(abs.length - SCALE);
    return `${negative ? '-' : ''}${int}.${frac}`;
  }

  toJSON(): MoneyJSON {
    return { amount: this.amount, currency: this.currency };
  }

  toString(): string {
    return `${this.amount} ${this.currency}`;
  }
}
