/**
 * Date utilities for the Health module.
 *
 * All persistence keys use the local-calendar ISO date `YYYY-MM-DD`.
 * We never call `new Date("YYYY-MM-DD")` directly because the JS engine
 * parses bare ISO date strings as UTC midnight — which shifts the day
 * for users in negative-UTC offsets when re-formatted in local time.
 *
 * Use these helpers to read/write dates safely across timezones.
 */

import { format as fnsFormat, parse as fnsParse } from "date-fns";
import { es } from "date-fns/locale";

/** Format a `Date` as local-calendar `YYYY-MM-DD` (no timezone shift). */
export const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/** Today's date as local-calendar `YYYY-MM-DD`. */
export const todayISO = (): string => toISODate(new Date());

/**
 * Parse a `YYYY-MM-DD` string into a local `Date` at 00:00 local time.
 * Safe to use for display formatting — never causes day shift.
 */
export const fromISODate = (iso: string): Date => {
  // Use date-fns with explicit format → constructs a local Date.
  return fnsParse(iso, "yyyy-MM-dd", new Date());
};

/** Format an ISO date for display in Spanish locale. */
export const formatISODate = (iso: string, pattern: string): string => {
  return fnsFormat(fromISODate(iso), pattern, { locale: es });
};

/** Compare two ISO dates as strings (lexicographic == chronological). */
export const isSameISODate = (a: string, b: string) => a === b;
