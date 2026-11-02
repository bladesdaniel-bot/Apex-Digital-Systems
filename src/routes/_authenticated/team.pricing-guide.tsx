import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import guidePdf from "@/assets/pricing-guide-v2.pdf.asset.json";
import p1 from "@/assets/pricing-guide-p-1.png.asset.json";
import p2 from "@/assets/pricing-guide-p-2.png.asset.json";
import p3 from "@/assets/pricing-guide-p-3.png.asset.json";
import p4 from "@/assets/pricing-guide-p-4.png.asset.json";
import p5 from "@/assets/pricing-guide-p-5.png.asset.json";
import p6 from "@/assets/pricing-guide-p-6.png.asset.json";
import p7 from "@/assets/pricing-guide-p-7.png.asset.json";
import p8 from "@/assets/pricing-guide-p-8.png.asset.json";

const PAGES = [p1, p2, p3, p4, p5, p6, p7, p8];

export const Route = createFileRoute("/_authenticated/team/pricing-guide")({
  head: () => ({
    meta: [
      { title: "Pricing & Compensation | Apex Digital Systems" },
      { name: "description", content: "Apex prices for websites, monthly plans, SEO and talking websites, plus employee compensation." },
      { property: "og:title", content: "Pricing & Compensation | Apex Digital Systems" },
      { property: "og:description", content: "Website and talking website pricing, tiers, discounts and payment terms for the team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PricingGuidePage,
});

function PricingGuidePage() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  return (
    <TeamShell isAdmin={me.data?.role === "admin"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-medium">Pricing guide & <span className="gradient-text">employee compensation</span></h1>
        <Button asChild variant="hero" size="sm">
          <a href={guidePdf.url} download="Apex_Internal_Pricing_Guide.pdf" target="_blank" rel="noopener noreferrer">Download PDF</a>
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Websites, monthly plans, Talking Websites and Ads · For the whole team · Updated October 26, 2026</p>
      <div className="mt-8 grid gap-6">
        {PAGES.map((p, i) => (
          <img key={p.url} src={p.url} alt={`Pricing guide page ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} className="w-full rounded-xl border border-border bg-card" />
        ))}
      </div>
    </TeamShell>
  );
}
