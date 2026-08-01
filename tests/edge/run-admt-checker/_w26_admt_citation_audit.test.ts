// Colocated tests for W26-ADMT-CITATION-AUDIT.
// Regression pins on wave-26 doc 0481fc0c shapes (quality_run 6c06f218,
// run 115, batch aab7dd36). Idempotency + fail-open + unrelated-field
// control are all covered.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW26AdmtCitationAudit,
  isGarbledInterpolation,
  processProseString,
  resolveEntrySubsection,
  splitSentences,
  substituteFallbackWithPinpoint,
  W26_ADMT_CITATION_AUDIT_STAMP,
} from "../../../supabase/functions/run-admt-checker/_w26_admt_citation_audit.ts";

const FALLBACK = "the applicable ADMT-subchapter provision";

Deno.test("splitSentences preserves terminals", () => {
  const r = splitSentences("First sentence. Second one! Third?");
  assertEquals(r.length, 3);
});

Deno.test("isGarbledInterpolation — prefix quantifier signature (doc 0481fc0c pin)", () => {
  const s = `In this record, no enumerated ${FALLBACK} category applies to the workflow.`;
  assert(isGarbledInterpolation(s));
});

Deno.test("isGarbledInterpolation — suffix noun signature", () => {
  const s = `The finding cites ${FALLBACK} obligation as the anchor.`;
  assert(isGarbledInterpolation(s));
});

Deno.test("isGarbledInterpolation — well-formed use is NOT flagged", () => {
  const s = `The obligation is grounded on ${FALLBACK}.`;
  assert(!isGarbledInterpolation(s));
});

Deno.test("isGarbledInterpolation — 'under X.' preposition form is NOT flagged", () => {
  const s = `The disclosure is required under ${FALLBACK}.`;
  assert(!isGarbledInterpolation(s));
});

Deno.test("substituteFallbackWithPinpoint substitutes only when pinpoint is truthy", () => {
  const s = `Under ${FALLBACK}, the trigger applies.`;
  const r = substituteFallbackWithPinpoint(s, "11 CCR § 7150(b)(3)");
  assertEquals(r.count, 1);
  assert(r.out.includes("11 CCR § 7150(b)(3)"));
  const r2 = substituteFallbackWithPinpoint(s, "");
  assertEquals(r2.count, 0);
  assertEquals(r2.out, s);
});

Deno.test("resolveEntrySubsection — via _va_stamp", () => {
  const e = { _va_stamp: { subsection: "11 CCR § 7150(b)(3)" } };
  assertEquals(resolveEntrySubsection(e), "11 CCR § 7150(b)(3)");
});

Deno.test("resolveEntrySubsection — via proposition_key lookup", () => {
  const e = { proposition_key: "ra_trigger_admt" };
  const sub = resolveEntrySubsection(e);
  assert(sub.startsWith("11 CCR §"), `got ${sub}`);
});

Deno.test("resolveEntrySubsection — unresolved key returns empty (omission over invention)", () => {
  assertEquals(resolveEntrySubsection({ proposition_key: "bogus_key_never" }), "");
  assertEquals(resolveEntrySubsection({}), "");
  assertEquals(resolveEntrySubsection(null), "");
});

Deno.test("processProseString — Class 1 substitutes when pinpoint exists", () => {
  const s = `The obligation is grounded on ${FALLBACK}. It applies here.`;
  const r = processProseString(s, "11 CCR § 7150(b)(3)");
  assertEquals(r.pinpoint_substitutions, 1);
  assertEquals(r.sentences_excised, 0);
  assert(r.out.includes("11 CCR § 7150(b)(3)"));
  assert(!r.out.includes(FALLBACK));
});

Deno.test("processProseString — Class 2 excises garbled sentence whole", () => {
  const good = `The disclosure is required under ${FALLBACK}.`;
  const bad = `In this record, no enumerated ${FALLBACK} category applies.`;
  const both = `${bad} ${good}`;
  // No pinpoint: garbled sentence is still excised; good sentence keeps fallback.
  const r = processProseString(both, "");
  assertEquals(r.sentences_excised, 1);
  assertEquals(r.pinpoint_substitutions, 0);
  assert(!r.out.includes("no enumerated"));
  assert(r.out.includes(good.trim()));
});

