import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, ArrowRight, MapPin, Globe2, Menu, X, Check, Sparkles, CreditCard, UserRound, Send, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import heroImage from "@/assets/nevada-gateway.jpg";
import pllHero from "@/assets/pll-hero.jpg";
import pllVial from "@/assets/pll-vial.jpg";
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
import { interestOptions, packages, services } from "@/lib/offers";
import { supabase } from "@/integrations/supabase/client";
import { AetherisConcept } from "@/components/AetherisConcept";
import { AppsPreview } from "@/components/AppsPreview";
import { NeuralCanvas } from "@/components/upgrade/NeuralCanvas";
import { SwarmFeed } from "@/components/upgrade/SwarmFeed";
import { TerminalMode } from "@/components/upgrade/TerminalMode";
import { RevenueEngine } from "@/components/upgrade/RevenueEngine";
import { ScanAnimation } from "@/components/upgrade/LeadExtras";

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

const caseStudies = [
  { client: "Neon Bean Roasters", type: "E-Commerce Redesign & Local SEO", stat: "+210%", text: "Increased online sales by 210% and secured the #1 spot in local map packs within 45 days." },
  { client: "Sierra Breeze HVAC", type: "Lead Generation Website", stat: "2x", text: "Integrated automated appointment scheduling and doubled inbound service call volume." },
  { client: "Pinnacle Estate Realty", type: "Custom Automation & Web Launch", stat: "15 hrs", text: "A custom CRM integration and lead capture system saved the sales team 15 hours a week." },
];

const conceptProducts = [
  { name: "Neuro-Enhance Protocol", hue: "0deg" },
  { name: "Cellular Regeneration", hue: "40deg" },
  { name: "Synthetic Base Matrix", hue: "-30deg" },
];

