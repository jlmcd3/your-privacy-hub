// ITEM SO-1 WIRE-IN — CPPA RISK: ASSEMBLY THROUGH THE BYTE-PINNED SKELETON.
//
// SO-1 step 3 (RENDERERS) requires the LIVE document to be assembled through
// `plans/cppa-risk.spine.ts`, not merely for the spine to exist. This module is
// that assembly. It is DETERMINISTIC: it invents no prose. Every [GENERATED],
// [DETERMINATION LEAD] and [CONDITIONAL] block is composed from the typed
// surfaces items 420–427 already put on the report, and every {slot} is filled
// from the live intake per `cppa-risk.slotmap.ts`.
//
// The result is written to `report_data.skeleton_document` and is the shipped
// narrative document; the typed card surfaces remain as the structured data the
// skeleton's sections draw on.
//
// ATTRIBUTION RULE: the company's facts are attributed to the company. The v3
// banned register ("the record shows" family, "on this record") is rewritten
// deterministically on the way in — the underlying typed surfaces are NOT
// mutated.

import {
  SKELETON_SECTIONS,
  RISK_SKELETON_TITLE,
  RISK_SKELETON_SUBTITLE,
  RISK_SKELETON_VERSION,
  RISK_V3_BANNED_REGISTER,
} from "../prose/plans/cppa-risk.spine.ts";
import {
  renderSkeletonDocument,
  renderTableOfAuthorities,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type SlotValues,
} from "../prose/skeleton-render.ts";

export const RISK_SKELETON_ASSEMBLER_STAMP = "risk-skeleton-assembler@so1-wire-in-2026-08-10";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : s(v) ? [s(v)] : [];

/** "a, b and c" */
function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** Deterministic register repair — attribution voice is law (v3 bans). */
export function repairRegister(text: string): string {
  let out = text;
  out = out.replace(/\bOn this record\b/g, "On the record as documented");
  out = out.replace(/\bon this record\b/g, "on the record as documented");
  out = out.replace(/\bThe record shows\b/g, "The company has indicated");
  out = out.replace(/\bthe record shows\b/g, "the company has indicated");
  out = out.replace(/\b[Tt]he record (reflects|indicates|demonstrates|establishes)\b/g,
    (_m, _v) => "the company has indicated");
  out = out.replace(/\bAs the record makes clear,?\s*/g, "");
  return out.replace(/\s{2,}/g, " ").trim();
}

function firstSentence(text: string): string {
  const t = text.trim();
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (m ? m[0] : t).trim();
}

function afterFirstSentence(text: string): string {
  const first = firstSentence(text);
  return text.trim().slice(first.length).trim();
}

function isYes(v: unknown): boolean {
  return /^yes\b/i.test(s(v));
}

// ── Slot values ─────────────────────────────────────────────────────────────

