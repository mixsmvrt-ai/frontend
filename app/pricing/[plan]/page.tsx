"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedPage } from "../../../components/ProtectedPage";
import { PlanPayPalButtons } from "../../../components/PlanPayPalButtons";

type PlanKey = "starter" | "creator" | "pro";

const PLANS: Record<PlanKey, {
  name: string;
  price: string;
  billingPeriod: string;
  headline: string;
  description: string;
  features: string[];
}> = {
  starter: {
    name: "Starter",
    price: "Pay as you go",
    billingPeriod: "Per project",
    headline: "Only pay for what you need.",
    description:
      "Perfect if you only need MIXSMVRT for the occasional single, demo, or riddim clean-up.",
    features: [
      "Audio cleanup – $10 per track",
      "Mixing only – $29 per song",
      "Mixing & mastering – $59 per song",
      "Mastering only – $25 per song",
    ],
  },
  creator: {
    name: "Creator",
    price: "$24",
    billingPeriod: "Per month",
    headline: "For active artists & producers.",
    description:
      "Release consistently, collaborate often, and keep your mixes and masters sounding the same across projects.",
    features: [
      "Up to 40 masters per month",
      "Full stem mixing support",
      "Preset chains + A/B comparison",
      "Priority support",
    ],
  },
  pro: {
    name: "Pro",
    price: "$59",
    billingPeriod: "Per month",
    headline: "For studios & power users.",
    description:
      "Ideal for small studios, producers with multiple artists, and content teams handling lots of drops.",
    features: [
      "Unlimited masters (fair use)",
      "Team accounts (coming soon)",
      "Custom sound profiles",
      "Early access to new AI chains",
    ],
  },
};

interface PlanPageProps {
  params: { plan: string };
}

export default function PlanCheckoutPage({ params }: PlanPageProps) {
  const router = useRouter();
  const key = params.plan.toLowerCase() as PlanKey;
  const plan = PLANS[key];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMethod, setSelectedMethod] = useState<"paypal" | "card" | null>(null);

  if (!plan) {
    // If the plan key is invalid, send users back to pricing.
    if (typeof window !== "undefined") {
      router.replace("/pricing");
    }
    return null;
  }

  const openCheckout = (method: "paypal" | "card") => {
    setSelectedMethod(method);
    setStep(1);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setStep(1);
    setSelectedMethod(null);
  };

  return (
    <ProtectedPage
      title={`${plan.name} plan`}
      subtitle="Review everything included in your plan, then complete checkout in two quick steps."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,_1.1fr)_minmax(0,_0.9fr)]">
        <section className="space-y-4 rounded-2xl border border-white/5 bg-brand-surface/80 p-5 text-sm">
          <header className="border-b border-white/5 pb-4 mb-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-brand-accent">
              Plan overview
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white">{plan.name}</h1>
            <p className="mt-1 text-xs text-brand-muted">{plan.headline}</p>
          </header>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white">{plan.price}</span>
            <span className="text-xs text-brand-muted">{plan.billingPeriod}</span>
          </div>

          <p className="mt-2 text-xs text-brand-muted">{plan.description}</p>

          <div className="mt-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              What&apos;s included
            </h2>
            <ul className="mt-2 space-y-1 text-xs text-brand-muted">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <span className="mr-1 text-brand-accent">•</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="space-y-4 rounded-2xl border border-white/5 bg-black/70 p-5 text-sm">
          <header className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">Checkout</h2>
              <p className="mt-1 text-xs text-brand-muted">
                Secure payment powered by PayPal. No long contracts.
              </p>
            </div>
          </header>

          <div className="rounded-xl border border-white/10 bg-black/50 p-4 text-xs text-brand-muted">
            <div className="flex items-center justify-between">
              <span className="text-white/90">{plan.name} plan</span>
              <span className="text-brand-accent font-medium">{plan.price}</span>
            </div>
            <p className="mt-1 text-[11px]">
              Billed {plan.billingPeriod.toLowerCase()}. Cancel or change your plan any time from
              your account.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <button
              type="button"
              onClick={() => openCheckout("paypal")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-4 py-2 text-[13px] font-semibold text-black shadow-[0_0_25px_rgba(248,113,113,0.5)] transition hover:bg-brand-accent"
            >
              <span>Pay now</span>
            </button>
          </div>

          <p className="mt-2 text-[11px] text-brand-muted">
            You&apos;ll confirm your details in a quick two-step flow. On the final step
            you can choose PayPal or card and complete payment.
          </p>
        </aside>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-brand-surface p-5 text-sm shadow-2xl">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-accent">
                  {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
                </p>
                <h2 className="mt-1 text-base font-semibold text-white">
                  {step === 1 ? "Your details" : "Review & pay"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:border-white/40"
              >
                Close
              </button>
            </header>

            <div className="mb-4 flex items-center gap-2 text-[11px] text-brand-muted">
              <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-brand-primary" : "bg-white/10"}`} />
              <div className={`h-1.5 flex-1 rounded-full ${step === 2 ? "bg-brand-primary" : "bg-white/10"}`} />
            </div>

            {step === 1 ? (
              <form
                className="space-y-3 text-xs text-brand-muted"
                onSubmit={(event) => {
                  event.preventDefault();
                  setStep(2);
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[11px] text-white/80">First name</span>
                    <input
                      required
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-brand-accent"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-white/80">Last name</span>
                    <input
                      required
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-brand-accent"
                    />
                  </label>
                </div>
                <label className="space-y-1">
                  <span className="text-[11px] text-white/80">Email</span>
                  <input
                    type="email"
                    required
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-brand-accent"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-white/80">Country or region</span>
                  <input
                    required
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-brand-accent"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-white/80">Street address</span>
                  <input
                    required
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-brand-accent"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1 sm:col-span-1">
                    <span className="text-[11px] text-white/80">City</span>
                    <input
                      required
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-brand-accent"
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-1">
                    <span className="text-[11px] text-white/80">State / parish</span>
                    <input
                      required
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-brand-accent"
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-1">
                    <span className="text-[11px] text-white/80">Postal code</span>
                    <input
                      required
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-brand-accent"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_25px_rgba(225,6,0,0.8)] transition hover:bg-[#ff291e]"
                >
                  Continue to payment
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-xs text-brand-muted">
                <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-brand-accent">
                        Order summary
                      </p>
                      <p className="mt-1 text-sm text-white">{plan.name} plan</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{plan.price}</p>
                      <p className="text-[11px] text-brand-muted">{plan.billingPeriod}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span>Subtotal</span>
                    <span>{plan.price}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span>Estimated tax</span>
                    <span>Calculated at PayPal</span>
                  </div>
                  <div className="mt-3 h-px bg-white/10" />
                  <div className="mt-3 flex items-center justify-between text-[11px] text-white">
                    <span>Total due today</span>
                    <span className="font-semibold">{plan.price}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-brand-muted">
                    <span>Have a coupon?</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/80">
                      Optional
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="Enter coupon code"
                      className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-brand-accent"
                    />
                    <button
                      type="button"
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-white/80 hover:border-brand-accent hover:text-brand-accent"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <PlanPayPalButtons
                    planName={plan.name}
                    amountLabel={plan.price}
                    onSuccess={closeModal}
                    onCancel={closeModal}
                  />
                </div>

                <p className="mt-1 text-[10px] text-brand-muted">
                  Payments are securely processed by PayPal. You&apos;ll receive a receipt at the
                  email address you provide.
                </p>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mt-2 text-[11px] text-brand-muted underline-offset-2 hover:text-brand-accent hover:underline"
                >
                  Back to details
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ProtectedPage>
  );
}
