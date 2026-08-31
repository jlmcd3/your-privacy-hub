// SYNC-MARKER: rubric-mirror v2 -- grade-single-assessment mirrors run-quality-batch rubric lines; edit both together
// grade-single-assessment — standalone, admin-gated one-off grader for a
// SINGLE cppa_assessments row (Doc W step 4f baseline for BELIEVED fixture,
// and future Doc R Cyber/ADMT believed fixtures).
//
// CONSTRAINTS (Doc W follow-on):
//  1. Admin-gated via has_role — never anon-invocable.
//  2. Read-only over the assessment. Never writes to cppa_assessments,
//     quality_loop2_baselines, quality_loop2_results, quality_loop2_runs,
//     tool_run_meter, or any product-baseline table.
//  3. Reuses the RUBRIC_GENERAL prompt VERBATIM from run-quality-batch,
//     but as an inline copy — run-quality-batch is NOT imported, edited,
//     or referenced. Its rubric checklist IDs, weights, and grader model
//     choices are duplicated read-only so drift would show up in code diff.
//  4. Writes only to quality_loop2_notes (kind: 'believed_fixture_baseline')
//     — never upserts the 'cppa-risk' product key or any legacy key.
//  5. Standalone invocation only — never wired into ql2-orchestrator
//     or run-stress-job.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
// QLB-F3 — shared grader payload builder (mirrors run-quality-batch).
import {
  buildGraderPayload,
  GRADER_PAYLOAD_BUDGET,
  familyForSingleTool,
} from "../_shared/grader/payload.ts";
// R-TURN-1 item 6 — resolve golden fixture-set label for gating header.
import { matchFixtureSet } from "../_shared/golden/registry.ts";
// GRADER-CAL-1 A2/A3/A4 — shared post-filter (mirror of run-quality-batch).
import { applyGraderCal1Filter } from "../_shared/grader/post-filters.ts";
// SKELETON-MODE CALIBRATION PARITY (2026-08-31) — this grader (used by
// /admin/all-products-test) previously applied NONE of run-quality-batch's
// CEO-ratified skeleton-mode calibration (PROMPT 10A's 6 false-positive
// filters, incl. the ITEM-204 cyber-cohort rule, and the evidence-backed
// dimension floor), so its scores diverged from /admin/so-final-test's
// scores for the SAME converted-document shape. See skeleton-calibration-mirror.ts
// for why this is a mirror rather than a direct import of run-quality-batch.
import {
  applySkeletonCalibration,
  applyEvidenceBackedDimensionFloor,
  hasSkeletonDocument,
  SKELETON_CAL_VERSION,
} from "../_shared/grader/skeleton-calibration-mirror.ts";

// GRADER-1 Task 1 — full intake JSON passed to the grader (mirrors
// run-quality-batch). Safety cap only for pathological payloads.
const INTAKE_HARD_CAP = 250_000;
function sliceIntakeForGrader(intake: unknown): string {
  const s = JSON.stringify(intake ?? {});
  if (s.length <= INTAKE_HARD_CAP) return s;
  return `${s.slice(0, INTAKE_HARD_CAP)}[...intake payload exceeded ${INTAKE_HARD_CAP} bytes; tail elided...]`;
}
// GRADER-1 Tasks 2/3 — shared authoritative context block (identical to
// run-quality-batch's grader system prompt).
import { SHARED_GRADER_CONTEXT } from "../_shared/grader/context.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// RC-D.9 ADDENDUM: BUILD_STAMP is the CEO's external-verification anchor.
// Value = git short-sha + ISO timestamp. Update in the same edit that
// changes behavior in this file.
// QL3-P1.2 (2026-07-15): generalized to all nine QL3 tools via `tool` param
// with `TOOL_TABLE` (mirrors ql3-orchestrator.TOOL_TABLE + run-quality-batch
// intake insert paths). Bumping the stamp invalidates the QL3 grade cache
// by design — cache misses re-grade, safe.
// QLB-F3 (2026-07-15): grader payload rebuild (body-first, metadata-strip,
// equal budget), spelling-neutral prompt preamble, and fill-in placeholder
// exemption mirrored verbatim with run-quality-batch.
export const BUILD_STAMP = "post-c1-fix-2-amend-clay-postcutoff-block@2026-07-23T18:45:00Z";
console.log(`[grade-single-assessment] boot ${BUILD_STAMP}`);
console.log(JSON.stringify({ evt: "grader_build_stamp", fn: "grade-single-assessment", build_stamp: BUILD_STAMP }));

