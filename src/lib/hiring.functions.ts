import { OWNER_EMAIL } from "@/lib/owner-email";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(40),
  location: z.string().trim().max(200).optional().default(""),
  experience: z.string().trim().max(2000).optional().default(""),
  website: z.string().max(0).optional().default(""), // honeypot
});

// Public: emails a sales-rep application to the owner via the fixed-recipient team-alert template.
export const submitHiringApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true };
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("team-alert", OWNER_EMAIL, {
      replyTo: data.email,
      templateData: {
        title: `Sales rep application: ${data.name}`,
        intro: "A new sales representative application came in from the website. Reply to this email to contact the applicant.",
        lines: [
          { label: "Name", value: data.name },
          { label: "Email", value: data.email },
          { label: "Phone", value: data.phone },
          { label: "City / state", value: data.location },
          { label: "Experience and availability", value: data.experience },
        ],
      },
    });
    return { ok: true };
  });
