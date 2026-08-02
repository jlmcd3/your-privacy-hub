/**
 * ITEM 352 — BLOCKING TESTS for the three Item 351 Phase-2 failures.
 *
 * ROOT CAUSES (named precisely):
 *   (1+2) TWO EVALUATORS FOR ONE QUESTION. `composeRecordSufficiency`
 *         derived its gap count and its enumerated-missing items from
 *         "factor_table rows with present_in_intake=false", while
 *         `information_needed` rendered the outstanding Type-J reserved
 *         judgments + the § 7156(a) comparable-set ask. The factor-table
 *         count sweeps in registry rows that are structurally silent on the
 *         record (unselected § 7152(a)(5) harm codes, § 7152(a)(6)(ii)/(iii)
 *         rows with no contract-real operand), so the perfect record read
 *         "8 of these elements remain enumerated for your review" against a
 *         ONE-item information_needed array, and — before Item 350's
 *         presence fix reached factor_table — both records rendered the same
 *         all-elements-missing prose (md5 cf02e292…).
 *         FIX: one evaluator, `computeRecordNeeds`, consumed by both.
 *   (3)   ITEM 343 REGRESSION. Item 343's array-preservation fix appended
 *         gate-internal rows (`info_emit_gate_<path>`, `source:"emit_gate"`)
 *         into the CUSTOMER information_needed array. FIX: degraded-path
 *         bookkeeping is internal telemetry; a whitelist filter strips any
 *         internal identity from the customer array.
 *
 * Fixtures are the two real Item 349/351 smoke intakes.
 */
import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";
import type { RenderPlan } from "../../../../supabase/functions/_shared/render-plan/schema.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";
import { assembleReport } from "../../../../supabase/functions/_shared/ltp/pass2-assembler.ts";
import { resolveLtpIntake } from "../../../../supabase/functions/_shared/ltp/entry-intake.ts";
import { computeRecordNeeds } from "../../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts";
import { runEmitGate } from "../../../../supabase/functions/_shared/emit-gate.ts";

const DIR = new URL("../../fixtures/item350/", import.meta.url);
const FIXTURES = ["perfect-a073d9c5", "messy-bd458f0d"] as const;

async function fixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await Deno.readTextFile(new URL(`${name}.json`, DIR)));
}

function plan(intake: Record<string, unknown>): RenderPlan {
  return derivePlan({ intake, report_data: {}, buildStamp: "item352-test" });
}

async function planFor(name: string): Promise<RenderPlan> {
  return plan(resolveLtpIntake(await fixture(name)).intake);
}

function assembled(p: RenderPlan): Record<string, unknown> {
  return assembleReport(p, {}, { exitMode: "observe" }).report as Record<string, unknown>;
}

const asText = (v: unknown): string => typeof v === "string" ? v : JSON.stringify(v ?? "");

async function md5(s: string): Promise<string> {
  return encodeHex(new Uint8Array(await crypto.subtle.digest("MD5", new TextEncoder().encode(s))));
}

/**
 * Items the sufficiency prose enumerates as OUTSTANDING (closed status
 * clauses). ITEM 358: an outstanding element is enumerated either as missing
 * record data or as a decision reserved to the customer; both are "enumerated
 * for your review" and both must match `information_needed` one-for-one.
 */
const MISSING_CLAUSE = "not present in the record as documented";
const RESERVED_CLAUSE =
  "reserved to you for decision under the regulation; not a deficiency in the record as documented";
function enumeratedMissing(report: Record<string, unknown>): string[] {
  const raw = report.record_sufficiency;
  const lines = Array.isArray(raw) ? raw.map(asText) : [asText(raw)];
  const out: string[] = [];
  for (const line of lines) {
    for (const clause of [RESERVED_CLAUSE, MISSING_CLAUSE]) {
      const idx = line.indexOf(`: ${clause}`);
      if (idx > 0) { out.push(line.slice(0, idx).trim()); break; }
    }
  }
  return out;
}

function informationNeededLabels(report: Record<string, unknown>): string[] {
  const arr = report.information_needed;
  if (!Array.isArray(arr)) return [];
  return arr.map((row) => {
    const s = asText(row);
    // Rendered form: "The record does not yet include <label>, which <cite> requires. …"
    const m = s.match(/does not yet include (.+?), which /i);
    return (m ? m[1] : s).trim();
  });
}

// ── (a) record_sufficiency md5s DIFFER between the two smoke intakes ────
Deno.test("ITEM352 (a): record_sufficiency md5s differ between the perfect and messy smoke intakes", async () => {
  const perfect = asText(assembled(await planFor("perfect-a073d9c5")).record_sufficiency);
  const messy = asText(assembled(await planFor("messy-bd458f0d")).record_sufficiency);
  const [a, b] = [await md5(perfect), await md5(messy)];
  assertNotEquals(a, b, `record_sufficiency must differentiate; both md5 ${a}`);
});

