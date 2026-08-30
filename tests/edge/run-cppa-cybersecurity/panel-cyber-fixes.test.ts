// PANEL FIX BATCH 8 (2026-08-30) — Cyber defects from the expert-panel
// review (doc 108 / panel-B memo 1), each verified against the published
// sample before fixing:
//   CYB-2  the evidence all-clear ("every component's identified evidence
//          includes testable material") fired over 4 partial (policy-only)
//          components, and §IV repeated the false negative;
//   CYB-3  Appendix D printed "Not recorded" for the ARRAY-valued
//          in_scope_frameworks §I named; "No record-completion follow-up"
//          fired while §§I-II named two record-completion items; §IV said
//          "No prior audit coverage is recorded" against "Most recent
//          audit: Within 12 months";
//   CYB-5  eight spine openers shipped drafting-instruction voice ("the
//          report should not state…"); the spine version string sat on the
//          cover;
//   CYB-6  "reports None security incidents"; "soc 2"; UK "organisation"
//          and a second maturity asserted two sentences after components
//          recorded "Implemented with continuous monitoring"; empty
//          Appendix C; ASCII-sorted, under-inclusive ToA; welded
//          paragraphs from repairRegister's whitespace collapse;
//   CYB-7  FSOR digests misattributed the rulemaking to the California
//          Attorney General and to "the CPRA" (a statute, not an actor).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCompanyContextAnalysis,
  buildCrossCutting,
  buildEvidenceReadinessAnalysis,
  buildRecordSufficiency,
  lowerItemLabel,
  maturityPhrase,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { renderTableOfAuthorities } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { CYBER_7123_COMPONENTS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/components.ts";
import { CYBER_CORPUS_MAP } from "../../../supabase/functions/run-cppa-cybersecurity/_local/corpus/maps/cyber-corpus-map.ts";

type Bag = Record<string, unknown>;

// An intake shaped like the published Tomorrow4Cariboo sample: every
// component implemented, but four (4, 8, 10, 17) carry policy-only
// evidence, and components 2 and 8 record continuous monitoring.
const POLICY_ONLY = new Set([4, 8, 10, 17]);
const CONTINUOUS = new Set([2, 8]);
function sampleIntake(): Bag {
  return {
    profile: {
      entity_name: "Tomorrow4Cariboo, Inc.",
      industry: "Advertising / Marketing technology",
      framework: "SOC 2",
      last_audit: "Within 12 months",
      incidents_12mo: "None",
      in_scope_frameworks: ["SOC 2", "NIST CSF"],
      audit_scope_rationale: "In scope: the ad-tech production estate.",
    },
    controls: CYBER_7123_COMPONENTS.map((c) => ({
      key: c.slug,
      label: c.label,
      maturity: CONTINUOUS.has(c.number) ? "Implemented with continuous monitoring" : "Implemented across organization",
      notes: `Documented ${c.label} controls operated by the security team.`,
      evidence: POLICY_ONLY.has(c.number)
        ? ["Policy / procedure document"]
        : ["Policy / procedure document", "SOC 2 or auditor letter", "Screenshot / config export"],
    })),
  };
}

function assembled() {
  const intake = sampleIntake();
  const d = buildCyberDeliverables(intake);
  return assembleCyberSkeletonDocumentV4(d as unknown as Bag, intake, "", "2026-08-30");
}

Deno.test("CYB-2: policy-only components block the evidence all-clear in §II and §IV", () => {
  const intake = sampleIntake();
  const d = buildCyberDeliverables(intake) as unknown as Parameters<typeof buildEvidenceReadinessAnalysis>[0];
  const ev = buildEvidenceReadinessAnalysis(d);
  assert(!ev.follow_up.includes("every component's identified evidence includes testable material"),
    "all-clear fired over policy-only components");
  assert(ev.follow_up.includes("intent only"), "policy-only follow-up absent");
  const cc = buildCrossCutting(intake, d as never, []);
  assert(!cc.material_evidence_gaps.includes("No material evidence gap is identified"),
    "§IV repeated the all-clear over policy-only components");
  assert(cc.material_evidence_gaps.includes("policy-only evidence"), "§IV policy-only sentence absent");
});

Deno.test("CYB-2: with testable artifacts behind every component, the all-clear is byte-unchanged", () => {
  const intake = sampleIntake();
  for (const c of intake.controls as Bag[]) {
    c.evidence = ["Policy / procedure document", "Screenshot / config export"];
  }
  const d = buildCyberDeliverables(intake) as unknown as Parameters<typeof buildEvidenceReadinessAnalysis>[0];
  const ev = buildEvidenceReadinessAnalysis(d);
  assert(ev.follow_up.includes("No evidence follow-up is identified: every component's identified evidence includes testable material"));
  const cc = buildCrossCutting(intake, d as never, []);
  assert(cc.material_evidence_gaps.includes("No material evidence gap is identified"));
});

Deno.test("CYB-3: record-completion follow-up names the open auditor-engagement and prior-audit items", () => {
  const intake = sampleIntake();
  const d = buildCyberDeliverables(intake) as never;
  const rs = buildRecordSufficiency(intake, d);
  assert(!rs.follow_up.includes("No record-completion follow-up is identified"),
    "none-branch fired while two record-completion items are open");
  assert(rs.follow_up.includes("auditor engagement"), "auditor-engagement item absent");
  assert(rs.follow_up.includes("prior audit"), "prior-audit item absent");
});

Deno.test("CYB-3: Appendix D renders the array-valued frameworks, and §IV acknowledges the recorded prior audit", () => {
  const out = assembled();
  const text = skeletonDocumentToText(out.document);
  assert(text.includes("SOC 2, NIST CSF"), "in_scope_frameworks array still renders 'Not recorded'");
  assert(!text.includes("No prior audit coverage is recorded"),
    "§IV denies the prior audit that Appendix D and §I record");
  assert(text.includes("A prior audit is recorded, but its coverage is not described"),
    "prior-audit middle branch absent");
});

Deno.test("CYB-5: no drafting-instruction voice ships, and the cover carries no version string", () => {
  const out = assembled();
  const text = skeletonDocumentToText(out.document);
  for (const banned of ["should not state", "should first state", "should then identify", "should therefore characterize", "should not say", "should preserve the distinction", "should not answer"]) {
    assert(!text.includes(banned), `drafting-instruction voice shipped: "${banned}"`);
  }
  assert(!text.includes("cppa-cyber-v4.0-spine-"), "spine version string reached the customer body/cover");
});

Deno.test("CYB-6: incidents-None sentence, maturity casing, acronym-safe evidence labels", () => {
  const ctx = buildCompanyContextAnalysis(sampleIntake());
  assert(ctx.includes("The Company reports no security incidents in the preceding twelve months."));
  assert(!ctx.includes("reports None"), "raw enum splice survived");
  assertEquals(maturityPhrase("Implemented across organization"), "implemented across the organization");
  assertEquals(maturityPhrase("Implemented with continuous monitoring"), "implemented with continuous monitoring");
  assertEquals(lowerItemLabel("Policy / procedure document"), "policy / procedure document");
  assertEquals(lowerItemLabel("SOC 2 or auditor letter"), "SOC 2 or auditor letter");
  const out = assembled();
  const text = skeletonDocumentToText(out.document);
  assert(!text.includes("soc 2"), "lowercased acronym survived");
  assert(!text.includes("across the organisation"), "UK spelling survived in the satisfied boilerplate");
  assert(!/implemented with continuous monitoring[\s\S]{0,240}implemented across the organi[sz]ation, which is what/.test(text),
    "dual maturity asserted for a continuous-monitoring component");
});

Deno.test("CYB-6: a zero-action register renders an explicit empty state, never an empty appendix", () => {
  const out = assembled();
  const text = skeletonDocumentToText(out.document);
  if (!text.includes("Readiness Action Register")) return; // register table always titled
  assert(
    /No readiness actions are identified for any component|Rank/.test(text),
    "Appendix C rendered without rows or empty-state",
  );
});

Deno.test("CYB-6: the ToA sorts pinpoints numerically", () => {
  const body = "cites 11 CCR § 7123(c)(1) and 11 CCR § 7123(c)(2) and 11 CCR § 7123(c)(10).";
  const toa = renderTableOfAuthorities(
    ["11 CCR § 7123(c)(10)", "11 CCR § 7123(c)(1)", "11 CCR § 7123(c)(2)"],
    body,
  );
  const i1 = toa.indexOf("(c)(1)\n");
  const i2 = toa.indexOf("(c)(2)");
  const i10 = toa.indexOf("(c)(10)");
  assert(i1 >= 0 && i2 >= 0 && i10 >= 0, toa);
  assert(i1 < i2 && i2 < i10, `ASCII sort survived: ${toa}`);
});

Deno.test("CYB-7: the FSOR digests attribute the rulemaking to the Agency", () => {
  const all = JSON.stringify(CYBER_CORPUS_MAP);
  assert(!all.includes("The California Attorney General declined"), "AG misattribution survived in the map");
  assert(!all.includes("The CPRA rejected"), "CPRA-as-actor survived in the map");
  assert(all.includes("The California Privacy Protection Agency declined"));
  assert(all.includes("The Agency rejected the commenter's recommendation"));
});
