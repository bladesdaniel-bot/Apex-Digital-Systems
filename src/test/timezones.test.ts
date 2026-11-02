import { describe, expect, it } from "vitest";
import { guessTimezone, zonedToIso } from "@/lib/timezones";
import { ptTime } from "@/lib/visit-format";

describe("callback timezones", () => {
  it("detects Eastern from a Florida address", () => {
    expect(guessTimezone("123 Main St, Miami, FL 33101")).toBe("America/New_York");
  });
  it("8:00 AM Eastern becomes 5:00 AM Pacific", () => {
    expect(ptTime(zonedToIso("2026-11-03T08:00", "America/New_York"))).toBe("5:00:00 AM");
  });
  it("falls back to Pacific when no state is found", () => {
    expect(guessTimezone("somewhere")).toBe("America/Los_Angeles");
  });
});

import { threeTimes } from "@/lib/timezones";
describe("three-zone display", () => {
  it("shows office, customer and rep times for one moment", () => {
    const iso = zonedToIso("2026-11-03T08:00", "America/New_York");
    expect(threeTimes(iso, "America/New_York", guessTimezone("Dallas, TX"))).toBe("5:00 AM PST Reno office · 8:00 AM EST customer · 7:00 AM CST rep");
  });
});
