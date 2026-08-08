// ITEM 406 LEG C / ITEM 406-B — CYBER COVERAGE MATRIX.
//
// Identities:
//   item406b coverage zero orphans on the live perfect pilot document
//   item406b coverage the item406 link config reproduces the shipped defect
//   item406 coverage honest orphan on an unanchored action
//   item406 coverage a supplied fact without its section is an orphan
//   item406 coverage silence in the record is never an orphan
//   item406 coverage an ask against a supplied fact is flagged
//   item406 coverage telemetry attaches at cyber_coverage
//   item406b coverage every declared surface is one the pipeline writes
//
// ITEM 406-B — the previous live-parity test hand-built a report shape that
// carried `control_findings`, `component_coverage` and slug-bearing control
// rows. The live pipeline writes NONE of those. The test was therefore green
// while the shipped config orphaned all eighteen components on a perfect
// record (quality_run_documents b2f1ec1e-7e33-4259-9358-c60280369fd2,
// record_complete.value=false, failed_conditions=["coverage_orphans"]).
// The parity fixture below is that document, captured verbatim from the
// database — report AND intake exactly as the pipeline persisted them.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachCoverage,
  runCoverageMatrix,
} from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";

const FIXTURE_URL = new URL(
  "../fixtures/item406b/live-cyber-b2f1ec1e.json",
  import.meta.url,
);
const LIVE = JSON.parse(await Deno.readTextFile(FIXTURE_URL)) as {
  doc_id: string;
  report: Record<string, unknown>;
  intake: Record<string, unknown>;
};

const INTAKE = LIVE.intake as Record<string, any>;

/** The document the live pipeline produced, cloned per test. */
function liveReport(): Record<string, unknown> {
  return structuredClone(LIVE.report);
}

Deno.test("item406b coverage zero orphans on the live perfect pilot document", () => {
  // Guard: the fixture is the real document, not a hand-built shape.
  assertEquals(LIVE.doc_id, "b2f1ec1e-7e33-4259-9358-c60280369fd2");
  const report = liveReport();
  assert(!("control_findings" in report), "the live document has no control_findings");
  assertEquals((report.controls as unknown[]).length, 18);

  const t = runCoverageMatrix("cppa-cyber", report, INTAKE);
  assertEquals(t.crashed, false);
  assertEquals(
    t.orphans,
    [],
    `orphans on the live perfect document:\n${t.orphans.map((o) => `${o.path}: ${o.detail}`).join("\n")}`,
  );
  assertEquals(
    t.unused_intake_facts,
    [],
    `unused facts: ${t.unused_intake_facts.join(", ")}`,
  );
  assert(t.counts.links_checked >= 19, String(t.counts.links_checked));
});

Deno.test("item406b coverage the item406 link config reproduces the shipped defect", () => {
  // A faithful replica of the ITEM 406 per-component declaration and of the
  // identity-only row resolver it shipped with. Run against the SAME live
  // document, it must produce exactly the eighteen orphans the pilot hit.
  const SLUGS: string[] = (INTAKE.controls as any[]).map((c) => String(c.key));
  const legacyResolve = (report: Record<string, unknown>, path: string): unknown => {
    const m = /^([a-z_]+)\[([a-z0-9_]+)\]$/.exec(path);
    if (!m) return (report as any)[path];
    const rows = (report as any)[m[1]];
    if (!Array.isArray(rows)) return undefined;
    for (const r of rows) {
      if (r && typeof r === "object" && String((r as any).key ?? (r as any).slug ?? "") === m[2]) return r;
    }
    return undefined; // ITEM 406: no positional fallback
  };
  const substance = (n: unknown) =>
    (n === undefined || n === null ? "" : typeof n === "string" ? n : JSON.stringify(n))
      .replace(/[{}\[\]"“”:,]/g, " ").replace(/\s+/g, " ").trim().length;

  const report = liveReport();
  const legacyOrphans = SLUGS.filter((slug) =>
    ![`controls[${slug}]`, `component_coverage[${slug}]`, `evidence_sufficiency[${slug}]`]
      .some((s) => substance(legacyResolve(report, s)) >= 40)
  );
  assertEquals(
    legacyOrphans.length,
    18,
    "the item406 config must orphan all eighteen components on this document",
  );
  // …and the shipped orphan detail named a section the document never carries.
  assert(!("control_findings" in report));

  // The fixed config resolves every one of them.
  const fixed = runCoverageMatrix("cppa-cyber", report, INTAKE);
  assertEquals(fixed.orphans.filter((o) => o.type === "supplied_fact_without_section").length, 0);
});

Deno.test("item406 coverage honest orphan on an unanchored action", () => {
  const report = liveReport();
  (report as any).next_steps = [
    {
      action: "Commission an independent segmentation test before the audit window opens.",
      anchor_keys: ["profile.revenue_band"],
    },
  ];
  const t = runCoverageMatrix("cppa-cyber", report, INTAKE);
  const orphan = t.orphans.find((o) => o.type === "action_without_record_anchor");
  assert(orphan, "expected an honest orphan on the unanchored action");
  assert(orphan!.detail.includes("profile.revenue_band"), orphan!.detail);
});

Deno.test("item406 coverage a supplied fact without its section is an orphan", () => {
  const report = liveReport();
  delete (report as any).control_status_counts;
  const t = runCoverageMatrix("cppa-cyber", report, INTAKE);
  const orphan = t.orphans.find((o) => o.path === "control_status_counts");
  assert(orphan, "expected the tally section to be reported as an orphan");
  assertEquals(orphan!.type, "supplied_fact_without_section");
});

Deno.test("item406b coverage a hollowed component row orphans that component", () => {
  // A genuine per-component orphan still orphans: emptying one row's prose
  // must be reported, and only for that component.
  const report = liveReport();
  (report.controls as any[])[9] = { score: null, status: "", finding: "", priority: "", remediation: "" };
  const t = runCoverageMatrix("cppa-cyber", report, INTAKE);
  const orphans = t.orphans.filter((o) => o.type === "supplied_fact_without_section");
  assertEquals(orphans.length, 1, JSON.stringify(orphans));
  assertEquals(orphans[0].path, "controls[c10_segmentation]");
});

Deno.test("item406 coverage silence in the record is never an orphan", () => {
  const t = runCoverageMatrix("cppa-cyber", {}, { profile: {}, controls: [] });
  assertEquals(t.orphans, []);
  assertEquals(t.counts.links_checked, 0);
});

Deno.test("item406 coverage an ask against a supplied fact is flagged", () => {
  const report = liveReport();
  (report as any).information_needed = [
    { ask: "Please supply controls[c1_auth].notes for the authentication component." },
  ];
  const t = runCoverageMatrix("cppa-cyber", report, INTAKE);
  const orphan = t.orphans.find((o) => o.type === "ask_against_supplied_fact");
  assert(orphan, "expected the ask against a supplied fact to be flagged");
});

Deno.test("item406 coverage telemetry attaches at cyber_coverage", () => {
  const report = liveReport();
  const t = attachCoverage(report, "cyber_coverage", runCoverageMatrix("cppa-cyber", report, INTAKE));
  const internal = (report._meta as any).internal;
  assertEquals(internal.cyber_coverage.version, t.version);
});
