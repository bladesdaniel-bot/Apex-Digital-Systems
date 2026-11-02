import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const env = z.enum(["sandbox", "live"]);

export const createCyberToolCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ returnUrl: z.string().url().max(500), environment: env, promo: z.string().trim().max(60).optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<{ clientSecret: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    const { CYBER_TOOL_PRICE_ID, CYBER_TOOL_PRODUCT } = await import("./cyber-tool.server");
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [CYBER_TOOL_PRICE_ID] });
      const price = prices.data[0];
      if (!price) return { error: "This product isn't available right now." };
      let promotionCode: string | undefined;
      if (data.promo) {
        const codes = await stripe.promotionCodes.list({ code: data.promo, active: true, limit: 1 });
        promotionCode = codes.data[0]?.id;
        if (!promotionCode) return { error: "That promo code isn't valid or has expired." };
      }
      const metadata = { product: CYBER_TOOL_PRODUCT };
      const base = {
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment" as const,
        ui_mode: "embedded_page" as const,
        return_url: data.returnUrl,
        metadata,
        customer_creation: "always" as const,
        payment_intent_data: { description: "CyberSecurity Tool (Windows)", metadata },
        ...(promotionCode ? { discounts: [{ promotion_code: promotionCode }] } : { allow_promotion_codes: true }),
      };
      let session;
      try {
        session = await stripe.checkout.sessions.create({ ...base, automatic_tax: { enabled: true } });
      } catch (e) {
        if (data.environment === "sandbox" && /head office address|tax/i.test(getStripeErrorMessage(e))) session = await stripe.checkout.sessions.create(base);
        else throw e;
      }
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const getCyberToolDownload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().regex(/^cs_[A-Za-z0-9_]+$/).max(200), environment: env }).parse(d))
  .handler(async ({ data }): Promise<{ url: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    const { CYBER_TOOL_DOWNLOAD_PATH, CYBER_TOOL_PRODUCT } = await import("./cyber-tool.server");
    try {
      const s = await createStripeClient(data.environment).checkout.sessions.retrieve(data.sessionId);
      if (s.metadata?.["product"] !== CYBER_TOOL_PRODUCT) return { error: "This purchase isn't for the CyberSecurity Tool." };
      if (s.status !== "complete" || !["paid", "no_payment_required"].includes(s.payment_status))
        return { error: "We couldn't confirm your payment yet." };
      return { url: CYBER_TOOL_DOWNLOAD_PATH };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
