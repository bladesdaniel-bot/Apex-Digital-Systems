import { OWNER_EMAIL } from "@/lib/owner-email";
// Server-only: turns a paid (or $0-confirmed) quote into a build order and alerts the owner once.
import { quoteTotals, usd } from "./quote";
import { encodedPhotoTooBig, MAX_PHOTO_MB, photoSizeError } from "./order-limits";

export const ORDER_BUCKET = "order-photos";
export const MAX_PHOTOS_PER_ORDER = 30;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

/** Retry settled installment accruals without paying the uncollected balance. */
async function commissionIfPaid(db: any, quoteId: string) {
  const { data: q } = await db.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (!q || q.status === "canceled" || !(q.installments_paid > 0)) return;
  const { creditQuoteInstallment } = await import("./commission-payments.server");
  for (let part = 1; part <= q.installments_paid; part++) await creditQuoteInstallment(db, quoteId, part);
}

/** opts.unpaid: a rep placed the order before any payment — alert the owner now, pay the rep when money clears.
 *  opts.hold: the customer isn't ready yet — park it in the Holding Area; the owner is alerted only when it's released. */
export async function markBuildReady(db: any, quoteId: string, opts: { unpaid?: boolean; hold?: string } = {}) {
  const held = typeof opts.hold === "string";
  const { data: rows } = await db.from("quotes")
    .update(held
      ? { build_status: "on_hold", build_ready_at: new Date().toISOString(), hold_reason: (opts.hold || "Waiting on customer").slice(0, 500) }
      : { build_status: "new", build_ready_at: new Date().toISOString() })
    .eq("id", quoteId).eq("build_status", "").select("*");
  const q = rows?.[0];
  if (!q) { if (!opts.unpaid) await commissionIfPaid(db, quoteId); return; } // already a build order — never alert twice
  // Prepaid sales pay the rep automatically; $0 orders wait for the owner to enter the sale amount.
  if (!opts.unpaid) await commissionIfPaid(db, q.id);
  if (!held) await alertOwnerBuildReady(db, q, !!opts.unpaid);
  // Start the customer's activity history and email them their portal account link.
  try {
    const { logClientActivity, createClientInvite } = await import("./client-portal.server");
    await logClientActivity(db, q.id, "order", `Order placed: ${q.package_name || "custom project"}`, q.created_by_name || "");
    await createClientInvite(db, q.id);
  } catch (e) {
    console.error("Client invite failed:", e instanceof Error ? e.message : e);
  }
}

/** Moves a held order into the active build queue (once) and sends the owner's "ready to build" alert. */
export async function releaseHeldOrder(db: any, quoteId: string) {
  const { data: rows } = await db.from("quotes")
    .update({ build_status: "new", build_ready_at: new Date().toISOString(), hold_reason: "" })
    .eq("id", quoteId).eq("build_status", "on_hold").select("*");
  const q = rows?.[0];
  if (!q) return false;
  await alertOwnerBuildReady(db, q, !(q.installments_paid > 0));
  return true;
}

async function alertOwnerBuildReady(db: any, q: any, unpaid: boolean) {
  let profile: any = null;
  if (q.call_list_id) {
    const { data } = await db.from("call_list").select("phone, address, website, needs, profile_notes, budget, contact_role").eq("id", q.call_list_id).maybeSingle();
    profile = data;
  }
  const t = quoteTotals({ ...q, package_price: Number(q.package_price), membership_price: Number(q.membership_price), discount_value: Number(q.discount_value) });
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("build-order", OWNER_EMAIL, {
      idempotencyKey: `build-order-${q.id}`,
      ...(q.contact_email && { replyTo: q.contact_email }),
      templateData: {
        business: q.business_name, contact: q.contact_name, email: q.contact_email,
        phone: q.customer_phone || profile?.phone || "", address: q.customer_address || profile?.address || "", website: profile?.website || q.customer_url || "",
        packageName: q.package_name, addons: (q.addons ?? []).map((a: any) => a.name).join(", "),
        membership: t.membership > 0 ? `${q.membership_name} ${usd(t.membership)}/mo${q.membership_free_month ? " (first month free)" : ""}` : "",
        total: usd(t.oneTime), paid: unpaid && t.oneTime > 0 ? "Placed by rep — awaiting payment" : t.oneTime === 0 ? "$0 order" : `${q.installments_paid} of ${t.parts.length} payments`,
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
  // Signed agreements and customer uploads may also be PDF documents; other uploads stay photo-only.
  const pdfOk = (source === "signed" || source === "client" || source === "customer") && file.type === "application/pdf";
  if (!IMAGE_TYPES.has(file.type) && !pdfOk) throw new Error(pdfOk || source === "signed" || source === "client" || source === "customer" ? "Please upload a photo or PDF." : "Please upload a photo (JPG, PNG, WebP, GIF or HEIC).");
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

/** Customer-profile photos live under profile/<callId>/ in the private order bucket; they're linked onto every order for that customer. */
export async function storeProfilePhoto(db: any, callId: string, file: { name: string; type: string; base64: string }, by: string) {
  if (!IMAGE_TYPES.has(file.type)) throw new Error("Please upload a photo (JPG, PNG, WebP, GIF or HEIC).");
  if (encodedPhotoTooBig(file.base64.length)) throw new Error(`That photo is over ${MAX_PHOTO_MB} MB.`);
  const bytes = Uint8Array.from(atob(file.base64), c => c.charCodeAt(0));
  const sizeError = photoSizeError(bytes.length);
  if (sizeError) throw new Error(sizeError);
  const { data: existing } = await db.storage.from(ORDER_BUCKET).list(`profile/${callId}`, { limit: 100 });
  if ((existing?.length ?? 0) >= MAX_PHOTOS_PER_ORDER) throw new Error("This profile already has the maximum number of photos.");
  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const safe = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 80) || `photo.${ext}`;
  const path = `profile/${callId}/${crypto.randomUUID()}__${safe}`;
  const { error } = await db.storage.from(ORDER_BUCKET).upload(path, bytes, { contentType: file.type });
  if (error) throw new Error("Couldn't upload the photo. Try again.");
  const { data: quotes } = await db.from("quotes").select("id").eq("call_list_id", callId);
  for (const q of quotes ?? []) {
    await db.from("order_photos").insert({ quote_id: q.id, path, file_name: safe, source: "caller", uploaded_by_name: by.slice(0, 120) });
  }
}

/** Copies a customer's profile photos onto a newly created order. */
export async function linkProfilePhotos(db: any, callId: string, quoteId: string, by: string) {
  const { data: files } = await db.storage.from(ORDER_BUCKET).list(`profile/${callId}`, { limit: 100 });
  const rows = (files ?? []).filter((f: any) => f.id).map((f: any) => ({
    quote_id: quoteId, path: `profile/${callId}/${f.name}`, file_name: String(f.name).split("__").slice(1).join("__") || f.name,
    source: "caller", uploaded_by_name: by.slice(0, 120),
  }));
  if (rows.length) await db.from("order_photos").insert(rows);
}

/** Records the sale commission for a quote's rep once (unique per quote). Needs a client allowed to insert commissions. */
export async function recordQuoteCommission(db: any, q: any, saleAmount: number, createdBy: string | null) {
  const { commissionFor } = await import("./commission");
  if (q.status === "canceled" || q.refunded_at) return { error: "This sale was canceled or refunded." };
  const { data: collected } = await db.from("commissions").select("id").eq("order_quote_id", q.id).limit(1);
  if (collected?.length) return { error: "Commission is already recorded as payments are collected." };
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
