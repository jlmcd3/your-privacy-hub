// ITEM SO-11 WIRE-IN — LEGITIMATE INTERESTS ASSESSMENT: ASSEMBLY THROUGH THE
// BYTE-PINNED SKELETON.
//
// This module assembles the document the CUSTOMER actually receives. The PDF
// renderer (`generate-report-pdf`, li_assessment branch) and the result page
// (`src/pages/LIAssessmentResult.tsx`) both read
// `li_assessments.report_data.skeleton_document`, which is what this file
// produces.
//
// THE DETERMINISTIC PRODUCT. There is no model call anywhere in this file.
// Every [DETERMINATION LEAD], [GENERATED] and [CONDITIONAL] block is composed
// from the ~20 TYPED ANALYTIC OBJECTS the LIA pipeline already persists —
// `lia_determination`, `three_part_test.{purpose,necessity,balancing}_test`,
// `interest_legitimacy`, `alternatives_considered`, `reasonable_expectations`,
// `relationship_with_individual`, `potential_harms`, `scale_frequency_duration`,
// `opt_out_feasibility`, `benefit_and_beneficiary`, `child_factor`,
// `public_authority_exclusion`, `automated_decision_analysis`,
// `attestation_block`, `authority_exhibit`, `information_needed`,
// `documentation_recommendations`, `open_items`, `advisory_notes` and
// `classification`. THE SKELETON CONSUMES THEM; IT DOES NOT FLATTEN THEM, and
// this file never mutates one.
//
// COHERENCE LAW: a lead may not disagree with the typed determination it is
// bound to. All FIVE leads are computed FROM `lia_determination.outcome` and
// the per-test verdicts rather than asserted beside them, and `lead_coherence`
// re-checks the rendered leads against those typed values; a disagreement is
// returned as a finding, never silently shipped.
//
// SO-3 DEFECT CLASSES GUARDED HERE:
//   1. proper nouns (the organisation name, the subject anchor, DPO and
//      approver names, free-text "Other" values) are never case-folded —
//      `lowerEnumLabel` runs on CURATED ENUM LABELS ONLY;
//   2. sentence truncation is abbreviation-aware (`firstSentence`), so
//      "Art. 6(1)(f)", "Recital 38" and "EDPB Guidelines 1/2024" survive.

import {
  LIA_PROTECTED_FIXED_PROSE,
  LIA_SKELETON_PINPOINTS,
  LIA_SKELETON_SECTIONS,
  LIA_SKELETON_SECTIONS_V2,
  LIA_SKELETON_SUBTITLE,
  LIA_SKELETON_TITLE,
  LIA_SKELETON_VERSION,
  LIA_SKELETON_VERSION_V2,
  LIA_V3_BANNED_REGISTER,
} from "../prose/plans/lia.spine.ts";
import { buildLiaPersuasiveAuthority } from "./lia-persuasive-authority.ts";
import {
  LIA_CONDITIONAL_TRIGGERS,
  LIA_DATA_CATEGORY_LABELS,
  LIA_EXPECTATION_PHRASES,
  LIA_HARM_SEVERITY_LABELS,
  LIA_INTEREST_TYPE_LABELS,
  LIA_RELATIONSHIP_LABELS,
} from "../prose/plans/lia.slotmap.ts";
import {
  renderSkeletonDocument,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type ConformanceFinding,
  type RenderedSkeletonDocument,
  type SlotValues,
} from "../../../_shared/prose/skeleton-render.ts";
import { repairRegister } from "../../../_shared/ltp/risk-skeleton-assemble.ts";
import { firstSentence } from "../../../_shared/ltp/dpia-skeleton-assemble.ts";
import { naturalCitationCompare } from "../../../_shared/ltp/citation-order.ts";
// DOC 73 §4 (R2/R5, 2026-08-26) — the precedent-class posture finding.
// LIA_PRECEDENT_CLASS_RATIFIED gates whether it reaches the document at
// all; see precedent-classes.ts's own header for the ratification law.
import { LIA_PRECEDENT_CLASS_RATIFIED } from "./lia-deliverables/precedent-classes.ts";

export const LIA_SKELETON_ASSEMBLER_STAMP =
  "lia-skeleton-assembler@so11-wire-in-2026-08-10";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const bag = (v: unknown): Bag => (v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {});

function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => s(x)).filter(Boolean);
  return s(v) ? [s(v)] : [];
}

function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

const noStop = (t: string): string => t.replace(/\s*\.\s*$/, "");
const stop = (t: string): string => (t ? (/[.!?]$/.test(t) ? t : `${t}.`) : "");
const isYes = (v: unknown): boolean => {
  const t = s(v).toLowerCase();
  return v === true || t === "yes" || t === "true";
};

