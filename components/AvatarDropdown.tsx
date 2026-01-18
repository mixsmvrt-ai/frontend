"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

type AvatarDropdownProps = {
  user: User;
  onLogout: () => Promise<void> | void;
};

export function AvatarDropdown({ user, onLogout }: AvatarDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

  const email = user.email ?? "";
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const avatarUrl = (metadata.avatar_url as string) || "";
  const displayName =
    (metadata.full_name as string) || email || (metadata.username as string) || "Artist";
  const planLabel = (metadata.plan as string) || "Free";

  const initials = displayName
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MM";

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
            <button
              ref={firstItemRef}
              type="button"
              onClick={handleMenuItemClick(() => {
                window.location.href = "/studio";
              })}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[12px] text-white/90 transition hover:bg-white/5"
            >
              <span>Studio</span>
              <span className="text-[10px] text-white/40">⌘S</span>
            </button>
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              My Projects
            </Link>
            <Link
              href="/presets"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Presets Library
            </Link>
            <Link
              href="/upload"
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
              href="/account/profile"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Profile
            </Link>
            <Link
              href="/account/billing"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Billing &amp; Plan
            </Link>
            <Link
              href="/account/settings"
              role="menuitem"
              onClick={handleMenuItemClick()}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/80 transition hover:bg-white/5"
            >
              Settings
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
