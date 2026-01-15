"use client";

// Mix/Master Studio page
// Route: /upload (app/upload/page.tsx)

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import WaveSurfer from "wavesurfer.js";
import {
  allPresets,
  analyzeTrack,
  autoSelectPresetForGenre,
  detectGenreHeuristic,
} from "../../audio-engine/audioEngine";
import {
  audioBufferToEngineBuffer,
  playPresetWithWebAudio,
  type WebAudioChainInstance,
} from "../../audio-engine/webAudioEngine";

const DSP_URL = process.env.NEXT_PUBLIC_DSP_URL || "http://localhost:8001";

type TrackStatus = "Not uploaded" | "Ready" | "Processing" | "Processed";

type Track = {
  id: string;
  name: string;
  role: string;
  color: string;
  status: TrackStatus;
  file?: File;
};

type UploadZoneProps = {
  label: string;
  hint: string;
  onFileSelected: (file: File) => void;
};

type TransportState = "stopped" | "playing" | "paused";

type WaveformTrackProps = {
  track: Track;
  zoom: number;
  transportState: TransportState;
  onReady: () => void;
};

// Reusable drag-and-drop upload surface
function UploadZone({ label, hint, onFileSelected }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  return (
    <div
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-5 text-center text-xs transition ${{
        true: "border-emerald-400/80 bg-emerald-500/5 text-emerald-100",
        false: "border-slate-700 bg-slate-950/60 text-slate-300",
      }[String(isDragging) as "true" | "false"]}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="text-[11px] text-slate-400">{hint}</p>
      <label className="mt-2 inline-flex items-center rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-emerald-400 hover:text-emerald-200">
        <span>Browse files</span>
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}

// DAW-style lane backed by WaveSurfer (visual + playback for that stem)
function WaveformTrack({ track, zoom, transportState, onReady }: WaveformTrackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  // Create WaveSurfer instance when a file is present
  useEffect(() => {
    if (!track.file || !containerRef.current) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(track.file);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: `${track.color}80`,
      progressColor: track.color,
      cursorColor: "#e5e7eb",
      barWidth: 2,
      barRadius: 2,
      height: 72,
      normalize: true,
      minPxPerSec: 60 * zoom,
      dragToSeek: true,
    });

    ws.load(objectUrl);
    wavesurferRef.current = ws;

    ws.on("ready", onReady);

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [track.file, track.color, zoom, onReady]);

  // React to global zoom changes
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setOptions({ minPxPerSec: 60 * zoom });
    }
  }, [zoom]);

  // React to global transport changes (play/pause/stop all tracks)
  useEffect(() => {
    if (!wavesurferRef.current) return;

    if (transportState === "playing") {
      wavesurferRef.current.play();
    } else if (transportState === "paused") {
      wavesurferRef.current.pause();
    } else if (transportState === "stopped") {
      wavesurferRef.current.stop();
    }
  }, [transportState]);

  const togglePlay = useCallback(() => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
  }, []);

  const statusColorMap: Record<TrackStatus, string> = {
    "Not uploaded": "text-slate-500",
    Ready: "text-emerald-300",
    Processing: "text-amber-300",
    Processed: "text-emerald-300",
  };

  const statusLabelMap: Record<TrackStatus, string> = {
    "Not uploaded": "Waiting for audio",
    Ready: "Ready for AI chain",
    Processing: "AI processing",
    Processed: "AI pass complete",
  };

  return (
    <div className="flex items-stretch gap-2 border-b border-slate-800/80 pb-1">
      {/* Track header */}
      <div className="flex w-44 flex-col justify-between rounded-lg bg-slate-900/90 px-3 py-2 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: track.color }}
            />
            <span className="font-medium text-slate-50 truncate">{track.name}</span>
          </div>
        </div>
        <span className="mt-1 text-[10px] text-slate-400 line-clamp-1">{track.role}</span>
        <span className={`mt-1 text-[10px] ${statusColorMap[track.status]}`}>
          {statusLabelMap[track.status]}
        </span>
        <button
          type="button"
          onClick={togglePlay}
          disabled={!track.file}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-100 hover:bg-emerald-500/80 hover:text-black disabled:cursor-not-allowed disabled:bg-slate-800/70"
        >
          {track.file ? "Play stem" : "No audio"}
        </button>
      </div>

      {/* Waveform timeline */}
      <div className="relative flex-1 overflow-hidden rounded-lg bg-slate-900/80">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.9)_1px,transparent_1px)] bg-[length:40px_100%] opacity-40" />
        <div ref={containerRef} className="relative" />
      </div>
    </div>
  );
}

