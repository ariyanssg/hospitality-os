const DAY_MS = 86_400_000;

/** Stay nights for [arrival, departure) as YYYY-MM-DD strings. */
export function nightsBetween(arrival: string, departure: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${departure}T00:00:00Z`);
  let cur = Date.parse(`${arrival}T00:00:00Z`);
  while (cur < end) {
    out.push(new Date(cur).toISOString().slice(0, 10));
    cur += DAY_MS;
  }
  return out;
}

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Short, human confirmation/folio reference derived from a uuid (never used as a key). */
export function confirmationNumberFrom(id: string): string {
  return `BK-${id.replace(/-/g, '').slice(-8).toUpperCase()}`;
}
