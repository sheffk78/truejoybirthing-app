/**
 * Date utility functions.
 *
 * ⚠️ NEVER use `toISOString().split('T')[0]` for local dates.
 * In US timezones (UTC-5 to UTC-8), toISOString() converts to UTC midnight,
 * which can shift the date by ±1 day. Use these local methods instead.
 */

/**
 * Convert a Date to a local YYYY-MM-DD string using local timezone methods.
 * Safe for all timezones. Use for API params, min/max values, and any
 * date picker value binding.
 */
export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Convert a Date to a local YYYY-MM-DDTHH:mm string for datetime-local inputs.
 * Safe for all timezones.
 */
export function formatDatetimeLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/**
 * Get today's date as a local YYYY-MM-DD string.
 * Equivalent to `formatDateLocal(new Date())`.
 */
export function todayLocal(): string {
  return formatDateLocal(new Date());
}