// QL3 tool slug allow-list (mirrors ql3-orchestrator.TOOL_TABLE keys).
export const KNOWN_TOOL_SLUGS = [
  "governance", "cppa-risk", "cppa-cyber", "cppa-admt",
  "dpia", "lia", "ir-playbook", "biometric", "dpa",
] as const;
export type QL3Tool = typeof KNOWN_TOOL_SLUGS[number];

// ALL-PRODUCTS GRADING (2026-08-29) — the three session-shaped products
// (RoPA register, US notice suite, EU notice suite) have no single row with
// `intake_data` + `report_data`: their intake is spread across a session plus
// answer/selection child tables, and their output is either a persisted
// assembled register (ropa_sessions.register_document) or HTML files in a
// private storage bucket. They are graded here by the SAME Claude + GPT
// rubric as every other product; only the FETCH differs, which is what
// `fetchSessionShaped` below does. Nothing about the nine QL3 tools changes.
export const SESSION_TOOL_SLUGS = ["ropa", "us-notice", "eu-notice"] as const;
export type SessionTool = typeof SESSION_TOOL_SLUGS[number];

// ALL-PRODUCTS GRADING FIX (2026-08-29) — registration was the ONE dispatchable
// product this grader could not score ("grading skipped — no grader tool" on
// /admin/all-products-test). Its shape differs from both families above:
// run-registration-assessment writes status='completed' (not 'complete')
// synchronously and stores the customer report — including skeleton_document —
// in `result_summary`, not `report_data` (mirrors run-quality-batch's own
// registration_assessments fold at its poll path). Graded here through the
// same Claude + GPT rubric with the whole-report JSON payload fallback
// (familyForSingleTool returns null for it, by design).
export const REGISTRATION_TOOL_SLUG = "registration" as const;
export type GradedTool = QL3Tool | SessionTool | typeof REGISTRATION_TOOL_SLUG;


