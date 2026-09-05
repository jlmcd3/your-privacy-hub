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
  LIA_BENEFICIARY_LABELS,
  LIA_CONDITIONAL_TRIGGERS,
  LIA_DATA_CATEGORY_LABELS,
  LIA_EXPECTATION_PHRASES,
  LIA_HARM_SEVERITY_LABELS,
  LIA_INTEREST_HOLDER_PHRASES,
  LIA_INTEREST_TYPE_LABELS,
  LIA_RELATIONSHIP_LABELS,
} from "../prose/plans/lia.slotmap.ts";
import { ANCHOR_KEYS, row } from "./lia-deliverables/elements.ts";
import {
  renderSkeletonDocument,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type ConformanceFinding,
  type RenderedSkeletonDocument,
  type RenderedTable,
  type SkeletonTables,
  type SlotValues,
} from "../../../_shared/prose/skeleton-render.ts";
import { repairRegister } from "../../../_shared/ltp/risk-skeleton-assemble.ts";
// DOC 172 (2026-09-04) — Syllabus & Record (doc 151); LIA is the third
// product migrated onto the fleet presentation system.
import { dispositionTone, type SyllabusProjection } from "../../../_shared/prose/syllabus.ts";
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
    // DOC 161 — the Stage A form folds free text into the value ("Other: <text>").
    const folded = /^other\s*:\s*(.+)$/i.exec(v);
    if (folded) {
      out.push(folded[1].trim());
      continue;
    }
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

// DOC 161 (2026-09-03, audit A.2) — the intake form's five expectation options
// and the contract's three legacy values resolve through one function (the
// exact-key map alone yielded "" for "Probably — …", "Maybe — …" and
// "Unlikely — …", which dropped the whole ¶24 sentence on every real record).
function expectationPhraseFor(answer: string): string {
  const exact = LIA_EXPECTATION_PHRASES[answer];
  if (exact) return exact;
  if (/^yes\b/i.test(answer)) return "would";
  if (/^probably\b/i.test(answer)) return "would probably";
  if (/^(?:maybe|partly|unsure)\b/i.test(answer)) return "may not";
  if (/^unlikely\b/i.test(answer)) return "would probably not";
  if (/^no\b/i.test(answer)) return "would not";
  return "";
}

/** DOC 161 — the severity head word ("Significant — discrimination, …" → "significant"). */
function harmHeadLabel(answer: string): string {
  if (!answer) return "";
  const exact = LIA_HARM_SEVERITY_LABELS[answer];
  if (exact) return exact;
  const head = answer.split(/\s+[—–-]\s+/)[0].trim();
  if (/^none\b/i.test(head)) return "negligible";
  return lowerEnumLabel(head);
}

