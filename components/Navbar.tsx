"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AvatarDropdown } from "./AvatarDropdown";
import { MobileHamburgerMenu } from "./MobileHamburgerMenu";
import { Logo } from "./Logo";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const navItems = [
  { label: "Studio", href: "/studio" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
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

  // Close mobile menu on route change
  useEffect(() => {
    if (!open) return;
    setOpen(false);
    // We intentionally only react to pathname changes here so the
    // hamburger button can toggle the menu open without this effect
    // immediately closing it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-brand-bg/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
        <div className="flex flex-1 items-center gap-3 sm:flex-none sm:gap-6">
          <Logo />
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

      <MobileHamburgerMenu
        open={open}
        onClose={() => setOpen(false)}
        user={currentUser}
        email={email}
        displayName={displayName}
        initials={initials}
        planLabel={planLabel}
        pathname={pathname}
        onLogout={handleLogout}
      />
    </header>
  );
}
