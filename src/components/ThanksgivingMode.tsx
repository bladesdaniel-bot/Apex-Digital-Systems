/** Thanksgiving theme — separate from the Halloween theme so the two can be swapped. */

const LEAF_COLORS = ["var(--tg-amber)", "var(--tg-rust)", "var(--tg-gold)", "var(--tg-red)"];

function MapleLeaf({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" className="size-full" fill={color}>
      <path d="M20 2l3 8 6-3-2 8 8-1-5 6 6 4-9 1 1 7-8-5v11h-1V28l-8 5 1-7-9-1 6-4-5-6 8 1-2-8 6 3z" />
    </svg>
  );
}
function OakLeaf({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" className="size-full" fill={color}>
      <path d="M20 2c3 2 2 5 5 6s5 0 5 3-3 4-1 6 5 1 4 4-4 3-3 5 3 4 0 5-5-1-7 1-2 5-3 7c-1-2-1-5-3-7s-5 0-7-1 0-3 1-5-4-2-4-5 3-2 4-4-2-3-1-6 4-2 5-3 2-4 5-6z" />
      <path d="M20 8v31" stroke="var(--background)" strokeOpacity=".35" />
    </svg>
  );
}

function Bundle({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className}>
      <g stroke="var(--tg-gold)" strokeWidth="2" strokeLinecap="round">
        {[20, 32, 44, 56].map((a) => {
          const r = (a * Math.PI) / 180;
          return <line key={a} x1="6" y1="6" x2={6 + 100 * Math.cos(r)} y2={6 + 100 * Math.sin(r)} />;
        })}
      </g>
      {[20, 32, 44, 56].map((a) => {
        const r = (a * Math.PI) / 180;
        return <ellipse key={a} cx={6 + 92 * Math.cos(r)} cy={6 + 92 * Math.sin(r)} rx="4" ry="9" fill="var(--tg-gold)" transform={`rotate(${a - 90} ${6 + 92 * Math.cos(r)} ${6 + 92 * Math.sin(r)})`} />;
      })}
      <ellipse cx="62" cy="30" rx="8" ry="22" fill="var(--tg-amber)" transform="rotate(-60 62 30)" />
      <ellipse cx="30" cy="62" rx="8" ry="22" fill="var(--tg-rust)" transform="rotate(-30 30 62)" />
      <circle cx="8" cy="8" r="9" fill="var(--tg-red)" />
      <g transform="translate(50 52) scale(.5)"><MapleLeafPath color="var(--tg-red)" /></g>
      <g transform="translate(70 12) scale(.45)"><MapleLeafPath color="var(--tg-amber)" /></g>
    </svg>
  );
}
function MapleLeafPath({ color }: { color: string }) {
  return <path fill={color} d="M20 2l3 8 6-3-2 8 8-1-5 6 6 4-9 1 1 7-8-5v11h-1V28l-8 5 1-7-9-1 6-4-5-6 8 1-2-8 6 3z" />;
}

function PieSlice({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 70 50" className={className} style={style}>
      <path d="M4 40L62 14l4 10L8 48z" fill="var(--tg-crust)" />
      <path d="M4 38L60 12l2 6L6 44z" fill="var(--tg-amber)" />
      <path d="M58 6c4-2 9 0 9 5s-4 7-8 6l-1-11z" fill="var(--tg-crust)" />
      <g fill="var(--foreground)">
        <circle cx="30" cy="22" r="6" /><circle cx="36" cy="17" r="5" /><circle cx="33" cy="12" r="3.5" />
      </g>
    </svg>
  );
}

/** Site-wide decorations: leaves, corner bundles, floating pies. */
export function ThanksgivingMode() {
  const leaves = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div aria-hidden className="tg-decor pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <Bundle className="absolute left-0 top-[88px] h-16 w-16 sm:h-28 sm:w-28" />
      <Bundle className="absolute right-0 top-[88px] h-16 w-16 -scale-x-100 sm:h-28 sm:w-28" />
      <PieSlice className="tg-bob absolute right-[22%] top-[16%] h-9 w-12 sm:left-[46%] sm:right-auto sm:top-[19%] sm:h-14 sm:w-20" />
      <PieSlice className="tg-bob absolute right-2 top-[30%] h-8 w-11 sm:right-6 sm:h-14 sm:w-20" style={{ animationDelay: "-2s" }} />
      {leaves.map((i) => (
        <span
          key={i}
          className={`tg-leaf absolute -top-12 ${i >= 7 ? "hidden sm:block" : ""} ${i % 4 === 0 ? "tg-leaf-glow" : ""}`}
          style={{
            left: `${(i * 53 + 7) % 96}%`,
            width: `${18 + (i % 3) * 8}px`,
            height: `${18 + (i % 3) * 8}px`,
            animationDelay: `${-i * 1.9}s`,
            animationDuration: `${13 + (i % 5) * 2.5}s`,
            ["--i" as string]: i,
          }}
        >
          <span className="tg-sway block size-full" style={{ animationDelay: `${-i * 0.7}s` }}>
            {i % 2 ? <OakLeaf color={LEAF_COLORS[i % 4]!} /> : <MapleLeaf color={LEAF_COLORS[i % 4]!} />}
          </span>
        </span>
      ))}
    </div>
  );
}

