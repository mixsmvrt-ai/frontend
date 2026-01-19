"use client";

import { ProtectedPage } from "../components/ProtectedPage";

const genres = ["Dancehall", "Trap Dancehall", "Afrobeats", "Hip-Hop", "R&B", "Reggae"];

export default function PresetsPage() {
  return (
    <ProtectedPage
      title="Presets Library"
      subtitle="Save and recall vocal chains, mastering curves, and go-to settings for every session."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {genres.map((genre) => (
              <button
                key={genre}
                type="button"
                className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/70 transition hover:border-red-500/60 hover:text-white"
              >
                {genre}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="rounded-full border border-dashed border-red-500/40 bg-red-500/5 px-4 py-1.5 text-xs font-medium text-red-300 hover:border-red-500 hover:bg-red-500/10"
          >
            + Save current chain
          </button>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <p className="text-white/80">No presets saved yet.</p>
          <p className="mt-1 text-xs text-white/50">
            Once you dial in a chain you love in the Studio, you&apos;ll be able to save it here and
            recall it across projects.
          </p>

          <div className="mt-5 grid gap-3 text-xs text-white/60 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Vocals
              </p>
              <p className="mt-1 text-sm text-white/80">Lead Vocal - Dancehall</p>
              <p className="mt-1 text-[11px] text-white/45">
                Your genre-tagged chains will appear here with EQ, compression, FX and de-esser
                settings.
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Masters
              </p>
              <p className="mt-1 text-sm text-white/80">Streaming Master</p>
              <p className="mt-1 text-[11px] text-white/45">
                Master curves, loudness targets and reference-matched presets will be listed here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
