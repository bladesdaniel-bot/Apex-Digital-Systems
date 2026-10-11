import { useEffect, useRef, useState } from "react";
import { Copy, Check, Play, Pause, Square } from "lucide-react";

/** Floating toolbar: highlight any text to copy it and have it read aloud. Browser-only. */
export function HighlightReader() {
  const [text, setText] = useState("");
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const sel = window.getSelection();
      const t = sel?.toString().trim() ?? "";
      if (!sel || !t || sel.rangeCount === 0) {
        if (window.speechSynthesis?.speaking) return; // keep controls while reading
        setText(""); setPos(null); return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setText(t);
      setCopied(false);
      // On touch devices the OS shows its own Copy/Translate menu above the
      // selection, so place our toolbar below it; on desktop, above.
      const touch = window.matchMedia?.("(pointer: coarse)").matches;
      const y = touch ? Math.min(r.bottom + 12, window.innerHeight - 60) : Math.max(r.top - 52, 8);
      setPos({ x: Math.min(Math.max(r.left + r.width / 2, 90), window.innerWidth - 90), y });
      navigator.clipboard?.writeText(t).then(() => setCopied(true)).catch(() => {});
    };
    const onUp = (e: Event) => { if (box.current?.contains(e.target as Node)) return; setTimeout(update, 10); };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    document.addEventListener("selectionchange", () => {
      const t = window.getSelection()?.toString().trim();
      if (!t && !window.speechSynthesis?.speaking) { setText(""); setPos(null); return; }
      if (t && window.matchMedia?.("(pointer: coarse)").matches) setTimeout(update, 10); // iOS only fires selectionchange, not touchend
    });
    const hide = () => { if (!window.speechSynthesis?.speaking) setPos(null); };
    window.addEventListener("scroll", hide, { passive: true });
    return () => { document.removeEventListener("mouseup", onUp); document.removeEventListener("touchend", onUp); window.removeEventListener("scroll", hide); };
  }, []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (!pos || !text) return null;

  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } };
  const play = () => {
    const s = window.speechSynthesis;
    if (!s) return;
    if (state === "paused") { s.resume(); setState("playing"); return; }
    if (state === "playing") { s.pause(); setState("paused"); return; }
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = s.getVoices().find(v => v.lang.startsWith("en") && /natural|samantha|google/i.test(v.name));
    if (v) u.voice = v;
    u.onend = u.onerror = () => setState("idle");
    s.speak(u); setState("playing");
  };
  const stop = () => { window.speechSynthesis?.cancel(); setState("idle"); };

  const btn = "flex size-9 items-center justify-center rounded-full text-foreground transition hover:bg-primary/20 hover:text-primary";
  return (
    <div ref={box} role="toolbar" aria-label="Highlighted text tools" style={{ left: pos.x, top: pos.y }}
      className="fixed z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-background/90 p-1 shadow-lg backdrop-blur"
      onMouseDown={e => e.preventDefault()}>
      <button type="button" className={btn} onClick={copy} aria-label={copied ? "Copied" : "Copy"} title={copied ? "Copied!" : "Copy"}>
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </button>
      <button type="button" className={btn} onClick={play} aria-label={state === "playing" ? "Pause reading" : "Read aloud"} title={state === "playing" ? "Pause" : "Read aloud"}>
        {state === "playing" ? <Pause className="size-4 text-primary" /> : <Play className="size-4" />}
      </button>
      {state !== "idle" && <button type="button" className={btn} onClick={stop} aria-label="Stop reading" title="Stop"><Square className="size-4" /></button>}
    </div>
  );
}
