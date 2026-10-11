import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess, listTeam } from "@/lib/team.functions";
import { listAllCommissions, listMyCommissions, markCommissionsPaid, recordSale, deleteCommission, listPayingCustomers, type Commission } from "@/lib/commissions.functions";
import { RECURRING_COMMISSION, commissionFor, money, payPeriodFor } from "@/lib/commission";
import { listTaxInfo, getW9Requirement, setW9Requirement, getMyTaxInfo } from "@/lib/tax-info.functions";
import { TaxInfoForm } from "@/components/TaxInfoForm";
import { NEC_THRESHOLD, formatTin, yearPayouts } from "@/lib/tax-info";

export const Route = createFileRoute("/_authenticated/team/earnings")({
  head: () => ({
    meta: [
      { title: "Team Earnings | Apex Digital Systems" },
      { name: "description", content: "Track team commissions, pay periods, and payouts." },
      { property: "og:title", content: "Team Earnings | Apex Digital Systems" },
      { property: "og:description", content: "Commission tracking for the Apex team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EarningsPage,
});

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
const niceDate = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const sum = (rows: Commission[]) => rows.reduce((a, r) => a + r.commission_amount, 0);

function EarningsPage() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  const isAdmin = me.data?.role === "admin";
  return (
    <TeamShell isAdmin={isAdmin}>
      <h1 className="font-display text-4xl font-medium">Team <span className="gradient-text">earnings</span></h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">Commission per sale is 30% or $300, whichever is greater. Each month a linked customer's payment goes through, the employee earns another {money(RECURRING_COMMISSION)} automatically. Pay periods run every 2 weeks.</p>
      {me.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Checking access…</p> : isAdmin ? <OwnerView /> : <MyView />}
    </TeamShell>
  );
}

function Table({ rows, names, onPay, onDelete, busy }: { rows: Commission[]; names?: Map<string, string>; onPay?: (ids: string[]) => void; onDelete?: (id: string) => void; busy?: boolean }) {
  if (!rows.length) return <p className="p-4 text-sm text-muted-foreground">No sales yet.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead className="font-technical text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <tr>{names && <th className="p-3">Employee</th>}<th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Sale</th><th className="p-3">Earned</th><th className="p-3 text-right">Status</th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="border-t border-border/60">
            {names && <td className="p-3">{names.get(r.employee_id) ?? "Former member"}</td>}
            <td className="p-3 text-xs text-muted-foreground">{niceDate(r.sale_date)}</td>
            <td className="p-3"><div>{r.customer_name}{r.kind === "recurring" && <span className="ml-2 rounded-full border border-aetheris-teal/50 px-2 py-0.5 text-[10px] text-aetheris-teal">Monthly</span>}</div>{r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}{r.flag_note && <div className="mt-1 rounded-md border border-destructive/50 px-2 py-1 text-xs text-destructive">{r.flag_note}</div>}</td>
            <td className="p-3">{money(r.sale_amount)}</td>
            <td className="p-3 font-medium text-aetheris-teal">{money(r.commission_amount)}</td>
            <td className="p-3 text-right">
              {r.status === "paid" ? <span className="text-xs text-success">Paid {r.paid_at && new Date(r.paid_at).toLocaleDateString()}{r.paid_note && ` · ${r.paid_note}`}</span> : (
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs text-star">Owed</span>
                  {onDelete && <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (confirm("Remove this sale?")) onDelete(r.id); }}>Remove</Button>}
                  {onPay && <Button size="sm" disabled={busy} onClick={() => onPay([r.id])}>Mark paid</Button>}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OwnerView() {
  const qc = useQueryClient();
  const list = useServerFn(listAllCommissions);
  const team = useServerFn(listTeam);
  const record = useServerFn(recordSale);
  const pay = useServerFn(markCommissionsPaid);
  const del = useServerFn(deleteCommission);
  const rows = useQuery({ queryKey: ["commissions"], queryFn: () => list() });
  const members = useQuery({ queryKey: ["team"], queryFn: () => team() });
  const custFn = useServerFn(listPayingCustomers);
  const customers = useQuery({ queryKey: ["paying-customers"], queryFn: () => custFn() });
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["commissions"] });
  const save = useMutation({ mutationFn: (v: { employeeId: string; customerName: string; description: string; saleAmount: number; saleDate: string; memberId: string | null }) => record({ data: v }), onSuccess: refresh });
  const payM = useMutation({
    mutationFn: (ids: string[]) => { const note = prompt("How did you pay? (e.g. Zelle, check #123) — optional") ?? ""; return pay({ data: { ids, note } }); },
    onSuccess: refresh,
  });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: refresh });

  const names = new Map((members.data ?? []).map(m => [m.id, m.username || m.email]));
  const payable = (members.data ?? []).filter(m => m.role !== "pending");
  const all = rows.data ?? [];
  const owed = all.filter(r => r.status === "owed");
  const period = payPeriodFor(today());
  const byEmployee = [...new Set(owed.map(r => r.employee_id))].map(id => ({ id, rows: owed.filter(r => r.employee_id === id) }));

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setErr("");
    const f = new FormData(e.currentTarget);
    const saleAmount = Number(f.get("amount"));
    if (!f.get("employee")) return setErr("Pick an employee.");
    if (!(saleAmount > 0)) return setErr("Enter the sale amount.");
    try {
      await save.mutateAsync({ employeeId: String(f.get("employee")), customerName: String(f.get("customer")), description: String(f.get("description") ?? ""), saleAmount, saleDate: String(f.get("date")), memberId: f.get("member") ? String(f.get("member")) : null });
      e.currentTarget?.reset(); setAmount("");
    } catch (x) { setErr(x instanceof Error ? x.message : "Couldn't save."); }
  };

  const amt = Number(amount);
  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Total owed now" value={money(sum(owed))} />
        <Stat label={`This period (${niceDate(period.start)} – ${niceDate(period.end)})`} value={money(sum(all.filter(r => r.sale_date >= period.start && r.sale_date <= period.end)))} />
        <Stat label="Paid out all-time" value={money(sum(all.filter(r => r.status === "paid")))} />
      </div>

      <form onSubmit={submit} className="scan-panel mt-8 grid gap-3 rounded-2xl p-6 sm:grid-cols-2">
        <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-electric sm:col-span-2">Record a sale</p>
        <select name="employee" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="">
          <option value="" disabled>Employee who made the sale</option>
          {payable.map(m => <option key={m.id} value={m.id}>{m.username || m.email}</option>)}
        </select>
        <Input name="customer" placeholder="Customer / business name" required maxLength={120} />
        <Input name="amount" type="number" min="1" step="0.01" placeholder="Sale amount ($)" value={amount} onChange={e => setAmount(e.target.value)} required />
        <Input name="date" type="date" defaultValue={today()} required />
        <Input name="description" placeholder="What they sold (optional)" maxLength={500} className="sm:col-span-2" />
        <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">
          Monthly customer (optional) — link a paying customer so this employee earns {money(RECURRING_COMMISSION)} every month their payment goes through
          <select name="member" className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" defaultValue="">
            <option value="">Not a monthly customer</option>
            {(customers.data ?? []).map(c => <option key={c.id} value={c.id}>{c.business_name || c.full_name || c.email}{c.plan_name ? ` · ${c.plan_name}` : ""}{c.status !== "active" ? ` (${c.status})` : ""}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <Button type="submit" variant="hero" size="sm" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save sale"}</Button>
          {amt > 0 && <span className="text-sm text-muted-foreground">They earn <span className="font-medium text-aetheris-teal">{money(commissionFor(amt))}</span></span>}
        </div>
        {err && <p role="alert" className="text-sm text-destructive sm:col-span-2">{err}</p>}
      </form>

      <div className="revenue-card mt-8 rounded-2xl p-6">
        <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-electric">Who to pay</p>
        {byEmployee.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Everyone is paid up.</p>}
        <ul className="mt-3 space-y-3">
          {byEmployee.map(g => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm">
              <span>{names.get(g.id) ?? "Former member"} · {g.rows.length} sale{g.rows.length > 1 ? "s" : ""}</span>
              <span className="flex items-center gap-3"><span className="font-medium text-aetheris-teal">{money(sum(g.rows))}</span>
                <Button size="sm" disabled={payM.isPending} onClick={() => payM.mutate(g.rows.map(r => r.id))}>Mark all paid</Button></span>
            </li>
          ))}
        </ul>
      </div>

      <Report1099 rows={all} names={names} />

      <div className="revenue-card mt-8 overflow-x-auto rounded-2xl">
        {rows.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : <Table rows={all} names={names} onPay={ids => payM.mutate(ids)} onDelete={id => delM.mutate(id)} busy={payM.isPending || delM.isPending} />}
        {(payM.error || delM.error || rows.error) && <p role="alert" className="p-4 text-sm text-destructive">{(payM.error || delM.error || rows.error)?.message}</p>}
      </div>
    </>
  );
}

