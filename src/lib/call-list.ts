import { z } from "zod";

/** Call sheet Tier 1: one customer is worth thousands. Searched first. */
export const TIER1_TYPES = [
  "roofers", "HVAC contractors", "remodeling contractors", "general contractors", "solar installers",
  "foundation repair", "concrete contractors", "pool and spa builders", "lawyers", "cosmetic surgeons",
  "dentists", "real estate agents", "car dealerships", "wedding venues",
] as const;

/** Call sheet Tier 2: good ticket size or repeat customers. Searched after Tier 1. */
export const TIER2_TYPES = [
  "plumbers", "electricians", "med spas", "chiropractors", "physical therapists", "martial arts studios",
  "gyms", "therapists", "pest control", "garage door repair", "auto body shops", "carpet cleaners",
  "landscapers", "tree service",
] as const;

/** Business types for a blank "Find businesses" search. Salons are never searched. */
export const BUSINESS_TYPES = [...TIER1_TYPES, ...TIER2_TYPES] as const;

export type TierFilter = "priority" | "tier1" | "tier2";

const shuffle = <T,>(a: readonly T[]) => [...a].sort(() => Math.random() - 0.5);

/** Order random search types: Tier 1 always before Tier 2. */
export const tierSearchOrder = (tier: TierFilter = "priority"): string[] =>
  tier === "tier1" ? shuffle(TIER1_TYPES) : tier === "tier2" ? shuffle(TIER2_TYPES) : [...shuffle(TIER1_TYPES), ...shuffle(TIER2_TYPES)];

/** Salons and barbers are never added to the call list. */
export const isExcludedCategory = (category: string) => /salon|barber|nail|hair/i.test(category);

/** 1 or 2 when a saved category matches a call-sheet tier, otherwise 3. */
export function tierOf(category: string): 1 | 2 | 3 {
  if (TIER1_TYPES.some(t => sameTrade(category, t))) return 1;
  if (TIER2_TYPES.some(t => sameTrade(category, t))) return 2;
  return 3;
}

/** How many businesses the call list shows at once. */
export const QUEUE_SIZE = 5;

export type CallStatus = "queued" | "subscriber" | "dismissed";

/** Search targeting: "none" = no website yet (rebuild leads), "has" = website exists (turnover/rebrand leads), "any" = random mix. */
export type WebsiteFilter = "any" | "none" | "has";

export const matchesWebsiteFilter = (website: string, filter: WebsiteFilter): boolean =>
  filter === "any" || (filter === "none" ? !website.trim() : Boolean(website.trim()));

export type QueueRow = { status: CallStatus; called_at: string | null; found_at: string; website?: string; website_status?: import("./website-check").WebsiteStatus; callback_at?: string | null; no_answer_at?: string | null };

/** A call-back must always carry a reason; clearing a schedule needs no reason. */
export const callbackScheduleSchema = z
  .object({
    id: z.string().uuid(),
    callback_at: z.string().datetime().nullable(),
    callback_reason: z.string().trim().max(500).default(""),
  })
  .refine(d => !d.callback_at || d.callback_reason.length > 0, { message: "Please add the reason for this call-back." });

/** True while the call-back time is still in the future (used to label a call-back "due now" once it passes). */
export const isCallbackPending = (r: Pick<QueueRow, "callback_at">, now: number = Date.now()): boolean =>
  Boolean(r.callback_at) && new Date(r.callback_at!).getTime() > now;

/**
 * A scheduled call-back stays on the scheduler's Call-backs list, even after its time passes,
 * until a call outcome (Called / Subscriber / No call list) or an explicit cancel clears it.
 */
export const hasCallback = (r: Pick<QueueRow, "callback_at">): boolean => Boolean(r.callback_at);

/** Call-backs belong to the teammate who set them; only they and the admin may see them. */
export const visibleCallbackRows = <T extends Pick<QueueRow, "callback_at"> & { callback_by?: string | null }>(
  rows: T[], userId: string, isAdmin: boolean,
): T[] => isAdmin ? rows : rows.filter(r => !hasCallback(r) || r.callback_by === userId);

/**
 * The working queue: queued businesses that haven't been called yet,
 * newest first so a fresh search shows up on top; skips are ordered separately.
 * Scheduled call-backs live in the Call-backs list instead.
 */
export const callQueue = <T extends QueueRow>(rows: T[], filter: WebsiteFilter = "any") =>
  rows
    .filter(r => r.status === "queued" && !r.called_at && r.website_status !== "unchecked" && !hasCallback(r) && !r.no_answer_at && matchesWebsiteFilter(r.website ?? "", filter))
    // One search saves many businesses with the same found_at; break ties by id so a refresh never reshuffles the cards.
    .sort((a, b) => b.found_at.localeCompare(a.found_at) || String((a as { id?: string }).id ?? "").localeCompare(String((b as { id?: string }).id ?? "")));

/** Show the next five distinct businesses: Tier 1 first, then Tier 2, with skipped rows at the back. */
export function upcomingCalls<T extends QueueRow & { id: string; category?: string }>(queue: T[], skipped: string[]) {
  const order = new Map(skipped.map((id, index) => [id, index]));
  return [...queue].sort((a, b) =>
    (order.get(a.id) ?? -1) - (order.get(b.id) ?? -1) || tierOf(a.category ?? "") - tierOf(b.category ?? "")
  ).slice(0, QUEUE_SIZE);
}

/** Shared No Answer pool: unanswered businesses waiting to be returned to the queue, oldest attempt first. */
export const noAnswerPool = <T extends QueueRow>(rows: T[]) =>
  rows.filter(r => r.status === "queued" && !r.called_at && !hasCallback(r) && Boolean(r.no_answer_at))
    .sort((a, b) => a.no_answer_at!.localeCompare(b.no_answer_at!));

/** Subscribers stay on the board; dismissed businesses are hidden from everyone. */
export const subscribers = <T extends QueueRow>(rows: T[]) => rows.filter(r => r.status === "subscriber");

/** Google's category names often differ from the word a teammate types (coffee → Cafe, espresso bar). */
const TRADE_ALIASES: Record<string, string[]> = {
  coffee: ["cafe", "espresso", "coffeehouse", "roastery"],
  cafe: ["coffee", "espresso"],
  plumber: ["plumbing"],
  electrician: ["electrical"],
  hvac: ["heating", "air conditioning"],
  restaurant: ["diner", "eatery", "bistro", "grill", "pizzeria"],
  barber: ["barbershop"],
  gym: ["fitness"],
  dentist: ["dental"],
  lawyer: ["attorney"],
  realtor: ["real estate"],
};

/**
 * Loose trade match so what a teammate types ("coffee", "plumber") matches the
 * category Google saved on the row ("Cafe", "Plumbing contractor").
 */
export function sameTrade(category: string, filter: string): boolean {
  const cat = category.toLowerCase();
  const fil = filter.toLowerCase().trim();
  if (!fil) return true;
  if (cat.includes(fil) || (cat.length >= 3 && fil.includes(cat))) return true;
  const stop = new Set(["services", "service", "company", "local", "the", "and", "shop", "shops", "store", "co"]);
  const stems = (v: string) =>
    v.toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 3 && !stop.has(w));
  const expand = (words: string[]) => words.flatMap(w => [w, ...(TRADE_ALIASES[w] ?? [])]).map(w => w.slice(0, 5));
  const f = expand(stems(filter));
  const c = expand(stems(category));
  if (!f.length) return cat.includes(fil);
  return f.some(x => c.some(y => y.startsWith(x) || x.startsWith(y)));
}

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

