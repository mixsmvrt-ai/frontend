// MIXSMVRT public landing page
// Route: / (app/page.tsx)

import Link from "next/link";

type Feature = {
  title: string;
  description: string;
};

type Step = {
  title: string;
  description: string;
};

type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

type Tier = {
  name: string;
  price: string;
  description: string;
  highlight?: boolean;
  features: string[];
};

function Hero() {
  return (
    <section className="relative border-b border-white/5 bg-[radial-gradient(circle_at_top,_rgba(225,6,0,0.25),_transparent_60%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_55%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center lg:py-24">
        <div className="max-w-xl flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-brand-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
            MIXSMVRT · AI Mix &amp; Master
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-text sm:text-4xl lg:text-5xl">
            Smarter mixing.
            <br className="hidden sm:block" />
            Better sound.
          </h1>
          <p className="mt-4 text-sm text-brand-muted sm:text-base">
            MIXSMVRT is an AI‑assisted mix and master studio built for
            Caribbean and global sounds – from dancehall and Afrobeats to
            trap, R&amp;B, and amapiano.
          </p>
          <p className="mt-2 text-xs text-brand-muted">
            Upload your track, choose a sound profile, and get a streaming‑ready
            master in minutes – without losing the feel of your riddim.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="group inline-flex items-center justify-center rounded-full bg-brand-primary px-7 py-3 text-sm font-semibold text-white shadow-[0_0_40px_rgba(225,6,0,0.9)] transition hover:bg-[#ff291e]"
            >
              Get Started
              <span className="ml-2 inline-block transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <Link
              href="#ab-demo"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-brand-surface/70 px-6 py-3 text-sm font-medium text-brand-text backdrop-blur-md transition hover:border-brand-accent/70 hover:text-brand-accent"
            >
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent/10 text-[11px] text-brand-accent">
                ▷
              </span>
              Hear the Difference
            </Link>
          </div>

          <p className="mt-5 text-[11px] text-brand-muted">
            No credit card required · Keep full rights to your music
          </p>
        </div>

        <div className="mt-10 flex-1 lg:mt-0">
          <WaveformHero />
        </div>
      </div>
    </section>
  );
}

