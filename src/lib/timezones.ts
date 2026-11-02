// Browser-safe helpers for scheduling call-backs in the customer's local time.
export const TIMEZONES = [
  { id: "America/New_York", label: "Eastern (ET)" },
  { id: "America/Chicago", label: "Central (CT)" },
  { id: "America/Denver", label: "Mountain (MT)" },
  { id: "America/Phoenix", label: "Arizona (MST)" },
  { id: "America/Los_Angeles", label: "Pacific (PT)" },
  { id: "America/Anchorage", label: "Alaska (AKT)" },
  { id: "Pacific/Honolulu", label: "Hawaii (HT)" },
  { id: "Africa/Lagos", label: "Nigeria (WAT)" },
] as const;

const E = "America/New_York", C = "America/Chicago", M = "America/Denver", P = "America/Los_Angeles";
const STATE_TZ: Record<string, string> = {
  CT: E, DE: E, DC: E, FL: E, GA: E, IN: E, KY: E, ME: E, MD: E, MA: E, MI: E, NH: E, NJ: E, NY: E, NC: E, OH: E, PA: E, RI: E, SC: E, VT: E, VA: E, WV: E,
  AL: C, AR: C, IL: C, IA: C, KS: C, LA: C, MN: C, MS: C, MO: C, NE: C, ND: C, OK: C, SD: C, TN: C, TX: C, WI: C,
  CO: M, ID: M, MT: M, NM: M, UT: M, WY: M, AZ: "America/Phoenix",
  CA: P, NV: P, OR: P, WA: P, AK: "America/Anchorage", HI: "Pacific/Honolulu",
};
const STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

/** Guess the business's timezone from its address/area; falls back to Pacific. */
export function guessTimezone(...texts: (string | null | undefined)[]): string {
  const text = texts.filter(Boolean).join(", ");
  if (/nigeria/i.test(text)) return "Africa/Lagos";
  const abbr = (text.match(/\b([A-Z]{2})\s+\d{5}\b/) ?? text.match(/,\s*([A-Z]{2})\b/))?.[1];
  if (abbr && STATE_TZ[abbr]) return STATE_TZ[abbr];
  const lower = text.toLowerCase();
  const name = Object.keys(STATE_NAMES).sort((a, b) => b.length - a.length).find(n => new RegExp(`\\b${n}\\b`).test(lower));
  const code = name ? STATE_NAMES[name] : undefined;
  return (code && STATE_TZ[code]) || P;
}

function offsetMs(utc: number, tz: string): number {
  const parts: Record<string, string> = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(utc)).map(p => [p.type, p.value]));
  const n = (k: string) => Number(parts[k] ?? 0);
  return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")) - utc;
}

/** Convert a "YYYY-MM-DDTHH:mm" wall-clock time in `tz` to a UTC ISO string. */
export function zonedToIso(value: string, tz: string): string {
  const [d = "", t = "00:00"] = value.split("T");
  const [y = 0, mo = 1, da = 1] = d.split("-").map(Number);
  const [h = 0, mi = 0] = t.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, da, h, mi);
  let utc = wall - offsetMs(wall, tz);
  utc = wall - offsetMs(utc, tz);
  return new Date(utc).toISOString();
}

/** e.g. "8:00 AM EST" */
export function zoneTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso)).replace(/\u202f/g, " ");
}

export const OFFICE_TZ = "America/Los_Angeles";

/** "5:00 AM PDT Reno office · 8:00 AM EDT customer · 7:00 AM CDT you" — skips repeats of the office zone. */
export function threeTimes(iso: string, customerTz: string, repTz: string, repName?: string): string {
  const parts = [`${zoneTime(iso, OFFICE_TZ)} Reno office`, `${zoneTime(iso, customerTz)} customer`, `${zoneTime(iso, repTz)} ${repName || "rep"}`];
  return parts.join(" · ");
}
