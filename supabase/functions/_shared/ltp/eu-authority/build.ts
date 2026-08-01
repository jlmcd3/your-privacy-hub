/**
 * ITEM 341 — PURE builder for the cppa-risk section
 * "Persuasive authority from EU practice".
 *
 * PURITY LAW: a pure function of (intake, corpus). No I/O, no clock, no env,
 * never throws. The corpus payload is fetched by ./fetch.ts and passed in.
 *
 * ADMISSION RULES (all three are hard):
 *   1. EDPB guidance is quoted VERBATIM and only when the re-queried corpus
 *      row still contains the pinned string byte-for-byte. A pin that no
 *      longer matches is DROPPED, never repaired and never paraphrased.
 *   2. Art. 60 / case-digest material yields COUNTS ONLY — pattern-level
 *      observations, never a characterisation of an individual decision.
 *   3. An enforcement row may be cited only when
 *      `verification_status = 'verified'`. Unverified rows are inadmissible.
 *
 * MANDATORY DEGRADATION LAW: an engaged topic with no admissible material
 * says so in terms ("no qualifying ... on the record") and is still emitted.
 * The section never reaches for weaker material to fill a hole.
 *
 * PERSUASION LAW: every element is marked persuasive and non-binding, is
 * labelled as a different legal regime, and reserves the weight to be given
 * to the Company and its counsel. The § 7156(a) directive carve-out does not
 * extend to this section.
 */
import { pinsForTopic } from "./pinned-guidance.ts";
import { deriveEuTopics } from "./topics.ts";
import type {
  EuAuthorityCorpus,
  EuAuthorityFraming,
  EuAuthoritySection,
  EuAuthorityTopic,
  EuGuidanceElement,
  EuPatternObservation,
  EuVerifiedPrecedent,
} from "./types.ts";

export const EU_AUTHORITY_SECTION_VERSION =
  "cppa-risk-eu-authority-2026-08-01-item341";

export const EU_AUTHORITY_SECTION_TITLE =
  "Persuasive authority from EU practice";

const REGIME_LABEL =
  "European Union / EEA data-protection practice — a different legal regime from the California Consumer Privacy Act and the CPPA regulations.";

const PERSUASIVE_NOTE =
  "The material in this section is offered as persuasive authority only. It is not binding on the Company, on the California Privacy Protection Agency, or on any California court, and it does not establish a CPPA requirement.";

const WEIGHT_RESERVATION =
  "The weight to be given to any item below is reserved to the Company and its counsel. Nothing in this section directs a course of action.";

const CARVE_OUT_NOTE =
  "The directive carve-out at 11 CCR § 7156(a) applies to the California analysis and does not extend to this section.";

const FRAMING: EuAuthorityFraming = {
  regime_label: REGIME_LABEL,
  persuasive_note: PERSUASIVE_NOTE,
  weight_reservation: WEIGHT_RESERVATION,
  carve_out_note: CARVE_OUT_NOTE,
};

const EMPTY_CORPUS: EuAuthorityCorpus = {
  guidance_excerpts: {},
  oss_counts: {},
  verified_enforcement: [],
};

const NO_CORPUS_NOTE =
  "The EU/EEA authority corpus was not available when this document was built. No persuasive material is stated, because stating any would mean quoting from memory rather than from the corpus.";

/** Minimum register size before a count is reported as a pattern. */
const MIN_PATTERN_COUNT = 3;

function guidanceFor(
  topicId: EuAuthorityTopic["topic_id"],
  corpus: EuAuthorityCorpus,
): EuGuidanceElement[] {
  const out: EuGuidanceElement[] = [];
  for (const pin of pinsForTopic(topicId)) {
    const live = corpus.guidance_excerpts[pin.pin_id];
    // PIN LAW — byte-exact containment or the pin is dropped.
    if (typeof live !== "string" || !live.includes(pin.verbatim_quote)) continue;
    out.push({
      guideline_ref: pin.guideline_ref,
      citation: pin.citation,
      source_url: pin.source_url,
      corpus_row_id: pin.corpus_row_id,
      verbatim_quote: pin.verbatim_quote,
      authority_weight: "persuasive_non_binding",
      regime: "EU/EEA (GDPR)",
    });
  }
  return out;
}

