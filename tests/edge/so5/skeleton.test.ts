// SO-5 — DPIA SKELETON CONFORMANCE BATTERY.
//
// Proves: the spine is byte-pinned to the CEO-corrected v3 skeleton, the
// dropped `{dataSources}` slot cannot come back, every slot in the fixed prose
// has a live binding in the slot map, the assembled document byte-matches the
// skeleton outside the slots, the v3 banned register never reaches the
// customer, degraded records degrade honestly, and the two SO-3 defect classes
// (proper-noun case-folding, abbreviation-blind truncation) cannot recur.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DPIA_SKELETON_CONTENT_HASH,
  DPIA_SKELETON_PINPOINTS,
  DPIA_SKELETON_SECTIONS,
  DPIA_SKELETON_SUBTITLE,
  DPIA_V3_BANNED_REGISTER,
} from "../../../supabase/functions/_shared/prose/plans/dpia.spine.ts";
import { DPIA_SLOT_MAP } from "../../../supabase/functions/_shared/prose/plans/dpia.slotmap.ts";
import { slotsIn } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import {
  assembleDpiaSkeletonDocument,
  firstSentence,
} from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

const INTAKE: Record<string, unknown> = {
  organization_name: "Northwind Health Networks",
  processing_activity_name: "Patient Triage Scoring",
  description: "An automated triage score is produced for each inbound patient contact",
  processing_version: "2.1",
  estimated_launch_date: "2026-10-01",
  reasons_to_conduct: ["Large-scale processing of special categories", "Systematic monitoring"],
  purpose: "prioritising clinical follow-up",
  data_subjects: "patients and their nominated contacts",
  data_categories: ["Health data", "Contact details"],
  volume_frequency: "approximately 40,000 contacts a month",
  functional_description: "Contact data is captured in the intake portal, scored in the triage service, and written back to the clinical record",
  legal_basis_proposed: "Public task (Art. 6(1)(e))",
  article_9_condition: "Art. 9(2)(h) health or social care",
  necessity_proportionality: "Triage cannot be performed without the clinical categories described",
  data_minimisation_justification: "only the categories needed to score urgency are read",
  data_quality_measures: "records are reconciled against the master patient index nightly",
  existing_safeguards: ["Encryption at rest", "Role-based access control"],
  dpia_prepared_by: "A. Okafor",
  dpia_team: "the clinical safety officer and the information governance lead",
  dpo_advice: "the officer advised that the Article 9(2)(h) condition is available",
  controller_contact: "dpo@northwind.example",
  dpia_approved_by_name: "R. Delacroix",
  dpia_approved_by_title: "Chief Medical Information Officer",
  dpia_signoff_basis: "the residual bands recorded in this assessment",
  dpia_scope_note: "the triage service only, excluding downstream analytics",
  estimated_end_date: "2027-10-01",
};

const REPORT: Record<string, unknown> = {
  section_6_conclusion: { decision: "CONDITIONALLY APPROVED — subject to the conditions listed." },
  art36_consultation: {
    determination: "consultation_not_required",
    why: "Every identified risk sits at a low or moderate residual band after the measures the record states.",
  },
  necessity_findings: [
    { verdict: "least_intrusive_means_supported", why: "The record identifies two alternatives under GDPR Art. 35(7)(b) and states why neither achieves the purpose. A narrower feed was rejected." },
  ],
  proportionality: [
    { verdict: "proportionate_on_the_record", why: "The record puts both sides of the balance and records two safeguards." },
  ],
  risk_register: [
    { risk_id: "r1", risk_label: "Unauthorised access to clinical records", likelihood: "Unlikely", severity: "significant", inherent_band: "high", residual_band: "moderate", measures: ["Encryption at rest", "Role-based access control"] },
    { risk_id: "r2", risk_label: "Excessive retention", likelihood: "Possible", severity: "limited", inherent_band: "moderate", residual_band: "moderate", measures: ["Role-based access control"] },
  ],
  information_needed: [],
  authority_exhibit: {
    entries: [
      { citation: "GDPR Art. 35", authority_class: "regulation" },
      { citation: "GDPR Art. 99", authority_class: "regulation" },
    ],
  },
};

Deno.test("SO-5 step 0: every slot in the fixed prose has a live binding", () => {
  const bound = new Set(DPIA_SLOT_MAP.map((b) => b.slot));
  const seen = new Set<string>([...slotsIn(DPIA_SKELETON_SUBTITLE)]);
  for (const section of DPIA_SKELETON_SECTIONS) {
    for (const block of section.blocks) {
      if (block.kind !== "skeleton") continue;
      for (const slot of slotsIn(block.text)) seen.add(slot);
    }
  }
  const unbound = [...seen].filter((x) => !bound.has(x));
  assertEquals(unbound, [], `unbound slots: ${unbound.join(", ")}`);
  assert(seen.size >= 15);
});

Deno.test("SO-5: the CEO-dropped {dataSources} slot cannot return", () => {
  const all = DPIA_SKELETON_SECTIONS.flatMap((s) => s.blocks.map((b) => b.text)).join(" ");
  assert(!all.includes("{dataSources"), "dataSources slot re-entered the skeleton");
  assert(!all.includes("the sources of that data"));
  assert(!DPIA_SLOT_MAP.some((b) => b.slot === "dataSources"));
  assertEquals(
    DPIA_SKELETON_CONTENT_HASH,
    "cf54ee9924e728e059aeeb097c00bcbcd71a011fe67d24541a1aafcf5a467421",
  );
});

