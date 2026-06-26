import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { buildSystemContent, type ToolModule, type SystemBlock } from "../_shared/prompt-core.ts";
import { renderGdprCitationBlock } from "../_shared/gdpr-registry.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripMd(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : (() => {
    try { return typeof s === "object" ? JSON.stringify(s) : String(s); }
    catch { return String(s); }
  })();
  return str
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/^\s*-\s+/gm, '• ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-_]{3,}\s*$/gm, '');
}

async function callAnthropic(model: string, system: string | SystemBlock[], user: string, maxTokens = 6000, timeoutMs = 720_000): Promise<string> {
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
  const elapsed = Date.now() - startedAt;
  const usage = d.usage || {};
  console.log(`[run-governance-assessment] stage=callAnthropic model=${model} elapsed=${elapsed}ms stop=${d.stop_reason ?? null} chars=${text.length} cache_read=${usage.cache_read_input_tokens ?? 0} cache_create=${usage.cache_creation_input_tokens ?? 0}`);
  return text;
}

const DOMAIN_DEFINITIONS = [
  { id: 1, name: "Tool Inventory and Sanctioning", key: "tool_inventory", escalate: false,
    prompt: "Assess whether the organisation has a complete, formally sanctioned inventory of technology tools used to process personal data. Review: completeness of inventory, formal approval process, shadow tool detection, DPA review status per tool. Rate severity: Critical/High/Medium/Low." },
  { id: 2, name: "Data Submission Risk", key: "data_submission", escalate: false,
    prompt: "Assess the risk of sensitive or personal data being submitted to external technology tools without appropriate controls. Review: prohibited data categories policy, technical controls enforcing restrictions, employee awareness of data minimisation obligations. Rate severity." },
  { id: 3, name: "Vendor Data Terms Compliance", key: "vendor_terms", escalate: true,
    prompt: "Assess whether vendor data terms for each external tool comply with applicable data protection law. Review: DPA/DPA equivalent signed, data residency compliance, subprocessor review, training opt-out where applicable, transfer mechanism for cross-border processing. Rate severity." },
  { id: 4, name: "Internal Policy Coverage", key: "internal_policy", escalate: false,
    prompt: "Assess whether internal policies adequately govern how employees use technology tools that process personal data. Review: policy existence, data minimisation instruction, prohibited data categories, personal data handling, update recency. Rate severity." },
  { id: 5, name: "Employee Training and Awareness", key: "training", escalate: false,
    prompt: "Assess whether employees understand their obligations when using technology tools that process personal data. Review: onboarding training, periodic refreshers, prohibited submission awareness, escalation path for incidents. Rate severity." },
  { id: 6, name: "Incident Response and Breach Readiness", key: "incident_response", escalate: true,
    prompt: "Assess whether the incident response plan covers data exposure through external technology tools as a notifiable breach scenario. Review: plan coverage, notification timelines, vendor contact procedures, regulatory reporting triggers. Rate severity." },
  { id: 7, name: "Regulatory Exposure Summary", key: "regulatory_exposure", escalate: true,
    prompt: "Map the organisation's data processing activities to applicable regulatory frameworks based on jurisdictions and data types. Identify specific provisions triggered. Rate severity." },
  { id: 8, name: "Privacy Impact Assessment Status", key: "dpia_status", escalate: true,
    prompt: "Assess whether Data Protection Impact Assessments have been conducted for high-risk processing activities. Identify which processing activities require a DPIA under Article 35 GDPR or equivalent. When identifying DPIA triggers, apply the Art. 35(3) subsections precisely as defined in the STATUTE-GLOSS INTEGRITY RULE: (a) applies to automated profiling with significant effects; (b) applies only where special category data (Art. 9(1)) or criminal data (Art. 10) is processed at large scale — NOT to employee monitoring without special category data; (c) applies only to systematic monitoring of publicly accessible PHYSICAL areas (CCTV-type surveillance) — NOT to online tracking, mobile analytics, IoT home monitoring, or digital behavioural profiling. For activities that do not match a specific Art. 35(3) subsection, cite the Art. 35(1) general high-risk threshold and the applicable supervisory authority DPIA list instead of forcing a subsection match. Rate severity." },
  { id: 9, name: "Data Subject Rights Integrity", key: "subject_rights", escalate: false,
    prompt: "Assess whether the organisation can fulfil data subject rights (erasure, access, portability) for data held by or processed through external technology tools. Rate severity." },
  { id: 10, name: "Privacy Notice Accuracy", key: "privacy_notice", escalate: false,
    prompt: "Assess whether the organisation's privacy notice accurately describes all processing activities including those involving external technology tools. Rate severity." },
];

// ---------------------------------------------------------------------------
// Tool Module factories (prompt-core v2.2). Substantive audited rules are
// preserved verbatim and moved out of the inline domainSystem string.
// ---------------------------------------------------------------------------
export const GOVERNANCE_CITATION_FRAMEWORK = "Cite regulatory bases ONLY for the jurisdictions in the intake. If the intake has no EU/UK jurisdiction, do NOT cite GDPR/UK GDPR/EU authorities anywhere; the number of applicable frameworks must equal the number of intake jurisdictions. In domain findings cite statutes only — no enforcement case names, fines, or SA guidance titles. Name supervisory authorities only from the verified mapping (e.g. France CNIL, Spain AEPD, Italy Garante, Netherlands AP — never UODO; Germany private-sector controllers → the relevant Land authority, never the BfDI); if a jurisdiction is unlisted, write 'the relevant supervisory authority in [country]'.";

