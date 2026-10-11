// Server-only: turns a paid (or $0-confirmed) quote into a build order and alerts the owner once.
import { OWNER_EMAIL } from "@/lib/owner-email";
import { quoteTotals, usd } from "./quote";
import { encodedPhotoTooBig, MAX_PHOTO_MB, photoSizeError } from "./order-limits";

export const ORDER_BUCKET = "order-photos";
export const MAX_PHOTOS_PER_ORDER = 30;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

export async function markBuildReady(db: any, quoteId: string) {
  const { data: rows } = await db.from("quotes")
    .update({ build_status: "new", build_ready_at: new Date().toISOString() })
    .eq("id", quoteId).eq("build_status", "").select("*");
  const q = rows?.[0];
  if (!q) return; // already a build order — never alert twice
  let profile: any = null;
  if (q.call_list_id) {
    const { data } = await db.from("call_list").select("phone, address, website, needs, profile_notes, budget, contact_role").eq("id", q.call_list_id).maybeSingle();
    profile = data;
  }
  const t = quoteTotals({ ...q, package_price: Number(q.package_price), membership_price: Number(q.membership_price), discount_value: Number(q.discount_value) });
  // Prepaid sales pay the rep automatically; $0 orders wait for the owner to enter the sale amount.
  const { autoCommissionSale } = await import("./commission");
  const sale = autoCommissionSale(t.oneTime);
  if (sale !== null) {
    const r = await recordQuoteCommission(db, q, sale, null);
    if ("error" in r) console.error("Auto commission:", r.error);
  }
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("build-order", OWNER_EMAIL, {
      idempotencyKey: `build-order-${q.id}`,
      ...(q.contact_email && { replyTo: q.contact_email }),
      templateData: {
        business: q.business_name, contact: q.contact_name, email: q.contact_email,
        phone: profile?.phone ?? "", address: profile?.address ?? "", website: profile?.website ?? "",
        packageName: q.package_name, addons: (q.addons ?? []).map((a: any) => a.name).join(", "),
        membership: t.membership > 0 ? `${q.membership_name} ${usd(t.membership)}/mo${q.membership_free_month ? " (first month free)" : ""}` : "",
        total: usd(t.oneTime), paid: t.oneTime === 0 ? "$0 order" : `${q.installments_paid} of ${t.parts.length} payments`,
        promo: t.discount > 0 ? `${usd(t.discount)} off${q.promo_note ? ` — ${q.promo_note}` : ""}` : "",
        caller: `${q.created_by_name}${q.sales_rep_employee_id ? ` (${q.sales_rep_employee_id})` : ""}`,
        appointment: q.appointment_at ? new Date(q.appointment_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }) + " PT" : "",
        expectedBy: q.expected_by ?? "", needs: profile?.needs ?? "", notes: profile?.profile_notes ?? "",
        link: "https://apexdigitalsystems.org/team/orders",
      },
    });
  } catch (e) {
    console.error("Build order email failed:", e instanceof Error ? e.message : e);
  }
}

export async function storeOrderPhoto(db: any, quoteId: string, file: { name: string; type: string; base64: string }, source: string, by: string) {
  if (!IMAGE_TYPES.has(file.type)) throw new Error("Please upload a photo (JPG, PNG, WebP, GIF or HEIC).");
  // Reject an oversized file from its encoded length first, so a huge upload is never decoded.
  if (encodedPhotoTooBig(file.base64.length)) throw new Error(`That photo is over ${MAX_PHOTO_MB} MB.`);
  const bytes = Uint8Array.from(atob(file.base64), c => c.charCodeAt(0));
  const sizeError = photoSizeError(bytes.length);
  if (sizeError) throw new Error(sizeError);
  const { count } = await db.from("order_photos").select("id", { count: "exact", head: true }).eq("quote_id", quoteId);
  if ((count ?? 0) >= MAX_PHOTOS_PER_ORDER) throw new Error("This order already has the maximum number of photos.");
  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${quoteId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(ORDER_BUCKET).upload(path, bytes, { contentType: file.type });
  if (error) throw new Error("Couldn't upload the photo. Try again.");
  await db.from("order_photos").insert({ quote_id: quoteId, path, file_name: file.name.slice(0, 200), source, uploaded_by_name: by.slice(0, 120) });
}

/** Records the sale commission for a quote's rep once (unique per quote). Needs a client allowed to insert commissions. */
export async function recordQuoteCommission(db: any, q: any, saleAmount: number, createdBy: string | null) {
  const { commissionFor } = await import("./commission");
  let repId: string | null = q.created_by ?? null;
  if (q.call_list_id) {
    const { data } = await db.from("call_list").select("rep_id").eq("id", q.call_list_id).maybeSingle();
    repId = data?.rep_id ?? repId;
  }
  if (!repId) return { error: "No sales rep on this order." };
  const { error } = await db.from("commissions").insert({
    employee_id: repId, customer_name: q.business_name, quote_id: q.id,
    description: `Quote sale — ${q.package_name || "custom order"}`,
    sale_amount: saleAmount, commission_amount: commissionFor(saleAmount),
    sale_date: new Date().toISOString().slice(0, 10), created_by: createdBy,
  });
  if (error) return { error: error.code === "23505" ? "Commission already recorded for this order." : "Couldn't record the commission." };
  return { ok: true as const };
}
