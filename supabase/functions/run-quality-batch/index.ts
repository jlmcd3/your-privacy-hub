// SYNC-MARKER: rubric-mirror v2 -- grade-single-assessment mirrors run-quality-batch rubric lines; edit both together
// run-quality-batch — orchestrates one "Run N Tests" press.
// Pipeline: generate intakes → build docs → Claude eval → GPT eval →
//           cross-review → aggregate → propose fixes.
// Returns 202 immediately. All work in EdgeRuntime.waitUntil().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// RC-D.10: BUILD_STAMP = git short-sha + ISO. Update on any behavior edit.
// Value = git short-sha of the commit being deployed + ISO timestamp.
// MUST be updated in the same edit that changes behavior in this file.
export const BUILD_STAMP = "chunk-safe-intakes@prompt8g-2026-08-12";

// QLB-F3 — shared grader payload builder (body-first, metadata-stripped,
// equal budget across Claude+GPT).
import {
  buildGraderPayload,
  GRADER_PAYLOAD_BUDGET,
  familyForBatchTool,
} from "../_shared/grader/payload.ts";
// SO-FINAL-TEST — ADDITIVE skeleton-document grader path. Used only when the
// run row carries grader_mode="skeleton" (the /admin/SO-final-test console).
// Legacy runs (grader_mode NULL) never touch this import's code paths.
import {
  buildSkeletonGraderPayload,
  hasSkeletonDocument,
  SKELETON_GRADER_BUDGET,
  SKELETON_BLOCK_KIND_ADDENDUM,
} from "./_local/grader/skeleton-payload.ts";
// R-TURN-1 item 6 — resolve golden fixture-set label for gating header.
import { matchFixtureSet } from "../_shared/golden/registry.ts";
import { CONTRACT_BY_TOOL } from "./_local/intake-contracts/registry.ts";
// ITEM 325 — fixture-variant (Perfect/Messy) plumbing.
import type { FixtureVariant } from "../_shared/quality/fixture-variant.ts";
// GRADER-1 Tasks 2/3 — shared authoritative context block injected into
// BOTH grader system prompts (Claude rubric + GPT cross-review).
import { SHARED_GRADER_CONTEXT, GRADER_CONTEXT_VERSION } from "../_shared/grader/context.ts";
// GRADER-CAL-1 A2/A3/A4 — shared post-filter over LLM findings.
import { applyGraderCal1Filter } from "../_shared/grader/post-filters.ts";
// PROMPT 10A — skeleton-mode grader calibration (CEO-approved 2026-08-12).
// Applied ONLY when graderMode === "skeleton"; freeform grading is untouched.
import { applySkeletonCalibration, SKELETON_CAL_VERSION } from "./_local/grader/skeleton-calibration.shared.ts";
// CV1-R2 T4c — counsel-voice auto-regen trigger predicate.
import { isCounselVoiceRegenEligible, resolveEvalSourceRef } from "./_local/grader/counsel-voice-regen.ts";
import { readAdmtScope } from "../_shared/admt-scope-contract.ts";
// GRADER-1 Task 4 — per-field evaluator for qc_r1_1.
import {
  collectRationaleEntries,
  evaluateResolvedHedgePerField,
} from "./_local/grader/qc-r1-per-field.ts";

// R1d: shared TEST-STATES computations, imported for the QC-R1 deterministic
// checks. Same module the cppa-risk and cppa-cyber generators re-export from,
// so the checks are guaranteed to be measuring the identical state machine
// (no semantic drift between generator and grader).
import {
  computeTestStates as computeRiskTestStates,
  computeCyberTestStates,
  classifyRevenueBand,
  type FiveStageIntake,
} from "../_shared/cppa-test-states.ts";
// R1e (2026-07-11): the QC-R1 checks now feed the identical
// normaliseIntake -> computeTestStates pipeline the generator itself runs,
// closing the raw-vs-normalised defect that made QC-R1-4 false-fail on
// 5-stage-shaped fixtures and hid vacuous passes on QC-R1-1/-2/-3.
import { resolveIntakeForTestStates } from "../_shared/cppa-risk-normalise.ts";
// RC-C1 C1.5 — revision contract QC checks.
import { qcContractMonotonicity, qcVerdictConsistency, CONTRACT_ENABLED_TOOLS } from "../_shared/revision-qc.ts";
import { CPPA_RISK_CONTRACT_FIXTURES } from "../_shared/cppa-risk-contract-fixtures.ts";
import { GOVERNANCE_CONTRACT_FIXTURES } from "../_shared/governance-contract-fixtures.ts";
import { CYBER_CONTRACT_FIXTURES } from "../_shared/cyber-contract-fixtures.ts";
import { ADMT_CONTRACT_FIXTURES } from "../_shared/admt-contract-fixtures.ts";
// RC-REM-P2 — contract-driven intake generation + validation.
import type { IntakeContract } from "../_shared/intake-contracts/types.ts";
import { validateIntake as validateAgainstContract } from "../_shared/intake-contracts/validate.ts";
import { renderContractPrompt } from "./_local/intake-contracts/render.ts";
import { cppaAdmtContract } from "../_shared/intake-contracts/cppa-admt.ts";
// QB-P22 item 2 — shared IR TEST-STATES/DEADLINES enrichment (matches
// generate-ir-playbook so the grader sees the same enriched payload).
import {
  renderIrTestStatesBlock as _ir_renderIrTestStatesBlock,
  type IrBody as _IrBodyForGrader,
} from "../_shared/ir/test-states.ts";
import { cppaRiskContract } from "../_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "../_shared/intake-contracts/cppa-cybersecurity.ts";
import { governanceContract } from "../_shared/intake-contracts/governance-assessment.ts";
import { dpiaFrameworkContract } from "../_shared/intake-contracts/dpia-framework.ts";
import { liAssessmentStageBContract } from "../_shared/intake-contracts/li-assessment.ts";
import { dpaGeneratorContract } from "../_shared/intake-contracts/dpa-generator.ts";
import { irPlaybookContract } from "../_shared/intake-contracts/ir-playbook.ts";
import { biometricCheckerContract } from "./_local/intake-contracts/biometric-checker.ts";
import { DEFAULT_GENERATION_MODEL, currentGenerationModel, withGenerationModel, resolveGenerationModel, generationTimeoutMs } from "../_shared/generation-model.ts"; // MODEL A/B HARNESS dispatch 1

// Tool-key → contract. The QL2 tool key is what generateIntakes receives
// (e.g. "cppa-cyber"), not the contract's tool_type. Contract coverage set
// is Phase-1's nine census tools. Non-contract tools (ask-privacy,
// weekly-brief, custom-brief, trend-report, state-law, registration) fall
// through to their existing hand-typed descriptions in generateIntakes.
// ITEM 325 — CONTRACT_BY_TOOL now lives in _shared/intake-contracts/registry.ts
// so the CI fixture-contract matrix can import it without booting this
// function. The map content is unchanged.

// Per-tool scenario coaching. This is PROMPT COLOR — mixes of sector,
// posture, jurisdiction — kept OUT of the contract itself (which is schema
// only). Verbatim-lifted from the pre-P2 hand-typed descriptions so no
// coverage-matrix guidance is lost.
const SCENARIO_GUIDANCE: Record<string, string> = {
  "cppa-admt": `Include a mix: 2 advertising/adtech (NOT significant decisions), 2 gaming (NOT significant decisions), 2 HR/employment (significant decisions), 2 fintech credit scoring (significant decisions), 1 healthcare AI (significant decision), 1 recommendation engine (NOT significant decision).
QB-P5 Item 2 — third_party_admt and admt_system_count are free-text prose in the live form (verified against src/pages/admt/ADMTChecker.tsx). Populate them as short prose using the historically expected shapes: third_party_admt as one of "Yes", "No", or "Unsure" (optionally with a one-sentence gloss); admt_system_count as a count range string like "1", "2-5", "6-20", or ">20" (optionally with a one-sentence gloss). Do NOT emit multi-paragraph narratives.
QB-P6 — system_description must name the system, its inputs, its decision flow, and any vendor models.`,
  "cppa-risk": `Vary the scenarios: AdTech (multi-trigger, contested transient_use exception), Healthcare SaaS (sensitive PI, well-documented security/debugging/research/legal exceptions), HR/employment-context-only (single employment_context exception), FinTech credit scoring (profiling_significant_effects + ADMT + cybersecurity gaps), small retailer below thresholds (mostly false triggers — should result in voluntary review), and a high-risk profiling/minors scenario (children_in_scope=true). Mix posture: some weak/undocumented exception claims, some clear gaps, some well-controlled.
QB-P6 — each activity_details purpose_description must be specific to the named activity; org_context must name the privacy officer role.`,
  "cppa-cyber": `Vary posture: some fully at the top maturity level, some with clusters of low maturity in specific domains (e.g. training and incident weak; access controls strong), some with several controls left blank (intake gaps), and vary framework across the profile.framework options. Include both under-threshold small businesses and clearly-covered enterprises.
QB-P5 Item 1 — Every intake MUST contain exactly 18 controls entries — one per canonical slug, each slug used exactly once. The 18 canonical slugs are: c1_auth, c2_encryption, c3_account_access, c4_inventory, c5_secure_config, c6_vuln_mgmt, c7_audit_logs, c8_network_mon, c9_anti_malware, c10_segmentation, c11_port_protocol, c12_awareness, c13_training, c14_secure_dev, c15_third_party, c16_retention, c17_incident, c18_continuity. Never invent alternative slugs (no c14_third_party, no c16_training — legacy/typo aliases; no free-form keys like asset_inventory, mfa).
QB-P6 — every controls[].notes must cite concrete evidence — tool names, cadence, coverage figures.`,
  "governance": `Vary sectors (Healthcare, FinTech, HR/Employment, AdTech, SaaS, Retail) and posture — some mature programmes, some with concentrated gaps (no DPO + no DPIA + weak DPA), some EU-only, some US-multi-state, some mixed EU/UK/US.
QB-P6 — additional_context (when present) and narrative fields must name tools, owners, and dates.
QB-P22 item 3 — Each tools[] entry names exactly ONE product — never slash-alternatives like "Otter.ai / Fireflies", never "X or Y". Ambiguous slash-alternatives get treated by the downstream generator as two vendors and produce vendor-count hallucinations.`,
  "dpia": `Vary sectors (Healthcare, FinTech, HR/Employment, AdTech, EdTech, Retail) and posture — some with mature Art.35 documentation, some with material gaps (missing DPO, no data_subjects_views_sought, weak necessity_proportionality), some with third-country transfers lacking a mechanism. Include EU/UK on at least half of scenarios to exercise the GDPR path.
QB-P6 — narrative fields must name tools, owners, and dates.
8F/8H — populate the sign-off block (dpia_prepared_by, dpia_approved_by_name, dpia_approved_by_title, dpia_approval_date, dpia_signoff_basis) on MOST scenarios; leave it blank on a minority to exercise the no-approver branch. Give roughly half the scenarios intra-EEA/intra-UK-only transfer flows and the other half at least one genuine third-country destination outside the origin regime, so the third-country risk trigger is exercised both ways. residual_risks is the company's own residual-risk account in its own words and may cite article numbers.
9M — PERFECT-VARIANT CARVE-OUT (CEO-ruled 2026-08-17, superseding the 8K parked note): a perfect scenario must NEVER combine legal_basis_proposed "Legitimate interests" with special-category data_categories (health, biometric, genetic, racial/ethnic origin, political opinions, religious beliefs, trade-union membership, sex life/sexual orientation, criminal convictions). Under the 9M ruling such a record is conditionally approved WITH a gap-ledger entry BY DESIGN — the Art. 9 carve requires a separate Art. 9(2) condition that a 6(1)(f) record does not supply — so it can never be closed-loop perfect. Such a scenario is rejected by the closed-loop lint.
9M — PERFECT-VARIANT CARVE-OUT, CHILDREN: a perfect scenario must also never combine legal_basis_proposed "Legitimate interests" with "Children's data" in data_categories. The 9M children's gate requires a creditable dedicated-LIA statement addressing children specifically, and perfect-variant conservatism keeps the combination out of generated perfect data; the gate's own coverage lives in the inline test fixtures.
9M — MESSY VARIANT, EXPLICITLY PERMITTED: both combinations above ARE welcome on the messy variant, and the generator is encouraged to include them. "Legitimate interests" + special-category data, and "Legitimate interests" + children's data, are exactly what the messy variant is for: they exercise the 9M ruling branches (the Art. 9 carve sentences, the children's gate, and the asks each raises) in production documents. Neither carve-out applies to messy scenarios.
8K — CLOSED-LOOP PERFECT: on the perfect variant an intake is accepted only if the product's own deliverables builder finds nothing missing — empty gap ledger, no record_insufficient finding, no undetermined remaining-risk band, and a complete sign-off block (approver name, title, date, basis).
9C — PERFECT VARIANT, SECONDARY-OPERATION RULES (mechanical; the lint enforces them exactly as written). Exactly one of these two must hold:
RULE A — secondary_uses is a clean negation: one of "None", "No secondary uses", "Not applicable" and nothing else.
RULE B — secondary_uses names a secondary use, AND the intake supplies ALL THREE of:
  (b1) an entry in alternatives_considered whose processing_operation is BYTE-EQUAL to "<processing_activity_name> — secondary use" (em dash U+2014, single spaces), with a non-empty rejection_reason;
  (b2) an Art. 6(1) legal-basis statement for that secondary operation, naming the sub-paragraph, stated separately from the primary operation's basis;
  (b3) an impact statement for that secondary operation describing the effect ON DATA SUBJECTS, textually distinct from any benefit statement (a benefit restated is a violation).
9C — TRANSFER FLOWS on the perfect variant: every transfer_flows item is an object with non-empty destination_country, recipient, and transfer_mechanism; a certification claim uses dpf_certified / uk_extension_certified booleans.
9F — PERFECT-VARIANT TRANSFER RULES (mechanical; extends the 9C block). On the perfect variant every transfer_flows item must be FULLY RESOLVED — each flow satisfies EXACTLY ONE of:
  (a) domestic: destination_country GB/UK on a UK-regime record;
  (b) intra-EEA: an EEA destination_country on an EU-regime record;
  (c) an adequacy destination for the origin regime;
  (d) US with dpf_certified (EU origin) or uk_extension_certified (UK origin) set true as booleans;
  (e) a named Chapter V instrument (SCCs / Standard Contractual Clauses / IDTA / International Data Transfer Agreement / UK Addendum / BCRs) PLUS an execution date (executed / signed / countersigned / concluded on <date>) PLUS a completed transfer risk assessment (TRA / transfer impact assessment, stated as completed / on file / with a reference) in the transfer_mechanism text.
And: NO gap, uncertainty, re-papering, "not in place", "should be re-verified", or planned/future language anywhere in transfer_mechanism or notes on the perfect variant — an open transfer gap belongs to the messy variant, never the perfect one.`,

  "lia": `Vary sectors (Healthcare, FinTech, Logistics, Retail, AdTech, HR) and posture — some well-balanced, some weak safeguards, some questionable necessity.
QB-P6 — the three JSONB narrative blocks must name tools, owners, and dates.`,
  "dpa-generator": `Vary sectors (AdTech, Healthcare, FinTech, HR) and jurisdictions; include some intra-EU and some cross-border transfers. GRADER-1 T5: when the intake facts imply a Controller-to-Processor SCC arrangement (2021 EU SCCs, Commission Implementing Decision (EU) 2021/914), any free-text narrative in \`services\` or \`subProcessorList\` that references SCC modules MUST use "Module Two (Controller-to-Processor)" — NEVER "Modules 1 and 2" (Module 1 is Controller-to-Controller and is internally contradictory with a controller-to-processor arrangement). Module Three applies to Processor-to-(Sub-)Processor onward transfers; Module Four applies to Processor-to-Controller reverse flows. Do not conflate module numbers. FF-DPA nd4 — UK/EU ADEQUACY FACT (verified as of July 2026): The EU→UK adequacy decision (renewed 19 December 2025, valid to 27 December 2031) IS in force; the UK→EEA position is UK adequacy regulations under s.17A DPA 2018. Fixture intake narratives, services descriptions, and any free-text notes MUST NOT assert "post-Brexit adequacy does not apply", "no adequacy decision is in place between the EU and the UK", or characterise a UK-to-EEA transfer as requiring the UK IDTA. Cross-border EU↔UK fixtures should either omit adequacy commentary from the narrative or state the transfer is covered by the applicable adequacy instrument.
QB-P6 — services must be at least 2 sentences naming the platform, hosting region, and each sub-processor with its function.`,
  "ir-playbook": `Vary sectors (Healthcare, Retail, FinTech, EdTech) and severity. discoveryDateTime MUST be an ISO date-time within the 7 days before generation time — never a past-year date.`,
  "biometric-checker": `Vary across single-jurisdiction and multi-jurisdiction mixes (e.g. Illinois only; Texas + California; EU + UK). Vary compliance posture: include some with no written policy, some without informed consent, some with third-party sharing, some with undefined retention.
QB-P6 — purpose must name the deployment context and system.`,
};


// GRADER-1 Task 1 — Every rubric evaluation now receives the COMPLETE
// intake JSON. Prior behavior (8000-char cap with head/tail elision) caused
// the dpia grader to flag intake-supported facts as "fabricated" (batch
// 4d54f360, run 593e6493). No slice, no elision: the whole payload goes.
// Safety cap only for extreme pathological payloads (>250KB), well above
// any real intake shape emitted by the nine tools.
const INTAKE_HARD_CAP = 250_000;
function sliceIntakeForGrader(intake: unknown, tool?: string): string {
  const s = JSON.stringify(intake ?? {});
  const base = s.length <= INTAKE_HARD_CAP
    ? s
    : `${s.slice(0, INTAKE_HARD_CAP)}[...intake payload exceeded ${INTAKE_HARD_CAP} bytes; tail elided...]`;
  // QB-P22 item 2 — for ir-playbook the generator receives an ENRICHED intake
  // (TEST-STATES + PROVISIONAL DEADLINES block computed by generate-ir-playbook
  // from the raw intake). The grader previously saw only the raw fixture and
  // flagged truthful references to that block as hallucination. Append the
  // same enrichment here so the grader evaluates against the identical payload.
  if (tool === "ir-playbook") {
    try {
      return `${base}\n\n--- ENRICHED CONTEXT (same as generator receives; computed deterministically from the intake above) ---\n${_ir_renderIrTestStatesBlock((intake ?? {}) as _IrBodyForGrader)}`;
    } catch {
      return base;
    }
  }
  return base;
}


const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY       = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_KEY  = Deno.env.get("ANTHROPIC_API_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Boot version marker — r1b1.2 (2026-07-11): GEN/EVAL CHUNK BOUNDARY. After a
// doc's build completes and the report is persisted, the harness self-reinvokes
// so the dual-model evaluation (Claude + GPT-4o + deterministic cross-review)
// runs in a FRESH ~400s isolate. Closes the dpia #61 orphan class (build+eval
// in one isolate = 688s > 400s wall clock; heartbeat died mid-evaluation with
// next_doc_index=0). Harmless for fast tools (extra isolate hop is negligible);
// curative for dpia and any tool whose gen+eval exceeds the isolate budget.
// Mirrors the proven chunk-1 boundary pattern (empirically validated by
// cppa-risk #71 completing 5/5). Bundled with cppa-risk r1b1.2 (T-2 omission
// detection for M4 N/A prong and M6 legacy-band cohort framing).
console.log("[run-quality-batch] build 2026-07-12-poll-resume-boundary r1b1.4");

// Per-invocation chunk size: ALWAYS 1 doc per isolate. Each doc (real generation
// + Claude eval + GPT-4o eval + cross-review) takes ~2.5–3 min; the edge runtime
// hard-kills isolates at 400s, so >1 doc/isolate risks killing mid-doc-2 and
// leaving the run stuck for the SQL watchdog. With 1/isolate, each doc gets a
// fresh ~400s budget and the chunk-boundary `await selfReinvoke` continues.
const SLOW_TOOLS = new Set(["governance", "cppa-risk", "cppa-admt", "registration"]);
const docsPerInvocation = (_tool: string) => 1;
const EVALUATION_TIMEOUT_MS = 90_000;
const CROSS_REVIEW_TIMEOUT_MS = 45_000;
const HEARTBEAT_INTERVAL_MS = 10_000;
// r1b1.4 (2026-07-12): POLL-RESUME BOUNDARY. Per-isolate poll budget kept
// safely inside the 400s isolate wall clock — on deadline the harness
// persists the pending generator row id and self-reinvokes into a fresh
// isolate that CONTINUES polling the same row. Total per-doc budget of
// 20min guards against dead generators (see dpia #62 mid-doc-4 orphan:
// run-dpia-framework died silently, the reaper/sweeper absorb it — but
// the previous unbounded harness poll waited on a row that would never
// flip until its own isolate hit 400s). On total-timeout we mark THAT
// doc failed with an evidence string and PROCEED to the next doc.
const POLL_DEADLINE_MS = 300_000;
const DOC_TOTAL_TIMEOUT_MS = 20 * 60_000;
// PROMPT 8G — per-isolate wall-clock budget for the INTAKE GENERATION phase.
// The isolate hard-kill is ~400s; leave headroom for the in-flight scenario
// call plus persistence + self-reinvoke. Checked BETWEEN scenario calls.
const INTAKE_ISOLATE_BUDGET_MS = 200_000;
// FIX-SO-WD (2026-08-21) — RESERVE-AWARE INTAKE BUDGET.
// The BETWEEN-calls deadline check is only safe when a call that STARTS just
// under the deadline can still finish before the ~400s isolate hard-kill.
// cppa-risk's scenario call measures 230–245s (runs #221/#223/#224), so a call
// started at t=199s lands at ~t=440s: hard-killed mid-call, nothing persisted,
// heartbeat dies, and the DB watchdog stamps "Orphaned by runtime shutdown".
// Fix: never START a scenario call unless the tool's measured worst-case call
// duration still fits inside the budget. Slow tools therefore do exactly one
// scenario per isolate, persist, and self-reinvoke.
const INTAKE_CALL_RESERVE_MS_DEFAULT = 90_000;
const INTAKE_CALL_RESERVE_MS_BY_TOOL: Record<string, number> = {
  "cppa-risk": 260_000,
  "dpia": 200_000,
  "cppa-admt": 200_000,
  "governance": 150_000,
};
export function intakeCallReserveMs(tool?: string): number {
  return (tool && INTAKE_CALL_RESERVE_MS_BY_TOOL[tool]) || INTAKE_CALL_RESERVE_MS_DEFAULT;
}
export function intakeIsolateBudgetMs(tool?: string): number {
  // The budget must be at least one full reserve, or no call could ever start.
  return Math.max(INTAKE_ISOLATE_BUDGET_MS, intakeCallReserveMs(tool) + 20_000);
}

// Tools whose generators write status='complete' on the source row (poll
// path). Editorial/transient tools return payloads inline and bypass this.
const POLL_TOOLS = new Set([
  "cppa-admt", "cppa-risk", "cppa-cyber", "lia", "dpia",
  "governance", "dpa-generator", "ir-playbook",
  "biometric-checker", "registration",
]);

// B3: editorial tools — score accuracy + citation + no-adaptive-guidance, drop
// structured-field checks, zero `formatting` weight. The 5pp from formatting
// rolls into `accuracy` so the overall score still sums to 100.
const EDITORIAL_TOOLS = new Set([
  "ask-privacy", "weekly-brief", "custom-brief", "trend-report", "state-law",
]);
const isEditorial = (tool: string) => EDITORIAL_TOOLS.has(tool);
function weightsFor(tool: string) {
  // GRADER-CAL-1 A1 — formatting axis carries ZERO weight for every tool.
  // The 5pp from the non-editorial vector rolls into hallucination so leaks
  // (recategorized to hallucination) and unsupported-business-claim defects
  // exert stronger scoring pull. Overall still sums to 1.00.
  return isEditorial(tool)
    ? { accuracy: 0.35, citation: 0.25, hallucination: 0.20, analysis: 0.15, intelligence: 0.05, formatting: 0 }
    : { accuracy: 0.30, citation: 0.25, hallucination: 0.25, analysis: 0.15, intelligence: 0.05, formatting: 0 };
}


type Admin = ReturnType<typeof createClient<any>>;

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

// Per-call wall-clock cap so one stalled upstream API can't burn the whole function budget.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function claude(system: string, user: string, maxTokens = 4000, model = "claude-opus-4-6", signal?: AbortSignal): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: signal ?? AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.content?.[0]?.text ?? "";
}

// SO-FT INTAKE-STREAM (2026-08-11): non-streaming Anthropic calls at
// max_tokens=16000 routinely exceed any fixed signal ceiling — cppa-cyber died
// at 180s and cppa-risk at 300s in the 00:47 batch, taking the whole child run
// with them. Streaming keeps bytes flowing so the only deadline that matters is
// an idle-gap deadline, not a total-duration guess. Used by generateIntakes.
async function claudeStreamed(
  system: string, user: string, maxTokens: number, model: string,
  opts?: { idleTimeoutMs?: number; totalTimeoutMs?: number },
): Promise<string> {
  const idleMs = opts?.idleTimeoutMs ?? 120_000;
  const totalMs = opts?.totalTimeoutMs ?? 900_000;
  const controller = new AbortController();
  const totalTimer = setTimeout(() => controller.abort(), totalMs);
  let idleTimer = setTimeout(() => controller.abort(), idleMs);
  const bump = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => controller.abort(), idleMs); };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, stream: true, messages: [{ role: "user", content: user }] }),
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
    if (!r.body) throw new Error("Claude stream: empty body");
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bump();
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") text += evt.delta.text ?? "";
          if (evt.type === "error") throw new Error(`Claude stream error: ${JSON.stringify(evt.error).slice(0, 200)}`);
        } catch { /* partial / non-JSON keepalive */ }
      }
    }
    return text;
  } finally {
    clearTimeout(idleTimer);
    clearTimeout(totalTimer);
  }
}


// GRADER-SYM-1 (item 4): GPT budget raised 3000 → 5000 to match Claude's
// 5000, and a finish_reason==="length" truncation is now logged loudly so a
// cut-off skeleton-mode response is visible instead of being read as
// "GPT found fewer defects".
async function gpt4o(system: string, user: string, maxTokens = 5000): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`GPT-4o ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const finish = d.choices?.[0]?.finish_reason;
  if (finish === "length") {
    console.warn(`[run-quality-batch] gpt_response_truncated finish_reason=length max_tokens=${maxTokens} — findings list may be cut short`);
  }
  return d.choices?.[0]?.message?.content ?? "";
}

async function o3(system: string, user: string, maxTokens = 3000): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "o3",
      max_completion_tokens: maxTokens,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!r.ok) throw new Error(`o3 ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

function tryParse(t: string): any | null {
  const c = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(c); } catch { /* */ }
  const m = c.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// MODEL A/B HARNESS (dispatch 1) — PRODUCT generators only. The ambient
// generation model is attached to calls to these functions and to NOTHING
// else: grader, rubric, cross-review, and editorial helpers invoked through
// invokeFn (ask-privacy, generate-weekly-brief, …) are deliberately absent
// so the A/B parameter can never reach a graded/pinned call path.
export const AB_GENERATION_FUNCTIONS: ReadonlySet<string> = new Set([
  "run-admt-checker",
  "run-cppa-risk-assessment",
  "run-cppa-risk-assessment-v2",
  "run-cppa-cybersecurity",
  "run-li-assessment",
  "run-dpia-framework",
  "run-governance-assessment",
  "generate-ir-playbook",
  "check-biometric-compliance",
  // NOTE: run-registration-assessment is deterministic — it makes no model
  // call — so there is nothing to A/B and it stays off this list (verified:
  // no Anthropic/OpenAI call site in its index.ts). generate-dpa is excluded
  // by standing ruling; RoPA makes no model calls either.
]);

