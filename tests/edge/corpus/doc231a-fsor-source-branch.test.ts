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
//
// DOC 238 §1.4 / §5.5.2 FOLLOW-UP (2026-09-09) — the FSOR citation label is
// now the CEO's own form, used by EVERY FSOR citation in docs 234 and 236
// ("California Privacy Protection Agency, Final Statement of Reasons,
// <package>, <regulation_citation>, <page_ref>"), not doc 231A's orchestrator
// default "CPPA Final Statement of Reasons, …"; the package name is
// normalised from whichever of the two DB conventions the row carries, and
// the page ref from "Appendix, p. 13" to the approved "Appendix p. 13". The
// pins below moved accordingly. `deriveSourceStatus` additionally reports
// whether the citation trailer carries the status clause (per product).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hookRegistryFor } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import {
  citationFor,
  deriveSourceStatus,
  fsorPackageName,
  fsorPageRef,
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
const FSOR_LABEL = "California Privacy Protection Agency, Final Statement of Reasons";
const PKG_2025 = "CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations";

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

function run(rows: HookRow[], profiles: HookProfileRow[], sources?: Map<string, HookSourceRow>, product = "cppa-risk") {
  return generateHooks({
    product,
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

Deno.test("citationFor: cppa_fsor_commentary composes the CEO's FSOR citation form — '<agency>, Final Statement of Reasons, <regulation_citation>, <page_ref>' (doc 238 §1.4 follow-up)", () => {
  // DOC 238 §7 — `page_ref` was already a fsorSource() default (below) but,
  // before the citationFor fix, was silently dropped from the composed label.
  const cite = citationFor(fsorProfile(), fsorSource());
  assertEquals(cite?.regulator, "the CPPA");
  assertEquals(cite?.authority_label, `${FSOR_LABEL}, 11 CCR § 7152(a)(1), p. 102`);
});

Deno.test("citationFor: cppa_fsor_commentary with only regulation_citation (no fsor_package, no page_ref) composes just the two parts", () => {
  const cite = citationFor(fsorProfile(), fsorSource({ page_ref: null }));
  assertEquals(cite?.authority_label, `${FSOR_LABEL}, 11 CCR § 7152(a)(1)`);
});

Deno.test("citationFor: cppa_fsor_commentary with none of regulation_citation/fsor_package/page_ref still yields a bare, valid label (never null)", () => {
  const cite = citationFor(fsorProfile(), fsorSource({ regulation_citation: null, page_ref: null }));
  assertEquals(cite?.authority_label, FSOR_LABEL);
});

Deno.test("citationFor: cppa_fsor_commentary composes the package name between the label and the regulation citation, NORMALISED to the approved name whichever DB convention the row carries (doc 238 §1.4 follow-up)", () => {
  // The prose convention (128 live rows) …
  const prose = citationFor(fsorProfile(), fsorSource({ fsor_package: "CCPA Updates, Cyber, Risk, ADMT, Insurance 2025 FSOR" }));
  assertEquals(prose?.authority_label, `${FSOR_LABEL}, ${PKG_2025}, 11 CCR § 7152(a)(1), p. 102`);
  // … and the slug convention (916 live rows) print the same citation.
  const slug = citationFor(fsorProfile(), fsorSource({ fsor_package: "ccpa-2025-cyber-risk-admt" }));
  assertEquals(slug?.authority_label, prose?.authority_label);
});

Deno.test("fsorPackageName: every fsor_package value in the live data (verified 2026-09-09) renders as clean prose; a slug is never printed", () => {
  // Read live: five distinct values across 1,323 rows.
  assertEquals(fsorPackageName("ccpa-2025-cyber-risk-admt"), PKG_2025);
  assertEquals(fsorPackageName("CCPA Updates, Cyber, Risk, ADMT, Insurance 2025 FSOR"), PKG_2025);
  assertEquals(fsorPackageName("ccpa-2023-original"), "CCPA Updates 2023");
  assertEquals(fsorPackageName("CCPA Updates 2023 FSOR"), "CCPA Updates 2023");
  assertEquals(fsorPackageName("dbr-2024-registration"), "Data Broker Registration 2024");
  // Blank never prints.
  assertEquals(fsorPackageName(null), "");
  assertEquals(fsorPackageName("   "), "");
  // A future value still reads as prose, never as a slug: mechanical fallback.
  assertEquals(fsorPackageName("cppa-2027-something-new-fsor"), "CPPA 2027 Something New");
  assertEquals(fsorPackageName("Some Future Package FSOR"), "Some Future Package");
  assertEquals(fsorPackageName("Some Future Package"), "Some Future Package");
  for (const v of ["ccpa-2025-cyber-risk-admt", "ccpa-2023-original", "dbr-2024-registration", "x-y-z"]) {
    assert(!/^[a-z0-9]+(-[a-z0-9]+)+$/.test(fsorPackageName(v)), `still a slug: ${fsorPackageName(v)}`);
  }
});

Deno.test("fsorPageRef: the DB's 'Appendix, p. 13' prints as the approved 'Appendix p. 13' (doc 236 G1); a plain 'p. 34' is unchanged; blank never prints", () => {
  assertEquals(fsorPageRef("Appendix, p. 13"), "Appendix p. 13");
  assertEquals(fsorPageRef("2023 App C, p. 10"), "2023 App C p. 10");
  assertEquals(fsorPageRef("p. 34"), "p. 34");
  assertEquals(fsorPageRef("Appendix p. 212"), "Appendix p. 212");
  assertEquals(fsorPageRef(null), "");
  assertEquals(fsorPageRef(""), "");
  const cite = citationFor(fsorProfile(), fsorSource({ fsor_package: "ccpa-2025-cyber-risk-admt", regulation_citation: "11 CCR § 7150(b)(6)", page_ref: "Appendix, p. 13" }));
  // Byte-identical to doc 236 G1's approved citation label.
  assertEquals(cite?.authority_label, `${FSOR_LABEL}, ${PKG_2025}, 11 CCR § 7150(b)(6), Appendix p. 13`);
});

Deno.test("deriveSourceStatus: cppa_fsor_commentary always derives regulator_guidance (no exclusion path); the citation trailer carries the status except for ADMT (doc 238 §5.5.2)", () => {
  const status = deriveSourceStatus(fsorProfile(), fsorSource(), { appeal_note: null, verified_as_of: null });
  assert(!("exclude" in status));
  if (!("exclude" in status)) {
    assertEquals(status.source_status, "regulator_guidance");
    assertEquals(status.verb, "states");
    assert(status.status_label.includes("CPPA Final Statement of Reasons"));
    assertEquals(status.status_in_citation, true); // no product given: the shared default
  }
  const risk = deriveSourceStatus(fsorProfile(), fsorSource(), { appeal_note: null, verified_as_of: null }, "cppa-risk");
  assert(!("exclude" in risk) && risk.status_in_citation === true); // doc 234's Risk FSOR convention keeps it
  const admt = deriveSourceStatus(fsorProfile(), fsorSource(), { appeal_note: null, verified_as_of: null }, "admt");
  assert(!("exclude" in admt) && admt.status_in_citation === false); // doc 236's approved ADMT FSOR citations omit it
  assert(!("exclude" in admt) && admt.status_label === "CPPA Final Statement of Reasons — agency position, primary regulator commentary"); // still derived (S4 prints it)
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
  assert(result.contents!.includes(`${FSOR_LABEL}, 11 CCR § 7152(a)(1)`));
  assert(result.contents!.includes('"source_status": "regulator_guidance"'));
  assert(result.contents!.includes('"authority_label_short": "CPPA Final Statement of Reasons"'));
  assert(result.contents!.includes('"status_in_citation": true'));
});

Deno.test("generate: the same FSOR row generated for product 'admt' emits status_in_citation false (doc 236 convention) — the ONLY difference from the cppa-risk emission", () => {
  const admt = run([fsorHookRow({ product: "admt" })], [fsorProfile()], undefined, "admt");
  assert(admt.ok, JSON.stringify(admt.excluded));
  assertEquals(admt.emitted, 1);
  assert(admt.contents!.includes('"status_in_citation": false'));
  assert(admt.contents!.includes('"status_label": "CPPA Final Statement of Reasons — agency position, primary regulator commentary"'));
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
