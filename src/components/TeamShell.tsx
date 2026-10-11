import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/team.functions";
import { getMyTaxInfo, getW9Requirement } from "@/lib/tax-info.functions";
import { TaxInfoForm } from "@/components/TaxInfoForm";

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
  const signOut = async () => {
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
        <Link to="/team/quotes" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Quotes</Link>
        <Link to="/team/orders" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Orders</Link>
        <Link to="/team/cancellations" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Cancellations</Link>
        <Link to="/team/visitors" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Visitors</Link>
        <Link to="/team/earnings" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Earnings</Link>
        <Link to="/team/manual" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Manual</Link>
        <Link to="/team/offerings" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Offerings</Link>
        {isAdmin && <Link to="/team/expenses" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Expenses</Link>}
        {isAdmin && <Link to="/team/admin" className="hover:text-foreground" activeProps={{ className: "text-electric" }}>Admin</Link>}
        <Button variant="link" className="ml-auto h-auto p-0 text-xs text-muted-foreground" onClick={signOut}>Sign out</Button>
      </nav>
      {needsTax ? <TaxInfoForm /> : children}
    </main>
  );
}
