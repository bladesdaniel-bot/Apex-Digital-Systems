import { commissionFor, installmentCommissionBase } from "./commission";
import { quoteTotals } from "./quote";

export async function quoteRep(db: any, q: any): Promise<string | null> {
  if (q.call_list_id) {
    const { data } = await db.from("call_list").select("rep_id").eq("id", q.call_list_id).maybeSingle();
    if (data?.rep_id) return data.rep_id;
  }
  return q.created_by ?? null;
}

/** Called only after settlement; separate immutable accrual per installment, retry-safe. */
export async function creditQuoteInstallment(db: any, quoteId: string, installment: number, paymentRef?: string) {
  const { data: q, error: readError } = await db.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (readError) throw readError;
  if (!q || q.status === "canceled" || q.refunded_at || installment > q.installments_paid) return;
  // Old whole-order/manual commissions are retained; never duplicate their credit.
  const { data: legacy, error: legacyError } = await db.from("commissions").select("id").eq("quote_id", quoteId).eq("kind", "sale").maybeSingle();
  if (legacyError) throw legacyError;
  if (legacy) return;
  const totals = quoteTotals({ ...q, package_price: Number(q.package_price), membership_price: Number(q.membership_price), discount_value: Number(q.discount_value) });
  const base = installmentCommissionBase(totals.parts, totals.commissionableOneTime, installment);
  if (base <= 0) return;
  if (paymentRef) {
    const { error: linkError } = await db.from("commissions").update({ payment_ref: paymentRef }).eq("order_quote_id", quoteId).eq("installment_number", installment).is("payment_ref", null);
    if (linkError) throw linkError;
  }
  const rep = await quoteRep(db, q);
  if (!rep) throw new Error("No sales rep on this paid order.");
  const { error } = await db.from("commissions").insert({
    employee_id: rep, customer_name: q.business_name, order_quote_id: quoteId, installment_number: installment,
    payment_ref: paymentRef ?? null, kind: "sale", description: `${q.package_name || "Custom order"} — paid installment ${installment} of ${totals.parts.length} (30%)`,
    sale_amount: base / 100, commission_amount: commissionFor(base / 100), sale_date: new Date().toISOString().slice(0, 10),
  });
  if (error && error.code !== "23505") throw error;
}