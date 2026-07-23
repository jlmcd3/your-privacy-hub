// qb9 dpia-r1b2.3 sectioned-generation (U1..U5 phase-fan-out; Amendments 1+2)
import { attachDeterministicChecks, extractProseFromReport } from '../_shared/advisory-voice.ts';
import { runFormatChecksGeneric } from '../_shared/grader/format-checks.ts';
import { extractIntakeRoster } from '../_shared/grader/intake-roster.ts';
// run-meter deploy-check v1
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { invokeGated } from "../_shared/invoke-gated.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun, logPostGenLint } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { resolveDpiaJurisdiction, renderResolvedBlock, validateJurisdiction, type DpiaIntakeFacts, type TransferFlow } from "../_shared/dpia-jurisdiction-registry.ts";
import { buildSystemContent, type ToolModule, type SystemBlock, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { freezeOpenItemsOnFirstRun } from "../_shared/open-items.ts";
import { handleRevisionMode } from "../_shared/revision-mode.ts"; // RC-B.1
import { renderSupplementalBlock } from "../_shared/supplemental-block.ts";
import { observeCitations } from "../_shared/citation-observe.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";
import { detectTestStatesLeak } from "../_shared/cppa-test-states.ts";
import { detectBlacklistPhrases } from "../_shared/blacklist-phrases.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DPIA_T234_RETRY_ELAPSED_THRESHOLD_MS = 150_000;

// DPIA per-half first-call ceiling (courier 2026-07-12 item 4). Continuation
// (see callAnthropicWithContinuation) is the safety net if this is exceeded.
const DPIA_HALF_MAX_TOKENS = 24_000;

import { callAnthropicWithContinuation, AnthropicTimeoutError } from "../_shared/anthropic-call.ts";
// RUNTIME-1 — local reliability helpers (fence-compliant; per-function dir).
import { withUpstreamRetry as dpiaWithRetry, ensureTerminalFnRun as dpiaEnsureTerminal } from "./reliability.ts";

async function callAnthropic(model: string, system: string | SystemBlock[], user: string, maxTokens = PRODUCT_MAX_OUTPUT_TOKENS): Promise<{ text: string; stopReason: string | null }> {
  const r = await callAnthropicWithContinuation({
    model, system, user, maxTokens, label: "run-dpia-framework",
  });
  return { text: r.text, stopReason: r.stopReason };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Module (shared prompt core v2.2). All substantive, audited GDPR rules
// are preserved verbatim in extraRules. Generic JSON / "not legal opinion" /
// generic monetary-penalty framing is supplied by the shared core and removed
// here. The SUPERVISORY AUTHORITY NAMING RULE (hardcoded country → SA list) is
// removed: supervisory authorities, lead/OSS authority, transfer mechanisms,
// and adequacy decisions are now resolved deterministically and injected via
// the RESOLVED JURISDICTION block (see resolveDpiaJurisdiction).
// ─────────────────────────────────────────────────────────────────────────────

export const DPIA_TOOL_MODULE: ToolModule = {
  identity:
    "You are a senior privacy lawyer producing a structured DPIA framework document following GDPR Article 35 and the EDPB Guidelines on DPIA (WP248 rev.01). This is a framework for the organisation's own legal/privacy team to complete and own — not a finished DPIA or legal opinion. The document must follow the structure required by GDPR Article 35, the EDPB Guidelines on DPIA (WP248 rev.01), and the guidance of the controller's competent lead supervisory authority based on the controller's EU/EEA member state of establishment.",
  citationFramework:
    "Cite well-established GDPR article numbers only (e.g. Article 35, Article 32); do not invent sub-article/paragraph numbers unless explicitly described in the processing context. DPIA guidance = 'EDPB (endorsed) Guidelines on DPIA (WP248 rev.01)' — never 'EDPB Guidelines 09/2022' (that is breach notification). SUPERVISORY AUTHORITY, LEAD AUTHORITY, ONE-STOP-SHOP, TRANSFER MECHANISMS, and ADEQUACY DECISIONS: use ONLY the names and citations given in the RESOLVED JURISDICTION block provided in this prompt. Do not name a supervisory authority, transfer instrument, or adequacy decision from your own knowledge. Where the resolved block contains a [TO COMPLETE …] placeholder, reproduce that placeholder rather than guessing. (For German private-sector controllers the competent authority is the relevant Land authority — never the BfDI, which supervises only federal public bodies, telecoms, and postal services; the resolved block carries the correct authority.)",
  outputMode: "strict-JSON",
  extraRules: [
    // Concision / sizing / severity calibration
    "CONCISION & SIZING: every string value must be at most 2 sentences (<= 300 characters). Risk arrays should contain enough items to capture all material risks for the processing activity — do not artificially limit the count. Simple processing may have 3–4 risks; high-risk processing (special categories, ADMT, large-scale profiling, children's data) should have 5–7 or more. Measure arrays should mirror risk count: one or more measures per identified risk. Severity values of Low, Medium, and High are all valid — calibrate to the actual risk; do not default all risks to Medium or High.",
    // Enforcement annotation scoping
    "Do NOT reference specific enforcement case names, fine amounts, or regulator decisions in framework section content — enforcement context is injected separately and must only appear in the annotations array.",
    // TLS phrasing
    "CITATION INTEGRITY RULE (6): Where specifying encryption-in-transit standards, always use the phrase \"TLS 1.2 or higher (TLS 1.3 recommended)\" — never state a single version in isolation. This applies to all security measures sections and mitigation sections, so that no two sections of the document specify different TLS versions.",
    // WP248 scope
    "WP248 SCOPE RULE: WP248 rev.01 provides criteria for determining when a DPIA is required and factors relevant to assessing risk. It does NOT prescribe a specific numerical scoring methodology or scoring rubric. Never state or imply that WP248 \"provides the recommended scoring methodology\" or \"provides the risk-scoring framework\" — this is incorrect. WP248 informs risk assessment factors; the organisation must apply and document its own risk matrix methodology.",
    // Data broker / indirect processing legal basis
    "DATA BROKER AND INDIRECT PROCESSING LEGAL BASIS RULE: For processing activities involving data brokering, large-scale profiling, marketing-list licensing, credit pre-screening, or processing personal data not collected directly from data subjects: do not present legitimate interests (Article 6(1)(f)) as the probable or likely legal basis without caveating that this is highly purpose-dependent and contested for large-scale indirect processing. Instead, instruct the organisation to conduct a purpose-by-purpose legal basis analysis covering: (1) whether consent under Article 6(1)(a) is required for any purpose; (2) whether Article 21(2) opt-out rights apply to direct marketing regardless of the legal basis; (3) whether Article 6(1)(f) can genuinely be balanced against data subjects' interests given the indirect collection and scale; and (4) whether ePrivacy Directive obligations apply where electronic communications are involved. Present the legal basis as \"to be determined per purpose\" rather than asserting LI as the most likely candidate.",
    // Intra-EEA vs cross-border
    "INTRA-EEA PROCESSING RULE: Personal data flows between EU/EEA member states are NOT Chapter V 'transfers' and do NOT require adequacy decisions, SCCs, or BCRs. Use the term 'intra-EEA processing' (NEVER 'intra-EEA transfers'). For an EEA-established processor processing data solely within the EEA, only a GDPR Article 28 DPA is required. An EU-established processor that uses non-EEA infrastructure (e.g. an Irish-incorporated company using US data centres) still triggers Chapter V for the non-EEA processing leg, regardless of the processor's place of establishment. UK ↔ EU flows: an EU adequacy decision for the UK has been in force since 28 June 2021, and the UK treats the EU/EEA as adequate under UK adequacy regulations — both directions therefore flow freely without SCCs or IDTA, subject to confirming that the adequacy decision remains in force at the time of assessment. Chapter V mechanisms (EU SCCs, UK IDTA, BCRs, or the EU-US Data Privacy Framework where applicable) apply only to transfers to non-adequate third countries (e.g. transfers to the US outside of DPF, India, UAE). Never describe an EU-member-state processor relationship as requiring 'post-adequacy transfer mechanisms' or 'cross-border transfer adequacy'.",
    "TEMPLATE VERSION RULE: Do NOT cite specific EDPB or supervisory-authority DPIA template version numbers, dates, or consultation-draft labels (e.g. 'EDPB DPIA template v1.0 (10 Mar 2026, public-consultation draft)') unless that exact reference is provided in the supplied corpus. The acceptable references are: 'EDPB (endorsed) Guidelines on DPIA (WP248 rev.01)' and the controller's competent lead SA's published DPIA guidance (named only via the RESOLVED JURISDICTION block). Never fabricate template metadata.",
    // EdTech controller/processor
    "EDTECH CONTROLLER/PROCESSOR RULE: For processing activities involving educational technology (EdTech) where the data subjects are learners, students, or children and the immediate counterparty is a school, college, or educational institution: do not assume the EdTech provider is the controller. Analyse whether the provider is: (a) a processor acting on the school's instructions (most common — school is controller, provider is processor under Art. 28); (b) an independent controller for its own platform analytics; or (c) a joint controller with the school. If the provider is a processor, Article 6(1)(b) (contract with the school) is NOT a valid basis for processing learners' personal data — the controller (school) must have its own valid legal basis. Flag this controller/processor characterisation in section_0_overview and in section_2_analysis.completion_guidance (legal basis), and require the organisation to resolve it before finalising the DPIA.",
    // Public authority
    "PUBLIC AUTHORITY LEGAL BASIS RULE: GDPR Article 6(1) final sentence states that Article 6(1)(f) (legitimate interests) does NOT apply to processing carried out by public authorities in the performance of their tasks. If the sector field or organisation name indicates a government, public sector, or public authority entity, you MUST NOT propose Article 6(1)(f) as the legal basis. Instead propose Article 6(1)(e) (public task) where a statutory mandate exists, or Article 6(1)(c) (legal obligation) where processing is required by law, and state that the organisation must confirm and document the applicable statutory basis. Also: if the user's selected legal basis is \"Public task (Art. 6(1)(e))\", treat this as the starting point and do not suggest switching to 6(1)(f).",
    // DPO role
    "DPO ROLE RULE: The DPO's role in a DPIA is advisory (GDPR Article 35(2) and Article 39(1)(c)). The DPO provides advice and monitors performance — they do not approve, sign off on, or gate the DPIA decision. Never use the phrases \"DPO sign-off\", \"DPO approval\", \"DPO must approve\", or \"obtain DPO sign-off before proceeding\" in any section. Instead use: \"DPO advice received and considered\" or \"DPO consulted — advice documented\". The controller's representative owns the final sign-off decision. DPO consultation is also conditional: Article 35(2) applies only where a DPO is designated. Always present DPO consultation as \"required if a DPO is designated\" rather than unconditionally required. In section_5_interested_parties.dpo_advice, the record label must be 'DPO advice received and documented' — never 'DPO sign-off' or 'DPO signature.'",
    // Placeholder format
    "PLACEHOLDER FORMAT RULE: All completion placeholders throughout the DPIA framework must use the single consistent format: [TO COMPLETE — description]. For example: [TO COMPLETE — DPO name and contact], [TO COMPLETE — date consulted DD/MM/YYYY], [TO COMPLETE — summary of DPO advice]. Do NOT use: [INSERT], [INSERT DATE], [DD/MM/YYYY], [NAME / EMAIL], [Organisation Name], [REF], or any other variant. The only exception is the volume placeholder which uses [TO BE ASSESSED — confirm from operational data before the DPIA is finalised] as already defined.",
    "PLACEHOLDERS NEVER RE-REQUEST DOCUMENTED WORK: a [TO COMPLETE — …] placeholder asks only for what the document has not already done. Where an entry's own text already documents a determination (e.g. the Art. 20 portability analysis concluding non-applicability under Art. 6(1)(f)), the placeholder in that entry may ask only for review or sign-off of the documented conclusion — never for the determination to be 'documented' or 'assessed' as if it were outstanding. A placeholder that re-requests work the surrounding text has performed is an internal inconsistency.",
    // Monetary penalty — known ICO figures only (generic ban supplied by core)
    "MONETARY PENALTY KNOWN FIGURES: The shared core forbids fabricated penalty amounts. The following ICO figures are known correct and MAY be cited only if the case is in your enforcement block: ICO Clearview AI (2022) £7,552,800; ICO Interserve (2022) £4,400,000; ICO Capita Pension Solutions (2024) £6,090,000; ICO British Airways (2020) £20,000,000. For any other case, write \"[Regulator] imposed a significant penalty for this type of violation — verify the current figure at the regulator's enforcement register\".",
    // Article 35(11) review
    "ARTICLE 35(11) RULE: Article 35(11) GDPR requires a DPIA review when there is a change in the risk represented by the processing — it does NOT mandate an annual review. When writing review schedules, clearly distinguish the legal obligation from the recommendation: the legal obligation (Article 35(11)) is to review whenever the risk changes; annual review is an internal governance recommendation only. Use language that makes this distinction explicit, for example: 'Review triggers: (1) Legal requirement — whenever the risk represented by the processing changes (GDPR Article 35(11)); (2) Recommended practice — at least annually as an internal governance measure.' Do NOT use the word \"must\" in the same sentence as \"annually\" — this implies annual review is legally required, which it is not.",
    // Article 14 indirect transparency
    "TRANSPARENCY FOR INDIRECT DATA SUBJECTS RULE: Article 14 GDPR applies wherever personal data is not obtained directly from the data subject. This includes: (a) data collected about individuals via third-party sources, purchased data, credit bureaux, broker lists, or web scraping; (b) data inferred or derived about individuals from other data; (c) incidental capture (e.g., individuals appearing in CCTV or imagery). Where any of these apply, the framework MUST flag Article 14 transparency obligations in section_2_analysis.completion_guidance: specifically, how and when the controller will provide the Article 14 information, whether the Article 14(5)(b) disproportionate-effort exemption is claimed, and what compensating measures (layered notices, website privacy notices, signage, trade press notices) will be applied if so. Do not use IAB TCF registration as a substitute for direct Article 14 transparency obligations — TCF addresses consent signalling for adtech, not the Article 14 information-provision requirement.",
    // Numeric volume estimates
    "NUMERIC VOLUME AND POPULATION ESTIMATE RULE (CRITICAL — applies to ALL sections, not just incidental capture): Never generate, estimate, infer, or extrapolate any numeric figure for: (a) the number of data subjects, (b) the volume of processing events, (c) the frequency of processing per time period (events per day/week/month/year), (d) any data volume metric in bytes/records/transactions, (e) the number of individuals incidentally captured, (f) bystander or third-party individual counts — unless that exact figure was explicitly provided in the user's intake data. This rule applies to every section of the DPIA framework output, including but not limited to: processing scope, proportionality analysis, necessity assessment, risk assessments, residual risk, mitigation measures, monitoring plans, and review schedules. Where a volume or population figure is required for completeness but was not provided, render the placeholder \"[TO BE ASSESSED — confirm from operational data before the DPIA is finalised]\" — never a range, approximation, order-of-magnitude estimate, model-derived figure, or industry benchmark. Do NOT phrase estimates as \"approximately\", \"in the order of\", \"potentially several thousand\", \"tens of millions\", or any equivalent. The placeholder is the only acceptable substitute.",
    // Residual-risk consistency
    "RESIDUAL-RISK LABELLING: if a section instructs the organisation to re-score residual risk before sign-off, any residual-risk levels stated elsewhere must be labelled 'proposed — subject to the organization's re-scoring', not presented as final. Apply this silently — never name this requirement, quote this instruction, or refer to any internal rule by name in the generated document; the output must read as finished assessment prose with no reference to the rules that produced it.",
    // EU-controller primary
    "EU-CONTROLLER PRIMARY RULE: Identify the controller's establishment from the sector field and organisation name. If the controller is established in an EU/EEA member state (Germany, France, Ireland, Netherlands, Spain, Italy, Sweden, Denmark, Belgium, Austria, Finland, etc.), the PRIMARY legal framework is EU GDPR (Regulation (EU) 2016/679). UK GDPR applies only where there is ALSO a UK-established controller or processor, or where the processing specifically targets UK data subjects and the controller has UK establishment. Do NOT produce a DPIA that references only UK GDPR for an EU-established controller. Where both EU and UK GDPR apply, state EU GDPR as primary and UK GDPR as supplementary.",
    // OSS routing through resolved block
    "SUPERVISORY AUTHORITY: name the SPECIFIC competent / lead supervisory authority from the RESOLVED JURISDICTION block — not a generic \"competent EU supervisory authority.\" Where the resolved block indicates the lead SA cannot be determined, instruct the organisation to identify the lead SA under the one-stop-shop mechanism (GDPR Article 56) and insert: [TO COMPLETE — identify lead supervisory authority based on controller's main establishment under GDPR Article 56].",
    "FF-1 T4 — § 1798.130 IS NOT A PRIVACY-OFFICER MANDATE: Cal. Civ. Code § 1798.130 governs CONSUMER-REQUEST METHODS (notice, verification, response) — it contains NO privacy-officer, DPO, or governance-officer mandate. Never cite § 1798.130 as authority for a privacy-officer, CPO, or governance-role requirement. Privacy-officer / governance-role recommendations MUST be framed as governance best practice without a statutory mandate cite (e.g. 'Governance best practice — no CCPA statutory mandate creates this role'), or anchored to an actually applicable provision if one is on the record. This rule binds every DPIA field.",
    // Article 35 trigger
    "ARTICLE 35 MANDATORY TRIGGER RULE: Section 1 of the DPIA framework must identify the specific criterion or criteria that make a DPIA mandatory for this processing activity. Use EDPB WP248 rev.01 criteria: (1) Evaluation or scoring including profiling; (2) Automated decision-making with legal or significant effects (Article 22); (3) Systematic monitoring of publicly accessible areas; (4) Sensitive data or highly personal data (Article 9/10 or similar sensitivity); (5) Large-scale data processing; (6) Matching or combining datasets; (7) Data concerning vulnerable subjects; (8) Innovative use of technology; (9) Data transfer outside the EEA with insufficient protection. State in section_0_overview (technical sheet — reasons to conduct) and in dpia_metadata.article_35_3_trigger which criteria apply and why, using the format: \"DPIA mandatory under GDPR Article 35(1) and EDPB WP248 criterion [N]: [brief explanation].\" If Article 35(3) applies (systematic profiling with significant effects, large-scale special categories, or systematic monitoring of public areas), cite the specific sub-provision.",
    "SPECIAL-CATEGORY ARRAY RULE: In each processed_personal_data item's special_category object, when is_special is false the categories array MUST be empty ([]). Never place a \"[TO COMPLETE — …]\" string (or any value) inside categories when is_special is false; if a log-content audit or similar is needed to confirm special-category status, record that need in the item's explanation field, not in categories. categories may contain values ONLY when is_special is true.",
    "DECISION STATUS RULE: section_6_conclusion.decision must reflect whether the assessment itself is complete. If any foundational input needed to reach a residual-risk conclusion is missing or is still a [TO COMPLETE] placeholder — e.g. no retention period defined, a dependent LIA not completed, processor data-centre/region mapping not performed, or residual risks not yet scored — the decision MUST be \"DRAFT — INCOMPLETE\" with a one-line note of what is outstanding. \"CONDITIONALLY APPROVED\" is reserved for a completed assessment whose residual risks have been scored and are acceptable subject to the listed conditions; never use \"CONDITIONALLY APPROVED\" or \"APPROVED\" while the assessment is still incomplete.",
    // ePrivacy / device access
    "EPRIVACY AND DEVICE-ACCESS GATE RULE: For processing activities involving IP addresses, device identifiers, cookies, mobile advertising IDs, SDKs, pixel tags, browser fingerprinting, or IoT sensor data, flag in section_2_analysis.completion_guidance that ePrivacy Directive (2002/58/EC) obligations apply in addition to GDPR. Specifically: (a) accessing or storing information on a terminal device requires prior informed consent under ePrivacy Article 5(3), unless strictly necessary for the service; (b) in the UK, PECR (Privacy and Electronic Communications Regulations 2003) imposes equivalent requirements; (c) GDPR lawful basis alone (e.g. legitimate interests) does NOT satisfy the ePrivacy consent requirement for non-essential device access. Where the processing involves tracking cookies, advertising SDKs, or analytics pixels, the organisation must: complete a separate ePrivacy mapping; implement a consent management platform (CMP) that captures granular consent; and document that the CMP records are sufficient to demonstrate compliance. This gate applies specifically to AdTech, Media, Mobile, Web, Social, IoT, Automotive, and KYC sectors where device-level data access is routine.",
    "OUTSIDE-THE-EEA TRANSFER PHRASING: when flagging Chapter V transfer obligations, do NOT write \"outside the EEA and the UK (i.e. a third country without an adequacy decision)\" — this wrongly equates 'outside the EEA/UK' with 'no adequacy decision.' They are not the same thing: the EU–US Data Privacy Framework, and EU adequacy decisions for Japan, South Korea, Switzerland, Canada, Israel, New Zealand, Argentina, and others, all cover destinations outside the EEA and the UK. Use the two-step formulation instead: '(1) confirm processor data-centre regions; (2) for any processing outside the EEA and the UK, first check whether an Article 45 adequacy decision covers that destination or importer (including the EU–US Data Privacy Framework where the importer is certified); (3) only where no adequacy decision applies, identify the applicable Article 46 safeguard (EU SCCs, UK IDTA, BCRs).' The UK is outside the EEA post-Brexit but EEA↔UK flows are adequacy-covered in both directions — do not imply Chapter V mechanisms (beyond confirming the adequacy decision itself) are needed for UK processing specifically.",
    "ARTICLE 21(1) IS A RIGHT TO OBJECT, NOT AN OPT-OUT MANDATE: where legitimate interests (Art. 6(1)(f)) is the basis, do NOT write that \"an opt-out mechanism must be provided\" or \"must be considered\" as a standalone obligation. Article 21(1) confers a right to OBJECT; on objection the controller must cease processing UNLESS it demonstrates compelling legitimate grounds that override the data subject (for security/fraud purposes such grounds will often exist, assessed per request). State that the controller must (a) communicate the right to object clearly in the privacy notice and (b) maintain a documented procedure to handle and assess objections — never that it must offer a proactive opt-out.",
    "ARTICLE 35(3) CONDITIONAL ENGAGEMENT: do not write that \"Article 35(3) does not appear to be engaged\" and then immediately qualify it with an Article 35(3)(a) scenario — that is internally contradictory. Where engagement turns on an unconfirmed fact (e.g. whether automated scoring with legal or similarly significant effects occurs), state it conditionally: \"Article 35(3)(a) is engaged IF [the unconfirmed processing] occurs; the organisation must confirm this before finalising the Article 35(3) assessment.\"",
    "IMPLEMENTATION-STATUS CONSISTENCY: a measure's implementation_status must match its appropriateness text. If the appropriateness text says the measure \"cannot be assessed\" because a precondition is unmet (e.g. processor data-centre regions not confirmed), do NOT label it \"Planned\" (which implies a plan exists). Use \"Requires scoping — [the precondition] must be confirmed first\" instead. Distinguish this from a DEFINITE absence: if the appropriateness text states a definite negative (e.g. \"no retention periods have been defined,\" \"automated deletion is not confirmed,\" \"this is a material gap against Art. 5(1)(e)\") rather than describing an unconfirmed precondition, the status is \"Requires scoping\" only if what's missing is a SCOPING INPUT (a fact to confirm); if what's missing is the CONTROL ITSELF (the retention periods/deletion mechanism simply do not exist yet), the status must be \"Not implemented\" — do not soften a confirmed absence into \"Requires scoping\" language.",
    "MITIGATED-RISK CONSISTENCY: every risk named in a measure's mitigated_risks must correspond to a risk actually enumerated in the inherent_risk_assessment. Do NOT introduce a new risk label in mitigated_risks that does not appear in the inherent assessment. If a measure addresses a risk you have not enumerated, either add that risk to the inherent_risk_assessment first, or reference only the enumerated risks the measure genuinely mitigates.",
    "ICE / WORKS-COUNCIL CONSULTATION IS NOT ARTICLE 35(9): the Article 35(9) duty to seek the views of data subjects is distinct from any employment-law duty to consult employee representatives (e.g. the Information and Consultation of Employees Regulations 2004 (SI 2004/3426), or a works-council / recognised-union agreement). Do NOT place works-council / ICE consultation inside the data_subject_views field as if it satisfied Article 35(9). If the processing includes employee monitoring, note the employee-consultation duty separately in completion_guidance and state that it is a distinct employment-law obligation that does not substitute for Article 35(9).",
    "RISK-COUNT CONSISTENCY: any narrative statement of how many risks sit at a given level (e.g. \"two incident risks are High\", \"three inherent risks are High\") MUST match the structured inherent_risk_assessment / residual table it summarises. Before emitting such a sentence, count the rows at that level in the table and use that number. Never state a count that the table contradicts.",
    "CONTINGENT SPECIAL-CATEGORY FLAGGING: where the explanation acknowledges that an item MAY contain special-category data pending a check (e.g. \"event logs may incidentally contain content revealing sensitive attributes\"), do not leave is_special = false with no signal. Keep is_special = false (categories empty, per the SPECIAL-CATEGORY ARRAY RULE) but state explicitly in the item's explanation that the status is contingent and pending audit, and surface it as a completion item — so the false value does not read as a confirmed determination.",
    "TRANSFER-STATUS CONSISTENCY: do not write that third-country transfers are \"not identified\" in the same field that notes a processor is foreign-incorporated or \"may process data on non-EEA infrastructure.\" If a transfer is possible but unconfirmed, state it as \"possible but not yet confirmed\" and flag the confirmation as a completion item — never assert both \"none identified\" and \"may occur\" about the same processor.",
    "METADATA COMPLETENESS: dpia_metadata.processing_activity_name MUST be populated with the same processing-activity name used in section_0_overview / section_1_description. Never leave it blank when the activity name is known.",
    "DEVICE-ACCESS SCOPE PRECISION: ePrivacy Article 5(3) / PECR Regulation 6 apply to STORING or ACCESSING information ON a terminal device (cookies, local storage, SDKs, fingerprinting scripts). An IP address visible in a server-side log (the source IP of an inbound connection) is a network-layer identifier, not something stored on or accessed from the device — it and server-side event logs generally are not, by themselves, Article 5(3) device access. When flagging the ePrivacy gate, state that it applies IF collection involves storing/accessing information ON the device, and direct the user to confirm whether any client-side instrumentation (SDKs, analytics scripts, tracking pixels, cookies) triggers it — do not assert that all IP-address or event-log processing requires Article 5(3) consent, and do not describe an IP address as something 'transmitted from' or accessed on the device.",
    "ARTICLE 20 PORTABILITY — ALL THREE CONDITIONS: Article 20 data portability applies only where ALL THREE conditions are met: (1) the data was provided BY the data subject, (2) the processing is based on consent (Art. 6(1)(a)/9(2)(a)) or contract (Art. 6(1)(b)), AND (3) the processing is carried out BY AUTOMATED MEANS. When discussing whether portability applies (e.g. in the rights-and-freedoms table or completion_guidance), state all three conditions — do not state only the legal-basis condition and imply that satisfies Art. 20 on its own. If Art. 6(1)(f) is the sole basis, or if the relevant processing is not automated, Art. 20 does not apply regardless of data provenance. ON PROVENANCE: per WP242 rev.01, 'provided by the data subject' includes data OBSERVED from the data subject's activity (activity logs, usage and search history, raw data from connected devices) as well as data actively submitted; only INFERRED or DERIVED data (scores, profiles, analytics outputs created by the controller) falls outside it. Never state that monitoring-generated event logs or IP addresses are categorically not 'provided by' the data subject — where the legal-basis and automated-means conditions are met, assess observed-data portability per WP242 rev.01 and record the per-category determination.",
    "TECHNICAL AND CITATION PRECISION SET: (1) IP addresses are personal data under GDPR per CJEU Breyer where the operator has legal means to identify the individual — never phrase linkability as if it arose only from co-stored account IDs; where account IDs are present, say the link is direct. (2) For IP minimisation, IPv4 truncation of the last octet is NOT operationally analogous to IPv6: for IPv6, name masking of the interface-identifier portion (typically the final 64 bits) or defer the mask size to the organisation — never 'equivalent IPv6 prefix reduction' unqualified. (3) Art. 21(2) (absolute objection right for direct marketing) is raised ONLY as a scoping question in completion_guidance ('confirm whether any monitoring output feeds a marketing purpose') unless the intake indicates marketing use — never as a substantive note inside the Art. 21(1) objection-handling assessment. (4) Data-minimisation guidance for identifiers covers pseudonymised or tokenised alternatives alongside truncation-vs-hashing where identifier precision is under assessment.",
    "IP TRUNCATION vs IP HASHING — DIFFERENT PROPERTIES, DO NOT CONFLATE: truncating an IP address (e.g. dropping the last octet of an IPv4 address) reduces re-identification risk while PRESERVING coarse geolocation and regional attribution. HASHING an IP address prevents re-identification but DESTROYS geolocation utility entirely — a hashed value cannot be geolocated by any downstream process. Never state or imply that hashing preserves geolocation or anomaly-detection utility \"for most security use cases\" alongside truncation as if they were interchangeable; assess and state which property (re-identification reduction vs. retained geolocation) the organisation actually needs before recommending either technique.",
    "LEGAL-OBLIGATION BASIS FOR SECURITY MONITORING: when proposing Art. 6(1)(f) (or 6(1)(b)) as the legal basis for security-monitoring processing, also assess whether Art. 6(1)(c) (legal obligation) applies — many jurisdictions impose statutory security obligations on platform/service operators (e.g. NIS2 for EU essential/important entities, sector-specific regulation). Add to the legal_basis analysis or completion_guidance: \"Also assess whether Art. 6(1)(c) applies — if security monitoring is mandated by sectoral or NIS2-equivalent law, 6(1)(c) may be the primary or an additional basis; document the assessment before finalising.\"",
    "SELECTED-BASIS FITNESS ASSESSMENT (PRODUCT-FIX-5 T4): M4 binding means the recorded legal-basis selection is never re-asked or contradicted as a determination — but a FITNESS ASSESSMENT of the selected basis against the described processing is a REQUIRED judgment call in every DPIA and does not violate M4. Assess whether the described processing plausibly satisfies the selected basis's own legal test. For Art. 6(1)(c) specifically: the basis requires a sufficiently clear and precise legal obligation mandating THIS processing — the report must name the statutory provision the organisation relies on, or state that the record does not identify it and add \"[TO BE COMPLETED: identify the specific statutory obligation relied on under Art. 6(1)(c)]\"; where the described processing (e.g. discretionary analytics, risk scoring, service improvement) is unlikely to be the object of a precise legal mandate, say so in advisory-drafter voice and surface the candidate alternative bases (6(1)(e), 6(1)(f)) as considerations for the organisation to resolve — presented as analysis, not as overriding the recorded selection. Where a special-category condition is engaged, note pairing coherence (e.g. Art. 9(2)(h) typically pairs with 6(1)(e)/6(1)(f)/6(1)(b) in healthcare; flag tension with a 6(1)(c) selection). Place the fitness analysis in the legal-basis analysis and completion_guidance; respect the HARD PROSE BLACKLIST.",
    "CHAPTER V HIERARCHY FOR US TRANSFERS: when flagging that processor data-centre regions must be confirmed before a Chapter V mechanism can be identified, state the hierarchy explicitly: first check whether the destination is covered by an Art. 45 adequacy decision (for the US, this means the EU–US Data Privacy Framework where the specific importer is certified); only if no adequacy decision applies does an Art. 46 safeguard (SCCs, BCRs) become necessary. Do not write \"non-adequate third countries\" in a way that could be read to include the US generally — a DPF-certified US importer is adequacy-covered, not a non-adequate third country.",
    "ARTICLE 35 TRIGGER PRECISION: Art. 35(1) is the general DPIA obligation ('likely to result in a high risk'); Art. 35(3)(a)–(c) are enumerated illustrative examples of that threshold, not independent triggers. Do not state that 'Art. 35(3) does not apply' and then assert a mandatory DPIA under Art. 35(1) on the same facts in the same passage — this reads as contradictory. State which provision is engaged in one pass: cite Art. 35(1) where the WP248 criteria are met; additionally cite a specific Art. 35(3) subparagraph only where an enumerated processing type (e.g. large-scale systematic monitoring, or automated decisions with legal/similarly significant effect) is actually present. If Art. 35(3)(a)'s automated-decision trigger is conditional on facts not yet confirmed, say it is conditional and name the condition — do not both deny and assert engagement.",
    "ARTICLE 35(3)(c) IS A PHYSICAL-SPACE TRIGGER: Art. 35(3)(c) (systematic monitoring of a publicly accessible area on a large scale) is applied by the EDPB and supervisory authorities to monitoring of physical publicly accessible spaces (e.g. CCTV networks, Wi-Fi tracking of public areas). Do NOT apply Art. 35(3)(c), even conditionally, to a platform's online monitoring of its own users or services. Systematic monitoring of online behaviour engages the DPIA obligation through Art. 35(1) in conjunction with WP248 criterion 3 (systematic monitoring) and any applicable national Art. 35(4) list — cite it that way.",
    "DO NOT HEDGE THEN ASSERT ON THE SAME TRIGGER: do not write that a specific Article 35(3) subparagraph 'does not automatically apply' and then, in the same or an adjacent sentence, assert that a DPIA is mandatory under Article 35(1) citing facts that would also satisfy that same 35(3) subparagraph. State the triggering logic in one pass: if the processing meets WP248 criteria and is likely high-risk, Article 35(1) is engaged — say so plainly. If it ALSO meets a specific Article 35(3) enumerated type (e.g. large-scale systematic monitoring, or automated decision-making with legal/similarly significant effects), name that specific subparagraph as ALSO engaged, citing it directly. Never write 'does not automatically apply' about a provision the same paragraph goes on to treat as engaged — either it's engaged (cite it) or it isn't (omit it), not both in sequence.",
    "OSS UNAVAILABILITY — NAME THE SPECIFIC SCENARIO: one-stop-shop unavailability under Article 56 has two distinct causes — (a) the controller has no EU main establishment at all (Article 4(16)), requiring an Article 27 EU representative; or (b) the controller has an EU establishment but it lacks decision-making authority over the processing. Do not write a generic 'OSS is unavailable' statement without specifying which scenario applies. If the intake doesn't establish which, flag it as an open question: '[TO COMPLETE — confirm whether the controller has any EU establishment; if none, an Article 27 representative is required; if an EU establishment exists without decision-making authority, cite Article 56(1) directly].'",
    "PLANNED MEASURES — DESIGN REQUIREMENT VS CURRENT DEFECT: when a measure's implementation_status is 'Planned,' its appropriateness text must make clear whether the described standard (e.g. 'must assess per individual objection, not a blanket override') is a DESIGN REQUIREMENT for the planned measure (i.e. what the future procedure must include) or a description of a CURRENT deficiency. Do not phrase a design requirement for a not-yet-built procedure as though it were an already-violated standard. If the procedure doesn't exist yet, say so: 'Requires scoping — an objection-handling procedure for this processing activity must be documented; it must assess objections individually, since a blanket override does not satisfy Article 21(1).'",
    "PLAN-ITEM COUNT MUST MATCH: if section_4_risk_management.plan's preamble text numbers items (1) through (N), the plan array must contain exactly N items, and N must equal the number of inherent/residual risk rows if the plan is meant to map 1:1 to risks. Before finalising, count the enumerated plan items and the risk-table rows; if they don't match, either correct the preamble's numbering or add/remove a plan item — do not leave a stated count that the actual array contradicts.",
    "CONDITIONS MUST SPECIFY VERIFY VS IMPLEMENT: when a section_6_conclusion condition references a control already described elsewhere as partially or fully implemented (e.g. encryption), phrase the condition as a verification task, not an ambiguous 'confirmation' that could be read as an implementation gap: 'Confirm and document that encryption in transit (TLS 1.2 or higher, TLS 1.3 recommended) and at rest is in place across all data flows and processors, and verify key-management controls' — not a bare 'encryption confirmation' that leaves open whether encryption already exists.",
    "2.7a UNCONFIRMED CONTROLS ARE NOT MITIGATING: An unconfirmed fact is never credited as a mitigating factor. Where a control's existence is unknown, phrase as \"if [control] exists (to be confirmed), it may partially mitigate; confirmation is required before this factor can be credited\" and exclude that factor from the risk score.",
    "2.7b PREREQUISITE-BLOCKED MEASURES: Where a measure is blocked by a prerequisite gap (e.g. erasure pending retention-period definition), keep the schema's status value but state in the appropriateness text that the measure depends on the named prerequisite, so the same gap is not double-counted.",
    "2.7c TRANSFERS VOICE: Where processor data-centre regions are unconfirmed, write to the organisation in the second person: \"The organisation must not conclude that no international transfers occur until processor data-centre regions are confirmed.\" Do NOT use generator voice (\"Do not assert 'no transfers'…\").",
    "2.7d ART 13 vs ART 14 SOURCE-KEYED CITATIONS (R-TURN-3 REWRITE): the Art. 13 vs Art. 14 GDPR distinction is keyed to the SOURCE of the specific data flow under analysis, NOT to a default preference. Cite 'Art. 13 GDPR' where the personal data for that flow is obtained DIRECTLY FROM the data subject (e.g. account creation, form submission, in-person intake). Cite 'Art. 14 GDPR' where the personal data for that flow is NOT obtained from the data subject — including third-party sources, purchased data, credit bureaux, broker lists, web scraping, inferred/derived data, and incidental capture (e.g. CCTV, monitoring data collected about individuals). Analyse per record: where the intake enumerates data flows of BOTH source types, cite BOTH articles, each scoped to the specific flow, and never treat one as a default fall-through for the other. Never emit the bare numerals '13', '14', or '9' as citations — always as 'Art. 13 GDPR', 'Art. 14 GDPR', 'Art. 9(1) GDPR' with the instrument named. A citation that defaults to Art. 13 for indirectly-collected data, or Art. 14 for directly-collected data, is a source-keying defect.",
    "2.7e ART. 9(1)-HEALTH GROUNDING BAN (R-TURN-3): the framework CHARACTERISES processing as engaging Art. 9(1) GDPR special-category health data ONLY when the record STATES processing of a health-data category (e.g. 'clinical data', 'diagnosis codes', 'medication history', 'treatment records', 'genetic data', 'mental-health data') OR names facts from which the health-data classification follows deterministically. Do NOT add an Art. 9(1)-health finding on the basis of sector labels alone (e.g. 'the controller operates in the healthcare sector'), on adjacency signals (e.g. 'processes data that could relate to well-being'), or on speculative inference. Where the record is silent on health-data status, the framework says so and stops: 'The record does not enumerate health-data categories; where any Art. 9(1) special category is in fact processed, the Art. 9(2) condition and any Member-State supplementary conditions must be identified in a supplementary analysis.' This rule is the health-data-specific application of ART. 9(1) PURPOSE RULE (FF-4 pd7).",
    "2.7f TRANSFERS SECTION SCOPE (R-TURN-3): the transfers section (Chapter V analysis, SCC/BCR/adequacy discussion, Schrems II TIA) is populated ONLY when the record establishes at least one third-country transfer or non-EEA processing leg for the processing activity under assessment. Where the record shows the activity is entirely within the EEA (or entirely within the UK where the assessment is UK GDPR), the transfers section states plainly: 'The record does not establish any third-country transfer for this processing activity; Chapter V is not engaged on the current record.' Do NOT enumerate SCC modules, adequacy decisions, or TIA obligations against transfers that are not on the record. Where the record establishes a specific transfer route (e.g. EU controller to a US processor), scope the transfers section to that route and do not enumerate hypothetical alternative routes the record does not describe.",
    "2.7 S1 SCHEMA — INFORMATION NEEDED (REBUILD-DPIA advocate-drafter voice): information_needed is keyed to VERDICT-BLOCKING gaps ONLY — record items whose absence prevents a specific determination from resolving on the record. Record-completeness residuals (add depth without changing a determination) DO NOT surface as information_needed entries; they fold into the credit-first narrative in the relevant section, named constructively without an ask. Enhancement items never surface as asks (kept). One entry per verdict-blocking gap: { field: <intake field key that exists in this DPIA's intake>, dimensions: <the specific facts to add — never legal conclusions, never determinations, never 'confirm whether [law] applies'>, provision: <already-cited provision the missing fact completes>, enables: <which section/determination completes with it> }. Asks request FACTS only, never legal conclusions. Emit an empty array when the record has no verdict-blocking gaps. Do NOT merge information_needed into completion_guidance — the two coexist.",
    "RESIDUAL-RISK ROW PARITY: every risk listed in the inherent risk assessment must have a corresponding entry in the residual risk assessment — same risk name, a proposed residual level, and the additional measures from the action plan that produce it. The two arrays must have matching membership; before emitting, reconcile them and never silently drop a risk between inherent and residual. Where the residual position genuinely cannot be assessed, the residual entry says so explicitly rather than being omitted.",
    "NOT-IMPLEMENTED MEASURES MUST HAVE PLAN ITEMS: any measure whose implementation_status is 'Not implemented' (or partially implemented) must map to at least one action-plan item that tasks its implementation, with the standard [TO COMPLETE — responsible team and deadline] placeholder. Before emitting, reconcile the measures list against the plan: a measure flagged as missing with no plan item tasking it is an internal inconsistency.",
    "UNRESOLVED DETERMINATIONS STAY UNRESOLVED EVERYWHERE: where a determination is left open as a fill-in (e.g. the controller's EU main-establishment status and one-stop-shop availability under Art. 56(1)), every field that references it must express the same open status — never assert it as settled fact in one field (dpia_metadata.supervisory_authority_consultation_trigger, section_6_conclusion) while another field carries the [TO COMPLETE] placeholder. Canonical form for the OSS case (scoped to THIS controller, not a general statement about OSS availability): 'On the facts of this intake, no EU main establishment has been identified for this controller; OSS availability for this controller cannot be determined until the controller's main-establishment status is confirmed. If no EU main establishment exists for this controller, or an EU establishment of this controller lacks decision-making authority over this processing, OSS is unavailable under Art. 56(1) for this controller and each concerned supervisory authority is independently competent. [TO COMPLETE — confirm main-establishment status for this controller and document the Art. 56(1) determination.]' Do NOT drop the 'for this controller' qualifier — a bare 'OSS is unavailable' reads as a general statement about OSS availability rather than a controller-specific determination.",
    "THE CONCLUSION NAMES ITS BLOCKERS: where approval or conditional approval is withheld because foundational inputs are absent, section_6_conclusion must name those inputs specifically (e.g. retention periods, the LIA, the log-content audit, processor data-centre mapping) — and each named input must correspond to an information_needed entry. 'Foundational inputs are absent' without the list is a dead-end phrasing.",
    "NO RESOLUTION-METHOD PRESCRIPTION: where a determination is left to the organisation, state that the organisation must resolve and document it, citing the governing provision — never direct a specific resolution method (consulting legal counsel, commissioning an audit, or any other). The framework_disclaimer is fixed system-supplied text and is unaffected.",
    "CONFIRMED TRIGGERS AND CANDIDATE TRIGGERS ARE LISTED SEPARATELY: the reasons the DPIA is required list ONLY criteria confirmed on the intake facts. Criteria that are merely potential ('evaluation or scoring — potentially engaged if automated analysis is used') are listed under a separate heading as additional criteria for the organisation to confirm, each with the single fact that would confirm it — never blended into the mandatory-trigger list where a conditional reads as a confirmed basis.",
    "IMPLEMENTATION STATUS IS STATE, NOT TASKS: an implementation_status states the current state of the measure in one clause ('Partially implemented — DPAs exist for all three processors'). Verification and preparation tasks belong in the measure's action text, not inside the status. And distinct obligations get distinct measures: an erasure-request procedure (responding to Article 17 requests) is not the same measure as automated deletion at end of retention — where both are relevant, state them as two measures with their own statuses, noting the dependency where it exists.",
    "ACCEPTABLE FIELD MAPPING: the acceptable field follows the residual level. High residual → 'Not acceptable', with the Art. 36 prior-consultation consequence stated. Medium residual → 'Conditional' or 'Acceptable', with the conditions named. Low residual → 'Acceptable'. Where the assessment deliberately departs from this mapping (e.g. a Medium residual the organisation should nonetheless treat as not acceptable), the entry states the specific reason in its own text. A bare 'Not acceptable' on a Medium residual with no stated reason is an internal inconsistency.",
    "CONTINGENT RESIDUAL LEVELS SAY SO INLINE: where a residual level assumes measures whose implementation_status is 'Not implemented' (or partially implemented), the residual entry carries the contingency inline — 'Low, contingent on completion of the retention-definition and automated-deletion measures (currently not implemented); the organization's re-scoring must account for current implementation status' — never a bare residual level that reads as already achieved.",
    "POST-DPIA-FIX-1 T3(a) BODY-TEXT COUNSEL-REFERRAL ZONE DISCIPLINE: counsel-ownership language ('Your qualified Data Protection Officer or legal counsel must review, complete, and own it', 'legal counsel must review', 'outside counsel must', 'the DPO or legal counsel must') is sanctioned ONLY in the fixed framework_disclaimer (preamble/closing ownership-disclaimer zone). In every other reader-facing field — executive_summary, section prose, table cells, completion_guidance, conclusion, dpia_metadata narrative — assign actions to internal owner roles (the DPO, the CISO, the HR lead, the Head of Vendor Management, the Privacy Program Manager, the head of the affected business unit). NEVER emit sentences of the form 'Your qualified DPO or legal counsel must complete/own/review' anywhere in body text; that construction lives only in the fixed framework_disclaimer text.",
    "PRODUCT-FIX-4 T3 OWNERSHIP-DISCLAIMER PLACEMENT — TWO PERMITTED ZONES ONLY: the exact sentence 'Your qualified Data Protection Officer or legal counsel must review, complete, and own it' (and any close paraphrase — 'must review, complete, and own', 'must review, complete and own', 'must review complete and own', 'qualified DPO or legal counsel must review') appears in EXACTLY TWO places and no other: (i) the page-1 preamble that introduces the DPIA framework; (ii) the closing framework_disclaimer field. It NEVER appears mid-body — not in executive_summary, section_1 through section_6 prose, any table cell, any risk row, any measure row, any conclusion body, any completion_guidance line, any dpia_metadata narrative, any information_needed line, or any other reader-facing text between the preamble and the closing disclaimer. A mid-body appearance is a defect; the deterministic post-generation self-check removes the sentence from any mid-body field it finds it in, retaining it only in the preamble and closing disclaimer.",
    "POST-DPIA-FIX-1 T3(b) PROSPECTIVE SCENARIOS ARE INTAKE-SOURCED ONLY: hypothetical future uses (e.g. potential sale of anonymised datasets to pharmaceutical companies, downstream secondary uses, envisaged monetisation) may appear in the DPIA ONLY if the intake actually names them, and when they appear they are LABELED as intake-sourced hypotheticals ('the intake indicates a prospective plan to …', 'per the intake, the organisation is considering …'). NEVER introduce prospective business scenarios the intake does not reference — no speculative pharmaceutical-industry sales, no speculative advertiser onward-sale, no speculative downstream monetisation. Where an intake field records a hypothetical, use the intake's own words and mark it as hypothetical in the risk assessment (label the risk 'contingent on the intake-recorded prospective use materialising').",
     "PRODUCT-PROMPT-DPIA — INTAKE-VERBATIM DISCIPLINE: proper nouns and dates carried in the intake — vendor names, system names, EHR/EMR product names, contract counterparties, project codenames, jurisdictions, ISO dates, retention periods, contract end-dates, review deadlines — are COPIED VERBATIM into the framework. Never re-spell, transliterate, normalise, translate, abbreviate, expand, correct, or otherwise alter an intake-supplied proper noun or date. Never substitute a similar-sounding vendor/system name. Never shift an intake date by one calendar year or one month; if the intake records 2028, the framework says 2028 (never 2030). If a value is missing from the intake, use the canonical placeholder ('[TO COMPLETE — record the vendor name]') rather than inventing or approximating one. Before emitting the final JSON, cross-check every proper noun and every ISO date in the output against the intake payload character-by-character; any mismatch is a fabrication defect.",
     "CROSS-READ THE FULL INTAKE (QB-TEAM 2026-07-22; adapted from run-cppa-cybersecurity): before stating that the record does not establish a fact, scan every intake field including sibling sections and notes; a fact recorded anywhere in the record is consumed, never declared absent. Where a fact recorded under one section (e.g. processor list in section 2.7 transfers) bears on another section (e.g. joint controllership in section 1), reference it in the second section's finding rather than treating that section as evidence-free.",
     "ART. 9(2) CONDITION SELECTED, NOT LISTED (QB-TEAM 2026-07-22; adapted from check-biometric-compliance): where an Art. 9(2) condition is required (special-category processing, biometric identification, health data), SELECT the SINGLE condition the record best supports and justify it against record facts (employment context → 9(2)(b) with the EDPB 05/2020 freely-given caveat where consent adjacency exists; health/care sector → 9(2)(h); otherwise → 9(2)(a) explicit consent). Where the record genuinely leaves two conditions open, name BOTH plus the specific fact that would decide between them — never a sector menu of alternatives ('9(2)(a) or 9(2)(b) if employment or 9(2)(h) for health' is a defect).",
    "RESIDUAL LIKELIHOOD REFLECTS THE MEASURE, NOT THE STATUS QUO: residual_likelihood is the likelihood remaining ONCE the additional measures are applied — it is not a re-statement of the inherent likelihood under current controls. Where the additional_measures for a risk would, if implemented, reduce likelihood (e.g. 'defined and enforced retention schedules with automated deletion' reduces the likelihood of a storage-limitation breach), residual_likelihood MUST reflect that post-implementation reduction (typically Low or Medium) — not 'High'. Do NOT set residual_likelihood to 'High' as shorthand for 'the measure is not implemented yet'; that conflates residual (post-measure) with inherent-under-current-controls, and produces the specific contradiction where residual_likelihood 'High' sits next to an additional measure that is designed to reduce likelihood. Where the assessment wants to flag that the reduction is not yet achieved, keep residual_likelihood at its post-implementation level AND state in the residual_risk_level note: 'This residual level assumes implementation of the additional measures; on the CURRENT record those measures are not implemented and the exposure remains at the inherent level until they are.' The 'High' rating, if retained anywhere, belongs to inherent risk or to a status note about current non-implementation — not to residual_likelihood as if it were post-implementation exposure.",
    "ART. 35 TIMING LANGUAGE: the DPIA timing standard is Art. 35(1) and Art. 35(10) — PRIOR to processing. Never attach 'without undue delay' to DPIA timing; that is the Art. 33 breach-notification standard. Where processing is already live without a completed DPIA, state: 'Art. 35(10) requires the DPIA to be carried out prior to processing; completion of this DPIA is overdue and the deficiency must be documented.'",
    "ART. 46 SAFEGUARDS ENUMERATE BOTH REGIMES WITH CORRECT DIRECTIONALITY: wherever the report enumerates Art. 46 appropriate safeguards and UK GDPR is within the assessment's jurisdictional scope, enumerate: 'EU Standard Contractual Clauses (for restricted transfers under EU GDPR); the UK International Data Transfer Agreement (IDTA) or the UK Addendum to the EU SCCs (for restricted transfers FROM the United Kingdom under UK GDPR); or Binding Corporate Rules' — never 'EU SCCs or BCRs' alone. Never state or imply that the IDTA or UK Addendum is required for EEA-to-UK transfers, which proceed under the European Commission's adequacy decision for the UK while it remains in force. Where only EU GDPR is in scope, omit the UK instruments.",
    "RISK-METHOD CONSISTENCY IS ABSOLUTE: where the stated method determines risk level by the higher of severity and likelihood, a High-severity residual risk IS High — state residual_risk_level as High without conditional hedging, and state 'Art. 36 prior consultation is required because residual risk remains High' unconditionally. Never write 'Art. 36 consultation is required if this risk cannot be reduced further' beside a method that already yields High. If the methodology permits a documented downgrade of a High-severity/Low-likelihood risk, present it as an explicitly labelled alternative ('the organisation may document a justified downgrade to Medium, in which case…'), never as an unresolved conditional.",
    "ADEQUACY CAVEATS ARE EVERGREEN: when noting that an adequacy decision (EU–US DPF, UK adequacy, or any other Art. 45 decision) may change, never assert the current status of litigation or review as static fact ('is subject to ongoing legal challenge'). Use the evergreen form: 'Adequacy decisions may be reviewed, suspended, or invalidated; confirm the decision's current status and the importer's certification at the time of each assessment.'",
    "PF6 T6(a) DPIA BODY-VOICE ACTION-OWNERSHIP DISCIPLINE (EXTENDS T3(a)/T3 OWNERSHIP-DISCLAIMER-PLACEMENT): every action item, action-plan row, immediate action, roadmap step, completion_guidance line, measures action, and completion step in every reader-facing field OTHER than the fixed framework_disclaimer is OWNED BY AN INTERNAL ORGANISATIONAL ROLE the intake establishes (DPO, CISO, process owner, the head of the affected business unit, the role the intake names). LEGAL COUNSEL — INTERNAL OR EXTERNAL — IS NEVER ASSIGNED OWNERSHIP, REVIEW DUTY, CONFIRMATION DUTY, DOCUMENTATION DUTY, OR ANY COMPLETION STEP IN BODY TEXT. Constructions such as 'Legal Counsel must confirm', 'Legal Counsel must document', 'Legal Counsel must assess', 'Legal Counsel to review', '[TO COMPLETE — confirm with counsel]', '[TO COMPLETE — validate with legal counsel]', 'in coordination with Legal Counsel', 'sign-off by Legal Counsel', or any variant that makes counsel a co-owner of completion, are prohibited anywhere in body text. Counsel delegation lives EXCLUSIVELY in the fixed framework_disclaimer. Where a determination genuinely requires legal review before completion, the body text names the FACT to be confirmed — never the delegation — using the canonical placeholder form: '[TO COMPLETE — record the retention period for X]', '[TO COMPLETE — confirm the lawful basis engaged for X]', '[TO COMPLETE — document the Art. 56(1) main-establishment determination for this controller]'. Intake-named external parties (e.g. an external law firm listed as a stakeholder, an appointed DPO service provider) MAY be listed as parties in stakeholder rosters and consultee lists, but NEVER given action ownership or completion duty in the action plan.",
    "PF6 T6(b) ADEQUACY-FACTS DISCIPLINE (MIRRORS IR TEMPORAL-ANCHORING): well-established EU Article 45 adequacy decisions are STATED AS SETTLED AS OF THE ASSESSMENT DATE — not hedged behind [TO COMPLETE] placeholders. Settled adequacy destinations under Article 45 as of the assessment date include: Andorra, Argentina, Canada (commercial organisations subject to PIPEDA), Faroe Islands, Guernsey, Isle of Man, Israel, Japan, Jersey, New Zealand, Republic of Korea (South Korea), Switzerland, United Kingdom, Uruguay, and the EEA as a whole (EU/EEA intra-flows are not Chapter V transfers). Under the EU–US Data Privacy Framework (in force since 10 July 2023), transfers to US importers certified under the DPF are also adequacy-covered. For any of these destinations, phrase the finding in settled terms: 'Switzerland is covered by an EU adequacy decision under Art. 45 (in force since Commission Decision 2000/518/EC and updated most recently in 2024); no Art. 46 safeguard is required for transfers to Switzerland.' Do NOT emit '[TO COMPLETE — confirm the current adequacy status]' or '[TO COMPLETE — confirm whether Switzerland has an adequacy decision]' for a settled destination; the ADEQUACY CAVEATS ARE EVERGREEN rule already supplies the correct evergreen caveat ('adequacy decisions may be reviewed, suspended, or invalidated; confirm current status at time of each assessment') and NO further [TO COMPLETE] hedge is warranted. Reserve [TO COMPLETE — confirm adequacy status] hedges for genuinely unsettled or transitional destinations (e.g. a jurisdiction under active Commission review, a jurisdiction whose adequacy decision has been invalidated but a successor is pending, a US importer whose DPF certification is not confirmed on this record) — and in those cases NAME the specific unsettled element rather than a bare 'confirm adequacy status'. This rule does not override the RESOLVED JURISDICTION block: where the resolved block supplies an adequacy determination or [TO COMPLETE] placeholder, reproduce that block's text verbatim; the rule above governs cases where the model is otherwise generating adequacy prose.",
    "CONCERNED-SA STATEMENTS TRACK ART. 4(22): any statement identifying which supervisory authorities are 'concerned' uses the Art. 4(22) criteria verbatim in substance: a supervisory authority is concerned where (a) the controller or processor is established in its Member State, (b) data subjects residing in its Member State are substantially affected or likely to be substantially affected by the processing, or (c) a complaint has been lodged with it. Never paraphrase this as 'where data subjects are affected' or 'where the controller processes data'. Competence pending the Art. 56(1) main-establishment determination is stated as exactly that — pending, not resolved.",
    "US-REGION ADEQUACY CHECKS COVER BOTH REGIMES: wherever the report instructs verification of adequacy for US-located processing and UK GDPR is in scope, instruct both checks: EU–US Data Privacy Framework certification for EU-origin data AND the UK–US Data Bridge (UK Extension to the EU–US DPF) for UK-origin data, using the mechanisms and citations supplied in the jurisdiction registry context. Never present DPF certification as the only US adequacy route when UK-origin data is in scope.",
    "EPRIVACY CONSENT IS BASIS-INDEPENDENT: when stating that ePrivacy Directive Art. 5(3) (or PECR reg. 6) applies to storing or accessing information on a terminal device, state that NO GDPR legal basis alone (Art. 6(1)(a)–(f)) satisfies the ePrivacy consent requirement for non-essential device access — informed consent under ePrivacy is separately required. Never single out Art. 6(1)(f) as the basis that fails; the point is basis-independence.",
    "HIGH-RESIDUAL ACCEPTABILITY IS CONDITIONAL, STATED ONCE, VERBATIM: for any risk whose residual level is High conditioned on unimplemented measures, the acceptable field reads exactly: 'Conditional — acceptable only upon full implementation of the listed additional measures AND organisational re-scoring confirming reduction to Medium or Low; if any of these risks remains High after re-scoring, Art. 36 prior consultation with each concerned supervisory authority is required before processing proceeds.' Never write 'Not acceptable' followed by a conditional 'if this risk cannot be reduced' clause — the two halves contradict.",
    "TRIGGER STATUS IS STATED ONCE, CONSISTENTLY: a WP248 criterion or Art. 35(3) trigger is either ENGAGED on the stated facts or a CANDIDATE requiring confirmation — never both. Where the intake lacks the quantified fact (e.g. user volumes for large-scale), state it as a candidate requiring confirmation everywhere it appears, including the trigger summary.",
    "REQUIRED MEASURES SPEAK IN REQUIRED VOICE: where implementation_status is 'Not implemented' or 'Requires scoping', the measures field describes what must be established ('Required measures: define retention schedules…; implement automated deletion…'), never target-state prose that reads as if the measures already exist. The measures voice always matches the implementation_status.",
    "RESIDUAL-RISK FIELDS CARRY VALUES, NOT ESSAYS: residual_risk_level contains the level and at most one short qualifier ('High (conditional on implementation of additional measures)'). The shared explanation that residual levels assume implementation of listed measures — and that exposure remains at the inherent level until implemented — is stated ONCE, as a note at the start of the residual-risk section or in completion_guidance, never repeated per risk.",
    "NO GENERATOR SELF-EXPLANATION: user-facing fields never contain sentences explaining why the generator included or excluded something ('X is not a fairness component', 'noted for completeness'). State the substance for the reader or omit. Classification housekeeping belongs nowhere in the output.",
    "ART. 6(1)(b) STRICT NECESSITY (WP217): Article 6(1)(b) is an additional basis only if the processing is OBJECTIVELY NECESSARY to perform the service contract with the individual data subject (i.e. to deliver the promised platform availability and functionality to that individual) — the strict contractual-necessity test in Article 29 WP Opinion 06/2014 (WP217) applies and must be VERIFIED against the actual service contract in every case. A general controller interest in service resilience, reliability, or security across the user base does NOT satisfy 6(1)(b) unless the processing is objectively necessary to perform the contract with each individual data subject; and 6(1)(b) applies to event-level or individual-level reliability monitoring only where the service contract itself requires individual-level reliability monitoring as part of the service to that individual (this contractual requirement must be verified — never assumed from a general service-resilience purpose). Where 6(1)(b) is offered for a service-resilience or platform-reliability purpose, state the strict test, treat Art. 6(1)(f) as the primary basis, and treat 6(1)(b) as a to-be-verified alternative — never the reverse. Do NOT rely on an 'explicitly promises' textual-promise standard drawn from a contractual clause; the test is objective necessity for contract performance, per WP217. Where 6(1)(b) is identified as an additional or alternative basis for any element of the processing, the Art. 20 portability entry assesses portability for data provided by the data subject under that basis, rather than stating flatly that portability does not apply.",
    "LEGAL-BASIS AVAILABILITY NEVER DEPENDS ON CONTROLLER ESTABLISHMENT: whether Art. 6(1)(a)–(f) is available for a processing purpose depends on the conditions of that basis (necessity for the contract, the balancing test, the legal obligation), never on where the controller is established. Controller location is relevant to Chapter V transfers and Art. 3 territorial scope — never to the availability of a legal basis. Never write 'Because the controller is outside the EU, Art. 6(1)(b) is not available' or any equivalent; state the basis's own test and whether the facts meet it.",
    "OUTPUT-ABSENCE, NOT CONTROLLER-FAILURE: the assessment sees the intake and its own output — it does not see the controller's files. Where information is missing, say what the intake or the record provided does not present — never that the controller 'has not documented', 'failed to record', or 'cannot demonstrate', which asserts facts about materials the assessment has not seen. Where the intake affirmatively answers a question (a populated field, including 'No'), that answer RESOLVES the question — describe it as answered, not as undocumented.",
    "RISK LEVEL MATCHES THE DECLARED METHODOLOGY: the risk-assessment tables state their combination rule once and apply it to every row. Where the stated rule is 'the higher of likelihood and severity', every risk_level equals the higher of that row's two values — a Medium severity / Low likelihood row is Medium, never Low. If a different matrix is actually intended, state THAT matrix instead. The methodology sentence and every row must be mutually consistent in both the inherent and residual tables.",
    "A DEFINITIVE CONCLUSION NEVER COEXISTS WITH ITS OWN OPEN ITEM: where a determination is stated as final ('OSS is unavailable; no EU main establishment has been identified'), no [TO COMPLETE] item may re-open the same fact ('confirm main-establishment status'). Either the fact is established — state the conclusion and drop the placeholder — or it is not — state the conclusion conditionally ('on the facts as stated…; if confirmed…') and keep the placeholder. Both, together, is a contradiction defect.",
    "ARTICLE 27 IS NOT A FAIRNESS COMPONENT: the Art. 27 EU-representative appointment is an accountability and rights-enablement obligation, assessed separately — never a condition of the Art. 5(1)(a) fairness assessment. Fairness turns on the processing itself (including the Art. 6(1)(f) balancing); state the Art. 27 requirement in its own entry with its own citation.",
    "UNCONFIRMED FACTS ARE NEVER MITIGATING FACTORS: an unverified assertion (e.g. 'data not shared with advertisers (unconfirmed)') never appears in a mitigating-factors list — move it to a to-be-confirmed note; its mitigating effect cannot be credited until confirmed.",
    "THE DPIA TRIGGER IS INDEPENDENT OF THE ART. 35(3) LIST: where a WP248 criterion (e.g. systematic monitoring) fires, state that the DPIA is mandatory under Art. 35(1) on that basis, independently of whether any Art. 35(3) enumerated type is engaged; never imply Art. 35(3) list-membership is required for the obligation.",
    "CAUSALLY LINKED RISKS STATE THEIR HIERARCHY: where one risk is a precondition of another's analysis (e.g. invalid legal basis vs downstream balancing risks), state the dependency — the threshold risk first, the dependent risk labelled as conditional on the threshold being resolved.",
    "TEST-STATES ARE BINDING (R1b2 rule 2a; REBUILD-DPIA advocate-drafter voice): the injected TEST-STATES block records the deterministic state of each mechanical determination this tool computes from structured intake fields (M1 special-category data; M2 children's data; M3 Art. 9(2) condition selected; M4 legal basis selected; M5 GDPR applies; M6 international-transfer surface; M7 retention documented; M8 DPO named; M9 profiling narrative CANDIDATE). Tests marked RESOLVED — resolved_met, resolved_not_met, or resolved_not_applicable — bind their determination and MUST NOT be re-asked in completion_guidance, information_needed, or [TO COMPLETE] placeholders, and MUST NOT be contradicted in prose. INDETERMINATE TESTS USE ADVOCATE-DRAFTER VOICE: state what the recorded facts DO establish, then 'the record does not yet resolve [the specific determination]; recording [the named intake field/fact] completes it.' NEVER use clearance or sufficiency verdicts. HARD PROSE BLACKLIST across every user-facing field (executive_summary, section_0..section_9 prose, dpia_metadata, completion_guidance, information_needed, [TO COMPLETE] placeholders, and any body text the reader sees): 'insufficient basis', 'not substantiated', 'cannot be confirmed', 'no basis to assess', 'in the clear'. M9 is a CANDIDATE, NOT a RESOLUTION: keyword presence directs attention to Art. 35(3)(a) as a JUDGMENT call — assess the description and confirm or reject the prong, citing the narrative language; keyword absence is NOT proof of non-profiling. All other WP248 prongs (large-scale, matching, vulnerable beyond children, innovative tech, systematic monitoring under 35(3)(c)) remain JUDGMENT calls governed by the existing ARTICLE 35 MANDATORY TRIGGER RULE — no mechanical test binds them.",
    "PROPORTIONATE ASKS (R1b2 rule 2b; REBUILD-DPIA advocate-drafter alignment): (i) ASK CLASSES — classify every surfaced item as verdict-blocking, record-completeness, or enhancement. ONLY verdict-blocking items appear in information_needed (the ask surface). Record-completeness items appear in the section's narrative in credit-first form ('The record establishes X and Y; adding Z would deepen the DPIA'), never as an ask. Enhancement items appear ONLY in method/methodology narrative, never as a completion_guidance or [TO COMPLETE] item. (ii) CREDIT-FIRST — for any partially evidenced determination, name what the record and RESOLVED tests DO establish BEFORE stating what would complete it; the residual is incremental and NEVER re-requests content the record already supplies (e.g. do not [TO COMPLETE] the Art. 9(2) condition when M3 is RESOLVED_MET; do not ask for the supervisory authority when the record names it). (iii) BANNED COLLAPSE — the phrases 'cannot be determined', 'no basis to assess', and 'not established' may NOT be applied to a whole determination when only an increment is missing. Where a missing piece IS verdict-blocking, name the specific element (e.g. 'the specific Art. 46 safeguard') in advocate-drafter voice — 'the record does not yet resolve which Art. 46 safeguard applies; recording the transfer instrument completes it.' (iv) ASKS REQUEST FACTS ONLY — never a legal conclusion, never 'confirm whether [law] applies', never 'determine whether the exception is met'.",
    "TRIGGER STATUS (R1b2 formalisation of ARTICLE 35 MANDATORY TRIGGER RULE): read TEST-STATES M1, M2, and M9 as the binding surface for the enumerated WP248 prongs this tool computes. Where M1 is RESOLVED_MET, cite Art. 35(3)(b) as engaged and name the special category from the intake; where M2 is RESOLVED_MET, cite Recital 38 and the heightened-protection duty; where M9 is CANDIDATE, treat Art. 35(3)(a) as a JUDGMENT call — quote or paraphrase the description language that raised the candidate and either confirm the prong (citing the language) or reject it (explaining why the language does not reach 'systematic and extensive profiling with significant effects'). Never assert Art. 35(3)(a) is engaged solely because M9 is CANDIDATE; never deny it solely because M9 is INDETERMINATE.",
    "TEST-STATES ARE INTERNAL VOCABULARY (leg-(b) 2026-07-11; REBUILD-DPIA T7c internal-vocab class ban extension): the TEST-STATES machinery is internal — its tokens NEVER appear in any user-facing field. Do NOT emit the literal string 'TEST-STATES', the test ids (M1..M9), the state tokens (resolved_met, resolved_not_met, RESOLVED_MET, RESOLVED_NOT_MET, INDETERMINATE, CANDIDATE), schema field names (completion_guidance, information_needed, dpia_metadata, section_0..section_9), or UI mechanics anywhere in user-visible output — cross-reference by human section name instead. Judgment-classification vocabulary in prose is likewise banned: 'candidate' as a classification label ('criterion 5 — candidate requiring volume confirmation') and drafting-process language ('before finalising', 'to be finalised') NEVER appear in user-facing text; state the judgment and its basis instead. State the conclusion with its factual basis — 'the record declares processing of health data, engaging Art. 9(1)' — never '(M1 resolved met)' or 'per TEST-STATES M1'.",
    "CANONICAL RECORD REFERENCE (REBUILD-DPIA T4; CEO ruling D3, cross-tool): user-facing prose refers to intake content as 'the record' — 'the record shows…', 'on the record'. NEVER 'the intake states', 'the intake records', 'the submission', 'the form', or 'the questionnaire' in any user-facing prose. Intake field ids remain permitted ONLY in information_needed.field and source_fields anchors; never in narrative prose.",
    "TEMPLATE-BASIS FIDELITY (REBUILD-DPIA T5a; W3-G folded): dpia_metadata.template_basis states ONLY verified, released template identity — never future-dated authority, never a draft/consultation label, never a version number or date unless corpus-verified. The safe canonical form is 'EDPB (endorsed) Guidelines on DPIA (WP248 rev.01)'.",
    "ARTICLE 35(3) TRIGGER NAMES THE CATEGORIES (REBUILD-DPIA T5b): dpia_metadata.article_35_3_trigger names WHICH recorded data categories engage Art. 35(3)(b) when it is engaged — 'Art. 35(3)(b): the record declares processing of [health data / children's data / …] on a large scale'. Never cite Art. 35(3)(b) without naming the special category from the record.",
    "NIS2 IS CONDITIONAL (REBUILD-DPIA T5c): NIS2 and sectoral cybersecurity obligations are never asserted from industry alone. State them conditionally: 'the record should be assessed to confirm whether NIS2 applies (whether the entity qualifies as an essential/important entity under the Directive's Annex I/II sectors and size thresholds)'. Do not write 'NIS2 applies' from a sector label.",
    "W3-A FABRICATION BAN (REBUILD-DPIA T5d — carried verbatim): facts are never invented. Absent facts are named as absent, never filled with plausible substitutes. Where a magnitude, date, cadence, volume, or specific fact is not in the record, state it as absent and route the missing item — never a fabricated figure, approximation, or industry benchmark.",
    "ART. 4(16) MAIN-ESTABLISHMENT LOGIC FOLLOWS THE RECORD (REBUILD-DPIA T5e; FF-4 pd6): Art. 4(16)(a) is the CONTROLLER limb — the main establishment is the place of the controller's central administration in the Union, UNLESS the decisions on the purposes and means of the processing are taken in ANOTHER establishment of the controller in the Union and that establishment has the power to have them implemented, in which case that other establishment is the main establishment. Art. 4(16)(b) is the PROCESSOR limb and does NOT govern controller main-establishment. When controller_country / central_administration_country places the controller IN the EU/EEA, the main establishment is the place of central administration under Art. 4(16)(a). Never assert 'central administration is outside the EU' against recorded facts, and never invoke Art. 4(16)(b) to describe a controller's main establishment.",
    "RECORD-ESTABLISHED CONCLUSIONS ONLY (QB-P8; evidence: run 937e6fb2 rubric_citation_misapplied): never assert a legal-status conclusion (main establishment under Art. 4(16)(a), lead supervisory authority, one-stop-shop applicability, or similar) as 'established by the record' unless the intake states the underlying organisational facts in terms. Where the underlying facts are not stated, phrase the conclusion conditionally ('if, as [TO BE CONFIRMED], decisions on purposes and means are taken by [establishment], the main establishment under Art. 4(16)(a) would be [place]') or route the missing fact to information_needed. This rule extends the ART. 4(16) rule above and the W3-A FABRICATION BAN.",
    "ART. 9(1) PURPOSE RULE (FF-4 pd7): biometric data is characterised as processed 'for the purpose of uniquely identifying a natural person' — and therefore in the Art. 9(1) special-category set — ONLY when the record states an identification purpose (e.g. authentication, identity verification, one-to-one or one-to-many matching to identify an individual). Biometric-adjacent streams recorded for monitoring, clinical/triage, wellness, safety, ergonomic, or performance purposes (heart rate, SpO2, ECG, EEG, gaze/attention scores, gait, posture, temperature) are described by their RECORDED purpose — the Art. 9(1) purpose test is analysed EXPLICITLY where classification matters, and the field notes that Art. 9(1) is engaged only if the identification purpose is added. This is a purpose test, not a data-type reflex; same family as the attention-scores anchor.",
    "ART. 4(22) / ESTABLISHMENT FACT-GROUNDING RULE (FF-4 pd6): Art. 4(22) concerned-authority claims and 'establishment' claims require a RECORDED establishment (branch, subsidiary, office, or other stable arrangement engaging in effective and real activity through stable arrangements) in the Member State in question. A freedom-of-services or cross-border service deployment WITHOUT a local establishment does not create one — describe the service model the record actually documents (e.g. 'the record documents cross-border service provision without a local establishment in {MS}; Art. 4(22) is engaged only if a stable arrangement in {MS} is added to the record'). Never infer an establishment from the existence of users, customers, or service reach in a Member State.",
    "KNOWN-AUTHORITY POPULATION (REBUILD-DPIA T5f; credit-first): where the record names or determines the competent / lead supervisory authority (whether by explicit reference or by controller_country → SA mapping — Sweden→IMY, Germany→relevant Land authority, France→CNIL, Ireland→DPC, Netherlands→AP, etc.), POPULATE the authority in every field that names it. NEVER emit '[TO COMPLETE — identify the supervisory authority]' when the record supplies it. Reserve the placeholder for the genuinely undetermined case.",
    "FRAMEWORK FIDELITY FOLLOWS THE RECORD (REBUILD-DPIA T5b; same defect class as dpa W3-H): the frameworks applied to the DPIA are those the RECORDED jurisdictions engage. GDPR is applied as binding ONLY when the record engages it — an EU/UK jurisdiction is selected in the record, or the record establishes an EU establishment engaging Art. 3(1), in which case the Art. 3 basis is STATED explicitly. Where the record excludes EU/UK deployments (e.g. jurisdictions = United States — Federal / California / Canada with an explicit out-of-scope statement), GDPR obligations are framed as PROSPECTIVE / CONDITIONAL to any planned EU/UK expansion — never 'DPIA mandatory under GDPR Article 35(1)'. The primary framework of the document = the record's primary jurisdiction. Comparative references to non-engaged frameworks are LABELLED comparative ('for comparison, under GDPR Art. 35(1) …'). This rule governs the ARTICLE 35 MANDATORY TRIGGER RULE: WP248 criteria analysis proceeds under whichever framework the record engages.",
    "NECESSITY — ADVOCATE-DRAFTER VOICE PER ACTIVITY (REBUILD-DPIA T6a): section_3 necessity states alternatives-considered reasoning PER processing activity. Where the record is thin, use advocate-drafter voice — 'the recorded facts support a colorable argument that [X] is necessary because [Y]; recording [the named alternatives / minimisation choices] would strengthen this' — NEVER 'the record is thin', 'inadequate', or clearance-verdict phrasing.",
    "METHODOLOGY-ADOPTION IS A CONDITIONAL STATEMENT, NOT AN ASK (REBUILD-DPIA T6b): in section_4, the risk-methodology adoption is stated conditionally — 'the methodology described here should be formally adopted by the organisation if not already in force' — never as an ask, never as a completion_guidance item. Where the methodology yields residual risks that remain High after proposed measures, NAME the specific risks whose proposed residual is High.",
    "IPv6 ANONYMISATION PRECISION (REBUILD-DPIA T6c): IPv6 masking covers the interface-identifier portion (typically the FINAL 64 BITS). Never describe IPv6 anonymisation as 'last-octet' masking (that is IPv4 terminology and technically incorrect for IPv6).",
    "ART. 35(9) VIEWS — DOCUMENT THE JUSTIFICATION (REBUILD-DPIA T6d): where the record indicates the views of data subjects were not sought under Art. 35(9), document the justification the record supports (e.g. 'seeking views would prejudice commercial or public interests; alternative consultation mechanisms X and Y are documented') — never a compliance-failure verdict.",
    "SINGLE-POSITION RULE (REBUILD-DPIA T7a): dpia_metadata, executive_summary, section_6_conclusion, and every body section STATE ONE POSITION per determination. Summary chrome NEVER exceeds body certainty. Where the body reads 'strong argument that Art. 35(3)(b) is engaged', the summary and metadata mirror that position; a summary that reads 'trigger not confirmed' beside a body arguing engagement is a defect.",
    "STATE-ONCE (REBUILD-DPIA T7b): each determination and contradiction appears in FULL exactly once, in its designated home section. Later references from other sections are one-line pointers to that home section, never restatements.",
    "SECTION 6 NAMES ITS BLOCKERS IN ADVOCATE-DRAFTER VOICE (REBUILD-DPIA T7d): where approval or conditional approval turns on specific missing inputs, section_6_conclusion NAMES each blocker constructively with its completion path — 'the specific Art. 46 safeguard is the remaining verdict-blocking item; recording the transfer instrument completes it' — NEVER 'cannot approve' or clearance-verdict phrasing.",
    "GDPR-CITES DEDUPE (REBUILD-DPIA T7e): gdpr_meta.gdprCites values are deterministically deduplicated exact-string, order-preserving. Never emit the same cite twice in that array.",
  ].join("\n\n"),

  languageVariant: "american",
};

// ─────────────────────────────────────────────────────────────────────────────
// REBUILD-DPIA T3 — deterministic post-generation fallback (mirrors cppa-risk
// POSTBATCH-1). Strips resolved-source information_needed asks and scrubs
// TEST-STATES internal vocabulary when the retry budget is exceeded.
// M9 is CANDIDATE-class per rule 168: never scrub it into a resolved-sounding
// phrase — "the profiling review" is the canonical human phrase.
// ─────────────────────────────────────────────────────────────────────────────
export const DPIA_M_TOKEN_MAP: Record<string, string> = {
  M1: "the special-category determination",
  M2: "the children's-data determination",
  M3: "the Art. 9(2) condition determination",
  M4: "the legal-basis determination",
  M5: "the GDPR-applicability determination",
  M6: "the transfer review",
  M7: "the retention review",
  M8: "the DPO review",
  M9: "the profiling review", // CANDIDATE-class — do NOT humanise into resolved-sounding phrasing
};

const DPIA_STATE_TOKEN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bis\s+resolved[_\s]met\b/gi, "is established on the record"],
  [/\bare\s+resolved[_\s]met\b/gi, "are established on the record"],
  [/\bis\s+resolved[_\s]not[_\s]met\b/gi, "is not met on the record"],
  [/\bare\s+resolved[_\s]not[_\s]met\b/gi, "are not met on the record"],
  [/\bis\s+resolved[_\s]not[_\s]applicable\b/gi, "is not applicable on the record"],
  [/\bare\s+resolved[_\s]not[_\s]applicable\b/gi, "are not applicable on the record"],
  [/\bRESOLVED[_\s]NOT[_\s]APPLICABLE\b/g, "not applicable on the record"],
  [/\bresolved[_\s]not[_\s]applicable\b/gi, "not applicable on the record"],
  [/\bRESOLVED[_\s]NOT[_\s]MET\b/g, "not met on the record"],
  [/\bresolved[_\s]not[_\s]met\b/gi, "not met on the record"],
  [/\bRESOLVED[_\s]MET\b/g, "established on the record"],
  [/\bresolved[_\s]met\b/gi, "established on the record"],
  [/\bINDETERMINATE\b/g, "indeterminate on the record"],
  // REBUILD-DPIA-HF1: CANDIDATE is dpia-specific (M9 profiling narrative). UPPERCASE-ONLY —
  // lowercase "candidate" is a common English word and is handled by the prompt-level ban.
  [/\bCANDIDATE\b/g, "flagged for judgment review"],
];

