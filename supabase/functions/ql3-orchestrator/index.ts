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
import { computeVariance, VARIANCE_SAMPLES_N } from "./_local/ql3-variance.ts";
import { validateIntake } from "../_shared/intake-contracts/validate.ts";
import { cppaCybersecurityContract } from "../_shared/intake-contracts/cppa-cybersecurity.ts";
import { governanceContract } from "../_shared/intake-contracts/governance-assessment.ts";
import { cppaAdmtContract } from "../_shared/intake-contracts/cppa-admt.ts";
import { cppaRiskContract } from "../_shared/intake-contracts/cppa-risk-assessment.ts";
import { CYBER_CONTRACT_FIXTURES } from "../_shared/cyber-contract-fixtures.ts";
import { GOVERNANCE_CONTRACT_FIXTURES } from "../_shared/governance-contract-fixtures.ts";
import { ADMT_CONTRACT_FIXTURES } from "../_shared/admt-contract-fixtures.ts";
import { CPPA_RISK_CONTRACT_FIXTURES } from "../_shared/cppa-risk-contract-fixtures.ts";

// RC-D.9 ADDENDUM: BUILD_STAMP is the CEO's external-verification anchor.
// Value = git short-sha of the commit being deployed + ISO timestamp.
// RC-P5 (2026-07-14): fixture reachability sweep + startup validateIntake
// assertion added; cyber partial-submission scenario pinned in SCENARIOS.
export const BUILD_STAMP = "a91e37b4-rcP5-fixtures@2026-07-14T22:30Z";

// RC-P5 — SCENARIOS: static map of contract-fixture expectations. Each entry
// documents the honest revision-harness expectation post-P3/P4. Consumed by
// the startup assertion below (validateIntake per fixture) and by external
// review; QL3 does not seed intake at runtime — it operates on assessments
// created by run-quality-batch from these fixtures.
export const SCENARIOS = {
  "cppa-cyber": {
    contract: cppaCybersecurityContract,
    fixtures: CYBER_CONTRACT_FIXTURES,
    // RC-P5 (partial-submission): 15 of 18 controls populated; 3 empty
    // (c13_training, c14_secure_dev, c15_third_party). First-gen expects
    // per-control "Insufficient information" status entries and up to 3
    // information_needed entries (3-cap in synthesiseCyberAsksFromControls).
    // Dummy-answered via answered_items → resolution with controls[N].status
    // changed_paths passing the P3 allowlist (DERIVED_PATHS.cppa_cybersecurity
    // covers score/finding/priority/remediation peer leaves).
    expect: "yield_k_up_to_3_open_items",
  },
  "governance": {
    contract: governanceContract,
    fixtures: GOVERNANCE_CONTRACT_FIXTURES,
    // Post-P4: governance registry intentionally empty; fully-populated
    // intake yields zero open_items.
    expect: "zero_open_items",
  },
  "cppa-admt": {
    contract: cppaAdmtContract,
    fixtures: ADMT_CONTRACT_FIXTURES,
    // Post-P4: reachable-empty notice_purpose_text and opt_out_methods via
    // exception paths (Human appeal / Hiring / Work allocation) — canned
    // verbatim strings elsewhere.
    expect: "yield_k1_plus_reachable_empty",
  },
  "cppa-risk": {
    contract: cppaRiskContract,
    fixtures: CPPA_RISK_CONTRACT_FIXTURES,
    expect: "mixed_yield_k3_partial_full",
  },
} as const;

