// ITEM 412-B — THE BATTERY MUST RUN ON EVERY PERSIST PATH.
//
// DEFECT REPRODUCED BY THESE TESTS. Perfect pilot batch
// 8d82864e-dc7b-4abf-887a-697eeeeed95c, run d6bc7d9c-1c06-45c6-bd7e-779e4be42d18,
// document quality_run_documents.id = 1b608e10-e0f9-49e3-a7a8-d1a6b02f03f6.
// The harness invokes the function with `{ ...intake, assessment_id, user_id,
// stress_run: true }` (run-quality-batch/index.ts:1429-1433). That payload
// short-circuits into `runStressBiometric`, which built and PERSISTED its own
// document without ever reaching the item410/411/412 battery wired inline in
// the streaming handler. `_meta.internal` therefore carried only
// `biometric_pipeline_stamp` and `biometric_prose_gold_version` — the two
// values that attach inside `stampBiometricPipeline` / `repairBiometricProse`,
// which the stress path DOES call.
//
// DIRECTIONALITY. Every assertion below is written against the SOURCE of
// check-biometric-compliance/index.ts, because the seam is a wiring fact, not a
// pure-function fact. Run against the pre-fix source these tests fail:
//   - "battery declared exactly once"        → 0 declarations (block was inline)
//   - "every persist site is preceded…"      → the two stress-path writes fail
//   - "the harness payload path takes…"      → no seam call in runStressBiometric
//
// Identities:
//   item412b seam the battery is declared exactly once
//   item412b seam every biometric_assessments persist site is preceded by the battery
//   item412b seam the harness stress_run payload path takes the seam
//   item412b seam the battery is not duplicated per path
//   item412b parity a stress-shaped document reaches the full telemetry set
//   item412b defect a the BIPA retention trigger is repaired deterministically
//   item412b defect a the misstated trigger is in the watchlist vocabulary
//   item412b defect a the repair never touches a reference passage
//   item412b stamp the item412b pins

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BIOMETRIC_PROSE_GOLD_VERSION,
  detectStatutoryTriggerDefects,
  repairBiometricProse,
  repairStatutoryTriggers,
} from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-prose-gold.ts";
import { BIOMETRIC_PIPELINE_STAMP } from "../../../supabase/functions/check-biometric-compliance/_local/prose/plans/biometric.spine.ts";
import { BIOMETRIC_WATCH_CLASSES } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-refinement-config.ts";

const SRC_URL = new URL(
  "../../../supabase/functions/check-biometric-compliance/index.ts",
  import.meta.url,
);
const SRC = await Deno.readTextFile(SRC_URL);

const SEAM_CALL = "runBiometricFinalizeBattery(";

