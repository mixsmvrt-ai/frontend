"use client";

import type React from "react";

export type PricingCardProps = {
  kind: "payg" | "subscription";
  name: string;
  price: string;
  unit?: string;
  description: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
  addOns?: { name: string; price: string }[];
  ctaLabel: string;
  onCtaClick?: () => void;
};

export function PricingCard({
  kind,
  name,
  price,
  unit,
  description,
  features,
  badge,
  highlight,
  addOns,
  ctaLabel,
  onCtaClick,
}: PricingCardProps) {
  const isPayAsYouGo = kind === "payg";

  return (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-brand-surface/90 p-5 text-sm shadow-panel transition-colors transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(225,6,0,0.55)] ${
        highlight
          ? "border-brand-primary"
          : "border-white/8 hover:border-brand-primary/70"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary/15 text-[11px] text-brand-primary">
              {isPayAsYouGo ? "●" : "★"}
            </div>
            <h3 className="text-base font-semibold text-brand-text">{name}</h3>
          </div>
          <p className="mt-2 text-xs text-brand-muted">{description}</p>
        </div>
        {badge && (
          <span className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-[10px] font-semibold text-brand-primary">
            {badge}
          </span>
        )}
      </div>

      <div className="mb-4 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-brand-text">{price}</span>
        {unit && <span className="text-xs text-brand-muted">{unit}</span>}
        {!unit && kind === "subscription" && (
          <span className="text-xs text-brand-muted">/ month</span>
        )}
      </div>

      <ul className="mb-4 space-y-1 text-xs text-brand-muted">
        {features.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>

      {isPayAsYouGo && addOns && addOns.length > 0 && (
        <div className="mb-4 rounded-xl border border-white/8 bg-black/40 p-3 text-[11px] text-brand-muted">
          <p className="mb-1 font-semibold text-white/80">Optional add-ons</p>
          <ul className="space-y-1">
            {addOns.map((addon) => (
              <li key={addon.name} className="flex items-center justify-between gap-2">
                <span>{addon.name}</span>
                <span className="text-brand-accent">{addon.price}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto">
        <button
          type="button"
          onClick={onCtaClick}
          className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-[13px] font-medium transition-colors transition-transform duration-150 hover:-translate-y-0.5 ${
            highlight || kind === "payg"
              ? "bg-brand-primary text-white hover:bg-[#ff291e]"
              : "border border-white/15 text-brand-text hover:border-brand-accent hover:text-brand-accent"
          }`}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

export default PricingCard;
