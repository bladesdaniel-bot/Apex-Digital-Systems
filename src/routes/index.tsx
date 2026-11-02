import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, ArrowRight, MapPin, Globe2, Menu, X, Check, Sparkles, CreditCard, UserRound, Send, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import heroImage from "@/assets/nevada-gateway.jpg";
import founderPhoto from "@/assets/daniel-founder.jpg.asset.json";
import flyerFixed from "@/assets/apex-flyer-web.jpg";
import flyerVideo from "@/assets/apex-flyer-animated.mp4.asset.json";
import flyerVideoPoster from "@/assets/apex-flyer-animated-poster.jpg.asset.json";
import adVideo from "@/assets/apex-assembly-line-v2.mp4.asset.json";
import adWebm from "@/assets/apex-assembly-line-v2.webm.asset.json";
import adPoster from "@/assets/apex-assembly-line-v2.jpg.asset.json";
import { getMyAccess } from "@/lib/team.functions";
import { canUseTerminal } from "@/lib/team-access";
import { ViewCounter, trackFormSubmission } from "@/components/ViewCounter";
import { AdLoop } from "@/components/AdLoop";
import { submitLead } from "@/lib/lead.functions";
import { Textarea } from "@/components/ui/textarea";
import { interestOptions, packages, PACKAGE_GROUPS, splitFeature } from "@/lib/offers";
import { supabase } from "@/integrations/supabase/client";
import { AppsPreview } from "@/components/AppsPreview";
import { NeuralCanvas } from "@/components/upgrade/NeuralCanvas";
import { SwarmFeed } from "@/components/upgrade/SwarmFeed";
import { TerminalMode } from "@/components/upgrade/TerminalMode";
import { ScanAnimation } from "@/components/upgrade/LeadExtras";
import { HiringSpotlight } from "@/components/HiringSpotlight";
import { VoiceAgent } from "@/components/VoiceAgent";
import { useSeasonal } from "@/components/HauntedMode";
import { ThanksgivingHero, ThanksgivingTag } from "@/components/ThanksgivingMode";
import { ChristmasHero, ChristmasTag } from "@/components/ChristmasMode";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Apex Digital Systems | Impossible to Ignore" },
    { name: "description", content: "Small Business Websites, Local SEO & Digital Marketing That Generate Leads. Based in Reno, Nevada. Serving Businesses Nationwide." },
    { property: "og:title", content: "Apex Digital Systems | Impossible to Ignore" },
    { property: "og:description", content: "Your business shouldn't blend in. Stand out with small business websites, local SEO, and digital marketing." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

// True once a signed-in session is detected; drives the "Team Portal" link label.
function useTeamSession() {
  const [signedIn, setSignedIn] = useState(false);
  const [terminalAllowed, setTerminalAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const refresh = async () => {
      const current = ++revision;
      const { data } = await supabase.auth.getSession();
      if (!active || current !== revision) return;
      setSignedIn(Boolean(data.session));
      setTerminalAllowed(false);
      if (!data.session) return;
      const access = await getMyAccess().catch(() => null);
      if (active && current === revision) setTerminalAllowed(canUseTerminal(access?.role ?? null));
    };
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setTerminalAllowed(false);
      window.setTimeout(() => { if (active) void refresh(); }, 0);
    });
    window.addEventListener("focus", refresh);
    return () => { active = false; sub.subscription.unsubscribe(); window.removeEventListener("focus", refresh); };
  }, []);
  return { signedIn, terminalAllowed };
}

const infoPanels: Record<string, { title: string; text: string }> = {
  "Our Work": { title: "Our Work", text: "Our selected projects will be added here soon." },
  About: { title: "Reno roots. Nationwide reach.", text: "Apex Digital Systems is a digital marketing and web design agency based in Reno, Nevada, serving small businesses nationwide." },
  "Privacy Policy": { title: "Privacy Policy", text: "Visitor analytics: when you visit this site we collect your IP address, approximate location (city, region, country), browser and device information, and the pages you visit. We use this for analytics and security purposes. This data is kept for up to 90 days and then automatically deleted, and it is never sold. If you submit our analysis form, we also keep the details you send so we can contact you. Reach out any time with questions about how your information is handled." },
  "Terms of Service": { title: "Terms of Service", text: "Our terms of service will be published here soon." },
};