export default function UploadStudio() {
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: "beat",
      name: "Beat",
      role: "Instrumental / 2-track",
      color: "#22c55e",
      status: "Not uploaded",
    },
    {
      id: "lead",
      name: "Lead Vocal",
      role: "Main vocal performance",
      color: "#38bdf8",
      status: "Not uploaded",
    },
    {
      id: "adlibs",
      name: "Adlibs",
      role: "Accent vocals / dubs",
      color: "#a855f7",
      status: "Not uploaded",
    },
  ]);

  const [targetPreset, setTargetPreset] = useState("Streaming (-14 LUFS)");
  const [genre, setGenre] = useState("Dancehall");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.2);
  const [transportState, setTransportState] = useState<TransportState>("stopped");
  const [previewInfo, setPreviewInfo] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const previewInstanceRef = useRef<WebAudioChainInstance | null>(null);

  const updateTrackFile = useCallback((trackId: string, file: File) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId
          ? {
              ...track,
              file,
              status: "Ready",
            }
          : track,
      ),
    );
  }, []);

  const handleSubmitToBackend = useCallback(async () => {
    if (!tracks.some((track) => track.file)) return;

    setIsSubmitting(true);
    setServerMessage(null);

    // Mark tracks with files as Processing
    setTracks((prev) =>
      prev.map((track) =>
        track.file
          ? {
              ...track,
              status: "Processing",
            }
          : track,
      ),
    );

    try {
      const formData = new FormData();

      const beatTrack = tracks.find((track) => track.id === "beat" && track.file);
      const leadTrack = tracks.find((track) => track.id === "lead" && track.file);
      const adlibsTrack = tracks.find((track) => track.id === "adlibs" && track.file);

      const primaryTrack = beatTrack || leadTrack || adlibsTrack;

      if (!primaryTrack || !primaryTrack.file) {
        throw new Error("No audio file found for DSP processing");
      }

      let trackType: "vocal" | "beat" | "master" = "vocal";
      if (primaryTrack.id === "beat") {
        trackType = "beat";
      }

      let presetName = "clean_vocal";
      if (trackType === "vocal") {
        presetName = ["Dancehall", "Hip Hop"].includes(genre)
          ? "aggressive_rap"
          : "clean_vocal";
      } else {
        presetName = "streaming_master";
      }

      formData.append("file", primaryTrack.file);
      formData.append("track_type", trackType);
      formData.append("preset", presetName);

      const response = await fetch(`${DSP_URL}/process`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to process audio with DSP service");
      }

      const data: {
        status?: string;
        output_file?: string;
        track_type?: string;
        preset?: string;
      } = await response.json();

      setTracks((prev) =>
        prev.map((track) =>
          track.file
            ? {
                ...track,
                status: data.status === "processed" ? "Processed" : "Ready",
              }
            : track,
        ),
      );

      if (data.status === "processed") {
        setServerMessage(
          `DSP processing completed using ${data.track_type ?? trackType} / ${
            data.preset ?? presetName
          } preset.`,
        );
      } else {
        setServerMessage("DSP service responded but status was not 'processed'.");
      }
    } catch (error) {
      console.error(error);
      setServerMessage("There was a problem running the AI chain. Please try again.");
      // Roll back status to Ready so user can retry
      setTracks((prev) =>
        prev.map((track) =>
          track.file
            ? {
                ...track,
                status: "Ready",
              }
            : track,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [genre, targetPreset, tracks]);

  const handlePreviewLocal = useCallback(async () => {
    const anyFile = tracks.find((track) => track.file)?.file;
    if (!anyFile) return;

    if (previewInstanceRef.current) {
      previewInstanceRef.current.disconnect();
      previewInstanceRef.current = null;
    }

    const AudioCtx =
      typeof window !== "undefined"
        ? (window.AudioContext || (window as any).webkitAudioContext)
        : null;
    if (!AudioCtx) return;

    const context = audioContextRef.current ?? new AudioCtx();
    audioContextRef.current = context;

    const arrayBuffer = await anyFile.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);

    const engineBuffer = audioBufferToEngineBuffer(audioBuffer);
    const analysis = analyzeTrack(engineBuffer);
    const genrePrediction = detectGenreHeuristic(engineBuffer);

    const recommended = autoSelectPresetForGenre("master", genrePrediction, analysis);
    const fallbackPreset = allPresets.find((p) => p.role === "master");
    const preset =
      (recommended && allPresets.find((p) => p.id === recommended.presetId)) ||
      fallbackPreset;

    if (!preset) {
      setPreviewInfo("No matching master preset found.");
      return;
    }

    const instance = playPresetWithWebAudio(context, engineBuffer, preset);
    previewInstanceRef.current = instance;

    setPreviewInfo(
      `Previewing ${preset.name} 
(auto-selected as ${genrePrediction.genre}, RMS ${analysis.rmsDb.toFixed(
        1,
      )} dB)`
    );
  }, [tracks]);

  const allReady = tracks.some((track) => track.file);

  return (
    <main className="min-h-screen bg-black text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        {/* Header bar */}
        <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] text-brand-muted">
              <Link href="/" className="hover:text-emerald-300">
                MIXSMVRT
              </Link>
              <span>/</span>
              <span className="text-brand-text">Mix &amp; Master</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
              MIXSMVRT Studio
            </h1>
            <p className="mt-1 text-xs text-brand-muted">
              Drop in your beat and vocals. MIXSMVRT balances levels, cleans up
              resonances, and prints a streaming‑ready master tuned for modern
              Caribbean and global sounds.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <div className="rounded-full border border-slate-700 bg-slate-950/90 px-3 py-1 text-slate-300">
              Target
              <select
                className="ml-2 bg-transparent text-emerald-300 outline-none"
                value={targetPreset}
                onChange={(event) => setTargetPreset(event.target.value)}
              >
                <option className="bg-slate-900">Streaming (-14 LUFS)</option>
                <option className="bg-slate-900">Club (-9 LUFS)</option>
                <option className="bg-slate-900">YouTube (-13 LUFS)</option>
              </select>
            </div>
            <div className="rounded-full border border-slate-700 bg-slate-950/90 px-3 py-1 text-slate-300">
              Genre
              <select
                className="ml-2 bg-transparent text-emerald-300 outline-none"
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
              >
                <option className="bg-slate-900">Dancehall</option>
                <option className="bg-slate-900">Afrobeats</option>
                <option className="bg-slate-900">Hip Hop</option>
                <option className="bg-slate-900">Reggae</option>
              </select>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,_1.6fr)_minmax(0,_1.1fr)]">
          {/* Left: tracks & timeline */}
          <section className="space-y-4">
            {/* Transport + timeline header */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-[11px] text-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setTransportState((prev) =>
                      prev === "playing" ? "paused" : "playing",
                    )
                  }
                  disabled={!allReady}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-semibold text-black shadow-[0_0_18px_rgba(16,185,129,0.7)] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none"
                >
                  {transportState === "playing" ? "⏸" : "▶"}
                </button>
                <button
                  type="button"
                  onClick={() => setTransportState("stopped")}
                  disabled={!allReady}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[11px] text-slate-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
                >
                  ■
                </button>
                <span className="ml-1 text-[10px] text-slate-400">Session time</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 sm:flex">
                  <span className="text-[10px] text-slate-400">Grid</span>
                  <span className="text-[10px] text-slate-200">1/4</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1">
                  <span className="text-[10px] text-slate-400">Zoom</span>
                  <input
                    type="range"
                    min={0.6}
                    max={2}
                    step={0.1}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="h-1 w-24 accent-emerald-400"
                  />
                </div>
              </div>
            </div>

            {/* Timeline grid + stacked tracks */}
            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/90 px-2 py-2">
              <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                <span>Bars</span>
                <span>Intro</span>
                <span>Verse</span>
                <span>Hook</span>
                <span>Bridge</span>
                <span>Outro</span>
              </div>
              <div className="max-h-[360px] overflow-y-auto pr-1">
                {tracks.map((track) => (
                  <WaveformTrack
                    key={track.id}
                    track={track}
                    zoom={zoom}
                    transportState={transportState}
                    onReady={() => {}}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Right: upload zones + chain */}
          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4">
              <h2 className="text-sm font-semibold text-slate-50">Upload stems</h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Drag and drop your beat, vocals, and extras. Well treat each
                track individually before hitting the master bus.
              </p>
              <div className="mt-4 space-y-3">
                <UploadZone
                  label="Beat / Instrumental"
                  hint="Upload a stereo beat or full instrumental bounce (MP3, WAV, AIFF)"
                  onFileSelected={(file) => updateTrackFile("beat", file)}
                />
                <UploadZone
                  label="Lead vocal"
                  hint="Main vocal performance for the record"
                  onFileSelected={(file) => updateTrackFile("lead", file)}
                />
                <UploadZone
                  label="Adlibs / backing"
                  hint="Extra vocals, harmonies, shouts, or dubs"
                  onFileSelected={(file) => updateTrackFile("adlibs", file)}
                />
              </div>
            </div>

            {/* AI chain overview */}
            <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/90 p-4 text-[11px]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-50">AI mix chain</h2>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                  Sends stems to AI backend
                </span>
              </div>
              <p className="text-slate-400">
                Once you hit Run mix + master well analyze each stem, apply
                per-track processing, then glue everything together on the master
                bus.
              </p>
              <ol className="mt-2 space-y-1 text-slate-300">
                <li>1. Vocal cleanup (EQ, de-ess, compression)</li>
                <li>2. Beat enhancement (transient shaping, low-end control)</li>
                <li>3. Bus processing (glue compression, tone shaping)</li>
                <li>4. Mastering (limiter, loudness, final polish)</li>
              </ol>

              <button
                type="button"
                disabled={!allReady}
                onClick={handlePreviewLocal}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-emerald-400/60 bg-slate-950 px-4 py-2 text-xs font-semibold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.45)] transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-400 disabled:shadow-none"
              >
                {allReady ? "Preview AI mix locally" : "Add audio to preview"}
              </button>

              <button
                type="button"
                disabled={!allReady || isSubmitting}
                onClick={handleSubmitToBackend}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black shadow-[0_0_35px_rgba(16,185,129,0.7)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none"
              >
                {isSubmitting
                  ? "Sending stems to AI engine..."
                  : allReady
                  ? "Run mix + master"
                  : "Add at least one audio file"}
              </button>
              {serverMessage ? (
                <p className="mt-2 text-[10px] text-slate-400">{serverMessage}</p>
              ) : (
                <p className="mt-2 text-[10px] text-slate-500">
                  Well queue this session on the backend and return a master
                  file path in the response.
                </p>
              )}
              {previewInfo && (
                <p className="mt-1 text-[10px] text-emerald-300/90">{previewInfo}</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
