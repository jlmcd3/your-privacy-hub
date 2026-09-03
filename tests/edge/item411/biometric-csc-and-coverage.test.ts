// ITEM 411 LEG C — BIOMETRIC CSC + COVERAGE.
//
// Identities:
//   item411 linkage every prose-gold absence phrasing is detected
//   item411 linkage resolved determinations are never absence
//   item411 csc repairs a false absence on a backed duty surface
//   item411 csc leaves the determination enum byte-identical
//   item411 csc honest absence on an unanswered question is preserved
//   item411 csc primary keys are sound — corroboration never backs a surface
//   item411 csc every mapped duty key is one the builder writes
//   item411 csc statutory passages are never repaired or removed
//   item411 csc b2 is the gate's false-absence id for biometric
//   item411 coverage zero orphans on the perfect record
//   item411 coverage every declared surface is one the pipeline writes
//   item411 coverage silence in the record is never an orphan
//   item411 coverage a hollowed section orphans that section
//   item411 coverage an ask against a supplied fact is flagged
//   item411 coverage telemetry attaches at biometric_coverage
//   item411 refinement config declares evidence-backed watch classes

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachBiometricCsc,
  BIOMETRIC_CSC_SURFACES,
  BIOMETRIC_DUTY_SURFACE_KEYS,
  biometricCarriesAbsence,
  biometricSurfaceBacked,
  runBiometricCsc,
} from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-csc.ts";
import {
  BIOMETRIC_ABSENCE_LABEL_PHRASINGS,
} from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-prose-gold.ts";
import {
  attachCoverage,
  BIOMETRIC_COVERAGE_LINKS,
  runCoverageMatrix,
} from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { FALSE_ABSENCE_CHECK_IDS } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { BIOMETRIC_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/biometric-perfect.ts";
import { buildBiometricDeliverables } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts";
import { BIOMETRIC_WATCH_CLASSES } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-refinement-config.ts";

const RECORD = ((BIOMETRIC_PERFECT as unknown as Array<{ intake: Record<string, unknown> }>)[0]
  ?.intake ?? BIOMETRIC_PERFECT) as Record<string, unknown>;

/** The document the live pipeline assembles, rebuilt from the same builder the
 *  function calls, plus the `assessment_text` the wiring passes alongside. */
function liveReport(): Record<string, unknown> {
  const d = buildBiometricDeliverables(RECORD as never) as unknown as Record<string, unknown>;
  return {
    jurisdictions_analysed: RECORD.jurisdictions,
    identifier_characterizations: d.identifier_characterizations,
    entity_characterization: d.entity_characterization,
    duty_findings: d.duty_findings,
    divergence_analysis: d.divergence_analysis,
    consequence_determination: d.consequence_determination,
    biometric_deliverables: d,
    assessment_text: [
      RECORD.purpose,
      RECORD.data_source_description,
      RECORD.security_measures_description,
      RECORD.retention_schedule_text,
      RECORD.destruction_trigger,
      RECORD.release_artifact_description,
      RECORD.disclosure_recipients,
      (RECORD.jurisdictions as string[] ?? []).join(", "),
      String(RECORD.wa_mhmda_health_inference ?? ""),
      String(RECORD.tx_ai_training_use ?? ""),
      String(RECORD.wa_security_purpose_only ?? ""),
      String(RECORD.tx_employer_security_collection ?? ""),
      String(RECORD.other_state_names ?? ""),
    ].filter(Boolean).join("\n\n"),
  };
}

// ── linkage ────────────────────────────────────────────────────────────────

Deno.test("item411 linkage every prose-gold absence phrasing is detected", () => {
  for (const phrase of BIOMETRIC_ABSENCE_LABEL_PHRASINGS) {
    assert(
      biometricCarriesAbsence(phrase, []),
      `prose-gold phrasing escaped the CSC detector: ${phrase}`,
    );
  }
});

Deno.test("item411 linkage resolved determinations are never absence", () => {
  for (const label of ["met on the record", "not met on the record"]) {
    assertEquals(biometricCarriesAbsence(label, []), null, label);
  }
});

// ── CSC ────────────────────────────────────────────────────────────────────

Deno.test("item411 csc repairs a false absence on a backed duty surface", () => {
  const report = liveReport();
  const rows = report.duty_findings as Array<Record<string, unknown>>;
  const row = rows.find((r) => r.key === "il_bipa.15e_reasonable_care")!;
  row.record_fact =
    "The record does not state what safeguards protect the biometric data at rest or in transit.";
  const t = runBiometricCsc(report, { intake: RECORD });
  assertEquals(t.crashed, false);
  const hit = t.violations.find((v) =>
    v.check_id === "b1_duty_finding_vs_record" && v.path.includes("record_fact")
  );
  assert(hit, "expected a b1 violation on the relabelled duty surface");
  assertEquals(hit!.repaired, true);
  assert(
    String(row.record_fact).includes("security measures the record describes"),
    String(row.record_fact),
  );
});

Deno.test("item411 csc leaves the determination enum byte-identical", () => {
  const report = liveReport();
  const rows = report.duty_findings as Array<Record<string, unknown>>;
  const row = rows.find((r) => r.key === "il_bipa.15c_no_profit")!;
  const verdict = row.verdict;
  const status = row.status;
  row.application = "The record does not state whether the data is sold, leased or traded.";
  runBiometricCsc(report, { intake: RECORD });
  assertEquals(row.verdict, verdict);
  assertEquals(row.status, status);
});

Deno.test("item411 csc honest absence on an unanswered question is preserved", () => {
  const report = liveReport();
  const rows = report.duty_findings as Array<Record<string, unknown>>;
  const row = rows.find((r) => r.key === "il_bipa.15e_reasonable_care")!;
  const honest =
    "The record does not state what safeguards protect the biometric data at rest or in transit.";
  row.record_fact = honest;
  // A record that answers NOTHING this duty turns on.
  const t = runBiometricCsc(report, { intake: { orgName: "Acme" } });
  assertEquals(t.violations.filter((v) => v.check_id === "b1_duty_finding_vs_record").length, 0);
  assertEquals(row.record_fact, honest);
});

Deno.test("item411 csc primary keys are sound — corroboration never backs a surface", () => {
  for (const s of BIOMETRIC_CSC_SURFACES) {
    for (const c of s.corroborating ?? []) {
      const onlyCorroborated: Record<string, unknown> = { [c]: "a substantive answer on the record" };
      assertEquals(
        biometricSurfaceBacked(s, onlyCorroborated),
        false,
        `${s.path}: corroborating key "${c}" must not back the surface on its own`,
      );
    }
    assert(s.keys.length > 0, `${s.path} declares no primary key`);
  }
});

Deno.test("item411 csc every mapped duty key is one the builder writes", () => {
  // ITEM 406-B DISCIPLINE: a map entry may never name a surface the pipeline
  // does not write. The builder's row ids are the only admissible keys.
  const src = Deno.readTextFileSync(
    new URL(
      "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts",
      import.meta.url,
    ),
  );
  for (const key of BIOMETRIC_DUTY_SURFACE_KEYS) {
    assert(src.includes(`"${key}"`), `duty key not produced by the builder: ${key}`);
  }
  // …and every duty row the perfect record produces is mapped.
  const rows = (liveReport().duty_findings as Array<Record<string, unknown>>).map((r) => String(r.key));
  for (const k of rows) {
    assert(BIOMETRIC_DUTY_SURFACE_KEYS.includes(k), `duty row unmapped by the CSC: ${k}`);
  }
});

Deno.test("item411 csc statutory passages are never repaired or removed", () => {
  const report = liveReport();
  const rows = report.duty_findings as Array<Record<string, unknown>>;
  const before = rows.map((r) => [r.standard, r.citation] as const);
  // Force absence prose into an authority field: it must be FLAGGED, never
  // rewritten and never deleted — it is a verified corpus passage.
  const row = rows[0];
  const original = row.standard;
  row.standard = "The record does not state the standard.";
  const t = runBiometricCsc(report, { intake: RECORD });
  assert(t.violations.some((v) => v.check_id === "b3_authority_field_hygiene"));
  assertEquals(row.standard, "The record does not state the standard.");
  assert("standard" in row);
  row.standard = original;
  rows.forEach((r, i) => {
    assertEquals(r.standard, before[i][0]);
    assertEquals(r.citation, before[i][1]);
  });
});

Deno.test("item411 csc b2 is the gate's false-absence id for biometric", () => {
  assertEquals(FALSE_ABSENCE_CHECK_IDS.biometric, ["b2_absence_claim_vs_record"]);
});

// ── coverage ───────────────────────────────────────────────────────────────

Deno.test("item411 coverage zero orphans on the perfect record", () => {
  const report = liveReport();
  const t = runCoverageMatrix("biometric", report, RECORD);
  assertEquals(t.crashed, false);
  assertEquals(
    t.orphans,
    [],
    `orphans on the perfect record:\n${t.orphans.map((o) => `${o.path}: ${o.detail}`).join("\n")}`,
  );
  assert(t.counts.links_checked >= 15, String(t.counts.links_checked));
});

Deno.test("item411 coverage every declared surface is one the pipeline writes", () => {
  // ITEM 406-B MANDATORY. Each declared surface must resolve against the shape
  // the pipeline actually assembles for a perfect record.
  const report = liveReport();
  const resolve = (path: string): unknown => {
    const m = /^([a-z_]+)\[([a-z0-9_.]+)\]$/.exec(path);
    if (m) {
      const rows = (report as Record<string, unknown>)[m[1]];
      if (!Array.isArray(rows)) return undefined;
      return rows.find((r) =>
        !!r && typeof r === "object" &&
        String((r as Record<string, unknown>).key ?? (r as Record<string, unknown>).statute_key ?? "") === m[2]
      );
    }
    let cur: unknown = report;
    for (const seg of path.split(".")) {
      if (!cur || typeof cur !== "object") return undefined;
      cur = (cur as Record<string, unknown>)[seg];
    }
    return cur;
  };
  const missing: string[] = [];
  for (const link of BIOMETRIC_COVERAGE_LINKS) {
    if (!link.surfaces.some((s) => resolve(s) !== undefined)) missing.push(link.surfaces.join("|"));
  }
  assertEquals(missing, [], `declared surfaces the pipeline never writes: ${missing.join(", ")}`);
});

Deno.test("item411 coverage silence in the record is never an orphan", () => {
  const t = runCoverageMatrix("biometric", {}, {});
  assertEquals(t.orphans, []);
  assertEquals(t.counts.links_checked, 0);
});

Deno.test("item411 coverage a hollowed section orphans that section", () => {
  const report = liveReport();
  report.entity_characterization = { role: "", role_reasoning: "", intake_label: "" };
  const t = runCoverageMatrix("biometric", report, RECORD);
  const orphan = t.orphans.find((o) => o.path === "entity_characterization");
  assert(orphan, JSON.stringify(t.orphans));
  assertEquals(orphan!.type, "supplied_fact_without_section");
});

Deno.test("item411 coverage an ask against a supplied fact is flagged", () => {
  const report = liveReport();
  report.information_needed = [
    { ask: "Please supply retention_schedule_text for the Illinois analysis." },
  ];
  const t = runCoverageMatrix("biometric", report, RECORD);
  assert(t.orphans.some((o) => o.type === "ask_against_supplied_fact"));
});

Deno.test("item411 coverage telemetry attaches at biometric_coverage", () => {
  const report = liveReport();
  const t = attachCoverage(report, "biometric_coverage", runCoverageMatrix("biometric", report, RECORD));
  const internal = (report._meta as Record<string, Record<string, { version: string }>>).internal;
  assertEquals(internal.biometric_coverage.version, t.version);
});

Deno.test("item411 csc telemetry attaches at biometric_csc", () => {
  const report = liveReport();
  const t = attachBiometricCsc(report, { intake: RECORD });
  const internal = (report._meta as Record<string, Record<string, { version: string }>>).internal;
  assertEquals(internal.biometric_csc.version, t.version);
});

// ── refinement config (authored this leg, wired in leg D) ──────────────────

Deno.test("item411 refinement config declares evidence-backed watch classes", () => {
  assert(BIOMETRIC_WATCH_CLASSES.length >= 6);
  const ids = BIOMETRIC_WATCH_CLASSES.map((w) => w.id);
  assertEquals(new Set(ids).size, ids.length);
  for (const w of BIOMETRIC_WATCH_CLASSES) {
    assert(w.title.trim().length > 10, w.id);
  }
});
