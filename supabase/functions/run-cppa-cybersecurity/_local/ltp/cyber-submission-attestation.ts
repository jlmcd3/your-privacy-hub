/**
 * FC-L11 (doc 54 §1 L11, 2026-08-25) — the § 7124 certification-of-
 * completion fixed-fact block. Same design law as the § 7121(a) ITEM-204
 * corpus block this module sits alongside: STATE THE LAW, quoted verbatim,
 * no computation, no customer-specific slot. Every fact and every quote
 * traces to CYBER_7124_REQUIREMENTS / CYBER_7124_ATTESTATION_STATEMENT
 * (components.ts), which are themselves pinned as exact substrings of the
 * approved § 7124 corpus row (src/registry/__tests__/
 * cppa-cyber-deliverables.test.ts's FC-L11 pin).
 *
 * Two genuinely-list-shaped facts (who may sign; what the certification
 * must contain) use a bare "\n" join (doc 66 Rule 5), NOT the "— "-prefixed
 * convention (Rule 4) — Rule 4's bullet detection requires each item to
 * open its OWN sentence at a period/colon boundary, but these verbatim
 * fragments are semicolon-joined clauses from the source's own numbered
 * list, so a "— " prefix would render as a literal dash inside one run-on
 * paragraph rather than a real bullet (caught by direct render-and-read
 * before landing, not assumed). Each line instead reproduces the source's
 * OWN numeric marker ("(1)", "(2)", …) — copying the regulation's own
 * structural numbering, never inventing new structure or prose. The
 * § 7124(d)(4) attestation is the literal text a signer attests to — never
 * folded into a list, never paraphrased, always its own clearly separated
 * block.
 *
 * Pure. No I/O. Never throws.
 *
 * DISCLAIMER PARAGRAPH (added 2026-08-25, CEO instruction: "add the
 * Submission and attestation section in the similar manner that we added a
 * signature section to CPPA Risk" — mirrors cppa-risk.spine.ts's
 * "agency_submission_checklist" section, which closes on the same "this
 * report does not submit on your behalf" disclaimer, and states, at its
 * open, that the report doesn't perform the submission itself). UNLIKE the
 * rest of this block, that closing sentence is NOT a verbatim corpus quote
 * — no ratified docx redline produced it, so it is deliberately not worded
 * as if it were byte-pinned law. It states only what is already true from
 * this tool's own nature: a self-reported readiness report, not the § 7124
 * certification itself (the same distinction the spine's own Signature-
 * section comment already draws for the § 7123(e)(8)/§ 7124 line).
 */

import {
  CYBER_7124_ATTESTATION_CITATION,
  CYBER_7124_ATTESTATION_STATEMENT,
  CYBER_7124_CITATION,
  CYBER_7124_REQUIREMENTS,
} from "./cppa-cyber-deliverables/components.ts";

const req = (key: string): string => {
  const r = CYBER_7124_REQUIREMENTS.find((x) => x.key === key);
  if (!r) throw new Error(`cyber-submission-attestation: missing requirement '${key}'`);
  // Verbatim fragments already carry their own closing punctuation
  // (semicolons, "and", periods) from the source list structure — joined
  // with a bare space, never a manufactured connective word.
  return r.verbatim;
};

/**
 * The fixed-fact block for the submission/certification requirement.
 * Marker mirrors the ITEM-204 corpus block's own convention so the same
 * byte-pinned-block class of content is easy to find in rendered output.
 */
export const SUBMISSION_ATTESTATION_MARKER = "[§ 7124 certification of completion]";

/** "(1) <text>" — reproduces the source's own numeric marker; never invents structure. */
function numbered(marker: string, text: string): string {
  return `${marker} ${text}`;
}

export function buildCyberSubmissionAttestationBlock(): string {
  const obligation = req("annual_certification_obligation");
  const deadline = req("certification_deadline");

  const signerLines = [
    req("signer_qualifications_chapeau"),
    numbered("(1)", req("signer_directly_responsible")),
    numbered("(2)", req("signer_sufficient_knowledge")),
    numbered("(3)", req("signer_authority_to_submit")),
  ].join("\n");

  const contentLines = [
    req("certification_content_chapeau"),
    numbered("(1)", req("certification_business_contact")),
    numbered("(2)", req("certification_completion_statement")),
    numbered("(3)", req("certification_audit_period")),
    numbered("(4)", req("certification_attestation_chapeau")),
    numbered("(5)", req("certification_signer_identity")),
  ].join("\n");

  // The lead sentence names the citation as ITS OWN framing clause, never
  // embedding a verbatim quote mid-sentence with an altered first letter —
  // even a single re-cased character would touch the quoted text, which
  // this module treats as inviolable. The two verbatim sentences that
  // follow keep their own original capitalization exactly as sourced.
  return [
    `${SUBMISSION_ATTESTATION_MARKER} ${CYBER_7124_CITATION} sets the certification-of-completion requirement. ${obligation} ${deadline}`,
    signerLines,
    contentLines,
    `The ${CYBER_7124_ATTESTATION_CITATION} attestation statement, to be signed electronically, reads: “${CYBER_7124_ATTESTATION_STATEMENT}”`,
    "A member of the company's executive management team who meets the qualifications above must submit this certification to the California Privacy Protection Agency through the Agency's website at https://cppa.ca.gov/. This report does not submit this certification on the company's behalf, and it is not itself the certification described in 11 CCR § 7124: that step, including the electronic attestation, must be completed separately, by that individual, on the Agency's site.",
  ].join("\n\n");
}
