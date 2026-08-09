// ITEM 415 LEG B — IR PERFECT FIXTURE, HARNESS WIRING AND THE FAIL-CLOSED
// RECORD-COMPLETE GATE.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { IR_PERFECT } from "../../../supabase/functions/_shared/golden/ir-perfect.ts";
import {
  casesForVariant,
  GOLDEN_BY_TOOL,
  intakesForVariant,
  PERFECT_BY_TOOL,
} from "../../../supabase/functions/_shared/golden/registry.ts";
import { MESSY_BY_TOOL } from "../../../supabase/functions/_shared/golden/messy-registry.ts";
import { irPlaybookContract } from "../../../supabase/functions/_shared/intake-contracts/ir-playbook.ts";
import {
  computeRecordComplete,
  emptyAskedKeys,
  FALSE_ABSENCE_CHECK_IDS,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import {
  irCscPlaceholder,
  runIrFinalizeBattery,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-finalize.ts";
import {
  IR_PIPELINE_STAMP,
  REFERENCE_RENDER_TOKENS,
} from "../../../supabase/functions/generate-ir-playbook/_local/prose/ir.spine.ts";
import {
  buildStandingPlaybook,
  FIRST_HOUR_ITEMS,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/standing-playbook.ts";
import { buildIncidentWorksheet } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/incident-worksheet.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { IR_PLAYBOOK_REPORT_SCHEMA } from "../../../supabase/functions/generate-ir-playbook/_local/report-schemas/ir-playbook.ts";

const PERFECT = IR_PERFECT[0].intake as Record<string, unknown>;

/** The record the function analyses: index.ts L647 merges the seeded row's
 *  `intake_data` into `body` and adds only the invocation keys. */
function asAnalysedRecord(intake: Record<string, unknown>): Record<string, unknown> {
  return { ...intake, assessment_id: "00000000-0000-4000-8000-000000000001", user_id: "00000000-0000-4000-8000-000000000002" };
}

function assemble(intake: Record<string, unknown>) {
  const report: Record<string, unknown> = {
    standing_playbook: buildStandingPlaybook(intake),
    incident_worksheet: buildIncidentWorksheet(String(intake.organizationName ?? "")),
    generated_at: "2026-08-09T00:00:00.000Z",
  };
  return runIrFinalizeBattery(report, intake);
}

// ── 1. THE FIXTURE ──────────────────────────────────────────────────────────

Deno.test("item415: IR_PERFECT leaves zero empty ASKED keys under live semantics", () => {
  const empties = emptyAskedKeys(irPlaybookContract, asAnalysedRecord(PERFECT));
  assertEquals(empties, [], `empty asked keys: ${empties.join(", ")}`);
});

Deno.test("item415: IR_PERFECT answers every non-system contract key", () => {
  for (const f of irPlaybookContract.fields) {
    assert(f.key in PERFECT, `contract key never answered: ${f.key}`);
  }
});

Deno.test("item415: IR_PERFECT sufficiency lint — no vacuous answers", () => {
  const VACUOUS = /^(n\/?a|none|unknown|tbd|to be confirmed|yes|no|various|other)\.?$/i;
  for (const [k, v] of Object.entries(PERFECT)) {
    if (typeof v === "boolean") continue;
    const leaves: string[] = [];
    const walk = (n: unknown) => {
      if (typeof n === "string") leaves.push(n);
      else if (Array.isArray(n)) n.forEach(walk);
      else if (n && typeof n === "object") Object.values(n).forEach(walk);
    };
    walk(v);
    assert(leaves.length > 0, `${k} carries no text`);
    for (const s of leaves) {
      assert(s.trim().length > 0, `${k} carries a blank string`);
      // Enum answers are short by construction; free-text answers are not.
      const isEnumish = (irPlaybookContract.fields.find((f) => f.key === k)?.options ?? []).includes(s as never);
      const isId = FIRST_HOUR_ITEMS.some((i) => i.id === s);
      if (!isEnumish && !isId) {
        assert(!VACUOUS.test(s.trim()), `${k} carries a vacuous answer: "${s}"`);
        assert(s.trim().length >= 8, `${k} carries a stub answer: "${s}"`);
      }
    }
  }
});

Deno.test("item415: IR_PERFECT matches no REFERENCE_RENDER_TOKENS", () => {
  const blob = JSON.stringify(PERFECT);
  for (const tok of REFERENCE_RENDER_TOKENS) {
    assert(!blob.includes(tok), `fixture seeds a walked-render token: ${tok}`);
  }
});

Deno.test("item415: the legacy IR goldens are the degraded pilot source and are untouched", () => {
  const legacy = GOLDEN_BY_TOOL["ir-playbook"] ?? [];
  assert(legacy.length > 0, "legacy golden set disappeared");
  const STANDING_KEYS = ["activationCriteria", "severityMatrix", "responseTeamRoster", "firstHourConfirmations", "nextTabletopDate"];
  for (const c of legacy) {
    for (const k of STANDING_KEYS) {
      assert(!(k in c.intake), `legacy golden ${c.id} unexpectedly answers ${k}`);
    }
    assert(emptyAskedKeys(irPlaybookContract, c.intake).length > 0, `legacy golden ${c.id} is not degraded`);
  }
});

// ── 2. REGISTRY + VARIANT WIRING ────────────────────────────────────────────

Deno.test("item415: PERFECT_BY_TOOL['ir-playbook'] resolves through casesForVariant", () => {
  assertEquals(PERFECT_BY_TOOL["ir-playbook"], IR_PERFECT);
  assertEquals(casesForVariant("ir-playbook", "perfect"), IR_PERFECT);
  assertEquals(intakesForVariant("ir-playbook", "perfect").length, 1);
  // null stays legacy; messy stays loudly empty.
  assertEquals(casesForVariant("ir-playbook", null), GOLDEN_BY_TOOL["ir-playbook"]);
  assertEquals(MESSY_BY_TOOL["ir-playbook"] ?? [], []);
  assertEquals(casesForVariant("ir-playbook", "messy"), []);
});

Deno.test("item415: no other tool's variant resolution moved", () => {
  for (const tool of ["dpia", "cppa-risk", "lia", "cppa-admt", "governance", "cppa-cyber", "biometric-checker"]) {
    assertEquals(casesForVariant(tool, "perfect"), PERFECT_BY_TOOL[tool]);
  }
});

// ── WRITE-PATH PARITY (the 410 lesson) ──────────────────────────────────────

Deno.test("item415: write-path parity — nothing between the fixture and the analysed record drops or reshapes a key", () => {
  // dispatchGeneration (run-quality-batch L1423-1427) inserts the WHOLE intake
  // into `ir_playbooks.intake_data` with no column projection, then invokes
  // with { assessment_id, user_id } only. generate-ir-playbook (index.ts
  // L632-647) re-selects the row and merges: body = { ...intake_data, ...body }.
  const seeded = { user_id: "u", status: "pending", intake_data: PERFECT, organization_name: PERFECT.organizationName };
  const body = { ...(seeded.intake_data as Record<string, unknown>), assessment_id: "a", user_id: "u" };
  for (const [k, v] of Object.entries(PERFECT)) {
    assert(k in body, `key dropped on the write path: ${k}`);
    assertEquals(JSON.stringify(body[k]), JSON.stringify(v), `key reshaped on the write path: ${k}`);
  }
  // And the merge order cannot let an invocation key shadow a contract key.
  const contractKeys = new Set(irPlaybookContract.fields.map((f) => f.key));
  for (const k of ["assessment_id", "user_id"]) assert(!contractKeys.has(k), `invocation key collides with contract key: ${k}`);
});

Deno.test("item415: both artifacts ride the one persisted report the grader reads", () => {
  const { report } = assemble(asAnalysedRecord(PERFECT));
  assert(report.standing_playbook, "standing_playbook missing from report_data");
  assert(report.incident_worksheet, "incident_worksheet missing from report_data");
  const { report: serialized } = serializeCustomerReport(report as never, IR_PLAYBOOK_REPORT_SCHEMA);
  const s = serialized as Record<string, unknown>;
  assert(s.standing_playbook, "standing_playbook lost in serialization");
  assert(s.incident_worksheet, "incident_worksheet lost in serialization");
});

// ── 3. THE GATE ─────────────────────────────────────────────────────────────

Deno.test("item415: FALSE_ABSENCE_CHECK_IDS['ir-playbook'] is empty until leg C", () => {
  assertEquals(FALSE_ABSENCE_CHECK_IDS["ir-playbook"], []);
});

Deno.test("item415: the CSC placeholder is present-but-empty and honest about it", () => {
  const p = irCscPlaceholder();
  assertEquals(p.placeholder, true);
  assertEquals(p.checks_run, 0);
  assertEquals(p.crashed, false);
  assertEquals(p.violations.length, 0);
});

Deno.test("item415: gate fail-closed shape — absent evidence fails", () => {
  const t = computeRecordComplete({
    product: "ir-playbook",
    contract: irPlaybookContract,
    intake: asAnalysedRecord(PERFECT),
    coverage: null,
    csc: null,
  });
  assertEquals(t.value, false);
  assert(t.failed_conditions.includes("coverage_orphans"));
  assert(t.failed_conditions.includes("csc_false_absence"));
});

Deno.test("item415: gate — a crashed coverage pass fails closed", () => {
  const t = computeRecordComplete({
    product: "ir-playbook",
    contract: irPlaybookContract,
    intake: asAnalysedRecord(PERFECT),
    coverage: { counts: { orphans: 0 }, crashed: true },
    csc: irCscPlaceholder() as never,
  });
  assertEquals(t.value, false);
  assert(t.failed_conditions.includes("coverage_orphans"));
});

Deno.test("item415: contract_incomplete both directions — perfect TRUE, thinned FALSE", () => {
  const perfect = assemble(asAnalysedRecord(PERFECT)).record_complete!;
  assertEquals(perfect.failed_conditions, [], `perfect record failed: ${perfect.failed_conditions.join(", ")}`);
  assertEquals(perfect.value, true);
  assertEquals(perfect.counts.empty_required_keys, 0);

  const thinned = { ...asAnalysedRecord(PERFECT) } as Record<string, unknown>;
  delete thinned.activationCriteria;
  delete thinned.responseTeamRoster;
  const out = assemble(thinned).record_complete!;
  assertEquals(out.value, false);
  assert(out.failed_conditions.includes("contract_incomplete"));
  assert(out.empty_required_keys.includes("activationCriteria"));
  assert(out.empty_required_keys.includes("responseTeamRoster"));
});

// ── LIVE-PARITY (the 412-B lesson) ──────────────────────────────────────────

Deno.test("item415: live-parity — the gate reads the same record the harness produces", () => {
  // Invoke the battery exactly the way index.ts does: the merged `body`.
  const harnessRecord = asAnalysedRecord(intakesForVariant("ir-playbook", "perfect")[0] as Record<string, unknown>);
  const out = assemble(harnessRecord);
  assertEquals(out.record_complete!.value, true);
  assertEquals(out.record_complete!.product, "ir-playbook");
});

// ── 3b. OUTPUT NEUTRALITY ───────────────────────────────────────────────────

Deno.test("item415: ZERO customer-visible change — both artifacts byte-identical with and without the gate", () => {
  for (const intake of [asAnalysedRecord(PERFECT), { ...asAnalysedRecord(PERFECT), activationCriteria: [] }]) {
    // The gate writes only into `_meta.internal`; strip it and compare.
    const withGate = assemble(intake).report;
    const bare: Record<string, unknown> = {
      standing_playbook: buildStandingPlaybook(intake),
      incident_worksheet: buildIncidentWorksheet(String(intake.organizationName ?? "")),
      generated_at: "2026-08-09T00:00:00.000Z",
    };
    // Re-run the item414 battery legs only (gold + coverage + lint) by
    // comparing the artifacts, which no leg of leg B is permitted to touch.
    const ref = runIrFinalizeBattery(bare, intake).report;
    for (const artifact of ["standing_playbook", "incident_worksheet"] as const) {
      assertEquals(
        JSON.stringify(withGate[artifact]),
        JSON.stringify(ref[artifact]),
        `${artifact} changed under the leg-B gate`,
      );
    }
  }
});

// ── 4. SERIALIZER SURVIVAL ──────────────────────────────────────────────────

Deno.test("item415: stamp AND record_complete both survive the P2 serializer", () => {
  const { report } = assemble(asAnalysedRecord(PERFECT));
  const { report: serialized, telemetry } = serializeCustomerReport(report as never, IR_PLAYBOOK_REPORT_SCHEMA);
  assertEquals(telemetry.crashed, false);
  const internal = ((serialized as Record<string, unknown>)._meta as Record<string, unknown>)
    ?.internal as Record<string, unknown>;
  assertEquals(internal?.ir_pipeline_stamp, IR_PIPELINE_STAMP);
  const rc = internal?.record_complete as Record<string, unknown>;
  assert(rc, "record_complete lost in serialization");
  assertEquals(rc.product, "ir-playbook");
  assertEquals(rc.value, true);
  assert(internal?.ir_csc, "ir_csc placeholder lost in serialization");
});
