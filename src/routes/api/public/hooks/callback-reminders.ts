import { OWNER_EMAIL } from "@/lib/owner-email";
import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Hourly job: when a scheduled call-back time arrives, email the caller who set it.
// If the business is still uncalled an hour later, alert the owner.
export const Route = createFileRoute("/api/public/hooks/callback-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

        const { data: due } = await supabaseAdmin.from("call_list")
          .select("id, business_name, phone, address, callback_at, callback_by, callback_name, callback_reason")
          .eq("status", "queued").is("called_at", null)
          .not("callback_at", "is", null)
          .lte("callback_at", now.toISOString())
          .is("callback_notified_at", null)
          .limit(50);

        let notified = 0, escalated = 0;
        for (const row of due ?? []) {
          if (!row.callback_by) continue;
          const { data: prof } = await supabaseAdmin.from("profiles").select("email").eq("id", row.callback_by).maybeSingle();
          if (!prof?.email) continue;
          const when = new Date(row.callback_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }) + " PT";
          await sendTemplateEmail("team-alert", prof.email, {
            idempotencyKey: `callback-due-${row.id}-${row.callback_at}`,
            templateData: {
              title: `Call-back due: ${row.business_name}`,
              intro: `You asked to call this business back at ${when}. It's waiting for you on your Call-backs list.`,
              lines: [
                { label: "Business", value: row.business_name },
                { label: "Phone", value: row.phone },
                { label: "Address", value: row.address },
                ...(row.callback_reason ? [{ label: "Reason", value: row.callback_reason }] : []),
              ],
              link: "https://apexdigitalsystems.org/team/calls", linkLabel: "Open call list",
            },
          });
          await supabaseAdmin.from("call_list").update({ callback_notified_at: now.toISOString() }).eq("id", row.id);
          notified++;
        }

        const { data: overdue } = await supabaseAdmin.from("call_list")
          .select("id, business_name, phone, callback_at, callback_name, callback_reason")
          .eq("status", "queued").is("called_at", null)
          .not("callback_at", "is", null)
          .lte("callback_at", hourAgo)
          .is("callback_escalated_at", null)
          .limit(50);

        for (const row of overdue ?? []) {
          const when = new Date(row.callback_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }) + " PT";
          await sendTemplateEmail("team-alert", OWNER_EMAIL, {
            idempotencyKey: `callback-overdue-${row.id}-${row.callback_at}`,
            templateData: {
              title: `Call-back missed: ${row.business_name}`,
              intro: `A call-back scheduled for ${when} is still uncalled over an hour later.`,
              lines: [
                { label: "Business", value: row.business_name },
                { label: "Phone", value: row.phone },
                { label: "Scheduled by", value: row.callback_name || "A team member" },
                ...(row.callback_reason ? [{ label: "Reason", value: row.callback_reason }] : []),
              ],
              link: "https://apexdigitalsystems.org/team/calls", linkLabel: "Open call list",
            },
          });
          await supabaseAdmin.from("call_list").update({ callback_escalated_at: now.toISOString() }).eq("id", row.id);
          escalated++;
        }

        return Response.json({ notified, escalated });
      },
    },
  },
});
