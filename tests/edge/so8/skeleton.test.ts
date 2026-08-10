// SO-8 — REGISTRATION ASSESSMENT SKELETON CONFORMANCE BATTERY.
//
// Proves: the spine is byte-pinned to the governing Aug-10 v3 skeleton (hash
// recomputed here over the paragraph list), every slot in the fixed prose has
// a live binding in the slot map and vice versa, the two CEO bindings render
// as ruled ({dataTypes} derived label set, {dataBrokerDetail} trigger on
// `acts_as_data_broker`), the assembled document byte-matches the skeleton
// outside the slots, the leads agree with their typed determinations, the
// item413 banned register never reaches the customer, the honest permanent
// orphan `cross_border_transfers` is not consumed, the Table of Authorities is
// iff-cited, and the two SO-3 defect classes (proper-noun case-folding,
// abbreviation-blind truncation) cannot recur.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  REGISTRATION_CORPUS_FRAMING_NOTE,
  REGISTRATION_SKELETON_CONTENT_HASH,
  REGISTRATION_SKELETON_PARAGRAPHS,
  REGISTRATION_SKELETON_PINPOINTS,
  REGISTRATION_SKELETON_SECTIONS,
  REGISTRATION_SKELETON_SUBTITLE,
  REGISTRATION_V3_BANNED_REGISTER,
} from "../../../supabase/functions/_shared/prose/plans/registration.spine.ts";
import { REGISTRATION_SLOT_MAP } from "../../../supabase/functions/_shared/prose/plans/registration.slotmap.ts";
import { skeletonDocumentToText, slotsIn } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import {
  assembleRegistrationSkeletonDocument,
  buildDataTypesProse,
} from "../../../supabase/functions/_shared/ltp/registration-skeleton-assemble.ts";

const INTAKE: Record<string, unknown> = {
  organization_name: "Halden Data Services, Inc.",
  is_public_authority: false,
  organization_country: "US",
  organization_size: "medium",
  industry: "AdTech / MarTech",
  processes_personal_data: true,
  processes_special_categories: true,
  processes_children_data: false,
  processes_biometrics_for_id: true,
  acts_as_data_broker: true,
  sells_or_licenses_brokered_data: true,
  collects_data_not_directly_from_individuals: true,
  has_direct_relationship_with_data_subjects: false,
  brokered_data_individual_count: 3800000,
  brokered_data_revenue_share_pct: 61,
  data_broker_exemption_claimed: "none",
  cross_border_transfers: true,
  approved_by_name: "Ingrid Halden",
  approved_by_title: "General Counsel",
  markets_served: ["US-CA", "US-TX", "DE"],
};