export function buildLiaSlotValues(record: Bag): SlotValues {
  const purpose = bag(record.purpose_details);
  const necessity = bag(record.necessity_details);
  const balancing = bag(record.balancing_details);
  const attestation = bag(record.attestation);

  const relationshipRaw = s(balancing.relationship_category) || s(record.relationship_type);
  const relationshipPhrase = relationshipRaw
    ? (LIA_RELATIONSHIP_LABELS[relationshipRaw] || lowerEnumLabel(relationshipRaw))
    : "";

  // DOC 161 (audit A.5) — the "Other" text for the data categories was read
  // from balancing_details.additional_context, a different question
  // ("Anything else about this processing we should weigh?"); the Stage A
  // form folds the free text into the value itself, which labelSet unwraps.
  // additional_context now renders in the balancing analysis as the
  // Company's own further context.
  const categories = labelSet(strList(record.data_categories), LIA_DATA_CATEGORY_LABELS, "");

  const interestTypeRaw = s(purpose.interest_type);
  // DOC 161 — the form's "Other (describe below)" value; the free text loses its stop.
  const interestTypePhrase = /^other\b/i.test(interestTypeRaw)
    ? noStop(s(purpose.interest_type_other))
    : (LIA_INTEREST_TYPE_LABELS[interestTypeRaw] || (interestTypeRaw ? lowerEnumLabel(interestTypeRaw) : ""));

  const holderRaw = s(purpose.interest_holder);
  const holderOther = noStop(s(purpose.interest_holder_other));
  // DOC 161 (audit A.2) — the six form options map explicitly (the old /third/
  // test read "The data subject themselves" and "The wider public" as the
  // company's own interest); a free-text holder is attributed as recorded.
  const holderPhrase = /^other\b/i.test(holderRaw)
    ? (holderOther ? `on behalf of ${holderOther}` : "")
    : (LIA_INTEREST_HOLDER_PHRASES[holderRaw] ?? (holderRaw ? `on behalf of ${noStop(holderRaw)}` : ""));

  const expectationPhrase = expectationPhraseFor(s(balancing.reasonable_expectation));

  const harmLabel = harmHeadLabel(s(balancing.potential_harm));

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

  // SO-11 UK-instrument re-pin — jurisdiction read for the instrument slots
  // (same membership test as the assembler's ukOnly/mixedEuUk, computed here
  // so the slot bag is self-contained for every caller).
  const instrJurisdictions = strList(record.jurisdictions);
  const instrUk = instrJurisdictions.includes("United Kingdom (UK GDPR)");
  const instrEu = instrJurisdictions.includes("EU (GDPR)");
  const instrUkOnly = instrUk && !instrEu;
  const instrMixed = instrUk && instrEu;

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
    beneficiary: orNull(LIA_BENEFICIARY_LABELS[noStop(s(purpose.beneficiary))] ?? lowerEnumLabel(noStop(s(purpose.beneficiary)))),
    statedPurpose: orNull(s(record.stated_purpose) ? `"${noStop(s(record.stated_purpose))}"` : ""),

    alternatives: orNull(
      asProse((strList(record.alternatives_considered).length
        ? strList(record.alternatives_considered)
        : strList(necessity.alternatives)).map((a) => noStop(a))),
    ),
    // DOC 161 — a multi-line rationale carried its line breaks into the ¶19
    // sentence; the lines now join as clauses.
    alternativesRationale: orNull(
      s(necessity.alternatives_rationale).split(/\r?\n+/).map((l) => noStop(l.trim())).filter(Boolean).join("; "),
    ),
    whyConsentNotUsed: orNull(noStop(s(necessity.why_consent_not_used))),

    RELATIONSHIP_PHRASE: orBlank(relationshipPhrase),
    EXPECTATION_PHRASE: orNull(expectationPhrase),
    // DOC 161 — the slot map says "the basis clause is dropped" when the
    // detail is blank, but the renderer drops the whole sentence, and with it
    // the answered relationship and expectation. The answered facts survive.
    reasonableExpectationDetail: orNull(
      noStop(s(balancing.reasonable_expectation_detail)) || (s(balancing.reasonable_expectation) ? "not recorded" : ""),
    ),

    potentialHarm: orNull(harmLabel),
    // DOC 161 — same sentence-drop class: an unlisted harm category took the
    // answered severity down with it. The pathway the company describes stands in.
    potentialHarms: orNull(
      asProse(labelSet(strList(balancing.potential_harms), {}, "")) ||
        (s(balancing.potential_harm)
          ? (firstSentence(s(balancing.potential_harm_detail))
            ? `the impact the company describes — ${noStop(firstSentence(s(balancing.potential_harm_detail)))}`
            : "not itemised by category")
          : ""),
    ),
    // PANEL LIA-P2 (2026-08-30) — ¶27's C.-Scale sentence quotes these three
    // answers as recorded, so the values keep the customer's own casing and
    // wording (no lowerEnumLabel) and drop only a terminal stop so the
    // closing quote is not followed by doubled punctuation.
    scaleApprox: orNull(noStop(s(balancing.scale_approx))),
    frequency: orNull(noStop(s(balancing.frequency))),
    duration: orNull(noStop(s(balancing.duration))),
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

    // SO-11 UK-INSTRUMENT RE-PIN (2026-08-28, CEO-approved in-chat) — the
    // governing instrument enters the fixed prose (subtitle, ¶6, ¶19)
    // through these slots instead of assembly-time string replaces. A
    // UK-only record names the UK GDPR; a mixed EU+UK record stays on the
    // EU citation rail (ITEM-330) with the UK instrument acknowledged in
    // the subtitle and the §I note (D1D2B3B8-L3). Corpus anchors:
    // gdpr-art-6-1-f (EU) and ukgdpr-art-6-1-f (UK), both approved.
    instrumentCitation: instrUkOnly
      ? "Article 6(1)(f) UK GDPR"
      : instrMixed
      ? "Article 6(1)(f) GDPR and Article 6(1)(f) UK GDPR"
      : "Article 6(1)(f) GDPR",
    instrumentName: instrUkOnly ? "the UK GDPR" : "the GDPR",
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
  /** Batch 4ed05f22 (2026-09-05): the typed engine's own record that its
   *  outcome override fired for the ePrivacy gate. Read from the typed
   *  engine's persisted telemetry (`_meta.internal.lia_typed_test`, written
   *  by run-li-assessment beside the override) — the typed engine remains the
   *  single render door; this file still never reads the gate finding. */
  readonly eprivacy_foreclosed: boolean;
}

