import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUseBrief, type TeamRole } from "./team-access";
import { quoteTotals, type Addon } from "./quote";
import { needsOrderDetails, orderBusinessName } from "./order-draft";

export const BUILD_STATUSES = ["on_hold", "new", "in_progress", "delivered"] as const;
export type BuildStatus = (typeof BUILD_STATUSES)[number];

export type OrderPhoto = { id: string; url: string; file_name: string; source: string; uploaded_by_name: string; created_at: string };
export type BuildOrder = {
  id: string; business_name: string; contact_name: string; contact_email: string; customer_url: string; customer_address: string; package_name: string; package_details: string; package_price: number;
  addons: Addon[]; membership_name: string; membership_price: number; membership_free_month: boolean;
  discount_type: "none" | "amount" | "percent"; discount_value: number; promo_note: string; installments: number; installments_paid: number;
  status: string; created_by_name: string; sales_rep_employee_id: string; appointment_at: string | null; expected_by: string | null;
  update_needed_at: string | null; update_needed_note: string; hold_reason: string; customer_phone: string | null;
  call_list_id: string | null; created_by: string | null;
  build_status: BuildStatus; build_ready_at: string; build_notes: string;
  next_installment_at: string | null; last_charge_error: string; stripe_payment_method_id: string; refunded_at: string | null;
  commission: null | { sale_amount: number; commission_amount: number; status: string };
  profile: null | { phone: string; address: string; website: string; needs: string; profile_notes: string; budget: string; contact_role: string };
  photos: OrderPhoto[];
  membership: null | { status: string; next_billing_date: string | null; plan_name: string };
};

async function teamRole(ctx: any): Promise<TeamRole> {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).maybeSingle();
  const role = (data?.role as TeamRole | undefined) ?? null;
  if (!canUseBrief(role)) throw new Error("Team members only.");
  return role as TeamRole;
}

// 100 MB of photo, encoded as base64 (~137 MB of text), plus a little headroom.
const photoFile = z.object({ name: z.string().max(200), type: z.string().max(60), base64: z.string().max(140_000_000) });

export const listBuildOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await teamRole(context);
    const db: any = context.supabase;
    const { data: qs, error } = await db.from("quotes")
      .select("id, call_list_id, created_by, business_name, contact_name, contact_email, customer_url, customer_address, customer_phone, package_name, package_details, package_price, addons, membership_name, membership_price, membership_free_month, discount_type, discount_value, promo_note, installments, installments_paid, status, created_by_name, sales_rep_employee_id, appointment_at, expected_by, build_status, build_ready_at, build_notes, next_installment_at, last_charge_error, stripe_payment_method_id, refunded_at, stripe_customer_id, update_needed_at, update_needed_note, hold_reason")
      .neq("build_status", "").order("build_ready_at", { ascending: false }).limit(200);
    if (error) throw new Error("Couldn't load build orders.");
    const ids = (qs ?? []).map((q: any) => q.id);
    const listIds = (qs ?? []).map((q: any) => q.call_list_id).filter(Boolean);
    const custIds = (qs ?? []).map((q: any) => q.stripe_customer_id).filter(Boolean);
    const emails = (qs ?? []).map((q: any) => String(q.contact_email || "").toLowerCase()).filter(Boolean);
    // Members are owner-only (RLS); reps simply get no rows here.
    const [{ data: mems }] = await Promise.all([
      custIds.length || emails.length
        ? db.from("members").select("email, stripe_customer_id, status, next_billing_date, plan_name, updated_at").order("updated_at", { ascending: false }).limit(1000)
        : { data: [] },
    ]);
    const memberFor = (q: any) => {
      const list = (mems ?? []) as any[];
      const m = (q.stripe_customer_id && list.find((x) => x.stripe_customer_id === q.stripe_customer_id))
        || (q.contact_email && list.find((x) => String(x.email).toLowerCase() === String(q.contact_email).toLowerCase()));
      return m ? { status: m.status, next_billing_date: m.next_billing_date, plan_name: m.plan_name } : null;
    };
    const [{ data: photos }, { data: profiles }, { data: comms }] = await Promise.all([
      ids.length ? db.from("order_photos").select("*").in("quote_id", ids).order("created_at") : { data: [] },
      listIds.length ? db.from("call_list").select("id, phone, address, website, needs, profile_notes, budget, contact_role").in("id", listIds) : { data: [] },
      ids.length ? db.from("commissions").select("quote_id, order_quote_id, sale_amount, commission_amount, status").eq("kind", "sale").or(`quote_id.in.(${ids.join(",")}),order_quote_id.in.(${ids.join(",")})`) : { data: [] },
    ]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const paths = (photos ?? []).map((p: any) => p.path);
    const signed = paths.length ? (await (supabaseAdmin as any).storage.from("order-photos").createSignedUrls(paths, 3600)).data ?? [] : [];
    const urlFor = new Map(signed.map((s: any) => [s.path, s.signedUrl]));
    return (qs ?? []).map((q: any) => ({
      ...q,
      membership: q.membership_name || q.addons?.some((a: Addon) => a.cadence === "monthly") ? memberFor(q) : null,
      profile: (profiles ?? []).find((p: any) => p.id === q.call_list_id) ?? null,
      commission: ((cs: any[]) => cs.length ? { sale_amount: cs.reduce((s, c) => s + Number(c.sale_amount), 0), commission_amount: cs.reduce((s, c) => s + Number(c.commission_amount), 0), status: cs.every(c => c.status === "paid") ? "paid" : "owed" } : null)((comms ?? []).filter((c: any) => c.quote_id === q.id || c.order_quote_id === q.id)),
      photos: (photos ?? []).filter((p: any) => p.quote_id === q.id).map((p: any) => ({ id: p.id, url: urlFor.get(p.path) ?? "", file_name: p.file_name, source: p.source, uploaded_by_name: p.uploaded_by_name, created_at: p.created_at })),
    })) as BuildOrder[];
  });

