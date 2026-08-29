// G-2 (2026-08-28, doc 95/100 of the spine-vs-prompt comparison program) —
// ART. 35(3) CANDIDATE-TRIGGER SCREENING for Domain 8 (Privacy Impact
// Assessment Status). The old prompt screened the company's recorded
// processing against Art. 35(3)'s subsections precisely; the deterministic
// table had collapsed that to one generic Art. 35(1) sentence regardless of
// what the record showed. This suite pins the restored candidate-naming
// behavior: (3)(b) named only when special_category="Yes" (large-scale
// always left open, since this intake has no scale field); the WP248
// "innovative use of new technology" / (3)(a) candidate named only when AI
// tools are recorded; (3)(c) NEVER named (no physical-monitoring signal in
// this intake); the Art. 35(1)-vs-35(3) illustrative-relationship sentence
// appears only when at least one candidate fired; and a record with neither
// signal gets no new text at all (byte-identical to pre-fix behavior).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDomainFindingsTyped } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts";

const BASE = {
  jurisdictions: ["EU (GDPR)"],
  special_category: "No",
  inventory_audit: "Yes — audited + formal approval process",
  technical_controls: "Yes — DLP/content filtering actively enforced",
  dpa_status: "Yes, all vendors",
  dpa_art28_verified: "Yes — verified",
  tool_instruction: "Yes, written policy with specific prohibitions",
  training_status: "Yes, formal onboarding + annual refresh",
  training_ai_coverage: "Yes — explicitly covers AI tools",
  incident_response: "Yes, tested in last 12 months",
  dpia_status: "No, none conducted",
  dsr_capability: "Yes — documented and tested across all vendors",
  privacy_policy: "Yes, current (reviewed in last 12 months)",
  privacy_notice_coverage: "Yes — notice covers all current activities, transfers, retention, and rights",
};

Deno.test("G-2 — no special-category data and no recorded tools: no candidate text at all (unchanged behavior)", () => {
  const f = buildDomainFindingsTyped(BASE);
  assertEquals(
    f["dpia_status"].current_state,
    "The company has answered that no DPIA has been conducted.",
  );
});

Deno.test("G-2 — special_category=Yes names Art. 35(3)(b) as a candidate, with the recorded categories, and leaves large-scale open", () => {
  const f = buildDomainFindingsTyped({
    ...BASE,
    special_category: "Yes",
    special_categories_list: ["Health data", "Genetic data"],
  });
  const cs = f["dpia_status"].current_state;
  assertStringIncludes(cs, "Art. 35(3)(b)");
  assertStringIncludes(cs, "candidate trigger");
  assertStringIncludes(cs, "Health data, Genetic data");
  assertStringIncludes(cs, "large scale is not resolved on the information provided");
  // never concludes the trigger applies or doesn't
  assert(!/Art\.\s*35\(3\)\(b\)\s+(applies|is engaged|is triggered)\b/i.test(cs));
});

Deno.test("G-2 — special_category=Yes with no special_categories_list falls back to a generic phrase, never crashes or invents a category", () => {
  const f = buildDomainFindingsTyped({ ...BASE, special_category: "Yes" });
  const cs = f["dpia_status"].current_state;
  assertStringIncludes(cs, "special categories of data");
  assertStringIncludes(cs, "Art. 35(3)(b)");
});

Deno.test("G-2 — recorded AI tools name the WP248 new-technology criterion and Art. 35(3)(a) as a candidate, never (3)(c)", () => {
  const f = buildDomainFindingsTyped({
    ...BASE,
    tools: ["Microsoft 365 / Copilot", "Salesforce + Einstein"],
  });
  const cs = f["dpia_status"].current_state;
  assertStringIncludes(cs, "innovative use or application of new technological or organisational solutions");
  assertStringIncludes(cs, "Art. 35(3)(a)");
  assertStringIncludes(cs, "Microsoft 365 / Copilot, Salesforce + Einstein");
  assertStringIncludes(cs, "not resolved on the information provided");
  assert(!cs.includes("35(3)(c)"), `must never name (3)(c) — no physical-monitoring signal exists in this intake: ${cs}`);
});

