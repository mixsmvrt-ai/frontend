"use client";

import { useEffect, useState } from "react";

export interface BackendStepStatus {
  name: string;
  completed: boolean;
}

export interface BackendJobStatus {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  current_stage?: string | null;
  error_message?: string | null;
  output_files?: Record<string, any> | null;
  steps?: BackendStepStatus[] | null;
}

interface UseBackendJobStatusOptions {
  pollIntervalMs?: number;
  onComplete?: (status: BackendJobStatus) => void;
  onError?: (status: BackendJobStatus | null, error: unknown) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export function useBackendJobStatus(
  jobId: string | null,
  { pollIntervalMs = 800, onComplete, onError }: UseBackendJobStatusOptions = {},
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
        const res = await fetch(`${BACKEND_URL}/status/${jobId}`);
        if (!res.ok) {
          throw new Error(`Status request failed with ${res.status}`);
        }
        const data = (await res.json()) as BackendJobStatus;
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

  return status;
}