export function buildRiskSlotValues(intake: Bag): SlotValues {
  const retentionPeriod = s(intake.i2_retention_period);
  const retentionCriteria = s(intake.i2_retention_criteria);
  const retentionDetail = s(intake.i2_retention_detail);
  const external = arr(intake.i7_external_consultees);
  const providers = s(intake.a8_information_providers);
  const otherStake = s(intake.a4_benefit_other_stakeholders);
  const otherStakeFact = s(intake.a4_benefit_other_stakeholders_fact);
  const pub = s(intake.a4_benefit_public);
  const pubFact = s(intake.a4_benefit_public_fact);
  const approver = s(intake.a9_approver_name);
  const approverPos = s(intake.a9_approver_position);
  const approvalDate = s(intake.a9_approval_date);

  const retentionClause = retentionPeriod
    ? `it retains the information for ${retentionPeriod}`
    : retentionCriteria
    ? `retention is governed by ${retentionCriteria}`
    : null;

  return {
    entityName: s(intake.entity_name) || "the company",

    primaryActivityName: s(intake.primary_activity_name),
    primaryActivityPurpose: s(intake.primary_activity_purpose),
    hasSecondaryUses: s(intake.has_secondary_uses),

    i1bMinPi: s(intake.i1b_min_pi),
    i4bSources: s(intake.i4b_sources),
    i4Disclosures: asProse(arr(intake.i4_disclosure_mechanisms)),
    i3CaConsumerBand: s(intake.i3_ca_consumer_band).toLowerCase(),
    RETENTION_CLAUSE: retentionClause,
    RETENTION_DETAIL_SENTENCE: retentionDetail
      ? `The company has further described its retention practice as follows: ${retentionDetail}`
      : null,

    q18: s(intake.q18_admt_use),
    i5AdmtLogic: s(intake.i5_admt_logic),
    i5AdmtHumanReview: s(intake.i5_admt_human_review),
    i5AdmtFairnessTesting: s(intake.i5_admt_fairness_testing),
    i5AdmtTrainingSource: s(intake.i5_admt_training_source),

    a4BenefitBusiness: s(intake.a4_benefit_business),
    a4BenefitBusinessFact: s(intake.a4_benefit_business_fact) ||
      "no supporting fact the company has supplied",
    a4BenefitConsumer: s(intake.a4_benefit_consumer),
    a4BenefitConsumerFact: s(intake.a4_benefit_consumer_fact) ||
      "no supporting fact the company has supplied",
    OTHER_STAKEHOLDER_SENTENCE: otherStake
      ? `The company has identified the benefit to other stakeholders as ${otherStake}, supported by ${otherStakeFact || "no supporting fact the company has supplied"}`
      : "The company has not identified a benefit to other stakeholders",
    PUBLIC_SENTENCE: pub
      ? `The company has identified the benefit to the public as ${pub}, supported by ${pubFact || "no supporting fact the company has supplied"}`
      : "The company has not identified a benefit to the public",

    i7InternalContributors: s(intake.i7_internal_contributors),
    EXTERNAL_CLAUSE: external.length ? `, together with ${asProse(external)}` : "",
    PROVIDERS_SENTENCE: providers
      ? `The company has identified ${providers} as the source of the information relied on`
      : null,
    i8ExecName: s(intake.i8_certifying_exec_name),
    i8ExecTitle: s(intake.i8_certifying_exec_title),
    APPROVAL_SENTENCE: approver
      ? `The assessment was approved by ${approver}${approverPos ? `, ${approverPos}` : ""}${approvalDate ? `, on ${approvalDate}` : ""}`
      : null,

    i9HasDpia: s(intake.i9_has_existing_dpia),
    i9DpiaSummary: s(intake.i9_existing_dpia_summary),
  };
}

// ── Composed blocks (one entry per non-fixed block, keyed sectionId:index) ──

function activityRecord(report: Bag): Bag {
  const list = report.risk_assessment_by_activity;
  if (Array.isArray(list) && list.length > 0 && typeof list[0] === "object") return list[0] as Bag;
  if (list && typeof list === "object") return list as Bag;
  return {};
}

function composeExecutive(report: Bag): { lead: string; body: string } {
  const exec = s(report.executive_summary);
  if (!exec) return { lead: "", body: "" };
  return { lead: repairRegister(firstSentence(exec)), body: repairRegister(afterFirstSentence(exec)) };
}

function composeApplicability(report: Bag): { lead: string; body: string } {
  const scope = arr((report.scope_and_triggers as Bag)?.narrative ?? report.scope_and_triggers);
  const engaged = scope.filter((x) => x.startsWith("Engaged —"));
  const notEngaged = scope.filter((x) => x.startsWith("Not engaged —"));
  const analysis = scope.filter((x) => !x.startsWith("Engaged —") && !x.startsWith("Not engaged —"));

  const lead = engaged.length
    ? `On the company's answers, ${engaged.length === 1 ? "one trigger under Section 7150(b) is engaged" : `${engaged.length} triggers under Section 7150(b) are engaged`}: ${asProse(engaged.map((e) => e.replace(/^Engaged — /, "").replace(/:.*$/, "")))}.`
    : "On the company's answers, no trigger under Section 7150(b) is engaged.";

  const body = [...analysis, ...engaged, ...notEngaged].map(repairRegister).join(" ");
  return { lead, body };
}

function composePersonalInformation(intake: Bag): string {
  const band = s(intake.i3_ca_consumer_band);
  const cats = s(intake.i1b_min_pi);
  if (!cats) return "";
  return repairRegister(
    `The information at issue is the personal information ${s(intake.entity_name) || "the company"} has identified as necessary to the activity${band ? `, affecting approximately ${band.toLowerCase()} California consumers` : ""}, disclosed to the recipients the company has named.`,
  );
}

