"use client";

import { useEffect } from "react";
import { useSessionStore } from "../store/useSessionStore";
import { TrackLane } from "./TrackLane";

export function MixerSidebar() {
  const { tracks, initDefaultTracks } = useSessionStore();

  useEffect(() => {
    if (!tracks.length) {
      initDefaultTracks();
    }
  }, [tracks.length, initDefaultTracks]);

  return (
    <aside className="flex w-64 flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 p-3 text-[11px] shadow-panel">
      <div className="flex items-center justify-between">
        <span className="text-slate-300">Tracks</span>
        <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-emerald-300">
          Mini mixer
        </span>
      </div>
      <div className="space-y-2">
        {tracks.map((track) => (
          <TrackLane key={track.id} track={track} />
        ))}
      </div>
    </aside>
  );
}
