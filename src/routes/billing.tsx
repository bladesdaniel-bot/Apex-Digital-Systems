import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { openBillingPortal, requestBillingLink } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/billing")({
  validateSearch: (s: Record<string, unknown>): { token?: string | undefined } => ({ token: typeof s["token"] === "string" ? (s["token"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Manage billing | Apex Digital Systems" },
      { name: "description", content: "Update your card, download invoices or manage your Apex Digital Systems plan." },
      { property: "og:title", content: "Manage billing | Apex Digital Systems" },
      { property: "og:description", content: "Update your card, download invoices or manage your Apex Digital Systems plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { token } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy"); setErr("");
    try {
      await requestBillingLink({ data: { email, environment: getStripeEnvironment() } });
      setState("sent");
    } catch (x) { setErr(x instanceof Error ? x.message : "Something went wrong."); setState("error"); }
  };
  const open = async () => {
    setState("busy"); setErr("");
    const r = await openBillingPortal({ data: { token: token ?? "" } }).catch(() => ({ error: "This billing link isn't valid." }));
    if ("error" in r) { setErr(r.error); setState("error"); return; }
    window.location.href = r.url;
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-card w-full max-w-md rounded-2xl p-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Apex Digital Systems</p>
        <h1 className="mt-2 font-display text-2xl font-medium">Manage billing</h1>
        {token ? (
          <div className="mt-5 grid gap-3">
            <p className="text-sm text-muted-foreground">Update your card, download invoices, or manage your plan on our payment provider's secure page.</p>
            <Button variant="hero" size="lg" disabled={state === "busy"} onClick={open}>{state === "busy" ? "Opening…" : "Open my billing"}</Button>
          </div>
        ) : state === "sent" ? (
          <p className="mt-5 text-sm leading-7 text-muted-foreground">If <span className="text-foreground">{email}</span> belongs to a paying customer, we've emailed a secure billing link to it. It works for one hour.</p>
        ) : (
          <form onSubmit={send} className="mt-5 grid gap-3">
            <label htmlFor="billing-email" className="text-sm text-muted-foreground">Enter the email you paid with. We'll email you a secure link.</label>
            <input id="billing-email" type="email" required maxLength={255} value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm" placeholder="you@business.com" />
            <Button variant="hero" size="lg" type="submit" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Email me a billing link"}</Button>
          </form>
        )}
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        <Button asChild variant="link" className="mt-4 px-0"><Link to="/">Back to site</Link></Button>
      </div>
    </main>
  );
}
