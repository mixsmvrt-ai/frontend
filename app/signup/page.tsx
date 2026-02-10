"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const country = String(formData.get("country") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const heardAbout = String(formData.get("heardAbout") ?? "").trim();

    if (!email || !password) {
      setError("Email and password are required.");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            address,
            country,
            heard_about: heardAbout,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || "There was a problem creating your account.");
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Unexpected error while creating your account. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 pb-16 pt-12 sm:px-6">
        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-brand-accent">
            Get started
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-text">
            Create your MIXSMVRT account.
          </h1>
          <p className="mt-2 text-sm text-brand-muted">
            Upload a track, choose a preset, and hear how quickly MIXSMVRT takes you from idea
            to streaming‑ready master.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/5 bg-brand-surface/80 p-5 text-sm"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="firstName" className="text-xs font-medium text-brand-text">
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-brand-accent"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lastName" className="text-xs font-medium text-brand-text">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-brand-accent"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="displayName" className="text-xs font-medium text-brand-text">
              Display name / artist name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-brand-accent"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="address" className="text-xs font-medium text-brand-text">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              autoComplete="street-address"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-brand-accent"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="country" className="text-xs font-medium text-brand-text">
              Country
            </label>
            <select
              id="country"
              name="country"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-brand-accent"
              required
            >
              <option value="" className="bg-black">
                Select your country
              </option>
              <option value="Jamaica" className="bg-black">
                Jamaica
              </option>
              <option value="Trinidad and Tobago" className="bg-black">
                Trinidad &amp; Tobago
              </option>
              <option value="Barbados" className="bg-black">
                Barbados
              </option>
              <option value="United States" className="bg-black">
                United States
              </option>
              <option value="United Kingdom" className="bg-black">
                United Kingdom
              </option>
              <option value="Canada" className="bg-black">
                Canada
              </option>
              <option value="Other" className="bg-black">
                Other
              </option>
            </select>
          </div>

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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-medium text-brand-text">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-brand-accent"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-xs font-medium text-brand-text">
                Re-type password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-brand-accent"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="heardAbout" className="text-xs font-medium text-brand-text">
              How did you hear about MIXSMVRT?
            </label>
            <select
              id="heardAbout"
              name="heardAbout"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-brand-accent"
              required
            >
              <option value="" className="bg-black">
                Select an option
              </option>
              <option value="friend" className="bg-black">
                Friend / word of mouth
              </option>
              <option value="social" className="bg-black">
                Social media (Instagram, TikTok, X)
              </option>
              <option value="youtube" className="bg-black">
                YouTube video
              </option>
              <option value="search" className="bg-black">
                Search (Google, etc.)
              </option>
              <option value="producer" className="bg-black">
                From a producer / engineer
              </option>
              <option value="other" className="bg-black">
                Other
              </option>
            </select>
          </div>

          {error && <p className="text-[11px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_0_35px_rgba(225,6,0,0.9)] hover:bg-[#ff291e] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-2 text-[11px] text-brand-muted">
            No credit card required. You can upgrade or cancel any time.
          </p>
        </form>

        <p className="text-center text-xs text-brand-muted">
          Already using MIXSMVRT?{" "}
          <Link href="/login" className="text-brand-accent hover:text-brand-primary">
            Log in to your account
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
