// qb8 build active
import { attachDeterministicChecks, extractProseFromReport } from '../_shared/advisory-voice.ts';
import { runFormatChecksGeneric } from '../_shared/grader/format-checks.ts';
import { extractIntakeRoster } from '../_shared/grader/intake-roster.ts';
import { runCppaHf1Checks } from '../_shared/grader/cppa-hf1-checks.ts';
// build-marker: cyber-qi3-observations-not-directives-2026-07-03
console.log("[build-marker] run-cppa-cybersecurity qi3-observations-not-directives-2026-07-03");
// RC-C3.CYB-2 — BUILD_STAMP added; git short-sha + ISO. Bumped on every
// behavior edit. External-verification gate: clone HEAD sha == BUILD_STAMP
// sha observed in the first post-deploy telemetry row carrying it.
export const BUILD_STAMP = "w12-cyber-turne@2026-07-24T17:32:35Z";
import { generatorScoringRulesText } from "../_shared/cppa-cyber-bands.ts";
import { applyW6CyberFix, W6_CYBER_FIX_VERSION } from "./_w6_cyber_fix.ts";
import { attachAndValidateCyberSlots, W9_CYBER_SLOTS_STAMP } from "./_w9_cyber_slots.ts";
import { attachCyberAggregates, W10_CYBER_AGG_STAMP } from "./_w10_cyber_aggregates.ts";
import { applyW12CyberE1, W12_CYBER_E1_STAMP } from "./_w12_cyber_e1.ts";

function boundedErr(e: unknown, max = 2000): string {
  const s = e instanceof Error ? `${e.name}: ${e.message}` : (typeof e === "string" ? e : (() => { try { return JSON.stringify(e); } catch { return String(e); } })());
  return s.slice(0, max);
}
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { stripEnforcementTags } from "../_shared/enforcement-id-hygiene.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type SystemBlock, type ToolModule, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { buildFsorAnchorBlock, CYBER_ZERO_TRUST_FSOR_ANCHOR_SPECS } from "../_shared/fsor-anchor-block.ts";
import { buildCppaDeadlineBlock, verifyCppaDeadlineDrift } from "../_shared/cppa-deadline-registry.ts";
import { verifyIcoFiguresDrift } from "../_shared/enforcement-figures-registry.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { freezeOpenItemsOnFirstRun } from "../_shared/open-items.ts";
import { handleRevisionMode } from "../_shared/revision-mode.ts"; // RC-B.1
import { renderSupplementalBlock } from "../_shared/supplemental-block.ts";
import { observeCitations } from "../_shared/citation-observe.ts";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";