// CSS-only animated waveform + meters
function WaveformHero() {
  return (
    <div className="relative mx-auto max-w-md rounded-3xl border border-white/8 bg-brand-surface/80 p-5 shadow-[0_0_80px_rgba(34,211,238,0.26)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between text-[11px] text-brand-muted">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span className="ml-2 text-[9px] uppercase tracking-[0.28em] text-brand-muted">
            MIXSMVRT Chain
          </span>
        </span>
        <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-brand-accent">
          AI Mix + Master
        </span>
      </div>

      <div className="relative mb-4 h-28 overflow-hidden rounded-2xl bg-gradient-to-tr from-black via-brand-surfaceMuted to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(225,6,0,0.32),_transparent_60%)] opacity-80" />
        <div className="relative flex h-full items-center justify-center gap-[2px] px-2">
          {Array.from({ length: 80 }).map((_, index) => {
            const isAccent = index % 9 === 0;
            const height = 18 + (Math.sin(index / 4) * 20 + Math.random() * 16);
            return (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="inline-block w-[2px] animate-[pulse_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-b from-brand-accent via-brand-primary to-white/80"
                style={{
                  height,
                  animationDelay: `${index * 20}ms`,
                  opacity: isAccent ? 0.9 : 0.5,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1 rounded-2xl bg-black/50 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] font-medium text-brand-muted">
            <span>Dancehall Master</span>
            <span className="text-brand-accent">Streaming Ready</span>
          </div>
          <div className="flex items-end gap-1">
            {Array.from({ length: 18 }).map((_, index) => {
              const level = 10 + (Math.sin(index / 2) * 10 + Math.random() * 10);
              const color = index > 13 ? "bg-red-500" : index > 9 ? "bg-amber-400" : "bg-emerald-400";
              return (
                <div key={index} className="flex-1 rounded-t-full bg-slate-900">
                  <div
                    className={`${color} w-full rounded-t-full transition-all duration-700`}
                    style={{ height: `${level + 18}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-brand-muted">
            <span>-20 LUFS</span>
            <span>-12</span>
            <span>-6</span>
            <span className="text-brand-accent">-9 dBFS</span>
          </div>
        </div>
        <div className="flex-1 rounded-2xl bg-black/50 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] font-medium text-brand-muted">
            <span>Signal Chain</span>
            <span className="rounded-full bg-brand-primary/15 px-2 py-0.5 text-[9px] text-brand-primary">
              Vocal · Beat · Master
            </span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-1 text-[10px] text-brand-text/80">
            <span className="rounded-full bg-brand-surfaceMuted px-2 py-1">EQ</span>
            <span className="rounded-full bg-brand-surfaceMuted px-2 py-1">De-esser</span>
            <span className="rounded-full bg-brand-surfaceMuted px-2 py-1">Bus Comp</span>
            <span className="rounded-full bg-brand-surfaceMuted px-2 py-1">Saturation</span>
            <span className="rounded-full bg-brand-surfaceMuted px-2 py-1">Limiter</span>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-brand-surfaceMuted">
            <div className="h-full w-2/3 animate-[pulse_2.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-brand-primary via-brand-accent to-white" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-brand-muted">
            <span>01:12 / 03:45</span>
            <span>Preset · Streaming Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: Feature) {
  return (
    <div className="group flex flex-col gap-2 rounded-2xl border border-white/5 bg-brand-surfaceMuted/80 p-5 shadow-panel transition hover:border-brand-primary/70 hover:shadow-[0_0_40px_rgba(225,6,0,0.45)]">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/15 text-brand-primary">
        ●
      </div>
      <h3 className="text-sm font-semibold text-brand-text">{title}</h3>
      <p className="text-xs text-brand-muted">{description}</p>
    </div>
  );
}

function StepCard({ title, description }: Step) {
  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-white/5 bg-brand-surface/80 p-5">
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-brand-accent/80 to-transparent" />
      <h3 className="text-sm font-semibold text-brand-text">{title}</h3>
      <p className="text-xs text-brand-muted">{description}</p>
    </div>
  );
}

function TestimonialCard({ quote, name, role }: Testimonial) {
  return (
    <figure className="flex h-full flex-col justify-between rounded-2xl border border-white/5 bg-brand-surface/80 p-5">
      <blockquote className="text-sm text-brand-text/90">“{quote}”</blockquote>
      <figcaption className="mt-4 text-xs text-brand-muted">
        <span className="font-medium text-brand-text">{name}</span>
        <span className="mx-1">·</span>
        <span>{role}</span>
      </figcaption>
    </figure>
  );
}

function TierCard({ name, price, description, highlight, features }: Tier) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-brand-surface/80 p-5 text-sm ${
        highlight
          ? "border-brand-primary shadow-[0_0_45px_rgba(225,6,0,0.55)]"
          : "border-white/5"
      }`}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-brand-text">{name}</h3>
        <p className="mt-1 text-xs text-brand-muted">{description}</p>
      </div>
      <div className="mb-4 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-brand-text">{price}</span>
        <span className="text-xs text-brand-muted">/ month</span>
      </div>
      <ul className="mb-4 space-y-1 text-xs text-brand-muted">
        {features.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      <div className="mt-auto">
        <Link
          href="/signup"
          className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-[13px] font-medium ${
            highlight
              ? "bg-brand-primary text-white hover:bg-[#ff291e]"
              : "border border-white/10 text-brand-text hover:border-brand-accent hover:text-brand-accent"
          }`}
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}

// Landing page root
export default function Landing() {
  const features: Feature[] = [
    {
      title: "AI mixing – per-track & full mix",
      description:
        "Send full stems or a 2‑track bounce. MIXSMVRT balances vocals, drums, and low‑end for modern genres.",
    },
    {
      title: "AI mastering that travels well",
      description:
        "Hit consistent loudness and clarity across Spotify, Apple Music, YouTube, and more.",
    },
    {
      title: "Stem support for real sessions",
      description:
        "Upload beat, lead, adlibs, backing vocals and more – each stem gets its own chain.",
    },
    {
      title: "Instant A/B comparison",
      description:
        "Switch between original and processed in one click so you always know what the AI is doing.",
    },
    {
      title: "Streaming‑ready exports",
      description:
        "Masters targeted for streaming, club, or YouTube, with clean transients and tight low‑end.",
    },
    {
      title: "Caribbean & global sound profiles",
      description:
        "Dancehall, Afrobeats, trap, reggae, amapiano – presets tuned for global bass‑driven music.",
    },
  ];

  const steps: Step[] = [
    {
      title: "Upload",
      description:
        "Drag in your stems or stereo bounce – WAV or high‑quality MP3 is fine.",
    },
    {
      title: "Choose preset",
      description:
        "Pick a vocal, mix bus, and master preset that matches your sound and platform.",
    },
    {
      title: "Preview A/B",
      description:
        "Audition original vs MIXSMVRT processing, tweak choices, and lock in your vibe.",
    },
    {
      title: "Download",
      description:
        "Export a clean master ready for Spotify, Apple Music, YouTube, or the dance.",
    },
  ];

  const testimonials: Testimonial[] = [
    {
      quote: "MIXSMVRT give mi vocals dem crisp and loud without killing the vibe.",
      name: "Khalil B.",
      role: "Artist · Kingston, Jamaica 🇯🇲",
    },
    {
      quote: "I can bounce a riddim, upload, and get a clean mix back in minutes.",
      name: "Shanice Rae",
      role: "Singer‑songwriter · Port of Spain, Trinidad & Tobago 🇹🇹",
    },
    {
      quote: "My Atlanta clients love that their demos already sound like playlist records.",
      name: "Marcus Lane",
      role: "Producer · Atlanta, USA 🇺🇸",
    },
  ];

  const tiers: Tier[] = [
    {
      name: "Starter",
      price: "Pay as you go",
      description: "Only pay for the services you need.",
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
      description: "For active artists and producers.",
      highlight: true,
      features: [
        "40 masters per month",
        "Full stem mixing support",
        "A/B comparison + presets",
        "Priority support",
      ],
    },
    {
      name: "Pro",
      price: "$59",
      description: "For studios and heavy users.",
      features: [
        "Unlimited bounces (fair use)",
        "Team accounts (coming soon)",
        "Custom sound profiles",
        "Early access to new AI chains",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      <Hero />

      <section id="features" className="border-b border-white/5 bg-brand-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-lg font-semibold text-brand-text sm:text-xl">
                Built for modern, bass‑heavy music.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-brand-muted">
                MIXSMVRT understands vocals, drums, and low‑end. From dancehall and Afrobeats
                to trap and amapiano, your mix stays loud, clean, and global.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-b border-white/5 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.19),_transparent_60%)] py-16"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 lg:flex-row lg:items-start">
          <div className="flex-1 max-w-md">
            <h2 className="text-lg font-semibold text-brand-text sm:text-xl">
              How MIXSMVRT works
            </h2>
            <p className="mt-3 text-sm text-brand-muted">
              No guesswork, no endless revisions. A clear four‑step flow that respects how
              artists actually work.
            </p>
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {steps.map((step) => (
              <StepCard key={step.title} {...step} />
            ))}
          </div>
        </div>
      </section>

      <section
        id="ab-demo"
        className="border-b border-white/5 bg-brand-surface py-16"
        aria-label="A/B comparison demo"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-[minmax(0,_1.1fr)_minmax(0,_1.2fr)] md:items-center">
            <div>
              <h2 className="text-lg font-semibold text-brand-text sm:text-xl">
                Hear the smart difference.
              </h2>
              <p className="mt-3 text-sm text-brand-muted">
                Think of MIXSMVRT like a focused mix engineer that never gets tired.
                It cleans harsh highs, keeps vocals in front, and protects your low‑end
                so it hits on small speakers and big systems.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-brand-muted">
                <li>• Before: muddy low‑mids, harsh sibilance, soft drums.</li>
                <li>
                  • After: tighter bass, controlled top end, and a master that stays loud without
                  breaking.
                </li>
                <li>• Perfect for last‑minute uploads and quick client refs.</li>
              </ul>
              <p className="mt-4 text-xs text-brand-muted">
                This demo is illustrative – your actual sound depends on your mix, stems, and
                preset choices.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/5 bg-black/60 p-4">
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-xl bg-brand-surfaceMuted/80 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-brand-muted">
                    <span>Original</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5">Unprocessed</span>
                  </div>
                  <div className="relative h-16 overflow-hidden rounded-md bg-slate-900">
                    <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-700/80" />
                    <div className="relative flex h-full items-center gap-[2px] px-2 opacity-70">
                      {Array.from({ length: 40 }).map((_, index) => (
                        <span
                          key={index}
                          className="inline-block w-[2px] rounded-full bg-slate-600"
                          style={{ height: `${18 + ((index % 5) + 1) * 6}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-brand-surfaceMuted/80 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-brand-muted">
                    <span>Processed</span>
                    <span className="rounded-full bg-brand-primary/15 px-2 py-0.5 text-[10px] text-brand-primary">
                      MIXSMVRT AI
                    </span>
                  </div>
                  <div className="relative h-16 overflow-hidden rounded-md bg-slate-900">
                    <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-700/80" />
                    <div className="relative flex h-full items-center gap-[2px] px-2">
                      {Array.from({ length: 40 }).map((_, index) => (
                        <span
                          key={index}
                          className="inline-block w-[2px] rounded-full bg-gradient-to-b from-brand-accent via-brand-primary to-white"
                          style={{ height: `${22 + ((index % 7) + 1) * 8}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-brand-muted">
                <span>
                  Example preset: <span className="text-brand-accent">Streaming Ready · Dancehall</span>
                </span>
                <Link
                  href="/studio"
                  className="inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-1.5 text-[11px] font-medium text-white hover:bg-[#ff291e]"
                >
                  Try your own track
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-brand-surface py-16" aria-label="Caribbean artist testimonials">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-text sm:text-xl">
                Trusted by Caribbean and global creators.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-brand-muted">
                MIXSMVRT keeps the flavour of your riddim while tightening the mix.
                Fast enough for last‑minute uploads, precise enough for official releases.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {testimonials.map((item) => (
              <TestimonialCard key={item.quote} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section
        id="presets"
        className="border-b border-white/5 bg-[radial-gradient(circle_at_top,_rgba(225,6,0,0.22),_transparent_60%)] py-16"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-text sm:text-xl">
                Presets that still feel like you.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-brand-muted">
                MIXSMVRT ships with vocal, mix bus, and master presets tuned for
                Caribbean and global sounds – from clean R&B to club‑loud dancehall.
              </p>
            </div>
            <p className="text-xs text-brand-muted">
              No generic templates – just smart starting points you can tweak and save.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-brand-surface/80 p-4 text-sm">
              <h3 className="text-sm font-semibold text-brand-text">Vocal presets</h3>
              <p className="mt-2 text-xs text-brand-muted">
                Clean Vocal, Aggressive Rap, Airy R&B – each with de‑essing, compression,
                and tone shaping tuned for voice.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-brand-muted">
                <li>• Keep patois clear without harsh top‑end.</li>
                <li>• Control sibilance while preserving brightness.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/5 bg-brand-surface/80 p-4 text-sm">
              <h3 className="text-sm font-semibold text-brand-text">Mix bus presets</h3>
              <p className="mt-2 text-xs text-brand-muted">
                Transparent glue for R&B and pop, or thicker bus compression for riddims and
                club‑driven beats.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-brand-muted">
                <li>• Keep low‑end tight on big systems.</li>
                <li>• Add weight without crushing the groove.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/5 bg-brand-surface/80 p-4 text-sm">
              <h3 className="text-sm font-semibold text-brand-text">Master presets</h3>
              <p className="mt-2 text-xs text-brand-muted">
                Streaming Ready, Club Loud, and Gentle Masters keep you within platform targets
                while preserving punch.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-brand-muted">
                <li>• Spotify‑friendly dynamics.</li>
                <li>• Club‑focused loudness for DJs and sound systems.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing-preview"
        className="border-b border-white/5 bg-brand-surface py-16"
        aria-label="Pricing preview"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-text sm:text-xl">
                Simple pricing for serious creators.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-brand-muted">
                Whether you release once a month or every week, MIXSMVRT keeps your masters
                consistent without burning studio hours.
              </p>
            </div>
            <Link
              href="/pricing"
              className="mt-2 inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-1.5 text-[13px] text-brand-text hover:border-brand-accent hover:text-brand-accent"
            >
              View full pricing
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {tiers.map((tier) => (
              <TierCard key={tier.name} {...tier} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-bg py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">
            Mix smarter today.
          </h2>
          <p className="mt-3 text-sm text-brand-muted">
            Give MIXSMVRT one track and hear how quickly it turns a rough idea
            into something ready for playlists, radio, or the sound system.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-7 py-2.5 text-sm font-semibold text-white shadow-[0_0_35px_rgba(225,6,0,0.9)] hover:bg-[#ff291e]"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-medium text-brand-text hover:border-brand-accent hover:text-brand-accent"
            >
              Log in to your account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
