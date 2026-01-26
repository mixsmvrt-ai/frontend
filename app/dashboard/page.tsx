"use client";

import Link from "next/link";

type QuickAction = {
  id: string;
  label: string;
  description: string;
  icon: string;
};

type Project = {
  id: string;
  title: string;
  type: string;
  status: "Processing" | "Ready";
  updatedAt: string;
};

type Suggestion = {
  id: string;
  message: string;
  context: string;
};

const quickActions: QuickAction[] = [
  {
    id: "cleanup",
    label: "Audio Cleanup",
    description: "Remove noise, tame harshness, and level your voice.",
    icon: "🎤",
  },
  {
    id: "mix-only",
    label: "Mixing Only",
    description: "Balance stems, place vocals, and shape the beat.",
    icon: "🎚",
  },
  {
    id: "mix-master",
    label: "Mixing + Mastering",
    description: "Full chain from stems to streaming‑ready master.",
    icon: "🎛",
  },
  {
    id: "master-only",
    label: "Mastering Only",
    description: "Upload a stereo bounce and get a loud, clean master.",
    icon: "🔊",
  },
];

const recentProjects: Project[] = [
  {
    id: "1",
    title: "Kingston Riddim (v3)",
    type: "Mix + Master",
    status: "Ready",
    updatedAt: "2 hours ago",
  },
  {
    id: "2",
    title: "Late Night Voice Note",
    type: "Audio Cleanup",
    status: "Ready",
    updatedAt: "Yesterday",
  },
  {
    id: "3",
    title: "Afrobeats Demo",
    type: "Mastering Only",
    status: "Processing",
    updatedAt: "Just now",
  },
];

const suggestions: Suggestion[] = [
  {
    id: "s1",
    message: "Your vocals could use a gentle de‑esser.",
    context: "Based on your last two uploads with bright top‑end.",
  },
  {
    id: "s2",
    message: "This track is ideal for the Club Loud preset.",
    context: "High energy riddim with strong low‑end and drums.",
  },
  {
    id: "s3",
    message: "Try a softer Streaming Ready master for long sets.",
    context: "Extended mixes and live recordings benefit from more dynamics.",
  },
];

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-6 lg:px-8">
        <header className="border-b border-white/5 pb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-accent">
            MIXSMVRT Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">
            Welcome back, let&apos;s make your track sound right.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-muted">
            Jump straight into a new mix, clean up a quick demo, or finish a
            master for release. MIXSMVRT keeps your sound consistent across
            sessions and platforms.
          </p>
        </header>

        <section
          aria-label="Quick actions"
          className="grid gap-3 sm:gap-4 md:grid-cols-5"
        >
          {quickActions.map((action) => (
            <Link
              key={action.id}
              href={{ pathname: "/studio", query: { flow: action.id } }}
              className="group flex flex-col justify-between rounded-2xl border border-white/5 bg-brand-surface/80 p-4 text-sm transition-colors transition-transform duration-150 hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-[0_0_35px_rgba(225,6,0,0.55)]"
            >
              <div>
                <div className="mb-2 text-2xl" aria-hidden="true">
                  {action.icon}
                </div>
                <h2 className="text-sm font-semibold text-brand-text">{action.label}</h2>
                <p className="mt-1 text-xs text-brand-muted">{action.description}</p>
              </div>
              <span className="mt-3 inline-flex items-center text-[11px] text-brand-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Start this flow
                <span className="ml-1">→</span>
              </span>
            </Link>
          ))}
        </section>

        <div className="grid gap-6 md:gap-5 lg:grid-cols-[minmax(0,_1.4fr)_minmax(0,_1fr)]">
          <section
            aria-label="Recent projects"
            className="rounded-2xl border border-white/5 bg-brand-surface/80 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-brand-text">Recent projects</h2>
                <p className="mt-1 text-[11px] text-brand-muted">
                  Pick up where you left off or check on processing status.
                </p>
              </div>
              <Link
                href="/studio"
                onClick={(event) => {
                  event.preventDefault();
                  const ev = new CustomEvent("open-studio-flow", { bubbles: true });
                  event.currentTarget.dispatchEvent(ev);
                }}
                className="inline-flex items-center justify-center rounded-full bg-brand-primary px-3 py-1.5 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-[#ff291e]"
              >
                New project
              </Link>
            </div>

            <div className="mt-2 overflow-hidden rounded-xl border border-white/5 bg-black/40">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-white/5 text-[11px] uppercase tracking-[0.14em] text-brand-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Project</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((project) => (
                    <tr key={project.id} className="border-t border-white/5 text-[11px] text-brand-muted">
                      <td className="px-3 py-2 text-brand-text">{project.title}</td>
                      <td className="px-3 py-2">{project.type}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                            project.status === "Ready"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">{project.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label="Smart suggestions" className="space-y-4">
            <div className="rounded-2xl border border-white/5 bg-brand-surface/80 p-4">
              <h2 className="text-sm font-semibold text-brand-text">Smart suggestions</h2>
              <p className="mt-1 text-[11px] text-brand-muted">
                Lightweight insights based on your recent uploads. Treat this as
                a starting point, not a rule.
              </p>
              <ul className="mt-4 space-y-3 text-xs text-brand-muted">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id} className="rounded-xl bg-black/40 p-3">
                    <p className="text-brand-text/90">{suggestion.message}</p>
                    <p className="mt-1 text-[11px] text-brand-muted">{suggestion.context}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-dashed border-brand-primary/40 bg-brand-surfaceMuted/70 p-4 text-xs text-brand-muted">
              <h3 className="text-sm font-semibold text-brand-text">Open the mix studio</h3>
              <p className="mt-1">
                Need more detail? Switch to the full stem‑based view to ride
                levels, tweak presets, and preview waveforms in real time.
              </p>
              <Link
                href="/studio"
                onClick={(event) => {
                  event.preventDefault();
                  const ev = new CustomEvent("open-studio-flow", { bubbles: true });
                  event.currentTarget.dispatchEvent(ev);
                }}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-1.5 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-[#ff291e]"
              >
                Go to MIXSMVRT Studio
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
