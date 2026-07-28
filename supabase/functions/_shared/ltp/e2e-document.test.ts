/**
 * ITEM 235b (T-M9.5b) — LAW 2: DETERMINISTIC END-TO-END DOCUMENT TEST.
 *
 * REQUIRED CI GATE. CEO ruling verbatim:
 *   "'Tests are green' must always imply 'the document is full.'
 *    No exceptions."
 *
 * From a fixture intake, deterministic derive → Guide → assembler, then
 * assert:
 *   (i)   every EMITTED section carries real content (non-empty, no
 *         interpolation residue),
 *   (ii)  every OMITTED section maps to an explicit classification,
 *   (iii) surface ownership respected (every top-level key ∈ registry
 *         AND ∈ report schema),
 *   (iv)  zero blank-slot patterns anywhere on the shipped surface.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleReport } from "./pass2-assembler.ts";
import { derivePlan } from "./derive.ts";
import { CPPA_RISK_SECTION_SHARDS } from "./section-shards/cppa-risk.ts";
import { CPPA_RISK_REPORT_SCHEMA } from "../report-schemas/cppa-risk.ts";
import { INTERPOLATION_RESIDUE_PATTERNS } from "./pass2-render.ts";

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
    // Emitted sections carrying strings must have at least one non-empty string.
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
