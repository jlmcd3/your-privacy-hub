/**
 * ITEM 311 — builder for the four lia analytic deliverables.
 *
 * PURITY LAW: pure function of the record object. No I/O, no clock, no env;
 * never throws — a builder fault degrades the envelope rather than aborting.
 *
 * SINGLE-WRITER LAW: this module is the ONLY producer of
 * report.reasonable_expectations, report.child_factor,
 * report.public_authority_exclusion and report.lia_determination.
 * The model narrates; it does not overwrite.
 *
 * NOT TOUCHED: three_part_test.purpose_test. Op. 1 already performs and
 * reaches adverse verdicts; Chapter 7 (E)(5) holds its analysis shape up as
 * the standard. This module matches that shape rather than diluting it.
 */
import {
  ALREADY_REQUIRED_LEXICON,
  ANCHOR_KEYS,
  ANNEX_1_RESERVED_NOTE,
  EU_JURISDICTION,
  CHILD_NO,
  CHILD_VULNERABLE_OPTIONS,
  CHILD_YES,
  CONTEXTUAL_ELEMENTS,
  EXPECTATION_NEGATIVE,
  EXPECTATION_PARTIAL,
  EXPECTATION_POSITIVE,
  EXPOSURE_LEXICON,
  HARM_MATERIAL,
  NOTICE_ONLY_LEXICON,
  row,
  UK_JURISDICTION,
} from "./elements.ts";
import type {
  AdmDefaultPosition,
  AdmRegime,
  AutomatedDecisionFinding,
  ChildDetermination,
  ChildFactorFinding,
  ExpectationVerdict,
  LiaDeliverables,
  LiaDetermination,
  LiaFactor,
  Mitigation,
  PublicAuthorityDetermination,
  PublicAuthorityFinding,
  ReasonableExpectationsFinding,
} from "./types.ts";

export const LIA_DELIVERABLES_VERSION =
  "lia-analytic-deliverables-2026-08-01-item326";

// ---------------------------------------------------------------------
// Record readers (no I/O)
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