const money = z.coerce.number().min(0).max(100000);
const editInput = z.object({
  id: z.string().uuid(),
  business_name: orderBusinessName,
  contact_name: z.string().trim().max(120),
  contact_email: z.union([z.literal(""), z.string().trim().email().max(255)]),
  customer_url: z.union([z.literal(""), z.string().trim().url().max(500)]).default(""),
  customer_address: z.string().trim().max(300).default(""),
  customer_phone: z.string().trim().max(40).default(""),
  package_name: z.string().trim().max(200),
  package_details: z.string().trim().max(4000).default(""),
  package_price: money,
  addons: z.array(z.object({ name: z.string().trim().min(1).max(120), price: money, cadence: z.enum(["one_time", "monthly"]).optional(), category: z.enum(["service", "ad_budget", "extra_minutes", "extra_hours"]).optional() })).max(10),
  membership_name: z.string().trim().max(200),
  membership_price: money,
  membership_free_month: z.boolean(),
  discount_type: z.enum(["none", "amount", "percent"]),
  discount_value: money,
  promo_note: z.string().trim().max(500),
  installments: z.coerce.number().int().min(1).max(4),
  appointment_at: z.string().datetime().nullable(),
  expected_by: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  needs: z.string().max(4000),
  profile_notes: z.string().max(4000),
});

/** The rep who wrote an order, or the owner, can edit it. Pricing locks once a payment has been received. */
export const editBuildOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => editInput.parse(d))
  .handler(async ({ data, context }) => {
    const role = await teamRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data: q } = await db.from("quotes").select("id, created_by, call_list_id, installments_paid, status, build_status").eq("id", data.id).maybeSingle();
    if (!q || !q.build_status) throw new Error("Order not found.");
    if (role !== "admin" && q.created_by !== context.userId) throw new Error("Only the rep who wrote this order or the owner can edit it.");
    if (q.status === "canceled") throw new Error("This order was canceled.");
    if (q.installments_paid > 0 && !data.business_name) throw new Error("Add the business name for a paid order.");
    const update: Record<string, unknown> = {
      business_name: data.business_name, contact_name: data.contact_name, contact_email: data.contact_email,
      customer_url: data.customer_url, customer_address: data.customer_address, customer_phone: data.customer_phone,
      appointment_at: data.appointment_at, expected_by: data.expected_by,
      package_details: data.package_details,
    };
    // Saving the profile is how the owner acknowledges a customer update; reps' saves keep the alert on.
    if (role === "admin") Object.assign(update, { update_needed_at: null, update_needed_note: "" });
    if (q.installments_paid === 0) {
      if (needsOrderDetails(data)) Object.assign(update, { build_status: "on_hold", hold_reason: "Waiting on customer / package details" });
      const t = quoteTotals(data);
      if (data.membership_free_month && data.addons.some(a => a.cadence === "monthly" && a.price > 0)) throw new Error("Put paid monthly add-ons on a separate order when offering a free first month.");
      if (t.parts.some(p => p > 0 && p < 50) || (t.membership > 0 && t.membership < 50)) throw new Error("Each charge must be at least $0.50, or $0.");
      if (data.membership_price > 0 && !data.membership_name) throw new Error("Name the membership.");
      Object.assign(update, {
        package_name: data.package_name, package_price: data.package_price, addons: data.addons,
        membership_name: data.membership_name, membership_price: data.membership_price, membership_free_month: data.membership_free_month && data.membership_price > 0,
        discount_type: data.discount_type, discount_value: data.discount_type === "none" ? 0 : data.discount_value,
        promo_note: data.promo_note, installments: data.installments, one_time_total: t.oneTime / 100,
      });
    }
    const { error } = await db.from("quotes").update(update).eq("id", data.id);
    if (error) throw new Error("Couldn't save the order.");
    if (q.call_list_id) {
      await db.from("call_list").update({ needs: data.needs, profile_notes: data.profile_notes, appointment_at: data.appointment_at, expected_by: data.expected_by }).eq("id", q.call_list_id);
    }
    return { ok: true, pricingLocked: q.installments_paid > 0 };
  });

