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

// 2026-09-18 (run 72e9a63c): "§§ A, B" lists cite every listed section; the
// ADMT matrix row "11 CCR §§ 7001(ddd), 7200(a)" covers § 7200.
Deno.test("cross-block: a §§ list in the authorities table covers each listed section", () => {
  const d = doc(
    "Article 11 applies when a business uses ADMT to make a significant decision (11 CCR § 7200(a)); definitions at 11 CCR § 7001(ddd).",
    [["Significant decision", "engaged", "11 CCR §§ 7001(ddd), 7200(a)"]],
  );
  const c = checkCrossBlock("cppa-admt", { skeleton_document: d }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c);
  assertEquals(c!.passed, true, `expected covered; got ${c!.actual}`);
});

Deno.test("cross-block: ADMT allow-list covers the Article 10 cross-references (§ 7150, § 7155) and § 7050, not other sections", () => {
  const ok = doc(
    "A risk assessment is also triggered (11 CCR § 7150(b)(3)) and must be reviewed (11 CCR § 7155(a)(2)); notice at collection under 11 CCR § 7050. Scope under 11 CCR § 7200(a).",
    [["Significant decision", "engaged", "11 CCR §§ 7001(ddd), 7200(a)"]],
  );
  const c1 = checkCrossBlock("cppa-admt", { skeleton_document: ok }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c1);
  assertEquals(c1!.passed, true, `expected allowed; got ${c1!.actual}`);
  const bad = doc("Opt-out under 11 CCR § 7221(b).", [["Significant decision", "engaged", "11 CCR §§ 7001(ddd), 7200(a)"]]);
  const c2 = checkCrossBlock("cppa-admt", { skeleton_document: bad }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c2);
  assertEquals(c2!.passed, false);
});

// Lead-in → numbered sub-heading → table is a table announced by a heading,
// not a dangling lead-in (ADMT § 8; three false L-LEADIN hits in run 72e9a63c).
Deno.test("cross-block: a lead-in followed by a numbered sub-heading and then a table does not fail L-LEADIN", () => {
  const d = {
    _typed: "skeleton-document@so-wire-in" as const,
    spine_version: "test",
    title: "t", subtitle: "s",
    sections: [{ id: "actions", title: "8. Actions", paragraphs: [
      { kind: "skeleton", text: "The following tables list any conditions, follow-up items, and recommendations generated from the Company's responses:", key: "actions#p0" },
      { kind: "skeleton", text: "8.2 Required Assessment Follow-Up", key: "actions#p1" },
      { kind: "table", text: "", key: "actions:8.2", table: { key: "actions:8.2", rows: [["Area", "Item", "Why", "What"]] } },
    ] }],
  };
  const hits = checkCrossBlock("cppa-admt", { skeleton_document: d }).filter((x) => x.check_id === "lint.L-LEADIN" && !x.passed);
  assertEquals(hits.length, 0, JSON.stringify(hits));
});

// "; § B" continuations inherit the CCR prefix (Risk matrix: "11 CCR § 7152(a)(5)–(6); § 7154").
Deno.test("cross-block: a '; § B' continuation in the authorities matrix covers § B", () => {
  const d = doc(
    "Residual risk is weighed under 11 CCR § 7154 and 11 CCR § 7152(a)(6).",
    [["Residual risk", "acceptable", "11 CCR § 7152(a)(5)–(6); § 7154"]],
  );
  const c = checkCrossBlock("cppa-risk", { skeleton_document: d }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c);
  assertEquals(c!.passed, true, `expected covered; got ${c!.actual}`);
});

// A denied provision is not a citation the table must carry.
Deno.test("cross-block: a negated mention ('Article 44 was omitted from the UK GDPR') is not a required citation", () => {
  const d = doc(
    "The UK chapter is a different body of law. Article 44 was omitted from the UK GDPR on 5 February 2020. Transfers rest on Article 46(1).",
    [["Transfers", "safeguards", "UK GDPR Art. 46(1)"]],
  );
  const c = checkCrossBlock("governance", { skeleton_document: d }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c);
  assertEquals(c!.passed, true, `expected negated mention ignored; got ${c!.actual}`);
});

// The corpus exhibit's long form ("… (General Data Protection Regulation) art. 9") covers Article 9 (run 2d1a0be2).
Deno.test("cross-block: a lowercase 'art. 9' long-form row in the authorities table covers 'Article 9' in the body", () => {
  const d = doc(
    "The special categories of health data engage Article 9. Designation follows GDPR Art. 37(1)(b).",
    [["Regulations", "GDPR Art. 37(1)(b)", "Regulation (EU) 2016/679 (General Data Protection Regulation) art. 9"]],
  );
  const c = checkCrossBlock("governance", { skeleton_document: d }).find((x) => x.check_id === "cross-block.table_of_authorities_complete");
  assert(c);
  assertEquals(c!.passed, true, `expected covered; got ${c!.actual}`);
});
