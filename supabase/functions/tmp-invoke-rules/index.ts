// TEMPORARY probe helper — deleted immediately after use.
Deno.serve(async () => {
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-corpus-rules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ action: "generate", product: "lia" }),
  });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
});
