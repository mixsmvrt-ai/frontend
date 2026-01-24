"use client";

import { useEffect, useRef } from "react";
import type React from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

export type MobileHamburgerMenuProps = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  email: string;
  displayName: string;
  initials: string;
  planLabel: string;
  pathname: string | null;
  onLogout: () => Promise<void> | void;
};

export function MobileHamburgerMenu({
  open,
  onClose,
  user,
  email,
  displayName,
  initials,
  planLabel,
  pathname,
  onLogout,
}: MobileHamburgerMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Disable background scroll when menu is open
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Close on route change (pathname prop)
  useEffect(() => {
    if (!open) return;
    if (!pathname) return;
    // When pathname changes while open, close the menu
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Basic focus trapping + ESC handling
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;

    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const focusFirstElement = () => {
      const focusable = panel.querySelectorAll<HTMLElement>(focusableSelectors);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        panel.focus();
      }
    };

    focusFirstElement();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const focusable = panel.querySelectorAll<HTMLElement>(focusableSelectors);
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const current = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (current === first || !panel.contains(current)) {
            event.preventDefault();
            last.focus();
          }
        } else if (current === last || !panel.contains(current)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (lastFocusedElementRef.current) {
        lastFocusedElementRef.current.focus();
      }
    };
  }, [open, onClose]);

  const handleBackdropClick = () => {
    if (!open) return;
    onClose();
  };

  const handlePanelClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (!open) return;
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (!open) return;
    if (touchStartXRef.current == null) return;

    const currentX = event.touches[0]?.clientX ?? 0;
    const deltaX = currentX - touchStartXRef.current;

    // Simple swipe-left to close gesture
    if (deltaX < -50) {
      touchStartXRef.current = null;
      onClose();
    }
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    touchStartXRef.current = null;
  };

  const isAuthed = Boolean(user);

  const isLinkActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Only render the overlay when open to avoid any chance of an
  // invisible full-screen layer intercepting taps on mobile.
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 sm:hidden transition-opacity duration-300 opacity-100"
      aria-hidden={false}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        tabIndex={-1}
        className={`absolute left-0 top-0 flex h-full w-[80%] max-w-xs flex-col border-r border-white/5 bg-[#0b0b0f]/98 shadow-[4px_0_30px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={handlePanelClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 font-display text-[11px] font-semibold tracking-[0.32em] text-white/80 uppercase"
            onClick={onClose}
            aria-label="MIXSMVRT home"
          >
            <span className="relative inline-flex items-center gap-1">
              <span className="text-white/70 group-hover:text-white transition-colors">MIX</span>
              <span className="relative text-red-500 group-hover:text-red-400 transition-colors">
                SMVRT
                <span className="pointer-events-none absolute -bottom-1 left-0 flex h-[6px] w-full items-end justify-between opacity-70 group-hover:opacity-100 group-hover:shadow-[0_0_16px_rgba(225,6,0,0.8)] transition-all">
                  {Array.from({ length: 6 }).map((_, index) => {
                    const heights = [4, 7, 10, 7, 5, 8];
                    return (
                      // eslint-disable-next-line react/no-array-index-key
                      <span
                        key={index}
                        className="w-[3px] rounded-t-full bg-gradient-to-t from-red-600/70 via-red-400/80 to-white/80"
                        style={{ height: heights[index] }}
                      />
                    );
                  })}
                </span>
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-xs text-white/80 hover:bg-white/5"
          >
            
            
7
          </button>
        </div>

        {/* User summary (authed) */}
        {isAuthed && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-600 via-red-500 to-amber-400 text-[11px] font-semibold text-white shadow-[0_0_14px_rgba(248,113,113,0.8)]">
              <span>{initials}</span>
            </div>
            <div className="min-w-0 text-xs">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-[11px] text-white/60">{email}</p>
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                <span>{planLabel} Plan</span>
              </p>
            </div>
          </div>
        )}

        {/* Navigation content */}
        <div className="flex-1 overflow-y-auto py-3">
          {isAuthed ? (
            <>
              {/* Primary navigation */}
              <nav className="px-2 text-sm text-white/80">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Workspace
                </p>
                <Link
                  href="/studio"
                  onClick={onClose}
                  className={`mt-1 flex items-center justify-between rounded-2xl px-3 py-3 text-[14px] transition-colors ${
                    isLinkActive("/studio")
                      ? "bg-red-600 text-white shadow-[0_0_22px_rgba(225,6,0,0.7)]"
                      : "bg-white/3 text-white hover:bg-white/8"
                  }`}
                >
                  <span>Studio</span>
                  <span className="text-[11px] text-white/70">Open workspace</span>
                </Link>

                <Link
                  href="/projects"
                  onClick={onClose}
                  className={`mt-1 block rounded-2xl px-3 py-3 text-[14px] transition-colors ${
                    isLinkActive("/projects")
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  My Projects
                </Link>

                <Link
                  href="/presets"
                  onClick={onClose}
                  className={`mt-1 block rounded-2xl px-3 py-3 text-[14px] transition-colors ${
                    isLinkActive("/presets")
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Presets
                </Link>

                <Link
                  href="/upload-history"
                  onClick={onClose}
                  className={`mt-1 block rounded-2xl px-3 py-3 text-[14px] transition-colors ${
                    isLinkActive("/upload-history")
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Upload History
                </Link>

                <Link
                  href="/ab-tests"
                  onClick={onClose}
                  className={`mt-1 block rounded-2xl px-3 py-3 text-[14px] transition-colors ${
                    isLinkActive("/ab-tests")
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  A/B Tests
                </Link>

                <Link
                  href="/usage"
                  onClick={onClose}
                  className={`mt-1 block rounded-2xl px-3 py-3 text-[14px] transition-colors ${
                    isLinkActive("/usage")
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Usage &amp; Credits
                </Link>
              </nav>

              {/* Divider */}
              <div className="mt-4 border-t border-white/10" />

              {/* Account section */}
              <nav className="mt-3 px-2 text-sm text-white/80">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Account
                </p>
                <Link
                  href="/dashboard"
                  onClick={onClose}
                  className={`mt-1 block rounded-2xl px-3 py-3 text-[14px] transition-colors ${
                    isLinkActive("/dashboard")
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Profile
                </Link>
                <Link
                  href="/billing"
                  onClick={onClose}
                  className={`mt-1 block rounded-2xl px-3 py-3 text-[14px] transition-colors ${
                    isLinkActive("/billing")
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Billing &amp; Plan
                </Link>
                <Link
                  href="/settings"
                  onClick={onClose}
                  className={`mt-1 block rounded-2xl px-3 py-3 text-[14px] transition-colors ${
                    isLinkActive("/settings")
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Settings
                </Link>
                <Link
                  href="/support"
                  onClick={onClose}
                  className={`mt-1 block rounded-2xl px-3 py-3 text-[14px] transition-colors ${
                    isLinkActive("/support")
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Support
                </Link>
              </nav>
            </>
          ) : (
            // Logged-out state: simple auth actions
            <div className="flex h-full flex-col items-stretch justify-center gap-3 px-4 text-sm">
              <p className="mb-1 text-center text-[12px] text-white/60">
                Log in or create an account to open the MIXSMVRT studio.
              </p>
              <Link
                href="/login"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-full border border-brand-primary/40 bg-transparent text-[13px] font-medium text-brand-primary hover:border-brand-primary hover:bg-brand-primary/10"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-full bg-brand-primary text-[13px] font-medium text-white shadow-[0_0_25px_rgba(225,6,0,0.85)] transition hover:bg-[#ff291e]"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        {isAuthed && (
          <div className="border-t border-white/10 px-4 py-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                void onLogout();
              }}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-red-600 text-[13px] font-medium text-white shadow-[0_0_24px_rgba(225,6,0,0.9)] transition hover:bg-[#ff291e]"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
