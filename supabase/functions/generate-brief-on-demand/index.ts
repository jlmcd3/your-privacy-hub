// DISABLED: On-demand brief generation has been removed.
// Briefs are immutable artifacts generated once per week by the scheduled
// `generate-custom-brief` job. Preference edits apply to the next scheduled
// brief only — there is no longer a regenerate-on-demand affordance.
//
// This endpoint is kept as a 410 Gone responder so any stale clients that
// still attempt to invoke it receive a clear, non-fatal response rather than
// silently triggering a regeneration.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  return new Response(
    JSON.stringify({
      error: "On-demand brief generation has been retired.",
      message:
        "Briefs are now generated weekly. Update your preferences at /brief-preferences — changes take effect with the next Weekly Intelligence Brief (delivered Monday).",
    }),
    {
      status: 410, // Gone
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
