// A-TEAM DELTA (doc 125, 2026-08-31) — regression coverage for the
// additive presentationClassOf() split and the "corpus" wording removal in
// the shared Authorities Cited exhibit (authority-exhibit.ts).
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildAuthorityExhibit,
  CITATION_ONLY_NOTE,
  CITATION_ONLY_PREAMBLE,
  classifyAuthority,
  presentationClassOf,
  renderAuthorityExhibitHtml,
} from "../../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";

Deno.test("presentationClassOf: binding law classes map to Binding Law", () => {
  assertEquals(presentationClassOf({ authority_class: "constitutional", citation: "U.S. Const. amend. IV" }), "Binding Law");
  assertEquals(presentationClassOf({ authority_class: "statute", citation: "Cal. Civ. Code § 1798.100" }), "Binding Law");
  assertEquals(presentationClassOf({ authority_class: "regulation", citation: "11 CCR § 7150" }), "Binding Law");
});

Deno.test("presentationClassOf: administrative splits on enforcement vs. interpretation", () => {
  assertEquals(
    presentationClassOf({ authority_class: "administrative", citation: "In re Example Corp., CPPA Consent Order No. 12" }),
    "Regulatory Enforcement",
  );
  assertEquals(
    presentationClassOf({ authority_class: "administrative", citation: "EDPB Guidelines 1/2024" }),
    "Regulatory Interpretation",
  );
  assertEquals(
    presentationClassOf({ authority_class: "administrative", citation: "CPPA Final Statement of Reasons, § 7150" }),
    "Regulatory Interpretation",
  );
});

Deno.test("presentationClassOf: other maps to Persuasive or Comparative Authority", () => {
  assertEquals(presentationClassOf({ authority_class: "other", citation: "Some unclassified source" }), "Persuasive or Comparative Authority");
});

Deno.test("classifyAuthority(): existing behavior unchanged by the additive presentation layer", () => {
  assertEquals(classifyAuthority("Cal. Civ. Code § 1798.100"), "statute");
  assertEquals(classifyAuthority("11 CCR § 7150"), "regulation");
  assertEquals(classifyAuthority("EDPB Guidelines 1/2024"), "administrative");
  assertEquals(classifyAuthority("Some unclassified source"), "other");
});

Deno.test("Authorities Cited exhibit: no 'corpus' wording in customer-facing note/preamble/HTML", () => {
  assertEquals(/corpus/i.test(CITATION_ONLY_NOTE), false);
  assertEquals(/corpus/i.test(CITATION_ONLY_PREAMBLE), false);

  const exhibit = buildAuthorityExhibit(
    ["Cal. Civ. Code § 1798.100", "11 CCR § 7150", "EDPB Guidelines 1/2024"],
    [{ key: "prov-1", citation: "11 CCR § 7150", verbatim_excerpt: "Verbatim provision text." }],
  );
  const html = renderAuthorityExhibitHtml(exhibit);
  assertEquals(/corpus/i.test(html), false);
  assertStringIncludes(html, "Source key: prov-1");
});
