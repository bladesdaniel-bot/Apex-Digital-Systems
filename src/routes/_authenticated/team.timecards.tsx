import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import { getTeamActivity } from "@/lib/timecards.functions";
import { formatDuration, shiftEnd, shiftMinutes } from "@/lib/timecards";

export const Route = createFileRoute("/_authenticated/team/timecards")({
  head: () => ({
    meta: [
      { title: "Timecards & Calls | Apex Digital Systems" },
      { name: "description", content: "Owner view of teammate clock-in/out times and calls made." },
      { property: "og:title", content: "Timecards & Calls | Apex Digital Systems" },
      { property: "og:description", content: "Teammate shifts and call activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TimecardsPage,
});

const fmt = (iso: string | Date) => new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function TimecardsPage() {
  const accessFn = useServerFn(getMyAccess);
  const actFn = useServerFn(getTeamActivity);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => accessFn() });
  const isAdmin = me.data?.role === "admin";
  const act = useQuery({ queryKey: ["team-activity"], queryFn: () => actFn(), enabled: isAdmin, refetchInterval: 60_000 });
  const [who, setWho] = useState("all");

  const nameOf = useMemo(() => {
    const m = new Map<string, string>((act.data?.people ?? []).map((p: any): [string, string] => [p.id, `${p.username || p.email}${p.employee_id ? ` (${p.employee_id})` : ""}`]));
    return (id: string): string => m.get(id) ?? "Unknown";
  }, [act.data]);

  if (me.isSuccess && !isAdmin) return <TeamShell isAdmin={false}><p className="text-sm text-muted-foreground">Owner only.</p></TeamShell>;
  const now = new Date();
  const shifts = (act.data?.shifts ?? []).filter((s: any) => who === "all" || s.user_id === who);
  const calls = (act.data?.calls ?? []).filter((c: any) => who === "all" || c.user_id === who);
  const userIds = Array.from(new Set([...(act.data?.shifts ?? []), ...(act.data?.calls ?? [])].map((r: any) => r.user_id)));
  const onNow = (act.data?.shifts ?? []).filter((s: any) => !shiftEnd(s, now));
  const summary = userIds.map(id => ({
    id,
    minutes: (act.data?.shifts ?? []).filter((s: any) => s.user_id === id).reduce((t: number, s: any) => t + shiftMinutes(s, now), 0),
    calls: (act.data?.calls ?? []).filter((c: any) => c.user_id === id).length,
  }));

  return (
    <TeamShell isAdmin>
      <h1 className="font-display text-2xl text-foreground">Timecards & calls</h1>
      <p className="mt-1 text-sm text-muted-foreground">Signing into the portal clocks in; signing out clocks out. If someone leaves without signing out, the shift ends at their last activity after 30 idle minutes. Last 30 days, Pacific time.</p>

      <section className="mt-6 rounded-xl border border-border p-4">
        <h2 className="text-sm font-medium text-foreground">On the clock now ({onNow.length})</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {onNow.length === 0 && <li>Nobody right now.</li>}
          {onNow.map((s: any) => <li key={s.id}>{nameOf(s.user_id)} — since {fmt(s.clock_in)} ({formatDuration(shiftMinutes(s, now))})</li>)}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border p-4">
        <h2 className="text-sm font-medium text-foreground">30-day totals</h2>
        <table className="mt-2 w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th>Teammate</th><th>Hours</th><th>Calls</th></tr></thead>
          <tbody>{summary.map(r => <tr key={r.id} className="border-t border-border"><td className="py-1">{nameOf(r.id)}</td><td>{formatDuration(r.minutes)}</td><td>{r.calls}</td></tr>)}</tbody></table>
      </section>

      <div className="mt-6">
        <label className="text-xs text-muted-foreground">Show: </label>
        <select value={who} onChange={e => setWho(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground">
          <option value="all">Everyone</option>
          {userIds.map(id => <option key={id} value={id}>{nameOf(id)}</option>)}
        </select>
      </div>

      <section className="mt-4 rounded-xl border border-border p-4">
        <h2 className="text-sm font-medium text-foreground">Shifts</h2>
        <table className="mt-2 w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th>Teammate</th><th>Clock in</th><th>Clock out</th><th>Length</th></tr></thead>
          <tbody>{shifts.map((s: any) => { const end = shiftEnd(s, now); return (
            <tr key={s.id} className="border-t border-border"><td className="py-1">{nameOf(s.user_id)}</td><td>{fmt(s.clock_in)}</td>
              <td>{end ? `${fmt(end)}${s.ended_by === "sign_out" ? "" : " (idle)"}` : "On the clock"}</td><td>{formatDuration(shiftMinutes(s, now))}</td></tr>); })}</tbody></table>
      </section>

      <section className="mt-6 rounded-xl border border-border p-4">
        <h2 className="text-sm font-medium text-foreground">Calls made ({calls.length})</h2>
        <table className="mt-2 w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th>When</th><th>Teammate</th><th>Business</th><th>Number</th><th>Outcome</th><th>Call-back reason</th></tr></thead>
          <tbody>{calls.map((c: any) => <tr key={c.id} className="border-t border-border"><td className="py-1">{fmt(c.called_at)}</td><td>{nameOf(c.user_id)}</td><td>{c.business_name}</td>
            <td>{c.phone ? <a className="text-electric" href={`tel:${c.phone}`}>{c.phone}</a> : "—"}</td><td>{c.outcome || "—"}</td><td className="break-words">{c.callback_reason || "—"}</td></tr>)}</tbody></table>
      </section>
    </TeamShell>
  );
}
