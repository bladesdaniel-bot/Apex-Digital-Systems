import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import pdf from "@/assets/packages-guide.pdf.asset.json";
import p1 from "@/assets/packages-p-1.png.asset.json";

export const Route = createFileRoute("/_authenticated/team/packages")({
  head: () => ({
    meta: [
      { title: "Packages and Pricing | Apex Digital Systems" },
      { name: "description", content: "Apex packages and everyday prices for the team." },
      { property: "og:title", content: "Packages and Pricing | Apex Digital Systems" },
      { property: "og:description", content: "Website, monthly plan, SEO and talking website packages at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PackagesPage,
});

function PackagesPage() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  return (
    <TeamShell isAdmin={me.data?.role === "admin"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-medium">Packages <span className="gradient-text">and pricing</span></h1>
        <Button asChild variant="hero" size="sm">
          <a href={pdf.url} download="Apex_Packages_and_Pricing.pdf" target="_blank" rel="noopener noreferrer">Download PDF</a>
        </Button>
      </div>
      <img src={p1.url} alt="Apex packages and pricing" className="mt-8 w-full rounded-xl border border-border bg-card" />
    </TeamShell>
  );
}