// Per-tool row shape for grader intake+report fetch.
//   * `table` mirrors ql3-orchestrator/index.ts:123-133 TOOL_TABLE.
//   * `intakeCols` mirrors run-quality-batch/index.ts intake-insert paths
//     (lines ~1083-1149 / 1221-1285): all tools carry a JSONB `intake_data`
//     column EXCEPT `lia`, whose intake is spread across explicit columns
//     on `li_assessments` (row inserted via `{ ...cleaned, user_id }`).
//   * `reportCol` is `report_data` for all nine (verified against
//     information_schema on 2026-07-15).
// QLB-F3: `bodyCol` names an optional secondary text column that holds
// the substantive document body when it does NOT live inside report_data
// (ir_playbooks.playbook_text; dpa_documents.document_text;
// biometric_assessments.analysis_text). The handler fetches it alongside
// report_data and folds it into the grader payload as a top-level key.
type ToolRowSpec = { table: string; intakeCols: string[]; reportCol: "report_data"; bodyCol?: string; bodyKey?: string };
const LI_INTAKE_COLS = [
  "organization_name", "sector", "jurisdictions", "relationship_type",
  "data_categories", "stated_purpose", "processing_description",
  "purpose_details", "necessity_details", "balancing_details",
  "alternatives_considered", "supplemental_context", "supplemental_responses",
  "subject_anchor", "preview_signal",
];
export const TOOL_TABLE: Record<QL3Tool, ToolRowSpec> = {
  "governance":  { table: "governance_assessments", intakeCols: ["intake_data"], reportCol: "report_data" },
  "cppa-risk":   { table: "cppa_assessments",       intakeCols: ["intake_data"], reportCol: "report_data" },
  "cppa-cyber":  { table: "cppa_assessments",       intakeCols: ["intake_data"], reportCol: "report_data" },
  "cppa-admt":   { table: "cppa_assessments",       intakeCols: ["intake_data"], reportCol: "report_data" },
  "dpia":        { table: "dpia_frameworks",        intakeCols: ["intake_data"], reportCol: "report_data" },
  "lia":         { table: "li_assessments",         intakeCols: LI_INTAKE_COLS,  reportCol: "report_data" },
  "ir-playbook": { table: "ir_playbooks",           intakeCols: ["intake_data"], reportCol: "report_data", bodyCol: "playbook_text",  bodyKey: "playbook_text" },
  "biometric":   { table: "biometric_assessments",  intakeCols: ["intake_data"], reportCol: "report_data", bodyCol: "analysis_text",  bodyKey: "assessment_text" },
  "dpa":         { table: "dpa_documents",          intakeCols: ["intake_data"], reportCol: "report_data", bodyCol: "document_text",  bodyKey: "document_text" },
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

// ---- BEGIN verbatim copy from run-quality-batch (RUBRIC_GENERAL + prompt) ----
// Kept in sync manually. Do NOT mutate here — this is a read-only mirror so
// run-quality-batch's rubric stays the single source of truth for the loop.
type RubricCheck = { id: string; dimension: string; severity: string; description: string };
const RUBRIC_GENERAL: RubricCheck[] = [
  { id: "rubric_generic_boilerplate",       dimension: "analysis",      severity: "medium",
    description: "Reasoning is generic boilerplate that could apply to any company; not tailored to THIS intake's facts." },
  { id: "rubric_unsupported_business_claim", dimension: "hallucination", severity: "high",
    description: "Document asserts facts about the business that are not in the intake (invented users, revenue, jurisdictions, etc.)." },
  { id: "rubric_actionability",             dimension: "intelligence",  severity: "medium",
    description: "Recommendations are not actionable for a real compliance professional (vague, no owner, no trigger)." },
  { id: "rubric_internal_reasoning_leak",   dimension: "hallucination", severity: "high",
    description: "Internal AI reasoning/meta-commentary visible in customer-facing text (\"as an AI\", \"based on the provided\", \"my analysis\"). Scored under hallucination per GRADER-CAL-1 A1. NEVER fires on \"NOTE FOR LEGAL REVIEW — <topic>\" blocks (designed counsel-voice product output, not model self-narration)." },
  { id: "rubric_citation_misapplied",       dimension: "citation",      severity: "high",
    description: "A real cited section is applied to the wrong proposition (right citation, wrong claim)." },
];
function rubricChecklistText(checks: RubricCheck[]): string {
  return checks.map(c => `- id: "${c.id}"  [${c.dimension}/${c.severity}] — ${c.description}`).join("\n");
}
function buildRubricSystemPrompt(role: "claude" | "gpt"): string {
  const checks = RUBRIC_GENERAL;
  return `You are a quality assurance reviewer (${role.toUpperCase()}) for an AI-generated legal compliance document platform.

Evaluate the document against the FIXED checklist below. Score each dimension 0–100.

DIMENSIONS:
1. accuracy       — Legal conclusions correct for the intake facts.
2. citation       — Cited sections are real, correctly numbered, and correctly applied.
3. hallucination  — HIGHER = LESS hallucination. No invented facts or non-existent regulations.
4. analysis       — Reasoning is specific to THIS intake, not generic boilerplate.
5. intelligence   — Output is actionable for a real compliance professional.
6. formatting     — Clean output; no AI meta-commentary.

CORPUS-VERIFIED RECENT AMENDMENTS (do not deduct for these): the platform's legal corpus is verified against official texts, including changes that may postdate your training knowledge. The following are CORRECT statements of current law; treat them as accurate, do not flag them for verification, and do not deduct from any dimension for asserting them: (1) Cal. Civ. Code § 1798.82, as amended by SB 446 (effective January 1, 2026): individual notice within 30 calendar days of discovery or notification per (a)(2)(A); for breaches affecting more than 500 California residents, a single sample copy to the California Attorney General within 15 calendar days of consumer notice per (f); both statutory delay allowances retained per (a)(2)(B). (2) CCPA post-CPRA subsection lettering in Cal. Civ. Code § 1798.140: 'service provider' is defined at subsection (ag), not the pre-2020 (v) lettering. (3) UK GDPR Article 6(11), inserted by the Data (Use and Access) Act 2025 (recognised-legitimate-interests examples: direct marketing, intra-group transmission for internal administrative purposes, network and information security). This list is exhaustive: it does not license any OTHER uncited or unverifiable legal claim, and all normal citation and hallucination scrutiny continues to apply to everything else.

SPELLING NEUTRALITY (CEO Ruling R-15C-1 revised, QLB-F3): US and British spelling differences are NEVER a deduction under ANY dimension. Ignore spelling variety entirely — do not flag "organisation" vs "organization", "recognise" vs "recognize", "behaviour" vs "behavior", or any other locale variant. House-style locale is enforced by the Product Prompts, not by this grading rubric.

BRACKETED FILL-IN MARKERS (CEO Ruling R-15C-2, QLB-F3): bracketed fill-in placeholders — including "[TO BE COMPLETED …]", "[TO BE COMPLETED: <detail>]", "[TO COMPLETE — <detail>]", "[TO BE ASSESSED]", and equivalent square-bracketed forms — are MANDATED anti-fabrication placeholders emitted per the Product Prompt's Priority 1 fact-discipline rule. Their presence is NEVER a deduction under ANY rubric check (not an internal-reasoning leak, not incompleteness, not lack of actionability, not boilerplate, not any other dimension). Grade the substance PRESENT in the document; deferral density is policed by product lint, not by this rubric.

${SHARED_GRADER_CONTEXT}

CHECKLIST (evaluate ONLY these; use the EXACT id given; do not add, rename, or omit):
${rubricChecklistText(checks)}

Return ONLY valid JSON of this exact shape:
{
  "dimension_scores": { "accuracy": 0-100, "citation": 0-100, "hallucination": 0-100, "analysis": 0-100, "intelligence": 0-100, "formatting": 0-100 },
  "overall_score": 0-100,
  "findings": [
    { "check_id": "<EXACT id from the checklist above>", "dimension": "...", "severity": "...", "passed": true|false, "evidence": "quoted text or null" }
  ],
  "strengths": ["..."],
  "critical_failures": ["..."]
}`;
}
// Weights mirror weightsFor(tool) from run-quality-batch/index.ts:154-158.
// run-quality-batch is untouchable per QL3-P1 and does not export weightsFor,
// so we mirror it as a local read-only helper. All nine QL3 slugs are
// non-editorial (EDITORIAL_TOOLS at run-quality-batch:150-152), so the
// weights are identical across the nine — but we still parameterize by
// tool so any future editorial reclassification propagates via a code
// re-mirror rather than a silent divergence.
// GRADER-CAL-1 A1 — formatting weight zeroed; the 5pp rolls into hallucination
// so leaks (now scored under hallucination) exert stronger overall pull.
const NON_EDITORIAL_WEIGHTS = { accuracy: 0.30, citation: 0.25, hallucination: 0.25, analysis: 0.15, intelligence: 0.05, formatting: 0 };
function weightsFor(_tool: GradedTool) {
  return NON_EDITORIAL_WEIGHTS;
}
// ---- END verbatim copy ----

async function claudeCall(system: string, user: string, maxTokens = 5000): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-opus-4-6", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.content?.[0]?.text ?? "";
}

