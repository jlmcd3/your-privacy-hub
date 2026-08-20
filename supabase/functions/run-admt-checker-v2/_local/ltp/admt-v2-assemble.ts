// CPPA ADMT v1.2 — DOCUMENT ASSEMBLER (Part I of
// CPPA_ADMT_Audit_Spine_v1.2_Revised.docx, transcribed verbatim).
//
// Builds a RenderedSkeletonDocument (the same shape every other product's
// spine produces via `_shared/prose/skeleton-render.ts`) directly from the
// computed Part II values, so `generate-report-pdf`'s existing generic
// skeleton_document renderer displays this product with ZERO changes to
// that shared file.
//
// FIDELITY NOTE: fixed prose below is transcribed VERBATIM from the CEO's
// v1.2 spine docx. This module does not go through the formal
// SpineBlockLike/renderSkeletonDocument byte-pin-conformance indirection
// every other converted product uses — that machinery exists to detect
// silent drift in an ALREADY-RATIFIED spine over time, which doesn't apply
// to a first build. Adding that formal pin layer is a reasonable follow-up
// hardening step once this spine itself is ratified for production; noted,
// not done here.
//
// NO-PADDING LAW (carried from the shared convention): a section, table
// row, or subsection with nothing to show is omitted entirely, never
// printed with placeholder text.

import type { AdmtV2Computed } from "./admt-v2-deterministic.ts";
import type { NoticeFactor, VendorControl } from "./admt-v2-deterministic.ts";
import { VENDOR_MATERIALITY_MATRIX } from "./admt-v2-deterministic.ts";
import type { PathState } from "./admt-v2-vocab.ts";
import {
  composeAccessWithholdingAnalysis,
  composeApplicabilityAnalysis,
  composeEmploymentEducationExceptionAnalysis,
  composeFullOptOutAnalysis,
  composeHumanAppealAnalysis,
  composeNoticeAnalysis,
  composeVendorDependencyAnalysis,
} from "./admt-v2-generated.ts";
import type { AuthorityExhibit } from "../../../_shared/report-exhibits/authority-exhibit.ts";
import { buildFootnoteIndex, withFootnoteMarker, type FootnoteIndex } from "../../../_shared/report-exhibits/footnote-engine.ts";

export const ADMT_V2_SPINE_VERSION = "cppa-admt-v1.2-2026-08-20";
export const ADMT_V2_SPINE_SOURCE = "CPPA_ADMT_Audit_Spine_v1.2_Revised.docx — CEO-authored 2026-08-19/20";

export interface RenderedTable {
  key: string;
  surface: string;
  title: string;
  columns: string[];
  rows: string[][];
  note?: string;
}
export interface RenderedParagraph {
  kind: string;
  text: string;
  table?: RenderedTable;
}
export interface RenderedSection {
  id: string;
  title: string;
  paragraphs: RenderedParagraph[];
}
export interface RenderedSkeletonDocument {
  _typed: "skeleton-document@admt-v1.2";
  spine_version: string;
  title: string;
  subtitle: string;
  sections: RenderedSection[];
}

function reader(arr: string[]): string {
  return arr.length ? arr.join("; ") : "not reported";
}

/** Small helper: build a row for a factor table from a NoticeFactor. */
function factorRow(label: string, f: NoticeFactor): string[] {
  return [label, f.label, f.evidenceLabel ?? statusToEvidenceCell(f), f.effect];
}
function statusToEvidenceCell(f: NoticeFactor): string {
  if (f.evidence) return f.evidence === "DOCUMENTED" ? "Documented" : f.evidence === "NOT_DOCUMENTED" ? "Not documented" : f.evidence === "INSUFFICIENT_RECORD" ? "Unresolved" : "Not applicable";
  return f.status;
}

export interface AssembleArgs {
  intake: Record<string, unknown>;
  computed: AdmtV2Computed;
  exhibit: AuthorityExhibit | null;
  organizationName: string;
  systemName: string;
}

