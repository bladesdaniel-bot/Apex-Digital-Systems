import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";

const COUNTRIES = ["US", "CA", "MX", "GB", "IE", "AU", "NZ", "DE", "FR", "ES", "IT", "NL", "BE", "SE", "NO", "DK", "FI", "PL", "PT", "CH", "AT", "BR", "AR", "CL", "CO", "PE", "PH", "IN", "PK", "NG", "ZA", "KE", "AE", "SA", "SG", "MY", "JP", "KR"];
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamShell } from "@/components/TeamShell";
import { CustomerProfilePanel } from "@/components/CustomerProfilePanel";
import { OrderBuilder } from "@/components/OrderBuilder";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getMyAccess } from "@/lib/team.functions";
import { searchOrders, type OrderMatch } from "@/lib/quotes.functions";
import { analyzeCallBusiness, findBusinesses, markNoAnswer, returnNoAnswer, listCallList, markCalled, recallBusiness, resetMyQueue, scheduleCallback, skipBusiness, triageBusiness, listTeamCallActivity, type CallRow } from "@/lib/call-list.functions";
import { callQueue, noAnswerPool, upcomingCalls, subscribers, safeHttpUrl, isCallbackPending, hasCallback, sameTrade, isExcludedCategory, type WebsiteFilter, type TierFilter } from "@/lib/call-list";
import { randomCityFor } from "@/lib/call-cities";
import { ptDate, ptTime } from "@/lib/visit-format";
import { TIMEZONES, guessTimezone, zonedToIso, threeTimes } from "@/lib/timezones";

