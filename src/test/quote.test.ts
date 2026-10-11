import { describe, expect, it } from "vitest";
import { quoteTotals } from "@/lib/quote";

const base = { package_price: 1200, addons: [], membership_price: 0, discount_type: "none" as const, discount_value: 0, installments: 1 };

describe("quoteTotals", () => {
  it("adds membership to the first payment of a $1,200 package", () => {
    const t = quoteTotals({ ...base, membership_price: 125 });
    expect(t.dueToday).toBe(132500);
    expect(t.membership).toBe(12500);
  });
  it("includes add-ons and applies an amount promo to the one-time part only", () => {
    const t = quoteTotals({ ...base, addons: [{ name: "Logo", price: 200 }], membership_price: 125, discount_type: "amount", discount_value: 100 });
    expect(t.oneTime).toBe(130000);
    expect(t.membership).toBe(12500);
  });
  it("applies a percent promo", () => {
    expect(quoteTotals({ ...base, discount_type: "percent", discount_value: 10 }).oneTime).toBe(108000);
  });
  it("never discounts below zero", () => {
    expect(quoteTotals({ ...base, discount_type: "amount", discount_value: 5000 }).oneTime).toBe(0);
  });
  it("splits into payments that add up exactly", () => {
    const t = quoteTotals({ ...base, package_price: 1000, installments: 3 });
    expect(t.parts).toEqual([33334, 33333, 33333]);
  });
  it("caps split payments at 4", () => {
    expect(quoteTotals({ ...base, installments: 9 }).parts).toHaveLength(4);
  });
});

describe("first month free", () => {
  it("charges only the $1,200 build today when the $125 membership's first month is free", () => {
    const t = quoteTotals({ ...base, membership_price: 125, membership_free_month: true });
    expect(t.dueToday).toBe(120000);
    expect(t.membership).toBe(12500);
  });
  it("charges only the first $300 split today with a free month", () => {
    const t = quoteTotals({ ...base, membership_price: 125, installments: 4, membership_free_month: true });
    expect(t.dueToday).toBe(30000);
  });
});
