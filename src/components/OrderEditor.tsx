import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { editBuildOrder, type BuildOrder } from "@/lib/orders.functions";
import { MAX_INSTALLMENTS, QUOTE_ADDON_OPTIONS, QUOTE_PACKAGES, QUOTE_MEMBERSHIPS, quoteTotals, usd, type Addon, type DiscountType } from "@/lib/quote";
import { noPackageFields, orderBusinessName } from "@/lib/order-draft";

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const area = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/** Converts an ISO time to the value a datetime-local input expects (in the viewer's local time). */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function OrderEditor({ o, onDone }: { o: BuildOrder; onDone: () => void }) {
  const save = useServerFn(editBuildOrder);
  const locked = o.installments_paid > 0;
  const [f, setF] = useState({
    business_name: o.business_name, contact_name: o.contact_name, contact_email: o.contact_email, customer_url: o.customer_url ?? "", customer_address: o.customer_address ?? "",
    customer_phone: o.customer_phone || o.profile?.phone || "",
    package_name: o.package_name, package_details: o.package_details ?? "", package_price: Number(o.package_price),
    membership_name: o.membership_name, membership_price: Number(o.membership_price), membership_free_month: o.membership_free_month,
    discount_type: o.discount_type as DiscountType, discount_value: Number(o.discount_value), promo_note: o.promo_note,
    installments: o.installments,
    appointment: toLocalInput(o.appointment_at), expected_by: o.expected_by ?? "",
    needs: o.profile?.needs ?? "", profile_notes: o.profile?.profile_notes ?? "",
  });
  const [addons, setAddons] = useState<Addon[]>(o.addons.map(a => ({ ...a, price: Number(a.price) })));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }));
  const t = quoteTotals({ package_price: f.package_price, addons, membership_price: f.membership_price, discount_type: f.discount_type, discount_value: f.discount_value, installments: f.installments });
  const m = useMutation({
    mutationFn: () => save({ data: {
      id: o.id, business_name: orderBusinessName.parse(f.business_name), contact_name: f.contact_name, contact_email: f.contact_email, customer_url: f.customer_url, customer_address: f.customer_address, customer_phone: f.customer_phone,
      package_name: f.package_name, package_details: f.package_details, package_price: f.package_price, addons: addons.filter(a => a.name.trim()),
      membership_name: f.membership_name, membership_price: f.membership_price, membership_free_month: f.membership_free_month,
      discount_type: f.discount_type, discount_value: f.discount_value, promo_note: f.promo_note, installments: f.installments,
      appointment_at: f.appointment ? new Date(f.appointment).toISOString() : null,
      expected_by: f.expected_by || null, needs: f.needs, profile_notes: f.profile_notes,
    } }),
    onSuccess: onDone,
  });
  const submit = (e: FormEvent) => { e.preventDefault(); m.mutate(); };

  return (
    <form onSubmit={submit} className="mt-4 grid min-w-0 gap-4 rounded-xl border border-border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Edit order</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs">Business name<Input required={locked} value={f.business_name} onChange={e => set("business_name", e.target.value)} maxLength={200} /></label>
        <label className="grid gap-1 text-xs">Contact name<Input value={f.contact_name} onChange={e => set("contact_name", e.target.value)} maxLength={120} /></label>
        <label className="grid gap-1 text-xs">Customer email<Input type="email" value={f.contact_email} onChange={e => set("contact_email", e.target.value)} maxLength={255} /></label>
        <label className="grid gap-1 text-xs sm:col-span-3">Customer phone<Input type="tel" value={f.customer_phone} onChange={e => set("customer_phone", e.target.value)} maxLength={40} placeholder="(775) 555-0123" /></label>
        <label className="grid gap-1 text-xs sm:col-span-3">Customer website URL<Input type="url" value={f.customer_url} onChange={e => set("customer_url", e.target.value)} maxLength={500} placeholder="https://… (kept on the order for your records)" /></label>
        <label className="grid gap-1 text-xs sm:col-span-3">Business address<Input value={f.customer_address} onChange={e => set("customer_address", e.target.value)} maxLength={300} placeholder="Street, city, state, ZIP" /></label>
      </div>

      {locked ? (
        <p className="text-xs text-muted-foreground">A payment has already been received, so the price and payment plan are locked. Contact info, dates and notes can still be changed.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <select aria-label="Choose package" className={`${sel} sm:col-span-2`} value={f.package_name || "none"} onChange={e => { if (e.target.value === "none") { setF(x => ({ ...x, ...noPackageFields })); return; } const p = QUOTE_PACKAGES.find(x => x.name === e.target.value); if (p) setF(x => ({ ...x, package_name: p.name, package_price: p.price, ...(p.monthlyAmount ? { membership_name: p.name.replace(/ \(setup\)$/, ""), membership_price: p.monthlyAmount } : {}) })); }}><option value="none">No package yet</option>{f.package_name && !QUOTE_PACKAGES.some(p => p.name === f.package_name) && <option value={f.package_name}>{f.package_name}</option>}{QUOTE_PACKAGES.map(p => <option key={p.name} value={p.name}>{p.name} — ${p.price}</option>)}</select>
            <label className="grid gap-1 text-xs">Package<Input value={f.package_name} onChange={e => set("package_name", e.target.value)} maxLength={200} placeholder="Package name" /></label>
            <label className="grid gap-1 text-xs">Package price<Input type="number" min={0} step="0.01" value={f.package_price} onChange={e => set("package_price", Number(e.target.value))} /></label>
            <label className="grid gap-1 text-xs sm:col-span-3">What's included<textarea className={area} value={f.package_details} onChange={e => set("package_details", e.target.value)} rows={2} maxLength={4000} placeholder="What the package includes (e.g. 5-page website, logo, first month of care)" /></label>
          </div>
          <div className="grid gap-2">
            <span className="text-xs">Add-ons</span>
            <select aria-label="Add a listed add-on" className={sel} value="" onChange={e => { const a = QUOTE_ADDON_OPTIONS.find(x => x.name === e.target.value); if (a && addons.length < 10) setAddons(xs => [...xs, { ...a }]); }}><option value="">Choose a monthly add-on…</option>{QUOTE_ADDON_OPTIONS.map(a => <option key={a.name} value={a.name}>{a.name} — {a.price ? `$${a.price}/mo` : "your budget"}</option>)}</select>
            {addons.map((a, i) => (
              <div key={i} className="grid grid-cols-[1fr_7rem_auto] gap-2">
                <Input value={a.name} onChange={e => setAddons(xs => xs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} maxLength={120} aria-label={`Add-on ${i + 1} name`} />
                <Input type="number" min={0} step="0.01" value={a.price} onChange={e => setAddons(xs => xs.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} aria-label={`Add-on ${i + 1} price`} />
                <Button type="button" variant="outline" size="sm" onClick={() => setAddons(xs => xs.filter((_, j) => j !== i))}>Remove</Button>
                <select className={`${sel} col-span-3`} aria-label={`Add-on ${i + 1} billing`} value={`${a.cadence ?? "one_time"}:${a.category ?? "service"}`} onChange={e => { const [cadence, category] = e.target.value.split(":"); setAddons(xs => xs.map((x, j) => j === i ? { ...x, cadence: cadence as Addon["cadence"], category: category as Addon["category"] } : x)); }}><option value="one_time:service">One-time service · 30%</option><option value="monthly:service">Monthly service · 25%</option><option value="monthly:ad_budget">Prepaid monthly ad budget · no commission</option><option value="one_time:ad_budget">Prepaid ad budget · no commission</option><option value="one_time:extra_minutes">Extra minutes · no commission</option><option value="one_time:extra_hours">Extra hours · no commission</option></select>
              </div>
            ))}
            {addons.length < 10 && <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setAddons(xs => [...xs, { name: "", price: 0 }])}>+ Add-on</Button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <select aria-label="Choose monthly plan" className={`${sel} sm:col-span-2`} value="" onChange={e => { const p = QUOTE_MEMBERSHIPS.find(x => x.name === e.target.value); if (p) setF(x => ({ ...x, membership_name: p.name, membership_price: p.price })); }}><option value="">Choose a current monthly plan…</option>{QUOTE_MEMBERSHIPS.map(p => <option key={p.name} value={p.name}>{p.name} — ${p.price}/mo</option>)}</select>
            <label className="grid gap-1 text-xs">Monthly membership<Input value={f.membership_name} onChange={e => set("membership_name", e.target.value)} maxLength={200} placeholder="None" /></label>
            <label className="grid gap-1 text-xs">Per month<Input type="number" min={0} step="0.01" value={f.membership_price} onChange={e => set("membership_price", Number(e.target.value))} /></label>
            {f.membership_price > 0 && (
              <label className="flex items-center gap-2 text-xs sm:col-span-2">
                <input type="checkbox" checked={f.membership_free_month} onChange={e => set("membership_free_month", e.target.checked)} className="h-4 w-4 accent-primary" />
                First month free
              </label>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-xs">Promo
              <select value={f.discount_type} onChange={e => set("discount_type", e.target.value as DiscountType)} className={sel}>
                <option value="none">No promo</option><option value="amount">$ off</option><option value="percent">% off</option>
              </select>
            </label>
            {f.discount_type !== "none" && <label className="grid gap-1 text-xs">Amount<Input type="number" min={0} step="0.01" value={f.discount_value} onChange={e => set("discount_value", Number(e.target.value))} /></label>}
            <label className="grid gap-1 text-xs">Payments
              <select value={f.installments} onChange={e => set("installments", Number(e.target.value))} className={sel}>
                {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n === 1 ? "Pay in full" : `Split into ${n}`}</option>)}
              </select>
            </label>
            {f.discount_type !== "none" && <label className="grid gap-1 text-xs sm:col-span-3">Reason for promo<Input value={f.promo_note} onChange={e => set("promo_note", e.target.value)} maxLength={500} /></label>}
          </div>
          <p className="text-xs text-muted-foreground">New total: <span className="text-foreground">{usd(t.oneTime)}</span>{t.parts.length > 1 && ` (${t.parts.map(usd).join(" + ")})`}{t.membership > 0 && ` · ${usd(t.membership)}/mo`}. The customer's payment link updates automatically.</p>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs">Appointment<Input type="datetime-local" value={f.appointment} onChange={e => set("appointment", e.target.value)} /></label>
        <label className="grid gap-1 text-xs">Expected by<Input type="date" value={f.expected_by} onChange={e => set("expected_by", e.target.value)} /></label>
      </div>
      {o.call_list_id && (
        <div className="grid gap-3">
          <label className="grid gap-1 text-xs">Needs<textarea value={f.needs} onChange={e => set("needs", e.target.value)} maxLength={4000} rows={2} className={area} /></label>
          <label className="grid gap-1 text-xs">Caller notes<textarea value={f.profile_notes} onChange={e => set("profile_notes", e.target.value)} maxLength={4000} rows={3} className={area} /></label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="hero" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save changes"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        {m.error && <p role="alert" className="text-xs text-destructive">{(m.error as Error).message}</p>}
      </div>
    </form>
  );
}