export function buildGovernanceSharedRules(jurisdictions: unknown, euUkData: string): string {
  const intakeJurisdictionsJson = JSON.stringify(Array.isArray(jurisdictions) ? jurisdictions : []);
  const euUkValue = euUkData || "not specified";
  return `LANGUAGE: use the English variant matching the intake's jurisdictions — American English when no EU/UK jurisdiction is present; British English when any EU/UK jurisdiction is present. Never mix variants within one report. (This overrides the core's default American-English rule for this jurisdiction-aware tool.)

CITATION INTEGRITY: Cite provisions ONLY in the exact forms below. If you cannot match a citation to one of these patterns with certainty, name the law and obligation in plain language instead (e.g. 'CCPA — service provider contract requirement') rather than fabricate.
- Illinois BIPA: only the form "740 ILCS 14/<section>" (e.g. 740 ILCS 14/15(b)). NEVER write "§15-101", "§15-2", "§1401", "15 ILCS", or "15 USC".
- Colorado CPA: only "C.R.S. §6-1-1301" through "§6-1-1313". Consumer rights §6-1-1306; controller duties §6-1-1308; processor duties §6-1-1305; data protection assessments §6-1-1309.
- Virginia VCDPA: only "Va. Code §59.1-575" through "§59.1-585". Consumer rights §59.1-577; controller duties §59.1-578; processor duties §59.1-579; data protection assessments §59.1-580.
- CCPA/CPRA right to correct is §1798.106. NEVER cite §1798.120 (that is opt-out of sale) or §1798.100(a)(2) for the right to correct.
- §1798.150 is ONLY the data-breach private right of action. Do not cite §1798.150 for any other proposition.
- The CPRA service provider definition is §1798.140(ag).
- UK DPA 2018 Schedule 1 contains special-category processing conditions ONLY. Never cite Schedule 1 for general processing principles. The UK GDPR has NO Schedules — do not invent any.
- Ireland: NEVER cite specific Irish Data Protection Act 2018 section numbers. Cite the GDPR article directly and refer to "the Data Protection Act 2018 (Ireland)" generally. There is NO general registration or notification requirement with the Irish DPC.
- GDPR Recital 47 concerns legitimate interests only. Recital 39 concerns transparency and awareness. Do not swap them.
- DPO awareness-raising and training tasks are Article 39(1)(b), NOT Article 37(5). Article 37 has no SME or sector exemption — do not assert one.
- DEFINITIONAL-ARTICLE RULE: GDPR Article 4 contains definitions only and must NEVER be cited as the legal basis of an obligation. For duties concerning staff acting under the controller's or processor's authority, cite Article 29 and/or Article 32(4). For consent requirements, cite Article 6(1)(a) and Article 7 (Article 4(11) merely defines consent).

VENDOR NAMING RULE: Name ONLY vendors that are explicitly provided in the intake. Never introduce additional vendor or company names that the organisation did not list.

AI VENDOR DATA-HANDLING RULE: This rule applies ONLY to generative-AI / LLM tools explicitly named in the intake technology tools list (e.g. Microsoft 365 Copilot, Google Workspace / Gemini, ChatGPT Enterprise, Anthropic Claude). For such a tool, never assert as fact that it uses tenant data for AI model training. Frame any such concern as "verify [AI vendor]'s data-handling and model-training commitments for the tenant", substituting the actual vendor named in the intake. If the intake lists NO generative-AI / LLM tool, do not emit any such verification instruction, and never introduce an AI vendor that the organisation did not list — this is subordinate to the VENDOR NAMING RULE above.

EVIDENCE-BASIS SEVERITY RULE (calibration): Severity tiers mean exactly: Critical = no controls in place; High = controls exist but are materially incomplete; Medium = controls mostly in place with identified gaps, OR a control whose status cannot be confirmed from the intake; Low = minor gaps only; Compliant = requirements met. Apply this evidentiary discipline when assigning severity, and apply it identically in domain findings and in the synthesis:
- EVIDENCE GAP vs CONFIRMED DEFICIENCY. When an intake answer for a control is an explicit statement of uncertainty ("Unsure", "Don't know", "Not sure", "Uncertain") or renders as "not specified"/blank, that is an EVIDENCE GAP, not a confirmed deficiency. (a) Cap that domain's severity at Medium; do NOT rate it High or Critical on the basis of the uncertainty alone. (b) Never describe it as "no controls in place", "absence of controls", "controls are missing", or "controls are absent" — that Critical-tier language is reserved for a CONFIRMED negative answer ("No", "None"). (c) Frame gap_description and recommended_action as "[control] cannot be confirmed from the intake — verify, and if found absent, remediate". (d) Do NOT elevate an evidence-gap-only finding into top_three_risks; a top-three risk must rest on a confirmed deficiency.
- CREDIT CONFIRMED ADJACENT CONTROLS. Where the intake confirms a related control bearing on the same risk, do not characterise the area as having "no controls in place" merely because a different control is unconfirmed. State what is confirmed and what is unverified.
- THIS RULE NARROWS ONLY UNKNOWNS. A confirmed negative ("No"/"None"), a confirmed partial gap ("Most"/"Some"), or a confirmed material inadequacy is still rated at its genuine severity, which may be Critical or High.

ENFORCEMENT CASE RULE: Do NOT reference specific enforcement case names, fine amounts, or regulator decisions in any domain field. Enforcement precedents are injected only into the synthesis stage. Domain findings must cite statutes only.

JURISDICTION SCOPING RULE (critical): Cite regulatory bases ONLY for the jurisdictions listed in the intake jurisdictions field provided below. If eu_uk_data is "No", do NOT cite GDPR, UK GDPR, EU member-state law, or any EU/UK authority anywhere in the report. Never reference a country (e.g., Ireland) absent from the intake. The number of "applicable regulatory frameworks" must equal the number of intake jurisdictions.

INTAKE JURISDICTIONS: ${intakeJurisdictionsJson}
EU_UK_DATA: ${euUkValue}

STATUTE-GLOSS INTEGRITY RULE: When citing a statute at the section/subsection level, the parenthetical gloss must match that exact subsection. If unsure of the subsection, cite at the statute level only. Verified anchors — CCPA: §1798.100 notice/collection; §1798.105 right to DELETE; §1798.106 right to CORRECT; §1798.110 right to know; §1798.120 opt-out of sale/sharing; §1798.121 limit SPI; §1798.130 request methods; §1798.135 opt-out links; §1798.140(ag) service-provider definition; §1798.150 breach private right of action. There is NO §1798.104. BIPA 740 ILCS 14/15: (a) retention/destruction policy; (b) informed written consent; (c) no profit; (d) disclosure restrictions; (e) reasonable safeguards. GDPR: Art 24 accountability; Art 32(1)(b) confidentiality/integrity/availability/resilience; Art 32(4)/29 act-only-on-instructions; Art 37(1)(b) systematic monitoring; Art 37(1)(c) large-scale special categories. DSR response deadlines: CCPA 45 days (extendable 45); GDPR one month; Colorado 45 days; Virginia 45 days. California breach notification (Cal. Civ. Code §1798.82, as amended by SB 446 effective Jan 1, 2026): 30-day INDIVIDUAL notice from discovery; AG receives a SAMPLE COPY within 15 days of consumer notice when 500+ CA residents are affected.

Virginia breach notification: Va. Code §18.2-186.6 requires notice "without unreasonable delay" — NO statutory 60-day deadline. Texas breach notification: Tex. Bus. & Com. Code §521.053 "without unreasonable delay" — NO 60-day deadline. TDPSA is Tex. Bus. & Com. Code Chapter 541 — do NOT cite it as §343.001. Dutch implementing law is the UAVG (the WBP/WBPG was repealed in 2018 — never cite it). Florida Digital Bill of Rights (FDBR) applicability gate: cite only when thresholds confirmed; otherwise cite Fla. Stat. §501.171 for breach. Illinois BIPA applicability gate: cite 740 ILCS 14/15 only when the intake confirms biometric collection AND Illinois residents. GDPR Art. 35(3): (a) systematic and extensive automated profiling with significant effects; (b) large-scale Art. 9(1) special-category or Art. 10 criminal data — NOT general employee monitoring; (c) systematic monitoring of a PUBLICLY ACCESSIBLE PHYSICAL AREA (CCTV-type). Online tracking, mobile analytics, and IoT/website profiling are NOT (3)(c) — they fall under (3)(a) or the Art. 35(1) general threshold.

DPO RULE: Frame the GDPR Art. 37 DPO question identically in every domain: "assess and document whether Art. 37(1) triggers apply." Never assert appointment is mandatory, and never give "cross-border processing" as an Art. 37 trigger — it is not one.

VENDOR CLASSIFICATION RULE: Do not assume all vendors are processors. For each named technology vendor, identify whether it is acting as: (a) a processor; (b) a joint controller; or (c) an independent controller. Flag the classification as requiring legal confirmation rather than asserting it. Where genuinely uncertain (e.g. a generative-AI / LLM platform), say so explicitly: "The controller-processor boundary for [vendor] depends on the tenant configuration and enterprise commitments in place — legal counsel should confirm the classification before executing a DPA." Never describe the absence of a DPA as meaning "no lawful basis exists for processing" — the correct framing is "processing without an Art. 28-compliant contract is a GDPR violation, but the absence of a DPA does not by itself extinguish all lawful bases for the underlying processing activity."

REPETITION AND DEADLINES RULE: Immediate-action deadlines must be staggered realistically: 7 days only for actions executable unilaterally; 30 days for policies and training rollout; "this quarter" for negotiated outcomes such as executed vendor DPAs and completed DPIAs. Never assign the same deadline to all ten actions.

AI VENDOR VERIFICATION REPETITION RULE — STRICT: When the intake names a generative-AI / LLM tool, the full verification instruction must appear IN FULL in exactly ONE place: the Domain 3 (Vendor Data Terms Compliance) recommended action. In every other domain where the AI tool is relevant, use only this cross-reference: "([AI tool] data-handling and model-training commitments: see the Vendor Data Terms Compliance recommended action.)" A duplicate full instruction across multiple domains is a fatal output error. If the intake names NO generative-AI / LLM tool, this rule does not apply.

SUPERVISORY AUTHORITY MAPPING RULE: Use only the correct authority for each jurisdiction. Verified mappings: Austria DSB; Belgium GBA/APD — NEVER "APE"; Bulgaria CPDP; Croatia AZOP; Cyprus OAD; Czech Republic ÚOOÚ; Denmark Datatilsynet; Estonia AKI; Finland Tietosuojavaltuutetun; France CNIL; Germany: private-sector controllers are supervised by the relevant Land (state) data protection authority — e.g. Bayerisches Landesamt für Datenschutzaufsicht (BayLDA) in Bavaria; name the Land authority for the controller's state, or refer to "the competent German Land supervisory authority" / "the German state DPAs (DSK)" collectively if the state is unknown. The Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI) supervises ONLY federal public bodies, telecommunications, and postal services — never name the BfDI for a private-sector controller; Greece HDPA; Hungary NAIH; Ireland DPC; Italy Garante; Latvia DVI; Lithuania VDAI; Luxembourg CNPD; Malta IDPC; Netherlands AP — NEVER "UODO" (that is Poland); Poland UODO; Portugal CNPD; Romania ANSPDCP; Slovakia ÚOOÚ; Slovenia IP; Spain AEPD; Sweden IMY; United Kingdom ICO. If a jurisdiction is not on this list, write "the relevant supervisory authority in [country]" instead.

SUPERVISORY AUTHORITY GUIDANCE DOCUMENTS RULE: Do not cite specific SA guidance documents, opinions, recommendations, or working papers by title or section number unless the document is listed in the ENFORCEMENT PRECEDENTS block provided in this prompt. To reference SA guidance generally, write "the [SA] has published guidance on this topic — verify the current version at [SA]'s website". Acceptable without source block: "EDPB Guidelines [number]/[year]" if certain; "WP248" (DPIA); "WP259" (consent).

ONE-STOP-SHOP RULE: For controllers with a main establishment in an EU member state processing personal data across multiple EU states, the lead supervisory authority mechanism under GDPR Art. 56 means enforcement is primarily led by the SA of the member state of main establishment, with concerned SAs having involvement rights under Arts. 60–62. Exception: where there is no single EU main establishment, each SA retains independent jurisdiction and the one-stop-shop does not apply.

TERMINOLOGY RULE: DPA expands to "Data Processing Agreement" only. Do not describe a missing privacy notice as making processing "presumptively unlawful under Article 6" — a transparency failure breaches Arts. 13/14; keep lawfulness and transparency distinct (and omit both when GDPR is out of scope).`;
}

