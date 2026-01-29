"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import type { TrackType } from "../../app/studio/page";
import type { TrackPlugin } from "./pluginTypes";
import TrackPluginRack from "./TrackPluginRack";

const ROLE_ACCENT_COLORS: Record<TrackType["role"], string> = {
  beat: "#22c55e",
  vocal: "#38bdf8",
  background: "#a855f7",
  adlib: "#f97316",
  instrument: "#eab308",
};

const ACCENT_SWATCHES = [
  "#ef4444",
  "#22c55e",
  "#38bdf8",
  "#a855f7",
  "#f97316",
  "#eab308",
];

type TrackLaneProps = {
  track: TrackType;
  zoom: number;
  isPlaying: boolean;
  masterVolume: number;
  onFileSelected: (trackId: string, file: File) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onLevelChange: (trackId: string, level: number) => void;
  onGenderChange: (trackId: string, gender: "male" | "female") => void;
  onPanChange: (trackId: string, pan: number) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  isAnySoloActive: boolean;
  isSelected: boolean;
  onSelect: (trackId: string) => void;
  plugins?: TrackPlugin[];
  onPluginsChange?: (trackId: string, plugins: TrackPlugin[]) => void;
  onOpenPlugin?: (trackId: string, plugin: TrackPlugin) => void;
  isAudioSelected?: boolean;
  onSelectAudio?: (trackId: string | null) => void;
  onClearAudio?: (trackId: string) => void;
  onDelete: (trackId: string) => void;
  onDuplicate: (trackId: string) => void;
  onProcess: (trackId: string) => void;
};

