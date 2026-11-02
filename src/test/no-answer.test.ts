import { describe, it, expect } from "vitest";
import { callQueue, noAnswerPool } from "@/lib/call-list";
const row = (id: string, no_answer_at: string | null) => ({ id, status: "queued" as const, called_at: null, found_at: "2026-01-01", website_status: "ok" as any, no_answer_at });
describe("No Answer pool", () => {
  it("keeps no-answer businesses out of the queue and in the pool", () => {
    const rows = [row("a", null), row("b", "2026-10-16T10:00:00Z")];
    expect(callQueue(rows).map(r => r.id)).toEqual(["a"]);
    expect(noAnswerPool(rows).map(r => r.id)).toEqual(["b"]);
  });
});
