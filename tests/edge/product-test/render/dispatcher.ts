// DOC 272 §9 "Offline twin" — the single entry point `tests/edge/product-test/`
// uses to render a panel fixture through a product's own deterministic call
// chain, with NO database, NO network and NO environment secrets: every flag
// a production `index.ts` would read from `Deno.env` is instead a literal
// constant here, set to the CUSTOMER-FACING default (documented per tool
// below) and never read from the process environment.
//
// Each chain is copied from a proven offline caller rather than invented:
//
//   cppa-risk / cppa-cyber / cppa-admt — `tests/edge/ptest/determinism.test.ts`
//     and `tests/edge/ptest/panels.test.ts` (`generates`), byte-for-byte.
//   dpia / lia / governance — the exact sequence each function's `index.ts`
//     runs on its deterministic path (see the file-level comment on each
//     branch below for the index.ts line numbers read).
//
// `registration` is NOT wired: see the comment on `renderOffline` below.

import type { RenderedSkeletonDocument } from "../../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { documentHash, reviewTextOf } from "../../../../supabase/functions/ptest-run-driver/_local/review/determinism.ts";

type Bag = Record<string, unknown>;

// ── cppa-risk ───────────────────────────────────────────────────────────────
import { generateCppaRiskReport } from "../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";

// ── cppa-admt ───────────────────────────────────────────────────────────────
import { computeAdmtV2 } from "../../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { gatherCitations } from "../../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-citations.ts";
import { vaRegistryAsProvisions } from "../../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-corpus.ts";
import { buildAuthorityExhibit } from "../../../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";

// ── cppa-cyber ──────────────────────────────────────────────────────────────
import { buildCyberDeliverables } from "../../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import {
  buildCyberComponentRecommendations,
  buildCyberNextSteps,
} from "../../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";

// ── dpia ────────────────────────────────────────────────────────────────────
import { attachDpiaDeliverables } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-skeleton-assemble.ts";

// ── lia ─────────────────────────────────────────────────────────────────────
import { attachLiaDeliverables } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { buildDocumentationTyped, buildThreePartTestTyped } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { applyLiaRules } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-pass.ts";
import { assembleLiaSkeletonDocument } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { REPORT_DISCLAIMER } from "../../../../supabase/functions/_shared/report-disclaimer.ts";

// ── governance ──────────────────────────────────────────────────────────────
import { attachGovernanceDeliverables } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { applyGovernanceProseGold } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-prose-gold.ts";
import { attachGovernanceCsc, runGovernanceCsc } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-csc.ts";
import { assembleGovernanceSkeletonDocument } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import {
  buildDomainFindingsTyped,
  composeExecutiveSummaryTyped,
} from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts";

export const WIRED_TOOLS = [
  "cppa-risk",
  "cppa-cyber",
  "cppa-admt",
  "dpia",
  "lia",
  "governance",
] as const;
export type WiredTool = typeof WIRED_TOOLS[number];

export interface RenderResult {
  readonly report: Record<string, unknown>;
  readonly document: RenderedSkeletonDocument | null;
  readonly text: string;
  readonly hash: string;
}

function isWiredTool(tool: string): tool is WiredTool {
  return (WIRED_TOOLS as readonly string[]).includes(tool);
}

/**
 * Render one panel fixture's intake through a product's own deterministic
 * call chain, offline, and return the reviewer-visible text and its hash —
 * exactly what `documentHash`/`reviewTextOf` compute for the production
 * `skeleton_document` (see `ptest-run-driver/_local/review/determinism.ts`).
 *
 * `registration` is NOT wired: its `result_summary` is assembled across
 * ~600 lines of `run-registration-assessment/index.ts` (jurisdiction cards,
 * `obligations_summary`, DPO/representative resolution) built by joining the
 * pure `runRegistrationAssessment(intake)` engine output against a DB table,
 * `jurisdiction_requirements` (index.ts:203-205) — a per-jurisdiction
 * requirement-metadata lookup with no static/offline substitute anywhere in
 * the codebase (unlike ADMT's `vaRegistryAsProvisions()` for the authority
 * exhibit corpus). Reproducing it offline would mean hand-transcribing that
 * table's contents into a new fixture this task does not own. `dpa`,
 * `ir-playbook`, `biometric`, `ropa`, `us-notice` and `eu-notice` are
 * model-assisted per doc 272 §0 and are out of scope for an offline render.
 */
