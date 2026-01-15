"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Email and password are required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Unable to log in with those details.");
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Unexpected error while logging in. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 pb-16 pt-12 sm:px-6">
        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-brand-accent">
            Log in
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-text">
            Welcome back to MIXSMVRT.
          </h1>
          <p className="mt-2 text-sm text-brand-muted">
            Continue your mixes, check on masters, and keep your sound consistent across every
            release.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/5 bg-brand-surface/80 p-5 text-sm"
        >
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-brand-text">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-brand-accent"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium text-brand-text">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-brand-accent"
              required
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-brand-muted">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/20 bg-black/60" />
              <span>Keep me signed in</span>
            </label>
            <button type="button" className="text-brand-accent hover:text-brand-primary">
              Forgot password?
            </button>
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_0_35px_rgba(225,6,0,0.9)] hover:bg-[#ff291e] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-xs text-brand-muted">
          Need an account?{" "}
          <Link href="/signup" className="text-brand-accent hover:text-brand-primary">
            Sign up for MIXSMVRT
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
