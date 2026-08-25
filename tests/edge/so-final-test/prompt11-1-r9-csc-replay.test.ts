// PROMPT 11.1 (CEO program, 2026-08-17) — R9 TRIGGER DISCIPLINE + CSC C3
// DETECT-ONLY + REPLAY COMPARISON CANONICALIZATION.
//
// Sentinels:
//  (i)   builder/register integrity across the full chain INCLUDING
//        attachDpiaCsc with production options — no pass changes the length.
//  (ii)  r9 branch fixtures; operations builder and r9 trigger always agree.
//  (iii) replay over a jsonb-round-tripped (sorted-key) stored side is
//        byte-identical.
//  (iv)  per-pin register counts match the stored batch documents.
//  (v)   c3 detect findings appear in _meta on a fixture previously pruned.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachDpiaDeliverables,
  buildDpiaDeliverables,
  buildOperations,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { attachDpiaAttestation } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/attestation.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { attachDpiaCsc } from "../../../supabase/functions/_shared/ltp/dpia-csc.ts";
import { readDetectFindings } from "../../../supabase/functions/_shared/prose/detect-mode.ts";
import { replayDpiaDoc } from "../../../supabase/functions/replay-dpia-harness/_local/ltp/replay/dpia-replay.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/dpia-perfect-pinned.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const intakeOf = (f: Any) => f.intake ?? f.intake_data ?? f;
const FIXTURES: Any[] = [...(DPIA_PERFECT as Any[]), ...(DPIA_PERFECT_PINNED as Any[])].map(intakeOf);

const orgOf = (i: Any) => String(i?.organization_name ?? "");

/** The deterministic chain, exactly as the new-document path runs it. */
function fullChain(intake: Any) {
  const report: Any = {};
  const dmeta = attachDpiaDeliverables(report, intake, { unitsMinimal: true });
  attachDpiaAttestation(report, intake);
  const csc = attachDpiaCsc(report, { intake, frameSet: null, detectOnly: true });
  report.skeleton_document = assembleDpiaSkeletonDocument(report, intake).document;
  return { report, dmeta, csc };
}

/** jsonb round-trip: reorder keys, then reparse — what Postgres may do. */
function jsonbRoundTrip<T>(v: T): T {
  const sortDeep = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(sortDeep);
    if (x && typeof x === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(x as Record<string, unknown>).sort()) {
        out[k] = sortDeep((x as Record<string, unknown>)[k]);
      }
      return out;
    }
    return x;
  };
  return JSON.parse(JSON.stringify(sortDeep(v))) as T;
}

// ── sentinel (ii) — r9 branch fixtures ────────────────────────────────
const R9_CASES: Array<{ secondary_uses: string; r9: boolean }> = [
  { secondary_uses: "None.", r9: false },
  {
    secondary_uses:
      "None. Certificate data is not used for any purpose beyond return-to-work scheduling.",
    r9: false,
  },
  { secondary_uses: "No secondary uses", r9: false },
  { secondary_uses: "N/A", r9: false },
  {
    secondary_uses:
      "Aggregated absence data is also used to plan departmental staffing levels for the following quarter.",
    r9: true,
  },
];

Deno.test("11.1 (ii) — r9 trigger follows the operations reader's negation rule", () => {
  for (const c of R9_CASES) {
    const intake = {
      purpose: "To schedule occupational-health return-to-work reviews.",
      processing_activity_name: "Return-to-work review scheduling",
      secondary_uses: c.secondary_uses,
    };
    const built = buildDpiaDeliverables(intake) as Any;
    const hasR9 = (built.risk_register as Any[]).some((r) => r.risk_id === "r9_secondary_use");
    const hasOpSecondary = buildOperations(intake).some((o) => o.operation_id === "op_secondary");
    assertEquals(hasR9, c.r9, `r9 for: ${c.secondary_uses}`);
    // op_secondary exists ⟺ r9 eligible — one rule, no fork.
    assertEquals(hasOpSecondary, hasR9, `agreement for: ${c.secondary_uses}`);
  }
});

