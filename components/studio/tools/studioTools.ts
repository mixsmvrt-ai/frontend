export type GridResolution = "1/2" | "1/4" | "1/8";

export type StudioTool =
  | "select"
  | "slice"
  | "trim"
  | "fade"
  | "stretch"
  | "gain"
  | "pan"
  | "automation";

export type StudioRegion = {
  id: string;
  start: number;
  end: number;
  name?: string;
  gainDb?: number;
  pan?: number;
  fadeInSec?: number;
  fadeOutSec?: number;
  // placeholders for later
  stretchRate?: number;
  automation?: { t: number; v: number }[];
};

const GRID_FACTOR: Record<GridResolution, number> = {
  "1/2": 0.5,
  "1/4": 0.25,
  "1/8": 0.125,
};

export function barSeconds(bpm: number): number {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  return (60 / safeBpm) * 4;
}

export function gridStepSeconds(bpm: number, gridResolution: GridResolution): number {
  return barSeconds(bpm) * (GRID_FACTOR[gridResolution] ?? 0.25);
}

export function snapTimeToGrid(
  timeSec: number,
  bpm: number,
  gridResolution: GridResolution,
): number {
  const step = gridStepSeconds(bpm, gridResolution);
  if (!Number.isFinite(step) || step <= 0) return timeSec;
  const snapped = Math.round(timeSec / step) * step;
  return Math.max(0, snapped);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function dbToGain(db: number): number {
  // 0 dB = 1.0, -6 dB ~ 0.501
  return Math.pow(10, db / 20);
}
