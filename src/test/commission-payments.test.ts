import { describe, expect, it } from "vitest";
import { creditQuoteInstallment } from "@/lib/commission-payments.server";

function fakeDb({ paid = 4, legacy = false, zero = false } = {}) {
  const commissions: any[] = [];
  const q = { id: "order", created_by: "rep", call_list_id: null, business_name: "Test", package_name: "Starter Site", package_price: zero ? 0 : 1000, membership_price: 125, discount_value: 0, discount_type: "none", addons: [], installments: 4, installments_paid: paid, status: "partially_paid" };
  const db = { from(table: string) {
    const b: any = { select: () => b, eq: () => b, is: () => b, update: () => b,
      maybeSingle: async () => ({ data: table === "quotes" ? q : legacy ? { id: "legacy" } : null }),
      then: (resolve: any) => resolve({ error: null }),
      insert: async (row: any) => {
        if (commissions.some(c => c.order_quote_id === row.order_quote_id && c.installment_number === row.installment_number)) return { error: { code: "23505" } };
        commissions.push(row); return { error: null };
      },
    }; return b;
  } };
  return { db, commissions };
}
describe("settled installment commission integration", () => {
  it("records four payments at $75 each, with duplicate deliveries producing no extra earnings", async () => {
    const { db, commissions } = fakeDb();
    for (const part of [1, 1, 2, 3, 4, 4]) await creditQuoteInstallment(db, "order", part, `invoice-${part}`);
    expect(commissions.map(c => c.commission_amount)).toEqual([75, 75, 75, 75]);
    expect(commissions.map(c => c.employee_id)).toEqual(["rep", "rep", "rep", "rep"]);
  });
  it("never credits an uncollected installment", async () => {
    const { db, commissions } = fakeDb({ paid: 1 });
    await creditQuoteInstallment(db, "order", 2);
    expect(commissions).toHaveLength(0);
  });
  it("preserves prior whole-order commission without duplicating it", async () => {
    const { db, commissions } = fakeDb({ legacy: true });
    await creditQuoteInstallment(db, "order", 1);
    expect(commissions).toHaveLength(0);
  });
  it("does not create a one-time commission for monthly-only orders", async () => {
    const { db, commissions } = fakeDb({ zero: true });
    await creditQuoteInstallment(db, "order", 1);
    expect(commissions).toHaveLength(0);
  });
});