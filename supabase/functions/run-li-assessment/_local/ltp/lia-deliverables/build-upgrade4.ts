/**
 * UPGRADE-4 — builder for the eleven ICO three-part-arc LIA deliverables.
 *
 * PURITY LAW: pure function of the record object. No I/O, no clock, no env;
 * never throws — a builder fault degrades the envelope rather than aborting.
 *
 * SINGLE-WRITER LAW: this module is the ONLY producer of
 *   report.interest_legitimacy, report.benefit_and_beneficiary,
 *   report.alternatives_considered, report.relationship_with_individual,
 *   report.scale_frequency_duration, report.potential_harms,
 *   report.opt_out_feasibility and report.attestation_block.
 * The model narrates around them; it never overwrites them.
 *
 * ANALYSIS SHAPE LAW: STANDARD (verbatim registry text) -> RECORD FACT ->
 * APPLICATION -> VERDICT. Identical to build.ts (ITEM 311).
 *
 * DEGRADATION LAW: a finding the record cannot support is emitted with
 * `status: "record_insufficient"` and a SPECIFIC `information_needed`. It is
 * never omitted and never filled with invention.
 */
import {
  ANCHOR_KEYS,
  BENEFICIARY_CLASSES,
  DEFAULT_REVIEW_TRIGGERS,
  GENERIC_BENEFIT_LEXICON,
  OPT_OUT_CONDITIONAL,
  OPT_OUT_UNAVAILABLE,
  OPT_OUT_UNCONDITIONAL,
  OPT_OUT_UNCONDITIONAL_NEGATED,
  PURPOSE_BUNDLING_CONNECTOR,
  PURPOSE_CATEGORIES,
  RELATIONSHIP_CATEGORIES,
  SPECULATIVE_LEXICON,
  row,
} from "./elements.ts";
import { liaVerdictLabel } from "../../prose/plans/lia.spine.ts";
import type {
  AlternativeConsidered,
  AlternativesConsideredFinding,
  BeneficiaryClass,
  BenefitAndBeneficiaryFinding,
  DeliverableStatus,
  HarmSeverity,
  InterestLegitimacyFinding,
  InterestLegitimacySubTest,
  InterestLegitimacyVerdict,
  LiaApprover,
  LiaAttestationBlock,
  LiaDpoReview,
  LiaUpgrade4Deliverables,
  OptOutFeasibility,
  OptOutFeasibilityFinding,
  PotentialHarm,
  PotentialHarmsFinding,
  RelationshipCategory,
  RelationshipFinding,
  ScaleDimension,
  ScaleFrequencyDurationFinding,
  SubVerdict,
} from "./types.ts";

export const LIA_UPGRADE4_VERSION = "lia-upgrade4-2026-08-03";

// ---------------------------------------------------------------------
// Record readers (no I/O) — mirrors build.ts
// ---------------------------------------------------------------------
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function arr(v: unknown): string[] {
  return Array.isArray(v)
    ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
    : [];
}

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function matches(text: string, res: readonly RegExp[]): boolean {
  return res.some((re) => re.test(text));
}

function anchor(key: keyof typeof ANCHOR_KEYS): { citation: string; verbatim: string } {
  const r = row(ANCHOR_KEYS[key]);
  return { citation: r?.subsection ?? "", verbatim: r?.verbatim_quote ?? "" };
}

/**
 * Bundled-purpose detector (EDPB Guidelines 1/2024 ¶10 — reliance on Art.
 * 6(1)(f) "should not encompass several purposes without assessing the
 * validity of the legal basis for each of them"). Conservative by design:
 * flags only when the statement names two DIFFERENT PURPOSE_CATEGORIES
 * concepts split across an explicit connector, never on a bare co-occurrence
 * of two category words anywhere in the sentence. No new intake field —
 * reads only purpose_details.interest_statement against the same 7
 * categories the intake's own interest_type select already offers.
 */
function detectPurposeBundling(statement: string): { a: string; b: string } | null {
  // A statement can carry an unrelated "and" before the connector that
  // actually joins the two purposes (e.g. "device and browsing data to
  // detect fraud and also to power marketing") — every connector occurrence
  // is checked, not just the first.
  const re = new RegExp(PURPOSE_BUNDLING_CONNECTOR.source, "gi");
  let conn: RegExpExecArray | null;
  while ((conn = re.exec(statement))) {
    const before = statement.slice(0, conn.index);
    const after = statement.slice(conn.index + conn[0].length);
    const beforeCats = PURPOSE_CATEGORIES.filter((c) => c.match.test(before));
    const afterCats = PURPOSE_CATEGORIES.filter((c) => c.match.test(after));
    for (const b of beforeCats) {
      for (const a of afterCats) {
        if (b.id !== a.id) return { a: b.label, b: a.label };
      }
    }
  }
  return null;
}

/** Lower-cases the first character so a verbatim quote can be run into prose. */
function lc(s: string): string {
  return s ? `${s.charAt(0).toLowerCase()}${s.slice(1)}` : s;
}

/** 3E9AD759-L2 — the first COMPLETE sentence, stop-boundary aware: a stop
 *  counts only when followed by whitespace or end-of-string, so a dot inside
 *  a token ("Tenable.io", "v2.1") never truncates mid-word. Trailing stop
 *  removed so the result can run inside a parenthetical.
 *  D1D2B3B8-L1 (2026-08-28) — NEVER cut mid-word: the earlier char-cap
 *  fallback sliced a long first sentence at 260 characters and the live
 *  batch shipped "…that cause injury, property d)" mid-word. The first
 *  sentence is taken WHOLE however long it is; only a stop-less text is
 *  bounded, and then at a word boundary. */
function firstSentenceSafe(text: string, max = 400): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/);
  if (m) return m[0].trim().replace(/[.!?]$/, "");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim();
}

// =====================================================================
// PURPOSE STAGE
// =====================================================================

