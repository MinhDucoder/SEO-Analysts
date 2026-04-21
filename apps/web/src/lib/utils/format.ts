import dayjs from "dayjs";
import "dayjs/locale/vi";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("vi");

/**
 * Render a numeric SEO score (0-100). Returns "—" for null/undefined so the
 * caller does not have to branch on missing values.
 */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Math.round(value).toString();
}

/**
 * Render a duration (milliseconds) in Vietnamese: "15 giây", "2 phút", "1 giờ".
 * Resolution steps at natural boundaries so short audits read as seconds.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms) || ms < 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} giây`;
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const totalHours = Math.round(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours} giờ`;
  const totalDays = Math.round(totalHours / 24);
  return `${totalDays} ngày`;
}

/**
 * Render a relative timestamp in Vietnamese: "2 giờ trước", "3 phút trước".
 * Accepts ISO strings, Date objects, or dayjs-compatible inputs.
 */
export function formatRelativeDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = dayjs(input);
  if (!d.isValid()) return "—";
  return d.fromNow();
}

/**
 * Render an absolute Vietnamese timestamp: "18/04/2026 15:30".
 */
export function formatAbsoluteDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = dayjs(input);
  if (!d.isValid()) return "—";
  return d.format("DD/MM/YYYY HH:mm");
}
