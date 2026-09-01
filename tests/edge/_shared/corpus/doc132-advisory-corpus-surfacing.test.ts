// DOC 132 (Track A advisory-corpus-surfacing, CEO-ratified 2026-09-01) —
// regression guards for the module's own matching/dedup/cap logic and for
// each product's wiring, including the DPIA already-cited fix: DPIA's
// release-1 EnforcementPrecedents list (dpia-enforcement-precedents-
// pinned.ts) always renders its 6 rows on a surface separate from the CAM
// attachment mechanism, so buildDpiaAdvisoryCorpusMatches must exclude
// them by source_row_id or the advisory appendix would repeat a
// precedent the reader already saw (self-caught during this batch's
// double-check, not part of the original design).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { CamRow, CorpusMap } from "../../../../supabase/functions/_shared/corpus/cam-types.ts";
import {
  advisoryMatchesTable,
  matchAdvisoryRows,
} from "../../../../supabase/functions/_shared/corpus/advisory-surfacing.ts";
import { buildDpiaAdvisoryCorpusMatches } from "../../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { CYBER_CORPUS_MAP } from "../../../../supabase/functions/run-cppa-cybersecurity/_local/corpus/maps/cyber-corpus-map.ts";
import { ADMT_CORPUS_MAP } from "../../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-corpus-map.ts";
import { RISK_CORPUS_MAP } from "../../../../supabase/functions/_shared/corpus/maps/risk-corpus-map.ts";

// ── Module-level matching/dedup/cap logic (synthetic map, full control) ────

function apRow(over: Partial<CamRow> & { id: string }): CamRow {
  return {
    factor_id: "test-factor",
    role: "AP",
    source_table: "enforcement_actions",
    source_row_id: over.id,
    excerpt_field: "key_compliance_failure",
    pinned_excerpt: "",
    render_eligible: true,
    render_surface: "S5",
    purpose_class: "authority",
    render_when: ["always"],
    display: {
      matter: `Matter for ${over.id}`,
      what_happened: `What happened for ${over.id}`,
      bearing: `Bearing for ${over.id}`,
      authority_label: `Authority for ${over.id}`,
      trail_cite: over.id,
    },
    direction: "supports",
    logic_bearing: false,
    provenance: { verified_on: "2026-08-23" },
    curation_note: "test fixture",
    ...over,
  } as CamRow;
}

function map(rows: readonly CamRow[]): CorpusMap {
  return { product: "dpia", map_version: "test", snapshot_file: "test", rows };
}

Deno.test("doc132 — no match when free text is empty or has no term hit", () => {
  const m = map([apRow({ id: "r1", advisory_terms: ["drone survey"] })]);
  assertEquals(matchAdvisoryRows(m, []), []);
  assertEquals(matchAdvisoryRows(m, [null, undefined, "  "]), []);
  assertEquals(matchAdvisoryRows(m, ["totally unrelated text"]), []);
});

Deno.test("doc132 — word-boundary, case-insensitive match; no match inside a larger word", () => {
  const m = map([apRow({ id: "r1", advisory_terms: ["biometric screening"] })]);
  const hit = matchAdvisoryRows(m, ["We use BIOMETRIC SCREENING at the gate."]);
  assertEquals(hit.length, 1);
  assertEquals(hit[0].id, "r1");

  const noHit = matchAdvisoryRows(m, ["This is nonbiometric screeninglike behavior."]);
  assertEquals(noHit.length, 0, "a substring inside a larger word must not match");
});

Deno.test("doc132 — rows without advisory_terms or not render_eligible never match", () => {
  const m = map([
    apRow({ id: "r1", advisory_terms: undefined }),
    apRow({ id: "r2", advisory_terms: [] }),
    apRow({ id: "r3", advisory_terms: ["gate check"], render_eligible: false }),
  ]);
  assertEquals(matchAdvisoryRows(m, ["gate check performed"]), []);
});

Deno.test("doc132 — sorted by match-strength descending", () => {
  const m = map([
    apRow({ id: "weak", advisory_terms: ["alpha"] }),
    apRow({ id: "strong", advisory_terms: ["alpha", "beta", "gamma"] }),
  ]);
  const res = matchAdvisoryRows(m, ["alpha beta gamma"]);
  assertEquals(res.map((r) => r.id), ["strong", "weak"]);
});

