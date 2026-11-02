import { describe, it, expect } from "vitest";
import { shiftEnd, shiftMinutes, formatDuration } from "@/lib/timecards";

const now = new Date("2026-10-12T20:00:00Z");
describe("timecards", () => {
  it("sign-out time ends the shift", () => {
    expect(shiftMinutes({ clock_in: "2026-10-12T16:00:00Z", last_seen: "2026-10-12T18:00:00Z", clock_out: "2026-10-12T18:30:00Z" }, now)).toBe(150);
  });
  it("active shift (recent activity) is still open", () => {
    expect(shiftEnd({ clock_in: "2026-10-12T19:00:00Z", last_seen: "2026-10-12T19:50:00Z", clock_out: null }, now)).toBeNull();
  });
  it("idle over 30 minutes ends at last activity", () => {
    const s = { clock_in: "2026-10-12T16:00:00Z", last_seen: "2026-10-12T17:00:00Z", clock_out: null };
    expect(shiftEnd(s, now)?.toISOString()).toBe("2026-10-12T17:00:00.000Z");
    expect(shiftMinutes(s, now)).toBe(60);
  });
  it("formats hours", () => expect(formatDuration(125)).toBe("2h 05m"));
});
