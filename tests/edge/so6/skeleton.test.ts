// SO-6 — BIOMETRIC SKELETON CONFORMANCE BATTERY.
//
// Proves: the spine is byte-pinned to the CEO-corrected v3 skeleton (hash
// recomputed here over the paragraph list), the eight CEO-dropped slots cannot
// come back, every slot in the fixed prose has a live binding in the slot map,
// the assembled document byte-matches the skeleton outside the slots, the v3
// banned register never reaches the customer, degraded records degrade
// honestly, the conditional state blocks fire only on their trigger, and the
// two SO-3 defect classes (proper-noun case-folding, abbreviation-blind
// truncation) cannot recur.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BIOMETRIC_SKELETON_CONTENT_HASH,
  BIOMETRIC_SKELETON_PARAGRAPHS,
  BIOMETRIC_SKELETON_PINPOINTS,
  BIOMETRIC_SKELETON_SECTIONS,
  BIOMETRIC_SKELETON_SUBTITLE,
  BIOMETRIC_V3_BANNED_REGISTER,
} from "../../../supabase/functions/check-biometric-compliance/_local/prose/plans/biometric.spine.ts";
import { BIOMETRIC_SLOT_MAP } from "../../../supabase/functions/check-biometric-compliance/_local/prose/plans/biometric.slotmap.ts";
import { skeletonDocumentToText, slotsIn } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import {
  assembleBiometricSkeletonDocument,
  firstSentence,
} from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-skeleton-assemble.ts";

const INTAKE: Record<string, unknown> = {
  orgName: "Northwind Logistics Group",
  orgType: "Employer (employee biometrics)",
  purpose: "Time & attendance / workforce management",
  biometricTypes: ["Fingerprint / palm print", "Facial geometry / facial recognition"],
  jurisdictions: ["Illinois, USA (BIPA)", "Texas, USA (CUBI)", "Washington state, USA"],
  data_source_description: "hand-scanner enrolment at each depot turnstile",
  notice_before_collection: "Written notice given before collection",
  consent_artifact_type: "Standalone written release signed before collection",
  retention_schedule_text: "templates are deleted three years after the worker leaves",
  destruction_trigger: "the worker's last shift",
  security_measures_description: "templates are encrypted at rest and in transit and held in a segregated vault",
  tx_destruction_within_one_year: "Yes",
  approved_by_name: "R. Delacroix",
  approved_by_title: "Chief Privacy Officer",
  approval_date: "2026-08-10",
  next_review_due: "2027-08-10",
};

