import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXPENSE_CATEGORIES, type Expense } from "./expenses";

async function requireAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only the owner can manage expenses.");
}

const COLS = "id, expense_date, vendor, amount, allocation, project, category, description, receipt_path, created_at";
const image = z.object({ name: z.string().max(200), type: z.string().regex(/^image\/(png|jpe?g|webp|gif)$/, "Upload a PNG, JPG or WebP screenshot."), base64: z.string().max(28_000_000) });

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await (context.supabase as any).from("company_expenses").select(COLS).order("expense_date", { ascending: false }).limit(2000);
    if (error) throw new Error("Couldn't load expenses.");
    const rows = (data ?? []) as Expense[];
    const paths = rows.map(r => r.receipt_path).filter(Boolean);
    if (paths.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const signed = (await (supabaseAdmin as any).storage.from("expense-receipts").createSignedUrls(paths, 3600)).data ?? [];
      const map = new Map<string, string>(signed.map((s: any) => [s.path, s.signedUrl]));
      rows.forEach(r => { const u = r.receipt_path ? map.get(r.receipt_path) : undefined; if (u) r.receipt_url = u; });
    }
    return rows;
  });

export const scanReceiptImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ image, projects: z.array(z.string().max(120)).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { scanReceipt } = await import("./receipt-scan.server");
    try { return { ok: true as const, scan: await scanReceipt(data.image, data.projects) }; }
    catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Couldn't read this receipt." }; }
  });

export const saveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    vendor: z.string().trim().min(1, "Add the vendor.").max(200),
    amount: z.coerce.number().min(0).max(10_000_000),
    allocation: z.enum(["general", "project"]),
    project: z.string().trim().max(120),
    category: z.enum(EXPENSE_CATEGORIES),
    description: z.string().trim().max(500),
    image: image.nullable(),
  }).refine(v => v.allocation === "general" || v.project.length > 0, "Name the app or project.").parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    let receipt_path = "";
    if (data.image) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ext = data.image.type.split("/")[1]!.replace("jpeg", "jpg");
      receipt_path = `${data.expense_date.slice(0, 4)}/${crypto.randomUUID()}.${ext}`;
      const bytes = Uint8Array.from(atob(data.image.base64), c => c.charCodeAt(0));
      const { error } = await (supabaseAdmin as any).storage.from("expense-receipts").upload(receipt_path, bytes, { contentType: data.image.type });
      if (error) throw new Error("Couldn't save the receipt image.");
    }
    const { image: _i, ...row } = data;
    const { error } = await (context.supabase as any).from("company_expenses").insert({ ...row, project: row.allocation === "project" ? row.project : "", receipt_path, created_by: context.userId });
    if (error) throw new Error("Couldn't save the expense.");
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const db: any = context.supabase;
    const { data: row } = await db.from("company_expenses").select("receipt_path").eq("id", data.id).maybeSingle();
    if (row?.receipt_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any).storage.from("expense-receipts").remove([row.receipt_path]);
    }
    const { error } = await db.from("company_expenses").delete().eq("id", data.id);
    if (error) throw new Error("Couldn't delete the expense.");
    return { ok: true };
  });