Deno.test("processProseString — Class 1 + Class 2 together with pinpoint", () => {
  const good = `The obligation is grounded on ${FALLBACK}.`;
  const bad = `No enumerated ${FALLBACK} category applies.`;
  const r = processProseString(`${bad} ${good}`, "11 CCR § 7150(b)(3)");
  assertEquals(r.sentences_excised, 1);
  assertEquals(r.pinpoint_substitutions, 1);
  assert(r.out.includes("11 CCR § 7150(b)(3)"));
  assert(!r.out.includes(FALLBACK));
});

Deno.test("processProseString — unresolved key keeps well-formed fallback (omission)", () => {
  const s = `Grounded on ${FALLBACK}, the item applies.`;
  const r = processProseString(s, "");
  assertEquals(r.pinpoint_substitutions, 0);
  assertEquals(r.sentences_excised, 0);
  assertEquals(r.out, s);
});

Deno.test("processProseString — unrelated prose is untouched", () => {
  const s = "The business processes personal information for financial decisions.";
  const r = processProseString(s, "11 CCR § 7150(b)(3)");
  assertEquals(r.out, s);
  assertEquals(r.pinpoint_substitutions, 0);
});

Deno.test("applyW26AdmtCitationAudit — walks buckets, respects anchor keys", () => {
  const report: any = {
    priority_actions: [
      {
        id: "e1",
        proposition_key: "ra_trigger_admt",
        description: `Update the RA to reflect that no enumerated ${FALLBACK} category applies. Add a note under ${FALLBACK} for review.`,
        // Anchor keys must be untouched even if they contain the fallback.
        citation: FALLBACK,
      },
      {
        id: "e2",
        // No pinpoint available.
        description: `Grounded on ${FALLBACK}, confirm next quarter.`,
      },
    ],
    notice_gaps: [
      {
        id: "n1",
        _va_stamp: { subsection: "11 CCR § 7220(c)(2)" },
        rationale: `The notice must include the disclosure under ${FALLBACK}.`,
      },
    ],
  };
  const d = applyW26AdmtCitationAudit(report);
  assertEquals(d.entries_scanned, 3);
  assertEquals(d.entries_with_pinpoint, 2);
  // e1: 1 excision (garbled) + 1 substitution (well-formed under X).
  // n1: 1 substitution.
  assertEquals(d.class_2_sentences_excised, 1);
  assertEquals(d.class_1_pinpoint_substitutions, 2);
  // e1 anchor keys preserved.
  assertEquals(report.priority_actions[0].citation, FALLBACK);
  assertEquals(report.priority_actions[0].proposition_key, "ra_trigger_admt");
  // e2 unresolved → fallback preserved.
  assert(report.priority_actions[1].description.includes(FALLBACK));
  // Telemetry echoed.
  assertEquals(report._meta.internal.admt_w26_citation_audit.version, W26_ADMT_CITATION_AUDIT_STAMP);
  assert(d.stamp_echo_registered);
});

Deno.test("applyW26AdmtCitationAudit — idempotent second run is a no-op", () => {
  const report: any = {
    priority_actions: [{
      proposition_key: "ra_trigger_admt",
      description: `Under ${FALLBACK}, do the thing.`,
    }],
  };
  const d1 = applyW26AdmtCitationAudit(report);
  assertEquals(d1.class_1_pinpoint_substitutions, 1);
  const snapshot = report.priority_actions[0].description;
  const d2 = applyW26AdmtCitationAudit(report);
  assertEquals(d2.entries_scanned, 0);
  assertEquals(d2.class_1_pinpoint_substitutions, 0);
  assertEquals(report.priority_actions[0].description, snapshot);
});

Deno.test("applyW26AdmtCitationAudit — fail-open on malformed input", () => {
  assertEquals(applyW26AdmtCitationAudit(null).entries_scanned, 0);
  assertEquals(applyW26AdmtCitationAudit("string" as any).entries_scanned, 0);
  const r: any = { priority_actions: "not-an-array" };
  const d = applyW26AdmtCitationAudit(r);
  assertEquals(d.entries_scanned, 0);
});

Deno.test("applyW26AdmtCitationAudit — bucket-as-object with rows[]", () => {
  const report: any = {
    priority_actions: {
      rows: [{
        proposition_key: "ra_trigger_admt",
        description: `Grounded on ${FALLBACK}.`,
      }],
    },
  };
  const d = applyW26AdmtCitationAudit(report);
  assertEquals(d.entries_scanned, 1);
  assertEquals(d.class_1_pinpoint_substitutions, 1);
});