export const updateBuildOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), build_status: z.enum(BUILD_STATUSES), build_notes: z.string().max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await teamRole(context)) !== "admin") throw new Error("Only the owner can update build orders.");
    const { error } = await (context.supabase as any).from("quotes").update({ build_status: data.build_status, build_notes: data.build_notes }).eq("id", data.id).neq("build_status", "");
    if (error) throw new Error("Couldn't save.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logClientActivity } = await import("./client-portal.server");
    const label = { on_hold: "On hold — waiting on you", new: "New", in_progress: "In progress", delivered: "Delivered" }[data.build_status];
    const { data: last } = await (supabaseAdmin as any).from("client_activity").select("summary").eq("quote_id", data.id).eq("kind", "status").order("created_at", { ascending: false }).limit(1);
    if (last?.[0]?.summary !== `Project status: ${label}`) await logClientActivity(supabaseAdmin, data.id, "status", `Project status: ${label}`, "Apex Digital Systems");
    return { ok: true };
  });

/** Owner enters the sale amount for an order that wasn't prepaid; the rep's commission is recorded automatically. */
export const enterOrderSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), saleAmount: z.number().positive().max(1_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await teamRole(context)) !== "admin") throw new Error("Only the owner can enter sales.");
    const db: any = context.supabase;
    const { data: q } = await db.from("quotes").select("*").eq("id", data.id).neq("build_status", "").maybeSingle();
    if (!q) throw new Error("Order not found.");
    const { recordQuoteCommission } = await import("./build-order.server");
    const r = await recordQuoteCommission(db, q, data.saleAmount, context.userId);
    if ("error" in r) throw new Error(r.error);
    return { ok: true };
  });

export const uploadOrderPhotoTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quoteId: z.string().uuid(), file: photoFile }).parse(d))
  .handler(async ({ data, context }) => {
    const role = await teamRole(context);
    const { data: q } = await (context.supabase as any).from("quotes").select("id").eq("id", data.quoteId).maybeSingle();
    if (!q) throw new Error("Order not found.");
    const { data: prof } = await (context.supabase as any).from("profiles").select("username, email").eq("id", context.userId).maybeSingle();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { storeOrderPhoto } = await import("./build-order.server");
    await storeOrderPhoto(supabaseAdmin, data.quoteId, data.file, role === "admin" ? "admin" : "caller", prof?.username || prof?.email || "Team");
    return { ok: true };
  });

export const deleteOrderPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await teamRole(context)) !== "admin") throw new Error("Only the owner can remove photos.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data: p } = await db.from("order_photos").select("path").eq("id", data.id).maybeSingle();
    if (p) {
      // Profile photos are shared with the customer profile; only unlink them from this order.
      if (!String(p.path).startsWith("profile/")) await db.storage.from("order-photos").remove([p.path]);
      await db.from("order_photos").delete().eq("id", data.id);
    }
    return { ok: true };
  });

export type ProfilePhoto = { name: string; url: string; file_name: string };

/** Team: photos attached to a customer profile (call-list business), shown as signed thumbnails. */
export const listProfilePhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ callId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await teamRole(context);
    const { data: row } = await (context.supabase as any).from("call_list").select("id").eq("id", data.callId).maybeSingle();
    if (!row) return [] as ProfilePhoto[];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data: files } = await db.storage.from("order-photos").list(`profile/${data.callId}`, { limit: 100, sortBy: { column: "created_at", order: "asc" } });
    const list = (files ?? []).filter((f: any) => f.id);
    if (!list.length) return [] as ProfilePhoto[];
    const paths = list.map((f: any) => `profile/${data.callId}/${f.name}`);
    const { data: signed } = await db.storage.from("order-photos").createSignedUrls(paths, 3600);
    return list.map((f: any, i: number) => ({
      name: f.name as string,
      url: (signed?.[i]?.signedUrl ?? "") as string,
      file_name: String(f.name).split("__").slice(1).join("__") || f.name,
    })) as ProfilePhoto[];
  });

