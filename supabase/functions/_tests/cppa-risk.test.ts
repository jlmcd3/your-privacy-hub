// Acceptance tests for run-cppa-risk-assessment Tool Module conversion (v2.2 core).
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSystemContent } from "../_shared/prompt-core.ts";
import { CPPA_RISK_TOOL_MODULE } from "../run-cppa-risk-assessment/index.ts";

const injected = [
  "ENFORCEMENT CONTEXT FROM CORPUS:\n(none)",
  "LONGITUDINAL ENFORCEMENT PATTERNS:\n(none)",
  "VERBATIM REGULATION TEXT (Cal. Code Regs. tit. 11 — authoritative; ground every citation in this text):\n§ 7150(b) sample",
  "CPPA AGENCY COMMENTARY — FINAL STATEMENT OF REASONS:\n(none)",
].join("\n\n");

Deno.test("assembled system is a 3-block array with expected content", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_RISK_TOOL_MODULE,
    currentDate: "2026-06-26",
    injected,
  });
  assertEquals(blocks.length, 3);
  assertStringIncludes(blocks[0].text, "PRIORITY ORDER");
  assertStringIncludes(blocks[1].text, "§ 7152 MAPPING");
  assertStringIncludes(blocks[2].text, "VERBATIM REGULATION TEXT");
});

Deno.test("blocks 1 and 2 are cached; injected block 3 is not", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_RISK_TOOL_MODULE,
    currentDate: "2026-06-26",
    injected,
  });
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[1].cache_control?.type, "ephemeral");
  assertEquals(blocks[2].cache_control, undefined);
});

Deno.test("no generic rules duplicated into block 2", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_RISK_TOOL_MODULE,
    currentDate: "2026-06-26",
    injected,
  });
  assert(!blocks[1].text.includes("American English"));
  assert(!blocks[1].text.includes("NO ADAPTIVE GUIDANCE"));
  // …but they appear in the core (block 1).
  assertStringIncludes(blocks[0].text, "American English");
  assertStringIncludes(blocks[0].text, "NO ADAPTIVE GUIDANCE");
});

Deno.test("schema accepts Insufficient basis and exception missing_elements", () => {
  const schema = CPPA_RISK_TOOL_MODULE.schema ?? "";
  // overall_risk_level allows "Insufficient basis".
  assert(/"overall_risk_level":[^,}]*"Insufficient basis"/.test(schema));
  // exceptions_status allows "Insufficient basis to assess".
  assertStringIncludes(schema, "Insufficient basis to assess");
  // exception_analysis carries missing_elements: string[].
  assertStringIncludes(schema, '"missing_elements": string[]');
  // documentation_status accepts "Insufficient basis".
  assert(/"documentation_status":[^,}]*"Insufficient basis"/.test(schema));
  // benefits_outweigh_risks_conclusion uses the RC-C1 record-completeness
  // label — "Cannot be determined — record incomplete." — not the bare
  // "Insufficient basis" shorthand (see prompt-core rule at index.ts L311).
  assert(/"benefits_outweigh_risks_conclusion":[^,}]*"Cannot be determined — record incomplete\./.test(schema));
});

Deno.test("citation framework forbids § 7221(c)(5)", () => {
  assertStringIncludes(CPPA_RISK_TOOL_MODULE.citationFramework, "Never cite § 7221(c)(5)");
});

Deno.test("§ 7150(b) subsection strings flow from CITATION_REGISTRY (no hardcoded literals for (b)(4)/(b)(5)/(b)(6) content_detail assignments)", async () => {
  const src = await Deno.readTextFile(new URL("../run-cppa-risk-assessment/index.ts", import.meta.url));
  // No hardcoded subsection assignments for the three split triggers in content_detail prose.
  assert(!/Systematic-observation profiling trigger \(§ 7150\(b\)\(4\)\)/.test(src));
  assert(!/Sensitive-location profiling trigger \(§ 7150\(b\)\(5\)\)/.test(src));
  assert(!/ADMT \/ biometric training trigger \(§ 7150\(b\)\(6\)\)/.test(src));
  // Registry consts are pulled.
  assertStringIncludes(src, "CITATION_REGISTRY.ra_trigger_observe.section");
  assertStringIncludes(src, "CITATION_REGISTRY.ra_trigger_location.section");
  assertStringIncludes(src, "CITATION_REGISTRY.ra_trigger_train.section");
});
