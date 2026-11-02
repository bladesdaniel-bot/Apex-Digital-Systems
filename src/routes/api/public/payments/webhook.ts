import { monthlyInvoiceBase, recurringCommissionFor } from "@/lib/commission";
import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook, createStripeClient } from "@/lib/stripe.server";
import {
  billingCycleFromInterval,
  centsToDollars,
  isoDate,
  memberStatusFromSubscription,
  type MemberStatus,
} from "@/lib/member-sync";

// Keeps the private members/payments tables in sync with billing events,
// including cancellations and card updates made in the customer portal.

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type MemberFields = {
  plan_name?: string;
  plan_price?: number;
  billing_cycle?: string;
  status?: MemberStatus;
  next_billing_date?: string | null;
};

// Find the member by Stripe customer id (or email), creating one if needed.
async function upsertMember(env: StripeEnv, customerId: string, fields: MemberFields): Promise<string | null> {
  const db = await admin();
  const { data: existing } = await db.from("members").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  if (existing) {
    await db.from("members").update(fields).eq("id", existing.id);
    return existing.id;
  }

  const stripe = createStripeClient(env);
  const customer = await stripe.customers.retrieve(customerId);
  if ("deleted" in customer && customer.deleted) return null;
  const email = (customer.email ?? "").toLowerCase();

  if (email) {
    const { data: byEmail } = await db.from("members").select("id").ilike("email", email).is("stripe_customer_id", null).limit(1).maybeSingle();
    if (byEmail) {
      await db.from("members").update({ ...fields, stripe_customer_id: customerId }).eq("id", byEmail.id);
      return byEmail.id;
    }
  }

  const { data: created, error } = await db
    .from("members")
    .insert({
      full_name: customer.name || email || "Unnamed customer",
      email,
      phone: customer.phone ?? "",
      stripe_customer_id: customerId,
      ...fields,
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function recordPayment(memberId: string, row: {
  amount: number; currency: string; status: "paid" | "failed" | "refunded";
  stripe_payment_id: string | null; stripe_invoice_id: string | null; description: string; payment_date: string;
}) {
  const db = await admin();
  const key = row.stripe_invoice_id ? "stripe_invoice_id" : "stripe_payment_id";
  const value = row.stripe_invoice_id ?? row.stripe_payment_id;
  if (value) {
    const { data: existing } = await db.from("payments").select("id").eq(key, value).eq("status", row.status).maybeSingle();
    if (existing) return;
  }
  await db.from("payments").insert({ member_id: memberId, ...row });
}

function customerIdOf(obj: any): string | null {
  const c = obj?.customer;
  return typeof c === "string" ? c : c?.id ?? null;
}

async function handleSubscription(sub: any, env: StripeEnv, deleted: boolean) {
  const customerId = customerIdOf(sub);
  if (!customerId) return;
  const item = sub.items?.data?.[0];
  const price = item?.price;
  let planName = price?.nickname ?? "";
  if (!planName && price?.product) {
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const product = await createStripeClient(env).products.retrieve(productId);
    planName = product.name;
  }
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  await upsertMember(env, customerId, {
    plan_name: planName,
    plan_price: centsToDollars(price?.unit_amount),
    billing_cycle: billingCycleFromInterval(price?.recurring?.interval),
    status: deleted ? "canceled" : memberStatusFromSubscription(sub.status),
    next_billing_date: deleted || sub.cancel_at_period_end ? null : isoDate(periodEnd),
  });
}

async function handleInvoice(inv: any, env: StripeEnv, paid: boolean) {
  const customerId = customerIdOf(inv);
  if (!customerId) return;
  const memberId = await upsertMember(env, customerId, paid ? {} : { status: "past_due" });
  if (!memberId) return;
  const line = inv.lines?.data?.[0];
  await recordPayment(memberId, {
    amount: centsToDollars(paid ? inv.amount_paid : inv.amount_due),
    currency: inv.currency ?? "usd",
    status: paid ? "paid" : "failed",
    stripe_payment_id: null,
    stripe_invoice_id: inv.id ?? null,
    description: line?.description ?? inv.description ?? "Subscription payment",
    payment_date: new Date((inv.created ?? Date.now() / 1000) * 1000).toISOString(),
  });
  if (paid && inv.id && inv.amount_paid > 0) {
    if (inv.metadata?.quote_id && inv.metadata?.installment) {
      const db = await admin();
      const { markInstallmentPaid, saveQuoteReceipt } = await import("@/lib/installments.server");
      await markInstallmentPaid(db, inv.metadata.quote_id, Number(inv.metadata.installment), inv.id);
      await saveQuoteReceipt(db, env, inv.metadata.quote_id, Number(inv.metadata.installment), { invoiceId: inv.id });
    }
    await creditRecurring(memberId, inv, env);
  }
}

/** Each successful monthly renewal pays the employee(s) who made the linked sale 25% of the renewal. */
async function creditRecurring(memberId: string, inv: any, env: StripeEnv) {
  const db: any = await admin();
  const stripe = createStripeClient(env);
  const groups = new Map<string, any[]>();
  for await (const line of stripe.invoices.listLineItems(inv.id, { limit: 100 })) {
    const l: any = line;
    const productId = l.price?.product ?? l.pricing?.price_details?.product;
    let meta = l.metadata ?? {};
    if (productId) {
      const product: any = typeof productId === "string" ? await stripe.products.retrieve(productId) : productId;
      meta = { ...meta, ...product.metadata };
    }
    // Existing subscription products lack tags: match the saved plan, not unrelated invoice charges.
    let quoteId = meta.quote_id ?? inv.parent?.subscription_details?.metadata?.quote_id ?? inv.subscription_details?.metadata?.quote_id;
    if (!quoteId) {
      const subId = typeof inv.subscription === "string" ? inv.subscription : inv.parent?.subscription_details?.subscription;
      if (subId) quoteId = (await stripe.subscriptions.retrieve(subId)).metadata?.["quote_id"];
    }
    if (!quoteId) continue;
    if (!meta.commission_category) {
      const { data: q } = await db.from("quotes").select("membership_price").eq("id", quoteId).maybeSingle();
      const isRecurring = l.type === "subscription" || l.parent?.type === "subscription_item_details";
      const amount = l.amount_excluding_tax ?? l.amount ?? 0;
      if (isRecurring && q && amount > 0 && amount <= Math.round(Number(q.membership_price) * 100)) meta.commission_category = "monthly_service";
    }
    const xs = groups.get(quoteId) ?? []; xs.push({ ...l, metadata: meta }); groups.set(quoteId, xs);
  }
  const { quoteRep } = await import("@/lib/commission-payments.server");
  for (const [quoteId, lines] of groups) {
    const amount = monthlyInvoiceBase(lines, inv.amount_paid, inv.total);
    if (amount <= 0) continue;
    const { data: q, error: readError } = await db.from("quotes").select("*").eq("id", quoteId).maybeSingle();
    if (readError) throw readError;
    if (!q) throw new Error("Paid subscription order not found.");
    const rep = await quoteRep(db, q);
    if (!rep) throw new Error("Paid subscription sales rep not found.");
    const { error } = await db.from("commissions").insert({
      employee_id: rep, customer_name: q.business_name, kind: "recurring", order_quote_id: quoteId,
      description: "Paid monthly services (25%; tax and ad budget excluded)", sale_amount: centsToDollars(amount),
      commission_amount: recurringCommissionFor(centsToDollars(amount)), member_id: memberId, stripe_invoice_id: inv.id,
      sale_date: new Date((inv.created ?? Date.now() / 1000) * 1000).toISOString().slice(0, 10),
    });
    if (error && error.code !== "23505") throw error;
  }
}

async function handleOneTimeCheckout(session: any, env: StripeEnv) {
  if (session.mode !== "payment" || session.payment_status === "unpaid") return;
  const customerId = customerIdOf(session);
  if (!customerId) return;
  const stripe = createStripeClient(env);
  const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
  const description = items.data[0]?.description ?? "One-time purchase";
  // A later part of a split payment must not overwrite the customer's plan (e.g. their monthly membership).
  const laterPart = Number(session.metadata?.installment) > 1;
  const memberId = await upsertMember(env, customerId, laterPart ? {} : {
    plan_name: description,
    plan_price: centsToDollars(session.amount_total),
    billing_cycle: "one-time",
    status: "active",
  });
  if (!memberId) return;
  const pi = session.payment_intent;
  await recordPayment(memberId, {
    amount: centsToDollars(session.amount_total),
    currency: session.currency ?? "usd",
    status: "paid",
    stripe_payment_id: typeof pi === "string" ? pi : pi?.id ?? session.id,
    stripe_invoice_id: null,
    description,
    payment_date: new Date().toISOString(),
  });
}

/** Marks the paid part of a team quote, saves the card for later parts, and ties the sale to the customer. */
async function handleQuotePaid(session: any, env: StripeEnv) {
  const quoteId = session?.metadata?.quote_id;
  const installment = Number(session?.metadata?.installment);
  if (!quoteId || !installment || (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")) return;
  const db: any = await admin();
  const { markInstallmentPaid, saveCardAndSchedule } = await import("@/lib/installments.server");
  const paymentRef = typeof session.invoice === "string" ? session.invoice : typeof session.payment_intent === "string" ? session.payment_intent : undefined;
  // Free trial checkout has no service payment; never credit a positive setup without settlement.
  if (session.payment_status === "paid") await markInstallmentPaid(db, quoteId, installment, paymentRef);
  const { markBuildReady } = await import("@/lib/build-order.server");
  await markBuildReady(db, quoteId);
  await saveCardAndSchedule(db, env, quoteId, session);
  const { saveQuoteReceipt } = await import("@/lib/installments.server");
  const idOf = (v: any) => (typeof v === "string" ? v : v?.id ?? undefined);
  await saveQuoteReceipt(db, env, quoteId, installment, { invoiceId: idOf(session.invoice), paymentIntentId: idOf(session.payment_intent) });
  const customerId = customerIdOf(session);
  if (customerId) {
    const memberId = await upsertMember(env, customerId, {});
    // Linking lets monthly renewals pay the rep's recurring commission.
    if (memberId) {
      await db.from("commissions").update({ member_id: memberId }).eq("order_quote_id", quoteId).is("member_id", null);
      await db.from("commissions").update({ member_id: memberId }).eq("quote_id", quoteId).is("member_id", null);
    }
  }
  if (session.invoice) {
    const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice.id;
    const inv = await createStripeClient(env).invoices.retrieve(invoiceId);
    if (inv.status === "paid") await handleInvoice(inv, env, true);
  }
}

/** Settles a customer's prepaid ad-funds deposit once; ad spend is pass-through and never commissioned. */
async function handleAdFunds(session: any) {
  const fundId = session?.metadata?.ad_fund_id;
  if (!fundId || session.payment_status !== "paid") return;
  const db: any = await admin();
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? session.id;
  const { data: f } = await db.from("client_ad_funds").update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_ref: pi })
    .eq("id", fundId).neq("status", "paid").select("quote_id, amount, added_by_name").maybeSingle();
  if (!f) return;
  const amt = `$${Number(f.amount).toFixed(2)}`;
  const { logClientActivity, alertOwner } = await import("@/lib/client-portal.server");
  await logClientActivity(db, f.quote_id, "ad_funds", `Added ${amt} in prepaid ad funds`, f.added_by_name);
  const { data: q } = await db.from("quotes").select("business_name").eq("id", f.quote_id).maybeSingle();
  await alertOwner(`Ad funds added: ${q?.business_name ?? "customer"}`, `${f.added_by_name || "A customer"} prepaid ad funds from their portal.`, [{ label: "Amount", value: amt }], `ad-funds-${fundId}`);
}

/** Match the original payment exactly; refunded earnings cannot be paid out unnoticed. */
async function handleRefund(charge: any, env: StripeEnv) {
  const db: any = await admin();
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (piId) await db.from("payments").update({ status: "refunded" }).eq("stripe_payment_id", piId);

  let quoteId: string | null = null;
  if (piId) {
    try { quoteId = (await createStripeClient(env).paymentIntents.retrieve(piId)).metadata?.["quote_id"] ?? null; } catch { /* no guessed customer match */ }
  }
  const customerId = customerIdOf(charge);
  let memberId: string | null = null;
  if (customerId) {
    const { data } = await db.from("members").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    memberId = data?.id ?? null;
  }
  const stripe = createStripeClient(env);
  let invoiceId = typeof charge.invoice === "string" ? charge.invoice : charge.invoice?.id;
  if (!invoiceId && piId) {
    const { data: receipt } = await db.from("quote_receipts").select("quote_id, stripe_ref").eq("stripe_ref", piId).maybeSingle();
    quoteId = quoteId ?? receipt?.quote_id ?? null;
  }
  let installment: number | undefined;
  if (piId) {
    const pi: any = await stripe.paymentIntents.retrieve(piId);
    installment = Number(pi.metadata?.installment) || undefined;
    invoiceId = invoiceId ?? (typeof pi.invoice === "string" ? pi.invoice : pi.invoice?.id);
  }
  if (invoiceId) {
    const inv: any = await stripe.invoices.retrieve(invoiceId);
    quoteId = quoteId ?? inv.metadata?.quote_id ?? inv.parent?.subscription_details?.metadata?.quote_id ?? null;
    installment = installment ?? (Number(inv.metadata?.installment) || undefined);
  }
  const amount = centsToDollars(charge.amount_refunded);
  const note = `Customer refunded $${amount.toFixed(2)} on ${new Date().toISOString().slice(0, 10)} — review this commission.`;
  if (quoteId) {
    await db.from("commissions").update({ flag_note: note }).eq("quote_id", quoteId);
    if (charge.refunded) await db.from("quotes").update({ refunded_at: new Date().toISOString(), next_installment_at: null }).eq("id", quoteId);
  }
  if (invoiceId || (quoteId && installment)) {
    const filter = invoiceId ? `stripe_invoice_id.eq.${invoiceId},payment_ref.eq.${invoiceId}` : `and(order_quote_id.eq.${quoteId},installment_number.eq.${installment})`;
    const { data: entries, error } = await db.from("commissions").select("*").or(filter);
    if (error) throw error;
    const fraction = charge.amount > 0 ? Math.min(1, charge.amount_refunded / charge.amount) : 0;
    for (const entry of entries ?? []) {
      const refundedBase = Math.round(Number(entry.sale_amount) * fraction * 100) / 100;
      const originalCommission = entry.kind === "recurring" ? recurringCommissionFor(Number(entry.sale_amount)) : Math.round(Number(entry.sale_amount) * 30) / 100;
      const remaining = Math.round(originalCommission * (1 - fraction) * 100) / 100;
      const { error: updateError } = await db.from("commissions").update({ refunded_service_amount: refundedBase, flag_note: note, ...(entry.status === "owed" ? { commission_amount: remaining } : {}) }).eq("id", entry.id);
      if (updateError) throw updateError;
    }
  }
  const { alertOwner } = await import("@/lib/installments.server");
  await alertOwner("Refund issued", "A customer was refunded. The related commission is flagged on the Earnings page for you to review.",
    [{ label: "Amount", value: `$${amount.toFixed(2)}` }, { label: "Full refund", value: charge.refunded ? "Yes" : "No (partial)" }], `refund-${charge.id}-${charge.amount_refunded}`);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const obj = event.data.object;
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscription(obj, env, false);
      break;
    case "customer.subscription.deleted":
      await handleSubscription(obj, env, true);
      break;
    case "invoice.paid":
      await handleInvoice(obj, env, true);
      break;
    case "invoice.payment_failed":
      await handleInvoice(obj, env, false);
      break;
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleQuotePaid(obj, env);
      await handleAdFunds(obj);
      // Ad-fund deposits are tracked on the order, never as a separate member/plan.
      if (!obj?.metadata?.ad_fund_id) await handleOneTimeCheckout(obj, env);
      break;
    case "charge.refunded":
      await handleRefund(obj, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
