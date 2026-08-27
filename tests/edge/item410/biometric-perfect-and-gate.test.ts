// ITEM 410 LEG B — biometric perfect fixture, registry/variant wiring,
// harness kickoff + write-path parity, fail-closed gate shape, output
// neutrality, serializer survival, live-parity, and reference-passage byte
// preservation with the gate wired. Mirrors the item-393/401/405 batteries.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BIOMETRIC_PERFECT } from "../../../supabase/functions/_shared/golden/biometric-perfect.ts";
import {
  casesForVariant,
  GOLDEN_BY_TOOL,
  intakesForVariant,
  PERFECT_BY_TOOL,
} from "../../../supabase/functions/_shared/golden/registry.ts";
import { MESSY_BY_TOOL } from "../../../supabase/functions/_shared/golden/messy-registry.ts";
import { biometricContract } from "../../../supabase/functions/_shared/intake-contracts/biometric.ts";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";
import {
  attachRecordComplete,
  classifyPlaceholders,
  computeRecordComplete,
  emptyAskedKeys,
  FALSE_ABSENCE_CHECK_IDS,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import {
  BIOMETRIC_PIPELINE_STAMP,
} from "../../../supabase/functions/check-biometric-compliance/_local/prose/plans/biometric.spine.ts";
import { RUN_QUALITY_BATCH_SLUGS } from "../../../supabase/functions/quality-batch-orchestrator/index.ts";
import { buildSeedRow } from "../../../supabase/functions/quality-batch-orchestrator/_local/quality/seed-row.ts";
import {
  normalizeToolVariants,
  resolveToolVariant,
} from "../../../supabase/functions/_shared/quality/fixture-variant.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { BIOMETRIC_REPORT_SCHEMA } from "../../../supabase/functions/check-biometric-compliance/_local/report-schemas/biometric.ts";
import {
  checkPassagesSurviveAssembly,
  toReferencePassages,
} from "../../../supabase/functions/_shared/prose/biometric-reference-passages.ts";
import { BIOMETRIC_DUTY_ROWS } from "../../../supabase/functions/check-biometric-compliance/_local/registry/biometric-verified-authorities.ts";

const INTAKE = BIOMETRIC_PERFECT[0].intake as Record<string, any>;
const FN_SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/check-biometric-compliance/index.ts", import.meta.url),
);

// ── fixture ────────────────────────────────────────────────────────────────

Deno.test("fixture: exactly one perfect biometric case, multistate BIPA anchor", () => {
  assertEquals(BIOMETRIC_PERFECT.length, 1);
  assertEquals(BIOMETRIC_PERFECT[0].tool, "biometric-checker");
  assertEquals(BIOMETRIC_PERFECT[0].id, "biometric-multistate-distribution-employer-perfect");
  assertEquals(INTAKE.jurisdictions[0], "Illinois, USA (BIPA)");
});

Deno.test("fixture: zero empty ASKED keys under live item380r5 semantics", () => {
  const empties = emptyAskedKeys(biometricContract, INTAKE);
  assertEquals(empties, [], `empty asked keys: ${empties.join(", ")}`);
});

Deno.test("fixture: validates against the live item408 biometricContract", () => {
  const res = validateIntake(biometricContract, INTAKE);
  assert(res.ok, JSON.stringify((res as any).violations ?? []));
});

Deno.test("fixture: every conditional block is genuinely triggered and answered", () => {
  // Practices + Texas + Washington + MHMDA blocks are on screen for this
  // record; "Other US state" is NOT selected, so `other_state_names` is not
  // asked and correctly absent.
  const triggered = biometricContract.fields.filter((f) =>
    f.required === "conditional" && f.trigger &&
    (INTAKE.jurisdictions as string[]).some((j) => f.trigger!.equals.includes(j))
  );
  assert(triggered.length >= 27, `only ${triggered.length} conditionals triggered`);
  for (const f of triggered) {
    const v = INTAKE[f.key];
    assert(v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0), `unanswered: ${f.key}`);
  }
  assert(!("other_state_names" in INTAKE), "untriggered skip-logic key must not be answered");
});

Deno.test("fixture: the four emptyIsAnswer approval fields are ANSWERED", () => {
  for (const k of ["approved_by_name", "approved_by_title", "approval_date", "next_review_due"]) {
    assert(String(INTAKE[k] ?? "").trim().length > 0, `approval field left empty: ${k}`);
  }
  assert(/^20\d{2}-\d{2}-\d{2}$/.test(INTAKE.approval_date));
  assert(/^20\d{2}-\d{2}-\d{2}$/.test(INTAKE.next_review_due));
});

