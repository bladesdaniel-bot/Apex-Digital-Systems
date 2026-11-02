import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import { cancelQuote, listQuotes } from "@/lib/quotes.functions";
import { OrderBuilder, CopyLink } from "@/components/OrderBuilder";
import { quoteTotals, usd } from "@/lib/quote";
import { ptDate } from "@/lib/visit-format";

type Search = { business?: string | undefined; contact?: string | undefined; call?: string | undefined };

export const Route = createFileRoute("/_authenticated/team/quotes")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    business: typeof s["business"] === "string" ? (s["business"] as string).slice(0, 200) : undefined,
    contact: typeof s["contact"] === "string" ? (s["contact"] as string).slice(0, 120) : undefined,
    call: typeof s["call"] === "string" ? (s["call"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Quote Builder | Apex Digital Systems" },
      { name: "description", content: "Build custom quotes with packages, memberships, add-ons, promos and split payments." },
      { property: "og:title", content: "Quote Builder | Apex Digital Systems" },
      { property: "og:description", content: "Team quote builder and payment links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuotesPage,
});

function QuotesPage() {
  const search = Route.useSearch();
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  const role = me.data?.role;
  const allowed = role === "admin" || role === "telemarketer";
  return (
    <TeamShell isAdmin={role === "admin"}>
      <h1 className="font-display text-4xl font-medium">Quote <span className="gradient-text">builder</span></h1>
      {me.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Checking access…</p> : allowed ? <><OrderBuilder business={search.business} contact={search.contact} callId={search.call} /><QuoteList /></> : <p className="scan-panel mt-8 rounded-2xl p-6 text-sm">Your account doesn't have access to quotes.</p>}
    </TeamShell>
  );
}


const STATUS: Record<string, string> = { open: "Waiting for payment", partially_paid: "Partly paid", paid: "Paid in full", canceled: "Canceled" };

function QuoteList() {
  const list = useServerFn(listQuotes);
  const cancel = useServerFn(cancelQuote);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["quotes"], queryFn: () => list() });
  const cancelM = useMutation({ mutationFn: (id: string) => cancel({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }) });
  if (q.isLoading) return <p className="mt-8 text-sm text-muted-foreground">Loading quotes…</p>;
  if (!q.data?.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-medium">Quotes</h2>
      <ul className="revenue-card mt-4 rounded-2xl">
        {q.data.map(x => {
          const t = quoteTotals({ ...x, package_price: Number(x.package_price), membership_price: Number(x.membership_price), discount_value: Number(x.discount_value) });
          return (
            <li key={x.id} className="grid gap-2 border-t border-border/60 p-4 text-sm first:border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{x.business_name}{x.contact_name && <span className="text-muted-foreground"> · {x.contact_name}</span>}</span>
                <span className="rounded-full border border-border px-3 py-1 text-xs">{STATUS[x.status]}{x.installments > 1 && x.status !== "canceled" ? ` · ${x.installments_paid}/${x.installments} payments` : ""}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {[x.package_name, ...x.addons.map(a => a.name)].filter(Boolean).join(" + ")} · {usd(t.oneTime)}
                {t.discount > 0 && ` (promo −${usd(t.discount)}${x.promo_note ? `: ${x.promo_note}` : ""})`}
                {t.membership > 0 && ` · ${x.membership_name} ${usd(t.membership)}/mo${x.membership_free_month ? " (first month free)" : ""}`}
              </p>
              <p className="text-xs text-muted-foreground">By {x.created_by_name} · {ptDate(x.created_at)}</p>
              {x.status !== "canceled" && x.status !== "paid" && (
                <div className="flex flex-wrap items-center gap-2">
                  <CopyLink link={`${typeof window !== "undefined" ? window.location.origin : ""}/pay/${x.id}`} />
                  {x.status === "open" && <Button size="sm" variant="link" className="h-auto p-0 text-xs text-destructive" onClick={() => { if (confirm("Cancel this quote? Its payment link will stop working.")) cancelM.mutate(x.id); }}>Cancel quote</Button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
