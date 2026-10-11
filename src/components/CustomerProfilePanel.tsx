import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveCustomerProfile, type CallRow } from "@/lib/call-list.functions";
import { ptDate, ptTime } from "@/lib/visit-format";

const PACKAGES = ["", "Not sure yet", "Website build", "Website + monthly membership", "Care Plan (monthly)", "Growth plan", "SEO / Google ranking", "Ads management", "Custom bundle"];

export function hasProfile(r: CallRow) {
  return Boolean(r.contact_name || r.needs || r.profile_notes || r.interested_package || r.budget || r.follow_up_date || r.appointment_at || r.expected_by);
}

/** ISO timestamp -> value for a datetime-local input in the viewer's own time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function CustomerProfilePanel({ r, onSaved }: { r: CallRow; onSaved: () => void }) {
  const save = useServerFn(saveCustomerProfile);
  const [open, setOpen] = useState(false);
  const m = useMutation({
    mutationFn: (fd: FormData) => {
      const appt = String(fd.get("appointment_at") ?? "");
      return save({ data: {
        id: r.id,
        contact_name: String(fd.get("contact_name") ?? ""),
        contact_role: String(fd.get("contact_role") ?? ""),
        needs: String(fd.get("needs") ?? ""),
        interested_package: String(fd.get("interested_package") ?? ""),
        budget: String(fd.get("budget") ?? ""),
        follow_up_date: String(fd.get("follow_up_date") ?? "") || null,
        appointment_at: appt ? new Date(appt).toISOString() : null,
        expected_by: String(fd.get("expected_by") ?? "") || null,
        profile_notes: String(fd.get("profile_notes") ?? ""),
      } });
    },
    onSuccess: () => { setOpen(false); onSaved(); },
  });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); m.mutate(new FormData(e.currentTarget)); };
  const filled = hasProfile(r);
  const rep = r.rep_name ? `${r.rep_name}${r.rep_employee_id ? ` · ${r.rep_employee_id}` : ""}` : "";

  return (
    <div className="mt-4">
      <Button size="sm" variant="outline" onClick={() => setOpen(o => !o)}>
        {open ? "Close profile" : filled ? "View / edit customer profile" : "Add customer profile"}
      </Button>
      <Button asChild size="sm" variant="outline" className="ml-2">
        <Link to="/team/quotes" search={{ business: r.business_name, contact: r.contact_name || undefined, call: r.id }}>Build quote</Link>
      </Button>
      {!open && filled && (
        <div className="scan-panel mt-3 space-y-1 rounded-xl p-4 text-xs leading-5">
          {rep && <p><span className="text-muted-foreground">Sales rep:</span> {rep}</p>}
          {r.contact_name && <p><span className="text-muted-foreground">Contact:</span> {r.contact_name}{r.contact_role && ` (${r.contact_role})`}</p>}
          {r.appointment_at && <p><span className="text-muted-foreground">Appointment:</span> {ptDate(r.appointment_at)} at {ptTime(r.appointment_at)} PT</p>}
          {r.expected_by && <p><span className="text-muted-foreground">Expected by:</span> {r.expected_by}</p>}
          {r.interested_package && <p><span className="text-muted-foreground">Interested in:</span> {r.interested_package}</p>}
          {r.budget && <p><span className="text-muted-foreground">Budget:</span> {r.budget}</p>}
          {r.follow_up_date && <p><span className="text-muted-foreground">Follow up:</span> {r.follow_up_date}</p>}
          {r.needs && <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Needs:</span> {r.needs}</p>}
          {r.profile_notes && <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Notes:</span> {r.profile_notes}</p>}
          {r.profile_updated_at && <p className="text-muted-foreground">Updated by {r.profile_updated_by_name} · {ptDate(r.profile_updated_at)} at {ptTime(r.profile_updated_at)} PT</p>}
        </div>
      )}
      {open && (
        <form onSubmit={submit} className="scan-panel mt-3 grid gap-3 rounded-xl p-4 text-sm">
          <p className="text-xs text-muted-foreground">Sales rep: <span className="text-foreground">{rep || "You — added automatically when you save"}</span></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="contact_name" defaultValue={r.contact_name} placeholder="Contact name" maxLength={120} aria-label="Contact name" />
            <Input name="contact_role" defaultValue={r.contact_role} placeholder="Their role (owner, manager…)" maxLength={120} aria-label="Contact role" />
          </div>
          <Textarea name="needs" defaultValue={r.needs} placeholder="What do they need? Pain points, goals, what's not working…" maxLength={4000} rows={3} aria-label="Business needs" />
          <div className="grid gap-3 sm:grid-cols-3">
            <select name="interested_package" defaultValue={r.interested_package} aria-label="Interested package" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {PACKAGES.map(p => <option key={p} value={p}>{p || "Interested package…"}</option>)}
              {r.interested_package && !PACKAGES.includes(r.interested_package) && <option value={r.interested_package}>{r.interested_package}</option>}
            </select>
            <Input name="budget" defaultValue={r.budget} placeholder="Budget (e.g. $1,000)" maxLength={120} aria-label="Budget" />
            <label className="grid gap-1 text-xs text-muted-foreground">Follow-up date<Input name="follow_up_date" type="date" defaultValue={r.follow_up_date ?? ""} aria-label="Follow-up date" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-muted-foreground">Appointment (meeting)<Input name="appointment_at" type="datetime-local" defaultValue={toLocalInput(r.appointment_at)} aria-label="Appointment date and time" /></label>
            <label className="grid gap-1 text-xs text-muted-foreground">Expected by<Input name="expected_by" type="date" defaultValue={r.expected_by ?? ""} aria-label="Expected by date" /></label>
          </div>
          <Textarea name="profile_notes" defaultValue={r.profile_notes} placeholder="Notes for the owner — what was said, objections, best time to call back…" maxLength={8000} rows={4} aria-label="Notes" />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" variant="hero" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save profile"}</Button>
            {m.error && <p role="alert" className="text-xs text-destructive">{m.error.message}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
