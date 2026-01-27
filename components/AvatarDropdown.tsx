"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useStudioFlowModal } from "./StudioFlowModal";

type ProjectRow = {
  id: string;
  name: string;
  flow_key: string;
  status: string | null;
  updated_at: string | null;
};

type AvatarDropdownProps = {
  user: User;
  onLogout: () => Promise<void> | void;
};

export function AvatarDropdown({ user, onLogout }: AvatarDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const email = user.email ?? "";
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const avatarUrl = (metadata.avatar_url as string) || "";
  const displayName =
    (metadata.full_name as string) || email || (metadata.username as string) || "Artist";

  const initials = displayName
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)

  const formatFlowLabel = (flowKey: string): string => {
    if (flowKey === "audio_cleanup") return "Audio Cleanup";
    if (flowKey === "mixing_only") return "Mixing Only";
    if (flowKey === "mix_master") return "Mix + Master";
    if (flowKey === "mastering_only") return "Mastering";
    if (flowKey === "podcast") return "Podcast";
    return "Session";
  };

  const flowParamFromFlowKey = (flowKey: string): string => {
    if (flowKey === "audio_cleanup") return "cleanup";
    if (flowKey === "mixing_only") return "mix-only";
    if (flowKey === "mix_master") return "mix-master";
    if (flowKey === "mastering_only") return "master-only";
    if (flowKey === "podcast") return "podcast";
    return "mix-master";
  };

  const formatRelativeTime = (timestamp: string | null): string => {
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
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    // Focus the first item when opening
    queueMicrotask(() => {
      firstItemRef.current?.focus();
    });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const { open: openStudioModal } = useStudioFlowModal();

  useEffect(() => {
    if (!open) return;
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true);
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, flow_key, status, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(6);

        if (!isMounted) return;
        if (error) {
          // eslint-disable-next-line no-console
          console.error("Error loading projects in avatar menu", error.message);
          setProjects([]);
          return;
        }
        setProjects(data || []);
      } finally {
        if (isMounted) setIsLoadingProjects(false);
      }
    };

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, [open, user.id]);

  const handleToggle = () => {
    setOpen((value) => !value);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((value) => !value);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleMenuItemClick = (callback?: () => void) => {
    return () => {
      setOpen(false);
      if (callback) callback();
    };
  };

  const handleOpenProject = (project: ProjectRow) => {
    const flowParam = flowParamFromFlowKey(project.flow_key);
    setOpen(false);
    router.push(`/studio?flow=${flowParam}&project_id=${project.id}`);
  };

  const handleDeleteProject = async (event: any, projectId: string) => {
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
        console.error("Error deleting project from avatar menu", error.message);
        return;
      }
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
    } finally {
      setDeletingProjectId(null);
    }
  };

  return (
    <div className="relative flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-600 via-red-500 to-amber-400 text-xs font-semibold text-white shadow-[0_0_18px_rgba(248,113,113,0.7)] ring-1 ring-white/10 transition hover:ring-red-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-11 w-72 origin-top-right rounded-2xl border border-white/10 bg-[#050509]/95 p-3 text-xs text-white shadow-[0_18px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl"
        >
          {/* User header */}
          <div className="mb-3 flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-600 via-red-500 to-amber-400 text-[13px] font-semibold text-white shadow-[0_0_18px_rgba(248,113,113,0.7)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-[11px] text-white/60">{email}</p>
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                <span>{planLabel} Plan</span>
              </p>
            </div>
          </div>

          {/* Main actions */}
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Workspace
            </p>
            <Link
              href="/studio"
              role="menuitem"
              onClick={(event) => {
                event.preventDefault();
                setOpen(false);
                openStudioModal();
              }}
              ref={firstItemRef as any}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[12px] text-white/90 transition hover:bg-white/5"
            >
              <span>Studio</span>
              <span className="text-[10px] text-white/40">⌘S</span>
            </Link>
            <div className="mt-1 rounded-lg bg-white/3 px-2 py-1.5">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  My Projects
                </p>
                <Link
                  href="/dashboard"
                  onClick={handleMenuItemClick()}
                  className="text-[10px] text-white/50 hover:text-white/80"
                >
                  View all
                </Link>
              </div>
              <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleOpenProject(project)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[11px] text-white/80 hover:bg-white/10"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{project.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-white/50">
                        {formatFlowLabel(project.flow_key)} • {formatRelativeTime(project.updated_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => handleDeleteProject(event, project.id)}
                      disabled={deletingProjectId === project.id}
                      className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] text-white/50 hover:bg-red-500/20 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Delete project"
                    >
                      🗑
                    </button>
                  </button>
                ))}
                {projects.length === 0 && !isLoadingProjects && (
                  <p className="px-1 py-1 text-[10px] text-white/40">
                    No projects yet.
                  </p>
                )}
                {isLoadingProjects && (
                  <p className="px-1 py-1 text-[10px] text-white/50">Loading…</p>
                )}
              </div>
            </div>
            <Link
              href="/presets"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Presets Library
            </Link>
            <Link
              href="/upload-history"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Upload History
            </Link>
            <Link
              href="/ab-tests"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              A/B Tests
            </Link>
            <Link
              href="/usage"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Usage &amp; Credits
            </Link>
          </div>

          {/* Account section */}
          <div className="mt-3 space-y-1 border-t border-white/5 pt-3">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Account
            </p>
            <Link
              href="/profile"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Profile
            </Link>
            <Link
              href="/billing"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Billing &amp; Plan
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Settings
            </Link>
            <Link
              href="/support"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Support
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-3 border-t border-white/5 pt-3">
            <button
              type="button"
              role="menuitem"
              onClick={handleMenuItemClick(async () => {
                await onLogout();
              })}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[12px] font-medium text-red-400 transition hover:bg-red-500/10"
            >
              <span>Log out</span>
              <span className="text-[10px] text-red-400/70">⇧⌘Q</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
