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

  return (
    <PayPalScriptProvider
      options={{
        "client-id": clientId,
        currency: "USD",
      }}
    >
      <PayPalButtons
        style={{ layout: "vertical", shape: "pill" }}
        createOrder={(_, actions) => {
          return actions.order.create({
            purchase_units: [
              {
                description: `${planName} plan`,
                amount: {
                  value: amount,
                },
              },
            ],
          });
        }}
        onApprove={async (_data, actions) => {
          if (actions.order) {
            await actions.order.capture();
          }
          if (onSuccess) onSuccess();
        }}
        onCancel={() => {
          if (onCancel) onCancel();
        }}
      />
    </PayPalScriptProvider>
  );
}
