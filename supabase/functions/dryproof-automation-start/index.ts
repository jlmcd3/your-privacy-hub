// Ephemeral dry-proof harness for AUTOMATION-ENABLER internal `start` branch.
// Invokes quality-batch-orchestrator with x-internal-cron:1 + service-role
// bearer (which satisfies the same isCron gate ADMIN_SECRET_TOKEN takes) and
// a deliberately invalid body {tools: []} to prove the branch is reachable
// and auth passes. Returns the callee's status+body verbatim.
Deno.serve(async () => {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/quality-batch-orchestrator`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "apikey": key,
      "x-internal-cron": "1",
    },
    body: JSON.stringify({ action: "start", tools: [], batch_size: 5 }),
  });
  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, body: text }), {
    headers: { "Content-Type": "application/json" },
  });
});
