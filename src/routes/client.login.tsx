import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/client/login")({
  head: () => ({
    meta: [
      { title: "Customer Sign In | Apex Digital Systems" },
      { name: "description", content: "Sign in to your Apex Digital Systems project portal." },
      { property: "og:title", content: "Customer Sign In | Apex Digital Systems" },
      { property: "og:description", content: "Customer project portal sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientLogin,
});

function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) return setErr("Email or password is incorrect.");
    navigate({ to: "/client" });
  };
  const reset = async () => {
    if (!email.trim()) return setErr("Enter your email first.");
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/client/login` });
    setErr("If that email has an account, a reset link is on its way.");
  };
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-3xl font-medium">Customer <span className="gradient-text">sign in</span></h1>
      <form onSubmit={submit} className="glass-card mt-6 grid gap-4 rounded-2xl p-6 text-sm">
        <label className="grid gap-1">Email<Input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoComplete="email" /></label>
        <label className="grid gap-1">Password<Input value={pw} onChange={e => setPw(e.target.value)} type="password" required autoComplete="current-password" /></label>
        {err && <p className="text-muted-foreground">{err}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        <button type="button" onClick={reset} className="text-xs text-electric">Forgot password?</button>
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">First time here? Use the <strong className="text-foreground">Create my account</strong> link in your welcome email to choose a password — you only do that once.</p>
        <a href="/" className="text-xs text-muted-foreground hover:text-foreground">Back to apexdigitalsystems.org</a>
      </form>
    </main>
  );
}
