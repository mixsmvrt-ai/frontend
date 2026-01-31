"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedPage } from "../../../components/ProtectedPage";
import { PlanPayPalButtons } from "../../../components/PlanPayPalButtons";
import { PAYG_SERVICES, SUBSCRIPTION_PLANS } from "../../../lib/pricing";

type PlanKey = "starter" | "creator" | "pro";

type PayAsYouGoOption = {
  id: string;
  label: string;
  amountLabel: string; // e.g. "$59" so we can parse the numeric amount
};

const paygAudioCleanup = PAYG_SERVICES.find((service) => service.id === "audio-cleanup");
const paygMixOnly = PAYG_SERVICES.find((service) => service.id === "mix-only");
const paygMixMaster = PAYG_SERVICES.find((service) => service.id === "mix-master");
const paygMasterOnly = PAYG_SERVICES.find((service) => service.id === "master-only");

const creatorSubscription = SUBSCRIPTION_PLANS.find((plan) => plan.id === "creator");
const proArtistSubscription = SUBSCRIPTION_PLANS.find((plan) => plan.id === "pro-artist");

const formatUnit = (unit: string) => {
  const trimmed = unit.trim();
  if (trimmed.startsWith("/")) {
    return `per ${trimmed.slice(1).trim()}`;
  }
  return trimmed;
};

const starterOptions: PayAsYouGoOption[] = (
  [
    paygAudioCleanup && {
      id: paygAudioCleanup.id,
      label: `${paygAudioCleanup.name} · ${paygAudioCleanup.price} ${formatUnit(paygAudioCleanup.unit)}`,
      amountLabel: paygAudioCleanup.price,
    },
    paygMixOnly && {
      id: paygMixOnly.id,
      label: `${paygMixOnly.name} · ${paygMixOnly.price} ${formatUnit(paygMixOnly.unit)}`,
      amountLabel: paygMixOnly.price,
    },
    paygMixMaster && {
      id: paygMixMaster.id,
      label: `${paygMixMaster.name} · ${paygMixMaster.price} ${formatUnit(paygMixMaster.unit)}`,
      amountLabel: paygMixMaster.price,
    },
    paygMasterOnly && {
      id: paygMasterOnly.id,
      label: `${paygMasterOnly.name} · ${paygMasterOnly.price} ${formatUnit(paygMasterOnly.unit)}`,
      amountLabel: paygMasterOnly.price,
    },
  ].filter(Boolean) as PayAsYouGoOption[]
);

