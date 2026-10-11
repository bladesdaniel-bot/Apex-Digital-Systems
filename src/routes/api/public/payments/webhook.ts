import { RECURRING_COMMISSION } from "@/lib/commission";
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
  if (paid && inv.billing_reason === "subscription_cycle" && inv.id) await creditRecurring(memberId, inv);
}

/** Each successful monthly renewal pays the employee(s) who made the linked sale a flat recurring commission. */
async function creditRecurring(memberId: string, inv: any) {
  const db = await admin();
  const { data: sales } = await db.from("commissions").select("employee_id, customer_name").eq("member_id", memberId).eq("kind", "sale");
  const seen = new Set<string>();
  for (const s of sales ?? []) {
    if (seen.has(s.employee_id)) continue;
    seen.add(s.employee_id);
    const { error } = await db.from("commissions").insert({
      employee_id: s.employee_id, customer_name: s.customer_name, kind: "recurring",
      description: "Monthly recurring commission", sale_amount: centsToDollars(inv.amount_paid),
      commission_amount: RECURRING_COMMISSION, member_id: memberId, stripe_invoice_id: inv.id,
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
  if (!quoteId || !installment || session.payment_status === "unpaid") return;
  const db: any = await admin();
  const { markInstallmentPaid, saveCardAndSchedule } = await import("@/lib/installments.server");
  await markInstallmentPaid(db, quoteId, installment);
  const { markBuildReady } = await import("@/lib/build-order.server");
  await markBuildReady(db, quoteId);
  await saveCardAndSchedule(db, env, quoteId, session);
  const customerId = customerIdOf(session);
  if (customerId) {
    const memberId = await upsertMember(env, customerId, {});
    // Linking lets monthly renewals pay the rep's recurring commission.
    if (memberId) await db.from("commissions").update({ member_id: memberId }).eq("quote_id", quoteId).is("member_id", null);
  }
}

/** Refunds update the payment and flag the related commission for the owner to decide. */
async function handleRefund(charge: any, env: StripeEnv) {
  const db: any = await admin();
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (piId) await db.from("payments").update({ status: "refunded" }).eq("stripe_payment_id", piId);

  let quoteId: string | null = null;
  if (piId) {
    try { quoteId = (await createStripeClient(env).paymentIntents.retrieve(piId)).metadata?.["quote_id"] ?? null; } catch { /* fall back to customer */ }
  }
  const customerId = customerIdOf(charge);
  let memberId: string | null = null;
  if (customerId) {
    const { data } = await db.from("members").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    memberId = data?.id ?? null;
  }
  if (!quoteId && customerId) {
    const { data } = await db.from("quotes").select("id").eq("stripe_customer_id", customerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    quoteId = data?.id ?? null;
  }
  const amount = centsToDollars(charge.amount_refunded);
  const note = `Customer refunded $${amount.toFixed(2)} on ${new Date().toISOString().slice(0, 10)} — review this commission.`;
  if (quoteId) {
    await db.from("commissions").update({ flag_note: note }).eq("quote_id", quoteId);
    if (charge.refunded) await db.from("quotes").update({ refunded_at: new Date().toISOString(), next_installment_at: null }).eq("id", quoteId);
  } else if (memberId) {
    await db.from("commissions").update({ flag_note: note }).eq("member_id", memberId).eq("kind", "sale");
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
      await handleOneTimeCheckout(obj, env);
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
