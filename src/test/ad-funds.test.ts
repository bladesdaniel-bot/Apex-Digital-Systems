import { expect, it } from "vitest";
import { adFundBalance, validAdFundAmount } from "@/lib/ad-funds";

it("counts only paid deposits in the prepaid balance", () => {
  expect(adFundBalance([{ amount: 500, status: "paid" }, { amount: 250, status: "pending" }, { amount: 100, status: "paid" }])).toBe(600);
});
it("accepts $25 to $25,000 in whole cents only", () => {
  expect(validAdFundAmount(25)).toBe(true);
  expect(validAdFundAmount(24.99)).toBe(false);
  expect(validAdFundAmount(25001)).toBe(false);
  expect(validAdFundAmount(100.005)).toBe(false);
});