// ---------------------------------------------------------------------
// 1. Reasonable expectations — Recital 47 / EDPB 1/2024 II.C.3
// ---------------------------------------------------------------------
export function buildReasonableExpectations(
  intake: unknown,
): ReasonableExpectationsFinding {
  const std = anchor("r47_at_collection");
  const support = anchor("edpb_re_weighed");
  const notice = anchor("edpb_notice_not_enough");

  const expectation = str(get(intake, "balancing_details.reasonable_expectation"));
  const detail = str(get(intake, "balancing_details.reasonable_expectation_detail"));
  const context = str(get(intake, "balancing_details.collection_context"));
  const relationship = str(get(intake, "relationship_type"));
  const description = str(get(intake, "processing_description"));
  const dataCats = arr(get(intake, "data_categories"));

  const present: string[] = [];
  if (relationship) present.push(CONTEXTUAL_ELEMENTS[0].label);
  if (context) present.push(CONTEXTUAL_ELEMENTS[1].label);
  if (description) present.push(CONTEXTUAL_ELEMENTS[2].label);
  if (dataCats.length) present.push(CONTEXTUAL_ELEMENTS[3].label);

  const supportingText = `${context} ${detail}`.trim();
  const noticeOnly = !!supportingText && matches(supportingText, NOTICE_ONLY_LEXICON);

  // RECORD FACT — what the record actually says, never a conclusion.
  const factParts: string[] = [];
  factParts.push(
    relationship
      ? `The record describes the data subjects as "${relationship}".`
      : "The record does not state what relationship the data subjects have with the controller.",
  );
  factParts.push(
    context
      ? `On the time and context of collection the record states: "${context}"`
      : "The record does not state when or in what context the personal data were collected, or what the data subjects were told at that time.",
  );
  factParts.push(
    expectation
      ? `The record's own answer on expectation is "${expectation}".`
      : "The record gives no answer on whether the data subjects would expect this processing.",
  );
  if (detail) factParts.push(`It adds: "${detail}"`);
  const record_fact = factParts.join(" ");

  let verdict: ExpectationVerdict;
  let application: string;
  let status: ReasonableExpectationsFinding["status"] = "analysed";
  let information_needed: string | undefined;

  if (!context) {
    // Recital 47 tests expectation AT THE TIME AND IN THE CONTEXT OF
    // COLLECTION. An enum answer is a conclusion, not that fact.
    verdict = "undetermined_on_the_record";
    status = "record_insufficient";
    application = expectation
      ? `Recital 47 asks whether the data subject could reasonably expect, at the time and in the context of the collection, that processing for this purpose would take place. The record answers the conclusion ("${expectation}") without supplying the fact the test runs on — what was collected when, in what setting, and what the data subjects were told at that moment. The conclusion is therefore recorded but not assessed here.`
      : "Recital 47 asks whether the data subject could reasonably expect, at the time and in the context of the collection, that processing for this purpose would take place. The record supplies neither the collection circumstances nor an answer on expectation, so the factor cannot be run.";
    information_needed =
      "balancing_details.collection_context — when and in what setting the personal data were collected, what the data subjects were told about the use at that moment, and whether this use was contemplated by the relationship as it then stood.";
  } else if (noticeOnly && !matches(supportingText, [/beyond the notice/i, /told at the point/i])) {
    verdict = "partly_expected";
    application =
      `The record's support for expectation rests on the information supplied to the data subjects: "${supportingText}". EDPB Guidelines 1/2024 address that directly — ${notice.verbatim} Because the record's contextual support runs to notice rather than to the relationship and setting in which the data were collected, the factor is partly satisfied and does not carry the balance on its own.`;
  } else if (matches(expectation, EXPECTATION_POSITIVE)) {
    verdict = "reasonably_expected";
    application =
      `Run against the collection circumstances the record states, the processing sits within what a data subject in that relationship would have expected at the point of collection: ${context} The factor therefore weighs with the controller, and ${support.verbatim.charAt(0).toLowerCase()}${support.verbatim.slice(1)}`;
  } else if (matches(expectation, EXPECTATION_PARTIAL)) {
    verdict = "partly_expected";
    application =
      `The collection circumstances the record states — ${context} — make the processing foreseeable in outline but not in the specific use assessed here. The factor is therefore partly satisfied: it neither carries the balance for the controller nor defeats it, and it must be weighed alongside the impact on the data subjects.`;
  } else if (matches(expectation, EXPECTATION_NEGATIVE)) {
    verdict = "not_reasonably_expected";
    application =
      `The collection circumstances the record states — ${context} — do not put this use within what the data subjects would have contemplated when the data were collected, and the record's own answer is "${expectation}". Recital 47 treats that as the situation in which the data subject's interests and rights may override the controller's interest.`;
  } else {
    verdict = "undetermined_on_the_record";
    status = "record_insufficient";
    application =
      `The record states the collection circumstances (${context}) but gives no answer on expectation that the Recital 47 test can be run against, so the factor is open rather than resolved either way.`;
    information_needed =
      "balancing_details.reasonable_expectation — whether the data subjects would have expected this specific use at the point the data were collected, answered against the collection circumstances already recorded.";
  }

  return {
    standard: std.verbatim,
    standard_citation: std.citation || "GDPR Recital 47",
    record_fact,
    application,
    verdict,
    contextual_elements: present,
    notice_only_support: noticeOnly,
    supporting_citation: (noticeOnly ? notice.citation : support.citation) ||
      "EDPB Guidelines 1/2024, Section II.C.3",
    supporting_verbatim: noticeOnly ? notice.verbatim : support.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// ---------------------------------------------------------------------
// 2. Child factor — Art. 6(1)(f) "in particular where the data subject is a child"
// ---------------------------------------------------------------------
export function buildChildFactor(intake: unknown): ChildFactorFinding {
  const std = anchor("child_clause");
  const support = anchor("edpb_child_prevail");
  const protection = anchor("edpb_child_protection");

  const explicit = str(get(intake, "balancing_details.children_data_subjects")).toLowerCase();
  const vulnerable = arr(get(intake, "balancing_details.vulnerable_subjects"));
  const vulnerableAnswered = vulnerable.length > 0;
  const childInVulnerable = vulnerable.some((v) =>
    CHILD_VULNERABLE_OPTIONS.some((opt) => v.toLowerCase() === opt.toLowerCase())
  );

  const factParts: string[] = [];
  factParts.push(
    explicit
      ? `The record answers the child question directly: "${explicit}".`
      : "The record does not answer the child question directly.",
  );
  factParts.push(
    vulnerableAnswered
      ? `On vulnerable groups it records ${JSON.stringify(vulnerable)}.`
      : "It records no answer on vulnerable groups either.",
  );
  const record_fact = factParts.join(" ");

  let determination: ChildDetermination;
  let application: string;
  let weighs = false;
  let status: ChildFactorFinding["status"] = "analysed";
  let information_needed: string | undefined;

  const saysYes = CHILD_YES.some((y) => explicit.startsWith(y));
  const saysNo = CHILD_NO.some((n) => explicit.startsWith(n));

  if (saysYes || childInVulnerable) {
    determination = "children_in_scope";
    weighs = true;
    application =
      `Article 6(1)(f) singles the child out as the case in which the data subject's interests are most likely to override the controller's. On this record children are among the data subjects, so that clause is engaged rather than hypothetical. ${support.verbatim} weighs against the controller's interest here, and ${protection.verbatim.charAt(0).toLowerCase()}${protection.verbatim.slice(1)}`;
  } else if (saysNo || (vulnerableAnswered && !childInVulnerable)) {
    determination = "children_not_in_scope";
    application = saysNo
      ? "The record states that the data subjects are not children, so the Article 6(1)(f) child clause is not engaged by this processing. The determination is bound to that statement: if the processing later reaches children, the balance must be re-run."
      : `The record answers the vulnerable-groups question as ${JSON.stringify(vulnerable)} and does not include children among them, so the Article 6(1)(f) child clause is not engaged. The determination is bound to that answer: if the processing later reaches children, the balance must be re-run.`;
  } else {
    determination = "undetermined_on_the_record";
    status = "record_insufficient";
    application =
      "The Article 6(1)(f) child clause turns on whether children are among the data subjects. The record answers neither the child question nor the vulnerable-groups question, so the clause can be neither engaged nor ruled out, and the balance below is stated subject to that.";
    information_needed =
      "balancing_details.children_data_subjects — whether any data subjects are children, and if so the age range and how the controller establishes it.";
  }

  return {
    standard: std.verbatim,
    standard_citation: std.citation || "GDPR Art. 6(1)(f)",
    record_fact,
    application,
    determination,
    weighs_against_controller: weighs,
    supporting_citation: support.citation || "EDPB Guidelines 1/2024, Section II.C",
    supporting_verbatim: support.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// ---------------------------------------------------------------------
// 3. Public-authority exclusion — Art. 6(1)(f), second subparagraph
// ---------------------------------------------------------------------
export function buildPublicAuthorityExclusion(intake: unknown): PublicAuthorityFinding {
  const std = anchor("public_authority");
  const support = anchor("edpb_public_authority");

  const isAuthority = str(get(intake, "purpose_details.controller_is_public_authority")).toLowerCase();
  const inTasks = str(get(intake, "purpose_details.public_task_processing")).toLowerCase();

  const factParts: string[] = [];
  factParts.push(
    isAuthority
      ? `The record states the controller's status as "${isAuthority}".`
      : "The record does not state whether the controller is a public authority.",
  );
  factParts.push(
    inTasks
      ? `On whether this processing is carried out in the performance of its tasks it states "${inTasks}".`
      : "It does not state whether this processing is carried out in the performance of the controller's tasks.",
  );
  const record_fact = factParts.join(" ");

  let determination: PublicAuthorityDetermination;
  let application: string;
  let unavailable = false;
  let status: PublicAuthorityFinding["status"] = "analysed";
  let information_needed: string | undefined;

  const authYes = isAuthority.startsWith("yes");
  const authNo = isAuthority.startsWith("no");
  const tasksYes = inTasks.startsWith("yes");
  const tasksNo = inTasks.startsWith("no");

  if (authYes && tasksYes) {
    determination = "exclusion_applies";
    unavailable = true;
    application =
      "The record puts this processing inside the exclusion: the controller is a public authority and the processing is carried out in the performance of its tasks. The second subparagraph removes Article 6(1)(f) from the available bases in that case, so the balance below cannot make the processing lawful — a different Article 6(1) basis, provided for by law, is required.";
  } else if (authYes && tasksNo) {
    determination = "exclusion_does_not_apply";
    application =
      "The controller is a public authority, but the record states that this processing is not carried out in the performance of its tasks. The exclusion is drawn to the tasks, not to the body, so it does not remove Article 6(1)(f) here. The determination is bound to that statement: if the processing is in fact task-related, the basis falls away.";
  } else if (authNo) {
    determination = "exclusion_does_not_apply";
    application =
      "The record states that the controller is not a public authority, so the second subparagraph is not engaged and Article 6(1)(f) remains available subject to the three conditions.";
  } else {
    determination = "undetermined_on_the_record";
    status = "record_insufficient";
    application =
      "Whether Article 6(1)(f) is available at all turns on this exclusion before any balancing is reached. The record does not establish the controller's status or whether the processing is task-related, so availability of the basis is open.";
    information_needed = authYes
      ? "purpose_details.public_task_processing — whether this processing is carried out in the performance of the authority's tasks, and which statutory task it serves."
      : "purpose_details.controller_is_public_authority — whether the controller is a public authority, and if so whether this processing is carried out in the performance of its tasks.";
  }

  return {
    standard: std.verbatim,
    standard_citation: std.citation || "GDPR Art. 6(1)(f), second subparagraph",
    record_fact,
    application,
    determination,
    basis_unavailable: unavailable,
    supporting_citation: support.citation || "EDPB Guidelines 1/2024, Section II",
    supporting_verbatim: support.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// ---------------------------------------------------------------------
// 4. Determination + mitigations (the Op. 5 fix)
// ---------------------------------------------------------------------
/** SEPARATION GUARD — relocate exposure sentences out of a determination. */
export function splitExposure(text: string): { kept: string; moved: string; repairs: number } {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const kept: string[] = [];
  const moved: string[] = [];
  for (const s of sentences) {
    if (matches(s, EXPOSURE_LEXICON)) moved.push(s);
    else kept.push(s);
  }
  return { kept: kept.join(" ").trim(), moved: moved.join(" ").trim(), repairs: moved.length };
}

/** Recorded measures, read against the EDPB "already required" exclusion. */
export function classifyRecordedMitigations(intake: unknown): Mitigation[] {
  const beyond = anchor("edpb_mitigation_beyond");
  const excluded = anchor("edpb_mitigation_excluded");
  const additional = str(get(intake, "balancing_details.additional_mitigations"));
  if (!additional) return [];
  const items = additional
    .split(/;|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.map((measure) => {
    const already = matches(measure, ALREADY_REQUIRED_LEXICON);
    return {
      factor: "balancing" as LiaFactor,
      measure,
      why_it_moves_the_balance: already
        ? `This measure is recorded as a mitigation, but it is one the GDPR already requires of the controller. ${excluded.verbatim} It therefore does not move the balance and is not counted in the re-balance below.`
        : `This measure goes beyond what the GDPR already requires and so reduces the impact the balancing test weighs. ${beyond.verbatim}, which is the footing on which it is counted here.`,
      goes_beyond_gdpr_obligation: !already,
      citation: (already ? excluded.citation : beyond.citation) ||
        "EDPB Guidelines 1/2024, Section II.C.4",
      authority_verbatim: already ? excluded.verbatim : beyond.verbatim,
    };
  });
}

export function buildDetermination(
  intake: unknown,
  expectations: ReasonableExpectationsFinding,
  child: ChildFactorFinding,
  publicAuthority: PublicAuthorityFinding,
): LiaDetermination {
  const basis = anchor("li_basis");
  const conditions = anchor("edpb_three_conditions");
  const necessityAnchor = anchor("edpb_necessity");
  const overrideAnchor = anchor("edpb_override_outcome");
  const beyond = anchor("edpb_mitigation_beyond");

  const interest = str(get(intake, "purpose_details.interest_statement")) ||
    str(get(intake, "stated_purpose"));
  const alternatives = str(get(intake, "necessity_details.alternatives")) ||
    str(get(intake, "alternatives_considered"));
  const harm = str(get(intake, "balancing_details.potential_harm"));
  const safeguards = arr(get(intake, "balancing_details.safeguards"));
  const optOut = str(get(intake, "balancing_details.opt_out_mechanism"));

  const failing: LiaFactor[] = [];
  const open: LiaFactor[] = [];
  const mitigations: Mitigation[] = [...classifyRecordedMitigations(intake)];

  // ── legitimacy (Op. 1 owns the verdict; this reads only presence) ──
  if (!interest) {
    open.push("legitimacy");
    mitigations.push({
      factor: "legitimacy",
      measure:
        "Articulate the interest pursued in a single sentence naming who holds it, what it achieves, and why it is present rather than speculative, and record it in the balancing record.",
      why_it_moves_the_balance:
        `The first of the three conditions cannot be weighed against anything until the interest is stated with precision. ${conditions.verbatim} the first of which is the pursuit of a legitimate interest.`,
      goes_beyond_gdpr_obligation: false,
      citation: conditions.citation || "EDPB Guidelines 1/2024, Section II",
      authority_verbatim: conditions.verbatim,
    });
  }

  // ── necessity ──
  if (!alternatives) {
    open.push("necessity");
    mitigations.push({
      factor: "necessity",
      measure:
        "Record the less intrusive alternatives that were actually considered for this purpose, and for each one the reason it was rejected on purpose-defeat grounds rather than on cost or convenience.",
      why_it_moves_the_balance:
        `Necessity is not satisfied by asserting that the processing is useful. ${necessityAnchor.verbatim}. Without the comparison on the record the second condition is open.`,
      goes_beyond_gdpr_obligation: false,
      citation: necessityAnchor.citation || "EDPB Guidelines 1/2024, Section II.B",
      authority_verbatim: necessityAnchor.verbatim,
    });
  }

  // ── reasonable expectations ──
  if (expectations.verdict === "not_reasonably_expected") {
    failing.push("reasonable_expectations");
    mitigations.push({
      factor: "reasonable_expectations",
      measure:
        "Bring the processing back inside what the data subjects contemplated at collection — narrow it to the uses the relationship supports, or seek the data at a point where the use is disclosed and the individual can decline it without losing the service.",
      why_it_moves_the_balance:
        `The record places this use outside what the data subjects would expect at the time and in the context of collection, which is the situation Recital 47 identifies as tipping the balance towards the data subject. Narrowing the use to the expected scope removes that factor from the data-subject side rather than merely disclosing it, which ${beyond.verbatim} recognises as the kind of step that counts.`,
      goes_beyond_gdpr_obligation: true,
      citation: expectations.standard_citation,
      authority_verbatim: expectations.standard,
    });
  } else if (expectations.verdict === "partly_expected") {
    mitigations.push({
      factor: "reasonable_expectations",
      measure:
        "Give the data subjects an unconditional, standing means of stopping this specific use at the point where they would first encounter it, going beyond the Article 21 objection right the GDPR already requires.",
      why_it_moves_the_balance:
        `Expectation is only partly satisfied on this record, so the factor sits on the data-subject side of the balance until the individual can decline the specific use. ${beyond.verbatim}, and an unconditional stop on this use is such a safeguard.`,
      goes_beyond_gdpr_obligation: true,
      citation: expectations.supporting_citation,
      authority_verbatim: expectations.supporting_verbatim,
    });
  } else if (expectations.verdict === "undetermined_on_the_record") {
    open.push("reasonable_expectations");
  }

  // ── balancing ──
  const materialHarm = matches(harm, HARM_MATERIAL);
  if (!harm) {
    open.push("balancing");
  } else if (materialHarm && safeguards.length === 0) {
    failing.push("balancing");
    mitigations.push({
      factor: "balancing",
      measure:
        "Put named safeguards against the specific harm the record identifies, state who operates each one, and record how its effect is evidenced.",
      why_it_moves_the_balance:
        `The record puts the worst-case impact at "${harm}" and names no safeguard against it, so nothing on the record reduces the weight on the data-subject side. Safeguards that go beyond the controller's existing obligations reduce that weight; ones that do not, do not.`,
      goes_beyond_gdpr_obligation: true,
      citation: beyond.citation || "EDPB Guidelines 1/2024, Section II.C.4",
      authority_verbatim: beyond.verbatim,
    });
  }
  if (harm && !optOut) {
    mitigations.push({
      factor: "balancing",
      measure:
        "Provide a working opt-out for this processing and record where the data subject encounters it and how the suppression is enforced downstream.",
      why_it_moves_the_balance:
        "The record identifies an impact on the data subjects but no mechanism by which an individual can remove themselves from it, so the impact is borne without any control on the data-subject side of the balance.",
      goes_beyond_gdpr_obligation: true,
      citation: beyond.citation || "EDPB Guidelines 1/2024, Section II.C.4",
      authority_verbatim: beyond.verbatim,
    });
  }

  if (child.determination === "children_in_scope") failing.push("balancing");
  if (child.determination === "undetermined_on_the_record") open.push("balancing");

  // ── outcome ──
  let outcome: LiaDetermination["outcome"];
  let rawWhy: string;
  let status: LiaDetermination["status"] = "analysed";
  let information_needed: string | undefined;
  let rebalance = false;

  if (publicAuthority.basis_unavailable) {
    outcome = "legitimate_interests_not_available";
    rawWhy =
      `${publicAuthority.standard} The record places this processing inside that exclusion, so Article 6(1)(f) is not available and no mitigation reaches the point: the question is which other Article 6(1) basis, provided for by law, covers the processing.`;
  } else if (publicAuthority.determination === "undetermined_on_the_record") {
    outcome = "undetermined_on_the_record";
    status = "record_insufficient";
    rawWhy =
      "Availability of the basis is decided before the balance is reached, and the record does not establish whether the public-authority exclusion applies. Everything below is therefore conditional on that question being answered.";
    information_needed = publicAuthority.information_needed;
  } else if (child.determination === "children_in_scope" && materialHarm) {
    outcome = "legitimate_interests_not_available";
    rawWhy =
      `${basis.verbatim} On this record the data subjects include children and the worst-case impact is recorded as "${harm}". ${overrideAnchor.verbatim} The mitigations set out below address individual factors, but none of them removes the combination of a child data subject and a material impact, so legitimate interests is not a sound basis for this processing as recorded.`;
  } else if (open.length > 0) {
    outcome = "undetermined_on_the_record";
    status = "record_insufficient";
    const names = [...new Set(open)];
    rawWhy =
      `${conditions.verbatim} On this record ${names.length} of the elements the assessment turns on — ${names.join(", ")} — are not established, so the determination is open rather than answered either way. The mitigations below are the steps that would close each of them.`;
    information_needed = [
      ...new Set(
        [
          expectations.information_needed,
          child.information_needed,
          !interest
            ? "purpose_details.interest_statement — the interest pursued, stated precisely enough to be weighed."
            : undefined,
          !alternatives
            ? "necessity_details.alternatives — the less intrusive alternatives considered and why each was rejected."
            : undefined,
          !harm
            ? "balancing_details.potential_harm — the worst-case impact on the data subjects if the processing miscarries."
            : undefined,
        ].filter(Boolean) as string[],
      ),
    ].join(" ");
  } else if (failing.length > 0) {
    outcome = "available_only_with_mitigations";
    rebalance = true;
    const names = [...new Set(failing)];
    rawWhy =
      `${basis.verbatim} Run over this record the interest and its necessity hold, but ${names.join(" and ")} sit on the data subject's side of the balance as it stands. ${overrideAnchor.verbatim} The mitigations below are directed at those specific factors; where they are adopted the balancing test must be performed again before the processing is relied on.`;
  } else {
    outcome = "legitimate_interests_available";
    rawWhy =
      `${basis.verbatim} On this record each of the three conditions is met: the interest is stated, the record shows the comparison against less intrusive means, and no factor weighed above places the data subjects' interests, rights and freedoms above the interest pursued. This determination is bound to the record as it stands; if a recorded safeguard is not implemented as stated, or the processing reaches data subjects outside the recorded relationship, the balance must be re-run.`;
  }

  const { kept, moved, repairs } = splitExposure(rawWhy);

  return {
    outcome,
    why: kept,
    exposure_note: moved,
    separation_repairs: repairs,
    driving_factors: [...new Set([...failing, ...open])],
    mitigations,
    rebalance_required: rebalance,
    citation: basis.citation || "GDPR Art. 6(1)(f)",
    authority_verbatim: basis.verbatim,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}


// ---------------------------------------------------------------------
// 5. Automated-decision analysis — ITEM 326
//
// EU Art. 22(1) and the UK Art. 22A–22D regime are NOT the same rule. The
// EU default is prohibition-unless-excepted; the UK default, for data
// outside Art. 9(1), is permitted-subject-to-the-Art.-22C-safeguards. This
// builder branches off the RECORDED `jurisdictions` array only — same
// exact-value membership pattern as `readIncidentFacts` in
// ../ir-playbook-deliverables/build.ts. No semantic defaults.
//
// ANNEX 1 SCOPE LIMIT (binding): where Art. 6(1)(ea) is mentioned, the
// builder emits ANNEX_1_RESERVED_NOTE verbatim and states nothing about
// what Annex 1 requires. Annex 1 is not in corpus.
// ---------------------------------------------------------------------
export function readAdmJurisdictionFacts(intake: unknown): {
  jurisdictions: string[];
  uk: boolean;
  eu: boolean;
  ukOnly: boolean;
  regime: AdmRegime;
} {
  const jurisdictions = arr(get(intake, "jurisdictions"));
  const uk = jurisdictions.includes(UK_JURISDICTION);
  const eu = jurisdictions.includes(EU_JURISDICTION);
  const regime: AdmRegime = uk && eu ? "dual" : uk ? "uk" : eu ? "eu" : "not_engaged";
  return { jurisdictions, uk, eu, ukOnly: uk && !eu, regime };
}

export function buildAutomatedDecisionAnalysis(
  intake: unknown,
): AutomatedDecisionFinding {
  const f = readAdmJurisdictionFacts(intake);

  const eu22 = anchor("eu_art_22_right");
  const ukSubst = anchor("uk_art_22_substituted");
  const uk22aSolely = anchor("uk_22a_solely_automated");
  const uk22aSignificant = anchor("uk_22a_significant");
  const uk22bSpecial = anchor("uk_22b_special_category");
  const uk22bBar = anchor("uk_22b_recognised_li_bar");
  const uk22cDuty = anchor("uk_22c_duty");
  const uk22cMeasures = anchor("uk_22c_measures");
  const ukEa = anchor("uk_6_1_ea");

  const specialFlag = get(intake, "balancing_details.special_category_data");
  const specialRecorded = specialFlag === true || specialFlag === false;
  const specialYes = specialFlag === true;

  // ── record fact ────────────────────────────────────────────────────
  const factParts: string[] = [];
  factParts.push(
    f.jurisdictions.length
      ? `The record states the jurisdictions in scope as ${
        f.jurisdictions.map((j) => `"${j}"`).join(", ")
      }.`
      : "The record does not state which jurisdictions are in scope.",
  );
  factParts.push(
    specialRecorded
      ? `It records special-category data as ${specialYes ? "present" : "not present"} in this processing.`
      : "It does not record whether special-category data is processed.",
  );
  factParts.push(
    "It does not record whether any decision taken about the data subjects is a significant decision taken solely by automated means.",
  );
  const record_fact = factParts.join(" ");

  // ── standard + application, per engaged regime ─────────────────────
  let standard: string;
  let standard_citation: string;
  let supporting_verbatim = "";
  let supporting_citation = "";
  let default_position: AdmDefaultPosition;
  const parts: string[] = [];

  const euApplication =
    "Under the EU regime the position is prohibition by default: a solely automated decision producing legal or similarly significant effects may not be taken unless one of the three exceptions in Article 22(2) applies. Legitimate interests is not one of those exceptions, so a favourable balance under Article 6(1)(f) does not authorise such a decision. Where this processing supports one, a separate Article 22 basis must be established before it is taken.";
  const ukApplication =
    `The UK regime is not the EU rule under another name. Article 22 is not in force; Articles 22A to 22D replace it. For personal data outside Article 9(1) the default is the reverse of the EU default: a significant decision may be taken solely by automated means, but the controller must have the Article 22C safeguards in place — information about the decision, the ability to make representations, human intervention on the controller's part, and the ability to contest the decision. Article 22A(1)(a) fixes the threshold question: there is no meaningful human involvement where the human step does not actually bear on the outcome: "${uk22aSolely.verbatim}". A decision is significant where, per Article 22A(1)(b), "${uk22aSignificant.verbatim}"`;
  const ukBarApplication =
    `Two UK-specific restrictions bite regardless of the balance struck below. First, Article 22B(1) restricts a significant decision based entirely or partly on Article 9(1) data: it may not be taken solely by automated means unless the explicit-consent or contract/law condition is met. Second, UK law adds a lawful basis the EU regime does not have — Article 6(1)(ea), the recognised legitimate interest — and Article 22B(4) then bars that basis from grounding a solely automated significant decision. A UK controller relying on Article 6(1)(ea) for the processing behind such a decision must move to a different basis for that decision. Article 6(1)(ea) reads: "${ukEa.verbatim}" Article 22B(4) reads: "${uk22bBar.verbatim}"`;

  if (f.regime === "uk") {
    standard = uk22cDuty.verbatim;
    standard_citation = uk22cDuty.citation || "UK GDPR Art. 22C(1)";
    supporting_verbatim = ukSubst.verbatim;
    supporting_citation = ukSubst.citation || "UK GDPR Art. 22 (substituted)";
    default_position = "permitted_with_safeguards";
    parts.push(ukApplication, ukBarApplication);
  } else if (f.regime === "eu") {
    standard = eu22.verbatim;
    standard_citation = eu22.citation || "GDPR Art. 22(1)";
    default_position = "prohibited_unless_excepted";
    parts.push(euApplication);
  } else if (f.regime === "dual") {
    standard = eu22.verbatim;
    standard_citation = eu22.citation || "GDPR Art. 22(1)";
    supporting_verbatim = uk22cDuty.verbatim;
    supporting_citation = uk22cDuty.citation || "UK GDPR Art. 22C(1)";
    default_position = "both_defaults_stated";
    parts.push(
      "The record puts both the EU and the UK regime in scope, and their defaults differ. Each leg is stated on its own terms; neither default is carried across to the other.",
      euApplication,
      ukApplication,
      ukBarApplication,
    );
  } else {
    standard = "";
    standard_citation = "";
    default_position = "not_applicable";
    parts.push(
      "The record engages neither the EU nor the UK regime, so no Article 22-family analysis is performed here. Automated decision-making under any other recorded framework is assessed under that framework's own provisions, not under Article 22.",
    );
  }

  const ukEngaged = f.regime === "uk" || f.regime === "dual";
  let special_category_restriction = false;
  if (ukEngaged) {
    if (specialYes) {
      special_category_restriction = true;
      parts.push(
        `The record states that special-category data is processed, so Article 22B(1) is engaged on the record as it stands: "${uk22bSpecial.verbatim}"`,
      );
    } else if (specialRecorded) {
      parts.push(
        "The record states that no special-category data is processed, so the Article 22B(1) restriction is not engaged on the record as it stands.",
      );
    } else {
      parts.push(
        "The record does not state whether special-category data is processed, so whether the Article 22B(1) restriction is engaged is left open.",
      );
    }
    // ANNEX 1 SCOPE LIMIT — pointer only, verbatim note, nothing further.
    parts.push(ANNEX_1_RESERVED_NOTE);
  }

  const application = parts.join(" ");

  // ── status ─────────────────────────────────────────────────────────
  // MANDATORY DEGRADATION LAW: the LIA record carries no field stating
  // whether a solely automated significant decision is taken, so the regime
  // default is stated but the application to this processing is not closed.
  let status: AutomatedDecisionFinding["status"] = "record_insufficient";
  let information_needed: string | undefined =
    "Whether any decision taken about these data subjects is a significant decision (legal or similarly significant effect) taken solely by automated means, and if so what human involvement bears on the outcome. Record that, and the Article 22-family analysis can be closed rather than stated as a default.";
  if (f.regime === "not_engaged") {
    status = f.jurisdictions.length ? "analysed" : "record_insufficient";
    information_needed = f.jurisdictions.length
      ? undefined
      : "The jurisdictions in scope. Without them no Article 22-family regime can be identified.";
  }

  return {
    standard,
    standard_citation,
    record_fact,
    application,
    regime: f.regime,
    default_position,
    recognised_li_barred: ukEngaged,
    special_category_restriction,
    safeguards_citation: ukEngaged ? (uk22cMeasures.citation || "UK GDPR Art. 22C(2)") : "",
    safeguards_verbatim: ukEngaged ? uk22cMeasures.verbatim : "",
    supporting_citation,
    supporting_verbatim,
    annex_1_reserved_note: ukEngaged ? ANNEX_1_RESERVED_NOTE : "",
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// ---------------------------------------------------------------------
// Envelope + attach
// ---------------------------------------------------------------------
export function buildLiaDeliverables(intake: unknown): LiaDeliverables {
  const reasonable_expectations = buildReasonableExpectations(intake);
  const child_factor = buildChildFactor(intake);
  const public_authority_exclusion = buildPublicAuthorityExclusion(intake);
  return {
    reasonable_expectations,
    child_factor,
    public_authority_exclusion,
    lia_determination: buildDetermination(
      intake,
      reasonable_expectations,
      child_factor,
      public_authority_exclusion,
    ),
    automated_decision_analysis: buildAutomatedDecisionAnalysis(intake),
  };
}

export function attachLiaDeliverables(
  report: Record<string, unknown>,
  intake: unknown,
): Record<string, unknown> {
  try {
    const built = buildLiaDeliverables(intake);
    report.reasonable_expectations = built.reasonable_expectations;
    report.child_factor = built.child_factor;
    report.public_authority_exclusion = built.public_authority_exclusion;
    report.lia_determination = built.lia_determination;
    report.automated_decision_analysis = built.automated_decision_analysis;
    return {
      version: LIA_DELIVERABLES_VERSION,
      ok: true,
      expectations: built.reasonable_expectations.verdict,
      notice_only: built.reasonable_expectations.notice_only_support,
      child: built.child_factor.determination,
      public_authority: built.public_authority_exclusion.determination,
      outcome: built.lia_determination.outcome,
      adm_regime: built.automated_decision_analysis.regime,
      adm_default: built.automated_decision_analysis.default_position,
      mitigations: built.lia_determination.mitigations.length,
      mitigations_counted: built.lia_determination.mitigations.filter((m) =>
        m.goes_beyond_gdpr_obligation
      ).length,
      rebalance_required: built.lia_determination.rebalance_required,
      separation_repairs: built.lia_determination.separation_repairs,
      insufficient: [
        built.reasonable_expectations,
        built.child_factor,
        built.public_authority_exclusion,
        built.lia_determination,
        built.automated_decision_analysis,
      ].filter((d) => d.status === "record_insufficient").length,
    };
  } catch (e) {
    return {
      version: LIA_DELIVERABLES_VERSION,
      ok: false,
      error: (e as Error)?.message ?? String(e),
    };
  }
}
