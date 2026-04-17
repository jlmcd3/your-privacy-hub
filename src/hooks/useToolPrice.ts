import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Static fallback pricing — kept in sync with `supabase/functions/create-tool-checkout`.
 * Shown immediately while the subscriber-aware price loads from the backend.
 */
const FALLBACK: Record<string, { standalone: number; subscriber: number; name: string }> = {
  li_assessment: { standalone: 39, subscriber: 19, name: "Legitimate Interest Analyzer" },
  governance_assessment: { standalone: 29, subscriber: 15, name: "Data Privacy Healthcheck" },
  dpia_framework: { standalone: 69, subscriber: 39, name: "DPIA Builder" },
};

export interface ToolPricing {
  /** Price the current viewer will pay, in dollars */
  price: number;
  /** Standalone (non-subscriber) price in dollars */
  standalonePrice: number;
  /** Subscriber price in dollars */
  subscriberPrice: number;
  /** True when the current viewer qualifies for the subscriber rate */
  isSubscriber: boolean;
  /** Tool display name */
  name: string;
  /** True when Stripe is fully wired up server-side */
  stripeConfigured: boolean;
  /** Loading flag */
  loading: boolean;
}

/**
 * Returns subscriber-aware pricing for a paid tool. Falls back to local
 * defaults instantly so the UI never renders blank, and refines once the
 * edge function responds.
 */
export function useToolPrice(toolSlug: keyof typeof FALLBACK): ToolPricing {
  const { user } = useAuth();
  const fb = FALLBACK[toolSlug];
  const [state, setState] = useState<ToolPricing>({
    price: fb.standalone,
    standalonePrice: fb.standalone,
    subscriberPrice: fb.subscriber,
    isSubscriber: false,
    name: fb.name,
    stripeConfigured: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Pricing is checked client-side via the get-tool-price function so the
        // user's current subscriber status is reflected even before checkout.
        const { data: { session } } = await supabase.auth.getSession();
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-tool-price`);
        // The edge function expects the API "tool_slug" naming (healthcheck/li_analyzer/dpia_builder)
        const slugMap: Record<string, string> = {
          li_assessment: "li_analyzer",
          governance_assessment: "healthcheck",
          dpia_framework: "dpia_builder",
        };
        url.searchParams.set("tool_slug", slugMap[toolSlug]);

        const headers: Record<string, string> = {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        const res = await fetch(url.toString(), { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const isSub = data.tier === "subscriber";
        setState({
          price: Math.round((data.amount_cents ?? 0) / 100),
          standalonePrice: fb.standalone,
          subscriberPrice: fb.subscriber,
          isSubscriber: isSub,
          name: data.tool_name || fb.name,
          stripeConfigured: !!data.stripe_configured,
          loading: false,
        });
      } catch (_) {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [toolSlug, user?.id]);

  return state;
}
