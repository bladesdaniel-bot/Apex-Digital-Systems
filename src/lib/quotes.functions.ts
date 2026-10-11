import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUseBrief, type TeamRole } from "./team-access";
import { MAX_INSTALLMENTS, quoteTotals, type Addon, type DiscountType } from "./quote";

export type Quote = {
  id: string; call_list_id: string | null; business_name: string; contact_name: string; contact_email: string;
  package_name: string; package_price: number; addons: Addon[]; membership_name: string; membership_price: number; membership_free_month: boolean;
  discount_type: DiscountType; discount_value: number; promo_note: string; installments: number; installments_paid: number;
  one_time_total: number; status: "open" | "partially_paid" | "paid" | "canceled"; created_by_name: string; created_at: string;
};
const COLS = "id, call_list_id, business_name, contact_name, contact_email, package_name, package_price, addons, membership_name, membership_price, membership_free_month, discount_type, discount_value, promo_note, installments, installments_paid, one_time_total, status, created_by_name, created_at";

async function requireTeam(ctx: any) {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).maybeSingle();
  if (!canUseBrief((data?.role as TeamRole | undefined) ?? null)) throw new Error("Team members only.");
}

const money = z.coerce.number().min(0).max(100000);
const quoteInput = z.object({
  call_list_id: z.string().uuid().nullable(),
  business_name: z.string().trim().min(1, "Add the business name.").max(200),
  contact_name: z.string().trim().max(120),
  contact_email: z.union([z.literal(""), z.string().trim().email().max(255)]),
  package_name: z.string().trim().max(200),
  package_price: money,
  addons: z.array(z.object({ name: z.string().trim().min(1).max(120), price: money })).max(10),
  membership_name: z.string().trim().max(200),
  membership_price: money,
  membership_free_month: z.boolean().default(false),
  discount_type: z.enum(["none", "amount", "percent"]),
  discount_value: money,
  promo_note: z.string().trim().max(500),
  installments: z.coerce.number().int().min(1).max(MAX_INSTALLMENTS),
});

export const createQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => quoteInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const t = quoteTotals(data);
    if (t.parts.some(p => p > 0 && p < 50) || (t.membership > 0 && t.membership < 50)) throw new Error("Each charge must be at least $0.50, or $0.");
    if (data.membership_price > 0 && !data.membership_name) throw new Error("Name the membership.");
    const db: any = context.supabase;
    const { data: prof } = await db.from("profiles").select("username, email, employee_id").eq("id", context.userId).maybeSingle();
    // Carry the booked appointment and expected-by date from the customer profile onto the order.
    const { data: cust } = data.call_list_id
      ? await db.from("call_list").select("appointment_at, expected_by").eq("id", data.call_list_id).maybeSingle()
      : { data: null };
    const { data: row, error } = await db.from("quotes").insert({
      ...data,
      one_time_total: t.oneTime / 100,
      created_by: context.userId,
      created_by_name: prof?.username || prof?.email || "Team member",
      sales_rep_employee_id: prof?.employee_id ?? "",
      appointment_at: cust?.appointment_at ?? null,
      expected_by: cust?.expected_by ?? null,
    }).select("id").single();
    if (error) throw new Error("Couldn't save the quote. Try again.");
    return { id: row.id as string };
  });

export const listQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTeam(context);
    const { data, error } = await (context.supabase as any).from("quotes").select(COLS).order("created_at", { ascending: false }).limit(300);
    if (error) throw new Error("Couldn't load quotes.");
    return (data ?? []) as Quote[];
  });

export const cancelQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const { error } = await (context.supabase as any).from("quotes").update({ status: "canceled" }).eq("id", data.id).eq("status", "open");
    if (error) throw new Error("Couldn't cancel this quote.");
    return { ok: true };
  });

/** Public: the customer's payment page. The link's random ID is the only key; returns only what the customer sees. */
export const getPublicQuote = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: q } = await (supabaseAdmin as any).from("quotes")
      .select("id, business_name, contact_name, package_name, package_price, addons, membership_name, membership_price, membership_free_month, discount_type, discount_value, installments, installments_paid, status, build_status")
      .eq("id", data.id).maybeSingle();
    return (q ?? null) as null | Pick<Quote, "id" | "business_name" | "contact_name" | "package_name" | "package_price" | "addons" | "membership_name" | "membership_price" | "membership_free_month" | "discount_type" | "discount_value" | "installments" | "installments_paid" | "status"> & { build_status: string };
  });

/** Public: starts checkout for the next unpaid part of a quote. Amounts always come from the saved quote. */
export const createQuoteCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), returnUrl: z.string().url().max(500), environment: z.enum(["sandbox", "live"]) }).parse(d))
  .handler(async ({ data }): Promise<{ clientSecret: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: q } = await (supabaseAdmin as any).from("quotes").select(COLS).eq("id", data.id).maybeSingle();
      if (!q) return { error: "This payment link isn't valid." };
      if (q.status === "canceled") return { error: "This quote was canceled. Please contact Apex Digital Systems." };
      const quote = q as Quote;
      const t = quoteTotals({ ...quote, package_price: Number(quote.package_price), membership_price: Number(quote.membership_price), discount_value: Number(quote.discount_value) });
      const next = quote.installments_paid + 1;
      if (next > t.parts.length) return { error: "This quote is fully paid. Thank you!" };
      const partCents = t.parts[next - 1] ?? 0;
      const withMembership = next === 1 && t.membership > 0;
      const label = t.parts.length > 1 ? `${quote.package_name || "Package"} — payment ${next} of ${t.parts.length}` : (quote.package_name || "Package");
      const stripe = createStripeClient(data.environment);
      const lineItems: any[] = [];
      if (partCents > 0) lineItems.push({ price_data: { currency: "usd", product_data: { name: label }, unit_amount: partCents }, quantity: 1 });
      if (withMembership) lineItems.push({ price_data: { currency: "usd", product_data: { name: quote.membership_name }, unit_amount: t.membership, recurring: { interval: "month" } }, quantity: 1 });
      if (!lineItems.length) return { error: "Nothing is due on this quote." };
      const metadata = { quote_id: quote.id, installment: String(next) };
      const create = (withTax: boolean) => stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: withMembership ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        ...(withTax && { automatic_tax: { enabled: true } }),
        billing_address_collection: "required",
        phone_number_collection: { enabled: true },
        ...(quote.contact_email && { customer_email: quote.contact_email }),
        metadata,
        ...(withMembership
          ? { subscription_data: { metadata, ...(quote.membership_free_month && { trial_period_days: 30 }) } }
          : { customer_creation: "always" as const, payment_intent_data: { description: `${label} — ${quote.business_name}`, metadata, ...(next < t.parts.length && { setup_future_usage: "off_session" as const }) } }),
      });
      let session;
      try { session = await create(true); } catch (e) {
        if (data.environment === "sandbox" && /head office address|tax/i.test(getStripeErrorMessage(e))) session = await create(false);
        else throw e;
      }
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
