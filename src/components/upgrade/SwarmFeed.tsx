import { useEffect, useState } from "react";

const tasks = [
  "Agent_04: Scraping local SEO metrics...",
  "Node_Alpha: Deploying automated CRM integration...",
  "Agent_11: Auditing Core Web Vitals...",
  "Node_Sigma: Indexing Google Business Profile signals...",
  "Agent_07: Generating conversion heatmap...",
  "Node_Delta: Compressing image payloads...",
];

/** Simulated activity ticker (decorative). */
export function SwarmFeed() {
  const [i, setI] = useState(0);
  const [len, setLen] = useState(0);
  const text = tasks[i % tasks.length] ?? "";

  useEffect(() => {
    const t = len < text.length
      ? setTimeout(() => setLen(l => l + 1), 35)
      : setTimeout(() => { setI(n => n + 1); setLen(0); }, 2200);
    return () => clearTimeout(t);
  }, [len, text]);

  return (
    <div className="swarm-hud fixed bottom-5 left-5 z-40 hidden max-w-[300px] rounded-xl px-4 py-3 font-technical text-[11px] sm:block" aria-hidden="true">
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-success">
        <span className="size-2 animate-pulse rounded-full bg-success shadow-[0_0_8px_var(--success)]" /> Online · Swarm activity (simulated)
      </div>
      <p className="truncate text-aetheris-teal">{text.slice(0, len)}<span className="animate-pulse">▍</span></p>
    </div>
  );
}
