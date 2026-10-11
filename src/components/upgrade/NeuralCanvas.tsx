import { useEffect, useRef } from "react";

/** Fixed full-screen particle field; mouse draws glowing links to nearby dots. */
export function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const styles = getComputedStyle(document.documentElement);
    const cyan = styles.getPropertyValue("--aetheris-teal").trim() || "cyan";
    const violet = styles.getPropertyValue("--violet").trim() || "violet";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0;
    const mouse = { x: -9999, y: -9999 };
    let dots: { x: number; y: number; vx: number; vy: number; c: string; r: number }[] = [];

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(110, Math.round((w * h) / 16000));
      dots = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        c: i % 2 ? cyan : violet, r: Math.random() * 1.4 + 0.6,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        if (!reduced) {
          d.x += d.vx; d.y += d.vy;
          if (d.x < 0 || d.x > w) d.vx *= -1;
          if (d.y < 0 || d.y > h) d.vy *= -1;
        }
        const dist = Math.hypot(d.x - mouse.x, d.y - mouse.y);
        if (dist < 170) {
          ctx.globalAlpha = (1 - dist / 170) * 0.7;
          ctx.strokeStyle = d.c; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(d.x, d.y); ctx.stroke();
        }
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = d.c; ctx.shadowColor = d.c; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const move = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const leave = () => { mouse.x = -9999; mouse.y = -9999; };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(draw); };
    resize(); raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
