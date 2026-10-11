import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import { cancelQuote, createQuote, listQuotes } from "@/lib/quotes.functions";
import { MAX_INSTALLMENTS, QUOTE_MEMBERSHIPS, QUOTE_PACKAGES, quoteTotals, usd, type Addon, type DiscountType } from "@/lib/quote";
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
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  const role = me.data?.role;
  const allowed = role === "admin" || role === "telemarketer";
  return (
    <TeamShell isAdmin={role === "admin"}>
      <h1 className="font-display text-4xl font-medium">Quote <span className="gradient-text">builder</span></h1>
      {me.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Checking access…</p> : allowed ? <><Builder /><QuoteList /></> : <p className="scan-panel mt-8 rounded-2xl p-6 text-sm">Your account doesn't have access to quotes.</p>}
    </TeamShell>
  );
}

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function Builder() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const create = useServerFn(createQuote);
  const [business, setBusiness] = useState(search.business ?? "");
  const [contact, setContact] = useState(search.contact ?? "");
  const [email, setEmail] = useState("");
  const [pkg, setPkg] = useState<string>(QUOTE_PACKAGES[0].name);
  const [pkgName, setPkgName] = useState("");
  const [pkgPrice, setPkgPrice] = useState<number>(QUOTE_PACKAGES[0].price);
  const [mem, setMem] = useState("");
  const [freeMonth, setFreeMonth] = useState(false);
  const [memName, setMemName] = useState("");
  const [memPrice, setMemPrice] = useState(0);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discount, setDiscount] = useState(0);
  const [promoNote, setPromoNote] = useState("");
  const [installments, setInstallments] = useState(1);
  const [link, setLink] = useState("");

  const choosePkg = (v: string) => {
    setPkg(v);
    const p = QUOTE_PACKAGES.find(x => x.name === v);
    setPkgPrice(p ? p.price : 0);
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
  const t = quoteTotals({ package_price: effPkgPrice, addons, membership_price: effMemPrice, discount_type: discountType, discount_value: discount, installments, membership_free_month: freeMonth && effMemPrice > 0 });

  const m = useMutation({
    mutationFn: () => create({ data: {
      call_list_id: search.call && /^[0-9a-f-]{36}$/i.test(search.call) ? search.call : null,
      business_name: business, contact_name: contact, contact_email: email,
      package_name: packageName || (addons.length ? "Custom services" : ""), package_price: effPkgPrice, addons: addons.filter(a => a.name.trim()),
      membership_name: membershipName, membership_price: effMemPrice, membership_free_month: freeMonth && effMemPrice > 0,
      discount_type: discountType, discount_value: discountType === "none" ? 0 : discount, promo_note: promoNote,
      installments,
    } }),
    onSuccess: r => { setLink(`${window.location.origin}/pay/${r.id}`); qc.invalidateQueries({ queryKey: ["quotes"] }); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); setLink(""); m.mutate(); };

  return (
    <form onSubmit={submit} className="scan-panel mt-8 grid gap-5 rounded-2xl p-6 text-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input required value={business} onChange={e => setBusiness(e.target.value)} placeholder="Business name" maxLength={200} aria-label="Business name" />
        <Input value={contact} onChange={e => setContact(e.target.value)} placeholder="Contact name" maxLength={120} aria-label="Contact name" />
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Customer email (optional)" maxLength={255} aria-label="Customer email" />
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <legend className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Package (one-time)</legend>
        <select aria-label="Package" value={pkg} onChange={e => choosePkg(e.target.value)} className={sel}>
          {QUOTE_PACKAGES.map(p => <option key={p.name} value={p.name}>{p.name} — {p.price ? `$${p.price}` : "your price"}</option>)}
          <option value="custom">Custom package…</option>
          <option value="none">No package (membership / add-ons only)</option>
        </select>
        {pkg !== "none" && <Input type="number" min={0} step="0.01" value={pkgPrice} onChange={e => setPkgPrice(Number(e.target.value))} aria-label="Package price" />}
        {pkg === "custom" && <Input className="sm:col-span-2" value={pkgName} onChange={e => setPkgName(e.target.value)} placeholder="Custom package name" maxLength={200} aria-label="Custom package name" />}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Add-ons</legend>
        {addons.map((a, i) => (
          <div key={i} className="grid grid-cols-[1fr_8rem_auto] gap-2">
            <Input value={a.name} onChange={e => setAddons(xs => xs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Add-on (e.g. logo design)" maxLength={120} aria-label={`Add-on ${i + 1} name`} />
            <Input type="number" min={0} step="0.01" value={a.price} onChange={e => setAddons(xs => xs.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} aria-label={`Add-on ${i + 1} price`} />
            <Button type="button" variant="outline" size="sm" onClick={() => setAddons(xs => xs.filter((_, j) => j !== i))}>Remove</Button>
          </div>
        ))}
        {addons.length < 10 && <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setAddons(xs => [...xs, { name: "", price: 0 }])}>+ Add-on</Button>}
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
        {t.membership > 0 && <Row label="Membership" value={freeMonth ? `Free for 30 days, then ${usd(t.membership)}/mo` : `${usd(t.membership)}/mo, starts with first payment`} />}
        <Row label="Due today" value={usd(t.dueToday)} strong />
        <p className="text-xs text-muted-foreground">Sales tax is added at checkout where it applies.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="hero" disabled={m.isPending}>{m.isPending ? "Saving…" : "Create payment link"}</Button>
        {m.error && <p role="alert" className="text-destructive">{m.error.message}</p>}
      </div>
      {link && <CopyLink link={link} />}
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "text-base font-medium" : ""}`}><span className="text-muted-foreground">{label}</span><span className="text-right">{value}</span></div>;
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="break-all text-aetheris-teal">{link}</span>
      <Button type="button" size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* ignore */ } }}>{copied ? "Copied" : "Copy link"}</Button>
    </div>
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
