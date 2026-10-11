import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TeamShell } from "@/components/TeamShell";
import { PhotoUpload } from "@/components/PhotoUpload";
import { getMyAccess } from "@/lib/team.functions";
import { BUILD_STATUSES, chargeNextPaymentNow, deleteOrderPhoto, enterOrderSale, listBuildOrders, updateBuildOrder, uploadOrderPhotoTeam, type BuildOrder, type BuildStatus } from "@/lib/orders.functions";
import { quoteTotals, usd } from "@/lib/quote";
import { ptDate, ptTime } from "@/lib/visit-format";
import { addressMapsUrl } from "@/lib/geo";
import { safeHttpUrl } from "@/lib/call-list";

export const Route = createFileRoute("/_authenticated/team/orders")({
  head: () => ({
    meta: [
      { title: "Build Orders | Apex Digital Systems" },
      { name: "description", content: "Paid sales ready for execution, with customer details and photos." },
      { property: "og:title", content: "Build Orders | Apex Digital Systems" },
      { property: "og:description", content: "Paid sales ready for execution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

const LABEL: Record<BuildStatus, string> = { new: "New", in_progress: "In progress", delivered: "Delivered" };

function OrdersPage() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  const role = me.data?.role;
  const allowed = role === "admin" || role === "telemarketer";
  const list = useServerFn(listBuildOrders);
  const orders = useQuery({ queryKey: ["build-orders"], queryFn: () => list(), enabled: allowed, refetchInterval: 60_000 });
  const [filter, setFilter] = useState<BuildStatus | "all">("all");
  const shown = (orders.data ?? []).filter(o => filter === "all" || o.build_status === filter);
  return (
    <TeamShell isAdmin={role === "admin"}>
      <h1 className="font-display text-4xl font-medium">Build <span className="gradient-text">orders</span></h1>
      <p className="mt-2 text-sm text-muted-foreground">Sales show up here as soon as the first payment clears (or a $0 order is confirmed).</p>
      {me.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Checking access…</p> : !allowed ? <p className="scan-panel mt-8 rounded-2xl p-6 text-sm">Your account doesn't have access to orders.</p> : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {(["all", ...BUILD_STATUSES] as const).map(s => (
              <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
                {s === "all" ? "All" : LABEL[s]} ({(orders.data ?? []).filter(o => s === "all" || o.build_status === s).length})
              </Button>
            ))}
          </div>
          {orders.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
            : orders.error ? <p className="mt-6 text-sm text-destructive">{(orders.error as Error).message}</p>
            : !shown.length ? <p className="scan-panel mt-6 rounded-2xl p-6 text-sm">No build orders yet.</p>
            : <div className="mt-6 grid gap-4">{shown.map(o => <OrderCard key={o.id} o={o} isAdmin={role === "admin"} />)}</div>}
        </>
      )}
    </TeamShell>
  );
}

function OrderCard({ o, isAdmin }: { o: BuildOrder; isAdmin: boolean }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["build-orders"] });
  const save = useServerFn(updateBuildOrder);
  const up = useServerFn(uploadOrderPhotoTeam);
  const del = useServerFn(deleteOrderPhoto);
  const [notes, setNotes] = useState(o.build_notes);
  const enter = useServerFn(enterOrderSale);
  const [saleAmt, setSaleAmt] = useState("");
  const saleM = useMutation({ mutationFn: () => enter({ data: { id: o.id, saleAmount: Number(saleAmt) } }), onSuccess: () => { setSaleAmt(""); refresh(); } });
  const charge = useServerFn(chargeNextPaymentNow);
  const chargeM = useMutation({ mutationFn: () => charge({ data: { id: o.id } }), onSettled: refresh });
  const m = useMutation({ mutationFn: (s: BuildStatus) => save({ data: { id: o.id, build_status: s, build_notes: notes } }), onSuccess: refresh });
  const t = quoteTotals({ ...o, package_price: Number(o.package_price), membership_price: Number(o.membership_price), discount_value: Number(o.discount_value) });
  const p = o.profile;
  const site = p?.website ? safeHttpUrl(p.website) : null;
  const Row = ({ l, v }: { l: string; v?: React.ReactNode }) => v ? <p><span className="text-muted-foreground">{l}: </span>{v}</p> : null;
  return (
    <article className="glass-card rounded-2xl p-5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl">{o.business_name}</h2>
          <p className="text-xs text-muted-foreground">Ready {ptDate(o.build_ready_at)} · sold by {o.created_by_name || "—"}{o.sales_rep_employee_id && ` (${o.sales_rep_employee_id})`}</p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs">{LABEL[o.build_status]}</span>
      </div>
      <div className="mt-4 grid gap-1 sm:grid-cols-2">
        <Row l="Sales rep ID" v={o.sales_rep_employee_id} />
        <Row l="Appointment" v={o.appointment_at && `${ptDate(o.appointment_at)} at ${ptTime(o.appointment_at)} PT`} />
        <Row l="Expected by" v={o.expected_by} />
        <Row l="Contact" v={[o.contact_name, p?.contact_role].filter(Boolean).join(", ")} />
        <Row l="Email" v={o.contact_email && <a className="text-electric" href={`mailto:${o.contact_email}`}>{o.contact_email}</a>} />
        <Row l="Phone" v={p?.phone && <a className="text-electric" href={`tel:${p.phone}`}>{p.phone}</a>} />
        <Row l="Address" v={p?.address && <a className="text-electric" href={addressMapsUrl(p.address)} target="_blank" rel="noopener noreferrer">{p.address}</a>} />
        <Row l="Website" v={p?.website && (site ? <a className="text-electric" href={site} target="_blank" rel="noopener noreferrer">{p.website}</a> : p.website)} />
        <Row l="Package" v={o.package_name ? `${o.package_name} (${usd(Math.round(Number(o.package_price) * 100))})` : ""} />
        <Row l="Add-ons" v={o.addons.map(a => a.name).join(", ")} />
        <Row l="Membership" v={t.membership > 0 ? `${o.membership_name} ${usd(t.membership)}/mo${o.membership_free_month ? " (first month free)" : ""}` : ""} />
        <Row l="Promo" v={t.discount > 0 ? `${usd(t.discount)} off${o.promo_note ? ` — ${o.promo_note}` : ""}` : ""} />
        <Row l="One-time total" v={usd(t.oneTime)} />
        <Row l="Payments" v={t.oneTime === 0 ? "$0 order" : `${o.installments_paid} of ${t.parts.length} received`} />
        <Row l="Next automatic charge" v={o.installments_paid < o.installments && !o.refunded_at ? (o.next_installment_at ? ptDate(o.next_installment_at) : o.stripe_payment_method_id ? "Stopped — card declined" : "No saved card") : ""} />
        <Row l="Last charge problem" v={o.last_charge_error} />
        <Row l="Refunded" v={o.refunded_at && ptDate(o.refunded_at)} />
        <Row l="Budget" v={p?.budget} />
        <Row l="Rep commission" v={o.commission ? `${usd(Math.round(o.commission.commission_amount * 100))} on ${usd(Math.round(o.commission.sale_amount * 100))} sale (${o.commission.status})` : ""} />
      </div>
      {isAdmin && o.stripe_payment_method_id && o.installments_paid > 0 && o.installments_paid < o.installments && !o.refunded_at && o.status !== "canceled" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
          <span className="text-xs text-muted-foreground">Payment {o.installments_paid + 1} of {o.installments} is charged automatically. Charge it now instead:</span>
          <Button size="sm" disabled={chargeM.isPending} onClick={() => { if (confirm("Charge the customer's saved card now?")) chargeM.mutate(); }}>{chargeM.isPending ? "Charging…" : "Charge next payment now"}</Button>
          {chargeM.error && <p className="w-full text-xs text-destructive">{(chargeM.error as Error).message}</p>}
          {chargeM.data && <p className="w-full text-xs text-success">Charged {chargeM.data.charged}.</p>}
        </div>
      )}
      {isAdmin && !o.commission && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
          <span className="text-xs text-muted-foreground">No commission yet — enter the sale amount to pay the rep:</span>
          <input type="number" min="1" step="0.01" value={saleAmt} onChange={e => setSaleAmt(e.target.value)} placeholder="Sale $" aria-label="Sale amount" className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm" />
          <Button size="sm" disabled={!(Number(saleAmt) > 0) || saleM.isPending} onClick={() => saleM.mutate()}>{saleM.isPending ? "Saving…" : "Record sale"}</Button>
          {saleM.error && <p className="w-full text-xs text-destructive">{(saleM.error as Error).message}</p>}
        </div>
      )}
      {(p?.needs || p?.profile_notes) && (
        <div className="mt-3 grid gap-1 rounded-xl border border-border p-3">
          <Row l="Needs" v={p?.needs} />
          <Row l="Caller notes" v={p?.profile_notes} />
        </div>
      )}
      <div className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Photos ({o.photos.length})</p>
        {o.photos.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {o.photos.map(ph => (
              <figure key={ph.id} className="relative">
                <a href={ph.url} target="_blank" rel="noopener noreferrer"><img src={ph.url} alt={ph.file_name || "Order photo"} className="aspect-square w-full rounded-lg object-cover" loading="lazy" /></a>
                <figcaption className="mt-1 truncate text-[10px] text-muted-foreground">{ph.source} · {ph.uploaded_by_name}</figcaption>
                {isAdmin && <button className="absolute right-1 top-1 rounded bg-background/80 px-1 text-xs" aria-label="Remove photo" onClick={async () => { if (confirm("Remove this photo?")) { await del({ data: { id: ph.id } }); refresh(); } }}>✕</button>}
              </figure>
            ))}
          </div>
        )}
        <PhotoUpload upload={async f => { await up({ data: { quoteId: o.id, file: f } }); }} onDone={refresh} />
      </div>
      {isAdmin && (
        <div className="mt-4 grid gap-2">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={4000} rows={2} placeholder="Build notes (owner only)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" aria-label="Build notes" />
          <div className="flex flex-wrap gap-2">
            {BUILD_STATUSES.map(s => <Button key={s} size="sm" variant={o.build_status === s ? "default" : "outline"} disabled={m.isPending} onClick={() => m.mutate(s)}>{LABEL[s]}</Button>)}
          </div>
          {m.error && <p className="text-xs text-destructive">{(m.error as Error).message}</p>}
        </div>
      )}
      {!isAdmin && o.build_notes && <p className="mt-3 text-xs text-muted-foreground">Owner notes: {o.build_notes}</p>}
    </article>
  );
}