/** Team: adds a photo to a customer profile; it's also linked onto any existing and future orders for that customer. */
export const uploadProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ callId: z.string().uuid(), file: photoFile }).parse(d))
  .handler(async ({ data, context }) => {
    await teamRole(context);
    const { data: row } = await (context.supabase as any).from("call_list").select("id").eq("id", data.callId).maybeSingle();
    if (!row) throw new Error("Customer not found.");
    const { data: prof } = await (context.supabase as any).from("profiles").select("username, email").eq("id", context.userId).maybeSingle();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { storeProfilePhoto } = await import("./build-order.server");
    await storeProfilePhoto(supabaseAdmin, data.callId, data.file, prof?.username || prof?.email || "Team");
    return { ok: true };
  });

/** Public: the customer adds photos from their payment page once the order exists. The link's random ID is the key. */
export const uploadOrderPhotoCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ quoteId: z.string().uuid(), file: photoFile }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db: any = supabaseAdmin;
      const { data: q } = await db.from("quotes").select("build_status, contact_name, business_name").eq("id", data.quoteId).maybeSingle();
      if (!q || !q.build_status) return { error: "Photos can be added once your order is confirmed." };
      const { storeOrderPhoto } = await import("./build-order.server");
      await storeOrderPhoto(db, data.quoteId, data.file, "customer", q.contact_name || q.business_name);
      return { ok: true as const };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed." };
    }
  });

/** Public: confirms a quote with nothing to charge ($0 build, no paid membership) without a card. */
export const confirmFreeQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data: q } = await db.from("quotes").select("*").eq("id", data.id).maybeSingle();
    if (!q || q.status === "canceled") return { error: "This quote isn't available." };
    const t = quoteTotals({ ...q, package_price: Number(q.package_price), membership_price: Number(q.membership_price), discount_value: Number(q.discount_value) });
    if (t.oneTime > 0 || t.membership > 0) return { error: "This quote has a balance due." };
    await db.from("quotes").update({ installments_paid: q.installments, status: "paid" }).eq("id", q.id);
    const { markBuildReady } = await import("./build-order.server");
    await markBuildReady(db, q.id);
    return { ok: true as const };
  });

/** Owner: charge the next split-payment part to the saved card right now. */
export const chargeNextPaymentNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await teamRole(context)) !== "admin") throw new Error("Only the owner can charge payments.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { chargeNextInstallment } = await import("./installments.server");
    const r = await chargeNextInstallment(supabaseAdmin, data.id);
    if ("error" in r) throw new Error(r.error);
    return r;
  });

/** The rep who wrote a held order, or the owner, marks it 100% ready; it then enters the active build queue and the owner is alerted. */
export const markOrderReady = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const role = await teamRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data: q } = await db.from("quotes").select("id, created_by, build_status, status, business_name, package_name, membership_name, addons").eq("id", data.id).maybeSingle();
    if (!q || q.build_status !== "on_hold") throw new Error("This order isn't in the Holding Area.");
    if (role !== "admin" && q.created_by !== context.userId) throw new Error("Only the rep who wrote this order or the owner can release it.");
    if (q.status === "canceled") throw new Error("This order was canceled.");
    if (needsOrderDetails(q)) throw new Error("Add a business name and select a package, membership or add-on before marking ready.");
    const { releaseHeldOrder } = await import("./build-order.server");
    await releaseHeldOrder(db, data.id);
    const { logClientActivity } = await import("./client-portal.server");
    await logClientActivity(db, data.id, "status", "Project status: New", "Apex Digital Systems");
    return { ok: true };
  });

/** Owner only: permanently delete an order (e.g. a duplicate). Paid orders are refused so money records are never lost. */
export const deleteBuildOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await teamRole(context)) !== "admin") throw new Error("Only the owner can delete orders.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data: q } = await db.from("quotes").select("id, installments_paid, status").eq("id", data.id).maybeSingle();
    if (!q) throw new Error("Order not found.");
    if (q.installments_paid > 0) throw new Error("This order has received payments and can't be deleted. Refund and cancel it instead.");
    const { data: photos } = await db.from("order_photos").select("path").eq("quote_id", data.id);
    const paths = (photos ?? []).map((p: any) => p.path).filter((p: string) => !String(p).startsWith("profile/"));
    if (paths.length) await db.storage.from("order-photos").remove(paths);
    await db.from("order_photos").delete().eq("quote_id", data.id);
    await db.from("commissions").delete().or(`quote_id.eq.${data.id},order_quote_id.eq.${data.id}`);
    await db.from("client_activity").delete().eq("quote_id", data.id);
    await db.from("client_links").delete().eq("quote_id", data.id);
    await db.from("client_requests").delete().eq("quote_id", data.id);
    const { error } = await db.from("quotes").delete().eq("id", data.id);
    if (error) throw new Error("Couldn't delete the order.");
    return { ok: true };
  });
