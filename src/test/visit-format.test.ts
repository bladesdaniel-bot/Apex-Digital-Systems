import { describe, expect, it } from "vitest";
import { deviceType, ptDate, ptDayKey, ptTime } from "@/lib/visit-format";

describe("visit timestamps in Pacific Time", () => {
  it("formats date and time like Oct 8, 2026 / 4:48:12 PM", () => {
    const iso = "2026-10-08T23:48:12Z"; // 4:48:12 PM PDT
    expect(ptDate(iso)).toBe("Oct 8, 2026");
    expect(ptTime(iso)).toBe("4:48:12 PM");
  });
  it("uses the Pacific calendar day for filters", () => {
    expect(ptDayKey("2026-10-09T03:00:00Z")).toBe("2026-10-08");
  });
});

describe("device type", () => {
  it("detects phones, tablets and desktops", () => {
    expect(deviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile")).toBe("mobile");
    expect(deviceType("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(deviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
  });
});
