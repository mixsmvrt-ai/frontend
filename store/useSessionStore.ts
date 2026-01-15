"use client";

import { create } from "zustand";
import type { ABMode, MixPresetId, TrackPresetId, TrackRole, TrackState } from "../lib/audioTypes";
import { runGlobalAIMix, runPerTrackAI } from "../lib/aiProcessingMock";

interface SessionStoreState {
  tracks: TrackState[];
  mixPreset: MixPresetId;
  abMode: ABMode;
  isLooping: boolean;
  isPlaying: boolean;
  isProcessing: boolean;
  initDefaultTracks: () => void;
  setTrackFile: (id: string, file: File, duration?: number) => void;
  setTrackVolume: (id: string, volume: number) => void;
  toggleMute: (id: string) => void;
  toggleSolo: (id: string) => void;
  setTrackPreset: (id: string, preset: TrackPresetId) => void;
  setMixPreset: (preset: MixPresetId) => void;
  setABMode: (mode: ABMode) => void;
  setTransport: (state: { isPlaying?: boolean; isLooping?: boolean }) => void;
  runTrackAI: (id: string, preset: TrackPresetId) => Promise<void>;
  runGlobalAI: () => Promise<void>;
}

const baseTracks: { role: TrackRole; name: string; color: string }[] = [
  { role: "beat", name: "Beat / Instrumental", color: "#22c55e" },
  { role: "leadVocal", name: "Lead Vocal", color: "#38bdf8" },
  { role: "adlibs", name: "Adlibs", color: "#a855f7" },
  { role: "doubles", name: "Doubles", color: "#fbbf24" },
  { role: "backing", name: "Backing Vocals", color: "#f97316" },
];

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  tracks: [],
  mixPreset: "streaming-ready",
  abMode: "processed",
  isLooping: false,
  isPlaying: false,
  isProcessing: false,

  initDefaultTracks: () => {
    set({
      tracks: baseTracks.map((t, index) => ({
        id: `${t.role}-${index}`,
        role: t.role,
        name: t.name,
        color: t.color,
        volume: 1,
        muted: false,
        solo: false,
        status: "idle",
      })),
    });
  },

  setTrackFile: (id, file, duration) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id
          ? {
              ...t,
              file,
              duration,
              status: "ready",
            }
          : t,
      ),
    }));
  },

  setTrackVolume: (id, volume) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, volume } : t)),
    }));
  },

  toggleMute: (id) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, muted: !t.muted } : t)),
    }));
  },

  toggleSolo: (id) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, solo: !t.solo } : t)),
    }));
  },

  setTrackPreset: (id, preset) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, preset } : t)),
    }));
  },

  setMixPreset: (preset) => set({ mixPreset: preset }),

  setABMode: (mode) => set({ abMode: mode }),

  setTransport: ({ isPlaying, isLooping }) => {
    const next: Partial<SessionStoreState> = {};
    if (typeof isPlaying === "boolean") next.isPlaying = isPlaying;
    if (typeof isLooping === "boolean") next.isLooping = isLooping;
    set(next as SessionStoreState);
  },

  runTrackAI: async (id, preset) => {
    const track = get().tracks.find((t) => t.id === id);
    if (!track || !track.file) return;
    set({ isProcessing: true });
    const processed = await runPerTrackAI({ ...track, status: "processing" }, preset);
    set((state) => ({
      isProcessing: false,
      tracks: state.tracks.map((t) => (t.id === id ? processed : t)),
    }));
  },

  runGlobalAI: async () => {
    const state = get();
    set({ isProcessing: true });
    const updated = await runGlobalAIMix(
      state.tracks.map((t) => ({ ...t, status: t.file ? "processing" : t.status })),
      state.mixPreset,
    );
    set({ tracks: updated, isProcessing: false });
  },
}));
