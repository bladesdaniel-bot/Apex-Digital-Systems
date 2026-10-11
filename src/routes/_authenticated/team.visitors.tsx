import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess, listVisitors } from "@/lib/team.functions";
import { ptDate, ptDayKey, ptTime } from "@/lib/visit-format";
import { locationLabel, mapsUrl } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/team/visitors")({
  head: () => ({
    meta: [
      { title: "Visitors | Apex Digital Systems Team" },
      { name: "description", content: "Private visitor analytics for the Apex Digital Systems team." },
      { property: "og:title", content: "Visitors | Apex Digital Systems Team" },
      { property: "og:description", content: "Private visitor analytics dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VisitorsPage,
});

function top(items: string[], n = 8) {
  const m = new Map<string, number>();
  items.forEach(i => m.set(i, (m.get(i) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function VisitorsPage() {
  const access = useServerFn(getMyAccess);
  const fetchVisitors = useServerFn(listVisitors);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  const ok = me.data?.role === "admin" || me.data?.role === "telemarketer";
  const visits = useQuery({ queryKey: ["visitors"], queryFn: () => fetchVisitors(), enabled: ok, refetchInterval: 60_000 });
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = visits.data ?? [];
  const stats = useMemo(() => {
    const now = Date.now(), day = 86_400_000, today = ptDayKey(new Date());
    const within = (d: number) => rows.filter(r => now - Date.parse(r.created_at) <= d * day);
    const r30 = within(30);
    return {
      today: rows.filter(r => ptDayKey(r.created_at) === today).length,
      d7: within(7).length,
      d30: r30.length,
      unique: new Set(r30.map(r => r.ip_address).filter(Boolean)).size,
      pages: top(r30.map(r => r.page_path)),
      refs: top(r30.map(r => r.referrer).filter(r => r && !r.includes("(internal)"))),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(r => {
      const k = ptDayKey(r.created_at);
      if (from && k < from) return false;
      if (to && k > to) return false;
      if (!s) return true;
      return [r.ip_address, r.city, r.region, r.country, r.page_path, r.referrer, r.device_type].join(" ").toLowerCase().includes(s);
    }).slice(0, 500);
  }, [rows, q, from, to]);

  return (
    <TeamShell isAdmin={me.data?.role === "admin"}>
      <h1 className="font-display text-4xl font-medium">Site <span className="gradient-text">visitors</span></h1>
      {me.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Checking access…</p> : !ok ? (
        <p className="scan-panel mt-8 rounded-2xl p-6 text-sm">Only approved team members can view this page.</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[["Today", stats.today], ["Last 7 days", stats.d7], ["Last 30 days", stats.d30], ["Unique IPs (30d)", stats.unique]].map(([l, v]) => (
              <div key={l} className="revenue-card rounded-2xl p-5">
                <p className="font-technical text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{l}</p>
                <p className="mt-2 font-display text-3xl text-electric">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {([["Top pages", stats.pages], ["Top referrers", stats.refs]] as const).map(([l, list]) => (
              <div key={l} className="scan-panel rounded-2xl p-5">
                <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-electric">{l} · 30 days</p>
                {list.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p>}
                <ul className="mt-3 space-y-2 text-sm">
                  {list.map(([k, n]) => <li key={k} className="flex justify-between gap-3"><span className="truncate">{k}</span><span className="text-aetheris-teal">{n}</span></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-end gap-3">
            <label className="flex-1 text-xs text-muted-foreground">Search<Input value={q} onChange={e => setQ(e.target.value)} placeholder="IP, city, page, referrer…" className="mt-1" /></label>
            <label className="text-xs text-muted-foreground">From<Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1" /></label>
            <label className="text-xs text-muted-foreground">To<Input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1" /></label>
          </div>
          <div className="revenue-card mt-4 overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="font-technical text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>{["Date", "Time (PT)", "IP", "City / State", "Page", "Referrer", "Device"].map(h => <th key={h} className="p-3 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {visits.isLoading && <tr><td className="p-3 text-muted-foreground" colSpan={7}>Loading…</td></tr>}
                {visits.error && <tr><td className="p-3 text-destructive" colSpan={7}>{visits.error.message}</td></tr>}
                {!visits.isLoading && filtered.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={7}>No visits match.</td></tr>}
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="p-3 whitespace-nowrap">{ptDate(r.created_at)}</td>
                    <td className="p-3 whitespace-nowrap">{ptTime(r.created_at)}</td>
                    <td className="p-3 font-technical text-xs">{r.ip_address || "—"}</td>
                    <td className="p-3 whitespace-nowrap">{(() => {
                      const place = locationLabel(r);
                      const url = mapsUrl(r);
                      if (!url) return "—";
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                          title="Open this location in Google Maps"
                        >
                          {place} ↗
                        </a>
                      );
                    })()}</td>
                    <td className="p-3">{r.page_path}</td>
                    <td className="p-3 max-w-[14rem] truncate text-muted-foreground">{r.referrer || "Direct"}</td>
                    <td className="p-3 capitalize">{r.device_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </TeamShell>
  );
}