Deno.test("G-2 — single recorded tool uses singular phrasing", () => {
  const f = buildDomainFindingsTyped({ ...BASE, tools: ["Claude / Anthropic"] });
  assertStringIncludes(f["dpia_status"].current_state, "the recorded AI tool (Claude / Anthropic)");
});

Deno.test("G-2 — both signals present: both candidates named, plus the Art. 35(1)-vs-35(3) illustrative sentence exactly once", () => {
  const f = buildDomainFindingsTyped({
    ...BASE,
    special_category: "Yes",
    special_categories_list: ["Biometric data"],
    tools: ["ChatGPT / OpenAI"],
  });
  const cs = f["dpia_status"].current_state;
  assertStringIncludes(cs, "Art. 35(3)(b)");
  assertStringIncludes(cs, "Art. 35(3)(a)");
  const illustrative = "non-exhaustive list of examples of processing that meets the Article 35(1) high-risk threshold";
  assertStringIncludes(cs, illustrative);
  // exactly once
  const count = cs.split(illustrative).length - 1;
  assertEquals(count, 1);
  // never presented as a second, separate obligation
  assert(!/second requirement/i.test(cs));
});

Deno.test("G-2 — the illustrative sentence NEVER appears when no candidate fired", () => {
  const f = buildDomainFindingsTyped(BASE);
  assert(!f["dpia_status"].current_state.includes("non-exhaustive list of examples"));
});

Deno.test("G-2 — candidate text is appended consistently across every dpia_status branch, including Unsure and multiple-DPIAs-completed", () => {
  const withTools = { ...BASE, tools: ["Grammarly"] };

  const unsure = buildDomainFindingsTyped({ ...withTools, dpia_status: "Unsure" });
  assertStringIncludes(unsure["dpia_status"].current_state, "Art. 35(3)(a)");
  // gap_description / severity for Unsure are untouched by this fix
  assertEquals(unsure["dpia_status"].severity, "Unresolved");
  assertEquals(unsure["dpia_status"].gap_description, "The company's answers do not resolve this issue.");

  const multiple = buildDomainFindingsTyped({
    ...withTools,
    dpia_status: "Yes, multiple DPIAs completed",
    dpia_ai_coverage: "Yes — all AI/high-risk tools assessed",
  });
  assertStringIncludes(multiple["dpia_status"].current_state, "Art. 35(3)(a)");
  // severity/gap logic for the fully-covered case is untouched
  assertEquals(multiple["dpia_status"].severity, "Compliant");
  assertEquals(multiple["dpia_status"].gap_description, null);

  const one = buildDomainFindingsTyped({ ...withTools, dpia_status: "Yes, one DPIA completed" });
  assertStringIncludes(one["dpia_status"].current_state, "Art. 35(3)(a)");

  const fallback = buildDomainFindingsTyped({ ...withTools, dpia_status: "" });
  assertStringIncludes(fallback["dpia_status"].current_state, "Art. 35(3)(a)");
});

Deno.test("G-2 — never asserts a conclusion either way for either candidate (advocate-drafter / flag-don't-conclude discipline)", () => {
  const f = buildDomainFindingsTyped({
    ...BASE,
    special_category: "Yes",
    special_categories_list: ["Health data"],
    tools: ["Zoom + AI features"],
  });
  const cs = f["dpia_status"].current_state.toLowerCase();
  for (const banned of ["does not apply", "is not engaged", "35(3) does not apply"]) {
    assert(!cs.includes(banned), `must not contain "${banned}": ${cs}`);
  }
});

Deno.test("G-2 — determinism: identical input produces byte-identical output", () => {
  const input = { ...BASE, special_category: "Yes", tools: ["HubSpot"] };
  const a = JSON.stringify(buildDomainFindingsTyped(input)["dpia_status"]);
  const b = JSON.stringify(buildDomainFindingsTyped(input)["dpia_status"]);
  assertEquals(a, b);
});
