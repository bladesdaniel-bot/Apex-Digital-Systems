import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSeasonalThemes } from "@/lib/haunted-mode.functions";
import { ThanksgivingMode } from "@/components/ThanksgivingMode";
import { ChristmasMode } from "@/components/ChristmasMode";
import { THEMES, type Theme } from "@/lib/seasonal-themes";

export const seasonalQuery = { queryKey: ["seasonal-themes"], queryFn: () => getSeasonalThemes(), staleTime: 60_000 };
export const hauntedQuery = seasonalQuery;

/** ?theme=christmas (etc.) previews a theme for this browser tab only. */
function usePreviewTheme(): Theme | null {
  const [t, setT] = useState<Theme | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("theme");
    if (q && (THEMES as readonly string[]).includes(q)) setT(q as Theme);
  }, []);
  return t;
}

export function useSeasonal() {
  const preview = usePreviewTheme();
  const active = useQuery(seasonalQuery).data?.active ?? null;
  return preview ?? active;
}
export function useHaunted() {
  return useSeasonal() === "halloween";
}

/** Applies whichever seasonal theme is active (manual switch or automatic schedule). */
export function HauntedMode() {
  const active = useSeasonal();
  const on = active === "halloween";
  useEffect(() => {
    const root = document.documentElement;
    if (on) root.setAttribute("data-haunted", "true");
    else root.removeAttribute("data-haunted");
    if (active && !on) root.setAttribute("data-season", active);
    else root.removeAttribute("data-season");
  }, [on, active]);
  if (active === "thanksgiving") return <ThanksgivingMode />;
  if (active === "christmas") return <ChristmasMode />;
  if (!on) return null;
  return (
    <>
      <div aria-hidden className="haunted-fog pointer-events-none fixed inset-0 z-30">
        <div className="haunted-fog-layer" />
        <div className="haunted-fog-layer haunted-fog-layer--slow" />
      </div>
      <HauntedDecor />
    </>
  );
}

function Falling({ items }: { items: string[] }) {
  return (
    <div aria-hidden className="season-decor pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {items.map((e, i) => (
        <span
          key={i}
          className="season-fall absolute -top-10 text-2xl sm:text-3xl"
          style={{ left: `${(i * 97) % 100}%`, animationDelay: `${-i * 2.3}s`, animationDuration: `${14 + (i % 4) * 3}s` }}
        >
          {e}
        </span>
      ))}
    </div>
  );
}

function Web({ className }: { className: string }) {
  const rays = [0, 15, 30, 45, 60, 75, 90];
  return (
    <svg viewBox="0 0 160 160" className={className} fill="none" stroke="currentColor" strokeWidth="1">
      {rays.map((a) => {
        const r = (a * Math.PI) / 180;
        return <line key={a} x1="0" y1="0" x2={160 * Math.cos(r)} y2={160 * Math.sin(r)} />;
      })}
      {[30, 55, 82, 110, 140].map((d) => (
        <path
          key={d}
          d={rays
            .map((a, i) => {
              const r = (a * Math.PI) / 180;
              return `${i ? "Q" + (d * 0.82 * Math.cos(r - 0.13)).toFixed(1) + " " + (d * 0.82 * Math.sin(r - 0.13)).toFixed(1) + " " : "M"}${(d * Math.cos(r)).toFixed(1)} ${(d * Math.sin(r)).toFixed(1)}`;
            })
            .join(" ")}
        />
      ))}
    </svg>
  );
}

function Bat({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 28" className={className} style={style} fill="currentColor">
      <path d="M32 9c-2-4-3-5-3-5l-1 4c-5-5-13-7-28-4 6 3 9 7 9 12 4-3 8-3 11 1 2-3 5-4 9-2 1 3 2 5 3 6 1-1 2-3 3-6 4-2 7-1 9 2 3-4 7-4 11-1 0-5 3-9 9-12-15-3-23-1-28 4l-1-4s-1 1-3 5z" />
    </svg>
  );
}

function Pumpkin({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 60" className={className}>
      <path d="M30 4c2-3 6-3 7 0l-2 8h-5z" className="fill-primary" />
      <ellipse cx="32" cy="36" rx="30" ry="22" className="fill-violet-soft" />
      <ellipse cx="32" cy="36" rx="12" ry="22" className="fill-violet-soft" stroke="currentColor" strokeOpacity=".25" />
      <g className="haunted-flicker fill-electric">
        <path d="M14 30l8-6 4 8z" />
        <path d="M50 30l-8-6-4 8z" />
        <path d="M14 42q18 12 36 0l-5 2-3-3-4 4-4-4-4 4-4-4-3 3z" />
      </g>
    </svg>
  );
}

function HauntedDecor() {
  return (
    <div aria-hidden className="haunted-decor pointer-events-none fixed inset-0 z-40 overflow-hidden text-foreground">
      <Web className="absolute left-0 top-0 h-32 w-32 opacity-40 sm:h-44 sm:w-44" />
      <Web className="absolute right-0 top-0 h-32 w-32 -scale-x-100 opacity-40 sm:h-44 sm:w-44" />
      <div className="haunted-spider absolute right-16 top-0 flex flex-col items-center sm:right-28">
        <div className="h-24 w-px bg-foreground/40" />
        <svg viewBox="0 0 30 24" className="h-6 w-7 fill-background stroke-foreground/70" strokeWidth="1.2">
          <path d="M3 4l7 6M27 4l-7 6M1 12h9M29 12h-9M3 21l7-6M27 21l-7-6" fill="none" />
          <ellipse cx="15" cy="13" rx="6" ry="7" />
          <circle cx="13" cy="11" r="1" className="fill-violet" stroke="none" />
          <circle cx="17" cy="11" r="1" className="fill-violet" stroke="none" />
        </svg>
      </div>
      <Bat className="haunted-bat absolute top-[18%] h-6 w-14 text-background" />
      <Bat className="haunted-bat absolute top-[38%] h-4 w-10 text-background" style={{ animationDelay: "-7s", animationDuration: "19s" }} />
      <Bat className="haunted-bat absolute top-[62%] h-5 w-12 text-background" style={{ animationDelay: "-13s", animationDuration: "23s" }} />
      <div className="haunted-eyes absolute left-[6%] top-[45%] flex gap-2">
        <span className="h-2 w-3 rounded-full bg-violet" /><span className="h-2 w-3 rounded-full bg-violet" />
      </div>
      <div className="haunted-eyes absolute right-[8%] top-[72%] flex gap-2" style={{ animationDelay: "-3s" }}>
        <span className="h-2 w-3 rounded-full bg-electric" /><span className="h-2 w-3 rounded-full bg-electric" />
      </div>
      <Pumpkin className="haunted-glow absolute left-2 top-28 h-14 w-16 sm:left-6 sm:top-36 sm:h-20 sm:w-24" />
      <Pumpkin className="haunted-glow absolute right-2 top-[40%] h-12 w-14 sm:right-6 sm:h-16 sm:w-20" />
    </div>
  );
}
