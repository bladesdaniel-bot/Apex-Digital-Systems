import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppsShowcase } from "@/components/AppsShowcase";

export const Route = createFileRoute("/apps")({
  head: () => ({
    meta: [
      { title: "Apps We Build | Apex Digital Systems" },
      { name: "description", content: "See the custom apps Apex Digital Systems designs and builds." },
      { property: "og:title", content: "Apps We Build | Apex Digital Systems" },
      { property: "og:description", content: "Demos of custom apps built by Apex Digital Systems in Reno." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppsPage,
});

function AppsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Apex Digital Systems
        </Link>
      </header>
      <AppsShowcase />
    </main>
  );
}
