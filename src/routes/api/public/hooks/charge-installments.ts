import { createFileRoute } from "@tanstack/react-router";

// Daily job: charges split-payment parts that are due to the card the customer saved at their first payment.
// Only parts already due are charged, each at most once (due date is pushed forward before charging,
// and Stripe requests use idempotency keys), so an extra call can never charge anything early or twice.
export const Route = createFileRoute("/api/public/hooks/charge-installments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!/^Bearer \S+$/.test(request.headers.get("authorization") ?? "")) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { chargeDueInstallments } = await import("@/lib/installments.server");
        const results = await chargeDueInstallments(supabaseAdmin);
        return Response.json({ processed: results.length });
      },
    },
  },
});
