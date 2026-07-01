import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { resolveDpiaJurisdiction, renderResolvedBlock, validateJurisdiction, type DpiaIntakeFacts, type TransferFlow } from "../_shared/dpia-jurisdiction-registry.ts";
import { buildSystemContent, type ToolModule, type SystemBlock } from "../_shared/prompt-core.ts";

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
    "PUBLIC AUTHORITY LEGAL BASIS RULE: GDPR Article 6(1) final sentence states that Article 6(1)(f) (legitimate interests) does NOT apply to processing carried out by public authorities in the performance of their tasks. If the sector field or organisation name indicates a government, public sector, or public authority entity, you MUST NOT propose Article 6(1)(f) as the legal basis. Instead propose Article 6(1)(e) (public task) where a statutory mandate exists, or Article 6(1)(c) (legal obligation) where processing is required by law, and instruct the organisation to confirm the applicable statutory basis with legal counsel. Also: if the user's selected legal basis is \"Public task (Art. 6(1)(e))\", treat this as the starting point and do not suggest switching to 6(1)(f).",
    // DPO role
    "DPO ROLE RULE: The DPO's role in a DPIA is advisory (GDPR Article 35(2) and Article 39(1)(c)). The DPO provides advice and monitors performance — they do not approve, sign off on, or gate the DPIA decision. Never use the phrases \"DPO sign-off\", \"DPO approval\", \"DPO must approve\", or \"obtain DPO sign-off before proceeding\" in any section. Instead use: \"DPO advice received and considered\" or \"DPO consulted — advice documented\". The controller's representative owns the final sign-off decision. DPO consultation is also conditional: Article 35(2) applies only where a DPO is designated. Always present DPO consultation as \"required if a DPO is designated\" rather than unconditionally required. In section_5_interested_parties.dpo_advice, the record label must be 'DPO advice received and documented' — never 'DPO sign-off' or 'DPO signature.'",
    // Placeholder format
    "PLACEHOLDER FORMAT RULE: All completion placeholders throughout the DPIA framework must use the single consistent format: [TO COMPLETE — description]. For example: [TO COMPLETE — DPO name and contact], [TO COMPLETE — date consulted DD/MM/YYYY], [TO COMPLETE — summary of DPO advice]. Do NOT use: [INSERT], [INSERT DATE], [DD/MM/YYYY], [NAME / EMAIL], [Organisation Name], [REF], or any other variant. The only exception is the volume placeholder which uses [TO BE ASSESSED — confirm from operational data before the DPIA is finalised] as already defined.",
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
    "ARTICLE 20 PORTABILITY — ALL THREE CONDITIONS: Article 20 data portability applies only where ALL THREE conditions are met: (1) the data was provided BY the data subject, (2) the processing is based on consent (Art. 6(1)(a)/9(2)(a)) or contract (Art. 6(1)(b)), AND (3) the processing is carried out BY AUTOMATED MEANS. When discussing whether portability applies (e.g. in the rights-and-freedoms table or completion_guidance), state all three conditions — do not state only the legal-basis condition and imply that satisfies Art. 20 on its own. If Art. 6(1)(f) is the sole basis, or if the relevant processing is not automated, Art. 20 does not apply regardless of data provenance.",
    "IP TRUNCATION vs IP HASHING — DIFFERENT PROPERTIES, DO NOT CONFLATE: truncating an IP address (e.g. dropping the last octet of an IPv4 address) reduces re-identification risk while PRESERVING coarse geolocation and regional attribution. HASHING an IP address prevents re-identification but DESTROYS geolocation utility entirely — a hashed value cannot be geolocated by any downstream process. Never state or imply that hashing preserves geolocation or anomaly-detection utility \"for most security use cases\" alongside truncation as if they were interchangeable; assess and state which property (re-identification reduction vs. retained geolocation) the organisation actually needs before recommending either technique.",
    "LEGAL-OBLIGATION BASIS FOR SECURITY MONITORING: when proposing Art. 6(1)(f) (or 6(1)(b)) as the legal basis for security-monitoring processing, also assess whether Art. 6(1)(c) (legal obligation) applies — many jurisdictions impose statutory security obligations on platform/service operators (e.g. NIS2 for EU essential/important entities, sector-specific regulation). Add to the legal_basis analysis or completion_guidance: \"Also assess whether Art. 6(1)(c) applies — if security monitoring is mandated by sectoral or NIS2-equivalent law, 6(1)(c) may be the primary or an additional basis; document the assessment before finalising.\"",
    "CHAPTER V HIERARCHY FOR US TRANSFERS: when flagging that processor data-centre regions must be confirmed before a Chapter V mechanism can be identified, state the hierarchy explicitly: first check whether the destination is covered by an Art. 45 adequacy decision (for the US, this means the EU–US Data Privacy Framework where the specific importer is certified); only if no adequacy decision applies does an Art. 46 safeguard (SCCs, BCRs) become necessary. Do not write \"non-adequate third countries\" in a way that could be read to include the US generally — a DPF-certified US importer is adequacy-covered, not a non-adequate third country.",
  ].join("\n\n"),
  languageVariant: "jurisdiction-conditional",
};

