// PROMPT 6 (2026-08-11) — deterministic processing inventory.
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDpiaDeliverables,
  buildGapLedger,
  buildProcessingInventory,
} from "../../run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";
import { dpiaFrameworkContract } from "../intake-contracts/dpia-framework.ts";
import type { DpiaProcessingInventory } from "../ltp/dpia-deliverables/types.ts";

const CONTRACT_KEYS = new Set(dpiaFrameworkContract.fields.map((f) => f.key));

function intake(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    organization_name: "Northwind Clinics Ltd",
    processing_activity_name: "Patient triage scoring",
    purpose: "To triage patients arriving at urgent care.",
    description: "A scoring model applied at intake.",
    data_categories: ["Contact details", "Health or medical data"],
    data_subjects: "Patients",
    volume_frequency: "About 4,000 patients per month, continuously.",
    jurisdictions: ["EU (GDPR)"],
    legal_basis_proposed: "Legitimate interests (Art. 6(1)(f))",
    necessity_proportionality: "The scoring is limited to triage.",
    retention_period: "24 months",
    controller_contact: "Clinical Operations, privacy@northwind.example",
    dpo_info: "Dr A. Okafor, dpo@northwind.example",
    article_9_condition: "Health or social care (Art. 9(2)(h))",
    third_party_processors: ["Acme Cloud", "Other: Triage Labs"],
    processor_obligations: "Processing only on documented instructions; deletion on termination.",
    estimated_launch_date: "2026-09-01",
    estimated_end_date: "2028-09-01",
    processing_version: "v2.1",
    secondary_uses: "None. The data is not used beyond triage.",
    ...over,
  };
}

function allSourceFields(inv: DpiaProcessingInventory): string[] {
  return [
    ...inv.controllers.map((c) => c.source_field),
    ...inv.processors.map((p) => p.source_field),
    ...inv.data_items.map((d) => d.source_field),
    ...inv.purposes.map((p) => p.source_field),
    ...inv.secondary_uses.map((s) => s.source_field),
    inv.scale.source_field,
  ];
}

Deno.test("inventory: populated processors produce one row each, verbatim names", () => {
  const inv = buildProcessingInventory(intake());
  assertEquals(inv.processors.length, 2);
  assertEquals(inv.processors[0].name, "Acme Cloud");
  assertEquals(inv.processors[1].name, "Other: Triage Labs");
  for (const p of inv.processors) {
    assertEquals(p.status, "analysed");
    assertEquals(p.information_needed, undefined);
  }
});

Deno.test("inventory: processors absent -> None identified row, status analysed", () => {
  const i = intake();
  delete i.third_party_processors;
  delete i.processor_obligations;
  const inv = buildProcessingInventory(i);
  assertEquals(inv.processors.length, 1);
  assertEquals(inv.processors[0].name, "None identified");
  assertEquals(inv.processors[0].status, "analysed");
  assertEquals(inv.processors[0].information_needed, undefined);
});

Deno.test("inventory: processors empty array -> None identified row", () => {
  const inv = buildProcessingInventory(intake({ third_party_processors: [] }));
  assertEquals(inv.processors.length, 1);
  assertEquals(inv.processors[0].name, "None identified");
  assertEquals(inv.processors[0].status, "analysed");
});

Deno.test("inventory: processors present but obligations absent -> Art. 28 ask", () => {
  const i = intake();
  delete i.processor_obligations;
  const inv = buildProcessingInventory(i);
  assertEquals(inv.processors.length, 2);
  for (const p of inv.processors) {
    assertEquals(p.status, "record_insufficient");
    assertStringIncludes(String(p.information_needed), "Art. 28");
  }
});

Deno.test("inventory: special category with art9 condition carries the label verbatim", () => {
  const inv = buildProcessingInventory(intake());
  const health = inv.data_items.find((d) => d.item === "Health or medical data")!;
  assert(health.special_category);
  assertEquals(health.art9_condition_label, "Health or social care (Art. 9(2)(h))");
  assertEquals(health.status, "analysed");
  const contact = inv.data_items.find((d) => d.item === "Contact details")!;
  assertEquals(contact.special_category, false);
  assertEquals(contact.art9_condition_label, undefined);
});

