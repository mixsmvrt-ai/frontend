export type TrackRole =
  | "beat"
  | "leadVocal"
  | "adlibs"
  | "doubles"
  | "backing";

export type TrackStatus = "idle" | "ready" | "processing" | "processed";

export type ABMode = "original" | "processed";

export type TrackPresetId =
  | "clean-vocal"
  | "radio-vocal"
  | "aggressive-rap"
  | "smooth-rnb"
  | "podcast-voice";

export type MixPresetId = "streaming-ready" | "club-loud" | "warm-analog";

export interface TrackState {
  id: string;
  role: TrackRole;
  name: string;
  color: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  file?: File;
  duration?: number;
  status: TrackStatus;
  preset?: TrackPresetId;
}

export interface MixSessionState {
  tracks: TrackState[];
  mixPreset: MixPresetId;
  abMode: ABMode;
  isLooping: boolean;
  isPlaying: boolean;
}
