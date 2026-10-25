/**
 * A calendar day as the form and the database write it: `YYYY-MM-DD`. Kept
 * free of server imports so the browser bundle only pulls the shape and today's
 * date, as `person-limits.ts` does for its numbers.
 */

/** The only shape a Date takes: a calendar day, never a time. */
export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

/** True when `value` is a real day on the calendar, not merely the right shape. */
export function isCalendarDay(value: string): boolean {
  if (!DAY_PATTERN.test(value)) {
    return false;
  }

  const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = value
    .split("-")
    .map(Number);
  const written = new Date(Date.UTC(year, month - 1, day));

  return (
    written.getUTCFullYear() === year &&
    written.getUTCMonth() === month - 1 &&
    written.getUTCDate() === day
  );
}

/**
 * Today, as the Date field writes it. Days are compared in UTC, the one
 * calendar the server and the database agree on; a Date no later than this one
 * is the only Date the form accepts.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
