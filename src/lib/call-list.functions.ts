import { OWNER_EMAIL } from "@/lib/owner-email";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUseBrief, type TeamRole } from "./team-access";
import { BUSINESS_TYPES, matchesWebsiteFilter, type WebsiteFilter } from "./call-list";
import type { WebsiteStatus } from "./website-check";

export type CallRow = {
  id: string; place_id: string; business_name: string; phone: string; address: string; website: string;
  category: string; area: string; found_at: string; called_by: string | null; caller_name: string; called_at: string | null; outcome: string; brief: string; brief_at: string | null;
  status: "queued" | "subscriber" | "dismissed";
  website_status: WebsiteStatus; website_checked_at: string | null; website_check_note: string;
} & CustomerProfile;
const COLS = "id, place_id, business_name, phone, address, website, category, area, found_at, called_by, caller_name, called_at, outcome, brief, brief_at, status, website_status, website_checked_at, website_check_note, contact_name, contact_role, needs, interested_package, budget, follow_up_date, appointment_at, expected_by, rep_name, rep_employee_id, profile_notes, profile_updated_by_name, profile_updated_at";

async function requireTeam(ctx: any): Promise<void> {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).maybeSingle();
  if (!canUseBrief((data?.role as TeamRole | undefined) ?? null)) throw new Error("Team members only.");
}

export const listCallList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTeam(context);
    const { data, error } = await (context.supabase as any).from("call_list").select(COLS).order("found_at", { ascending: false }).limit(2000);
    if (error) throw new Error("Couldn't load the call list.");
    const rows = (data ?? []) as CallRow[];
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
    const types = t ? [t, `${t} services`, `${t} company`, `local ${t}`] : [...BUSINESS_TYPES].sort(() => Math.random() - 0.5);
    // Website-targeted searches skip more results, so try harder before giving up.
    const maxTypes = data.business_type ? 4 : data.website_filter === "any" ? 3 : 6;
    const rows: any[] = [];
    const { checkWebsite, mapWebsiteChecks } = await import("./website-check.server");

    // Try up to maxTypes random business types until we find new matching numbers.
    for (const type of types.slice(0, maxTypes)) {
      const res = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "places.id,places.displayName,places.nationalPhoneNumber,places.formattedAddress,places.websiteUri,places.primaryTypeDisplayName",
        },
        body: JSON.stringify({ textQuery: `${type} in ${data.area}`, pageSize: 20 }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Places search failed [${res.status}]: ${body}`);
        throw new Error(res.status === 429 ? "Daily search limit reached. Try again later." : "Business search failed. Try again.");
      }
      const json = (await res.json()) as { places?: any[] };
      const candidates: any[] = [];
      for (const p of json.places ?? []) {
        if (!p.id || !p.nationalPhoneNumber || seen.has(p.id)) continue;
        if (!matchesWebsiteFilter(p.websiteUri ?? "", data.website_filter)) continue;
        seen.add(p.id);
        candidates.push({
          place_id: p.id, business_name: p.displayName?.text ?? "Unknown business", phone: p.nationalPhoneNumber,
          address: p.formattedAddress ?? "", website: p.websiteUri ?? "", category: p.primaryTypeDisplayName?.text ?? (t || type),
          area: data.area, found_by: context.userId,
        });
      }
      // Original Google URL is preserved even when it fails; never turn failures into "no website" leads.
      rows.push(...await mapWebsiteChecks(candidates, async row => ({ ...row, ...await checkWebsite(row.website) })));
      if (rows.length >= 10) break;
    }
    if (rows.length) {
      const { error } = await (context.supabase as any).from("call_list").upsert(rows, { onConflict: "place_id", ignoreDuplicates: true });
      if (error) throw new Error("Couldn't save the new businesses.");
    }
    return { added: rows.length };
  });

export const markCalled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), called: z.boolean(), outcome: z.string().trim().max(300).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTeam(context);
    const { data: me } = await (context.supabase as any).from("profiles").select("username, email").eq("id", context.userId).maybeSingle();
    const patch = data.called
      ? { called_by: context.userId, caller_name: me?.username || me?.email || "Team member", called_at: new Date().toISOString(), outcome: data.outcome }
      : { called_by: null, caller_name: "", called_at: null, outcome: "" };
    const { error } = await (context.supabase as any).from("call_list").update(patch).eq("id", data.id);
    if (error) throw new Error("Couldn't update this business.");
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
    const { error } = await (context.supabase as any).from("call_list")
      .update({ status: "queued", called_by: null, caller_name: "", called_at: null, outcome: "" })
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