/** SO-3 DEFECT CLASS 1 — curated enum labels only. Never a proper noun. */
function lowerEnumLabel(v: string): string {
  if (!v) return v;
  if (/^[A-Z]{2,}/.test(v)) return v; // GDPR, DPO, UK …
  return v.charAt(0).toLowerCase() + v.slice(1);
}

/** "Other" free text is carried VERBATIM; the literal word "Other" never prints. */
function labelSet(
  values: readonly string[],
  map: Readonly<Record<string, string>>,
  otherText: string,
): string[] {
  const out: string[] = [];
  for (const v of values) {
    if (/^other$/i.test(v)) {
      if (otherText) out.push(otherText);
      continue;
    }
    const mapped = map[v];
    out.push(mapped ? mapped : lowerEnumLabel(v));
  }
  return out.filter(Boolean);
}

// ── Slot values ─────────────────────────────────────────────────────────────

export function buildLiaSlotValues(record: Bag): SlotValues {
  const purpose = bag(record.purpose_details);
  const necessity = bag(record.necessity_details);
  const balancing = bag(record.balancing_details);
  const attestation = bag(record.attestation);

  const relationshipRaw = s(balancing.relationship_category) || s(record.relationship_type);
  const relationshipPhrase = relationshipRaw
    ? (LIA_RELATIONSHIP_LABELS[relationshipRaw] || lowerEnumLabel(relationshipRaw))
    : "";

  const categories = labelSet(
    strList(record.data_categories),
    LIA_DATA_CATEGORY_LABELS,
    s(balancing.additional_context),
  );

  const interestTypeRaw = s(purpose.interest_type);
  const interestTypePhrase = /^other$/i.test(interestTypeRaw)
    ? s(purpose.interest_type_other)
    : (LIA_INTEREST_TYPE_LABELS[interestTypeRaw] || (interestTypeRaw ? lowerEnumLabel(interestTypeRaw) : ""));

  const holderRaw = s(purpose.interest_holder);
  const holderPhrase = /^other$/i.test(holderRaw)
    ? (s(purpose.interest_holder_other) ? `on behalf of ${s(purpose.interest_holder_other)}` : "")
    : /third/i.test(holderRaw)
    ? "on behalf of a third party"
    : holderRaw
    ? "on the company's own behalf"
    : "";

  const expectationPhrase = LIA_EXPECTATION_PHRASES[s(balancing.reasonable_expectation)] ?? "";

  const harmLabel = LIA_HARM_SEVERITY_LABELS[s(balancing.potential_harm)] ??
    (s(balancing.potential_harm) ? lowerEnumLabel(s(balancing.potential_harm)) : "");

  const safeguards = labelSet(
    strList(balancing.safeguards),
    {},
    s(balancing.safeguards_other),
  );

  const mitigations = s(balancing.additional_mitigations);

  const vulnerable = labelSet(
    strList(balancing.vulnerable_subjects),
    {},
    s(balancing.vulnerable_subjects_other),
  );

  const orNull = (t: string): string | null => (t ? t : null);
  const orBlank = (t: string): string => t;

  return {
    organizationName: s(record.organization_name) || "the organisation",
    subjectAnchor: orNull(s(record.subject_anchor)),

    processingDescription: orNull(noStop(s(record.processing_description))),
    SUBJECTS_PHRASE: orBlank(relationshipPhrase),
    dataCategories: orBlank(asProse(categories)),

    interestStatement: orNull(noStop(s(purpose.interest_statement))),
    INTEREST_TYPE_PHRASE: orBlank(interestTypePhrase),
    INTEREST_HOLDER_PHRASE: orBlank(holderPhrase),
    specificBenefit: orNull(noStop(s(purpose.specific_benefit))),
    beneficiary: orNull(lowerEnumLabel(noStop(s(purpose.beneficiary)))),
    statedPurpose: orNull(s(record.stated_purpose) ? `"${noStop(s(record.stated_purpose))}"` : ""),

    alternatives: orNull(
      asProse(strList(record.alternatives_considered).length
        ? strList(record.alternatives_considered)
        : strList(necessity.alternatives)),
    ),
    alternativesRationale: orNull(noStop(s(necessity.alternatives_rationale))),
    whyConsentNotUsed: orNull(noStop(s(necessity.why_consent_not_used))),

    RELATIONSHIP_PHRASE: orBlank(relationshipPhrase),
    EXPECTATION_PHRASE: orNull(expectationPhrase),
    reasonableExpectationDetail: orNull(noStop(s(balancing.reasonable_expectation_detail))),

    potentialHarm: orNull(harmLabel),
    potentialHarms: orNull(asProse(labelSet(strList(balancing.potential_harms), {}, ""))),
    scaleApprox: orNull(s(balancing.scale_approx)),
    frequency: orNull(lowerEnumLabel(s(balancing.frequency))),
    duration: orNull(lowerEnumLabel(s(balancing.duration))),
    safeguards: orNull(asProse(safeguards)),
    // 3E9AD759-L5 — a recorded additional measure that is planned rather
    // than in place is bounded explicitly (batch 3e9ad759: four dated,
    // owner-named planned mitigations were reproduced with no statement of
    // whether the favourable balance is conditional on them).
    ADDITIONAL_MITIGATIONS_CLAUSE: mitigations
      ? `; it has additionally recorded ${noStop(mitigations)}. Where a measure recorded there is planned rather than in place, it strengthens the balance only once implemented; the determination in this assessment rests on the measures in force as described, and the balance must be re-run if a planned measure does not land as recorded`
      : "",

    reviewTriggers: orNull(asProse(strList(attestation.review_triggers))),

    // Conditional-body slots.
    publicTaskProcessing: orNull(noStop(s(purpose.public_task_processing))),
    LIST: orBlank(asProse(vulnerable)),
    dpoReviewer: orNull(s(attestation.dpo_reviewer)),
    dpoReviewDate: orNull(s(attestation.dpo_review_date)),
    approverName: orNull(s(attestation.approver_name)),
    approverPosition: orNull(s(attestation.approver_position)),
    approvalDate: orNull(s(attestation.approval_date)),
  };
}

