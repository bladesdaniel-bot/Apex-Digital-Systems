import { useEffect, useRef, useState, type ReactNode } from "react";
import { flyerPriceRows, packages } from "@/lib/offers";

const SCENE_MS = 4200;

type Spot = { href: string; label: string; top: number; left: number; width: number; height: number };

const STATIC_SPOTS: Spot[] = [
  { href: "#services", label: "Websites", top: 54.3, left: 6.7, width: 42.5, height: 9.2 },
  { href: "#services", label: "SEO and local growth", top: 54.3, left: 50.8, width: 42.5, height: 9.2 },
  { href: "#services", label: "Custom apps", top: 64.7, left: 6.7, width: 42.5, height: 9.2 },
  { href: "#services", label: "Paid ads and growth", top: 64.7, left: 50.8, width: 42.5, height: 9.2 },
  { href: "#pricing", label: "See starting prices", top: 76, left: 12, width: 76, height: 3.5 },
  { href: "#analysis", label: "Get my free business analysis", top: 80.4, left: 19, width: 62, height: 6.2 },
  { href: "#top", label: "apexdigitalsystems.org", top: 88.6, left: 22, width: 56, height: 4 },
];

function Bullet({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-[2.2cqw] text-[3.9cqw] leading-[1.5] text-foreground/85">
      <span aria-hidden className="mt-[1.5cqw] size-[1.5cqw] shrink-0 rotate-45 bg-violet shadow-ambient" />
      <span>{children}</span>
    </li>
  );
}