// RC-P5 — Startup assertion: refuse to run any scenario whose intake fails
// validateIntake(contract, intake). Runs at module cold-start so the
// x-internal-verification bypass can never again carry a form-unreachable
// state (P1 tests re-cover this at CI time; this is the deploy-time gate).
export function assertScenariosFormReachable(): void {
  for (const [slug, s] of Object.entries(SCENARIOS)) {
    for (const fx of s.fixtures as any[]) {
      const res = validateIntake(s.contract as any, fx.intake as Record<string, unknown>);
      if (!res.ok) {
        const msg = `[ql3] SCENARIO_INTAKE_INVALID slug=${slug} fixture=${fx.fixture_id} violations=${JSON.stringify(res.violations)}`;
        console.error(msg);
        throw new Error(msg);
      }
    }
  }
}
assertScenariosFormReachable();


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// QL3-OPEN-1 — exported for unit-test pinning of the OPEN-only filter and
// the 12-item bound. Register items with status !== "open" (resolved,
// not_resolved, or any future terminal status) must never enter answered.
export function selectOpenForRevision(register: unknown): any[] {
  if (!Array.isArray(register)) return [];
  return register
    .filter((it: any) => it?.status === "open")
    .filter((it: any) => it?.id || it?.item_id)
    .slice(0, 12);
}
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

// QL3-P1 — grader_stamp is mirrored from grade-single-assessment.BUILD_STAMP.
// Kept in sync manually; a drift would key the grade cache under a different
// stamp and force a re-sample, which is safe (miss = re-grade, never a
// silent hit). Update in the same edit that changes grade-single-assessment.
// QL3-P1.2 (2026-07-15): grader generalized to all nine QL3 tools; stamp
// bumped in lock-step with grade-single-assessment BUILD_STAMP. The
// equality invariant is asserted by _tests/ql3-p1-2.test.ts.
// ITEM 388 FIX 3 (2026-08-06): mirror restored. The constant had drifted to
// "ql3-qlbf3-grader-payload@2026-07-15T02:00Z" while the counterpart
// grade-single-assessment.BUILD_STAMP moved to the value below; the
// grader_stamp DB filter depends on the two being byte-identical.
export const GRADER_STAMP = "post-c1-fix-2-amend-clay-postcutoff-block@2026-07-23T18:45:00Z";

export interface GraderSample { claude: number | null; gpt: number | null; blended: number | null }
async function callInternalGrader(toolSlug: string, assessmentId: string): Promise<GraderSample | null> {
  // QL3-P1.2: grade-single-assessment now accepts a `tool` param and
  // routes to the correct table for all nine QL3 slugs. All non-editorial
  // tools score on the same six-dimension rubric; per-tool signal (items
  // resolved, incorporation) remains the primary QC gate — grader scores
  // are complementary variance samples, not the sole verdict.
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/grade-single-assessment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "apikey": SERVICE_KEY,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ assessment_id: assessmentId, tool: toolSlug, dry_run: true }),
    });
    if (!r.ok) return null;
    const body: any = await r.json().catch(() => null);
    const claude = body?.payload?.claude?.overall_score;
    const gpt = body?.payload?.gpt?.overall_score;
    const blended = body?.mean_score;
    return {
      claude: typeof claude === "number" && Number.isFinite(claude) ? claude : null,
      gpt: typeof gpt === "number" && Number.isFinite(gpt) ? gpt : null,
      blended: typeof blended === "number" && Number.isFinite(blended) ? blended : null,
    };
  } catch {
    return null;
  }
}

export interface GraderSamples { claude: number[]; gpt: number[]; blended: number[] }
export function emptyGraderSamples(): GraderSamples { return { claude: [], gpt: [], blended: [] }; }

// RC-C3.CLOSE-1 (item 1) — sample the grader N times per phase so QL3 can
// derive a bootstrapped no-signal band. Sequential (never parallel) so the
// grader isn't hammered; each call is bounded by callInternalGrader's own
// timeout. Non-numeric returns are dropped. Empty array is a legitimate
// outcome for tools without a scoring rubric (e.g. non cppa-risk) and is
// handled by computeVariance → "insufficient_samples".
// QL3-P1: now returns per-model + blended arrays; the blended array is the
// same series previously returned so back-compat callers unaffected.
async function sampleGraderScores(toolSlug: string, assessmentId: string, n = VARIANCE_SAMPLES_N): Promise<GraderSamples> {
  const out = emptyGraderSamples();
  for (let i = 0; i < n; i++) {
    const s = await callInternalGrader(toolSlug, assessmentId);
    if (!s) continue;
    if (s.claude != null) out.claude.push(s.claude);
    if (s.gpt != null) out.gpt.push(s.gpt);
    if (s.blended != null) out.blended.push(s.blended);
  }
  return out;
}