export default function TrackLane({
  track,
  zoom,
  isPlaying,
  onFileSelected,
  masterVolume,
  onVolumeChange,
  onLevelChange,
  onGenderChange,
  onPanChange,
   onToggleMute,
   onToggleSolo,
   isAnySoloActive,
  isSelected,
  onSelect,
  plugins,
  onPluginsChange,
  onOpenPlugin,
  isAudioSelected,
  onSelectAudio,
  onClearAudio,
  onDelete,
  onDuplicate,
  onProcess,
}: TrackLaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const meterRafRef = useRef<number | null>(null);
  const baseVolumeRef = useRef(track.volume);
  const masterVolumeRef = useRef(masterVolume);
    const audibleRef = useRef(true);
  const fadeInRef = useRef(true);
  const fadeOutRef = useRef(true);
  const [accentColor, setAccentColor] = useState<string>(
    ROLE_ACCENT_COLORS[track.role] ?? "#ef4444",
  );
  const [fadeInDuration, setFadeInDuration] = useState(0.5);
  const [fadeOutDuration, setFadeOutDuration] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [level, setLevel] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(track.name);
  const [fadeInEnabled, setFadeInEnabled] = useState(true);
  const [fadeOutEnabled, setFadeOutEnabled] = useState(true);
  const [trackDuration, setTrackDuration] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [showPlugins, setShowPlugins] = useState(true);

  const fadeInDurationRef = useRef(fadeInDuration);
  const fadeOutDurationRef = useRef(fadeOutDuration);
  const fadeDragStateRef = useRef<
    | {
        type: "in" | "out";
        startX: number;
        startDuration: number;
      }
    | null
  >(null);

  useEffect(() => {
    baseVolumeRef.current = track.volume;
  }, [track.volume]);

  useEffect(() => {
    masterVolumeRef.current = masterVolume;
  }, [masterVolume]);

  useEffect(() => {
    const muted = track.muted ?? false;
    const solo = track.solo ?? false;
    const anySolo = isAnySoloActive;

    const isAudible = !muted && (!anySolo || solo);
    audibleRef.current = isAudible;

    if (wavesurferRef.current) {
      const baseVolume = Math.max(
        0,
        Math.min(1, baseVolumeRef.current * masterVolumeRef.current),
      );
      wavesurferRef.current.setVolume(isAudible ? baseVolume : 0);
    }
  }, [track.muted, track.solo, isAnySoloActive]);

  useEffect(() => {
    fadeInRef.current = fadeInEnabled;
  }, [fadeInEnabled]);

  useEffect(() => {
    fadeOutRef.current = fadeOutEnabled;
  }, [fadeOutEnabled]);

  useEffect(() => {
    fadeInDurationRef.current = fadeInDuration;
  }, [fadeInDuration]);

  useEffect(() => {
    fadeOutDurationRef.current = fadeOutDuration;
  }, [fadeOutDuration]);

  // Create WaveSurfer instance when a file is present
  useEffect(() => {
    if (!track.file || !containerRef.current) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(track.file);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      // Force WebAudio backend so filters (including pan) affect audible output
      backend: "WebAudio",
      waveColor: "rgba(248, 250, 252, 0.3)",
      progressColor: "#ef4444",
      cursorColor: "#e5e7eb",
      barWidth: 2,
      barRadius: 2,
      height: 72,
      normalize: true,
      minPxPerSec: 60 * zoom,
      dragToSeek: true,
    });

    ws.load(objectUrl);
    ws.setVolume(track.volume * masterVolume);
    wavesurferRef.current = ws;

    const handleAudioProcess = (currentTime: number) => {
      const duration = trackDuration || ws.getDuration() || 0;
      let fadeFactor = 1;

      if (fadeInRef.current && fadeInDurationRef.current > 0) {
        const fadeDuration = fadeInDurationRef.current;
        const t = Math.max(0, currentTime);
        if (t < fadeDuration) {
          fadeFactor = Math.min(fadeFactor, t / fadeDuration);
        }
      }

      if (
        fadeOutRef.current &&
        fadeOutDurationRef.current > 0 &&
        duration > 0 &&
        currentTime > duration - fadeOutDurationRef.current
      ) {
        const remaining = duration - currentTime;
        const outFactor = Math.max(0, Math.min(1, remaining / fadeOutDurationRef.current));
        fadeFactor = Math.min(fadeFactor, outFactor);
      }

      const baseVolume = Math.max(
        0,
        Math.min(1, baseVolumeRef.current * masterVolumeRef.current),
      );
      const audibleVolume = audibleRef.current ? baseVolume : 0;
      ws.setVolume(audibleVolume * fadeFactor);
    };

    ws.on("audioprocess", handleAudioProcess);

    const attachAnalyser = () => {
      const backend: any = (ws as any).backend;
      if (!backend || typeof backend.ac === "undefined") return;

      const ac: AudioContext = backend.ac as AudioContext;
      const panner: StereoPannerNode | null =
        typeof (ac as any).createStereoPanner === "function"
          ? (ac as any).createStereoPanner()
          : null;

      // Prefer WaveSurfer's internal analyser if it exists so we are
      // guaranteed to be tapping into the actual playback signal.
      const existingAnalyser: AnalyserNode | undefined = (backend as any).analyser;
      const analyser: AnalyserNode = existingAnalyser ?? ac.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      if (typeof backend.setFilters === "function") {
        const filters: AudioNode[] = [];
        if (panner) {
          panner.pan.value = track.pan ?? 0;
          filters.push(panner);
          pannerRef.current = panner;
        } else {
          pannerRef.current = null;
        }
        filters.push(analyser);
        backend.setFilters(filters);
      }

      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount || 2048);

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length) / 255;
        const clamped = Math.max(0, Math.min(1, rms));
        setLevel(clamped);
        onLevelChange(track.id, clamped);
        meterRafRef.current = requestAnimationFrame(loop);
      };

      if (meterRafRef.current == null) {
        meterRafRef.current = requestAnimationFrame(loop);
      }
    };

    ws.on("ready", () => {
      attachAnalyser();
      const duration = ws.getDuration() || 0;
      setTrackDuration(duration);
      window.dispatchEvent(
        new CustomEvent("mixsmvrt:track-duration", {
          detail: { id: track.id, duration },
        }),
      );
    });

    return () => {
      if (meterRafRef.current != null) {
        cancelAnimationFrame(meterRafRef.current);
        meterRafRef.current = null;
      }
      analyserRef.current = null;
      pannerRef.current = null;
      ws.un("audioprocess", handleAudioProcess);

      const destroyResult = ws.destroy();
      // WaveSurfer.destroy may return void or a Promise; if it's a Promise,
      // attach a handler so any AbortError rejection is ignored.
      if (typeof destroyResult === "object" && destroyResult !== null) {
        const maybePromise = destroyResult as Promise<unknown>;
        if (typeof (maybePromise as any).catch === "function") {
          maybePromise.catch((error) => {
            if ((error as any)?.name !== "AbortError") {
              // eslint-disable-next-line no-console
              console.debug("WaveSurfer destroy error (ignored)", error);
            }
          });
        }
      }
      wavesurferRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [track.file, onLevelChange, track.id]);

  // React to zoom changes
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setOptions({ minPxPerSec: 60 * zoom });
    }
  }, [zoom]);

  // React to global transport state
  useEffect(() => {
    if (!wavesurferRef.current) return;
    if (isPlaying) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying]);

  // React to volume changes (track or master)
  useEffect(() => {
    if (wavesurferRef.current) {
      const baseVolume = Math.max(
        0,
        Math.min(1, track.volume * masterVolume),
      );
      const audibleVolume = audibleRef.current ? baseVolume : 0;
      wavesurferRef.current.setVolume(audibleVolume);
    }
  }, [track.volume, masterVolume]);

  // React to pan changes
  useEffect(() => {
    if (pannerRef.current) {
      const next = Math.max(-1, Math.min(1, track.pan ?? 0));
      pannerRef.current.pan.value = next;
    }
  }, [track.pan]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onFileSelected(track.id, file);
      }
    },
    [onFileSelected, track.id],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        onFileSelected(track.id, file);
      }
    },
    [onFileSelected, track.id],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleVolumeInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(track.id, Number(event.target.value));
  };

  const handleFadeMouseMove = useCallback((event: MouseEvent) => {
    const state = fadeDragStateRef.current;
    if (!state) return;

    const deltaX = event.clientX - state.startX;
    const deltaSeconds = deltaX / 150; // 150px drag ≈ 1s fade change
    const raw = state.startDuration + deltaSeconds;
    const clamped = Math.max(0, Math.min(5, raw));

    if (state.type === "in") {
      setFadeInDuration(clamped);
    } else {
      setFadeOutDuration(clamped);
    }
  }, []);

  const handleFadeMouseUp = useCallback(() => {
    if (!fadeDragStateRef.current) return;
    fadeDragStateRef.current = null;
    window.removeEventListener("mousemove", handleFadeMouseMove);
    window.removeEventListener("mouseup", handleFadeMouseUp);
  }, [handleFadeMouseMove]);

  const startFadeDrag = (type: "in" | "out") =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (type === "in") {
        setFadeInEnabled(true);
      } else {
        setFadeOutEnabled(true);
      }

      const startDuration =
        type === "in" ? fadeInDurationRef.current : fadeOutDurationRef.current;

      fadeDragStateRef.current = {
        type,
        startX: event.clientX,
        startDuration,
      };

      window.addEventListener("mousemove", handleFadeMouseMove);
      window.addEventListener("mouseup", handleFadeMouseUp);
    };

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleFadeMouseMove);
      window.removeEventListener("mouseup", handleFadeMouseUp);
    };
  }, [handleFadeMouseMove, handleFadeMouseUp]);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (isContextMenuOpen) {
        setIsContextMenuOpen(false);
        setContextMenuPos(null);
      }
    };

    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [isContextMenuOpen]);

  const commitNameChange = () => {
    const trimmed = nameDraft.trim();
    setIsEditingName(false);
    if (!trimmed || trimmed === track.name) return;
    // Bubble name change via a CustomEvent so the parent page can handle it
    window.dispatchEvent(
      new CustomEvent("mixsmvrt:rename-track", {
        detail: { id: track.id, name: trimmed },
      }),
    );
  };

  // Respond to global transport prev/next events to seek audio
  useEffect(() => {
    const handlePrev = () => {
      if (!wavesurferRef.current) return;
      try {
        wavesurferRef.current.seekTo(0);
      } catch {
        // ignore
      }
    };

    const handleNext = () => {
      if (!wavesurferRef.current) return;
      try {
        wavesurferRef.current.seekTo(1);
      } catch {
        // ignore
      }
    };

    window.addEventListener("mixsmvrt:transport-prev", handlePrev);
    window.addEventListener("mixsmvrt:transport-next", handleNext);

    return () => {
      window.removeEventListener("mixsmvrt:transport-prev", handlePrev);
      window.removeEventListener("mixsmvrt:transport-next", handleNext);
    };
  }, []);

  const panValue = track.pan ?? 0;
  const volumePercent = Math.round(track.volume * 100);
  const panPercent = Math.round(panValue * 100);

  const handleVolumePercentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(event.target.value);
    if (!Number.isFinite(raw)) return;
    const clamped = Math.max(0, Math.min(100, raw));
    const asUnit = clamped / 100;
    onVolumeChange(track.id, asUnit);
  };

  const handlePanPercentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(event.target.value);
    if (!Number.isFinite(raw)) return;
    const clamped = Math.max(-100, Math.min(100, raw));
    const asUnit = clamped / 100;
    onPanChange(track.id, asUnit);
  };

  return (
    <div
      className={`relative flex border-b bg-black/40 transition-colors ${
        isSelected
          ? "border-red-500/70 bg-gradient-to-r from-red-950/60 via-black/60 to-zinc-950/40 shadow-[0_0_0_1px_rgba(248,113,113,0.6)]"
          : "border-white/5 hover:bg-zinc-900/40"
      }`}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, input, select, label")) return;
        const headerEl = target.closest(".mixsmvrt-track-header");
        const waveformEl = target.closest(".mixsmvrt-track-waveform");

        if (headerEl) {
          onSelect(track.id);
          if (onSelectAudio) onSelectAudio(null);
        } else if (waveformEl) {
          onSelect(track.id);
          if (onSelectAudio) onSelectAudio(track.id);
        } else {
          onSelect(track.id);
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        const target = event.target as HTMLElement;
        const waveformEl = target.closest(".mixsmvrt-track-waveform");

        onSelect(track.id);
        if (waveformEl && onSelectAudio) {
          onSelectAudio(track.id);
        }
        setIsContextMenuOpen(true);
        setContextMenuPos({ x: event.clientX, y: event.clientY });
      }}
    >
      {/* Track Header */}
      <div className="mixsmvrt-track-header flex w-60 flex-col justify-between border-r border-white/10 bg-zinc-900/90 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          {isEditingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={commitNameChange}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitNameChange();
                if (event.key === "Escape") {
                  setIsEditingName(false);
                  setNameDraft(track.name);
                }
              }}
              className="max-w-[130px] rounded bg-zinc-800 px-1 py-0.5 text-sm font-medium text-white outline-none ring-1 ring-red-500/40"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(track.name);
                setIsEditingName(true);
              }}
              className="max-w-[130px] truncate text-left text-sm font-medium text-white/90 hover:text-white"
            >
              {track.name}
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-white/60">
              {track.role}
            </span>
            {track.role !== "beat" && track.role !== "instrument" && (
              <select
                className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-white/80 outline-none"
                value={track.gender || "male"}
                onChange={(event) =>
                  onGenderChange(
                    track.id,
                    event.target.value === "female" ? "female" : "male",
                  )
                }
              >
                <option value="male">M</option>
                <option value="female">F</option>
              </select>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="h-12 w-2 overflow-hidden rounded bg-zinc-800">
              <div
                className="h-full w-full origin-bottom bg-gradient-to-t from-red-500 via-yellow-400 to-emerald-400 transition-transform"
                style={{ transform: `scaleY(${level})` }}
              />
            </div>
            <span className="text-[10px] text-white/50">LVL</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleMute(track.id);
              }}
              className={`h-5 w-7 rounded text-[10px] font-semibold transition-colors ${
                track.muted
                  ? "bg-zinc-300 text-black"
                  : "bg-zinc-800 text-white/70 hover:bg-zinc-700"
              }`}
            >
              M
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleSolo(track.id);
              }}
              className={`h-5 w-7 rounded text-[10px] font-semibold transition-colors ${
                track.solo
                  ? "bg-emerald-400 text-black"
                  : "bg-zinc-800 text-white/70 hover:bg-zinc-700"
              }`}
            >
              S
            </button>
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="flex items-center gap-3 text-[10px] text-white/60">
              <span className="w-6">Vol</span>
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={track.volume}
                  onChange={handleVolumeInput}
                  className="h-2 w-full cursor-pointer accent-red-500"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Number.isFinite(volumePercent) ? volumePercent : 0}
                  onChange={handleVolumePercentChange}
                  className="w-12 rounded bg-zinc-800 px-1 py-0.5 text-right text-[9px] text-white/70 outline-none focus:ring-1 focus:ring-red-500/60"
                />
              </div>
            </label>
            <label className="flex items-center gap-3 text-[10px] text-white/60">
              <span className="w-6">Pan</span>
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={panValue}
                  onChange={(event) =>
                    onPanChange(track.id, Number(event.target.value) || 0)
                  }
                  className="h-2 w-full cursor-pointer accent-red-500"
                />
                <span className="w-6 text-center text-[9px] text-white/40">
                  {panValue && Math.abs(panValue) > 0.05
                    ? panValue < 0
                      ? "L"
                      : "R"
                    : "C"}
                </span>
                <input
                  type="number"
                  min={-100}
                  max={100}
                  value={Number.isFinite(panPercent) ? panPercent : 0}
                  onChange={handlePanPercentChange}
                  className="w-14 rounded bg-zinc-800 px-1 py-0.5 text-right text-[9px] text-white/70 outline-none focus:ring-1 focus:ring-red-500/60"
                />
              </div>
            </label>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center rounded bg-zinc-800 px-2 py-1 text-[10px] font-medium">
            <span>Upload</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <span className="truncate text-[10px] text-white/40">
            {track.file ? track.file.name : "Drop audio here"}
          </span>
        </div>

        {/* Per-track plugin rack under level / faders */}
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-white/60">
            <span>Plugins</span>
            <button
              type="button"
              onClick={() => setShowPlugins((v) => !v)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-white/50 hover:bg-white/10"
            >
              <span aria-hidden="true">{showPlugins ? "👁" : "👁‍🗨"}</span>
              <span>{showPlugins ? "Hide" : "Show"}</span>
            </button>
          </div>
          {showPlugins && (
            <TrackPluginRack
              plugins={plugins || []}
              onChange={(next) => {
                if (!onPluginsChange) return;
                onPluginsChange(track.id, next);
              }}
              onOpen={(plugin) => {
                if (!onOpenPlugin) return;
                onOpenPlugin(track.id, plugin);
              }}
            />
          )}
        </div>
      </div>

      {/* Waveform / Drop area with grid */}
      <div
        className={`mixsmvrt-track-waveform relative flex flex-1 items-center overflow-hidden border-l bg-zinc-950/95 ${
          isDragging ? "ring-1 ring-red-500/80" : ""
        } ${
          track.file
            ? "rounded-lg shadow-[0_0_0_1px_rgba(248,250,252,0.06)]"
            : "border-white/5"
        }`}
        style={
          track.file
            ? {
                borderColor: `${accentColor}80`,
                boxShadow: `0 0 24px ${accentColor}40`,
                // Use 8-digit hex to add subtle alpha to the full background.
                // e.g. #22c55e40 for a soft green wash.
                backgroundColor: `${accentColor}26`,
              }
            : undefined
        }
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40 z-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(39,39,42,0.85) 1px, transparent 1px)",
            backgroundSize: `${80 * zoom}px 100%`,
          }}
        />
        {!track.file && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-white/40">
            Drag & drop audio file
          </div>
        )}
        {track.file && trackDuration > 0 && fadeInEnabled && fadeInDuration > 0 && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[1]"
            style={{
              width: `${Math.min(100, (fadeInDuration / trackDuration) * 100)}%`,
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.95), transparent)",
            }}
          />
        )}
        {track.file && trackDuration > 0 && fadeOutEnabled && fadeOutDuration > 0 && (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-[1]"
            style={{
              width: `${Math.min(100, (fadeOutDuration / trackDuration) * 100)}%`,
              backgroundImage:
                "linear-gradient(to left, rgba(15,23,42,0.95), transparent)",
            }}
          />
        )}
        {track.file && (
          <div className="absolute bottom-2 left-2 z-20">
            <button
              type="button"
              onClick={() => setShowColorPicker((v) => !v)}
              className="flex h-6 w-6 items-center justify-center rounded border border-white/20 bg-black/60 shadow-sm hover:border-white/40"
            >
              <div
                className="h-4 w-4 rounded-sm"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg,#ef4444,#22c55e,#3b82f6,#a855f7)",
                }}
              />
            </button>
            {showColorPicker && (
              <div className="mt-1 rounded-md border border-white/10 bg-black/95 p-1 shadow-xl">
                <div className="flex gap-1">
                  {ACCENT_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setAccentColor(color);
                        setShowColorPicker(false);
                      }}
                      className="h-5 w-5 rounded-sm border border-white/10 hover:border-white/60"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {track.file && (
          <>
            <button
              type="button"
              onClick={() => setFadeInEnabled((v) => !v)}
              onMouseDown={startFadeDrag("in")}
              className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border text-[10px] transition-colors ${
                fadeInEnabled
                  ? "border-red-500/70 bg-red-500/20 text-red-200"
                  : "border-zinc-600 bg-zinc-900/80 text-zinc-300"
              }`}
            >
              ◢
            </button>
            <button
              type="button"
              onClick={() => setFadeOutEnabled((v) => !v)}
              onMouseDown={startFadeDrag("out")}
              className={`absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border text-[10px] transition-colors ${
                fadeOutEnabled
                  ? "border-red-500/70 bg-red-500/20 text-red-200"
                  : "border-zinc-600 bg-zinc-900/80 text-zinc-300"
              }`}
            >
              ◣
            </button>
          </>
        )}
        <div
          ref={containerRef}
          className={`relative z-10 h-[72px] w-full overflow-hidden transform transition-transform duration-300 ${
            track.processed ? "scale-y-110" : "scale-y-100"
          } ${isAudioSelected ? "ring-2 ring-red-400/80" : ""}`}
          style={{ transformOrigin: "center center" }}
        />
      </div>

      {isContextMenuOpen && contextMenuPos && (
        <div
          className="fixed z-40 min-w-[180px] rounded-md border border-white/10 bg-zinc-900/95 py-1 text-xs shadow-xl backdrop-blur-md"
          style={{ top: contextMenuPos.y + 2, left: contextMenuPos.x + 2 }}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-white hover:bg-red-600/80"
            onClick={() => {
              setIsContextMenuOpen(false);
              setContextMenuPos(null);
              onProcess(track.id);
            }}
          >
            <span>Process Track with AI</span>
            <span className="text-[10px] uppercase text-white/50">Alt+P</span>
          </button>
          <div className="my-1 h-px bg-white/10" />
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-white hover:bg-zinc-800"
            onClick={() => {
              setIsContextMenuOpen(false);
              setContextMenuPos(null);
              onDuplicate(track.id);
            }}
          >
            <span>Duplicate Track</span>
            <span className="text-[10px] uppercase text-white/50">Alt+D</span>
          </button>
          {track.file && onClearAudio && (
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-amber-300 hover:bg-amber-900/60"
              onClick={() => {
                setIsContextMenuOpen(false);
                setContextMenuPos(null);
                onClearAudio(track.id);
              }}
            >
              <span>Remove Audio (Keep Track)</span>
              <span className="text-[10px] uppercase text-amber-200/80">Del</span>
            </button>
          )}
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-red-400 hover:bg-red-900/70"
            onClick={() => {
              setIsContextMenuOpen(false);
              setContextMenuPos(null);
              onDelete(track.id);
            }}
          >
            <span>Delete Track</span>
            <span className="text-[10px] uppercase text-red-300/70">Del</span>
          </button>
        </div>
      )}
    </div>
  );
}
