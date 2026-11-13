// How a guest's typed number is compared with the winning tickets.

/** Case-insensitive, whitespace-insensitive key ("ab 12" matches "AB12"). */
export function matchKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

const isDigits = (value: string) => /^\d+$/.test(value);
const stripLeadingZeros = (value: string) => value.replace(/^0+(?=\d)/, "");

/**
 * Finds the winning rows for a typed ticket number.
 *
 * - The WHOLE number must match; a partial entry never shows a winner.
 * - Google Sheets silently drops leading zeros from numbers (0719054 becomes
 *   719054), so a guest who types the zero still matches the stored 719054.
 *   That only works in the safe direction (typed is longer than stored), and
 *   only when it's unambiguous, so it can't produce a false winner.
 */
export function findMatches<T extends { ticket_number: string }>(
  items: T[],
  query: string
): T[] {
  const q = matchKey(query);
  if (!q) return [];

  const exact = items.filter((item) => matchKey(item.ticket_number) === q);
  if (exact.length > 0) return exact;

  if (!isDigits(q)) return [];
  const wanted = stripLeadingZeros(q);
  const loose = items.filter((item) => {
    const stored = matchKey(item.ticket_number);
    return (
      isDigits(stored) &&
      stored.length < q.length &&
      stripLeadingZeros(stored) === wanted
    );
  });
  const distinctTickets = new Set(loose.map((item) => matchKey(item.ticket_number)));
  return distinctTickets.size === 1 ? loose : [];
}