/** The signed-in rep's own time zone, from the location on their team profile. */
function useRepTz() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  return guessTimezone((me.data as { location?: string } | undefined)?.location);
}
import { addressMapsUrl, googleSearchUrl } from "@/lib/geo";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-medium">Call <span className="gradient-text">list</span></h1>
        {allowed && (
          <Dialog>
            <DialogTrigger asChild><Button variant="hero" size="sm">+ New customer order</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New customer order</DialogTitle>
                <DialogDescription>For customers you met in person or who aren't on the call list — fill in their details and place the order.</DialogDescription>
              </DialogHeader>
              <OrderBuilder embedded />
            </DialogContent>
          </Dialog>
        )}
      </div>
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
  const resetM = useMutation({ mutationFn: () => reset(), onSuccess: () => { setMsg("Your skipped businesses are back in the queue."); refresh(); } });
  const findM = useMutation({
    mutationFn: (area: string) => find({ data: { area, website_filter: websiteFilter, business_type: businessType, tier } }),
    onSuccess: r => {
      if (r.added) setMsg(`Added ${r.added} new business${r.added > 1 ? "es" : ""} from ${r.area} to the queue.`);
      else if (!r.found) setMsg(`Google found no matching businesses in ${r.area}. Try a bigger nearby city.`);
      else {
        const why = [
          r.hadWebsite ? `${r.hadWebsite} already have a website` : "",
          r.alreadyListed ? `${r.alreadyListed} are already on your list` : "",
        ].filter(Boolean).join(" and ");
        setMsg(`Searched ${r.found} businesses in ${r.area}, but ${why || "none matched"}.${r.hadWebsite && websiteFilter === "none" ? " Set the website filter to \"Any\" to add them." : " Try another city."}`);
      }
      refresh();
    },
  });

  const [country, setCountry] = useState("US");
  const [state, setState] = useState("");
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>("any");
  const [businessType, setBusinessType] = useState("");
  const [tier, setTier] = useState<TierFilter>("priority");
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
  const allQueue = callQueue(rows.data?.rows ?? [], websiteFilter).filter(r => !isExcludedCategory(r.category));
  const areas = [...new Set(allQueue.map(r => r.area).filter(Boolean))];
  const categories = [...new Set(allQueue.map(r => r.category).filter(Boolean))];
  // A typed business search focuses the queue on that kind; "All types" shows everything again.
  const typeMatch = (r: { category: string }) => !typeFilter || sameTrade(r.category, typeFilter);
  const queue = allQueue.filter(r => (!areaFilter || r.area === areaFilter) && typeMatch(r));
  const subs = subscribers(rows.data?.rows ?? []);
  // Skipped businesses live in their own pool until the caller brings them back.
  const skippedSet = new Set(skipped);
  const upcoming = upcomingCalls(queue.filter(r => !skippedSet.has(r.id)), []);
  const skippedPool = callQueue(rows.data?.rows ?? [], "any").filter(r => skippedSet.has(r.id));
  const noAnswer = noAnswerPool(rows.data?.rows ?? []);
  const returnNA = useServerFn(returnNoAnswer);
  const returnNAM = useMutation({ mutationFn: (id?: string) => returnNA({ data: id ? { id } : {} }), onSuccess: refresh });
  const unskipM = useMutation({ mutationFn: (id: string) => skip({ data: { id, skip: false } }), onSuccess: refresh });
  const callbacks = (rows.data?.rows ?? []).filter(r => r.status === "queued" && !r.called_at && hasCallback(r))
    .sort((a, b) => new Date(a.callback_at!).getTime() - new Date(b.callback_at!).getTime());

  return (
    <>
      <QuickLookup rows={rows.data?.rows ?? []} onDone={refresh} />
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
        <select aria-label="Call sheet tier" value={tier} onChange={e => setTier(e.target.value as TierFilter)} className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm sm:w-auto">
          <option value="priority">Tier 1 first, then Tier 2</option>
          <option value="tier1">Tier 1 only — high ticket</option>
          <option value="tier2">Tier 2 only — repeat customers</option>
        </select>
        <Input aria-label="Business type" value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="Business type (e.g. plumber) — blank = tier mix" maxLength={60} className="max-w-xs" />
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

      <Callbacks rows={callbacks} onChanged={refresh} />

      {subs.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-medium">Subscribers <span className="text-sm text-muted-foreground">({subs.length})</span></h2>
          <ul className={`revenue-card mt-4 rounded-2xl ${SCROLL_BOX}`}>
            {subs.map(s => {
              const site = safeHttpUrl(s.website);
              const searchLink = googleSearchUrl(s.business_name, s.address);
              return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 border-t border-border/60 p-4 text-sm first:border-t-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {s.business_name}
                    {searchLink && <> <a href={searchLink} target="_blank" rel="noopener noreferrer" title="Search this business on Google to do your own research" className="text-xs text-electric underline decoration-dotted underline-offset-4 hover:decoration-solid">Google search ↗</a></>}
                    <span className="text-xs text-muted-foreground"> · {s.category}</span>
                  </div>
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

      {skippedPool.length > 0 && (
        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-medium">Skipped <span className="text-sm text-muted-foreground">({skippedPool.length} — only you see these)</span></h2>
            <Button type="button" variant="outline" size="sm" disabled={resetM.isPending}
              onClick={() => { if (confirm(`Put all ${skippedPool.length} skipped businesses back in your queue?`)) resetM.mutate(); }}>
              {resetM.isPending ? "Returning…" : "Return all to queue"}
            </Button>
          </div>
          <ul className={`revenue-card mt-4 rounded-2xl ${SCROLL_BOX}`}>
            {skippedPool.map(r => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 border-t border-border/60 p-4 text-sm first:border-t-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.business_name} <span className="text-xs text-muted-foreground">· {r.category}{r.area ? ` · ${r.area}` : ""}</span></div>
                  <a href={`tel:${r.phone}`} className="text-aetheris-teal">{r.phone}</a>
                </div>
                <Button size="sm" variant="outline" disabled={unskipM.isPending} onClick={() => unskipM.mutate(r.id)}>Back to queue</Button>
              </li>
            ))}
          </ul>
          {unskipM.error && <p role="alert" className="mt-3 text-sm text-destructive">{unskipM.error.message}</p>}
        </section>
      )}

      {noAnswer.length > 0 && (
        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-medium">No Answer <span className="text-sm text-muted-foreground">({noAnswer.length} — shared with the team)</span></h2>
            <Button type="button" variant="outline" size="sm" disabled={returnNAM.isPending}
              onClick={() => { if (confirm(`Put all ${noAnswer.length} no-answer businesses back in the queue?`)) returnNAM.mutate(undefined); }}>
              {returnNAM.isPending ? "Returning…" : "Return all to queue"}
            </Button>
          </div>
          <ul className={`revenue-card mt-4 rounded-2xl ${SCROLL_BOX}`}>
            {noAnswer.map(r => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 border-t border-border/60 p-4 text-sm first:border-t-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.business_name} <span className="text-xs text-muted-foreground">· {r.category}{r.area ? ` · ${r.area}` : ""}</span></div>
                  <a href={`tel:${r.phone}`} className="text-aetheris-teal">{r.phone}</a>
                  <div className="text-xs text-muted-foreground">No answer {ptDate(r.no_answer_at!)} at {ptTime(r.no_answer_at!)} PT · {r.no_answer_name || "Team member"} · {r.no_answer_count} attempt{r.no_answer_count === 1 ? "" : "s"}</div>
                </div>
                <Button size="sm" variant="outline" disabled={returnNAM.isPending} onClick={() => returnNAM.mutate(r.id)}>Return to queue</Button>
              </li>
            ))}
          </ul>
          {returnNAM.error && <p role="alert" className="mt-3 text-sm text-destructive">{returnNAM.error.message}</p>}
        </section>
      )}


      <TeamCallActivity />

      <CallHistory rows={rows.data?.rows ?? []} onRecalled={refresh} />
    </>
  );
}