async function gptCall(system: string, user: string, maxTokens = 3000): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o", max_tokens: maxTokens, response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`GPT ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

function tryParse(s: string): any { try { return JSON.parse(s); } catch { const m = s.match(/\{[\s\S]*\}/); return m ? (() => { try { return JSON.parse(m[0]); } catch { return null; } })() : null; } }

function computeOverall(scores: any, tool: GradedTool): number {
  const w = weightsFor(tool);
  return Math.round(
    (scores.accuracy ?? 60) * w.accuracy +
    (scores.citation ?? 60) * w.citation +
    (scores.hallucination ?? 60) * w.hallucination +
    (scores.analysis ?? 60) * w.analysis +
    (scores.intelligence ?? 60) * w.intelligence +
    (scores.formatting ?? 60) * w.formatting
  );
}

async function gradeOne(role: "claude" | "gpt", tool: GradedTool, intake: any, report: any) {
  const sys = buildRubricSystemPrompt(role);
  // QLB-F3: body-first, metadata-stripped, equal budget across models.
  const family = familyForSingleTool(tool as QL3Tool);
  const payload = family
    ? buildGraderPayload(family, report, GRADER_PAYLOAD_BUDGET, { fixtureSet: matchFixtureSet(tool as QL3Tool, intake) })
    : { text: JSON.stringify(report ?? {}).slice(0, GRADER_PAYLOAD_BUDGET), truncated: false, original_length: 0 };
  if (payload.truncated) {
    console.warn(`[grade-single-assessment] payload_truncated tool=${tool} role=${role} original_length=${payload.original_length} budget=${GRADER_PAYLOAD_BUDGET}`);
  }
  const user = `TOOL: ${tool}\nINTAKE: ${sliceIntakeForGrader(intake)}\nREPORT:\n${payload.text}\nEvaluate this report. Quote actual text as evidence for each finding.`;
  const raw = role === "claude" ? await claudeCall(sys, user) : await gptCall(sys, user);
  const parsed = tryParse(raw);
  if (!parsed?.dimension_scores) throw new Error(`${role} returned no dimension_scores`);
  const { kept, dropped } = applyGraderCal1Filter((parsed.findings ?? []) as any);
  if (dropped.a2 || dropped.a3 || dropped.a4) {
    console.log(`[GRADER-CAL-1][${role}] tool=${tool} dropped a2=${dropped.a2} a3=${dropped.a3} a4=${dropped.a4}`);
  }

  // SKELETON-MODE CALIBRATION PARITY — same gate + order as run-quality-batch:
  // PROMPT 10A false-positive filter first, then the evidence-backed dimension
  // floor (which needs the POST-calibration finding list so a filtered-out
  // finding can't itself supply the "support" that keeps a low score honest).
  const useSkeleton = hasSkeletonDocument(report);
  const skelCal = useSkeleton
    ? applySkeletonCalibration(kept as any, { report })
    : { kept: kept as any[], filtered: [] as any[], counts: null as any };
  if (skelCal.filtered.length) {
    console.log(`[SKELETON-CAL][${role}] tool=${tool} version=${SKELETON_CAL_VERSION} filtered=${skelCal.filtered.map((c: any) => c.rule).join(",")}`);
  }

  const scores = { ...parsed.dimension_scores };
  const dimFloor = useSkeleton
    ? applyEvidenceBackedDimensionFloor(scores, skelCal.kept as any)
    : { floored: [] as string[] };
  if (dimFloor.floored.length) {
    console.log(`[SKELETON-CAL][${role}] tool=${tool} evidence_floor raised=${dimFloor.floored.join(",")}`);
  }

  const overall = computeOverall(scores, tool);
  return { dimension_scores: scores, overall_score: overall, findings: skelCal.kept, strengths: parsed.strengths ?? [], critical_failures: parsed.critical_failures ?? [] };
}

