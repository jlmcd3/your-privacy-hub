// RC-B B5 — public read for a provision text. Renders in refine UI provision panel.
// verify_jwt=false; a single SELECT with auto-insert of a pending row on miss.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveProvisionForRender } from "../_shared/provision-store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  let key = url.searchParams.get("key") ?? "";
  let fallbackCitation: string | undefined;
  if (!key && req.method === "POST") {
    try {
      const body = await req.json();
      key = String(body?.key ?? "");
      fallbackCitation = typeof body?.fallback_citation === "string" ? body.fallback_citation : undefined;
    } catch { /* ignore */ }
  }
  if (!key) {
    return new Response(JSON.stringify({ error: "missing_key" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const out = await resolveProvisionForRender(supabase, key, fallbackCitation);
  return new Response(JSON.stringify(out), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
