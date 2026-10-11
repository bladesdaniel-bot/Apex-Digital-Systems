import { OWNER_EMAIL } from "@/lib/owner-email";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public by necessity (new accounts may not have a session until email is confirmed).
// It only alerts about a just-created pending account and sends at most one email per user.
export const notifyTeamSignup = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const [{ data: prof }, { data: role }] = await Promise.all([
      db.from("profiles").select("email, username, employee_id, created_at").eq("id", data.userId).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", data.userId).maybeSingle(),
    ]);
    if (!prof || Date.now() - new Date(prof.created_at).getTime() > 15 * 60_000) return { ok: true };
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("team-alert", OWNER_EMAIL, {
        idempotencyKey: `team-signup-${data.userId}`,
        templateData: {
          title: `New team sign-up: ${prof.username || prof.email} (${prof.employee_id})`,
          intro: role?.role === "admin" ? "The owner account was created." : "A new teammate created an account and is waiting for your approval.",
          lines: [
            { label: "Employee ID", value: prof.employee_id },
            { label: "Name", value: prof.username },
            { label: "Email", value: prof.email },
            { label: "Status", value: role?.role ?? "pending" },
          ],
          link: "https://apexdigitalsystems.org/team/admin", linkLabel: "Review in Admin",
        },
      });
    } catch (e) {
      console.error("Sign-up alert failed:", e instanceof Error ? e.message : e);
    }
    return { ok: true };
  });
