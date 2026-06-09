import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/env";

const publishableKey = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export type RegistrationTier = "diy";

interface Props {
  open: boolean;
  tier: RegistrationTier;
  jurisdictions: string[];
  assessmentId?: string;
  organizationSnapshot?: Record<string, unknown>;
  onClose: () => void;
  /** Called after Stripe reports the embedded checkout is complete. */
  onComplete?: (orderId: string) => void;
}

export default function RegistrationCheckoutModal({
  open,
  tier,
  jurisdictions,
  assessmentId,
  organizationSnapshot,
  onClose,
  onComplete,
}: Props) {
  const navigate = useNavigate();
  const lastOrderIdRef = useRef<string>("");
  const [confirming, setConfirming] = useState(false);

  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-registration-checkout", {
      body: {
        tier,
        jurisdictions,
        assessment_id: assessmentId,
        organization_snapshot: organizationSnapshot ?? {},
        environment: getStripeEnvironment(),
        embedded: true,
        return_url: window.location.origin,
      },
    });
    if (error || !data?.client_secret) {
      throw new Error(error?.message || data?.error || "Failed to create checkout session");
    }
    lastOrderIdRef.current = data.order_id;
    return data.client_secret as string;
  }, [tier, jurisdictions, assessmentId, organizationSnapshot]);

  const handleComplete = useCallback(() => {
    const id = lastOrderIdRef.current;
    setConfirming(true);
    if (onComplete) {
      onComplete(id);
    } else if (id) {
      navigate(`/registration-manager/order/${id}?status=success`);
    }
  }, [navigate, onComplete]);

  // Reset confirming state when modal reopens for a new purchase
  useEffect(() => {
    if (open) setConfirming(false);
  }, [open]);

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
              <p className="text-[14px] font-semibold text-brand-navy mb-1">Finalizing your order…</p>
              <p className="text-[12px] text-muted-foreground">
                Payment received. Redirecting you to your registration documents.
              </p>
            </div>
          ) : stripePromise ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret, onComplete: handleComplete }}
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
