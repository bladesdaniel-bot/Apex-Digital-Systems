import { OWNER_EMAIL } from "@/lib/owner-email";
// Server-only: saves the customer's card on a quote and charges later installments automatically.
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "./stripe.server";
import { quoteTotals, usd } from "./quote";
import { afterFailedCharge, nextInstallmentAt } from "./installments";

const idOf = (v: any): string => (typeof v === "string" ? v : v?.id ?? "");

/** Called from the webhook after a checkout payment: remembers the card and schedules the next part. */
export async function saveCardAndSchedule(db: any, env: StripeEnv, quoteId: string, session: any) {
  const { data: q } = await db.from("quotes").select("installments, installments_paid").eq("id", quoteId).maybeSingle();
  if (!q) return;
  const stripe = createStripeClient(env);
  let pm = "";
  try {
    if (session.payment_intent) pm = idOf((await stripe.paymentIntents.retrieve(idOf(session.payment_intent))).payment_method);
    else if (session.subscription) pm = idOf((await stripe.subscriptions.retrieve(idOf(session.subscription))).default_payment_method);
  } catch (e) {
    console.error("Couldn't read saved card:", getStripeErrorMessage(e));
  }
  const next = nextInstallmentAt(new Date(), q.installments_paid, q.installments);
  await db.from("quotes").update({
    stripe_env: env,
    stripe_customer_id: idOf(session.customer),
    ...(pm && { stripe_payment_method_id: pm }),
    next_installment_at: next ? next.toISOString() : null,
    installment_failures: 0,
    last_charge_error: "",
  }).eq("id", quoteId);
}

async function alertOwner(title: string, intro: string, lines: { label: string; value: string }[], key: string) {
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("team-alert", OWNER_EMAIL, {
      idempotencyKey: key,
      templateData: { title, intro, lines, link: "https://apexdigitalsystems.org/team/orders", linkLabel: "Open orders" },
    });
  } catch (e) {
    console.error("Owner alert failed:", e instanceof Error ? e.message : e);
  }
}

/** Charges the next unpaid part of a quote to its saved card. Safe to call repeatedly. */
export async function chargeNextInstallment(db: any, quoteId: string): Promise<{ ok: true; charged: string } | { error: string }> {
  const { data: q } = await db.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (!q) return { error: "Order not found." };
  if (q.status === "canceled" || q.refunded_at) return { error: "This order was canceled or refunded." };
  if (!q.stripe_customer_id || !q.stripe_payment_method_id || (q.stripe_env !== "sandbox" && q.stripe_env !== "live")) return { error: "No saved card on this order." };
  const t = quoteTotals({ ...q, package_price: Number(q.package_price), membership_price: Number(q.membership_price), discount_value: Number(q.discount_value) });
  const next = q.installments_paid + 1;
  const cents = t.parts[next - 1] ?? 0;
  if (next > t.parts.length || cents <= 0) {
    await db.from("quotes").update({ next_installment_at: null }).eq("id", quoteId);
    return { error: "Nothing left to charge on this order." };
  }
  // Push the due date forward first so overlapping runs can't charge the same part twice.
  await db.from("quotes").update({ next_installment_at: new Date(Date.now() + 86_400_000).toISOString() }).eq("id", quoteId);

  const stripe = createStripeClient(q.stripe_env as StripeEnv);
  const label = `${q.package_name || "Package"} — payment ${next} of ${t.parts.length} — ${q.business_name}`;
  const metadata = { quote_id: q.id, installment: String(next) };
  const key = `quote-${q.id}-part-${next}-try-${q.installment_failures}`;
  let settledInvoice: string | null = null;
  try {
    const create = (withTax: boolean) => stripe.invoices.create({
      customer: q.stripe_customer_id, collection_method: "charge_automatically", auto_advance: false,
      default_payment_method: q.stripe_payment_method_id, description: label, metadata,
      ...(withTax && { automatic_tax: { enabled: true } }),
    }, { idempotencyKey: `${key}-inv-${withTax ? "tax" : "notax"}` });
    let invoice;
    try { invoice = await create(true); } catch (e) {
      if (q.stripe_env === "sandbox" && /head office address|tax/i.test(getStripeErrorMessage(e))) invoice = await create(false);
      else throw e;
    }
    await stripe.invoiceItems.create({ customer: q.stripe_customer_id, invoice: invoice.id, amount: cents, currency: "usd", description: label, metadata }, { idempotencyKey: `${key}-item` });
    if (!invoice.id) throw new Error("Couldn't create the installment invoice.");
    await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: false });
    const paid = await stripe.invoices.pay(invoice.id, { payment_method: q.stripe_payment_method_id });
    if (paid.status !== "paid") throw new Error("The card payment didn't go through.");
    settledInvoice = paid.id;
    await markInstallmentPaid(db, q.id, next, paid.id);
    await saveQuoteReceipt(db, q.stripe_env as StripeEnv, q.id, next, { invoiceId: paid.id });
    return { ok: true, charged: usd(cents) };
  } catch (e) {
    const message = getStripeErrorMessage(e);
    if (settledInvoice) {
      // Money already cleared: the signed invoice webhook retries persistence, not charging.
      await db.from("quotes").update({ last_charge_error: `Payment collected; awaiting reconciliation: ${message}`.slice(0, 300), next_installment_at: null }).eq("id", q.id);
      await alertOwner("Payment collected — reconciliation needed", "Do not charge again. The paid invoice will retry saving the order and commission.", [{ label: "Invoice", value: settledInvoice }, { label: "Order", value: q.business_name }], `${key}-reconcile`);
      return { error: "Payment collected; order reconciliation is pending. Do not charge again." };
    }
    const { failures, retryAt } = afterFailedCharge(new Date(), q.installment_failures);
    await db.from("quotes").update({ installment_failures: failures, next_installment_at: retryAt ? retryAt.toISOString() : null, last_charge_error: message.slice(0, 300) }).eq("id", q.id);
    await alertOwner(
      `Payment declined: ${q.business_name}`,
      retryAt ? "We'll try the card again automatically." : "Automatic retries have stopped. Please contact the customer.",
      [{ label: "Payment", value: `${next} of ${t.parts.length} — ${usd(cents)}` }, { label: "Reason", value: message }, { label: "Next try", value: retryAt ? retryAt.toDateString() : "None" }],
      `${key}-declined`,
    );
    return { error: message };
  }
}

