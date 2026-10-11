import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import { CANCEL_REASONS, listCancellations, reviewCancellation, submitCancellation } from "@/lib/cancellations.functions";
import { ptDate } from "@/lib/visit-format";

export const Route = createFileRoute("/_authenticated/team/cancellations")({
  head: () => ({
    meta: [
      { title: "Cancellations | Apex Digital Systems" },
      { name: "description", content: "File and review customer cancellation requests." },
      { property: "og:title", content: "Cancellations | Apex Digital Systems" },
      { property: "og:description", content: "Internal cancellation request queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CancellationsPage,
});

const field = "mt-1 w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm";
const tone = { pending: "text-star", approved: "text-destructive", retained: "text-success" } as const;
const statusLabel = { pending: "Pending review", approved: "Canceled", retained: "Retained" } as const;
const scopeLabel = { membership: "Membership", build: "Build order", both: "Membership + build" } as const;

function CancellationsPage() {
  const access = useServerFn(getMyAccess);
  const list = useServerFn(listCancellations);
  const submit = useServerFn(submitCancellation);
  const review = useServerFn(reviewCancellation);
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  const isAdmin = me.data?.role === "admin";
  const data = useQuery({ queryKey: ["cancellations"], queryFn: () => list() });

  const blank = { quoteId: "", businessName: "", contactName: "", contactEmail: "", contactPhone: "", scope: "both" as const, reason: CANCEL_REASONS[0] as string, notes: "", refundType: "none" as const, refundAmount: "" };
  const [f, setF] = useState<{ quoteId: string; businessName: string; contactName: string; contactEmail: string; contactPhone: string; scope: "membership" | "build" | "both"; reason: string; notes: string; refundType: "none" | "partial" | "full"; refundAmount: string }>(blank);
  const [done, setDone] = useState(false);
  const file = useMutation({
    mutationFn: () => submit({ data: { ...f, quoteId: f.quoteId || null, reason: f.reason as (typeof CANCEL_REASONS)[number], refundAmount: Number(f.refundAmount) || 0 } }),
    onSuccess: () => { setF(blank); setDone(true); qc.invalidateQueries({ queryKey: ["cancellations"] }); },
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [warn, setWarn] = useState("");
  const decide = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "retained" }) => review({ data: { ...v, note: notes[v.id] ?? "" } }),
    onSuccess: (r) => { setWarn(r.warnings.join(" ")); qc.invalidateQueries({ queryKey: ["cancellations"] }); },
  });

  const pickQuote = (id: string) => {
    const q = data.data?.quotes.find(x => x.id === id);
    setF(s => ({ ...s, quoteId: id, ...(q ? { businessName: q.business_name, contactName: q.contact_name, contactEmail: q.contact_email } : {}) }));
  };

  return (
    <TeamShell isAdmin={isAdmin}>
      <h1 className="font-display text-4xl font-medium">Cancellation <span className="gradient-text">requests</span></h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">File a request when a customer wants to cancel. Nothing is canceled until the owner reviews it, so there's still time to save the account.</p>

      <form className="scan-panel mt-8 grid gap-4 rounded-2xl p-6 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); setDone(false); file.mutate(); }}>
        <label className="text-sm sm:col-span-2">Customer order (optional)
          <select className={field} value={f.quoteId} onChange={e => pickQuote(e.target.value)}>
            <option value="">— Not linked to an order —</option>
            {data.data?.quotes.map(q => <option key={q.id} value={q.id}>{q.business_name}{q.package_name ? ` · ${q.package_name}` : ""}{q.membership_name ? ` · ${q.membership_name}` : ""}</option>)}
          </select>
        </label>
        <label className="text-sm">Business name<input required className={field} value={f.businessName} onChange={e => setF({ ...f, businessName: e.target.value })} /></label>
        <label className="text-sm">Contact name<input className={field} value={f.contactName} onChange={e => setF({ ...f, contactName: e.target.value })} /></label>
        <label className="text-sm">Email<input type="email" className={field} value={f.contactEmail} onChange={e => setF({ ...f, contactEmail: e.target.value })} /></label>
        <label className="text-sm">Phone<input className={field} value={f.contactPhone} onChange={e => setF({ ...f, contactPhone: e.target.value })} /></label>
        <label className="text-sm">What to cancel
          <select className={field} value={f.scope} onChange={e => setF({ ...f, scope: e.target.value as typeof f.scope })}>
            <option value="membership">Monthly membership</option><option value="build">Website build order</option><option value="both">Both</option>
          </select>
        </label>
        <label className="text-sm">Reason
          <select className={field} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })}>{CANCEL_REASONS.map(r => <option key={r}>{r}</option>)}</select>
        </label>
        <label className="text-sm">Refund
          <select className={field} value={f.refundType} onChange={e => setF({ ...f, refundType: e.target.value as typeof f.refundType })}>
            <option value="none">No refund</option><option value="partial">Partial refund</option><option value="full">Full refund</option>
          </select>
        </label>
        {f.refundType === "partial" && <label className="text-sm">Refund amount ($)<input type="number" min="0" step="0.01" required className={field} value={f.refundAmount} onChange={e => setF({ ...f, refundAmount: e.target.value })} /></label>}
        <label className="text-sm sm:col-span-2">Notes / what the customer said<textarea rows={3} className={field} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></label>
        <div className="sm:col-span-2 flex items-center gap-4">
          <Button type="submit" variant="hero" size="sm" disabled={file.isPending}>{file.isPending ? "Sending…" : "File cancellation request"}</Button>
          {done && <span className="text-sm text-success">Sent — the owner has been notified.</span>}
          {file.error && <span role="alert" className="text-sm text-destructive">{file.error.message}</span>}
        </div>
      </form>

      <div className="revenue-card mt-8 rounded-2xl p-6">
        <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-electric">{isAdmin ? "All requests" : "Your requests"}</p>
        {data.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {data.data?.requests.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No requests yet.</p>}
        {warn && <p role="alert" className="mt-3 text-sm text-destructive">{warn}</p>}
        {decide.error && <p role="alert" className="mt-3 text-sm text-destructive">{decide.error.message}</p>}
        <ul className="mt-4 space-y-4">
          {data.data?.requests.map(c => (
            <li key={c.id} className="border-t border-border/60 pt-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{c.business_name} · {scopeLabel[c.scope]}</span><span className={tone[c.status]}>{statusLabel[c.status]}</span></div>
              <div className="text-xs text-muted-foreground">{[c.contact_name, c.contact_email, c.contact_phone].filter(Boolean).join(" · ")} · Filed {ptDate(c.created_at)} by {c.submitted_by_name} {c.submitted_by_employee_id}</div>
              <div className="mt-1 text-xs">Reason: {c.reason} · Refund: {c.refund_type === "partial" ? `$${Number(c.refund_amount).toFixed(2)}` : c.refund_type === "full" ? "Full" : "None"}</div>
              {c.notes && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{c.notes}</p>}
              {c.review_note && <p className="mt-2 text-xs text-muted-foreground">Owner note: {c.review_note}</p>}
              {isAdmin && c.status === "pending" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input className={`${field} mt-0 max-w-xs`} placeholder="Note (optional)" value={notes[c.id] ?? ""} onChange={e => setNotes({ ...notes, [c.id]: e.target.value })} />
                  <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: c.id, decision: "retained" })}>Retained — keep active</Button>
                  <Button size="sm" disabled={decide.isPending} onClick={() => { if (confirm(`Approve cancellation for ${c.business_name}? This stops their ${scopeLabel[c.scope].toLowerCase()}.`)) decide.mutate({ id: c.id, decision: "approved" }); }}>Approve cancellation</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </TeamShell>
  );
}