function Report1099({ rows, names }: { rows: Commission[]; names: Map<string, string> }) {
  const qc = useQueryClient();
  const taxFn = useServerFn(listTaxInfo);
  const w9Get = useServerFn(getW9Requirement);
  const w9Set = useServerFn(setW9Requirement);
  const tax = useQuery({ queryKey: ["tax-info-all"], queryFn: () => taxFn() });
  const w9 = useQuery({ queryKey: ["w9-required"], queryFn: () => w9Get() });
  const toggleW9 = useMutation({
    mutationFn: (required: boolean) => w9Set({ data: { required } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["w9-required"] }),
  });
  const thisYear = Number(today().slice(0, 4));
  const [year, setYear] = useState(thisYear - (Number(today().slice(5, 7)) <= 3 ? 1 : 0));
  const totals = yearPayouts(rows, year);
  const info = new Map((tax.data ?? []).map(t => [t.user_id, t]));
  const ids = [...new Set([...totals.keys(), ...info.keys()])].filter(id => (totals.get(id) ?? 0) > 0);
  const csv = () => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Recipient legal name", "Business name", "TIN type", "TIN", "Address", "City", "State", "ZIP", "Box 1 nonemployee comp", "Over $600"].map(q).join(",")];
    for (const id of ids) {
      const t = info.get(id); const amt = totals.get(id) ?? 0;
      lines.push([t?.legal_name ?? names.get(id) ?? "", t?.business_name ?? "", t?.tin_type ?? "", t ? formatTin(t.tin, t.tin_type) : "MISSING", t?.address ?? "", t?.city ?? "", t?.state ?? "", t?.zip ?? "", amt.toFixed(2), amt >= NEC_THRESHOLD ? "Yes" : "No"].map(q).join(","));
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `1099-NEC-${year}.csv`; a.click();
  };
  return (
    <div className="revenue-card mt-8 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-electric">1099-NEC report</p>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {[thisYear, thisYear - 1, thisYear - 2].map(y => <option key={y}>{y}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={csv} disabled={!ids.length}>Download CSV</Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Totals count what you actually paid out in {year}. Anyone at {money(NEC_THRESHOLD)}+ needs a 1099-NEC by January 31. Upload the CSV to your filing service or give it to your CPA.</p>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm">
        <span>Require teammates to fill out the W-9 tax form before using the Team Portal{w9.data === false && <span className="ml-2 text-xs text-star">Currently off — new teammates skip the form</span>}</span>
        <button
          type="button"
          aria-label="Require teammates to fill out the W-9 tax form before using the Team Portal"
          role="switch"
          aria-checked={w9.data !== false}
          disabled={w9.isLoading || toggleW9.isPending}
          onClick={() => toggleW9.mutate(w9.data === false)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${w9.data !== false ? "bg-aetheris-teal" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-all ${w9.data !== false ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
      {toggleW9.error && <p role="alert" className="mt-2 text-sm text-destructive">{toggleW9.error.message}</p>}
      {ids.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No payouts recorded for {year}.</p> : (
        <ul className="mt-3 space-y-2 text-sm">
          {ids.map(id => { const t = info.get(id); const amt = totals.get(id) ?? 0; return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
              <span>{t?.legal_name ?? names.get(id) ?? "Former member"}{t ? <span className="ml-2 text-xs text-muted-foreground">{t.tin_type} ···{t.tin.slice(-4)} · {t.city}, {t.state}</span> : <span className="ml-2 text-xs text-destructive">Tax info missing</span>}</span>
              <span className="font-medium">{money(amt)} {amt >= NEC_THRESHOLD && <span className="ml-1 text-xs text-star">1099 required</span>}</span>
            </li>
          ); })}
        </ul>
      )}
    </div>
  );
}

function MyView() {
  const list = useServerFn(listMyCommissions);
  const rows = useQuery({ queryKey: ["my-commissions"], queryFn: () => list() });
  const all = rows.data ?? [];
  const period = payPeriodFor(today());
  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Owed to you" value={money(sum(all.filter(r => r.status === "owed")))} />
        <Stat label={`This period (${niceDate(period.start)} – ${niceDate(period.end)})`} value={money(sum(all.filter(r => r.sale_date >= period.start && r.sale_date <= period.end)))} />
        <Stat label="Paid to you all-time" value={money(sum(all.filter(r => r.status === "paid")))} />
      </div>
      <div className="revenue-card mt-8 overflow-x-auto rounded-2xl">
        {rows.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : <Table rows={all} />}
      </div>
      <ContractorProfile />
    </>
  );
}

function ContractorProfile() {
  const fn = useServerFn(getMyTaxInfo);
  const q = useQuery({ queryKey: ["my-tax-info"], queryFn: () => fn() });
  const [editing, setEditing] = useState(false);
  const d = q.data;
  if (q.isLoading) return null;
  if (editing || !d) return <div className="mt-8"><TaxInfoForm onSaved={() => setEditing(false)} /></div>;
  return (
    <div className="revenue-card mt-8 rounded-2xl p-6 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-electric">Contractor profile (secure)</p>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Update</Button>
      </div>
      <p className="mt-3">{d.legal_name}{d.business_name ? ` · ${d.business_name}` : ""}</p>
      <p className="text-muted-foreground">{d.address}, {d.city}, {d.state} {d.zip}</p>
      <p className="text-muted-foreground">{d.tin_type} {d.tin}</p>
      <p className="mt-2 text-xs text-muted-foreground">Only you and the owner can see this. Your full number is never shown back here; the owner uses it for your 1099.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="revenue-card rounded-2xl p-5">
      <p className="font-technical text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl">{value}</p>
    </div>
  );
}
