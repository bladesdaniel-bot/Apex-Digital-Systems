import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const env = z.enum(["sandbox", "live"]);

/**
 * Public: a customer asks for their billing page. The link is only ever emailed to the
 * address on file, so typing someone else's email reveals and opens nothing.
 */
export const requestBillingLink = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(255), environment: env }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db: any = supabaseAdmin;
      const { data: m } = await db.from("members").select("stripe_customer_id").ilike("email", data.email).not("stripe_customer_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (m?.stripe_customer_id) {
        const since = new Date(Date.now() - 2 * 60_000).toISOString();
        const { count } = await db.from("billing_links").select("token", { count: "exact", head: true }).eq("stripe_customer_id", m.stripe_customer_id).gte("created_at", since);
        if (!count) {
          const bytes = crypto.getRandomValues(new Uint8Array(32));
          const token = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
          await db.from("billing_links").delete().lt("expires_at", new Date().toISOString());
          await db.from("billing_links").insert({ token, stripe_customer_id: m.stripe_customer_id, stripe_env: data.environment });
          const origin = new URL(getRequest().url).origin;
          const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
          await sendTemplateEmail("billing-link", data.email, { templateData: { link: `${origin}/billing?token=${token}` } });
        }
      }
    } catch (e) {
      console.error("Billing link:", e instanceof Error ? e.message : e);
    }
    return { ok: true as const };
  });

/** Public: opens the billing page for a valid emailed link. */
export const openBillingPortal = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().regex(/^[0-9a-f]{64}$/) }).parse(d))
  .handler(async ({ data }): Promise<{ url: string } | { error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await (supabaseAdmin as any).from("billing_links").select("stripe_customer_id, stripe_env, expires_at").eq("token", data.token).maybeSingle();
    if (!link || new Date(link.expires_at) < new Date()) return { error: "This billing link has expired. Please request a new one." };
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      const stripe = createStripeClient(link.stripe_env);
      const configs = await stripe.billingPortal.configurations.list({ is_default: true, active: true, limit: 1 });
      let configuration = configs.data[0]?.id;
      if (!configuration) {
        configuration = (await stripe.billingPortal.configurations.create({
          business_profile: { headline: "Apex Digital Systems — manage your billing" },
          features: {
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            customer_update: { enabled: true, allowed_updates: ["email", "address", "phone"] },
            subscription_cancel: { enabled: true, mode: "at_period_end" },
          },
        })).id;
      }
      const origin = new URL(getRequest().url).origin;
      const portal = await stripe.billingPortal.sessions.create({ customer: link.stripe_customer_id, configuration, return_url: `${origin}/billing` });
      return { url: portal.url };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

/** Public: tells the thank-you page whether a checkout really went through. */
export const getCheckoutStatus = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().regex(/^cs_[A-Za-z0-9_]+$/).max(300), environment: env }).parse(d))
  .handler(async ({ data }): Promise<{ state: "paid" | "processing" | "failed" }> => {
    const { createStripeClient } = await import("./stripe.server");
    try {
      const s = await createStripeClient(data.environment).checkout.sessions.retrieve(data.sessionId);
      if (s.status === "complete" && s.payment_status !== "unpaid") return { state: "paid" };
      if (s.status === "complete") return { state: "processing" };
      return { state: "failed" };
    } catch {
      return { state: "failed" };
    }
  });
