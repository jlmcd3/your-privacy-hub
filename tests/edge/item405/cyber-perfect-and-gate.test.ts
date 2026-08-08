// ITEM 405 LEG B — CPPA cyber perfect fixture, registry/variant wiring,
// harness kickoff + write-path parity, fail-closed gate shape, output
// neutrality, serializer survival, live-parity, and audit-schedule byte
// preservation. Mirrors the item-393/401 batteries one-for-one.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CYBER_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-cyber.ts";
import {
  casesForVariant,
  GOLDEN_BY_TOOL,
  intakesForVariant,
  PERFECT_BY_TOOL,
} from "../../../supabase/functions/_shared/golden/registry.ts";
import { MESSY_BY_TOOL } from "../../../supabase/functions/_shared/golden/messy-registry.ts";
import {
  cppaCybersecurityContract,
  CYBER_CONTROL_SLUGS,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-cybersecurity.ts";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";
import {
  attachRecordComplete,
  classifyPlaceholders,
  computeRecordComplete,
  emptyAskedKeys,
  FALSE_ABSENCE_CHECK_IDS,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import {
  CYBER_PIPELINE_STAMP,
  REFERENCE_RENDER_TOKENS,
} from "../../../supabase/functions/_shared/prose/plans/cyber.spine.ts";
import { RUN_QUALITY_BATCH_SLUGS } from "../../../supabase/functions/quality-batch-orchestrator/index.ts";
import { buildSeedRow } from "../../../supabase/functions/quality-batch-orchestrator/_local/quality/seed-row.ts";
import {
  normalizeToolVariants,
  resolveToolVariant,
} from "../../../supabase/functions/_shared/quality/fixture-variant.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { CPPA_CYBER_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/cppa-cyber.ts";
import {
  applyCyberAuditSchedule,
  renderCyberAuditSchedule,
  SCHEDULE_LITERALS,
  SCHEDULE_MARKER,
} from "../../../supabase/functions/_shared/ltp/cyber-audit-schedule.ts";

const INTAKE = CYBER_PERFECT[0].intake as Record<string, any>;
const CONTROLS = INTAKE.controls as Array<Record<string, any>>;

Deno.test("fixture: exactly one perfect cyber case, clinical-diagnostics anchor", () => {
  assertEquals(CYBER_PERFECT.length, 1);
  assertEquals(CYBER_PERFECT[0].tool, "cppa-cyber");
  assertEquals(CYBER_PERFECT[0].id, "cyber-clinical-diagnostics-platform-perfect");
});

Deno.test("fixture: zero empty ASKED keys under live item380r5 semantics", () => {
  const empties = emptyAskedKeys(cppaCybersecurityContract, INTAKE);
  assertEquals(empties, [], `empty asked keys: ${empties.join(", ")}`);
});

Deno.test("fixture: validates against the live cppaCybersecurityContract", () => {
  const res = validateIntake(cppaCybersecurityContract, INTAKE);
  assert(res.ok, JSON.stringify((res as any).violations ?? []));
});

Deno.test("fixture: all 18 canonical slugs, exact, once each, no legacy aliases", () => {
  assertEquals(CONTROLS.length, 18);
  assertEquals(CONTROLS.map((c) => c.key), [...CYBER_CONTROL_SLUGS]);
  assertEquals(new Set(CONTROLS.map((c) => c.key)).size, 18);
});

Deno.test("fixture: sufficiency lint — owners, cadence and evidence on every control", () => {
  const thin: string[] = [];
  for (const c of CONTROLS) {
    const notes = String(c.notes ?? "");
    if (notes.length < 200) thin.push(`${c.key} (${notes.length} chars)`);
    assert(String(c.maturity ?? "").length > 0, `maturity unanswered: ${c.key}`);
    assert(Array.isArray(c.evidence) && c.evidence.length > 0, `evidence unanswered: ${c.key}`);
    assert(
      !c.evidence.includes("None on file"),
      `perfect record must not answer "None on file": ${c.key}`,
    );
    // Owner (a titled role), cadence, and a dated evidence artefact.
    assert(
      /(Owner|owns|owned by|Lead|Manager|Director|Head of|VP of)/.test(notes),
      `no accountable owner named: ${c.key}`,
    );
    assert(
      /(daily|nightly|weekly|fortnightly|monthly|quarterly|semi-annual|annual|continuous|every (six|three|two|twelve|\d+) (hours|days|weeks|months)|every (new|change|release|commit)|for every|pre-commit|on each|\d+-(minute|hour|day) |SLA|within \d)/i.test(notes),
      `no cadence recorded: ${c.key}`,
    );
    assert(/\b20\d{2}-\d{2}-\d{2}\b/.test(notes), `no dated evidence artefact: ${c.key}`);
  }
  assertEquals(thin, [], `thin control notes: ${thin.join(", ")}`);

  const profile = INTAKE.profile as Record<string, any>;
  assert(String(profile.audit_scope_rationale).length >= 300, "audit_scope_rationale too thin");
  assert(String(profile.prior_audit_scope).length >= 200, "prior_audit_scope too thin");
  assert(Array.isArray(profile.in_scope_frameworks) && profile.in_scope_frameworks.length >= 1);

  const blob = JSON.stringify(INTAKE);
  for (const tok of ["TBD", "TODO", "[TO COMPLETE", "[TO BE", "PLACEHOLDER", "lorem ipsum", "XXX", "N/A"]) {
    assert(!blob.toUpperCase().includes(tok.toUpperCase()), `placeholder token present: ${tok}`);
  }
});

Deno.test("fixture: carries no reference-render token (item404 fact-exempt rule)", () => {
  const blob = JSON.stringify(INTAKE).toLowerCase();
  for (const tok of REFERENCE_RENDER_TOKENS) {
    assert(!blob.includes(String(tok).toLowerCase()), `reference-render token leaked: ${tok}`);
  }
});

Deno.test("fixture: no revenue field is introduced (ITEM 204 audit-schedule truth)", () => {
  const keys = cppaCybersecurityContract.fields.map((f) => f.key).join(" ");
  assert(!/revenue/i.test(keys), "contract must not ask a revenue question");
  assert(
    !/annual gross revenue|revenue band|gross revenue/i.test(JSON.stringify(INTAKE)),
    "fixture must not smuggle a revenue answer the contract never asks",
  );
});

Deno.test("registry: PERFECT_BY_TOOL + casesForVariant wiring for cppa-cyber", () => {
  assertEquals(PERFECT_BY_TOOL["cppa-cyber"], CYBER_PERFECT);
  assertEquals(casesForVariant("cppa-cyber", "perfect"), CYBER_PERFECT);
  assertEquals(intakesForVariant("cppa-cyber", "perfect"), [INTAKE]);
  // Degraded pilot sets untouched.
  assertEquals(casesForVariant("cppa-cyber", null), GOLDEN_BY_TOOL["cppa-cyber"]);
  assertEquals(casesForVariant("cppa-cyber", "messy"), MESSY_BY_TOOL["cppa-cyber"]);
});

Deno.test("harness: cppa-cyber perfect batch is admissible end-to-end", () => {
  assert(RUN_QUALITY_BATCH_SLUGS.has("cppa-cyber"));
  const tv = normalizeToolVariants({ "cppa-cyber": "perfect" });
  assertEquals(tv, { "cppa-cyber": "perfect" });
  assertEquals(resolveToolVariant("cppa-cyber", tv, null), "perfect");
  const pins = intakesForVariant("cppa-cyber", "perfect");
  assertEquals(pins.length, 1);
  const seed = buildSeedRow("cppa-cyber", 1, 1, "00000000-0000-0000-0000-000000000000", "2026-08-08T00:00:00Z", {
    pins,
  }) as Record<string, unknown>;
  assertEquals(seed.tool, "cppa-cyber");
  assertEquals(seed.status, "pending");
  assertEquals(seed.batch_size, 1);
  assertEquals((seed.intakes as unknown[]).length, 1);
});

Deno.test("write-path parity: the persisted intake_data is the fixture, key-for-key", () => {
  // dispatchGeneration inserts the cyber intake WHOLESALE into
  // cppa_assessments as `intake_data: intake` (module "cybersecurity") — one
  // jsonb column, no column whitelist (the item383 LIA_COLS lesson does not
  // apply here). Prove both: the call site persists wholesale, and a
  // round-trip through the jsonb boundary drops or reshapes nothing.
  const src = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-quality-batch/index.ts", import.meta.url),
  );
  const cyberInserts = src.match(
    /from\("cppa_assessments"\)\.insert\(\{[^}]*module: "cybersecurity"[^}]*intake_data: intake/g,
  ) ?? [];
  assert(cyberInserts.length >= 1, "cyber insert does not persist the intake wholesale");
  assert(!/CYBER_COLS/.test(src), "unexpected column whitelist for cyber");

  const persisted = JSON.parse(JSON.stringify(INTAKE));
  assertEquals(Object.keys(persisted).sort(), Object.keys(INTAKE).sort());
  assertEquals(
    Object.keys(persisted.profile).sort(),
    Object.keys((INTAKE as any).profile).sort(),
  );
  for (let i = 0; i < 18; i++) {
    assertEquals(Object.keys(persisted.controls[i]).sort(), ["evidence", "key", "label", "maturity", "notes"]);
    assertEquals(persisted.controls[i], CONTROLS[i]);
  }
  // The contract's own shape survives the round trip.
  assertEquals(emptyAskedKeys(cppaCybersecurityContract, persisted), []);
});

Deno.test("gate: cppa-cyber carries the leg-C false-absence id list", () => {
  // ITEM 406 LEG C shipped `_shared/ltp/cyber-csc.ts`, so the empty leg-B list
  // is replaced by the real absence-class id. cy1 stays out (item403-A g1).
  assertEquals(FALSE_ABSENCE_CHECK_IDS["cppa-cyber"], ["cy2_absence_claim_vs_record"]);
});

Deno.test("gate: fail-closed shape on the perfect fixture (no coverage, no CSC)", () => {
  const t = computeRecordComplete({
    product: "cppa-cyber",
    contract: cppaCybersecurityContract,
    intake: INTAKE,
    coverage: null,
    csc: null,
  });
  assertEquals(t.value, false);
  assertEquals(t.product, "cppa-cyber");
  assertEquals(t.counts.empty_required_keys, 0);
  assert(!t.failed_conditions.includes("contract_incomplete"));
  assert(t.failed_conditions.includes("coverage_orphans"));
  assert(t.failed_conditions.includes("csc_false_absence"));
});

Deno.test("gate: a thinned record still trips contract_incomplete (both directions)", () => {
  const thin = JSON.parse(JSON.stringify(INTAKE));
  thin.controls[4].maturity = "";
  thin.profile.prior_audit_scope = "";
  const t = computeRecordComplete({
    product: "cppa-cyber",
    contract: cppaCybersecurityContract,
    intake: thin,
    coverage: { counts: { orphans: 0 }, crashed: false },
    csc: { violations: [], crashed: false },
  });
  assertEquals(t.value, false);
  assert(t.failed_conditions.includes("contract_incomplete"));
  assert(t.empty_required_keys.includes("profile.prior_audit_scope"));
});

Deno.test("output-neutrality: the gate touches only _meta.internal", () => {
  const doc: Record<string, unknown> = {
    readiness_level: "Audit-ready",
    executive_summary:
      "The programme is audit-ready under 11 CCR §§ 7121-7124 on the record the business supplied.",
    controls: [{ key: "c1_auth", status: "Implemented", finding: "Phishing-resistant authentication is enforced." }],
    information_needed: [{ question: "Confirm the auditor's engagement letter is countersigned." }],
    _meta: { internal: { cyber_pipeline_stamp: CYBER_PIPELINE_STAMP } },
  };
  const before = JSON.stringify({ ...doc, _meta: undefined });
  const t = computeRecordComplete({ product: "cppa-cyber", contract: cppaCybersecurityContract, intake: INTAKE });
  const c = classifyPlaceholders(doc, INTAKE, t.value);
  attachRecordComplete(doc, t, c);
  const after = JSON.stringify({ ...doc, _meta: undefined });
  assertEquals(after, before, "gate mutated customer-visible prose");
  assertEquals((doc._meta as any).internal.record_complete.value, false);
  assertEquals((doc._meta as any).internal.cyber_pipeline_stamp, CYBER_PIPELINE_STAMP);
});

Deno.test("serializer: cyber_pipeline_stamp + record_complete survive the whitelist", () => {
  const doc: Record<string, unknown> = {
    readiness_level: "Audit-ready",
    overall_score: 92,
    executive_summary: "The record supports an audit-ready determination.",
    _meta: { internal: { cyber_pipeline_stamp: CYBER_PIPELINE_STAMP } },
    not_a_declared_key: "must be dropped",
  };
  const t = computeRecordComplete({ product: "cppa-cyber", contract: cppaCybersecurityContract, intake: INTAKE });
  attachRecordComplete(doc, t, classifyPlaceholders(doc, INTAKE, t.value));

  const { report, telemetry } = serializeCustomerReport(doc, CPPA_CYBER_REPORT_SCHEMA);
  assert(telemetry.crashed !== true);
  const internal = (report as any)?._meta?.internal ?? {};
  assertEquals(internal.cyber_pipeline_stamp, CYBER_PIPELINE_STAMP);
  assertEquals(internal.record_complete?.product, "cppa-cyber");
  assertEquals(internal.record_complete?.value, false);
  assert(Array.isArray(internal.placeholder_classification?.items));
  assert(!("not_a_declared_key" in (report as Record<string, unknown>)));
});

Deno.test("audit-schedule: § 7121(a) corpus-pinned sentences render byte-identically", () => {
  const rendered = renderCyberAuditSchedule();
  const t = SCHEDULE_LITERALS;
  const expected = [
    `${SCHEDULE_MARKER} Under 11 CCR § 7121(a), a business must complete its first cybersecurity audit report no later than one of three cohort deadlines fixed by the regulation:`,
    `— Per § 7121${t.tier1.subdivision}, ${t.tier1.deadline}, if ${t.tier1.revenue_condition}; the audit would cover the period from ${t.tier1.audit_period}.`,
    `— Per § 7121${t.tier2.subdivision}, ${t.tier2.deadline}, if ${t.tier2.revenue_condition}; the audit would cover the period from ${t.tier2.audit_period}.`,
    `— Per § 7121${t.tier3.subdivision}, ${t.tier3.deadline}, if ${t.tier3.revenue_condition}; the audit would cover the period from ${t.tier3.audit_period}.`,
    `The customer, in consultation with qualified legal counsel, determines which tier its revenue places it in and calendars the corresponding deadline.`,
  ].join(" ");
  assertEquals(rendered, expected);
  // Full three-tier statement; the customer's tier is never computed.
  assert(rendered.includes("April 1, 2028"));
  assert(rendered.includes("April 1, 2029"));
  assert(rendered.includes("April 1, 2030"));
});

Deno.test("audit-schedule: byte-identical on the perfect fixture WITH the gate wired", () => {
  const report: Record<string, any> = { submission_summary: {} };
  const res = applyCyberAuditSchedule(report);
  assertEquals(res.emitted, true);
  const beforeGate = report.submission_summary.cybersecurity_audit_schedule as string;
  assertEquals(beforeGate, renderCyberAuditSchedule());

  const t = computeRecordComplete({ product: "cppa-cyber", contract: cppaCybersecurityContract, intake: INTAKE });
  attachRecordComplete(report, t, classifyPlaceholders(report, INTAKE, t.value));
  assertEquals(report.submission_summary.cybersecurity_audit_schedule, beforeGate);

  const { report: serialized } = serializeCustomerReport(report, CPPA_CYBER_REPORT_SCHEMA);
  assertEquals((serialized as any)?._meta?.internal?.record_complete?.product, "cppa-cyber");
});

Deno.test("live-parity: the gate call site passes the FULL persisted record, after prose gold, before the emit gate", () => {
  const src = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-cppa-cybersecurity/index.ts", import.meta.url),
  );
  const gold = src.indexOf("applyCyberProseGold(report");
  const gate = src.indexOf('product: "cppa-cyber"');
  const emit = src.indexOf("LEAK-PREV-P1 — EMIT GATE");
  const ser = src.indexOf("LEAK-PREV-P2 — SCHEMA-DRIVEN SERIALIZER");
  assert(gold > 0 && gate > 0 && emit > 0 && ser > 0, "call sites not found");
  assert(gold < gate, "gate must run AFTER item-404 cyber prose gold");
  assert(gate < emit, "gate must run BEFORE the emit gate");
  assert(emit < ser, "emit gate must precede the serializer");

  // The item385 r2 trimmed-projection lesson: the evidence passes must
  // receive the FULL persisted record, never a projection.
  const block = src.slice(Math.max(0, gate - 1600), gate + 1200);
  assert(
    /const cyberGateRecord = \(\(\(row as any\)\.intake_data \?\? \{\}\)\)/.test(block),
    "gate does not read the full persisted record (row.intake_data)",
  );
  assert(/intake: cyberGateRecord/.test(block), "computeRecordComplete not fed the persisted record");
  assert(
    /classifyPlaceholders\(\s*report as Record<string, unknown>,\s*cyberGateRecord/.test(block),
    "classifyPlaceholders not fed the persisted record",
  );
  // No trimmed projection may ever be constructed for the gate.
  assert(
    !/cyberGateRecord\s*=\s*\{\s*[a-zA-Z_]+:/.test(block),
    "a trimmed projection object is being passed to the gate",
  );
});
