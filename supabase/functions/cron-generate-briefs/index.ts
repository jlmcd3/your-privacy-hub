import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function callFn(
  name: string,
  body: Record<string, unknown> = {}
) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_SECRET}`,
    },
    body: JSON.stringify(body),
    // 4-minute timeout per user invocation – covers 3 API calls with margin
    signal: AbortSignal.timeout(240_000),
  });
  const text = await resp.text();
  return { status: resp.status, body: text.slice(0, 500) };
}

async function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  if (!ADMIN_SECRET) {
    return new Response(
      JSON.stringify({ error: "ADMIN_SECRET_TOKEN not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("target") || "weekly";
  let bodyFlag = false;
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      const b = await req.clone().json();
      bodyFlag = !!(b?.generate_only);
    }
  } catch { /* ignore */ }
  const generateOnly =
    url.searchParams.get("generate_only") === "1" ||
    url.searchParams.get("generate_only") === "true" ||
    bodyFlag;

  try {
    const results: Record<string, unknown> = { generate_only: generateOnly };

    if (target === "weekly" || target === "all") {
      results.weekly = await callFn("generate-weekly-brief");
      if (!generateOnly) {
        results.weekly_send = await callFn("send-weekly-brief");
      }
    }

    if (target === "custom" || target === "all") {
      const { data: proUsers, error: usersError } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_pro", true);

      if (usersError) {
        console.error("Failed to query Pro users:", usersError);
        results.custom = { error: "Failed to query Pro users" };
      } else if (!proUsers || proUsers.length === 0) {
        results.custom = {
          processed: 0, failed: 0, total: 0,
          note: "No Pro subscribers found"
        };
      } else {
        // Fan-out: one edge function invocation per user.
        // Batch of 10 simultaneous Sonnet calls keeps within Anthropic Tier 3 limits.
        // ~65s per user; 500 subscribers ~58 min, 1000 ~115 min.
        const BATCH_SIZE = 10;
        const BATCH_DELAY_MS = 4000;

        let processed = 0;
        let failed = 0;
        const errors: string[] = [];

        for (let i = 0; i < proUsers.length; i += BATCH_SIZE) {
          const batch = proUsers.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.allSettled(
            batch.map(user =>
              callFn("generate-custom-brief", { user_id: user.id })
            )
          );

          batchResults.forEach((result, idx) => {
            if (
              result.status === "fulfilled" &&
              result.value.status === 200
            ) {
              processed++;
            } else {
              failed++;
              const msg =
                result.status === "rejected"
                  ? String(result.reason)
                  : `HTTP ${result.value.status}: ${result.value.body}`;
              errors.push(
                `${batch[idx].id.slice(0, 8)}: ${msg.slice(0, 120)}`
              );
              console.error(
                `Custom brief failed for user ${batch[idx].id}:`, msg
              );
            }
          });

          if (i + BATCH_SIZE < proUsers.length) {
            await sleep(BATCH_DELAY_MS);
          }
        }

        results.custom = {
          processed,
          failed,
          total: proUsers.length,
          batches: Math.ceil(proUsers.length / BATCH_SIZE),
          errors: errors.slice(0, 20),
        };
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cron-generate-briefs error", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
