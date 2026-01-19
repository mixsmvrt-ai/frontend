"use client";

import { ProtectedPage } from "../components/ProtectedPage";

export default function UsagePage() {
  return (
    <ProtectedPage
      title="Usage & Credits"
      subtitle="Keep an eye on how much mixing, mastering and analysis time you&apos;re using."
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-red-600/30 via-red-500/10 to-black/60 p-5 text-sm text-white/80">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Credits Used
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">0</p>
          <p className="mt-1 text-xs text-white/60">You haven&apos;t consumed any credits yet.</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-black/40 p-5 text-sm text-white/80">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Remaining Minutes
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">Unlimited</p>
          <p className="mt-1 text-xs text-white/60">Your current plan has no tracked limit yet.</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-black/40 p-5 text-sm text-white/80">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Current Plan
          </p>
          <p className="mt-2 text-lg font-semibold text-white">Free</p>
          <p className="mt-1 text-xs text-white/60">
            Plan and usage data will sync here once billing is connected.
          </p>
        </div>
      </div>
    </ProtectedPage>
  );
}
