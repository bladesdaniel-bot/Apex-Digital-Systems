import { useEffect, useState } from "react";

const scanLines = ["> resolving DNS records", "> crawling sitemap.xml", "> measuring LCP / CLS", "> mapping backlink nodes", "> checking local map pack", "> scoring meta tags", "> compiling report"];

export function ScanAnimation({ target }: { target: string }) {
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN(v => v + 1), 450); return () => clearInterval(t); }, []);
  return (
    <div className="scan-panel relative mx-auto mt-10 h-72 max-w-2xl overflow-hidden rounded-2xl p-6 text-left font-technical text-[12px]" role="status" aria-live="polite">
      <p className="text-aetheris-teal">TARGET LOCK: {target || "your business"}</p>
      <div className="mt-3 space-y-1 text-muted-foreground">{scanLines.slice(0, n).map(l => <p key={l} className="scan-line">{l}</p>)}</div>
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {[[20, 30, 55, 60], [55, 60, 80, 35], [80, 35, 70, 80], [55, 60, 70, 80]].map(([a, b, c, d], i) => (
          <line key={i} x1={`${a}%`} y1={`${b}%`} x2={`${c}%`} y2={`${d}%`} className="scan-link" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
        {[[20, 30], [55, 60], [80, 35], [70, 80]].map(([x, y], i) => <circle key={i} cx={`${x}%`} cy={`${y}%`} r="4" className="scan-node" style={{ animationDelay: `${i * 0.3}s` }} />)}
      </svg>
      <span className="scan-box" style={{ left: "52%", top: "18%" }} />
      <span className="scan-box" style={{ left: "64%", top: "58%", animationDelay: "1s" }} />
      <span className="scan-sweep" />
    </div>
  );
}