const DPIA_M_COMPOUND_REPLACEMENTS: Array<[RegExp, (id: string) => string]> = [
  [/\bthe\s+(M[1-9])\s+(special-category|children's-data|condition|legal-basis|GDPR-applicability|transfer|retention|DPO|profiling)\s+(determination|review)\b/gi,
    (id: string) => DPIA_M_TOKEN_MAP[id] ?? id],
  [/\bthe\s+(M[1-9])\s+determination\b/gi, (id: string) => DPIA_M_TOKEN_MAP[id] ?? id],
];

function dpiaPostScrubCleanup(s: string): string {
  let out = s.replace(/\bthe\s+the\b/gi, "the");
  out = out.replace(/(\b\w[\w-]*\s+(determination|review))(?:\s+\w+){0,4}\s+(determination|review)\b/gi, "$1");
  return out;
}

function dpiaScrubDeep(
  node: unknown,
  notes: Array<{ code: string; detail: string }>,
  parentKey?: string,
  insideInformationNeeded: boolean = false,
): unknown {
  if (typeof node === "string") {
    const isAnchor = insideInformationNeeded && (parentKey === "field" || parentKey === "source_fields");
    let out = node;
    for (const [re, fn] of DPIA_M_COMPOUND_REPLACEMENTS) {
      out = out.replace(re, (_m: string, id: string) => {
        const human = fn(id);
        if (human && human !== id) notes.push({ code: "test_token_scrubbed", detail: `${id}-compound→"${human}"` });
        return human ?? _m;
      });
    }
    for (const [re, repl] of DPIA_STATE_TOKEN_REPLACEMENTS) {
      if (re.test(out)) {
        out = out.replace(re, repl);
        notes.push({ code: "test_token_scrubbed", detail: `state→"${repl}"` });
      }
    }
    // Bare M-ids. M9 CANDIDATE-safe: its human phrase is intentionally non-resolved.
    out = out.replace(/\b(M[1-9])\b/g, (_m, id: string) => {
      const human = DPIA_M_TOKEN_MAP[id];
      if (!human) return _m;
      notes.push({ code: "test_token_scrubbed", detail: `${id}→"${human}"` });
      return human;
    });
    if (/\bTEST-STATES\b/.test(out)) {
      out = out.replace(/\bTEST-STATES\b/g, "the deterministic checks");
      notes.push({ code: "test_token_scrubbed", detail: "TEST-STATES→\"the deterministic checks\"" });
    }
    if (!isAnchor) {
      out = dpiaPostScrubCleanup(out);
    }
    return out;
  }
  if (Array.isArray(node)) return node.map((v) => dpiaScrubDeep(v, notes, parentKey, insideInformationNeeded));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const inIN = insideInformationNeeded || parentKey === "information_needed" || k === "information_needed";
      out[k] = dpiaScrubDeep(v, notes, k, inIN);
    }
    return out;
  }
  return node;
}