const PLANS: Record<PlanKey, {
  name: string;
  price: string;
  billingPeriod: string;
  headline: string;
  description: string;
  features: string[];
  options?: PayAsYouGoOption[];
}> = {
  starter: {
    name: "Starter",
    price: "Pay as you go",
    billingPeriod: "Per project",
    headline: "Only pay for what you need.",
    description:
      "Perfect if you only need MIXSMVRT for the occasional single, demo, or riddim clean-up.",
    features: [
      paygAudioCleanup && `${paygAudioCleanup.name} – ${paygAudioCleanup.price} ${paygAudioCleanup.unit}`,
      paygMixOnly && `${paygMixOnly.name} – ${paygMixOnly.price} ${paygMixOnly.unit}`,
      paygMixMaster && `${paygMixMaster.name} – ${paygMixMaster.price} ${paygMixMaster.unit}`,
      paygMasterOnly && `${paygMasterOnly.name} – ${paygMasterOnly.price} ${paygMasterOnly.unit}`,
    ].filter((feature): feature is string => Boolean(feature)),
    options: starterOptions,
  },
  creator: {
    name: creatorSubscription?.name ?? "Creator Plan",
    price: creatorSubscription?.price ?? "$19.99",
    billingPeriod: creatorSubscription
      ? `${creatorSubscription.billingPeriod.charAt(0).toUpperCase()}${creatorSubscription.billingPeriod.slice(1)}`
      : "Per month",
    headline:
      creatorSubscription?.tagline ?? "For active artists & producers dropping regularly.",
    description:
      creatorSubscription?.description ??
      "Release regularly and keep mixes and masters consistent across songs without booking extra studio time.",
    features: creatorSubscription?.includes ?? [
      "6 Audio Cleanups",
      "3 Mixing Only",
      "1 Mastering Only",
      "Standard presets",
      "Standard processing queue",
    ],
  },
  pro: {
    name: proArtistSubscription?.name ?? "Pro Artist Plan",
    price: proArtistSubscription?.price ?? "$39.99",
    billingPeriod: proArtistSubscription
      ? `${proArtistSubscription.billingPeriod.charAt(0).toUpperCase()}${proArtistSubscription.billingPeriod.slice(1)}`
      : "Per month",
    headline:
      proArtistSubscription?.tagline ?? "For serious artists, small studios & power users.",
    description:
      proArtistSubscription?.description ??
      "Ideal for small studios, producers with multiple artists, and content teams handling many drops per month.",
    features: proArtistSubscription?.includes ?? [
      "10 Audio Cleanups",
      "6 Mixing Only",
      "3 Mixing + Mastering",
      "Unlimited Mastering Only",
      "All premium presets",
      "Priority processing",
      "A/B comparison",
      "Advanced macro controls",
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
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(() => {
    if (key === "starter") {
      const options = PLANS.starter.options ?? [];
      return options[0]?.id ?? null;
    }
    return null;
  });

  if (!plan) {
    // If the plan key is invalid, send users back to pricing.
    if (typeof window !== "undefined") {
      router.replace("/pricing");
    }
    return null;
  }

  const isPayAsYouGo = key === "starter";
  const payAsYouGoOptions: PayAsYouGoOption[] =
    isPayAsYouGo && plan.options ? plan.options : [];
  const selectedOption: PayAsYouGoOption | null = isPayAsYouGo
    ? payAsYouGoOptions.find((opt) => opt.id === selectedOptionId) ?? payAsYouGoOptions[0] ?? null
    : null;

  const effectiveAmountLabel = isPayAsYouGo && selectedOption ? selectedOption.amountLabel : plan.price;
  const effectiveLabel = isPayAsYouGo && selectedOption ? selectedOption.label : `${plan.name} plan`;

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
              <span className="text-brand-accent font-medium">{effectiveAmountLabel}</span>
            </div>
            <p className="mt-1 text-[11px]">
              Billed {plan.billingPeriod.toLowerCase()}. Cancel or change your plan any time from
              your account.
            </p>
          </div>

          {isPayAsYouGo && payAsYouGoOptions.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/60 p-4 text-xs text-brand-muted">
              <p className="mb-2 text-[11px] font-semibold text-white/80">
                Select what you want to pay for
              </p>
              <div className="space-y-2">
                {payAsYouGoOptions.map((option) => {
                  const isSelected = option.id === selectedOption?.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedOptionId(option.id)}
                      className={
                        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[11px] transition " +
                        (isSelected
                          ? "border-brand-accent bg-brand-accent/10 text-white"
                          : "border-white/15 bg-black/40 text-brand-muted hover:border-brand-accent/70 hover:text-white/80")
                      }
                    >
                      <span className="flex-1 pr-2">{option.label}</span>
                      <span className="text-xs font-semibold text-brand-accent">{option.amountLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                      <p className="mt-1 text-sm text-white">{effectiveLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{effectiveAmountLabel}</p>
                      <p className="text-[11px] text-brand-muted">{plan.billingPeriod}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span>Subtotal</span>
                    <span>{effectiveAmountLabel}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span>Estimated tax</span>
                    <span>Calculated at PayPal</span>
                  </div>
                  <div className="mt-3 h-px bg-white/10" />
                  <div className="mt-3 flex items-center justify-between text-[11px] text-white">
                    <span>Total due today</span>
                    <span className="font-semibold">{effectiveAmountLabel}</span>
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
                    planName={effectiveLabel}
                    amountLabel={effectiveAmountLabel}
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