export function readTypedVerdicts(report: Bag): LiaTypedVerdicts {
  const tpt = bag(report.three_part_test);
  const typedTest = bag(bag(bag(report._meta).internal).lia_typed_test);
  return {
    outcome: s(bag(report.lia_determination).outcome),
    purpose: s(bag(tpt.purpose_test).verdict) || s(bag(report.interest_legitimacy).verdict),
    necessity: s(bag(tpt.necessity_test).verdict),
    balancing: s(bag(tpt.balancing_test).verdict),
    children_in_scope: s(bag(report.child_factor).determination) === "children_in_scope",
    public_authority_bar: s(bag(report.public_authority_exclusion).determination) === "excluded" ||
      bag(report.public_authority_exclusion).basis_unavailable === true,
    eprivacy_foreclosed: typedTest.eprivacy_foreclosed === true,
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

// DOC 137 (2026-09-01) — the ePrivacy/PECR engagement-map overlay. Same
// "computed but never rendered" pattern doc 136 fixed for DPIA's Art.
// 35(3)(c) entry (_shared/ltp/dpia-skeleton-assemble.ts's
// DPIA_MATRIX_ROWS[0].reportDetermination): engagement-map.ts's
// R_EPRIVACY_PECR entry has been attached to report.engagement_map since it
// shipped, but no LIA renderer ever read it — confirmed absent from a live
// graded PDF by a prior investigation agent.
//
// This overlay is DELIBERATELY additive and informational only. It concerns
// a DIFFERENT legal instrument (the ePrivacy Directive / PECR 2003, device
// storage/access) from the one this document determines (GDPR/UK GDPR Art.
// 6(1)(f), the legitimate-interests balancing test). It must never be read
// as, or allowed to influence, the Art. 6(1)(f) determination itself — that
// determination is computed exclusively from `three_part_test` / `v.outcome`
// and this function touches neither. It is also fully separate from the
// already-ratified narrow-trigger hard gate in
// `lia-deliverables/eprivacy-gate.ts` (LIA_EPRIVACY_GATE_RATIFIED), which
// can alter the three-part-test outcome on its own regex triggers; this
// function does not call it, read it, or duplicate its triggers.
//
// DOC 139 (2026-09-02) — fact-gating fix for a P1 an external legal review
// raised against doc 137's overlay: engagement-map.ts's R_EPRIVACY_PECR
// used to resolve "engaged" on a coarse keyword regex and "conditional" on
// everything else, but NEVER "not_engaged" on the facts — so the firm
// "requires a separate consent or exemption..." sentence was reaching every
// device/wearable-adjacent record regardless of whether the record's own
// facts (storage on/access to terminal equipment, a network-connected
// device, the controller actually reading stored device information)
// establish that PECR Regulation 6 actually engages.
//
// FIX LOCATION: the fix lives in `_shared/engagement-map.ts`, NOT here.
// `buildLiaEngagementMap` now takes the ALREADY-COMPUTED determination from
// the already-ratified, narrower `eprivacy-gate.ts` (passed through by the
// caller in index.ts, which computes that gate's finding and has the
// intake in scope) and uses IT — not its own regex — to decide
// R_EPRIVACY_PECR's status: "engaged" now means the harder gate's own
// unmistakable triggers fired (determination "consent_requirement_engaged");
// "conditional" now means the harder gate is itself ambiguous
// ("undetermined_on_the_record"); "not_engaged" means the harder gate found
// no signal at all ("not_engaged_on_the_record"). See that file's own DOC
// 139 comment for the full mapping.
//
// This function is DELIBERATELY UNCHANGED in what it reads — still only
// `report.engagement_map`'s `R_EPRIVACY_PECR` entry, and it still never
// reads the harder gate's own report field directly (see
// tests/edge/run-li-assessment/eprivacy-gate.test.ts's ratified assertion
// that this file must never consume that finding directly — the typed
// engine's outcome override is the only door for eprivacy-gate.ts's own
// prose to reach the Art. 6(1)(f) determination; this overlay's door is the
// re-mapped engagement_map entry instead, and stays fully separate from
// that determination). The only change here is the CONTENT for the
// "conditional" status: since "conditional" now specifically means the
// harder gate is ambiguous (not just "didn't match the coarse regex"), it
// renders the qualified statement the reviewer requested instead of the
// generic rationale text.
const EPRIVACY_ADDITIONAL_INFO_REQUIRED =
  "PECR/ePrivacy applicability — Additional Information Required. The assessment record does not establish whether the processing involves storage of information on, or access to information stored on, terminal equipment in a manner that engages PECR Regulation 6. Confirm the device and communications architecture before drawing that conclusion.";

export function eprivacyOverlayNote(report: Bag, foreclosed = false): string {
  const engagementMap = bag(report.engagement_map);
  const entries = Array.isArray(engagementMap.entries) ? engagementMap.entries : [];
  const entry = entries
    .map((e) => bag(e))
    .find((e) => s(e.rule_id) === "R_EPRIVACY_PECR");
  if (!entry) return "";
  const status = s(entry.status);
  if (status === "conditional") return EPRIVACY_ADDITIONAL_INFO_REQUIRED;
  if (status !== "engaged") return "";
  const rationale = s(entry.rationale);
  if (!rationale) return "";
  const lowered = rationale.charAt(0).toLowerCase() + rationale.slice(1);
  // Batch 4ed05f22 (2026-09-05): when the typed engine's outcome override has
  // fired for the ePrivacy gate, the document's page one already says
  // legitimate interests is Not Available BECAUSE of this consent requirement.
  // The informational form below then contradicted it ("does not affect …
  // the Article 6(1)(f) determination above" — Velorix). The overlay's own
  // content is unchanged; only its closing sentence acknowledges the
  // determination it sits under.
  if (foreclosed) {
    return `Separately, ${lowered} This consent requirement under the ePrivacy Directive and the UK's Privacy and Electronic Communications Regulations (PECR) is the reason legitimate interests is not available for the covered processing, as the determination above records; it operates as a gate on that determination, not as a factor weighed within the balancing test.`;
  }
  return `Separately, ${lowered} This is a separate, additional obligation under the ePrivacy Directive and the UK's Privacy and Electronic Communications Regulations (PECR); it does not affect, and is not affected by, the Article 6(1)(f) determination above.`;
}

// DOC 141 (2026-09-02) — the UK GDPR Art. 6(11)/DUAA recognised-interest
// overlay. engagement-map.ts has computed the three R_UK_ART_6_11_* entries
// (direct marketing / intra-group transmission / network and information
// security) since C1-d, but no LIA renderer ever read them — the same
// "computed but never rendered" defect class doc 137 fixed for
// R_EPRIVACY_PECR. This sibling of eprivacyOverlayNote (above) reads ONLY
// `report.engagement_map`, exactly like that function, and renders one
// informational sentence when an entry is engaged.
//
// UK-in-scope gating: buildLiaEngagementMap resolves an R_UK_ART_6_11_*
// entry to "engaged" ONLY when the record's jurisdictions include the UK
// (a non-UK record gets "not_applicable"), so the engaged status carries
// the jurisdiction fact; this function trusts the map's own gate, the same
// single-writer discipline eprivacyOverlayNote applies to R_EPRIVACY_PECR.
//
// INFORMATIONAL ONLY (doc-139 discipline, applied identically): this note
// never reads or alters lia_determination, three_part_test, or any verdict;
// its only render door is the v2 "findings:5" generated block it shares
// with the ePrivacy note (the spine is byte-mirrored into
// generate-report-pdf, so no new block is added). The example names quoted
// are taken from the map entries' own `name` labels — nothing statutory is
// invented here.
export function ukArt611OverlayNote(report: Bag): string {
  const engagementMap = bag(report.engagement_map);
  const entries = Array.isArray(engagementMap.entries) ? engagementMap.entries : [];
  const engaged = entries
    .map((e) => bag(e))
    .filter((e) => s(e.rule_id).startsWith("R_UK_ART_6_11_") && s(e.status) === "engaged");
  if (!engaged.length) return "";
  // Each entry's name reads "UK GDPR Art. 6(11) — <example> (DUAA 2025)";
  // the example label between the dash and the instrument tag is the map's
  // own wording for the recognised-interests example.
  const examples = engaged
    .map((e) => {
      const m = s(e.name).match(/—\s*(.+?)\s*\(DUAA/);
      return m ? m[1] : "";
    })
    .filter(Boolean);
  if (!examples.length) return "";
  return `On the UK leg of the analysis, UK GDPR Article 6(11), inserted by the Data (Use and Access) Act 2025, recognises ${
    asProse(examples)
  } as an example of a legitimate interest, and that recognition bears on this assessment's application under the UK GDPR; a legitimate interests assessment is still required, and this note does not affect, and is not affected by, the Article 6(1)(f) determination above.`;
}

// BATCH 19a (Wave C3, doc 113 S3.1) — the three-test verdict strip: the
// Executive Summary's hideHeader scoreboard, one row per typed test verdict.
// Verdict words mirror composeExecPosture's own mapping. An unrecorded test
// drops its row; no rows, no table (NO-PADDING LAW).
export function deriveThreeTestStrip(report: Bag): RenderedTable | null {
  const tpt = bag(report.three_part_test);
  const word = (v: string): string =>
    v === "passes" || v === "likely_passes"
      ? "Met"
      : v === "fails" || v === "likely_fails"
      ? "Not met"
      : v
      // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, §XIII check
      // #4) — fleet status vocabulary: "Determination Pending", not the
      // older "Not resolved" dialect.
      ? "Determination Pending"
      : "";
  const rows: string[][] = [];
  const add = (label: string, v: string) => {
    const w = word(v);
    if (w) rows.push([label, w]);
  };
  // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, LIA P1-2) —
  // Article 6(1)(f) availability (the public-authority exclusion gate) is a
  // logically PRIOR question to the three-part test, and buildDetermination
  // (lia-deliverables/build.ts) correctly gates the overall outcome on it
  // when it is open. But that gating previously left the reader unable to
  // see that the three-part test below WAS in fact reached and resolved —
  // an open gate is not the same fact as an unresolved balancing test, and
  // showing only the former made a completed analysis look abandoned. This
  // row states the gate explicitly and separately; the rows below it render
  // from the same typed verdicts regardless of the gate's state.
  const pa = bag(report.public_authority_exclusion);
  const paDetermination = s(pa.determination);
  const paWord = pa.basis_unavailable === true
    ? "Not available"
    : paDetermination === "undetermined_on_the_record"
    ? "Determination Pending"
    : paDetermination === "exclusion_does_not_apply"
    ? "Available"
    : "";
  if (paWord) rows.push(["Article 6(1)(f) availability", paWord]);
  add("Purpose test", s(bag(tpt.purpose_test).verdict));
  add("Necessity test", s(bag(tpt.necessity_test).verdict));
  add("Balancing test", s(bag(tpt.balancing_test).verdict));
  if (!rows.length) return null;
  return {
    key: "",
    surface: "three_part_test",
    title: "Three-part test",
    columns: ["Test", "Verdict"],
    rows,
    hideHeader: true,
  };
}

// BATCH 20a (Wave C4, doc 113 S5.3) — the §III alternatives table:
// Alternative | Why rejected, rows from the typed comparison the necessity
// limb performs. A missing rationale renders honestly.
export function deriveAlternativesTable(report: Bag): RenderedTable | null {
  const alts = bag(report.alternatives_considered).alternatives;
  if (!Array.isArray(alts)) return null;
  const rows = (alts as Bag[])
    .map((a) => {
      const name = s(a.alternative);
      if (!name) return null;
      const why = s(a.why_inadequate);
      return [
        name.charAt(0).toUpperCase() + name.slice(1),
        why ? why.charAt(0).toUpperCase() + why.slice(1) : "Not recorded",
      ];
    })
    .filter((r): r is string[] => r !== null);
  if (!rows.length) return null;
  return {
    key: "",
    surface: "alternatives_considered.alternatives",
    title: "Alternatives considered",
    columns: ["Alternative", "Why rejected"],
    rows,
  };
}

// BATCH 20a (Wave C4, doc 113 S5.4) — the §IV balance table, from the
// typed W3-T2 factor entries; the per-factor `direction` is the record's
// own polarity, never invented here.
export function deriveBalanceTable(report: Bag): RenderedTable | null {
  const factors = bag(bag(report.three_part_test).balancing_test).factors;
  if (!Array.isArray(factors)) return null;
  const toward = (d: string): string =>
    d === "controller"
      ? "The controller's interest"
      : d === "data_subject"
      ? "The data subjects"
      : "Neutral or unresolved";
  const rows = (factors as Bag[])
    .map((f) => {
      const factor = s(f.factor);
      if (!factor) return null;
      const position = firstSentence(s(f.reasoning));
      return [factor, toward(s(f.direction)), position || "—"];
    })
    .filter((r): r is string[] => r !== null);
  if (rows.length < 2) return null;
  return {
    key: "",
    surface: "three_part_test.balancing_test.factors",
    title: "Balance of interests",
    columns: ["Factor", "Weighs toward", "Position on the record"],
    rows,
  };
}

// DOC 161 (2026-09-03, audit A.6) — a record whose jurisdictions name neither
// the EU nor the UK is assessed under Article 6(1)(f) GDPR by default (the
// instrument slots fall to the EU rail); the document said nothing about that
// choice. Stated once, first. Ratification queue R8 (doc 161 §C).
export const LIA_NON_GDPR_JURISDICTION_SENTENCE =
  // Team clarity review (CEO delegation 2026-09-03): two plain sentences.
  "The company has not named the European Union or the United Kingdom among the jurisdictions that apply. This assessment is written under Article 6(1)(f) GDPR, and it does not decide whether the GDPR governs the processing under Article 3.";

function nonGdprJurisdictionSentence(record: Bag): string {
  const js = strList(record.jurisdictions);
  if (!js.length) return "";
  const named = js.some((j) => j === "EU (GDPR)" || j === "United Kingdom (UK GDPR)");
  return named ? "" : LIA_NON_GDPR_JURISDICTION_SENTENCE;
}

// DOC 161 (audits A.3/A.4) — ¶19's fixed prose promises "Its account of data
// minimisation is addressed in the analysis below", and the form tells the
// customer the minimisation finding rests on the exclusions they name; the
// deterministic path never read necessity_details.data_minimised. The
// Company's account is quoted, attributed, beside Art. 5(1)(c). Queue R6.
function minimisationSentence(record: Bag): string {
  const account = noStop(s(bag(record.necessity_details).data_minimised));
  const principle = row(ANCHOR_KEYS.data_minimisation);
  const verbatim = s(principle?.verbatim_quote).replace(/;$/, "");
  if (!account) {
    return "The company has not described how the data used are limited to what the purpose needs, so the necessity finding above rests on the comparison of alternatives alone.";
  }
  return `On data minimisation, the company has stated: "${account}".${
    verbatim
      ? ` Article 5(1)(c) requires personal data to be ${verbatim}. The company's account is recorded as its own statement against that standard; this assessment does not verify it.`
      : ""
  }`;
}

// DOC 161 (audit A.4) — balancing_details.additional_context ("Anything else
// about this processing we should weigh?") was collected and never read on the
// deterministic path except, wrongly, as the "Other" data-category text.
function additionalContextSentence(record: Bag): string {
  const ctx = noStop(s(bag(record.balancing_details).additional_context));
  return ctx ? `The company adds, as further context for the balance: "${ctx}".` : "";
}

function composeExecPosture(report: Bag, org: string, record: Bag = {}): string {
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
    nonGdprJurisdictionSentence(record),
    summarySentence,
    firstSentence(s(bag(report.lia_determination).why)),
  );
}

function composeConditional(fixedOpening: string, body: string): string {
  if (!body) return "";
  return `${stop(fixedOpening)} ${stop(body)}`.trim();
}

// DOC 138 (2026-09-02) — the public-authority "Determination Pending"
// sentence (build.ts's rawWhy for `public_authority_exclusion.determination
// === "undetermined_on_the_record"`) told the reader the lawful-basis
// decision was pending but never said what would resolve it, even though the
// exact, already-ratified ask has existed on the typed finding since DOC 129
// LIA-C (2026-09-01): `public_authority_exclusion.information_needed`
// (build.ts ~line 419). The `information_needed` spine section
// (lia.spine.ts, id "information_needed") is declared but has no composer
// wired to it anywhere in this file, so that ask never reached a customer —
// confirmed dead section, not merely an unconsumed field. Rather than stand
// up a whole new section (bigger blast radius for one sentence), this
// appends the SAME ratified text to the existing findings:1 paragraph, right
// after the pending sentence it explains.
//
// SCOPE GUARD: gated on the identical condition build.ts uses to produce the
// generic pending sentence in the first place
// (`public_authority_exclusion.determination === "undetermined_on_the_record"`).
// It renders nothing when the exclusion is resolved either way (exclusion
// applies / does not apply), and it only reads an already-computed field —
// it does not call, re-derive, or influence the exclusion determination
// itself. The only edit here is a stripped internal field-path prefix
// ("purpose_details.controller_is_public_authority — ") and a customer-facing
// lead-in; the substantive ask is verbatim from build.ts.
function publicAuthorityInformationNeededSentence(report: Bag): string {
  const pa = bag(report.public_authority_exclusion);
  if (s(pa.determination) !== "undetermined_on_the_record") return "";
  const raw = s(pa.information_needed);
  if (!raw) return "";
  const ask = raw.includes(" — ") ? raw.split(" — ").slice(1).join(" — ").trim() : raw;
  if (!ask) return "";
  return `The information needed to resolve that threshold issue is ${ask}`;
}

/**
 * DOC 188 P3 (batch e38460, both LIA runs) — the pinpoints the ASSEMBLER's
 * own composed sentences cite (not the spine's fixed prose, which
 * LIA_SKELETON_PINPOINTS already covers): the Art. 9 boundary paragraph
 * (`specialCategoryBoundary`, Article 9(1)/9(2)), the data-minimisation
 * standard sentence (Article 5(1)(c)) and the consent alternative row
 * (Article 6(1)(a), lia-deliverables/build-upgrade4.ts). The Table of
 * Authorities listed only Article 6(1)(f) while the body cited all four.
 * Each anchor was verified against the live corpus on 2026-09-05 (the
 * provision_texts rows are `approved`; the gdpr_articles spans are byte
 * substrings of the `eu` body_text). The ToA stays iff-cited: an entry
 * renders only where the body carries its pinpoint (renderLiaToa).
 */
export interface LiaComposedPinpoint {
  readonly pinpoint: string;
  readonly corpus_table: string;
  readonly corpus_key: string;
  readonly verbatim: string;
  readonly composed_in: string;
}

export const LIA_COMPOSED_PINPOINTS: readonly LiaComposedPinpoint[] = [
  {
    pinpoint: "Article 9(1) GDPR",
    corpus_table: "provision_texts",
    corpus_key: "gdpr-art-9-1",
    verbatim:
      "Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation shall be prohibited.",
    composed_in: "specialCategoryBoundary (lia-skeleton-assemble.ts)",
  },
  {
    pinpoint: "Article 9(2) GDPR",
    corpus_table: "gdpr_articles",
    corpus_key: "gdpr-articles:eu:9",
    verbatim: "Paragraph 1 shall not apply if one of the following applies",
    composed_in: "specialCategoryBoundary (lia-skeleton-assemble.ts)",
  },
  {
    pinpoint: "Article 5(1)(c) GDPR",
    corpus_table: "provision_texts",
    corpus_key: "gdpr-art-5-1-c",
    verbatim:
      "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed ('data minimisation');",
    composed_in: "deriveMinimisationSentence (lia-skeleton-assemble.ts)",
  },
  {
    pinpoint: "Article 6(1)(a) GDPR",
    corpus_table: "gdpr_articles",
    corpus_key: "gdpr-articles:eu:6",
    verbatim:
      "the data subject has given consent to the processing of his or her personal data for one or more specific purposes",
    composed_in: "buildAlternativesConsidered (lia-deliverables/build-upgrade4.ts)",
  },
];

/** The pinpoint without its instrument suffix ("Article 9(1) GDPR" → "Article 9(1)"). */
export function bareLiaPinpoint(citation: string): string {
  return citation.replace(/ (?:UK )?GDPR$/, "");
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
  // DOC 188 P3 — the assembler's own composed pinpoints (corpus-anchored above).
  const composedPins = LIA_COMPOSED_PINPOINTS.map((p) => p.pinpoint);
  return [...new Set([...pinned, ...composedPins, ...verified])];
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
  // DOC 188 P3 — the composed sentences cite the bare pinpoint ("Article
  // 9(1)", "Article 5(1)(c)") while the ledger names the instrument; the
  // iff-cited test therefore accepts the ledger entry when the body carries
  // either the full form or its bare pinpoint. Entries with no instrument
  // suffix (EDPB guidance, decisions) are matched exactly as before.
  const bodyCites = (c: string): boolean => {
    if (assembledBody.includes(c)) return true;
    const bare = bareLiaPinpoint(c);
    return bare !== c && assembledBody.includes(bare);
  };
  const cited = [...new Set(ledger.filter((c) => c && bodyCites(c)))];
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


// DOC 172 (2026-09-04) — THE DETERMINATION SYLLABUS (Syllabus & Record p.1).
// Every value below is a PROJECTION of a determination this assembler already
// made (doc 127 §28 law): the disposition label from `readTypedVerdicts`/
// `verdictIsPositive`, the disposition paragraph = `composeExecLead` exactly
// as composed (the same text `executive_summary:0` carries as its `kind:
// "lead"` block, so the existing renderer suppression already drops the
// duplicate — LIA's spine gives the determination its own lead paragraph,
// unlike DPIA's run-in-labeled chunk). LIA has no typed conditions array and
// no appendix-lettered back matter (Authorities Cited/Persuasive Authority
// are ordinary numbered sections, not "Appendix X"), so `conditions` and
// `record_map` are honestly empty rather than invented.

/** The disposition label the three-part-test verdict already distinguishes
 *  (composeExecLead, above) — restated as the controlled word for the
 *  syllabus's determination table. */
function liaDispositionLabel(v: LiaTypedVerdicts): string {
  if (v.public_authority_bar) return "Not Available";
  const positive = verdictIsPositive(v.outcome);
  if (positive === true) return "Available";
  if (positive === false) return "Not Available";
  return "Determination pending";
}

function verdictRow(label: string, verdict: string, positiveText: string, negativeText: string): readonly [string, string] {
  const p = verdictIsPositive(verdict);
  return [
    label,
    p === true ? positiveText : p === false ? negativeText : "Not resolved on the record",
  ];
}

export function buildLiaSyllabus(
  rendered: RenderedSkeletonDocument,
  v: LiaTypedVerdicts,
  execLead: string,
  values: SlotValues,
  record: Bag,
): SyllabusProjection {
  const str = (k: string): string => {
    const val = (values as Bag)[k];
    return typeof val === "string" ? val.trim() : "";
  };
  const entity = str("organizationName") || "the organisation";
  const disposition = liaDispositionLabel(v);

  const rows: Array<readonly [string, string]> = [
    verdictRow("Purpose test", v.purpose, "The identified interest qualifies as legitimate", "The identified interest does not qualify as legitimate"),
    verdictRow("Necessity test", v.necessity, "The processing is necessary to the identified interest", "The processing is not necessary — a less intrusive means is on the record"),
    verdictRow("Balancing test", v.balancing, "Favours the interest pursued", "Favours the people affected"),
  ];
  if (v.children_in_scope) rows.push(["Children in scope", "Yes — the balancing test accounts for the imbalance this creates"]);
  if (v.public_authority_bar) rows.push(["Public authority bar", "Applies — the basis is unavailable for processing in performance of public tasks"]);

  const dpoReview = str("dpoReviewDate");
  const approval = str("approvalDate");
  const key_dates: Array<readonly [string, string]> = [];
  if (dpoReview) key_dates.push(["DPO review", dpoReview]);
  if (approval) key_dates.push(["Approval", approval]);

  return {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "LEGITIMATE INTERESTS ASSESSMENT · Article 6(1)(f)",
    prepared_for: entity,
    // LIA's intake has no activity-name field at all (unlike Risk/DPIA,
    // where a blank name is the rare degrade case) — a calm, permanent
    // title, not a "not named on the record" gap message that would read
    // as an anomaly on every single report.
    activity: "The Processing Under Assessment",
    subtitle: "Legitimate interests assessment under Article 6(1)(f)",
    disposition_label: "DETERMINATION",
    disposition,
    disposition_tone: dispositionTone(disposition),
    paragraph: execLead,
    rows,
    conditions_heading: "",
    conditions: [],
    key_dates,
    record_map: [],
    running_head: `LEGITIMATE INTERESTS ASSESSMENT · ${entity.toUpperCase()}`,
  };
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
  // PANEL LIA-P3b (2026-08-30, quote-then-deny class) — the boundary sentence
  // ended "until that condition is identified" even where the record NAMES an
  // Art. 9(2) condition elsewhere (the published UK sample records "UK GDPR
  // Art. 9(2)(b) employment-law condition for health data" in its statutory
  // answer). The boundary itself is unchanged — legitimate interests never
  // carries Art. 9 processing — but where a condition is named on the record
  // the sentence acknowledges it instead of implying none was identified.
  // Lexical detection only: an Art. 9(2)(x) pinpoint in the recorded texts.
  const art9ConditionNamed = (() => {
    const m = [s(balancing.statutory_restrictions), s(record.legal_framework), s(balancing.article_9_condition)]
      .join(" ")
      .match(/art(?:icle)?\.?\s*9\(2\)\(([a-z])\)/i);
    return m ? `Article 9(2)(${m[1].toLowerCase()})` : "";
  })();
  const specialCategoryBoundary = scdFlag === true
    ? art9ConditionNamed
      ? `The company has indicated that special-category data is processed. Article 9(1) data cannot rest on legitimate interests alone: an Article 9(2) condition is required in addition to the Article 6 basis. The record names ${art9ConditionNamed} for that processing; the condition falls to be assessed in its own right, and the determination in this assessment does not extend to the special-category processing either way.`
      : "The company has indicated that special-category data is processed. Article 9(1) data cannot rest on legitimate interests alone: an Article 9(2) condition is required in addition to the Article 6 basis, and the determination in this assessment does not extend to that processing until that condition is identified."
    : scdFlag !== false && namedSpecial.length
    ? `The company has named ${asProse(namedSpecial.map((c) => lowerEnumLabel(c)))} among the data categories. Whether ${namedSpecial.length === 1 ? "that category engages" : "those categories engage"} Article 9(1)${bioClause} is not answered on the information provided. Where Article 9(1) is engaged, an Article 9(2) condition is required in addition to the Article 6 basis and legitimate interests alone cannot carry that processing, so the determination in this assessment is bounded accordingly.`
    : "";

  const composed: ComposedBlocks = {
    "executive_summary:0": execLead,
    "executive_summary:2": composeExecPosture(report, org, record),

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
    // PANEL LIA-P1 (2026-08-30) — the marketing conditional used to fire on
    // ANY non-empty statutory_restrictions answer. The intake gates that
    // field on the marketing branch client-side, but the gate
    // (preview_signal.use_case_code) never persists, and a record can carry
    // general statutory restrictions (the published UK sample: Mines
    // Regulations 2014 / HSWA 1974 on a worker-safety interest) — the
    // document then asserted the interest "involves direct marketing" and
    // spliced the legal-framework answer as its marketing position. The
    // conditional now fires only where the recorded interest/purpose text
    // itself signals marketing; otherwise the recorded restrictions render
    // under a neutral, attribution-true lead so the content is never lost.
    "purpose_test:3": s(balancing.statutory_restrictions)
      ? (
        /direct[- ]?marketing|behaviou?ral advertis|electronic marketing|e-?privacy|PECR/i.test(
          [s(purpose.interest_type), s(purpose.interest_type_other), s(purpose.interest_statement), s(record.stated_purpose)].join(" "),
        )
          ? composeConditional(
            "Because the identified interest involves direct marketing, the analysis must also address the rules specific to that activity",
            `The company has recorded its position as ${noStop(s(balancing.statutory_restrictions))}.`,
          )
          : composeConditional(
            "The company has recorded statutory provisions bearing on this processing",
            `Its recorded position is ${noStop(s(balancing.statutory_restrictions))}.`,
          )
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
      minimisationSentence(record),
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
    // BATCH 20a (doc 113 S5.5) — one typed surface, one paragraph: the six
    // parts join with paragraph seams instead of fusing into the 472-word
    // wall. Sentence bytes unchanged.
    "balancing_test:6": [
      s(bag(tpt.balancing_test).analysis),
      s(bag(report.reasonable_expectations).application),
      s(bag(report.potential_harms).application),
      s(bag(report.opt_out_feasibility).application),
      additionalContextSentence(record),
      specialCategoryBoundary,
      precedentClassSentence(report, deterministic),
    ].map((p) => fromTyped(p)).filter(Boolean).join("\n\n"),

    "findings:0": findingsLead,
    // DOC 138 (2026-09-02) — publicAuthorityInformationNeededSentence adds the
    // concrete "what to confirm next" ask right after the pending sentence it
    // explains, and only when the public-authority exclusion is itself
    // unresolved (see the function's header). No-op (empty string, filtered
    // by fromTyped) in every other outcome, including the general
    // multi-factor "open" case and the resolved-either-way cases.
    "findings:1": fromTyped(
      s(bag(report.lia_determination).why),
      publicAuthorityInformationNeededSentence(report),
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
    // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, LIA P1-3) —
    // "approved" without qualification read as if the lawful-basis outcome
    // itself had been signed off, even on a record where that outcome is
    // still undetermined (verdictIsPositive(v.outcome) === null). The
    // approval sentence now says what was approved: the assessment RECORD
    // (the documented analysis) is distinct from the lawful-basis /
    // processing decision, which remains open until the outcome resolves.
    "findings:3": s(attestation.approver_name)
      ? `The assessment record was approved by ${s(attestation.approver_name)}${
        s(attestation.approver_position) ? `, ${s(attestation.approver_position)}` : ""
      }${s(attestation.approval_date) ? `, on ${s(attestation.approval_date)}` : ""}.${
        verdictIsPositive(v.outcome) === null && !v.public_authority_bar
          ? " That approval covers the assessment record itself; the lawful-basis and processing decision remain pending until the outcome above is resolved."
          : ""
      }`
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

  // DOC 137 (2026-09-01) — the ePrivacy/PECR engagement-map overlay
  // (eprivacyOverlayNote, defined above). V2-only: the new "findings:5"
  // block exists only on LIA_SKELETON_SECTIONS_V2 (appended below, v1 stays
  // byte-frozen). Informational/adjacent-obligation note; does not read
  // from or write to v.outcome / three_part_test, so it cannot influence
  // the Art. 6(1)(f) determination, and it never touches eprivacy-gate.ts.
  if (deterministic) {
    // Batch 4ed05f22 — the typed engine's foreclosure flag (readTypedVerdicts)
    // reconciles the overlay's closing sentence with page one.
    const eprivacyNote = eprivacyOverlayNote(report, v.eprivacy_foreclosed);
    // DOC 141 (2026-09-02) — the UK GDPR Art. 6(11)/DUAA recognised-interest
    // overlay (ukArt611OverlayNote, defined above) shares the v2-only
    // "findings:5" generated block: the spine is byte-mirrored into
    // generate-report-pdf, so no new block key exists to target, and the
    // block is [GENERATED, OPTIONAL] — both notes are informational
    // engagement-map overlays that never touch the Art. 6(1)(f)
    // determination. Rendered after the ePrivacy note when both fire.
    const ukArt611Note = ukArt611OverlayNote(report);
    const overlayNotes = [eprivacyNote, ukArt611Note].filter(Boolean).join(" ");
    if (overlayNotes) composed["findings:5"] = overlayNotes;
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
  // DOC 188 P3 — generalised from the Art. 6(1)(f)-only relabel so every
  // GDPR article pinpoint in the ledger (now including the composed
  // Article 9(1)/9(2)/5(1)(c)/6(1)(a) entries) names the UK instrument on a
  // UK-only record. Recitals and guidance entries are untouched.
  const instrumentLabel = (c: string): string =>
    ukOnly ? c.replace(/^(Article \d+(?:\([^)]*\))*) GDPR\b/, "$1 UK GDPR") : c;
  const mixedInstrumentNote = mixedEuUk
    ? "The record puts both the EU GDPR and the UK GDPR in scope. Article 6(1)(f) UK GDPR is materially identical to its EU counterpart, and the analysis in this assessment applies under each instrument; citations follow the EU text, and the UK GDPR applies in parallel to the processing of the UK data subjects."
    : "";
  if (mixedInstrumentNote) composed["the_processing:1"] = mixedInstrumentNote;

  // BATCH 19a (doc 113 S3.1) + BATCH 20a (doc 113 S5.3/S5.4) — the table
  // blocks exist only in the v2 section list (v1 stays byte-frozen for the
  // legacy path), so the keys target v2's appended blocks; on v1 the keys
  // match no table block and the map is inert.
  const tables: SkeletonTables = {
    "executive_summary:3": deriveThreeTestStrip(report),
    "necessity_test:4": deriveAlternativesTable(report),
    "balancing_test:7": deriveBalanceTable(report),
  };

  const args = {
    sections: deterministic ? LIA_SKELETON_SECTIONS_V2 : LIA_SKELETON_SECTIONS,
    title: LIA_SKELETON_TITLE,
    // SO-11 UK-instrument re-pin (2026-08-28) — the instrument renders through
    // the subtitle's {instrumentCitation} slot (buildLiaSlotValues); the
    // assembly-time string replaces this line used to carry are retired.
    subtitle: LIA_SKELETON_SUBTITLE,
    spineVersion: deterministic ? LIA_SKELETON_VERSION_V2 : LIA_SKELETON_VERSION,
    values,
    tables,
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

  const prunedSections = rendered.sections.map((sec) => ({
    ...sec,
    paragraphs: sec.paragraphs
      .map((p) => (p.kind === "skeleton" ? { ...p, text: pruneOrphanSubheads(p.text) } : p))
      // BATCH 19a (doc 113 S3.1) — table paragraphs carry no text by
      // design; the empty-text prune must not drop them.
      .filter((p) => p.kind === "table" || p.text.trim().length > 0),
  }));
  const preSyllabusDocument: RenderedSkeletonDocument = { ...rendered, sections: prunedSections };
  // DOC 172 (2026-09-04) — the Determination Syllabus (page 1 of the
  // Syllabus & Record presentation) attached as a projection of the
  // determinations above. Additive: sections, hash and conformance are
  // untouched; a renderer that does not know the field ignores it.
  const document: RenderedSkeletonDocument = {
    ...preSyllabusDocument,
    syllabus: buildLiaSyllabus(preSyllabusDocument, v, execLead, values, record),
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
