// Server-only IP + location helpers. Never import from browser code.

type Geo = { city: string; region: string; country: string };
const EMPTY_GEO: Geo = { city: "", region: "", country: "" };

/** The caller's real IP, taken only from trusted edge headers — never from the request body. */
export function clientIpFromHeaders(get: (name: string) => string | null): string {
  const fwd = get("x-forwarded-for")?.split(",")[0]?.trim();
  return (get("cf-connecting-ip") || fwd || get("x-real-ip") || "").slice(0, 64);
}

export function clientIp(req: Request): string {
  return clientIpFromHeaders(n => req.headers.get(n));
}

async function lookupGeo(ip: string): Promise<Geo> {
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : "");
  const attempt = async (url: string, pick: (j: Record<string, unknown>) => Geo) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "apex-visit-logger" } });
      if (!r.ok) return EMPTY_GEO;
      return pick((await r.json()) as Record<string, unknown>);
    } catch {
      return EMPTY_GEO;
    } finally {
      clearTimeout(t);
    }
  };
  const enc = encodeURIComponent(ip);
  // Primary: ipapi.co (limited free daily quota). Fallback: ip-api.com (free, per-minute limit).
  const a = await attempt(`https://ipapi.co/${enc}/json/`, j => ({ city: s(j["city"]), region: s(j["region"]), country: s(j["country_name"]) }));
  if (a.city) return a;
  return attempt(`http://ip-api.com/json/${enc}?fields=status,city,regionName,country`, j =>
    j["status"] === "success" ? { city: s(j["city"]), region: s(j["regionName"]), country: s(j["country"]) } : EMPTY_GEO);
}

/** Geolocates an IP, reusing a location we already found for it so repeat visitors never burn the lookup quota. */
export async function geoForIp(ip: string, db: any): Promise<Geo> {
  if (!ip) return EMPTY_GEO;
  try {
    const { data: known } = await db.from("visitor_logs").select("city, region, country").eq("ip_address", ip).neq("city", "").limit(1).maybeSingle();
    if (known?.city) return { city: known.city, region: known.region ?? "", country: known.country ?? "" };
  } catch { /* fall through to live lookup */ }
  return lookupGeo(ip);
}
