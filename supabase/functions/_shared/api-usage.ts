// RC-A A7 — Fire-and-forget spend metering. Insert one row per model call.
// Never blocks generation; errors logged and swallowed.
//
// 2026-08-17: the client was previously built via a RUNTIME dynamic
// `await import("https://esm.sh/@supabase/supabase-js@2")`, which the edge
// runtime does not bundle — every call silently landed in the catch block and
// metering went dark. Static top-level import instead (same specifier the rest
// of the edge tree uses), plus explicit logging on the missing-env branch.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
function getClient(): any | null {
  if (cachedClient) return cachedClient;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      console.error(JSON.stringify({
        evt: "api_usage_env_missing",
        has_url: !!url,
        has_service_role: !!key,
      }));
      return null;
    }
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
      const client = getClient();
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
