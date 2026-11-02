import { expect, it } from "vitest";
import { quoteTotals, QUOTE_ADDON_OPTIONS, QUOTE_MEMBERSHIPS } from "@/lib/quote";

it("embeds the $150 ads management plan in orders", () => {
  expect(QUOTE_MEMBERSHIPS.find(p => p.name === "Google and YouTube Ads")?.price).toBe(150);
  expect(QUOTE_ADDON_OPTIONS[0]?.price).toBe(150);
});
it("bills Care, Ads management and budget together but commissions only services", () => {
  const totals = quoteTotals({ package_price: 1000, membership_price: 125, addons: [{ name: "Ads", price: 150, cadence: "monthly", category: "service" }, { name: "Budget", price: 500, cadence: "monthly", category: "ad_budget" }], discount_type: "none", discount_value: 0, installments: 4 });
  expect(totals.parts).toEqual([25000, 25000, 25000, 25000]);
  expect(totals.membership).toBe(77500);
  expect(totals.commissionableMonthly).toBe(27500);
  expect(totals.dueToday).toBe(102500);
});