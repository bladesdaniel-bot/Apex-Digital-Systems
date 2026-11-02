import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Download, Lock, ShieldCheck, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCyberToolCheckout, getCyberToolDownload } from "@/lib/cyber-tool.functions";

export function CyberToolCard({ sessionId }: { sessionId?: string | undefined }) {
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setChecking(true);
    getCyberToolDownload({ data: { sessionId, environment: getStripeEnvironment() } })
      .then((r) => ("url" in r ? setDownloadUrl(r.url) : setError(r.error)))
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't confirm your purchase."))
      .finally(() => setChecking(false));
  }, [sessionId]);

  const options = useMemo(() => ({
    fetchClientSecret: async () => {
      const r = await createCyberToolCheckout({
        data: {
          returnUrl: `${window.location.origin}/apps?tool_session={CHECKOUT_SESSION_ID}#cybersecurity-tool`,
          environment: getStripeEnvironment(),
          ...(appliedPromo && { promo: appliedPromo }),
        },
      });
      if ("error" in r) { setError(r.error); setOpen(false); throw new Error(r.error); }
      return r.clientSecret;
    },
  }), [appliedPromo]);

  const start = (withPromo: boolean) => {
    setError("");
    if (withPromo && !promo.trim()) { setError("Enter a promo code first."); return; }
    try { getStripeEnvironment(); } catch (e) { setError(e instanceof Error ? e.message : "Payments unavailable."); return; }
    setAppliedPromo(withPromo ? promo.trim() : undefined);
    setOpen(true);
  };

  return (
    <article id="cybersecurity-tool" className="glass-card rounded-2xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-technical text-xs uppercase text-electric">Desktop app · Windows 10 / 11 (64-bit)</p>
          <h3 className="mt-2 font-display text-2xl font-medium">CyberSecurity Tool</h3>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
            Block suspicious IP addresses, locate where an IP comes from, and watch your defenses with animated shield visuals.
          </p>
        </div>
        <p className="font-display text-3xl font-medium">$29.99</p>
      </div>

      {downloadUrl ? (
        <div className="mt-6 space-y-3">
          <p className="flex items-center gap-2 text-sm text-success"><ShieldCheck className="size-4" /> Purchase confirmed — your download is unlocked.</p>
          <Button asChild size="lg"><a href={downloadUrl} download="CyberSecurity_Tool_App.zip"><Download className="size-4" /> Download CyberSecurity Tool (44 MB)</a></Button>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Open the downloaded CyberSecurity_Tool_App.zip and choose "Extract All".</li>
            <li>Open the extracted "CyberSecurity_Tool" folder.</li>
            <li>Double-click "Start CyberSecurity Tool.bat" and click "Yes" when Windows asks for Administrator permission. If Windows shows "Windows protected your PC", click "More info" then "Run anyway".</li>
          </ol>
          <p className="text-xs text-muted-foreground">Keep the .exe and .bat next to their "_internal" folder — the app needs those files to run. A "HOW TO RUN" readme is included in the zip.</p>
        </div>
      ) : checking ? (
        <p className="mt-6 text-sm text-muted-foreground">Confirming your purchase…</p>
      ) : open ? (
        <div className="mt-6 overflow-hidden rounded-xl bg-background">
          <EmbeddedCheckoutProvider key={appliedPromo ?? "none"} stripe={getStripe()} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
          <Button variant="ghost" className="mt-2" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <Button size="lg" onClick={() => start(false)}><Lock className="size-4" /> Unlock download — $29.99</Button>
          <div className="flex max-w-md flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Promo code" placeholder="Promo code" value={promo} onChange={(e) => setPromo(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" onClick={() => start(true)}>Apply code</Button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </article>
  );
}
