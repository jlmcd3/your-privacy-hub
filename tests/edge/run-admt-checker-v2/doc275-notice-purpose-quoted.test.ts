// DOC 275 §15 item 7 (CEO-approved 2026-09-19). 11 CCR § 7220(c)(1) requires
// the Pre-use Notice to state the specific purpose, and the FSOR rejects a
// generic one; the "Specific purpose" factor row in the notice_elements
// table used to render only the Company's Yes/No/Partial answer, never the
// purpose the Company actually published. admt-v2-assemble.ts now adds one
// quoted sentence, in the reached Pre-use Notice section, immediately after
// the factor table, IFF `intake.notice_purpose_text` is a non-empty string
// after trimming — NO-PADDING LAW: nothing renders when it is not.
//
// Uses the SAME production call chain as the determinism harness
// (tests/edge/ptest/determinism.test.ts): computeAdmtV2 -> gatherCitations
// -> buildAuthorityExhibit -> assembleAdmtV2Document.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ADMT_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { gatherCitations } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-citations.ts";
import { vaRegistryAsProvisions } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-corpus.ts";
import { buildAuthorityExhibit } from "../../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";
import { reviewTextOf } from "../../../supabase/functions/ptest-run-driver/_local/review/determinism.ts";

type Bag = Record<string, unknown>;

// ADMT_PERFECT[0] answers the qualifying human-review question, so the v2
// engine finds it OUT_OF_SCOPE and never reaches the notice section. Use the
// fully automated, in-scope golden that carries a non-empty
// notice_purpose_text (the Company's published purpose, verbatim).
const FIXTURE = ADMT_PERFECT.find((f) => f.id === "admt-full-optout-strong-compliance")!;
assert(FIXTURE, "fixture setup: admt-full-optout-strong-compliance is expected in ADMT_PERFECT");
const BASE_INTAKE = FIXTURE.intake as Bag;
assert(
  typeof BASE_INTAKE.notice_purpose_text === "string" && (BASE_INTAKE.notice_purpose_text as string).trim().length > 0,
  "fixture setup: the in-scope golden is expected to carry a non-empty notice_purpose_text",
);

const PURPOSE_TEXT = (BASE_INTAKE.notice_purpose_text as string).trim();
const EXPECTED_SENTENCE = `The notice states the purpose as: “${PURPOSE_TEXT}”.`;

/** The production deterministic call chain (mirrors determinism.test.ts's genAdmt). */
function renderAdmt(intake: Bag): { skeleton_document: unknown; computed: ReturnType<typeof computeAdmtV2> } {
  const computed = computeAdmtV2(intake);
  const organizationName = String(intake.organization_name ?? "").trim();
  const systemName = String(intake.system_name ?? "").trim();
  const citations = gatherCitations(computed.allFindings.map((f) => f.authority).filter(Boolean));
  const exhibit = buildAuthorityExhibit(citations, vaRegistryAsProvisions());
  const skeleton = assembleAdmtV2Document({ intake, computed, exhibit, organizationName, systemName });
  return { skeleton_document: skeleton, computed };
}

Deno.test("doc275 — the notice section quotes the Company's stated purpose verbatim, right after the factor table", () => {
  const { skeleton_document } = renderAdmt(BASE_INTAKE);
  const { text } = reviewTextOf({ skeleton_document });
  assertStringIncludes(text, EXPECTED_SENTENCE);

  // It renders in the Pre-use Notice section, after the notice_elements
  // table (the "Specific purpose" factor row), never before it.
  const sec = (skeleton_document as { sections: Array<{ id: string; paragraphs: Array<{ kind: string; text: string; table?: { key: string } }> }> })
    .sections.find((s) => s.id === "notice");
  assert(sec, "the reached record is expected to render a notice section");
  const tableIdx = sec!.paragraphs.findIndex((p) => p.table?.key === "notice:2");
  const sentenceIdx = sec!.paragraphs.findIndex((p) => p.text === EXPECTED_SENTENCE);
  assert(tableIdx >= 0, "notice_elements table (key notice:2) not found");
  assert(sentenceIdx >= 0, "purpose-quote sentence not found in the notice section");
  assert(sentenceIdx > tableIdx, "the purpose-quote sentence must render after the factor table");
});

