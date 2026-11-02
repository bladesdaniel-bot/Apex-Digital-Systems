// Pure pay rules for team commissions.
export const COMMISSION_RATE = 0.3;
/** Share of each successful monthly renewal paid to the rep who made the linked sale. */
export const RECURRING_RATE = 0.25;

/** Commission per one-time sale: 30% of the sale amount, no minimum. */
export function commissionFor(saleAmount: number): number {
  return Math.round(Math.max(0, Number.isFinite(saleAmount) ? saleAmount : 0) * COMMISSION_RATE * 100) / 100;
}

/** Recurring commission on a renewal payment: 25% of the amount paid. */
export function recurringCommissionFor(paidAmount: number): number {
  return Math.round(Math.max(0, Number.isFinite(paidAmount) ? paidAmount : 0) * RECURRING_RATE * 100) / 100;
}

/** Allocate eligible cents across installments without losing rounding pennies. */
export function installmentCommissionBase(parts: number[], eligibleCents: number, installment: number): number {
  const total = parts.reduce((sum, part) => sum + part, 0);
  if (total <= 0 || installment < 1 || installment > parts.length) return 0;
  const before = parts.slice(0, installment - 1).reduce((sum, part) => sum + part, 0);
  const after = before + (parts[installment - 1] ?? 0);
  return Math.round(after * eligibleCents / total) - Math.round(before * eligibleCents / total);
}

/** Invoice line bases are pre-tax and post-discount; only explicitly tagged monthly services qualify. */
export function monthlyInvoiceBase(lines: any[], paidCents: number, invoiceTotal: number): number {
  const eligible = lines.reduce((sum, line) => {
    const meta = line.metadata ?? {};
    if (meta.commission_category !== "monthly_service") return sum;
    const discounts = (line.discount_amounts ?? []).reduce((s: number, d: any) => s + (d.amount ?? 0), 0);
    const base = line.amount_excluding_tax ?? line.amount ?? 0;
    return sum + Math.max(0, base - discounts);
  }, 0);
  const fraction = invoiceTotal > 0 ? Math.min(1, Math.max(0, paidCents) / invoiceTotal) : 0;
  return Math.round(eligible * fraction);
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
