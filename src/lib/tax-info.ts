import { z } from "zod";

export const TAX_CLASSIFICATIONS = [
  "Individual / sole proprietor / single-member LLC",
  "C corporation",
  "S corporation",
  "Partnership",
  "LLC (C, S or P)",
  "Other",
] as const;

/** IRS 1099-NEC filing threshold for payments in a calendar year. */
export const NEC_THRESHOLD = 600;

export const taxInfoSchema = z.object({
  legalName: z.string().trim().min(2, "Enter your legal name").max(120),
  businessName: z.string().trim().max(120).default(""),
  taxClassification: z.enum(TAX_CLASSIFICATIONS),
  tinType: z.enum(["SSN", "EIN"]),
  tin: z.string().transform(s => s.replace(/\D/g, "")).refine(s => s.length === 9, "Tax ID must be 9 digits"),
  address: z.string().trim().min(3, "Enter your street address").max(200),
  city: z.string().trim().min(2, "Enter your city").max(80),
  state: z.string().trim().min(2, "Enter your state").max(40),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP"),
  phone: z.string().trim().max(40).default(""),
  certify: z.literal(true, { message: "Please certify the information is correct" }),
});
export type TaxInfoInput = z.input<typeof taxInfoSchema>;

export const formatTin = (tin: string, type: string) =>
  type === "EIN" ? `${tin.slice(0, 2)}-${tin.slice(2)}` : `${tin.slice(0, 3)}-${tin.slice(3, 5)}-${tin.slice(5)}`;
export const maskTin = (tin: string) => `•••-••-${tin.slice(-4)}`;

/** Sum payouts by employee for a calendar year (cash basis: by paid date, Pacific time). */
export function yearPayouts(rows: { employee_id: string; status: string; paid_at: string | null; commission_amount: number }[], year: number) {
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (r.status !== "paid" || !r.paid_at) continue;
    const y = Number(new Date(r.paid_at).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }).slice(0, 4));
    if (y !== year) continue;
    totals.set(r.employee_id, Math.round(((totals.get(r.employee_id) ?? 0) + r.commission_amount) * 100) / 100);
  }
  return totals;
}