function composeNecessity(report: Bag, intake: Bag): { lead: string; body: string } {
  const rs = (report.record_sufficiency ?? {}) as Bag;
  const complete = rs.complete === true;
  const lead = complete
    ? "On the company's answers, the processing is confined to the categories the company has identified as necessary to the purpose it has stated."
    : "On the company's answers, whether the processing is confined to what the stated purpose requires cannot be determined on the elements the company has left unanswered.";

  const elements = Array.isArray(rs.elements) ? (rs.elements as Bag[]) : [];
  const unsupported = elements.filter((e) => !/present in the record/i.test(s(e.status)));
  const purpose = s(intake.primary_activity_purpose);
  const parts: string[] = [];
  if (purpose) {
    parts.push(`The company has articulated the need for the information as ${purpose}, and each category it has identified is considered against that need.`);
  }
  if (unsupported.length) {
    parts.push(
      `The following elements are not supported on the company's submission and are identified as unsupported rather than assumed: ${asProse(unsupported.map((e) => `${s(e.element)} (${s(e.pinpoint)})`))}.`,
    );
  } else if (elements.length) {
    parts.push("Every element the regulation requires is supported by an answer the company has given; none is assumed.");
  }
  return { lead, body: repairRegister(parts.join(" ")) };
}

function composeImpacts(report: Bag): { lead: string; body: string; admt: string } {
  const act = activityRecord(report);
  const effects = Array.isArray(act.adverse_effects) ? (act.adverse_effects as Bag[]) : [];
  const gaps = s(act.safeguard_gaps);
  const safeguards = s(act.current_safeguards);

  const rank = (e: Bag) => {
    const sev = ["Minimal", "Moderate", "Significant", "Severe"].indexOf(s(e.severity));
    const lik = ["Unlikely", "Possible", "Likely", "Highly likely"].indexOf(s(e.likelihood));
    return sev * 10 + lik;
  };
  const worst = [...effects].sort((a, b) => rank(b) - rank(a))[0];
  const noGap = /names no safeguard that is planned-only or absent/i.test(gaps);

  const lead = worst
    ? `The most significant realistic impact the company has identified is ${s(worst.harm_type).toLowerCase()} — ${s(worst.severity).toLowerCase()} in severity and ${s(worst.likelihood).toLowerCase()} in likelihood — and the safeguards the company has recorded ${noGap ? "address it adequately" : "do not yet fully address it"}.`
    : "The company has identified no negative impact for this activity.";

  const parts: string[] = [];
  for (const e of effects) {
    parts.push(
      `The company has identified ${s(e.harm_type).toLowerCase()} as a potential negative impact, assessed as ${s(e.likelihood).toLowerCase()} in likelihood and ${s(e.severity).toLowerCase()} in severity. ${s(e.description)}`.trim(),
    );
  }
  if (safeguards) parts.push(`Against these impacts the company has recorded the following safeguards: ${safeguards}`);
  if (gaps) parts.push(gaps);

  const admtLogic = s((report as Bag).admt_note);
  return { lead, body: repairRegister(parts.join(" ")), admt: admtLogic };
}

function composeWeighing(report: Bag): { lead: string; body: string; exceptions: string } {
  const act = activityRecord(report);
  const conclusion = s(act.benefits_outweigh_risks_conclusion);
  const rationale = s(act.benefits_outweigh_risks_rationale);
  const lead = conclusion
    ? repairRegister(firstSentence(conclusion))
    : "The weighing that Section 7152(a) and Section 7154(a) require cannot be completed on the elements the company has left unanswered.";
  const body = repairRegister([rationale, conclusion && afterFirstSentence(conclusion)].filter(Boolean).join(" "));

  const summary = (report.assessment_summary ?? {}) as Bag;
  const claimed = arr(summary.exceptions_claimed);
  const status = s(summary.exceptions_status);
  const exceptions = claimed.length
    ? `The company has claimed the following exceptions: ${asProse(claimed)}.`
    : /none/i.test(status)
    ? "The company has stated that it claims no exception under Section 7152."
    : "";

  return { lead, body, exceptions };
}

function composeActions(report: Bag): { lead: string; body: string } {
  const actions = Array.isArray(report.priority_actions) ? (report.priority_actions as Bag[]) : [];
  if (actions.length === 0) {
    return { lead: "The analysis identifies no action outstanding for the company to take.", body: "" };
  }
  const lead = `The analysis identifies ${actions.length === 1 ? "one action" : `${actions.length} actions`} for the company to take, ordered below by severity.`;
  const body = actions
    .map((a, i) => {
      const bits = [
        `${i + 1}. ${repairRegister(s(a.action))}`,
        s(a.statutory_basis) ? `Citation: ${s(a.statutory_basis)}.` : "",
        s(a.reserved_to) || s(a.owner) ? `Responsible: ${s(a.reserved_to) || s(a.owner)}.` : "",
        s(a.deadline) ? `Timeframe: ${s(a.deadline)}${s(a.deadline_basis) ? ` (${s(a.deadline_basis)})` : ""}.` : "",
      ].filter(Boolean);
      return bits.join(" ");
    })
    .join("\n\n");
  return { lead, body };
}

