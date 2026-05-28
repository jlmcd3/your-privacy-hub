// Track 3 — Discovery orchestrator.
//
// Body: { regulator_canonical: string (alias key, e.g. "aepd"), max_rows: number, dry_run?: boolean }
// Returns: HTTP 202 with run_id; fires worker calls via EdgeRuntime.waitUntil.
// Auth: x-admin-token header == ADMIN_SECRET_TOKEN.
//
// Worker invoked: discover-primary-source-url (per row).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  resolveRegulatorAlias,
  buildRegulatorOrFilter,
} from "../_shared/track3-regulator-aliases.ts";
import { startRun, finishRun, failRun } from "../_shared/run-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const WORKER = "discover-primary-source-url";
// Throttle: discovery hits GDPRhub. Be polite.
const INTER_CALL_DELAY_MS = 2_000;

declare const EdgeRuntime: {
  waitUntil(p: Promise<unknown>): void;
} | undefined;

async function callWorker(
  baseUrl: string,
  adminToken: string,
  rowId: string,
  dryRun: boolean,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  try {
    const r = await fetch(`${baseUrl}/${WORKER}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({ row_id: rowId, dry_run: dryRun }),
      signal: AbortSignal.timeout(45_000),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      return { ok: false, error: `worker ${r.status}: ${JSON.stringify(j)?.slice(0, 200)}` };
    }
    return { ok: true, status: j?.status };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function runBatch(
  supabase: ReturnType<typeof createClient>,
  baseUrl: string,
  adminToken: string,
  rowIds: string[],
  dryRun: boolean,
  runHandle: Awaited<ReturnType<typeof startRun>>,
) {
  const counts: Record<string, number> = {};
  let succeeded = 0;
  let failed = 0;
  for (const id of rowIds) {
    const r = await callWorker(baseUrl, adminToken, id, dryRun);
    if (r.ok) {
      succeeded++;
      const k = r.status ?? "unknown";
      counts[k] = (counts[k] ?? 0) + 1;
    } else {
      failed++;
      console.warn(`[track3-discovery] row ${id} worker fail: ${r.error}`);
    }
    if (INTER_CALL_DELAY_MS > 0) {
      await new Promise((res) => setTimeout(res, INTER_CALL_DELAY_MS));
    }
  }
  await finishRun(supabase, runHandle, {
    fetched: rowIds.length,
    enriched: succeeded,
    enrichmentFailedOther: failed,
    status: failed === 0 ? "success" : "partial",
    metadata: { phase: "track3_discovery", dry_run: dryRun, status_counts: counts },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminToken = req.headers.get("x-admin-token") ?? "";
  const expected = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";
  if (!expected || adminToken !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { regulator_canonical?: string; max_rows?: number; dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const aliasKey = body.regulator_canonical;
  const maxRows = Math.max(1, Math.min(500, Number(body.max_rows ?? 20)));
  const dryRun = Boolean(body.dry_run);
  if (!aliasKey) {
    return new Response(JSON.stringify({ error: "regulator_canonical required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const alias = resolveRegulatorAlias(aliasKey);
  if (!alias) {
    return new Response(
      JSON.stringify({ error: `unknown regulator alias: ${aliasKey}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Select candidate rows.
  const { data: rows, error } = await supabase
    .from("enforcement_actions")
    .select("id")
    .in("legacy_enrichment_version", [1, 2])
    .eq("primary_source_status", "pending_discovery")
    .or(buildRegulatorOrFilter(alias))
    .limit(maxRows);
  if (error) {
    return new Response(JSON.stringify({ error: `select failed: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const rowIds = (rows ?? []).map((r: { id: string }) => r.id);

  const baseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
  const runHandle = await startRun(supabase, "track3-discovery", {
    regulator: aliasKey,
    requested: maxRows,
    selected: rowIds.length,
    dry_run: dryRun,
  });

  // Fire-and-forget.
  const work = (async () => {
    try {
      await runBatch(supabase, baseUrl, adminToken, rowIds, dryRun, runHandle);
    } catch (e) {
      await failRun(supabase, runHandle, e);
    }
  })();
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(work);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      run_id: runHandle.id,
      regulator: aliasKey,
      selected: rowIds.length,
      dry_run: dryRun,
      worker: WORKER,
    }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
