import { describe, it, expect } from "vitest";
import { commissionFor, recurringCommissionFor, payPeriodFor, autoCommissionSale, installmentCommissionBase, monthlyInvoiceBase } from "@/lib/commission";

describe("commission", () => {
  it("pays 30% of a one-time sale", () => {
    expect(commissionFor(1000)).toBe(300);
    expect(commissionFor(399)).toBe(119.7);
  });
  it("pays 25% of each recurring monthly payment", () => {
    expect(recurringCommissionFor(125)).toBe(31.25);
    expect(recurringCommissionFor(250)).toBe(62.5);
  });
  it("auto-commission uses the paid one-time amount", () => {
    expect(commissionFor(autoCommissionSale(120000) ?? 0)).toBe(360);
    expect(autoCommissionSale(0)).toBeNull();
  });
  it("pay periods are 14 days", () => {
    expect(payPeriodFor("2026-01-05")).toEqual({ start: "2026-01-05", end: "2026-01-18" });
  });
});

describe("collected payment rules", () => {
  it("credits four $250 payments separately at $75 each, not $300 upfront", () => {
    expect([1, 2, 3, 4].map(n => commissionFor(installmentCommissionBase([25000, 25000, 25000, 25000], 100000, n) / 100))).toEqual([75, 75, 75, 75]);
  });
  it.each([[1000, 300], [1750, 525], [2500, 750], [750, 225], [399, 119.7], [500, 150]])("pays 30%% on $%s one-time services", (amount, pay) => expect(commissionFor(amount)).toBe(pay));
  it.each([[125, 31.25], [250, 62.5], [199, 49.75], [279, 69.75], [349, 87.25], [150, 37.5]])("pays 25%% on $%s monthly services", (amount, pay) => expect(recurringCommissionFor(amount)).toBe(pay));
  it("excludes $500 ad budget and tax from the $150 management commission", () => {
    const base = monthlyInvoiceBase([{ amount: 15000, metadata: { commission_category: "monthly_service" } }, { amount: 50000, metadata: { commission_category: "excluded" } }], 70000, 70000);
    expect(recurringCommissionFor(base / 100)).toBe(37.5);
  });
  it("credits nothing for a free month", () => expect(monthlyInvoiceBase([{ amount: 12500, metadata: { commission_category: "monthly_service" } }], 0, 12500)).toBe(0));
});
