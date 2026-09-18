// DOC 263 RUN 3 (2026-09-17, batch 3edc00df) — Governance fixes from the
// paid-review batch on Castleforth Capital Partners Ltd
// (governance-p03-investment-bank-multistate-gb):
//   G1 [executive_summary:3] the scoreboard's "Domains not fully evidenced"
//      count now matches composeExecutiveSummaryTyped's "N of the ten fully
//      evidenced" sentence exactly (both count Compliant-only as "fully
//      evidenced"), fixing a run-2 fix that still special-cased a Medium/Low
//      "point to watch" domain as evidenced in one count but not the other.
//   G2 [ico_crosswalk:2] the crosswalk's headline row now reads the
//      readiness determination's own bucket (the SAME bucket
//      the_determination:0 prints) instead of the raw, narrower
//      accountability_determination.verdict.
//   G3 [governance_infrastructure:3] a monitoring / DPO-reporting-line /
//      other-duties mention in the record's own free text (no typed field
//      exists for any of the three) is now acknowledged with a quote,
//      never read as the record being silent.
//   G4 [processors_and_transfers:2] the Art. 46(1A) safeguards sentence now
//      states BOTH alternative limbs — (a)(i) Commissioner approval, (a)(ii)
//      the exporter's own judgement — instead of the exporter's judgement
//      alone as a general condition.
//   G5 [processors_and_transfers:2, the_determination:2] "no executed
//      mechanism = no lawful route" overstated the law (adequacy needs no
//      executed mechanism); both sentences now name adequacy as an
//      alternative route.
//   G6 [training_tools_controls:2] "a notifiable-breach scenario" overstated
//      Art. 33(1); restated as an assessment duty with the Art. 34(1)
//      data-subject threshold named separately.
//   G7 [table_of_authorities:0] the table now includes every citation the
//      report's own determinations rely on, not just what a bare-article
//      body-text regex can recover.
import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDpoDetermination,
  buildTransferAnalysis,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { buildDomainFindingsTyped } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts";
