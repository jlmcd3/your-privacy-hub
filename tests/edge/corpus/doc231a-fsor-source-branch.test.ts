// DOC 231A (2026-09-08) — the `cppa_fsor_commentary` source-table branch
// (doc 231 §6 default #2's proposed diff, applied in generate.ts + index.ts's
// `loadSource`). Closes doc 231 §13 NEED #1: "generate.ts/index.ts's missing
// cppa_fsor_commentary source-table branch — blocks Candidate 5 and any
// future FSOR hook from being drafted at all."
//
// This file exercises the PURE half only (`generateHooks`, `citationFor`,
// `deriveSourceStatus`, `shortLabelFor` — generate.ts), the same seam
// doc213-hooks-generator.test.ts's own "generate:"/"citationFor:" groups use.
// It does not touch `loadSource`'s network call (index.ts, not importable
// from a pure test without a live Supabase client) — the schema this build
// read against was verified read-only this session against project
// 75bce9a1-c7dc-4628-aea5-12baa2e26bf2 (doc 231A follow-up log records the
// column list); a build-time regression in that read would surface as a
// live "generate" action 500, not here.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hookRegistryFor } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import {
  citationFor,
  deriveSourceStatus,
  generateHooks,
  shortLabelFor,
  type HookProfileRow,
  type HookRow,
  type HookSourceRow,
} from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { riskElementOf } from "../../../supabase/functions/generate-corpus-hooks/_local/risk-factor-element.ts";

const REGISTRY = hookRegistryFor("cppa-risk")!;
const PROFILE_A = "22222222-2222-4222-8222-222222222222";
const F_PURPOSE = "Processing purpose specificity";

function fsorProfile(over: Partial<HookProfileRow> = {}): HookProfileRow {
  return {
    id: PROFILE_A,
    source_table: "cppa_fsor_commentary",
    source_row_id: "41408f4d-6355-499e-8c66-33022becb826",
    outcome_posture: "rejected",
    instrument: "CPPA Regulations",
    factor_ids: [F_PURPOSE],
    use_case_class: null,
    relationship: null,
    data_categories: [],
    flags: [],
    curation_note: "Doc 229 §6 Candidate 5 — the CPPA's ¶12 example on generic purpose recitals.",
    ratified_by: "ceo",
    ratified_at: "2026-09-08T00:00:00Z",
    ledger_ref: "doc231a-1",
    ...over,
  } as HookProfileRow;
}

function fsorSource(over: Partial<HookSourceRow> = {}): HookSourceRow {
  return {
    source_table: "cppa_fsor_commentary",
    regulation_citation: "11 CCR § 7152(a)(1)",
    page_ref: "p. 102",
    ...over,
  };
}

function fsorHookRow(over: Partial<HookRow> = {}): HookRow {
  return {
    id: "hook-fsor-1",
    profile_id: PROFILE_A,
    product: "cppa-risk",
    hook_version: 1,
    hook_status: "ratified",
    fact_atoms: [],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    finding_span: "generic purpose recitals such as “safety purposes” are inadequate",
    fact_pattern_paraphrase: "the stated purpose is a generic recital with no named operation",
    finding_paraphrase: "a generic purpose recital does not satisfy § 7152(a)(1)'s specificity requirement",
    trigger_terms: ["generic purpose", "specificity"],
    settledness: "R1",
    ratified_by: "ceo",
    ratified_at: "2026-09-08T00:00:00Z",
    ledger_ref: "doc231a-1",
    retired_at: null,
    pinpoint: { kind: "section", ref: "7152(a)(1)", anchor_span: "generic purpose recitals such as “safety purposes” are inadequate" },
    ...over,
  };
}

function run(rows: HookRow[], profiles: HookProfileRow[], sources?: Map<string, HookSourceRow>) {
  return generateHooks({
    product: "cppa-risk",
    rows,
    profiles: new Map(profiles.map((p) => [p.id, p])),
    sources: sources ?? new Map(profiles.map((p) => [p.id, fsorSource({ source_table: p.source_table })])),
    elementOf: riskElementOf,
    hooksVersion: "risk-hooks-v2-2026-09-08-0",
    outputPath: REGISTRY.output_path,
    exportPrefix: REGISTRY.export_prefix,
    contextBlock: "// placeholder",
  });
}

// ── Unit level: the three branches added to generate.ts ────────────────────

Deno.test("citationFor: cppa_fsor_commentary composes 'CPPA Final Statement of Reasons, <regulation_citation>'", () => {
  const cite = citationFor(fsorProfile(), fsorSource());
  assertEquals(cite?.regulator, "the CPPA");
  assertEquals(cite?.authority_label, "CPPA Final Statement of Reasons, 11 CCR § 7152(a)(1)");
});

Deno.test("citationFor: cppa_fsor_commentary with no regulation_citation still yields a bare, valid label (never null)", () => {
  const cite = citationFor(fsorProfile(), fsorSource({ regulation_citation: null }));
  assertEquals(cite?.authority_label, "CPPA Final Statement of Reasons");
});

Deno.test("deriveSourceStatus: cppa_fsor_commentary always derives regulator_guidance (no exclusion path)", () => {
  const status = deriveSourceStatus(fsorProfile(), fsorSource(), { appeal_note: null, verified_as_of: null });
  assert(!("exclude" in status));
  if (!("exclude" in status)) {
    assertEquals(status.source_status, "regulator_guidance");
    assertEquals(status.verb, "states");
    assert(status.status_label.includes("CPPA Final Statement of Reasons"));
  }
});

Deno.test("shortLabelFor: cppa_fsor_commentary is the fixed short form (this table has no title field)", () => {
  assertEquals(shortLabelFor(fsorProfile(), fsorSource()), "CPPA Final Statement of Reasons");
});

// ── End-to-end: generateHooks() emits a ratified FSOR hook ──────────────────

Deno.test("generate: a ratified hook over a ratified cppa_fsor_commentary profile is emitted (doc 231 Candidate 5, unblocked)", () => {
  const result = run([fsorHookRow()], [fsorProfile()]);
  assert(result.ok, JSON.stringify(result.excluded));
  assertEquals(result.emitted, 1);
  assertEquals(result.excluded, []);
  assert(result.contents!.includes("CPPA Final Statement of Reasons, 11 CCR § 7152(a)(1)"));
  assert(result.contents!.includes('"source_status": "regulator_guidance"'));
  assert(result.contents!.includes('"authority_label_short": "CPPA Final Statement of Reasons"'));
});

Deno.test("generate: before this branch existed, an FSOR profile would have been excluded — this is the regression the branch closes", () => {
  // Reproduces the pre-doc-231A behaviour by using a source_table generate.ts
  // has no branch for, proving `run()`'s success above is the branch's own
  // doing and not an accident of the test fixtures.
  const result = run(
    [fsorHookRow({ profile_id: PROFILE_A })],
    [fsorProfile({ source_table: "gdpr_recitals" as HookProfileRow["source_table"] })],
    new Map([[PROFILE_A, { source_table: "gdpr_recitals" } as HookSourceRow]]),
  );
  assertEquals(result.emitted, 0);
  assert(result.excluded[0].reason.includes("citation facts incomplete"));
});
