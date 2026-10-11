import { describe, expect, it } from "vitest";
import { NEC_THRESHOLD, taxInfoSchema, yearPayouts } from "@/lib/tax-info";

const base = { legalName: "Jane Doe", taxClassification: "Other", tinType: "SSN", tin: "123-45-6789", address: "1 Main St", city: "Reno", state: "NV", zip: "89501", certify: true } as const;

describe("1099 tax info", () => {
  it("threshold is $600", () => expect(NEC_THRESHOLD).toBe(600));
  it("requires a 9-digit tax ID", () => {
    expect(taxInfoSchema.safeParse(base).success).toBe(true);
    expect(taxInfoSchema.safeParse({ ...base, tin: "12345" }).success).toBe(false);
  });
  it("requires certification", () => expect(taxInfoSchema.safeParse({ ...base, certify: false }).success).toBe(false));
  it("totals only paid commissions by year paid", () => {
    const t = yearPayouts([
      { employee_id: "a", status: "paid", paid_at: "2026-06-01T18:00:00Z", commission_amount: 400 },
      { employee_id: "a", status: "paid", paid_at: "2026-07-01T18:00:00Z", commission_amount: 300 },
      { employee_id: "a", status: "owed", paid_at: null, commission_amount: 999 },
      { employee_id: "a", status: "paid", paid_at: "2027-01-01T18:00:00Z", commission_amount: 50 },
    ], 2026);
    expect(t.get("a")).toBe(700);
  });
});
