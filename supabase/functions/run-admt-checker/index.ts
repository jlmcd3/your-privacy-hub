// supabase/functions/run-admt-checker/index.ts
// ADMT Compliance Assessment — gap analysis generator.
// Pipeline: retrieve corpus → generate gap analysis JSON → persist.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import {
  resolveCitations,
  stripModelCitations,
  validateReport,
  normalizeIntake,
  type ElementId,
} from "../_shared/admt-citation-registry.ts";
import { buildSystemContent, type SystemBlock, type ToolModule } from "../_shared/prompt-core.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
   try {
    await supabase.from("cppa_assessments").update({ status: "processing" }).eq("id", assessment_id);
    const intake = assessment.intake_data as any;


    // 1. Retrieve ADMT authorities from corpus (best-effort).
    let authorities: any[] = [];
    let deadlines: any[] = [];
    try {
      const retrieveRes = await supabase.functions.invoke("cppa-retrieve-context", {
        body: {
          topics: ["admt", "significant-decision", "pre-use-notice", "profiling"],
          query: `ADMT compliance ${(intake.decision_domains ?? []).join(" ")} opt-out pre-use notice access right`,
          include_deadlines: true,
          full_text_limit: 12,
          limit: 20,
        },
      });
      const d = (retrieveRes?.data ?? {}) as any;
      authorities = d.authorities ?? [];
      deadlines = d.deadlines ?? [];
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

    const authoritiesBlock = `REGULATION AUTHORITIES:
${authBlock}

COMPLIANCE DEADLINES:
${deadlineBlock}`;

    const ADMT_EXTRA_RULES = `ANALYTICAL STANDARDS:
1. SCOPE REASONING: For each scope trigger, show the specific reasoning drawn from the system description provided. Do not just output true/false — explain which facts satisfy or fail to satisfy the statutory definition. Quote relevant parts of the system description.

2. EXCEPTION QUALIFICATION: If the business claims a § 7221(b) exception, analyze whether the specific facts they described actually satisfy the statutory requirements:
   - Human appeal exception (§ 7221(b)(1)): The designated reviewer must (A) know how to interpret the output, (B) review the output plus any information the consumer provides, AND (C) have the authority to change the decision. All three elements must be present. A reviewer who "cannot override the output" fails element (C). A reviewer who "sees the output but cannot change it" fails element (C). Be direct: if the facts described do not satisfy all three elements, state that the exception is NOT established.
   - Employment/education exception (§ 7221(b)(2)-(3)): The ADMT must be used SOLELY to assess ability to perform at work or in an educational program, AND must not unlawfully discriminate based on protected characteristics. The non-discrimination condition requires documented evidence — a claim without described testing does not satisfy it.

3. OPERATIONAL GAP — 15-BUSINESS-DAY PROCESS: Test whether the business has a documented operational process to comply with § 7221(n)(1): ceasing ADMT processing within 15 business days of an opt-out request AND notifying all service providers and contractors under § 7221(n)(2). If the "15-business-day opt-out process" field is blank or says "(not described)", flag this as an operational gap in opt_out_gaps.

4. THIRD-PARTY ADMT: If third-party tools are listed, note in the scope analysis that the business remains the CCPA-responsible "business" for ADMT compliance purposes even when using vendor-supplied tools. The obligation to provide the Pre-use Notice, the opt-out mechanism, and the access right applies to the business, not to the vendor.

5. ENFORCEMENT CONTEXT: For gap and missing items, note the per-violation penalty exposure under Cal. Civ. Code § 1798.155(a): $2,663 per violation (unintentional) or $7,988 per intentional violation (2025-2026 CPI-adjusted figures). Where ca_consumer_count is provided, note that each affected consumer may constitute a separate violation.

6. RISK ASSESSMENT OBLIGATION: Produce a detailed risk_assessment_obligation object (not a one-sentence note) covering the specific statutory triggers, the applicable compliance deadline, and the submission requirement. Base all claims solely on what appears in the REGULATION AUTHORITIES block. Note that the compliance deadline depends on when processing was initiated: for processing activities initiated before January 1, 2026 that continue after that date, the deadline for completing and documenting the risk assessment is December 31, 2027. For new processing activities initiated on or after January 1, 2026, the risk assessment must be completed BEFORE initiating the processing. The JSON schema already has separate fields for both deadlines — populate both accurately.

PRIORITY ACTION DEADLINE RULE: When generating priority_actions items that reference risk assessment deadlines, determine which deadline applies based on the intake data:
- If the system has been in use before January 1, 2026 (or the intake does not specify when processing began): use "December 31, 2027" as the deadline.
- If the intake explicitly states processing began on or after January 1, 2026: use "before initiating processing" or "immediately — risk assessment required before processing can continue."
When in doubt, include BOTH deadlines and explain the distinction in a single action item: "Complete and document a risk assessment: before January 1, 2026 if processing has already begun, or before commencing processing if not yet initiated."

7. CONSOLIDATED NOTICE (§ 7220(e)): Analyze whether the business could benefit from providing a consolidated Pre-Use Notice. Four scenarios permit consolidation: (1) one ADMT for multiple purposes; (2) multiple ADMTs for one purpose; (3) multiple ADMTs for multiple purposes; (4) systematic use of a single ADMT. This is a benefit, not an obligation. Always note the mandatory condition: the consolidated notice must include all required § 7220(c) elements for each system or use covered. Produce the consolidated_notice_analysis field in all cases — mark applicable:false with a brief explanation if a single-system/single-purpose deployment makes it irrelevant.

8. AGGREGATE ACCESS RESPONSE (§ 7222(j)): Note this option if prior_access_requests_12mo exceeds 4 in the intake, or flag it as a threshold to monitor if the count is not provided. This is an option, not a requirement — the business may still provide individualized responses even above the threshold. Clarify that aggregate responses under § 7222(j) apply specifically to the logic and output disclosures; other § 7222 elements (specific purpose, verification, anti-retaliation notice) still apply.

9. SIGNIFICANT-DECISION CLASSIFIER — STRUCTURAL GATE:

Under the CPPA final regulations (OAL-approved September 2025), "significant decision" under § 7001(ddd) is ONLY a decision concerning: financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services.

THE FOLLOWING ARE EXPRESSLY NOT SIGNIFICANT DECISIONS — PERIOD:
- Advertising to a consumer: this includes ad-auction eligibility, audience scoring, targeted advertising, audience segmentation, behavioral targeting, ad personalization, and lookalike audience assignment. If decision_domains contains "advertising" OR the system description mentions targeting, segmentation, audience scoring, or ad personalization → triggers_significant_decision MUST be false.
- Gaming, entertainment, or subscription service eligibility and pricing: service eligibility and pricing tiers for gaming, streaming, or subscription services are NOT significant decisions under § 7001(ddd) unless the facts specifically state the decision involves financial/lending services, housing, education, employment, or healthcare. A "service eligibility" domain for a gaming company is NOT a significant decision.

STRUCTURAL ENFORCEMENT — READ BEFORE GENERATING ANY GAP:
Step 1: Set triggers_significant_decision = true ONLY if the system description connects the ADMT output to one of the five enumerated § 7001(ddd) categories.
Step 2: If triggers_significant_decision = false, the notice_gaps array MUST be empty [], the opt_out_gaps array MUST be empty [], and the access_gaps array MUST be empty []. Do NOT generate any § 7220, § 7221, or § 7222 gaps. Populate the scope_analysis.summary field with an explanation that Article 11 ADMT obligations are not triggered, and direct the business to evaluate (a) CCPA sale/sharing opt-out obligations under § 1798.120 and (b) Article 10 risk assessment obligations under § 7150(b)(1) for cross-context behavioral advertising.
Step 3: If triggers_significant_decision = true, proceed normally with the full gap analysis.

SELF-CHECK BEFORE GENERATING OUTPUT: If I am about to set triggers_significant_decision = true for an advertising or gaming service-eligibility use case, STOP. Re-read this rule. The answer is false.

Where the intake does not allow a significant-decision determination, say so in scope_analysis.summary rather than guessing.

9a. ARTICLE 10 vs ARTICLE 11 — SEPARATE GATES (CRITICAL):

Article 11 (§§ 7200–7222) creates ADMT rights: pre-use notice, opt-out, access right. These apply ONLY when ADMT is used to make a significant decision under § 7001(ddd).

Article 10 (§§ 7150–7157) creates risk assessment obligations. These have SEPARATE, BROADER triggers that do NOT require a significant decision:
- § 7150(b)(1): selling or sharing personal information
- § 7150(b)(2): processing sensitive personal information
- § 7150(b)(3): using ADMT to make a significant decision [overlaps with Art. 11]
- § 7150(b)(4): profiling a consumer through systematic observation in their capacity as an applicant, employee, student, or independent contractor
- § 7150(b)(5): profiling a consumer based on their presence in a sensitive location
- § 7150(b)(6): processing personal information to train an ADMT for a significant decision, or to train facial-recognition, emotion-recognition, identity-verification, or other physical/biological identification or profiling technology (per the § 7150(b)(6) / § 7153 "train" definition)

CONSEQUENCE: An AdTech or gaming business may have NO Article 11 obligations (because targeted advertising and gaming pricing are not significant decisions) but STILL have Article 10 risk assessment obligations (because they train ADMT on personal information under § 7150(b)(6), or sell/share personal information under § 7150(b)(1)).

When triggers_significant_decision = false:
- Set triggers_risk_assessment based on whether ANY of § 7150(b)(1)-(6) apply to the facts — NOT based on whether a significant decision is made.
- Populate risk_assessment_obligation even when notice_gaps, opt_out_gaps, and access_gaps are all empty.
- In scope_analysis.summary, explicitly distinguish: "Article 11 ADMT obligations are NOT triggered because [reason]. However, Article 10 risk assessment obligations ARE triggered because [specific § 7150(b)(X) trigger]."

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
    - Human-involvement self-test → drive scope_analysis.human_review_qualifies and human_review_reasoning. Qualifying human involvement under § 7001(e)(1) requires ALL THREE: (A) knows how to interpret the output, (B) reviews the output plus other relevant information, and (C) has authority to change the decision — applied BEFORE the decision is issued. If any element is "No", or the reviewer acts only after the decision, conclude the review does NOT qualify and Article 11 obligations apply.
    - Decision profile → if "solely advertising" is "Yes", set triggers_significant_decision=false and explain Article 11 does not attach. Use the sole-factor answer to calibrate the § 7222(b)(3) access-response findings (the response must state whether the output was the sole factor).
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

    (j) SERVICE-PROVIDER CONTRACT GAPS → anchor to § 7051(a) IN ADDITION TO § 7221(n)(2). The missing contract terms (audit/testing rights, consumer-request assistance, ADMT opt-out propagation, appeal support, incident notification) are governed by § 7051(a) — in particular the requirement that the service provider assist the business in complying with its Article 11 ADMT obligations and the business's right to audit/test at least once every 12 months. Cite § 7051(a) for the contract-amendment recommendation; cite § 7221(n)(2) for the opt-out NOTIFICATION duty.

15. FRAMING — PENALTY EXPOSURE: When multiplying the per-violation figure ($2,663 unintentional / $7,988 intentional or minor-related) by a consumer count, label the result a "theoretical statutory maximum" (each affected consumer may count as a separate violation; no aggregate cap) and add a sentence noting that actual CCPA resolutions settle well below the ceiling. NEVER present the multiplied figure as expected or likely exposure.

16. INPUT-FIDELITY:
    - Echo the REGULATED ENTITY NAME in the report header and findings, not only the system name.
    - If the PROCESSING START DATE is not supplied in the intake, do NOT silently assume pre–January 1, 2026 operation. Surface the assumption explicitly wherever it drives the choice between the § 7155(b) deadline (Dec 31, 2027, for processing already underway) and the § 7155(a)(1) deadline (complete before initiating new or materially changed processing).
    - Continue flagging unanswered intake fields (sole-factor determination, denial basis, secure-transmission method, etc.) as gaps rather than inferring answers.

17. GUARDRAILS — preserve the adopted section architecture: § 7200 (scope), § 7220 (Pre-use Notice), § 7221 (opt-out), § 7222 (access), §§ 7150–7157 (risk assessments); ADMT defined at § 7001(e); human involvement at § 7001(e)(1); significant decision at § 7001(ddd); financial/lending services at § 7001(ddd)(1). Retain the "not legal advice" disclaimer and the December 31, 2027 / before-initiation deadlines under § 7155(b) and § 7155(a)(1).

18. CITATION ENGINE — DETERMINISTIC, NOT MODEL-AUTHORED (HARD RULE):
    The system now owns all "§"-formatted citations. You MUST NOT write any section number, any "§" symbol, any "11 CCR § 7xxx", or any subsection like "(b)(1)" in any output field — not in \`finding\`, not in \`remediation\`, not in \`enforcement_exposure\`, not in \`citation\`, not in \`summary\`, not anywhere. Refer to the provision only as "the cited provision" or by its plain-English element name. The template injects the canonical section string post-generation from a registry; any "§ 7xxx" you author will be stripped.
    Each item in \`notice_gaps\`, \`opt_out_gaps\`, \`access_gaps\`, and \`documentation_to_maintain\` MUST include an \`element_id\` chosen from this fixed checklist (no other ids are valid):
      • notice_gaps:    notice_purpose | notice_optout | notice_access | notice_antiretaliation | notice_howworks | notice_alternative_process | notice_trade_secret
      • opt_out_gaps:   optout_offer | optout_designated_methods | optout_account_barrier | optout_confirmation | optout_processing
      • access_gaps:    access_specific_purpose | access_logic | access_outcome_sole_factor | access_antiretaliation | access_trade_secret | access_timeline | access_secure_transmission | access_denial_basis | access_aggregate_log | access_verification
      • documentation_to_maintain: sp_contract_terms | ra_program | human_involvement | qualifies_admt | significant_decision | compliance_deadline
    Always set \`citation\` to the empty string "" — the template fills it from the registry. Do not omit the field; leave it as "".`;

    const ADMT_TOOL_MODULE: ToolModule = {
      identity:
        "You are a senior California privacy compliance attorney producing a formal ADMT compliance assessment under the CPPA final regulations (11 CCR Article 11, §§ 7200–7222). The compliance deadline for businesses already using ADMT is January 1, 2027 (11 CCR § 7200(b)).",
      citationFramework:
        "You author NO citations. Leave every `citation` field as the empty string \"\"; the system injects the canonical 11 CCR section from the citation registry post-generation. Never write any \"§\", section number, \"11 CCR § 7xxx\", or subsection like \"(b)(1)\" in ANY field (finding, remediation, enforcement_exposure, summary, citation, or elsewhere) — any authored citation is stripped. Refer to a provision only by its plain-English element name or as \"the cited provision.\"",
      outputMode: "strict-JSON",
      extraRules: ADMT_EXTRA_RULES,
    };

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
DECISION DOMAINS: ${(intake.decision_domains ?? []).join("; ")}${d.decision_domains_other ? ` — OTHER (described by business, assess against § 7001(ddd)): ${d.decision_domains_other}` : ""}
DECISION PROFILE: vendor/product: ${d.vendor_product || "(n/a)"}; hosting: ${d.hosting || "(n/a)"}; model type(s): ${(d.model_types ?? []).join(", ") || "(n/a)"}; decision effect(s): ${(d.decision_effects ?? []).join(", ") || "(n/a)"}; cadence: ${d.decision_cadence || "(n/a)"}; ADMT output is sole factor: ${d.sole_factor || "(not answered)"}; other factors: ${d.other_factors || "(n/a)"}; feeds future significant decisions: ${d.feeds_future_decisions || "(n/a)"}; solely advertising: ${d.solely_advertising || "(n/a)"}
HUMAN REVIEW: ${intake.human_review}
HUMAN-INVOLVEMENT SELF-TEST (§ 7001(e)(1)): reviewer present: ${d.hi_reviewer_present || "(not answered)"}; role: ${d.hi_reviewer_role || "(n/a)"}; stage: ${d.hi_stage || "(n/a)"}; (A) knows how to interpret output: ${d.hi_trained || "(n/a)"}; (B) reviews output + other info: ${d.hi_reviews_other_info || "(n/a)"}; (C) authority to change decision: ${d.hi_authority_override || "(n/a)"}; override rate: ${d.hi_override_rate || "(n/a)"}
TRAINS ADMT ON PI: ${intake.training_data_use}
PROFILING USE: ${intake.profiling_use}
THIRD-PARTY ADMT TOOLS IN USE: ${intake.third_party_admt || "(none disclosed)"}
VENDOR DILIGENCE: status: ${d.vendor_status || "(n/a)"}; documentation on file: ${(d.vendor_docs ?? []).join(", ") || "(none)"}; contract — audit rights: ${d.v_audit || "(n/a)"}, consumer-request assistance: ${d.v_assist || "(n/a)"}, opt-out propagation: ${d.v_optout || "(n/a)"}, appeal support: ${d.v_appeal || "(n/a)"}, incident notification: ${d.v_incident || "(n/a)"}; vendor makes ADMT available to other businesses: ${d.vendor_makes_available || "(n/a)"}; vendor training / model-improvement rights: ${d.vendor_training_rights || "(n/a)"}
NUMBER OF DISTINCT ADMT SYSTEMS THIS BUSINESS OPERATES: ${intake.admt_system_count || "(not specified — assume single system)"}
PRIOR ACCESS REQUESTS FROM THIS CONSUMER (ESTIMATED, 12-MONTH PERIOD): ${intake.prior_access_requests_12mo || "(not tracked)"}

PRE-USE NOTICE:
- Delivery method(s): ${(intake.notice_delivery ?? []).join("; ")}
- Has specific purpose statement: ${intake.notice_has_specific_purpose}
- Purpose text (verbatim from notice): ${intake.notice_purpose_text || "(not provided)"}
- Describes opt-out right: ${intake.notice_has_opt_out_desc}
- Describes access right: ${intake.notice_has_access_desc}
- Includes anti-retaliation statement: ${intake.notice_has_anti_retaliation}
- Explains how ADMT works: ${intake.notice_has_how_it_works}
- Describes alternative process for opt-out consumers: ${intake.notice_has_alternative_process}

OPT-OUT:
- Approach / exception claimed: ${intake.opt_out_exception}${d.opt_out_exception_other ? ` — business's own description (assess whether a § 7221(b) exception is established): ${d.opt_out_exception_other}` : ""}
- Opt-out methods provided: ${(intake.opt_out_methods ?? []).join("; ")}
- Opt-out link title: ${intake.opt_out_link_title || "(not provided)"}
- Not relying on cookie banner only: ${intake.opt_out_no_cookie_banner}
- No account creation required to opt out: ${intake.opt_out_no_account_required}
- Confirmation mechanism: ${intake.opt_out_confirmation_mechanism}
- Appeal process: ${intake.opt_out_appeal_process || "(not applicable)"}
- Fairness documentation: ${intake.opt_out_fairness_doc || "(not applicable)"}
- Validity & non-discrimination detail: protected characteristics tested: ${(d.bias_protected_chars ?? []).join(", ") || "(n/a)"}; proxy variables / mitigation: ${d.bias_proxy_vars || "(n/a)"}; testing cadence: ${d.bias_testing_cadence || "(n/a)"}; last test: ${d.bias_last_test || "(n/a)"}; next test: ${d.bias_next_test || "(n/a)"}; adverse-impact analysis: ${d.bias_adverse_impact || "(n/a)"}; outcome / FPR / FNR by group: ${d.bias_outcome_summary || "(n/a)"}
- Appeal mechanics: reviewer role: ${d.appeal_reviewer_role || "(n/a)"}; trained: ${d.appeal_trained || "(n/a)"}; authority to overturn: ${d.appeal_authority_overturn || "(n/a)"}; consumer may submit: ${(d.appeal_consumer_submit ?? []).join(", ") || "(n/a)"}; timeline: ${d.appeal_timeline || "(n/a)"}; outcomes: ${(d.appeal_outcomes ?? []).join(", ") || "(n/a)"}; reversal rate: ${d.appeal_reversal_rate || "(n/a)"}
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

REGULATION AUTHORITIES:
${authBlock}

COMPLIANCE DEADLINES:
${deadlineBlock}

Return this JSON structure exactly. Do not add fields not listed here. Do not omit required fields.
{
  "system_name": "${intake.system_name}",
  "compliance_deadline": "January 1, 2027",
  "overall_status": "compliant" | "gaps_identified" | "significant_gaps",

  "scope_analysis": {
    "is_admt": true | false,
    "is_admt_reasoning": "Cite the specific element(s) of the system description that do or do not satisfy 11 CCR § 7001(e). Quote relevant facts.",
    "triggers_significant_decision": true | false,
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
    "summary": "3-4 sentence plain-language scope conclusion that incorporates the reasoning above."
  },

  "consolidated_notice_analysis": {
    "applicable": true | false,
    "basis": "State which of the four § 7220(e) consolidation scenarios applies, if any: (1) one ADMT for multiple purposes; (2) multiple ADMTs for one purpose; (3) multiple ADMTs for multiple purposes; (4) systematic use of a single ADMT. Only mark applicable:true if the intake describes multiple ADMT systems OR multiple uses of a single ADMT that could be consolidated. If the business operates a single ADMT for a single purpose, mark applicable:false and explain why consolidation is irrelevant here.",
    "conditions_to_consolidate": "If applicable:true, list the mandatory conditions the consolidated notice must satisfy: it must include ALL required § 7220(c) elements for EACH ADMT system or use covered. Generic or combined descriptions that obscure individual system requirements do not satisfy this.",
    "consolidation_benefit": "If applicable:true, briefly describe the operational benefit (e.g., 'A single notice can cover both the credit scoring model and the fraud detection system, reducing notice delivery touchpoints from two to one').",
    "consolidation_risk": "If applicable:true, describe the compliance trap: a consolidated notice that omits required elements for any one system is non-compliant for that system. The business cannot use consolidation to simplify away disclosure obligations.",
    "recommendation": "One plain-language sentence: either 'Consolidation not applicable — single ADMT/single purpose detected' or 'Consolidation eligible — recommend reviewing § 7220(e) conditions with counsel before consolidating.'"
  },

  "enforcement_context": {
    "penalty_per_violation_unintentional": 2663,
    "penalty_per_violation_intentional": 7988,
    "penalty_statutory_basis": "Cal. Civ. Code § 1798.155(a) (2025-2026 CPI-adjusted figures)",
    "ca_consumer_count_provided": "${intake.ca_consumer_count || 'not provided'}",
    "aggregate_exposure_note": "Based on the gaps identified and the consumer volume provided (or noted as not provided), briefly describe the scale of potential exposure. Note that the CPPA may count each affected consumer as a separate violation. Do not cite specific enforcement actions or settlements unless they appear in the REGULATION AUTHORITIES block provided — if none do, omit that reference."
  },

  "notice_gaps": [
    {
      "element_id": "notice_purpose | notice_optout | notice_access | notice_antiretaliation | notice_howworks | notice_alternative_process | notice_trade_secret",
      "element": "Plain-English name of the element (no section number)",
      "status": "compliant" | "gap" | "missing",
      "finding": "Specific finding in plain language. Do NOT include any '§' or section number — refer to it as 'the cited provision'.",
      "citation": "",
      "remediation": "Specific action the business must take. No section numbers.",
      "enforcement_exposure": "Per-violation exposure if gap or missing. No section numbers."
    }
  ],

  "opt_out_gaps": [
    {
      "element_id": "optout_offer | optout_designated_methods | optout_account_barrier | optout_confirmation | optout_processing",
      "element": "Plain-English name of the element (no section number)",
      "status": "compliant" | "gap" | "missing",
      "finding": "Specific finding. For the 15-business-day operational process: if intake.opt_out_15_day_process was blank or '(not described)', flag this under optout_processing. No section numbers.",
      "citation": "",
      "remediation": "Specific action required. No section numbers.",
      "enforcement_exposure": "Per-violation exposure if gap or missing. No section numbers."
    }
  ],

  "access_gaps": [
    {
      "element_id": "access_specific_purpose | access_logic | access_outcome_sole_factor | access_antiretaliation | access_trade_secret | access_timeline | access_secure_transmission | access_denial_basis | access_aggregate_log | access_verification",
      "element": "Plain-English name of the element (no section number)",
      "status": "compliant" | "gap" | "missing",
      "finding": "Specific finding. No section numbers.",
      "citation": "",
      "remediation": "Specific action required. No section numbers.",
      "enforcement_exposure": "Per-violation exposure if gap or missing. No section numbers."
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
      "element_id": "sp_contract_terms | ra_program | human_involvement | qualifies_admt | significant_decision | compliance_deadline",
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
    "operational_note": "If applicable, recommend the business document which consumers have crossed the four-use threshold and maintain a per-consumer ADMT-use log to support the aggregate-response decision."
  },

  "priority_actions": [
    "Numbered action item with specific deadline where known. Based only on gaps identified above."
  ],

  "compliant_elements": ["List of elements assessed as compliant, with brief explanation."]
}`;

    let rawText: string;
    {
      const first = await callAnthropic(system, userPrompt, PRODUCT_MAX_OUTPUT_TOKENS, "gap-analysis");
      if (first.stopReason === "max_tokens") {
        console.warn(`[run-admt-checker] gap-analysis truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} — single retry`);
        const retry = await callAnthropic(system, userPrompt, PRODUCT_MAX_OUTPUT_TOKENS, "gap-analysis-retry");
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
        await supabase.from("cppa_assessments").update({
          status: "error",
          report_data: {
            error: "parse_failed",
            raw_head: rawText.slice(0, 400),
            raw_tail: rawText.slice(-400),
            retry_tail: strictRetry.text.slice(-400),
          },
        }).eq("id", assessment_id);
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

      // Scrub a few free-text places the model may slip a citation into.
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



    // ── PASS 2: Sample Language Drafting ─────────────────────────────────────
    // For every gap/missing item, generate ready-to-use draft language the user
    // can paste directly into their notice, opt-out mechanism, or access
    // right response. Uses the user's actual intake values so output is
    // specific — never generic. [BRACKETED PLACEHOLDERS] only for info the
    // business must supply themselves (URLs, contact emails, specific dates).
    // Non-fatal: if this call fails, the gap analysis result is still saved.

    const gapItems = [
      ...(report.notice_gaps ?? []).filter((i: any) => i.status !== "compliant").map((i: any) => ({ ...i, section: "notice" })),
      ...(report.opt_out_gaps ?? []).filter((i: any) => i.status !== "compliant").map((i: any) => ({ ...i, section: "opt_out" })),
      ...(report.access_gaps ?? []).filter((i: any) => i.status !== "compliant").map((i: any) => ({ ...i, section: "access" })),
    ];

    if (gapItems.length > 0) {
      try {
        const decisionDomain = (intake.decision_domains ?? []).join(", ");
        const systemName = intake.system_name ?? "the automated system";
        const purposeText = intake.notice_purpose_text || "";
        const systemDescription = intake.system_description ?? "";
        const humanReview = intake.human_review ?? "";
        const optOutMethods = (intake.opt_out_methods ?? []).join(" and ");
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
1. Use the business's ACTUAL system name, purpose, and decision domain — never write generic placeholders where real information was provided.
2. Use [BRACKETED PLACEHOLDERS] ONLY for information the business must supply that was not provided (e.g., [YOUR-WEBSITE.com/opt-out], [privacy@yourcompany.com]).
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

    await supabase.from("cppa_assessments").update({
      status: "complete",
      report_data: report,
      updated_at: new Date().toISOString(),
    }).eq("id", assessment_id);
    await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "cppa_assessments", sourceRowId: assessment_id });
   } catch (e) {
    console.error("[run-admt-checker] pipeline error:", e);
    await supabase.from("cppa_assessments").update({
      status: "error",
      report_data: { error: String(e) },
    }).eq("id", assessment_id);
    await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id } });
   }
  })());

  return json({ accepted: true, assessment_id }, 202);
});
