import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import manualPdf from "@/assets/team-manual-v4.pdf.asset.json";

export const Route = createFileRoute("/_authenticated/team/manual")({
  head: () => ({
    meta: [
      { title: "Team Manual | Apex Digital Systems" },
      { name: "description", content: "Operations manual for Apex Digital Systems team members." },
      { property: "og:title", content: "Team Manual | Apex Digital Systems" },
      { property: "og:description", content: "How the Apex team prospects, books, writes orders and gets paid." },
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
      <p className="mt-3 text-sm text-muted-foreground">Daily operations: signing in, calling, call-backs, writing orders, the customer portal and getting paid. Updated October 24, 2026. The on-screen manual below is the most current version.</p>

      <div className="mt-8 grid gap-6">
        <Section title="1. Getting started, sign-in & your timecard">
          <ol>
            <li>Open the three-line menu (top right) and tap <b>Team Member Portal</b>, or go to <b>apexdigitalsystems.org/auth</b>.</li>
            <li>No invite code yet? Tap <b>Request Invite Code</b>. Daniel gets a 6-digit code by email and relays it to you (expires in 48 hours).</li>
            <li>Finish signing up (name, male/female, age, your location and position — telemarketer or engineer) and confirm your email. You automatically get a unique <b>Employee ID</b> (like APX-1002).</li>
            <li>Once the owner approves your account, all team tools unlock. You stay signed in when you come back.</li>
            <li>Fill in your <b>contractor (W-9) profile</b> the first time you sign in if asked.</li>
          </ol>
          <h3>Clocking in and out</h3>
          <ul>
            <li><b>Signing in = clocking in.</b> Your shift starts when you open the Team Portal.</li>
            <li><b>Signing out = clocking out.</b> If you walk away for 30 minutes with no activity, your shift ends on its own.</li>
            <li>Every call outcome you record is logged automatically. The owner sees hours and calls under <b>Timecards</b>.</li>
            <li>Once you sign in on a device, your visits are no longer counted as website visitors.</li>
          </ul>
        </Section>

        <Section title="2. The call list & finding businesses">
          <p>Open <b>Call list</b>. Your queue and settings are private to your account, even on a shared device.</p>
          <ul>
            <li><b>Quick lookup</b> (top of the page): type a phone number or name to pull a business or walk-in customer back up — great when someone calls you back.</li>
            <li><b>Country & state:</b> pick a country (USA, Nigeria and more) and optional state (all US states, including Hawaii).</li>
            <li><b>Business type:</b> Tier 1 and Tier 2 types from the Call Sheet are searched first. Salons are left out. Similar names are understood (coffee also finds cafes). Blank = random from the tiers.</li>
            <li><b>City:</b> type one, or leave blank for a random town (big and small cities balanced).</li>
            <li><b>Website filter:</b> Any = everyone; No website yet = website build leads; Has a website = Redesign or SEO leads. Use <b>Any</b> if a search adds nothing.</li>
            <li>Tap <b>Find businesses</b>. If nothing is added, a message tells you why.</li>
          </ul>
          <h3>Working a card (5 shown at a time)</h3>
          <ul>
            <li>Tap the <b>phone</b> to call, the <b>address</b> for Google Maps, the <b>website</b> to look yourself, or the <b>Google</b> link to do your own research. If it says "no website" but Google shows one, trust Google and note it.</li>
            <li><b>Analyze business / website</b> gives strengths, gaps, recommendations, business age, owner info, business hours and a call opener.</li>
            <li><b>Reset my queue</b> starts you over with a fresh set of businesses.</li>
          </ul>
        </Section>

        <Section title="3. Card actions, call-backs & the Skipped pool">
          <ul>
            <li><b>Called — check off:</b> add a note like "Review booked Thu 2 PM". Find it later with the past-call search.</li>
            <li><b>Subscriber:</b> pins it in your Subscribers list.</li>
            <li><b>No call list:</b> removes it for the whole team (wrong number, closed, do-not-call).</li>
            <li><b>Skip:</b> moves it into your own <b>Skipped</b> pool so it stops showing in your queue. Open the pool to tap <b>Back to queue</b> on one, or return them all.</li>
            <li><b>No answer:</b> moves it into the shared <b>No Answer</b> pool so anyone on the team can return it to the queue later and try again.</li>
            <li><b>Past-call search:</b> type a name or phone and tap <b>Call back — return to queue</b>.</li>
            <li><b>Team Call Activity:</b> everyone can see the last 14 days of team calls — who called, when, the outcome and the reason. Calls are logged, not recorded.</li>
          </ul>
          <h3>Scheduled call-backs</h3>
          <ol>
            <li>Tap <b>Call back later</b>, pick the date and time and type a <b>reason</b> (required).</li>
            <li>It moves into your <b>Call-backs</b> list. Only you and the owner can see it. You get a reminder when it is due, and it shows a <b>Due now</b> tag.</li>
            <li>Tap <b>Open / Call</b> to work it. The call-back stays until you choose Called, Subscriber or No call list, or tap <b>Cancel call-back</b>.</li>
          </ol>
          <Note>Call-back reasons and all notes are kept forever, even after the call is finished.</Note>
        </Section>

        <Section title="4. Customer profiles & appointments">
          <ol>
            <li>Tap <b>Add customer profile</b> on the card.</li>
            <li>Fill in contact name & role, <b>Appointment</b> date/time, expected-by date, needs, interested package, budget and notes. You can also upload <b>photos</b> for their build — they carry over to the order.</li>
            <li>Tap <b>Save profile</b>. The owner gets an email with the meeting time.</li>
          </ol>
          <Note>The first teammate to save a profile becomes the <b>Sales Rep of Record</b>. Later edits by others never move that credit.</Note>
        </Section>

        <Section title="5. Writing an order">
          <h3>From the call list</h3>
          <p>Tap <b>Build Order</b> on a card. A pop-up opens over the call list with the business details filled in.</p>
          <h3>Someone you met in person</h3>
          <p>Tap <b>+ New customer order</b> at the top of the Call list for a blank form — no search needed.</p>
          <h3>What goes on the order</h3>
          <ul>
            <li>Business name, contact name, <b>phone number</b>, customer email (optional, but needed for their portal account).</li>
            <li><b>Business address</b> — shows as a Google Maps link on the order.</li>
            <li><b>Customer website URL</b> — kept on the order for your records.</li>
            <li><b>Package:</b> Starter Site $1,000 · Business Site $1,750 · Complete Online Store Package $2,500 · Redesign from $750 · SEO Cleanup $399 · Talking Website Agent ($500 + $199/mo, $750 + $279/mo, or $1,000 + $349/mo) · Custom apps quoted per project. Full details are in the <b>Packages</b> and <b>Pricing & compensation</b> tabs.</li>
            <li><b>Add-ons, discount</b> (with a reason) and <b>monthly plan</b>: Care Plan $125/mo or Growth & Maintenance $250/mo. Tick <b>First month free</b> for a 30-day trial.</li>
            <li><b>Split payments:</b> 1–4 parts. After Part 1, the saved card is charged automatically every 30 days.</li>
          </ul>
          <h3>Place it or send a payment link</h3>
          <ul>
            <li><b>Place order</b> sends it to Build Orders right away — no payment needed. It shows <b>Awaiting payment</b> until the customer pays.</li>
            <li><b>Create payment link</b> gives you a link to text or email. Find unpaid links again under <b>Orders → Unpaid payment links</b>.</li>
          </ul>
          <Note>Your name and Employee ID are saved on every order you write, automatically. Nobody can change it to someone else.</Note>
        </Section>

        <Section title="6. Build Orders, editing & photos">
          <ul>
            <li>Open <b>Orders</b> to see every order: who sold it, phone, address, website, payments, next automatic charge and status (New → In progress → Delivered).</li>
            <li>Use the <b>Ready / Holding / Delivered / All</b> filters. Orders the customer isn't ready for go in the <b>Holding area</b> with a reason, and only show as ready once released.</li>
            <li>Tap <b>Edit Order</b> to change details anytime. Prices lock after the first payment; phone, address, website, contact and notes can still be edited.</li>
            <li>Upload logos, photos and files up to 100 MB each.</li>
            <li>Upload the <b>signed agreement</b> (photo or PDF). The customer gets a copy in their portal.</li>
            <li>Paid orders save a <b>receipt</b> that the customer can see in their portal.</li>
          </ul>
        </Section>

        <Section title="7. The customer portal">
          <ul>
            <li>When an order has a customer email, the customer gets a welcome email to create their account and choose a password.</li>
            <li>Customers sign in at <b>apexdigitalsystems.org/client/login</b> or with <b>Client Portal</b> in the three-line menu.</li>
            <li>They see only their own orders, status, signed agreement, receipts and files. They can send change requests and upload photos and documents — the order flashes yellow for the owner until it's updated.</li>
            <li>Each order has a <b>Leave us a Google review</b> button. Encourage happy customers to tap it.</li>
          </ul>
        </Section>

        <Section title="8. Earnings, commissions & tax profile">
          <ul>
            <li><b>One-time sales:</b> 30% of collected service payments after discounts. Split payments earn as each installment clears; unpaid balances earn nothing. Owner-entered sales on unpaid orders remain available.</li>
            <li><b>Monthly recurring:</b> 25% of each paid monthly service payment, including the first paid month, Care, Growth, Talking Websites and the $150 Ads management fee. No commission on tax, prepaid advertising budgets, extra minutes, extra hours or free months.</li>
            <li>Totals are grouped in biweekly pay periods; the owner marks payouts as paid.</li>
            <li>Fill in your <b>contractor profile</b> under Earnings (legal name, address, SSN) so your 1099 is correct. Only you and the owner can see it.</li>
          </ul>
        </Section>

        <Section title="9. Cancellations & helpful tools">
          <ol>
            <li>Open <b>Cancellations</b>, pick the order, what to cancel (order, monthly plan or both), the reason and any refund request.</li>
            <li>The owner reviews it. Approval stops future payments.</li>
          </ol>
          <p><b>Copy & read aloud:</b> highlight any text on the site to copy it, or tap play to hear it read out.</p>
          <p><b>Playbook tabs:</b> Manual, Call sheet (scripts and objections), Pricing & compensation, Packages, and Training videos.</p>
          <Note>Questions about approvals, discounts or payouts? Contact Daniel directly.</Note>
        </Section>
      </div>
    </TeamShell>
  );
}
