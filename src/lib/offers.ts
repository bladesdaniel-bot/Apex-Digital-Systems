// Browser-safe list of everything Apex sells. The home page sections, the analysis
// form's checkboxes, the quote builder and the pricing tests all read from here so
// the offering never drifts between places.
import { AppWindow, Bot, Building2, Monitor, Rocket, Search, ShieldCheck, ShoppingCart, Sparkles, Target, TrendingUp, Wand2, type LucideIcon } from "lucide-react";

export type ServiceOffer = {
  key: string;
  icon: LucideIcon;
  title: string;
  text: string;
  link: string;
  note: string;
};

export type PackageOffer = {
  name: string;
  /** Empty for work quoted per project — the card then reads "Custom quote". */
  price: string;
  /** Numeric billing amounts shared with the Build Order selections. */
  amount?: number;
  monthlyAmount?: number;
  term: string;
  cadence: string;
  icon: LucideIcon;
  text: string;
  span: string;
  violet: boolean;
  custom?: boolean;
  /** Section the card is shown in on the home page. */
  group: PackageGroup;
  features: string[];
  /** Shows "From" before the price for work that varies by size. */
  from?: boolean;
  /** Extra line under the price, e.g. a monthly fee on top of setup. */
  sub?: string;
  popular?: boolean;
};

export const PACKAGE_GROUPS = ["Websites", "Monthly plans & SEO", "Talking websites", "Google & YouTube Ads", "Custom apps"] as const;
export type PackageGroup = (typeof PACKAGE_GROUPS)[number];

export const services: ServiceOffer[] = [
  { key: "Websites", icon: Monitor, title: "Websites", text: "Look credible online and turn visits into inquiries.", link: "Explore Website Options", note: "Starter Site, Business Site, Complete Online Store Package and Website Redesign are listed in Services & Pricing below." },
  { key: "SEO & Local Growth", icon: Search, title: "SEO & Local Growth", text: "Help nearby customers find you in search and on Maps.", link: "Grow Local Visibility", note: "SEO Growth Cleanup is listed in Services & Pricing below." },
  { key: "Paid Ads & Ongoing Growth", icon: Target, title: "Paid Ads & Ongoing Growth", text: "Bring in the right traffic and keep improving what converts.", link: "Explore Growth Options", note: "Website Care Plan and Growth and Maintenance are listed in Services & Pricing below." },
  { key: "Custom Apps & Software", icon: AppWindow, title: "Custom Apps & Software", text: "Turn a process you run every week into a tool your team or customers can use.", link: "Explore App Options", note: "Custom App Design & Build is listed in Services & Pricing below, with live examples on our Apps page." },
];

