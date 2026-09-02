// DOC 142 (2026-09-02) — external review (Batch 7), Governance item B.
//
// Remediation register rows rendered the internal normalisePriority state
// token "unspecified" verbatim in the Priority cell (live runs Aster/Maris,
// 2026-09-02). The ABSENCE of a fabricated priority is ratified by design
// (doc-119 S2.7); the token's spelling is not, and the tracker UI already
// maps the same token to a reader-facing label (GovernanceTrackerFindings
// renders "Not recorded"). The register now renders "Priority to be
// assigned" — a label change only; the persisted record still carries
// "unspecified" and no priority is invented.
//
// Also guarded: a Priority column that collapses as a constant because NO
// priority was recorded is not folded into the "recorded portfolio
// defaults" note clause — an unassigned priority is not a recorded default.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deriveRemediationRegisterTable } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

function planRow(over: Bag = {}): Bag {
  return {
    finding_key: String(over.finding_key ?? "k1"),
    domain: "international_transfers",
    action_type: "Compliance gap",
    priority: "unspecified",
    accountable_owner: "",
    target_date: "",
    validation_method: "Documented evidence reviewed at the next scheduled governance review",
    status: "record_insufficient",
    ...over,
  };
}

function reportFor(plan: Bag[]): Bag {
  return { remediation_plan: plan, domain_element_findings: [] };
}

Deno.test("DOC 142 B — an unrecorded priority renders 'Priority to be assigned', never the raw token", () => {
  const table = deriveRemediationRegisterTable(reportFor([
    planRow({ finding_key: "k1" }),
    planRow({ finding_key: "k2", priority: "High — remediate this quarter", accountable_owner: "DPO" }),
  ]));
  assert(table, "register must render");
  const priorityIdx = table!.columns.indexOf("Priority");
  assert(priorityIdx > 0, `Priority column must be kept: ${JSON.stringify(table!.columns)}`);
  assertEquals(table!.rows[0][priorityIdx], "Priority to be assigned");
  // A recorded priority renders verbatim — the mapping touches only the token.
  assertEquals(table!.rows[1][priorityIdx], "High — remediate this quarter");
  assert(!JSON.stringify(table).includes("unspecified"), "the raw state token must never reach the rendered table");
});

Deno.test("DOC 142 B — an all-unassigned Priority column is not misdescribed as a recorded portfolio default", () => {
  const table = deriveRemediationRegisterTable(reportFor([
    planRow({ finding_key: "k1", accountable_owner: "DPO", target_date: "2026-12-31" }),
    planRow({ finding_key: "k2", accountable_owner: "DPO", target_date: "2026-12-31" }),
  ]));
  assert(table, "register must render");
  // Priority collapses (constant across rows) alongside the genuinely
  // recorded owner/date constants.
  assert(!table!.columns.includes("Priority"), JSON.stringify(table!.columns));
  const note = String((table as unknown as Bag).note ?? "");
  assertStringIncludes(note, "recorded portfolio defaults");
  assertStringIncludes(note, "Priority is yet to be assigned for every item in this register; no priority was recorded.");
  // The unassigned priority must not sit inside the recorded-defaults clause,
  // and the raw token must not leak into the note.
  assert(!/Priority:.*recorded portfolio defaults/.test(note), note);
  assert(!note.includes("unspecified"), note);
});

Deno.test("DOC 142 B — a genuinely recorded constant priority still folds into the recorded-defaults note", () => {
  const table = deriveRemediationRegisterTable(reportFor([
    planRow({ finding_key: "k1", priority: "Medium — remediate this year", accountable_owner: "DPO" }),
    planRow({ finding_key: "k2", priority: "Medium — remediate this year", accountable_owner: "DPO" }),
  ]));
  assert(table, "register must render");
  assert(!table!.columns.includes("Priority"), JSON.stringify(table!.columns));
  const note = String((table as unknown as Bag).note ?? "");
  assertStringIncludes(note, "Priority: Medium — remediate this year");
  assertStringIncludes(note, "recorded portfolio defaults");
});
