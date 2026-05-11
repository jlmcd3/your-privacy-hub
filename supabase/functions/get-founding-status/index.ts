// Public read-only endpoint: returns how many founding-rate slots remain
// (capped at 500). Backed by the SECURITY DEFINER function
// `is_founding_rate_available()` plus a count via the
// `founding_subscriber_count` view.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FOUNDING_CAP = 500;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Count founding subscribers — either flagged by subscription_type or
    // legacy founding_subscriber boolean (matches the rpc's logic).
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .or("subscription_type.eq.annual_founding,founding_subscriber.eq.true");

    if (error) {
      console.error("get-founding-status count error:", error.message);
      return new Response(
        JSON.stringify({
          remainingSlots: FOUNDING_CAP,
          isAvailable: true,
          usedSlots: 0,
          warning: "count_failed",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const usedSlots = count ?? 0;
    const remainingSlots = Math.max(0, FOUNDING_CAP - usedSlots);
    const isAvailable = remainingSlots > 0;

    return new Response(
      JSON.stringify({ remainingSlots, isAvailable, usedSlots, cap: FOUNDING_CAP }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-founding-status error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", remainingSlots: FOUNDING_CAP, isAvailable: true, usedSlots: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
