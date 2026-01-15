import Link from "next/link";

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

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
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

        <section className="mt-8 grid gap-5 md:grid-cols-3" aria-label="Pricing tiers">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-2xl border bg-brand-surface/80 p-5 text-sm ${
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
                <Link
                  href="/signup"
                  className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-[13px] font-medium ${
                    tier.highlight
                      ? "bg-brand-primary text-white hover:bg-[#ff291e]"
                      : "border border-white/15 text-brand-text hover:border-brand-accent hover:text-brand-accent"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-6 text-sm text-brand-muted md:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-brand-surface/80 p-5">
            <h2 className="text-sm font-semibold text-brand-text">Caribbean‑ready, global‑friendly</h2>
            <p className="mt-2 text-xs">
              MIXSMVRT is tuned for genres where bass, drums, and vocals carry the record:
              dancehall, Afrobeats, trap, reggae, amapiano, and more. Your masters travel well
              from sound system to streaming platform.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-brand-surface/80 p-5">
            <h2 className="text-sm font-semibold text-brand-text">No long contracts</h2>
            <p className="mt-2 text-xs">
              Upgrade, downgrade, or cancel any time. If you only need MIXSMVRT for a release
              cycle or tour run, thats cool – well be here when you come back.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
