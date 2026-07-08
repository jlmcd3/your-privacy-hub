// Acceptance tests for run-governance-assessment Tool Module conversion (v2.2 core).
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSystemContent } from "../_shared/prompt-core.ts";
import {
  buildGovernanceDomainToolModule,
  buildGovernanceSynthesisToolModule,
} from "../run-governance-assessment/index.ts";

const today = "2026-06-26";

Deno.test("Governance domain system: block 1 has PRIORITY ORDER; block 2 has identity + extra rules", () => {
  const tm = buildGovernanceDomainToolModule(["California"], "No");
  const blocks = buildSystemContent({ toolModule: tm, currentDate: today, cache: true });
  assert(Array.isArray(blocks));
  assertEquals(blocks.length, 2);
  assertStringIncludes(blocks[0].text, "PRIORITY ORDER");
  assertStringIncludes(blocks[1].text, "senior privacy and data protection compliance analyst");
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[1].cache_control?.type, "ephemeral");
});

Deno.test("Domain prefix is stable across calls (cacheable across 10 domain calls)", () => {
  const tm = buildGovernanceDomainToolModule(["California"], "No");
  const a = buildSystemContent({ toolModule: tm, currentDate: today, cache: true });
  const b = buildSystemContent({ toolModule: tm, currentDate: today, cache: true });
  assertEquals(a[0].text, b[0].text);
  assertEquals(a[1].text, b[1].text);
});

Deno.test("LANGUAGE override survives (jurisdiction-aware English variant)", () => {
  const tm = buildGovernanceDomainToolModule(["Germany"], "Yes");
  const blocks = buildSystemContent({ toolModule: tm, currentDate: today });
  const all = blocks.map((b) => b.text).join("\n");
  assertStringIncludes(all, "British English when any EU/UK jurisdiction is present");
});

Deno.test("German private-sector controllers map to Land authority (never BfDI)", () => {
  const tm = buildGovernanceDomainToolModule(["Germany"], "Yes");
  const blocks = buildSystemContent({ toolModule: tm, currentDate: today });
  const all = blocks.map((b) => b.text).join("\n");
  assertStringIncludes(all, "Never name the BfDI for a private-sector controller");
});

Deno.test("SA naming discipline routes Netherlands (and every jurisdiction) through the resolved block", () => {
  const tm = buildGovernanceDomainToolModule(["Netherlands"], "Yes");
  const all = buildSystemContent({ toolModule: tm, currentDate: today })
    .map((b) => b.text).join("\n");
  // Post-3.6 governance module names SAs ONLY from the injected RESOLVED GDPR
  // CITATIONS block — no per-country literal ("Netherlands AP", "NEVER UODO",
  // etc.) is emitted from the static prompt. Assert the discipline itself.
  assertStringIncludes(all, "Name supervisory authorities ONLY from the injected RESOLVED GDPR CITATIONS block");
  assertStringIncludes(all, "the relevant supervisory authority in");
});

Deno.test("US-only intake: framework scoping rule is present and EU_UK_DATA=No is rendered", () => {
  const tm = buildGovernanceDomainToolModule(["California"], "No");
  const all = buildSystemContent({ toolModule: tm, currentDate: today })
    .map((b) => b.text).join("\n");
  assertStringIncludes(all, "EU_UK_DATA: No");
  assertStringIncludes(all, "do NOT cite GDPR/UK GDPR/EU authorities");
});

Deno.test("Synthesis module carries the monetary-penalty discipline + known ICO figures", () => {
  const tm = buildGovernanceSynthesisToolModule(["UK"], "Yes");
  const all = buildSystemContent({ toolModule: tm, currentDate: today })
    .map((b) => b.text).join("\n");
  assertStringIncludes(all, "ICO Clearview AI (2022) £7,552,800");
  assertStringIncludes(all, "ICO Interserve (2022) £4,400,000");
  assertStringIncludes(all, "ICO Capita Pension Solutions (2024) £6,090,000");
  assertStringIncludes(all, "ICO British Airways (2020) £20,000,000");
  // Domain module does NOT include the monetary rule.
  const dm = buildGovernanceDomainToolModule(["UK"], "Yes");
  const dmAll = buildSystemContent({ toolModule: dm, currentDate: today })
    .map((b) => b.text).join("\n");
  assert(!/ICO British Airways/.test(dmAll),
    "domain module must not carry synthesis-only monetary rule");
});

Deno.test("Synthesis with injected enforcement context produces a third block (uncached)", () => {
  const tm = buildGovernanceSynthesisToolModule(["UK"], "Yes");
  const blocks = buildSystemContent({
    toolModule: tm,
    currentDate: today,
    injected: "ENFORCEMENT CONTEXT (synthesis only):\n[E1] ...",
    cache: true,
  });
  assertEquals(blocks.length, 3);
  assertEquals(blocks[2].cache_control, undefined);
  assertStringIncludes(blocks[2].text, "ENFORCEMENT CONTEXT");
});

Deno.test("Generic 'Return ONLY valid JSON' lives in the core, not duplicated in block 2", () => {
  const tm = buildGovernanceDomainToolModule(["California"], "No");
  const blocks = buildSystemContent({ toolModule: tm, currentDate: today });
  assert(!/Return ONLY valid JSON/i.test(blocks[1].text),
    "block 2 must not duplicate the core's strict-JSON output discipline");
});
