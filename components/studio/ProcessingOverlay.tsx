"use client";

import React from "react";

export type ProcessingStageId = string;

export type ProcessingStage = {
  id: ProcessingStageId;
  label: string;
};

export const PROCESSING_STAGES: ProcessingStage[] = [
  { id: "analyze", label: "Analyzing audio" },
  { id: "detect-vocals", label: "Detecting vocal characteristics" },
  { id: "denoise", label: "Cleaning noise & artifacts" },
  { id: "eq", label: "Applying EQ" },
  { id: "compress", label: "Applying compression" },
  { id: "saturate", label: "Adding saturation" },
  { id: "stereo", label: "Stereo enhancement" },
  { id: "loudness", label: "Loudness normalization" },
  { id: "finalize", label: "Finalizing output" },
];

// Frontend-side templates that mirror the backend FLOW_STEP_TEMPLATES
// in backend/main.py. These are used to customize the overlay per
// flow even before the backend has returned a job status payload.
export const FLOW_PROCESSING_STAGE_TEMPLATES: Record<string, ProcessingStage[]> = {
  audio_cleanup: [
    { id: "Analyzing audio", label: "Analyzing audio" },
    { id: "Noise reduction", label: "Noise reduction" },
    { id: "Artifact cleanup", label: "Artifact cleanup" },
    { id: "EQ cleanup", label: "EQ cleanup" },
    { id: "Output rendering", label: "Output rendering" },
  ],
  mixing_only: [
    { id: "Analyzing audio", label: "Analyzing audio" },
    { id: "Gain staging", label: "Gain staging" },
    { id: "Applying EQ", label: "Applying EQ" },
    { id: "Applying compression", label: "Applying compression" },
    { id: "Adding saturation", label: "Adding saturation" },
    { id: "Stereo enhancement", label: "Stereo enhancement" },
    { id: "Mix render", label: "Mix render" },
  ],
  mix_master: [
    { id: "Analyzing audio", label: "Analyzing audio" },
    { id: "Detecting vocal characteristics", label: "Detecting vocal characteristics" },
    { id: "Cleaning noise & artifacts", label: "Cleaning noise & artifacts" },
    { id: "Gain staging", label: "Gain staging" },
    { id: "Applying EQ", label: "Applying EQ" },
    { id: "Applying compression", label: "Applying compression" },
    { id: "De-essing", label: "De-essing" },
    { id: "Adding saturation", label: "Adding saturation" },
    { id: "Stereo enhancement", label: "Stereo enhancement" },
    { id: "Bus processing", label: "Bus processing" },
    { id: "Loudness normalization", label: "Loudness normalization" },
    { id: "Finalizing output", label: "Finalizing output" },
  ],
  mastering_only: [
    { id: "Analyzing mix", label: "Analyzing mix" },
    { id: "Linear EQ", label: "Linear EQ" },
    { id: "Multiband compression", label: "Multiband compression" },
    { id: "Stereo imaging", label: "Stereo imaging" },
    { id: "Limiting", label: "Limiting" },
    { id: "Loudness normalization", label: "Loudness normalization" },
    { id: "Final render", label: "Final render" },
  ],
};

export type TrackProcessingState = "idle" | "processing" | "completed" | "failed";

export interface TrackProcessingStatus {
  id: string;
  name: string;
  state: TrackProcessingState;
  percentage: number;
}

export interface ProcessingOverlayState {
  active: boolean;
  mode: "mix" | "track";
  percentage: number;
  currentStageId: ProcessingStageId;
  completedStageIds: ProcessingStageId[];
  tracks: TrackProcessingStatus[];
  error?: string | null;
}

