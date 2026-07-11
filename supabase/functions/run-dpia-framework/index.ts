// qb8 build active
// run-meter deploy-check v1
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { resolveDpiaJurisdiction, renderResolvedBlock, validateJurisdiction, type DpiaIntakeFacts, type TransferFlow } from "../_shared/dpia-jurisdiction-registry.ts";
import { buildSystemContent, type ToolModule, type SystemBlock, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { observeCitations } from "../_shared/citation-observe.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAnthropic(model: string, system: string | SystemBlock[], user: string, maxTokens = PRODUCT_MAX_OUTPUT_TOKENS, timeoutMs = 720_000): Promise<{ text: string; stopReason: string | null }> {
  const startedAt = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const d = await res.json();
  const text = d.content?.[0]?.text || "";
  const stopReason: string | null = d.stop_reason ?? null;
  const elapsed = Date.now() - startedAt;
  console.log(`[run-dpia-framework] stage=callAnthropic model=${model} elapsed=${elapsed}ms stop=${stopReason} chars=${text.length}`);
  return { text, stopReason };
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
    "RESIDUAL-RISK LABELLING: if a section instructs the organisation to re-score residual risk before sign-off, any residual-risk levels stated elsewhere must be labelled 'proposed — subject to the organisation's re-scoring', not presented as final. Apply this silently — never name this requirement, quote this instruction, or refer to any internal rule by name in the generated document; the output must read as finished assessment prose with no reference to the rules that produced it.",
    // EU-controller primary
    "EU-CONTROLLER PRIMARY RULE: Identify the controller's establishment from the sector field and organisation name. If the controller is established in an EU/EEA member state (Germany, France, Ireland, Netherlands, Spain, Italy, Sweden, Denmark, Belgium, Austria, Finland, etc.), the PRIMARY legal framework is EU GDPR (Regulation (EU) 2016/679). UK GDPR applies only where there is ALSO a UK-established controller or processor, or where the processing specifically targets UK data subjects and the controller has UK establishment. Do NOT produce a DPIA that references only UK GDPR for an EU-established controller. Where both EU and UK GDPR apply, state EU GDPR as primary and UK GDPR as supplementary.",
    // OSS routing through resolved block
    "SUPERVISORY AUTHORITY: name the SPECIFIC competent / lead supervisory authority from the RESOLVED JURISDICTION block — not a generic \"competent EU supervisory authority.\" Where the resolved block indicates the lead SA cannot be determined, instruct the organisation to identify the lead SA under the one-stop-shop mechanism (GDPR Article 56) and insert: [TO COMPLETE — identify lead supervisory authority based on controller's main establishment under GDPR Article 56].",
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
    "2.7d ART 13 vs ART 14 DISTINCTION: Privacy-notice conditions distinguish Art. 14 (primary, where data is not obtained from the data subject — e.g. monitoring data collected about individuals) from Art. 13 (where identifiers are collected directly from the data subject). Cite whichever applies to the specific data flow rather than defaulting to Art. 13.",
    "2.7 S1 SCHEMA — INFORMATION NEEDED: In addition to the existing completion_guidance field, emit a top-level \"information_needed\" array. It is REQUIRED whenever any finding in this report is insufficient-basis / Insufficient information; otherwise emit an empty array. One entry per gap: { field: <intake field key that exists in this DPIA's intake>, dimensions: <what specifically to add — dimensions, never suggested values>, provision: <already-cited provision making these dimensions relevant>, enables: <which section/determination completes with it> }. Every insufficient-basis or Insufficient-information finding elsewhere in this output MUST have a corresponding information_needed entry. Do NOT merge information_needed into completion_guidance — the two coexist.",
    "RESIDUAL-RISK ROW PARITY: every risk listed in the inherent risk assessment must have a corresponding entry in the residual risk assessment — same risk name, a proposed residual level, and the additional measures from the action plan that produce it. The two arrays must have matching membership; before emitting, reconcile them and never silently drop a risk between inherent and residual. Where the residual position genuinely cannot be assessed, the residual entry says so explicitly rather than being omitted.",
    "NOT-IMPLEMENTED MEASURES MUST HAVE PLAN ITEMS: any measure whose implementation_status is 'Not implemented' (or partially implemented) must map to at least one action-plan item that tasks its implementation, with the standard [TO COMPLETE — responsible team and deadline] placeholder. Before emitting, reconcile the measures list against the plan: a measure flagged as missing with no plan item tasking it is an internal inconsistency.",
    "UNRESOLVED DETERMINATIONS STAY UNRESOLVED EVERYWHERE: where a determination is left open as a fill-in (e.g. the controller's EU main-establishment status and one-stop-shop availability under Art. 56(1)), every field that references it must express the same open status — never assert it as settled fact in one field (dpia_metadata.supervisory_authority_consultation_trigger, section_6_conclusion) while another field carries the [TO COMPLETE] placeholder. Canonical form for the OSS case (scoped to THIS controller, not a general statement about OSS availability): 'On the facts of this intake, no EU main establishment has been identified for this controller; OSS availability for this controller cannot be determined until the controller's main-establishment status is confirmed. If no EU main establishment exists for this controller, or an EU establishment of this controller lacks decision-making authority over this processing, OSS is unavailable under Art. 56(1) for this controller and each concerned supervisory authority is independently competent. [TO COMPLETE — confirm main-establishment status for this controller and document the Art. 56(1) determination.]' Do NOT drop the 'for this controller' qualifier — a bare 'OSS is unavailable' reads as a general statement about OSS availability rather than a controller-specific determination.",
    "THE CONCLUSION NAMES ITS BLOCKERS: where approval or conditional approval is withheld because foundational inputs are absent, section_6_conclusion must name those inputs specifically (e.g. retention periods, the LIA, the log-content audit, processor data-centre mapping) — and each named input must correspond to an information_needed entry. 'Foundational inputs are absent' without the list is a dead-end phrasing.",
    "NO RESOLUTION-METHOD PRESCRIPTION: where a determination is left to the organisation, state that the organisation must resolve and document it, citing the governing provision — never direct a specific resolution method (consulting legal counsel, commissioning an audit, or any other). The framework_disclaimer is fixed system-supplied text and is unaffected.",
    "CONFIRMED TRIGGERS AND CANDIDATE TRIGGERS ARE LISTED SEPARATELY: the reasons the DPIA is required list ONLY criteria confirmed on the intake facts. Criteria that are merely potential ('evaluation or scoring — potentially engaged if automated analysis is used') are listed under a separate heading as additional criteria for the organisation to confirm, each with the single fact that would confirm it — never blended into the mandatory-trigger list where a conditional reads as a confirmed basis.",
    "IMPLEMENTATION STATUS IS STATE, NOT TASKS: an implementation_status states the current state of the measure in one clause ('Partially implemented — DPAs exist for all three processors'). Verification and preparation tasks belong in the measure's action text, not inside the status. And distinct obligations get distinct measures: an erasure-request procedure (responding to Article 17 requests) is not the same measure as automated deletion at end of retention — where both are relevant, state them as two measures with their own statuses, noting the dependency where it exists.",
    "ACCEPTABLE FIELD MAPPING: the acceptable field follows the residual level. High residual → 'Not acceptable', with the Art. 36 prior-consultation consequence stated. Medium residual → 'Conditional' or 'Acceptable', with the conditions named. Low residual → 'Acceptable'. Where the assessment deliberately departs from this mapping (e.g. a Medium residual the organisation should nonetheless treat as not acceptable), the entry states the specific reason in its own text. A bare 'Not acceptable' on a Medium residual with no stated reason is an internal inconsistency.",
    "CONTINGENT RESIDUAL LEVELS SAY SO INLINE: where a residual level assumes measures whose implementation_status is 'Not implemented' (or partially implemented), the residual entry carries the contingency inline — 'Low, contingent on completion of the retention-definition and automated-deletion measures (currently not implemented); the organisation's re-scoring must account for current implementation status' — never a bare residual level that reads as already achieved.",
    "RESIDUAL LIKELIHOOD REFLECTS THE MEASURE, NOT THE STATUS QUO: residual_likelihood is the likelihood remaining ONCE the additional measures are applied — it is not a re-statement of the inherent likelihood under current controls. Where the additional_measures for a risk would, if implemented, reduce likelihood (e.g. 'defined and enforced retention schedules with automated deletion' reduces the likelihood of a storage-limitation breach), residual_likelihood MUST reflect that post-implementation reduction (typically Low or Medium) — not 'High'. Do NOT set residual_likelihood to 'High' as shorthand for 'the measure is not implemented yet'; that conflates residual (post-measure) with inherent-under-current-controls, and produces the specific contradiction where residual_likelihood 'High' sits next to an additional measure that is designed to reduce likelihood. Where the assessment wants to flag that the reduction is not yet achieved, keep residual_likelihood at its post-implementation level AND state in the residual_risk_level note: 'This residual level assumes implementation of the additional measures; on the CURRENT record those measures are not implemented and the exposure remains at the inherent level until they are.' The 'High' rating, if retained anywhere, belongs to inherent risk or to a status note about current non-implementation — not to residual_likelihood as if it were post-implementation exposure.",
    "ART. 35 TIMING LANGUAGE: the DPIA timing standard is Art. 35(1) and Art. 35(10) — PRIOR to processing. Never attach 'without undue delay' to DPIA timing; that is the Art. 33 breach-notification standard. Where processing is already live without a completed DPIA, state: 'Art. 35(10) requires the DPIA to be carried out prior to processing; completion of this DPIA is overdue and the deficiency must be documented.'",
    "ART. 46 SAFEGUARDS ENUMERATE BOTH REGIMES WITH CORRECT DIRECTIONALITY: wherever the report enumerates Art. 46 appropriate safeguards and UK GDPR is within the assessment's jurisdictional scope, enumerate: 'EU Standard Contractual Clauses (for restricted transfers under EU GDPR); the UK International Data Transfer Agreement (IDTA) or the UK Addendum to the EU SCCs (for restricted transfers FROM the United Kingdom under UK GDPR); or Binding Corporate Rules' — never 'EU SCCs or BCRs' alone. Never state or imply that the IDTA or UK Addendum is required for EEA-to-UK transfers, which proceed under the European Commission's adequacy decision for the UK while it remains in force. Where only EU GDPR is in scope, omit the UK instruments.",
    "RISK-METHOD CONSISTENCY IS ABSOLUTE: where the stated method determines risk level by the higher of severity and likelihood, a High-severity residual risk IS High — state residual_risk_level as High without conditional hedging, and state 'Art. 36 prior consultation is required because residual risk remains High' unconditionally. Never write 'Art. 36 consultation is required if this risk cannot be reduced further' beside a method that already yields High. If the methodology permits a documented downgrade of a High-severity/Low-likelihood risk, present it as an explicitly labelled alternative ('the organisation may document a justified downgrade to Medium, in which case…'), never as an unresolved conditional.",
    "ADEQUACY CAVEATS ARE EVERGREEN: when noting that an adequacy decision (EU–US DPF, UK adequacy, or any other Art. 45 decision) may change, never assert the current status of litigation or review as static fact ('is subject to ongoing legal challenge'). Use the evergreen form: 'Adequacy decisions may be reviewed, suspended, or invalidated; confirm the decision's current status and the importer's certification at the time of each assessment.'",
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
    "TEST-STATES ARE BINDING (R1b2 rule 2a): the injected TEST-STATES block records the deterministic state of each mechanical determination this tool computes from structured intake fields (M1 special-category data; M2 children's data; M3 Art. 9(2) condition selected; M4 legal basis selected; M5 GDPR applies; M6 international-transfer surface; M7 retention documented; M8 DPO named; M9 profiling narrative CANDIDATE). Tests marked RESOLVED — resolved_met, resolved_not_met, or resolved_not_applicable — bind their determination and MUST NOT be re-asked in completion_guidance, information_needed, or [TO COMPLETE] placeholders, and MUST NOT be contradicted in prose. INDETERMINATE tests use insufficient-basis language and route to the specific intake field named in the block. M9 is a CANDIDATE, NOT a RESOLUTION: keyword presence directs attention to Art. 35(3)(a) as a JUDGMENT call — assess the description and confirm or reject the prong, citing the narrative language; keyword absence is NOT proof of non-profiling. All other WP248 prongs (large-scale, matching, vulnerable beyond children, innovative tech, systematic monitoring under 35(3)(c)) remain JUDGMENT calls governed by the existing ARTICLE 35 MANDATORY TRIGGER RULE — no mechanical test binds them.",
    "PROPORTIONATE ASKS (R1b2 rule 2b): (i) ASK CLASSES — classify every surfaced item as verdict-blocking, record-completeness, or enhancement. Verdict-blocking and record-completeness items appear in completion_guidance and information_needed (verdict-blocking listed first). Enhancement items — depth improvements no cited provision requires — appear ONLY in method/methodology narrative, never as a completion_guidance or [TO COMPLETE] item. (ii) CREDIT-FIRST — for any partially evidenced determination, name what the intake and RESOLVED tests establish BEFORE the residual; the residual is incremental and NEVER re-requests content the intake already supplies (e.g. do not [TO COMPLETE] the Art. 9(2) condition when M3 is RESOLVED_MET). (iii) BANNED COLLAPSE — the phrases 'cannot be determined', 'no basis to assess', and 'not established' may NOT be applied to a whole determination when only an increment is missing. Where a missing piece IS verdict-blocking, name the specific element (e.g. 'the specific Art. 46 safeguard') rather than collapsing the whole determination.",
    "TRIGGER STATUS (R1b2 formalisation of ARTICLE 35 MANDATORY TRIGGER RULE): read TEST-STATES M1, M2, and M9 as the binding surface for the enumerated WP248 prongs this tool computes. Where M1 is RESOLVED_MET, cite Art. 35(3)(b) as engaged and name the special category from the intake; where M2 is RESOLVED_MET, cite Recital 38 and the heightened-protection duty; where M9 is CANDIDATE, treat Art. 35(3)(a) as a JUDGMENT call — quote or paraphrase the description language that raised the candidate and either confirm the prong (citing the language) or reject it (explaining why the language does not reach 'systematic and extensive profiling with significant effects'). Never assert Art. 35(3)(a) is engaged solely because M9 is CANDIDATE; never deny it solely because M9 is INDETERMINATE.",
  ].join("\n\n"),

  languageVariant: "jurisdiction-conditional",
};

