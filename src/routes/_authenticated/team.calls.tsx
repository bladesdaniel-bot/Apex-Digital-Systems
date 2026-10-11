import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";

const COUNTRIES = ["US", "CA", "MX", "GB", "IE", "AU", "NZ", "DE", "FR", "ES", "IT", "NL", "BE", "SE", "NO", "DK", "FI", "PL", "PT", "CH", "AT", "BR", "AR", "CL", "CO", "PE", "PH", "IN", "PK", "NG", "ZA", "KE", "AE", "SA", "SG", "MY", "JP", "KR"];
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamShell } from "@/components/TeamShell";
import { CustomerProfilePanel } from "@/components/CustomerProfilePanel";
import { getMyAccess } from "@/lib/team.functions";
import { analyzeCallBusiness, findBusinesses, listCallList, markCalled, recallBusiness, resetMyQueue, skipBusiness, triageBusiness, type CallRow } from "@/lib/call-list.functions";
import { callQueue, upcomingCalls, subscribers, safeHttpUrl, type WebsiteFilter } from "@/lib/call-list";
import { randomCityFor } from "@/lib/call-cities";
import { ptDate, ptTime } from "@/lib/visit-format";
import { addressMapsUrl } from "@/lib/geo";
import { Markdown } from "@/components/Markdown";


