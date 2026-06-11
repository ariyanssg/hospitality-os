import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { Money } from '../src/modules/kernel/money/money';

/**
 * Property-based tests on the Money value object (doc 14 §3). Money is the only place money math is
 * allowed, so its algebra must hold for ALL inputs — these guard against any float drift creeping in.
 */

/** Build a scale-4 decimal string from signed minor units (matches numeric(14,4)). */
function decimalFromMinor(minor: bigint): string {
  const neg = minor < 0n;
  const abs = (neg ? -minor : minor).toString().padStart(5, '0');
  return `${neg ? '-' : ''}${abs.slice(0, -4)}.${abs.slice(-4)}`;
}

// numeric(14,4): |minor units| < 10^14.
const minor = fc.bigInt({ min: -9_999_999_999n, max: 9_999_999_999n });
const money = minor.map((m) => Money.of(decimalFromMinor(m), 'USD'));

describe('Money — algebraic invariants', () => {
  it('toJSON/of round-trips exactly (no precision loss)', () => {
    fc.assert(
      fc.property(money, (m) => {
        expect(Money.fromJSON(m.toJSON()).amount).toBe(m.amount);
      }),
    );
  });

  it('addition is commutative', () => {
    fc.assert(
      fc.property(money, money, (a, b) => {
        expect(a.add(b).amount).toBe(b.add(a).amount);
      }),
    );
  });

  it('addition is associative', () => {
    fc.assert(
      fc.property(money, money, money, (a, b, c) => {
        expect(a.add(b).add(c).amount).toBe(a.add(b.add(c)).amount);
      }),
    );
  });

  it('zero is the additive identity', () => {
    fc.assert(
      fc.property(money, (a) => {
        expect(a.add(Money.zero('USD')).amount).toBe(a.amount);
      }),
    );
  });

  it('subtraction inverts addition', () => {
    fc.assert(
      fc.property(money, money, (a, b) => {
        expect(a.add(b).subtract(b).amount).toBe(a.amount);
      }),
    );
  });

  it('negation is an involution and sums to zero', () => {
    fc.assert(
      fc.property(money, (a) => {
        expect(a.negate().negate().amount).toBe(a.amount);
        expect(a.add(a.negate()).isZero()).toBe(true);
      }),
    );
  });

  it('times(1) is identity and times(0) is zero', () => {
    fc.assert(
      fc.property(money, (a) => {
        expect(a.times(1).amount).toBe(a.amount);
        expect(a.times(0).isZero()).toBe(true);
      }),
    );
  });

  it('percentage(100) returns the original amount', () => {
    fc.assert(
      fc.property(money, (a) => {
        expect(a.percentage(100).amount).toBe(a.amount);
      }),
    );
  });

  it('compare is consistent with the sign of the difference', () => {
    fc.assert(
      fc.property(money, money, (a, b) => {
        const cmp = a.compare(b);
        const diff = a.subtract(b);
        if (cmp === 0) expect(diff.isZero()).toBe(true);
        if (cmp < 0) expect(diff.isNegative()).toBe(true);
        if (cmp > 0) expect(diff.isPositive()).toBe(true);
      }),
    );
  });

  it('rejects currency mixing', () => {
    expect(() => Money.of('1.00', 'USD').add(Money.of('1.00', 'EUR'))).toThrow(/currency/i);
  });
});
