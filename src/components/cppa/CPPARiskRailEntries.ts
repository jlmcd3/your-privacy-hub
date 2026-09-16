// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer (what facts satisfy the law, what answer "passes").
// goodAnswer examples are clearly fictional and illustrate FORM, never a template.
// Voice: imperative, active, plain subject-verb-object, one idea per sentence,
// specific over vague, no ornamental legalese. Layered: coachLead = one line an
// expert acts on instantly; goodAnswer/commonMistake = the expansion for newer users.
// ENUMERATED-FIELD ADDENDUM — for selects, radios, and pills, coaching explains
// WHAT FACTS DETERMINE the accurate choice and WHAT EVIDENCE to check. It never
// recommends an option, never suggests claiming an exemption, and never implies
// which selection is favourable. goodAnswer shows a FICTIONAL determination —
// facts mapped to a selection — illustrating method, not a preferred outcome.

// src/components/cppa/CPPARiskRailEntries.ts
// StatuteRail entries for the CPPA Risk Assessment (Module 1).
// Citations verified against the codebase. Plain summaries written for compliance professionals.
// Regulation text: verbatim from 11 CCR §§ 7150–7157 and Cal. Civ. Code §§ 1798.100–1798.140.

import type { RailEntry } from "@/components/intake/StatuteRail";
// Doc 261-review (2026-09-15, LEGAL 01): the harm-category tracker's copy is
// derived from HARM_PATHWAY_OPTS so the rail can never disagree with the form.
import { HARM_PATHWAY_OPTS } from "@/pages/CPPARiskAssessment.enums";

const CPPA_URL = "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";

