// ITEM SO-3 — GOVERNANCE SKELETON FIDELITY + SLOT MAP + PINPOINTS + REGISTER.
//
// The v3 counsel-register skeleton is render law. These assertions are the
// mechanical guard: the byte-pinned fixed prose stays byte-pinned, every slot
// resolves to a live source, every typed surface the skeleton consumes is
// consumed, every statutory pinpoint in fixed prose is in the verified set,
// the leads cohere with the determination they lead, and the assembled
// document byte-matches the skeleton outside the slots.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  GOVERNANCE_SKELETON_SECTIONS,
  GOVERNANCE_PROTECTED_FIXED_PROSE,
  GOVERNANCE_SKELETON_PINPOINTS,
  GOVERNANCE_V3_BANNED_REGISTER,
  GOVERNANCE_SKELETON_VERSION,
  GOVERNANCE_SKELETON_PROVENANCE,
  GOVERNANCE_SKELETON_SOURCE_FILE,
  GOVERNANCE_INLINE_CONDITIONALS,
  GOVERNANCE_TOA_GROUPS,
  GOVERNANCE_COVERAGE_LINKS,
} from "../../../supabase/functions/_shared/prose/plans/governance.spine.ts";
import {
  GOVERNANCE_SLOT_MAP,
  GOVERNANCE_TYPED_SURFACES,
} from "../../../supabase/functions/_shared/prose/plans/governance.slotmap.ts";
import { governanceAssessmentContract } from "../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";
import {
  assembleGovernanceSkeletonDocument,
} from "../../../supabase/functions/_shared/ltp/governance-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

const SECTION_IDS = [
  "executive_summary",
  "organisation_and_data",
  "governance_infrastructure",
  "training_tools_controls",
  "processors_and_transfers",
  "the_determination",
  "table_of_authorities",
];

const INTAKE: Record<string, unknown> = {
  organization_name: "Aldergate Occupational Health Services Ltd",
  sector: "Healthcare/Life Sciences",
  org_size: "251-1000",
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  eu_uk_data: "Yes",
  data_categories: ["Contact details", "Health or medical data"],
  special_category: "Yes",
  special_categories_list: ["Health data"],
  dpo_status: "Yes, formal DPO",
  privacy_policy: "Yes, current (reviewed in last 12 months)",
  privacy_notice_coverage: "Yes — notice covers all current activities, transfers, retention, and rights",
  training_status: "Yes, formal onboarding + annual refresh",
  training_ai_coverage: "Yes — explicitly covers AI tools",
  tools: ["Zoom + AI features", "HubSpot", "Other: Medisyne OH"],
  tool_instruction: "Yes, written policy with specific prohibitions",
  technical_controls: "Yes — DLP/content filtering actively enforced",
  technical_controls_list: ["DLP rules", "Content filtering"],
  dpa_status: "Yes, all vendors",
  dpa_art28_verified: "Yes — verified",
  transfer_status: "Yes, US-based tools",
  transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
  additional_context: "",
};

const REPORT: Record<string, unknown> = {
  readiness_determination: { rating: "Evidenced", rationale: "The accountability determination is satisfied." },
  accountability_determination: { verdict: "satisfied", reasoning: "On this record the controller can demonstrate compliance." },
  executive_summary: "The record evidences the accountability duties this assessment tested. The remainder follows.",
  dpo_determination: {
    designation_trigger: { record_fact: "The record answers \"Yes, formal DPO\".", application: "Designation is mandatory here." },
    position_and_independence: { application: "A formal designation carries the Article 38 duties with it." },
    task_coverage: { application: "Article 39(1) sets a floor of five tasks." },
  },
  transfer_analysis: { verdict: "partially_satisfied", record_fact: "The company reports US-based tools.", application: "GDPR Art. 44 applies." },
  risk_calibration_finding: { verdict: "satisfied" },
  domain_findings: {
    training: { domain: "training", domain_name: "Employee Training and Awareness", current_state: "Formal onboarding.", recommended_action: "Update the curriculum." },
    vendor_terms: { domain: "vendor_terms", domain_name: "Vendor Terms", current_state: "Art. 28 DPAs in place.", recommended_action: "Re-verify annually." },
  },
  remediation_plan: [
    { domain: "training", priority: "High — remediate this quarter", target_date: "2026-12-18", validation_method: "Internal audit sample" },
  ],
  authority_exhibit: {
    entries: [
      { citation: "GDPR Art. 44", authority_class: "regulation" },
      { citation: "GDPR Art. 99", authority_class: "regulation" },
    ],
  },
};

