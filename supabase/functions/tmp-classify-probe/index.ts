import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await db.from("internal_driver_tokens").select("token").limit(1).maybeSingle();
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-corpus-relevance-profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-driver-token": String(data?.token ?? "") },
    body: JSON.stringify({ action: "classify_from_db", product: "lia", run_id: "lia-classify-2026-09-07-r2-probe2", batch_size: 2 }),
  });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
});
