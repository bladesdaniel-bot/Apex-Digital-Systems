import { OWNER_EMAIL } from "@/lib/owner-email";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";


// Public endpoint: a prospective team member requests an invite code.
// The code is emailed to the owner, who relays it to the requester.
export const requestSignupCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Basic flood control: refuse if this address already has an unused, unexpired code.
    const { data: existing } = await supabaseAdmin
      .from("signup_invites")
      .select("id")
      .eq("requester_email", email)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1);
    if (existing && existing.length > 0) {
      return { ok: true as const }; // same outcome either way; don't reveal state
    }

    const { randomInt } = await import("node:crypto");
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const { data: invite, error } = await supabaseAdmin
      .from("signup_invites")
      .insert({ code, requester_email: email })
      .select("id, expires_at")
      .single();
    if (error || !invite) throw new Error("Couldn't create a code. Try again later.");

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("team-invite-code", OWNER_EMAIL, {
      templateData: {
        code,
        requesterEmail: email,
        expiresAt: new Date(invite.expires_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }),
      },
      idempotencyKey: `team-invite-code-${invite.id}`,
      replyTo: email,
    });

    return { ok: true as const };
  });
