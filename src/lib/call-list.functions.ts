import { OWNER_EMAIL } from "@/lib/owner-email";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUseBrief, type TeamRole } from "./team-access";
import { tierSearchOrder, isExcludedCategory, callbackScheduleSchema, matchesWebsiteFilter, visibleCallbackRows, type WebsiteFilter } from "./call-list";
import type { WebsiteStatus } from "./website-check";

export type CallRow = {
  id: string; place_id: string; business_name: string; phone: string; address: string; website: string;
  category: string; area: string; found_at: string; called_by: string | null; caller_name: string; called_at: string | null; outcome: string; brief: string; brief_at: string | null;
  status: "queued" | "subscriber" | "dismissed";
  website_status: WebsiteStatus; website_checked_at: string | null; website_check_note: string;
  callback_at: string | null; callback_by: string | null; callback_name: string; callback_reason: string;
  no_answer_at: string | null; no_answer_name: string; no_answer_count: number;
  /** Profile locations of the call-back scheduler and the rep of record, so times show in their own zone. */
  callback_location?: string; rep_location?: string; rep_id?: string | null;
} & CustomerProfile;
const COLS = "id, place_id, business_name, phone, address, website, category, area, found_at, called_by, caller_name, called_at, outcome, brief, brief_at, status, website_status, website_checked_at, website_check_note, callback_at, callback_by, callback_name, callback_reason, no_answer_at, no_answer_name, no_answer_count, contact_name, contact_role, needs, interested_package, budget, follow_up_date, appointment_at, expected_by, rep_name, rep_employee_id, profile_notes, profile_updated_by_name, profile_updated_at, rep_id";

async function requireTeam(ctx: any): Promise<TeamRole> {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).maybeSingle();
  const role = (data?.role as TeamRole | undefined) ?? null;
  if (!canUseBrief(role)) throw new Error("Team members only.");
  return role as TeamRole;
}

export const listCallList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await requireTeam(context);
    const { data, error } = await (context.supabase as any).from("call_list").select(COLS).order("found_at", { ascending: false }).limit(2000);
    if (error) throw new Error("Couldn't load the call list.");
    // Teammates only see their own pending call-backs; the admin sees everyone's.
    const rows = visibleCallbackRows((data ?? []) as CallRow[], context.userId, role === "admin");
    // Check legacy queue rows in bounded batches before letting them appear to callers.
    const pending = rows.filter(r => r.status === "queued" && !r.called_at && r.website_status === "unchecked")
      .sort((a, b) => a.found_at.localeCompare(b.found_at)).slice(0, 12);
    if (pending.length) {
      const { checkWebsite, mapWebsiteChecks } = await import("./website-check.server");
      await mapWebsiteChecks(pending, async row => {
        const result = await checkWebsite(row.website);
        const { error: saveError } = await context.supabase.from("call_list").update(result).eq("id", row.id);
        if (saveError) throw new Error("Couldn't save website checks. Try again.");
        Object.assign(row, result);
        return row;
      });
    }
    const people = [...new Set(rows.flatMap(r => [r.callback_by, r.rep_id]).filter(Boolean))] as string[];
    if (people.length) {
      const { data: profs } = await (context.supabase as any).from("profiles").select("id, location").in("id", people);
      const loc = new Map<string, string>((profs ?? []).map((p: any) => [p.id, p.location ?? ""]));
      for (const r of rows) { r.callback_location = r.callback_by ? loc.get(r.callback_by) ?? "" : ""; r.rep_location = r.rep_id ? loc.get(r.rep_id) ?? "" : ""; }
    }
    const { data: skips } = await (context.supabase as any).from("call_list_skips").select("call_list_id, skipped_at").eq("user_id", context.userId);
    return { rows, skipped: (skips ?? []) as { call_list_id: string; skipped_at: string }[] };
  });

