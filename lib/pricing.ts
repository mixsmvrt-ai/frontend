"use client";

export type PayAsYouGoAddOn = {
  id: string;
  name: string;
  price: string;
};

export type PayAsYouGoService = {
  id: "audio-cleanup" | "mix-only" | "mix-master" | "master-only";
  name: string;
  price: string; // e.g. "$4.99"
  unit: string; // e.g. "/ track" or "/ song"
  description: string;
  addOns: PayAsYouGoAddOn[];
  ctaLabel: string;
};

export type SubscriptionPlanId = "creator" | "pro-artist";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  price: string; // e.g. "$19.99"
  billingPeriod: string; // "per month"
  tagline: string; // short "Best for..." line
  description: string;
  includes: string[];
  badge?: string;
  ctaLabel: string;
};

export const PAYG_ADD_ONS: PayAsYouGoAddOn[] = [
  {
    id: "stem-cleanup",
    name: "Stem Cleanup",
    price: "+$2.99",
  },
  {
    id: "loudness-versions",
    name: "Loudness Versions (Spotify / Apple / Club)",
    price: "+$1.99",
  },
  {
    id: "express-processing",
    name: "Express Processing",
    price: "+$2.99",
  },
];

export const PAYG_SERVICES: PayAsYouGoService[] = [
  {
    id: "audio-cleanup",
    name: "Audio Cleanup",
    price: "$4.99",
    unit: "/ track",
    description: "Noise removal, vocal leveling, de-essing, and clarity enhancement.",
    addOns: PAYG_ADD_ONS,
    ctaLabel: "Pay & Process",
  },
  {
    id: "mix-only",
    name: "Mixing Only",
    price: "$9.99",
    unit: "/ song",
    description: "Balance vocals and beat, tone shaping, stereo placement.",
    addOns: PAYG_ADD_ONS,
    ctaLabel: "Pay & Process",
  },
  {
    id: "mix-master",
    name: "Mixing + Mastering",
    price: "$14.99",
    unit: "/ song",
    description: "Full mix plus loud, streaming-ready master.",
    addOns: PAYG_ADD_ONS,
    ctaLabel: "Pay & Process",
  },
  {
    id: "master-only",
    name: "Mastering Only",
    price: "$6.99",
    unit: "/ track",
    description: "Clean, loud stereo master for release or DJ use.",
    addOns: PAYG_ADD_ONS,
    ctaLabel: "Pay & Process",
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "creator",
    name: "Creator Plan",
    price: "$19.99",
    billingPeriod: "per month",
    tagline: "Best for bedroom artists and weekly releases.",
    description: "Stay consistent with a handful of releases every month.",
    includes: [
      "6 Audio Cleanups",
      "3 Mixing Only",
      "1 Mastering Only",
      "Standard presets",
      "Standard processing queue",
    ],
    ctaLabel: "Start Creator Plan",
  },
  {
    id: "pro-artist",
    name: "Pro Artist Plan",
    price: "$39.99",
    billingPeriod: "per month",
    tagline: "Best for serious artists, producers, and small studios.",
    description: "Handle regular drops, client work, and studio sessions without surprise costs.",
    includes: [
      "10 Audio Cleanups",
      "6 Mixing Only",
      "3 Mixing + Mastering",
      "Unlimited Mastering Only",
      "All premium presets",
      "Priority processing",
      "A/B comparison",
      "Advanced macro controls",
    ],
    badge: "Most Popular",
    ctaLabel: "Go Pro",
  },
];

export const FREE_PLAN = {
  title: "Free Plan",
  headline: "Try MixSmvrt Free",
  description:
    "Upload audio, choose presets, and preview AI processing on your track before you ever pay.",
  bullets: [
    "Upload audio",
    "Choose presets",
    "Preview processed audio (low-quality or 30-second preview)",
    "Upgrade to export full-quality masters",
  ],
  ctaLabel: "Try MixSmvrt Free",
};
