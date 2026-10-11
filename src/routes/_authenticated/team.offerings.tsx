import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TeamShell } from "@/components/TeamShell";
import { getMyAccess } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/team/offerings")({
  head: () => ({
    meta: [
      { title: "Our Offerings | Apex Digital Systems" },
      { name: "description", content: "Quick reference of every Apex Digital Systems service and price for team members." },
      { property: "og:title", content: "Our Offerings | Apex Digital Systems" },
      { property: "og:description", content: "What Apex sells, who it's for, and talking points for calls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OfferingsPage,
});

function Offer({ name, price, who, children }: { name: string; price: string; who: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium text-foreground">{name}</h3>
        <span className="font-display text-electric">{price}</span>
      </div>
      <p className="mt-1 text-xs uppercase tracking-wide text-aetheris-teal">Who it's for: {who}</p>
      <p className="mt-2">{children}</p>
    </div>
  );
}

function Group({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <section className="scan-panel rounded-2xl p-6">
      <h2 className="font-display text-2xl font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground md:grid-cols-2">{children}</div>
    </section>
  );
}

function OfferingsPage() {
  const access = useServerFn(getMyAccess);
  const me = useQuery({ queryKey: ["my-access"], queryFn: () => access() });
  return (
    <TeamShell isAdmin={me.data?.role === "admin"}>
      <h1 className="font-display text-4xl font-medium">Our <span className="gradient-text">offerings</span></h1>
      <p className="mt-3 text-sm text-muted-foreground">Quick reference for calls and quotes. One-time packages can be split into 2–4 payments.</p>

      <div className="mt-8 grid gap-6">
        <Group title="1. Websites" intro="For businesses with no website, or one that looks outdated and doesn't bring in calls.">
          <Offer name="Website Launch" price="$1,000" who="No website, or only a Facebook/Google profile">
            Custom, fast, mobile-friendly site with click-to-call, contact form, Google Maps directions and trust badges.
          </Offer>
          <Offer name="Website Redesign" price="$1,000" who="Old, slow, or hard-to-use-on-phone websites">
            Full visual makeover, brand refresh, modern layout and fast loading.
          </Offer>
          <Offer name="Online Ordering, Menus & Booking" price="Add-on / quoted" who="Restaurants, salons, auto shops, contractors, clinics">
            Online ordering, service menus, appointment booking and intake forms that go straight to the owner's phone or email.
          </Offer>
        </Group>

        <Group title="2. Google & local growth" intro="For businesses that have a site but don't show up when locals search.">
          <Offer name="SEO Growth Cleanup" price="$399 one-time" who="Buried on page 3 or missing from Google Maps">
            Local keyword setup (e.g. "plumber in Reno"), page titles and descriptions, Google Business profile alignment, speed tuning and search submission.
          </Offer>
          <Offer name="Paid Ads" price="Quoted" who="Owners ready to pay for more traffic now">
            Targeted ad campaigns that send the right people to the site, improved month to month.
          </Offer>
        </Group>

        <Group title="3. Monthly plans" intro="Recurring memberships that keep the site safe, fast and updated. First month free is available.">
          <Offer name="Website Care Plan" price="$125 / month" who="Any customer after their build">
            Hosting, security certificate, uptime monitoring, backups, security updates and small text/photo changes.
          </Offer>
          <Offer name="Website Growth & Maintenance" price="$250 / month" who="Owners who want to keep growing">
            Everything in Care Plan plus monthly SEO tracking, new content or promos, speed tune-ups and priority support.
          </Offer>
        </Group>

        <Group title="4. Custom apps & business software" intro="Quoted per project. Show real examples at apexdigitalsystems.org/apps.">
          <Offer name="Customer & member portals" price="Custom quote" who="Businesses with repeat customers or members">
            Customer accounts, private dashboards, document uploads and self-service billing.
          </Offer>
          <Offer name="Team tools & CRMs" price="Custom quote" who="Owners managing staff, jobs or leads">
            Job queues, dispatch, scheduling and rep tracking — like the call list and orders tools we use ourselves.
          </Offer>
          <Offer name="Payments & invoicing" price="Custom quote" who="Anyone billing customers by hand">
            Online checkout, split payments and automatic monthly billing.
          </Offer>
          <Offer name="AI & automation" price="Custom quote" who="Owners buried in repetitive work">
            Smart intake forms, receipt and invoice scanning, instant lead alerts and read-aloud tools.
          </Offer>
        </Group>

        <section className="rounded-xl border border-electric/40 bg-electric/10 p-4 text-sm text-foreground">
          <b>Proof it works:</b> we built apexdigitalsystems.org ourselves — the website, lead form, team portal, quotes, payments and AI analysis. If a prospect asks "can you build that?", point to what they're looking at.
        </section>
      </div>
    </TeamShell>
  );
}
