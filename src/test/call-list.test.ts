import { describe, expect, it } from "vitest";
import { callQueue, upcomingCalls, subscribers, matchesWebsiteFilter, safeHttpUrl } from "@/lib/call-list";

const row = (status: "queued" | "subscriber" | "dismissed", called_at: string | null, found_at: string) => ({ status, called_at, found_at });

describe("callQueue", () => {
  it("shows only uncalled queued businesses, newest search first", () => {
    const rows = [
      row("queued", null, "2026-03-02T00:00:00Z"),
      row("queued", "2026-03-01T10:00:00Z", "2026-03-01T00:00:00Z"), // called — hidden
      row("subscriber", null, "2026-03-01T00:00:00Z"),               // subscriber — not in queue
      row("dismissed", null, "2026-03-01T00:00:00Z"),                // dismissed — hidden
      row("queued", null, "2026-03-01T00:00:00Z"),
    ];
    const q = callQueue(rows);
    expect(q.map(r => r.found_at)).toEqual(["2026-03-02T00:00:00Z", "2026-03-01T00:00:00Z"]);
    expect(q.every(r => r.status === "queued" && !r.called_at)).toBe(true);
  });

  it("keeps subscribers on the board and hides dismissed", () => {
    const rows = [row("subscriber", null, "2026-03-01T00:00:00Z"), row("dismissed", null, "2026-03-01T00:00:00Z"), row("queued", null, "2026-03-01T00:00:00Z")];
    expect(subscribers(rows)).toHaveLength(1);
  });
});

describe("matchesWebsiteFilter", () => {
  it("filters already queued businesses without websites", () => {
    const rows = [
      { ...row("queued", null, "2026-03-01"), id: "existing-site", website: "https://stillwellsdallas.com/" },
      { ...row("queued", null, "2026-03-02"), id: "no-site", website: "" },
    ];
    expect(callQueue(rows, "none").map(r => r.id)).toEqual(["no-site"]);
    expect(callQueue(rows, "has").map(r => r.id)).toEqual(["existing-site"]);
    expect(callQueue(rows, "any")).toHaveLength(2);
    expect(callQueue(rows, "any")[0]?.id).toBe("no-site");
  });
  it("splits businesses by website presence, and 'any' keeps both", () => {
    expect(matchesWebsiteFilter("", "none")).toBe(true);
    expect(matchesWebsiteFilter("  ", "none")).toBe(true);
    expect(matchesWebsiteFilter("https://example.com", "none")).toBe(false);
    expect(matchesWebsiteFilter("https://example.com", "has")).toBe(true);
    expect(matchesWebsiteFilter("", "has")).toBe(false);
    expect(matchesWebsiteFilter("", "any")).toBe(true);
    expect(matchesWebsiteFilter("https://example.com", "any")).toBe(true);
  });
});

describe("upcomingCalls", () => {
  const queue = ["a", "b", "c", "d"].map(id => ({ ...row("queued", null, "2026-03-01"), id }));
  it("shows exactly three businesses when at least three are available", () => {
    expect(upcomingCalls(queue, []).map(r => r.id)).toEqual(["a", "b", "c"]);
  });
  it("moves a skipped business behind the other queued businesses", () => {
    expect(upcomingCalls(queue, ["b"]).map(r => r.id)).toEqual(["a", "c", "d"]);
    expect(upcomingCalls(queue, ["b", "a"]).map(r => r.id)).toEqual(["c", "d", "b"]);
  });
  it("does not duplicate businesses when fewer than three remain", () => {
    expect(upcomingCalls(queue.slice(0, 2), ["a"]).map(r => r.id)).toEqual(["b", "a"]);
  });
});

describe("randomCityFor", () => {
  it("returns a city from the chosen US state, accepting abbreviation or full name", async () => {
    const { randomCityFor, US_STATE_CITIES } = await import("@/lib/call-cities");
    for (const input of ["NV", "Nevada", "nevada"]) {
      const city = randomCityFor("US", input);
      expect(city).toBeTruthy();
      expect(US_STATE_CITIES["Nevada"]).toContain(city);
    }
  });

  it("returns a city from the country pool when no state is given, and null for unknown regions", async () => {
    const { randomCityFor, COUNTRY_CITIES } = await import("@/lib/call-cities");
    expect(COUNTRY_CITIES["AU"]).toContain(randomCityFor("AU", ""));
    expect(randomCityFor("XX", "")).toBeNull();
  });
});

describe("safeHttpUrl", () => {
  it("makes web addresses clickable, including bare domains", () => {
    expect(safeHttpUrl("https://www.travelyosemite.com/winter/curry-village?utm_source=google")).toBe("https://www.travelyosemite.com/winter/curry-village?utm_source=google");
    expect(safeHttpUrl("http://acme-plumbing.com")).toBe("http://acme-plumbing.com");
    expect(safeHttpUrl("acme.com/plumbing")).toBe("https://acme.com/plumbing");
  });

  it("leaves non-web values as plain text", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<h1>hi</h1>")).toBeNull();
    expect(safeHttpUrl("mailto:owner@example.com")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl("   ")).toBeNull();
    expect(safeHttpUrl("call me later")).toBeNull();
  });
});

import { callQueue as stableQueue } from "@/lib/call-list";
describe("queue order stays put after a refresh", () => {
  it("keeps businesses from the same search in the same order regardless of load order", () => {
    const base = { status: "queued" as const, called_at: null, found_at: "2026-10-10T16:54:32Z", website_status: "reachable" as const, website: "" };
    const a = { ...base, id: "a" }, b = { ...base, id: "b" }, c = { ...base, id: "c" };
    expect(stableQueue([c, a, b]).map(r => r.id)).toEqual(["a", "b", "c"]);
    expect(stableQueue([b, c, a]).map(r => r.id)).toEqual(["a", "b", "c"]);
  });
});