Deno.test("fixture: sufficiency lint — named systems, dates, owners, cadences", () => {
  const narrative: Record<string, number> = {
    data_source_description: 300,
    release_artifact_description: 400,
    retention_schedule_text: 400,
    destruction_trigger: 250,
    security_measures_description: 400,
    disclosure_recipients: 300,
  };
  const thin: string[] = [];
  for (const [k, min] of Object.entries(narrative)) {
    const s = String(INTAKE[k] ?? "");
    if (s.length < min) thin.push(`${k} (${s.length} < ${min})`);
  }
  assertEquals(thin, [], `thin answers: ${thin.join(", ")}`);

  // Dated facts in the policy, consent, retention, security surfaces.
  for (const k of ["release_artifact_description", "retention_schedule_text", "security_measures_description", "disclosure_recipients"]) {
    assert(/\b(20\d{2})\b/.test(String(INTAKE[k])), `no dated fact: ${k}`);
  }
  // Named accountable owners and cadences on the security answer.
  assert(/(Director|Manager|Vice President|Head of|Lead)/.test(INTAKE.security_measures_description), "no named owner");
  assert(/(nightly|monthly|quarterly|annual|semi-annual)/i.test(INTAKE.security_measures_description), "no cadence");
  assert(/(nightly|monthly|30 days|three years)/i.test(INTAKE.retention_schedule_text), "retention has no schedule");

  const blob = JSON.stringify(INTAKE).toUpperCase();
  for (const tok of ["TBD", "TODO", "[TO COMPLETE", "[TO BE", "PLACEHOLDER", "LOREM IPSUM", "XXX", "N/A", "NOT KNOWN"]) {
    assert(!blob.includes(tok), `placeholder / non-answer token present: ${tok}`);
  }
});

// RETIRED 2026-08-26 (Biometric Conversion groundwork audit): this test
// asserted the golden fixture carries none of the "walked render" tokens
// (`BIOMETRIC_REFERENCE_RENDER_IDS`, two `quality_run_documents` row ids used
// as an architecture/register reference under the pre-SO-6 item409 idiom).
// The 2026-08-19 SO-6 rewrite of biometric.spine.ts (commit fe6f68321)
// deliberately retired that whole idiom along with `REFERENCE_RENDER_TOKENS`
// itself — the concept has no successor and no live reference anywhere in
// the codebase to test against. The import was left dangling, which broke
// this entire test file's module load (confirmed via `deno check`/`deno
// test`, blocking ALL of item410's other — still-relevant — coverage:
// registry wiring, fail-closed gate, serializer survival, live parity).
// Removed here rather than resurrecting a dead export; every other item410
// test in this file is untouched and now runs again.

// ── registry + harness ─────────────────────────────────────────────────────

Deno.test("registry: PERFECT_BY_TOOL + casesForVariant wiring for biometric-checker", () => {
  assertEquals(PERFECT_BY_TOOL["biometric-checker"], BIOMETRIC_PERFECT);
  assertEquals(casesForVariant("biometric-checker", "perfect"), BIOMETRIC_PERFECT);
  assertEquals(intakesForVariant("biometric-checker", "perfect"), [INTAKE]);
  // Degraded pilot sets untouched.
  assertEquals(casesForVariant("biometric-checker", null), GOLDEN_BY_TOOL["biometric-checker"]);
  assertEquals(casesForVariant("biometric-checker", "messy"), MESSY_BY_TOOL["biometric-checker"]);
  assert(MESSY_BY_TOOL["biometric-checker"].length > 0);
});

Deno.test("harness: biometric-checker perfect batch is admissible end-to-end", () => {
  assert(RUN_QUALITY_BATCH_SLUGS.has("biometric-checker"));
  const tv = normalizeToolVariants({ "biometric-checker": "perfect" });
  assertEquals(tv, { "biometric-checker": "perfect" });
  assertEquals(resolveToolVariant("biometric-checker", tv, null), "perfect");
  const pins = intakesForVariant("biometric-checker", "perfect");
  assertEquals(pins.length, 1);
  const seed = buildSeedRow(
    "biometric-checker", 1, 1, "00000000-0000-0000-0000-000000000000", "2026-08-08T00:00:00Z",
    { pins },
  ) as Record<string, unknown>;
  assertEquals(seed.tool, "biometric-checker");
  assertEquals(seed.status, "pending");
  assertEquals(seed.batch_size, 1);
  assertEquals((seed.intakes as unknown[]).length, 1);
});

