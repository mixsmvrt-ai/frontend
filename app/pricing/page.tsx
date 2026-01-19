"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const tiers = [
  {
    name: "Starter",
    price: "Pay as you go",
    headline: "Only pay for what you need",
    description:
      "Pick a service per project – from simple audio cleanup to full mix & master.",
    features: [
      "Audio cleanup – $10 per track",
      "Mixing only – $29 per song",
      "Mixing & mastering – $59 per song",
      "Mastering only – $25 per song",
    ],
  },
  {
    name: "Creator",
    price: "$24",
    headline: "For active artists & producers",
    description:
      "Release regularly and collaborate often? Keep your mix and master quality steady across tracks.",
    highlight: true,
    features: [
      "40 masters per month",
      "Full stem mixing support",
      "Presets + A/B comparison",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    price: "$59",
    headline: "For studios & power users",
    description:
      "Ideal for small studios, producers with multiple artists, and content teams handling many drops.",
    features: [
      "Unlimited masters (fair use)",
      "Team accounts (coming soon)",
      "Custom sound profiles",
      "Early access to new AI chains",
    ],
  },
];

type TierName = "Starter" | "Creator" | "Pro";

function getPlanSlug(name: TierName) {
  switch (name) {
    case "Starter":
      return "starter";
    case "Creator":
      return "creator";
    case "Pro":
      return "pro";
    default:
      return "starter";
  }
}

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleGetStarted = (tierName: TierName) => {
    const slug = getPlanSlug(tierName);

    if (user) {
      router.push(`/pricing/${slug}`);
      return;
    }

    router.push(`/signup?plan=${slug}`);
  };
  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
        <header className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-brand-accent">
            Pricing
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">
            Simple plans for serious creators.
          </h1>
          <p className="mt-3 text-sm text-brand-muted">
            MIXSMVRT replaces hours of manual tweaking with a focused AI mix and master
            chain. Choose a plan that matches how often you release music or content.
          </p>
        </header>

        <section
          className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-3"
          aria-label="Pricing tiers"
        >
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-2xl border bg-brand-surface/80 p-5 text-sm transition-colors transition-transform duration-150 hover:-translate-y-0.5 ${
                tier.highlight
                  ? "border-brand-primary shadow-[0_0_40px_rgba(225,6,0,0.6)]"
                  : "border-white/5"
              }`}
            >
              <div className="mb-4">
                <h2 className="text-base font-semibold text-brand-text">{tier.name}</h2>
                <p className="mt-1 text-xs text-brand-accent">{tier.headline}</p>
                <p className="mt-2 text-xs text-brand-muted">{tier.description}</p>
              </div>
              <div className="mb-4 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-brand-text">{tier.price}</span>
                {tier.name === "Starter" ? (
                  <span className="text-xs text-brand-muted">• per-project pricing</span>
                ) : (
                  <span className="text-xs text-brand-muted">/ month</span>
                )}
              </div>
              <ul className="mb-4 space-y-1 text-xs text-brand-muted">
                {tier.features.map((feature: string) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <div className="mt-auto">
                <button
                  type="button"
                  onClick={() => handleGetStarted(tier.name as TierName)}
                  className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-[13px] font-medium ${
                    tier.highlight
                      ? "bg-brand-primary text-white hover:bg-[#ff291e]"
                      : "border border-white/15 text-brand-text hover:border-brand-accent hover:text-brand-accent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleGetStarted(tier.name as TierName)}
                    className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-[13px] font-medium transition-colors transition-transform duration-150 hover:-translate-y-0.5 ${
                      tier.highlight
                        ? "bg-brand-primary text-white hover:bg-[#ff291e]"
                        : "border border-white/15 text-brand-text hover:border-brand-accent hover:text-brand-accent"
                    }`}
                  >
            <h2 className="text-sm font-semibold text-brand-text">Caribbean‑ready, global‑friendly</h2>
            <p className="mt-2 text-xs">
              MIXSMVRT is tuned for genres where bass, drums, and vocals carry the record:
              dancehall, Afrobeats, trap, reggae, amapiano, and more. Your masters travel well
              from sound system to streaming platform.
            </p>
          <section className="mt-10 grid gap-4 text-sm text-brand-muted sm:gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-brand-surface/80 p-5 transition-colors duration-150 hover:border-brand-accent/70">
            <h2 className="text-sm font-semibold text-brand-text">No long contracts</h2>
            <p className="mt-2 text-xs">
              Upgrade, downgrade, or cancel any time. If you only need MIXSMVRT for a release
              cycle or tour run, thats cool – well be here when you come back.
            </p>
          </div>
        </section>
            <div className="rounded-2xl border border-white/5 bg-brand-surface/80 p-5 transition-colors duration-150 hover:border-brand-accent/70">
    </main>
  );
}
