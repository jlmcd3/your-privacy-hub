// BATCH a77240e3 (2026-09-12) — ChatGPT's "Report Prose Review v5" plus
// Claude's independent code check agreed on three real Registration
// defects (REG5-01, REG5-02, REG5-04), each confirmed directly against the
// rendered PDF. REG5-03 (the truncated TX § 510.005(b) quotation) was left
// unimplemented: extending it accurately would require sourcing verbatim
// statutory text for subsections (3)-(6), which this fix round should not
// fabricate — flagged for a corpus/counsel-verified addition instead.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { assembleRegistrationSkeletonDocument, composeReadinessLead } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

function checklistTable(built: Bag) {
  const doc = assembleRegistrationSkeletonDocument({ registration_deliverables: built }, {}).document;
  return doc.tables!.find((t) => t.title === "Filing content checklist")!;
}

function usBroker(over: Bag = {}): Bag {
  return {
    organization_name: "Halyard Audience Data LLC",
    organization_country: "US",
    organization_size: "medium",
    employee_count: 140,
    industry: "AdTech / MarTech",
    role: "controller",
    processes_personal_data: true,
    has_uk_establishment: false,
    has_eu_establishment: false,
    is_public_authority: false,
    markets_served: ["US-TX"],
    acts_as_data_broker: true,
    sells_or_shares_personal_info: true,
    collects_data_not_directly_from_individuals: true,
    has_direct_relationship_with_data_subjects: false,
    sells_or_licenses_brokered_data: true,
    brokered_data_individual_count: 4_200_000,
    brokered_data_revenue_share_pct: 88,
    data_broker_exemption_claimed: "none",
    filing_contact_details_ready: true,
    filing_opt_out_mechanism_documented: true,
    filing_minors_data_practices_documented: true,
    filing_metrics_documented: true,
    filing_rights_instructions_documented: true,
    filing_tx_categories_documented: true,
    filing_tx_credentialing_statement_documented: true,
    filing_tx_breach_count_documented: true,
    processes_children_data: false,
    processes_special_categories: false,
    ...over,
  };
}

function bag(built: unknown): Bag {
  return built as Bag;
}

// ── REG5-01 ────────────────────────────────────────────────────────────────

Deno.test("REG5-01 — Texas: revenue limb fails, volume limb passes — prose no longer claims 'every limb' is satisfied", () => {
  const built = bag(buildRegistrationDeliverables(usBroker({
    brokered_data_revenue_share_pct: 35,
    brokered_data_individual_count: 18_000_000,
  }) as never));
  const determinations = built.determinations as Bag[];
  const tx = determinations.find((t) => t.jurisdiction === "US-TX")!;
  assertEquals(tx.verdict, "registrable");
  const reasoning = String(tx.reasoning);
  assert(!reasoning.includes("Every limb"), `must not claim every limb is satisfied: ${reasoning}`);
  assertStringIncludes(reasoning, "disjunctive");
  assertStringIncludes(reasoning, "more than 50,000 individuals");
});

Deno.test("REG5-01 — Texas: both applicability limbs pass — prose says so accurately (no regression on the fully-passing case)", () => {
  const built = bag(buildRegistrationDeliverables(usBroker({
    brokered_data_revenue_share_pct: 88,
    brokered_data_individual_count: 4_200_000,
  }) as never));
  const determinations = built.determinations as Bag[];
  const tx = determinations.find((t) => t.jurisdiction === "US-TX")!;
  assertEquals(tx.verdict, "registrable");
  assertStringIncludes(String(tx.reasoning), "both alternative limbs are met");
});

Deno.test("REG5-01 — every non-Texas state still uses the original 'every limb' sentence (no regression)", () => {
  const built = bag(buildRegistrationDeliverables(usBroker({ markets_served: ["US-CA"], brokered_data_revenue_share_pct: 88, brokered_data_individual_count: 4_200_000 }) as never));
  const determinations = built.determinations as Bag[];
  const ca = determinations.find((t) => t.jurisdiction === "US-CA")!;
  assertStringIncludes(String(ca.reasoning), "Every limb of the California definition is satisfied");
});

// ── REG5-02 ────────────────────────────────────────────────────────────────

Deno.test("REG5-02 — a not-required known-child filing item reads 'N/A — not required', never 'Yes'", () => {
  const built = bag(buildRegistrationDeliverables(usBroker({ processes_children_data: false }) as never));
  const table = checklistTable(built);
  const row = table.rows.find((r) => r[1].includes("known child"))!;
  assertEquals(row[2], "N/A — not required");
});

Deno.test("REG5-02 — a REQUIRED known-child filing item still reads Yes/No — outstanding correctly (no regression)", () => {
  const notDocumented = bag(buildRegistrationDeliverables(usBroker({ processes_children_data: true, filing_minors_data_practices_documented: false }) as never));
  const t1 = checklistTable(notDocumented);
  assertEquals(t1.rows.find((r) => r[1].includes("known child"))![2], "No — outstanding");

  const documented = bag(buildRegistrationDeliverables(usBroker({ processes_children_data: true, filing_minors_data_practices_documented: true }) as never));
  const t2 = checklistTable(documented);
  assertEquals(t2.rows.find((r) => r[1].includes("known child"))![2], "Yes");
});

// ── REG5-04 ────────────────────────────────────────────────────────────────

Deno.test("REG5-04 — the ICO fee derivation surfaces even when OTHER jurisdictions also have open filing-content items", () => {
  const report: Bag = {
    jurisdictions: [{
      code: "GB", name: "United Kingdom", obligations: ["ico_fee"],
      filing_fee_cents: 376300, notes: "Tier 3 fee, derived from a recorded headcount of 260 employees.",
    }],
  };
  const counts = { attached: 1, satisfied: 0, open: 1, broker_states: [], reserved: 0, attached_names: [], filing_attached: 1, designation_attached: 0, corpus_pending: 0, ico_fee_attached: 1, ai_act_attached: 0 };
  // Force the "open" branch (rows.length > 0, open.length > 0) by giving a
  // filing-content row with an outstanding item.
  const readinessReport: Bag = { ...report, filing_readiness: [{ jurisdiction: "US-TX", ready_to_file: false, items: [{ item: "Legal name, contact person, physical address, e-mail, telephone and website", ready: false }] }] };
  const lead = composeReadinessLead(readinessReport, counts as never, "EUP QA Fictional UK Retail Ltd");
  assertStringIncludes(lead, "Tier 3 fee, derived from a recorded headcount");
});

Deno.test("REG5-04 — the ICO fee derivation still surfaces in the original zero-filing-rows case (no regression)", () => {
  const report: Bag = {
    jurisdictions: [{ code: "GB", name: "United Kingdom", obligations: ["ico_fee"], filing_fee_cents: 7800, notes: "Tier 2 fee." }],
    filing_readiness: [],
  };
  const counts = { attached: 1, satisfied: 0, open: 1, broker_states: [], reserved: 0, attached_names: ["the United Kingdom ICO annual data-protection fee (£78.00)"], filing_attached: 0, designation_attached: 0, corpus_pending: 0, ico_fee_attached: 1, ai_act_attached: 0 };
  const lead = composeReadinessLead(report, counts as never, "EUP QA Fictional UK Retail Ltd");
  assertStringIncludes(lead, "No filing-content list applies");
  assertStringIncludes(lead, "Tier 2 fee.");
});