import {
  assembleGovernanceSkeletonDocument,
  deriveGovernanceScoreboard,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

// ── G1 ──────────────────────────────────────────────────────────────────────

Deno.test("doc263 run 3 G1 — 'Domains not fully evidenced' counts every non-Compliant domain, matching composeExecutiveSummaryTyped's Compliant-only 'fully evidenced' count", () => {
  // Mirrors the Castleforth shape that exposed the bug: nine Compliant
  // domains and one Medium domain with NO recorded gap (a "point to watch",
  // composeExecutiveSummaryTyped's own `noted` bucket — evidenced, but not
  // counted in its "N of the ten fully evidenced" sentence).
  const domain_findings: Bag = {};
  for (let i = 0; i < 9; i++) {
    domain_findings[`d${i}`] = { domain: `d${i}`, domain_name: `Domain ${i}`, severity: "Compliant", gap_description: null };
  }
  domain_findings["d9"] = { domain: "d9", domain_name: "Regulatory Exposure Summary", severity: "Medium", gap_description: null };
  const table = deriveGovernanceScoreboard({ domain_findings });
  assertExists(table);
  const row = table!.rows.find((r) => r[0] === "Domains not fully evidenced");
  assertExists(row);
  assertEquals(row![1], "1 of 10");
});

Deno.test("doc263 run 3 G1 — a fully-Compliant record reads '0 of 10' (no false positives introduced)", () => {
  const domain_findings: Bag = {};
  for (let i = 0; i < 10; i++) {
    domain_findings[`d${i}`] = { domain: `d${i}`, domain_name: `Domain ${i}`, severity: "Compliant", gap_description: null };
  }
  const table = deriveGovernanceScoreboard({ domain_findings });
  const row = table!.rows.find((r) => r[0] === "Domains not fully evidenced");
  assertEquals(row![1], "0 of 10");
});

// ── G2 ──────────────────────────────────────────────────────────────────────

Deno.test("doc263 run 3 G2 — the ICO crosswalk headline reads readiness_determination.rating, not the narrower accountability_determination.verdict", () => {
  const report: Bag = {
    readiness_determination: { rating: "Partly evidenced" },
    accountability_determination: { verdict: "satisfied" },
    dpo_determination: { verdict: "record_insufficient" },
    transfer_analysis: { regime: "not_engaged" },
    domain_findings: [],
  };
  const res = assembleGovernanceSkeletonDocument(report, { organization_name: "Halcyon Ltd", jurisdictions: ["United Kingdom"] });
  const sec = res.document.sections.find((s) => s.id === "ico_crosswalk")!;
  const last = sec.paragraphs[sec.paragraphs.length - 1] as Bag;
  const text = String(last.text ?? "");
  assertStringIncludes(text, "partly evidenced on the information provided");
  assert(!text.includes("is evidenced on the information provided"), "must not print the raw 'satisfied' verdict as a blanket 'evidenced'");
});

Deno.test("doc263 run 3 G2 — falls back to the raw verdict when no readiness_determination is attached (legacy callers unaffected)", () => {
  const report: Bag = {
    accountability_determination: { verdict: "partially_satisfied" },
    transfer_analysis: { regime: "not_engaged" },
    domain_findings: [],
  };
  const res = assembleGovernanceSkeletonDocument(report, { organization_name: "Halcyon Ltd", jurisdictions: ["United Kingdom"] });
  const sec = res.document.sections.find((s) => s.id === "ico_crosswalk")!;
  const last = sec.paragraphs[sec.paragraphs.length - 1] as Bag;
  assertStringIncludes(String(last.text ?? ""), "partly evidenced on the information provided");
});

// ── G3 ──────────────────────────────────────────────────────────────────────

Deno.test("doc263 run 3 G3a — a monitoring mention in processing_purposes/processing_context is quoted, never read as silence", () => {
  const intake: Bag = {
    dpo_status: "Yes, formal DPO",
    org_size: "1001+",
    data_categories: ["Communications content"],
    processing_purposes:
      "Investment advisory service delivery, regulatory reporting to the FCA and SEC, and fraud/market-abuse monitoring; no client data is used for unrelated marketing.",
    processing_context:
      "Employees are subject to enhanced financial-conduct monitoring obligations that are disclosed at onboarding.",
  };
  const dpo = buildDpoDetermination(intake) as unknown as Bag;
  const app = String((dpo.designation_trigger as Bag).application);
  assert(
    !app.includes("the information provided does not state whether any core activity operates as such monitoring"),
    "must not claim silence once the narrative names monitoring",
  );
  assertStringIncludes(app, "the record's narrative mentions");
  assertStringIncludes(app, "fraud/market-abuse monitoring");
  assertStringIncludes(app, "carried under information needed rather than read as silence");
});

Deno.test("doc263 run 3 G3a — no monitoring mention keeps the original silence sentence (no regression for the other 14 panel fixtures)", () => {
  const intake: Bag = {
    dpo_status: "Yes, formal DPO",
    org_size: "1001+",
    data_categories: ["Communications content"],
  };
  const dpo = buildDpoDetermination(intake) as unknown as Bag;
  const app = String((dpo.designation_trigger as Bag).application);
  assertStringIncludes(app, "the information provided does not state whether any core activity operates as such monitoring");
});

Deno.test("doc263 run 3 G3b — a reporting-line / other-duties mention in additional_context is quoted, never read as absent", () => {
  const intake: Bag = {
    dpo_status: "Yes, formal DPO",
    additional_context:
      "The Data Protection Officer reports directly to the Chief Risk Officer and holds no conflicting operational role, satisfying Art. 38(6); the compliance committee reviews the DPO's report quarterly.",
  };
  const dpo = buildDpoDetermination(intake) as unknown as Bag;
  const app = String((dpo.position_and_independence as Bag).application);
  assert(
    !app.includes("its absence is not read as a shortfall, and it is equally not presumed satisfied"),
    "must not claim absence once the narrative names the reporting line",
  );
  assertStringIncludes(app, "The record's narrative mentions the operating detail");
  assertStringIncludes(app, "reports directly to the Chief Risk Officer");
  assertStringIncludes(app, "carried under information needed rather than read as absent");
});

Deno.test("doc263 run 3 G3b — no such mention keeps the original not-requested sentence", () => {
  const intake: Bag = { dpo_status: "Yes, formal DPO" };
  const dpo = buildDpoDetermination(intake) as unknown as Bag;
  const app = String((dpo.position_and_independence as Bag).application);
  assertStringIncludes(app, "its absence is not read as a shortfall, and it is equally not presumed satisfied");
});

// ── G4 ──────────────────────────────────────────────────────────────────────

Deno.test("doc263 run 3 G4 — the Art. 46(1A) sentence states both alternative limbs, not the exporter's judgement as a general condition", () => {
  const ta = buildTransferAnalysis({
    jurisdictions: ["United Kingdom (UK GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "UK IDTA",
  }) as unknown as Bag;
  const app = String(ta.application);
  assert(
    !app.includes("where the listed safeguards are provided and the exporter itself judges the data protection test met."),
    "must not state the exporter's own judgement as the sole condition",
  );
  assertStringIncludes(
    app,
    "where the listed safeguards are provided and either the Commissioner has approved them or the exporter itself judges the data protection test met (Art. 46(1A)(a)(i)–(ii), alternative limbs)",
  );
});

// ── G5 ──────────────────────────────────────────────────────────────────────

Deno.test("doc263 run 3 G5a — an open UK leg's remediation action offers adequacy first, not an executed mechanism as the only route", () => {
  const ta = buildTransferAnalysis({
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
  }) as unknown as Bag;
  const info = String(ta.information_needed ?? "");
  assert(
    !info.includes("adopt and execute the IDTA or the Addendum as executed and the exporter's own Article 46(6) assessment before that leg has any lawful route"),
    "must not treat the executed mechanism as the only route for the open UK leg",
  );
  assertStringIncludes(info, "either confirm the destination is covered by UK adequacy regulations");
  assertStringIncludes(info, "until one of those is in place the leg has no lawful route");
});

Deno.test("doc263 run 3 G5b — the per-tool transfer-legs sentence names adequacy as an alternative to an executed mechanism", () => {
  const ta = buildTransferAnalysis({
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
    tools: ["Salesforce + Einstein"],
  }) as unknown as Bag;
  const app = String(ta.application);
  assert(
    !app.includes("A leg without an executed mechanism has no lawful route under the chapter identified for it."),
    "must not overstate adequacy as requiring an executed mechanism",
  );
  assertStringIncludes(app, "leg covered neither by adequacy regulations nor by an executed mechanism has no lawful route under the chapter identified for it.");
});

// ── G6 ──────────────────────────────────────────────────────────────────────

Deno.test("doc263 run 3 G6 — the tested-incident-response action states the Art. 33(1)/34(1) thresholds instead of a blanket notifiable-breach claim", () => {
  const domains = buildDomainFindingsTyped({ incident_response: "Yes, tested in last 12 months" }) as unknown as Bag;
  const finding = domains["incident_response"] as Bag;
  const action = String(finding.recommended_action);
  assert(!action.includes("as a notifiable-breach scenario"), "must not overstate every exposure as automatically notifiable");
  assertStringIncludes(action, "personal data breach to be assessed for notification under Art. 33(1)");
  assertStringIncludes(action, "unless the breach is unlikely to result in a risk to individuals");
  assertStringIncludes(action, "to the data subjects where a high risk is likely, Art. 34(1)");
});

// ── G7 ──────────────────────────────────────────────────────────────────────

Deno.test("doc263 run 3 G7 — the Table of Authorities includes every provision the report's own determinations rely on", () => {
  const report: Bag = {
    readiness_determination: { rating: "Partly evidenced" },
    accountability_determination: { verdict: "satisfied" },
    dpo_determination: {
      designation_trigger: { verdict: "not_applicable" },
      position_and_independence: { verdict: "satisfied" },
      task_coverage: { verdict: "satisfied" },
    },
    transfer_analysis: {
      regime: "uk",
      citations_used: [
        "UK GDPR Art. 44A(1)",
        "UK GDPR Art. 44A(2)(a)",
        "UK GDPR Art. 44A(2)(b)",
        "Data Protection Act 2018, s. 119A(1)",
        "Data Protection Act 2018, s. 119A(4)",
      ],
    },
    domain_findings: [],
    art30_element_findings: [{ element: "a", verdict: "satisfied" }],
  };
  const res = assembleGovernanceSkeletonDocument(report, { organization_name: "Halcyon Ltd", jurisdictions: ["United Kingdom"] });
  const sec = res.document.sections.find((s) => s.id === "table_of_authorities")!;
  const text = sec.paragraphs.map((p) => String((p as Bag).text ?? "")).join("\n");
  for (
    const citation of [
      "UK GDPR Art. 44A(2)(a)",
      "UK GDPR Art. 44A(2)(b)",
      "Data Protection Act 2018, s. 119A(1)",
      "Data Protection Act 2018, s. 119A(4)",
      "GDPR Art. 37(1)(b)",
      "GDPR Art. 38(6)",
      "GDPR Art. 30(1)",
    ]
  ) {
    assertStringIncludes(text, citation);
  }
});
