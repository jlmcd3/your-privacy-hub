// SYNC-MARKER: rubric-mirror v2 -- grade-single-assessment mirrors run-quality-batch rubric lines; edit both together
// run-quality-batch — orchestrates one "Run N Tests" press.
// Pipeline: generate intakes → build docs → Claude eval → GPT eval →
//           cross-review → aggregate → propose fixes.
// Returns 202 immediately. All work in EdgeRuntime.waitUntil().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// RC-D.10: BUILD_STAMP = git short-sha + ISO. Update on any behavior edit.
// Value = git short-sha of the commit being deployed + ISO timestamp.
// MUST be updated in the same edit that changes behavior in this file.
export const BUILD_STAMP = "qbp20-structural-test-design@2026-07-22T23:00:00Z";

// QLB-F3 — shared grader payload builder (body-first, metadata-stripped,
// equal budget across Claude+GPT).
import {
  buildGraderPayload,
  GRADER_PAYLOAD_BUDGET,
  familyForBatchTool,
} from "../_shared/grader/payload.ts";
// GRADER-1 Tasks 2/3 — shared authoritative context block injected into
// BOTH grader system prompts (Claude rubric + GPT cross-review).
import { SHARED_GRADER_CONTEXT, GRADER_CONTEXT_VERSION } from "../_shared/grader/context.ts";
// GRADER-CAL-1 A2/A3/A4 — shared post-filter over LLM findings.
import { applyGraderCal1Filter } from "../_shared/grader/post-filters.ts";
// CV1-R2 T4c — counsel-voice auto-regen trigger predicate.
import { isCounselVoiceRegenEligible, resolveEvalSourceRef } from "../_shared/grader/counsel-voice-regen.ts";
// GRADER-1 Task 4 — per-field evaluator for qc_r1_1.
import {
  collectRationaleEntries,
  evaluateResolvedHedgePerField,
} from "../_shared/grader/qc-r1-per-field.ts";

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
import { renderContractPrompt } from "../_shared/intake-contracts/render.ts";
import { cppaAdmtContract } from "../_shared/intake-contracts/cppa-admt.ts";
import { cppaRiskContract } from "../_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "../_shared/intake-contracts/cppa-cybersecurity.ts";
import { governanceContract } from "../_shared/intake-contracts/governance-assessment.ts";
import { dpiaFrameworkContract } from "../_shared/intake-contracts/dpia-framework.ts";
import { liAssessmentStageBContract } from "../_shared/intake-contracts/li-assessment.ts";
import { dpaGeneratorContract } from "../_shared/intake-contracts/dpa-generator.ts";
import { irPlaybookContract } from "../_shared/intake-contracts/ir-playbook.ts";
import { biometricCheckerContract } from "../_shared/intake-contracts/biometric-checker.ts";

// Tool-key → contract. The QL2 tool key is what generateIntakes receives
// (e.g. "cppa-cyber"), not the contract's tool_type. Contract coverage set
// is Phase-1's nine census tools. Non-contract tools (ask-privacy,
// weekly-brief, custom-brief, trend-report, state-law, registration) fall
// through to their existing hand-typed descriptions in generateIntakes.
const CONTRACT_BY_TOOL: Record<string, IntakeContract> = {
  "cppa-admt":         cppaAdmtContract,
  "cppa-risk":         cppaRiskContract,
  "cppa-cyber":        cppaCybersecurityContract,
  "governance":        governanceContract,
  "dpia":              dpiaFrameworkContract,
  "lia":               liAssessmentStageBContract,
  "dpa-generator":     dpaGeneratorContract,
  "ir-playbook":       irPlaybookContract,
  "biometric-checker": biometricCheckerContract,
};

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
QB-P6 — additional_context (when present) and narrative fields must name tools, owners, and dates.`,
  "dpia": `Vary sectors (Healthcare, FinTech, HR/Employment, AdTech, EdTech, Retail) and posture — some with mature Art.35 documentation, some with material gaps (missing DPO, no data_subjects_views_sought, weak necessity_proportionality), some with third-country transfers lacking a mechanism. Include EU/UK on at least half of scenarios to exercise the GDPR path.