async function invokeFn(name: string, body: unknown): Promise<any> {
  const model = currentGenerationModel();
  const payload = AB_GENERATION_FUNCTIONS.has(name) && body && typeof body === "object"
    ? { ...(body as Record<string, unknown>), generation_model: model }
    : body;
  // Item 4 — the alternate model runs longer per call; give its dispatch leg
  // the wider window. The default model's 240s dispatch timeout is unchanged.
  const dispatchTimeoutMs = AB_GENERATION_FUNCTIONS.has(name)
    ? generationTimeoutMs(model, 240_000)
    : 240_000;
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(dispatchTimeoutMs),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${name} ${r.status}: ${JSON.stringify(d).slice(0, 200)}`);
  return d;
}

interface Check {
  id: string; dimension: string; severity: string;
  tools?: string[]; // F3: when set, the check ONLY runs for these tools; undefined = all tools
  run: (intake: any, report: any) => { passed: boolean; evidence?: string };
}

// ADMT/CPPA-specific check scope shorthand
const ADMT_ONLY = ["cppa-admt"];

// Exported for direct unit testing (tests/edge/run-admt-checker-v2/
// quality-batch-checks-v2.test.ts) — visibility only, no behavior change.
export const CHECKS: Check[] = [
  {
    id: "adtech_not_significant_decision", dimension: "accuracy", severity: "critical",
    tools: ADMT_ONLY,
    run: (intake, report) => {
      const domains: string[] = intake?.decision_domains ?? [];
      if (!domains.some(d => /advertising|adtech|audience/i.test(d))) return { passed: true };
      const triggers = readAdmtScope(report, { context: "adtech_not_significant_decision" }).triggers_significant_decision;
      if (triggers === true)
        return { passed: false, evidence: `triggers_significant_decision=true for advertising domain` };
      return { passed: true };
    },
  },
  {
    id: "gaming_not_significant_decision", dimension: "accuracy", severity: "critical",
    tools: ADMT_ONLY,
    run: (intake, report) => {
      const domains: string[] = intake?.decision_domains ?? [];
      const desc: string = intake?.system_description ?? "";
      if (!domains.some(d => /entertainment|gaming/i.test(d)) && !/gaming|entertainment/i.test(desc))
        return { passed: true };
      const triggers = readAdmtScope(report, { context: "gaming_not_significant_decision" }).triggers_significant_decision;
      if (triggers === true)
        return { passed: false, evidence: `triggers_significant_decision=true for gaming/entertainment` };
      return { passed: true };
    },
  },
  {
    id: "art11_gate_enforced", dimension: "accuracy", severity: "critical",
    tools: ADMT_ONLY,
    run: (_intake, report) => {
      const triggers = readAdmtScope(report, { context: "art11_gate_enforced" }).triggers_significant_decision;
      if (triggers === true) return { passed: true };
      const gaps = [
        ...(report?.notice_gaps ?? []),
        ...(report?.opt_out_gaps ?? []),
        ...(report?.access_gaps ?? []),
      ].filter((g: any) => g.status !== "compliant");
      if (gaps.length)
        return { passed: false, evidence: `${gaps.length} Article 11 gaps populated despite triggers_significant_decision=false` };
      return { passed: true };
    },
  },
  {
    id: "no_7221_c_5", dimension: "citation", severity: "high",
    tools: ADMT_ONLY,
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "");
      const idx = s.indexOf("7221(c)(5)");
      if (idx >= 0)
        return { passed: false, evidence: `§ 7221(c)(5) found: ...${s.slice(Math.max(0, idx - 40), idx + 60)}...` };
      return { passed: true };
    },
  },
  {
    id: "no_7152_a_3_trade_secret", dimension: "citation", severity: "high",
    tools: ADMT_ONLY,
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "");
      if (s.includes("7152(a)(3)"))
        return { passed: false, evidence: "§ 7152(a)(3) cited as ADMT trade-secret exception — incorrect" };
      return { passed: true };
    },
  },
  // QLB-F3: no_british_spelling deleted per CEO Ruling R-15C-1 (revised).
  // Spelling variety is never a deduction; en-US is enforced by Product
  // Prompts (see COURIER QLB-W2C), not the harness. This slot is
  // deliberately left empty to preserve check-id line-neighbourhoods for
  // reviewers reading old batch reports.
  {
    id: "no_prompt_artifacts", dimension: "formatting", severity: "high",
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "").toLowerCase();
      const hits = ["provided authority block", "provided subset", "regulations typically require",
        "while not explicitly covered", "based on the provided", "authority block only includes",
        "note: the provided"].filter(a => s.includes(a));
      if (hits.length) return { passed: false, evidence: `Prompt artifact: ${hits[0]}` };
      return { passed: true };
    },
  },
  {
    id: "no_double_numbering", dimension: "formatting", severity: "medium",
    run: (_intake, report) => {
      const actions: string[] = report?.priority_actions ?? [];
      const bad = actions.filter(a => /^\s*\d+[.)]\s*\d+[.)]/.test(a));
      if (bad.length) return { passed: false, evidence: `Double-numbered: "${bad[0].slice(0, 80)}"` };
      return { passed: true };
    },
  },
  {
    id: "notice_gaps_when_inscope", dimension: "accuracy", severity: "high",
    tools: ADMT_ONLY,
    run: (_intake, report) => {
      const triggers = readAdmtScope(report, { context: "notice_gaps_when_inscope" }).triggers_significant_decision;
      if (triggers !== true) return { passed: true };
      // CONVERSION v1.2 (2026-08-21): v2 carries no top-level notice_gaps
      // array at all (findings live under _meta.internal.findings instead),
      // and a fully-compliant v2 fixture can legitimately have ZERO notice
      // findings while in scope — "no gaps" is a correct outcome there, not
      // evidence the notice check never ran. Skip this v1-specific
      // invariant for v2 records rather than force a false-fail on a
      // compliant fixture.
      if ((report as any)?._meta?.internal?.scope_state) return { passed: true };
      if (!report?.notice_gaps?.length)
        return { passed: false, evidence: "notice_gaps empty despite triggers_significant_decision=true" };
      return { passed: true };
    },
  },
  {
    id: "overall_status_present", dimension: "formatting", severity: "medium",
    tools: ADMT_ONLY,
    run: (_intake, report) => {
      // CONVERSION v1.2 (2026-08-21): v2's equivalent determination summary
      // lives at _meta.internal.overall_posture_label, not a top-level
      // overall_status field.
      const v2Label = (report as any)?._meta?.internal?.overall_posture_label;
      if (typeof v2Label === "string" && v2Label.length > 0) return { passed: true };
      if (!report?.overall_status)
        return { passed: false, evidence: "overall_status field missing or empty" };
      return { passed: true };
    },
  },
  {
    id: "no_hallucinated_section_numbers", dimension: "citation", severity: "high",
    tools: ADMT_ONLY,
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "");
      const bad = [...s.matchAll(/§\s*(\d{4,5})(?:\([a-z0-9]+\))*/gi)]
        .map(m => parseInt(m[1]))
        // QLB-F3: § 1798 is the Cal. Civ. Code prefix the ADMT product
        // prompt mandates citing (§ 1798.155, § 1798.120, § 1798.125);
        // do not flag it as a hallucinated ADMT section number.
        // TP-1: Cal. Civ. Code § 3426 (Uniform Trade Secrets Act, incl.
        // subdivisions such as § 3426.1(d) — trade-secret carve-out) is
        // MANDATED by the ADMT product prompt. The checker was firing on it
        // as a false positive (3× in batch b50e364d, all verified false).
        // Allowlist § 3426 in the same manner as § 1798.
        .filter(n => n > 100 && n < 7000 && n !== 1798 && n !== 3426);
      if (bad.length)
        return { passed: false, evidence: `Suspicious section numbers outside known range: ${[...new Set(bad)].slice(0, 3).map(n => `§ ${n}`).join(", ")}` };
      return { passed: true };
    },
  },

  // =========================================================================
  // R1d — QC-R1 deterministic checks. Rubric portions of QC-R1-6 and QC-R1-7
  // are DEFERRED per the ratified amendment (grading instrument stability for
  // the R1 regression gate); they will establish a new baseline epoch after
  // R1 ships and are recorded in quality_loop2_notes rather than grafted onto
  // the reviewer prompts.
  // =========================================================================

  // --- shared helpers scoped to this block via IIFE-free closure trick ---
  ...(function buildQcR1(): Check[] {
    const CPPA_RISK_ONLY = ["cppa-risk"];
    const GOVERNANCE_ONLY = ["governance"];

    const isResolved = (s: string) => s === "resolved_met" || s === "resolved_not_met" || s === "resolved_not_applicable";

    // R1e: mirror the generator pipeline exactly. `resolveIntakeForTestStates`
    // returns the same FiveStageIntake `normaliseIntake` produces AND a
    // raw-shim view with the flat q*_ keys back-filled from
    // org_context / annual_consumer_volume / content_detail so both fixture
    // shapes (flat legacy, 5-stage) resolve identical M-states.
    const resolveForChecks = (intake: any) => resolveIntakeForTestStates(intake ?? {});


    const collectInfoNeeded = (report: any): any[] => {
      const out: any[] = [];
      const push = (v: any) => { if (v) out.push(v); };
      const walk = (node: any) => {
        if (!node) return;
        if (Array.isArray(node?.information_needed)) node.information_needed.forEach(push);
        if (Array.isArray(node)) node.forEach(walk);
        else if (typeof node === "object") for (const k of Object.keys(node)) if (k !== "information_needed") walk(node[k]);
      };
      walk(report);
      return out;
    };

    const rationaleText = (report: any): string => {
      const chunks: string[] = [];
      const walk = (node: any, key = "") => {
        if (node == null) return;
        if (typeof node === "string") { if (/rationale|audit|cybersecurity|analysis|reasoning|basis/i.test(key)) chunks.push(node); return; }
        if (Array.isArray(node)) { node.forEach((v, i) => walk(v, key)); return; }
        if (typeof node === "object") for (const k of Object.keys(node)) walk(node[k], k);
      };
      walk(report);
      return chunks.join("\n").toLowerCase();
    };

    const HEDGE = /(cannot be determined|cannot determine|unable to (?:confirm|verify|resolve)|please (?:confirm|verify|clarify)|to (?:be )?confirm(?:ed)?|pending confirmation|no basis to assess|insufficient (?:basis|information))/i;
    const STAT_ANCHOR = /(§|11 CCR|1798\.|Article\s+\d|Recital\s+\d|GDPR|EDPB|DPA\s?2018|Schedule|BIPA|CUBI|MHMD)/i;
    const OPTIONAL_TONE = /(could strengthen|would strengthen|consider adding|for completeness|optionally|nice to have|would enhance|could enhance)/i;

    return [
      // QC-R1-1 -- no asks on resolved risk tests
      {
        id: "qc_r1_1_no_asks_on_resolved_tests", dimension: "accuracy", severity: "critical",
        tools: CPPA_RISK_ONLY,
        run: (intake, report) => {
          let states: Record<string, any>;
          try {
            const r = resolveForChecks(intake);
            states = computeRiskTestStates(r.fiveStage, r.rawForStates);
          } catch (e) { return { passed: false, evidence: `computeTestStates threw: ${(e as Error).message?.slice(0, 80)}` }; }

          const resolvedFields = new Set<string>();
          const resolvedIds: string[] = [];
          const resolvedFieldsById: Record<string, string[]> = {};
          for (const [id, s] of Object.entries(states)) {
            if (isResolved(s.state)) {
              resolvedIds.push(id);
              const src = (s.source_fields ?? []) as string[];
              resolvedFieldsById[id] = src;
              src.forEach((f: string) => resolvedFields.add(f));
            }
          }
          const infoNeeded = collectInfoNeeded(report);
          for (const entry of infoNeeded) {
            const fields = [
              ...(Array.isArray(entry?.source_fields) ? entry.source_fields : []),
              entry?.field, entry?.source_field, entry?.field_id,
            ].filter(Boolean).map((s: any) => String(s));
            const hit = fields.find(f => resolvedFields.has(f));
            if (hit) return { passed: false, evidence: `information_needed asks for resolved field "${hit}"` };
          }
          // GRADER-1 Task 4 — per-field co-occurrence.  A hedge sitting in a
          // DIFFERENT rationale field about a genuinely INDETERMINATE test id
          // must PASS; fail only when the hedge phrase and the resolved test
          // id (or its source_fields) co-occur inside the SAME field string.
          const entries = collectRationaleEntries(report);
          const perField = evaluateResolvedHedgePerField(entries, resolvedIds, resolvedFieldsById, HEDGE);
          if (!perField.passed) return perField;
          return { passed: true };
        },
      },


      // QC-R1-2 -- SPI prong (M4) utilization in cyber-audit section
      // s6 re-key (INSTRUMENT-EPOCH-AUDIT-S6, 2026-07-27, ledger item 155):
      // scan restricted from full-report JSON to `submission_summary` (the
      // approved surface-map render site for cyber-audit crosswalk clauses
      // landed by the WAVE-B COMPLETION emitter, ledger item 154). The
      // check's SUBSTANCE is preserved — a resolved M4 prong must still be
      // cited on the record and its resolution must still match M4 — only
      // the scan window moves to where the content now legitimately
      // renders. NOT WEAKENED: full-report scan would trivially pass if the
      // string appeared anywhere; the surface-map-anchored scan enforces
      // that the citation lands in its canonical surface (submission_basis
      // is Type R, registry-anchored, zero LLM).
      {
        id: "qc_r1_2_spi_prong_utilization", dimension: "accuracy", severity: "high",
        tools: CPPA_RISK_ONLY,
        run: (intake, report) => {
          const r = resolveForChecks(intake);
          const q15 = String(r.rawForStates.q15_sensitive_pi ?? "").trim();
          const q15c = String(r.rawForStates.q15c_spi_volume ?? "").trim();
          if (!q15c && q15 !== "No") return { passed: true }; // absent-value variant: nothing to test
          const states = computeRiskTestStates(r.fiveStage, r.rawForStates);

          const m4 = states.M4;
          if (!m4 || !isResolved(m4.state)) return { passed: true };
          // ITEM 428 (PIECE B) — re-homed per item428 Piece B: content unchanged,
          // surface retired. Reads the new statutory surface, falling back to
          // the retired key for legacy persisted documents.
          const ss = (report as any)?.submission_and_retention ?? (report as any)?.submission_summary ?? {};
          const s = JSON.stringify(ss ?? "").toLowerCase();
          if (!/7120\s*\(b\)\s*\(2\)\s*\(b\)/.test(s)) {
            return { passed: false, evidence: `§ 7120(b)(2)(B) not referenced in submission_summary despite resolved M4 (${m4.state})` };
          }
          const expected =
            m4.state === "resolved_met" ? /(met|threshold\s+met|exceeds|50,?000\s+or\s+more)/
            : m4.state === "resolved_not_met" ? /(not\s+met|below|fewer than 50,?000)/
            : /(not\s+applicable|inapplicable|n\/?a|no\s+spi)/;
          if (!expected.test(s)) return { passed: false, evidence: `§ 7120(b)(2)(B) resolution in submission_summary does not match computed M4=${m4.state}` };
          return { passed: true };
        },
      },

      // QC-R1-3 -- 50%-prong (M5) utilization
      // r1b1.3 (2026-07-12): per-state acceptable phrasing sets — the report
      // may resolve a state via met/not-met literal OR via a semantically
      // equivalent insufficient-basis / cannot-confirm phrasing. Detector
      // must recognise both to avoid marking correct output as a defect.
      // s6 re-key (INSTRUMENT-EPOCH-AUDIT-S6, 2026-07-27, ledger item 155):
      // scan restricted from full-report JSON to `submission_summary` (per
      // approved surface map — crosswalk render site landed by WAVE-B
      // COMPLETION, ledger item 154). SUBSTANCE preserved; NOT weakened.
      {
        id: "qc_r1_3_50pct_prong_utilization", dimension: "accuracy", severity: "high",
        tools: CPPA_RISK_ONLY,
        run: (intake, report) => {
          const r = resolveForChecks(intake);
          const q5 = String(r.rawForStates.q5_sell_share ?? "").trim();
          const q5c = String(r.rawForStates.q5c_share_revenue_50pct ?? "").trim();
          if (!q5c && q5 !== "No") return { passed: true };
          const states = computeRiskTestStates(r.fiveStage, r.rawForStates);

          const m5 = states.M5;
          if (!m5 || !isResolved(m5.state)) return { passed: true };
          // ITEM 428 (PIECE B) — re-homed per item428 Piece B: content unchanged,
          // surface retired. Reads the new statutory surface, falling back to
          // the retired key for legacy persisted documents.
          const ss = (report as any)?.submission_and_retention ?? (report as any)?.submission_summary ?? {};
          const s = JSON.stringify(ss ?? "").toLowerCase();
          if (!/7120\s*\(b\)\s*\(1\)/.test(s)) {
            return { passed: false, evidence: `§ 7120(b)(1) not referenced in submission_summary despite resolved M5 (${m5.state})` };
          }
          // Insufficient-basis / cannot-confirm synonyms — accepted for any
          // resolved M5 whose input signal was absent or ambiguous. When the
          // generator states "the record does not confirm whether 50% or
          // more..." it is semantically resolving the prong via the
          // insufficient-basis lane, which the prior literal-only matcher
          // rejected.
          const insufficientBasis = /(does not confirm|not\s+confirmed|insufficient\s+(?:basis|information|evidence)|cannot\s+(?:be\s+)?(?:confirmed|determined|resolved|verified)|no\s+basis\s+to\s+(?:confirm|assess|determine)|pending\s+confirmation|to\s+be\s+confirmed|record\s+does\s+not\s+(?:establish|indicate|state)|indeterminate)/i;
          const met = /(threshold\s+met|is\s+met|meets\s+the\s+threshold|derives\s+50%|50%\s+or\s+more|fifty\s+percent\s+or\s+more|exceeds\s+50%|\bmet\b)/i;
          const notMet = /(not\s+met|does\s+not\s+meet|below\s+(?:the\s+)?(?:50%|threshold)|no\s+sale|does\s+not\s+sell|inapplicable|less\s+than\s+50%|under\s+50%)/i;
          const na = /(not\s+applicable|inapplicable|n\/?a\b|does\s+not\s+apply)/i;
          const ok =
            m5.state === "resolved_met" ? (met.test(s) || insufficientBasis.test(s))
            : m5.state === "resolved_not_met" ? (notMet.test(s) || insufficientBasis.test(s))
            : (na.test(s) || insufficientBasis.test(s));
          if (!ok) return { passed: false, evidence: `§ 7120(b)(1) resolution in submission_summary does not match computed M5=${m5.state} (no met/not-met/insufficient-basis phrasing found)` };
          return { passed: true };
        },
      },

      // QC-R1-4 -- cohort determinism (M6 / § 7121(a))
      // r1b1.3 (2026-07-12): accept cohort dates in ANY standard format —
      // ISO ("2029-04-01") or long form ("April 1, 2029"). Indeterminate
      // (legacy/absent) bands require BOTH 2029 and 2030 cohort dates
      // present with conditional framing; resolved bands require the single
      // correct cohort date, unhedged. Prior detector required ISO only
      // and only matched "two-cohort" literal phrasing, false-failing on
      // reports that used long-form dates in a conditional table.
      //
      // s6 re-key (INSTRUMENT-EPOCH-AUDIT-S6, 2026-07-27, ledger item 155):
      // scan restricted from full-report JSON to `submission_summary` — the
      // approved surface-map render site for the compliance cohort date
      // (submission_deadline, submission_basis, deadline_basis). The
      // check's SUBSTANCE is preserved: a resolved band must carry the
      // single correct cohort date on the record; an indeterminate/legacy
      // band must carry both cohort dates with conditional framing. NOT
      // WEAKENED: full-report scan would pass if the year appeared anywhere
      // (e.g. incidental "2029" in an unrelated field); the surface-map
      // anchored scan enforces that the cohort date lands in its canonical
      // surface. Wave-B evidence (run 145) showed 4 wiring defects (docs
      // 1/2/5/6) where submission_deadline rendered "April 1, 2028" for
      // bands that resolve to 2029 or 2030 — those are legitimate failures
      // preserved by this re-key. Not re-keyed around them.
      {
        id: "qc_r1_4_cohort_determinism", dimension: "accuracy", severity: "critical",
        tools: CPPA_RISK_ONLY,
        run: (intake, report) => {
          const r = resolveForChecks(intake);
          const band = classifyRevenueBand(r.rawForStates.q1_revenue);

          // ITEM 428 (PIECE B) — re-homed per item428 Piece B: content unchanged,
          // surface retired. Reads the new statutory surface, falling back to
          // the retired key for legacy persisted documents.
          const ss = (report as any)?.submission_and_retention ?? (report as any)?.submission_summary ?? {};
          const s = JSON.stringify(ss ?? "").toLowerCase();
          // ISO or long form ("april 1, YYYY" / "april 1 YYYY").
          const cohortDateRegex = (year: string) =>
            new RegExp(`(?:${year}-04-01|april\\s+1,?\\s+${year})`, "i");
          const has2029 = cohortDateRegex("2029").test(s);
          const has2030 = cohortDateRegex("2030").test(s);
          const has2028 = cohortDateRegex("2028").test(s);

          if (band.audit_cohort === "indeterminate") {
            if (!(has2029 && has2030)) {
              return { passed: false, evidence: `legacy/absent revenue band requires both April 1, 2029 and April 1, 2030 cohort dates (ISO or long form) in submission_summary; found 2029=${has2029} 2030=${has2030}` };
            }
            // Conditional framing must be present so the two dates are
            // presented as a period-dependent choice, not a contradiction.
            const conditional = /(if\s+\d{4}\s+(?:annual\s+)?(?:gross\s+)?revenue|depend(?:s|ing)\s+on|conditional|straddles|cannot\s+resolve|indeterminate|two[- ]cohort|either\s+2029|2029\s+or\s+2030|cohort\s+table)/i;
            if (!conditional.test(s)) {
              return { passed: false, evidence: `both cohort dates present in submission_summary but no conditional/period-dependent framing found` };
            }
            return { passed: true };
          }
          // Resolved band → single definitive cohort date must be present.
          const year = band.audit_cohort.slice(0, 4);
          const present =
            year === "2028" ? has2028 :
            year === "2029" ? has2029 :
            year === "2030" ? has2030 : s.includes(band.audit_cohort);
          if (!present) {
            return { passed: false, evidence: `resolved band ${band.label} requires § 7121(a) cohort April 1, ${year} (ISO or long form) in submission_summary; not stated` };
          }
          // must NOT hedge the resolved cohort near the cite window.
          const longForm = `april 1, ${year}`;
          const iso = `${year}-04-01`;
          const idx = s.includes(iso) ? s.indexOf(iso) : s.indexOf(longForm);
          if (idx >= 0) {
            const window = s.slice(Math.max(0, idx - 200), idx + 200);
            if (/(cannot be determined|indeterminate|unable to (?:confirm|resolve))/i.test(window)) {
              return { passed: false, evidence: `resolved cohort April 1, ${year} is hedged near the cite window in submission_summary` };
            }
          }
          return { passed: true };
        },
      },


      // QC-R1-5 -- claimed-exception fields consumed (authority_basis / retention_period)
      {
        id: "qc_r1_5_exception_fields_consumed", dimension: "accuracy", severity: "high",
        tools: CPPA_RISK_ONLY,
        run: (intake, report) => {
          const r = resolveForChecks(intake);
          const exceptions = (r.fiveStage.exceptions ?? {}) as Record<string, any>;

          const targets: { key: string; ab?: string; rp?: string }[] = [];
          for (const [k, v] of Object.entries(exceptions)) {
            if (!v?.claimed) continue;
            const ab = String(v?.authority_basis ?? "").trim();
            const rp = String(v?.retention_period ?? "").trim();
            if (ab || rp) targets.push({ key: k, ab: ab || undefined, rp: rp || undefined });
          }
          if (targets.length === 0) return { passed: true }; // nothing to test
          const s = JSON.stringify(report ?? "").toLowerCase();
          for (const t of targets) {
            const keyLc = t.key.toLowerCase();
            if (t.ab && !s.includes(t.ab.toLowerCase())) {
              return { passed: false, evidence: `exception "${t.key}" authority_basis ("${t.ab.slice(0, 40)}") not referenced` };
            }
            if (t.rp && !s.includes(t.rp.toLowerCase())) {
              return { passed: false, evidence: `exception "${t.key}" retention_period ("${t.rp.slice(0, 40)}") not referenced` };
            }
            // Ensure NOT adopted as established: look for "claimed"/"asserted"/"under test" framing near the exception key
            const idx = s.indexOf(keyLc);
            if (idx >= 0) {
              const win = s.slice(Math.max(0, idx - 300), idx + 300);
              const framedAsClaim = /(claim|asserted|under test|as claimed|intake states|per the intake|claimed authority|to be substantiated)/i.test(win);
              const framedAsEstablished = /(establishes|is established|compliant retention|authoritative basis|substantiated authority)/i.test(win);
              if (framedAsEstablished && !framedAsClaim) {
                return { passed: false, evidence: `exception "${t.key}" fields adopted as established without claimed-vs-substantiated framing` };
              }
            }
          }
          return { passed: true };
        },
      },

      // QC-R1-7 (deterministic part) -- enhancement placement: optional-depth items
      // with no statutory anchor must not live under information_needed.
      {
        id: "qc_r1_7_enhancement_placement_det", dimension: "analysis", severity: "medium",
        // Apply everywhere information_needed is emitted; keep it broadly scoped.
        run: (_intake, report) => {
          const infoNeeded = collectInfoNeeded(report);
          for (const entry of infoNeeded) {
            const dims = String(entry?.dimensions ?? entry?.dimension ?? entry?.reason ?? entry?.rationale ?? "");
            if (!dims) continue;
            if (OPTIONAL_TONE.test(dims) && !STAT_ANCHOR.test(dims)) {
              return { passed: false, evidence: `information_needed uses optional-depth tone without statutory anchor: "${dims.slice(0, 100)}"` };
            }
          }
          return { passed: true };
        },
      },

      // QC-R1-8 (deterministic-lite) -- governance additional_context handling
      {
        id: "qc_r1_8_governance_additional_context", dimension: "analysis", severity: "high",
        tools: GOVERNANCE_ONLY,
        run: (intake, report) => {
          const ac = String(intake?.org_context?.additional_context ?? intake?.additional_context ?? "").trim();
          if (!ac) return { passed: true };
          const s = JSON.stringify(report ?? "").toLowerCase();
          // (a) findings must reference/credit it — probe first 40 chars of AC as a substring token
          const token = ac.slice(0, 40).toLowerCase();
          const referenced = s.includes(token) || /additional context|as noted by (?:the )?(?:organisation|organization|client)|per the intake context/i.test(s);
          if (!referenced) return { passed: false, evidence: `additional_context present but not referenced/credited in any finding` };
          // (b) detectable subset — domain status justified SOLELY by additional_context
          const findings: any[] = [];
          const walk = (n: any) => {
            if (!n) return;
            if (Array.isArray(n)) return n.forEach(walk);
            if (typeof n === "object") {
              if (n.domain && n.status && (n.basis || n.rationale || n.reasoning)) findings.push(n);
              for (const k of Object.keys(n)) walk(n[k]);
            }
          };
          walk(report);
          for (const f of findings) {
            const basis = String(f.basis ?? f.rationale ?? f.reasoning ?? "").toLowerCase();
            if (!basis) continue;
            if (basis.includes(token) && !STAT_ANCHOR.test(basis) && basis.length < ac.length + 80) {
              return { passed: false, evidence: `domain "${f.domain}" status "${f.status}" justified solely by additional_context` };
            }
          }
          return { passed: true };
        },
      },

      // QC-WS6-1 (r1b1.4 poll-resume; evaluated on the completed row) —
      // supplemental capture consumption discipline. When the intake carries
      // supplemental_responses / supplemental_context (WS6 v2.1), the completed
      // report MUST: (a) NOT emit an information_needed entry whose `field`
      // matches any supplemental entry's `ref_field`; (b) NOT restate an
      // insufficient-basis dead-end phrasing against a supplemental-answered
      // field. When no supplementals are present, this check is a no-op pass.
      {
        id: "qc_ws6_1_supplemental_consumption", dimension: "accuracy", severity: "high",
        tools: ["cppa-risk", "cppa-cyber", "cppa-admt", "dpia", "governance", "lia", "ir-playbook", "biometric-checker", "dpa-generator"],
        run: (intake, report) => {
          const supp: any[] = Array.isArray(intake?.supplemental_responses) ? intake.supplemental_responses : [];
          const suppCtx = typeof intake?.supplemental_context === "string" ? intake.supplemental_context.trim() : "";
          if (supp.length === 0 && !suppCtx) return { passed: true };
          // Collect the answered ref_fields; only those with a non-empty response count.
          const answeredRefs = new Set<string>();
          for (const e of supp) {
            if (!e || typeof e !== "object") continue;
            const resp = typeof e.response === "string" ? e.response.trim() : "";
            const ref = typeof e.ref_field === "string" ? e.ref_field.trim() : "";
            if (resp && ref) answeredRefs.add(ref);
          }
          // (a) no information_needed entry may re-ask an answered ref.
          const asks: any[] = Array.isArray(report?.information_needed) ? report.information_needed : [];
          for (const a of asks) {
            const f = typeof a?.field === "string" ? a.field : "";
            if (f && answeredRefs.has(f)) {
              return { passed: false, evidence: `information_needed re-asks answered supplemental ref_field "${f}"` };
            }
          }
          // (b) no dead-end insufficient-basis phrasing tied to an answered ref appears in prose.
          if (answeredRefs.size > 0) {
            const text = JSON.stringify(report ?? "").toLowerCase();
            const marker = /(insufficient information|cannot be determined without|without further information|not possible to (?:assess|determine) without)/i;
            if (marker.test(text)) {
              for (const ref of answeredRefs) {
                const needle = ref.toLowerCase();
                if (text.includes(needle)) {
                  return { passed: false, evidence: `insufficient-basis phrasing persists near answered supplemental ref "${ref}"` };
                }
              }
            }
          }
          return { passed: true };
        },
      },
    ];
  })(),
];

// ===================================================================
// F1 — Fixed per-tool LLM rubric checklist.
// Both Claude and GPT score the SAME ids; "agree" becomes possible.
// IDs MUST stay disjoint from deterministic CHECKS ids (asserted below).
// ===================================================================
type RubricCheck = { id: string; dimension: string; severity: string; description: string };

const RUBRIC_GENERAL: RubricCheck[] = [
  // 2026-08-21 (quality-batch 2fc40a52, following 4261dab7/6495d207) — the
  // ADMT-specific rubric_admt_valid_out_of_scope_determination /
  // rubric_admt_out_of_scope_termination_is_complete overrides were confirmed
  // DEPLOYED and confirmed PASSING on the exact documents where
  // rubric_generic_boilerplate still failed on the same sentence (Lovable
  // traced both check ids as evaluated-and-passed in the same graded run).
  // The checks are independently scored, so an ADMT-specific override telling
  // the grader not to fail THIS check doesn't reliably stop the grader from
  // separately scoring rubric_generic_boilerplate on its own terms. Fixing it
  // at the source instead: the base description below now states the
  // distinction directly, which is a real, product-agnostic principle (every
  // product that states a legal conclusion using the test's own standard
  // vocabulary is exposed to the same false-positive), not an ADMT carve-out.
  { id: "rubric_generic_boilerplate",       dimension: "analysis",      severity: "medium",
    description: "Reasoning is generic boilerplate that could apply to any company; not tailored to THIS intake's facts. A sentence that correctly names the SPECIFIC facts the intake supplied and states which legal test those facts satisfy (e.g., naming the actual elements of a multi-part test the record establishes) is NOT boilerplate merely because it uses the test's own standard vocabulary to do so — genericness means the reasoning ignores or could ignore this intake's specific facts, not that the sentence's phrasing is reusable across records that happen to satisfy the same test the same way. Fail this check only when the sentence would read identically regardless of what the company actually reported." },
  { id: "rubric_unsupported_business_claim", dimension: "hallucination", severity: "high",
    description: "Document asserts facts about the business that are not in the intake (invented users, revenue, jurisdictions, etc.)." },
  { id: "rubric_actionability",             dimension: "intelligence",  severity: "medium",
    description: "Recommendations are not actionable for a real compliance professional (vague, no owner, no trigger). A report that correctly reaches a determination calling for no further action (e.g., a valid out-of-scope / not-required conclusion, or a fully-approved determination with no open condition) is NOT under-actionable for stopping there once it states that conclusion — judge actionability against what the determination itself calls for, not against unrelated operational detail the intake happened to supply that the determination correctly renders moot (e.g., notice text, opt-out mechanics, vendor documentation supplied for a system later found out of scope). A report is also NOT under-actionable for naming WHO accepted or must act on a risk (e.g., \"preliminary until R. Steiner re-scores it\") without inventing a re-scoring deadline, procedure, or trigger the intake never supplied — this fleet's products never invent unattributed operational detail (deadlines, procedures, named owners for specific mitigation steps) beyond what the record states; naming the accountable person, without more, is the complete and correct behavior. Fail this check only when the report's OWN stated next steps, conditions, or recommendations are themselves vague or unassigned relative to what the intake actually supports — not because a correct, complete determination or a properly-attributed acceptance left unsupported detail unaddressed." },
  { id: "rubric_internal_reasoning_leak",   dimension: "hallucination", severity: "high",
    description: "Internal AI reasoning/meta-commentary visible in customer-facing text (\"as an AI\", \"based on the provided\", \"my analysis\"). Scored under hallucination per GRADER-CAL-1 A1. NEVER fires on \"NOTE FOR LEGAL REVIEW — <topic>\" blocks (designed counsel-voice product output, not model self-narration)." },
  { id: "rubric_citation_misapplied",       dimension: "citation",      severity: "high",
    description: "A real cited section is applied to the wrong proposition (right citation, wrong claim). Narrow exception (2026-08-21, batch ba742475): when a lawful-basis table cites the GDPR/CCPA provision that actually matches the company's own selected basis (e.g., Art. 6(1)(c) for a \"legal obligation\" basis), that citation is complete and correct on its own terms even when a DIFFERENT, unrelated field elsewhere in the record (e.g., a nature/scope narrative) separately names an external sector-specific statute as the underlying obligation in the company's own words. The tool is not required to cross-reference that external statute into the Authority column — it attributes and does not independently verify third-party non-privacy law, and the company's own account remains available elsewhere in the document. This is not a misapplied citation; it is two independently correct, unlinked facts. Do NOT fail this check on that pattern alone; still fail it where the cited provision itself does not match the claim it supports." },
];

// CEO RULING 2026-08-21 — a report that correctly concludes ADMT does not
// apply is a valid, complete outcome, not an incomplete one. Batch
// 4261dab7 (doc #1) scored a well-founded "not required" determination down
// under three GENERAL checks (rubric_generic_boilerplate,
// rubric_actionability, rubric_citation_misapplied) that were never meant to
// penalize a correct scope-out — the grader had no product-specific
// instruction telling it that "no ADMT requirements apply" is itself the
// complete, correct analysis when the § 7001(e)(1) three-prong test is
// satisfied. rubric_admt_valid_out_of_scope_determination below is the fix:
// it tells the grader not to deduct for a WELL-FOUNDED "not required"
// conclusion under those three general checks, while still failing (and
// flagging) an out-of-scope conclusion the intake facts do not actually
// support — the CEO's explicit "UNLESS THE 'NOT REQUIRED' ANALYSIS IS WRONG"
// condition.
//
// STRENGTHENED 2026-08-21 (batch 7634357e, doc #1, admt-ca-tenant-screening-
// perfect): the original wording wasn't enough. The grader still failed this
// exact scenario — a "material factor, heavily weighted" output alongside
// qualifying human review — as a possible citation misapplication, EVEN
// THOUGH the report's own applicability table already states, verbatim,
// "Role of ADMT output | Material factor — heavily weighted alongside
// others | No independent effect on applicability; establishes the factual
// record for the Notice and Access sections." Verified against the
// deterministic engine (admt-v2-deterministic.ts computeScope(): the output-
// role/sole-factor field is explicitly commented "descriptive only — never
// establishes/defeats scope") and the verified-authorities registry (no
// citation ties "sole factor," "material factor," or "heavily weighted" to
// the scope determination at all — sole_factor only feeds the § 7222
// access-disclosure content). The added sentence below names this pattern
// directly so the grader stops re-litigating a question the report already
// answers in its own table.
const RUBRIC_ADMT: RubricCheck[] = [
  { id: "rubric_advertising_significant_decision", dimension: "accuracy", severity: "critical",
    description: "Advertising / adtech / audience targeting classified as a \"significant decision\" under CPPA § 7001(ddd). It is not." },
  { id: "rubric_gaming_significant_decision",      dimension: "accuracy", severity: "critical",
    description: "Gaming or entertainment service eligibility classified as a \"significant decision\". It is not." },
  { id: "rubric_invented_admt_section",            dimension: "citation", severity: "critical",
    description: "ADMT citation outside the real range (real sections: 7001, 7150–7157, 7200–7222)." },
  { id: "rubric_admt_valid_out_of_scope_determination", dimension: "accuracy", severity: "critical",
    description: "A report concluding the system is OUT OF SCOPE / ADMT requirements are NOT REQUIRED because of qualifying human involvement is CORRECT and COMPLETE — not incomplete, generic, or a citation misapplication — when the intake establishes ALL THREE prongs of the 11 CCR § 7001(e)(1) human-involvement test: (A) the reviewer knows how to interpret and use the technology's output to make the decision; (B) the reviewer reviews and analyzes that output together with other information relevant to the decision; and (C) the reviewer has authority to make or change the decision based on that analysis. WHETHER THE SYSTEM'S OUTPUT IS DESCRIBED AS A \"SOLE FACTOR,\" A \"MATERIAL FACTOR,\" \"HEAVILY WEIGHTED,\" OR ANY SIMILAR WEIGHTING LANGUAGE IS IRRELEVANT TO THIS TEST AND MUST NEVER BE TREATED AS CONTRADICTING A VALID OUT-OF-SCOPE CONCLUSION — the § 7001(e)(1) exemption turns only on whether the three-prong human-involvement test is met, not on how much weight the algorithmic output carries in that human's decision; a report is not wrong, evasive, or under-analyzed for saying so, even when that weighting language appears prominently elsewhere in the same table or section. Where all three prongs are established on the intake facts, do NOT fail rubric_generic_boilerplate for restating those three elements as the basis for the conclusion, do NOT fail rubric_actionability for the report terminating after the applicability determination without auditing notice/opt-out/access/appeal mechanics (those obligations never attach where ADMT does not apply, so there is nothing further to audit), and do NOT fail rubric_citation_misapplied for citing § 7001(e)(1) in support of that conclusion — including when a nearby table row separately and correctly notes that the output's weighting has \"no independent effect on applicability.\" This check FAILS only where the report reaches an OUT OF SCOPE / NOT REQUIRED conclusion but the intake does NOT establish all three prongs on its own facts (e.g., the described reviewer only rubber-stamps the output, lacks the information to meaningfully review it, or lacks authority to change the outcome) — that is a genuine misapplication of § 7001(e)(1), and only that scenario should be flagged here." },

  // Batch 6495d207 (2026-08-21) — the prior fix worked for the critical
  // accuracy/citation dimension (GPT gave the out-of-scope doc a clean 100)
  // but Claude still docked rubric_actionability / rubric_generic_boilerplate
  // on the SAME scenario, and separately flagged three unrelated in-scope
  // sections. Splitting the override into its own dedicated, short checks
  // (rather than one clause inside the long paragraph above, which is keyed
  // to a DIFFERENT check_id) so each gets independent attention when the
  // grader scores rubric_actionability / rubric_generic_boilerplate on their
  // own terms. Verified all four scenarios directly against rendered PDF
  // text before writing these, not from the batch summary alone.
  { id: "rubric_admt_out_of_scope_termination_is_complete", dimension: "intelligence", severity: "low",
    description: "When Section 2 concludes the System is OUT OF SCOPE (qualifying human involvement under 11 CCR § 7001(e)(1) established on the intake facts), the audit correctly and completely ENDS there — no Pre-use Notice, Opt-Out, Access, or Vendor sections compose, and Priority Matters correctly states no condition, follow-up, or recommendation was generated. This is the product's designed behavior for an out-of-scope System, not an incomplete or under-analyzed report: those obligations are legally scoped to ADMT, so they do not attach once the System is out of scope, regardless of how much OTHER operational detail (notice text, opt-out mechanics, bias testing, vendor management, etc.) the intake happens to supply elsewhere. Do NOT fail rubric_actionability for the report terminating there, and do NOT fail rubric_generic_boilerplate for the sentence stating the three § 7001(e)(1) human-involvement elements as the basis for that conclusion — that sentence IS the complete, correct legal analysis, not a placeholder for a longer one." },
  { id: "rubric_admt_counsel_confirmation_is_designed", dimension: "analysis", severity: "low",
    description: "Every ADMT audit opens with an explicit methodology disclaimer stating it is not legal advice or a certification, and that \"the Company or its counsel should confirm material facts and any Company-supplied notice, policy, testing, or process language.\" A generated sentence that names a specific fact the Company supplied (e.g., notice text, a trade-secret withholding policy) and then says the Company or its counsel should confirm it meets the legal standard is implementing that stated disclaimer, not writing generic filler — the tool deliberately does not adjudicate whether specific wording is legally sufficient, since that is a legal judgment outside a fact-pattern compliance check. Do NOT fail rubric_generic_boilerplate for this pattern merely because the same \"the Company or its counsel should confirm...\" framing recurs across sections (notice, access, vendor); it recurs because the same disclaimer governs every section where wording SUFFICIENCY, not mere presence, is the open question the tool cannot resolve." },
  { id: "rubric_admt_check_full_document_before_missing_finding", dimension: "intelligence", severity: "low",
    description: "Before flagging a fact as \"missing from the analysis\" or \"not audited,\" check BOTH the System and Decision Profile narrative (Section 1) and the relevant factor table (e.g., the Applicability table in Section 2) — the report states each material human-review, decision-role, and vendor fact in at least one of those two places, often both. A fact already stated in Section 1's narrative (for example, that a reviewer \"sees the output but cannot override it\") is not a gap merely because a later generated sentence does not repeat it verbatim." },
  { id: "rubric_admt_no_inference_on_optout_pathway", dimension: "intelligence", severity: "low",
    description: "When opt_out_exception does not match one of the four defined pathways (full opt-out, human-appeal, hiring/admission, work-allocation/compensation), the audit correctly reports the pathway as unresolved and recommends only that the Company confirm which pathway or § 7221(b) exception it relies on. It does NOT speculate that a narrative detail elsewhere in the intake (e.g., a described escalation or override process) supports a specific exception, even where that detail sounds similar to one — the Company must affirmatively select the pathway, and inferring one from unrelated narrative text would violate the tool's no-inference design. Do NOT fail rubric_actionability for the recommendation not naming a specific candidate exception in this situation; asking the Company to confirm the pathway is the complete, correct, and only safe recommendation on an unresolved record." },
];

// Batch 3aa848eb (2026-08-22) — doc #2 (Nordfracht, approver R. Steiner) and
// doc #5 (a pilot-scoped intake, approver S. Cartwright) both drew
// rubric_actionability on the executive-summary sentence "the risk levels
// in this document are preliminary until <name> re-scores them ... once
// they have been deployed." The existing rubric_actionability exception
// already covers "don't invent a re-scoring deadline the intake never
// supplied" — but BOTH documents actually verified as already carrying a
// concrete, scheduled re-assessment trigger elsewhere in the SAME report
// (the Art. 35(11) periodic-review sentence: "reviewed every 24 months...
// the review window runs to <date>", or the pilot-scope sentence "the pilot
// ends on the end date above, when this assessment is re-run"). The grader
// was scoring the risk-preliminary sentence in isolation without checking
// whether the document's OWN periodic-review language elsewhere already
// supplies the specificity it was faulting the sentence for lacking — same
// shape as rubric_admt_check_full_document_before_missing_finding above.
// Separately verified doc #2's approval-predates-launch timing is not
// actually inconsistent with "preliminary until deployed" (DPIAs are
// approved to proceed BEFORE launch by design; Art. 35(1)), so that half of
// the finding is also covered here rather than left to recur. Split into
// its own dedicated check per the same lesson as the ADMT overrides above:
// a clause embedded in rubric_actionability's own paragraph already named
// this exact scenario ("...e.g., 'preliminary until R. Steiner re-scores
// it'...") and still didn't stop the check from re-firing on it.
const RUBRIC_DPIA: RubricCheck[] = [
  // 2026-08-25 (spine v4.6.2): the product retired every "preliminary until
  // re-scored" formulation -- residual ratings are now stated as final as of
  // the assessment date, with change handled by the Art. 35(11) review
  // stated in Section 6. The check's guidance is updated accordingly; the
  // approval-before-launch half of the old guidance still applies.
  { id: "rubric_dpia_preliminary_risk_has_review_cycle", dimension: "intelligence", severity: "low",
    description: "The DPIA states residual-risk ratings as reflecting the mitigating measures recorded in the assessment record, with later change handled by Article 35(11) review (stated in Section 6). Do NOT flag the risk narrative as vague or under-actionable for not naming a re-scoring date, owner, or procedure — Art. 35(11) change-triggered review IS the correct, complete re-verification mechanism for a signed-off DPIA. Also: an approval or sign-off date that PRECEDES the processing's launch date (or the report's own generation date) does not make an approved determination inconsistent — DPIAs are, by design, approved to proceed before the processing launches (GDPR Art. 35(1)), and a report may be rendered from an assessment record approved earlier; the report itself now notes this where the dates differ. Do NOT fail rubric_actionability for either pattern." },
  // 2026-08-25 (batch 6207ee82, dpia citation finding): recording the
  // controller's asserted lawful basis is the tool's design, not a defect.
  { id: "rubric_dpia_lawful_basis_is_recorded_not_adjudicated", dimension: "citation", severity: "low",
    description: "The lawful-basis table records the CONTROLLER'S asserted Article 6(1) basis together with the statutory source the controller names (e.g. Art. 6(1)(c) with a named national provision such as s. 2(1) HSWA 1974 / reg. 3 MHSWR 1999), and the report's finding is expressly limited to whether the basis is 'supported based on the information the company provided.' Whether the named obligation mandates the SPECIFIC processing with sufficient precision is a legal determination reserved to the controller and its counsel — this assessment records the assertion and its source; it does not adjudicate sufficiency, and the Section 2 preamble says so. Do NOT fail rubric_citation_misapplied for the report reproducing the controller's asserted basis without independently testing whether the cited obligation mandates the specific processing. DO still fail it where the report itself misstates what a cited provision says, or attaches a citation to a proposition the provision does not support." },
  // 2026-08-25 (batch be0f9e02, dpia actionability finding): the executive
  // summary is deliberately the ratified canonical model, not a remediation
  // plan.
  { id: "rubric_dpia_exec_summary_is_canonical", dimension: "intelligence", severity: "low",
    description: "The DPIA executive summary follows the ratified canonical model: risk counts, the highest residual band, and a pointer to Section 4's risk record. Company-specific remediation targets and deadlines (e.g. a dated portal rollout, works-council consultation dates) render where the record carries them — the risk register's measures, the DPO-advice block in Section 5, and Section 6's approval basis — not in the executive summary. Before failing rubric_actionability against the executive summary for not enumerating remediation targets or deadlines, check Sections 4–6 for them; fail only if the intake-supplied remediation detail renders NOWHERE in the document." },
];

// QB-P25 B2 — Governance rubric note.
// When the generator emits recommended_action_v2 or regulatory_basis_v2, those
// objects are DESIGNED, structured output; never grade their JSON shape or
// key names as an "internal-reasoning leak" or as "internal metadata." They
// are additive to the legacy strings (recommended_action / regulatory_basis /
// suggested_owner / suggested_timeline) and never replace them. If both are
// present, grade the substance in the legacy strings AND the substance in
// the v2 objects as a single finding; do not double-count the same content
// as either strength or weakness.
const RUBRIC_GOVERNANCE: RubricCheck[] = [
  { id: "rubric_governance_v2_shape_is_designed", dimension: "hallucination", severity: "low",
    description: "recommended_action_v2 / regulatory_basis_v2 are DESIGNED structured outputs (QB-P25 B2); never deduct for their presence or their JSON shape. Grade substance only." },
];

// QB-P25 B3 — RISK rubric note. When exception_analysis or record_sufficiency
// carry strengthen_item_ids (pointer array into strengthen_items), the item
// text lives ONCE in strengthen_items (single home). The pointer array itself
// is DESIGNED structural output; never grade it as an "internal-reasoning
// leak" or count strengthen_items + strengthen_item_ids as duplicated content
// (they are one item viewed via a pointer). adverse_effects[].likelihood and
// .severity are the § 7152 four-value enums (Unlikely/Possible/Likely/Highly
// likely; Minimal/Moderate/Significant/Severe); do not deduct for enum
// terseness. priority_actions[].rank is mechanically renumbered 1..N by the
// post-processor; do not comment on ordering rationale unless the substance
// of a specific action is wrong. information_needed remains under the frozen
// open-items contract and is NEVER a strengthen home.
const RUBRIC_RISK: RubricCheck[] = [
  { id: "rubric_risk_v2_pointers_are_designed", dimension: "hallucination", severity: "low",
    description: "strengthen_item_ids pointers (exception_analysis / record_sufficiency) are DESIGNED structured output (QB-P25 B3); never grade as content duplication or metadata leak. Score substance in the pointed-to strengthen_items entry ONCE." },
];

// 2026-08-25 (batch 6207ee82, cppa-cyber boilerplate finding) — CYBER
// rubric note. The per-component comparative-orientation frame ("For
// comparative context, the HIPAA Security Rule addresses [X] under 45 CFR
// Part 164; the operative requirement here is 11 CCR § 7123(c)(N)") is the
// RATIFIED framing the spine mandates: comparative-framework references are
// orientation only, and the operative requirement is always the cited CCPA
// regulation, stated per component in a deliberately uniform frame.
const RUBRIC_CYBER: RubricCheck[] = [
  { id: "rubric_cyber_comparative_frame_is_ratified", dimension: "analysis", severity: "low",
    description: "The recurring per-component comparative-context frame (comparative framework named for orientation; 'the operative requirement here is 11 CCR § 7123(c)(N)' closing the sentence) is DESIGNED, ratified framing — the spine requires comparative-framework references to remain orientation-only with the operative CCPA citation restated per component. Do NOT score the frame's recurrence across components as generic boilerplate when the bracketed content (framework provision, component, subsection) varies by component. DO still fail rubric_generic_boilerplate where the SUBSTANTIVE finding or remediation text itself repeats across components without component-specific content." },
];

const RUBRIC_CHECKS: Record<string, RubricCheck[]> = {
  "cppa-admt": [...RUBRIC_GENERAL, ...RUBRIC_ADMT],
  "governance": [...RUBRIC_GENERAL, ...RUBRIC_GOVERNANCE],
  "cppa-risk": [...RUBRIC_GENERAL, ...RUBRIC_RISK],
  "dpia": [...RUBRIC_GENERAL, ...RUBRIC_DPIA],
  "cppa-cyber": [...RUBRIC_GENERAL, ...RUBRIC_CYBER],
  // All other tools use the general list. Add tool-specific entries here as they're identified.
};

function rubricFor(tool: string): RubricCheck[] {
  return RUBRIC_CHECKS[tool] ?? RUBRIC_GENERAL;
}

// Startup assertion: rubric ids and deterministic ids must not collide
(function assertIdsDisjoint() {
  const detIds = new Set(CHECKS.map(c => c.id));
  const allRubricIds = new Set<string>();
  for (const list of Object.values(RUBRIC_CHECKS)) for (const r of list) allRubricIds.add(r.id);
  for (const r of RUBRIC_GENERAL) allRubricIds.add(r.id);
  const overlap = [...allRubricIds].filter(id => detIds.has(id));
  if (overlap.length) {
    throw new Error(`RUBRIC_CHECKS/CHECKS id overlap: ${overlap.join(", ")}`);
  }
})();

function rubricChecklistText(checks: RubricCheck[]): string {
  return checks.map(c => `- id: "${c.id}"  [${c.dimension}/${c.severity}] — ${c.description}`).join("\n");
}

function buildRubricSystemPrompt(role: "claude" | "gpt", tool: string): string {
  const checks = rubricFor(tool);
  return `You are a quality assurance reviewer (${role.toUpperCase()}) for an AI-generated legal compliance document platform.

Evaluate the document against the FIXED checklist below. Score each dimension 0–100.

DIMENSIONS:
1. accuracy       — Legal conclusions correct for the intake facts.
2. citation       — Cited sections are real, correctly numbered, and correctly applied.
3. hallucination  — HIGHER = LESS hallucination. No invented facts or non-existent regulations.
4. analysis       — Reasoning is specific to THIS intake, not generic boilerplate.
5. intelligence   — Output is actionable for a real compliance professional.
6. formatting     — Clean output; no AI meta-commentary.

CORPUS-VERIFIED RECENT AMENDMENTS (do not deduct for these): the platform's legal corpus is verified against official texts, including changes that may postdate your training knowledge. The following are CORRECT statements of current law; treat them as accurate, do not flag them for verification, and do not deduct from any dimension for asserting them: (1) Cal. Civ. Code § 1798.82, as amended by SB 446 (effective January 1, 2026): individual notice within 30 calendar days of discovery or notification per (a)(2)(A); for breaches affecting more than 500 California residents, a single sample copy to the California Attorney General within 15 calendar days of consumer notice per (f); both statutory delay allowances retained per (a)(2)(B). (2) CCPA post-CPRA subsection lettering in Cal. Civ. Code § 1798.140: 'service provider' is defined at subsection (ag), not the pre-2020 (v) lettering. (3) UK GDPR Article 6(11), inserted by the Data (Use and Access) Act 2025 (recognised-legitimate-interests examples: direct marketing, intra-group transmission for internal administrative purposes, network and information security). (4) EDPB “Data Protection Impact Assessment” template v1.0 and its section structure (0 Overview, 1 Description, 2 Analysis, 3 Necessity and proportionality, 4 Risk management, 5 Interested parties, 6 Conclusion), together with the assessment-team and validation/approval fields at § 0.5: this is a real, published EDPB template, and documents following it must not be flagged as inventing a framework or citing a non-existent source. This list is exhaustive: it does not license any OTHER uncited or unverifiable legal claim, and all normal citation and hallucination scrutiny continues to apply to everything else.

SPELLING NEUTRALITY (CEO Ruling R-15C-1 revised, QLB-F3): US and British spelling differences are NEVER a deduction under ANY dimension. Ignore spelling variety entirely — do not flag "organisation" vs "organization", "recognise" vs "recognize", "behaviour" vs "behavior", or any other locale variant. House-style locale is enforced by the Product Prompts, not by this grading rubric.

BRACKETED FILL-IN MARKERS (CEO Ruling R-15C-2, QLB-F3): bracketed fill-in placeholders — including "[TO BE COMPLETED …]", "[TO BE COMPLETED: <detail>]", "[TO COMPLETE — <detail>]", "[TO BE ASSESSED]", and equivalent square-bracketed forms — are MANDATED anti-fabrication placeholders emitted per the Product Prompt's Priority 1 fact-discipline rule. Their presence is NEVER a deduction under ANY rubric check (not an internal-reasoning leak, not incompleteness, not lack of actionability, not boilerplate, not any other dimension). Grade the substance PRESENT in the document; deferral density is policed by product lint, not by this rubric.

PROFESSIONAL-DEFAULTS MARKERS (POST-DPA-FIX-1 T4(a), QB-P15 followup): the parenthetical "(default — confirm)" (also "(default -- confirm)" or "(default - confirm)") is a MANDATED DPA drafting artefact used to mark professional-standard defaults — TLS 1.2+, AES-256 at rest, annual BC/DR test, quarterly vulnerability scans, 30-day sub-processor objection window, 30-day Art. 35 assistance turnaround, quarterly access reviews, 24-hour deprovisioning, and the enumerated peers. Its presence is NEVER a rubric deduction under ANY dimension (not actionability, not incompleteness, not internal-reasoning leak, not boilerplate). The marker is the Product Prompt's designed output; do not treat it as unfinished or as a placeholder defect.

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

// ITEM 325 — the grader payload header carries the fixture VARIANT alongside
// the fixture set, so a Perfect vs Messy run is distinguishable in the graded
// transcript itself, not only in the DB row. Null variant ⇒ byte-identical to
// the pre-ITEM-325 header (legacy /admin/quality-batch behaviour unchanged).
function stampVariant(fixtureSet: string | null, variant: FixtureVariant | null): string | null {
  if (!variant) return fixtureSet;
  return fixtureSet ? `${fixtureSet} [variant=${variant}]` : `[variant=${variant}]`;
}

// SO-FINAL-TEST — grader mode. NULL/"legacy" is the untouched BODY_FIELDS path
// used by /admin/quality-batch and /admin/final-test; "skeleton" grades
// report.skeleton_document as the entire body.
export type GraderMode = "legacy" | "skeleton";

async function evaluateDocumentClaude(tool: string, intake: any, report: any, fixtureVariant: FixtureVariant | null = null, graderMode: GraderMode = "legacy"): Promise<any> {
  // F3: deterministic checks scoped to this tool
  const applicableChecks = CHECKS.filter(c => !c.tools || c.tools.includes(tool));
  const detFindings = applicableChecks.map(c => {
    try {
      const r = c.run(intake ?? {}, report ?? {});
      return { check_id: c.id, check_type: "deterministic", dimension: c.dimension, severity: c.severity, passed: r.passed, evidence: r.evidence ?? null, proposed_fix: null };
    } catch (e) {
      return { check_id: c.id, check_type: "deterministic", dimension: c.dimension, severity: c.severity, passed: false, evidence: `Error: ${(e as Error).message?.slice(0, 80)}`, proposed_fix: null };
    }
  });

  // Build a check_id → metadata map so we can backfill missing ids with their canonical
  // dimension/severity if the model omits or invents them.
  const rubricMeta = new Map(rubricFor(tool).map(r => [r.id, r]));

  // QLB-F3: body-first, metadata-stripped, equal-budget grader payload.
  const family = familyForBatchTool(tool);
  const useSkeleton = graderMode === "skeleton" && hasSkeletonDocument(report);
  if (graderMode === "skeleton" && !useSkeleton) {
    console.warn(`[run-quality-batch] skeleton_grader_no_document tool=${tool} role=claude — falling back to legacy payload`);
  }
  const payload = useSkeleton
    ? buildSkeletonGraderPayload(report, SKELETON_GRADER_BUDGET, { fixtureSet: stampVariant(matchFixtureSet(tool, intake), fixtureVariant) })
    : family
    ? buildGraderPayload(family, report, GRADER_PAYLOAD_BUDGET, { fixtureSet: stampVariant(matchFixtureSet(tool, intake), fixtureVariant) })
    : { text: JSON.stringify(report ?? {}).slice(0, GRADER_PAYLOAD_BUDGET), truncated: (JSON.stringify(report ?? {}).length > GRADER_PAYLOAD_BUDGET), original_length: JSON.stringify(report ?? {}).length };
  if (payload.truncated) {
    console.warn(`[run-quality-batch] payload_truncated tool=${tool} role=claude original_length=${payload.original_length} budget=${useSkeleton ? SKELETON_GRADER_BUDGET : GRADER_PAYLOAD_BUDGET}`);
  }

  let claudeResult: any = null;
  try {
    const sys = buildRubricSystemPrompt("claude", tool) + (useSkeleton ? SKELETON_BLOCK_KIND_ADDENDUM : "");
    const raw = await claude(sys, `TOOL: ${tool}\nINTAKE: ${sliceIntakeForGrader(intake, tool)}\nREPORT:\n${payload.text}\nEvaluate this report. Quote actual text as evidence for each finding.`, 5000);
    claudeResult = tryParse(raw);
  } catch (e) {
    console.warn("[run-quality-batch] Claude rubric eval failed:", (e as Error).message);
  }



  // QB-P17 item 1 — PARSE-FAILURE QUARANTINE. If Claude returned nothing
  // parseable, do NOT synthesize an all-60s eval — that made infrastructure
  // failure indistinguishable from product regression. Signal the caller so
  // the doc is marked eval_failed and excluded from aggregates + stop-rule.
  if (!claudeResult || typeof claudeResult !== "object" || !claudeResult.dimension_scores) {
    console.warn(`[run-quality-batch] eval_failed tool=${tool} — Claude result null/unparseable`);
    return null;
  }

  // F2: unified `findings` (no more llm_findings); enforce fixed ids
  const rawLlmFindings: any[] = claudeResult?.findings ?? claudeResult?.llm_findings ?? [];
  // GRADER-CAL-1 A2/A3/A4 — drop NOTE-block leaks, whitelisted authorities,
  // and affirmation-shaped "findings" before mapping to schema.
  // QB-P14 item 4 — `suppressed` carries the dropped findings' evidence
  // (first 300 chars) so the caller can log an audit trail.
  const { kept: filteredRaw, dropped: cal1Dropped, suppressed: cal1Suppressed } = applyGraderCal1Filter(rawLlmFindings as any);
  if (cal1Dropped.a2 || cal1Dropped.a3 || cal1Dropped.a4 || cal1Dropped.r15c2 || cal1Dropped.dpa_defaults) {
    console.log(`[GRADER-CAL-1][claude] tool=${tool} dropped a2=${cal1Dropped.a2} a3=${cal1Dropped.a3} a4=${cal1Dropped.a4} r15c2=${cal1Dropped.r15c2} dpa_defaults=${cal1Dropped.dpa_defaults}`);
  }

  // PROMPT 10A — CONVERTED-DOCUMENT CALIBRATION. Skeleton mode only. Filtered
  // findings are removed from SCORING but persisted (flagged) by the caller.
  const skelCal = useSkeleton
    ? applySkeletonCalibration(filteredRaw as any, { report })
    : { kept: filteredRaw as any[], filtered: [] as any[], counts: null as any };
  const calibrationFiltered = skelCal.filtered.map((x: any) => {
    const meta = rubricMeta.get(x.check_id);
    return {
      check_id: x.check_id,
      rule: x.rule,
      template_id: x.template_id ?? null,
      dimension: meta?.dimension ?? "analysis",
      severity: meta?.severity ?? "medium",
      evidence: (x.finding?.evidence ?? null) as string | null,
    };
  });
  if (calibrationFiltered.length) {
    console.log(`[SKELETON-CAL][claude] tool=${tool} version=${SKELETON_CAL_VERSION} filtered=${calibrationFiltered.map((c) => c.rule).join(",")}`);
  }

  const llmFindings = skelCal.kept
    .filter(f => rubricMeta.has((f as any).check_id))
    .map(f => {
      const meta = rubricMeta.get((f as any).check_id)!;
      return { check_id: (f as any).check_id, check_type: "llm", dimension: meta.dimension, severity: meta.severity, passed: !!(f as any).passed, evidence: (f as any).evidence ?? null, proposed_fix: null };
    });

  const scores = {
    accuracy:      claudeResult?.dimension_scores?.accuracy      ?? 60,
    citation:      claudeResult?.dimension_scores?.citation      ?? 60,
    hallucination: claudeResult?.dimension_scores?.hallucination ?? 60,
    analysis:      claudeResult?.dimension_scores?.analysis      ?? 60,
    intelligence:  claudeResult?.dimension_scores?.intelligence  ?? 60,
    formatting:    claudeResult?.dimension_scores?.formatting    ?? 60,
  };
  const penalized = applyDeterministicPenalties(scores as any, detFindings as any);
  Object.assign(scores, penalized);
  const w = weightsFor(tool);
  // QB-P17 item 2 — keep the unrounded weighted score for gate comparisons.
  // overall_score_display is the human-facing rounded copy.
  const overall_raw = scores.accuracy * w.accuracy + scores.citation * w.citation + scores.hallucination * w.hallucination + scores.analysis * w.analysis + scores.intelligence * w.intelligence + scores.formatting * w.formatting;
  const overall = Math.round(overall_raw);
  return { dimension_scores: scores, overall_score: overall_raw, overall_score_display: overall, findings: [...detFindings, ...llmFindings], strengths: claudeResult?.strengths ?? [], critical_failures: claudeResult?.critical_failures ?? [], post_filter_dropped: cal1Dropped, post_filter_suppressed: cal1Suppressed, calibration_filtered: calibrationFiltered, calibration_counts: skelCal.counts };
}

async function evaluateDocumentGPT(tool: string, intake: any, report: any, fixtureVariant: FixtureVariant | null = null, graderMode: GraderMode = "legacy"): Promise<{ eval: any | null; skipReason?: string; error?: string; postFilterDropped?: { a2: number; a3: number; a4: number; r15c2: number; dpa_defaults: number }; postFilterSuppressed?: Array<{ rule: string; check_id: string; evidence: string }>; calibrationFiltered?: any[] }> {
  if (!OPENAI_API_KEY) {
    return { eval: null, skipReason: "OPENAI_API_KEY not set in edge function env" };
  }
  try {
    const editorialNote = isEditorial(tool)
      ? `\n\nEDITORIAL RUBRIC OVERRIDE: This is editorial copy. Score "formatting" as 100 (N/A). Focus on (1) accuracy of facts and law, (2) citation fidelity, (3) no_adaptive_guidance.`
      : "";
    // QLB-F3: same body-first payload + equal budget as Claude path.
    const family = familyForBatchTool(tool);
    // SO-FINAL-TEST — additive skeleton path, mirroring the Claude branch.
    const useSkeleton = graderMode === "skeleton" && hasSkeletonDocument(report);
    if (graderMode === "skeleton" && !useSkeleton) {
      console.warn(`[run-quality-batch] skeleton_grader_no_document tool=${tool} role=gpt — falling back to legacy payload`);
    }
    const sys = buildRubricSystemPrompt("gpt", tool) + (useSkeleton ? SKELETON_BLOCK_KIND_ADDENDUM : "");
    const payload = useSkeleton
      ? buildSkeletonGraderPayload(report, SKELETON_GRADER_BUDGET, { fixtureSet: stampVariant(matchFixtureSet(tool, intake), fixtureVariant) })
      : family
      ? buildGraderPayload(family, report, GRADER_PAYLOAD_BUDGET, { fixtureSet: stampVariant(matchFixtureSet(tool, intake), fixtureVariant) })
      : { text: JSON.stringify(report ?? {}).slice(0, GRADER_PAYLOAD_BUDGET), truncated: (JSON.stringify(report ?? {}).length > GRADER_PAYLOAD_BUDGET), original_length: JSON.stringify(report ?? {}).length };
    if (payload.truncated) {
      console.warn(`[run-quality-batch] payload_truncated tool=${tool} role=gpt original_length=${payload.original_length} budget=${useSkeleton ? SKELETON_GRADER_BUDGET : GRADER_PAYLOAD_BUDGET}`);
    }
    const raw = await gpt4o(sys, `TOOL: ${tool}\nINTAKE: ${sliceIntakeForGrader(intake, tool)}\nDOCUMENT TO EVALUATE:\n${payload.text}${editorialNote}\nEvaluate this document. Quote actual text as evidence for each finding.`, 5000);

    const parsed = tryParse(raw);
    if (!parsed?.dimension_scores) {
      return { eval: null, error: `GPT returned unexpected structure (first 120 chars: ${raw.slice(0, 120)})` };
    }
    // Normalize findings to only the fixed checklist ids (drop invented ones).
    // GRADER-CAL-1 A2/A3/A4 filter also runs here so the GPT cross-review path
    // mirrors the Claude path exactly.
    const rubricMeta = new Map(rubricFor(tool).map(r => [r.id, r]));
    const rawGpt = parsed.findings ?? [];
    const { kept: gptKept, dropped: gptDropped, suppressed: gptSuppressed } = applyGraderCal1Filter(rawGpt as any);
    if (gptDropped.a2 || gptDropped.a3 || gptDropped.a4 || gptDropped.r15c2 || gptDropped.dpa_defaults) {
      console.log(`[GRADER-CAL-1][gpt] tool=${tool} dropped a2=${gptDropped.a2} a3=${gptDropped.a3} a4=${gptDropped.a4} r15c2=${gptDropped.r15c2} dpa_defaults=${gptDropped.dpa_defaults}`);
    }
    // PROMPT 10A — same calibration on the GPT cross-review path (skeleton only).
    const gptCal = useSkeleton
      ? applySkeletonCalibration(gptKept as any, { report })
      : { kept: gptKept as any[], filtered: [] as any[], counts: null as any };
    const gptCalibrationFiltered = gptCal.filtered.map((x: any) => {
      const meta = rubricMeta.get(x.check_id);
      return {
        check_id: x.check_id,
        rule: x.rule,
        template_id: x.template_id ?? null,
        dimension: meta?.dimension ?? "analysis",
        severity: meta?.severity ?? "medium",
        evidence: (x.finding?.evidence ?? null) as string | null,
      };
    });
    if (gptCalibrationFiltered.length) {
      console.log(`[SKELETON-CAL][gpt] tool=${tool} version=${SKELETON_CAL_VERSION} filtered=${gptCalibrationFiltered.map((c) => c.rule).join(",")}`);
    }
    parsed.findings = gptCal.kept
      .filter((f: any) => rubricMeta.has(f.check_id))
      .map((f: any) => {
        const meta = rubricMeta.get(f.check_id)!;
        return { check_id: f.check_id, dimension: meta.dimension, severity: meta.severity, passed: !!f.passed, evidence: f.evidence ?? null };
      });
    return { eval: parsed, postFilterDropped: gptDropped, postFilterSuppressed: gptSuppressed, calibrationFiltered: gptCalibrationFiltered };

  } catch (e) {
    return { eval: null, error: (e as Error).message };
  }
}

// ===================================================================
// F4 — Deterministic categorization (replaces the LLM reconciler).
// Categories:
//   "deterministic"  — a code-verified (deterministic) failure (ground truth, trusted)
//   "agree"          — both Claude and GPT failed the SAME rubric check
//   "claude_only"    — Claude failed it, GPT did not
//   "gpt_only"       — GPT failed it, Claude did not
//   "agree_pass"     — both passed (not surfaced as a defect)
// ===================================================================
// GRADER-SYM-1 (items 2 & 3) — symmetry helpers.
// Deterministic failures are code-verified ground truth about the SAME
// document, so they must debit BOTH graders' dimension scores. Previously
// only Claude's scores took the 25/12/6/2 severity deductions, which alone
// could explain a large slice of the Claude↔GPT overall deltas.
export function applyDeterministicPenalties(
  scores: Record<string, number>,
  detFindings: Array<{ passed?: boolean; severity?: string; dimension?: string }>,
): Record<string, number> {
  const out: Record<string, number> = { ...scores };
  for (const f of detFindings ?? []) {
    if (f.passed) continue;
    const penalty = f.severity === "critical" ? 25 : f.severity === "high" ? 12 : f.severity === "medium" ? 6 : 2;
    const dim = f.dimension ?? "";
    if (!(dim in out)) continue;
    out[dim] = Math.max(0, out[dim] - penalty);
  }
  return out;
}

// Same weighted formula Claude's path and the batch aggregate use. GPT's
// self-reported `overall_score` is no longer trusted for storage.
export function weightedOverall(scores: Record<string, number>, w: Record<string, number>): number {
  return (scores.accuracy ?? 60) * w.accuracy
    + (scores.citation ?? 60) * w.citation
    + (scores.hallucination ?? 60) * w.hallucination
    + (scores.analysis ?? 60) * w.analysis
    + (scores.intelligence ?? 60) * w.intelligence
    + (scores.formatting ?? 60) * w.formatting;
}

function categorizePerDoc(claudeFail: boolean, gptFail: boolean): string {
  if (claudeFail && gptFail)  return "agree";
  if (claudeFail && !gptFail) return "claude_only";
  if (!claudeFail && gptFail) return "gpt_only";
  return "agree_pass";
}

// Per-tool intake validators. Mirrors the tool's own resolver semantics so the
// quality loop never scores garbage. If validation fails twice for an item, it's
// dropped; if >30% of intakes fail across a run, the caller aborts.
type IntakeValidator = (intake: any) => { ok: boolean; reason?: string };
// RC-REM-P2 / QLB-F2: contract-driven validation. For every tool that has an
// IntakeContract (CONTRACT_BY_TOOL, above), we run validateAgainstContract
// and reject any intake with violations. Extra per-tool rules layered here
// can only tighten, never loosen, contract acceptance. Tools without
// contracts fall through to `{ ok: true }` — matching pre-P2 behavior for
// editorial/QA tools (ask-privacy, weekly-brief, custom-brief, trend-report,
// state-law, registration). QLB-F2 removed the biometric-checker
// jurisdiction-substring rule: contract multi-enum on JURS already enforces
// exact label membership, which is strictly stronger than the substring
// list, and the substring list wrongly rejected four contract-legal options
// ("Other US state", "United States — Federal (FTC)", "Canada (PIPEDA /
// provincial)", "Australia (Privacy Act)").
const INTAKE_VALIDATORS: Record<string, IntakeValidator> = {
  // QB-P22 item 1 — DETERMINISTIC IR RECENCY. Batch d7cd2ff0's ir-playbook
  // fixture carried discoveryDateTime 2025-07-17 (a year old — the prompt-level
  // 7-day recency rule slipped a year), cascading into temporal-regime
  // confusion and a 92→81 score. Reject any intake whose discoveryDateTime is
  // more than 30 days before now or in the future; the caller regenerates once
  // then rejects (same retry pattern as other validation failures).
  "ir-playbook": (intake: any) => {
    const iso = intake?.discoveryDateTime;
    if (typeof iso !== "string" || !iso.trim()) {
      return { ok: false, reason: "ir-playbook.discoveryDateTime missing" };
    }
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) {
      return { ok: false, reason: `ir-playbook.discoveryDateTime not a valid ISO date-time: ${iso}` };
    }
    const now = Date.now();
    const maxPastMs = 30 * 24 * 60 * 60 * 1000;
    if (t > now) {
      return { ok: false, reason: `ir-playbook.discoveryDateTime is in the future: ${iso}` };
    }
    if (now - t > maxPastMs) {
      return { ok: false, reason: `ir-playbook.discoveryDateTime more than 30 days old: ${iso} (age ${Math.round((now - t) / 86_400_000)} days)` };
    }
    return { ok: true };
  },
};
function validateIntake(tool: string, intake: any): { ok: boolean; reason?: string } {
  // Contract check (if any) runs first — it's the machine-derived source of
  // truth. Extra per-tool rules run afterward and can only tighten, never
  // loosen, contract acceptance.
  const contract = CONTRACT_BY_TOOL[tool];
  if (contract) {
    const res = validateAgainstContract(contract, intake ?? {});
    if (!res.ok) {
      const head = res.violations.slice(0, 4)
        .map(v => `${v.key}: ${v.reason}`).join("; ");
      const more = res.violations.length > 4 ? ` (+${res.violations.length - 4} more)` : "";
      return { ok: false, reason: `contract: ${head}${more}` };
    }
  }
  const extra = INTAKE_VALIDATORS[tool];
  return extra ? extra(intake) : { ok: true };
}

