/**
 * Reading a Quote's Date out to a reader. A Date is a calendar day with no time
 * and no zone, so it is formatted in UTC: reading it in the reader's zone would
 * move a midnight day to the day before for half the world.
 */
const DATE_LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** The Date a Card shows, in the words a reader uses: "20 March 2026". */
export function cardDateLabel(day: string): string {
  return DATE_LABEL.format(new Date(`${day}T00:00:00Z`));
}
