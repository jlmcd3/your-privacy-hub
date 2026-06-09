import { useCallback, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/env";
import { useAuth } from "@/hooks/useAuth";
import { waitForSubscriptionActive } from "@/lib/checkoutConfirmation";
import { PLATFORM_PRICING, INTELLIGENCE_PRICING } from "@/config/pricing";

const publishableKey = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

interface Props {
  open: boolean;
  interval: "month" | "year";
  tier?: "intelligence" | "professional";
  onClose: () => void;
  onComplete: () => void;
}

export default function SubscribeCheckoutModal({ open, interval, tier = "intelligence", onClose, onComplete }: Props) {
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);


  const fetchClientSecret = useCallback(async () => {
    const plan = tier === "professional"
      ? (interval === "year" ? "professional_annual" : "professional_monthly")
      : (interval === "year" ? "intelligence_yearly" : "intelligence_monthly");
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: {
        plan,
        interval,
        environment: getStripeEnvironment(),
        embedded: true,
      },
    });
    if (error || !data?.client_secret) {
      throw new Error(error?.message || data?.error || "Failed to create checkout session");
    }
    return data.client_secret as string;
  }, [interval, tier]);

  const confirmAndComplete = useCallback(async () => {
    if (!user) {
      // No user context — fall back to immediate completion.
      onComplete();
      return;
    }
    setConfirming(true);
    setConfirmError(null);
    const ok = await waitForSubscriptionActive(user.id, { timeoutMs: 30_000, intervalMs: 1_500 });
    setConfirming(false);
    if (ok) {
      onComplete();
    } else {
      setConfirmError(
        "Payment received, but your subscription hasn't activated yet. It usually takes a few seconds — please check your account in a moment."
      );
    }
  }, [user, onComplete]);

  // Listen for Stripe's completion message and trigger backend confirmation.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MessageEvent) => {
      if (typeof event.data === "object" && event.data?.type === "stripe-embedded-checkout-complete") {
        void confirmAndComplete();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [open, confirmAndComplete]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 overflow-y-auto p-4 sm:p-8">
      <div className="relative w-full max-w-[680px] bg-brand-cloud rounded-2xl shadow-2xl my-auto">
        <button
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white border border-border hover:bg-muted transition"
        >
          <X className="w-4 h-4" />
        </button>
        {/* Price preview — informational; server is authoritative */}
        <div className="px-4 pt-4 pb-2 border-b border-border/40">
          <p className="text-[12px] text-muted-foreground">You're subscribing to:</p>
          <p className="text-[14px] font-bold text-brand-navy">
            {interval === "year"
              ? `${PLATFORM_PRICING.standard()}/year`
              : `${INTELLIGENCE_PRICING.monthly()} (Intelligence Feed)`}
          </p>
        </div>
        <div className="p-2 sm:p-4">
          {confirming ? (
            <div className="p-10 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-[14px] font-semibold text-brand-navy mb-1">Confirming your subscription…</p>
              <p className="text-[12px] text-muted-foreground">
                Payment received. Activating your account — this usually takes a few seconds.
              </p>
            </div>
          ) : confirmError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-amber-700 mb-4">{confirmError}</p>
              <button
                onClick={onComplete}
                className="bg-brand-navy text-white text-sm font-semibold px-5 py-2 rounded-lg"
              >
                Go to your account
              </button>
            </div>
          ) : stripePromise ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret, onComplete: () => void confirmAndComplete() }}
            >
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
