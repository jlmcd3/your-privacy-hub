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
import { ADMT_CORPUS_MAP } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-corpus-map.ts";
import { DPIA_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/dpia-corpus-map.ts";
import {
  CYBER_CORPUS_MAP,
  CYBER_PROCEDURAL_FACTORS,
} from "../../../supabase/functions/_shared/corpus/maps/cyber-corpus-map.ts";

// All maps landed so far.
const MAPS: readonly CorpusMap[] = [RISK_CORPUS_MAP, ADMT_CORPUS_MAP, DPIA_CORPUS_MAP, CYBER_CORPUS_MAP];

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

Deno.test("dpia: wave C2 posture — 18 dark FC (6 phase-1 + 12 bulk), 2 S0 folds, 6 AP, 1 AOW", () => {
  const darkFc = DPIA_CORPUS_MAP.rows.filter((r) => r.role === "FC" && !r.render_eligible);
  const s0 = DPIA_CORPUS_MAP.rows.filter((r) => r.role === "FC" && r.render_eligible && r.render_surface === "S0");
  const ap = DPIA_CORPUS_MAP.rows.filter((r) => r.role === "AP");
  const aow = DPIA_CORPUS_MAP.rows.filter((r) => r.role === "AOW");
  assertEquals(darkFc.length, 18);
  assertEquals(s0.length, 2);
  assertEquals(ap.length, 6);
  assertEquals(aow.length, 1);
  // S4 stays fully dark for DPIA this wave (no s4_ratification stamp).
  assertEquals(DPIA_CORPUS_MAP.s4_ratification, undefined);
  for (const r of DPIA_CORPUS_MAP.rows) {
    if (r.role === "FC" && r.render_eligible) assertEquals(r.render_surface, "S0", r.id);
  }
  // Verified-only law: every AP/AOW source row is in the enforcement snapshot and marked verified.
  const snap = JSON.parse(
    Deno.readTextFileSync("tests/edge/corpus/__snapshots__/enforcement-snapshot-risk.json"),
  ) as { rows: Record<string, { verification_status?: string }> };
  for (const r of [...ap, ...aow]) {
    const row = snap.rows[r.source_row_id];
    assert(row, `${r.id}: source row missing from enforcement snapshot`);
    assertEquals(row.verification_status, "verified", `${r.id}: source row not verified`);
  }
});

Deno.test("cppa-admt: wave C1 posture — 35 dark FC (5 phase-1 + 30 bulk), 3 S4 rows across 2 factors, 1 AP", () => {
  const darkFc = ADMT_CORPUS_MAP.rows.filter((r) => r.role === "FC" && !r.render_eligible);
  const s4 = ADMT_CORPUS_MAP.rows.filter((r) => r.role === "FC" && r.render_eligible && r.render_surface === "S4");
  const ap = ADMT_CORPUS_MAP.rows.filter((r) => r.role === "AP");
  assertEquals(darkFc.length, 35);
  assertEquals(s4.length, 3);
  assertEquals(new Set(s4.map((r) => r.factor_id)).size, 2);
  assertEquals(ap.length, 1);
  assert(ADMT_CORPUS_MAP.s4_ratification, "ADMT_CORPUS_MAP must carry its s4_ratification stamp");
  // Verified-only law: the AP row's source is in the enforcement snapshot and marked verified.
  const snap = JSON.parse(
    Deno.readTextFileSync("tests/edge/corpus/__snapshots__/enforcement-snapshot-risk.json"),
  ) as { rows: Record<string, { verification_status?: string }> };
  for (const r of ap) {
    const row = snap.rows[r.source_row_id];
    assert(row, `${r.id}: source row missing from enforcement snapshot`);
    assertEquals(row.verification_status, "verified", `${r.id}: source row not verified`);
  }
});

Deno.test("cppa-risk: wave C1 posture — 41 dark FC (11 phase-1/2 + 30 FC-J bulk), 3 S0 callouts, 3 AP, 1 AOW", () => {
  const darkFc = RISK_CORPUS_MAP.rows.filter((r) => r.role === "FC" && !r.render_eligible);
  const s0 = RISK_CORPUS_MAP.rows.filter(
    (r) => r.role === "FC" && r.render_eligible && r.render_surface === "S0",
  );
  const ap = RISK_CORPUS_MAP.rows.filter((r) => r.role === "AP");
  const aow = RISK_CORPUS_MAP.rows.filter((r) => r.role === "AOW");
  assertEquals(darkFc.length, 41);
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

Deno.test("cppa-cyber: wave C3 posture — 72 dark FC, 1 S0 callout, 20 S4 rows across 15 components, 1 live + 3 dark AQ, S5 dark", () => {
  const darkFc = CYBER_CORPUS_MAP.rows.filter((r) => r.role === "FC" && !r.render_eligible);
  const s0 = CYBER_CORPUS_MAP.rows.filter((r) => r.role === "FC" && r.render_eligible && r.render_surface === "S0");
  const s4 = CYBER_CORPUS_MAP.rows.filter((r) => r.role === "FC" && r.render_eligible && r.render_surface === "S4");
  const aq = CYBER_CORPUS_MAP.rows.filter((r) => r.role === "AQ");
  const ap = CYBER_CORPUS_MAP.rows.filter((r) => r.role === "AP");
  const aow = CYBER_CORPUS_MAP.rows.filter((r) => r.role === "AOW");
  assertEquals(darkFc.length, 72);
  assertEquals(s0.length, 1);
  // The doc 62 §9 Tier-1 recut: EXACTLY 20 S4 rows (33 as filed → 20 as
  // ratified); a 21st S4 row is an unratified customer surface.
  assertEquals(s4.length, 20);
  assertEquals(new Set(s4.map((r) => r.factor_id)).size, 15);
  // C1.2 (2026-08-25): the applicability AQ row (cppa-cyber/P1/s2-01)
  // flipped live behind CYBER_DETERMINISTIC_ENABLED — doc 64's
  // applicability table now has a real renderer. The two deadline/cadence
  // AQ rows (P2) stay dark: their surface's shipped, CEO-ratified fixed
  // prose states "no cohort computed" (ITEM-204) and computing one would
  // contradict already-ratified bytes — see their curation_notes.
  // FC-L11 (2026-08-25): a 4th AQ row (cppa-cyber/P6/s2-01, § 7124
  // certification-of-completion) added — text is CEO-supplied and
  // pin-verified, the composer is BUILT (cyber-submission-attestation.ts),
  // but it stays dark pending a CEO decision on skeleton placement (a new
  // section, not a single-block insertion like C1.2's).
  assertEquals(aq.length, 4);
  const liveAq = aq.filter((r) => r.render_eligible);
  const darkAq = aq.filter((r) => !r.render_eligible);
  assertEquals(liveAq.length, 1);
  assertEquals(liveAq[0]?.id, "cppa-cyber/P1/s2-01");
  assertEquals(darkAq.length, 3);
  for (const r of darkAq) assertEquals(r.render_eligible, false, r.id);
  // S5-dark posture (doc 54 §3): no CPPA-native enforcement; GDPR analogies
  // fail jurisdiction-fit for a CCPA audit-readiness document.
  assertEquals(ap.length, 0);
  assertEquals(aow.length, 0);
  assert(CYBER_CORPUS_MAP.s4_ratification, "CYBER_CORPUS_MAP must carry its s4_ratification stamp (PN-CMP-B1)");
  assert(CYBER_CORPUS_MAP.s2_ratification, "CYBER_CORPUS_MAP must carry its s2_ratification stamp (doc-64-PN-C1)");
  assertEquals(CYBER_CORPUS_MAP.rows.length, 97);
});

Deno.test("CYBER_CORPUS_MAP: every factor_id is a canonical component name or a procedural factor", async () => {
  const src = await Deno.readTextFile("supabase/functions/run-cppa-cybersecurity/index.ts");
  const procedural = new Set<string>(CYBER_PROCEDURAL_FACTORS);
  for (const row of CYBER_CORPUS_MAP.rows) {
    if (procedural.has(row.factor_id)) continue;
    // Component factors must match ALL_COMPONENTS literals in index.ts —
    // the same canonical names the conversion's Determination appendix
    // adopts (doc 54 §0).
    assert(
      src.includes(`"${row.factor_id}"`),
      `${row.id}: factor_id "${row.factor_id}" is neither a procedural factor nor an ALL_COMPONENTS literal`,
    );
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
    purpose_class: "misreading",
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

// ── Wave C1 (doc 62 §11): the Reader-Value Law's two new invariants ──────

Deno.test("Reader-Value Law: a render_eligible row without purpose_class fails", () => {
  const map: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-purpose-class-missing",
    snapshot_file: "n/a",
    rows: [fcRow({ render_surface: "S0", s0_field: "test_field", purpose_class: undefined })],
  };
  const problems = mapInvariants(map);
  assert(problems.some((p) => p.includes("purpose_class")), JSON.stringify(problems));
});

Deno.test("Reader-Value Law: purpose_class set on a dark (render_eligible:false) row fails", () => {
  const map: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-purpose-class-on-dark",
    snapshot_file: "n/a",
    rows: [
      fcRow({
        render_eligible: false,
        render_surface: undefined,
        purpose_class: "action",
      }),
    ],
  };
  const problems = mapInvariants(map);
  assert(problems.some((p) => p.includes("render-only fields")), JSON.stringify(problems));
});

Deno.test("Reader-Value Law: a render_eligible row WITH purpose_class and no citation_source passes", () => {
  const map: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-purpose-class-ok",
    snapshot_file: "n/a",
    rows: [fcRow({ render_surface: "S0", s0_field: "test_field" })],
  };
  assertEquals(mapInvariants(map), []);
});

function apRow(overrides: Partial<CamRow>): CamRow {
  return {
    id: "test/factor/ap-01",
    factor_id: "Test factor",
    role: "AP",
    source_table: "enforcement_actions",
    source_row_id: "row-1",
    excerpt_field: "key_compliance_failure",
    pinned_excerpt: "",
    render_eligible: true,
    render_surface: "S5",
    purpose_class: "authority",
    render_when: ["test_state"],
    display: {
      matter: "Regulator (Country) — Subject (2025)",
      what_happened: "test",
      bearing: "test",
      authority_label: "Regulator (Country), Subject, decision of 1 January 2025 — persuasive authority",
      trail_cite: "Regulator, Subject (2025)",
    },
    direction: "supports",
    logic_bearing: false,
    provenance: { verified_on: "2026-08-22" },
    curation_note: "test fixture",
    ...overrides,
  };
}

Deno.test("Display-consistency invariant: citation_source matching the display text passes", () => {
  const map: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-display-consistency-ok",
    snapshot_file: "n/a",
    rows: [
      apRow({
        citation_source: {
          regulator: "Regulator (Country)",
          subject: "Subject",
          jurisdiction: "Country",
          decision_date: "2025-01-01",
        },
      }),
    ],
  };
  assertEquals(mapInvariants(map), []);
});

Deno.test("Display-consistency invariant: a regulator missing from the display text fails", () => {
  const map: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-display-consistency-bad-regulator",
    snapshot_file: "n/a",
    rows: [
      apRow({
        citation_source: {
          regulator: "A Completely Different Regulator",
          subject: "Subject",
          jurisdiction: "Country",
          decision_date: "2025-01-01",
        },
      }),
    ],
  };
  const problems = mapInvariants(map);
  assert(problems.some((p) => p.includes("regulator") && p.includes("display-consistency")), JSON.stringify(problems));
});

Deno.test("Display-consistency invariant: a decision year missing from the display text fails", () => {
  const map: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-display-consistency-bad-year",
    snapshot_file: "n/a",
    rows: [
      apRow({
        citation_source: {
          regulator: "Regulator (Country)",
          subject: "Subject",
          jurisdiction: "Country",
          decision_date: "2019-01-01",
        },
      }),
    ],
  };
  const problems = mapInvariants(map);
  assert(problems.some((p) => p.includes("decision year") && p.includes("display-consistency")), JSON.stringify(problems));
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
