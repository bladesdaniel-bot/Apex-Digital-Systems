/** Christmas theme — separate from Halloween/Thanksgiving so themes can be swapped. */

function Ornament({ color, className, style }: { color: string; className: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 52" className={className} style={style}>
      <path d="M20 0v6" stroke="var(--xm-gold)" strokeWidth="1.5" />
      <rect x="14" y="6" width="12" height="7" rx="1.5" fill="var(--xm-gold)" />
      <circle cx="20" cy="32" r="18" fill={color} />
      <path d="M3 30q17 7 34 0v4q-17 7-34 0z" fill="var(--xm-gold)" />
      <ellipse cx="13" cy="24" rx="4" ry="6" fill="var(--xm-snow)" opacity=".35" />
    </svg>
  );
}

const BULBS = ["var(--xm-red)", "var(--xm-gold)", "var(--xm-green)", "var(--xm-blue)"];

function StringLights() {
  const n = 24;
  return (
    <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="absolute left-0 top-0 h-7 w-full sm:h-9">
      <path
        d={Array.from({ length: 8 }, (_, i) => `${i ? "" : "M0 4 "}Q${i * 150 + 75} 30 ${(i + 1) * 150} 4`).join(" ")}
        fill="none" stroke="var(--xm-wire)" strokeWidth="2"
      />
      {Array.from({ length: n }, (_, i) => {
        const x = i * 50 + 25;
        const t = (x % 150) / 150;
        const y = 4 + 26 * 2 * t * (1 - t) * 1 + 2;
        return (
          <ellipse key={i} cx={x} cy={y + 6} rx="5" ry="8" fill={BULBS[i % 4]} className="xm-twinkle" style={{ animationDelay: `${-((i * 0.37) % 2.4)}s` }} />
        );
      })}
    </svg>
  );
}

/** Site-wide decorations: snow, string lights, ornaments. */
export function ChristmasMode() {
  const flakes = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div aria-hidden className="xm-decor pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <StringLights />
      <Ornament color="var(--xm-red)" className="xm-swing absolute right-[22%] top-[16%] h-10 w-8 sm:left-[46%] sm:right-auto sm:top-[19%] sm:h-16 sm:w-12" />
      <Ornament color="var(--xm-green)" className="xm-swing absolute right-2 top-[30%] h-10 w-8 sm:right-6 sm:h-16 sm:w-12" style={{ animationDelay: "-2s" }} />
      {flakes.map((i) => (
        <span
          key={i}
          className={`xm-flake absolute -top-4 rounded-full ${i >= 22 ? "hidden sm:block" : ""}`}
          style={{
            left: `${(i * 37 + 5) % 98}%`,
            width: `${3 + (i % 4) * 2}px`,
            height: `${3 + (i % 4) * 2}px`,
            animationDelay: `${-i * 1.3}s`,
            animationDuration: `${9 + (i % 6) * 2.2}s`,
            ["--i" as string]: i,
          }}
        />
      ))}
    </div>
  );
}

