import { useState } from "react";

export const CONVERSION_RATE = 0.045;
export const projectedLeads = (visitors: number) => Math.round(visitors * CONVERSION_RATE);

function Odometer({ value }: { value: number }) {
  const digits = String(value).padStart(4, "0").split("");
  return (
    <div className="flex gap-1" aria-label={`${value} projected leads`}>
      {digits.map((d, i) => (
        <span key={i} className="odometer-digit relative h-14 w-10 overflow-hidden rounded-md font-technical text-3xl">
          <span className="absolute inset-x-0 top-0 flex flex-col items-center transition-transform duration-300 ease-out" style={{ transform: `translateY(-${Number(d) * 3.5}rem)` }}>
            {Array.from({ length: 10 }, (_, n) => <span key={n} className="flex h-14 items-center">{n}</span>)}
          </span>
        </span>
      ))}
    </div>
  );
}

export function RevenueEngine() {
  const [visitors, setVisitors] = useState(2000);
  return (
    <section id="trajectory" className="border-t border-border/50">
      <div className="mx-auto max-w-5xl px-6 py-20 lg:px-10">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Revenue Engine</p>
        <h2 className="font-display text-[30px] font-medium leading-[1.15] sm:text-[40px]">Calculate your <span className="gradient-text">trajectory.</span></h2>
        <div className="revenue-card mt-10 grid items-center gap-10 rounded-2xl p-8 sm:p-10 md:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="font-technical text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Current Monthly Website Visitors</span>
            <span className="mt-2 block font-display text-4xl font-semibold">{visitors.toLocaleString()}</span>
            <input type="range" min={100} max={50000} step={100} value={visitors} onChange={e => setVisitors(Number(e.target.value))} className="neon-range mt-6 w-full" />
          </label>
          <div>
            <p className="mb-3 font-technical text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Projected Inbound Leads / mo</p>
            <Odometer value={projectedLeads(visitors)} />
          </div>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">Illustrative estimate at a 4.5% conversion rate — not a guarantee of results.</p>
      </div>
    </section>
  );
}