// ── Typed determinations → leads (coherence law) ────────────────────────────

export interface LiaTypedVerdicts {
  readonly outcome: string;
  readonly purpose: string;
  readonly necessity: string;
  readonly balancing: string;
  readonly children_in_scope: boolean;
  readonly public_authority_bar: boolean;
}

export function readTypedVerdicts(report: Bag): LiaTypedVerdicts {
  const tpt = bag(report.three_part_test);
  return {
    outcome: s(bag(report.lia_determination).outcome),
    purpose: s(bag(tpt.purpose_test).verdict) || s(bag(report.interest_legitimacy).verdict),
    necessity: s(bag(tpt.necessity_test).verdict),
    balancing: s(bag(tpt.balancing_test).verdict),
    children_in_scope: s(bag(report.child_factor).determination) === "children_in_scope",
    public_authority_bar: s(bag(report.public_authority_exclusion).determination) === "excluded" ||
      bag(report.public_authority_exclusion).basis_unavailable === true,
  };
}

const AVAILABLE = /available|satisfied|met|pass|yes|supported/i;
const UNAVAILABLE = /unavailable|not_available|fails|failed|not_met|overridden|no/i;

function verdictIsPositive(v: string): boolean | null {
  if (!v) return null;
  if (UNAVAILABLE.test(v) && !/not_overridden/i.test(v)) return false;
  if (AVAILABLE.test(v)) return true;
  return null;
}

function composeExecLead(v: LiaTypedVerdicts, org: string): string {
  if (v.public_authority_bar) {
    return `${org} may not rely on legitimate interests for this processing, because the basis is unavailable to a public authority acting in the performance of its tasks.`;
  }
  const positive = verdictIsPositive(v.outcome);
  if (positive === true) {
    return `Legitimate interests is available to ${org} for the processing described, on the facts the company has provided and subject to the conditions recorded below.`;
  }
  if (positive === false) {
    return `Legitimate interests is not available to ${org} for the processing as described.`;
  }
  return `The three-part test cannot be resolved on the facts ${org} has provided, and the assessment is qualified accordingly.`;
}

function composeTestLead(verdict: string, subject: string, positive: string, negative: string): string {
  const p = verdictIsPositive(verdict);
  if (p === true) return positive;
  if (p === false) return negative;
  return `${subject} cannot be resolved on the facts recorded.`;
}

// ── Generated blocks, composed from the typed surfaces ──────────────────────

/**
 * Typed analysis prose is COPIED, not rewritten — except that the v3 banned
 * register is repaired, because the typed surfaces were authored under the
 * older register and the customer document is governed by v3. `repairRegister`
 * is the same shared repair the other SO products use.
 */
function fromTyped(...parts: (string | undefined)[]): string {
  const text = parts.map((p) => stop(s(p))).filter(Boolean).join(" ");
  return text ? repairRegister(text) : "";
}

