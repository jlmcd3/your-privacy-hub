// DOC 206 STEP 0 — THE FIXTURE DIAGNOSTIC (2026-09-06).
//
// WHY THIS EXISTS: the LIA deterministic verdict engine
// (three-part-test-typed.ts) computes purpose/necessity/balancing verdicts
// WITHOUT reading the enforcement-decision corpus at all — a separate module
// only ranks corpus rows for DISPLAY after the verdict is already fixed. A
// customer whose facts match a rejected/conditional enforcement action could
// still be told their test passes. Before building any corpus-derived rule
// that changes the engine's verdict (doc 206), this measures how often that
// actually happens today.
//
// METHOD: every `authority_relevance_profiles` row for product='lia' with
// outcome_posture in ('rejected','conditional') was read against its source
// row (enforcement_actions / edpb_guidelines / regulatory_guidance). A
// MINIMAL intake fixture was built for each row that has a genuine, concrete
// FACT PATTERN — using ONLY the six field-groups the task specifies
// (data_categories, relationship_type, jurisdictions, processing_description,
// balancing_details.{special_category_data, children_data_subjects,
// reasonable_expectation, potential_harm, safeguards}, and
// necessity_details.alternatives) — leaving every other field absent. No
// fact is invented: a field is populated only when the source states it.
//
// SCOPE NOTE (found on 154 rows): 91 of the 154 rows are EDPB Guidelines
// 1/2024 or ICO "guide to lawful basis" DOCTRINE paragraphs with no concrete
// fact pattern to encode (abstract legal principles, not a decided case) —
// they cannot be run through the engine as a fixture at all. Only 63 rows
// carry a genuine fact pattern: 58 enforcement_actions decisions plus 5 EDPB
// Guidelines 1/2024 "worked examples" (concrete hypotheticals the EDPB itself
// uses to illustrate the test). Those 63 are the ones built and run below;
// the other 91 are listed for the record (DOCTRINE_ONLY) but never executed.
//
// PIPELINE REPLICATION: typedReportFor() below reproduces, in this exact
// order, the deterministic attach sequence run-li-assessment/index.ts
// performs before calling buildThreePartTestTyped (index.ts lines ~1805-1878
// as of 2026-09-06): attachLiaDeliverables -> attachLiaUpgrade4 ->
// attachPrecedentClassPosture -> buildThreePartTestTyped. This is the same
// sequence tests/edge/run-li-assessment/l1-l3-deterministic.test.ts already
// pins, reused here rather than re-derived.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildThreePartTestTyped,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";

type Bag = Record<string, unknown>;

/** The deterministic path's attach order, reproduced for the harness —
 * identical to l1-l3-deterministic.test.ts's typedReportFor. */
function typedReportFor(intake: Bag): Bag {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  return report;
}

interface Fixture {
  readonly profileId: string;
  readonly sourceTable: "enforcement_actions" | "edpb_guidelines";
  readonly sourceRowId: string;
  readonly subject: string;
  readonly country: string;
  readonly outcomePosture: "rejected" | "conditional";
  readonly factorIds: readonly string[];
  readonly note: string;
  readonly intake: Bag;
}

