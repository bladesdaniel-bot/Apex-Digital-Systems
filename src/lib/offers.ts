// Browser-safe list of everything Apex sells. The home page sections, the analysis
// form's checkboxes, the quote builder and the pricing tests all read from here so
// the offering never drifts between places.
import { AppWindow, Monitor, Rocket, Search, ShieldCheck, Target, TrendingUp, Wand2, type LucideIcon } from "lucide-react";

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
  term: string;
  cadence: string;
  icon: LucideIcon;
  text: string;
  span: string;
  violet: boolean;
  custom?: boolean;
};

export const services: ServiceOffer[] = [
  { key: "Websites", icon: Monitor, title: "Websites", text: "Look credible online and turn visits into inquiries.", link: "Explore Website Options", note: "Website Launch and Website Redesign are listed in Services & Pricing below." },
  { key: "SEO & Local Growth", icon: Search, title: "SEO & Local Growth", text: "Help nearby customers find you in search and on Maps.", link: "Grow Local Visibility", note: "SEO Growth Cleanup is listed in Services & Pricing below." },
  { key: "Paid Ads & Ongoing Growth", icon: Target, title: "Paid Ads & Ongoing Growth", text: "Bring in the right traffic and keep improving what converts.", link: "Explore Growth Options", note: "Website Care Plan and Website Growth & Maintenance are listed in Services & Pricing below." },
  { key: "Custom Apps & Software", icon: AppWindow, title: "Custom Apps & Software", text: "Turn a process you run every week into a tool your team or customers can use.", link: "Explore App Options", note: "Custom App Design & Build is listed in Services & Pricing below, with live examples on our Apps page." },
];

export const packages: PackageOffer[] = [
  { name: "Website Launch", price: "$1,000", term: "", cadence: "One-time", icon: Rocket, text: "A professional, mobile-friendly website built to stand out and turn visitors into customers.", span: "lg:col-span-2", violet: false },
  { name: "Website Redesign", price: "$1,000", term: "", cadence: "One-time", icon: Wand2, text: "Modernize an outdated website with a cleaner design and an SEO-ready foundation.", span: "lg:col-span-2", violet: false },
  { name: "SEO Growth Cleanup", price: "$399", term: "", cadence: "One-time", icon: Search, text: "One-time foundational cleanup for local Google visibility and on-page SEO.", span: "lg:col-span-2", violet: false },
  { name: "Website Care Plan", price: "$125", term: "/mo", cadence: "Monthly", icon: ShieldCheck, text: "Keep your website updated, protected, and running smoothly with ongoing support.", span: "lg:col-span-2", violet: true },
  { name: "Website Growth & Maintenance", price: "$250", term: "/mo", cadence: "Monthly", icon: TrendingUp, text: "Ongoing website improvement with monthly updates and SEO support.", span: "lg:col-span-2", violet: true },
  { name: "Custom App Design & Build", price: "", term: "", cadence: "Per project", icon: AppWindow, text: "Build the tool your business is missing: member portals, booking tools, dashboards, customer apps.", span: "lg:col-span-2", violet: true, custom: true },
];

export const interestOptions = ["Website Launch", "Website Redesign", "SEO Growth Cleanup", "Custom App Design & Build", "Website Care Plan", "Website Growth & Maintenance", "Paid Ads", "Not sure yet"];

/** Short labels the animated flyer uses, keyed by package name. */
const FLYER_LABELS: Record<string, string> = {
  "Website Launch": "Website Launch",
  "Website Redesign": "Website Redesign",
  "SEO Growth Cleanup": "SEO Growth Cleanup",
  "Website Care Plan": "Care Plan",
  "Website Growth & Maintenance": "Growth Plan",
  "Custom App Design & Build": "Custom Software",
};

/**
 * Price rows for the animated flyer, derived from `packages` so the flyer can
 * never advertise a price the pricing cards do not.
 */
export const flyerPriceRows: { label: string; price: string }[] = packages
  .filter((p) => p.name in FLYER_LABELS)
  .map((p) => ({
    label: FLYER_LABELS[p.name] ?? p.name,
    price: p.custom ? "Custom quote" : `${p.price}${p.term}`,
  }));
