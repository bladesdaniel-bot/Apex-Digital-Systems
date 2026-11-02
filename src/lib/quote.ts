// Browser-safe quote math shared by the quote builder, payment page and checkout.
import { packages } from "@/lib/offers";
export type Addon = { name: string; price: number; cadence?: "one_time" | "monthly" | undefined; category?: "service" | "ad_budget" | "extra_minutes" | "extra_hours" | undefined };
export type DiscountType = "none" | "amount" | "percent";

export const QUOTE_PACKAGES = packages
  .filter(p => p.amount !== undefined || p.custom)
  .map(p => ({ name: p.group === "Talking websites" ? `${p.name} (setup)` : p.name, price: p.amount ?? 0, from: p.from, features: p.features, monthlyAmount: p.monthlyAmount }));
export const QUOTE_MEMBERSHIPS = packages
  .filter(p => p.monthlyAmount !== undefined)
  .map(p => ({ name: p.name, price: p.monthlyAmount ?? 0, features: p.features }));
/** Extra talk minutes beyond a Talking Website plan, in dollars per minute. */
export const EXTRA_TALK_MINUTE_PRICE = 0.25;
export const MAX_INSTALLMENTS = 4;
export const ADS_OFFER = packages.find(p => p.name === "Google and YouTube Ads");
export const QUOTE_ADDON_OPTIONS = [
  { name: ADS_OFFER?.name ?? "Google and YouTube Ads", price: ADS_OFFER?.monthlyAmount ?? 150, cadence: "monthly" as const, category: "service" as const },
  { name: "Prepaid advertising budget", price: 0, cadence: "monthly" as const, category: "ad_budget" as const },
];
export const isCommissionableAddon = (a: Addon) => !a.category || a.category === "service";

export type QuoteInput = {
  package_price: number;
  addons: Addon[];
  membership_price: number;
  discount_type: DiscountType;
  discount_value: number;
  installments: number;
  /** Membership starts with a 30-day free trial instead of billing on day one. */
  membership_free_month?: boolean;
};

const cents = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100);

/** Totals in cents. Promos apply to the one-time part only, never below $0. */
export function quoteTotals(q: QuoteInput) {
  const subtotal = cents(q.package_price) + q.addons.filter(a => a.cadence !== "monthly").reduce((s, a) => s + cents(a.price), 0);
  let discount = 0;
  if (q.discount_type === "amount") discount = cents(q.discount_value);
  if (q.discount_type === "percent") discount = Math.round(subtotal * Math.min(Math.max(q.discount_value, 0), 100) / 100);
  discount = Math.min(Math.max(discount, 0), subtotal);
  const oneTime = subtotal - discount;
  const n = Math.min(Math.max(Math.floor(q.installments) || 1, 1), MAX_INSTALLMENTS);
  const base = Math.floor(oneTime / n);
  // Leftover cents go on the first payment so the parts always add up exactly.
  const parts = Array.from({ length: n }, (_, i) => base + (i === 0 ? oneTime - base * n : 0));
  const monthlyAddons = q.addons.filter(a => a.cadence === "monthly");
  const membership = cents(q.membership_price) + monthlyAddons.reduce((s, a) => s + cents(a.price), 0);
  const eligibleSubtotal = cents(q.package_price) + q.addons.filter(a => a.cadence !== "monthly" && isCommissionableAddon(a)).reduce((s, a) => s + cents(a.price), 0);
  const commissionableOneTime = subtotal > 0 ? Math.round(oneTime * eligibleSubtotal / subtotal) : 0;
  const commissionableMonthly = cents(q.membership_price) + monthlyAddons.filter(isCommissionableAddon).reduce((s, a) => s + cents(a.price), 0);
  // A trial applies to the main plan, never to prepaid ad spend or ads management.
  const monthlyDueToday = (q.membership_free_month ? 0 : cents(q.membership_price)) + monthlyAddons.reduce((s, a) => s + cents(a.price), 0);
  return { subtotal, discount, oneTime, parts, membership, commissionableOneTime, commissionableMonthly, dueToday: (parts[0] ?? 0) + monthlyDueToday };
}

export const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
