import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PhotoUpload, isPdfFile } from "@/components/PhotoUpload";
import { supabase } from "@/integrations/supabase/client";
import { clientAdFundsCheckout, clientSubmitRequest, clientUploadFile, getClientPortal, type PortalOrder } from "@/lib/client-portal.functions";
import { ptDate, ptTime } from "@/lib/visit-format";
import { usd } from "@/lib/quote";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { AD_FUND_PRESETS, adFundBalance, validAdFundAmount } from "@/lib/ad-funds";

export const Route = createFileRoute("/client/")({
  head: () => ({
    meta: [
      { title: "My Project Portal | Apex Digital Systems" },
      { name: "description", content: "Your Apex Digital Systems orders, signed agreements, files, change requests and activity." },
      { property: "og:title", content: "My Project Portal | Apex Digital Systems" },
      { property: "og:description", content: "Customer project portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientPortal,
});

/** Paste the "Ask for reviews" link from the Google Business Profile here once it's verified. */
const GOOGLE_REVIEW_URL = "";
const reviewHref = GOOGLE_REVIEW_URL || "https://www.google.com/search?q=" + encodeURIComponent("Apex Digital Systems Reno NV reviews");

const STATUS: Record<string, string> = { on_hold: "Waiting on your info", new: "Order received", in_progress: "In progress", delivered: "Delivered" };
const SOURCE: Record<string, string> = { signed: "Signed agreement", customer: "Your upload", client: "Your upload" };

function ClientPortal() {
  const navigate = useNavigate();
  const [session, setSession] = useState<boolean | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSession(!!data.session)); }, []);
  const get = useServerFn(getClientPortal);
  const portal = useQuery({ queryKey: ["client-portal"], queryFn: () => get(), enabled: session === true, retry: false });
  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/client/login" }); };

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-medium">My <span className="gradient-text">project portal</span></h1>
        {session && <Button size="sm" variant="outline" onClick={signOut}>Sign out</Button>}
      </div>
      {session === null ? <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        : !session ? <p className="scan-panel mt-6 rounded-2xl p-6 text-sm">Please <Link to="/client/login" className="text-electric">sign in</Link> to see your project.</p>
        : portal.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading your project…</p>
        : portal.error ? <p className="scan-panel mt-6 rounded-2xl p-6 text-sm text-destructive">{(portal.error as Error).message}</p>
        : <>
            <p className="mt-2 text-sm text-muted-foreground">Welcome, {portal.data?.name}. Everything for your project is kept here.</p>
            {!portal.data?.orders.length ? <p className="scan-panel mt-6 rounded-2xl p-6 text-sm">No orders on your account yet.</p>
              : <div className="mt-6 grid gap-6">{portal.data.orders.map(o => <OrderPanel key={o.id} o={o} />)}</div>}
          </>}
    </main>
  );
}

