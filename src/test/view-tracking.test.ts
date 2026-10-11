import { describe, it, expect } from "vitest";
import { shouldSkipTracking, EXCLUDE_KEY } from "@/components/ViewCounter";

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe("view tracking bypass", () => {
  it("tracks normal visits", () => {
    expect(shouldSkipTracking("", mem())).toBe(false);
  });
  it("?exclude_tracking=true sets a persistent flag and skips", () => {
    const s = mem();
    expect(shouldSkipTracking("?exclude_tracking=true", s)).toBe(true);
    expect(s.getItem(EXCLUDE_KEY)).toBe("true");
    expect(shouldSkipTracking("", s)).toBe(true);
  });
});
