// Founding subscriber program is permanently closed.
// This endpoint returns a static "closed" response without any DB queries.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  return new Response(
    JSON.stringify({ remainingSlots: 0, isAvailable: false, usedSlots: 500 }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