function Reindeer({ x, lead }: { x: number; lead?: boolean }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="20" cy="30" rx="14" ry="7" fill="var(--xm-deer)" />
      <path d="M30 26l6-10 4 2-4 10z" fill="var(--xm-deer)" />
      <ellipse cx="40" cy="15" rx="6" ry="4.5" fill="var(--xm-deer)" />
      <path d="M37 11l-2-7M35 6l-3 1M40 11l1-7M41 6l3-1" stroke="var(--xm-antler)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="46" cy="15" r={lead ? 2.6 : 1.8} fill={lead ? "var(--xm-red)" : "var(--xm-ink)"} className={lead ? "xm-nose" : ""} />
      <path d="M10 35l-3 8M16 36l-1 8M26 36l3 7M30 34l5 6" stroke="var(--xm-deer)" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

function Sleigh() {
  return (
    <svg viewBox="0 0 220 60" className="size-full overflow-visible">
      <path d="M50 30L100 28M100 28L120 30" stroke="var(--xm-gold)" strokeWidth="1" />
      <Reindeer x={100} />
      <Reindeer x={160} lead />
      {/* Santa */}
      <circle cx="40" cy="16" r="7" fill="var(--xm-skin)" />
      <path d="M33 14q7-14 15-2z" fill="var(--xm-red)" />
      <circle cx="49" cy="11" r="2.2" fill="var(--xm-snow)" />
      <path d="M33 18q7 9 14 0q-2 8-7 8t-7-8z" fill="var(--xm-snow)" />
      <rect x="30" y="22" width="20" height="14" rx="5" fill="var(--xm-red)" />
      {/* Sleigh */}
      <path d="M8 26h52q6 0 4 10l-3 8H18q-10 0-10-18z" fill="var(--xm-red)" />
      <path d="M8 26h52" stroke="var(--xm-gold)" strokeWidth="2.5" />
      <path d="M6 50h56q8 0 10-6" fill="none" stroke="var(--xm-gold)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 44v6M50 44v6" stroke="var(--xm-gold)" strokeWidth="2" />
      <rect x="12" y="16" width="12" height="10" rx="1" fill="var(--xm-green)" />
      <path d="M18 16v10" stroke="var(--xm-gold)" strokeWidth="1.5" />
    </svg>
  );
}

function Snowman() {
  return (
    <svg viewBox="0 0 70 80" className="size-full overflow-visible">
      <g className="xm-sway" style={{ transformOrigin: "35px 78px" }}>
        {/* Inner arm (viewer's right), static */}
        <path d="M46 46l14-6M56 42l3-5" stroke="var(--xm-stick)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="35" cy="62" r="16" fill="var(--xm-snow)" />
        <circle cx="35" cy="38" r="12" fill="var(--xm-snow)" />
        <circle cx="35" cy="20" r="9" fill="var(--xm-snow)" />
        {/* Outside arm (viewer's left) — waves in front, raised above shoulder */}
        <g className="xm-wave" style={{ transformOrigin: "24px 42px" }}>
          <path d="M24 42L8 50M12 48l-4 4M12 48l-5-1" stroke="var(--xm-stick)" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="32" cy="18" r="1.4" fill="var(--xm-ink)" />
        <circle cx="38" cy="18" r="1.4" fill="var(--xm-ink)" />
        <path d="M35 21l8 2-8 1z" fill="var(--xm-carrot)" />
        <circle cx="35" cy="34" r="1.5" fill="var(--xm-ink)" />
        <circle cx="35" cy="40" r="1.5" fill="var(--xm-ink)" />
        <circle cx="35" cy="58" r="1.5" fill="var(--xm-ink)" />
        <path d="M25 27q10 5 20 0v4q-10 5-20 0z" fill="var(--xm-red)" />
        <path d="M40 30l3 10h-4l-2-9z" fill="var(--xm-red)" />
        <rect x="27" y="10" width="16" height="2.5" rx="1" fill="var(--xm-ink)" />
        <rect x="29" y="-2" width="12" height="13" fill="var(--xm-ink)" />
        <rect x="29" y="7" width="12" height="2.5" fill="var(--xm-red)" />
      </g>
    </svg>
  );
}

function TreeWithGifts() {
  const lights = [[40, 30, "#ef4444"], [52, 44, "#facc15"], [34, 50, "#3b82f6"], [60, 62, "#ef4444"], [28, 66, "#22c55e"], [46, 70, "#facc15"], [44, 56, "#ec4899"]] as const;
  return (
    <svg viewBox="0 0 90 100" className="size-full overflow-visible">
      <rect x="40" y="78" width="10" height="12" fill="#7c4a1e" />
      <path d="M45 8L62 36H54L70 58H60L80 80H10L30 58H20L36 36H28Z" fill="#15803d" stroke="#14532d" strokeWidth="1.5" />
      <path d="M30 40q15 8 30 0M22 62q23 10 46 0" stroke="#facc15" strokeWidth="1.5" fill="none" />
      {lights.map(([x, y, c], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill={c} className="xm-twinkle" style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
      <path d="M45 0l2.5 5 5.5.7-4 3.8 1 5.5-5-2.6-5 2.6 1-5.5-4-3.8 5.5-.7z" fill="#fde047" className="xm-twinkle" />
      {/* presents */}
      <rect x="4" y="82" width="20" height="16" fill="#dc2626" /><path d="M14 82v16M4 90h20" stroke="#facc15" strokeWidth="2" />
      <path d="M14 82q-6-6-6 0zM14 82q6-6 6 0z" fill="#facc15" />
      <rect x="26" y="88" width="14" height="10" fill="#2563eb" /><path d="M33 88v10" stroke="#fff" strokeWidth="2" />
      <rect x="52" y="86" width="16" height="12" fill="#a855f7" /><path d="M60 86v12M52 92h16" stroke="#22c55e" strokeWidth="2" />
      <rect x="70" y="80" width="16" height="18" fill="#16a34a" /><path d="M78 80v18M70 89h16" stroke="#ef4444" strokeWidth="2" />
      <path d="M78 80q-5-6-5 0zM78 80q5-6 5 0z" fill="#ef4444" />
    </svg>
  );
}

function Sponge() {
  return (
    <svg viewBox="0 0 60 80" className="size-full overflow-visible">
      <g className="xm-sway" style={{ transformOrigin: "30px 78px" }}>
        <path d="M22 66v12M38 66v12" stroke="#f5d742" strokeWidth="3" />
        <path d="M18 78h8M34 78h8" stroke="#111" strokeWidth="3" strokeLinecap="round" />
        <rect x="12" y="20" width="36" height="40" rx="3" fill="#f5d742" stroke="#b59a1c" strokeWidth="1.5" />
        <rect x="12" y="52" width="36" height="5" fill="#fff" />
        <rect x="12" y="57" width="36" height="9" fill="#8a5a2b" />
        <path d="M27 52l3 6 3-6z" fill="#d22" />
        <circle cx="18" cy="28" r="2" fill="#c9ad2a" /><circle cx="42" cy="44" r="2.5" fill="#c9ad2a" /><circle cx="40" cy="25" r="1.5" fill="#c9ad2a" />
        <circle cx="24" cy="34" r="6" fill="#fff" /><circle cx="36" cy="34" r="6" fill="#fff" />
        <circle cx="24" cy="34" r="2.6" fill="#3b82f6" /><circle cx="36" cy="34" r="2.6" fill="#3b82f6" />
        <circle cx="24" cy="34" r="1.2" fill="#111" /><circle cx="36" cy="34" r="1.2" fill="#111" />
        <path d="M21 43q9 7 18 0" stroke="#111" strokeWidth="1.5" fill="#fff" />
        <g className="xm-wave" style={{ transformOrigin: "12px 44px" }}>
          <path d="M12 44L2 32" stroke="#f5d742" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path d="M48 44l8 8" stroke="#f5d742" strokeWidth="3" strokeLinecap="round" />
        {/* Santa hat */}
        <path d="M14 21q14-22 30-6l-2 6z" fill="#d22" />
        <rect x="12" y="18" width="34" height="5" rx="2.5" fill="#fff" />
        <circle cx="46" cy="13" r="3.5" fill="#fff" />
      </g>
    </svg>
  );
}

function Star() {
  const bulbs = ["#ef4444", "#22c55e", "#3b82f6", "#facc15", "#ef4444", "#22c55e"];
  return (
    <svg viewBox="0 0 64 80" className="size-full overflow-visible">
      <g className="xm-sway" style={{ transformOrigin: "32px 78px", animationDelay: "-1s" }}>
        <path d="M32 6L40 34L62 44L42 52L44 78L32 62L20 78L22 52L2 44L24 34Z" fill="#f9a8c4" stroke="#d9789c" strokeWidth="1.5" />
        <path d="M21 52h22v10l-11 4-11-4z" fill="#86efac" />
        <circle cx="28" cy="32" r="3" fill="#fff" /><circle cx="36" cy="32" r="3" fill="#fff" />
        <circle cx="28" cy="32" r="1.3" fill="#111" /><circle cx="36" cy="32" r="1.3" fill="#111" />
        <path d="M27 40q5 4 10 0" stroke="#7f1d1d" strokeWidth="1.5" fill="none" />
        <path d="M6 44q14 6 26 0t26 0" stroke="#166534" strokeWidth="1" fill="none" />
        {bulbs.map((c, i) => (
          <circle key={i} cx={8 + i * 9.6} cy={46 + (i % 2) * 2} r="2" fill={c} className="xm-twinkle" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
        <path d="M32 -4l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z" fill="#fde047" className="xm-twinkle" />
      </g>
    </svg>
  );
}

function Crab() {
  return (
    <svg viewBox="0 0 80 64" className="size-full overflow-visible">
      <g className="xm-sway" style={{ transformOrigin: "40px 62px", animationDelay: "-2s" }}>
        <path d="M30 50l-6 12M36 52l-2 10M44 52l2 10M50 50l6 12" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="40" cy="40" rx="20" ry="16" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
        <path d="M34 14v14M46 14v14" stroke="#ef4444" strokeWidth="3" />
        <circle cx="34" cy="12" r="5" fill="#fff" /><circle cx="46" cy="12" r="5" fill="#fff" />
        <circle cx="34" cy="12" r="2" fill="#111" /><circle cx="46" cy="12" r="2" fill="#111" />
        <path d="M33 44q7 4 14 0" stroke="#7f1d1d" strokeWidth="1.5" fill="none" />
        {/* Scarf */}
        <path d="M22 34q18 6 36 0v5q-18 6-36 0z" fill="#16a34a" />
        <path d="M50 38l4 10h-5l-2-9z" fill="#16a34a" />
        <path d="M20 40L8 30" stroke="#ef4444" strokeWidth="3" />
        <path d="M2 24q6-10 12 0q-6 2-6 6z" fill="#ef4444" />
        <g className="xm-wave" style={{ transformOrigin: "60px 40px" }}>
          <path d="M60 40l10-10" stroke="#ef4444" strokeWidth="3" />
          {/* gift */}
          <rect x="64" y="16" width="14" height="12" fill="#facc15" />
          <path d="M71 16v12M64 22h14" stroke="#16a34a" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}

/** Hero-only extras: moon, icy portal, snowy horizon, snowman, sleigh. */
export function ChristmasHero() {
  return (
    <div aria-hidden className="xm-decor pointer-events-none absolute inset-0 z-[-1] overflow-hidden">
      <div className="xm-ground absolute inset-x-0 bottom-0 top-[58%] sm:top-[66%]">
        <div className="absolute right-[3%] top-2 h-16 w-14 -translate-y-full sm:right-[10%] sm:h-28 sm:w-24">
          <TreeWithGifts />
        </div>
        <div className="absolute right-[24%] top-1 h-10 w-9 -translate-y-full sm:right-[32%] sm:h-16 sm:w-14">
          <Snowman />
        </div>
        <div className="absolute left-[4%] top-1 flex -translate-y-full items-end gap-1 sm:left-[8%] sm:gap-3">
          <div className="h-11 w-9 sm:h-16 sm:w-14"><Sponge /></div>
          <div className="h-11 w-10 sm:h-16 sm:w-14"><Star /></div>
          <div className="h-9 w-11 sm:h-14 sm:w-16"><Crab /></div>
        </div>
      </div>
      <div className="xm-portal-glow absolute inset-0" />
      <div className="xm-moon absolute right-[4%] top-[7%] size-12 rounded-full sm:right-[8%] sm:top-[6%] sm:size-20" />
      <div className="xm-fly absolute left-0 top-[6%] h-10 w-36 sm:top-[3%] sm:h-14 sm:w-52">
        <div className="xm-bob size-full"><Sleigh /></div>
      </div>
    </div>
  );
}

export function ChristmasTag() {
  return (
    <div className="mb-3 inline-flex items-center gap-2 rounded-full xm-tag px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/90 backdrop-blur sm:text-xs">
      Merry Christmas <span aria-hidden>🎄</span>
    </div>
  );
}
