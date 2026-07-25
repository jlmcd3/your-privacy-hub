// qb8 build active
import { attachDeterministicChecks, extractProseFromReport } from '../_shared/advisory-voice.ts';
import { runFormatChecksGeneric } from '../_shared/grader/format-checks.ts';
import { extractIntakeRoster } from '../_shared/grader/intake-roster.ts';
import { runAdmtHf1Checks } from '../_shared/grader/cppa-hf1-checks.ts';
// run-meter deploy-check v1
// supabase/functions/run-admt-checker/index.ts
// ADMT Compliance Assessment — gap analysis generator.
// Pipeline: retrieve corpus → generate gap analysis JSON → persist.
// RC-P6: training_data_use enum shrunk to Yes/No; prior_access_requests_12mo removed.
export const BUILD_STAMP = "p012-admt@2026-07-25T05:50:24Z";
console.log(`[run-admt-checker] boot build_stamp=${BUILD_STAMP}`);
console.log(JSON.stringify({ evt: "admt_build_stamp", fn: "run-admt-checker", build_stamp: BUILD_STAMP }));
// S-B INTAKE-FACT-LEDGER (sb-fl-w1) — wiring turn 2/3 (ADMT).
// Blocks wave-14/15 unsupported-positive, contradiction, and
// negative-from-silence classes on client-fact surfaces. Runs BEFORE the
// W9-ADMT-WIRE L1 VA stamp pass so citations attach to rewritten claim text.
import {
  buildFactLedger,
  enforceLedger,
  FACT_LEDGER_VERSION,
} from "../_shared/intake/fact-ledger.ts";
// LEAK-PREV-P0 — customer-message catalog for insufficient-basis fallback.
import { renderMessage } from "../_shared/customer-messages.ts";
console.log(JSON.stringify({
  evt: "fact_ledger_loaded", fn: "run-admt-checker",
  version: FACT_LEDGER_VERSION,
}));
// TURN 2 — deterministic slots (applicability_verdict, deadline_table, adequacy_finding).
import {
  attachAndValidateAdmtSlots,
  W9_ADMT_SLOTS_STAMP,
} from "./_w9_admt_slots.ts";
console.log(`[run-admt-checker] boot admt_slots_stamp=${W9_ADMT_SLOTS_STAMP}`);
import { applyW6AdmtFix, W6_ADMT_FIX_VERSION } from "./_w6_admt_fix.ts";
import { applyW19AdmtJoin2, W19_ADMT_JOIN2_STAMP } from "./_w19_admt_join2.ts";
console.log(`[run-admt-checker] boot admt_join2_stamp=${W19_ADMT_JOIN2_STAMP}`);
// ADMT-FIX-W9 — pre-emit deterministic gates (h6, e6, reasoning-leak, invented-section).
import { applyW9AdmtPreEmitGates, W9_ADMT_PRE_EMIT_STAMP } from "./_w9_admt_pre_emit_gates.ts";
console.log(`[run-admt-checker] boot admt_pre_emit_stamp=${W9_ADMT_PRE_EMIT_STAMP}`);
import { readAdmtScope, normalizeAdmtScopeShape } from "../_shared/admt-scope-contract.ts";
import { buildAdmtVerifiedWhitelist } from "../_shared/admt-citation-registry.ts";
import { buildFsorAnchorBlock, ADMT_FSOR_ANCHOR_SPECS } from "../_shared/fsor-anchor-block.ts";
import { buildCppaDeadlineBlock, verifyCppaDeadlineDrift } from "../_shared/cppa-deadline-registry.ts";
// W9-ADMT-WIRE — L1 verified-authority resolver + admt registry (S-A live).
// Generator never authors a citation: it emits proposition_key on findings;
// this resolver stamps citation/subsection/verbatim_quote at emit time.
import {
  ADMT_VERIFIED_AUTHORITIES,
  ADMT_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/admt-verified-authorities.ts";
import {
  resolveByPropositionKey,
  resolveByCitationString,
  normalizeCitationString,
  registrySize as vaRegistrySize,
} from "../_shared/verified-authority-resolver.ts";
// R-TURN-1 item 3 — regenerated from CITATION_REGISTRY at module load so
// prompt and registry cannot drift.
const ADMT_VERIFIED_WHITELIST_TEXT = buildAdmtVerifiedWhitelist().join(", ");

// W9-ADMT-WIRE — VERIFIED-AUTHORITY BLOCK, injected into the system prompt so
// the model composes prose around stamped pinpoints (never authors §-tokens
// from recall). Single source of truth: admt-verified-authorities.ts. This
// block REPLACES the prompt-text verified-registry list previously embedded
// inside POST-C1-FIX-3(b) — one source of truth, per ACK 2 standing order.
function buildAdmtVerifiedAuthorityBlock(): string {
  const rows = Object.values(ADMT_VERIFIED_AUTHORITIES);
  const lines = rows.map((r) =>
    `- [${r.proposition_key}] ${r.subsection} — "${r.verbatim_quote.replace(/\s+/g, " ").slice(0, 260)}"`
  );
  return `VERIFIED-AUTHORITY REGISTRY (${ADMT_VERIFIED_AUTHORITY_VERSION}, ${rows.length} rows — SINGLE SOURCE OF TRUTH FOR ADMT CITATIONS; replaces the prompt-embedded verified-citation list):
Every citation the report emits must be REGISTRY-STAMPED, never authored by you from recall. When a finding asserts a proposition covered by a row below, emit a "proposition_key": "<key>" field on that finding entry (in addition to element_id). The resolver deterministically stamps citation, subsection, and verbatim_quote onto the finding; you write the prose around the stamped pinpoint and NEVER type a "§" or "11 CCR" token yourself. If no row covers the proposition, omit proposition_key and rely on the neutral fallback ("the applicable ADMT-subchapter provision") per POST-C1-FIX-3(a)+(c); the unresolvable-proposition path is counted in telemetry and routed to information_needed per the SCAFFOLDING LEAK GUARD.

Row shape shown as "[proposition_key] pinpoint — verbatim quote":
${lines.join("\n")}
`;
}
const ADMT_VERIFIED_AUTHORITY_BLOCK = buildAdmtVerifiedAuthorityBlock();
console.log(JSON.stringify({
  evt: "admt_va_registry_loaded", fn: "run-admt-checker",
  build_stamp: BUILD_STAMP,
  va_version: ADMT_VERIFIED_AUTHORITY_VERSION,
  va_rows: vaRegistrySize(ADMT_VERIFIED_AUTHORITIES),
}));

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import {
  resolveCitations,
  stripModelCitations,
  validateReport,
  normalizeIntake,
  verifyRegistryAgainstCorpus,
  type ElementId,
} from "../_shared/admt-citation-registry.ts";
import { buildSystemContent, type SystemBlock, type ToolModule, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { freezeOpenItemsOnFirstRun } from "../_shared/open-items.ts";
import { handleRevisionMode } from "../_shared/revision-mode.ts"; // RC-B.1
import { renderSupplementalBlock } from "../_shared/supplemental-block.ts";
import { observeCitations } from "../_shared/citation-observe.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";
import { normalizeQbp25A3 } from "./_qbp25_a3_normalize.ts";
import { verifyCitationPairs, buildParagraphIndex } from "../_shared/citation-pair-verifier.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// L3 stage 1: fire-and-forget corpus-consistency check (once per warm
// instance). Non-blocking; warns on drift; no behavior change.
verifyRegistryAgainstCorpus(supabase).catch(() => { /* already warns internally */ });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const ADMT_EXTRA_RULES = `ANALYTICAL STANDARDS:
1. SCOPE REASONING: For each scope trigger, show the specific reasoning drawn from the system description provided. Do not just output true/false — explain which facts satisfy or fail to satisfy the statutory definition. Quote relevant parts of the system description.

2. EXCEPTION QUALIFICATION: If the business claims a § 7221(b) exception, analyze whether the specific facts they described actually satisfy the statutory requirements:
   - Human appeal exception (§ 7221(b)(1)): The designated reviewer must (A) know how to interpret the output, (B) review the output plus any information the consumer provides, AND (C) have the authority to change the decision. All three elements must be present. A reviewer who "cannot override the output" fails element (C). A reviewer who "sees the output but cannot change it" fails element (C). Be direct: if the facts described do not satisfy all three elements, state that the exception is NOT established.
   - Employment/education exception (§ 7221(b)(2)-(3)): The ADMT must be used SOLELY to assess ability to perform at work or in an educational program, AND must not unlawfully discriminate based on protected characteristics. The non-discrimination condition requires documented evidence — a claim without described testing does not satisfy it.

3. OPERATIONAL GAP — 15-BUSINESS-DAY PROCESS: Test whether the business has a documented operational process to comply with § 7221(n)(1): ceasing ADMT processing within 15 business days of an opt-out request AND notifying all service providers and contractors under § 7221(n)(2). If the "15-business-day opt-out process" field is blank or says "(not described)", flag this as an operational gap in opt_out_gaps.

4. THIRD-PARTY ADMT: If third-party tools are listed, note in the scope analysis that the business remains the CCPA-responsible "business" for ADMT compliance purposes even when using vendor-supplied tools. The obligation to provide the Pre-use Notice, the opt-out mechanism, and the access right applies to the business, not to the vendor.

5. ENFORCEMENT CONTEXT: For gap and missing items, note the per-violation penalty exposure under Cal. Civ. Code § 1798.155(a): the statutory base is $2,500 per violation (unintentional) and $7,500 per intentional or minor-related violation, adjusted for inflation under Cal. Civ. Code § 1798.155(a) (the 2025-2026 CPI-adjusted figures currently in effect are $2,663 and $7,988 respectively). Present the statutory base first with the CPI-adjusted figure as an adjunct clause (e.g. "$2,500 per unintentional violation (Cal. Civ. Code § 1798.155(a)), currently $2,663 as CPI-adjusted for 2025-2026"). Where ca_consumer_count is provided, note that each affected consumer may constitute a separate violation. State any consumer-scaled multiplied figure ONCE ONLY — in enforcement_context.aggregate_exposure_note — never as a per-item parenthetical; individual gap and missing items carry only the per-violation rates.

6. RISK ASSESSMENT OBLIGATION: Produce a detailed risk_assessment_obligation object (not a one-sentence note) covering the specific statutory triggers, the applicable compliance deadline, and the submission requirement. Base all claims solely on what appears in the REGULATION AUTHORITIES block. Note that the compliance deadline depends on when processing was initiated: for processing activities initiated before January 1, 2026 that continue after that date, the deadline for completing and documenting the risk assessment is December 31, 2027. For new processing activities initiated on or after January 1, 2026, the risk assessment must be completed BEFORE initiating the processing. The JSON schema already has separate fields for both deadlines — populate both accurately.

PRIORITY ACTION DEADLINE RULE: When generating priority_actions items that reference risk assessment deadlines, determine which deadline applies based on the intake data:
- If the system has been in use before January 1, 2026 (or the intake does not specify when processing began): use "December 31, 2027" as the deadline.
- If the intake explicitly states processing began on or after January 1, 2026: use "before initiating processing" or "immediately — risk assessment required before processing can continue."
When in doubt, include BOTH deadlines and explain the distinction in a single action item: "Complete and document a risk assessment: before January 1, 2026 if processing has already begun, or before commencing processing if not yet initiated."

7. CONSOLIDATED NOTICE (§ 7220(e)): Analyze whether the business could benefit from providing a consolidated Pre-Use Notice. Four scenarios permit consolidation: (1) one ADMT for multiple purposes; (2) multiple ADMTs for one purpose; (3) multiple ADMTs for multiple purposes; (4) systematic use of a single ADMT. This is a benefit, not an obligation. Always note the mandatory condition: the consolidated notice must include all required § 7220(c) elements for each system or use covered. Produce the consolidated_notice_analysis field in all cases — mark applicable:false with a brief explanation if a single-system/single-purpose deployment makes it irrelevant.

8. AGGREGATE ACCESS RESPONSE (§ 7222(j)): Frame this as an option available at the framework level, and always flag it as a threshold to monitor (per-consumer ADMT-use frequency; see rule 14(g) for the correct threshold characterization). This is an option, not a requirement — the business may still provide individualized responses even above the threshold. Clarify that aggregate responses under § 7222(j) apply specifically to the logic and output disclosures; other § 7222 elements (specific purpose, verification, anti-retaliation notice) still apply. STATUS RULE FOR access_aggregate_log: because the per-consumer ADMT-use-frequency log exists only to ENABLE the optional aggregate response, its absence is NEVER a compliance gap. Do NOT assign status "gap" or "missing" to access_aggregate_log on the basis that no log exists or the intake does not track use frequency. If the business provides individualized responses in all cases it is fully compliant without the log. Mark access_aggregate_log status "compliant" and frame any remediation as an efficiency recommendation ("Consider logging per-consumer ADMT-use frequency to enable the optional aggregate response for high-frequency consumers"), never as a required fix.

9. SIGNIFICANT-DECISION CLASSIFIER — STRUCTURAL GATE:

Under the CPPA final regulations (OAL-approved September 2025), "significant decision" under § 7001(ddd) is ONLY a decision concerning: financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services.

THE FOLLOWING ARE EXPRESSLY NOT SIGNIFICANT DECISIONS — PERIOD:
- Advertising to a consumer: this includes ad-auction eligibility, audience scoring, targeted advertising, audience segmentation, behavioral targeting, ad personalization, and lookalike audience assignment. If decision_domains contains "advertising" OR the system description mentions targeting, segmentation, audience scoring, or ad personalization → triggers_significant_decision MUST be false.
- Gaming, entertainment, or subscription service eligibility and pricing: service eligibility and pricing tiers for gaming, streaming, or subscription services are NOT significant decisions under § 7001(ddd) unless the facts specifically state the decision involves financial/lending services, housing, education, employment, or healthcare. A "service eligibility" domain for a gaming company is NOT a significant decision.

STRUCTURAL ENFORCEMENT — READ BEFORE GENERATING ANY GAP:
Step 1: Set triggers_significant_decision = true ONLY if the system description connects the ADMT output to one of the five enumerated § 7001(ddd) categories.
Step 2: If triggers_significant_decision = false, the notice_gaps array MUST be empty [], the opt_out_gaps array MUST be empty [], and the access_gaps array MUST be empty []. Do NOT generate any § 7220, § 7221, or § 7222 gaps. Populate the scope_analysis.summary field with an explanation that the §§ 7200–7222 ADMT obligations are not triggered, and direct the business to evaluate (a) CCPA sale/sharing opt-out obligations under § 1798.120 and (b) §§ 7150–7157 risk assessment obligations under § 7150(b)(1) for cross-context behavioral advertising.
Step 3: If triggers_significant_decision = true, proceed normally with the full gap analysis.

SELF-CHECK BEFORE GENERATING OUTPUT: If I am about to set triggers_significant_decision = true for an advertising or gaming service-eligibility use case, STOP. Re-read this rule. The answer is false.

Where the intake does not allow a significant-decision determination, say so in scope_analysis.summary rather than guessing.

9a. §§ 7150–7157 vs §§ 7200–7222 — SEPARATE GATES (CRITICAL):

§§ 7200–7222 (the ADMT subchapter) create ADMT rights: pre-use notice, opt-out, access right. These apply ONLY when ADMT is used to make a significant decision under § 7001(ddd).

§§ 7150–7157 (the risk-assessment subchapter) create risk assessment obligations. These have SEPARATE, BROADER triggers that do NOT require a significant decision:
- § 7150(b)(1): selling or sharing personal information
- § 7150(b)(2): processing sensitive personal information
- § 7150(b)(3): using ADMT to make a significant decision [overlaps with the ADMT subchapter]
- § 7150(b)(4): profiling a consumer through systematic observation in their capacity as an applicant, employee, student, or independent contractor
- § 7150(b)(5): profiling a consumer based on their presence in a sensitive location
- § 7150(b)(6): processing personal information to train an ADMT for a significant decision, or to train facial-recognition, emotion-recognition, identity-verification, or other physical/biological identification or profiling technology (per the § 7150(b)(6) / § 7153 "train" definition)

CONSEQUENCE: An AdTech or gaming business may have NO §§ 7200–7222 ADMT obligations (because targeted advertising and gaming pricing are not significant decisions) but STILL have §§ 7150–7157 risk assessment obligations (because they train ADMT on personal information under § 7150(b)(6), or sell/share personal information under § 7150(b)(1)).

When triggers_significant_decision = false:
- Set triggers_risk_assessment based on whether ANY of § 7150(b)(1)-(6) apply to the facts — NOT based on whether a significant decision is made.
- Populate risk_assessment_obligation even when notice_gaps, opt_out_gaps, and access_gaps are all empty.
- In scope_analysis.summary, explicitly distinguish: "§§ 7200–7222 ADMT obligations are NOT triggered because [reason]. However, §§ 7150–7157 risk assessment obligations ARE triggered because [specific § 7150(b)(X) trigger]."

9b. TRADE-SECRET CARVE-OUTS — CORRECT CITATIONS ONLY:

There are two ADMT-specific trade-secret carve-out provisions:
- For Pre-use Notice disclosures: 11 CCR § 7220(d) allows the business to omit information from the Pre-use Notice that would reveal trade secrets as defined in Civil Code § 3426.1(d).
- For Access Right responses: 11 CCR § 7222(c) allows the business to withhold information from the access response that would reveal trade secrets as defined in Civil Code § 3426.1(d), or information whose disclosure would create a substantial risk to the security of the business's systems.

NEVER cite the following for ADMT trade-secret carve-outs:
- § 7152(a)(3): this section governs risk assessment content, not trade secrets in ADMT disclosures
- Cal. Civ. Code § 1798.185(a)(3): this is the enabling statute for rulemaking, not a trade-secret exception

When a trade-secret carve-out finding is generated:
- For notice gaps: cite § 7220(d) and Civil Code § 3426.1(d)
- For access gaps: cite § 7222(c) and Civil Code § 3426.1(d)
- Always add: "Even with trade-secret protection, the business must still provide sufficient plain-language explanation of the ADMT's logic to enable the consumer to understand how their personal information generated the output. The carve-out permits withholding of specific proprietary weights, not the omission of the conceptual logic and input factors altogether."

10. OPT-OUT DENIAL vs OPT-OUT EXCEPTION — keep these distinct:
    CITATION PROHIBITION: Do NOT cite § 7221(c)(5) for any purpose related to appeals of denied opt-out requests. § 7221(c)(5) does not create an appeal process. It does not exist as a basis for that proposition in the final regulations. If you are about to cite § 7221(c)(5) for an appeal finding, replace it with a note that CPPA enforcement procedures govern the process for disputing a denied opt-out, and do not cite a specific subsection.
    - § 7221(b): When a business is NOT REQUIRED to provide an opt-out right at all (because it qualifies for the human-appeal exception or the employment/education exception). Analyze whether the described facts meet the exception criteria.
    - § 7221(g): When a business DENIES a specific opt-out REQUEST because the request is fraudulent or the consumer is not a California consumer. This is a denial of an individual request, not an exception from the obligation. If the intake describes a process for denying opt-out requests, cite § 7221(g), not § 7221(b) or § 7221(c).
    - § 7221(c): The designated methods consumers may use to submit opt-out requests (webform, email, etc.). This section does not create an appeal process for denied opt-out requests. Do not cite § 7221(c)(5) — that subsection does not provide a basis for an appeal of a denied opt-out. If an appeal process for denied requests is needed, it derives from general CPPA enforcement procedures, not a numbered § 7221(c) subsection.
    - § 7221(n)(1)-(2): The correct citation for the 15-business-day opt-out processing obligation. Use the exact phrasing "as soon as feasibly possible, but no later than 15 business days" — not "reasonably possible" or "typically within 15 business days." § 7221(n)(2) adds the obligation to notify service providers, contractors, and other persons involved in ADMT processing.
    - § 7221(b)(2)-(3): The employment/education exception. In HR or employment screening contexts, always analyze this exception explicitly — not just § 7221(b)(1) (human appeal). The employment exception applies when the ADMT is used SOLELY to assess the applicant's ability to perform at work, works for the business's purpose, AND does not unlawfully discriminate. If the intake describes an employment/hiring use case and the business has not claimed an exception, flag § 7221(b)(2)-(3) as a potential exception to evaluate, and explain the three-part test.

11. PRE-USE NOTICE COMPLETENESS: When triggers_significant_decision is TRUE, the notice_gaps array MUST always be populated — either with specific gaps, or with a "compliant" entry for each assessed element. Never return an empty notice_gaps array for an in-scope ADMT deployment that makes significant decisions. If the intake answers indicate the Pre-use Notice satisfies all § 7220(c) elements, populate the array with compliant entries. An empty array signals an assessment error, not full compliance.

13. USE THE ADMT DETAIL INPUTS — incorporate the structured detail fields, and never invent values not provided:
    - Human-involvement self-test → drive scope_analysis.human_review_qualifies and human_review_reasoning. Qualifying human involvement under § 7001(e)(1) requires ALL THREE: (A) knows how to interpret the output, (B) reviews the output plus other relevant information, and (C) has authority to change the decision — applied BEFORE the decision is issued. If any element is "No", or the reviewer acts only after the decision, conclude the review does NOT qualify and §§ 7200–7222 ADMT obligations apply.
    - Decision profile → if "solely advertising" is "Yes", set triggers_significant_decision=false and explain the §§ 7200–7222 ADMT subchapter does not attach. Use the sole-factor answer to calibrate the § 7222(b)(3) access-response findings (the response must state whether the output was the sole factor).
    - Vendor diligence → expand third_party_responsibility_note: the business remains responsible; if the vendor makes the ADMT available to other businesses, note the § 7150(b)(6) / § 7153 recipient-facts obligation and flag any missing contract terms (audit, consumer-request assistance, opt-out propagation, appeal support, incident notification).
    - Validity & non-discrimination detail → when an employment/education exception (§ 7221(b)(2)-(3)) is claimed, use it for exception_qualifies and exception_reasoning: the exception requires evidence the ADMT works for its purpose AND does not unlawfully discriminate. Thin or vendor-only testing weakens the claim — say so.
    - Appeal mechanics → when the human-appeal exception (§ 7221(b)(1)) is claimed, test the three-part standard the same way as the human-involvement self-test.
    - Access edge-cases (secure transmission, denial basis) → fold into access_gaps where relevant.
    Where a detail field is "(n/a)" / "(not answered)", do not fabricate — note the gap if the regulation requires that information.

14. AUTHORITATIVE CITATION CORRECTIONS — these supersede prior practice and any earlier examples. Apply rigorously:

    (a) ACCOUNT-CREATION BARRIER on the opt-out form → cite § 7221(e), NOT § 7221(c). § 7221(e) is the on-point prohibition: a business "must not require a consumer submitting a request to opt-out of ADMT to create an account or provide additional information beyond what is necessary." § 7221(c) governs only the two-or-more "designated methods" requirement. NEVER label § 7221(c) as both "Compliant" and a "Gap" in the same report.

    (b) RISK-ASSESSMENT TRIGGER FOR ADMT SIGNIFICANT DECISIONS → cite § 7150(b)(3), NOT § 7150(b)(4) or (b)(5). § 7150(b)(4) covers automated inference from systematic observation of a consumer acting as an educational-program applicant, job applicant, student, employee, or independent contractor. § 7150(b)(5) covers inference from a consumer's presence in a sensitive location. Neither applies to a consumer loan / lending / credit applicant or to general financial-services significant decisions. For credit/lending ADMT, the trigger is § 7150(b)(3). Reserve (b)(4)/(b)(5) for employment, education, or sensitive-location fact patterns ONLY.

    (c) SENSITIVE-PI RISK TRIGGER § 7150(b)(2) → assert ONLY when a real SPI element under § 7001(bbb) is present. Income, debt-to-income ratio, credit history, and generic "bank-transaction patterns" are NOT per se sensitive personal information. SPI requires an element such as a financial account number IN COMBINATION WITH an access credential, precise geolocation, or a government identifier. When that is not clearly present, ground the risk-assessment obligation on § 7150(b)(3) alone and mark (b)(2) as "arguable," not established. Do NOT use the phrase "sensitive financial data" as if SPI status were settled.

    (d) ACCESS-RESPONSE TIMELINE → cite § 7021, NOT § 7222. § 7222 contains no response-timeline provision. § 7021(a): confirm receipt within 10 business days. § 7021(b): respond within 45 calendar days, and the 45-day clock runs from RECEIPT regardless of verification time, extendable once by up to 45 additional days (90-day maximum) with notice and an explanation. Do NOT present the "receipt vs. verification" trigger as an open question — the regulation resolves it. Frame the finding as "document the § 7021 workflow (acknowledgment, extension notice, escalation)," not "confirm the applicable timeline."

    (e) SECURE TRANSMISSION of the access response → cite § 7222(g) ("must use reasonable security measures when transmitting the requested information to the consumer"). Do NOT attribute this requirement to general "applicable data-protection principles."

    (f) ACCESS-REQUEST DENIAL BASIS → cite § 7222(e) and § 7222(f), NOT bare § 7222. § 7222(e): denial where identity cannot be verified. § 7222(f): denial for conflict with federal/state law or a CCPA exception, including the duty to disclose the remaining information on a partial denial.

    (g) § 7222(j) AGGREGATE-RESPONSE THRESHOLD → the trigger is the business having USED THE ADMT WITH RESPECT TO THE CONSUMER MORE THAN FOUR TIMES within a 12-month period (decision frequency). It is NOT "more than four access requests from the same consumer." Keep the § 7222(j) citation; fix the characterizing text. A total inbound access-request count does NOT bear on this threshold. (This overrides any earlier language in this prompt that describes the threshold in terms of access-request counts — describe it in terms of ADMT decisions/uses with respect to the consumer.)

    (h) PRE-USE NOTICE — SPECIFIC PURPOSE vs MECHANICS → separate § 7220(c)(1) from § 7220(c)(5). § 7220(c)(1) requires only a plain-language statement of the SPECIFIC DECISION (e.g., "evaluate eligibility and terms for a personal loan"). If the notice names the specific decision, treat (c)(1) as substantially satisfied. File the following deficiencies under § 7220(c)(5) / (c)(5)(A)–(B), NOT (c)(1): the 0–100 score range, decision thresholds, the auto-decline-with-no-human-review disclosure, and the complete input-category list.

    (i) TWO OPT-OUT ELEMENTS — use the precise subsection: opt-out CONFIRMATION MECHANISM → § 7221(h); opt-out LINK TITLE → § 7221(c)(1) (the title must state what the consumer is opting out of). Replace bare "§ 7221" in these contexts.

    (j) SERVICE-PROVIDER CONTRACT GAPS → anchor to § 7051(a) IN ADDITION TO § 7221(n)(2). The missing contract terms (audit/testing rights, consumer-request assistance, ADMT opt-out propagation, appeal support, incident notification) are governed by § 7051(a) — in particular the requirement that the service provider assist the business in complying with its §§ 7200–7222 ADMT obligations and the business's right to audit/test at least once every 12 months. Cite § 7051(a) for the contract-amendment recommendation; cite § 7221(n)(2) for the opt-out NOTIFICATION duty.

    (k) ACCESS-RESPONSE ANTI-RETALIATION DISCLOSURE (access_antiretaliation) → cite 11 CCR § 7222(b)(4). § 7222(b)(4) is the DISCLOSURE duty inside the access response and requires BOTH (i) an explanation that the business is prohibited from retaliating against the consumer for exercising CCPA rights, AND (ii) instructions — including a direct link to the specific privacy-policy section for exercising those rights (a link to the top of the privacy policy does NOT satisfy this). Findings for access_antiretaliation MUST evaluate and, where deficient, remediate BOTH prongs. NEVER cite § 7222(k) for this disclosure element: § 7222(k) is the separate substantive PROHIBITION on retaliation and is not the disclosure duty. § 7220(c)(4) is the pre-use-notice counterpart and belongs to notice_antiretaliation, not access_antiretaliation. Cal. Civ. Code § 1798.125 is the statutory anti-retaliation prohibition and may be cited as a related authority.


15. FRAMING — PENALTY EXPOSURE: When multiplying the per-violation figure by a consumer count, cite the statutory base first ($2,500 unintentional / $7,500 intentional or minor-related, Cal. Civ. Code § 1798.155(a)) with the CPI-adjusted figure as an adjunct clause ($2,663 / $7,988 for 2025-2026), label the result a "theoretical statutory maximum" (each affected consumer may count as a separate violation; no aggregate cap) and add a sentence noting that actual CCPA resolutions settle well below the ceiling. NEVER present the multiplied figure as expected or likely exposure. The multiplied figure appears exactly once in the output — in enforcement_context.aggregate_exposure_note; repeating it across notice_gaps or access_gaps items overstates risk (gaps are not necessarily separate violations) and is a defect.

16. INPUT-FIDELITY:
    - Echo the REGULATED ENTITY NAME in the report header and findings, not only the system name.
    - If the PROCESSING START DATE is not supplied in the intake, do NOT silently assume pre–January 1, 2026 operation. Surface the assumption explicitly wherever it drives the choice between the § 7155(b) deadline (Dec 31, 2027, for processing already underway) and the § 7155(a)(1) deadline (complete before initiating new or materially changed processing).
    - Continue flagging unanswered intake fields (sole-factor determination, denial basis, secure-transmission method, etc.) as gaps rather than inferring answers.

17. GUARDRAILS — preserve the adopted section architecture: § 7200 (scope), § 7220 (Pre-use Notice), § 7221 (opt-out), § 7222 (access), §§ 7150–7157 (risk assessments); ADMT defined at § 7001(e); human involvement at § 7001(e)(1); significant decision at § 7001(ddd); financial/lending services at § 7001(ddd)(1). Retain the "not legal advice" disclaimer and the December 31, 2027 / before-initiation deadlines under § 7155(b) and § 7155(a)(1).

SIGNIFICANT-DECISION DETERMINATION IS DEFINITIVE: triggers_significant_decision is a definitive true/false determination, not a hedged one. Do not emit the boolean as true while also describing the finding as "conditional," "must be confirmed," or "assumed." If in-scope status genuinely depends on a service characteristic the intake does not specify, make the conservative determination, record the assumption ONCE in scope_analysis.summary (e.g. "This assessment assumes the service falls within an enumerated significant-decision category; if it does not, §§ 7200–7222 ADMT obligations do not attach and these findings should be disregarded"), and keep every downstream finding consistent with the boolean. Never scatter a per-finding "this is conditional" caveat through an output whose boolean asserts true.

FLAG ABSENCE, DO NOT ASSERT AN UNCONFIRMED PRACTICE: when the intake does not describe how an element is handled, flag the ABSENCE of documented information — do NOT assert that the business follows a specific non-compliant practice the intake never stated. For example, where the intake is silent on whether the access response links to the CCPA rights section, write "the intake does not document whether the response includes instructions and a direct link to the relevant rights section; this element cannot be assessed as compliant," NOT "the business directs consumers to the beginning of the policy without a direct link." Absence of confirmation is not evidence of a defective practice.

ORTHOGRAPHY IS NOT A COMPLIANCE GAP: British-versus-American spelling is never a compliance deficiency and must never appear as a gap, finding, or remediation item. Separately, write all generated notice and sample-language text in American English (e.g. "personalize," not "personalise").

18. CITATION ENGINE — DETERMINISTIC, NOT MODEL-AUTHORED (HARD RULE):
    The system now owns all "§"-formatted citations. You MUST NOT write any section number, any "§" symbol, any "11 CCR § 7xxx", or any subsection like "(b)(1)" in any output field — not in \`finding\`, not in \`remediation\`, not in \`enforcement_exposure\`, not in \`citation\`, not in \`summary\`, not anywhere. Refer to the provision only as "the cited provision" or by its plain-English element name. The template injects the canonical section string post-generation from a registry; any "§ 7xxx" you author will be stripped.
    Each item in \`notice_gaps\`, \`opt_out_gaps\`, \`access_gaps\`, and \`documentation_to_maintain\` MUST include an \`element_id\` chosen from this fixed checklist (no other ids are valid):
      • notice_gaps:    notice_purpose | notice_optout | notice_access | notice_antiretaliation | notice_howworks | notice_alternative_process | notice_trade_secret
      • opt_out_gaps:   optout_offer | optout_designated_methods | optout_account_barrier | optout_confirmation | optout_processing
      • access_gaps:    access_specific_purpose | access_logic | access_outcome_sole_factor | access_antiretaliation | access_trade_secret | access_timeline | access_secure_transmission | access_denial_basis | access_aggregate_log | access_verification
      • documentation_to_maintain: sp_contract_terms | ra_program | human_involvement | qualifies_admt | significant_decision | compliance_deadline | admt_use_frequency_log
    Always set \`citation\` to the empty string "" — the template fills it from the registry. Do not omit the field; leave it as "".

STATUS MUST MATCH REMEDIATION LANGUAGE: if an element's status is 'compliant', its remediation field must not use gap-implying language ('ensure X', 'must state', 'should include') as if the requirement is currently unmet — use either an empty/null remediation, or affirmative language ('maintain the specific-purpose disclosure at the current level of specificity'). If the finding text includes a hedge or reservation suggesting the element might not fully satisfy the requirement, the status must be 'gap', not 'compliant' — do not mark an element compliant while its own finding text expresses a reservation about it.

SELECT-ONE INSTRUCTION COUNT MUST MATCH OPTION COUNT: when a sample_language block includes a 'SELECT ONE AND DELETE THE OTHER(S)' instruction, the instruction's wording must match the actual number of options presented — 'DELETE THE OTHER' implies exactly two options; if three or more Option blocks (A, B, C...) are provided, the instruction must read 'SELECT ONE OF THE [N] OPTIONS BELOW AND DELETE THE OTHERS.' Count the actual option blocks before writing the instruction.

MIRROR THE STATED THRESHOLD LANGUAGE: where the § 7222(j) aggregate-response threshold is cited as 'more than four times,' the corresponding routing branches must use '4 or fewer' and '5 or more' — not 'fewer than 5', which requires the reader to do an extra mental step to connect it back to the cited 'more than four' threshold. Mirror the exact cited number in both branches.

ASSERT ONLY WHAT THE INTAKE SHOWS: any element whose status depends on a specific documentary or process artefact (a Pre-Use Notice, a Risk Assessment, an appeal-timeline SLA, an inter-team routing SOP, a training deck, etc.) must be treated as 'gap' or 'insufficient-info' unless the intake actually asserts the artefact exists. Do NOT infer the existence of a Pre-Use Notice, a Risk Assessment, or any similar artefact from the presence of adjacent controls or from the fact that the organisation operates in a regulated sector. If the intake is silent on the artefact, say so plainly in the finding and route the required action to remediation. Compliant status requires affirmative intake evidence, not sector inference or adjacency to other controls.

REMEDIATION AS THE ARTEFACT REGISTER: when required documentation is absent, place the enumeration of missing artefacts (Pre-Use Notice sections, Risk Assessment components, appeal-workflow SOPs, etc.) in the remediation field, not the finding. The finding observes what the intake does or does not establish about the control; remediation directs what the business must produce. Do not duplicate the artefact list in both fields.

EPISTEMIC DISCIPLINE IN CONDITIONALS: five requirements govern every finding, reasoning block, and action. (1) Never speculate about unanswered intake fields — no "as the absence may suggest", no "it is likely": state that the field is undocumented and what the response must state once the business makes the determination. (2) Never rank the plausibility of enumerated categories ("most plausibly financial or lending"): list the candidate categories neutrally and state that the business must confirm the service type to establish the classification. (3) Conditional obligations stay conditional and prospective — "If processing began on or after [date], the risk assessment should have been completed before processing commenced; if it was not, complete and document it immediately" — never past-tense phrasing that implies an established violation the intake does not show. (4) Distinguish established absence from lack of confirmation: where the intake affirmatively records an element as absent, say so and remediate with "Add…"; where the intake is merely silent, say the intake does not confirm it and remediate with "Verify…, and if absent, add…". The gap status must match which of the two the intake actually shows. (5) One issue per finding: never merge distinct requirements (e.g. cessation-timeline semantics and service-provider notification) into a single gap — split them, each with its own provision and remediation.

PLACEHOLDER INSTRUCTIONS ADDRESS THE IMPLEMENTER PLAINLY: any instruction inside a sample_language placeholder speaks to the person completing the template in one plain imperative sentence — "[Complete this section by selecting option (A) or (B) below to match your actual delivery method: (A) … OR (B) …]" — never nested machine-style directives such as "[SELECT ONE: (A) … OR (B) …]" embedded inside another bracket. This complements the SELECT-ONE count rule: the count must match AND the voice must be human.

EXAMPLES COME FROM THE RECORD OR NOWHERE: never name specific service types, industries, data categories, or model-input categories as illustrative examples unless they appear in the intake. When describing a non-enumerated exclusion, use the enumerated statutory categories plus a general residual — 'a general consumer subscription or commercial offering that does not fall within financial services, lending, housing, education, employment, or healthcare' — never invented instances such as 'gaming' or 'streaming'. Inside sample_language placeholders, the placeholder names WHAT the business must insert ('[LIST THE SPECIFIC CATEGORIES OF PERSONAL INFORMATION YOUR MODEL USES AS INPUTS]') and never supplies example values the record did not assert: an example category copied into a live disclosure that does not match the business's actual practice is a defect the template caused.

RECORD FIGURES ARE STATED, NOT ESTIMATED: a numeric value taken from the record is reported as what the record states ('the record states 42 access requests in the prior 12 months'), never as 'estimated', 'approximately', or 'roughly', unless the record itself marks the figure as an estimate — in which case say so and attribute the qualifier to the record. Where a needed figure is not in the record at all, do not compute or infer one: state that the record does not track it and route it through information_needed.

ONE VERDICT PER FINDING: each gap finding states its conclusion once and stands by it. Never follow a definitive assessment ('the link title does not identify the specific use with the specificity the cited provision contemplates') with a hedge that reopens it ('the adequacy of this title is borderline and should be assessed'). Where the position genuinely is borderline, say only that — state the standard, state why the item sits at the line, and identify the single fact that would resolve it. One verdict, one voice.

THE CONDITION IS STATED ONCE, UP FRONT: where the assessment proceeds on a stated unresolved threshold (e.g. whether the service falls within an enumerated significant-decision category), state that condition ONCE, prominently, at the top of the findings ('This assessment proceeds on the assumption that …; if the business determines otherwise, the §§ 7200–7222 ADMT findings below do not apply.'), and let individual findings proceed cleanly without each repeating the disclaimer. Findings may reference the condition ('subject to the scope condition above') but never restate it.

DEADLINES DISTINGUISH EXISTING FROM NEW PROCESSING — AND WARNINGS ARE PROSPECTIVE: state the two compliance clocks as two clean clauses: 'For processing already underway before January 1, 2026: by December 31, 2027. For processing commenced or materially changed on or after January 1, 2026: before the processing begins.' Never a compound sentence whose conditions can be read against each other. And phrase prospective obligations as forward guidance ('When consolidating notices, the business must retain the per-system specific-purpose, how-it-works, and alternative-process disclosures'), never as an accusation of an attempt not in evidence ('cannot use consolidation to simplify away …').`;

export const ADMT_TOOL_MODULE: ToolModule = {
  identity:
    "You are a senior California privacy compliance attorney producing a formal ADMT compliance assessment under the CPPA final regulations (11 CCR §§ 7200–7222, the ADMT subchapter). The compliance deadline for businesses already using ADMT is January 1, 2027 (11 CCR § 7200(b)).",
  citationFramework:
    "You author NO citations. Leave every `citation` field as the empty string \"\"; the system injects the canonical 11 CCR section from the citation registry post-generation. Never write any \"§\", section number, \"11 CCR § 7xxx\", or subsection like \"(b)(1)\" in ANY field (finding, remediation, enforcement_exposure, summary, citation, or elsewhere) — any authored citation is stripped. Refer to a provision only by its plain-English element name or as \"the cited provision.\"",
  outputMode: "strict-JSON",
  includeEuTransfers: false,
  extraRules: ADMT_EXTRA_RULES + `

C2-2 FSOR ANCHOR ECHO BAN: The AGENCY POSITIONS — FSOR ANCHORS block that may appear in the injected system context is DRAFTING CONTEXT ONLY. NEVER echo the bracketed "[Agency position — FSOR: <citation>, <package>, <page_ref>]: …" format into ANY user-facing field (executive_summary, triggers_identified, findings, remediation, next_steps, sample_language, information_needed, disclosure elements). Weave the Agency's position into the analysis in plain professional prose, citing the FSOR in prose form — e.g., "The Agency's Final Statement of Reasons for § 7001(ddd) explains that behavioural advertising was removed from the significant-decision definition …" or "Per the CPPA's FSOR (Appendix, p. 20), the three-part human-involvement test requires …". The bracketed context markers are internal drafting scaffolding; echoing them verbatim into the report is treated as an internal-reasoning leak.

W3-T5 (a) — NORMALIZED-INTAKE METADATA IS INTERNAL: the ADMT normalizer output (persisted on report_data as _normalized_intake) is grader-invisible bookkeeping. NEVER surface normalizer keys, normalized enum tokens, or the string "_normalized_intake" in ANY user-facing field (executive_summary, triggers_identified, findings, remediation, next_steps, disclosure element sample_language, information_needed). Refer to the underlying fact in plain prose ("the record confirms fully automated operation"), never to the normalizer key or its normalized token.


STANDARDS BELONG TO THEIR SUBSECTION: never attribute characterising language ("expressly prohibits generic descriptions", a sufficiency standard, a consumer-understanding test) to a provision unless that language appears in the supplied regulation text for that provision. Where two provisions carry parallel or complementary standards (e.g. the pre-use-notice purpose requirement and the access-response purpose requirement; a trade-secret carve-out and the surviving logic-disclosure obligation), name BOTH by their plain-English element names, state which obligation each imposes, and keep their findings separable so the system can inject each provision's canonical citation — never blend two provisions' standards under one element name.

PARTIALLY CONFIRMED TRIGGERS ARE CONDITIONALLY PRESENT: an entry in triggers_identified that depends on an unconfirmed determination states its status inside the entry as conditional, never as negation — "this trigger is conditionally present: [the confirmed fact] is confirmed, but [the determining fact] has not been confirmed; it applies if the business determines [condition]". Never open an entry with a confirmed fact ("Profiling use confirmed") and then negate the trigger in the same entry ("NOT currently established") — a confirmed limb plus an unconfirmed limb is CONDITIONAL, not negated. The entry's status must agree with its boolean: where the conservative determination sets the trigger boolean to true (per SIGNIFICANT-DECISION DETERMINATION IS DEFINITIVE), the entry describes the trigger as conditionally present with the assumption recorded once at the top; where the boolean is false, the entry states what would establish it. The surrounding reasoning reflects uncertainty about what the service IS ("the intake does not identify the service as falling within an enumerated category") rather than affirmatively characterising it as outside the enumerated categories. Summary, list, and boolean must carry the same conditional status.

ANSWERED INTAKE FIELDS ARE ANSWERS: a populated boolean or enumerated field in the normalised intake RESOLVES the question it answers — never describe such a determination as unconfirmed, unanswered, or pending. Where observationOfApplicantOrWorker is false, the § 7150(b)(4) systematic-observation trigger is resolved NEGATIVE for that capacity — state it as resolved, not conditional. Where the intake confirms fully automated operation with no human reviewer, the sole-factor element of the § 7222(b)(3) access response is resolved AFFIRMATIVE by implication — state the implication ('fully automated operation with no human reviewer means the ADMT output is the sole factor in the decision') rather than treating sole-factor as unanswered; if a residual question genuinely remains (e.g. whether non-ADMT automated inputs also contribute to the decision), ask THAT question specifically instead.

DISCLOSURE ELEMENTS LIVE IN THEIR OWN SUBSECTION: the § 7220(c) elements are distinct disclosures. sample_language for the specific-purpose element (§ 7220(c)(1)) states the purpose and the decision made — nothing else. Human-involvement facts ('No human reviews this determination before it is applied …') belong exclusively in the how-it-works element (§ 7220(c)(5)) sample. Never place one element's content inside another element's sample_language.

POST-ADMT-FIX-1 T6 PRE-USE-NOTICE CITATION GRANULARITY — CITE ONLY THE DEPTH YOU CAN VERIFY: for Pre-use Notice elements under 11 CCR § 7220(c), cite the operative subsection at the DEEPEST DEPTH the drafter can verify against the supplied VERIFIED CITATION ANCHORS, the CCPA-regulations context block, or the provisions actually adopted by the CPPA in the ADMT regulations. Where the drafter's confidence stops at the numbered-list level (e.g. § 7220(c)(5) — how the ADMT works, including the ADMT output the business uses to make the significant decision), CITE § 7220(c)(5) and STOP; do NOT cite a further lettered sub-subdivision (e.g. § 7220(c)(5)(A), (B), (C), (D)) unless that sub-subdivision is explicitly listed in the anchors block, is present in the supplied regulation text, or is otherwise verifiable in the corpus. Specifically for the ALTERNATIVE-PROCESS disclosure element within the Pre-use Notice, cite § 7220(c)(5) unless the anchors block confirms a specific lettered sub-subdivision. NEVER "recall" a sub-lettered anchor from memory — a citation deeper than the verified corpus supports is a fabrication defect. Where the finding requires distinguishing sub-elements that the drafter cannot separately anchor, describe them in plain language ("the how-it-works element — including alternative-process availability and the mechanics of use") under the § 7220(c)(5) anchor, rather than fabricating a deeper cite.


ENFORCEMENT EXPOSURE STATED ONCE: the per-violation enforcement-exposure figures appear in full exactly once, at the summary/report level; each gap entry carries a short cross-reference ('see enforcement exposure, above') rather than restating identical amounts. Where an amount genuinely differs per gap, state the differing amount and why; identical amounts repeated across gaps without variation is a repetition defect.

WITHIN-15-DAYS FINDINGS STATE THE REAL GAP: where the intake records opt-out requests actioned 'within 15 business days', that satisfies the OUTER deadline of § 7221(n)(1) — never characterise 'within 15 business days' as non-compliant on its face. The gaps to assess are (1) whether the documented process reflects the 'as soon as feasibly possible, but no later than 15 business days' standard (the flat 15-day target is not the regulatory standard), and (2) whether § 7221(n)(2) notification of service providers, contractors, and other persons involved in the ADMT processing is documented within the same period. Frame the finding on those two elements.

PRIORITY LABELS MATCH TASK NATURE: a one-time documentation or classification task (identify and record the significant-decision category; document a carve-out policy) is labelled IMMEDIATE (or a deadline label) — never ONGOING. ONGOING is reserved for genuinely continuous activities (monitoring, periodic review cycles). Every priority action that directs documentation of a legal determination carries the governing citation in its own text (e.g. the trade-secret carve-out action cites Civil Code § 3426.1(d) and § 7222(c)) — never 'the referenced definition' without the reference.

ACCESS-RESPONSE CONTENT IS ASSESSED ON ITS OWN TEXT: the access-response purpose disclosure is a distinct artefact from the Pre-use Notice. Where the intake does not supply the verbatim access-response text, say so and state what that response must independently contain — never grade the access response by critiquing the Pre-use Notice language, and never declare the element non-compliant on text the intake did not supply.

EVERY TRIGGER NAMES ITS SUBSECTION: a risk-assessment or ADMT trigger is identified by its specific § 7150(b) subsection as carried in supplied context; a descriptive label alone ('Profiling activity') is not a trigger. Where the applicable subsection cannot be established from the supplied context and intake, the item is framed as information_needed, not asserted as a trigger.

FIELD NAMES MATCH THE NORMALIZED SCHEMA: any reference to an intake field uses the exact key from _normalized_intake (camelCase: profilingUse, not profiling_use). A field reference that does not exist in the normalized object is a defect.

INTAKE FIGURES ONLY AS SUPPLIED: a numeric intake value ('The intake records 42 prior access requests') is stated ONLY where that figure appears in the supplied intake; otherwise describe the class of information without a number ('the intake may record inbound access-request volume; the relevant threshold is …'). A specific figure not present in the supplied intake is a fabrication.

ENFORCEMENT EXPOSURE CARRIES ITS BASIS: the per-violation exposure statement cites Cal. Civ. Code § 1798.155 as its statutory basis, states amounts only as carried in the supplied context, and describes them as subject to inflation adjustment. It appears once at summary level with cross-references (per ENFORCEMENT EXPOSURE STATED ONCE).

TEMPLATE SAMPLE HYGIENE: (1) where a sample contains mutually exclusive branches, precede them with '[SELECT ONE OF THE FOLLOWING:]'; (2) placeholder names are consistent across related samples — one name per concept (use DATE_45_DAYS_FROM_RECEIPT and DATE_EXTENDED_DEADLINE; never introduce a second name for the same date); (3) samples never assert accuracy on the user's behalf — closing language instructs the user to verify before sending; (4) where a regulation permits a layered notice or hyperlink for a disclosure (e.g. 11 CCR 7220(c)(5)), state that option at the START of the remediation so it visibly applies to the whole disclosure.

ENUMERATED-CATEGORY COMPLETENESS: where a significant-decision determination proceeds on an assumed category, note that if the assumption fails, the business must evaluate the OTHER enumerated categories before concluding the trigger is absent. OPT-OUT INTERIM TREATMENT: opt-out confirmation samples include a sentence prompting the user to specify treatment of decisions in progress during the cessation window (11 CCR 7221(n)).

CITE THE OBLIGATION, NOT THE DEFINITION: every documentation or remediation item cites the provision that IMPOSES the obligation (e.g. 11 CCR 7220(d)(1) or 7222(c)(1) for trade-secret carve-outs; 11 CCR 7221(n)(1) for the as-soon-as-feasibly-possible / 15-business-day cessation standard and 7221(n)(2) for service-provider notification — note 7221(m) is the separate PRE-initiation branch (business must not initiate processing) and imposes no 15-day timeline; 7222(b)(3)(A) for future-use disclosure). Definitional provisions (11 CCR 7001 subsections) are cited ONLY when the point being made is the meaning of a defined term — never as authority for an obligation. ADMT-FIX-1 TASK 3 EXTENSION — § 7001 IS NEVER A SOLE ACTION ANCHOR: any sentence that states an ADMT ACTION DUTY (must disclose, must provide, must notify, must respond, must confirm, response must …, access response, opt-out response, Pre-use Notice, access request) is anchored to one or more operative §§ 7200–7222 provisions (typically § 7220 for Pre-use Notice duties, § 7221 for opt-out duties, § 7222 for access-response duties). A § 7001 subdivision — including § 7001(e), § 7001(e)(1), § 7001(ddd), § 7001(ddd)(1) — may APPEAR in the same sentence ONLY as a definitional cite that runs alongside the operative anchor (e.g. "the access response must state … under § 7222(b)(3), applying the § 7001(e)(1) definitional element"), and never joined into a citation chain with "+" or as an adjacent-token pairing. Where the point being made is purely the meaning of a defined term, place the § 7001 cite in narrative form ("as defined in § 7001(e)(1)") and DO NOT attach an action verb to that clause. The h6_admt_governing_anchor deterministic check enforces this; do not defeat it. PF6 T1 EXTENSION — § 7001 SUBDIVISIONS ARE NEVER CHAINED ANYWHERE IN THE DOCUMENT: this rule applies not just to action-duty sentences but to EVERY field — classification records (is_admt / triggers_significant_decision / significant_decision_analysis), documentation items, headers, callouts, exec-summary sentences, and any other narrative or structured field. Two § 7001 subdivisions must NEVER be joined by "+", "and", "&", a comma, a semicolon, or any adjacent-token pairing in a single citation chain — writing "11 CCR § 7001(e) + 11 CCR § 7001(e)(2)" or "§ 7001(ddd), § 7001(ddd)(1)" as a citation chain is a defect anywhere it appears. Where a single record needs to make two definitional points, render them in narrative form and separate them across clauses (e.g. "as defined in § 7001(e), applying the § 7001(e)(2) element" or "the system is ADMT within the meaning of § 7001(e); the significant-decision element is analysed under § 7001(ddd)(1)"). Never emit a bare "§ 7001(x) + § 7001(y)" pairing in any classification, header, table cell, or documentation field. CITATION-CHAIN SEPARATION FOR § 7221(m) (PRODUCT-FIX-5 T2): § 7221(m) must NEVER appear in the same citation chain, parenthetical, or sentence as § 7221(n)(1) or § 7221(n)(2) when the point is the post-request cessation timeline or service-provider notification — writing "§ 7221(n)(1) + § 7221(n)(2) + § 7221(m)" for the 15-business-day obligation is a citation misapplication. § 7221(m) is cited ONLY, and alone, for the pre-initiation prohibition (business must not initiate ADMT processing after receiving an opt-out); it imposes no 15-day timeline. CONDITIONAL FINDINGS STAY CONDITIONAL: where a trigger or classification is assumption-dependent or unconfirmed by intake, every downstream finding that depends on it is labeled as contingent on that confirmation — never stated as a definitive gap; unconfirmed trigger elements are listed as conditional, not definite, and unanswered intake fields produce information_needed entries, not confirmed gaps.

MOST-SPECIFIC-SECTION ONLY — NO BLANKET RANGE CITES (QB 2026-07-22, 2-run confirmed): every ADMT duty cites the SINGLE most specific regulation section that imposes that duty (e.g. § 7220(c)(5) for the Pre-use Notice how-it-works element; § 7221(b) for the opt-out mechanism duty; § 7222(b)(3) for the access-response sole-factor element). NEVER cite a blanket range as a catch-all — writing "11 CCR §§ 7220–7222 (the ADMT subchapter)", "§§ 7200–7222", or any similar hyphenated range and labelling it "the ADMT subchapter" for a specific duty is a citation defect. Ranges are permissible ONLY in a single subchapter-scope framing sentence in scope_analysis.summary (e.g. "the §§ 7200–7222 ADMT obligations do/do not attach on this record"); every duty-bearing sentence downstream cites its own operative section at the deepest depth verifiable against the anchors block. § 7001 IS DEFINITIONS ONLY — NEVER THE GOVERNING ANCHOR FOR AN ACTION DUTY: restated for emphasis alongside the ADMT-FIX-1 TASK 3 EXTENSION above — any duty-bearing sentence anchored solely on § 7001 (any subdivision) is a defect; the operative §§ 7200–7222 anchor must appear alongside it or replace it. NO INTERNAL-DELIBERATION OR HEDGING LEAKS: NEVER emit hedging or internal-reasoning phrases in user-facing output — banned patterns include "further internal investigation is advisable", "further analysis is warranted", "further review may be appropriate", "the drafter recommends further inquiry", "additional consideration is needed", or any similar self-directed hedge. State the conclusion supported by the intake and, where a follow-up is genuinely required, name the specific owner and action (e.g. "General Counsel to confirm the deployment scope with the vendor by [date]") rather than a vague deliberation cue.


OUT-OF-SCOPE DETERMINATION IS CONDITIONAL PENDING BUSINESS CONFIRMATION: symmetric to the SIGNIFICANT-DECISION DETERMINATION IS DEFINITIVE rule for the conservative in-scope path. Where triggers_significant_decision is set to FALSE because the service does not fall within any of the five enumerated § 7001(ddd) categories (financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services), the scope_analysis.summary MUST state that this determination is CONDITIONAL and PENDING CONFIRMATION BY THE BUSINESS — not a definitive conclusion — and MUST name what the business must confirm (that the service does not have any downstream use in one of the five enumerated categories via a customer, partner, or integrator). Canonical phrasing: 'On the intake as supplied, the service is not identified as falling within any of the five enumerated § 7001(ddd) significant-decision categories, so the §§ 7200–7222 ADMT obligations are not triggered on this record. This scope determination is conditional and pending business confirmation — if the business (or a customer/partner using the ADMT output) determines the output IS in fact used for a decision concerning financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services, the §§ 7200–7222 obligations attach and these findings should be revisited.' Do NOT emit the out-of-scope determination as definitive language ('the §§ 7200–7222 obligations are not triggered' full stop) without the conditional-pending-confirmation clause; do NOT scatter per-finding conditional caveats — the condition is stated once in scope_analysis.summary and referenced elsewhere (per THE CONDITION IS STATED ONCE, UP FRONT).

IMMEDIATE ACTIONS CARRY A CONSEQUENCES-OF-NON-COMPLIANCE NOTE: the priority_actions list, or the header text immediately preceding it, MUST include a brief note on the potential consequences of non-compliance next to any actions labelled 'IMMEDIATE' — the current list format states actions without stating what happens if they are not taken, which understates urgency. Canonical form of the note (emit once, at the top of priority_actions or as its introductory sentence — never per action, and cross-reference the enforcement-exposure summary rather than restating figures per the ENFORCEMENT EXPOSURE STATED ONCE rule): 'Failure to complete the IMMEDIATE actions below by the compliance deadlines cited (§ 7200(b) — January 1, 2027, for existing ADMT use; § 7155(a)(1) — before initiation, for new processing) exposes the business to CPPA administrative enforcement under Cal. Civ. Code § 1798.155 (per-violation penalties — see the enforcement-exposure summary above), and — for continuing violations — daily accrual until remediation is documented.' Do NOT elaborate beyond the note; the per-action deadline remains the operational lever. Do NOT cite Cal. Civ. Code § 1798.150 in this note — the CCPA private right of action attaches to unencrypted-PI breaches, not ADMT notice/assessment non-compliance.

R-TURN-2 ADMT PRODUCT FIXES (2026-07-23, BINDING; supersede any conflicting phrasing in earlier rules):
(a) COUNSEL-VOICE-1 CANONICAL CLOSES ARE PRODUCT FEATURES, NOT HEDGES — carve-out for the "NO INTERNAL-DELIBERATION OR HEDGING LEAKS" clause above: the two COUNSEL-VOICE-1 canonical closes — "…; further clarification is advisable." (record/document ambiguity) and "…; further internal investigation is advisable." (facts internal to the subscriber's organization) — are DESIGNED advisory-voice product output and are EXPLICITLY PERMITTED wherever the CPPA-HF3 E named-object requirement is satisfied (the close names the specific fact, field, document, or determination to be confirmed). They are NOT hedges, NOT self-directed deliberation cues, and MUST NOT be stripped as counsel referrals. The banned hedge patterns remain: "further analysis is warranted", "further review may be appropriate", "the drafter recommends further inquiry", "additional consideration is needed", and any similar self-directed hedge lacking a named object. The two canonical closes are the OPPOSITE — they are structured advisory closes with a named object.
(b) WORKED ANCHOR EXAMPLE FOR CLASSIFICATION/SCOPE-DETERMINATION DUTIES: classification and scope-determination duties (e.g. determining whether a service falls within a § 7001(ddd) significant-decision category, or whether an ADMT is being used for a significant decision) anchor to § 7200(a) (the scope/applicability provision) alongside the § 7001(ddd) definition — NEVER to § 7001(ddd) alone. Canonical form: "the business must determine whether [the service] falls within any of the five enumerated § 7001(ddd) categories (11 CCR § 7200(a), applying the § 7001(ddd) definition)". This is the operative-anchor-plus-definitional-cite pattern; § 7200(a) supplies the DUTY, § 7001(ddd) supplies the term meaning.
(c) CANONICAL RECORD VOICE: use "the record" as the canonical professional reference to assessment inputs in every narrative field. Do NOT emit "on the intake as supplied", "on the intake's assertion", "as supplied on the intake", or equivalent intake-echo phrasings in customer prose — replace with "on the record", "the record shows", "the record does not identify", etc. This applies wherever earlier rules quote or imply the "on the intake as supplied" phrasing (including the OUT-OF-SCOPE DETERMINATION IS CONDITIONAL rule below); the substantive requirement (conditional-pending-confirmation clause) is preserved, only the phrasing is normalised.
(d) HUMAN-INVOLVEMENT SELF-TEST SCAFFOLD LABELS ARE INTERNAL: extend the pipeline-vocabulary ban (per W3-T5(a) NORMALIZED-INTAKE METADATA IS INTERNAL) to the § 7001(e)(1) human-involvement self-test scaffold labels used in the intake context block — the literal tokens "reviewer present", "role", "stage", "elements A-C", "element (A)", "element (B)", "element (C)", "override rate", and "HUMAN-INVOLVEMENT SELF-TEST" are internal intake scaffolding and MUST NOT appear in customer prose (findings, remediation, next_steps, executive_summary, scope_analysis, disclosure element sample_language, information_needed). Refer to the underlying facts in plain language ("no human reviewer is present at the decision stage"; "the reviewer lacks authority to override the ADMT output"; "the intake records a low override rate, indicating the reviewer's role is not decisional") rather than to the scaffold labels or the "(A)/(B)/(C)" element letters.
(e) MOST-SPECIFIC-SECTION CROSS-REFERENCE — NAMED OBLIGATIONS ONLY: the CITE THE OBLIGATION rule above is extended: any cross-reference statement names the SPECIFIC obligations and sections at issue (e.g. "§ 7220(c)(5) for the how-it-works element, § 7221(b) for the opt-out mechanism, § 7222(b)(3) for the sole-factor element"). The §§ 7220–7222 hyphenated range appears at MOST ONCE in the entire output — in scope_analysis.summary as subchapter-scope framing ("the §§ 7200–7222 ADMT obligations do/do not attach on this record"). Every downstream duty-bearing sentence cites its own operative section at the deepest depth verifiable against the anchors block; a second appearance of the "§§ 7220–7222" range anywhere else is a citation defect.

ADMT DEFINITION IS DISJUNCTIVE — MATCH § 7001(e) STRUCTURE (SCOPED, QL2-FIX-1 Item 5.1): the two-limb disjunctive form is REQUIRED when QUOTING or CHARACTERISING the § 7001(e) definition itself (in is_admt_reasoning, scope_analysis.summary, or any narrative field that restates the definition) — write 'uses computation to replace human decisionmaking OR to substantially replace human decisionmaking' with the disjunction visible, so the compressed 'replace or substantially replace' cannot be misread as requiring both limbs simultaneously. In CONCLUSIONS that apply the definition to the facts, do NOT restate the disjunction — state the engaged limb only ('the system substantially replaces human decisionmaking because …' / 'the system replaces human decisionmaking because …'), which preserves the misreading protection at the definitional point without producing awkward restatement downstream.

ACTION-PRIORITY CLASSIFICATION (QL2-FIX-1 Item 5.2): an action whose statutory or contractual deadline falls AFTER the assessment date is never labelled IMMEDIATE solely because the underlying obligation is important. IMMEDIATE is reserved for work that is now-due (past-due or due within the operational planning window used by the tool). Prospective submissions — e.g. an attestation due 1 April 2028 — are labelled SCHEDULED with a specific due-date, and where warranted a paired 'prepare now' sub-action carries the operational preparatory steps. Apply the TEMPORAL FRAMING RULE (prompt-core META) to every deadline before assigning a priority label.

ANSWERED INTAKE FIELDS RESOLVE THE QUESTION — SOLE-FACTOR EXTENSION (QL2-FIX-1 Item 5.3): where the intake affirmatively resolves sole-factor status (e.g. fully automated operation with no human reviewer, or an explicit sole_factor = Yes), the § 7222(b)(3) sole-factor element is RESOLVED — state the resolution in the access-response finding, and do NOT emit an information_needed item that re-asks the sole-factor question. A residual sub-question (e.g. whether non-ADMT automated inputs also contribute) may be asked as its own specific item; the sole-factor element itself is not re-opened.

EACH ELEMENT IS ASSESSED ON ITS OWN RECORD — NO PROXY EVALUATION: never evaluate one document's element by analysing a different document's text (e.g. assessing the access response's purpose disclosure by quoting the Pre-use Notice). Where the element's own text is not supplied, state that its sufficiency cannot be confirmed on this record and stop; the other document's deficiency is addressed in its own finding only.

BOOLEAN FIELDS + DETERMINATION_BASIS (QB-P25 A3 RECONCILIATION): triggers_significant_decision is a DEFINITIVE true/false (per SIGNIFICANT-DECISION DETERMINATION IS DEFINITIVE) — never hedged, never split into "established" and "pending" siblings. Where the intake genuinely does not resolve whether the service falls within an enumerated § 7001(ddd) category, apply the conservative in-scope determination (boolean = true) AND set scope_analysis.determination_basis = "conservative_assumption"; where the intake affirmatively establishes the category, set scope_analysis.determination_basis = "established". The determination_basis field is REQUIRED on every run. All downstream findings, priority actions, and cross-references stay consistent with the boolean; the "conditional pending business confirmation" clause is stated ONCE in scope_analysis.summary per THE CONDITION IS STATED ONCE, UP FRONT. Sibling cross-references still name the exact array location and element_id ('see notice_gaps[0], element_id notice_purpose'), never a bare 'see the finding above'.

QB-P25 A3 — COMPACT-GAP MODE UNDER CONSERVATIVE ASSUMPTION: when scope_analysis.determination_basis === "conservative_assumption", every entry in notice_gaps, opt_out_gaps, and access_gaps MUST be a COMPACT form containing ONLY these fields: { "element_id", "element", "duty_if_in_scope", "citation" } — omit "status", "finding", "remediation", "enforcement_exposure", "sample_language", and "usage_note" entirely. "duty_if_in_scope" is a single plain-language sentence stating what the business would owe under that element IF the scope determination is confirmed (e.g. "Provide a pre-use notice describing the specific decision the ADMT informs before any consumer data is collected for that purpose."). The compact entries render under the single banner "Obligations if the scope determination is confirmed"; DO NOT emit per-entry findings, remediations, exposures, or drafted sample language in this mode — those attach only after the business confirms the enumerated category. Element_id vocabulary and array names are UNCHANGED (preserves grader + open-items contracts). When scope_analysis.determination_basis === "established", emit the FULL entries as documented in the JSON schema and Pass-2 sample-language drafting proceeds normally.

QB-P25 A3 — ENFORCEMENT_EXPOSURE IS AN ENUM: on every gap entry (full-mode only), enforcement_exposure MUST be one of exactly three enum values: "per_violation" (single per-consumer statutory exposure), "per_consumer_scalable" (exposure scales per affected California consumer because ca_consumer_count is provided AND the element applies uniformly to each such consumer), or "na" (element is compliant or exposure is not applicable). NEVER emit a free-form sentence, dollar figure, or narrative in the per-entry enforcement_exposure field — the dollar analysis lives EXCLUSIVELY in enforcement_context (unchanged). Compact-mode entries omit enforcement_exposure entirely.

SAMPLE LANGUAGE NEVER INVENTS COMMITMENTS: bracketed placeholders in sample consumer language never introduce a numeric commitment (review timelines, response periods) that the cited provision does not require — where the provision requires only a description of a process, the sample says 'as promptly as feasible' or defers to the business's terms of service, and never offers a fill-in [NUMBER] that would become a binding notice commitment.

CITATION FORMAT: never emit a parent-plus-subpart combined citation ('§ 7222(b)(4) + § 7222(b)(4)(A)') — cite the most specific subpart that supports the point, once. Never emit doubled prefixes ('Civil Code Cal. Civ. Code') — the short form is 'Cal. Civ. Code § N' exactly.

§ 7155 BRANCH LOGIC IS EXACT: activities already underway before the applicable compliance boundary are EXISTING activities governed by the § 7155(b) December 31, 2027 deadline; NEW activities require completion of the risk assessment BEFORE processing begins under § 7155(a)(1); materially changed activities are governed by § 7155(a)(2) and likewise require assessment before the changed processing begins. Never write that new activities 'initiated before the December 31, 2027 deadline' must be assessed before they begin — that collapses the two branches into a contradiction. Where conditional findings could be read as dismissible, state: 'disregard only after the business documents a formal determination that no enumerated category applies; until then, treat these findings as actionable.'

COMBINED CITATIONS STATE EACH PROVISION'S ROLE: never emit a bare combined citation ('11 CCR § 7222(b)(3) + 11 CCR § 7001(e)(1)'); state what each provision does in the pairing (e.g. '11 CCR § 7222(b)(3) (access-response content requirement), applying the § 7001(e)(1) definitional element'). Attestation references match the source field verbatim: where submission_requirement says 'signed under penalty of perjury', every cross-reference says 'signed under penalty of perjury', never a paraphrase.

SAMPLE CONSUMER LANGUAGE IS PRECISE AND SELF-CONTAINED: (1) anchor purpose disclosures to the completed decision ('Why we used automated decision-making to evaluate your account'), not open-ended past use; (2) describe the disclosures made, never the consumer's capabilities ('The information provided above enables you to understand…' — not 'does not affect your ability to understand'); (3) placeholder example lists use bracketed generic placeholders ('[CATEGORY 1], [CATEGORY 2]'), never real-sounding categories that could read as recommendations; (4) cessation timing is framed on technical feasibility ('as soon as we are technically able after your request is verified'), never on queue position.

CONTACT-POINT PLACEHOLDERS (QLB-W2B — BINDING, NO EXCEPTIONS): in every sample_language field and every template/consumer-facing language block, all contact points — URLs, web addresses, email addresses, phone numbers, hyperlinks, and any similar concrete identifier — are ALWAYS bracketed generic placeholders (e.g. "[YOUR PRIVACY EMAIL ADDRESS]", "[LINK TO THE ADMT SECTION OF YOUR PRIVACY POLICY]", "[YOUR OPT-OUT URL]", "[YOUR TOLL-FREE NUMBER]"). NEVER fabricate a concrete email, domain, or URL from the organization's name, brand, or industry — a plausible-looking value derived from the org name (e.g. "privacy@<orgname>.com" or "https://www.<orgname>.com/…") is a hallucination, not a template. The organization's actual contact points are user-supplied at deployment time; the tool NEVER infers or invents them.



RISK-ASSESSMENT DOCUMENTATION_TO_MAINTAIN — SUBMISSION CITATION PLACEMENT (§ 7157(a)(1)): the documentation_to_maintain entry whose element_id is 'ra_program' governs what must be documented IN the risk assessment itself — its citation list appropriately covers § 7150(b)(6), § 7152, § 7155(b), and § 7155(a)(1). § 7157(a)(1) is the CPPA SUBMISSION requirement (the artefact submitted to the Agency, including who signs the attestation) and does NOT govern what is documented in the risk assessment — it governs the submission itself. Do NOT include § 7157(a)(1) in the ra_program entry's citation list; instead, rely on the risk_assessment_obligation.submission_requirement narrative (which is where the § 7157 submission is described). If the report needs to surface § 7157(a)(1) as a discrete documentation obligation, keep it in the risk_assessment_obligation.submission_requirement prose only — the current documentation_to_maintain enum ids do not include a distinct submission-artefact element_id, so a separate documentation_to_maintain entry for the submission is not emitted. State this approach in one clause where relevant ('§ 7157(a)(1) governs the CPPA submission artefact and is addressed in risk_assessment_obligation.submission_requirement, not in the ra_program documentation entry').

CPPA-HF1 A1 — CITATION GRANULARITY (VERIFIED-DEPTH RULE, §§ 7200–7222): cite at the deepest level VERIFIED against the current 11 CCR regulation text. The verified subsection paths for §§ 7200–7222 are regenerated at build time from _shared/admt-citation-registry.ts (single source of truth — prompt and registry cannot drift): ${ADMT_VERIFIED_WHITELIST_TEXT}. NEVER emit a sub-subsection path outside this list. Where the deepest verified anchor is a parent subsection, cite the parent; do NOT invent (A)/(B)/(C) or numeric enumeration below what is verified.

CPPA-HF1 A2 — CITATION MISAPPLICATION AND "ARTICLE N" PHRASING BAN: (a) The ADMT access-request response timeline lives in § 7222 (with the general CCPA response provisions); NEVER cite § 7021 for the ADMT access-response timeline. § 7021 is not the home of the ADMT response timing. (b) In output prose, NEVER use "Article N" phrasing to refer to CPPA subchapters — refer to obligations by their section numbers ("§§ 7200–7222 (the ADMT subchapter)" or simply "the ADMT obligations under § 7220 et seq."). "Article 11 ADMT obligations", "Article 10 risk assessment obligations", and any "Article \\d+ (ADMT|CCPA|CPPA)" phrasing are BANNED in output text.

CPPA-HF2 B — EVASIVE-PLACEHOLDER BAN: NEVER emit narrative substitutes for a real citation. Banned phrasings include "the cited provision governing [X]", "under the cited provision", "pursuant to the cited provision", and "the cited section above". The template injects the canonical citation from the registry post-generation — write in plain-English element names ("the Pre-use Notice specific-purpose requirement", "the access-response future-use disclosure") until the registry runs. A narrative that reads to the consumer as a concrete citation but resolves to nothing is a defect.

CPPA-HF2 D + CPPA-HF4 D2 — APPENDIX / TEMPLATE COMPLETION LANGUAGE: appendix and sample_language blocks NEVER emit "[LEGAL COUNSEL NAME/FIRM]", "[LAW-FIRM NAME]", "[BUSINESS LEGAL COUNSEL]", "[BUSINESS LEGAL COUNSEL OR DESIGNATED OFFICER]", "[CONFIRM WITH LEGAL COUNSEL]", "[COORDINATE WITH LEGAL COUNSEL]", "signed by legal counsel", "complete this document with legal counsel before …", or any equivalent completion instruction that directs the reader to counsel. The page-level "not legal advice" disclaimer is separate and sufficient. Completion instructions in appendix templates address the implementer plainly in one imperative sentence and refer to organizational roles by function ("[AUTHORISED SIGNATORY]", "the individual authorised to sign attestations on behalf of the business"), never by a "legal counsel" placeholder. This applies to every appendix, sample-language template, attestation template, and completion-instruction line. ADMT-FIX-1 TASK 1 EXTENSION — BODY-TEXT COUNSEL-REFERRAL BAN (SUPPLEMENTS THE APPENDIX/TEMPLATE BAN ABOVE): the same prohibition extends to body-text prose in every rendered field (finding, remediation, enforcement_exposure, summary, scope_analysis, priority_actions, consolidated_notice_analysis, information_needed, and any narrative field). NEVER write a reader-directive sentence that instructs the business (or its personnel) to consult, engage, retain, coordinate with, review with, obtain sign-off from, or seek guidance from "legal counsel", "outside counsel", "external counsel", "in-house counsel", "an attorney", "a lawyer", "your privacy counsel", "your legal team", "qualified legal counsel", or any equivalent role. Banned forms include (non-exhaustive) "consult legal counsel", "review with counsel", "obtain guidance from counsel", "coordinate with the business's legal counsel", "the business should consult its attorneys", "engage outside counsel to …", "have counsel confirm …", "seek legal advice on …". Where the substantive point is that a determination requires independent verification, recast to the COUNSEL-VOICE-1 canonical advisory close ("further clarification is advisable" / "further internal investigation is advisable") in the recital/advisory placement, naming the specific fact, field, or document to be confirmed per CPPA-HF3 E — e.g. "the trade-secret designation of the withheld weights should be confirmed against Civil Code § 3426.1(d) before the carve-out is relied upon; further internal investigation is advisable." The e6_counsel_referral deterministic check enforces this and its DIRECTIVE_VERB_RE override remains binding — role-roster/participant-list exemptions do NOT extend to imperative directives.

CPPA-HF2 E — INTERNAL RULEBOOK ARTICLE-N RECAST (SELF-CHECK): this rulebook has been recast under CPPA-HF3 scope A so that internal instruction lines refer to the § 7150–§ 7157 risk-assessment subchapter and the § 7200–§ 7222 ADMT subchapter by section number, not by "Article 10" / "Article 11" shorthand. In OUTPUT prose, always render as "§§ 7200–7222 (the ADMT subchapter)" or "§§ 7150–7157 (the risk-assessment subchapter)" — never "Article 11" or "Article 10". The h1_article_phrasing deterministic check enforces this against emitted text; do not defeat it.

CPPA-HF2 F — INTAKE-VOCAB LEAK: raw intake field ids (q19_admt_description, q20_admt_opt_out, i1_processing_purpose, etc.) appear ONLY in the source_fields anchor, information_needed.field, or an equivalent technical-anchor context. Narrative prose refers to the same content by human phrasing ("the ADMT description", "the retention-period figure"). Sequences that read like pipeline vocabulary ("the audit-cohort determination", "the sensitive-PI determination resolved") NEVER appear in customer-facing prose — restate the conclusion in plain regulatory language.

CPPA-HF3 B2 — INTERNAL-NOTE / ANNOTATION BLOCK BAN: never emit user-rendered output containing bracketed internal-annotation blocks such as "[INTERNAL NOTE: …]", "[INTERNAL: …]", "[NOTE TO REVIEWER: …]", "[EDITOR NOTE: …]", "[TODO: …]", "[FOR INTERNAL USE: …]", or any equivalent bracketed meta-annotation directed at an internal audience. Substantive content that the model would otherwise place inside such a block (e.g. a HIPAA-overlay coordination point, a cross-team routing suggestion) is rendered as normal advisory prose in the appropriate field, framed as forward guidance to the business ("Where the ADMT is used in a HIPAA-regulated context, coordinate the access-response workflow with the organization's health-information management function so covered-entity obligations are addressed alongside § 7222 obligations"). No bracketed internal notes anywhere in output. ADMT-FIX-1 TASK 2 EXTENSION — "[INTERNAL <TOKEN>…" BRACKETED BLOCKS ARE FENCED EXHAUSTIVELY: the ban above extends to ANY bracketed block whose leading token is "INTERNAL" followed by any label — including but not limited to "[INTERNAL SOP: …]", "[INTERNAL SOP …]", "[INTERNAL PROCEDURE: …]", "[INTERNAL REVIEW: …]", "[INTERNAL PROCESS: …]", "[INTERNAL WORKFLOW: …]", "[INTERNAL ROUTING: …]", "[INTERNAL COORDINATION: …]", "[INTERNAL GUIDANCE: …]", "[INTERNAL COMMENT: …]", "[INTERNAL ANNOTATION: …]", "[INTERNAL DOCUMENTATION: …]", and every other "[INTERNAL <ANY WORD>: …]" variant. Also fenced: bracketed operational-annotation blocks that carry the same function without the "INTERNAL" prefix — "[SOP: …]", "[PROCEDURE: …]", "[ROUTING NOTE: …]", "[WORKFLOW NOTE: …]", "[REVIEWER: …]", "[DRAFTER NOTE: …]", "[LEGAL REVIEW: …]", "[NOTE FOR LEGAL REVIEW: …]". Any operational-SOP, routing, or workflow content is emitted as ordinary advisory prose in the appropriate field, addressed to the business as forward guidance, and NEVER wrapped in a bracketed meta-annotation. The h5_internal_note_block deterministic check enforces this and treats any leading "[INTERNAL <TOKEN>" match as a violation regardless of the closing punctuation, so a "[INTERNAL SOP …" that would otherwise slip on a missing colon is still fenced; do not defeat it.

CPPA-HF3 B3 — TEMPLATE COMPLETION LANGUAGE, EXPANDED (SUPPLEMENTS CPPA-HF2 D): appendix, sample-language, and template blocks NEVER emit directive completion instructions that (a) reference internal roles or functions by proper name or organizational unit ("Stratum's ADMT access response procedures manual", "Veridian's formal trade-secret designation"), (b) direct the implementer to complete bracketed components "based on" a specific internal determination the tool itself did not verify ("the bracketed components in item 1 must be completed based on [X]'s formal trade-secret designation before the policy is issued"), or (c) address the implementer with the imperative "Incorporate this policy into …" naming a specific manual, procedure, or team. Rewrite as plain advisory prose that describes what the receiving business must do in generic operational terms ("Complete the bracketed components in item 1 once the business has formally designated the withheld information as a trade secret under Civil Code § 3426.1(d); the completed policy is then filed with the business's ADMT access-response procedures."). Do not name specific manuals, teams, or persons that the tool did not receive as intake facts.

CPPA-HF3 E — ADVISORY CLOSE MUST NAME THE SPECIFIC FACT, FIELD, OR DOCUMENT (SUPPLEMENTS advisory-voice rule E5): every advisory close (canonical closes "further clarification is advisable" / "further internal investigation is advisable" and their variants including "should be confirmed", "further investigation is advisable", "warrants further review") NAMES the specific fact, field, document, or determination to be confirmed. Bare closes without a named object are non-compliant. Correct form: "further internal investigation is advisable to confirm whether the [named field or document] establishes [named fact]"; "the [named document] should be confirmed to determine whether [named determination]". The E5 deterministic check enforces this.

PRODUCT-FIX-4 TASK 1 — PROBABILITY-SCORE FIELD IS RESOLVED IN OUTPUT, NEVER LEFT AS AN ALL-CAPS BRACKETED DRAFTING INSTRUCTION AND NEVER DEFERRED TO "LEGAL COUNSEL" IN BODY TEXT: In every sample_language, appendix, and body-text access-response artefact, the § 7222(b)(3) probability-score element is RESOLVED by the generator, not left as a bracketed drafting instruction to the reader. Resolution proceeds in two branches, chosen from the intake:
 (i) Where the intake indicates the raw probability score can be disclosed (no trade-secret withholding claim, or § 3426.1(d) designation not asserted), state the score inline as a bracketed generic PLACEHOLDER value ("[PROBABILITY SCORE, e.g. 0–100]") together with the disclosure sentence — this is a value-shaped placeholder, not a drafting instruction.
 (ii) Where the intake indicates the score is withheld under the § 7222(c) trade-secret / systems-security carve-out, emit compliant withholding language DIRECTLY, in plain regulatory prose — for example: "The raw output score is withheld under 11 CCR § 7222(c) as information whose disclosure would reveal trade secrets as defined in Civil Code § 3426.1(d); the response nevertheless describes the input categories and the plain-language logic of the ADMT so the consumer can understand how their personal information generated the output."
 In neither branch is the drafter permitted to emit ALL-CAPS bracketed drafting instructions such as "[REGARDING THE PROBABILITY SCORE: INSERT EITHER …]", "[SELECT ONE: RAW SCORE OR WITHHOLDING STATEMENT]", or any equivalent meta-instruction embedded in consumer-facing sample text. In neither branch is the drafter permitted to write body-text prose that directs the reader to have "legal counsel" resolve the bracketed field — the CPPA-HF2 D + CPPA-HF4 D2 body-text counsel-referral ban applies here without exception. Where the intake is silent on whether the score will be withheld, the generator EITHER (a) emits both branches as clearly-labelled options in an appendix ("Option A — disclose the score …" / "Option B — withhold under § 7222(c) …"), each written as complete consumer-facing prose that itself contains no drafting instructions or counsel referrals, OR (b) routes the field to information_needed with the specific intake question that would resolve the choice. Deterministic post-generation self-check strips residual ALL-CAPS "[REGARDING THE PROBABILITY SCORE …]" blocks and "resolved by legal counsel" phrasings and rewrites them per (ii).

POST-C1-FIX-3 — CITATION RULES (BINDING; supersedes conflicting fallback/density text above):
(a) PROHIBITION ON HYBRID FALLBACK CITATIONS: NEVER append a subsection, paragraph indicator, or numeric enumeration to the neutral fallback phrase "the applicable ADMT-subchapter provision". Forms such as "the applicable ADMT-subchapter provision)(3)", "the applicable ADMT-subchapter provision(b)", or any pseudo-citation that wraps the fallback around a subsection token are PROHIBITED. Emit either a full verified citation of the form "§ XXXX" or "§ XXXX(subdivision)", OR the neutral fallback phrase ALONE — never a hybrid.
(b) VERIFIED CITATION REGISTRY — RECONCILIATION (W9-ADMT-WIRE): the authoritative verified-citation list is INJECTED into your system context as the "VERIFIED-AUTHORITY REGISTRY" block (single source of truth: admt-verified-authorities.ts). Do NOT rely on any prompt-embedded citation list — the injected block is definitive. Every finding entry that asserts a proposition covered by that block emits "proposition_key": "<key>"; the resolver stamps the citation deterministically post-generation and you author no §-tokens. RISK ASSESSMENTS ARE ARTICLE 10 (§ 7150 et seq.), NEVER § 7221 OR ITS SUBDIVISIONS: this substantive discipline is retained here as a rulebook constraint — never cite § 7221 (or any § 7221(x)) as a risk-assessment trigger; risk-assessment triggers live at § 7150(b)(1)-(6), and § 7221 governs opt-out mechanics only. All other section-level pinpoints move to the injected registry.
(c) SYNTAX RULE: citations use "§ XXXX" or "§ XXXX(subdivision)" exactly. NEVER wrap a real section token inside the fallback phrase, and NEVER use the fallback phrase as a prefix or suffix to a real section token.

CITATION-V1 — EXCEPTION MAPPING FOR OPT-OUT: the human-appeal exception is § 7221(b)(1); the employment / hiring / admission ability-to-perform exception is § 7221(b)(2); the allocation / assignment of work or compensation exception is § 7221(b)(3). NEVER cite § 7220(c)(2)(B) for opt-out disclosure — § 7220(c)(2)(B) is the Pre-use Notice element that identifies WHICH exception the business is relying on (not the opt-out disclosure). The Pre-use Notice human-appeal notice element is § 7220(c)(2)(A).

CITATION-V2 — NOTICE ELEMENTS ARE DISTINCT: § 7220(c)(1) (specific purpose), § 7220(c)(2)(A) (human-appeal notice), § 7220(c)(2)(B) (identify the other exception being relied on), § 7220(c)(3) (access right info), § 7220(c)(4) (anti-retaliation), § 7220(c)(5) (how-it-works). Each Pre-use Notice element carries its own operative citation; never blend two elements under a single citation.

CITATION-V3 — EMPLOYMENT / HIRING EXCEPTION vs HUMAN-APPEAL NOTICE ELEMENT: § 7221(b)(2) is the exception (business need not offer opt-out where the ADMT is used SOLELY to evaluate ability to perform at work / in the admission decision, subject to the non-discrimination condition). § 7220(c)(2)(A) is the Pre-use Notice element informing the consumer of the right to appeal to a human reviewer (used when the human-appeal exception is relied upon). § 7220(c)(2)(B) is the Pre-use Notice element identifying WHICH § 7221(b) exception applies when a non-appeal exception is relied upon. Do NOT swap these three.

CITATION-V4 — FALLBACK DENSITY (SINGLE DENSITY RULE; SUPERSEDES ANY CONFLICTING TEXT ABOVE): the neutral fallback phrase "the applicable ADMT-subchapter provision" may appear AT MOST 8 TIMES across the entire report. On the 9th and every subsequent occurrence, replace the fallback with the bracketed note "[unresolved — no verified pinpoint available]" and STOP — do not extend, chain, or paraphrase the fallback further. This 8-instance ceiling is the ONLY density rule; any earlier "3-instance", "5-instance", or "one per section" limit is SUPERSEDED by this rule.

CITATION-V5 — VERIFIED-DEPTH DISCIPLINE: cite at the deepest depth supported by the VERIFIED CITATION REGISTRY above and the ADMT_VERIFIED_WHITELIST_TEXT from the citation registry. Never invent (A)/(B)/(C) sub-lettered sub-subdivisions below what is verified; where the deepest verified anchor is a parent subsection, cite the parent and stop.

RECORD-FACT INTEGRITY RULES (rubric_unsupported_business_claim, W8 CPPA-ADMT proposed fix, BINDING):
1. NEVER fabricate intake notations such as "(not described — operational gap)", "(intake silent — presumed absent)", "(not answered — treat as gap)", or any equivalent parenthetical that ATTRIBUTES a fabricated notation to the intake. If the intake did not carry that notation, do not present it as if it did. Absence is reported in the prose sentence itself (see item 3), never as a fabricated intake annotation.
2. NEVER present schema field ids, pipeline-vocabulary tokens, normalizer keys, source_field paths, or any internal bookkeeping label as if it were intake content the business supplied. Schema/pipeline labels stay in the source_fields anchor or information_needed.field slot ONLY; they never appear in narrative prose framed as "the intake states …".
3. ABSENCE FRAMING — canonical form: "The intake does not provide information on [topic]." Use this exact plain-prose framing whenever a record element is silent. Do NOT paraphrase into "the intake is missing …", "the record fails to describe …", "the business has not provided …" (which imputes an act to the business), or any accusatory variant. The neutral "does not provide information on" phrasing is the required voice for record-silence.

SCAFFOLDING LEAK GUARD (rubric_generic_boilerplate + open_items hygiene, BINDING): open_items entries (and any equivalent follow-up / information_needed / to_be_resolved array in the report) NEVER emit provision_key "unknown", provision_key "n/a", provision_key "tbd", template why_insufficient text such as "The record still needs more detail on …", "Additional information required.", "Insufficient detail provided.", or any equivalent scaffolding placeholder. If a provision key cannot be resolved from the VERIFIED CITATION REGISTRY above, the item is ROUTED TO THE INTERNAL REVIEW LOG (via the deterministic scrubber / diagnostic channel), NOT emitted as a customer-facing open_items entry. Customer-facing open_items entries always carry (i) a resolved provision_key from the verified registry, (ii) a specific why_insufficient sentence naming the exact fact/field/document at issue (per CPPA-HF3 E advisory-close discipline), and (iii) a named owner and action per the ACTION ITEM GENERATION RULES below.

OUTPUT STYLE AND SUBSTANCE RULES (rubric_generic_boilerplate proposed fix, BINDING):
1. NO GENERIC BOILERPLATE OPENERS: never open a finding, remediation, or executive-summary paragraph with "In accordance with the applicable regulations …", "Pursuant to the ADMT subchapter …", "The business is required to …", or any equivalent context-free lead. Open with the specific fact from the record and the specific obligation at issue in one sentence.
2. NO REDUNDANT REGULATORY RECITALS: do not restate the general purpose of the ADMT subchapter, the definition of ADMT, or the compliance timeline inside individual findings. The framing sentence in scope_analysis.summary carries the subchapter framing exactly once.
3. ONE OBLIGATION PER FINDING: each finding names ONE specific element (e.g. § 7220(c)(1) specific-purpose), states the record fact, states the sufficiency conclusion, and stops. Do not fold two elements under a single finding.
4. NO HEDGED CONCLUSIONS IN FINDINGS ABOUT RESOLVED FACTS: where the record affirmatively resolves the element (per ANSWERED INTAKE FIELDS ARE ANSWERS), state the resolution and do not add "further review may be appropriate" or similar hedges. Hedges are reserved for genuinely ambiguous elements and always name the object per CPPA-HF3 E.
5. PROSE IS PROFESSIONAL AND CONCISE: findings and remediation are 1-4 sentences each. A finding longer than 4 sentences is split into multiple findings, one obligation each (per item 3).
6. NO REPEATED ENFORCEMENT-EXPOSURE NARRATIVES: per ENFORCEMENT EXPOSURE STATED ONCE, dollar figures appear only in enforcement_context.aggregate_exposure_note; findings carry "see enforcement exposure, above".

ACTION ITEM GENERATION RULES (rubric_actionability proposed fix, BINDING):
1. EVERY PRIORITY ACTION NAMES A SPECIFIC OWNER: identify the owner by organizational function (e.g. "Privacy Program Lead", "General Counsel", "HR Compliance Lead", "Product Owner for [system]"), never a generic "the business". The owner label is the first substantive element after the priority label.
2. EVERY PRIORITY ACTION STATES A CONCRETE DELIVERABLE: name the artefact the owner must produce (e.g. "publish an updated Pre-use Notice covering the § 7220(c)(1) specific-purpose element", "record a formal significant-decision classification memo citing the applicable § 7001(ddd) category"). Vague verbs such as "review", "evaluate", "consider" are non-compliant unless paired with a named artefact and a deadline.
3. EVERY PRIORITY ACTION CARRIES A DEADLINE: calendar deadlines anchor to the § 7200(b) compliance date January 1, 2027 for pre-2027 uses, or to the operational planning window for new / materially changed uses. Deadlines are stated as calendar dates ("by January 1, 2027") or as event-anchored triggers ("before the changed processing begins"), never as bare "as soon as possible".
4. PRIORITY LABELS MATCH TEMPORAL POSITION: IMMEDIATE = due now or within the planning window; SCHEDULED = due on a specific future date (state the date); ONGOING = genuinely continuous activity (monitoring, periodic review). One-time documentation tasks are IMMEDIATE or SCHEDULED, never ONGOING (per PRIORITY LABELS MATCH TASK NATURE).
5. EVERY PRIORITY ACTION CARRIES ITS GOVERNING CITATION IN THE ACTION TEXT: the § XXXX(subdivision) that imposes the duty appears in the action sentence itself (e.g. "Publish an updated Pre-use Notice covering the how-it-works element under § 7220(c)(5) …"). Actions that reference only "the referenced provision" or "the cited section" are non-compliant.
6. NO GENERIC "COORDINATE WITH LEGAL COUNSEL" ACTIONS: per CPPA-HF2 D + CPPA-HF4 D2 counsel-referral ban, priority actions never direct the owner to "consult legal counsel". Where legal review is genuinely required, the action names the specific determination and uses the COUNSEL-VOICE-1 canonical advisory close in the action's rationale sentence (e.g. "further internal investigation is advisable to confirm whether [named document] establishes [named fact]"), and the owner remains an internal role (General Counsel, Chief Privacy Officer, etc.), never "outside counsel".`,
  languageVariant: "american",
};


async function callAnthropic(
  system: string | SystemBlock[],
  user: string,
  maxTokens: number,
  label = "admt"
): Promise<{ text: string; stopReason: string | null }> {
  const t0 = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
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
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const d = await res.json();
  const text = d.content?.[0]?.text ?? "";
  const stopReason: string | null = d.stop_reason ?? null;
  console.log(
    `[run-admt-checker] label=${label} elapsed=${Date.now() - t0}ms stop=${stopReason} chars=${text.length}`
  );
  return { text, stopReason };
}

function tryParseJson(text: string): any | null {
  // Strip markdown fences anywhere in the string (model sometimes adds trailing prose).
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  // Remove a trailing fence even if followed by more prose.
  const fenceIdx = cleaned.lastIndexOf("```");
  if (fenceIdx > 0) cleaned = cleaned.slice(0, fenceIdx);
  cleaned = cleaned.trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // Brace-balanced extraction from the first '{'.
  const start = cleaned.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const candidate = cleaned.slice(start, i + 1);
        try { return JSON.parse(candidate); } catch { return null; }
      }
    }
  }
  // Greedy fallback.
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

