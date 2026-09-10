// BATCH 916c33a8 (2026-09-10) — Velostream Digital Inc. Cyber (316ec4bd,
// 92/95). Four components were "Documented, partially implemented" and two
// of their descriptions named the same system — "all DSP sub-processor
// integrations added in 2024" (c4 inventory) and "legacy outbound rules for
// deprecated DSP integrations" (c11 ports) — yet § 4 said "no single system
// or facility recurs across the Company's descriptions". The n ≥ 3 floor
// (3E9AD759-CY2) never counted a two-of-four recurrence. The controls below
// are the batch's own rows.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { buildCrossCutting } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts";
import { buildCyberComponentRecommendations } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { CYBER_7123_COMPONENTS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/components.ts";

type Bag = Record<string, unknown>;

const PARTIAL: Record<string, string> = {
  c4_inventory: "A data inventory covering primary processing systems exists but does not yet include all DSP sub-processor integrations added in 2024.",
  c11_port_protocol: "Firewall rules restrict inbound access to approved ports; however, a recent audit identified legacy outbound rules for deprecated DSP integrations that have not yet been removed.",
  c14_secure_dev: "SAST tools are integrated into the CI/CD pipeline for backend services, but coverage of the ad-serving microservices is incomplete following a platform migration.",
  c15_third_party: "SOC 2 reports and security questionnaires are collected annually from tier-1 vendors; the audience enrichment vendor has not yet returned a completed questionnaire for the current year.",
};

function velostream(partialNotes: Record<string, string> = PARTIAL): Bag {
  return {
    profile: {
      entity_name: "Velostream Digital Inc.",
      industry: "Online & Web Services / Media",
      framework: "SOC 2",
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q5_sell_share: "Both",
      q5c_share_revenue_50pct: "No",
      q15_sensitive_pi: "Yes",
      q15c_spi_volume: "50,000 or more",
      last_audit: "Within 12 months",
      incidents_12mo: "1",
      in_scope_frameworks: ["SOC 2", "NIST CSF"],
      prior_audit_scope: "SOC 2 Type II audit completed April 2024 covering availability, confidentiality, and security trust service criteria for the Velostream streaming platform and behavioral data pipeline.",
      audit_scope_rationale: "SOC 2 Type II covers the core streaming platform infrastructure and data pipelines; NIST CSF is used as the internal control mapping reference for the cybersecurity program.",
      auditor_engagement_status: "External auditor engaged, independence confirmed in writing",
      remediation_owner: "Marcus Ellroy, VP Engineering & Data",
      password_auth_used: "Yes",
      incident_notifications: "Affected consumers were notified (Civ. Code § 1798.82(a))",
    },
    controls: CYBER_7123_COMPONENTS.map((c) => ({
      key: c.slug,
      label: c.label,
      maturity: partialNotes[c.slug] ? "Documented, partially implemented" : "Implemented across organization",
      notes: partialNotes[c.slug] ?? `Documented ${c.label} controls operated by the security team with quarterly review.`,
      evidence: partialNotes[c.slug]
        ? ["Policy / procedure document", "Sample log / report"]
        : ["Policy / procedure document", "SOC 2 or auditor letter", "Screenshot / config export"],
      na_reason: "",
    })),
  };
}

// The edge function attaches the component recommendations under
// _meta.internal.cyber_recommendations; the assembler reads them from there
// (cyber-skeleton-assemble-v4.ts ~L539), so the test does the same.
function section4(intake: Bag): string {
  const d = buildCyberDeliverables(intake) as unknown as Bag;
  const recommendations = buildCyberComponentRecommendations(
    d.component_coverage as never,
    d.evidence_sufficiency as never,
  );
  const report = { ...d, _meta: { internal: { cyber_recommendations: { recommendations, next_steps: [] } } } };
  const text = skeletonDocumentToText(assembleCyberSkeletonDocumentV4(report as never, intake, "", "2026-09-10").document);
  const direct = buildCrossCutting(intake, d as never, recommendations).cross_component_findings;
  assertStringIncludes(text, direct, "the rendered § 4 carries the factor's own sentence");
  return text;
}

Deno.test("916c33a8 CYB-1 — a system named in two of four gapped descriptions is named, and the pair is said to share an origin", () => {
  const text = section4(velostream());
  assertStringIncludes(
    text,
    "Across the 4 components with implementation gaps (0 not implemented, 4 partially implemented), the Company's own descriptions recur on DSP (named in 2 of the gapped descriptions), so those gaps share an origin and close together; the remaining gaps are component-specific in origin and close independently.",
  );
  assert(!text.includes("no single system or facility recurs"), "the contradicted sentence must not render");
  assert(!text.includes("closing the shared surface closes several components at once"), "a two-of-four recurrence never takes the concentration claim");
});

Deno.test("916c33a8 CYB-1 — with no term in two descriptions the component-specific sentence is byte-unchanged", () => {
  const notes = { ...PARTIAL, c11_port_protocol: "Firewall rules restrict inbound access to approved ports; however, a recent audit identified legacy outbound rules for deprecated integrations that have not yet been removed." };
  const text = section4(velostream(notes));
  assertStringIncludes(
    text,
    "Across the 4 components with implementation gaps (0 not implemented, 4 partially implemented), no single system or facility recurs across the Company's descriptions; the gaps are component-specific in origin and close independently.",
  );
});

Deno.test("916c33a8 CYB-1 — a term recurring three or more times keeps the 3E9AD759-CY2 concentration sentence", () => {
  const notes = { ...PARTIAL, c15_third_party: "SOC 2 reports are collected annually from tier-1 vendors; the DSP audience enrichment vendor has not yet returned a completed questionnaire." };
  const text = section4(velostream(notes));
  assertStringIncludes(text, "the Company's own descriptions recur on DSP (named in 3 of the gapped descriptions). The gaps concentrate on shared systems and facilities rather than isolated misses, and closing the shared surface closes several components at once.");
});

Deno.test("916c33a8 CYB-1 — with more than four gapped components a two-count recurrence still does not qualify", () => {
  const notes = {
    ...PARTIAL,
    c6_vuln_mgmt: "Scanning runs weekly; remediation SLAs are not yet enforced.",
    c9_anti_malware: "EDR is deployed on corporate endpoints; cloud VMs are not yet covered.",
  };
  const text = section4(velostream(notes));
  assertStringIncludes(text, "Across the 6 components with implementation gaps (0 not implemented, 6 partially implemented), no single system or facility recurs across the Company's descriptions");
});