QB-P6 — narrative fields must name tools, owners, and dates.`,
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
function sliceIntakeForGrader(intake: unknown): string {
  const s = JSON.stringify(intake ?? {});
  if (s.length <= INTAKE_HARD_CAP) return s;
  return `${s.slice(0, INTAKE_HARD_CAP)}[...intake payload exceeded ${INTAKE_HARD_CAP} bytes; tail elided...]`;
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


type Admin = ReturnType<typeof createClient>;

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

async function gpt4o(system: string, user: string, maxTokens = 3000): Promise<string> {
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

async function invokeFn(name: string, body: unknown): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(240_000),
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

const CHECKS: Check[] = [
  {
    id: "adtech_not_significant_decision", dimension: "accuracy", severity: "critical",
    tools: ADMT_ONLY,
    run: (intake, report) => {
      const domains: string[] = intake?.decision_domains ?? [];
      if (!domains.some(d => /advertising|adtech|audience/i.test(d))) return { passed: true };
      const triggers = report?.scope_analysis?.triggers_significant_decision;
      if (triggers === true || triggers === "true")
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
      const triggers = report?.scope_analysis?.triggers_significant_decision;
      if (triggers === true || triggers === "true")
        return { passed: false, evidence: `triggers_significant_decision=true for gaming/entertainment` };
      return { passed: true };
    },
  },
  {
    id: "art11_gate_enforced", dimension: "accuracy", severity: "critical",
    tools: ADMT_ONLY,
    run: (_intake, report) => {
      const triggers = report?.scope_analysis?.triggers_significant_decision;
      if (triggers === true || triggers === "true") return { passed: true };
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
      const triggers = report?.scope_analysis?.triggers_significant_decision;
      if (triggers !== true && triggers !== "true") return { passed: true };
      if (!report?.notice_gaps?.length)
        return { passed: false, evidence: "notice_gaps empty despite triggers_significant_decision=true" };
      return { passed: true };
    },
  },
  {
    id: "overall_status_present", dimension: "formatting", severity: "medium",
    tools: ADMT_ONLY,
    run: (_intake, report) => {
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
          const s = JSON.stringify(report ?? "").toLowerCase();
          if (!/7120\s*\(b\)\s*\(2\)\s*\(b\)/.test(s)) {
            return { passed: false, evidence: `§ 7120(b)(2)(B) not referenced despite resolved M4 (${m4.state})` };
          }
          const expected =
            m4.state === "resolved_met" ? /(met|threshold\s+met|exceeds|50,?000\s+or\s+more)/
            : m4.state === "resolved_not_met" ? /(not\s+met|below|fewer than 50,?000)/
            : /(not\s+applicable|inapplicable|n\/?a|no\s+spi)/;
          if (!expected.test(s)) return { passed: false, evidence: `§ 7120(b)(2)(B) resolution does not match computed M4=${m4.state}` };
          return { passed: true };
        },
      },

      // QC-R1-3 -- 50%-prong (M5) utilization
      // r1b1.3 (2026-07-12): per-state acceptable phrasing sets — the report
      // may resolve a state via met/not-met literal OR via a semantically
      // equivalent insufficient-basis / cannot-confirm phrasing. Detector
      // must recognise both to avoid marking correct output as a defect.
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
          const s = JSON.stringify(report ?? "").toLowerCase();
          if (!/7120\s*\(b\)\s*\(1\)/.test(s)) {
            return { passed: false, evidence: `§ 7120(b)(1) not referenced despite resolved M5 (${m5.state})` };
          }
          // Insufficient-basis / cannot-confirm synonyms — accepted for any
          // resolved M5 whose input signal was absent or ambiguous. When the
          // generator states "the record does not confirm whether 50% or
          // more..." it is semantically resolving the prong via the
          // insufficient-basis lane, which the prior literal-only matcher
          // rejected.
          const insufficientBasis = /(does not confirm|not\s+confirmed|insufficient\s+(?:basis|information|evidence)|cannot\s+(?:be\s+)?(?:confirmed|determined|resolved|verified)|no\s+basis\s+to\s+(?:confirm|assess|determine)|pending\s+confirmation|to\s+be\s+confirmed|record\s+does\s+not\s+(?:establish|indicate|state))/i;
          const met = /(threshold\s+met|is\s+met|meets\s+the\s+threshold|derives\s+50%|50%\s+or\s+more|fifty\s+percent\s+or\s+more|exceeds\s+50%)/i;
          const notMet = /(not\s+met|does\s+not\s+meet|below\s+(?:the\s+)?(?:50%|threshold)|no\s+sale|does\s+not\s+sell|inapplicable|less\s+than\s+50%|under\s+50%)/i;
          const na = /(not\s+applicable|inapplicable|n\/?a\b|does\s+not\s+apply)/i;
          const ok =
            m5.state === "resolved_met" ? (met.test(s) || insufficientBasis.test(s))
            : m5.state === "resolved_not_met" ? (notMet.test(s) || insufficientBasis.test(s))
            : (na.test(s) || insufficientBasis.test(s));
          if (!ok) return { passed: false, evidence: `§ 7120(b)(1) resolution does not match computed M5=${m5.state} (no met/not-met/insufficient-basis phrasing found)` };
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
      {
        id: "qc_r1_4_cohort_determinism", dimension: "accuracy", severity: "critical",
        tools: CPPA_RISK_ONLY,
        run: (intake, report) => {
          const r = resolveForChecks(intake);
          const band = classifyRevenueBand(r.rawForStates.q1_revenue);

          const s = JSON.stringify(report ?? "").toLowerCase();
          // ISO or long form ("april 1, YYYY" / "april 1 YYYY").
          const cohortDateRegex = (year: string) =>
            new RegExp(`(?:${year}-04-01|april\\s+1,?\\s+${year})`, "i");
          const has2029 = cohortDateRegex("2029").test(s);
          const has2030 = cohortDateRegex("2030").test(s);
          const has2028 = cohortDateRegex("2028").test(s);

          if (band.audit_cohort === "indeterminate") {
            if (!(has2029 && has2030)) {
              return { passed: false, evidence: `legacy/absent revenue band requires both April 1, 2029 and April 1, 2030 cohort dates (ISO or long form); found 2029=${has2029} 2030=${has2030}` };
            }
            // Conditional framing must be present so the two dates are
            // presented as a period-dependent choice, not a contradiction.
            const conditional = /(if\s+\d{4}\s+(?:annual\s+)?(?:gross\s+)?revenue|depend(?:s|ing)\s+on|conditional|straddles|cannot\s+resolve|indeterminate|two[- ]cohort|either\s+2029|2029\s+or\s+2030|cohort\s+table)/i;
            if (!conditional.test(s)) {
              return { passed: false, evidence: `both cohort dates present but no conditional/period-dependent framing found` };
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
            return { passed: false, evidence: `resolved band ${band.label} requires § 7121(a) cohort April 1, ${year} (ISO or long form); not stated` };
          }
          // must NOT hedge the resolved cohort near the cite window.
          const longForm = `april 1, ${year}`;
          const iso = `${year}-04-01`;
          const idx = s.includes(iso) ? s.indexOf(iso) : s.indexOf(longForm);
          if (idx >= 0) {
            const window = s.slice(Math.max(0, idx - 200), idx + 200);
            if (/(cannot be determined|indeterminate|unable to (?:confirm|resolve))/i.test(window)) {
              return { passed: false, evidence: `resolved cohort April 1, ${year} is hedged near the cite window` };
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

const RUBRIC_ADMT: RubricCheck[] = [
  { id: "rubric_advertising_significant_decision", dimension: "accuracy", severity: "critical",
    description: "Advertising / adtech / audience targeting classified as a \"significant decision\" under CPPA § 7001(ddd). It is not." },
  { id: "rubric_gaming_significant_decision",      dimension: "accuracy", severity: "critical",
    description: "Gaming or entertainment service eligibility classified as a \"significant decision\". It is not." },
  { id: "rubric_invented_admt_section",            dimension: "citation", severity: "critical",
    description: "ADMT citation outside the real range (real sections: 7001, 7150–7157, 7200–7222)." },
];

const RUBRIC_CHECKS: Record<string, RubricCheck[]> = {
  "cppa-admt": [...RUBRIC_GENERAL, ...RUBRIC_ADMT],
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

CORPUS-VERIFIED RECENT AMENDMENTS (do not deduct for these): the platform's legal corpus is verified against official texts, including changes that may postdate your training knowledge. The following are CORRECT statements of current law; treat them as accurate, do not flag them for verification, and do not deduct from any dimension for asserting them: (1) Cal. Civ. Code § 1798.82, as amended by SB 446 (effective January 1, 2026): individual notice within 30 calendar days of discovery or notification per (a)(2)(A); for breaches affecting more than 500 California residents, a single sample copy to the California Attorney General within 15 calendar days of consumer notice per (f); both statutory delay allowances retained per (a)(2)(B). (2) CCPA post-CPRA subsection lettering in Cal. Civ. Code § 1798.140: 'service provider' is defined at subsection (ag), not the pre-2020 (v) lettering. (3) UK GDPR Article 6(11), inserted by the Data (Use and Access) Act 2025 (recognised-legitimate-interests examples: direct marketing, intra-group transmission for internal administrative purposes, network and information security). This list is exhaustive: it does not license any OTHER uncited or unverifiable legal claim, and all normal citation and hallucination scrutiny continues to apply to everything else.

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

async function evaluateDocumentClaude(tool: string, intake: any, report: any): Promise<any> {
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
  const payload = family
    ? buildGraderPayload(family, report, GRADER_PAYLOAD_BUDGET)
    : { text: JSON.stringify(report ?? {}).slice(0, GRADER_PAYLOAD_BUDGET), truncated: (JSON.stringify(report ?? {}).length > GRADER_PAYLOAD_BUDGET), original_length: JSON.stringify(report ?? {}).length };
  if (payload.truncated) {
    console.warn(`[run-quality-batch] payload_truncated tool=${tool} role=claude original_length=${payload.original_length} budget=${GRADER_PAYLOAD_BUDGET}`);
  }

  let claudeResult: any = null;
  try {
    const sys = buildRubricSystemPrompt("claude", tool);
    const raw = await claude(sys, `TOOL: ${tool}\nINTAKE: ${sliceIntakeForGrader(intake)}\nREPORT:\n${payload.text}\nEvaluate this report. Quote actual text as evidence for each finding.`, 5000);
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

  const llmFindings = filteredRaw
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
  for (const f of detFindings) {
    if (!f.passed) {
      const penalty = f.severity === "critical" ? 25 : f.severity === "high" ? 12 : f.severity === "medium" ? 6 : 2;
      (scores as any)[f.dimension] = Math.max(0, (scores as any)[f.dimension] - penalty);
    }
  }
  const w = weightsFor(tool);
  // QB-P17 item 2 — keep the unrounded weighted score for gate comparisons.
  // overall_score_display is the human-facing rounded copy.
  const overall_raw = scores.accuracy * w.accuracy + scores.citation * w.citation + scores.hallucination * w.hallucination + scores.analysis * w.analysis + scores.intelligence * w.intelligence + scores.formatting * w.formatting;
  const overall = Math.round(overall_raw);
  return { dimension_scores: scores, overall_score: overall_raw, overall_score_display: overall, findings: [...detFindings, ...llmFindings], strengths: claudeResult?.strengths ?? [], critical_failures: claudeResult?.critical_failures ?? [], post_filter_dropped: cal1Dropped, post_filter_suppressed: cal1Suppressed };
}

async function evaluateDocumentGPT(tool: string, intake: any, report: any): Promise<{ eval: any | null; skipReason?: string; error?: string; postFilterDropped?: { a2: number; a3: number; a4: number; r15c2: number; dpa_defaults: number } }> {
  if (!OPENAI_API_KEY) {
    return { eval: null, skipReason: "OPENAI_API_KEY not set in edge function env" };
  }
  try {
    const editorialNote = isEditorial(tool)
      ? `\n\nEDITORIAL RUBRIC OVERRIDE: This is editorial copy. Score "formatting" as 100 (N/A). Focus on (1) accuracy of facts and law, (2) citation fidelity, (3) no_adaptive_guidance.`
      : "";
    const sys = buildRubricSystemPrompt("gpt", tool);
    // QLB-F3: same body-first payload + equal budget as Claude path.
    const family = familyForBatchTool(tool);
    const payload = family
      ? buildGraderPayload(family, report, GRADER_PAYLOAD_BUDGET)
      : { text: JSON.stringify(report ?? {}).slice(0, GRADER_PAYLOAD_BUDGET), truncated: (JSON.stringify(report ?? {}).length > GRADER_PAYLOAD_BUDGET), original_length: JSON.stringify(report ?? {}).length };
    if (payload.truncated) {
      console.warn(`[run-quality-batch] payload_truncated tool=${tool} role=gpt original_length=${payload.original_length} budget=${GRADER_PAYLOAD_BUDGET}`);
    }
    const raw = await gpt4o(sys, `TOOL: ${tool}\nINTAKE: ${sliceIntakeForGrader(intake)}\nDOCUMENT TO EVALUATE:\n${payload.text}${editorialNote}\nEvaluate this document. Quote actual text as evidence for each finding.`, 3000);
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
    parsed.findings = gptKept
      .filter((f: any) => rubricMeta.has(f.check_id))
      .map((f: any) => {
        const meta = rubricMeta.get(f.check_id)!;
        return { check_id: f.check_id, dimension: meta.dimension, severity: meta.severity, passed: !!f.passed, evidence: f.evidence ?? null };
      });
    return { eval: parsed, postFilterDropped: gptDropped, postFilterSuppressed: gptSuppressed };

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
const INTAKE_VALIDATORS: Record<string, IntakeValidator> = {};
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

async function generateIntakes(tool: string, count: number): Promise<any[]> {
  // NOTE: toolDescriptions is DEAD for contract-backed tools; put guidance in SCENARIO_GUIDANCE or the intake contract, never here.
  const toolDescriptions: Record<string, string> = {
    "cppa-admt": `CPPA ADMT compliance assessment. Required fields: system_name, system_type, system_description, decision_domains (array — use: employment, financial_services, healthcare, advertising, entertainment_personalization, service_eligibility), human_review, training_data_use (one of "Yes","No" — "Unsure" removed per RC-P6), profiling_use (one of "Yes","No" — "Unsure" removed per RC-Cleanup2), admt_system_count (string range like "1","2-5","6-20"), third_party_admt (one of "Yes","No","Unsure"), notice_delivery (array), notice_has_specific_purpose, notice_purpose_text, notice_has_opt_out_desc, notice_has_access_desc, notice_has_anti_retaliation, notice_has_how_it_works, notice_has_alternative_process, opt_out_exception, opt_out_methods (array), opt_out_link_title, opt_out_no_cookie_banner, opt_out_no_account_required, opt_out_confirmation_mechanism, opt_out_appeal_process, opt_out_fairness_doc, opt_out_15_day_process, access_submission_methods, access_verification_process, access_logic_disclosure, access_outcome_disclosure, access_response_timeline, access_trade_secret_policy, ca_consumer_count. (prior_access_requests_12mo removed per RC-P6.) Include a mix: 2 advertising/adtech (NOT significant decisions), 2 gaming (NOT significant decisions), 2 HR/employment (significant decisions), 2 fintech credit scoring (significant decisions), 1 healthcare AI (significant decision), 1 recommendation engine (NOT significant decision).`,
    "lia": `Legitimate Interests Assessment. Return objects matching the li_assessments table schema EXACTLY (no extra columns or the insert will fail). Required top-level fields: stage (literal "final"), status (literal "pending"), organization_name (string — note US spelling), processing_description (string, >=80 chars, specific), relationship_type (string, e.g. "Existing customer (direct)","Prospect (indirect — from data broker)","Employee","Patient (indirect — from clinic)"), data_categories (string[] from ["Contact details","Identifiers","Financial data","Health or medical data","Biometric data","Location data","Device/technical data","Behavioural / browsing data","Inferences","Sensitive data — other"]), jurisdictions (string[] from ["EU (GDPR)","United Kingdom (UK GDPR)","US — California (CCPA/CPRA)","US — other state","Canada (PIPEDA)","Other"]), sector (string), stated_purpose (string), alternatives_considered (string). Plus three JSONB blocks: purpose_details: { interest_holder, interest_type, purpose_text }; necessity_details: { alternatives, why_consent_not_used, data_minimised, pseudonymisation_options }; balancing_details: { reasonable_expectation, vulnerable_subjects (string[]), potential_harm, safeguards (string[]), opt_out_mechanism, special_category_data (boolean), employment_safeguards, statutory_restrictions, balancing_text }. Vary sectors (Healthcare, FinTech, Logistics, Retail, AdTech, HR) and posture — some well-balanced, some weak safeguards, some questionable necessity. DO NOT emit fields named organisation_name, processing_activity, legitimate_interest_claimed, necessity_analysis, balancing_test_factors, data_subject_expectations, or safeguards (top-level) — these columns do not exist.`,
    "dpia": `DPIA Framework — EDPB-template intake schema. Return objects with EXACTLY these top-level keys (US spelling of organization_name — the generator reads intake?.organization_name, NEVER organisation_name). Required top-level fields: organization_name (string), processing_activity_name (string), description (string, >=80 chars, specific), purpose (string), data_categories (string[]), data_subjects (string, describes categories of individuals), volume_frequency (string, e.g. "~50,000 records/month"), jurisdictions (string[] from ["EU","GB","UK","US-CA","US-NY","US","CA","Other"] — include EU/UK on at least half of scenarios to exercise the GDPR path), sector (string), organization_sector (string, may mirror sector), legal_basis_proposed (string — one of "Consent","Contract","Legal obligation","Vital interests","Public task","Legitimate interests"), article_9_condition (string — populate only when special category data is in scope, else ""), necessity_proportionality (string, >=100 chars), retention_period (string, e.g. "24 months from last customer interaction"), retention_record_type (string), transfer_flows (string, describes cross-border flows or "None"), controller_country (string, ISO-2 like "GB","DE","US"), controller_land (string, sub-national region where relevant, else ""), controller_sector (string), controller_contact (string, name + email), central_administration_country (string, EU main-establishment analysis), eu_decision_establishment_country (string), dpo_info (string — populate for controllers meeting Art. 37 thresholds), processor_obligations (string), third_party_processors (string[]), existing_safeguards (string[]), dpia_team (string — team composition), reference_materials (string), reasons_to_conduct (string[] — 1-3 selections from the intake page's REASONS_TO_CONDUCT enum: "Systematic, extensive evaluation / profiling with significant effects (Art. 35(3)(a))","Large-scale special-category or criminal-offence data (Art. 35(3)(b))","Large-scale systematic monitoring of a public area (Art. 35(3)(c))","Evaluation or scoring (incl. profiling / prediction)","Automated decision-making with legal or significant effect","Sensitive or highly personal data","Data processed on a large scale","Matching or combining datasets","Data concerning vulnerable subjects","Innovative use of new technology","Processing prevents exercising a right / using a service","Required by national law","DPO or data-subject recommendation","Required by a code of conduct / standard","Risk management / accountability (beneficial)","Existing processing — the risk has changed"), dpia_scope_note (string), publication_intent (string), secondary_uses (string), nature_scope_context (string), functional_description (string), supporting_assets (string), codes_of_conduct (string), data_minimisation_justification (string), data_quality_measures (string), data_subject_rights_mechanisms (string), dp_by_design_measures (string), dpo_advice (string), data_subjects_views_sought (string), data_subjects_views (string), processing_version (string, e.g. "v1.0"), estimated_launch_date (ISO date), estimated_end_date (ISO date or ""), additional_context (string — user narrative, optional, per R1a coverage matrix: include on ~40% of scenarios). Vary sectors (Healthcare, FinTech, HR/Employment, AdTech, EdTech, Retail) and posture — some with mature Art.35 documentation, some with material gaps (missing DPO, no data_subjects_views_sought, weak necessity_proportionality), some with third-country transfers lacking a mechanism.`,
    "cppa-risk": `CPPA Risk Assessment — FIVE-STAGE intake schema (Cal. Code Regs. tit. 11 §§ 7150–7157). Return objects with EXACTLY these top-level keys: triggers, exceptions, activity_details, impact, org_context, annual_consumer_volume.

triggers (object of booleans): sells_or_shares_pi, targeted_advertising, profiling_significant_effects, sensitive_pi_beyond_enumerated, high_volume_processing, admt_involved. At least one must be true.

exceptions (object — eight § 7152(a)(1)–(8) keys, each an object): fraud_detection, security_integrity, debugging, transient_use, internal_research, employment_context, legal_compliance, consumer_request. Each value: { claimed: boolean, scope: string, safeguards: string, documented: boolean }. When claimed=false, scope/safeguards may be empty strings.

activity_details (array): one block per triggered activity that is NOT fully covered by an exception. Each block: { trigger_key: string (one of the trigger keys), data_categories: string[] (subset of ["name/contact","identifiers","financial","health","biometric","location","browsing/search history","inferences","sensitive PI","other"]), consumer_categories: string[] (subset of ["customers","website visitors","employees","minors under 16","minors under 13","vulnerable populations","general public"]), purpose_description: string (>=50 chars, specific — not generic phrases like "to improve our service"), business_benefits: string, consumer_benefits: string, current_safeguards: string, known_gaps: string, third_party_recipients: string, cross_context_tracking: boolean, profiling_inferences: boolean, children_in_scope: boolean }.

impact: { likelihood_of_harm: "Remote"|"Possible"|"Likely"|"Near certain", severity_of_harm: "Minimal"|"Moderate"|"Significant"|"Severe", harm_types: string[] (from ["Financial harm","Physical harm","Discrimination","Reputational harm","Emotional distress","Chilling effects on free expression","Unauthorised disclosure","Identity theft / fraud"]), vulnerable_populations_detail: string, benefits_outweigh_risks: "Yes — clearly"|"Yes — with mitigation"|"Uncertain"|"No — risks outweigh benefits", benefits_outweigh_risks_rationale: string (>=100 chars), cybersecurity_gaps_identified: boolean, prior_assessments_conducted: boolean, prior_assessment_date: string (ISO date or "") }.

org_context: { company_name: string, sector: string, q1_revenue: string (e.g. "Under $25M","$25M–$50M","$50M–$100M","$100M–$500M","Over $500M") /* RC-A A5: single truth */, privacy_counsel_engaged: boolean, dpo_or_privacy_officer: boolean, board_level_oversight: boolean, existing_privacy_programme: string, cppa_audit_notification_received: boolean, additional_context: string }.

annual_consumer_volume: string — MUST be one of the exact CONSUMER_OPTS enum values used by the intake page: "Fewer than 100,000","100,000–249,999","250,000–1 million","1–10 million","Over 10 million","Unsure". Do NOT emit a raw count range (e.g. "50,000–100,000"); that value is not a member of the enum and will be rejected as option-drift by the fixture-alignment audit.

Vary the scenarios: AdTech (multi-trigger, contested transient_use exception), Healthcare SaaS (sensitive PI, well-documented security/debugging/research/legal exceptions), HR/employment-context-only (single employment_context exception), FinTech credit scoring (profiling_significant_effects + ADMT + cybersecurity gaps), small retailer below thresholds (mostly false triggers — should result in voluntary review), and a high-risk profiling/minors scenario (children_in_scope=true). Mix posture: some weak/undocumented exception claims, some clear gaps, some well-controlled.`,
    "cppa-cyber": `CPPA Cybersecurity Audit — 11 CCR § 7123(c) 18-control schema. Return objects with EXACTLY these top-level keys: entity_name (string), industry (sector string), sector (string, may mirror industry), profile (object: { incidents_12mo: string like "0","1","2-5",">5"; framework: one of "SOC 2","ISO 27001","NIST CSF 2.0","CIS Controls","None"; last_audit: ISO date or "" }), controls (object mapping EACH of these 18 exact slug keys to { status: one of "Implemented","Mature","Partial","Gap","Insufficient information"; notes: string, >=20 chars describing the specific evidence or absence }). The 18 slugs are (use EVERY one, spelled EXACTLY): c1_auth, c2_encryption, c3_account_access, c4_inventory, c5_secure_config, c6_vuln_mgmt, c7_audit_logs, c8_network_mon, c9_anti_malware, c10_segmentation, c11_port_protocol, c12_awareness, c13_training, c14_secure_dev, c15_third_party, c16_retention, c17_incident, c18_continuity. Do NOT invent alternative slugs (no c14_third_party, no c16_training — those are legacy/typo aliases). Vary posture: some fully Mature/Implemented, some with clusters of Partial/Gap in specific domains (e.g. training and incident weak; access controls strong), some with several controls at "Insufficient information" (intake gaps), and vary framework across SOC 2, ISO 27001, NIST CSF 2.0, and one "None". Include both under-threshold small businesses and clearly-covered enterprises.`,
    "governance": `Governance Assessment — audit intake schema for run-governance-assessment. Return objects with EXACTLY these top-level keys (US spelling of organization_name): organization_name (string), sector (string), org_size (one of "1-10","11-50","51-250","251-1000","1000+"), jurisdictions (string[] from ["EU","GB","UK","US-CA","US-NY","US-CO","US-VA","US","CA","Other"] — include EU/UK on ~half of scenarios), eu_uk_data (one of "Yes","No"), tools (string[] of external technology tools in use, e.g. ["Google Workspace","Slack","Salesforce","HubSpot","OpenAI ChatGPT Enterprise","Anthropic Claude","Microsoft 365","AWS"]), data_categories (string[] from ["Contact details","Identifiers","Financial data","Health or medical data","Location data","Device/technical data","Behavioural / browsing data","Inferences","Sensitive data — other","Children's data","Employee data"]), special_category (one of "Yes","No"), special_categories_list (string[], populate only when special_category="Yes", subset of ["Health","Biometric","Racial/ethnic","Political opinions","Religious beliefs","Trade union","Sex life/orientation","Genetic"]), privacy_policy (one of "Yes, published and current","Yes, but outdated (>12 months)","Draft only","No"), privacy_notice_coverage (string when privacy_policy starts with "Yes"; else "n/a"), dpo_status (one of "Appointed DPO","Privacy lead (not formal DPO)","None","n/a"), dpia_status (one of "Yes, completed for high-risk processing","Partial — some activities covered","No"), dpia_ai_coverage (one of "Yes","Partial","No" when dpia_status starts with "Yes"; else "n/a"), incident_response (one of "Documented and tested","Documented but not tested","Ad-hoc","None"), training_status (one of "Yes, mandatory annual","Yes, ad-hoc","No"), training_ai_coverage (one of "Yes","Partial","No" when training_status starts with "Yes"; else "n/a"), tool_instruction (one of "Yes, written policy with specific prohibitions","Verbal guidance only","No instruction provided"), dpa_status (one of "Yes, all vendors","Most vendors","Some vendors","No","n/a"), dpa_art28_verified (one of "Yes, all clauses verified","Partial","No" when dpa_status is "Yes, all vendors" or "Most vendors"; else "n/a"), transfer_status (one of "Yes, US-based tools","Yes, other non-adequate countries","No cross-border transfers","n/a"), transfer_mechanism (one of "Standard Contractual Clauses","Adequacy decision","Binding Corporate Rules","None" when transfer_status starts with "Yes"; else "n/a"), technical_controls (one of "Yes — DLP/content filtering actively enforced","Partial — some tools or categories","No — policy and training only","Unsure"), technical_controls_list (string[] when technical_controls starts with "Yes" or "Partial", subset of ["DLP","Content filtering","API-based prevention","Tenant data-loss controls","Prompt/output scanning"]; else []), dsr_capability (one of "Yes — documented and tested across all vendors","Partial","No"), dsr_rights_tested (string[] when dsr_capability starts with "Yes — documented", subset of ["Access","Rectification","Erasure","Portability","Objection","Restriction"]; else []), inventory_audit (one of "Yes, current within 12 months","Yes, but >12 months old","No"), additional_context (string — user narrative, optional, per R1a coverage matrix: include on ~40% of scenarios). Vary sectors (Healthcare, FinTech, HR/Employment, AdTech, SaaS, Retail) and posture — some mature programmes, some with concentrated gaps (no DPO + no DPIA + weak DPA), some EU-only, some US-multi-state, some mixed EU/UK/US. Do NOT emit fields named organisation_name, industry, has_privacy_policy, dpo_or_privacy_lead_assigned, governance_committee_exists, annual_revenue_usd, employee_count, company_name — these are not part of the governance intake schema.`,
    "dpa-generator": `Data Processing Agreement (DPA) generator. Required camelCase fields exactly: entityName (string), controllerName (string), controllerJurisdiction (verbatim from DPA_JURISDICTIONS — e.g. "Germany","United Kingdom","California","Canada (federal / PIPEDA)"), processorName (string), processorJurisdiction (same enum), services (one-line description), dataCategories (array — subset of ["General personal data","Financial / payment data","Location data","Health / medical data","Employee / HR data","Children's data (under 18)","Biometric data","Genetic data","Criminal records"]), retention (string — one of the three form shapes verbatim: "As directed by the Controller's documented instructions" | "For the duration of the principal agreement, then delete or return" | "Fixed period: <duration text>"), hasSubProcessors (boolean), subProcessorList (string when hasSubProcessors is true; else ""), auditRights (string — one of "Documentation review — Processor provides audit reports/certifications on request" | "Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice" | "Enhanced — on-site inspection on 30 days' notice plus continuous evidence access" | "Other: <free-text description>"), transferMechanism (string — VERBATIM one of "" (when no transfers) | "EU Standard Contractual Clauses (SCCs)" | "UK IDTA / UK Addendum to EU SCCs" | "Binding Corporate Rules" | "Adequacy decision or regulations" | "None in place yet"). DO NOT emit legalFramework or includeTransferClause — those are DERIVED server-side (legalFramework from documentType via frameworkFor(); includeTransferClause from whether transferMechanism is non-empty). Vary sectors (AdTech, Healthcare, FinTech, HR) and jurisdictions; include some intra-EU (no transfer mechanism), some cross-border, and at least one "None in place yet" scenario.`,
    "ir-playbook": `Incident Response Playbook generator. Required camelCase fields exactly: organizationName (string), discoveryDateTime (ISO date-time within the last 7 days), cause (e.g. "Ransomware attack","Phishing-led credential theft","Misconfigured S3 bucket","Insider exfiltration","Third-party vendor breach"), dataTypes (array, e.g. ["PII","health information","financial records","credentials"]), affectedCount (string range like "1000-10000"), jurisdictions (array of ISO codes like ["US-CA","US-TX","UK","EU"]), processorInvolved (boolean), processorName (string, only if processorInvolved), contained (one of "Yes","Partially","No","Under investigation"), organisationType (sector string). Vary sectors (Healthcare, Retail, FinTech, EdTech) and severity.`,
    "biometric-checker": `Biometric compliance checker. Required camelCase fields exactly: orgName (string), orgType (sector string), biometricTypes (array — e.g. ["facial geometry"],["fingerprint","hand geometry"],["iris scan","fingerprint"]), purpose (string — e.g. "Loss prevention","Workforce time and attendance","Physical access control"), jurisdictions (array — MUST use these exact selection labels and NEVER bare state codes: "Illinois, USA (BIPA)", "Texas, USA (CUBI)", "Washington, USA", "California, USA (CCPA)", "Virginia, USA", "EU (GDPR)", "United Kingdom (UK GDPR)". Vary across single-jurisdiction and multi-jurisdiction mixes — e.g. ["Illinois, USA (BIPA)"], ["Texas, USA (CUBI)","California, USA (CCPA)"], ["EU (GDPR)","United Kingdom (UK GDPR)"]). Vary compliance posture: include some with no written policy, some without informed consent, some with third-party sharing, some with undefined retention.`,

    // B3: editorial / customer-facing Anthropic generators below — score against
    // the editorial rubric (accuracy + citation + no-adaptive-guidance; drop
    // structured-field checks; formatting weight = 0).
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
  const description = contractForTool
    ? `${renderContractPrompt(contractForTool)}\n\nScenario guidance: ${SCENARIO_GUIDANCE[tool] ?? ""}`.trim()
    : (toolDescriptions[tool] ?? `${tool} compliance tool. Use realistic and varied scenarios.`);
  // QB-P14 item 1 — dpia's schema is the largest; QB-P6 richness rules push
  // intake generation past 180s. Give dpia the same 300s ceiling cppa-risk
  // already gets; every other tool keeps the 180s default.
  const intakeTimeoutMs = (tool === "cppa-risk" || tool === "dpia") ? 300_000 : 180_000;

  // Verbose schemas (lia, dpia, governance, cppa-risk, cppa-admt) produce ~1.5-2k tokens per intake;
  // 10 docs at 8k tokens reliably truncates. Chunk the generation so each call stays well under the cap,
  // then concatenate.
  const VERBOSE = new Set(["lia", "dpia", "governance", "cppa-risk", "cppa-admt"]);
  const chunkSize = VERBOSE.has(tool) ? 3 : count;
  // QB-P6 — expanded intake-generator system prompt. Preserves the original
  // sentence verbatim and adds five richness rules (a)–(e).
  const sys = `You generate realistic, varied test intake objects for privacy compliance tools. Use realistic company names and vary compliance posture — some nearly compliant, some with gaps, some edge cases. Never generate all-compliant inputs. Return ONLY a valid JSON array, no markdown.

(a) NAMED-OBJECT DENSITY — every narrative or free-text field must name concrete objects: real-sounding systems and vendors, officers with role titles and plausible names, datasets, cadences, and figures, so a downstream generator can tie every recommendation to a named intake fact.
(b) CROSS-FIELD COHERENCE — narratives must agree with the enum answers, sector, jurisdictions, and volumes; no contradictions between fields.
(c) TEMPORAL COHERENCE — all dates recent and mutually consistent.
(d) BUSINESS-FACTS-ONLY — fixture text states facts about the business, never propositions of law (no adequacy claims, no statutory interpretations, no SCC-module or section assertions), except where a tool's scenario guidance explicitly mandates specific legal phrasing.
(e) NAME VARIETY — vary company names across scenarios and chunks; never reuse the same base name (e.g. "Meridian") across scenarios.`;

  const out: any[] = [];
  let chunkIdx = 0;
  while (out.length < count) {
    const remaining = count - out.length;
    const n = Math.min(chunkSize, remaining);
    chunkIdx++;
    const raw = await claude(
      sys,
      `Generate ${n} varied realistic intake objects for the "${tool}" compliance tool.\n\n${description}\n\nThis is chunk ${chunkIdx}; vary scenarios from any prior chunks. Return a JSON array of exactly ${n} objects.`,
      16000,
      "claude-sonnet-4-6",
      AbortSignal.timeout(intakeTimeoutMs)
    );
    const parsed = tryParse(raw);
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
async function generateValidatedIntakes(tool: string, count: number): Promise<{ intakes: any[]; rejected: { reason: string }[]; totalAttempted: number }> {
  const { lintFixture } = await import("../_shared/quality/fixture-lint.ts");
  const initial = await generateIntakes(tool, count);
  const accepted: any[] = [];
  const rejected: { reason: string }[] = [];

  for (const item of initial) {
    // QB-P20 item 3 — fixture lint (grader-collision screen). Applied
    // BEFORE contract validation so blacklist/hedge/leak hits are
    // rejected on first sight; on hit we regenerate once, then reject.
    const linted = lintFixture(item);
    let candidate = item;
    if (linted) {
      console.warn(`[fixture-lint] ${tool}: ${linted.reason} @ ${linted.path} — regenerating once`);
      try {
        const retry = await generateIntakes(tool, 1);
        const relint = retry[0] ? lintFixture(retry[0]) : { reason: "regeneration returned no item" };
        if (relint) { rejected.push({ reason: `lint: ${linted.reason}; retry: ${(relint as any).reason ?? "reject"}` }); continue; }
        candidate = retry[0];
      } catch (e) {
        rejected.push({ reason: `lint regenerate failed — ${(e as Error).message}` });
        continue;
      }
    }
    const r = validateIntake(tool, candidate);
    if (r.ok) { accepted.push(candidate); continue; }
    console.warn(`[validateIntake] ${tool}: ${r.reason} — regenerating once`);
    try {
      const retry = await generateIntakes(tool, 1);
      const r2 = retry[0] ? validateIntake(tool, retry[0]) : { ok: false, reason: "regeneration returned no item" };
      if (r2.ok) { accepted.push(retry[0]); continue; }
      console.warn(`intake rejected (${tool}): ${r2.reason}`);
      rejected.push({ reason: r2.reason ?? "unknown" });
    } catch (e) {
      console.warn(`intake rejected (${tool}): regenerate failed — ${(e as Error).message}`);
      rejected.push({ reason: (e as Error).message });
    }
  }
  return { intakes: accepted, rejected, totalAttempted: initial.length };
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

async function dispatchGeneration(
  admin: Admin, tool: string, intake: any, userId: string,
): Promise<DispatchResult> {
  try {
    if (tool === "cppa-admt") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "admt", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("run-admt-checker", { assessment_id: rec.id });
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, invocation };
    }
    if (tool === "cppa-risk") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "risk_assessment", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("run-cppa-risk-assessment", { assessment_id: rec.id });
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, invocation };
    }
    if (tool === "cppa-cyber") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "cybersecurity", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      const invocation = invokeFn("run-cppa-cybersecurity", { assessment_id: rec.id });
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, invocation };
    }
    if (tool === "lia") {
      const LIA_COLS = ["stage","status","organization_name","processing_description","relationship_type","data_categories","jurisdictions","sector","stated_purpose","alternatives_considered","purpose_details","necessity_details","balancing_details","preview_signal","supplemental_responses","supplemental_context"];
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

async function pollGenerationRow(
  admin: Admin, sourceTable: string, sourceRowId: string, deadlineMs: number,
): Promise<PollOutcome> {
  const deadline = Date.now() + deadlineMs;
  const intervalMs = sourceTable === "biometric_assessments" ? 2500 : 5000;
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
        if (s === "complete") return { status: "complete", reportData: (data as any)?.report_data };
        if (["error", "failed", "cancelled"].includes(s ?? "")) return { status: "error", error: `${sourceTable} status=${s}` };
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
          if (bodyCol) return { ...rd, [bodyCol]: (data as any)?.[bodyCol] ?? "" };
          return rd;
        }
        if (["error", "failed", "cancelled"].includes((data as any)?.status ?? ""))
          throw new Error(`${table} status=${(data as any)?.status}`);
      }
      throw new Error(`timeout polling ${table}`);
    };

    if (tool === "cppa-admt") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "admt", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-admt-checker", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, reportData: await poll("cppa_assessments", rec.id) };
    }
    if (tool === "cppa-risk") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "risk_assessment", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-cppa-risk-assessment", { assessment_id: rec.id }).catch(() => {});
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
      const LIA_COLS = ["stage","status","organization_name","processing_description","relationship_type","data_categories","jurisdictions","sector","stated_purpose","alternatives_considered","purpose_details","necessity_details","balancing_details","preview_signal","supplemental_responses","supplemental_context"];
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
    "cppa-admt": "run-admt-checker", "cppa-risk": "run-cppa-risk-assessment",
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


