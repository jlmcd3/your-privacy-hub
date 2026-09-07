// TEMPORARY helper (doc 207 track 2 step 1): invokes the admin-gated
// generate-corpus-relevance-profiles with the service-role key that only
// exists inside the edge runtime. Forwards the incoming JSON body verbatim.
// Deleted immediately after the run.
Deno.serve(async (req: Request) => {
  const body = await req.text();
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-corpus-relevance-profiles`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body,
  });
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
});
