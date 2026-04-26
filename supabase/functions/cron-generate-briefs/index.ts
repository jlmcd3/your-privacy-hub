// Wrapper edge function invoked by pg_cron with the project anon key.
// It uses ADMIN_SECRET_TOKEN from its own env to call the protected
// brief-generation functions, so we never need to embed the admin token
// in SQL/cron commands.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN")!;

async function callFn(name: string) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_SECRET}`,
    },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(540_000),
  });
  const text = await resp.text();
  return { status: resp.status, body: text.slice(0, 500) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!ADMIN_SECRET) {
    return new Response(
      JSON.stringify({ error: "ADMIN_SECRET_TOKEN not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("target") || "weekly";

  try {
    const results: Record<string, unknown> = {};
    if (target === "weekly" || target === "all") {
      results.weekly = await callFn("generate-weekly-brief");
    }
    if (target === "custom" || target === "all") {
      results.custom = await callFn("generate-custom-brief");
    }
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cron-generate-briefs error", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
