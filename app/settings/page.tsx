"use client";

import { ProtectedPage } from "../../components/ProtectedPage";

export default function SettingsPage() {
  return (
    <ProtectedPage
      title="Settings"
      subtitle="Tune your default processing preferences, notifications and account safety."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Audio defaults
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-white/70">Default loudness target</label>
              <select className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/80 focus:border-red-500 focus:outline-none">
                <option>-14 LUFS (Streaming)</option>
                <option>-9 LUFS (Club)</option>
                <option>-16 LUFS (Podcast)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-white/70">Default output format</label>
              <select className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/80 focus:border-red-500 focus:outline-none">
                <option>WAV 24-bit</option>
                <option>WAV 16-bit</option>
                <option>MP3 320kbps</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Notifications
          </p>
          <div className="mt-4 space-y-3 text-xs">
            <label className="flex items-center justify-between gap-3">
              <span className="text-white/80">Email me when a render finishes</span>
              <input type="checkbox" className="h-4 w-7 cursor-pointer rounded-full border border-white/15 bg-black/60" />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-white/80">Product updates & tips</span>
              <input type="checkbox" className="h-4 w-7 cursor-pointer rounded-full border border-white/15 bg-black/60" />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-red-900/60 via-black to-black p-6 text-sm text-white/80">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400">
            Danger zone
          </p>
          <p className="mt-2 text-xs text-white/60">
            Deleting your account will remove your projects and personal data from MIXSMVRT. This
            action cannot be undone.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center rounded-full border border-red-500/70 bg-red-600/10 px-4 py-2 text-xs font-medium text-red-300 hover:bg-red-600/20"
          >
            Delete account
          </button>
        </div>
      </div>
    </ProtectedPage>
  );
}
