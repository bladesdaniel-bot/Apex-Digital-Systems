import { describe, it, expect } from "vitest";
import { activeTheme, scheduledTheme, thanksgivingDay } from "@/lib/seasonal-themes";

const at = (s: string) => new Date(`${s}T12:00:00-07:00`);
const auto = { halloween: "auto", thanksgiving: "auto", christmas: "auto" } as const;

describe("seasonal schedule", () => {
  it("Halloween runs Oct 1 to Oct 31", () => {
    expect(scheduledTheme(at("2026-09-30"))).toBeNull();
    expect(scheduledTheme(at("2026-10-01"))).toBe("halloween");
    expect(scheduledTheme(at("2026-10-31"))).toBe("halloween");
  });
  it("Thanksgiving runs Nov 1 through Thanksgiving Day", () => {
    expect(thanksgivingDay(2026)).toBe(26);
    expect(scheduledTheme(at("2026-11-01"))).toBe("thanksgiving");
    expect(scheduledTheme(at("2026-11-26"))).toBe("thanksgiving");
  });
  it("Christmas runs the day after Thanksgiving until Jan 1", () => {
    expect(scheduledTheme(at("2026-11-27"))).toBe("christmas");
    expect(scheduledTheme(at("2026-12-31"))).toBe("christmas");
    expect(scheduledTheme(new Date("2027-01-01T12:00:00-08:00"))).toBeNull();
  });
  it("Off blocks the automatic schedule; On forces a theme", () => {
    expect(activeTheme({ ...auto, halloween: "off" }, at("2026-10-15"))).toBeNull();
    expect(activeTheme({ ...auto, christmas: "on" }, at("2026-07-04"))).toBe("christmas");
  });
});
