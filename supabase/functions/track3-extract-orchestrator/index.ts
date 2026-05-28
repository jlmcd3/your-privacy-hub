// Track 3 — Fetch & extract orchestrator.
//
// Body: { regulator_canonical: string (alias key), max_rows: number, dry_run?: boolean }
// Returns: HTTP 202 with run_id; fires worker calls via EdgeRuntime.waitUntil.
// Auth: x-admin-token header == ADMIN_SECRET_TOKEN.
//
// Worker invoked: fetch-and-extract-primary-source (per row).

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

const WORKER = "fetch-and-extract-primary-source";
// Throttle: per-row Haiku calls dominate, but be polite to regulator origins.
const INTER_CALL_DELAY_MS = 1_500;

declare const EdgeRuntime: {
  waitUntil(p: Promise<unknown>): void;
} | undefined;

async function callWorker(
  baseUrl: string,
  adminToken: string,
  rowId: string,
  dryRun: boolean,
  aliasKey: string,
): Promise<{ ok: boolean; primary_source_status?: string; error?: string }> {
  try {
    const r = await fetch(`${baseUrl}/${WORKER}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      // Pipe the canonical alias so the worker can resolve source_lang via
      // the per-regulator known-language fallback even when the row's
      // `regulator_canonical` column is NULL (corpus-wide gap as of 2026-05;
      // ~77% of enforcement_actions rows lack it).
      body: JSON.stringify({ row_id: rowId, dry_run: dryRun, regulator_canonical_alias: aliasKey }),
      signal: AbortSignal.timeout(120_000),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      return { ok: false, error: `worker ${r.status}: ${JSON.stringify(j)?.slice(0, 200)}` };
    }
    return { ok: true, primary_source_status: j?.primary_source_status };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Accept either:
  //   - x-admin-token == ADMIN_SECRET_TOKEN (legacy/admin-curl path), or
  //   - Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> (server-to-server,
  //     used by the SQL admin_fire_track3_extract helper invoked via pg_net).
  const adminToken = req.headers.get("x-admin-token") ?? "";
  const expected = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const tokenOk = !!expected && adminToken === expected;
  const bearerOk = !!serviceKey && !!bearer && bearer === serviceKey;
  if (!tokenOk && !bearerOk) {
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

  const { data: rows, error } = await supabase
    .from("enforcement_actions")
    .select("id")
    .eq("legacy_enrichment_version", 1)
    .eq("primary_source_status", "pending_fetch")
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
  const runHandle = await startRun(supabase, "track3-extract", {
    regulator: aliasKey,
    requested: maxRows,
    selected: rowIds.length,
    dry_run: dryRun,
  });

  const work = (async () => {
    const counts: Record<string, number> = {};
    let succeeded = 0;
    let failed = 0;
    try {
      for (const id of rowIds) {
        // Always use the env-resident admin token when calling the worker —
        // the orchestrator may have been authed via service-role bearer
        // instead of x-admin-token, but the worker still requires the token.
        const r = await callWorker(baseUrl, expected, id, dryRun);
        if (r.ok) {
          succeeded++;
          const k = r.primary_source_status ?? "unknown";
          counts[k] = (counts[k] ?? 0) + 1;
        } else {
          failed++;
          console.warn(`[track3-extract] row ${id} worker fail: ${r.error}`);
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
        metadata: { phase: "track3_extract", dry_run: dryRun, status_counts: counts },
      });
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
