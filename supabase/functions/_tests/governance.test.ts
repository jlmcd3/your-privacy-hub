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

Deno.test("Governance domain system: block 1 has PRIORITY ORDER; block 2 has identity + extra rules; advisory tail present", () => {
  const tm = buildGovernanceDomainToolModule(["California"], "No");
  const blocks = buildSystemContent({ toolModule: tm, currentDate: today, cache: true });
  assert(Array.isArray(blocks));
  // COUNSEL-VOICE-1B — no-injected assemblies emit [core, tool, advisory].
  assertEquals(blocks.length, 3);
  assertStringIncludes(blocks[0].text, "PRIORITY ORDER");
  assertStringIncludes(blocks[1].text, "senior privacy and data protection compliance analyst");
  assertStringIncludes(blocks[2].text, "further clarification is advisable.");
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[1].cache_control?.type, "ephemeral");
  assertEquals(blocks[2].cache_control, undefined);
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

Deno.test("Synthesis with injected enforcement context produces an injected block plus advisory tail (uncached)", () => {
  const tm = buildGovernanceSynthesisToolModule(["UK"], "Yes");
  const blocks = buildSystemContent({
    toolModule: tm,
    currentDate: today,
    injected: "ENFORCEMENT CONTEXT (synthesis only):\n[E1] ...",
    cache: true,
  });
  // COUNSEL-VOICE-1B — with-injected assemblies emit [core, tool, injected, advisory].
  assertEquals(blocks.length, 4);
  assertEquals(blocks[2].cache_control, undefined);
  assertEquals(blocks[3].cache_control, undefined);
  assertStringIncludes(blocks[2].text, "ENFORCEMENT CONTEXT");
  assertStringIncludes(blocks[3].text, "further clarification is advisable.");
  assertStringIncludes(blocks[3].text, "NEVER instruct the reader to consult legal counsel");
});

Deno.test("Generic 'Return ONLY valid JSON' lives in the core, not duplicated in block 2", () => {
  const tm = buildGovernanceDomainToolModule(["California"], "No");
  const blocks = buildSystemContent({ toolModule: tm, currentDate: today });
  assert(!/Return ONLY valid JSON/i.test(blocks[1].text),
    "block 2 must not duplicate the core's strict-JSON output discipline");
});

// P4 — ASK_ELIGIBLE_CRITICAL_FIELDS registry closure.
import {
  ASK_ELIGIBLE_CRITICAL_FIELDS,
  guardInformationNeeded,
} from "../_shared/insufficient-info-guard.ts";

Deno.test("P4 registry: governance_assessment is intentionally empty (CEO 2026-07-14)", () => {
  assertEquals(ASK_ELIGIBLE_CRITICAL_FIELDS.governance_assessment.length, 0);
});

Deno.test("P4 registry: cppa_admt entries match verified reachable-empty set", () => {
  assertEquals(
    [...ASK_ELIGIBLE_CRITICAL_FIELDS.cppa_admt].sort(),
    ["notice_purpose_text", "opt_out_methods"].sort(),
  );
});

Deno.test("P4 guard: fully-populated governance intake synthesises zero critical asks", () => {
  const intake = {
    sector: "SaaS",
    size: "50-249",
    jurisdictions: ["California"],
    eu_uk_data: "No",
    dpo_status: "n/a",
    transfer_mechanism: "n/a",
    privacy_notice_coverage: "Comprehensive",
    dpia_status: "In place",
    incident_response_plan: "Yes",
  };
  const report: any = { information_needed: [], lint_warnings: [] };
  const out = guardInformationNeeded(report, intake, "governance_assessment");
  assertEquals(out.report.information_needed.length, 0);
  assertEquals(out.autoRepaired, 0);
});
