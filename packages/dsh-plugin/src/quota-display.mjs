import { translate } from "./dockyard-locale.mjs";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const PERIOD_HINTS = [
  [/five[\s-]*hour|5[\s-]*hour|\b5h\b/i, 5 * 60 * 60 * 1000],
  [/one[\s-]*hour|hourly|\b1h\b|\bhour\b/i, 60 * 60 * 1000],
  [/one[\s-]*day|daily|\b24h\b|\b1d\b|\bday\b/i, 24 * 60 * 60 * 1000],
  [/one[\s-]*week|weekly|\b7d\b|\bweek\b/i, 7 * 24 * 60 * 60 * 1000],
  [/one[\s-]*month|monthly|\b30d\b|\bmonth\b/i, 30 * 24 * 60 * 60 * 1000],
  [/yearly|annual|\b365d\b|\byear\b/i, 365 * 24 * 60 * 60 * 1000],
];

function numericTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  if (value instanceof Date) return value.getTime();
  if (value === null || value === undefined || value === "") return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function periodHint(window) {
  const label = `${window?.id ?? ""} ${window?.name ?? ""}`;
  return PERIOD_HINTS.find(([pattern]) => pattern.test(label))?.[1] ?? null;
}

function resetRemaining(window, now) {
  const timestamp = numericTimestamp(window?.resetAt);
  if (timestamp === null || timestamp <= now) return null;
  return timestamp - now;
}

function remainingFraction(window) {
  const remaining = Number(window?.remaining);
  const limit = Number(window?.limit);
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) return null;
  return Math.max(0, Math.min(1, remaining / limit));
}

function numericValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Window length in ms: the provider's own figure, else a period named in the label. */
export function quotaWindowPeriod(window) {
  const seconds = numericValue(window?.windowSeconds);
  return seconds !== null && seconds > 0 ? seconds * 1000 : periodHint(window);
}

function comparisonValue(window, now) {
  return quotaWindowPeriod(window) ?? resetRemaining(window, now) ?? Number.POSITIVE_INFINITY;
}

// Usage payloads name their windows after JSON keys ("primary_window").
const MACHINE_NAME = /^[a-z0-9]+(?:[_.][a-z0-9]+)+$/i;

/**
 * Display name for a quota window. A name the provider wrote for people is
 * kept; a machine key becomes the window's period when one is known.
 */
export function quotaWindowLabel(window, t) {
  const name = window?.name ?? window?.id ?? null;
  if (name && !MACHINE_NAME.test(name)) return name;
  const period = quotaWindowPeriod(window);
  if (period >= HOUR) {
    const days = period / DAY;
    if (days === 1) return translate(t, "quota.window.daily");
    if (days === 7) return translate(t, "quota.window.weekly");
    if (days === 30) return translate(t, "quota.window.monthly");
    return Number.isInteger(days)
      ? translate(t, "quota.window.days", { count: days })
      : translate(t, "quota.window.hours", { count: Math.round((period / HOUR) * 10) / 10 });
  }
  return name ? name.replace(/[_.]+/g, " ") : translate(t, "value.quota");
}

/** One set of thresholds for the composer meter and the popup's quota bars. */
export function quotaLevel(percent) {
  return percent <= 10 ? "critical" : percent <= 25 ? "warning" : "healthy";
}

/**
 * Pick the most immediate quota window for compact UI summaries.
 * Explicit period names win over provider array order; resetAt is the
 * fallback for providers that return generic window names.
 */
export function selectPrimaryQuotaWindow(windows, now = Date.now()) {
  if (!Array.isArray(windows) || windows.length === 0) return null;
  return windows.reduce((selected, candidate) => {
    if (!selected) return candidate;
    const selectedValue = comparisonValue(selected, now);
    const candidateValue = comparisonValue(candidate, now);
    if (candidateValue < selectedValue) return candidate;
    if (candidateValue > selectedValue) return selected;
    const selectedFraction = remainingFraction(selected);
    const candidateFraction = remainingFraction(candidate);
    if (candidateFraction !== null && (selectedFraction === null || candidateFraction < selectedFraction)) return candidate;
    return selected;
  }, null);
}

/**
 * Return only data that is safe to show in the compact chat control.
 * Balance windows are intentionally kept as money even when a provider also
 * returns a total, because pay-as-you-go credit is not a subscription quota.
 */
export function selectQuotaIndicator(windows, now = Date.now()) {
  const window = selectPrimaryQuotaWindow(windows, now);
  if (!window) return null;
  const remaining = numericValue(window.remaining);
  if (remaining === null) return null;

  if (window.kind === "balance") {
    return { type: "balance", window, remaining };
  }

  const limit = numericValue(window.limit);
  if (limit === null || limit <= 0) return null;
  return {
    type: "quota",
    window,
    remaining,
    percent: Math.max(0, Math.min(100, Math.round((remaining / limit) * 100))),
  };
}
