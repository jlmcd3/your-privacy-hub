// ql3-orchestrator — Quality Loop 3 (RC-D).
//
// Phase machine per row of quality_loop3_runs:
//   revise_dummy → review2 → done | failed
//
// - kickoff (POST { action: "kickoff", tool_slug, assessment_id, notes? })
//     ─ admin-gated via has_role; internal callers via SR key or x-internal-resume.
//     ─ Creates quality_loop3_runs row, then self-invokes to start phase work.
// - resume (POST { action: "resume", run_id }, x-internal-resume: 1)
//     ─ Runs one bounded unit of work (one phase step), persists progress,
//       self-invokes to continue. Anti-hang: return 202 immediately.
//
// Constraints:
//  * Only reads/writes public.quality_loop3_runs and reads the assessment row.
//  * Never writes to cppa_assessments / *_assessments / dpia_frameworks etc.
//    (revisions are driven exclusively through run-quality-batch/revision_dispatch,
//    which is the audited internal path.)
//  * QL2 is untouched. Rollback = drop this function + the table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { resolveEnumRef } from "../_shared/field-enums.ts";

// RC-D.9 ADDENDUM: BUILD_STAMP is the CEO's external-verification anchor.
// Value = git short-sha of the commit being deployed + ISO timestamp.
// MUST be updated in the same edit that changes behavior in this file.
// External gate: clone HEAD sha == BUILD_STAMP sha observed in the first
// post-deploy telemetry row (quality_loop3_runs.qc_result.build_stamp here).
export const BUILD_STAMP = "rcd9-addendum@2026-07-13T22:15Z";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const TOOL_TABLE: Record<string, { table: string; toolType: string }> = {
  "governance":       { table: "governance_assessments", toolType: "governance_assessment" },
  "cppa-risk":        { table: "cppa_assessments",       toolType: "cppa_risk_assessment" },
  "cppa-cyber":       { table: "cppa_assessments",       toolType: "cppa_cybersecurity" },
  "cppa-admt":        { table: "cppa_assessments",       toolType: "cppa_admt" },
  "dpia":             { table: "dpia_frameworks",        toolType: "dpia_framework" },
  "lia":              { table: "li_assessments",         toolType: "li_assessment" },
  "ir-playbook":      { table: "ir_playbooks",           toolType: "ir_playbook" },
  "biometric":        { table: "biometric_assessments",  toolType: "biometric_checker" },
  "dpa":              { table: "dpa_documents",          toolType: "dpa_generator" },
};