// ── sentinel (i) + (iv) — register integrity and per-pin counts ───────
const EXPECTED_REGISTER: Record<string, number> = {
  "Helvetia Occupational Health AG": 3,
  "Britannia HR Ltd": 4,
  "Harrowgate Mutual Insurance Ltd": 5,
  "Clinique Solférino SAS": 3,
  // PROMPT 12I (2026-08-17) — the two novel pins join the map, counts observed
  // from their own full-chain output. Existing counts are byte-unchanged.
  "Nordfracht Logistik GmbH": 2,
  "Caledonia Home Cover Ltd": 3,
};


Deno.test("11.1 (i) — no pass changes the register length through the full chain", () => {
  for (const intake of FIXTURES) {
    const { report, dmeta } = fullChain(intake);
    const len = (report.risk_register as Any[]).length;
    assertEquals(Number((dmeta as Any).risks), len, `${orgOf(intake)} builder risks vs register`);
  }
});

Deno.test("11.1 (iv) — per-pin register counts match the stored batch documents", () => {
  for (const intake of FIXTURES) {
    const org = orgOf(intake);
    const expected = EXPECTED_REGISTER[org];
    assert(expected !== undefined, `unexpected fixture org: ${org}`);
    const { report } = fullChain(intake);
    assertEquals((report.risk_register as Any[]).length, expected, `${org} register count`);
  }
});

// ── sentinel (v) — c3 detect findings, never a removal ────────────────
Deno.test("11.1 (v) — c3 records a detect finding and never prunes the register", () => {
  const intake = {
    organization_name: "Detect Fixture Ltd",
    processing_activity_name: "A",
    purpose: "P",
    secondary_uses: "None. Nothing beyond the primary purpose.",
  };
  const report: Any = {
    risk_register: [
      {
        risk_id: "r9_secondary_use",
        source: "secondary_uses",
        rationale: "The record describes secondary uses of the same data.",
      },
      { risk_id: "r1_other", source: "purpose", rationale: "Something else." },
    ],
  };
  const t = attachDpiaCsc(report, { intake, frameSet: null, detectOnly: true });
  assertEquals((report.risk_register as Any[]).length, 2, "register untouched");
  assertEquals(t.detect_only, true);
  assertEquals(t.repairs, 0);
  assert((t.repairs_suppressed ?? 0) >= 1, "a suppressed repair is reported");
  const findings = readDetectFindings(report);
  assert(
    findings.some((f) => f.check_id === "c3_secondary_use_predicate"),
    "c3 detect finding present",
  );
});

Deno.test("11.1 (v) — legacy write mode is byte-unchanged (c3 still removes)", () => {
  const intake = { secondary_uses: "None." };
  const report: Any = {
    risk_register: [
      { risk_id: "r9_secondary_use", source: "secondary_uses", rationale: "secondary use" },
      { risk_id: "r1", source: "purpose", rationale: "other" },
    ],
  };
  const t = attachDpiaCsc(report, { intake, frameSet: null });
  assertEquals((report.risk_register as Any[]).length, 1);
  assertEquals(t.repairs, 1);
  assertEquals(t.detect_only, undefined);
});

// ── sentinel (iii) — replay over a jsonb round-tripped stored side ────
Deno.test("11.1 (iii) — replay is byte-identical across a jsonb round-trip", () => {
  for (const intake of FIXTURES) {
    const { report } = fullChain(intake);
    const row = jsonbRoundTrip({
      id: `stored-${orgOf(intake)}`,
      intake_data: intake,
      report_data: report,
    });
    const out = replayDpiaDoc(row as Any);
    assertEquals(out.perDoc.hard_failures, [], `${orgOf(intake)} hard failures`);
    assert(out.sideBySide, `${orgOf(intake)} side_by_side present`);
    assertEquals(out.sideBySide!.summary.blocks_changed, 0, `${orgOf(intake)} blocks changed`);
    assert(out.sideBySide!.summary.byte_identical, `${orgOf(intake)} byte identical`);
  }
});
