"use client";

import { useEffect, useState } from "react";

export type JobStageId =
  | "analyze"
  | "detect-vocals"
  | "denoise"
  | "eq"
  | "compress"
  | "saturate"
  | "stereo"
  | "loudness"
  | "finalize";

export interface JobStatusResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  percentage: number; // 0-100
  current_stage: JobStageId;
  completed_stages: JobStageId[];
  error_message?: string | null;
  // optional track-level data
  tracks?: Array<{
    id: string;
    name: string;
    status: "pending" | "processing" | "completed" | "failed";
    percentage: number;
  }>;
}

interface UseJobStatusPollingOptions {
  pollIntervalMs?: number;
  onComplete?: (status: JobStatusResponse) => void;
  onError?: (status: JobStatusResponse | null, error: unknown) => void;
}

const DSP_URL = process.env.NEXT_PUBLIC_DSP_URL || "http://localhost:8001";

export function useJobStatusPolling(
  jobId: string | null,
  { pollIntervalMs = 700, onComplete, onError }: UseJobStatusPollingOptions = {},
) {
  const [status, setStatus] = useState<JobStatusResponse | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      return undefined;
    }

    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`${DSP_URL}/status/${jobId}`);
        if (!res.ok) {
          throw new Error(`Status request failed with ${res.status}`);
        }
        const data = (await res.json()) as JobStatusResponse;
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