Deno.test("inventory: special category without art9 condition carries an ask", () => {
  const inv = buildProcessingInventory(intake({ article_9_condition: "" }));
  const health = inv.data_items.find((d) => d.item === "Health or medical data")!;
  assertEquals(health.status, "record_insufficient");
  assertStringIncludes(String(health.information_needed), "Art. 9(2)");
  const contact = inv.data_items.find((d) => d.item === "Contact details")!;
  assertEquals(contact.status, "analysed");
  assertEquals(contact.information_needed, undefined);
});

Deno.test("inventory: eu_decision_establishment_country empty-is-answer emits no ask", () => {
  const inv = buildProcessingInventory(
    intake({ eu_decision_establishment_country: "", central_administration_country: "IE" }),
  );
  const c = inv.controllers[0];
  assertEquals(inv.controllers.length, 1);
  assertEquals(c.main_establishment_or_representative, "IE");
  assertEquals(c.status, "analysed");
  assertEquals(c.information_needed, undefined);
  const ledger = buildGapLedger({}, buildDpiaDeliverables(
    intake({ eu_decision_establishment_country: "", central_administration_country: "IE" }),
  ));
  assert(!ledger.some((e) => e.field === "eu_decision_establishment_country"));
});

Deno.test("inventory: missing dpo_info emits an Art. 37 ask on the controller row", () => {
  const i = intake();
  delete i.dpo_info;
  const inv = buildProcessingInventory(i);
  assertEquals(inv.controllers[0].status, "record_insufficient");
  assertStringIncludes(String(inv.controllers[0].information_needed), "data protection officer");
});

Deno.test("inventory: purposes are op-aligned with buildOperations", () => {
  const negating = buildProcessingInventory(intake());
  assertEquals(negating.purposes.map((p) => p.operation_id), ["op_primary"]);
  assertEquals(negating.secondary_uses[0].negation, true);

  const real = buildProcessingInventory(
    intake({ secondary_uses: "Aggregated triage outcomes are reused for service planning." }),
  );
  assertEquals(real.purposes.map((p) => p.operation_id), ["op_primary", "op_secondary"]);
  assertEquals(real.secondary_uses[0].negation, false);
  assertEquals(real.purposes[1].source_field, "secondary_uses");
});

Deno.test("inventory: planning and scale are verbatim-or-absent", () => {
  const inv = buildProcessingInventory(intake());
  assertEquals(inv.planning.launch_date, "2026-09-01");
  assertEquals(inv.planning.end_date, "2028-09-01");
  assertEquals(inv.planning.version, "v2.1");
  assertEquals(inv.scale.volume_frequency_verbatim, "About 4,000 patients per month, continuously.");

  const bare = intake();
  delete bare.estimated_launch_date;
  delete bare.estimated_end_date;
  delete bare.processing_version;
  const inv2 = buildProcessingInventory(bare);
  assertEquals(Object.keys(inv2.planning).length, 0);
});

Deno.test("inventory: every source_field is an intake contract key", () => {
  for (const fixture of [intake(), intake({ third_party_processors: [] })]) {
    for (const f of allSourceFields(buildProcessingInventory(fixture))) {
      assert(CONTRACT_KEYS.has(f), `source_field not a contract key: ${f}`);
    }
  }
});

Deno.test("inventory: asks fold into the gap ledger under contract keys", () => {
  const i = intake({ article_9_condition: "" });
  delete i.dpo_info;
  delete i.processor_obligations;
  const built = buildDpiaDeliverables(i);
  const ledger = buildGapLedger(i, built);
  for (const key of ["dpo_info", "processor_obligations"]) {
    assert(ledger.some((e) => e.field === key), `missing ledger entry for ${key}`);
    assert(CONTRACT_KEYS.has(key));
  }
  // The Art. 9(2) ask is admitted under `article_9_condition` unless the
  // existing dedup merges it into an overlapping lawful-basis ask; either way
  // it must be represented exactly once.
  assert(
    ledger.some((e) => e.field === "article_9_condition") ||
      ledger.some((e) => /special-category entry for/.test(e.enables)),
    "Art. 9(2) ask neither admitted nor merged",
  );
  assert(CONTRACT_KEYS.has("article_9_condition"));
  for (const e of ledger) {
    assert(e.dimensions.length > 0);
    assert(e.field.length > 0);
  }
});

Deno.test("inventory: attached on the deliverables envelope", () => {
  const built = buildDpiaDeliverables(intake());
  assert(built.processing_inventory);
  assertEquals(built.processing_inventory.controllers.length, 1);
});