async function generateIntakes(tool: string, count: number, extraGuidance?: string, variant?: FixtureVariant | null): Promise<any[]> {
  // NOTE: toolDescriptions is DEAD for contract-backed tools; put guidance in SCENARIO_GUIDANCE or the intake contract, never here.
  // PROMPT 8H item 1(c) — CONTRACT-BACKED TOOLS ARE NOT LISTED HERE.
  // For any tool in CONTRACT_BY_TOOL the live prompt is
  // renderContractPrompt(contract) + SCENARIO_GUIDANCE[tool]; an entry here
  // would be dead code (8E item 9 / 8F item 3 were both lost that way).
  // Schema belongs in the contract, coaching in SCENARIO_GUIDANCE.
  const toolDescriptions: Record<string, string> = {
    "registration": `Registration Manager filing checklist — intake schema for run-registration-assessment. Return objects with EXACTLY these top-level snake_case keys (generator reads intake.organization_name, intake.industry, intake.markets_served, intake.organization_country, intake.organization_size, intake.email — NEVER camelCase). Required top-level fields: organization_name (string), organization_country (string, ISO-2 like "DE","FR","GB","US","CA"), organization_size (one of "1-10","11-50","51-250","251-1000","1000+"), industry (sector string, e.g. "AdTech","Healthcare","FinTech","HR SaaS","EdTech","Retail"), email (string, contact email at organization_name domain), employee_count (string integer, may be ""), annual_revenue_usd (string like "<25M","25M-100M","100M-500M",">500M"), data_subjects_count (string range like "10000-100000"), role (one of "controller","processor","both"), processes_personal_data (boolean), processes_special_categories (boolean), processes_children_data (boolean), large_scale_monitoring (boolean), uses_ai_systems (boolean), ai_high_risk (boolean), ai_general_purpose_provider (boolean), cross_border_transfers (boolean), acts_as_data_broker (boolean), sells_or_shares_personal_info (boolean), processes_biometrics_for_id (boolean), has_eu_establishment (boolean), has_uk_establishment (boolean), eu_lead_member_state (string, ISO-2 EU code when has_eu_establishment; else ""), markets_served (string[] of ISO-2 codes like ["FR","DE","GB","IT","ES","US-CA","US-NY"]). Vary postures (well-prepared multi-EU controller with EU establishment vs missing DPO thresholds vs cross-border transfer without mechanism vs US-only processor vs high-risk AI provider) and jurisdiction sets (single-state, multi-state, EEA+UK, EEA-only, UK-only).`,
    "ask-privacy": `Ask Privacy — natural-language privacy/regulatory Q&A. Required field: question (string, 30-280 chars, a SPECIFIC operational privacy question). Vary topics: GDPR Art. 6 lawful basis edge cases, CPRA opt-out scope, EU AI Act high-risk classification, breach notification timelines per jurisdiction, sensitive-data definitions, cross-border transfer mechanisms post-Schrems II, ADMT pre-use notice timing, biometric data under BIPA vs TX CUBI, DPA controller/processor distinctions, DPO appointment thresholds. Mix easy vs ambiguous; include a few that should produce a "consult counsel" disclaimer.`,
    "weekly-brief": `Weekly Brief generator. Required camelCase fields: subscriberName (string), audience (one of "GC/CPO","Privacy Engineer","Compliance Analyst","Policy Researcher"), focusJurisdictions (array of region/state codes — e.g. ["EU","UK","US-CA","US-NY"]), focusTopics (array — e.g. ["enforcement","new legislation","DPA guidance","AI regulation","ad-tech"]), excludeTopics (array, may be empty), timeWindowDays (integer 7–14). Vary audience and breadth — some broad/multi-jurisdiction, some deep-niche (e.g. AdTech in California only).`,
    "custom-brief": `Custom Brief generator. Required camelCase fields: subscriberName (string), briefTitle (string, descriptive), researchQuestion (string, 60–280 chars, a specific research/horizon-scan question), jurisdictions (array of region/state codes), topics (array of focus topics), timeWindowDays (integer 14–90), depth (one of "summary","comprehensive"). Vary topics (ADMT, BIPA enforcement, EU AI Act, dark patterns, children's privacy, biometric privacy in retail, employee monitoring) and depth.`,
    "trend-report": `Trend Report generator. Required camelCase fields: theme (string, the trend theme — e.g. "AI Act high-risk classification convergence", "Biometric privacy enforcement trends 2026", "Cross-border transfer mechanism shifts post-Schrems II"), jurisdictions (array), industries (array, e.g. ["AdTech","HealthTech","FinTech","Retail","HR/EmpTech"]), timeWindowMonths (integer 3–24), audience (one of "Executive","Legal","Engineering"). Vary themes (some highly active, some quieter), audiences, and windows.`,
    "state-law": `US State Privacy Law check. Required camelCase fields: state (one of "California","Colorado","Connecticut","Virginia","Texas","Utah","Oregon","Washington","Maryland","Tennessee","Indiana","Iowa","Montana","Delaware","New Jersey","New Hampshire","Kentucky","Minnesota","Rhode Island"), businessType (sector string), processingActivities (string description), dataCategories (array including some sensitive types), consumerVolume (string range like "10000-100000"), sellsSharesPI (boolean), hasOptOutMechanism (boolean), question (string — a specific compliance question about this state's law). Vary states and posture (some near-threshold, some clearly in-scope, some borderline).`,
  };
  // RC-REM-P2: for every tool with a contract, the schema portion of the
  // prompt is derived MECHANICALLY from the contract (verbatim enum
  // options, exact key list, "[]" array shape, conditional rules). The
  // per-tool coaching (sector/posture mix) still comes from
  // SCENARIO_GUIDANCE. Tools without a contract keep their pre-P2
  // hand-typed description.
  const contractForTool = CONTRACT_BY_TOOL[tool];
  const baseDescription = contractForTool
    ? `${renderContractPrompt(contractForTool)}\n\nScenario guidance: ${SCENARIO_GUIDANCE[tool] ?? ""}`.trim()
    : (toolDescriptions[tool] ?? `${tool} compliance tool. Use realistic and varied scenarios.`);
  // PROMPT 12F item 2 — CONSTRAINT SALIENCE. On the perfect variant the compact
  // hard-constraint block leads the prompt, BEFORE the contract render; the full
  // guidance below is byte-unchanged. Other variants are untouched.
  const description = variant === "perfect"
    ? `${(await import("./_local/quality/perfect-closed-loop.ts")).PERFECT_HARD_CONSTRAINTS}\n\n${baseDescription}`
    : baseDescription;
  // SO-FT INTAKE-STREAM (2026-08-11): the fixed-ceiling approach kept failing —
  // cppa-cyber died at 180s, cppa-risk at 300s ("Signal timed out"), each taking
  // its whole child run with it. Intake generation now STREAMS, so the guard is
  // an idle-gap deadline (120s with no bytes) plus a generous total ceiling,
  // instead of a total-duration guess. Verbose schemas also chunk smaller (2)
  // so each call is shorter and a retry is cheap.
  const idleTimeoutMs = 120_000;
  const totalTimeoutMs = 600_000;

  const VERBOSE = new Set(["lia", "dpia", "governance", "cppa-risk", "cppa-admt", "cppa-cyber"]);
  const chunkSize = VERBOSE.has(tool) ? 2 : count;


  // QB-P6 — expanded intake-generator system prompt. Preserves the original
  // sentence verbatim and adds five richness rules (a)–(e).
  const sys = `You generate realistic, varied test intake objects for privacy compliance tools. Use realistic company names and vary compliance posture — some nearly compliant, some with gaps, some edge cases. Never generate all-compliant inputs. Return ONLY a valid JSON array, no markdown.

(a) NAMED-OBJECT DENSITY — every narrative or free-text field must name concrete objects: real-sounding systems and vendors, officers with role titles and plausible names, datasets, cadences, and figures, so a downstream generator can tie every recommendation to a named intake fact.
(b) CROSS-FIELD COHERENCE — narratives must agree with the enum answers, sector, jurisdictions, and volumes; no contradictions between fields. (QB-P22 item 3) Every list-field entry names exactly ONE product/tool/vendor — NEVER slash-alternatives ("Otter.ai / Fireflies"), NEVER "X or Y". Ambiguous alternatives get treated by downstream generators as multiple vendors and produce vendor-count hallucinations. If two products are actually in use, emit them as two separate array entries.
(c) TEMPORAL COHERENCE — all dates recent and mutually consistent.
(d) BUSINESS-FACTS-ONLY — fixture text states facts about the business, never propositions of law (no adequacy claims, no statutory interpretations, no SCC-module or section assertions), except where a tool's scenario guidance explicitly mandates specific legal phrasing.
(e) NAME VARIETY — vary company names across scenarios and chunks; never reuse the same base name (e.g. "Meridian") across scenarios.`;

  const out: any[] = [];
  let chunkIdx = 0;
  while (out.length < count) {
    const remaining = count - out.length;
    const n = Math.min(chunkSize, remaining);
    chunkIdx++;
    // Up to THREE attempts with backoff on a failed chunk call. A whole batch
    // must not die because a single generator call stalled.
    let raw: string | undefined;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        raw = await claudeStreamed(
          sys,
          `Generate ${n} varied realistic intake objects for the "${tool}" compliance tool.\n\n${description}\n\nThis is chunk ${chunkIdx}; vary scenarios from any prior chunks. Return a JSON array of exactly ${n} objects.${extraGuidance ? `\n\n${extraGuidance}` : ""}`,
          16000,
          "claude-sonnet-4-6",
          { idleTimeoutMs, totalTimeoutMs },
        );
        if ((raw ?? "").trim().length === 0) throw new Error("empty stream response");
        break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (attempt === 3) throw e;
        console.warn(`[generateIntakes] ${tool} chunk ${chunkIdx} attempt ${attempt} failed (${msg}) — retrying in 5s`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }


    const parsed = tryParse(raw ?? "");
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const tail = (raw ?? "").slice(-400);
      const head = (raw ?? "").slice(0, 200);
      console.error(`[generateIntakes] parse failed for ${tool} chunk ${chunkIdx}. len=${raw?.length ?? 0} head=${JSON.stringify(head)} tail=${JSON.stringify(tail)}`);
      throw new Error(`Intake generator returned invalid data for ${tool} (chunk ${chunkIdx}, len=${raw?.length ?? 0})`);
    }
    out.push(...parsed);
    if (chunkIdx > 20) break; // safety
  }
  return out.slice(0, count);
}

