"use client";

import { useEffect, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";

let WaveSurferModule: typeof WaveSurfer | null = null;

async function getWaveSurfer() {
  if (!WaveSurferModule) {
    const mod = await import("wavesurfer.js");
    WaveSurferModule = mod.default;
  }
  return WaveSurferModule;
}

type AdminWaveformPlayerProps = {
  url: string;
  label: string;
};

export function AdminWaveformPlayer({ url, label }: AdminWaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      if (!containerRef.current) return;
      const WS = await getWaveSurfer();

      const ws = WS.create({
        container: containerRef.current,
        waveColor: "#4b5563",
        progressColor: "#ef4444",
        cursorColor: "#f97316",
        barWidth: 2,
        barRadius: 2,
        barGap: 1,
        height: 64,
        normalize: true,
      });

      wavesurferRef.current = ws;

      ws.on("ready", () => {
        if (!mounted) return;
        setIsReady(true);
      });

      ws.on("finish", () => {
        if (!mounted) return;
        setIsPlaying(false);
      });

      ws.load(url);
    }

    void setup();

    return () => {
      mounted = false;
      if (wavesurferRef.current) {
        try {
          // WaveSurfer.destroy may return void or a Promise; we ignore the return
          // value here to keep cleanup simple.
          wavesurferRef.current.destroy();
        } catch {
          // ignore
        }
        wavesurferRef.current = null;
      }
    };
  }, [url]);

  const toggle = () => {
    if (!wavesurferRef.current || !isReady) return;
    wavesurferRef.current.playPause();
    setIsPlaying((p) => !p);
  };

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/60 p-3">
      <div className="flex items-center justify-between text-[11px] text-zinc-300">
        <span>{label}</span>
        <button
          type="button"
          onClick={toggle}
          disabled={!isReady}
          className="rounded-full border border-zinc-600 px-3 py-0.5 text-[11px] text-zinc-100 hover:border-red-500 hover:bg-red-500/10 disabled:border-zinc-700 disabled:text-zinc-500"
        >
          {isReady ? (isPlaying ? "Pause" : "Play") : "Loading"}
        </button>
      </div>
      <div ref={containerRef} className="h-16 w-full" />
    </div>
  );
}