Deno.test("doc132 — dedupe by source_url keeps the first row encountered in map order", () => {
  const m = map([
    apRow({ id: "first", advisory_terms: ["alpha"], provenance: { verified_on: "2026-08-23", source_url: "https://x/case" } }),
    apRow({ id: "second", advisory_terms: ["alpha", "beta"], provenance: { verified_on: "2026-08-23", source_url: "https://x/case" } }),
  ]);
  const res = matchAdvisoryRows(m, ["alpha beta"]);
  assertEquals(res.length, 1);
  assertEquals(res[0].id, "first");
});

Deno.test("doc132 — cap at 8 matches", () => {
  const rows = Array.from({ length: 10 }, (_, i) => apRow({ id: `r${i}`, advisory_terms: ["shared-term"] }));
  const res = matchAdvisoryRows(map(rows), ["shared-term appears here"]);
  assertEquals(res.length, 8);
});

Deno.test("doc132 — alreadyCited excludes by source_url", () => {
  const m = map([apRow({ id: "r1", advisory_terms: ["alpha"], provenance: { verified_on: "2026-08-23", source_url: "https://x/case" } })]);
  const res = matchAdvisoryRows(m, ["alpha"], new Set(["https://x/case"]));
  assertEquals(res, []);
});

Deno.test("doc132 — alreadyCited excludes by source_row_id", () => {
  const m = map([apRow({ id: "r1", advisory_terms: ["alpha"] })]);
  const res = matchAdvisoryRows(m, ["alpha"], new Set(["r1"]));
  assertEquals(res, []);
});

Deno.test("doc132 — advisoryMatchesTable: null when empty, Topic/Summary/Source shape otherwise", () => {
  assertEquals(advisoryMatchesTable([]), null);
  const m = map([apRow({ id: "r1", advisory_terms: ["alpha"], provenance: { verified_on: "2026-08-23", source_url: "https://x/case" } })]);
  const matches = matchAdvisoryRows(m, ["alpha"]);
  const t = advisoryMatchesTable(matches);
  assert(t);
  assertEquals(t.columns, ["Topic", "Summary", "Source"]);
  assertEquals(t.rows.length, 1);
  assert(t.rows[0][2].includes("https://x/case"));
});

// ── Per-product wiring ──────────────────────────────────────────────────────

Deno.test("doc132 — DPIA: a matching free-text term still yields no appendix (already-cited fix)", () => {
  // These terms belong to the AENA row, which is one of DPIA's 6 always-
  // rendered EnforcementPrecedents — the exact duplication bug this test
  // guards against.
  const table = buildDpiaAdvisoryCorpusMatches({
    description: "Our biometric passenger processing occurs at the airport gate, similar to biometric screening.",
  });
  assertEquals(table, null, "advisory appendix must not repeat an already-shown DPIA precedent");
});

Deno.test("doc132 — DPIA: no match at all yields no appendix", () => {
  const table = buildDpiaAdvisoryCorpusMatches({ description: "We run a routine internal payroll system." });
  assertEquals(table, null);
});

Deno.test("doc132 — Cyber: scaffold is wired but always empty (corpus holds no advisory_terms rows)", () => {
  const res = matchAdvisoryRows(CYBER_CORPUS_MAP, [], new Set());
  assertEquals(res, []);
  assertEquals(advisoryMatchesTable(res), null);
});

Deno.test("doc132 — Risk: a curated term not already attached elsewhere surfaces the row", () => {
  const res = matchAdvisoryRows(
    RISK_CORPUS_MAP,
    ["We run a warehouse monitoring program with scanner tracking of worker productivity."],
    new Set(),
  );
  assert(res.some((m) => m.id === "cppa-risk/regulatory-trigger-and-applicability/ap-03"));
});

Deno.test("doc132 — Risk: alreadyCited (source_url) suppresses a row the deterministic path already attached", () => {
  const res = matchAdvisoryRows(
    RISK_CORPUS_MAP,
    ["We run a warehouse monitoring program with scanner tracking of worker productivity."],
    new Set(["https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2023-021"]),
  );
  assert(!res.some((m) => m.id === "cppa-risk/regulatory-trigger-and-applicability/ap-03"));
});

Deno.test("doc132 — ADMT: a curated term surfaces the Deliveroo row", () => {
  const res = matchAdvisoryRows(
    ADMT_CORPUS_MAP,
    ["Our platform uses algorithmic management for delivery riders in the gig economy."],
    new Set(),
  );
  assert(res.some((m) => m.id === "cppa-admt/significant-decision/ap-01"));
});