// Validate a generated batch; for each failing intake, attempt ONE single-item
// regeneration. Drop persistent failures. Returns final accepted intakes plus
// rejection metadata so the caller can enforce the >30% failure guard.
//
// PROMPT 8G (2026-08-12) — CHUNK-SAFE INTAKE GENERATION. The previous shape
// produced ALL scenarios inside ONE model call inside ONE isolate. For VERBOSE
// tools (dpia's spec grew again at 8F) that single blocking await can run past
// the 400s isolate hard-kill, and a single await has no interior deadline
// checkpoint — so the guard never fires and the reaper later absorbs the run
// (runs #178 and #180, 2026-08-12; the #62 class, reproducible). Generation is
// now ONE SCENARIO PER MODEL CALL with the isolate deadline checked BETWEEN
// calls; on deadline the caller persists the partial intake set and
// self-reinvokes into a fresh isolate, resuming at the next scenario — exactly
// the per-doc chunking pattern.

// Screen ONE generated intake: fixture lint (grader-collision screen) applied
// BEFORE contract validation, each with ONE single-item regeneration.
export type RejectedAttempt = { attempt: number; reason: string; intake: any };

// PROMPT 12F item 3 — KIND-AWARE FAIL POLICY. A rejection carries the class of
// defect so the caller can decide between repair, fresh regeneration, skip and
// abort. "carve_out" and "lint" are model-behaviour defects (retryable);
// "contract" is a spec mismatch (abort); "generation" is transport failure.
export type RejectionKind = "carve_out" | "lint" | "contract" | "generation";

/** The deficiency-kind → rejection-kind map used by screenIntake. */
export function rejectionKindForLint(linted: { deficiencies?: any[] } | null | undefined): RejectionKind {
  const d = Array.isArray(linted?.deficiencies) ? linted!.deficiencies! : [];
  return d.some((x: any) => x?.kind === "carve_out") ? "carve_out" : "lint";
}

export async function screenIntake(
  tool: string,
  item: any,
  lintFixture: (x: any) => { reason: string; path?: string; deficiencies?: any[] } | null | undefined,
  extraGuidance?: string,
  /** Test seam — production leaves this undefined. */
  _generate?: (tool: string, n: number, extraGuidance?: string, variant?: FixtureVariant | null) => Promise<any[]>,
  /** PROMPT 12F item 2 — variant threaded into the generation prompt. */
  variant?: FixtureVariant | null,
): Promise<{ ok: true; intake: any } | { ok: false; reason: string; kind: RejectionKind; attempts: RejectedAttempt[] }> {
  const generateIntakes_ = _generate ?? generateIntakes;
  // PROMPT 9D item 3 — the fixture-lint constraint set (blacklist phrases from
  // the shared module, hedges, leak rules, statute allowlist) is named in BOTH
  // repair prompts. Never a duplicated list.
  const { fixtureConstraintGuidance } = await import("./_local/quality/fixture-lint.ts");
  const constraints = fixtureConstraintGuidance();
  const linted = lintFixture(item);
  let candidate = item;
  // PROMPT 12G item 0 — CARVE-OUT SKIPS REPAIR. A carve-out rejection can only
  // be fixed by a REMOVAL, so a repair attempt is definitionally wrong: the
  // assembled repair prompt would append the unconditional "REPAIR MODE …
  // byte-identical" frame after the kind-aware guidance and reproduce the
  // violation (12F verification). The slot is rejected immediately with kind
  // "carve_out"; the chunked loop's fresh-regeneration path (screenNoRepair)
  // takes it from there — max TWO model calls per carve_out slot.
  if (linted && rejectionKindForLint(linted as any) === "carve_out") {
    console.warn(`[fixture-lint] ${tool}: ${linted.reason} — carve-out, skipping repair (fresh regeneration only)`);
    return {
      ok: false,
      kind: "carve_out",
      reason: `lint: ${linted.reason}`,
      attempts: [{ attempt: 1, reason: `lint: ${linted.reason}`, intake: item }],
    };
  }
  if (linted) {
    console.warn(`[fixture-lint] ${tool}: ${linted.reason} @ ${(linted as any).path} — repairing once`);

    try {
      // PROMPT 8K — FEEDBACK LOOP: when the closed-loop perfect lint rejects,
      // the SPECIFIC deficiency list is fed to the generator as retry guidance
      // (retry cap unchanged: ONE single-item regeneration).
      // PROMPT 9C item 3 — RETRY BECOMES REPAIR: the rejected intake is handed
      // back verbatim so the model ADDS the missing facts instead of inventing
      // a fresh scenario that fails on a different axis.
      let retryGuidance = extraGuidance;
      if (Array.isArray((linted as any).deficiencies) && (linted as any).deficiencies.length) {
        const { perfectRetryGuidance } = await import("./_local/quality/perfect-closed-loop.ts");
        const fb = perfectRetryGuidance((linted as any).deficiencies);
        retryGuidance = retryGuidance ? `${retryGuidance}\n\n${fb}` : fb;
      }
      retryGuidance = `${retryGuidance ? `${retryGuidance}\n\n` : ""}REPAIR MODE — this is not a new scenario. The object below was rejected for the reason(s) listed above. Return this same object with the listed facts added; change nothing else. Every field not named in the deficiency list must come back byte-identical.\n\n${constraints}\n\nREJECTED INTAKE JSON:\n${JSON.stringify(item)}`;
      const retry = await generateIntakes_(tool, 1, retryGuidance, variant);
      const relint = retry[0] ? lintFixture(retry[0]) : { reason: "regeneration returned no item" };
      if (relint) {
        const r2reason = (relint as any).reason ?? "reject";
        const where = [(relint as any).path, (relint as any).sample].filter(Boolean).join(" :: ");
        // PROMPT 9D item 3 — when the repair is rejected for a DIFFERENT reason
        // than the original, both reasons and the offending passage/path are
        // named in the persisted error and the progress log.
        const differs = r2reason !== linted.reason;
        const reason = differs
          ? `lint: ${linted.reason}; retry REJECTED FOR A DIFFERENT REASON: ${r2reason}${where ? ` @ ${where}` : ""}`
          : `lint: ${linted.reason}; retry: ${r2reason}`;
        return {
          ok: false,
          reason,
          kind: rejectionKindForLint(linted as any),
          attempts: [
            { attempt: 1, reason: `lint: ${linted.reason}`, intake: item },
            { attempt: 2, reason: `retry lint: ${r2reason}${where ? ` @ ${where}` : ""}`, intake: retry[0] ?? null },
          ],
        };
      }
      candidate = retry[0];
    } catch (e) {
      return {
        ok: false,
        kind: "generation",
        reason: `lint regenerate failed — ${(e as Error).message}`,
        attempts: [{ attempt: 1, reason: `lint: ${linted.reason}`, intake: item }],
      };
    }
  }

  const r = validateIntake(tool, candidate);
  if (r.ok) return { ok: true, intake: candidate };
  console.warn(`[validateIntake] ${tool}: ${r.reason} — repairing once`);
  try {
    // PROMPT 9C item 3 — repair, not regenerate.
    const repairGuidance = `${extraGuidance ? `${extraGuidance}\n\n` : ""}REPAIR MODE — this is not a new scenario. The object below failed contract validation: ${r.reason ?? "contract violation"}. Return this same object with the listed facts added; change nothing else. Every field not named above must come back byte-identical.\n\n${constraints}\n\nREJECTED INTAKE JSON:\n${JSON.stringify(candidate)}`;
    const retry = await generateIntakes_(tool, 1, repairGuidance, variant);
    const r2 = retry[0] ? validateIntake(tool, retry[0]) : { ok: false, reason: "regeneration returned no item" };
    if (r2.ok) return { ok: true, intake: retry[0] };
    console.warn(`intake rejected (${tool}): ${r2.reason}`);
    const differs = (r2.reason ?? "unknown") !== (r.reason ?? "contract violation");
    return {
      ok: false,
      kind: "contract",
      reason: differs
        ? `contract: ${r.reason ?? "contract violation"}; retry REJECTED FOR A DIFFERENT REASON: ${r2.reason ?? "unknown"}`
        : (r2.reason ?? "unknown"),
      attempts: [
        { attempt: 1, reason: `contract: ${r.reason ?? "contract violation"}`, intake: candidate },
        { attempt: 2, reason: `retry contract: ${r2.reason ?? "unknown"}`, intake: retry[0] ?? null },
      ],
    };
  } catch (e) {
    console.warn(`intake rejected (${tool}): regenerate failed — ${(e as Error).message}`);
    return {
      ok: false,
      kind: "generation",
      reason: (e as Error).message,
      attempts: [{ attempt: 1, reason: `contract: ${r.reason ?? "contract violation"}`, intake: candidate }],
    };
  }
}

export type IntakeGenProgress = {
  accepted: any[];
  // PROMPT 9D item 2 — OBSERVABILITY: the FULL rejected intake JSON is carried
  // with its reason and attempt number (both attempts when a repair retry also
  // fails, so the two objects can be diffed). This structure is persisted as
  // part of quality_runs.partial_state (state.intakeGen) — the existing
  // service-role-only jsonb surface; no new column or table. Fixtures are
  // synthetic, so no customer data is stored.
  rejected: { reason: string; attempts?: RejectedAttempt[] }[];
  totalAttempted: number;
};


export function emptyIntakeGenProgress(): IntakeGenProgress {
  return { accepted: [], rejected: [], totalAttempted: 0 };
}

// Company names already used, so each fresh single-scenario call can be told
// what to avoid (rule (e) NAME VARIETY has no cross-call memory otherwise).
export function usedNames(intakes: any[]): string[] {
  const out: string[] = [];
  for (const i of intakes) {
    const n = i?.organization_name ?? i?.organisation_name ?? i?.company_name ?? i?.subscriberName;
    if (typeof n === "string" && n.trim()) out.push(n.trim());
  }
  return out;
}