export function buildGovernanceDomainToolModule(jurisdictions: unknown, euUkData: string): ToolModule {
  return {
    identity: "You are a senior privacy and data protection compliance analyst assessing an organisation's data governance practices against the regulatory frameworks applicable to the intake's jurisdictions. This is a compliance framework tool.",
    citationFramework: GOVERNANCE_CITATION_FRAMEWORK,
    outputMode: "strict-JSON",
    extraRules: buildGovernanceSharedRules(jurisdictions, euUkData),
  };
}

export function buildGovernanceSynthesisToolModule(jurisdictions: unknown, euUkData: string): ToolModule {
  return {
    identity: "You are a senior privacy compliance analyst synthesising ten domain findings into an executive governance assessment.",
    citationFramework: `${GOVERNANCE_CITATION_FRAMEWORK} In the synthesis you may cite enforcement precedents, but ONLY those provided in the ENFORCEMENT PRECEDENTS / ENFORCEMENT CONTEXT block. Never state a monetary fine amount unless it appears in that block; otherwise write '[Regulator] imposed a significant penalty for this type of violation — verify the current figure at the regulator's enforcement register'. Known correct figures (use only if the case is in your block): ICO Clearview AI (2022) £7,552,800; ICO Interserve (2022) £4,400,000; ICO Capita Pension Solutions (2024) £6,090,000; ICO British Airways (2020) £20,000,000.`,
    outputMode: "strict-JSON",
    extraRules: buildGovernanceSharedRules(jurisdictions, euUkData),
  };
}

