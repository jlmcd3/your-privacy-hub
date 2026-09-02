// PROMPT 7 (2026-08-11) — deterministic Section-2 coverage tables.
//
// CITATION LAW IN THIS FILE: no literal statute text is written here. Every
// citation assertion resolves through the anchor registry / `cit()` path by
// comparing against the registry row, never against a hand-typed quote.
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDpiaDeliverables,
  buildGapLedger,
  buildProcessingInventory,
  buildSection2Coverage,
} from "../../run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";
import {
  DPIA_SAFEGUARD_SPECS,
  row,
} from "../../run-dpia-framework/_local/ltp/dpia-deliverables/elements.ts";
import { dpiaFrameworkContract } from "../../_shared/intake-contracts/dpia-framework.ts";

const CONTRACT_KEYS = new Set(dpiaFrameworkContract.fields.map((f) => f.key));

function intake(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    organization_name: "Northwind Clinics Ltd",
    processing_activity_name: "Patient triage scoring",
    purpose: "To triage patients arriving at urgent care.",
    description: "A scoring model applied at intake.",
    data_categories: ["Contact details", "Health or medical data"],
    data_subjects: "Patients",
    volume_frequency: "About 4,000 patients per month.",
    jurisdictions: ["EU (GDPR)"],
    legal_basis_proposed: "Legitimate interests (Art. 6(1)(f))",
    article_9_condition: "Health or social care (Art. 9(2)(h))",
    necessity_proportionality: "The scoring is limited to triage and nothing else.",
    retention_period: "24 months from the last episode of care",
    data_minimisation_justification: "Only the fields the triage model reads are collected.",
    data_quality_measures: "Records sync nightly from the patient master record.",
    data_subject_rights_mechanisms: "Requests arrive through the patient portal.",
    dp_by_design_measures: "Pseudonymisation at ingest and field-level access control.",
    existing_safeguards: ["Encryption at rest", "Access controls", "DPA signed with processor"],
    third_party_processors: ["Acme Cloud"],
    processor_obligations: "Processing only on documented instructions.",
    transfer_flows: [],
    ...over,
  };
}

function coverage(over: Record<string, unknown> = {}) {
  const i = intake(over);
  return buildSection2Coverage(i, { processing_inventory: buildProcessingInventory(i) });
}

// ── TIER 1a — special-category conditions ────────────────────────────
Deno.test("s2: special-category row quotes the intake condition enum verbatim", () => {
  const c = coverage();
  assertEquals(c.special_category_conditions.length, 1);
  const r = c.special_category_conditions[0];
  assertEquals(r.item, "Health or medical data");
  assertEquals(r.condition_label, "Health or social care (Art. 9(2)(h))");
  assertEquals(r.status, "analysed");
  assertStringIncludes(r.justification, "Health or social care (Art. 9(2)(h))");
  assertStringIncludes(r.justification, "limited to triage");
});

Deno.test("s2: an empty Art. 9(2) enum yields an ask, never an invented condition", () => {
  const c = coverage({ article_9_condition: "" });
  const r = c.special_category_conditions[0];
  assertEquals(r.condition_label, "");
  assertEquals(r.status, "record_insufficient");
  assertStringIncludes(String(r.information_needed), "Art. 9(2)");
});

Deno.test("s2: non-special data items produce no special-category row", () => {
  const c = coverage({ data_categories: ["Contact details"] });
  assertEquals(c.special_category_conditions.length, 0);
});

// ── TIER 1b — transfers ──────────────────────────────────────────────
Deno.test("s2: zero transfer_flows is a determination, not an ask (emptyIsAnswer)", () => {
  const c = coverage({ transfer_flows: [] });
  assertEquals(c.transfers.length, 1);
  const t = c.transfers[0];
  assertEquals(t.determination, "no_transfer_on_the_record");
  assertEquals(t.status, "analysed");
  assertEquals(t.information_needed, undefined);
  const field = dpiaFrameworkContract.fields.find((f) => f.key === "transfer_flows")!;
  assertEquals(field.emptyIsAnswer, true);
});

Deno.test("s2: intra-EEA flow never yields a Chapter V mechanism ask", () => {
  const c = coverage({
    transfer_flows: [{ importer: "Acme Cloud", destination: "IE", originRegime: "EU" }],
  });
  const t = c.transfers[0];
  assertEquals(t.determination, "intra_eea_processing");
  assertEquals(t.status, "analysed");
  assertEquals(t.information_needed, undefined);
  assertEquals(t.transfer_risk_assessment_required, false);
  // INTRA-EEA PROCESSING RULE: the word "transfer" is never used for this leg.
  assertStringIncludes(t.finding, "intra-EEA processing");
  assert(!/intra-EEA transfer/i.test(t.finding));
});

