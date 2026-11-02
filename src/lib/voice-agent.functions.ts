import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KEY = "voice_agent_enabled";

/** Public: is the website voice agent switched on? Fails closed (off) on error. */
export const getVoiceAgentEnabled = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", KEY).maybeSingle();
    return { enabled: data?.value !== "false" && !!data };
  } catch {
    return { enabled: false };
  }
});

/** Owner only: turn the voice agent on or off. */
export const setVoiceAgentEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ enabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only the owner can change this.");
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: KEY, value: data.enabled ? "true" : "false", updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { enabled: data.enabled };
  });
