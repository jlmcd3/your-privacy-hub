// TEMPORARY invocation-only helper (doc 207). Deleted immediately after use.
Deno.serve(async (_req) => {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-corpus-rules`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "generate", product: "lia" }),
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } });
});
