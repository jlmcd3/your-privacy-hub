// TEMPORARY helper (doc 207 track 2 step 1): invokes the admin-gated
// generate-corpus-relevance-profiles with the service-role key that only
// exists inside the edge runtime. Deleted immediately after the run.
Deno.serve(async (_req: Request) => {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-corpus-relevance-profiles`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ action: "generate", product: "lia" }),
  });
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
});
