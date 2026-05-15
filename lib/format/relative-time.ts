/**
 * Short relative time string ("2 hours ago", "just now") for the
 * project list. Anchors to a reference time so tests stay stable.
 */

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

export function relativeTime(target: number, now: number = Date.now()): string {
  const diffMs = target - now;
  const abs = Math.abs(diffMs);

  if (abs < 45_000) return "just now";

  for (const { unit, ms } of UNITS) {
    if (abs >= ms || unit === "second") {
      const value = Math.round(diffMs / ms);
      return formatter.format(value, unit);
    }
  }
  return "just now";
}