/** Searches Google for random businesses in an area and adds only never-before-seen ones to the shared list. */
export const findBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    area: z.string().trim().min(2).max(120),
    website_filter: z.enum(["any", "none", "has"]).default("any"),
    business_type: z.string().trim().max(60).default(""),
    tier: z.enum(["priority", "tier1", "tier2"]).default("priority"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) throw new Error("Business search isn't connected yet.");

    const { data: existing } = await (context.supabase as any).from("call_list").select("place_id").limit(10000);
    const seen = new Set<string>((existing ?? []).map((r: any) => r.place_id));
    // A chosen business type searches that kind only; blank keeps the random mix.
    const t = data.business_type;
    // Google's categories differ from the word typed ("coffee" → cafe, espresso bar), so search the aliases too.
    const SEARCH_ALIASES: Record<string, string[]> = {
      coffee: ["coffee shop", "cafe", "espresso bar", "coffeehouse"],
      cafe: ["coffee shop", "espresso bar"],
      gym: ["fitness center", "gym"],
      barber: ["barbershop", "barber shop"],
    };
    const key = t.toLowerCase();
    const types = t
      ? [...new Set([t, ...(SEARCH_ALIASES[key] ?? []), `${t} services`, `${t} company`, `local ${t}`])]
      : tierSearchOrder(data.tier);
    // Website-targeted searches skip more results, so try harder before giving up.
    const maxTypes = data.business_type ? 6 : data.website_filter === "any" ? 3 : 6;
    // Google returns 20 per page; dig up to 3 pages when filtering so a filter doesn't empty the first page.
    const maxPages = data.business_type || data.website_filter !== "any" ? 3 : 1;
    const deadline = Date.now() + 45_000;
    const rows: any[] = [];
    let found = 0, hadWebsite = 0, alreadyListed = 0;
    const { checkWebsite, mapWebsiteChecks } = await import("./website-check.server");
    const { findBusinessWebsite } = await import("./website-finder.server");

    outer: for (const type of types.slice(0, maxTypes)) {
      let pageToken: string | undefined;
      for (let page = 0; page < maxPages; page++) {
        if (Date.now() > deadline) break outer;
        const res = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": mapsKey,
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "places.id,places.displayName,places.nationalPhoneNumber,places.formattedAddress,places.websiteUri,places.primaryTypeDisplayName,nextPageToken",
          },
          body: JSON.stringify({ textQuery: `${type} in ${data.area}`, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error(`Places search failed [${res.status}]: ${body}`);
          if (rows.length) break outer;
          throw new Error(res.status === 429 ? "Daily search limit reached. Try again later." : "Business search failed. Try again.");
        }
        const json = (await res.json()) as { places?: any[]; nextPageToken?: string };
        const candidates: any[] = [];
        for (const p of json.places ?? []) {
          if (!p.id || !p.nationalPhoneNumber) continue;
          found++;
          if (seen.has(p.id)) { alreadyListed++; continue; }
          if (isExcludedCategory(`${p.primaryTypeDisplayName?.text ?? ""} ${p.displayName?.text ?? ""}`)) continue;
          if (!matchesWebsiteFilter(p.websiteUri ?? "", data.website_filter)) { hadWebsite++; continue; }
          seen.add(p.id);
          candidates.push({
            place_id: p.id, business_name: p.displayName?.text ?? "Unknown business", phone: p.nationalPhoneNumber,
            address: p.formattedAddress ?? "", website: p.websiteUri ?? "", category: p.primaryTypeDisplayName?.text ?? (t || type),
            area: data.area, found_by: context.userId,
          });
        }
        // Original Google URL is preserved even when it fails; never turn failures into "no website" leads.
        // Google Maps often lacks a site that Google Search shows; look harder before calling it "no website".
        const checked = await mapWebsiteChecks(candidates, async row => {
          const website = row.website || await findBusinessWebsite(row.business_name, row.address, row.phone);
          return { ...row, website, ...await checkWebsite(website) };
        });
        const kept = checked.filter(r => matchesWebsiteFilter(r.website, data.website_filter));
        hadWebsite += checked.length - kept.length;
        rows.push(...kept);
        if (rows.length >= 10) break outer;
        pageToken = json.nextPageToken;
        if (!pageToken) break;
      }
    }
    if (rows.length) {
      const { error } = await (context.supabase as any).from("call_list").upsert(rows, { onConflict: "place_id", ignoreDuplicates: true });
      if (error) throw new Error("Couldn't save the new businesses.");
    }
    return { added: rows.length, found, hadWebsite, alreadyListed, area: data.area };
  });

