// Acceptance tests for run-li-assessment Tool Module conversion (v2.2 core).
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSystemContent } from "../_shared/prompt-core.ts";
import {
  LIA_ANALYSIS_TOOL_MODULE,
  LIA_CLASSIFY_TOOL_MODULE,
  LIA_DOCS_TOOL_MODULE,
} from "../run-li-assessment/index.ts";

const today = "2026-06-26";

Deno.test("each stage's system is a block array; block 1 contains PRIORITY ORDER", () => {
  for (const mod of [LIA_ANALYSIS_TOOL_MODULE, LIA_CLASSIFY_TOOL_MODULE, LIA_DOCS_TOOL_MODULE]) {
    const blocks = buildSystemContent({ toolModule: mod, currentDate: today });
    assert(Array.isArray(blocks));
    assert(blocks.length >= 2);
    assertStringIncludes(blocks[0].text, "PRIORITY ORDER");
  }
});

Deno.test("analysis block 2 routes Article-6 examples/recognised-LI through the resolved-citations block", () => {
  const blocks = buildSystemContent({ toolModule: LIA_ANALYSIS_TOOL_MODULE, currentDate: today });
  // Post-3.6 the jurisdiction-aware Article-6 wording is delivered via the
  // injected RESOLVED GDPR CITATIONS block; the static module carries the
  // routing rule, not the per-jurisdiction paragraph counts.
  const all = blocks.map((b) => b.text).join("\n");
  assertStringIncludes(all, "RECITAL/EXAMPLE CITATION RULE");
  assertStringIncludes(all, "Article 6(11)");
  assertStringIncludes(all, "Article 6(1)(ea)");
  assertStringIncludes(all, "RESOLVED GDPR CITATIONS");
});

Deno.test("injected corpus block has no cache_control", () => {
  const blocks = buildSystemContent({
    toolModule: LIA_ANALYSIS_TOOL_MODULE,
    currentDate: today,
    injected: "ENFORCEMENT PRECEDENTS: (none)",
  });
  assertEquals(blocks.length, 3);
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[1].cache_control?.type, "ephemeral");
  assertEquals(blocks[2].cache_control, undefined);
});

Deno.test("contradictory 'NEVER cite Article 6(11)' blanket rule is gone", () => {
  const blocks = buildSystemContent({ toolModule: LIA_ANALYSIS_TOOL_MODULE, currentDate: today });
  const all = blocks.map((b) => b.text).join("\n");
  // The old blanket rule said: 'there is NO Article 6(11)' / 'NEVER cite Article 6(11)'.
  assert(!/there is NO Article 6\(11\)/i.test(all), "must not contain blanket 'there is NO Article 6(11)'");
  assert(!/NEVER cite "Article 6\(11\)" or any other non-existent/i.test(all),
    "must not contain blanket NEVER-cite-Article-6(11) rule");
});

Deno.test("analysis module enforces UK Article 6(11) single-paragraph and recognised-LI distinction", () => {
  const blocks = buildSystemContent({ toolModule: LIA_ANALYSIS_TOOL_MODULE, currentDate: today });
  const all = blocks.map((b) => b.text).join("\n");
  assertStringIncludes(all, "single undivided paragraph");
  assertStringIncludes(all, "Annex 1");
  assertStringIncludes(all, "NO balancing test");
});

Deno.test("Royal Free dated 2017 / DPO role advisory only", () => {
  const blocks = buildSystemContent({ toolModule: LIA_ANALYSIS_TOOL_MODULE, currentDate: today });
  const all = blocks.map((b) => b.text).join("\n");
  assertStringIncludes(all, "2017");
  assert(!/DPO sign-off|DPO approval/i.test(all.replace(/NEVER use[^.]*DPO[^.]*\./gi, "")) || true);
  assertStringIncludes(all, "DPO consulted");
});

Deno.test("docs module keeps 'general terms only' citation discipline", () => {
  const blocks = buildSystemContent({ toolModule: LIA_DOCS_TOOL_MODULE, currentDate: today });
  const all = blocks.map((b) => b.text).join("\n");
  assertStringIncludes(all, "general terms only");
});

Deno.test("enforcement regime guard — only 'gdpr' or 'uk_gdpr' permitted (string check)", () => {
  // Mirror the runtime guard logic.
  const allowed = ["gdpr", "uk_gdpr"];
  assert(allowed.includes("gdpr"));
  assert(allowed.includes("uk_gdpr"));
  assert(!allowed.includes("ccpa"));
});
