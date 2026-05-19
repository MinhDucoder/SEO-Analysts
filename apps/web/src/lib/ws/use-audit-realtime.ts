"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuditStatus, type AuditProgressEvent } from "@repo/shared";
import { getSocket } from "@/lib/ws/client";
import { queryKeys } from "@/lib/queries/keys";
import type { AuditStatusResponse } from "@/lib/api/types";

export interface AuditRealtimeState {
  /** True once the server's ack for `audit:subscribe` has come back. */
  subscribed: boolean;
  /** Last progress payload received (or null pre-message). */
  latest: AuditProgressEvent | null;
}

/**
 * Subscribe to gateway WebSocket audit events for a specific auditId.
 *
 *   - `audit:progress` → patches the `queryKeys.audits.status(id)` cache so
 *     any consumer reading the polling query sees the freshest stage +
 *     progress without an HTTP round trip.
 *   - `audit:completed` / `audit:failed` → invalidates the detail query so
 *     the page refetches `GET /audits/:id` and gets the final report.
 *
 * Returns `subscribed` + `latest` so the caller can render a stage label
 * before any HTTP status query has settled.
 */
export function useAuditRealtime(auditId: string | null | undefined): AuditRealtimeState {
  const queryClient = useQueryClient();
  const [state, setState] = React.useState<AuditRealtimeState>({
    subscribed: false,
    latest: null,
  });

  React.useEffect(() => {
    if (!auditId) return;
    const socket = getSocket();
    let active = true;

    const handleProgress = (event: AuditProgressEvent) => {
      if (!active || event.auditId !== auditId) return;
      setState((prev) => ({ ...prev, latest: event }));
      // Patch the status cache with the freshest snapshot so any
      // consumer reading useAuditStatus picks it up immediately.
      queryClient.setQueryData<AuditStatusResponse>(
        queryKeys.audits.status(auditId),
        (prev) => ({
          auditId,
          status: event.status,
          progress: event.progress,
          stage: event.stage,
          seoScore: prev?.seoScore,
        }),
      );
    };

    const handleCompleted = (event: { auditId: string }) => {
      if (!active || event.auditId !== auditId) return;
      setState((prev) => ({
        ...prev,
        latest: prev.latest
          ? { ...prev.latest, status: AuditStatus.COMPLETED, progress: 100 }
          : prev.latest,
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.detail(auditId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.status(auditId) });
    };

    const handleFailed = (event: { auditId: string }) => {
      if (!active || event.auditId !== auditId) return;
      setState((prev) => ({
        ...prev,
        latest: prev.latest
          ? { ...prev.latest, status: AuditStatus.FAILED }
          : prev.latest,
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.detail(auditId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.status(auditId) });
    };

    socket.on("audit:progress", handleProgress);
    socket.on("audit:completed", handleCompleted);
    socket.on("audit:failed", handleFailed);

    socket.emit("audit:subscribe", { auditId }, (ack: { joined?: string; error?: string }) => {
      if (active && ack?.joined) {
        setState((prev) => ({ ...prev, subscribed: true }));
      }
    });

    return () => {
      active = false;
      socket.off("audit:progress", handleProgress);
      socket.off("audit:completed", handleCompleted);
      socket.off("audit:failed", handleFailed);
      socket.emit("audit:unsubscribe", { auditId });
    };
  }, [auditId, queryClient]);

  return state;
}
