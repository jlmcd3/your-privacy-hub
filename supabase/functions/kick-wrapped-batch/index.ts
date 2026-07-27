// INSTRUMENT-EPOCH-AUDIT-S6 kick helper (2026-07-27, ledger item 155).
// AMENDED ENGINE-B-ALWAYS-ON (2026-07-27, ledger item 170): measurement-
// validity pre-assertion is now VERSION-BASED, not mode-based. Mode
// toggles are retired system-wide; the Legal Test Pipeline is the only
// composition path. See LEGAL-TEST-PIPELINE.md §16 (simplified) + §28.
//
// Caller MAY supply `pipeline_version_expected` and `target_fn` (a slug
// like "run-cppa-risk-assessment"). When provided, this kicker PINGS the
// target function's GET /?ping=1 endpoint and aborts with 409 if the
// target's reported `pipeline_version` differs from the expected value —
// the batch NEVER launches against a mismatched generator.
//
// Legacy inputs (`mode_expected` + target's `ltp_mode`) still accepted
// for one release cycle and normalized to a warning; they DO NOT gate.
import { corsHeaders as cors } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const runId = String(body?.run_id ?? "");
  const versionExpected = body?.pipeline_version_expected
    ? String(body.pipeline_version_expected)
    : null;
  const targetFn = body?.target_fn ? String(body.target_fn) : null;
  const legacyModeExpected = body?.mode_expected ? String(body.mode_expected) : null;

  if (!runId) {
    return new Response(JSON.stringify({ error: "run_id required (quality_batch_runs.id)" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Measurement-validity pre-assertion (LEGAL-TEST-PIPELINE.md §16, simplified).
  let version_check: Record<string, unknown> | null = null;
  if (versionExpected && targetFn) {
    try {
      const pr = await fetch(`${SUPABASE_URL}/functions/v1/${targetFn}?ping=1`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY },
      });
      const pj = await pr.json().catch(() => ({} as any));
      const actual = pj?.pipeline_version ?? pj?.ltp_version ?? null;
      version_check = {
        target_fn: targetFn,
        expected: versionExpected,
        actual,
        content_versions: pj?.content_versions ?? null,
        build_stamp: pj?.build_stamp ?? null,
      };
      if (actual !== versionExpected) {
        console.log(JSON.stringify({ evt: "kick_wrapped_batch_version_mismatch_abort", run_id: runId, version_check }));
        return new Response(JSON.stringify({
          error: "ltp_pipeline_version_mismatch",
          law: "LEGAL-TEST-PIPELINE.md §16 measurement-validity (simplified, item 170)",
          version_check,
        }), { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
      }
    } catch (e) {
      return new Response(JSON.stringify({
        error: "version_precheck_failed",
        law: "LEGAL-TEST-PIPELINE.md §16 measurement-validity",
        detail: (e as Error)?.message ?? "unknown",
      }), { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
    }
  } else if (legacyModeExpected) {
    console.log(JSON.stringify({
      evt: "kick_wrapped_batch_legacy_mode_expected_ignored",
      run_id: runId,
      note: "mode toggles retired per ledger item 170; supply pipeline_version_expected instead",
    }));
  }

  const r = await fetch(`${SUPABASE_URL}/functions/v1/quality-batch-orchestrator`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "Content-Type": "application/json",
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ run_id: runId }),
  });
  const txt = await r.text();
  return new Response(JSON.stringify({
    status: r.status,
    upstream: txt.slice(0, 500),
    version_check,
  }), {
    status: 200, headers: { ...cors, "Content-Type": "application/json" },
  });
});
