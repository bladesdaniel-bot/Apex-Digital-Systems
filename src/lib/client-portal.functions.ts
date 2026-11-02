import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUseBrief, type TeamRole } from "./team-access";

/** Photo sources a customer may see in their portal: their signed agreement and their own uploads. */
export const CLIENT_VISIBLE_SOURCES = ["signed", "customer", "client"];

const photoFile = z.object({ name: z.string().max(200), type: z.string().max(60), base64: z.string().max(140_000_000) });
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;

async function teamRole(ctx: any): Promise<TeamRole> {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).maybeSingle();
  const role = (data?.role as TeamRole | undefined) ?? null;
  if (!canUseBrief(role)) throw new Error("Team members only.");
  return role as TeamRole;
}

/** Rep who wrote the order, or the owner. */
async function teamOrder(ctx: any, quoteId: string, opts: { allowUnplaced?: boolean } = {}) {
  const role = await teamRole(ctx);
  const db = await admin();
  const { data: q } = await db.from("quotes").select("id, created_by, build_status, business_name, status").eq("id", quoteId).maybeSingle();
  // Signed agreements may be attached as soon as a payment link exists, before the order is placed.
  if (!q || q.status === "canceled" || (!q.build_status && !opts.allowUnplaced)) throw new Error("Order not found.");
  if (role !== "admin" && q.created_by !== ctx.userId) throw new Error("Only the rep who wrote this order or the owner can do that.");
  return { db, q };
}

async function clientQuoteIds(db: any, userId: string): Promise<string[]> {
  const { data: role } = await db.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (role?.role !== "client") throw new Error("This sign-in isn't a customer account.");
  const { data } = await db.from("client_links").select("quote_id").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.quote_id);
}

async function clientName(db: any, userId: string) {
  const { data } = await db.from("profiles").select("username, email").eq("id", userId).maybeSingle();
  return data?.username || data?.email || "Customer";
}

// ---------- Team side ----------

export const sendClientInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quoteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await teamOrder(context, data.quoteId);
    const { createClientInvite } = await import("./client-portal.server");
    const r = await createClientInvite(db, data.quoteId);
    if (!r) throw new Error("Add the customer's email to the order first.");
    return r;
  });

export const uploadSignedAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quoteId: z.string().uuid(), file: photoFile }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await teamOrder(context, data.quoteId, { allowUnplaced: true });
    const { data: p } = await db.from("profiles").select("username, email").eq("id", context.userId).maybeSingle();
    const by = p?.username || p?.email || "Team";
    const { storeOrderPhoto } = await import("./build-order.server");
    await storeOrderPhoto(db, data.quoteId, data.file, "signed", by);
    const { logClientActivity } = await import("./client-portal.server");
    await logClientActivity(db, data.quoteId, "signed", "Signed agreement added to your account", by);
    return { ok: true };
  });

export type ClientRequest = { id: string; author_name: string; message: string; status: string; created_at: string };
export type ClientActivity = { id: string; kind: string; summary: string; actor_name: string; created_at: string };

export const getOrderClientInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quoteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await teamRole(context);
    const db = await admin();
    const [{ count }, { data: reqs }, { data: invites }, { data: funds }] = await Promise.all([
      db.from("client_links").select("user_id", { count: "exact", head: true }).eq("quote_id", data.quoteId),
      db.from("client_requests").select("id, author_name, message, status, created_at").eq("quote_id", data.quoteId).order("created_at", { ascending: false }),
      db.from("client_invites").select("created_at").eq("quote_id", data.quoteId).order("created_at", { ascending: false }).limit(1),
      db.from("client_ad_funds").select("amount").eq("quote_id", data.quoteId).eq("status", "paid"),
    ]);
    const adFundsTotal = (funds ?? []).reduce((s: number, f: any) => s + Number(f.amount), 0);
    return { adFundsTotal, hasAccount: (count ?? 0) > 0, lastInviteAt: (invites?.[0]?.created_at as string | undefined) ?? null, requests: (reqs ?? []) as ClientRequest[] };
  });

export const resolveClientRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await teamRole(context);
    const db = await admin();
    const { data: r } = await db.from("client_requests").update({ status: "done", resolved_at: new Date().toISOString() }).eq("id", data.id).select("quote_id, message").maybeSingle();
    if (r) {
      const { logClientActivity } = await import("./client-portal.server");
      await logClientActivity(db, r.quote_id, "request_done", `Change completed: ${r.message.slice(0, 120)}`, "Apex Digital Systems");
    }
    return { ok: true };
  });

// ---------- Customer account setup (public, token-gated) ----------

async function liveInvite(db: any, token: string) {
  const { data: inv } = await db.from("client_invites").select("*").eq("token", token).maybeSingle();
  if (!inv || inv.used_at || new Date(inv.expires_at).getTime() < Date.now()) return null;
  return inv;
}

