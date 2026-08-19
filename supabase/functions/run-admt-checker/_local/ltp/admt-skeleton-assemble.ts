// ITEM SO-2 WIRE-IN — CPPA ADMT: ASSEMBLY THROUGH THE BYTE-PINNED SKELETON.
//
// SO-2 step 3 (RENDERERS) requires the LIVE ADMT document to be assembled
// through `_shared/prose/plans/cppa-admt.spine.ts`. This module is that
// assembly. It is DETERMINISTIC: every [GENERATED] and [DETERMINATION LEAD]
// block is composed from the typed surfaces the ADMT pipeline has already
// written, and every {slot} is filled from the live intake per
// `cppa-admt.slotmap.ts`. No model call, no invented prose, no mutation of the
// typed surfaces.

import {
  ADMT_SKELETON_SECTIONS,
  ADMT_SKELETON_TITLE,
  ADMT_SKELETON_SUBTITLE,
  ADMT_SKELETON_VERSION,
  ADMT_V3_BANNED_REGISTER,
} from "../prose/plans/cppa-admt.spine.ts";
import {
  renderSkeletonDocument,
  renderTableOfAuthorities,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type SlotValues,
} from "../prose/skeleton-render.ts";
import { repairRegister } from "./risk-skeleton-assemble.ts";

export const ADMT_SKELETON_ASSEMBLER_STAMP = "admt-skeleton-assembler@so2-wire-in-2026-08-10";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : s((x as Bag)?.label ?? (x as Bag)?.text))).filter(Boolean) : s(v) ? [s(v)] : [];

function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

function isYes(v: unknown): boolean {
  return v === true || /^yes\b/i.test(s(v));
}

function gapList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return (v as unknown[])
    .map((g) => (typeof g === "string" ? g : s((g as Bag)?.gap ?? (g as Bag)?.finding ?? (g as Bag)?.description ?? (g as Bag)?.text)))
    .filter(Boolean);
}

// ── Slot values ─────────────────────────────────────────────────────────────

export function buildAdmtSlotValues(intake: Bag): SlotValues {
  const purposeText = s(intake.notice_purpose_text);
  const hasPurpose = isYes(intake.notice_has_specific_purpose) && !!purposeText;
  const optOutMethods = asProse(arr(intake.opt_out_methods));
  const confirmation = s(intake.opt_out_confirmation_mechanism);
  const exception = s(intake.opt_out_exception);
  const appeal = s(intake.opt_out_appeal_process);
  const hasException = !!exception && !/^none\b/i.test(exception) && !/^no\b/i.test(exception);

  return {
    organizationName: s(intake.organization_name) || "the company",
    systemName: s(intake.system_name),
    SYSTEM_TYPE_PHRASE: asProse(arr(intake.system_type)).toLowerCase(),
    systemDescription: s(intake.system_description),
    decisionDomains: asProse(arr(intake.decision_domains)),

    NOTICE_DELIVERY_PHRASE: asProse(arr(intake.notice_delivery)).toLowerCase(),
    NOTICE_PURPOSE_SENTENCE: hasPurpose
      ? `The notice states the specific purpose in these terms: ${purposeText}`
      : "The notice does not yet state a specific purpose",

    OPT_OUT_SENTENCE: optOutMethods
      ? `The company has indicated that consumers may opt out ${optOutMethods}${confirmation ? `, and that it confirms the opt-out by ${confirmation}` : ""}`
      : "The company has not recorded an opt-out mechanism",
    EXCEPTION_SENTENCE: hasException
      ? `The company claims the ${exception} exception; where that exception depends on a human appeal, the company describes its appeal process as ${appeal || "not yet recorded"}`
      : null,

    accessSubmissionMethods: asProse(arr(intake.access_submission_methods)),
    accessVerificationProcess: s(intake.access_verification_process),
    accessResponseTimeline: s(intake.access_response_timeline),
    accessLogicDisclosure: s(intake.access_logic_disclosure),
    accessOutcomeDisclosure: s(intake.access_outcome_disclosure),
  };
}

// ── Composed blocks ─────────────────────────────────────────────────────────

function composeExecutive(report: Bag): { lead: string; body: string } {
  const label = s(report.overall_status_label) || s(report.overall_status);
  const lead = label
    ? `On the company's answers, the assessment returns the following overall determination: ${label.toLowerCase()}.`
    : "On the company's answers, the overall determination could not be established.";

  const notice = gapList(report.notice_gaps).length;
  const optOut = gapList(report.opt_out_gaps).length;
  const access = gapList(report.access_gaps).length;
  const phrase = (n: number, family: string) =>
    n === 0
      ? `On the ${family} duties, the company's answers disclose nothing outstanding.`
      : `On the ${family} duties, ${n === 1 ? "one matter is" : `${n} matters are`} outstanding on the company's answers.`;
  return {
    lead,
    body: repairRegister([phrase(notice, "pre-use notice"), phrase(optOut, "opt-out and appeal"), phrase(access, "access")].join(" ")),
  };
}

function composeApplicability(report: Bag): { lead: string; body: string } {
  const av = (report.applicability_verdict ?? {}) as Bag;
  const sa = (report.scope_analysis ?? {}) as Bag;
  const lead = s(av.reason)
    ? repairRegister(`The regulation ${s(av.label) === "in_scope" ? "applies" : "does not apply"} to this system: ${s(av.reason)}`)
    : "Whether the regulation applies cannot be determined on the company's answers.";
  const body = repairRegister(
    [s(sa.summary), s(sa.is_admt_reasoning), s(sa.significant_decision_reasoning)].filter(Boolean).join(" "),
  );
  return { lead, body };
}

