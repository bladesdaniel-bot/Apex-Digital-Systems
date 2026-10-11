import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUseBrief, type TeamRole } from "./team-access";
import { quoteTotals } from "./quote";

export const BUILD_STATUSES = ["new", "in_progress", "delivered"] as const;
export type BuildStatus = (typeof BUILD_STATUSES)[number];

export type OrderPhoto = { id: string; url: string; file_name: string; source: string; uploaded_by_name: string; created_at: string };
export type BuildOrder = {
  id: string; business_name: string; contact_name: string; contact_email: string; package_name: string; package_price: number;
  addons: { name: string; price: number }[]; membership_name: string; membership_price: number; membership_free_month: boolean;
  discount_type: "none" | "amount" | "percent"; discount_value: number; promo_note: string; installments: number; installments_paid: number;
  status: string; created_by_name: string; sales_rep_employee_id: string; appointment_at: string | null; expected_by: string | null;
  build_status: BuildStatus; build_ready_at: string; build_notes: string;
  next_installment_at: string | null; last_charge_error: string; stripe_payment_method_id: string; refunded_at: string | null;
  commission: null | { sale_amount: number; commission_amount: number; status: string };
  profile: null | { phone: string; address: string; website: string; needs: string; profile_notes: string; budget: string; contact_role: string };
  photos: OrderPhoto[];
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
      .select("id, call_list_id, business_name, contact_name, contact_email, package_name, package_price, addons, membership_name, membership_price, membership_free_month, discount_type, discount_value, promo_note, installments, installments_paid, status, created_by_name, sales_rep_employee_id, appointment_at, expected_by, build_status, build_ready_at, build_notes, next_installment_at, last_charge_error, stripe_payment_method_id, refunded_at")
      .neq("build_status", "").order("build_ready_at", { ascending: false }).limit(200);
    if (error) throw new Error("Couldn't load build orders.");
    const ids = (qs ?? []).map((q: any) => q.id);
    const listIds = (qs ?? []).map((q: any) => q.call_list_id).filter(Boolean);
    const [{ data: photos }, { data: profiles }, { data: comms }] = await Promise.all([
      ids.length ? db.from("order_photos").select("*").in("quote_id", ids).order("created_at") : { data: [] },
      listIds.length ? db.from("call_list").select("id, phone, address, website, needs, profile_notes, budget, contact_role").in("id", listIds) : { data: [] },
      ids.length ? db.from("commissions").select("quote_id, sale_amount, commission_amount, status").eq("kind", "sale").in("quote_id", ids) : { data: [] },
    ]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const paths = (photos ?? []).map((p: any) => p.path);
    const signed = paths.length ? (await (supabaseAdmin as any).storage.from("order-photos").createSignedUrls(paths, 3600)).data ?? [] : [];
    const urlFor = new Map(signed.map((s: any) => [s.path, s.signedUrl]));
    return (qs ?? []).map((q: any) => ({
      ...q,
      profile: (profiles ?? []).find((p: any) => p.id === q.call_list_id) ?? null,
      commission: ((c: any) => c ? { sale_amount: Number(c.sale_amount), commission_amount: Number(c.commission_amount), status: c.status } : null)((comms ?? []).find((c: any) => c.quote_id === q.id)),
      photos: (photos ?? []).filter((p: any) => p.quote_id === q.id).map((p: any) => ({ id: p.id, url: urlFor.get(p.path) ?? "", file_name: p.file_name, source: p.source, uploaded_by_name: p.uploaded_by_name, created_at: p.created_at })),
    })) as BuildOrder[];
  });

export const updateBuildOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), build_status: z.enum(BUILD_STATUSES), build_notes: z.string().max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await teamRole(context)) !== "admin") throw new Error("Only the owner can update build orders.");
    const { error } = await (context.supabase as any).from("quotes").update({ build_status: data.build_status, build_notes: data.build_notes }).eq("id", data.id).neq("build_status", "");
    if (error) throw new Error("Couldn't save.");
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
    if (p) { await db.storage.from("order-photos").remove([p.path]); await db.from("order_photos").delete().eq("id", data.id); }
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
