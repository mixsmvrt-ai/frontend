"use client";

import { useEffect, useState } from "react";

export interface BackendStepStatus {
  name: string;
  completed: boolean;
}

export interface BackendJobStatus {
  id: string;
  status: "pending" | "queued" | "processing" | "completed" | "failed";
  progress: number;
  current_stage?: string | null;
  error_message?: string | null;
  output_files?: Record<string, any> | null;
  output_download_url?: string | null;
  steps?: BackendStepStatus[] | null;
  estimated_total_sec?: number | null;
  elapsed_sec?: number | null;
   queue_feature_type?: string | null;
   queue_position?: number | null;
   queue_size?: number | null;
}

interface UseBackendJobStatusOptions {
  pollIntervalMs?: number;
  userId?: string | null;
  onComplete?: (status: BackendJobStatus) => void;
  onError?: (status: BackendJobStatus | null, error: unknown) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export function useBackendJobStatus(
  jobId: string | null,
  { pollIntervalMs = 800, userId = null, onComplete, onError }: UseBackendJobStatusOptions = {},
) {
  const [status, setStatus] = useState<BackendJobStatus | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      return undefined;
    }

    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        // Prefer legacy detailed /status endpoint when available, but
        // fall back to S3 job endpoint (/job/{id}) for the new async flow.
        let data: BackendJobStatus | null = null;

        const legacyRes = await fetch(`${BACKEND_URL}/status/${jobId}`);
        if (legacyRes.ok) {
          data = (await legacyRes.json()) as BackendJobStatus;
        } else if (userId) {
          const s3Res = await fetch(
            `${BACKEND_URL}/job/${jobId}?user_id=${encodeURIComponent(userId)}`,
          );
          if (!s3Res.ok) {
            throw new Error(`Status request failed with ${s3Res.status}`);
          }

          const s3Data = (await s3Res.json()) as {
            status: "pending" | "processing" | "completed" | "failed";
            output_download_url?: string | null;
            error_message?: string | null;
          };

          const progressByStatus: Record<string, number> = {
            pending: 10,
            processing: 65,
            completed: 100,
            failed: 100,
          };

          data = {
            id: jobId,
            status: s3Data.status,
            progress: progressByStatus[s3Data.status] ?? 0,
            current_stage:
              s3Data.status === "pending"
                ? "Queued"
                : s3Data.status === "processing"
                  ? "Processing"
                  : s3Data.status === "completed"
                    ? "Complete"
                    : "Failed",
            error_message: s3Data.error_message ?? null,
            output_download_url: s3Data.output_download_url ?? null,
            steps: null,
          };
        } else {
          throw new Error(`Status request failed with ${legacyRes.status}`);
        }

        if (!data) {
          throw new Error("Failed to resolve backend job status");
        }

        if (!isActive) return;

        setStatus(data);

        if (data.status === "completed") {
          onComplete?.(data);
          return;
        }

        if (data.status === "failed") {
          onError?.(data, new Error(data.error_message || "Job failed"));
          return;
        }

        timeoutId = setTimeout(poll, pollIntervalMs);
      } catch (error) {
        if (!isActive) return;
        onError?.(status, error);
        timeoutId = setTimeout(poll, pollIntervalMs * 2);
      }
    };

    void poll();

    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [jobId, pollIntervalMs, onComplete, onError]);
  }, [jobId, pollIntervalMs, userId, onComplete, onError]);

  return status;
}