function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signedIn: teamSignedIn, terminalAllowed } = useTeamSession();
  const [panel, setPanel] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [leadNotice, setLeadNotice] = useState<string | null>(null);
  const [scan, setScan] = useState<"idle" | "scanning" | "done">("idle");
  const [scanTarget, setScanTarget] = useState("");
  const [terminal, setTerminal] = useState(false);
  const [animateAd, setAnimateAd] = useState(true);
  const season = useSeasonal();
  const thanksgiving = season === "thanksgiving";
  const christmas = season === "christmas";
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAnimateAd(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const openPanel = (name: string) => { setMenuOpen(false); setPanel(name); };
  const info = panel ? infoPanels[panel] : undefined;
  const handleLeadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    const note = [
      ["Business", get("business")],
      ["Type of business", get("industry")],
      ["Area", get("location")],
      ["Interested in", data.getAll("interests").map(String).join(", ")],
      ["Budget", get("budget")],
      ["Timeline", get("timeline")],
      ["Details", get("details")],
    ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n").slice(0, 4000);
    const payload = { name: get("name"), email: get("email"), phone: get("phone"), website: get("website"), note };
    setScanTarget(payload.website || payload.name);
    setScan("scanning");
    setLeadNotice(null);
    const saved = submitLead({ data: payload }).then(r => r.ok).catch(() => false);
    const wait = new Promise(r => window.setTimeout(r, 3500));
    void Promise.all([saved, wait]).then(([ok]) => {
      setScan("done");
      setLeadNotice(ok
        ? "Transmission successful. Our team is reviewing your infrastructure and will contact you shortly."
        : "Transmission failed — please check your details and try again.");
    });
    trackFormSubmission(window.location.search, window.localStorage, () => {
      void supabase.rpc("increment_form_submissions");
    });
  };

  return (
    <main className={terminal && terminalAllowed ? "overflow-hidden" : undefined}>
      <NeuralCanvas />
      <header className="agency-header sticky top-0 z-40 border-b border-border/70">
        <div className="mx-auto flex h-22 max-w-7xl items-center justify-between gap-5 px-6 lg:px-10">
          <a href="#" aria-label="Apex Digital Systems home" className="flex items-center gap-3 font-display text-lg font-semibold">
            <span className="flex size-9 items-center justify-center rounded-lg border border-electric/40 bg-primary/10 text-electric"><ArrowUpRight className="size-6" /></span>
            <span>Apex<span className="text-muted-foreground"> Digital</span> Systems<span className="text-electric">.</span></span>
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-[13px] font-medium text-muted-foreground lg:flex">
            <a href="#pricing" className="transition-colors hover:text-foreground">Services &amp; Pricing</a>
            <Link to="/apps" className="transition-colors hover:text-foreground">Apps</Link>
            <Link to="/ads" className="transition-colors hover:text-foreground">Paid Ads</Link>
            {['Our Work', 'About'].map(name => <Button key={name} variant="link" className="h-auto p-0 text-[13px] text-muted-foreground hover:text-foreground hover:no-underline" onClick={() => openPanel(name)}>{name}</Button>)}
            <Link to="/auth" className="transition-colors hover:text-foreground">{teamSignedIn ? "Team Portal" : "Team Sign In"}</Link>
          </nav>
          <Button variant="hero" asChild className="hidden h-11 px-5 text-xs sm:inline-flex"><a href="#analysis">Free Business Analysis <ArrowUpRight /></a></Button>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button>
        </div>
        {menuOpen && <nav aria-label="Mobile navigation" className="flex flex-col gap-4 border-t border-border px-6 py-6 lg:hidden"><a href="#pricing" onClick={() => setMenuOpen(false)}>Services &amp; Pricing</a><Link to="/apps" onClick={() => setMenuOpen(false)}>Apps</Link><Link to="/ads" onClick={() => setMenuOpen(false)}>Paid Ads</Link>{['Our Work', 'About'].map(name => <Button key={name} variant="ghost" className="justify-start px-0" onClick={() => openPanel(name)}>{name}</Button>)}<Link to="/client/login" onClick={() => setMenuOpen(false)} className="flex items-center justify-between gap-3 rounded-xl border border-accent/50 bg-accent/10 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent/20"><span className="flex items-center gap-2 text-accent-foreground"><UserRound className="size-4" />Client Portal</span><ArrowRight className="size-4" /></Link><Link to="/auth" onClick={() => setMenuOpen(false)} className="flex items-center justify-between gap-3 rounded-xl border border-electric/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"><span className="flex items-center gap-2 text-electric"><UserRound className="size-4" />{teamSignedIn ? "Team Portal" : "Team Member Portal"}</span><ArrowRight className="size-4 text-electric" /></Link><Button variant="hero" asChild className="w-full sm:w-auto"><a href="#analysis">Free Business Analysis <ArrowUpRight /></a></Button></nav>}
      </header>

      <section className="hero flex items-center">
        <img src={heroImage} alt="An electric blue and violet gateway in the Nevada desert at night" width={1920} height={1024} fetchPriority="high" className={`hero-image${thanksgiving ? " tg-hero-image" : ""}`} />
        {thanksgiving && <ThanksgivingHero />}
        {christmas && <ChristmasHero />}
        <div className="hero-content mx-auto w-full max-w-7xl px-6 pb-24 pt-20 lg:px-10">
          {thanksgiving && <ThanksgivingTag />}
          {christmas && <ChristmasTag />}
          <div className="mb-8 flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/80 sm:text-xs"><span className="size-1.5 rounded-full bg-success" /> Small business. Bigger possibilities.</div>
          <h1 className="max-w-4xl font-display text-[42px] font-medium leading-[1.12] sm:text-[58px] lg:text-[72px]">
            Your business shouldn't<br className="hidden sm:block" /> blend in. It should be<br className="hidden sm:block" /> <span className="gradient-text">impossible to ignore.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">Small Business Websites, Local SEO &amp; Digital<br className="hidden sm:block" /> Marketing That Generate Leads.</p>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground"><Check className="size-3 text-success" /> No pressure. Just possibilities.</div>
          <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-4 text-[11px] text-foreground/75">
            <a href="https://www.google.com/maps/search/?api=1&query=Reno%2C+Nevada" target="_blank" rel="noopener noreferrer" title="Find us on Google Maps" className="flex items-center gap-1.5 underline-offset-4 transition-colors hover:text-foreground hover:underline"><MapPin className="size-3.5" /> Based in Reno, Nevada</a>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span className="flex items-center gap-1.5"><Globe2 className="size-3.5" /> Serving Businesses Nationwide</span>
          </div>
        </div>
        <a href="#pricing" aria-label="Explore services and pricing" className="absolute bottom-8 right-8 hidden items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:flex">Built for your next chapter <ArrowRight className="size-4 rotate-90" /></a>
      </section>

      <HiringSpotlight />

      <Link to="/ads" aria-label="Advertise with Apex Digital Systems — your advertisement could be right here" className="spotlight-banner group block py-5 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="spotlight-track" aria-hidden="true">
          {[0, 1].map(copy => (
            <div key={copy} className="flex items-center">
              {["Your advertisement could be right here", "Seen by local customers every day", "Claim your spotlight", "Your advertisement could be right here", "Seen by local customers every day", "Claim your spotlight"].map((text, i) => (
                <span key={i} className="spotlight-item font-display text-sm font-semibold uppercase tracking-[0.22em] text-foreground/90 transition-colors group-hover:text-foreground sm:text-base">
                  <span className="spotlight-dot" />{text}
                </span>
              ))}
            </div>
          ))}
        </div>
        <span className="sr-only">Your advertisement could be right here — learn about paid advertising with Apex</span>
      </Link>

      <section id="pricing" className="border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Services &amp; Pricing</p>
            <h2 className="font-display text-[30px] font-medium leading-[1.15] sm:text-[40px]">Clear starting points.<br className="hidden sm:block" /> <span className="gradient-text">Flexible from there.</span></h2>
          </div>
          <div className="space-y-14">
            {PACKAGE_GROUPS.map(group => (
              <div key={group}>
                <div className="mb-6 flex items-center gap-4">
                  <h3 className="font-display text-xl font-medium sm:text-2xl">{group}</h3>
                  <span className="h-px flex-1 bg-gradient-to-r from-electric/60 via-violet/40 to-transparent" aria-hidden="true" />
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {packages.filter(p => p.group === group).map(({ name, price, term, sub, cadence, text, icon: Icon, violet, custom, from, popular, features, span }) => (
                    <article key={name} className={`${span} grow-card group relative flex flex-col rounded-2xl p-7 transition-transform duration-300 hover:-translate-y-1 ${violet ? " grow-card-violet" : ""}${popular ? " ring-2 ring-electric/70 shadow-ambient" : ""}`}>
                      <span className="grow-card-glow" aria-hidden="true" />
                      {popular && <span className="relative mb-4 flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-electric to-violet px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-lg"><Sparkles className="size-3" />Most popular</span>}
                      <div className="relative flex items-start justify-between gap-4">
                        <span className="service-icon flex size-11 items-center justify-center rounded-xl text-electric transition-colors duration-300 group-hover:text-foreground"><Icon className="size-5" /></span>
                        <span className={`rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${violet ? "border-violet/45 text-violet-soft" : "border-electric/45 text-electric"}`}>{cadence}</span>
                      </div>
                      <h4 className="relative mt-6 font-display text-[20px] font-medium leading-snug">{name}</h4>
                      <div className="relative mt-3">
                        {custom ? (
                          <span className="font-display text-[30px] font-semibold leading-none gradient-text">Custom quote</span>
                        ) : (
                          <p className="flex flex-wrap items-baseline gap-x-2">
                            {from && <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">From</span>}
                            <span className="font-display text-[38px] font-semibold leading-none gradient-text">{price}</span>
                            {term && <span className="text-sm text-foreground/70">{term}</span>}
                          </p>
                        )}
                        {sub && <p className="mt-1 font-display text-lg font-semibold text-foreground">{sub}</p>}
                      </div>
                      <p className="relative mt-4 text-sm leading-6 text-muted-foreground">{text}</p>
                      <ul className={`relative mt-5 flex-1 border-t border-border/50 pt-5 ${span ? "grid content-start gap-x-6 gap-y-2.5 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-3" : "space-y-2.5"}`}>
                        {features.map(f => { const [lead, rest] = splitFeature(f); return <li key={f} className="flex items-start gap-2.5 text-[13px] leading-5 text-foreground/90"><Check className="mt-0.5 size-4 shrink-0 text-success" /><span>{lead && <strong className="font-semibold text-foreground">{lead}</strong>}{rest}</span></li>; })}
                      </ul>
                      <Button className="relative mt-6 w-full" variant={popular ? "default" : "outline"} asChild><a href="#analysis" onClick={() => setSelectedPackage(name.startsWith("Talking Website") ? "Talking Website Agent" : name)}>{custom ? "Request a quote" : "Get started"} <ArrowRight className="size-4" /></a></Button>
                    </article>
                  ))}
                </div>
                {group === "Talking websites" && <p className="mt-4 text-[13px] text-muted-foreground">Need more talk time? Extra minutes are just 25¢ each.</p>}
              </div>
            ))}
          </div>
          <p className="mt-8 flex items-center gap-3 text-[13px] leading-6 text-muted-foreground">
            <span className="service-icon flex size-9 shrink-0 items-center justify-center rounded-lg text-success"><CreditCard className="size-4" /></span>
            <span><strong className="font-semibold text-foreground">Flexible Payment Options Available</strong> — split any project into up to 4 card payments. A team member sets up your plan and sends a secure payment link.</span>
          </p>
          <p className="mt-3 text-[13px] text-muted-foreground">
            <Link to="/billing" className="text-electric underline-offset-4 transition-colors hover:text-foreground hover:underline">Manage Billing</Link> — update your card, download invoices, or cancel a plan in Stripe's secure customer portal.
          </p>
        </div>
      </section>

      <AppsPreview />

      <section id="founder" className="border-t border-border/50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16 lg:px-10">
          <div className="founder-photo relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl sm:max-w-sm">
            <div className="relative aspect-[4/5]">
              <img src={founderPhoto.url} alt="Daniel, founder of Apex Digital Systems, seated in his office with his dog beside him" className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/35 to-transparent px-5 pb-4 pt-12">
                <p className="font-display text-[15px] font-medium text-foreground">Daniel</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Founder, Apex Digital Systems</p>
              </div>
            </div>
          </div>
          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">About</p>
            <h2 className="font-display text-[30px] font-medium leading-[1.15] sm:text-[40px]">Meet the <span className="gradient-text">Founder</span></h2>
            <p className="mt-6 text-sm leading-7 text-muted-foreground sm:text-base">Hi, I'm Daniel, founder of <strong className="font-semibold text-foreground">Apex Digital Systems</strong>. I started this agency because I saw too many great local businesses missing opportunities simply because they didn't have a professional online presence. My mission is to help businesses build trust, get found online, and grow.</p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">Whether you're launching a new business or improving an existing one, I'm committed to helping you create an online presence that delivers real results.</p>
          </div>
        </div>
      </section>

      <section id="flyer" className="border-t border-border/50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16 lg:px-10">
          <div className="glass-card mx-auto w-full max-w-md rounded-2xl p-3">
            <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "1080 / 1920" }}>
              <AdLoop mp4={flyerVideo.url} poster={flyerVideoPoster.url} label="Animated Apex Digital Systems flyer: websites, local SEO and growth, custom apps and paid ads, with starting prices" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </div>
          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Hand it over</p>
            <h2 className="font-display text-[30px] font-medium leading-[1.15] sm:text-[40px]">Take the <span className="gradient-text">Apex flyer</span> with you.</h2>
            <p className="mt-6 text-sm leading-7 text-muted-foreground sm:text-base">Everything we do on one page — websites, local SEO and growth, custom apps, and paid ads, with real starting prices. Print it, pin it up, or pass it to a partner who's still thinking about it.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="hero" size="lg" asChild>
                <a href="/apex-flyer.pdf" download="Apex Digital Systems Flyer.pdf" target="_blank" rel="noopener noreferrer"><Download /> Download the flyer</a>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <a href={flyerFixed} target="_blank" rel="noopener noreferrer">See it full size <ArrowUpRight /></a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">One page, no pressure. Just possibilities.</p>
          </div>
        </div>
      </section>

      <section id="assembly-line" aria-label="Apex Digital Systems animated advertisement: from idea to launch" className="border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-10">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">How we work</p>
          <h2 className="font-display text-[30px] font-medium leading-[1.15] sm:text-[40px]">From <span className="gradient-text">idea</span> to launch.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Your project moves down our line — designed, built, secured, inspected and launched — the same way a factory ships a product it's proud of.</p>
          <div className="mx-auto mt-10 w-full max-w-md">
            <div className="glass-card rounded-2xl p-3">
              <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "1320 / 2308" }}>
                {animateAd ? (
                  <AdLoop mp4={adVideo.url} webm={adWebm.url} poster={adPoster.url} label="Animated Apex Digital Systems ad: an assembly line that designs, builds, secures, inspects and launches your website or app" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <img src={adPoster.url} alt="Apex Digital Systems ad: from idea to launch — design, build, secure, inspect, launch" className="absolute inset-0 h-full w-full object-cover" />
                )}
                {[
                  { href: "#pricing", label: "What we build", top: 72.8, left: 6, width: 88, height: 5.4 },
                  { href: "#analysis", label: "Start your build", top: 81.4, left: 27, width: 46, height: 6.8 },
                  { href: "#top", label: "apexdigitalsystems.org", top: 90.6, left: 20, width: 60, height: 4.4 },
                ].map((spot) => (
                  <a
                    key={spot.label}
                    href={spot.href}
                    aria-label={spot.label}
                    onClick={spot.href === "#top" ? (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); } : undefined}
                    className="absolute rounded-lg outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-electric hover:ring-2 hover:ring-electric/60"
                    style={{ top: `${spot.top}%`, left: `${spot.left}%`, width: `${spot.width}%`, height: `${spot.height}%` }}
                  />
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Tap any part of the ad to jump there.</p>
          </div>
        </div>
      </section>


      <section id="analysis" className="lead-banner border-t border-border/50">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center lg:px-10">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Free Business Analysis</p>
          <h2 className="font-display text-[30px] font-medium leading-[1.15] sm:text-[40px]">Discover what's holding your business <span className="gradient-text">back.</span></h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">Request a free analysis of your website and online presence. A real person reviews your business and sends personalized recommendations to improve SEO, increase visibility, and generate more leads.</p>
          {scan === "idle" && <form key={selectedPackage ?? "none"} className="mx-auto mt-10 grid max-w-2xl gap-4 text-left sm:grid-cols-2" onSubmit={handleLeadSubmit}>
            <Input name="business" placeholder="Business Name" required aria-label="Business Name" className="h-12 sm:col-span-2" />
            <Input name="name" placeholder="Your Name" required aria-label="Name" className="h-12" />
            <Input name="email" type="email" placeholder="Email" required aria-label="Email" className="h-12" />
            <Input name="phone" type="tel" placeholder="Phone Number" required aria-label="Phone Number" autoComplete="tel" className="h-12" />
            <Input name="website" type="url" placeholder="Website URL (optional)" aria-label="Website URL" className="h-12" />
            <Input name="industry" placeholder="Type of business (e.g. plumbing, salon)" aria-label="Type of business" className="h-12" />
            <Input name="location" placeholder="City / service area" aria-label="City or service area" className="h-12" />
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">What are you interested in?</legend>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map(opt => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs has-[:checked]:border-electric has-[:checked]:text-electric">
                    <input type="checkbox" name="interests" value={opt} defaultChecked={opt === selectedPackage} className="accent-primary" />{opt}
                  </label>
                ))}
              </div>
            </fieldset>
            <select name="budget" aria-label="Budget" defaultValue="" className="h-12 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="">Budget (optional)</option>
              <option>Under $500</option><option>$500 – $1,500</option><option>$1,500 – $5,000</option><option>$5,000+</option><option>Not sure yet</option>
            </select>
            <select name="timeline" aria-label="Timeline" defaultValue="" className="h-12 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="">Timeline (optional)</option>
              <option>As soon as possible</option><option>Within 1 month</option><option>1–3 months</option><option>Just exploring</option>
            </select>
            <Textarea name="details" rows={5} maxLength={2500} placeholder="Tell us about your business — what you do, your goals, current challenges, who your customers are, and anything you'd like help with." aria-label="Business details" className="sm:col-span-2" />
            <Button variant="hero" type="submit" className="h-14 gap-4 text-[13px] font-semibold sm:col-span-2">Send My Information <Send className="size-4" /></Button>
            <p className="text-xs text-muted-foreground sm:col-span-2">Sending this form is free and doesn’t charge you anything. A team member will review your details and reach out with a personalized proposal and a secure online payment link.</p>
          </form>}
          {scan === "scanning" && <ScanAnimation target={scanTarget} />}
          {scan === "done" && <div className="scan-panel mx-auto mt-10 max-w-2xl rounded-2xl p-8"><p className="font-technical text-sm text-success">SCAN COMPLETE</p><Button variant="link" className="mt-3 text-xs" onClick={() => { setScan("idle"); setLeadNotice(null); }}>Start over</Button></div>}
          {leadNotice && <p className={`mt-5 text-sm ${leadNotice.startsWith("Transmission successful") ? "text-success" : "text-destructive"}`} role="status">{leadNotice}</p>}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground lg:px-10">
          <span>© {new Date().getFullYear()} Apex Digital Systems</span>
          <span>Reno roots. Nationwide reach.</span>
           <span className="flex items-center gap-4"><ViewCounter />{terminalAllowed && <Button variant="link" onClick={() => setTerminal(true)} className="h-auto p-0 font-technical text-xs text-aetheris-teal hover:text-foreground">[ / ] Terminal</Button>}</span>
          <span className="flex items-center gap-5"><Link to="/ads" className="text-xs text-muted-foreground transition-colors hover:text-foreground">Paid Ads</Link><Link to="/client/login" className="text-xs text-muted-foreground transition-colors hover:text-foreground">Customer Portal</Link><Link to="/billing" className="text-xs text-muted-foreground transition-colors hover:text-foreground">Manage Billing</Link><Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground">{teamSignedIn ? "Team Portal" : "Team Sign In"}</Link>{['Privacy Policy', 'Terms of Service'].map(name => <Button key={name} variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground hover:no-underline" onClick={() => openPanel(name)}>{name}</Button>)}</span>
        </div>
      </footer>
      <SwarmFeed />
      <VoiceAgent />
      {terminal && terminalAllowed && <TerminalMode packages={packages} onExit={() => setTerminal(false)} />}

      <Dialog open={panel !== null} onOpenChange={open => { if (!open) setPanel(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><span className="mb-3 text-electric"><Sparkles className="size-6" /></span><DialogTitle className="font-display text-2xl">{info?.title ?? ''}</DialogTitle><DialogDescription className="pt-3 leading-7">{info?.text ?? ''}</DialogDescription></DialogHeader>
          <Button variant="hero" asChild className="mt-3"><a href="#analysis" onClick={() => setPanel(null)}>Get My Free Business Analysis <ArrowUpRight /></a></Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
