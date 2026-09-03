/**
 * DOC 73 §4 (R2) — precedent-class posture builder. CEO-ratified
 * 2026-08-25/26 (resolves PN-L2).
 *
 * PURITY LAW: pure function of the record object. No I/O, no clock, no env;
 * never throws. Matches build.ts/build-upgrade4.ts conventions exactly.
 *
 * SINGLE-WRITER LAW: this module is the ONLY producer of
 * report.precedent_class_posture.
 *
 * DETERMINISM: the use-case class comes from classifyLiaUseCase (the SAME
 * function the free preview uses), never from the model's Stage 1
 * classification. This finding is code-computed end to end.
 *
 * DEGRADATION: a class with no ratified row is NOT "record_insufficient"
 * — the record is complete; the CURATION hasn't reached that class yet.
 * status stays "analysed" with posture "not_assessed". record_insufficient
 * is reserved for the one real record gap this finding can have: no
 * processing_description to classify at all (shouldn't occur — the field
 * is "always" required by contract — but degrade loudly rather than throw
 * if it ever does).
 */
import { classifyLiaUseCase, USE_CASE_LABELS } from "../../../../_shared/lia/lia-use-case-classifier.ts";
import { LIA_PRECEDENT_CLASSES_VERSION, precedentClassRow } from "./precedent-classes.ts";
import type { PrecedentClassFinding } from "./types.ts";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

const POSTURE_SENTENCE: Record<string, (label: string) => string> = {
  rejected:
    (label) => `Regulators applying the equivalent EU/UK legitimate-interests test have rejected reliance on it for ${label.toLowerCase()} processing in the decision below. The decision is persuasive context only; it does not decide the outcome recorded above, which turns on the facts the company has provided.`,
  conditional:
    (label) => `Regulators applying the equivalent EU/UK legitimate-interests test have treated ${label.toLowerCase()} processing as conditionally defensible, turning on the specific safeguards and scope described in the decision below. The decision is persuasive context only; it does not decide the outcome recorded above, which turns on the facts the company has provided.`,
  accepted:
    (label) => `Regulators applying the equivalent EU/UK legitimate-interests test have accepted reliance on it for ${label.toLowerCase()} processing in circumstances close to the decision below. The decision is persuasive context only; it does not decide the outcome recorded above, which turns on the facts the company has provided.`,
  contested:
    (label) => `Regulators applying the equivalent EU/UK legitimate-interests test have reached differing conclusions on ${label.toLowerCase()} processing; the decision below illustrates one outcome. The decision is persuasive context only; it does not decide the outcome recorded above, which turns on the facts the company has provided.`,
};

export function buildPrecedentClassPosture(intake: unknown): PrecedentClassFinding {
  const description = str(get(intake, "processing_description"));

  if (!description) {
    return {
      standard: "",
      standard_citation: "",
      record_fact: "The record does not describe the processing to be classified.",
      application:
        "A precedent-class posture cannot be assigned without a description of the processing activity.",
      use_case_class: "other",
      use_case_label: USE_CASE_LABELS.other,
      posture: "not_assessed",
      authorities: [],
      factor_ids: [],
      map_version: LIA_PRECEDENT_CLASSES_VERSION,
      status: "record_insufficient",
      information_needed:
        "processing_description — what is done, to whose data, so the processing can be classified against tracked regulatory precedent.",
    };
  }

  const useCaseClass = classifyLiaUseCase(description);
  const useCaseLabel = USE_CASE_LABELS[useCaseClass] ?? USE_CASE_LABELS.other;
  const row = precedentClassRow(useCaseClass);

  const record_fact = `The record describes this processing as ${useCaseLabel.toLowerCase()}.`;

  if (!row) {
    return {
      standard: "",
      standard_citation: "",
      record_fact,
      application:
        `No ratified regulatory-precedent posture exists yet for ${useCaseLabel.toLowerCase()} processing. This does not affect the determination above, which is reached under the three-part test from the facts the company has provided.`,
      use_case_class: useCaseClass,
      use_case_label: useCaseLabel,
      posture: "not_assessed",
      authorities: [],
      factor_ids: [],
      map_version: LIA_PRECEDENT_CLASSES_VERSION,
      status: "analysed",
    };
  }

  const sentenceFor = POSTURE_SENTENCE[row.posture];
  const application = sentenceFor
    ? [sentenceFor(useCaseLabel), ...row.authorities.map((a) => a.what_happened)].join(" ")
    : row.authorities.map((a) => a.what_happened).join(" ");

  return {
    standard: "",
    standard_citation: "",
    record_fact,
    application,
    use_case_class: useCaseClass,
    use_case_label: useCaseLabel,
    posture: row.posture,
    authorities: row.authorities,
    factor_ids: row.factor_ids,
    map_version: LIA_PRECEDENT_CLASSES_VERSION,
    status: "analysed",
  };
}

export function attachPrecedentClassPosture(
  report: Record<string, unknown>,
  intake: unknown,
): Record<string, unknown> {
  try {
    const built = buildPrecedentClassPosture(intake);
    report.precedent_class_posture = built;
    return {
      version: LIA_PRECEDENT_CLASSES_VERSION,
      ok: true,
      use_case_class: built.use_case_class,
      posture: built.posture,
      authorities: built.authorities.length,
      status: built.status,
    };
  } catch (e) {
    return {
      version: LIA_PRECEDENT_CLASSES_VERSION,
      ok: false,
      error: (e as Error)?.message ?? String(e),
    };
  }
}
