"use client";

import { ProtectedPage } from "../components/ProtectedPage";

export default function UploadHistoryPage() {
  return (
    <ProtectedPage
      title="Upload History"
      subtitle="Every file you&apos;ve sent through MIXSMVRT, ready to revisit and re-run."
    >
      <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-white/80">No uploads yet.</p>
            <p className="mt-1 text-xs text-white/50">
              When you drop audio into the Studio or upload for mastering, it will appear here with
              timestamps and processing type.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/upload";
            }}
            className="mt-2 inline-flex items-center rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-medium text-white/80 hover:border-red-500/60 hover:text-white"
          >
            Go to upload
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-dashed border-white/10 bg-black/30">
          <div className="grid grid-cols-[2fr,1fr,1fr] gap-2 border-b border-white/5 px-4 py-2 text-[11px] text-white/50">
            <span>File name</span>
            <span>Uploaded</span>
            <span className="text-right">Processing type</span>
          </div>
          <div className="px-4 py-4 text-[11px] text-white/45">
            No history yet. Your recent renders and analyses will surface here.
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
