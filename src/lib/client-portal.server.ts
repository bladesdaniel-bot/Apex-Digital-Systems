import { OWNER_EMAIL } from "@/lib/owner-email";
// Server-only helpers for the customer portal: activity log, invites and owner alerts.
const SITE = "https://apexdigitalsystems.org";
const OWNER = OWNER_EMAIL;

export async function logClientActivity(db: any, quoteId: string, kind: string, summary: string, actor = "") {
  await db.from("client_activity").insert({ quote_id: quoteId, kind, summary: summary.slice(0, 500), actor_name: actor.slice(0, 120) });
}

export async function alertOwner(title: string, intro: string, lines: { label: string; value: string }[], key: string) {
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("team-alert", OWNER, { idempotencyKey: key, templateData: { title, intro, lines, link: `${SITE}/team/orders`, linkLabel: "Open build orders" } });
  } catch (e) {
    console.error("Owner alert failed:", e instanceof Error ? e.message : e);
  }
}

/** Creates a one-time account link for the order's customer and emails it. Returns null when the order has no email. */
export async function createClientInvite(db: any, quoteId: string): Promise<{ link: string; emailed: boolean } | null> {
  const { data: q } = await db.from("quotes").select("id, contact_email, contact_name, business_name").eq("id", quoteId).maybeSingle();
  const email = (q?.contact_email ?? "").trim().toLowerCase();
  if (!q || !email) return null;
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  await db.from("client_invites").insert({ token, quote_id: quoteId, email });
  const link = `${SITE}/client/setup?token=${token}`;
  let emailed = false;
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const r: any = await sendTemplateEmail("client-invite", email, { idempotencyKey: `client-invite-${token}`, templateData: { contact: q.contact_name, business: q.business_name, link } });
    emailed = r?.sent !== false;
  } catch (e) {
    console.error("Client invite email failed:", e instanceof Error ? e.message : e);
  }
  await logClientActivity(db, quoteId, "invite", emailed ? `Account invite emailed to ${email}` : "Account invite link created");
  return { link, emailed };
}

/** Flags an order so the owner's Build Orders view flashes until the owner saves the customer's profile. */
export async function flagUpdateNeeded(db: any, quoteId: string, note: string) {
  await db.from("quotes").update({ update_needed_at: new Date().toISOString(), update_needed_note: note.slice(0, 300) }).eq("id", quoteId);
}
