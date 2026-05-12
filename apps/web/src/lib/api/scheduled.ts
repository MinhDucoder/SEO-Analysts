import { api } from "@/lib/api/client";

export type ScheduledMode = "single" | "site";

/**
 * Mirrors `ScheduledAuditDto` from the gateway `/scheduled-audits`
 * endpoint family. Sorted desc by createdAt server-side.
 */
export interface ScheduledAudit {
  id: string;
  userId: string;
  url: string;
  cron: string;
  mode: ScheduledMode;
  maxUrls: number | null;
  targetKeyword: string | null;
  lastRunAt: string | null;
  lastScore: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledAuditDto {
  url: string;
  cron: string;
  mode?: ScheduledMode;
  maxUrls?: number;
  targetKeyword?: string;
}

export async function listScheduledAudits(): Promise<ScheduledAudit[]> {
  return api.get("scheduled-audits").json<ScheduledAudit[]>();
}

export async function createScheduledAudit(
  body: CreateScheduledAuditDto,
): Promise<ScheduledAudit> {
  return api.post("scheduled-audits", { json: body }).json<ScheduledAudit>();
}

export async function pauseScheduledAudit(id: string): Promise<ScheduledAudit> {
  return api.patch(`scheduled-audits/${id}/pause`).json<ScheduledAudit>();
}

export async function resumeScheduledAudit(id: string): Promise<ScheduledAudit> {
  return api.patch(`scheduled-audits/${id}/resume`).json<ScheduledAudit>();
}

export async function deleteScheduledAudit(id: string): Promise<void> {
  await api.delete(`scheduled-audits/${id}`);
}
