import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import part1 from "@/assets/Apex_Training_Part_1.mp4.asset.json";
import part2 from "@/assets/Apex_Training_Part_2.mp4.asset.json";
import part3 from "@/assets/Apex_Training_Part_3.mp4.asset.json";
import part4 from "@/assets/Apex_Training_Packages.mp4.asset.json";
import part5 from "@/assets/Apex_Training_Ads_AddOn.mp4.asset.json";
import part6 from "@/assets/Apex_Training_Hesitate.mp4.asset.json";

export const Route = createFileRoute("/_authenticated/team/training")({
  head: () => ({
    meta: [
      { title: "Training Videos | Apex Digital Systems" },
      { name: "description", content: "Recorded sales call training for Apex Digital Systems team members." },
      { property: "og:title", content: "Training Videos | Apex Digital Systems" },
      { property: "og:description", content: "Watch the Apex sales call training in six parts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainingPage,
});

const VIDEOS: { src: string; part: string; title: string; blurb: string; portrait?: boolean }[] = [
  { src: part1.url, part: "Part 1", title: "Opening the call", blurb: "How to introduce yourself, qualify the business and earn the right to keep talking." },
  { src: part2.url, part: "Part 2", title: "The pitch", blurb: "Walking a prospect through what Apex does and what it costs, without talking yourself out of the sale." },
  { src: part3.url, part: "Part 3", title: "Closing and next steps", blurb: "Handling objections, booking the appointment and writing the order so the build starts on time." },
  { src: part4.url, part: "Part 4", title: "Going over the packages", blurb: "A walkthrough of every Apex package, what's included and how to present the pricing to a customer." },
  { src: part5.url, part: "Part 5", title: "Ads add-on", blurb: "How the advertising add-on works and how to offer it to a customer on top of their package.", portrait: true },
  { src: part6.url, part: "Part 6", title: "When they hesitate", blurb: "What to say when a prospect stalls or goes quiet, and how to keep the conversation moving without pushing them away.", portrait: true },
];

function TrainingPage() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  return (
    <TeamShell isAdmin={me.data?.role === "admin"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-medium">Training <span className="gradient-text">videos</span></h1>
        <p className="text-sm text-muted-foreground">Six parts, in order. Watch them before your first calls.</p>
      </div>

      <div className="mt-8 grid gap-8">
        {VIDEOS.map((v) => (
          <section key={v.part} className="scan-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-star/60 bg-star/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-star">{v.part}</span>
              <h2 className="font-display text-2xl font-medium">{v.title}</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{v.blurb}</p>
            <video
              src={v.src}
              controls
              playsInline
              preload="metadata"
              className={
                v.portrait
                  ? "mt-4 aspect-[9/16] mx-auto max-h-[70vh] w-full max-w-sm rounded-xl border border-border bg-black"
                  : "mt-4 aspect-video w-full rounded-xl border border-border bg-black"
              }
            />
          </section>
        ))}
      </div>
    </TeamShell>
  );
}
