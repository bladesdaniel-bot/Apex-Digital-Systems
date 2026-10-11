/** Business types picked at random for each "Find businesses" search. */
export const BUSINESS_TYPES = [
  "restaurants", "plumbers", "electricians", "roofers", "dentists", "auto repair shops", "hair salons",
  "landscapers", "HVAC contractors", "law firms", "real estate agents", "chiropractors", "gyms",
  "cleaning services", "pet groomers", "bakeries", "coffee shops", "insurance agencies", "contractors",
  "barbershops", "nail salons", "accountants", "florists", "car detailing", "painters", "pest control",
] as const;

export type CallStatus = "queued" | "subscriber" | "dismissed";

/** Search targeting: "none" = no website yet (rebuild leads), "has" = website exists (turnover/rebrand leads), "any" = random mix. */
export type WebsiteFilter = "any" | "none" | "has";

export const matchesWebsiteFilter = (website: string, filter: WebsiteFilter): boolean =>
  filter === "any" || (filter === "none" ? !website.trim() : Boolean(website.trim()));

export type QueueRow = { status: CallStatus; called_at: string | null; found_at: string; website?: string; website_status?: import("./website-check").WebsiteStatus };

/**
 * The working queue: queued businesses that haven't been called yet,
 * newest first so a fresh search shows up on top; skips are ordered separately.
 */
export const callQueue = <T extends QueueRow>(rows: T[], filter: WebsiteFilter = "any") =>
  rows
    .filter(r => r.status === "queued" && !r.called_at && r.website_status !== "unchecked" && matchesWebsiteFilter(r.website ?? "", filter))
    // One search saves many businesses with the same found_at; break ties by id so a refresh never reshuffles the cards.
    .sort((a, b) => b.found_at.localeCompare(a.found_at) || String((a as { id?: string }).id ?? "").localeCompare(String((b as { id?: string }).id ?? "")));

/** Show the next three distinct businesses, with locally skipped rows at the back. */
export function upcomingCalls<T extends QueueRow & { id: string }>(queue: T[], skipped: string[]) {
  const order = new Map(skipped.map((id, index) => [id, index]));
  return [...queue].sort((a, b) =>
    (order.get(a.id) ?? -1) - (order.get(b.id) ?? -1)
  ).slice(0, 3);
}

/** Subscribers stay on the board; dismissed businesses are hidden from everyone. */
export const subscribers = <T extends QueueRow>(rows: T[]) => rows.filter(r => r.status === "subscriber");

/**
 * The web address to open in a new tab, or null when the value isn't a usable
 * link. Bare domains like "acme.com" are treated as https; anything that isn't
 * http(s) (javascript:, data:, blank, free text) stays plain text.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  const value = (url ?? "").trim();
  if (!value || /\s/.test(value)) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const protocol = new URL(candidate).protocol;
    return protocol === "http:" || protocol === "https:" ? candidate : null;
  } catch {
    return null;
  }
}

