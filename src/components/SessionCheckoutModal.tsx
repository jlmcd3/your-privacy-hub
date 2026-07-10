import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/env";
import { waitForSessionPaid } from "@/lib/checkoutConfirmation";
import { fireCheckoutStarted, firePurchaseCompleted } from "@/lib/analyticsEvents";

const publishableKey = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export type SessionToolType =
  | "ropa_initial"
  | "ropa_refresh"
  | "us_notice_single"
  | "us_notice_all_states"
  | "eu_notice_single"
  | "eu_notice_suite"
  | "eu_notice_full_international"
  | "eu_notice_refresh";

const TABLE_FOR_TOOL: Record<SessionToolType, "ropa_sessions" | "us_notice_sessions" | "eu_notice_sessions"> = {
  ropa_initial: "ropa_sessions",
  ropa_refresh: "ropa_sessions",
  us_notice_single: "us_notice_sessions",
  us_notice_all_states: "us_notice_sessions",
  eu_notice_single: "eu_notice_sessions",
  eu_notice_suite: "eu_notice_sessions",
  eu_notice_full_international: "eu_notice_sessions",
  eu_notice_refresh: "eu_notice_sessions",
};

interface Props {
  open: boolean;
  toolType: SessionToolType;
  sessionId: string;
  userId?: string;
  /** Path to return to from Stripe (without ?payment_success=true). */
  successPath: string;
  onClose: () => void;
  onComplete?: (sessionId: string) => void;
}

/**
 * Generic embedded-checkout modal for session-based tools (RoPA / Notices).
 * Unlike ToolCheckoutModal it polls the session row's `payment_confirmed`
 * flag (set by the Stripe webhook) rather than `assessment_purchases`.
 */
export default function SessionCheckoutModal({
  open,
  toolType,
  sessionId,
  userId,
  successPath,
  onClose,
  onComplete,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const completedRef = useRef(false);

  const fetchClientSecret = useCallback(async () => {
    fireCheckoutStarted({ tool: toolType, surface: "session_checkout_modal" });
    const { data, error } = await supabase.functions.invoke("create-tool-checkout", {
      body: {
        tool_type: toolType,
        user_id: userId,
        intake_data: { session_id: sessionId },
        return_url: window.location.origin,
        success_path: successPath,
        environment: getStripeEnvironment(),
        embedded: true,
      },
    });
    if (error || !data?.client_secret) {
      throw new Error(error?.message || data?.error || "Failed to create checkout session");
    }
    return data.client_secret as string;
  }, [toolType, userId, sessionId, successPath]);

  const confirmAndComplete = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setConfirming(true);
    setConfirmError(null);
    const ok = await waitForSessionPaid(TABLE_FOR_TOOL[toolType], sessionId, {
      timeoutMs: 30_000,
      intervalMs: 1_500,
    });
    setConfirming(false);
    if (ok) {
      firePurchaseCompleted({ tool: toolType, surface: "session_checkout_modal" });
      onComplete?.(sessionId);
    } else {
      setConfirmError(
        "Payment received, but your purchase hasn't finalized yet. It usually takes a few seconds — you can continue and we'll keep working in the background."
      );
    }
  }, [toolType, sessionId, onComplete]);

  useEffect(() => {
    if (!open) return;
    completedRef.current = false;
    const handler = (event: MessageEvent) => {
      if (
        typeof event.data === "object" &&
        event.data?.type === "stripe-embedded-checkout-complete"
      ) {
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
        <div className="p-2 sm:p-4">
          {confirming ? (
            <div className="p-10 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-[14px] font-semibold text-brand-navy mb-1">
                Confirming your purchase…
              </p>
              <p className="text-[12px] text-muted-foreground">
                Payment received. Finalizing — this usually takes a few seconds.
              </p>
            </div>
          ) : confirmError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-amber-700 mb-4">{confirmError}</p>
              <button
                onClick={() => onComplete?.(sessionId)}
                className="bg-brand-navy text-white text-sm font-semibold px-5 py-2 rounded-lg"
              >
                Continue
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