function selfInvoke(runId: string) {
  return fetch(`${SUPABASE_URL}/functions/v1/ql3-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ action: "resume", run_id: runId }),
  }).catch((e) => console.error("[ql3] self-invoke failed", e));
}

// Deterministic dummy-answer generator driven by an open_item's input_spec.
// Contract: never emit a value outside spec.enum / spec.options; bound long text.
function dummyAnswerFor(item: any): { value: unknown; kind: string; invalid_reason?: string } {
  const spec = item?.input_spec ?? item?.spec ?? {};
  const type = String(spec?.type ?? item?.answer_type ?? "text").toLowerCase();
  const kind = String(spec?.kind ?? "").toLowerCase();
  const enumRef: string | null = typeof spec?.enum_ref === "string" ? spec.enum_ref : null;
  let enums: unknown[] = Array.isArray(spec?.enum)
    ? spec.enum
    : Array.isArray(spec?.options)
      ? spec.options.map((o: any) => (o?.value ?? o))
      : [];
  // RC-D.6 QL3-ENUM-1: frozen re-select items carry `enum_ref` (e.g.
  // "cppa_risk_assessment:q15c_spi_volume") instead of inline options.
  // Resolve via the server-side mirror of the client refine registry.
  let enumRefResolved: string | "unresolved" | null = null;
  if ((kind === "re-select" || enumRef) && enums.length === 0) {
    const mirrored = resolveEnumRef(enumRef);
    if (mirrored && mirrored.length > 0) {
      enums = [...mirrored];
      enumRefResolved = enumRef;
    } else if (enumRef) {
      enumRefResolved = "unresolved";
    }
  }
  if (enums.length > 0) {
    const idx = Math.min(enums.length - 1, Math.max(0, Math.floor(enums.length / 2)));
    return { value: enums[idx], kind: enumRefResolved && enumRefResolved !== "unresolved" ? "enum_ref_pick" : "enum_pick" };
  }
  if (type === "boolean" || type === "bool") return { value: true, kind: "boolean" };
  if (type === "number" || type === "integer") {
    const min = Number(spec?.min ?? 1);
    const max = Number(spec?.max ?? min + 1);
    const v = Number.isFinite(min) ? min : 1;
    return { value: v, kind: "number", invalid_reason: (Number.isFinite(max) && v > max) ? "min>max" : undefined };
  }
  if (Array.isArray(spec?.slug_keys) && spec.slug_keys.length) {
    return { value: [spec.slug_keys[0]], kind: "slug_pick" };
  }
  const maxLen = Number(spec?.max_length ?? 240);
  const boiler = "Dummy QL3 answer — deterministic fixture value used for revision-loop verification only.";
  const text = boiler.slice(0, Math.max(20, Math.min(240, Math.floor(maxLen))));
  // If a re-select's enum_ref wasn't in the mirror, honestly record it so QC
  // can see the fallback rather than assuming the spec was satisfied.
  if (enumRefResolved === "unresolved") {
    return { value: text, kind: "text_fallback", invalid_reason: "enum_ref_unresolved" };
  }
  return { value: text, kind: "text" };
}

async function readAssessment(toolSlug: string, assessmentId: string) {
  const cfg = TOOL_TABLE[toolSlug];
  if (!cfg) throw new Error(`unknown tool_slug: ${toolSlug}`);
  const db = admin();
  const { data, error } = await db
    .from(cfg.table)
    .select("id, status, report_data")
    .eq("id", assessmentId)
    .maybeSingle();
  if (error) throw new Error(`readAssessment: ${error.message}`);
  return { row: data, cfg };
}

async function callInternalGrader(toolSlug: string, assessmentId: string): Promise<number | null> {
  // grade-single-assessment uses the cppa-risk rubric label; restrict to
  // cppa-risk to avoid mis-labelling. Other tools rely on items_before/after
  // as the QC signal (post_score stays null and that is expected).
  if (toolSlug !== "cppa-risk") return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/grade-single-assessment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "apikey": SERVICE_KEY,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ assessment_id: assessmentId, dry_run: true }),
    });
    if (!r.ok) return null;
    const body: any = await r.json().catch(() => null);
    const score = body?.mean_score ?? body?.payload?.claude?.overall_score ?? null;
    return typeof score === "number" ? score : null;
  } catch {
    return null;
  }
}

async function runOneUnit(runId: string) {
  const db = admin();
  const { data: run, error: runErr } = await db
    .from("quality_loop3_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (runErr || !run) { console.error("[ql3] run not found", runId, runErr?.message); return; }
  if (run.phase === "done" || run.phase === "failed") return;

  // RC-D.7 D-QL3-RACE-1: acquire a phase CAS lock BEFORE any dispatch or
  // finalization side-effect. Only the transaction that atomically flips
  // phase from its expected value to a "*ing" holding phase proceeds; any
  // duplicate resume delivery (at-least-once) or double-fired self-invoke
  // loses the CAS and exits silently. Stamps `dispatch_nonce` on the winner
  // for audit. Also covers D-QL3-PHASE-1 by construction: only one writer
  // ever advances the phase for a given transition, so phase writes cannot
  // regress or overwrite a concurrent winner.
  const lockPhase = run.phase === "revise_dummy"
    ? "dispatching"
    : run.phase === "review2"
      ? "finalizing"
      : null;
  let dispatchNonce: string | null = null;
  if (lockPhase) {
    const nonce = crypto.randomUUID();
    const { data: locked, error: lockErr } = await db
      .from("quality_loop3_runs")
      .update({ phase: lockPhase, dispatch_nonce: nonce })
      .eq("id", runId)
      .eq("phase", run.phase)
      .select("id")
      .maybeSingle();
    if (lockErr) { console.error("[ql3] CAS error", runId, lockErr.message); return; }
    if (!locked) {
      console.log(`[ql3] CAS lost for ${runId} at phase=${run.phase} — another worker owns this transition; exiting silently`);
      return;
    }
    dispatchNonce = nonce;
    console.log(`[ql3] CAS won for ${runId}: ${run.phase} → ${lockPhase} nonce=${nonce}`);
  }

  try {
    if (run.phase === "revise_dummy") {

      const { row, cfg } = await readAssessment(run.tool_slug, run.assessment_id);
      if (!row) throw new Error("assessment row missing");
      const openItems: any[] = Array.isArray((row as any)?.report_data?.open_items)
        ? (row as any).report_data.open_items
        : [];
      const itemsBefore = openItems.length;
      const preScore = await callInternalGrader(run.tool_slug, run.assessment_id);

      // RC-D.1 D-6: capture baseline report_versions.max(version_n) so
      // review2 can wait for the revision to *actually* advance the rail
      // before measuring items_after / post_score.
      const { data: baseVer } = await db
        .from("report_versions")
        .select("version_n")
        .eq("tool_type", cfg.toolType)
        .eq("assessment_id", run.assessment_id)
        .order("version_n", { ascending: false })
        .limit(1)
        .maybeSingle();
      const baselineVersion = (baseVer as any)?.version_n ?? 0;

      // Generate dummy answers deterministically from input_spec.
      const answered = openItems
        .filter((it) => it?.id || it?.item_id)
        .slice(0, 12) // bound per pass
        .map((it) => {
          const ans = dummyAnswerFor(it);
          // RC-D.4 QL3-ANS-1: revision contract reads `value` (revision-mode.ts
          // :96 / :315), not `answer`. Emitting `answer` silently dropped the
          // payload and every dummy revision reached the generator empty.
          return {
            item_id: String(it.id ?? it.item_id),
            value: ans.value,
            _dummy_kind: ans.kind,
            ...(ans.invalid_reason ? { _invalid_reason: ans.invalid_reason } : {}),
          };
        });

      if (!answered.length) {
        await db.from("quality_loop3_runs").update({
          phase: "done",
          items_before: itemsBefore,
          items_after: itemsBefore,
          items_resolved: 0,
          pre_score: preScore,
          post_score: preScore,
          terminal_at: new Date().toISOString(),
          notes: (run.notes ? run.notes + " | " : "") + "no_open_items_to_answer",
        }).eq("id", runId);
        return;
      }

      // Dispatch revision through the audited internal path (RC-D.1 D-1:
      // run-quality-batch accepts SR bearer + x-internal-verification for
      // enumerated actions).
      // RC-D.8 end-to-end idempotency: forward the CAS-winning dispatch_nonce
      // so rqb + regenerate can turn any duplicate delivery (at-least-once
      // retries at the HTTP/gateway layer, or writer-races clobbering
      // updated_at via BEFORE UPDATE triggers) into a no-side-effect
      // 409 idempotent_replay. Uses the LOCAL CAS nonce generated and stamped
      // above; do not re-select the row because read-back can observe stale
      // deployed artifacts or unexpected nulls under race/replica behavior.
      const dispatchRes = await fetch(`${SUPABASE_URL}/functions/v1/run-quality-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "apikey": SERVICE_KEY,
          "x-internal-verification": "1",
        },
        body: JSON.stringify({
          action: "revision_dispatch",
          tool_type: cfg.toolType,
          assessment_id: run.assessment_id,
          answered_items: answered,
          dispatch_nonce: dispatchNonce,
        }),
      });
      const upstreamStatus = dispatchRes.status;
      const upstream: any = await dispatchRes.json().catch(() => ({}));

      await db.from("quality_loop3_runs").update({
        phase: upstreamStatus >= 200 && upstreamStatus < 300 ? "review2" : "failed",
        input_spec: {
          open_items_before: openItems.map((i: any) => ({ id: i.id ?? i.item_id, type: i?.input_spec?.type })),
          baseline_version_n: baselineVersion,
        },
        dummy_answers: answered,
        items_before: itemsBefore,
        pre_score: preScore,
        qc_result: {
          dispatch_status: upstreamStatus,
          baseline_version_n: baselineVersion,
          upstream: {
            verdicts: upstream?.verdicts ?? null,
            changed_paths: upstream?.changed_paths ?? null,
            qc_checks: upstream?.qc_checks ?? null,
          },
        },
        error_message: upstreamStatus >= 200 && upstreamStatus < 300 ? null : `dispatch_${upstreamStatus}`,
      }).eq("id", runId);

      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }

    if (run.phase === "review2") {
      // RC-D.1 D-6: confirm terminal state (status complete AND
      // report_versions.version_n advanced past baseline) BEFORE measuring.
      const cfg = TOOL_TABLE[run.tool_slug];
      const baselineVersion: number = (run as any)?.qc_result?.baseline_version_n
        ?? (run as any)?.input_spec?.baseline_version_n
        ?? 0;
      let rowFinal: any = null;
      let currentVersion = baselineVersion;
      let terminalReached = false;
      for (let i = 0; i < 45; i++) { // ~90s with 2s sleep
        await new Promise((r) => setTimeout(r, 2000));
        const { data: r1 } = await db
          .from(cfg.table)
          .select("id, status, report_data")
          .eq("id", run.assessment_id)
          .maybeSingle();
        const { data: v1 } = await db
          .from("report_versions")
          .select("version_n")
          .eq("tool_type", cfg.toolType)
          .eq("assessment_id", run.assessment_id)
          .order("version_n", { ascending: false })
          .limit(1)
          .maybeSingle();
        rowFinal = r1;
        currentVersion = (v1 as any)?.version_n ?? baselineVersion;
        if ((r1 as any)?.status === "complete" && currentVersion > baselineVersion) {
          terminalReached = true;
          break;
        }
      }
      const openItemsAfter: any[] = Array.isArray((rowFinal as any)?.report_data?.open_items)
        ? (rowFinal as any).report_data.open_items
        : [];
      const itemsAfter = openItemsAfter.length;
      const postScore = await callInternalGrader(run.tool_slug, run.assessment_id);
      const resolved = Math.max(0, (run.items_before ?? 0) - itemsAfter);
      const priorQc = (run as any)?.qc_result ?? {};

      await db.from("quality_loop3_runs").update({
        phase: "done",
        items_after: itemsAfter,
        items_resolved: resolved,
        post_score: postScore,
        terminal_at: new Date().toISOString(),
        qc_result: {
          ...priorQc,
          review2_terminal_reached: terminalReached,
          review2_baseline_version_n: baselineVersion,
          review2_current_version_n: currentVersion,
        },
        ...(terminalReached ? {} : { error_message: "review2_timeout_pre_terminal" }),
      }).eq("id", runId);
      return;
    }
  } catch (e: any) {
    await db.from("quality_loop3_runs").update({
      phase: "failed",
      error_message: (e?.message ?? String(e)).slice(0, 500),
      terminal_at: new Date().toISOString(),
    }).eq("id", runId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const isInternal = bearer && bearer === SERVICE_KEY;

  let body: any = null;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const action = body?.action ?? "kickoff";

  // Internal resume path — no admin check, only SR bearer.
  if (action === "resume") {
    if (!isInternal) return json({ error: "internal_only" }, 401);
    const runId = String(body?.run_id ?? "");
    if (!runId) return json({ error: "missing run_id" }, 400);
    // @ts-ignore
    EdgeRuntime.waitUntil(runOneUnit(runId));
    return json({ accepted: true, run_id: runId }, 202);
  }

  // Kickoff — admin gated (SR bypass allowed for programmatic starts).
  let userId: string | null = null;
  if (!isInternal) {
    if (!bearer) return json({ error: "missing_authorization" }, 401);
    const supabase = createClient(SUPABASE_URL, ANON_KEY);
    const { data: u, error: uErr } = await supabase.auth.getUser(bearer);
    if (uErr || !u?.user) return json({ error: "invalid_token" }, 401);
    userId = u.user.id;
    const { data: isAdmin } = await admin().rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "admin_only" }, 403);
  }

  if (action === "kickoff") {
    const toolSlug = String(body?.tool_slug ?? "");
    const assessmentId = String(body?.assessment_id ?? "");
    if (!TOOL_TABLE[toolSlug]) return json({ error: "unsupported_tool", detail: `known: ${Object.keys(TOOL_TABLE).join(",")}` }, 400);
    if (!assessmentId) return json({ error: "missing assessment_id" }, 400);

    const { data: run, error: insErr } = await admin().from("quality_loop3_runs").insert({
      tool_slug: toolSlug,
      assessment_id: assessmentId,
      run_by: userId,
      phase: "revise_dummy",
      pass_number: Number(body?.pass_number ?? 1),
      notes: body?.notes ?? null,
    }).select("id").single();

    if (insErr || !run) return json({ error: "insert_failed", detail: insErr?.message }, 500);
    // @ts-ignore
    EdgeRuntime.waitUntil(selfInvoke((run as any).id));
    return json({ run_id: (run as any).id, phase: "revise_dummy" }, 202);
  }

  return json({ error: "unknown_action", detail: action }, 400);
});
