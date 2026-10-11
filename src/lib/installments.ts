// Browser-safe rules for automatically charging the remaining parts of a split-payment quote.
export const INSTALLMENT_INTERVAL_DAYS = 30;
export const RETRY_AFTER_DAYS = 3;
export const MAX_CHARGE_FAILURES = 3;

const DAY = 86_400_000;

/** When the next part is due after a successful payment, or null when the plan is finished. */
export function nextInstallmentAt(paidAt: Date, installmentsPaid: number, installments: number): Date | null {
  return installmentsPaid < installments ? new Date(paidAt.getTime() + INSTALLMENT_INTERVAL_DAYS * DAY) : null;
}

/** After a declined card: retry a few days later, then stop and leave it to the owner. */
export function afterFailedCharge(now: Date, failuresSoFar: number): { failures: number; retryAt: Date | null } {
  const failures = failuresSoFar + 1;
  return { failures, retryAt: failures >= MAX_CHARGE_FAILURES ? null : new Date(now.getTime() + RETRY_AFTER_DAYS * DAY) };
}