export function medianOrNull(xs: number[]): number | null {
  if (!xs || xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// QL3-P1 grade cache helpers. Cache key: (assessment_id, version_n, grader_stamp).
async function loadCachedSamples(assessmentId: string, versionN: number): Promise<GraderSamples | null> {
  try {
    const { data } = await admin()
      .from("quality_loop3_grade_cache")
      .select("samples")
      .eq("assessment_id", assessmentId)
      .eq("version_n", versionN)
      .eq("grader_stamp", GRADER_STAMP)
      .maybeSingle();
    const s: any = (data as any)?.samples;
    if (!s) return null;
    return {
      claude: Array.isArray(s.claude) ? s.claude.filter((n: unknown) => typeof n === "number") : [],
      gpt: Array.isArray(s.gpt) ? s.gpt.filter((n: unknown) => typeof n === "number") : [],
      blended: Array.isArray(s.blended) ? s.blended.filter((n: unknown) => typeof n === "number") : [],
    };
  } catch {
    return null;
  }
}
async function storeCachedSamples(assessmentId: string, toolSlug: string, versionN: number, samples: GraderSamples): Promise<void> {
  try {
    await admin()
      .from("quality_loop3_grade_cache")
      .upsert({
        assessment_id: assessmentId,
        tool_slug: toolSlug,
        version_n: versionN,
        grader_stamp: GRADER_STAMP,
        samples: samples as unknown as Record<string, unknown>,
      }, { onConflict: "assessment_id,version_n,grader_stamp" });
  } catch (e) {
    console.warn("[ql3] grade cache upsert failed", (e as Error).message);
  }
}

// QL3-P1 — additive log writes into public.quality_loop3_log. Non-fatal.
async function logQL3(runId: string | null, level: "info" | "warn" | "error", message: string, batchId: string | null = null) {
  try {
    await admin().from("quality_loop3_log").insert({
      batch_id: batchId,
      ql3_run_id: runId,
      level,
      message: message.slice(0, 2000),
    });
  } catch {}
}

// QL3-P1 — Deterministic incorporation check. Pure & exported for tests.
// For each verdict `resolved`, resolve the item's target.path against
// report_data and check the value REFLECTS the dummy answer.
export type IncorpKind = "enum" | "multi_enum" | "text" | "unverifiable";
export type IncorpResult = "pass" | "fail" | "unverifiable";
export interface IncorpCheck {
  item_id: string;
  path: string | null;
  kind: IncorpKind;
  result: IncorpResult;
  detail?: string;
}
export interface IncorpReport { pass: boolean; checked: IncorpCheck[] }

export function resolvePath(root: unknown, path: string | null | undefined): unknown {
  if (!path || typeof path !== "string") return undefined;
  // Support dotted keys and [N] array indices.
  const parts: string[] = [];
  const tokens = path.split(".");
  for (const t of tokens) {
    const m = t.match(/^([^\[]+)((?:\[\d+\])*)$/);
    if (!m) return undefined;
    const [, name, idxPart] = m;
    if (name) parts.push(name);
    if (idxPart) {
      const idxs = idxPart.match(/\d+/g) ?? [];
      for (const i of idxs) parts.push(i);
    }
  }
  let cur: any = root;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur) && /^\d+$/.test(p)) cur = cur[Number(p)];
    else cur = cur[p];
  }
  return cur;
}

