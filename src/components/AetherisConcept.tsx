import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Cpu, ShieldCheck, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import networkImage from "@/assets/aetheris-network.jpg";
import vaultImage from "@/assets/aetheris-vault.jpg";
import swarmImage from "@/assets/aetheris-swarm.jpg";

export const aetherisAssets = [
  { name: "Neural Mapping API", subtitle: "Enterprise-grade endpoints", image: networkImage, alt: "Luminous interconnected quantum neural processor", icon: Cpu, number: "01" },
  { name: "Quantum Data Vault", subtitle: "Zero-knowledge encryption", image: vaultImage, alt: "Teal-lit quantum servers in a futuristic secure vault", icon: ShieldCheck, number: "02" },
  { name: "Swarm Logic Engine", subtitle: "Multi-agent orchestration", image: swarmImage, alt: "Interconnected crystal processors with flowing neural pathways", icon: Network, number: "03" },
];

export function AetherisConcept() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting && entry.target instanceof HTMLElement) {
        entry.target.dataset['reveal'] = "visible";
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    for (const card of grid.children) if (card instanceof HTMLElement) {
      card.dataset['reveal'] = "waiting";
      observer.observe(card);
    }
    return () => observer.disconnect();
  }, []);

  return <section id="aetheris" className="aetheris-section border-t border-aetheris-teal/20">
    <div className="mx-auto max-w-7xl px-6 pb-12 pt-20 lg:px-10">
      <p className="mb-4 font-technical text-xs text-aetheris-teal">Featured Portfolio Concept / 02</p>
      <h2 className="font-cinematic text-3xl font-extralight leading-tight sm:text-5xl">Featured Concept: <span className="text-aetheris-teal">Aetheris Neural Systems</span></h2>
      <p className="mt-5 text-sm text-muted-foreground">Fictional portfolio example only — not a live platform or service offering. Not for sale.</p>
    </div>
    <div className="aetheris-promo flex items-center justify-center px-6 py-20 text-center">
      <img src={networkImage} width={1600} height={800} loading="lazy" alt="Glowing quantum network in deep black space" className="absolute inset-0 -z-20 size-full object-cover" />
      <div>
        <p className="mb-6 font-technical text-xs text-aetheris-teal">AETHERIS / INTELLIGENCE INFRASTRUCTURE</p>
        <h3 className="font-cinematic text-[40px] font-extralight leading-tight sm:text-6xl lg:text-7xl">Synthetic Intelligence.<br /><span className="text-aetheris-teal">Unbound.</span></h3>
      </div>
    </div>
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-12 lg:px-10">
      <div ref={gridRef} className="grid gap-6 md:grid-cols-3">
        {aetherisAssets.map(({ name, subtitle, image, alt, icon: Icon, number }) => <div key={name} className="aetheris-reveal min-w-0">
          <article className="aetheris-card group flex h-full flex-col overflow-hidden rounded-lg">
            <div className="relative overflow-hidden">
              <img src={image} alt={alt} width={1200} height={800} loading="lazy" className="aspect-[3/2] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute left-4 top-4 border border-aetheris-teal/40 bg-aetheris-space/70 px-2 py-1 font-technical text-[10px] text-aetheris-teal backdrop-blur-md">ASSET / {number}</span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <Icon className="mb-4 size-5 text-aetheris-teal" />
              <h3 className="font-cinematic text-xl font-medium">{name}</h3>
              <p className="mt-2 font-technical text-xs leading-6 text-muted-foreground">{subtitle}</p>
              <p className="mb-6 mt-5 text-xs text-muted-foreground">Fictional design study · Not for sale</p>
              <Button variant="technical" className="mt-auto w-fit gap-3 px-0 font-technical text-xs" onClick={() => setSelected(name)}>View Concept Details <ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Button>
            </div>
          </article>
        </div>)}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">These concepts are separate from Apex Digital Systems’ services and sales.</p>
    </div>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{selected}</DialogTitle><DialogDescription>This fictional portfolio design is not for sale and is not part of Apex Digital Systems’ service offerings. No live product, API, or technical documentation is available.</DialogDescription></DialogHeader></DialogContent>
    </Dialog>
  </section>;
}