// (a) interest_legitimacy — EDPB 1/2024 three cumulative conditions
// ---------------------------------------------------------------------
export function buildInterestLegitimacy(intake: unknown): InterestLegitimacyFinding {
  const std = anchor("edpb_three_conditions");
  const support = anchor("edpb_li_qualities");
  const basis = anchor("li_basis");

  const statement = str(get(intake, "purpose_details.interest_statement"));
  const typeRaw = str(get(intake, "purpose_details.interest_type"));
  const typeOther = str(get(intake, "purpose_details.interest_type_other"));
  /**
   * ITEM 385 seam repair (c) — prose reasons from the interest's SUBSTANCE,
   * never from the stored option value. "Other" is a form affordance, not a
   * category of interest: when the record picks it, the substance is the
   * free-text description beside it, and where that is missing the type
   * contributes nothing to reason from.
   */
  const typeIsOther = /^other\b/i.test(typeRaw);
  const interestType = typeIsOther ? typeOther : typeRaw;
  const statedPurpose = str(get(intake, "stated_purpose"));
  const description = str(get(intake, "processing_description"));
  const anchorLine = str(get(intake, "subject_anchor"));

  const factParts: string[] = [];
  factParts.push(
    statement
      ? `The record states the interest as: "${statement}".`
      : "The record does not state, in the controller's own words, the interest relied on.",
  );
  factParts.push(
    interestType
      ? `The interest it relies on is ${interestType.toLowerCase().replace(/\.$/, "")}.`
      : "It does not describe the kind of interest relied on.",
  );
  factParts.push(
    statedPurpose
      ? `The purpose as it would be stated to data subjects reads: "${statedPurpose}".`
      : "It does not record how the purpose would be stated to data subjects.",
  );
  factParts.push(
    description
      ? "The processing itself is described in the record."
      : "The processing itself is not described in the record.",
  );
  const record_fact = factParts.join(" ");

  const speculativeSource = [statement, statedPurpose, description, anchorLine]
    .filter(Boolean)
    .join(" ");

  // -- sub-test 1: lawful ------------------------------------------------
  let lawfulVerdict: SubVerdict;
  let lawfulReasoning: string;
  let lawfulNeeded: string | undefined;
  if (!interestType && !statement) {
    lawfulVerdict = "undetermined_on_the_record";
    lawfulReasoning =
      "The first condition asks whether the interest pursued is lawful. The record names neither the interest nor its type, so there is nothing against which lawfulness can be tested.";
    lawfulNeeded =
      "purpose_details.interest_statement and purpose_details.interest_type — the interest relied on, in the controller's own words, and the category it falls into.";
  } else if (interestType) {
    lawfulVerdict = "met";
    lawfulReasoning =
      `The interest the record relies on is ${interestType.toLowerCase().replace(/\.$/, "")} — a category of interest the Regulation contemplates a controller pursuing under Article 6(1)(f); nothing in the record puts the interest itself outside the law. This sub-test addresses lawfulness of the interest only — it does not resolve whether the processing that serves it is necessary or whether the balance falls in the controller's favour.`;
  } else {
    lawfulVerdict = "undetermined_on_the_record";
    lawfulReasoning =
      `The record states the interest ("${statement}") but does not classify it, so its lawfulness is asserted rather than shown. The interest as stated is not unlawful on its face; that is a weaker finding than the condition requires.`;
    lawfulNeeded =
      "purpose_details.interest_type — the category of interest relied on, and any sector rule that bears on whether pursuing it is lawful for this controller.";
  }

  // -- sub-test 2: clearly and precisely articulated ---------------------
  let clearVerdict: SubVerdict;
  let clearReasoning: string;
  let clearNeeded: string | undefined;
  const wordCount = statement.split(/\s+/).filter(Boolean).length;
  const bundling = statement ? detectPurposeBundling(statement) : null;
  if (!statement) {
    clearVerdict = "undetermined_on_the_record";
    clearReasoning =
      "The second condition asks whether the interest is clearly and precisely articulated. The record contains no articulation of the interest to test.";
    clearNeeded =
      "purpose_details.interest_statement — the interest itself, stated specifically enough that a reader can tell what is being pursued and for whom.";
  } else if (bundling) {
    // EDPB Guidelines 1/2024 ¶10: reliance on Art. 6(1)(f) "should not
    // encompass several purposes without assessing the validity of the
    // legal basis for each of them." An undetermined verdict (not a flat
    // not_met) — advocate-drafter voice, never an auditor "does not meet
    // this standard" (index.ts PROPORTIONATE ASKS / OUTPUT-ABSENCE rules).
    clearVerdict = "undetermined_on_the_record";
    clearReasoning =
      `The interest is recorded as "${statement}", which reads as naming two distinct interests — ${bundling.a} and ${bundling.b} — within a single articulation. The perimeter of a single legitimate interest must be clearly identified so it can be properly balanced (EDPB Guidelines 1/2024, ¶10), and where a controller processes for more than one purpose, the legal basis is assessed separately for each; this record does not yet present each interest with its own necessity and balancing basis.`;
    clearNeeded =
      "purpose_details.interest_statement — this record's necessity_details and balancing_details each hold one interest's basis, so the direct way to complete this record is to restate it for the single interest being assessed here; where more than one interest is genuinely pursued, run a separate assessment per interest so each gets its own recorded necessity and balancing basis.";
  } else if (wordCount < 5) {
    clearVerdict = "not_met";
    clearReasoning =
      `The interest is recorded as "${statement}" — a label rather than an articulation. A label names a department or an activity class; the condition asks for the interest itself, in terms specific enough that the necessity and balancing limbs can be run against it.`;
    clearNeeded =
      "purpose_details.interest_statement — expand the entry so it states what is pursued, for whom, and in what circumstances.";
  } else {
    clearVerdict = "met";
    clearReasoning =
      `The record articulates the interest in terms a reader can test: "${statement}". That articulation is specific enough for the necessity limb to be run against it, which is what this condition exists to secure.`;
  }

  // -- sub-test 3: real and present -------------------------------------
  let presentVerdict: SubVerdict;
  let presentReasoning: string;
  let presentNeeded: string | undefined;
  const speculative = matches(speculativeSource, SPECULATIVE_LEXICON);
  if (!description && !statedPurpose) {
    presentVerdict = "undetermined_on_the_record";
    presentReasoning =
      "The third condition asks whether the interest is real and present rather than speculative. The record describes neither the processing nor the purpose as it would be stated to data subjects, so the record names no present activity to weigh.";
    presentNeeded =
      "processing_description — what is actually done today, to whose data, and with what output.";
  } else if (speculative) {
    presentVerdict = "not_met";
    presentReasoning =
      "The record describes the interest in prospective terms — an intention or a possibility rather than an activity under way. An interest that is not yet real and present cannot be weighed against the data subjects' interests, because there is nothing on the controller's side of the balance yet.";
    presentNeeded =
      "processing_description — confirm whether the processing is live today; if it is planned, record the intended start and assess it again at that point.";
  } else {
    presentVerdict = "met";
    presentReasoning =
      "The record describes processing that is under way and a purpose the controller is pursuing now, not one it may pursue later. The interest is therefore real and present for the purpose of this condition.";
  }

  const sub_tests: InterestLegitimacySubTest[] = [
    {
      id: "lawful",
      label: "The interest pursued is lawful",
      verdict: lawfulVerdict,
      reasoning: lawfulReasoning,
      ...(lawfulNeeded ? { information_needed: lawfulNeeded } : {}),
    },
    {
      id: "clearly_articulated",
      label: "The interest is clearly and precisely articulated",
      verdict: clearVerdict,
      reasoning: clearReasoning,
      ...(clearNeeded ? { information_needed: clearNeeded } : {}),
    },
    {
      id: "real_and_present",
      label: "The interest is real and present, not speculative",
      verdict: presentVerdict,
      reasoning: presentReasoning,
      ...(presentNeeded ? { information_needed: presentNeeded } : {}),
    },
  ];

  const anyNotMet = sub_tests.some((t) => t.verdict === "not_met");
  const anyOpen = sub_tests.some((t) => t.verdict === "undetermined_on_the_record");
  let verdict: InterestLegitimacyVerdict;
  let status: DeliverableStatus = "analysed";
  let information_needed: string | undefined;
  if (anyNotMet) {
    verdict = "legitimate_interest_not_established";
  } else if (anyOpen) {
    verdict = "undetermined_on_the_record";
    status = "record_insufficient";
    information_needed = sub_tests
      .map((t) => t.information_needed)
      .filter(Boolean)
      .join(" ");
  } else {
    verdict = "legitimate_interest_established";
  }

  const cumulative_note =
    "The three conditions are cumulative. A condition recorded as not met, or left open, is not offset by the other two; the first limb of Article 6(1)(f) fails or remains unresolved until that condition is answered.";

  // QB-REPAIR-3 (2026-08-27) — live batch 510a9953 flagged the earlier
  // imperative form as a leaked instruction; reworded to declarative.
  // 3E9AD759-L2 (2026-08-27) — the walk names each condition and carries its
  // own recorded reasoning (batch 3e9ad759 flagged the bare "the first
  // condition is met, the second is met, and the third is met" as analysis
  // that reads identically on any record). Every clause is the sub-test's
  // OWN reasoning verbatim-trimmed — nothing is re-judged here.
  const ordinal = ["first", "second", "third"] as const;
  const conditionWalk = sub_tests
    .map((t, i) => {
      const why = firstSentenceSafe(t.reasoning);
      return `the ${ordinal[i]} — ${t.label.charAt(0).toLowerCase()}${t.label.slice(1)} — is ${liaVerdictLabel(t.verdict)}${why ? ` (${why})` : ""}`;
    })
    .join("; ");
  // 2026-08-29 — the actual multi-purpose fix lives in sub-test 2 above
  // (detectPurposeBundling), not here: a bundled statement now surfaces
  // through clearVerdict/clearNeeded and the existing information_needed
  // path, per the Target/Old/New comparison in doc 105. This walk stays a
  // verbatim-trim of each sub-test's own reasoning; nothing re-judged here.
  const application =
    `${lc(std.verbatim) ? `The Guidelines put the test cumulatively: ${std.verbatim} ` : ""}Taken condition by condition on what this record states, ${conditionWalk}. ${cumulative_note} On that basis the first limb of Article 6(1)(f) is recorded as: ${liaVerdictLabel(verdict)}.`;

  return {
    standard: std.verbatim || basis.verbatim,
    standard_citation: std.citation || "EDPB Guidelines 1/2024, Section II",
    record_fact,
    application,
    verdict,
    sub_tests,
    cumulative_note,
    supporting_citation: support.citation || "EDPB Guidelines 1/2024, Section II.A",
    supporting_verbatim: support.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// (b) benefit_and_beneficiary
// ---------------------------------------------------------------------
export function buildBenefitAndBeneficiary(intake: unknown): BenefitAndBeneficiaryFinding {
  const std = anchor("edpb_li_qualities");
  const support = anchor("purpose_limitation");

  const benefit = str(get(intake, "purpose_details.specific_benefit"));
  const beneficiaryRaw = str(get(intake, "purpose_details.beneficiary"));
  const holder = str(get(intake, "purpose_details.interest_holder"));
  const holderOther = str(get(intake, "purpose_details.interest_holder_other"));
  const beneficiarySource = [beneficiaryRaw, holder, holderOther].filter(Boolean).join(" ");

  const beneficiaries: BeneficiaryClass[] = [];
  const beneficiary_labels: string[] = [];
  for (const c of BENEFICIARY_CLASSES) {
    if (beneficiarySource && c.match.test(beneficiarySource)) {
      beneficiaries.push(c.id as BeneficiaryClass);
      beneficiary_labels.push(c.label);
    }
  }

  const benefit_is_generic = !!benefit && matches(benefit, GENERIC_BENEFIT_LEXICON);

  const factParts: string[] = [];
  factParts.push(
    benefit
      ? `The record states the benefit as: "${benefit}".`
      : "The record does not state what specific benefit the processing delivers.",
  );
  factParts.push(
    beneficiarySource
      ? `On who receives that benefit it records: "${beneficiarySource}".`
      : "It does not state who receives the benefit.",
  );
  const record_fact = factParts.join(" ");

  let status: DeliverableStatus = "analysed";
  let information_needed: string | undefined;
  let application: string;

  if (!benefit && !beneficiaries.length) {
    status = "record_insufficient";
    application =
      "The balancing test weighs a benefit against an intrusion. The record identifies neither the specific benefit nor the class that receives it, so there is nothing on the controller's side of the scale to weigh, and the benefit cannot be assessed here.";
    information_needed =
      "purpose_details.specific_benefit and purpose_details.beneficiary — what concrete benefit this processing delivers, and whether it accrues to the business, to the data subjects themselves, or to a third party.";
  } else if (!benefit) {
    status = "record_insufficient";
    application =
      `The record names ${beneficiary_labels.join(" and ")} as receiving the benefit but does not say what the benefit is. Naming a recipient without naming the benefit leaves the controller's side of the balance unquantified.`;
    information_needed =
      "purpose_details.specific_benefit — the concrete outcome this processing produces, stated so a reader can weigh it against the intrusion described in the balancing section.";
  } else if (!beneficiaries.length) {
    status = "record_insufficient";
    application =
      `The record states a benefit — "${benefit}" — but does not identify the class that receives it. Where the benefit accrues matters: a benefit to the data subjects themselves sits differently in the balance from a benefit that accrues only to the controller or to a third party.`;
    information_needed =
      "purpose_details.beneficiary — whether the benefit accrues to the controller's business, to the data subjects, or to a third party, and where it is shared, in what proportion.";
  } else if (benefit_is_generic) {
    application =
      `The record identifies ${beneficiary_labels.join(" and ")} as the beneficiary, but the benefit is stated in terms that would fit any processing: "${benefit}". A benefit expressed at that level cannot be weighed against a specific intrusion, so it is recorded as stated and carries correspondingly little weight in the balance below.`;
    information_needed =
      "purpose_details.specific_benefit — restate the benefit in terms particular to this processing: what changes, by how much, and for whom.";
  } else {
    application =
      `The record states a benefit particular to this processing — "${benefit}" — and identifies ${beneficiary_labels.join(" and ")} as receiving it. Both sides of the balance therefore have a named quantity, and the balancing analysis below weighs this benefit against the intrusion the record describes.`;
  }

  return {
    standard: std.verbatim,
    standard_citation: std.citation || "EDPB Guidelines 1/2024, Section II.A",
    record_fact,
    application,
    benefit,
    beneficiaries,
    beneficiary_labels,
    benefit_is_generic,
    supporting_citation: support.citation || "GDPR Art. 5(1)(b)",
    supporting_verbatim: support.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// =====================================================================
// NECESSITY STAGE
// =====================================================================

/** Splits a free-text alternatives entry into alternative -> rationale rows.
 *
 * QB-REPAIR-4 (2026-08-27) — live batch 510a9953: three separate LIA
 * documents were flagged rubric_unsupported_business_claim for stating
 * "Of the 9 alternatives the record lists…" / "6 alternatives…" /
 * "8 alternatives…" when the intake plainly named 3, 2, and 3 respectively.
 * Root cause: the sentence-boundary fallback split (added for prose that
 * lists alternatives without newlines) splits on EVERY ". " + capital-letter
 * boundary, so a single alternative's multi-sentence rationale ("Manual
 * route logging — highly error-prone. It also does not scale beyond ten
 * drivers.") fragments into one real alternative plus one bogus
 * rationale_recorded:false entry per extra sentence, inflating the count
 * 2-3x. A fragment that fails the "label — reason" match (`m` below) is far
 * more often a continuation of the PRECEDING alternative's rationale than a
 * genuinely new, unexplained alternative — a real bare-label alternative
 * (no reason at all) is what the newline/semicolon-delimited primary case
 * already handles cleanly. So: a non-matching fragment merges into the
 * previous entry's why_inadequate instead of becoming its own alternative;
 * only a non-matching fragment with no preceding entry (the first line of
 * the field) still starts a new bare-label alternative, preserving the
 * existing "alternatives listed with zero reasons" branch below.
 */
// D1D2B3B8-L5 (2026-08-28) — a line that POINTS AT another intake field by
// name ("As detailed in alternatives_considered, …", "… rejected as described
// in alternatives_rationale") is narrative cross-reference, not an
// alternative. Both live documents parsed such a pointer into a bogus
// rationale_recorded:false entry and then reported a comparison gap the
// record does not have ("the alternative left unexplained — As detailed in
// alternatives_considered, manual inspections… — remains open"). The pointed-
// at field's own content is in the parse input (see the join in
// buildAlternativesConsidered), so the pointer line itself is skipped.
const FIELD_POINTER_RE =
  /\b(?:alternatives?_considered|alternatives?_rationale|necessity_details|why_consent_not_used)\b/i;

// E8973164 (2026-08-28, flagged HIGH twice) — a fixture that spells out each
// alternative as "Alternative considered: <X>. Rejected because: <Y>." inside
// one long run-on paragraph (rather than one alternative per line/sentence —
// the shape every other known fixture uses, e.g. "Manual inspections —
// sample only 2% of routes...") is shredded by the generic sentence-boundary
// line splitter below: every internal sentence break inside <X> or <Y>
// produces its own "line", and the marker words "Alternative considered"
// and "Rejected because" each independently trip the generic label:reason
// regex (they contain a colon/"because"), turning ONE real alternative into
// several bogus ones. Five real alternatives came out as fourteen, with a
// rationale the record does actually give reported as missing (QB-REPAIR-4
// patched a related but distinct fragmentation mode — non-matching
// continuations — and does not cover fragments that spuriously MATCH).
// The explicit marker pair is recognised and extracted directly, bypassing
// the heuristic splitter entirely for text written in this format.
const ALT_MARKER_PAIR_RE =
  /Alternative\s+considered\s*:\s*([\s\S]*?)\s*Rejected\s+because\s*:\s*([\s\S]*?)(?=\n\n|Alternative\s+considered\s*:|$)/gi;

function parseAlternatives(text: string): AlternativeConsidered[] {
  if (!text) return [];
  if (/Alternative\s+considered\s*:/i.test(text)) {
    const pairs: AlternativeConsidered[] = [];
    for (const m of text.matchAll(ALT_MARKER_PAIR_RE)) {
      const alt = m[1].trim().replace(/[.,;]$/, "");
      const why = m[2].trim();
      if (alt && why) pairs.push({ alternative: alt, why_inadequate: why, rationale_recorded: true });
    }
    if (pairs.length) return pairs;
  }
  const lines = text
    .split(/\r?\n|(?<=[.;])\s+(?=[A-Z(])/)
    .map((l) => l.replace(/^[\s•\-*\d.)]+/, "").trim())
    .filter((l) => l.length > 2)
    .filter((l) => !FIELD_POINTER_RE.test(l));
  const out: AlternativeConsidered[] = [];
  for (const line of lines) {
    const m = line.match(
      /^(.*?)(?:\s*[—–]\s*|\s*:\s*|\s+because\s+|\s+but\s+|\s+however\s+|\s+which\s+would\s+)(.+)$/i,
    );
    if (m && m[1].trim() && m[2].trim()) {
      out.push({
        alternative: m[1].trim().replace(/[.,;]$/, ""),
        why_inadequate: m[2].trim(),
        rationale_recorded: true,
      });
    } else if (out.length > 0) {
      const prev = out[out.length - 1];
      // Merge into the preceding entry's reason when it has one; a
      // continuation of a bare label (no reason recorded at all) is
      // dropped rather than promoted into its own spurious alternative.
      if (prev.why_inadequate) out[out.length - 1] = { ...prev, why_inadequate: `${prev.why_inadequate} ${line}` };
    } else {
      out.push({ alternative: line.replace(/[.,;]$/, ""), why_inadequate: "", rationale_recorded: false });
    }
  }
  return out;
}

export function buildAlternativesConsidered(intake: unknown): AlternativesConsideredFinding {
  const std = anchor("edpb_necessity");
  const support = anchor("edpb_2019_less_intrusive");

  // D1D2B3B8-L5 (2026-08-28) — BOTH fields feed the parse, not first-wins:
  // the old `||` dropped alternatives_considered whenever
  // necessity_details.alternatives was present, so an intake carrying a
  // summary line in the latter and the detailed per-alternative reasons in
  // the former lost every detailed reason and the document reported a false
  // comparison gap. Containment guard: skip the second field when its text
  // is already inside the first (some intakes mirror one into the other).
  const necAlts = str(get(intake, "necessity_details.alternatives"));
  const flatAlts = str(get(intake, "alternatives_considered"));
  const alternativesText = [
    necAlts,
    flatAlts && !necAlts.includes(flatAlts) ? flatAlts : "",
  ].filter(Boolean).join("\n");
  const rationaleText = str(get(intake, "necessity_details.alternatives_rationale"));
  const whyConsent = str(get(intake, "necessity_details.why_consent_not_used"));

  const alternatives = parseAlternatives([alternativesText, rationaleText].filter(Boolean).join("\n"));
  const consent_addressed = !!whyConsent ||
    alternatives.some((a) => /\bconsent\b/i.test(`${a.alternative} ${a.why_inadequate}`));

  if (whyConsent && !alternatives.some((a) => /\bconsent\b/i.test(a.alternative))) {
    alternatives.push({
      alternative: "Obtaining consent under Article 6(1)(a)",
      why_inadequate: whyConsent,
      rationale_recorded: true,
    });
  }

  // PANEL LIA-P3 (2026-08-30) — CROSS-FIELD PARAPHRASE DEDUP. D1D2B3B8-L5
  // made BOTH alternative fields feed the parse (first-wins had dropped the
  // detailed reasons), but an intake that describes the SAME alternatives in
  // three renditions (a summary line, a numbered compact list, and expanded
  // per-alternative reasons) then listed every rendition as its own
  // alternative — the published UK sample walked ~8 "alternatives" for 3
  // real ones, with ";;" artifacts where source lines carried their own
  // trailing semicolons. Two purely lexical rules:
  //   (1) an entry whose label contains the labels of two or more OTHER
  //       entries is a summary line and is dropped;
  //   (2) entries whose labels share >=60% of their (shorter side's) tokens
  //       are the same alternative — keep one, with the longer reason.
  // Plus seam hygiene: trailing ;/,/. stripped from each reason.
  {
    const norm = (t: string) => t.toLowerCase().replace(/\(\d+\)/g, " ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const toks = (t: string) => new Set(norm(t).split(" ").filter((w) => w.length > 2));
    const overlap = (a: Set<string>, b: Set<string>) => {
      const small = a.size <= b.size ? a : b;
      const big = a.size <= b.size ? b : a;
      if (small.size === 0) return 0;
      let hit = 0;
      for (const w of small) if (big.has(w)) hit++;
      return hit / small.size;
    };
    const trimmed = alternatives.map((a) => ({
      alternative: a.alternative,
      why_inadequate: a.why_inadequate.replace(/[\s;,.]+$/, ""),
      rationale_recorded: a.rationale_recorded,
    }));
    const summaryIdx = new Set<number>();
    for (let i = 0; i < trimmed.length; i++) {
      let contained = 0;
      for (let j = 0; j < trimmed.length; j++) {
        if (i === j) continue;
        const nj = norm(trimmed[j].alternative);
        if (nj && norm(trimmed[i].alternative).includes(nj)) contained++;
      }
      if (contained >= 2) summaryIdx.add(i);
    }
    const kept: { alternative: string; why_inadequate: string; rationale_recorded: boolean }[] = [];
    for (let i = 0; i < trimmed.length; i++) {
      if (summaryIdx.has(i)) continue;
      const cand = trimmed[i];
      const dupIdx = kept.findIndex((k) => overlap(toks(k.alternative), toks(cand.alternative)) >= 0.6);
      if (dupIdx === -1) {
        kept.push({ ...cand });
        continue;
      }
      const dup = kept[dupIdx];
      kept[dupIdx] = {
        alternative: cand.why_inadequate.length > dup.why_inadequate.length && cand.alternative.length > dup.alternative.length
          ? cand.alternative
          : dup.alternative,
        why_inadequate: cand.why_inadequate.length > dup.why_inadequate.length ? cand.why_inadequate : dup.why_inadequate,
        rationale_recorded: dup.rationale_recorded || cand.rationale_recorded,
      };
    }
    alternatives.length = 0;
    alternatives.push(...kept);
  }

  const count_with_rationale = alternatives.filter((a) => a.rationale_recorded).length;

  const record_fact = alternatives.length
    ? `The record names ${alternatives.length} alternative${alternatives.length === 1 ? "" : "s"} to the processing assessed here, ${count_with_rationale} of which carr${count_with_rationale === 1 ? "ies" : "y"} a recorded reason for being inadequate.${consent_addressed ? " Consent is among the alternatives addressed." : " Consent is not addressed as an alternative."}`
    : "The record names no alternative means of achieving the purpose.";

  let status: DeliverableStatus = "analysed";
  let information_needed: string | undefined;
  let application: string;

  if (!alternatives.length) {
    status = "record_insufficient";
    application =
      "Necessity is not satisfied by the processing being useful. It requires that the purpose cannot reasonably be achieved by a less intrusive means. The record names no alternative and gives no reason why any would fall short, so the necessity limb rests on assertion rather than on a comparison, and it is not assessed here.";
    information_needed =
      "necessity_details.alternatives and necessity_details.alternatives_rationale — each less intrusive means the controller considered, and for each one, why it would not achieve the purpose.";
  } else if (count_with_rationale === 0) {
    status = "record_insufficient";
    application =
      `The record lists ${alternatives.length} alternative${alternatives.length === 1 ? "" : "s"} but records no reason why any of them is inadequate. A list without reasons does not perform the comparison the necessity limb requires: what the standard asks is not whether alternatives were thought about, but why each one would fail to achieve the purpose.`;
    information_needed =
      "necessity_details.alternatives_rationale — for each alternative already listed, the reason it would not achieve the purpose, stated in terms of the outcome that would be lost.";
  } else if (count_with_rationale < alternatives.length) {
    // FD703575-L4 — the unexplained alternatives are NAMED HERE, not promised
    // "below": no rendered surface sets them out individually, so the old
    // sentence promised analysis the document never delivered. Also fixes the
    // "1 do not" agreement error.
    const unexplained = alternatives.filter((a) => !a.rationale_recorded).map((a) => a.alternative);
    const nUnexplained = alternatives.length - count_with_rationale;
    const unexplainedList = unexplained.join("; ");
    application =
      `Of the ${alternatives.length} alternatives the record lists, ${count_with_rationale} carr${count_with_rationale === 1 ? "ies" : "y"} a reason for inadequacy and ${nUnexplained} do${nUnexplained === 1 ? "es" : ""} not. The comparison the necessity limb requires is therefore performed for part of the field only; the alternative${nUnexplained === 1 ? "" : "s"} left unexplained — ${unexplainedList} — remain${nUnexplained === 1 ? "s" : ""} open on the information provided.`;
    information_needed =
      `necessity_details.alternatives_rationale — the reason for inadequacy for: ${unexplainedList}.`;
  } else if (!consent_addressed) {
    application =
      `Every alternative the record names carries a recorded reason for being inadequate, so the comparison the necessity limb requires is performed. Consent, however, is not among the alternatives addressed; where consent could realistically deliver the purpose the necessity analysis is incomplete without it.`;
    information_needed =
      "necessity_details.why_consent_not_used — whether consent under Article 6(1)(a) could deliver this purpose, and if not, what specifically it would fail to achieve.";
  } else {
    // 3E9AD759-L3, form superseded by BATCH 20a (doc 113 S5.3): the
    // comparison is still SHOWN, not asserted — but it shows in the
    // Alternatives table the deterministic document now renders from the
    // typed `alternatives` rows (doc 109 §2.2 item 3 flagged the inline
    // semicolon walk as a 194-word self-repetition of that same data). The
    // walk data is unchanged on `alternatives`; only this sentence's inline
    // restatement retires. Recorded consequence (ledger): the dormant
    // legacy path renders no table and degrades to the assertion form.
    // No table pointer in the sentence: the deterministic path renders the
    // table ADJACENT in the same section, and the dormant legacy path has
    // no table to point to (a pointer there would be a broken reference).
    application =
      `Every alternative the record names, consent included, carries a recorded reason for being inadequate. The necessity limb is therefore supported by a comparison rather than an assertion: the comparison identifies what else was available and what each option would have failed to achieve.`;
  }

  return {
    standard: std.verbatim,
    standard_citation: std.citation || "EDPB Guidelines 1/2024, Section II.B",
    record_fact,
    application,
    alternatives,
    count_with_rationale,
    consent_addressed,
    supporting_citation: support.citation || "EDPB Guidelines 2/2019, § 2.4",
    supporting_verbatim: support.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// =====================================================================
// BALANCING STAGE
// =====================================================================

// (d) relationship_with_individual
// ---------------------------------------------------------------------
export function buildRelationshipWithIndividual(intake: unknown): RelationshipFinding {
  const std = anchor("r47_relationship");
  const support = anchor("edpb_re_contextual");

  const explicit = str(get(intake, "balancing_details.relationship_category"));
  const derived = str(get(intake, "relationship_type"));
  const source = explicit || derived;

  let category: RelationshipCategory = "undetermined_on_the_record";
  let category_label = "not stated";
  for (const c of RELATIONSHIP_CATEGORIES) {
    if (source && c.match.test(source)) {
      category = c.id as RelationshipCategory;
      category_label = c.label;
      break;
    }
  }

  const explicitly_recorded = !!explicit;
  const power_imbalance = category === "employee";

  const record_fact = explicit
    ? `The record names the relationship category directly: "${explicit}".${derived && derived !== explicit ? ` The intake also records the relationship type as "${derived}".` : ""}`
    : derived
    ? `The record does not name a relationship category for the balancing test. It records the relationship type as "${derived}", which is used here and marked as derived rather than stated.`
    : "The record states neither a relationship category nor a relationship type.";

  let status: DeliverableStatus = "analysed";
  let information_needed: string | undefined;
  let application: string;

  if (category === "undetermined_on_the_record") {
    status = "record_insufficient";
    application =
      "Recital 47 makes the relationship between controller and data subject a direct input to what the data subject can reasonably expect. The record does not place the data subjects in a relationship category, so the expectations factor below runs without the input the Recital treats as central, and this finding is left open rather than inferred.";
    information_needed =
      "balancing_details.relationship_category — whether the data subjects are customers, employees, prospects, or members of the public with no prior relationship, and when that relationship began.";
  } else if (power_imbalance) {
    application =
      `The record places the data subjects in the ${category_label} relationship. That relationship carries a recognised imbalance of power: an employee cannot freely decline processing carried out by an employer, so what an employee tolerates is not evidence of what an employee expects. This category is carried into the reasonable-expectations finding as a stated input, and it raises rather than lowers the weight on the data subjects' side of the balance.`;
  } else if (category === "public") {
    application =
      `The record places the data subjects in the ${category_label} category — that is, individuals with no prior relationship with the controller. Recital 47 treats the relationship as the source of expectation; where there is none, there is no relationship from which the processing could have been anticipated, and the expectations factor cannot draw support from it.`;
  } else {
    application =
      `The record places the data subjects in the ${category_label} relationship. Recital 47 asks what a data subject in that relationship could reasonably expect at the time the data were collected, so the category is carried into the reasonable-expectations finding as a stated input rather than being inferred from the processing description.`;
    if (!explicitly_recorded) {
      information_needed =
        "balancing_details.relationship_category — confirm the relationship category directly; it is derived here from the recorded relationship type.";
    }
  }

  return {
    standard: std.verbatim,
    standard_citation: std.citation || "GDPR Recital 47",
    record_fact,
    application,
    category,
    category_label,
    explicitly_recorded,
    power_imbalance,
    supporting_citation: support.citation || "EDPB Guidelines 1/2024, Section II.C.3",
    supporting_verbatim: support.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// (e) scale_frequency_duration
// ---------------------------------------------------------------------
const LARGE_SCALE_LEXICON: readonly RegExp[] = [
  /\bmillions?\b/i,
  /\ball (customers|users|employees|visitors)\b/i,
  /\bentire (customer base|workforce|database)\b/i,
  /\b\d{2,3}[,.]\d{3}\b/,
  /\blarge[- ]scale\b/i,
];

export function buildScaleFrequencyDuration(intake: unknown): ScaleFrequencyDurationFinding {
  const std = anchor("data_minimisation");
  const support = anchor("edpb_re_contextual");

  const scale = str(get(intake, "balancing_details.scale_approx"));
  const frequency = str(get(intake, "balancing_details.frequency"));
  const duration = str(get(intake, "balancing_details.duration"));

  const dimensions: ScaleDimension[] = [
    {
      id: "scale",
      label: "Scale — approximately how many data subjects",
      recorded: scale,
      status: scale ? "analysed" : "record_insufficient",
    },
    {
      id: "frequency",
      label: "Frequency — how often the processing runs",
      recorded: frequency,
      status: frequency ? "analysed" : "record_insufficient",
    },
    {
      id: "duration",
      label: "Duration — how long the data are held for this purpose",
      recorded: duration,
      status: duration ? "analysed" : "record_insufficient",
    },
  ];
  const dimensions_recorded = dimensions.filter((d) => d.recorded).length;
  const large_scale_indicated = matches([scale, frequency].join(" "), LARGE_SCALE_LEXICON);

  const record_fact = dimensions_recorded
    ? dimensions
      .map((d) => d.recorded ? `${d.id}: "${d.recorded}"` : `${d.id}: not stated`)
      .join("; ") + "."
    : "The record states neither the scale, the frequency, nor the duration of the processing.";

  let status: DeliverableStatus = "analysed";
  let information_needed: string | undefined;
  let application: string;

  if (dimensions_recorded === 0) {
    status = "record_insufficient";
    application =
      "The intrusion a processing operation causes is a function of how many people it reaches, how often it runs, and how long the data are held. The record supplies none of the three, so the intrusion cannot be sized and the balance below is stated subject to that.";
    information_needed =
      "balancing_details.scale_approx, balancing_details.frequency and balancing_details.duration — approximately how many data subjects are affected, how often the processing runs, and how long the personal data are retained for this purpose.";
  } else if (dimensions_recorded < 3) {
    status = "record_insufficient";
    const missing = dimensions.filter((d) => !d.recorded).map((d) => d.id);
    application =
      `The record sizes the processing on ${dimensions_recorded} of the three dimensions the balance turns on. What is recorded is set out below; ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} absent, so the intrusion is only partly sized and the weight placed on the data subjects' side is correspondingly provisional.`;
    information_needed = `balancing_details.${missing.map((m) => m === "scale" ? "scale_approx" : m).join(" and balancing_details.")} — the missing dimension${missing.length === 1 ? "" : "s"} above.`;
  } else if (large_scale_indicated) {
    application =
      `All three dimensions are recorded, and the scale the record states puts this processing in the large-scale range. Scale does not by itself defeat a legitimate interest, but it multiplies whatever intrusion the processing causes: the same operation run across an entire population is a materially larger interference than the same operation run on an exception basis. That multiplier is carried into the balance below.`;
  } else {
    application =
      `All three dimensions are recorded, so the intrusion can be sized rather than assumed. The scale, frequency and duration the record states are the quantities weighed against the benefit in the balancing analysis below.`;
  }

  return {
    standard: std.verbatim,
    standard_citation: std.citation || "GDPR Art. 5(1)(c)",
    record_fact,
    application,
    dimensions,
    dimensions_recorded,
    large_scale_indicated,
    supporting_citation: support.citation || "EDPB Guidelines 1/2024, Section II.C.3",
    supporting_verbatim: support.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// (f) potential_harms
// ---------------------------------------------------------------------
function severityOf(text: string): HarmSeverity {
  // FD703575-L1 (2026-08-27) — the customer-facing vocabulary is the intake
  // contract's own enum (POTENTIAL_HARM_OPTS, li-assessment.ts): "None /
  // negligible" | "Minor" | "Moderate" | "Severe". The original four patterns
  // recognised an internal vocabulary that matched only "Severe", so three of
  // the four CONTRACT-VALID answers fell to "unstated" — producing a
  // record_insufficient finding (and an "impact is not stated" clause) against
  // a record that had answered the question. The mapping is the 1:1 bijection
  // between the two four-band scales, not a re-grading.
  if (/^severe/i.test(text)) return "severe";
  if (/^moderate/i.test(text)) return "significant";
  if (/^minor/i.test(text)) return "limited";
  if (/^none\b/i.test(text)) return "negligible";
  if (/^significant/i.test(text)) return "significant";
  if (/^limited/i.test(text)) return "limited";
  if (/^negligible/i.test(text)) return "negligible";
  return "unstated";
}

const HARM_BEARING: Record<HarmSeverity, string> = {
  severe:
    "A harm at this level engages the data subject's fundamental rights directly, and Recital 47 treats that as the situation in which those rights may override the controller's interest.",
  significant:
    "A harm at this level puts material weight on the data subjects' side of the balance; it does not by itself defeat the interest, but it must be answered by measures that go beyond what the Regulation already requires.",
  limited:
    "A harm at this level is real but bounded, and can ordinarily be answered by mitigating measures recorded in the balance.",
  negligible:
    "A harm at this level places little weight on the data subjects' side of the balance, provided the record's characterisation of it holds.",
  unstated:
    "The record does not characterise how serious this harm would be, so the weight it carries in the balance cannot be fixed here.",
};

export function buildPotentialHarms(intake: unknown): PotentialHarmsFinding {
  const std = anchor("li_basis");
  const support = anchor("r47_override");

  const listed = arr(get(intake, "balancing_details.potential_harms"));
  const severityAnswer = str(get(intake, "balancing_details.potential_harm"));
  const detail = str(get(intake, "balancing_details.potential_harm_detail"));
  const worst_case_severity = severityOf(severityAnswer);

  const harms: PotentialHarm[] = [];
  for (const h of listed) {
    harms.push({
      harm: h,
      severity: worst_case_severity,
      bearing_on_balance: HARM_BEARING[worst_case_severity],
    });
  }
  if (!harms.length && detail) {
    harms.push({
      harm: detail,
      severity: worst_case_severity,
      bearing_on_balance: HARM_BEARING[worst_case_severity],
    });
  }

  const material_weight_against_controller = worst_case_severity === "severe" ||
    worst_case_severity === "significant";

  const factParts: string[] = [];
  factParts.push(
    harms.length
      ? `The record identifies ${harms.length} potential harm${harms.length === 1 ? "" : "s"} to data subjects.`
      : "The record identifies no specific harm to data subjects.",
  );
  factParts.push(
    severityAnswer
      ? `It characterises the worst case as "${severityAnswer}".`
      : "It does not characterise the worst-case severity.",
  );
  const record_fact = factParts.join(" ");

  // SO-11 FIX 2 — the impact composition must engage the record's own facts
  // (named harms, recorded pathway, recorded measures, exit route) and carry
  // the strongest consideration against the conclusion, rather than restating
  // the severity label the skeleton has already set out.
  const q = (t: string) => `"${t.trim().replace(/\.$/, "")}"`;
  const harmList = harms.length
    ? harms.map((h) => h.harm).reduce((acc, cur, i, a) =>
      i === 0 ? cur : i === a.length - 1 ? `${acc} and ${cur}` : `${acc}, ${cur}`, "")
    : "";
  const safeguardText = [
    ...arr(get(intake, "balancing_details.safeguards")).map((x) => str(x)).filter((x) =>
      x && x.toLowerCase() !== "other"
    ),
    str(get(intake, "balancing_details.safeguards_other")),
  ].filter(Boolean).join("; ");
  const optOutText = str(get(intake, "balancing_details.opt_out_mechanism"));

  let status: DeliverableStatus = "analysed";
  let information_needed: string | undefined;
  let application: string;

  if (!harms.length && worst_case_severity === "unstated") {
    status = "record_insufficient";
    application =
      "The balance weighs the controller's interest against the impact on the data subjects. The record names no harm and does not characterise the worst case, so the data subjects' side of the scale is empty — not because there is no impact, but because none has been recorded. The balancing analysis below proceeds subject to that.";
    information_needed =
      "balancing_details.potential_harms and balancing_details.potential_harm — the specific harms considered (financial, reputational, autonomy, distress, discrimination, physical safety) and how serious the worst case would be.";
  } else if (!harms.length) {
    status = "record_insufficient";
    application =
      `The record characterises the worst case as "${severityAnswer}" but does not say what the harm would consist of. A severity rating without a named harm cannot be tested, and cannot be mitigated: a measure can only be aimed at a harm that has been identified.`;
    information_needed =
      "balancing_details.potential_harms — the specific harms behind the severity rating already recorded.";
  } else if (worst_case_severity === "unstated") {
    status = "record_insufficient";
    application = [
      `The record names ${harms.length} harm${
        harms.length === 1 ? "" : "s"
      } — ${harmList} — but characterises the worst case as ${
        q(severityAnswer)
      }, which is not one of the recorded severity bands, so the weight cannot be read off the label and has to be taken from the pathway described.`,
      detail
        ? `The pathway given is ${q(detail)}.`
        : "No pathway is described, which is the strongest consideration against treating the harms as bounded.",
      safeguardText
        ? `The measures standing against that pathway are ${q(safeguardText)}.`
        : "No mitigating measure is recorded against these harms.",
      optOutText ? `A route by which the data subject can stop the processing is also recorded: ${q(optOutText)}.` : "",
      "The consideration cutting the other way is that measures of this kind are operational rather than structural: they hold only for as long as they are applied as described, and if they lapse the same harms recur at the frequency of the processing itself.",
      "Weighed on those facts the harms named are bounded and remediable, and each is carried into the balancing analysis individually below rather than collapsed into a single rating; the severity band itself remains open.",
    ].filter(Boolean).join(" ");
    information_needed =
      "balancing_details.potential_harm — the worst-case severity for the harms already listed, expressed in one of the recorded severity bands.";
  } else if (material_weight_against_controller) {
    // E8973164 (2026-08-28, flagged HIGH twice) — `worst_case_severity` is
    // the INTERNAL four-band grading vocabulary (negligible/limited/
    // significant/severe), a deliberate, ratified bijection off the
    // intake's own four-band answer (None-negligible/Minor/Moderate/Severe
    // — FD703575-L1). `record_fact` already quotes the intake's own word
    // correctly. This sentence used to say "characterises the worst case
    // as significant" when the intake's own word was "Moderate" — true of
    // the internal grade, but read (correctly) by the grader as putting
    // words in the record's mouth, since the record never said
    // "significant". Both labels are now named, so the internal grading is
    // transparent rather than substituted for the record's own word.
    application =
      `The record identifies ${harms.length} harm${harms.length === 1 ? "" : "s"} and characterises the worst case as ${q(severityAnswer)}, which this balancing test weighs at the "${worst_case_severity}" tier. At that level the harms are not incidental to the balance; they are the principal weight on the data subjects' side, and the balance can only fall in the controller's favour if measures beyond those the Regulation already requires reduce them. Each harm is carried into the balancing analysis individually below rather than collapsed into a single severity rating.`;
  } else {
    application = [
      `The record identifies ${harms.length} harm${
        harms.length === 1 ? "" : "s"
      } — ${harmList} — with a worst case characterised as ${q(severityAnswer)}, weighed at the "${worst_case_severity}" tier.`,
      detail ? `The pathway given is ${q(detail)}.` : "",
      safeguardText
        ? `What holds the harms at that level is not the characterisation but the measures recorded against them: ${
          q(safeguardText)
        }.`
        : "No mitigating measure is recorded, so the characterisation rests on the nature of the harms alone.",
      "Against that, a low characterisation is the controller's own and holds only while those measures hold; if they lapse, the harms are neither bounded nor reversible by anything the data subject can do.",
      "Each harm is carried into the balancing analysis individually below, so the balance is struck against named consequences rather than against a single rating.",
    ].filter(Boolean).join(" ");
  }

  return {
    standard: std.verbatim,
    standard_citation: std.citation || "GDPR Art. 6(1)(f)",
    record_fact,
    application,
    harms,
    worst_case_severity,
    material_weight_against_controller,
    supporting_citation: support.citation || "GDPR Recital 47",
    supporting_verbatim: support.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
    ...(severityAnswer ? { severity_label_recorded: severityAnswer } : {}),
  };
}

// (g) opt_out_feasibility
// ---------------------------------------------------------------------
export function buildOptOutFeasibility(intake: unknown): OptOutFeasibilityFinding {
  const std = anchor("r47_override");
  const support = anchor("art_13_object_information");

  const available = str(get(intake, "balancing_details.opt_out_available"));
  const mechanism = str(get(intake, "balancing_details.opt_out_mechanism"));
  const source = [available, mechanism].filter(Boolean).join(" ");

  let feasibility: OptOutFeasibility;
  if (!source) {
    feasibility = "undetermined_on_the_record";
  } else if (matches(available || source, OPT_OUT_UNAVAILABLE)) {
    feasibility = "no_opt_out_available";
  } else if (
    // FD703575-L3 — "unconditional" inside its own negation ("No unconditional
    // opt-out is available") must not classify as an unconditional opt-out.
    matches(source, OPT_OUT_UNCONDITIONAL) && !matches(source, OPT_OUT_UNCONDITIONAL_NEGATED)
  ) {
    feasibility = "unconditional_opt_out_available";
  } else if (matches(source, OPT_OUT_CONDITIONAL)) {
    feasibility = "conditional_opt_out_available";
  } else if (mechanism) {
    feasibility = "conditional_opt_out_available";
  } else {
    feasibility = "undetermined_on_the_record";
  }

  const counts_as_mitigation = feasibility === "unconditional_opt_out_available";

  const record_fact = [
    available
      ? `The record answers opt-out availability as "${available}".`
      : "The record does not answer whether an opt-out is available.",
    mechanism
      ? `It describes the mechanism as: "${mechanism}".`
      : "It describes no opt-out mechanism.",
  ].join(" ");

  let status: DeliverableStatus = "analysed";
  let information_needed: string | undefined;
  let application: string;

  // SO-11 FIX 1 — the default position must be stated accurately: the general
  // right to object to legitimate-interests processing is QUALIFIED and is
  // ABSOLUTE only for direct marketing. Stated in plain prose and attributed
  // to the general right to object — deliberately no bare statutory pinpoint,
  // which would ride on an unverified citation.
  // D1D2B3B8-L4 (2026-08-28) — compressed to ONE sentence: the old two-
  // sentence recitation was flagged as textbook boilerplate in both live
  // documents that reached this factor ("would read identically in any LIA").
  // The default is stated only as far as the comparison against the recorded
  // mechanism needs it; the mechanism's own text stays the anchor.
  const OBJECTION_DEFAULT =
    "The general right to object to legitimate-interests processing is qualified — the objection ordinarily rests on the data subject's particular situation, and the controller may continue on compelling legitimate grounds — and is unconditional only for direct marketing.";

  switch (feasibility) {
    case "unconditional_opt_out_available":
      application =
        `The record describes an opt-out the data subject can exercise without having to make out a case: "${
          mechanism || available
        }". ${OBJECTION_DEFAULT} An opt-out exercisable without cause therefore goes further than the default position for processing of this kind, and counts towards the balance rather than being assumed as part of it.`;
      break;
    case "conditional_opt_out_available":
      application =
        `The record describes a route by which data subjects can object — "${
          mechanism || available
        }" — but one that is exercised on request or on assessment rather than unconditionally. ${OBJECTION_DEFAULT} The recorded route therefore matches the default rather than exceeding it; it is properly recorded, but a measure that reflects what is already required does not add weight to the controller's side of the balance.`;
      break;
    case "no_opt_out_available":
      application =
        "The record states that data subjects cannot opt out of this processing. Where the data subject has no practical route to stop processing grounded on legitimate interests, the whole of the protection sits in the balance itself, and the weight the balance must carry rises accordingly. The determination below reflects that.";
      information_needed =
        "balancing_details.opt_out_mechanism — whether any route to object exists, including a manual one, and if none does, the reason it cannot be offered.";
      break;
    default:
      status = "record_insufficient";
      application =
        "Recital 47 and the information duties both proceed on the footing that a data subject can object to processing grounded on legitimate interests. The record does not state whether that is possible here or by what route, so this factor cannot be weighed and the balance below is stated subject to it.";
      information_needed =
        "balancing_details.opt_out_available and balancing_details.opt_out_mechanism — whether data subjects can object or opt out, whether that is unconditional or assessed case by case, and the mechanism by which it is exercised.";
  }

  return {
    standard: std.verbatim,
    standard_citation: std.citation || "GDPR Recital 47",
    record_fact,
    application,
    feasibility,
    mechanism,
    counts_as_mitigation,
    supporting_citation: support.citation || "GDPR Art. 13(2)(b)",
    supporting_verbatim: support.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// =====================================================================
// CLOSE — attestation block
// =====================================================================
export function buildLiaAttestation(intake: unknown): LiaAttestationBlock {
  const std = anchor("li_basis");

  const dpoReviewed = str(get(intake, "attestation.dpo_reviewed")).toLowerCase();
  const dpoReviewer = str(get(intake, "attestation.dpo_reviewer"));
  const dpoDate = str(get(intake, "attestation.dpo_review_date"));
  const approverName = str(get(intake, "attestation.approver_name"));
  const approverPosition = str(get(intake, "attestation.approver_position"));
  const approvalDate = str(get(intake, "attestation.approval_date"));
  const recordedTriggers = arr(get(intake, "attestation.review_triggers"));

  const reviewed = dpoReviewed.startsWith("yes") || (!!dpoReviewer && !!dpoDate);
  const dpo_review: LiaDpoReview = {
    reviewed,
    reviewer: dpoReviewer,
    review_date: dpoDate,
    status: reviewed && dpoReviewer && dpoDate ? "analysed" : "record_insufficient",
    ...(reviewed && dpoReviewer && dpoDate ? {} : {
      information_needed:
        "attestation.dpo_reviewer and attestation.dpo_review_date — who reviewed this assessment on behalf of the data protection function, and on what date. Where no data protection officer is appointed, record the person who discharged that function.",
    }),
  };

  const approvers: LiaApprover[] = approverName
    ? [{ name: approverName, position: approverPosition }]
    : [];

  const triggers_are_default = recordedTriggers.length === 0;
  const review_triggers = triggers_are_default
    ? DEFAULT_REVIEW_TRIGGERS
    : [...recordedTriggers, ...DEFAULT_REVIEW_TRIGGERS.filter((d) =>
      !recordedTriggers.some((r) => r.toLowerCase() === d.toLowerCase())
    )];

  const attested = !!approverName && !!approvalDate && dpo_review.status === "analysed";

  const missing: string[] = [];
  if (!approverName) missing.push("attestation.approver_name — the person who approved this assessment");
  if (!approverPosition) missing.push("attestation.approver_position — that person's role and the authority under which they approve");
  if (!approvalDate) missing.push("attestation.approval_date — the date approval was given");
  if (dpo_review.status !== "analysed") missing.push("the data protection review recorded above");

  const text = attested
    ? `This legitimate interests assessment was reviewed by ${dpoReviewer} on ${dpoDate} and approved by ${approverName}${approverPosition ? `, ${approverPosition}` : ""}, on ${approvalDate}. It records the assessment the controller carried out before the processing described in it was relied on, and it is to be performed anew on the occurrence of any trigger listed below.`
    : `This legitimate interests assessment carries no attestation yet. An assessment relied on as the controller's accountability record for Article 6(1)(f) names the person who reviewed it, the person who approved it, and the date of each. Those entries are listed below and writing them down closes the point.`;

  return {
    text,
    attested,
    dpo_review,
    approvers,
    approval_date: approvalDate,
    review_triggers,
    triggers_are_default,
    citation: std.citation || "GDPR Art. 6(1)(f)",
    authority_verbatim: std.verbatim,
    status: attested ? "analysed" : "record_insufficient",
    ...(attested ? {} : { information_needed: missing.join("; ") + "." }),
  };
}

// =====================================================================
// Envelope + attach
// =====================================================================
export function buildLiaUpgrade4(intake: unknown): LiaUpgrade4Deliverables {
  return {
    interest_legitimacy: buildInterestLegitimacy(intake),
    benefit_and_beneficiary: buildBenefitAndBeneficiary(intake),
    alternatives_considered: buildAlternativesConsidered(intake),
    relationship_with_individual: buildRelationshipWithIndividual(intake),
    scale_frequency_duration: buildScaleFrequencyDuration(intake),
    potential_harms: buildPotentialHarms(intake),
    opt_out_feasibility: buildOptOutFeasibility(intake),
    attestation_block: buildLiaAttestation(intake),
  };
}

export function attachLiaUpgrade4(
  report: Record<string, unknown>,
  intake: unknown,
): Record<string, unknown> {
  try {
    const built = buildLiaUpgrade4(intake);
    report.interest_legitimacy = built.interest_legitimacy;
    report.benefit_and_beneficiary = built.benefit_and_beneficiary;
    report.alternatives_considered = built.alternatives_considered;
    report.relationship_with_individual = built.relationship_with_individual;
    report.scale_frequency_duration = built.scale_frequency_duration;
    report.potential_harms = built.potential_harms;
    report.opt_out_feasibility = built.opt_out_feasibility;
    report.attestation_block = built.attestation_block;
    return {
      version: LIA_UPGRADE4_VERSION,
      ok: true,
      legitimacy: built.interest_legitimacy.verdict,
      sub_tests_met: built.interest_legitimacy.sub_tests.filter((t) => t.verdict === "met").length,
      benefit_generic: built.benefit_and_beneficiary.benefit_is_generic,
      beneficiaries: built.benefit_and_beneficiary.beneficiaries.length,
      alternatives: built.alternatives_considered.alternatives.length,
      alternatives_with_rationale: built.alternatives_considered.count_with_rationale,
      relationship: built.relationship_with_individual.category,
      relationship_explicit: built.relationship_with_individual.explicitly_recorded,
      dimensions_recorded: built.scale_frequency_duration.dimensions_recorded,
      harms: built.potential_harms.harms.length,
      worst_case: built.potential_harms.worst_case_severity,
      opt_out: built.opt_out_feasibility.feasibility,
      attested: built.attestation_block.attested,
      triggers_default: built.attestation_block.triggers_are_default,
      insufficient: [
        built.interest_legitimacy,
        built.benefit_and_beneficiary,
        built.alternatives_considered,
        built.relationship_with_individual,
        built.scale_frequency_duration,
        built.potential_harms,
        built.opt_out_feasibility,
        built.attestation_block,
      ].filter((d) => d.status === "record_insufficient").length,
    };
  } catch (e) {
    return {
      version: LIA_UPGRADE4_VERSION,
      ok: false,
      error: (e as Error)?.message ?? String(e),
    };
  }
}
