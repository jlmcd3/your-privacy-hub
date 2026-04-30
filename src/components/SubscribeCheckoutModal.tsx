import { useCallback, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/env";

const publishableKey = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

interface Props {
  open: boolean;
  interval: "month" | "year";
  onClose: () => void;
  onComplete: () => void;
}

export default function SubscribeCheckoutModal({ open, interval, onClose, onComplete }: Props) {
  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: {
        plan: interval === "year" ? "intelligence_yearly" : "intelligence_monthly",
        interval,
        environment: getStripeEnvironment(),
        embedded: true,
      },
    });
    if (error || !data?.client_secret) {
      throw new Error(error?.message || data?.error || "Failed to create checkout session");
    }
    return data.client_secret as string;
  }, [interval]);

  // Listen for Stripe's completion message and trigger redirect.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MessageEvent) => {
      // Stripe posts messages from checkout.stripe.com
      if (typeof event.data === "object" && event.data?.type === "stripe-embedded-checkout-complete") {
        onComplete();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [open, onComplete]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 overflow-y-auto p-4 sm:p-8">
      <div className="relative w-full max-w-[680px] bg-paper rounded-2xl shadow-2xl my-auto">
        <button
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white border border-border hover:bg-muted transition"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-2 sm:p-4">
          {stripePromise ? (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret, onComplete }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Payment system unavailable — missing publishable key.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
