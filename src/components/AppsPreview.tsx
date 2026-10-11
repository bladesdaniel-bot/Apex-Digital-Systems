import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { AdLoop } from "@/components/AdLoop";
import previewVideo from "@/assets/apex-apps-preview-v2.mp4.asset.json";
import previewWebm from "@/assets/apex-apps-preview-v2.webm.asset.json";
import previewPoster from "@/assets/apex-apps-preview-v2.jpg.asset.json";

export function AppsPreview() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAnimate(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  return (
    <section aria-labelledby="apps-preview-title" className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase text-electric">Apex Digital Systems / Apps</p>
            <h2 id="apps-preview-title" className="font-display text-[30px] font-medium leading-tight sm:text-[40px]">Custom apps. Built by Apex.</h2>
          </div>
          <Link to="/apps" className="inline-flex items-center gap-2 text-sm text-electric transition-colors hover:text-foreground">Explore our apps <ArrowUpRight className="size-4" /></Link>
        </div>
        <Link to="/apps" aria-label="View our apps — animated robotic-arm preview" className="group mx-auto block w-full max-w-xl overflow-hidden rounded-lg border border-border bg-background outline-none transition-colors hover:border-electric focus-visible:ring-2 focus-visible:ring-ring">
          {animate ? (
            <AdLoop mp4={previewVideo.url} webm={previewWebm.url} poster={previewPoster.url} className="block aspect-[4/5] w-full object-contain" />
          ) : (
            <img src={previewPoster.url} alt="" loading="lazy" className="block aspect-[4/5] w-full object-contain" />
          )}
        </Link>
      </div>
    </section>
  );
}