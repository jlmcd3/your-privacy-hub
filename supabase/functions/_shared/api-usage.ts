// RC-A A7 — Fire-and-forget spend metering. Insert one row per model call.
// Never blocks generation; errors logged and swallowed. Uses the ambient
// service-role client injected by the caller so this module doesn't need
// SUPABASE_URL/SERVICE_ROLE at import time.
export interface ApiUsageRow {
  function_name: string;
  product?: string | null;
  model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_tokens?: number | null;
  cache_creation_tokens?: number | null;
  duration_ms?: number | null;
  source_row_id?: string | null;
}

let cachedClient: any = null;
async function getClient(): Promise<any | null> {
  if (cachedClient) return cachedClient;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return null;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    cachedClient = createClient(url, key);
    return cachedClient;
  } catch (e) {
    console.error("[api-usage] client init failed:", e);
    return null;
  }
}

export function recordApiUsage(row: ApiUsageRow): void {
  // Fire and forget; never awaited by the caller.
  (async () => {
    try {
      const client = await getClient();
      if (!client) return;
      const { error } = await client.from("api_usage").insert(row);
      if (error) {
        console.error(JSON.stringify({ evt: "api_usage_insert_failed", detail: error.message }));
      }
    } catch (e: any) {
      console.error("[api-usage] insert failed:", e?.message ?? e);
    }
  })();
}
