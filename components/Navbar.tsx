"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const navItems = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Presets", href: "/#presets" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setIsLoggedIn(Boolean(data.session));
      })
      .catch(() => {
        if (!isMounted) return;
        setIsLoggedIn(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      router.push("/");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error signing out", error);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-brand-bg/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-5 text-[13px] text-brand-muted sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="relative inline-flex items-center gap-1 transition-colors hover:text-brand-accent"
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 text-[13px] sm:flex">
          {isLoggedIn ? (
            <>
              <Link
                href="/studio"
                className="rounded-full bg-brand-primary px-4 py-1.5 font-medium text-white shadow-[0_0_25px_rgba(225,6,0,0.85)] transition hover:bg-[#ff291e]"
              >
                Open Studio
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-brand-primary/40 bg-transparent px-4 py-1.5 font-medium text-brand-primary hover:border-brand-primary hover:bg-brand-primary/10"
              >
                Log Out
              </button>
            </>
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

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-xs text-brand-text sm:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/5 bg-brand-bg/98 px-4 pb-4 sm:hidden">
          <nav className="flex flex-col gap-2 py-3 text-[13px] text-brand-muted">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-1.5 hover:bg-brand-surface hover:text-brand-accent"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-1 flex gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  href="/studio"
                  className="flex-1 rounded-full bg-brand-primary px-4 py-1.5 text-center text-[13px] font-medium text-white shadow-[0_0_25px_rgba(225,6,0,0.85)] transition hover:bg-[#ff291e]"
                  onClick={() => setOpen(false)}
                >
                  Open Studio
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="flex-1 rounded-full border border-brand-primary/40 bg-transparent px-4 py-1.5 text-center text-[13px] font-medium text-brand-primary hover:border-brand-primary hover:bg-brand-primary/10"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex-1 rounded-full border border-brand-primary/40 bg-transparent px-4 py-1.5 text-center text-[13px] font-medium text-brand-primary hover:border-brand-primary hover:bg-brand-primary/10"
                  onClick={() => setOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="flex-1 rounded-full bg-brand-primary px-4 py-1.5 text-center text-[13px] font-medium text-white shadow-[0_0_25px_rgba(225,6,0,0.85)] transition hover:bg-[#ff291e]"
                  onClick={() => setOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