// DOC 73 §4 (R2/R5) — renders the precedent-class posture's application
// text ONLY when LIA_PRECEDENT_CLASS_RATIFIED is true, the finding is
// "analysed", and a real posture exists (never the internal
// "not_assessed" degradation state, which is telemetry-only and must
// never reach the customer). Empty string is filtered out by fromTyped,
// so this is a true no-op splice while the gate is closed.
//
// KNOWN GAP, flagged not silently deferred: when the gate opens, this
// sentence's regulator citations (e.g. "DPC (Ireland)", "CNIL (France)")
// will NOT reach composeToaLedger — that ledger's source, authority_exhibit
// (index.ts's walkCites), only pattern-matches GDPR Article/Recital/EDPB
// Guidelines citations, not enforcement-decision citations. LIA has no
// Persuasive-Authority appendix surface yet to carry them properly (doc 58
// §4: "S5 OPEN at L-series" — this is that surface). Do not flip
// LIA_PRECEDENT_CLASS_RATIFIED until L2 builds it or the Factor-Bearing
// Law (doc 48 §II.2a) is violated: a render-eligible corpus citation with
// no ToA/appendix trail.
// L2 (2026-08-26): the KNOWN GAP above is CLOSED — the Persuasive
// Authority section (lia-persuasive-authority.ts) now carries the cited
// decisions with composed authority labels, and the ToA lists them
// iff-cited. The sentence renders ONLY on the deterministic path
// (`deterministic` below), so the legacy model path stays byte-frozen;
// LIA_PRECEDENT_CLASS_RATIFIED records the text ratification.
export function precedentClassSentence(report: Bag, deterministic = false): string {
  if (!LIA_PRECEDENT_CLASS_RATIFIED || !deterministic) return "";
  const finding = bag(report.precedent_class_posture);
  if (s(finding.status) !== "analysed") return "";
  if (s(finding.posture) === "not_assessed" || !s(finding.posture)) return "";
  return s(finding.application);
}

function composeExecPosture(report: Bag, org: string): string {
  // D1D2B3B8-L2 (2026-08-28) — the executive summary carries a COMPACT
  // three-part read, not the sections' own analysis text. The old form
  // spliced each test's first "sentence", which for the purpose test was the
  // whole condition walk (quote included) — the live batch duplicated the
  // full walk in the executive summary and cut it mid-word there. The full
  // analysis lives in Sections II–IV; the summary states the outcomes.
  const tpt = bag(report.three_part_test);
  const verdictClause = (v: string, name: string): string =>
    v === "passes" || v === "likely_passes"
      ? `the ${name} test is met`
      : v === "fails" || v === "likely_fails"
      ? `the ${name} test is not met`
      : v
      ? `the ${name} test is not resolved`
      : "";
  const clauses = [
    verdictClause(s(bag(tpt.purpose_test).verdict), "purpose"),
    verdictClause(s(bag(tpt.necessity_test).verdict), "necessity"),
    verdictClause(s(bag(tpt.balancing_test).verdict), "balancing"),
  ].filter(Boolean);
  const summarySentence = clauses.length === 3
    ? `On the company's answers, ${clauses[0]}, ${clauses[1]}, and ${clauses[2]}; the analysis supporting each appears in Sections II to IV.`
    : clauses.length
    ? `On the company's answers, ${clauses.join(", ")}; the analysis supporting each appears in the sections below.`
    : "";
  return fromTyped(
    summarySentence,
    firstSentence(s(bag(report.lia_determination).why)),
  );
}

function composeConditional(fixedOpening: string, body: string): string {
  if (!body) return "";
  return `${stop(fixedOpening)} ${stop(body)}`.trim();
}

function composeToaLedger(report: Bag): string[] {
  // ITEM SO-11 CITATION LAW: the ledger carries ONLY authorities whose pinpoint
  // is corpus-verified (`pin_verified` with a `corpus_key`), plus the skeleton's
  // own byte-checked pinpoints. The `authority_exhibit` also accumulates
  // unverified, truncated fragments from the analysis passes; those are not
  // authorities and never reach the Table of Authorities.
  const entries = Array.isArray(bag(report.authority_exhibit).entries)
    ? bag(report.authority_exhibit).entries as Bag[]
    : [];
  const verified = entries
    .filter((e) => e.pin_verified === true && s(e.corpus_key))
    .map((e) => s(e.citation))
    .filter(Boolean);
  const pinned = LIA_SKELETON_PINPOINTS.map((p) => p.pinpoint);
  return [...new Set([...pinned, ...verified])];
}

/**
 * LOCAL authority classifier. The shared `groupAuthority` is tuned to the US
 * products (CCR / § 1798 / U.S.C.) and would file "Article 6(1)(f) GDPR" as
 * persuasive guidance, which is wrong: the GDPR is a Regulation. LIA classifies
 * locally rather than changing shared behaviour under the other nine products.
 */
