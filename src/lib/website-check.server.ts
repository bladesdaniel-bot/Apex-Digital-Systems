import ipaddr from "ipaddr.js";
import { classifyWebsiteResponse, type WebsiteCheck } from "./website-check";

export function publicWebsiteUrl(value: string): URL {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) throw new Error("Unsafe URL");
  // Only public DNS names. Reject literal IPs, local names, metadata services and alternate IPv4 encodings (URL normalizes them).
  if (!host.includes(".") || host.includes(":") || ipaddr.isValid(host) || /(?:^|\.)(?:localhost|local|internal|test|invalid|example|home|lan)$/.test(host) || host === "metadata.google.internal") throw new Error("Unsafe host");
  url.hostname = host;
  return url;
}

export function isPublicAddress(address: string): boolean {
  try { return ipaddr.parse(address).range() === "unicast"; } catch { return false; }
}

async function verifyPublicDns(url: URL, signal: AbortSignal, request: typeof fetch) {
  const answers = await Promise.all(["A", "AAAA"].map(async type => {
    const response = await request(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(url.hostname)}&type=${type}`, { headers: { Accept: "application/dns-json" }, signal, redirect: "error" });
    if (!response.ok) throw new Error("DNS unavailable");
    const data = await response.json() as { Status?: number; Answer?: { type: number; data: string }[] };
    if (data.Status !== 0) throw new Error("DNS lookup failed");
    return (data.Answer ?? []).filter(a => a.type === 1 || a.type === 28).map(a => a.data);
  }));
  const addresses = answers.flat();
  if (!addresses.length || addresses.some(a => !isPublicAddress(a))) throw new Error("Non-public or unresolved host");
}

async function readPage(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let html = "", bytes = 0;
  try {
    while (bytes < 65536) {
      const part = await reader.read();
      if (part.done) break;
      const slice = part.value.subarray(0, 65536 - bytes);
      bytes += slice.length;
      html += decoder.decode(slice, { stream: true });
    }
    return html + decoder.decode();
  } finally { await reader.cancel().catch(() => undefined); }
}

type FetchedPage = { status: number; contentType: string; html: string; finalUrl: string };

/** Fetch one public page: DNS validated on every hop, manual redirects (max 3), body capped. */
export async function fetchPublicPage(value: string, signal: AbortSignal, request: typeof fetch = fetch): Promise<FetchedPage> {
  let url = publicWebsiteUrl(value);
  for (let hop = 0; hop <= 3; hop++) {
    await verifyPublicDns(url, signal, request);
    const response = await request(url.href, { redirect: "manual", signal, headers: { Accept: "text/html", "User-Agent": "ApexWebsiteCheck/1.0" }, credentials: "omit" });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || hop === 3) throw new Error("Redirect could not be verified");
      url = publicWebsiteUrl(new URL(location, url).href);
      continue;
    }
    const html = response.ok ? await readPage(response) : "";
    if (!response.ok) await response.body?.cancel();
    return { status: response.status, contentType: response.headers.get("content-type") ?? "", html, finalUrl: url.href };
  }
  throw new Error("Redirect limit");
}

/** No cookies, auth headers, scripts or automatic redirects are sent to prospect sites. */
export async function checkWebsite(value: string, request: typeof fetch = fetch): Promise<WebsiteCheck> {
  const checked = new Date().toISOString();
  if (!value.trim()) return { website_status: "no_website", website_checked_at: checked, website_check_note: "No website listed on Google." };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const page = await fetchPublicPage(value, controller.signal, request);
    return { ...classifyWebsiteResponse(page.status, page.contentType, page.html), website_checked_at: checked };
  } catch {
    return { website_status: "uncertain", website_checked_at: checked, website_check_note: controller.signal.aborted ? "Site timed out during the check; it may still work in a browser." : "Site could not be safely reached or verified; this does not mean it has no website." };
  } finally { clearTimeout(timeout); }
}

/** Read the homepage plus up to 3 same-site key pages (contact/about/services) for a deep audit. */
export async function crawlSite(value: string, request: typeof fetch = fetch): Promise<{ url: string; html: string }[]> {
  const { pickKeyLinks } = await import("./site-audit");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const home = await fetchPublicPage(value, controller.signal, request);
    if (!home.html) return [];
    const pages = [{ url: home.finalUrl, html: home.html }];
    const links = pickKeyLinks(home.html, home.finalUrl, 3);
    const extra = await Promise.all(links.map(async link => {
      try { const p = await fetchPublicPage(link, controller.signal, request); return p.html ? { url: p.finalUrl, html: p.html } : null; } catch { return null; }
    }));
    for (const p of extra) if (p && !pages.some(x => x.url === p.url)) pages.push(p);
    return pages;
  } catch { return []; } finally { clearTimeout(timeout); }
}

export async function mapWebsiteChecks<T>(rows: T[], check: (row: T) => Promise<T>): Promise<T[]> {
  const results = [...rows];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, rows.length) }, async () => {
    while (next < rows.length) {
      const index = next++;
      const row = rows[index];
      if (row !== undefined) results[index] = await check(row);
    }
  }));
  return results;
}