export const packages: PackageOffer[] = [
  { group: "Websites", name: "Starter Site", price: "$1,000", amount: 1000, term: "", cadence: "One-time", icon: Rocket, text: "A clean, professional site that gets you found and gets you calls.", span: "", violet: false, features: ["Up to 5 pages", "Mobile-friendly design", "Contact form", "Basic SEO setup"] },
  { group: "Websites", name: "Business Site", price: "$1,750", amount: 1750, term: "", cadence: "One-time", icon: Building2, text: "Everything a growing local business needs to book more work online.", span: "", violet: false, popular: true, features: ["Everything in the Starter Site", "Up to 10 pages", "Booking or quote request form", "Google Business Profile setup"] },
  { group: "Websites", name: "Complete Online Store Package", price: "$2,500", amount: 2500, term: "", cadence: "One-time", icon: ShoppingCart, text: "Everything you need to sell online", span: "sm:col-span-2", violet: false, features: ["Custom website: up to 10 pages, mobile-friendly, tap-to-call phone, menu and map", "Online store: your products with size and option choices, cart, shipping or local pickup", "Square checkout: payments go straight to your Square account", "Owner's login to the dashboard portal", "Track your order page for your customers", "Owner dashboard: Connect with Square, website view counter, and order tracker (edit, undo, cancel, delete orders)"] },
  { group: "Websites", name: "Website Redesign", price: "$750", amount: 750, term: "", cadence: "One-time", icon: Wand2, text: "Give your existing website a fresh start.", span: "", violet: false, from: true, features: ["We rebuild your existing website"] },
  { group: "Websites", name: "Seasonal Holiday Themes", price: "$250", amount: 250, term: "", cadence: "One-time", icon: Sparkles, text: "Holiday looks for Halloween, Thanksgiving, Christmas, Easter, and Valentine's Day", span: "", violet: false, features: ["Owner's login to the dashboard portal included, if you don't already have one", "Turn each holiday theme on or off yourself with a switch in your owner dashboard", "Switch it off and your site goes right back to its normal look"] },
  { group: "Monthly plans & SEO", name: "Website Care Plan", price: "$125", monthlyAmount: 125, term: "/mo", cadence: "Monthly", icon: ShieldCheck, text: "We keep your website running, safe and up to date.", span: "", violet: true, features: ["Hosting & domain registration", "Security, backups & updates", "Fixes when something breaks", "Up to 1 hour of changes a month"] },
  { group: "Monthly plans & SEO", name: "Growth and Maintenance", price: "$250", monthlyAmount: 250, term: "/mo", cadence: "Monthly", icon: TrendingUp, text: "Everything in Care Plan, plus ongoing work to bring in more customers.", span: "", violet: true, popular: true, features: ["Everything in Care Plan", "Up to 3 hours of changes a month", "Google Business Profile upkeep", "SEO tune-ups + monthly report", "Priority fixes, same or next business day"] },
  { group: "Monthly plans & SEO", name: "SEO Growth Cleanup", price: "$399", amount: 399, term: "", cadence: "One-time", icon: Search, text: "A one-time cleanup that helps nearby customers find you on Google.", span: "", violet: false, features: ["Page titles, descriptions & keywords cleaned up", "Google Business Profile cleanup", "Broken link & page speed fixes", "Your site submitted to Google"] },
  { group: "Talking websites", name: "Talking Website Starter", price: "$500", amount: 500, monthlyAmount: 199, term: " setup", cadence: "Setup + monthly", icon: Bot, text: "An AI voice assistant that talks with visitors, answers questions and takes their details, 24/7.", span: "", violet: true, sub: "+ $199/mo", features: ["Custom AI assistant with a voice picked for your business", "Added to your existing website", "300 talk minutes a month", "Monthly updates to your hours, services & answers"] },
  { group: "Talking websites", name: "Talking Website Standard", price: "$750", amount: 750, monthlyAmount: 279, term: " setup", cadence: "Setup + monthly", icon: Bot, text: "Your voice agent answers questions and sends you new leads right away.", span: "", violet: true, sub: "+ $279/mo", popular: true, features: ["Everything in Starter", "600 talk minutes a month", "Text or email alert for every new lead"] },
  { group: "Talking websites", name: "Talking Website Premium", price: "$1,000", amount: 1000, monthlyAmount: 349, term: " setup", cadence: "Setup + monthly", icon: Bot, text: "Your voice agent books appointments straight onto your calendar.", span: "", violet: true, sub: "+ $349/mo", features: ["Everything in Standard", "1,000 talk minutes a month", "Appointment booking connected to your calendar", "Monthly report on conversations & leads"] },
  { group: "Google & YouTube Ads", name: "Google and YouTube Ads", price: "$150", monthlyAmount: 150, term: "/mo", cadence: "Monthly add-on", icon: Target, text: "We set up and run your Google and YouTube campaigns. Your prepaid advertising budget is separate.", span: "", violet: true, features: ["Campaign setup & management", "Your ad budget, prepaid monthly", "Never spend more than you prepaid", "Unused budget credited to next month", "Change or stop next month; unused budget refunded if you stop"] },
  { group: "Custom apps", name: "Custom App Design & Build", price: "", term: "", cadence: "Per project", icon: AppWindow, text: "Build the tool your business is missing: member portals, booking tools, dashboards, customer apps.", span: "", violet: true, custom: true, features: ["Planned around your business", "Designed and built for you", "Priced per project"] },
];

export const interestOptions = ["Starter Site", "Business Site", "Complete Online Store Package", "Website Redesign", "Seasonal Holiday Themes", "Talking Website Agent", "SEO Growth Cleanup", "Custom App Design & Build", "Website Care Plan", "Growth and Maintenance", "Google and YouTube Ads", "Paid Ads", "Not sure yet"];

/** Short labels the animated flyer uses, keyed by package name. */
const FLYER_LABELS: Record<string, string> = {
  "Starter Site": "Starter Site",
  "Business Site": "Business Site",
  "Website Redesign": "Redesign",
  "SEO Growth Cleanup": "SEO Cleanup",
  "Website Care Plan": "Care Plan",
  "Growth and Maintenance": "Growth Plan",
};

/**
 * Price rows for the animated flyer, derived from `packages` so the flyer can
 * never advertise a price the pricing cards do not.
 */
export const flyerPriceRows: { label: string; price: string }[] = packages
  .filter((p) => p.name in FLYER_LABELS)
  .map((p) => ({
    label: FLYER_LABELS[p.name] ?? p.name,
    price: p.custom ? "Custom quote" : `${p.from ? "from " : ""}${p.price}${p.term}`,
  }));

/** Bold lead-ins used on the pricing sheet, e.g. "Square checkout:". */
const FEATURE_LEADS = ["Custom website:", "Online store:", "Square checkout:", "Owner's login", "Track your order page", "Owner dashboard:"];
export function splitFeature(f: string): [string, string] {
  const lead = FEATURE_LEADS.find(l => f.startsWith(l));
  return lead ? [lead, f.slice(lead.length)] : ["", f];
}
