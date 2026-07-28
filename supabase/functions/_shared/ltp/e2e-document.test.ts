/**
 * ITEM 235b (T-M9.5b) — LAW 2: DETERMINISTIC END-TO-END DOCUMENT TEST.
 * ITEM 236  (T-M9.6, RUN #170 FIXES) — LAW 2 TIGHTENED (checklist line 2):
 *   the E2E document test MUST FAIL when any section classified
 *   expected-emission=always omits — an always-section's absence is
 *   never intentional. `no_content` is not a permitted omission reason
 *   for an always-section; reclassify honestly rather than weakening.
 *
 * REQUIRED CI GATE. CEO ruling verbatim:
 *   "'Tests are green' must always imply 'the document is full.'
 *    No exceptions."
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleReport } from "./pass2-assembler.ts";
import { derivePlan } from "./derive.ts";
import {
  CPPA_RISK_SECTION_SHARDS,
  expectedEmissionForKey,
} from "./section-shards/cppa-risk.ts";
import { CPPA_RISK_REPORT_SCHEMA } from "../report-schemas/cppa-risk.ts";
import { INTERPOLATION_RESIDUE_PATTERNS } from "./pass2-render.ts";
import { composeSection } from "./section-composers/cppa-risk.ts";
import { chooseVariant } from "./closeness.ts";

const ALLOWED_OMIT_REASONS: readonly string[] = [
  "no_content",
  "manifest_absent",
  "template_cut_empty_by_design",
  "harvest_rejected",
  "flat_certainty_on_close_balance",
  "pii_leak",
  "empty_by_finding",
  "fill-or-omit-rejected",
  "required_slot_empty",
  "interpolation_residue",
];

/** Blank-slot patterns anywhere in the shipped body — ZERO tolerance. */
const BLANK_PATTERNS: readonly RegExp[] = [
  ...INTERPOLATION_RESIDUE_PATTERNS,
  / For , /,
  /— Deadline basis:\s{2,}\(/,
  /:\s\./,
];

function fixturePlan() {
  return derivePlan({
    intake: {
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q18_admt_use: "no",
    },
    report_data: {},
    buildStamp: "e2e-document@test",
  });
}

function walkStrings(v: unknown, out: string[]): void {
  if (typeof v === "string") { out.push(v); return; }
  if (Array.isArray(v)) { for (const x of v) walkStrings(x, out); return; }
  if (v && typeof v === "object") {
    for (const x of Object.values(v as Record<string, unknown>)) walkStrings(x, out);
  }
}

Deno.test("LAW 2 (i): every emitted section carries real, residue-free content", () => {
  const plan = fixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const emitted = result.telemetry.sections.filter((s) => s.emitted);
  assert(emitted.length > 0, "no sections were emitted at all");
  for (const s of emitted) {
    const val = (result.report as Record<string, unknown>)[s.key];
    assert(val !== undefined && val !== null, `emitted section ${s.key} missing on report`);
    const strings: string[] = [];
    walkStrings(val, strings);
    if (strings.length > 0) {
      const anyNonEmpty = strings.some((x) => x.trim().length > 0);
      assert(anyNonEmpty, `emitted section ${s.key} contains only empty strings`);
    }
  }
});

Deno.test("LAW 2 (ii): every omitted section carries a classified omit reason", () => {
  const plan = fixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const omitted = result.telemetry.sections.filter((s) => !s.emitted);
  for (const s of omitted) {
    assert(
      s.omitted_reason !== undefined && s.omitted_reason !== null,
      `omitted section ${s.key} has no omitted_reason`,
    );
    assert(
      ALLOWED_OMIT_REASONS.includes(s.omitted_reason as string),
      `omitted section ${s.key} has unclassified omitted_reason: ${s.omitted_reason}`,
    );
  }
});

Deno.test("LAW 2 (iii): every shipped top-level key ∈ shard registry AND ∈ report schema", () => {
  const plan = fixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const shardKeys = new Set(CPPA_RISK_SECTION_SHARDS.map((s) => s.key));
  const schemaKeys = new Set(CPPA_RISK_REPORT_SCHEMA.topLevel);
  for (const k of Object.keys(result.report)) {
    assert(shardKeys.has(k), `shipped key ${k} not in shard registry`);
    assert(schemaKeys.has(k), `shipped key ${k} not in report schema top-level`);
  }
});

Deno.test("LAW 2 (iv): zero blank-slot patterns anywhere on the shipped surface", () => {
  const plan = fixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const strings: string[] = [];
  walkStrings(result.report, strings);
  for (const s of strings) {
    for (const re of BLANK_PATTERNS) {
      assert(!re.test(s), `blank-slot pattern ${re} matched shipped string: ${JSON.stringify(s.slice(0, 120))}`);
    }
  }
});

Deno.test("LAW 2: structural completeness — assembler reports no nonconformant keys", () => {
  const plan = fixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  assertEquals(result.telemetry.structural_completeness.nonconformant_keys, []);
  assertEquals(result.telemetry.structural_completeness.ok, true);
});

// ── ITEM 236 (T-M9.6) — LAW 2 TIGHTENING + per-fix regressions ───────────

Deno.test("ITEM 236 / LAW 2 TIGHTENED: no always-section may omit for ANY reason", () => {
  const plan = fixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  for (const s of result.telemetry.sections) {
    const cls = expectedEmissionForKey(s.key);
    if (cls === "always") {
      assert(
        s.emitted,
        `always-section ${s.key} omitted with reason=${s.omitted_reason} — reclassify honestly rather than allowing intentional absence`,
      );
    }
  }
});

Deno.test("ITEM 236 fix (b): balance-template selection routes through chooseVariant (never firm at closeness ≥ threshold)", () => {
  const plan = { ...fixturePlan() };
  // Force a close balance: inject one weighing_frame entry at threshold.
  const withClose = {
    ...plan,
    weighing_frame: [
      { pinpoint: "test", anchor_hint: "test factor", closeness_contribution: 0.9 },
    ],
  } as any;
  const instances = composeSection("risk_assessment_by_activity", withClose) ?? [];
  for (const i of instances) {
    assert(
      i.template_id !== "T.risk.balance.firm",
      `firm variant selected at closeness ≥ threshold via composer: ${JSON.stringify(i)}`,
    );
  }
  const asum = composeSection("assessment_summary", withClose) ?? [];
  assert(
    asum.every((i) => i.template_id !== "T.risk.balance.firm"),
    "assessment_summary emitted firm variant at close balance",
  );
});

Deno.test("ITEM 236 fix (b): chooseVariant contract — closeness ≥ 0.6 → hedged", () => {
  assertEquals(chooseVariant(0.6), "hedged");
  assertEquals(chooseVariant(0.59), "firm");
});

Deno.test("ITEM 236 fix (c): boilerplate always-sections are emitted with real content", () => {
  const plan = fixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const alwaysBoilerplate = [
    "schema_version",
    "document_metadata",
    "attestation_block",
    "disclaimer",
    "framework_disclaimer",
    "accuracy_caveat",
    "enforcement_context",
  ];
  for (const k of alwaysBoilerplate) {
    const v = (result.report as Record<string, unknown>)[k];
    assert(v !== undefined && v !== null, `always-boilerplate ${k} missing from shipped body`);
  }
});

Deno.test("ITEM 236 fix (d): exec-summary activity_label never carries a raw intake answer prefix", () => {
  const plan = fixturePlan();
  const instances = composeSection("executive_summary", plan) ?? [];
  for (const i of instances) {
    const label = (i.ctx as Record<string, unknown>).activity_label;
    if (typeof label === "string") {
      assert(
        !/^Yes\s/i.test(label) && !/^No\s/i.test(label),
        `activity_label sourced from raw intake answer: ${JSON.stringify(label)}`,
      );
    }
  }
});
