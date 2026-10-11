import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCheckoutStatus } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string | undefined } => ({
    session_id: typeof search["session_id"] === "string" ? (search["session_id"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Payment status | Apex Digital Systems" },
      { name: "description", content: "Your Apex Digital Systems payment status." },
      { property: "og:title", content: "Payment status | Apex Digital Systems" },
      { property: "og:description", content: "Your Apex Digital Systems payment status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturn,
});

const COPY = {
  paid: { Icon: CheckCircle2, cls: "text-success", title: "Payment received", body: "Thank you! A receipt is on its way to your email, and our team will contact you shortly to get started." },
  processing: { Icon: Clock, cls: "text-warning", title: "Payment processing", body: "Your bank is still confirming the payment. You'll get a receipt by email once it clears." },
  failed: { Icon: XCircle, cls: "text-destructive", title: "No payment found", body: "We couldn't confirm a payment. Please go back to your payment link and try again, or contact Apex Digital Systems." },
} as const;

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const status = useQuery({
    queryKey: ["checkout-status", session_id],
    enabled: !!session_id,
    queryFn: () => getCheckoutStatus({ data: { sessionId: session_id ?? "", environment: getStripeEnvironment() } }),
  });
  const state = !session_id ? "failed" : status.data?.state;
  const c = state ? COPY[state] : null;
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-card max-w-md rounded-2xl p-8 text-center">
        {!c ? <p className="text-sm text-muted-foreground">Checking your payment…</p> : (
          <>
            <c.Icon className={`mx-auto size-12 ${c.cls}`} />
            <h1 className="mt-5 font-display text-2xl font-medium">{c.title}</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{c.body}</p>
          </>
        )}
        <Button asChild className="mt-6"><Link to="/">Back to site</Link></Button>
      </div>
    </main>
  );
}
