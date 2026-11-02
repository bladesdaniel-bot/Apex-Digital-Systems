/** Minutes before a call-back time when the scheduling rep gets an on-screen alert and chime. */
export const CALLBACK_ALERT_MINUTES = 15;

type Row = { id: string; status: string; called_at: string | null; callback_at: string | null; callback_by?: string | null };

/** Call-backs the given rep scheduled that are due within the alert window (or already due). */
export function approachingCallbacks<T extends Row>(rows: T[], userId: string | null, now: number = Date.now()): T[] {
  if (!userId) return [];
  const limit = now + CALLBACK_ALERT_MINUTES * 60_000;
  return rows
    .filter(r => r.status === "queued" && !r.called_at && r.callback_at && r.callback_by === userId && new Date(r.callback_at).getTime() <= limit)
    .sort((a, b) => new Date(a.callback_at!).getTime() - new Date(b.callback_at!).getTime());
}
