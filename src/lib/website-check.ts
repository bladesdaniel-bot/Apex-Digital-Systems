export type WebsiteStatus = "unchecked" | "no_website" | "reachable" | "unavailable" | "uncertain";
export type WebsiteCheck = { website_status: WebsiteStatus; website_checked_at: string; website_check_note: string };

/** A successful response alone is not enough: empty shells and parking pages are not verified sites. */
export function classifyWebsiteResponse(status: number, contentType: string, html: string): Pick<WebsiteCheck, "website_status" | "website_check_note"> {
  if ([404, 410].includes(status)) return { website_status: "unavailable", website_check_note: `Listed website returned HTTP ${status}.` };
  if (status < 200 || status >= 300) return { website_status: "uncertain", website_check_note: `Site returned HTTP ${status}; it may block automated checks.` };
  if (!contentType.toLowerCase().includes("text/html")) return { website_status: "uncertain", website_check_note: "Address did not return a website page." };
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  if (/domain (?:is )?for sale|buy this domain|website coming soon|default web (?:site|page)|welcome to nginx|account suspended/i.test(title)) {
    return { website_status: "unavailable", website_check_note: "Listed website appears to show a placeholder, parked domain, or suspended site." };
  }
  const text = html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&[a-z0-9#]+;/gi, " ").replace(/\s+/g, " ").trim();
  if (/just a moment|checking your browser|verify you are human|access denied|captcha/i.test(title)) return { website_status: "uncertain", website_check_note: "Site requires a browser or human verification." };
  if (text.length < 40) return { website_status: "uncertain", website_check_note: "Page was blank or needs JavaScript; a working site could not be confirmed." };
  return { website_status: "reachable", website_check_note: "Website responded with page content. This is a reachability check, not a full website audit." };
}