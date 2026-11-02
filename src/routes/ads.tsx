import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Megaphone, MousePointerClick, MapPin, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import flyerVideo from "@/assets/apex-paid-ads-flyer.mp4.asset.json";
import flyerPoster from "@/assets/apex-paid-ads-flyer-poster.jpg.asset.json";
import { HiringSpotlight } from "@/components/HiringSpotlight";

export const Route = createFileRoute("/ads")({
  head: () => ({
    meta: [
      { title: "Advertise With Us | Apex Digital Systems" },
      { name: "description", content: "Put your business in front of customers with a paid ad spot on Apex Digital Systems." },
      { property: "og:title", content: "Advertise With Us | Apex Digital Systems" },
      { property: "og:description", content: "Your advertisement could be right here. Claim a paid ad spot with Apex Digital Systems." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdsPage,
});

const perks = [
  { icon: MousePointerClick, title: "Clickable to your business", text: "Your ad links straight to your website or phone number." },
  { icon: MapPin, title: "Local and nationwide reach", text: "Seen by business owners visiting from Reno and across the country." },
  { icon: Palette, title: "Ad design included", text: "We design the ad for you so it matches your brand." },
];

function AdSlot({ size }: { size: string }) {
  return (
    <Link to="/" hash="analysis" className={`grow-card group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-electric/50 p-8 text-center ${size}`}>
      <span className="grow-card-glow" aria-hidden="true" />
      <Megaphone className="relative size-8 text-electric" />
      <p className="relative mt-4 font-display text-2xl font-medium sm:text-3xl">Your advertisement <span className="gradient-text">could be right here.</span></p>
      <span className="relative mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground group-hover:text-foreground">Claim this spot →</span>
    </Link>
  );
}

function AdsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-6 lg:px-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Apex Digital Systems
        </Link>
        <Link to="/client/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Customer Portal</Link>
      </header>
      <HiringSpotlight />
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-8 lg:px-10">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Paid Advertisements</p>
        <h1 className="max-w-3xl font-display text-[36px] font-medium leading-[1.1] sm:text-[56px]">Your advertisement <span className="gradient-text">could be right here.</span></h1>
        <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">Put your business in front of people who are actively looking to grow. Ad spots are open now.</p>
        <div className="mt-12 flex flex-col items-center">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Featured advertisement</p>
          <div className="glass-card w-full max-w-sm overflow-hidden rounded-2xl">
            <video
              src={flyerVideo.url}
              poster={flyerPoster.url}
              className="h-auto w-full"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Example paid advertisement"
            />
          </div>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <AdSlot size="md:col-span-2 min-h-[260px]" />
          <AdSlot size="min-h-[220px]" />
          <AdSlot size="min-h-[220px]" />
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {perks.map(({ icon: Icon, title, text }) => (
            <article key={title} className="glass-card rounded-2xl p-7">
              <span className="service-icon flex size-12 items-center justify-center rounded-xl text-electric"><Icon className="size-6" /></span>
              <h2 className="mt-6 font-display text-lg font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-start gap-3">
          <Button variant="hero" size="lg" asChild><Link to="/" hash="analysis">Ask about an ad spot <ArrowRight /></Link></Button>
          <p className="text-xs text-muted-foreground">Fill out the form and choose "Paid Ads." A team member will reach out with options.</p>
        </div>
      </section>
    </main>
  );
}
