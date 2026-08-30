// FD703575 (quality batch, 2026-08-27) — Governance fixes.
// The batch's governance document (row cd8642d4, scored 74.35) carried three
// defect classes, each root-caused individually:
//   G1 §V remediation items rendered a bare duty slug ("demonstrability
//      Priority: High — …" nine times, indistinguishable) because the action
//      lookup matched the remediation record's Item-313 duty vocabulary
//      against the model domain findings' tool-usage vocabulary — vocabularies
//      that never intersect. Each item now names the source finding's label
//      and the gap (record_fact first sentence) it closes.
//   G2 the Art. 37(1)(b) trigger sentence listed EVERY data category and
//      asserted the whole set "is regular and systematic monitoring",
//      conflating categories held with the monitoring concept (flagged HIGH
//      as an unsupported claim). It now names only the monitoring-indicative
//      categories the limb actually tests.
//   G3 crosswalk rows rendered a bare "assessed with severity medium" five
//      times over; each row now carries the mapped domain's own recorded gap.
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleGovernanceSkeletonDocument } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import { buildDpoDetermination } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";

type Bag = Record<string, unknown>;

const INTAKE: Bag = {
  organization_name: "Halcyon Benefits Administration Ltd",
  sector: "Financial services",
  org_size: "251-1000",
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  data_categories: ["Contact details", "Employee records", "Communications content"],
};

function reportWithPlan(): Bag {
  return {
    readiness_determination: { rating: "not_evidenced", reasoning: "Duties are unevidenced." },
    accountability_determination: { verdict: "not_satisfied", reasoning: "Not evidenced." },
    dpo_determination: {},
    risk_calibration_finding: {},
    transfer_analysis: {},
    domain_findings: [
      { domain_name: "Internal Policy", severity: "medium", gap_description: "Employee instruction on tool use is verbal only; no written policy is recorded.", recommended_action: "Reduce the guidance to a written policy" },
      { domain_name: "Training", severity: "medium", current_state: "Onboarding training only." },
    ],
    domain_element_findings: [
      {
        key: "dpo_designation_trigger",
        domain: "dpo",
        label: "Article 37 designation trigger",
        record_fact: "The company has answered the DPO question with an informal privacy lead. Designation is mandatory here.",
      },
      {
        key: "demonstrability_art30",
        domain: "demonstrability",
        label: "Art. 30 record of processing",
        record_fact: "No register artifact is recorded for the Article 30 duty.",
      },
    ],
    remediation_plan: [
      { finding_key: "dpo_designation_trigger", domain: "dpo", priority: "High — remediate this quarter", accountable_owner: "Diane Okafor, Head of Compliance", target_date: "2025-09-30", validation_method: "Documentary evidence review" },
      { finding_key: "demonstrability_art30", domain: "demonstrability", priority: "High — remediate this quarter", accountable_owner: "Diane Okafor, Head of Compliance", target_date: "2025-09-30", validation_method: "Documentary evidence review" },
    ],
    executive_summary: "Accountability is not evidenced on the answers the company has given.",
  };
}

function text(report: Bag): string {
  return JSON.stringify(assembleGovernanceSkeletonDocument(report, INTAKE));
}

Deno.test("G1 — each remediation item names the finding's label and the gap it closes, never a bare duty slug", () => {
  const t = text(reportWithPlan());
  assertStringIncludes(t, "Article 37 designation trigger — The company has answered the DPO question with an informal privacy lead.");
  assertStringIncludes(t, "Art. 30 record of processing — No register artifact is recorded for the Article 30 duty.");
  // The bare-slug fallback ("1. demonstrability Priority: …") must be gone.
  assert(!/\d+\.\s*demonstrability Priority:/.test(t), "bare duty slug must not render as a remediation item");
});

Deno.test("G1 — a remediation record with no matching element finding still renders (fallback keeps the slug)", () => {
  const r = reportWithPlan();
  (r.remediation_plan as Bag[]).push({ finding_key: "unknown_key", domain: "international_transfers", priority: "High" });
  const t = text(r);
  // RE-PIN BATCH 20a (doc 113 S5.1): the fallback label is a Remediation
  // Register cell now, and cells carry an initial capital.
  assertStringIncludes(t, "International transfers");
});

Deno.test("G2 — a category-only record leaves Art. 37(1)(b) open instead of establishing it (D1D2B3B8-G1 supersedes)", () => {
  // D1D2B3B8-G1 (2026-08-28) supersedes the fd703575 pin: the batch after
  // that fix flagged the reworded "(b) applies … indicates the regular and
  // systematic monitoring" HIGH twice — category presence still ESTABLISHED
  // the limb against an intake that records no monitoring of data subjects.
  // The intake has no monitoring question, so the limb can only be made
  // live, never established; the finding degrades honestly.
  const dpo = buildDpoDetermination({
    organization_name: "Halcyon Benefits Administration Ltd",
    sector: "Financial services",
    org_size: "251-1000",
    dpo_status: "Yes, informal privacy lead",
    data_categories: ["Contact details", "Employee records", "Customer records", "Financial data", "Communications content"],
    data_subject_scale: "251-1000",
  });
  const trigger = dpo.designation_trigger as unknown as Bag;
  const app = String(trigger.application);
  assert(!app.includes("(b) applies"), "limb (b) must never be asserted as applying on category presence alone");
  assert(!app.includes("Designation is mandatory here"), "no mandatory-designation claim on an open limb");
  assertStringIncludes(app, "Whether limb (b) is engaged is not answered on the information provided");
  assertStringIncludes(app, "Communications content");
  assert(!/\(b\)[^"]*Contact details/.test(app), "non-monitoring categories must not be cited for limb (b)");
  assertStringIncludes(app, "the prudent course is to treat designation as warranted");
  assertStringIncludes(String(trigger.verdict), "record_insufficient");
  assertStringIncludes(String(trigger.information_needed ?? ""), "regular and systematic monitoring of data subjects");
});

Deno.test("D1D2B3B8-G1 — an established limb still carries the mandatory conclusion, with limb (b) noted as open", () => {
  const dpo = buildDpoDetermination({
    organization_name: "Halcyon Benefits Administration Ltd",
    sector: "Healthcare",
    org_size: "251-1000",
    dpo_status: "Yes, formal DPO",
    data_categories: ["Health data", "Communications content"],
    special_category: "Yes",
    data_subject_scale: "251-1000",
  });
  const trigger = dpo.designation_trigger as unknown as Bag;
  const app = String(trigger.application);
  assertStringIncludes(app, "Designation is mandatory here");
  assertStringIncludes(app, "(c) applies");
  assertStringIncludes(app, "Nothing turns on the open limb");
});

Deno.test("G3 — a crosswalk severity row carries the domain's own recorded gap", () => {
  const t = text(reportWithPlan());
  // RE-PIN BATCH 20a (doc 113 S5.1/S5.2): the crosswalk lines and remediation-item fragments moved into table cells (cells initial-capped; label prefixes retired).
  assertStringIncludes(t, "Assessed with severity medium — Employee instruction on tool use is verbal only; no written policy is recorded");
});
