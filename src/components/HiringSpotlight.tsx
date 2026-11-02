import { OWNER_EMAIL } from "@/lib/owner-email";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, BriefcaseBusiness, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitHiringApplication } from "@/lib/hiring.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import video from "@/assets/apex-sales-rep-ad.mp4.asset.json";
import webm from "@/assets/apex-sales-rep-ad.webm.asset.json";
import poster from "@/assets/apex-sales-rep-ad-poster.jpg.asset.json";

export function HiringSpotlight() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    setStatus("sending");
    try {
      await submitHiringApplication({ data: { name: get("Name"), email: get("Email"), phone: get("Phone"), location: get("Location"), experience: get("Experience and availability"), website: get("website") } });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="hiring" aria-labelledby="hiring-heading" className="scroll-mt-24 border-y border-electric/40 bg-card">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:gap-20 lg:px-10">
        <div className="min-w-0">
          <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-success"><BriefcaseBusiness className="size-5" /> Now hiring</p>
          <h2 id="hiring-heading" className="max-w-xl font-display text-4xl font-semibold leading-tight sm:text-5xl">Join Apex<br /><span className="gradient-text">Digital Systems.</span></h2>
          <p className="mt-5 font-display text-xl text-foreground">Sales representatives</p>
          <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">Help businesses take their next step with websites, apps and digital marketing. Interested in joining our team? We’d like to hear from you.</p>
          <Button variant="hero" size="lg" className="mt-8 h-14 px-8 text-base" onClick={() => setOpen(true)}>Apply now <ArrowUpRight /></Button>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Mail className="size-4" /> Applications go straight to the Apex team.</p>
        </div>
        <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-lg border border-electric/40 md:max-w-[320px]">
          {reduceMotion ? <img src={poster.url} width={1080} height={1920} alt="Apex Digital Systems — now hiring" className="aspect-[9/16] w-full object-cover" /> : <video poster={poster.url} autoPlay muted loop playsInline controls={false} disablePictureInPicture disableRemotePlayback preload="metadata" tabIndex={-1} aria-label="Apex Digital Systems sales representative hiring advertisement" className="pointer-events-none aspect-[9/16] w-full select-none object-cover"><source src={webm.url} type="video/webm" /><source src={video.url} type="video/mp4" /></video>}
        </div>
      </div>
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setStatus("idle"); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Apply to Apex Digital Systems</DialogTitle><DialogDescription>Sales representative application. Fill this out and tap Send application.</DialogDescription></DialogHeader>
          {status === "sent" ? <div className="mt-2 grid gap-4"><p className="text-sm leading-6">Thanks! Your application was sent to Apex Digital Systems. We’ll be in touch soon.</p><Button variant="hero" className="h-12" onClick={() => setOpen(false)}>Close</Button></div> : <form onSubmit={apply} className="mt-2 grid gap-4">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <label className="grid gap-2 text-sm">Full name<Input name="Name" autoComplete="name" required maxLength={150} /></label>
            <label className="grid gap-2 text-sm">Email<Input name="Email" type="email" autoComplete="email" required maxLength={254} /></label>
            <label className="grid gap-2 text-sm">Phone<Input name="Phone" type="tel" autoComplete="tel" required maxLength={40} /></label>
            <label className="grid gap-2 text-sm">City / state<Input name="Location" autoComplete="address-level2" maxLength={200} /></label>
            <label className="grid gap-2 text-sm">Experience and availability<Textarea name="Experience and availability" placeholder="Tell us a little about yourself." rows={3} maxLength={2000} /></label>
            {status === "error" ? <p role="alert" className="text-sm text-destructive">Sorry, your application didn’t send. Please try again or email us below.</p> : null}
            <Button variant="hero" type="submit" className="h-12" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send application"} <Send /></Button>
            <p className="text-xs leading-5 text-muted-foreground">Prefer to email us yourself? <a className="break-all text-electric underline" href={`mailto:${OWNER_EMAIL}?subject=Sales%20representative%20application`}>{OWNER_EMAIL}</a></p>
          </form>}
        </DialogContent>
      </Dialog>
    </section>
  );
}