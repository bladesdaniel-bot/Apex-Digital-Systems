import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import { deleteExpense, listExpenses, saveExpense, scanReceiptImage } from "@/lib/expenses.functions";
import { EXPENSE_CATEGORIES, GENERAL_LABEL, expensesCsv, summarizeExpenses } from "@/lib/expenses";
import { usd } from "@/lib/quote";

export const Route = createFileRoute("/_authenticated/team/expenses")({
  head: () => ({
    meta: [
      { title: "Company Expenses | Apex Digital Systems" },
      { name: "description", content: "Owner-only expense tracking, receipt scanning and per-app build costs." },
      { property: "og:title", content: "Company Expenses | Apex Digital Systems" },
      { property: "og:description", content: "Track company and per-app expenses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExpensesPage,
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
type Img = { name: string; type: string; base64: string };

function readImage(file: File): Promise<Img> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res({ name: file.name, type: file.type, base64: String(r.result).split(",")[1] ?? "" });
    r.onerror = () => rej(new Error("Couldn't read that file."));
    r.readAsDataURL(file);
  });
}

function ExpensesPage() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  const isAdmin = me.data?.role === "admin";
  return (
    <TeamShell isAdmin={isAdmin}>
      <h1 className="font-display text-4xl font-medium">Company <span className="gradient-text">expenses</span></h1>
      {me.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Checking access…</p> : isAdmin ? <Expenses /> : <p className="scan-panel mt-8 rounded-2xl p-6 text-sm">Only the owner can see company expenses.</p>}
    </TeamShell>
  );
}

function Expenses() {
  const qc = useQueryClient();
  const list = useServerFn(listExpenses);
  const scan = useServerFn(scanReceiptImage);
  const save = useServerFn(saveExpense);
  const del = useServerFn(deleteExpense);
  const rows = useQuery({ queryKey: ["expenses"], queryFn: () => list() });
  const years = useMemo(() => [...new Set([today().slice(0, 4), ...(rows.data ?? []).map(r => r.expense_date.slice(0, 4))])].sort().reverse(), [rows.data]);
  const [year, setYear] = useState(today().slice(0, 4));
  const yearRows = (rows.data ?? []).filter(r => year === "all" || r.expense_date.startsWith(year));
  const s = summarizeExpenses(yearRows);
  const projects = useMemo(() => [...new Set((rows.data ?? []).filter(r => r.allocation === "project").map(r => r.project))], [rows.data]);

  const [img, setImg] = useState<Img | null>(null);
  const [scanMsg, setScanMsg] = useState("");
  const [f, setF] = useState({ expense_date: today(), vendor: "", amount: "", allocation: "general" as "general" | "project", project: "", category: "Other" as string, description: "" });
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }));

  const scanM = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 20 * 1024 * 1024) throw new Error("Screenshots must be under 20 MB.");
      const image = await readImage(file);
      setImg(image);
      return scan({ data: { image, projects } });
    },
    onMutate: () => setScanMsg("Reading receipt…"),
    onSuccess: r => {
      if (!r.ok) { setScanMsg(r.error); return; }
      const x = r.scan;
      setF(p => ({ ...p, vendor: x.vendor || p.vendor, amount: x.amount ? String(x.amount) : p.amount, expense_date: x.expense_date || p.expense_date, category: x.category, description: x.description || p.description, allocation: x.allocation, project: x.project }));
      setScanMsg("Filled in from your receipt — check it, then save.");
    },
    onError: e => setScanMsg(e instanceof Error ? e.message : "Couldn't read that file."),
  });
  const saveM = useMutation({
    mutationFn: () => save({ data: { ...f, amount: Number(f.amount) || 0, category: f.category as (typeof EXPENSE_CATEGORIES)[number], image: img } }),
    onSuccess: () => {
      setF({ expense_date: today(), vendor: "", amount: "", allocation: "general", project: "", category: "Other", description: "" });
      setImg(null); setScanMsg("");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }) });
  const submit = (e: FormEvent) => { e.preventDefault(); saveM.mutate(); };

  const download = () => {
    const blob = new Blob([expensesCsv(yearRows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `apex-expenses-${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select aria-label="Year" className={`${sel} w-auto`} value={year} onChange={e => setYear(e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
          <option value="all">All years</option>
        </select>
        <Button variant="outline" onClick={download} disabled={!yearRows.length}>Download {year === "all" ? "all" : year} expense report (CSV)</Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[["Total spend", s.total], [GENERAL_LABEL, s.general], ["Apps & projects", s.projects]].map(([l, v]) => (
          <div key={l as string} className="revenue-card rounded-2xl p-5">
            <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{l}</p>
            <p className="mt-2 font-display text-2xl">{usd(v as number)}</p>
          </div>
        ))}
      </div>

      <div className="revenue-card mt-6 rounded-2xl p-6">
        <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-electric">Cost to build each app</p>
        {s.perProject.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No app or project expenses yet.</p> : (
          <ul className="mt-3 space-y-2 text-sm">{s.perProject.map(p => <li key={p.name} className="flex justify-between border-t border-border/60 pt-2"><span>{p.name}</span><span className="font-medium">{usd(p.cents)}</span></li>)}</ul>
        )}
      </div>

      <form onSubmit={submit} className="scan-panel mt-6 space-y-4 rounded-2xl p-6">
        <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-electric">Add an expense</p>
        <label className="block text-sm">
          <span className="text-muted-foreground">Receipt screenshot (optional) — we'll fill in the details for you</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="mt-2 block w-full text-sm" onChange={e => { const file = e.target.files?.[0]; if (file) scanM.mutate(file); }} />
        </label>
        {scanMsg && <p role="status" className="text-sm text-muted-foreground">{scanMsg}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Date<Input type="date" required value={f.expense_date} onChange={e => set("expense_date", e.target.value)} /></label>
          <label className="text-sm">Amount ($)<Input type="number" min="0" step="0.01" required value={f.amount} onChange={e => set("amount", e.target.value)} /></label>
          <label className="text-sm">Vendor / store<Input required maxLength={200} value={f.vendor} onChange={e => set("vendor", e.target.value)} placeholder="e.g. Apple, Amazon, Lovable" /></label>
          <label className="text-sm">Category<select className={sel} value={f.category} onChange={e => set("category", e.target.value)}>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
          <label className="text-sm">Goes to<select className={sel} value={f.allocation} onChange={e => set("allocation", e.target.value)}><option value="general">{GENERAL_LABEL} (equipment, supplies, fees…)</option><option value="project">A specific app / project</option></select></label>
          {f.allocation === "project" && (
            <label className="text-sm">App / project name<Input required list="expense-projects" maxLength={120} value={f.project} onChange={e => set("project", e.target.value)} placeholder="e.g. BMI Calculator" />
              <datalist id="expense-projects">{projects.map(p => <option key={p} value={p} />)}</datalist>
            </label>
          )}
        </div>
        <label className="block text-sm">What was it for?<Input maxLength={500} value={f.description} onChange={e => set("description", e.target.value)} /></label>
        {saveM.error && <p role="alert" className="text-sm text-destructive">{saveM.error.message}</p>}
        <Button type="submit" disabled={saveM.isPending || scanM.isPending}>{saveM.isPending ? "Saving…" : "Save expense"}</Button>
      </form>

      <div className="revenue-card mt-6 rounded-2xl p-6">
        <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-electric">Expenses {year === "all" ? "" : `in ${year}`}</p>
        {rows.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {rows.error && <p role="alert" className="mt-3 text-sm text-destructive">{rows.error.message}</p>}
        {rows.data && yearRows.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No expenses yet.</p>}
        <ul className="mt-3 space-y-3">
          {yearRows.map(r => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 border-t border-border/60 pt-3 text-sm">
              <div>
                <div className="font-medium">{r.vendor} · {usd(Math.round(Number(r.amount) * 100))}</div>
                <div className="text-xs text-muted-foreground">{r.expense_date} · {r.category} · {r.allocation === "project" ? r.project : GENERAL_LABEL}{r.description ? ` · ${r.description}` : ""}</div>
                {r.receipt_url && <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-electric underline-offset-4 hover:underline">View receipt ↗</a>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this expense?")) delM.mutate(r.id); }}>Delete</Button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
