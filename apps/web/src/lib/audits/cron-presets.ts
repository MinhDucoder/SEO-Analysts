/**
 * Schedule frequency presets for the Create-schedule dialog.
 *
 * Each preset maps a friendly id to a 5-field cron expression accepted by the
 * gateway (BullMQ node-cron parser). The dialog renders these as chips so users
 * don't have to hand-write cron; advanced users can still type a raw expression.
 * The schedule table reuses {@link findSchedulePreset} to show a human label
 * instead of a raw `*∕15 * * * *`.
 */

export type SchedulePresetId =
  | "every15m"
  | "every30m"
  | "hourly"
  | "every3h"
  | "every6h"
  | "every12h"
  | "daily"
  | "weekly";

export interface SchedulePreset {
  id: SchedulePresetId;
  /** 5-field cron expression sent to the backend. */
  cron: string;
}

/** Ordered list backing the frequency chips (shortest interval first). */
export const SCHEDULE_PRESETS: readonly SchedulePreset[] = [
  { id: "every15m", cron: "*/15 * * * *" },
  { id: "every30m", cron: "*/30 * * * *" },
  { id: "hourly", cron: "0 * * * *" },
  { id: "every3h", cron: "0 */3 * * *" },
  { id: "every6h", cron: "0 */6 * * *" },
  { id: "every12h", cron: "0 */12 * * *" },
  { id: "daily", cron: "0 9 * * *" },
  { id: "weekly", cron: "0 9 * * MON" },
];

/** Default frequency for a new schedule — daily at 09:00. */
export const DEFAULT_SCHEDULE_CRON = "0 9 * * *";

/** Collapse leading/trailing and repeated whitespace to single spaces. */
function normaliseCron(cron: string): string {
  return cron.trim().replace(/\s+/g, " ");
}

/**
 * Find the preset whose cron matches `cron` (whitespace-normalised), or
 * `undefined` when the expression is custom (typed via the advanced field).
 */
export function findSchedulePreset(cron: string): SchedulePreset | undefined {
  const normalised = normaliseCron(cron);
  return SCHEDULE_PRESETS.find((preset) => preset.cron === normalised);
}
