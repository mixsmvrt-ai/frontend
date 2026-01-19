"use client";

import { ProtectedPage } from "../components/ProtectedPage";

export default function BillingPage() {
  return (
    <ProtectedPage
      title="Billing & Plan"
      subtitle="Manage your MIXSMVRT subscription, invoices and upgrade options."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Current Plan
          </p>
          <p className="mt-2 text-lg font-semibold text-white">Free</p>
          <p className="mt-1 text-xs text-white/55">
            You&apos;re on the Free tier. Upgrade to unlock faster renders, higher quality and more
            minutes.
          </p>

          <button
            type="button"
            className="mt-4 inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-[0_0_22px_rgba(225,6,0,0.85)] hover:bg-red-500"
          >
            Upgrade plan
          </button>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Billing history
          </p>
          <p className="mt-2 text-xs text-white/55">
            Your invoices and payment history will appear here once billing is connected.
          </p>

          <div className="mt-4 h-32 rounded-xl border border-dashed border-white/10 bg-black/30 text-center text-[11px] text-white/45 flex items-center justify-center">
            No invoices yet.
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