function isKnownTool(x: unknown): x is QL3Tool {
  return typeof x === "string" && (KNOWN_TOOL_SLUGS as readonly string[]).includes(x);
}
function isSessionTool(x: unknown): x is SessionTool {
  return typeof x === "string" && (SESSION_TOOL_SLUGS as readonly string[]).includes(x);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * ALL-PRODUCTS GRADING — fetch intake + report for the session-shaped
 * products. Returns null when the run cannot be graded yet (not generated).
 */
async function fetchSessionShaped(
  // deno-lint-ignore no-explicit-any
  admin: any,
  tool: SessionTool,
  id: string,
): Promise<{ id: string; intake: unknown; report: unknown } | { error: string; status: number }> {
  if (tool === "ropa") {
    // Callers may pass the session id OR a document-version id.
    let sessionId = id;
    let { data: session } = await admin
      .from("ropa_sessions")
      .select("id, status, org_name, client_id, register_document")
      .eq("id", id)
      .maybeSingle();
    if (!session) {
      const { data: ver } = await admin
        .from("ropa_document_versions")
        .select("session_id")
        .eq("id", id)
        .maybeSingle();
      if (!ver) return { error: "assessment_not_found", status: 404 };
      sessionId = (ver as Record<string, unknown>).session_id as string;
      const res = await admin
        .from("ropa_sessions")
        .select("id, status, org_name, client_id, register_document")
        .eq("id", sessionId)
        .maybeSingle();
      session = res.data;
    }
    if (!session) return { error: "assessment_not_found", status: 404 };
    const s = session as Record<string, unknown>;
    if (!s.register_document) return { error: "assessment_not_generated", status: 400 };
    const [{ data: profile }, { data: activities }, { data: answers }, { data: jur }] = await Promise.all([
      admin.from("ropa_client_profiles").select("*").eq("client_id", s.client_id as string).maybeSingle(),
      admin.from("ropa_processing_activities").select("id, display_name, category, template_key").eq("session_id", s.id as string),
      admin.from("ropa_answers").select("activity_id, question_key, answer_value").eq("session_id", s.id as string),
      admin.from("ropa_jurisdiction_selections").select("jurisdiction_code").eq("session_id", s.id as string),
    ]);
    return {
      id: s.id as string,
      intake: { org_name: s.org_name, profile, jurisdictions: jur, activities, answers },
      report: s.register_document,
    };
  }

  // US / EU notice: intake from session + answers + selections; report text
  // is the generated HTML pulled back out of the private bucket.
  const sessionTable = tool === "us-notice" ? "us_notice_sessions" : "eu_notice_sessions";
  const answersTable = tool === "us-notice" ? "us_notice_answers" : "eu_notice_answers";
  const docsTable = tool === "us-notice" ? "us_notice_documents" : "eu_notice_documents";
  const selTable = tool === "us-notice" ? "us_notice_state_selections" : "eu_notice_framework_selections";
  const bucket = tool === "us-notice" ? "us-notices" : "eu-notices";

  const { data: session } = await admin.from(sessionTable).select("*").eq("id", id).maybeSingle();
  if (!session) return { error: "assessment_not_found", status: 404 };
  const [{ data: answers }, { data: selections }, { data: docs }] = await Promise.all([
    admin.from(answersTable).select("question_key, answer_value").eq("session_id", id),
    admin.from(selTable).select("*").eq("session_id", id),
    admin.from(docsTable).select("file_path, document_format, is_combined, is_current").eq("session_id", id).eq("is_current", true),
  ]);
  const docRows = (docs ?? []) as Array<Record<string, unknown>>;
  if (docRows.length === 0) return { error: "assessment_not_generated", status: 400 };
  // Prefer the combined suite document; fall back to every current document.
  const chosen = docRows.filter((d) => d.is_combined) .length > 0
    ? docRows.filter((d) => d.is_combined)
    : docRows;
  const parts: string[] = [];
  for (const d of chosen) {
    const { data: file } = await admin.storage.from(bucket).download(d.file_path as string);
    if (!file) continue;
    parts.push(stripHtml(await file.text()));
  }
  if (parts.length === 0) return { error: "assessment_not_generated", status: 400 };
  return {
    id,
    intake: { session, answers, selections },
    report: { document_text: parts.join("\n\n---\n\n") },
  };
}


const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "missing_authorization" }, 401);
  const token = authHeader.slice(7).trim();

  // RC-D.1 D-2: internal SR caller acceptance (enumerated: grade-only).
  // ql3-orchestrator and other internal harnesses call with SR bearer +
  // x-internal-resume:1. No admin JWT required; read-only over the assessment.
  const isInternalSR = req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY;

  let userId: string | null = null;
  if (!isInternalSR) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid_jwt" }, 401);
    userId = userData.user.id;
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "admin_only" }, 403);
  }

  let body: { assessment_id?: string; fixture_label?: string; dry_run?: boolean; tool?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  if (!body.assessment_id) return json({ error: "missing_assessment_id" }, 400);

  // QL3-P1.2: `tool` is optional; DEFAULT "cppa-risk" so existing callers
  // (ql3-orchestrator.callInternalGrader, admin one-off Doc W baseline)
  // stay unchanged. Unknown slug → 400 unknown_tool.
  const toolRaw = body.tool ?? "cppa-risk";
  if (!isKnownTool(toolRaw) && !isSessionTool(toolRaw) && toolRaw !== REGISTRATION_TOOL_SLUG) {
    return json({
      error: "unknown_tool",
      detail: `known: ${[...KNOWN_TOOL_SLUGS, ...SESSION_TOOL_SLUGS, REGISTRATION_TOOL_SLUG].join(",")}`,
    }, 400);
  }
  const tool: GradedTool = toolRaw as GradedTool;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let gradedId: unknown;
  let intake: unknown;
  let report: unknown;

  if (tool === REGISTRATION_TOOL_SLUG) {
    const { data: row, error: selErr } = await admin
      .from("registration_assessments")
      .select("id, status, intake_data, result_summary")
      .eq("id", body.assessment_id)
      .maybeSingle();
    if (selErr) return json({ error: selErr.message }, 500);
    if (!row) return json({ error: "assessment_not_found" }, 404);
    const r = row as unknown as Record<string, unknown>;
    const status = String(r.status ?? "");
    if (status !== "completed" && status !== "complete") {
      return json({ error: "assessment_not_generated" }, 400);
    }
    if (!r.result_summary) return json({ error: "assessment_not_generated" }, 400);
    gradedId = r.id;
    intake = r.intake_data ?? {};
    report = r.result_summary;
  } else if (isSessionTool(tool)) {
    const fetched = await fetchSessionShaped(admin, tool, body.assessment_id);
    if ("error" in fetched) return json({ error: fetched.error }, fetched.status);
    gradedId = fetched.id;
    intake = fetched.intake;
    report = fetched.report;
  } else {
    const spec = TOOL_TABLE[tool];
    // Row fetch by id is unambiguous — no module filter needed for
    // cppa_assessments (id is table PK).
    // QLB-F3: also fetch the body-text column (playbook_text /
    // document_text / analysis_text) when the spec declares one, and fold
    // it into `report` as `bodyKey` so the grader payload leads with body.
    const cols = ["id", "status", spec.reportCol, ...spec.intakeCols];
    if (spec.bodyCol) cols.push(spec.bodyCol);
    const selectCols = cols.join(", ");
    const { data: row, error: selErr } = await admin
      .from(spec.table)
      .select(selectCols)
      .eq("id", body.assessment_id)
      .maybeSingle();
    if (selErr) return json({ error: selErr.message }, 500);
    if (!row) return json({ error: "assessment_not_found" }, 404);
    const rowAny = row as unknown as Record<string, unknown>;
    if (!rowAny[spec.reportCol]) return json({ error: "assessment_not_generated" }, 400);

    // Assemble intake from the per-tool columns. Single JSONB column → pass
    // through; multi-column (LIA) → object with those column values.
    gradedId = rowAny.id;
    intake = spec.intakeCols.length === 1
      ? rowAny[spec.intakeCols[0]]
      : Object.fromEntries(spec.intakeCols.map((c) => [c, rowAny[c]]));
    report = rowAny[spec.reportCol];
    if (spec.bodyCol && spec.bodyKey) {
      const rd = (report && typeof report === "object") ? { ...(report as Record<string, unknown>) } : {};
      (rd as Record<string, unknown>)[spec.bodyKey] = rowAny[spec.bodyCol] ?? "";
      report = rd;
    }
  }


  let claudeRes: any = null, claudeErr: string | null = null;
  let gptRes: any = null, gptErr: string | null = null;
  try { claudeRes = await gradeOne("claude", tool, intake, report); }
  catch (e) { claudeErr = (e as Error).message; }
  try { gptRes = await gradeOne("gpt", tool, intake, report); }
  catch (e) { gptErr = (e as Error).message; }

  const payload = {
    assessment_id: gradedId,
    fixture_label: body.fixture_label ?? "believed_fixture",
    graded_at: new Date().toISOString(),
    graded_by: userId,
    tool,
    claude: claudeRes ? { overall_score: claudeRes.overall_score, dimension_scores: claudeRes.dimension_scores, findings_count: claudeRes.findings.length, critical_failures: claudeRes.critical_failures } : { error: claudeErr },
    gpt: gptRes ? { overall_score: gptRes.overall_score, dimension_scores: gptRes.dimension_scores, findings_count: gptRes.findings.length, critical_failures: gptRes.critical_failures } : { error: gptErr },
    note: "One-off grader (grade-single-assessment). NOT a product baseline. Never used by ql2-orchestrator or run-stress-job.",
  };

  // RC-D.1 D-2: expose mean_score at top level so internal callers
  // (ql3-orchestrator) can capture pre/post_score without parsing sub-objects.
  const scoreParts: number[] = [];
  if (claudeRes?.overall_score != null) scoreParts.push(Number(claudeRes.overall_score));
  if (gptRes?.overall_score != null) scoreParts.push(Number(gptRes.overall_score));
  const mean_score = scoreParts.length > 0
    ? Math.round((scoreParts.reduce((a, b) => a + b, 0) / scoreParts.length) * 100) / 100
    : null;

  let stored_note_id: string | null = null;
  // Internal SR callers default to dry_run (no product-baseline pollution).
  const shouldWrite = !body.dry_run && !isInternalSR;
  if (shouldWrite) {
    // Constraint 4: only quality_loop2_notes, distinctly keyed.
    const { data: noteRow, error: noteErr } = await admin
      .from("quality_loop2_notes")
      .insert({ kind: "believed_fixture_baseline", note: JSON.stringify(payload) })
      .select("id")
      .single();
    if (noteErr) return json({ error: `note_insert_failed: ${noteErr.message}`, payload }, 500);
    stored_note_id = noteRow?.id ?? null;
  }

  return json({ ok: true, mean_score, stored_note_id, payload });
};

// QL3-P1.2: expose handler for tests; only bind Deno.serve when run as
// the entrypoint (mirrors ql3-orchestrator/ql3-batch-orchestrator).
export { handler };
if (import.meta.main) Deno.serve(handler);
