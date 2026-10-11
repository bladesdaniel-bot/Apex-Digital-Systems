import { OWNER_EMAIL } from "@/lib/owner-email";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const leadInput = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(1).max(40),
  website: z.string().trim().max(500),
  note: z.string().trim().max(4000),
});

// Public server function: the analysis form submits here. Validates input,
// stores the lead, then emails the details to the agency owner.
export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => leadInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: leadId, error } = await supabaseAdmin.rpc("submit_lead", {
      _name: data.name,
      _email: data.email,
      _website: data.website,
      _note: data.note,
      _phone: data.phone,
    });
    if (error) {
      console.error("Lead insert failed:", error.message);
      return { ok: false as const, error: "Couldn't save your request. Please try again." };
    }
    // Record where the request came from (server-derived IP + approximate location).
    try {
      const { leadLocation } = await import("./lead-location.server");
      const loc = await leadLocation(supabaseAdmin);
      await supabaseAdmin.from("leads").update(loc).eq("id", leadId);
    } catch (e) {
      // The lead is saved; a missing location must never fail the submission.
      console.error("Lead location capture failed:", e instanceof Error ? e.message : e);
    }
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("lead-notification", OWNER_EMAIL, {
        templateData: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          website: data.website,
          note: data.note,
          submittedAt: new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
        },
        idempotencyKey: `lead-notification-${leadId ?? crypto.randomUUID()}`,
        replyTo: data.email,
      });
    } catch (e) {
      // The lead is saved; a failed notification email must not fail the submission.
      console.error("Lead notification email failed:", e instanceof Error ? e.message : e);
    }
    return { ok: true as const };
  });
