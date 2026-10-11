import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { maskTin, taxInfoSchema } from "./tax-info";

export const getMyTaxInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).from("contractor_tax_info")
      .select("legal_name, business_name, tax_classification, tin_type, tin, address, city, state, zip, phone, certified_at")
      .eq("user_id", context.userId).maybeSingle();
    if (!data) return null;
    return { ...data, tin: maskTin(data.tin) };
  });

export const saveMyTaxInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taxInfoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("contractor_tax_info").upsert({
      user_id: context.userId, legal_name: data.legalName, business_name: data.businessName,
      tax_classification: data.taxClassification, tin_type: data.tinType, tin: data.tin,
      address: data.address, city: data.city, state: data.state.toUpperCase(), zip: data.zip, phone: data.phone,
      certified_at: new Date().toISOString(),
    });
    if (error) throw new Error("Couldn't save your tax info.");
    return { ok: true };
  });

export const getW9Requirement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).from("site_settings").select("value").eq("key", "w9_required").maybeSingle();
    return data?.value !== "false";
  });

export const setW9Requirement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const v = (d as { required?: unknown })?.required;
    if (typeof v !== "boolean") throw new Error("Say whether the W-9 is required.");
    return { required: v };
  })
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
    if (role?.role !== "admin") throw new Error("Admins only.");
    const { error } = await (context.supabase as any).from("site_settings").upsert({ key: "w9_required", value: data.required ? "true" : "false", updated_at: new Date().toISOString() });
    if (error) throw new Error("Couldn't update the setting.");
    return { ok: true };
  });

export const listTaxInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
    if (role?.role !== "admin") throw new Error("Admins only.");
    const { data, error } = await (context.supabase as any).from("contractor_tax_info")
      .select("user_id, legal_name, business_name, tax_classification, tin_type, tin, address, city, state, zip, phone, certified_at");
    if (error) throw new Error("Couldn't load tax info.");
    return (data ?? []) as { user_id: string; legal_name: string; business_name: string; tax_classification: string; tin_type: string; tin: string; address: string; city: string; state: string; zip: string; phone: string; certified_at: string }[];
  });