function OrderPanel({ o }: { o: PortalOrder }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["client-portal"] });
  const up = useServerFn(clientUploadFile);
  const send = useServerFn(clientSubmitRequest);
  const [msg, setMsg] = useState("");
  const req = useMutation({ mutationFn: () => send({ data: { quoteId: o.id, message: msg } }), onSuccess: () => { setMsg(""); refresh(); } });
  const owing = o.installments_paid < o.installments && o.one_time_total > 0 && o.status !== "canceled";
  const signed = o.files.filter(f => f.source === "signed");
  const mine = o.files.filter(f => f.source !== "signed");
  const Files = ({ list }: { list: PortalOrder["files"] }) => (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {list.map(f => (
        <figure key={f.id}>
          <a href={f.url} target="_blank" rel="noopener noreferrer" download={f.file_name}>{isPdfFile(f.file_name, f.url) ? <span className="grid aspect-square w-full place-items-center rounded-lg border border-border text-xs font-medium">PDF</span> : <img src={f.url} alt={f.file_name || SOURCE[f.source] || "File"} className="aspect-square w-full rounded-lg object-cover" loading="lazy" />}</a>
          <figcaption className="mt-1 truncate text-[10px] text-muted-foreground">{ptDate(f.created_at)}</figcaption>
        </figure>
      ))}
    </div>
  );
  return (
    <article className="glass-card rounded-2xl p-5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl">{o.business_name}</h2>
          <p className="text-xs text-muted-foreground">{o.package_name || "Custom project"}{o.addons?.length ? ` + ${o.addons.map(a => a.name).join(", ")}` : ""}</p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs">{o.status === "canceled" ? "Canceled" : STATUS[o.build_status] ?? "Estimate"}</span>
      </div>
      <div className="mt-3 grid gap-1 sm:grid-cols-2">
        <p><span className="text-muted-foreground">Estimate total: </span>{usd(Math.round(o.one_time_total * 100))}</p>
        {o.membership_name && <p><span className="text-muted-foreground">Membership: </span>{o.membership_name}</p>}
        <p><span className="text-muted-foreground">Payments: </span>{o.one_time_total === 0 ? "Nothing due" : `${o.installments_paid} of ${o.installments} received`}</p>
        {o.expected_by && <p><span className="text-muted-foreground">Expected by: </span>{o.expected_by}</p>}
        {o.created_by_name && <p><span className="text-muted-foreground">Your rep: </span>{o.created_by_name}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {owing && <Button asChild size="sm"><a href={`/pay/${o.id}`}>Make a payment</a></Button>}
        <Button asChild size="sm" variant="outline"><Link to="/billing">Billing & receipts</Link></Button>
        <Button asChild size="sm" variant="outline"><a href={reviewHref} target="_blank" rel="noopener noreferrer">★ Leave us a Google review</a></Button>
      </div>

      {o.status !== "canceled" && <AdFunds o={o} />}

      <section className="mt-5">
        <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Receipts ({o.receipts.length})</h3>
        {!o.receipts.length ? <p className="text-xs text-muted-foreground">Receipts for your payments will be saved here.</p> : (
          <ul className="grid gap-2">
            {o.receipts.map(r => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                <span>{usd(Math.round(r.amount * 100))} · {ptDate(r.created_at)}{r.invoice_number ? ` · Invoice ${r.invoice_number}` : ""}</span>
                <span className="flex gap-3 text-xs">
                  {r.receipt_url && <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="text-electric hover:underline">View receipt ↗</a>}
                  {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="text-electric hover:underline">Download PDF ↗</a>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Signed agreement ({signed.length})</h3>
        {signed.length ? <Files list={signed} /> : <p className="text-xs text-muted-foreground">Your signed copy will appear here once your rep uploads it.</p>}
      </section>

      <section className="mt-5">
        <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Your files ({mine.length})</h3>
        <p className="mb-2 text-xs text-muted-foreground">Send us photos, logos, documents or anything else you want on your project — we'll be notified each time you add one.</p>
        {mine.length > 0 && <div className="mb-3"><Files list={mine} /></div>}
        <PhotoUpload label="Upload photos or documents" allowPdf upload={async f => { await up({ data: { quoteId: o.id, file: f } }); }} onDone={refresh} />
      </section>

      <section className="mt-5">
        <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Request a change</h3>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} maxLength={4000} rows={3} placeholder="Tell us what you'd like changed…" aria-label="Change request" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <Button size="sm" className="mt-2" disabled={msg.trim().length < 3 || req.isPending} onClick={() => req.mutate()}>{req.isPending ? "Sending…" : "Send request"}</Button>
        {req.isSuccess && <p className="mt-1 text-xs text-muted-foreground">Sent — we've been notified.</p>}
        {req.error && <p className="mt-1 text-xs text-destructive">{(req.error as Error).message}</p>}
        {o.requests.length > 0 && (
          <ul className="mt-3 grid gap-2">
            {o.requests.map(r => <li key={r.id} className="rounded-xl border border-border p-3"><p className="whitespace-pre-wrap">{r.message}</p><p className="mt-1 text-xs text-muted-foreground">{ptDate(r.created_at)} · {r.status === "done" ? "Completed" : "Open"}</p></li>)}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Activity</h3>
        {!o.activity.length ? <p className="text-xs text-muted-foreground">No activity yet.</p> : (
          <ol className="grid gap-1 border-l border-border pl-4">
            {o.activity.map(a => <li key={a.id}><span className="text-xs text-muted-foreground">{ptDate(a.created_at)} {ptTime(a.created_at)} · </span>{a.summary}{a.actor_name && <span className="text-xs text-muted-foreground"> — {a.actor_name}</span>}</li>)}
          </ol>
        )}
      </section>
    </article>
  );
}

function AdFunds({ o }: { o: PortalOrder }) {
  const [amount, setAmount] = useState("500");
  const [paying, setPaying] = useState(false);
  const checkout = useServerFn(clientAdFundsCheckout);
  const n = Number(amount);
  const ok = validAdFundAmount(n);
  const options = useMemo(() => ({
    fetchClientSecret: async () => {
      const r = await checkout({ data: { quoteId: o.id, amount: n, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}` } });
      if ("error" in r) throw new Error(r.error);
      return r.clientSecret;
    },
  }), [o.id, n, checkout]);
  return (
    <section className="mt-5 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Prepaid ad funds</h3>
        <p className="font-display text-lg">{usd(Math.round(adFundBalance(o.adFunds) * 100))} <span className="text-xs text-muted-foreground">added</span></p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Add money toward your ad campaign. It goes straight to your ad spend and we're notified each time.</p>
      {paying ? (
        <div className="mt-3 grid gap-2">
          <div className="overflow-hidden rounded-xl bg-white"><EmbeddedCheckoutProvider stripe={getStripe()} options={options}><EmbeddedCheckout /></EmbeddedCheckoutProvider></div>
          <Button size="sm" variant="outline" onClick={() => setPaying(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          <div className="flex flex-wrap gap-2">
            {AD_FUND_PRESETS.map(p => <Button key={p} size="sm" variant={n === p ? "default" : "outline"} onClick={() => setAmount(String(p))}>{usd(p * 100)}</Button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor={`ad-${o.id}`}>Amount $</label>
            <input id={`ad-${o.id}`} type="number" min={25} max={25000} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            <Button size="sm" disabled={!ok} onClick={() => setPaying(true)}>Add {ok ? usd(Math.round(n * 100)) : "funds"}</Button>
          </div>
          {!ok && <p className="text-xs text-destructive">Enter $25 to $25,000.</p>}
        </div>
      )}
      {o.adFunds.length > 0 && (
        <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
          {o.adFunds.map(f => <li key={f.id}>{usd(Math.round(f.amount * 100))} · {ptDate(f.paid_at ?? f.created_at)}</li>)}
        </ul>
      )}
    </section>
  );
}
