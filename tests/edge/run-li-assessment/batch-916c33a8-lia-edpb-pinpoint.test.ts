// BATCH 916c33a8 (2026-09-10) — Velantrix LIA (a2adac32, 89/93). Section IV
// quoted "the mere fulfilment of information duties according to Articles
// 12, 13 and 14 GDPR is not sufficient in itself …" against a bare "EDPB
// Guidelines 1/2024" in the Table of Authorities — the only EDPB 1/2024
// registry row without a pinpoint. Verified against the published PDF
// (Version 1.0, adopted 8 October 2024): para. 68, Section III.2.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { LIA_VERIFIED_AUTHORITIES } from "../../../supabase/functions/run-li-assessment/_local/registry/lia-verified-authorities.ts";
import { buildLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { assembleLiaSkeletonDocument, renderLiaToa } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { liaCorpusProvisionsForExhibit } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-corpus.ts";

type Bag = Record<string, unknown>;

// The batch's own record, trimmed to what Section IV's expectation factor
// reads: notice-only support (collection context + expectation detail both
// run to the privacy notice), so the EDPB information-duties sentence fires.
const VELANTRIX: Bag = {
  organization_name: "Velantrix Digital Services Ltd",
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  stated_purpose: "To detect and prevent fraudulent account creation, protecting both the platform and legitimate users from abuse and financial harm.",
  subject_anchor: "Behavioural fraud screening of new user account registrations",
  data_categories: ["Contact details", "Customer records", "Other"],
  relationship_type: "Prospective customer initiating account registration",
  processing_description:
    "Device fingerprints, IP address, sign-up velocity signals and email-domain reputation scores are ingested in real time and passed through a rule-based risk engine that produces a fraud-risk score; accounts scoring above threshold are flagged for manual review or automatic block.",
  purpose_details: {
    interest_type: "Security / fraud prevention",
    interest_holder: "Our organisation and a third party (e.g. business partner)",
    interest_statement: "Velantrix Digital Services Ltd runs automated fraud-risk scoring on new account registrations to protect the integrity of its platform.",
    specific_benefit: "Fraudulent accounts are blocked before they can be used to conduct abuse, spam or payment fraud.",
    beneficiary: "Our business and the individuals",
    controller_is_public_authority: "No",
  },
  balancing_details: {
    reasonable_expectation: "Probably — disclosed in privacy notice and consistent with the relationship",
    reasonable_expectation_detail: "Registering users are informed via the privacy notice that account-integrity checks are performed at sign-up; fraud screening is a standard and widely expected practice for online services.",
    collection_context: "Data are collected at the point of account registration on velantrix.io; users are directed to the privacy notice during sign-up and are told that security checks apply.",
    safeguards: ["Encryption at rest and in transit", "Pseudonymisation"],
    potential_harm: "Limited — minor inconvenience or unwanted contact",
    opt_out_available: "No opt-out is available",
    vulnerable_subjects: ["None"],
    children_data_subjects: "Unknown",
    special_category_data: false,
  },
  necessity_details: {
    alternatives: "Blanket CAPTCHA-only controls — insufficient to detect sophisticated bot-driven fraud rings",
    data_minimised: "Only the device fingerprint hash, IP address, registration timestamp and email-domain reputation score are processed.",
    why_consent_not_used: "Requesting consent would alert fraudsters and allow them to decline, defeating the purpose entirely.",
  },
  alternatives_considered: "Blanket CAPTCHA-only controls",
};

function documentText(record: Bag): string {
  const report = buildLiaDeliverables(record) as unknown as Bag;
  const doc = assembleLiaSkeletonDocument(report, record, { deterministic: true }) as unknown as {
    document: { sections: Array<{ paragraphs: Array<{ text: string }> }> };
  };
  return doc.document.sections.flatMap((sec) => sec.paragraphs.map((p) => p.text)).join("\n");
}

Deno.test("916c33a8 LIA-1 — the rendered Section IV cites the paragraph; the bare instrument no longer renders as the citation", () => {
  const text = documentText(VELANTRIX);
  // DOC 252 ledger B4 (revised): the composed sentence carries the registry pinpoint.
  assertStringIncludes(
    text,
    "EDPB Guidelines 1/2024, para. 68 addresses that directly — the mere fulfilment of information duties according to Articles 12, 13 and 14 GDPR is not sufficient in itself to consider that the data subjects can reasonably expect a given processing.",
  );
  assert(!text.includes("EDPB Guidelines 1/2024 address that directly"), "the pre-252 bare citation must not render");
  assertStringIncludes(text, "EDPB Guidelines 1/2024, para. 68");
});

// ── DOC 252 B4 (CEO-ruled 2026-09-11): the Table of Authorities carries
// guidance PINPOINTS. The edge function's exhibit (index.ts walkCites →
// buildAuthorityExhibit over liaCorpusProvisionsForExhibit) now lists each
// pin-verified guidance row under its pinpoint citation; the assembler's ToA
// lists the pinpoints the body cites and drops the bare instrument line when
// a pinpointed sibling is cited.

function toaText(record: Bag, exhibitEntries: Bag[]): string {
  const report = buildLiaDeliverables(record) as unknown as Bag;
  report.authority_exhibit = { entries: exhibitEntries };
  const doc = assembleLiaSkeletonDocument(report, record, { deterministic: true }) as unknown as {
    document: { sections: Array<{ id?: string; paragraphs: Array<{ text: string }> }> };
  };
  const toa = doc.document.sections.find((s) => s.id === "table_of_authorities");
  return (toa?.paragraphs ?? []).map((p) => p.text).join("\n");
}

const EXHIBIT: Bag[] = [
  { citation: "Article 6(1)(f) GDPR", corpus_key: "gdpr-art-6-1-f", pin_verified: true },
  { citation: "EDPB Guidelines 1/2024", corpus_key: "edpb-1-2024:edpb_1_2024_notice_alone_not_sufficient", pin_verified: true },
  { citation: "EDPB Guidelines 1/2024, para. 68", corpus_key: "edpb-1-2024:edpb_1_2024_notice_alone_not_sufficient", pin_verified: true },
  { citation: "EDPB Guidelines 1/2024, Section II.C.3", corpus_key: "edpb-1-2024:edpb_1_2024_reasonable_expectations_weighed", pin_verified: true },
];

Deno.test("916c33a8 LIA-2 — the Table of Authorities lists the guidance pinpoint the body cites, and not the bare instrument beside it", () => {
  const toa = toaText(VELANTRIX, EXHIBIT);
  assertStringIncludes(toa, "Guidance and Persuasive Authority (persuasive)\n    EDPB Guidelines 1/2024, para. 68");
  assert(!/\n    EDPB Guidelines 1\/2024\n/.test(`${toa}\n`), `bare instrument line must not render beside its pinpoint:\n${toa}`);
  // A pinpoint the body does not cite is not listed (iff-cited law, SO-11).
  assert(!toa.includes("Section II.C.3"), toa);
});

Deno.test("916c33a8 LIA-2 — renderLiaToa keeps the bare instrument only when no pinpointed sibling is cited", () => {
  const body = "The three conditions in EDPB Guidelines 1/2024 are cumulative. Article 6(1)(f) GDPR applies.";
  const toa = renderLiaToa(["Article 6(1)(f) GDPR", "EDPB Guidelines 1/2024", "EDPB Guidelines 1/2024, para. 68"], body);
  assertStringIncludes(toa, "    EDPB Guidelines 1/2024");
  assert(!toa.includes("para. 68"), toa);
  const pinned = renderLiaToa(["Article 6(1)(f) GDPR", "EDPB Guidelines 1/2024", "EDPB Guidelines 1/2024, para. 68"], `${body} EDPB Guidelines 1/2024, para. 68 addresses that.`);
  assertStringIncludes(pinned, "    EDPB Guidelines 1/2024, para. 68");
  assertEquals((pinned.match(/EDPB Guidelines 1\/2024/g) ?? []).length, 1);
});

Deno.test("916c33a8 LIA-2 — the exhibit provisions carry every pin-verified guidance row under its pinpoint, plus the base once", () => {
  const corpus = {
    version: "t",
    provisions: [],
    guidance: [
      { proposition_key: "edpb_1_2024_notice_alone_not_sufficient", citation: "EDPB Guidelines 1/2024, para. 68", verbatim: "the mere fulfilment …", pin_verified: true },
      { proposition_key: "edpb_1_2024_reasonable_expectations_weighed", citation: "EDPB Guidelines 1/2024, Section II.C.3", verbatim: "reasonable expectations …", pin_verified: true },
      { proposition_key: "edpb_1_2024_child_interests_prevail", citation: "EDPB Guidelines 1/2024, Section II.C", verbatim: "the interests …", pin_verified: false },
    ],
    approved_count: 0,
    guidance_verified_count: 2,
  };
  const rows = liaCorpusProvisionsForExhibit(corpus as never).map((r) => r.citation);
  assertEquals(rows, ["EDPB Guidelines 1/2024, para. 68", "EDPB Guidelines 1/2024", "EDPB Guidelines 1/2024, Section II.C.3"]);
});

Deno.test("916c33a8 LIA-2 — the edge function's cite walker keeps the pinpoint suffix (source scan; the walker is a closure)", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/run-li-assessment/index.ts", import.meta.url));
  assertStringIncludes(src, "EDPB\\s+Guidelines\\s+1\\/2024(?:,\\s*(?:para\\.\\s*\\d+|Section\\s+[A-Z0-9.]+(?<!\\.)))?");
  const re = /EDPB\s+Guidelines\s+1\/2024(?:,\s*(?:para\.\s*\d+|Section\s+[A-Z0-9.]+(?<!\.)))?/gi;
  const hits = [..."EDPB Guidelines 1/2024, para. 68 addresses that; EDPB Guidelines 1/2024, Section II.C.3. Bare EDPB Guidelines 1/2024 too.".matchAll(re)].map((m) => m[0]);
  assertEquals(hits, ["EDPB Guidelines 1/2024, para. 68", "EDPB Guidelines 1/2024, Section II.C.3", "EDPB Guidelines 1/2024"]);
});

