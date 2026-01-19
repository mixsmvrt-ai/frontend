"use client";

import { ProtectedPage } from "../components/ProtectedPage";

export default function AbTestsPage() {
  return (
    <ProtectedPage
      title="A/B Tests"
      subtitle="Compare different mixes, masters, and chains side by side before you release."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <p className="font-medium text-white/90">Create your first A/B test</p>
          <p className="mt-1 text-xs text-white/55">
            Drop in two versions of a mix or master and switch instantly between them. Critical
            listening made easy.
          </p>

          <div className="mt-5 grid gap-3 text-xs text-white/60">
            <div className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-black/30 px-3 py-2.5">
              <div>
                <p className="text-[12px] font-medium text-white/80">Version A</p>
                <p className="text-[11px] text-white/45">Original mix or first pass.</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/70 hover:border-red-500/60 hover:text-white"
              >
                Select file
              </button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-black/30 px-3 py-2.5">
              <div>
                <p className="text-[12px] font-medium text-white/80">Version B</p>
                <p className="text-[11px] text-white/45">Alternate mix, master or chain.</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/70 hover:border-red-500/60 hover:text-white"
              >
                Select file
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <p className="font-medium text-white/90">Listening view</p>
          <p className="mt-1 text-xs text-white/55">
            Future updates will show waveform views, loudness readouts and blind-test controls.
          </p>

          <div className="mt-5 flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/30 text-xs text-white/50">
            A/B comparison UI coming soon.
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
