// ITEM SO-4 — CYBER SKELETON FIDELITY + SLOT MAP + PINPOINTS + REGISTER.
//
// The v3 skeleton is render law. These assertions are the mechanical guard:
// the byte-pinned fixed prose stays byte-pinned, every slot resolves to a live
// source, every typed surface the skeleton consumes is consumed, every
// statutory pinpoint in fixed prose is in the verified set, the § 7121
// phase-in block quotes all three tiers verbatim from the corpus, and the
// assembled document byte-matches the skeleton outside the slots.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CYBER_SKELETON_SECTIONS,
  CYBER_PROTECTED_FIXED_PROSE,
  CYBER_SKELETON_PINPOINTS,
  CYBER_V3_BANNED_REGISTER,
  CYBER_SKELETON_VERSION,
  CYBER_SKELETON_PROVENANCE,
  CYBER_SKELETON_SOURCE_FILE,
  CYBER_SKELETON_SUBTITLE,
  CYBER_INLINE_CONDITIONALS,
  CYBER_PHASE_IN_CORPUS_KEY,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/prose/plans/cppa-cyber.spine.ts";
import {
  CYBER_SLOT_MAP,
  CYBER_TYPED_SURFACES,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/prose/plans/cppa-cyber.slotmap.ts";
import {
  assembleCyberSkeletonDocument,
  buildPhaseInBlock,
  CYBER_PHASE_IN_PINNED_SENTENCE,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

const SECTION_IDS = [
  "executive_summary",
  "audit_scope",
  "required_components",
  "findings_remediation",
  "conclusion",
  // CEO report review 2026-08-24 — the not-pre-filled Signature page, ahead
  // of the Table of Authorities.
  "signature",
  "table_of_authorities",
];

/** The approved `provision_texts` row `cppa-7121`, subsection (a), all tiers. */
const PHASE_IN_CORPUS = `§ 7121. Timing Requirements for Cybersecurity Audits and Audit Reports.

(a)   A business must complete its first cybersecurity audit report no later than:

      (1)   April 1, 2028, if the business's annual gross revenue for 2026 was more
            than one hundred million dollars ($100,000,000) as of January 1, 2027.

      (2)   April 1, 2029, if the business's annual gross revenue for 2027 was
            between fifty million dollars ($50,000,000) and one hundred million
            dollars ($100,000,000) as of January 1, 2028.
      (3)   April 1, 2030, if the business's annual gross revenue for 2028 was less
            than fifty million dollars ($50,000,000).

(b)   After April 1, 2030, if on January 1 of one year, a business meets the criteria of
      section 7120 for the preceding year, the business must complete a
      cybersecurity audit that covers the next 12 months.`;

const INTAKE: Record<string, unknown> = {
  profile: {
    entity_name: "Northwind Clinical Diagnostics Corporation",
    industry: "Clinical diagnostics laboratory network",
    framework: "NIST CSF",
    in_scope_frameworks: ["NIST CSF", "SOC 2", "ISO 27001"],
    audit_scope_rationale: "The audit covers the multi-tenant results platform and the corporate identity estate.",
    auditor_engagement_status: "External auditor engaged, independence confirmed in writing",
    prior_audit_scope: "The prior engagement was a SOC 2 Type II examination of the results platform.",
    remediation_owner: "Priya Raghavan, Vice President of Security Engineering",
    incidents_12mo: "1",
    last_audit: "Within 12 months",
  },
  controls: [
    { key: "c1_auth", label: "Authentication", maturity: "Implemented with continuous monitoring",
      evidence: ["Policy / procedure document", "Screenshot / config export"] },
    { key: "c2_encryption", label: "Encryption", maturity: "Documented, partially implemented",
      evidence: ["None on file"] },
  ],
};

const REPORT: Record<string, unknown> = {
  readiness_level: "Substantially Ready",
  readiness_determination: {
    conclusion: "not_ready",
    headline: "On the company's answers the business is not yet ready for a § 7124 certified cybersecurity audit.",
    reasoning: "One component is supported only by a description rather than a testable artefact.",
  },
  control_status_counts: {
    by_status: { Mature: 1, Partial: 1 },
    scored_count: 2,
    total_components: 18,
    insufficient_count: 0,
  },
  independence_determination: {
    summary: "The engagement is consistent with § 7122, but the company's answers document rather than demonstrate the auditor's retention practice.",
  },
  controls: [
    { status: "Mature", score: 97, finding: "The operative requirement is 11 CCR § 7123(c)(1).",
      remediation: "Retain the authentication standard for the auditor." },
    { status: "Partial", score: 45, finding: "Encryption at rest is described but not evidenced.",
      remediation: "Produce the key-management configuration export." },
  ],
  top_risks: [
    { title: "Encryption evidence", description: "No artefact evidences encryption at rest.", deadline: "Within 90 days" },
  ],
  next_steps: [
    { text: "Produce the key-management configuration export and retain it for the auditor." },
  ],
  authority_exhibit: {
    entries: [{ citation: "11 CCR § 7123(c)(1)" }, { citation: "11 CCR § 7122" }],
  },
};

Deno.test("SO-4 — the skeleton's six sections, in order", () => {
  assertEquals(CYBER_SKELETON_SECTIONS.map((s) => s.id), SECTION_IDS);
  assertEquals(CYBER_SKELETON_VERSION, "prose-plans-2026-08-24-item-so4-v3.1");
  assertEquals(CYBER_SKELETON_SOURCE_FILE, "CPPA_Cybersecurity_Audit_Skeleton_v3.docx");
  assert(CYBER_SKELETON_PROVENANCE.includes("panel-delegated approval per CEO delegation 2026-08-06"));
});

Deno.test("SO-4 — determination leads: exactly one, opening its section", () => {
  const led = CYBER_SKELETON_SECTIONS.filter((s) => s.blocks.some((b) => b.kind === "lead"));
  assertEquals(led.map((s) => s.id), [
    "executive_summary",
    "required_components",
    "findings_remediation",
    "conclusion",
  ]);
  for (const s of led) {
    assertEquals(s.blocks.filter((b) => b.kind === "lead").length, 1, s.id);
    assertEquals(s.blocks[0].kind, "lead", `${s.id} must OPEN with its lead`);
    assert(s.blocks[0].text.startsWith("[DETERMINATION LEAD]"), s.id);
  }
});

Deno.test("SO-4 — fixed prose is byte-pinned and register-clean", () => {
  // CEO report review 2026-08-24 — +2 for the Signature section's two fixed
  // sentences (the scoping statement and the not-a-certification disclaimer).
  assertEquals(CYBER_PROTECTED_FIXED_PROSE.length, 5);
  for (const text of CYBER_PROTECTED_FIXED_PROSE) {
    assert(!text.startsWith("["), "fixed prose never carries a block marker");
    for (const banned of CYBER_V3_BANNED_REGISTER) {
      assert(!text.toLowerCase().includes(banned), `banned register "${banned}" in fixed prose`);
    }
  }
});

Deno.test("SO-4 — the ITEM-204 byte-pinned block is a corpus block, not generated", () => {
  const scope = CYBER_SKELETON_SECTIONS.find((s) => s.id === "audit_scope")!;
  assertEquals(scope.blocks.map((b) => b.kind), ["skeleton", "corpus"]);
  assert(scope.blocks[1].text.startsWith("[BYTE-PINNED"));
  assertEquals(CYBER_PHASE_IN_CORPUS_KEY, "cppa-7121");
});

Deno.test("SO-4 — the phase-in block quotes all three tiers verbatim, no cohort computed", () => {
  const block = buildPhaseInBlock(PHASE_IN_CORPUS);
  for (const tier of ["April 1, 2028", "April 1, 2029", "April 1, 2030"]) {
    assert(block.includes(tier), `tier ${tier} missing`);
  }
  assert(block.includes("($100,000,000)") && block.includes("($50,000,000)"));
  assert(block.includes(CYBER_PHASE_IN_PINNED_SENTENCE));
  // Subsection (b) is not part of the phase-in quote.
  assert(!block.includes("After April 1, 2030"));
  // No cohort is resolved for the customer.
  assert(!/your tier|the business falls|applies to you/i.test(block));
  assertEquals(buildPhaseInBlock(""), "");
});

Deno.test("SO-4 — slot map: every skeleton slot resolves, both directions", () => {
  const slots = new Set<string>();
  for (const s of CYBER_SKELETON_SECTIONS) {
    for (const b of s.blocks) {
      if (b.kind !== "skeleton") continue;
      for (const m of b.text.matchAll(/\{([^{}]+)\}/g)) {
        slots.add(m[1].split(" - ")[0].split("=")[0].trim());
      }
    }
  }
  for (const m of CYBER_SKELETON_SUBTITLE.matchAll(/\{([^{}]+)\}/g)) {
    slots.add(m[1].split(" - ")[0].split("=")[0].trim());
  }
  const mapped = new Set(CYBER_SLOT_MAP.map((s) => s.slot));
  assertEquals([...slots].filter((s) => !mapped.has(s)), []);
  assertEquals([...mapped].filter((s) => !slots.has(s)), []);
});

Deno.test("SO-4 — the inline conditional has fixed first words and an absent branch", () => {
  assertEquals(CYBER_INLINE_CONDITIONALS.length, 1);
  const fixed = CYBER_PROTECTED_FIXED_PROSE.join("\n");
  for (const c of CYBER_INLINE_CONDITIONALS) {
    assert(fixed.includes(`{${c.slot}`), `${c.slot} must live inside fixed prose`);
    assert(c.fixed_first_words.length > 0 && c.absent.length > 0, c.slot);
  }
});

Deno.test("SO-4 — every typed surface the skeleton consumes names a real section", () => {
  const ids = new Set(CYBER_SKELETON_SECTIONS.map((s) => s.id));
  for (const t of CYBER_TYPED_SURFACES) {
    assert(ids.has(t.section_id), `${t.surface} → unknown section ${t.section_id}`);
  }
});

Deno.test("SO-4 — every pinpoint in fixed prose is in the verification set", () => {
  const declared = new Set(CYBER_SKELETON_PINPOINTS.map((p) => p.pinpoint.replace("11 CCR § ", "")));
  const found = new Set<string>();
  for (const text of [CYBER_SKELETON_SUBTITLE, ...CYBER_PROTECTED_FIXED_PROSE]) {
    for (const m of text.matchAll(/(?:§+\s*|Sections?\s+)(\d{4})(?:-(\d{4}))?/g)) {
      found.add(m[1]);
      if (m[2]) found.add(m[2]);
    }
  }
  assert(found.size > 0, "fixed prose must carry pinpoints");
  for (const f of found) assert(declared.has(f), `pinpoint ${f} is not in the verification set`);
});

Deno.test("SO-4 — assembly: conformance clean, register clean, slots filled", () => {
  const res = assembleCyberSkeletonDocument(REPORT, INTAKE, PHASE_IN_CORPUS);
  assertEquals(res.conformance, []);
  assertEquals(res.register_findings, []);
  const text = skeletonDocumentToText(res.document);

  // Byte-pinned fixed prose survives assembly.
  assert(text.includes(
    "California requires an annual cybersecurity audit, performed by a qualified and independent auditor, addressing each component of the business's cybersecurity program that the regulation enumerates.",
  ));
  // Proper nouns are never case-folded (the SO-3 defect class).
  assert(text.includes("Northwind Clinical Diagnostics Corporation"));
  assert(text.includes("NIST CSF, SOC 2 and ISO 27001"));
  assert(text.includes("that it has engaged an external auditor whose independence is confirmed in writing"));
  assert(text.includes("one security incident in the preceding twelve months"));
  assert(text.includes("within the last twelve months"));
  // No slot survives unfilled.
  assert(!/\{[^{}]+\}/.test(text), "an unfilled slot reached the customer document");
  // The typed tally is never restated as arithmetic in a lead.
  assert(text.includes("April 1, 2028") && text.includes("April 1, 2030"));
  // Table of Authorities is iff-cited.
  assert(text.includes("11 CCR § 7123(c)(1)"));
});

Deno.test("SO-4 — an absent prior audit yields the honest sentence, never an assumption", () => {
  const intake = JSON.parse(JSON.stringify(INTAKE));
  delete intake.profile.prior_audit_scope;
  const res = assembleCyberSkeletonDocument(REPORT, intake, PHASE_IN_CORPUS);
  const text = skeletonDocumentToText(res.document);
  assert(text.includes("The company has not recorded the coverage of any prior audit."));
  assertEquals(res.conformance, []);
});
