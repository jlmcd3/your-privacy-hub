// BATCH 20a (Wave C4 — doc 111 Batch 20 first half, doc 113 Part E seam
// rulings S5.1–S5.5): Governance Remediation Register + ICO crosswalk
// table; LIA alternatives + balance tables (v2 path only) and the
// balancing paragraph seams.

import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleGovernanceSkeletonDocument } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import { assembleLiaSkeletonDocument } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { buildAlternativesConsidered } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";

type Bag = Record<string, unknown>;

function allTables(doc: { sections: readonly { id: string; paragraphs: readonly { kind: string; table?: { title: string; columns: readonly string[]; rows: readonly (readonly string[])[]; note?: string } }[] }[] }) {
  return doc.sections.flatMap((s) => s.paragraphs.filter((p) => p.kind === "table" && p.table).map((p) => p.table!));
}

Deno.test("C4/S5.1: the Remediation Register renders with constant meta columns dropped to the note", () => {
  const report: Bag = {
    readiness_determination: { rating: "partially_evidenced" },
    executive_summary: "The programme is partly evidenced on the company's answers.",
    domain_findings: [
      { domain: "training", domain_name: "Training", severity: "medium", gap_description: "Training is onboarding-only.", recommended_action: "Adopt an annual refresher." },
    ],
    domain_element_findings: [
      { key: "ropa_retention", domain: "art30", label: "Envisaged retention time limits", record_fact: "The record carries nothing on this element.", information_needed: "State the retention limit per category." },
    ],
    remediation_plan: [
      { finding_key: "ropa_retention", domain: "art30", priority: "High", accountable_owner: "D. Okafor", target_date: "2026-11-30", validation_method: "Documentary review" },
      { domain: "training", priority: "High", accountable_owner: "D. Okafor", target_date: "2026-11-30", validation_method: "Documentary review" },
    ],
  };
  const out = assembleGovernanceSkeletonDocument(report, { organization_name: "Halcyon Ltd" });
  const register = allTables(out.document).find((t) => t.title === "Remediation register");
  assertExists(register);
  // Uniform meta values: all four meta columns drop; constants ride the note.
  assertEquals(register.columns, ["#", "Duty and gap", "Action"]);
  assertExists(register.note);
  assertStringIncludes(register.note, "Priority: High");
  assertStringIncludes(register.note, "the intake's remediation defaults, applied to each item");
  assertEquals(register.rows[0][1], "Envisaged retention time limits — The record carries nothing on this element.");
  assertEquals(register.rows[0][2], "State the retention limit per category");
  // The prose keeps the count sentence pointing at the register; the old
  // numbered item fragments are gone.
  const text = JSON.stringify(out.document);
  assertStringIncludes(text, "each tied to the duty it closes and set out in the remediation register below");
  assert(!text.includes("Accountable owner: D. Okafor."), "item fragments must not remain in prose");

  // Non-uniform metas keep their columns.
  (report.remediation_plan as Bag[])[1].accountable_owner = "J. Weiss";
  const out2 = assembleGovernanceSkeletonDocument(report, { organization_name: "Halcyon Ltd" });
  const register2 = allTables(out2.document).find((t) => t.title === "Remediation register")!;
  assertEquals(register2.columns, ["#", "Duty and gap", "Action", "Accountable owner"]);
});

Deno.test("C4/S5.2: the ICO crosswalk is a table and the closing sentence is detached", () => {
  const report: Bag = {
    readiness_determination: { rating: "partially_evidenced" },
    executive_summary: "The programme is partly evidenced.",
    accountability_determination: { verdict: "partially_satisfied" },
    dpo_determination: { verdict: "satisfied" },
    transfer_analysis: { regime: "engaged" },
    domain_findings: [],
    art30_element_findings: [{ element: "a", verdict: "satisfied" }],
  };
  const out = assembleGovernanceSkeletonDocument(report, { organization_name: "Halcyon Ltd" });
  const crosswalk = allTables(out.document).find((t) => t.title === "ICO Accountability Framework crosswalk");
  assertExists(crosswalk);
  assertEquals(crosswalk.columns, ["Category", "Position on the record"]);
  assertEquals(crosswalk.rows.length, 10);
  assertEquals(crosswalk.rows[0][0], "Leadership and oversight");
  assertEquals(crosswalk.rows[0][1], "The DPO determination is evidenced on the company's answers");
  // The closing sentence is its own paragraph, after the table, not glued
  // onto the last crosswalk line.
  const sec = out.document.sections.find((s) => s.id === "ico_crosswalk")!;
  const last = sec.paragraphs[sec.paragraphs.length - 1];
  assert(last.kind !== "table");
  assertStringIncludes(last.text, "The headline Article 5(2)/24(1) determination above is");
  assert(!last.text.includes("Breach response and monitoring"), "crosswalk lines must not remain in the prose block");
});

