import { OWNER_EMAIL } from "@/lib/owner-email";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUseBrief, type TeamRole } from "./team-access";

export const CANCEL_REASONS = ["Budget / financial", "Business paused or closed", "Switched provider", "Unhappy with design or service", "Other"] as const;
export type Cancellation = {
  id: string; quote_id: string | null; business_name: string; contact_name: string; contact_email: string; contact_phone: string;
  scope: "membership" | "build" | "both"; reason: string; notes: string; refund_type: "none" | "partial" | "full"; refund_amount: number;
  status: "pending" | "approved" | "retained"; submitted_by_name: string; submitted_by_employee_id: string; review_note: string;
  reviewed_at: string | null; created_at: string;
};

async function roleOf(ctx: any): Promise<TeamRole | null> {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).maybeSingle();
  return (data?.role as TeamRole | undefined) ?? null;
}

export const listCancellations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!canUseBrief(await roleOf(context))) throw new Error("Team members only.");
    const db: any = context.supabase;
    const [{ data, error }, { data: quotes }] = await Promise.all([
      db.from("cancellations").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("quotes").select("id, business_name, contact_name, contact_email, status, package_name, membership_name").neq("status", "canceled").order("created_at", { ascending: false }).limit(300),
    ]);
    if (error) throw new Error("Couldn't load cancellations.");
    return { requests: (data ?? []) as Cancellation[], quotes: (quotes ?? []) as { id: string; business_name: string; contact_name: string; contact_email: string; status: string; package_name: string; membership_name: string }[] };
  });

export const submitCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    quoteId: z.string().uuid().nullable(),
    businessName: z.string().trim().min(1).max(200),
    contactName: z.string().trim().max(120), contactEmail: z.string().trim().max(255), contactPhone: z.string().trim().max(40),
    scope: z.enum(["membership", "build", "both"]),
    reason: z.enum(CANCEL_REASONS), notes: z.string().trim().max(4000),
    refundType: z.enum(["none", "partial", "full"]), refundAmount: z.number().min(0).max(1_000_000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (!canUseBrief(await roleOf(context))) throw new Error("Team members only.");
    const db: any = context.supabase;
    const { data: me } = await db.from("profiles").select("username, email, employee_id").eq("id", context.userId).maybeSingle();
    const name = me?.username || me?.email || "Team member";
    const { data: row, error } = await db.from("cancellations").insert({
      quote_id: data.quoteId, business_name: data.businessName, contact_name: data.contactName, contact_email: data.contactEmail,
      contact_phone: data.contactPhone, scope: data.scope, reason: data.reason, notes: data.notes, refund_type: data.refundType,
      refund_amount: data.refundType === "partial" ? data.refundAmount : 0,
      submitted_by: context.userId, submitted_by_name: name, submitted_by_employee_id: me?.employee_id ?? "",
    }).select("id").single();
    if (error) throw new Error("Couldn't file the request.");
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const scopeLabel = { membership: "Monthly membership", build: "Website build order", both: "Membership and build order" }[data.scope];
      const refund = data.refundType === "partial" ? `Partial — $${data.refundAmount.toFixed(2)}` : data.refundType === "full" ? "Full refund" : "No refund";
      await sendTemplateEmail("team-alert", OWNER_EMAIL, {
        idempotencyKey: `cancel-${row.id}`,
        templateData: {
          title: `Cancellation request: ${data.businessName}`,
          intro: "A teammate filed a cancellation. It's waiting for your review — you can still try to save the account.",
          lines: [
            { label: "Customer", value: [data.contactName, data.contactEmail, data.contactPhone].filter(Boolean).join(" · ") },
            { label: "Cancel", value: scopeLabel }, { label: "Reason", value: data.reason }, { label: "Notes", value: data.notes },
            { label: "Refund", value: refund }, { label: "Filed by", value: `${name}${me?.employee_id ? ` (${me.employee_id})` : ""}` },
          ],
          link: "https://apexdigitalsystems.org/team/cancellations", linkLabel: "Review request",
        },
      });
    } catch (e) { console.error("Cancellation alert failed:", e instanceof Error ? e.message : e); }
    return { ok: true };
  });

export const reviewCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), decision: z.enum(["approved", "retained"]), note: z.string().trim().max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await roleOf(context)) !== "admin") throw new Error("Admins only.");
    const db: any = context.supabase;
    const { data: c } = await db.from("cancellations").select("*").eq("id", data.id).maybeSingle();
    if (!c) throw new Error("Request not found.");
    if (c.status !== "pending") throw new Error("This request was already reviewed.");
    const warnings: string[] = [];
    if (data.decision === "approved" && c.quote_id) {
      const { data: q } = await db.from("quotes").select("id, stripe_env, stripe_customer_id").eq("id", c.quote_id).maybeSingle();
      if (q && (c.scope === "build" || c.scope === "both")) {
        // Stops further automatic split-payment charges too.
        await db.from("quotes").update({ status: "canceled", next_installment_at: null }).eq("id", q.id);
      }
      if (q && (c.scope === "membership" || c.scope === "both") && q.stripe_customer_id) {
        try {
          const { createStripeClient } = await import("./stripe.server");
          const stripe = createStripeClient((q.stripe_env === "live" ? "live" : "sandbox"));
          const subs = await stripe.subscriptions.list({ customer: q.stripe_customer_id, status: "active", limit: 20 });
          const trials = await stripe.subscriptions.list({ customer: q.stripe_customer_id, status: "trialing", limit: 20 });
          for (const s of [...subs.data, ...trials.data]) await stripe.subscriptions.cancel(s.id);
          await db.from("members").update({ status: "canceled" }).eq("stripe_customer_id", q.stripe_customer_id);
        } catch (e) {
          console.error("Subscription cancel failed:", e instanceof Error ? e.message : e);
          warnings.push("The monthly plan couldn't be canceled automatically — cancel it from the payments area.");
        }
      }
    }
    const { error } = await db.from("cancellations").update({ status: data.decision, review_note: data.note, reviewed_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error("Couldn't save the decision.");
    return { ok: true, warnings };
  });