// ─────────────────────────────────────────────────────────────────────────────
// R1b2 — deterministic TEST-STATES for the DPIA generator.
// Computed from the intake shape produced by src/pages/DPIAFramework.tsx.
// M1 special-category data (Art. 35(3)(b))     — data_categories ∩ {Health/medical, Biometric, Genetic}
// M2 children's data (Recital 38)              — any data_categories[i] matches /child/i
// M3 article_9_condition_selected              — article_9_condition non-empty AND M1 met
// M4 legal_basis_selected                      — legal_basis_proposed non-empty and ≠ "Not yet determined"
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
  lines.push("TEST-STATES (deterministic — computed from the intake). A test whose state is RESOLVED (met / not met / not applicable) is BINDING per rule 2a: do NOT re-ask it in completion_guidance/information_needed/[TO COMPLETE] placeholders and do NOT contradict it in prose. INDETERMINATE tests use insufficient-basis language anchored to the producing field. CANDIDATE tests are NON-BINDING attention flags for JUDGMENT calls — assess the underlying narrative and either confirm or reject the associated prong, citing the language.");
  for (const id of Object.keys(states)) {
    const e = states[id];
    lines.push(`- ${id} state=${e.state} basis="${e.basis}" source_fields=${JSON.stringify(e.source_fields)}`);
  }
  return lines.join("\n");
}



