import { describe, expect, it } from "vitest";
import { afterFailedCharge, nextInstallmentAt } from "@/lib/installments";

const day = 86_400_000;
const now = new Date("2026-10-10T12:00:00Z");

describe("automatic split-payment charging", () => {
  it("schedules the next part 30 days after a payment", () => {
    expect(nextInstallmentAt(now, 1, 4)?.getTime()).toBe(now.getTime() + 30 * day);
  });
  it("stops scheduling once every part is paid", () => {
    expect(nextInstallmentAt(now, 4, 4)).toBeNull();
  });
  it("retries a declined card 3 days later", () => {
    expect(afterFailedCharge(now, 0)).toEqual({ failures: 1, retryAt: new Date(now.getTime() + 3 * day) });
  });
  it("stops retrying after the third decline", () => {
    expect(afterFailedCharge(now, 2)).toEqual({ failures: 3, retryAt: null });
  });
});
