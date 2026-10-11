import appVideo from "@/assets/apex-app-demo.mp4.asset.json";
import appPoster from "@/assets/apex-app-demo-poster.jpg.asset.json";
import readerVideo from "@/assets/ai-reader-dictator.mp4.asset.json";
import readerWebm from "@/assets/ai-reader-dictator.webm.asset.json";
import readerPoster from "@/assets/ai-reader-dictator.jpg.asset.json";
import bmiVideo from "@/assets/bmi-calculator.mp4.asset.json";
import bmiWebm from "@/assets/bmi-calculator.webm.asset.json";
import bmiPoster from "@/assets/bmi-calculator.jpg.asset.json";

const apps = [
  { id: "full-demo", title: "App Demo", video: appVideo.url, poster: appPoster.url, webm: undefined },
  { id: "ai-reader-dictator", title: "AI Reader Dictator", video: readerVideo.url, webm: readerWebm.url, poster: readerPoster.url },
  { id: "bmi-calculator", title: "BMI Calculator", video: bmiVideo.url, webm: bmiWebm.url, poster: bmiPoster.url },
];

export function AppsShowcase() {
  return (
    <section id="apps" aria-labelledby="apps-title" className="border-t border-border/50">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <p className="mb-4 text-xs font-semibold uppercase text-electric">Apex Digital Systems / Apps</p>
        <h2 id="apps-title" className="font-display text-[30px] font-medium leading-tight sm:text-[40px]">Apps we build.</h2>
        <div className="mt-10 grid gap-10">
          {apps.map((app, index) => (
            <article key={app.id} className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="font-display text-xl font-medium">{app.title}</h3>
                <span className="font-technical text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")} / Demo</span>
              </div>
              <video
                controls
                playsInline
                preload="none"
                poster={app.poster}
                aria-label={`${app.title} video`}
                className="aspect-video w-full rounded-lg border border-border bg-background object-contain"
              >
                {app.webm && <source src={app.webm} type="video/webm" />}
                <source src={app.video} type="video/mp4" />
                <a href={app.video}>Watch the app demo</a>
              </video>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}