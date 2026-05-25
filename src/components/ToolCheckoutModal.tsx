import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/env";
import { waitForAssessmentPaid } from "@/lib/checkoutConfirmation";

const publishableKey = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export type ToolType =
  | "li_assessment"
  | "governance_assessment"
  | "dpia_framework"
  | "dpa_generator"
  | "ir_playbook"
  | "biometric_checker"
  | "cppa_risk_assessment"
  | "cppa_cybersecurity"
  | "cppa_suite";

interface Props {
  open: boolean;
  toolType: ToolType;
  userId?: string;
  clientId?: string | null;
  intakeData?: Record<string, unknown>;
  onClose: () => void;
  /** Called only after backend confirms the purchase row was written. */
  onComplete?: (assessmentId: string, suiteCyberId?: string) => void;
}

export default function ToolCheckoutModal({
  open,
  toolType,
  userId,
  clientId,
  intakeData,
  onClose,
  onComplete,
}: Props) {
  const lastAssessmentIdRef = useRef<string>("");
  const lastSuiteCyberIdRef = useRef<string>("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-tool-checkout", {
      body: {
        tool_type: toolType,
        user_id: userId,
        client_id: clientId ?? null,
        intake_data: intakeData ?? {},
        return_url: window.location.origin,
        environment: getStripeEnvironment(),
        embedded: true,
      },
    });
    if (error || !data?.client_secret) {
      throw new Error(error?.message || data?.error || "Failed to create checkout session");
    }
    lastAssessmentIdRef.current = data.assessment_id;
    lastSuiteCyberIdRef.current = data.suite_cyber_id || "";
    return data.client_secret as string;
  }, [toolType, userId, clientId, intakeData]);

  const confirmAndComplete = useCallback(async () => {
    const id = lastAssessmentIdRef.current;
    if (!id) {
      onComplete?.("");
      return;
    }
    setConfirming(true);
    setConfirmError(null);
    const ok = await waitForAssessmentPaid(id, { timeoutMs: 30_000, intervalMs: 1_500 });
    setConfirming(false);
    if (ok) {
      onComplete?.(id, lastSuiteCyberIdRef.current || undefined);
    } else {
      setConfirmError(
        "Payment received, but your purchase hasn't finalized yet. It usually takes a few seconds — you can continue to your result and we'll keep working in the background."
      );
    }
  }, [onComplete]);

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
        <div className="p-2 sm:p-4">
          {confirming ? (
            <div className="p-10 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-[14px] font-semibold text-brand-navy mb-1">Confirming your purchase…</p>
              <p className="text-[12px] text-muted-foreground">
                Payment received. Finalizing — this usually takes a few seconds.
              </p>
            </div>
          ) : confirmError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-amber-700 mb-4">{confirmError}</p>
              <button
                onClick={() => onComplete?.(lastAssessmentIdRef.current, lastSuiteCyberIdRef.current || undefined)}
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