Deno.test("s2: UK↔EU adequacy resolves in both directions with no Chapter V ask", () => {
  const eu2uk = coverage({
    jurisdictions: ["EU (GDPR)"],
    transfer_flows: [{ importer: "Northwind UK", destination: "UK", originRegime: "EU" }],
  }).transfers[0];
  assertEquals(eu2uk.determination, "adequacy");
  assertEquals(eu2uk.status, "analysed");
  assertEquals(eu2uk.information_needed, undefined);

  const uk2eu = coverage({
    jurisdictions: ["United Kingdom (UK GDPR)"],
    transfer_flows: [{ importer: "Northwind IE", destination: "IE", originRegime: "UK" }],
  }).transfers[0];
  assertEquals(uk2eu.determination, "adequacy");
  assertEquals(uk2eu.status, "analysed");
  assertEquals(uk2eu.information_needed, undefined);
  assert(uk2eu.registry_verified_on.length > 0);
});

Deno.test("s2: an uncovered third-country flow asks for the Chapter V instrument", () => {
  const t = coverage({
    transfer_flows: [{ importer: "Vendor Inc", destination: "US", originRegime: "EU", dpfCertified: false }],
  }).transfers[0];
  assertEquals(t.determination, "chapter_v_mechanism_required");
  assertEquals(t.status, "record_insufficient");
  assertStringIncludes(String(t.information_needed), "Chapter V");
});

// ── TIER 1c — Art. 28 processor contract ─────────────────────────────
Deno.test("s2: processors + recorded DPA is analysed; without it, the ask", () => {
  const withDpa = coverage().processor_contract;
  assertEquals(withDpa.dpa_recorded, true);
  assertEquals(withDpa.status, "analysed");

  const without = coverage({ existing_safeguards: ["Access controls"] }).processor_contract;
  assertEquals(without.status, "record_insufficient");
  assertStringIncludes(String(without.information_needed), "processing contract");

  const none = coverage({ third_party_processors: [] }).processor_contract;
  assertEquals(none.status, "analysed");
  assertEquals(none.information_needed, undefined);
});

// ── TIER 2 ───────────────────────────────────────────────────────────
Deno.test("s2: minimisation/retention carries one row per data item, verbatim", () => {
  const c = coverage();
  assertEquals(c.data_minimisation_retention.length, 2);
  for (const r of c.data_minimisation_retention) {
    assertEquals(r.retention_period, "24 months from the last episode of care");
    assertEquals(r.need_justification, "Only the fields the triage model reads are collected.");
    assertEquals(r.status, "analysed");
  }
  const missing = coverage({ retention_period: "" }).data_minimisation_retention[0];
  assertEquals(missing.status, "record_insufficient");
  assertStringIncludes(String(missing.information_needed), "retention period");
});

Deno.test("s2: dpbd measures are the record's words, and absence is an ask", () => {
  assertEquals(coverage().measures_dpbd[0].status, "analysed");
  assertEquals(
    coverage().measures_dpbd[0].description,
    "Pseudonymisation at ingest and field-level access control.",
  );
  const absent = coverage({ dp_by_design_measures: "" }).measures_dpbd[0];
  assertEquals(absent.status, "record_insufficient");
  assertEquals(absent.description, "");
});

Deno.test("s2: each safeguard selection renders its pre-authored spec description", () => {
  const c = coverage();
  assertEquals(c.measures_security.length, 3);
  for (const r of c.measures_security) {
    const spec = DPIA_SAFEGUARD_SPECS.find((s) => s.measure === r.measure)!;
    assertEquals(r.description, spec.description);
    assertEquals(r.status, "analysed");
  }
});

Deno.test('s2: the "None" safeguard selection produces an explicit determination row', () => {
  const c = coverage({ existing_safeguards: ["None"] });
  assertEquals(c.measures_security.length, 1);
  const r = c.measures_security[0];
  assertEquals(r.measure, "None");
  assertEquals(r.status, "analysed");
  assertEquals(r.information_needed, undefined);
  assertStringIncludes(r.description, "no safeguard from the list was selected");

  const silent = coverage({ existing_safeguards: [] }).measures_security[0];
  assertEquals(silent.status, "record_insufficient");
});

