const TZ = "America/Los_Angeles";
const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });

/** "Oct 8, 2026" in Pacific Time */
export const ptDate = (iso: string) => dateFmt.format(new Date(iso));
/** "4:48:12 PM" in Pacific Time */
export const ptTime = (iso: string) => timeFmt.format(new Date(iso)).replace(/\u202f/g, " ");

export function deviceType(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
/** "2026-10-08" — the Pacific calendar day, for date-range filters */
export const ptDayKey = (iso: string | Date) => keyFmt.format(new Date(iso));
