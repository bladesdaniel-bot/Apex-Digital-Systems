import { describe, expect, it } from "vitest";
import { billingCycleFromInterval, centsToDollars, memberStatusFromSubscription } from "@/lib/member-sync";

describe("member sync rules", () => {
  it("portal cancellation marks member canceled", () => {
    expect(memberStatusFromSubscription("canceled")).toBe("canceled");
  });
  it("failed renewal marks member past due", () => {
    expect(memberStatusFromSubscription("past_due")).toBe("past_due");
  });
  it("active subscription keeps member active", () => {
    expect(memberStatusFromSubscription("active")).toBe("active");
  });
  it("monthly price maps to monthly cycle", () => {
    expect(billingCycleFromInterval("month")).toBe("monthly");
    expect(billingCycleFromInterval(undefined)).toBe("one-time");
  });
  it("$125 care plan in cents converts to dollars", () => {
    expect(centsToDollars(12500)).toBe(125);
  });
});