export function assembleAdmtV2Document(args: AssembleArgs): RenderedSkeletonDocument {
  const { intake, computed, organizationName, systemName } = args;
  const fnIndex: FootnoteIndex | null = args.exhibit ? buildFootnoteIndex(args.exhibit) : null;
  const cite = (text: string, citation: string): string =>
    fnIndex && citation ? withFootnoteMarker(text, citation, fnIndex) : text;

  const d = (intake as any)?.admt_detail ?? {};
  const { scope, notice, optOut, access, vendor } = computed;

  const sections: RenderedSection[] = [];
  const push = (id: string, title: string, paragraphs: RenderedParagraph[]) => {
    const nonEmpty = paragraphs.filter((p) => p.kind === "table" ? !!p.table && p.table.rows.length > 0 : !!p.text?.trim());
    if (nonEmpty.length > 0) sections.push({ id, title, paragraphs: nonEmpty });
  };

  // ── Cover / header table ────────────────────────────────────────────────
  push("cover", "CPPA ADMT Compliance Audit Assessment", [
    { kind: "table", text: "", table: {
      key: "cover:0", surface: "header", title: "", columns: ["Report field", "Value"],
      rows: [
        ["Organization", organizationName || "(not provided)"],
        ["System reviewed", systemName || "(not provided)"],
        ["Overall assessment", computed.overallPostureLabel],
        ["Record sufficiency", computed.overallRecordGrade.replace(/_/g, " ").toLowerCase()],
        ["Regulatory criteria", cite("11 CCR §§ 7001(e), 7001(ddd), 7200, 7220–7222; related provisions cited below", "11 CCR § 7200")],
      ],
    }},
    { kind: "skeleton", text: "Important Note About This Assessment: This report evaluates the Company's answers against the ADMT requirements covered here. It identifies where the stated facts support a requirement, where they do not, and where the information supplied is not enough to reach a reliable conclusion. It is not legal advice, a legal opinion, an assurance engagement, or a certification of compliance. The Company or its counsel should confirm the underlying facts before relying on the report for regulatory or governance purposes." },
  ]);

  // ── Executive Summary ───────────────────────────────────────────────────
  const domains = Array.isArray((intake as any)?.decision_domains) ? (intake as any).decision_domains as string[] : [];
  const execLead = overallDeterminationSentence(computed);
  push("executive_summary", "Executive Summary", [
    { kind: "lead", text: execLead },
    { kind: "skeleton", text: `The Company identifies ${systemName || "the System"} as used in ${reader(domains)}. The assessment focuses on whether the System is within the ADMT rules for the decision at issue, whether consumers receive the required Pre-use Notice, whether the Company provides an effective opt-out or can support the exception it relies on, and whether the Company can explain a consumer-specific decision when asked. Missing evidence is treated as a limitation, not as proof of noncompliance.` },
    { kind: "table", text: "", table: {
      key: "executive_summary:2", surface: "audit_area_summary", title: "",
      columns: ["Audit area", "Result on reported facts", "Record grade", "Decision effect"],
      rows: [
        ["Applicability", scope.scopeState.replace(/_/g, " "), scope.recordGrade.replace(/_/g, " "), scopeAreaEffect(scope)],
        ...(scope.scopeState !== "OUT_OF_SCOPE" ? [
          ["Pre-use Notice", notice.posture.replace(/_/g, " "), notice.recordGrade.replace(/_/g, " "), notice.posture === "GAP" ? "CONDITION" : notice.posture === "PARTIAL" ? "WEIGHS_AGAINST" : "SUPPORTS"],
          ["Opt-out / exception", optOut.posture.replace(/_/g, " "), optOut.recordGrade.replace(/_/g, " "), optOut.posture === "GAP" ? "CONDITION" : optOut.posture === "PARTIAL" ? "WEIGHS_AGAINST" : "SUPPORTS"],
          ["Access and explanation", access.posture.replace(/_/g, " "), access.recordGrade.replace(/_/g, " "), access.posture === "GAP" ? "CONDITION" : access.posture === "PARTIAL" ? "WEIGHS_AGAINST" : "SUPPORTS"],
        ] : []),
        ...(vendor.identified ? [["Vendor dependency", vendor.posture.replace(/_/g, " "), vendor.recordGrade.replace(/_/g, " "), vendor.posture === "GAP" ? "CONDITION" : "SUPPORTS"]] : []),
      ],
    }},
    ...priorityMattersParagraphs(computed),
  ]);

  // ── 1. System and Decision Profile ──────────────────────────────────────
  const systemType = str((intake as any)?.system_type);
  const sysTypePhrase = systemType ? `, described by the Company as ${systemType}` : "";
  push("system_profile", "1. System and Decision Profile", [
    { kind: "skeleton", text: `The Company identifies the System as ${systemName || "(not provided)"}${sysTypePhrase} and describes it as follows: ${str((intake as any)?.system_description) || "(not provided)"}. The System is used in ${reader(domains)}.` },
    { kind: "skeleton", text: `The Company describes human review as: ${str((intake as any)?.human_review) || "(not answered)"}. That answer matters because ADMT status turns on whether the System replaces or substantially replaces human judgment.` },
    { kind: "skeleton", text: vendorLead(intake, vendor) },
  ]);

  // ── 2. Applicability ────────────────────────────────────────────────────
  push("applicability", "2. Applicability of the ADMT Requirements", [
    { kind: "lead", text: applicabilityDeterminationSentence(scope) },
    { kind: "skeleton", text: "The Company has identified the decision context and described the human role. So the important analysis is whether the decision is one the rules cover and whether the human involvement is enough to keep the System outside the ADMT definition." },
    { kind: "table", text: "", table: {
      key: "applicability:2", surface: "applicability_factors", title: "",
      columns: ["Factor", "Result on reported facts", "Decision effect", "Basis"],
      rows: [
        ["Covered significant decision", scope.significantDecisionLabel, scope.significantDecisionEffect, cite(scope.significantDecisionBasis || "—", scope.significantDecisionBasis)],
        ["Human involvement", scope.humanInvolvementLabel, scope.humanInvolvementEffect, cite(scope.humanInvolvementBasis || "—", scope.humanInvolvementBasis)],
        ["Advertising exclusion", scope.advertisingLabel, scope.advertisingEffect, cite(scope.advertisingBasis || "—", scope.advertisingBasis)],
        ["Role of ADMT output", scope.outputRoleLabel, scope.outputRoleEffect, "—"],
      ],
    }},
    { kind: "generated", text: composeApplicabilityAnalysis(scope, systemName || "the System") },
  ]);

  if (scope.scopeState === "OUT_OF_SCOPE") {
    return { _typed: "skeleton-document@admt-v1.2", spine_version: ADMT_V2_SPINE_VERSION, title: "CPPA ADMT COMPLIANCE AUDIT", subtitle: `Prepared for ${organizationName || "(organization not provided)"}`, sections };
  }

  // ── 3. Pre-use Notice Audit ──────────────────────────────────────────────
  const deliveryPhrase = str((intake as any)?.notice_delivery) || reader(Array.isArray((intake as any)?.notice_delivery) ? (intake as any).notice_delivery : []);
  push("notice", "3. Pre-use Notice Audit", [
    { kind: "lead", text: noticeDeterminationSentence(notice) },
    { kind: "skeleton", text: `The Company reports that it delivers the Pre-use Notice ${deliveryPhrase || "(not reported)"}. The important question is whether the required information is actually covered and, where text was supplied, whether the wording supports the Company's answer.` },
    { kind: "table", text: "", table: {
      key: "notice:2", surface: "notice_elements", title: "",
      columns: ["Notice element", "Result on reported facts", "Evidence state", "Decision effect"],
      rows: [
        factorRow("Specific purpose", notice.purpose).map((c, i) => i === 3 ? cite(c, elementBasis(notice.purpose)) : c),
        factorRow("Opt-out / exception description", notice.optoutDesc),
        factorRow("Access right description", notice.accessDesc),
        factorRow("Anti-retaliation", notice.antiRet),
        factorRow("How the ADMT works", notice.howWorks),
        factorRow("Alternative process", notice.altProcess),
      ],
    }},
    { kind: "generated", text: composeNoticeAnalysis(notice) },
  ]);

  // ── 4. Opt-Out and Exception Audit ──────────────────────────────────────
  const optOutParas: RenderedParagraph[] = [
    { kind: "lead", text: optOutDeterminationSentence(optOut) },
    { kind: "skeleton", text: optOutPathwaySentence(optOut) },
  ];
  if (optOut.path === "FULL_OPT_OUT") {
    optOutParas.push(
      { kind: "skeleton", text: "4.1 Full Opt-Out Pathway" },
      { kind: "table", text: "", table: {
        key: "optout:4.1", surface: "full_optout_factors", title: "",
        columns: ["Operational factor", "Result on reported facts", "Evidence state", "Decision effect"],
        rows: [
          factorRow("Designated methods", optOut.methods),
          factorRow("ADMT-specific route", optOut.cookie),
          factorRow("No account required", optOut.account),
          factorRow("15-business-day process", optOut.fifteenDay),
          factorRow("Confirmation mechanism", optOut.confirmation),
        ],
      }},
      { kind: "generated", text: composeFullOptOutAnalysis(optOut) },
    );
  } else if (optOut.path === "HUMAN_APPEAL_EXCEPTION") {
    optOutParas.push(
      { kind: "skeleton", text: "4.2 Human-Appeal Exception" },
      { kind: "table", text: "", table: {
        key: "optout:4.2", surface: "human_appeal_factors", title: "",
        columns: ["Exception factor", "Result on reported facts", "Evidence state", "Decision effect"],
        rows: [
          factorRow("Appeal process", optOut.appealProcess),
          factorRow("Reviewer training", optOut.appealTraining),
          factorRow("Authority to overturn", optOut.appealAuthority),
          factorRow("Steps to reviewer", optOut.appealSteps),
        ],
      }},
      { kind: "generated", text: composeHumanAppealAnalysis(optOut) },
    );
  } else if (optOut.path === "HIRING_ADMISSION_EXCEPTION" || optOut.path === "WORK_ALLOCATION_COMP_EXCEPTION") {
    const heading = optOut.path === "HIRING_ADMISSION_EXCEPTION" ? "Hiring / admission exception" : "Work-allocation / compensation exception";
    optOutParas.push(
      { kind: "skeleton", text: `4.3 ${heading}` },
      { kind: "table", text: "", table: {
        key: "optout:4.3", surface: "employment_exception_factors", title: "",
        columns: ["Exception factor", "Result on reported facts", "Evidence state", "Decision effect"],
        rows: [
          factorRow("Sole-use condition", optOut.exceptionSoleUse),
          factorRow("Non-discrimination testing", optOut.exceptionTesting),
          factorRow("Fairness documentation", optOut.exceptionFairnessDoc),
        ],
      }},
      { kind: "generated", text: composeEmploymentEducationExceptionAnalysis(optOut) },
    );
  }
  push("optout", "4. Opt-Out and Exception Audit", optOutParas);

  // ── 5. Access and Explanation Audit ─────────────────────────────────────
  push("access", "5. Access and Explanation Audit", [
    { kind: "lead", text: accessDeterminationSentence(access) },
    { kind: "skeleton", text: "The Company has described how it receives and verifies access requests and how quickly it responds. The audit also asks a separate practical question: can the Company actually produce the consumer-specific explanation the rules call for?" },
    { kind: "table", text: "", table: {
      key: "access:2", surface: "access_process_factors", title: "",
      columns: ["Process factor", "Result on reported facts", "Evidence state", "Decision effect"],
      rows: [factorRow("Response timeline", access.timeline)],
    }},
    { kind: "table", text: "", table: {
      key: "access:3", surface: "access_readiness", title: "Explanation Readiness",
      columns: ["Explanation element", "Result on reported facts", "Evidence state", "Decision effect"],
      rows: [
        factorRow("Specific purpose", access.readiness["b1_purpose_ready"]),
        factorRow("Logic / parameters", access.readiness["b2_logic_ready"]),
        factorRow("Output and use", access.readiness["b3_output_use_ready"]),
        factorRow("Outcome / future use", access.readiness["b3_outcome_ready"]),
        factorRow("Human role", access.readiness["b3_human_role_ready"]),
      ],
    }},
    { kind: "skeleton", text: `Withholding and Security: ${str((intake as any)?.access_trade_secret_policy) || "The Company has not described a trade-secret or security withholding policy."}` },
    { kind: "generated", text: composeAccessWithholdingAnalysis(access) },
  ]);

  // ── 6. Third-Party and Vendor Dependency ────────────────────────────────
  // ADMT v2 is an assessment, not a vendor audit: this section identifies
  // dependencies and explains why they matter. It escalates to a Condition
  // only in the one case the intake itself establishes the Company cannot
  // perform the duty independently (vendor-hosted System + a missing,
  // pathway-relevant control) — see VENDOR_MATERIALITY_MATRIX.
  if (vendor.identified) {
    push("vendor", "6. Third-Party and Vendor Dependency", [
      { kind: "skeleton", text: vendor.sectionLead },
      { kind: "skeleton", text: "The table below shows, for every vendor control this audit tracks, which opt-out or exception pathway it is relevant to — independent of which pathway the Company selected. This is a reference matrix, not a per-Company finding." },
      { kind: "table", text: "", table: { key: "vendor:0", surface: "vendor_materiality_matrix", ...vendorMaterialityMatrixTable() } },
      { kind: "skeleton", text: `On the pathway the Company selected (${pathwayLabel(optOut.path)}), the Company's reported vendor controls are:` },
      { kind: "table", text: "", table: {
        key: "vendor:1", surface: "vendor_controls", title: "",
        columns: ["Vendor control", "Result on reported facts", "Relevant to selected pathway", "Dependency status"],
        rows: [
          vendorRow("Audit / monitoring", vendor.controls.audit),
          vendorRow("Access-request assistance", vendor.controls.assist),
          vendorRow("Downstream opt-out", vendor.controls.optout),
          vendorRow("Appeal / human-review", vendor.controls.appeal),
          vendorRow("Incident notification", vendor.controls.incident),
        ],
      }},
      { kind: "generated", text: composeVendorDependencyAnalysis(vendor) },
    ]);
  }

  // ── 7. Governance, Record Sufficiency, and Related Risk-Assessment ─────
  push("governance", "7. Governance, Record Sufficiency, and Related Risk-Assessment Obligations", [
    { kind: "skeleton", text: `The overall record supporting this assessment is graded ${computed.overallRecordGrade.replace(/_/g, " ").toLowerCase()}.` },
    { kind: "table", text: "", table: {
      key: "governance:1", surface: "record_grades", title: "",
      columns: ["Area", "Record grade"],
      rows: [
        ["Applicability", scope.recordGrade.replace(/_/g, " ")],
        ["Pre-use Notice", notice.recordGrade.replace(/_/g, " ")],
        ["Opt-out / exception", optOut.recordGrade.replace(/_/g, " ")],
        ["Access", access.recordGrade.replace(/_/g, " ")],
        ...(vendor.identified ? [["Vendor dependency", vendor.recordGrade.replace(/_/g, " ")]] : []),
      ],
    }},
    { kind: "skeleton", text: cite(`Using ADMT for a covered significant decision may separately trigger the Article 10 risk-assessment requirement under § 7150(b)(3). Where that risk assessment applies, § 7155 requires review at least every three years and an update as soon as feasibly possible, but no later than 45 calendar days after a material change. A material change to the System or its use should also prompt the Company to rerun this ADMT Audit so the conclusions remain tied to the current facts.`, "11 CCR § 7150(b)(3)") },
  ]);

  // ── 8. Conditions, Required Follow-Up, and Recommendations ──────────────
  push("actions", "8. Conditions, Required Follow-Up, and Recommendations", buildActionParagraphs(computed));

  // ── 9. Conclusion ────────────────────────────────────────────────────────
  push("conclusion", "9. Conclusion", [
    { kind: "lead", text: overallConclusionSentence(computed) },
    { kind: "skeleton", text: "The easiest way to keep this report useful is to update the relevant answers when the System or compliance process changes and rerun the assessment. That shows which conclusions changed and why without rebuilding the analysis from the beginning." },
  ]);

  // ── Appendix C — Table of Authorities ───────────────────────────────────
  if (args.exhibit && args.exhibit.entries.length > 0) {
    push("table_of_authorities", "Appendix C — Table of Authorities", [
      { kind: "rule", text: renderToaLines(args.exhibit, fnIndex) },
    ]);
  }

  return {
    _typed: "skeleton-document@admt-v1.2",
    spine_version: ADMT_V2_SPINE_VERSION,
    title: "CPPA ADMT COMPLIANCE AUDIT",
    subtitle: `Prepared for ${organizationName || "(organization not provided)"}`,
    sections,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function elementBasis(_f: NoticeFactor): string { return _f.authority; }

function vendorRow(label: string, c: VendorControl): string[] {
  const dependencyStatus = c.relevance === "CONDITION"
    ? "Condition — vendor-hosted, Company has no independent capability"
    : "Informational — identify and track, not itself an Article 11 gap";
  return [label, c.label, c.pathwayRelevant ? "Yes" : "No", dependencyStatus];
}

const VENDOR_PATHWAY_ORDER: { path: PathState; label: string }[] = [
  { path: "FULL_OPT_OUT", label: "Full opt-out" },
  { path: "HUMAN_APPEAL_EXCEPTION", label: "Human-appeal exception" },
  { path: "HIRING_ADMISSION_EXCEPTION", label: "Hiring/admission exception" },
  { path: "WORK_ALLOCATION_COMP_EXCEPTION", label: "Work-allocation/compensation exception" },
];

function pathwayLabel(path: PathState): string {
  return VENDOR_PATHWAY_ORDER.find((p) => p.path === path)?.label ?? "Unresolved";
}

/**
 * The vendor-dependency matrix: which of the five tracked controls is
 * relevant to which pathway, independent of any single Company's answers.
 * Built directly from VENDOR_MATERIALITY_MATRIX — the same table the
 * deterministic engine evaluates against — so the printed matrix can never
 * drift from the logic that actually drives the findings above it.
 */
function vendorMaterialityMatrixTable(): { title: string; columns: string[]; rows: string[][] } {
  const controlOrder: (keyof typeof VENDOR_MATERIALITY_MATRIX)[] = ["optout", "assist", "appeal", "audit", "incident"];
  const columns = ["Vendor control", ...VENDOR_PATHWAY_ORDER.map((p) => p.label)];
  const rows = controlOrder.map((key) => {
    const m = VENDOR_MATERIALITY_MATRIX[key];
    return [
      m.label,
      ...VENDOR_PATHWAY_ORDER.map((p) => (m.pathwayRelevant(p.path, "IN_SCOPE") ? "Relevant" : "Not relevant")),
    ];
  });
  return { title: "Vendor-Dependency Matrix", columns, rows };
}

function vendorLead(intake: Record<string, unknown>, vendor: { identified: boolean }): string {
  const thirdParty = str((intake as any)?.third_party_admt);
  return vendor.identified
    ? `The Company identifies a third-party ADMT: ${thirdParty}.`
    : "The Company did not identify a third-party ADMT in the information supplied for this assessment.";
}

function scopeAreaEffect(scope: AdmtV2Computed["scope"]): string {
  if (scope.scopeState === "OUT_OF_SCOPE") return "SUPPORTS";
  if (scope.scopeState === "IN_SCOPE") return "CONDITION";
  return "NEUTRAL";
}

function renderToaLines(exhibit: AuthorityExhibit, fnIndex: FootnoteIndex | null): string {
  const groupLabel: Record<string, string> = {
    constitutional: "Constitutional Provisions", statute: "Statutes", regulation: "Regulations",
    administrative: "Administrative and Regulatory Materials", other: "Other Authorities",
  };
  const order = ["constitutional", "statute", "regulation", "administrative", "other"];
  const lines: string[] = [];
  for (const cls of order) {
    const rows = exhibit.entries.filter((e) => e.authority_class === cls);
    if (rows.length === 0) continue;
    lines.push(groupLabel[cls]);
    for (const r of rows) {
      const n = fnIndex?.numberOf(r.citation);
      const num = n ? `${n}. ` : "";
      const excerpt = r.excerpt ? `\n    "${r.excerpt.slice(0, 400)}${r.excerpt.length > 400 ? "…" : ""}"` : r.note ? `\n    (${r.note})` : "";
      lines.push(`    ${num}${r.citation}${r.as_cited ? ` (${r.as_cited})` : ""}${excerpt}`);
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Determination-lead sentence composers (one sentence, bound to the typed
// state — Part I's {D_..._DETERMINATION_SENTENCE} / {D_OVERALL_..._SENTENCE}
// slots).
// ---------------------------------------------------------------------------

function overallDeterminationSentence(c: AdmtV2Computed): string {
  const label = c.overallPostureLabel;
  if (c.scope.scopeState === "OUT_OF_SCOPE") return `On the Company's reported facts, the System is out of scope for the ADMT requirements addressed in this report.`;
  if (label === "Record conflict — resolve before a determination can be reached") return `The Company's answers on decision domain and advertising use conflict, so a determination cannot be reached until that conflict is resolved.`;
  if (label === "Unable to assess — scope cannot be determined on the current record") return `The Company has not supplied enough information to determine whether the System is within the ADMT rules for this decision.`;
  if (label === "Gaps identified") return `On the Company's reported facts, one or more ADMT requirements addressed in this report are not currently met.`;
  if (label === "Meets on reported facts") return `On the Company's reported facts, the ADMT requirements addressed in this report are met.`;
  return `On the Company's reported facts, the ADMT requirements addressed in this report are qualified — one or more items require follow-up before a firmer conclusion can be reached.`;
}

function applicabilityDeterminationSentence(scope: AdmtV2Computed["scope"]): string {
  if (scope.scopeState === "INCONSISTENT_RECORD") return "The Company's decision-domain and advertising answers conflict, so the applicability determination cannot be finalized on the current record.";
  if (scope.scopeState === "UNABLE_TO_ASSESS") return "The Company has not supplied enough information to determine whether the System is ADMT for this decision.";
  if (scope.scopeState === "OUT_OF_SCOPE") return "On the Company's reported facts, the System is outside the ADMT rules for this decision.";
  return "On the Company's reported facts, the System is ADMT for this decision and the requirements addressed below apply.";
}

function noticeDeterminationSentence(n: AdmtV2Computed["notice"]): string {
  if (n.posture === "MEETS_REPORTED") return "On the Company's reported facts, the Pre-use Notice duty is discharged.";
  if (n.posture === "GAP") return "On the Company's reported facts, the Pre-use Notice does not yet cover one or more required elements.";
  if (n.posture === "PARTIAL") return "On the Company's reported facts, the Pre-use Notice partially covers the required elements.";
  return "The Company has not supplied enough information to determine whether the Pre-use Notice meets the required elements.";
}

function optOutDeterminationSentence(o: AdmtV2Computed["optOut"]): string {
  if (o.path === "OTHER_UNRESOLVED") return "The Company's opt-out / exception selection does not resolve to a pathway this audit can evaluate.";
  if (o.posture === "MEETS_REPORTED") return "On the Company's reported facts, the opt-out or exception pathway the Company selected is supported.";
  if (o.posture === "GAP") return "On the Company's reported facts, the selected opt-out or exception pathway is not currently supported.";
  if (o.posture === "PARTIAL") return "On the Company's reported facts, the selected pathway is partially supported.";
  return "The Company has not supplied enough information to determine whether the selected pathway is supported.";
}

function optOutPathwaySentence(o: AdmtV2Computed["optOut"]): string {
  const map: Record<string, string> = {
    FULL_OPT_OUT: "The Company reports that it offers a full opt-out right rather than relying on a § 7221(b) exception.",
    HUMAN_APPEAL_EXCEPTION: "The Company reports that it relies on the human-appeal exception under § 7221(b)(1).",
    HIRING_ADMISSION_EXCEPTION: "The Company reports that it relies on the hiring/admission exception under § 7221(b)(2).",
    WORK_ALLOCATION_COMP_EXCEPTION: "The Company reports that it relies on the work-allocation/compensation exception under § 7221(b)(3).",
    OTHER_UNRESOLVED: "The Company's answer to the opt-out / exception question does not match one of the recognized pathways.",
  };
  return map[o.path] ?? "";
}

function accessDeterminationSentence(a: AdmtV2Computed["access"]): string {
  if (a.posture === "MEETS_REPORTED") return "On the Company's reported facts, the access and explanation duty is supported.";
  if (a.posture === "GAP") return "On the Company's reported facts, the access and explanation duty is not currently supported.";
  if (a.posture === "PARTIAL") return "On the Company's reported facts, the access and explanation duty is partially supported.";
  return "The Company has not supplied enough information to determine whether the access and explanation duty is supported.";
}

function overallConclusionSentence(c: AdmtV2Computed): string {
  return overallDeterminationSentence(c);
}

// ---------------------------------------------------------------------------
// Priority Matters (Executive Summary) + §8 action-list assembly
// ---------------------------------------------------------------------------

function priorityMattersParagraphs(c: AdmtV2Computed): RenderedParagraph[] {
  const top = [...c.allFindings].filter((f) => f.priority === 1).slice(0, 3);
  if (top.length === 0) {
    return [{ kind: "skeleton", text: "Priority Matters: no priority remediation item was generated from the supplied responses." }];
  }
  return [
    { kind: "skeleton", text: "Priority Matters" },
    ...top.map((f, i) => ({ kind: "generated", text: `${i + 1}. ${f.action_text} (${f.area} — ${f.criterion})` })),
  ];
}

function buildActionParagraphs(c: AdmtV2Computed): RenderedParagraph[] {
  const conditions = c.allFindings.filter((f) => f.priority === 1);
  const followups = c.allFindings.filter((f) => f.substantive_state === "INSUFFICIENT_RECORD" && f.priority !== 1);
  const recommendations = c.allFindings.filter((f) => f.priority !== 1 && f.substantive_state !== "INSUFFICIENT_RECORD");

  const paras: RenderedParagraph[] = [
    { kind: "skeleton", text: "The action list separates issues that affect the selected compliance pathway from missing information and non-blocking improvements. DECISION_EFFECT controls the category; status alone does not." },
  ];

  paras.push({ kind: "skeleton", text: "8.1 Conditions to Proceed" });
  if (conditions.length > 0) {
    paras.push({ kind: "table", text: "", table: {
      key: "actions:8.1", surface: "conditions", title: "",
      columns: ["ID", "Area", "Condition", "Why it matters", "Closure condition"],
      rows: conditions.map((f) => [f.finding_id, f.area, f.action_text, f.factual_basis, f.closure_condition]),
    }});
  }

  paras.push({ kind: "skeleton", text: "8.2 Required Assessment Follow-Up" });
  if (followups.length > 0) {
    paras.push({ kind: "table", text: "", table: {
      key: "actions:8.2", surface: "followups", title: "",
      columns: ["ID", "Area", "Missing or unresolved item", "Why it matters", "What resolves it"],
      rows: followups.map((f) => [f.finding_id, f.area, f.action_text, f.factual_basis, f.closure_condition]),
    }});
  }

  paras.push({ kind: "skeleton", text: "8.3 Recommendations" });
  if (recommendations.length > 0) {
    paras.push({ kind: "table", text: "", table: {
      key: "actions:8.3", surface: "recommendations", title: "",
      columns: ["ID", "Area", "Recommendation", "Reason"],
      rows: recommendations.map((f) => [f.finding_id, f.area, f.action_text, f.factual_basis]),
    }});
  }

  return paras;
}
