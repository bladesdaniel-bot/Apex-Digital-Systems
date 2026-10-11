import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveMyTaxInfo } from "@/lib/tax-info.functions";
import { TAX_CLASSIFICATIONS, taxInfoSchema } from "@/lib/tax-info";

export function TaxInfoForm({ onSaved }: { onSaved?: () => void } = {}) {
  const save = useServerFn(saveMyTaxInfo);
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setErr("");
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "");
    const parsed = taxInfoSchema.safeParse({
      legalName: g("legalName"), businessName: g("businessName"), taxClassification: g("taxClassification"),
      tinType: g("tinType"), tin: g("tin"), address: g("address"), city: g("city"), state: g("state"),
      zip: g("zip"), phone: g("phone"), certify: f.get("certify") === "on",
    });
    if (!parsed.success) return setErr(parsed.error.issues[0]?.message ?? "Check the form.");
    setBusy(true);
    try { await save({ data: parsed.data }); await qc.invalidateQueries({ queryKey: ["my-tax-info"] }); onSaved?.(); }
    catch (x) { setErr(x instanceof Error ? x.message : "Couldn't save."); }
    setBusy(false);
  };
  const sel = "h-10 rounded-md border border-input bg-background px-3 text-sm";
  return (
    <form onSubmit={submit} className="scan-panel grid gap-3 rounded-2xl p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="font-technical text-[11px] uppercase tracking-[0.16em] text-electric">Contractor tax info (W-9)</p>
        <p className="mt-2 text-sm text-muted-foreground">One-time setup. Apex uses this to send your 1099-NEC each January. Only you and the owner can see it.</p>
      </div>
      <Input name="legalName" placeholder="Legal name (as on your tax return)" required maxLength={120} />
      <Input name="businessName" placeholder="Business name (optional)" maxLength={120} />
      <select name="taxClassification" className={`${sel} sm:col-span-2`} defaultValue={TAX_CLASSIFICATIONS[0]}>
        {TAX_CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
      </select>
      <select name="tinType" className={sel} defaultValue="SSN"><option value="SSN">SSN</option><option value="EIN">EIN</option></select>
      <Input name="tin" placeholder="Tax ID number (9 digits)" inputMode="numeric" autoComplete="off" required maxLength={11} />
      <Input name="address" placeholder="Street address" required className="sm:col-span-2" maxLength={200} />
      <Input name="city" placeholder="City" required maxLength={80} />
      <div className="grid grid-cols-2 gap-3">
        <Input name="state" placeholder="State" required maxLength={40} />
        <Input name="zip" placeholder="ZIP" required inputMode="numeric" maxLength={10} />
      </div>
      <Input name="phone" type="tel" placeholder="Phone (optional)" maxLength={40} />
      <label className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2">
        <input type="checkbox" name="certify" className="mt-0.5" />
        Under penalties of perjury, I certify the tax ID number above is correct and I am a U.S. person.
      </label>
      {err && <p role="alert" className="text-sm text-destructive sm:col-span-2">{err}</p>}
      <Button type="submit" variant="hero" size="sm" disabled={busy} className="sm:col-span-2 justify-self-start">{busy ? "Saving…" : "Save & continue"}</Button>
    </form>
  );
}
