// FC-L11 (doc 54 §1 L11, 2026-08-25) — the § 7124 certification-of-
// completion fixed-fact block. Every assertion here traces the composed
// output back to CYBER_7124_REQUIREMENTS/CYBER_7124_ATTESTATION_STATEMENT,
// which are themselves pin-verified (src/registry/__tests__/
// cppa-cyber-deliverables.test.ts) as exact substrings of the CEO-supplied,
// cross-verified § 7124 corpus text.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCyberSubmissionAttestationBlock,
  SUBMISSION_ATTESTATION_MARKER,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-submission-attestation.ts";
import {
  CYBER_7124_ATTESTATION_STATEMENT,
  CYBER_7124_REQUIREMENTS,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/components.ts";

Deno.test("buildCyberSubmissionAttestationBlock — is pure and deterministic (no args, same output every call)", () => {
  assertEquals(buildCyberSubmissionAttestationBlock(), buildCyberSubmissionAttestationBlock());
});

Deno.test("buildCyberSubmissionAttestationBlock — opens with the byte-pinned marker, matching the ITEM-204 corpus block's own convention", () => {
  const text = buildCyberSubmissionAttestationBlock();
  assert(text.startsWith(SUBMISSION_ATTESTATION_MARKER));
});

Deno.test("buildCyberSubmissionAttestationBlock — every § 7124 requirement's verbatim text appears somewhere in the composed block", () => {
  const text = buildCyberSubmissionAttestationBlock();
  for (const r of CYBER_7124_REQUIREMENTS) {
    assert(text.includes(r.verbatim), `missing requirement: ${r.key}`);
  }
});

Deno.test("buildCyberSubmissionAttestationBlock — the § 7124(d)(4) attestation statement is quoted in full, verbatim, exactly once", () => {
  const text = buildCyberSubmissionAttestationBlock();
  const occurrences = text.split(CYBER_7124_ATTESTATION_STATEMENT).length - 1;
  assertEquals(occurrences, 1, "the attestation statement must appear exactly once, quoted in full");
});

Deno.test("buildCyberSubmissionAttestationBlock — the attestation is never bulleted or numbered inline (item (4) only references it, per its own chapeau text)", () => {
  const text = buildCyberSubmissionAttestationBlock();
  const attestationIdx = text.indexOf(CYBER_7124_ATTESTATION_STATEMENT);
  const item4Idx = text.indexOf("(4) An electronically signed attestation to the following statement:");
  assert(attestationIdx > item4Idx, "the full attestation quote should appear after its own list reference, not interleaved with it");
  // The numbered list items themselves (paragraphs [1] and [2] — signer
  // qualifications, certification content) must not ALSO contain the full
  // attestation text. Sliced by paragraph index, not lastIndexOf("\n\n"):
  // the trailing disclaimer paragraph (added 2026-08-25) also sits after a
  // "\n\n" boundary, so lastIndexOf would wrongly include the attestation
  // paragraph itself in "the list section".
  const paragraphs = text.split("\n\n");
  const listSection = [paragraphs[1], paragraphs[2]].join("\n\n");
  assert(!listSection.includes(CYBER_7124_ATTESTATION_STATEMENT));
});

Deno.test("buildCyberSubmissionAttestationBlock — no Rule-4 dash markers ('— ') anywhere (semicolon-joined source clauses can't be real bullets under doc 66 Rule 4; caught and fixed before landing)", () => {
  const text = buildCyberSubmissionAttestationBlock();
  assert(!text.includes("— "), "a stray '— ' would render as a literal dash, not a bullet, under Rule 4's sentence-boundary requirement");
});

Deno.test("buildCyberSubmissionAttestationBlock — closes on a disclaimer paragraph stating the report does not itself perform the § 7124 submission (2026-08-25, mirrors cppa-risk.spine.ts's agency_submission_checklist precedent)", () => {
  const text = buildCyberSubmissionAttestationBlock();
  const paragraphs = text.split("\n\n");
  assertEquals(paragraphs.length, 5, "expected 5 paragraphs: marker+obligation, signer list, content list, attestation quote, disclaimer");
  const disclaimer = paragraphs[4];
  assert(disclaimer.includes("does not submit this certification on the company's behalf"));
  assert(disclaimer.includes("not itself the certification described in 11 CCR § 7124"));
  assert(!disclaimer.includes(CYBER_7124_ATTESTATION_STATEMENT), "the disclaimer paragraph must not itself re-quote the attestation text");
});

Deno.test("buildCyberSubmissionAttestationBlock — the two numbered lists reproduce the source's own markers (1)-(3) and (1)-(5), never renumbered or reordered", () => {
  const text = buildCyberSubmissionAttestationBlock();
  const signerBlock = text.split("\n\n")[1];
  assertEquals(
    (signerBlock.match(/^\(\d\)/gm) ?? []).length,
    3,
    "signer-qualifications block should have exactly 3 numbered lines",
  );
  const contentBlock = text.split("\n\n")[2];
  assertEquals(
    (contentBlock.match(/^\(\d\)/gm) ?? []).length,
    5,
    "certification-content block should have exactly 5 numbered lines",
  );
});
