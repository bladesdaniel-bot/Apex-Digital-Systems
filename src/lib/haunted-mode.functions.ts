import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { THEMES, activeTheme, type Theme, type ThemeMode } from "@/lib/seasonal-themes";

const key = (t: Theme) => `theme_mode_${t}`;

async function readModes(): Promise<Record<Theme, ThemeMode>> {
  const modes = { halloween: "auto", thanksgiving: "auto", christmas: "auto" } as Record<Theme, ThemeMode>;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("site_settings").select("key,value").in("key", THEMES.map(key));
    for (const r of data ?? []) {
      const t = THEMES.find((x) => key(x) === r.key);
      if (t && (r.value === "on" || r.value === "off" || r.value === "auto")) modes[t] = r.value;
    }
  } catch { /* defaults */ }
  return modes;
}

/** Public: current seasonal theme plus each switch's mode. */
export const getSeasonalThemes = createServerFn({ method: "GET" }).handler(async () => {
  const modes = await readModes();
  return { modes, active: activeTheme(modes, new Date()) };
});

/** Back-compat: is the Halloween theme showing? */
export const getHauntedMode = createServerFn({ method: "GET" }).handler(async () => {
  const modes = await readModes();
  return { enabled: activeTheme(modes, new Date()) === "halloween" };
});

/** Owner only: set a theme switch to auto / on / off. */
export const setThemeMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ theme: z.enum(THEMES), mode: z.enum(["auto", "on", "off"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only the owner can change this.");
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: key(data.theme), value: data.mode, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