Deno.test("SO-3 — the skeleton's seven sections, in order", () => {
  assertEquals(GOVERNANCE_SKELETON_SECTIONS.map((s) => s.id), SECTION_IDS);
  assertEquals(GOVERNANCE_SKELETON_VERSION, "prose-plans-2026-08-10-item-so3");
  assertEquals(GOVERNANCE_SKELETON_SOURCE_FILE, "Governance_Assessment_Skeleton_v3.docx");
  assert(GOVERNANCE_SKELETON_PROVENANCE.includes(
    "panel-delegated approval per CEO delegation 2026-08-06",
  ));
});

Deno.test("SO-3 — determination leads: exactly one, opening its section", () => {
  const led = GOVERNANCE_SKELETON_SECTIONS.filter((s) => s.blocks.some((b) => b.kind === "lead"));
  assertEquals(led.map((s) => s.id), [
    "executive_summary",
    "governance_infrastructure",
    "training_tools_controls",
    "processors_and_transfers",
    "the_determination",
  ]);
  for (const s of led) {
    assertEquals(s.blocks.filter((b) => b.kind === "lead").length, 1, s.id);
    assertEquals(s.blocks[0].kind, "lead", `${s.id} must OPEN with its lead`);
    assert(s.blocks[0].text.startsWith("[DETERMINATION LEAD]"), s.id);
  }
});

Deno.test("SO-3 — conditionals are inline, with fixed first words and an absent branch", () => {
  assertEquals(GOVERNANCE_INLINE_CONDITIONALS.length, 4);
  const fixed = GOVERNANCE_PROTECTED_FIXED_PROSE.join("\n");
  for (const c of GOVERNANCE_INLINE_CONDITIONALS) {
    assert(fixed.includes(`{${c.slot}`), `${c.slot} must live inside fixed prose`);
    assert(c.fixed_first_words.length > 0, c.slot);
    assert(c.absent.length > 0, c.slot);
  }
  // The v3 governance skeleton carries no standalone [CONDITIONAL] paragraph.
  const standalone = GOVERNANCE_SKELETON_SECTIONS.flatMap((s) => s.blocks)
    .filter((b) => b.kind === "conditional");
  assertEquals(standalone.length, 0);
});

Deno.test("SO-3 — fixed prose is byte-pinned and register-clean", () => {
  assertEquals(GOVERNANCE_PROTECTED_FIXED_PROSE.length, 6);
  for (const text of GOVERNANCE_PROTECTED_FIXED_PROSE) {
    assert(!text.startsWith("["), "fixed prose never carries a block marker");
    for (const banned of GOVERNANCE_V3_BANNED_REGISTER) {
      assert(!text.toLowerCase().includes(banned), `banned register "${banned}" in fixed prose`);
    }
  }
  // The 403-A fixed rule is skeleton law and prints.
  assert(GOVERNANCE_PROTECTED_FIXED_PROSE.some((t) =>
    t.includes("assesses the Article 37-39 duties on what the intake asks")
  ));
});

Deno.test("SO-3 — slot map: every skeleton slot resolves, both directions", () => {
  const slotsInSkeleton = new Set<string>();
  for (const s of GOVERNANCE_SKELETON_SECTIONS) {
    for (const b of s.blocks) {
      for (const m of b.text.matchAll(/\{([^{}]+)\}/g)) {
        slotsInSkeleton.add(m[1].split(" - ")[0].split("=")[0].trim());
      }
    }
  }
  slotsInSkeleton.add("organizationName"); // the subtitle slot
  const mapped = new Set(GOVERNANCE_SLOT_MAP.map((s) => s.slot));
  const unmapped = [...slotsInSkeleton].filter((s) => !mapped.has(s));
  assertEquals(unmapped, [], `unmapped slots: ${unmapped.join(", ")}`);
  const unused = [...mapped].filter((s) => !slotsInSkeleton.has(s));
  assertEquals(unused, [], `slot map carries unused slots: ${unused.join(", ")}`);
});

Deno.test("SO-3 — every intake-bound slot names a key on the live contract", () => {
  const keys = new Set(governanceAssessmentContract.fields.map((f) => f.key));
  for (const b of GOVERNANCE_SLOT_MAP) {
    if (b.kind === "typed-surface") continue;
    for (const r of b.source.split(/\s*[|+]\s*/).map((x) => x.trim())) {
      assert(keys.has(r), `slot ${b.slot} → unknown contract key "${r}"`);
    }
  }
});

