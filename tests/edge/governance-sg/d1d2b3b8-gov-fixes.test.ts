// D1D2B3B8 (quality batch, 2026-08-27) — Governance fixes beyond the G1
// limb-(b) supersession (tested in fd703575-gov-fixes.test.ts):
//   G2 [MEDIUM ×3 docs] a remediation item whose duty-vocabulary domain never
//      matches a model domain finding rendered no Action line — the item
//      restated the intake answer with nothing to DO. The Action now falls
//      back to the element finding's information_needed (the closure act for
//      a record-completion item).
//   G3 [MEDIUM] the Chapter V transfers analysis stated the jurisdictions
//      but never named the recorded tools whose transfer legs the
//      organisation-level answer has to cover.
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleGovernanceSkeletonDocument } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import { buildTransferAnalysis } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";

type Bag = Record<string, unknown>;

const INTAKE: Bag = {
  organization_name: "Halcyon Benefits Administration Ltd",
  sector: "Financial services",
  org_size: "251-1000",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Contact details", "Employee records"],
};

Deno.test("G2 — an item with no domain action falls back to the element's information_needed as its Action", () => {
  const report: Bag = {
    readiness_determination: { rating: "not_evidenced", reasoning: "Duties are unevidenced." },
    accountability_determination: { verdict: "not_satisfied", reasoning: "Not evidenced." },
    dpo_determination: {},
    risk_calibration_finding: {},
    transfer_analysis: {},
    domain_findings: [],
    domain_element_findings: [
      {
        key: "ropa_retention",
        domain: "art30",
        label: "Envisaged retention time limits",
        record_fact: "The record carries nothing on this element.",
        information_needed: "State the envisaged retention time limit for each category of personal data, or the criteria used to determine it.",
      },
    ],
    remediation_plan: [
      { finding_key: "ropa_retention", domain: "art30", priority: "High — remediate this quarter", accountable_owner: "Diane Okafor", target_date: "2026-11-30", validation_method: "Documentary evidence review" },
    ],
    executive_summary: "Accountability is not evidenced on the answers the company has given.",
  };
  const t = JSON.stringify(assembleGovernanceSkeletonDocument(report, INTAKE));
  assertStringIncludes(t, "Envisaged retention time limits — The record carries nothing on this element.");
  assertStringIncludes(t, "Action: State the envisaged retention time limit for each category of personal data");
});

Deno.test("G3 — an open transfer leg names the recorded tools the organisation-level answer must cover", () => {
  const ta = buildTransferAnalysis({
    jurisdictions: ["EU (GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "Standard Contractual Clauses (SCCs)",
    tools: ["Slack", "Notion", "Grammarly"],
  }) as unknown as Bag;
  const app = String(ta.application);
  assertStringIncludes(app, "Slack, Notion, Grammarly");
  assertStringIncludes(app, "at organisation level, not per tool");
});

Deno.test("G3 — a satisfied or non-occurring leg carries no tools clause", () => {
  const ta = buildTransferAnalysis({
    jurisdictions: ["EU (GDPR)"],
    transfer_status: "All tools store data in EU/UK",
    tools: ["Slack", "Notion"],
  }) as unknown as Bag;
  const app = String(ta.application);
  assert(!app.includes("at organisation level, not per tool"), "no tools clause when no transfer is occurring");
});