Deno.test("SO-5 step 1: the statutory pinpoints carried by fixed prose are declared", () => {
  const keys = DPIA_SKELETON_PINPOINTS.map((p) => p.corpus_key);
  assertEquals(keys, ["gdpr-art-35", "gdpr-art-36", "gdpr-art-9"]);
});

Deno.test("SO-5 step 5: a complete record assembles conformantly and register-clean", () => {
  const sk = assembleDpiaSkeletonDocument(REPORT, INTAKE);
  assertEquals(sk.conformance, []);
  assertEquals(sk.register_findings, []);
  assertEquals(sk.document.sections.length, 6);
  const text = skeletonDocumentToText(sk.document);
  // Fixed prose survives byte-for-byte around the slots.
  assert(text.includes("Article 35 requires a data protection impact assessment where processing is likely to result in a high risk to the rights and freedoms of natural persons."));
  assert(text.includes("The company has stated the purpose of the processing as prioritising clinical follow-up."));
  assert(text.includes("The company relies on a task carried out in the public interest under Article 6(1)(e) as its legal basis."));
  assert(text.includes("Because special categories of data are involved, the company relies on Art. 9(2)(h) health or social care under Article 9(2)."));
  assert(text.includes("The contact for this assessment is dpo@northwind.example."));
  for (const banned of DPIA_V3_BANNED_REGISTER) {
    assert(!text.toLowerCase().includes(banned), `banned register reached the customer: ${banned}`);
  }
});

Deno.test("SO-5: leads read the typed determinations and never disagree with them", () => {
  const notRequired = assembleDpiaSkeletonDocument(REPORT, INTAKE);
  const exec = skeletonDocumentToText(notRequired.document);
  assert(exec.includes("may proceed subject to the measures identified in this assessment"));

  const required = assembleDpiaSkeletonDocument(
    {
      ...REPORT,
      art36_consultation: { determination: "consultation_required", why: "Two risks remain at a high residual band." },
      risk_register: [{ risk_label: "Unauthorised access", inherent_band: "high", residual_band: "high", measures: [] }],
    },
    INTAKE,
  );
  const t = skeletonDocumentToText(required.document);
  assert(t.includes("requires prior consultation with the supervisory authority under Article 36"));
  assert(t.includes("at a preliminary remaining risk level of high"));

  const open = assembleDpiaSkeletonDocument(
    {
      ...REPORT,
      art36_consultation: { determination: "undetermined_on_the_record", why: "The residual position cannot be settled." },
      risk_register: [{ risk_label: "Excessive retention", inherent_band: "high", residual_band: "undetermined", measures: [] }],
    },
    INTAKE,
  );
  const o = skeletonDocumentToText(open.document);
  assert(o.includes("cannot yet be settled"));
  assert(o.includes("remains undetermined"));
});

Deno.test("SO-5: a degraded record degrades honestly — no padding, no invention", () => {
  const sk = assembleDpiaSkeletonDocument(
    { risk_register: [], necessity_findings: [], proportionality: [] },
    {
      organization_name: "Northwind Health Networks",
      processing_activity_name: "Patient Triage Scoring",
      description: "An automated triage score is produced",
      purpose: "prioritising clinical follow-up",
      data_subjects: "patients",
      data_categories: ["Contact details"],
      volume_frequency: "40,000 contacts a month",
      legal_basis_proposed: "Public task (Art. 6(1)(e))",
      necessity_proportionality: "Triage cannot be performed without these categories",
    },
  );
  const t = skeletonDocumentToText(sk.document);
  assertEquals(sk.conformance, []);
  // Absent conditionals are omitted, never announced.
  assert(!t.includes("Article 9(2)"), t);
  assert(!t.includes("version "), t);
  assert(!t.includes("{"), "an unresolved slot reached the customer");
  // The honest negatives are stated.
  assert(t.includes("The company has not recorded that the advice of a data protection officer has been obtained."));
  assert(t.includes("No approver has been recorded"));
  assert(t.includes("The company has not recorded any safeguards for this processing."));
  assert(t.includes("No risk register has been assembled"));
});

Deno.test("SO-3 defect class 1: proper nouns are never case-folded", () => {
  const sk = assembleDpiaSkeletonDocument(REPORT, INTAKE);
  const t = skeletonDocumentToText(sk.document);
  assert(t.includes("Northwind Health Networks"), t);
  assert(!t.includes("northwind Health Networks"));
  assert(t.includes("A. Okafor"));
  assert(t.includes("R. Delacroix"));
});

Deno.test("SO-3 defect class 2: sentence truncation is abbreviation-aware", () => {
  assertEquals(
    firstSentence("The controller relies on GDPR Art. 35(7)(b) for the alternatives test. A second sentence follows."),
    "The controller relies on GDPR Art. 35(7)(b) for the alternatives test.",
  );
  assertEquals(firstSentence("See Cal. Civ. Code § 1798.82 for the duty. Then stop."), "See Cal. Civ. Code § 1798.82 for the duty.");
  const sk = assembleDpiaSkeletonDocument(REPORT, INTAKE);
  const t = skeletonDocumentToText(sk.document);
  assert(!/\bArt\.\s*$/m.test(t), "a sentence was truncated at an abbreviation");
  assert(t.includes("GDPR Art. 35(7)(b)"));
});

Deno.test("SO-5: the Table of Authorities lists an authority iff it is cited", () => {
  const sk = assembleDpiaSkeletonDocument(REPORT, INTAKE);
  const toa = sk.document.sections.find((s) => s.id === "table_of_authorities");
  assert(toa, "table of authorities missing");
  const text = toa!.paragraphs.map((p) => p.text).join("\n");
  assert(text.includes("GDPR Art. 35"), text);
  assert(!text.includes("GDPR Art. 99"), "an uncited authority was listed");
});