// ── The 63 concrete-fact-pattern fixtures (58 enforcement_actions + 5 EDPB
// Guidelines 1/2024 worked examples). Built from each row's own curation_note
// (which already quotes/translates the operative source text) cross-checked
// against enforcement_actions.key_compliance_failure / .preventive_measures /
// .subject fetched live from the corpus DB (project 75bce9a1-...) on
// 2026-09-06. ──────────────────────────────────────────────────────────────
const FIXTURES: Fixture[] =
[
  {
    profileId: "174b5b33-844a-4d60-b14a-2b9e4c34dc38",
    sourceTable: "enforcement_actions",
    sourceRowId: "da667895-0949-4d37-84c4-978627cd67e8",
    subject: "XASTRE DO PETO, S.L.",
    country: "ES",
    outcomePosture: "conditional",
    factorIds: ["Interest legitimacy", "Safeguards and mitigations"],
    note: "AEPD found the opt-out did not meet the Art. 21(2)/LSSI effective-objection standard.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We rely on legitimate interest with a customer opt-out to send commercial marketing communications, after collecting contact details on a form given to customers for an unrelated purpose.",
      balancing_details: {
        safeguards: ["An opt-out mechanism for the marketing communications"],
      },
    },
  },
  {
    profileId: "5035b67f-cf0e-493c-b7f9-54c58d760804",
    sourceTable: "enforcement_actions",
    sourceRowId: "c1941d32-7bb5-4492-b38d-a78793705177",
    subject: "HOSPITAL RECOLETAS PONFERRADA, S.L.",
    country: "ES",
    outcomePosture: "conditional",
    factorIds: ["Interest legitimacy", "Safeguards and mitigations", "Reasonable expectations of the data subject"],
    note: "A form-migration defect defaulted the opt-out checkbox to opted-in; AEPD found the objection mechanism did not function as a genuine opt-out.",
    intake: {
      data_categories: ["Health or medical data", "Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We rely on legitimate interest with an opt-out checkbox to send marketing communications about the medical service a patient received.",
      balancing_details: {
        special_category_data: true,
        safeguards: ["An opt-out checkbox for marketing communications"],
      },
    },
  },
  {
    profileId: "6715b989-9ffb-4cc5-bd31-307775d93d0c",
    sourceTable: "enforcement_actions",
    sourceRowId: "cc2e878b-5e81-4d51-90d4-1b43e248d070",
    subject: "AMADEUS IT GROUP, S.A.",
    country: "ES",
    outcomePosture: "conditional",
    factorIds: ["Interest legitimacy"],
    note: "Pre-GDPR (Directive 95/46) decision terminated by voluntary payment; no substantive DPA finding text available. LOW CONFIDENCE — outcome_posture unconfirmed per doc 205A.",
    intake: {
      data_categories: ["Other"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We rely on legitimate interest in better understanding our services and improving them, identifying usage trends and developing new products.",
    },
  },
  {
    profileId: "7026da6a-7d4a-42c9-aac8-c17dae0f8121",
    sourceTable: "enforcement_actions",
    sourceRowId: "642f074e-0ccd-4e98-b19d-709b05a18b06",
    subject: "Banco Bilbao Vizcaya Argentaria, S.A.",
    country: "ES",
    outcomePosture: "conditional",
    factorIds: ["Reasonable expectations of the data subject", "Safeguards and mitigations"],
    note: "AEPD's Art. 13 finding: BBVA failed to inform customers of the purpose and legal basis where the basis relied on was legitimate interest.",
    intake: {
      data_categories: ["Financial data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We rely on legitimate interest for profiling and marketing processing of customer data, disclosed through a consent pop-up whose scope required following a link to another page.",
    },
  },
  {
    profileId: "cf4da7d7-f8bc-4614-bd99-99d2732a486d",
    sourceTable: "enforcement_actions",
    sourceRowId: "398397cf-b8ae-4063-a884-83243e009a3d",
    subject: "SA Rossel & Cie",
    country: "BE",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Necessity and less-intrusive means", "Special-category and ePrivacy interplay"],
    note: "APD/GBA Litigation Chamber: processing via cookies cannot be based on Art. 6(1)(f); citing CJEU Planet49.",
    intake: {
      data_categories: ["Device/technical data", "Browsing/behavioural data"],
      relationship_type: "Website visitor (no account)",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We place non-essential statistical and advertising cookies on website visitors' devices, relying on the website owner's legitimate interest rather than consent, with pre-ticked boxes.",
    },
  },
  {
    profileId: "06d3c3ee-5774-4093-8985-b0ec18fec623",
    sourceTable: "enforcement_actions",
    sourceRowId: "eb4cfde4-90c3-42f6-a829-5c83f0844db1",
    subject: "Vamavi Phone S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Reasonable expectations of the data subject", "Relationship with the individual"],
    note: "A registered opt-out list (Robinson) is a recorded statement of the individual's expectation; the call ignored it.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Prospective customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We make marketing calls to prospective customers to offer telecommunications services, including individuals registered on the Robinson advertising-exclusion list.",
      balancing_details: {
        reasonable_expectation: "No",
      },
    },
  },
  {
    profileId: "26091f81-6e95-4872-bc39-a83fb793627a",
    sourceTable: "enforcement_actions",
    sourceRowId: "edc7caed-721c-49be-8ae5-b1e1b8991dea",
    subject: "SOPHIE ET VOILA, S.L",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Balancing of interests, rights and freedoms", "Reasonable expectations of the data subject"],
    note: "AEPD found the processing unlawful notwithstanding the mitigations offered.",
    intake: {
      data_categories: ["Other"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We rely on legitimate interest to post a customer's photograph (wearing our product, face partly obscured) on Instagram to showcase our designs, before the customer had fully paid for the item.",
      balancing_details: {
        reasonable_expectation: "No",
        safeguards: ["Brief posting duration", "Partial anonymisation (face partly obscured)"],
      },
    },
  },
  {
    profileId: "4b79d337-8318-4b53-83ae-25cc54b7fa1d",
    sourceTable: "enforcement_actions",
    sourceRowId: "172956c6-64b9-4289-aee7-6f8b5af2520c",
    subject: "AXARQUIA VELEZ DENTAL, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Necessity and less-intrusive means"],
    note: "Own ROPA documented Legitimate Interest as the CCTV basis; AEPD found the coverage exceeded what was necessary (Art. 5(1)(c)).",
    intake: {
      data_categories: ["Other"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We rely on legitimate interest, legal authorisation, transparency and lawfulness to operate CCTV for security purposes, with cameras covering more areas than strictly necessary including patient treatment rooms.",
    },
  },
  {
    profileId: "5a09d9e2-9438-4a7b-a206-5af3ad6f7144",
    sourceTable: "enforcement_actions",
    sourceRowId: "4382ffa3-2683-4518-a74a-90b21b868180",
    subject: "CÁMARA DE COMERCIO, INDUSTRIA, SERVICIOS Y NAVEGACIÓN DE ESPAÑA",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Reasonable expectations of the data subject", "Potential harms and severity", "Relationship with the individual"],
    note: "AEPD fined EUR 500,000; data subjects who provided data for one purpose do not expect exposure or resale.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We process and make available sole traders' personal data (which coincides with their business data), resulting in the data being left exposed and offered for sale online.",
      balancing_details: {
        reasonable_expectation: "No — we have no relationship with these individuals; they would not expect this",
        potential_harm: "Significant — discrimination, financial loss, reputational damage",
      },
    },
  },
  {
    profileId: "5e009975-8b58-4e22-90d8-414aa7d9c406",
    sourceTable: "enforcement_actions",
    sourceRowId: "8d710906-539f-4ca8-8e43-1dad789b6acb",
    subject: "Vodafone España, S.A.U.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Safeguards and mitigations"],
    note: "A commercial objective pursued by fraud is not a legitimate interest — fails the first limb before necessity or balancing.",
    intake: {
      data_categories: ["Contact data", "Other"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "An employee of our store processed a customer's identity document and personal data without consent to carry out an unauthorised number port, forging the customer's signature.",
    },
  },
  {
    profileId: "659b6efc-1464-4618-8022-de54b847ad38",
    sourceTable: "enforcement_actions",
    sourceRowId: "135dd822-9a70-4645-a191-5c19760ab14a",
    subject: "ESTUDIO INMOBILIARIO SAN ISIDRO, S.L.U.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms"],
    note: "AEPD (hypothetical framing): even if legitimate interest could be claimed, no balancing of interests was provided to substantiate it.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "Our employees visited a person's home to solicit rental/sale business and asked neighbours for the resident's family contact details, without a shown source for the address.",
      balancing_details: {
        reasonable_expectation: "No — we have no relationship with these individuals; they would not expect this",
      },
    },
  },
  {
    profileId: "75299ee4-063e-4df4-9608-9e40a0a6bc05",
    sourceTable: "enforcement_actions",
    sourceRowId: "d47222c4-c7db-4564-9074-831a5753ee52",
    subject: "EUROPA PRESS DE CATALUNYA, S.A.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Special-category and ePrivacy interplay", "Interest legitimacy"],
    note: "Article 9 special-category data cannot be reached by Art. 6(1)(f) at all — the special-category gate is anterior to balancing.",
    intake: {
      data_categories: ["Special category data", "Health or medical data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We published an audio recording of a rape victim's court testimony as part of news reporting on a high-profile case.",
      balancing_details: {
        special_category_data: true,
        potential_harm: "Severe — physical safety, identity theft, loss of livelihood",
      },
    },
  },
  {
    profileId: "7be0fcef-9232-47e6-a784-094a6cf305a3",
    sourceTable: "enforcement_actions",
    sourceRowId: "4749afea-3f5f-4903-a759-09ddb6f481bb",
    subject: "FLY FUT, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms", "Relationship with the individual", "Children's data"],
    note: "AEPD: contrary to necessity and proportionality; the complainant/parent has no relationship with the respondent.",
    intake: {
      data_categories: ["Other"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We filmed and distributed video of children playing in football matches, to provide a service to third parties, without parental consent and with no relationship to the families filmed.",
      balancing_details: {
        children_data_subjects: "Yes",
        reasonable_expectation: "No — we have no relationship with these individuals; they would not expect this",
      },
    },
  },
  {
    profileId: "8467ddcb-3690-4633-b964-3ee9c04d9373",
    sourceTable: "enforcement_actions",
    sourceRowId: "7edab77e-1403-4bdb-a834-9aa626f97dd1",
    subject: "DIARIO ABC, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Potential harms and severity", "Balancing of interests, rights and freedoms"],
    note: "Severity is assessed on the consequence to the individual; irreversible reputational/psychological injury is not outweighed by any asserted interest.",
    intake: {
      data_categories: ["Other"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We published an audio recording of a rape victim's court testimony as part of news reporting.",
      balancing_details: {
        potential_harm: "Severe — physical safety, identity theft, loss of livelihood",
      },
    },
  },
  {
    profileId: "89be690c-963b-4795-afe6-c28b17880519",
    sourceTable: "enforcement_actions",
    sourceRowId: "ad36611f-1840-4d06-b330-8cbff6cb5882",
    subject: "Avata Hispania, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Relationship with the individual", "Interest legitimacy"],
    note: "A former processor has no residual legitimate interest in data it held once the relationship it depended on ended.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "After our processor relationship with the controller ended, we continued to process its customers' data and made telephone contact with those customers to offer them the same services.",
    },
  },
  {
    profileId: "8b2b9408-19c1-4e9f-bff2-7d15b528299f",
    sourceTable: "enforcement_actions",
    sourceRowId: "97c51fc9-519d-4886-ab07-fa9bea086621",
    subject: "SERVICIOS DE INTEGRACIÓN DE ANDALUCÍA",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Necessity and less-intrusive means", "Balancing of interests, rights and freedoms", "Relationship with the individual"],
    note: "AEPD: legitimate interest could apply, but the employer must perform and document the necessity/balancing test — which it had not done.",
    intake: {
      data_categories: ["Contact data", "Employment data"],
      relationship_type: "Employee",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We added a new employee's personal mobile phone number to a work WhatsApp group for work communications, without the employee's consent and without offering a corporate-channel alternative.",
    },
  },
  {
    profileId: "93d2041f-5adc-41bc-a11d-f63a16bfa08b",
    sourceTable: "enforcement_actions",
    sourceRowId: "99d0804e-9263-4569-94bc-1d20cdbf9140",
    subject: "CAMERDATA, S.A.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Reasonable expectations of the data subject"],
    note: "Sole-trader business data is still personal data; a commercial interest in selling it is not a legitimate interest.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We hold and make available self-employed business owners' data, which coincides with their personal data, resulting in it being left exposed and sold on the internet.",
      balancing_details: {
        reasonable_expectation: "No — we have no relationship with these individuals; they would not expect this",
      },
    },
  },
  {
    profileId: "9c6e6af2-6b82-45a8-81ae-12b84075f30b",
    sourceTable: "enforcement_actions",
    sourceRowId: "f035e4ef-bc6c-4f4b-b2b8-53f89c6d6136",
    subject: "QUALITY-PROVIDER S.A.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Reasonable expectations of the data subject", "Safeguards and mitigations"],
    note: "AEPD: no balancing test conducted AND no transparency about the claimed interest to enable an objection — one of the cleanest rejection statements in the corpus.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Prospective customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We obtained a household's contact data from a data broker and called them for marketing purposes, continuing after a deletion request, without conducting a balancing test or informing them of the legitimate interest relied on.",
      balancing_details: {
        reasonable_expectation: "No",
        safeguards: [],
      },
    },
  },
  {
    profileId: "a5013238-0eea-4cd3-91df-58d799dc67ac",
    sourceTable: "enforcement_actions",
    sourceRowId: "8f34ecb7-4f2b-4769-9778-c219b34bd99b",
    subject: "UNION DE OFICIALES DE LA GUARDIA CIVIL PROFESIONAL",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Relationship with the individual"],
    note: "AEPD fined the association; the presumption did not extend to a non-member never shown to hold the described professional role.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We mailed a non-member at their workplace, relying on legitimate interest for contact/professional data of persons serving within an organisation with which they have a clear professional interest.",
    },
  },
  {
    profileId: "a52357bf-2e7d-4c55-8aeb-d05600c529ef",
    sourceTable: "enforcement_actions",
    sourceRowId: "8f107c92-be4a-40a4-a781-d042131bfeb5",
    subject: "WWPD CINVENTO INTERNATIONAL PATENT TRADING, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Reasonable expectations of the data subject"],
    note: "AEPD: the data subject's fundamental right prevails because the data was not voluntarily made public by the subject for that purpose (citing WP29 Opinion 06/2014).",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Prospective customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We sent unsolicited postal marketing using contact details scraped from a public patent registry (BOPI) that the data subject never chose to be marketed from.",
      balancing_details: {
        reasonable_expectation: "No — we have no relationship with these individuals; they would not expect this",
      },
    },
  },
  {
    profileId: "a689265a-dd3d-4039-b811-aa573d7a48e7",
    sourceTable: "enforcement_actions",
    sourceRowId: "8419bcb5-847e-48f2-b9a2-51d3616f638e",
    subject: "CALDERERIA Y SOLDADURA DE ESTRUCTURAS METALICAS, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy"],
    note: "Onward disclosure to a third party is its own processing operation and needs its own basis; the discloser's convenience is not an interest that survives naming.",
    intake: {
      data_categories: ["Contact data"],
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We received a data subject's personal data disclosed to us by a third party without the data subject's prior consent.",
    },
  },
  {
    profileId: "ae3968bc-6b65-40ad-8aae-bc2fe7fc284e",
    sourceTable: "enforcement_actions",
    sourceRowId: "4738de2c-f257-4ddc-9830-a3a8cb85626a",
    subject: "ORANGE ESPAGNE S.A.U.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Necessity and less-intrusive means", "Safeguards and mitigations"],
    note: "AEPD fined for lacking proportionality (Art. 5(1)(c)); full unredacted ID photography on personal devices was not the least intrusive means despite the company's legitimate-interest defence.",
    intake: {
      data_categories: ["Other"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We require couriers to photograph the front and back of a customer's ID card on a personal mobile device as anti-fraud identity verification before delivering a package.",
    },
  },
  {
    profileId: "aff46bcf-98cf-4272-a572-38bedb61988a",
    sourceTable: "enforcement_actions",
    sourceRowId: "eebcdd06-c0ef-4a3b-a398-bbe62af431e3",
    subject: "PERSONAL MARK, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Relationship with the individual", "Safeguards and mitigations"],
    note: "AEPD sanctioned for an Art. 17 infringement and rejected the allegations in full — an implicit rejection of continued Art. 6(1)(f) reliance once a valid erasure request was made.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Former employee",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We continued sending marketing messages to a former client, relying on legitimate interest arising from a prior service contract, despite the client's request that we delete their data.",
    },
  },
  {
    profileId: "b26f523c-6d7c-423d-9f24-4e327cf55ee7",
    sourceTable: "enforcement_actions",
    sourceRowId: "9bfeb689-6b51-4d7c-b4d8-af902b0bfc2f",
    subject: "Corporación de Medios de Extremadura",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Potential harms and severity", "Special-category and ePrivacy interplay"],
    note: "DPA determined the victims' right to privacy outweighed the controller's freedom of information (Art. 5(1)(c)).",
    intake: {
      data_categories: ["Special category data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We published a news video showing an on-screen spreadsheet listing gender-violence victims registered in a protection system, with their individual risk classifications.",
      balancing_details: {
        special_category_data: true,
        potential_harm: "Severe — physical safety, identity theft, loss of livelihood",
      },
    },
  },
  {
    profileId: "b3b87982-637f-452a-8b20-f8052c7134c3",
    sourceTable: "enforcement_actions",
    sourceRowId: "0d01d954-f90b-4859-a022-68e497bdd37a",
    subject: "ARRENDAMIENTOS DEUDORES, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Necessity and less-intrusive means", "Interest legitimacy"],
    note: "AEPD: the enquiry must still be necessary and no less-intrusive route shown available.",
    intake: {
      data_categories: ["Financial data", "Contact data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We performed a credit/solvency check on an individual as part of assessing a counterparty relationship.",
    },
  },
  {
    profileId: "b84dab9a-ce94-4eb8-b62f-f4bb05fe947b",
    sourceTable: "enforcement_actions",
    sourceRowId: "fa6bcd44-5f67-4bb2-8897-335eb5ecc5aa",
    subject: "SANTANDER CONSUMER, S.A.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Safeguards and mitigations"],
    note: "An employee manually failed to switch off the marketing checkbox after the objection was upheld; illustrates that an upheld objection must actually stop LI-based processing.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We continued sending postal marketing communications, relying on the company's legitimate interest, after a customer exercised their right to object.",
      balancing_details: {
        safeguards: [],
      },
    },
  },
  {
    profileId: "c6578d7e-5b86-4080-9fbc-ded32c813938",
    sourceTable: "enforcement_actions",
    sourceRowId: "64ee4d90-9ead-4155-b379-868932d05c5f",
    subject: "HIGHCLIFFE ESTATES MARBELLA, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Potential harms and severity", "Balancing of interests, rights and freedoms"],
    note: "Publishing accusatory personal data to pressure a debtor inflicts reputational harm that no asserted debt-recovery interest outweighs.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We published a person's full name and photograph without consent, accusing them publicly of occupying our property without paying the corresponding rent, to pressure recovery of the debt.",
      balancing_details: {
        potential_harm: "Significant — discrimination, financial loss, reputational damage",
      },
    },
  },
  {
    profileId: "c6b65326-8b31-4b1b-b309-abbfe0ab23d6",
    sourceTable: "enforcement_actions",
    sourceRowId: "d6d05fbe-8f5b-49d7-bbb1-6f66f85d7e17",
    subject: "CYNGASA, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Relationship with the individual"],
    note: "An existing commercial relationship with the individual does not extend to passing that individual's data to a business partner.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We disclosed a customer's personal data to a business partner without the customer's prior consent.",
    },
  },
  {
    profileId: "d0b72370-52be-45f7-bf2e-4fed9de046b3",
    sourceTable: "enforcement_actions",
    sourceRowId: "c0e5e0bf-e940-484c-9f1c-504b32e015eb",
    subject: "Venu Sanz Chef, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Special-category and ePrivacy interplay", "Interest legitimacy"],
    note: "Health data pulled into a marketing purpose engages Article 9, which Article 6(1)(f) cannot reach past.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We used a customer's full name, profile photograph and cholesterol/hypothyroidism health information — collected for a weekly-menu service — to advertise our products, without the customer's consent.",
      balancing_details: {
        special_category_data: true,
      },
    },
  },
  {
    profileId: "d7c67430-e4c0-45c2-8c5d-74d3a13de137",
    sourceTable: "enforcement_actions",
    sourceRowId: "119c9c15-c0b0-4bd5-9527-1ada8e54ed3a",
    subject: "UNIDAD EDITORIAL INFORMACION GENERAL S.L.U.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Potential harms and severity", "Special-category and ePrivacy interplay"],
    note: "AEPD determined the victim's right to privacy outweighed freedom of information.",
    intake: {
      data_categories: ["Special category data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We published a rape victim's court-testimony audio recording to report on a high-profile case.",
      balancing_details: {
        special_category_data: true,
        potential_harm: "Severe — physical safety, identity theft, loss of livelihood",
      },
    },
  },
  {
    profileId: "dffc3963-d9c8-47ed-806f-145ce5f9b8d9",
    sourceTable: "enforcement_actions",
    sourceRowId: "dc7efc6d-418b-4edf-8aa5-661caa691ba9",
    subject: "REAL CLUB NÁUTICO DE RIBADEO",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Necessity and less-intrusive means"],
    note: "AEPD rejected the sufficiency of the club's own balancing given a less-intrusive means (redaction) was available.",
    intake: {
      data_categories: ["Other"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We published an unredacted court judgment naming the complainant on our website and Facebook page to publicise the court's findings against him, relying on our legitimate interest in that public communication.",
      balancing_details: {
        safeguards: [],
      },
    },
  },
  {
    profileId: "e9dc68cc-aa0f-4bd2-ba05-7a1bfa547e9e",
    sourceTable: "enforcement_actions",
    sourceRowId: "a51194ee-6bf4-49b6-94d1-1dd8c7647029",
    subject: "SILVANERGIA 2022, S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Safeguards and mitigations", "Relationship with the individual"],
    note: "Safeguards that exist only on paper — unverified supplier assurances — do not count as mitigations in the balancing test.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Prospective customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We engaged third-party marketing companies to promote electricity-supply switching to prospective customers, without adequately verifying how those companies obtained and processed the personal data used.",
      balancing_details: {
        safeguards: [],
      },
    },
  },
  {
    profileId: "eefb1149-cc10-464e-869f-fe5ea217b63f",
    sourceTable: "enforcement_actions",
    sourceRowId: "0fc0e7b2-9f84-420d-bf93-45634d77b7f5",
    subject: "SEAN SERIOS S.L.",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Reasonable expectations of the data subject", "Necessity and less-intrusive means"],
    note: "AEPD rejected that public availability of a source alone satisfies the test.",
    intake: {
      data_categories: ["Other"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We republished a public-sector exam-results listing (names and scores) on our commercial website, relying on legitimate interest in facilitating access to results that were already publicly accessible.",
      balancing_details: {
        reasonable_expectation: "No — we have no relationship with these individuals; they would not expect this",
      },
    },
  },
  {
    profileId: "fb61f98d-5bc7-423e-8bf2-d48e48915bf6",
    sourceTable: "enforcement_actions",
    sourceRowId: "2ec1e5a9-d5db-43ce-85c1-65e87e4792bf",
    subject: "GSMA Limited",
    country: "ES",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Third-party interests", "Necessity and less-intrusive means"],
    note: "An interest must be lawful and the controller's own to pursue — entitlement to the data is part of interest legitimacy, before balancing is reached.",
    intake: {
      data_categories: ["Health or medical data", "Special category data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We demanded health and vaccination information from event attendees as a condition of entry, without being entitled to require it.",
      balancing_details: {
        special_category_data: true,
      },
    },
  },
  {
    profileId: "1386f266-48e6-4c00-8c21-a7e8b87c4cad",
    sourceTable: "enforcement_actions",
    sourceRowId: "d2df70c3-d59d-4c13-9aa5-701f47774649",
    subject: "Accor",
    country: "FR",
    outcomePosture: "rejected",
    factorIds: ["Reasonable expectations of the data subject", "Safeguards and mitigations"],
    note: "CNIL: an unhonoured objection/unsubscribe request is evidence the processing sits outside what the individual expected and accepted.",
    intake: {
      data_categories: ["Contact data", "Purchase/transaction history"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We rely on legitimate interest to send direct marketing to customers, but did not properly action unsubscribe and data-subject access requests.",
      balancing_details: {
        reasonable_expectation: "No",
        safeguards: [],
      },
    },
  },
  {
    profileId: "1bf55c5c-aa76-43ab-84d3-2ece7923cf3c",
    sourceTable: "enforcement_actions",
    sourceRowId: "f7aae6e2-f869-4428-9b64-d0923109db55",
    subject: "Cegedim",
    country: "FR",
    outcomePosture: "rejected",
    factorIds: ["Necessity and less-intrusive means", "Special-category and ePrivacy interplay"],
    note: "CNIL: necessity/less-intrusive-means analysis must run on what the data really is — pseudonymised data is still personal data.",
    intake: {
      data_categories: ["Health or medical data", "Special category data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We process patients' data that we treat as anonymised but which is only pseudonymised and re-identifiable, without the required prior authorisation, to operate a health database.",
      balancing_details: {
        special_category_data: true,
      },
    },
  },
  {
    profileId: "2e2134da-f781-4be3-a12a-466e0283ca37",
    sourceTable: "enforcement_actions",
    sourceRowId: "dfcc63f9-cb9a-412c-9966-ea41da99a454",
    subject: "Nestor SAS",
    country: "FR",
    outcomePosture: "rejected",
    factorIds: ["Special-category and ePrivacy interplay", "Relationship with the individual"],
    note: "CNIL: electronic-marketing rules impose consent and displace legitimate interests; Art. 6(1)(f) is unavailable regardless of the balance.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Prospective customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We send unsolicited electronic marketing messages to prospective customers relying on legitimate interest.",
    },
  },
  {
    profileId: "30929772-0cf1-4054-a708-c0abc0313206",
    sourceTable: "enforcement_actions",
    sourceRowId: "96fa14f8-3811-4cd6-a520-50ccf054d387",
    subject: "CLEARVIEW AI",
    country: "FR",
    outcomePosture: "rejected",
    factorIds: ["Reasonable expectations of the data subject", "Balancing of interests, rights and freedoms"],
    note: "CNIL: scraping publicly accessible images defeats reasonable expectations, so no legitimate interest was available.",
    intake: {
      data_categories: ["Biometric data", "Special category data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We scrape publicly accessible images from the internet to build a facial-recognition database, relying on legitimate interest.",
      balancing_details: {
        special_category_data: true,
        reasonable_expectation: "No — we have no relationship with these individuals; they would not expect this",
      },
    },
  },
  {
    profileId: "57fca053-e9a3-4ce2-af89-e36df2764fb6",
    sourceTable: "enforcement_actions",
    sourceRowId: "6b1b12d2-3e6b-4cfd-92bc-e676c5701a0d",
    subject: "KASPR",
    country: "FR",
    outcomePosture: "rejected",
    factorIds: ["Reasonable expectations of the data subject", "Interest legitimacy"],
    note: "A data subject who sets a visibility restriction has affirmatively stated an expectation; processing that reaches past it is a clear reasonable-expectations failure.",
    intake: {
      data_categories: ["Contact data", "Employment data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We scrape professional contact data from LinkedIn profiles, including from users who had restricted their visibility settings, to build a B2B contact database, relying on legitimate interest.",
      balancing_details: {
        reasonable_expectation: "No — we have no relationship with these individuals; they would not expect this",
      },
    },
  },
  {
    profileId: "73d0a67f-278a-42ee-ad2e-4d09a88a2fc0",
    sourceTable: "enforcement_actions",
    sourceRowId: "75cce78c-78a8-47a3-97bc-517575cdaf88",
    subject: "Criteo",
    country: "FR",
    outcomePosture: "rejected",
    factorIds: ["Special-category and ePrivacy interplay", "Interest legitimacy", "Reasonable expectations of the data subject"],
    note: "CNIL: where consent is the required basis for the tracking layer, legitimate interests cannot substitute for it downstream.",
    intake: {
      data_categories: ["Browsing/behavioural data", "Device/technical data"],
      relationship_type: "Website visitor (no account)",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We place tracking cookies on website visitors' devices via partner sites for online advertising, relying on legitimate interest where partner consent collection was not verified.",
    },
  },
  {
    profileId: "91c22d63-2736-4190-a04f-314f27785f7e",
    sourceTable: "enforcement_actions",
    sourceRowId: "e98e0e5f-d0a6-467f-a37b-736dd8072b3c",
    subject: "Monsanto Company",
    country: "FR",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Reasonable expectations of the data subject"],
    note: "CNIL anchored the balancing exercise in reasonable expectations about the data collected and how it is used.",
    intake: {
      data_categories: ["Other", "Contact data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We process personal data of external stakeholders (e.g. journalists, officials) compiled into a database for monitoring purposes, relying on legitimate interest.",
    },
  },
  {
    profileId: "9a92c865-6001-4deb-8154-ea8c9d05203f",
    sourceTable: "enforcement_actions",
    sourceRowId: "c1a28f21-71cd-472e-b549-c0d4b986ec2a",
    subject: "Clearview AI",
    country: "FR",
    outcomePosture: "rejected",
    factorIds: ["Reasonable expectations of the data subject", "Interest legitimacy", "Balancing of interests, rights and freedoms"],
    note: "Data scraped at scale from public sources still defeats reasonable expectations; the presence of minors raises the bar further.",
    intake: {
      data_categories: ["Biometric data", "Special category data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We collected and processed a large database of biometric data scraped from public sources, including images of minors, relying on legitimate interest.",
      balancing_details: {
        special_category_data: true,
        children_data_subjects: "Yes",
        reasonable_expectation: "No — we have no relationship with these individuals; they would not expect this",
      },
    },
  },
  {
    profileId: "a21bd780-84e0-401e-80d4-ebff2380f6b8",
    sourceTable: "enforcement_actions",
    sourceRowId: "2c7fe8e4-3bdb-4a24-9057-54b595c4b66e",
    subject: "SPARTOO SAS",
    country: "FR",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Necessity and less-intrusive means"],
    note: "CNIL: a blanket legal-basis statement is not precise enough — each purpose must name its own basis, and legitimate interests must be identified as such where relied on.",
    intake: {
      data_categories: ["Communications data", "Financial data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We record customer service calls and process customer payment-related data under a single blanket legal-basis statement covering multiple purposes.",
    },
  },
  {
    profileId: "c6e910a2-88f0-4cf1-8d67-c627bd777d1a",
    sourceTable: "enforcement_actions",
    sourceRowId: "e7ad2d7a-bce7-493d-8cd9-b8966fb9114d",
    subject: "Amazon France Logistique",
    country: "FR",
    outcomePosture: "rejected",
    factorIds: ["Relationship with the individual", "Potential harms and severity", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"],
    note: "CNIL: violations of data minimisation, the legitimate-interests basis, and transparency; the employment relationship's power imbalance made this scale of monitoring indefensible.",
    intake: {
      data_categories: ["Employment data", "Location data", "Device/technical data"],
      relationship_type: "Employee",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We extensively monitor employee activity and performance using handheld scanners and video surveillance in our warehouses, relying on legitimate interest.",
      balancing_details: {
        potential_harm: "Significant — discrimination, financial loss, reputational damage",
      },
    },
  },
  {
    profileId: "0af0876d-5855-4d97-94ae-e1a5fb2f4bd4",
    sourceTable: "enforcement_actions",
    sourceRowId: "69eee35f-a280-47be-8159-bf778767ff31",
    subject: "LinkedIn",
    country: "IE",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Interest legitimacy", "Reasonable expectations of the data subject"],
    note: "DPC fined EUR 310,000,000 — the largest verified rejection of legitimate-interests reliance in the corpus; balancing failed and so the basis failed.",
    intake: {
      data_categories: ["Browsing/behavioural data", "Device/technical data", "Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We process members' behavioural data for behavioural analysis and targeted advertising, relying on legitimate interest, with limited transparency about the specific interest pursued.",
      balancing_details: {
        reasonable_expectation: "No",
      },
    },
  },
  {
    profileId: "248a03b6-4823-4c30-84fa-9e8c5ace3a94",
    sourceTable: "enforcement_actions",
    sourceRowId: "f53002af-7fcd-4a9d-b16f-5f7ff12e379f",
    subject: "Groupon Ireland",
    country: "IE",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"],
    note: "DPC: Groupon infringed Art. 6(1) by continuing to process personal data following the erasure request.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We continued processing a customer's personal data after receiving their erasure request, relying on a legitimate interest in the fight against fraud to retain the data for a limited purpose.",
    },
  },
  {
    profileId: "5da64061-b9fe-4062-b29a-5be73a70c426",
    sourceTable: "enforcement_actions",
    sourceRowId: "5c406c0e-d256-4aab-98e1-559ce66abfa7",
    subject: "WhatsApp Ireland Limited",
    country: "IE",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Balancing of interests, rights and freedoms"],
    note: "DPC: Art. 13(1)(d) requires the specific legitimate interests pursued to be stated; a generic interest statement is a transparency failure and a weak first limb.",
    intake: {
      data_categories: ["Contact data", "Communications data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We rely on legitimate interest for improving, promoting and providing our services, stated in general terms in our transparency notice.",
    },
  },
  {
    profileId: "61041200-a44d-4f9b-9259-a5bc1072642b",
    sourceTable: "enforcement_actions",
    sourceRowId: "dcd75c1d-a21f-4939-b2a0-d8cb1b96545a",
    subject: "Meta Platforms Ireland Limited",
    country: "IE",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Balancing of interests, rights and freedoms"],
    note: "DPC: the asserted basis must actually fit the processing; a behavioural-advertising basis that collapses on inspection fails at interest legitimacy before balancing.",
    intake: {
      data_categories: ["Browsing/behavioural data", "Device/technical data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We rely on legitimate interest for behavioural advertising, having previously relied on a 'contract' basis for the same processing before switching.",
    },
  },
  {
    profileId: "6cffad94-5bb4-4e79-96df-2b5cad1f10b4",
    sourceTable: "enforcement_actions",
    sourceRowId: "91474d2b-b024-44f5-ae28-3adf6ab9090a",
    subject: "Airbnb Ireland UC",
    country: "IE",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Necessity and less-intrusive means"],
    note: "DPC: could not be considered that a legitimate interest exists for the processing — an outright rejection.",
    intake: {
      data_categories: ["Other", "Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We required a user to provide photo ID as a condition of processing their request, relying on legitimate interest, without demonstrating the request was proportionate or necessary.",
    },
  },
  {
    profileId: "7794d920-1589-44f3-b63b-ded06d85dcbb",
    sourceTable: "enforcement_actions",
    sourceRowId: "0791afb8-6580-4613-a89a-9d4964451e07",
    subject: "AirBnb Ireland UC",
    country: "IE",
    outcomePosture: "rejected",
    factorIds: ["Necessity and less-intrusive means", "Safeguards and mitigations"],
    note: "DPC: did not validly rely on Art. 6(1)(f) as the legal basis for processing the photographic ID.",
    intake: {
      data_categories: ["Other", "Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We required a user to submit photographic ID before actioning their erasure request, relying on legitimate interest in confirming request authenticity, though a less intrusive verification route was available.",
    },
  },
  {
    profileId: "b8f065a4-7743-4539-80c7-44793928620d",
    sourceTable: "enforcement_actions",
    sourceRowId: "7a874890-4f84-423e-82b2-1eed7d42f52a",
    subject: "Airbnb Ireland UC",
    country: "IE",
    outcomePosture: "rejected",
    factorIds: ["Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"],
    note: "DPC: did not validly rely on Art. 6 as the legal basis for processing the ID; a less intrusive verification method was available.",
    intake: {
      data_categories: ["Other"],
      relationship_type: "Prospective customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We required a person who had abandoned registration to submit photo ID before we would action their erasure request, relying on legitimate interest in confirming request authenticity.",
    },
  },
  {
    profileId: "0e872804-1183-419f-a4f6-ea3df594e0c2",
    sourceTable: "enforcement_actions",
    sourceRowId: "fe2aa6fe-9e8c-41a7-bc2f-204816a3e557",
    subject: "Magna PT S.p.A.",
    country: "IT",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy", "Special-category and ePrivacy interplay", "Relationship with the individual"],
    note: "Garante rejected the Art. 6(1)(f) fallback for special-category data, consistent with Art. 9's closed list of conditions.",
    intake: {
      data_categories: ["Health or medical data", "Employment data"],
      relationship_type: "Employee",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We conduct 'return to work' interviews after employee sick leave that process employee health data, relying (in the alternative) on our legitimate interest in organisation and employee health protection.",
      balancing_details: {
        special_category_data: true,
      },
    },
  },
  {
    profileId: "11f05a10-ef28-49d5-9dc6-f2ec358700dd",
    sourceTable: "enforcement_actions",
    sourceRowId: "a9317faf-fa4b-4c87-bb7f-c579c902c584",
    subject: "Sirio S.p.A.",
    country: "IT",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Relationship with the individual", "Reasonable expectations of the data subject"],
    note: "Garante: neither contract performance nor the controller's legitimate interest, both invoked, can rise to valid legal bases on these facts.",
    intake: {
      data_categories: ["Employment data", "Financial data"],
      relationship_type: "Employee",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We disclosed an employee's personal data to a bank to arrange a payroll/deposit card, without prior notice or the employee's consent, relying on contract necessity and legitimate interest as alternative bases.",
      balancing_details: {
        reasonable_expectation: "No",
      },
    },
  },
  {
    profileId: "1989b64e-3c4e-4b22-9248-8aa96c485c5c",
    sourceTable: "enforcement_actions",
    sourceRowId: "1de0ca9a-9099-4008-939b-a594fb749183",
    subject: "Eni S.p.A.",
    country: "IT",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Necessity and less-intrusive means"],
    note: "Garante: published in the absence of a valid legal basis — redaction of identifying data was available and not used.",
    intake: {
      data_categories: ["Contact data", "Other"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We published the full unredacted text of a lawsuit brought against us, including the claimants' tax codes, addresses and dates of birth, to publicly respond to a campaign against us.",
      balancing_details: {
        safeguards: [],
      },
    },
  },
  {
    profileId: "36cda5c3-aabd-4ae8-b4e6-cb46815244f9",
    sourceTable: "enforcement_actions",
    sourceRowId: "c22a3270-172f-4694-8bc5-6a1b22414fa0",
    subject: "Concentrix Cvg Italy s.r.l.",
    country: "IT",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Special-category and ePrivacy interplay", "Safeguards and mitigations"],
    note: "Garante: this basis may be used only after a comparative balancing test; no such assessment was shown to have been carried out.",
    intake: {
      data_categories: ["Health or medical data", "Employment data"],
      relationship_type: "Employee",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "Our 'clean desk' policy requires employees to keep medication visibly on their desks rather than stored out of sight, incidentally revealing health conditions to coworkers, relying on our legitimate interest in fraud prevention.",
      balancing_details: {
        special_category_data: true,
        safeguards: [],
      },
    },
  },
  {
    profileId: "411d0fd5-6097-4ab1-b6ff-ffba50e3a720",
    sourceTable: "enforcement_actions",
    sourceRowId: "435b52b0-6817-4c8f-839e-ef220f1d97e0",
    subject: "Pioneer Hi-Bred Italia Sementi s.r.l.",
    country: "IT",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms", "Necessity and less-intrusive means"],
    note: "Garante: absence of a comparative assessment of the legitimate interest against the data subject's fundamental rights and freedoms — the balancing test was never performed.",
    intake: {
      data_categories: ["Location data", "Employment data"],
      relationship_type: "Employee",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We installed satellite telematics on company vehicles assigned to employees to detect driving behaviour and assign a scoring evaluation, relying on legitimate interest.",
    },
  },
  {
    profileId: "114ab06a-e49f-436d-804a-e26dafe54fed",
    sourceTable: "enforcement_actions",
    sourceRowId: "6ca23a52-cceb-4ecb-bfd2-bdb3aefee8fe",
    subject: "ClickQuickNow Sp. z o",
    country: "PL",
    outcomePosture: "rejected",
    factorIds: ["Relationship with the individual", "Interest legitimacy"],
    note: "UODO: legitimate interest cannot be used as a fallback to keep processing that the individual has just withdrawn consent for.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We continued marketing processing under legitimate interest after a customer withdrew the consent on which the processing had originally been based.",
    },
  },
  {
    profileId: "9a44bff0-2514-46b4-b507-058f3d3f98ab",
    sourceTable: "enforcement_actions",
    sourceRowId: "94312858-b48c-4a93-92ea-2b8e6edaf147",
    subject: "SC Grupex 2000 SRL",
    country: "RO",
    outcomePosture: "rejected",
    factorIds: ["Balancing of interests, rights and freedoms"],
    note: "Where data subjects are in a position of dependence and cannot practically object, the balance tilts against the controller regardless of the purpose asserted.",
    intake: {
      data_categories: ["Health or medical data", "Special category data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We filmed institutionalised patients and made the footage available on our website.",
      balancing_details: {
        special_category_data: true,
      },
    },
  },
  {
    profileId: "cf4d53a6-7843-484f-8ef6-59e1bfdc64df",
    sourceTable: "edpb_guidelines",
    sourceRowId: "edpb-guidelines-1-2024-example-7",
    subject: "EDPB Guidelines 1/2024, Worked Example 7 (intra-group)",
    country: "EU",
    outcomePosture: "conditional",
    factorIds: ["Relationship with the individual", "Reasonable expectations of the data subject"],
    note: "EDPB: may be based on Art. 6(1)(f) depending on the concrete circumstances, conditioned on giving data subjects adequate information about the intra-group transmission and its legal basis.",
    intake: {
      data_categories: ["Other"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "A group headquarters compiles client-retention statistics using client data transmitted to it by subsidiaries across the group.",
    },
  },
  {
    profileId: "2c162f6e-9d07-4b8b-9216-231ee8edd150",
    sourceTable: "edpb_guidelines",
    sourceRowId: "edpb-guidelines-1-2024-examples-2-3",
    subject: "EDPB Guidelines 1/2024, worked Example 3 (speculative future database)",
    country: "EU",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy"],
    note: "EDPB: the interest is not real and present but speculative, so it may not be considered 'legitimate' under the first limb.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Member of the public",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We are compiling a contact database of potential future subscribers in case we decide to launch a new magazine, which has not yet been decided.",
    },
  },
  {
    profileId: "7c9f1b95-9a36-4855-82e3-c3a30edb9cae",
    sourceTable: "edpb_guidelines",
    sourceRowId: "edpb-guidelines-1-2024-example-1a",
    subject: "EDPB Guidelines 1/2024, Example 1 (e-cigarette marketing emails)",
    country: "EU",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy"],
    note: "EDPB: even though direct marketing is often a legitimate interest, in these specific circumstances the interest may not be qualified as legitimate because tobacco-related commercial communications are restricted by EU law.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "An EU company selling electronic cigarettes wants to send promotional marketing emails to its existing customers about its products.",
    },
  },
  {
    profileId: "d13215fd-ea18-47b3-b9b8-3c6f53e6a2b1",
    sourceTable: "edpb_guidelines",
    sourceRowId: "edpb-guidelines-1-2024-examples-5-6",
    subject: "EDPB Guidelines 1/2024, Examples 5-6 (Meta v Bundeskartellamt pattern)",
    country: "EU",
    outcomePosture: "rejected",
    factorIds: ["Reasonable expectations of the data subject"],
    note: "EDPB (citing CJEU Meta v Bundeskartellamt): despite the service being free, the user cannot reasonably expect this processing without consent, even for other purposes such as product improvement.",
    intake: {
      data_categories: ["Browsing/behavioural data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "We operate a free online social network and want to process users' personal data, without their consent, for personalised advertising and product-improvement purposes.",
      balancing_details: {
        reasonable_expectation: "No",
      },
    },
  },
  {
    profileId: "dbbeb078-0a80-43a9-9d4b-58ab1c5f9120",
    sourceTable: "edpb_guidelines",
    sourceRowId: "edpb-guidelines-1-2024-example-1b",
    subject: "EDPB Guidelines 1/2024, Example 1 continued (e-cigarette marketing, sector prohibition)",
    country: "EU",
    outcomePosture: "rejected",
    factorIds: ["Interest legitimacy"],
    note: "EDPB: the indirect effect of promoting electronic cigarettes and refill containers is generally prohibited under the EU Tobacco Products Directive, a sector-specific legal prohibition that defeats the first-step test outright.",
    intake: {
      data_categories: ["Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      processing_description: "An EU company selling electronic cigarettes and refill containers wants to send promotional marketing emails to its existing customers.",
    },
  },
];
interface DoctrineRow {
  readonly id: string;
  readonly sourceTable: "edpb_guidelines" | "regulatory_guidance";
  readonly country: string;
  readonly outcomePosture: string;
  readonly factorIds: readonly string[];
  readonly noteExcerpt: string;
}

// ── The 91 doctrine-only rows (86 EDPB Guidelines 1/2024 abstract paragraphs
// + 5 ICO "guide to lawful basis" overview paragraphs). No concrete fact
// pattern to encode — these state general legal principles, not a decided
// case with facts and an outcome. Recorded for the diagnostic's record; NEVER
// run through the engine (there is nothing to build a fixture from). ───────
const DOCTRINE_ONLY: DoctrineRow[] =
[
  { id: "080eeb62-3e87-4a96-ac16-a444cba3eb81", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Special-category and ePrivacy interplay"], noteExcerpt: "EDPB Guidelines 1/2024 §116-117 (soft opt-in): a controller that obtained contact details from its own customers 'may use them for direct ma" },
  { id: "096ec8d2-16e6-4ea8-af54-a8c5756bbd8b", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means"], noteExcerpt: "EDPB Guidelines 1/2024, consolidated restatement of steps 1-2: 'not all interests... may be deemed legitimate; only those interests that are" },
  { id: "0bb4f6d5-64f7-4fc7-b050-fe5861394310", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §33-35: 'the purpose of the balancing exercise is not to avoid any impact... altogether. Rather, its purpose is to av" },
  { id: "13ef2339-ee7d-4a46-8fca-553a01b42436", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §59-60: 'the duty is upon the controller to demonstrate that the balancing test has been conducted appropriately... I" },
  { id: "1452aa67-a402-45d6-8ea5-514ce70441a3", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Children's data"], noteExcerpt: "EDPB Guidelines 1/2024 §97: 'a child is every human below the age of majority. However, that does not mean that all children should be treat" },
  { id: "1894cf0a-b56d-40f7-b8ef-50ab85107203", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Potential harms and severity"], noteExcerpt: "EDPB Guidelines 1/2024 §39-40, impact-assessment framing: individuals may be affected 'positively or negatively, actually or potentially,' a" },
  { id: "19cbeab2-f993-4613-acda-7b184317785d", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §80-81 on Art. 22 automated decision-making/profiling: even where one of the Art. 22(2) exceptions applies, 'the proc" },
  { id: "1c7698bc-4b85-4ad7-a501-234ef0d08e26", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §55-57: once all elements are assessed, 'the controller should be able to strike a balance'; if the data subject's in" },
  { id: "29847a39-90d1-4e6c-8479-97209160d242", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §103-104 on fraud prevention: recognizes a legitimate interest in fraud prevention but states it 'does not apply with" },
  { id: "2b436a74-00fc-4860-976f-1caf6042af05", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Third-party interests"], noteExcerpt: "EDPB Guidelines 1/2024 §on third-party interests: 'the interest(s) of one or more specific third parties may be legitimately pursued within " },
  { id: "2e7c3e66-c6a1-4824-b200-a568a3132777", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §on Art. 21(1) objections: 'the assessment to be made by the controller... is different from the balancing exercise t" },
  { id: "325b058c-393c-45e9-89e6-dbad3a73eeb4", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms", "Reasonable expectations of the data subject", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §32-33: lists what the controller must identify/describe for the balancing test -- data subjects' interests/rights/fr" },
  { id: "32eea709-045d-4d93-9443-072bec99341f", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024, quoting CJEU: absent valid consent, processing 'is nevertheless justified where it meets one of the requirements of " },
  { id: "3577769c-9447-48eb-b61c-693c8e0adc14", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Reasonable expectations of the data subject"], noteExcerpt: "EDPB Guidelines 1/2024 §52-53: 'the fact that certain types of personal data are commonly processed in a given sector does not necessarily m" },
  { id: "384e1e8c-5255-4d2d-9004-8945b1969dd1", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 introductory framing: the legal basis 'needs to be considered in the context of the GDPR as a whole' and alongside Ar" },
  { id: "3a124e43-b019-47b8-8375-33c818e2f2e5", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means", "Third-party interests", "Reasonable expectations of the data subject"], noteExcerpt: "EDPB Guidelines 1/2024 §on the second/third steps: 'it is generally easier for a controller to demonstrate the necessity of the processing t" },
  { id: "3da0408b-ac0f-4535-a67b-b604d8ecb6e0", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §134-136 on third-country authority disclosure requests: 'a controller could nevertheless have a legitimate interest " },
  { id: "40bc9af9-3beb-4d0d-bf29-582d3f27dc7d", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means", "Potential harms and severity"], noteExcerpt: "EDPB Guidelines 1/2024 §on network/information security: WP29 flagged that security tools 'may lead to the large scale deployment of deep pa" },
  { id: "4228c707-86ce-4cca-9e4e-c6ae58f05206", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms", "Necessity and less-intrusive means"], noteExcerpt: "EDPB Guidelines 1/2024 §on marketing intrusiveness: 'the balancing test would hardly yield positive results for intrusive profiling and trac" },
  { id: "440bf429-7e8d-433f-80a8-e1d27407b707", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Potential harms and severity"], noteExcerpt: "EDPB Guidelines 1/2024 §on impact assessment: 'the fact that personal data have been manifestly made public does not automatically mean that" },
  { id: "44e2e531-64e5-4af1-bac3-f25f70ebdc78", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §2-3, quoting the operative text of Art. 6(1)(f) GDPR itself verbatim, and stating: 'in line with the accountability " },
  { id: "471552b5-d2fc-4912-89c0-3e46519fc9b5", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §2: 'the interest pursued by the controller should be related to the actual activities of the controller' -- citing C" },
  { id: "5153176a-0671-43b0-8702-a6bb780abcb1", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Third-party interests"], noteExcerpt: "EDPB Guidelines 1/2024 §on purpose compatibility: 'such compatibility assessment should, in general, be done in situations where personal da" },
  { id: "5775ff78-db2f-44de-abd2-c09646c409d6", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Reasonable expectations of the data subject", "Relationship with the individual"], noteExcerpt: "EDPB Guidelines 1/2024, non-exhaustive contextual checklist for reasonable expectations: existence/proximity of the relationship (e.g., sing" },
  { id: "577b591e-5aa7-42bf-8126-fdd4c182531e", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024, core statement of the third condition: 'the processing may take place only if the outcome of this balancing exercise" },
  { id: "5bb1c8ce-8b21-4f96-9bc8-64d6865a3e70", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Children's data", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §93-95: 'special care must be taken in relation to the status of children as data subjects, using their best interest" },
  { id: "5c27db1c-fe9f-4815-bfa9-f37219817b84", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Potential harms and severity", "Necessity and less-intrusive means"], noteExcerpt: "EDPB Guidelines 1/2024 §41-42: 'the more sensitive or private the nature of the data... the more weight should be attributed to it in the ba" },
  { id: "5cef7cd5-90b1-42d4-b204-5d434f3ecc9f", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Reasonable expectations of the data subject", "Children's data"], noteExcerpt: "EDPB Guidelines 1/2024 §on the 'average' data subject in the balancing test: factors include 'the age of the data subject (minors' reasonabl" },
  { id: "64ed416a-b2da-4b7b-a809-45583c527e8b", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Safeguards and mitigations", "Reasonable expectations of the data subject"], noteExcerpt: "EDPB Guidelines 1/2024 §62-66: 'going beyond what is strictly required under the GDPR may be seen as an additional safeguard that could be c" },
  { id: "65f936df-30b1-4e71-8ad2-da27a6627ec4", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 introductory history: notes Art. 6(1)(f) GDPR continues the analogous basis in Art. 7(f) of Directive 95/46/EC and th" },
  { id: "662532d1-a3ba-4256-94d9-4bc64ec7b02e", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms", "Safeguards and mitigations", "Potential harms and severity"], noteExcerpt: "EDPB Guidelines 1/2024 §81-82 on profiling: even short of Art. 22 automated-decision-making, the balancing exercise before invoking 6(1)(f) " },
  { id: "6a5aebe3-1a94-4916-9c09-0aaca15217f1", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms", "Public-authority exclusion"], noteExcerpt: "EDPB Guidelines 1/2024 §6-9, the guidelines' compact restatement of the three cumulative conditions, PLUS: 'the second indent of Article 6(1" },
  { id: "6e9c9856-c509-49b1-82dc-dba85dde6e9c", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §8-9, a core interpretive statement: 6(1)(f)'s open-ended nature 'does not necessarily mean that this legal basis sho" },
  { id: "6f08f70b-48fe-48d3-b9f7-f4bac41bc30e", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §on the notion of direct marketing: 'CJEU case law suggests that personalised advertising could be considered a form " },
  { id: "7b9fb2da-acb4-4288-bbfd-92c5f74a9ecc", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Public-authority exclusion"], noteExcerpt: "EDPB Guidelines 1/2024 §25-26: distinguishes third-party interests under 6(1)(f) from 'interests of the wider community (general public inte" },
  { id: "7e577e10-1c34-4d7d-b378-94c24911990c", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means"], noteExcerpt: "EDPB Guidelines 1/2024 §106-108 on fraud prevention: 'a generic reference to the purpose of 'combating fraud' to define the legitimate inter" },
  { id: "8099f886-06dd-42a1-9eba-ed7228a73369", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms", "Potential harms and severity"], noteExcerpt: "EDPB Guidelines 1/2024 §36-38: the balancing test protects more than data protection/privacy -- 'fundamental rights and freedoms... such as " },
  { id: "848f905d-3263-4644-a57a-029b21f87729", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Reasonable expectations of the data subject", "Children's data"], noteExcerpt: "EDPB Guidelines 1/2024 §66-67: information 'must be easily accessible and easy to understand, in particular when information is provided to " },
  { id: "8507e421-3427-4c0e-987a-727bb99398ef", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §7.1 cybersecurity example: mandatory breach notification to the supervisory authority rests on Art. 6(1)(c); but vol" },
  { id: "8ec74df8-18cc-4792-8c96-ea5ccf01efaf", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Relationship with the individual"], noteExcerpt: "EDPB Guidelines 1/2024 §17-18, the core 'legitimacy' test: an interest is legitimate only if (i) 'lawful, i.e., not contrary to EU or Member" },
  { id: "8ffd6731-0e09-4401-a960-634441426152", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §105-106 on fraud-related reporting: the balancing favors the controller 'only if the controller processes data that " },
  { id: "9890a81f-b401-414d-a77a-71ae3575ed44", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §14 defines the first-step concept: 'the concept of 'interest' is closely related to, but distinct from, the concept " },
  { id: "9a8a33c9-f588-450e-be60-8b4a57f714a5", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Potential harms and severity", "Relationship with the individual", "Children's data"], noteExcerpt: "EDPB Guidelines 1/2024 §43-44: factors bearing on impact severity in the balancing test -- scale of processing, the controller's status vis-" },
  { id: "9f4cfba5-a4c2-4f48-855b-9dbd264c142c", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Reasonable expectations of the data subject"], noteExcerpt: "EDPB Guidelines 1/2024 §121: for direct marketing, 'relevant factors for the controller to consider with respect to direct marketing include" },
  { id: "a3581c2d-d8cb-4113-81ad-ee2918fe8435", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §89: where processing has been restricted under Art. 18(1), further processing is exceptionally allowed for legal cla" },
  { id: "abc43673-ddfc-4a6c-a123-619954e7bef8", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Children's data", "Potential harms and severity"], noteExcerpt: "EDPB Guidelines 1/2024 §44-45 checklist of 'further consequences' bearing on impact severity: 'exclusion of or discrimination against indivi" },
  { id: "b4757711-f6f1-4609-9617-89e5ca94ee48", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means"], noteExcerpt: "EDPB Guidelines 1/2024 §100-102: Recital 47's 'strictly necessary' language 'does not mean... that it is automatically possible to rely on A" },
  { id: "b4c6a85e-95cc-4430-8643-34670f0ef517", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §61-62: 'complying with the GDPR provisions on data subject rights is a legal obligation (and therefore not something" },
  { id: "b8a349f0-5771-4274-8589-157236678974", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §16-17: illustrative (non-exhaustive) list of interests the EDPB treats as capable of being legitimate -- fraud preve" },
  { id: "ba52e751-13da-498b-90a0-739e1f72805c", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §126-127 on network/information security: such processing 'may, in principle, be based on Article 6(1)(f) GDPR, provi" },
  { id: "ba96e08d-bd0d-427f-a0b5-13680cd8314a", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §71-73 on the right to object: after an objection, 'the controller shall no longer process the personal data unless t" },
  { id: "bdf74871-ac8d-45e9-9838-df843737173c", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means"], noteExcerpt: "EDPB Guidelines 1/2024 §29-30: necessity requires 'ascertaining whether in practice the legitimate data processing interests pursued cannot " },
  { id: "be984c63-59a6-421d-b5a6-9ac07443dd27", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means"], noteExcerpt: "EDPB Guidelines 1/2024 §28-29: 'the concept of necessity has an independent meaning in EU law, which must be interpreted in a way that fully" },
  { id: "c08b1888-8765-494c-ba86-de3fe1cbd4aa", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Relationship with the individual", "Necessity and less-intrusive means"], noteExcerpt: "EDPB Guidelines 1/2024 §123-124 on intra-group transmissions (Recital 48): such transfers, including of employee/client data, 'may find its " },
  { id: "c0d3156c-5e76-4d72-9f0f-75c7b3fce922", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means"], noteExcerpt: "EDPB Guidelines 1/2024 §9-12, foundational interpretive rule: 'Article 6(1)(f), like each of the legal bases set out in Article 6(1) GDPR, m" },
  { id: "c4464927-3d18-4c32-8c9f-2ba46c95b89e", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Reasonable expectations of the data subject", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §67-68: the controller 'should make it clear that they can obtain information on the balancing test upon request,' id" },
  { id: "c527c056-f530-4773-b23d-85dafdcb08df", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means", "Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §27-28: 'Article 6(1)(f) GDPR may be invoked as a valid legal basis only if the necessity and balancing tests... have" },
  { id: "c8fb432d-2318-41a3-b7a3-bf46cddd2d43", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Third-party interests"], noteExcerpt: "EDPB Guidelines 1/2024, continuation of the taxi/scooter accident example: 'the owner of the scooter is a third party and has a legitimate i" },
  { id: "ca5cdd69-d06b-42c8-ab95-b0fb460be11e", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §109: 'According to Recital 47 GDPR, the processing of personal data for direct marketing purposes may be regarded as" },
  { id: "cbaaa6a9-ee46-43d8-ba3b-572b2b8b1a65", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Children's data", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024: 'when there is a conflict between a controller's legitimate interests... and the interests or fundamental rights and" },
  { id: "d0ceaf49-9ad9-468d-a05f-7b6fcd25c3e5", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §128-129, quoting Recital 50: reporting 'possible criminal acts or threats to public security... in individual cases " },
  { id: "d191d433-558d-43d8-b4d4-8825181c57b7", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Children's data", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §95-96: 'unless controllers can demonstrate that the activities in question which rely on the processing of children'" },
  { id: "d1b3bede-1904-45f1-a5c1-f737527e6217", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §118-119 on direct marketing necessity: controllers must 'ascertain whether the marketing interest pursued cannot rea" },
  { id: "d47427b9-3680-431b-ac86-27fda070b91b", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §110-112: 'the fact that Recital 47 GDPR states that the processing of personal data for direct marketing purposes ma" },
  { id: "d5e476d3-ef32-407a-9625-b5903b79fc3b", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Children's data", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §91-93: 'Article 6(1)(f) GDPR, unlike Article 7(f) Directive 95/46/EC, expressly refers to the protection of children" },
  { id: "dcb8b7b2-57ba-437e-84d4-bc4cff76d065", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Reasonable expectations of the data subject"], noteExcerpt: "EDPB Guidelines 1/2024 §50-51, quoting Recital 47 verbatim: legitimate interest is a valid basis 'provided that the interests or the fundame" },
  { id: "dd5092ca-0b42-42d1-b6bc-8ff5adaeb3b0", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 Executive Summary: 'Article 6(1)(f) GDPR should neither be treated as a 'last resort'... nor should it be automatical" },
  { id: "e2d5ce8b-c38a-4922-a359-dc3580acaa5f", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Special-category and ePrivacy interplay", "Potential harms and severity"], noteExcerpt: "EDPB Guidelines 1/2024 §43 (nature-of-data factor): a data set containing even one special-category item 'is deemed sensitive data in its en" },
  { id: "e2d80520-b8a0-4616-8e42-4e9f8dfbc266", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Special-category and ePrivacy interplay"], noteExcerpt: "EDPB Guidelines 1/2024 §on the GDPR/ePrivacy interplay: where the ePrivacy Directive's material scope applies, 'the ePrivacy Directive is to" },
  { id: "e5d2c0b6-02b1-4b9f-8e39-93997d03d3cb", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Safeguards and mitigations", "Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §57-59, concrete mitigating-measure examples that go beyond the GDPR baseline: 'allowing the data subject to exercise" },
  { id: "e624e01a-a8f1-454d-9461-ca6139443d18", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Third-party interests"], noteExcerpt: "EDPB Guidelines 1/2024 §21-22 on third-party interests: cites CJEU HTB Neunte Immobilien Portfolio recognizing a limited partner's interest " },
  { id: "ee7d0913-a2ac-46b8-9a11-8783b80a0f40", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means"], noteExcerpt: "EDPB Guidelines 1/2024 §12-13: 'the existence and identification of a legitimate interest pursued by the controller or a third party is not " },
  { id: "f7e84abf-393c-4cb6-8a10-0bcba80acd26", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Balancing of interests, rights and freedoms", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §73-74 on the right to object (Art. 21(1)): overriding an objection requires 'compelling' legitimate grounds -- 'esse" },
  { id: "fa3f48c6-ab84-404c-8233-2ebf1a90d578", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §130-131 interpreting Recital 50: where data were 'originally lawfully collected for different purposes' and the cont" },
  { id: "fa64b922-a428-4f3b-991f-6cb870a281e3", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Potential harms and severity", "Relationship with the individual"], noteExcerpt: "EDPB Guidelines 1/2024 §46-48: notes 'the chilling effect on protected behaviour, such as freedom of research or freedom of expression, that" },
  { id: "fcba06af-ecd6-48ca-b145-f94f3aed4710", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §131-132: sharing data with law enforcement 'is not an objective... capable of constituting a legitimate interest pur" },
  { id: "fdf05c27-0524-477e-bca3-2d0d5f0a9b51", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "conditional", factorIds: ["Necessity and less-intrusive means", "Safeguards and mitigations"], noteExcerpt: "EDPB Guidelines 1/2024 §48-49: 'the impact weighed in the balancing test should therefore already be the minimum impact under the GDPR' (dat" },
  { id: "003c87bb-a789-416e-8d42-925f76961e2e", sourceTable: "regulatory_guidance", country: "GB", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms", "Reasonable expectations of the data subject", "Public-authority exclusion", "Children's data"], noteExcerpt: "ICO's condensed 'guide to lawful basis' overview of legitimate interests (updated 23 March 2026 for the Data (Use and Access) Act). Restates" },
  { id: "157e29e1-bae4-4e43-9f25-99fd74b49b7c", sourceTable: "regulatory_guidance", country: "GB", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms", "Reasonable expectations of the data subject", "Relationship with the individual", "Potential harms and severity", "Children's data"], noteExcerpt: "ICO's core explainer of the Art. 6(1)(f) three-part test. States plainly: 'You must be able to satisfy all three parts of the test before yo" },
  { id: "b6fff6dd-c596-44e5-b85c-a749cafc267c", sourceTable: "regulatory_guidance", country: "GB", outcomePosture: "conditional", factorIds: ["Reasonable expectations of the data subject", "Safeguards and mitigations"], noteExcerpt: "ICO guidance on ancillary obligations once legitimate interests is chosen: transparency ('You must tell people... that you're relying on leg" },
  { id: "c8004441-4d38-4ede-ae32-586e1e1de172", sourceTable: "regulatory_guidance", country: "GB", outcomePosture: "conditional", factorIds: ["Interest legitimacy", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms", "Safeguards and mitigations"], noteExcerpt: "ICO's operational guidance on conducting a Legitimate Interests Assessment (LIA): 'you must do the three-part test... You should record the " },
  { id: "e1c7407c-b3b3-4ba9-9010-5004d8582946", sourceTable: "regulatory_guidance", country: "GB", outcomePosture: "conditional", factorIds: ["Public-authority exclusion", "Third-party interests", "Children's data", "Special-category and ePrivacy interplay"], noteExcerpt: "ICO guidance on when legitimate interests may/may not be used. Directly states the public-authority exclusion: 'Can public authorities use l" },
  { id: "15f368a0-2c82-4f5b-8455-6309e8394b14", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "rejected", factorIds: ["Interest legitimacy"], noteExcerpt: "EDPB Guidelines 1/2024 §133-134 on third-country authority requests: 'in cases where the disclosure of personal data is expressly required b" },
  { id: "1fc7dafe-409a-40e5-bcf2-b1b74d82ef34", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "rejected", factorIds: ["Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §on the right to object to direct marketing (Art. 21(2)): this right 'is unconditional and irrespective of the legal " },
  { id: "75961e51-77bd-46d5-8b1b-7af0f9d507a2", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "rejected", factorIds: ["Special-category and ePrivacy interplay"], noteExcerpt: "EDPB Guidelines 1/2024 §115-116: Art. 5(3) ePrivacy Directive requires consent for cookies/tracking in terminal equipment; any subsequent pe" },
  { id: "9d36d1a6-bb68-45c7-b5a9-e92dc6e22171", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "rejected", factorIds: ["Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024 §136-137: the EDPB 'has previously taken the view that the interests or fundamental rights and freedoms of the data s" },
  { id: "acc6556f-8b04-4aef-b680-8de71b17862f", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "rejected", factorIds: ["Public-authority exclusion"], noteExcerpt: "EDPB Guidelines 1/2024 §98-99, the fullest statement of the public-authority exclusion: Art. 6(1), second indent, bars 6(1)(f) 'for processi" },
  { id: "cbaaef5f-fe5f-47f9-98ac-30a67a92a24a", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "rejected", factorIds: ["Balancing of interests, rights and freedoms"], noteExcerpt: "EDPB Guidelines 1/2024, introducing the direct-marketing objection right: it 'may not be trumped by showing that there are overriding legiti" },
  { id: "cf64fe46-f573-4f99-9254-349d3772e304", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "rejected", factorIds: ["Interest legitimacy", "Special-category and ePrivacy interplay"], noteExcerpt: "EDPB Guidelines 1/2024 §112-114: 'Article 6(1)(f) GDPR may not be relied on if the direct marketing at issue is unlawful, or if the interest" },
  { id: "dbe8d845-5257-46df-b328-79c92b3ae345", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "rejected", factorIds: ["Children's data", "Potential harms and severity"], noteExcerpt: "EDPB Guidelines 1/2024, citing EDPB Guidelines 8/2020 and WP29 profiling guidelines: 'because children represent a more vulnerable group of " },
  { id: "f596eb77-f81a-4b36-bdb5-cdafccbb79e7", sourceTable: "edpb_guidelines", country: "EU", outcomePosture: "rejected", factorIds: ["Special-category and ePrivacy interplay"], noteExcerpt: "EDPB Guidelines 1/2024 §135 (row begins mid-sentence, continuing from the preceding paragraph): 'It follows from this that the processing of" },
];

// ── Factor -> engine-element mapping ────────────────────────────────────────
// Which of the three typed verdicts a given profiled factor_id speaks to.
// "Third-party interests" and "Special-category and ePrivacy interplay" have
// no dedicated typed verdict of their own in the current engine (there is no
// third-party-interests finding, and Art. 9/ePrivacy is a hard GATE on the
// OUTCOME, not a balancing weight) — mapped to "balancing" as the closest
// substantive element, and separately checked against the ePrivacy gate /
// overall outcome below.
type Element = "purpose" | "necessity" | "balancing";
const FACTOR_TO_ELEMENT: Record<string, Element> = {
  "Interest legitimacy": "purpose",
  "Necessity and less-intrusive means": "necessity",
  "Balancing of interests, rights and freedoms": "balancing",
  "Safeguards and mitigations": "balancing",
  "Reasonable expectations of the data subject": "balancing",
  "Children's data": "balancing",
  "Relationship with the individual": "balancing",
  "Potential harms and severity": "balancing",
  "Third-party interests": "balancing",
  "Special-category and ePrivacy interplay": "balancing",
};

const FAVORABLE: Record<Element, string> = {
  purpose: "passes",
  necessity: "passes",
  balancing: "likely_passes",
};

interface Row {
  profileId: string;
  sourceTable: string;
  subject: string;
  country: string;
  outcomePosture: string;
  factorIds: readonly string[];
  purpose: string;
  necessity: string;
  balancing: string;
  outcome: string;
  eprivacyForeclosed: boolean;
  disagreement: boolean;
  disagreementElements: string[];
}

function buildRow(f: Fixture): Row {
  const report = typedReportFor(f.intake as Bag);
  const tpt = report.three_part_test as Bag;
  const purpose = String((tpt.purpose_test as Bag).verdict);
  const necessity = String((tpt.necessity_test as Bag).verdict);
  const balancing = String((tpt.balancing_test as Bag).verdict);
  const outcome = String((report.lia_determination as Bag)?.outcome ?? "");
  const eprivacyForeclosed = (report.eprivacy_short_circuit as Bag)?.li_foreclosed_for_covered_processing === true;

  const elements: Record<Element, string> = { purpose, necessity, balancing };
  const disagreementElements: string[] = [];
  for (const factorId of f.factorIds) {
    const el = FACTOR_TO_ELEMENT[factorId];
    if (!el) continue;
    if (elements[el] === FAVORABLE[el]) disagreementElements.push(`${factorId} -> ${el}:${elements[el]}`);
  }
  // Outcome-level disagreement: the regulator rejected/conditioned reliance,
  // but the engine's OVERALL determination reads as an unconditional pass.
  const outcomeDisagreement = outcome === "legitimate_interests_available";
  if (outcomeDisagreement) disagreementElements.push(`overall_outcome -> ${outcome}`);

  return {
    profileId: f.profileId,
    sourceTable: f.sourceTable,
    subject: f.subject,
    country: f.country,
    outcomePosture: f.outcomePosture,
    factorIds: f.factorIds,
    purpose,
    necessity,
    balancing,
    outcome,
    eprivacyForeclosed,
    disagreement: disagreementElements.length > 0,
    disagreementElements,
  };
}

Deno.test("DOC 206 STEP 0 — fixture diagnostic: build all 63 concrete fixtures and run the typed three-part test", () => {
  assertEquals(FIXTURES.length, 63, "expected 58 enforcement_actions + 5 EDPB worked examples");
  const rows = FIXTURES.map(buildRow);
  assertEquals(rows.length, 63);

  const disagreements = rows.filter((r) => r.disagreement);

  const verdictCounts = {
    purpose: tally(rows.map((r) => r.purpose)),
    necessity: tally(rows.map((r) => r.necessity)),
    balancing: tally(rows.map((r) => r.balancing)),
    outcome: tally(rows.map((r) => r.outcome)),
  };

  console.log(JSON.stringify({
    evt: "doc206_step0_fixture_diagnostic",
    fixtures_built: rows.length,
    doctrine_only_rows_skipped: DOCTRINE_ONLY.length,
    total_profiles_surveyed: rows.length + DOCTRINE_ONLY.length,
    disagreement_count: disagreements.length,
    verdict_counts: verdictCounts,
    disagreements: disagreements.map((r) => ({
      profileId: r.profileId,
      subject: r.subject,
      country: r.country,
      outcomePosture: r.outcomePosture,
      factorIds: r.factorIds,
      purpose: r.purpose,
      necessity: r.necessity,
      balancing: r.balancing,
      outcome: r.outcome,
      disagreementElements: r.disagreementElements,
    })),
  }, null, 2));

  // Full per-fixture table, always logged (this test is a measurement, not
  // yet a regression gate — no rule exists yet to hold it to).
  console.log(JSON.stringify({
    evt: "doc206_step0_full_table",
    rows: rows.map((r) => ({
      profileId: r.profileId, subject: r.subject, country: r.country,
      outcomePosture: r.outcomePosture, factorIds: r.factorIds,
      purpose: r.purpose, necessity: r.necessity, balancing: r.balancing,
      outcome: r.outcome, eprivacyForeclosed: r.eprivacyForeclosed,
      disagreement: r.disagreement,
    })),
  }));

  // Soft structural pins — these describe what THIS diagnostic run actually
  // found (observed 2026-09-06), not a target; they exist so a future engine
  // change that alters this baseline is visible here rather than silently
  // drifting. Not a correctness assertion about the product, and NOT a claim
  // the engine is safe — see doc 206A for what this baseline actually means.
  //
  // FINDING 1 — zero strict disagreements (engine reads a NAMED factor as
  // favorable while the regulator rejected/conditioned reliance on it) in
  // this fixture set. This is NOT because the engine is provably safe on
  // these facts; it is because the minimal six-field-group fixture format
  // structurally cannot drive purpose_test or necessity_test past "uncertain"
  // (see findings 2-3), and balancing_test structurally cannot reach
  // "likely_passes" without balancing_details.collection_context (finding 4)
  // — a field outside this diagnostic's declared scope. The disagreement
  // count this run measures is therefore a floor, not a ceiling.
  assertEquals(disagreements.length, 0);

  // FINDING 2 — purpose_test is "uncertain" on all 63: buildInterestLegitimacy
  // reads purpose_details.interest_statement / .interest_type, which sit
  // outside the six field-groups this diagnostic populates, so the "lawful"
  // sub-test can never resolve to "met" and the verdict never reaches
  // "passes" (or "fails" via that path) from these fixtures.
  assert(rows.every((r) => r.purpose === "uncertain"), "expected purpose_test uncertain on all 63 (purpose_details is out of the minimal-fixture scope)");

  // FINDING 3 — necessity_test is "uncertain" on all 63: none of the 58
  // enforcement decisions record the CONTROLLER'S OWN considered-and-rejected
  // alternatives (that is naturally controller-side reasoning an enforcement
  // decision rarely quotes), so necessity_details.alternatives was left
  // absent throughout and necessityVerdict degrades to "uncertain" by the
  // documented degradation law (never "fails" on silence, never "passes"
  // without a complete comparison).
  assert(rows.every((r) => r.necessity === "uncertain"), "expected necessity_test uncertain on all 63 (no fixture states a recorded alternatives comparison)");

  // FINDING 4 — balancing_test never reaches "likely_passes" in this set (56
  // "uncertain" + 7 "likely_fails" observed 2026-09-06). balancingVerdict's
  // reasonable-expectations branch can only report "not_reasonably_expected"
  // when buildReasonableExpectations has balancing_details.collection_context
  // (or .reasonable_expectation_detail) — again outside this diagnostic's six
  // field-groups — so expectations.verdict is "undetermined_on_the_record"
  // throughout and balancingVerdict's fourth branch always intercepts before
  // "likely_passes", UNLESS potential_harm + empty safeguards (or children +
  // material harm) already forced "likely_fails" first. The 7 "likely_fails"
  // rows are exactly the ones where this diagnostic recorded a severe/
  // significant potential_harm with no safeguards.
  assert(rows.every((r) => r.balancing !== "likely_passes"), "expected balancing_test never likely_passes in this fixture set");
  assertEquals(rows.filter((r) => r.balancing === "likely_fails").length, 7);
  assertEquals(rows.filter((r) => r.balancing === "uncertain").length, 56);

  // FINDING 5 — lia_determination.outcome is "undetermined_on_the_record" on
  // 60/63 and "legitimate_interests_not_available" on the other 3 (the three
  // rows where the ePrivacy hard gate fired — cookies/electronic-marketing
  // processing). It is NEVER "legitimate_interests_available" or
  // "available_only_with_mitigations" in this set: buildDetermination checks
  // publicAuthority.determination === "undetermined_on_the_record" FIRST,
  // before any balancing outcome is reached, and purpose_details.controller_
  // is_public_authority is — again — outside the six field-groups, so that
  // gate is always open and the overall outcome can never resolve past
  // "undetermined" from a minimal fixture in this format.
  assertEquals(rows.filter((r) => r.outcome === "undetermined_on_the_record").length, 60);
  assertEquals(rows.filter((r) => r.outcome === "legitimate_interests_not_available").length, 3);
  assert(rows.every((r) => r.outcome !== "legitimate_interests_available" && r.outcome !== "available_only_with_mitigations"));
});

function tally(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

Deno.test("DOC 206 STEP 0 — doctrine-only rows are recorded but never executed", () => {
  assertEquals(DOCTRINE_ONLY.length, 91);
  assertEquals(FIXTURES.length + DOCTRINE_ONLY.length, 154, "58 enforcement_actions + 5 EDPB examples + 91 doctrine rows = the 154-row survey population");
});
