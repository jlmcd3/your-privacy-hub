import { useCallback, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/env";

const publishableKey = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export type ToolType =
  | "li_assessment"
  | "governance_assessment"
  | "dpia_framework"
  | "dpa_generator"
  | "ir_playbook"
  | "biometric_checker";

interface Props {
  open: boolean;
  toolType: ToolType;
  userId?: string;
  intakeData?: Record<string, unknown>;
  onClose: () => void;
  /** Called when Stripe confirms the payment completed. */
  onComplete?: (assessmentId: string) => void;
}

/**
 * Embedded Stripe checkout for one-time tool purchases.
 * Mirrors SubscribeCheckoutModal — keeps the user on-site instead of
 * redirecting to checkout.stripe.com.
 */
export default function ToolCheckoutModal({
  open,
  toolType,
  userId,
  intakeData,
  onClose,
  onComplete,
}: Props) {
  let lastAssessmentId = "";

  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-tool-checkout", {
      body: {
        tool_type: toolType,
        user_id: userId,
        intake_data: intakeData ?? {},
        return_url: window.location.origin,
        environment: getStripeEnvironment(),
        embedded: true,
      },
    });
    if (error || !data?.client_secret) {
      throw new Error(error?.message || data?.error || "Failed to create checkout session");
    }
    lastAssessmentId = data.assessment_id;
    return data.client_secret as string;
  }, [toolType, userId, intakeData]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MessageEvent) => {
      if (typeof event.data === "object" && event.data?.type === "stripe-embedded-checkout-complete") {
        onComplete?.(lastAssessmentId);
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
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret, onComplete: () => onComplete?.(lastAssessmentId) }}
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
