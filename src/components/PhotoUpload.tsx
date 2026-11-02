import { useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { photoSizeError } from "@/lib/order-limits";

export type PhotoFile = { name: string; type: string; base64: string };

const toBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] ?? "");
  r.onerror = () => rej(new Error("Couldn't read that file."));
  r.readAsDataURL(f);
});

/** Picks photos (and PDFs when allowPdf) by button or drag-and-drop, uploading them one by one. */
export function PhotoUpload({ upload, onDone, label = "Add photos", allowPdf = false }: { upload: (f: PhotoFile) => Promise<void>; onDone?: () => void; label?: string; allowPdf?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [over, setOver] = useState(false);
  const okType = (t: string) => t.startsWith("image/") || (allowPdf && t === "application/pdf");
  const pick = async (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []).filter(f => okType(f.type));
    if (!files.length) { if (list && Array.from(list).length) setMsg(allowPdf ? "Only photos or PDFs can be added." : "Only photos can be added."); return; }
    setBusy(true); setMsg("");
    let ok = 0;
    for (const f of files) {
      try {
        const sizeError = photoSizeError(f.size);
        if (sizeError) throw new Error(`${f.name}: ${sizeError}`);
        const name = f.name && f.name !== "image.png" ? f.name : `pasted-${Date.now()}.${f.type.split("/")[1] || "png"}`;
        await upload({ name, type: f.type, base64: await toBase64(f) });
        ok++;
      } catch (e) { setMsg(e instanceof Error ? e.message : "Upload failed."); }
    }
    setBusy(false);
    if (ok) { setMsg(m => m || `${ok} file${ok > 1 ? "s" : ""} added.`); onDone?.(); }
    if (ref.current) ref.current.value = "";
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); };

  if (!allowPdf) {
    return (
      <div className="grid gap-1">
        <input ref={ref} type="file" accept="image/*" multiple hidden onChange={e => pick(e.target.files)} aria-label={label} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "Uploading…" : label}</Button>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </div>
    );
  }
  return (
    <div className="grid gap-1">
      <input ref={ref} type="file" accept="image/*,application/pdf" multiple hidden onChange={e => pick(e.target.files)} aria-label={label} />
      <div
        tabIndex={0}
        role="button"
        aria-label={`${label}: drop or tap to choose`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onKeyDown={e => { if (e.key === "Enter") ref.current?.click(); }}
        className={`grid gap-2 rounded-lg border border-dashed p-3 text-center text-xs outline-none focus:border-primary ${over ? "border-primary bg-primary/10" : "border-border"}`}
      >
        <p className="text-muted-foreground">{busy ? "Uploading…" : "Tap here to choose a photo or PDF — or drop one on this box"}</p>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>{label}</Button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

/** True when a stored order file is a PDF (shown as a document tile instead of an image). */
export const isPdfFile = (name?: string | null, url?: string | null) => /\.pdf($|\?)/i.test(name ?? "") || /\.pdf(\?|$)/i.test(url ?? "");
