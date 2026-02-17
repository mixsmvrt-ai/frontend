"use client";

import { useMemo } from "react";
import {
  type BackendJobStatus,
  useBackendJobStatus,
} from "./useBackendJobStatus";
import {
  type FlowKey,
  type LabeledFlowStep,
  type PresetLabelContext,
  getFlowSteps,
} from "./flowSteps";

export type ProcessingJobPhase = "idle" | "queued" | "processing" | "completed" | "failed";

export interface ProcessingJobStep extends LabeledFlowStep {
  index: number;
  total: number;
  completed: boolean;
  isActive: boolean;
}

export interface ProcessingJobState {
  jobId: string | null;
  phase: ProcessingJobPhase;
  flow: FlowKey | null;
  steps: ProcessingJobStep[];
  overallProgress: number;
  currentStepKey: string | null;
  currentStepLabel: string | null;
  helperText: string | null;
  queuePosition: number | null;
  queueSize: number | null;
  estimatedTotalSec: number | null;
  elapsedSec: number | null;
  remainingSec: number | null;
  errorMessage: string | null;
}

interface UseProcessingJobOptions {
  flow: FlowKey | null;
  userId?: string | null;
  presetLabelContext?: PresetLabelContext | null;
  pollIntervalMs?: number;
  onComplete?: (status: BackendJobStatus) => void;
  onError?: (status: BackendJobStatus | null, error: unknown) => void;
}

/**
 * Hook that subscribes to backend processing job updates and
 * projects them into a UI-friendly shape for the Studio overlay.
 */
export function useProcessingJob(
  jobId: string | null,
  options: UseProcessingJobOptions,
): { backend: BackendJobStatus | null; ui: ProcessingJobState } {
  const { flow, userId, presetLabelContext, pollIntervalMs, onComplete, onError } = options;

  const backendStatus = useBackendJobStatus(jobId, {
    pollIntervalMs,
    userId,
    onComplete,
    onError,
  });

  const uiState: ProcessingJobState = useMemo(() => {
    const phase: ProcessingJobPhase = (() => {
      if (!jobId) return "idle";
      if (!backendStatus) return "queued";
      if (backendStatus.status === "pending") return "queued";
      return backendStatus.status;
    })();

    const labeledSteps: LabeledFlowStep[] = flow
      ? getFlowSteps(flow, presetLabelContext)
      : [];

    const total = labeledSteps.length;

    // Map backend step completion flags by index onto the configured steps.
    const backendSteps = backendStatus?.steps ?? null;
    const steps: ProcessingJobStep[] = labeledSteps.map((step, index) => {
      const backendStep = backendSteps && backendSteps[index];
      const completed = backendStep ? Boolean(backendStep.completed) : false;
      return {
        ...step,
        index,
        total,
        completed,
        isActive: false, // filled in below
      };
    });

    // Determine the active step: prefer backend current_stage when present,
    // otherwise fall back to the first incomplete step.
    let activeIndex: number | null = null;
    if (backendStatus?.current_stage && steps.length) {
      const byName = steps.findIndex(
        (s) => s.label === backendStatus.current_stage || s.baseLabel === backendStatus.current_stage,
      );
      if (byName >= 0) {
        activeIndex = byName;
      }
    }

    if (activeIndex === null && steps.length) {
      const firstIncomplete = steps.findIndex((s) => !s.completed);
      activeIndex = firstIncomplete >= 0 ? firstIncomplete : steps.length - 1;
    }

    if (activeIndex !== null) {
      steps[activeIndex] = {
        ...steps[activeIndex],
        isActive: true,
      };
    }

    const current = activeIndex !== null ? steps[activeIndex] : null;

    const overallProgress = typeof backendStatus?.progress === "number"
      ? backendStatus.progress
      : 0;

    const estimatedTotalSec = typeof backendStatus?.estimated_total_sec === "number"
      ? backendStatus.estimated_total_sec
      : null;

    const elapsedSec = typeof backendStatus?.elapsed_sec === "number"
      ? backendStatus.elapsed_sec
      : null;

    let remainingSec: number | null = null;
    if (estimatedTotalSec && typeof elapsedSec === "number") {
      remainingSec = Math.max(0, estimatedTotalSec - elapsedSec);
    }

    return {
      jobId,
      phase,
      flow: flow ?? null,
      steps,
      overallProgress,
      currentStepKey: current?.key ?? null,
      currentStepLabel: current?.label ?? null,
      helperText: current?.helperText ?? null,
      queuePosition:
        typeof backendStatus?.queue_position === "number"
          ? backendStatus.queue_position
          : null,
      queueSize:
        typeof backendStatus?.queue_size === "number" ? backendStatus.queue_size : null,
      estimatedTotalSec,
      elapsedSec,
      remainingSec,
      errorMessage: backendStatus?.error_message ?? null,
    };
  }, [backendStatus, flow, jobId, presetLabelContext]);

  return { backend: backendStatus, ui: uiState };
}