export async function renderOffline(
  tool: string,
  intake: Bag,
  reportDate = "2026-09-18",
): Promise<RenderResult> {
  if (!isWiredTool(tool)) {
    throw new Error(
      `renderOffline: "${tool}" has no offline deterministic chain wired. ` +
        `Wired tools: ${WIRED_TOOLS.join(", ")}. See the doc comment on ` +
        `renderOffline for why registration and the model-assisted tools are excluded.`,
    );
  }

  const report = await buildReport(tool, intake, reportDate);
  const document = (report.skeleton_document as RenderedSkeletonDocument | undefined) ?? null;
  const { text } = reviewTextOf(report);
  const { hash } = await documentHash(report);
  return { report, document, text, hash };
}

async function buildReport(tool: WiredTool, intake: Bag, reportDate: string): Promise<Bag> {
  switch (tool) {
    case "cppa-risk":
      return renderCppaRisk(intake, reportDate);
    case "cppa-admt":
      return renderCppaAdmt(intake);
    case "cppa-cyber":
      return renderCppaCyber(intake, reportDate);
    case "dpia":
      return renderDpia(intake);
    case "lia":
      return renderLia(intake);
    case "governance":
      return renderGovernance(intake);
  }
}

// ── cppa-risk — tests/edge/ptest/determinism.test.ts `genRisk`, byte-for-byte.
async function renderCppaRisk(intake: Bag, reportDate: string): Promise<Bag> {
  const gen = await generateCppaRiskReport(intake, {
    buildStamp: "product-test-render",
    runId: "product-test-render",
    mode: "enforce",
    pass1: "deterministic",
    pass2rEnabled: false,
    refinementEnabled: false,
    euCorpus: [],
    reportDate,
  });
  return gen.report as Bag;
}

// ── cppa-admt — tests/edge/ptest/determinism.test.ts `genAdmt`, byte-for-byte.
// No clock, no injected date: ADMT prints nothing date-derived.
function renderCppaAdmt(intake: Bag): Bag {
  const computed = computeAdmtV2(intake);
  const organizationName = String(intake.organization_name ?? "").trim();
  const systemName = String(intake.system_name ?? "").trim();
  const citations = gatherCitations(computed.allFindings.map((f) => f.authority).filter(Boolean));
  const exhibit = buildAuthorityExhibit(citations, vaRegistryAsProvisions());
  const skeleton = assembleAdmtV2Document({ intake, computed, exhibit, organizationName, systemName });
  return { skeleton_document: skeleton };
}

// ── cppa-cyber — tests/edge/ptest/determinism.test.ts `genCyber`, byte-for-byte.
function renderCppaCyber(intake: Bag, reportDate: string): Bag {
  const d = buildCyberDeliverables(intake);
  const recommendations = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, [], reportDate);
  const owner = String(((intake.profile ?? {}) as Bag).remediation_owner ?? "");
  const nextSteps = buildCyberNextSteps(recommendations, owner);
  const report: Bag = {
    ...(d as unknown as Bag),
    authority_exhibit: { entries: [] },
    _meta: { internal: { cyber_recommendations: { recommendations, next_steps: nextSteps } } },
  };
  const sk = assembleCyberSkeletonDocumentV4(report, intake, "", reportDate);
  return { skeleton_document: sk.document };
}

// ── dpia — run-dpia-framework/index.ts:2665 (attachDpiaDeliverables) then
// :3458 (assembleDpiaSkeletonDocument); the authority exhibit (index.ts
// :3346-3395) reads a DB corpus table via `fetchDpiaCorpus(supabase)` with no
// offline substitute, so it is left empty here — `dpiaToa` (the skeleton's
// table-of-authorities builder) falls back to the spine-cited and domestic-
// statute candidate lists it always carries regardless of the exhibit
// (dpia-skeleton-assemble.ts:1407-1408), so the table of authorities still
// renders, just without corpus verbatim excerpts.
//
// Flags, at their customer-facing default (index.ts:783 DPIA_UNITS_MINIMAL_DEFAULT
// = false; the module's dpiaV3Append is a no-op whenever DPIA_V3_ENABLED is
// false, its own default per dpia-v3-flag.ts) — the skeleton assembler reads
// only the typed surfaces `attachDpiaDeliverables` writes, so this flag does
// not change what the deterministic document contains (see the doc comment
// atop dpia-skeleton-assemble.ts: "the legacy section_6_conclusion.decision
// string is read ONLY as the pre-decision fallback").
const DPIA_UNITS_MINIMAL_DEFAULT = false;

function renderDpia(intake: Bag): Bag {
  const report: Bag = {};
  attachDpiaDeliverables(report, intake, { unitsMinimal: DPIA_UNITS_MINIMAL_DEFAULT });
  const sk = assembleDpiaSkeletonDocument(report, intake, { obligation_sentences: [], adequacy_sentences: [] });
  report.skeleton_document = sk.document;
  return report;
}

