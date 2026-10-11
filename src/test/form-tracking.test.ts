import { describe, it, expect, vi } from "vitest";
import { trackFormSubmission, EXCLUDE_KEY } from "@/components/ViewCounter";

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe("form submission tracking", () => {
  it("increments the submission count for normal visitors", () => {
    const increment = vi.fn();
    trackFormSubmission("", mem(), increment);
    expect(increment).toHaveBeenCalledTimes(1);
  });

  it("skips the increment when the exclude_tracking flag is set", () => {
    const s = mem();
    s.setItem(EXCLUDE_KEY, "true");
    const increment = vi.fn();
    trackFormSubmission("", s, increment);
    expect(increment).not.toHaveBeenCalled();
  });

  it("?exclude_tracking=true sets the flag and skips the increment", () => {
    const s = mem();
    const increment = vi.fn();
    trackFormSubmission("?exclude_tracking=true", s, increment);
    expect(s.getItem(EXCLUDE_KEY)).toBe("true");
    expect(increment).not.toHaveBeenCalled();
  });
});
