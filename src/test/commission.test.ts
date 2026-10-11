import { describe, it, expect } from "vitest";
import { commissionFor, payPeriodFor } from "@/lib/commission";

describe("commission per sale", () => {
  it("pays 30% when that is more than $300", () => {
    expect(commissionFor(2000)).toBe(600);
  });
  it("pays $300 minimum when 30% is less", () => {
    expect(commissionFor(1200)).toBe(360);
    expect(commissionFor(500)).toBe(300);
  });
  it("$1,000 sale pays exactly $300", () => {
    expect(commissionFor(1000)).toBe(300);
  });
});

describe("pay periods every 2 weeks", () => {
  it("groups dates into 14-day periods", () => {
    expect(payPeriodFor("2026-10-08")).toEqual({ start: "2026-09-28", end: "2026-10-11" });
    expect(payPeriodFor("2026-10-12")).toEqual({ start: "2026-10-12", end: "2026-10-25" });
  });
});

import { RECURRING_COMMISSION } from "@/lib/commission";
describe("recurring commission", () => {
  it("pays a flat $10 each month", () => { expect(RECURRING_COMMISSION).toBe(10); });
});

import { autoCommissionSale } from "@/lib/commission";
describe("auto commission on quote sales", () => {
  it("prepaid $1,200 quote earns commission on $1,200 ($360)", () => {
    expect(autoCommissionSale(120000)).toBe(1200);
    expect(commissionFor(autoCommissionSale(120000)!)).toBe(360);
  });
  it("$0 order waits for the owner to enter the sale", () => { expect(autoCommissionSale(0)).toBeNull(); });
});
