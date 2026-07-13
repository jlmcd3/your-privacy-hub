// Acceptance tests for run-cppa-cybersecurity Tool Module conversion (v2.2 core).
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSystemContent } from "../_shared/prompt-core.ts";
import { CPPA_CYBER_TOOL_MODULE } from "../run-cppa-cybersecurity/index.ts";
import { TARGET_PATH_ALIASES } from "../_shared/target-path-aliases.ts";
import { FIXTURE_CYBER_YIELD_K1 } from "../_shared/cyber-contract-fixtures.ts";

// RC-C3.CYB-2 (RULING 2) — PIN the 18-entry ordering across:
//   (a) TARGET_PATH_ALIASES.cppa_cybersecurity  (ask-vocab → controls[N].status)
//   (b) FIXTURE_CYBER_YIELD_K1.intake.controls  (fixture slug order)
//   (c) run-cppa-cybersecurity ALL_COMPONENTS   (report shape row order,
//        transitively fixed via COMPONENT_CITATIONS §7123(c)(1)..(18))
// A reorder or miscount in any one of the three MUST fail the build.
const EXPECTED_ORDER = [
  "c1_auth", "c2_encryption", "c3_account_access", "c4_inventory", "c5_secure_config",
  "c6_vuln_mgmt", "c7_audit_logs", "c8_network_mon", "c9_anti_malware", "c10_segmentation",
  "c11_port_protocol", "c12_awareness", "c13_training", "c14_secure_dev", "c15_third_party",
  "c16_retention", "c17_incident", "c18_continuity",
];

Deno.test("cyber alias table pins 18 ask→controls[N].status entries in slug order", () => {
  const map = TARGET_PATH_ALIASES.cppa_cybersecurity ?? {};
  const askKeys = Object.keys(map);
  assertEquals(askKeys.length, 18, "must have exactly 18 alias entries");
  EXPECTED_ORDER.forEach((slug, idx) => {
    const askPath = `controls.${slug}`;
    assertEquals(askKeys[idx], askPath, `alias entry #${idx} must be ${askPath}`);
    const aliases = map[askPath];
    assertEquals(aliases, [`controls[${idx}].status`],
      `alias for ${askPath} must map to ["controls[${idx}].status"] (TIGHT — status leaf only)`);
  });
});

Deno.test("cyber fixture controls array matches the pinned slug order 1:1", () => {
  const controls = (FIXTURE_CYBER_YIELD_K1.intake as any).controls as Array<{ key: string }>;
  assertEquals(controls.length, 18, "fixture must have exactly 18 controls");
  EXPECTED_ORDER.forEach((slug, idx) => {
    assertEquals(controls[idx].key, slug, `fixture control #${idx} must be ${slug}`);
  });
});

Deno.test("cyber fixture answer_targets use DOTTED ask-vocabulary paths", () => {
  assertEquals(FIXTURE_CYBER_YIELD_K1.answer_targets, [
    "controls.c13_training",
    "controls.c14_secure_dev",
  ]);
});



Deno.test("assembled system is a 2-block array with expected content", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_CYBER_TOOL_MODULE,
    currentDate: "2026-06-26",
  });
  assertEquals(blocks.length, 2);
  assertStringIncludes(blocks[0].text, "PRIORITY ORDER");
  assertStringIncludes(blocks[1].text, "PHASE-IN");
  assertStringIncludes(blocks[1].text, "AUDIT vs CERTIFICATION");
});

Deno.test("both blocks carry ephemeral cache_control", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_CYBER_TOOL_MODULE,
    currentDate: "2026-06-26",
  });
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[1].cache_control?.type, "ephemeral");
});

Deno.test("no generic rules duplicated into block 2", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_CYBER_TOOL_MODULE,
    currentDate: "2026-06-26",
  });
  assert(!blocks[1].text.includes("American English"));
  assert(!blocks[1].text.includes("NO ADAPTIVE GUIDANCE"));
  // …but they appear in the core (block 1).
  assertStringIncludes(blocks[0].text, "American English");
  assertStringIncludes(blocks[0].text, "NO ADAPTIVE GUIDANCE");
});

Deno.test("tool module forbids inventing control citations", () => {
  assertStringIncludes(
    CPPA_CYBER_TOOL_MODULE.citationFramework,
    "never invent, alter, or reorder a control citation",
  );
});

Deno.test("extra rules require Insufficient information for ungathered controls", () => {
  const rules = CPPA_CYBER_TOOL_MODULE.extraRules ?? "";
  assertStringIncludes(rules, "Insufficient information");
});

Deno.test("extra rules allow 'Insufficient basis to assess' as a readiness label", () => {
  const rules = CPPA_CYBER_TOOL_MODULE.extraRules ?? "";
  assertStringIncludes(rules, "Insufficient basis to assess");
});

Deno.test("synthesis prompt schema includes 'Insufficient basis to assess' for readiness_level", async () => {
  const src = await Deno.readTextFile(new URL("../run-cppa-cybersecurity/index.ts", import.meta.url));
  assertStringIncludes(
    src,
    '"readiness_level": "Audit-Ready | Substantially Ready | Material Gaps | Critical Gaps | Insufficient basis to assess"',
  );
});

Deno.test("consistency-fix block applies the ≥6 insufficient-info threshold", async () => {
  const src = await Deno.readTextFile(new URL("../run-cppa-cybersecurity/index.ts", import.meta.url));
  assertStringIncludes(src, "INSUFFICIENT_THRESHOLD = 6");
  assertStringIncludes(src, '"Insufficient basis to assess"');
});