function buildStressGovernanceReport(assessmentId: string, intake: any) {
  const jurisdictions = Array.isArray(intake?.jurisdictions) ? intake.jurisdictions.map(String) : [];
  const hasEuUk = intake?.eu_uk_data === true || jurisdictions.some((j: string) => ["EU", "GB", "UK"].includes(j.toUpperCase()));
  const sector = String(intake?.sector || "").toLowerCase();
  const isHealthcare = /healthcare|life science|medical|clinical|pharma/i.test(sector);
  const isPublicSector = /gov|public sector|public authority|government/i.test(sector);
  const isFintech = /fintech|financial|banking|insurance/i.test(sector);
  const isEdTech = /edtech|children|child|schools|students/i.test(sector);

  const framework = hasEuUk
    ? "GDPR Art. 24, Art. 28, Art. 32 and Art. 35"
    : isHealthcare
    ? "HIPAA (45 C.F.R. Parts 160 and 164); C.R.S. §6-1-1309 and Va. Code §59.1-580 where applicable"
    : isPublicSector
    ? "C.R.S. §6-1-1309 and Va. Code §59.1-580 where applicable — Note: CCPA generally does not apply to government entities"
    : isFintech
    ? "GLBA Safeguards Rule (16 C.F.R. Part 314); CCPA §1798.100(d) where applicable; C.R.S. §6-1-1309 and Va. Code §59.1-580"
    : isEdTech
    ? "COPPA (16 C.F.R. Part 312); FERPA (34 C.F.R. Part 99) where applicable; CCPA §1798.100(d); C.R.S. §6-1-1309 and Va. Code §59.1-580"
    : "CCPA §1798.100(d); C.R.S. §6-1-1309 and Va. Code §59.1-580";
  const tools = Array.isArray(intake?.tools) && intake.tools.length ? intake.tools.join(", ") : "external workflow tools";
  const profile = intake?.sector ? `${intake.sector} organisation` : "organisation";
  const hasCoreControls = Boolean(intake?.privacy_policy || intake?.acceptable_use || intake?.training_status || intake?.dpa_status);

  const domain_findings = Object.fromEntries(DOMAIN_DEFINITIONS.map((domain, idx) => {
    const severity = hasCoreControls
      ? (domain.escalate ? "Medium" : idx % 3 === 0 ? "Low" : "Medium")
      : (domain.escalate ? "High" : "Medium");
    const timeline = idx < 3 ? "Immediate (within 7 days)" : idx < 7 ? "This quarter" : "Ongoing";
    return [domain.key, {
      domain_id: domain.id,
      domain_name: domain.name,
      current_state: `${profile} uses ${tools}; the intake responses indicate ${intake?.privacy_policy || "a privacy notice status not specified"}, ${intake?.dpa_status || "vendor contract status not specified"}, and ${intake?.training_status || "training status not specified"}.`,
      gap_description: `Confirm evidence quality, ownership, and audit trail completeness for ${domain.name.toLowerCase()}. Document the specific artifacts (policies, DPAs, training records, DPIA approvals) that support each control claim.`,
      severity,
      regulatory_basis: framework,
      recommended_action: `Validate documented evidence for ${domain.name.toLowerCase()} against ${framework} and record accountable remediation owners.`,
      suggested_owner: domain.escalate ? "Legal Counsel" : "Compliance Manager",
      suggested_timeline: timeline,
    }];
  }));

  return {
    generated_at: new Date().toISOString(),
    assessment_id: assessmentId,
    organisation_profile: intake,
    executive_summary: `The ${profile} shows baseline privacy-governance controls across policies, vendor management, training, and incident response. The primary areas requiring attention are evidence completeness, vendor classification, and ${hasEuUk ? "DPIA" : "data protection assessment"} scoping for high-risk workflows. Immediate action is focused on confirming documentation and ownership rather than rebuilding the program from scratch. All findings should be validated against actual organisational artifacts before sign-off.`,
    top_three_risks: [
      { risk: "Vendor terms evidence", domain: "Vendor Data Terms Compliance", why_urgent: "Processor and independent-controller classifications must be supportable before audit or regulatory review.", severity: "High" },
      { risk: "DPIA evidence trail", domain: "Privacy Impact Assessment Status", why_urgent: "High-risk workflows need documented assessment scope, approvals, and residual-risk decisions.", severity: "High" },
      { risk: "Operational proof", domain: "Employee Training and Awareness", why_urgent: "Policies and training must be backed by completion records and exception handling.", severity: "High" },
    ],
    immediate_actions: [
      { action: "Confirm that each listed tool has an owner, approved use case, and current vendor-risk record.", domain: "Tool Inventory and Sanctioning", timeline: "within 7 days", owner: "Compliance Manager" },
      { action: "Review vendor classification and contract coverage for each listed tool.", domain: "Vendor Data Terms Compliance", timeline: "this quarter", owner: "Legal Counsel" },
      { action: "Document DPIA rationale for high-risk workflows and record residual-risk approval.", domain: "Privacy Impact Assessment Status", timeline: "this quarter", owner: "DPO" },
    ],
    overall_readiness_rating: hasCoreControls ? "Defined" : "Developing",
    readiness_rationale: "Severity ratings reflect whether controls are present, documented, and ready for evidence review. Confirm each rating against actual artifacts before relying on this assessment.",
    interaction_effects: "Inventory, vendor terms, DPIA records, and privacy notices reinforce each other; gaps in one area weaken the reliability of the others.",
    dpia_scope: hasEuUk || intake?.special_category === "Yes" || intake?.special_category_data
      ? [{ processing_activity: "High-risk platform and workflow processing", regulatory_basis: hasEuUk ? "GDPR Art. 35" : "State privacy assessment requirements", priority: "This quarter" }]
      : [],
    domain_findings,
    enforcement_precedents: [],
    enforcement_meta: { attempted: false, skipped: "stress_run" },
    annotations: [],
    lint_warnings: [],
    disclaimer: "This report helps your organisation identify potential GDPR governance gaps. It does not constitute legal advice. All findings should be reviewed with qualified legal counsel.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let assessment_id: string | undefined;
  try {
    const caller = await verifyCaller(req, "user");
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json().catch(() => ({}));
    ({ assessment_id } = body);
    const stressRun = body?.stress_run === true;
    if (!assessment_id) return new Response(JSON.stringify({ error: "assessment_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: assessment } = await supabase
      .from("governance_assessments")
      .select("*").eq("id", assessment_id).single();

    if (!assessment) return new Response(JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const intake = assessment.intake_data as any;
    const orgName = (assessment as any).organization_name || intake?.organization_name || null;
    await supabase.from("governance_assessments")
      .update({
        status: "processing",
        ...(orgName && !(assessment as any).organization_name ? { organization_name: orgName } : {}),
      }).eq("id", assessment_id);


    const fnRun = await startFunctionRun(supabase, "run-governance-assessment", {
      archetype: "background",
      trustClass: "user",
      userId: caller.internal ? (assessment.user_id ?? null) : caller.userId,
      invokedBy: caller.internal ? "internal" : "user",
      metadata: { assessment_id },
    });

    // Dispatch heavy work in background — return 202 immediately so the caller
    // is not held open past the platform's 150s HTTP idle ceiling. Result page
    // polls governance_assessments.status. On unhandled error we mark failed.
    // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
    EdgeRuntime.waitUntil((async () => {
      try {
    const intakeSummary = `
Organisation (controller) being assessed: ${orgName || "not specified"}
Organisation sector: ${intake.sector || "not specified"}
Organisation size: ${intake.org_size || "not specified"}
Jurisdictions of operation: ${(intake.jurisdictions || []).join(", ") || "not specified"}
EU/UK personal data processed: ${intake.eu_uk_data || "not specified"}
Technology tools in use: ${(intake.tools || []).join(", ") || "not specified"}
  Data categories processed: ${(intake.data_categories || []).join(", ") || "not specified"}
  Existing privacy policy: ${intake.privacy_policy || "not specified"}
  Privacy notice coverage: ${intake.privacy_notice_coverage || "not specified"}
  Existing acceptable use policy: ${intake.acceptable_use || "not specified"}
DPO status: ${intake.dpo_status || "not specified"}
DPIA status: ${intake.dpia_status || "not specified"}
DPIA AI/high-risk coverage: ${intake.dpia_ai_coverage || "not specified"}
Incident response plan: ${intake.incident_response || "not specified"}
Employee privacy training: ${intake.training_status || "not specified"}
Training AI-tool coverage: ${intake.training_ai_coverage || "not specified"}
Special category data: ${intake.special_category || "not specified"}${intake.special_categories_list?.length ? ` — ${intake.special_categories_list.join(", ")}` : ""}
Tool inventory audit: ${intake.inventory_audit || "not specified"}
Technical controls preventing prohibited submission: ${intake.technical_controls || "not specified"}${intake.technical_controls_list?.length ? ` — ${intake.technical_controls_list.join(", ")}` : ""}
DSR fulfilment capability: ${intake.dsr_capability || "not specified"}${intake.dsr_rights_tested?.length ? ` (rights tested end-to-end: ${intake.dsr_rights_tested.join(", ")})` : ""}
Vendor DPA status: ${intake.dpa_status || "not specified"}
DPA Article 28(3) verification: ${intake.dpa_art28_verified || "not specified"}
Cross-border transfer status: ${intake.transfer_status || "not specified"}
Transfer mechanism in place: ${intake.transfer_mechanism || "not specified"}${intake.tool_instruction ? `\nTool-specific note: ${intake.tool_instruction}` : ""}

`;

    // --- Prompt-core v2.2 assembly --------------------------------------
    const today = new Date().toISOString().slice(0, 10);
    const GOVERNANCE_DOMAIN_TOOL_MODULE = buildGovernanceDomainToolModule(
      intake.jurisdictions || [],
      intake.eu_uk_data || "not specified",
    );
    const GOVERNANCE_SYNTHESIS_TOOL_MODULE = buildGovernanceSynthesisToolModule(
      intake.jurisdictions || [],
      intake.eu_uk_data || "not specified",
    );
    const domainSystem = buildSystemContent({
      toolModule: GOVERNANCE_DOMAIN_TOOL_MODULE,
      currentDate: today,
      cache: true,
    });

    const domainResults: Record<string, any> = {};

    const sector = (intake.sector || "").toLowerCase();
    const dataTypes: string[] = Array.isArray(intake.data_types) ? intake.data_types : [];
    const jurisdictionsLower: string[] = (intake.jurisdictions || []).map((j: string) => String(j).toLowerCase());
    const needsHigherQuality =
      intake.eu_uk_data === "Yes" ||
      intake.special_category === "Yes" ||
      sector === "healthcare" ||
      sector === "financial_services" || sector === "finance" ||
      dataTypes.some((t: string) =>
        ["biometric", "health", "financial", "genetic", "children"].includes(String(t).toLowerCase())
      ) ||
      jurisdictionsLower.some((j: string) =>
        ["us-federal", "california", "new-york"].includes(j)
      );

    const tryParseJson = (text: string): any | null => {
      try {
        const m = text.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : null;
      } catch { return null; }
    };

    const domainResultsArray = await Promise.all(
      DOMAIN_DEFINITIONS.map(async (domain) => {
        const model = (domain.escalate && needsHigherQuality)
          ? "claude-sonnet-4-6"
          : "claude-haiku-4-5-20251001";
        const userPrompt = `DOMAIN ${domain.id}: ${domain.name}

ORGANISATION PROFILE:
${intakeSummary}

ASSESSMENT TASK:
${domain.prompt}

Return JSON:
{
  "domain_id": ${domain.id},
  "domain_name": "${domain.name}",
  "current_state": "one sentence describing what exists today",
  "gap_description": "one sentence describing what is missing or inadequate, or null if no gap",
  "severity": "Critical | High | Medium | Low | Compliant",
  "regulatory_basis": "specific regulatory provision(s) requiring this — e.g. GDPR Art. 28, CCPA §1798.100",
  "recommended_action": "specific action required — must name the regulation and the action",
  "suggested_owner": "DPO | Legal Counsel | CISO | CTO | HR | Compliance Manager",
  "suggested_timeline": "Immediate (within 7 days) | This quarter | This year | Ongoing"
}`;
        const firstText = await callAnthropic(model, domainSystem, userPrompt, PRODUCT_MAX_OUTPUT_TOKENS);
        let parsed = tryParseJson(firstText);
        if (!parsed) {
          // Retry once before giving up. Never emit placeholder "parse error"
          // copy into customer-facing report; failed domains are excluded
          // from the report entirely and recorded as a lint warning.
          console.warn(`[Governance] domain ${domain.id} (${domain.name}) parse failed; retrying once.`);
          const retryText = await callAnthropic(model, domainSystem, userPrompt, PRODUCT_MAX_OUTPUT_TOKENS);
          parsed = tryParseJson(retryText);
        }
        if (!parsed) {
          return {
            key: domain.key,
            result: { assessment_failed: true, domain_id: domain.id, domain_name: domain.name },
          };
        }
        return { key: domain.key, result: parsed };
      })
    );

    // Partition successful vs failed domains. Failed domains are excluded
    // from synthesis input, from the rendered report, and from any
    // immediate-actions list.
    const failedDomains: Array<{ domain_id: any; domain_name: string }> = [];
    for (const { key, result } of domainResultsArray) {
      if (result && (result as any).assessment_failed) {
        failedDomains.push({
          domain_id: (result as any).domain_id,
          domain_name: (result as any).domain_name,
        });
        continue;
      }
      domainResults[key] = result;
    }
    const failedDomainNames = new Set(failedDomains.map((d) => String(d.domain_name || "").toLowerCase()));

    // Fetch enforcement precedents (3-5) relevant to this org's profile (before synthesis so they can be cited)
    let enforcementPrecedents: any[] = [];
    let enforcementMeta: any = { attempted: false };
    try {
      const { data: ctxData } = await supabase.functions.invoke("get-enforcement-context", {
        body: {
          tool: "Governance",
          jurisdictions: intake.jurisdictions || [],
          sector: intake.sector || undefined,
          biometric: intake.special_category_data || undefined,
          limit: 5,
        },
      });
      enforcementPrecedents = (ctxData?.results || []).slice(0, 5);
      const descParts: string[] = [];
      if (intake.sector) descParts.push(`${intake.sector} sector`);
      if ((intake.jurisdictions || []).length) descParts.push(`governance in ${(intake.jurisdictions || []).join(", ")}`);
      enforcementMeta = {
        attempted: true,
        total_matched: typeof ctxData?.total_matched === "number" ? ctxData.total_matched : null,
        query_descriptor: descParts.join(" — ") || undefined,
      };
    } catch (e) {
      console.error("get-enforcement-context failed (non-fatal):", e);
    }

    const enforcementContextStr = enforcementPrecedents.length > 0
      ? enforcementPrecedents.map((r: any, i: number) =>
          (() => {
            const fineVerified = r.fine_verified !== false;
            const fine = !fineVerified
              ? "fine amount under verification — omitted"
              : (r.fine_eur_equivalent ? `€${Number(r.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
            return `[E${i + 1}] id:${r.id} ${r.subject || "Unnamed"} — ${r.regulator} (${r.jurisdiction}, ${r.decision_date || "n.d."}) — Fine: ${fine} — Failure: ${r.key_compliance_failure || r.violation || "n/a"}`;
          })()
        ).join("\n")
      : "No directly analogous enforcement precedents retrieved.";

    // ── SYNTHESIS ──
    const synthesisUserBase = `Synthesise these ten domain findings into cross-domain patterns and an executive summary.

TEN DOMAIN FINDINGS:
${JSON.stringify(domainResults, null, 2)}

ORGANISATION PROFILE:
${intakeSummary}

ENFORCEMENT PRECEDENTS (cite by [E1]–[E5] where relevant):
${enforcementContextStr}

BRACKETED-CODE RENDERING RULE: When you reference any of these in narrative text (including domain findings and the cross-domain synthesis), use the human-readable form — regulator and year, e.g. "the Hamburg DPA's 2020 decision" — NEVER the bracketed [E#] code. The [E#] tags are for the annotations array only. If an enforcement example is not in the list above, do not reference it at all — no placeholder codes.

ANNOTATION REQUIREMENT: For each enforcement action cited above (tagged [E1], [E2], etc.), if it directly supports a top risk, immediate action, or readiness rating in your synthesis, include it in the annotations array using the id value from the enforcement context exactly as provided. You MUST only cite enforcement actions from the ENFORCEMENT PRECEDENTS provided above — never cite cases from training knowledge. If an enforcement action is not in the provided context, do not cite it.

SYNTHESIS REFERENCES: Refer to domains by NAME (e.g., "the Vendor Data Terms findings"), never by number.

Return JSON:
{
  "executive_summary": "3-5 sentence board-ready summary. Name the top three risks. Specify if immediate action is required. No jargon.",
  "top_three_risks": [
    { "risk": "risk name", "domain": "domain name", "why_urgent": "one sentence", "severity": "Critical|High" }
  ],
  "immediate_actions": [
    { "action": "specific action", "domain": "domain name", "timeline": "within X days", "owner": "role" }
  ],
  "interaction_effects": "one paragraph describing where findings in multiple domains compound each other",
  "dpia_scope": [
    { "processing_activity": "name the activity", "regulatory_basis": "why a DPIA is required", "priority": "Immediate | This quarter" }
  ],
  "overall_readiness_rating": "one of: Initial | Developing | Defined | Managed | Optimised",
  "readiness_rationale": "one sentence explaining the rating, including a brief methodology note (e.g., 'Domain severities reflect: Critical = no controls in place; High = controls materially incomplete; Medium = mostly in place with identified gaps; Low = minor gaps only; Compliant = requirements met.')",
  "annotations": [
    {
      "enforcement_action_id": "exact id string from the enforcement context above (the value after 'id:')",
      "regulator": "regulator name",
      "jurisdiction": "jurisdiction",
      "decision_date": "YYYY-MM-DD or null",
      "summary": "one sentence what the case involved, max 25 words, plain English",
      "outcome": "rejected | accepted | penalised | required",
      "relevance": "one sentence why this case is relevant to this synthesis"
    }
  ]
}`;

    const synthesisSystem = buildSystemContent({
      toolModule: GOVERNANCE_SYNTHESIS_TOOL_MODULE,
      currentDate: today,
      injected: `ENFORCEMENT CONTEXT (synthesis only):\n${enforcementContextStr}`,
      cache: true,
    });

    async function runSynthesis(extra: string): Promise<any> {
      const finalUser = extra ? `${synthesisUserBase}\n\n${extra}` : synthesisUserBase;
      const synthesisText = await callAnthropic("claude-sonnet-4-6", synthesisSystem, finalUser, PRODUCT_MAX_OUTPUT_TOKENS);
      try {
        const m = synthesisText.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
      } catch (e) {
        console.error("[Governance] Synthesis parse error:", e);
      }
      return {
        executive_summary: "Assessment complete. Review domain findings above for full detail.",
        top_three_risks: [],
        immediate_actions: [],
        overall_readiness_rating: "Initial",
        readiness_rationale: "Synthesis could not be completed.",
        interaction_effects: "",
        dpia_scope: [],
      };
    }

    function assembleSynthesisNarrative(syn: any, domains: Record<string, any>): string {
      const parts: string[] = [];
      if (syn?.executive_summary) parts.push(String(syn.executive_summary));
      if (syn?.interaction_effects) parts.push(String(syn.interaction_effects));
      if (syn?.readiness_rationale) parts.push(String(syn.readiness_rationale));
      for (const r of (syn?.top_three_risks || [])) {
        parts.push([r?.risk, r?.why_urgent].filter(Boolean).join(" "));
      }
      for (const a of (syn?.immediate_actions || [])) parts.push(String(a?.action || ""));
      for (const d of Object.values(domains || {})) {
        const dn: any = d;
        parts.push([dn?.current_state, dn?.gap_description, dn?.regulatory_basis, dn?.recommended_action]
          .filter(Boolean).join(" "));
      }
      return parts.join("\n\n");
    }

    let synthesis: any = await runSynthesis("");

    // Output lint: regenerate synthesis once on hard violations; never block delivery.
    const lintOpts = { checkUnresolvedTokens: true, checkDates: true, referenceDate: new Date() };
    let lint = lintReportText(assembleSynthesisNarrative(synthesis, domainResults), lintOpts);
    const lintViolations: any[] = [];
    if (hasHardViolations(lint)) {
      try {
        const details = lint.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
        synthesis = await runSynthesis(
          `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`
        );
        lint = lintReportText(assembleSynthesisNarrative(synthesis, domainResults), lintOpts);
      } catch (e) {
        console.warn("[Governance] lint retry failed (non-fatal):", e);
      }
    }
    for (const v of lint.violations) lintViolations.push(v);



    const strippedDomainFindings: Record<string, any> = {};
    for (const [k, v] of Object.entries(domainResults || {})) {
      const dn: any = v;
      strippedDomainFindings[k] = {
        ...dn,
        current_state: stripMd(dn?.current_state),
        gap_description: stripMd(dn?.gap_description),
        regulatory_basis: stripMd(dn?.regulatory_basis),
        recommended_action: stripMd(dn?.recommended_action),
      };
    }

    const reportData = {
      generated_at: new Date().toISOString(),
      assessment_id,
      organisation_profile: intake,
      executive_summary: stripMd(synthesis.executive_summary),
      top_three_risks: (synthesis.top_three_risks || []).map((r: any) => ({
        ...r,
        risk: stripMd(r?.risk),
        why_urgent: stripMd(r?.why_urgent),
      })),
      immediate_actions: (synthesis.immediate_actions || [])
        .filter((a: any) => !failedDomainNames.has(String(a?.domain || "").toLowerCase()))
        .map((a: any) => ({
          ...a,
          action: stripMd(a?.action),
        })),
      overall_readiness_rating: synthesis.overall_readiness_rating || "Initial",
      readiness_rationale: stripMd(synthesis.readiness_rationale || ""),
      interaction_effects: stripMd(synthesis.interaction_effects || ""),
      domain_findings: strippedDomainFindings,
      enforcement_precedents: enforcementPrecedents,
      enforcement_meta: enforcementMeta,
      annotations: (() => { try { return Array.isArray(synthesis?.annotations) ? synthesis.annotations : []; } catch { return []; } })(),
      lint_warnings: [
        ...failedDomains.map((d) => ({
          code: "domain_assessment_failed",
          severity: "hard",
          detail: d.domain_name,
        })),
        ...lintViolations,
      ],
      disclaimer: "This report helps your organisation identify potential GDPR governance gaps. It does not constitute legal advice. All findings should be reviewed with qualified legal counsel.",
    };

    const dpiaScope = synthesis.dpia_scope || [];

    await supabase.from("governance_assessments").update({
      status: "complete",
      report_data: reportData,
      dpia_scope: dpiaScope,
      updated_at: new Date().toISOString(),
    }).eq("id", assessment_id);

    await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "governance_assessments", sourceRowId: assessment_id });

    // C4 RoPA accumulator: governance assessment surfaces a "Programme governance" obligation
    if (assessment.client_id) {
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: assessment.client_id,
          source_tool: "governance_assessment",
          source_assessment_id: assessment_id,
          display_name: "Privacy programme governance",
          source_summary: "Drafted from Governance Assessment — review domain findings and link to RoPA categories.",
          is_high_risk: false,
          category: "finance_legal",
        },
      }).catch((e: Error) => console.error("[gov] accumulate-ropa failed (non-fatal):", e.message));
    }


    const { data: userData } = await supabase.auth.admin.getUserById(
      assessment.user_id
    ).catch(() => ({ data: null as any }));

    // Fire-and-forget upsell signals (non-fatal).
    supabase.functions.invoke('trigger-upsell', {
      body: { tool_type: 'governance_assessment', assessment_id, user_id: assessment.user_id },
    }).catch((e: Error) => console.error('[gov] trigger-upsell failed (non-fatal):', e.message));

    await supabase.functions.invoke("generate-report-pdf", {
      body: {
        tool_type: "governance_assessment",
        assessment_id,
        user_email: userData?.user?.email || null,
        user_name: userData?.user?.user_metadata?.full_name || null,
        result_url: `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/governance-assessment/result/${assessment_id}`,
      },
    }).catch((e: Error) => console.error("PDF/email delivery failed (non-fatal):", e));

      } catch (bgErr) {
        await failFunctionRun(supabase, fnRun, bgErr);
        console.error("run-governance-assessment background error:", bgErr);
        if (assessment_id) {
          await supabase.from("governance_assessments")
            .update({ status: "failed" }).eq("id", assessment_id);
        }
      }
    })());

    return new Response(JSON.stringify({ success: true, assessment_id, status: "processing" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("run-governance-assessment error:", e);
    if (assessment_id) {
      await supabase.from("governance_assessments")
        .update({ status: "failed" }).eq("id", assessment_id);
    }
    return new Response(JSON.stringify({ error: "Assessment failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