export const CPPA_CYBER_TOOL_MODULE: ToolModule = {
  identity:
    "You are a cybersecurity readiness analyst specializing in California's CPPA cybersecurity audit regulations (11 CCR §§ 7120–7124), approved by OAL in September 2025 and effective January 1, 2026. You map an organization's controls against the 18 enumerated cybersecurity program components under 11 CCR § 7123(c) and produce a structured readiness assessment.",
  citationFramework:
    "Per-control citations are supplied deterministically from the CONTROL_CITATIONS map (11 CCR § 7123(c)(1)–(18)); never invent, alter, or reorder a control citation. Cite procedural provisions only as 11 CCR §§ 7120–7124. Never describe the regulations as proposed.",
  outputMode: "strict-JSON",
  includeEuTransfers: false,
  extraRules: [
    "C2-2 FSOR ANCHOR ECHO BAN: The AGENCY POSITIONS — FSOR ANCHORS block that may appear in the injected system context (see the zero-trust deletion note beneath 11 CCR § 7123) is DRAFTING CONTEXT ONLY. NEVER echo the bracketed \"[Agency position — FSOR: <citation>, <package>, <page_ref>]: …\" format into ANY user-facing field (executive_summary, per-control findings, remediation, next_steps, enforcement_context). Weave the Agency's position into the analysis in plain professional prose, citing the FSOR in prose form — e.g., \"Per the CPPA's Final Statement of Reasons (Appendix, p. 25), the Agency declined to mandate zero-trust architecture as a component of § 7123, leaving zero-trust as a permissible but not required implementation choice.\" The bracketed context markers are internal drafting scaffolding; echoing them verbatim into the report is treated as an internal-reasoning leak.",
    "W3-T5 (c) — GLBA CONDITIONAL APPEARS AT MOST ONCE: any conditional reference to the Gramm-Leach-Bliley Act ('if the business is a GLBA-covered financial institution', 'where GLBA applies', etc.) appears in AT MOST ONE section of the report — the applicability section that scopes cross-statute obligations. Never restate the same GLBA-conditional caveat in executive_summary, per-control finding, remediation, next_steps, and enforcement_context. Once stated in scope, downstream sections either treat GLBA as engaged (with the intake evidence for that determination) or omit the reference entirely. R-TURN-2 REINFORCEMENT: the applicability/scope section is the SINGLE authoritative site for the GLBA scoping conditional — sector-overlay lines in per-control findings/remediation may mention 'GLBA Safeguards Rule alignment' as a factual crosswalk only when the applicability section has already established (or conditionally scoped) GLBA engagement; the sector-overlay crosswalk MUST NOT restate the conditional itself ('if the business is a GLBA-covered financial institution…') — that conditional lives only in the scope section.",
    "R-TURN-2 § 7122(g) SCOPE NOTE — AUDIT-SUPPORT RECORD RETENTION, NOT OPERATIONAL CONTROLS: 11 CCR § 7122(g) governs the FIVE-YEAR RETENTION of records and information supporting the cybersecurity audit — it is a records-retention duty attached to audit evidence, NOT an operational-control obligation. Cite § 7122(g) ONLY when the sentence concerns audit-support record retention (retaining maturity attestations, control evidence, test results, remediation logs for auditor inspection). Do NOT cite § 7122(g) as the anchor for the operational control itself (e.g. never write 'implement encryption per § 7122(g)' or 'access controls under § 7122(g)') — the operational-control anchor is the specific § 7123(c)(N) component citation. Canonical form: '[operational control obligation under § 7123(c)(N)]; retain the supporting documentation per the § 7122(g) five-year audit-record retention rule.'",
    "R-TURN-2 DERIVED-SUMS RULE — SHOW OPERANDS, CLAIM ONLY DESCRIBED COVERAGE: any aggregate sum, count, mean, or percentage stated in the report (executive_summary aggregate counts, mean/average scores, N-of-M coverage statements, gap counts) MUST show its operands — the sentence names the specific controls or the count of controls being aggregated (e.g. 'the mean of NN across the M scored components (excluding K Insufficient-information controls)' — see the PF6 T2 mean-score rule; 'N Gap findings across [control names]'; 'K of the 18 § 7123(c) components are assessed as Implemented on this record'). NEVER state an aggregate that implies coverage beyond what the controls[] array actually describes: if only 12 of 18 components have status ∈ {Critical Gap, Gap, Partial, Implemented, Mature} and 6 are Insufficient-information, the report MUST NOT state or imply 'audit-ready across the 18 components' or '18/18 assessed' — the aggregate names the 12 assessed and the 6 unassessed separately.",
    "CPPA-HF3 E — ADVISORY CLOSE NAMED-FACT SPECIFICITY (SUPPLEMENTS advisory-voice rule E5): every advisory close ('further clarification is advisable', 'further internal investigation is advisable', 'should be confirmed', 'warrants further review', 'further investigation is advisable') NAMES the specific fact, field, document, control, or determination whose confirmation is being requested. Bare closes ('should be confirmed' / 'further internal investigation is advisable' with no named object) are non-compliant. Correct form: 'the [named control or evidence artefact] should be confirmed to determine whether [named readiness element under § 7123(c)(N)]'.",
    "CPPA-HF3 B1 — FABRICATED PROFESSIONAL ATTRIBUTION BAN: NEVER assert that legal counsel, outside counsel, in-house counsel, a privacy officer, a DPO, a compliance officer, an auditor, an engineer, or any other named or generic professional has reviewed, flagged, advised, opined on, escalated, cleared, or approved any element of the record unless that fact appears as a value in the intake fields. Correct form: state the gap or determination directly, tied to the record and the provision.",
    "CPPA-HF3 B2 — INTERNAL-NOTE / ANNOTATION BLOCK BAN: never emit bracketed internal-annotation blocks ('[INTERNAL NOTE: …]', '[NOTE TO REVIEWER: …]', '[TODO: …]', '[FOR INTERNAL USE: …]', etc.) in user-rendered output. Substantive content that would otherwise sit inside such a block is rendered as normal advisory prose in the appropriate field.",
    "PROSE CITATION HYGIENE: In finding, remediation, top_risks, next_steps, and executive_summary, refer to each cybersecurity component by its NAME only. NEVER write a component subsection number — no \"11 CCR § 7123(c)(N)\", \"§ 7123(c)(N)\", or \"(c)(N)\" — in any of these prose fields; the correct per-control citation is supplied by the system in the fsor_citation and regulatory_basis fields. In prose you may cite only the procedural range 11 CCR §§ 7120–7124 (e.g. § 7122, § 7123(e), § 7124) where unavoidable. Writing a § 7123(c)(N) subsection in prose is a defect.",
    "PHASE-IN: first audit certifications are due April 1, 2028 (>$100M 2026 gross revenue), April 1, 2029 ($50–100M), April 1, 2030 (<$50M), under 11 CCR § 7121(a). Never present a readiness deadline earlier than the business's applicable phase-in date (a prospective obligation).",
    "FRAMEWORK (W6-CYBER-FIX 2026-07-24): the intake-elected primary framework GOVERNS all remediation and control mappings — whichever framework the intake supplies (SOC 2, ISO 27001, NIST CSF 2.0, CIS Controls, HITRUST CSF, PCI DSS, HIPAA Security Rule, or any other framework named in the intake). NIST CSF 2.0 may appear ONLY as an explicitly OPTIONAL crosswalk when it is not the elected framework — never as \"required,\" \"mandated,\" or \"as required under 11 CCR § 7123(e)\" (§ 7123(e) does not incorporate NIST CSF; it describes the audit report's documentation of gaps and remediation). Correct optional-crosswalk form: \"which crosswalks to the [Detect] function of NIST CSF 2.0 as an optional reference; the intake-elected [HITRUST] framework governs.\" Default to NIST CSF 2.0 framing ONLY when the intake supplies no primary framework at all. Under § 7123(f) a business may leverage an existing aligned audit only if all Article 9 requirements are met independently or by supplementation — test each element.",
    "NIST CSF 2.0 CITATION LEVEL: In remediation and all prose, cite NIST CSF 2.0 at the FUNCTION level by name (Govern, Identify, Protect, Detect, Respond, Recover) and, where useful, name the relevant category in plain words (e.g. \"the Protect function's technology-infrastructure-resilience controls\"). Do NOT emit specific alphanumeric subcategory identifiers (e.g. \"PR.IR-01\", \"PR.AA-05\", \"PR.AT-02\", \"PR.DS-6\") — model-recalled subcategory codes are frequently mis-assigned, and a wrong code is a citation defect. Use a subcategory code ONLY if it is explicitly supplied in the intake's chosen framework mapping.",
    "SECTOR OVERLAYS (note where relevant): GLBA Safeguards Rule (16 CFR Part 314) for financial services; NERC CIP (CIP-002–CIP-014) for bulk-power operators; CPNI (47 CFR Part 64) for telecom; California IoT Security Law (Cal. Civ. Code §§ 1798.91.04–.06) for connected devices; FDA 21 CFR Part 11 for clinical-records systems.",
    "APPLICABILITY: CPPA cybersecurity audit obligations apply only to 'businesses' (Cal. Civ. Code § 1798.140(ag)); state/local government agencies are excluded, and nonprofits/others must meet a CCPA business threshold. Where the intake indicates a government or nonprofit entity, add the applicability caveat and instruct the entity to confirm covered-business status before relying on the report.",
    "AUDIT vs CERTIFICATION: the independent auditor documents any gaps with remediation in the audit report under § 7123(e); the business's executive then submits the certification under § 7124. Keep these two documents/parties distinct — never collapse them into one step, and the audit's gap list does not excuse the executive certification.",
    "READINESS LABEL is exactly one of: Audit-Ready (90+) | Substantially Ready (70–89) | Material Gaps (50–69) | Critical Gaps (<50) | Insufficient basis to assess. It is THIS tool's readiness assessment, not a CPPA regulatory determination. Use \"Insufficient basis to assess\" when the intake leaves a material share of controls unassessed (see STATUS↔SCORE).",
    "STATUS↔SCORE: a control's status must match its score band — Critical Gap (0–20); Partial or Gap (21–59; use Gap when the control is absent per the intake, Partial when it partially exists); Implemented (60–89); Mature (90–100). Where the intake provides no information on a control, set its status to \"Insufficient information\" and do NOT score it (leave the score at 0); do NOT label it \"Gap\". This MUST agree exactly with the per-control STATUS↔SCORE rubric in the component prompt — there is only one band scheme.",
    "CITATION CONSISTENCY (HARD RULE): When you mention a § 7123(c)(N) subsection in finding/remediation prose for a control, the subsection number MUST be exactly the same N as that control's own citation. Do NOT increment, decrement, or reorder. If unsure, refer to the provision generically as 'this control' or 'the cited component' rather than guessing a subsection number — the system injects the authoritative section deterministically.",
    "PRODUCT-FIX-4 T6(b) § 7123(c)(4) INVENTORY TIE-TO-INTAKE AND INTAKE-BOUNDED RECOMMENDATIONS: (i) every reference to § 7123(c)(4) (inventory of personal information) CONNECTS the inventory element to the specific personal-information categories AND the specific systems the intake documents (e.g. 'the inventory element under § 7123(c)(4) covers the [category-A, category-B] personal information processed on the [system-X] identified in the intake, and the [category-C] personal information on [system-Y]'); NEVER emit a generic '§ 7123(c)(4) requires a data inventory' recital that names no PI category and no system. (ii) The audit's role is to establish that documentation exists — it does NOT extend or expand the business's operational inventory. NEVER emit recommendations of the form 'extend the inventory to cover [X]', 'expand the inventory beyond the intake', or any recommendation asserting business facts the intake does not supply. Correct form: 'the intake does not document [X]; the audit therefore requires documenting [X] under § 7123(c)(4) before the audit can be relied on' — i.e. frame missing coverage as a documentation gap the audit must resolve, never as an operational deficiency the audit fixes by fiat.",
    "NO RAW SLUGS IN PROSE: Never expose intake control slugs (e.g. 'c14_third_party', 'c16_training', 'c17_incident', 'c18_continuity') or phrases like 'mapped to c16_training' in user-facing fields (finding, remediation, regulatory_basis, executive_summary). Use the plain-English control label (e.g. 'the training control', 'the third-party oversight control'). Slugs may appear only in metadata/id fields.",
    "PRIORITY LABELS ≠ REGULATORY DEADLINES: the priority values (Immediate | Within 90 days | Within 6 months | Monitor) express operational urgency only. NEVER present a priority label as a regulatory or statutory deadline in prose. Do not write that remediation is required, due, or mandated \"within 90 days\" (or any priority-bucket window) as if the regulation imposes it. Where remediation timing is discussed in prose, tie urgency to the applicable § 7121(a) phase-in certification deadline (April 1, 2028/2029/2030 by revenue band), not to a priority-bucket label.",
    "BREACH-NOTIFICATION IS A FLAG, NOT A DIRECTIVE: whether a given incident triggers a specific breach-notification obligation (including California Attorney General reporting) is a determination for the user/counsel, not this tool. In remediation/next_steps, do NOT direct the organisation to report to the California AG \"where required\" or otherwise instruct fulfilment of a specific notification obligation. Flag the question and cite the controlling provision once per control — state it in EITHER finding OR remediation, never both verbatim: \"Confirm whether the incident triggered any breach-notification obligation, including California AG reporting under Cal. Civ. Code § 1798.82, and retain the determination and any notifications for auditor review.\" State the obligation; leave the applicability determination to the user. TIMELINE-SEPARATION FOR BREACH-HISTORY REMEDIATIONS (QL2-FIX-1 Item 4, verified against Cal. Civ. Code § 1798.82 as amended by SB 446 effective 1 Jan 2026): the individual-notification duty and the AG sample-copy duty run on separate clocks and must be cited separately — § 1798.82(a) requires notification to affected California residents in the most expedient time possible and without unreasonable delay (SB 446 further caps this at 30 calendar days from discovery for breaches on or after 1 Jan 2026); § 1798.82(f) requires, for breaches affecting more than 500 California residents, electronic submission of a single sample copy of the notification to the California Attorney General within 15 calendar days of notifying affected consumers. Never merge (a) and (f) into a single deadline or attribute one timeline to the wrong subsection.",
    "PRIORITY MUST TRACK STATUS/SCORE: each control's priority must be consistent with its status and score. Implemented or Mature controls (score ≥ 60) take priority \"Monitor\" — never \"Immediate,\" \"Within 90 days,\" or \"Within 6 months.\" Partial/Gap controls take a remediation window (\"Within 90 days\" or \"Within 6 months\" by severity). Critical Gap controls take \"Immediate.\" For Insufficient-information controls, the priority depends on WHY information is missing: if the control is one the regulation requires of this business and the evidence is simply absent, use \"Immediate\"; but if the control's APPLICABILITY itself is unconfirmed (the remediation reads \"determine whether the business [develops software / operates network zones / etc.]\" — a scoping question, not a known gap), use \"Within 90 days\" and frame the action as determining applicability and then either producing evidence or documenting non-applicability. Do not label a control \"Immediate\" solely because applicability has not yet been confirmed. Do not assign a remediation deadline to a control you have rated Implemented.",
    "RATE ON EVIDENCE, NOT INFERENCE: do not rate a control \"Implemented\" while the finding says the control is only \"inferred\" or that the intake \"does not include a discrete entry\" for it. If discrete intake evidence supports the control, state that evidence in the finding (which intake entries establish it) rather than calling it an inference. If no discrete evidence exists and the control is merely inferred from adjacent controls, set status to \"Insufficient information\" and leave the score at 0 (per STATUS↔SCORE). The finding narrative and the status must agree. APPLICABILITY CAVEAT FOR 0-SCORED CONTROLS: 11 CCR § 7123(c) limits the audit to components \"the auditor deems applicable to the business's information system\" — a 0 score for \"Insufficient information\" should not read as a universal deficiency. In remediation, add a control-specific applicability sentence naming the control's function and the concrete evidence that would resolve it (e.g. Secure development and coding practices (11 CCR § 7123(c)(14)) → 'if the business does not develop software'; Segmentation of an information system (11 CCR § 7123(c)(10)) → 'if the business does not operate its own network infrastructure'; Authentication (11 CCR § 7123(c)(1)) → 'if the business does not manage its own workforce identity'). CPPA-HF4 G — NON-BOILERPLATE CLOSE: NEVER emit the same generic close (\"document and retain the determination of non-applicability for auditor review\") across multiple Insufficient-information controls. Each Insufficient-information remediation names the SPECIFIC missing evidence for THAT control (the maturity value, the discrete intake entry, the artifact) — never a templated close. EXECUTIVE-SUMMARY AGGREGATION DISCIPLINE (PRODUCT-FIX-5 T1b): (i) every aggregate count stated in executive_summary (N implemented, N insufficient-information, N gaps, etc.) MUST exactly equal the count derivable from THIS report's own controls[] array; state each aggregate count at most ONCE — never restate the same aggregate with a different number anywhere in the document; before emitting the executive summary, recount from the controls[] array. (ii) The assessable control set is EXACTLY the 18 canonical component names in COMPONENT_CITATIONS — NEVER present as a separately-assessed control any name not in the 18 (e.g. never split \"account management\" out of an intake access-control entry into a second control); each intake control entry maps to EXACTLY ONE of the 18 canonical components. (iii) When enumerating control names in prose, use ONLY canonical component names of controls actually present in the controls[] array with the status being claimed. PF6 T2 — MEAN/AVERAGE SCORE DISCIPLINE + APPLICABILITY LANGUAGE: (iv) NEVER compute or state a mean, average, or aggregate score over controls whose status is \"Insufficient information\" — those score-0 slots are a placeholder for unassessed applicability, not an assessed value. Any mean/average score reported in executive_summary or elsewhere is computed over SCORED controls only (status ∈ {Critical Gap, Gap, Partial, Implemented, Mature}), and the sentence MUST say so explicitly: \"mean of NN across the M scored components\" where M is the count of scored controls in THIS report's controls[] array (M ≤ 18, and M = 18 minus the count of Insufficient-information controls). NEVER write \"mean of NN across all 18 components\" or \"average of NN across the 18 audit components\" when any control is Insufficient-information; NEVER emit a mean sentence without the \"scored\" qualifier and the explicit M count. (v) NEVER describe the 18 § 7123(c) components as universally \"required\" or as \"the 18 audit components required under § 7123(c)\" — § 7123(c) limits the audit to components the auditor deems applicable to the business's information system (see the APPLICABILITY CAVEAT above); the correct framing is \"the 18 enumerated components under § 7123(c), subject to the auditor's applicability determination.\" Any exec-summary or narrative sentence that implies all 18 are required irrespective of applicability is a defect.",
    "REMEDIATION PHRASING FOR IMPLEMENTED CONTROLS: for a control rated Implemented or Mature, remediation must presume the control exists and focus on evidence-readiness — phrase it as \"retain and make audit-ready the documentation evidencing [the control / alignment with the relevant NIST CSF 2.0 function]\" rather than \"map,\" \"align,\" or \"establish\" the control (which implies it is not yet in place and contradicts the Implemented rating). \"Map/establish/align\" phrasing is appropriate only for Gap, Partial, or Insufficient-information controls. ACROSS ALL CONTROLS, the NIST CSF 2.0 function is descriptive CONTEXT, never the action item: do not phrase remediation as \"align your documentation with the [Function] function of NIST CSF 2.0\" as if CSF alignment were the compliance objective. The compliance objective is to retain audit-ready evidence under 11 CCR § 7123(e) generally — but the NIST CSF function parenthetical, when included, must be attached to the CONTROL'S OWN subsection (e.g. \"§ 7123(c)(6)\"), never to the generic \"§ 7123(e)\" audit-report citation. Do NOT write \"§ 7123(e) (corresponding to the [Function] function of NIST CSF 2.0)\" — § 7123(e) is the audit-report content requirement, not the component being assessed, and attaching a component-specific NIST function note to it misattributes the citation. Phrase the action as: \"retain and make audit-ready the documentation evidencing [the control] (corresponding to the [Function] function of NIST CSF 2.0), as required under 11 CCR § 7123(e)\" — i.e. the NIST parenthetical follows the CONTROL description, and the § 7123(e) procedural citation stands on its own at the end of the sentence, not fused with the NIST parenthetical.",
    "DO NOT INFER ACTIVITIES FROM SECTOR: never infer that a business performs a specific activity (e.g. software development, manufacturing, data sales) from its industry sector or company name and then treat that inference as fact in a finding. If the intake contains no discrete evidence for a control area, flag the absence neutrally — \"the intake does not address [component]; if the business performs [activity], this component must be documented\" — without asserting the activity is \"likely\" given the sector. Sector is not evidence that a specific control applies.",
    "UNIFORM FINDINGS — DO NOT NAME THE BUSINESS IN FINDINGS: write every control finding in the same impersonal register. Refer to the business generically as \"the business\" or \"the intake\" — do NOT insert the organisation's name (e.g. \"Civix Technology LLC isolates…\", \"in place at [Company]\") into some findings while omitting it from others. Naming the entity in a subset of findings creates formatting inconsistency across the report. The business name belongs in document metadata/header fields only, never in the per-control finding prose.",
   "CPPA-HF2 B — EVASIVE-PLACEHOLDER BAN: NEVER emit narrative substitutes for a real citation. Banned phrasings include 'the cited provision governing [X]', 'under the cited provision', 'pursuant to the cited provision', and 'the cited section above'. Cite the § 7122/7123 subsection directly or use plain-English element names.",
   "CPPA-HF5 G — REMEDIATION CLOSE DIFFERENTIATION (ROUND 2): NEVER repeat the same close verb-phrase across remediation entries. In particular, do NOT open remediation prose with the templated phrasing 'Determine whether the business …' more than ONCE across the report. Each remediation close must be anchored to a control-specific NAMED FACT drawn from the intake (the maturity value recorded for THIS control, the specific artefact absent for THIS control, the specific NIST CSF 2.0 function applicable to THIS control). Boilerplate closes across multiple controls are a defect.",
   "CPPA-HF2 H1 — COMPONENT COUNTS ARE COMPUTED FROM THE ENUMERATED LIST: whenever the report states a count of the 18 audit components (e.g. 'eleven controls are recorded as implemented', 'seven components lack operational evidence'), that count is COMPUTED from the enumerated control array in this report — never asserted from prior expectation, never rounded, never inferred. State the count with its status class ('implemented': maturity supplied; 'insufficient information': maturity absent; etc.) and ensure the class totals sum to 18. A stated total that does not equal the sum of its class counts is a defect.",
   "CPPA-HF2 H2 — GLBA / SAFEGUARDS RULE CONDITIONAL APPLICABILITY: the Gramm-Leach-Bliley Act (15 U.S.C. § 6801) and its implementing Safeguards Rule (16 CFR Part 314) apply ONLY where the intake or profile evidence establishes that the business is a 'financial institution' as defined at 16 CFR § 314.2(h) (specifically: 'significantly engaged' in financial activities per Regulation Y). NEVER assert GLBA/Safeguards Rule applicability based solely on the presence of financial-services keywords, transaction data, or lending activity. Where the profile does NOT establish financial-institution status, phrase the reference conditionally ('if the business qualifies as a financial institution under 16 CFR § 314.2(h), the Safeguards Rule additionally applies') and NEVER as a definitive obligation.",
   "ZERO-TRUST IS NOT A REGULATORY CRITERION — NO FALSE DICHOTOMY WITH SEGMENTATION: per the FSOR, zero-trust architecture was deleted from the final 11 CCR § 7123 as a standalone component during rulemaking to simplify implementation — it was NOT rejected as insufficient, and it is NOT a competing alternative to segmentation. If the intake records a zero-trust architecture control, do NOT phrase the finding as though the business might erroneously substitute zero-trust for segmentation as if they were alternatives (they are not alternatives — zero-trust may in fact be part of how segmentation is implemented). Canonical finding form (QL2-FIX-1 Item 4, adopting the grader's substantively correct 'in addition to, not instead of' phrasing): 'The final regulation does not include zero-trust architecture as a standalone component (it was deleted during rulemaking to simplify implementation), so even where a zero-trust design is in place, segmentation of the information system under § 7123(c)(10) must be independently evidenced — in addition to, not instead of, the zero-trust controls — with segment scope, zone definitions, and boundary-enforcement mechanisms retained as the auditable segmentation record.' Do NOT include language suggesting the business's zero-trust entry 'may reflect pre-final-regulation design assumptions' or that zero-trust and segmentation are competing approaches. CITE THE SOURCE for the rulemaking-deletion claim only where the supplied FSOR commentary supports it (cite by page/package per the existing fsor_citation mechanism); if no matching FSOR commentary is available in the supplied context for this specific claim, phrase it as a general current-regulation statement without asserting a specific rulemaking-history citation — 'The final regulation lists segmentation of the information system at § 7123(c)(10) and does not list zero-trust architecture as a standalone component; segmentation must be independently evidenced on its own terms, in addition to any zero-trust controls in place.'",
   "VULN SCANNING / PEN TESTING IS DETECT/PROTECT, NOT IDENTIFY: when citing the NIST CSF 2.0 function for vulnerability scanning and penetration testing remediation, use Detect and/or Protect — these are active detection and protective activities, not asset/risk inventory (which is Identify). Do not attribute vulnerability scanning or penetration testing remediation to the Identify function.",
    "AWARENESS AND TRAINING ARE SEPARATE COMPONENTS — DO NOT CONFLATE: an earlier draft treated cybersecurity awareness and cybersecurity education/training as a single component; the final regulation split them into two distinct components — \"Cybersecurity awareness\" (§ 7123(c)(12)) and \"Cybersecurity education and training\" (§ 7123(c)(13)). Assess and score them independently. If the intake provides a single undifferentiated entry covering both, do not assume it satisfies both components — flag it in epistemic form — 'the intake records both under a single entry; confirm whether the retained documentation separately addresses awareness activities (ongoing threat-landscape literacy) and formal training (structured onboarding/annual/post-incident instruction)' — and state that the business's audit-ready documentation must evidence the two components independently per the final regulatory structure. CITATION ANCHORS FOR AWARENESS/TRAINING RETENTION (QL2-FIX-1 Item 4, verified against 11 CCR §§ 7122–7123 as adopted): the components themselves are cited as § 7123(c)(12) (awareness) and § 7123(c)(13) (education and training); the BUSINESS-SIDE documentation-retention duty for these programs is anchored at § 7122(g) (records and information supporting the cybersecurity audit shall be retained for five years); § 7123(e) governs what the INDEPENDENT AUDITOR documents in the audit report — never anchor the business's retention duty to § 7123(e). Canonical remediation form: 'retain and make audit-ready the documentation evidencing [awareness / training component] under 11 CCR § 7123(c)(12) or (c)(13) as applicable, retained per the § 7122(g) five-year retention rule.' The auditor-duty statement — 'The auditor documents the assessed component in the audit report under § 7123(e).' — appears in the FINDING text for the component, never in the remediation field; remediation fields carry only actions the business must take.",
    "FINDINGS ARE OBSERVATIONS, NOT REGISTERS OF ABSENT ARTEFACTS: every 'finding' string must describe the state of the control as evidenced (or not) by the intake — a neutral observation of what the intake does or does not establish. Do NOT phrase a finding as a shopping list of documents the business must produce, and do NOT lead with 'Missing: …' or a bare enumeration of artefacts. Where evidence is absent, say so plainly (e.g. 'the intake does not establish [component]') and reserve the enumeration of required artefacts for the remediation field. Findings observe; remediation directs. This separation must hold across every control regardless of status.",
    "FINDINGS ARE OBSERVATIONS, NOT DIRECTIVES: the 'finding' field is a neutral, past/present-tense observation of what the intake does or does not establish for this control. It must NOT contain imperatives, recommendations, or directives (e.g. 'implement…', 'establish…', 'the business should…', 'must document…', 'needs to…'). All directive language — what the business should do, produce, or change — belongs exclusively in the 'remediation' field. If a finding currently reads as an instruction, rewrite it as an observation of the current state (e.g. 'the intake does not establish an inventory of personal information and systems as required by the corresponding audit component') and move any prescriptive content to remediation. This rule holds regardless of control status.",
    "NO FALSE TOTALIZERS — NARRATIVES STATE THE ACTUAL DISTRIBUTION: top_risks, executive_summary, and next_steps must never say 'every control', 'all controls', or 'all 18' unless it is literally true of all 18. Where control statuses are mixed, state the actual counts and treat each population on its own terms (e.g. \"Eleven controls are recorded as implemented but lack the operational specifics an auditor must examine; seven could not be assessed because the intake provided insufficient information\"). A risk narrative that misstates the status distribution is a factual error, whatever its analytical point.",
    "ZERO-TRUST NOTE VOICE: when applying the ZERO-TRUST IS NOT A REGULATORY CRITERION rule, the user-facing note states the regulatory point only — 11 CCR § 7123(c) as finalised does not include zero-trust as a standalone criterion, and the auditable requirement is segmentation (logical or physical separation) under § 7123(c)(10) — and directs the business to retain documentation of its segmentation architecture. The note NEVER speculates on how the business's documentation 'was designed', never references the business's 'framing' choices, and never comments on the drafting history of the business's own records: that is generator commentary about inputs, not a finding about the control.",
    "EACH FINDING IS DOCUMENTED ONCE: where a single intake entry covers two components (e.g. one undifferentiated entry spanning cybersecurity awareness and cybersecurity education/training), diagnose the documentation-separation issue fully ONCE, in the first affected component's finding; the sibling component's finding carries a one-line cross-reference ('as noted under the cybersecurity awareness component, the intake records both as a single entry; this component faces the same documentation-separation requirement') plus only what is specific to it. top_risks entries never restate control-level findings: a top risk is a systemic or cross-cutting exposure, phrased at that level, pointing to (not repeating) the underlying control findings — so the reader cannot count one defect twice.",
    "QB-P25 CYBER SCHEMA (evidence / differentiator / rank; DESIGNED OUTPUT, NEVER INTERNAL-REASONING LEAKS): every control emits three additional customer-facing fields alongside the existing finding/remediation. (i) evidence — 1 sentence, US English, quoting or paraphrasing the SPECIFIC intake artefact(s) (named tool, coverage figure, cadence, ISO date, ticket id) that supports the score for THIS control; where the intake supplies nothing, write 'the intake supplies no artefact for this component'. (ii) differentiator — 1 sentence explaining why THIS control's score / status differs from its sibling controls (or, when uniform across the report, why the uniformity itself reflects the evidentiary depth available rather than implementation failure — this replaces the prior UNIFORM-SCORES rationale requirement, and no separate exec-summary rationale sentence is required once the per-control differentiators are populated). Boilerplate differentiators that could apply to any control ('this control is important', 'this control is a gap') are defects; the sentence names the SPECIFIC intake fact that separates this control from its neighbours. (iii) rank — an integer 1..18, unique across the report's controls, where 1 is the reader's HIGHEST-priority remediation focus (worst gap / greatest exposure) and 18 is the LOWEST; rank is a reader-facing ordering, not the raw score, so mature/implemented controls take the higher rank numbers. Evidence and differentiator are DESIGNED, USER-FACING OUTPUT — they are the reader's audit-prep record — and are NEVER labelled or bracketed as internal notes, reasoning traces, self-critique, or model process (see CPPA-HF3 B2). NEXT-STEPS CAP: the top-level next_steps array is capped at THREE items; each next_step object carries { text, owner, trigger } where owner names the intake-supplied accountable function (e.g. 'Security Engineering', 'the DPO', 'the incident-response lead') and trigger names the concrete condition or artefact that closes the step ('when the c14_secure_dev intake entry supplies a SAST tool name', 'once the § 7123(c)(4) inventory is retained in [named CMDB]'). More than three next_steps is a defect; a next_step without a named owner and trigger is a defect.",
    "SUMMARY ENUMERATIONS COUNT WHAT THEY COUNT: where the executive_summary enumerates priority documentation gaps, state explicitly whether the numbered items are gap CATEGORIES or individual controls, and how many of the 18 components each item spans (e.g. 'three categories of documentation deficiency spanning six components, including …'). Never present a numbered list that could be read as a one-to-one mapping to components when items group multiple controls.",
    "FSOR COMMENTARY CARRIES ITS OWN SECTION: FSOR commentary attached to a control discusses the rulemaking record and may reference a different section number than the control's fsor_citation. Never present the commentary's section as the control's citation: where they differ, introduce the commentary as 'FSOR discussion under § [n] bearing on this control' so the reader cannot mistake it for the control's operative citation, and never alter the control's fsor_citation to match the commentary. Where the supplied commentary's internal citation uses the PROPOSAL's numbering (e.g. § 7123(b)(2)(B)) for a component the final regulation locates in § 7123(c), say so in one clause — 'the FSOR discussion references the proposal's numbering; the final regulation locates this component at [the control's fsor_citation]' — grounded only in the citations actually present in the supplied commentary and the control's own fsor_citation, never in asserted regulatory history beyond them.",
    "NOTES ADDRESS THE READER, NOT THE SYSTEM: any note or remediation sentence must read as guidance to the organisation, never as an instruction the generator is giving itself. 'Confirm that documentation does not rely solely on a zero-trust architecture framing' becomes 'The business should retain documentation describing the logical or physical separation controls themselves — segment scope, zone definitions, and boundary enforcement — which is the auditable requirement under the final regulation.' If a sentence would make sense addressed to the model, rewrite it addressed to the reader.",
    "FINDINGS NEVER ASSERT UNSEEN INTAKE CONTENT: the generator sees the intake summary supplied to it — not the business's records. A finding may state what the supplied intake does or does not establish; it must never assert as fact how the business's retained documentation is organised (e.g. 'the intake records both under a single undifferentiated entry' when the supplied intake does not say so). Where documentation structure matters to auditability, use the conditional epistemic form: 'if the retained documentation does not separately evidence [X] and [Y], the auditor cannot assess either component independently.'",
    "CROSS-READ THE FULL INTAKE (QB-P8; evidence: run aa9b8752 rubric_unsupported_business_claim — the report declared inventory coverage unestablished while the intake named McLeod TMS and the freight-tracking portal in other control notes): before asserting that the intake lacks or does not establish a fact, check every controls[].notes entry AND the profile block; if the fact appears anywhere in the intake (including under a sibling control's notes), consume it rather than declaring it absent. Where a fact recorded under one control's notes bears on another control (e.g. an asset inventory named in an access-control note), reference it in the second control's finding rather than treating the second control as evidence-free.",
    "INTAKE-VERBATIM DISCIPLINE (QB-TEAM 2026-07-22; adapted from run-dpia-framework): proper nouns and dates carried in the intake — business name, vendor/system names (e.g. TMS, MDR, EDR product names), auditor names, jurisdictions, ISO dates — are copied character-for-character into controls[].finding and prose sections. Never re-spell, transliterate, normalise, abbreviate, expand, correct, or otherwise alter an intake-supplied proper noun or date. Never substitute a similar-sounding vendor/system name; never shift a year or month. Verify each proper noun and date in the output against the intake before emitting; any mismatch is a fabrication defect.",
    "MOST-SPECIFIC-SECTION / NO BLANKET RANGES — PROSE SECTIONS ONLY (QB-TEAM 2026-07-22; adapted from run-admt-checker; does NOT override the AWARENESS / TRAINING AFFIRMATIVE-FINDING supersession rules below): in the executive summary, top-risks narrative, and other PROSE sections (NOT the per-control deterministic cites, which are governed by their own subsection-exact discipline), every duty-bearing sentence cites its single most specific section. Hyphenated range cites (e.g. §§ 7150–7157) are permitted only in one scope-framing sentence at the top of a section, never as the anchor for a specific duty. Where the AWARENESS and TRAINING affirmative-finding rules govern (§ 7123(c)(12), § 7123(c)(13)), those rules supersede this one for the affected findings.",
    "FSOR COMMENTARY IS SUBSECTION-EXACT OR LABELLED GENERAL: commentary attached to a control either speaks to that control's specific subsection, or it is introduced with the exact label 'General § 7123 agency response; no subsection-specific interpretive commentary was identified in the FSOR corpus for this component.' An empty fsor_commentary array is always preferable to tangentially relevant general discussion presented as component-specific. Analysis never migrates across statute or regulation subsections: a statement about § 7123(b) is never presented as bearing on § 7123(c)(N) content, and vice versa.",
    "ZERO-TRUST COMPARISONS CITE THE FSOR: any statement that zero-trust architecture is not a standalone audit component must cite the FSOR commentary supplied in context (the agency's deletion rationale, FSOR Appendix p. 25) or be phrased as 'previously proposed and deleted from the final regulation (FSOR p. 25)' — never as an uncited regulatory comparison.",
    "TWO-COMPONENT FINDINGS: where the final regulation treats two related items as distinct audit components (e.g. cybersecurity awareness vs cybersecurity education and training under 11 CCR 7123(c)), findings must (1) state the operational documentation gap first, (2) then state the independence requirement, and (3) never assert what a shared intake entry contained unless the intake text is quoted. Phrase intake-based limits as 'the intake does not supply documentation confirming X', never as an assertion about what the unseen intake conflated.",
    "THRESHOLD BOUNDARIES ARE EXPLICIT: when stating revenue or volume bands (e.g. the 11 CCR 7121(a) phase-in cohorts), phrase boundaries without overlap ambiguity ('exceeding $100 million'; 'at least $50 million but not exceeding $100 million'; 'below $50 million') and state that the business must determine which band applies from its actual figures. NO RULEMAKING NARRATION: state what the current regulation requires; never narrate rulemaking history (what a draft contained, what 'as finalized' deleted) to the end user.",
    "IoT SECTOR § 1798.91.04 CONTROL-STANDARD VERIFICATION: for connected-device / IoT sector runs where Cal. Civ. Code §§ 1798.91.04–.06 are cited, the report must NOT assert that device-level authentication or encryption controls in the intake automatically satisfy the statute — cite the section and then include a distinct verification note for EACH of the two operative subdivisions: (a) § 1798.91.04(a) — 'The business must verify that the encryption controls described in the intake meet the reasonable-security-feature standard required by Cal. Civ. Code § 1798.91.04(a) for the specific connected device(s), including that the encryption is appropriate to the nature and function of the device and to the information the device collects, contains, or transmits — the citation alone does not confirm the specific controls meet the standard.' (b) § 1798.91.04(b) — 'The business must verify that the device-level authentication described in the intake meets the requirements of Cal. Civ. Code § 1798.91.04(b), which requires either (i) a preprogrammed password unique to each device manufactured, or (ii) a security feature that requires the user to generate a new means of authentication before access is granted to the device for the first time — the citation alone does not confirm the specific authentication mechanism meets one of these two conditions.' Emit these as two separate notes (never merged) attached to the relevant control finding(s); phrase as guidance to the business, per the NOTES ADDRESS THE READER rule.",
    "AWARENESS COMPONENT — AFFIRMATIVE FINDING (§ 7123(c)(12)): supersedes the conditional epistemic form for this component only. State the awareness-documentation requirement AFFIRMATIVELY, not as passive/conditional 'if… documentation does not separately evidence… an auditor cannot assess…' language. Canonical finding: 'The business must retain documentation that separately evidences awareness activities — such as threat advisories, phishing simulation results, or security-culture communications — distinct from formal training curricula, so that the auditor can assess the two components independently.' Do NOT preface with 'if' or 'where'; do NOT hedge as 'may need to retain'; state the retention duty affirmatively as a requirement of the audit component.",
    "TRAINING COMPONENT — AFFIRMATIVE FINDING, NO CROSS-REFERENCE (§ 7123(c)(13)): supersedes the sibling cross-reference form for this component only. Do NOT emit a redundant cross-reference to the awareness component ('as noted under the cybersecurity awareness component…') for the training finding; the training component's finding stands on its own with its own artefact list. Canonical finding: 'The business must retain documentation that separately evidences formal training activities — such as structured onboarding, annual training completion records, or role-based curricula — distinct from general awareness activities, so that the auditor can assess this component independently.' Do NOT restate the awareness rationale, and do NOT use conditional 'if… documentation…' language — state the training-component retention duty affirmatively.",
    "SCORES MATCH FINDINGS: controls whose finding text states the same evidentiary deficiency receive the SAME score; assigning a lower score REQUIRES a stated additional deficiency in that control's own finding text. Never let two controls with equivalent findings differ in score without an articulated reason.",
    "DEADLINE FIELDS CARRY DATES ONLY: a deadline field states the operative date(s); explanatory context (e.g. 'Cal. Civ. Code §§1798.91.04–.06 are separately in force independent of the CPPA audit phase-in') belongs in the finding or remediation text, never inside the deadline field.",
    "TEST-STATES ARE BINDING (R1b2 rule 2a): the injected TEST-STATES block records the deterministic state of each mechanical determination (M1 = primary_framework_selected; M2 = breach_history_present; M3 = last_audit_documented; M4–M21 = c1..c18 answered). Any test whose state is RESOLVED — resolved_met, resolved_not_met, or resolved_not_applicable — is stated as concluded in the report with the basis given; NEVER hedge it, NEVER emit a next_steps entry that re-asks the user to confirm/verify/document what the intake has already established, and NEVER contradict it in prose. In particular: where c{N}_answered is RESOLVED_MET (the intake supplied maturity for that control), the control's status MUST NOT be 'Insufficient information' and its finding MUST NOT say 'the intake does not establish [this component]' — score and status must reflect the maturity supplied. INDETERMINATE tests use insufficient-basis language and MUST anchor any resulting next-step to the specific missing profile or per-control intake key. Applicability class and § 7121(a) cohort remain JUDGMENT calls per the existing APPLICABILITY and PHASE-IN rules — no mechanical test binds them in this tool.",
    "PROPORTIONATE ASKS (R1b2 rule 2b): (i) ASK CLASSES — classify every surfaced item as verdict-blocking, record-completeness, or enhancement. Verdict-blocking and record-completeness items belong in next_steps and per-control remediation; enhancement items — model-observed depth improvements that no cited provision requires — belong in remediation prose ONLY when tied to '§ 7122(g) audit-ready retention' language and NEVER as a next_step. (ii) CREDIT-FIRST — for any partially evidenced control, name what the maturity/notes establish BEFORE the residual; the residual is incremental (e.g. 'retention of the change-log evidence should be added') and NEVER re-requests content the intake already supplies. (iii) BANNED COLLAPSE — the phrases 'cannot be determined', 'no basis to assess', and 'not established' may NOT be applied to a whole control when only an increment is missing; where a missing piece IS verdict-blocking (e.g. the control's applicability itself is unconfirmed under the APPLICABILITY CAVEAT rule), name the specific element that blocks it rather than collapsing the whole control.",
    "READINESS-COHORT RATIONALE (R1b2 rule 2c): the executive_summary's discussion of § 7121(a) phase-in timing must read the M1 (primary_framework_selected) and M3 (last_audit_documented) states verbatim from the injected TEST-STATES block, and the discussion of severity anchoring in the security-incident-response component (c17) must read M2 (breach_history_present). Where M2 is RESOLVED_MET, do NOT hedge severity ('may warrant elevated priority') — state the anchor plainly ('the intake reports incidents in the last 12 months; the incident-response control is anchored accordingly'). Where M1 is RESOLVED_MET with a named framework, do NOT re-open framework selection as a next step; frame remediation IN that framework per the existing FRAMEWORK rule.",
    "TEST-STATES ARE INTERNAL VOCABULARY (leg-(b) 2026-07-11): the TEST-STATES machinery is internal — its tokens NEVER appear in any user-facing field. Do NOT emit the literal string 'TEST-STATES', the test ids (M1, M2, M3, M4–M21, …), or the state tokens (resolved_met, resolved_not_met, RESOLVED_MET, RESOLVED_NOT_MET, INDETERMINATE, CANDIDATE) anywhere in executive_summary, per-control finding or remediation, next_steps, regulatory_basis, enforcement_context, or any other user-visible output. State the conclusion with its factual basis instead — 'the intake reports incidents in the last 12 months' — never '(M2 resolved met)' or 'per TEST-STATES M2'. Same philosophy as NO SYSTEM-ROUTING VOICE and NO RAW SLUGS IN PROSE.",
    "CPPA-HF1 C1 — CROSS-STATUTE APPLICABILITY REQUIRES A THRESHOLD TEST: (a) COPPA obligations attach only to operators of online services directed to children under 13 (or with actual knowledge of collection from same) per 15 U.S.C. § 6502. NEVER assert COPPA obligations for a K-12 or edtech entity without stating the operator-of-online-service test and either applying it to the intake facts or framing the obligation as 'may apply, verify against the § 6502 operator test'. (b) HIPAA covered-entity status attaches only to a health plan, healthcare clearinghouse, or healthcare provider that transmits health information electronically in connection with a HIPAA-covered transaction (45 C.F.R. § 160.103). NEVER characterise the assessed entity as a HIPAA covered entity without an intake basis; where the intake does not establish covered-entity status, refer to 'HIPAA obligations, if the business is a covered entity or business associate' — never as a settled fact. (c) When readiness_level or applicability is 'Insufficient basis to assess' (or its equivalent), the numeric score is PROVISIONAL and MUST NOT carry a readiness-tier label ('Substantially Ready', 'Foundational', 'Advanced', etc.) in the executive_summary. State the score as provisional and pending completion of the record ('a provisional score of NN, pending completion of the record; no readiness tier is placed on this record'). (d) Component-count enumerations (e.g. 'Nine of the 18 required audit components …') are COMPUTED from the actual per-control assessed set — never asserted from memory or approximation. If the count is not derivable from the actual controls[] statuses, do not state a count.",
    "SPEC-PACK-1 R2 — SYSTEM-SPECIFIC MITIGATION FRAMING (SUPPLEMENTS the shared SPECIFICITY & ACTIONABILITY directive; does NOT restate its owner/timeframe/intake-fact requirement): every per-control remediation, top_risk, next_step, and executive_summary mitigation TIES its controls and evidence artefacts to the NAMED SYSTEMS, ASSETS, VENDORS, AND FRAMEWORK ELEMENTS the intake supplies. Named intake objects that MUST be referenced by name where they appear include: the intake's primary and secondary cybersecurity frameworks (e.g. 'SOC 2', 'ISO 27001', 'NIST CSF 2.0', 'CIS Controls'); the specific systems or platforms the intake enumerates (production systems, customer-facing platforms, internal collaboration tools, ADMT systems, connected devices, network segments); named vendors, service providers, sub-processors, and third-party auditors the intake identifies; named data categories the intake records (personal information, sensitive personal information, employee data, biometric data, health data); and the specific control's OWN status/score band context. Remediation prose form: 'Retain and make audit-ready the documentation evidencing [named control area] AS IMPLEMENTED IN [named intake system, framework, or vendor context], with [specific artefact tied to the intake's operating environment].' Bare mitigations that could apply to any organisation ('retain segmentation documentation', 'retain training records', 'retain incident-response documentation') without the intake-object anchor are defects when the intake supplies the object; recast by name. Where the intake genuinely does not name the system/vendor/framework and the object is not inferable, route the missing piece to next_steps as an information-completeness ask rather than emit a generic mitigation.",
    "W6-CYBER-FIX (2026-07-24) STATUTORY-TEXT DISCIPLINE — regulatory_basis STATES ONLY the statutory paraphrase of the cited § 7123(c)(N) subsection. It MUST NOT incorporate intake-specific operational detail, implementation phrasing, vendor/system names, or remediation-metric language (e.g. 'mean time to remediate', 'key management practices', 'field-level protections', 'rotation cadence', 'MTTR/MTTD/SLA targets', quoted intake phrases, parenthetical 'e.g.'/'i.e.' expansions, or ', including / , such as' inflation). Intake-specific detail belongs in finding and remediation, clearly attributed to the intake — never merged into the statutory paraphrase. Correct form: 'encryption of personal information at rest and in transit'; wrong form: 'encryption of personal information at rest and in transit, including key management practices and field-level protections for PII'.",
    "W6-CYBER-FIX (2026-07-24) NO CROSS-CONTROL FIGURE PORTING — figures the intake supplies for one control (e.g. a user-population count on the authentication control) MUST NOT be ported into a different control's finding and presented as a stated record fact. Any number carried across controls, or any estimate derived from another control's number, must either (a) be labelled as derived and name the source control (e.g. 'derived from the authentication control's stated population; not restated in this control's intake'), or (b) be omitted entirely. Intake silence on a figure for THIS control is a gap, not a licence to import a figure from a sibling control.",
    "W6-CYBER-FIX-v2 (2026-07-24) REGULATORY-BASIS FIDELITY — regulatory_basis QUOTES OR CONSERVATIVELY PARAPHRASES the cited § 7123(c)(N) subsection ONLY. Anything beyond the provision text (intake-specific detail, remediation metrics, judgment) belongs in finding/remediation and must be attributed to the intake or to the report's own judgment — NEVER inside regulatory_basis. Wave-7 examples of prohibited inflation: adding 'integrity protection' or 'security-relevant logs' to a § 7123(c)(7) basis; adding 'field-level protections for personally identifiable information' to a § 7123(c)(2) encryption basis. Also: NAMED RULES REQUIRE A PINPOINT CITE — do NOT assert a named regulatory rule ('the five-year audit-record retention rule', 'the N-year retention rule') without a specific § pinpoint. Where a retention duty applies but the pinpoint is unconfirmed, write 'retention requirement (confirm pinpoint cite, see § 7124 et seq.)' rather than coining a named rule.",
    "W6-CYBER-FIX-v2 (2026-07-24) OPERATIVE-STANDARD DISCIPLINE — the CCPA cybersecurity audit under 11 CCR § 7123 is the SOLE operative standard for this assessment. Comparative frameworks — HIPAA (including 45 CFR Part 164 / the HIPAA Security Rule), NIST CSF 2.0, HITRUST, ISO 27001, and SOC 2 — may be cited ONLY as comparative context. NEVER apply operative verbs ('requires', 'governs', 'drives', 'mandates', 'dictates', 'is the operative/governing standard for') to any comparative framework in relation to this assessment. Correct form: 'For comparative context, the HIPAA Security Rule addresses MFA controls; the operative requirement is 11 CCR § 7123(c)(1).' Wrong form: 'The HIPAA Security Rule requires MFA…' or 'NIST CSF 2.0 governs this assessment's framework mapping.'",
    "W6-CYBER-FIX-v2 (2026-07-24) INTAKE-ELECTED FRAMEWORK IS NEVER SUBSTITUTED — if the intake records HITRUST (or SOC 2, ISO 27001, CIS Controls, etc.) as the primary framework, framework mapping stays with that election unless a cited provision compels otherwise; state the basis when it does. NIST CSF references, if any, appear as explicitly optional crosswalks and never as required/governing framing.",
    "W6-CYBER-FIX-v2 (2026-07-24) DERIVED FIGURE ATTRIBUTION — any figure obtained by cross-referencing another control's intake (e.g. account estimates computed from a population count reported on the authentication control) MUST be labelled derived and MUST name its source control (e.g. 'derived from the authentication control's stated 168+412 users'). Never present a cross-referenced figure as a fact of the control under discussion; the account-management intake's silence on a population is a gap, not permission to import a sibling control's number.",
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

// ─────────────────────────────────────────────────────────────────────────────
// R1b2 — deterministic TEST-STATES for the CPPA cybersecurity generator.
// Computed from the intake shape produced by src/pages/CPPACybersecurity.tsx:
//   { profile: { entity_name, industry, incidents_12mo, framework, last_audit },
//     controls: [{ key, label, maturity, notes }, … 18] }
// M1  primary_framework_selected  — profile.framework ∈ {SOC 2, ISO 27001, NIST CSF 2.0, CIS Controls}
// M2  breach_history_present      — profile.incidents_12mo answered and not "None"/"0"
// M3  last_audit_documented       — profile.last_audit non-empty
// M4..M21 c{N}_answered           — controls[i].maturity non-empty  (18 tests, one per c1..c18)
// Applicability class and § 7121(a) cohort are JUDGMENT (no structured field
// in this intake; governed by the existing APPLICABILITY / PHASE-IN prose rules).
//
// R1d/A1 (PURE MOVE): TestStateEntry, computeCyberTestStates, and
// renderCyberTestStatesBlock live in _shared/cppa-test-states.ts and are
// re-exported here so every existing caller is byte-identically preserved.
// ─────────────────────────────────────────────────────────────────────────────
export { computeCyberTestStates, renderCyberTestStatesBlock } from "../_shared/cppa-test-states.ts";
export type { TestStateEntry } from "../_shared/cppa-test-states.ts";
import { computeCyberTestStates, renderCyberTestStatesBlock, detectTestStatesLeak } from "../_shared/cppa-test-states.ts";


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

  const procWrite = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "processing" }, { fn: "run-cppa-cybersecurity", phase: "pre_generation" });
  if (!procWrite.ok) {
    // Cannot persist lifecycle state — abort before spending model time.
    return;
  }

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

    // IoT sector conditional supply block — verbatim authority text for
    // Cal. Civ. Code §§ 1798.91.04–1798.91.06 (California IoT Security Law).
    // Content/rules unchanged; this is supply-side only.
    const S = String.fromCharCode(167);
    const sectorStr = String((row.intake_data as any)?.industry_sector ?? (row.intake_data as any)?.org_context?.sector ?? (row.intake_data as any)?.profile?.industry ?? "");
    const isConnectedDeviceSector = /iot|connected.device|smart.home|device manufactur/i.test(sectorStr);
    let iotAuthorityBlock = "";
    if (isConnectedDeviceSector) {
      const IOT_CITATIONS = [
        `Cal. Civ. Code ${S} 1798.91.04`,
        `Cal. Civ. Code ${S} 1798.91.05`,
        `Cal. Civ. Code ${S} 1798.91.06`,
      ];
      const { data: iotRows } = await supabase
        .from("cppa_authorities")
        .select("citation, title, full_text")
        .in("citation", IOT_CITATIONS)
        .eq("status", "current")
        .not("verified_by", "is", null);
      if (iotRows && iotRows.length > 0) {
        iotAuthorityBlock =
          "\n\nCALIFORNIA IoT SECURITY LAW -- SUPPLIED AUTHORITY TEXT (cite this law's content ONLY from the text below, never from recollection):\n" +
          iotRows.map((r: any) => r.full_text).join("\n\n");
      } else {
        console.warn("[cppa-cyber] IoT sector detected but IoT authority rows unavailable");
      }
    }

    // Unconditional California breach-notification authority supply — verbatim
    // Cal. Civ. Code § 1798.82 from cppa_authorities. Cyber is a California
    // tool, so this fires on every run; content/rules unchanged, supply-side
    // only.
    let caBreachAuthorityBlock = "";
    {
      const { data: caBrRows } = await supabase
        .from("cppa_authorities")
        .select("citation, full_text")
        .eq("citation", `Cal. Civ. Code ${S} 1798.82`)
        .limit(1);
      if (caBrRows && caBrRows.length > 0 && (caBrRows[0] as any).full_text) {
        const r = caBrRows[0] as any;
        caBreachAuthorityBlock =
          "\n\nCALIFORNIA BREACH-NOTIFICATION AUTHORITY -- SUPPLIED VERBATIM TEXT (cite Cal. Civ. Code " + S + " 1798.82 content ONLY from the text below, never from recollection):\n" +
          `[${r.citation}]\n${r.full_text}`;
      } else {
        console.warn("[cppa-cyber] 1798.82 authority row unavailable");
      }
    }

    // C2-2 — CCPA definitions supply is now DEFINES_TERMS-CONDITIONAL.
    // Predicate: the intake must supply enough profile substance for the
    // defined-term consumers (§ 1798.140(ag) "business", § 1798.140(e)
    // "service provider", § 1798.140 personal-information family) to be
    // load-bearing. Skeleton intakes (no entity name, no industry) skip
    // the ~5KB verbatim dump and save prompt tokens. Decision is logged.
    let caDefinitionsAuthorityBlock = "";
    {
      const intakeProfile = ((row.intake_data as any)?.profile ?? {}) as Record<string, unknown>;
      const definesTerms = !!(intakeProfile.entity_name && intakeProfile.industry);
      console.log(
        JSON.stringify({
          evt: "cyber_defines_terms_decision",
          fn: "run-cppa-cybersecurity",
          defines_terms: definesTerms,
          reason: definesTerms
            ? "profile present — § 1798.140(ag) business + (e) service-provider terms in scope"
            : "skeleton intake — defined-term consumers not detected; skipping § 1798.140 supply",
        }),
      );
      if (definesTerms) {
        const { data: defRows } = await supabase
          .from("cppa_authorities")
          .select("citation, full_text")
          .eq("citation", `Cal. Civ. Code ${S} 1798.140`)
          .eq("status", "current")
          .limit(1);
        if (defRows && defRows.length > 0 && (defRows[0] as any).full_text) {
          const r = defRows[0] as any;
          caDefinitionsAuthorityBlock =
            "\n\nCCPA DEFINITIONS AUTHORITY -- SUPPLIED VERBATIM TEXT (cite Cal. Civ. Code " + S + " 1798.140 content ONLY from the text below, never from recollection):\n" +
            `[${r.citation}]\n${r.full_text}`;
        } else {
          console.warn("[cppa-cyber] 1798.140 authority row unavailable");
        }
      }
    }



    const today = new Date().toISOString().slice(0, 10);
    // R1b2 — compute deterministic TEST-STATES and inject them into the system content.
    const cyberTestStates = computeCyberTestStates((row.intake_data as Record<string, any>) ?? {});
    const cyberTestStatesBlock = renderCyberTestStatesBlock(cyberTestStates);
    // C2-1 — FSOR agency-position anchor beneath the zero-trust deletion note.
    // Warn-and-ship-unanchored when no matching row exists.
    const cyberFsorAnchorBlock = await buildFsorAnchorBlock(supabase, CYBER_ZERO_TRUST_FSOR_ANCHOR_SPECS);
    // C2-2 — corpus-sourced CPPA canonical deadlines + startup drift-lint.
    verifyCppaDeadlineDrift(supabase, "cyber");
    verifyIcoFiguresDrift();
    const cyberDeadlineBlock = await buildCppaDeadlineBlock(supabase, "cyber");
    const cyberInjectedParts = [cyberTestStatesBlock];
    if (cyberFsorAnchorBlock) cyberInjectedParts.push(cyberFsorAnchorBlock);
    if (cyberDeadlineBlock) cyberInjectedParts.push(cyberDeadlineBlock);
    const cyberInjected = cyberInjectedParts.join("\n\n");
    const system = buildSystemContent({
      toolModule: CPPA_CYBER_TOOL_MODULE,
      currentDate: today,
      cache: true,
      injected: cyberInjected,
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
      "priority": "Immediate | Within 90 days | Within 6 months | Monitor",
      "evidence": "string (REQUIRED; 1 sentence naming the specific intake artefact — vendor / coverage figure / cadence / ISO date / ticket id — that supports the score; if the intake supplies nothing bearing on this control, write exactly: 'the intake supplies no artefact for this component')",
      "differentiator": "string (REQUIRED; 1 sentence naming the specific intake fact that distinguishes THIS control's score/status from its sibling controls, or — when the score is uniform across the report — why the uniformity reflects evidentiary depth rather than implementation failure; must NOT be a boilerplate sentence)",
      "rank": 0
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
${generatorScoringRulesText()}
- If the intake provides no information bearing on a control, set status to "Insufficient information" and omit the score (leave it as 0); do NOT label it "Gap".
The status MUST be consistent with the score. Never assign "Implemented" to a control scoring 90 or above.
- ABSENT-CONTROL BINDING: The score and status MUST be consistent with the finding text. If the finding states the control is absent, "not in the intake", "no dedicated/discrete control entry", or a "material gap", the score MUST fall in the 21–59 Gap band with status "Gap" — never 60 or above, and never "Implemented" or "Mature". If there is genuinely no information bearing on the control, use status "Insufficient information" and leave the score at 0. A finding that describes absence or a gap may not carry an "Implemented"/"Mature" status or a score ≥ 60.
- EVIDENCE / DIFFERENTIATOR / RANK (QB-P25 CYBER): every control MUST include the three new fields — evidence, differentiator, and rank — as specified in the QB-P25 CYBER SCHEMA rule in the system prompt. Both evidence and differentiator are USER-FACING output for the reader's audit-prep record — NEVER phrase them as internal notes, model reasoning, or self-critique. rank is an integer 1..18 with 1 = highest reader-priority (worst gap / greatest exposure) and 18 = lowest; ranks must be UNIQUE across the report's controls. When emitting a half, assign ranks within your half consistent with severity (the system will renumber to 1..18 across the full report if needed).

SECTOR RULES — include the following additional context in findings and remediation where applicable to the detected industry sector (from intake industry_sector field):
- Financial Services / Fintech: note overlap with GLBA Safeguards Rule (FTC, 16 CFR Part 314) where relevant to the control. Controls for encryption, access control, vendor oversight, and incident response all have GLBA Safeguards Rule counterparts. Mention "GLBA Safeguards Rule alignment" where applicable.
- Insurance: note overlap with GLBA for insurance holding companies and NAIC Cybersecurity Model Law (MDL-668) equivalents where relevant.
- Energy / Utilities: note NERC CIP standards (CIP-002 through CIP-014) for any bulk-power system operator context; these directly overlap with network segmentation, access controls, configuration management, and incident response controls.
- Telecommunications: note CPNI rules (47 CFR Part 64) where access control and data-breach notification controls are assessed.
- Smart Home / IoT: note California IoT Security Law (Cal. Civ. Code §§ 1798.91.04–1798.91.06) requiring reasonable security features for connected devices; relevant to secure configuration, vulnerability management, and authentication controls.
- Healthcare / Life Sciences: note HIPAA Security Rule alignment where relevant (45 CFR Part 164). Mention "HIPAA Security Rule" in findings where applicable.
- Pharma / Clinical Research: note FDA 21 CFR Part 11 requirements for audit logging and access controls on systems handling electronic records.
- Children / EdTech: note COPPA security obligations where personal information of minors is involved.

GOVERNMENT/NONPROFIT APPLICABILITY — add a sentence to the finding for each control if the intake indicates the entity is a government agency or public-sector body: "Note: CPPA cybersecurity audit obligations under 11 CCR §§ 7120–7124 apply only to 'businesses' as defined in Cal. Civ. Code § 1798.140(ag). State and local government agencies are expressly excluded from the CCPA definition of 'business.' This readiness assessment assumes CPPA applicability; the entity should confirm its status as a covered business before relying on this report for CPPA compliance purposes." If the entity appears to be a nonprofit, add: "CPPA cybersecurity obligations apply only to entities meeting at least one of the three CCPA business thresholds (annual gross revenues >$25M; processing PI of 100,000+ consumers/households; or deriving 50%+ of revenue from selling/sharing PI). This readiness assessment assumes threshold applicability; the entity should verify its status."${iotAuthorityBlock}${caBreachAuthorityBlock}${caDefinitionsAuthorityBlock}`;
    }

    function buildSynthesisPrompt(controlsDigest: string, computedScore: number): string {
      return `Based on this organisation's CPPA cybersecurity readiness intake and the per-control assessment digest below, produce the summary sections of the report. Do NOT emit controls or annotations.

Intake data:
${intakeJson}

Per-control digest (already assessed; do not re-score):
${controlsDigest}

System-computed overall_score (mean of the N assessed controls, rounded; N excludes any control with status "Insufficient information"): ${computedScore}
Your executive_summary and readiness_level MUST be consistent with this overall_score.

NEXT-STEPS CONSISTENCY AND CAP (QB-P25 CYBER): every deadline in next_steps must restate a deadline already given in a control's remediation — never introduce a different timeframe for the same action. Refer to controls by NAME, never "component N" (component numbers are not rendered). The next_steps array is CAPPED AT THREE items — never emit more than three. Each next_step is an OBJECT { text, owner, trigger } where 'owner' names the intake-supplied accountable function (e.g. "Security Engineering", "the DPO", "the incident-response lead") and 'trigger' names the concrete artefact or condition that closes the step (e.g. "when the c14_secure_dev intake entry supplies a SAST tool name"). String-only next_steps are legacy and will be normalised; new output MUST use the object form.

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
  "next_steps": [ { "text": "string", "owner": "string (intake-named accountable function)", "trigger": "string (concrete artefact / condition that closes the step)" } ],
  "information_needed": [
    { "field": "<intake key that exists in the intake — for a per-control gap use the DOTTED ask path 'controls.<slug>', e.g. controls.c14_secure_dev>", "dimensions": "<what specifically to add, as dimensions — never suggested values>", "provision": "<already-cited provision that makes these dimensions relevant>", "enables": "<which section/determination of this report completes with it>" }
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
      const _suppWs6 = renderSupplementalBlock({ responses: (row.intake_data as any)?.supplemental_responses, context: (row.intake_data as any)?.supplemental_context });
      const user = (extra ? `${base}\n\n${extra}` : base) + _suppWs6;
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
      const _suppWs6 = renderSupplementalBlock({ responses: (row.intake_data as any)?.supplemental_responses, context: (row.intake_data as any)?.supplemental_context });
      const user = (extra ? `${base}\n\n${extra}` : base) + _suppWs6;
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
        // QB-P25 CYBER — preserve/clean new customer-facing fields.
        evidence: stripMd(c?.evidence),
        differentiator: stripMd(c?.differentiator),
        rank: Number.isFinite(Number(c?.rank)) ? Number(c.rank) : null,
      }));
      // QB-P25 CYBER — RANK NORMALISATION: renumber ranks to a unique 1..N run
      // (worst-priority first). If the model omitted or duplicated ranks, sort
      // by (status severity, ascending score) to derive a deterministic order.
      const STATUS_WEIGHT: Record<string, number> = {
        "critical gap": 0, "gap": 1, "partial": 2,
        "insufficient information": 3, "implemented": 4, "mature": 5,
      };
      const ordered = [...r.controls]
        .map((c: any, idx: number) => ({ c, idx }))
        .sort((a: any, b: any) => {
          const wa = STATUS_WEIGHT[String(a.c?.status ?? "").toLowerCase()] ?? 6;
          const wb = STATUS_WEIGHT[String(b.c?.status ?? "").toLowerCase()] ?? 6;
          if (wa !== wb) return wa - wb;
          const sa = Number(a.c?.score) || 0;
          const sb = Number(b.c?.score) || 0;
          return sa - sb;
        });
      ordered.forEach((o: any, i: number) => { r.controls[o.idx].rank = i + 1; });
      r.top_risks = (Array.isArray(r.top_risks) ? r.top_risks : []).map((t: any) => ({
        ...t,
        title: stripMd(t?.title),
        description: cleanSection(t?.description),
        consequence: cleanSection(t?.consequence),
      }));
      // QB-P25 CYBER — next_steps: coerce legacy strings into { text, owner, trigger }
      // and CAP at 3 items.
      const nsRaw = Array.isArray(r.next_steps) ? r.next_steps : [];
      r.next_steps = nsRaw.slice(0, 3).map((s: any) => {
        if (typeof s === "string") {
          return { text: cleanSection(s), owner: "", trigger: "" };
        }
        return {
          text: cleanSection(s?.text ?? ""),
          owner: stripMd(s?.owner ?? ""),
          trigger: stripMd(s?.trigger ?? ""),
        };
      });
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
      for (const n of (r?.next_steps || [])) {
        // QB-P25 CYBER — next_steps are objects { text, owner, trigger }.
        if (typeof n === "string") parts.push(n);
        else parts.push([n?.text, n?.owner, n?.trigger].filter(Boolean).join(" "));
      }
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
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "error", last_error: "terminal_error_halves: one or both controls halves returned null (see prior console.error/parse-failure logs for detail)" }, { fn: "run-cppa-cybersecurity", phase: "terminal_error_halves" });
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
          await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "error", last_error: `terminal_error_controls: controls incomplete after retry; missing=${JSON.stringify(v2.missing).slice(0, 500)}` }, { fn: "run-cppa-cybersecurity", phase: "terminal_error_controls" });
          return;
        }
      }
    }

    let allControls = assembleControls(half1!.controls, half2!.controls);
    const overall_score = computeOverallScore(allControls);
    const digest = buildDigest(allControls);

    const synthesis = await callSynthesis(digest, overall_score, "");
    if (!synthesis || typeof synthesis !== "object") {
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "error", last_error: "terminal_error_synthesis: synthesis call returned null or non-object (see prior parse-failure/truncation logs for detail)" }, { fn: "run-cppa-cybersecurity", phase: "terminal_error_synthesis" });
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

    // R1b2 — post-lint T-2/T-3/T-4 gate on the SYNTHESIS output only (report-level
    // prose). Per courier Option A: the binding-test/collapse/enhancement rules
    // target executive_summary, top_risks, next_steps, and enforcement_context;
    // per-control JSON stays under the lint pipeline above. One retry cap, then
    // proceed with the violation logged (same posture as T-1 in risk).
    const t234Violations: any[] = [];
    {
      const hedgeRe = /\b(cannot be determined|insufficient basis|not established|no basis to assess|indeterminate|please confirm|please verify)\b/i;
      const collapseRe = /\b(cannot be determined|no basis to assess|not established)\b/i;
      const depthLangRe = /\b(could|would strengthen|additional context|nice to have|consider (?:adding|providing)|optionally|for completeness|to enrich)\b/i;
      const statAnchorRe = /(§\s*\d|11\s*CCR|1798\.|section\s+\d)/i;

      function detectViolations(): { t2: any[]; t3: any[]; t4: any[] } {
        const t2: any[] = [];
        const t3: any[] = [];
        const t4: any[] = [];

        // T-2: RESOLVED per-control test vs contradiction in that control's finding.
        const controlsArr: any[] = Array.isArray(report.controls) ? report.controls : [];
        const CONTROL_KEYS = [
          "c1_auth", "c2_encryption", "c3_account_access", "c4_inventory", "c5_secure_config",
          "c6_vuln_mgmt", "c7_audit_logs", "c8_network_mon", "c9_anti_malware", "c10_segmentation",
          "c11_port_protocol", "c12_awareness", "c13_training", "c14_secure_dev", "c15_third_party",
          "c16_retention", "c17_incident", "c18_continuity",
        ];
        CONTROL_KEYS.forEach((key, idx) => {
          const id = `M${4 + idx}`;
          const ts = cyberTestStates[id];
          if (!ts || ts.state !== "resolved_met") return;
          const c = controlsArr[idx];
          const status = String(c?.status ?? "");
          const finding = String(c?.finding ?? "");
          if (/^\s*Insufficient information\s*$/i.test(status)) {
            t2.push({ test: id, control: key, kind: "status_contradicts_resolved", detail: `status="${status}" while intake supplied maturity` });
          }
          if (/the intake does not (?:establish|address|include)/i.test(finding) || /no discrete .* entry/i.test(finding)) {
            t2.push({ test: id, control: key, kind: "finding_contradicts_resolved", detail: finding.slice(0, 160) });
          }
        });

        // T-2 (M1/M2/M3): synthesis prose must not re-ask what M1/M2/M3 already RESOLVED.
        const synthProseFields: Array<[string, string]> = [
          ["executive_summary", String(report.executive_summary ?? "")],
          ["enforcement_context", String((report as any).enforcement_context ?? "")],
        ];
        const nextSteps: any[] = Array.isArray(report.next_steps) ? report.next_steps : [];
        const nextStepsText = nextSteps.map((s: any) => typeof s === "string" ? s : (s?.action ?? s?.text ?? "")).join(" | ");
        for (const [testId, sourceKey] of [["M1", "framework"], ["M2", "incidents_12mo"], ["M3", "last_audit"]] as const) {
          const ts = cyberTestStates[testId];
          if (!ts || ts.state === "indeterminate") continue;
          const askRe = new RegExp(`\\b(?:confirm|verify|provide|document|clarify)[^.]{0,80}\\b${sourceKey.replace("_", "\\s?_?")}\\b`, "i");
          if (askRe.test(nextStepsText)) {
            t2.push({ test: testId, kind: "next_steps_reasks_resolved", detail: `next_steps re-asks ${sourceKey}` });
          }
        }

        // T-3: banned-collapse phrasing in synthesis prose where the record has
        // credited evidence (any RESOLVED_MET c{N}_answered state).
        const anyControlAnswered = CONTROL_KEYS.some((_, idx) => cyberTestStates[`M${4 + idx}`]?.state === "resolved_met");
        if (anyControlAnswered) {
          for (const [field, text] of synthProseFields) {
            if (collapseRe.test(text)) t3.push({ field, detail: text.slice(0, 160) });
          }
        }

        // T-4: enhancement-class next_steps entries — depth language without a
        // statutory anchor. Verdict-blocking or record-completeness items must
        // cite a provision (§ 7122(g), § 7123, Cal. Civ. Code, etc.).
        for (const step of nextSteps) {
          const t = typeof step === "string" ? step : String(step?.action ?? step?.text ?? "");
          if (!t) continue;
          const hasDepth = depthLangRe.test(t);
          const hasAnchor = statAnchorRe.test(t);
          if (hasDepth && !hasAnchor) t4.push({ detail: t.slice(0, 160) });
        }

        return { t2, t3, t4 };
      }

      let detected = detectViolations();
      let t5Hits = detectTestStatesLeak(report);
      const totalHits = detected.t2.length + detected.t3.length + detected.t4.length + t5Hits.length;
      if (totalHits > 0) {
        console.warn(JSON.stringify({
          evt: "post_lint_violation",
          fn: "run-cppa-cybersecurity",
          t2: detected.t2.slice(0, 6),
          t3: detected.t3.slice(0, 6),
          t4: detected.t4.slice(0, 6),
          t5: t5Hits.slice(0, 6),
        }));
        // ONE retry: synthesis only, with the violation details as retry instruction.
        try {
          const parts: string[] = [];
          if (detected.t2.length) parts.push(`T-2 (TEST-STATES BINDING) — do NOT contradict RESOLVED states or re-ask them: ${detected.t2.map((v) => `${v.test}:${v.kind}`).join(", ")}`);
          if (detected.t3.length) parts.push(`T-3 (BANNED COLLAPSE) — the intake supplied per-control maturity, do NOT collapse the record with 'cannot be determined'/'no basis to assess'/'not established' in executive_summary or enforcement_context`);
          if (detected.t4.length) parts.push(`T-4 (ENHANCEMENT-CLASS) — every next_steps entry must be verdict-blocking or record-completeness, anchored to a cited provision; remove pure depth items`);
          if (t5Hits.length) parts.push(`T-5 (TEST-STATES VOCABULARY LEAKAGE) — remove every reference to TEST-STATES, test ids (M1, M2, …), and state tokens (resolved_met / RESOLVED_* / INDETERMINATE / CANDIDATE) from executive_summary, per-control finding and remediation, next_steps, and enforcement_context; state the conclusion with its factual basis. Leaked at: ${t5Hits.slice(0, 6).map((h) => `${h.path}:"${h.match}"`).join(", ")}`);
          const retryInstr = `PREVIOUS ATTEMPT REJECTED by post-lint TEST-STATES gate: ${parts.join(" | ")}. Produce the JSON again, correcting these defects silently. Do not mention this instruction in the output.`;
          const digest2 = buildDigest(allControls);
          const r = await callSynthesis(digest2, (report as any).overall_score ?? 0, retryInstr);
          if (r) {
            report.executive_summary = r.executive_summary;
            report.readiness_level = r.readiness_level;
            report.top_risks = Array.isArray(r.top_risks) ? r.top_risks : report.top_risks;
            report.enforcement_context = r.enforcement_context;
            report.next_steps = Array.isArray(r.next_steps) ? r.next_steps : report.next_steps;
            normaliseReport(report);
          }
          detected = detectViolations();
          t5Hits = detectTestStatesLeak(report);
          const stillHits = detected.t2.length + detected.t3.length + detected.t4.length + t5Hits.length;
          if (stillHits > 0) {
            console.warn(JSON.stringify({ evt: "post_lint_violation_after_retry", fn: "run-cppa-cybersecurity", remaining: stillHits, t5_remaining: t5Hits.length }));
          }
        } catch (e) {
          console.warn("[CPPA Cyber] T-2/T-3/T-4/T-5 retry failed (non-fatal):", e);
        }
        for (const v of detected.t2) t234Violations.push({ rule: "T-2", ...v });
        for (const v of detected.t3) t234Violations.push({ rule: "T-3", ...v });
        for (const v of detected.t4) t234Violations.push({ rule: "T-4", ...v });
        for (const v of t5Hits) t234Violations.push({ rule: "T-5", field: v.path, match: v.match, context: v.context });
      }
    }
    for (const v of t234Violations) lintViolations.push(v);

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
      // Unconditional: Cal. Civ. Code § 1798.82 (Customer Records Act breach
      // notification). Cyber is a California tool and the verbatim text is
      // injected via caBreachAuthorityBlock below, so the lint supply must
      // reflect it. Source relabelled to CA_BREACH in the corpus.
      `Cal. Civ. Code ${S} 1798.82`,
      // Unconditional: Cal. Civ. Code § 1798.140 (CCPA definitions). Verbatim
      // text injected via caDefinitionsAuthorityBlock; lint supply must reflect it.
      `Cal. Civ. Code ${S} 1798.140`,
      ...(isConnectedDeviceSector ? [
        `Cal. Civ. Code ${S} 1798.91.04`,
        `Cal. Civ. Code ${S} 1798.91.05`,
        `Cal. Civ. Code ${S} 1798.91.06`,
      ] : []),
    ];

    const { data: authRows } = await supabase
      .from("cppa_authorities")
      .select("id, citation, version, authority_type, authority_weight, effective_date, official_url, title, status")
      .in("citation", CYBER_CITATIONS)
      .eq("status", "current");
    const { data: fsorRows } = await supabase
      .from("cppa_fsor_commentary")
      .select("id, regulation_citation, page_ref, fsor_package, comment_summary, agency_response, agency_position_summary, source_url")
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
          // Constrain control-level FSOR supplements to the control's own § 7123
          // context. Rows citing other sections (e.g. § 7120 threshold commentary,
          // § 7122, § 7124) must NOT be attached to a specific 7123(c) control
          // slot — absence is better than a mislabeled pairing. Bare "11 CCR § 7123"
          // (applies to all controls) and the control's own subsection both pass.
          if (!cite.startsWith("11 CCR ")) return false;
          if (!cite.includes("7123")) return false;
          if (/^11 CCR § 7123$/.test(cite)) return true;
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

    // QB7-7 sentence-boundary truncation for FSOR commentary previews: never cut mid-sentence.
    function truncateAtSentence(text: string | null | undefined, maxLen = 600): string | null {
      if (!text) return text ?? null;
      const t = String(text);
      if (t.length <= maxLen) return t;
      const window = t.slice(0, maxLen);
      const lastBoundary = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
      if (lastBoundary > maxLen * 0.5) return window.slice(0, lastBoundary + 1);
      return window + "…";
    }

    function shapeFsorItem(r: any): any {
      return {
        ...r,
        agency_response: truncateAtSentence(r?.agency_response ?? null),
        agency_position_summary: r?.agency_position_summary ?? null,
        agency_response_verbatim: true,
        comment_summary: truncateAtSentence(r?.comment_summary ?? null),
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
          .map(shapeFsorItem)
          .map((item: any) => {
            // QB13-10(b): label general FSOR commentary that doesn't reference the
            // control's own subsection.
            try {
              const subMatch = String(citation).match(/\(([a-z])\)(?:\(\d+\))?/i);
              const sub = subMatch ? subMatch[0] : "";
              const itemCite = String(item?.citation ?? "");
              const itemText = String(item?.text ?? "");
              const referencesSub = sub && (itemCite.includes(sub) || itemText.includes(sub));
              const label = "General § 7123 agency response; no subsection-specific interpretive commentary was identified in the FSOR corpus for this component. ";
              if (sub && !referencesSub && !itemText.startsWith(label)) {
                console.warn(`[CYBER] QB13-10(b): labelled general FSOR commentary for ${c?.control}`);
                item.text = label + itemText;
              }
            } catch (_e) { /* non-fatal */ }
            return item;
          }),
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
    const guarded = guardInformationNeeded(report, ((row as any).intake_data as Record<string, unknown>) ?? {}, "cppa_cybersecurity");
    report = guarded.report;

    // CPPA-HF6R Task C — deterministic count-vs-list reconciliation for
    // exec-summary enumerations. Scans executive_summary for phrases like
    // "Nine of the 18 components: A; B; C" or "Five additional …: X; Y"
    // and rewrites the count word/number to equal the actual enumerated
    // item count so number and list agree. Covers word-form and digit
    // count tokens; both directions (over- and under-count).
    try {
      const NUM_WORDS: Record<string, number> = {
        one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
        eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
        seventeen:17,eighteen:18,nineteen:19,twenty:20,
      };
      const WORD_BY_NUM: Record<number, string> = Object.fromEntries(
        Object.entries(NUM_WORDS).map(([w, n]) => [n, w]),
      );
      const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
      const reconcileEnumCount = (prose: string): { out: string; fixed: number } => {
        if (typeof prose !== "string" || !prose) return { out: prose, fixed: 0 };
        let fixed = 0;
        // Pattern: (COUNT) [of the 18 components|additional] ... (: or —) ITEMS
        // ITEMS run until a hard stop (". " or end). Items are separated by
        // "; " (primary) or ", and " / ", " (fallback if no semicolons).
        const RE = /\b(?:([A-Z]?[a-z]+)|(\d{1,2}))\b(\s+(?:of\s+the\s+18\s+(?:components|controls|required[^\n:]{0,40})[^:\n\u2013\u2014-]{0,80}|additional[^:\n\u2014\u2013-]{0,80}))([:\u2014\u2013-])\s*([^.\n]+?)(?=\.\s|\.$|$)/g;
        const next = prose.replace(RE, (m, wRaw, nRaw, mid, sep, tail) => {
          const wLower = typeof wRaw === "string" ? wRaw.toLowerCase() : "";
          const asWord = wLower && wLower in NUM_WORDS;
          const asDigit = typeof nRaw === "string" && nRaw.length > 0;
          if (!asWord && !asDigit) return m;
          const stated = asWord ? NUM_WORDS[wLower] : Number(nRaw);
          if (!Number.isFinite(stated) || stated <= 0 || stated > 20) return m;
          // Count items in tail: split on semicolons first; if only one
          // segment, try ", and " / ", " splits (but require ≥2 result).
          let items = tail.split(/;\s*/).map((s: string) => s.trim()).filter(Boolean);
          if (items.length < 2) {
            const alt = tail.split(/,\s*(?:and\s+)?/).map((s: string) => s.trim()).filter(Boolean);
            if (alt.length >= 2) items = alt;
          }
          const actual = items.length;
          if (!Number.isFinite(actual) || actual <= 0 || actual > 20) return m;
          if (actual === stated) return m;
          fixed++;
          if (asWord) {
            const replacement = WORD_BY_NUM[actual] ?? String(actual);
            const wasCap = wRaw.charAt(0) === wRaw.charAt(0).toUpperCase();
            const newWord = wasCap ? cap(replacement) : replacement;
            return `${newWord}${mid}${sep} ${tail}`;
          }
          return `${String(actual)}${mid}${sep} ${tail}`;
        });
        return { out: next, fixed };
      };
      const surfaces: Array<[string, string]> = [
        ["executive_summary", String((report as any).executive_summary ?? "")],
      ];
      // top_risks/next_steps entries may also carry summary counts.
      if (Array.isArray((report as any).top_risks)) {
        for (let i = 0; i < (report as any).top_risks.length; i++) {
          const t = (report as any).top_risks[i];
          if (typeof t === "string") surfaces.push([`top_risks[${i}]`, t]);
        }
      }
      if (Array.isArray((report as any).next_steps)) {
        for (let i = 0; i < (report as any).next_steps.length; i++) {
          const t = (report as any).next_steps[i];
          if (typeof t === "string") surfaces.push([`next_steps[${i}]`, t]);
        }
      }
      let totalFixed = 0;
      for (const [key, val] of surfaces) {
        const { out, fixed } = reconcileEnumCount(val);
        if (fixed > 0) {
          totalFixed += fixed;
          if (key === "executive_summary") {
            (report as any).executive_summary = out;
          } else {
            const m = key.match(/^(top_risks|next_steps)\[(\d+)\]$/);
            if (m) (report as any)[m[1]][Number(m[2])] = out;
          }
        }
      }
      if (totalFixed > 0) {
        console.warn(`[CPPA Cyber] HF6R Task C: reconciled ${totalFixed} exec-summary count(s) with list length`);
        const meta: any = (report as any)._meta ?? ((report as any)._meta = {});
        meta.hf6r_count_reconciled = totalFixed;
      }
    } catch (_) { /* non-fatal */ }

    // W6-CYBER-FIX (2026-07-24) — atomic post-generation scrub applied to
    // the fully-assembled report AFTER all prior scrubs (component-cite,
    // slug, enforcement-tag, exec-summary count reconciliation) and BEFORE
    // the _meta stamp / terminal write. Idempotent, fail-open.
    try {
      const intakeForW6 = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const w6 = applyW6CyberFix(report as any, intakeForW6 as any);
      console.log(JSON.stringify({
        evt: "w6_cyber_fix_applied",
        build_stamp: BUILD_STAMP, w6_version: W6_CYBER_FIX_VERSION,
        ...w6,
      }));
      (report as any)._w6_cyber_fix = { version: W6_CYBER_FIX_VERSION, ...w6 };
    } catch (w6Err) {
      console.error("[W6-CYBER-FIX] non-fatal:", String(w6Err));
    }

    // W9 TURN 3 — deterministic slot reprojection (component_matrix,
    // scope_justification, top_3_actions). Runs after W6 scrub; fail-open.
    try {
      const intakeForW9 = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const w9 = attachAndValidateCyberSlots(report as any, intakeForW9);
      console.log(JSON.stringify({
        evt: "w9_cyber_slots_attached",
        build_stamp: BUILD_STAMP,
        w9_stamp: W9_CYBER_SLOTS_STAMP,
        attached: w9.attached,
        validation: w9.validation,
      }));
      (report as any)._w9_cyber_slots = { stamp: W9_CYBER_SLOTS_STAMP, ...w9 };
    } catch (w9Err) {
      console.error("[W9-CYBER-TURN3] non-fatal:", String(w9Err));
    }

    // A2 (2026-07-24) — deterministic aggregates injection + authored-aggregate
    // scrub. Runs AFTER W9 slots so aggregates see the final controls array.
    // Fail-open.
    try {
      const w10 = attachCyberAggregates(report as any);
      console.log(JSON.stringify({
        evt: "w10_cyber_aggregates_attached",
        build_stamp: BUILD_STAMP,
        w10_stamp: W10_CYBER_AGG_STAMP,
        aggregates: w10.aggregates,
        authored_aggregates_replaced: w10.authoredAggregatesReplaced,
        slots_injected: w10.slotsInjected,
      }));
      (report as any)._w10_cyber_aggregates = {
        stamp: W10_CYBER_AGG_STAMP,
        authored_aggregates_replaced: w10.authoredAggregatesReplaced,
      };
    } catch (w10Err) {
      console.error("[W10-CYBER-AGG] non-fatal:", String(w10Err));
    }

    // WAVE12-FIX TURN E — defensive crosswalk sanitizer. Runs LAST among
    // scrubs so it sees the final assembled prose (post-W6, post-W9, post-W10).
    // Drops truncated ";"/":" fragments, drops sentences with unbalanced
    // parens, and dedupes exact-match operative sentences per surface.
    // Telemetry lands under _meta.internal.crosswalk (NOT customer-visible).
    // Fail-open.
    try {
      const e1 = applyW12CyberE1(report as any);
      console.log(JSON.stringify({
        evt: "w12_cyber_e1_applied",
        build_stamp: BUILD_STAMP,
        e1_stamp: W12_CYBER_E1_STAMP,
        counters: e1.counters,
      }));
      const meta: any = (report as any)._meta ?? ((report as any)._meta = {});
      meta.internal = meta.internal ?? {};
      meta.internal.crosswalk = { stamp: W12_CYBER_E1_STAMP, ...e1.counters };
    } catch (e1Err) {
      console.error("[W12-CYBER-E1] non-fatal:", String(e1Err));
    }

    (report as any)._meta = { ...((report as any)._meta ?? {}), prompt_version: stampPromptVersion("cppa-cybersecurity", "cyber-cppa-hf6@2026-07-20"), build_stamp: BUILD_STAMP };

    // Stage 1: metering + version retention (written BEFORE status:complete).
    await recordRunMeterAndVersion(supabase, {
      toolType: "cppa_cybersecurity",
      assessmentId: assessment_id,
      userId: (row as any).user_id ?? null,
      intake: ((row as any).intake_data as Record<string, unknown>) ?? {},
      reportData: report,
    });


    try { const _prose = extractProseFromReport(report); const _roster = extractIntakeRoster((row as any).intake_data ?? {}); const _det = [...runFormatChecksGeneric(_prose, { intakeRoster: _roster }), ...runCppaHf1Checks(_prose)].map(x=>({...x, check_type:'deterministic' as const})); attachDeterministicChecks(report as any, _det as any); } catch(_) {}
    const completeWrite = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "complete", report_data: report, obligation_snapshot }, { fn: "run-cppa-cybersecurity", phase: "terminal_complete" });
    if (!completeWrite.ok) {
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "error", last_error: `terminal_fallback: complete-write failed: ${(completeWrite.message ?? "unknown").slice(0, 1500)}` }, { fn: "run-cppa-cybersecurity", phase: "terminal_fallback" });
    }

    // L2 — observe-only citation lint (never blocks, never mutates output).
    try {
      await observeCitations(
        supabase,
        "run-cppa-cybersecurity",
        assessment_id,
        JSON.stringify(report),
        (authRows ?? []).map((a: any) => a?.citation).filter(Boolean),
      );
    } catch (obsErr) {
      console.error("[citation-observe] non-fatal:", String(obsErr));
    }



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
    await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "error", last_error: `terminal_error_catch: ${boundedErr(e)}` }, { fn: "run-cppa-cybersecurity", phase: "terminal_error_catch" });
  }
}

Deno.serve(async (req) => {
  console.log(`[qb9-rcb1] run-cppa-cybersecurity build active · core=${PROMPT_CORE_VERSION} · build_stamp=${BUILD_STAMP}`);
  console.log(JSON.stringify({ evt: "cyber_build_stamp", build_stamp: BUILD_STAMP }));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req, "user");
    if (!caller.ok) {
      return new Response(JSON.stringify({ error: caller.error ?? "Unauthorized" }), {
        status: caller.status ?? 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const __body = await req.json();
    const { assessment_id } = __body;
    if (!assessment_id) {
      return new Response(JSON.stringify({ error: "assessment_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // RC-B.1 — scoped-delta revision short-circuit.
    {
      const __rev = await handleRevisionMode(supabase, __body, { toolType: "cppa_cybersecurity" });
      if (__rev) return __rev;
    }

    const ent = await requireEntitlement(caller, "cppa_cybersecurity", { rowId: assessment_id });
    if (!ent.ok) {
      console.log(JSON.stringify({ evt: "entitlement_denied", fn: "run-cppa-cybersecurity", reason: ent.reason }));
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: ent.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