export const Route = createFileRoute("/_authenticated/team/calls")({
  head: () => ({
    meta: [
      { title: "Call List | Apex Digital Systems" },
      { name: "description", content: "Find local businesses and track who has called them." },
      { property: "og:title", content: "Call List | Apex Digital Systems" },
      { property: "og:description", content: "Shared team call list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CallsPage,
});

function CallsPage() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  const role = me.data?.role;
  const allowed = role === "admin" || role === "telemarketer";
  return (
    <TeamShell isAdmin={role === "admin"}>
      <h1 className="font-display text-4xl font-medium">Call <span className="gradient-text">list</span></h1>
      {me.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Checking access…</p> : allowed ? <CallQueue userId={me.data!.userId} /> : <p className="scan-panel mt-8 rounded-2xl p-6 text-sm">Your account doesn't have access to the call list.</p>}
    </TeamShell>
  );
}

function CallQueue({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listCallList);
  const find = useServerFn(findBusinesses);
  const skip = useServerFn(skipBusiness);
  const rows = useQuery({ queryKey: ["call-list"], queryFn: () => list(), refetchInterval: query =>
    query.state.data?.rows.some(r => r.status === "queued" && !r.called_at && r.website_status === "unchecked") ? 1000 : false,
  });
  const [msg, setMsg] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["call-list"] });
  // Skips are saved per signed-in user, so each caller's queue order is their own.
  const skipped = (rows.data?.skipped ?? []).map(s => s.call_list_id);
  const skipM = useMutation({ mutationFn: (id: string) => skip({ data: { id, skip: true } }), onSuccess: refresh });
  const reset = useServerFn(resetMyQueue);
  const resetM = useMutation({ mutationFn: () => reset(), onSuccess: () => { setMsg("Your queue is reset — skipped businesses are back in order."); refresh(); } });
  const findM = useMutation({
    mutationFn: (area: string) => find({ data: { area, website_filter: websiteFilter, business_type: businessType } }),
    onSuccess: r => { setMsg(r.added ? `Added ${r.added} new business${r.added > 1 ? "es" : ""} to the queue.` : "No new businesses found this time. Try again or try a nearby city."); refresh(); },
  });

  const [country, setCountry] = useState("US");
  const [state, setState] = useState("");
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>("any");
  const [businessType, setBusinessType] = useState("");
  const [regionLoaded, setRegionLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`apex-call-region-${userId}`) ?? "null");
      if (saved?.country) {
        setCountry(saved.country);
        setState(saved.state ?? "");
        if (saved.website_filter === "none" || saved.website_filter === "has") setWebsiteFilter(saved.website_filter);
        setRegionLoaded(true);
        return;
      }
    } catch { /* ignore */ }
    const guess = navigator.language.split("-")[1]?.toUpperCase();
    if (guess && COUNTRIES.includes(guess)) setCountry(guess);
    setRegionLoaded(true);
  }, []);
  useEffect(() => {
    if (!regionLoaded) return;
    try { localStorage.setItem(`apex-call-region-${userId}`, JSON.stringify({ country, state, website_filter: websiteFilter })); } catch { /* storage unavailable */ }
  }, [country, state, websiteFilter, regionLoaded, userId]);
  const countryName = (c: string) => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(c) ?? c; } catch { return c; } };

  const [picked, setPicked] = useState("");
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setMsg("");
    let city = String(new FormData(e.currentTarget).get("area") ?? "").trim();
    if (!city) {
      const random = randomCityFor(country, state);
      if (random) { city = random; setPicked(random); } else setPicked("");
    } else setPicked("");
    const area = [city, state.trim(), countryName(country)].filter(Boolean).join(", ");
    setAreaFilter("");
    setTypeFilter(businessType.trim());
    findM.mutate(area.slice(0, 120));
  };

  const [areaFilter, setAreaFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const allQueue = callQueue(rows.data?.rows ?? [], websiteFilter);
  const areas = [...new Set(allQueue.map(r => r.area).filter(Boolean))];
  const categories = [...new Set(allQueue.map(r => r.category).filter(Boolean))];
  // A typed business search focuses the queue on that kind; "All types" shows everything again.
  const typeMatch = (r: { category: string }) => !typeFilter || sameTrade(r.category, typeFilter);
  const queue = allQueue.filter(r => (!areaFilter || r.area === areaFilter) && typeMatch(r));
  const subs = subscribers(rows.data?.rows ?? []);
  const upcoming = upcomingCalls(queue, skipped);

  return (
    <>
      <form onSubmit={submit} className="scan-panel mt-8 flex flex-wrap items-center gap-3 rounded-2xl p-6">
        <select aria-label="Country" value={country} onChange={e => setCountry(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          {COUNTRIES.map(c => <option key={c} value={c}>{countryName(c)}</option>)}
        </select>
        <Input aria-label="State or region" value={state} onChange={e => setState(e.target.value)} placeholder="State / region (optional)" maxLength={60} className="max-w-xs" />
        <select aria-label="Website filter" value={websiteFilter} onChange={e => { setWebsiteFilter(e.target.value as WebsiteFilter); setMsg(""); }} className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm sm:w-auto">
          <option value="any">Any businesses — random mix</option>
          <option value="none">No website yet — rebuild leads</option>
          <option value="has">Has a website — refresh leads</option>
        </select>
        <Input name="area" placeholder="City (optional — blank = random)" maxLength={60} className="max-w-xs" />
        <Input aria-label="Business type" value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="Business type (e.g. plumber) — blank = random" maxLength={60} className="max-w-xs" />
        <Button type="submit" variant="hero" size="sm" disabled={findM.isPending}>{findM.isPending ? "Searching & checking sites…" : "Find businesses"}</Button>
        {picked && <p className="w-full text-xs text-muted-foreground">Random pick: <span className="text-aetheris-teal">{picked}</span></p>}
        {msg && <p className="w-full text-sm text-aetheris-teal" aria-live="polite">{msg}</p>}
        {findM.error && <p role="alert" className="w-full text-sm text-destructive">{findM.error.message}</p>}
      </form>

      {(areas.length > 1 || categories.length > 1 || typeFilter) && (
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          {areas.length > 1 && (
            <>
              <span className="text-muted-foreground">Show queue from:</span>
              <select aria-label="Queue area" value={areaFilter} onChange={e => setAreaFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All areas ({allQueue.length})</option>
                {areas.map(a => <option key={a} value={a}>{a} ({allQueue.filter(r => r.area === a).length})</option>)}
              </select>
            </>
          )}
          <span className="text-muted-foreground">Business type:</span>
          <select aria-label="Queue business type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All types ({allQueue.length})</option>
            {categories.map(c => <option key={c} value={c}>{c} ({allQueue.filter(r => r.category === c).length})</option>)}
            {typeFilter && !categories.includes(typeFilter) && <option value={typeFilter}>{typeFilter} ({allQueue.filter(r => sameTrade(r.category, typeFilter)).length})</option>}
          </select>
        </div>
      )}
      {skipped.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Button type="button" variant="outline" size="sm" disabled={resetM.isPending}
            onClick={() => { if (confirm(`Bring back your ${skipped.length} skipped business${skipped.length > 1 ? "es" : ""}?`)) resetM.mutate(); }}>
            {resetM.isPending ? "Resetting…" : `Reset my queue (${skipped.length} skipped)`}
          </Button>
          <span className="text-muted-foreground">Only affects your queue.</span>
        </div>
      )}
      <div className="mt-8">
        {rows.isLoading || !regionLoaded ? <p className="text-sm text-muted-foreground">Loading & checking websites…</p> : !upcoming.length ? (
          <p className="revenue-card rounded-2xl p-6 text-sm text-muted-foreground">{websiteFilter === "none" ? "No businesses without a listed website in the queue." : websiteFilter === "has" ? "No businesses with a listed website in the queue." : "The queue is empty."} Search an area above to add businesses.</p>
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-3">
            {upcoming.map((r, index) => (
              <BusinessCard
                key={r.id}
                r={r}
                position={index + 1}
                total={queue.length}
                onSkip={() => skipM.mutate(r.id)}
                onDone={refresh}
              />
            ))}
          </div>
        )}
        {rows.error && <p role="alert" className="mt-4 text-sm text-destructive">{rows.error.message}</p>}
      </div>

      {subs.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-medium">Subscribers <span className="text-sm text-muted-foreground">({subs.length})</span></h2>
          <ul className="revenue-card mt-4 rounded-2xl">
            {subs.map(s => {
              const site = safeHttpUrl(s.website);
              return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 border-t border-border/60 p-4 text-sm first:border-t-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{s.business_name} <span className="text-xs text-muted-foreground">· {s.category}</span></div>
                  <a href={`tel:${s.phone}`} className="text-aetheris-teal">{s.phone}</a>
                  {site && <a href={site} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-xs text-electric underline decoration-dotted underline-offset-4 hover:decoration-solid" title="Open this site in a new tab">{site} ↗</a>}
                </div>
                <span className="rounded-full border border-success/40 px-3 py-1 text-xs text-success">Subscriber</span>
                <div className="w-full"><CustomerProfilePanel r={s} onSaved={refresh} /></div>
              </li>
              );
            })}

          </ul>
        </section>
      )}

      <CallHistory rows={rows.data?.rows ?? []} onRecalled={refresh} />
    </>
  );
}

/** Search past calls by name or phone and return one to the queue for a call back. */
function CallHistory({ rows, onRecalled }: { rows: CallRow[]; onRecalled: () => void }) {
  const recall = useServerFn(recallBusiness);
  const [query, setQuery] = useState("");
  const recallM = useMutation({ mutationFn: (id: string) => recall({ data: { id } }), onSuccess: onRecalled });
  const q = query.trim().toLowerCase();
  const matches = q.length < 2 ? [] : rows
    .filter(r => (r.called_at || r.status === "dismissed") && r.status !== "subscriber")
    .filter(r => r.business_name.toLowerCase().includes(q) || r.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")))
    .slice(0, 10);

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-medium">Call back <span className="text-sm text-muted-foreground">— find a past number</span></h2>
      <div className="scan-panel mt-4 rounded-2xl p-6">
        <Input
          aria-label="Search past calls"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Business name or phone number…"
          maxLength={80}
          className="max-w-md"
        />
        {q.length >= 2 && (
          matches.length ? (
            <ul className="mt-4 divide-y divide-border/60">
              {matches.map(r => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{r.business_name} <span className="text-xs text-muted-foreground">· {r.category}{r.area ? ` · ${r.area}` : ""}</span></div>
                    <a href={`tel:${r.phone}`} className="text-aetheris-teal">{r.phone}</a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.called_at ? `Called by ${r.caller_name || "the team"} · ${ptDate(r.called_at)} at ${ptTime(r.called_at)} PT${r.outcome ? ` · ${r.outcome}` : ""}` : "Removed from the call list"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled={recallM.isPending} onClick={() => recallM.mutate(r.id)}>
                    {recallM.isPending ? "Returning…" : "Call back — return to queue"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-muted-foreground">No past calls match that search.</p>
        )}
        {recallM.error && <p role="alert" className="mt-3 text-sm text-destructive">{recallM.error.message}</p>}
      </div>
    </section>
  );
}

function BusinessCard({ r, position, total, onSkip, onDone }: { r: CallRow; position: number; total: number; onSkip: () => void; onDone: () => void }) {
  const mark = useServerFn(markCalled);
  const triage = useServerFn(triageBusiness);
  const analyze = useServerFn(analyzeCallBusiness);
  const [open, setOpen] = useState(false);
  const markM = useMutation({ mutationFn: (outcome: string) => mark({ data: { id: r.id, called: true, outcome } }), onSuccess: onDone });
  const triageM = useMutation({ mutationFn: (status: "subscriber" | "dismissed") => triage({ data: { id: r.id, status } }), onSuccess: onDone });
  const analyzeM = useMutation({ mutationFn: () => analyze({ data: { id: r.id } }), onSuccess: () => { setOpen(true); onDone(); } });
  const busy = markM.isPending || triageM.isPending;
  const brief = analyzeM.data?.brief || r.brief;
  const hours = brief ? (brief.match(/##\s*Hours of operation[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i)?.[1] ?? "").replace(/[*_`]/g, "").trim() : "";
  const err = markM.error || triageM.error;
  const site = safeHttpUrl(r.website);
  const mapLink = addressMapsUrl(r.address);



  return (
    <article className="scan-panel min-w-0 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Business {position} of {total} in queue</span>
        <span className="rounded-full border border-aetheris-teal/40 px-3 py-1 text-aetheris-teal">{r.category}</span>
      </div>
      <h2 className="mt-4 break-words font-display text-3xl font-medium">{r.business_name}</h2>
      <a href={`tel:${r.phone}`} className="mt-2 block text-2xl font-medium text-aetheris-teal">{r.phone}</a>
      {mapLink ? (
        <a href={mapLink} target="_blank" rel="noopener noreferrer" title="Open this address in Google Maps" className="mt-2 block break-words text-sm text-electric underline decoration-dotted underline-offset-4 hover:decoration-solid">{r.address} ↗</a>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{r.address}</p>
      )}

      {site ? (
        <div className="mt-1">
          <p className="break-all text-sm">
            {r.website_status === "reachable" ? null : <span className="text-muted-foreground">Listed website: </span>}
            <a href={site} target="_blank" rel="noopener noreferrer" className="text-electric underline decoration-dotted underline-offset-4 hover:decoration-solid" title="Open this site in a new tab to verify it">{site} ↗</a>
          </p>
          <p className={`mt-1 text-xs ${r.website_status === "reachable" ? "text-success" : "text-muted-foreground"}`}>
            {r.website_status === "reachable" ? "Website responded with page content" : `${r.website_status === "unavailable" ? "Website unavailable at last check" : "Website not verified"} · ${r.website_check_note}`}
          </p>
        </div>
      ) : r.website ? (
        <div className="mt-1 text-sm text-muted-foreground">
          <p className="break-all">Listed website: {r.website}</p>
          <p className="mt-1 text-xs">This listed address isn't a web link.</p>
        </div>
      ) : <p className="mt-1 text-sm text-muted-foreground">No website listed on Google</p>}

      {r.website_checked_at && r.website && <p className="mt-1 text-xs text-muted-foreground">Checked {ptDate(r.website_checked_at)} at {ptTime(r.website_checked_at)} PT</p>}

      {hours && <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground"><span className="text-foreground">Hours:</span> {hours}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {brief ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(o => !o)}>{open ? "Hide analysis" : "View analysis"}</Button>
        ) : (
          <Button size="sm" variant="outline" disabled={analyzeM.isPending} onClick={() => analyzeM.mutate()}>{analyzeM.isPending ? "Analyzing…" : r.website ? "Analyze website" : "Analyze business"}</Button>
        )}
        {brief && <Button size="sm" variant="link" className="h-auto p-0 text-xs" disabled={analyzeM.isPending} onClick={() => analyzeM.mutate()}>{analyzeM.isPending ? "Re-running…" : "Re-run"}</Button>}
      </div>
      {analyzeM.error && <p role="alert" className="mt-2 text-xs text-destructive">{analyzeM.error.message}</p>}
      {open && brief && <Markdown text={brief} className="scan-panel mt-3 rounded-xl p-4 text-xs leading-6 text-muted-foreground" />}
      <CustomerProfilePanel r={r} onSaved={onDone} />

      <div className="mt-6 grid gap-3 [&>button]:h-auto [&>button]:min-h-10 [&>button]:whitespace-normal">
        <Button variant="hero" disabled={busy} onClick={() => markM.mutate(prompt("How did the call go? (optional)") ?? "")}>
          {markM.isPending ? "Saving…" : "Called — check off"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onSkip}>Skip — no answer, back of queue</Button>
        <Button variant="outline" className="border-success/40 text-success" disabled={busy} onClick={() => { if (confirm("Mark this business as a subscriber (paying customer)?")) triageM.mutate("subscriber"); }}>
          Subscriber — stays on board
        </Button>
        <Button variant="outline" className="border-destructive/40 text-destructive" disabled={busy} onClick={() => { if (confirm("Remove this business from the call list for everyone?")) triageM.mutate("dismissed"); }}>
          No call list — remove
        </Button>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-destructive">{err.message}</p>}
      {r.called_at && <p className="mt-3 text-xs text-success">Called by {r.caller_name} · {ptDate(r.called_at)} at {ptTime(r.called_at)} PT{r.outcome && ` · ${r.outcome}`}</p>}
    </article>
  );
}

/** Loose trade match so "Plumbing", "plumber" and "Plumbers" all match each other. */
function sameTrade(category: string, filter: string) {
  const stems = (v: string) => v.toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 4 && !["services", "service", "company", "local"].includes(w)).map(w => w.slice(0, 5));
  const f = stems(filter), c = stems(category);
  if (!f.length) return category.toLowerCase().includes(filter.toLowerCase());
  return f.some(x => c.includes(x));
}