const REPORT: Record<string, unknown> = {
  obligations_summary: { ai_act_obligations_engaged: false },
  registration_deliverables: {
    determinations: [
      {
        jurisdiction: "US-CA",
        state_name: "California",
        filing_body: "the California Privacy Protection Agency",
        verdict: "registrable",
        headline: "California data-broker registration is engaged",
        reasoning: "The company sells brokered data and has no direct relationship with the individuals concerned.",
        citations: ["Cal. Civ. Code § 1798.99.80"],
        threshold: {
          standard: "\u201cData broker\u201d means a business that knowingly collects and sells to third parties the personal information of a consumer with whom the business does not have a direct relationship.",
          record_fact: "The company has indicated that it sells brokered data.",
          application: "Both limbs of the definition are met on the answers given.",
          exclusion_analysis: "No exclusion is claimed.",
        },
        requirement: {
          standard: "A data broker shall register with the California Privacy Protection Agency.",
        },
        open_questions: [],
        status: "analysed",
      },
      {
        jurisdiction: "US-TX",
        state_name: "Texas",
        filing_body: "the Texas Secretary of State",
        verdict: "conditional",
        headline: "Texas registration turns on the revenue threshold",
        reasoning: "The revenue derived from brokered data is recorded but the statutory year is not.",
        citations: ["Tex. Bus. & Com. Code § 509.001"],
        threshold: {
          standard: "A person is a data broker if the person derives a majority of revenue from data-broker activity.",
          record_fact: "The company has indicated that brokered data accounts for 61% of revenue.",
          application: "Whether the recorded share is measured over the statutory period is not stated.",
          exclusion_analysis: "",
        },
        requirement: { standard: "A data broker shall file a registration with the secretary of state." },
        open_questions: ["Whether the revenue share is measured over the statutory twelve-month period"],
        status: "record_insufficient",
      },
    ],
    schedules: [
      {
        jurisdiction: "US-CA",
        window_standard: "A data broker shall register on or before January 31 following each year in which it meets the definition.",
        window_citation: "Cal. Civ. Code § 1798.99.82",
        fee_standard: "The registration shall be accompanied by the registration fee.",
        fee_citation: "Cal. Civ. Code § 1798.99.82",
        fee_stated_amount: null,
        status: "analysed",
      },
    ],
    filing_readiness: [
      {
        jurisdiction: "US-CA",
        citation: "Cal. Civ. Code § 1798.99.82",
        standard: "The registration shall include the name and primary physical, email and internet website addresses of the data broker.",
        items: [
          { item: "Contact details", intake_key: "filing_contact_details_ready", ready: true, record_fact: "recorded" },
          { item: "Opt-out mechanism", intake_key: "filing_opt_out_mechanism_documented", ready: false, record_fact: "not recorded" },
        ],
        ready_to_file: false,
        summary: "The California filing is not yet complete.",
        status: "analysed",
      },
    ],
    representative_determinations: [
      {
        jurisdiction: "EU",
        citation: "GDPR Art. 27(1)",
        standard: "Where Article 3(2) applies, the controller or the processor shall designate in writing a representative in the Union.",
        record_fact: "The company has indicated that it offers services to individuals in Germany.",
        application: "Art. 3(2) is engaged on the markets recorded.",
        exemption_analysis: "The Art. 27(2) exemptions do not apply on the answers given.",
        verdict: "engaged",
        status: "analysed",
      },
    ],
    both_representatives_required: false,
    dpo_determination: {
      verdict: "not_engaged",
      headline: "No Art. 37(1) branch is engaged on the answers given.",
      reasoning: "The company is not a public authority and no core activity is recorded as large-scale monitoring.",
      findings: [],
      engaged_branches: [],
      citations: ["GDPR Art. 37(1)"],
      status: "analysed",
    },
    corpus_pending: [],
    attestation: {
      heading: "Attestation",
      approved_by_name: "Ingrid Halden",
      approved_by_title: "General Counsel",
      approval_date: "2026-08-08",
      next_review_due: "2027-08-08",
      review_triggers: ["A change in the markets served"],
      statement: "This assessment is approved as an accurate record of the company's filing position.",
      status: "analysed",
    },
  },
  authority_exhibit: {
    entries: [
      { citation: "Cal. Civ. Code § 1798.99.82", authority_class: "statute" },
      { citation: "GDPR Art. 27(1)", authority_class: "regulation" },
      { citation: "GDPR Art. 99", authority_class: "regulation" },
    ],
  },
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("SO-8: the spine is byte-pinned to the governing Aug-10 skeleton", async () => {
  assertEquals(REGISTRATION_SKELETON_PARAGRAPHS.length, 19);
  assertEquals(await sha256(REGISTRATION_SKELETON_PARAGRAPHS.join("\n")), REGISTRATION_SKELETON_CONTENT_HASH);
});

Deno.test("SO-8: this product's fixed prose carries no statutory pinpoints", () => {
  assertEquals(REGISTRATION_SKELETON_PINPOINTS.length, 0);
  for (const p of REGISTRATION_SKELETON_PARAGRAPHS) {
    assert(!/Art\.\s*\d|§\s*\d|ILCS|U\.S\.C\./.test(p), `fixed prose gained a pinpoint: ${p.slice(0, 60)}`);
  }
});

Deno.test("SO-8: slot map is complete in both directions", () => {
  const inSpine = new Set<string>();
  for (const section of REGISTRATION_SKELETON_SECTIONS) {
    for (const block of section.blocks) {
      if (block.kind === "skeleton") for (const slot of slotsIn(block.text)) inSpine.add(slot);
      if (block.kind === "conditional") for (const slot of slotsIn(block.text)) inSpine.add(slot);
    }
  }
  for (const slot of slotsIn(REGISTRATION_SKELETON_SUBTITLE)) inSpine.add(slot);

  const mapped = new Set(REGISTRATION_SLOT_MAP.map((b) => b.slot));
  for (const slot of inSpine) assert(mapped.has(slot), `unmapped slot: ${slot}`);
  for (const slot of mapped) assert(inSpine.has(slot), `slot map carries a slot the spine no longer has: ${slot}`);
});

Deno.test("SO-8: assembled document conforms, is coherent, and carries no banned register", () => {
  const out = assembleRegistrationSkeletonDocument(REPORT, INTAKE);
  assertEquals(out.conformance, []);
  assertEquals(out.register_findings, []);
  assertEquals(out.lead_coherence, []);
  const text = skeletonDocumentToText(out.document).toLowerCase();
  for (const banned of REGISTRATION_V3_BANNED_REGISTER) {
    assert(!text.includes(banned), `banned register reached the customer: ${banned}`);
  }
});

Deno.test("SO-8: authoring markers never reach the customer; the framing note is verbatim", () => {
  const text = skeletonDocumentToText(assembleRegistrationSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes(REGISTRATION_CORPUS_FRAMING_NOTE));
  for (const marker of ["[BYTE-PINNED]", "[GENERATED]", "[DETERMINATION LEAD]", "[CONDITIONAL]", "Register guide"]) {
    assert(!text.includes(marker), `authoring law leaked: ${marker}`);
  }
});

Deno.test("SO-8: the {dataTypes} binding renders the CEO's derived label set", () => {
  assertEquals(buildDataTypesProse({ processes_personal_data: true }), "personal data");
  assertEquals(
    buildDataTypesProse({ processes_personal_data: true, processes_special_categories: true }),
    "personal data, including special categories of data",
  );
  assertEquals(
    buildDataTypesProse({
      processes_personal_data: true,
      processes_special_categories: true,
      processes_biometrics_for_id: true,
    }),
    "personal data, including special categories of data and biometric identifiers used for identification",
  );
  // No padding where personal data itself is not recorded.
  assertEquals(buildDataTypesProse({}), "");
  const text = skeletonDocumentToText(assembleRegistrationSkeletonDocument(REPORT, INTAKE).document);
  assert(!text.includes("including ."), "an empty including clause was padded");
});

Deno.test("SO-8: fixed prose renders the reader's own labels, never case-folded", () => {
  const text = skeletonDocumentToText(assembleRegistrationSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes("Halden Data Services, Inc."));
  assert(text.includes("AdTech / MarTech"), "sector label was case-folded or dropped");
  assert(text.includes("medium (50\u2013249 employees)"));
  assert(text.includes("California (US)") && text.includes("Germany"));
  assert(text.includes("Ingrid Halden"));
  assert(!text.includes("halden data"), "organisation name was case-folded");
  assert(!text.includes("adTech"), "sector label was case-folded");
});

Deno.test("SO-8: the data-broker conditional fires only on acts_as_data_broker", () => {
  const on = skeletonDocumentToText(assembleRegistrationSkeletonDocument(REPORT, INTAKE).document);
  assert(on.includes("has indicated that it acts as a data broker"));
  assert(on.includes("that it sells or licenses the data it brokers"));
  assert(on.includes("3,800,000 individuals"));
  assert(on.includes("61% of its revenue"));

  const off = skeletonDocumentToText(
    assembleRegistrationSkeletonDocument(
      { ...REPORT, registration_deliverables: { ...(REPORT.registration_deliverables as Record<string, unknown>), determinations: [] } },
      { ...INTAKE, acts_as_data_broker: false },
    ).document,
  );
  assert(off.includes("no data-broker registration duty attaches on its answers"));
  assert(!off.includes("has indicated that it acts as a data broker"));
});

Deno.test("SO-8: leads agree with the typed determinations", () => {
  const out = assembleRegistrationSkeletonDocument(REPORT, INTAKE);
  assertEquals(out.duty_counts.attached, 2); // California registrable + EU representative
  assertEquals(out.duty_counts.satisfied, 0);
  assertEquals(out.duty_counts.reserved, 1); // Texas conditional
  const text = skeletonDocumentToText(out.document);
  assert(text.includes("2 registration duties attach"));
  assert(text.includes("none is presently satisfied"));
  assert(text.includes("duty attaches in California"));
  assert(text.includes("requires an EU Article 27 representative"));
});

Deno.test("SO-8: fees and deadlines come only from registry rows, and no date is computed", () => {
  const text = skeletonDocumentToText(assembleRegistrationSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes("on or before January 31 following each year"));
  assert(text.includes("Cal. Civ. Code § 1798.99.82"));
  assert(!/your deadline is|due by 20\d\d-\d\d-\d\d/i.test(text), "a customer-specific deadline was computed");
});

Deno.test("SO-8: readiness names the responsible party the record supplies (428-D)", () => {
  const text = skeletonDocumentToText(assembleRegistrationSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes("Ingrid Halden, General Counsel is the party the company has named to supply"));
  const anon = skeletonDocumentToText(
    assembleRegistrationSkeletonDocument(REPORT, { ...INTAKE, approved_by_name: "", approved_by_title: "" }).document,
  );
  assert(anon.includes("the company has not named the party responsible for supplying it"));
});

Deno.test("SO-8: the honest permanent orphan is not consumed by any slot", () => {
  const sources = REGISTRATION_SLOT_MAP.map((b) => b.source).join(" ");
  assert(!sources.includes("cross_border_transfers"), "the honest permanent orphan was bound to a slot");
});

Deno.test("SO-8: the Table of Authorities is iff-cited", () => {
  const text = skeletonDocumentToText(assembleRegistrationSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes("Cal. Civ. Code § 1798.99.82"));
  assert(text.includes("GDPR Art. 27(1)"));
  assert(!text.includes("GDPR Art. 99"), "an uncited authority reached the Table of Authorities");
});

Deno.test("SO-8: statutory abbreviations survive sentence handling", () => {
  const text = skeletonDocumentToText(assembleRegistrationSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes("Tex. Bus. & Com. Code § 509.001") || text.includes("Texas"));
  assert(text.includes("Cal. Civ. Code § 1798.99.82"), "abbreviation-blind truncation clipped a pinpoint");
  assert(text.includes("GDPR Art. 27(1)"));
});

Deno.test("SO-8: an empty record degrades honestly and is never padded", () => {
  const out = assembleRegistrationSkeletonDocument({}, { organization_name: "Halden Data Services, Inc." });
  assertEquals(out.conformance, []);
  assertEquals(out.lead_coherence, []);
  const text = skeletonDocumentToText(out.document);
  assert(text.includes("no registration duty attaches"));
  assert(!text.includes("Not recorded") && !text.includes("TBD") && !text.includes("N/A"));
  assert(!text.includes("operating in"), "an unanswered profile clause was padded");
});