const LIA_INTAKE: Bag = {
  organizationName: "North Pole Manual Mining Ltd",
  jurisdictions: ["EU (GDPR)"],
  necessity_details: {
    alternatives: ["Manual patrols", "Motion-sensor lighting"],
    alternatives_rationale: "Manual patrols: cannot cover the full shaft network continuously. Motion-sensor lighting: does not identify unsafe behaviour.",
    why_consent_not_used: "employees cannot freely refuse consent in the employment relationship",
  },
};

function liaReport(): Bag {
  const alt = buildAlternativesConsidered(LIA_INTAKE) as unknown as Bag;
  return {
    alternatives_considered: alt,
    three_part_test: {
      purpose_test: { verdict: "passes" },
      necessity_test: { verdict: "passes", analysis: String(alt.application) },
      balancing_test: {
        verdict: "likely_passes",
        analysis: "Weighed on the record, the balance favours the controller.",
        factors: [
          { factor: "Reasonable expectations", direction: "controller", reasoning: "Workers expect safety monitoring underground. Further detail follows." },
          { factor: "Potential harms and severity", direction: "neutral", reasoning: "The worst-case impact recorded is minor inconvenience." },
          { factor: "Opt-out and mitigations", direction: "data_subject", reasoning: "No opt-out is recorded." },
        ],
      },
    },
    lia_determination: { outcome: "legitimate_interests_available", why: "All three tests are met on the record." },
  };
}

Deno.test("C4/S5.3: the LIA alternatives table shows the comparison and the inline walk is retired", () => {
  const report = liaReport();
  const out = assembleLiaSkeletonDocument(report, LIA_INTAKE, { deterministic: true });
  const table = allTables(out.document).find((t) => t.title === "Alternatives considered");
  assertExists(table);
  assertEquals(table.columns, ["Alternative", "Why rejected"]);
  assert(table.rows.some((r) => r[0] === "Manual patrols" && r[1] === "Cannot cover the full shaft network continuously"));
  assert(table.rows.some((r) => r[0].startsWith("Obtaining consent")), "the consent row rides the typed comparison");
  const text = JSON.stringify(out.document);
  // The typed application stands alone — no inline semicolon walk, no
  // table pointer that would break on the legacy path.
  assertStringIncludes(text, "carries a recorded reason for being inadequate. The necessity limb is therefore supported by a comparison");
  assert(!text.includes("being inadequate: Manual patrols"), "the inline walk resurfaced");
  // Legacy path: no tables, and the application still reads as a sentence.
  const legacy = assembleLiaSkeletonDocument(report, LIA_INTAKE);
  assertEquals(allTables(legacy.document), []);
});

Deno.test("C4/S5.4+S5.5: the balance table reads the typed directions and the balancing block carries paragraph seams", () => {
  const out = assembleLiaSkeletonDocument(liaReport(), LIA_INTAKE, { deterministic: true });
  const table = allTables(out.document).find((t) => t.title === "Balance of interests");
  assertExists(table);
  assertEquals(table.columns, ["Factor", "Weighs toward", "Position on the record"]);
  assert(table.rows.some((r) => r[0] === "Reasonable expectations" && r[1] === "The controller's interest"));
  assert(table.rows.some((r) => r[0] === "Opt-out and mitigations" && r[1] === "The data subjects"));
  assert(table.rows.some((r) => r[1] === "Neutral or unresolved"));
  // S5.5 — the §IV composed block is paragraph-seamed, not one fused run.
  const balancing = out.document.sections.find((s) => s.id === "balancing_test")!;
  const gen = balancing.paragraphs.filter((p) => p.kind === "generated").map((p) => p.text).join("\n\n");
  assertStringIncludes(gen, "Weighed on the record, the balance favours the controller.");
});
