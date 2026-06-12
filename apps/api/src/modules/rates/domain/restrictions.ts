/**
 * Rate-restriction evaluation (doc modules/01 rates): stop_sell / min_los / max_los / cta apply at
 * rate×roomtype×date granularity. Pure logic — the service loads the rows, this decides.
 * ctd (closed-to-departure) is keyed on the departure date and checked separately by the caller.
 */
export interface RestrictionRow {
  stayDate: string;
  kind: 'min_los' | 'max_los' | 'cta' | 'ctd' | 'stop_sell';
  value: number | null;
}

export interface RestrictionViolation {
  stayDate: string;
  code: 'STOP_SELL' | 'MIN_LOS' | 'MAX_LOS' | 'CLOSED_TO_ARRIVAL';
}

/** First violation for a stay (nights = arrival inclusive → departure exclusive), or null. */
export function violatedRestriction(
  restrictions: RestrictionRow[],
  nights: string[],
): RestrictionViolation | null {
  if (nights.length === 0) return null;
  const arrival = nights[0]!;
  const los = nights.length;

  for (const r of restrictions) {
    switch (r.kind) {
      case 'stop_sell':
        if (nights.includes(r.stayDate)) return { stayDate: r.stayDate, code: 'STOP_SELL' };
        break;
      case 'cta':
        if (r.stayDate === arrival) return { stayDate: r.stayDate, code: 'CLOSED_TO_ARRIVAL' };
        break;
      case 'min_los':
        if (r.stayDate === arrival && r.value !== null && los < r.value) {
          return { stayDate: r.stayDate, code: 'MIN_LOS' };
        }
        break;
      case 'max_los':
        if (r.stayDate === arrival && r.value !== null && los > r.value) {
          return { stayDate: r.stayDate, code: 'MAX_LOS' };
        }
        break;
      case 'ctd':
        break; // departure-date keyed; evaluated by the caller against the departure date
    }
  }
  return null;
}
