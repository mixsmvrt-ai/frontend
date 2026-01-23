"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface PlanPayPalButtonsProps {
  planName: string;
  amountLabel: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function parseAmount(amountLabel: string): string {
  const match = amountLabel.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return "1.00"; // fallback test amount
  return match[1];
}

export function PlanPayPalButtons({ planName, amountLabel, onSuccess, onCancel }: PlanPayPalButtonsProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-100">
        Set <span className="font-mono">NEXT_PUBLIC_PAYPAL_CLIENT_ID</span> in your environment to enable
        live PayPal checkout.
      </div>
    );
  }

  const amount = parseAmount(amountLabel);

  async function notifyBackendCapture(details: any) {
    try {
      const amountNumber = Number(amount);
      const amountCents = Number.isFinite(amountNumber)
        ? Math.round(amountNumber * 100)
        : 0;

      await fetch("/api/billing/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // planName comes in like "Starter plan" or "Mixing & mastering …"
          plan_key: planName.toLowerCase().includes("starter")
            ? "starter"
            : planName.toLowerCase().includes("creator")
            ? "creator"
            : planName.toLowerCase().includes("pro")
            ? "pro"
            : "starter",
          amount_cents: amountCents,
          provider: "paypal",
          provider_payment_id: details?.id ?? undefined,
        }),
      });
    } catch {
      // Best-effort only; payment already succeeded in PayPal
    }
  }

  return (
    <PayPalScriptProvider
      options={{
        // Some versions of the types expect both keys
        clientId,
        "client-id": clientId,
        currency: "USD",
      }}
    >
      <PayPalButtons
        style={{ layout: "vertical", shape: "pill" }}
        createOrder={(_, actions) => {
          return actions.order.create({
            intent: "CAPTURE",
            purchase_units: [
              {
                description: `${planName} plan`,
                amount: {
                  currency_code: "USD",
                  value: amount,
                },
              },
            ],
          });
        }}
        onApprove={async (_data, actions) => {
          let details: any = null;
          if (actions.order) {
            details = await actions.order.capture();
          }

          await notifyBackendCapture(details);

          if (onSuccess) onSuccess();
        }}
        onCancel={() => {
          if (onCancel) onCancel();
        }}
      />
    </PayPalScriptProvider>
  );
}