// ── TIER 3 ───────────────────────────────────────────────────────────
Deno.test("s2: tier-3 surfaces never emit more rows than the record supports", () => {
  const c = coverage();
  assertEquals(c.data_quality.length, 1);
  assertEquals(c.measures_article5.length, 1);
  // DPIA-1 (2026-08-29) — measures_rights now carries two rows: the
  // rights-routes row (unchanged, [0]) plus the Art. 20 portability row
  // ([1]); see the dedicated "DPIA-1" test block below for its own coverage.
  assertEquals(c.measures_rights.length, 2);
  assertStringIncludes(c.measures_rights[0].record_words, "Requests arrive through the patient portal");
  // PROMPT 10B(2) — present-but-unstructured is credit-first: analysed, with a
  // completeness residual and no ask.
  assertEquals(c.measures_article5[0].status, "analysed");
  assertEquals(c.measures_rights[0].status, "analysed");
  assertEquals(c.measures_article5[0].information_needed, undefined);
  assertEquals(c.measures_rights[0].information_needed, undefined);
  // STALE-PIN FIX 2026-08-29: v4.6.2 reworded the residual notes ("would
  // complete the table" said the DPIA was unfinished — see the comment on
  // RESIDUAL_ART5_TABLE/RESIDUAL_RIGHTS_TABLE in build.ts); the current
  // ratified bytes say "principle-by-principle" / "right-by-right".
  assertStringIncludes(String(c.measures_article5[0].residual_note), "principle-by-principle breakdown");
  assertStringIncludes(String(c.measures_rights[0].residual_note), "right-by-right breakdown");

  const thin = coverage({
    data_quality_measures: "",
    data_subject_rights_mechanisms: "",
    data_minimisation_justification: "",
  });
  assertEquals(thin.data_quality.length, 1);
  assertEquals(thin.data_quality[0].status, "record_insufficient");
  assertEquals(thin.measures_article5.length, 1);
  assertEquals(thin.measures_rights.length, 2);
  assertEquals(thin.measures_rights[0].record_words, "");
  // ABSENT source → the ratified 8C ask stands and remains ledger-bound.
  assertEquals(thin.measures_article5[0].status, "record_insufficient");
  assertEquals(thin.measures_rights[0].status, "record_insufficient");
  assertEquals(thin.measures_article5[0].residual_note, undefined);
  assertEquals(thin.measures_rights[0].residual_note, undefined);
});

// ── DPIA-1 (2026-08-29) — Art. 20 portability, three-condition test ───
Deno.test("DPIA-1: an ineligible legal basis is a conclusive, unhedged negative", () => {
  // Fixture default is "Legitimate interests (Art. 6(1)(f))" — Art. 6(1)(f)
  // never satisfies Art. 20's legal-basis condition.
  const r = coverage().measures_rights[1];
  assertEquals(r.heading, "Article 20 — right to data portability");
  assertEquals(r.status, "analysed");
  assertEquals(r.information_needed, undefined);
  assertStringIncludes(r.finding, "does not apply");
  assertStringIncludes(r.citation, "Art. 20(1)");
  assertEquals(r.source_field, "legal_basis_proposed");
});

Deno.test("DPIA-1: Art. 6(1)(c)/(d)/(e) all fail the legal-basis condition too", () => {
  for (
    const basis of [
      "Legal obligation (Art. 6(1)(c))",
      "Vital interests (Art. 6(1)(d))",
      "Public task (Art. 6(1)(e))",
    ]
  ) {
    const r = coverage({ legal_basis_proposed: basis }).measures_rights[1];
    assertEquals(r.status, "analysed", basis);
    assertStringIncludes(r.finding, "does not apply");
  }
});

Deno.test("DPIA-1: consent or contract satisfies condition 1 but leaves 2 unresolved — never asserted, never an unclosable ask", () => {
  for (const basis of ["Consent (Art. 6(1)(a))", "Contract (Art. 6(1)(b))"]) {
    const r = coverage({ legal_basis_proposed: basis }).measures_rights[1];
    // Credit-first (PROMPT 10B(2)): the intake has no field for the other two
    // conditions at all, so this is a completeness residual, not a
    // customer-fixable gap — no ask, no gap-ledger entry. DOC 142
    // (2026-09-02): the row carries the dedicated closed status whose reader
    // label is "Not independently assessed" — "Assessed" contradicted the
    // row's own "reaches no conclusion" finding.
    assertEquals(r.status, "not_independently_assessed", basis);
    assertEquals(r.information_needed, undefined, basis);
    assertEquals(r.ask_class, undefined, basis);
    assertStringIncludes(r.finding, "satisfies one of Article 20's three conditions");
    assertStringIncludes(r.finding, "reaches no conclusion on whether Article 20 applies");
    // Never a bare assertion that portability DOES apply — only that one
    // condition is met.
    assert(!/[Pp]ortability applies\./.test(r.finding), r.finding);
  }
});