function patternsFor(
  provisions: readonly string[],
  tags: readonly string[],
  corpus: EuAuthorityCorpus,
): EuPatternObservation[] {
  const out: EuPatternObservation[] = [];
  for (const p of provisions) {
    const n = corpus.oss_counts[`provision:${p}`] ?? 0;
    if (n < MIN_PATTERN_COUNT) continue;
    out.push({
      basis: "gdpr_provision",
      basis_value: p,
      decision_count: n,
      observation:
        `The EDPB one-stop-shop register carries ${n} entries recorded against ${p}. ` +
        "This is a count of register entries only; no individual decision is characterised, and the count is not evidence of any California obligation.",
      authority_weight: "persuasive_non_binding",
    });
  }
  for (const t of tags) {
    const n = corpus.oss_counts[`tag:${t}`] ?? 0;
    if (n < MIN_PATTERN_COUNT) continue;
    out.push({
      basis: "topic_tag",
      basis_value: t,
      decision_count: n,
      observation:
        `The EDPB one-stop-shop register carries ${n} entries tagged "${t}". ` +
        "This is a count of register entries only; no individual decision is characterised, and the count is not evidence of any California obligation.",
      authority_weight: "persuasive_non_binding",
    });
  }
  return out;
}

/** Max verified precedents surfaced per topic — deterministic ordering. */
const MAX_PRECEDENTS = 3;

function precedentsFor(
  provisions: readonly string[],
  corpus: EuAuthorityCorpus,
): EuVerifiedPrecedent[] {
  const wanted = new Set(provisions.map((p) => p.toLowerCase()));
  const matched = corpus.verified_enforcement.filter((r) =>
    r.provisions.some((p) => wanted.has(p.toLowerCase()))
  );
  // Deterministic order: most recent decision first, then subject A-Z.
  matched.sort((a, b) => {
    if (a.decision_date !== b.decision_date) {
      return a.decision_date < b.decision_date ? 1 : -1;
    }
    return a.subject.localeCompare(b.subject);
  });
  return matched.slice(0, MAX_PRECEDENTS);
}

function informationNeeded(
  label: string,
  hasGuidance: boolean,
  hasPatterns: boolean,
  hasPrecedents: boolean,
): string | undefined {
  const missing: string[] = [];
  if (!hasGuidance) missing.push("no EDPB guidance passage in the corpus matches this topic byte-for-byte");
  if (!hasPatterns) missing.push("the one-stop-shop register carries too few entries on this topic to state a pattern");
  if (!hasPrecedents) {
    missing.push(
      "no VERIFIED enforcement decision in the corpus matches this fact pattern — unverified entries exist but may not be cited",
    );
  }
  if (!missing.length) return undefined;
  return `${label}: ${missing.join("; ")}.`;
}

export function buildEuAuthoritySection(
  intake: Record<string, unknown>,
  corpus?: EuAuthorityCorpus | null,
): EuAuthoritySection {
  try {
    const c = corpus ?? EMPTY_CORPUS;
    const engaged = deriveEuTopics(intake ?? {});
    const topics: EuAuthorityTopic[] = engaged.map(({ rule, triggers }) => {
      const guidance = guidanceFor(rule.topic_id, c);
      const patterns = patternsFor(rule.gdpr_provisions, rule.topic_tags, c);
      const precedents = precedentsFor(rule.gdpr_provisions, c);
      const has = guidance.length > 0 || patterns.length > 0 || precedents.length > 0;
      const note = informationNeeded(
        rule.topic_label,
        guidance.length > 0,
        patterns.length > 0,
        precedents.length > 0,
      );
      return {
        topic_id: rule.topic_id,
        topic_label: rule.topic_label,
        triggers,
        guidance,
        pattern_observations: patterns,
        verified_precedents: precedents,
        status: has ? "authority_available" : "no_qualifying_authority",
        ...(note ? { information_needed: note } : {}),
      };
    });

    const any = topics.some((t) => t.status === "authority_available");
    return {
      section_title: EU_AUTHORITY_SECTION_TITLE,
      version: EU_AUTHORITY_SECTION_VERSION,
      status: any ? "authority_available" : "no_qualifying_authority",
      framing: FRAMING,
      topics,
      ...(any
        ? {}
        : {
          information_needed: corpus
            ? "No qualifying EU/EEA material matches this record. Nothing is stated here rather than offering material that does not fit the facts."
            : NO_CORPUS_NOTE,
        }),
    };
  } catch {
    return {
      section_title: EU_AUTHORITY_SECTION_TITLE,
      version: EU_AUTHORITY_SECTION_VERSION,
      status: "no_qualifying_authority",
      framing: FRAMING,
      topics: [],
      information_needed: NO_CORPUS_NOTE,
    };
  }
}