export function checkIncorporation(params: {
  reportData: unknown;
  register: any[];
  verdicts: any[];
  answered: any[];
}): IncorpReport {
  const answeredById = new Map<string, unknown>();
  for (const a of params.answered ?? []) {
    const id = a?.item_id ?? a?.id;
    if (id != null) answeredById.set(String(id), a?.value);
  }
  const registerById = new Map<string, any>();
  for (const it of params.register ?? []) {
    const id = it?.id ?? it?.item_id;
    if (id != null) registerById.set(String(id), it);
  }
  const checks: IncorpCheck[] = [];
  for (const v of params.verdicts ?? []) {
    if ((v?.verdict ?? v?.status) !== "resolved") continue;
    const itemId = String(v?.item_id ?? v?.id ?? "");
    if (!itemId) continue;
    const item = registerById.get(itemId);
    const path: string | null = item?.target?.path ?? null;
    const answer = answeredById.get(itemId);
    // Path-vocabulary nuance: cppa-cyber ask-paths use `controls.<slug>` but
    // the report shape stores controls as an array (controls[N]). We do not
    // attempt to alias here — if resolvePath returns undefined, we mark
    // "unverifiable" and NEVER fail the run on it.
    const actual = resolvePath(params.reportData, path);
    if (actual === undefined || path == null) {
      checks.push({ item_id: itemId, path, kind: "unverifiable", result: "unverifiable", detail: path ? "path_unresolvable" : "no_path" });
      continue;
    }
    // Classify by answer shape.
    if (Array.isArray(answer)) {
      // multi_enum: every selected member must be present in actual (array or string).
      const missing: unknown[] = [];
      const container = Array.isArray(actual) ? actual : [actual];
      for (const m of answer) {
        if (!container.some((x) => x === m || String(x) === String(m))) missing.push(m);
      }
      checks.push({
        item_id: itemId, path, kind: "multi_enum",
        result: missing.length === 0 ? "pass" : "fail",
        ...(missing.length ? { detail: `missing:${JSON.stringify(missing).slice(0, 120)}` } : {}),
      });
      continue;
    }
    if (typeof answer === "string" && typeof actual === "string") {
      // Enum-style match first: exact equality (case-insensitive).
      if (actual.trim().toLowerCase() === answer.trim().toLowerCase()) {
        checks.push({ item_id: itemId, path, kind: "enum", result: "pass" });
      } else if (actual.toLowerCase().includes(answer.trim().toLowerCase()) && answer.trim().length > 0) {
        checks.push({ item_id: itemId, path, kind: "text", result: "pass" });
      } else {
        checks.push({ item_id: itemId, path, kind: "text", result: "fail", detail: "not_contained" });
      }
      continue;
    }
    if (typeof answer === "boolean" || typeof answer === "number") {
      checks.push({
        item_id: itemId, path, kind: "enum",
        result: actual === answer ? "pass" : "fail",
        ...(actual === answer ? {} : { detail: `expected:${String(answer)} actual:${String(actual)}` }),
      });
      continue;
    }
    // Non-primitive answer we don't know how to compare.
    checks.push({ item_id: itemId, path, kind: "unverifiable", result: "unverifiable", detail: "unsupported_answer_shape" });
  }
  const pass = checks.every((c) => c.result !== "fail");
  return { pass, checked: checks };
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
      // QL3-OPEN-1: the register contains items in every status
      // (open / resolved / not_resolved). Only OPEN items are legitimate
      // targets for a dummy revision — regenerate-assessment refuses
      // item_not_open per RC-D.4, and that refusal previously turned
      // the whole pass into dispatch_400. Filter here, then measure.
      const registerAll: any[] = Array.isArray((row as any)?.report_data?.open_items)
        ? (row as any).report_data.open_items
        : [];
      const openItems = selectOpenForRevision(registerAll);
      const itemsBefore = openItems.length;

      // RC-D.1 D-6: capture baseline report_versions.max(version_n) so
      // review2 can wait for the revision to *actually* advance the rail
      // before measuring items_after / post_score. Also used as the QL3-P1
      // pre-sample cache key.
      const { data: baseVer } = await db
        .from("report_versions")
        .select("version_n")
        .eq("tool_type", cfg.toolType)
        .eq("assessment_id", run.assessment_id)
        .order("version_n", { ascending: false })
        .limit(1)
        .maybeSingle();
      const baselineVersion = (baseVer as any)?.version_n ?? 0;

      // QL3-P1 grade cache — try to reuse pre-samples for
      // (assessment_id, baseline version_n, grader_stamp).
      let preSamples: GraderSamples = emptyGraderSamples();
      let preCached = false;
      const cachedPre = await loadCachedSamples(run.assessment_id, baselineVersion);
      if (cachedPre && (cachedPre.blended.length > 0 || cachedPre.claude.length > 0 || cachedPre.gpt.length > 0)) {
        preSamples = cachedPre;
        preCached = true;
        await logQL3(runId, "info", `pre-samples cache HIT assessment=${run.assessment_id} version=${baselineVersion}`);
      } else {
        // RC-C3.CLOSE-1 (item 1) — sample N=3.
        preSamples = await sampleGraderScores(run.tool_slug, run.assessment_id);
        // Only store if we produced anything (non-cppa-risk returns empties).
        if (preSamples.blended.length > 0 || preSamples.claude.length > 0 || preSamples.gpt.length > 0) {
          await storeCachedSamples(run.assessment_id, run.tool_slug, baselineVersion, preSamples);
        }
        await logQL3(runId, "info", `pre-samples cache MISS assessment=${run.assessment_id} version=${baselineVersion} n=${preSamples.blended.length}`);
      }
      const preScore = medianOrNull(preSamples.blended);
      const preClaude = medianOrNull(preSamples.claude);
      const preGpt = medianOrNull(preSamples.gpt);


      // Generate dummy answers deterministically from input_spec.
      // openItems is already OPEN-only, id-guarded, and 12-bounded by
      // selectOpenForRevision (QL3-OPEN-1).
      const answered = openItems.map((it) => {
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
          pre_claude_score: preClaude,
          pre_gpt_score: preGpt,
          post_claude_score: preClaude,
          post_gpt_score: preGpt,
          terminal_at: new Date().toISOString(),
          notes: (run.notes ? run.notes + " | " : "") + "no_open_items_to_answer",
        }).eq("id", runId);
        await logQL3(runId, "info", "no_open_items_to_answer — done");
        return;
      }
      await logQL3(runId, "info", `dispatch tool=${cfg.toolType} answered=${answered.length}`);


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

      // RC-D.10 fail-loud: an idempotent_replay is only legitimate when a
      // PRIOR successful dispatch is recorded in THIS run's qc_result
      // (regen_build_stamp set + verdicts present). A replay we didn't earn
      // must never advance to review2 — that path produced pass 4's
      // false-green with all null verdicts.
      const priorQcInit: any = (run as any)?.qc_result ?? {};
      const priorAccepted = !!(priorQcInit?.regen_build_stamp)
        && Array.isArray(priorQcInit?.upstream?.verdicts)
        && priorQcInit?.upstream?.verdicts.length > 0;
      const unexpectedReplay = upstream?.idempotent_replay === true && !priorAccepted;
      const ok2xx = upstreamStatus >= 200 && upstreamStatus < 300;
      const nextPhase = unexpectedReplay ? "failed" : (ok2xx ? "review2" : "failed");
      const nextErr = unexpectedReplay
        ? "idempotent_replay_unexpected"
        : (ok2xx ? null : `dispatch_${upstreamStatus}`);

      await db.from("quality_loop3_runs").update({
        phase: nextPhase,
        input_spec: {
          open_items_before: openItems.map((i: any) => ({ id: i.id ?? i.item_id, type: i?.input_spec?.type })),
          baseline_version_n: baselineVersion,
        },
        dummy_answers: answered,
        items_before: itemsBefore,
        pre_score: preScore,
        pre_claude_score: preClaude,
        pre_gpt_score: preGpt,
        qc_result: {
          dispatch_status: upstreamStatus,
          baseline_version_n: baselineVersion,
          build_stamp: BUILD_STAMP,
          grader_stamp: GRADER_STAMP,
          pre_samples_cached: preCached,
          rqb_build_stamp: upstream?.build_stamp ?? null,
          regen_build_stamp: upstream?.upstream_build_stamp ?? null,
          idempotent_replay: upstream?.idempotent_replay === true,
          // QL3-P1 — persist per-model + blended raw samples. Back-compat:
          // score_samples.pre.blended keeps the previously-persisted blended
          // vector readable at the same key depth.
          score_samples: {
            pre: { claude: preSamples.claude, gpt: preSamples.gpt, blended: preSamples.blended },
            post: { claude: [], gpt: [], blended: [] },
          },
          upstream: {
            verdicts: upstream?.verdicts ?? null,
            changed_paths: upstream?.changed_paths ?? null,
            qc_checks: upstream?.qc_checks ?? null,
          },
        },
        
        error_message: nextErr,
        ...(unexpectedReplay ? { terminal_at: new Date().toISOString() } : {}),
      }).eq("id", runId);
      await logQL3(runId, unexpectedReplay ? "error" : (ok2xx ? "info" : "warn"),
        `dispatch upstream_status=${upstreamStatus} next_phase=${nextPhase}${nextErr ? ` err=${nextErr}` : ""}`);

      if (unexpectedReplay) return;

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
      // QL3-OPEN-1: measure OPEN-only counts (items_before/after semantics
      // = count of items whose status === "open"). items_resolved counts
      // STATUS TRANSITIONS by id — how many of the ids that were OPEN at
      // dispatch are now status === "resolved" in the post-revision register.
      // Array-length delta is unreliable because the register can grow or
      // shrink during revision (new open items surfaced, resolved items
      // retained, etc.).
      const registerAfter: any[] = Array.isArray((rowFinal as any)?.report_data?.open_items)
        ? (rowFinal as any).report_data.open_items
        : [];
      const openItemsAfter = registerAfter.filter((it: any) => it?.status === "open");
      const itemsAfter = openItemsAfter.length;
      const postSamples = await sampleGraderScores(run.tool_slug, run.assessment_id);
      const postScore = medianOrNull(postSamples.blended);
      const postClaude = medianOrNull(postSamples.claude);
      const postGpt = medianOrNull(postSamples.gpt);
      // QL3-P1: write post-samples to cache under the NEW version_n — they
      // become the next pass's pre-samples.
      if (currentVersion > 0 && (postSamples.blended.length > 0 || postSamples.claude.length > 0 || postSamples.gpt.length > 0)) {
        await storeCachedSamples(run.assessment_id, run.tool_slug, currentVersion, postSamples);
      }
      const openIdsBefore: string[] = Array.isArray((run as any)?.input_spec?.open_items_before)
        ? (run as any).input_spec.open_items_before
            .map((i: any) => (i?.id ? String(i.id) : null))
            .filter((s: string | null): s is string => !!s)
        : [];
      const nowById = new Map<string, string>();
      for (const it of registerAfter) {
        const iid = it?.id ?? it?.item_id;
        if (iid) nowById.set(String(iid), String(it?.status ?? ""));
      }
      const resolved = openIdsBefore.reduce(
        (n, id) => n + (nowById.get(id) === "resolved" ? 1 : 0),
        0,
      );
      const priorQc = (run as any)?.qc_result ?? {};
      // Back-compat read: prior shape was `score_samples.pre: number[]`,
      // new shape is `{claude, gpt, blended}`. Prefer blended when present.
      const priorPre: any = priorQc?.score_samples?.pre;
      const preSamplesPersisted: number[] = Array.isArray(priorPre)
        ? priorPre.filter((x: unknown) => typeof x === "number")
        : (Array.isArray(priorPre?.blended) ? priorPre.blended.filter((x: unknown) => typeof x === "number") : []);
      const variance = computeVariance(preSamplesPersisted, postSamples.blended);

      // QL3-P1 incorporation check (after terminalReached confirmed above).
      const verdicts: any[] = Array.isArray(priorQc?.upstream?.verdicts) ? priorQc.upstream.verdicts : [];
      const answered: any[] = Array.isArray((run as any)?.dummy_answers) ? (run as any).dummy_answers : [];
      let incorporation: IncorpReport | null = null;
      let incorpNote = "";
      if (terminalReached && verdicts.length > 0) {
        incorporation = checkIncorporation({
          reportData: (rowFinal as any)?.report_data,
          register: registerAfter,
          verdicts,
          answered,
        });
        const failCount = incorporation.checked.filter((c) => c.result === "fail").length;
        if (failCount > 0) incorpNote = `incorporation_failed(${failCount})`;
      }

      const newNotes = incorpNote
        ? ((run as any).notes ? `${(run as any).notes} | ${incorpNote}` : incorpNote)
        : (run as any).notes;

      await db.from("quality_loop3_runs").update({
        phase: "done",
        items_after: itemsAfter,
        items_resolved: resolved,
        post_score: postScore,
        post_claude_score: postClaude,
        post_gpt_score: postGpt,
        terminal_at: new Date().toISOString(),
        ...(incorpNote ? { notes: newNotes } : {}),
        qc_result: {
          ...priorQc,
          build_stamp: BUILD_STAMP,
          grader_stamp: GRADER_STAMP,
          review2_terminal_reached: terminalReached,
          review2_baseline_version_n: baselineVersion,
          review2_current_version_n: currentVersion,
          // QL3-P1 — persist per-model + blended raw samples; back-compat
          // blended vector preserved at the same key depth.
          score_samples: {
            pre: {
              claude: Array.isArray(priorPre?.claude) ? priorPre.claude : [],
              gpt: Array.isArray(priorPre?.gpt) ? priorPre.gpt : [],
              blended: preSamplesPersisted,
            },
            post: { claude: postSamples.claude, gpt: postSamples.gpt, blended: postSamples.blended },
          },
          variance,
          ...(incorporation ? { incorporation } : {}),
        },
        ...(terminalReached ? {} : { error_message: "review2_timeout_pre_terminal" }),
      }).eq("id", runId);
      await logQL3(runId, terminalReached ? "info" : "warn",
        `review2 done terminal=${terminalReached} items_after=${itemsAfter} resolved=${resolved}${incorpNote ? " " + incorpNote : ""}`);
      return;
    }

  } catch (e: any) {
    const msg = (e?.message ?? String(e)).slice(0, 500);
    await db.from("quality_loop3_runs").update({
      phase: "failed",
      error_message: msg,
      terminal_at: new Date().toISOString(),
    }).eq("id", runId);
    await logQL3(runId, "error", `runUnit failure: ${msg}`);
  }
}

// QL3-P1: guard Deno.serve so unit tests can import this module without
// binding the default port (needed when tests also import ql3-batch-orchestrator).
if (import.meta.main) Deno.serve(async (req) => {
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
    await logQL3((run as any).id, "info", `kickoff tool=${toolSlug} assessment=${assessmentId} notes=${(body?.notes ?? "").toString().slice(0, 200)}`);
    // @ts-ignore
    EdgeRuntime.waitUntil(selfInvoke((run as any).id));
    return json({ run_id: (run as any).id, phase: "revise_dummy" }, 202);
  }

  return json({ error: "unknown_action", detail: action }, 400);
});