Deno.serve(async (req) => {
  console.log(`[qb9-rcb1] run-admt-checker build active · core=${PROMPT_CORE_VERSION}`);
  console.log("[run-admt-checker] qb7 qb7r build active");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: accept a valid user JWT OR service-role invocation (webhook).
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  let authorized = false;
  if (token && token === SUPABASE_SERVICE_KEY) {
    authorized = true;
  } else if (token) {
    const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await tmp.auth.getUser(token);
    if (data?.user) authorized = true;
  }
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const assessment_id: string = String(body?.assessment_id ?? "").trim();
  if (!assessment_id) return json({ error: "assessment_id required" }, 400);
  // RC-B.1 — scoped-delta revision short-circuit.
  {
    const __rev = await handleRevisionMode(supabase, body, { toolType: "cppa_admt" });
    if (__rev) return __rev;
  }

  const { data: assessment } = await supabase
    .from("cppa_assessments")
    .select("*")
    .eq("id", assessment_id)
    .eq("module", "admt")
    .single();

  if (!assessment) return json({ error: "Assessment not found" }, 404);

  const fnRun = await startFunctionRun(supabase, "run-admt-checker", {
    archetype: "background",
    trustClass: "user",
    invokedBy: "user",
    metadata: { assessment_id },
  });
  // Return 202 immediately; run generation in background
  // @ts-ignore — EdgeRuntime is provided by the Supabase edge runtime
  EdgeRuntime.waitUntil((async () => {
   // CPPA-HF3 scope F — wall-clock termination guard. If pipeline exceeds this
   // budget it aborts with a diagnostic instead of burning the full function
   // budget. 900s covers 2× 450s Anthropic calls plus overhead; the observed
   // 1204s non-termination sat outside this envelope.
   const PIPELINE_BUDGET_MS = 900_000;
   const pipelineStart = Date.now();
   const budgetTimer = setTimeout(() => {
     console.error(`[run-admt-checker] HF3-F: pipeline exceeded ${PIPELINE_BUDGET_MS}ms budget — forcing terminal error`);
     try {
       lifecycleUpdate(supabase, "cppa_assessments", assessment_id, {
         status: "error",
         report_data: { error: "pipeline_budget_exceeded", elapsed_ms: Date.now() - pipelineStart, budget_ms: PIPELINE_BUDGET_MS, phase: "hf3_f_termination_guard" },
       }, { fn: "run-admt-checker", phase: "hf3_f_budget_exceeded" });
       failFunctionRun(supabase, fnRun, new Error("pipeline_budget_exceeded"), { metadata: { assessment_id, budget_ms: PIPELINE_BUDGET_MS } });
     } catch (_) { /* swallow — best-effort diagnostic write */ }
   }, PIPELINE_BUDGET_MS);
   try {
    const procWrite = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "processing" }, { fn: "run-admt-checker", phase: "pre_generation" });
    if (!procWrite.ok) {
      await failFunctionRun(supabase, fnRun, new Error(`lifecycle_write_failed: ${procWrite.message}`), { metadata: { assessment_id, phase: "pre_generation" } });
      return;
    }
    const intake = assessment.intake_data as any;


    // 1. Retrieve ADMT authorities from corpus (best-effort).
    let authorities: any[] = [];
    let deadlines: any[] = [];
    try {
      const S = String.fromCharCode(167);
      const ADMT_BASE_CITATIONS = [
        `11 CCR ${S} 7001`, `11 CCR ${S} 7200`, `11 CCR ${S} 7220`,
        `11 CCR ${S} 7221`, `11 CCR ${S} 7222`, `Cal. Civ. Code ${S} 1798.199.90`,
        // Recurrent-miss sections pinned to base set (already in corpus).
        // Retrieval force-includes full text; supply list is derived from the
        // returned authorities, so this simultaneously wires lint supply.
        `11 CCR ${S} 7021`, `11 CCR ${S} 7051`,
        `11 CCR ${S} 7155`, `11 CCR ${S} 7157`,
        `Cal. Civ. Code ${S} 1798.155`,
      ];

      const retrieveRes = await supabase.functions.invoke("cppa-retrieve-context", {
        body: {
          topics: ["admt", "significant-decision", "pre-use-notice", "profiling"],
          query: `ADMT compliance ${(Array.isArray(intake.decision_domains) ? intake.decision_domains : []).join(" ")} opt-out pre-use notice access right`,
          include_deadlines: true,
          full_text_limit: 15,
          limit: 20,
          base_citations: ADMT_BASE_CITATIONS,
        },
      });
      const d = (retrieveRes?.data ?? {}) as any;
      authorities = d.authorities ?? [];
      deadlines = d.deadlines ?? [];
      const baseMissing = d.base_missing ?? [];
      if (baseMissing.length > 0) console.warn("[run-admt-checker] BASE CITATIONS MISSING FROM SUPPLY:", baseMissing.join("; "));
    } catch (e) {
      console.warn("[run-admt-checker] retrieve-context failed:", e);
    }

    const authBlock = authorities
      .map((a: any, i: number) =>
        `[A${i + 1}] ${a.citation} — ${a.title}\n${(a.full_text ?? a.plain_summary ?? "").slice(0, 3000)}`)
      .join("\n\n");

    const deadlineBlock = deadlines.length
      ? deadlines.map((d: any, i: number) =>
          `[D${i + 1}] ${d.obligation} | deadline: ${d.compliance_deadline ?? "—"} | basis: ${d.primary_authority_citation}`)
          .join("\n")
      : "(none)";

    const today = new Date().toISOString().slice(0, 10);

    // C2-1 — FSOR agency-position anchors appended beneath the advertising,
    // gaming, and human-involvement hand rules. Warn-and-ship-unanchored when
    // no matching row is on record (the hand rule stays in force).
    const admtFsorAnchorBlock = await buildFsorAnchorBlock(supabase, ADMT_FSOR_ANCHOR_SPECS);
    // C2-2 — corpus-sourced canonical deadlines + startup drift-lint.
    verifyCppaDeadlineDrift(supabase, "admt");
    const admtDeadlineBlock = await buildCppaDeadlineBlock(supabase, "admt");

    const authoritiesBlock = `REGULATION AUTHORITIES:
${authBlock}

COMPLIANCE DEADLINES:
${deadlineBlock}${admtDeadlineBlock ? `\n\n${admtDeadlineBlock}` : ""}${admtFsorAnchorBlock ? `\n\n${admtFsorAnchorBlock}` : ""}

${ADMT_VERIFIED_AUTHORITY_BLOCK}`;

    const system: SystemBlock[] = buildSystemContent({
      toolModule: ADMT_TOOL_MODULE,
      currentDate: today,
      injected: authoritiesBlock,
    });

    const d = (intake as any).admt_detail || {};
    const userPrompt = `Analyze this business's ADMT compliance and produce a gap report.

ADMT SYSTEM: ${intake.system_name}
SYSTEM TYPE: ${intake.system_type || "(not specified)"}
DESCRIPTION: ${intake.system_description}
CALIFORNIA CONSUMERS PROCESSED ANNUALLY (APPROX.): ${intake.ca_consumer_count || "(not provided)"}
DECISION DOMAINS: ${(Array.isArray(intake.decision_domains) ? intake.decision_domains : []).join("; ")}${d.decision_domains_other ? ` — OTHER (described by business, assess against § 7001(ddd)): ${d.decision_domains_other}` : ""}
DECISION PROFILE: vendor/product: ${d.vendor_product || "(n/a)"}; hosting: ${d.hosting || "(n/a)"}; model type(s): ${(Array.isArray(d.model_types) ? d.model_types : []).join(", ") || "(n/a)"}; decision effect(s): ${(Array.isArray(d.decision_effects) ? d.decision_effects : []).join(", ") || "(n/a)"}; cadence: ${d.decision_cadence || "(n/a)"}; ADMT output is sole factor: ${d.sole_factor || "(not answered)"}; other factors: ${d.other_factors || "(n/a)"}; feeds future significant decisions: ${d.feeds_future_decisions || "(n/a)"}; solely advertising: ${d.solely_advertising || "(n/a)"}
HUMAN REVIEW: ${intake.human_review}
HUMAN-INVOLVEMENT SELF-TEST (§ 7001(e)(1)): reviewer present: ${d.hi_reviewer_present || "(not answered)"}; role: ${d.hi_reviewer_role || "(n/a)"}; stage: ${d.hi_stage || "(n/a)"}; (A) knows how to interpret output: ${d.hi_trained || "(n/a)"}; (B) reviews output + other info: ${d.hi_reviews_other_info || "(n/a)"}; (C) authority to change decision: ${d.hi_authority_override || "(n/a)"}; override rate: ${d.hi_override_rate || "(n/a)"}
TRAINS ADMT ON PI: ${intake.training_data_use}
PROFILING USE: ${intake.profiling_use}
THIRD-PARTY ADMT TOOLS IN USE: ${intake.third_party_admt || "(none disclosed)"}
VENDOR DILIGENCE: status: ${d.vendor_status || "(n/a)"}; documentation on file: ${(Array.isArray(d.vendor_docs) ? d.vendor_docs : []).join(", ") || "(none)"}; contract — audit rights: ${d.v_audit || "(n/a)"}, consumer-request assistance: ${d.v_assist || "(n/a)"}, opt-out propagation: ${d.v_optout || "(n/a)"}, appeal support: ${d.v_appeal || "(n/a)"}, incident notification: ${d.v_incident || "(n/a)"}; vendor makes ADMT available to other businesses: ${d.vendor_makes_available || "(n/a)"}; vendor training / model-improvement rights: ${d.vendor_training_rights || "(n/a)"}
NUMBER OF DISTINCT ADMT SYSTEMS THIS BUSINESS OPERATES: ${intake.admt_system_count || "(not specified — assume single system)"}
AFFECTED POPULATION BAND (California consumers subject to this ADMT): ${intake.affected_population_band || "(not provided)"}
INTERNAL ROLE ROSTER (roles with defined responsibilities for this ADMT): ${(Array.isArray(intake.role_roster) ? intake.role_roster : []).join(", ") || "(none named)"}





PRE-USE NOTICE:
- Delivery method(s): ${(Array.isArray(intake.notice_delivery) ? intake.notice_delivery : []).join("; ")}
- Has specific purpose statement: ${intake.notice_has_specific_purpose}
- Purpose text (verbatim from notice): ${intake.notice_purpose_text || "(not provided)"}
- Describes opt-out right: ${intake.notice_has_opt_out_desc}
- Describes access right: ${intake.notice_has_access_desc}
- Includes anti-retaliation statement: ${intake.notice_has_anti_retaliation}
- Explains how ADMT works: ${intake.notice_has_how_it_works}
- Describes alternative process for opt-out consumers: ${intake.notice_has_alternative_process}

OPT-OUT:
- Approach / exception claimed: ${intake.opt_out_exception}${d.opt_out_exception_other ? ` — business's own description (assess whether a § 7221(b) exception is established): ${d.opt_out_exception_other}` : ""}
- Opt-out methods provided: ${(Array.isArray(intake.opt_out_methods) ? intake.opt_out_methods : []).join("; ")}
- Opt-out link title: ${intake.opt_out_link_title || "(not provided)"}
- Not relying on cookie banner only: ${intake.opt_out_no_cookie_banner}
- No account creation required to opt out: ${intake.opt_out_no_account_required}
- Confirmation mechanism: ${intake.opt_out_confirmation_mechanism}
- Appeal process: ${intake.opt_out_appeal_process || "(not applicable)"}
- Fairness documentation: ${intake.opt_out_fairness_doc || "(not applicable)"}
- Validity & non-discrimination detail: protected characteristics tested: ${(Array.isArray(d.bias_protected_chars) ? d.bias_protected_chars : []).join(", ") || "(n/a)"}; proxy variables / mitigation: ${d.bias_proxy_vars || "(n/a)"}; testing cadence: ${d.bias_testing_cadence || "(n/a)"}; last test: ${d.bias_last_test || "(n/a)"}; next test: ${d.bias_next_test || "(n/a)"}; adverse-impact analysis: ${d.bias_adverse_impact || "(n/a)"}; outcome / FPR / FNR by group: ${d.bias_outcome_summary || "(n/a)"}
- Appeal mechanics: reviewer role: ${d.appeal_reviewer_role || "(n/a)"}; trained: ${d.appeal_trained || "(n/a)"}; authority to overturn: ${d.appeal_authority_overturn || "(n/a)"}; consumer may submit: ${(Array.isArray(d.appeal_consumer_submit) ? d.appeal_consumer_submit : []).join(", ") || "(n/a)"}; timeline: ${d.appeal_timeline || "(n/a)"}; outcomes: ${(Array.isArray(d.appeal_outcomes) ? d.appeal_outcomes : []).join(", ") || "(n/a)"}; reversal rate: ${d.appeal_reversal_rate || "(n/a)"}
- 15-business-day opt-out process documented: ${intake.opt_out_15_day_process || "(not described — operational gap)"}

ACCESS RIGHT:
- Submission methods: ${intake.access_submission_methods}
- Identity verification process: ${intake.access_verification_process}
- Logic disclosure: ${intake.access_logic_disclosure}
- Outcome disclosure: ${intake.access_outcome_disclosure}
- Response timeline: ${intake.access_response_timeline}
- Trade secret / security carve-out policy: ${intake.access_trade_secret_policy || "(not documented)"}
- Secure transmission method: ${d.access_secure_transmission || "(not specified)"}
- Partial / complete denial basis: ${d.access_denial_basis || "(not specified)"}

(Regulation authorities and compliance deadlines are provided in the system context.)

W9-ADMT-TURN2 PROMPT RULES (A-A, A-B, A-C):

A-A. EDPB LOGIC-DISCLOSURE ADEQUACY. Any conclusion that the access-logic disclosure satisfies § 7222(b)(3) MUST rest on three named elements: (1) the input categories the ADMT processes, (2) the output the ADMT produces, and (3) how the output is used in the decision. A disclosure that omits any one of the three is inadequate; write "insufficient basis" rather than pronouncing adequacy from generic prose.

A-B. ARTICLE 22(3) HUMAN-INTERVENTION QUALIFICATION (three-element test). Any conclusion that a human reviewer satisfies § 7001(e)(1) MUST separately name whether the reviewer (A) knows how to interpret the output, (B) reviews the output alongside other information beyond the output, and (C) has authority to override the output and change the decision. If any element is unresolved, human-review qualification is "insufficient basis" — never asserted from silence and never inferred from the presence of a reviewer alone.

A-C. APPLICABILITY VERDICT FIRST + REGISTRY-SOURCED DEADLINE TABLE. Before any duty analysis (notice_gaps, opt_out_gaps, access_gaps), the report MUST state an applicability verdict grounded in § 7001(e) (ADMT), § 7001(ddd) (significant decision), and § 7200(a) (Article 11 scope). The verdict is one of {in_scope, out_of_scope, conservative_assumption, insufficient_basis} and drives every downstream duty. A deterministic post-generation reprojection stamps the applicability_verdict + deadline_table + adequacy_finding slots from the VERIFIED-AUTHORITY REGISTRY; do not author §-tokens in these three slots yourself and do not invent deadlines.

Return this JSON structure exactly. Do not add fields not listed here. Do not omit required fields.

SCHEMA CONTRACT (POST-C1-FIX-1C): every scope/trigger boolean listed below MUST live INSIDE "scope_analysis". Do NOT emit any of {is_admt, triggers_significant_decision, human_review_qualifies, triggers_risk_assessment, triggers_profiling, exception_qualifies} at the top level of the report. A post-generation normalizer will migrate strays back into scope_analysis and log drift, but emitting them at the top level is a schema violation.


{
  "system_name": "${intake.system_name}",
  "compliance_deadline": "January 1, 2027",
  "overall_status": "compliant" | "gaps_identified" | "significant_gaps",

  // A-C — APPLICABILITY VERDICT SLOT (top-of-report). Post-generation reprojection
  // deterministically writes this from scope_analysis + intake using the VERIFIED-AUTHORITY
  // REGISTRY. Emit as JSON null if unsure; the reprojector fills the final value.
  "applicability_verdict": null,

  // A-C — REGISTRY-SOURCED DEADLINE TABLE SLOT. Post-generation reprojection stamps
  // this from ADMT_VERIFIED_AUTHORITIES; do not author rows yourself. Emit as JSON null.
  "deadline_table": null,

  // A-A + A-B — ADEQUACY FINDING SLOT (EDPB logic-disclosure + Art 22(3) three-element
  // human-intervention qualification). Post-generation reprojection deterministically
  // writes this from intake + scope_analysis. Emit as JSON null.
  "adequacy_finding": null,

  "scope_analysis": {
    "is_admt": true | false,
    "is_admt_reasoning": "Cite the specific element(s) of the system description that do or do not satisfy 11 CCR § 7001(e). Quote relevant facts.",
    "is_admt_proposition_key": "admt_def | human_involvement | (empty string if unresolved)",

    "triggers_significant_decision": true | false,
    "determination_basis": "established" | "conservative_assumption",   // REQUIRED (QB-P25 A3). "established" = intake affirmatively identifies an enumerated § 7001(ddd) category; "conservative_assumption" = intake does not resolve the category and the tool is defaulting to in-scope pending business confirmation. Governs whether gap entries are FULL or COMPACT.
    "significant_decision_reasoning": "Cite which § 7001(ddd) subcategory applies (or does not) and why, based on the system description.",
    "human_review_qualifies": true | false,
    "human_review_reasoning": "Analyze whether the described human review satisfies all three elements of § 7001(e)(1)(A)-(C). State clearly whether it does or does not constitute 'human involvement' as defined.",
    "triggers_risk_assessment": true | false,
    "risk_assessment_reasoning": "State which regulatory trigger(s) apply based on the system description. Only reference triggers supported by the REGULATION AUTHORITIES provided.",
    "triggers_profiling": true | false,
    "exception_claimed": "name of exception claimed, or 'none' if opt-out is provided",
    "exception_qualifies": true | false | "cannot_determine",
    "exception_reasoning": "If an exception was claimed, analyze whether the specific facts described satisfy the statutory requirements. Be direct: state whether the exception is or is not established based on the facts provided. If the business did not claim an exception, state 'No exception claimed — opt-out right required.'",
    "third_party_responsibility_note": "If third-party ADMT tools were listed, note here that the business remains the CCPA-responsible party. Otherwise leave as empty string.",
    "summary": "3-4 sentence plain-language scope conclusion that incorporates the reasoning above. When determination_basis is 'conservative_assumption', state the conditional-pending-confirmation clause here ONCE per THE CONDITION IS STATED ONCE, UP FRONT."
  },

  "consolidated_notice_analysis": {
    "applicable": true | false,
    "basis": "State which of the four § 7220(e) consolidation scenarios applies, if any: (1) one ADMT for multiple purposes; (2) multiple ADMTs for one purpose; (3) multiple ADMTs for multiple purposes; (4) systematic use of a single ADMT. Only mark applicable:true if the intake describes multiple ADMT systems OR multiple uses of a single ADMT that could be consolidated. If the business operates a single ADMT for a single purpose, mark applicable:false and explain why consolidation is irrelevant here.",
    "conditions_to_consolidate": "If applicable:true, list the mandatory conditions the consolidated notice must satisfy: it must include ALL required § 7220(c) elements for EACH ADMT system or use covered. Generic or combined descriptions that obscure individual system requirements do not satisfy this.",
    "consolidation_benefit": "If applicable:true, briefly describe the operational benefit (e.g., 'A single notice can cover both the credit scoring model and the fraud detection system, reducing notice delivery touchpoints from two to one').",
    "consolidation_risk": "If applicable:true, describe the compliance trap: a consolidated notice that omits required elements for any one system is non-compliant for that system. The business cannot use consolidation to simplify away disclosure obligations.",
    "recommendation": "One plain-language sentence: either 'Consolidation not applicable — single ADMT/single purpose detected' or 'Consolidation eligible — confirm the § 7220(e) conditions (same operating context, same category of consumers, same significant-decision purpose) are satisfied on the record before consolidating; further clarification is advisable.'"
  },

  "enforcement_context": {
    "penalty_per_violation_unintentional": 2663,
    "penalty_per_violation_intentional": 7988,
    "penalty_statutory_basis": "Cal. Civ. Code § 1798.155(a) (2025-2026 CPI-adjusted figures)",
    "ca_consumer_count_provided": "${intake.ca_consumer_count || 'not provided'}",
    "aggregate_exposure_note": "Based on the gaps identified and the consumer volume provided (or noted as not provided), briefly describe the scale of potential exposure. Note that the CPPA may count each affected consumer as a separate violation. Do not cite specific enforcement actions or settlements unless they appear in the REGULATION AUTHORITIES block provided — if none do, omit that reference. Do NOT characterise historical settlement levels or enforcement outcomes (e.g. that matters 'typically settle below the statutory maximum') — that is uncited memory; state only the statutory per-violation exposure and that actual outcomes depend on the facts."
  },

  // ── QB-P25 A3: two possible shapes per entry ─────────────────────────────
  //   * When scope_analysis.determination_basis === "established" → FULL:
  //       { element_id, element, status, finding, citation:"", remediation, enforcement_exposure }
  //     where enforcement_exposure ∈ { "per_violation", "per_consumer_scalable", "na" }.
  //   * When scope_analysis.determination_basis === "conservative_assumption" → COMPACT:
  //       { element_id, element, duty_if_in_scope, citation:"" }
  //     — no status, no finding, no remediation, no enforcement_exposure.
  "notice_gaps": [
    {
      "element_id": "notice_purpose | notice_optout | notice_access | notice_antiretaliation | notice_howworks | notice_alternative_process | notice_trade_secret",
      "element": "Plain-English name of the element (no section number)",
      "status": "compliant | gap | missing   // FULL mode only",
      "finding": "Specific finding in plain language. FULL mode only. Do NOT include any '§' or section number — refer to it as 'the cited provision'.",
      "citation": "",
      "remediation": "Specific action the business must take. FULL mode only. No section numbers.",
      "enforcement_exposure": "per_violation | per_consumer_scalable | na   // ENUM; FULL mode only. NEVER dollar figures or narrative.",
      "duty_if_in_scope": "COMPACT mode only. Single plain-language sentence stating what the business would owe under this element IF the scope determination is confirmed."
    }
  ],

  "opt_out_gaps": [
    {
      "element_id": "optout_offer | optout_designated_methods | optout_account_barrier | optout_confirmation | optout_processing",
      "element": "Plain-English name of the element (no section number)",
      "status": "compliant | gap | missing   // FULL mode only",
      "finding": "Specific finding. FULL mode only. For the 15-business-day operational process: if intake.opt_out_15_day_process was blank or '(not described)', flag this under optout_processing. No section numbers.",
      "citation": "",
      "remediation": "Specific action required. FULL mode only. No section numbers.",
      "enforcement_exposure": "per_violation | per_consumer_scalable | na   // ENUM; FULL mode only.",
      "duty_if_in_scope": "COMPACT mode only. Single plain-language sentence."
    }
  ],

  "access_gaps": [
    {
      "element_id": "access_specific_purpose | access_logic | access_outcome_sole_factor | access_antiretaliation | access_trade_secret | access_timeline | access_secure_transmission | access_denial_basis | access_aggregate_log | access_verification",
      "element": "Plain-English name of the element (no section number)",
      "status": "compliant | gap | missing   // FULL mode only",
      "finding": "Specific finding. FULL mode only. No section numbers.",
      "citation": "",
      "remediation": "Specific action required. FULL mode only. No section numbers.",
      "enforcement_exposure": "per_violation | per_consumer_scalable | na   // ENUM; FULL mode only.",
      "duty_if_in_scope": "COMPACT mode only. Single plain-language sentence."
    }
  ],

  "risk_assessment_obligation": {
    "required": true | false,
    "triggers_identified": ["Plain-English names of triggers that apply (e.g., 'ADMT used to make a significant decision', 'training ADMT on personal information'). NO section numbers."],
    "compliance_deadline_existing_activities": "December 31, 2027 (for processing activities initiated before January 1, 2026)",
    "compliance_deadline_new_activities": "Before initiating new or materially changed processing activities",
    "submission_requirement": "Plain-English description. No section numbers.",
    "summary": "2-3 sentence plain-language description. No section numbers."
  },

  "documentation_to_maintain": [
    {
      "element_id": "sp_contract_terms | ra_program | human_involvement | qualifies_admt | significant_decision | compliance_deadline | admt_use_frequency_log",
      "document": "Name of document or record",
      "purpose": "What it demonstrates to the CPPA",
      "citation": ""
    }
  ],


  "aggregate_access_response": {
    "applicable": "true | false | 'cannot_determine'",
    "threshold": "Business used the ADMT with respect to the consumer more than four times within a 12-month period (§ 7222(j))",
    "explanation": "If the business has used the ADMT with respect to the consumer more than four times in a 12-month period, it may respond with aggregate-level logic and output summaries instead of individualized responses. The threshold measures ADMT decisions/uses with respect to the consumer — NOT the count of inbound access requests. If the intake does not track this, recommend the business begin logging per-consumer ADMT use frequency.",
    "what_aggregate_response_may_include": "If applicable, note that the aggregate response may include aggregate-level summaries of the ADMT's logic and outputs, but must still include the specific purpose (§ 7222(b)(1)), and the business must still respond to the other required elements of § 7222. The aggregate option is specifically for the logic and output disclosures under § 7222(b)(2)-(3), not a complete exemption from responding.",
    "operational_note": "If applicable, recommend the business document which consumers have crossed the four-use threshold and maintain a per-consumer ADMT-use log to support the aggregate-response decision. If you list this log as a documentation_to_maintain item, set its element_id to \"admt_use_frequency_log\" (NOT \"qualifies_admt\") so it resolves to the aggregate-response provision."
  },

  "priority_actions": [
    "Numbered action item with specific deadline where known. Based only on gaps identified above."
  ],

  "top_3_actions": [
    // W9-ADMT-WIRE S5 HARD SLOT — typed exec-summary schema. EXACTLY 3 entries, in
    // descending priority. Each entry is one object with the fields below; no free
    // text, no additional keys. If fewer than 3 substantive actions exist, pad
    // with an entry whose "action" is "insufficient basis to state a top action"
    // and whose "citation"/"deadline" are the empty string — never fabricate a
    // deadline or a §-token. Every non-empty "citation" MUST be a full verified
    // pinpoint per POST-C1-FIX-3 (never the neutral fallback phrase, never a
    // hybrid), or the empty string. This block is IN ADDITION to priority_actions;
    // priority_actions is the full narrative list, top_3_actions is the fixed-shape
    // executive summary slot the customer UI renders at the top of the report.
    { "rank": 1,
      "action": "One-sentence directive (imperative, ≤ 220 chars).",
      "citation": "§ 7220(c)(2)(A) | § 7221(a) | ... (verified pinpoint OR empty string)",
      "deadline": "YYYY-MM-DD anchored to § 7200(b) compliance date (2027-01-01) OR the empty string when not applicable",
      "proposition_key": "<optional proposition_key from the VERIFIED-AUTHORITY REGISTRY; when present the resolver stamps citation deterministically>"
    }
  ],



  "compliant_elements": ["List of elements assessed as compliant, with brief explanation."],

  "information_needed": [
    // REQUIRED whenever any finding in this report is insufficient-basis / Insufficient information; otherwise an empty array. One entry per gap.
    { "field": "<intake field key that exists in the intake>",
      "dimensions": "<what specifically to add — dimensions, never suggested values>",
      "provision": "<already-cited provision making these dimensions relevant>",
      "enables": "<which section/determination completes with it>" }
  ]
}

Every insufficient-basis or Insufficient-information finding elsewhere in this output MUST have a corresponding information_needed entry.

ADDITIONAL DISCIPLINES:
- 2.8b DISTINCT-SCOPE PHRASING FOR § 7220(c)(5): Where notice_howworks and notice_alternative_process both cite § 7220(c)(5), each entry states its distinct scope in one sentence — how-the-ADMT-works explanation vs. the alternative-process disclosure — so the user does not remediate the same gap twice.
- 2.8c SIGNIFICANT-DECISION PHRASING: When explaining that a subscription product does not itself trigger the significant-decision test, use: "…or another subscription product that does not involve financial services, lending, housing, education, employment, or healthcare, the trigger is NOT satisfied."
- 2.8d INTAKE-GAP PHRASING: When flagging missing appeal-mechanics data, use: "the appeal-mechanics fields are not populated or are marked not applicable in the available intake data" (replaces "all marked not applicable").`;

    let rawText: string;
    {
      const _suppWs6 = renderSupplementalBlock({ responses: (intake as any)?.supplemental_responses, context: (intake as any)?.supplemental_context });
      const _userPromptWithSupp = userPrompt + _suppWs6;
      const first = await callAnthropic(system, _userPromptWithSupp, PRODUCT_MAX_OUTPUT_TOKENS, "gap-analysis");
      if (first.stopReason === "max_tokens") {
        console.warn(`[run-admt-checker] gap-analysis truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} — single retry`);
        const retry = await callAnthropic(system, _userPromptWithSupp, PRODUCT_MAX_OUTPUT_TOKENS, "gap-analysis-retry");
        rawText = retry.text;
      } else {
        rawText = first.text;
      }
    }
    let report = tryParseJson(rawText);

    // If parsing failed, retry once with a strict JSON-only directive.
    if (!report) {
      console.warn(
        `[run-admt-checker] parse_failed on first pass — chars=${rawText.length} head=${JSON.stringify(rawText.slice(0, 200))} tail=${JSON.stringify(rawText.slice(-300))}`
      );
      const strictRetry = await callAnthropic(
        system,
        userPrompt +
          renderSupplementalBlock({ responses: (intake as any)?.supplemental_responses, context: (intake as any)?.supplemental_context }) +
          "\n\nCRITICAL OUTPUT REQUIREMENT: Respond with a single valid JSON object only. No markdown fences, no commentary before or after. The first character MUST be '{' and the last character MUST be '}'. Escape all internal quotes and newlines per JSON spec.",
        PRODUCT_MAX_OUTPUT_TOKENS,
        "gap-analysis-json-retry"
      );
      report = tryParseJson(strictRetry.text);
      if (report) {
        rawText = strictRetry.text;
      } else {
        console.error(
          `[run-admt-checker] parse_failed after retry — tail=${JSON.stringify(strictRetry.text.slice(-500))}`
        );
        const admtTruncated =
          first.stopReason === "max_tokens" || strictRetry.stopReason === "max_tokens";
        const admtErrorCode = admtTruncated ? "generation_truncated" : "parse_failed";
        await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, {
          status: "error",
          report_data: {
            error: admtErrorCode,
            stop_reason_first: first.stopReason,
            stop_reason_retry: strictRetry.stopReason,
            raw_head: rawText.slice(0, 400),
            raw_tail: rawText.slice(-400),
            retry_tail: strictRetry.text.slice(-400),
          },
        }, { fn: "run-admt-checker", phase: "terminal_error_parse" });
        await failFunctionRun(supabase, fnRun, admtErrorCode, {
          metadata: {
            assessment_id,
            stop_reason_first: first.stopReason,
            stop_reason_retry: strictRetry.stopReason,
          },
        });
        return;
      }
    }

    // ── Layer 3 + Layer 4 — Resolver injection & validator ──────────────────
    // The model writes prose only. Here we (a) overwrite `citation` on every
    // finding with the registry-resolved canonical string(s) keyed by
    // `element_id` + normalized intake, (b) strip any §/7xxx tokens the model
    // may have authored in prose fields, and (c) run the validator.
    try {
      const normalized = normalizeIntake(intake);
      const proseFields = ["finding", "remediation", "enforcement_exposure", "element"] as const;

      // CPPA-HF6 — PRE-INJECTION artifact-phrase normalizer. The model
      // sometimes emits mechanical-substitution artifacts such as "the
      // applicable definitional provision" / "the applicable regulation
      // section" that HF4/HF5 originally normalized post-generation
      // AFTER resolveInto had already run — meaning the rewritten
      // "the cited provision" token was never consumed by registry
      // injection and rendered verbatim. Run this rewrite BEFORE
      // resolveInto so the injection pass consumes the token. Also
      // collapse the "the <quantifier> the cited provision" doubled-
      // article class ("the full the", "the four the", "all the the")
      // so injection produces readable prose.
      const PRE_INJECT_PHRASE_RULES: Array<[RegExp, string]> = [
        [/\bthe\s+applicable\s+definitional\s+provision\b/gi, "the cited provision"],
        [/\bthe\s+applicable\s+regulation\s+section\b/gi, "the cited provision"],
        [/\bthe\s+the\s+cited\s+provision\b/gi, "the cited provision"],
        // "the full the cited provision" → "full the cited provision"
        // so the trailing "the cited provision" remains available for
        // TOKEN_RE consumption while dropping the redundant leading article.
        [/\bthe\s+((?:full|four|three|two|entire|all|many|few|several)\s+)the\s+cited\s+provision\b/gi, "$1the cited provision"],
      ];
      const walkPreInject = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) { for (const v of node) walkPreInject(v); return; }
        if (typeof node !== "object") return;
        for (const k of Object.keys(node)) {
          const v = (node as any)[k];
          if (typeof v === "string") {
            let next = v;
            for (const [re, sub] of PRE_INJECT_PHRASE_RULES) next = next.replace(re, sub);
            if (next !== v) (node as any)[k] = next;
          } else if (v && typeof v === "object") {
            walkPreInject(v);
          }
        }
      };
      walkPreInject(report);

      const resolveInto = (arr: any[] | undefined) => {
        if (!Array.isArray(arr)) return;
        for (const item of arr) {
          for (const f of proseFields) {
            if (item && typeof item[f] === "string") item[f] = stripModelCitations(item[f]);
          }
          const eid = (item?.element_id ?? "") as ElementId | "";
          if (eid) {
            const r = resolveCitations(eid as ElementId, intake);
            item.citation = r.sections.join(" + ");
            item.citation_ids = r.citationIds;
          } else {
            item.citation = "";
          }
          // CPPA-HF5 Task B — registry-injection consumption of the
          // "the cited provision" narrative token. The model is
          // instructed to write "the cited provision" as a placeholder
          // for the resolved § citation; here we inject the concrete
          // registry-resolved section into prose so the rendered PDF
          // never carries the raw placeholder.
          if (item && typeof item.citation === "string" && item.citation.trim()) {
            const concrete = item.citation.trim();
            const TOKEN_RE = /\bthe\s+cited\s+provision(?:\s+(?:governing|above|below|referenced))?\b/gi;
            const UNDER_RE = /\bunder\s+the\s+cited\s+provision\b/gi;
            const PURSUANT_RE = /\bpursuant\s+to\s+the\s+cited\s+provision\b/gi;
            for (const f of proseFields) {
              if (typeof item[f] !== "string") continue;
              let next = item[f] as string;
              next = next.replace(UNDER_RE, `under ${concrete}`);
              next = next.replace(PURSUANT_RE, `pursuant to ${concrete}`);
              next = next.replace(TOKEN_RE, concrete);
              item[f] = next;
            }
          }
        }
      };
      resolveInto(report.notice_gaps);
      resolveInto(report.opt_out_gaps);
      resolveInto(report.access_gaps);
      resolveInto(report.documentation_to_maintain);
      // Surface an assumption flag if the RA program resolver flagged one.
      const raResolved = resolveCitations("ra_program", intake);
      if (raResolved.assumptionFlag && report.risk_assessment_obligation) {
        report.risk_assessment_obligation.assumption_note = raResolved.assumptionFlag;
      }
      if (report.risk_assessment_obligation) {
        report.risk_assessment_obligation.resolved_citations = raResolved.sections;
      }

      // HF6C — Scope-narrative scrub. Runs BEFORE walkFallbackConsume so
      // any "the cited provision" token stripModelCitations synthesises
      // from the model's raw § numbers is consumed by the subchapter
      // fallback below, not left literal in the saved report.
      for (const k of ["scope_analysis", "consolidated_notice_analysis", "aggregate_access_response", "enforcement_context"]) {
        const obj = report[k];
        if (obj && typeof obj === "object") {
          for (const subKey of Object.keys(obj)) {
            if (typeof obj[subKey] === "string") obj[subKey] = stripModelCitations(obj[subKey]);
          }
        }
      }
      if (Array.isArray(report.priority_actions)) {
        report.priority_actions = report.priority_actions.map((s: any) => typeof s === "string" ? stripModelCitations(s) : s);
      }
      if (Array.isArray(report.compliant_elements)) {
        report.compliant_elements = report.compliant_elements.map((s: any) => typeof s === "string" ? stripModelCitations(s) : s);
      }

      // CPPA-HF6R B-EXT — SUBCHAPTER-ANCHOR FALLBACK CONSUMPTION.
      // See original comment. Placement AFTER scope-scrub is intentional
      // (HF6C): stripModelCitations above may re-tokenise §-fragments to
      // "the cited provision"; those tokens must be consumed here.
      const SUBCH_TOKEN_RE = /\bthe\s+cited\s+(?:provision|definition)(?:\s+(?:governing|above|below|referenced))?\b/gi;
      const SUBCH_UNDER_RE = /\bunder\s+the\s+cited\s+(?:provision|definition)\b/gi;
      const SUBCH_PURSUANT_RE = /\bpursuant\s+to\s+the\s+cited\s+(?:provision|definition)\b/gi;
      // POST-C1-FIX-2A: unresolved-variable fallback becomes NEUTRAL (no citation).
      // Emitting the "§§ 7220–7222" range as a substitute for unresolved pinpoints
      // caused the residual ADMT collapse in batch 5aee4b99. Range appears at most
      // ONCE per document, enforced by post-walker cap below.
      const SUBCH_FALLBACK = "the applicable ADMT-subchapter provision";
      const SUBCH_SYNONYM_RES: Array<[RegExp, string]> = [
        [/\bthe\s+applicable\s+definitional\s+provision\b/gi, SUBCH_FALLBACK],
        [/\bthe\s+applicable\s+regulation\s+section\b/gi, SUBCH_FALLBACK],
      ];
      const consumeStr = (v: string): string => {
        let next = v;
        for (const [re, sub] of SUBCH_SYNONYM_RES) next = next.replace(re, sub);
        next = next.replace(/\bthe\s+the\s+cited\s+(?:provision|definition)\b/gi, "the cited provision");
        next = next.replace(/\bthe\s+((?:full|four|three|two|entire|all|many|few|several)\s+)the\s+cited\s+(?:provision|definition)\b/gi, "$1the cited provision");
        next = next.replace(SUBCH_UNDER_RE, `under ${SUBCH_FALLBACK}`);
        next = next.replace(SUBCH_PURSUANT_RE, `pursuant to ${SUBCH_FALLBACK}`);
        next = next.replace(SUBCH_TOKEN_RE, SUBCH_FALLBACK);
        return next;
      };
      const walkFallbackConsume = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i++) {
            const v = node[i];
            if (typeof v === "string") node[i] = consumeStr(v);
            else if (v && typeof v === "object") walkFallbackConsume(v);
          }
          return;
        }
        if (typeof node !== "object") return;
        for (const k of Object.keys(node)) {
          const v = (node as any)[k];
          if (typeof v === "string") (node as any)[k] = consumeStr(v);
          else if (v && typeof v === "object") walkFallbackConsume(v);
        }
      };
      walkFallbackConsume(report);

      // CPPA-HF6 — POST-INJECTION doubled-article collapse.
      const walkPostInject = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) { for (const v of node) walkPostInject(v); return; }
        if (typeof node !== "object") return;
        for (const k of Object.keys(node)) {
          const v = (node as any)[k];
          if (typeof v === "string") {
            let next = v.replace(/\bthe\s+the\b/gi, "the");
            next = next.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1");
            if (next !== v) (node as any)[k] = next;
          } else if (v && typeof v === "object") {
            walkPostInject(v);
          }
        }
      };
      walkPostInject(report);

      // Validate.
      const issues = validateReport(report, intake);
      if (issues.length) {
        console.warn(`[run-admt-checker] validator issues: ${JSON.stringify(issues)}`);
        report._validator_issues = issues;
      }
      // Echo normalized intake summary into the report for traceability.
      report._normalized_intake = normalized;
    } catch (resolveErr) {
      console.warn("[run-admt-checker] citation resolver failed (non-fatal):", resolveErr);
    }

    // ── HF6C Task A — DEFENSE-IN-DEPTH POST-RESOLVER FALLBACK CONSUME ─────
    // If the main try-block above threw early (e.g. normalizeIntake on an
    // unusual intake shape), NONE of the walkers ran and "the cited
    // provision" / "the cited definition" tokens the model wrote leak
    // literally into the saved report. This independent block re-runs the
    // subchapter-fallback consumer and the doubled-article collapse over
    // the WHOLE report so token consumption cannot be skipped by an
    // upstream exception. Idempotent: if the main block already ran, all
    // patterns are already consumed and this is a no-op.
    try {
      const HF6C_SUBCH_FALLBACK = "the applicable ADMT-subchapter provision";
      const HF6C_SUBCH_TOKEN_RE = /\bthe\s+cited\s+(?:provision|definition)(?:\s+(?:governing|above|below|referenced))?\b/gi;
      const HF6C_SUBCH_UNDER_RE = /\bunder\s+the\s+cited\s+(?:provision|definition)\b/gi;
      const HF6C_SUBCH_PURSUANT_RE = /\bpursuant\s+to\s+the\s+cited\s+(?:provision|definition)\b/gi;
      const HF6C_SYN_RES: Array<[RegExp, string]> = [
        [/\bthe\s+applicable\s+definitional\s+provision\b/gi, HF6C_SUBCH_FALLBACK],
        [/\bthe\s+applicable\s+regulation\s+section\b/gi, HF6C_SUBCH_FALLBACK],
      ];
      const hf6cConsume = (v: string): string => {
        let next = v;
        for (const [re, sub] of HF6C_SYN_RES) next = next.replace(re, sub);
        next = next.replace(/\bthe\s+the\s+cited\s+(?:provision|definition)\b/gi, "the cited provision");
        next = next.replace(/\bthe\s+((?:full|four|three|two|entire|all|many|few|several)\s+)the\s+cited\s+(?:provision|definition)\b/gi, "$1the cited provision");
        next = next.replace(HF6C_SUBCH_UNDER_RE, `under ${HF6C_SUBCH_FALLBACK}`);
        next = next.replace(HF6C_SUBCH_PURSUANT_RE, `pursuant to ${HF6C_SUBCH_FALLBACK}`);
        next = next.replace(HF6C_SUBCH_TOKEN_RE, HF6C_SUBCH_FALLBACK);
        next = next.replace(/\bthe\s+the\b/gi, "the").replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1");
        return next;
      };
      const hf6cWalk = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i++) {
            const v = node[i];
            if (typeof v === "string") node[i] = hf6cConsume(v);
            else if (v && typeof v === "object") hf6cWalk(v);
          }
          return;
        }
        if (typeof node !== "object") return;
        for (const k of Object.keys(node)) {
          const v = (node as any)[k];
          if (typeof v === "string") (node as any)[k] = hf6cConsume(v);
          else if (v && typeof v === "object") hf6cWalk(v);
        }
      };
      hf6cWalk(report);
    } catch (e) {
      console.warn("[run-admt-checker] HF6C post-resolver fallback consume failed (non-fatal):", e);
    }

    // POST-C1-FIX-2A — DETERMINISTIC RANGE-CAP.
    // "11 CCR §§ 7220–7222" (with or without the "(the ADMT subchapter)" parenthetical)
    // may appear AT MOST ONCE per document — reserved for the scope_analysis.summary
    // framing sentence. Second and later occurrences are downgraded to the neutral
    // phrase, matching the model rule at line ~278. Idempotent; fail-open.
    try {
      const RANGE_RE = /11\s*CCR\s*§§\s*7220\s*[–-]\s*7222(?:\s*\(the\s+ADMT\s+subchapter\))?/gi;
      let hits = 0;
      const capStr = (v: string): string =>
        v.replace(RANGE_RE, (m) => (++hits === 1 ? m : "the applicable ADMT-subchapter provision"));
      const capWalk = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i++) {
            const v = node[i];
            if (typeof v === "string") node[i] = capStr(v);
            else if (v && typeof v === "object") capWalk(v);
          }
          return;
        }
        if (typeof node !== "object") return;
        for (const k of Object.keys(node)) {
          const v = (node as any)[k];
          if (typeof v === "string") (node as any)[k] = capStr(v);
          else if (v && typeof v === "object") capWalk(v);
        }
      };
      capWalk(report);
      console.log(JSON.stringify({
        evt: "admt_range_cap",
        fn: "run-admt-checker",
        build_stamp: BUILD_STAMP,
        range_occurrences_before_cap: hits,
      }));
    } catch (e) {
      console.warn("[run-admt-checker] range-cap failed (non-fatal):", (e as Error)?.message);
    }

    // C1-b (2026-07-23T14:20:00Z) — CITATION PAIR VERIFIER wired for ADMT.
    // Walks every string leaf, flags confusion-pair defects (13/14, 21(1)/(2),
    // 6(1)(f)/6(11), (ah)/(aj), § 7220 depth). Never silently emits — flagged
    // sentences carry inline warnings. Before/after lint events are logged
    // so catch-rate can be measured. Fail-open.
    try {
      const authorityCites: string[] = [];
      try {
        const wl = buildAdmtVerifiedWhitelist();
        for (const s of wl) authorityCites.push(String(s));
      } catch { /* fail-open */ }
      const paragraphIndex = buildParagraphIndex({ authorityCites });
      let scanned = 0;
      let flagged = 0;
      const allFindings: Array<{ pair: string; reason: string }> = [];
      const walkAndVerify = (node: any) => {
        if (node == null) return;
        if (typeof node === "string") return;
        if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i++) {
            const v = node[i];
            if (typeof v === "string") {
              scanned += 1;
              const r = verifyCitationPairs(v, { paragraphIndex, regime: "unknown" });
              if (r.findings.length > 0) {
                flagged += 1;
                for (const f of r.findings) allFindings.push({ pair: f.pair, reason: f.reason });
                node[i] = r.text;
              }
            } else if (v && typeof v === "object") walkAndVerify(v);
          }
          return;
        }
        if (typeof node !== "object") return;
        for (const k of Object.keys(node)) {
          const v = (node as any)[k];
          if (typeof v === "string") {
            scanned += 1;
            const r = verifyCitationPairs(v, { paragraphIndex, regime: "unknown" });
            if (r.findings.length > 0) {
              flagged += 1;
              for (const f of r.findings) allFindings.push({ pair: f.pair, reason: f.reason });
              (node as any)[k] = r.text;
            }
          } else if (v && typeof v === "object") walkAndVerify(v);
        }
      };
      console.log(JSON.stringify({ evt: "citation_pair_check_before", fn: "run-admt-checker", build_stamp: BUILD_STAMP }));
      walkAndVerify(report);
      console.log(JSON.stringify({
        evt: "citation_pair_check_after",
        fn: "run-admt-checker",
        build_stamp: BUILD_STAMP,
        scanned_strings: scanned,
        flagged_strings: flagged,
        findings_total: allFindings.length,
        by_pair: allFindings.reduce((acc, f) => { acc[f.pair] = (acc[f.pair] || 0) + 1; return acc; }, {} as Record<string, number>),
        sample: allFindings.slice(0, 3),
      }));
    } catch (e) {
      console.warn("[run-admt-checker] citation-pair verifier failed (non-fatal):", (e as Error)?.message);
    }



    // ── Light English backstop — lint the assembled narrative, NOT citations
    // (registry-controlled). On hard violations fire one regeneration retry
    // through the existing strict-JSON retry path.
    try {
      const narrativeFields: string[] = [];
      const push = (s: unknown) => { if (typeof s === "string" && s.trim().length) narrativeFields.push(s); };
      push(report?.scope_analysis?.summary);
      push(report?.scope_analysis?.is_admt_reasoning);
      push(report?.scope_analysis?.significant_decision_reasoning);
      push(report?.scope_analysis?.human_review_reasoning);
      push(report?.scope_analysis?.exception_reasoning);
      push(report?.scope_analysis?.risk_assessment_reasoning);
      push(report?.scope_analysis?.third_party_responsibility_note);
      push(report?.consolidated_notice_analysis?.basis);
      push(report?.consolidated_notice_analysis?.recommendation);
      push(report?.aggregate_access_response?.explanation);
      push(report?.risk_assessment_obligation?.summary);
      for (const arr of [report.notice_gaps, report.opt_out_gaps, report.access_gaps]) {
        if (Array.isArray(arr)) for (const it of arr) { push(it?.finding); push(it?.remediation); push(it?.enforcement_exposure); }
      }
      if (Array.isArray(report.priority_actions)) for (const s of report.priority_actions) push(s);
      const lint = lintReportText(narrativeFields.join("\n\n"));
      if (hasHardViolations(lint)) {
        console.warn(`[run-admt-checker] lint hard violations: ${JSON.stringify(lint.violations)}`);
        const lintRetry = await callAnthropic(
          system,
          userPrompt +
            "\n\nPREVIOUS DRAFT contained English-style violations (meta-commentary, unresolved tokens, or other non-customer-facing artifacts). Produce the JSON again, cleanly. Same JSON shape; no markdown.",
          PRODUCT_MAX_OUTPUT_TOKENS,
          "lint-retry"
        );
        const reLinted = tryParseJson(lintRetry.text);
        if (reLinted) {
          // Re-run resolver on the retry payload so citations remain registry-controlled.
          try {
            const proseFields = ["finding", "remediation", "enforcement_exposure", "element"] as const;
            // CPPA-HF6 — pre-injection phrase normalizer on lint-retry payload.
            const PRE_INJECT_PHRASE_RULES: Array<[RegExp, string]> = [
              [/\bthe\s+applicable\s+definitional\s+provision\b/gi, "the cited provision"],
              [/\bthe\s+applicable\s+regulation\s+section\b/gi, "the cited provision"],
              [/\bthe\s+the\s+cited\s+provision\b/gi, "the cited provision"],
              [/\bthe\s+((?:full|four|three|two|entire|all|many|few|several)\s+)the\s+cited\s+provision\b/gi, "$1the cited provision"],
            ];
            const walkPreInject = (node: any) => {
              if (!node) return;
              if (Array.isArray(node)) { for (const v of node) walkPreInject(v); return; }
              if (typeof node !== "object") return;
              for (const k of Object.keys(node)) {
                const v = (node as any)[k];
                if (typeof v === "string") {
                  let next = v;
                  for (const [re, sub] of PRE_INJECT_PHRASE_RULES) next = next.replace(re, sub);
                  if (next !== v) (node as any)[k] = next;
                } else if (v && typeof v === "object") walkPreInject(v);
              }
            };
            walkPreInject(reLinted);

            const resolveInto2 = (arr: any[] | undefined) => {
              if (!Array.isArray(arr)) return;
              for (const item of arr) {
                for (const f of proseFields) {
                  if (item && typeof item[f] === "string") item[f] = stripModelCitations(item[f]);
                }
                const eid = (item?.element_id ?? "") as ElementId | "";
                if (eid) {
                  const r = resolveCitations(eid as ElementId, intake);
                  item.citation = r.sections.join(" + ");
                  item.citation_ids = r.citationIds;
                } else {
                  item.citation = "";
                }
                // CPPA-HF6 — TOKEN consumption on lint-retry (parity with resolveInto).
                if (item && typeof item.citation === "string" && item.citation.trim()) {
                  const concrete = item.citation.trim();
                  const TOKEN_RE = /\bthe\s+cited\s+provision(?:\s+(?:governing|above|below|referenced))?\b/gi;
                  const UNDER_RE = /\bunder\s+the\s+cited\s+provision\b/gi;
                  const PURSUANT_RE = /\bpursuant\s+to\s+the\s+cited\s+provision\b/gi;
                  for (const f of proseFields) {
                    if (typeof item[f] !== "string") continue;
                    let next = item[f] as string;
                    next = next.replace(UNDER_RE, `under ${concrete}`);
                    next = next.replace(PURSUANT_RE, `pursuant to ${concrete}`);
                    next = next.replace(TOKEN_RE, concrete);
                    item[f] = next;
                  }
                }
              }
            };
            resolveInto2(reLinted.notice_gaps);
            resolveInto2(reLinted.opt_out_gaps);
            resolveInto2(reLinted.access_gaps);
            resolveInto2(reLinted.documentation_to_maintain);

            // CPPA-HF6R B-EXT — subchapter-anchor fallback consumption on
            // lint-retry payload (parity with main path).
            const SUBCH_TOKEN_RE_L = /\bthe\s+cited\s+provision(?:\s+(?:governing|above|below|referenced))?\b/gi;
            const SUBCH_UNDER_RE_L = /\bunder\s+the\s+cited\s+provision\b/gi;
            const SUBCH_PURSUANT_RE_L = /\bpursuant\s+to\s+the\s+cited\s+provision\b/gi;
            const SUBCH_FALLBACK_L = "the applicable ADMT-subchapter provision";
            const consumeStrL = (v: string): string => {
              let next = v;
              next = next.replace(/\bthe\s+applicable\s+definitional\s+provision\b/gi, SUBCH_FALLBACK_L);
              next = next.replace(/\bthe\s+applicable\s+regulation\s+section\b/gi, SUBCH_FALLBACK_L);
              next = next.replace(/\bthe\s+the\s+cited\s+provision\b/gi, "the cited provision");
              next = next.replace(/\bthe\s+((?:full|four|three|two|entire|all|many|few|several)\s+)the\s+cited\s+provision\b/gi, "$1the cited provision");
              next = next.replace(SUBCH_UNDER_RE_L, `under ${SUBCH_FALLBACK_L}`);
              next = next.replace(SUBCH_PURSUANT_RE_L, `pursuant to ${SUBCH_FALLBACK_L}`);
              next = next.replace(SUBCH_TOKEN_RE_L, SUBCH_FALLBACK_L);
              return next;
            };
            const walkFallbackConsumeL = (node: any) => {
              if (!node) return;
              if (Array.isArray(node)) {
                for (let i = 0; i < node.length; i++) {
                  const v = node[i];
                  if (typeof v === "string") node[i] = consumeStrL(v);
                  else if (v && typeof v === "object") walkFallbackConsumeL(v);
                }
                return;
              }
              if (typeof node !== "object") return;
              for (const k of Object.keys(node)) {
                const v = (node as any)[k];
                if (typeof v === "string") (node as any)[k] = consumeStrL(v);
                else if (v && typeof v === "object") walkFallbackConsumeL(v);
              }
            };
            walkFallbackConsumeL(reLinted);

            // CPPA-HF6 — post-injection doubled-article collapse.
            const walkPostInject = (node: any) => {
              if (!node) return;
              if (Array.isArray(node)) { for (const v of node) walkPostInject(v); return; }
              if (typeof node !== "object") return;
              for (const k of Object.keys(node)) {
                const v = (node as any)[k];
                if (typeof v === "string") {
                  let next = v.replace(/\bthe\s+the\b/gi, "the");
                  next = next.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1");
                  if (next !== v) (node as any)[k] = next;
                } else if (v && typeof v === "object") walkPostInject(v);
              }
            };
            walkPostInject(reLinted);
          } catch (e) {
            console.warn("[run-admt-checker] resolver on lint-retry failed (non-fatal):", e);
          }
          report = reLinted;
          report._lint_retry = { violations: lint.violations };
        } else {
          report._lint_unrecovered = { violations: lint.violations };
        }
      }
    } catch (lintErr) {
      console.warn("[run-admt-checker] lint backstop failed (non-fatal):", lintErr);
    }




    // ── PASS 2: Sample Language Drafting ─────────────────────────────────────
    // For every gap/missing item, generate ready-to-use draft language the user
    // can paste directly into their notice, opt-out mechanism, or access
    // right response. Uses the user's actual intake values so output is
    // specific — never generic. [BRACKETED PLACEHOLDERS] only for info the
    // business must supply themselves (URLs, contact emails, specific dates).
    // Non-fatal: if this call fails, the gap analysis result is still saved.

    // QB-P25 A3 — skip Pass-2 sample-language drafting entirely under
    // conservative_assumption; compact entries have no finding/remediation
    // scaffold for the drafter to consume.
    const _detBasis = (report?.scope_analysis?.determination_basis === "conservative_assumption");
    const gapItems = _detBasis ? [] : [
      ...(report.notice_gaps ?? []).filter((i: any) => i.status !== "compliant").map((i: any) => ({ ...i, section: "notice" })),
      ...(report.opt_out_gaps ?? []).filter((i: any) => i.status !== "compliant").map((i: any) => ({ ...i, section: "opt_out" })),
      ...(report.access_gaps ?? []).filter((i: any) => i.status !== "compliant").map((i: any) => ({ ...i, section: "access" })),
    ];

    if (gapItems.length > 0) {
      try {
        const decisionDomain = (Array.isArray(intake.decision_domains) ? intake.decision_domains : []).join(", ");
        const systemName = intake.system_name ?? "the automated system";
        const purposeText = intake.notice_purpose_text || "";
        const systemDescription = intake.system_description ?? "";
        const humanReview = intake.human_review ?? "";
        const optOutMethods = (Array.isArray(intake.opt_out_methods) ? intake.opt_out_methods : []).join(" and ");
        const optOutLinkTitle = intake.opt_out_link_title || "Opt Out of Automated Decisions";
        const optOutConfirmation = intake.opt_out_confirmation_mechanism || "";
        const optOutAppeal = intake.opt_out_appeal_process || "";
        const accessMethods = intake.access_submission_methods || "";
        const accessTimeline = intake.access_response_timeline || "45 days";
        const accessLogic = intake.access_logic_disclosure || "";
        const accessOutcome = intake.access_outcome_disclosure || "";
        const tradeSecret = intake.access_trade_secret_policy || "";
        const altProcess = intake.notice_has_alternative_process === "Yes"
          ? "Consumers who opt out will have their application reviewed by a human reviewer."
          : "";

        const draftSystem = `You are a California privacy compliance attorney drafting plain-language ADMT compliance language for a business under CPPA final regulations (11 CCR §§ 7220–7222, effective January 1, 2027).

Your task: for each gap item listed, write ready-to-use draft language the business can paste directly into their privacy notice, website, opt-out mechanism, or consumer response template.

CRITICAL DRAFTING RULES:
1. Use the business's ACTUAL system name, purpose, and decision domain — never write generic placeholders where real information was provided FOR THOSE FIELDS. This permission is SCOPED to system name, purpose, and decision domain only.
1a. CONTACT-POINT PLACEHOLDER RULE (QLB-W2B — BINDING, NO EXCEPTIONS): all contact points — URLs, web addresses, email addresses, phone numbers, hyperlinks, and any similar concrete identifier — are ALWAYS bracketed generic placeholders. Use "[YOUR PRIVACY EMAIL ADDRESS]", "[LINK TO THE ADMT SECTION OF YOUR PRIVACY POLICY]", "[YOUR OPT-OUT URL]", "[YOUR TOLL-FREE NUMBER]" — NEVER concrete values derived from the organization's name, brand, or domain. A fabricated plausible domain or email (e.g. "privacy@<orgname>.com", "https://www.<orgname>.com/privacy-rights") is a hallucination, not a template, even when the organization name is known. The intake does NOT authorize inference of the organization's actual privacy email or URL from its name; those values are supplied by the user post-generation.
2. Use [BRACKETED PLACEHOLDERS] for ALL contact-point fields (per rule 1a) AND for any other information the business must supply that was not provided in the intake.
3. Language must be plain and specific — § 7220(c)(1) prohibits generic statements like "to make significant decisions." Write "to determine your eligibility for a loan" not "for automated decision purposes."
4. Tone: clear, direct, consumer-facing. No legalese. No passive voice where active is possible.
5. Length: Pre-use notice paragraphs 2–5 sentences. Opt-out confirmation 1–3 sentences. Access response template 1 paragraph per section.
6. Do NOT include legal disclaimers in the draft language — that appears elsewhere in the product.
7. Return ONLY valid JSON — no markdown, no preamble.`;

        const draftPrompt = `Draft sample compliance language for each gap item below. Use the business's actual information.

BUSINESS CONTEXT:
- System name: ${systemName}
- System description: ${systemDescription}
- Decision domain(s): ${decisionDomain}
- Purpose statement (if provided): ${purposeText}
- Human review: ${humanReview}
- Opt-out methods: ${optOutMethods}
- Opt-out link title: ${optOutLinkTitle}
- Opt-out confirmation: ${optOutConfirmation}
- Appeal process: ${optOutAppeal}
- Access submission methods: ${accessMethods}
- Access response timeline: ${accessTimeline}
- Logic disclosure: ${accessLogic}
- Outcome disclosure: ${accessOutcome}
- Trade secret policy: ${tradeSecret}
- Alternative process for opt-outs: ${altProcess}

GAP ITEMS REQUIRING DRAFT LANGUAGE:
${gapItems.map((item, i) => `[${i}] SECTION: ${item.section} | ELEMENT: ${item.element} | CITATION: ${item.citation} | FINDING: ${item.finding} | REMEDIATION: ${item.remediation}`).join("\n")}

For each item, produce draft language appropriate to its section:
- "notice" items → draft Pre-Use Notice language (the actual text to show consumers before ADMT is applied)
- "opt_out" items → draft opt-out mechanism text (link title, confirmation message, or appeal acknowledgment)
- "access" items → draft Access Right response template (what the business sends when a consumer requests access)

Return this JSON structure exactly:
{
  "drafts": [
    {
      "index": 0,
      "element": "exact element name from input",
      "section": "notice|opt_out|access",
      "citation": "citation from input",
      "sample_language": "Ready-to-use draft text. Use [PLACEHOLDER] only where business-specific information was not provided.",
      "usage_note": "One sentence explaining where/how to deploy this language (e.g., 'Add to your privacy notice at collection, before any data is used for scoring.')"
    }
  ]
}`;

        let draftRaw: string;
        {
          const first = await callAnthropic(draftSystem, draftPrompt, PRODUCT_MAX_OUTPUT_TOKENS, "sample-language");
          if (first.stopReason === "max_tokens") {
            console.warn(`[run-admt-checker] sample-language truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} — single retry`);
            const retry = await callAnthropic(draftSystem, draftPrompt, PRODUCT_MAX_OUTPUT_TOKENS, "sample-language-retry");
            draftRaw = retry.text;
          } else {
            draftRaw = first.text;
          }
        }
        const draftResult = tryParseJson(draftRaw);

        if (draftResult?.drafts && Array.isArray(draftResult.drafts)) {
          for (const draft of draftResult.drafts) {
            const section = draft.section as "notice" | "opt_out" | "access";
            const targetArray =
              section === "notice" ? report.notice_gaps :
              section === "opt_out" ? report.opt_out_gaps :
              report.access_gaps;
            if (!Array.isArray(targetArray)) continue;
            const target = targetArray.find((item: any) => item.element === draft.element);
            if (target) {
              target.sample_language = draft.sample_language ?? null;
              target.usage_note = draft.usage_note ?? null;
            }
          }
        }
      } catch (draftErr) {
        console.warn("[run-admt-checker] sample language drafting failed (non-fatal):", draftErr);
      }
    }

    // 2.8a — deterministic critical_failures mirror. Every gap with status
    // "missing" AND HIGH enforcement-exposure band is mirrored into
    // critical_failures[] using the gap's own title and exposure text. Mirror
    // only from existing gap items; never invent entries.
    try {
      const HIGH_BAND = /\bHIGH\b/i;
      const gapBuckets: any[][] = [
        Array.isArray(report?.notice_gaps) ? report.notice_gaps : [],
        Array.isArray(report?.opt_out_gaps) ? report.opt_out_gaps : [],
        Array.isArray(report?.access_gaps) ? report.access_gaps : [],
      ];
      const mirrored: any[] = [];
      for (const bucket of gapBuckets) {
        for (const g of bucket) {
          if (g?.status === "missing" && typeof g?.enforcement_exposure === "string" && HIGH_BAND.test(g.enforcement_exposure)) {
            mirrored.push({
              element: g.element,
              element_id: g.element_id,
              enforcement_exposure: g.enforcement_exposure,
            });
          }
        }
      }
      report.critical_failures = mirrored;
    } catch (e) {
      console.warn("[run-admt-checker] critical_failures mirror failed (non-fatal):", e);
    }

    // 2.8 S2 — forward-path guard.
    try {
      const guarded = guardInformationNeeded(report, ((assessment as any).intake_data as Record<string, unknown>) ?? {}, "cppa_admt");
      report = guarded.report;
    } catch (e) {
      console.warn("[run-admt-checker] guardInformationNeeded failed (non-fatal):", e);
    }

    // ── POST-C1-FIX-1C SCHEMA NORMALIZATION ─────────────────────────────────
    // Move any stray top-level scope fields into scope_analysis BEFORE any
    // downstream reader touches the report. This kills the dual-path read
    // class: from here forward, `readAdmtScope` returns the canonical value
    // and no consumer needs to know about the top-level shape.
    try {
      const diag = normalizeAdmtScopeShape(report);
      if (diag.moved.length > 0 || diag.conflicts.length > 0) {
        console.warn(JSON.stringify({
          evt: "admt_scope_shape_normalized_at_generate", fn: "run-admt-checker",
          build_stamp: BUILD_STAMP, moved: diag.moved, conflicts: diag.conflicts,
        }));
      }
    } catch (e) {
      console.error("[ADMT] POST-C1-FIX-1C scope-shape normalizer errored (non-fatal):", e);
    }

    // ── QB-P25 A3 normalizer ────────────────────────────────────────────────
    // Extracted to ./_qbp25_a3_normalize.ts so B0-a can exercise it directly.
    // Behavior and log messages are preserved bit-for-bit.
    try {
      const intakeForNorm = ((assessment as any)?.intake_data as Record<string, unknown>) ?? {};
      const nr = normalizeQbp25A3(report, intakeForNorm);
      if (nr.detBasisDefaulted) {
        console.warn(`[ADMT] QB-P25 A3: determination_basis missing/invalid; defaulted to 'established'`);
      }
      if (nr.compactStripped > 0) console.warn(`[ADMT] QB-P25 A3 compact-mode: stripped ${nr.compactStripped} non-compact keys across gap entries`);
      if (nr.exposureCoerced > 0) console.warn(`[ADMT] QB-P25 A3 enforcement_exposure: coerced ${nr.exposureCoerced} entries to enum`);
    } catch (e) {
      console.error("[ADMT] QB-P25 A3 normalizer errored (non-fatal):", e);
    }

    // QB11-3 + POST-C1-FIX-1A + POST-C1-FIX-1C: Step-2 hard rule — when
    // triggers_significant_decision is false, the three ADMT gap arrays
    // (§§ 7200–7222) MUST be empty. Post-1C the scope boolean is guaranteed
    // canonical under scope_analysis (normalizer above migrates strays);
    // `readAdmtScope` remains the sole reader.
    function enforceScopeGateOnGaps(report: any): any {
      try {
        const scope = readAdmtScope(report, { context: "enforceScopeGateOnGaps" });
        console.log(JSON.stringify({
          evt: "admt_scope_gate_read", fn: "run-admt-checker", build_stamp: BUILD_STAMP,
          resolved_trigger: scope.triggers_significant_decision,
          determination_basis: scope.determination_basis ?? null,
        }));
        if (scope.triggers_significant_decision === false) {
          for (const key of ["notice_gaps", "opt_out_gaps", "access_gaps"]) {
            if (Array.isArray(report?.[key]) && report[key].length > 0) {
              console.warn(`[ADMT] POST-C1-FIX-1A: triggers_significant_decision=false but ${key} had ${report[key].length} entries — emptied per Step-2 rule`);
              report[key] = [];
            }
          }
        }
      } catch (e) {
        console.error("[ADMT] POST-C1-FIX-1A scope-gate enforcement errored:", e);
      }
      return report;
    }
    report = enforceScopeGateOnGaps(report);

    // QB13-6(a): remove entries with status "compliant" from notice_gaps, access_gaps,
    // and opt_out_gaps (they remain in compliant_elements).
    try {
      let removed = 0;
      for (const key of ["notice_gaps", "opt_out_gaps", "access_gaps"]) {
        if (Array.isArray(report?.[key])) {
          const before = report[key].length;
          report[key] = report[key].filter((it: any) => it?.status !== "compliant");
          removed += before - report[key].length;
        }
      }
      if (removed > 0) console.warn(`[ADMT] QB13-6(a): removed ${removed} compliant item(s) from gaps arrays`);
    } catch (e) {
      console.error("[ADMT] QB13-6(a) compliant-strip errored:", e);
    }



    // Stage 1: metering + version retention (written BEFORE status:complete).
    await recordRunMeterAndVersion(supabase, {
      toolType: "cppa_admt",
      assessmentId: assessment_id,
      userId: (assessment as any).user_id ?? null,
      intake: ((assessment as any).intake_data as Record<string, unknown>) ?? {},
      reportData: report,
    });

    // CPPA-HF4 Task C + D2 + F, HF5 Task B/C/D/E — post-gen artifact scrub.
    try {
      const REPLACEMENTS: Array<[RegExp, string]> = [
        // CPPA-HF6 — phrase-artifact rules ("the applicable definitional
        // provision" / "the applicable regulation section" / doubled
        // "the the cited provision") moved to PRE-injection so the
        // registry-injection pass consumes the resulting placeholder
        // token. Kept only the bracketed-counsel and element-id classes
        // here.
        // D2 — bracketed counsel placeholders → generic authorised-signatory
        [/\[\s*(?:BUSINESS\s+)?LEGAL\s+COUNSEL(?:\s+OR\s+DESIGNATED\s+OFFICER)?\s*\]/gi, "[AUTHORISED SIGNATORY]"],
        [/\[\s*(?:CONFIRM|COORDINATE|CHECK)\s+WITH\s+LEGAL\s+COUNSEL[^\]]*\]/gi, ""],
        [/\[\s*LAW[-\s]?FIRM\s+NAME\s*\]/gi, ""],
        // F — ADMT element ids surfaced in prose
        [/\baccess_verify_nonacct\b/g, "the non-account access verification step"],
        [/\baccess_verify\b/g, "the access-response verification step"],
        // PRODUCT-FIX-4 T1 — probability-score meta-instruction leak: strip
        // ALL-CAPS bracketed drafting instructions and rewrite with compliant
        // withholding language (branch (ii) default; safe under either branch
        // because the withholding sentence is a lawful default when the score
        // is not disclosed inline).
        [/\[\s*REGARDING\s+THE\s+PROBABILITY\s+SCORE[^\]]*\]/gi,
          "The raw output score is withheld under 11 CCR § 7222(c) as information whose disclosure would reveal trade secrets as defined in Civil Code § 3426.1(d); the response nevertheless describes the input categories and the plain-language logic of the ADMT so the consumer can understand how their personal information generated the output."],
        [/\[\s*SELECT\s+ONE\s*:\s*(?:RAW\s+)?PROBABILITY\s+SCORE[^\]]*\]/gi,
          "The raw output score is withheld under 11 CCR § 7222(c) as information whose disclosure would reveal trade secrets as defined in Civil Code § 3426.1(d)."],
        // Body-text "resolved by legal counsel" directive for the bracketed
        // probability field → recast to advisory close per CPPA-HF3 E.
        [/\bthe\s+probability[-\s]?score\s+bracketed\s+field\s+must\s+be\s+resolved\s+by\s+legal\s+counsel[^.]*\.?/gi,
          "The probability-score element is resolved in the access response by either disclosing the score inline or invoking the § 7222(c) trade-secret carve-out with the compliant withholding sentence; further internal investigation is advisable to confirm which branch the business's trade-secret designation under Civil Code § 3426.1(d) supports."],
      ];
      let scrubbedAdmt = 0;
      const walkAdmt = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) { for (const v of node) walkAdmt(v); return; }
        if (typeof node !== "object") return;
        for (const k of Object.keys(node)) {
          const v = (node as any)[k];
          if (typeof v === "string") {
            let next = v;
            for (const [re, sub] of REPLACEMENTS) next = next.replace(re, sub);
            next = next.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1");
            if (next !== v) { (node as any)[k] = next; scrubbedAdmt++; }
          } else if (v && typeof v === "object") {
            walkAdmt(v);
          }
        }
      };
      walkAdmt(report);
      if (scrubbedAdmt > 0) {
        console.warn(`[run-admt-checker] CPPA-HF4/5 post-gen scrub: ${scrubbedAdmt} occurrence(s) cleaned`);
      }
    } catch (e) {
      console.warn("[run-admt-checker] CPPA-HF4/5 post-gen scrub failed (non-fatal):", e);
    }

    // CPPA-HF5 Task C — access-chain citation assembly: strip § 7001(e)(1)
    // (definitional) from citation strings that ALSO cite § 7222(b)(3)/(4)
    // (substantive access-response authority). Definitional support belongs
    // in narrative, not in the citation chain.
    try {
      const stripDefFrom7222Chain = (s: unknown): unknown => {
        if (typeof s !== "string") return s;
        if (!/§\s*7222\(b\)\((?:3|4)\)/.test(s)) return s;
        if (!/§\s*7001/.test(s)) return s;
        // Remove " + 11 CCR § 7001(e)(1)" / " + § 7001(x)" fragments; also
        // handle leading/trailing joiners.
        let out = s
          .replace(/\s*\+\s*(?:11\s*CCR\s*)?§\s*7001(?:\([a-z0-9]+\))*/gi, "")
          .replace(/(?:11\s*CCR\s*)?§\s*7001(?:\([a-z0-9]+\))*\s*\+\s*/gi, "")
          .replace(/,\s*(?:11\s*CCR\s*)?§\s*7001(?:\([a-z0-9]+\))*/gi, "")
          .replace(/\s{2,}/g, " ").trim();
        return out;
      };
      for (const bucket of ["notice_gaps", "opt_out_gaps", "access_gaps", "documentation_to_maintain"]) {
        const arr = (report as any)[bucket];
        if (!Array.isArray(arr)) continue;
        for (const it of arr) {
          if (it && typeof it.citation === "string") it.citation = stripDefFrom7222Chain(it.citation);
          // HF6C Task B — extend strip to prose fields where the model
          // authored the definitional cite inline within a §7222 chain.
          for (const f of ["finding", "remediation", "enforcement_exposure", "usage_note", "sample_language"]) {
            if (it && typeof it[f] === "string") it[f] = stripDefFrom7222Chain(it[f]);
          }
        }
      }
      // HF6C Task B — aggregate_access_response scans every string leaf
      // for a §7222(b)(3|4) + §7001 chain and removes the definitional
      // cite from the operative citation chain.
      const aar = (report as any).aggregate_access_response;
      if (aar && typeof aar === "object") {
        for (const key of Object.keys(aar)) {
          if (typeof aar[key] === "string") aar[key] = stripDefFrom7222Chain(aar[key]);
        }
      }

    } catch (e) {
      console.warn("[run-admt-checker] CPPA-HF5 C citation-chain strip failed (non-fatal):", e);
    }

    // CPPA-HF5 Task D — scope_analysis sell/share derivation guard.
    // Assert sell/share triggers ONLY from explicit intake sell/share
    // fields. If intake has no such field set true, strip narrative
    // claims that "the business sells or shares personal information".
    try {
      const intakeAny = (intake ?? {}) as Record<string, unknown>;
      const truthy = (v: unknown) =>
        v === true || v === "yes" || v === "Yes" || v === "true" ||
        (typeof v === "string" && /\b(yes|sell|shares?)\b/i.test(v) && !/\bno\b/i.test(v));
      const intakeAsserstsSellShare =
        truthy((intakeAny as any).sells_personal_information) ||
        truthy((intakeAny as any).shares_personal_information) ||
        truthy((intakeAny as any).sells_or_shares_pi) ||
        truthy((intakeAny as any).sale_or_share) ||
        truthy((intakeAny as any).q_sale_share) ||
        truthy((intakeAny as any).cross_context_advertising);
      if (!intakeAsserstsSellShare) {
        const stripSellShare = (s: unknown): unknown => {
          if (typeof s !== "string") return s;
          let next = s
            .replace(/\bthe\s+business\s+sells\s+or\s+shares\s+personal\s+information[^.;]*/gi,
              "the intake does not confirm sale or sharing of personal information")
            .replace(/\bsells?\s+or\s+shares?\s+personal\s+information\b/gi,
              "processes personal information");
          return next;
        };
        const sa = (report as any).scope_analysis;
        if (sa && typeof sa === "object") {
          for (const k of Object.keys(sa)) {
            if (typeof sa[k] === "string") sa[k] = stripSellShare(sa[k]);
          }
        }
      }
    } catch (e) {
      console.warn("[run-admt-checker] CPPA-HF5 D scope-derivation guard failed (non-fatal):", e);
    }

    // CPPA-HF5 Task E — usage_note counsel-coordination strip. Counsel
    // referral / coordination directives are a banned voice class; recast
    // to named-fact advisory prose.
    try {
      const stripCounsel = (s: unknown): unknown => {
        if (typeof s !== "string") return s;
        let next = s
          .replace(/\bwork\s+with\s+(?:your\s+)?(?:legal\s+)?counsel[^.]*\.?/gi, "")
          .replace(/\bcoordinate\s+with\s+(?:your\s+)?(?:legal\s+)?counsel[^.]*\.?/gi, "")
          .replace(/\bconsult\s+(?:with\s+)?(?:your\s+)?(?:legal\s+)?counsel[^.]*\.?/gi, "")
          .replace(/\bconfirm\s+with\s+(?:your\s+)?(?:legal\s+)?counsel[^.]*\.?/gi, "")
          .replace(/\bhave\s+(?:your\s+)?(?:legal\s+)?counsel\s+[^.]*\.?/gi, "")
          .replace(/\s{2,}/g, " ").trim();
        if (!next) next = "Deploy this language in the referenced consumer-facing surface; further internal investigation is advisable where the operative facts are unclear.";
        return next;
      };
      for (const bucket of ["notice_gaps", "opt_out_gaps", "access_gaps"]) {
        const arr = (report as any)[bucket];
        if (!Array.isArray(arr)) continue;
        for (const it of arr) {
          if (it && typeof it.usage_note === "string") it.usage_note = stripCounsel(it.usage_note);
        }
      }
    } catch (e) {
      console.warn("[run-admt-checker] CPPA-HF5 E usage_note strip failed (non-fatal):", e);
    }

    // ── S-B INTAKE-FACT-LEDGER (sb-fl-w1) wiring — pre-VA-stamp ──
    // Blocks wave-14/15 unsupported-positive / contradiction /
    // negative-from-silence classes on the same client-fact surfaces the
    // VA stamp walks. Runs AFTER the pre-VA scrub chain (HF5/CPPA usage_note)
    // and BEFORE the W9-ADMT-WIRE L1 citation stamp pass so stamps attach
    // to final (rewritten) claim text. Fail-open. Telemetry sequestered
    // under _meta.internal.fact_ledger only (survives TURN C1 leak-guard).
    try {
      const _intakeForFL = ((assessment as any)?.intake_data as Record<string, unknown>) ?? {};
      const ledger = buildFactLedger(_intakeForFL);
      const NEG_RE = /\b(no|none|not|never|absence of|does not|is not|are not|without)\b/i;
      const pickText = (o: any): string => {
        if (!o || typeof o !== "object") return "";
        return String(
          o.finding ?? o.description ?? o.text ?? o.action ?? o.statement ??
            o.title ?? o.note ?? o.rationale ?? o.detail ?? o.usage_note ?? "",
        );
      };
      const pickField = (o: any): string | undefined => {
        if (!o || typeof o !== "object") return undefined;
        const f = o.field ?? o.intake_field ?? o.intake_field_1 ??
          (Array.isArray(o.source_fields) && o.source_fields[0]);
        return typeof f === "string" && f.trim() ? f.trim() : undefined;
      };
      const setText = (o: any, next: string): void => {
        if (!o || typeof o !== "object") return;
        for (const k of ["finding", "description", "text", "action", "statement", "title", "note", "rationale", "detail", "usage_note"]) {
          if (typeof o[k] === "string" && o[k]) { o[k] = next; return; }
        }
      };
      const claims: Array<{ text: string; field?: string; direction: "positive" | "negative"; surfacePath?: string; needle?: string; __ref?: any }> = [];
      const scan = (arr: any, path: string): void => {
        if (!Array.isArray(arr)) return;
        arr.forEach((it, i) => {
          const text = pickText(it);
          if (!text) return;
          const field = pickField(it);
          const direction: "positive" | "negative" = NEG_RE.test(text) ? "negative" : "positive";
          const q = text.match(/["“]([^"”]{6,120})["”]/);
          const needle = q ? q[1] : undefined;
          claims.push({ text, field, direction, surfacePath: `${path}[${i}]`, needle, __ref: it });
        });
      };
      const r0: any = report;
      scan(r0.information_needed, "information_needed");
      scan(r0.notice_gaps, "notice_gaps");
      scan(r0.opt_out_gaps, "opt_out_gaps");
      scan(r0.access_gaps, "access_gaps");
      scan(r0.documentation_to_maintain, "documentation_to_maintain");
      scan(r0.top_3_actions, "top_3_actions");
      scan(r0.deadline_table, "deadline_table");
      const sa: any = r0.scope_analysis;
      if (sa && typeof sa === "object") {
        const text = pickText(sa);
        if (text) {
          const field = pickField(sa);
          const direction: "positive" | "negative" = NEG_RE.test(text) ? "negative" : "positive";
          claims.push({ text, field, direction, surfacePath: "scope_analysis", __ref: sa });
        }
      }
      const flRes = enforceLedger(r0, ledger, { claims: claims.map(({ __ref, ...c }) => c) });
      for (const rw of flRes.rewrites) {
        const src = claims.find((c) => c.surfacePath === rw.surfacePath && c.text === rw.from);
        if (src && src.__ref) setText(src.__ref, rw.to);
      }
      console.log(JSON.stringify({
        evt: "fact_ledger_pass", fn: "run-admt-checker",
        build_stamp: BUILD_STAMP, version: FACT_LEDGER_VERSION,
        ledger_rows: ledger.length, ...flRes.counters,
      }));
    } catch (e) {
      console.warn("[run-admt-checker] S-B fact-ledger errored (fail-open):", (e as Error)?.message);
    }

    // ── W9-ADMT-WIRE — L1 REGISTRY-STAMPED CITATIONS (pre-emit VA resolver) ──
    // Walks every gap/finding entry that emitted a proposition_key and stamps
    // the citation + subsection + verbatim_quote from ADMT_VERIFIED_AUTHORITIES.
    // The generator never authors §-tokens; this pass is deterministic.
    // Also normalizes the S5 hard slot `top_3_actions` shape.
    const w9Metrics = {
      va_version: ADMT_VERIFIED_AUTHORITY_VERSION,
      va_rows: vaRegistrySize(ADMT_VERIFIED_AUTHORITIES),
      va_stamps_applied: 0,
      va_stamps_unresolved: 0,
      // ADMT-W16-FIX (2026-07-25) — reverse-lookup telemetry.
      va_reverse_stamps_applied: 0,
      va_reverse_ambiguous: 0,
      va_reverse_uncovered: 0,
      top3_padded: 0,
      top3_final_len: 0,
      // W9-ADMT-WIRE-P1 telemetry
      p1_anchor_dedupes: 0,        // defect #2: "X + X" collapsed to "X"
      p1_7150_depth_downgrades: 0, // defect #3a: § 7150(b)(N) below registry granularity → § 7150
      p1_7001_sole_anchor_fallbacks: 0, // defect #3b: § 7001-only anchor on action-duty finding → neutral fallback
    };
    try {
      const stampArr = (arr: any): void => {
        if (!Array.isArray(arr)) return;
        for (const it of arr) {
          if (!it || typeof it !== "object") continue;
          const pk = typeof it.proposition_key === "string" ? it.proposition_key : "";
          let row = pk ? resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, pk) : null;
          if (row) {
            it.citation = row.subsection;
            it._va_stamp = { proposition_key: pk, subsection: row.subsection, depth_class: row.depth_class, verbatim_quote: row.verbatim_quote, verified_on: row.verified_on };
            w9Metrics.va_stamps_applied++;
            continue;
          }
          // ADMT-W16-FIX — reverse citation→row lookup. Deterministic,
          // used ONLY when proposition_key is absent OR unresolved and the
          // entry ALREADY carries a citation string the model authored.
          // Ambiguous or unmatched → treat as unresolved; never guess.
          const citStr = typeof it.citation === "string" ? it.citation : "";
          if (citStr) {
            let revRow: ReturnType<typeof resolveByCitationString> = null;
            try { revRow = resolveByCitationString(ADMT_VERIFIED_AUTHORITIES, citStr); }
            catch (_) { revRow = null; }
            if (revRow) {
              it.citation = revRow.subsection;
              it._va_stamp = {
                proposition_key: revRow.proposition_key,
                subsection: revRow.subsection,
                depth_class: revRow.depth_class,
                verbatim_quote: revRow.verbatim_quote,
                verified_on: revRow.verified_on,
                resolved_via: "citation_reverse_lookup",
              };
              w9Metrics.va_reverse_stamps_applied++;
              continue;
            }
            // Ambiguous or unmatched → uncovered. Never fabricate.
            let ambiguous = false;
            try {
              const needle = normalizeCitationString(citStr);
              let hits = 0;
              for (const r of Object.values(ADMT_VERIFIED_AUTHORITIES)) {
                if (normalizeCitationString(r.subsection) === needle) hits++;
              }
              ambiguous = hits > 1;
            } catch (_) { ambiguous = false; }
            if (ambiguous) w9Metrics.va_reverse_ambiguous++;
            else w9Metrics.va_reverse_uncovered++;
          }
          if (pk) {
            it._va_stamp_unresolved = { proposition_key: pk };
            w9Metrics.va_stamps_unresolved++;
          } else if (citStr) {
            // ADMT-W16-FIX — no key AND no reverse match: route to information_needed.
            it._va_stamp_unresolved = { proposition_key: "", citation_authored: citStr };
            it.citation = "";
            it.information_needed = true;
            w9Metrics.va_stamps_unresolved++;
          }
        }
      };
      for (const bucket of ["notice_gaps", "opt_out_gaps", "access_gaps", "documentation_to_maintain", "top_3_actions"]) {
        stampArr((report as any)[bucket]);
      }
      // TURN 2 — extend VA-stamp walk to scope_analysis.is_admt_reasoning
      // (single-object bucket; keyed on is_admt_proposition_key).
      try {
        const sa: any = (report as any).scope_analysis;
        if (sa && typeof sa === "object") {
          const pk = typeof sa.is_admt_proposition_key === "string" ? sa.is_admt_proposition_key : "";
          if (pk) {
            const row = resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, pk);
            if (row) {
              sa._va_stamp = {
                field: "is_admt_reasoning",
                proposition_key: pk,
                subsection: row.subsection,
                depth_class: row.depth_class,
                verbatim_quote: row.verbatim_quote,
                verified_on: row.verified_on,
              };
              w9Metrics.va_stamps_applied++;
            } else {
              sa._va_stamp_unresolved = { field: "is_admt_reasoning", proposition_key: pk };
              w9Metrics.va_stamps_unresolved++;
            }
          }
        }
      } catch (_) { /* fail-open */ }



      // ── W9-ADMT-WIRE-P1 — post-stamp anchor hygiene (defects #2 + #3) ──
      // Runs after both the L0 resolveInto pass and the L1 VA stamp pass so
      // it sees every finding's final citation string regardless of source.
      // Non-fatal: on any error we log and continue with the original citation.
      const SUBCH_FALLBACK = "the applicable ADMT-subchapter provision";
      // Set of every subsection/section string the L1 verified registry
      // affirmatively supports. Anything deeper than this is not "verified".
      const VA_VERIFIED_SUBSECTIONS: Set<string> = new Set(
        Object.values(ADMT_VERIFIED_AUTHORITIES).map((r: any) => String(r.subsection || "")),
      );
      const ACTION_DUTY_BUCKETS = new Set(["notice_gaps", "opt_out_gaps", "access_gaps"]);
      const splitAnchors = (s: string): string[] =>
        s.split(/\s*\+\s*/).map((x) => x.trim()).filter(Boolean);
      const isSection7001 = (a: string) => /^11\s*CCR\s*§\s*7001(\b|\()/.test(a);
      const isSection7150Deep = (a: string) => /^11\s*CCR\s*§\s*7150\s*\(/.test(a);
      const dedupeAnchors = (s: string): { out: string; changed: boolean } => {
        const parts = splitAnchors(s);
        if (parts.length <= 1) return { out: s, changed: false };
        const seen = new Set<string>();
        const kept = parts.filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
        const out = kept.join(" + ");
        return { out, changed: out !== s };
      };
      const walkAnchorGuard = (bucket: string, arr: any): void => {
        if (!Array.isArray(arr)) return;
        for (const it of arr) {
          if (!it || typeof it !== "object") continue;
          let c = typeof it.citation === "string" ? it.citation : "";
          if (!c) continue;
          // (a) dedupe identical anchors joined by " + " (defect #2)
          const dd = dedupeAnchors(c);
          if (dd.changed) { c = dd.out; w9Metrics.p1_anchor_dedupes++; }
          // (b) § 7150 subsection depth guard (defect #3a) — any § 7150(x)(y)
          //     pinpoint whose exact string is NOT in the L1 verified registry
          //     downgrades to section-level "11 CCR § 7150".
          {
            const parts = splitAnchors(c);
            let changed = false;
            const next = parts.map((p) => {
              if (isSection7150Deep(p) && !VA_VERIFIED_SUBSECTIONS.has(p)) {
                changed = true;
                return "11 CCR § 7150";
              }
              return p;
            });
            if (changed) {
              const seen = new Set<string>();
              const kept = next.filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
              c = kept.join(" + ");
              w9Metrics.p1_7150_depth_downgrades++;
            }
          }
          // (c) § 7001 sole-anchor guard (defect #3b) — on action-duty buckets
          //     (notice/opt-out/access), a citation composed only of § 7001
          //     pinpoints is a definition standing in for an operative anchor.
          //     Replace with the neutral subchapter fallback; § 7001 companion
          //     citations remain permitted when at least one non-§7001 anchor
          //     is present alongside them.
          if (ACTION_DUTY_BUCKETS.has(bucket)) {
            const parts = splitAnchors(c);
            if (parts.length > 0 && parts.every(isSection7001)) {
              c = SUBCH_FALLBACK;
              w9Metrics.p1_7001_sole_anchor_fallbacks++;
            }
          }
          // (d) WAVE12-FIX TURN C — collapse multiple § 7001 pinpoints joined
          //     by "+" (e.g. "§ 7001(e) + § 7001(e)" or "§ 7001(e) + § 7001(e)(1)").
          //     Per PF6 T1, § 7001 subdivisions are NEVER chained. Keep only
          //     the first § 7001 pinpoint; retain all non-§7001 anchors.
          {
            const parts = splitAnchors(c);
            const s7001 = parts.filter(isSection7001);
            if (s7001.length > 1) {
              const other = parts.filter((p) => !isSection7001(p));
              c = [s7001[0], ...other].join(" + ");
              w9Metrics.p1_anchor_dedupes++;
            }
          }
          it.citation = c;
        }
      };
      for (const bucket of ["notice_gaps", "opt_out_gaps", "access_gaps", "documentation_to_maintain", "top_3_actions"]) {
        walkAnchorGuard(bucket, (report as any)[bucket]);
      }

      // ── S5 top_3_actions normalizer — exact-3 shape, no fabricated deadlines/citations
      // LEAK-PREV-P0: fallback text rendered through the customer-messages
      // catalog AND flagged additively with `insufficient_basis: true` so the
      // frontend can key styling on the flag (not the literal string).
      const insufficientAction = renderMessage("insufficient.basis.top_action");
      const insufficientEntry = { rank: 0, action: insufficientAction, citation: "", deadline: "", proposition_key: "", insufficient_basis: true };
      let t3 = Array.isArray((report as any).top_3_actions) ? [...(report as any).top_3_actions] : [];
      // Filter out non-objects / empty entries
      t3 = t3.filter((e: any) => e && typeof e === "object" && typeof e.action === "string" && e.action.trim().length > 0);
      // Pad to 3 with insufficient-basis entries; never fabricate
      while (t3.length < 3) { t3.push({ ...insufficientEntry }); w9Metrics.top3_padded++; }
      if (t3.length > 3) t3 = t3.slice(0, 3);
      // Re-rank 1..3; preserve `insufficient_basis` when present.
      t3 = t3.map((e: any, i: number) => ({ rank: i + 1, action: String(e.action), citation: typeof e.citation === "string" ? e.citation : "", deadline: typeof e.deadline === "string" ? e.deadline : "", proposition_key: typeof e.proposition_key === "string" ? e.proposition_key : "", insufficient_basis: e.insufficient_basis === true }));
      (report as any).top_3_actions = t3;
      w9Metrics.top3_final_len = t3.length;
    } catch (e) {
      console.warn("[run-admt-checker] W9-ADMT-WIRE resolver pass failed (non-fatal):", (e as Error)?.message);
    }

    // ── W6-ADMT-FIX (2026-07-24) — wave-6 atomic post-generation scrub ──
    // Runs AFTER the W9 VA-stamp pass so downstream repairs operate on the
    // registry-stamped citations. Pre-emit gate: capture w6 counters, run one
    // bounded repair pass; if surviving-critical remains, flag insufficient_basis.
    const w9PreEmit = { attempted: 0, repaired: 0, still_failing: 0 };
    try {
      const intakeForW6 = ((assessment as any)?.intake_data as Record<string, unknown>) ?? {};
      const w6 = applyW6AdmtFix(report, intakeForW6);
      // W9 pre-emit accounting: any w6 counter > 0 = a deterministic issue the
      // model produced; the repair pass just cleared it. Repeat once for a
      // bounded second pass so we can distinguish "cleanly repaired" from
      // "still failing after repair".
      const w6Counters = Object.entries(w6).filter(([k]) => k !== "version" && typeof (w6 as any)[k] === "number");
      w9PreEmit.attempted = w6Counters.reduce((n, [, v]) => n + (Number(v) || 0), 0);
      const w6Second = applyW6AdmtFix(report, intakeForW6);
      const w6SecondCounters = Object.entries(w6Second).filter(([k]) => k !== "version" && typeof (w6Second as any)[k] === "number");
      w9PreEmit.still_failing = w6SecondCounters.reduce((n, [, v]) => n + (Number(v) || 0), 0);
      w9PreEmit.repaired = Math.max(0, w9PreEmit.attempted - w9PreEmit.still_failing);
      console.log(JSON.stringify({
        evt: "admt_w6_fix", fn: "run-admt-checker",
        build_stamp: BUILD_STAMP, w6_version: W6_ADMT_FIX_VERSION,
        ...w6,
      }));
      console.log(JSON.stringify({
        evt: "_w9_admt_wire", fn: "run-admt-checker",
        build_stamp: BUILD_STAMP,
        ...w9Metrics,
        pre_emit: w9PreEmit,
      }));
      (report as any)._w6_admt_fix = { version: W6_ADMT_FIX_VERSION, ...w6 };
      (report as any)._w9_admt_wire = { ...w9Metrics, pre_emit: w9PreEmit };
    } catch (e) {
      console.warn("[run-admt-checker] W6-ADMT-FIX failed (non-fatal):", (e as Error)?.message);
    }

    // ── TURN 2 — deterministic slot reprojection (A-A, A-B, A-C).
    // Runs AFTER W9 VA-stamp + W6 scrub so slots see the final registry-stamped
    // scope_analysis. Validation is non-blocking; counters attach under
    // _meta.w9_admt_slots and the CI unit test enforces the structural contract
    // at build time.
    const w9SlotMeta: any = { stamp: W9_ADMT_SLOTS_STAMP, attached: [], ok: false, errors: [], warnings: [] };
    try {
      const _intakeForSlots = ((assessment as any)?.intake_data as Record<string, unknown>) ?? {};
      const { attached, validation, va_version } = attachAndValidateAdmtSlots(report as any, _intakeForSlots);
      w9SlotMeta.attached = attached;
      w9SlotMeta.ok = validation.ok;
      w9SlotMeta.errors = validation.errors;
      w9SlotMeta.warnings = validation.warnings;
      w9SlotMeta.va_version = va_version;
      (report as any)._w9_admt_slots = w9SlotMeta;
      if (!validation.ok) {
        console.warn(`[run-admt-checker] W9-ADMT-SLOTS validator flagged ${validation.errors.length} defect(s): ${validation.errors.join("; ")}`);
      } else {
        console.log(`[run-admt-checker] W9-ADMT-SLOTS attached ${attached.join(",")} (clean)`);
      }
    } catch (e) { console.error("[run-admt-checker] W9-ADMT-SLOTS errored (fail-open):", e); }

    // ── TURN 2 — BOUNDED REGENERATION for W6 still_failing survivors.
    // Policy: ONE bounded pass — for every finding still carrying a defect
    // marker after the second W6 sweep, name the violated rule + registry row
    // and downgrade the finding to typed insufficient-basis. NO fabrication,
    // NO looping, NO second LLM call. Every downgraded finding is counted.
    const w9Regen = { evaluated: 0, downgraded_insufficient_basis: 0, still_failing_after_regen: 0 };
    try {
      const stillFailing = ((report as any)._w9_admt_wire?.pre_emit?.still_failing ?? 0) as number;
      if (stillFailing > 0) {
        const BUCKETS = ["notice_gaps", "opt_out_gaps", "access_gaps"];
        const BUCKET_TOPIC_LABEL: Record<string, string> = {
          notice_gaps: "the Pre-use Notice element",
          opt_out_gaps: "the opt-out element",
          access_gaps: "the access-response element",
        };
        for (const bucket of BUCKETS) {
          const arr = (report as any)[bucket];
          if (!Array.isArray(arr)) continue;
          for (const it of arr) {
            if (!it || typeof it !== "object") continue;
            const unresolved = it._va_stamp_unresolved || (it.status === "gap" && (!it.finding || String(it.finding).trim().length < 8));
            if (!unresolved) continue;
            w9Regen.evaluated++;
            const pk = it._va_stamp_unresolved?.proposition_key || "";
            const row = pk ? (ADMT_VERIFIED_AUTHORITIES as any)[pk] : null;
            const violatedRule = pk ? `unresolved proposition_key "${pk}" against VERIFIED-AUTHORITY REGISTRY` : "post-W6 residual defect (finding underspecified)";
            const rowNote = row ? ` (registry row: ${row.subsection})` : "";
            it.status = "insufficient_basis";
            // W19-ADMT-FALLBACK-JOIN-2 (2) — customer-safe reword.
            // Answer-first, no pipeline/generator/re-run vocabulary; keeps
            // information_needed semantics on the status field intact.
            const topicRaw = (typeof it.element_id === "string" && it.element_id.trim())
              || (pk ? pk.replace(/_/g, " ") : "")
              || BUCKET_TOPIC_LABEL[bucket] || "this obligation";
            const topic = String(topicRaw).replace(/_/g, " ");
            it.finding = `More information is needed before this item can be assessed. The intake did not include enough detail on ${topic} to support a specific finding. Provide the missing details and refresh the assessment.`;
            it.remediation = "";
            it.enforcement_exposure = "na";
            it._w9_regen = { pass: 1, action: "typed_insufficient_basis", violated_rule: violatedRule, row_note: rowNote };
            w9Regen.downgraded_insufficient_basis++;
          }
        }
        w9Regen.still_failing_after_regen = 0; // deterministic pass always terminates
      }
      (report as any)._w9_admt_regen = w9Regen;
      console.log(JSON.stringify({ evt: "_w9_admt_regen", fn: "run-admt-checker", build_stamp: BUILD_STAMP, ...w9Regen }));
    } catch (e) { console.warn("[run-admt-checker] W9-ADMT-REGEN failed (non-fatal):", (e as Error)?.message); }

    // TURN 2 — prompt_version lockstep bump.
    (report as any)._meta = { ...((report as any)._meta ?? {}), prompt_version: stampPromptVersion("cppa-admt", "admt-turn2@2026-07-24"), build_stamp: BUILD_STAMP };

    // ── ADMT-FIX-W9 — PRE-EMIT DETERMINISTIC GATES.
    // Runs BEFORE the attached-deterministic pass so the grader-visible prose
    // reflects post-gate content and residual defects attribute to the model
    // (not to stale pre-scrub text). Mutates in place; counters attach under
    // _w9_admt_pre_emit and stream to logs for wave-level attribution.
    try {
      const preEmit = applyW9AdmtPreEmitGates(report);
      (report as any)._w9_admt_pre_emit = preEmit;
      console.log(JSON.stringify({
        evt: "_w9_admt_pre_emit",
        fn: "run-admt-checker",
        build_stamp: BUILD_STAMP,
        ...preEmit,
      }));
    } catch (e) {
      console.warn("[run-admt-checker] W9-ADMT-PRE-EMIT failed (non-fatal):", (e as Error)?.message);
    }

    try { const _prose = extractProseFromReport(report); const _roster = extractIntakeRoster((assessment as any).intake_data ?? {}); const _det = [...runFormatChecksGeneric(_prose, { intakeRoster: _roster }), ...runAdmtHf1Checks(_prose)].map(x=>({...x, check_type:'deterministic' as const})); attachDeterministicChecks(report as any, _det as any); } catch(_) {}

    // ── W19-ADMT-FALLBACK-JOIN-2 (2026-07-25) — terminal sanitizer.
    // Runs AFTER every content-shaping pass and BEFORE the W12-C1 metadata
    // strip so its diag counter rides `report._w19_admt_join2` and gets
    // relocated to `_meta.internal` by the same strip block. Fail-open.
    try {
      const w19 = applyW19AdmtJoin2(report);
      (report as any)._w19_admt_join2 = w19;
      console.log(JSON.stringify({
        evt: "_w19_admt_join2", fn: "run-admt-checker",
        build_stamp: BUILD_STAMP, ...w19,
      }));
    } catch (e) {
      console.warn("[run-admt-checker] W19-ADMT-JOIN2 failed (non-fatal):", (e as Error)?.message);
    }

    // ── LEAK-PREV-P1 — EMIT GATE (2026-07-25) ─────────────────────────
    // Runs AFTER every content-shaping pass and IMMEDIATELY BEFORE the
    // W12-C1 metadata strip so gate telemetry rides `_meta.internal`.
    // Fail-visible; never blocks emission.
    try {
      const { runEmitGate } = await import("../_shared/emit-gate.ts");
      runEmitGate(report as any, {
        tool: "cppa_admt",
        intakeRoster: (assessment as any).intake_data ?? {},
      });
    } catch (e) {
      console.warn("[run-admt-checker] LEAK-PREV-P1 emit-gate wrapper failed (non-fatal):", (e as Error)?.message);
    }


    // ── LEAK-PREV-P2 — SCHEMA-DRIVEN SERIALIZER (2026-07-25) ─────────
    // Replaces the C1 blacklist strip with a WHITELIST: only schema-
    // declared keys ship. Runs AFTER emit-gate; C1 strip below is kept
    // as the serializer's crash fallback so behaviour degrades to the
    // pre-P2 strip, never to raw internal telemetry.
    let __p2_ok = false;
    try {
      const { serializeCustomerReport } = await import("../_shared/report-serialize.ts");
      const { ADMT_REPORT_SCHEMA } = await import("../_shared/report-schemas/admt.ts");
      const { report: serialized, telemetry } = serializeCustomerReport(report as any, ADMT_REPORT_SCHEMA);
      if (!telemetry.crashed) {
        report = serialized as any;
        __p2_ok = true;
      }
    } catch (e) {
      console.warn("[run-admt-checker] LEAK-PREV-P2 serializer failed (non-fatal):", (e as Error)?.message);
    }

    if (!__p2_ok) {
      // ── WAVE12-FIX TURN C1 — customer-payload metadata strip (fallback) ──
      // Move top-level underscore-prefixed internal telemetry (_w6_admt_fix,
      // _w9_admt_wire, _w9_admt_slots, _w9_admt_regen, _w9_admt_pre_emit, and
      // any future _*) off the customer-facing surface and into
      // _meta.internal. Also strip per-entry underscore-prefixed diagnostics
      // (_va_stamp, _va_stamp_unresolved, _w9_regen) from finding buckets.
      // Non-fatal: on error, we still write the report (previous behaviour).
      try {
        const r: any = report as any;
        const meta = (r._meta = r._meta && typeof r._meta === "object" ? r._meta : {});
        const internal: Record<string, unknown> = (meta.internal && typeof meta.internal === "object") ? meta.internal : {};
        for (const k of Object.keys(r)) {
          if (k === "_meta") continue;
          if (k.startsWith("_")) { internal[k] = r[k]; delete r[k]; }
        }
        meta.internal = internal;
        const BUCKETS = ["notice_gaps", "opt_out_gaps", "access_gaps", "documentation_to_maintain", "top_3_actions"];
        const ENTRY_INTERNAL = ["_va_stamp", "_va_stamp_unresolved", "_w9_regen"];
        for (const b of BUCKETS) {
          const arr = r[b];
          if (!Array.isArray(arr)) continue;
          for (const it of arr) {
            if (!it || typeof it !== "object") continue;
            for (const k of ENTRY_INTERNAL) if (k in it) delete it[k];
          }
        }
        const sa: any = r.scope_analysis;
        if (sa && typeof sa === "object") {
          for (const k of ENTRY_INTERNAL) if (k in sa) delete sa[k];
        }
      } catch (e) {
        console.warn("[run-admt-checker] W12-C1 metadata strip failed (non-fatal):", (e as Error)?.message);
      }
    }


    const completeWrite = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, {
      status: "complete",
      report_data: report,
      updated_at: new Date().toISOString(),
    }, { fn: "run-admt-checker", phase: "terminal_complete" });
    if (!completeWrite.ok) {
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "error", report_data: { error: "complete_write_failed", message: completeWrite.message } }, { fn: "run-admt-checker", phase: "terminal_fallback" });
    }

    // L2 — observe-only citation lint (never blocks, never mutates output).
    try {
      await observeCitations(
        supabase,
        "run-admt-checker",
        assessment_id,
        JSON.stringify(report),
        (authorities ?? []).map((a: any) => a?.citation).filter(Boolean),
      );
    } catch (obsErr) {
      console.error("[citation-observe] non-fatal:", String(obsErr));
    }


    await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "cppa_assessments", sourceRowId: assessment_id });
   } catch (e) {
    console.error("[run-admt-checker] pipeline error:", e);
    await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, {
      status: "error",
      report_data: { error: String(e) },
    }, { fn: "run-admt-checker", phase: "terminal_error_catch" });
    await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id } });
   } finally {
    clearTimeout(budgetTimer);
    console.log(`[run-admt-checker] HF3-F: pipeline elapsed=${Date.now() - pipelineStart}ms budget=${PIPELINE_BUDGET_MS}ms`);
   }
  })());

  return json({ accepted: true, assessment_id }, 202);
});
