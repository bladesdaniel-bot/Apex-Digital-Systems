import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { commissionFor } from "./commission";

export type Commission = {
  id: string; employee_id: string; customer_name: string; description: string;
  sale_amount: number; commission_amount: number; sale_date: string;
  status: "owed" | "paid"; kind: "sale" | "recurring"; member_id: string | null; paid_at: string | null; paid_note: string; created_at: string; flag_note: string;
};
const COLS = "id, employee_id, customer_name, description, sale_amount, commission_amount, sale_date, status, kind, member_id, paid_at, paid_note, created_at, flag_note";

async function isAdmin(ctx: any) {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).maybeSingle();
  return data?.role === "admin";
}

export const listAllCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Admins only.");
    const { data, error } = await (context.supabase as any).from("commissions").select(COLS).order("sale_date", { ascending: false }).limit(1000);
    if (error) throw new Error("Couldn't load earnings.");
    return (data ?? []).map((r: any) => ({ ...r, sale_amount: Number(r.sale_amount), commission_amount: Number(r.commission_amount) })) as Commission[];
  });

export const listMyCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("commissions").select(COLS).eq("employee_id", context.userId).order("sale_date", { ascending: false }).limit(500);
    if (error) throw new Error("Couldn't load your earnings.");
    return (data ?? []).map((r: any) => ({ ...r, sale_amount: Number(r.sale_amount), commission_amount: Number(r.commission_amount) })) as Commission[];
  });

export const recordSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    employeeId: z.string().uuid(),
    customerName: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500),
    saleAmount: z.number().positive().max(1_000_000),
    saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    memberId: z.string().uuid().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Admins only.");
    const { error } = await (context.supabase as any).from("commissions").insert({
      employee_id: data.employeeId, customer_name: data.customerName, description: data.description,
      sale_amount: data.saleAmount, commission_amount: commissionFor(data.saleAmount),
      sale_date: data.saleDate, member_id: data.memberId ?? null, created_by: context.userId,
    });
    if (error) throw new Error("Couldn't save this sale.");
    return { ok: true };
  });

export const markCommissionsPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(500), note: z.string().trim().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Admins only.");
    const { error } = await (context.supabase as any).from("commissions")
      .update({ status: "paid", paid_at: new Date().toISOString(), paid_note: data.note }).in("id", data.ids).eq("status", "owed");
    if (error) throw new Error("Couldn't mark as paid.");
    return { ok: true };
  });

export const deleteCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Admins only.");
    const { error } = await (context.supabase as any).from("commissions").delete().eq("id", data.id).eq("status", "owed");
    if (error) throw new Error("Couldn't remove this sale.");
    return { ok: true };
  });

export const listPayingCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Admins only.");
    const { data, error } = await (context.supabase as any).from("members").select("id, full_name, business_name, email, plan_name, status").neq("status", "archived").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error("Couldn't load customers.");
    return (data ?? []) as { id: string; full_name: string; business_name: string; email: string; plan_name: string; status: string }[];
  });