export const CPPA_RISK_RAIL: Record<string, RailEntry> = {
  // ITEM 275 — primary-activity identification. Verbatim § 7150(a) and
  // § 7155(a)(1) (corpus rows cppa-7150, cppa-7155).
  primary_activity: {
    fieldLabel: "What should we call the processing activity you're assessing today?",
    citation: "11 CCR §§ 7150(a), 7155(a)(1)",
    citationUrl: CPPA_URL,
    plainSummary:
      "A risk assessment is conducted for a processing activity, and it must be conducted and documented before that processing begins.",
    regulationText:
      "§ 7150(a) — \u201CEvery business whose processing of consumers\u2019 personal information presents significant risk to consumers\u2019 privacy as set forth in subsection (b) must conduct a risk assessment before initiating that processing.\u201D\n\n§ 7155(a)(1) — \u201CA business must conduct and document a risk assessment in accordance with the requirements of this Article before initiating any processing activity identified in section 7150, subsection (b).\u201D",
    relatedCitations: [
      { citation: "11 CCR § 7156(a)", label: "Comparable set of processing activities" },
      { citation: "11 CCR § 7155(a)(3)", label: "Update on material change (45 days)" },
    ],
    coachLead:
      "Name one processing activity, not a product line or a department. Say what data you handle, whose data it is, and what you use it for. If you would need the word \u201Cand\u201D to join two different purposes, you are naming two activities.",
    coachBody:
      "The name fixes the subject of the record; the one-sentence description states the operation performed on personal information. Timing is part of the standard: the assessment belongs before the processing starts.",
    goodAnswer:
      "\u201CLoyalty birthday coupon mailing\u201D \u2014 \u201CFernbrook Grocers mails a paper coupon to loyalty members using the name, mailing address, and birth month they gave at sign-up, so the coupon arrives in their birthday month.\u201D That is one activity: specific data, specific people, one purpose. \u201CMarketing\u201D or \u201Cthe loyalty program\u201D would not be.",
    commonMistake:
      "Describing the business benefit (\u201Cimproves retention\u201D) instead of the processing. The record needs the operation performed on personal information.",

  },

  // RK3-A1 (Intake Contract v2.0 §1) — § 7152(a)(3)(A) processing record.
  // Verbatim quote from the verified-authorities registry row
  // ra_content_op_method (risk-verified-authorities.ts).
  processing_record: {
    fieldLabel: "Where the information enters, how it is processed, and what the activity produces",
    citation: "11 CCR § 7152(a)(3)(A)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The risk assessment must identify and document the business's planned method for collecting, using, disclosing, retaining, or otherwise processing personal information. These answers are that operational record: the entry point, one line per processing stage, and the output the activity produces.",
    regulationText:
      "§ 7152(a)(3) — “Identify and document in a risk assessment report the following operational elements of the processing:”\n\n§ 7152(a)(3)(A) — “The business’s planned method for collecting, using, disclosing, retaining, or otherwise processing personal information, and the sources of the personal information.”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)(B)", label: "Retention by category of personal information" },
      { citation: "11 CCR § 7152(a)(3)(F)", label: "Recipients of the personal information" },
    ],
    coachLead:
      "Describe each stage as an operation on the information: who or what puts it in, what is done with it, where it goes, how long it stays, and anything else done to it. One concrete line per stage; “N/A” is the accurate answer for a stage that does not occur.",
    coachBody:
      "The record needs the method, not the system's brand name. “Stored in Postgres” names a technology; “held in the loyalty database while the membership stays active” states a method. The entry point and the output bracket the sequence so the report can present the processing as an operational narrative rather than a product description.",
    goodAnswer:
      "Fernbrook Grocers: entry — “Members type their name, mailing address, and birth month into the loyalty sign-up form at the register.” Disclosed — “A monthly address file goes to the print-and-mail vendor.” Output — “A printed coupon mailed in the member's birth month.” Each line is one stage, one operation, no marketing language.",
    commonMistake:
      "Answering every stage with the product name (“the loyalty platform handles it”). The regulation asks for the planned method at each stage — collection, use, disclosure, retention — and a platform name states none of them.",
  },

  // RK3-A1 g2 (Intake Contract v2.0 §6) — § 7152(a)(3)(C) interaction
  // method/purpose + § 7152(a)(3)(D) approximate consumer count. Only the
  // § 7152(a)(3) chapeau is quoted verbatim (verified registry row
  // ra_content_operational); (C)/(D) are summarised, not quoted.
  consumer_interaction: {
    fieldLabel: "How the business interacts with these consumers, why, and roughly how many",
    citation: "11 CCR § 7152(a)(3)(C)–(D)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Among the operational elements, the risk assessment documents the method by which the business interacts with the consumers whose information it processes, why the consumer is interacting with the business, and the approximate number of consumers affected. Scale informs the reach of a risk; it does not by itself determine its seriousness.",
    regulationText:
      "§ 7152(a)(3) — “Identify and document in a risk assessment report the following operational elements of the processing:”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)(A)", label: "Planned processing methods" },
      { citation: "11 CCR § 7152(a)(3)(E)", label: "Disclosures to consumers" },
    ],
    coachLead:
      "Pick the channel the consumer actually uses, state the consumer's own reason for the interaction — their side of the transaction, not your processing purpose — and give a number or a range you can support from your records.",
    coachBody:
      "The interaction purpose frames consumer expectations later in the assessment: what a person reasonably expects depends on what they came to do. The count is an approximation on the record; a supported range is better than a precise-looking guess.",
    goodAnswer:
      "Fernbrook Grocers: method — “In person”; purpose — “Members join the loyalty program at the register to collect points on their grocery shopping”; count — “40,000–60,000, from the loyalty-membership table filtered to California addresses.” The purpose describes what the member came to do, not what the business does with the data.",
    commonMistake:
      "Restating the processing purpose (“to send birthday coupons”) as the interaction purpose. The regulation asks why the consumer is interacting with the business — their reason, not yours.",
  },

  // RK3-A1 g3 (Intake Contract v2.0 §6) — § 7152(a)(3)(B) per-category
  // retention. Verbatim from verified registry row ra_content_op_retention.
  retention_by_category: {
    fieldLabel: "How long each category of personal information is kept",
    citation: "11 CCR § 7152(a)(3)(B)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The risk assessment documents, for each category of personal information, how long the business plans to retain it — or, where the period is not known, the criteria used to determine it. A single overall period is a summary; the record is per category.",
    regulationText:
      "§ 7152(a)(3)(B) — “How long the business plans to retain each category of personal information, or if unknown, the criteria the business plans to use to determine that retention period.”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)(A)", label: "Planned processing methods" },
      { citation: "11 CCR § 7152(a)(2)", label: "Minimum necessary personal information" },
    ],
    coachLead:
      "One row per category you selected earlier. Give the period where you know it; where you genuinely do not, pick the criteria that will set it — the criteria answer is the accurate record, not a placeholder.",
    coachBody:
      "Retention stays connected to the purpose that justified the processing. Different categories often carry different periods — transaction records under a statutory retention rule, marketing identifiers until opt-out. A row per category makes that visible instead of averaging it away.",
    goodAnswer:
      "Fernbrook Grocers: “Contact identifiers — duration of the loyalty membership, then deleted within 90 days.” “Financial information — 7 years, statutory retention requirement.” Two categories, two different, stated rules.",
    commonMistake:
      "Copying one overall period into every row. Where periods genuinely differ by category, a uniform answer misstates the record; where the period is unknown, leaving the row blank instead of stating the criteria loses the answer the regulation asks for.",
  },

  // RK3-A1 g4 (Intake Contract v2.0 §6) — § 7152(a)(3)(E) activity
  // disclosures. Verbatim from verified registry row ra_content_op_disclosures.
  activity_disclosures: {
    fieldLabel: "What consumers are told about this processing, and how",
    citation: "11 CCR § 7152(a)(3)(E)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The risk assessment documents the disclosures the business has made or plans to make to the consumer about this processing, and how those disclosures were or will be made. The record needs both halves — the substance and the delivery.",
    regulationText:
      "§ 7152(a)(3)(E) — “What disclosures the business has made or plans to make to the consumer about the processing of their personal information and how these disclosures were or will be made”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)(C)", label: "Method of interacting with consumers" },
      { citation: "11 CCR § 7003", label: "Conspicuousness requirements for notices" },
    ],
    coachLead:
      "State what the consumer actually reads or hears — the substance, not the document's name — then how it reaches them, and whether it exists today or is still planned. A planned disclosure is a legitimate answer; label it as planned.",
    coachBody:
      "“We have a privacy policy” names a container. The record wants the statement the consumer encounters about this activity, its delivery route, and its status. Disclosures still on the roadmap belong in the record too — marked Planned, so the assessment can treat them as commitments rather than existing facts.",
    goodAnswer:
      "Fernbrook Grocers: content — “The loyalty sign-up form states that name, address, and birth month are used to mail a birthday coupon”; method — Notice at Collection; status — Made. A second row records a planned just-in-time notice for the new mobile sign-up, marked Planned.",
    commonMistake:
      "Answering with the mechanism list alone (“privacy policy, consent screen”). Without the content half — what the disclosure actually says about this activity — the § 7152(a)(3)(E) record is incomplete.",
  },

  // RK3-A1 g5 (Intake Contract v2.0 §6) — § 7152(a)(3)(F) recipients.
  // Verbatim from verified registry row ra_content_op_recipients.
  recipients_record: {
    fieldLabel: "Who receives the information, what they receive, and why",
    citation: "11 CCR § 7152(a)(3)(F)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The risk assessment documents the names or categories of the service providers, contractors, or third parties to whom personal information is disclosed or made available for this processing, and the purpose of each disclosure. Declaring that there are no recipients is itself a substantive answer on the record.",
    regulationText:
      "§ 7152(a)(3)(F) — “The names or categories of the service providers, contractors, or third parties to whom the business discloses or makes available the consumers' personal information for the processing; and the purpose for which the business discloses or makes the consumers' personal information available to them.”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)(E)", label: "Disclosures to consumers" },
      { citation: "Cal. Civ. Code § 1798.140(ah), (t)", label: "Sale and sharing definitions" },
    ],
    coachLead:
      "One row per recipient: who they are (a name or an honest category), which of the three legal types they are, exactly which categories of information they can see, and the purpose the disclosure serves. If nothing leaves the business in this activity, say so with the declaration — that is an answer, not a skipped question.",
    coachBody:
      "The type classification does legal work: a service provider processes on your instructions under contract; a third party receiving data for its own use makes the disclosure a sale or share. Classify from the contract terms and the actual data use, not from what the vendor calls itself.",
    goodAnswer:
      "Fernbrook Grocers: “Print-and-mail vendor — Service provider — Contact identifiers — Printing and mailing the monthly coupon batch.” A second row records the beverage distributor as “Third party — Contact identifiers — Marketing list resale,” which the record then treats as a sale.",
    commonMistake:
      "Listing vendors without the per-recipient categories and purpose, or defaulting every recipient to “service provider” without checking the contract. The (F) record requires both halves — recipients and purposes — and the type determines whether a disclosure is a sale.",
  },

  // RK3-A1 g6 (Intake Contract v2.0 §6) — § 7151(a) stakeholder
  // participation. Verbatim from the verified registry (§ 7151(a)/(b) rows).
  section_7151_participation: {
    fieldLabel: "Employees whose duties include this processing, included in the assessment",
    citation: "11 CCR § 7151(a)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Employees whose job duties include participating in the processing under assessment must be included in the business's risk-assessment process for that activity. This record documents who they are, what they do in the processing, and that they participated. It is separate from the list of who provided information for the report.",
    regulationText:
      "§ 7151(a) — “A business's employees whose job duties include participating in the processing of personal information that would be subject to a risk assessment must be included in the business's risk assessment process for that processing activity.”\n\n§ 7151(b) — “In conducting the risk assessment, a business may include external parties in the process.”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(8)", label: "Individuals who provided information" },
      { citation: "11 CCR § 7152(a)(9)", label: "Reviewers and approvers" },
    ],
    coachLead:
      "List the people who actually operate this processing — the ones who run the jobs, hold the credentials, configure the system — not the privacy team writing the assessment. State each person's operational responsibility and confirm they took part in the assessment process.",
    coachBody:
      "The rule exists because the people who operate a processing activity know facts the assessment needs. Their inclusion is a quality requirement on the process itself. A person can appear both here and in the information-provider list; the two records answer different questions.",
    goodAnswer:
      "Fernbrook Grocers: “Dana Okafor — Loyalty operations lead — Runs the monthly coupon batch job and manages the vendor address file — participation confirmed.” Operational duty stated, participation confirmed.",
    commonMistake:
      "Listing the assessment's authors instead of the processing's operators, or treating this as a duplicate of the information-provider question. § 7151(a) is about who operates the processing being assessed.",
  },

  // ITEM 275 — § 7156(a) comparable-set standard (corpus row cppa-7156),
  // including the Business E example excerpt.
  comparable_set: {
    fieldLabel: "Does the same data serve any other distinct purpose, product, or audience?",
    citation: "11 CCR § 7156(a)",
    citationUrl: CPPA_URL,
    plainSummary:
      "One risk assessment can cover several processing activities only where they are similar and present similar risks to consumers\u2019 privacy. This tool compares each additional use against the assessed activity on five dimensions and recommends a separate risk assessment where any one of them differs \u2014 a recommendation on your record, not a statement of what the law requires, and not a substitute for your counsel\u2019s review.",

    regulationText:
      "\u201CA business may conduct a single risk assessment for a comparable set of processing activities. A \u2018comparable set of processing activities\u2019 that can be addressed by a single risk assessment is a set of similar processing activities that present similar risks to consumers\u2019 privacy.\u201D\n\n\u00A7 7156(a)(1) example (excerpt) \u2014 \u201CBusiness E may use a single risk assessment for processing the personal information for the birthday mailing and November mailing across all stores because in each case it is collecting the same personal information in the same way for the purpose of sending coupons and age-appropriate toy lists to children, and this processing presents similar risks to consumers\u2019 privacy.\u201D",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)", label: "Activities presenting significant risk" },
      { citation: "11 CCR § 7156(b)", label: "Using an assessment prepared for another purpose" },
    ],
    coachLead:
      "List every other use the same data is put to, including the ones you would rather leave out, then set each one beside this activity on all five dimensions: the data, the people, the systems, the purpose, and the privacy risks and safeguards. Report the differences you find rather than smoothing them over \u2014 if any single dimension differs, this tool will recommend a separate risk assessment for that use, and if a dimension is unresolved it will recommend one unless you confirm the dimension is the same. If a use does not line up, say so; that answer is as usable as a match.",

    coachBody:
      "The standard is similarity of the activities and similarity of the privacy risks. Answer each comparison from what your records show; where you do not know, \u201CNot sure\u201D is the accurate answer and is recorded as such.",
    goodAnswer:
      "Fernbrook Grocers notes a second use: the same loyalty records also feed a resale of shopper contact details to a regional beverage distributor. Same data, same shoppers \u2014 but a different purpose, a different recipient, and a different privacy risk, so the customer records the comparison dimension by dimension and flags the mismatch instead of folding the two together.",

    commonMistake:
      "Treating uses as comparable because one team runs both, or because the data set is the same. Shared data does not make risks similar; the comparison is about the activities and their privacy risks.",
  },

  subject_anchor: {

    fieldLabel: "In one line — what processing does this assessment cover?",
    citation: "11 CCR § 7150(b)",
    citationUrl: CPPA_URL,
    plainSummary:
      "One assessment covers one processing activity. This line names it and fixes it across your runs.",
    regulationText: "…",
    coachLead: "Name the one processing activity being assessed.",
    coachBody:
      "One line, one activity. The detailed purpose in Step 6 stays editable; this is the record's fixed subject.",
    goodAnswer:
      "\u201CAutomated resume-screening for hiring.\u201D — the activity, not the department or the vendor.",
    commonMistake:
      "Naming the tool (\u201Cthe HireSmart platform\u201D) instead of the processing. Vendors change; the assessed activity is the record.",
  },

  q1_revenue: {
    fieldLabel: "Annual gross revenue",
    citation: "Cal. Civ. Code § 1798.140(ag)(1)",
    citationUrl: CPPA_URL,
    plainSummary: "A 'business' subject to CCPA/CPRA includes any for-profit entity doing business in California with annual gross revenues exceeding $25 million. This threshold applies regardless of how much California consumer data you process. The revenue band you select also determines your first cybersecurity-audit deadline under 11 CCR § 7121(a): >$100M → April 1, 2028; $50M–$100M → April 1, 2029; <$50M → April 1, 2030.",
    regulationText: "A \"business\" means a sole proprietorship, partnership, limited liability company, corporation, association, or other legal entity that is organized or operated for the profit or financial benefit of its shareholders or other owners… and that… Has annual gross revenues in excess of twenty-five million dollars ($25,000,000).\n\n11 CCR § 7121(a) — First cybersecurity audit report deadline: \"A business must complete its first cybersecurity audit report no later than: (1) April 1, 2028, if the business's annual gross revenue for 2026 was more than one hundred million dollars ($100,000,000) as of January 1, 2027. The business's audit would cover the period from January 1, 2027, through January 1, 2028. (2) April 1, 2029, if the business's annual gross revenue for 2027 was between fifty million dollars ($50,000,000) and one hundred million dollars ($100,000,000) as of January 1, 2028. The business's audit would cover the period from January 1, 2028, through January 1, 2029. (3) April 1, 2030, if the business's annual gross revenue for 2028 was less than fifty million dollars ($50,000,000). The business's audit would cover the period from January 1, 2029, through January 1, 2030.\"",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ag)(2)", label: "Consumer volume threshold" },
      { citation: "Cal. Civ. Code § 1798.140(ag)(3)", label: "50% revenue threshold" },
      { citation: "11 CCR § 7121(a)", label: "First cybersecurity audit report deadline cohort" },
    ],
    coachLead: "Use last calendar year's gross revenue, worldwide.",
    coachBody: "The threshold tests total gross revenue — worldwide, before costs. Not California-only revenue. Not profit. Pick the band your best audited figure falls in. The band you select is also the cohort key § 7121(a) uses to set your first cybersecurity-audit deadline, so the $50M and $100M lines are cohort-defining, not narrative.",
    goodAnswer: "A company took in $28M worldwide last year, only $4M of it in California. It selects the over-$25M band — the statute counts gross revenue, not in-state revenue.",
    commonMistake: "Picking a band from California-only revenue or from net income. Both understate the number the law tests.",
  },

  q5c_share_revenue_50pct: {
    fieldLabel: "50%-or-more of annual revenue from selling or sharing PI",
    citation: "Cal. Civ. Code § 1798.140(d)(1)(C)",
    citationUrl: CPPA_URL,
    plainSummary: "Deriving 50% or more of annual revenue from selling or sharing consumers' personal information carries two independent consequences: (1) covered-business status under Cal. Civ. Code § 1798.140(d)(1)(C) attaches regardless of revenue size or consumer count; and (2) the same 50%-revenue prong is a standalone cybersecurity-audit trigger under 11 CCR § 7120(b)(1), meaning the audit obligation attaches without any consumer-count threshold.",
    regulationText: "Cal. Civ. Code § 1798.140(d)(1)(C) — Covered-business definition: \"Derives 50 percent or more of its annual revenues from selling or sharing consumers' personal information.\"\n\n11 CCR § 7120(b)(1) — Cybersecurity-audit trigger: \"A business's processing of consumers' personal information presents significant risk to consumers' security if any of the following is true: (1) The business meets the threshold set forth in Civil Code section 1798.140, subdivision (d)(1)(C), in the preceding calendar year.\"",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ah)", label: "'Share' definition" },
      { citation: "11 CCR § 7121(a)", label: "Deadline cohort by revenue band" },
    ],
    coachLead: "Answer from the revenue mix, not from your product story.",
    coachBody: "The test is proportion: at least 50% of annual revenue derived from selling or sharing PI. 'Sell' and 'share' carry their CCPA meaning — value-for-consideration disclosure, and cross-context behavioural-advertising disclosure. Base the answer on last year's audited revenue split, not on how the business describes itself.",
    goodAnswer: "An ad-network operator's revenue is 78% from audience data sold to advertisers. It answers yes — both covered-business status and the cybersecurity-audit trigger attach.",
    commonMistake: "Answering no because \"we don't sell data for money\" while cross-context behavioural-advertising sharing generates most of the revenue. Sharing counts, and it counts by revenue proportion.",
  },

  q15c_spi_volume: {
    fieldLabel: "Sensitive PI of 50,000 or more consumers",
    citation: "11 CCR § 7120(b)(2)(B)",
    citationUrl: CPPA_URL,
    plainSummary: "Processing the sensitive personal information of 50,000 or more consumers in the preceding calendar year is a standalone cybersecurity-audit trigger under 11 CCR § 7120(b)(2)(B), independent of the general 250,000-consumer trigger in § 7120(b)(2)(A). It fires only when the § 1798.140(d)(1)(A) revenue-based covered-business test is also met (i.e. annual gross revenues > $25M).",
    regulationText: "11 CCR § 7120(b)(2) — \"The business meets the threshold set forth in Civil Code section 1798.140, subdivision (d)(1)(A); and… (B) Processed the sensitive personal information of 50,000 or more consumers in the preceding calendar year.\"",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ae)", label: "Sensitive PI definition (see q15)" },
      { citation: "11 CCR § 7120(b)(2)(A)", label: "250,000-consumer trigger (companion prong)" },
      { citation: "Cal. Civ. Code § 1798.140(d)(1)(A)", label: "$25M revenue gate for the (b)(2) prongs" },
    ],
    coachLead: "Count unique consumers whose sensitive PI you processed — not records.",
    coachBody: "The 50,000 figure counts distinct consumers whose sensitive PI you processed in the preceding calendar year, not sensitive-PI events. \"Sensitive PI\" is the § 1798.140(ae) list already anchored at Q15 — precise geolocation, government IDs, account credentials, race, health, biometrics, and the rest. If the same 50,000 consumers appear across multiple sensitive-PI categories, they still count once.",
    goodAnswer: "A telehealth service processed health data for 62,000 California patients last year. It answers \"50,000 or more\" — one sensitive-PI category, distinct-consumer count above the threshold.",
    commonMistake: "Counting sensitive-PI records or events instead of distinct consumers, or excluding sensitive PI collected but not \"used\" — the trigger tests processing, which includes storage.",
  },



  q2_consumers: {
    fieldLabel: "Number of California consumers processed annually",
    citation: "Cal. Civ. Code § 1798.140(d)(1)(B)",
    citationUrl: CPPA_URL,
    plainSummary: "A business that annually buys, sells, or shares the personal information of 100,000 or more California consumers or households satisfies the § 1798.140(d)(1)(B) covered-business prong, independent of the (d)(1)(A) revenue prong. BAND-REALIGNMENT (2026-07-26): the V2 band vocabulary aligns each option to the statutory 100,000 / 250,000 / 1,000,000 lines so the count prong and the § 7120(b)(2)(A) 250,000-consumer audit prong can be evaluated verbatim.",
    regulationText: "Cal. Civ. Code § 1798.140(d)(1)(B) — Covered-business definition: \"Alone or in combination, annually buys, sells, or shares the personal information of 100,000 or more consumers or households.\"",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(d)(1)(A)", label: "Revenue threshold ($25M+)" },
      { citation: "11 CCR § 7120(b)(2)(A)", label: "250,000-consumer cybersecurity-audit prong" },
    ],
    coachLead: "Count every unique California consumer or household you process, per year.",
    coachBody: "The count is not your customer list. It includes anyone whose personal information you buy, sell, share, or process — site visitors with logged identifiers included.",
    goodAnswer: "A retailer has 40,000 buyers but logs device identifiers for 120,000 California visitors. It counts the 120,000 — an identifier is personal information, purchase or not.",
    commonMistake: "Counting only paying customers. Device identifiers, loyalty members, and marketing lists all count.",
  },

  q3_sector: {
    fieldLabel: "Primary business sector",
    citation: "11 CCR § 7150(a)",
    citationUrl: CPPA_URL,
    plainSummary: "A risk assessment is required before beginning any processing of personal information that presents significant risk to consumer privacy. The CPPA's regulations identify specific categories of processing — including by sector — that trigger this requirement.",
    regulationText: "A business shall conduct and document a risk assessment before initiating any processing of personal information that presents significant risk to the privacy of consumers.",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)", label: "Categories of processing that present significant risk" },
    ],
    coachLead: "Pick the sector of the processing being assessed — not the parent company.",
    coachBody: "Sector decides which enforcement patterns the assessment weighs. If your organization spans several, choose the one this activity belongs to.",
    goodAnswer: "A conglomerate assessing its consumer-lending app selects financial services, not technology. The assessed activity is lending, whatever the parent does.",
    commonMistake: "Selecting the corporate industry when the assessed processing sits in a different one. That pulls the wrong regulatory context into every later section.",
  },

  q4_pi_categories: {
    fieldLabel: "Categories of personal information processed",
    citation: "11 CCR § 7152(a)(2)",
    citationUrl: CPPA_URL,
    plainSummary: "The risk assessment must identify the specific categories of personal information involved in the processing. Eight categories are classified as sensitive PI under Cal. Civ. Code § 1798.140(ae) and trigger additional harm analysis requirements.",
    regulationText: "The categories of personal information processed, including whether the categories are sensitive personal information as defined in Civil Code section 1798.140, subdivision (ae).",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ae)", label: "Sensitive PI definition" },
      { citation: "11 CCR § 7152(a)(5)", label: "Sensitive PI harm categories" },
    ],
    coachLead: "Select every category this processing touches — including what it creates.",
    coachBody: "The categories drive the minimum-necessary analysis. Check what the systems actually collect and what they produce. A score or segment is data too.",
    goodAnswer: "A fraud-screening flow selects identifiers, commercial information, and inferences. It reads device IDs and purchase history, and it outputs a risk score — which is itself an inference.",
    commonMistake: "Leaving out inferences. If the processing produces a score, segment, or prediction about a person, that output is its own category.",
  },

  q5_sell_share: {
    fieldLabel: "Sell or share PI for cross-context behavioural advertising",
    citation: "Cal. Civ. Code §§ 1798.120, 1798.135(a)",
    citationUrl: CPPA_URL,
    plainSummary: "Businesses that sell or share PI must provide a 'Do Not Sell or Share My Personal Information' link on their homepage. Selling or sharing PI is also one of the six categories of processing that triggers the CPPA's risk assessment requirement.",
    regulationText: "A consumer shall have the right, at any time, to direct a business that sells or shares personal information about the consumer to third parties not to sell or share the consumer's personal information.",
    enforcementNote: "Undisclosed data selling and sharing is among the most cited CCPA violations. The CPPA's first wave of enforcement investigations (2024–2025) prioritized businesses with absent or non-functional opt-out mechanisms. Ensure your answer here is consistent with your privacy policy and actual data flows.",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(1)", label: "Risk assessment trigger — sell/share" },
      { citation: "Cal. Civ. Code § 1798.140(k)", label: "Cross-context behavioural advertising definition" },
    ],
    coachLead: "Answer from your data flows, not your contract labels.",
    coachBody: "'Sell' includes disclosure for any valuable consideration, not just money. 'Share' covers disclosure for cross-context behavioural advertising with nothing paid at all. Trace where PI leaves the business and what comes back.",
    goodAnswer: "A publisher gives hashed emails to an ad platform and gets audience insights back. That is a yes — insights are valuable consideration, even with no invoice.",
    commonMistake: "Answering no because the agreements say 'service provider'. The label doesn't decide; the consideration and the advertising use do.",
  },

  q9_opt_out: {
    fieldLabel: "Right to Opt-Out — Do Not Sell or Share link",
    citation: "Cal. Civ. Code §§ 1798.120, 1798.135(a)",
    citationUrl: CPPA_URL,
    plainSummary: "If your business sells or shares PI, you must provide a clearly visible 'Do Not Sell or Share My Personal Information' link on your homepage. The link must be conspicuous — footer-only placement may not satisfy the requirement.",
    regulationText: "A business that sells consumers' personal information to, or shares it with, third parties shall provide notice to consumers… and shall disclose… the title 'Do Not Sell or Share My Personal Information' conspicuously posted on the business's internet homepage.",
    enforcementNote: "Absent, buried, or broken opt-out links appear repeatedly in enforcement actions. The CPPA has specifically cited homepages that require scrolling to find the opt-out link as potentially non-compliant with the conspicuousness requirement.",
    relatedCitations: [
      { citation: "11 CCR § 7004", label: "Ease-of-use requirements for privacy choices" },
    ],
    coachLead: "Answer for what's live on the site today.",
    coachBody: "The question tests whether the Do Not Sell or Share mechanism exists and works. Check the actual footer and click through it. Don't answer from the policy document.",
    goodAnswer: "A team finds the footer link, submits a request, and confirms the disclosure actually stops — then answers yes.",
    commonMistake: "Answering yes because the privacy policy describes an opt-out. The law requires a working mechanism, not a description of one.",
  },

  q10_verification: {
    fieldLabel: "Identity verification for consumer rights requests",
    citation: "11 CCR §§ 7060–7062",
    citationUrl: CPPA_URL,
    plainSummary: "Businesses must verify the identity of consumers making rights requests before responding. The verification process must be proportionate to the sensitivity of the information requested and must not create barriers to exercising rights.",
    regulationText: "A business shall implement a reasonable method to verify that the consumer making the request is the consumer about whom the business has collected personal information, or is that consumer's authorized agent.",
    relatedCitations: [
      { citation: "11 CCR § 7023", label: "Methods of verification" },
      { citation: "11 CCR § 7025", label: "Verification for sensitive PI requests" },
    ],
    coachLead: "Answer for the written procedure — and whether it scales with risk.",
    coachBody: "§§ 7060–7062 require verification matched to the sensitivity of the request. Look for a documented method that treats deletion differently from access to specific pieces.",
    goodAnswer: "An operations lead finds a written SOP: two data points to verify a deletion request, a signed declaration for specific-pieces access. Only then does she select 'documented procedure'.",
    commonMistake: "Treating an ad-hoc email exchange as a procedure. The regulation tests a written, risk-scaled method.",
  },

  q15_sensitive_pi: {
    fieldLabel: "Do you process any sensitive personal information?",
    citation: "Cal. Civ. Code § 1798.140(ae)",
    citationUrl: CPPA_URL,
    plainSummary: "Sensitive PI is a defined category that includes health data, biometrics, genetic data, precise geolocation, racial/ethnic origin, religious beliefs, union membership, sexual orientation, and citizenship status. Processing sensitive PI triggers the right to limit use and additional harm analysis in the risk assessment.",
    regulationText: "\"Sensitive personal information\" means personal information that reveals… a consumer's social security, driver's license, state identification card, or passport number; account log-in… precise geolocation; racial or ethnic origin, religious or philosophical beliefs, or union membership… the contents of a consumer's mail, email, and text messages… genetic data… biometric information processed for the purpose of uniquely identifying a consumer; personal information collected and analyzed concerning a consumer's health; sex life or sexual orientation.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.121", label: "Right to limit use of sensitive PI" },
      { citation: "11 CCR § 7152(a)(5)", label: "Sensitive PI in risk assessment" },
    ],
    coachLead: "Check the statutory list against what your systems actually hold.",
    // DOC 157 (2026-09-03) — the § 7001(bbb)(4) under-16 rule joins the list.
    coachBody: "Sensitive PI is a defined list: precise geolocation, government IDs, account credentials, race or ethnicity, health, biometrics, genetic and neural data, message contents, and more. Under 11 CCR § 7001(bbb)(4) it also includes all personal information of consumers you have actual knowledge are under 16. Answer from your inventory, not your intentions.",
    goodAnswer: "A delivery app answers yes for one reason only: it stores precise geolocation. One listed category is enough.",
    commonMistake: "Equating sensitive with secret. Precise location and login credentials count, however routine they feel.",
  },

  q18_admt: {
    fieldLabel: "Automated decisionmaking for decisions with significant effects",
    citation: "11 CCR § 7001(e)",
    citationUrl: CPPA_URL,
    plainSummary: "ADMT means technology that processes PI and uses computation to replace or substantially replace human decision-making. It includes AI, ML, and profiling. It does NOT include infrastructure (firewalls, databases, spreadsheets) that doesn't replace human decisions. Using ADMT for a significant decision about a consumer (§ 7001(ddd)) engages the § 7150(b)(3) risk-assessment trigger; training ADMT for the purposes listed in § 7150(b)(6) is a separate trigger with its own facts.",
    regulationText: "\"Automated decisionmaking technology\" or \"ADMT\" means any technology that processes personal information and uses computation to replace human decisionmaking or substantially replace human decisionmaking. (1) For purposes of this definition, to \"substantially replace human decisionmaking\" means a business uses the technology's output to make a decision without human involvement.",
    enforcementNote: "The CPPA has indicated it will look at whether a human reviewer genuinely has authority to change a decision, not just review it. A 'human in the loop' who cannot override the system's output does not satisfy the human involvement standard.",
    coachLead: "If ADMT is in play, describe the system, not the vendor.",
    coachBody: "The description that matters is what the technology does with whose data and which decision it touches — name the decision domain, the inputs, and where the output lands.",
    goodAnswer: "\u201CA scoring model ranks rental applicants using credit and tenancy history; scores gate which applications an agent reviews.\u201D — the decision, the inputs, and the output's role.",
    commonMistake: "Answering with a product name. \u2018We use VendorX\u2019 says who sold it; § 7001(e) turns on what it does to the decision.",
    relatedCitations: [
      { citation: "11 CCR § 7001(ddd)", label: "Significant decision definition" },
      { citation: "11 CCR § 7150(b)(3)", label: "Risk assessment trigger — ADMT" },
    ],
  },

  i1_purpose: {
    fieldLabel: "Specific processing purpose",
    citation: "11 CCR § 7152(a)(1)",
    citationUrl: CPPA_URL,
    plainSummary: "The risk assessment must state the specific purpose of the processing. Generic descriptions — 'to improve services', 'for security', 'analytics' — are explicitly insufficient. You must describe what the processing does, who it affects, and what business outcome it achieves.",
    regulationText: "The specific purpose or purposes of the processing.",
    fscrContext: "During rulemaking, many commenters argued that generic purpose statements should be acceptable to reduce compliance burden. The CPPA rejected this position, stating in the Final Statement of Reasons that a vague purpose prevents consumers from meaningfully exercising their rights and prevents the Agency from evaluating proportionality. Specificity is required because the purpose statement anchors all subsequent harm analysis in the assessment.",
    coachLead: "State the concrete operation and its business outcome.",
    coachBody:
      "Name the specific system, its inputs, what it produces, and who acts on it. The validator flags umbrella phrases — they also weaken every downstream section.",
    goodAnswer:
      "\u201CA gradient-boosted model scores applicants 0\u2013100 on four years of hiring-outcome data; scores order the shortlist recruiters review.\u201D — mechanism, inputs, output, and where automation makes the call.",
    commonMistake:
      "\u201CImprove hiring\u201D / \u201Canalytics\u201D / \u201Cas described in our privacy policy.\u201D These state a goal, not a processing purpose — § 7152(a)(2) needs a purpose specific enough to test necessity against.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(2)", label: "PI categories — must align with stated purpose" },
    ],
  },

  i2_retention: {
    fieldLabel: "Retention period and criteria",
    citation: "11 CCR § 7152(a)(3)(B)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must state how long each category of personal information will be retained, or the criteria used to determine the retention period. You must state a specific period or a specific determinable criterion — 'as long as necessary' is not sufficient.",
    regulationText: "The length of time the business intends to retain each category of personal information, or if that is not possible, the criteria used to determine that period.",
    coachLead: "Give a number, a trigger, and what happens at the end.",
    coachBody: "State the retention period per category as a defined duration or a computable criterion, the event that starts the clock, and the deletion or de-identification step at period end. § 7152(a)(3)(B) looks for the plan, not an intention.",
    goodAnswer: "\u201CApplication records: 24 months from decision date, then automated deletion; access logs: 12 months rolling.\u201D — a duration, a start event, and an end-state for each category.",
    commonMistake: "\u201CAs long as necessary\u201D restates the legal standard instead of applying it. A criterion must let a reader compute the date for a specific record.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.100(a)(5)", label: "Retention disclosure requirement" },
    ],
  },

  i5_admt: {
    fieldLabel: "Automated decisionmaking specifics",
    citation: "11 CCR § 7152(a)(3)(G)",
    citationUrl: CPPA_URL,
    plainSummary: "When the processing involves ADMT for significant decisions, the risk assessment must describe: the logic of the ADMT system, the training data sources, fairness/bias testing, and the human review process. All four elements are required.",
    regulationText: "If the processing involves automated decisionmaking technology for a significant decision concerning a consumer: (i) A description of the logic involved in the automated decision and the training data used; (ii) An explanation of how the business tests for and corrects bias; (iii) A description of the human review process for outputs of the technology.",
    fscrContext: "The CPPA retained the detailed ADMT disclosure requirements over industry objections that they were too prescriptive and could expose trade secrets. The FSOR notes that § 7220 already provides trade secret protections, and that without specificity, the risk assessment cannot demonstrate proportionality or bias mitigation.",
    coachLead: "Cover all four: the logic, the training data, the human's role, the testing.",
    coachBody: "Describe what the system computes and from which inputs, where its training data came from, what a human can actually change before the decision takes effect, and any validity or fairness testing with its cadence.",
    goodAnswer: "\u201CA gradient-boosted scorer trained on three years of outcome data; a reviewer can override any score before the decision issues; disparate-impact testing runs quarterly.\u201D — mechanism, data lineage, real human authority, and a test cadence.",
    commonMistake: "Describing human review as \u2018a person sees the output.\u2019 § 7152(a)(3)(G) turns on whether the human can change the outcome, not whether they observe it.",
    relatedCitations: [
      { citation: "11 CCR § 7001(e)(1)", label: "Human involvement definition" },
      { citation: "11 CCR § 7156(b)", label: "Cross-referencing existing DPIA" },
    ],
  },

  i9_dpia: {
    fieldLabel: "Existing data protection impact assessment",
    citation: "11 CCR § 7156(b)",
    citationUrl: CPPA_URL,
    plainSummary: "A prior GDPR DPIA or other risk assessment prepared for another purpose can be reused toward the CPPA risk assessment. It does not substitute wholesale — the reused assessment must contain, or be paired with, whatever § 7152 information it doesn't already cover. Reuse reduces duplication and speeds completion.",
    regulationText: "“A business may utilize a risk assessment that it has prepared for another purpose to meet the requirements in section 7152, provided that the risk assessment contains the information that must be included in, or is paired with the outstanding information necessary for, compliance with section 7152.”",
    fscrContext: "Commenters argued that an existing GDPR DPIA should substitute entirely for the CPPA risk assessment. The Agency rejected full substitution but confirmed in § 7156(b) that a business may utilize a prior risk assessment prepared for another purpose where it is paired with whatever § 7152 information it doesn't already cover, reducing the compliance burden without compromising the assessment's integrity.",
    coachLead: "Name the assessment, its date, and what it covered.",
    coachBody: "If a GDPR DPIA or other risk assessment exists for this processing, identify it by title and date and state the scope it examined and where that scope ends; § 7156(b) lets a conforming existing assessment carry part of this work.",
    goodAnswer: "\u201CDPIA \u2018Applicant scoring v2\u2019, completed November 2025, covering the EU hiring flow; the US expansion is out of its scope.\u201D — the record, its date, its coverage, and its edges.",
    commonMistake: "Citing a privacy policy or a vendor certification as a prior assessment. § 7156(b) concerns your documented risk assessment of this processing.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CCPA "business purposes" (Civ. Code § 1798.140(e)) and statutory
  // exemptions (Civ. Code § 1798.145). These are NOT § 7152 exceptions — the
  // CCPA does not exempt these activities from a risk assessment when a
  // § 7150 trigger applies. They define permitted internal uses or carve
  // out specific obligations (e.g., HR data, legal compliance).
  // ──────────────────────────────────────────────────────────────────────────

  exc_fraud_detection: {
    fieldLabel: "Business purpose: Fraud prevention / detection",
    citation: "Cal. Civ. Code § 1798.140(e)(2)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Detecting security incidents, protecting against malicious, deceptive, fraudulent, or illegal activity, and prosecuting those responsible is an enumerated CCPA \"business purpose.\" It permits service providers/contractors to use personal information for this purpose and supports a § 1798.121 limit-use carve-out for sensitive PI — but it does NOT remove a § 7150 risk-assessment trigger. If you sell/share, process sensitive PI, or use ADMT, you must still conduct the assessment.",
    regulationText: "Helping to ensure security and integrity to the extent the use of the consumer's personal information is reasonably necessary and proportionate for these purposes. Detecting security incidents, protecting against malicious, deceptive, fraudulent, or illegal actions directed at the business, and prosecuting those responsible for those actions.",
    enforcementNote: "Common error: treating fraud-detection as a blanket exemption. The CPPA's enforcement posture treats it as a permitted purpose with a proportionality test — over-collection or secondary use beyond fraud will not qualify.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.121(d)", label: "Sensitive PI limit-use carve-out" },
      { citation: "11 CCR § 7150", label: "Risk assessment triggers (not removed)" },
    ],
    coachLead: "Claim this only for processing that fraud prevention actually needs.",
    coachBody: "The purpose covers detecting security incidents and fraudulent or illegal activity. It attaches to specific operations, not the company. Name the operation it covers.",
    goodAnswer: "'Device-velocity checks at checkout' qualifies. 'Our analytics program' doesn't — one is a fraud control, the other just contains some fraud-adjacent data.",
    commonMistake: "Claiming a whole data flow because part of it serves fraud prevention. The claim covers the necessary processing only.",
  },

  exc_security_integrity: {
    fieldLabel: "Business purpose: Security & integrity of systems and data",
    citation: "Cal. Civ. Code § 1798.140(e)(2)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Maintaining the security and integrity of information and the systems that process it is an enumerated business purpose. Like fraud detection, it permits the use but does NOT exempt the activity from risk-assessment scope when a § 7150 trigger fires.",
    regulationText: "Helping to ensure security and integrity to the extent the use of the consumer's personal information is reasonably necessary and proportionate for these purposes. Resisting malicious, deceptive, fraudulent, or illegal actions directed at the business and helping to prosecute those responsible for those actions.",
    enforcementNote: "The \"reasonably necessary and proportionate\" qualifier is doing real work. Logging an entire session keystroke-by-keystroke for security purposes will not qualify; targeted, time-boxed retention will.",
    coachLead: "Tie the claim to a named security function, not IT in general.",
    coachBody: "This covers keeping systems and data secure — logging, intrusion detection, incident investigation. Say which function relies on it.",
    goodAnswer: "'Authentication logs kept for intrusion investigation' — a specific function with a clear need for the data.",
    commonMistake: "Claiming all server logs as security processing when some feed product analytics. Mixed flows need the security slice named separately.",
  },

  exc_debugging: {
    fieldLabel: "Business purpose: Debugging to identify and repair errors",
    citation: "Cal. Civ. Code § 1798.140(e)(3)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Debugging to identify and repair errors that impair existing intended functionality is a permitted business purpose. It does not authorize using debug data for product development, analytics, or model training, and it does not remove a § 7150 trigger when one applies.",
    regulationText: "Debugging to identify and repair errors that impair existing intended functionality.",
    coachLead: "Debugging means finding and fixing errors — nothing more.",
    coachBody: "The claim covers restoring intended functionality. Work that improves or develops features is a different purpose.",
    goodAnswer: "'Crash reports kept 30 days to reproduce and fix defects' qualifies. 'Session replays reviewed for UX improvements' doesn't.",
    commonMistake: "Stretching debugging to cover product improvement. Fixing errors and building features are different purposes.",
  },

  exc_transient_use: {
    fieldLabel: "Business purpose: Transient / short-term use",
    citation: "Cal. Civ. Code § 1798.140(e)(4)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Short-term, transient use — including non-personalized advertising shown as part of a consumer's current interaction — where the personal information is not disclosed to another third party and is not used to build a profile or otherwise alter the consumer's experience outside that current interaction. Strict conditions; rarely satisfied for tracked sessions.",
    regulationText: "Short-term, transient use, including, but not limited to, nonpersonalized advertising shown as part of a consumer's current interaction with the business, provided that the consumer's personal information is not disclosed to another third party and is not used to build a profile about the consumer or otherwise alter the consumer's experience outside the current interaction with the business.",
    enforcementNote: "If any of (a) disclosure to a third party, (b) profile building, or (c) cross-session experience changes occurs, the transient-use carve-out is lost.",
    coachLead: "Claim this only if the data is used once and kept nowhere.",
    coachBody: "Transient use means no disclosure to third parties, no profiling, and no effect beyond the current interaction. If the data lands anywhere, the claim fails.",
    goodAnswer: "'Real-time spell-check of a form entry, discarded on submit' — used in the moment, stored nowhere, profiles no one.",
    commonMistake: "Claiming transient use for data that passes through briefly but lands in a log or a model. Persistence anywhere defeats the claim.",
  },

  exc_internal_research: {
    fieldLabel: "Business purpose: Internal research for technological development",
    // Doc 261-review (2026-09-15, LEGAL 03): (e)(7), matching the engine's
    // pinpoint registry (report-contracts/risk-exceptions.ts); (e)(8) is the
    // quality-and-safety purpose.
    citation: "Cal. Civ. Code § 1798.140(e)(7)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Undertaking internal research for technological development and demonstration is an enumerated business purpose. Note: it does not remove a risk-assessment trigger. If the research trains ADMT for a significant decision or the other purposes listed in § 7150(b)(6), that trigger applies on its own terms; answer the training question (q18b) on the facts.",
    regulationText: "Undertaking internal research for technological development and demonstration.",
    coachLead: "The research must be internal, technological, and true to the collection context.",
    coachBody: "This covers internal research for technological development and demonstration. Check that the use fits the context the consumer gave the data in.",
    goodAnswer: "'De-identified transaction samples used to test a new fraud model' — internal, technological, and compatible with why the data was collected.",
    commonMistake: "Calling marketing analysis internal research. Audience research serves promotion, not technology development.",
  },

  exc_employment_context: {
    fieldLabel: "Exemption: Employment-context processing",
    citation: "No current statutory exemption (former § 1798.145(m) inoperative since January 1, 2023) — additional information is required before relying on this exemption",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.145.",
    plainSummary: "The CCPA's employee/applicant/contractor exemption (former § 1798.145(m)) is inoperative since January 1, 2023. HR, applicant, and contractor personal information is now fully in scope of the CCPA, and § 1798.145(o) covers commercial credit reporting, not employment. There is no current statutory exemption for employment-context processing — any reliance on one requires additional statutory basis.",
    regulationText: "This title shall not apply to personal information collected by a business about a natural person in the course of the natural person acting as a job applicant to, an employee of, owner of, director of, officer of, medical staff member of, or contractor of that business to the extent that the natural person's personal information is collected and used by the business solely within the context of having an emergency contact on file for the natural person, or administering specified benefits.",
    enforcementNote: "Common error: treating all HR data as exempt. Post-AB 1184 / AB 1281 sunset, employee and applicant data are subject to the full CCPA, including risk assessments where § 7150 triggers apply (e.g., ADMT in hiring).",
    coachLead: "Check this exemption's current status before relying on it.",
    coachBody: "The claim needs two things: processing genuinely inside the HR relationship, and an exemption still in force at its claimed scope. Say which employment processing it covers.",
    goodAnswer: "'Payroll and benefits administration for California employees' — clearly employment-context, claimed after checking the current statutory scope.",
    commonMistake: "Assuming everything touching employees is exempt. The exemption has narrowed over the years, and behavior-profiling workplace monitoring tests its edge.",
  },

  exc_legal_compliance: {
    fieldLabel: "Exemption: Compliance with a legal obligation",
    citation: "Cal. Civ. Code § 1798.145(a)(1)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.145.",
    plainSummary: "The CCPA does not restrict a business's ability to comply with federal, state, or local laws, or to comply with a court order or subpoena. This is a narrow carve-out for the specific compelled disclosure — it does NOT exempt the underlying processing activity (e.g., the AML monitoring program itself) from a risk assessment when a § 7150 trigger applies.",
    regulationText: "The obligations imposed on businesses by this title shall not restrict a business's ability to: (1) Comply with federal, state, or local laws or comply with a court order or subpoena to provide information.",
    coachLead: "Name the law that requires the processing.",
    coachBody: "The claim covers processing that a statute, regulation, or order requires. It needs an obligation you can cite — not general caution.",
    goodAnswer: "'Transaction records kept seven years under federal tax rules' — a named obligation with a defined scope.",
    commonMistake: "Citing 'compliance' in general, or industry best practice. Best practice is not a legal obligation.",
  },

  exc_consumer_request: {
    fieldLabel: "Performing a service the consumer requested",
    // Doc 261-review (2026-09-15, LEGAL 04): this card had cited (e)(1), the
    // advertising-audit purpose, and quoted the (e)(5) services text under it.
    // The engine's pinpoint registry already resolves the card to the
    // deletion-request exception in § 1798.105(d)(1) — the provision that
    // actually turns on what the consumer requested — so the rail now matches
    // the report. The prose below is a labelled summary, not a quotation.
    citation: "Cal. Civ. Code § 1798.105(d)(1)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.105.",
    plainSummary: "Section 1798.105(d)(1) is the deletion-request exception for information a business needs to complete the transaction for which it was collected, to provide a good or service the consumer requested or reasonably anticipated in an ongoing relationship, or otherwise to perform its contract with the consumer. Claiming it here records that reliance; it does not remove a § 7150 risk-assessment trigger.",
    regulationText: "Summary (not the statutory text): under § 1798.105(d)(1) a business is not required to delete personal information it needs to complete the transaction for which it was collected, to provide a good or service the consumer requested or reasonably anticipated within an ongoing business relationship, or otherwise to perform a contract between the business and the consumer.",
    coachLead: "The consumer must have asked for the specific service.",
    coachBody: "This covers performing what the consumer requested. Uses that serve your wider goals around that service — upsell, retention models — are different purposes.",
    goodAnswer: "'Using a shipping address to deliver the order' qualifies. 'Using it to model neighbourhood affluence' doesn't — same field, different purpose.",
    commonMistake: "Sweeping every use of order data under 'providing the service'. The consumer asked for delivery, not analytics.",
  },

  // TURN 1d (2026-08-26, fleet intake audit) — this field is now a direct
  // Yes/No on the § 7150(b)(4) element only; sensitive-location coaching
  // lives entirely on the sensitive_location_basis entry.
  q5b_profiling: {
    fieldLabel: "Inference from systematic observation (work or education context)",
    citation: "11 CCR § 7150(b)(4)",
    citationUrl: CPPA_URL,
    plainSummary: "A risk assessment is independently required where a business uses automated processing to infer or extrapolate a consumer's characteristics — intelligence, ability, aptitude, performance at work, economic situation, health, preferences, reliability, predispositions, behavior, or movements — based on systematic observation of that consumer acting as an educational-program applicant, job applicant, student, employee, or independent contractor. This is separate from selling/sharing, ADMT use, and the sensitive-location trigger.",
    regulationText: "Using automated processing to infer or extrapolate a consumer's intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, location, or movements, based upon systematic observation of that consumer when they are acting in their capacity as an educational program applicant, job applicant, student, employee, or independent contractor for the business.",
    relatedCitations: [
      { citation: "11 CCR § 7001(ii)", label: "'Profiling' definition" },
      { citation: "11 CCR § 7001", label: "'Systematic observation' definition" },
      { citation: "11 CCR § 7150(b)(5)", label: "Sensitive-location inference (separate trigger)" },
    ],
    coachLead: "Answer \"Yes\" only where the observation itself feeds an inference about the person — bare monitoring with nothing derived from it is not this trigger.",
    coachBody: "Check two things: whether the people observed are applicants, students, employees, or independent contractors, and whether the automated processing derives a characteristic FROM the observation — a productivity score, a reliability rating, a fatigue or health flag, a behavioral profile. Cameras, sensors, keystroke analytics, and location tracking are observation methods; the trigger fires when something about the person is inferred from them.",
    goodAnswer: "A logistics company scores driver reliability from continuous telematics observation — that is a yes. The same company keeping raw clock-in/out logs purely as attendance records, with nothing derived from them, is a no.",
    commonMistake: "Answering no because the pipeline anonymises at the end, or answering yes for bare record-keeping. The trigger turns on whether a characteristic is inferred from the observation — not on what the vendor calls the tool, and not on monitoring that derives nothing.",
  },

  q15b_under16: {
    fieldLabel: "Actual knowledge of under-16 processing",
    citation: "11 CCR § 7001(bbb)",
    citationUrl: CPPA_URL,
    plainSummary: "The 2026 regulations make all personal information of a consumer under 16 sensitive personal information where the business has actual knowledge of the consumer's age. Requesting age, or willfully disregarding it, is treated as actual knowledge. Processing under-16 data therefore engages the sensitive-PI risk-assessment trigger.",
    regulationText: "'Sensitive personal information' includes the personal information of consumers that the business has actual knowledge are less than 16 years of age. A business that willfully disregards the consumer's age shall be deemed to have had actual knowledge of the consumer's age.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ae)", label: "Sensitive PI definition" },
      { citation: "11 CCR § 7070", label: "Consumers under 13" },
    ],
    coachLead: "Actual knowledge includes what your own data shows.",
    coachBody: "Check age fields, birthdates, school segments, and products aimed at minors. If the signal is in your systems, looking away doesn't erase it.",
    goodAnswer: "A gaming platform's age field shows 14-year-olds registered. It answers yes even though it never markets to minors — the knowledge sits in its own database.",
    commonMistake: "Answering no because the terms say users must be 16+. A terms clause is not knowledge of your actual users.",
  },

  // DOC 157 (2026-09-03, model-vs-law build) — citation corrected to
  // § 7150(b)(6) (the entry cited (b)(5), which is the sensitive-location
  // trigger) and regulationText replaced with the ADOPTED text verbatim
  // (the prior text was a draft-era paraphrase: "capable of being used").
  // Verbatim source: cppa_authorities row "11 CCR § 7150" full_text.
  q18b_admt_training: {
    fieldLabel: "Training automated decisionmaking or recognition technology",
    citation: "11 CCR § 7150(b)(6)",
    citationUrl: CPPA_URL,
    plainSummary: "Processing personal information the business intends to use to train ADMT for a significant decision, or to train facial-recognition, emotion-recognition, or other technology that verifies a consumer's identity or performs physical or biological identification or profiling, independently requires a risk assessment. \"Intends to use\" reaches a business that is using, plans to use, permits or plans to permit others to use, or advertises or markets (or plans to) the use of the technology — so the trigger applies even if the trained system is never deployed against the business's own consumers.",
    regulationText: "“(6) Processing the personal information of consumers, which the business intends to use to train an ADMT for a significant decision concerning a consumer; or train a facial-recognition, emotion-recognition, or other technology that verifies a consumer’s identity, or conducts physical or biological identification or profiling of a consumer. For purposes of this paragraph, “intends to use” means the business is using, plans to use, permits others to use, plans to permit others to use, is advertising or marketing the use of, or plans to advertise or market the use of.”",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(3)", label: "Using ADMT for significant decisions" },
      { citation: "11 CCR § 7001(e)", label: "'ADMT' definition" },
      { citation: "11 CCR § 7001(fff)", label: "'Train' definition" },
      { citation: "11 CCR § 7001(ee)", label: "'Physical or biological identification or profiling' definition" },
    ],
    coachLead: "The trigger is training the technology — using it is a separate question, and letting others train on your data counts.",
    coachBody: "Check three things: whether consumer data trains a model at all (adjusting parameters, improving the learning algorithm, or iterating the datasets fed in); whether that model is ADMT for a significant decision, or an identity-verification, facial-, emotion-, or physical/biological identification or profiling technology; and whether you use, plan to use, permit others to use, or market the trained model. Vendor training on data you permit them to use counts.",
    goodAnswer: "A retailer's vendor fine-tunes a detection model on the retailer's CCTV footage. That is a yes — the trigger fires on the data use, wherever the model lives. A bank that licenses its customer data to a partner building a credit-scoring model also answers yes: it permits another to use the data for training.",
    commonMistake: "Answering only for models you deploy, or only for biometric models. Feeding consumer data into anyone's training pipeline for a significant-decision ADMT or an identity-verification technology is the trigger.",
  },

  // DOC 157 (2026-09-03, model-vs-law build) — the categorical § 7001(ddd)
  // answer (which kind of decision the ADMT makes). Verbatim source:
  // cppa_authorities row "11 CCR § 7001" full_text, subdivision (ddd).
  q19a_decision_categories: {
    fieldLabel: "Which kind of decision the automated decisionmaking technology makes",
    citation: "11 CCR § 7001(ddd)",
    citationUrl: CPPA_URL,
    plainSummary: "§ 7150(b)(3) applies when ADMT is used for a \"significant decision\" — a defined term with seven categories. The regulation also carries two exclusions the assessment must apply: a housing decision based solely on availability, vacancy, or receipt of payment is not a significant decision ((ddd)(2)), and advertising to a consumer is not a significant decision ((ddd)(6)). Your categorical answer here, not the free-text description, is what the assessment reads for the trigger; the description is cross-checked against it.",
    regulationText: "“(ddd) “Significant decision” means a decision that results in the provision or denial of financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services. For purposes of this definition: (1) “Financial or lending services” means the extension of credit or a loan, transmitting or exchanging funds, the provision of deposit or checking accounts, check cashing, or installment payment plans. (2) “Housing” means any building, structure, or portion thereof that is used or occupied as, or designed, arranged, or intended to be used or occupied as, a home, residence, or sleeping place by one or more consumers including for permanent or temporary occupancy. The use of ADMT that provides or denies housing to a consumer based solely on the availability or vacancy of the housing or the successful receipt of payment for housing from the consumer is not making a significant decision. (3) “Education enrollment or opportunities” means: (A) Admission or acceptance into academic or vocational programs; (B) Educational credentials (e.g., a degree, diploma, or certificate); and (C) Suspension and expulsion. (4) “Employment or independent contracting opportunities or compensation” means: (A) Hiring; (B) Allocation or assignment of work for employees; or salary, hourly or per-assignment compensation, incentive compensation such as a bonus, or another benefit (“allocation/assignment of work and compensation”); (C) Promotion; and (D) Demotion, suspension, and termination. (5) “Healthcare services” means services related to the diagnosis, prevention, or treatment of human disease or impairment, or the assessment or care of an individual's health. (6) Significant decision does not include advertising to a consumer.”",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(3)", label: "Risk assessment trigger — ADMT for a significant decision" },
      { citation: "11 CCR § 7001(e)", label: "'ADMT' definition" },
      { citation: "11 CCR § 7152(a)(3)(G)", label: "ADMT logic and output record" },
    ],
    coachLead: "Name what the decision provides or denies — not what the model is called or what it predicts.",
    coachBody: "Trace the output to the consumer's outcome. Ask what the person gets or is refused because of it: a loan, a lease, a place in a program, a job or a shift, a pay rate, a promotion, a termination, a treatment. Select every category that outcome falls in. If the output only changes which advertisement a person sees, select \"Advertising only\". If the outcome is none of the seven, select \"None of these categories\" — and describe the actual decision in the system description so the two can be read together.",
    goodAnswer: "A scoring model ranks rental applicants and an agent approves only the top tier. The outcome is a lease granted or refused — that is Housing. Because the score considers income and tenancy history, the housing decision is not based solely on availability or payment, so the follow-up is answered \"No\".",
    commonMistake: "Selecting the category the model's inputs come from (\"financial data\") rather than the outcome it drives, or selecting \"Advertising only\" for a system that also gates eligibility for a product. The category is the provision or denial the consumer experiences.",
  },

  // DOC 157 (2026-09-03) — the material-change question had no rail entry.
  // Verbatim source: cppa_authorities row "11 CCR § 7155" full_text.
  material_change_since_prior: {
    fieldLabel: "Material change since the last assessment",
    citation: "11 CCR § 7155(a)(3)",
    citationUrl: CPPA_URL,
    plainSummary: "A risk assessment must be updated whenever there is a material change relating to the processing activity, no later than 45 calendar days after the change. The regulation defines the test: the change creates new negative impacts, increases the magnitude or likelihood of previously identified ones, or diminishes the effectiveness of the safeguards.",
    regulationText: "“(3) Notwithstanding subsection (a)(2) of this section, a business must update a risk assessment whenever there is a material change relating to the processing activity, as soon as feasibly possible, but no later than 45 calendar days from the date of the material change. A change relating to the processing activity is material if it creates new negative impacts or increases the magnitude or likelihood of previously identified negative impacts as set forth in section 7152, subsection (a)(5), or diminishes the effectiveness of the safeguards as set forth in section 7152, subsection (a)(6). Material changes may include, for example, changes to the purpose of the processing; the minimum personal information necessary to achieve the purpose of the processing; or the risks to consumers’ privacy raised by consumers (e.g., numerous consumers complain to a business about the risks that the business’s processing poses to their privacy).”",
    relatedCitations: [
      { citation: "11 CCR § 7155(a)(2)", label: "Three-year review and update" },
      { citation: "11 CCR § 7152(a)(5)", label: "Negative impacts" },
      { citation: "11 CCR § 7152(a)(6)", label: "Safeguards" },
    ],
    coachLead: "Apply the three-part test to what actually changed — new harm, bigger or likelier harm, or weaker safeguard.",
    coachBody: "List what changed since the last assessment: data, purpose, recipients, systems, safeguards. For each change ask whether it adds a negative impact, raises the likelihood or magnitude of one already identified, or reduces a safeguard's effectiveness. One yes makes the change material, and the 45-day clock runs from the date of that change.",
    goodAnswer: "\"Yes — 2025-06-01: a new fulfilment partner now receives contact and order data (a new disclosure stage, so a new access-and-disclosure risk).\" The date and the reason the test is met are both stated.",
    commonMistake: "Answering \"No\" because the purpose is unchanged. A new recipient, a new data category, or a retired safeguard is material even when the purpose is the same.",
  },

  // DOC 157 (2026-09-03) — the finalization panel had no rail entry.
  // Verbatim source: cppa_authorities row "11 CCR § 7152" full_text.
  finalization_stage: {
    fieldLabel: "Finalization — the processing decision and the approval record",
    citation: "11 CCR § 7152(a)(7), (a)(9)",
    citationUrl: CPPA_URL,
    plainSummary: "The risk assessment report must document the business's own decision whether it will initiate the processing, and the date the assessment was reviewed and approved with the names and positions of the reviewers and approvers. An individual with authority to participate in the initiation decision must review and approve. The assessment's recommended outcome is EUP's determination; the decision recorded here is the business's, and the report states both and reconciles any difference.",
    regulationText: "“(7) Identify and document in a risk assessment report whether it will initiate the processing subject to the risk assessment.” … “(9) Identify and document in a risk assessment report the date the assessment was reviewed and approved, and the names and positions of the individuals who reviewed or approved the assessment, except for legal counsel who provided legal advice. An individual who has the authority to participate in deciding whether the business will initiate the processing that is the subject of the risk assessment must review and approve the assessment.”",
    relatedCitations: [
      { citation: "11 CCR § 7154", label: "Goal of a risk assessment" },
      { citation: "11 CCR § 7152(a)(8)", label: "Individuals who provided the information" },
      { citation: "11 CCR § 7157(b)(1)", label: "Submission — point of contact (name, phone, email)" },
    ],
    coachLead: "Record the decision the business actually made, after reading the determination — not the outcome it hoped for.",
    coachBody: "The decision is the business's own. Read the § 4.C determination and the § 4.D conditions first, then record initiate, initiate with conditions, or do not initiate (continue / continue with conditions / discontinue for ongoing processing). If the decision departs from the recommendation, the notes should say why; the report will flag the difference. The approver must be someone with authority over the initiation decision.",
    goodAnswer: "\"Initiate with conditions — the two Conditions to Proceed in § 4.D are assigned to the platform team with a 60-day target; approved 2026-09-15 by the VP Operations (authority confirmed).\"",
    commonMistake: "Recording \"Initiate\" while the determination is Do Not Proceed with no note. The report will state the conflict; the notes are where the business explains its reasoning.",
  },

  i1b_min_pi: {
    fieldLabel: "Minimum PI necessary",
    citation: "11 CCR § 7152(a)(2)",
    citationUrl: CPPA_URL,
    plainSummary: "The risk assessment must identify the minimum personal information necessary to achieve the processing purpose. This reflects the CCPA's data-minimisation requirement: a business may only collect and process what is reasonably necessary and proportionate to the disclosed purpose.",
    regulationText: "The categories of personal information processed, including… the minimum personal information that is necessary to achieve the purpose identified in subsection (a)(1).",
    coachLead: "List the categories this purpose actually requires — and stop there.",
    coachBody:
      "Name each category of personal information the stated purpose needs. If a category is collected but not needed for THIS purpose, it belongs in a different assessment, not this list.",
    goodAnswer:
      "\u201CR\u00E9sum\u00E9 text, work history, education records. Not collected for this purpose: references, social profiles.\u201D — what's in, and explicitly what's out.",
    commonMistake:
      "Listing everything the company collects. Minimum necessary is tested against the single stated purpose, not the whole data estate.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.100(c)", label: "Reasonably necessary & proportionate" },
      { citation: "11 CCR § 7002", label: "Restrictions on collection and use" },
    ],
  },

  i4b_sources: {
    fieldLabel: "Sources of the personal information",
    citation: "11 CCR § 7152(a)(3)",
    citationUrl: CPPA_URL,
    plainSummary: "The operational elements of the processing must identify the sources of the personal information — for example collected directly from the consumer, passively observed, generated or inferred by the business, or obtained from third parties such as data brokers, advertising partners, or affiliates.",
    regulationText: "The operational elements of the processing, including… the sources of the personal information and the business's planned method for collecting, using, disclosing, retaining, or otherwise processing the personal information.",
    coachLead: "Name each source and how the data arrives.",
    coachBody: "For every category, say where it comes from — the consumer directly, a named class of third party, a public source, or your own systems — and the mechanism (form, SDK, purchase, inference).",
    goodAnswer: "\u201CContact data from the signup form; device signals from our mobile SDK; prior-tenancy records purchased from a screening bureau.\u201D — each source named with its channel.",
    commonMistake: "Listing the categories again instead of their origins. § 7152(a)(3) asks where the information comes from, not what it is.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)(E)", label: "Disclosures to consumers" },
      { citation: "11 CCR § 7152(a)(3)(F)", label: "Recipients of the PI" },
    ],
  },

  i6_recipients: {
    fieldLabel: "Recipients of the personal information",
    citation: "11 CCR § 7152(a)(3)(F)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must identify the recipients of the personal information and the purpose of each disclosure. The recipient's category matters: a service provider or contractor is bound by contract to the business's purposes, whereas disclosure to a third party for its own use is a sale or share that carries opt-out and additional assessment obligations.",
    regulationText: "The operational elements of the processing, including… the names or categories of the recipients to whom the business discloses or makes available the personal information, and the purpose for which the personal information is disclosed or made available.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ah)", label: "'Share' definition" },
      { citation: "11 CCR § 7051", label: "Service provider / contractor contracts" },
    ],
    coachLead: "Name each recipient with its legal role.",
    coachBody: "For every disclosure, say who gets the data and whether they are a service provider, contractor, or third party. The role decides whether the disclosure is a sale or share.",
    goodAnswer: "'Cloud host (service provider); fraud-scoring vendor (service provider under contract); ad platform (third party)' — each recipient, each role.",
    commonMistake: "Listing vendors without roles. 'A cloud host and some marketing partners' gives the sale-or-share analysis nothing to work with.",
  },

  impact_benefits: {
    fieldLabel: "Benefits of the processing",
    citation: "11 CCR § 7152(a)(4)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must identify the benefits of the processing to the business, the consumer, other stakeholders, and the public, as applicable. Benefits must be described specifically — generic descriptions are not permitted — and are weighed against the negative impacts to reach the risk/benefit determination.",
    regulationText: "The benefits resulting from the processing to the business, the consumer, other stakeholders, and the public, as applicable. A business shall not describe the benefits in generic terms.",
    coachLead: "Separate who gains what — the business, the consumer, others.",
    coachBody: "§ 7152(a)(4) weighs benefits by beneficiary. State each group's concrete gain separately, with the mechanism that produces it; a merged everyone-wins paragraph weighs nothing.",
    goodAnswer: "\u201CBusiness: fewer fraudulent signups reach onboarding; consumers: legitimate applications clear same-day; other users: fewer scam listings surface.\u201D — one concrete gain per beneficiary, each with its mechanism.",
    commonMistake: "Restating the purpose as the benefit. The purpose says what the processing does; this section says what good comes of it, and for whom.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(5)", label: "Negative impacts" },
      { citation: "11 CCR § 7154", label: "Goal of a risk assessment" },
    ],
  },

  impact_safeguards: {
    fieldLabel: "Safeguards for the processing",
    citation: "11 CCR § 7152(a)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must identify the safeguards the business plans to implement to address the negative impacts of the processing. The regulations give examples including encryption, access controls, network monitoring, privacy-enhancing technologies, de-identification, and policies and training.",
    regulationText: "The safeguards that the business plans to implement to address the negative impacts… Examples of safeguards include, but are not limited to, encryption; the segmentation of personal information; access controls; privacy-enhancing technologies; and policies, procedures, and training.",
    coachLead: "Name each safeguard and the specific harm it blunts.",
    coachBody: "List the concrete measures — technical, organisational, contractual — and pair each with the negative impact it addresses. An unpaired safeguard list reads as boilerplate and maps to nothing.",
    goodAnswer: "\u201CScores expire after 90 days (limits stale-data decisions); a reviewer confirms every adverse outcome (catches model error); access is limited to three named analysts (limits exposure).\u201D — each control tied to the harm it reduces.",
    commonMistake: "Citing company-level certifications as safeguards for this processing. The section asks what protects these consumers from these impacts, not how the company is audited.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(5)", label: "Negative impacts addressed" },
      { citation: "11 CCR § 7123", label: "Cybersecurity audit safeguards" },
    ],
  },

  impact_harm_causes: {
    fieldLabel: "Negative impacts — sources and causes",
    citation: "11 CCR § 7152(a)(5)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must identify the negative impacts to consumers' privacy associated with the processing, including the sources and causes of those impacts. The regulations enumerate examples: unauthorised access, destruction, use, modification or disclosure; loss of availability; unlawful discrimination; impairment of control; coercion or dark patterns; and economic, physical, reputational, and psychological harms.",
    regulationText: "The negative impacts to consumers' privacy associated with the processing, including the sources and causes of the negative impacts. Negative impacts include, but are not limited to: unauthorized access, destruction, use, modification, or disclosure of personal information; unlawful discrimination; impairment of consumers' control over their personal information; economic, physical, psychological, or reputational harms; and coercion or the use of dark patterns.",
    coachLead: "Trace each negative impact to its source in the processing.",
    coachBody: "For every harm identified, state what in the processing could produce it — the data, the operation, or the failure mode — so the safeguard mapping has something to attach to.",
    goodAnswer: "\u201CWrongful denial from stale bureau data; exposure of address history if the screening vendor is breached.\u201D — each harm with the mechanism that would cause it.",
    commonMistake: "Listing harm categories without causes. The § 7152(a)(5) analysis runs cause → impact → safeguard; a bare category breaks the chain.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(4)", label: "Benefits weighed against impacts" },
      { citation: "11 CCR § 7002", label: "Dark patterns / restrictions on use" },
    ],
  },

  // TURN 1b RETROFIT — intake-rail parity for the two TURN 1b fields.
  // Corpus consulted: cppa_authorities row citation="11 CCR § 7150"
  // (id 419236d1-3d51-4839-9b17-193391bbda24); regulationText is the verbatim
  // subsection (b)(5) extracted from that row's full_text. This adapts (does
  // not duplicate) q18b_admt_training's § 7150(b)(5) anchor — that entry is
  // scoped to the training-data trigger; this entry is scoped to the
  // sensitive-location trigger the intake field records.
  // FSOR commentary consulted: cppa_fsor_commentary row
  // id 30d841cf-02af-4aca-aae3-51a08aab7820 (agency response on § 7150(b)(5)
  // sensitive-location scope).
  // PN-CORPUS-L-RISK-1 (2026-08-22) — § 7150(b)(2)(A) personnel carve-out.
  // Verbatim from the approved provision_texts cppa-7150 excerpt; pinned by
  // src/registry/__tests__/risk-admt-rail-corpus-pin.test.ts.
  q15d_hr_carveout: {
    fieldLabel: "Personnel carve-out for sensitive PI",
    citation: "11 CCR § 7150(b)(2)(A)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Sensitive PI of employees or independent contractors processed solely and specifically for routine personnel administration — compensation, employment authorization, benefits, legally required reasonable accommodation, or legally required wage reporting — is exempt from the § 7150(b)(2) risk-assessment trigger. Any other sensitive-PI processing remains subject to it.",
    regulationText:
      "“A business that processes the sensitive personal information of its employees or independent contractors solely and specifically for purposes of administering compensation payments, determining and storing employment authorization, administering employment benefits, providing reasonable accommodation as required by law, or wage reporting as required by law, is not required to conduct a risk assessment for the processing of sensitive personal information for these purposes. Any other processing of consumers’ sensitive personal information is subject to the risk-assessment requirements set forth in this Article.”",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(2)", label: "Sensitive-PI risk-assessment trigger" },
      { citation: "Cal. Civ. Code § 1798.140(ae)", label: "Sensitive personal information definition" },
    ],
    coachLead:
      "\"Solely and specifically\" is the whole test — every use of the sensitive PI must fall inside the five listed personnel purposes.",
    coachBody:
      "Check two things: whose sensitive PI this activity touches (only employees/contractors, or also consumers?), and every purpose it serves. One purpose outside the five listed — analytics, monitoring, profiling, anything customer-facing — and the carve-out does not apply.",
    goodAnswer:
      "A payroll activity processing only employee bank details and SSNs to run compensation and wage reporting selects \"Yes — solely\". The same data also feeding a workforce-analytics dashboard selects \"No\" — the analytics use is outside the five purposes.",
    commonMistake:
      "Claiming the carve-out because the data belongs to employees. Ownership isn't the test; the exclusive, listed personnel purpose is.",
  },

  sensitive_location_basis: {
    fieldLabel: "Sensitive-location inference",
    citation: "11 CCR § 7150(b)(5)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Using automated processing to infer or extrapolate characteristics or behaviour from a consumer's presence in a sensitive location is an independent trigger for a risk assessment — separate from processing sensitive personal information generally. A narrow carve-out exists for using personal information solely to deliver goods to, or provide transportation for, that consumer at a sensitive location.",
    regulationText:
      "(5) Using automated processing to infer or extrapolate a consumer's intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, or movements, based upon that consumer's presence in a sensitive location. \"Infer or extrapolate\" does not include a business using a consumer's personal information solely to deliver goods to, or provide transportation for, that consumer at a sensitive location.",
    enforcementNote:
      "FSOR commentary on § 7150(b)(5) (row 30d841cf…) records the Agency's response to comments challenging its authority to regulate 'sensitive locations' — the Agency retained the trigger and treats presence-based inference as a distinct risk from sensitive-PI processing.",
    coachLead: "Answer \"Yes\" only where the processing itself draws a conclusion about the consumer FROM their detected presence at the location — not because your business operates at, or handles data sourced from, a location of this type.",
    coachBody:
      "Check whether presence at the location itself feeds an inference or extrapolation about the consumer. Delivery-only or transportation-only uses at the same location are carved out — the carve-out attaches to the use, not to the venue. A business that IS the sensitive-location provider (e.g. a hospital, or a vendor scoring data the hospital already collected as part of care) is not thereby inferring anything FROM a consumer's presence — it is simply providing or supporting the service.",
    goodAnswer:
      "A fitness app that flags 'in reproductive-health facility' events to shape wellness content answers \"Yes\"; a grocery courier app that only uses the same address to route the order, or a healthcare analytics vendor scoring clinical records a hospital already collected, answers \"No\".",
    commonMistake:
      "Answering \"Yes\" merely because the business's data or sector is health-, school-, or worship-related. The trigger requires an actual inference drawn FROM detected presence — not merely that the venue or subject matter falls in a sensitive-location category.",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(2)", label: "Processing sensitive PI trigger (contrast)" },
      { citation: "11 CCR § 7150(b)(4)", label: "Systematic-observation trigger (contrast)" },
      { citation: "11 CCR § 7152(a)(3)", label: "Operational elements of the processing" },
    ],
  },

  // Corpus consulted: cppa_authorities row citation="11 CCR § 7152"
  // (id f509e45b-ce32-4564-b1c2-b0553c1751b9); regulationText is the verbatim
  // subsection (a)(3)(E) extracted from that row's full_text. The corpus
  // review found NO direct provision that governs a publicly hosted privacy
  // policy URL as a risk-assessment input — the nearest anchor is the
  // "disclosures made to the consumer" operational element under
  // § 7152(a)(3)(E). FSOR commentary rows on § 7152(a)(2)–(3) (ids
  // 44ae985c-5bb4-4336-91a7-1f17e2424456, 61609bb4-42bb-4226-b682-0c245471d265,
  // 707c0cef-ae71-46d3-8850-db93d5f8e5fb) were reviewed for a notice-
  // consistency discussion tied to a public policy URL and none was found.
  // The related-CCPA anchor Cal. Civ. Code § 1798.130(a)(5) (which requires
  // the privacy-policy disclosures themselves) is linked below as the
  // ordinary source of the URL's content, not as authority for this field.
  public_privacy_policy_url: {
    fieldLabel: "Public privacy-policy URL",
    citation: "11 CCR § 7152(a)(3)(E)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The risk assessment must identify what disclosures the business has made or plans to make to the consumer about the processing, and how those disclosures were or will be made. The URL you record here anchors the disclosure the assessment references — it is not itself a trigger and not itself a required element.",
    regulationText:
      "(E) What disclosures the business has made or plans to make to the consumer about the processing of their personal information and how these disclosures were or will be made (e.g., via a just-in-time notice).",
    coachLead: "Record the URL of the disclosure the assessment actually references — leave blank if none is in place.",
    coachBody:
      "The value is an anchor for the disclosure element, not a certification that the policy is compliant. If the processing is disclosed only in a just-in-time notice, leave the URL blank and describe that in the disclosure narrative.",
    goodAnswer:
      "A staffing-tech company records https://example.com/privacy because that is the notice its intake questionnaire references; a payroll platform whose only disclosure is a just-in-time banner leaves the URL blank.",
    commonMistake:
      "Recording a URL for a policy that does not describe the processing being assessed. The § 7152(a)(3)(E) element is what disclosure has been made about THIS processing — an unrelated general policy fails that element.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.130(a)(5)", label: "Statutory source of the privacy-policy disclosures themselves" },
      { citation: "11 CCR § 7152(a)(3)", label: "Operational elements of the processing" },
    ],
  },

  // UPGRADE-2 (ITEM 5) — rail entries for the three new § 7152(a) intake
  // fields. Every regulationText below is a byte-exact substring of corpus
  // row cppa-7152 (provision_texts.verbatim_excerpt, status approved).
  a4_benefit_supporting_fact: {
    fieldLabel: "Record fact supporting each stated benefit",
    citation: "11 CCR \u00a7 7152(a)(4)",
    citationUrl: CPPA_URL,
    plainSummary: "The benefits of the processing are weighed against its negative impacts. A benefit that rests on nothing in the record cannot carry weight in that weighing, so each stated benefit is paired with the fact that shows it.",
    regulationText: "(4) Identify the benefits to the business, the consumer, other stakeholders,\nand the public from the processing of the personal information, as\napplicable. The benefits must not be identified in generic terms, such as\n\u201Cimproving our service.\u201D",
    coachLead: "Point at something already in the record, not at the benefit restated.",
    coachBody: "Name the artefact, measurement, or decision the benefit shows up in: a report that cites the figures, a decision record that used them, a measured change after the processing began. If nothing in the record shows the benefit, leave this blank rather than paraphrasing the claim \u2014 the weighing will reserve, which is the accurate outcome.",
    goodAnswer: "\u201CThe quarterly rostering decision record cites the queue-volume figures this processing produces, and shifts were re-allocated on that basis in the last two cycles.\u201D",
    commonMistake: "Repeating the benefit in different words. A restatement is still an assertion; the field asks what makes the assertion checkable.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7152(a)", label: "Benefits weighed against negative impacts" },
    ],
  },

  a5_harm_pathway_triple: {
    fieldLabel: "Data involved, actor, and pathway for each impact",
    citation: "11 CCR \u00a7 7152(a)(5)",
    citationUrl: CPPA_URL,
    plainSummary: "For each negative impact, the assessment must identify its sources and causes. Recording the data involved, the actor who acts on it, and the route between them makes the source-and-cause statement traceable instead of conclusory.",
    regulationText: "negative impacts to consumers\u2019 privacy associated with the\nprocessing. The business must identify the sources and causes of these\nnegative impacts.",
    coachLead: "Three separate facts: which data, which actor, which route.",
    coachBody: "Write each as its own answer. The data field names elements, not categories; the actor names who or what acts; the route names the step in the processing that connects them. Merging the three into one sentence hides whichever one is missing.",
    goodAnswer: "\u201CData: home address history. Actor: the screening vendor\u2019s support team. Pathway: bulk export to a shared drive during dispute handling.\u201D \u2014 three answers, each independently checkable.",
    commonMistake: "Naming the harm again in place of the pathway. The impact category is already recorded above; this asks how it would actually happen.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7152(a)(6)", label: "Safeguards addressing the impact" },
    ],
  },

  a6_residual: {
    fieldLabel: "Residual risk after the safeguard",
    citation: "11 CCR \u00a7 7152(a)(6)",
    citationUrl: CPPA_URL,
    plainSummary: "Safeguards are recorded against the negative impacts they address. Stating what remains after the safeguard is what lets the weighing reach a determination rather than assume the impact is eliminated.",
    regulationText: "(6) Identify and document in a risk assessment report any safeguards that\nthe business plans to implement for the processing, such as safeguards to\naddress the negative impacts identified in subsection (a)(5).",
    coachLead: "State what is still exposed once this safeguard is running.",
    coachBody: "Answer in terms of the same impact, reduced: who is still affected, in what circumstances, and how often. \u201CRisk eliminated\u201D is only accurate if the pathway itself is closed \u2014 if it is, say which step removes it.",
    goodAnswer: "\u201CExport is limited to two named staff, so the exposure narrows to those accounts; a credential compromise still reaches the full address history.\u201D \u2014 the reduction and the remainder, both stated.",
    commonMistake: "Repeating the safeguard in different words. This field is the leftover, not a second description of the control.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7152(a)(5)", label: "Negative impacts" },
      { citation: "11 CCR \u00a7 7154", label: "Goal of a risk assessment" },
    ],
  },

  a8_information_providers: {
    fieldLabel: "Who provided the information in this assessment?",
    citation: "11 CCR \u00a7 7152(a)(8)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must record the individuals who provided the information it relies on, except legal counsel who provided legal advice. This is a separate record from the review-and-approval entry under subsection (a)(9).",
    regulationText: "(8) Identify and document in a risk assessment report the individuals who\nprovided the information for the risk assessment, except for legal counsel\nwho provided legal advice.",
    coachLead: "Name people and positions, not departments.",
    coachBody: "One line per person: name, position, and which part of the record they supplied. A team name cannot be asked a follow-up question, which is what this record exists to enable.",
    goodAnswer: "\u201CR. Alvarez, Staff Data Engineer \u2014 retention and deletion mechanics; T. Okafor, Fraud Operations Manager \u2014 review workflow.\u201D \u2014 attributable, scoped answers.",
    commonMistake: "Including counsel who advised on the legal analysis. Subsection (a)(8) excludes legal counsel who provided legal advice.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7152(a)(9)", label: "Review and approval record" },
    ],
  },

  // RK3-A2 g4 \u2014 PN-RK7 SPI employment-exception facts.
  spi_employment_exception: {
    fieldLabel: "Employment-basis justification for sensitive PI processing",
    citation: "Cal. Civ. Code \u00a7 1798.140(ae); 11 CCR \u00a7 7150(b)(2)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The former \u00a7 1798.145(m) employment exemption expired January 1, 2023. A business that processes sensitive personal information on an employment-contract basis must document the specific facts establishing that the processing is strictly necessary for the employment relationship, not merely useful or convenient.",
    regulationText:
      "Cal. Civ. Code \u00a7 1798.145(m) \u2014 (Inoperative as of January 1, 2023.) The exemption for employees, contractors, job applicants, and emergency contacts that existed under the original CCPA was not renewed in the CPRA. Employee-related sensitive PI processing remains subject to the CPPA regulations. Cal. Civ. Code \u00a7 1798.140(ae) defines sensitive personal information.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7150(b)(2)", label: "Sensitive PI as risk-assessment trigger" },
      { citation: "Cal. Civ. Code \u00a7 1798.140(ae)", label: "Definition of sensitive personal information" },
    ],
    coachLead:
      "State the legal constraint that makes the processing necessary \u2014 not the business convenience. Necessity means the processing cannot be replaced by a less intrusive alternative.",
    coachBody:
      "Answer three questions: What specific sensitive PI is processed? Why is it necessary (identify the law, contractual obligation, or safety requirement that cannot be met without it)? What is the least invasive alternative, and why does the alternative fail? An answer that stops at convenience or efficiency does not establish necessity.",
    goodAnswer:
      '"Biometric time-and-attendance data (fingerprint scans). Necessary to satisfy Cal. Labor Code \u00a7 226 time-record requirements and prevent shift-overlap payroll errors at scale. Non-biometric alternatives (badge swipe, PIN) are subject to buddy-punching fraud at our facility density; a 2024 pilot showed 12% error rate, resulting in $240K payroll discrepancy." Specific PI, legal anchor, tested alternative.',
    commonMistake:
      "Restating that the processing is covered by the employment contract. The contract is the legal basis; this field needs the facts that make the specific processing strictly necessary for that contract.",
  },

  // RK3-A2 g3 \u2014 \u00a7 7153 ADMT-provider risk-assessment trigger.
  admt_section_7153: {
    fieldLabel: "\u00a7 7153 \u2014 ADMT made available to another business",
    citation: "11 CCR \u00a7 7153",
    citationUrl: CPPA_URL,
    // DOC 157 (2026-09-03) — § 7153 stated as adopted: a duty to provide facts
    // to the recipient-business, not a risk-assessment trigger. Verbatim
    // source: cppa_authorities row "11 CCR § 7153" full_text.
    plainSummary:
      "A business that makes ADMT available to another business to make a significant decision must give that recipient-business all the facts it has that the recipient needs to conduct its own risk assessment. The duty applies only to ADMT trained using personal information. These fields record whether the arrangement exists and the training-data and downstream-use facts the provider must be able to hand over.",
    regulationText:
      "“(a) A business that makes ADMT available to another business (“recipient-business”) to make a significant decision as set forth in section 7150, subsection (b)(3), must provide to the recipient-business all facts available to the business that are necessary for the recipient-business to conduct its own risk assessment. (b) The requirements of this section apply only to ADMT trained using personal information.”",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7150(b)(3)", label: "ADMT for significant decisions \u2014 primary trigger" },
      { citation: "11 CCR \u00a7 7152(a)(3)(G)", label: "ADMT operational record" },
    ],
    coachLead:
      "Answer each question about the actual arrangement with the recipient business, not the intended or hoped-for use.",
    coachBody:
      "\"Made available\" includes licensing, API access, and embedding the ADMT in a product the other business uses. If the recipient's use of the ADMT for significant decisions is unknown, record Unknown \u2014 do not record No. \"Significant decision\" carries the \u00a7 7001 definition; when in doubt, record Unknown and flag for legal review.",
    goodAnswer:
      '"Yes \u2014 the ADMT scoring engine is licensed to three downstream lenders. Trained using PI from the recipient: No \u2014 the model was built on our own historical data. Recipient uses for significant decisions: Yes \u2014 the lenders use our scores to approve or deny loan applications." Each element stated separately and attributed.',
    commonMistake:
      "Recording No for downstream use when the recipient's practices are not actually known. Unknown is the accurate answer when you cannot confirm what the other business does with the output.",
  },

  // RK3-A2 g2 \u2014 \u00a7 7152(a)(3)(G)(i)/(ii) ADMT branch extensions.
  // These fields deepen the existing i5_admt entry with operational-role,
  // assumption/limitation, output, output-use, and consumer-effect detail.
  admt_extensions: {
    fieldLabel: "Extended ADMT record \u2014 operational role, assumptions, output, and consumer effect",
    citation: "11 CCR \u00a7 7152(a)(3)(G)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Where the processing involves automated decisionmaking technology, the risk assessment must identify the role ADMT plays in the activity, the assumptions and limitations of the system, what the system outputs, how that output is used, and the effect on consumers. These fields supply that detail alongside the logic summary and human-review record already required by \u00a7 7152(a)(3)(G).",
    regulationText:
      "(G) If the business uses automated decisionmaking technology in the processing: (i) A description of the automated decisionmaking technology, including the role it plays in decisions and the assumptions and limitations of the technology; and (ii) A description of what the automated decisionmaking technology outputs, how those outputs are used, and the effect on consumers.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7150(b)(3)", label: "ADMT for significant decisions \u2014 assessment trigger" },
      { citation: "11 CCR \u00a7 7150(b)(6)", label: "ADMT profiling \u2014 assessment trigger" },
    ],
    coachLead:
      "Separate the five answers: role, assumptions/limitations, output, how the output is used, and consumer effect. Each is a distinct element; merging them hides the one that is missing.",
    coachBody:
      "Role: what the ADMT system does in this activity \u2014 not what it was built to do in general. Assumptions/limitations: the constraints the system carries into every decision, including what data it cannot see. Output: the artefact the system produces (a score, tier, label, flag). Use: what happens to that output in the processing pipeline. Consumer effect: the tangible consequence for the consumer \u2014 approval, denial, price change, content restriction.",
    goodAnswer:
      '"Role: scores each applicant 0\u2013100. Assumptions: assumes stated income is accurate; not calibrated for seasonal workers. Output: numeric score + risk tier. Use: Green = auto-approve, Amber = route to underwriter, Red = auto-decline. Consumer effect: Red-tier consumers receive an adverse action notice and are denied credit." Five answers, each a separate sentence.',
    commonMistake:
      "Describing the ADMT system in marketing terms ('state-of-the-art AI') rather than operational terms. The record needs what the system does to personal information and what the consumer experiences as a result.",
  },

  // RK3-A2 g1 \u2014 \u00a7 RAF 7155 assessment timing and processing status.
  timing_and_status: {
    fieldLabel: "Processing status and assessment timeline",
    citation: "11 CCR \u00a7 7155",
    citationUrl: CPPA_URL,
    plainSummary:
      "The regulation requires that a risk assessment be conducted before processing begins (\u00a7 7155(a)(1)) and updated when the processing changes materially (\u00a7 7155(a)(3)). These fields record whether the assessed processing is planned, ongoing, or discontinued; fix the dates that anchor the Spine 4.3 \u00a7I.A timeline; and capture the date and scope of any material change since the prior assessment.",
    regulationText:
      "\u00a7 7155(a)(1) \u2014 \u201CA business must conduct and document a risk assessment in accordance with the requirements of this Article before initiating any processing activity identified in section 7150, subsection (b).\u201D\n\n\u00a7 7155(a)(3) \u2014 \u201CA business must update and complete a new risk assessment when there is a material change to the processing activity for which the risk assessment was conducted, as defined in section 7001, subsection (m).\u201D",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7155(a)(3)", label: "Material-change update obligation (45 days)" },
      { citation: "11 CCR \u00a7 7156(b)", label: "Existing DPIA mapping" },
    ],
    coachLead:
      "State the status the processing actually has on the date you complete this assessment \u2014 not the intended status. A planned activity that is already live should be marked Ongoing.",
    coachBody:
      "The start date anchors the assessment window. If the processing began before the CPPA regulations took effect, record the actual start date; the report notes it as pre-regulation in-scope processing. For material changes, record the date the changed version of the processing became operational, not the date you learned about it or the date you started this assessment.",
    goodAnswer:
      "\u201COngoing \u2014 started 2024-03-01. Prior assessment: 2024-02-15. Material change: 2025-06-01 \u2014 expanded the recipient list to include a new fulfilment partner, adding a disclosure stage not present in the prior assessment.\u201D Each date is specific and each element is its own sentence.",
    commonMistake:
      "Leaving the start date blank when status is Ongoing. The start date is the anchor for the assessment-window narrative; without it the report cannot close the timeline.",
  },

  // RK3-A3 g1 — harm-category QA tracker (EUP internal, never printed).
  harm_review_status: {
    fieldLabel: "Harm-category review status (internal QA)",
    citation: "11 CCR § 7152(a)(5)",
    citationUrl: CPPA_URL,
    plainSummary:
      `Internal quality tracker. For each of the eight negative-impact categories the form uses — ${HARM_PATHWAY_OPTS.join("; ")} — record whether the category was identified (at least one pathway), considered and found not applicable, or not yet assessed. This field is never printed in the report.`,
    // Doc 261-review (2026-09-15, LEGAL 01): the former text here was a
    // five-category passage presented as a quotation of § 7152(a)(5) while the
    // form implements eight categories with different letters. This is a
    // labelled summary built from the same dictionary the form uses, not a
    // quotation; the operative text lives in the approved corpus.
    regulationText:
      `Summary (not the statutory text): 11 CCR § 7152(a)(5) requires the assessment to identify the negative impacts to consumers associated with the processing. The categories this assessment tracks, in the form's own lettering, are ${HARM_PATHWAY_OPTS.join("; ")}. The list in the regulation is illustrative, not exhaustive.`,
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(6)", label: "Safeguards addressing identified impacts" },
    ],
    coachLead:
      "Use this tracker during the drafting session to confirm every harm category has been considered before closing the assessment.",
    coachBody:
      "Mark each category as Identified (you recorded at least one pathway under it), Considered-none (you reviewed it and concluded no applicable pathways exist for this processing), or Not yet assessed. A category left at Not yet assessed signals an open item. This data is internal only and does not appear in the printed report.",
    goodAnswer:
      "(A) Identified — an unauthorized-access pathway is recorded. (B) Considered-none — the model uses no protected characteristics or proxies, and this was tested. (C) Identified — consumers cannot opt out of the profiling. (D) Considered-none. (E) Identified — an erroneous score can raise the price a consumer pays. (F) Considered-none — the processing cannot cause physical harm. (G) Considered-none. (H) Considered-none.",
    commonMistake:
      "Reading the letters from memory. (B) is unlawful discrimination and (F) is physical harm on this form; dismissing (B) because the processing is 'fully digital' answers the wrong question. Also: leaving every category at Not yet assessed — a complete assessment shows that each category was at least considered.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Doc 262 §9.5 item 5b (2026-09-15) — coaching expansion. The 36 anchored
  // questions below had no statute-rail hook (the "How to answer well" column
  // never appeared for them) and `bought_sold_shared_count` was hooked to an
  // entry that did not exist. Verbatim text is quoted only where the codebase
  // carries a verified row (risk-verified-authorities.ts, admt-verified-
  // authorities.ts, ccpa-1798-140-pin.ts); every other regulationText is a
  // labelled summary, never an invented quotation. Companies are fictional.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Step 1 ────────────────────────────────────────────────────────────────
  entity_name: {
    fieldLabel: "Entity name",
    citation: "11 CCR § 7157(b)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The annual submission to the Agency identifies the business by name. The name entered here is the one the report and the § 7157 worksheet carry.",
    regulationText:
      "§ 7157(b) — “A business must submit to the Agency the following risk assessment information:” (Summary of § 7157(b)(1): the business's name and contact information — verbatim text is not in the verified corpus.)",
    relatedCitations: [
      { citation: "11 CCR § 7157(c)", label: "Who submits — executive management" },
    ],
    coachLead:
      "Give the full legal name, with its suffix, exactly as it appears on formation documents.",
    coachBody:
      "One legal entity per assessment. A trade name or brand goes in the activity description, not here; a parent and a subsidiary are two entities.",
    goodAnswer:
      "“Fernbrook Grocers, Inc.” — the registered name with its suffix. “Fernbrook” alone is a brand, and “Fernbrook Grocers and subsidiaries” names more than one entity.",
    commonMistake:
      "Entering the operating brand or a division name. The worksheet is filed by the legal entity, and a mismatch between this field and the filing is a correction later.",
  },

  secondary_activities: {
    fieldLabel: "Other uses of the same information",
    citation: "11 CCR §§ 7150(a), 7156(a)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Each distinct processing activity is assessed on its own unless it belongs to a comparable set. Listing the other uses of the same information is how the record shows which uses were considered and where this assessment's scope ends.",
    regulationText:
      "§ 7156(a) — “A business may conduct a single risk assessment for a comparable set of processing activities. A ‘comparable set of processing activities’ that can be addressed by a single risk assessment is a set of similar processing activities that present similar risks to consumers' privacy.”",
    relatedCitations: [
      { citation: "11 CCR § 7150(a)", label: "Assessment before initiating the processing" },
    ],
    coachLead:
      "Name each other use in one line: whose information, what is done with it, and what comes out.",
    coachBody:
      "A use with a different purpose, product, or audience is a different activity. The comparison with the primary activity is what the report uses to say whether one assessment covers both.",
    goodAnswer:
      "Fernbrook Grocers, primary activity: birthday coupon mailing. Other use #1 — “Basket analysis for store layout: the same loyalty purchase history is aggregated by store to decide shelf placement.” Same records, different purpose and output, so it is listed as its own use.",
    commonMistake:
      "Listing departments (“marketing also uses it”) rather than uses. The record needs the operation and its purpose so the comparable-set question can be answered from it.",
  },

  rk3d_out_of_scope_confirmation: {
    fieldLabel: "Is the same information processed for anything else?",
    citation: "11 CCR §§ 7150(a), 7152(a)(1)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The assessment covers a stated purpose. This is the closing scope check: whether the same information is also processed for something outside this assessment, so the report can say where its findings stop.",
    regulationText:
      "§ 7152(a)(1) — “Identify and document in a risk assessment report the business's purpose for processing consumers' personal information. The purpose must not be identified or described in generic terms, such as ‘to improve our services’ or for ‘security purposes.’”",
    relatedCitations: [
      { citation: "11 CCR § 7156(a)", label: "Comparable set of processing activities" },
    ],
    coachLead:
      "Answer from the data flow as it runs today, including work done by vendors and other teams on the same records.",
    coachBody:
      "The question is about the information, not the team. If another program reads the same records, that is another activity — say so, and name it in one line. “Unsure” is recorded as an open follow-up, not as the favourable answer.",
    goodAnswer:
      "Harbor & Pine Apartments, tenant-screening assessment: “The application file is also processed for other activities not covered by this assessment — a separate marketing program re-contacts declined applicants about other units.” One line, and the other program is named.",
    commonMistake:
      "Answering for the team's own use only. A service provider's analytics on the same file is still processing of the affected information.",
  },

  rk3d_comparable_processing_status: {
    fieldLabel: "Single activity or comparable set",
    citation: "11 CCR § 7156(a)",
    citationUrl: CPPA_URL,
    plainSummary:
      "One assessment can cover several activities only when they are similar and present similar privacy risks. This answer records which of the two this report is.",
    regulationText:
      "§ 7156(a) — “A business may conduct a single risk assessment for a comparable set of processing activities. A ‘comparable set of processing activities’ that can be addressed by a single risk assessment is a set of similar processing activities that present similar risks to consumers' privacy.”",
    relatedCitations: [
      { citation: "11 CCR § 7150(a)", label: "Assessment before initiating the processing" },
    ],
    coachLead:
      "Decide from the comparison you recorded above: same information, same way, same purpose, same risks.",
    coachBody:
      "For a set, the basis you state is the record — say what is the same across the activities and why the risks are the same. If any one element differs, the report treats the activities as separate.",
    goodAnswer:
      "Larkspur Credit Union: “Set — each of the three branch-based loan pre-screens collects the same application fields through the same form for the same credit decision, with the same recipients.” Every element of similarity is named, so the basis can be checked.",
    commonMistake:
      "Treating activities as a set because they sit in one system or one department. Similar tooling with different purposes or audiences is two activities.",
  },

  rk3d_purpose_specificity_facts: {
    fieldLabel: "What the stated purpose itself identifies",
    citation: "11 CCR § 7152(a)(1)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The purpose has to be specific, not generic. This checklist records which concrete elements the purpose statement above actually names, and the report evaluates the purpose on that record.",
    regulationText:
      "§ 7152(a)(1) — “Identify and document in a risk assessment report the business's purpose for processing consumers' personal information. The purpose must not be identified or described in generic terms, such as ‘to improve our services’ or for ‘security purposes.’”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(2)", label: "Categories of personal information, including the minimum necessary" },
    ],
    coachLead:
      "Re-read your purpose statement and tick only the elements that appear in its words.",
    coachBody:
      "This is a reading test of your own sentence, not a description of what the purpose could cover. If the statement does not name the product, the categories, the consumers, or the outcome, leave that box unticked and, if you wish, go back and add it to the purpose.",
    goodAnswer:
      "Purpose: “Meridian Staffing ranks applicants for warehouse roles using their application answers and work history to shortlist candidates for recruiter review.” Ticked: the operation (ranking for warehouse roles), the categories (application answers, work history), the consumers (applicants), the outcome (a shortlist).",
    commonMistake:
      "Ticking what the team knows rather than what the sentence says. The report quotes the purpose as written; a box ticked without support in the wording is a contradiction on the page.",
  },

  i9_dpia_summary: {
    fieldLabel: "Existing assessment — title, date, and scope",
    citation: "11 CCR § 7156(b)",
    citationUrl: CPPA_URL,
    plainSummary:
      "An assessment prepared for another purpose can be used for this one when it meets § 7152. Identifying the prior document by title, date, and scope lets the report say what is being relied on and what it does not cover.",
    regulationText:
      "§ 7156(b) — “A business may utilize a risk assessment that it has prepared for another purpose to meet the requirements in section 7152, provided that the risk assessment …” (the proviso continues; the verified corpus carries the opening clause).",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)", label: "Required content of a risk assessment" },
    ],
    coachLead:
      "Give the document's title, its date, and the processing it covered, in one line.",
    coachBody:
      "Scope matters more than length: say which activity and which jurisdiction the earlier assessment addressed. The report can then state what it adds to that document rather than restating it.",
    goodAnswer:
      "“Tidewater Clinics — GDPR DPIA, appointment-reminder SMS, approved 14 March 2026; covers the EU patient base only.” Title, date, activity, and the limit of its scope.",
    commonMistake:
      "Writing “DPIA on file.” Without a date and scope the report cannot tell whether the earlier work covers this activity, and treats the reference as unverified.",
  },

  // ── Step 2 ────────────────────────────────────────────────────────────────
  q19: {
    fieldLabel: "Describe the ADMT system and its decisions",
    citation: "11 CCR § 7001(e)",
    citationUrl: CPPA_URL,
    plainSummary:
      "ADMT is defined by what it does with personal information and the decision it replaces or substantially replaces. The description is the record of the system, its inputs, its output, and the decision the output affects.",
    regulationText:
      "§ 7001(e) — “‘Automated decisionmaking technology’ or ‘ADMT’ means any technology that processes personal information and uses computation to replace human decisionmaking or substantially replace human decisionmaking.”",
    relatedCitations: [
      { citation: "11 CCR § 7222(b)(2)", label: "Information about the logic of the ADMT" },
      { citation: "11 CCR § 7150(b)(3)", label: "Using ADMT for a significant decision" },
    ],
    coachLead:
      "Name each system, who operates it, what it takes in, what it puts out, and the decision that output feeds.",
    coachBody:
      "Include vendor-operated systems used on your behalf. A category picked from the suggestions is a start, not the record — the four facts are what the report reads.",
    goodAnswer:
      "Meridian Staffing: “A vendor-hosted screening model (operated by the vendor on our instance) reads application answers and work history and outputs a 1–5 rank; recruiters see only applicants ranked 3 or above, so the rank decides who is reviewed for interview.” System, operator, input, output, decision.",
    commonMistake:
      "Describing the product (“an AI hiring platform”) instead of the system. The report needs the output and the decision it affects; a brand name states neither.",
  },

  q20: {
    fieldLabel: "Right to opt out of ADMT",
    citation: "11 CCR § 7221(a)",
    citationUrl: CPPA_URL,
    plainSummary:
      "A business using ADMT for a significant decision provides a way to opt out, unless an exception in § 7221(b) applies. This answer records what exists today for this ADMT use.",
    regulationText:
      "§ 7221(a) — “A business must provide consumers with the ability to opt-out of the use of ADMT to make a significant decision concerning the consumer, except as set forth in subsection (b).”\n\n§ 7221(b)(1) — “The business provides the consumer with a method to appeal the decision to a human reviewer who has the authority to overturn the decision.”",
    relatedCitations: [
      { citation: "11 CCR § 7220(c)(2)", label: "Pre-use notice — description of the opt-out right" },
      { citation: "11 CCR § 7221(n)(1)", label: "Ceasing processing within 15 business days" },
    ],
    coachLead:
      "Answer for the opt-out as it works now — where a consumer finds it and what happens after the request.",
    coachBody:
      "“Planned for implementation” is for an opt-out that does not yet exist. If you rely on an exception rather than an opt-out, say which one in the ADMT description above; the report treats the choice between opt-out and exception as a fact to record, not a default.",
    goodAnswer:
      "Larkspur Credit Union: “Yes, with documented opt-out — the pre-use notice links to a request form; on receipt the application is routed to an underwriter and the model is not run on it.” The route and the consequence are both stated.",
    commonMistake:
      "Answering “Yes” because a general privacy-rights form exists. The opt-out is specific to this ADMT use and has a defined effect on the processing.",
  },

  i5_admt_human_review: {
    fieldLabel: "Human review process for outputs",
    citation: "11 CCR § 7001(e)(1)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Whether the technology ‘substantially replaces’ human decisionmaking turns on what the human reviewer actually does. The description is the record of who reviews, when, with what other information, and with what authority.",
    regulationText:
      "§ 7001(e)(1) — “For purposes of this definition, to ‘substantially replace human decisionmaking’ means a business uses the technology's output to make a decision without human involvement.” Human involvement requires that a human “(A) Know how to interpret and use the technology's output to make the decision; (B) Review and analyze the output of the technology, and any other information that is relevant to make or change the decision; and (C) Have the authority to make or change the decision based on their analysis in subsection (B).”",
    relatedCitations: [
      { citation: "11 CCR § 7221(b)(1)", label: "Appeal to a human reviewer with authority to overturn" },
    ],
    coachLead:
      "Describe the review before the decision takes effect: who, when, what else they look at, and whether they can change the outcome.",
    coachBody:
      "Reconsideration after a decision is a different thing from involvement in making it; if the only human step is an appeal, say that. If there is no review, state it directly — the report records it as a fact, not a finding against you.",
    goodAnswer:
      "Larkspur Credit Union: “A licensed underwriter reads every application scored in the middle band together with the applicant's uploaded statements and can approve or decline regardless of the score; top and bottom bands are decided by the score alone.” The description separates where a human decides from where the score decides.",
    commonMistake:
      "Writing “a human reviews the output” without saying what the reviewer sees or can change. Those two facts are what the three § 7001(e)(1) elements turn on.",
  },

  rk3d_admt_role_type: {
    fieldLabel: "The ADMT's role in the decision",
    citation: "11 CCR § 7001(e)(1)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The role classification follows from the three human-involvement elements: whether a human who knows how to use the output, considers other information, and has authority to change the decision is actually part of making it.",
    regulationText:
      "§ 7001(e)(1) — human involvement requires that a human “(A) Know how to interpret and use the technology's output to make the decision; (B) Review and analyze the output of the technology, and any other information that is relevant to make or change the decision; and (C) Have the authority to make or change the decision based on their analysis in subsection (B).”",
    relatedCitations: [
      { citation: "11 CCR § 7001(e)", label: "Definition of ADMT" },
    ],
    coachLead:
      "Classify from the decision process as it runs, checking each of the three elements against the review you described above.",
    coachBody:
      "The middle option — a human is involved but not all three elements are met — is the accurate answer for many real processes, and the report treats it as such. “Unsure” is for a process that has not been verified.",
    goodAnswer:
      "Meridian Staffing: recruiters see the rank but cannot review applicants ranked below 3, so element (C) is not met for those applicants — “A human is involved, but not all three § 7001(e)(1) requirements are met.” The facts decide the option, not the label the team prefers.",
    commonMistake:
      "Selecting the fully-involved option because a person signs off. Signing off without seeing other relevant information, or without authority to change the result, does not meet elements (B) and (C).",
  },

  rk3d_admt_logic_documented: {
    fieldLabel: "How the ADMT's logic is documented",
    citation: "11 CCR § 7222(b)(2)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Consumers can access information about the logic of the ADMT, and the assessment records what is documented and who documented it. Provider documentation the business relies on is a different basis from documentation the business reviewed itself.",
    regulationText:
      "§ 7222(b)(2) — “Information about the logic of the ADMT. Such information must enable a consumer to understand how the ADMT processed their personal information to generate an output with respect to them, which may include the parameters that generated the output as well as the specific output with respect to the consumer.”",
    relatedCitations: [
      { citation: "11 CCR § 7001(e)", label: "Definition of ADMT" },
    ],
    coachLead:
      "Pick the option that matches who wrote the documentation and whether your business has reviewed it.",
    coachBody:
      "A provider's model card that no one in the business has read is provider documentation relied on, not internal review. “Not fully documented or understood” is an honest answer the report can work with.",
    goodAnswer:
      "Larkspur Credit Union: the vendor supplies a model card listing the input variables and their weights; the credit-risk team has not yet reviewed it — “The logic is documented by the provider and the Company relies on that documentation.”",
    commonMistake:
      "Choosing “documented and reviewed internally” because the contract promises documentation. The option is about a review that has happened, not one that is available on request.",
  },

  rk3d_human_review_facts: {
    fieldLabel: "The three human-involvement facts",
    citation: "11 CCR § 7001(e)(1)(A)–(C)",
    citationUrl: CPPA_URL,
    plainSummary:
      "These three facts are the elements of human involvement. Each one you select is an assertion about the review process the report will rely on.",
    regulationText:
      "§ 7001(e)(1) — a human must “(A) Know how to interpret and use the technology's output to make the decision; (B) Review and analyze the output of the technology, and any other information that is relevant to make or change the decision; and (C) Have the authority to make or change the decision based on their analysis in subsection (B).”",
    relatedCitations: [
      { citation: "11 CCR § 7221(b)(1)", label: "Appeal to a human reviewer with authority to overturn" },
    ],
    coachLead:
      "Select each fact only where the review process, as run, supports it.",
    coachBody:
      "“Reviewers consider information beyond the ADMT's output” asserts that they analyse the output itself together with the other relevant information. If review exists but none of the facts has been confirmed, “None of the above can be confirmed” is the accurate record; “There is no human review” is for a process with no reviewer at all.",
    goodAnswer:
      "Tidewater Clinics, appointment-priority model: reviewers are trained on the score's meaning (A) and can re-order the list (C), but see only the score and not the referral notes — (A) and (C) selected, (B) not. The record shows exactly which element is missing.",
    commonMistake:
      "Selecting all three because a reviewer exists. Each fact is separate; a reviewer who cannot see other relevant information does not satisfy (B) however experienced they are.",
  },

  rk3d_admt_testing_facts: {
    fieldLabel: "The ADMT's testing record",
    citation: "11 CCR §§ 7152(a)(5), 7152(a)(6)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The assessment identifies negative impacts — including unlawful discrimination — and the safeguards planned for them. Testing for accuracy and for discriminatory impact is evidence on both, and the record distinguishes what was tested, when, and by whom.",
    regulationText:
      "§ 7152(a)(5) — “Identify the negative impacts to consumers' privacy associated with the processing. The business must identify the sources and causes of these negative impacts.” (Summary of § 7152(a)(6): identify and document the safeguards the business plans to implement for the processing.)",
    relatedCitations: [
      { citation: "11 CCR § 7001(e)", label: "Definition of ADMT" },
    ],
    coachLead:
      "Select only the testing facts you can point to a document for; a test's existence is not its result.",
    coachBody:
      "Provider testing can be recorded, and the option for it keeps it distinct from your own. Accuracy and bias are separate tests; the 12-month option is about when the testing happened or was reviewed, not when the model was bought.",
    goodAnswer:
      "Meridian Staffing: the vendor's disparate-impact report is dated seven months ago and was read by the HR analytics lead; no accuracy validation has been done — “Tested for discriminatory impact or bias”, “Testing performed or reviewed within the last 12 months”, “Testing performed by the provider rather than the Company”. Accuracy is left unselected.",
    commonMistake:
      "Selecting accuracy testing because the vendor says the model is accurate. A claim in marketing material is not a test record; the report reads unselected as untested, which is the accurate state.",
  },

  q6: {
    fieldLabel: "How consumers request access to their information",
    citation: "Cal. Civ. Code §§ 1798.110, 1798.115",
    plainSummary:
      "Consumers can request the categories and specific pieces of personal information a business holds about them, its sources, its purposes, and its recipients. This answer records the routes that accept such a request today.",
    regulationText:
      "Summary of Cal. Civ. Code §§ 1798.110 and 1798.115 (verbatim text is not in the verified corpus): a consumer has the right to request that a business disclose the categories and specific pieces of personal information it has collected, the categories of sources, the purposes, and the categories of third parties to whom it is disclosed, sold, or shared.",
    relatedCitations: [
      { citation: "11 CCR §§ 7060–7062", label: "Verification of requests" },
    ],
    coachLead:
      "Select each route that accepts an access request today; a route described in the policy but not working is not a route.",
    coachBody:
      "More than one route can be selected. “No formal process in place” is for a business with no defined route at all, and the report records it as a gap to close rather than a failure to explain.",
    goodAnswer:
      "Brightline Telecom: the web form with identity verification is live and support agents log emailed requests into the same queue — both routes selected; the app has no request screen, so “In-app account settings” is left unselected.",
    commonMistake:
      "Selecting the in-app route because account settings show some data. Viewing a profile is not a request process unless it produces the disclosures the statute lists.",
  },

  q7: {
    fieldLabel: "How consumers request deletion",
    citation: "Cal. Civ. Code § 1798.105",
    plainSummary:
      "Consumers can ask a business to delete personal information it collected from them, subject to the statutory exceptions. The answer records how the request is handled and whether completion is confirmed.",
    regulationText:
      "Summary of Cal. Civ. Code § 1798.105 (verbatim text is not in the verified corpus): a consumer has the right to request that a business delete personal information the business has collected from the consumer; the business deletes it, directs its service providers and contractors to delete it, and notifies third parties, subject to the exceptions in subsection (d).",
    relatedCitations: [
      { citation: "11 CCR § 7021(b)", label: "Response timeline for requests" },
    ],
    coachLead:
      "Pick the option that matches the deletion workflow as written down, and whether the requester is told it is done.",
    coachBody:
      "A documented manual process is one with a written workflow and a completion record. Case-by-case handling means there is no consistent workflow — say so; the report records the state, not a verdict.",
    goodAnswer:
      "Oakhaven Tutoring: the support team follows a written checklist covering the student database, the email tool, and the billing vendor, and sends a confirmation when each is done — “Manual process, documented”.",
    commonMistake:
      "Choosing “automated deletion with confirmation” because one system has a delete button. The workflow covers every system and vendor holding the information, and confirmation follows completion across all of them.",
  },

  q8: {
    fieldLabel: "How consumers request correction",
    citation: "Cal. Civ. Code § 1798.106",
    plainSummary:
      "Consumers can ask a business to correct inaccurate personal information it maintains about them. The answer records the route consumers use today.",
    regulationText:
      "Summary of Cal. Civ. Code § 1798.106 (verbatim text is not in the verified corpus): a consumer has the right to request that a business maintaining inaccurate personal information correct it, taking into account the nature of the information and the purposes of its processing; the business uses commercially reasonable efforts to correct it as directed by the consumer.",
    relatedCitations: [
      { citation: "11 CCR § 7021(b)", label: "Response timeline for requests" },
    ],
    coachLead:
      "Choose the route consumers actually use to fix an error: self-service editing, a support-assisted process, or none.",
    coachBody:
      "If both self-service and support routes exist, choose the one that handles the information this activity uses; the other can be described in the disclosure record. “No formal process” is an honest state the report can work with.",
    goodAnswer:
      "Brightline Telecom: customers edit contact details in the account portal, but billing-address corrections used by the credit check go through a support ticket with a review step — “Handled via support” is chosen because that is the route for the information in this activity.",
    commonMistake:
      "Selecting “online self-service” when the fields a consumer can edit are not the ones this activity relies on. The route is judged against the information the processing uses.",
  },

  rk3d_choice_architecture_check: {
    fieldLabel: "How consumers are asked to permit this processing",
    citation: "11 CCR § 7004",
    citationUrl: CPPA_URL,
    plainSummary:
      "Methods for obtaining consent are judged on their design: easy to understand, symmetrical in choice, free of confusing language or architecture, free of manipulative design, and easy to execute. Each confirmation you give is an assertion about the design in use.",
    regulationText:
      "Summary of 11 CCR § 7004 (verbatim text is not in the verified corpus): methods for submitting requests and obtaining consent are designed and implemented so that they are easy to understand, offer symmetry in choice, avoid language or interactive elements that are confusing, avoid choice architecture that impairs or interferes with the consumer's ability to make a choice, and are easy to execute; a method that does not comply may be considered a dark pattern, and consent obtained through a dark pattern is not consent.",
    relatedCitations: [
      { citation: "11 CCR § 7002(b)", label: "Consumers' reasonable expectations" },
    ],
    coachLead:
      "Confirm only what you can show from the screens or forms as they exist now.",
    coachBody:
      "Symmetry means declining takes no more steps than accepting; degrading the core service on decline is a separate fact. An unconfirmed item is treated conservatively — “None of the above can be confirmed” is a complete, honest answer.",
    goodAnswer:
      "Oakhaven Tutoring, progress-tracking consent: “Accept” and “Not now” are the same size on the same screen, and declining keeps every lesson feature — the first two confirmed. A countdown banner nudges toward accepting, so the third is left unconfirmed.",
    commonMistake:
      "Confirming symmetry because both choices are present. Symmetry is about effort and prominence, not presence; a decline hidden behind “Manage settings” is not symmetrical.",
  },

  q16: {
    fieldLabel: "Right to limit use of sensitive personal information",
    citation: "Cal. Civ. Code § 1798.121; 11 CCR § 7027",
    plainSummary:
      "Where a business uses or discloses sensitive personal information for purposes beyond those permitted by the regulations, consumers can limit that use. The answer records how the right is offered today, if at all.",
    regulationText:
      "Summary of Cal. Civ. Code § 1798.121 and 11 CCR § 7027 (verbatim text is not in the verified corpus): a consumer has the right to limit the use and disclosure of their sensitive personal information to what is necessary to perform the services or provide the goods reasonably expected, and to the purposes § 7027(m) permits; a business offering the right provides a “Limit the Use of My Sensitive Personal Information” link or an alternative opt-out method.",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(2)", label: "Sensitive PI as a risk-assessment trigger" },
    ],
    coachLead:
      "Answer for what is live: a separate link, a control inside settings, nothing yet, or no right offered.",
    coachBody:
      "The right applies only to uses beyond the permitted purposes; a business whose sensitive-PI uses all fall within § 7027(m) may accurately answer “No” and say why in the sensitive-PI basis question below. “Not yet implemented” is for a planned control.",
    goodAnswer:
      "Tidewater Clinics: precise geolocation from the mobile app feeds a marketing audience, which is outside the permitted purposes, and the app's privacy settings contain a limit toggle — “Yes, handled within privacy settings”.",
    commonMistake:
      "Answering “Yes” because the privacy policy mentions the right. The answer is about the mechanism consumers can use, not the paragraph that describes it.",
  },

  q17: {
    fieldLabel: "Basis for processing sensitive personal information",
    citation: "Cal. Civ. Code § 1798.121; 11 CCR § 7027(m)",
    plainSummary:
      "The CCPA does not run on a menu of lawful bases. What matters is the purpose the sensitive information serves, whether consent is involved, and whether a permitted-purpose exception in § 7027(m) applies. This answer records the closest description.",
    regulationText:
      "Summary of 11 CCR § 7027(m) (verbatim text is not in the verified corpus): the purposes for which a business may use or disclose sensitive personal information without offering the right to limit include performing the services or providing the goods reasonably expected by an average consumer, and specified security, integrity, short-term, and service-quality purposes.",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(2)(A)", label: "Personnel carve-out for sensitive PI" },
    ],
    coachLead:
      "Pick the description closest to why the sensitive information is used, and be ready to say why each category is needed.",
    coachBody:
      "“Employment contract” is not a general exemption; where it is chosen, the employment-exception questions below ask for the facts. Consent and necessity are different bases and the report treats them differently.",
    goodAnswer:
      "Meridian Staffing, payroll onboarding: Social Security numbers are used for tax withholding and legally required wage reporting — “Necessary for the service”, with the purpose stated per category. A GDPR-style “legitimate interests” label would not describe this.",
    commonMistake:
      "Choosing “Consent” because a checkbox exists at sign-up. Consent that is not the actual basis for the use — or that was obtained through a design § 7004 would treat as a dark pattern — does not describe the processing.",
  },

  q19b_housing_basis: {
    fieldLabel: "Housing decisions — availability, vacancy, or payment only",
    citation: "11 CCR § 7001(ddd)(2)",
    citationUrl: CPPA_URL,
    plainSummary:
      "A housing decision made solely on whether the housing is available or vacant, or on whether payment was received, is not a significant decision. Any other factor in the decision keeps it within the definition.",
    regulationText:
      "§ 7001(ddd)(2) — “‘Housing’ means any building, structure, or portion thereof that is used or occupied as, or designed, arranged, or intended to be used or occupied as, a home, residence, or sleeping place by one or more consumers including for permanent or temporary occupancy.” The same subsection provides that “the use of ADMT that provides or denies housing to a consumer based solely on the availability or vacancy of the housing or the successful receipt of payment for housing from the consumer is not making a significant decision.”",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(3)", label: "Using ADMT for a significant decision" },
    ],
    coachLead:
      "Answer “Yes” only if nothing about the applicant — income, history, screening score — enters the decision.",
    coachBody:
      "“Solely” is the operative word. A system that checks vacancy and then scores the applicant is deciding on the score, and the exclusion does not apply.",
    goodAnswer:
      "Harbor & Pine Apartments, unit-hold system: a unit is held for whoever pays the deposit first, with no screening — “Yes”. Their separate tenant-screening model, which scores rental history, is “No — other factors are considered.”",
    commonMistake:
      "Answering “Yes” because payment is one of the factors. The exclusion applies when availability, vacancy, or payment is the only basis.",
  },

  bought_sold_shared_count: {
    fieldLabel: "Consumers or households whose information is bought, sold, or shared each year",
    citation: "Cal. Civ. Code § 1798.140(d)(1)(B)",
    plainSummary:
      "One of the three ways a business is covered by the CCPA is annually buying, selling, or sharing the personal information of 100,000 or more consumers or households. This figure is that operand; left blank, the report lists it as outstanding rather than assuming a value.",
    regulationText:
      "§ 1798.140(d)(1)(B) — “Alone or in combination, annually buys, sells, or shares the personal information of 100,000 or more consumers or households.”",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ag)(1)", label: "Definition of ‘business’ — revenue prong" },
      { citation: "11 CCR § 7150(b)(1)", label: "Selling or sharing as a risk-assessment trigger" },
    ],
    coachLead:
      "Count consumers or households across buying, selling, and sharing together, for the last calendar year.",
    coachBody:
      "The three verbs are combined and households count as well as individuals. If the number is not known, leaving the field blank is more accurate than guessing; the report records it as an open item.",
    goodAnswer:
      "Brightline Telecom: 140,000 subscriber records were shared with an advertising partner and 20,000 prospect records were bought from a broker — 160,000 combined, so “100,000 to under 250,000”.",
    commonMistake:
      "Counting only sales. Sharing for cross-context behavioural advertising and buying from data brokers both count toward the same threshold.",
  },

  // ── Step 3 ────────────────────────────────────────────────────────────────
  rk3d_source_categories: {
    fieldLabel: "Source categories for the record",
    citation: "11 CCR § 7152(a)(3)(A)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The operational record includes the sources of the personal information. These categories structure the source narrative above so the report can state where the information comes from.",
    regulationText:
      "§ 7152(a)(3)(A) — “The business's planned method for collecting, using, disclosing, retaining, or otherwise processing personal information, and the sources of the personal information.”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)(F)", label: "Recipients of the personal information" },
    ],
    coachLead:
      "Select every category the information actually comes through, matching the sources you described.",
    coachBody:
      "A sign-up form is directly from the consumer; a vendor's batch feed is from service providers or contractors; a purchased profile is from a third-party data provider. Information your own systems generate is described in the narrative, since the list has no category for it.",
    goodAnswer:
      "Fernbrook Grocers: members type their details at the register (directly from the consumer) and the point-of-sale system logs purchases (automatically from consumer interactions) — two categories selected, matching the two sources in the narrative.",
    commonMistake:
      "Selecting only the first category because the consumer originally supplied the information. A copy that reaches this activity through a vendor feed is also from a service provider.",
  },

  i3_ca_consumer_band: {
    fieldLabel: "Approximate number of California consumers affected",
    citation: "11 CCR § 7152(a)(3)(D)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The operational record includes the approximate number of consumers whose personal information the processing affects. The band is the screening answer; the stated figure below it is the record.",
    regulationText:
      "§ 7152(a)(3) — “Identify and document in a risk assessment report the following operational elements of the processing:” (Summary of § 7152(a)(3)(D): the approximate number of consumers whose personal information the business plans to process — verbatim text is not in the verified corpus.)",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)(C)", label: "How the business interacts with the consumers" },
    ],
    coachLead:
      "Choose the band for the distinct California consumers this activity touches, on the same scope and period as your stated figure.",
    coachBody:
      "Count the activity, not the company. The band and the figure below describe the same population; if they disagree, the report cannot tell which one is the record.",
    goodAnswer:
      "Fernbrook Grocers: 45,000 loyalty members with a California address receive the coupon — “10,000–100,000”, with “about 45,000” stated below. The chain's 300,000 total customers are not the population for this activity.",
    commonMistake:
      "Reporting all customers because the database holds them all. The number is the consumers whose information this activity processes.",
  },

  rk3d_consumer_relationship_context: {
    fieldLabel: "Who the affected consumers are, in relation to the business",
    citation: "11 CCR § 7002(b)",
    citationUrl: CPPA_URL,
    plainSummary:
      "What a consumer reasonably expects depends in part on their relationship with the business. Applicants, employees, patients, and site visitors expect different things from the same processing, and the report reads the impacts against the relationship you record.",
    regulationText:
      "Summary of 11 CCR § 7002(b) (verbatim text is not in the verified corpus): whether a purpose is consistent with consumers' reasonable expectations is judged by factors including the relationship between the consumer and the business, the type and nature of the information, the source of the information and the disclosures made at collection, and the degree to which the involvement of third parties or other purposes is visible to the consumer.",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(4)", label: "Inference in a work or education context" },
    ],
    coachLead:
      "Pick the relationship that describes the people whose information this activity processes; use “Mixed” only when more than one group is included.",
    coachBody:
      "For “Mixed”, name each group in the description of the activity and say whether their information is treated differently. The relationship also feeds the § 7150(b)(4) work-or-education check, so applicants and employees are worth distinguishing from customers.",
    goodAnswer:
      "Meridian Staffing, applicant ranking: “Employees or job applicants” — the model runs on applicants only; current employees are scored in a separate activity. Oakhaven Tutoring's progress tracker processes students and their parents, so it records “Mixed” and names both groups.",
    commonMistake:
      "Choosing “Existing customers” for everyone the business has a record on. A declined applicant or a site visitor with no account is not a customer, and their expectations differ.",
  },

  rk3d_expectation_check: {
    fieldLabel: "Facts that frame what consumers can expect",
    citation: "11 CCR § 7002(b)",
    citationUrl: CPPA_URL,
    plainSummary:
      "These facts describe context — when the processing happens, whether the purpose changed, whether information is combined or disclosed. They are inputs to the reasonable-expectations analysis, not findings that the processing is lawful or unlawful.",
    regulationText:
      "Summary of 11 CCR § 7002(b) (verbatim text is not in the verified corpus): reasonable expectations are judged by factors including the relationship with the business, the type and nature of the information, the source and the disclosures made at collection, the degree to which the involvement of third parties is visible, and whether the processing is compatible with the context in which the information was collected.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(5)", label: "Negative impacts — sources and causes" },
    ],
    coachLead:
      "Select every fact that is true of this activity; leave the rest unselected, and use “None of the above apply” only when every statement is inapplicable.",
    coachBody:
      "Keeping transaction history after the order closes is processing that continues after the interaction. Combining account data with broker attributes is combination with other sources. Each selected fact goes into the analysis as a fact, not as an admission.",
    goodAnswer:
      "Harbor & Pine Apartments: the screening score is computed after the applicant's visit ends (continues after the interaction), the score uses a credit bureau file (combined with other sources), and the bureau is a party the applicant never interacts with (disclosed to parties not directly interacted with) — three facts selected.",
    commonMistake:
      "Selecting only the first fact because the processing starts during the interaction. If it also continues afterwards, both are true and both are selected.",
  },

  rk3d_vendor_dependency: {
    fieldLabel: "Whether a recipient or vendor is essential",
    citation: "11 CCR § 7152(a)(3)(F)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The recipients of the information are part of the operational record. Whether the processing could continue without one of them is a fact about dependency that the report carries into the negative-impact and safeguard analysis.",
    regulationText:
      "§ 7152(a)(3)(F) — “The names or categories of the service providers, contractors, or third parties to whom the business discloses or makes available the consumers' personal information for the processing; and the purpose for which the business discloses or makes the consumers' personal information available to them.”",
    relatedCitations: [
      { citation: "11 CCR § 7051(a)(6)", label: "Service-provider contract duties" },
    ],
    coachLead:
      "Ask whether the activity would stop if a listed recipient or vendor became unavailable tomorrow.",
    coachBody:
      "A vendor with a tested replacement is not essential today; the only provider able to run the scoring model is. Distinguish current dependency from a replacement plan you have not tested — “Unsure” is a complete answer.",
    goodAnswer:
      "Larkspur Credit Union: “One or more vendors are essential — the processing could not continue without them: Cardinal Analytics (hosts and runs the scoring model; no in-house alternative).” The print vendor for decision letters is interchangeable and is not named.",
    commonMistake:
      "Answering “No single vendor is essential” because contracts allow termination. Termination rights do not create a working replacement; the question is operational.",
  },

  q11: {
    fieldLabel: "When the privacy policy was last reviewed or updated",
    citation: "Cal. Civ. Code § 1798.130(a)(5)",
    plainSummary:
      "The privacy policy is updated at least once every twelve months. The answer records the documented review date, which the report reads alongside the disclosures made for this activity.",
    regulationText:
      "Summary of Cal. Civ. Code § 1798.130(a)(5) (verbatim text is not in the verified corpus): a business discloses the required information in its online privacy policy and updates that information at least once every 12 months.",
    relatedCitations: [
      { citation: "11 CCR § 7011", label: "Privacy policy — required contents" },
    ],
    coachLead:
      "Use the dated review record or the policy's effective date — not the website's copyright year.",
    coachBody:
      "A review that made no changes still counts as a review if it is documented and dated. If there is no privacy policy, the accurate answer is that one; the report records the gap plainly.",
    goodAnswer:
      "Brightline Telecom: the policy page shows “Effective 2 February 2026” and the legal team's review memo is dated the same week — “Within 12 months”.",
    commonMistake:
      "Answering from the footer's “© 2026”. A copyright notice is not a policy date.",
  },

  q12: {
    fieldLabel: "Notice at collection — at or before the point of collection",
    citation: "Cal. Civ. Code § 1798.100(a); 11 CCR § 7012",
    plainSummary:
      "Consumers are informed at or before the point of collection what is collected and why. This answer records whether that notice reaches every collection point for this activity.",
    regulationText:
      "Summary of Cal. Civ. Code § 1798.100(a) and 11 CCR § 7012 (verbatim text is not in the verified corpus): a business that controls the collection of personal information informs consumers, at or before the point of collection, of the categories collected, the purposes, whether the information is sold or shared, and the retention period or the criteria used to determine it; the notice is presented in the manner in which the information is collected.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)(E)", label: "Disclosures made about this processing" },
    ],
    coachLead:
      "Answer per collection point for this activity: form, app, call, vendor feed, or in-person.",
    coachBody:
      "A notice on the web form does not cover collection over the phone. “Partial coverage” is the accurate answer when one channel lacks the notice — name the channel in the disclosure record below.",
    goodAnswer:
      "Fernbrook Grocers: the sign-up form links the notice above the submit button, but cashiers enrolling members at the register do not present it — “Yes, partial coverage”, with the register channel named in the disclosure rows.",
    commonMistake:
      "Answering “Yes, covers all collection points” because the privacy policy is comprehensive. The policy is not the notice at collection; timing and placement are the point.",
  },

  q13: {
    fieldLabel: "Notice contents — categories, purpose, and the opt-out right",
    citation: "Cal. Civ. Code § 1798.100(a); 11 CCR § 7012",
    plainSummary:
      "The notice at collection carries specific contents. The answer records whether the categories collected, the purposes, and the opt-out right all appear in it.",
    regulationText:
      "Summary of Cal. Civ. Code § 1798.100(a) and 11 CCR § 7012 (verbatim text is not in the verified corpus): the notice at collection lists the categories of personal information collected and the purposes for each, states whether the information is sold or shared, gives the retention period or its criteria, and links to the privacy policy and, where applicable, to the opt-out of sale or sharing.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.135(a)", label: "The ‘Do Not Sell or Share’ link" },
    ],
    coachLead:
      "Open the notice as a consumer sees it and check for each of the three elements by name.",
    coachBody:
      "“Some elements” is the accurate answer when the notice names categories and purposes but not the opt-out right, or the reverse. Where the business does not sell or share, the notice can say so instead of offering an opt-out; that still counts as addressing the element.",
    goodAnswer:
      "Oakhaven Tutoring: the notice lists the categories and purposes and states “We do not sell or share personal information” — “Yes, all three”, because the opt-out element is addressed by the statement.",
    commonMistake:
      "Reading the privacy policy instead of the notice. The elements have to be in the notice presented at collection, not somewhere in the longer document it links to.",
  },

  q14: {
    fieldLabel: "Separate notice for California employees and applicants",
    citation: "Cal. Civ. Code § 1798.100(a); 11 CCR § 7012",
    plainSummary:
      "Employees and job applicants are consumers, and information collected from them needs its own notice at collection, presented where that collection happens.",
    regulationText:
      "Summary of Cal. Civ. Code § 1798.100(a) and 11 CCR § 7012 (verbatim text is not in the verified corpus): the notice at collection is given to consumers — including employees, applicants, and contractors — at or before the point of collection, in the manner in which the information is collected.",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(2)(A)", label: "Personnel carve-out for sensitive PI" },
    ],
    coachLead:
      "Answer for the notice actually shown at onboarding or in the application flow, not for the customer-facing policy.",
    coachBody:
      "A general consumer policy rarely describes the categories collected from applicants or the purposes of HR processing, which is why “No — we use our general privacy policy” is the accurate answer for many businesses. “Not applicable” is for a business with no California employees or applicants.",
    goodAnswer:
      "Meridian Staffing: the applicant portal shows an applicant-specific notice before the first form, and new hires receive an employee notice in the onboarding packet — “Yes”.",
    commonMistake:
      "Answering “Yes” because the general policy has an “Employees” heading. The notice is presented at the point of collection, in the application or onboarding flow.",
  },

  i4_disclosures: {
    fieldLabel: "How consumers are informed of this processing",
    citation: "11 CCR § 7152(a)(3)(E)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The operational record includes what the business has told or will tell consumers about the processing and how. These mechanisms are the summary; the disclosure rows below carry the content and status.",
    regulationText:
      "§ 7152(a)(3)(E) — “What disclosures the business has made or plans to make to the consumer about the processing of their personal information and how these disclosures were or will be made”",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.100(a)", label: "Notice at collection" },
    ],
    coachLead:
      "Select every mechanism through which consumers receive information about this activity, then describe each one in the rows below.",
    coachBody:
      "Name the actual screen or document in the rows: “the sign-up form's notice” rather than “notice at collection” in the abstract. “No standalone disclosure” means nothing is said about this activity anywhere — it does not sit alongside other selections.",
    goodAnswer:
      "Tidewater Clinics, appointment reminders: “Notice at Collection” (the intake form's notice names reminder messaging) and “Consent screen” (the SMS opt-in screen states the purpose) — two mechanisms, each described in its own row with its status.",
    commonMistake:
      "Selecting “Privacy policy” for every activity. If the policy does not mention this processing, it is not a disclosure about it; the rows below are where that gets checked.",
  },

  i2_retention_criteria: {
    fieldLabel: "Retention criteria",
    citation: "11 CCR § 7152(a)(3)(B)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Where the retention period is not fixed, the record gives the criteria used to determine it. The selection names the type of criterion; the description below states it concretely.",
    regulationText:
      "§ 7152(a)(3)(B) — “How long the business plans to retain each category of personal information, or if unknown, the criteria the business plans to use to determine that retention period.”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(2)", label: "Categories of personal information" },
    ],
    coachLead:
      "Pick the criterion that actually ends retention, and say in the box below what triggers deletion and what happens then.",
    coachBody:
      "“Duration of account” is a trigger, not a period — the description says what happens when the account closes and how soon. A statutory requirement is named with its source. If different categories follow different rules, the category table below is where each one is recorded.",
    goodAnswer:
      "Fernbrook Grocers: “Duration of account / relationship — records are deleted 90 days after a membership closes; purchase history is aggregated at 24 months regardless.” The criterion, the trigger, the delay, and the exception.",
    commonMistake:
      "Selecting “Until purpose is fulfilled” without saying what fulfilment looks like. The report reads an undefined trigger as no criterion.",
  },

  // ── Step 5 ────────────────────────────────────────────────────────────────
  rk3d_risk_interdependency_check: {
    fieldLabel: "Whether the impacts compound each other",
    citation: "11 CCR §§ 7152(a)(5), 7154(a)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Negative impacts are identified with their sources and causes, and the assessment weighs them against the benefits. When one impact makes another more likely or more severe, the weighing has to account for the combination, so the record says whether that is the case.",
    regulationText:
      "§ 7152(a)(5) — “Identify the negative impacts to consumers' privacy associated with the processing. The business must identify the sources and causes of these negative impacts.”\n\n§ 7154(a) — “The goal of a risk assessment is restricting or prohibiting the processing of personal information if the risks to privacy of the consumer outweigh the benefits resulting from processing to the consumer, the business, other stakeholders, and the public.”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(6)", label: "Safeguards for the processing" },
    ],
    coachLead:
      "Ask whether one recorded impact, if it happened, would make another more likely or worse.",
    coachBody:
      "Exposed home-location records (A) enable stalking (F); a discriminatory rejection (B) also produces financial loss (E). Two impacts arising from the same activity do not compound merely by coexisting — the link is causal. “Unsure” is recorded as not yet assessed.",
    goodAnswer:
      "Harbor & Pine Apartments: an erroneous screening score (E, economic harm) leads to a denial that appears on tenant databases used by other landlords (G, reputational harm) — “Two or more identified pathways could compound each other”, with (E) and (G) selected below.",
    commonMistake:
      "Answering “compound” whenever more than one impact is listed. Compounding is one impact feeding another, not a count of impacts.",
  },

  rk3d_compounding_pathways: {
    fieldLabel: "Which pathways compound each other",
    citation: "11 CCR § 7152(a)(5)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Having said that impacts compound, the record names which ones. The categories selected here are read against the impact rows recorded above.",
    regulationText:
      "§ 7152(a)(5) — “Identify the negative impacts to consumers' privacy associated with the processing. The business must identify the sources and causes of these negative impacts.”",
    relatedCitations: [
      { citation: "11 CCR § 7154(a)", label: "The goal of a risk assessment" },
    ],
    coachLead:
      "Select at least two categories that you recorded impacts under, and explain the link in those rows' cause fields.",
    coachBody:
      "A category with no impact row above cannot compound anything. The connection lives in the rows: say in the cause of the second impact that it follows from the first.",
    goodAnswer:
      "Harbor & Pine Apartments: (E) and (G) selected; the (G) row's cause reads “a denial produced by an erroneous (E) score is reported to tenant databases.” The selection and the row explain each other.",
    commonMistake:
      "Selecting a category that has no row above. The report can only trace a compounding link between impacts it has on record.",
  },

  // ── Step 7 ────────────────────────────────────────────────────────────────
  i7_internal_contributors: {
    fieldLabel: "Who contributed to or was consulted in preparing this assessment",
    citation: "11 CCR §§ 7151, 7152(a)(8)",
    citationUrl: CPPA_URL,
    plainSummary:
      "Employees whose duties include the processing are included in the assessment process, external parties may be, and the report identifies who provided its information. This is the preparation record — distinct from the named information-provider list and from the approval record.",
    regulationText:
      "§ 7151(a) — “A business's employees whose job duties include participating in the processing of personal information that would be subject to a risk assessment must be included in the business's risk assessment process for that processing activity.”\n\n§ 7151(b) — “In conducting the risk assessment, a business may include external parties in the process.”\n\n§ 7152(a)(8) — “Identify and document in a risk assessment report the individuals who provided the information for the risk assessment, except for legal counsel who provided legal advice.”",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(9)", label: "Review and approval record" },
    ],
    coachLead:
      "List each role consulted and what it contributed; write “None” if no one beyond the author was involved.",
    coachBody:
      "Roles are enough here — names and positions go in the § 7152(a)(8) provider list and the § 7151 participation rows. Legal counsel who gave legal advice is excluded from the report's records, so note the consultation without naming the advice. A blank here never blocks the report; it is stated as a condition on the approval.",
    goodAnswer:
      "Tidewater Clinics: “Privacy lead — coordinated the assessment; scheduling-system owner — explained the reminder workflow; security lead — supplied the access-control facts; outside counsel consulted (legal advice excluded from the record).”",
    commonMistake:
      "Listing the same people here and as approvers. Preparing the assessment and approving it are separate records; the approval record is further down.",
  },

  i8_exec_name: {
    fieldLabel: "The executive certifying the annual submission",
    citation: "11 CCR § 7157(b)(5), (c)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The annual submission to the Agency carries an attestation made under penalty of perjury by a member of executive management who meets § 7157(c). Naming that person here does not certify anything; it records who is expected to.",
    regulationText:
      "§ 7157(b)(5) — “Attestation to the following statement: ‘I attest that the business has conducted a risk assessment for the processing activities set forth in California Code of Regulations, Title 11, section 7150, subsection (b), during the time period covered by this submission, and that I meet the requirements of section 7157, subsection (c). Under penalty of perjury under the laws of the state of California, I hereby declare that the risk assessment information submitted is true and correct.’”\n\n§ 7157(c) — “The individual submitting the information set forth in subsection (b) must be a member of the business's executive management team who:” (the qualifying conditions follow).",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(9)", label: "Review and approval of the assessment itself" },
    ],
    coachLead:
      "Name the executive expected to make the § 7157 attestation — a person, not a committee.",
    coachBody:
      "This is separate from approving the assessment. If the person has not been identified, leave it blank: the report states the identification as a condition on the approval level reached rather than stopping.",
    goodAnswer:
      "Larkspur Credit Union: “Avery Patel” — the executive responsible for oversight of consumer lending, who will make the April submission. Title follows in the next field.",
    commonMistake:
      "Entering the privacy analyst who drafted the assessment. The attestation is made by a member of executive management who meets § 7157(c), whoever wrote the document.",
  },

  i8_exec_title: {
    fieldLabel: "Certifying executive title",
    citation: "11 CCR § 7157(c)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The submitting individual is a member of the business's executive management team who meets the conditions in § 7157(c). The title is how the report shows that the named person holds such a position.",
    regulationText:
      "§ 7157(c) — “The individual submitting the information set forth in subsection (b) must be a member of the business's executive management team who:” (the qualifying conditions follow; see § 7157(c) in the regulation text).",
    relatedCitations: [
      { citation: "11 CCR § 7157(b)(5)", label: "The attestation statement" },
    ],
    coachLead:
      "Give the person's actual title as it appears in the organisation, not the role you would like them to hold.",
    coachBody:
      "A title on its own does not establish that the person meets § 7157(c); the report pairs the title with the name and the oversight responsibility described elsewhere. A blank is recorded as a condition, not a block.",
    goodAnswer:
      "“Chief Lending Officer” for Avery Patel at Larkspur Credit Union — the title held, which also describes oversight of the processing being assessed.",
    commonMistake:
      "Writing “Certifying Executive” or “Data Protection Officer” as a generic label. The record needs the title the person holds.",
  },
};

