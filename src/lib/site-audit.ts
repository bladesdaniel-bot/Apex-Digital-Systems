// Browser-safe HTML audit helpers: turn raw pages into factual signals for the AI brief.

const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function pickKeyLinks(html: string, base: string, max: number): string[] {
  const origin = new URL(base).hostname.replace(/^www\./, "");
  const want = /(contact|about|service|book|appointment|menu|pricing|schedule)/i;
  const out: string[] = [];
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, href = "", label = ""] = m;
    if (!want.test(href) && !want.test(strip(label))) continue;
    try {
      const u = new URL(href, base);
      if (!["http:", "https:"].includes(u.protocol) || u.hostname.replace(/^www\./, "") !== origin) continue;
      u.hash = "";
      if (u.href !== base && !out.includes(u.href)) out.push(u.href);
    } catch { /* ignore bad links */ }
    if (out.length >= max) break;
  }
  return out;
}

export type PageAudit = { url: string; title: string; description: string; headings: string[]; text: string };

export function auditPage(url: string, html: string): PageAudit {
  const title = strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ?? "";
  const headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)].map(m => strip(m[1] ?? "")).filter(Boolean).slice(0, 8);
  const body = html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ");
  return { url, title, description: strip(description), headings, text: strip(body).slice(0, 1200) };
}

export function siteSignals(pages: { url: string; html: string }[]) {
  const all = pages.map(p => p.html).join("\n");
  const has = (re: RegExp) => re.test(all);
  return {
    https: pages[0]?.url.startsWith("https://") ?? false,
    mobileViewport: has(/<meta[^>]+name=["']viewport["']/i),
    metaDescription: has(/<meta[^>]+name=["']description["']/i),
    onlineBooking: has(/(calendly|acuityscheduling|squareup\.com\/appointments|booksy|vagaro|opentable|resy|mindbody|schedulicity|setmore|book (now|online|an appointment))/i),
    contactForm: has(/<form[\s\S]*?(email|message|phone)/i),
    clickToCall: has(/href=["']tel:/i),
    reviewsShown: has(/(testimonial|reviews?|google reviews|yelp|trustpilot|★)/i),
    socialLinks: ["facebook", "instagram", "tiktok", "linkedin", "youtube", "x.com", "twitter"].filter(s => all.toLowerCase().includes(s.includes(".") ? `${s}/` : `${s}.com`)),
    analytics: has(/(googletagmanager|gtag\(|google-analytics|fbq\(|plausible|clarity\.ms)/i),
    structuredData: has(/application\/ld\+json/i),
    builder: ["wix", "squarespace", "wordpress", "godaddy", "shopify", "weebly", "webflow"].find(b => all.toLowerCase().includes(b)) ?? "unknown",
    copyrightYear: all.match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/i)?.[1] ?? "not found",
    pagesRead: pages.length,
  };
}

export function auditReport(pages: { url: string; html: string }[]): string {
  if (!pages.length) return "";
  const signals = siteSignals(pages);
  const pageText = pages.map(p => {
    const a = auditPage(p.url, p.html);
    return `### ${a.url}\nTitle: ${a.title || "(missing)"}\nMeta description: ${a.description || "(missing)"}\nHeadings: ${a.headings.join(" | ") || "(none)"}\nText excerpt: ${a.text}`;
  }).join("\n\n");
  return `Detected signals (from the raw HTML, scripts not run): ${JSON.stringify(signals)}\n\n${pageText}`;
}
