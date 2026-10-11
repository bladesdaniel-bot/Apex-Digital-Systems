import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { ASSIGNABLE_ROLES, canUseBrief, type TeamRole } from "./team-access";
export { ASSIGNABLE_ROLES, canUseBrief, type TeamRole, type AssignableRole } from "./team-access";

type Ctx = { supabase: { from: (t: "user_roles") => any }; userId: string };
async function roleOf(context: Ctx): Promise<TeamRole | null> {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
  return (data?.role as TeamRole | undefined) ?? null;
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ role: await roleOf(context as unknown as Ctx), userId: context.userId }));

export const createLeadBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().trim().max(500), note: z.string().trim().max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!canUseBrief(await roleOf(context as unknown as Ctx))) return { ok: false as const, error: "Your account doesn't have access to this tool." };
    if (!data.url && !data.note) return { ok: false as const, error: "Add a website URL or a note." };
    try {
      const { generateLeadBrief } = await import("./lead-brief.server");
      return { ok: true as const, brief: await generateLeadBrief(data) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Something went wrong." };
    }
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if ((await roleOf(context as unknown as Ctx)) !== "admin") throw new Error("Admins only.");
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("id, email, username, employee_id, created_at").order("created_at"),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map((roles ?? []).map(r => [r.user_id, r.role as TeamRole]));
    return (profiles ?? []).map(p => ({ ...p, role: map.get(p.id) ?? "pending", isMe: p.id === context.userId }));
  });

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if ((await roleOf(context as unknown as Ctx)) !== "admin") throw new Error("Admins only.");
    const { data, error } = await context.supabase.from("leads").select("id, name, email, phone, website, note, created_at, ip_address, city, region, country").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("Couldn't load leads.");
    return data ?? [];
  });

export const generateSignupCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if ((await roleOf(context as unknown as Ctx)) !== "admin") throw new Error("Admins only.");
    const { randomInt } = await import("node:crypto");
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const { error } = await context.supabase.from("signup_invites").insert({ code, created_by: context.userId });
    if (error) throw new Error("Couldn't create a code. Try again.");
    return { code };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), role: z.enum(ASSIGNABLE_ROLES) }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await roleOf(context as unknown as Ctx)) !== "admin") throw new Error("Admins only.");
    if (data.userId === context.userId) throw new Error("You can't change your own role.");
    const { error } = await context.supabase.from("user_roles").update({ role: data.role, updated_at: new Date().toISOString() }).eq("user_id", data.userId);
    if (error) throw new Error("Couldn't update this member.");
    return { ok: true };
  });

export const listVisitors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!canUseBrief(await roleOf(context as unknown as Ctx))) throw new Error("Team members only.");
    const { data, error } = await (context.supabase as any).from("visitor_logs")
      .select("id, created_at, client_sent_at, ip_address, city, region, country, page_path, referrer, device_type, session_id")
      .order("created_at", { ascending: false }).limit(5000);
    if (error) throw new Error("Couldn't load visitors.");
    return (data ?? []) as Array<{ id: string; created_at: string; client_sent_at: string | null; ip_address: string; city: string; region: string; country: string; page_path: string; referrer: string; device_type: string; session_id: string }>;
  });