Deno.serve(async (req) => {
  console.log(`[qb9] run-dpia-framework build active · core=${PROMPT_CORE_VERSION}`);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { dpia_id } = await req.json();
    if (!dpia_id) return new Response(JSON.stringify({ error: "dpia_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ent = await requireEntitlement(caller, "dpia_framework", { rowId: dpia_id });
    if (!ent.ok) {
      console.log(JSON.stringify({ evt: "entitlement_denied", fn: "run-dpia-framework", reason: ent.reason }));
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: ent.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: dpia } = await supabase
      .from("dpia_frameworks").select("*").eq("id", dpia_id).single();

    if (!dpia) return new Response(JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const intake = dpia.intake_data as any;
    const orgName = (dpia as any).organization_name || intake?.organization_name || null;
    const procWrite = await lifecycleUpdate(supabase, "dpia_frameworks", dpia_id, {
      status: "processing",
      ...(orgName && !(dpia as any).organization_name ? { organization_name: orgName } : {}),
    }, { fn: "run-dpia-framework", phase: "pre_generation" });
    if (!procWrite.ok) {
      return new Response(JSON.stringify({ error: "lifecycle_write_failed", message: procWrite.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fnRun = await startFunctionRun(supabase, "run-dpia-framework", {
      archetype: "background",
      trustClass: "user",
      userId: caller.internal ? (dpia.user_id ?? null) : caller.userId,
      invokedBy: caller.internal ? "internal" : "user",
      metadata: { dpia_id },
    });


    // Dispatch heavy work in background — return 202 immediately so the caller
    // is not held open past the platform's 150s HTTP idle ceiling. The result
    // page polls dpia_frameworks.status. On unhandled error we mark the row
    // failed so callers don't poll forever.
    // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
    EdgeRuntime.waitUntil((async () => {
      try {
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
Jurisdictions: ${(srcIntake.jurisdictions || []).join(", ")}
EU/UK data: ${srcIntake.eu_uk_data ? "Yes" : "No"}
DPO appointed: ${srcIntake.has_dpo ? "Yes" : "No"}
`;
      }
    }

    // (Audited GDPR rules now live in DPIA_TOOL_MODULE.extraRules; the system
    // prompt is assembled below via buildSystemContent.)



    const processingDesc = intake.processing_description || intake.description || "Not provided";
    const purpose = intake.purpose || "Not provided";
    const dataCategories = (intake.data_categories || []).join(", ") || "Not specified";
    const dataSubjects = intake.data_subjects || "Not specified";
    const volume = intake.volume_frequency || "Not specified";
    const thirdParties = (intake.third_party_processors || []).join(", ") || "None identified";
    const safeguards = (intake.existing_safeguards || []).join(", ") || "None identified";
    const jurisdictions = (intake.jurisdictions || []).join(", ") || "Not specified";
    const legalBasisProposed = intake.legal_basis_proposed || "Not specified";
    const article9Condition = intake.article_9_condition || "Not specified";
    const necessityProportionality = intake.necessity_proportionality || "Not provided";
    const retentionPeriod = intake.retention_period || "Not specified";
    const sector = intake.sector || intake.organization_sector || "Not specified";
    // EDPB template — Section 0 (Overview) inputs (from Tranche 1 intake)
    const controllerContact = intake.controller_contact || "Not specified";
    const dpoInfo = intake.dpo_info || "Not specified";
    const processorObligations = intake.processor_obligations || "Not specified";
    const processingVersion = intake.processing_version || "Not specified";
    const launchDate = intake.estimated_launch_date || "Not specified";
    const endDate = intake.estimated_end_date || "Not specified";
    const dpiaTeam = intake.dpia_team || "Not specified";
    const referenceMaterials = intake.reference_materials || "Not specified";
    const reasonsToConduct = (intake.reasons_to_conduct || []).join("; ") || "Not specified";
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

    // Determine GDPR jurisdiction from verified jurisdictions (srcIntake preferred).
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
    // EU GDPR is primary whenever any EU/EEA jurisdiction is present, even if UK is also listed.
    // Only use UK as primary when UK/GB is the sole jurisdiction and no EU/EEA mention exists.
    const hasEU = effectiveJurisdictions.some((j: string) => /\beu\b|european.*union|eea|\bgdpr\b|germany|france|ireland|netherlands|spain|italy|sweden|denmark|poland|belgium|austria|finland|luxembourg|greece|portugal|norway|switzerland/i.test(String(j)));
    const hasUK = effectiveJurisdictions.some((j: string) => /united kingdom|\buk\b|\bgb\b|uk gdpr|england|wales|scotland/i.test(String(j)));
    const gdprJurisdiction: "eu" | "uk" = hasEU ? "eu" : (hasUK ? "uk" : "eu");

    // Fetch enforcement precedents (3-5) and GDPR authority context in parallel
    let enforcementPrecedents: any[] = [];
    let enforcementMeta: any = { attempted: false };
    let gdprBlock = "";
    let gdprMeta: any = { attempted: false };
    try {
      // Corpus regime gating: DPIA is a GDPR tool — never query the CCPA corpus.
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
      if ((intake.jurisdictions || []).length) descParts.push(`processing in ${(intake.jurisdictions || []).join(", ")}`);
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

    // ── Layer 1-3: Resolve jurisdiction facts deterministically and inject ──
    // Heuristic fallbacks: parse from existing free-text fields where the new
    // structured intake fields are not present.
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
    const resolvedBlock = renderResolvedBlock(resolved);
    console.log(`[run-dpia-framework] resolver: country=${resolverCountry} land=${intake.controller_land || "-"} oss=${resolved.oss.ossAvailable} transfers=${resolved.transfers.length}`);

    // Assemble system prompt via the shared core. Block 1 = core (cached);
    // block 2 = identity + audited DPIA rules (cached); block 3 = corpus +
    // resolved-jurisdiction injection (NOT cached — per-call facts).
    const gdprAuthorityContext = gdprBlock
      ? `STATUTORY AND EDPB AUTHORITY (cite as [Art. X] / [Recital N] / [EDPB ref]; statutory text is verbatim — do not alter it):\n${gdprBlock}`
      : "";
    const today = new Date().toISOString().slice(0, 10);
    // R1b2 — compute deterministic TEST-STATES from the raw intake and inject them.
    const dpiaTestStates = computeDpiaTestStates(intake as Record<string, any>);
    const dpiaTestStatesBlock = renderDpiaTestStatesBlock(dpiaTestStates);
    const systemWithGdpr = buildSystemContent({
      toolModule: DPIA_TOOL_MODULE,
      currentDate: today,
      injected: [gdprAuthorityContext, resolvedBlock, dpiaTestStatesBlock].filter(Boolean).join("\n\n"),
    });


    // ── Split DPIA generation into two parallel calls to stay within timeout ──
    const sharedContext = `PROCESSING ACTIVITY DETAILS:
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
USE THESE INPUTS: fold them into section_1_description (secondary uses, nature/scope/context, functional description, supporting assets, codes of conduct), section_2_analysis (data minimisation under Art. 5(1)(c); data quality under Art. 5(1)(d); measures supporting data-subject rights under Arts. 12–22; data protection by design & default under Art. 25), and section_5_interested_parties (DPO advice under Art. 35(2); data subjects' views under Art. 35(9), including the controller's justification where views were not sought). Where a value is "Not specified", keep the existing [TO COMPLETE] behaviour for that element rather than inventing content.
${orgContext}

ENFORCEMENT PRECEDENTS (cite by [E1]–[E5] where relevant):
${enforcementContextStr}

ANNOTATION REQUIREMENT: For each enforcement action cited above (tagged [E1], [E2], etc.), if it directly supports a risk identification, severity rating, or mitigating measure in the risk assessment, include it in the section_4_risk_management.annotations array using the id value from the enforcement context exactly as provided. You MUST only cite enforcement actions from the ENFORCEMENT PRECEDENTS provided above — never cite cases from training knowledge. If an enforcement action is not in the provided context, do not cite it.

USER-PROVIDED INPUT HANDLING: The intake above may include user-provided inputs — an Article 9(2) condition, a necessity/proportionality & alternatives statement, and a retention period. Where a value is provided (i.e. not "Not specified"/"Not provided"): (1) Article 9(2) condition — treat it as the controller's PROPOSED special-category condition in section_2_analysis.special_category_conditions: state it explicitly and assess whether it is sound for this processing (for example, flag that explicit consent under Art. 9(2)(a) may not be freely given where an employment or other power imbalance exists). Do NOT emit a blank "[TO COMPLETE — identify Article 9(2) condition]" when the user has supplied one — assess what they supplied. (2) Necessity, proportionality & alternatives — incorporate the user's stated alternatives and justification into section_3_necessity_proportionality (the necessity and proportionality assessments), assessing them, rather than emitting only [TO COMPLETE] placeholders. (3) Retention period — use it in section_2_analysis.data_minimisation_retention (storage-limitation, Art. 5(1)(e)) and in the related mitigating measure, rather than treating retention as undefined. Where a value is "Not specified"/"Not provided", retain the existing [TO COMPLETE] behaviour. Never treat these user inputs as settled legal conclusions — assess them as proposals the organisation must validate and document.`;

    const promptA = `${sharedContext}

Generate the first half of an EDPB-format DPIA (Overview, Systematic Description, Analysis). Mirror the EDPB DPIA template structure. The repeatable tables (controllers, processors, data items, purposes, legal-basis rows, retention rows, and the measure matrices) must be GENERATED from the processing details above for the controller to verify — populate each row with substantive draft content, and use "[TO COMPLETE — …]" only where a value genuinely cannot be inferred from the intake. For the measure matrices, provide one row per Article 5(1)(a–f) principle (fairness, transparency, purpose limitation, data minimisation, accuracy, storage limitation, integrity & confidentiality, accountability), one row per data-subject right group, and one row per other GDPR requirement. Return ONLY this JSON structure, no preamble:

{
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
      { "item": "data item / element", "explanation": "data type, data subject category, details", "special_category": { "is_special": true, "categories": ["e.g. data concerning health; biometric data for unique identification"] } }
    ],
    "purposes": [
      { "purpose": "specific and explicit purpose", "personal_data_involved_and_justification": "which data (from processed_personal_data) and why it is needed" }
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
      { "phase": "processing phase / stage", "operations": ["Collection","Use","Storage","Sharing and Transfer","Deletion and Destruction"], "explanation": "what happens in this phase across the controller/processor chain" }
    ],
    "supporting_assets": [
      { "phase": "phase (from functional_description)", "assets": "means of processing and essential supporting assets", "explanation": "how the asset relates to the processing and to risk" }
    ],
    "codes_of_conduct": [
      { "code": "approved code of conduct, or 'None applicable'", "basis": "Required (legal obligation) | Necessary or beneficial | N/A", "explanation": "why" }
    ],
    "completion_guidance": "What the organisation must complete or verify in Section 1"
  },
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

    const promptB = `${sharedContext}

Generate the second half of an EDPB-format DPIA (Necessity & Proportionality, Risk Assessment & Management, Interested Parties, Conclusion). CRITICAL — keep the EDPB design-risk vs incident-risk distinction:
- section_3_necessity_proportionality.design_risk_impacts = risks that exist EVEN IF everything works exactly as designed and all actors follow the rules (inherent, structural risks flowing from the data, the purpose, and the nature/scope/context).
- section_4_risk_management.incident_risk_impacts = risks from non-default, accidental, unlawful or abnormal events (malfunctions, deviations from design, cyber threats to confidentiality / integrity / availability, malicious actors).
- section_4_risk_management.inherent_risk_assessment = the combined list of risks drawn from BOTH design_risk_impacts and incident_risk_impacts, each scored likelihood × severity with modulating factors.
- section_4_risk_management.residual_risk_assessment = those risks re-scored AFTER the additional mitigating measures.
Generate substantive draft rows for every table for the controller to verify; use "[TO COMPLETE — …]" only where a value cannot be inferred. Return ONLY this JSON structure, no preamble:

{
  "section_3_necessity_proportionality": {
    "title": "Considerations on Necessity and Proportionality",
    "guidance_note": "EDPB Section 3 — design / structural impacts on rights and freedoms, plus the necessity and proportionality tests.",
    "design_risk_impacts": [
      { "threat": "threat from the processing as designed", "how_materialised": "how it can materialise with no failure or attack", "risk_sources": "purpose, design weaknesses, unique identifiers, long retention, exposures", "impact_on_rights": "impact on data subjects' rights and freedoms" }
    ],
    "necessity_assessment": "is the processing effective and the least intrusive option; evidence and the alternatives considered",
    "proportionality_assessment": "do the benefits outweigh the impacts on rights and freedoms; evidence and justification (necessity is a pre-condition)",
    "completion_guidance": "What the organisation must complete or verify in Section 3"
  },
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
      { "risk": "reassessed risk", "additional_measures": "measures applied", "residual_likelihood": "Low | Medium | High", "residual_severity": "Low | Medium | High", "residual_risk_level": "Low | Medium | High — proposed, subject to the organisation's re-scoring", "acceptable": "Acceptable | Not acceptable" }
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
  },
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

    function parseJsonish(text: string): any {
      try {
        const m = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : {};
      } catch (e) {
        console.error("[DPIA] parse error:", e, "Tail:", text.slice(-200));
        return {};
      }
    }

    async function genHalf(prompt: string, extraUser: string): Promise<any> {
      const finalUser = extraUser ? `${prompt}\n\n${extraUser}` : prompt;
      let r = await callAnthropic("claude-sonnet-4-6", systemWithGdpr, finalUser, PRODUCT_MAX_OUTPUT_TOKENS);
      console.log(`[DPIA] genHalf stopReason=${r.stopReason} chars=${r.text.length} tail=${JSON.stringify(r.text.slice(-120))}`);
      if (r.stopReason === "max_tokens") {
        const bumped = Math.floor(PRODUCT_MAX_OUTPUT_TOKENS * 1.25);
        console.warn(`[DPIA] genHalf truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} — single retry at ${bumped} (QB8-8 +25%)`);
        r = await callAnthropic("claude-sonnet-4-6", systemWithGdpr, finalUser, bumped);
        console.log(`[DPIA] genHalf retry stopReason=${r.stopReason} chars=${r.text.length}`);
        if (r.stopReason === "max_tokens") {
          console.error("[DPIA] genHalf truncated_output after retry — returning empty half");
          return {};
        }
      }
      const parsed = parseJsonish(r.text);
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length === 0 && r.text.length > 200) {
        console.error(`[DPIA] genHalf parsed to EMPTY object despite ${r.text.length} chars of response — likely malformed JSON, not empty content. Tail: ${JSON.stringify(r.text.slice(-200))}`);
      }
      return parsed;
    }

    let [partA, partB] = await Promise.all([genHalf(promptA, ""), genHalf(promptB, "")]);

    let reportData: any = { ...partA, ...partB };

    // QB8-8(a): structural completeness check for residual_risk_assessment entries.
    // Every entry must carry residual_likelihood, residual_risk_level, and additional_measures.
    // If any entry is missing fields, run ONE repair scoped to the deficient entries.
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
          const repair = await callAnthropic("claude-sonnet-4-6", systemWithGdpr, repairPrompt, Math.floor(PRODUCT_MAX_OUTPUT_TOKENS * 0.5));
          const repaired = parseJsonish(repair.text);
          const repairedArr = Array.isArray(repaired?.residual_risk_assessment) ? repaired.residual_risk_assessment : null;
          if (repairedArr) {
            for (const d of deficient) {
              const match = repairedArr.find((x: any, idx: number) => idx === d.i || x?.risk_name === d.e?.risk_name);
              if (match) residual[d.i] = { ...residual[d.i], ...match };
            }
          }
          // Re-validate; if still incomplete, mark report failed rather than persisting truncated table.
          const stillDeficient = residual.filter((e: any) => requiredResidualFields.some((f) => !e?.[f] || (typeof e[f] === "string" && !e[f].trim())));
          if (stillDeficient.length > 0) {
            console.error(`[DPIA] QB8-8(a): residual_risk_assessment still incomplete after repair (${stillDeficient.length} entries) — marking report failed`);
            throw new Error(`DPIA residual_risk_assessment incomplete after repair (${stillDeficient.length} entries missing required fields)`);
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("DPIA residual_risk_assessment incomplete")) throw e;
      console.error("[DPIA] QB8-8(a) repair pass errored:", e);
    }

    // QB13-5(a): deterministic risk_level reconciliation. Where the methodology text
    // mentions "higher of", recompute each inherent/residual row's risk_level as the
    // higher of severity/likelihood on the High > Medium > Low scale and overwrite
    // mismatches.
    try {
      const s4 = reportData?.section_4_risk_management;
      const methodText = [
        s4?.method,
        s4?.methodology,
        s4?.risk_methodology,
        s4?.guidance_note,
        s4?.method_note,
      ].filter((v) => typeof v === "string").join(" \n ").toLowerCase();
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
          // Preserve suffix (e.g. " — proposed, subject to the organisation's re-scoring")
          const suffixMatch = cur.match(/^(?:low|medium|high)\b(.*)$/i);
          const suffix = suffixMatch ? suffixMatch[1] : "";
          const curLevel = suffixMatch ? suffixMatch[0].split(/\s|—|-/)[0] : cur;
          if (curLevel && curLevel.toLowerCase() !== expected.toLowerCase()) {
            row.residual_risk_level = `${expected}${suffix}`;
            corrections += 1;
          }
        }
        if (corrections > 0) {
          console.warn(`[DPIA] QB13-5(a): corrected ${corrections} risk_level value(s) to match declared methodology`);
        }
      }
    } catch (e) {
      console.error("[DPIA] QB13-5(a) methodology reconciliation errored:", e);
    }




    // Lint narrative strings across the framework JSON; one retry on hard violations
    // — surgically regenerating ONLY the half(s) whose top-level keys contain hard
    // violations, so a clean half is preserved.
    const lintViolations: any[] = [];
    const hardKeys = new Set<string>(); // top-level keys (e.g. "section_3_risks") with hard violations
    const hardDetailsByKey = new Map<string, string[]>();
    function walkAndLint(obj: any, path: string, topKey: string | null): boolean {
      let hardSeen = false;
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          if (typeof obj[i] === "string") {
            const r = lintReportText(obj[i]);
            for (const v of r.violations) lintViolations.push({ field: `${path}[${i}]`, ...v });
            if (hasHardViolations(r)) {
              hardSeen = true;
              if (topKey) {
                hardKeys.add(topKey);
                const arr = hardDetailsByKey.get(topKey) ?? [];
                for (const v of r.violations) arr.push(`${v.code}: ${v.detail}`);
                hardDetailsByKey.set(topKey, arr);
              }
            }
            obj[i] = r.clean;
          } else if (obj[i] && typeof obj[i] === "object") {
            if (walkAndLint(obj[i], `${path}[${i}]`, topKey)) hardSeen = true;
          }
        }
      } else if (obj && typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          const nextTop = topKey ?? k;
          if (typeof v === "string") {
            const r = lintReportText(v);
            for (const vi of r.violations) lintViolations.push({ field: `${path}.${k}`, ...vi });
            if (hasHardViolations(r)) {
              hardSeen = true;
              hardKeys.add(nextTop);
              const arr = hardDetailsByKey.get(nextTop) ?? [];
              for (const vi of r.violations) arr.push(`${vi.code}: ${vi.detail}`);
              hardDetailsByKey.set(nextTop, arr);
            }
            obj[k] = r.clean;
          } else if (v && typeof v === "object") {
            if (walkAndLint(v, `${path}.${k}`, nextTop)) hardSeen = true;
          }
        }
      }
      return hardSeen;
    }

    const HALF_A_KEYS = new Set(["dpia_metadata", "section_0_overview", "section_1_description", "section_2_analysis"]);
    const HALF_B_KEYS = new Set(["section_3_necessity_proportionality", "section_4_risk_management", "section_5_interested_parties", "section_6_conclusion", "framework_disclaimer"]);

    if (walkAndLint(reportData, "report", null)) {
      try {
        const detailsA: string[] = [];
        const detailsB: string[] = [];
        let retryA = false;
        let retryB = false;
        for (const k of hardKeys) {
          const inA = HALF_A_KEYS.has(k);
          const inB = HALF_B_KEYS.has(k);
          const details = hardDetailsByKey.get(k) ?? [];
          if (!inA && !inB) {
            // Unknown top-level key — safety: include in both halves
            retryA = true; retryB = true;
            detailsA.push(...details);
            detailsB.push(...details);
            continue;
          }
          if (inA) { retryA = true; detailsA.push(...details); }
          if (inB) { retryB = true; detailsB.push(...details); }
        }
        lintViolations.length = 0;
        hardKeys.clear();
        hardDetailsByKey.clear();

        const retries: Promise<any>[] = [];
        let newA: any = null;
        let newB: any = null;
        if (retryA) {
          const retryInstrA = `PREVIOUS ATTEMPT REJECTED by automated lint for: ${detailsA.join("; ")}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`;
          retries.push(genHalf(promptA, retryInstrA).then((r) => { newA = r; }));
        }
        if (retryB) {
          const retryInstrB = `PREVIOUS ATTEMPT REJECTED by automated lint for: ${detailsB.join("; ")}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`;
          retries.push(genHalf(promptB, retryInstrB).then((r) => { newB = r; }));
        }
        await Promise.all(retries);

        // Merge: retained half stays as-is; affected half(s) overwrite their keys.
        const mergedA = newA ?? partA;
        const mergedB = newB ?? partB;
        reportData = { ...mergedA, ...mergedB };
        walkAndLint(reportData, "report", null);
      } catch (e) {
        console.warn("[DPIA] lint retry failed (non-fatal):", e);
      }
    }

    // R1b2 — post-lint T-2/T-3/T-4 gate. Single-call topology; one retry cap.
    // Rebuilds BOTH halves once on violation (the target defects can land in
    // either half); merges over reportData. Then proceeds with residuals logged.
    {
      const hedgeAskRe = /\b(please confirm|please verify|to be confirmed|\[TO COMPLETE)/i;
      const collapseRe = /\b(cannot be determined|no basis to assess|not established)\b/i;
      const depthLangRe = /\b(could|would strengthen|additional context|nice to have|consider (?:adding|providing)|optionally|for completeness|to enrich)\b/i;
      const statAnchorRe = /(Art\.\s*\d|Article\s+\d|Recital\s+\d|GDPR|WP248|EDPB)/i;

      function collectStrings(obj: any, out: string[]): void {
        if (typeof obj === "string") { out.push(obj); return; }
        if (Array.isArray(obj)) { for (const v of obj) collectStrings(v, out); return; }
        if (obj && typeof obj === "object") { for (const k of Object.keys(obj)) collectStrings(obj[k], out); }
      }

      function detectDpiaViolations(): { t2: any[]; t3: any[]; t4: any[] } {
        const t2: any[] = [];
        const t3: any[] = [];
        const t4: any[] = [];

        // T-2: RESOLVED test contradicted or re-asked.
        // M3 RESOLVED_MET → do not [TO COMPLETE] the Art. 9(2) condition.
        const s2 = reportData?.section_2_analysis;
        if (dpiaTestStates.M3?.state === "resolved_met") {
          const s2Strings: string[] = []; collectStrings(s2, s2Strings);
          for (const s of s2Strings) {
            if (/\[TO COMPLETE[^\]]*(Art(?:icle)?\.?\s*9(?:\(2\))?|special.category.condition)/i.test(s)) {
              t2.push({ test: "M3", kind: "re_asks_art9_condition", detail: s.slice(0, 160) });
            }
          }
        }
        // M4 RESOLVED_MET → do not [TO COMPLETE] the legal basis.
        if (dpiaTestStates.M4?.state === "resolved_met") {
          const allStrings: string[] = []; collectStrings(reportData, allStrings);
          for (const s of allStrings) {
            if (/\[TO COMPLETE[^\]]*(legal\s+basis|Art(?:icle)?\.?\s*6\(1\))/i.test(s)) {
              t2.push({ test: "M4", kind: "re_asks_legal_basis", detail: s.slice(0, 160) });
            }
          }
        }
        // M7 RESOLVED_MET → do not [TO COMPLETE] retention.
        if (dpiaTestStates.M7?.state === "resolved_met") {
          const allStrings: string[] = []; collectStrings(reportData, allStrings);
          for (const s of allStrings) {
            if (/\[TO COMPLETE[^\]]*retention/i.test(s)) {
              t2.push({ test: "M7", kind: "re_asks_retention", detail: s.slice(0, 160) });
            }
          }
        }
        // M1 RESOLVED_MET → special-category conditions section MUST NOT deny Art. 35(3)(b) engagement.
        if (dpiaTestStates.M1?.state === "resolved_met") {
          const meta = String(reportData?.dpia_metadata?.article_35_3_trigger ?? "");
          if (/(does not apply|not engaged|no Art\.\s*35\(3\)\(b\))/i.test(meta)) {
            t2.push({ test: "M1", kind: "denies_resolved_prong", detail: meta.slice(0, 160) });
          }
        }
        // M6 RESOLVED_MET → transfers chapter must be present, not "none identified".
        if (dpiaTestStates.M6?.state === "resolved_met") {
          const allStrings: string[] = []; collectStrings(reportData, allStrings);
          for (const s of allStrings) {
            if (/no (?:international )?transfers? (?:identified|apply)/i.test(s)) {
              t2.push({ test: "M6", kind: "denies_transfer_surface", detail: s.slice(0, 160) });
              break;
            }
          }
        }

        // T-3: banned-collapse phrasing where the intake credits substantive input.
        const anyResolvedMet = Object.values(dpiaTestStates).some((v) => v.state === "resolved_met");
        if (anyResolvedMet) {
          const proseFields: Array<[string, any]> = [
            ["section_3_necessity_proportionality", reportData?.section_3_necessity_proportionality],
            ["section_6_conclusion.justification", reportData?.section_6_conclusion?.justification],
          ];
          for (const [name, obj] of proseFields) {
            const bucket: string[] = []; collectStrings(obj, bucket);
            for (const s of bucket) {
              if (collapseRe.test(s)) { t3.push({ field: name, detail: s.slice(0, 160) }); break; }
            }
          }
        }

        // T-4: enhancement-class completion_guidance entries — depth language without a statutory anchor.
        function walkForT4(obj: any, path: string): void {
          if (!obj) return;
          if (Array.isArray(obj)) { obj.forEach((v, i) => walkForT4(v, `${path}[${i}]`)); return; }
          if (typeof obj !== "object") return;
          for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (k === "completion_guidance" && typeof v === "string") {
              if (depthLangRe.test(v) && !statAnchorRe.test(v)) {
                t4.push({ path: `${path}.${k}`, detail: v.slice(0, 160) });
              }
            } else if (v && typeof v === "object") {
              walkForT4(v, `${path}.${k}`);
            }
          }
        }
        walkForT4(reportData, "report");

        return { t2, t3, t4 };
      }

      let detected = detectDpiaViolations();
      const totalHits = detected.t2.length + detected.t3.length + detected.t4.length;
      if (totalHits > 0) {
        console.warn(JSON.stringify({
          evt: "post_lint_violation",
          fn: "run-dpia-framework",
          t2: detected.t2.slice(0, 6),
          t3: detected.t3.slice(0, 6),
          t4: detected.t4.slice(0, 6),
        }));
        try {
          const parts: string[] = [];
          if (detected.t2.length) parts.push(`T-2 (TEST-STATES BINDING) — do NOT re-ask or contradict RESOLVED tests: ${detected.t2.map((v) => `${v.test}:${v.kind}`).join(", ")}`);
          if (detected.t3.length) parts.push(`T-3 (BANNED COLLAPSE) — the intake supplies substantive inputs; do NOT collapse determinations with 'cannot be determined'/'no basis to assess'/'not established'`);
          if (detected.t4.length) parts.push(`T-4 (ENHANCEMENT-CLASS) — every completion_guidance item must be verdict-blocking or record-completeness, anchored to a cited GDPR/EDPB provision; remove pure depth items`);
          const retryInstr = `PREVIOUS ATTEMPT REJECTED by post-lint TEST-STATES gate: ${parts.join(" | ")}. Produce the JSON again, correcting these defects silently. Do not mention this instruction in the output.`;
          const [newA, newB] = await Promise.all([genHalf(promptA, retryInstr), genHalf(promptB, retryInstr)]);
          const mergedA = (newA && Object.keys(newA).length > 0) ? newA : partA;
          const mergedB = (newB && Object.keys(newB).length > 0) ? newB : partB;
          reportData = { ...mergedA, ...mergedB };
          detected = detectDpiaViolations();
          const stillHits = detected.t2.length + detected.t3.length + detected.t4.length;
          if (stillHits > 0) {
            console.warn(JSON.stringify({ evt: "post_lint_violation_after_retry", fn: "run-dpia-framework", remaining: stillHits }));
          }
        } catch (e) {
          console.warn("[DPIA] T-2/T-3/T-4 retry failed (non-fatal):", e);
        }
        for (const v of detected.t2) lintViolations.push({ rule: "T-2", ...v });
        for (const v of detected.t3) lintViolations.push({ rule: "T-3", ...v });
        for (const v of detected.t4) lintViolations.push({ rule: "T-4", ...v });
      }
    }

    if (!reportData.section_0_overview && !reportData.section_4_risk_management) {
      reportData = {
        framework_disclaimer: "This is not legal advice.",
        error: "Report generation encountered an issue. Please retry."
      };
    }


    reportData.generated_at = new Date().toISOString();
    reportData.dpia_id = dpia_id;
    reportData.enforcement_precedents = enforcementPrecedents;
    reportData.enforcement_meta = enforcementMeta;
    reportData.gdpr_meta = gdprMeta;
    reportData.lint_warnings = lintViolations;
    reportData._meta = { ...(reportData._meta ?? {}), prompt_version: stampPromptVersion("dpia-framework", "r1b2") };

    // ── Layer 4: Jurisdiction validator ──────────────────────────────────────
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


    // Detect unresolved placeholders across the entire report JSON.
    // Any [TO COMPLETE] or [TO BE ASSESSED] string anywhere in the output
    // means the document is not ready for sign-off. Set this flag
    // deterministically so the PDF renderer can show a draft notice without
    // relying on model compliance with a prompt instruction.
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

    // 2.7 S2 — forward-path guard. DPIA keeps its existing completion_guidance;
    // information_needed is added alongside (not merged).
    try {
      const guarded = guardInformationNeeded(reportData, (dpia.intake_data as Record<string, unknown>) ?? {});
      Object.assign(reportData, guarded.report);
    } catch (e) {
      console.warn("[run-dpia-framework] guardInformationNeeded failed (non-fatal):", e);
    }

    // Stage 1: metering + version retention (written BEFORE status:complete).
    await recordRunMeterAndVersion(supabase, {
      toolType: "dpia_framework",
      assessmentId: dpia_id,
      userId: dpia.user_id ?? null,
      intake: (dpia.intake_data as Record<string, unknown>) ?? {},
      reportData,
    });

    const completeWrite = await lifecycleUpdate(supabase, "dpia_frameworks", dpia_id, {
      status: "complete",
      report_data: reportData,
      updated_at: new Date().toISOString(),
    }, { fn: "run-dpia-framework", phase: "terminal_complete" });
    if (!completeWrite.ok) {
      await lifecycleUpdate(supabase, "dpia_frameworks", dpia_id, { status: "failed" }, { fn: "run-dpia-framework", phase: "terminal_fallback" });
    }

    // L2 — observe-only citation lint (never blocks, never mutates output).
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



    await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "dpia_frameworks", sourceRowId: dpia_id });


    // C4 RoPA accumulator
    if (dpia.client_id) {
      const intakeAny = (dpia.intake_data as any) || {};
      const summary = intakeAny.processing_description || intakeAny.activity_description || intakeAny.description || "Processing activity requiring DPIA";
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: dpia.client_id,
          source_tool: "dpia_framework",
          source_assessment_id: dpia_id,
          display_name: String(summary).slice(0, 120),
          source_summary: String(summary),
          is_high_risk: true,
          category: "other",
        },
      }).catch((e: Error) => console.error("[dpia] accumulate-ropa failed (non-fatal):", e.message));
    }


    const { data: userData } = await supabase.auth.admin.getUserById(
      dpia.user_id
    ).catch(() => ({ data: null as any }));

    // Fire-and-forget upsell signals (non-fatal).
    supabase.functions.invoke('trigger-upsell', {
      body: { tool_type: 'dpia_framework', assessment_id: dpia_id, user_id: dpia.user_id },
    }).catch((e: Error) => console.error('[dpia] trigger-upsell failed (non-fatal):', e.message));

    await supabase.functions.invoke("generate-report-pdf", {
      body: {
        tool_type: "dpia_framework",
        assessment_id: dpia_id,
        user_email: userData?.user?.email || null,
        user_name: userData?.user?.user_metadata?.full_name || null,
        result_url: `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/dpia-framework/result/${dpia_id}`,
      },
    }).catch((e: Error) => console.error("PDF/email delivery failed (non-fatal):", e));

      } catch (bgErr) {
        console.error("run-dpia-framework background error:", bgErr);
        await lifecycleUpdate(supabase, "dpia_frameworks", dpia_id, { status: "failed" }, { fn: "run-dpia-framework", phase: "terminal_error_catch" });
        await failFunctionRun(supabase, fnRun, bgErr);
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