function dpiaDropResolvedSourceAsks(
  report: any,
  testStates: Record<string, { state: string; source_fields?: string[] }>,
  notes: Array<{ code: string; detail: string }>,
): any {
  const resolvedSources = new Set<string>();
  for (const ts of Object.values(testStates ?? {})) {
    if (ts && typeof ts.state === "string" && ts.state.startsWith("resolved")) {
      for (const f of ts.source_fields ?? []) resolvedSources.add(f);
    }
  }
  if (resolvedSources.size === 0) return report;

  // 1) information_needed[] — same shape as cppa-risk.
  const entries: any[] = Array.isArray(report?.information_needed) ? report.information_needed : [];
  const kept: any[] = [];
  for (const e of entries) {
    const fields: string[] = [];
    if (typeof e?.field === "string") fields.push(e.field);
    if (Array.isArray(e?.source_fields)) for (const f of e.source_fields) if (typeof f === "string") fields.push(f);
    if (fields.some((f) => resolvedSources.has(f))) {
      notes.push({ code: "resolved_source_ask_dropped", detail: String(e?.field ?? e?.dimensions ?? "").slice(0, 120) });
    } else {
      kept.push(e);
    }
  }
  if (kept.length !== entries.length) report.information_needed = kept;

  // 2) completion_guidance items keyed to a resolved source (courier T3a).
  const scanCG = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === "completion_guidance" && Array.isArray(v)) {
        const keptCG: any[] = [];
        for (const item of v) {
          const s = typeof item === "string" ? item : (item && typeof item === "object" ? String((item as any).field ?? "") : "");
          const fieldRef = typeof item === "object" && item ? String((item as any).field ?? "") : "";
          if (fieldRef && resolvedSources.has(fieldRef)) {
            notes.push({ code: "resolved_source_ask_dropped", detail: `completion_guidance:${fieldRef}` });
            continue;
          }
          // Bare "[TO COMPLETE ... <field>]" placeholders whose field ref matches a resolved source
          if (typeof item === "string" && /\[TO COMPLETE/.test(item)) {
            const anyResolved = [...resolvedSources].some((f) => item.includes(f));
            if (anyResolved) {
              notes.push({ code: "resolved_source_ask_dropped", detail: `to_complete_placeholder:${s.slice(0, 80)}` });
              continue;
            }
          }
          keptCG.push(item);
        }
        (obj as any)[k] = keptCG;
      } else if (v && typeof v === "object") {
        scanCG(v);
      }
    }
  };
  scanCG(report);
  return report;
}