const infoPanels: Record<string, { title: string; text: string }> = {
  ...Object.fromEntries(services.map(s => [s.key, { title: s.title, text: `${s.text} ${s.note}` }])),
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
            <a href="#services" className="transition-colors hover:text-foreground">Services</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <Link to="/apps" className="transition-colors hover:text-foreground">Apps</Link>
            {['Our Work', 'About'].map(name => <Button key={name} variant="link" className="h-auto p-0 text-[13px] text-muted-foreground hover:text-foreground hover:no-underline" onClick={() => openPanel(name)}>{name}</Button>)}
            <Link to="/auth" className="transition-colors hover:text-foreground">{teamSignedIn ? "Team Portal" : "Team Sign In"}</Link>
          </nav>
          <Button variant="hero" asChild className="hidden h-11 px-5 text-xs sm:inline-flex"><a href="#analysis">Free Business Analysis <ArrowUpRight /></a></Button>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button>
        </div>
        {menuOpen && <nav aria-label="Mobile navigation" className="flex flex-col gap-4 border-t border-border px-6 py-6 lg:hidden"><a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a><Link to="/apps" onClick={() => setMenuOpen(false)}>Apps</Link>{['Our Work', 'About'].map(name => <Button key={name} variant="ghost" className="justify-start px-0" onClick={() => openPanel(name)}>{name}</Button>)}<Link to="/auth" onClick={() => setMenuOpen(false)} className="text-muted-foreground transition-colors hover:text-foreground">{teamSignedIn ? "Team Portal" : "Team Sign In"}</Link><Button variant="hero" asChild className="w-full sm:w-auto"><a href="#analysis">Free Business Analysis <ArrowUpRight /></a></Button></nav>}
      </header>

      <section className="hero flex items-center">
        <img src={heroImage} alt="An electric blue and violet gateway in the Nevada desert at night" width={1920} height={1024} fetchPriority="high" className="hero-image" />
        <div className="hero-content mx-auto w-full max-w-7xl px-6 pb-24 pt-20 lg:px-10">
          <div className="mb-8 flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/80 sm:text-xs"><span className="size-1.5 rounded-full bg-success" /> Small business. Bigger possibilities.</div>
          <h1 className="max-w-4xl font-display text-[42px] font-medium leading-[1.12] sm:text-[58px] lg:text-[72px]">
            Your business shouldn't<br className="hidden sm:block" /> blend in. It should be<br className="hidden sm:block" /> <span className="gradient-text">impossible to ignore.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">Small Business Websites, Local SEO &amp; Digital<br className="hidden sm:block" /> Marketing That Generate Leads.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button variant="hero" asChild className="h-14 gap-4 px-6 text-[13px] font-semibold"><a href="#analysis">Get My Free Business Analysis <ArrowUpRight className="size-4" /></a></Button>
            <Button variant="heroOutline" asChild className="h-14 gap-4 px-6 text-[13px]"><a href="#services">View Services &amp; Pricing <ArrowRight /></a></Button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground"><Check className="size-3 text-success" /> No pressure. Just possibilities.</div>
          <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-4 text-[11px] text-foreground/75">
            <a href="https://www.google.com/maps/search/?api=1&query=Reno%2C+Nevada" target="_blank" rel="noopener noreferrer" title="Find us on Google Maps" className="flex items-center gap-1.5 underline-offset-4 transition-colors hover:text-foreground hover:underline"><MapPin className="size-3.5" /> Based in Reno, Nevada</a>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span className="flex items-center gap-1.5"><Globe2 className="size-3.5" /> Serving Businesses Nationwide</span>
          </div>
        </div>
        <a href="#services" aria-label="Explore services" className="absolute bottom-8 right-8 hidden items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:flex">Built for your next chapter <ArrowRight className="size-4 rotate-90" /></a>
      </section>

      <section id="services" className="border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Services</p>
            <h2 className="font-display text-[30px] font-medium leading-[1.15] sm:text-[40px]">What do you need help with?<br className="hidden sm:block" /> <span className="gradient-text">Four ways to grow.</span></h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {services.map(({ key, icon: Icon, title, text, link }, i) => (
              <article key={key} className="grow-card group relative flex flex-col rounded-2xl p-7 sm:p-8">
                <span className="grow-card-glow" aria-hidden="true" />
                <div className="relative flex items-start justify-between gap-4">
                  <span className="service-icon flex size-12 items-center justify-center rounded-xl text-electric transition-colors duration-300 group-hover:text-foreground"><Icon className="size-6" /></span>
                  <span className="font-display text-xs font-semibold tracking-[0.18em] text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="relative mt-7 font-display text-[22px] font-medium leading-snug">{title}</h3>
                <p className="relative mt-3 max-w-sm flex-1 text-sm leading-7 text-muted-foreground">{text}</p>
                <Button variant="link" className="relative mt-7 w-fit gap-2 px-0 text-[13px] font-semibold text-electric hover:text-foreground hover:no-underline" onClick={() => openPanel(key)}>{link} <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="work" className="border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Client Success &amp; Portfolio</p>
              <h2 className="font-display text-[30px] font-medium leading-[1.15] sm:text-[40px]">Results that <span className="gradient-text">speak for themselves.</span></h2>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sample placeholders</span>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {caseStudies.map(c => (
              <article key={c.client} className="grow-card group relative flex flex-col rounded-2xl p-7">
                <span className="grow-card-glow" aria-hidden="true" />
                <p className="relative text-[10px] font-semibold uppercase tracking-[0.14em] text-electric">{c.type}</p>
                <h3 className="relative mt-3 font-display text-[22px] font-medium">{c.client}</h3>
                <p className="relative mt-6 font-display text-[44px] font-semibold leading-none gradient-text">{c.stat}</p>
                <p className="relative mt-4 text-sm leading-7 text-muted-foreground">{c.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="concept" className="concept-section border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Featured Concept</p>
          <h2 className="font-display text-[34px] font-medium leading-[1.1] sm:text-[52px]">Featured Concept: <span className="gradient-text">Power Logic Labs</span></h2>
          <p className="mt-5 text-sm text-muted-foreground">Fictional portfolio example only — not a real business or product offering. Not for sale.</p>
          <div className="neon-hero relative mt-12 overflow-hidden rounded-3xl">
            <img src={pllHero} alt="Glowing blue and violet DNA helix" width={1600} height={800} loading="lazy" className="h-[340px] w-full object-cover sm:h-[460px]" />
            <div className="neon-hero-overlay absolute inset-0 flex flex-col justify-center p-8 sm:p-14">
              <h3 className="max-w-lg font-display text-[34px] font-semibold leading-[1.05] sm:text-[60px]">Next-Gen Research Materials.</h3>
              <p className="mt-4 font-display text-xl gradient-text sm:text-2xl">A clearer view.</p>
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {conceptProducts.map(p => (
              <article key={p.name} className="glass-card group overflow-hidden rounded-2xl">
                <div className="overflow-hidden"><img src={pllVial} alt={`${p.name} concept vial`} width={816} height={816} loading="lazy" style={{ filter: `hue-rotate(${p.hue})` }} className="aspect-[4/3] w-full object-cover" /></div>
                <div className="flex items-end justify-between gap-4 p-6">
                  <div>
                    <h3 className="font-display text-lg font-medium">{p.name}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">Fictional design study · Not for sale</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">These concepts are separate from Apex Digital Systems’ services and sales.</p>
        </div>
      </section>

      <AetherisConcept />

      

      <RevenueEngine />

      <section id="pricing" className="border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Services &amp; Pricing</p>
            <h2 className="font-display text-[30px] font-medium leading-[1.15] sm:text-[40px]">Clear starting points.<br className="hidden sm:block" /> <span className="gradient-text">Flexible from there.</span></h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {packages.map(({ name, price, term, cadence, text, icon: Icon, span, violet, custom }) => (
              <article key={name} className={`grow-card group relative flex flex-col rounded-2xl p-7 sm:p-8 ${span}${violet ? " grow-card-violet" : ""}`}>
                <span className="grow-card-glow" aria-hidden="true" />
                <div className="relative flex items-start justify-between gap-4">
                  <span className="service-icon flex size-12 items-center justify-center rounded-xl text-electric transition-colors duration-300 group-hover:text-foreground"><Icon className="size-6" /></span>
                  <span className={`rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${violet ? "border-violet/45 text-violet-soft" : "border-electric/45 text-electric"}`}>{cadence}</span>
                </div>
                <h3 className="relative mt-7 font-display text-[21px] font-medium leading-snug">{name}</h3>
                <p className="relative mt-3 flex items-baseline gap-2 text-muted-foreground">
                  {custom ? (
                    <span className="font-display text-[30px] font-semibold leading-none text-foreground">Custom quote</span>
                  ) : (
                    <>
                      <span className="text-[11px] uppercase tracking-[0.12em]">Starting at</span>
                      <span className="font-display text-[30px] font-semibold leading-none text-foreground">{price}</span>
                      {term && <span className="text-sm text-foreground/70">{term}</span>}
                    </>
                  )}
                </p>
                <p className="relative mt-4 max-w-md text-sm leading-7 text-muted-foreground">{text}</p>
                {/* Keeps every card's button on the same line, whatever the card's height. */}
                <span className="relative flex-1 pt-6" aria-hidden="true" />
                <Button className="relative self-start" asChild><a href="#analysis" onClick={() => setSelectedPackage(name)}>{custom ? "Request a quote" : "Request info"} <ArrowRight className="size-4" /></a></Button>
              </article>
            ))}
          </div>
          <p className="mt-8 flex items-center gap-3 text-[13px] leading-6 text-muted-foreground">
            <span className="service-icon flex size-9 shrink-0 items-center justify-center rounded-lg text-success"><CreditCard className="size-4" /></span>
            <span><strong className="font-semibold text-foreground">Flexible Payment Options Available</strong> — split payments available on qualifying projects. A team member sets up your plan and sends a secure payment link.</span>
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
            <div className="flex aspect-[4/5] flex-col items-center justify-center gap-5 text-muted-foreground">
              <span className="service-icon flex size-20 items-center justify-center rounded-2xl text-electric"><UserRound className="size-10" /></span>
              <span className="px-6 text-center text-[10px] font-semibold uppercase tracking-[0.16em]">Professional headshot placeholder</span>
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
                  { href: "#services", label: "What we build", top: 72.8, left: 6, width: 88, height: 5.4 },
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
            <p className="text-xs text-muted-foreground sm:col-span-2">No payment is taken online. A team member will review your details and reach out with a personalized proposal.</p>
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
          <span className="flex items-center gap-5"><Link to="/billing" className="text-xs text-muted-foreground transition-colors hover:text-foreground">Manage Billing</Link><Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground">{teamSignedIn ? "Team Portal" : "Team Sign In"}</Link>{['Privacy Policy', 'Terms of Service'].map(name => <Button key={name} variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground hover:no-underline" onClick={() => openPanel(name)}>{name}</Button>)}</span>
        </div>
      </footer>
      <SwarmFeed />
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