/** Long pools show about three entries, then scroll inside their own box instead of stretching the page. */
const SCROLL_BOX = "max-h-[22rem] overflow-y-auto overscroll-contain";

/** Scheduled call-backs stay here (marked "Due now" once their time passes) until a call outcome or an explicit cancel. */
function Callbacks({ rows: allRows, onChanged }: { rows: CallRow[]; onChanged: () => void }) {
  const repTz = useRepTz();
  const schedule = useServerFn(scheduleCallback);
  // Opening a call-back never clears its time; only a call outcome or an explicit cancel does.
  const [openId, setOpenId] = useState<string | null>(null);
  const [rep, setRep] = useState("");
  const clearM = useMutation({ mutationFn: (id: string) => schedule({ data: { id, callback_at: null, callback_reason: "" } }), onSuccess: onChanged });
  if (!allRows.length) return null;
  // Teammates only receive their own call-backs, so more than one rep here means the admin is viewing.
  const reps = [...new Map(allRows.filter(r => r.callback_by).map(r => [r.callback_by!, r.callback_name || "Team member"])).entries()];
  const rows = rep ? allRows.filter(r => r.callback_by === rep) : allRows;
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-medium">Call-backs <span className="text-sm text-muted-foreground">({rows.length} scheduled)</span></h2>
        {reps.length > 1 && (
          <select aria-label="Filter call-backs by team member" value={rep} onChange={e => setRep(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All team members ({allRows.length})</option>
            {reps.map(([id, name]) => <option key={id} value={id}>{name} ({allRows.filter(r => r.callback_by === id).length})</option>)}
          </select>
        )}
      </div>
      <ul className={`revenue-card mt-4 rounded-2xl ${openId ? "" : SCROLL_BOX}`}>
        {rows.map(r => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 border-t border-border/60 p-4 text-sm first:border-t-0">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{r.business_name} <span className="text-xs text-muted-foreground">· {r.category}</span></div>
              <a href={`tel:${r.phone}`} className="text-aetheris-teal">{r.phone}</a>
              <p className="mt-1 text-xs text-muted-foreground">
                {!isCallbackPending(r) && <span className="mr-2 rounded-full border border-destructive/50 px-2 py-0.5 font-medium text-destructive">Due now</span>}
                Call back {ptDate(r.callback_at!)}: {threeTimes(r.callback_at!, guessTimezone(r.address, r.area), r.callback_location ? guessTimezone(r.callback_location) : repTz, r.callback_name ? `${r.callback_name.split(" ")[0]} (rep)` : undefined)}{r.callback_name ? ` · set by ${r.callback_name}` : ""}
              </p>
              {r.callback_reason && <p className="mt-1 break-words text-xs text-foreground/80">Reason: {r.callback_reason}</p>}
            </div>
            <Button size="sm" variant="hero" onClick={() => setOpenId(id => id === r.id ? null : r.id)}>
              {openId === r.id ? "Close" : "Open / Call"}
            </Button>
            <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" disabled={clearM.isPending}
              onClick={() => { if (confirm("Cancel this call-back? It will go back into the regular queue.")) clearM.mutate(r.id); }}>
              Cancel call-back
            </Button>
            {openId === r.id && (
              <div className="w-full">
                <BusinessCard r={r} position={1} total={1} hideSkip onSkip={() => setOpenId(null)} onDone={onChanged} />
              </div>
            )}
          </li>
        ))}
      </ul>
      {clearM.error && <p role="alert" className="mt-3 text-sm text-destructive">{clearM.error.message}</p>}
    </section>
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
                    <div className="font-medium">
                      {r.business_name}
                      {googleSearchUrl(r.business_name, r.address) && <> <a href={googleSearchUrl(r.business_name, r.address)} target="_blank" rel="noopener noreferrer" title="Search this business on Google to do your own research" className="text-xs text-electric underline decoration-dotted underline-offset-4 hover:decoration-solid">Google search ↗</a></>}
                      <span className="text-xs text-muted-foreground"> · {r.category}{r.area ? ` · ${r.area}` : ""}</span>
                    </div>
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

function BusinessCard({ r, position, total, onSkip, onDone, hideSkip }: { r: CallRow; position: number; total: number; onSkip: () => void; onDone: () => void; hideSkip?: boolean }) {
  const mark = useServerFn(markCalled);
  const triage = useServerFn(triageBusiness);
  const analyze = useServerFn(analyzeCallBusiness);
  const schedule = useServerFn(scheduleCallback);
  const [open, setOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [reasonError, setReasonError] = useState("");
  const repTz = useRepTz();
  const [cbTz, setCbTz] = useState(() => guessTimezone(r.address, r.area));
  const [cbWhen, setCbWhen] = useState("");
  const callbackM = useMutation({
    mutationFn: (input: { iso: string; reason: string }) => schedule({ data: { id: r.id, callback_at: input.iso, callback_reason: input.reason } }),
    onSuccess: () => { setCallbackOpen(false); setReasonError(""); onDone(); },
  });
  const submitCallback = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const v = String(form.get("callback_at") ?? "");
    const reason = String(form.get("callback_reason") ?? "").trim();
    if (v && !reason) { setReasonError("Please add the reason for this call-back."); return; }
    setReasonError("");
    if (v) callbackM.mutate({ iso: zonedToIso(v, cbTz), reason });
  };
  const markM = useMutation({ mutationFn: (outcome: string) => mark({ data: { id: r.id, called: true, outcome } }), onSuccess: onDone });
  const noAns = useServerFn(markNoAnswer);
  const noAnsM = useMutation({ mutationFn: () => noAns({ data: { id: r.id } }), onSuccess: onDone });
  const triageM = useMutation({ mutationFn: (status: "subscriber" | "dismissed") => triage({ data: { id: r.id, status } }), onSuccess: onDone });
  const analyzeM = useMutation({ mutationFn: () => analyze({ data: { id: r.id } }), onSuccess: () => { setOpen(true); onDone(); } });
  const busy = markM.isPending || triageM.isPending;
  const brief = analyzeM.data?.brief || r.brief;
  const err = markM.error || triageM.error;
  const site = safeHttpUrl(r.website);
  const mapLink = addressMapsUrl(r.address);
  const searchLink = googleSearchUrl(r.business_name, r.address);



  return (
    <article className="scan-panel min-w-0 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{hideSkip ? "Scheduled call-back" : `Business ${position} of ${total} in queue`}</span>
        <span className="rounded-full border border-aetheris-teal/40 px-3 py-1 text-aetheris-teal">{r.category}</span>
      </div>
      <h2 className="mt-4 break-words font-display text-3xl font-medium">
        {r.business_name}
        {searchLink && (
          <>
            {" "}
            <a href={searchLink} target="_blank" rel="noopener noreferrer" title="Search this business on Google to do your own research" className="align-middle font-body text-sm text-electric underline decoration-dotted underline-offset-4 hover:decoration-solid">Google search ↗</a>
          </>
        )}
      </h2>
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
        <Button variant="hero" disabled={busy} onClick={() => markM.mutate(prompt("How did the call go, and why? (the whole team will see this reason)") ?? "")}>
          {markM.isPending ? "Saving…" : "Called — check off"}
        </Button>
        <Button variant="outline" disabled={busy || noAnsM.isPending} onClick={() => noAnsM.mutate()}>
          {noAnsM.isPending ? "Saving…" : "No answer — move to No Answer pool"}
        </Button>
        {noAnsM.error && <p role="alert" className="text-xs text-destructive">{noAnsM.error.message}</p>}
        {!hideSkip && <Button variant="outline" disabled={busy} onClick={onSkip}>Skip — move to my Skipped pool</Button>}
        <Button variant="outline" disabled={busy || callbackM.isPending} onClick={() => setCallbackOpen(o => !o)}>
          {callbackOpen ? "Cancel call-back" : "Call back later — pick a time"}
        </Button>
        {callbackOpen && (
          <form onSubmit={submitCallback} className="grid gap-2 rounded-xl border border-border/60 p-3">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Customer's time zone (auto-detected from address)
              <select value={cbTz} onChange={e => setCbTz(e.target.value)} aria-label="Customer time zone" className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground">
                {TIMEZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              When should you call back? (the customer's local time)
              <Input name="callback_at" type="datetime-local" required aria-label="Call-back date and time" value={cbWhen} onChange={e => setCbWhen(e.target.value)} />
            </label>
            {cbWhen && <p className="text-xs text-aetheris-teal">= {threeTimes(zonedToIso(cbWhen, cbTz), cbTz, repTz, "you")}</p>}
            <label className="grid gap-1 text-xs text-muted-foreground">
              Why the call-back? (required)
              <Input name="callback_reason" maxLength={500} required aria-label="Call-back reason" placeholder="Reason for the call-back…" />
            </label>
            {reasonError && <p role="alert" className="text-xs text-destructive">{reasonError}</p>}
            <Button type="submit" size="sm" variant="hero" disabled={callbackM.isPending}>{callbackM.isPending ? "Saving…" : "Schedule call-back"}</Button>
            {callbackM.error && <p role="alert" className="text-xs text-destructive">{callbackM.error.message}</p>}
          </form>
        )}
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


/** Incoming-caller lookup: type a phone number (3+ digits) or business name to pop their card back up. */
function QuickLookup({ rows, onDone }: { rows: CallRow[]; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const digits = q.replace(/\D/g, "");
  const text = q.trim().toLowerCase();
  const searching = digits.length >= 3 || (!digits && text.length >= 2);
  const matches = searching
    ? rows.filter(r => digits.length >= 3
        ? r.phone.replace(/\D/g, "").includes(digits)
        : r.business_name.toLowerCase().includes(text) || r.contact_name.toLowerCase().includes(text)).slice(0, 8)
    : [];
  const label = (r: CallRow) => r.status === "subscriber" ? "Subscriber" : hasCallback(r) ? "Call-back" : r.called_at ? `Called${r.outcome ? ` · ${r.outcome}` : ""}` : r.status === "dismissed" ? "No call list" : "In queue";
  const open = rows.find(r => r.id === openId);
  const searchO = useServerFn(searchOrders);
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const ordersQ = useQuery({ queryKey: ["order-lookup", debounced], queryFn: () => searchO({ data: { q: debounced } }), enabled: searching && debounced.length >= 2 });
  const orderMatches: OrderMatch[] = searching ? ordersQ.data ?? [] : [];
  const [orderId, setOrderId] = useState<string | null>(null);
  const openOrder = orderMatches.find(o => o.id === orderId);
  const orderLabel = (o: OrderMatch) => o.status === "canceled" ? "Canceled" : o.build_status === "on_hold" ? "On hold" : o.build_status === "delivered" ? "Delivered" : o.build_status === "in_progress" ? "In progress" : o.status === "paid" ? "Paid" : o.status === "partially_paid" ? "Partly paid" : o.build_status ? "Awaiting payment" : "Quote";
  return (
    <section className="scan-panel mt-8 rounded-2xl p-6">
      <label htmlFor="quick-lookup" className="text-sm font-medium">📞 Incoming caller lookup</label>
      <Input id="quick-lookup" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Type their phone number or business name…" className="mt-2" />
      {searching && (
        matches.length ? (
          <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60">
            {matches.map(r => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpenId(r.id)} className="flex w-full flex-wrap items-center gap-2 p-3 text-left text-sm hover:bg-muted/40">
                  <span className="min-w-0 flex-1"><span className="font-medium">{r.business_name}</span> <span className="text-muted-foreground">· {r.phone}</span>
                    {r.callback_reason && hasCallback(r) && <span className="block text-xs text-muted-foreground">Call-back: {r.callback_reason}</span>}
                    {r.caller_name && r.called_at && <span className="block text-xs text-muted-foreground">Last called by {r.caller_name} on {ptDate(r.called_at)}</span>}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs">{label(r)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted-foreground">No match on your call list.</p>
      )}
      {searching && orderMatches.length > 0 && (
        <>
          <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Orders & walk-in customers</p>
          <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border/60">
            {orderMatches.map(o => (
              <li key={o.id}>
                <button type="button" onClick={() => setOrderId(o.id)} className="flex w-full flex-wrap items-center gap-2 p-3 text-left text-sm hover:bg-muted/40">
                  <span className="min-w-0 flex-1"><span className="font-medium">{o.business_name}</span>{o.customer_phone && <span className="text-muted-foreground"> · {o.customer_phone}</span>}
                    <span className="block text-xs text-muted-foreground">Written by {o.created_by_name} on {ptDate(o.created_at)}</span>
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs">{orderLabel(o)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <Dialog open={!!openOrder} onOpenChange={o => { if (!o) setOrderId(null); }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openOrder?.business_name}</DialogTitle>
            <DialogDescription>{openOrder ? orderLabel(openOrder) : ""} — closing keeps your place in the queue.</DialogDescription>
          </DialogHeader>
          {openOrder && (
            <div className="grid gap-2 text-sm">
              {openOrder.contact_name && <p><span className="text-muted-foreground">Contact:</span> {openOrder.contact_name}</p>}
              {openOrder.customer_phone && <p><span className="text-muted-foreground">Phone:</span> <a className="text-aetheris-teal underline" href={`tel:${openOrder.customer_phone}`}>{openOrder.customer_phone}</a></p>}
              {openOrder.contact_email && <p><span className="text-muted-foreground">Email:</span> <a className="text-aetheris-teal underline" href={`mailto:${openOrder.contact_email}`}>{openOrder.contact_email}</a></p>}
              {openOrder.customer_address && <p><span className="text-muted-foreground">Address:</span> <a className="text-aetheris-teal underline" target="_blank" rel="noreferrer" href={addressMapsUrl(openOrder.customer_address)}>{openOrder.customer_address}</a></p>}
              {safeHttpUrl(openOrder.customer_url) && <p><span className="text-muted-foreground">Website:</span> <a className="text-aetheris-teal underline" target="_blank" rel="noreferrer" href={safeHttpUrl(openOrder.customer_url)!}>{openOrder.customer_url}</a></p>}
              <p><span className="text-muted-foreground">Package:</span> {openOrder.package_name || "—"} · ${Number(openOrder.one_time_total).toFixed(2)}</p>
              <p><span className="text-muted-foreground">Written by:</span> {openOrder.created_by_name} on {ptDate(openOrder.created_at)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="hero" size="sm"><a href="/team/orders">Open Build Orders to edit</a></Button>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/pay/${openOrder.id}`)}>Copy payment link</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!open} onOpenChange={o => { if (!o) setOpenId(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{open?.business_name}</DialogTitle>
            <DialogDescription>Caller file — closing keeps your place in the queue.</DialogDescription>
          </DialogHeader>
          {open && <>
            {(open.callback_reason || open.profile_notes) && (
              <div className="rounded-xl border border-border/60 p-3 text-sm">
                {open.callback_reason && <p><span className="text-muted-foreground">Call-back reason:</span> {open.callback_reason}{open.callback_at ? ` (${ptDate(open.callback_at)} ${ptTime(open.callback_at)})` : ""}</p>}
                {open.profile_notes && <p className="mt-1 whitespace-pre-wrap"><span className="text-muted-foreground">Notes:</span> {open.profile_notes}</p>}
              </div>
            )}
            <BusinessCard r={open} position={1} total={1} hideSkip onSkip={() => {}} onDone={onDone} />
          </>}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Shared feed of every logged call (last 14 days) so the whole team sees who called, the outcome and why. */
function TeamCallActivity() {
  const list = useServerFn(listTeamCallActivity);
  const q = useQuery({ queryKey: ["team-call-activity"], queryFn: () => list(), refetchInterval: 30_000 });
  const [who, setWho] = useState("");
  const [search, setSearch] = useState("");
  const all = q.data ?? [];
  const people = [...new Set(all.map(c => c.caller_name).filter(Boolean))].sort();
  const s = search.trim().toLowerCase();
  const sd = s.replace(/\D/g, "");
  const shown = all.filter(c => (!who || c.caller_name === who) && (!s || c.business_name.toLowerCase().includes(s) || (sd.length >= 3 && c.phone.replace(/\D/g, "").includes(sd)))).slice(0, 100);
  const tone = (o: string) => /no answer/i.test(o) ? "border-border text-muted-foreground" : "border-success/40 text-success";
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-medium">Team call activity <span className="text-sm text-muted-foreground">— every call by the team, last 14 days</span></h2>
      <div className="scan-panel mt-4 rounded-2xl p-6">
        <div className="flex flex-wrap gap-3">
          <select aria-label="Filter by teammate" value={who} onChange={e => setWho(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All teammates</option>
            {people.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <Input aria-label="Search team calls" value={search} onChange={e => setSearch(e.target.value)} placeholder="Business name or phone…" className="max-w-xs" />
        </div>
        {q.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          : q.error ? <p role="alert" className="mt-4 text-sm text-destructive">{q.error.message}</p>
          : !shown.length ? <p className="mt-4 text-sm text-muted-foreground">No calls yet.</p> : (
          <ul className={`mt-4 divide-y divide-border/60 ${SCROLL_BOX}`}>
            {shown.map(c => (
              <li key={c.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.business_name}</span>
                  <a href={`tel:${c.phone}`} className="text-aetheris-teal">{c.phone}</a>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${tone(c.outcome)}`}>{/no answer/i.test(c.outcome) ? "No answer" : "Called"}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.caller_name || "Team member"} · {ptDate(c.called_at)} at {ptTime(c.called_at)} PT</p>
                {c.outcome && !/^no answer$/i.test(c.outcome) && <p className="mt-1 break-words text-xs text-foreground/90"><span className="text-muted-foreground">Reason / outcome:</span> {c.outcome}</p>}
                {c.callback_reason && <p className="mt-1 break-words text-xs text-foreground/90"><span className="text-muted-foreground">Call-back reason:</span> {c.callback_reason}</p>}
                {!c.outcome && !c.callback_reason && <p className="mt-1 text-xs italic text-muted-foreground">No reason entered</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