Deno.test("item412b seam the battery is declared exactly once", () => {
  const decls = SRC.match(/export async function runBiometricFinalizeBattery\(/g) ?? [];
  assertEquals(decls.length, 1, "the battery must live in exactly one function");
});

Deno.test("item412b seam every biometric_assessments persist site is preceded by the battery", () => {
  // Every write to the customer row, in source order.
  const writes: number[] = [];
  const re = /from\("biometric_assessments"\)\s*\.?\s*\n?\s*\.(update|insert)\(/g;
  for (let m = re.exec(SRC); m; m = re.exec(SRC)) writes.push(m.index);
  assert(writes.length >= 4, `expected the four persist sites, saw ${writes.length}`);

  const seams: number[] = [];
  const sre = new RegExp(SEAM_CALL.replace("(", "\\("), "g");
  for (let m = sre.exec(SRC); m; m = sre.exec(SRC)) seams.push(m.index);
  // one declaration + one call per persist path
  assert(seams.length >= 3, `expected the declaration plus a call per path, saw ${seams.length}`);

  for (const w of writes) {
    const before = seams.filter((s) => s < w);
    assert(
      before.length > 0,
      `a persist at offset ${w} has no finalize seam ahead of it:\n` +
        SRC.slice(Math.max(0, w - 200), w + 80),
    );
  }
});

Deno.test("item412b seam the harness stress_run payload path takes the seam", () => {
  // Isolate runStressBiometric — the function the `{ ...intake, assessment_id,
  // user_id, stress_run: true }` payload short-circuits into.
  const start = SRC.indexOf("async function runStressBiometric(");
  assert(start > 0, "runStressBiometric not found");
  const end = SRC.indexOf("export async function runBiometricFinalizeBattery(");
  assert(end > start, "unexpected source order");
  const stressFn = SRC.slice(start, end);

  assert(
    stressFn.includes(SEAM_CALL),
    "the stress path must call the finalize seam — this is the pilot defect",
  );
  // …and it must call it BEFORE its own writes.
  const seamAt = stressFn.indexOf(SEAM_CALL);
  const writeAt = stressFn.indexOf('from("biometric_assessments")');
  assert(writeAt > 0, "the stress path writes the customer row");
  assert(seamAt < writeAt, "the seam must precede the stress-path persist");
});

Deno.test("item412b seam the battery is not duplicated per path", () => {
  // The tell-tales of the battery body must each appear exactly once in the
  // file: one CSC import, one coverage attach, one gate compute, one refinement
  // invocation. Duplication per path is the failure mode LAW 3 forbids.
  const once = [
    "attachBiometricCsc(",
    'attachCoverage(report_data as Record<string, unknown>, "biometric_coverage"',
    "computeRecordComplete({",
    "runBiometricRefinement(",
  ];
  for (const needle of once) {
    const n = SRC.split(needle).length - 1;
    assertEquals(n, 1, `${needle} appears ${n}× — the battery was duplicated`);
  }
});

Deno.test("item412b parity a stress-shaped document reaches the full telemetry set", () => {
  // The stress path's persisted shape as captured from the pilot document.
  // Post-fix this object is what the seam receives; the seam's passes attach
  // their telemetry to `_meta.internal`. Here we assert the seam's CONTRACT:
  // the four telemetry addresses the pilot lacked are the ones the battery
  // writes, and each is written by a pass named in the single seam body.
  const seamStart = SRC.indexOf("export async function runBiometricFinalizeBattery(");
  const seam = SRC.slice(seamStart);
  for (const address of [
    "biometric_refinement",
    "_refinement",
    "biometric_csc",
    "biometric_coverage",
    "attachRecordComplete(",
  ]) {
    assert(seam.includes(address), `the seam must write ${address}`);
  }
});

// ── defect (a): the misstated BIPA retention trigger ───────────────────────

Deno.test("item412b defect a the BIPA retention trigger is repaired deterministically", () => {
  const bad =
    "Destroy biometric data when purpose expires or within 3 years of collection, whichever is first.";
  const fixed = repairStatutoryTriggers(bad);
  assert(
    fixed.includes("last interaction"),
    `trigger not repaired: ${fixed}`,
  );
  assert(!/3 years of collection/i.test(fixed), fixed);
  // and it rides the whole-document repair, on every path
  assert(repairBiometricProse(bad, []).includes("last interaction"));
});

Deno.test("item412b defect a the misstated trigger is in the watchlist vocabulary", () => {
  const w2 = BIOMETRIC_WATCH_CLASSES.find((w) => w.id === "W2");
  assert(w2, "W2 must exist");
  assert(
    /last interaction/i.test(JSON.stringify(w2)),
    "W2 must name the last-interaction measure",
  );
  assertEquals(
    detectStatutoryTriggerDefects("destroyed within 3 years of collection"),
    ["bipa_15a_last_interaction"],
  );
  assertEquals(detectStatutoryTriggerDefects("no misstatement here"), []);
});

Deno.test("item412b defect a the repair never touches a reference passage", () => {
  // A reference passage carrying the statutory words is span-excluded.
  const passage = {
    id: "bipa_15a",
    bytes:
      "within 3 years of the individual's last interaction with the private entity, whichever occurs first",
  } as unknown as Parameters<typeof repairBiometricProse>[1][number];
  const doc = `Quoted: ${passage.bytes}\n\nOurs: destroy within 3 years of collection.`;
  const out = repairBiometricProse(doc, [passage]);
  assert(out.includes(passage.bytes), "the passage must survive byte-identical");
  assert(!/3 years of collection/i.test(out), out);
});

Deno.test("item412b stamp the item412b pins", () => {
  assertEquals(BIOMETRIC_PIPELINE_STAMP, "biometric-pipeline@item412d-2026-08-08");
  assertEquals(BIOMETRIC_PROSE_GOLD_VERSION, "biometric-prose-gold-2026-08-08-item412b");
});
