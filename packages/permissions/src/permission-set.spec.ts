import { describe, expect, it } from 'vitest';
import { PermissionSet, expandWildcards } from './permission-set';
import { ALL_PERMISSION_KEYS } from './catalog';

describe('expandWildcards', () => {
  it('expands `*` to every catalog key', () => {
    expect(expandWildcards(['*']).sort()).toEqual([...ALL_PERMISSION_KEYS].sort());
  });

  it('expands a prefix wildcard to only that module’s keys', () => {
    const keys = expandWildcards(['reservation.*']);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((k) => k.startsWith('reservation.'))).toBe(true);
    expect(keys).toContain('reservation.checkin');
    expect(keys).not.toContain('payment.refund');
  });

  it('passes concrete keys through unchanged and de-duplicates', () => {
    expect(expandWildcards(['folio.view', 'folio.view'])).toEqual(['folio.view']);
  });
});

describe('PermissionSet', () => {
  it('grants only what was assigned (O(1) has)', () => {
    const set = PermissionSet.from(['reservation.view', 'folio.view']);
    expect(set.has('reservation.view')).toBe(true);
    expect(set.has('payment.refund')).toBe(false);
  });

  it('deny overrides allow (doc 06 §1)', () => {
    const set = PermissionSet.from(['payment.*'], ['payment.refund']);
    expect(set.has('payment.collect')).toBe(true);
    expect(set.has('payment.refund')).toBe(false);
  });

  it('hasAll / hasAny honor the full set', () => {
    const set = PermissionSet.from(['reservation.view', 'reservation.checkin']);
    expect(set.hasAll(['reservation.view', 'reservation.checkin'])).toBe(true);
    expect(set.hasAll(['reservation.view', 'reservation.cancel'])).toBe(false);
    expect(set.hasAny(['reservation.cancel', 'reservation.view'])).toBe(true);
  });

  it('toArray is sorted and excludes denied keys', () => {
    const set = PermissionSet.from(['folio.view', 'folio.create'], ['folio.create']);
    expect(set.toArray()).toEqual(['folio.view']);
  });
});
