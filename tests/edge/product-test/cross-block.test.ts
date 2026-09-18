// product-test-grade — cross-block family: table-of-authorities completeness
// at SECTION level (lead correction 2026-09-18 after the CEO's first Risk
// run, where pinpoint-vs-range spellings produced ten false omissions).
//   deno test -A tests/edge/product-test/cross-block.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkCrossBlock, citationSectionKey } from "../../../supabase/functions/product-test-grade/_local/grade/cross-block.ts";

function doc(bodyText: string, toaRows: string[][]) {
  return {
    _typed: "skeleton-document@so-wire-in" as const,
    spine_version: "test",
    title: "t", subtitle: "s",
    sections: [
      { id: "body", title: "Body", paragraphs: [{ kind: "skeleton", text: bodyText, key: "body:0" }] },
      { id: "table_of_authorities", title: "Appendix A — Factor, Determination, and Authority Matrix", paragraphs: [
        { kind: "table", text: "", key: "table_of_authorities:1", table: { key: "table_of_authorities:1", rows: toaRows } },
      ] },
    ],
  };
}

Deno.test("citationSectionKey strips pinpoints and normalises spacing", () => {
  assertEquals(citationSectionKey("11 CCR § 7150(b)(1)"), "11 CCR § 7150");
  assertEquals(citationSectionKey("11 CCR §7150(a)"), "11 CCR § 7150");
  assertEquals(citationSectionKey("Civ. Code § 1798.140(d)(1)"), "Civ. Code § 1798.140");
  assertEquals(citationSectionKey("Art. 35"), "Art. 35");
});

Deno.test("cross-block: pinpoint in body, range in the authority matrix — covered", () => {
  const d = doc(
    "Engaged under 11 CCR § 7150(b)(1) and 11 CCR § 7150(b); see also Civ. Code § 1798.140(d)(1).",
    [["Trigger", "engaged", "11 CCR § 7150(a)–(b); Civ. Code § 1798.140(d)"]],
  );
  const c = checkCrossBlock("cppa-risk", { skeleton_document: d }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c);
  assertEquals(c!.passed, true, `expected covered; got ${c!.actual}`);
});

Deno.test("cross-block: a section cited in the body and absent from the matrix still fails", () => {
  const d = doc(
    "Engaged under 11 CCR § 7150(b)(1); retention under 11 CCR § 7155(c).",
    [["Trigger", "engaged", "11 CCR § 7150(a)–(b)"]],
  );
  const c = checkCrossBlock("cppa-risk", { skeleton_document: d }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c);
  assertEquals(c!.passed, false);
  assert(String(c!.actual).includes("11 CCR § 7155"), `missing section named: ${c!.actual}`);
});

// CEO ruling 2026-09-18 (option 2, doc 275 §3): § 7157 is an administrative
// duty, not an assessed factor, so its absence from the Risk matrix is not a
// failure; the allow-list is per product and per entry.
Deno.test("cross-block: § 7157 absent from the Risk matrix is allowed by the CEO ruling; other sections still fail", () => {
  const ok = doc(
    "Submission under 11 CCR § 7157(a) is due April 1, 2028. Engaged under 11 CCR § 7150(b)(1).",
    [["Trigger", "engaged", "11 CCR § 7150(a)–(b)"]],
  );
  const c1 = checkCrossBlock("cppa-risk", { skeleton_document: ok }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c1);
  assertEquals(c1!.passed, true, `expected allowed; got ${c1!.actual}`);

  const stillFails = doc(
    "Submission under 11 CCR § 7157(a). Retention under 11 CCR § 7155(c).",
    [["Trigger", "engaged", "11 CCR § 7150(a)–(b)"]],
  );
  const c2 = checkCrossBlock("cppa-risk", { skeleton_document: stillFails }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c2);
  assertEquals(c2!.passed, false);
  assert(String(c2!.actual).includes("11 CCR § 7155"));

  // The allow-list is per product: the same § 7157 is not allowed for cyber.
  const c3 = checkCrossBlock("cppa-cyber", { skeleton_document: ok }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c3);
  assertEquals(c3!.passed, false);
});