// FF-1 T3 — DPIA pd1: KNOWN-AUTHORITY DETERMINISTIC BACKFILL.
// The prompt rule alone (Task 5f) failed in prod: docs left
// "[TO COMPLETE — identify competent supervisory authority for UNITED KINGDOM]"
// placeholders while the SAME doc's prose named the ICO. This post-gen pass
// resolves the placeholder from a small verified authority map when the
// record's country determination is unambiguous. Germany LEAVES the placeholder
// (per-Land competency defensible). Ambiguous / multi-country records left as-is.
export const DPIA_AUTHORITY_MAP: Record<string, string> = {
  "UNITED KINGDOM": "Information Commissioner's Office (ICO)",
  "UK": "Information Commissioner's Office (ICO)",
  "IRELAND": "Data Protection Commission (DPC)",
  "SWEDEN": "Integritetsskyddsmyndigheten (IMY)",
  "FRANCE": "CNIL",
  "NETHERLANDS": "Autoriteit Persoonsgegevens (AP)",
  "SPAIN": "AEPD",
  "ITALY": "Garante per la protezione dei dati personali",
  "DENMARK": "Datatilsynet",
  // FF-3 T2 — Run C doc3 evidence (extra-EEA jurisdictions).
  "AUSTRALIA": "Office of the Australian Information Commissioner (OAIC)",
  "SINGAPORE": "Personal Data Protection Commission (PDPC)",
  // GERMANY intentionally omitted — per-Land competency, leave placeholder.
};

const AUTHORITY_PLACEHOLDER_RE =
  /\[TO COMPLETE[^\]]*?(?:supervisory\s+authority|competent\s+authority|lead\s+authority)[^\]]*?\]/gi;

// FF-1-HF1: alias groups so "UK" and "UNITED KINGDOM" count as one country.
const AUTHORITY_ALIAS_GROUP: Record<string, string> = {
  "UNITED KINGDOM": "UNITED KINGDOM",
  "UK": "UNITED KINGDOM",
};

