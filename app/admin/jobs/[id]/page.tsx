"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminWaveformPlayer } from "../../../../components/admin/AdminWaveformPlayer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AdminJobDetail = {
  id: string;
  user_email: string;
  status: string;
  input_type: string;
  preset: string | null;
  duration_sec: number;
  created_at: string;
  steps: string[];
  input_url?: string;
  output_url?: string;
  logs?: string[];
};

export default function AdminJobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id ?? "";
  const [job, setJob] = useState<AdminJobDetail | null>(null);

  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await fetch(`${API_URL}/admin/jobs/${jobId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setJob(data.job || null);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load job", error);
      }
    }

    if (jobId) void fetchJob();
  }, [jobId]);

  if (!job) {
    return <p className="text-[11px] text-zinc-500">Loading job…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Job {job.id.slice(0, 8)}</h1>
          <p className="mt-1 text-xs text-zinc-400">{job.user_email}</p>
        </div>
        <span className="inline-flex rounded-full bg-zinc-800 px-3 py-1 text-[11px] text-zinc-200">
          {job.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3 text-xs text-zinc-200">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
          <p className="text-[11px] text-zinc-500">Preset</p>
          <p className="mt-1 text-[13px]">{job.preset || "—"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
          <p className="text-[11px] text-zinc-500">Input Type</p>
          <p className="mt-1 text-[13px]">{job.input_type}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
          <p className="text-[11px] text-zinc-500">Duration</p>
          <p className="mt-1 text-[13px]">{job.duration_sec.toFixed(1)}s</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {job.input_url && <AdminWaveformPlayer url={job.input_url} label="Input audio" />}
        {job.output_url && <AdminWaveformPlayer url={job.output_url} label="Output audio" />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 text-xs text-zinc-200">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Processing steps</p>
          <ul className="mt-2 space-y-1">
            {job.steps.map((step) => (
              <li key={step} className="rounded bg-black/60 px-2 py-1 text-[11px] text-zinc-200">
                {step}
              </li>
            ))}
            {job.steps.length === 0 && <li className="text-[11px] text-zinc-500">No steps recorded.</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Logs</p>
          <div className="mt-2 max-h-48 space-y-1 overflow-auto rounded bg-black/70 p-2 text-[11px] text-zinc-300">
            {job.logs && job.logs.length > 0 ? (
              job.logs.map((line, idx) => (
                <pre key={idx} className="whitespace-pre-wrap font-mono text-[10px] text-zinc-400">
                  {line}
                </pre>
              ))
            ) : (
              <p className="text-[11px] text-zinc-500">No logs captured.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
