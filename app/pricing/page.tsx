"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import { PAYG_SERVICES, SUBSCRIPTION_PLANS, FREE_PLAN, type SubscriptionPlan } from "../../lib/pricing";
import PricingCard from "../../components/pricing/PricingCard";

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"payg" | "subscription">("payg");
  const [billingPrices, setBillingPrices] = useState<Record<string, number>>({});

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

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;

    supabase
      .from("billing_plans")
      .select("key, price_month")
      .then(({ data, error }) => {
        if (!isMounted || error || !data) return;
        const map: Record<string, number> = {};
        for (const row of data as { key: string; price_month: number | null }[]) {
          if (row.key && typeof row.price_month === "number") {
            map[row.key] = row.price_month;
          }
        }
        setBillingPrices(map);
      })
      .catch(() => {
        // ignore – fall back to static prices
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getSubscriptionPriceLabel = (plan: SubscriptionPlan) => {
    if (plan.id === "creator" && typeof billingPrices.creator === "number") {
      return `$${billingPrices.creator.toFixed(2)}`;
    }
    if (plan.id === "pro-artist" && typeof billingPrices.pro === "number") {
      return `$${billingPrices.pro.toFixed(2)}`;
    }
    return plan.price;
  };

  const goToPlan = (slug: "starter" | "creator" | "pro") => {
    if (user) {
      router.push(`/pricing/${slug}`);
    } else {
      router.push(`/signup?plan=${slug}`);
    }
  };

  const handlePayAsYouGo = () => {
    goToPlan("starter");
  };

  const handleSubscription = (id: "creator" | "pro-artist") => {
    const slug = id === "creator" ? "creator" : "pro";
    goToPlan(slug);
  };

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
        <header className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-brand-accent">
            Pricing
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">
            Studio-quality sound without studio prices.
          </h1>
          <p className="mt-3 text-sm text-brand-muted">
            Choose pay-as-you-go for one-off tracks or a monthly plan if you&apos;re dropping
            music regularly.
          </p>
        </header>

        <section className="mt-8" aria-label="Pricing options">
          <div className="inline-flex rounded-full border border-white/10 bg-black/40 p-1 text-[11px]">
            <button
              type="button"
              onClick={() => setMode("payg")}
              className={`rounded-full px-3 py-1 font-medium transition-colors transition-transform duration-150 ${
                mode === "payg"
                  ? "bg-brand-primary text-black shadow-[0_0_18px_rgba(225,6,0,0.7)]"
                  : "text-brand-muted hover:text-brand-text"
              }`}
            >
              Pay-as-you-go
            </button>
            <button
              type="button"
              onClick={() => setMode("subscription")}
              className={`rounded-full px-3 py-1 font-medium transition-colors transition-transform duration-150 ${
                mode === "subscription"
                  ? "bg-brand-primary text-black shadow-[0_0_18px_rgba(225,6,0,0.7)]"
                  : "text-brand-muted hover:text-brand-text"
              }`}
            >
              Monthly plans
            </button>
          </div>

          {mode === "payg" ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PAYG_SERVICES.map((service) => (
                <PricingCard
                  key={service.id}
                  kind="payg"
                  name={service.name}
                  price={service.price}
                  unit={service.unit}
                  description={service.description}
                  features={["Pay once per track – no subscription"]}
                  addOns={service.addOns.map((addon) => ({
                    name: addon.name,
                    price: addon.price,
                  }))}
                  ctaLabel={service.ctaLabel}
                  onCtaClick={handlePayAsYouGo}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <PricingCard
                  key={plan.id}
                  kind="subscription"
                  name={plan.name}
                  price={getSubscriptionPriceLabel(plan)}
                  description={plan.tagline}
                  features={plan.includes}
                  badge={plan.badge}
                  highlight={plan.id === "pro-artist"}
                  ctaLabel={plan.ctaLabel}
                  onCtaClick={() => handleSubscription(plan.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-4 text-sm text-brand-muted sm:gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-brand-surface/80 p-5 transition-colors duration-150 hover:border-brand-accent/70">
            <h2 className="text-sm font-semibold text-brand-text">Caribbean‑ready, global‑friendly</h2>
            <p className="mt-2 text-xs">
              MIXSMVRT is tuned for genres where bass, drums, and vocals carry the record:
              dancehall, Afrobeats, trap, reggae, amapiano, and more. Your masters travel well
              from sound system to streaming platform.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-brand-surface/80 p-5 transition-colors duration-150 hover:border-brand-accent/70">
            <h2 className="text-sm font-semibold text-brand-text">No long contracts</h2>
            <p className="mt-2 text-xs">
              Upgrade, downgrade, or cancel any time. If you only need MIXSMVRT for a release
              cycle or tour run, that’s cool – we’ll be here when you come back.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-white/8 bg-black/80 p-5 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-accent">
                Free tier
              </p>
              <h2 className="mt-1 text-sm font-semibold text-brand-text">{FREE_PLAN.headline}</h2>
              <p className="mt-2 text-xs text-brand-muted">{FREE_PLAN.description}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_30px_rgba(225,6,0,0.7)] transition-colors transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#ff291e] sm:mt-0"
            >
              {FREE_PLAN.ctaLabel}
            </button>
          </div>
          <ul className="mt-3 grid gap-2 text-[11px] text-brand-muted sm:grid-cols-2">
            {FREE_PLAN.bullets.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
