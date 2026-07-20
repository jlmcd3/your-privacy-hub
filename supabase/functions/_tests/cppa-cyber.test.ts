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
  // RC-P5: fixture bumped to 15/18 partial submission — 3 empty controls
  // (c13_training, c14_secure_dev, c15_third_party) matching the 3-cap.
  assertEquals(FIXTURE_CYBER_YIELD_K1.answer_targets, [
    "controls.c13_training",
    "controls.c14_secure_dev",
    "controls.c15_third_party",
  ]);
});

// RC-C3.CLOSE-1 (item 2) — T_CLASS_FIELDS.cppa_cybersecurity MUST carry all
// 18 dotted control paths, each routed to the shared "cppa_cybersecurity:
// maturity" enum_ref. Prevents regressions where cyber open_items freeze
// with input_spec bounded-narrative instead of the maturity re-select.
Deno.test("cyber T_CLASS pins 18 controls.<slug> → cppa_cybersecurity:maturity", async () => {
  const src = await Deno.readTextFile(new URL("../_shared/open-items.ts", import.meta.url));
  for (const slug of EXPECTED_ORDER) {
    const needle = `"controls.${slug}"`;
    assertStringIncludes(src, needle);
  }
  // Every controls.<slug> line in the cppa_cybersecurity block must route
  // to the shared maturity enum. A raw regex is enough for a pin test.
  const block = src.split("cppa_cybersecurity: {")[1]?.split("\n};")[0] ?? "";
  for (const slug of EXPECTED_ORDER) {
    const line = block.split("\n").find((l) => l.includes(`"controls.${slug}"`)) ?? "";
    assertStringIncludes(line, "cppa_cybersecurity:maturity");
  }
});

Deno.test("cyber maturity enum resolves via server FIELD_ENUM_MIRROR", async () => {
  const { resolveEnumRef } = await import("../_shared/field-enums.ts");
  const opts = resolveEnumRef("cppa_cybersecurity:maturity");
  assert(Array.isArray(opts) && opts.length === 5,
    `expected 5 maturity options; got ${JSON.stringify(opts)}`);
  // Anchored to intake page constants (do NOT retype here — assert shape only).
  assert(opts!.some((o) => /Not implemented/i.test(o)));
  assert(opts!.some((o) => /continuous monitoring/i.test(o)));
});

// RC-C3.CYB-3 (P-1) — deterministic ask-synthesis walker: for the fixture's
// two empty-maturity controls (c13_training, c14_secure_dev), guard must
// mint dotted asks. Copy must never contain "gap".
Deno.test("cyber synthesis walker mints dotted asks for empty-maturity controls", async () => {
  const { guardInformationNeeded } = await import("../_shared/insufficient-info-guard.ts");
  const report: any = { information_needed: [], lint_warnings: [] };
  const { report: guarded } = guardInformationNeeded(
    report,
    FIXTURE_CYBER_YIELD_K1.intake as Record<string, unknown>,
    "cppa_cybersecurity",
  );
  const fields = (guarded.information_needed as any[]).map((e) => e.field);
  assert(
    fields.includes("controls.c13_training"),
    `expected controls.c13_training in ${JSON.stringify(fields)}`,
  );
  assert(
    fields.includes("controls.c14_secure_dev"),
    `expected controls.c14_secure_dev in ${JSON.stringify(fields)}`,
  );
  for (const e of guarded.information_needed as any[]) {
    const blob = `${e.why} ${e.how_to_provide}`.toLowerCase();
    assert(!blob.includes("gap"), `D8 violation — "gap" in copy: ${blob}`);
  }
  const lintCodes = (guarded.lint_warnings as any[]).map((l) => l.code);
  assert(
    lintCodes.includes("critical_ask_synthesised"),
    `expected critical_ask_synthesised lint row; got ${JSON.stringify(lintCodes)}`,
  );
});




Deno.test("assembled system is a 3-block array with expected content (COUNSEL-VOICE-1B advisory tail)", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_CYBER_TOOL_MODULE,
    currentDate: "2026-06-26",
  });
  assertEquals(blocks.length, 3);
  assertStringIncludes(blocks[0].text, "PRIORITY ORDER");
  assertStringIncludes(blocks[1].text, "PHASE-IN");
  assertStringIncludes(blocks[1].text, "AUDIT vs CERTIFICATION");
  // Advisory-voice tail (blocks[2]) carries the canonical closes and the
  // counsel-referral prohibition. Regressing the voice policy MUST break here.
  assertStringIncludes(blocks[2].text, "further clarification is advisable.");
  assertStringIncludes(blocks[2].text, "further internal investigation is advisable.");
  assertStringIncludes(blocks[2].text, "NEVER instruct the reader to consult legal counsel");
});

Deno.test("blocks 1 and 2 carry ephemeral cache_control; advisory tail is uncached", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_CYBER_TOOL_MODULE,
    currentDate: "2026-06-26",
  });
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[1].cache_control?.type, "ephemeral");
  assertEquals(blocks[2].cache_control, undefined);
});

Deno.test("no generic rules duplicated into block 2; generic lines exist exactly once", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_CYBER_TOOL_MODULE,
    currentDate: "2026-06-26",
  });
  assert(!blocks[1].text.includes("US English (en-US)"));
  assert(!blocks[1].text.includes("NO ADAPTIVE GUIDANCE"));
  // …but they appear in the core (block 1).
  assertStringIncludes(blocks[0].text, "US English (en-US)");
  assertStringIncludes(blocks[0].text, "NO ADAPTIVE GUIDANCE");
  // Generic rules appear EXACTLY ONCE across all blocks.
  const priorityHits = blocks.filter((b) => /PRIORITY ORDER/.test(b.text)).length;
  assertEquals(priorityHits, 1);
  const adaptiveHits = blocks.filter((b) => /NO ADAPTIVE GUIDANCE/.test(b.text)).length;
  assertEquals(adaptiveHits, 1);
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