// ── lia — run-li-assessment/index.ts:1823 (attachLiaDeliverables), :1842
// (attachLiaUpgrade4), :1864 (attachPrecedentClassPosture), :1935
// (buildThreePartTestTyped), :2148 (applyLiaRules → report.three_part_test /
// .rule_applications / .documentation_recommendations), :2714
// (assembleLiaSkeletonDocument).
//
// LIA_DETERMINISTIC_ENABLED's CODE default is false
// (lia-deterministic-flag.ts), but doc 272 §0 lists LIA among the six
// products that "render from engines and pinned spines" today — i.e. the
// deterministic path is the customer-facing default, the flag flipped on at
// a Lovable deploy exactly as CYBER_DETERMINISTIC_ENABLED is (see
// determinism.ts:22-23: "ON in production; the code default is false, so a
// harness must set it explicitly"). This render therefore assumes
// LIA_DETERMINISTIC_ENABLED=true. LIA_V3_ENABLED stays at its own default,
// false — it is the "model refinement path" doc 272 §0 says is "behind
// flags, default off" (it drives a model call, `classify-propositions
// select_hooks`), so `readings`/`selections` stay empty exactly as index.ts
// leaves them while the flag is off.
const LIA_DETERMINISTIC_PRODUCTION_DEFAULT = true;
const LIA_V3_PRODUCTION_DEFAULT = false;

function renderLia(intake: Bag): Bag {
  const report: Bag = {};
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);

  const typed = buildThreePartTestTyped(report, intake);
  const ruled = applyLiaRules(typed, report, intake, undefined, []);
  const effective = ruled.invariant_violations.length ? typed : ruled.typed;

  report.three_part_test = effective.three_part_test;
  if (effective.determination_override) {
    report.lia_determination = effective.determination_override;
  }
  report.information_needed = effective.information_needed;
  report.annotations = [];
  report.rule_applications = ruled.invariant_violations.length ? [] : ruled.applications;
  report.documentation_recommendations = buildDocumentationTyped(report, REPORT_DISCLAIMER);

  const assembled = assembleLiaSkeletonDocument(report, intake, {
    deterministic: LIA_DETERMINISTIC_PRODUCTION_DEFAULT,
    readings: [],
    v3Enabled: LIA_V3_PRODUCTION_DEFAULT,
  });
  report.skeleton_document = assembled.document;
  return report;
}

// ── governance — run-governance-assessment/index.ts:1489
// (attachGovernanceDeliverables), :1561 (applyGovernanceProseGold — the
// single writer of `report.readiness_determination`, which the skeleton's
// "403-A one-voice law" reads), :1598 (runGovernanceCsc/attachGovernanceCsc),
// :1753 (assembleGovernanceSkeletonDocument). GOVERNANCE_REFINEMENT_ENABLED
// (a model critic/verifier pass) is left off, its own customer-facing
// default per doc 272 §0 ("model refinement paths... default off").
//
// Lead correction (2026-09-18): the agent's first version left
// `domain_findings` and `executive_summary` out, believing they were
// model-only. They are not: on the deterministic path index.ts:1020-1030
// calls `buildDomainFindingsTyped(intake)` (the S-G3 domain tables,
// governance-domain-tables.ts:504) in place of the ten domain model calls,
// and index.ts:1263-1265 composes `executive_summary` with
// `composeExecutiveSummaryTyped(domainResults)` in place of the synthesis
// call. index.ts:1331-1348 then copies each typed finding through
// unchanged (its stripMd/v2-validity pass is a no-op on typed rows, which
// carry no markdown and no v2 objects) into `report.domain_findings`, and
// index.ts:1367-1386 seeds `organisation_profile: intake`,
// `overall_readiness_rating: ""` (the typed synthesis stub, index.ts:1268;
// the readiness rating is then bound by the Item-313 determination that
// applyGovernanceProseGold writes — the 403-A one-voice law). This render
// mirrors that sequence, so the document carries the same domain findings
// and executive summary production would carry with the flag on.
function renderGovernance(intake: Bag): Bag {
  const typed = buildDomainFindingsTyped(intake);
  const report: Bag = {
    organisation_profile: intake,
    executive_summary: composeExecutiveSummaryTyped(typed),
    top_three_risks: [],
    immediate_actions: [],
    overall_readiness_rating: "",
    readiness_rationale: "",
    interaction_effects: "",
    domain_findings: { ...typed },
    enforcement_precedents: [],
    annotations: [],
    information_needed: [],
  };
  attachGovernanceDeliverables(report, intake);
  applyGovernanceProseGold(report, intake);
  const csc = runGovernanceCsc(report, { intake });
  attachGovernanceCsc(report, csc);
  const sk = assembleGovernanceSkeletonDocument(report, intake);
  report.skeleton_document = sk.document;
  return report;
}