export const getClientInvite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const inv = await liveInvite(db, data.token);
    if (!inv) return { error: "This link has expired or was already used. Ask your Apex rep for a new one." };
    const { data: q } = await db.from("quotes").select("business_name, contact_name, call_list_id").eq("id", inv.quote_id).maybeSingle();
    let phone = "";
    if (q?.call_list_id) phone = (await db.from("call_list").select("phone").eq("id", q.call_list_id).maybeSingle()).data?.phone ?? "";
    return { business: q?.business_name ?? "", contact: q?.contact_name ?? "", email: inv.email as string, phone };
  });

export const activateClient = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: z.string().regex(/^[a-f0-9]{48}$/),
    contact: z.string().trim().min(1, "Add your name.").max(120),
    phone: z.string().trim().max(40),
    password: z.string().min(8, "Use at least 8 characters.").max(72),
  }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const inv = await liveInvite(db, data.token);
    if (!inv) return { error: "This link has expired or was already used. Ask your Apex rep for a new one." };
    let userId: string;
    let existing = false;
    const created = await db.auth.admin.createUser({ email: inv.email, password: data.password, email_confirm: true, user_metadata: { username: data.contact } });
    if (created.error || !created.data?.user) {
      const { data: prof } = await db.from("profiles").select("id").eq("email", inv.email).maybeSingle();
      if (!prof) return { error: "Couldn't create your account. Please try again." };
      const { data: role } = await db.from("user_roles").select("role").eq("user_id", prof.id).maybeSingle();
      if (role?.role !== "client") return { error: "That email already has a team account. Ask your rep to use a different email." };
      userId = prof.id; existing = true;
    } else {
      userId = created.data.user.id;
      await db.from("user_roles").update({ role: "client", updated_at: new Date().toISOString() }).eq("user_id", userId);
    }
    await db.from("client_links").upsert({ user_id: userId, quote_id: inv.quote_id, phone: data.phone });
    await db.from("client_invites").update({ used_at: new Date().toISOString() }).eq("token", data.token);
    const { logClientActivity, alertOwner } = await import("./client-portal.server");
    await logClientActivity(db, inv.quote_id, "account", "Customer account activated", data.contact);
    const { data: q } = await db.from("quotes").select("business_name").eq("id", inv.quote_id).maybeSingle();
    await alertOwner(`Customer account created: ${q?.business_name ?? inv.email}`, "A customer activated their project portal.",
      [{ label: "Name", value: data.contact }, { label: "Email", value: inv.email }, { label: "Phone", value: data.phone }], `client-activated-${data.token}`);
    return { ok: true as const, email: inv.email as string, existing };
  });

// ---------- Customer portal (signed-in customer) ----------

export type PortalOrder = {
  id: string; business_name: string; package_name: string; addons: { name: string }[]; membership_name: string;
  one_time_total: number; installments: number; installments_paid: number; status: string; build_status: string;
  expected_by: string | null; created_by_name: string; created_at: string;
  files: { id: string; url: string; file_name: string; source: string; created_at: string }[];
  requests: ClientRequest[]; activity: ClientActivity[];
  receipts: { id: string; installment: number; amount: number; invoice_number: string; receipt_url: string; pdf_url: string; created_at: string }[];
  adFunds: import("./ad-funds").AdFund[];
};

export const getClientPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const ids = await clientQuoteIds(db, context.userId);
    const name = await clientName(db, context.userId);
    if (!ids.length) return { name, orders: [] as PortalOrder[] };
    const [{ data: qs }, { data: photos }, { data: reqs }, { data: acts }, { data: recs }, { data: funds }] = await Promise.all([
      db.from("quotes").select("id, business_name, package_name, addons, membership_name, one_time_total, installments, installments_paid, status, build_status, expected_by, created_by_name, created_at").in("id", ids).order("created_at", { ascending: false }),
      db.from("order_photos").select("*").in("quote_id", ids).in("source", CLIENT_VISIBLE_SOURCES).order("created_at", { ascending: false }),
      db.from("client_requests").select("id, quote_id, author_name, message, status, created_at").in("quote_id", ids).order("created_at", { ascending: false }),
      db.from("client_activity").select("id, quote_id, kind, summary, actor_name, created_at").in("quote_id", ids).order("created_at", { ascending: false }).limit(300),
      db.from("quote_receipts").select("id, quote_id, installment, amount, invoice_number, receipt_url, pdf_url, created_at").in("quote_id", ids).order("created_at", { ascending: false }),
      db.from("client_ad_funds").select("id, quote_id, amount, status, created_at, paid_at").in("quote_id", ids).eq("status", "paid").order("created_at", { ascending: false }),
    ]);
    const paths = (photos ?? []).map((p: any) => p.path);
    const signed = paths.length ? (await db.storage.from("order-photos").createSignedUrls(paths, 3600)).data ?? [] : [];
    const urlFor = new Map(signed.map((s: any) => [s.path, s.signedUrl]));
    const orders = (qs ?? []).map((q: any) => ({
      ...q, one_time_total: Number(q.one_time_total),
      files: (photos ?? []).filter((p: any) => p.quote_id === q.id).map((p: any) => ({ id: p.id, url: urlFor.get(p.path) ?? "", file_name: p.file_name, source: p.source, created_at: p.created_at })),
      requests: (reqs ?? []).filter((r: any) => r.quote_id === q.id),
      activity: (acts ?? []).filter((a: any) => a.quote_id === q.id),
      receipts: (recs ?? []).filter((r: any) => r.quote_id === q.id).map((r: any) => ({ ...r, amount: Number(r.amount) })),
      adFunds: (funds ?? []).filter((f: any) => f.quote_id === q.id).map((f: any) => ({ id: f.id, amount: Number(f.amount), status: f.status, created_at: f.created_at, paid_at: f.paid_at })),
    })) as PortalOrder[];
    return { name, orders };
  });

