// GOVERNANCE UPGRADE (product 5) — generalised ICO-tracker findings +
// remediation component. Asserts the SHAPE LAW holds on every emitted
// finding and that remediation never invents an owner, date or priority.
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachGovernanceDeliverables,
  buildDomainElementFindings,
  buildGovernanceDeliverables,
  buildRemediationRecord,
  isAdverse,
} from "../../../supabase/functions/_shared/ltp/governance-deliverables/build.ts";
import {
  DOMAIN_LABELS,
  DOMAIN_TRACKER,
} from "../../../supabase/functions/_shared/ltp/governance-deliverables/elements.ts";
import { GOVERNANCE_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/governance.ts";

const thin = {
  organization_name: "Thin Records Ltd",
  sector: "Technology/SaaS",
  org_size: "51-250",
  jurisdictions: ["EU (GDPR)"],
  eu_uk_data: "Yes",
};

const rich = {
  ...thin,
  organization_name: "Calder Health Analytics Ltd",
  sector: "Healthcare/Life Sciences",
  org_size: "251-1000",
  data_categories: ["Employee records", "Customer records", "Health or medical data"],
  special_category: "Yes",
  special_categories_list: ["Health data"],
  privacy_policy: "Yes, current (reviewed in last 12 months)",
  dpo_status: "Yes, formal DPO",
  dpia_status: "Yes, one DPIA completed",
  training_status: "Yes, formal onboarding + annual refresh",
  dpa_status: "Yes, all vendors",
  technical_controls: "Yes — DLP/content filtering actively enforced",
  incident_response: "Yes, tested in last 12 months",
  dsr_capability: "Yes — documented and tested across all vendors",
  inventory_audit: "Yes — audited + formal approval process",
  transfer_status: "Yes, US-based tools",
  transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
  measures_review_cadence: "Annually or more often",
  measures_last_review_date: "2026-03-17",
  remediation_defaults: {
    accountable_owner: "Head of Privacy",
    target_date: "2026-12-31",
    priority: "Medium — remediate this year",
  },
  remediation_plan: [
    {
      finding_key: "record_of_processing",
      accountable_owner: "Records Manager",
      target_date: "2026-09-30",
      priority: "High — remediate this quarter",
      validation_method: "Sample testing of the record against live systems",
    },
  ],
};

Deno.test("every domain finding carries the four-part shape and tracker metadata", () => {
  const built = buildGovernanceDeliverables(rich);
  assert(built.domain_element_findings.length > 10);
  for (const f of built.domain_element_findings) {
    assert(f.key, "finding has a key");
    assert(f.citation, `${f.key}: citation present`);
    assert(f.standard, `${f.key}: verbatim standard present`);
    assert(f.record_fact, `${f.key}: record fact present`);
    assert(f.application, `${f.key}: application present`);
    assert(f.verdict, `${f.key}: verdict present`);
    assertEquals(f.domain_label, DOMAIN_LABELS[f.domain]);
    assertEquals(f.regulator_expectation, DOMAIN_TRACKER[f.domain].regulator_expectation);
    assert(f.control_question.length > 10, `${f.key}: control question present`);
    assert(f.customer_answer.length > 0, `${f.key}: customer answer present`);
    assert(f.evidence_reviewed.length > 0, `${f.key}: evidence line present`);
    if (f.status === "record_insufficient") {
      assert(f.information_needed, `${f.key}: record_insufficient names what is needed`);
    }
  }
});

Deno.test("every domain in the tracker registry is reachable", () => {
  const seen = new Set(buildGovernanceDeliverables(rich).domain_element_findings.map((f) => f.domain));
  for (const d of Object.keys(DOMAIN_LABELS)) {
    assert(seen.has(d as never), `domain not emitted: ${d}`);
  }
});

Deno.test("remediation attaches to every adverse finding and to no satisfied finding", () => {
  const built = buildGovernanceDeliverables(thin);
  for (const f of built.domain_element_findings) {
    if (isAdverse(f.verdict)) {
      assert(f.remediation, `${f.key}: adverse finding must carry remediation`);
      assertEquals(f.remediation?.finding_key, f.key);
      assertEquals(f.remediation?.domain, f.domain);
    } else {
      assertEquals(f.remediation, undefined, `${f.key}: non-adverse finding must not carry remediation`);
    }
  }
  assertEquals(
    built.remediation_plan.length,
    built.domain_element_findings.filter((f) => isAdverse(f.verdict)).length,
  );
});

Deno.test("remediation never invents an owner, date or priority", () => {
  const r = buildRemediationRecord("record_of_processing", "records_of_processing", thin);
  assertEquals(r.accountable_owner, "");
  assertEquals(r.target_date, "");
  assertEquals(r.priority, "unspecified");
  assertEquals(r.status, "record_insufficient");
  assert(r.information_needed?.includes("accountable owner"));
  assertEquals(r.validation_method_source, "default");
});

Deno.test("per-finding remediation overrides the recorded defaults", () => {
  const r = buildRemediationRecord("record_of_processing", "records_of_processing", rich);
  assertEquals(r.accountable_owner, "Records Manager");
  assertEquals(r.target_date, "2026-09-30");
  assertEquals(r.priority, "High — remediate this quarter");
  assertEquals(r.validation_method_source, "recorded");
  assertEquals(r.status, "analysed");

  const fallback = buildRemediationRecord("training", "demonstrability", rich);
  assertEquals(fallback.accountable_owner, "Head of Privacy");
  assertEquals(fallback.target_date, "2026-12-31");
  assertEquals(fallback.priority, "Medium — remediate this year");
  assertEquals(fallback.validation_method_source, "default");
  assertEquals(fallback.status, "analysed");
});

Deno.test("thin record degrades to record_insufficient rather than fabricating", () => {
  const built = buildGovernanceDeliverables(thin);
  const insufficient = built.domain_element_findings.filter((f) => f.status === "record_insufficient");
  assert(insufficient.length > 0, "thin record produces record_insufficient findings");
  for (const f of insufficient) assert(f.information_needed);
});

Deno.test("attach is single-writer, fail-open, and reports tracker telemetry", () => {
  const report: Record<string, unknown> = { overall_readiness_rating: "Developing" };
  const meta = attachGovernanceDeliverables(report, rich) as Record<string, unknown>;
  assertEquals(meta.ok, true);
  assert(Array.isArray(report.domain_element_findings));
  assert(Array.isArray(report.remediation_plan));
  assertEquals(
    (report.domain_element_findings as unknown[]).length,
    meta.domain_findings_total,
  );
  assertEquals(report.overall_readiness_rating, undefined);
  assert(report.maturity_tier_readability_aid, "tier demoted, not deleted");
});

Deno.test("report schema allow-lists the new deliverables", () => {
  for (const key of ["domain_element_findings", "remediation_plan", "transfer_analysis"]) {
    assert(GOVERNANCE_REPORT_SCHEMA.topLevel.includes(key), `schema missing ${key}`);
  }
});

Deno.test("buildDomainElementFindings is a pure projection of existing verdicts", () => {
  const built = buildGovernanceDeliverables(rich);
  const projected = buildDomainElementFindings(rich, {
    accountability: built.accountability_determination,
    demonstrability: built.demonstrability_findings,
    art30: built.art30_element_findings,
    art30Exemption: built.art30_exemption_determination,
    dpo: built.dpo_determination,
    riskCalibration: built.risk_calibration_finding,
    review: built.review_and_update_finding,
    transfers: built.transfer_analysis,
  });
  assertEquals(
    projected.map((f) => `${f.key}:${f.verdict}`),
    built.domain_element_findings.map((f) => `${f.key}:${f.verdict}`),
  );
});

// ── GOVERNANCE UPGRADE ITEM 5 — CORPUS + AUTHORITY EXHIBIT ─────────────
import {
  buildGovernanceCorpusLawBlock,
  fetchGovernanceCorpus,
  GOVERNANCE_CORPUS_KEYS,
  governanceCorpusProvisionsForExhibit,
  isAllowedGovernanceCitation,
} from "../../../supabase/functions/_shared/ltp/governance-corpus.ts";
import { buildAuthorityExhibit } from "../../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";

const CORPUS_FIXTURE = {
  version: "test",
  resolved_count: 2,
  approved_count: 1,
  provisions: [
    {
      key: "gdpr-art-5-2",
      citation: "GDPR Art. 5(2) (Regulation (EU) 2016/679, CELEX 32016R0679)",
      status: "approved" as const,
      verbatim_excerpt: "APPROVED CORPUS TEXT FOR ART 5(2)",
      plain_requirements: ["demonstrate compliance with the principles"],
    },
    {
      key: "gdpr-art-30",
      citation: "GDPR Art. 30",
      status: "pending" as const,
      verbatim_excerpt: "",
      plain_requirements: [],
    },
  ],
};

Deno.test("corpus spine covers Arts. 5(2), 24, 30 and 37-39", () => {
  assertEquals([...GOVERNANCE_CORPUS_KEYS].sort(), [
    "gdpr-art-24",
    "gdpr-art-30",
    "gdpr-art-37",
    "gdpr-art-38",
    "gdpr-art-39",
    "gdpr-art-5-2",
  ].sort());
});

Deno.test("law block quotes approved rows only and degrades honestly", () => {
  const block = buildGovernanceCorpusLawBlock(CORPUS_FIXTURE as never);
  assert(block.includes("APPROVED CORPUS TEXT FOR ART 5(2)"));
  assert(block.includes("CITATION ONLY"));
  assert(/ICO/i.test(block), "ICO material is explicitly marked as non-authority");
  const empty = buildGovernanceCorpusLawBlock({
    version: "t", provisions: [], resolved_count: 0, approved_count: 0,
  } as never);
  assert(empty.includes("UNAVAILABLE"));
});

Deno.test("no statutory text is compiled into the corpus module", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/_shared/ltp/governance-corpus.ts", import.meta.url),
  );
  assert(!/personal data shall be/i.test(src));
  assert(!/The controller shall be responsible for/i.test(src));
});

