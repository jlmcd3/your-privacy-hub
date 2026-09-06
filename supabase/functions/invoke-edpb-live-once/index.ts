const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server configuration unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const response = await fetch(`${url}/functions/v1/ingest-edpb-guidelines`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      only: [
        "EDPB Opinion 28/2024",
        "WP29 Opinion 2/2017",
        "WP29 Opinion 1/2006",
        "EDPB Guidelines 3/2019",
        "EDPB Guidelines 06/2020",
      ],
    }),
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});