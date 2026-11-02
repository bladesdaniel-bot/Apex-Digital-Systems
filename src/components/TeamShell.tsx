import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, type ReactNode } from "react";
import { clockHeartbeat, clockOut } from "@/lib/timecards.functions";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/team.functions";
import { getMyTaxInfo, getW9Requirement } from "@/lib/tax-info.functions";
import { TaxInfoForm } from "@/components/TaxInfoForm";
import { CallbackAlert } from "@/components/CallbackAlert";

export function TeamShell({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const accessFn = useServerFn(getMyAccess);
  const taxFn = useServerFn(getMyTaxInfo);
  const w9Fn = useServerFn(getW9Requirement);
  const access = useQuery({ queryKey: ["my-access"], queryFn: () => accessFn() });
  const role = (access.data as { role?: string } | undefined)?.role;
  const w9 = useQuery({ queryKey: ["w9-required"], queryFn: () => w9Fn() });
  const tax = useQuery({ queryKey: ["my-tax-info"], queryFn: () => taxFn(), enabled: !!role && role !== "admin" && w9.data === true });
  // Teammates (not the owner) must complete W-9 details before using team tools, unless the owner turns the requirement off.
  const needsTax = !isAdmin && !!role && role !== "admin" && w9.data === true && tax.isSuccess && tax.data === null;
  const beatFn = useServerFn(clockHeartbeat);
  const outFn = useServerFn(clockOut);
  // Being in the portal = on the clock; heartbeat every 5 min keeps the shift open.
  useEffect(() => {
    if (role !== "admin" && role !== "telemarketer") return;
    const beat = () => { beatFn().catch(() => {}); };
    beat();
    const t = setInterval(beat, 5 * 60_000);
    return () => clearInterval(t);
  }, [role, beatFn]);
  const signOut = async () => {
    await outFn().catch(() => {});
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <nav className="mb-10 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">← Site</Link>
        <Link to="/team/brief" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Lead brief</Link>
        <Link to="/team/calls" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Call list</Link>
        <Link to="/team/orders" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Orders</Link>
        <Link to="/team/cancellations" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Cancellations</Link>
        <Link to="/team/visitors" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Visitors</Link>
        <Link to="/team/earnings" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Earnings</Link>
        <span className="flex flex-wrap items-center gap-1 rounded-full border border-star/60 bg-star/10 p-1 shadow-[0_0_18px_-4px_var(--star)]" aria-label="Company playbook">
          <span aria-hidden className="pl-2 pr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-star">★ Playbook</span>
          {([["/team/manual", "Manual"], ["/team/call-sheet", "Call sheet"], ["/team/pricing-guide", "Pricing & compensation"], ["/team/packages", "Packages"], ["/team/training", "Training videos"]] as const).map(([to, label]) => (
            <Link key={to} to={to} className="rounded-full px-3 py-1 font-semibold text-foreground hover:bg-star/20" activeProps={{ className: "bg-star text-background hover:bg-star" }}>{label}</Link>
          ))}
        </span>
        {isAdmin && <Link to="/team/expenses" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Expenses</Link>}
        {isAdmin && <Link to="/team/timecards" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Timecards</Link>}
        {isAdmin && <Link to="/team/admin" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Admin</Link>}
        <Button variant="link" className="ml-auto h-auto p-0 text-xs text-muted-foreground" onClick={signOut}>Sign out</Button>
      </nav>
      {!needsTax && <CallbackAlert />}
      {needsTax ? <TaxInfoForm /> : children}
    </main>
  );
}
