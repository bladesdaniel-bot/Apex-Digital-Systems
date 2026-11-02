import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listCallList } from "@/lib/call-list.functions";
import { approachingCallbacks } from "@/lib/callback-alerts";
import { ptTime } from "@/lib/visit-format";

function chime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.type = "sine";
      const t = ctx.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.55);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch { /* audio unavailable */ }
}

export function CallbackAlert() {
  const list = useServerFn(listCallList);
  const [userId, setUserId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hidden, setHidden] = useState<string[]>([]);
  const chimed = useRef(new Set<string>());
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const q = useQuery({ queryKey: ["call-list"], queryFn: () => list(), enabled: !!userId, refetchInterval: 60_000 });
  const rows = approachingCallbacks(((q.data as any)?.rows ?? []) as any[], userId, now).filter(r => !hidden.includes(r.id));

  useEffect(() => {
    for (const r of rows) {
      const key = `${r.id}:${r.callback_at}:${new Date(r.callback_at).getTime() <= now ? "due" : "soon"}`;
      if (!chimed.current.has(key)) { chimed.current.add(key); chime(); }
    }
  }, [rows, now]);

  if (!rows.length) return null;
  return (
    <div className="sticky top-2 z-50 mb-6 space-y-2" role="alert">
      {rows.map(r => {
        const mins = Math.round((new Date(r.callback_at).getTime() - now) / 60_000);
        return (
          <div key={r.id} className="animate-wave flex flex-wrap items-center gap-3 rounded-xl border border-star/70 bg-star/15 p-3 text-sm shadow-[0_0_22px_-4px_var(--star)] backdrop-blur">
            <span aria-hidden className="inline-block origin-[70%_70%] animate-hand text-xl">👋</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{mins > 0 ? `Call-back in ${mins} min` : "Call-back due now"}: {r.business_name}</p>
              <p className="text-xs text-muted-foreground">{ptTime(r.callback_at)} PT · <a href={`tel:${r.phone}`} className="text-aetheris-teal">{r.phone}</a>{r.callback_reason ? ` · ${r.callback_reason}` : ""}</p>
            </div>
            <Link to="/team/calls" className="rounded-full bg-star px-3 py-1 text-xs font-semibold text-background">Open</Link>
            <button onClick={() => setHidden(h => [...h, r.id])} className="text-xs text-muted-foreground hover:text-foreground" aria-label="Dismiss alert">✕</button>
          </div>
        );
      })}
    </div>
  );
}
