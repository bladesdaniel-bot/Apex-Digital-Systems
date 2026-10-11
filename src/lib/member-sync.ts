// Pure mapping rules from Stripe billing data to the private members table.
export type MemberStatus = "active" | "past_due" | "canceled";

export function memberStatusFromSubscription(status: string): MemberStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid" || status === "incomplete" || status === "paused") return "past_due";
  return "canceled";
}

export function billingCycleFromInterval(interval: string | null | undefined): "monthly" | "annual" | "one-time" {
  if (interval === "month") return "monthly";
  if (interval === "year") return "annual";
  return "one-time";
}

export function centsToDollars(cents: number | null | undefined): number {
  return Math.round(cents ?? 0) / 100;
}

export function isoDate(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString().slice(0, 10) : null;
}
