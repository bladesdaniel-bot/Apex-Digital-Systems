import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamShell } from "@/components/TeamShell";
import { Markdown } from "@/components/Markdown";
import { canUseBrief, createLeadBrief, getMyAccess } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/team/brief")({
  head: () => ({
    meta: [
      { title: "Lead Brief Generator | Apex Digital Systems Team" },
      { name: "description", content: "Internal tool for the Apex team to turn a prospect's website and note into an AI-powered lead brief." },
      { property: "og:title", content: "Lead Brief Generator | Apex Digital Systems" },
      { property: "og:description", content: "AI-powered lead briefs with tailored marketing opportunities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BriefPage,
});

function BriefPage() {
  const access = useServerFn(getMyAccess);
  const run = useServerFn(createLeadBrief);
  const { data, isLoading } = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  const role = data?.role ?? null;
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(""); setBrief("");
    try {
      const res = await run({ data: { url: String(f.get("url") ?? ""), note: String(f.get("note") ?? "") } });
      if (res.ok) setBrief(res.brief); else setError(res.error);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <TeamShell isAdmin={role === "admin"}>
      <p className="mb-3 font-technical text-[11px] uppercase tracking-[0.16em] text-electric">Team tool</p>
      <h1 className="font-display text-4xl font-medium">Lead <span className="gradient-text">brief</span> generator</h1>
      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Checking access…</p> : !canUseBrief(role) ? (
        <div className="scan-panel mt-8 rounded-2xl p-6 text-sm">
          {role === "revoked" ? "Your access has been revoked. Contact an admin if this is a mistake." : role === "suspended" ? "Your account is on hold, so team tools are paused. Contact an admin if this is a mistake." : "Your account is waiting for an admin to approve access."}
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">Paste a prospect's website and note. Lovable AI drafts a concise brief with tailored opportunities.</p>
          <form onSubmit={submit} className="revenue-card mt-8 grid gap-4 rounded-2xl p-6">
            <Input name="url" placeholder="Prospect website URL" aria-label="Prospect website URL" />
            <textarea name="note" rows={4} placeholder="Prospect's submitted note" aria-label="Prospect note" className="rounded-md border border-input bg-background/60 p-3 text-sm" />
            <Button variant="hero" type="submit" disabled={busy} className="h-12 gap-3">
              {busy ? <><Loader2 className="size-4 animate-spin" /> Generating…</> : <><Sparkles className="size-4" /> Generate brief</>}
            </Button>
          </form>
          {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
          {brief && <Markdown text={brief} className="scan-panel mt-8 rounded-2xl p-6 text-sm leading-7 text-muted-foreground" />}
        </>
      )}
    </TeamShell>
  );
}