Deno.serve(async (req) => {
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

    const { data: dpia } = await supabase
      .from("dpia_frameworks").select("*").eq("id", dpia_id).single();

    if (!dpia) return new Response(JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const intake = dpia.intake_data as any;
    const orgName = (dpia as any).organization_name || intake?.organization_name || null;
    await supabase.from("dpia_frameworks").update({
      status: "processing",
      ...(orgName && !(dpia as any).organization_name ? { organization_name: orgName } : {}),
    }).eq("id", dpia_id);

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
    const systemWithGdpr = buildSystemContent({
      toolModule: DPIA_TOOL_MODULE,
      currentDate: today,
      injected: [gdprAuthorityContext, resolvedBlock].filter(Boolean).join("\n\n"),
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

USER-PROVIDED INPUT HANDLING: The intake above may include user-provided inputs — an Article 9(2) condition, a necessity/proportionality & alternatives statement, and a retention period. Where a value is provided (i.e. not "Not specified"/"Not provided"): (1) Article 9(2) condition — treat it as the controller's PROPOSED special-category condition in section_2_analysis.special_category_conditions: state it explicitly and assess whether it is sound for this processing (for example, flag that explicit consent under Art. 9(2)(a) may not be freely given where an employment or other power imbalance exists). Do NOT emit a blank "[TO COMPLETE — identify Article 9(2) condition]" when the user has supplied one — assess what they supplied. (2) Necessity, proportionality & alternatives — incorporate the user's stated alternatives and justification into section_3_necessity_proportionality (the necessity and proportionality assessments), assessing them, rather than emitting only [TO COMPLETE] placeholders. (3) Retention period — use it in section_2_analysis.data_minimisation_retention (storage-limitation, Art. 5(1)(e)) and in the related mitigating measure, rather than treating retention as undefined. Where a value is "Not specified"/"Not provided", retain the existing [TO COMPLETE] behaviour. Never treat these user inputs as settled legal conclusions — assess them as proposals the organisation must validate with counsel.`;

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
    "processing_name": "internal name from the record of processing activities",
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
        console.warn(`[DPIA] genHalf truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} — single retry`);
        r = await callAnthropic("claude-sonnet-4-6", systemWithGdpr, finalUser, PRODUCT_MAX_OUTPUT_TOKENS);
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

    await supabase.from("dpia_frameworks").update({
      status: "complete",
      report_data: reportData,
      updated_at: new Date().toISOString(),
    }).eq("id", dpia_id);

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
        await supabase.from("dpia_frameworks").update({ status: "failed" }).eq("id", dpia_id);
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
