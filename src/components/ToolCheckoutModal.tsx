import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/env";
import { waitForAssessmentPaid } from "@/lib/checkoutConfirmation";
import { fireCheckoutStarted, firePurchaseVerified } from "@/lib/analyticsEvents";

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
  | "cppa_suite"
  | "cppa_admt";

/** Generator to start when the server bypasses checkout for an included tool. */
const INCLUDED_GENERATOR: Partial<Record<ToolType, string>> = {
  biometric_checker: "check-biometric-compliance",
  ir_playbook: "generate-ir-playbook",
  dpa_generator: "generate-dpa",
};

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
    fireCheckoutStarted({ tool: toolType, surface: "tool_checkout_modal" });
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
    // QA batch 2026-09-05 (BIO 01 / IR 02 / DPA 01) — create-tool-checkout
    // answers `{ bypassed: true, assessment_id }` (no client_secret) when the
    // caller's plan includes the tool: the row already exists, so start the
    // generation against it and hand off exactly as a paid completion would.
    // Before this, a bypass threw "Failed to create checkout session".
    if (!error && data?.bypassed && data?.assessment_id) {
      lastAssessmentIdRef.current = data.assessment_id;
      const fn = INCLUDED_GENERATOR[toolType];
      if (fn) {
        void supabase.functions.invoke(fn, {
          body: {
            assessment_id: data.assessment_id,
            // The biometric generator validates jurisdictions/biometricTypes
            // from the request body rather than hydrating them from the row.
            ...(fn === "check-biometric-compliance" ? (intakeData ?? {}) : {}),
          },
        });
      }
      onComplete?.(data.assessment_id);
      throw new Error("Included with your plan — no payment is needed.");
    }
    if (error || !data?.client_secret) {
      // QA round two (SUITE-A-02) — create-tool-checkout now refuses an
      // incomplete CPPA Suite purchase with a 400 and an explanatory
      // `message`. supabase-js turns any non-2xx into the generic "Edge
      // Function returned a non-2xx status code", so read the function's own
      // body first (the pattern RopaRefresh already uses) and show the
      // customer why the purchase was stopped.
      let detail = "";
      try {
        const ctx = (error as { context?: Response } | null)?.context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.clone().json();
          if (typeof body?.message === "string") detail = body.message;
          else if (typeof body?.error === "string") detail = body.error;
        }
      } catch { /* fall through to the generic message */ }
      throw new Error(
        detail || data?.message || error?.message || data?.error || "Failed to create checkout session",
      );
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
      firePurchaseVerified({ tool: toolType, surface: "tool_checkout_modal" });
      onComplete?.(id, lastSuiteCyberIdRef.current || undefined);
    } else {
      setConfirmError(
        "Payment received, but your purchase hasn't finalized yet. It usually takes a few seconds — you can continue to your result and we'll keep working in the background."
      );
    }
  }, [onComplete, toolType]);

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
