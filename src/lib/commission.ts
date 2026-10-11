// Pure pay rules for team commissions.
export const COMMISSION_RATE = 0.3;
export const COMMISSION_MINIMUM = 300;
/** Flat amount earned each month a linked customer's subscription payment succeeds. */
export const RECURRING_COMMISSION = 10;

/** Commission per sale: the greater of 30% of the sale or $300. */
export function commissionFor(saleAmount: number): number {
  return Math.round(Math.max(saleAmount * COMMISSION_RATE, COMMISSION_MINIMUM) * 100) / 100;
}

// Pay periods run every 2 weeks, starting Monday Jan 5, 2026.
const ANCHOR = Date.UTC(2026, 0, 5);
const DAY = 86_400_000;
const PERIOD_DAYS = 14;

/** Returns the pay period (YYYY-MM-DD start and end, inclusive) containing the given date. */
export function payPeriodFor(dateIso: string): { start: string; end: string } {
  const parts = dateIso.slice(0, 10).split("-").map(Number);
  const t = Date.UTC(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  const idx = Math.floor((t - ANCHOR) / (PERIOD_DAYS * DAY));
  const start = ANCHOR + idx * PERIOD_DAYS * DAY;
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(start + (PERIOD_DAYS - 1) * DAY) };
}

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Sale amount (dollars) that auto-earns commission when a quote's first payment lands; $0 orders wait for the owner to enter one. */
export function autoCommissionSale(oneTimeCents: number): number | null {
  return oneTimeCents > 0 ? oneTimeCents / 100 : null;
}