async function runBatch(runId: string): Promise<void> {
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
    .select("id, tool, batch_size, run_number, created_by, user_id, status, next_doc_index, intakes, partial_state, progress_log")
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
    }
    if (intakes.length < batchSize && nextIdxSafe === 0) {
      const needed = batchSize - pinnedCount;
      await log("info", `Starting run #${runNumber} for ${tool} (${batchSize} documents${pinnedCount > 0 ? `, ${pinnedCount} pinned + ${needed} generated` : ""})`);
      await log(OPENAI_API_KEY ? "success" : "warn",
        OPENAI_API_KEY
          ? `OPENAI_API_KEY detected — GPT-4o cross-review enabled`
          : `OPENAI_API_KEY NOT detected — GPT-4o cross-review will be SKIPPED for every doc`);
      await upd({ status: "generating" });
      await log("info", `Generating ${needed} intake scenarios via Claude…`);
      let intakeWarning: string | null = null;
      try {
        const gen = await generateValidatedIntakes(tool, needed);
        intakes = [...intakes, ...gen.intakes];
        if (gen.rejected.length > 0) {
          await log("warn", `Intake validation: ${gen.rejected.length}/${gen.totalAttempted} rejected after retry (${tool}). Reasons: ${gen.rejected.slice(0, 3).map(r => r.reason).join(" | ")}`);
        }
        const failRate = gen.totalAttempted > 0 ? gen.rejected.length / gen.totalAttempted : 0;
        if (failRate > 0.3) {
          intakeWarning = `Intake spec doesn't match ${tool}'s expected input — fix the intake generator before trusting results. (${gen.rejected.length}/${gen.totalAttempted} intakes failed validation; aborting fix-generation.)`;
          await log("error", intakeWarning);
          await upd({
            status: "error",
            error: intakeWarning,
            completed_at: new Date().toISOString(),
          });
          clearInterval(heartbeat);
          return;
        }
        await log("success", `Intakes ready: ${intakes.length} total (${pinnedCount} pinned + ${gen.intakes.length} generated / ${gen.totalAttempted} attempted)`);
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

      let docRowId: string;
      let intake: any;
      let reportData: any;
      let docLabel: string;
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
        } | undefined;
        const isTransient = !POLL_TOOLS.has(tool);

        let sourceTable: string;
        let sourceRowId: string;
        let genStartedAt: number;
        let isolateCount: number;

        if (pendingGen && pendingGen.doc_index === i) {
          docRowId = pendingGen.doc_row_id;
          sourceTable = pendingGen.source_table;
          sourceRowId = pendingGen.source_row_id;
          genStartedAt = pendingGen.gen_started_at;
          isolateCount = (pendingGen.isolate_count ?? 1) + 1;
          await log("info", `${docLabel}: resuming poll of ${sourceTable}/${sourceRowId} (isolate ${isolateCount}, gen elapsed ${Math.round((Date.now() - genStartedAt) / 1000)}s)`);
        } else {
          await log("info", `${docLabel}: building…`);
          const { data: docRow } = await admin.from("quality_run_documents").insert({
            run_id: runId, tool, doc_number: i + 1, intake_data: intake, status: "building",
            scenario_set: scenarioSet,
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

          const dispatch = await dispatchGeneration(admin, tool, intake, userId);
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
        const outcome = await pollGenerationRow(admin, sourceTable, sourceRowId, isolateBudget);

        if (outcome.status === "deadline") {
          (state as any).pending_gen = {
            doc_index: i, doc_row_id: docRowId,
            source_table: sourceTable, source_row_id: sourceRowId,
            gen_started_at: genStartedAt, isolate_count: isolateCount,
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
      try {
        const detChecksAttempt1: any[] = Array.isArray((reportData as any)?.deterministic_checks)
          ? (reportData as any).deterministic_checks
          : [];
        const alreadyRegenerated = Number((reportData as any)?.regen_round ?? 0) > 0;
        if (
          !alreadyRegenerated
          && evalSourceRowId
          && isCounselVoiceRegenEligible(detChecksAttempt1)
        ) {
          const nonce = crypto.randomUUID();
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
            let reportData2: any = null;
            try {
              if (POLL_TOOLS.has(tool)) {
                const d2 = await dispatchGeneration(admin, tool, intake, userId);
                if (d2) {
                  const outcome2 = await pollGenerationRow(admin, d2.sourceTable, d2.sourceRowId, POLL_DEADLINE_MS);
                  if (outcome2.status === "complete") reportData2 = outcome2.reportData;
                }
              } else {
                const b2 = await buildDocument(admin, tool, intake, userId);
                if (b2) reportData2 = b2.reportData;
              }
            } catch (e) {
              await log("warn", `${docLabel}: CV1-R2 regen dispatch threw — ${(e as Error).message}`);
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
            } else {
              await log("warn", `${docLabel}: CV1-R2 regeneration did not produce a doc — recording attempt-1 result and moving on`);
            }
          }
        }
      } catch (e) {
        console.warn("[cv1-r2] auto-regen block non-fatal:", (e as Error).message);
      }

      // ---------- Evaluation phase ----------
      await log("info", `${docLabel}: evaluating Claude + GPT-4o + cross-review in parallel…`);

      // Run Claude eval and GPT eval in parallel.
      const [claudeEval, gptResult] = await Promise.all([
        withTimeout(evaluateDocumentClaude(tool, intake, reportData), EVALUATION_TIMEOUT_MS, "Claude eval")
          .catch(e => { console.warn("Claude eval failed:", e.message); return null; }),
        withTimeout(evaluateDocumentGPT(tool, intake, reportData), EVALUATION_TIMEOUT_MS, "GPT-4o eval")
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
      if (gptEval) {
        await log("success", `${docLabel}: GPT-4o OK (overall ${gptEval.overall_score}/100)`);
      } else if (gptResult.skipReason) {
        await log("warn", `${docLabel}: GPT-4o SKIPPED — ${gptResult.skipReason}`);
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
        rubric_findings_compared: claudeRubricById.size,
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

      // Push Claude findings with per-doc cross-category.
      //  - Deterministic failures → "deterministic" (code-verified ground truth)
      //  - Deterministic passes → no category (don't surface as defect)
      //  - Rubric (llm) findings → categorized by joining with gpt verdict for the SAME check_id
      for (const f of claudeEval.findings) {
        let perDocCategory: string | null = null;
        let gptEvidence: string | null = null;
        if (f.check_type === "deterministic") {
          perDocCategory = f.passed ? null : "deterministic";
        } else {
          // llm rubric finding
          const gptF = gptEval ? gptById.get(f.check_id) : null;
          if (gptEval) {
            const gptFail = gptF ? !gptF.passed : false;
            gptEvidence = gptF?.evidence ?? null;
            perDocCategory = categorizePerDoc(!f.passed, gptFail);
          } else {
            perDocCategory = !f.passed ? "claude_only" : null;
          }
        }
        state.allDocFindings.push({
          ...f,
          doc_id: docRowId,
          scenario_set: scenarioSet,
          cross_category: perDocCategory,
          cross_evidence_gpt: gptEvidence,
          rubric_addition: null, // F6: obsolete — deterministic categorization replaces the LLM reconciler
        });
      }

      // COUNSEL-VOICE-1 E-completion: merge per-tool deterministic format
      // checks emitted by the generator into report_data.deterministic_checks
      // so they count toward checks_total / checks_passed alongside grader
      // findings. Deterministic here means "computed in code" — no LLM.
      try {
        const detChecks: any[] = Array.isArray((reportData as any)?.deterministic_checks)
          ? (reportData as any).deterministic_checks
          : [];
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


      // GPT-only failures: rubric findings the model flagged that Claude didn't (claude passed
      // or didn't return that id at all).
      for (const gptFinding of gptFindings.filter((f: any) => !f.passed)) {
        const claudeF = claudeRubricById.get(gptFinding.check_id);
        const claudeFail = claudeF ? !claudeF.passed : false;
        if (!claudeFail) {
          // Not already counted via the Claude loop above (which only records categories for Claude findings).
          state.allDocFindings.push({
            check_id: gptFinding.check_id, check_type: "gpt_only",
            dimension: gptFinding.dimension, severity: gptFinding.severity,
            passed: false, evidence: gptFinding.evidence ?? null, doc_id: docRowId,
            scenario_set: scenarioSet,
            cross_category: "gpt_only", cross_evidence_gpt: gptFinding.evidence ?? null,
            rubric_addition: null,
          });
        }
      }

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

    // Cap exists because Claude fix-generation is the long pole. Running batches of
    // FIX_CONCURRENCY in parallel lets us raise MAX_AI_FIXES well above the sequential ceiling
    // while staying inside the edge runtime budget.
    const MAX_AI_FIXES = 50;
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

    // P-A: candidates are generated ONLY from TUNING failures. A check that fails only
    // on holdout intakes is a true generalization gap and is surfaced for reporting,
    // but no fix is proposed for it (the loop must never see the holdout to "fix" it).
    // Fallback: if no tuning data exists yet (older runs / empty split), keep the legacy
    // overall failRate gate so behavior is non-regressive.
    const hasTuningData = state.tuningBuilt > 0;
    const aiCandidates = aggregates
      .filter(a => a.evidence.length > 0)
      .filter(a => hasTuningData ? a.tuningFailRate > 0.2 : a.failRate > 0.2)
      .filter(a => !alreadyFixedIds.has(a.checkId))
      .sort((x, y) => (y.severityRank - x.severityRank) || (y.failed * y.failRate - x.failed * x.failRate))
      .slice(0, MAX_AI_FIXES);

    await log("info", `Aggregating ${byCheck.size} unique checks; generating AI fixes for top ${aiCandidates.length} (cap ${MAX_AI_FIXES}, concurrency ${FIX_CONCURRENCY})…`);

    // Run fix-generation in parallel batches so we can raise the cap without exceeding runtime.
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
          const { evaluateGateV2 } = await import("../_shared/quality/gate-v2.ts");
          const { shadowScore } = await import("../_shared/quality/shadow-score.ts");
          const { tagIntake } = await import("../_shared/quality/coverage-matrix.ts");
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
            
            await admin.from("quality_coverage_cells").upsert({
              tool, sector: cell.sector, posture: cell.posture, branch: cell.branch,
              hit_count: 1, last_hit_at: new Date().toISOString(),
            }, { onConflict: "tool,sector,posture,branch", ignoreDuplicates: false }).catch(() => {});
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
    await upd({ status: "error", error: (e as Error).message?.slice(0, 300), completed_at: new Date().toISOString() }).catch(() => {});
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
