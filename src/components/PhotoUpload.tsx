import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { photoSizeError } from "@/lib/order-limits";

export type PhotoFile = { name: string; type: string; base64: string };

const toBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] ?? "");
  r.onerror = () => rej(new Error("Couldn't read that file."));
  r.readAsDataURL(f);
});

/** Picks one or more photos and uploads them one by one through the given server call. */
export function PhotoUpload({ upload, onDone, label = "Add photos" }: { upload: (f: PhotoFile) => Promise<void>; onDone?: () => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setMsg("");
    let ok = 0;
    for (const f of Array.from(files)) {
      try {
        const sizeError = photoSizeError(f.size);
        if (sizeError) throw new Error(`${f.name}: ${sizeError}`);
        await upload({ name: f.name, type: f.type, base64: await toBase64(f) });
        ok++;
      } catch (e) { setMsg(e instanceof Error ? e.message : "Upload failed."); }
    }
    setBusy(false);
    if (ok) { setMsg(m => m || `${ok} photo${ok > 1 ? "s" : ""} added.`); onDone?.(); }
    if (ref.current) ref.current.value = "";
  };
  return (
    <div className="grid gap-1">
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={e => pick(e.target.files)} aria-label={label} />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "Uploading…" : label}</Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
