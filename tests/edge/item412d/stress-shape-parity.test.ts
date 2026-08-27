// ITEM 412-D — ONE SHAPE, BOTH PATHS.
//
// DEFECT: `runStressBiometric` (the harness path every pilot and the CEO's
// acceptance run grades) persisted a `report_data` WITHOUT the ITEM 317 typed
// deliverables, so coverage graded a document that had no `duty_findings` —
// 16 orphans, gate shut. The streaming (customer) path has always written
// them. Two paths, two shapes.
//
// Identities:
//   item412d shape parity — both paths persist the same deliverables key set
//   item412d stress path calls the deliverables builder before the seam
//   item412d single writer — the builder is the only producer on both paths
//   item412d coverage zero orphans on the stress-shaped perfect document
//   item412d pre-fix stress shape orphans duty_findings (direction proof)
//   item412d stamp is item412d
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runCoverageMatrix } from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { BIOMETRIC_PERFECT } from "../../../supabase/functions/_shared/golden/biometric-perfect.ts";
import { buildBiometricDeliverables } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts";
import { BIOMETRIC_PIPELINE_STAMP } from "../../../supabase/functions/check-biometric-compliance/_local/prose/plans/biometric.spine.ts";

const SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/check-biometric-compliance/index.ts", import.meta.url),
);

const RECORD = ((BIOMETRIC_PERFECT as unknown as Array<{ intake: Record<string, unknown> }>)[0]
  ?.intake ?? BIOMETRIC_PERFECT) as Record<string, unknown>;

/**
 * COMPUTED FROM THE CODE, NEVER HAND-LISTED. Finds the name of the variable
 * each path assigns `buildBiometricDeliverables(...)` to, then collects every
 * `report_data` key whose value is that variable (or a property of it),
 * including the `name,` shorthand form.
 */
function deliverableKeysPerPath(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const decl = /const\s+([A-Za-z_$][\w$]*)\s*=\s*buildBiometricDeliverables\(/g;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(SRC))) {
    const v = m[1];
    const keys = new Set<string>();
    const prop = new RegExp(`^\\s*([A-Za-z_$][\\w$]*):\\s*${v}(?:\\.([A-Za-z_$][\\w$]*))?\\s*,`, "gm");
    let k: RegExpExecArray | null;
    while ((k = prop.exec(SRC))) keys.add(k[1]);
    // shorthand: `biometric_deliverables,` inside an object literal
    const short = new RegExp(`^\\s*${v}\\s*,\\s*$`, "m");
    if (short.test(SRC)) keys.add(v);
    out[v] = [...keys].sort();
  }
  return out;
}

Deno.test("item412d shape parity — both paths persist the same deliverables key set", () => {
  const perPath = deliverableKeysPerPath();
  const paths = Object.keys(perPath);
  assertEquals(paths.length, 2, `expected exactly two builder call sites, saw: ${paths.join(", ")}`);
  const [a, b] = paths;
  assertEquals(
    perPath[a],
    perPath[b],
    `deliverables key sets diverge:\n  ${a}: ${perPath[a].join(", ")}\n  ${b}: ${perPath[b].join(", ")}`,
  );
  // and the set is non-trivial
  assert(perPath[a].includes("duty_findings"), perPath[a].join(", "));
  assert(perPath[a].length >= 6, perPath[a].join(", "));
});

Deno.test("item412d stress path calls the deliverables builder before the seam", () => {
  const fnStart = SRC.indexOf("async function runStressBiometric(");
  assert(fnStart > 0, "runStressBiometric not found");
  const body = SRC.slice(fnStart);
  const buildAt = body.indexOf("buildBiometricDeliverables(");
  const seamAt = body.indexOf("runBiometricFinalizeBattery(");
  assert(buildAt > 0, "stress path does not call buildBiometricDeliverables");
  assert(seamAt > 0, "stress path does not call the finalize seam");
  assert(buildAt < seamAt, "the builder must run BEFORE the finalize battery seam");
});

Deno.test("item412d single writer — the builder is the only producer on both paths", () => {
  // No literal assignment of a deliverables key from anything other than a
  // builder result variable.
  const vars = Object.keys(deliverableKeysPerPath());
  const offenders: string[] = [];
  for (const key of ["identifier_characterizations", "entity_characterization", "duty_findings", "divergence_analysis", "consequence_determination"]) {
    const re = new RegExp(`^\\s*${key}:\\s*([^,\\n]+),`, "gm");
    let m: RegExpExecArray | null;
    while ((m = re.exec(SRC))) {
      const rhs = m[1].trim();
      if (!vars.some((v) => rhs.startsWith(`${v}.`) || rhs === v)) offenders.push(`${key}: ${rhs}`);
    }
  }
  assertEquals(offenders, [], `non-builder writers of deliverables keys: ${offenders.join("; ")}`);
});

/** The document the STRESS path now assembles, key-for-key. */
function stressShapedReport(): Record<string, unknown> {
  const d = buildBiometricDeliverables(RECORD as never) as unknown as Record<string, unknown>;
  return {
    jurisdictions_analysed: RECORD.jurisdictions,
    enforcement_precedents: [],
    enforcement_meta: { attempted: false, stress_run: true },
    annotations: [],
    lint_warnings: [],
    generated_at: new Date().toISOString(),
    registry_version: "bio-reg",
    envelope: { registry_version: "bio-reg" },
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
    _meta: { prompt_version: "stress", build_stamp: "b" },
  };
}

Deno.test("item412d coverage zero orphans on the stress-shaped perfect document", () => {
  const t = runCoverageMatrix("biometric", stressShapedReport(), RECORD);
  assertEquals(t.crashed, false);
  assertEquals(
    t.orphans,
    [],
    `orphans on the stress-shaped document:\n${t.orphans.map((o) => `${o.path}: ${o.detail}`).join("\n")}`,
  );
});

Deno.test("item412d pre-fix stress shape orphans duty_findings (direction proof)", () => {
  // The shape the harness persisted BEFORE this item: no deliverables keys.
  const pre = stressShapedReport();
  for (
    const k of [
      "identifier_characterizations",
      "entity_characterization",
      "duty_findings",
      "divergence_analysis",
      "consequence_determination",
      "biometric_deliverables",
    ]
  ) delete (pre as Record<string, unknown>)[k];
  const t = runCoverageMatrix("biometric", pre, RECORD);
  assert(t.orphans.length > 0, "pre-fix shape must orphan — otherwise the test proves nothing");
  assert(
    t.orphans.some((o) => o.path.includes("duty_findings")),
    t.orphans.map((o) => o.path).join(", "),
  );
});

Deno.test("item412d stamp is item412d", () => {
  // RETARGETED 2026-08-26 (Biometric Conversion groundwork audit): the
  // item412d-2026-08-08 literal this test originally pinned was superseded
  // when the SO-6 skeleton landed on 2026-08-10 (biometric.spine.ts's own
  // BIOMETRIC_SKELETON_VERSION moved to "prose-plans-2026-08-10-item-so6" at
  // the same time), which intentionally rebumped this internal telemetry
  // stamp to "biometric-pipeline@item-so6-2026-08-10" — this test's literal
  // was simply never updated to match. Confirmed by reading the SO-6 landing
  // diff directly, not assumed. Purely an internal `_meta.internal` stamp,
  // never customer-facing, so this is a canary re-pin, not a weakened check.
  assertEquals(BIOMETRIC_PIPELINE_STAMP, "biometric-pipeline@item-so6-2026-08-10");
});