/** Records a paid part once; schedules the next one. */
export async function markInstallmentPaid(db: any, quoteId: string, installment: number, paymentRef?: string) {
  const { data: q } = await db.from("quotes").select("installments, installments_paid").eq("id", quoteId).maybeSingle();
  if (!q || installment < 1 || installment > q.installments) return;
  if (installment <= q.installments_paid) {
    const { creditQuoteInstallment } = await import("./commission-payments.server");
    await creditQuoteInstallment(db, quoteId, installment, paymentRef);
    return;
  }
  if (installment !== q.installments_paid + 1) throw new Error("Earlier installment must settle first.");
  const paid = Math.min(installment, q.installments);
  const next = nextInstallmentAt(new Date(), paid, q.installments);
  const { error } = await db.from("quotes").update({
    installments_paid: paid, status: paid >= q.installments ? "paid" : "partially_paid",
    next_installment_at: next ? next.toISOString() : null, installment_failures: 0, last_charge_error: "",
  }).eq("id", quoteId).eq("installments_paid", q.installments_paid);
  if (error) throw error;
  const { creditQuoteInstallment } = await import("./commission-payments.server");
  await creditQuoteInstallment(db, quoteId, installment, paymentRef);
}

/** Charges every part that is due now. */
export async function chargeDueInstallments(db: any) {
  const { data } = await db.from("quotes").select("id").lte("next_installment_at", new Date().toISOString()).eq("status", "partially_paid").limit(50);
  const results = [];
  for (const row of data ?? []) results.push({ id: row.id, ...(await chargeNextInstallment(db, row.id)) });
  return results;
}

export { alertOwner };

/** Saves the official receipt/invoice for a paid quote part so the customer portal can show it. */
export async function saveQuoteReceipt(db: any, env: StripeEnv, quoteId: string, installment: number, ref: { invoiceId?: string; paymentIntentId?: string }) {
  try {
    const stripe = createStripeClient(env);
    let row: { amount: number; invoice_number: string; receipt_url: string; pdf_url: string; stripe_ref: string } | null = null;
    if (ref.invoiceId) {
      const inv: any = await stripe.invoices.retrieve(ref.invoiceId);
      row = { amount: (inv.amount_paid ?? 0) / 100, invoice_number: inv.number ?? "", receipt_url: inv.hosted_invoice_url ?? "", pdf_url: inv.invoice_pdf ?? "", stripe_ref: inv.id };
    } else if (ref.paymentIntentId) {
      const pi: any = await stripe.paymentIntents.retrieve(ref.paymentIntentId, { expand: ["latest_charge"] });
      const ch = pi.latest_charge;
      row = { amount: (pi.amount_received ?? 0) / 100, invoice_number: "", receipt_url: ch?.receipt_url ?? "", pdf_url: "", stripe_ref: pi.id };
    }
    if (!row || (!row.receipt_url && !row.pdf_url)) return;
    const { error } = await db.from("quote_receipts").insert({ quote_id: quoteId, installment, ...row });
    if (error && error.code !== "23505") throw error;
    if (!error) {
      const { logClientActivity } = await import("./client-portal.server");
      await logClientActivity(db, quoteId, "receipt", `Payment of ${usd(Math.round(row.amount * 100))} received — receipt saved to your account`, "Apex Digital Systems");
    }
  } catch (e) {
    console.error("Couldn't save receipt:", getStripeErrorMessage(e));
  }
}
