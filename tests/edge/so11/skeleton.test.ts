// ITEM SO-11 — SPECIFIED OUTPUT ENCODE: LEGITIMATE INTERESTS ASSESSMENT.
// The conformance battery for the byte-pinned v3 counsel-register skeleton.
//
// Run: deno test -A tests/edge/so11/skeleton.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  LIA_PIPELINE_STAMP,
  LIA_PLAN_ROW_ID,
  LIA_PLAN_SUPERSEDED_ROW_ID,
  LIA_PLAN_VERSION,
  LIA_SKELETON_CONTENT_HASH,
  LIA_SKELETON_PARAGRAPH_COUNT,
  LIA_SKELETON_PARAGRAPHS,
  LIA_SKELETON_PINPOINTS,
  LIA_SKELETON_SECTIONS,
  LIA_SKELETON_SUBTITLE,
} from "../../../supabase/functions/run-li-assessment/_local/prose/plans/lia.spine.ts";
import {
  LIA_CONDITIONAL_TRIGGERS,
  LIA_SLOT_MAP,
} from "../../../supabase/functions/run-li-assessment/_local/prose/plans/lia.slotmap.ts";
import {
  assembleLiaSkeletonDocument,
  buildLiaSlotValues,
  liaAuthorityGroup,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import {
  skeletonDocumentToText,
  slotsIn,
} from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const PERFECT_RECORD = {
  organization_name: "Ravensmoor Cycles Ltd",
  subject_anchor: "Customers placing card orders on the Ravensmoor online store",
  processing_description: "Device and behavioural signals collected at checkout are scored to identify fraudulent card orders",
  relationship_type: "Existing customer",
  data_categories: ["Contact data", "Purchase/transaction history", "Device/technical data"],
  stated_purpose: "We screen orders to prevent payment fraud",
  alternatives_considered: ["Manual review of every order", "A third-party fraud bureau"],
  purpose_details: {
    interest_statement: "Preventing payment fraud on card orders",
    interest_type: "Fraud prevention",
    interest_holder: "Controller",
    specific_benefit: "Fewer chargebacks and fewer fraudulent orders shipped",
    beneficiary: "The company and its customers",
    controller_is_public_authority: false,
  },
  necessity_details: {
    alternatives: ["Manual review of every order"],
    alternatives_rationale: "Manual review of every order could not be resourced within the delivery window",
    why_consent_not_used: "A fraudster would simply decline, which would defeat the screening",
    data_minimised: true,
    pseudonymisation_options: "signals are hashed at rest and re-identified only on a held order",
  },
  balancing_details: {
    relationship_category: "Existing customer",
    reasonable_expectation: "Yes",
    reasonable_expectation_detail: "Fraud screening is described in the checkout notice immediately below the payment panel",
    potential_harm: "Minor",
    potential_harms: ["A legitimate order delayed", "A legitimate order cancelled"],
    scale_approx: "40,000",
    frequency: "Continuously",
    duration: "For 90 days from the order date",
    safeguards: ["Pseudonymisation", "Access controls", "Human review of every hold"],
    additional_mitigations: "a same-day release SLA for held orders",
    vulnerable_subjects: [],
    children_data_subjects: "no",
  },
  attestation: {
    dpo_reviewed: true,
    dpo_reviewer: "Marta Quill",
    dpo_review_date: "2026-07-30",
    approver_name: "Alan Ferris",
    approver_position: "Chief Operating Officer",
    approval_date: "2026-08-01",
    review_triggers: ["a change to the scoring model", "an expansion beyond card orders"],
  },
};

const PERFECT_REPORT = {
  lia_determination: {
    outcome: "legitimate_interests_available",
    why: "Legitimate interests carries this processing as the record stands: the interest is stated, the record shows the comparison against less intrusive means, and no factor weighed above overrides it.",
    citation: "GDPR Art. 6(1)(f)",
  },
  three_part_test: {
    purpose_test: { verdict: "satisfied", analysis: "Fraud prevention is a recognised legitimate interest and is stated with sufficient specificity." },
    necessity_test: { verdict: "satisfied", analysis: "Manual review was considered and could not be resourced, so the screening is necessary rather than merely useful." },
    balancing_test: { verdict: "not_overridden", analysis: "The relationship is an existing customer relationship and the screening is described at the point of collection." },
  },
  interest_legitimacy: { verdict: "satisfied", application: "The interest is lawful, specific and present." },
  benefit_and_beneficiary: { application: "The benefit accrues to the company and to its customers." },
  alternatives_considered: { application: "Two alternatives were considered and rejected for recorded reasons." },
  reasonable_expectations: { verdict: "satisfied", application: "Customers would expect fraud screening at checkout." },
  relationship_with_individual: { application: "The relationship is a direct customer relationship." },
  potential_harms: { application: "The realistic worst case is a delayed order." },
  opt_out_feasibility: { application: "An objection route is recorded and is unconditional." },
  child_factor: { determination: "children_not_in_scope", application: "The record states that the data subjects are not children." },
  public_authority_exclusion: { determination: "not_excluded" },
  documentation_recommendations: ["Record the objection route in the checkout notice"],
  authority_exhibit: {
    entries: [
      { citation: "GDPR Art. 6(1)(f)", corpus_key: "gdpr-art-6-1-f", pin_verified: true, authority_class: "regulation" },
      { citation: "EDPB Guidelines 1/2024", corpus_key: "edpb-1-2024:notice", pin_verified: true, authority_class: "administrative" },
      { citation: "GDPR Articles 13", corpus_key: null, pin_verified: false, authority_class: "regulation" },
    ],
  },
};

// ── 1. The hash and the shape of the governing skeleton ─────────────────────

Deno.test("SO-11 — the encoded skeleton is 37 paragraphs and hashes to the ratified value", async () => {
  assertEquals(LIA_SKELETON_PARAGRAPHS.length, LIA_SKELETON_PARAGRAPH_COUNT);
  assertEquals(LIA_SKELETON_PARAGRAPHS.length, 37);
  assertEquals(await sha256(LIA_SKELETON_PARAGRAPHS.join("\n")), LIA_SKELETON_CONTENT_HASH);
  // RE-PIN 2026-08-28 (CEO-approved, the SO-11 UK-instrument landing): the
  // subtitle and ¶6/¶19 gained {instrumentCitation}/{instrumentName} slots so
  // UK-only records name the UK GDPR in the fixed prose. Original docx pin
  // (2026-08-10): 53de11dee90a20d0944c720f453053d3f6896a5bf58b04af411069a10a28e22a.
  // RE-PIN 2026-08-30 (expert-panel LIA-P2, CEO fix-campaign mandate): ¶27's
  // C.-Scale sentence rewritten to quoted attribution — the old frame
  // double-wrapped recorded free-text ("approximately Approximately 480 ...
  // people") and spliced non-adverbial answers into adverbial slots. Prior
  // pin: 90a64832a086def3b6c0684b8a1e7c8df2def76acfcf0a89f3b853ec8768cd18.
  // RE-PIN BATCH 21a (Wave C5, doc 113 S7.2): the subtitle's " - scope:"
  // spaced hyphen became an em dash. Prior pin:
  // de3fd62a1e7c77af0bc92ebaa1e14399f31a5ed1617519254eba8f6b3e351eed.
  assertEquals(
    LIA_SKELETON_CONTENT_HASH,
    "053c21be0d7c72b4eef88186ec791ddb1ba380f6f18f7b724ef9f2380b6f65f0",
  );
});

Deno.test("SO-11 — the plan row supersedes the item364-d2 row and carries the stamp", () => {
  assertEquals(LIA_PLAN_ROW_ID, "1f4b7c96-1e6c-4d63-a4e5-2a4f4c0b3d11");
  assertEquals(LIA_PLAN_VERSION, "prose-plans-2026-08-10-item-so11");
  assertEquals(LIA_PLAN_SUPERSEDED_ROW_ID, "c9b3d942-83b9-4aac-859d-b507c1f2ef37");
  assertEquals(LIA_PIPELINE_STAMP, "lia-pipeline@item-so11-2026-08-10");
});

// ── 2. Slot map completeness ────────────────────────────────────────────────

Deno.test("SO-11 — every slot in the spine is bound in the slot map", () => {
  const inSpine = new Set<string>();
  for (const section of LIA_SKELETON_SECTIONS) {
    for (const block of section.blocks) {
      if (block.kind === "skeleton") for (const s of slotsIn(block.text)) inSpine.add(s);
    }
  }
  // RE-PIN 2026-08-28: the subtitle is read from the spine constant itself
  // (it now carries the {instrumentCitation} slot), not a re-typed literal.
  for (const s of slotsIn(LIA_SKELETON_SUBTITLE)) {
    inSpine.add(s);
  }
  const bound = new Set(LIA_SLOT_MAP.map((b) => b.slot));
  const unbound = [...inSpine].filter((s) => !bound.has(s));
  assertEquals(unbound, [], `unbound slots: ${unbound.join(", ")}`);
});

Deno.test("SO-11 — all nine conditional triggers are declared, with an absent branch each", () => {
  assertEquals(LIA_CONDITIONAL_TRIGGERS.length, 9);
  assertEquals(
    LIA_CONDITIONAL_TRIGGERS.map((t) => t.id).sort(),
    [
      "analytics", "approval", "children", "dpo_review", "employee_monitoring",
      "marketing", "public_authority", "stage_a", "vulnerable_groups",
    ],
  );
  const dpo = LIA_CONDITIONAL_TRIGGERS.find((t) => t.id === "dpo_review")!;
  assertEquals(dpo.negative, "honest-negative");
  assert(dpo.negative_text.length > 0);
  for (const b of LIA_SLOT_MAP) assert(b.absent.length > 10, `${b.slot} has no absent branch`);
});

// ── 3. Pinpoints ────────────────────────────────────────────────────────────

Deno.test("SO-11 — every pinned statutory span appears in the fixed prose it is pinned to", () => {
  assertEquals(LIA_SKELETON_PINPOINTS.length, 3);
  for (const p of LIA_SKELETON_PINPOINTS) {
    assert(p.verbatim.length > 40, `${p.id} has no verbatim span`);
    assert(p.corpus_key.length > 0, `${p.id} has no corpus key`);
    for (const n of p.paragraphs) {
      assert(n >= 1 && n <= 37, `${p.id} cites paragraph ${n}, outside the skeleton`);
    }
  }
  // Article 6(1)(f) is named in the fixed prose of the executive summary;
  // the instrument itself renders through the {instrumentName} slot
  // (RE-PIN 2026-08-28, the SO-11 UK-instrument landing).
  assert(LIA_SKELETON_PARAGRAPHS[5].includes("Article 6(1)(f) of {instrumentName"));
  // The CHILDREN conditional cites Recital 38, not Recital 47.
  assert(LIA_SKELETON_PARAGRAPHS[24].includes("Recital 38"));
  assert(!LIA_SKELETON_PARAGRAPHS[24].includes("Recital 47"));
});

// ── 4. Assembly on the perfect record ───────────────────────────────────────

Deno.test("SO-11 — the perfect record assembles clean: conformance, register, coherence", () => {
  const r = assembleLiaSkeletonDocument(PERFECT_REPORT, PERFECT_RECORD);
  assertEquals(r.conformance, []);
  assertEquals(r.register_findings, []);
  assertEquals(r.lead_coherence, []);
  assertEquals(r.document.sections.length, 7);
  assertEquals(r.document.title, "LEGITIMATE INTERESTS ASSESSMENT");
  assert(r.document.subtitle.includes("Ravensmoor Cycles Ltd"));
});

Deno.test("SO-11 — the typed register ban is repaired, never shipped", () => {
  const r = assembleLiaSkeletonDocument(PERFECT_REPORT, PERFECT_RECORD);
  const body = skeletonDocumentToText(r.document);
  assert(!/the record shows/i.test(body), "banned v3 register phrase reached the document");
  assert(/the company has indicated/i.test(body));
});

Deno.test("SO-11 — conditionals fire from their own triggers only", () => {
  const r = assembleLiaSkeletonDocument(PERFECT_REPORT, PERFECT_RECORD);
  // Perfect record: no public authority, no children, no vulnerable groups, no
  // employment monitoring; analytics + DPO review + approval all recorded.
  assertEquals(r.conditionals_fired.sort(), ["analytics", "approval", "dpo_review"]);
  const body = skeletonDocumentToText(r.document);
  assert(!body.includes("Children are among the people affected"));
  assert(!body.includes("Because the controller is a public authority"));
  assert(body.includes("Marta Quill"));
  assert(body.includes("Alan Ferris, Chief Operating Officer"));
});

Deno.test("SO-11 — the DPO conditional states the honest negative when review has not happened", () => {
  const record = { ...PERFECT_RECORD, attestation: { review_triggers: ["a change to the scoring model"] } };
  const r = assembleLiaSkeletonDocument(PERFECT_REPORT, record);
  const body = skeletonDocumentToText(r.document);
  assert(body.includes("Review by the data protection officer has not yet occurred."));
  assert(!body.includes("It was approved by"));
  assertEquals(r.conformance, []);
});

Deno.test("SO-11 — children fire from the typed determination as well as the intake answer", () => {
  const report = { ...PERFECT_REPORT, child_factor: { determination: "children_in_scope", application: "The processing reaches children." } };
  const r = assembleLiaSkeletonDocument(report, PERFECT_RECORD);
  const body = skeletonDocumentToText(r.document);
  assert(body.includes("Children are among the people affected"));
  assert(body.includes("Recital 38"));
});

// ── 5. Protections ──────────────────────────────────────────────────────────

Deno.test("SO-11 — an absent optional fact drops its sentence, never leaves a blank", () => {
  const record = {
    ...PERFECT_RECORD,
    stated_purpose: "",
    balancing_details: { ...PERFECT_RECORD.balancing_details, scale_approx: "", frequency: "", duration: "" },
  };
  const r = assembleLiaSkeletonDocument(PERFECT_REPORT, record);
  const body = skeletonDocumentToText(r.document);
  assert(!/\{[a-zA-Z_]+\}/.test(body), "an unresolved slot reached the document");
  assert(!body.includes("In its privacy notice"), "notice sentence survived without a notice");
  assert(!/C\. Scale\./.test(body), "an orphaned sub-head survived its dropped sentence");
  assertEquals(r.conformance, []);
});

Deno.test("SO-11 — an Other value prints its free text, never the word Other", () => {
  const record = {
    ...PERFECT_RECORD,
    balancing_details: {
      ...PERFECT_RECORD.balancing_details,
      vulnerable_subjects: ["Other"],
      vulnerable_subjects_other: "customers in financial hardship",
      safeguards: ["Other"],
      safeguards_other: "a same-day release SLA",
    },
  };
  const values = buildLiaSlotValues(record);
  assertEquals(values.LIST, "customers in financial hardship");
  assertEquals(values.safeguards, "a same-day release SLA");
  const body = skeletonDocumentToText(assembleLiaSkeletonDocument(PERFECT_REPORT, record).document);
  assert(!/\bOther\b/.test(body), "the literal word Other reached the document");
});

Deno.test("SO-11 — proper nouns are never case-folded", () => {
  const values = buildLiaSlotValues(PERFECT_RECORD);
  assertEquals(values.organizationName, "Ravensmoor Cycles Ltd");
  assertEquals(values.dpoReviewer, "Marta Quill");
  assertEquals(values.approverName, "Alan Ferris");
  assert(String(values.subjectAnchor).startsWith("Customers placing"));
});

// ── 6. Table of Authorities ─────────────────────────────────────────────────

Deno.test("SO-11 — the GDPR files as a Regulation, not as persuasive guidance", () => {
  assertEquals(liaAuthorityGroup("Article 6(1)(f) GDPR"), "Regulations");
  assertEquals(liaAuthorityGroup("Recital 38 GDPR"), "Regulations");
  assertEquals(liaAuthorityGroup("EDPB Guidelines 1/2024"), "Guidance and Persuasive Authority");
});

Deno.test("SO-11 — the Table of Authorities is iff-cited and carries no unverified fragment", () => {
  const r = assembleLiaSkeletonDocument(PERFECT_REPORT, PERFECT_RECORD);
  const toa = r.document.sections.find((s) => s.id === "table_of_authorities");
  assert(toa, "no Table of Authorities");
  const text = toa!.paragraphs.map((p) => p.text).join("\n");
  assert(text.includes("Regulations"));
  assert(text.includes("Article 6(1)(f) GDPR"));
  assert(!text.includes("GDPR Articles 13"), "an unverified exhibit fragment reached the ToA");
  const body = skeletonDocumentToText(r.document);
  for (const line of text.split("\n").map((l) => l.trim()).filter((l) => l && !/^(Regulations|Statutes|Guidance)/.test(l))) {
    assert(body.includes(line), `ToA lists ${line}, which is not cited in the body`);
  }
});

// ── SO-11 UK-INSTRUMENT RE-PIN (2026-08-28, CEO-approved) ───────────────────
// The governing instrument renders through {instrumentCitation}/{instrumentName}
// so a UK-only record names the UK GDPR in its own fixed prose (subtitle, ¶6,
// ¶19) — the live batch d1d2b3b8 defect: subtitle/ToA switched at assembly but
// the byte-pinned prose still read "Article 6(1)(f) of the GDPR" on UK-only
// records. Mixed EU+UK stays on the EU rail (ITEM-330).

Deno.test("SO-11 re-pin — a UK-only record names the UK GDPR in the fixed prose", () => {
  const r = assembleLiaSkeletonDocument(PERFECT_REPORT, {
    ...PERFECT_RECORD,
    jurisdictions: ["United Kingdom (UK GDPR)"],
  });
  const body = skeletonDocumentToText(r.document);
  assert(body.includes("Prepared under Article 6(1)(f) UK GDPR"), "subtitle carries the UK instrument");
  assert(body.includes("Article 6(1)(f) of the UK GDPR permits a controller"), "¶6 names the UK instrument");
  assert(body.includes("Necessity under Article 6(1)(f) of the UK GDPR asks"), "¶19 names the UK instrument");
  assert(!body.includes("of the GDPR permits"), "the EU wording must not survive on a UK-only record");
});

Deno.test("SO-11 re-pin — an EU record renders the EU instrument byte-identically to the pre-slot prose", () => {
  const r = assembleLiaSkeletonDocument(PERFECT_REPORT, {
    ...PERFECT_RECORD,
    jurisdictions: ["EU (GDPR)"],
  });
  const body = skeletonDocumentToText(r.document);
  assert(body.includes("Prepared under Article 6(1)(f) GDPR for Ravensmoor Cycles Ltd"));
  assert(body.includes("Article 6(1)(f) of the GDPR permits a controller"));
  assert(body.includes("Necessity under Article 6(1)(f) of the GDPR asks"));
  assert(!body.includes("UK GDPR"));
});

Deno.test("SO-11 re-pin — a mixed record stays on the EU rail in the fixed prose (ITEM-330)", () => {
  const r = assembleLiaSkeletonDocument(PERFECT_REPORT, {
    ...PERFECT_RECORD,
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  });
  const body = skeletonDocumentToText(r.document);
  assert(body.includes("Article 6(1)(f) GDPR and Article 6(1)(f) UK GDPR"), "the subtitle names both instruments");
  assert(body.includes("Article 6(1)(f) of the GDPR permits a controller"), "¶6 stays on the EU rail");
  assert(body.includes("Necessity under Article 6(1)(f) of the GDPR asks"), "¶19 stays on the EU rail");
});

Deno.test("SO-11 re-pin — a record with no jurisdictions answer falls defensively to the EU rail", () => {
  const r = assembleLiaSkeletonDocument(PERFECT_REPORT, PERFECT_RECORD);
  const body = skeletonDocumentToText(r.document);
  assert(body.includes("Prepared under Article 6(1)(f) GDPR"));
  assert(body.includes("Article 6(1)(f) of the GDPR permits a controller"));
});