Deno.test("write-path parity: the record the function analyses is the invocation body", () => {
  // dispatchGeneration does BOTH: it inserts the full intake as
  // `intake_data` jsonb into biometric_assessments, AND spreads the intake
  // into the invocation payload. check-biometric-compliance reads
  // `await req.json()` as `body` and never re-reads the seeded row — and it
  // OVERWRITES `intake_data` with `body` on both persist paths. So the
  // invocation payload is the record, and the seeded row is only a shell.
  const qb = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-quality-batch/index.ts", import.meta.url),
  );
  assert(
    /from\("biometric_assessments"\)\.insert\(\{[^}]*intake_data: intake/.test(qb),
    "biometric branch does not persist the intake wholesale",
  );
  assert(
    /invokeFn\("check-biometric-compliance", \{ \.\.\.intake, assessment_id: rec\.id, user_id: userId, stress_run: true \}\)/
      .test(qb),
    "biometric branch does not spread the intake into the invocation payload",
  );
  assert(!/BIOMETRIC_COLS/.test(qb), "unexpected column whitelist for biometric");
  // The function reads the body, not the row.
  assert(/const body = \(await req\.json\(\)\) as Body;/.test(FN_SRC));
  assert(!/from\("biometric_assessments"\)\s*\n?\s*\.select/.test(FN_SRC), "function re-reads the seeded row");
  assert(FN_SRC.includes("intake_data: body"), "function does not persist the body as the record");

  // Contract-shape parity: nothing between fixture and analysed record is
  // dropped or reshaped by the spread + jsonb round trip.
  const payload = JSON.parse(JSON.stringify({
    ...INTAKE, assessment_id: "00000000-0000-0000-0000-000000000001",
    user_id: "00000000-0000-0000-0000-000000000000", stress_run: true,
  }));
  for (const f of biometricContract.fields) {
    if (!(f.key in INTAKE)) continue;
    assertEquals(payload[f.key], INTAKE[f.key], `key reshaped through the write path: ${f.key}`);
  }
  assertEquals(emptyAskedKeys(biometricContract, payload), []);
  // ...and through the jsonb column too, for the seeded row.
  assertEquals(emptyAskedKeys(biometricContract, JSON.parse(JSON.stringify(INTAKE))), []);
});

// ── gate ───────────────────────────────────────────────────────────────────

// ITEM 411 LEG C shipped the biometric CSC pass, so the leg-B placeholder
// (an EMPTY list) is retired: the gate now counts UNREPAIRED b2 violations.
Deno.test("gate: biometric counts the CSC absence class from leg C", () => {
  assertEquals(FALSE_ABSENCE_CHECK_IDS["biometric"], ["b2_absence_claim_vs_record"]);
});


Deno.test("gate: fail-closed shape on the perfect fixture (no coverage, no CSC)", () => {
  const t = computeRecordComplete({
    product: "biometric",
    contract: biometricContract,
    intake: INTAKE,
    coverage: null,
    csc: null,
  });
  assertEquals(t.value, false);
  assertEquals(t.product, "biometric");
  assertEquals(t.counts.empty_required_keys, 0);
  assert(!t.failed_conditions.includes("contract_incomplete"));
  assert(t.failed_conditions.includes("coverage_orphans"));
  assert(t.failed_conditions.includes("csc_false_absence"));
});

Deno.test("gate: a thinned record trips contract_incomplete (both directions)", () => {
  const full = computeRecordComplete({
    product: "biometric", contract: biometricContract, intake: INTAKE,
    coverage: { counts: { orphans: 0 }, crashed: false },
    csc: { violations: [], crashed: false },
  });
  assertEquals(full.value, true, `unexpected failures: ${full.failed_conditions.join(",")}`);

  const thin = JSON.parse(JSON.stringify(INTAKE));
  thin.retention_schedule_text = "";
  thin.tx_ai_training_use = "";
  const t = computeRecordComplete({
    product: "biometric", contract: biometricContract, intake: thin,
    coverage: { counts: { orphans: 0 }, crashed: false },
    csc: { violations: [], crashed: false },
  });
  assertEquals(t.value, false);
  assert(t.failed_conditions.includes("contract_incomplete"));
  assert(t.empty_required_keys.includes("retention_schedule_text"));
  assert(t.empty_required_keys.includes("tx_ai_training_use"));
});

Deno.test("output-neutrality: the gate touches only _meta.internal", () => {
  const doc: Record<string, unknown> = {
    entity_characterization: "Cascade Ridge Logistics Group, Inc. is a private employer collecting palm-vein templates.",
    duty_findings: [{ duty: "740 ILCS 14/15(b)", finding: "The written release satisfies the release requirement." }],
    information_needed: [{ question: "Confirm the 2026 penetration-test report is countersigned." }],
    _meta: { internal: { biometric_pipeline_stamp: BIOMETRIC_PIPELINE_STAMP } },
  };
  const before = JSON.stringify({ ...doc, _meta: undefined });
  const t = computeRecordComplete({ product: "biometric", contract: biometricContract, intake: INTAKE });
  const c = classifyPlaceholders(doc, INTAKE, t.value);
  attachRecordComplete(doc, t, c);
  const after = JSON.stringify({ ...doc, _meta: undefined });
  assertEquals(after, before, "gate mutated customer-visible prose");
  assertEquals((doc._meta as any).internal.record_complete.value, false);
  assertEquals((doc._meta as any).internal.biometric_pipeline_stamp, BIOMETRIC_PIPELINE_STAMP);
});

