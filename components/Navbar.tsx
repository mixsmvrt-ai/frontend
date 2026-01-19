"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AvatarDropdown } from "./AvatarDropdown";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const navItems = [
  { label: "Studio", href: "/studio" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setCurrentUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setCurrentUser(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const email = currentUser?.email ?? "";
  const metadata = (currentUser?.user_metadata || {}) as Record<string, unknown>;
  const displayName =
    (metadata.full_name as string) || email || (metadata.username as string) || "Artist";
  const planLabel = (metadata.plan as string) || "Free";
  const initials =
    displayName
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "MM";

  const handleLogout = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      router.push("/");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error signing out", error);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-brand-bg/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
        <div className="flex flex-1 items-center gap-3 sm:flex-none sm:gap-6">
          <Link
            href="/"
            className="text-[11px] font-semibold tracking-[0.32em] uppercase text-brand-text/90 sm:text-sm"
            aria-label="MIXSMVRT home"
          >
            MIXSMVRT
          </Link>
          <nav className="hidden items-center gap-5 text-[13px] text-brand-muted sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`relative inline-flex items-center gap-1 transition-colors hover:text-brand-accent ${
                  item.href !== "/#features" &&
                  (pathname === item.href || pathname.startsWith(`${item.href}/`))
                    ? "text-white after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-full after:bg-red-500 after:shadow-[0_0_12px_rgba(248,113,113,0.9)]"
                    : ""
                }`}
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 text-[13px] sm:flex">
          {currentUser ? (
            <AvatarDropdown user={currentUser} onLogout={handleLogout} />
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-brand-primary/40 bg-transparent px-4 py-1.5 font-medium text-brand-primary hover:border-brand-primary hover:bg-brand-primary/10"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-brand-primary px-4 py-1.5 font-medium text-white shadow-[0_0_25px_rgba(225,6,0,0.85)] transition hover:bg-[#ff291e]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 sm:hidden">
          {currentUser && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-600 via-red-500 to-amber-400 text-[11px] font-semibold text-white shadow-[0_0_12px_rgba(248,113,113,0.7)]">
              <span>{initials}</span>
            </div>
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-xs text-brand-text"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
          aria-modal="true"
          role="dialog"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-3xl border-t border-white/10 bg-brand-bg/98 pb-4 shadow-[0_-20px_60px_rgba(0,0,0,0.85)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15" aria-hidden="true" />
            {currentUser && (
              <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-600 via-red-500 to-amber-400 text-[13px] font-semibold text-white shadow-[0_0_18px_rgba(248,113,113,0.7)]">
                  <span>{initials}</span>
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="truncate text-sm font-medium text-white">{displayName}</p>
                  <p className="truncate text-[11px] text-white/60">{email}</p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    <span>{planLabel} Plan</span>
                  </p>
                </div>
              </div>
            )}

            <nav className="mx-auto mt-1 flex max-w-6xl flex-col gap-1 px-4 py-2 text-sm text-brand-muted">
              <Link
                href="/studio"
                className="flex items-center justify-between rounded-2xl bg-brand-surface px-3 py-3 text-[14px] text-white"
                onClick={() => setOpen(false)}
              >
                <span>Studio</span>
                <span className="text-[11px] text-white/50">Open workspace</span>
              </Link>
              <Link
                href="/projects"
                className="rounded-2xl px-3 py-3 text-[14px] text-white/90 hover:bg-brand-surface"
                onClick={() => setOpen(false)}
              >
                Projects
              </Link>
              <Link
                href="/presets"
                className="rounded-2xl px-3 py-3 text-[14px] text-white/90 hover:bg-brand-surface"
                onClick={() => setOpen(false)}
              >
                Presets
              </Link>
              <Link
                href="/billing"
                className="rounded-2xl px-3 py-3 text-[14px] text-white/90 hover:bg-brand-surface"
                onClick={() => setOpen(false)}
              >
                Billing &amp; Plan
              </Link>
              <Link
                href="/settings"
                className="rounded-2xl px-3 py-3 text-[14px] text-white/90 hover:bg-brand-surface"
                onClick={() => setOpen(false)}
              >
                Settings
              </Link>
              <Link
                href="/support"
                className="rounded-2xl px-3 py-3 text-[14px] text-white/90 hover:bg-brand-surface"
                onClick={() => setOpen(false)}
              >
                Support
              </Link>
            </nav>

            <div className="mx-auto mt-2 flex max-w-6xl flex-col gap-2 px-4 text-[13px]">
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void handleLogout();
                  }}
                  className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-full bg-red-600 text-[13px] font-medium text-white shadow-[0_0_24px_rgba(225,6,0,0.9)] transition hover:bg-[#ff291e]"
                >
                  Log out
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-brand-primary/40 bg-transparent text-[13px] font-medium text-brand-primary hover:border-brand-primary hover:bg-brand-primary/10"
                    onClick={() => setOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-primary text-[13px] font-medium text-white shadow-[0_0_25px_rgba(225,6,0,0.85)] transition hover:bg-[#ff291e]"
                    onClick={() => setOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
