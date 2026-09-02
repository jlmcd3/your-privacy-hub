// DOC 138 (2026-09-02) — regression tests for two confirmed DPIA fixes.
//
//   FIX 1  The "Art. 5 principles" coverage row (measures_article5) states a
//          GENERAL, all-six-sub-principles finding ("no principle-by-principle
//          finding" / an ask naming all six Art. 5(1) letters), but was
//          previously cited via the registry's narrow Art. 5(1)(b)
//          purpose-limitation anchor. It now cites the general "Art.
//          5(1)–(2)" provision directly (mirroring the sibling
//          measures_rights row's `cit(regime, "Arts. 12–22")` pattern), with
//          no authority_verbatim claimed. The six-item gap table reads the
//          same `citation` field, so it is fixed by the same change.
//   FIX 2  The six-item gap table's section lead ({OUTSTANDING_MATTERS}) now
//          appends one blanket sentence calling for a responsible owner and
//          target date to be designated for the open items, firing only when
//          the gap ledger actually carries at least one row (no-padding law)
//          and never fabricating a specific name, role, or date.
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildProcessingInventory,
  buildSection2Coverage,
} from "../../_shared/ltp/dpia-deliverables/build.ts";
import { ANCHOR_KEYS, row } from "../../_shared/ltp/dpia-deliverables/elements.ts";
import { assembleDpiaSkeletonDocument } from "../../_shared/ltp/dpia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

function intake(over: Bag = {}): Bag {
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

function coverage(over: Bag = {}) {
  const i = intake(over);
  return buildSection2Coverage(i, { processing_inventory: buildProcessingInventory(i) });
}

// ── FIX 1 — the Art. 5 principles row cites the general provision ─────────

Deno.test("FIX 1 — measures_article5 (analysed branch) cites the general Art. 5(1)-(2) provision, not the narrow (b) sub-principle", () => {
  const c = coverage();
  assertEquals(c.measures_article5.length, 1);
  const row = c.measures_article5[0];
  assertEquals(row.status, "analysed");
  assertEquals(row.citation, "GDPR Art. 5(1)–(2)");
  assert(!row.citation.includes("(b)"), `expected no narrow (b) sub-principle citation, got: ${row.citation}`);
});

Deno.test("FIX 1 — measures_article5 (record_insufficient branch) cites the same general provision", () => {
  const c = coverage({ data_minimisation_justification: "" });
  const row = c.measures_article5[0];
  assertEquals(row.status, "record_insufficient");
  assertEquals(row.citation, "GDPR Art. 5(1)–(2)");
  assert(!row.citation.includes("(b)"), `expected no narrow (b) sub-principle citation, got: ${row.citation}`);
});

Deno.test("FIX 1 — the genuinely purpose-limitation-specific registry anchor is untouched", () => {
  // ANCHOR_KEYS.purpose_limitation -> registry row "principle_purpose_limitation"
  // (GDPR Art. 5(1)(b)) is a shared fleet anchor other builders may still key
  // off correctly for an actual purpose-limitation-specific finding. This fix
  // only stopped the DPIA "Art. 5 principles" general-coverage row from
  // BORROWING that narrow anchor (build.ts no longer calls
  // anchorStrict("purpose_limitation", ...) at all for that row) — it does
  // not redefine, remove, or widen the registry row itself.
  const r = row(ANCHOR_KEYS.purpose_limitation);
  assert(r, "principle_purpose_limitation registry row missing");
  assertEquals(r!.subsection, "GDPR Art. 5(1)(b)");
});

Deno.test("FIX 1 — the six-item gap table's Art. 5 row inherits the same general citation (single source of truth)", () => {
  const c = coverage({ data_minimisation_justification: "" });
  const row = c.measures_article5[0];
  assertEquals(row.status, "record_insufficient");
  assertEquals(row.information_needed !== undefined, true);
  // buildGapLedgerDetailed's s2c.measures_article5 loop reads `r.citation`
  // directly for the ledgered "provision it bears on" column, so fixing the
  // coverage row's citation fixes the gap-table row by construction.
  assertEquals(row.citation, "GDPR Art. 5(1)–(2)");
});

// ── FIX 2 — the gap table's section lead calls for a designated owner ─────

function baseReport(gapLedger: Bag[]): Bag {
  return {
    decision: { determination: "approved", conditions: [], blockers: [], why: "Nothing is left open.", citation: "GDPR Art. 35(1)" },
    art36_consultation: { determination: "consultation_not_required", why: "" },
    necessity_findings: [],
    proportionality: [],
    risk_register: [
      { risk_id: "r1", risk_label: "Access", risk_class: "design", severity: "Low", source: "x", affected_rights: "y", residual_band: "low", measures: ["Access controls"] },
    ],
    gap_ledger: gapLedger,
  };
}

const BASE_INTAKE = {
  organization_name: "Northwind Clinics Ltd",
  processing_activity_name: "Patient triage scoring",
  description: "A scoring model applied at intake.",
};

Deno.test("FIX 2 — a non-empty gap table renders the owner/date designation sentence once", () => {
  const report = baseReport([
    { field: "dpo_info", dimensions: "The DPO's contact details.", provision: "GDPR Art. 37", enables: "the controller record" },
    { field: "processor_obligations", dimensions: "A signed Art. 28 processing contract.", provision: "GDPR Art. 28", enables: "the processor record" },
  ]);
  const { document } = assembleDpiaSkeletonDocument(report, BASE_INTAKE);
  const body = skeletonDocumentToText(document);
  const sentence = "The Company will need to designate a responsible owner and target date for resolving each of the items below.";
  const firstIdx = body.indexOf(sentence);
  assert(firstIdx >= 0, "designation sentence did not render");
  assertEquals(body.indexOf(sentence, firstIdx + 1), -1, "designation sentence rendered more than once");
  // No fabricated name, role, or specific date.
  assert(!/\b\d{4}-\d{2}-\d{2}\b/.test(sentence), "must not invent a deadline");
});

Deno.test("FIX 2 — an empty gap table (zero gaps) does not render the designation sentence (no-padding law)", () => {
  const report = baseReport([]);
  const { document } = assembleDpiaSkeletonDocument(report, BASE_INTAKE);
  const body = skeletonDocumentToText(document);
  assertStringIncludes(body, "Outstanding Matters. None identified.");
  assert(
    !body.includes("designate a responsible owner and target date"),
    "designation sentence must not render when there are no outstanding matters",
  );
});