Deno.test("serializer: biometric_pipeline_stamp + record_complete survive the whitelist", () => {
  const doc: Record<string, unknown> = {
    entity_characterization: "A private employer, not a governmental body.",
    duty_findings: [{ duty: "740 ILCS 14/15(a)", finding: "A published retention schedule is in force." }],
    _meta: { internal: { biometric_pipeline_stamp: BIOMETRIC_PIPELINE_STAMP } },
    not_a_declared_key: "must be dropped",
  };
  const t = computeRecordComplete({ product: "biometric", contract: biometricContract, intake: INTAKE });
  attachRecordComplete(doc, t, classifyPlaceholders(doc, INTAKE, t.value));

  const { report, telemetry } = serializeCustomerReport(doc, BIOMETRIC_REPORT_SCHEMA);
  assert(telemetry.crashed !== true);
  const internal = (report as any)?._meta?.internal ?? {};
  assertEquals(internal.biometric_pipeline_stamp, BIOMETRIC_PIPELINE_STAMP);
  assertEquals(internal.record_complete?.product, "biometric");
  assertEquals(internal.record_complete?.value, false);
  assert(Array.isArray(internal.placeholder_classification?.items));
  assert(!("not_a_declared_key" in (report as Record<string, unknown>)));
});

Deno.test("reference passages: byte-identical with the gate wired", () => {
  const passages = toReferencePassages(BIOMETRIC_DUTY_ROWS);
  assert(passages.length > 0);
  const assembled = passages.map((p) => p.bytes).join("\n\n");
  const report: Record<string, unknown> = { duty_findings: passages.map((p) => ({ duty: p.citation, quoted: p.bytes })) };
  const t = computeRecordComplete({ product: "biometric", contract: biometricContract, intake: INTAKE });
  attachRecordComplete(report, t, classifyPlaceholders(report, INTAKE, t.value));
  assertEquals(checkPassagesSurviveAssembly(assembled, passages), []);
  assertEquals(
    (report.duty_findings as any[]).map((d) => d.quoted),
    passages.map((p) => p.bytes),
    "the gate mutated a statutory passage",
  );
});

// ── live parity ────────────────────────────────────────────────────────────

Deno.test("live-parity: gate call site passes the FULL record, after prose gold + R11, before the serializer", () => {
  const gold = FN_SRC.indexOf("applyBiometricProseGold(");
  const r11 = FN_SRC.indexOf("biometric_r11_lint");
  // Anchor on the gate's own marker: `product: "biometric"` also appears at
  // the item369 frame-substitution call site above.
  const gateMarker = FN_SRC.indexOf("ITEM 410 LEG B — RECORD-COMPLETE GATE");
  const gate = FN_SRC.indexOf('product: "biometric",', gateMarker);
  const ser = FN_SRC.indexOf("LEAK-PREV-P2 — single finalization point");
  assert(gold > 0 && r11 > 0 && gateMarker > 0 && gate > 0 && ser > 0, "call sites not found");
  assert(gold < gate, "gate must run AFTER item409 biometric prose gold");
  assert(r11 < gate, "gate must run AFTER the R11 assembled-prose lint");
  assert(gate < ser, "gate must run BEFORE the LEAK-PREV-P2 serializer");

  const block = FN_SRC.slice(Math.max(0, gate - 1800), gate + 1400);
  assert(
    /const bioGateRecord = \(\(body \?\? \{\}\) as unknown\) as Record<string, unknown>;/.test(block),
    "gate does not read the full record (the request body)",
  );
  assert(/intake: bioGateRecord/.test(block), "computeRecordComplete not fed the record");
  assert(
    /classifyPlaceholders\(\s*report_data as Record<string, unknown>,\s*bioGateRecord/.test(block),
    "classifyPlaceholders not fed the record",
  );
  // No trimmed projection may ever be constructed for the gate.
  assert(
    !/bioGateRecord\s*=\s*\{\s*[a-zA-Z_]+:/.test(block),
    "a trimmed projection object is being passed to the gate",
  );
  assert(/contract: biometricContract/.test(block), "gate not fed the item408 contract");
});