interface ProcessingOverlayProps {
  state: ProcessingOverlayState | null;
  stages?: ProcessingStage[];
  onCancel?: () => void;
  onDownload?: () => void;
}

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span>{label}</span>
          <span>{clamped.toFixed(0)}%</span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-red-500 shadow-[0_0_18px_rgba(248,113,113,0.7)] transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function ProcessingStageList({
  stages,
  currentStageId,
  completedStageIds,
}: {
  stages: ProcessingStage[];
  currentStageId: ProcessingStageId;
  completedStageIds: ProcessingStageId[];
}) {
  return (
    <ol className="space-y-1 text-[11px] text-white/60">
      {stages.map((stage) => {
        const isCompleted = completedStageIds.includes(stage.id);
        const isCurrent = stage.id === currentStageId;
        return (
          <li
            key={stage.id}
            className={
              "flex items-center gap-2 rounded-full px-2 py-1 transition-colors " +
              (isCurrent
                ? "bg-white/8 text-white"
                : isCompleted
                ? "text-emerald-300"
                : "text-white/50")
            }
          >
            <span
              className={
                "flex h-3 w-3 items-center justify-center rounded-full border text-[10px] " +
                (isCompleted
                  ? "border-emerald-400 bg-emerald-400/20"
                  : isCurrent
                  ? "border-red-400 bg-red-500/30"
                  : "border-white/20")
              }
            >
              {isCompleted ? "✓" : isCurrent ? "•" : ""}
            </span>
            <span>{stage.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function WaveformSkeleton() {
  const bars = Array.from({ length: 64 });
  return (
    <div className="relative h-20 overflow-hidden rounded-2xl bg-gradient-to-tr from-black via-zinc-900 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(248,113,113,0.28),_transparent_60%)]" />
      <div className="relative flex h-full items-center justify-center gap-[3px] px-3">
        {bars.map((_, index) => {
          const delay = (index * 35) % 900;
          return (
            <span
              key={index}
              className="inline-block w-[3px] animate-[pulse_1.6s_ease-in-out_infinite] rounded-full bg-gradient-to-b from-red-400 via-red-500 to-white/80 opacity-70"
              style={{ height: `${18 + (index % 7) * 6}%`, animationDelay: `${delay}ms` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ProcessingOverlay({ state, stages, onCancel, onDownload }: ProcessingOverlayProps) {
  if (!state || !state.active) return null;

  const { mode, percentage, currentStageId, completedStageIds, tracks, error } = state;
  const stageList = stages && stages.length ? stages : PROCESSING_STAGES;
  const currentStage = stageList.find((s) => s.id === currentStageId);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0b0b0b]/95 p-4 shadow-[0_0_60px_rgba(0,0,0,0.85)] sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-red-400">
              {mode === "mix" ? "Processing Full Mix" : "Processing Track"}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-white sm:text-base">
              Let MIXSMVRT finish your chain.
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-xs text-white/70">
              {percentage.toFixed(0)}%
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close processing overlay"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-[13px] text-white/70 hover:border-white/50 hover:text-white/90"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1.4fr_1.1fr] sm:items-start">
          <div className="space-y-3">
            <WaveformSkeleton />
            <ProgressBar
              value={percentage}
              label={currentStage ? currentStage.label : "Processing"}
            />

            <div className="mt-2 rounded-xl border border-white/10 bg-black/60 p-2 text-[11px] text-white/60">
              <p>
                {error
                  ? "Something went wrong while processing this audio. You can adjust your upload and try again."
                  : "MIXSMVRT is running your audio through a full studio chain tuned for streaming and club playback."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <ProcessingStageList
              stages={stageList}
              currentStageId={currentStageId}
              completedStageIds={completedStageIds}
            />

            <div className="mt-1 space-y-1 rounded-xl border border-white/10 bg-black/70 p-2">
              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>{mode === "mix" ? "Master Bus" : "Track status"}</span>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/70 hover:border-red-400 hover:text-red-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="max-h-28 space-y-1 overflow-y-auto pr-1 text-[11px]">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1"
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <span className="truncate text-white/80">{track.name}</span>
                    </div>
                    <span className="text-[10px] text-white/60">
                      {track.state === "processing" && `${Math.round(track.percentage)}%`}
                      {track.state === "completed" && "Done"}
                      {track.state === "idle" && "Queued"}
                      {track.state === "failed" && "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-100">
                <p className="font-medium">Something went wrong while processing.</p>
                <p className="mt-1 text-red-200/80">{error}</p>
                <p className="mt-1 text-[10px] text-red-200/70">
                  You can try again, or adjust your upload and rerun the chain.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {onDownload && !error && (
            <div className="text-[11px] text-white/70">
              <p className="font-medium text-white">Your processing is complete.</p>
              <p className="text-white/60">Download the processed audio to keep working outside the browser.</p>
            </div>
          )}
          <div className="flex justify-end gap-2 sm:justify-start">
            {onDownload && !error && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-1.5 text-[12px] font-medium text-white shadow-[0_0_20px_rgba(225,6,0,0.9)] hover:bg-[#ff291e]"
              >
                Download processed audio
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-1.5 text-[12px] font-medium text-white/80 hover:border-red-400 hover:text-red-300"
              >
                {error ? "Close" : "Cancel"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
