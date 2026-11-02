import { describe, expect, it } from "vitest";
import { needsOrderDetails, noPackageFields, orderBusinessName } from "@/lib/order-draft";

describe("blank unpaid orders", () => {
  it("accepts a blank business name while retaining its length limit", () => {
    expect(orderBusinessName.parse("   ")).toBe("");
    expect(orderBusinessName.safeParse("a".repeat(201)).success).toBe(false);
  });
  it("clears the package and its price when no package is selected", () => {
    expect(Object.assign({ package_name: "Website", package_price: 1000, package_details: "Details" }, noPackageFields)).toEqual({ package_name: "", package_price: 0, package_details: "" });
  });
  it("keeps incomplete orders in Holding rather than marking them ready", () => {
    const order = { business_name: "", package_name: "", membership_name: "", addons: [] };
    expect(needsOrderDetails(order)).toBe(true);
    expect(needsOrderDetails({ ...order, business_name: "Customer" })).toBe(true);
    expect(needsOrderDetails({ ...order, business_name: "Customer", package_name: "Website" })).toBe(false);
  });
});