// ── (b) CONSISTENCY GUARD — same set, same count, on ANY record ─────────
for (const name of FIXTURES) {
  Deno.test(`ITEM352 (b) consistency guard: sufficiency enumerated-missing === information_needed (${name})`, async () => {
    const p = await planFor(name);
    const report = assembled(p);
    const missing = enumeratedMissing(report).map((s) => s.toLowerCase()).sort();
    const needed = informationNeededLabels(report).map((s) => s.toLowerCase()).sort();
    assertEquals(
      missing.length,
      needed.length,
      `count disagreement: sufficiency ${missing.length} vs information_needed ${needed.length}\n${JSON.stringify({ missing, needed }, null, 2)}`,
    );
    assertEquals(missing, needed, "the two surfaces must enumerate the SAME items");
    // …and both must be the single canonical needs set.
    assertEquals(missing.length, computeRecordNeeds(p).length);
  });

  Deno.test(`ITEM352 (b2) the stated gap COUNT equals the enumerated items (${name})`, async () => {
    const report = assembled(await planFor(name));
    const text = asText(report.record_sufficiency);
    const m = text.match(/;\s*(\d+)\s+of these elements remain enumerated for your review/i);
    assert(m, "sufficiency opener must state a gap count");
    assertEquals(Number(m![1]), enumeratedMissing(report).length);
    assertEquals(Number(m![1]), informationNeededLabels(report).length);
  });
}

// ── (c) the perfect record enumerates exactly what it carries ───────────
Deno.test("ITEM352 (c): perfect record's sufficiency prose enumerates exactly its information_needed", async () => {
  const p = await planFor("perfect-a073d9c5");
  const report = assembled(p);
  const missing = enumeratedMissing(report);
  const needed = informationNeededLabels(report);
  assertEquals(missing.length, needed.length);
  // It carries a6_safeguards, so safeguard sufficiency is NOT enumerated missing.
  const intake = resolveLtpIntake(await fixture("perfect-a073d9c5")).intake;
  assert(Array.isArray(intake.a6_safeguards) && (intake.a6_safeguards as unknown[]).length > 0);
  for (const item of missing) {
    assertEquals(/sufficiency of the safeguards/i.test(item), false, `enumerated an operand it contains: ${item}`);
  }
});

Deno.test("ITEM352 (c2): messy record still enumerates the safeguard element it lacks", async () => {
  const report = assembled(await planFor("messy-bd458f0d"));
  const joined = enumeratedMissing(report).join(" | ").toLowerCase();
  assert(/sufficiency of the safeguards/.test(joined), `expected safeguard ask; got ${joined}`);
});

// ── (d) NO internal identifiers on any customer surface ─────────────────
const CUSTOMER_SURFACES = [
  "record_sufficiency",
  "information_needed",
  "processing_narrative",
  "executive_summary",
  "assessment_summary",
  "scope_and_triggers",
  "submission_summary",
  "opening_summary",
];

for (const name of FIXTURES) {
  Deno.test(`ITEM352 (d): no info_emit_gate_* identifier on any customer surface (${name})`, async () => {
    const report = assembled(await planFor(name));
    for (const key of CUSTOMER_SURFACES) {
      const s = asText(report[key]);
      assertEquals(/info_emit_gate_/.test(s), false, `internal id leaked into ${key}`);
    }
    // whole-report sweep excluding internal telemetry
    const clone = JSON.parse(JSON.stringify(report)) as Record<string, unknown>;
    delete clone._meta;
    assertEquals(/info_emit_gate_/.test(JSON.stringify(clone)), false, "internal id leaked somewhere on the customer report");
  });
}

Deno.test("ITEM352 (d2): emit gate never appends internal rows to the customer information_needed array", () => {
  const leaky =
    "Reconcile the record on i1b_min_pi against the intake, since the current position cannot be supported without further evidence collected.";
  const clean =
    "The record identifies the certifying executive as the reported contact; the intake supports this position and no additional confirmation is required at this stage.";
  const report: Record<string, any> = {
    disclaimer: leaky,
    submission_summary: leaky,
    executive_summary: clean,
    assessment_summary: clean,
    record_sufficiency: clean,
    processing_narrative: clean,
    scope_and_triggers: clean,
    information_needed: [
      { id: "info_7152_a_6", topic: "negative_impacts", prompt: "Confirm the negative impacts." },
    ],
  };
  runEmitGate(report, { tool: "cppa_risk_assessment", intakeRoster: {} });

  assert(Array.isArray(report.information_needed), "customer array must be preserved");
  assertEquals(report.information_needed.length, 1, "no internal rows appended");
  assertEquals(report.information_needed[0].id, "info_7152_a_6");
  const customer = { ...report };
  delete customer._meta;
  assertEquals(/info_emit_gate_/.test(JSON.stringify(customer)), false);
  assertEquals(
    report.information_needed.some((r: any) => r.source === "emit_gate"),
    false,
    "emit_gate-sourced rows must never sit on the customer surface",
  );
  // …and the bookkeeping still exists, internally.
  const paths: string[] = report._meta.internal.emit_gate.degraded_paths ?? [];
  assert(paths.length >= 1, "degraded paths must be recorded internally");
});

Deno.test("ITEM352 (d3): pre-existing internal rows are stripped by the whitelist filter", () => {
  const clean =
    "The record identifies the certifying executive as the reported contact; the intake supports this position and no additional confirmation is required at this stage.";
  const report: Record<string, any> = {
    executive_summary: clean,
    assessment_summary: clean,
    information_needed: [
      { id: "info_7152_a_7", topic: "safeguards", prompt: "Confirm the safeguards." },
      { id: "info_emit_gate_disclaimer", topic: "disclaimer", source: "emit_gate", prompt: "x" },
      { id: "info_emit_gate_submission_summary", topic: "submission_summary", source: "emit_gate", prompt: "x" },
    ],
  };
  runEmitGate(report, { tool: "cppa_risk_assessment" });
  assertEquals(report.information_needed.map((r: any) => r.id), ["info_7152_a_7"]);
  assertEquals(report._meta.internal.emit_gate.customer_rows_filtered, 2);
});
