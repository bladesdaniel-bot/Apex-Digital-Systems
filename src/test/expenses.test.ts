import { describe, expect, it } from "vitest";
import { expensesCsv, summarizeExpenses } from "@/lib/expenses";

describe("company expenses", () => {
  it("splits general company spend from per-app build cost", () => {
    const s = summarizeExpenses([
      { amount: 99.99, allocation: "general", project: "" },
      { amount: 25, allocation: "project", project: "BMI Calculator" },
      { amount: 10.5, allocation: "project", project: "BMI Calculator" },
      { amount: 40, allocation: "project", project: "AI Reader" },
    ]);
    expect(s.total).toBe(17549);
    expect(s.general).toBe(9999);
    expect(s.projects).toBe(7550);
    expect(s.perProject).toEqual([{ name: "AI Reader", cents: 4000 }, { name: "BMI Calculator", cents: 3550 }]);
  });

  it("escapes commas in the yearly CSV", () => {
    const csv = expensesCsv([{ id: "1", expense_date: "2026-10-10", vendor: "Acme, Inc", amount: 5, allocation: "general", project: "", category: "Other", description: "", receipt_path: "", created_at: "" }]);
    expect(csv.split("\n")[1]).toBe('2026-10-10,"Acme, Inc",5.00,General company,,Other,');
  });
});
