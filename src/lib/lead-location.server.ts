// ============= Server-only: capture a lead's approximate location =============
// Runs inside the lead submission handler, where the real request headers are
// available. The browser never sends an IP address — it is read here so the
// admin page can show where each request came from.
import { isIP } from "node:net";
import { clientIpFromHeaders, geoForIp } from "./geo.server";

export type LeadLocation = { ip_address: string; city: string; region: string; country: string };

/**
 * The submitter's IP and approximate location. `db` is any client that can read
 * the visitor_logs table, so a location already found for a returning IP is
 * reused instead of asking the lookup service again. Never throws: a missing IP
 * or a failed lookup just leaves those fields empty.
 */
export async function leadLocation(db: any): Promise<LeadLocation> {
  let ip = "";

  // Headers first: in production Cloudflare sets the real client address there.
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    ip = clientIpFromHeaders(name => getRequestHeader(name) ?? null);
  } catch {
    // No request context (e.g. a background job) — nothing to read.
  }

  // Fall back to the platform's own view of the connection.
  if (!isIP(ip)) {
    try {
      const { getRequestIP } = await import("@tanstack/react-start/server");
      const fromPlatform = String(getRequestIP() ?? "").split(",")[0]?.trim() || "";
      if (isIP(fromPlatform)) ip = fromPlatform;
    } catch {
      // Not every host exposes a socket address.
    }
  }

  if (!ip) return { ip_address: "", city: "", region: "", country: "" };
  return { ip_address: ip, ...(await geoForIp(ip, db)) };
}