export const markCalled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), called: z.boolean(), outcome: z.string().trim().max(300).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const db = context.supabase as any;
    const { data: me } = await db.from("profiles").select("username, email").eq("id", context.userId).maybeSingle();
    // Read the call-back reason before the update clears it, so every note is kept forever.
    const { data: before } = await db.from("call_list").select("business_name, phone, callback_reason").eq("id", data.id).maybeSingle();
    const patch = data.called
      ? { called_by: context.userId, caller_name: me?.username || me?.email || "Team member", called_at: new Date().toISOString(), outcome: data.outcome, callback_at: null, callback_by: null, callback_name: "", callback_reason: "", callback_notified_at: null, callback_escalated_at: null }
      : { called_by: null, caller_name: "", called_at: null, outcome: "" };
    const { data: updated, error } = await db.from("call_list").update(patch).eq("id", data.id).select("business_name, phone").maybeSingle();
    if (error) throw new Error("Couldn't update this business.");
    // Permanent per-teammate call record for the owner's activity report (survives call-backs/recalls).
    if (data.called && updated) {
      await db.from("call_log").insert({
        user_id: context.userId, caller_name: (patch as { caller_name: string }).caller_name, call_list_id: data.id,
        business_name: updated.business_name, phone: updated.phone, outcome: data.outcome,
        callback_reason: before?.callback_reason ?? "",
      });
    }
    return { ok: true };
  });

/** Moves a business to subscriber (paying customer) or dismissed (off the call list). */
export const triageBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["subscriber", "dismissed"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const { error } = await (context.supabase as any).from("call_list").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("Couldn't update this business.");
    return { ok: true };
  });

/** Runs the AI lead brief on a call-list business and saves it so the whole team can reuse it. */
export const analyzeCallBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const db = context.supabase as any;
    const { data: r, error } = await db.from("call_list").select("place_id, business_name, phone, address, website, category, website_status, website_check_note").eq("id", data.id).maybeSingle();
    if (error || !r) throw new Error("Business not found.");
    const { generateLeadBrief } = await import("./lead-brief.server");
    let audit = "";
    if (!r.website) {
      const { findBusinessWebsite } = await import("./website-finder.server");
      const found = await findBusinessWebsite(r.business_name, r.address, r.phone);
      if (found) {
        const { checkWebsite } = await import("./website-check.server");
        const check = await checkWebsite(found);
        Object.assign(r, { website: found, ...check });
        await db.from("call_list").update({ website: found, ...check }).eq("id", data.id);
      }
    }
    if (r.website && r.website_status !== "no_website") {
      const { crawlSite } = await import("./website-check.server");
      const { auditReport } = await import("./site-audit");
      audit = auditReport(await crawlSite(r.website));
    }
    // Pull the live Google listing so the brief can cite rating, reviews and business status.
    let google = "";
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (lovableKey && mapsKey && r.place_id) {
      try {
        const res = await fetch(`https://connector-gateway.lovable.dev/google_maps/places/v1/places/${encodeURIComponent(r.place_id)}`, {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": mapsKey,
            "X-Goog-FieldMask": "rating,userRatingCount,businessStatus,priceLevel,regularOpeningHours,editorialSummary,googleMapsUri",
          },
        });
        if (res.ok) {
          const p = (await res.json()) as any;
          const lines = [
            p.businessStatus ? `Status: ${p.businessStatus}` : "",
            typeof p.rating === "number" ? `Rating: ${p.rating}/5 from ${p.userRatingCount ?? 0} Google reviews` : "No Google rating yet",
            p.priceLevel ? `Price level: ${p.priceLevel}` : "",
            p.editorialSummary?.text ? `Google summary: ${p.editorialSummary.text}` : "",
            p.regularOpeningHours?.weekdayDescriptions ? `Hours: ${p.regularOpeningHours.weekdayDescriptions.join("; ")}` : "",
            p.googleMapsUri ? `Maps: ${p.googleMapsUri}` : "",
          ].filter(Boolean);
          if (lines.length) google = `\n\nGOOGLE LISTING (live data):\n${lines.join("\n")}`;
        } else {
          console.error(`Place details failed [${res.status}]: ${await res.text()}`);
        }
      } catch (e) {
        console.error("Place details lookup failed:", e instanceof Error ? e.message : e);
      }
    }
    const brief = await generateLeadBrief({
      url: r.website,
      audit,
      note: `Business: ${r.business_name}\nType: ${r.category}\nAddress: ${r.address}\nPhone: ${r.phone}\nWebsite check: ${r.website_status}. ${r.website_check_note}\nDo not describe an uncertain or unavailable website as active or as having no website.${!r.website ? "\nThis business has no website — call that out as the biggest gap." : ""}${google}`,
    });
    await db.from("call_list").update({ brief, brief_at: new Date().toISOString() }).eq("id", data.id);
    return { brief };
  });

