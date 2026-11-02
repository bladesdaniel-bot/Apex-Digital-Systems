import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PhotoUpload } from "@/components/PhotoUpload";
import { listProfilePhotos, uploadProfilePhoto } from "@/lib/orders.functions";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OrderBuilder } from "@/components/OrderBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveCustomerProfile, type CallRow } from "@/lib/call-list.functions";
import { ptDate, ptTime } from "@/lib/visit-format";
import { TIMEZONES, guessTimezone, threeTimes, zonedToIso } from "@/lib/timezones";
import { getMyAccess } from "@/lib/team.functions";

const PACKAGES = ["", "Not sure yet", "Website build", "Website + monthly membership", "Care Plan (monthly)", "Growth plan", "SEO / Google ranking", "Ads management", "Custom bundle"];

export function hasProfile(r: CallRow) {
  return Boolean(r.contact_name || r.needs || r.profile_notes || r.interested_package || r.budget || r.follow_up_date || r.appointment_at || r.expected_by);
}

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" wall-clock value in the given time zone. */
function isoToZoned(iso: string | null, tz: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)).replace(" ", "T");
}

export function CustomerProfilePanel({ r, onSaved }: { r: CallRow; onSaved: () => void }) {
  const save = useServerFn(saveCustomerProfile);
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  const repTz = guessTimezone((me.data as { location?: string } | undefined)?.location);
  const [open, setOpen] = useState(false);
  const [apptTz, setApptTz] = useState(() => guessTimezone(r.address, r.area));
  const [apptWhen, setApptWhen] = useState(() => isoToZoned(r.appointment_at, guessTimezone(r.address, r.area)));
  const [orderOpen, setOrderOpen] = useState(false);
  const m = useMutation({
    mutationFn: (fd: FormData) => {
      return save({ data: {
        id: r.id,
        contact_name: String(fd.get("contact_name") ?? ""),
        contact_role: String(fd.get("contact_role") ?? ""),
        needs: String(fd.get("needs") ?? ""),
        interested_package: String(fd.get("interested_package") ?? ""),
        budget: String(fd.get("budget") ?? ""),
        follow_up_date: String(fd.get("follow_up_date") ?? "") || null,
        appointment_at: apptWhen ? zonedToIso(apptWhen, apptTz) : null,
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
    <div className="mt-4 min-w-0">
      <div className="flex flex-wrap gap-2 [&>a]:h-auto [&>a]:min-h-9 [&>a]:whitespace-normal [&>button]:h-auto [&>button]:min-h-9 [&>button]:whitespace-normal">
      <Button size="sm" variant="outline" onClick={() => setOpen(o => !o)}>
        {open ? "Close profile" : filled ? "View / edit customer profile" : "Add customer profile"}
      </Button>
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogTrigger asChild><Button size="sm" variant="hero">Build order</Button></DialogTrigger>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Build order — {r.business_name}</DialogTitle>
            <DialogDescription>Pick the package and payment plan, then place the order for the owner or create a payment link.</DialogDescription>
          </DialogHeader>
          <OrderBuilder embedded business={r.business_name} contact={r.contact_name || undefined} address={r.address || undefined} phone={r.phone || undefined} callId={r.id} />
        </DialogContent>
      </Dialog>
      </div>
      {!open && filled && (
        <div className="scan-panel mt-3 space-y-1 rounded-xl p-4 text-xs leading-5">
          {rep && <p><span className="text-muted-foreground">Sales rep:</span> {rep}</p>}
          {r.contact_name && <p><span className="text-muted-foreground">Contact:</span> {r.contact_name}{r.contact_role && ` (${r.contact_role})`}</p>}
          {r.appointment_at && <p><span className="text-muted-foreground">Appointment:</span> {ptDate(r.appointment_at)}: {threeTimes(r.appointment_at, guessTimezone(r.address, r.area), r.rep_location ? guessTimezone(r.rep_location) : repTz, r.rep_name ? `${r.rep_name.split(" ")[0]} (rep)` : undefined)}</p>}
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
        <form onSubmit={submit} className="mt-4 grid min-w-0 grid-cols-1 gap-4 text-sm [&_input]:min-w-0 [&_input]:max-w-full [&_label]:min-w-0 [&_textarea]:min-w-0">
          <p className="text-xs text-muted-foreground">Sales rep: <span className="text-foreground">{rep || "You — added automatically when you save"}</span></p>
          <div className="grid min-w-0 grid-cols-1 gap-4">
            <label className="grid gap-2 text-xs text-muted-foreground">Contact name<Input name="contact_name" defaultValue={r.contact_name} placeholder="Contact name" maxLength={120} aria-label="Contact name" /></label>
            <label className="grid gap-2 text-xs text-muted-foreground">Contact role<Input name="contact_role" defaultValue={r.contact_role} placeholder="Owner, manager…" maxLength={120} aria-label="Contact role" /></label>
          </div>
          <label className="grid gap-2 text-xs text-muted-foreground">Business needs<Textarea name="needs" defaultValue={r.needs} placeholder="Pain points, goals, what's not working…" maxLength={4000} rows={4} aria-label="Business needs" /></label>
          <div className="grid min-w-0 grid-cols-1 gap-4">
            <label className="grid gap-2 text-xs text-muted-foreground">Interested package<select name="interested_package" defaultValue={r.interested_package} aria-label="Interested package" className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              {PACKAGES.map(p => <option key={p} value={p}>{p || "Interested package…"}</option>)}
              {r.interested_package && !PACKAGES.includes(r.interested_package) && <option value={r.interested_package}>{r.interested_package}</option>}
            </select></label>
            <label className="grid gap-2 text-xs text-muted-foreground">Budget<Input name="budget" defaultValue={r.budget} placeholder="Budget (e.g. $1,000)" maxLength={120} aria-label="Budget" /></label>
            <label className="grid gap-2 text-xs text-muted-foreground">Follow-up date<Input name="follow_up_date" type="date" defaultValue={r.follow_up_date ?? ""} aria-label="Follow-up date" /></label>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4">
            <label className="grid gap-2 text-xs text-muted-foreground">Customer's time zone (auto-detected from address)
              <select value={apptTz} onChange={e => setApptTz(e.target.value)} aria-label="Customer time zone" className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                {TIMEZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select></label>
            <label className="grid gap-2 text-xs text-muted-foreground">Appointment (the customer's local time)<Input type="datetime-local" value={apptWhen} onChange={e => setApptWhen(e.target.value)} aria-label="Appointment date and time" /></label>
            {apptWhen && <p className="text-xs text-aetheris-teal">= {threeTimes(zonedToIso(apptWhen, apptTz), apptTz, r.rep_location ? guessTimezone(r.rep_location) : repTz, r.rep_name ? `${r.rep_name.split(" ")[0]} (rep)` : "you (rep)")}</p>}
            <label className="grid gap-2 text-xs text-muted-foreground">Expected by<Input name="expected_by" type="date" defaultValue={r.expected_by ?? ""} aria-label="Expected by date" /></label>
          </div>
          <label className="grid gap-2 text-xs text-muted-foreground">Notes<Textarea name="profile_notes" defaultValue={r.profile_notes} placeholder="What was said, objections, best time to call back…" maxLength={8000} rows={5} aria-label="Notes" /></label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" variant="hero" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save profile"}</Button>
            {m.error && <p role="alert" className="text-xs text-destructive">{m.error.message}</p>}
          </div>
        </form>
      )}
      {(open || filled) && <ProfilePhotos callId={r.id} />}
    </div>
  );
}

function ProfilePhotos({ callId }: { callId: string }) {
  const list = useServerFn(listProfilePhotos);
  const up = useServerFn(uploadProfilePhoto);
  const q = useQuery({ queryKey: ["profile-photos", callId], queryFn: () => list({ data: { callId } }) });
  const photos = q.data ?? [];
  return (
    <div className="mt-4 grid gap-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Photos for the build order ({photos.length})</p>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map(p => (
            <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border" title={p.file_name}>
              <img src={p.url} alt={p.file_name} loading="lazy" className="aspect-square w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      <PhotoUpload label="Add photos" upload={async f => { await up({ data: { callId, file: f } }); }} onDone={() => q.refetch()} />
      <p className="text-xs text-muted-foreground">These go onto this customer's build order automatically.</p>
    </div>
  );
}
