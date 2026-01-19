"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface ProtectedPageProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ProtectedPage({ title, subtitle, children }: ProtectedPageProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured || !supabase) {
      router.replace("/login");
      return undefined;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        if (!data.session) {
          router.replace("/login");
          return;
        }
        setUser(data.session.user);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        router.replace("/login");
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (!session) {
        router.replace("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading || !user) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-col items-center gap-3 text-center text-sm text-white/70">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" />
          <p>Loading your workspace&hellip;</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-5 flex flex-col gap-2 border-b border-white/5 pb-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-xs text-white/60 sm:text-sm">{subtitle}</p>
          )}
        </div>
      </header>
      <section className="flex-1 pb-8">
        <div className="grid gap-4 sm:gap-6 lg:gap-8">{children}</div>
      </section>
    </main>
  );
}