/** Per-caller skip: moves a business to the back of that caller's own queue only. */
export const skipBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), skip: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const db = context.supabase as any;
    const { error } = data.skip
      ? await db.from("call_list_skips").upsert({ user_id: context.userId, call_list_id: data.id }, { onConflict: "user_id,call_list_id" })
      : await db.from("call_list_skips").delete().eq("user_id", context.userId).eq("call_list_id", data.id);
    if (error) throw new Error("Couldn't update your queue. Try again.");
    return { ok: true };
  });

/** Schedules (or clears) a call-back time. While the time is in the future the business stays out of everyone's queue. */
export const scheduleCallback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => callbackScheduleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const db = context.supabase as any;
    // Clearing keeps any existing reason so notes survive "call now" and reminders.
    const patch = data.callback_at
      ? await (async () => {
          const { data: me } = await db.from("profiles").select("username, email").eq("id", context.userId).maybeSingle();
          return { callback_at: data.callback_at, callback_by: context.userId, callback_name: me?.username || me?.email || "Team member", callback_reason: data.callback_reason };
        })()
      : { callback_at: null, callback_by: null, callback_name: "" };
    const { error } = await db.from("call_list").update(patch).eq("id", data.id);
    if (error) throw new Error("Couldn't save the call-back time. Try again.");
    return { ok: true };
  });

/** Clears only the caller's own skips so their queue returns to its natural order. */
export const resetMyQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTeam(context);
    const { error } = await (context.supabase as any).from("call_list_skips").delete().eq("user_id", context.userId);
    if (error) throw new Error("Couldn't reset your queue. Try again.");
    return { ok: true };
  });

/** Returns a called or dismissed business to the queue so the team can call it back. */
export const recallBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    // The call-back reason is intentionally kept so no note is ever lost.
    const { error } = await (context.supabase as any).from("call_list")
      .update({ status: "queued", called_by: null, caller_name: "", called_at: null, outcome: "", callback_at: null, callback_by: null, callback_name: "" })
      .eq("id", data.id).neq("status", "subscriber");
    if (error) throw new Error("Couldn't return this business to the queue.");
    await (context.supabase as any).from("call_list_skips").delete().eq("user_id", context.userId).eq("call_list_id", data.id);
    return { ok: true };
  });

export const PROFILE_COLS = "contact_name, contact_role, needs, interested_package, budget, follow_up_date, appointment_at, expected_by, rep_name, rep_employee_id, profile_notes, profile_updated_by_name, profile_updated_at";
export type CustomerProfile = {
  contact_name: string; contact_role: string; needs: string; interested_package: string; budget: string;
  follow_up_date: string | null; appointment_at: string | null; expected_by: string | null; rep_name: string; rep_employee_id: string;
  profile_notes: string; profile_updated_by_name: string; profile_updated_at: string | null;
};

