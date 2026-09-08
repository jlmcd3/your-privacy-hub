// Guards for the enforcement corpus cleanup worker: a subject is only written
// when it is a plausible party name that literally occurs in the decision text,
// and remaining quality flags are recomputed from the post-write state.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { subjectAcceptable, remainingFlags } from "../../enforcement-cleanup/index.ts";

const DOC = "Decision of the Data Protection Commission concerning Airbnb Ireland UC " +
  "regarding the retention of identity documents.";

Deno.test("subject accepted when it occurs verbatim in the document text", () => {
  assertEquals(subjectAcceptable("Airbnb Ireland UC", DOC), true);
});

Deno.test("subject rejected when it does not occur in the document text", () => {
  assertEquals(subjectAcceptable("Meta Platforms Ireland Limited", DOC), false);
});

Deno.test("mid-sentence fragment rejected even if present in the text", () => {
  assertEquals(subjectAcceptable("regarding the retention of identity documents", DOC), false);
});

Deno.test("null and empty candidates rejected", () => {
  assertEquals(subjectAcceptable(null, DOC), false);
  assertEquals(subjectAcceptable("  ", DOC), false);
});

Deno.test("flags cleared only when all three fields are usable", () => {
  assertEquals(
    remainingFlags({
      subject: "Airbnb Ireland UC",
      key_compliance_failure: "Retained identity documents without a lawful basis.",
      preventive_measures: "Should have deleted the documents after verification.",
    }),
    [],
  );
});

Deno.test("missing fields are reported individually", () => {
  assertEquals(
    remainingFlags({
      subject: null,
      key_compliance_failure: null,
      preventive_measures: "Should have deleted the documents after verification.",
    }),
    ["subject_missing", "missing_key_compliance_failure"],
  );
});

Deno.test("fragment subject still flags as a fragment", () => {
  assertEquals(
    remainingFlags({
      subject: "from processing the data subject's personal data",
      key_compliance_failure: "x",
      preventive_measures: "y",
    }),
    ["subject_fragment"],
  );
});
