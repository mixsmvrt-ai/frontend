import type { MixPresetId, TrackPresetId, TrackState } from "./audioTypes";

// Simple mock delay to simulate async AI processing
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runPerTrackAI(track: TrackState, preset: TrackPresetId): Promise<TrackState> {
  await wait(800 + Math.random() * 600);
  return {
    ...track,
    status: "processed",
    preset,
  };
}

export async function runGlobalAIMix(
  tracks: TrackState[],
  preset: MixPresetId,
): Promise<TrackState[]> {
  await wait(1000 + Math.random() * 1200);
  const gainMap: Record<MixPresetId, number> = {
    "streaming-ready": 0,
    "club-loud": 2,
    "warm-analog": -1,
  };

  return tracks.map((track) => ({
    ...track,
    status: track.file ? "processed" : track.status,
    volume: Math.max(0, Math.min(1.5, track.volume + gainMap[preset] / 10)),
  }));
}
