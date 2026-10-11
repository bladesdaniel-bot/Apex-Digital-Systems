import { describe, expect, it, vi } from "vitest";
import { classifyWebsiteResponse } from "@/lib/website-check";
import { checkWebsite, isPublicAddress, publicWebsiteUrl } from "@/lib/website-check.server";
import { callQueue } from "@/lib/call-list";

describe("automatic pre-queue website checks", () => {
  it("confirms actual HTML content rather than a blank response", () => {
    expect(classifyWebsiteResponse(200, "text/html", "<html><title>Local Plumbing</title><body>Call our experienced local plumbers for drain cleaning, repairs and emergency service.</body></html>").website_status).toBe("reachable");
    expect(classifyWebsiteResponse(200, "text/html", "").website_status).toBe("uncertain");
  });
  it("does not label blocked sites as nonexistent", () => {
    expect(classifyWebsiteResponse(403, "text/html", "").website_status).toBe("uncertain");
    expect(classifyWebsiteResponse(404, "text/html", "").website_status).toBe("unavailable");
    expect(classifyWebsiteResponse(200, "text/html", "<title>Domain for sale</title>").website_status).toBe("unavailable");
  });
  it("keeps unchecked sites out of the callers queue and failed sites out of no-website leads", () => {
    const rows = [
      { id: "pending", status: "queued" as const, called_at: null, found_at: "2026-10-08", website: "https://business.org", website_status: "unchecked" as const },
      { id: "failed", status: "queued" as const, called_at: null, found_at: "2026-10-08", website: "https://other.org", website_status: "unavailable" as const },
      { id: "none", status: "queued" as const, called_at: null, found_at: "2026-10-08", website: "", website_status: "no_website" as const },
    ];
    expect(callQueue(rows).map(r => r.id)).toEqual(["failed", "none"]);
    expect(callQueue(rows, "none").map(r => r.id)).toEqual(["none"]);
  });
  it("rejects private, reserved and encoded IP destinations", () => {
    for (const value of ["http://127.0.0.1", "http://2130706433", "http://[::1]", "http://localhost", "http://a.internal", "https://user:password@business.org", "https://business.org:8080"]) expect(() => publicWebsiteUrl(value)).toThrow();
    for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "100.64.0.1", "192.168.1.1", "::1", "fd00::1", "::ffff:127.0.0.1"]) expect(isPublicAddress(ip)).toBe(false);
    expect(isPublicAddress("8.8.8.8")).toBe(true);
  });
  it("checks redirects before fetching and never requests local services", async () => {
    const request = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://cloudflare-dns.com/")) return Response.json({ Status: 0, Answer: [{ type: 1, data: "8.8.8.8" }] });
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/" } });
    });
    expect((await checkWebsite("https://business.org", request)).website_status).toBe("uncertain");
    expect(request.mock.calls.some(([url]) => String(url).includes("127.0.0.1"))).toBe(false);
  });
  it("does not fetch a hostname resolving to a private address", async () => {
    const request = vi.fn(async () => Response.json({ Status: 0, Answer: [{ type: 1, data: "10.0.0.1" }] }));
    expect((await checkWebsite("https://business.org", request)).website_status).toBe("uncertain");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not make a website up when Google has none listed", async () => {
    const request = vi.fn();
    expect((await checkWebsite("", request)).website_status).toBe("no_website");
    expect(request).not.toHaveBeenCalled();
  });
});