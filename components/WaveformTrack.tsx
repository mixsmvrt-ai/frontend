"use client";

import { useEffect, useRef } from "react";
import type WaveSurfer from "wavesurfer.js";
import type { TrackState } from "../lib/audioTypes";
import { useSessionStore } from "../store/useSessionStore";

let WaveSurferModule: typeof WaveSurfer | null = null;

async function getWaveSurfer() {
  if (!WaveSurferModule) {
    const mod = await import("wavesurfer.js");
    WaveSurferModule = mod.default;
  }
  return WaveSurferModule;
}

interface Props {
  track: TrackState;
  zoom: number;
}

export function WaveformTrack({ track, zoom }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const { isPlaying } = useSessionStore();

  useEffect(() => {
    const file = track.file;
    if (!file || !containerRef.current) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      const WS = await getWaveSurfer();
      if (!WS || cancelled) return;

      objectUrl = URL.createObjectURL(file);
      const ws = WS.create({
        container: containerRef.current!,
        waveColor: `${track.color}66`,
        progressColor: track.color,
        cursorColor: "#e5e7eb",
        barWidth: 2,
        barRadius: 2,
        height: 70,
        normalize: true,
        minPxPerSec: 60 * zoom,
        dragToSeek: true,
      });

      wavesurferRef.current = ws;
      ws.load(objectUrl);
    })();

    return () => {
      cancelled = true;
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [track.file, track.color, zoom]);

  useEffect(() => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.setOptions({ minPxPerSec: 60 * zoom });
  }, [zoom]);

  useEffect(() => {
    if (!wavesurferRef.current) return;
    if (isPlaying) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying]);

  return (
    <div className="relative flex-1 overflow-hidden rounded-lg bg-slate-900/80">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.9)_1px,transparent_1px)] bg-[length:40px_100%] opacity-40" />
      <div ref={containerRef} className="relative" />
    </div>
  );
}