Deno.test("doc275 — no notice_purpose_text on the record: the sentence is absent, and no undefined/{-token leaks", () => {
  const intake: Bag = { ...BASE_INTAKE, notice_purpose_text: "" };
  const { skeleton_document } = renderAdmt(intake);
  const { text } = reviewTextOf({ skeleton_document });

  assert(!text.includes("The notice states the purpose as:"), "the purpose-quote lead-in must not render with no purpose text on the record");
  assert(!text.includes("undefined"), "no undefined token may leak into the rendered document");
  assert(!text.includes("{"), "no unresolved slot ({...}) may leak into the rendered document");
});

Deno.test("doc275 — whitespace-only notice_purpose_text is treated as absent (trim, not just falsy)", () => {
  const intake: Bag = { ...BASE_INTAKE, notice_purpose_text: "   \n\t  " };
  const { skeleton_document } = renderAdmt(intake);
  const { text } = reviewTextOf({ skeleton_document });
  assert(!text.includes("The notice states the purpose as:"), "whitespace-only purpose text must not render a quoted sentence");
});

Deno.test("doc275 — removing notice_purpose_text does not change computeAdmtV2's output: no determination, finding, posture label or evidence cell moves", () => {
  const withPurpose = computeAdmtV2(BASE_INTAKE);
  const withoutPurpose = computeAdmtV2({ ...BASE_INTAKE, notice_purpose_text: "" });

  // The fixture also carries notice_element_text.purpose (the transcribed
  // element) and notice_full_text (the whole published notice), which are
  // computeAdmtV2's own inputs for the "Specific purpose" factor's evidence
  // cell (admt-v2-deterministic.ts's purposeText fallback chain reads
  // notice_element_text.purpose first, notice_purpose_text second,
  // notice_full_text third). With those still present, stripping
  // notice_purpose_text changes nothing computeAdmtV2 reads, so its result
  // is expected to be fully byte-identical — a strict superset of "except
  // for the purpose text itself".
  assertEquals(
    JSON.stringify(withoutPurpose),
    JSON.stringify(withPurpose),
    "computeAdmtV2's result must not change when only notice_purpose_text is removed (notice_element_text.purpose still documents the element)",
  );

  // Belt-and-suspenders on the specific factor the new sentence sits beside:
  // its determination and record-grade inputs are untouched.
  assertEquals(withoutPurpose.notice.purpose.status, withPurpose.notice.purpose.status);
  assertEquals(withoutPurpose.notice.purpose.label, withPurpose.notice.purpose.label);
  assertEquals(withoutPurpose.notice.purpose.evidence, withPurpose.notice.purpose.evidence);
  assertEquals(withoutPurpose.notice.purpose.evidenceLabel, withPurpose.notice.purpose.evidenceLabel);
  assertEquals(withoutPurpose.notice.posture, withPurpose.notice.posture);
  assertEquals(withoutPurpose.overallPostureLabel, withPurpose.overallPostureLabel);
  assertEquals(withoutPurpose.overallRecordGrade, withPurpose.overallRecordGrade);
});

Deno.test("doc275 — an out-of-scope record renders no Pre-use Notice section at all, so the purpose quote never appears there either", () => {
  // The scope determination switches the whole notice section to a
  // "Not reached" stub; the new sentence lives only inside the reached
  // branch (assemble.ts's `if (!outOfScope) push("notice", ...)`), so an
  // out-of-scope record must never carry it — with or without purpose text.
  // Flipping human_review alone on the in-scope fixture yields
  // INCONSISTENT_RECORD (the rest of that record describes no reviewer), so
  // use the golden that is out of scope on its own facts: a qualifying
  // reviewer on every decision, with a non-empty notice_purpose_text.
  const outOfScopeIntake = ADMT_PERFECT.find((f) => f.id === "admt-ca-tenant-screening-perfect")!.intake as Bag;
  assert(String(outOfScopeIntake.notice_purpose_text ?? "").trim().length > 0, "test setup: the out-of-scope golden carries purpose text");
  const computed = computeAdmtV2(outOfScopeIntake);
  assertEquals(computed.scope.scopeState, "OUT_OF_SCOPE", "test setup: this intake is expected to be out of scope");
  const { skeleton_document } = renderAdmt(outOfScopeIntake);
  const sec = (skeleton_document as { sections: Array<{ id: string }> }).sections.find((s) => s.id === "notice");
  assert(sec, "even out of scope, a notice section (the not-reached stub) is expected to render");
  const { text } = reviewTextOf({ skeleton_document });
  assert(!text.includes("The notice states the purpose as:"), "the purpose quote must not render when the notice section is not reached");
});