function composeNotice(report: Bag): { lead: string; body: string } {
  const gaps = gapList(report.notice_gaps);
  const lead = gaps.length === 0
    ? "On the company's answers, the pre-use notice duty is discharged."
    : `On the company's answers, the pre-use notice duty is not yet discharged in ${gaps.length === 1 ? "one respect" : `${gaps.length} respects`}.`;
  const findings = Array.isArray(report.notice_element_findings)
    ? (report.notice_element_findings as Bag[])
        .map((f) => [s(f.element), s(f.finding) || s(f.status), s(f.citation)].filter(Boolean).join(" — "))
        .filter(Boolean)
    : [];
  const body = repairRegister([...findings, ...gaps].join(" "));
  return { lead, body };
}

function composeOptOut(report: Bag): { lead: string; body: string } {
  const gaps = gapList(report.opt_out_gaps);
  const sa = (report.scope_analysis ?? {}) as Bag;
  const lead = gaps.length === 0
    ? "On the company's answers, the opt-out and appeal posture meets what the regulation requires."
    : `On the company's answers, the opt-out and appeal posture leaves ${gaps.length === 1 ? "one matter" : `${gaps.length} matters`} outstanding.`;
  const body = repairRegister([...gaps, s(sa.exception_reasoning)].filter(Boolean).join(" "));
  return { lead, body };
}

function composeAccess(report: Bag): { lead: string; body: string } {
  const gaps = gapList(report.access_gaps);
  const af = (report.adequacy_finding ?? {}) as Bag;
  const logic = (af.logic_disclosure ?? {}) as Bag;
  const lead = gaps.length === 0
    ? "On the company's answers, access responses deliver what the regulation requires."
    : `On the company's answers, access responses do not yet deliver what the regulation requires in ${gaps.length === 1 ? "one respect" : `${gaps.length} respects`}.`;
  const findings = Array.isArray(report.access_readiness_findings)
    ? (report.access_readiness_findings as Bag[])
        .map((f) => [s(f.element), s(f.finding) || s(f.status), s(f.citation)].filter(Boolean).join(" — "))
        .filter(Boolean)
    : [];
  const body = repairRegister([...findings, ...gaps, s(logic.reason)].filter(Boolean).join(" "));
  return { lead, body };
}

function composeFindings(report: Bag): { lead: string; body: string } {
  const label = s(report.overall_status_label) || s(report.overall_status);
  const actions = Array.isArray(report.priority_actions) ? (report.priority_actions as Bag[]) : [];
  const lead = label
    ? `The overall determination on the company's answers is: ${label.toLowerCase()}.`
    : "The overall determination could not be established on the company's answers.";
  const body = actions
    .map((a, i) => {
      const bits = [
        `${i + 1}. ${repairRegister(s(a.action))}`,
        s(a.citation) ? `Citation: ${s(a.citation)}.` : "",
        s(a.owner_role) ? `Responsible: ${s(a.owner_role)}.` : "",
        s(a.deadline) ? `Timeframe: ${s(a.deadline)}.` : "",
        s(a.severity) ? `Severity: ${s(a.severity).toLowerCase()}.` : "",
      ].filter(Boolean);
      return bits.join(" ");
    })
    .join("\n\n");
  return { lead, body };
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface AdmtSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
}

export function assembleAdmtSkeletonDocument(report: Bag, intake: Bag): AdmtSkeletonResult {
  const values = buildAdmtSlotValues(intake);

  const exec = composeExecutive(report);
  const applicability = composeApplicability(report);
  const notice = composeNotice(report);
  const optOut = composeOptOut(report);
  const access = composeAccess(report);
  const findings = composeFindings(report);

  const composed: ComposedBlocks = {
    "executive_summary:0": exec.lead,
    "executive_summary:2": exec.body,

    "applicability:0": applicability.lead,
    "applicability:1": applicability.body,

    "pre_use_notice:0": notice.lead,
    "pre_use_notice:2": notice.body,

    "opt_out_appeal:0": optOut.lead,
    "opt_out_appeal:2": optOut.body,

    "access_explanation:0": access.lead,
    "access_explanation:2": access.body,

    "findings_actions:0": findings.lead,
    "findings_actions:1": findings.body,
  };

  const draft = renderSkeletonDocument({
    sections: ADMT_SKELETON_SECTIONS,
    title: ADMT_SKELETON_TITLE,
    subtitle: ADMT_SKELETON_SUBTITLE,
    spineVersion: ADMT_SKELETON_VERSION,
    values,
    composed,
  });

  const exhibit = (report.authority_exhibit ?? {}) as Bag;
  const ledger = Array.isArray(exhibit.entries)
    ? (exhibit.entries as Bag[]).map((e) => s(e.citation)).filter(Boolean)
    : [];
  const toa = renderTableOfAuthorities(ledger, skeletonDocumentToText(draft));

  const document = renderSkeletonDocument({
    sections: ADMT_SKELETON_SECTIONS,
    title: ADMT_SKELETON_TITLE,
    subtitle: ADMT_SKELETON_SUBTITLE,
    spineVersion: ADMT_SKELETON_VERSION,
    values,
    composed: { ...composed, "table_of_authorities:0": toa },
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = ADMT_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, ADMT_SKELETON_SECTIONS),
    register_findings,
  };
}
