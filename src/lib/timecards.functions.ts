import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { IDLE_MINUTES } from "./timecards";

type Sb = any;
async function roleOf(sb: Sb, userId: string): Promise<string | null> {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  return data?.role ?? null;
}

/** Clock in (or keep the current shift alive). Called on portal load and every few minutes while open. */
export const clockHeartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Sb;
    const role = await roleOf(sb, context.userId);
    if (role !== "admin" && role !== "telemarketer") return { ok: false };
    const now = new Date();
    const { data: open } = await sb.from("team_shifts").select("id, last_seen").eq("user_id", context.userId).is("clock_out", null).order("clock_in", { ascending: false }).limit(1).maybeSingle();
    if (open && now.getTime() - new Date(open.last_seen).getTime() <= IDLE_MINUTES * 60_000) {
      await sb.from("team_shifts").update({ last_seen: now.toISOString() }).eq("id", open.id);
      return { ok: true };
    }
    if (open) await sb.from("team_shifts").update({ clock_out: open.last_seen, ended_by: "idle" }).eq("id", open.id);
    await sb.from("team_shifts").insert({ user_id: context.userId });
    return { ok: true };
  });

export const clockOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date().toISOString();
    await (context.supabase as Sb).from("team_shifts").update({ clock_out: now, last_seen: now, ended_by: "sign_out" }).eq("user_id", context.userId).is("clock_out", null);
    return { ok: true };
  });

/** Owner-only: last 30 days of shifts and calls with teammate names. */
export const getTeamActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Sb;
    if ((await roleOf(sb, context.userId)) !== "admin") throw new Error("Admins only.");
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [shifts, calls, profiles] = await Promise.all([
      sb.from("team_shifts").select("id, user_id, clock_in, last_seen, clock_out, ended_by").gte("clock_in", since).order("clock_in", { ascending: false }).limit(500),
      sb.from("call_log").select("id, user_id, business_name, phone, outcome, callback_reason, called_at").gte("called_at", since).order("called_at", { ascending: false }).limit(2000),
      sb.from("profiles").select("id, username, email, employee_id"),
    ]);
    if (shifts.error || calls.error) throw new Error("Couldn't load team activity.");
    return { shifts: shifts.data ?? [], calls: calls.data ?? [], people: profiles.data ?? [] };
  });