export function backfillDpiaAuthorities(
  report: any,
  notes: Array<{ code: string; detail: string }>,
): any {
  if (!report || typeof report !== "object") return report;
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") {
      return node.replace(AUTHORITY_PLACEHOLDER_RE, (m: string) => {
        const upper = m.toUpperCase();
        // Whole-word match per map key; count DISTINCT countries (aliases collapse).
        const distinctHits = new Map<string, { key: string; name: string }>();
        for (const [country, name] of Object.entries(DPIA_AUTHORITY_MAP)) {
          const re = new RegExp(`\\b${country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
          if (re.test(upper)) {
            const group = AUTHORITY_ALIAS_GROUP[country] ?? country;
            if (!distinctHits.has(group)) distinctHits.set(group, { key: country, name });
          }
        }
        if (distinctHits.size === 1) {
          const only = distinctHits.values().next().value!;
          notes.push({ code: "authority_backfilled", detail: `${only.key}→"${only.name}"` });
          return only.name;
        }
        if (distinctHits.size > 1) {
          const keys = Array.from(distinctHits.values()).map((v) => v.key).join(",");
          notes.push({ code: "authority_ambiguous_left", detail: keys });
        }
        return m;
      });
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = walk(v);
      return out;
    }
    return node;
  };
  return walk(report);
}

// FF-4 pd6 — EU/EEA member-state list (record-driven OSS template corrector
// input). Lives here (co-located with backfillDpiaAuthorities) rather than in
// _shared, because only run-dpia-framework consumes it. Includes both country
// names (matched against intake string fields) and ISO codes.
export const EU_EEA_MEMBER_COUNTRIES: ReadonlySet<string> = new Set([
  "AUSTRIA","AT","BELGIUM","BE","BULGARIA","BG","CROATIA","HR","CYPRUS","CY",
  "CZECHIA","CZECH REPUBLIC","CZ","DENMARK","DK","ESTONIA","EE","FINLAND","FI",
  "FRANCE","FR","GERMANY","DE","GREECE","GR","EL","HUNGARY","HU","IRELAND","IE",
  "ITALY","IT","LATVIA","LV","LITHUANIA","LT","LUXEMBOURG","LU","MALTA","MT",
  "NETHERLANDS","THE NETHERLANDS","NL","POLAND","PL","PORTUGAL","PT",
  "ROMANIA","RO","SLOVAKIA","SK","SLOVENIA","SI","SPAIN","ES","SWEDEN","SE",
  // EEA non-EU
  "ICELAND","IS","LIECHTENSTEIN","LI","NORWAY","NO",
]);

// FF-4 pd6 — GERMANY intentionally omits an authority clause because the
// competent SA is Land-specific (per-Land rule; see DPIA_AUTHORITY_MAP note).
const AUTHORITY_CLAUSE_OMIT: ReadonlySet<string> = new Set(["GERMANY", "DE"]);

// FF-4 pd6 — regex family that flags the false 4(16)(b) / non-EU template.
const FALSE_4_16_B_PATTERNS: RegExp[] = [
  /central\s+administration\s+is\s+outside\s+the\s+EU/i,
  /Art(?:icle|\.)?\s*4\s*\(\s*16\s*\)\s*\(\s*b\s*\)/i,
  /an\s+EU\s+establishment\s+holds\s+decision-making\s+authority/i,
  /no\s+EU\s+main\s+establishment\s+has\s+been\s+identified/i,
];

function looksLikeFalseFourSixteenB(s: unknown): boolean {
  if (typeof s !== "string" || !s) return false;
  return FALSE_4_16_B_PATTERNS.some((re) => re.test(s));
}

function normaliseCountryToken(v: unknown): string {
  return typeof v === "string" ? v.trim().toUpperCase() : "";
}

function authorityClauseForCountry(country: string): string {
  const key = country.toUpperCase();
  if (AUTHORITY_CLAUSE_OMIT.has(key)) return "";
  // Try direct map, then try common name-form (title case) too.
  const direct = DPIA_AUTHORITY_MAP[key];
  if (direct) return `, and the competent lead supervisory authority is ${direct}`;
  return "";
}

// FF-4 pd6 — deterministic, record-driven OSS-template corrector.
// If the intake places the controller IN an EU/EEA member and the report
// asserts the false 4(16)(b) template in any user-facing string, REPLACE
// supervisory_authority_consultation_trigger with the corrected sentence and
// note "oss_template_corrected". Facts-from-record substitution — never a
// model-text rewrite.
export function correctOssTemplateFromRecord(
  report: any,
  intake: Record<string, any> | null | undefined,
  notes: Array<{ code: string; detail: string }>,
): any {
  if (!report || typeof report !== "object") return report;
  const rawCentral = normaliseCountryToken((intake as any)?.central_administration_country);
  const rawController = normaliseCountryToken((intake as any)?.controller_country);
  const country = rawCentral || rawController;
  if (!country) return report;
  if (!EU_EEA_MEMBER_COUNTRIES.has(country)) return report;

  // Detect the false passage anywhere in user-facing string fields.
  let falseAssertionFound = false;
  const walkDetect = (node: unknown): void => {
    if (falseAssertionFound) return;
    if (typeof node === "string") {
      if (looksLikeFalseFourSixteenB(node)) falseAssertionFound = true;
      return;
    }
    if (Array.isArray(node)) { for (const v of node) walkDetect(v); return; }
    if (node && typeof node === "object") {
      for (const v of Object.values(node as Record<string, unknown>)) walkDetect(v);
    }
  };
  walkDetect(report);
  if (!falseAssertionFound) return report;

  const authClause = authorityClauseForCountry(country);
  const displayCountry = country.length <= 3
    ? country // ISO code — leave as is
    : country.charAt(0) + country.slice(1).toLowerCase();
  const corrected = `The record places the controller's central administration in ${displayCountry}. Under Art. 4(16)(a) GDPR the main establishment is the place of central administration in the Union${authClause}.`;

  // Replace supervisory_authority_consultation_trigger on dpia_metadata (if
  // present); clone shallowly to avoid aliasing surprises.
  const out: any = { ...report };
  const meta = out.dpia_metadata && typeof out.dpia_metadata === "object"
    ? { ...out.dpia_metadata } : {};
  meta.supervisory_authority_consultation_trigger = corrected;
  out.dpia_metadata = meta;
  notes.push({ code: "oss_template_corrected", detail: `${country}→Art.4(16)(a)` });
  return out;
}

export function applyDeterministicPostGenFallbackDpia(
  parsed: any,
  testStates: Record<string, { state: string; source_fields?: string[] }>,
): { parsed: any; notes: Array<{ code: string; detail: string }> } {
  const notes: Array<{ code: string; detail: string }> = [];
  let out = dpiaDropResolvedSourceAsks(parsed, testStates, notes);
  out = dpiaScrubDeep(out, notes) as any;
  out = backfillDpiaAuthorities(out, notes);
  return { parsed: out, notes };
}

// Deterministic dedupe helper — REBUILD-DPIA T7e (gdpr_meta.gdprCites).
export function dedupeStringArrayPreserveOrder(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}


// ─────────────────────────────────────────────────────────────────────────────
// R1b2 — deterministic TEST-STATES for the DPIA generator.
// Computed from the intake shape produced by src/pages/DPIAFramework.tsx.
// M1 special-category data (Art. 35(3)(b))     — data_categories ∩ {Health/medical, Biometric, Genetic}
// M2 children's data (Recital 38)              — any data_categories[i] matches /child/i
// M3 article_9_condition_selected              — article_9_condition non-empty AND M1 met
// M4 legal_basis_selected                      — legal_basis_proposed non-empty (P4: "Not yet determined" removed from enum; legacy rows still tolerated as indeterminate)
// M5 gdpr_applies                              — jurisdictions ∋ "EU (GDPR)" or "United Kingdom (UK GDPR)"
// M6 international_transfer_surface            — jurisdictions include both an EU/UK entry AND a non-EU/UK entry
// M7 retention_documented                      — retention_period non-empty
// M8 dpo_named                                 — dpo_info non-empty
// M9 profiling_narrative (Art. 35(3)(a) proxy) — description matches /\bprofil/i → CANDIDATE (non-binding);
//                                                absence → INDETERMINATE; keyword presence NEVER = RESOLVED_MET.
// Other WP248 prongs (large-scale, matching, vulnerable beyond children, innovative tech, 35(3)(c) monitoring)
// remain JUDGMENT (narrative-only) per the existing ARTICLE 35 MANDATORY TRIGGER RULE.
// ─────────────────────────────────────────────────────────────────────────────
type DpiaTestState = "resolved_met" | "resolved_not_met" | "resolved_not_applicable" | "indeterminate" | "candidate";
interface DpiaTestStateEntry {
  state: DpiaTestState;
  basis: string;
  source_fields: string[];
}
const DPIA_SPECIAL_CAT_LABELS = new Set([
  "Health / medical data",
  "Health or medical data",
  "Biometric data",
  "Genetic data",
]);
const DPIA_EU_UK_JURIS = new Set(["EU (GDPR)", "United Kingdom (UK GDPR)"]);

export function computeDpiaTestStates(intake: Record<string, any> | null | undefined): Record<string, DpiaTestStateEntry> {
  const it = intake ?? {};
  const cats: string[] = Array.isArray(it.data_categories) ? it.data_categories.map((s: any) => String(s)) : [];
  const juris: string[] = Array.isArray(it.jurisdictions) ? it.jurisdictions.map((s: any) => String(s)) : [];
  const out: Record<string, DpiaTestStateEntry> = {};

  const special = cats.filter((c) => DPIA_SPECIAL_CAT_LABELS.has(c));
  out.M1 = special.length > 0
    ? { state: "resolved_met", basis: `data_categories includes ${JSON.stringify(special)} — Art. 35(3)(b) engaged`, source_fields: ["data_categories"] }
    : { state: "resolved_not_met", basis: "no Art. 9 special-category label present in data_categories", source_fields: ["data_categories"] };

  const childCats = cats.filter((c) => /child/i.test(c));
  out.M2 = childCats.length > 0
    ? { state: "resolved_met", basis: `data_categories includes children-related label ${JSON.stringify(childCats)} — Recital 38 heightened protection`, source_fields: ["data_categories"] }
    : { state: "resolved_not_met", basis: "no children-related label present in data_categories", source_fields: ["data_categories"] };

  const art9 = String(it.article_9_condition ?? "").trim();
  if (out.M1.state === "resolved_not_met") {
    out.M3 = { state: "resolved_not_applicable", basis: "M1 not met — no Art. 9(2) condition required", source_fields: ["article_9_condition"] };
  } else {
    out.M3 = art9
      ? { state: "resolved_met", basis: `intake supplies Art. 9(2) condition "${art9.slice(0, 100)}"`, source_fields: ["article_9_condition"] }
      : { state: "indeterminate", basis: "special-category data present but article_9_condition empty", source_fields: ["article_9_condition"] };
  }

  const basis = String(it.legal_basis_proposed ?? "").trim();
  // P4: enum no longer contains "Not yet determined"; the regex clause is retained
  // solely to keep legacy rows (persisted before the enum shrink) treated as indeterminate.
  out.M4 = (!basis || /^not yet determined$/i.test(basis))
    ? { state: "indeterminate", basis: `legal_basis_proposed is "${basis || "(empty)"}"`, source_fields: ["legal_basis_proposed"] }
    : { state: "resolved_met", basis: `intake proposes "${basis}"`, source_fields: ["legal_basis_proposed"] };

  const hasEuUk = juris.some((j) => DPIA_EU_UK_JURIS.has(j));
  out.M5 = hasEuUk
    ? { state: "resolved_met", basis: `jurisdictions include EU/UK — GDPR is the operative frame`, source_fields: ["jurisdictions"] }
    : { state: "resolved_not_met", basis: "no EU/UK jurisdiction in intake — GDPR chapter not engaged as primary", source_fields: ["jurisdictions"] };

  const nonEuUk = juris.filter((j) => !DPIA_EU_UK_JURIS.has(j));
  out.M6 = (hasEuUk && nonEuUk.length > 0)
    ? { state: "resolved_met", basis: `intake includes non-EU/UK jurisdictions ${JSON.stringify(nonEuUk)} — Chapter V transfer surface exists`, source_fields: ["jurisdictions"] }
    : { state: "resolved_not_met", basis: "intake does not evidence a Chapter V transfer surface (missing an EU/UK origin or a non-EU/UK destination)", source_fields: ["jurisdictions"] };

  const retention = String(it.retention_period ?? "").trim();
  out.M7 = retention
    ? { state: "resolved_met", basis: `intake documents retention as "${retention.slice(0, 80)}"`, source_fields: ["retention_period"] }
    : { state: "indeterminate", basis: "retention_period is empty", source_fields: ["retention_period"] };

  const dpo = String(it.dpo_info ?? "").trim();
  out.M8 = dpo
    ? { state: "resolved_met", basis: `intake names DPO info "${dpo.slice(0, 80)}"`, source_fields: ["dpo_info"] }
    : { state: "indeterminate", basis: "dpo_info is empty; DPO consultation is conditional on designation", source_fields: ["dpo_info"] };

  const desc = String(it.description ?? "");
  out.M9 = /\bprofil/i.test(desc)
    ? { state: "candidate", basis: `description contains "profil…" — Art. 35(3)(a) prong flagged for JUDGMENT (assess the language; confirm or reject the prong)`, source_fields: ["description"] }
    : { state: "indeterminate", basis: "description does not contain the 'profil' keyword — absence is NOT proof of non-profiling; assess as JUDGMENT per the existing trigger rule", source_fields: ["description"] };

  return out;
}

export function renderDpiaTestStatesBlock(states: Record<string, DpiaTestStateEntry>): string {
  const lines: string[] = [];
  lines.push("TEST-STATES (deterministic — computed from the record). A test whose state is RESOLVED (met / not met / not applicable) is BINDING per rule 2a: do NOT re-ask it in completion_guidance/information_needed/[TO COMPLETE] placeholders and do NOT contradict it in prose. INDETERMINATE tests use ADVOCATE-DRAFTER voice — state what the record establishes, then 'the record does not yet resolve [the specific determination]; recording [the named field] completes it' — never 'insufficient basis' or clearance-verdict phrasing. CANDIDATE tests are NON-BINDING attention flags for JUDGMENT calls — assess the underlying narrative and either confirm or reject the associated prong, citing the language.");
  for (const id of Object.keys(states)) {
    const e = states[id];
    lines.push(`- ${id} state=${e.state} basis="${e.basis}" source_fields=${JSON.stringify(e.source_fields)}`);
  }
  return lines.join("\n");
}



// ─────────────────────────────────────────────────────────────────────────────
// r1b2.3 SECTIONED GENERATION (Plan B — 2026-07-12)
// Each of U1..U5 runs in its own isolate. Phase graph: {U1,U2,U3}||→U4→U5.
// Shared context (DATA ONLY — never prompt text; Amendment 2) persists to
// dpia_frameworks.report_data._staging.shared. Every unit rebuilds system
// blocks and per-unit prompt skeletons from code, so identical-context is
// preserved without leaking the proprietary rule set to RLS-readable rows.
// Terminal failures MERGE-preserve _staging (Amendment 1) so the sweeper's
// re-entry re-runs only missing units.
// ─────────────────────────────────────────────────────────────────────────────

const STAMP = "r1b2.4-ws6v21";
export const BUILD_STAMP = "r-turn-3-eu-product-fixes@2026-07-23T11:20:00Z-a";

// FF-3 T4 — POST-CUTOFF VERIFIED AUTHORITIES (dpia-scoped generator block).
// The model's training cutoff predates the December 2025 UK adequacy renewals;
// left un-anchored, dpia prose reverts to naming the June 2021 decision as
// current. This block is authoritative and post-May-2025 items in it are
// verified current law. Injected into every unit's system prefix by
// buildSystemBlocksForUnit(); graders carry the same anchors independently.
export const DPIA_POST_CUTOFF_AUTHORITIES = [
  "POST-CUTOFF VERIFIED AUTHORITIES (dpia-scoped; post-May-2025 items in this block are verified CURRENT LAW — treat as authoritative and never as speculative or future-dated):",
  "• UK ADEQUACY — RENEWED 19 DECEMBER 2025. On 19 December 2025 the European Commission adopted TWO renewed adequacy decisions for the United Kingdom (the GDPR decision and the Law Enforcement Directive decision), post-DUAA 2025 (Data (Use and Access) Act 2025) and after the June 2025 technical extension. The renewed decisions run for a SIX-YEAR term, expiring on 27 December 2031. When referring to the current EU→UK adequacy state, cite the 19 December 2025 renewal — NEVER present the 28 June 2021 Commission Implementing Decision (EU) 2021/1772 as the current state without also naming the 19 December 2025 renewal. Historical narrative may reference the June 2021 decision as the predecessor; current-state prose names the December 2025 renewal.",
  "• CURRENCY RULE — do NOT flag the December 2025 renewal as 'draft', 'proposed', 'pending', 'unverified', or 'training-cutoff uncertain'. Do NOT append evergreen 'confirm at time of assessment' caveats to it in a way that implies its status is unresolved; the evergreen adequacy-caveat rule (adequacy decisions may be reviewed, suspended, or invalidated) still applies to ALL adequacy decisions equally.",
].join("\n");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type UnitId = "u1" | "u2" | "u3" | "u4" | "u5";
const PHASE1: UnitId[] = ["u1", "u2", "u3"];
const UNIT_MAX_TOKENS: Record<UnitId, number> = {
  // r1b2.3 fix (a): u2 10k→14k. #66–68 observed u2 outputs 8,864–9,914 tokens
  // (razor-thin headroom vs 10k cap); the u2 continuation trigger in #69 is
  // documented in the courier ledger. Raising the cap makes continuation the
  // rare path, not the common one, on richer scenarios.
  u1: 18_000, u2: 14_000, u3: 10_000, u4: 16_000, u5: 8_000,
};

// Per-unit JSON output skeletons. Preserved verbatim from the pre-refactor
// promptA/promptB (L577–740 of the r1b2.2 file). Rule text lives in the
// shared system prefix (DPIA_TOOL_MODULE.extraRules) — never here.
const U1_SKELETON = `{
  "dpia_metadata": {
    "processing_activity_name": "brief name for this processing activity",
    "framework_version": "1.0",
    "template_basis": "EDPB (endorsed) Guidelines on DPIA (WP248 rev.01)",
    "applicable_frameworks": ["list of applicable frameworks — GDPR Art. 35, UK GDPR, etc."],
    "article_35_3_trigger": "Identify which Article 35(3) subparagraph mandates this DPIA, or state that this DPIA is precautionary. Options: Art. 35(3)(a) — systematic evaluation of personal aspects including profiling with significant effects; Art. 35(3)(b) — large-scale processing of special category or criminal offence data; Art. 35(3)(c) — systematic monitoring of publicly accessible area at large scale; Precautionary — processing does not meet Art. 35(3) thresholds but DPIA is conducted as best practice or because supervisory authority list applies.",
    "consultation_requirement": "State whether DPO consultation is required under GDPR Article 35(2) (applies only if a DPO is designated per Article 37). If no DPO is designated, state this and document whether an Article 37 appointment obligation is triggered. DPO CONSULTATION REQUIRED: [Required under Art. 35(2) — DPO designated / Not required — no DPO designated, Article 37 assessment: [TO COMPLETE] / Not confirmed — confirm DPO designation status]",
    "supervisory_authority_consultation_trigger": "For cross-border EU processing, identify the lead supervisory authority under the one-stop-shop mechanism (GDPR Article 56). Prior consultation under Article 36 is required if residual risk remains High after all measures are applied."
  },
  "section_0_overview": {
    "title": "Overview of the Processing",
    "guidance_note": "EDPB DPIA template Section 0 — controller(s), processor(s), name, planning, and the DPIA technical sheet.",
    "controllers": [
      { "name": "controller name", "responsible_unit": "internal unit responsible", "main_establishment_or_representative": "from intake or [TO COMPLETE — main establishment / representative]", "dpo": "from intake or [TO COMPLETE — DPO or 'none designated']" }
    ],
    "processors": [
      { "name": "processor / sub-processor (from intake), or 'None identified'", "obligations_and_tasks": "their obligations & tasks, or [TO COMPLETE — define obligations]" }
    ],
    "processing_name": "internal name from the record of processing activities; where no separate internal RoPA name exists, repeat the activity name — this field and dpia_metadata.processing_activity_name are distinct by design (RoPA internal name vs. activity display name) and may legitimately carry the same value",
    "processing_version": "initialise to the value used in technical_sheet.dpia_version (e.g. '1.0') with ' [update as processing changes]' appended; do not leave as a bare [TO COMPLETE] placeholder when the DPIA's own version number is already known",
    "planning": { "estimated_launch_date": "from intake or [TO COMPLETE — launch date]", "estimated_end_date": "from intake or 'Ongoing'" },
    "technical_sheet": {
      "dpia_version": "1.0",
      "team_raci": "from intake or [TO COMPLETE — Responsible / Accountable / Consulted / Informed]",
      "reference_materials": "guidelines / standards used (include EDPB DPIA template and WP248 rev.01)",
      "reasons_to_conduct": ["the controller-selected reasons, mapped to Art. 35(3) sub-paragraphs and the WP248 criteria they correspond to"],
      "scope": "what this DPIA covers and what it excludes, and why",
      "completion_date": "[TO COMPLETE — DD/MM/YYYY]",
      "formal_validation_date": "[TO COMPLETE — DD/MM/YYYY, approval as complete by a responsible official]",
      "publication_intent": "from intake (No / published / shared externally)"
    },
    "completion_guidance": "What the organisation must confirm or complete in Section 0"
  },
  "section_1_description": {
    "title": "Systematic Description of the Processing",
    "guidance_note": "EDPB Section 1 / GDPR Art. 35(7)(a) — processed data, purposes, secondary uses, nature/scope/context, functional description, supporting assets, and codes of conduct.",
    "processed_personal_data": [
      { "item": "data item / element", "explanation": "data type, data subject category, details", "special_category": { "is_special": true, "categories": ["e.g. data concerning health; biometric data for unique identification"] }, "source": { "intake_field": "name of the intake field this row is anchored to (e.g. 'data_categories', 'description'); use 'inferred' ONLY when no intake field supports it", "basis": "stated | inferred" } }
    ],
    "purposes": [
      { "purpose": "specific and explicit purpose", "personal_data_involved_and_justification": "which data (from processed_personal_data) and why it is needed", "source": { "intake_field": "intake field anchoring this purpose (e.g. 'purpose', 'description', 'processing_activity_name'); use 'inferred' ONLY when no intake field supports it", "basis": "stated | inferred" } }
    ],
    "secondary_uses": [
      { "use": "secondary / compatible use, or 'None identified'", "conditions_and_compatibility": "conditions and a compatibility assessment" }
    ],
    "nature": "how personal data will be handled (operations involved, technologies used)",
    "scope": "breadth and extent — volume / scale, geographic and organisational reach, frequency or duration",
    "context": "circumstances and environment — controller–data-subject relationship, vulnerable groups, cross-border",
    "cross_border": "Yes / No, with justification",
    "international_transfers": "Yes / No — third country and transfer mechanism, or 'None'",
    "functional_description": [
      { "phase": "processing phase / stage", "operations": ["Collection","Use","Storage","Sharing and Transfer","Deletion and Destruction"], "explanation": "what happens in this phase across the controller/processor chain", "source": { "intake_field": "intake field anchoring this phase's operations (e.g. 'description', 'nature_scope_context', 'functional_description'); use 'inferred' ONLY when no intake field supports it", "basis": "stated | inferred" } }
    ],
    "supporting_assets": [
      { "phase": "phase (from functional_description)", "assets": "means of processing and essential supporting assets", "explanation": "how the asset relates to the processing and to risk" }
    ],
    "codes_of_conduct": [
      { "code": "approved code of conduct, or 'None applicable'", "basis": "Required (legal obligation) | Necessary or beneficial | N/A", "explanation": "why" }
    ],
    "completion_guidance": "What the organisation must complete or verify in Section 1"
  }
}`;

const U2_SKELETON = `{
  "section_2_analysis": {
    "title": "Analysis of the Processing",
    "guidance_note": "EDPB Section 2 — lawfulness, data minimisation / retention / quality, and the measures supporting compliance.",
    "legal_basis": [
      { "purpose": "purpose / use (from section_1 purposes and secondary uses)", "article_6_basis": "Art. 6(1)(a)–(f)", "justification": "why; for 6(1)(f) include the legitimate-interests balancing test" }
    ],
    "special_category_conditions": [
      { "data_item": "special-category item (from section_1)", "article_9_condition": "Art. 9(2)(a)–(j)", "justification": "why this condition lifts the prohibition" }
    ],
    "data_minimisation_retention": [
      { "data_item": "data item", "need_justification": "why this data is needed and relevant", "recipients": "recipients", "recipient_justification": "why", "retention_period": "retention period", "retention_justification": "why" }
    ],
    "data_quality": [
      { "data_item": "data item", "metrics": "quality metrics, requirements or thresholds", "justification": "why" }
    ],
    "measures_article5": [
      { "principle": "Fairness | Transparency | Purpose limitation | Data minimisation | Accuracy | Storage limitation | Integrity and confidentiality | Accountability", "measures": "supporting measures", "appropriateness": "appropriateness and effectiveness", "implementation_status": "Planned | Partially implemented | Implemented | Requires scoping" }
    ],
    "measures_rights": [
      { "right": "Information (Arts. 12–14) | Access & portability (Arts. 15, 20) | Rectification & erasure (Arts. 16, 17, 19) | Object & restriction (Arts. 18, 19, 21) | No solely-automated decision (Art. 22)", "measures": "supporting measures", "appropriateness": "appropriateness and effectiveness", "implementation_status": "Planned | Partially implemented | Implemented | Requires scoping" }
    ],
    "measures_other": [
      { "requirement": "Consent (Art. 7) | Processors (Art. 28) | International transfers (Chapter V)", "measures": "supporting measures", "appropriateness": "appropriateness and effectiveness", "implementation_status": "Planned | Partially implemented | Implemented | Requires scoping" }
    ],
    "measures_dpbd": [
      { "measures": "data protection by design and by default (Art. 25) measures", "appropriateness": "appropriateness and effectiveness", "implementation_status": "Planned | Partially implemented | Implemented | Requires scoping" }
    ],
    "measures_security": [
      { "measures": "security of processing (Art. 32) measures", "appropriateness": "appropriateness and effectiveness", "implementation_status": "Planned | Partially implemented | Implemented | Requires scoping" }
    ],
    "completion_guidance": "What the organisation must complete or verify in Section 2"
  }
}`;

const U3_SKELETON = `{
  "section_3_necessity_proportionality": {
    "title": "Considerations on Necessity and Proportionality",
    "guidance_note": "EDPB Section 3 — design / structural impacts on rights and freedoms, plus the necessity and proportionality tests.",
    "design_risk_impacts": [
      { "threat": "threat from the processing as designed", "how_materialised": "how it can materialise with no failure or attack", "risk_sources": "purpose, design weaknesses, unique identifiers, long retention, exposures", "impact_on_rights": "impact on data subjects' rights and freedoms" }
    ],
    "necessity_assessment": "is the processing effective and the least intrusive option; evidence and the alternatives considered",
    "proportionality_assessment": "do the benefits outweigh the impacts on rights and freedoms; evidence and justification (necessity is a pre-condition)",
    "completion_guidance": "What the organisation must complete or verify in Section 3"
  }
}`;

const U4_SKELETON = `{
  "section_4_risk_management": {
    "title": "Risk Assessment and Management",
    "guidance_note": "EDPB Section 4 — incident / deviation risks, method, inherent risk, additional mitigating measures, residual risk, and the action plan.",
    "incident_risk_impacts": [
      { "threat": "threat from malfunction, deviation, cyber, or malicious actor", "how_materialised": "how it can materialise when something deviates from the intended state", "risk_sources": "software bugs, misconfiguration, wrong access rights, operational error, unpatched vulnerabilities, insider abuse, external attack", "impact_on_rights": "impact on data subjects' rights and freedoms" }
    ],
    "method": "likelihood and severity scales and their meanings, risk metrics, prioritisation, and risk-acceptance levels; note that a high-severity risk may be unacceptable even at low likelihood",
    "inherent_risk_assessment": [
      { "risk": "risk scenario (drawn from design_risk_impacts and incident_risk_impacts)", "likelihood": "Low | Medium | High", "severity": "Low | Medium | High", "modulating_factors": "aggravating / mitigating factors (scale, sensitivity, vulnerability, exposure)", "risk_level": "Low | Medium | High", "acceptable": "Acceptable | Not acceptable — requires additional mitigation" }
    ],
    "additional_mitigating_measures": [
      { "measure": "additional technical / legal / organisational measure", "mitigated_risks": "which inherent risks it addresses", "appropriateness": "appropriateness and effectiveness", "implementation_status": "Planned | Partially implemented | Implemented | Requires scoping" }
    ],
    "residual_risk_assessment": [
      { "risk": "reassessed risk", "additional_measures": "measures applied", "residual_likelihood": "Low | Medium | High", "residual_severity": "Low | Medium | High", "residual_risk_level": "Low | Medium | High — proposed, subject to the organization's re-scoring", "acceptable": "Acceptable | Not acceptable" }
    ],
    "plan": "activities to add the measures (responsible team, timelines) and to monitor, review and update them once the processing is live",
    "annotations": [
      {
        "enforcement_action_id": "exact id string from the enforcement context above (the value after 'id:')",
        "regulator": "regulator name",
        "jurisdiction": "jurisdiction",
        "decision_date": "YYYY-MM-DD or null",
        "summary": "one sentence what the case involved, max 25 words, plain English",
        "outcome": "rejected | accepted | penalised | required",
        "relevance": "one sentence why this case is relevant to a risk in this DPIA"
      }
    ],
    "completion_guidance": "What the organisation must complete or verify in Section 4"
  }
}`;

const U5_SKELETON = `{
  "section_5_interested_parties": {
    "title": "Involvement of Interested Parties",
    "guidance_note": "EDPB Section 5 — DPO advice (advisory only) and the views of data subjects or their representatives.",
    "dpo_advice": "DPO advice received and documented — the DPO's opinion, conclusions and recommendations, and how the advice was implemented. Required if a DPO is designated (GDPR Art. 35(2)); if none is designated, assess whether an Article 37 appointment is triggered. [TO COMPLETE — summary of DPO advice]",
    "data_subject_views": "Where appropriate, the views of data subjects or their representatives, or an explanation of why their participation was not sought or was not possible",
    "completion_guidance": "What the organisation must complete or verify in Section 5"
  },
  "section_6_conclusion": {
    "title": "Conclusion and Decision",
    "guidance_note": "EDPB Section 6 — the decision on processing viability, based on the residual-risk assessment.",
    "decision": "DRAFT — INCOMPLETE | REJECTED | CONSULTATION (SA) | APPROVED | CONDITIONALLY APPROVED — with a one-line explanation tied to the residual-risk outcome (use DRAFT — INCOMPLETE whenever foundational inputs are missing or still [TO COMPLETE]; see DECISION STATUS RULE)",
    "conditions": ["if CONDITIONALLY APPROVED, the specific conditions to meet before proceeding (link to the section_4 measures)"],
    "supervisory_authority_consultation_required": "conditional guidance — Art. 36 prior consultation is required where residual risk remains High after all measures; name the lead supervisory authority",
    "sign_off_template": "Controller sign-off template (the controller, not the DPO, owns this decision): Processing activity: [name] | DPIA version: [TO COMPLETE] | DPIA completion date: [TO COMPLETE] | DPO advice received and considered: Yes / No / N/A (no DPO designated) | Overall residual risk level (post-measures): [TO BE RE-SCORED by organisation] | Supervisory authority consultation required: Yes / No / Conditional | Controller representative name and title: [TO COMPLETE] | Signature: [TO COMPLETE] | Date: [TO COMPLETE]",
    "review_schedule": "review triggers — (1) legal requirement: whenever the risk represented by the processing changes (GDPR Art. 35(11)); (2) recommended practice: at least annually as an internal governance measure",
    "justification": "optional explanation / justification of the decision"
  },
  "framework_disclaimer": "This document helps your organisation structure its Data Protection Impact Assessment using the EDPB-endorsed Guidelines on DPIA (WP248 rev.01). It is not a completed DPIA and does not satisfy the requirements of GDPR Article 35 on its own. Your qualified Data Protection Officer or legal counsel must review, complete, and own it. It does not constitute legal advice."
}`;

const UNIT_KEYS: Record<UnitId, string[]> = {
  u1: ["dpia_metadata", "section_0_overview", "section_1_description"],
  u2: ["section_2_analysis"],
  u3: ["section_3_necessity_proportionality"],
  u4: ["section_4_risk_management"],
  u5: ["section_5_interested_parties", "section_6_conclusion", "framework_disclaimer"],
};

const UNIT_SKELETON: Record<UnitId, string> = {
  u1: U1_SKELETON, u2: U2_SKELETON, u3: U3_SKELETON, u4: U4_SKELETON, u5: U5_SKELETON,
};

// FF-3 T3 — per-unit blacklist reinforcement (pd5). dpia has no full-regen
// path (FF-2 D-2), so the ban must ride the prompt. The five phrases are
// quoted VERBATIM and paired with the REQUIRED advocate-drafter alternative
// construction, in every unit that emits analysis prose (u1–u5).
const PER_UNIT_BLACKLIST_BAN =
  " HARD PROSE BLACKLIST (repeated per-unit — no unit is exempt): the five phrases \"insufficient basis\", \"not substantiated\", \"cannot be confirmed\", \"no basis to assess\", \"in the clear\" MUST NOT appear in ANY user-facing string emitted by this unit (executive_summary, section prose, table cells, completion_guidance, information_needed, [TO COMPLETE …] placeholders, dpia_metadata, framework_disclaimer — every reader-visible field). REQUIRED ALTERNATIVE CONSTRUCTION: (1) STATE what the record DOES establish, then (2) name the residual using the form \"the record does not yet establish/resolve [X]; [named fact, document, or intake field] completes it.\" Examples of substitutions you MUST make: instead of \"the Art. 6(1)(f) basis cannot be confirmed\" → \"the record establishes purposes A and B; the record does not yet resolve which Art. 6(1) basis applies to purpose C; recording the purpose-specific balancing test completes it.\" Instead of \"feed integrity cannot be confirmed\" → \"feed integrity remains unvalidated on the record; recording the source-data validation procedure completes it.\" Instead of \"insufficient basis for the Art. 9(2) condition\" → \"the record does not yet resolve the Art. 9(2) condition; recording the selected condition and its supporting facts completes it.\" Instead of \"no basis to assess the transfer\" → \"the record does not yet resolve the transfer mechanism; recording the destination country and Art. 46 instrument completes it.\" Instead of \"the DPIA is in the clear on retention\" → \"the record establishes a [N] retention period; adding the deletion procedure would deepen the DPIA.\" Instead of \"the safeguards are not substantiated\" → \"the record establishes safeguards X and Y; the record does not yet evidence safeguard Z; recording the implementation status completes it.\" This ban is not conditional on subject matter — it applies to legal-basis prose, transfer prose, risk prose, operational prose (feed integrity, monitoring, controls), and every other user-facing string this unit emits.";

const UNIT_INSTRUCTION: Record<UnitId, string> = {
  u1: "Generate the DPIA overview, metadata, and systematic description. Populate the repeatable tables (controllers, processors, data items, purposes) with substantive draft content; use \"[TO COMPLETE — …]\" only where a value genuinely cannot be inferred from the intake.\n\nPROVENANCE (W3-T1, REQUIRED):\n- Every row of processed_personal_data, purposes, and functional_description MUST carry a `source` object of the form {\"intake_field\": <string>, \"basis\": \"stated\"|\"inferred\"}.\n- `basis: \"stated\"` means the row's substance is directly supported by the named intake_field's value. Use the exact intake key from the record (e.g. 'data_categories', 'purpose', 'description', 'processing_activity_name', 'functional_description', 'nature_scope_context').\n- `basis: \"inferred\"` means the row is a reasonable inference the intake does not directly enumerate; set intake_field to the closest supporting field the inference draws from, or \"inferred\" if none.\n- Do NOT invent enumerations (e.g. specific portal event types, purchase history categories, unnamed central-administration facts). If it isn't stated, mark it inferred and keep it high-level.\n\nReturn ONLY the JSON structure below, no preamble:" + PER_UNIT_BLACKLIST_BAN,
  u2: "Generate the compliance analysis section. Provide one row per Article 5(1)(a–f) principle for measures_article5, one row per data-subject right group for measures_rights, and one row per other GDPR requirement for measures_other. Populate every table with substantive draft content; use \"[TO COMPLETE — …]\" only where a value genuinely cannot be inferred. Return ONLY the JSON structure below, no preamble:" + PER_UNIT_BLACKLIST_BAN,
  u3: "Generate the necessity & proportionality section. CRITICAL: design_risk_impacts = risks that exist EVEN IF everything works exactly as designed and all actors follow the rules (inherent, structural risks flowing from the data, the purpose, and the nature/scope/context) — this list will be reused verbatim by Section 4. Return ONLY the JSON structure below, no preamble:" + PER_UNIT_BLACKLIST_BAN,
  u4: "Generate the risk assessment & management section. CRITICAL — keep the EDPB design-risk vs incident-risk distinction: incident_risk_impacts = risks from non-default, accidental, unlawful or abnormal events (malfunctions, deviations from design, cyber threats to confidentiality / integrity / availability, malicious actors). inherent_risk_assessment = the combined list of risks drawn from BOTH design_risk_impacts (supplied below verbatim) and incident_risk_impacts, each scored likelihood × severity with modulating factors. residual_risk_assessment = those risks re-scored AFTER the additional mitigating measures. Return ONLY the JSON structure below, no preamble:" + PER_UNIT_BLACKLIST_BAN,
  u5: "Generate the interested-parties section, the conclusion, and the framework disclaimer. CONSISTENCY DUTIES (repair-only): conclusion conditions must link to section_4 measures; blockers named in section_6 must match information_needed entries in earlier sections; dpia_metadata ↔ section_6 must be consistent on unresolved determinations. You MAY reconcile contradictions between earlier units but MUST NOT introduce new legal determinations. Return ONLY the JSON structure below, no preamble:" + PER_UNIT_BLACKLIST_BAN,
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared context — DATA ONLY. Amendment 2: never persist system-prompt text
// or per-unit prompt-skeleton text. Blocks are rebuilt in every unit from
// this data via buildSystemBlocksForUnit().
// ─────────────────────────────────────────────────────────────────────────────
interface SharedContextData {
  intake: Record<string, any>;
  orgName: string | null;
  orgContext: string;
  processingDesc: string;
  gdprJurisdiction: "eu" | "uk";
  enforcementPrecedents: any[];
  enforcementMeta: any;
  gdprBlock: string;
  gdprMeta: any;
  resolved: ReturnType<typeof resolveDpiaJurisdiction>;
  testStates: Record<string, DpiaTestStateEntry>;
  generationStartedAt: number;
}

async function buildSharedContext(dpia: any): Promise<SharedContextData> {
  const intake = (dpia.intake_data as any) ?? {};
  const orgName = dpia.organization_name || intake?.organization_name || null;

  let orgContext = "";
  if (dpia.source_assessment_id) {
    const { data: sourceAssessment } = await supabase
      .from("governance_assessments")
      .select("intake_data, report_data")
      .eq("id", dpia.source_assessment_id).single();
    if (sourceAssessment) {
      const srcIntake = sourceAssessment.intake_data as any;
      orgContext = `
SOURCE GOVERNANCE ASSESSMENT CONTEXT:
Organisation sector: ${srcIntake.sector || "not specified"}
Jurisdictions: ${(Array.isArray(srcIntake.jurisdictions) ? srcIntake.jurisdictions : []).join(", ")}
EU/UK data: ${srcIntake.eu_uk_data ? "Yes" : "No"}
DPO appointed: ${srcIntake.has_dpo ? "Yes" : "No"}
`;
    }
  }

  const processingDesc = intake.processing_description || intake.description || "Not provided";

  const asList = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : (v == null || v === "" ? [] : [String(v)]);

  // Effective jurisdictions (source-assessment preferred where present).
  let srcIntakeJurisdictions: string[] | null = null;
  if (dpia.source_assessment_id) {
    try {
      const { data: sa } = await supabase
        .from("governance_assessments")
        .select("intake_data")
        .eq("id", dpia.source_assessment_id).maybeSingle();
      const sj = (sa?.intake_data as any)?.jurisdictions;
      if (Array.isArray(sj)) srcIntakeJurisdictions = sj;
    } catch { /* non-fatal */ }
  }
  const effectiveJurisdictions: string[] = srcIntakeJurisdictions ?? (intake.jurisdictions || []);
  const hasEU = effectiveJurisdictions.some((j: string) => /\beu\b|european.*union|eea|\bgdpr\b|germany|france|ireland|netherlands|spain|italy|sweden|denmark|poland|belgium|austria|finland|luxembourg|greece|portugal|norway|switzerland/i.test(String(j)));
  const hasUK = effectiveJurisdictions.some((j: string) => /united kingdom|\buk\b|\bgb\b|uk gdpr|england|wales|scotland/i.test(String(j)));
  const gdprJurisdiction: "eu" | "uk" = hasEU ? "eu" : (hasUK ? "uk" : "eu");

  // Enforcement + GDPR context (parallel).
  let enforcementPrecedents: any[] = [];
  let enforcementMeta: any = { attempted: false };
  let gdprBlock = "";
  let gdprMeta: any = { attempted: false };
  try {
    const corpusRegime: "gdpr" | "uk_gdpr" = gdprJurisdiction === "uk" ? "uk_gdpr" : "gdpr";
    const [ecRes, gdprRes] = await Promise.all([
      supabase.functions.invoke("get-enforcement-context", {
        body: {
          tool: "DPIA",
          regime: corpusRegime,
          data_categories: intake.data_categories || [],
          jurisdictions: intake.jurisdictions || [],
          sector: intake.sector || undefined,
          articles: ["gdpr:35", "gdpr:36"],
          limit: 5,
        },
      }),
      getGdprContext(supabase, {
        articles: ["35", "36"],
        jurisdiction: gdprJurisdiction,
        recitals: [75, 84, 90],
        guidelineArticles: ["35"],
        semanticQuery: processingDesc,
      }).catch((e: Error) => { console.error("getGdprContext failed (non-fatal):", e); return { block: "", meta: { attempted: false, error: String(e).slice(0, 200) } as any }; }),
    ]);
    const ctxData = (ecRes as any)?.data;
    enforcementPrecedents = (ctxData?.results || []).slice(0, 5);
    const descParts: string[] = [];
    if (intake.sector) descParts.push(`${intake.sector} sector`);
    const jList = Array.isArray(intake.jurisdictions) ? intake.jurisdictions : (intake.jurisdictions ? [String(intake.jurisdictions)] : []);
    if (jList.length) descParts.push(`processing in ${jList.join(", ")}`);
    enforcementMeta = {
      attempted: true,
      total_matched: typeof ctxData?.total_matched === "number" ? ctxData.total_matched : null,
      query_descriptor: descParts.join(" — ") || undefined,
    };
    gdprBlock = (gdprRes as any)?.block || "";
    gdprMeta = (gdprRes as any)?.meta || { attempted: false };
  } catch (e) {
    console.error("DPIA context fetch failed (non-fatal):", e);
  }

  // Deterministic jurisdiction resolution.
  function inferCountryFromJurisdictions(js: string[]): string {
    const joined = (js || []).join(" ");
    if (/germany|deutschland|\bDE\b/i.test(joined)) return "DE";
    if (/united kingdom|\bUK\b|\bGB\b/i.test(joined)) return "UK";
    if (/ireland|\bIE\b/i.test(joined)) return "IE";
    if (/france|\bFR\b/i.test(joined)) return "FR";
    if (/spain|\bES\b/i.test(joined)) return "ES";
    if (/netherlands|holland|\bNL\b/i.test(joined)) return "NL";
    if (/italy|\bIT\b/i.test(joined)) return "IT";
    return "";
  }
  const resolverCountry = (intake.controller_country || inferCountryFromJurisdictions(intake.jurisdictions || []) || "").toUpperCase();
  const resolverSector = (intake.controller_sector || "private") as any;
  const facts: DpiaIntakeFacts = {
    controllerSites: resolverCountry ? [{ country: resolverCountry, land: intake.controller_land || undefined, sector: resolverSector }] : [],
    centralAdministrationCountry: (intake.central_administration_country || resolverCountry || "").toUpperCase(),
    euEstablishmentWithDecisionAuthority: intake.eu_decision_establishment_country
      ? { country: String(intake.eu_decision_establishment_country).toUpperCase(), sector: "private" }
      : null,
    transferFlows: Array.isArray(intake.transfer_flows)
      ? (intake.transfer_flows as any[]).map((f): TransferFlow => ({
          originRegime: (f.originRegime === "UK" ? "UK" : "EU"),
          destinationCountry: String(f.destination || "").toUpperCase(),
          importerEntity: f.importer || undefined,
          importerDpfCertified: !!f.dpfCertified,
          importerUkExtensionCertified: !!f.ukExtensionCertified,
        })).filter((f) => f.destinationCountry)
      : [],
    article9Condition: intake.article_9_condition || undefined,
    retentionRecordType: intake.retention_record_type || undefined,
  };
  const resolved = resolveDpiaJurisdiction(facts);
  console.log(`[run-dpia-framework] resolver: country=${resolverCountry} land=${intake.controller_land || "-"} oss=${resolved.oss.ossAvailable} transfers=${resolved.transfers.length}`);

  const testStates = computeDpiaTestStates(intake as Record<string, any>);

  return {
    intake, orgName, orgContext, processingDesc, gdprJurisdiction,
    enforcementPrecedents, enforcementMeta, gdprBlock, gdprMeta,
    resolved, testStates,
    generationStartedAt: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rebuild the system+shared-user prefix from data. Called in EVERY unit
// invocation — deterministic given the module source, so identical context is
// preserved across units without persisting any prompt text.
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemBlocksForUnit(shared: SharedContextData): SystemBlock[] {
  const gdprAuthorityContext = shared.gdprBlock
    ? `STATUTORY AND EDPB AUTHORITY (cite as [Art. X] / [Recital N] / [EDPB ref]; statutory text is verbatim — do not alter it):\n${shared.gdprBlock}`
    : "";
  const resolvedBlock = renderResolvedBlock(shared.resolved);
  const testStatesBlock = renderDpiaTestStatesBlock(shared.testStates);
  const today = new Date().toISOString().slice(0, 10);
  const blocks = buildSystemContent({
    toolModule: DPIA_TOOL_MODULE,
    currentDate: today,
    injected: [DPIA_POST_CUTOFF_AUTHORITIES, gdprAuthorityContext, resolvedBlock, testStatesBlock].filter(Boolean).join("\n\n"),
  });
  // Prompt-caching breakpoint at the end of the shared prefix (courier §5).
  // buildSystemContent already caches blocks 1+2; force cache on block 3
  // (corpus + resolved + TEST-STATES) so units pay cached-input rates.
  if (blocks.length > 0) {
    const last = blocks[blocks.length - 1];
    (last as any).cache_control = { type: "ephemeral" };
  }
  return blocks;
}

function buildSharedUserContext(shared: SharedContextData): string {
  const { intake, orgName, orgContext, enforcementPrecedents, processingDesc } = shared;
  const asList = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : (v == null || v === "" ? [] : [String(v)]);
  const purpose = intake.purpose || "Not provided";
  const dataCategories = asList(intake.data_categories).join(", ") || "Not specified";
  const dataSubjects = intake.data_subjects || "Not specified";
  const volume = intake.volume_frequency || "Not specified";
  const thirdParties = asList(intake.third_party_processors).join(", ") || "None identified";
  const safeguards = asList(intake.existing_safeguards).join(", ") || "None identified";
  const jurisdictions = asList(intake.jurisdictions).join(", ") || "Not specified";
  const legalBasisProposed = intake.legal_basis_proposed || "Not specified";
  const article9Condition = intake.article_9_condition || "Not specified";
  const necessityProportionality = intake.necessity_proportionality || "Not provided";
  const retentionPeriod = intake.retention_period || "Not specified";
  const sector = intake.sector || intake.organization_sector || "Not specified";
  const controllerContact = intake.controller_contact || "Not specified";
  const dpoInfo = intake.dpo_info || "Not specified";
  const processorObligations = intake.processor_obligations || "Not specified";
  const processingVersion = intake.processing_version || "Not specified";
  const launchDate = intake.estimated_launch_date || "Not specified";
  const endDate = intake.estimated_end_date || "Not specified";
  const dpiaTeam = intake.dpia_team || "Not specified";
  const referenceMaterials = intake.reference_materials || "Not specified";
  const reasonsToConduct = asList(intake.reasons_to_conduct).join("; ") || "Not specified";
  const dpiaScopeNote = intake.dpia_scope_note || "Not specified";
  const publicationIntent = intake.publication_intent || "Not specified";
  const secondaryUses = intake.secondary_uses || "Not specified";
  const natureScopeContext = intake.nature_scope_context || "Not specified";
  const functionalDescription = intake.functional_description || "Not specified";
  const supportingAssets = intake.supporting_assets || "Not specified";
  const codesOfConduct = intake.codes_of_conduct || "Not specified";
  const dataMinimisationJustification = intake.data_minimisation_justification || "Not specified";
  const dataQualityMeasures = intake.data_quality_measures || "Not specified";
  const dataSubjectRightsMechanisms = intake.data_subject_rights_mechanisms || "Not specified";
  const dpByDesignMeasures = intake.dp_by_design_measures || "Not specified";
  const dpoAdvice = intake.dpo_advice || "Not specified";
  const dataSubjectsViewsSought = intake.data_subjects_views_sought || "Not specified";
  const dataSubjectsViews = intake.data_subjects_views || "Not specified";

  const enforcementContextStr = enforcementPrecedents.length > 0
    ? enforcementPrecedents.map((r: any, i: number) => {
        const provs = Array.isArray(r.statutory_provisions) && r.statutory_provisions.length
          ? ` — citing ${r.statutory_provisions.join(", ")}` : "";
        const fineVerified = r.fine_verified !== false;
        const fine = !fineVerified
          ? "fine amount under verification — omitted"
          : (r.fine_eur_equivalent ? `€${Number(r.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
        return `[E${i + 1}] id:${r.id} ${r.subject || "Unnamed"} — ${r.regulator} (${r.jurisdiction}, ${r.decision_date || "n.d."}) — Fine: ${fine} — Failure: ${r.key_compliance_failure || r.violation || "n/a"} — Preventive: ${r.preventive_measures || "n/a"}${provs}`;
      }).join("\n")
    : "No directly analogous enforcement precedents retrieved.";

  return `PROCESSING ACTIVITY DETAILS:
Organisation (controller) being assessed: ${orgName || "not specified"}
Processing activity name: ${intake.processing_activity_name || "not specified"}
Sector: ${sector}
Legal basis selected by user: ${legalBasisProposed}
Description: ${processingDesc}
Purpose: ${purpose}
Data categories: ${dataCategories}
Data subjects: ${dataSubjects}
Volume/frequency: ${volume}
Third-party processors: ${thirdParties}
Existing safeguards: ${safeguards}
Jurisdictions: ${jurisdictions}
Article 9(2) condition for special-category data (selected by user): ${article9Condition}
Retention period (provided by user): ${retentionPeriod}
Necessity, proportionality & alternatives considered (provided by user): ${necessityProportionality}

EDPB TEMPLATE — SECTION 0 (OVERVIEW) INPUTS (controller-provided; use to populate section_0_overview):
Controller main establishment / point of contact: ${controllerContact}
DPO (or similar function): ${dpoInfo}
Processor / sub-processor obligations & tasks: ${processorObligations}
Processing current version / change history: ${processingVersion}
Estimated launch date: ${launchDate}
Estimated end date / expiry: ${endDate}
DPIA team / roles (RACI): ${dpiaTeam}
Guidelines / standards used: ${referenceMaterials}
Reasons to conduct the DPIA (controller-selected): ${reasonsToConduct}
Scope of this DPIA (in / out): ${dpiaScopeNote}
Publication / external-sharing intent: ${publicationIntent}

EDPB TEMPLATE — SECTIONS 1, 2 & 5 INPUTS (controller-provided; assess these as proposals, do not treat as settled conclusions):
[Section 1 — description] Secondary / compatible uses: ${secondaryUses}; Nature, scope & context: ${natureScopeContext}; Functional description: ${functionalDescription}; Means / supporting assets & architecture: ${supportingAssets}; Approved codes of conduct / certifications: ${codesOfConduct}
[Section 2 — compliance] Data minimisation justification: ${dataMinimisationJustification}; Data quality measures: ${dataQualityMeasures}; Measures supporting data subjects' rights: ${dataSubjectRightsMechanisms}; Data protection by design & default: ${dpByDesignMeasures}
[Section 5 — interested parties] DPO advice: ${dpoAdvice}; Data subjects' views sought: ${dataSubjectsViewsSought}; Data subjects' views / justification: ${dataSubjectsViews}
USE THESE INPUTS: fold them into section_1_description, section_2_analysis, and section_5_interested_parties. Where a value is "Not specified", keep the existing [TO COMPLETE] behaviour for that element rather than inventing content.
${orgContext}

ENFORCEMENT PRECEDENTS (cite by [E1]–[E5] where relevant):
${enforcementContextStr}

ANNOTATION REQUIREMENT: For each enforcement action cited above (tagged [E1], [E2], etc.), if it directly supports a risk identification, severity rating, or mitigating measure in the risk assessment, include it in the section_4_risk_management.annotations array using the id value from the enforcement context exactly as provided. You MUST only cite enforcement actions from the ENFORCEMENT PRECEDENTS provided above — never cite cases from training knowledge. If an enforcement action is not in the provided context, do not cite it.

USER-PROVIDED INPUT HANDLING: The intake above may include user-provided inputs — an Article 9(2) condition, a necessity/proportionality & alternatives statement, and a retention period. Where a value is provided (i.e. not "Not specified"/"Not provided"): (1) Article 9(2) condition — treat as PROPOSED, assess soundness (e.g. flag employment/power-imbalance issues under Art. 9(2)(a)). Do NOT emit a blank "[TO COMPLETE — identify Article 9(2) condition]" when the user has supplied one. (2) Necessity, proportionality & alternatives — incorporate into section_3_necessity_proportionality, assessing them. (3) Retention period — use it in section_2_analysis.data_minimisation_retention. Never treat these user inputs as settled legal conclusions — assess them as proposals the organisation must validate and document.

COMPACT-CELLS OUTPUT RULE: Table cells and matrix rows are COMPACT. Each cell contains a substantive but concise determination of approximately 40 words or fewer — enough to state the determination and its immediate justification, not an essay. The narrative sections (guidance_note, nature, scope, context, and the section-level completion_guidance blocks) carry the analysis; tables carry the determinations. This rule does not reduce substantive scope — every required field is still populated with an assessed determination — it constrains only the length and register of table-cell text.${renderSupplementalBlock({ responses: (intake as any)?.supplemental_responses, context: (intake as any)?.supplemental_context })}`;
}

// r1b2.3 fix (b): robust parse. The original greedy `/\{[\s\S]*\}/` regex is
// fragile when the model emits fenced/preamble noise or when a continuation
// stitch introduces multiple top-level braces. Order:
//   1. strip common code-fence wrapper, then try JSON.parse(text) directly;
//   2. balanced-brace scan from the first '{' — pick the first complete top-
//      level object (string-aware, so braces inside strings don't count);
//   3. fall back to the original greedy match as a last resort.
// unit_missing_keys remains the fail-loud terminator downstream.
function parseJsonish(text: string): any {
  if (!text || typeof text !== "string") return {};
  const stripped = text.replace(/^\s*```(?:json)?\n?/, "").replace(/\n?```\s*$/, "").trim();
  // (1) direct parse
  try { return JSON.parse(stripped); } catch (_) { /* fall through */ }
  // (2) balanced-brace scan (string-aware)
  const start = stripped.indexOf("{");
  if (start >= 0) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < stripped.length; i++) {
      const ch = stripped[i];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (ch === "\\") { esc = true; continue; }
        if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const candidate = stripped.slice(start, i + 1);
          try { return JSON.parse(candidate); } catch (_) { break; }
        }
      }
    }
  }
  // (3) legacy greedy fallback
  try {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (e) {
    console.error("[DPIA] parse error (greedy fallback):", e, "Tail:", stripped.slice(-200));
  }
  console.error("[DPIA] parseJsonish returned {} — all strategies failed. Head:", stripped.slice(0, 200), "Tail:", stripped.slice(-200));
  return {};
}

// U4 hand-off tail (design_risk_impacts VERBATIM from U3).
function u4HandoffTail(u3Keys: any): string {
  const design = u3Keys?.section_3_necessity_proportionality?.design_risk_impacts ?? [];
  return `\n\nGIVEN — Section 3 design_risk_impacts (verbatim from earlier generation stage; do not modify):\n${JSON.stringify(design, null, 2)}\n\nUse these design risks alongside your own incident_risk_impacts to build inherent_risk_assessment (each row scored likelihood × severity with modulating factors). residual_risk_assessment then re-scores those risks AFTER the additional mitigating measures.`;
}

// U5 digest tail — compact summaries of U1..U4 for consistency-sweep only.
function u5DigestTail(units: Record<string, any>): string {
  const u1 = units.u1?.keys ?? {};
  const u2 = units.u2?.keys ?? {};
  const u3 = units.u3?.keys ?? {};
  const u4 = units.u4?.keys ?? {};

  const meta = u1.dpia_metadata ?? {};
  const trigger = meta.article_35_3_trigger ?? "";
  const inherent = Array.isArray(u4?.section_4_risk_management?.inherent_risk_assessment)
    ? u4.section_4_risk_management.inherent_risk_assessment.slice(0, 20).map((r: any) => ({
        risk: String(r.risk ?? "").slice(0, 100), level: r.risk_level, acceptable: r.acceptable,
      }))
    : [];
  const residual = Array.isArray(u4?.section_4_risk_management?.residual_risk_assessment)
    ? u4.section_4_risk_management.residual_risk_assessment.slice(0, 20).map((r: any) => ({
        risk: String(r.risk ?? "").slice(0, 100), level: r.residual_risk_level, acceptable: r.acceptable,
      }))
    : [];
  const measures = Array.isArray(u4?.section_4_risk_management?.additional_mitigating_measures)
    ? u4.section_4_risk_management.additional_mitigating_measures.slice(0, 20).map((m: any) => ({
        measure: String(m.measure ?? "").slice(0, 120), status: m.implementation_status,
      }))
    : [];

  // Collect [TO COMPLETE] items and information_needed entries across U1..U4.
  const toComplete: string[] = [];
  const infoNeeded: any[] = [];
  const walk = (o: any) => {
    if (o == null) return;
    if (typeof o === "string") {
      if (/\[TO COMPLETE|\[TO BE ASSESSED/i.test(o)) toComplete.push(o.slice(0, 160));
      return;
    }
    if (Array.isArray(o)) { for (const v of o) walk(v); return; }
    if (typeof o === "object") {
      for (const k of Object.keys(o)) {
        if (k === "information_needed" && Array.isArray(o[k])) infoNeeded.push(...o[k]);
        walk(o[k]);
      }
    }
  };
  walk({ u1, u2, u3, u4 });

  return `\n\nEARLIER-STAGE DIGEST (consistency-sweep input; do NOT introduce new legal determinations):
- dpia_metadata.article_35_3_trigger: ${JSON.stringify(trigger).slice(0, 400)}
- Inherent risks (sample): ${JSON.stringify(inherent).slice(0, 1200)}
- Residual risks (sample): ${JSON.stringify(residual).slice(0, 1200)}
- Additional measures (sample): ${JSON.stringify(measures).slice(0, 800)}
- Open [TO COMPLETE] items (${toComplete.length}): ${JSON.stringify(toComplete.slice(0, 20)).slice(0, 1200)}
- Information-needed entries (${infoNeeded.length}): ${JSON.stringify(infoNeeded.slice(0, 12)).slice(0, 800)}

CONSISTENCY DUTIES for section_6_conclusion:
- decision.conditions must reference specific measures listed above by name
- If any foundational determination is still [TO COMPLETE], decision starts with "DRAFT — INCOMPLETE"
- supervisory_authority_consultation_required: unconditionally "required" iff any residual risk above is High-level; state which risk(s)`;
}

function buildUnitUserPrompt(unit: UnitId, shared: SharedContextData, staging: any): string {
  const context = buildSharedUserContext(shared);
  const instruction = UNIT_INSTRUCTION[unit];
  const skeleton = UNIT_SKELETON[unit];
  let tail = "";
  if (unit === "u4") tail = u4HandoffTail(staging?.units?.u3?.keys);
  if (unit === "u5") tail = u5DigestTail(staging?.units ?? {});
  return `${context}\n\n${instruction}\n\n${skeleton}${tail}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence helpers — read-modify-write on report_data jsonb with
// optimistic concurrency (updated_at). Amendment 1: failure writes MERGE and
// preserve _staging.
// ─────────────────────────────────────────────────────────────────────────────
async function readRow(dpia_id: string) {
  const { data, error } = await supabase
    .from("dpia_frameworks").select("*").eq("id", dpia_id).single();
  if (error) throw error;
  return data;
}

async function optimisticUpdate(
  dpia_id: string,
  prevUpdatedAt: string | null,
  patch: Record<string, any>,
): Promise<boolean> {
  patch.updated_at = new Date().toISOString();
  let q = supabase.from("dpia_frameworks").update(patch).eq("id", dpia_id);
  if (prevUpdatedAt) q = q.eq("updated_at", prevUpdatedAt);
  const { data, error } = await q.select("id");
  if (error) { console.error("[optimisticUpdate] error:", error); return false; }
  return (data?.length ?? 0) > 0;
}

async function writeUnitStatus(dpia_id: string, unit: UnitId, patch: Record<string, any>): Promise<boolean> {
  // Retry loop for concurrent writers (u1/u2/u3 all writing status).
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await readRow(dpia_id);
    const rd = (row.report_data ?? {}) as any;
    const staging = rd._staging ?? { units: {}, version: STAMP };
    staging.units = staging.units ?? {};
    staging.units[unit] = { ...(staging.units[unit] ?? {}), ...patch };
    const nextRd = { ...rd, _staging: staging };
    const ok = await optimisticUpdate(dpia_id, row.updated_at, { report_data: nextRd });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
  }
  console.error(`[writeUnitStatus] failed after 5 attempts for unit=${unit}`);
  return false;
}

// Amendment 1: MERGE-preserving fail write.
// r1b2.3 fix (c): accept optional call telemetry so the _staging.units[uX]
// error entry carries stop_reason / output_tokens / continued / stitched_chars
// / cont_elapsed_ms — the ~6-min edge-log retention window is not durable
// enough; without this the failure has no trail once logs age out.
export interface FailTelemetry {
  stop_reason?: string | null;
  output_tokens?: number | null;
  continued?: boolean | null;
  first_stop_reason?: string | null;
  first_output_tokens?: number | null;
  cont_stop_reason?: string | null;
  cont_output_tokens?: number | null;
  cont_elapsed_ms?: number | null;
  cont_retried?: boolean | null;
  stitched_chars?: number | null;
  chars?: number | null;
}
async function mergePreservingFail(
  dpia_id: string,
  unit: UnitId | "stitch",
  err: unknown,
  elapsedMs: number,
  telemetry?: FailTelemetry,
): Promise<void> {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await readRow(dpia_id);
    const rd = (row.report_data ?? {}) as any;
    const staging = rd._staging ?? { units: {}, version: STAMP };
    staging.units = staging.units ?? {};
    if (unit !== "stitch") {
      staging.units[unit] = {
        ...(staging.units[unit] ?? {}),
        status: "error",
        error: message.slice(0, 500),
        elapsed_ms: elapsedMs,
        telemetry: telemetry ?? null,
      };
    }
    const nextRd = {
      ...rd,
      _staging: staging,
      last_error: { unit, error: message.slice(0, 500), elapsed_ms: elapsedMs, at: new Date().toISOString(), telemetry: telemetry ?? null },
    };
    const patch = { report_data: nextRd, status: "failed" as const };
    const ok = await optimisticUpdate(dpia_id, row.updated_at, patch);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
  }
  console.error(`[mergePreservingFail] failed after 5 attempts unit=${unit}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-reinvoke (mirrors run-quality-batch pattern; STOP-condition #1 CLEAR).
// ─────────────────────────────────────────────────────────────────────────────
// QB-P21: up to 2 retries with 2s / 8s backoff before giving up. On final
// failure, mark the unit's _staging status as "error" with a last_error
// string on the row so the stall is visible in data and item-2 (harness
// resurrection) can pick it up. Do not otherwise change unit behavior.
async function selfInvokeUnit(dpia_id: string, unit: UnitId): Promise<void> {
  const backoffs = [0, 2_000, 8_000];
  let lastErr = "";
  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt] > 0) await new Promise((r) => setTimeout(r, backoffs[attempt]));
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/run-dpia-framework`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "x-internal-unit": "1",
        },
        body: JSON.stringify({ dpia_id, unit }),
        signal: AbortSignal.timeout(20_000),
      });
      if (r.ok) return;
      lastErr = `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`;
      console.warn(`[run-dpia-framework] self-invoke unit=${unit} attempt=${attempt + 1} ${lastErr}`);
    } catch (e) {
      lastErr = (e as Error).message;
      console.warn(`[run-dpia-framework] self-invoke unit=${unit} attempt=${attempt + 1} failed:`, lastErr);
    }
  }
  // Final failure — record visibility on the row so item-2 can resurrect.
  try {
    await writeUnitStatus(dpia_id, unit, { status: "error", error: `self-invoke failed: ${lastErr}`.slice(0, 500) });
    const row = await readRow(dpia_id);
    await optimisticUpdate(dpia_id, row.updated_at, {
      last_error: { unit, error: `self-invoke dispatch failed after retries: ${lastErr}`.slice(0, 500), at: new Date().toISOString() },
    });
  } catch (e) {
    console.error(`[run-dpia-framework] failed to record self-invoke failure for unit=${unit}:`, (e as Error).message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase advance (optimistic). Returns list of next units to dispatch.
// ─────────────────────────────────────────────────────────────────────────────
async function advancePhaseIfReady(dpia_id: string): Promise<UnitId[]> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await readRow(dpia_id);
    const rd = (row.report_data ?? {}) as any;
    const staging = rd._staging;
    if (!staging?.units) return [];
    const s = staging.units;
    const done = (u: UnitId) => s[u]?.status === "done";
    const blocked = (u: UnitId) => s[u]?.status === "blocked";
    const dispatchable: UnitId[] = [];
    let mutated = false;
    // Ratified gating (r1b2.3): U4 depends solely on U3 (design_risk_impacts hand-off).
    // U5 digest consumes U1/U2/U3/U4 keys, so it keeps the full-phase gate.
    if (done("u3") && blocked("u4")) {
      s.u4.status = "dispatching"; dispatchable.push("u4"); mutated = true;
    }
    if (done("u4") && done("u1") && done("u2") && blocked("u5")) {
      s.u5.status = "dispatching"; dispatchable.push("u5"); mutated = true;
    }
    if (!mutated) return [];
    const ok = await optimisticUpdate(dpia_id, row.updated_at, {
      report_data: { ...rd, _staging: staging },
    });
    if (ok) return dispatchable;
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit executor.
// ─────────────────────────────────────────────────────────────────────────────
async function runUnit(dpia_id: string, unit: UnitId): Promise<void> {
  const startedMs = Date.now();
  const row0 = await readRow(dpia_id);
  const rd0 = (row0.report_data ?? {}) as any;
  const staging = rd0._staging;
  if (!staging?.shared) {
    console.error(`[unit:${unit}] no _staging.shared — cannot execute; skipping`);
    return;
  }
  // Skip-if-already-done (idempotency for sweeper re-entry).
  if (staging.units?.[unit]?.status === "done") {
    console.log(`[unit:${unit}] already done — skip`);
    return;
  }
  // Optimistic transition → processing.
  await writeUnitStatus(dpia_id, unit, { status: "processing", started_at: new Date(startedMs).toISOString() });

  const shared: SharedContextData = staging.shared;
  // Rebuild system blocks from code (Amendment 2 — never persisted).
  const systemBlocks = buildSystemBlocksForUnit(shared);
  const userPrompt = buildUnitUserPrompt(unit, shared, staging);

  // Sanctioned chaos hook (r1b2.3, permanent A1 regression hook): when the
  // DPIA_FORCE_FAIL_UNIT secret matches this unit id, throw before the model
  // call so the mergePreservingFail path is exercised end-to-end. Inert when
  // the secret is unset. Do not remove — the courier ledger references this.
  if (Deno.env.get("DPIA_FORCE_FAIL_UNIT") === unit) {
    const elapsedMs = Date.now() - startedMs;
    console.log(`[run-dpia-framework] stage=unit:${unit} forced-fail (DPIA_FORCE_FAIL_UNIT)`);
    await mergePreservingFail(dpia_id, unit, new Error(`forced-fail: DPIA_FORCE_FAIL_UNIT=${unit}`), elapsedMs);
    return;
  }
  try {
    const r = await dpiaWithRetry(() => callAnthropicWithContinuation({
      model: "claude-sonnet-4-6",
      system: systemBlocks,
      user: userPrompt,
      maxTokens: UNIT_MAX_TOKENS[unit],
      label: `run-dpia-framework:unit:${unit}`,
    }), { label: `dpia:unit:${unit}` });
    const elapsedMs = Date.now() - startedMs;
    // Telemetry line (courier §10) — extractable from edge-function logs.
    console.log(`[run-dpia-framework] stage=unit:${unit} elapsed=${elapsedMs}ms output_tokens=${r.outputTokens ?? "?"} stop_reason=${r.stopReason ?? "?"} chars=${r.text.length} continued=${r.continued} cont_retried=${r.contRetried ?? false}`);
    // r1b2.3 fix (c): durable telemetry passed into every failure write.
    const callTelemetry: FailTelemetry = {
      stop_reason: r.stopReason,
      output_tokens: r.outputTokens,
      continued: r.continued,
      first_stop_reason: r.firstStopReason ?? null,
      first_output_tokens: r.firstOutputTokens ?? null,
      cont_stop_reason: r.contStopReason ?? null,
      cont_output_tokens: r.contOutputTokens ?? null,
      cont_elapsed_ms: r.contElapsedMs ?? null,
      cont_retried: r.contRetried ?? null,
      stitched_chars: r.stitchedChars ?? r.text.length,
      chars: r.text.length,
    };
    if (r.stopReason === "max_tokens") {
      console.error(`[unit:${unit}] truncated after continuation — treating as terminal failure`);
      await mergePreservingFail(dpia_id, unit, new Error("truncated_after_continuation"), elapsedMs, callTelemetry);
      return;
    }
    const keys = parseJsonish(r.text);
    // Verify unit produced its required keys.
    const missing = UNIT_KEYS[unit].filter((k) => !keys || typeof keys !== "object" || !(k in keys));
    if (missing.length > 0) {
      console.error(`[unit:${unit}] parsed JSON missing required keys: ${missing.join(", ")}`);
      await mergePreservingFail(dpia_id, unit, new Error(`unit_missing_keys:${missing.join(",")}`), elapsedMs, callTelemetry);
      return;
    }
    await writeUnitStatus(dpia_id, unit, {
      status: "done",
      keys,
      elapsed_ms: elapsedMs,
      output_tokens: r.outputTokens ?? null,
      stop_reason: r.stopReason ?? null,
      continued: r.continued,
      cont_retried: r.contRetried ?? false,
    });
  } catch (e) {
    const elapsedMs = Date.now() - startedMs;
    console.error(`[unit:${unit}] error after ${elapsedMs}ms:`, e);
    await mergePreservingFail(dpia_id, unit, e, elapsedMs);
    return;
  }

  // Phase advance — dispatch next unit(s) atomically.
  const next = await advancePhaseIfReady(dpia_id);
  for (const u of next) {
    await selfInvokeUnit(dpia_id, u);
  }

  // If we just finished U5, run the stitch stage inline (still in this isolate).
  if (unit === "u5") {
    await runStitch(dpia_id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stitch: merge U1..U5 keys, run whole-doc post-generation machinery, complete.
// All post-gen checks are PRESERVED from the r1b2.2 file (residual repair,
// methodology reconciliation, lint walk, T-1..T-5 detection, jurisdiction
// validator, insufficient-info-guard, placeholder scan, recordRunMeter,
// observeCitations, accumulate-ropa, PDF/email delivery). Retries that would
// regenerate full halves are converted to log-only (elapsed budget is always
// exhausted after sectioned generation — same behaviour as the existing
// time-budget skip at L1110 of r1b2.2).
// ─────────────────────────────────────────────────────────────────────────────
async function runStitch(dpia_id: string): Promise<void> {
  const stitchStart = Date.now();
  try {
    const row = await readRow(dpia_id);
    const rd = (row.report_data ?? {}) as any;
    const staging = rd._staging;
    if (!staging?.units) throw new Error("stitch_no_staging");
    const dpiaIntake = (row.intake_data as any) ?? {};

    const shared: SharedContextData = staging.shared;
    const dpiaTestStates = shared.testStates;
    const resolved = shared.resolved;
    const enforcementPrecedents = shared.enforcementPrecedents;
    const enforcementMeta = shared.enforcementMeta;
    const gdprMeta = shared.gdprMeta;

    // MERGE unit outputs into a single reportData (byte-compatible with r1b2.2).
    let reportData: any = {
      ...(staging.units.u1?.keys ?? {}),
      ...(staging.units.u2?.keys ?? {}),
      ...(staging.units.u3?.keys ?? {}),
      ...(staging.units.u4?.keys ?? {}),
      ...(staging.units.u5?.keys ?? {}),
    };

    // ── QB8-8(a) residual completeness check (repair pass) ─────────────────
    try {
      const requiredResidualFields = ["residual_likelihood", "residual_risk_level", "additional_measures"];
      const s4 = reportData?.section_4_risk_management;
      const residual = Array.isArray(s4?.residual_risk_assessment) ? s4.residual_risk_assessment : null;
      if (residual) {
        const deficient = residual
          .map((e: any, i: number) => ({ i, e, missing: requiredResidualFields.filter((f) => !e?.[f] || (typeof e[f] === "string" && !e[f].trim())) }))
          .filter((x: any) => x.missing.length > 0);
        if (deficient.length > 0) {
          console.warn(`[DPIA] QB8-8(a): ${deficient.length} residual_risk_assessment entries missing required fields — repair pass`);
          const repairPrompt = `The following residual_risk_assessment entries from a DPIA are incomplete. Return ONLY a JSON object of the form {"residual_risk_assessment":[...]} containing the SAME entries in the SAME order, completing the listed missing fields for each. Do not change fields that are already populated. Missing fields per entry:\n\n${JSON.stringify(deficient.map((d: any) => ({ index: d.i, entry: d.e, missing_fields: d.missing })), null, 2)}`;
          const systemBlocks = buildSystemBlocksForUnit(shared);
          const repair = await dpiaWithRetry(() => callAnthropicWithContinuation({
            model: "claude-sonnet-4-6",
            system: systemBlocks,
            user: repairPrompt,
            maxTokens: Math.floor(PRODUCT_MAX_OUTPUT_TOKENS * 0.5),
            label: "run-dpia-framework:repair-residual",
          }), { label: "dpia:repair-residual" });
          const repaired = parseJsonish(repair.text);
          const repairedArr = Array.isArray(repaired?.residual_risk_assessment) ? repaired.residual_risk_assessment : null;
          if (repairedArr) {
            for (const d of deficient) {
              const match = repairedArr.find((x: any, idx: number) => idx === d.i || x?.risk_name === d.e?.risk_name);
              if (match) residual[d.i] = { ...residual[d.i], ...match };
            }
          }
          const stillDeficient = residual.filter((e: any) => requiredResidualFields.some((f) => !e?.[f] || (typeof e[f] === "string" && !e[f].trim())));
          if (stillDeficient.length > 0) {
            console.error(`[DPIA] QB8-8(a): still incomplete after repair (${stillDeficient.length}) — marking failed`);
            throw new Error(`DPIA residual_risk_assessment incomplete after repair (${stillDeficient.length} entries)`);
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("DPIA residual_risk_assessment incomplete")) throw e;
      console.error("[DPIA] QB8-8(a) errored:", e);
    }

    // ── QB13-5(a) methodology reconciliation ───────────────────────────────
    try {
      const s4 = reportData?.section_4_risk_management;
      const methodText = [s4?.method, s4?.methodology, s4?.risk_methodology, s4?.guidance_note, s4?.method_note]
        .filter((v) => typeof v === "string").join(" \n ").toLowerCase();
      if (methodText.includes("higher of")) {
        const rank: Record<string, number> = { low: 1, medium: 2, high: 3 };
        const label = ["", "Low", "Medium", "High"];
        const higher = (a: any, b: any): string | null => {
          const av = rank[String(a ?? "").trim().toLowerCase()];
          const bv = rank[String(b ?? "").trim().toLowerCase()];
          if (!av || !bv) return null;
          return label[Math.max(av, bv)];
        };
        let corrections = 0;
        const inherent = Array.isArray(s4?.inherent_risk_assessment) ? s4.inherent_risk_assessment : [];
        for (const row of inherent) {
          const expected = higher(row?.likelihood, row?.severity);
          if (expected && row?.risk_level && String(row.risk_level).trim().toLowerCase() !== expected.toLowerCase()) {
            row.risk_level = expected;
            corrections += 1;
          }
        }
        const residual = Array.isArray(s4?.residual_risk_assessment) ? s4.residual_risk_assessment : [];
        for (const row of residual) {
          const expected = higher(row?.residual_likelihood, row?.residual_severity);
          if (!expected) continue;
          const cur = String(row?.residual_risk_level ?? "").trim();
          const suffixMatch = cur.match(/^(?:low|medium|high)\b(.*)$/i);
          const suffix = suffixMatch ? suffixMatch[1] : "";
          const curLevel = suffixMatch ? suffixMatch[0].split(/\s|—|-/)[0] : cur;
          if (curLevel && curLevel.toLowerCase() !== expected.toLowerCase()) {
            row.residual_risk_level = `${expected}${suffix}`;
            corrections += 1;
          }
        }
        if (corrections > 0) console.warn(`[DPIA] QB13-5(a): corrected ${corrections} risk_level value(s)`);
      }
    } catch (e) {
      console.error("[DPIA] QB13-5(a) errored:", e);
    }

    // ── Lint walk (retries dropped: sectioned elapsed always exhausted) ────
    const lintViolations: any[] = [];
    function walkAndLint(obj: any, path: string): void {
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          if (typeof obj[i] === "string") {
            const r = lintReportText(obj[i]);
            for (const v of r.violations) lintViolations.push({ field: `${path}[${i}]`, ...v });
            obj[i] = r.clean;
          } else if (obj[i] && typeof obj[i] === "object") {
            walkAndLint(obj[i], `${path}[${i}]`);
          }
        }
      } else if (obj && typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (typeof v === "string") {
            const r = lintReportText(v);
            for (const vi of r.violations) lintViolations.push({ field: `${path}.${k}`, ...vi });
            obj[k] = r.clean;
          } else if (v && typeof v === "object") {
            walkAndLint(v, `${path}.${k}`);
          }
        }
      }
    }
    walkAndLint(reportData, "report");

    // ── T-1..T-5 detection (log-only — courier §7 preserved; retries dropped
    //    because sectioned elapsed always exceeds DPIA_T234_RETRY_ELAPSED_THRESHOLD_MS,
    //    matching the existing time-budget-exceeded skip behaviour.)
    {
      const collapseRe = /\b(cannot be determined|no basis to assess|not established)\b/i;
      const depthLangRe = /\b(could|would strengthen|additional context|nice to have|consider (?:adding|providing)|optionally|for completeness|to enrich)\b/i;
      const statAnchorRe = /(Art\.\s*\d|Article\s+\d|Recital\s+\d|GDPR|WP248|EDPB)/i;
      function collectStrings(obj: any, out: string[]): void {
        if (typeof obj === "string") { out.push(obj); return; }
        if (Array.isArray(obj)) { for (const v of obj) collectStrings(v, out); return; }
        if (obj && typeof obj === "object") { for (const k of Object.keys(obj)) collectStrings(obj[k], out); }
      }
      const t2: any[] = []; const t3: any[] = []; const t4: any[] = [];
      const s2 = reportData?.section_2_analysis;
      if (dpiaTestStates.M3?.state === "resolved_met") {
        const s2Strings: string[] = []; collectStrings(s2, s2Strings);
        for (const s of s2Strings) if (/\[TO COMPLETE[^\]]*(Art(?:icle)?\.?\s*9(?:\(2\))?|special.category.condition)/i.test(s))
          t2.push({ test: "M3", kind: "re_asks_art9_condition", detail: s.slice(0, 160) });
      }
      if (dpiaTestStates.M4?.state === "resolved_met") {
        const allStrings: string[] = []; collectStrings(reportData, allStrings);
        for (const s of allStrings) if (/\[TO COMPLETE[^\]]*(legal\s+basis|Art(?:icle)?\.?\s*6\(1\))/i.test(s))
          t2.push({ test: "M4", kind: "re_asks_legal_basis", detail: s.slice(0, 160) });
      }
      if (dpiaTestStates.M7?.state === "resolved_met") {
        const allStrings: string[] = []; collectStrings(reportData, allStrings);
        for (const s of allStrings) if (/\[TO COMPLETE[^\]]*retention/i.test(s))
          t2.push({ test: "M7", kind: "re_asks_retention", detail: s.slice(0, 160) });
      }
      if (dpiaTestStates.M1?.state === "resolved_met") {
        const meta = String(reportData?.dpia_metadata?.article_35_3_trigger ?? "");
        if (/(does not apply|not engaged|no Art\.\s*35\(3\)\(b\))/i.test(meta))
          t2.push({ test: "M1", kind: "denies_resolved_prong", detail: meta.slice(0, 160) });
      }
      if (dpiaTestStates.M6?.state === "resolved_met") {
        const allStrings: string[] = []; collectStrings(reportData, allStrings);
        for (const s of allStrings) if (/no (?:international )?transfers? (?:identified|apply)/i.test(s)) {
          t2.push({ test: "M6", kind: "denies_transfer_surface", detail: s.slice(0, 160) }); break;
        }
      }
      const anyResolvedMet = Object.values(dpiaTestStates).some((v) => v.state === "resolved_met");
      if (anyResolvedMet) {
        const proseFields: Array<[string, any]> = [
          ["section_3_necessity_proportionality", reportData?.section_3_necessity_proportionality],
          ["section_6_conclusion.justification", reportData?.section_6_conclusion?.justification],
        ];
        for (const [name, obj] of proseFields) {
          const bucket: string[] = []; collectStrings(obj, bucket);
          for (const s of bucket) if (collapseRe.test(s)) { t3.push({ field: name, detail: s.slice(0, 160) }); break; }
        }
      }
      function walkForT4(obj: any, path: string): void {
        if (!obj) return;
        if (Array.isArray(obj)) { obj.forEach((v, i) => walkForT4(v, `${path}[${i}]`)); return; }
        if (typeof obj !== "object") return;
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (k === "completion_guidance" && typeof v === "string") {
            if (depthLangRe.test(v) && !statAnchorRe.test(v)) t4.push({ path: `${path}.${k}`, detail: v.slice(0, 160) });
          } else if (v && typeof v === "object") walkForT4(v, `${path}.${k}`);
        }
      }
      walkForT4(reportData, "report");
      const t5Hits = detectTestStatesLeak(reportData);
      const blHits = detectBlacklistPhrases(reportData);
      const totalHits = t2.length + t3.length + t4.length + t5Hits.length + blHits.length;
      if (totalHits > 0) {
        console.warn(JSON.stringify({
          evt: "post_gen_violation_stitch_logonly",
          fn: "run-dpia-framework",
          stage: "stitch",
          reason: "sectioned_generation_no_full_regen_retry",
          t2_count: t2.length, t3_count: t3.length, t4_count: t4.length, t5_count: t5Hits.length, blacklist_count: blHits.length,
          samples: { t2: t2.slice(0, 3), t3: t3.slice(0, 3), t4: t4.slice(0, 3), t5: t5Hits.slice(0, 3), blacklist: blHits.slice(0, 3) },
        }));
      }
      for (const v of t2) lintViolations.push({ rule: "T-2", ...v });
      for (const v of t3) lintViolations.push({ rule: "T-3", ...v });
      for (const v of t4) lintViolations.push({ rule: "T-4", ...v });
      for (const v of t5Hits) lintViolations.push({ rule: "T-5", field: v.path, match: v.match, context: v.context });
      // FF-2 T1 — DPIA ships with per-hit blacklist_phrase_shipped lint
      // (sectioned generation has no full-regen retry — over-budget path).
      for (const h of blHits) lintViolations.push({ rule: "BLACKLIST", code: "blacklist_phrase_shipped", field: h.path, match: h.match, context: h.context });
      if (blHits.length > 0) {
        if (!Array.isArray((reportData as any).lint_warnings)) (reportData as any).lint_warnings = [];
        for (const h of blHits) {
          (reportData as any).lint_warnings.push({
            code: "blacklist_phrase_shipped",
            field: h.path,
            match: h.match,
            context: h.context,
          });
        }
      }


      // FF-3 T1 (pd4) — UNCONDITIONAL authority backfill. Runs on EVERY
      // document, not only when the violation gate trips. Idempotent and
      // placeholder-gated; a clean document with no [TO COMPLETE — supervisory
      // authority for X] placeholders is a no-op. Notes fold into
      // dpiaFallbackNotes so post_gen_lint telemetry sees them.
      const dpiaAuthorityNotes: Array<{ code: string; detail: string }> = [];
      try {
        const backfilled = backfillDpiaAuthorities(reportData, dpiaAuthorityNotes);
        Object.assign(reportData, backfilled);
        if (dpiaAuthorityNotes.length > 0) {
          console.warn(JSON.stringify({
            evt: "authority_backfill_unconditional",
            fn: "run-dpia-framework",
            notes: dpiaAuthorityNotes.slice(0, 40),
          }));
        }
      } catch (e) {
        console.warn("[run-dpia-framework] unconditional authority backfill failed (non-fatal):", (e as Error)?.message);
      }

      // FF-4 pd6 — UNCONDITIONAL, record-driven OSS template correction. Runs
      // on every document. If the intake places the controller in an EU/EEA
      // member and the report still asserts the false 4(16)(b) / non-EU
      // template anywhere in user-facing strings, replace
      // dpia_metadata.supervisory_authority_consultation_trigger with the
      // corrected Art. 4(16)(a) sentence. Idempotent on a clean document.
      try {
        const ossNotes: Array<{ code: string; detail: string }> = [];
        const corrected = correctOssTemplateFromRecord(reportData, (dpiaIntake as Record<string, any>) ?? {}, ossNotes);
        if (ossNotes.length > 0) {
          Object.assign(reportData, corrected);
          dpiaAuthorityNotes.push(...ossNotes);
          console.warn(JSON.stringify({
            evt: "oss_template_corrected",
            fn: "run-dpia-framework",
            notes: ossNotes,
          }));
        }
      } catch (e) {
        console.warn("[run-dpia-framework] OSS template corrector failed (non-fatal):", (e as Error)?.message);
      }


      // REBUILD-DPIA T3 — deterministic post-generation fallback (mirror of
      // cppa-risk POSTBATCH-1). Runs whenever T-5 test-state leaks are present
      // OR any information_needed entry re-requests a source_field backing a
      // RESOLVED test. Idempotent on a clean document. Fire-and-forget lint
      // telemetry via logPostGenLint (fail-open). Authority backfill remains
      // inside applyDeterministicPostGenFallbackDpia (idempotent — the earlier
      // unconditional call already filled placeholders, so it's a no-op here).
      let dpiaFallbackApplied = false;
      let dpiaFallbackNotes: Array<{ code: string; detail?: string }> = [...dpiaAuthorityNotes];
      let dpiaResidualResolvedAsks = 0;
      try {
        const testStatesForFallback = computeDpiaTestStates((dpiaIntake as Record<string, any>) ?? {});
        const resolvedSources = new Set<string>();
        for (const ts of Object.values(testStatesForFallback ?? {})) {
          if (ts && typeof (ts as any).state === "string" && (ts as any).state.startsWith("resolved")) {
            for (const f of (ts as any).source_fields ?? []) resolvedSources.add(f);
          }
        }
        const infoNeeded: any[] = Array.isArray((reportData as any)?.information_needed) ? (reportData as any).information_needed : [];
        dpiaResidualResolvedAsks = infoNeeded.filter((e: any) => {
          const fs: string[] = [];
          if (typeof e?.field === "string") fs.push(e.field);
          if (Array.isArray(e?.source_fields)) for (const f of e.source_fields) if (typeof f === "string") fs.push(f);
          return fs.some((f) => resolvedSources.has(f));
        }).length;
        if (t5Hits.length > 0 || dpiaResidualResolvedAsks > 0) {
          const r = applyDeterministicPostGenFallbackDpia(reportData, testStatesForFallback as any);
          Object.assign(reportData, r.parsed);
          dpiaFallbackApplied = true;
          dpiaFallbackNotes = [...dpiaAuthorityNotes, ...r.notes];
          console.warn(JSON.stringify({
            evt: "post_gen_fallback_applied",
            fn: "run-dpia-framework",
            residual_leaks: t5Hits.length,
            residual_resolved_asks: dpiaResidualResolvedAsks,
            notes: r.notes.slice(0, 40),
          }));
        }
      } catch (e) {
        console.warn("[run-dpia-framework] post-gen fallback failed (non-fatal):", (e as Error)?.message);
      }
      // REBUILD-DPIA T9 — persist post_gen_lint telemetry (fire-and-forget).
      logPostGenLint(supabase, {
        functionName: "run-dpia-framework",
        fallbackApplied: dpiaFallbackApplied,
        residualLeaks: t5Hits.length,
        residualResolvedAsks: dpiaResidualResolvedAsks,
        notes: dpiaFallbackNotes,
        sourceTable: "dpia_frameworks",
        sourceRowId: dpia_id ?? null,
      });

      // PRODUCT-FIX-4 T3 — mid-body ownership-disclaimer scrub. The exact
      // sentence and its close paraphrases are permitted ONLY in the page-1
      // preamble and the closing framework_disclaimer. Any mid-body appearance
      // (executive_summary, sections 1-6, conclusion, completion_guidance,
      // dpia_metadata narratives, table cells) is removed. Preamble text and
      // the framework_disclaimer field are preserved verbatim.
      try {
        const RE = /\b(?:Your\s+qualified\s+(?:Data\s+Protection\s+Officer|DPO)|the\s+(?:qualified\s+)?DPO)\s+(?:or\s+legal\s+counsel\s+)?must\s+review,?\s*(?:and\s+)?complete,?\s*(?:and\s+)?(?:own\s+)?(?:and\s+own\s+)?it\.?/gi;
        const PROTECTED_KEYS = new Set(["framework_disclaimer", "preamble", "disclaimer"]);
        let midBodyScrubbed = 0;
        const walk = (node: any, parentKey: string | null) => {
          if (!node) return;
          if (Array.isArray(node)) { for (const v of node) walk(v, parentKey); return; }
          if (typeof node !== "object") return;
          for (const k of Object.keys(node)) {
            const v = (node as any)[k];
            if (PROTECTED_KEYS.has(k)) continue;
            if (typeof v === "string") {
              if (RE.test(v)) {
                const next = v.replace(RE, "").replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
                (node as any)[k] = next;
                midBodyScrubbed++;
              }
            } else if (v && typeof v === "object") walk(v, k);
          }
        };
        walk(reportData, null);
        if (midBodyScrubbed > 0) {
          console.warn(`[run-dpia-framework] PRODUCT-FIX-4 T3 mid-body ownership-disclaimer scrub: ${midBodyScrubbed} occurrence(s) removed`);
        }
      } catch (e) {
        console.warn("[run-dpia-framework] PRODUCT-FIX-4 T3 scrub failed (non-fatal):", (e as Error)?.message);
      }
    }


    // W3-T1 §3 — metadata dedup: processing_name is an emit-time cross-reference
    // of dpia_metadata.processing_activity_name (single source of truth). We
    // mirror the metadata value into section_0_overview.processing_name whenever
    // the metadata carries a value, so both surfaces always agree.
    try {
      const activityName =
        (reportData as any)?.dpia_metadata?.processing_activity_name ??
        (reportData as any)?.dpia_metadata?.processing_name ?? null;
      if (activityName && typeof activityName === "string" && activityName.trim()) {
        const ov = (reportData as any).section_0_overview ?? ((reportData as any).section_0_overview = {});
        ov.processing_name = activityName.trim();
      }
    } catch { /* non-fatal */ }

    // Hard-key validation (courier §7). Guard against a stitched-empty doc.
    if (!reportData.section_0_overview && !reportData.section_4_risk_management) {
      throw new Error("stitched report missing both section_0_overview and section_4_risk_management");
    }

    reportData.generated_at = new Date().toISOString();
    reportData.dpia_id = dpia_id;
    reportData.enforcement_precedents = enforcementPrecedents;
    reportData.enforcement_meta = enforcementMeta;
    // REBUILD-DPIA T7e — deterministic dedupe of gdprCites (exact-string, order-preserving).
    try {
      if (gdprMeta && Array.isArray((gdprMeta as any).gdprCites)) {
        (gdprMeta as any).gdprCites = dedupeStringArrayPreserveOrder((gdprMeta as any).gdprCites);
      }
    } catch { /* non-fatal */ }
    reportData.gdpr_meta = gdprMeta;
    reportData.lint_warnings = lintViolations;
    reportData._meta = { ...(reportData._meta ?? {}), prompt_version: stampPromptVersion("dpia-framework", STAMP) };

    // ── Jurisdiction validator ─────────────────────────────────────────────
    try {
      const jurisdictionFindings = validateJurisdiction(reportData, resolved);
      reportData.jurisdiction_validation = {
        resolved_summary: {
          competent_authorities: resolved.sites.map((s) => s.competentSA.name),
          oss_available: resolved.oss.ossAvailable,
          lead_authority: resolved.oss.leadAuthority?.name || null,
          transfer_mechanisms: resolved.transfers.map((t) => ({ destination: t.flow.destinationCountry, mechanism: t.resolved.mechanism, citation: t.resolved.citation })),
          template_status: resolved.template.label,
        },
        findings: jurisdictionFindings,
      };
      const errs = jurisdictionFindings.filter((f) => f.severity === "error");
      if (errs.length) console.warn(`[run-dpia-framework] jurisdiction validator errors: ${errs.map((e) => e.code).join(", ")}`);
    } catch (e) {
      console.warn("[run-dpia-framework] jurisdiction validator failed (non-fatal):", e);
    }

    // ── Placeholder scan ───────────────────────────────────────────────────
    const reportStr = JSON.stringify(reportData);
    reportData.has_unresolved_placeholders =
      reportStr.includes("[TO COMPLETE") ||
      reportStr.includes("[TO BE ASSESSED") ||
      reportStr.includes("[TO BE COMPLETED");
    try {
      reportData.annotations = Array.isArray(reportData?.section_4_risk_management?.annotations)
        ? reportData.section_4_risk_management.annotations
        : [];
    } catch { reportData.annotations = []; }

    // ── Insufficient-info-guard ────────────────────────────────────────────
    try {
      const guarded = guardInformationNeeded(reportData, (dpiaIntake as Record<string, unknown>) ?? {}, "dpia_framework");
      Object.assign(reportData, guarded.report);
    } catch (e) {
      console.warn("[run-dpia-framework] guardInformationNeeded failed (non-fatal):", e);
    }

    // ── Stage 1: metering + version retention ──────────────────────────────
    await recordRunMeterAndVersion(supabase, {
      toolType: "dpia_framework",
      assessmentId: dpia_id,
      userId: row.user_id ?? null,
      intake: (dpiaIntake as Record<string, unknown>) ?? {},
      reportData,
    });

    // ── Terminal complete: drop _staging, write final report_data ──────────
    // RC-B.1 B1.2: before dropping _staging, compute the item_id → unit map
    // from the frozen open_items and persist it OUTSIDE _staging (which is
    // dropped) under report_data._revision.item_unit_map. Data-only — no
    // prompt text. The revision-mode handler reads this on the revision path
    // to run ONLY the mapped units + U5 last.
    try {
      const { buildItemUnitMap } = await import("../_shared/dpia-unit-map.ts");
      const openItems = Array.isArray((reportData as any)?.open_items) ? (reportData as any).open_items : [];
      if (openItems.length > 0) {
        const map = buildItemUnitMap(openItems);
        (reportData as any)._revision = { ...((reportData as any)._revision ?? {}), item_unit_map: map };
      }
    } catch (e) {
      console.warn("[dpia] item_unit_map persist skipped:", (e as Error)?.message);
    }
    delete (reportData as any)._staging;
    // W3-T5 (d) — defensive source-provenance normalizer. Every row of
    // processed_personal_data, purposes, and functional_description that the
    // model returned without a well-formed `source` object gets one stamped
    // as {intake_field: "inferred", basis: "inferred"} so downstream UI /
    // PDF renderers never see undefined provenance and the grader can rely
    // on the field's presence. This never overwrites a model-supplied
    // source; it only fills missing ones.
    try {
      const s1 = ((reportData as any)?.section_1_description ?? {}) as Record<string, unknown>;
      for (const key of ["processed_personal_data", "purposes", "functional_description"]) {
        const arr = (s1 as any)?.[key];
        if (!Array.isArray(arr)) continue;
        for (const row of arr) {
          if (!row || typeof row !== "object") continue;
          const src = (row as any).source;
          const wellFormed = src && typeof src === "object"
            && typeof (src as any).intake_field === "string"
            && ((src as any).basis === "stated" || (src as any).basis === "inferred");
          if (!wellFormed) {
            (row as any).source = { intake_field: "inferred", basis: "inferred" };
          }
        }
      }
    } catch (e) {
      console.warn("[dpia] source-provenance normalizer skipped:", (e as Error)?.message);
    }
    // GRADER-CAL-5R — real disclaimer exclusion. The prior one-liner
    // destructured framework_disclaimer out and then re-inserted it via a
    // ternary whose branches were equivalent, so the disclaimer text was
    // still fed to runFormatChecksGeneric and the sanctioned ownership
    // sentence was counted as an e6 counsel_referral. Fix: build the
    // checks-only clone WITHOUT framework_disclaimer (fixed system-supplied
    // ownership sentence) and WITHOUT jurisdiction_validation (finding
    // records whose evidence strings may echo body sentences). All other
    // reader-facing fields — executive_summary, section prose, table cells,
    // completion_guidance, dpia_metadata narrative, information_needed —
    // remain in scope so genuine body counsel referrals still fire.
    try {
      const src = (reportData ?? {}) as Record<string, unknown>;
      const {
        framework_disclaimer: _fdDrop,
        jurisdiction_validation: _jvDrop,
        ...restForChecks
      } = src;
      const _prose = extractProseFromReport(restForChecks);
      // QB-P5 Item 4 — pass intake.dpia_team so e6_counsel_referral does
      // not fire on sentences that verbatim echo intake-supplied roster
      // entries (e.g. "Legal Counsel (external, Kanzlei Berger & Stein)").
      // Model-added directives ("consult legal counsel") continue to fail.
      
      const _intakeRoster = extractIntakeRoster(dpiaIntake ?? {}) || String((dpiaIntake as any)?.dpia_team ?? "");
      const _det = runFormatChecksGeneric(_prose, { intakeRoster: _intakeRoster }).map((x) => ({ ...x, check_type: 'deterministic' as const }));
      attachDeterministicChecks(reportData as any, _det as any);
    } catch (_) { /* non-fatal */ }
    const completeWrite = await lifecycleUpdate(supabase, "dpia_frameworks", dpia_id, {
      status: "complete",
      report_data: reportData,
      updated_at: new Date().toISOString(),
    }, { fn: "run-dpia-framework", phase: "terminal_complete" });
    if (!completeWrite.ok) {
      await mergePreservingFail(dpia_id, "stitch", new Error(`lifecycle_write_failed: ${completeWrite.message}`), Date.now() - stitchStart);
      return;
    }

    // ── L2 citation observe (non-fatal) ────────────────────────────────────
    try {
      await observeCitations(
        supabase,
        "run-dpia-framework",
        dpia_id,
        JSON.stringify(reportData),
        (gdprMeta?.matched_articles ?? []).map((n: string) => `Article ${n} GDPR`),
      );
    } catch (obsErr) {
      console.error("[citation-observe] non-fatal:", String(obsErr));
    }

    // ── C4 RoPA accumulator ────────────────────────────────────────────────
    if (row.client_id) {
      const intakeAny = (dpiaIntake as any) || {};
      const summary = intakeAny.processing_description || intakeAny.activity_description || intakeAny.description || "Processing activity requiring DPIA";
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: row.client_id,
          source_tool: "dpia_framework",
          source_assessment_id: dpia_id,
          display_name: String(summary).slice(0, 120),
          source_summary: String(summary),
          is_high_risk: true,
          category: "other",
        },
      }).catch((e: Error) => console.error("[dpia] accumulate-ropa failed (non-fatal):", e.message));
    }

    // ── PDF/email delivery + upsell signals ────────────────────────────────
    const { data: userData } = await supabase.auth.admin.getUserById(row.user_id).catch(() => ({ data: null as any }));
    supabase.functions.invoke('trigger-upsell', {
      body: { tool_type: 'dpia_framework', assessment_id: dpia_id, user_id: row.user_id },
    }).catch((e: Error) => console.error('[dpia] trigger-upsell failed (non-fatal):', e.message));
    // INC-2: generate-report-pdf is verifyCaller-gated → raw fetch.
    await invokeGated("generate-report-pdf", {
      tool_type: "dpia_framework",
      assessment_id: dpia_id,
      user_email: userData?.user?.email || null,
      user_name: userData?.user?.user_metadata?.full_name || null,
      result_url: `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/dpia-framework/result/${dpia_id}`,
    }).then((r) => { if (!r.ok) console.error("[dpia] PDF/email delivery failed (non-fatal):", r.status, r.body || r.error); });

    console.log(`[run-dpia-framework] stage=stitch elapsed=${Date.now() - stitchStart}ms status=complete`);
  } catch (e) {
    console.error("[run-dpia-framework] stitch error:", e);
    await mergePreservingFail(dpia_id, "stitch", e, Date.now() - stitchStart);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap: build shared context, initialise _staging, fan-out U1/U2/U3.
// Also handles sweeper re-entry: if _staging already exists, re-dispatch only
// units with status !== 'done'.
// ─────────────────────────────────────────────────────────────────────────────
async function runBootstrap(dpia_id: string, _caller: any): Promise<void> {
  const dpia = await readRow(dpia_id);
  const rd = (dpia.report_data ?? {}) as any;

  // Sweeper re-entry: _staging present → re-dispatch missing units.
  if (rd._staging?.units && rd._staging?.shared) {
    console.log(`[bootstrap] sweeper re-entry for dpia_id=${dpia_id}; existing units:`, Object.fromEntries(Object.entries(rd._staging.units).map(([k, v]: any) => [k, v?.status])));
    // Clear last_error / re-set failed units to pending so runUnit can proceed.
    const staging = rd._staging;
    let mutated = false;
    for (const u of PHASE1) {
      if (staging.units[u]?.status !== "done") {
        staging.units[u] = { ...(staging.units[u] ?? {}), status: staging.units[u]?.status === "processing" ? "pending" : (staging.units[u]?.status ?? "pending") };
        if (staging.units[u].status === "error") staging.units[u].status = "pending";
        mutated = true;
      }
    }
    // Reset any errored/stuck U4/U5 back to blocked so advancePhaseIfReady can re-dispatch.
    for (const u of ["u4", "u5"] as UnitId[]) {
      const st = staging.units[u]?.status;
      if (st === "error" || st === "processing" || st === "dispatching") {
        staging.units[u] = { ...(staging.units[u] ?? {}), status: "blocked" };
        mutated = true;
      }
    }
    if (mutated) {
      await optimisticUpdate(dpia_id, dpia.updated_at, { report_data: { ...rd, _staging: staging }, status: "processing", last_error: null });
    }
    // Dispatch missing PHASE1 units in parallel.
    const dispatch: UnitId[] = [];
    for (const u of PHASE1) if (staging.units[u]?.status !== "done") dispatch.push(u);
    for (const u of dispatch) selfInvokeUnit(dpia_id, u);
    // Always try phase-advance on resume: with U4-only-on-U3 gating, U4 may be
    // dispatchable even while U1/U2 are still (re)running from this same resume.
    const next = await advancePhaseIfReady(dpia_id);
    for (const u of next) selfInvokeUnit(dpia_id, u);
    // If U5 also done, run stitch inline (covers idempotent retry of a doc stuck at stitch).
    if (staging.units.u5?.status === "done") await runStitch(dpia_id);
    return;
  }

  // Fresh run — build shared context.
  const shared = await buildSharedContext(dpia);
  const staging = {
    version: STAMP,
    shared,
    units: {
      u1: { status: "pending" as const },
      u2: { status: "pending" as const },
      u3: { status: "pending" as const },
      u4: { status: "blocked" as const },
      u5: { status: "blocked" as const },
    },
  };
  const orgName = shared.orgName;
  const patch: Record<string, any> = {
    status: "processing",
    report_data: { ...rd, _staging: staging },
  };
  if (orgName && !(dpia as any).organization_name) patch.organization_name = orgName;
  const ok = await optimisticUpdate(dpia_id, dpia.updated_at, patch);
  if (!ok) {
    console.error("[bootstrap] lifecycle write failed");
    return;
  }

  // Fan out phase 1.
  for (const u of PHASE1) selfInvokeUnit(dpia_id, u);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point.
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  console.log(`[qb9-rcb1] run-dpia-framework build active · core=${PROMPT_CORE_VERSION} · dpia=${STAMP} · build_stamp=${BUILD_STAMP}`);
  console.log(JSON.stringify({ evt: "dpia_build_stamp", build_stamp: BUILD_STAMP }));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = await req.json();
    const dpia_id: string | undefined = body?.dpia_id;
    const unit: UnitId | undefined = body?.unit;
    if (!dpia_id) return new Response(JSON.stringify({ error: "dpia_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    // RC-B.1 — scoped-delta revision short-circuit. Owns unit-subset
    // routing via _staging.shared.item_unit_map (data-only, no prompt text).
    if (!unit) {
      const __rev = await handleRevisionMode(supabase, body, { toolType: "dpia_framework" });
      if (__rev) return __rev;
    }

    // Unit invocations must be internal (self-reinvoke with SERVICE_KEY).
    if (unit) {
      if (!caller.internal) {
        return new Response(JSON.stringify({ error: "unit invocation is internal-only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!["u1", "u2", "u3", "u4", "u5"].includes(unit)) {
        return new Response(JSON.stringify({ error: `unknown unit: ${unit}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Fire-and-forget in background; return 202 fast so the calling isolate can retire.
      // @ts-ignore — EdgeRuntime provided by Supabase.
      EdgeRuntime.waitUntil(runUnit(dpia_id, unit as UnitId).catch((e) => console.error(`[unit:${unit}] top-level:`, e)));
      return new Response(JSON.stringify({ accepted: true, unit }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Bootstrap path: entitlement check + fan-out.
    const ent = await requireEntitlement(caller, "dpia_framework", { rowId: dpia_id });
    if (!ent.ok) {
      console.log(JSON.stringify({ evt: "entitlement_denied", fn: "run-dpia-framework", reason: ent.reason }));
      return new Response(JSON.stringify({ error: "forbidden" }),
        { status: ent.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: dpiaExists } = await supabase.from("dpia_frameworks").select("id").eq("id", dpia_id).single();
    if (!dpiaExists) return new Response(JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const fnRun = await startFunctionRun(supabase, "run-dpia-framework", {
      archetype: "background",
      trustClass: "user",
      userId: caller.internal ? null : caller.userId,
      invokedBy: caller.internal ? "internal" : "user",
      metadata: { dpia_id, mode: "bootstrap" },
    });

    // @ts-ignore
    EdgeRuntime.waitUntil((async () => {
      // RUNTIME-1 (a): guaranteed terminal signal on EVERY exit path
      // (success, exception, uncaught throw). Companion finally-guard runs
      // even if a throw escapes the catch below.
      let terminalReached = false;
      try {
        await runBootstrap(dpia_id, caller);
        await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "dpia_frameworks", sourceRowId: dpia_id, metadata: { phase: "bootstrap_dispatched" } });
        terminalReached = true;
      } catch (bgErr) {
        console.error("run-dpia-framework bootstrap error:", bgErr);
        await mergePreservingFail(dpia_id, "stitch", bgErr, 0);
        await failFunctionRun(supabase, fnRun, bgErr, { metadata: { phase: "bootstrap" } });
        terminalReached = true;
      } finally {
        await dpiaEnsureTerminal(supabase, dpia_id, fnRun, terminalReached);
      }
    })());

    return new Response(JSON.stringify({ success: true, dpia_id, status: "processing" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("run-dpia-framework error:", e);
    return new Response(JSON.stringify({ error: "DPIA framework generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
