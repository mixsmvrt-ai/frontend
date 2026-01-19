"use client";

import { ProtectedPage } from "../../components/ProtectedPage";

export default function ProjectsPage() {
  return (
    <ProtectedPage
      title="Projects"
      subtitle="All your MIXSMVRT sessions, mixes, and masters in one place."
    >
      <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-white/80">You haven&apos;t created any projects yet.</p>
            <p className="mt-1 text-xs text-white/50">
              Once you run a mix or master in the Studio, it will appear here with status
              and playback.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/studio";
            }}
            className="mt-2 inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-[0_0_25px_rgba(225,6,0,0.7)] transition hover:bg-red-500"
          >
            Open Studio
          </button>
        </div>

        <div className="mt-6 grid gap-3 text-xs text-white/60">
          <div className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-black/30 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[11px] text-white/70">
                ♫
              </div>
              <div>
                <p className="text-[12px] font-medium text-white/80">No projects yet</p>
                <p className="text-[11px] text-white/45">
                  Your recent sessions will appear here with status like Processing, Completed, or
                  Failed.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-white/40">
              Empty
            </span>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