Deno.test("SO-3 — every typed surface the skeleton consumes names a real section", () => {
  const ids = new Set(GOVERNANCE_SKELETON_SECTIONS.map((s) => s.id));
  for (const t of GOVERNANCE_TYPED_SURFACES) {
    assert(ids.has(t.section_id), `${t.surface} → unknown section ${t.section_id}`);
  }
  for (const c of GOVERNANCE_COVERAGE_LINKS) {
    assert(ids.has(c.section_id), `coverage link → unknown section ${c.section_id}`);
  }
});

Deno.test("SO-3 — every pinpoint in fixed prose is in the verification set", () => {
  const declared = new Set(GOVERNANCE_SKELETON_PINPOINTS.map((p) => p.pinpoint));
  const found = new Set<string>();
  for (const text of GOVERNANCE_PROTECTED_FIXED_PROSE) {
    for (const m of text.matchAll(/Article \d+(?:\(\d+\))?/g)) found.add(m[0]);
  }
  for (const f of found) assert(declared.has(f), `pinpoint ${f} is not in the verification set`);
  assert(found.has("Article 5(2)"));
  assert(found.has("Article 24"));
});

Deno.test("SO-3 — Table of Authorities: three brief-order groups", () => {
  assertEquals(GOVERNANCE_TOA_GROUPS, [
    "Regulations",
    "Statutes",
    "Guidance and Persuasive Authority",
  ]);
});

Deno.test("SO-3 — assembly: conformance, register, one summary voice", () => {
  const res = assembleGovernanceSkeletonDocument(REPORT, INTAKE);
  assertEquals(res.conformance, []);
  assertEquals(res.register_findings, []);
  const text = skeletonDocumentToText(res.document);

  // Byte-pinned fixed prose survives assembly.
  assert(text.includes(
    "Article 5(2) of the GDPR makes a controller responsible not only for complying with the data protection principles but for being able to demonstrate that compliance.",
  ));
  assert(text.includes("operating detail the intake does not collect is recorded as what would strengthen the record"));

  // Slots filled from the intake, in the skeleton's rendering rules.
  assert(text.includes("Aldergate Occupational Health Services Ltd"));
  assert(text.includes("251 to 1,000 people"));
  assert(text.includes("including the special categories health data, which engage Article 9"));
  assert(text.includes(", together with Medisyne OH"));
  assert(text.includes("relying on EU Standard Contractual Clauses (SCCs)"));

  // Lead coherence: the executive lead binds to readiness_determination.rating.
  const execLead = res.document.sections[0].paragraphs[0].text;
  assert(execLead.includes("accountability is evidenced"), execLead);

  // ToA is iff-cited: Art. 44 is cited in the body, Art. 99 is not.
  assert(text.includes("GDPR Art. 44"));
  assert(!text.includes("GDPR Art. 99"));
});

Deno.test("SO-3 — absent branches: omitted, never padded", () => {
  const intake = { ...INTAKE };
  delete (intake as Record<string, unknown>).special_category;
  delete (intake as Record<string, unknown>).training_ai_coverage;
  intake.tools = ["HubSpot"];
  intake.transfer_status = "All tools store data in EU/UK";
  delete (intake as Record<string, unknown>).transfer_mechanism;

  const res = assembleGovernanceSkeletonDocument(REPORT, intake);
  const text = skeletonDocumentToText(res.document);
  assertEquals(res.conformance, []);
  assert(!text.includes("which engage Article 9"));
  assert(!text.includes("coverage of AI tools"));
  assert(!text.includes("together with"));
  assert(!text.includes("relying on"));
  assert(text.includes("all of its tools store data in the EU or the UK"));
});

Deno.test("SO-3 — a gate-FALSE transfer answer names the missing mechanism honestly", () => {
  const intake = { ...INTAKE };
  delete (intake as Record<string, unknown>).transfer_mechanism;
  const text = skeletonDocumentToText(
    assembleGovernanceSkeletonDocument(REPORT, intake).document,
  );
  assert(text.includes("without the company having recorded the Chapter V mechanism it relies on"));
});

Deno.test("SO-3 — a non-affirmative rating never yields an affirmative lead", () => {
  const report = {
    ...REPORT,
    readiness_determination: { rating: "Partly evidenced", rationale: "One duty is unevidenced." },
  };
  const res = assembleGovernanceSkeletonDocument(report, INTAKE);
  const lead = res.document.sections[0].paragraphs[0].text;
  assert(lead.includes("partly evidenced"), lead);
  assert(lead.includes("cannot yet demonstrate"), lead);
});