const SCENES: { key: string; node: ReactNode }[] = [
  {
    key: "title",
    node: (
      <div className="flex h-full flex-col items-center justify-center gap-[3cqw] px-[7cqw] text-center">
        <p className="text-[19cqw] font-semibold leading-[0.9] tracking-[-0.03em] neon-electric">APEX</p>
        <span aria-hidden className="h-px w-[46cqw] bg-gradient-to-r from-transparent via-violet to-transparent" />
        <p className="text-[5.6cqw] leading-[1.35] text-foreground">We build websites</p>
        <p className="-mt-[2cqw] text-[5.6cqw] leading-[1.35] neon-success">& custom software</p>
        <p className="mt-[2cqw] rounded-full border border-star/70 px-[5cqw] py-[2.2cqw] text-[4.6cqw] font-semibold neon-star">
          Websites from {packages.find((p) => p.name === "Website Launch")?.price}
        </p>
        <p className="text-[3.5cqw] text-muted-foreground">No startup cost &middot; payment plans</p>
      </div>
    ),
  },
  {
    key: "websites",
    node: (
      <div className="flex h-full flex-col items-center justify-center gap-[2.6cqw] px-[8cqw] text-center">
        <h3 className="text-[7cqw] font-medium leading-[1.15] neon-electric">Website Launch<br />&amp; Redesign</h3>
        <p className="text-[17cqw] font-semibold leading-[1] neon-star">$1,000</p>
        <p className="text-[4cqw] neon-success">No startup cost</p>
        <p className="-mt-[2.4cqw] text-[3.6cqw] text-muted-foreground">split into 2&ndash;4 easy installments</p>
        <ul className="mt-[1cqw] w-full space-y-[1.6cqw] text-left">
          <Bullet>Custom design, loads in under a second</Bullet>
          <Bullet>Click-to-call buttons &amp; contact forms</Bullet>
          <Bullet>Google Maps directions &amp; trust badges</Bullet>
        </ul>
      </div>
    ),
  },
  {
    key: "seo",
    node: (
      <div className="flex h-full flex-col items-center justify-center gap-[3.2cqw] px-[8cqw] text-center">
        <h3 className="text-[7cqw] font-medium leading-[1.15] neon-electric">Get Found on Google</h3>
        <div className="flex w-full items-center gap-[2.6cqw] rounded-full border border-electric/50 bg-background/70 px-[4.4cqw] py-[2.8cqw] shadow-ambient">
          <span aria-hidden className="grid size-[4cqw] place-items-center rounded-full border-2 border-electric" />
          <span className="text-[4cqw] text-foreground/90">plumber in Reno NV</span>
        </div>
        <p className="text-[4.4cqw] neon-success">Your business, right on page one</p>
        <p className="mt-[2cqw] text-[6.4cqw] font-medium neon-violet">SEO Growth Cleanup</p>
        <p className="-mt-[2cqw] text-[12cqw] font-semibold leading-none neon-star">
          $399 <span className="text-[4cqw] font-normal text-muted-foreground">one-time</span>
        </p>
      </div>
    ),
  },
  {
    key: "apps",
    node: (
      <div className="flex h-full flex-col items-center justify-center gap-[3.4cqw] px-[8cqw] text-center">
        <h3 className="text-[6.6cqw] font-medium leading-[1.15] neon-violet">Custom software<br />built for you</h3>
        <div className="grid w-full grid-cols-2 gap-[2.6cqw]">
          {[
            ["Client portals", "accounts, dashboards, billing"],
            ["Team CRMs", "job queues, dispatch, schedules"],
            ["Payments", "Stripe, installments, subscriptions"],
            ["AI & automation", "smart intake, scanning, alerts"],
          ].map(([title, sub]) => (
            <div key={title} className="rounded-[2.4cqw] border border-electric/35 bg-card/60 px-[3cqw] py-[3cqw] text-left">
              <p className="text-[4.1cqw] font-semibold text-foreground">{title}</p>
              <p className="mt-[1cqw] text-[3.1cqw] leading-[1.4] text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
        <p className="text-[4.2cqw] neon-star">Quoted per project</p>
      </div>
    ),
  },
  {
    key: "prices",
    node: (
      <div className="flex h-full flex-col items-center justify-center gap-[3cqw] px-[8cqw] text-center">
        <h3 className="text-[6.6cqw] font-medium leading-[1.15] neon-violet">Websites &amp;<br />Custom Software</h3>
        <ul className="w-full space-y-[1.8cqw] text-[3.9cqw]">
          {flyerPriceRows.map((row) => (
            <li key={row.label} className="flex items-baseline gap-[1.6cqw]">
              <span className="text-foreground/85">{row.label}</span>
              <span aria-hidden className="h-px flex-1 border-b border-dashed border-border" />
              <span className="font-semibold neon-star">{row.price}</span>
            </li>
          ))}
        </ul>
        <a
          href="#analysis"
          className="mt-[1cqw] rounded-full border border-electric/60 bg-primary/15 px-[5cqw] py-[2.6cqw] text-[4cqw] font-semibold text-foreground shadow-ambient transition-colors hover:bg-primary/30"
        >
          Get My FREE Business Analysis &rarr;
        </a>
      </div>
    ),
  },
];

export default function FlyerReel({ poster }: { poster: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    // Start rotating immediately: IntersectionObserver is unreliable at
    // re-firing in some mobile browsers, which used to freeze the reel on
    // scene one. A 4.2s interval costs nothing when off-screen.
    const timer = window.setInterval(() => setActive((i) => (i + 1) % SCENES.length), SCENE_MS);
    return () => window.clearInterval(timer);
  }, [reduced]);

  if (reduced) {
    return (
      <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "1320 / 1650" }}>
        <img
          src={poster}
          alt="Apex Digital Systems flyer: websites, local SEO and local growth, custom apps and paid ads, with starting prices"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {STATIC_SPOTS.map((spot) => (
          <a
            key={spot.label}
            href={spot.href}
            aria-label={spot.label}
            onClick={
              spot.href === "#top"
                ? (e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                : undefined
            }
            className="absolute rounded-lg outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-electric hover:ring-2 hover:ring-electric/60"
            style={{ top: `${spot.top}%`, left: `${spot.left}%`, width: `${spot.width}%`, height: `${spot.height}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={stage}
      className="flyer-stage relative overflow-hidden rounded-xl"
      style={{ aspectRatio: "1320 / 1650" }}
      aria-label="Animated Apex Digital Systems flyer"
    >
      <div aria-hidden className="flyer-space absolute inset-0" />
      <div aria-hidden className="flyer-stars absolute inset-0" />
      <div aria-hidden className="flyer-horizon absolute inset-x-0 bottom-0" />
      <div aria-hidden className="flyer-grid" />

      <div aria-hidden className="absolute inset-x-0 top-[5cqw] z-10 flex justify-center">
        <p className="text-[3cqw] font-semibold uppercase tracking-[0.42em] text-electric">Apex Digital Systems</p>
      </div>

      {SCENES.map((scene, i) => (
        <div
          key={scene.key}
          aria-hidden={i !== active}
          className={`flyer-scene absolute inset-0 z-[5] flex items-center justify-center px-[2cqw] pb-[15cqw] pt-[11cqw] ${
            i === active ? "is-active" : "is-idle"
          }`}
        >
          {scene.node}
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-electric/30 bg-background/80 px-[5cqw] py-[3cqw] text-center backdrop-blur-sm">
        <p className="text-[4.4cqw] font-semibold neon-star">Visit apexdigitalsystems.org</p>
        <a href="#analysis" className="mt-[1cqw] inline-block text-[3.2cqw] text-muted-foreground underline decoration-electric/50 underline-offset-4 hover:text-foreground">
          or fill out the free analysis at apexdigitalsystems.org
        </a>
      </div>
    </div>
  );
}
