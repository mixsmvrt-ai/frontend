"use client";

import { useState } from "react";
import { ProtectedPage } from "../components/ProtectedPage";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");

  return (
    <ProtectedPage
      title="Profile"
      subtitle="Control how your artist profile appears across MIXSMVRT."
    >
      <div className="grid gap-6 md:grid-cols-[auto,1fr]">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-600 via-red-500 to-amber-400 text-xl font-semibold text-white shadow-[0_0_25px_rgba(248,113,113,0.7)]">
            MM
          </div>
          <button
            type="button"
            className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] text-white/80 hover:border-red-500/60 hover:text-white"
          >
            Upload avatar
          </button>
          <p className="mt-2 text-[11px] text-white/45 text-center">
            Avatars are pulled from your Supabase user metadata. Future updates will let you manage
            them directly here.
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/70">Display name</label>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Artist or project name"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-white/70">Email</label>
              <input
                disabled
                value=""
                placeholder="Loaded from Supabase session"
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/60 placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 text-xs">
            <p className="text-white/45">Profile changes will apply to future invoices and project links.</p>
            <button
              type="button"
              className="inline-flex items-center rounded-full bg-red-600 px-4 py-1.5 font-medium text-white shadow-[0_0_18px_rgba(225,6,0,0.8)] hover:bg-red-500"
            >
              Save profile
            </button>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
