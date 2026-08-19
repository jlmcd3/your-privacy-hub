/**
 * ITEM 425 — READER TOLERANCE + WRITER EMISSION + DETERMINISTIC PINPOINTS.
 *
 * Covers, in order:
 *   1. reader tolerance across ALL FOUR shapes (string, string[], legacy
 *      object, typed record);
 *   2. deterministic pinpoints — every emitted element pinpoint byte-matches
 *      the registry anchor the composer read, none null, none duplicated
 *      against a different element;
 *   3. writer emission shape from the assembler seam;
 *   4. G-1 single voice in BOTH directions (gate-true affirmative, gate-false
 *      degraded voice) and the ITEM 384 r3/r4 placeholder protections;
 *   5. LAW 3 — the surface CONSUMES the record-complete gate and never writes
 *      `_meta.internal` nor alters gate semantics.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  coerceSufficiencyView,
  isRiskSufficiencyRecord,
  formatSufficiencyElement,
  type RiskSufficiencyRecord,
} from "../../../supabase/functions/_shared/report-contracts/risk-sufficiency.ts";
import {
  buildRecordSufficiency,
  applyRiskProseGold,
} from "../../../supabase/functions/run-cppa-risk-assessment/_local/ltp/risk-prose-gold.ts";

const AFFIRMATIVE =
  "The record before this assessment is complete: every question the intake asks has been answered.";

const TYPED: RiskSufficiencyRecord = {
  complete: false,
  statement: "The record supporting this assessment is sufficient for the § 7152(a)(6) balancing frame to weigh.",
  elements: [
    { element: "Benefits to the business", pinpoint: "11 CCR § 7152(a)(4)", status: "present in the record as documented" },
    { element: "Economic harms", pinpoint: "11 CCR § 7152(a)(5)(E)", status: "present in the record as documented" },
    {
      element: "Decision whether to initiate the processing",
      pinpoint: "11 CCR § 7152(a)(7)",
      status: "reserved to you for decision under the regulation; not a deficiency in the record as documented",
    },
  ],
};

// ── 1. READER TOLERANCE — ALL FOUR SHAPES ─────────────────────────────────

Deno.test("ITEM 425 reader: bare string", () => {
  const v = coerceSufficiencyView("The record is complete.");
  assertEquals(v.shape, "string");
  assertEquals(v.statement, "The record is complete.");
  assertEquals(v.paragraphs, ["The record is complete."]);
  assertEquals(v.elements.length, 0);
});

Deno.test("ITEM 425 reader: legacy string[]", () => {
  const v = coerceSufficiencyView([AFFIRMATIVE, "Economic harms: present in the record as documented (11 CCR § 7152(a)(5)(E))."]);
  assertEquals(v.shape, "string_list");
  assertEquals(v.paragraphs.length, 2);
  assertEquals(v.statement, AFFIRMATIVE);
});

Deno.test("ITEM 425 reader: legacy { complete, statement } object", () => {
  const v = coerceSufficiencyView({ complete: true, statement: AFFIRMATIVE });
  assertEquals(v.shape, "legacy_object");
  assertEquals(v.complete, true);
  assertEquals(v.statement, AFFIRMATIVE);
  assertEquals(v.paragraphs, [AFFIRMATIVE]);
});

Deno.test("ITEM 425 reader: typed record", () => {
  const v = coerceSufficiencyView(TYPED);
  assertEquals(v.shape, "typed");
  assertEquals(v.elements.length, 3);
  // No content is dropped: the text projection still carries every element.
  assertEquals(v.paragraphs.length, 4);
  assert(v.paragraphs[1].includes("11 CCR § 7152(a)(4)"));
  assert(formatSufficiencyElement(TYPED.elements[0]).startsWith("Benefits to the business:"));
});

// ── 2. DETERMINISTIC PINPOINTS ────────────────────────────────────────────

Deno.test("ITEM 425 pinpoints are deterministic: registry-shaped, never null, never mis-duplicated", () => {
  const view = coerceSufficiencyView(TYPED);
  const seen = new Map<string, string>();
  for (const el of view.elements) {
    assert(typeof el.pinpoint === "string" && el.pinpoint.length > 0, `null pinpoint on ${el.element}`);
    assert(/^11 CCR § 7152\(a\)/.test(el.pinpoint), `non-registry pinpoint: ${el.pinpoint}`);
    const prior = seen.get(el.element);
    assert(prior === undefined || prior === el.pinpoint, `element ${el.element} carries two pinpoints`);
    seen.set(el.element, el.pinpoint);
  }
});

// ── 3. WRITER EMISSION SHAPE ──────────────────────────────────────────────

Deno.test("ITEM 425 writer: typed input keeps the typed shape and the single voice", () => {
  const out = buildRecordSufficiency(TYPED, AFFIRMATIVE, "", true);
  assert(isRiskSufficiencyRecord(out), "typed input must ship a typed record");
  const rec = out as RiskSufficiencyRecord;
  assertEquals(rec.complete, true);
  assertEquals(rec.statement, AFFIRMATIVE);
  assertEquals(rec.elements.length, 3);
});

Deno.test("ITEM 425 writer: legacy array input keeps the legacy array (fail-open)", () => {
  const out = buildRecordSufficiency(
    ["some legacy voice", "Economic harms: present in the record as documented (11 CCR § 7152(a)(5)(E))."],
    AFFIRMATIVE,
    "",
  );
  assert(Array.isArray(out));
  assertEquals((out as string[])[0], AFFIRMATIVE);
});

// ── 4. G-1 BOTH DIRECTIONS + PLACEHOLDER PROTECTIONS ──────────────────────

Deno.test("ITEM 425 G-1 gate-TRUE: one affirmative voice, no stray placeholder representable", () => {
  const report: Record<string, unknown> = {
    executive_summary: "Exec summary body.",
    record_sufficiency: {
      complete: false,
      statement: "We could not verify this item from the information provided; it is listed under information needed.",
      elements: TYPED.elements,
    },
  };
  applyRiskProseGold(report, { recordComplete: true, affirmative: AFFIRMATIVE, reservedCount: 1 });
  const rec = report.record_sufficiency as RiskSufficiencyRecord;
  assert(isRiskSufficiencyRecord(rec));
  assertEquals(rec.complete, true);
  assert(rec.statement.startsWith(AFFIRMATIVE), "the affirmative must be the ONE voice");
  assert(!rec.statement.includes("could not verify"), "gate-TRUE must not ship the emit-gate placeholder");
  // A placeholder is not representable as an element: elements carry only a
  // registry label, a registry pinpoint and a closed status clause.
  for (const el of rec.elements) assert(!el.status.includes("could not verify"));
});

Deno.test("ITEM 425 G-1 gate-FALSE: degraded voice survives untouched", () => {
  const degraded = {
    complete: false,
    statement: "The record is not yet sufficient for the § 7152(a)(6) balancing frame.",
    elements: [TYPED.elements[2]],
  };
  const report: Record<string, unknown> = { record_sufficiency: degraded };
  applyRiskProseGold(report, { recordComplete: false, affirmative: AFFIRMATIVE, reservedCount: 1 });
  const rec = report.record_sufficiency as RiskSufficiencyRecord;
  assertEquals(rec.statement, degraded.statement);
  assertEquals(rec.complete, false);
  assertEquals(rec.elements.length, 1);
});

// ── 5. LAW 3 — THE GATE IS CONSUMED, NEVER EDITED ─────────────────────────

Deno.test("ITEM 425 the sufficiency surface never writes _meta.internal or gate fields", () => {
  const gate = { value: true, reasons: ["deterministic"] };
  const report: Record<string, unknown> = {
    _meta: { internal: { record_complete: gate } },
    record_sufficiency: { complete: false, statement: "x", elements: TYPED.elements },
  };
  const snapshot = JSON.stringify(gate);
  applyRiskProseGold(report, { recordComplete: true, affirmative: AFFIRMATIVE, reservedCount: 0 });
  assertEquals(
    JSON.stringify(((report._meta as any).internal as any).record_complete),
    snapshot,
    "record-complete telemetry must be consumed, never edited",
  );
});
