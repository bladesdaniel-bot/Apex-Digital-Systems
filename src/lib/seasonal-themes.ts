/** Browser-safe seasonal theme schedule (dates judged in Reno / Pacific time). */
export const THEMES = ["halloween", "thanksgiving", "christmas"] as const;
export type Theme = (typeof THEMES)[number];
export type ThemeMode = "auto" | "on" | "off";

export const THEME_LABELS: Record<Theme, string> = {
  halloween: "Halloween (haunted house)",
  thanksgiving: "Thanksgiving",
  christmas: "Christmas",
};

export const THEME_SCHEDULE: Record<Theme, string> = {
  halloween: "Auto: Oct 1 – Oct 31",
  thanksgiving: "Auto: Nov 1 – Thanksgiving Day",
  christmas: "Auto: day after Thanksgiving – Dec 31",
};

/** Day of month of US Thanksgiving (4th Thursday of November). */
export function thanksgivingDay(year: number): number {
  const firstDow = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  return 1 + ((4 - firstDow + 7) % 7) + 21;
}

/** Pacific calendar date parts for an instant. */
export function pacificDate(now: Date): { y: number; m: number; d: number } {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: g("year"), m: g("month"), d: g("day") };
}

/** Which theme the automatic schedule wants on a given date (or null). */
export function scheduledTheme(now: Date): Theme | null {
  const { y, m, d } = pacificDate(now);
  if (m === 10) return "halloween";
  if (m === 11) return d <= thanksgivingDay(y) ? "thanksgiving" : "christmas";
  if (m === 12) return "christmas";
  return null;
}

/** Manual "on" wins (latest holiday first); "off" blocks auto; otherwise follow the schedule. */
export function activeTheme(modes: Record<Theme, ThemeMode>, now: Date): Theme | null {
  for (const t of ["christmas", "thanksgiving", "halloween"] as Theme[]) if (modes[t] === "on") return t;
  const s = scheduledTheme(now);
  return s && modes[s] === "auto" ? s : null;
}
