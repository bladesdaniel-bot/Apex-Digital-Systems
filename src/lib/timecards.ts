/** Browser-safe timecard rules. A shift with no activity for IDLE_MINUTES counts as ended at its last activity. */
export const IDLE_MINUTES = 30;

export type Shift = { clock_in: string; last_seen: string; clock_out: string | null };

/** Effective end time: explicit clock-out, else last activity once idle, else null (still working). */
export function shiftEnd(s: Shift, now = new Date()): Date | null {
  if (s.clock_out) return new Date(s.clock_out);
  const last = new Date(s.last_seen);
  return now.getTime() - last.getTime() > IDLE_MINUTES * 60_000 ? last : null;
}

export function shiftMinutes(s: Shift, now = new Date()): number {
  const end = shiftEnd(s, now) ?? now;
  return Math.max(0, Math.round((end.getTime() - new Date(s.clock_in).getTime()) / 60_000));
}

export function formatDuration(min: number): string {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