export function liaAuthorityGroup(citation: string): "Regulations" | "Statutes" | "Guidance and Persuasive Authority" {
  if (/\bGDPR\b|\bRecital\b|\bRegulation\b|\bC\.F\.R\.\b|\bCFR\b/i.test(citation)) return "Regulations";
  if (/\bDPA\s*2018\b|\bAct\b|\bU\.S\.C\.\b|§/i.test(citation)) return "Statutes";
  return "Guidance and Persuasive Authority";
}

export function renderLiaToa(ledger: readonly string[], assembledBody: string): string {
  const cited = [...new Set(ledger.filter((c) => c && assembledBody.includes(c)))];
  if (cited.length === 0) return "";
  const groups: ["Regulations" | "Statutes" | "Guidance and Persuasive Authority", string][] = [];
  for (const g of ["Regulations", "Statutes", "Guidance and Persuasive Authority"] as const) {
    // 2026-08-26 CEO-ratified numeric ordering (citation-order.ts) — bare
    // .sort() is lexicographic, so "(11)" sorted before "(7)".
    const inGroup = cited.filter((c) => liaAuthorityGroup(c) === g).sort(naturalCitationCompare);
    if (inGroup.length) groups.push([g, inGroup.join("\n")]);
  }
  const lines: string[] = [];
  for (const [g, body] of groups) {
    lines.push(g === "Guidance and Persuasive Authority" ? `${g} (persuasive)` : g);
    for (const c of body.split("\n")) lines.push(`    ${c}`);
  }
  return lines.join("\n");
}

/**
 * An orphaned lettered sub-head — "C. Scale." with every sentence after it
 * dropped by a null slot — is removed. The skeleton's own rule is that an
 * unanswered optional fact yields NO sentence; a bare heading over nothing
 * would be exactly the padding the rule forbids.
 *
 * The sub-heads and their sentences share one paragraph, so this segments the
 * paragraph at each heading rather than at sentence boundaries: a heading is
 * itself sentence-terminated ("C. Scale."), so a naive sentence split tears the
 * heading away from the body it governs and can never see that the body is gone.
 */
const LIA_SUBHEAD = /(?:^|\s)[A-D]\.\s+[A-Z][^.]*\./g;

function pruneOrphanSubheads(text: string): string {
  const marks = [...text.matchAll(LIA_SUBHEAD)];
  if (marks.length === 0) return text.trim();

  const kept: string[] = [];
  const preamble = text.slice(0, marks[0].index ?? 0).trim();
  if (preamble) kept.push(preamble);

  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index ?? 0;
    const end = i + 1 < marks.length ? (marks[i + 1].index ?? text.length) : text.length;
    const segment = text.slice(start, end).trim();
    const heading = marks[i][0].trim();
    const body = segment.slice(heading.length).trim();
    if (body.length > 0) kept.push(segment);
  }
  return kept.join(" ").replace(/\s+/g, " ").trim();
}


// ── Assembly ────────────────────────────────────────────────────────────────

export interface LiaSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ConformanceFinding[];
  readonly register_findings: string[];
  readonly lead_coherence: string[];
  readonly conditionals_fired: string[];
  readonly verdicts: LiaTypedVerdicts;
}

function checkLeadCoherence(
  leads: Record<string, string>,
  v: LiaTypedVerdicts,
): string[] {
  const findings: string[] = [];
  const outcomePositive = verdictIsPositive(v.outcome);
  if (outcomePositive === false && /is available to/.test(leads.exec)) {
    findings.push("executive lead asserts availability where the typed determination carries none");
  }
  if (outcomePositive === true && /is not available/.test(leads.exec)) {
    findings.push("executive lead denies availability where the typed determination carries it");
  }
  if (outcomePositive === true && /is not available/.test(leads.findings)) {
    findings.push("findings lead disagrees with the typed determination");
  }
  if (leads.exec !== leads.findings && outcomePositive !== null) {
    const a = /not available/.test(leads.exec);
    const b = /not available/.test(leads.findings);
    if (a !== b) findings.push("executive and findings leads disagree with each other");
  }
  if (v.public_authority_bar && !/public authority/.test(leads.exec)) {
    findings.push("executive lead omits the public-authority bar the typed determination carries");
  }
  return findings;
}

