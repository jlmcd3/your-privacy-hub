// Dispatcher: invokes all source-specific legislation ingestion functions in parallel.
// Each source is tolerant of failure; one failing source must not prevent others from running.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCES = [
  "ingest-legislation-us",
  "ingest-legislation-us-states",
  "ingest-legislation-uk",
  "ingest-legislation-eu",
  "ingest-legislation-ca",
  "ingest-legislation-au",
  "ingest-legislation-br",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const results = await Promise.allSettled(
    SOURCES.map(async (name) => {
      const { data, error } = await supabase.functions.invoke(name, { body: {} });
      if (error) throw new Error(`${name}: ${error.message}`);
      return { name, data };
    }),
  );

  const summary = results.map((r, i) =>
    r.status === "fulfilled"
      ? { source: SOURCES[i], ok: true, counts: (r.value as any).data?.counts }
      : { source: SOURCES[i], ok: false, error: (r.reason as Error).message },
  );

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
