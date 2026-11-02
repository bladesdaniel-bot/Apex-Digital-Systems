import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MUSIC_CHOICES, isMusicChoice, type MusicChoice } from "@/lib/music-tracks";

const KEY = "music_track";

/** Public: which soundtrack the owner picked. Falls back to automatic. */
export const getMusicChoice = createServerFn({ method: "GET" }).handler(async (): Promise<{ choice: MusicChoice }> => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", KEY).maybeSingle();
    return { choice: isMusicChoice(data?.value) ? data.value : "auto" };
  } catch {
    return { choice: "auto" };
  }
});

/** Owner only: change the website soundtrack. */
export const setMusicChoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ choice: z.enum(MUSIC_CHOICES) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only the owner can change this.");
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: KEY, value: data.choice, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { choice: data.choice };
  });
