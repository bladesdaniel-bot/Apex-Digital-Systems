import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { activateClient, getClientInvite } from "@/lib/client-portal.functions";

export const Route = createFileRoute("/client/setup")({
  validateSearch: (s: Record<string, unknown>): { token?: string | undefined } => ({ token: typeof s["token"] === "string" ? (s["token"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Create Your Project Account | Apex Digital Systems" },
      { name: "description", content: "Choose a password to open your Apex Digital Systems project portal." },
      { property: "og:title", content: "Create Your Project Account | Apex Digital Systems" },
      { property: "og:description", content: "Set up your customer project portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const { token = "" } = Route.useSearch();
  const navigate = useNavigate();
  const get = useServerFn(getClientInvite);
  const activate = useServerFn(activateClient);
  const inv = useQuery({ queryKey: ["client-invite", token], queryFn: () => get({ data: { token } }), enabled: /^[a-f0-9]{48}$/.test(token), retry: false });
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const d = inv.data && !("error" in inv.data) ? inv.data : null;
  useEffect(() => { if (d) { setContact(d.contact); setPhone(d.phone); } }, [d?.email]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr("");
    if (pw !== pw2) return setErr("Passwords don't match.");
    setBusy(true);
    try {
      const r = await activate({ data: { token, contact, phone, password: pw } });
      if ("error" in r) return setErr(r.error ?? "Something went wrong.");
      if (r.existing) return navigate({ to: "/client/login" });
      const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: pw });
      navigate({ to: error ? "/client/login" : "/client" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-3xl font-medium">Create your <span className="gradient-text">project account</span></h1>
      {!token || (inv.data && "error" in inv.data) ? (
        <p className="scan-panel mt-6 rounded-2xl p-5 text-sm">{inv.data && "error" in inv.data ? inv.data.error : "This link is missing its code. Use the link from your email."}</p>
      ) : inv.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading your details…</p> : d && (
        <form onSubmit={submit} className="glass-card mt-6 grid gap-4 rounded-2xl p-6 text-sm">
          <p className="text-muted-foreground">We filled in what we have for <strong className="text-foreground">{d.business}</strong>. Check it, then choose a password.</p>
          <label className="grid gap-1">Email<Input value={d.email} disabled /></label>
          <label className="grid gap-1">Your name<Input value={contact} onChange={e => setContact(e.target.value)} maxLength={120} required /></label>
          <label className="grid gap-1">Phone<Input value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} type="tel" /></label>
          <label className="grid gap-1">Password<Input value={pw} onChange={e => setPw(e.target.value)} type="password" minLength={8} required autoComplete="new-password" /></label>
          <label className="grid gap-1">Confirm password<Input value={pw2} onChange={e => setPw2(e.target.value)} type="password" minLength={8} required autoComplete="new-password" /></label>
          {err && <p className="text-destructive">{err}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create my account"}</Button>
        </form>
      )}
    </main>
  );
}
