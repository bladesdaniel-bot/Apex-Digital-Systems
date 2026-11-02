// Server-only: look harder for a business website when its Google Maps listing has none.
// 1) Re-search Google Places by name + address (duplicate/merged listings often carry the site).
// 2) Search the open web and accept a result only if the page itself shows the business's phone or name.
import { fetchPublicPage } from "./website-check.server";

const DIRECTORIES = /(facebook|instagram|yelp|yellowpages|bbb\.org|mapquest|google\.|linkedin|twitter|x\.com|tiktok|youtube|angi|homeadvisor|thumbtack|nextdoor|manta|chamberofcommerce|bizapedia|tripadvisor|opentable|doordash|ubereats|grubhub|houzz|porch|superpages|citysearch|foursquare|wikipedia|indeed|glassdoor|duckduckgo|bing\.|apple\.com|waze|zillow|realtor\.com|birdeye|yell\.|dnb\.com|zoominfo|buzzfile|opencorporates|loc8nearme|cylex|hotfrog|merchantcircle|alignable)/i;

const digits = (s: string) => s.replace(/\D/g, "");
const nameTokens = (name: string) => name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !["llc", "inc", "company", "services", "service", "the"].includes(w));

/** True when the page clearly belongs to this business (phone match, or most name words present). */
export function pageMatchesBusiness(html: string, name: string, phone: string, url = ""): boolean {
  const text = html.toLowerCase();
  const last7 = digits(phone).slice(-7);
  if (last7.length === 7 && digits(text).includes(last7)) return true;
  const tokens = nameTokens(name);
  // Without a phone match, also require the web address itself to carry a name word (avoids look-alike franchises).
  const host = url ? (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ""; } })() : "";
  if (url && !tokens.some(t => host.includes(t))) return false;
  return tokens.length > 0 && tokens.filter(t => text.includes(t)).length >= Math.max(1, Math.ceil(tokens.length * 0.75));
}

async function viaPlaces(name: string, address: string, phone: string): Promise<string> {
  const lovableKey = process.env["LOVABLE_API_KEY"], mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) return "";
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsKey, "Content-Type": "application/json", "X-Goog-FieldMask": "places.displayName,places.nationalPhoneNumber,places.websiteUri" },
      body: JSON.stringify({ textQuery: `${name} ${address}`, pageSize: 5 }),
    });
    if (!res.ok) return "";
    const { places = [] } = (await res.json()) as { places?: any[] };
    const p = places.find(x => x.websiteUri && (digits(x.nationalPhoneNumber ?? "").slice(-7) === digits(phone).slice(-7) || pageMatchesBusiness(x.displayName?.text ?? "", name, "")));
    return p?.websiteUri ?? "";
  } catch { return ""; }
}

async function viaWebSearch(name: string, address: string, phone: string, signal: AbortSignal): Promise<string> {
  const city = address.split(",").slice(-3, -1).join(" ").trim();
  const lovableKey = process.env["LOVABLE_API_KEY"], parallelKey = process.env["PARALLEL_API_KEY"];
  if (lovableKey && parallelKey) {
    try {
      const res = await fetch("https://connector-gateway.lovable.dev/parallel/v1/search", {
        method: "POST", signal,
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": parallelKey, "Content-Type": "application/json" },
        body: JSON.stringify({ objective: `Official website of the business "${name}" located at ${address}`, search_queries: [`${name} ${city}`.slice(0, 200)], mode: "fast", advanced_settings: { max_results: 8 } }),
      });
      if (res.ok) {
        const { results = [] } = (await res.json()) as { results?: { url?: string }[] };
        const urls = [...new Set(results.map(r => { try { const u = new URL(r.url ?? ""); return DIRECTORIES.test(u.hostname) ? "" : `${u.protocol}//${u.hostname}/`; } catch { return ""; } }).filter(Boolean))].slice(0, 4);
        for (const url of urls) {
          try { const page = await fetchPublicPage(url, signal); if (page.html && pageMatchesBusiness(page.html, name, phone, page.finalUrl)) return page.finalUrl; } catch { /* next */ }
        }
      } else console.error(`Website search failed [${res.status}]: ${await res.text()}`);
    } catch { /* fall through */ }
  }
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${name} ${city}`)}`, { signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; ApexWebsiteFinder/1.0)" } });
    if (!res.ok) return "";
    const html = await res.text();
    const urls: string[] = [];
    for (const m of html.matchAll(/uddg=([^&"']+)/g)) {
      try {
        const u = new URL(decodeURIComponent(m[1] ?? ""));
        const home = `${u.protocol}//${u.hostname}/`;
        if (!DIRECTORIES.test(u.hostname) && !urls.includes(home)) urls.push(home);
      } catch { /* skip */ }
      if (urls.length >= 4) break;
    }
    for (const url of urls) {
      try {
        const page = await fetchPublicPage(url, signal);
        if (page.html && pageMatchesBusiness(page.html, name, phone, page.finalUrl)) return page.finalUrl;
      } catch { /* try next */ }
    }
  } catch { /* search unavailable */ }
  return "";
}

/** Returns a verified website for the business, or "" if none could be confirmed. Never throws. */
export async function findBusinessWebsite(name: string, address: string, phone: string): Promise<string> {
  const fromPlaces = await viaPlaces(name, address, phone);
  if (fromPlaces) return fromPlaces;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try { return await viaWebSearch(name, address, phone, controller.signal); } finally { clearTimeout(timeout); }
}
