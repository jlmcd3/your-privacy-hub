// build-marker: cyber-qi3-observations-not-directives-2026-07-03
console.log("[build-marker] run-cppa-cybersecurity qi3-observations-not-directives-2026-07-03");
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { stripEnforcementTags } from "../_shared/enforcement-id-hygiene.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type SystemBlock, type ToolModule } from "../_shared/prompt-core.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";


export const CPPA_CYBER_TOOL_MODULE: ToolModule = {
  identity:
    "You are a cybersecurity readiness analyst specializing in California's CPPA cybersecurity audit regulations (11 CCR §§ 7120–7124), approved by OAL in September 2025 and effective January 1, 2026. You map an organization's controls against the 18 enumerated cybersecurity program components under 11 CCR § 7123(c) and produce a structured readiness assessment.",
  citationFramework:
    "Per-control citations are supplied deterministically from the CONTROL_CITATIONS map (11 CCR § 7123(c)(1)–(18)); never invent, alter, or reorder a control citation. Cite procedural provisions only as 11 CCR §§ 7120–7124. Never describe the regulations as proposed.",
  outputMode: "strict-JSON",
  extraRules: [
    "PROSE CITATION HYGIENE: In finding, remediation, top_risks, next_steps, and executive_summary, refer to each cybersecurity component by its NAME only. NEVER write a component subsection number — no \"11 CCR § 7123(c)(N)\", \"§ 7123(c)(N)\", or \"(c)(N)\" — in any of these prose fields; the correct per-control citation is supplied by the system in the fsor_citation and regulatory_basis fields. In prose you may cite only the procedural range 11 CCR §§ 7120–7124 (e.g. § 7122, § 7123(e), § 7124) where unavoidable. Writing a § 7123(c)(N) subsection in prose is a defect.",
    "PHASE-IN: first audit certifications are due April 1, 2028 (>$100M 2026 gross revenue), April 1, 2029 ($50–100M), April 1, 2030 (<$50M), under 11 CCR § 7121(a). Never present a readiness deadline earlier than the business's applicable phase-in date (a prospective obligation).",
    "FRAMEWORK: when the intake specifies a primary framework (SOC 2, ISO 27001, NIST CSF 2.0, CIS Controls), frame remediation and control-mapping in THAT framework; default to NIST CSF 2.0 only when none is given. Under § 7123(f) a business may leverage an existing aligned audit only if all Article 9 requirements are met independently or by supplementation — test each element.",
    "NIST CSF 2.0 CITATION LEVEL: In remediation and all prose, cite NIST CSF 2.0 at the FUNCTION level by name (Govern, Identify, Protect, Detect, Respond, Recover) and, where useful, name the relevant category in plain words (e.g. \"the Protect function's technology-infrastructure-resilience controls\"). Do NOT emit specific alphanumeric subcategory identifiers (e.g. \"PR.IR-01\", \"PR.AA-05\", \"PR.AT-02\", \"PR.DS-6\") — model-recalled subcategory codes are frequently mis-assigned, and a wrong code is a citation defect. Use a subcategory code ONLY if it is explicitly supplied in the intake's chosen framework mapping.",
    "SECTOR OVERLAYS (note where relevant): GLBA Safeguards Rule (16 CFR Part 314) for financial services; NERC CIP (CIP-002–CIP-014) for bulk-power operators; CPNI (47 CFR Part 64) for telecom; California IoT Security Law (Cal. Civ. Code §§ 1798.91.04–.06) for connected devices; FDA 21 CFR Part 11 for clinical-records systems.",
    "APPLICABILITY: CPPA cybersecurity audit obligations apply only to 'businesses' (Cal. Civ. Code § 1798.140(ag)); state/local government agencies are excluded, and nonprofits/others must meet a CCPA business threshold. Where the intake indicates a government or nonprofit entity, add the applicability caveat and instruct the entity to confirm covered-business status before relying on the report.",
    "AUDIT vs CERTIFICATION: the independent auditor documents any gaps with remediation in the audit report under § 7123(e); the business's executive then submits the certification under § 7124. Keep these two documents/parties distinct — never collapse them into one step, and the audit's gap list does not excuse the executive certification.",
    "READINESS LABEL is exactly one of: Audit-Ready (90+) | Substantially Ready (70–89) | Material Gaps (50–69) | Critical Gaps (<50) | Insufficient basis to assess. It is THIS tool's readiness assessment, not a CPPA regulatory determination. Use \"Insufficient basis to assess\" when the intake leaves a material share of controls unassessed (see STATUS↔SCORE).",
    "STATUS↔SCORE: a control's status must match its score band — Critical Gap (0–20); Partial or Gap (21–59; use Gap when the control is absent per the intake, Partial when it partially exists); Implemented (60–89); Mature (90–100). Where the intake provides no information on a control, set its status to \"Insufficient information\" and do NOT score it (leave the score at 0); do NOT label it \"Gap\". This MUST agree exactly with the per-control STATUS↔SCORE rubric in the component prompt — there is only one band scheme.",
    "CITATION CONSISTENCY (HARD RULE): When you mention a § 7123(c)(N) subsection in finding/remediation prose for a control, the subsection number MUST be exactly the same N as that control's own citation. Do NOT increment, decrement, or reorder. If unsure, refer to the provision generically as 'this control' or 'the cited component' rather than guessing a subsection number — the system injects the authoritative section deterministically.",
    "NO RAW SLUGS IN PROSE: Never expose intake control slugs (e.g. 'c14_third_party', 'c16_training', 'c17_incident', 'c18_continuity') or phrases like 'mapped to c16_training' in user-facing fields (finding, remediation, regulatory_basis, executive_summary). Use the plain-English control label (e.g. 'the training control', 'the third-party oversight control'). Slugs may appear only in metadata/id fields.",
    "PRIORITY LABELS ≠ REGULATORY DEADLINES: the priority values (Immediate | Within 90 days | Within 6 months | Monitor) express operational urgency only. NEVER present a priority label as a regulatory or statutory deadline in prose. Do not write that remediation is required, due, or mandated \"within 90 days\" (or any priority-bucket window) as if the regulation imposes it. Where remediation timing is discussed in prose, tie urgency to the applicable § 7121(a) phase-in certification deadline (April 1, 2028/2029/2030 by revenue band), not to a priority-bucket label.",
    "BREACH-NOTIFICATION IS A FLAG, NOT A DIRECTIVE: whether a given incident triggers a specific breach-notification obligation (including California Attorney General reporting) is a determination for the user/counsel, not this tool. In remediation/next_steps, do NOT direct the organisation to report to the California AG \"where required\" or otherwise instruct fulfilment of a specific notification obligation. Flag the question and cite the controlling provision once per control — state it in EITHER finding OR remediation, never both verbatim: \"Confirm whether the incident triggered any breach-notification obligation, including California AG reporting under Cal. Civ. Code § 1798.82, and retain the determination and any notifications for auditor review.\" State the obligation; leave the applicability determination to the user.",
    "PRIORITY MUST TRACK STATUS/SCORE: each control's priority must be consistent with its status and score. Implemented or Mature controls (score ≥ 60) take priority \"Monitor\" — never \"Immediate,\" \"Within 90 days,\" or \"Within 6 months.\" Partial/Gap controls take a remediation window (\"Within 90 days\" or \"Within 6 months\" by severity). Critical Gap controls take \"Immediate.\" For Insufficient-information controls, the priority depends on WHY information is missing: if the control is one the regulation requires of this business and the evidence is simply absent, use \"Immediate\"; but if the control's APPLICABILITY itself is unconfirmed (the remediation reads \"determine whether the business [develops software / operates network zones / etc.]\" — a scoping question, not a known gap), use \"Within 90 days\" and frame the action as determining applicability and then either producing evidence or documenting non-applicability. Do not label a control \"Immediate\" solely because applicability has not yet been confirmed. Do not assign a remediation deadline to a control you have rated Implemented.",
    "RATE ON EVIDENCE, NOT INFERENCE: do not rate a control \"Implemented\" while the finding says the control is only \"inferred\" or that the intake \"does not include a discrete entry\" for it. If discrete intake evidence supports the control, state that evidence in the finding (which intake entries establish it) rather than calling it an inference. If no discrete evidence exists and the control is merely inferred from adjacent controls, set status to \"Insufficient information\" and leave the score at 0 (per STATUS↔SCORE). The finding narrative and the status must agree. APPLICABILITY CAVEAT FOR 0-SCORED CONTROLS: 11 CCR § 7123(c) limits the audit to components \"the auditor deems applicable to the business's information system\" — a 0 score for \"Insufficient information\" should not read as a universal deficiency. In remediation, add: \"If this component is not applicable to the business's information system (e.g. the business does not develop software, or does not operate its own network infrastructure), document and retain the determination of non-applicability for auditor review.\"",
    "REMEDIATION PHRASING FOR IMPLEMENTED CONTROLS: for a control rated Implemented or Mature, remediation must presume the control exists and focus on evidence-readiness — phrase it as \"retain and make audit-ready the documentation evidencing [the control / alignment with the relevant NIST CSF 2.0 function]\" rather than \"map,\" \"align,\" or \"establish\" the control (which implies it is not yet in place and contradicts the Implemented rating). \"Map/establish/align\" phrasing is appropriate only for Gap, Partial, or Insufficient-information controls. ACROSS ALL CONTROLS, the NIST CSF 2.0 function is descriptive CONTEXT, never the action item: do not phrase remediation as \"align your documentation with the [Function] function of NIST CSF 2.0\" as if CSF alignment were the compliance objective. The compliance objective is to retain audit-ready evidence under 11 CCR § 7123(e) generally — but the NIST CSF function parenthetical, when included, must be attached to the CONTROL'S OWN subsection (e.g. \"§ 7123(c)(6)\"), never to the generic \"§ 7123(e)\" audit-report citation. Do NOT write \"§ 7123(e) (corresponding to the [Function] function of NIST CSF 2.0)\" — § 7123(e) is the audit-report content requirement, not the component being assessed, and attaching a component-specific NIST function note to it misattributes the citation. Phrase the action as: \"retain and make audit-ready the documentation evidencing [the control] (corresponding to the [Function] function of NIST CSF 2.0), as required under 11 CCR § 7123(e)\" — i.e. the NIST parenthetical follows the CONTROL description, and the § 7123(e) procedural citation stands on its own at the end of the sentence, not fused with the NIST parenthetical.",
    "DO NOT INFER ACTIVITIES FROM SECTOR: never infer that a business performs a specific activity (e.g. software development, manufacturing, data sales) from its industry sector or company name and then treat that inference as fact in a finding. If the intake contains no discrete evidence for a control area, flag the absence neutrally — \"the intake does not address [component]; if the business performs [activity], this component must be documented\" — without asserting the activity is \"likely\" given the sector. Sector is not evidence that a specific control applies.",
    "UNIFORM FINDINGS — DO NOT NAME THE BUSINESS IN FINDINGS: write every control finding in the same impersonal register. Refer to the business generically as \"the business\" or \"the intake\" — do NOT insert the organisation's name (e.g. \"Civix Technology LLC isolates…\", \"in place at [Company]\") into some findings while omitting it from others. Naming the entity in a subset of findings creates formatting inconsistency across the report. The business name belongs in document metadata/header fields only, never in the per-control finding prose.",
   "ZERO-TRUST IS NOT A REGULATORY CRITERION: an earlier draft of 11 CCR § 7123 included \"zero-trust architecture\" as a standalone evaluation criterion; the Agency deleted it entirely from the final regulation. If the intake records a zero-trust architecture control, do NOT treat that entry as evidence satisfying \"Segmentation of an information system\" (§ 7123(c)(10)) or any other surviving component. Note in the finding that a zero-trust entry may reflect pre-final-regulation design assumptions, and that the auditable requirement is segmentation (logical or physical separation) specifically — direct the business to document its segmentation architecture independently of any zero-trust framing. CITE THE SOURCE FOR THIS CLAIM: when stating that zero-trust was removed from the final regulation, ground it in the supplied FSOR commentary if a matching entry exists in fsorByCitation/semantic results for this control (cite by page/package per the existing fsor_citation mechanism); if no matching FSOR commentary is available in the supplied context for this specific claim, phrase it as a general statement without asserting a specific citable source: 'the intake records a zero-trust architecture control, but 11 CCR § 7123(c) as finalised does not include zero-trust as a standalone criterion; the auditable requirement is segmentation (§ 7123(c)(10)) specifically.' Do not assert a removal-from-draft narrative as a specific regulatory-history fact unless the FSOR commentary actually supplied to you supports it — a true fact stated without an available citation should be reworded to describe the CURRENT regulation's requirement, not the drafting history.",
   "VULN SCANNING / PEN TESTING IS DETECT/PROTECT, NOT IDENTIFY: when citing the NIST CSF 2.0 function for vulnerability scanning and penetration testing remediation, use Detect and/or Protect — these are active detection and protective activities, not asset/risk inventory (which is Identify). Do not attribute vulnerability scanning or penetration testing remediation to the Identify function.",
    "AWARENESS AND TRAINING ARE SEPARATE COMPONENTS — DO NOT CONFLATE: an earlier draft treated cybersecurity awareness and cybersecurity education/training as a single component; the final regulation split them into two distinct components — \"Cybersecurity awareness\" (§ 7123(c)(12)) and \"Cybersecurity education and training\" (§ 7123(c)(13)). Assess and score them independently. If the intake provides a single undifferentiated entry covering both, do not assume it satisfies both components — flag that the intake does not separately distinguish awareness activities (ongoing threat-landscape literacy) from formal training (structured onboarding/annual/post-incident instruction), and that the business's documentation should reflect both components per the final regulatory structure.",
    "FINDINGS ARE OBSERVATIONS, NOT REGISTERS OF ABSENT ARTEFACTS: every 'finding' string must describe the state of the control as evidenced (or not) by the intake — a neutral observation of what the intake does or does not establish. Do NOT phrase a finding as a shopping list of documents the business must produce, and do NOT lead with 'Missing: …' or a bare enumeration of artefacts. Where evidence is absent, say so plainly (e.g. 'the intake does not establish [component]') and reserve the enumeration of required artefacts for the remediation field. Findings observe; remediation directs. This separation must hold across every control regardless of status.",
    "FINDINGS ARE OBSERVATIONS, NOT DIRECTIVES: the 'finding' field is a neutral, past/present-tense observation of what the intake does or does not establish for this control. It must NOT contain imperatives, recommendations, or directives (e.g. 'implement…', 'establish…', 'the business should…', 'must document…', 'needs to…'). All directive language — what the business should do, produce, or change — belongs exclusively in the 'remediation' field. If a finding currently reads as an instruction, rewrite it as an observation of the current state (e.g. 'the intake does not establish an inventory of personal information as required by § 7123(c)(1)') and move any prescriptive content to remediation. This rule holds regardless of control status.",
    "NO FALSE TOTALIZERS — NARRATIVES STATE THE ACTUAL DISTRIBUTION: top_risks, executive_summary, and next_steps must never say 'every control', 'all controls', or 'all 18' unless it is literally true of all 18. Where control statuses are mixed, state the actual counts and treat each population on its own terms (e.g. \"Eleven controls are recorded as implemented but lack the operational specifics an auditor must examine; seven could not be assessed because the intake provided insufficient information\"). A risk narrative that misstates the status distribution is a factual error, whatever its analytical point.",
  ].join("\n"),
  languageVariant: "american",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripMd(s: string | undefined | null): string {
  if (!s) return s ?? "";
  return s
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

// Remove model-authored "11 CCR § 7123(c)(N)" component-subsection numbers from
// prose. Procedural cites (§§ 7120–7124, § 7122, § 7123(e), § 7124) are preserved.
function stripComponentCite(s: string | undefined | null): string {
  if (!s) return s ?? "";
  const CITE = String.raw`(?:11\s*CCR\s*)?§+\s*7123\s*\(\s*c\s*\)\s*\(\s*\d+\s*\)`;
  return s
    .replace(new RegExp(String.raw`\s*\(\s*${CITE}\s*\)`, "gi"), "")
    .replace(new RegExp(String.raw`[,;]?\s*(?:consistent with|in line with|under|per|pursuant to|as required by|as enumerated(?:\s+(?:in|under))?|which maps? to|mapped to|maps? to)\s+${CITE}`, "gi"), "")
    .replace(new RegExp(CITE, "gi"), "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:)])/g, "$1");
}

async function callAnthropic(system: string | SystemBlock[], user: string, maxTokens: number): Promise<{ text: string; stopReason: string | null }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(900_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const d = await res.json();
  const text = d.content?.[0]?.text || "";
  const stopReason: string | null = d.stop_reason ?? null;
  console.log(`[run-cppa-cybersecurity] gen done stop=${stopReason} chars=${text.length}`);
  return { text, stopReason };
}

const ALL_COMPONENTS: string[] = [
  "Authentication",
  "Encryption of personal information",
  "Account management and access controls",
  "Inventory and management of personal information and systems",
  "Secure configuration of hardware and software",
  "Vulnerability scanning and penetration testing",
  "Audit-log management",
  "Network monitoring and defenses",
  "Antivirus and anti-malware protections",
  "Segmentation of an information system",
  "Port and protocol management and protection",
  "Cybersecurity awareness",
  "Cybersecurity education and training",
  "Secure development and coding practices",
  "Oversight of service providers, contractors, and third parties",
  "Retention schedules and proper disposal of personal information",
  "Security-incident response management",
  "Business-continuity and disaster-recovery planning",
];

// Per-control citations from the final 11 CCR § 7123(c) regulatory text
// (OAL approved September 22, 2025; effective January 1, 2026).
// Source: Cal. Code Regs. tit. 11, § 7123(c)(1)–(18). The final regulations
// deleted "Zero-trust architecture", split awareness (c)(12) and education/
// training (c)(13) into two components, and added "Port and protocol
// management and protection" at (c)(11). Physical-access restriction is part
// of "Account management and access controls" (c)(3), not a standalone item.
const COMPONENT_CITATIONS: Record<string, string> = {
  "Authentication":                                                 "11 CCR § 7123(c)(1)",
  "Encryption of personal information":                             "11 CCR § 7123(c)(2)",
  "Account management and access controls":                         "11 CCR § 7123(c)(3)",
  "Inventory and management of personal information and systems":   "11 CCR § 7123(c)(4)",
  "Secure configuration of hardware and software":                  "11 CCR § 7123(c)(5)",
  "Vulnerability scanning and penetration testing":                 "11 CCR § 7123(c)(6)",
  "Audit-log management":                                           "11 CCR § 7123(c)(7)",
  "Network monitoring and defenses":                                "11 CCR § 7123(c)(8)",
  "Antivirus and anti-malware protections":                         "11 CCR § 7123(c)(9)",
  "Segmentation of an information system":                          "11 CCR § 7123(c)(10)",
  "Port and protocol management and protection":                    "11 CCR § 7123(c)(11)",
  "Cybersecurity awareness":                                        "11 CCR § 7123(c)(12)",
  "Cybersecurity education and training":                           "11 CCR § 7123(c)(13)",
  "Secure development and coding practices":                        "11 CCR § 7123(c)(14)",
  "Oversight of service providers, contractors, and third parties": "11 CCR § 7123(c)(15)",
  "Retention schedules and proper disposal of personal information":"11 CCR § 7123(c)(16)",
  "Security-incident response management":                          "11 CCR § 7123(c)(17)",
  "Business-continuity and disaster-recovery planning":             "11 CCR § 7123(c)(18)",
};

async function runAssessment(assessment_id: string): Promise<void> {
  const { data: row } = await supabase
    .from("cppa_assessments")
    .select("*")
    .eq("id", assessment_id)
    .single();

  if (!row) {
    console.error(`[CPPA Cyber] assessment ${assessment_id} not found`);
    return;
  }

  await supabase
    .from("cppa_assessments")
    .update({ status: "processing" })
    .eq("id", assessment_id);

  try {
    // Fetch CPPA cybersecurity-relevant enforcement context (breach + CA focus)
    let enforcementContext = "";
    let enforcementResults: any[] = [];
    let enforcementMeta: any = { attempted: false };
    let enforcementSector: string | undefined;
    try {
      const intake = (row.intake_data as any) ?? {};
      const sector = intake?.profile?.industry
        ?? intake?.industry_sector
        ?? intake?.sector
        ?? undefined;
      enforcementSector = sector;
      const ecRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/get-enforcement-context`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            tool: "CPPA",
            regime: "ccpa",
            jurisdictions: ["California", "United States", "US-CA"],
            breach: true,
            limit: 6,
          }),
        },
      );
      if (ecRes.ok) {
        const ec = await ecRes.json();
        enforcementResults = ec?.results || [];
        enforcementMeta = {
          attempted: true,
          total_matched: typeof ec?.total_matched === "number" ? ec.total_matched : null,
          query_descriptor: `cybersecurity breach context${enforcementSector ? ` in ${enforcementSector}` : ""}`,
        };
        if (enforcementResults.length) {
          enforcementContext = enforcementResults.map((r: any, i: number) => {
            const fineVerified = r.fine_verified !== false;
            const fine = !fineVerified
              ? "fine amount under verification — omitted"
              : (r.fine_eur_equivalent ? `€${Number(r.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
            return `[E${i + 1}] id:${r.id} ${r.regulator} v ${r.subject} (${r.decision_date ?? "n.d."}): ${r.violation ?? r.key_compliance_failure ?? ""} | Fine: ${fine} | ${r.source_url ?? ""}`;
          }).join("\n");
        }
      }
    } catch (e) {
      console.warn("[CPPA Cyber] enforcement context fetch failed:", e);
    }

    const today = new Date().toISOString().slice(0, 10);
    const system = buildSystemContent({
      toolModule: CPPA_CYBER_TOOL_MODULE,
      currentDate: today,
      cache: true,
    });

    const enforcementBlock = enforcementContext
      ? `Recent breach / cybersecurity enforcement context (use to calibrate severity and cite where directly relevant, tagged [E1], [E2], etc.):\n${enforcementContext}\n\nANNOTATION REQUIREMENT: For each enforcement action cited above, if it directly supports a control finding, severity rating, or remediation in your report, include it in the annotations array using the id value from the enforcement context exactly as provided (the value after 'id:'). You MUST only cite enforcement actions from the context above — never cite cases from training knowledge.\n`
      : "";

    const intakeJson = JSON.stringify(row.intake_data, null, 2);

    function buildControlsPrompt(startIdx: number, endIdx: number): string {
      // startIdx/endIdx are 1-based inclusive
      const slice = ALL_COMPONENTS.slice(startIdx - 1, endIdx);
      const numbered = slice.map((c, i) => `${startIdx + i}. ${c}`).join("\n");
      return `Based on this organisation's CPPA cybersecurity readiness intake, assess CPPA cybersecurity programme components ${startIdx}–${endIdx} ONLY (one object per component, in the exact order listed below). Do NOT emit any other components, and do NOT emit executive_summary, overall_score, readiness_level, top_risks, enforcement_context, or next_steps.

Intake data:
${intakeJson}

${enforcementBlock}Respond with this exact JSON structure (controls array MUST contain exactly ${slice.length} items, one per listed component, in order):
{
  "controls": [
    {
      "control": "string (the component name exactly as listed)",
      "score": 0,
      "status": "Implemented | Partial | Gap | Critical Gap | Mature | Insufficient information",
      "finding": "string (1-2 sentences — specific gap or confirmation only — use US English)",
      "regulatory_basis": "string (the specific program component being assessed, in plain language — do NOT begin with 'and document', 'and maintain', or 'document and' — write a clean noun phrase that completes the sentence 'the annual cybersecurity audit must assess [your text]'; do NOT include a section citation; the citation is added by the system)",
      "remediation": "string (2-3 specific steps, plain language, US English)",
      "priority": "Immediate | Within 90 days | Within 6 months | Monitor"
    }
  ],
  "annotations": [
    {
      "enforcement_action_id": "exact id string from the enforcement context above (the value after 'id:')",
      "regulator": "regulator name",
      "jurisdiction": "jurisdiction",
      "decision_date": "YYYY-MM-DD or null",
      "summary": "one sentence what the case involved, max 25 words, plain English",
      "outcome": "rejected | accepted | penalised | required",
      "relevance": "one sentence why this case is relevant to this report"
    }
  ]
}

Components ${startIdx}–${endIdx} to assess (in this order):
${numbered}

SCORING RULES:
- Score 0–20 → status must be "Critical Gap"
- Score 21–59 → status must be "Partial" or "Gap" (use "Gap" when the control is completely absent; "Partial" when it partially exists)
- Score 60–89 → status must be "Implemented"
- Score 90–100 → status must be "Mature"
- If the intake provides no information bearing on a control, set status to "Insufficient information" and omit the score (leave it as 0); do NOT label it "Gap".
The status MUST be consistent with the score. Never assign "Implemented" to a control scoring 90 or above.
- ABSENT-CONTROL BINDING: The score and status MUST be consistent with the finding text. If the finding states the control is absent, "not in the intake", "no dedicated/discrete control entry", or a "material gap", the score MUST fall in the 21–59 Gap band with status "Gap" — never 60 or above, and never "Implemented" or "Mature". If there is genuinely no information bearing on the control, use status "Insufficient information" and leave the score at 0. A finding that describes absence or a gap may not carry an "Implemented"/"Mature" status or a score ≥ 60.

SECTOR RULES — include the following additional context in findings and remediation where applicable to the detected industry sector (from intake industry_sector field):
- Financial Services / Fintech: note overlap with GLBA Safeguards Rule (FTC, 16 CFR Part 314) where relevant to the control. Controls for encryption, access control, vendor oversight, and incident response all have GLBA Safeguards Rule counterparts. Mention "GLBA Safeguards Rule alignment" where applicable.
- Insurance: note overlap with GLBA for insurance holding companies and NAIC Cybersecurity Model Law (MDL-668) equivalents where relevant.
- Energy / Utilities: note NERC CIP standards (CIP-002 through CIP-014) for any bulk-power system operator context; these directly overlap with network segmentation, access controls, configuration management, and incident response controls.
- Telecommunications: note CPNI rules (47 CFR Part 64) where access control and data-breach notification controls are assessed.
- Smart Home / IoT: note California IoT Security Law (Cal. Civ. Code §§ 1798.91.04–1798.91.06) requiring reasonable security features for connected devices; relevant to secure configuration, vulnerability management, and authentication controls.
- Healthcare / Life Sciences: note HIPAA Security Rule alignment where relevant (45 CFR Part 164). Mention "HIPAA Security Rule" in findings where applicable.
- Pharma / Clinical Research: note FDA 21 CFR Part 11 requirements for audit logging and access controls on systems handling electronic records.
- Children / EdTech: note COPPA security obligations where personal information of minors is involved.

GOVERNMENT/NONPROFIT APPLICABILITY — add a sentence to the finding for each control if the intake indicates the entity is a government agency or public-sector body: "Note: CPPA cybersecurity audit obligations under 11 CCR §§ 7120–7124 apply only to 'businesses' as defined in Cal. Civ. Code § 1798.140(ag). State and local government agencies are expressly excluded from the CCPA definition of 'business.' This readiness assessment assumes CPPA applicability; the entity should confirm its status as a covered business before relying on this report for CPPA compliance purposes." If the entity appears to be a nonprofit, add: "CPPA cybersecurity obligations apply only to entities meeting at least one of the three CCPA business thresholds (annual gross revenues >$25M; processing PI of 100,000+ consumers/households; or deriving 50%+ of revenue from selling/sharing PI). This readiness assessment assumes threshold applicability; the entity should verify its status."`;
    }

    function buildSynthesisPrompt(controlsDigest: string, computedScore: number): string {
      return `Based on this organisation's CPPA cybersecurity readiness intake and the per-control assessment digest below, produce the summary sections of the report. Do NOT emit controls or annotations.

Intake data:
${intakeJson}

Per-control digest (already assessed; do not re-score):
${controlsDigest}

System-computed overall_score (mean of the 18 control scores, rounded): ${computedScore}
Your executive_summary and readiness_level MUST be consistent with this overall_score.

NEXT-STEPS CONSISTENCY: every deadline in next_steps must restate a deadline already given in a control's remediation — never introduce a different timeframe for the same action. Refer to controls by NAME, never "component N" (component numbers are not rendered).

EXEC SUMMARY: use US English throughout (organization, program, defense, authorized). Reference "NIST CSF 2.0" not "NIST CSF". This is a readiness assessment, not the Article 9 audit — do not describe it as the cybersecurity audit itself. The executive_summary MUST explicitly name every control whose status is "Gap" or "Critical Gap" (or score < 50) as a priority remediation item, even when the overall_score sits in the Substantially Ready band — a satisfactory mean does not excuse silence on critical individual gaps.
CERTIFICATION DISTINCTION: The formal CPPA cybersecurity audit under § 7122 must be performed by a qualified, objective, independent professional who issues an audit report under § 7123(e). Separately, the business's executive submits the certification under § 7124. These are two different documents from two different parties. The audit report (§ 7123(e)(4)) may include identified gaps with remediation plans — this does not mean the executive certification excuses the gaps. Write "the independent auditor will document any gaps in the audit report; the business's executive then submits the certification under § 7124" — do not collapse these into one step.
ENFORCEMENT CONTEXT SOURCING: The enforcement_context must cite phase-in deadlines specifically to "11 CCR § 7121(a)" and must use "annual gross revenue" not just "revenue." Any sector-specific enforcement priority statement must be hedged as "this sector may attract scrutiny because [reason tied to data sensitivity or volume]" — do not make unqualified statements that CPPA "has signalled" specific enforcement priority without a citable source.
READINESS LABEL VALIDATION: The readiness_level must be exactly one of: "Audit-Ready" | "Substantially Ready" | "Material Gaps" | "Critical Gaps" | "Insufficient basis to assess". Never output "Ready" alone, "Partially Ready", or any other variant. "Substantially Ready" requires an overall_score of 70–89; "Audit-Ready" requires 90+; "Material Gaps" applies at 50–69; "Critical Gaps" applies below 50. Use "Insufficient basis to assess" only when the intake leaves a material share of controls unassessed (the system will recompute deterministically).


${enforcementBlock}Respond with ONLY this exact JSON structure:
{
  "executive_summary": "string (150-200 words — overall readiness posture and top 3 priorities)",
  "readiness_level": "Audit-Ready | Substantially Ready | Material Gaps | Critical Gaps | Insufficient basis to assess",
  "top_risks": [
    { "title": "string", "description": "string", "deadline": "string", "consequence": "string" }
  ],
  "enforcement_context": "string (2-3 sentences: (1) cite phase-in deadlines under 11 CCR § 7121(a): April 1, 2028 for businesses whose 2026 annual gross revenue exceeded $100 million; April 1, 2029 for $50–100 million; April 1, 2030 for under $50 million. (2) State one sector-relevant enforcement observation using hedged language — 'this sector may attract scrutiny because [specific reason]' — do not assert CPPA has made specific sector-priority announcements without a source. (3) Note that the audit must be performed by a qualified, independent professional and the executive then submits the certification.)",
  "next_steps": ["string"],
  "information_needed": [
    { "field": "<intake key that exists in the intake — for a per-control gap use that control's intake entry key, e.g. c14_third_party>", "dimensions": "<what specifically to add, as dimensions — never suggested values>", "provision": "<already-cited provision that makes these dimensions relevant>", "enables": "<which section/determination of this report completes with it>" }
  ]
}
Every insufficient-basis or "Insufficient information" finding elsewhere in this output (including any per-control status of "Insufficient information") MUST have a corresponding information_needed entry; otherwise return an empty array.`;

    }

    function tryParseJson(text: string, label: string): any | null {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) {
        console.error(JSON.stringify({
          event: "cppa_cyber_parse_failure",
          reason: "no_json_object_in_response",
          assessment_id,
          label,
          response_length: text.length,
          preview: text.slice(0, 300),
        }));
        return null;
      }
      try {
        return JSON.parse(m[0]);
      } catch (e) {
        console.error(JSON.stringify({
          event: "cppa_cyber_parse_failure",
          reason: "json_parse_error",
          assessment_id,
          label,
          error: String(e),
          tail: m[0].slice(-300),
        }));
        return null;
      }
    }

    async function callControlsHalf(startIdx: number, endIdx: number, extra: string): Promise<{ controls: any[]; annotations: any[] } | null> {
      const base = buildControlsPrompt(startIdx, endIdx);
      const user = extra ? `${base}\n\n${extra}` : base;
      const first = await callAnthropic(system, user, PRODUCT_MAX_OUTPUT_TOKENS);
      let parsed: any = null;
      if (first.stopReason === "max_tokens") {
        console.warn(`[CPPA Cyber] controls_${startIdx}_${endIdx} truncated_output — skipping parse, retrying at 1.5x`);
      } else {
        parsed = tryParseJson(first.text, `controls_${startIdx}_${endIdx}`);
      }
      if (!parsed || !Array.isArray(parsed.controls)) {
        // One retry — at 1.5x tokens when previous attempt truncated.
        const retryBudget = PRODUCT_MAX_OUTPUT_TOKENS;
        const retry = await callAnthropic(system, `${base}\n\nPREVIOUS ATTEMPT did not return valid JSON. Produce the JSON again, ensuring it is well-formed.`, retryBudget);
        if (retry.stopReason === "max_tokens") {
          console.error(`[CPPA Cyber] controls_${startIdx}_${endIdx} truncated_output after retry`);
          return null;
        }
        parsed = tryParseJson(retry.text, `controls_${startIdx}_${endIdx}_retry`);
      }
      if (!parsed || !Array.isArray(parsed.controls) || parsed.controls.length === 0) return null;
      return {
        controls: parsed.controls,
        annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
      };
    }

    async function callSynthesis(controlsDigest: string, computedScore: number, extra: string): Promise<any | null> {
      const base = buildSynthesisPrompt(controlsDigest, computedScore);
      const user = extra ? `${base}\n\n${extra}` : base;
      const first = await callAnthropic(system, user, PRODUCT_MAX_OUTPUT_TOKENS);
      let parsed: any = null;
      if (first.stopReason === "max_tokens") {
        console.warn("[CPPA Cyber] synthesis truncated_output — skipping parse, retrying at 1.5x");
      } else {
        parsed = tryParseJson(first.text, "synthesis");
      }
      if (!parsed) {
        const retryBudget = PRODUCT_MAX_OUTPUT_TOKENS;
        const retry = await callAnthropic(system, `${base}\n\nPREVIOUS ATTEMPT did not return valid JSON. Produce the JSON again, ensuring it is well-formed.`, retryBudget);
        if (retry.stopReason === "max_tokens") {
          console.error("[CPPA Cyber] synthesis truncated_output after retry");
          return null;
        }
        parsed = tryParseJson(retry.text, "synthesis_retry");
      }
      return parsed;
    }

    function buildDigest(controls: any[]): string {
      return controls.map((c, i) =>
        `${i + 1}. ${c?.control ?? ""} | score=${c?.score ?? 0} | status=${c?.status ?? ""} | priority=${c?.priority ?? ""} | finding=${String(c?.finding ?? "").slice(0, 240)}`
      ).join("\n");
    }

    function assembleControls(h1: any[], h2: any[]): any[] {
      return [...h1, ...h2];
    }

    function dedupeAnnotations(a: any[], b: any[]): any[] {
      const seen = new Set<string>();
      const out: any[] = [];
      for (const ann of [...a, ...b]) {
        const id = String(ann?.enforcement_action_id ?? "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(ann);
      }
      return out;
    }

    function validateControls(controls: any[]): { ok: boolean; missing: number[] } {
      if (!Array.isArray(controls) || controls.length !== 18) {
        // Determine which half is deficient
        const namesSeen = new Set(controls.map((c: any) => String(c?.control ?? "").trim().toLowerCase()));
        const missing: number[] = [];
        ALL_COMPONENTS.forEach((name, i) => {
          if (!namesSeen.has(name.toLowerCase())) missing.push(i + 1);
        });
        return { ok: false, missing };
      }
      const missing: number[] = [];
      const namesSeen = new Set(controls.map((c: any) => String(c?.control ?? "").trim().toLowerCase()));
      ALL_COMPONENTS.forEach((name, i) => {
        if (!namesSeen.has(name.toLowerCase())) missing.push(i + 1);
      });
      return { ok: missing.length === 0, missing };
    }

    function normaliseReport(r: any): void {
      const cleanSection = (x: any) => stripEnforcementTags(stripComponentCite(stripMd(x)));
      r.annotations = Array.isArray(r?.annotations) ? r.annotations : [];
      r.executive_summary = cleanSection(r.executive_summary);
      r.enforcement_context = stripMd(r.enforcement_context);
      r.controls = (Array.isArray(r.controls) ? r.controls : []).map((c: any) => ({
        ...c,
        finding: stripMd(c?.finding),
        regulatory_basis: stripMd(c?.regulatory_basis),
        remediation: stripMd(c?.remediation),
      }));
      r.top_risks = (Array.isArray(r.top_risks) ? r.top_risks : []).map((t: any) => ({
        ...t,
        title: stripMd(t?.title),
        description: cleanSection(t?.description),
        consequence: cleanSection(t?.consequence),
      }));
      r.next_steps = (Array.isArray(r.next_steps) ? r.next_steps : []).map((s: any) =>
        typeof s === "string" ? cleanSection(s) : s
      );
    }

    function assembleControlsNarrative(controls: any[]): string {
      const parts: string[] = [];
      for (const c of controls) {
        parts.push([c?.finding, c?.regulatory_basis, c?.remediation].filter(Boolean).join(" "));
      }
      return parts.join("\n\n");
    }

    function assembleSynthesisNarrative(r: any): string {
      const parts: string[] = [];
      if (r?.executive_summary) parts.push(String(r.executive_summary));
      if (r?.enforcement_context) parts.push(String(r.enforcement_context));
      for (const t of (r?.top_risks || [])) {
        parts.push([t?.title, t?.description, t?.consequence].filter(Boolean).join(" "));
      }
      for (const n of (r?.next_steps || [])) parts.push(String(n || ""));
      return parts.join("\n\n");
    }

    function assembleNarrative(r: any): string {
      return `${assembleSynthesisNarrative(r)}\n\n${assembleControlsNarrative(r?.controls || [])}`;
    }

    function computeOverallScore(controls: any[]): number {
      // Exclude controls flagged "Insufficient information" from the scored mean.
      const scores = controls
        .filter((c: any) => String(c?.status ?? "").trim().toLowerCase() !== "insufficient information")
        .map((c: any) => Number(c?.score))
        .filter((n) => Number.isFinite(n));
      if (scores.length === 0) return 0;
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      return Math.round(mean);
    }

    function readinessForScore(score: number): "Audit-Ready" | "Substantially Ready" | "Material Gaps" | "Critical Gaps" {
      if (score >= 90) return "Audit-Ready";
      if (score >= 70) return "Substantially Ready";
      if (score >= 50) return "Material Gaps";
      return "Critical Gaps";
    }

    function statusForScore(score: number): "Critical Gap" | "Partial" | "Implemented" | "Mature" {
      if (score >= 90) return "Mature";
      if (score >= 60) return "Implemented";
      if (score >= 21) return "Partial";
      return "Critical Gap";
    }

    function applyConsistencyFixes(rep: any): void {
      const controls: any[] = Array.isArray(rep?.controls) ? rep.controls : [];
      // FINDING-VS-SCORE GUARD: a finding that describes absence / no discrete
      // intake evidence must not carry a scored "Implemented"/"Mature" rating.
      // This catches the case where a non-satisfying adjacent entry (e.g. a
      // zero-trust entry mapped onto the segmentation control) was scored ≥60
      // despite the finding stating no discrete evidence exists. Force it to
      // "Insufficient information" / 0, consistent with the ABSENT-CONTROL and
      // ZERO-TRUST rules and with how genuinely-evidenced controls are treated.
      const ABSENCE_FINDING = /\b(no discrete|not separately identified|not separately distinguished|no dedicated|no discrete entry|does not (include|contain) a discrete|is not (separately )?identified|lacks? (a )?discrete|no (documented )?evidence (of|is provided)|merely inferred|only inferred|inferred from adjacent)\b/i;
      for (const c of controls) {
        const status = String(c?.status ?? "").trim();
        if (status.toLowerCase() === "insufficient information") continue;
        const score = Number(c?.score);
        if (!Number.isFinite(score)) continue;
        const finding = String(c?.finding ?? "");
        if (score >= 60 && ABSENCE_FINDING.test(finding)) {
          console.log(JSON.stringify({
            evt: "consistency_fix",
            fn: "run-cppa-cybersecurity",
            field: `controls[${c?.control ?? "?"}].finding_vs_score`,
            was: `${status}/${score}`,
            now: "Insufficient information/0",
          }));
          c.status = "Insufficient information";
          c.score = 0;
          continue;
        }
        const expected = statusForScore(score);
        // Allow "Gap" as an alias for "Critical Gap"/"Partial" only when it matches the band.
        const ok =
          status === expected ||
          (expected === "Partial" && status === "Gap") ||
          (expected === "Critical Gap" && status === "Gap");
        if (!ok) {
          console.log(JSON.stringify({
            evt: "consistency_fix",
            fn: "run-cppa-cybersecurity",
            field: `controls[${c?.control ?? "?"}].status`,
            was: status,
            now: expected,
            score,
          }));
          c.status = expected;
        }
      }
      const computed = computeOverallScore(controls);
      if (Number(rep?.overall_score) !== computed) {
        console.log(JSON.stringify({
          evt: "consistency_fix",
          fn: "run-cppa-cybersecurity",
          field: "overall_score",
          was: rep?.overall_score,
          now: computed,
        }));
        rep.overall_score = computed;
        // Sync any numeric score mentions in the executive summary to the computed score.
        if (typeof rep?.executive_summary === "string") {
          const fixed = rep.executive_summary
            .replace(/\b\d{1,3}\s*(?:\/|out of)\s*100\b/g, `${computed} out of 100`)
            .replace(/\b(readiness|overall)\s+score\s+of\s+\d{1,3}\b/gi, (m: string) => m.replace(/\d{1,3}$/, String(computed)));
          if (fixed !== rep.executive_summary) {
            console.log(JSON.stringify({ evt: "consistency_fix", fn: "run-cppa-cybersecurity", field: "executive_summary_score_mention", now: computed }));
            rep.executive_summary = fixed;
          }
        }
      }
      const insufficientCount = controls.filter((c: any) =>
        String(c?.status ?? "").trim().toLowerCase() === "insufficient information"
      ).length;
      rep.control_status_counts = {
        implemented: controls.filter((c: any) => /^implemented$/i.test(String(c?.status ?? "").trim())).length,
        partially_implemented: controls.filter((c: any) => /^partially/i.test(String(c?.status ?? "").trim())).length,
        not_implemented: controls.filter((c: any) => /^not implemented$/i.test(String(c?.status ?? "").trim())).length,
        insufficient_information: insufficientCount,
      };
      const INSUFFICIENT_THRESHOLD = 6;
      const expectedLevel = insufficientCount >= INSUFFICIENT_THRESHOLD
        ? "Insufficient basis to assess"
        : readinessForScore(computed);
      if (rep?.readiness_level !== expectedLevel) {
        console.log(JSON.stringify({
          evt: "consistency_fix",
          fn: "run-cppa-cybersecurity",
          field: "readiness_level",
          was: rep?.readiness_level,
          now: expectedLevel,
          insufficient_count: insufficientCount,
        }));
        rep.readiness_level = expectedLevel;
      }
      if (insufficientCount >= INSUFFICIENT_THRESHOLD) {
        const note = `Note: ${insufficientCount} of 18 controls could not be assessed because the intake did not provide enough information. The overall readiness level is set to "Insufficient basis to assess"; complete the intake for the unassessed controls to obtain a computed band.`;
        const existing = String(rep?.executive_summary ?? "").trim();
        if (existing && !existing.toLowerCase().includes("insufficient basis")) {
          rep.executive_summary = `${existing} ${note}`;
        } else if (!existing) {
          rep.executive_summary = note;
        }
      }
      // Transparency: state the score basis (mean excludes "Insufficient information").
      const _assessed = controls.filter(
        (c: any) => String(c?.status ?? "").trim().toLowerCase() !== "insufficient information",
      );
      const _excluded = controls.length - _assessed.length;
      rep.methodology_note =
        `Overall score is the mean of the ${_assessed.length} assessed control${_assessed.length === 1 ? "" : "s"}, rounded.` +
        (_excluded > 0
          ? ` ${_excluded} control${_excluded === 1 ? "" : "s"} with status "Insufficient information" (no intake data bearing on the control) ${_excluded === 1 ? "was" : "were"} excluded from the mean; the listed remediation reflects the need to supply that information.`
          : "");
    }


    // ── Run two parallel controls halves ─────────────────────────────────
    let [half1, half2] = await Promise.all([
      callControlsHalf(1, 9, ""),
      callControlsHalf(10, 18, ""),
    ]);

    if (!half1 || !half2) {
      await supabase
        .from("cppa_assessments")
        .update({ status: "error" })
        .eq("id", assessment_id);
      return;
    }

    // Validate completeness; retry only deficient half once.
    {
      const assembled = assembleControls(half1.controls, half2.controls);
      const v = validateControls(assembled);
      if (!v.ok) {
        const missing1 = v.missing.filter((n) => n >= 1 && n <= 9);
        const missing2 = v.missing.filter((n) => n >= 10 && n <= 18);
        const retries: Promise<any>[] = [];
        if (missing1.length) retries.push(callControlsHalf(1, 9, "PREVIOUS ATTEMPT was incomplete or out of order — emit exactly the 9 listed components, in order.").then((r) => { if (r) half1 = r; }));
        if (missing2.length) retries.push(callControlsHalf(10, 18, "PREVIOUS ATTEMPT was incomplete or out of order — emit exactly the 9 listed components, in order.").then((r) => { if (r) half2 = r; }));
        await Promise.all(retries);
        const reAssembled = assembleControls(half1!.controls, half2!.controls);
        const v2 = validateControls(reAssembled);
        if (!v2.ok) {
          console.error(`[CPPA Cyber] controls incomplete after retry: missing=${JSON.stringify(v2.missing)}`);
          await supabase
            .from("cppa_assessments")
            .update({ status: "error" })
            .eq("id", assessment_id);
          return;
        }
      }
    }

    let allControls = assembleControls(half1!.controls, half2!.controls);
    const overall_score = computeOverallScore(allControls);
    const digest = buildDigest(allControls);

    const synthesis = await callSynthesis(digest, overall_score, "");
    if (!synthesis || typeof synthesis !== "object") {
      await supabase
        .from("cppa_assessments")
        .update({ status: "error" })
        .eq("id", assessment_id);
      return;
    }

    let report: any = {
      executive_summary: synthesis.executive_summary,
      overall_score,
      readiness_level: synthesis.readiness_level,
      controls: allControls,
      top_risks: Array.isArray(synthesis.top_risks) ? synthesis.top_risks : [],
      enforcement_context: synthesis.enforcement_context,
      next_steps: Array.isArray(synthesis.next_steps) ? synthesis.next_steps : [],
      annotations: dedupeAnnotations(half1!.annotations, half2!.annotations),
    };

    normaliseReport(report);

    // Output lint: surgical retry — re-run only the call(s) whose text violates.
    const lintViolations: any[] = [];
    {
      const lintHalf1 = lintReportText(assembleControlsNarrative(half1!.controls));
      const lintHalf2 = lintReportText(assembleControlsNarrative(half2!.controls));
      const lintSynth = lintReportText(assembleSynthesisNarrative(report));

      const half1Bad = hasHardViolations(lintHalf1);
      const half2Bad = hasHardViolations(lintHalf2);
      const synthBad = hasHardViolations(lintSynth);

      if (half1Bad || half2Bad || synthBad) {
        try {
          const retries: Promise<void>[] = [];
          if (half1Bad) {
            const details = lintHalf1.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
            retries.push(callControlsHalf(1, 9, `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`).then((r) => { if (r) half1 = r; }));
          }
          if (half2Bad) {
            const details = lintHalf2.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
            retries.push(callControlsHalf(10, 18, `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`).then((r) => { if (r) half2 = r; }));
          }
          if (synthBad) {
            const details = lintSynth.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
            // Re-run synthesis with retry instruction; use current digest/score (controls may be replaced below).
            retries.push((async () => {
              const r = await callSynthesis(digest, overall_score, `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`);
              if (r) {
                report.executive_summary = r.executive_summary;
                report.readiness_level = r.readiness_level;
                report.top_risks = Array.isArray(r.top_risks) ? r.top_risks : report.top_risks;
                report.enforcement_context = r.enforcement_context;
                report.next_steps = Array.isArray(r.next_steps) ? r.next_steps : report.next_steps;
              }
            })());
          }
          await Promise.all(retries);

          // If a controls half was re-rolled, recompute controls/score and (if score moved) re-run synthesis once.
          if (half1Bad || half2Bad) {
            allControls = assembleControls(half1!.controls, half2!.controls);
            const newScore = computeOverallScore(allControls);
            report.controls = allControls;
            (report as any).overall_score = newScore;
            report.annotations = dedupeAnnotations(half1!.annotations, half2!.annotations);
          }

          normaliseReport(report);
          const finalLint = lintReportText(assembleNarrative(report));
          for (const v of finalLint.violations) lintViolations.push(v);
        } catch (e) {
          console.warn("[CPPA Cyber] lint retry failed (non-fatal):", e);
          const finalLint = lintReportText(assembleNarrative(report));
          for (const v of finalLint.violations) lintViolations.push(v);
        }
      } else {
        for (const v of lintHalf1.violations) lintViolations.push(v);
        for (const v of lintHalf2.violations) lintViolations.push(v);
        for (const v of lintSynth.violations) lintViolations.push(v);
      }
    }

    // Deterministic consistency check: align status↔score, recompute overall_score,
    // and align readiness_level to the score band.
    applyConsistencyFixes(report);




    // Obligation snapshot: freeze the cybersecurity audit corpus (§§ 7120–7124)
    // used to evaluate the 18 controls, so the report stays reproducible if any
    // section is later superseded. Pull current rows once at completion.
    const CYBER_CITATIONS = [
      "11 CCR § 7120",
      "11 CCR § 7121",
      "11 CCR § 7122",
      "11 CCR § 7123",
      "11 CCR § 7124",
    ];
    const { data: authRows } = await supabase
      .from("cppa_authorities")
      .select("id, citation, version, authority_type, authority_weight, effective_date, official_url, title, status")
      .in("citation", CYBER_CITATIONS)
      .eq("status", "current");
    const { data: fsorRows } = await supabase
      .from("cppa_fsor_commentary")
      .select("id, regulation_citation, page_ref, fsor_package, comment_summary, agency_response, source_url")
      .in("regulation_citation", CYBER_CITATIONS);

    // Per-control "What the agency said" attachment.
    const fsorByCitation = new Map<string, any[]>();
    for (const row of fsorRows ?? []) {
      const key = row.regulation_citation;
      if (!fsorByCitation.has(key)) fsorByCitation.set(key, []);
      fsorByCitation.get(key)!.push(row);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PKG_PRIORITY: Record<string, number> = {
      "ccpa-2025-cyber-risk-admt": 0,
      "dbr-2024-registration": 1,
      "ccpa-2023-original": 2,
    };

    async function semanticFsorForControl(controlName: string, gapContext: string, citationFilter: string): Promise<any[]> {
      if (!LOVABLE_API_KEY) return [];
      try {
        const queryText =
          `California CPPA cybersecurity control: ${controlName}. ` +
          `Gap/finding context: ${gapContext}`;
        const er = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/text-embedding-3-small",
            input: queryText.slice(0, 6000),
            dimensions: 1536,
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!er.ok) {
          console.warn(`[cppa-cyber fsor-semantic] embedding HTTP ${er.status}`);
          return [];
        }
        const ed = await er.json();
        const embedding = ed?.data?.[0]?.embedding;
        if (!Array.isArray(embedding)) return [];
        const { data, error } = await supabase.rpc("match_cppa_fsor_commentary", {
          query_embedding: embedding,
          citation_filter: null,
          topic_filter: null,
          match_count: 10,
        });
        if (error) {
          console.warn(`[cppa-cyber fsor-semantic] rpc error: ${error.message}`);
          return [];
        }
        const rowsArr = (Array.isArray(data) ? data : []).filter((r: any) => {
          const cite = String(r?.regulation_citation ?? "").trim();
          // Keep bare-section commentary (applies to all controls) and commentary
          // matching this control's own subsection; drop commentary tied to a
          // DIFFERENT subsection letter (e.g. (d) attached to a (c)(N) control).
          if (/^11 CCR § 712[0-4]$/.test(cite)) return true;
          return cite === citationFilter;
        });
        const indexed = rowsArr.map((r: any, i: number) => ({ r, i }));
        indexed.sort((a, b) => {
          const pa = PKG_PRIORITY[a.r?.fsor_package] ?? 99;
          const pb = PKG_PRIORITY[b.r?.fsor_package] ?? 99;
          if (pa !== pb) return pa - pb;
          return a.i - b.i;
        });
        return indexed.map((x) => x.r);
      } catch (e) {
        console.warn(`[cppa-cyber fsor-semantic] threw: ${e}`);
        return [];
      }
    }

    function shapeFsorItem(r: any): any {
      return {
        ...r,
        agency_response: r?.agency_response ?? null,
        agency_response_verbatim: true,
        comment_summary: r?.comment_summary ?? null,
        comment_summary_verbatim: false,
        citation: r?.regulation_citation ?? r?.citation ?? null,
        package: r?.fsor_package ?? null,
      };
    }

    const controlsOut: any[] = [];
    for (let idx = 0; idx < report.controls.length; idx++) {
      const c = report.controls[idx];
      const citation = COMPONENT_CITATIONS[c?.control ?? ""] ?? "11 CCR § 7123(c)";
      const exact = (fsorByCitation.get("11 CCR § 7123") ?? []).slice();
      const exactIds = new Set(exact.map((r: any) => r?.id).filter(Boolean));

      const gapContext = [c?.finding, c?.remediation, c?.regulatory_basis]
        .filter(Boolean).join(" ").slice(0, 1500);
      const semantic = await semanticFsorForControl(c?.control ?? "", gapContext, citation);

      let merged = exact.slice();
      if (exact.length === 0) {
        merged = semantic.slice(0, 5);
      } else {
        const extras: any[] = [];
        for (const r of semantic) {
          if (extras.length >= 2) break;
          if (r?.id && exactIds.has(r.id)) continue;
          extras.push(r);
          if (r?.id) exactIds.add(r.id);
        }
        merged = [...exact, ...extras];
      }

      // R2: Strip any model-hallucinated section citation prefix from
      // regulatory_basis, then prepend the verified CPPA citation deterministically.
      const cleanedRegBasis = (() => {
        let s = stripMd(c?.regulatory_basis ?? "")
          .replace(/^\(?\s*(?:11\s*CCR\s+)?§?\s*\d+[^—–\-]*?\)?\s*[—–\-]?\s*/i, "")
          // Remove mandate-opener phrases so the prepended frame reads grammatically
          .replace(/^(?:Businesses?\s+must\s+(?:implement|maintain|establish|ensure|provide|limit|document|collect|develop|oversee|conduct)\s+)/i, "")
          .replace(/^(?:The\s+(?:programme|program|business)\s+must\s+include\s+)/i, "")
          .replace(/^(?:Maintaining\s+and\s+)/i, "Maintaining ")
          // Strip "and document" or "and maintain" openers that create "must assess and document and document..."
          .replace(/^and\s+(?:document|maintain|manage|implement|establish|ensure|provide|limit)\s+/i, "")
          .replace(/^document\s+and\s+(?:document|maintain)\s+/i, "")
          // Strip "The {noun} must {verb} " openers (capital-letter mandate phrases)
          .replace(/^The\s+(?:organisation|organization|business|controller|entity|company|programme|program)\s+must\s+\w+\s+/i, "")
          // Strip "An organisation must …", "A business must …"
          .replace(/^An?\s+(?:organisation|organization|business|controller|entity|company)\s+must\s+\w+\s+/i, "")
          // Strip "Organisations must …", "Businesses must …"
          .replace(/^(?:Organisations|Organizations|Businesses|Controllers|Entities|Companies)\s+must\s+\w+\s+/i, "")
          .trim();
        // Lowercase the leading capital so it reads as a continuation of the frame
        if (s && /^[A-Z][a-z]/.test(s)) {
          s = s.charAt(0).toLowerCase() + s.slice(1);
        }
        return s;
      })();

      // Citation hygiene: REMOVE any "11 CCR § 7123(c)(N)" component-subsection
      // reference from narrative prose. The model both (a) increments the control's
      // own subsection by 1 and (b) writes cross-references to OTHER components; a
      // rewrite-to-own-subsection approach corrupts the latter (e.g. an incident-
      // response cross-reference (c)(17) wrongly rewritten to (c)(8)). Prose refers
      // to components by name; the authoritative per-control subsection is carried
      // deterministically in regulatory_basis and fsor_citation below. Procedural
      // cites (§§ 7120–7124, § 7122, § 7123(e), § 7124) are preserved.
      // Slug hygiene: strip raw intake control slugs (c14_third_party, c16_training…).
      const stripSlugs = (s: string | undefined | null): string => {
        if (!s) return s ?? "";
        return s
          .replace(/\bmapped to c\d{1,2}_[a-z_]+\b/gi, "")
          .replace(/\bc\d{1,2}_[a-z_]+\b/g, "")
          .replace(/[ \t]{2,}/g, " ")
          .replace(/\s+([.,;:)])/g, "$1");
      };
      const scrub = (s: string | undefined | null) => stripEnforcementTags(stripSlugs(stripComponentCite(s)));

      controlsOut.push({
        ...c,
        finding: scrub(c?.finding),
        remediation: scrub(c?.remediation),
        regulatory_basis: `Assessed under ${citation}: the annual cybersecurity audit must assess ${cleanedRegBasis}, as applicable to the business.`,
        fsor_citation: citation,
        fsor_commentary: merged
          .filter((r: any) => {
            // Drop bare section-level § 7122 / § 7123 commentary — it is attached
            // once at document level in fsor_section_commentary; repeating it on
            // every control produces 18× duplication of the same agency text.
            const cite = String(r?.regulation_citation ?? r?.citation ?? "").trim();
            return !/^11 CCR § 712[23]$/.test(cite);
          })
          .slice(0, 2)
          .map(shapeFsorItem),
      });

    }
    report.controls = controlsOut;

    // Section-level FSOR commentary attached once at report level (not per
    // control) to avoid 18x duplication of the same agency text.
    (report as any).fsor_section_commentary = {
      "11 CCR § 7122": (fsorByCitation.get("11 CCR § 7122") ?? []).map(shapeFsorItem),
      "11 CCR § 7123": (fsorByCitation.get("11 CCR § 7123") ?? []).map(shapeFsorItem),
    };

    const obligation_snapshot = {
      captured_at: new Date().toISOString(),
      module: "cybersecurity",
      authorities: authRows ?? [],
      fsor: fsorRows ?? [],
      retrieval_meta: {
        authority_count: (authRows ?? []).length,
        fsor_count: (fsorRows ?? []).length,
      },
    };

    // CF-1 (4): Single-source precedent/annotation parity.
    const retrievedById = new Map<string, any>();
    for (const r of (enforcementResults as any[])) {
      if (r?.id) retrievedById.set(String(r.id), r);
    }
    const rawAnnotations: any[] = Array.isArray((report as any).annotations) ? (report as any).annotations : [];
    const validatedAnnotations: any[] = [];
    const orphans: any[] = [];
    const seenIds = new Set<string>();
    for (const a of rawAnnotations) {
      const aid = String(a?.enforcement_action_id ?? "");
      if (aid && retrievedById.has(aid) && !seenIds.has(aid)) {
        validatedAnnotations.push(a);
        seenIds.add(aid);
      } else {
        orphans.push({ id: aid || null, reason: aid ? "id_not_in_retrieved" : "missing_id" });
      }
    }
    if (orphans.length > 0) {
      console.warn("[CPPA Cyber] dropped orphan annotations:", JSON.stringify(orphans));
    }
    const validatedIdSet = new Set(validatedAnnotations.map((a) => String(a.enforcement_action_id)));
    const rebuiltPrecedents = (enforcementResults as any[]).filter((r: any) => validatedIdSet.has(String(r?.id)));

    (report as any).annotations = validatedAnnotations;
    (report as any).enforcement_precedents = rebuiltPrecedents;

    if (validatedAnnotations.length !== rebuiltPrecedents.length) {
      console.error(
        `[CPPA Cyber] precedent/annotation parity mismatch after rebuild: ` +
        `annotations=${validatedAnnotations.length} precedents=${rebuiltPrecedents.length}`,
      );
      const precedentIds = new Set(rebuiltPrecedents.map((r: any) => String(r?.id)));
      (report as any).annotations = validatedAnnotations.filter((a: any) =>
        precedentIds.has(String(a.enforcement_action_id))
      );
    }

    (report as any).enforcement_meta = enforcementMeta;
    (report as any).lint_warnings = [
      ...(Array.isArray((report as any).lint_warnings) ? (report as any).lint_warnings : []),
      ...lintViolations,
    ];


    // Stage 5: forward-path guard (strip invented information_needed fields; log dead-ends).
    const guarded = guardInformationNeeded(report, ((row as any).intake_data as Record<string, unknown>) ?? {});
    report = guarded.report;

    // Stage 1: metering + version retention (written BEFORE status:complete).
    await recordRunMeterAndVersion(supabase, {
      toolType: "cppa_cybersecurity",
      assessmentId: assessment_id,
      userId: (row as any).user_id ?? null,
      intake: ((row as any).intake_data as Record<string, unknown>) ?? {},
      reportData: report,
    });


    await supabase
      .from("cppa_assessments")
      .update({ status: "complete", report_data: report, obligation_snapshot })
      .eq("id", assessment_id);


    // C4 RoPA accumulator: cybersecurity controls map to a Security activity
    if ((row as any).client_id) {
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: (row as any).client_id,
          source_tool: "cppa_cybersecurity",
          source_assessment_id: assessment_id,
          display_name: "Cybersecurity & threat monitoring",
          source_summary: "Drafted from CPPA Cybersecurity Audit — review control gaps and link safeguards.",
          is_high_risk: false,
          category: "technology",
        },
      }).catch((e: Error) => console.error("[cppa-cyber] accumulate-ropa failed (non-fatal):", e.message));
    }


  } catch (e) {
    console.error("[CPPA Cyber] runAssessment error:", e);
    await supabase
      .from("cppa_assessments")
      .update({ status: "error" })
      .eq("id", assessment_id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { assessment_id } = await req.json();
    if (!assessment_id) {
      return new Response(JSON.stringify({ error: "assessment_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fnRun = await startFunctionRun(supabase, "run-cppa-cybersecurity", {
      archetype: "background",
      trustClass: "user",
      invokedBy: "user",
      metadata: { assessment_id },
    });
    // @ts-ignore — EdgeRuntime is provided by the Supabase edge runtime
    EdgeRuntime.waitUntil((async () => {
      try {
        await runAssessment(assessment_id);
        await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "cppa_assessments", sourceRowId: assessment_id });
      } catch (e) {
        await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id } });
      }
    })());


    return new Response(JSON.stringify({ accepted: true, assessment_id }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-cppa-cybersecurity dispatch error:", e);
    return new Response(JSON.stringify({ error: "Assessment dispatch failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
