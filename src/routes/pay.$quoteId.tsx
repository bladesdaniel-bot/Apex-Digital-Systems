import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { PhotoUpload } from "@/components/PhotoUpload";
import { confirmFreeQuote, uploadOrderPhotoCustomer } from "@/lib/orders.functions";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createQuoteCheckout, getPublicQuote } from "@/lib/quotes.functions";
import { quoteTotals, usd } from "@/lib/quote";

export const Route = createFileRoute("/pay/$quoteId")({
  loader: async ({ params }) => {
    if (!/^[0-9a-f-]{36}$/i.test(params.quoteId)) throw notFound();
    const quote = await getPublicQuote({ data: { id: params.quoteId } });
    if (!quote) throw notFound();
    return { quote };
  },
  head: () => ({
    meta: [
      { title: "Your quote | Apex Digital Systems" },
      { name: "description", content: "Review and pay your Apex Digital Systems quote securely." },
      { property: "og:title", content: "Your quote | Apex Digital Systems" },
      { property: "og:description", content: "Review and pay your Apex Digital Systems quote securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => <main className="flex min-h-screen items-center justify-center px-6"><p className="glass-card rounded-2xl p-8 text-sm">This payment link isn't valid. Please contact Apex Digital Systems.</p></main>,
  component: PayPage,
});

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

function PayPage() {
  const { quote: q } = Route.useLoaderData();
  const [paying, setPaying] = useState(false);
  const router = useRouter();
  const [freeErr, setFreeErr] = useState("");
  const t = quoteTotals({ ...q, package_price: Number(q.package_price), membership_price: Number(q.membership_price), discount_value: Number(q.discount_value) });
  const next = q.installments_paid + 1;
  const done = q.status === "paid" || next > t.parts.length;
  const dueNow = (t.parts[next - 1] ?? 0) + (next === 1 && !q.membership_free_month ? t.membership : 0);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-14">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Apex Digital Systems</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Quote for {q.business_name}</h1>
      {q.contact_name && <p className="mt-1 text-sm text-muted-foreground">Prepared for {q.contact_name}</p>}
      <div className="glass-card mt-8 grid gap-2 rounded-2xl p-6 text-sm">
        {q.package_name && Number(q.package_price) > 0 && <Line l={q.package_name} v={usd(Math.round(Number(q.package_price) * 100))} />}
        {q.addons.map((a, i) => <Line key={i} l={a.name} v={usd(Math.round(Number(a.price) * 100))} />)}
        {t.discount > 0 && <Line l="Promo" v={`− ${usd(t.discount)}`} />}
        <Line l="One-time total" v={usd(t.oneTime)} strong />
        {t.parts.length > 1 && <Line l="Payment plan" v={t.parts.map(usd).join(" + ")} />}
        {t.membership > 0 && <Line l={`${q.membership_name} (monthly)`} v={q.membership_free_month ? `First month free, then ${usd(t.membership)}/mo` : `${usd(t.membership)}/mo`} />}
        <p className="text-xs text-muted-foreground">Sales tax is added at checkout where it applies.{t.parts.length > 1 ? " After the first payment, the remaining payments are charged automatically to the same card every 30 days." : ""}{t.membership > 0 ? " The membership renews monthly until canceled." : ""}</p>
      </div>

      {q.status === "canceled" ? <p className="mt-6 text-sm text-destructive">This quote was canceled. Please contact Apex Digital Systems.</p>
        : done ? <p className="mt-6 text-sm text-success">This quote is paid in full. Thank you!</p>
        : t.oneTime === 0 && t.membership === 0 ? (
          <div className="mt-6 grid gap-2">
            <Button variant="hero" size="lg" onClick={async () => { const r = await confirmFreeQuote({ data: { id: q.id } }); if ("error" in r) setFreeErr(r.error ?? ""); else router.invalidate(); }}>Confirm my order — $0 due</Button>
            {freeErr && <p className="text-xs text-destructive">{freeErr}</p>}
          </div>
        )
        : !clientToken ? <p className="mt-6 text-sm text-destructive">Online payments aren't switched on yet. Please contact Apex Digital Systems.</p>
        : paying ? <Checkout id={q.id} />
        : (
          <div className="mt-6 grid gap-2">
            {clientToken.startsWith("pk_test_") && <p className="rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-center text-xs">Test mode — no real money is charged. Use card 4242 4242 4242 4242.</p>}
            <Button variant="hero" size="lg" onClick={() => setPaying(true)}>
              {t.parts.length > 1 ? `Pay payment ${next} of ${t.parts.length} — ${usd(dueNow)}` : `Pay ${usd(dueNow)}`}
            </Button>
            {t.parts.length > 1 && q.installments_paid > 0 && <p className="text-xs text-muted-foreground">{q.installments_paid} of {t.parts.length} payments received.</p>}
          </div>
        )}
      {q.build_status && q.status !== "canceled" && (
        <section className="glass-card mt-8 grid gap-3 rounded-2xl p-6 text-sm">
          <h2 className="font-display text-lg">Send us photos for your project</h2>
          <p className="text-muted-foreground">Logos, storefront pictures, team photos or examples you like. Up to 100 MB each.</p>
          <PhotoUpload label="Upload photos" upload={async f => { const r = await uploadOrderPhotoCustomer({ data: { quoteId: q.id, file: f } }); if ("error" in r) throw new Error(r.error); }} />
        </section>
      )}
    </main>
  );
}

function Line({ l, v, strong }: { l: string; v: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "font-medium" : ""}`}><span className="text-muted-foreground">{l}</span><span>{v}</span></div>;
}

function Checkout({ id }: { id: string }) {
  const options = useMemo(() => ({
    fetchClientSecret: async () => {
      const r = await createQuoteCheckout({ data: { id, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}` } });
      if ("error" in r) throw new Error(r.error);
      return r.clientSecret;
    },
  }), [id]);
  return (
    <div className="mt-6 overflow-hidden rounded-xl bg-white">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}><EmbeddedCheckout /></EmbeddedCheckoutProvider>
    </div>
  );
}