function composeSecondaryUses(intake: Bag): string {
  if (!isYes(intake.has_secondary_uses)) return "";
  const uses = s(intake.secondary_uses_detail) || s(intake.secondary_uses) || s(intake.has_secondary_uses_detail);
  if (!uses) return "";
  return `The company has further indicated that the same information serves additional purposes. ${uses}`;
}

function composeAdmtConditional(intake: Bag): string {
  if (!isYes(intake.q18_admt_use)) return "";
  const bits: string[] = [
    "Because automated decisionmaking technology participates in these decisions, additional analysis is required.",
  ];
  const add = (label: string, v: string, absent: string) =>
    bits.push(v ? `The company has described ${label} as follows: ${v}` : absent);
  add("the system's logic", s(intake.i5_admt_logic), "The company has not answered how the system's logic operates; that element is unanswered rather than assumed.");
  add("the human review applied", s(intake.i5_admt_human_review), "The company has not answered what human review applies; that element is unanswered.");
  add("its fairness testing", s(intake.i5_admt_fairness_testing), "The company has not answered what fairness testing is performed; that element is unanswered.");
  add("the provenance of the training data", s(intake.i5_admt_training_source), "The company has not answered where the training data originates; that element is unanswered.");
  return bits.join(" ");
}

function composeDpiaConditional(intake: Bag): string {
  if (!isYes(intake.i9_has_existing_dpia)) return "";
  const summary = s(intake.i9_existing_dpia_summary);
  if (!summary) return "";
  return `A data protection impact assessment covering this activity has been completed, and the company has provided its summary: ${summary}.`;
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface RiskSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
}

export function assembleRiskSkeletonDocument(report: Bag, intake: Bag): RiskSkeletonResult {
  const values = buildRiskSlotValues(intake);

  const exec = composeExecutive(report);
  const applicability = composeApplicability(report);
  const necessity = composeNecessity(report, intake);
  const impacts = composeImpacts(report);
  const weighing = composeWeighing(report);
  const actions = composeActions(report);

  // Keys are `${sectionId}:${blockIndex}` against SKELETON_SECTIONS.
  const composed: ComposedBlocks = {
    "executive_summary:0": exec.lead,
    "executive_summary:2": exec.body,

    "activity_under_assessment:1": composeSecondaryUses(intake),

    "applicability:0": applicability.lead,
    "applicability:2": applicability.body,

    "personal_information:0": composePersonalInformation(intake),

    "necessity_minimisation:0": necessity.lead,
    "necessity_minimisation:2": necessity.body,

    "impacts_safeguards:0": impacts.lead,
    "impacts_safeguards:2": impacts.body,
    "impacts_safeguards:3": composeAdmtConditional(intake),

    "benefits_weighing:0": weighing.lead,
    "benefits_weighing:2": weighing.body,
    "benefits_weighing:3": weighing.exceptions,

    "recommended_actions:0": actions.lead,
    "recommended_actions:2": actions.body,

    "accountability_certification:1": composeDpiaConditional(intake),
  };

  // First pass without the Table of Authorities, so the iff-cited test runs
  // against the body the reader actually gets.
  const draft = renderSkeletonDocument({
    sections: SKELETON_SECTIONS,
    title: RISK_SKELETON_TITLE,
    subtitle: RISK_SKELETON_SUBTITLE,
    spineVersion: RISK_SKELETON_VERSION,
    values,
    composed,
  });

  const ledger = Array.isArray(report.citation_ledger)
    ? (report.citation_ledger as Bag[]).map((c) => s(c.pinpoint)).filter(Boolean)
    : [];
  const toa = renderTableOfAuthorities(ledger, skeletonDocumentToText(draft));

  const document = renderSkeletonDocument({
    sections: SKELETON_SECTIONS,
    title: RISK_SKELETON_TITLE,
    subtitle: RISK_SKELETON_SUBTITLE,
    spineVersion: RISK_SKELETON_VERSION,
    values,
    composed: { ...composed, "table_of_authorities:0": toa },
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = RISK_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, SKELETON_SECTIONS),
    register_findings,
  };
}