Deno.test("resolver miss degrades to an empty corpus rather than throwing", async () => {
  const corpus = await fetchGovernanceCorpus(null);
  assertEquals(corpus.provisions.length, 0);
});

Deno.test("ICO framework language can never be an approved governance citation", () => {
  assert(isAllowedGovernanceCitation("GDPR Art. 5(2)", CORPUS_FIXTURE as never));
  assert(!isAllowedGovernanceCitation("GDPR Art. 30", CORPUS_FIXTURE as never));
  assert(!isAllowedGovernanceCitation(
    "ICO Data Protection Audit Framework (Oct 2024)", CORPUS_FIXTURE as never));
  assert(!isAllowedGovernanceCitation("accountability toolkit", CORPUS_FIXTURE as never));
});

Deno.test("authority exhibit excerpts only approved corpus rows", () => {
  const exhibit = buildAuthorityExhibit(
    ["GDPR Art. 5(2)", "GDPR Art. 30"],
    governanceCorpusProvisionsForExhibit(CORPUS_FIXTURE as never) as never,
  );
  assertEquals(exhibit.entries.length, 2);
  const withText = exhibit.entries.filter((e) => e.excerpt);
  assertEquals(withText.length, 1);
  assertEquals(withText[0].corpus_key, "gdpr-art-5-2");
});

Deno.test("report schema allow-lists the authority exhibit", () => {
  assert(GOVERNANCE_REPORT_SCHEMA.topLevel.includes("authority_exhibit"));
});