const ROW = (LIA_VERIFIED_AUTHORITIES as Record<string, { citation: string; subsection: string; verbatim_quote: string; verified_on: string }>)
  .edpb_1_2024_notice_alone_not_sufficient;

Deno.test("916c33a8 LIA-1 — the information-duties row carries its paragraph pinpoint on both cited surfaces", () => {
  assertEquals(ROW.subsection, "EDPB Guidelines 1/2024, para. 68");
  assertEquals(ROW.citation, "EDPB Guidelines 1/2024, para. 68 (information duties and reasonable expectations)");
  assertEquals(ROW.verified_on, "2026-09-10");
  // The verbatim quote is byte-unchanged (it is para. 68's own sentence).
  assertEquals(
    ROW.verbatim_quote,
    "the mere fulfilment of information duties according to Articles 12, 13 and 14 GDPR is not sufficient in itself to consider that the data subjects can reasonably expect a given processing.",
  );
});

Deno.test("916c33a8 LIA-1 — every EDPB 1/2024 row now cites below the guideline title", () => {
  for (const [key, row] of Object.entries(LIA_VERIFIED_AUTHORITIES as Record<string, { subsection: string; governing_anchor: string }>)) {
    if (!key.startsWith("edpb_1_2024_")) continue;
    assert(row.subsection !== "EDPB Guidelines 1/2024", `${key} cites the guideline bare`);
    assert(row.subsection.startsWith("EDPB Guidelines 1/2024, "), `${key}: ${row.subsection}`);
  }
});
