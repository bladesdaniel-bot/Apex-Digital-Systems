import { describe, expect, it } from "vitest";
import { approachingCallbacks } from "@/lib/callback-alerts";

const now = Date.parse("2026-10-27T15:00:00Z");
const at = (min: number) => new Date(now + min * 60_000).toISOString();
const row = (id: string, min: number, by = "me") => ({ id, status: "queued", called_at: null, callback_at: at(min), callback_by: by });

describe("approachingCallbacks", () => {
  it("alerts at 15 minutes before, not 16", () => {
    expect(approachingCallbacks([row("a", 15), row("b", 16)], "me", now).map(r => r.id)).toEqual(["a"]);
  });
  it("only alerts the rep who scheduled it", () => {
    expect(approachingCallbacks([row("a", 5, "other")], "me", now)).toEqual([]);
  });
});