export function assembleLiaSkeletonDocument(
  report: Bag,
  recordInput: Bag,
  // L2 (2026-08-26): the deterministic path renders through the v2 section
  // list (the Persuasive Authority section included) and unlocks the
  // ratified precedent sentence. Default false keeps the legacy model path
  // byte-identical to before this landing.
  opts: { deterministic?: boolean } = {},
): LiaSkeletonResult {
  const deterministic = opts.deterministic === true;
  const record = recordInput ?? {};
  const values = buildLiaSlotValues(record);
  const org = s(record.organization_name) || "the organisation";
  const v = readTypedVerdicts(report);

  const purpose = bag(record.purpose_details);
  const necessity = bag(record.necessity_details);
  const balancing = bag(record.balancing_details);
  const attestation = bag(record.attestation);
  const tpt = bag(report.three_part_test);

  const execLead = composeExecLead(v, org);
  const purposeLead = composeTestLead(
    v.purpose,
    "Whether the identified interest qualifies as legitimate",
    "The interest the company has identified qualifies as a legitimate interest.",
    "The interest the company has identified does not qualify as a legitimate interest for the purposes of Article 6(1)(f).",
  );
  const necessityLead = composeTestLead(
    v.necessity,
    "Whether the processing is necessary",
    "The processing is necessary to the identified interest, and not merely useful to it.",
    "The processing is not necessary to the identified interest: the record discloses a less intrusive means of achieving it.",
  );
  const balancingLead = composeTestLead(
    v.balancing,
    "Where the balance falls",
    "The balance favours the interest pursued: the interests, rights and freedoms of the people affected do not override it on the facts recorded.",
    "The balance favours the people affected: their interests, rights and freedoms override the interest pursued on the facts recorded.",
  );
  const findingsLead = composeExecLead(v, org);

  // Conditionals. Each fires only from its own live trigger; a trigger that
  // does not fire composes nothing, and the block is omitted entirely.
  const childrenFires = isYes(balancing.children_data_subjects) || v.children_in_scope;
  const vulnerableList = s(values.LIST);

  // 3E9AD759-L6 (2026-08-27, live batch 3e9ad759) — the ARTICLE 9 BOUNDARY.
  // A record that names a special-category-indicative data category (the
  // batch record named biometric data) previously earned SILENCE on Article
  // 9 unless the UK Art. 22B path happened to fire. The 9M ruling bound to
  // this product (PN-L1): legitimate interests alone cannot carry
  // special-category processing. Where the flag is answered true the
  // boundary is stated; where it is unanswered but a named category is
  // Art. 9-indicative, the open question is surfaced instead of silence.
  // Nothing is asserted from the category label alone.
  const SPECIAL_INDICATIVE = /health|medical|biometric|genetic|racial|ethnic|political|religio|sex life|sexual orientation|trade[- ]union/i;
  const namedSpecial = strList(record.data_categories).filter((c) => SPECIAL_INDICATIVE.test(c));
  const scdFlag = balancing.special_category_data;
  const bioClause = namedSpecial.some((c) => /biometric/i.test(c))
    ? " — for biometric data, Article 9(1) attaches where it is processed for the purpose of uniquely identifying a natural person"
    : "";
  const specialCategoryBoundary = scdFlag === true
    ? "The company has indicated that special-category data is processed. Article 9(1) data cannot rest on legitimate interests alone: an Article 9(2) condition is required in addition to the Article 6 basis, and the determination in this assessment does not extend to that processing until that condition is identified."
    : scdFlag !== false && namedSpecial.length
    ? `The company has named ${asProse(namedSpecial.map((c) => lowerEnumLabel(c)))} among the data categories. Whether ${namedSpecial.length === 1 ? "that category engages" : "those categories engage"} Article 9(1)${bioClause} is not answered on the information provided. Where Article 9(1) is engaged, an Article 9(2) condition is required in addition to the Article 6 basis and legitimate interests alone cannot carry that processing, so the determination in this assessment is bounded accordingly.`
    : "";

  const composed: ComposedBlocks = {
    "executive_summary:0": execLead,
    "executive_summary:2": composeExecPosture(report, org),

    // ¶10 STAGE-A is an authoring rule about how Other values and unanswered
    // optional facts render, enforced in `buildLiaSlotValues`. It prints
    // nothing of its own, so it composes nothing.
    "the_processing:1": "",

    "purpose_test:0": purposeLead,
    "purpose_test:2": isYes(purpose.controller_is_public_authority)
      ? composeConditional(
        "Because the controller is a public authority, a further limitation applies",
        fromTyped(
          s(bag(report.public_authority_exclusion).application),
          s(values.publicTaskProcessing)
            ? `The company has described the tasks in issue as ${noStop(s(values.publicTaskProcessing))}`
            : "The record does not say which of the controller's tasks are in issue",
        ),
      )
      : "",
    "purpose_test:3": s(balancing.statutory_restrictions)
      ? composeConditional(
        "Because the identified interest involves direct marketing, the analysis must also address the rules specific to that activity",
        `The company has recorded its position as ${noStop(s(balancing.statutory_restrictions))}.`,
      )
      : "",
    "purpose_test:4": fromTyped(
      s(bag(tpt.purpose_test).analysis) || s(bag(report.interest_legitimacy).application),
      s(bag(report.benefit_and_beneficiary).application),
    ),

    "necessity_test:0": necessityLead,
    "necessity_test:2": s(necessity.pseudonymisation_options)
      ? composeConditional(
        "For the analytical processing described, the company has recorded its consideration of pseudonymisation",
        `Its recorded position is ${noStop(s(necessity.pseudonymisation_options))}.`,
      )
      : "",
    "necessity_test:3": fromTyped(
      s(bag(tpt.necessity_test).analysis) || s(bag(report.alternatives_considered).application),
    ),

    "balancing_test:0": balancingLead,
    "balancing_test:2": childrenFires
      ? composeConditional(
        "Children are among the people affected",
        fromTyped(
          s(bag(report.child_factor).application),
          "Recital 38 GDPR records that children merit specific protection with regard to their personal data.",
        ),
      )
      : "",
    "balancing_test:3": vulnerableList
      ? composeConditional(
        `The processing reaches people whose circumstances call for particular care: ${vulnerableList}`,
        fromTyped(s(bag(report.relationship_with_individual).application)),
      )
      : "",
    "balancing_test:5": s(balancing.employment_safeguards)
      ? composeConditional(
        "Because the people affected are employees, the imbalance inherent in that relationship must be addressed",
        `The safeguards the company has recorded for that imbalance are ${noStop(s(balancing.employment_safeguards))}.`,
      )
      : "",
    "balancing_test:6": fromTyped(
      s(bag(tpt.balancing_test).analysis),
      s(bag(report.reasonable_expectations).application),
      s(bag(report.potential_harms).application),
      s(bag(report.opt_out_feasibility).application),
      specialCategoryBoundary,
      precedentClassSentence(report, deterministic),
    ),

    "findings:0": findingsLead,
    "findings:1": fromTyped(
      s(bag(report.lia_determination).why),
      ...strList(report.documentation_recommendations).slice(0, 4),
    ),
    "findings:2": isYes(attestation.dpo_reviewed) || s(attestation.dpo_reviewer)
      ? (s(attestation.dpo_reviewer)
        ? `The assessment was reviewed by ${s(attestation.dpo_reviewer)}${
          s(attestation.dpo_review_date) ? ` on ${s(attestation.dpo_review_date)}` : ""
        }.`
        : "The assessment was reviewed by the data protection officer.")
      // HONEST NEGATIVE — weight attaches either way, so the absence is stated.
      : "Review by the data protection officer has not yet occurred.",
    "findings:3": s(attestation.approver_name)
      ? `It was approved by ${s(attestation.approver_name)}${
        s(attestation.approver_position) ? `, ${s(attestation.approver_position)}` : ""
      }${s(attestation.approval_date) ? `, on ${s(attestation.approval_date)}` : ""}.`
      : "",
  };

  // L2 — the Persuasive Authority section (deterministic path only). The
  // "balancing_fails" render_when state is the typed balancing verdict,
  // now code-computed (the render-readiness law's condition).
  const persuasive = deterministic
    ? buildLiaPersuasiveAuthority(report, v.balancing === "likely_fails")
    : { body: "", ledger: [] as readonly string[], entry_count: 0, aow_fired: false };
  if (deterministic && persuasive.body) {
    composed["persuasive_authority:0"] = persuasive.body;
  }

  // 3E9AD759-L1 (2026-08-27, live batch 3e9ad759, flagged HIGH) — a UK-only
  // record carries the UK GDPR instrument label on the subtitle and in the
  // Table of Authorities. The UK GDPR is a distinct instrument; the corpus
  // holds the approved UK anchor (`ukgdpr-art-6-1-f`, verified at encode
  // time per the spine's own pinpoint note), and the substantive text is
  // identical. A mixed EU+UK record stays on the EU citation rail — the
  // fleet's ITEM-330 rule (DPIA), applied identically here.
  const liaJurisdictions = (Array.isArray(record.jurisdictions) ? record.jurisdictions : []).map((j) => s(j));
  const ukOnly = liaJurisdictions.includes("United Kingdom (UK GDPR)") &&
    !liaJurisdictions.includes("EU (GDPR)");
  // D1D2B3B8-L3 (2026-08-28, flagged HIGH) — a MIXED EU+UK record stays on
  // the EU citation rail (ITEM-330) but must ACKNOWLEDGE the UK instrument:
  // the live batch's mixed record never named the UK GDPR anywhere. The
  // subtitle carries both instruments, §I states the parallel application,
  // and the ToA lists the UK counterpart (the §I sentence is what satisfies
  // the ToA's iff-cited check).
  const mixedEuUk = liaJurisdictions.includes("United Kingdom (UK GDPR)") &&
    liaJurisdictions.includes("EU (GDPR)");
  const instrumentLabel = (c: string): string =>
    ukOnly ? c.replace(/^Article 6\(1\)\(f\) GDPR/, "Article 6(1)(f) UK GDPR") : c;
  const mixedInstrumentNote = mixedEuUk
    ? "The record puts both the EU GDPR and the UK GDPR in scope. Article 6(1)(f) UK GDPR is materially identical to its EU counterpart, and the analysis in this assessment applies under each instrument; citations follow the EU text, and the UK GDPR applies in parallel to the processing of the UK data subjects."
    : "";
  if (mixedInstrumentNote) composed["the_processing:1"] = mixedInstrumentNote;

  const args = {
    sections: deterministic ? LIA_SKELETON_SECTIONS_V2 : LIA_SKELETON_SECTIONS,
    title: LIA_SKELETON_TITLE,
    subtitle: ukOnly
      ? LIA_SKELETON_SUBTITLE.replace("Article 6(1)(f) GDPR", "Article 6(1)(f) UK GDPR")
      : mixedEuUk
      ? LIA_SKELETON_SUBTITLE.replace("Article 6(1)(f) GDPR", "Article 6(1)(f) GDPR and Article 6(1)(f) UK GDPR")
      : LIA_SKELETON_SUBTITLE,
    spineVersion: deterministic ? LIA_SKELETON_VERSION_V2 : LIA_SKELETON_VERSION,
    values,
  };

  const draft = renderSkeletonDocument({ ...args, composed });
  const toa = renderLiaToa(
    [
      ...composeToaLedger(report).map(instrumentLabel),
      // D1D2B3B8-L3 — the UK counterpart enters the ledger only on a mixed
      // record; renderLiaToa's iff-cited filter keeps it out unless the body
      // (the §I note above) actually names it. Corpus anchor:
      // ukgdpr-art-6-1-f, verified at encode time (see 3E9AD759-L1).
      ...(mixedEuUk ? ["Article 6(1)(f) UK GDPR"] : []),
      ...persuasive.ledger,
    ],
    skeletonDocumentToText(draft),
  );

  const rendered = renderSkeletonDocument({
    ...args,
    composed: { ...composed, "table_of_authorities:0": toa },
  });

  const document: RenderedSkeletonDocument = {
    ...rendered,
    sections: rendered.sections.map((sec) => ({
      ...sec,
      paragraphs: sec.paragraphs
        .map((p) => (p.kind === "skeleton" ? { ...p, text: pruneOrphanSubheads(p.text) } : p))
        .filter((p) => p.text.trim().length > 0),
    })),
  };

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = LIA_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  const conditionals_fired = LIA_CONDITIONAL_TRIGGERS
    .filter((t) => {
      switch (t.id) {
        case "stage_a": return false;
        case "public_authority": return !!composed["purpose_test:2"];
        case "marketing": return !!composed["purpose_test:3"];
        case "analytics": return !!composed["necessity_test:2"];
        case "children": return !!composed["balancing_test:2"];
        case "vulnerable_groups": return !!composed["balancing_test:3"];
        case "employee_monitoring": return !!composed["balancing_test:5"];
        case "dpo_review": return !!composed["findings:2"];
        case "approval": return !!composed["findings:3"];
        default: return false;
      }
    })
    .map((t) => t.id);

  return {
    document,
    // `values` is passed so the exemption for a sentence dropped by a null slot
    // is computed EXACTLY, from the same values the renderer used, rather than
    // inferred from the shape of the literal.
    conformance: verifySkeletonConformance(
      document,
      deterministic ? LIA_SKELETON_SECTIONS_V2 : LIA_SKELETON_SECTIONS,
      values,
    ),
    register_findings,
    lead_coherence: checkLeadCoherence(
      { exec: execLead, purpose: purposeLead, necessity: necessityLead, balancing: balancingLead, findings: findingsLead },
      v,
    ),
    conditionals_fired,
    verdicts: v,
  };
}

/** Protected leaves, re-exported for the finalize-point splice barrier. */
export const LIA_SKELETON_PROTECTED_LEAVES = LIA_PROTECTED_FIXED_PROSE;