// Chunk-safe, resumable intake generation. Generates ONE scenario per model
// call, checking `deadlineAt` BETWEEN calls. Returns "deadline" with the
// partial progress when the isolate budget is exhausted — the caller persists
// it and self-reinvokes.
export async function generateValidatedIntakesChunked(
  tool: string,
  count: number,
  prior: IntakeGenProgress,
  ctx: {
    deadlineAt: number;
    /**
     * FIX-SO-WD (2026-08-21) — worst-case duration of ONE scenario model call
     * for this tool. A call is only started when `now + reserve <= deadlineAt`,
     * so a call can never be in flight when the isolate is hard-killed.
     */
    callReserveMs?: number;

    onScenario?: (done: number, total: number, secs: number, ok: boolean, reason?: string) => Promise<void>;
    /** PROMPT 8K — closed-loop lint applies to variant=perfect only. */
    variant?: "perfect" | "messy" | null;
    // Test seams — production leaves these undefined.
    _generate?: (tool: string, n: number, extraGuidance?: string, variant?: FixtureVariant | null) => Promise<any[]>;
    _screen?: (tool: string, item: any) => Promise<{ ok: true; intake: any } | { ok: false; reason: string; kind?: RejectionKind }>;
    _now?: () => number;
  },
): Promise<{ progress: IntakeGenProgress; status: "complete" | "deadline"; abort?: { kind: RejectionKind | "rate"; reason: string } }> {
  const now = ctx._now ?? (() => Date.now());
  const genOne = ctx._generate ?? generateIntakes;
  // PROMPT 8H item 1(b) — tool-aware screen (generic collision lint + per-tool
  // structured-shape enforcement).
  // PROMPT 8K — variant-aware screen: for variant=perfect the product's own
  // deliverables builder decides whether the record is perfect.
  const { lintFixtureForVariant } = ctx._screen
    ? { lintFixtureForVariant: (() => null) as any }
    : await import("./_local/quality/fixture-lint.ts");

  const progress: IntakeGenProgress = {
    accepted: [...(prior.accepted ?? [])],
    rejected: [...(prior.rejected ?? [])],
    totalAttempted: prior.totalAttempted ?? 0,
  };

  // PROMPT 12F item 3 — KIND-AWARE FAIL POLICY (perfect variant only), as
  // amended by PROMPT 12G item 0.
  //   carve_out         → NO repair (screenIntake returns immediately), then ONE
  //                       fresh regeneration — max TWO model calls per slot.
  //   lint              → repair attempt (inside screenIntake), then ONE fresh
  //                       regeneration — max three model calls per slot.
  //   both              → then SKIP the slot and attempt a replacement, up to a
  //                       total budget of 2 × needed.
  //   contract          → ABORT (the spec doesn't match; retrying cannot help).
  //   rejection rate >50% after ≥4 attempts → ABORT.
  // Non-perfect variants keep the pre-12F behaviour byte-for-byte.

  const perfect = ctx.variant === "perfect";
  const budget = perfect ? count * 2 : count;

  /** Single-pass screen with NO repair retry — used for the fresh regeneration. */
  const screenNoRepair = async (
    item: any,
  ): Promise<{ ok: true; intake: any } | { ok: false; reason: string; kind: RejectionKind; attempts: RejectedAttempt[] }> => {
    if (ctx._screen) {
      const r = await ctx._screen(tool, item);
      if (r.ok) return r as { ok: true; intake: any };
      return { ok: false, reason: r.reason, kind: (r as any).kind ?? "lint", attempts: [{ attempt: 1, reason: r.reason, intake: item }] };
    }
    const l = lintFixtureForVariant(tool, ctx.variant ?? null, item);
    if (l) {
      const reason = `lint: ${l.reason}`;
      return { ok: false, reason, kind: rejectionKindForLint(l as any), attempts: [{ attempt: 1, reason, intake: item }] };
    }
    const v = validateIntake(tool, item);
    if (!v.ok) {
      const reason = v.reason ?? "contract violation";
      return { ok: false, reason, kind: "contract", attempts: [{ attempt: 1, reason, intake: item }] };
    }
    return { ok: true, intake: item };
  };

  const rateAbort = (): { kind: "rate"; reason: string } | undefined => {
    if (!perfect) return undefined;
    if (progress.totalAttempted < 4) return undefined;
    const rate = progress.rejected.length / progress.totalAttempted;
    if (rate <= 0.5) return undefined;
    return {
      kind: "rate",
      reason: `rejection rate ${progress.rejected.length}/${progress.totalAttempted} exceeds 50% after ${progress.totalAttempted} attempts`,
    };
  };

  // FIX-SO-WD (2026-08-21) — reserve-aware budget gate.
  const reserveMs = ctx.callReserveMs ?? intakeCallReserveMs(tool);
  const budgetExhausted = () => now() + reserveMs > ctx.deadlineAt;

  while (perfect ? (progress.accepted.length < count && progress.totalAttempted < budget) : progress.totalAttempted < count) {
    // Interior deadline checkpoint — BETWEEN calls, never inside one await.
    // A call is started only if its worst-case duration still fits the budget.
    if (budgetExhausted()) {
      return { progress, status: "deadline" };
    }

    const t0 = now();
    const avoid = usedNames(progress.accepted);
    const extraGuidance = avoid.length
      ? `NAME VARIETY: do NOT reuse or vary these already-used company names: ${avoid.slice(-12).join(", ")}. Pick an entirely different company name and sector posture.`
      : undefined;

    let batch: any[];
    try {
      batch = await genOne(tool, 1, extraGuidance, ctx.variant ?? null);
    } catch (e) {
      progress.totalAttempted += 1;
      progress.rejected.push({ reason: `generation failed — ${(e as Error).message}`, attempts: [] });
      await ctx.onScenario?.(progress.totalAttempted, count, (now() - t0) / 1000, false);
      continue;
    }

    const item = batch[0];
    progress.totalAttempted += 1;
    if (!item) {
      progress.rejected.push({ reason: "generator returned no item", attempts: [] });
      await ctx.onScenario?.(progress.totalAttempted, count, (now() - t0) / 1000, false);
      continue;
    }
    // FIX-SO-WD (2026-08-21): screenIntake can fire a SECOND (repair) model
    // call. When the remaining budget can no longer cover one call, screen
    // without repair — the slot is simply retried in the next isolate.
    const screened = ctx._screen
      ? await ctx._screen(tool, item)
      : budgetExhausted()
        ? await screenNoRepair(item)
        : await screenIntake(tool, item, ((x: any) => lintFixtureForVariant(tool, ctx.variant ?? null, x)) as any, extraGuidance, undefined, ctx.variant ?? null);


    if (screened.ok) progress.accepted.push(screened.intake);
    // PROMPT 9D item 2 — persist the FULL rejected intake JSON(s) with reason
    // and attempt number; carried into quality_runs.partial_state by the caller.
    else progress.rejected.push({
      reason: screened.reason,
      attempts: (screened as any).attempts ?? [{ attempt: 1, reason: screened.reason, intake: item }],
    });
    await ctx.onScenario?.(progress.totalAttempted, count, (now() - t0) / 1000, screened.ok, screened.ok ? undefined : screened.reason);
    if (screened.ok || !perfect) continue;

    const kind: RejectionKind = (screened as any).kind ?? "lint";
    // (a) contract/spec-mismatch — abort; retrying cannot fix a spec drift.
    if (kind === "contract") {
      return { progress, status: "complete", abort: { kind, reason: screened.reason } };
    }
    const rated = rateAbort();
    if (rated) return { progress, status: "complete", abort: rated };
    if (progress.totalAttempted >= budget) break;
    if (budgetExhausted()) return { progress, status: "deadline" };

    // ONE fresh regeneration for this slot — a NEW scenario, not a repair.
    const t1 = now();
    const freshGuidance = [
      extraGuidance,
      `PREVIOUS SCENARIO REJECTED: ${screened.reason}. Generate a COMPLETELY DIFFERENT scenario — do not repair or reuse the rejected one.`,
      kind === "carve_out" ? (await import("./_local/quality/perfect-closed-loop.ts")).CARVE_OUT_REPAIR_GUIDANCE : undefined,
    ].filter(Boolean).join("\n\n");
    let fresh: any;
    try {
      fresh = (await genOne(tool, 1, freshGuidance, ctx.variant ?? null))[0];
    } catch (e) {
      progress.totalAttempted += 1;
      progress.rejected.push({ reason: `fresh regeneration failed — ${(e as Error).message}`, attempts: [] });
      await ctx.onScenario?.(progress.totalAttempted, count, (now() - t1) / 1000, false);
      const r2 = rateAbort();
      if (r2) return { progress, status: "complete", abort: r2 };
      continue;
    }
    progress.totalAttempted += 1;
    const rescreened = fresh
      ? await screenNoRepair(fresh)
      : { ok: false as const, reason: "fresh regeneration returned no item", kind: "generation" as RejectionKind, attempts: [] as RejectedAttempt[] };
    if (rescreened.ok) {
      progress.accepted.push(rescreened.intake);
      await ctx.onScenario?.(progress.totalAttempted, count, (now() - t1) / 1000, true);
      continue;
    }
    progress.rejected.push({ reason: `fresh regeneration rejected: ${rescreened.reason}`, attempts: rescreened.attempts });
    await ctx.onScenario?.(progress.totalAttempted, count, (now() - t1) / 1000, false, `fresh regeneration rejected: ${rescreened.reason}`);
    if (rescreened.kind === "contract") {
      return { progress, status: "complete", abort: { kind: "contract", reason: rescreened.reason } };
    }
    const r3 = rateAbort();
    if (r3) return { progress, status: "complete", abort: r3 };
    // SKIP this slot and attempt a replacement (budget permitting).
  }

  return { progress, status: "complete" };

}


// r1b1.4 POLL-RESUME: dispatch-only step. Insert the generator row and fire
// its edge function; return the source table/row id. Caller then polls the
// row with a bounded per-isolate deadline and self-reinvokes on deadline.
// QB-P14 item 3 — dispatchGeneration returns the invocation promise so the
// caller can `.catch` it and persist the HTTP status + first 200 chars of the
// error body in the batch progress log. Prior shape swallowed every generator
// dispatch failure via `.catch(() => {})`, producing bare "dispatch failed"
// entries with no attribution. On insert/setup failure the function now
// returns `{ error }` so the caller can surface the reason too.
export type DispatchResult =
  | { sourceTable: string; sourceRowId: string; invocation: Promise<any> }
  | { error: string };

// ITEM 335 — harness-only engine selector. `enginePath === "ltp"` routes
// cppa-risk test-document generation through the LTP pipeline
// (ltp-risk-doc-gen: Pass-1 -> assembleReport -> Pass-2R) instead of the
// production `run-cppa-risk-assessment`, which stays pinned to the Item-217
// legacy engine by the Item 245 rollback hold. DEFAULT (undefined/"production")
// preserves the existing behaviour byte-for-byte for every tool.
export type EnginePath = "production" | "ltp";