// DOC 142 (2026-09-02) — render-level regression: the qualified-basis
// Article 20 row's STATUS cell reads "Not independently assessed" (never
// "Assessed" beside a "reaches no conclusion" finding), and its follow-up
// cell stays "No follow-up required" (the status is closed by design — no
// intake field exists that could resolve it).
Deno.test("DOC 142: the Article 20 row renders 'Not independently assessed' with no follow-up", async () => {
  const { buildDpiaTablesBySurface } = await import("../../_shared/ltp/dpia-skeleton-tables.ts");
  const cov = coverage({ legal_basis_proposed: "Contract (Art. 6(1)(b))" });
  const tables = buildDpiaTablesBySurface({ section2_coverage: cov }, intake());
  const t = tables["section2_coverage.measures_rights"];
  assert(t, "rights coverage table missing");
  const row20 = t!.rows.find((r) => r[0].startsWith("Article 20"));
  assert(row20, JSON.stringify(t!.rows.map((r) => r[0])));
  assert(row20!.includes("Not independently assessed"), JSON.stringify(row20));
  assert(!row20!.some((c) => c === "Assessed"), JSON.stringify(row20));
  assert(
    row20!.includes("No follow-up required") ||
      (t!.note ?? "").includes("No follow-up required"),
    JSON.stringify({ row: row20, note: t!.note }),
  );
});

Deno.test("DPIA-1: an unrecorded legal basis asks, never assumes", () => {
  const r = coverage({ legal_basis_proposed: "" }).measures_rights[1];
  assertEquals(r.status, "record_insufficient");
  assertEquals(r.ask_class, "ask_portability_conditions");
  assertStringIncludes(r.finding, "does not yet establish the legal basis");
});

Deno.test("DPIA-1: an unrecorded basis folds into the gap ledger under legal_basis_proposed, never data_subject_rights_mechanisms", () => {
  const i = intake({ legal_basis_proposed: "" });
  const built = buildDpiaDeliverables(i);
  const ledger = buildGapLedger(i, built);
  const entry = ledger.find((e) => e.field === "legal_basis_proposed" && e.enables === "the Article 20 portability determination");
  assert(entry, JSON.stringify(ledger));
  assert(CONTRACT_KEYS.has(entry!.field));
});

Deno.test("s2: intake_structure_recommendations is internal and names contract keys", () => {
  const recs = coverage().intake_structure_recommendations;
  assert(recs.length >= 3);
  for (const r of recs) {
    assert(r.field.length > 0 && r.today.length > 0 && r.would_enable.length > 0);
  }
  // Every recommendation either names an existing contract key or proposes a new one.
  const known = recs.filter((r) => CONTRACT_KEYS.has(r.field));
  assert(known.length >= 3, JSON.stringify(recs.map((r) => r.field)));
});

// ── Citations + ledger folding ───────────────────────────────────────
Deno.test("s2: every citation resolves through the registry or the cit() path", () => {
  const c = coverage({
    transfer_flows: [{ importer: "Vendor Inc", destination: "US", originRegime: "EU" }],
  });
  const cites: string[] = [
    ...c.special_category_conditions.map((r) => r.citation),
    ...c.transfers.map((r) => r.citation),
    c.processor_contract.citation,
    ...c.data_minimisation_retention.map((r) => r.citation),
    ...c.measures_dpbd.map((r) => r.citation),
    ...c.measures_security.map((r) => r.citation),
    ...c.data_quality.map((r) => r.citation),
    ...c.measures_article5.map((r) => r.citation),
    ...c.measures_rights.map((r) => r.citation),
  ];
  for (const cite of cites) {
    assert(cite.length > 0, "empty citation");
    assertStringIncludes(cite, "GDPR");
  }
  // Registry-backed rows carry the registry's own verbatim, never a retyped one.
  assertEquals(
    c.special_category_conditions[0].authority_verbatim,
    row("special_categories_prohibition")!.verbatim_quote,
  );
  assertEquals(
    c.processor_contract.authority_verbatim,
    row("processor_written_contract")!.verbatim_quote,
  );
  assertEquals(
    c.measures_security[0].authority_verbatim,
    row("security_appropriate_measures")!.verbatim_quote,
  );
});

