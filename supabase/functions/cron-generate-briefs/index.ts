import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  startFunctionRun,
  finishFunctionRun,
  failFunctionRun,
} from "../_shared/function-run-logger.ts";

// BUILD_STAMP: brief-model-1-hf3 @ 2026-07-18
// HF3: generate-weekly-brief now returns 202 immediately and runs its pipeline
// inside EdgeRuntime.waitUntil. Treat 202 (and defensively 504 IDLE_TIMEOUT)
// as "generation started" and rely on the existing weekly_briefs poll as the
// completion signal for BOTH generate_only and send modes.

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
    // Background runner - allow up to 8 minutes per callee.
    signal: AbortSignal.timeout(480_000),
  });
  const text = await resp.text();
  return { status: resp.status, body: text.slice(0, 500) };
}

async function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

// Poll weekly_briefs for a row created after t0. Returns row id or null.
async function waitForWeeklyBrief(t0Iso: string): Promise<string | null> {
  const maxMs = 8 * 60 * 1000;
  const intervalMs = 15_000;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("weekly_briefs")
      .select("id, created_at")
      .gt("created_at", t0Iso)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) return data[0].id as string;
    await sleep(intervalMs);
  }
  return null;
}

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
    // HF3: generate-weekly-brief returns 202 immediately (background pipeline).
    // Accept 200 (legacy) and 202 as "started"; treat 504 idle-timeout as
    // "started" defensively — poll is the true completion signal in every case.
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

    const briefId = await waitForWeeklyBrief(t0Iso);
    if (!briefId) {
      await failFunctionRun(supabase, run, new Error("weekly_briefs row did not appear within 8m"), {
        metadata: {
          event: "brief_chain",
          outcome: "generate_timeout",
          target: "weekly",
          generate_only: generateOnly,
          t0: t0Iso,
          gen_status: gen.status,
        },
      });
      return;
    }

    if (generateOnly) {
      await finishFunctionRun(supabase, run, {
        status: "success",
        metadata: {
          event: "brief_chain",
          outcome: "generated",
          target: "weekly",
          generate_only: true,
          t0: t0Iso,
          brief_id: briefId,
          gen_status: gen.status,
        },
      });
      return;
    }

    const send = await callFn("send-weekly-brief");
    if (send.status !== 200) {
      await failFunctionRun(supabase, run, new Error(`send-weekly-brief HTTP ${send.status}`), {
        metadata: {
          event: "brief_chain",
          outcome: "send_failed",
          target: "weekly",
          t0: t0Iso,
          brief_id: briefId,
          send_status: send.status,
          send_body: send.body,
        },
      });
      return;
    }

    await finishFunctionRun(supabase, run, {
      status: "success",
      metadata: {
        event: "brief_chain",
        outcome: "sent",
        target: "weekly",
        t0: t0Iso,
        brief_id: briefId,
      },
    });
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
