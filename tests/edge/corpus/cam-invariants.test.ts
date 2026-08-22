// Schema invariants over every CorpusMap: id uniqueness, logic_disposition
// presence iff logic_bearing, pin-length and non-empty-field sanity, and
// the RENDER-SURFACE LAW (phase 2, 2026-08-22): report-side FC rows stay
// dark pending PN-CORPUS-1 (FC may render only on S0); AP/AOW render only
// on S5 with full ratified annotations + state predicates. The per-map
// posture tests below pin exactly which planes each product has opened.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapInvariants } from "../../../supabase/functions/_shared/corpus/cam-verify.ts";
import type { CamRow, CorpusMap } from "../../../supabase/functions/_shared/corpus/cam-types.ts";
import { RISK_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/risk-corpus-map.ts";
import { ADMT_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/admt-corpus-map.ts";
import { DPIA_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/dpia-corpus-map.ts";

// All phase-1 maps landed so far.
const MAPS: readonly CorpusMap[] = [RISK_CORPUS_MAP, ADMT_CORPUS_MAP, DPIA_CORPUS_MAP];

Deno.test("mapInvariants: empty map is trivially valid", () => {
  const empty: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-empty",
    snapshot_file: "n/a",
    rows: [],
  };
  assertEquals(mapInvariants(empty), []);
});

for (const map of MAPS) {
  Deno.test(`${map.product}: passes all map invariants`, () => {
    assertEquals(mapInvariants(map), []);
  });
}

// ── Per-product render postures (which planes each product has opened) ──

Deno.test("cppa-admt and dpia: still fully render-dark (FC only) — phase 2 opened no plane for them", () => {
  for (const map of [ADMT_CORPUS_MAP, DPIA_CORPUS_MAP]) {
    for (const row of map.rows) {
      assertEquals(row.role, "FC", `${row.id}: unexpected role`);
      assertEquals(row.render_eligible, false, `${row.id}: unexpectedly render-eligible`);
    }
  }
});

Deno.test("cppa-risk: phase-2 posture — 11 dark FC, 3 S0 callouts, 3 AP, 1 AOW", () => {
  const darkFc = RISK_CORPUS_MAP.rows.filter((r) => r.role === "FC" && !r.render_eligible);
  const s0 = RISK_CORPUS_MAP.rows.filter(
    (r) => r.role === "FC" && r.render_eligible && r.render_surface === "S0",
  );
  const ap = RISK_CORPUS_MAP.rows.filter((r) => r.role === "AP");
  const aow = RISK_CORPUS_MAP.rows.filter((r) => r.role === "AOW");
  assertEquals(darkFc.length, 11);
  assertEquals(s0.length, 3);
  assertEquals(ap.length, 3);
  assertEquals(aow.length, 1);
  // Report-side FC stays dark: no FC row renders anywhere but S0.
  for (const r of RISK_CORPUS_MAP.rows) {
    if (r.role === "FC" && r.render_eligible) assertEquals(r.render_surface, "S0", r.id);
  }
  // Verified-only law: every AP/AOW source row is in the enforcement
  // provenance snapshot and marked verified there.
  const snap = JSON.parse(
    Deno.readTextFileSync("tests/edge/corpus/__snapshots__/enforcement-snapshot-risk.json"),
  ) as { rows: Record<string, { verification_status?: string }> };
  for (const r of [...ap, ...aow]) {
    const row = snap.rows[r.source_row_id];
    assert(row, `${r.id}: source row missing from enforcement snapshot`);
    assertEquals(row.verification_status, "verified", `${r.id}: source row not verified`);
  }
});

// ── Phase A (doc 53): the PN-CORPUS-1 lawful S4 carve-out ────────────────
// FC may render on S4 ONLY inside a map carrying `s4_ratification`. No
// existing map uses S4 today (confirmed above: Risk's only open FC plane
// is S0), so this is exercised on synthetic fixtures.

function fcRow(overrides: Partial<CamRow>): CamRow {
  return {
    id: "test/factor/s4-01",
    factor_id: "Test factor",
    role: "FC",
    source_table: "cppa_authorities",
    source_row_id: "row-1",
    excerpt_field: "text",
    pinned_excerpt: "exact pinned text",
    render_eligible: true,
    render_surface: "S4",
    direction: "supports",
    logic_bearing: false,
    provenance: { verified_on: "2026-08-22" },
    curation_note: "test fixture",
    ...overrides,
  };
}

Deno.test("PN-CORPUS-1 carve-out: FC on S4 without s4_ratification fails", () => {
  const map: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-s4-unratified",
    snapshot_file: "n/a",
    rows: [fcRow({})],
  };
  const problems = mapInvariants(map);
  assert(
    problems.some((p) => p.includes("s4_ratification")),
    JSON.stringify(problems),
  );
});

Deno.test("PN-CORPUS-1 carve-out: FC on S4 with s4_ratification passes", () => {
  const map: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-s4-ratified",
    snapshot_file: "n/a",
    rows: [fcRow({})],
    s4_ratification: {
      ratified_by: "CEO",
      ratified_on: "2026-08-22",
      ledger_ref: "PN-CORPUS-1",
    },
  };
  assertEquals(mapInvariants(map), []);
});