Deno.test("s2: coverage asks fold into the gap ledger with contract-key fields", () => {
  const i = intake({
    article_9_condition: "",
    existing_safeguards: ["Access controls"],
    transfer_flows: [{ importer: "Vendor Inc", destination: "US", originRegime: "EU" }],
  });
  const built = buildDpiaDeliverables(i);
  const ledger = buildGapLedger(i, built);
  for (const e of ledger) {
    assert(e.field.length > 0 && e.dimensions.length > 0);
  }
  assert(ledger.some((e) => e.field === "transfer_flows"));
  assert(ledger.some((e) => e.field === "article_9_condition"));
  for (const e of ledger) {
    if (["retention_period", "transfer_flows", "article_9_condition", "existing_safeguards", "dp_by_design_measures", "data_quality_measures", "data_subject_rights_mechanisms", "data_minimisation_justification"].includes(e.field)) {
      assert(CONTRACT_KEYS.has(e.field), e.field);
    }
  }
});

Deno.test("s2: attaches as a single-writer surface on the envelope", () => {
  const built = buildDpiaDeliverables(intake());
  assertEquals(built.section2_coverage.rule_id, "dpia_section2_coverage_v1");
  assertEquals(built.section2_coverage.transfers.length, 1);
});

// ── PROMPT 8C (2026-08-12) — Tier-3 asks name facts ──────────────────
Deno.test("8C: tier-3 asks are the ratified fact-naming strings", () => {
  const thin = coverage({
    data_quality_measures: "",
    data_subject_rights_mechanisms: "",
    data_minimisation_justification: "",
  });
  assertEquals(
    thin.data_quality[0].information_needed,
    "The measures that keep the personal data accurate and up to date for this purpose, and how data quality is checked.",
  );
  assertEquals(
    thin.measures_article5[0].information_needed,
    "The measures supporting each Article 5(1) principle — fairness, transparency, purpose limitation, data minimisation, accuracy, storage limitation, integrity and confidentiality — stated principle by principle, and whether each measure has been deployed.",
  );
  assertEquals(
    thin.measures_rights[0].information_needed,
    "How each data-subject right — information, access, rectification, erasure, restriction, portability, objection — can be exercised for this processing: the route, the responding role, and the response time.",
  );
});

// ── PROMPT 10B (2026-08-12) ──────────────────────────────────────────
Deno.test("10B-1: a named Art. 9(2) condition ledgers its pinpoint under Art. 9", () => {
  const r = coverage().special_category_conditions[0];
  // The registry row (Art. 9(1)) still anchors the verbatim…
  assertEquals(r.citation, row("special_categories_prohibition")!.subsection);
  // …and the pinpoint carried by the intake enum rides alongside it.
  assertEquals(r.condition_citation, "GDPR Art. 9(2)(h)");
});

Deno.test("10B-1: an unnamed condition carries no invented pinpoint", () => {
  const r = coverage({ article_9_condition: "" }).special_category_conditions[0];
  assertEquals(r.condition_citation, undefined);
});

Deno.test("10B-2: present-but-unstructured tier-3 raises no gap-ledger entry", () => {
  const i = intake();
  const d = buildDpiaDeliverables(i) as Record<string, any>;
  const ledger = (d.gap_ledger ?? []) as Array<{ field: string }>;
  assertEquals(ledger.filter((g) => g.field === "data_minimisation_justification").length, 0);
  assertEquals(ledger.filter((g) => g.field === "data_subject_rights_mechanisms").length, 0);
});

Deno.test("10B-2: absent tier-3 sources still raise the 8C asks in the ledger", () => {
  const i = intake({
    data_subject_rights_mechanisms: "",
    data_minimisation_justification: "",
  });
  const d = buildDpiaDeliverables(i) as Record<string, any>;
  const ledger = (d.gap_ledger ?? []) as Array<{ field: string; ask: string }>;
  assert(ledger.some((g) => g.field === "data_subject_rights_mechanisms"));
  assert(ledger.some((g) => g.field === "data_minimisation_justification"));
});
