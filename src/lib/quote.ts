// Browser-safe quote math shared by the quote builder, payment page and checkout.
export type Addon = { name: string; price: number };
export type DiscountType = "none" | "amount" | "percent";

export const QUOTE_PACKAGES = [
  { name: "Website Launch", price: 1000 },
  { name: "Website Redesign", price: 1000 },
  { name: "SEO Growth Cleanup", price: 399 },
  // App builds are scoped per project, so the caller types the price (0 = not set yet).
  { name: "Custom App Design & Build", price: 0 },
] as const;
export const QUOTE_MEMBERSHIPS = [
  { name: "Website Care Plan", price: 125 },
  { name: "Website Growth & Maintenance", price: 250 },
] as const;
export const MAX_INSTALLMENTS = 4;

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
  const subtotal = cents(q.package_price) + q.addons.reduce((s, a) => s + cents(a.price), 0);
  let discount = 0;
  if (q.discount_type === "amount") discount = cents(q.discount_value);
  if (q.discount_type === "percent") discount = Math.round(subtotal * Math.min(Math.max(q.discount_value, 0), 100) / 100);
  discount = Math.min(Math.max(discount, 0), subtotal);
  const oneTime = subtotal - discount;
  const n = Math.min(Math.max(Math.floor(q.installments) || 1, 1), MAX_INSTALLMENTS);
  const base = Math.floor(oneTime / n);
  // Leftover cents go on the first payment so the parts always add up exactly.
  const parts = Array.from({ length: n }, (_, i) => base + (i === 0 ? oneTime - base * n : 0));
  const membership = cents(q.membership_price);
  return { subtotal, discount, oneTime, parts, membership, dueToday: (parts[0] ?? 0) + (q.membership_free_month ? 0 : membership) };
}

export const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
