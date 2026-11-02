import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createQuote } from "@/lib/quotes.functions";
import { uploadSignedAgreement } from "@/lib/client-portal.functions";
import { PhotoUpload } from "@/components/PhotoUpload";
import { splitFeature } from "@/lib/offers";
import { needsOrderDetails, orderBusinessName } from "@/lib/order-draft";
import { MAX_INSTALLMENTS, QUOTE_ADDON_OPTIONS, QUOTE_MEMBERSHIPS, QUOTE_PACKAGES, quoteTotals, usd, type Addon, type DiscountType } from "@/lib/quote";

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function OrderBuilder({ business: initBusiness, contact: initContact, address: initAddress, phone: initPhone, callId, embedded }: { business?: string | undefined; contact?: string | undefined; address?: string | undefined; phone?: string | undefined; callId?: string | undefined; embedded?: boolean }) {
  const [phone, setPhone] = useState(initPhone ?? "");
  const search = { business: initBusiness, contact: initContact, call: callId };
  const qc = useQueryClient();
  const create = useServerFn(createQuote);
  const [business, setBusiness] = useState(search.business ?? "");
  const [contact, setContact] = useState(search.contact ?? "");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [address, setAddress] = useState(initAddress ?? "");
  const [pkg, setPkg] = useState<string>(QUOTE_PACKAGES[0]?.name ?? "none");
  const [pkgName, setPkgName] = useState("");
  const [pkgDetails, setPkgDetails] = useState("");
  const [pkgPrice, setPkgPrice] = useState<number>(QUOTE_PACKAGES[0]?.price ?? 0);
  const [mem, setMem] = useState("");
  const [freeMonth, setFreeMonth] = useState(false);
  const [memName, setMemName] = useState("");
  const [memPrice, setMemPrice] = useState(0);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [adAmt, setAdAmt] = useState(0);
  const [adCadence, setAdCadence] = useState<"monthly" | "one_time">("monthly");
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discount, setDiscount] = useState(0);
  const [promoNote, setPromoNote] = useState("");
  const [installments, setInstallments] = useState(1);
  const [link, setLink] = useState("");
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [heldPlaced, setHeldPlaced] = useState(false);
  const upSigned = useServerFn(uploadSignedAgreement);

  const choosePkg = (v: string) => {
    setPkg(v);
    const p = QUOTE_PACKAGES.find(x => x.name === v);
    setPkgPrice(p ? p.price : 0);
    if (p?.monthlyAmount) {
      const monthly = QUOTE_MEMBERSHIPS.find(x => x.name === v.replace(/ \(setup\)$/, ""));
      if (monthly) { setMem(monthly.name); setMemPrice(monthly.price); }
    }
  };
  const chooseMem = (v: string) => {
    setMem(v);
    const m = QUOTE_MEMBERSHIPS.find(x => x.name === v);
    setMemPrice(m ? m.price : 0);
  };
  const packageName = pkg === "custom" ? pkgName : pkg === "none" ? "" : pkg;
  const membershipName = mem === "custom" ? memName : mem;
  const effPkgPrice = pkg === "none" ? 0 : pkgPrice;
  const effMemPrice = mem ? memPrice : 0;
  const adAddon: Addon[] = adAmt > 0 ? [{ name: adCadence === "monthly" ? "Prepaid ad campaign budget (monthly)" : "Prepaid ad campaign budget", price: adAmt, cadence: adCadence, category: "ad_budget" }] : [];
  const allAddons = [...addons.filter(a => a.name.trim()), ...adAddon];
  const t = quoteTotals({ package_price: effPkgPrice, addons: allAddons, membership_price: effMemPrice, discount_type: discountType, discount_value: discount, installments, membership_free_month: freeMonth && effMemPrice > 0 });

  const m = useMutation({
    mutationFn: (mode: false | "ready" | "hold") => create({ data: {
      place_order: !!mode,
      ...(mode === "hold" ? { hold_reason: holdReason.trim() || "Waiting on customer" } : {}),
      call_list_id: search.call && /^[0-9a-f-]{36}$/i.test(search.call) ? search.call : null,
      business_name: orderBusinessName.parse(business), contact_name: contact, contact_email: email, customer_url: url, customer_address: address, customer_phone: phone,
      package_name: packageName || (allAddons.length ? "Custom services" : ""), package_details: pkg === "custom" ? pkgDetails.trim() : "", package_price: effPkgPrice, addons: allAddons,
      membership_name: membershipName, membership_price: effMemPrice, membership_free_month: freeMonth && effMemPrice > 0,
      discount_type: discountType, discount_value: discountType === "none" ? 0 : discount, promo_note: promoNote,
      installments,
    } }),
    onSuccess: (r, mode) => { const draft = needsOrderDetails({ business_name: business, package_name: packageName, membership_name: membershipName, addons: allAddons }); setPlaced(!!mode || draft); setHeldPlaced(mode === "hold" || draft); setOrderId(r.id); setLink(`${window.location.origin}/pay/${r.id}`); qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["build-orders"] }); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); setLink(""); m.mutate(false); };
  const placeOrder = (mode: "ready" | "hold") => (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.form;
    if (form && !form.reportValidity()) return;
    setLink(""); m.mutate(mode);
  };

  return (
    <form onSubmit={submit} className={embedded ? "grid gap-5 text-sm" : "scan-panel mt-8 grid gap-5 rounded-2xl p-6 text-sm"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={business} onChange={e => setBusiness(e.target.value)} placeholder="Business name (optional for now)" maxLength={200} aria-label="Business name" />
        <Input value={contact} onChange={e => setContact(e.target.value)} placeholder="Contact name" maxLength={120} aria-label="Contact name" />
        <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Customer phone number" maxLength={40} aria-label="Customer phone" />
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Customer email (optional)" maxLength={255} aria-label="Customer email" />
      </div>
      <Input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="Customer website URL (https://…) — kept on the order for your records" maxLength={500} aria-label="Customer website URL" />
      <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Business address (street, city, state, ZIP)" maxLength={300} aria-label="Business address" />

      <fieldset className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <legend className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Package (one-time)</legend>
        <select aria-label="Package" value={pkg} onChange={e => choosePkg(e.target.value)} className={sel}>
          {QUOTE_PACKAGES.map(p => <option key={p.name} value={p.name}>{p.name} — {p.from ? "from " : ""}{p.price ? `$${p.price}` : "your price"}</option>)}
          <option value="custom">Custom package…</option>
          <option value="none">No package yet</option>
        </select>
        {pkg !== "none" && <Input type="number" min={0} step="0.01" value={pkgPrice} onChange={e => setPkgPrice(Number(e.target.value))} aria-label="Package price" />}
        {pkg === "custom" && <Input className="sm:col-span-2" value={pkgName} onChange={e => setPkgName(e.target.value)} placeholder="Custom package name" maxLength={200} aria-label="Custom package name" />}
        {pkg === "custom" && <textarea className="sm:col-span-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={pkgDetails} onChange={e => setPkgDetails(e.target.value)} placeholder="What's included in this custom package (e.g. 5-page website, logo, first month of care)" rows={3} maxLength={4000} aria-label="What's included" />}
        {QUOTE_PACKAGES.find(p => p.name === pkg) && <div className="text-xs leading-5 text-muted-foreground sm:col-span-2">
          <ul className="list-disc pl-4">{QUOTE_PACKAGES.find(p => p.name === pkg)?.features.map(feature => { const [lead, rest] = splitFeature(feature); return <li key={feature}>{lead && <strong className="text-foreground">{lead}</strong>}{rest}</li>; })}</ul>
          {QUOTE_PACKAGES.find(p => p.name === pkg)?.monthlyAmount && <p className="mt-2">Setup plus ${QUOTE_PACKAGES.find(p => p.name === pkg)?.monthlyAmount}/mo. Monthly plan selected separately below. Extra talk minutes: $0.25 each.</p>}
        </div>}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Add-ons</legend>
        <select aria-label="Add a listed add-on" className={sel} value="" onChange={e => { const a = QUOTE_ADDON_OPTIONS.find(x => x.name === e.target.value); if (a && addons.length < 10) setAddons(xs => [...xs, { ...a }]); }}>
          <option value="">Choose a monthly add-on…</option>
          {QUOTE_ADDON_OPTIONS.map(a => <option key={a.name} value={a.name}>{a.name}{a.price ? ` — $${a.price}/mo` : " — your budget"}</option>)}
        </select>
        {addons.map((a, i) => (
          <div key={i} className="grid grid-cols-[1fr_8rem_auto] gap-2">
            <Input value={a.name} onChange={e => setAddons(xs => xs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Add-on (e.g. logo design)" maxLength={120} aria-label={`Add-on ${i + 1} name`} />
            <Input type="number" min={0} step="0.01" value={a.price} onChange={e => setAddons(xs => xs.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} aria-label={`Add-on ${i + 1} price`} />
            <Button type="button" variant="outline" size="sm" onClick={() => setAddons(xs => xs.filter((_, j) => j !== i))}>Remove</Button>
            <select className={`${sel} col-span-3`} aria-label={`Add-on ${i + 1} billing`} value={`${a.cadence ?? "one_time"}:${a.category ?? "service"}`} onChange={e => { const [cadence, category] = e.target.value.split(":"); setAddons(xs => xs.map((x, j) => j === i ? { ...x, cadence: cadence as Addon["cadence"], category: category as Addon["category"] } : x)); }}>
              <option value="one_time:service">One-time service · 30%</option><option value="monthly:service">Monthly service · 25%</option><option value="monthly:ad_budget">Prepaid monthly ad budget · no commission</option><option value="one_time:ad_budget">Prepaid ad budget · no commission</option><option value="one_time:extra_minutes">Extra minutes · no commission</option><option value="one_time:extra_hours">Extra hours · no commission</option>
            </select>
          </div>
        ))}
        {addons.length < 10 && <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setAddons(xs => [...xs, { name: "", price: 0 }])}>+ Add-on</Button>}
      </fieldset>

      <fieldset className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2">
        <legend className="px-1 text-xs uppercase tracking-wide text-muted-foreground">Prepaid ad campaign</legend>
        <p className="text-xs text-muted-foreground sm:col-span-2">Customer prepays their Google / YouTube ad spend. Saved on the order and the customer's account. Ad spend is never commissioned.</p>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {[0, 250, 500, 1000, 2500].map(v => <Button key={v} type="button" size="sm" variant={adAmt === v ? "default" : "outline"} onClick={() => setAdAmt(v)}>{v ? `$${v.toLocaleString()}` : "None"}</Button>)}
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">Ad budget amount<Input type="number" min={0} step="0.01" value={adAmt} onChange={e => setAdAmt(Math.max(0, Number(e.target.value)))} aria-label="Prepaid ad budget amount" /></label>
        <label className="grid gap-1 text-xs text-muted-foreground">How often<select aria-label="Ad budget billing" className={sel} value={adCadence} onChange={e => setAdCadence(e.target.value as "monthly" | "one_time")}><option value="monthly">Every month</option><option value="one_time">One-time campaign</option></select></label>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <legend className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Monthly membership</legend>
        <select aria-label="Membership" value={mem} onChange={e => chooseMem(e.target.value)} className={sel}>
          <option value="">No membership</option>
          {QUOTE_MEMBERSHIPS.map(p => <option key={p.name} value={p.name}>{p.name} — ${p.price}/mo</option>)}
          <option value="custom">Custom membership…</option>
        </select>
        {mem && <Input type="number" min={0} step="0.01" value={memPrice} onChange={e => setMemPrice(Number(e.target.value))} aria-label="Membership monthly price" />}
        {mem === "custom" && <Input className="sm:col-span-2" value={memName} onChange={e => setMemName(e.target.value)} placeholder="Membership name" maxLength={200} aria-label="Custom membership name" />}
        {QUOTE_MEMBERSHIPS.find(p => p.name === mem) && <ul className="list-disc pl-4 text-xs leading-5 text-muted-foreground sm:col-span-2">{QUOTE_MEMBERSHIPS.find(p => p.name === mem)?.features.map(feature => { const [lead, rest] = splitFeature(feature); return <li key={feature}>{lead && <strong className="text-foreground">{lead}</strong>}{rest}</li>; })}</ul>}
        {mem && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={freeMonth} onChange={e => setFreeMonth(e.target.checked)} className="h-4 w-4 accent-primary" />
            First month free (membership billing starts 30 days after the first payment)
          </label>
        )}
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Promo & payment plan</legend>
        <select aria-label="Promo type" value={discountType} onChange={e => setDiscountType(e.target.value as DiscountType)} className={sel}>
          <option value="none">No promo</option>
          <option value="amount">$ off</option>
          <option value="percent">% off</option>
        </select>
        {discountType !== "none" && <Input type="number" min={0} step="0.01" value={discount} onChange={e => setDiscount(Number(e.target.value))} aria-label="Promo amount" />}
        <select aria-label="Split payments" value={installments} onChange={e => setInstallments(Number(e.target.value))} className={sel}>
          {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n === 1 ? "Pay in full" : `Split into ${n} payments`}</option>)}
        </select>
        {discountType !== "none" && <Input className="sm:col-span-3" value={promoNote} onChange={e => setPromoNote(e.target.value)} placeholder="Reason for promo (shown to the owner)" maxLength={500} aria-label="Promo reason" />}
      </fieldset>

      <div className="revenue-card grid gap-1 rounded-xl p-4">
        <Row label="Subtotal (one-time)" value={usd(t.subtotal)} />
        {t.discount > 0 && <Row label="Promo" value={`− ${usd(t.discount)}`} />}
        <Row label="One-time total" value={usd(t.oneTime)} />
        {t.parts.length > 1 && <Row label="Payment plan" value={t.parts.map(usd).join(" + ")} />}
        {t.membership > 0 && <Row label="Monthly plans & add-ons" value={freeMonth ? `Main plan free for 30 days; recurring total ${usd(t.membership)}/mo` : `${usd(t.membership)}/mo, starts with first payment`} />}
        <Row label="Due today" value={usd(t.dueToday)} strong />
        <p className="text-xs text-muted-foreground">Sales tax is added at checkout where it applies.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="hero" disabled={m.isPending}>{m.isPending ? "Saving…" : "Create payment link"}</Button>
        <Button type="button" variant="outline" disabled={m.isPending} onClick={placeOrder("ready")}>Place order — 100% ready to build</Button>
        {m.error && <p role="alert" className="text-destructive">{m.error.message}</p>}
      </div>
      <div className="grid gap-2 rounded-xl border border-border p-3">
        <p className="text-xs text-muted-foreground">Customer said they'll get back to you (photos, logo, logins…)? Put it in the Holding Area. It won't reach the build queue until it's marked 100% ready.</p>
        <div className="flex flex-wrap gap-2">
          <Input value={holdReason} onChange={e => setHoldReason(e.target.value)} placeholder="What are we waiting on? (e.g. logo & photos by Friday)" maxLength={500} aria-label="Holding reason" className="min-w-0 flex-1" />
          <Button type="button" variant="outline" disabled={m.isPending} onClick={placeOrder("hold")}>Put in Holding Area</Button>
        </div>
      </div>
      {link && placed && (heldPlaced
        ? <p className="text-success">Order saved in the Holding Area. Tap "Mark 100% ready to build" on Build Orders when the customer is ready. Payment link if they want to pay now:</p>
        : <p className="text-success">Order placed — it's on Build Orders and the owner was emailed. Send the customer this payment link whenever they're ready:</p>)}
      {link && <CopyLink link={link} />}
      {link && orderId && (
        <div className="grid gap-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed agreement (optional) — photo or PDF, shows in the customer's account</p>
          <PhotoUpload allowPdf label="Upload signed agreement" upload={async f => { await upSigned({ data: { quoteId: orderId, file: f } }); }} onDone={() => qc.invalidateQueries({ queryKey: ["build-orders"] })} />
        </div>
      )}
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "text-base font-medium" : ""}`}><span className="text-muted-foreground">{label}</span><span className="text-right">{value}</span></div>;
}

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="break-all text-aetheris-teal">{link}</span>
      <Button type="button" size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* ignore */ } }}>{copied ? "Copied" : "Copy link"}</Button>
    </div>
  );
}