Deno.test("PN-CORPUS-1 carve-out: s4_ratification on the map does not excuse an S0 FC row from naming s0_field", () => {
  const map: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-s4-ratified-s0-row",
    snapshot_file: "n/a",
    rows: [fcRow({ id: "test/factor/s0-01", render_surface: "S0" })],
    s4_ratification: {
      ratified_by: "CEO",
      ratified_on: "2026-08-22",
      ledger_ref: "PN-CORPUS-1",
    },
  };
  const problems = mapInvariants(map);
  assert(problems.some((p) => p.includes("s0_field")), JSON.stringify(problems));
});

Deno.test("RISK_CORPUS_MAP: every factor_id matches a real FACTOR_MATRIX_ROWS label", async () => {
  const src = await Deno.readTextFile(
    "supabase/functions/_shared/ltp/risk-skeleton-assemble.ts",
  );
  const knownLabels = new Set<string>();
  for (const m of src.matchAll(/label:\s*"([^"]+)"/g)) knownLabels.add(m[1]);
  for (const row of RISK_CORPUS_MAP.rows) {
    if (!knownLabels.has(row.factor_id)) {
      throw new Error(`${row.id}: factor_id "${row.factor_id}" is not a FACTOR_MATRIX_ROWS label`);
    }
  }
});

Deno.test("ADMT_CORPUS_MAP: every factor_id matches a real Appendix B factor label", async () => {
  const src = await Deno.readTextFile(
    "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts",
  );
  const knownLabels = new Set<string>();
  // buildFactorMatrixTable's row array literals: ["Label", ...]
  for (const m of src.matchAll(/\[\s*"([^"]+)",/g)) knownLabels.add(m[1]);
  for (const row of ADMT_CORPUS_MAP.rows) {
    assert(
      knownLabels.has(row.factor_id),
      `${row.id}: factor_id "${row.factor_id}" is not an Appendix B factor label`,
    );
  }
});

Deno.test("DPIA_CORPUS_MAP: every factor_id matches a real DPIA_MATRIX_ROWS label", async () => {
  const src = await Deno.readTextFile(
    "supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts",
  );
  const knownLabels = new Set<string>();
  for (const m of src.matchAll(/label:\s*"([^"]+)"/g)) knownLabels.add(m[1]);
  for (const row of DPIA_CORPUS_MAP.rows) {
    assert(
      knownLabels.has(row.factor_id),
      `${row.id}: factor_id "${row.factor_id}" is not a DPIA_MATRIX_ROWS label`,
    );
  }
});