const REPORT: Record<string, unknown> = {
  duty_findings: [
    {
      key: "il_15b_notice", label: "Written notice before collection", statute_key: "us_il_bipa",
      statute_short: "BIPA", citation: "740 ILCS 14/15(b)",
      standard: "No private entity may collect ... a person's ... biometric identifier ... unless it first informs the subject ... in writing",
      record_fact: "Written notice is given before collection at each depot",
      application: "The company's answer meets the writing requirement of 740 ILCS 14/15(b). No further step is required.",
      verdict: "satisfied", status: "analysed", qualifiers_applied: [],
    },
    {
      key: "il_15a_schedule", label: "Written retention schedule and destruction guidelines", statute_key: "us_il_bipa",
      statute_short: "BIPA", citation: "740 ILCS 14/15(a)",
      standard: "A private entity in possession of biometric identifiers must develop a written policy, made available to the public",
      record_fact: "The retention schedule is not published",
      application: "The schedule exists but is not public, so the publication element of 740 ILCS 14/15(a) is unmet.",
      verdict: "not_satisfied", status: "analysed", qualifiers_applied: [],
    },
    {
      key: "tx_503b_notice", label: "Notice and consent before capture", statute_key: "us_tx_cubi",
      statute_short: "CUBI", citation: "Tex. Bus. & Com. Code § 503.001(b)",
      standard: "A person may not capture a biometric identifier of an individual for a commercial purpose unless the person informs the individual before capturing",
      record_fact: "Written notice is given before collection at each depot",
      application: "The company's answer satisfies § 503.001(b).",
      verdict: "satisfied", status: "analysed", qualifiers_applied: [],
    },
    {
      key: "wa_19375_020_enrol", label: "Enrolment without notice or consent", statute_key: "us_wa_19375",
      statute_short: "RCW 19.375", citation: "RCW 19.375.020",
      standard: "A person may not enroll a biometric identifier in a database for a commercial purpose, without first providing notice, obtaining consent, or providing a mechanism to prevent subsequent use",
      record_fact: "Whether templates are enrolled in a database for a commercial purpose is not recorded",
      application: "Without that answer the enrolment duty cannot be applied.",
      verdict: "record_insufficient", status: "record_insufficient",
      information_needed: "Whether biometric templates are enrolled in a database for a commercial purpose",
      qualifiers_applied: [],
    },
    {
      key: "il_15e_care", label: "Reasonable standard of care in storage and transmission", statute_key: "us_il_bipa",
      statute_short: "BIPA", citation: "740 ILCS 14/15(e)",
      standard: "A private entity in possession of a biometric identifier shall store, transmit, and protect from disclosure ... using the reasonable standard of care within the private entity's industry",
      record_fact: "Templates are encrypted at rest and in transit",
      application: "The measures described meet the standard of care element of 740 ILCS 14/15(e).",
      verdict: "satisfied", status: "analysed", qualifiers_applied: [],
    },
  ],
  consequence_determination: {
    unlawful_now: [
      { statute_short: "BIPA", citation: "740 ILCS 14/15(a)", duty: "publication of the written retention schedule", why: "The schedule is not published." },
    ],
    unresolved_on_record: [
      { statute_short: "RCW 19.375", citation: "RCW 19.375.020", duty: "enrolment notice and consent", information_needed: "Whether biometric templates are enrolled in a database for a commercial purpose" },
    ],
    exposure_surfaces: [],
    separation_note: "Exposure is stated separately from the duty findings.",
  },
  registry_applied: { named_but_unregistered: [] },
  authority_exhibit: {
    entries: [
      { citation: "740 ILCS 14/15(b)", authority_class: "statute" },
      { citation: "740 ILCS 14/15(a)", authority_class: "statute" },
      { citation: "RCW 19.375.020", authority_class: "statute" },
      { citation: "Cal. Civ. Code § 1798.100", authority_class: "statute" },
    ],
  },
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("SO-6: the spine is byte-pinned to the CEO-corrected v3 docx", async () => {
  // S-B5 (doc 80, 2026-08-27): 25 -> 26 — the unregistered-named-
  // jurisdictions conditional paragraph added under the CEO improvement
  // grant (ratification-ledger entry). The prior 25-paragraph hash
  // (4109a6f1a562a318a44978025dadb5802534f863680b8c6ecb87eace6449c48f)
  // is recorded in the spine header for the audit trail.
  assertEquals(BIOMETRIC_SKELETON_PARAGRAPHS.length, 26);
  assertEquals(await sha256(BIOMETRIC_SKELETON_PARAGRAPHS.join("\n")), BIOMETRIC_SKELETON_CONTENT_HASH);
  assertEquals(
    BIOMETRIC_SKELETON_CONTENT_HASH,
    "2a22748ad3fc3431114799af91316a62522e33a06d22a73acdb552b3e2102006",
  );
  // Every encoded block is a verbatim span of one of the paragraphs.
  for (const section of BIOMETRIC_SKELETON_SECTIONS) {
    for (const block of section.blocks) {
      assert(
        BIOMETRIC_SKELETON_PARAGRAPHS.some((p) => p.includes(block.text)),
        `block not traceable to a skeleton paragraph: ${block.text.slice(0, 60)}`,
      );
    }
  }
});

Deno.test("SO-6 step 0: every slot in the fixed prose has a live binding", () => {
  const bound = new Set(BIOMETRIC_SLOT_MAP.map((b) => b.slot));
  const seen = new Set<string>([...slotsIn(BIOMETRIC_SKELETON_SUBTITLE)]);
  for (const section of BIOMETRIC_SKELETON_SECTIONS) {
    for (const block of section.blocks) {
      for (const slot of slotsIn(block.text)) seen.add(slot);
    }
  }
  const unbound = [...seen].filter((x) => !bound.has(x));
  assertEquals(unbound, [], `unbound slots: ${unbound.join(", ")}`);
  assert(seen.size >= 12);
});

Deno.test("SO-6: the eight CEO-dropped slots cannot return", () => {
  const all = [BIOMETRIC_SKELETON_SUBTITLE, ...BIOMETRIC_SKELETON_PARAGRAPHS].join(" ");
  for (
    const dropped of [
      "dataSubjectTypes",
      "NOTICE_PURPOSE_PHRASE",
      "txNoticeConsent",
      "waNoticeConsent",
      "storageMethod",
      "RETENTION_PHRASE",
      "VENDOR_SENTENCE",
      "LEGAL_REVIEW_SENTENCE",
    ]
  ) {
    assert(!all.includes(`{${dropped}`), `dropped slot re-entered the skeleton: ${dropped}`);
    assert(!BIOMETRIC_SLOT_MAP.some((b) => b.slot === dropped), `dropped slot re-entered the map: ${dropped}`);
  }
  // The CEO remap and the sector binding survive.
  assertEquals(BIOMETRIC_SLOT_MAP.find((b) => b.slot === "retentionSchedule")?.source, "retention_schedule_text");
  assertEquals(BIOMETRIC_SLOT_MAP.find((b) => b.slot === "sector")?.source, "orgType");
});

Deno.test("SO-6 step 1: the statutory pinpoints carried by fixed prose are declared", () => {
  const keys = BIOMETRIC_SKELETON_PINPOINTS.map((p) => p.corpus_key);
  assertEquals(keys, [
    "il-bipa-740-14-15-a",
    "il-bipa-740-14-15-b",
    "il-bipa-740-14-15-c",
    "il-bipa-740-14-15-d",
    "il-bipa-740-14-15-e",
    "il-bipa-740-14-20-b",
    "il-bipa-740-14-20-c",
    "tx-cubi-503-001-a",
    "tx-cubi-503-001-b",
    "tx-cubi-503-001-c",
    "wa-rcw-19-375-020",
    "wa-rcw-19-373-030",
  ]);
});

Deno.test("SO-6 step 5: a complete record assembles conformantly and register-clean", () => {
  const sk = assembleBiometricSkeletonDocument(REPORT, INTAKE);
  assertEquals(sk.conformance, []);
  assertEquals(sk.register_findings, []);
  const text = skeletonDocumentToText(sk.document);

  // Fixed prose survives byte-for-byte around the slots.
  assert(text.includes("Each statute below is applied in its own words: the duty appears as the verified statutory passage states it, the company's answers are set beside it, and the conclusion follows from the two."));
  assert(text.includes("Northwind Logistics Group, operating in Employer (employee biometrics), has indicated that it collects fingerprint / palm print and facial geometry / facial recognition for time and attendance and wider workforce management, by means of hand-scanner enrolment at each depot turnstile."));
  assert(text.includes("The company has answered the written-notice question by confirming that written notice was given before collection; and the written-release question by identifying a standalone written release signed before collection."));
  assert(text.includes("The company has described its security measures as templates are encrypted at rest and in transit and held in a segregated vault."));
  assert(text.includes("Its retention is described as templates are deleted three years after the worker leaves, with destruction occurring on the worker's last shift."));
  assert(text.includes("This assessment is recorded as approved by R. Delacroix, Chief Privacy Officer, on 2026-08-10"));

  // The authoring directives never print.
  assert(!text.includes("[BYTE-PINNED]"));
  assert(!text.includes("[DETERMINATION LEAD]"));
  assert(!text.includes("[GENERATED]"));
  assert(!text.includes("[CONDITIONAL]"));
  assert(!text.includes("{"), "an unresolved slot reached the customer");

  for (const banned of BIOMETRIC_V3_BANNED_REGISTER) {
    assert(!text.toLowerCase().includes(banned), `banned register reached the customer: ${banned}`);
  }
});

Deno.test("SO-6: leads read the typed determinations and never disagree with them", () => {
  const unlawful = skeletonDocumentToText(assembleBiometricSkeletonDocument(REPORT, INTAKE).document);
  assert(unlawful.includes("does not meet one duty under BIPA"));
  assert(unlawful.includes("the single next act is to remedy publication of the written retention schedule at 740 ILCS 14/15(a)"));

  const openOnly = assembleBiometricSkeletonDocument(
    {
      ...REPORT,
      consequence_determination: {
        unlawful_now: [],
        unresolved_on_record: [{ statute_short: "RCW 19.375", citation: "RCW 19.375.020", duty: "enrolment notice", information_needed: "Whether templates are enrolled in a database for a commercial purpose" }],
        exposure_surfaces: [], separation_note: "",
      },
    },
    INTAKE,
  );
  const o = skeletonDocumentToText(openOnly.document);
  assert(o.includes("no duty in scope is unmet, but one duty is left unresolved"));

  const clean = assembleBiometricSkeletonDocument(
    { ...REPORT, consequence_determination: { unlawful_now: [], unresolved_on_record: [], exposure_surfaces: [], separation_note: "" } },
    INTAKE,
  );
  const c = skeletonDocumentToText(clean.document);
  assert(c.includes("meets each statutory duty in scope"));
});

Deno.test("SO-6: the statutory destruction clock is stated, and the company's own words are not rewritten", () => {
  const t = skeletonDocumentToText(assembleBiometricSkeletonDocument(REPORT, INTAKE).document);
  assert(t.includes("the retention period runs from the date the initial purpose for collection has been satisfied or from the individual's last interaction with the company, whichever occurs first, and not from the date of collection."));
  assert(t.includes("destruction occurring on the worker's last shift"));
});

Deno.test("SO-6: conditional state blocks fire only on their trigger", () => {
  const t = skeletonDocumentToText(assembleBiometricSkeletonDocument(REPORT, INTAKE).document);
  assert(t.includes("Illinois. The Biometric Information Privacy Act"));
  assert(t.includes("Public Act 103-769"));
  assert(t.includes("Texas. The Capture or Use of Biometric Identifier Act"));
  assert(t.includes("that biometric identifiers are destroyed within one year"));
  assert(t.includes("Washington. RCW 19.375"));

  const ilOnly = assembleBiometricSkeletonDocument(REPORT, { ...INTAKE, jurisdictions: ["Illinois, USA (BIPA)"] });
  const i = skeletonDocumentToText(ilOnly.document);
  assert(i.includes("Illinois."));
  assert(!i.includes("Texas. The Capture"));
  assert(!i.includes("Washington. RCW 19.375"));

  const other = assembleBiometricSkeletonDocument(
    { ...REPORT, registry_applied: { named_but_unregistered: ["Oregon"] } },
    { ...INTAKE, jurisdictions: ["Other US state"], other_state_names: "Oregon" },
  );
  const oText = skeletonDocumentToText(other.document);
  assert(oText.includes("The company has named Oregon."));
  assert(!/confirm (the )?applicable law/i.test(oText), "a generic confirm-applicable-law instruction reached the customer");
});

Deno.test("SO-6: a degraded record degrades honestly — no padding, no invention", () => {
  const sk = assembleBiometricSkeletonDocument(
    { duty_findings: [], consequence_determination: {} },
    {
      orgName: "Northwind Logistics Group",
      orgType: "Employer (employee biometrics)",
      purpose: "Physical access control",
      biometricTypes: ["Iris or retina scan"],
      jurisdictions: ["EU / EEA (GDPR)"],
    },
  );
  const t = skeletonDocumentToText(sk.document);
  assertEquals(sk.conformance, []);
  assert(!t.includes("{"), "an unresolved slot reached the customer");
  // Absent answers drop their sentence rather than being announced or padded.
  assert(!t.includes("by means of"), t);
  assert(!t.includes("The company has answered the written-notice question"), t);
  assert(!t.includes("The company has described its security measures"), t);
  // The honest negatives are stated.
  assert(t.includes("No statutory duty has been analysed"));
  assert(t.includes("No approver, title or approval date has been recorded"));
  assert(t.includes("The company has not recorded a written retention schedule"));
  // The states sentence survives on its own.
  assert(t.includes("The states whose laws the company has placed in scope are EU / EEA (GDPR)."));
});

Deno.test("SO-3 defect class 1: proper nouns are never case-folded", () => {
  const t = skeletonDocumentToText(assembleBiometricSkeletonDocument(REPORT, INTAKE).document);
  assert(t.includes("Northwind Logistics Group"));
  assert(!t.includes("northwind Logistics Group"));
  assert(t.includes("R. Delacroix"));
  // CEO ruling: the sector label renders as the reader gave it.
  assert(t.includes("operating in Employer (employee biometrics)"));
  assert(t.includes("Illinois, USA (BIPA)"));
});

Deno.test("SO-3 defect class 2: sentence truncation is abbreviation-aware", () => {
  assertEquals(
    firstSentence("The duty arises under Tex. Bus. & Com. Code § 503.001(b) before capture. A second sentence follows."),
    "The duty arises under Tex. Bus. & Com. Code § 503.001(b) before capture.",
  );
  const t = skeletonDocumentToText(assembleBiometricSkeletonDocument(REPORT, INTAKE).document);
  assert(!/\bCode\.\s*$/m.test(t), "a sentence was truncated at an abbreviation");
  assert(t.includes("Tex. Bus. & Com. Code § 503.001(b)"));
});

Deno.test("SO-6: the Table of Authorities lists an authority iff it is cited", () => {
  const sk = assembleBiometricSkeletonDocument(REPORT, INTAKE);
  const toa = sk.document.sections.find((s) => s.id === "table_of_authorities");
  assert(toa, "table of authorities missing");
  const text = toa!.paragraphs.map((p) => p.text).join("\n");
  assert(text.includes("740 ILCS 14/15(a)"), text);
  assert(text.includes("RCW 19.375.020"), text);
  assert(!text.includes("Cal. Civ. Code § 1798.100"), "an uncited authority was listed");
});
