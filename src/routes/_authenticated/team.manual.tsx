import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import manualPdf from "@/assets/team-manual.pdf.asset.json";

export const Route = createFileRoute("/_authenticated/team/manual")({
  head: () => ({
    meta: [
      { title: "Team Manual | Apex Digital Systems" },
      { name: "description", content: "Operations manual for Apex Digital Systems team members." },
      { property: "og:title", content: "Team Manual | Apex Digital Systems" },
      { property: "og:description", content: "How the Apex team prospects, books, quotes and gets paid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManualPage,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="scan-panel rounded-2xl p-6">
      <h2 className="font-display text-2xl font-medium">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground [&_b]:text-foreground [&_h3]:mt-4 [&_h3]:font-medium [&_h3]:text-aetheris-teal [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:space-y-1">{children}</div>
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-electric/40 bg-electric/10 p-4 text-foreground">{children}</p>;
}

function ManualPage() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  return (
    <TeamShell isAdmin={me.data?.role === "admin"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-medium">Team <span className="gradient-text">manual</span></h1>
        <Button asChild variant="hero" size="sm">
          <a href={manualPdf.url} download="Apex_Digital_Systems_Team_Manual.pdf" target="_blank" rel="noopener noreferrer">Download PDF</a>
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Daily operations: prospecting, booking review meetings, quotes, orders and commissions.</p>

      <div className="mt-8 grid gap-6">
        <Section title="1. Getting started & account access">
          <ol>
            <li>Go to <b>apexdigitalsystems.org/auth</b> or tap <b>Team Portal</b> in the menu or footer.</li>
            <li>No invite code yet? Tap <b>Request Invite Code</b>. Daniel receives a 6-digit code by email and relays it to you (expires in 48 hours).</li>
            <li>Finish signing up and confirm your email. You automatically get a unique <b>Employee ID</b>.</li>
            <li>Once the owner approves your account, all team tools unlock.</li>
          </ol>
        </Section>

        <Section title="2. The call list & cold calling">
          <p>Open <b>Call list</b>.</p>
          <h3>Finding businesses</h3>
          <ul>
            <li><b>Country & region:</b> pick your country and optional state/region.</li>
            <li><b>Website filter:</b> Any = random mix; No website yet = Website Launch leads; Has a website = Redesign or SEO Cleanup leads.</li>
            <li><b>Business type:</b> e.g. plumber, electrician, roofer, pest control. Blank = random.</li>
            <li><b>City:</b> type one, or leave blank for a random town (big and small cities balanced).</li>
            <li>Tap <b>Find businesses</b>. New results appear at the top. Use <b>Show queue from</b> to focus on one area.</li>
          </ul>
          <h3>Working a business card (3 shown at a time)</h3>
          <ul>
            <li>Tap the <b>phone number</b> to call, the <b>address</b> to open Google Maps, the <b>website</b> to check it yourself.</li>
            <li><b>Analyze business / website</b> gives strengths, gaps, recommendations and a call opener.</li>
          </ul>
        </Section>

        <Section title="3. Booking appointments & handling cards">
          <h3>Step 1 — Add customer profile</h3>
          <ol>
            <li>Tap <b>Add customer profile</b> on the card.</li>
            <li>Fill in contact name & role, <b>Appointment (meeting)</b> date/time, expected-by date, needs, interested package, budget and notes.</li>
            <li>Tap <b>Save profile</b>.</li>
          </ol>
          <Note><b>Automatic:</b> you become the <b>Sales Rep of Record</b> with your Employee ID, so later edits by teammates never move your credit. The owner gets an email alert with the meeting time (Pacific).</Note>
          <h3>Step 2 — Choose a card action</h3>
          <ul>
            <li><b>Called — check off:</b> add a note like "Review booked Thu 2 PM". Leaves your rotation; find it later in <b>Call back</b> search.</li>
            <li><b>Skip — no answer:</b> moves it to the back of your queue only. <b>Reset my queue</b> brings skips back.</li>
            <li><b>Subscriber — stays on board:</b> pins it in the Subscribers list.</li>
            <li><b>No call list — remove:</b> removes it for the whole team (wrong number, closed, do-not-call).</li>
            <li><b>Call back:</b> search a past business name or phone and tap <b>Call back — return to queue</b>.</li>
          </ul>
        </Section>

        <Section title="4. Building & sending quotes">
          <p>Open <b>Quotes</b>, or tap <b>Build quote</b> on a customer card (details carry over).</p>
          <ol>
            <li><b>Package:</b> Website Launch $1,000, Website Redesign $1,000, SEO Growth Cleanup $399, or a custom price (Custom App Design & Build is quoted per project).</li>
            <li><b>Add-ons:</b> extra services with their own prices.</li>
            <li><b>Monthly plan:</b> Website Care Plan $125/mo or Growth & Maintenance $250/mo. Tick <b>First month free</b> for a 30-day trial.</li>
            <li><b>Discount:</b> dollar or percent off, with a reason the owner can see.</li>
            <li><b>Split payments:</b> 1–4 parts. Part 1 is paid now; the rest charge the saved card automatically every 30 days.</li>
            <li>Tap <b>Create payment link</b> and text or email it to the customer.</li>
          </ol>
        </Section>

        <Section title="5. Build orders & photos">
          <ul>
            <li>After the first payment (or an owner-approved $0 order) the quote becomes a <b>Build Order</b> under <b>Orders</b> and the owner is alerted.</li>
            <li>Upload logos, photos and files (up to 100 MB each) to the order.</li>
          </ul>
        </Section>

        <Section title="6. Earnings & commissions">
          <p>Open <b>Earnings</b> to see your own statement.</p>
          <ul>
            <li><b>One-time sales:</b> 30% of the sale or a $300 minimum, whichever is higher — recorded automatically on the first payment.</li>
            <li><b>Monthly recurring:</b> $10 per month for each active customer you sold, on every real renewal.</li>
            <li>Totals are grouped in biweekly pay periods; the owner marks payouts as paid.</li>
          </ul>
        </Section>

        <Section title="7. Cancellations & refunds">
          <ol>
            <li>Open <b>Cancellations</b>.</li>
            <li>Pick the customer/order, what to cancel (order, monthly plan or both), the reason and any refund request.</li>
            <li>The owner reviews it. Approval stops future payments and ends the monthly plan.</li>
          </ol>
          <Note>Questions about approvals, special discounts or payouts? Contact Daniel directly.</Note>
        </Section>
      </div>
    </TeamShell>
  );
}