async function clientOrder(ctx: any, quoteId: string) {
  const db = await admin();
  const ids = await clientQuoteIds(db, ctx.userId);
  if (!ids.includes(quoteId)) throw new Error("Order not found.");
  const { data: q } = await db.from("quotes").select("business_name").eq("id", quoteId).maybeSingle();
  return { db, business: q?.business_name ?? "", name: await clientName(db, ctx.userId) };
}

export const clientSubmitRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quoteId: z.string().uuid(), message: z.string().trim().min(3, "Describe the change.").max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, business, name } = await clientOrder(context, data.quoteId);
    const { data: r } = await db.from("client_requests").insert({ quote_id: data.quoteId, user_id: context.userId, author_name: name, message: data.message }).select("id").single();
    const { logClientActivity, alertOwner, flagUpdateNeeded } = await import("./client-portal.server");
    await flagUpdateNeeded(db, data.quoteId, `Change request: ${data.message}`);
    await logClientActivity(db, data.quoteId, "request", `Change requested: ${data.message.slice(0, 120)}`, name);
    await alertOwner(`Change request: ${business}`, `${name} sent a change request from their portal.`, [{ label: "Request", value: data.message }], `client-request-${r?.id}`);
    return { ok: true };
  });

export const clientUploadFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quoteId: z.string().uuid(), file: photoFile }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, business, name } = await clientOrder(context, data.quoteId);
    const { storeOrderPhoto } = await import("./build-order.server");
    await storeOrderPhoto(db, data.quoteId, data.file, "client", name);
    const { logClientActivity, alertOwner, flagUpdateNeeded } = await import("./client-portal.server");
    await flagUpdateNeeded(db, data.quoteId, `Uploaded ${data.file.name}`);
    await logClientActivity(db, data.quoteId, "upload", `Uploaded ${data.file.name.slice(0, 80)}`, name);
    await alertOwner(`New customer upload: ${business}`, `${name} uploaded a file from their portal.`, [{ label: "File", value: data.file.name }], `client-upload-${data.quoteId}-${Date.now()}`);
    return { ok: true };
  });

// ---------- Prepaid ad funds ----------

/** Customer adds prepaid ad money to an order; it settles via the payments webhook (metadata.ad_fund_id). */
export const clientAdFundsCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quoteId: z.string().uuid(), amount: z.number(), environment: z.enum(["sandbox", "live"]), returnUrl: z.string().url().max(500) }).parse(d))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { validAdFundAmount } = await import("./ad-funds");
    if (!validAdFundAmount(data.amount)) return { error: "Enter an amount between $25 and $25,000." };
    const { db, business, name } = await clientOrder(context, data.quoteId);
    const { data: q } = await db.from("quotes").select("status, contact_email").eq("id", data.quoteId).maybeSingle();
    if (!q || q.status === "canceled") return { error: "This order is canceled." };
    const { data: fund } = await db.from("client_ad_funds").insert({ quote_id: data.quoteId, user_id: context.userId, amount: data.amount, stripe_env: data.environment, added_by_name: name }).select("id").single();
    if (!fund) return { error: "Couldn't start the payment. Please try again." };
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      const metadata = { ad_fund_id: fund.id, ad_fund_quote_id: data.quoteId };
      const stripe = createStripeClient(data.environment);
      // Reuse the customer's existing billing record instead of creating a new one per deposit.
      const existing = q.contact_email ? (await stripe.customers.list({ email: q.contact_email, limit: 1 })).data[0] : undefined;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        line_items: [{ price_data: { currency: "usd", product_data: { name: `Prepaid ad funds — ${business}`.slice(0, 200), metadata: { commission_category: "excluded" } }, unit_amount: Math.round(data.amount * 100) }, quantity: 1 }],
        billing_address_collection: "required",
        ...(existing
          ? { customer: existing.id, customer_update: { address: "auto" } }
          : { ...(q.contact_email && { customer_email: q.contact_email }), customer_creation: "always" }),
        metadata,
        payment_intent_data: { description: `Prepaid ad funds — ${business}`.slice(0, 300), metadata },
      } as any);
      await db.from("client_ad_funds").update({ stripe_session_id: session.id }).eq("id", fund.id);
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      await db.from("client_ad_funds").update({ status: "failed" }).eq("id", fund.id);
      return { error: getStripeErrorMessage(e) };
    }
  });
