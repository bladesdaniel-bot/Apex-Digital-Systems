import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";
import sheetPdf from "@/assets/call-sheet.pdf.asset.json";

export const Route = createFileRoute("/_authenticated/team/call-sheet")({
  head: () => ({
    meta: [
      { title: "Talking Website Call Sheet | Apex Digital Systems" },
      { name: "description", content: "Scripts, target tiers and objection answers for Apex telemarketers." },
      { property: "og:title", content: "Talking Website Call Sheet | Apex Digital Systems" },
      { property: "og:description", content: "How Apex reps pitch the talking website demo on calls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CallSheetPage,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="scan-panel rounded-2xl p-6">
      <h2 className="font-display text-2xl font-medium">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground [&_b]:text-foreground [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:space-y-1">{children}</div>
    </section>
  );
}

function Script({ children }: { children: ReactNode }) {
  return <blockquote className="rounded-xl border border-electric/40 bg-electric/10 p-4 italic text-foreground">{children}</blockquote>;
}

function Table({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-border text-foreground"><th className="py-2 pr-4">{head[0]}</th><th className="py-2">{head[1]}</th></tr></thead>
        <tbody>{rows.map(([a, b]) => <tr key={a} className="border-b border-border/50 align-top"><td className="py-2 pr-4 font-medium text-foreground">{a}</td><td className="py-2">{b}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function CallSheetPage() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  return (
    <TeamShell isAdmin={me.data?.role === "admin"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-medium">Talking website <span className="gradient-text">call sheet</span></h1>
        <Button asChild variant="hero" size="sm">
          <a href={sheetPdf.url} download="Apex_Talking_Website_Call_Sheet.pdf" target="_blank" rel="noopener noreferrer">Download PDF</a>
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Apex Digital Systems · Reno, Nevada · October 2026</p>

      <div className="mt-8 grid gap-6">
        <Section title="How to use this sheet">
          <p>Your goal on every call: walk the owner to <b>apexdigitalsystems.org</b> while you're on the phone, have them try the talking demo themselves, and complete the <b>Build Order</b> card in the Call List with their details, needs, budget and notes. Daniel receives the build order through the system; do not text him a separate lead.</p>
          <ul>
            <li>Call <b>Tier 1</b> businesses first. They earn the most per customer, so the service is easiest to justify.</li>
            <li>Use the opening script for the business's tier, then follow the conversation naturally.</li>
            <li>Log every call, including no-answers.</li>
          </ul>
          <p><b>The offer in plain words:</b> a talking website adds an AI voice assistant to a business's website. Visitors tap a button and talk to it out loud. It answers their questions, collects their details, and helps book appointments, 24 hours a day. Pricing is a custom quote from Daniel. <b>Never quote a price on the call.</b></p>
          <p><b>Before you start:</b> the live demo must be published on apexdigitalsystems.org before you use any line that sends owners there. Check with Daniel that it is live.</p>
        </Section>

        <Section title="Tier 1: one customer is worth thousands">
          <p>Call these first. One extra job can cover a full year of the service.</p>
          <Table head={["Business type", "Why they fit"]} rows={[
            ["Roofers", "Replacements often run $10,000+; crews are on roofs and miss calls"],
            ["HVAC", "System replacements and urgent repair calls"],
            ["Remodelers and general contractors", "Kitchens, bathrooms, and additions"],
            ["Solar installers", "Large installs; buyers ask lots of questions first"],
            ["Foundation repair and concrete", "High-dollar, urgent jobs"],
            ["Pool and spa builders", "Large one-time projects"],
            ["Lawyers (injury, family, criminal, estate)", "Each new client is worth thousands; callers want answers fast"],
            ["Cosmetic surgeons", "High-value procedures; visitors research before booking"],
            ["Dentists (implants, orthodontics, cosmetic)", "High-value treatment plans"],
            ["Real estate agents", "Each sale earns a large commission"],
            ["Car dealerships", "Big-ticket sales; after-hours shoppers"],
            ["Wedding venues and planners", "Large bookings; couples compare several options"],
          ]} />
          <p><b>Opening script:</b></p>
          <Script>
            <p>Hi, is this the owner? This is [your name] with Apex Digital Systems here in Reno. Quick question: when you're out on a job and someone calls or visits your website, who answers their questions?</p>
            <p className="mt-2 not-italic text-muted-foreground">(Let them answer.)</p>
            <p className="mt-2">That's exactly why I'm calling. We add an AI assistant to your website that talks with visitors out loud, answers their questions, and takes their details any time of day. For a business like yours, one extra job could pay for it for the year. The easiest way to see it is to try it yourself. Do you have a minute to pull it up with me right now? Go to apexdigitalsystems.org, tap the voice button, and ask it anything your customers usually ask you.</p>
          </Script>
        </Section>

        <Section title="Tier 2: good ticket size or repeat customers">
          <p>Call these after Tier 1. Each customer is worth hundreds of dollars or returns again and again.</p>
          <Table head={["Business type", "Why they fit"]} rows={[
            ["Plumbers and electricians", "Emergency calls pay well; techs are on jobs all day"],
            ["Med spas", "Treatment packages and repeat visits"],
            ["Chiropractors and physical therapists", "Multi-visit treatment plans"],
            ["Martial arts studios and gyms with contracts", "Each signup is a multi-month membership"],
            ["Therapists and counselors", "Weekly sessions add up over time"],
            ["Pest control", "Recurring service plans"],
            ["Garage door repair and installation", "Urgent calls and new installs"],
            ["Auto body and collision shops", "Insurance jobs worth thousands"],
            ["Carpet and upholstery cleaners", "Higher tickets than most people expect, plus repeat customers"],
            ["Landscaping and tree service", "Seasonal contracts and large projects"],
          ]} />
          <p><b>Opening script:</b></p>
          <Script>
            <p>Hi, is this the owner? This is [your name] with Apex Digital Systems in Reno. I'm calling because a lot of businesses like yours lose customers who visit the website, can't find an answer, and move on to the next search result.</p>
            <p className="mt-2">We add an AI assistant to your website that talks with visitors out loud, answers their questions, and collects their info so you can follow up, even after hours. Your repeat customers are worth a lot over time, so catching even a few more adds up fast. Do you have a minute to try it with me right now? Go to apexdigitalsystems.org, tap the voice button, and ask it a question like one of your customers would.</p>
          </Script>
        </Section>

        <Section title="Skip for this service">
          <p>Don't pitch talking websites to low-dollar businesses. Each sale is too small for the service to pay off, and a hard sell hurts Apex's reputation.</p>
          <ul>
            <li>Barbers and basic hair salons</li>
            <li>Coffee shops and cafes</li>
            <li>Food trucks and quick-service restaurants</li>
            <li>Small retail and gift shops</li>
          </ul>
          <p>These businesses still need help. Offer them a <b>Website Launch</b>, a <b>Website Redesign</b>, <b>SEO Growth Cleanup</b>, or a <b>Care Plan</b> instead, and record their needs in the <b>Build Order</b> card.</p>
        </Section>

        <Section title="Common objections">
          <Table head={["They say", "You say"]} rows={[
            ["\"How much does it cost?\"", "\"Every business is different, so Daniel puts together a custom quote after learning what you need. Payments can be split into up to four card payments.\""],
            ["\"Why do you need my budget?\"", "\"So Daniel can build options that actually fit your business instead of guessing. There's no wrong answer, and you're never locked in.\""],
            ["\"I don't have a budget for this.\"", "\"That's okay. What would one extra customer a month be worth to you? Daniel can work with you on something that makes sense.\""],
            ["\"I already have a website.\"", "\"Perfect. This adds to your current site. It works alongside what you already have.\""],
            ["\"My customers want a real person.\"", "\"Totally fair. The assistant tells visitors it's an AI, answers the basic questions, and gets their details so you can call them back. It catches people who would have left.\""],
            ["\"What if it says something wrong?\"", "\"It only answers from the information about your business that we set up, and it hands anything it's unsure about to you.\""],
            ["\"Just send me some info.\"", "\"Happy to, but the fastest way is to see it yourself. If you have a minute, pull up apexdigitalsystems.org and tap the voice button while I'm on the line.\""],
            ["\"I'm not interested.\"", "\"No problem, thanks for your time. Have a great day.\" Then end the call and mark it in the log."],
          ]} />
        </Section>

        <Section title="Closing the call">
          <p>Once the owner has tried the demo and is interested, open <b>Build Order</b> on their Call List card and complete the order yourself. For someone who isn't in the Call List, use <b>New customer order</b>. Daniel receives the build order through the system, so no separate text is needed.</p>
          <ol>
            <li>Confirm the owner's name and the business name.</li>
            <li>Ask the best number to text them, or their email.</li>
            <li>Ask what they'd most want the assistant to help with, such as answering questions after hours or booking appointments.</li>
            <li>Ask about their budget: "So Daniel can put together options that fit, what kind of budget would you be comfortable working with for this, monthly or one-time?" If they're unsure, ask what one extra customer is worth to them, and remind them payments can be split into up to four card payments. If they'd rather not say, move on without pressing. Never say whether a budget is enough; Daniel builds the quote around it.</li>
            <li>Enter the business name and address, owner's name, phone, email and website URL. Save their requested services, budget, appointment or expected-by date, and all notes on the order.</li>
            <li>If the customer has committed and everything is ready, choose <b>Place order — 100% ready to build</b>. Daniel receives it in Build Orders with an automatic alert. Payment is not required to place the order.</li>
            <li>If a committed order is waiting on photos, details or approval, choose <b>Put in Holding Area</b> and enter the reason. It stays out of the ready build queue until marked 100% ready. If they're only considering the offer, save their profile and schedule a callback instead of placing a ready order.</li>
            <li>Tell them: "I've saved your details and requests for Daniel to review. Nothing is charged until you approve and pay through your secure payment link."</li>
          </ol>
          <Button asChild variant="outline" size="sm"><Link to="/team/calls">Open Call List</Link></Button>
        </Section>

        <Section title="Calling rules">
          <p>These rules keep Apex honest and out of trouble. They are general guidelines, not legal advice.</p>
          <ul>
            <li>Dial every call by hand. <b>Never</b> use autodialers, robocalls, or prerecorded messages.</li>
            <li>Call businesses only, during their business hours.</li>
            <li>If anyone asks not to be called again, apologize, end the call, and mark it "Do not call." <b>Never</b> call that number again.</li>
            <li>Always say your real name and that you're with Apex Digital Systems.</li>
            <li><b>Never</b> quote prices, promise results, or guarantee a number of new customers.</li>
            <li><b>Never</b> claim to be from Google, the business's current web company, or anyone else.</li>
            <li><b>Never</b> say Apex has worked with a business it hasn't. The examples on the website are demos.</li>
          </ul>
          <p>Record the call outcome and reason in the Call List: no answer, voicemail, callback, interested — order saved, not interested, or do not call. Keep all customer notes in their profile and order. The printable call log is on the last page of the PDF.</p>
        </Section>
      </div>
    </TeamShell>
  );
}
