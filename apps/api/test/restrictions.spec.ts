import { describe, expect, it } from 'vitest';
import {
  violatedRestriction,
  type RestrictionRow,
} from '../src/modules/rates/domain/restrictions';

const nights = ['2026-07-01', '2026-07-02', '2026-07-03']; // 3-night stay arriving Jul 1

describe('violatedRestriction', () => {
  it('passes with no restrictions', () => {
    expect(violatedRestriction([], nights)).toBeNull();
  });

  it('stop_sell blocks any night of the stay', () => {
    const rows: RestrictionRow[] = [{ stayDate: '2026-07-02', kind: 'stop_sell', value: null }];
    expect(violatedRestriction(rows, nights)).toEqual({ stayDate: '2026-07-02', code: 'STOP_SELL' });
  });

  it('cta blocks only when it falls on the arrival date', () => {
    const onArrival: RestrictionRow[] = [{ stayDate: '2026-07-01', kind: 'cta', value: null }];
    expect(violatedRestriction(onArrival, nights)?.code).toBe('CLOSED_TO_ARRIVAL');
    const midStay: RestrictionRow[] = [{ stayDate: '2026-07-02', kind: 'cta', value: null }];
    expect(violatedRestriction(midStay, nights)).toBeNull();
  });

  it('min_los on the arrival date enforces stay length', () => {
    const rows: RestrictionRow[] = [{ stayDate: '2026-07-01', kind: 'min_los', value: 4 }];
    expect(violatedRestriction(rows, nights)?.code).toBe('MIN_LOS');
    const satisfied: RestrictionRow[] = [{ stayDate: '2026-07-01', kind: 'min_los', value: 3 }];
    expect(violatedRestriction(satisfied, nights)).toBeNull();
  });

  it('max_los on the arrival date caps stay length', () => {
    const rows: RestrictionRow[] = [{ stayDate: '2026-07-01', kind: 'max_los', value: 2 }];
    expect(violatedRestriction(rows, nights)?.code).toBe('MAX_LOS');
  });

  it('min_los on a non-arrival date does not apply', () => {
    const rows: RestrictionRow[] = [{ stayDate: '2026-07-02', kind: 'min_los', value: 7 }];
    expect(violatedRestriction(rows, nights)).toBeNull();
  });

  it('ctd is left to the caller (departure-date keyed)', () => {
    const rows: RestrictionRow[] = [{ stayDate: '2026-07-01', kind: 'ctd', value: null }];
    expect(violatedRestriction(rows, nights)).toBeNull();
  });
});
