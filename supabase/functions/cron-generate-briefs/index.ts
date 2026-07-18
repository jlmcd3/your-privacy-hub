import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  startFunctionRun,
  finishFunctionRun,
  failFunctionRun,
} from "../_shared/function-run-logger.ts";

// BUILD_STAMP: brief-model-1-hf4 @ 2026-07-18
// HF4: Live repro at 05:23:46Z proved the in-function 8-min poll exceeds the
// EdgeRuntime background wall-clock — the chain's brief_chain row was left in
// status='running' with no terminal outcome. Replace the poll with the
// existing cron-tick pattern: this function now fires generate-weekly-brief,
// leaves the brief_chain function_runs row in status='running' with metadata
// {event:'brief_chain', target:'weekly', t0, generate_only, gen_status}, and
// returns. batch-kickoff-pickup's every-2-min tick sweeps pending brief_chain
// rows and writes the terminal outcome.

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
    // Callee is background (202 immediately). 30s is enough to receive the ack.
    signal: AbortSignal.timeout(30_000),
  });
  const text = await resp.text();
  return { status: resp.status, body: text.slice(0, 500) };
}

async function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

// HF4: weekly chain now fires the generator and RETURNS, leaving the
// brief_chain function_runs row in status='running'. batch-kickoff-pickup
// resolves it on the next 2-min tick.
async function runWeeklyChain(generateOnly: boolean) {
  const t0Iso = new Date().toISOString();
  const run = await startFunctionRun(supabase, "cron-generate-briefs", {
    invokedBy: "cron",
    metadata: {
      event: "brief_chain",
      target: "weekly",
      generate_only: generateOnly,
      t0: t0Iso,
    },
  });
  try {
    const gen = await callFn("generate-weekly-brief");
    // generate-weekly-brief returns 202 immediately (background pipeline).
    // Accept 200 (legacy), 202, and 504 (idle-timeout) as "started".
    const started = gen.status === 200 || gen.status === 202 || gen.status === 504;
    if (!started) {
      await failFunctionRun(supabase, run, new Error(`generate-weekly-brief HTTP ${gen.status}`), {
        metadata: {
          event: "brief_chain",
          outcome: "generate_failed",
          target: "weekly",
          generate_only: generateOnly,
          t0: t0Iso,
          gen_status: gen.status,
          gen_body: gen.body,
        },
      });
      return;
    }
    // Success: leave the row in status='running' with metadata carrying t0 and
    // generate_only. batch-kickoff-pickup will complete it. We deliberately do
    // NOT call finishFunctionRun here — the row is the awaiting-generation
    // marker until the sweeper acts on it.
    console.log(`[cron-generate-briefs] brief_chain kicked run_id=${run.id} t0=${t0Iso} gen_status=${gen.status} generate_only=${generateOnly}`);
  } catch (e) {
    await failFunctionRun(supabase, run, e, {
      metadata: {
        event: "brief_chain",
        outcome: "exception",
        target: "weekly",
        t0: t0Iso,
      },
    });
  }
}

async function runCustomChain(generateOnly: boolean) {
  const t0Iso = new Date().toISOString();
  const run = await startFunctionRun(supabase, "cron-generate-briefs", {
    invokedBy: "cron",
    metadata: {
      event: "brief_chain",
      target: "custom",
      generate_only: generateOnly,
      t0: t0Iso,
    },
  });
  try {
    // NOTE (HF1 deviation #1 stands): generate-custom-brief does not yet
    // support a generate_only passthrough; fan-out behavior is unchanged.
    const { data: proUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_pro", true);

    if (usersError) {
      await failFunctionRun(supabase, run, usersError, {
        metadata: { event: "brief_chain", outcome: "custom_query_failed", target: "custom", t0: t0Iso },
      });
      return;
    }
    if (!proUsers || proUsers.length === 0) {
      await finishFunctionRun(supabase, run, {
        status: "success",
        metadata: {
          event: "brief_chain",
          outcome: "skipped",
          target: "custom",
          t0: t0Iso,
          note: "No Pro subscribers found",
          processed: 0, failed: 0, total: 0,
        },
      });
      return;
    }

    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 4000;
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < proUsers.length; i += BATCH_SIZE) {
      const batch = proUsers.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(user => callFn("generate-custom-brief", { user_id: user.id }))
      );
      batchResults.forEach((result, idx) => {
        if (result.status === "fulfilled" && result.value.status === 200) {
          processed++;
        } else {
          failed++;
          const msg = result.status === "rejected"
            ? String(result.reason)
            : `HTTP ${result.value.status}: ${result.value.body}`;
          errors.push(`${batch[idx].id.slice(0, 8)}: ${msg.slice(0, 120)}`);
          console.error(`Custom brief failed for user ${batch[idx].id}:`, msg);
        }
      });
      if (i + BATCH_SIZE < proUsers.length) await sleep(BATCH_DELAY_MS);
    }

    await finishFunctionRun(supabase, run, {
      status: failed > 0 ? "partial" : "success",
      metadata: {
        event: "brief_chain",
        outcome: failed > 0 ? "custom_partial" : "sent",
        target: "custom",
        t0: t0Iso,
        processed, failed, total: proUsers.length,
        batches: Math.ceil(proUsers.length / BATCH_SIZE),
        errors: errors.slice(0, 20),
      },
    });
  } catch (e) {
    await failFunctionRun(supabase, run, e, {
      metadata: { event: "brief_chain", outcome: "exception", target: "custom", t0: t0Iso },
    });
  }
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

  // @ts-ignore EdgeRuntime is Supabase runtime global
  EdgeRuntime.waitUntil((async () => {
    try {
      if (target === "weekly" || target === "all") await runWeeklyChain(generateOnly);
      if (target === "custom" || target === "all") await runCustomChain(generateOnly);
    } catch (e) {
      console.error("cron-generate-briefs background error", e);
    }
  })());

  return new Response(
    JSON.stringify({ accepted: true, target, generate_only: generateOnly }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
