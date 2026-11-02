/** Customer-prepaid ad funds: pass-through ad spend, never commissionable. Browser-safe. */
export const AD_FUND_MIN = 25;
export const AD_FUND_MAX = 25000;
export const AD_FUND_PRESETS = [250, 500, 1000, 2500];

export type AdFund = { id: string; amount: number; status: string; created_at: string; paid_at: string | null };

export function validAdFundAmount(n: number) {
  return Number.isFinite(n) && n >= AD_FUND_MIN && n <= AD_FUND_MAX && Math.round(n * 100) === n * 100;
}

/** Only settled deposits count toward the prepaid balance. */
export function adFundBalance(rows: Pick<AdFund, "amount" | "status">[]) {
  return rows.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
}
