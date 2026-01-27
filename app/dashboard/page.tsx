"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

type QuickAction = {
	id: string;
	label: string;
	description: string;
	icon: string;
};

type ProjectRow = {
	id: string;
	name: string;
	flow_key: string;
	status: string | null;
	updated_at: string | null;
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

function formatFlowLabel(flowKey: string): string {
	if (flowKey === "audio_cleanup") return "Audio Cleanup";
	if (flowKey === "mixing_only") return "Mixing Only";
	if (flowKey === "mix_master") return "Mixing + Mastering";
	if (flowKey === "mastering_only") return "Mastering Only";
	if (flowKey === "podcast") return "Podcast";
	return "Session";
}

function flowParamFromFlowKey(flowKey: string): string {
	if (flowKey === "audio_cleanup") return "cleanup";
	if (flowKey === "mixing_only") return "mix-only";
	if (flowKey === "mix_master") return "mix-master";
	if (flowKey === "mastering_only") return "master-only";
	if (flowKey === "podcast") return "podcast";
	return "mix-master";
}

function formatRelativeTime(timestamp: string | null): string {
	if (!timestamp) return "Just now";
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return "Just now";

	const diffMs = Date.now() - date.getTime();
	const diffMinutes = Math.floor(diffMs / 60000);
	if (diffMinutes < 1) return "Just now";
	if (diffMinutes < 60) return `${diffMinutes} min ago`;
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

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
	const router = useRouter();
	const [projects, setProjects] = useState<ProjectRow[]>([]);
	const [isLoadingProjects, setIsLoadingProjects] = useState(false);
	const [showNewProjectModal, setShowNewProjectModal] = useState(false);
	const [newProjectName, setNewProjectName] = useState("");
	const [newProjectFlowId, setNewProjectFlowId] = useState<string>("mix-master");
	const [isCreatingProject, setIsCreatingProject] = useState(false);
	const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

	useEffect(() => {
		if (!isSupabaseConfigured || !supabase) return;

		let isMounted = true;
		const load = async () => {
			try {
				setIsLoadingProjects(true);
				const { data, error } = await supabase
					.from("projects")
					.select("id, name, flow_key, status, updated_at")
					.order("updated_at", { ascending: false })
					.limit(8);
				if (!isMounted) return;
				if (error) {
					// eslint-disable-next-line no-console
					console.error("Error loading projects", error.message);
					setProjects([]);
					return;
				}
				setProjects(data || []);
			} finally {
				if (isMounted) setIsLoadingProjects(false);
			}
		};

		void load();
		return () => {
			isMounted = false;
		};
	}, []);

	const recentProjects = useMemo(() => projects, [projects]);

	const selectedFlowQuickAction = useMemo(
		() => quickActions.find((action) => action.id === newProjectFlowId) || quickActions[2],
		[newProjectFlowId],
	);

	const handleOpenProject = (project: ProjectRow) => {
		const flowParam = flowParamFromFlowKey(project.flow_key);
		router.push(`/studio?flow=${flowParam}&project_id=${project.id}`);
	};

	const handleCreateProject = async () => {
		if (!isSupabaseConfigured || !supabase) {
			router.push(`/studio?flow=${newProjectFlowId}`);
			return;
		}

		const trimmedName = newProjectName.trim() || "Untitled project";
		setIsCreatingProject(true);
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			const userId = sessionData.session?.user?.id;
			if (!userId) {
				router.push("/login");
				return;
			}

			const flowKey =
				newProjectFlowId === "cleanup"
					? "audio_cleanup"
					: newProjectFlowId === "mix-only"
						? "mixing_only"
						: newProjectFlowId === "mix-master"
							? "mix_master"
							: newProjectFlowId === "master-only"
								? "mastering_only"
								: "mix_master";

			const { data, error } = await supabase
				.from("projects")
				.insert({
					user_id: userId,
					name: trimmedName,
					flow_key: flowKey,
					status: "draft",
				})
				.select("id")
				.single();

			if (error || !data) {
				// eslint-disable-next-line no-console
				console.error("Error creating project", error?.message);
				router.push(`/studio?flow=${newProjectFlowId}`);
				return;
			}

			setShowNewProjectModal(false);
			setNewProjectName("");
			router.push(`/studio?flow=${newProjectFlowId}&project_id=${data.id}`);
		} finally {
			setIsCreatingProject(false);
		}
	};

	const handleDeleteProject = async (
		event: any,
		projectId: string,
	) => {
		event.stopPropagation();

		if (!isSupabaseConfigured || !supabase) return;
		// eslint-disable-next-line no-alert
		const confirmed = window.confirm("Delete this project? This can’t be undone.");
		if (!confirmed) return;

		setDeletingProjectId(projectId);
		try {
			const { error } = await supabase.from("projects").delete().eq("id", projectId);
			if (error) {
				// eslint-disable-next-line no-console
				console.error("Error deleting project", error.message);
				return;
			}
			setProjects((prev) => prev.filter((project) => project.id !== projectId));
		} finally {
			setDeletingProjectId(null);
		}
	};

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
								<span className="ml-1">↗</span>
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
							<button
								type="button"
								onClick={() => setShowNewProjectModal(true)}
								className="inline-flex items-center justify-center rounded-full bg-brand-primary px-3 py-1.5 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-[#ff291e]"
							>
								New project
							</button>
						</div>

						<div className="mt-2 overflow-hidden rounded-xl border border-white/5 bg-black/40">
							<table className="min-w-full text-left text-xs">
								<thead className="bg-white/5 text-[11px] uppercase tracking-[0.14em] text-brand-muted">
									<tr>
										<th className="px-3 py-2 font-medium">Project</th>
										<th className="px-3 py-2 font-medium">Type</th>
										<th className="px-3 py-2 font-medium">Status</th>
										<th className="px-3 py-2 font-medium">Updated</th>
										<th className="px-2 py-2 font-medium text-right" aria-label="Actions" />
									</tr>
								</thead>
								<tbody>
									{recentProjects.map((project) => (
										<tr
											key={project.id}
											className="border-t border-white/5 text-[11px] text-brand-muted hover:bg-white/5 cursor-pointer"
											onClick={() => handleOpenProject(project)}
										>
											<td className="px-3 py-2 text-brand-text">{project.name}</td>
											<td className="px-3 py-2">{formatFlowLabel(project.flow_key)}</td>
											<td className="px-3 py-2">
												<span
													className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
														project.status === "completed" || project.status === "Ready"
															? "bg-emerald-500/15 text-emerald-300"
															: "bg-amber-400/10 text-amber-300"
													}`}
												>
													{project.status ? project.status : "Draft"}
												</span>
											</td>
											<td className="px-3 py-2">{formatRelativeTime(project.updated_at)}</td>
										</tr>
									))}
									{recentProjects.length === 0 && !isLoadingProjects && (
									<td className="px-3 py-2">{formatRelativeTime(project.updated_at)}</td>
									<td className="px-2 py-2 text-right">
										<button
											type="button"
											onClick={(event) => handleDeleteProject(event, project.id)}
											disabled={deletingProjectId === project.id}
											className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] text-brand-muted hover:bg-red-600/20 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
											aria-label="Delete project"
										>
											<span aria-hidden="true">🗑</span>
										</button>
									</td>
											<td className="px-3 py-3" colSpan={4}>
												No projects yet – start a new one above.
											</td>
										</tr>
										<td className="px-3 py-3" colSpan={5}>
									{isLoadingProjects && (
										<tr className="border-t border-white/5 text-[11px] text-brand-muted">
											<td className="px-3 py-3" colSpan={4}>
												Loading your projects…
											</td>
										</tr>
										<td className="px-3 py-3" colSpan={5}>
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

			{showNewProjectModal && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
					<div className="w-full max-w-md rounded-2xl border border-white/10 bg-brand-surface/95 p-5 shadow-[0_0_45px_rgba(0,0,0,0.7)]">
						<div className="mb-3 flex items-center justify-between gap-2">
							<div>
								<p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-accent">
									New project
								</p>
								<h2 className="mt-1 text-sm font-semibold text-brand-text">Set up your session</h2>
							</div>
							<button
								type="button"
								onClick={() => setShowNewProjectModal(false)}
								className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-[13px] text-white/70 hover:border-white/50 hover:text-white/90"
							>
								×
							</button>
						</div>

						<div className="space-y-4 text-xs text-brand-muted">
							<div>
								<label className="text-[11px] font-medium text-brand-text/80">Project name</label>
								<input
									type="text"
									value={newProjectName}
									onChange={(event) => setNewProjectName(event.target.value)}
									placeholder="e.g. Kingston Riddim (v3)"
									className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/70"
								/>
							</div>

							<div>
								<div className="mb-1 flex items-center justify-between">
									<span className="text-[11px] font-medium text-brand-text/80">Flow</span>
									<span className="text-[10px] text-brand-muted">Pick how you want to work</span>
								</div>
								<div className="grid grid-cols-2 gap-2">
									{quickActions.map((action) => (
										<button
											key={action.id}
											type="button"
											onClick={() => setNewProjectFlowId(action.id)}
											className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left text-[11px] transition-all ${
												newProjectFlowId === action.id
													? "border-brand-primary bg-brand-primary/10 text-brand-text shadow-[0_0_25px_rgba(225,6,0,0.45)]"
													: "border-white/10 bg-black/40 text-brand-muted hover:border-brand-primary/60 hover:text-brand-text"
											}`}
										>
											<span className="text-base" aria-hidden="true">
												{action.icon}
											</span>
											<span className="font-semibold text-brand-text/90">{action.label}</span>
											<span className="text-[10px] text-brand-muted line-clamp-2">
												{action.description}
											</span>
										</button>
									))}
								</div>
							</div>

							<div className="flex items-center justify-between rounded-xl border border-dashed border-white/12 bg-black/30 px-3 py-2.5 text-[11px] text-brand-muted">
								<div>
									<p className="font-medium text-brand-text/80">Session vibe</p>
									<p className="text-[10px] text-brand-muted/90">
										We&apos;ll remember this flow for future renders and history.
									</p>
								</div>
								<div className="flex flex-col items-end text-[10px] text-brand-muted/90">
									<span>Mode: {selectedFlowQuickAction.label}</span>
									<span className="mt-0.5 opacity-70">Fast to set up, easy to tweak later.</span>
								</div>
							</div>
						</div>

						<div className="mt-4 flex items-center justify-end gap-2 text-[11px]">
							<button
								type="button"
								onClick={() => setShowNewProjectModal(false)}
								className="rounded-full border border-white/15 px-3 py-1.5 text-brand-muted hover:border-white/40 hover:text-brand-text"
								disabled={isCreatingProject}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleCreateProject}
								disabled={isCreatingProject}
								className="inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-1.5 text-[11px] font-medium text-white shadow-[0_0_25px_rgba(225,6,0,0.7)] hover:bg-[#ff291e] disabled:cursor-not-allowed disabled:bg-brand-primary/60"
							>
								{isCreatingProject ? "Creating…" : "Create & open studio"}
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}