function Turkey() {
  return (
    <svg viewBox="0 0 80 70" className="size-full">
      <g className="tg-tail" style={{ transformOrigin: "40px 42px" }}>
        {["var(--tg-red)", "var(--tg-amber)", "var(--tg-gold)", "var(--tg-rust)", "var(--tg-red)"].map((c, i) => (
          <ellipse key={i} cx="40" cy="20" rx="7" ry="20" fill={c} transform={`rotate(${-60 + i * 30} 40 42)`} />
        ))}
      </g>
      <ellipse cx="40" cy="44" rx="16" ry="15" fill="var(--tg-brown)" />
      <path className="tg-wing" style={{ transformOrigin: "34px 42px" }} d="M34 40c-8 2-12 8-10 14 6-1 10-5 10-14z" fill="var(--tg-crust)" />
      <circle cx="52" cy="30" r="8" fill="var(--tg-brown)" />
      <circle cx="55" cy="28" r="1.6" fill="var(--foreground)" />
      <path d="M59 30l6 2-6 2z" fill="var(--tg-gold)" />
      <path d="M57 33c2 3 1 7-1 8-1-3-1-5 1-8z" fill="var(--tg-red)" />
      <g stroke="var(--tg-gold)" strokeWidth="2.4" strokeLinecap="round" className="tg-legs">
        <line x1="36" y1="58" x2="35" y2="67" /><line x1="45" y1="58" x2="46" y2="67" />
      </g>
    </svg>
  );
}

function Pilgrims() {
  return (
    <svg viewBox="0 0 90 80" className="size-full overflow-visible">
      {/* Man (left) — outside hand is his left (viewer's left) */}
      <g className="tg-sway-slow" style={{ transformOrigin: "25px 78px" }}>
        <rect x="14" y="40" width="22" height="36" rx="5" fill="var(--tg-ink)" />
        <path d="M17 40h16l-8 9z" fill="var(--foreground)" />
        <g className="tg-wave-left" style={{ transformOrigin: "15px 44px" }}>
          <rect x="11" y="43" width="6" height="20" rx="3" fill="var(--tg-ink)" />
          <circle cx="14" cy="64" r="3.2" fill="var(--tg-skin)" />
        </g>
        <rect x="33" y="44" width="5" height="18" rx="2.5" fill="var(--tg-ink)" />
        <circle cx="25" cy="31" r="9" fill="var(--tg-skin)" />
        <rect x="17" y="8" width="16" height="17" fill="var(--tg-ink)" />
        <rect x="12" y="23" width="26" height="4" rx="2" fill="var(--tg-ink)" />
        <rect x="17" y="19" width="16" height="3" fill="var(--tg-gold)" opacity=".3" />
        <rect x="22" y="17" width="6" height="6" fill="none" stroke="var(--tg-gold)" strokeWidth="1.6" />
      </g>
      {/* Woman (right) — outside hand is her right (viewer's right) */}
      <g className="tg-sway-slow" style={{ transformOrigin: "65px 78px", animationDelay: "-1.5s" }}>
        <path d="M52 42h26l6 34H46z" fill="var(--tg-dress)" />
        <path d="M55 42h20l-10 9z" fill="var(--foreground)" />
        <rect x="52" y="44" width="5" height="18" rx="2.5" fill="var(--tg-dress)" />
        <g className="tg-wave-right" style={{ transformOrigin: "75px 46px" }}>
          <rect x="73" y="45" width="6" height="20" rx="3" fill="var(--tg-dress)" />
          <circle cx="76" cy="66" r="3.2" fill="var(--tg-skin)" />
        </g>
        <circle cx="65" cy="33" r="9" fill="var(--tg-skin)" />
        <path d="M54 34c0-10 5-14 11-14s11 4 11 14c-3-6-7-8-11-8s-8 2-11 8z" fill="var(--foreground)" />
      </g>
    </svg>
  );
}

/** Hero-only extras: holiday tag, harvest moon, pilgrims, waddling turkey. */
export function ThanksgivingHero() {
  return (
    <div aria-hidden className="tg-decor pointer-events-none absolute inset-0 z-[-1] overflow-hidden">
      <div className="tg-moon absolute right-[6%] top-[38%] size-40 rounded-full sm:right-[22%] sm:top-[30%] sm:size-64" />
      <div className="tg-portal-glow absolute inset-0" />
      <div className="absolute bottom-[9%] right-[4%] h-14 w-16 sm:bottom-[22%] sm:right-[36%] sm:h-20 sm:w-24">
        <Pilgrims />
      </div>
      <div className="tg-walk absolute bottom-2 left-0 h-14 w-16 sm:h-16 sm:w-20">
        <div className="tg-waddle size-full"><Turkey /></div>
      </div>
    </div>
  );
}

export function ThanksgivingTag() {
  return (
    <div className="mb-3 inline-flex items-center gap-2 rounded-full tg-tag px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/90 backdrop-blur sm:text-xs">
      Happy Thanksgiving <span aria-hidden>🦃</span>
    </div>
  );
}