async function dispatchGeneration(
  admin: Admin, tool: string, intake: any, userId: string, enginePath: EnginePath = "production",
): Promise<DispatchResult> {
  try {
    if (tool === "cppa-admt") {
      // CONVERSION SWAP (2026-08-20): cppa-admt purchases now run the v2
      // deterministic engine (module="admt_v2", run-admt-checker-v2) — see
      // create-tool-checkout's MODULE_FOR_TOOL comment. Mirrors cppa-risk's
      // own v2 dispatch below so the harness tests what customers actually
      // get, not the retired v1 path.
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "admt_v2", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("run-admt-checker-v2", { assessment_id: rec.id });
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, invocation };
    }
    if (tool === "cppa-risk") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "risk_assessment", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      // ITEM 335 — harness/shadow engine selector (see EnginePath above).
      const genFn = enginePath === "ltp" ? "ltp-risk-doc-gen" : "run-cppa-risk-assessment-v2";
      const invocation = invokeFn(genFn, { assessment_id: rec.id });
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, invocation };
    }
    if (tool === "cppa-cyber") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "cybersecurity", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("run-cppa-cybersecurity", { assessment_id: rec.id });
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, invocation };
    }
    if (tool === "lia") {
      const LIA_COLS = ["stage","status","organization_name","subject_anchor","processing_description","relationship_type","data_categories","jurisdictions","sector","stated_purpose","alternatives_considered","purpose_details","necessity_details","balancing_details","attestation","preview_signal","supplemental_responses","supplemental_context"];
      // ITEM 383 leg 1 — subject_anchor + attestation are real li_assessments
      // columns and Stage-B contract keys; without them a "perfect" LIA pin
      // could never persist as a complete record.
      const cleaned: any = {};
      for (const k of LIA_COLS) if (intake?.[k] !== undefined) cleaned[k] = intake[k];
      if (!cleaned.stage) cleaned.stage = "final";
      if (!cleaned.status) cleaned.status = "pending";
      const { data: rec, error } = await admin.from("li_assessments").insert({ ...cleaned, user_id: userId }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("run-li-assessment", { assessment_id: rec.id });
      return { sourceTable: "li_assessments", sourceRowId: rec.id, invocation };
    }
    if (tool === "dpia") {
      const { data: rec, error } = await admin.from("dpia_frameworks").insert({
        user_id: userId, status: "pending", intake_data: intake,
        organization_name: intake?.organisation_name ?? intake?.organization_name ?? "Test Org",
      }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("run-dpia-framework", { dpia_id: rec.id });
      return { sourceTable: "dpia_frameworks", sourceRowId: rec.id, invocation };
    }
    if (tool === "governance") {
      const { data: rec, error } = await admin.from("governance_assessments").insert({
        user_id: userId, status: "pending", intake_data: intake,
        organization_name: intake?.organization_name ?? intake?.company_name ?? "Test Org",
      }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("run-governance-assessment", { assessment_id: rec.id });
      return { sourceTable: "governance_assessments", sourceRowId: rec.id, invocation };
    }
    if (tool === "dpa-generator") {
      const { data: rec, error } = await admin.from("dpa_documents").insert({ user_id: userId, status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("generate-dpa", { assessment_id: rec.id, user_id: userId });
      return { sourceTable: "dpa_documents", sourceRowId: rec.id, invocation };
    }
    if (tool === "ir-playbook") {
      const { data: rec, error } = await admin.from("ir_playbooks").insert({ user_id: userId, status: "pending", intake_data: intake, organization_name: intake?.organizationName ?? "Test Org" }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("generate-ir-playbook", { assessment_id: rec.id, user_id: userId });
      return { sourceTable: "ir_playbooks", sourceRowId: rec.id, invocation };
    }
    if (tool === "biometric-checker") {
      const { data: rec, error } = await admin.from("biometric_assessments").insert({ user_id: userId, status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("check-biometric-compliance", { ...intake, assessment_id: rec.id, user_id: userId, stress_run: true });
      return { sourceTable: "biometric_assessments", sourceRowId: rec.id, invocation };
    }
    // QB-P14 item 2 — REGISTRATION path.
    //
    // Prior harness invoked `generate-registration-docs` with `{order_id}` —
    // that is the paid order-fulfillment function which rejects immediately
    // when no order exists (both campaign registration runs died this way
    // in ~130ms, no error captured). The real customer flow lives in
    // src/pages/RegistrationAssessment.tsx and calls the FREE, synchronous
    // `run-registration-assessment` with `{intake_data, user_id}`. That
    // function creates the `registration_assessments` row itself, runs the
    // rules engine synchronously, writes status='completed', and returns
    // `{assessment_id, shareable_token, result_summary}`. Match that flow
    // exactly here — do NOT seed a row (the callee owns row creation) and
    // do NOT touch `generate-registration-docs` or any order/payment code.
    if (tool === "registration") {
      const data = await invokeFn("run-registration-assessment", {
        intake_data: intake, user_id: userId,
      });
      const assessmentId = (data as any)?.assessment_id;
      if (!assessmentId) throw new Error(`run-registration-assessment returned no assessment_id`);
      return {
        sourceTable: "registration_assessments",
        sourceRowId: assessmentId,
        invocation: Promise.resolve(data),
      };
    }
    console.warn(`[dispatchGeneration] no dispatcher for tool: ${tool}`);
    return { error: `no dispatcher for tool: ${tool}` };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.warn(`[dispatchGeneration] failed:`, msg);
    return { error: msg.slice(0, 500) };
  }
}


type PollOutcome =
  | { status: "complete"; reportData: any }
  | { status: "error"; error: string }
  | { status: "deadline" };

// QB-P21: harness-side chain resurrection. Some generators (dpia) fan out
// unit invocations fire-and-forget; a single dispatch failure can strand
// the row in 'processing' forever. When the polled row is non-terminal AND
// updated_at is stale >STALE_MS, re-invoke the generator bootstrap (which
// is idempotent — sweeper re-entry). Cap at MAX_RESURRECTIONS per doc.
// W9-ADMT-WIRE (register #14 RESUMABLE admt): cppa-admt added so a stalled
// heartbeat can no longer strand a wave digest (wave 8 stall cost us the read).
// FIX-SO-WD (2026-08-21): cppa-risk joins the resumable set — runs #221/#224
// both died mid-generation with no resurrection path and lost the whole doc.
const RESUMABLE_GENERATORS = new Set(["dpia", "cppa-admt", "cppa-risk"]);

const RESURRECT_STALE_MS = 180_000;
// SO-FT RESURRECT-CALIBRATION (2026-08-11): cppa-admt's normal generation has
// phases that legitimately run >3 minutes without touching updated_at, so the
// flat 180s threshold fired on HEALTHY chains — the 00:47 batch resurrected the
// same doc every ~3 minutes, spawning duplicate generator chains that pushed
// doc 2 and doc 3 from ~300s to ~900s. Give admt a threshold above its longest
// observed quiet phase; dpia keeps 180s.
const RESURRECT_STALE_MS_BY_TOOL: Record<string, number> = { "cppa-admt": 480_000, "cppa-risk": 480_000 };
export const MAX_RESURRECTIONS = 2;
const RESUMABLE_GENERATOR_FN: Record<string, string> = { dpia: "run-dpia-framework", "cppa-admt": "run-admt-checker-v2", "cppa-risk": "run-cppa-risk-assessment" };
const RESUMABLE_ID_KEY: Record<string, string> = { dpia: "dpia_id", "cppa-admt": "assessment_id", "cppa-risk": "assessment_id" };


export function resurrectStaleMs(tool?: string): number {
  return (tool && RESURRECT_STALE_MS_BY_TOOL[tool]) || RESURRECT_STALE_MS;
}

export function shouldResurrect(opts: {
  tool?: string;
  updatedAtIso: string | null | undefined;
  nowMs: number;
  attempts: number;
}): boolean {
  if (!opts.tool || !RESUMABLE_GENERATORS.has(opts.tool)) return false;
  if (opts.attempts >= MAX_RESURRECTIONS) return false;
  if (!opts.updatedAtIso) return false;
  const t = Date.parse(opts.updatedAtIso);
  if (!Number.isFinite(t)) return false;
  return opts.nowMs - t > resurrectStaleMs(opts.tool);
}


export async function resurrectGenerator(
  tool: string, sourceRowId: string,
): Promise<{ ok: boolean; detail: string }> {
  const fn = RESUMABLE_GENERATOR_FN[tool];
  const idKey = RESUMABLE_ID_KEY[tool];
  if (!fn || !idKey) return { ok: false, detail: `no resurrector for tool=${tool}` };
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "apikey": SERVICE_KEY,
      },
      // MODEL A/B HARNESS — the resurrected chain MUST continue on the run's
      // ambient generation model; omitting it silently fell back to the
      // default and produced mixed-model documents in the alternate arm.
      body: JSON.stringify({ [idKey]: sourceRowId, generation_model: currentGenerationModel() }),
      signal: AbortSignal.timeout(20_000),
    });
    return { ok: r.ok, detail: r.ok ? `HTTP ${r.status}` : `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

async function pollGenerationRow(
  admin: Admin, sourceTable: string, sourceRowId: string, deadlineMs: number,
  opts?: {
    tool?: string;
    log?: (level: string, msg: string) => Promise<void> | void;
    // SO-FT RESURRECT-CALIBRATION: attempts must survive the poll-resume
    // boundary. Each fresh isolate previously restarted the counter at 0, so
    // MAX_RESURRECTIONS never bound a long doc — the log shows "attempt 1"
    // over and over across isolates. Caller seeds and receives the count.
    initialResurrectAttempts?: number;
    onResurrect?: (attempts: number) => void;
  },
): Promise<PollOutcome> {
  const deadline = Date.now() + deadlineMs;
  const intervalMs = sourceTable === "biometric_assessments" ? 2500 : 5000;
  let resurrectAttempts = opts?.initialResurrectAttempts ?? 0;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, intervalMs));
    try {
      if (sourceTable === "biometric_assessments") {
        const { data } = await admin.from(sourceTable)
          .select("status, analysis_text, report_data").eq("id", sourceRowId).single();
        const s = (data as any)?.status;
        if (s === "complete") return { status: "complete", reportData: { ...((data as any)?.report_data ?? {}), assessment_text: (data as any)?.analysis_text ?? "" } };
        if (["error", "failed", "cancelled"].includes(s ?? "")) return { status: "error", error: `${sourceTable} status=${s}` };
      } else if (sourceTable === "registration_orders") {
        const { data } = await admin.from(sourceTable).select("status").eq("id", sourceRowId).single();
        const s = (data as any)?.status;
        if (s === "complete" || s === "generated") {
          const { data: docs } = await admin.from("registration_documents")
            .select("jurisdiction, document_type, content_text").eq("order_id", sourceRowId);
          return { status: "complete", reportData: { documents: docs ?? [], document_count: docs?.length ?? 0 } };
        }
        if (["error", "failed", "cancelled"].includes(s ?? "")) return { status: "error", error: `${sourceTable} status=${s}` };
      } else if (sourceTable === "ir_playbooks") {
        // QLB-F3: playbook_text lives in a separate column; merge it into
        // reportData so the grader payload builder leads with the body.
        const { data } = await admin.from(sourceTable).select("status, playbook_text, report_data").eq("id", sourceRowId).single();
        const s = (data as any)?.status;
        if (s === "complete") return { status: "complete", reportData: { ...((data as any)?.report_data ?? {}), playbook_text: (data as any)?.playbook_text ?? "" } };
        if (["error", "failed", "cancelled"].includes(s ?? "")) return { status: "error", error: `${sourceTable} status=${s}` };
      } else if (sourceTable === "dpa_documents") {
        // QLB-F3: document_text lives in a separate column; merge it in
        // (mirror of biometric_assessments and ir_playbooks handling).
        const { data } = await admin.from(sourceTable).select("status, document_text, report_data").eq("id", sourceRowId).single();
        const s = (data as any)?.status;
        if (s === "complete") return { status: "complete", reportData: { ...((data as any)?.report_data ?? {}), document_text: (data as any)?.document_text ?? "" } };
        if (["error", "failed", "cancelled"].includes(s ?? "")) return { status: "error", error: `${sourceTable} status=${s}` };
      } else if (sourceTable === "registration_assessments") {
        // QB-P14 item 2 — the free run-registration-assessment function
        // writes status='completed' synchronously (single HTTP call) and
        // stores its output in `result_summary`. Recognize that terminal
        // status and fold the summary into reportData for the grader.
        const { data } = await admin.from(sourceTable)
          .select("status, result_summary").eq("id", sourceRowId).single();
        const s = (data as any)?.status;
        if (s === "completed" || s === "complete") {
          return { status: "complete", reportData: (data as any)?.result_summary ?? {} };
        }
        if (["error", "failed", "cancelled"].includes(s ?? "")) return { status: "error", error: `${sourceTable} status=${s}` };
      } else {
        const { data } = await admin.from(sourceTable).select("status, report_data").eq("id", sourceRowId).single();
        const s = (data as any)?.status;
        if (s === "complete") {
          if ((data as any)?.report_data != null) return { status: "complete", reportData: (data as any)?.report_data };
          return { status: "error", error: `${sourceTable} status=complete_without_report_data` };
        }
        if (["error", "failed", "cancelled"].includes(s ?? "")) return { status: "error", error: `${sourceTable} status=${s}` };
      }

      // QB-P21 resurrection check — only for RESUMABLE_GENERATORS.
      if (opts?.tool && RESUMABLE_GENERATORS.has(opts.tool)) {
        const { data: meta } = await admin.from(sourceTable).select("updated_at").eq("id", sourceRowId).single();
        const updatedAtIso = (meta as any)?.updated_at ?? null;
        if (shouldResurrect({ tool: opts.tool, updatedAtIso, nowMs: Date.now(), attempts: resurrectAttempts })) {
          resurrectAttempts++;
          opts.onResurrect?.(resurrectAttempts);
          const staleS = updatedAtIso ? Math.round((Date.now() - Date.parse(updatedAtIso)) / 1000) : -1;
          const res = await resurrectGenerator(opts.tool, sourceRowId);
          const msg = `resurrecting ${opts.tool} chain, attempt ${resurrectAttempts}/${MAX_RESURRECTIONS} — stale ${staleS}s > ${Math.round(resurrectStaleMs(opts.tool) / 1000)}s (${res.ok ? "dispatched" : "failed"}: ${res.detail})`;
          if (opts.log) await opts.log(res.ok ? "info" : "warn", msg);
          else console.warn(`[pollGenerationRow] ${msg}`);

        }
      }
    } catch (e) {
      // Transient read errors: keep polling until deadline.
      console.warn(`[pollGenerationRow] read failed for ${sourceTable}/${sourceRowId}:`, (e as Error).message);
    }
  }
  return { status: "deadline" };
}

async function buildDocument(admin: Admin, tool: string, intake: any, userId: string): Promise<{ sourceTable: string; sourceRowId: string; reportData: any } | null> {
  try {
    const poll = async (table: string, id: string) => {
      // QLB-F3: for tables whose body lives in a separate text column
      // (playbook_text, document_text), fold it into report_data on the
      // way out so the grader payload builder can lead with the body.
      const bodyCol =
        table === "ir_playbooks" ? "playbook_text" :
        table === "dpa_documents" ? "document_text" : null;
      const cols = bodyCol ? `status, report_data, ${bodyCol}` : "status, report_data";
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const { data } = await admin.from(table).select(cols).eq("id", id).single();
        if ((data as any)?.status === "complete") {
          const rd = (data as any)?.report_data ?? {};
          if ((data as any)?.report_data == null) throw new Error(`${table} status=complete_without_report_data`);
          if (bodyCol) return { ...rd, [bodyCol]: (data as any)?.[bodyCol] ?? "" };
          return rd;
        }
        if (["error", "failed", "cancelled"].includes((data as any)?.status ?? ""))
          throw new Error(`${table} status=${(data as any)?.status}`);
      }
      throw new Error(`timeout polling ${table}`);
    };

    if (tool === "cppa-admt") {
      // CONVERSION SWAP (2026-08-20) — see the dispatchGeneration branch above.
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "admt_v2", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-admt-checker-v2", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, reportData: await poll("cppa_assessments", rec.id) };
    }
    if (tool === "cppa-risk") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "risk_assessment", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-cppa-risk-assessment-v2", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, reportData: await poll("cppa_assessments", rec.id) };
    }
    if (tool === "cppa-cyber") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "cybersecurity", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-cppa-cybersecurity", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, reportData: await poll("cppa_assessments", rec.id) };
    }
    if (tool === "lia") {
      // Whitelist columns to li_assessments schema — drop any AI-hallucinated keys
      const LIA_COLS = ["stage","status","organization_name","subject_anchor","processing_description","relationship_type","data_categories","jurisdictions","sector","stated_purpose","alternatives_considered","purpose_details","necessity_details","balancing_details","attestation","preview_signal","supplemental_responses","supplemental_context"];
      // ITEM 383 leg 1 — subject_anchor + attestation are real li_assessments
      // columns and Stage-B contract keys; without them a "perfect" LIA pin
      // could never persist as a complete record.
      const cleaned: any = {};
      for (const k of LIA_COLS) if (intake?.[k] !== undefined) cleaned[k] = intake[k];
      if (!cleaned.stage) cleaned.stage = "final";
      if (!cleaned.status) cleaned.status = "pending";
      const { data: rec, error } = await admin.from("li_assessments").insert({ ...cleaned, user_id: userId }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-li-assessment", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "li_assessments", sourceRowId: rec.id, reportData: await poll("li_assessments", rec.id) };
    }
    if (tool === "dpia") {
      const { data: rec, error } = await admin.from("dpia_frameworks").insert({
        user_id: userId,
        status: "pending",
        intake_data: intake,
        organization_name: intake?.organisation_name ?? intake?.organization_name ?? "Test Org",
      }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-dpia-framework", { dpia_id: rec.id }).catch(() => {});
      return { sourceTable: "dpia_frameworks", sourceRowId: rec.id, reportData: await poll("dpia_frameworks", rec.id) };
    }
    if (tool === "governance") {
      const { data: rec, error } = await admin.from("governance_assessments").insert({
        user_id: userId,
        status: "pending",
        intake_data: intake,
        organization_name: intake?.organization_name ?? intake?.company_name ?? "Test Org",
      }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-governance-assessment", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "governance_assessments", sourceRowId: rec.id, reportData: await poll("governance_assessments", rec.id) };
    }
    if (tool === "dpa-generator") {
      const { data: rec, error } = await admin.from("dpa_documents").insert({ user_id: userId, status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("generate-dpa", { assessment_id: rec.id, user_id: userId }).catch(() => {});
      return { sourceTable: "dpa_documents", sourceRowId: rec.id, reportData: await poll("dpa_documents", rec.id) };
    }
    if (tool === "ir-playbook") {
      const { data: rec, error } = await admin.from("ir_playbooks").insert({ user_id: userId, status: "pending", intake_data: intake, organization_name: intake?.organizationName ?? "Test Org" }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("generate-ir-playbook", { assessment_id: rec.id, user_id: userId }).catch(() => {});
      return { sourceTable: "ir_playbooks", sourceRowId: rec.id, reportData: await poll("ir_playbooks", rec.id) };
    }
    if (tool === "biometric-checker") {
      const { data: rec, error } = await admin.from("biometric_assessments").insert({ user_id: userId, status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      await invokeFn("check-biometric-compliance", { ...intake, assessment_id: rec.id, user_id: userId, stress_run: true });

      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 2500));
        const { data } = await admin.from("biometric_assessments")
          .select("status, analysis_text, report_data")
          .eq("id", rec.id).single();
        if ((data as any)?.status === "complete") {
          return {
            sourceTable: "biometric_assessments",
            sourceRowId: rec.id,
            reportData: { ...((data as any)?.report_data ?? {}), assessment_text: (data as any)?.analysis_text ?? "" },
          };
        }
        if (["error", "failed", "cancelled"].includes((data as any)?.status ?? ""))
          throw new Error(`biometric_assessments status=${(data as any)?.status}`);
      }
      throw new Error("timeout polling biometric_assessments");
    }

    // QB-P14 item 2 — REGISTRATION path in the transient/buildDocument path
    // (same rewire as dispatchGeneration above). run-registration-assessment
    // is synchronous and creates the registration_assessments row itself,
    // returning {assessment_id, result_summary}. Do not seed a
    // registration_orders row and do not call generate-registration-docs
    // (that is the paid order-fulfillment function; harness has no order).
    if (tool === "registration") {
      const resp = await invokeFn("run-registration-assessment", {
        intake_data: intake, user_id: userId,
      });
      const assessmentId = (resp as any)?.assessment_id;
      if (!assessmentId) throw new Error(`run-registration-assessment returned no assessment_id`);
      const summary = (resp as any)?.result_summary ?? {};
      return {
        sourceTable: "registration_assessments",
        sourceRowId: assessmentId,
        reportData: summary,
      };
    }


    // B3: editorial generators — call the edge function directly, capture the
    // JSON response as the document body. These don't have a per-row "complete"
    // status — the response IS the artifact.
    if (tool === "ask-privacy") {
      const resp = await invokeFn("ask-privacy", { ...intake, user_id: userId, stress_run: true });
      return { sourceTable: "(transient)", sourceRowId: crypto.randomUUID(), reportData: resp };
    }
    if (tool === "weekly-brief") {
      const resp = await invokeFn("generate-weekly-brief", { ...intake, user_id: userId, stress_run: true });
      return { sourceTable: "(transient)", sourceRowId: crypto.randomUUID(), reportData: resp };
    }
    if (tool === "custom-brief") {
      const resp = await invokeFn("generate-custom-brief", { ...intake, user_id: userId, stress_run: true });
      return { sourceTable: "(transient)", sourceRowId: crypto.randomUUID(), reportData: resp };
    }
    if (tool === "trend-report") {
      const resp = await invokeFn("generate-trend-report", { ...intake, user_id: userId, stress_run: true });
      return { sourceTable: "(transient)", sourceRowId: crypto.randomUUID(), reportData: resp };
    }
    if (tool === "state-law") {
      const resp = await invokeFn("check-state-privacy-laws", { ...intake, user_id: userId, stress_run: true });
      return { sourceTable: "(transient)", sourceRowId: crypto.randomUUID(), reportData: resp };
    }

    console.warn(`[run-quality-batch] no builder for tool: ${tool}`);
    return null;
  } catch (e) {
    console.warn(`[run-quality-batch] buildDocument failed:`, (e as Error).message);
    return null;
  }
}

async function generateProposedFix(tool: string, checkId: string, dimension: string, evidence: string[]): Promise<{ fix: string; location: string }> {
  const toolToEdgeFn: Record<string, string> = {
    "cppa-admt": "run-admt-checker-v2", "cppa-risk": "run-cppa-risk-assessment-v2",
    "cppa-cyber": "run-cppa-cybersecurity", "lia": "run-li-assessment",
    "dpia": "run-dpia-framework", "governance": "run-governance-assessment",
    "dpa-generator": "generate-dpa", "ir-playbook": "generate-ir-playbook",
    "biometric-checker": "check-biometric-compliance",
    // B3 — extended customer-facing Anthropic generators
    "registration": "generate-registration-docs",
    "ask-privacy": "ask-privacy",
    "weekly-brief": "generate-weekly-brief",
    "custom-brief": "generate-custom-brief",
    "trend-report": "generate-trend-report",
    "state-law": "check-state-privacy-laws",
  };
  const edgeFn = toolToEdgeFn[tool] ?? `run-${tool}`;
  const raw = await claude(
    `You are a prompt engineer for legal compliance AI systems. Given a failing quality check, write a precise targeted fix to the generation system prompt. Write the ACTUAL replacement text — not a description of what to change. Format as JSON: { "location": "where in the prompt", "new_text": "the complete replacement text" }`,
    `TOOL: ${tool}\nEDGE FUNCTION: ${edgeFn}\nFAILING CHECK: ${checkId}\nDIMENSION: ${dimension}\nEVIDENCE:\n${evidence.slice(0, 3).map((e, i) => `[${i + 1}] ${e}`).join("\n")}\nWrite the prompt patch.`,
    1500
  ).catch(() => "");
  const parsed = tryParse(raw);
  return { fix: parsed?.new_text ?? raw.slice(0, 1500), location: parsed?.location ?? `${edgeFn} system prompt — ${dimension} dimension` };
}

async function selfReinvoke(runId: string): Promise<void> {
  // Awaited self-call: the resume handler returns 202 fast (it kicks off the
  // next runBatch in its own waitUntil), so awaiting only ensures the chained
  // isolate has booted before this isolate retires. Without the await, the
  // current isolate could be torn down before the chained request flushes.
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/run-quality-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ resume_run_id: runId }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) console.warn(`[run-quality-batch] self-reinvoke HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  } catch (e) {
    console.warn("[run-quality-batch] self-reinvoke failed:", (e as Error).message);
  }
}

type PartialState = {
  dimTotals: Record<string, number>;
  gptTotals: Record<string, number>;
  built: number;
  gptBuilt: number;
  // P-A: held-out diagnostics. Last ~30% of intakes are tagged "holdout" and are NEVER
  // used to generate fix candidates. Both sets contribute to allDocFindings (each finding
  // carries scenario_set) so per-check fail rates can be reported separately.
  tuningDimTotals: Record<string, number>;
  holdoutDimTotals: Record<string, number>;
  tuningBuilt: number;
  holdoutBuilt: number;
  allDocFindings: any[];
  logBuf: Array<{ t: string; level: string; msg: string }>;
  // QB-P10 — cumulative post-filter drop counters, per grader, per rule.
  claudePostFilterDrops: { a2: number; a3: number; a4: number; r15c2: number; dpa_defaults: number };
  gptPostFilterDrops: { a2: number; a3: number; a4: number; r15c2: number; dpa_defaults: number };
  // QB-P14 item 4 — audit trail of every finding the post-filter suppressed.
  postFilterSuppressed: Array<{ doc_index: number; grader: "claude" | "gpt"; rule: string; check_id: string; evidence: string }>;
  // PROMPT 8G — partial intake-generation progress, so a deadline-interrupted
  // generation phase resumes at the next scenario in a fresh isolate.
  intakeGen?: IntakeGenProgress;
  intakeGenIsolates?: number;
};

function emptyState(): PartialState {
  const zeroDims = () => ({ accuracy: 0, citation: 0, hallucination: 0, analysis: 0, intelligence: 0, formatting: 0 });
  const zeroDrops = () => ({ a2: 0, a3: 0, a4: 0, r15c2: 0, dpa_defaults: 0 });
  return {
    dimTotals: zeroDims(),
    gptTotals: zeroDims(),
    built: 0,
    gptBuilt: 0,
    tuningDimTotals: zeroDims(),
    holdoutDimTotals: zeroDims(),
    tuningBuilt: 0,
    holdoutBuilt: 0,
    allDocFindings: [],
    logBuf: [],
    claudePostFilterDrops: zeroDrops(),
    gptPostFilterDrops: zeroDrops(),
    postFilterSuppressed: [],
  };
}


// MODEL A/B HARNESS (dispatch 1) — the child run row carries the generation
// model this run must use (NULL on legacy batches ⇒ the default model). Read
// it once and make it ambient for the whole run so invokeFn can attach it to
// every PRODUCT generator call. Grader/rubric calls do NOT go through invokeFn
// and are unaffected (see tests/edge/_tests/model-ab-grader-pin.test.ts).
async function runBatch(runId: string): Promise<void> {
  const bootstrap = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  let model = DEFAULT_GENERATION_MODEL;
  try {
    const { data } = await bootstrap.from("quality_runs")
      .select("generation_model").eq("id", runId).maybeSingle();
    if ((data as any)?.generation_model) model = resolveGenerationModel((data as any).generation_model);
  } catch { /* legacy row / missing column — default model */ }
  return await withGenerationModel(model, () => runBatchInner(runId));
}

async function runBatchInner(runId: string): Promise<void> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const upd = (data: any) => admin.from("quality_runs").update(data).eq("id", runId);

  // Heartbeat: write last_heartbeat_at every 10s independent of log messages.
  const heartbeat = setInterval(() => {
    admin.from("quality_runs").update({ last_heartbeat_at: new Date().toISOString() }).eq("id", runId)
      .then(() => {}, () => {});
  }, HEARTBEAT_INTERVAL_MS);

  // Load run state
  const { data: runRow, error: runErr } = await admin
    .from("quality_runs")
    .select("id, tool, batch_size, run_number, created_by, user_id, status, next_doc_index, intakes, partial_state, progress_log, fixture_variant, engine_path, grader_mode")
    .eq("id", runId).single();
  if (runErr || !runRow) {
    clearInterval(heartbeat);
    console.error("[run-quality-batch] cannot load run:", runErr?.message);
    return;
  }
  const run: any = runRow;
  const tool: string = run.tool;
  const batchSize: number = run.batch_size;
  const userId: string = run.user_id ?? run.created_by;
  const runNumber: number = run.run_number;
  // ITEM 325 — fixture variant for this run ("perfect" | "messy" | null).
  // null is the legacy unlabelled path used by /admin/quality-batch.
  const fixtureVariant: FixtureVariant | null =
    (run.fixture_variant === "perfect" || run.fixture_variant === "messy") ? run.fixture_variant : null;
  // ITEM 335 — harness-only engine path. Default "production" preserves
  // existing behaviour; "ltp" only affects cppa-risk document generation.
  const enginePath: EnginePath = run.engine_path === "ltp" ? "ltp" : "production";
  // SO-FINAL-TEST — grader mode for this run. NULL ⇒ "legacy" ⇒ byte-identical
  // grading to /admin/final-test and /admin/quality-batch.
  const graderMode: GraderMode = run.grader_mode === "skeleton" ? "skeleton" : "legacy";

  const state: PartialState = run.partial_state ?? emptyState();
  // Backfill held-out fields on resumed runs whose partial_state predates P-A.
  const zeroDims = () => ({ accuracy: 0, citation: 0, hallucination: 0, analysis: 0, intelligence: 0, formatting: 0 });
  if (!state.tuningDimTotals)  state.tuningDimTotals  = zeroDims();
  if (!state.holdoutDimTotals) state.holdoutDimTotals = zeroDims();
  if (typeof state.tuningBuilt  !== "number") state.tuningBuilt  = 0;
  if (typeof state.holdoutBuilt !== "number") state.holdoutBuilt = 0;
  // Restore log buffer from saved state OR from progress_log so log keeps appending across invocations.
  const logBuf: Array<{ t: string; level: string; msg: string }> =
    Array.isArray(state.logBuf) && state.logBuf.length
      ? state.logBuf
      : Array.isArray(run.progress_log) ? run.progress_log : [];
  state.logBuf = logBuf;

  const log = async (level: "info" | "warn" | "error" | "success", msg: string) => {
    const entry = { t: new Date().toISOString(), level, msg: String(msg).slice(0, 500) };
    logBuf.push(entry);
    if (level === "error" || level === "warn") console.warn(`[quality-batch ${level}]`, msg);
    else console.log(`[quality-batch]`, msg);
    try { await admin.from("quality_runs").update({ progress_log: logBuf, last_heartbeat_at: new Date().toISOString() }).eq("id", runId); } catch { /* */ }
  };

  const persistState = async (extra: Record<string, any> = {}) => {
    try {
      await admin.from("quality_runs").update({
        partial_state: state,
        last_heartbeat_at: new Date().toISOString(),
        ...extra,
      }).eq("id", runId);
    } catch { /* */ }
  };

  try {
    // ---------- 1. Intake generation (only on first invocation) ----------
    let intakes: any[] = Array.isArray(run.intakes) ? run.intakes : [];
    // WS6 v2.1 pinned-fixture support: if intakes are pre-seeded but short of
    // batchSize AND we haven't started processing yet, generate only the delta
    // and append after the pinned entries. Preserves position 0..N-1 for pins.
    const pinnedCount = intakes.length;
    const nextIdxSafe = run.next_doc_index ?? 0;

    // RC-REM-P2: Validate pinned fixtures at run start against the same
    // contract used for generated intakes. Pinned fixtures are ratified
    // evidence — a pinned fixture that no longer parses against the
    // current contract MUST abort the run so the drift is fixed at source,
    // never silently graded. Only enforced on the first invocation
    // (nextIdxSafe === 0) so mid-run resumes don't re-check.
    if (pinnedCount > 0 && nextIdxSafe === 0) {
      const pinContract = CONTRACT_BY_TOOL[tool];
      if (pinContract) {
        const fails: Array<{ idx: number; violations: string }> = [];
        for (let i = 0; i < intakes.length; i++) {
          const res = validateAgainstContract(pinContract, intakes[i] ?? {});
          if (!res.ok) {
            fails.push({
              idx: i,
              violations: res.violations.slice(0, 6)
                .map(v => `${v.key}: ${v.reason}`).join("; ")
                + (res.violations.length > 6 ? ` (+${res.violations.length - 6} more)` : ""),
            });
          }
        }
        if (fails.length > 0) {
          const msg = `Pinned-fixture contract violations for ${tool} (${fails.length}/${pinnedCount}): `
            + fails.slice(0, 3).map(f => `#${f.idx} → ${f.violations}`).join(" | ")
            + (fails.length > 3 ? ` … +${fails.length - 3} more` : "");
          await log("error", msg);
          await upd({ status: "error", error: msg, completed_at: new Date().toISOString() });
          clearInterval(heartbeat);
          return;
        }
      }
      // PROMPT 8K (2026-08-12) — CLOSED-LOOP PERFECT CHECK for PINNED
      // fixtures. Perfect is defined by the product: a pinned perfect fixture
      // that the deliverables builder finds insufficient aborts the run with
      // its deficiency list rather than being graded as "perfect".
      if (fixtureVariant === "perfect" && tool === "dpia") {
        const { checkPerfectDpiaIntake, deficiencyLines } =
          await import("./_local/quality/perfect-closed-loop.ts");
        const bad: string[] = [];
        for (let i = 0; i < intakes.length; i++) {
          const res = checkPerfectDpiaIntake(intakes[i] ?? {});
          if (!res.ok) bad.push(`#${i} → ${deficiencyLines(res.deficiencies).slice(0, 4).join("; ")}`);
        }
        if (bad.length > 0) {
          const msg = `Pinned perfect-fixture closed-loop failures for ${tool} (${bad.length}/${pinnedCount}): ${bad.slice(0, 3).join(" | ")}`;
          await log("error", msg);
          await upd({ status: "error", error: msg, completed_at: new Date().toISOString() });
          clearInterval(heartbeat);
          return;
        }
      }
    }

    // STAGE-B CONTINUATION-4 (2026-07-27, item 195) — OVERSHOOT FIX:
    // if the persisted intakes exceed batchSize (a legacy pin-stage that
    // shipped 16 goldens for a size-1 batch, before the seed-row cap
    // landed), slice down at run start and log the truncation so the
    // overshoot is auditable. Runs only on the first invocation
    // (nextIdxSafe === 0); mid-run resumes preserve their intake array.
    if (nextIdxSafe === 0 && intakes.length > batchSize) {
      const dropped = intakes.length - batchSize;
      await log("warn", `Overshoot fix: sliced intakes from ${intakes.length} → ${batchSize} (${dropped} dropped) — batch_size=${batchSize}`);
      intakes = intakes.slice(0, batchSize);
      await admin.from("quality_runs").update({ intakes }).eq("id", runId);
    }
    if (intakes.length < batchSize && nextIdxSafe === 0) {
      const needed = batchSize - pinnedCount;
      const priorGen: IntakeGenProgress = state.intakeGen ?? emptyIntakeGenProgress();
      const intakeIsolate = (state.intakeGenIsolates ?? 0) + 1;
      state.intakeGenIsolates = intakeIsolate;
      if (intakeIsolate === 1) {
        await log("info", `Starting run #${runNumber} for ${tool} (${batchSize} documents${pinnedCount > 0 ? `, ${pinnedCount} pinned + ${needed} generated` : ""})`);
        await log(OPENAI_API_KEY ? "success" : "warn",
          OPENAI_API_KEY
            ? `OPENAI_API_KEY detected — GPT-4o cross-review enabled`
            : `OPENAI_API_KEY NOT detected — GPT-4o cross-review will be SKIPPED for every doc`);
      }
      await upd({ status: "generating" });
      // PROMPT 8G — one scenario per model call, deadline checked BETWEEN
      // calls, partial set persisted + self-reinvoked on deadline.
      if (priorGen.totalAttempted > 0) {
        await log("info", `Generating ${needed} intake scenarios via Claude… (resuming at scenario ${priorGen.totalAttempted + 1}/${needed}, isolate ${intakeIsolate})`);
      } else {
        await log("info", `Generating ${needed} intake scenarios via Claude…`);
      }
      let intakeWarning: string | null = null;
      try {
        const { progress: gen, status: genStatus, abort: genAbort } = await generateValidatedIntakesChunked(
          tool,
          needed,
          priorGen,
          {
            deadlineAt: Date.now() + intakeIsolateBudgetMs(tool),
            callReserveMs: intakeCallReserveMs(tool),

            // PROMPT 8K — closed-loop lint for the perfect variant.
            variant: fixtureVariant,
            onScenario: async (done, total, secs, ok, reason) => {
              await log(ok ? "info" : "warn", `Scenario ${done}/${total} generated (${secs.toFixed(1)}s)${ok ? "" : ` — rejected: ${reason ?? "unknown"}`}`);
            },
          },

        );
        state.intakeGen = gen;
        // PROMPT 9D item 2 — persist immediately so the rejected intake JSONs
        // survive even when the run aborts below (perfect fail-fast).
        await persistState();
        if (genStatus === "deadline") {
          await persistState();
          await log("info", `Intake generation deadline (isolate ${intakeIsolate}, ${Math.round(intakeIsolateBudgetMs(tool) / 1000)}s budget / ${Math.round(intakeCallReserveMs(tool) / 1000)}s per-call reserve) — persisted ${gen.accepted.length} accepted / ${gen.totalAttempted} attempted and self-reinvoking to CONTINUE at scenario ${gen.totalAttempted + 1}/${needed}`);
          await selfReinvoke(runId);
          clearInterval(heartbeat);
          return;
        }
        intakes = [...intakes, ...gen.accepted];
        if (gen.rejected.length > 0) {
          await log("warn", `Intake validation: ${gen.rejected.length}/${gen.totalAttempted} rejected after retry (${tool}). Reasons: ${gen.rejected.slice(0, 3).map(r => r.reason).join(" | ")}`);
        }
        // PROMPT 12F item 3 — on the perfect variant the abort decision is made
        // by the kind-aware fail policy (contract/spec-mismatch kind, or a
        // >50% rejection rate after ≥4 attempts). Skipped-and-replaced slots
        // are no longer an abort. Other variants keep the >30% rule verbatim.
        const failRate = gen.totalAttempted > 0 ? gen.rejected.length / gen.totalAttempted : 0;
        const perfectShort = fixtureVariant === "perfect" && gen.accepted.length < needed;
        if (fixtureVariant === "perfect" ? (!!genAbort || perfectShort) : failRate > 0.3) {
          // PROMPT 9C item 4 — the persisted error carries the deficiency list.
          const abortNote = genAbort
            ? `, aborted on ${genAbort.kind}: ${genAbort.reason}`
            : (perfectShort ? `, exhausted the 2× attempt budget with ${gen.accepted.length}/${needed} accepted` : "");
          intakeWarning = `Intake spec doesn't match ${tool}'s expected input — fix the intake generator before trusting results. (${gen.rejected.length}/${gen.totalAttempted} intakes failed validation${abortNote}; aborting fix-generation.) Deficiencies: ${gen.rejected.slice(0, 3).map((r) => r.reason).join(" | ")}`;
          await log("error", intakeWarning);
          await upd({
            status: "error",
            error: intakeWarning,
            completed_at: new Date().toISOString(),
          });
          clearInterval(heartbeat);
          return;
        }
        state.intakeGen = undefined;
        await persistState();
        await log("success", `Intakes ready: ${intakes.length} total (${pinnedCount} pinned + ${gen.accepted.length} generated / ${gen.totalAttempted} attempted)`);
      } catch (e) {
        await log("error", `Intake generation failed: ${(e as Error).message}`);
        await upd({ status: "error", error: `Intake generation failed: ${(e as Error).message}`, completed_at: new Date().toISOString() });
        clearInterval(heartbeat);
        return;
      }
      await admin.from("quality_runs").update({ intakes, status: "building", next_doc_index: 0 }).eq("id", runId);
      // CHUNK BOUNDARY (2026-07-11): scenario generation consumes 200-300s of the
      // 400s isolate budget on heavy tools (cppa-risk 5-stage, dpia, governance,
      // cppa-admt). Starting Doc 1 in the SAME isolate leaves too little budget
      // and the isolate is hard-killed mid-doc-1 (orphan class root cause verified
      // 2026-07-11: #62/#64/#66/#67/#70 all died ~400s after isolate boot with
      // Doc 1/N building). Persist intakes, hand off to a fresh isolate so Doc 1
      // gets a full ~400s budget — same treatment every subsequent doc already
      // gets via the tail-of-loop self-reinvoke.
      await log("info", `Intakes persisted — self-reinvoking so Doc 1 starts in a fresh isolate (chunk-1 wall-clock guard)`);
      await selfReinvoke(runId);
      clearInterval(heartbeat);
      return;
    } else {
      await log("info", `Resuming run #${runNumber} for ${tool} at doc ${(run.next_doc_index ?? 0) + 1}/${intakes.length}`);
      await upd({ status: "building" });
    }

    // ---------- 2. Process chunk of docs ----------
    const startIdx = run.next_doc_index ?? 0;
    const chunkSize = docsPerInvocation(tool);
    const endIdx = Math.min(startIdx + chunkSize, intakes.length);
    // P-A: split is positional and stable across resumes (no `_set` field is injected
    // into the intake object, so buildDocument's schema-strict generators don't choke).
    // The last ~30% of intakes are the held-out set; never used to gate fix candidates.
    // QB-P17 item 6 — holdout floor. Math.floor(n*0.7) puts the ONLY doc of
    // an n=1 run into "holdout" with an empty tuning set (0/1 tuning, 1/1
    // holdout) — the overfitting diagnostic is meaningless at that scale.
    // Fix: floor at 1 so at least one doc is tuning, and skip the split
    // entirely when n < 4 (all docs tuning; log that diagnostic is unavailable).
    const holdoutSplitEnabled = intakes.length >= 4;
    const holdoutStart = Math.max(1, Math.floor(intakes.length * 0.7));
    if (!holdoutSplitEnabled) {
      await log("info", `tuning/holdout split disabled (n=${intakes.length} < 4); overfitting diagnostic unavailable this run`);
    }
    const scenarioSetFor = (idx: number) => holdoutSplitEnabled && idx >= holdoutStart ? "holdout" : "tuning";

    for (let i = startIdx; i < endIdx; i++) {
      // Cancel check
      const { data: cancelCheck } = await admin.from("quality_runs").select("cancel_requested").eq("id", runId).single();
      if ((cancelCheck as any)?.cancel_requested) {
        await log("warn", `Run cancelled by user after ${i}/${intakes.length} documents`);
        await upd({ status: "cancelled", completed_at: new Date().toISOString(), error: "Cancelled by user" });
        clearInterval(heartbeat);
        return;
      }

      const scenarioSet = scenarioSetFor(i);

      // GEN/EVAL CHUNK BOUNDARY (r1b1.2, 2026-07-11): if the previous isolate
      // built this doc and handed off via `pending_eval_doc_id`, resume in the
      // evaluation phase without rebuilding. Otherwise, build then reinvoke.
      const pendingEvalId = (state as any).pending_eval_doc_id as string | null | undefined;
      const pendingEvalIdx = (state as any).pending_eval_doc_index as number | null | undefined;
      const isResumingEval = !!pendingEvalId && pendingEvalIdx === i;

      let docRowId!: string;
      let intake: any;
      let reportData: any;
      let docLabel!: string;
      let evalOnly = false;
      // CV1-R2 T4c — source refs also required in eval-resume for auto-regen.
      let evalSourceTable: string | null = null;
      let evalSourceRowId: string | null = null;

      if (isResumingEval) {
        const { data: existing } = await admin.from("quality_run_documents")
          .select("id, doc_number, intake_data, report_data, scenario_set, source_table, source_row_id")
          .eq("id", pendingEvalId!).single();
        if (existing && (existing as any).report_data) {
          docRowId = (existing as any).id;
          intake = (existing as any).intake_data;
          reportData = (existing as any).report_data;
          evalSourceTable = (existing as any).source_table ?? null;
          evalSourceRowId = (existing as any).source_row_id ?? null;
          docLabel = `Doc ${(existing as any).doc_number}/${intakes.length} [${(existing as any).scenario_set ?? scenarioSet}] (eval-resume)`;
          evalOnly = true;
          delete (state as any).pending_eval_doc_id;
          delete (state as any).pending_eval_doc_index;
          await log("info", `${docLabel}: resumed in evaluation phase (fresh isolate — gen/eval chunk boundary)`);
        } else {
          await log("warn", `Doc ${i + 1}/${intakes.length}: pending-eval marker (${pendingEvalId}) missing or has no report_data — falling through to rebuild`);
          delete (state as any).pending_eval_doc_id;
          delete (state as any).pending_eval_doc_index;
        }
      }

      if (!evalOnly) {
        intake = intakes[i];
        docLabel = `Doc ${i + 1}/${intakes.length} [${scenarioSet}]`;

        // r1b1.4 POLL-RESUME BOUNDARY (2026-07-12): the poll of the generator
        // row is bounded per isolate (~300s, safely inside the 400s wall
        // clock). On deadline we persist `pending_gen` and self-reinvoke into
        // a fresh isolate that CONTINUES polling the same row (no rebuild).
        // A doc-level total budget (20min) guards against dead generators —
        // see dpia #62 mid-doc-4: run-dpia-framework died silently, the
        // unbounded harness poll then waited on a row that would never flip
        // until its own isolate hit 400s and orphaned the run.
        const pendingGen = (state as any).pending_gen as {
          doc_index: number; doc_row_id: string;
          source_table: string; source_row_id: string;
          gen_started_at: number; isolate_count: number;
          resurrect_attempts?: number;
        } | undefined;
        const isTransient = !POLL_TOOLS.has(tool);

        let sourceTable: string;
        let sourceRowId: string;
        let genStartedAt: number;
        let isolateCount: number;
        let resurrectAttempts = 0;

        if (pendingGen && pendingGen.doc_index === i) {
          docRowId = pendingGen.doc_row_id;
          sourceTable = pendingGen.source_table;
          sourceRowId = pendingGen.source_row_id;
          genStartedAt = pendingGen.gen_started_at;
          isolateCount = (pendingGen.isolate_count ?? 1) + 1;
          resurrectAttempts = pendingGen.resurrect_attempts ?? 0;
          await log("info", `${docLabel}: resuming poll of ${sourceTable}/${sourceRowId} (isolate ${isolateCount}, gen elapsed ${Math.round((Date.now() - genStartedAt) / 1000)}s)`);

        } else {
          await log("info", `${docLabel}: building…`);
          const { data: docRow } = await admin.from("quality_run_documents").insert({
            run_id: runId, tool, doc_number: i + 1, intake_data: intake, status: "building",
            scenario_set: scenarioSet,
            fixture_variant: fixtureVariant,
          }).select("id").single();
          if (!docRow) { await log("warn", `${docLabel}: could not insert doc row`); continue; }
          docRowId = docRow.id;

          if (isTransient) {
            // Editorial/transient tools: the response IS the artifact — no
            // per-row polling needed. Preserve legacy buildDocument path.
            const result = await buildDocument(admin, tool, intake, userId);
            if (!result) {
              await log("warn", `${docLabel}: build failed`);
              await admin.from("quality_run_documents").update({ status: "error", error: "build failed" }).eq("id", docRowId);
              continue;
            }
            reportData = result.reportData;
            await admin.from("quality_run_documents").update({
              report_data: result.reportData, source_table: result.sourceTable,
              source_row_id: result.sourceRowId, status: "evaluating",
            }).eq("id", docRowId);
            // CV1-R3 F1: propagate fresh-gen source refs to the outer eval
            // locals so the counsel-voice auto-regen gate (below) sees a
            // non-null source on the fresh-generation path.
            evalSourceTable = result.sourceTable;
            evalSourceRowId = result.sourceRowId;
            (state as any).pending_eval_doc_id = docRowId;
            (state as any).pending_eval_doc_index = i;
            await log("info", `${docLabel}: built & persisted — self-reinvoking so evaluation runs in a fresh isolate (gen/eval boundary)`);
            await persistState({});
            await selfReinvoke(runId);
            clearInterval(heartbeat);
            return;
          }

          const dispatch = await dispatchGeneration(admin, tool, intake, userId, enginePath);
          if ("error" in dispatch) {
            // QB-P14 item 3 — surface the seed/dispatch error verbatim (was
            // just "dispatch failed" with no reason).
            const detail = String(dispatch.error).slice(0, 300);
            await log("error", `${docLabel}: dispatch failed — ${detail}`);
            await admin.from("quality_run_documents").update({ status: "error", error: `dispatch failed: ${detail}`.slice(0, 500) }).eq("id", docRowId);
            continue;
          }
          sourceTable = dispatch.sourceTable;
          sourceRowId = dispatch.sourceRowId;
          genStartedAt = Date.now();
          isolateCount = 1;
          // QB-P14 item 3 — capture the invokeFn promise's failure. invokeFn
          // throws `${name} ${status}: ${body.slice(0,200)}` on non-2xx or
          // network error; log that verbatim so a generator that 5xx's or
          // 404s (e.g. NOT_FOUND_FUNCTION_BLOB) is attributed instead of
          // disappearing under an unbounded "generator did not reach terminal
          // state" timeout later.
          const capturedLabel = docLabel; // freeze for the async handler
          dispatch.invocation.catch(async (e: unknown) => {
            const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300);
            try { await log("error", `${capturedLabel}: generator dispatch failed — ${msg}`); } catch { /* */ }
          });
          // Persist source refs immediately so a resumed isolate can pick up
          // even if this isolate is torn down before the first poll landing.
          await admin.from("quality_run_documents").update({
            source_table: sourceTable, source_row_id: sourceRowId,
          }).eq("id", docRowId);

        }

        // Doc-level total-timeout guard: one dead generator must never kill
        // the run. Mark THIS doc failed with evidence, drop pending_gen,
        // advance next_doc_index, and continue.
        if (Date.now() - genStartedAt > DOC_TOTAL_TIMEOUT_MS) {
          const elapsedS = Math.round((Date.now() - genStartedAt) / 1000);
          await log("error", `${docLabel}: generator did not reach terminal state within budget (${elapsedS}s, ${sourceTable}/${sourceRowId}) — marking doc failed and proceeding to next`);
          await admin.from("quality_run_documents").update({
            status: "error",
            error: `generator did not reach terminal state within budget (${elapsedS}s)`,
          }).eq("id", docRowId);
          delete (state as any).pending_gen;
          await persistState({ next_doc_index: i + 1 });
          continue;
        }

        const remainingTotal = DOC_TOTAL_TIMEOUT_MS - (Date.now() - genStartedAt);
        const isolateBudget = Math.max(15_000, Math.min(POLL_DEADLINE_MS, remainingTotal));
        const outcome = await pollGenerationRow(admin, sourceTable, sourceRowId, isolateBudget, {
          tool, log: log as (level: string, msg: string) => Promise<void>,
          initialResurrectAttempts: resurrectAttempts,
          onResurrect: (n) => { resurrectAttempts = n; },
        });

        if (outcome.status === "deadline") {
          (state as any).pending_gen = {
            doc_index: i, doc_row_id: docRowId,
            source_table: sourceTable, source_row_id: sourceRowId,
            gen_started_at: genStartedAt, isolate_count: isolateCount,
            resurrect_attempts: resurrectAttempts,
          };

          await log("info", `${docLabel}: poll deadline reached (isolate ${isolateCount}, ${Math.round(isolateBudget/1000)}s) — persisting pending_gen and self-reinvoking to CONTINUE polling (poll-resume boundary)`);
          await persistState({});
          await selfReinvoke(runId);
          clearInterval(heartbeat);
          return;
        }

        if (outcome.status === "error") {
          await log("warn", `${docLabel}: build failed — ${outcome.error}`);
          await admin.from("quality_run_documents").update({ status: "error", error: outcome.error.slice(0, 300) }).eq("id", docRowId);
          delete (state as any).pending_gen;
          await persistState({ next_doc_index: i + 1 });
          continue;
        }

        // Complete.
        reportData = outcome.reportData;
        delete (state as any).pending_gen;
        await admin.from("quality_run_documents").update({
          report_data: reportData, source_table: sourceTable,
          source_row_id: sourceRowId, status: "evaluating",
        }).eq("id", docRowId);
        // CV1-R3 F1: propagate fresh-gen source refs to the outer eval
        // locals so the counsel-voice auto-regen gate (below) sees a
        // non-null source on the dispatch/poll fresh-generation path.
        const _resolved = resolveEvalSourceRef(
          { table: evalSourceTable, rowId: evalSourceRowId },
          { table: sourceTable, rowId: sourceRowId },
        );
        if (_resolved) {
          evalSourceTable = _resolved.table || evalSourceTable;
          evalSourceRowId = _resolved.rowId;
        }

        // GEN/EVAL CHUNK BOUNDARY (r1b1.2): hand off to a fresh isolate so
        // dual-model evaluation (~200-250s) gets a full ~400s budget.
        (state as any).pending_eval_doc_id = docRowId;
        (state as any).pending_eval_doc_index = i;
        await log("info", `${docLabel}: built & persisted — self-reinvoking so evaluation runs in a fresh isolate (gen/eval boundary)`);
        await persistState({});
        await selfReinvoke(runId);
        clearInterval(heartbeat);
        return;
      }

      // ---------- CV1-R2 T4c: counsel-voice auto-regen (single round) ----------
      // Trigger only when ALL failing deterministic checks are counsel-voice
      // (e5_bare_advisory_close / e6_counsel_referral) and every non-CV
      // deterministic check passed. Hard cap: one round per doc, per batch —
      // enforced by the `regen_round` marker on report_data (persisted, so a
      // resumed isolate cannot re-trigger). Never targets a score; the
      // trigger is deterministic-check failure only.
      //
      // REGEN POLL-RESUME BOUNDARY (2026-08-11): the regeneration poll used a
      // single fixed 300s window inside one isolate. Slow generators (cppa-admt
      // routinely needs 600-900s across 2-4 isolates on the primary path) could
      // never land inside it, so every eligible admt doc logged "regeneration
      // did not produce a doc". The regen now uses the same pending-state +
      // self-reinvoke machinery as the primary generation poll, bounded by the
      // same 20min doc-total budget, and logs the actual failure reason.
      try {
        const _rdA1 = reportData as any;
        const detChecksAttempt1Live: any[] = Array.isArray(_rdA1?._meta?.internal?.deterministic_checks)
          ? _rdA1._meta.internal.deterministic_checks
          : (Array.isArray(_rdA1?.deterministic_checks) ? _rdA1.deterministic_checks : []);

        const pendingRegen = (state as any).pending_regen as {
          doc_index: number; doc_row_id: string; nonce: string;
          source_table: string; source_row_id: string;
          started_at: number; isolate_count: number; prior_checks: any[];
        } | undefined;
        const resumingRegen = !!pendingRegen && pendingRegen.doc_index === i;

        const alreadyRegenerated = Number((reportData as any)?.regen_round ?? 0) > 0;

        let nonce = "";
        let detChecksAttempt1 = detChecksAttempt1Live;
        let regenTable: string | null = null;
        let regenRowId: string | null = null;
        let regenStartedAt = Date.now();
        let regenIsolate = 1;
        let reportData2: any = null;
        let failReason: string | null = null;
        let proceed = false;

        if (resumingRegen) {
          nonce = pendingRegen!.nonce;
          detChecksAttempt1 = Array.isArray(pendingRegen!.prior_checks) ? pendingRegen!.prior_checks : detChecksAttempt1Live;
          regenTable = pendingRegen!.source_table;
          regenRowId = pendingRegen!.source_row_id;
          regenStartedAt = pendingRegen!.started_at;
          regenIsolate = (pendingRegen!.isolate_count ?? 1) + 1;
          proceed = true;
          await log("info", `${docLabel}: CV1-R2 resuming regen poll of ${regenTable}/${regenRowId} (isolate ${regenIsolate}, elapsed ${Math.round((Date.now() - regenStartedAt) / 1000)}s)`);
        } else if (
          !alreadyRegenerated
          && evalSourceRowId
          && isCounselVoiceRegenEligible(detChecksAttempt1)
        ) {
          nonce = crypto.randomUUID();
          await log("info", `${docLabel}: CV1-R2 counsel-voice regen eligible — dispatching single regeneration round (nonce=${nonce})`);
          // Claim the nonce in revision_dispatch_ledger BEFORE any dispatch,
          // matching the existing regenerate-assessment discipline. If the
          // insert fails (unique violation / race), skip regen for this doc.
          const { error: ledgerErr } = await admin
            .from("revision_dispatch_ledger")
            .insert({
              nonce,
              assessment_id: evalSourceRowId,
              tool_type: tool,
              action: "cv1_r2_auto_regen",
            });
          if (ledgerErr) {
            await log("warn", `${docLabel}: CV1-R2 ledger claim failed (${ledgerErr.message}) — leaving attempt-1 findings intact`);
          } else {
            // Second attempt via the same generator path. This is the
            // "regeneration round for that document" — the harness path the
            // instruction identifies. buildDocument/dispatchGeneration are
            // the in-runtime dispatch surface; regenerate-assessment is
            // scoped to revision-with-answered-items and cannot be used
            // for a plain re-draft.
            try {
              if (POLL_TOOLS.has(tool)) {
                const d2: any = await dispatchGeneration(admin, tool, intake, userId, enginePath);
                if (d2 && "error" in d2) {
                  failReason = `dispatch failed — ${String(d2.error).slice(0, 200)}`;
                } else if (d2?.sourceRowId) {
                  d2.invocation?.catch?.(() => { /* surfaced via poll outcome */ });
                  regenTable = d2.sourceTable;
                  regenRowId = d2.sourceRowId;
                  proceed = true;
                } else {
                  failReason = "dispatch returned no generator row";
                }
              } else {
                const b2 = await buildDocument(admin, tool, intake, userId);
                if (b2) reportData2 = b2.reportData;
                else failReason = "inline build returned nothing";
              }
            } catch (e) {
              failReason = `dispatch threw — ${(e as Error).message}`;
            }
          }
        }

        if (proceed && regenTable && regenRowId) {
          const elapsed = Date.now() - regenStartedAt;
          if (elapsed > DOC_TOTAL_TIMEOUT_MS) {
            failReason = `generator did not reach terminal state within budget (${Math.round(elapsed / 1000)}s)`;
            delete (state as any).pending_regen;
          } else {
            const budget = Math.max(15_000, Math.min(POLL_DEADLINE_MS, DOC_TOTAL_TIMEOUT_MS - elapsed));
            const outcome2 = await pollGenerationRow(admin, regenTable, regenRowId, budget, { tool, log: log as (level: string, msg: string) => Promise<void> });
            if (outcome2.status === "complete") {
              reportData2 = outcome2.reportData;
              delete (state as any).pending_regen;
            } else if (outcome2.status === "error") {
              failReason = outcome2.error;
              delete (state as any).pending_regen;
            } else {
              // Deadline: hand off to a fresh isolate that CONTINUES polling
              // the regen row. Re-arm the eval-resume markers so the next
              // isolate lands back in this doc's evaluation phase.
              (state as any).pending_regen = {
                doc_index: i, doc_row_id: docRowId, nonce,
                source_table: regenTable, source_row_id: regenRowId,
                started_at: regenStartedAt, isolate_count: regenIsolate,
                prior_checks: detChecksAttempt1,
              };
              (state as any).pending_eval_doc_id = docRowId;
              (state as any).pending_eval_doc_index = i;
              await log("info", `${docLabel}: CV1-R2 regen poll deadline (isolate ${regenIsolate}, ${Math.round(budget / 1000)}s) — self-reinvoking to CONTINUE polling the regen row`);
              await persistState({});
              await selfReinvoke(runId);
              clearInterval(heartbeat);
              return;
            }
          }
        }

        if (reportData2) {
          // Stamp regen_round=1 on the fresh reportData and persist onto
          // the SAME quality_run_documents row. Attempt-1 findings are
          // preserved separately below with a regen_round=0 marker.
          reportData2.regen_round = 1;
          reportData2.regen_nonce = nonce;
          reportData2.regen_prior_deterministic_checks = detChecksAttempt1;
          await admin.from("quality_run_documents").update({
            report_data: reportData2,
          }).eq("id", docRowId);
          // Persist attempt-1 deterministic checks as a distinct finding
          // batch so reviewers can tell the two attempts apart. Downstream
          // merge (below) will add attempt-2 checks in the normal path.
          const priorRows = detChecksAttempt1.map((f: any) => ({
            run_id: runId, doc_id: docRowId, tool, run_number: runNumber,
            check_id: f.check_id, check_type: "deterministic",
            dimension: f.dimension ?? "formatting",
            severity: f.severity ?? "medium",
            passed: !!f.passed,
            evidence: f.evidence
              ? `[regen_round=0] ${String(f.evidence).slice(0, 380)}`
              : "[regen_round=0]",
            scenario_set: scenarioSet,
          }));
          if (priorRows.length) {
            try { await admin.from("quality_findings").insert(priorRows); }
            catch (e) { console.warn("[cv1-r2] prior-attempt findings insert non-fatal:", (e as Error).message); }
          }
          await log("success", `${docLabel}: CV1-R2 regeneration complete — evaluating attempt 2`);
          reportData = reportData2;
        } else if (failReason) {
          delete (state as any).pending_regen;
          await log("warn", `${docLabel}: CV1-R2 regeneration did not produce a doc (${failReason}) — recording attempt-1 result and moving on`);
        }
      } catch (e) {
        console.warn("[cv1-r2] auto-regen block non-fatal:", (e as Error).message);
      }


      // ---------- Evaluation phase ----------
      await log("info", `${docLabel}: evaluating Claude + GPT-4o + cross-review in parallel…`);

      // Run Claude eval and GPT eval in parallel.
      const [claudeEval, gptResult] = await Promise.all([
        withTimeout(evaluateDocumentClaude(tool, intake, reportData, fixtureVariant, graderMode), EVALUATION_TIMEOUT_MS, "Claude eval")
          .catch(e => { console.warn("Claude eval failed:", e.message); return null; }),
        withTimeout(evaluateDocumentGPT(tool, intake, reportData, fixtureVariant, graderMode), EVALUATION_TIMEOUT_MS, "GPT-4o eval")
          .catch(e => ({ eval: null as any, error: e.message })),
      ]);

      if (!claudeEval) {
        // QB-P17 item 1 — PARSE-FAILURE QUARANTINE. Doc is marked eval_failed
        // (distinct from a product-scoring event); state.built is NOT
        // incremented so this doc contributes nothing to run aggregates,
        // and if every doc in the run fails eval, the run terminates as
        // status="error" with score_overall=null — which applyStopRule in the
        // orchestrator already treats as "no run slot consumed".
        await log("error", `${docLabel}: eval_failed — Claude evaluation returned null/unparseable; excluding from aggregates and stop-rule`);
        await admin.from("quality_run_documents").update({ status: "eval_failed", error: "Claude evaluation returned null/unparseable" }).eq("id", docRowId);
        await persistState({ next_doc_index: i + 1 });
        continue;
      }
      const gptEval = gptResult.eval;
      // GRADER-SYM-1 items 2 & 3 — before anything reads or stores GPT's
      // numbers: debit GPT's dimension scores with the SAME deterministic
      // failures Claude was debited for, then recompute GPT's per-doc overall
      // with weightsFor(tool) instead of trusting the model's self-report.
      if (gptEval?.dimension_scores) {
        const _detForGpt = (claudeEval.findings ?? []).filter((f: any) => f.check_type === "deterministic");
        const _gptRawSelfReported = gptEval.overall_score;
        gptEval.dimension_scores = applyDeterministicPenalties(gptEval.dimension_scores as any, _detForGpt as any);
        const _gw = weightsFor(tool);
        gptEval.overall_score = weightedOverall(gptEval.dimension_scores as any, _gw as any);
        gptEval.overall_score_display = Math.round(gptEval.overall_score);
        gptEval.overall_score_self_reported = _gptRawSelfReported ?? null;
        gptEval.scoring_method = "weighted_recompute_with_deterministic_penalties";
      }

      if (gptEval) {
        await log("success", `${docLabel}: GPT-4o OK (overall ${gptEval.overall_score}/100)`);
      } else if ((gptResult as any).skipReason) {
        await log("warn", `${docLabel}: GPT-4o SKIPPED — ${(gptResult as any).skipReason}`);
      } else {
        await log("error", `${docLabel}: GPT-4o FAILED — ${gptResult.error ?? "unknown error"}`);
      }

      // F4: deterministic cross-review — no LLM call. Categorize each rubric finding
      // by joining Claude and GPT verdicts on the SHARED check_id.
      const gptFindings: any[] = gptEval?.findings ?? [];
      const gptById = new Map<string, any>(gptFindings.map((f: any) => [f.check_id, f]));
      const claudeRubricById = new Map<string, any>(
        claudeEval.findings.filter((f: any) => f.check_type === "llm").map((f: any) => [f.check_id, f])
      );

      await log("success", `${docLabel}: scored ${claudeEval.overall_score}/100${gptEval ? ` (GPT ${gptEval.overall_score}/100)` : ""}`);

      const finalScores  = claudeEval.dimension_scores;
      const finalOverall = claudeEval.overall_score;

      for (const dim of Object.keys(state.dimTotals)) {
        const v = (finalScores as any)[dim] ?? 60;
        state.dimTotals[dim] += v;
        if (scenarioSet === "tuning")  state.tuningDimTotals[dim]  += v;
        if (scenarioSet === "holdout") state.holdoutDimTotals[dim] += v;
      }
      if (gptEval?.dimension_scores) {
        for (const dim of Object.keys(state.gptTotals)) {
          state.gptTotals[dim] += (gptEval.dimension_scores as any)[dim] ?? 60;
        }
        state.gptBuilt++;
      }
      state.built++;
      if (scenarioSet === "tuning")  state.tuningBuilt++;
      if (scenarioSet === "holdout") state.holdoutBuilt++;

      // QB-P10 — accumulate per-grader post-filter drop counts for the digest.
      const cd = (claudeEval as any)?.post_filter_dropped;
      if (cd) {
        state.claudePostFilterDrops.a2 += cd.a2 ?? 0;
        state.claudePostFilterDrops.a3 += cd.a3 ?? 0;
        state.claudePostFilterDrops.a4 += cd.a4 ?? 0;
        state.claudePostFilterDrops.r15c2 += cd.r15c2 ?? 0;
        state.claudePostFilterDrops.dpa_defaults += cd.dpa_defaults ?? 0;
      }
      const gd = (gptResult as any)?.postFilterDropped;
      if (gd) {
        state.gptPostFilterDrops.a2 += gd.a2 ?? 0;
        state.gptPostFilterDrops.a3 += gd.a3 ?? 0;
        state.gptPostFilterDrops.a4 += gd.a4 ?? 0;
        state.gptPostFilterDrops.r15c2 += gd.r15c2 ?? 0;
        state.gptPostFilterDrops.dpa_defaults += gd.dpa_defaults ?? 0;
      }

      // QB-P14 item 4 — post-filter SUPPRESSION AUDIT TRAIL.
      // Log each dropped finding to the progress log (check_id, grader, rule,
      // first 300 chars of evidence) and accumulate onto state so the campaign
      // digest carries the same audit trail. No behavior change to filtering.
      const claudeSupp = ((claudeEval as any)?.post_filter_suppressed ?? []) as Array<{ rule: string; check_id: string; evidence: string }>;
      const gptSupp = ((gptResult as any)?.postFilterSuppressed ?? []) as Array<{ rule: string; check_id: string; evidence: string }>;
      for (const s of claudeSupp) {
        await log("info", `${docLabel}: post-filter drop [claude/${s.rule}] ${s.check_id} — evidence: ${s.evidence.replace(/\s+/g, " ").slice(0, 220)}`);
        state.postFilterSuppressed.push({ doc_index: i, grader: "claude", ...s });
      }
      for (const s of gptSupp) {
        await log("info", `${docLabel}: post-filter drop [gpt/${s.rule}] ${s.check_id} — evidence: ${s.evidence.replace(/\s+/g, " ").slice(0, 220)}`);
        state.postFilterSuppressed.push({ doc_index: i, grader: "gpt", ...s });
      }


      const crossStatus = !gptEval ? "gpt_failed" : "complete";

      // Persist a lightweight cross-review summary (deterministic, no LLM payload).
      const crossSummary = gptEval ? {
        method: "deterministic_join_v2",
        claude_overall: claudeEval.overall_score,
        gpt_overall: gptEval.overall_score,
        rubric_findings_compared: new Set([...claudeRubricById.keys(), ...gptById.keys()]).size,
      } : null;

      await admin.from("quality_run_documents").update({
        dimension_scores: { ...finalScores, overall: finalOverall },
        overall_score: finalOverall,
        gpt_evaluation: gptEval ?? null,
        gpt_dimension_scores: gptEval?.dimension_scores ?? null,
        gpt_overall_score: gptEval?.overall_score ?? null,
        cross_review: crossSummary,
        cross_review_status: crossStatus,
        status: "complete",
      }).eq("id", docRowId);

      const findingRows = claudeEval.findings.map((f: any) => ({
        run_id: runId, doc_id: docRowId, tool, run_number: runNumber,
        check_id: f.check_id, check_type: f.check_type, dimension: f.dimension,
        severity: f.severity, passed: f.passed, evidence: f.evidence ?? null,
        scenario_set: scenarioSet,
      }));
      if (findingRows.length) await admin.from("quality_findings").insert(findingRows);

      // PROMPT 10A — CALIBRATION VISIBILITY. Findings removed from SCORING by the
      // skeleton calibration rules are still persisted, flagged
      // filtered_from_scoring=true with their rule id, so nothing disappears.
      const calRows = [
        ...(((claudeEval as any)?.calibration_filtered ?? []) as any[]).map((c) => ({ c, who: "llm" })),
        ...(((gptResult as any)?.calibrationFiltered ?? []) as any[]).map((c) => ({ c, who: "llm_gpt" })),
      ].map(({ c, who }) => ({
        run_id: runId, doc_id: docRowId, tool, run_number: runNumber,
        check_id: c.check_id, check_type: who, dimension: c.dimension,
        severity: c.severity, passed: false, evidence: c.evidence ?? null,
        scenario_set: scenarioSet,
        filtered_from_scoring: true,
        calibration_rule: c.rule,
      }));
      if (calRows.length) {
        await admin.from("quality_findings").insert(calRows);
        await log("info", `${docLabel}: calibration filtered ${calRows.length} finding(s) — ${calRows.map((r) => `${r.calibration_rule}/${r.check_id}`).join(", ")}`);
      }

      // Push Claude findings with per-doc cross-category.
      //  - Deterministic failures → "deterministic" (code-verified ground truth)
      //  - Deterministic passes → no category (don't surface as defect)
      //  - Rubric (llm) findings → categorized by joining with gpt verdict for the SAME check_id
      // Deterministic findings pass through unchanged (code-verified ground truth).
      for (const f of claudeEval.findings.filter((x: any) => x.check_type === "deterministic")) {
        state.allDocFindings.push({
          ...f,
          doc_id: docRowId,
          scenario_set: scenarioSet,
          cross_category: f.passed ? null : "deterministic",
          cross_evidence_gpt: null,
          rubric_addition: null,
        });
      }

      // GRADER-SYM-1 item 1 — UNION RECONCILIATION.
      // Previously the join walked Claude's findings only and looked GPT up by
      // check_id, with a second pass appending GPT-only rows. Reconciliation is
      // now driven by the union of check_ids: the canonical rubricFor(tool)
      // checklist plus anything either grader actually returned. A check_id
      // Claude's model silently omits can no longer swallow (or de-evidence)
      // a GPT hit on the same check.
      {
        const _rubricMetaDoc = new Map(rubricFor(tool).map((r: any) => [r.id, r]));
        const unionIds = new Set<string>([
          ...Array.from(claudeRubricById.keys()),
          ...Array.from(gptById.keys()),
        ]);
        for (const id of unionIds) {
          const cF = claudeRubricById.get(id);
          const gF = gptEval ? gptById.get(id) : null;
          const claudeFail = cF ? !cF.passed : false;
          const gptFail = gF ? !gF.passed : false;
          if (!claudeFail && !gptFail) continue; // agree_pass / unmentioned — not a defect
          const meta: any = _rubricMetaDoc.get(id);
          const perDocCategory = gptEval
            ? categorizePerDoc(claudeFail, gptFail)
            : (claudeFail ? "claude_only" : null);
          state.allDocFindings.push({
            check_id: id,
            check_type: cF ? "llm" : "gpt_only",
            dimension: cF?.dimension ?? gF?.dimension ?? meta?.dimension ?? "accuracy",
            severity: cF?.severity ?? gF?.severity ?? meta?.severity ?? "medium",
            passed: false,
            evidence: cF?.evidence ?? gF?.evidence ?? null,
            doc_id: docRowId,
            scenario_set: scenarioSet,
            cross_category: perDocCategory,
            cross_evidence_gpt: gF?.evidence ?? null,
            claude_mentioned: !!cF,
            rubric_addition: null,
          });
        }
      }

      // COUNSEL-VOICE-1 E-completion: merge per-tool deterministic format
      // checks emitted by the generator into report_data.deterministic_checks
      // so they count toward checks_total / checks_passed alongside grader
      // findings. Deterministic here means "computed in code" — no LLM.
      try {
        const _rdM = reportData as any;
        const detChecks: any[] = Array.isArray(_rdM?._meta?.internal?.deterministic_checks)
          ? _rdM._meta.internal.deterministic_checks
          : (Array.isArray(_rdM?.deterministic_checks) ? _rdM.deterministic_checks : []);

        if (detChecks.length) {
          const detRows = detChecks.map((f: any) => ({
            run_id: runId, doc_id: docRowId, tool, run_number: runNumber,
            check_id: f.check_id, check_type: "deterministic",
            dimension: f.dimension ?? "formatting",
            severity: f.severity ?? "medium",
            passed: !!f.passed, evidence: f.evidence ?? null,
            scenario_set: scenarioSet,
          }));
          await admin.from("quality_findings").insert(detRows);
          for (const f of detRows) {
            state.allDocFindings.push({
              ...f, cross_category: f.passed ? null : "deterministic",
              cross_evidence_gpt: null, rubric_addition: null,
            });
          }
        }
      } catch (e) {
        console.warn("[run-quality-batch] deterministic_checks merge non-fatal:", (e as Error).message);
      }


      // GRADER-SYM-1 item 1 — the former standalone GPT-only pass is folded
      // into the union reconciliation above (it double-counted otherwise).

      await persistState({ next_doc_index: i + 1 });
    }

    // ---------- 3. More work? Self-reinvoke ----------
    if (endIdx < intakes.length) {
      await log("info", `Chunk complete (${endIdx}/${intakes.length}). Self-reinvoking for next chunk…`);
      await persistState({ next_doc_index: endIdx });
      await selfReinvoke(runId);
      clearInterval(heartbeat);
      return;
    }

    // ---------- 4. Final aggregation ----------
    if (state.built === 0) {
      await log("error", `No documents completed successfully`);
      await upd({ status: "error", completed_at: new Date().toISOString(), error: "No documents completed" });
      clearInterval(heartbeat);
      return;
    }

    await upd({ status: "evaluating" });
    await log("info", `All documents processed (${state.built}/${intakes.length} built). Aggregating scores…`);

    const avg = (v: number) => state.built > 0 ? Math.round(v / state.built) : 0;
    const scores = {
      accuracy: avg(state.dimTotals.accuracy), citation: avg(state.dimTotals.citation),
      hallucination: avg(state.dimTotals.hallucination), analysis: avg(state.dimTotals.analysis),
      intelligence: avg(state.dimTotals.intelligence), formatting: avg(state.dimTotals.formatting),
    };
    const w = weightsFor(tool);
    // QB-P17 item 2 — keep unrounded overall for certification gate (a true
    // 97.5 must NOT pass a >=98 gate). `overallDisplay` is the rounded copy
    // used in log lines / dimension_scores summaries.
    const overallRaw = scores.accuracy * w.accuracy + scores.citation * w.citation + scores.hallucination * w.hallucination + scores.analysis * w.analysis + scores.intelligence * w.intelligence + scores.formatting * w.formatting;
    const overall = overallRaw;
    const overallDisplay = Math.round(overallRaw);

    // P-A: tuning/holdout split — overfitting diagnostic. Both numbers are stored;
    // tuning rises while holdout flat/down ⇒ the loop is teaching to the test.
    const setAvg = (totals: Record<string, number>, n: number, k: string) => n > 0 ? Math.round((totals[k] ?? 0) / n) : null;
    const tuningScores = state.tuningBuilt > 0 ? {
      accuracy: setAvg(state.tuningDimTotals, state.tuningBuilt, "accuracy")!,
      citation: setAvg(state.tuningDimTotals, state.tuningBuilt, "citation")!,
      hallucination: setAvg(state.tuningDimTotals, state.tuningBuilt, "hallucination")!,
      analysis: setAvg(state.tuningDimTotals, state.tuningBuilt, "analysis")!,
      intelligence: setAvg(state.tuningDimTotals, state.tuningBuilt, "intelligence")!,
      formatting: setAvg(state.tuningDimTotals, state.tuningBuilt, "formatting")!,
    } : null;
    const holdoutScores = state.holdoutBuilt > 0 ? {
      accuracy: setAvg(state.holdoutDimTotals, state.holdoutBuilt, "accuracy")!,
      citation: setAvg(state.holdoutDimTotals, state.holdoutBuilt, "citation")!,
      hallucination: setAvg(state.holdoutDimTotals, state.holdoutBuilt, "hallucination")!,
      analysis: setAvg(state.holdoutDimTotals, state.holdoutBuilt, "analysis")!,
      intelligence: setAvg(state.holdoutDimTotals, state.holdoutBuilt, "intelligence")!,
      formatting: setAvg(state.holdoutDimTotals, state.holdoutBuilt, "formatting")!,
    } : null;
    const overallFor = (s: typeof tuningScores) => s
      ? Math.round(s.accuracy * w.accuracy + s.citation * w.citation + s.hallucination * w.hallucination +
                   s.analysis * w.analysis + s.intelligence * w.intelligence + s.formatting * w.formatting)
      : null;
    const overallTuning  = overallFor(tuningScores);
    const overallHoldout = overallFor(holdoutScores);
    await log("info", `Held-out split: tuning=${state.tuningBuilt} (overall ${overallTuning ?? "n/a"}/100), holdout=${state.holdoutBuilt} (overall ${overallHoldout ?? "n/a"}/100)`);

    const byCheck = new Map<string, any[]>();
    for (const f of state.allDocFindings) {
      if (!byCheck.has(f.check_id)) byCheck.set(f.check_id, []);
      byCheck.get(f.check_id)!.push(f);
    }

    // HARNESS-FIXGEN-RETIREMENT (CEO 2026-07-26): AI-fix-suggestion generation is
    // retired for measurement batches. Default OFF via HARNESS_FIXGEN_ENABLED flag;
    // fix decisions flow exclusively through the controller's attribution → five-lens
    // → Legal Test turn process. Backlog aggregation (occurrence counts, classes,
    // first/last-seen waves) stays via classify-quality-findings — that is telemetry.
    // Cap retained ONLY as a defensive ceiling if the flag is ever re-enabled.
    const FIXGEN_ENABLED  = (Deno.env.get("HARNESS_FIXGEN_ENABLED") ?? "false").toLowerCase() === "true";
    const MAX_AI_FIXES    = 50;
    const FIX_CONCURRENCY = 5;
    type CheckAgg = {
      checkId: string; findings: any[]; first: any;
      passed: number; failed: number; failRate: number; evidence: string[];
      // P-A: per-set diagnostics
      tuningPassed: number; tuningFailed: number; tuningFailRate: number;
      holdoutPassed: number; holdoutFailed: number; holdoutFailRate: number;
      crossCategory: string | null; gptEvidence: string[]; rubricAddition: string | null;
      severityRank: number;
    };
    const aggregates: CheckAgg[] = [];
    for (const [checkId, findings] of byCheck) {
      const passed   = findings.filter(f => f.passed).length;
      const failed   = findings.filter(f => !f.passed).length;
      const failRate = findings.length ? failed / findings.length : 0;
      // QB-P5 Item 5(a) — cap raised 3→10 so fail_count>3 rows retain full sample_evidence.
      const evidence = findings.filter(f => !f.passed && f.evidence).map(f => f.evidence).slice(0, 10);
      const first    = findings[0];

      const tuningFindings  = findings.filter(f => f.scenario_set === "tuning");
      const holdoutFindings = findings.filter(f => f.scenario_set === "holdout");
      const tuningPassed   = tuningFindings.filter(f => f.passed).length;
      const tuningFailed   = tuningFindings.filter(f => !f.passed).length;
      const tuningFailRate = tuningFindings.length ? tuningFailed / tuningFindings.length : 0;
      const holdoutPassed   = holdoutFindings.filter(f => f.passed).length;
      const holdoutFailed   = holdoutFindings.filter(f => !f.passed).length;
      const holdoutFailRate = holdoutFindings.length ? holdoutFailed / holdoutFindings.length : 0;

      // F5: aggregation. "deterministic" if any deterministic failure (code-verified, trusted).
      // "agree" only if BOTH evaluators failed in >50% of applicable docs (not a single-doc override).
      // Otherwise pick the dominant disagreement category.
      const docCount        = findings.length;
      const deterministicHits = findings.filter(f => f.cross_category === "deterministic").length;
      const agreeFailDocs   = findings.filter(f => f.cross_category === "agree").length;
      const gptOnlyCount    = findings.filter(f => f.cross_category === "gpt_only").length;
      const claudeOnlyCount = findings.filter(f => f.cross_category === "claude_only").length;
      let crossCategory: string | null = null;
      if (deterministicHits > 0)                         crossCategory = "deterministic";
      else if (docCount > 0 && agreeFailDocs > docCount / 2) crossCategory = "agree";
      else if (claudeOnlyCount >= gptOnlyCount && claudeOnlyCount > 0) crossCategory = "claude_only";
      else if (gptOnlyCount > 0)                         crossCategory = "gpt_only";
      else if (findings.some(f => !f.passed))            crossCategory = "claude_only";

      const gptEvidence    = findings.filter(f => f.cross_evidence_gpt).map(f => f.cross_evidence_gpt).slice(0, 10);
      const rubricAddition = null; // F6: rubric_addition removed
      const sev = String(first?.severity ?? "").toLowerCase();
      const severityRank = sev === "critical" ? 3 : sev === "high" ? 2 : sev === "medium" ? 1 : 0;

      aggregates.push({
        checkId, findings, first, passed, failed, failRate, evidence,
        tuningPassed, tuningFailed, tuningFailRate,
        holdoutPassed, holdoutFailed, holdoutFailRate,
        crossCategory, gptEvidence, rubricAddition, severityRank,
      });
    }

    // Skip check_ids already successfully patched into this tool's file recently —
    // avoids proposing (and re-applying) the same instruction across separate runs.
    const { data: recentlyApplied, error: recentLookupErr } = await admin
      .from("quality_applied_patches")
      .select("check_id")
      .eq("tool", tool)
      .gte("applied_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (recentLookupErr) {
      console.warn("[run-quality-batch] dedup lookup failed, proceeding without it:", recentLookupErr.message);
    }
    const alreadyFixedIds = new Set((recentlyApplied ?? []).map((r: any) => r.check_id));

    // P-A: candidates are generated ONLY from TUNING failures (see original rationale).
    // Under FIXGEN retirement, this list is computed but not consumed unless the flag
    // is explicitly re-enabled. Tracked findings themselves are never truncated —
    // every unique failing check is upserted into quality_check_results below and
    // separately aggregated into quality_finding_backlog by classify-quality-findings.
    const hasTuningData = state.tuningBuilt > 0;
    const aiCandidates = FIXGEN_ENABLED
      ? aggregates
          .filter(a => a.evidence.length > 0)
          .filter(a => hasTuningData ? a.tuningFailRate > 0.2 : a.failRate > 0.2)
          .filter(a => !alreadyFixedIds.has(a.checkId))
          .sort((x, y) => (y.severityRank - x.severityRank) || (y.failed * y.failRate - x.failed * x.failRate))
          .slice(0, MAX_AI_FIXES)
      : [];

    if (FIXGEN_ENABLED) {
      await log("info", `Aggregating ${byCheck.size} unique checks; generating AI fixes for top ${aiCandidates.length} (cap ${MAX_AI_FIXES}, concurrency ${FIX_CONCURRENCY})…`);
    } else {
      await log("info", `Aggregating ${byCheck.size} unique checks; AI fix-suggestion generation DISABLED (HARNESS_FIXGEN_ENABLED=false; no batch result goes unread — every check is upserted and backlogged).`);
    }

    // Run fix-generation in parallel batches so we can raise the cap without exceeding runtime.
    // When FIXGEN_ENABLED=false, aiCandidates is empty so this loop is a no-op.
    const fixResults = new Map<string, { fix: string; location: string } | null>();
    for (let i = 0; i < aiCandidates.length; i += FIX_CONCURRENCY) {
      const batch = aiCandidates.slice(i, i + FIX_CONCURRENCY);
      const settled = await Promise.all(batch.map(a =>
        withTimeout(
          generateProposedFix(tool, a.checkId, a.first.dimension, a.evidence),
          30_000,
          `generateProposedFix(${a.checkId})`,
        ).catch(e => { console.warn(`[fix-gen] skipped ${a.checkId}:`, e?.message); return null; })
      ));
      batch.forEach((a, idx) => fixResults.set(a.checkId, settled[idx] ?? null));
    }

    for (const a of aggregates) {
      let proposedFix = "";
      let fixLocation = "";

      if (fixResults.has(a.checkId)) {
        const fix = fixResults.get(a.checkId);
        proposedFix = fix?.fix ?? "";
        fixLocation = fix?.location ?? "";
      }

      // RX-1b: if this check was filtered out because it was already patched recently,
      // surface that explicitly instead of showing a blank fix.
      if (!proposedFix && alreadyFixedIds.has(a.checkId)) {
        fixLocation = "DUPLICATE: already applied in a prior run — see quality_applied_patches";
      }

      const gptFailed  = a.findings.filter(f => !f.passed && f.cross_category === "gpt_only").length;
      const gptPassed  = Math.max(0, state.gptBuilt - gptFailed);
      const gptFailRate = state.gptBuilt > 0 ? gptFailed / state.gptBuilt : 0;

      await admin.from("quality_check_results").upsert({
        run_id: runId, tool, run_number: runNumber, check_id: a.checkId,
        check_type: a.first.check_type, dimension: a.first.dimension, severity: a.first.severity,
        pass_count: a.passed, fail_count: a.failed, fail_rate: a.failRate,
        tuning_pass_count: a.tuningPassed, tuning_fail_count: a.tuningFailed, tuning_fail_rate: a.tuningFailRate,
        holdout_pass_count: a.holdoutPassed, holdout_fail_count: a.holdoutFailed, holdout_fail_rate: a.holdoutFailRate,
        sample_evidence: a.evidence,
        gpt_pass_count: gptPassed, gpt_fail_count: gptFailed, gpt_fail_rate: gptFailRate,
        gpt_sample_evidence: a.gptEvidence.length ? a.gptEvidence : null,
        cross_review_category: a.crossCategory,
        cross_review_summary:
          a.crossCategory === "deterministic" ? "Code-verified failure (deterministic check) — ground truth."
          : a.crossCategory === "agree"       ? "Both Claude and GPT failed this check in the majority of docs."
          : a.crossCategory === "claude_only" ? "Claude flagged; GPT did not — possible Claude over-flagging or GPT blind spot."
          : a.crossCategory === "gpt_only"    ? "GPT flagged; Claude did not — possible Claude blind spot."
          : null,
        proposed_fix: proposedFix || null,
        fix_location: fixLocation || null,
        fix_selected: false, fix_applied: false,
      }, { onConflict: "run_id,check_id" });
    }

    const gptAvg = (v: number) => state.gptBuilt > 0 ? Math.round(v / state.gptBuilt) : null;
    const gptScores = state.gptBuilt > 0 ? {
      gpt_score_accuracy:      gptAvg(state.gptTotals.accuracy),
      gpt_score_citation:      gptAvg(state.gptTotals.citation),
      gpt_score_hallucination: gptAvg(state.gptTotals.hallucination),
      gpt_score_analysis:      gptAvg(state.gptTotals.analysis),
      gpt_score_intelligence:  gptAvg(state.gptTotals.intelligence),
      gpt_score_formatting:    gptAvg(state.gptTotals.formatting),
      gpt_score_overall: Math.round(
        (gptAvg(state.gptTotals.accuracy) ?? 0) * w.accuracy + (gptAvg(state.gptTotals.citation) ?? 0) * w.citation +
        (gptAvg(state.gptTotals.hallucination) ?? 0) * w.hallucination + (gptAvg(state.gptTotals.analysis) ?? 0) * w.analysis +
        (gptAvg(state.gptTotals.intelligence) ?? 0) * w.intelligence + (gptAvg(state.gptTotals.formatting) ?? 0) * w.formatting
      ),
    } : {};

    const gptOnlyTotal  = state.allDocFindings.filter(f => f.cross_category === "gpt_only" && !f.passed).length;
    const conflictTotal = state.allDocFindings.filter(f => f.cross_category === "conflict").length;

    await upd({
      status: "complete", completed_at: new Date().toISOString(),
      score_accuracy: scores.accuracy, score_citation: scores.citation,
      score_hallucination: scores.hallucination, score_analysis: scores.analysis,
      score_intelligence: scores.intelligence, score_formatting: scores.formatting,
      score_overall: overall,
      score_overall_tuning: overallTuning,
      score_overall_holdout: overallHoldout,
      checks_total: state.allDocFindings.length,
      checks_passed: state.allDocFindings.filter(f => f.passed).length,
      checks_failed: state.allDocFindings.filter(f => !f.passed).length,
      ...gptScores,
      cross_review_complete: state.gptBuilt > 0,
      gpt_only_count: gptOnlyTotal,
      conflict_count: conflictTotal,
    });
    await log("success", `Run complete — overall ${overallDisplay}/100 (raw ${overallRaw.toFixed(2)}; tuning ${overallTuning ?? "n/a"}/100, holdout ${overallHoldout ?? "n/a"}/100); ${state.allDocFindings.filter(f => !f.passed).length} failures across ${byCheck.size} checks`);

    // Aggregate snapshot
    try {
      const num = (n: number) => parseFloat(Number(n ?? 0).toFixed(2));
      const agreeTotal     = state.allDocFindings.filter(f => f.cross_category === "agree").length;
      const claudeOnlyTot  = state.allDocFindings.filter(f => f.cross_category === "claude_only").length;
      await admin.from("quality_score_ledger").insert({
        tool_name: tool,
        run_date: new Date().toISOString(),
        quality_run_id: runId,
        overall_score: num(overall),
        accuracy_score: num(scores.accuracy),
        completeness_score: num(scores.analysis),
        citation_quality_score: num(scores.citation),
        regulatory_coverage_score: num(scores.intelligence),
        actionability_score: num(scores.formatting),
        consistency_score: num(scores.hallucination),
        documents_evaluated: state.built,
        findings_count: state.allDocFindings.length,
        agree_count: agreeTotal,
        claude_only_count: claudeOnlyTot,
        gpt_only_count: gptOnlyTotal,
        conflict_count: conflictTotal,
      });
    } catch (ledgerErr) {
      console.error("[run-quality-batch] ledger insert failed:", ledgerErr);
    }

    // QB-P9 — campaign digest. If this run was seeded by the campaign
    // orchestrator (quality_runs.campaign_id set), write one digest row per
    // completed run. Best-effort; never fails the parent run.
    try {
      const { data: linkRow } = await admin.from("quality_runs")
        .select("campaign_id").eq("id", runId).maybeSingle();
      const campaignId = (linkRow as any)?.campaign_id ?? null;
      if (campaignId) {
        const { data: campaign } = await admin.from("quality_campaigns")
          .select("wave_number").eq("id", campaignId).maybeSingle();
        const claudeDims = {
          accuracy: scores.accuracy, citation: scores.citation, hallucination: scores.hallucination,
          analysis: scores.analysis, intelligence: scores.intelligence, formatting: scores.formatting,
        };
        const gptDims = state.gptBuilt > 0 ? {
          accuracy: gptScores.gpt_score_accuracy, citation: gptScores.gpt_score_citation,
          hallucination: gptScores.gpt_score_hallucination, analysis: gptScores.gpt_score_analysis,
          intelligence: gptScores.gpt_score_intelligence, formatting: gptScores.gpt_score_formatting,
        } : null;
        const failing = state.allDocFindings.filter(f => !f.passed).map((f: any) => ({
          check_id: f.check_id, severity: f.severity ?? null, dimension: f.dimension ?? null,
          cross_category: f.cross_category ?? null,
        }));
        // QB-P10 — real per-grader post-filter drop counts, threaded from
        // applyGraderCal1Filter via evaluateDocumentClaude / evaluateDocumentGPT
        // and accumulated across every doc in this run.
        const postFilterDrops = {
          basis: "recorded_v1",
          claude: state.claudePostFilterDrops,
          gpt: state.gptPostFilterDrops,
          // QB-P14 item 4 — audit trail (capped at 200 entries per digest to
          // keep the JSON column bounded; the batch progress log holds the
          // authoritative unbounded record).
          suppressed_findings: state.postFilterSuppressed.slice(0, 200),
          suppressed_total: state.postFilterSuppressed.length,
        };

        // QB-P17 item 7 — token/cost basis. The Claude grader model is
        // claude-opus-4-6; historical estimates used Sonnet pricing (~$0.10/doc)
        // and therefore materially undercount actual burn. Opus rack rate:
        // $15 / 1M input tokens · $75 / 1M output tokens. Per doc:
        //   input:  9,000 * $15  / 1e6 = $0.135
        //   output: 5,000 * $75  / 1e6 = $0.375
        //   total  ≈ $0.51/doc → 51 cents/doc.
        const OPUS_INPUT_USD_PER_MTOK = 15;
        const OPUS_OUTPUT_USD_PER_MTOK = 75;
        const perDocUsd = (9000 * OPUS_INPUT_USD_PER_MTOK + 5000 * OPUS_OUTPUT_USD_PER_MTOK) / 1_000_000;
        const est = {
          docs: state.built,
          claude_input_tokens: state.built * 9000,
          claude_output_tokens: state.built * 5000,
          estimated_usd: Number((state.built * perDocUsd).toFixed(4)),
        };
        // QB-P20 items 4-6 — coverage tagging, gate_v2, shadow_score.
        // All REPORT-ONLY: no effect on the legacy overall/certification path.
        let gateV2Pass: boolean | null = null;
        let gateV2Reasons: string[] | null = null;
        let shadowScoreVal: number | null = null;
        let coverageTagged: Array<{ sector: string; posture: string; branch: string }> | null = null;
        try {
          const { evaluateGateV2 } = await import("./_local/quality/gate-v2.ts");
          const { shadowScore } = await import("./_local/quality/shadow-score.ts");
          const { tagIntake } = await import("./_local/quality/coverage-matrix.ts");
          // Pooled doc count across THIS tool's recent consecutive runs.
          const { data: recent } = await admin.from("quality_runs")
            .select("batch_size,status,started_at").eq("tool", tool)
            .order("started_at", { ascending: false }).limit(10);
          let pooled = 0;
          for (const r of (recent ?? [])) {
            if ((r as any).status === "complete") pooled += (r as any).batch_size ?? 0;
            else break;
          }
          const combinedFindings = state.allDocFindings.map((f: any) => ({
            check_type: f.check_type ?? (f.cross_category ? "llm" : "deterministic"),
            severity: f.severity ?? null,
            passed: f.passed,
          }));
          const g = evaluateGateV2({ dimensions: claudeDims as any, findings: combinedFindings, pooledDocs: pooled });
          gateV2Pass = g.pass; gateV2Reasons = g.reasons;
          shadowScoreVal = shadowScore(overall as number, combinedFindings);
          coverageTagged = (intakes ?? []).map((it: any) => tagIntake(tool, it));
          // Cumulative coverage upsert.
          for (const cell of coverageTagged) {
            
            await (admin.from("quality_coverage_cells").upsert({
              tool, sector: cell.sector, posture: cell.posture, branch: cell.branch,
              hit_count: 1, last_hit_at: new Date().toISOString(),
            }, { onConflict: "tool,sector,posture,branch", ignoreDuplicates: false }) as unknown as Promise<void>).catch(() => {});
          }
        } catch (e) {
          console.warn("[qbp20] gate/shadow/coverage side-channel failed:", (e as Error).message);
        }
        await admin.from("quality_campaign_digests").insert({
          campaign_id: campaignId,
          wave_number: (campaign as any)?.wave_number ?? null,
          tool,
          run_id: runId,
          claude_overall: overall,
          gpt_overall: gptScores.gpt_score_overall ?? null,
          claude_dimensions: claudeDims,
          gpt_dimensions: gptDims,
          failing_checks: failing,
          post_filter_drops: postFilterDrops,
          estimated_tokens: est,
          token_basis: `estimate:claude-opus-4-6@9k_in+5k_out_per_doc@$${OPUS_INPUT_USD_PER_MTOK}/M_in+$${OPUS_OUTPUT_USD_PER_MTOK}/M_out`,
          gate_v2_pass: gateV2Pass,
          gate_v2_reasons: gateV2Reasons,
          shadow_score: shadowScoreVal,
          coverage_cells_tagged: coverageTagged,
        });
      }
    } catch (digestErr) {
      console.error("[run-quality-batch] campaign digest insert failed:", digestErr);
    }

  } catch (e) {
    console.error("[run-quality-batch] fatal:", e);
    await log("error", `Fatal: ${(e as Error).message}`);
    await (upd({ status: "error", error: (e as Error).message?.slice(0, 300), completed_at: new Date().toISOString() }) as unknown as Promise<void>).catch(() => {});
  } finally {
    clearInterval(heartbeat);
  }
}

Deno.serve(async (req) => {
  console.log(`[run-quality-batch] boot ${BUILD_STAMP}`);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only", build_stamp: BUILD_STAMP }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized: missing bearer token" }, 401);
  const token = authHeader.replace("Bearer ", "");

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // ---------- Resume path: called by self-reinvoke with service-role bearer ----------
  const isInternalResume = req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY;
  if (isInternalResume) {
    const resumeId: string | undefined = body?.resume_run_id;
    if (!resumeId) return json({ error: "resume_run_id required" }, 400);
    // @ts-ignore
    EdgeRuntime.waitUntil(runBatch(resumeId));
    return json({ resumed: resumeId }, 202);
  }

  // ---------- RC-D.1 D-1: internal SR caller acceptance (enumerated actions) ----------
  // Accept service-role bearer + x-internal-verification header for a strict
  // allow-list of internal actions (revision_dispatch, seed_contract_fixtures).
  // This is the inbound half of the internal-caller path already used by
  // regenerate-assessment; QL3 (ql3-orchestrator) and future internal harnesses
  // dispatch through here without needing an admin JWT. Every accepted call is
  // logged to function_runs. Any other action falls through to the normal
  // admin-JWT path below.
  const INTERNAL_ALLOWED_ACTIONS = new Set(["revision_dispatch", "seed_contract_fixtures", "start_quality_batch"]);
  const isInternalSR =
    req.headers.get("x-internal-verification") === "1"
    && token === SERVICE_KEY
    && INTERNAL_ALLOWED_ACTIONS.has(String(body?.action ?? ""));
  let userId: string | null;
  if (isInternalSR && body?.action === "revision_dispatch" && !body?.dispatch_nonce) {
    return json({ error: "nonce_required", detail: "internal revision_dispatch requires dispatch_nonce" }, 400);
  }
  if (isInternalSR) {
    userId = null; // sentinel for internal caller — started_by nullable
    try {
      const adminLog = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
      await adminLog.from("function_runs").insert({
        function_name: "run-quality-batch",
        status: "started",
        metadata: { internal: true, action: body?.action, tool_type: body?.tool_type ?? null, assessment_id: body?.assessment_id ?? null, dispatch_nonce: body?.dispatch_nonce ?? null, build_stamp: BUILD_STAMP },
      });
    } catch (_e) { /* non-fatal */ }
  } else {
    // ---------- Normal path: admin user starts a new run ----------
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized", detail: claimsErr?.message ?? "no claims" }, 401);
    userId = claimsData.claims.sub as string;

    const adminChk = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: isAdmin } = await adminChk.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  // ---------- RC-B.1 internal revision dispatcher ----------

  // ---------- RC-C1 C1.4 — seed contract fixtures for cppa-risk ----------
  // Creates a quality_runs row pre-seeded with the 3 contract-scenario
  // intakes (yield_k3, partial_j_lt_k, full_close) and returns the run id
  // so the caller can kick a normal batch pass over them. This is the
  // "wired into the run-quality-batch fixture path" leg — the intakes flow
  // through the pinned-intake pipeline the harness already consumes, NOT
  // through a sampleFixtures side-channel.
  if (body?.action === "seed_contract_fixtures") {
    const { tool_type } = body;
    // RC-C3 C3.2 — extended beyond cppa_risk_assessment to governance / cyber / admt.
    const FIXTURE_MAP: Record<string, { tool: string; runType: string; fixtures: Array<{ fixture_id: string; contract_scenario: string; intake: any; answer_targets?: string[] }> }> = {
      cppa_risk_assessment:  { tool: "cppa-risk",  runType: "rc-c1-contract-fixtures", fixtures: CPPA_RISK_CONTRACT_FIXTURES as any },
      governance_assessment: { tool: "governance", runType: "rc-c3-contract-fixtures", fixtures: GOVERNANCE_CONTRACT_FIXTURES as any },
      cppa_cybersecurity:    { tool: "cppa-cyber", runType: "rc-c3-contract-fixtures", fixtures: CYBER_CONTRACT_FIXTURES as any },
      cppa_admt:             { tool: "cppa-admt",  runType: "rc-c3-contract-fixtures", fixtures: ADMT_CONTRACT_FIXTURES as any },
    };
    const cfg = FIXTURE_MAP[tool_type as string];
    if (!cfg) return json({ error: "unsupported_tool", detail: `seed_contract_fixtures supports: ${Object.keys(FIXTURE_MAP).join(", ")}` }, 400);
    const intakes = cfg.fixtures.map((f) => ({
      ...f.intake,
      _fixture_id: f.fixture_id,
      _contract_scenario: f.contract_scenario,
      _answer_targets: f.answer_targets ?? [],
    }));
    // D-7 fix: mirror the normal-path insert (:2353-2362). Prod quality_runs
    // has NO started_by/run_type columns — write to created_by/user_id (both
    // nullable for internal SR caller) and store the run-type label in the
    // existing `mode` text column. Compute run_number via count+1 to avoid
    // colliding on the default of 1. Use status 'pending' to match what
    // runBatch/resume expects.
    const { count: existingCount } = await admin
      .from("quality_runs").select("id", { count: "exact", head: true }).eq("tool", cfg.tool);
    const seedRunNumber = (existingCount ?? 0) + 1;
    const { data: qr, error: qErr } = await admin
      .from("quality_runs")
      .insert({
        tool: cfg.tool,
        status: "pending",
        batch_size: intakes.length,
        run_number: seedRunNumber,
        intakes,
        next_doc_index: 0,
        created_by: userId,
        user_id: userId,
        mode: cfg.runType,
        started_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        grader_context_version: GRADER_CONTEXT_VERSION, // HOUSEKEEPING-1 T2
      })
      .select("id, run_number, tool, mode, created_by, status, batch_size")
      .single();
    if (qErr) return json({ error: "seed_failed", detail: qErr.message }, 500);
    return json({
      ok: true,
      run_id: (qr as any).id,
      run_number: (qr as any).run_number,
      fixture_count: intakes.length,
      fixtures: cfg.fixtures.map((f) => ({ id: f.fixture_id, scenario: f.contract_scenario })),
    });
  }


  // ---------- ENA-1 task 1 — internal start_quality_batch ----------
  // Mirrors the console Start button: full 9-tool batch × 5 docs, dispatched
  // via quality-batch-orchestrator. Accepts SR bearer + x-internal-verification
  // (already gated above). Inserts a quality_batch_runs row, then fires the
  // orchestrator's internal-resume self-chain so the batch actually runs.
  // No nonce required for this action. function_runs "started" row was already
  // written above (the isInternalSR branch); no extra log needed here.
  if (body?.action === "start_quality_batch") {
    const DEFAULT_TOOLS = [
      "cppa-risk", "cppa-cyber", "cppa-admt",
      "governance", "dpia", "lia",
      "dpa-generator", "ir-playbook", "biometric-checker",
    ];
    const tools = Array.isArray(body?.tools) && body.tools.length ? body.tools : DEFAULT_TOOLS;
    const batchSize = Math.max(1, Math.min(50, Math.floor(Number(body?.batch_size) || 0) || 5));
    const { data: row, error: bErr } = await admin.from("quality_batch_runs").insert({
      tools, batch_size: batchSize, status: "running", phase: "kickoff",
      current_tool_index: 0, tool_results: [], created_by: null,
      instrument_version: GRADER_CONTEXT_VERSION, // MC-S1b Task 4
    }).select("id").single();

    if (bErr || !row) return json({ error: "start_quality_batch_insert_failed", detail: bErr?.message }, 500);
    // Fire the orchestrator self-chain (internal-resume path) so it advances.
    fetch(`${SUPABASE_URL}/functions/v1/quality-batch-orchestrator`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "apikey": SERVICE_KEY,
        "Content-Type": "application/json",
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ run_id: row.id }),
    }).catch((e) => console.error("[start_quality_batch] orchestrator kick failed", e?.message));
    return json({ ok: true, batch_id: row.id, tools, batch_size: batchSize, build_stamp: BUILD_STAMP }, 202);
  }




  // In-runtime dispatch to regenerate-assessment using this runtime's own
  // SR key. Called by admins (same auth check as batch dispatch) and by
  // RC-D's QL3 second pass (dummy-answer revisions dispatched
  // function-to-function). Payload passes through verbatim; the response
  // from regenerate-assessment is returned verbatim, plus a function_runs
  // log row is written.
  if (body?.action === "revision_dispatch") {
    const startedAt = Date.now();
    const { tool_type, assessment_id, answered_items, internal_user_id, dispatch_nonce } = body;
    if (!tool_type || !assessment_id || !Array.isArray(answered_items) || answered_items.length === 0) {
      return json({ error: "revision_dispatch_missing_params" }, 400);
    }
    // RC-D.4 hardening: reject malformed answered_items BEFORE the open_items
    // snapshot / forwarding to regenerate-assessment. Must have `value` key
    // and non-empty string values; the honest not_resolved path handles
    // substantive-but-insufficient answers, not silent empties.
    for (const a of answered_items as any[]) {
      if (!a || typeof a !== "object" || !("value" in a)) {
        return json({ error: "answered_item_missing_value", item_id: a?.item_id ?? null }, 400);
      }
      if (typeof a.value === "string" && a.value.trim().length === 0) {
        return json({ error: "answered_item_missing_value", item_id: a.item_id ?? null, reason: "empty_string" }, 400);
      }
    }

    // RC-D.10 fix (RQB-DEDUPE-1): the previous function_runs .contains() dedupe
    // matched THIS execution's own "started" row (which now carries the nonce
    // via RC-D.9 observability), producing a false idempotent_replay and a
    // hollow dispatch. The authoritative acceptance record is
    // revision_dispatch_ledger — regenerate claims the nonce there BEFORE any
    // side-effects. Replay iff the ledger row exists; otherwise proceed
    // (a prior delivery that failed pre-acceptance correctly retries).
    if (dispatch_nonce) {
      const { data: ledgerPrior } = await admin
        .from("revision_dispatch_ledger")
        .select("nonce")
        .eq("nonce", dispatch_nonce)
        .limit(1)
        .maybeSingle();
      if (ledgerPrior) {
        console.log(`[revision_dispatch] idempotent replay (ledger hit) nonce=${dispatch_nonce}`);
        return json({ ok: true, idempotent_replay: true, dispatch_nonce, build_stamp: BUILD_STAMP }, 200);
      }
    }
    // RC-C1 C1.5 — snapshot open_items BEFORE dispatch so post-hoc QC can
    // verify contract monotonicity and verdict consistency deterministically.
    const tableMap: Record<string, string> = {
      cppa_risk_assessment: "cppa_assessments",
      cppa_admt: "cppa_assessments",
      cppa_cybersecurity: "cppa_assessments",
      dpia_framework: "dpia_frameworks",
      li_assessment: "li_assessments",
      governance_assessment: "governance_assessments",
      ir_playbook: "ir_playbooks",
      biometric_checker: "biometric_assessments",
      dpa_generator: "dpa_documents",
    };
    const dispatchTable = tableMap[tool_type];
    let openItemsBefore: any[] = [];
    if (dispatchTable) {
      const { data: rowBefore } = await admin
        .from(dispatchTable)
        .select("report_data")
        .eq("id", assessment_id)
        .maybeSingle();
      openItemsBefore = Array.isArray((rowBefore as any)?.report_data?.open_items)
        ? (rowBefore as any).report_data.open_items
        : [];
    }
    const fwdPayload = {
      tool_type,
      assessment_id,
      mode: "revision",
      answered_items,
      ...(internal_user_id ? { internal_user_id } : {}),
      // RC-D.8: forward end-to-end. Regenerate uses this to claim the nonce
      // in revision_dispatch_ledger before any side-effects.
      ...(dispatch_nonce ? { dispatch_nonce } : {}),
    };
    let upstreamStatus = 0;
    let upstreamBody: any = null;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/regenerate-assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "x-internal-verification": "1",
          "apikey": SERVICE_KEY,
        },
        body: JSON.stringify(fwdPayload),
      });
      upstreamStatus = r.status;
      const txt = await r.text();
      try { upstreamBody = JSON.parse(txt); } catch { upstreamBody = { raw: txt }; }
    } catch (e: any) {
      upstreamStatus = 502;
      upstreamBody = { error: "revision_dispatch_fetch_failed", detail: e?.message };
    }

    // RC-D.8: write the completion row IMMEDIATELY after regenerate returns
    // — BEFORE the up-to-60s polling loop below. Container CPU-wall
    // termination during polling was leaving the accepted execution's
    // completion unlogged (see RC-D.8 forensics). The subsequent QC loop
    // remains best-effort telemetry.
    let completionRowId: string | null = null;
    try {
      const { data: inserted } = await admin.from("function_runs").insert({
        function_name: "run-quality-batch",
        status: upstreamStatus >= 200 && upstreamStatus < 300 ? "success" : "error",
        duration_ms: Date.now() - startedAt,
        metadata: {
          action: "revision_dispatch",
          tool_type,
          assessment_id,
          dispatch_nonce: dispatch_nonce ?? null,
          answered_item_ids: answered_items.map((a: any) => a?.item_id),
          upstream_status: upstreamStatus,
          upstream_body: upstreamBody,
          actor_user_id: userId,
          revision_prompt_stamp: "rev-scope@rc-d.8",
          build_stamp: BUILD_STAMP,
          upstream_build_stamp: upstreamBody?.build_stamp ?? null,
        },
      }).select("id").maybeSingle();
      completionRowId = (inserted as any)?.id ?? null;
    } catch (logErr) {
      console.warn("[revision_dispatch] function_runs completion insert failed", (logErr as any)?.message);
    }

    // RC-C1 C1.5 — QC checks (scoped to contract-enabled tools; regenerate-assessment
    // fires-and-forgets the actual generation so we poll briefly for completion).
    const qcResults: any[] = [];
    if (
      dispatchTable
      && upstreamStatus >= 200 && upstreamStatus < 300
      && CONTRACT_ENABLED_TOOLS.has(tool_type)
    ) {
      try {
        // Wait for row to reach terminal state (max ~60s poll — revision-mode
        // typically completes in <30s; generation itself may take longer, so
        // fall back to reading whatever's present when polling times out).
        let rowAfter: any = null;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const { data } = await admin
            .from(dispatchTable)
            .select("report_data, status")
            .eq("id", assessment_id)
            .maybeSingle();
          if (data && (data as any).status === "complete") { rowAfter = data; break; }
          rowAfter = data;
        }
        const openItemsAfter: any[] = Array.isArray((rowAfter as any)?.report_data?.open_items)
          ? (rowAfter as any).report_data.open_items
          : [];
        const answeredIds: string[] = (answered_items as any[]).map((a) => String(a?.item_id ?? ""));
        const verdicts = Array.isArray(upstreamBody?.verdicts)
          ? upstreamBody.verdicts
              .map((v: any) => ({ item_id: String(v?.item_id ?? ""), verdict: String(v?.verdict ?? "") }))
              .filter((v: any) => v.item_id && answeredIds.includes(v.item_id))
          : [] as Array<{ item_id: string; verdict: string }>;
        const changedPaths: string[] = Array.isArray(upstreamBody?.changed_paths)
          ? upstreamBody.changed_paths
          : [];
        qcResults.push(qcContractMonotonicity(openItemsBefore, openItemsAfter));
        qcResults.push(qcVerdictConsistency(answeredIds, verdicts, openItemsAfter, changedPaths, body?.tool_type));
      } catch (e: any) {
        qcResults.push({ code: "qc_rc_dispatch_error", status: "red", detail: e?.message });
      }
    }

    // Best-effort: append qc_checks to the completion row we already wrote.
    if (completionRowId && qcResults.length) {
      try {
        const { data: existing } = await admin.from("function_runs").select("metadata").eq("id", completionRowId).maybeSingle();
        const md = ((existing as any)?.metadata ?? {}) as Record<string, unknown>;
        await admin.from("function_runs").update({ metadata: { ...md, qc_checks: qcResults } }).eq("id", completionRowId);
      } catch (logErr) {
        console.warn("[revision_dispatch] function_runs qc_checks update failed", (logErr as any)?.message);
      }
    }
    // RC-D.9 ADDENDUM: stamp build_stamp (this function) + upstream_build_stamp
    // (regenerate-assessment, passed through) on the response so ql3-orchestrator
    // — and any external verifier — can prove which artifacts ran end-to-end.
    return json({
      ...upstreamBody,
      qc_checks: qcResults,
      build_stamp: BUILD_STAMP,
      upstream_build_stamp: upstreamBody?.build_stamp ?? null,
    }, upstreamStatus || 500);
  }


  const { tool, batch_size: requestedBatch, resume_run_id: adminResumeId } = body;

  // Admin-authorized resume/kick for pre-seeded pinned runs (WS6 v2.1). The row
  // must already exist and be owned by this admin; we simply hand it to runBatch.
  if (adminResumeId) {
    const { data: existing, error: exErr } = await admin
      .from("quality_runs").select("id, created_by, status")
      .eq("id", adminResumeId).maybeSingle();
    if (exErr || !existing) return json({ error: `run not found: ${exErr?.message ?? adminResumeId}` }, 404);
    // @ts-ignore
    EdgeRuntime.waitUntil(runBatch(adminResumeId));
    return json({ resumed: adminResumeId, prior_status: existing.status }, 202);
  }

  const batch_size = requestedBatch ?? 5;
  if (!tool) return json({ error: "tool required" }, 400);

  const { count } = await admin.from("quality_runs").select("id", { count: "exact", head: true }).eq("tool", tool);
  const runNumber = (count ?? 0) + 1;

  const { data: run, error: rErr } = await admin.from("quality_runs").insert({
    tool, status: "pending", batch_size, run_number: runNumber,
    created_by: userId, user_id: userId,
    started_at: new Date().toISOString(),
    last_heartbeat_at: new Date().toISOString(),
    next_doc_index: 0,
    grader_context_version: GRADER_CONTEXT_VERSION, // CV1-ALL T6
  }).select("id").single();
  if (rErr || !run) return json({ error: `run insert: ${rErr?.message}` }, 500);

  // @ts-ignore
  EdgeRuntime.waitUntil(runBatch(run.id));
  return json({ run_id: run.id, tool, batch_size, run_number: runNumber }, 202);
});