/** Saves the caller's customer profile (contact, needs, notes) on a business for the whole team and owner. */
export const saveCustomerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    contact_name: z.string().trim().max(120),
    contact_role: z.string().trim().max(120),
    needs: z.string().trim().max(4000),
    interested_package: z.string().trim().max(200),
    budget: z.string().trim().max(120),
    follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    appointment_at: z.string().datetime().nullable(),
    expected_by: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    profile_notes: z.string().trim().max(8000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const db: any = context.supabase;
    const [{ data: prof }, { data: before }] = await Promise.all([
      db.from("profiles").select("username, email, employee_id").eq("id", context.userId).maybeSingle(),
      db.from("call_list").select("business_name, phone, address, rep_id, rep_name, rep_employee_id, appointment_at").eq("id", data.id).maybeSingle(),
    ]);
    if (!before) throw new Error("That business is no longer on the list.");
    const name = prof?.username || prof?.email || "Team member";
    const { id, ...fields } = data;
    // The first teammate to work the customer is the rep of record, so credit never shifts to later editors.
    const rep = before.rep_id ? {} : { rep_id: context.userId, rep_name: name, rep_employee_id: prof?.employee_id ?? "" };
    const { error } = await db.from("call_list").update({
      ...fields, ...rep,
      profile_updated_by_name: name,
      profile_updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw new Error("Couldn't save the profile. Try again.");

    const changed = data.appointment_at && (!before.appointment_at || new Date(before.appointment_at).getTime() !== new Date(data.appointment_at).getTime());
    if (changed) {
      const repName = before.rep_id ? before.rep_name : name;
      const repId = before.rep_id ? before.rep_employee_id : prof?.employee_id ?? "";
      const when = new Date(data.appointment_at!).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }) + " PT";
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("team-alert", OWNER_EMAIL, {
          idempotencyKey: `appointment-${id}-${new Date(data.appointment_at!).getTime()}`,
          templateData: {
            title: `Appointment booked: ${before.business_name}`,
            intro: before.appointment_at ? "A meeting was rescheduled." : "A caller booked a meeting.",
            lines: [
              { label: "Sales rep", value: `${repName}${repId ? ` (${repId})` : ""}` },
              { label: "Appointment", value: when },
              { label: "Expected by", value: data.expected_by ?? "" },
              { label: "Contact", value: [data.contact_name, data.contact_role].filter(Boolean).join(", ") },
              { label: "Phone", value: before.phone }, { label: "Address", value: before.address },
              { label: "Needs", value: data.needs },
            ],
            link: "https://apexdigitalsystems.org/team/calls", linkLabel: "Open call list",
          },
        });
      } catch (e) {
        console.error("Appointment alert failed:", e instanceof Error ? e.message : e);
      }
    }
    return { ok: true };
  });

/** Shared No Answer pool: logs the attempt and parks the business until any teammate returns it to the queue. */
export const markNoAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const db = context.supabase as any;
    const { data: me } = await db.from("profiles").select("username, email").eq("id", context.userId).maybeSingle();
    const name = me?.username || me?.email || "Team member";
    const { data: row } = await db.from("call_list").select("business_name, phone, no_answer_count").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Business not found.");
    const { error } = await db.from("call_list").update({
      no_answer_at: new Date().toISOString(), no_answer_by: context.userId, no_answer_name: name, no_answer_count: (row.no_answer_count ?? 0) + 1,
    }).eq("id", data.id);
    if (error) throw new Error("Couldn't move this business to No Answer.");
    await db.from("call_list_skips").delete().eq("user_id", context.userId).eq("call_list_id", data.id);
    await db.from("call_log").insert({ user_id: context.userId, caller_name: name, call_list_id: data.id, business_name: row.business_name, phone: row.phone, outcome: "No answer", callback_reason: "" });
    return { ok: true };
  });

/** Returns one (id) or every (all) No Answer business to the shared queue; the attempt count is kept. */
export const returnNoAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    let q = (context.supabase as any).from("call_list").update({ no_answer_at: null, no_answer_by: null }).not("no_answer_at", "is", null);
    if (data.id) q = q.eq("id", data.id);
    const { error } = await q;
    if (error) throw new Error("Couldn't return to the queue.");
    return { ok: true };
  });

export type TeamCall = { id: string; caller_name: string; business_name: string; phone: string; outcome: string; callback_reason: string; called_at: string; call_list_id: string | null };

/** Shared team call feed: every teammate sees every logged call with its outcome and reason (role re-checked first). */
export const listTeamCallActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTeam(context);
    // call_log RLS limits teammates to their own rows; the role check above authorizes the shared read.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const { data, error } = await (supabaseAdmin as any).from("call_log")
      .select("id, caller_name, business_name, phone, outcome, callback_reason, called_at, call_list_id")
      .gte("called_at", since).order("called_at", { ascending: false }).limit(300);
    if (error) throw new Error("Couldn't load team call activity.");
    return (data ?? []) as TeamCall[];
  });
