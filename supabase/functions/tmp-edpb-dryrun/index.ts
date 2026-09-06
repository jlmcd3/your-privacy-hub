// TEMPORARY: server-side invoker so the EDPB ingest dry-run can be triggered
// without exposing ADMIN_SECRET_TOKEN. Delete after the dry-run is reviewed.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ingest-edpb-guidelines`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      dry_run: true,
      only: [
        "WP29 Opinion 2/2017",
        "WP29 Opinion 1/2006",
        "EDPB Guidelines 3/2019",
        "EDPB Guidelines 06/2020",
        "EDPB Opinion 28/2024",
      ],
    }),
    signal: AbortSignal.timeout(600_000),
  });
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
