"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "../../components/ProtectedPage";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

type ProcessingJob = {
  id: string;
  status: string | null;
  job_type: string | null;
  created_at: string;
  input_files: any;
  preset_key?: string | null;
};

function formatProcessingType(job: ProcessingJob): string {
  const input = (job.input_files as any) || {};
  const meta = (input && typeof input === "object" ? input._meta : null) || {};
  const featureType = (meta && typeof meta === "object" ? meta.feature_type : null) as
    | string
    | null;

  const key = (featureType || job.job_type || "").toLowerCase();

  if (key === "audio_cleanup") return "Audio Cleanup";
  if (key === "mixing_only" || key === "mix") return "Mix Only";
  if (key === "mix_master" || key === "mix-master") return "Mix & Master";
  if (key === "mastering_only" || key === "master") return "Mastering Only";
  if (key === "podcast") return "Podcast Processing";

  return "Processing";
}

function formatFileName(job: ProcessingJob): string {
  const input = (job.input_files as any) || {};
  const meta = (input && typeof input === "object" ? input._meta : null) || {};

  if (meta && typeof meta === "object" && typeof meta.display_name === "string") {
    return meta.display_name;
  }

  if (typeof input.file_name === "string") return input.file_name;
  if (typeof input.filename === "string") return input.filename;

  const paths: string[] = [];
  if (typeof input.beat_path === "string") paths.push(input.beat_path);
  if (typeof input.lead_path === "string") paths.push(input.lead_path);
  if (typeof input.adlibs_path === "string") paths.push(input.adlibs_path);

  if (paths.length) {
    const baseNames = paths
      .map((p) => (typeof p === "string" ? p.split(/[\\/]/).pop() || p : ""))
      .filter(Boolean);
    if (baseNames.length) return baseNames.join(" + ");
  }

  return "Session";
}

function formatWhen(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString();
}

export default function UploadHistoryPage() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      try {
        setLoading(true);
        const { data, error: queryError } = await supabase
          .from("processing_jobs")
          .select("id,status,job_type,created_at,input_files,preset_key")
          .order("created_at", { ascending: false })
          .limit(100);

        if (queryError) {
          throw queryError;
        }

        if (!cancelled && Array.isArray(data)) {
          setJobs(data as ProcessingJob[]);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load upload history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasHistory = jobs.length > 0;

  return (
    <ProtectedPage
      title="Upload History"
      subtitle="Every file you&apos;ve sent through MIXSMVRT Studio, ready to revisit and re-run."
    >
      <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-white/80">
              {loading
                ? "Loading your recent renders…"
                : hasHistory
                  ? "Your recent renders and analyses."
                  : "No uploads yet."}
            </p>
            <p className="mt-1 text-xs text-white/50">
              When you drop audio into the Studio, it will appear here with timestamps and
              processing type.
            </p>
            {error && !loading && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/studio";
            }}
            className="mt-2 inline-flex items-center rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-medium text-white/80 hover:border-red-500/60 hover:text-white"
          >
            Go to Studio
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-dashed border-white/10 bg-black/30">
          <div className="grid grid-cols-[2fr,1fr,1fr] gap-2 border-b border-white/5 px-4 py-2 text-[11px] text-white/50">
            <span>File name</span>
            <span>Uploaded</span>
            <span className="text-right">Processing type</span>
          </div>
          <div className="max-h-80 divide-y divide-white/5 overflow-y-auto text-[11px]">
            {loading && (
              <div className="flex items-center justify-center px-4 py-6 text-white/60">
                Loading…
              </div>
            )}
            {!loading && !hasHistory && !error && (
              <div className="px-4 py-4 text-white/45">
                No history yet. Your recent renders and analyses will surface here.
              </div>
            )}
            {!loading && hasHistory &&
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="grid grid-cols-[2fr,1fr,1fr] items-center gap-2 px-4 py-2 text-white/80"
                >
                  <span className="truncate">{formatFileName(job)}</span>
                  <span className="text-white/60">{formatWhen(job.created_at)}</span>
                  <span className="text-right text-white/70">{formatProcessingType(job)}</span>
                </div>
              ))}
            {!loading && error && (
              <div className="px-4 py-4 text-white/45">
                Unable to load history right now. Please try again in a moment.
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
