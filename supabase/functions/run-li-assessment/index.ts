// qb8 build active
// run-meter deploy-check v1
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3.8.0";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun, type FnRunHandle } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type ToolModule, type SystemBlock, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { renderGdprCitationBlock } from "../_shared/gdpr-registry.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { observeCitations } from "../_shared/citation-observe.ts";
import { verifyEdpb12024AgainstCorpus } from "../_shared/edpb-1-2024-consistency.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { detectTestStatesLeak } from "../_shared/cppa-test-states.ts";
import { renderSupplementalBlock } from "../_shared/supplemental-block.ts";



// Robustly parse a JSON object from an LLM response that may include
// code fences, prose preamble, or unescaped quotes/newlines inside strings.
function parseLlmJson(text: string): any | null {
  if (!text) return null;
  // Strip ```json fences if present
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Extract from first { to last }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      return JSON.parse(jsonrepair(cleaned));
    } catch (e) {
      console.error("[LIA] jsonrepair also failed:", e instanceof Error ? e.message : e);
      return null;
    }
  }
}


const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// L3 stage 2 (EDPB): fire-and-forget consistency warn between the
// hand-written EDPB_1_2024_AUTHORITY constant and edpb_guidelines rows.
// Runs once per warm instance; never blocks.
verifyEdpb12024AgainstCorpus(supabase).catch(() => {});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAnthropic(
  model: string,
  systemPrompt: string | SystemBlock[],
  userContent: string,
  maxTokens: number = 6000,
  timeoutMs: number = 720_000
): Promise<{ text: string; stopReason: string | null }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const stopReason: string | null = data.stop_reason ?? null;
  console.log(`[run-li-assessment] gen done stop=${stopReason} chars=${text.length}`);
  return { text, stopReason };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Modules (shared prompt core v2.2)
// ─────────────────────────────────────────────────────────────────────────────

const LIA_SHARED_CITATION_FRAMEWORK =
  "Cite Article 6(1)(f) GDPR/UK GDPR, EDPB Guidelines 1/2024 (three-step assessment in Section II — II.A 1st step: pursuit of a legitimate interest; II.B 2nd step: necessity; II.C 3rd step: balancing methodology; data-subject rights, incl. the right to object, in Section III), ICO LIA guidance, and applicable national DPA positions. Use ONLY the injected RESOLVED GDPR CITATIONS block for Article-6 legitimate-interest examples (direct marketing / intra-group / network-information security), for the recognised-LI basis where applicable, and for supervisory-authority names. Do NOT cite Article-6 examples or SA names from your own recollection.";

export const EDPB_1_2024_AUTHORITY = "EDPB GUIDELINES 1/2024 — SUPPLIED AUTHORITY EXCERPTS (cite these, and only these, as the guidelines' content): (1) Three cumulative conditions govern Article 6(1)(f): a legitimate interest, necessity, and the balancing of that interest against the interests or fundamental rights and freedoms of data subjects. (2) An interest qualifies as legitimate only where it is lawful, clearly and precisely articulated, and real and present — not speculative. (3) Impact assessment (para. 39): after identifying the fundamental rights and interests that may be affected, the controller should carefully assess the LIKELY impact of the processing on the data subject, covering the various ways individuals may be affected — positively or negatively, actually or potentially — as influenced by the nature of the data, the context of the processing, and its further consequences. (4) Data subjects' reasonable expectations play an important role in the balancing test (para. 52). (5) Under Article 21(1), 'compelling legitimate grounds' comprise only interests ESSENTIAL to the controller — such as protecting its organisation or systems from serious and imminent harm or from a severe penalty seriously affecting its business (para. 73) — assessed case by case against the specific objection. (6) Where the balancing tips against the controller, mitigating measures may be introduced and the balancing performed again; measures already legally required under the GDPR do not count as mitigating measures.";

const LIA_ANALYSIS_EXTRA_RULES = [

  "FACT DISCIPLINE — non-negotiable: Analyse ONLY the facts the controller actually stated. Do NOT introduce any specific diagnosis, disease, condition, technology, methodology, or named use case the controller did not write — for example, do not infer 'cancer', 'oncology', 'recurrence prediction', 'AI', 'machine learning', or 'model training' from a general description of research or data use. Do NOT make a vague description concrete by supplying a plausible specific example of it. Restate the controller's purpose and processing in their own terms, and characterise them no more specifically than they did. When the description is generic or vague, that vagueness is itself a finding: record it under risk_factors / open_questions (e.g. 'the stated purpose is described too generically to assess specificity under §2') rather than inventing a specific version to assess.",
  "CITATION ACCURACY RULES — non-negotiable:\n- ICO Royal Free / DeepMind: the enforcement decision was issued in 2017, NOT 2023. If you reference it, cite as 'ICO Royal Free / DeepMind enforcement decision (2017) and subsequent guidance' — never as '2023 Royal Free / DeepMind enforcement.'\n- EDPB Recommendations 01/2021 address supplementary measures for international data transfers post-Schrems II, not LIA necessity analysis. Do NOT cite EDPB Recommendations 01/2021 as authority for pseudonymisation in a necessity test. For pseudonymisation as a necessity/proportionality measure, cite EDPB Guidelines 1/2024 Section II.B (necessity of the processing), read together with the Article 5(1)(c) data-minimisation principle, as the primary source.\n- Do NOT invent enforcement years, fine amounts, or case names.",
  "EDPB STRUCTURE RULE — non-negotiable: EDPB Guidelines 1/2024 use Roman-numeral sections (I–IV) with lettered steps and continuous paragraph numbers — they do NOT contain sections numbered '§2', '§3', '§3.1', '§3.2', '§3.3', or '§4'. The three-step assessment is in Section II: II.A = 1st step (pursuit of a legitimate interest), II.B = 2nd step (necessity of the processing), II.C = 3rd step (balancing — the four-factor methodology; impact factors at II.C.2, reasonable expectations at II.C.3). Data-subject rights, including the right to object, are in Section III. Cite the step (II.A / II.B / II.C) or the paragraph number — NEVER an invented '§N' or '§N.N'.",
  "RECITAL/EXAMPLE CITATION RULE: Cite Article-6 legitimate-interest examples and the recognised-LI basis ONLY from the injected RESOLVED GDPR CITATIONS block. Do not author Article 6(11), Article 6(1)(ea), or Recital 47/48/49 references from memory; copy the form supplied in that block.",
  "DPO ROLE RULE — non-negotiable: The DPO's role under GDPR Articles 38–39 is to advise, inform, and monitor — NOT to approve or sign off on the controller's lawful basis decisions. NEVER use language such as 'DPO sign-off', 'DPO approval', 'DPO approves the LIA'. The correct formulation is always: 'DPO consulted and advice documented' or 'record of DPO consultation' or 'DPO involvement recorded per Article 38(1)'.",
  "ePRIVACY / PECR RULE: If the proposed processing involves cookies, device identifiers, advertising identifiers (GAID, IDFA), device fingerprints, SDKs, pixels, local storage, or any mechanism for storing or accessing information on a user's device, you MUST include the following as a risk factor: 'This GDPR Article 6(1)(f) analysis does not resolve ePrivacy obligations. Storing or accessing information on user devices requires a separate consent or exemption under the ePrivacy Directive (2002/58/EC, as amended by Directive 2009/136/EC) and, in the UK, PECR 2003. A valid GDPR lawful basis alone is not sufficient.'",
  "ADTECH PECR CROSS-REFERENCE RULE: If the sector is AdTech, Digital Media, advertising, or programmatic advertising AND device identifiers appear in the data categories, add to purpose_test.risk_factors verbatim: 'Note: ePrivacy Directive / UK PECR compliance for storage of or access to device identifiers (including SDK identifiers, mobile advertising IDs, and browser fingerprints) must be assessed separately — GDPR Article 6(1)(f) lawful basis does not satisfy PECR consent requirements.'",
  "PRECEDENT PROSE RULE: The precedent block tags each entry with a bracketed outcome marker like [REJECTED] for machine readability. NEVER reproduce these bracketed markers in your prose. Refer to precedents in natural language naming the deciding regulator. Never attribute an enforcement decision to the EDPB unless the entry's source is an EDPB Article 65 binding decision.",
  "INTAKE-FACT CONSISTENCY RULE: if the intake names the controller/organisation, use that name and NEVER state that the controller has not been named.",
  "MINES REGULATIONS CITATION RULE: When citing the Mines Regulations 2014, describe the duty as arrangements to know who is below ground and to respond to emergencies. Do not characterise it as requiring continuous location monitoring.",
  "HANDBOOK TRANSPARENCY RULE: If a handbook addendum is cited as a transparency mitigation, note in the same breath that a standalone worker notice is still expected.",
  "BALANCING-RECORD RULE: Do not duplicate balancing-record content: the 'Balancing Record — Must Include' list should reference, not restate, items already specified under the LIA documentation recommendation. Use UK employment terminology (trade union / elected worker representatives) rather than 'works council' unless the intake uses that term.",
  "CHILDREN'S CODE ATTRIBUTION RULE: The ICO Age Appropriate Design Code is a statutory code of practice issued under section 123 of the Data Protection Act 2018 — NOT under PECR. Always describe it as 'ICO statutory code of practice under DPA 2018 s.123 (Age Appropriate Design Code)'. Do NOT use the informal label 'Children's Code' on its own; either use 'Age Appropriate Design Code' or 'Age Appropriate Design Code (also known as the Children's Code)'.",
  "JURISDICTIONS_SCOPE CONSISTENCY RULE: The gdpr_meta.jurisdictions_scope array MUST include every jurisdiction whose law is actually applied in the analysis. If the assessment is conducted under UK GDPR (gdpr_meta.jurisdiction = 'uk'), include 'UK' in jurisdictions_scope — never list only ['EU','EEA'] when UK GDPR is the primary framework. Mirror the resolved-jurisdiction block in this field.",
  "SINGLE-FRAMEWORK PRESENTATION RULE: this assessment is conducted under exactly one framework — the resolved jurisdiction (UK GDPR or EU GDPR). Every narrative statement of scope must match the resolved jurisdictions_scope array exactly: never state that the assessment 'covers two jurisdictions' or 'treats both frameworks as applicable'. Where the intake lists jurisdictions beyond the resolved framework (e.g. intake lists EU and UK but the assessment resolves to UK GDPR), state once, in the classification section: 'The intake records both EU and UK jurisdictions. This assessment is conducted under [resolved framework]. The controller must separately confirm whether a parallel assessment under [the other framework] is required for that leg of the processing; reliance on Article 6(1)(f) for that leg is not established by this assessment.' — and thereafter analyse under the resolved framework only, citing the other framework solely in that flagged sentence.",
  "MANDATORY FIELDS: The 'verdict' field is REQUIRED in every test object (use 'uncertain' if unclear — never omit). When a verdict is 'uncertain', the test's open_questions array MUST name the SPECIFIC missing fact or determination that prevents a 'passes'/'fails' verdict (e.g. 'retention period not quantified', 'whether the opt-out applies to fraud-prevention is unstated') — never return 'uncertain' with an empty or generic open_questions array, as that leaves the user no action path. If every fact needed for a verdict is in fact present, render 'passes' or 'fails' with caveats in the analysis rather than defaulting to 'uncertain'. 'closest_accepted_precedent' and 'closest_rejected_precedent' MUST be non-empty strings; write 'None identified in current database' if no match.",
  "TIER FRAMING (annotations): Each enforcement precedent is tagged TIER 1/2/3. TIER 1 = in-regime (binding). TIER 2 = cross-channel persuasive (non-binding; expressly framed as such). TIER 3 = non-EU/UK supportive only (never cite as authority). Every annotation MUST include authority_tier matching the [E#] tag and authority_framing per the mapping: 1→in_regime, 2→persuasive_not_binding, 3→supportive_not_authoritative. UNVERIFIED rows: never state a fine amount.",
  "ARTICLE 21(1) IS A RIGHT TO OBJECT, NOT AN OPT-OUT MANDATE: do not assert that an opt-out mechanism is required, or that the controller has conflated analytics and fraud-prevention opt-outs, unless the intake states it. Article 21(1) confers a right to OBJECT, handled per request against any compelling legitimate grounds. Frame opt-out scope conditionally — e.g. \"IF the privacy-centre opt-out applies to fraud-prevention processing (not solely analytics), it risks misleading data subjects; the intake should clarify its scope\" — rather than asserting the defect exists.",
  "ARTICLE 21(1) APPLIES SYMMETRICALLY TO ALL ARTICLE 6(1)(f) PROCESSING: the Article 21(1) compelling-legitimate-grounds defence applies EQUALLY to every Article 6(1)(f) purpose — analytics AND fraud-prevention alike. On a valid objection the controller must cease processing UNLESS it can demonstrate compelling legitimate grounds that override the data subject's interests, rights and freedoms (or for the establishment, exercise or defence of legal claims). NEVER state or imply that objection to analytics (or any non-direct-marketing 6(1)(f) purpose) is \"unconditional\", \"absolute\", or must be \"honoured without requiring compelling grounds\"; and NEVER single out fraud-prevention as the only purpose carrying the compelling-grounds caveat. The ONE exception is direct marketing: under Article 21(2)–(3) an objection to processing for direct marketing is absolute and has no compelling-grounds defence — flag that only where the intake states the processing is for direct marketing. Describe preference/opt-out controls for analytics and fraud-prevention using the same standard: the controller assesses each objection on its merits and ceases processing unless compelling legitimate grounds are demonstrated.",
  "PECR / ePRIVACY IS NOT AN LIA BLOCKING ISSUE: ePrivacy Directive / UK PECR consent for storing or accessing device identifiers is a SEPARATE legal requirement that operates alongside the GDPR Article 6(1)(f) basis — it is not a defect in the legitimate-interests analysis and MUST NOT appear in blocking_issues (which are issues preventing the LIA verdict). Record it in documentation_recommendations, noting that PECR/ePrivacy consent is assessed independently of the GDPR lawful basis.",
  "SPECIFICITY, NOT SEPARATE DOCUMENTS: where processing covers multiple purposes (e.g. analytics and fraud prevention), EDPB Guidelines 1/2024 require each purpose's legitimate interest, necessity, and balancing to be ARTICULATED SPECIFICALLY within the assessment — they do NOT require a separate LIA document per purpose. Do NOT put in blocking_issues that the purposes 'must be separated into distinct legitimate interest assessments' as a precondition to relying on Article 6(1)(f). Instead frame it as: each purpose must be specifically articulated and balanced so that each independently satisfies the three-part test.",
  "NO DUPLICATION BETWEEN BLOCKING_ISSUES AND RISK_FACTORS: a deficiency severe enough to block reliance on Article 6(1)(f) belongs in blocking_issues. Do NOT also restate the same deficiency, in substantially the same words, in purpose_test.risk_factors or any other risk_factors array — that is redundant, not reinforcing. If a blocking issue has a related-but-distinct risk dimension worth noting separately (e.g. the blocking issue is 'purpose not articulated' and there's an ADDITIONAL, different risk like 'data subjects unlikely to expect this use'), state the additional dimension only — do not restate the blocking issue itself a second time under a different heading.",
  "NO DUPLICATION BETWEEN OPEN_QUESTIONS AND RISK_FACTORS: before adding an item to open_questions, check whether the same substantive point already appears in risk_factors for the same test stage. If it does, do not add a near-duplicate open question — either omit it, or, if a genuinely distinct question exists (e.g. the risk factor states a risk exists; the open question asks a specific unresolved fact needed to confirm it), phrase the open question to add new information rather than restating the risk factor as a question.",
  "NECESSITY TEST — NO VAGUE DURATION WORDS: do not describe a retention period as 'short' without stating a specific period per data category and purpose, or flagging the absence as an open item. 'Short' is not a documented necessity analysis; either state the actual period from the intake or flag: '[TO COMPLETE — specific retention period per data category and purpose].'",
  "CONSISTENT DATA-CATEGORY CAPITALISATION: once a data category name is introduced (e.g. 'account data'), use the same capitalisation and article usage every subsequent reference within the document — do not alternate between 'account data', 'the account data', and 'Account data' for the same category.",
  "MARK QUOTED VS PARAPHRASED PURPOSE TEXT: if a purpose statement is presented in quotation marks as if directly from the intake, it must be the exact intake wording. If it is a paraphrase or interpretation (e.g. bundling multiple stated purposes into one sentence), do not use quotation marks — write it as analysis: 'The stated purpose appears to bundle [X] and [Y] without separate articulation...' rather than presenting an interpretive paraphrase as a direct quotation.",
  "DO NOT ASSERT WHAT THE CONTROLLER HAS OR HASN'T DONE INTERNALLY: phrase gaps as properties of the assessment output, not as verified facts about the controller's internal state. Use 'the assessment does not reflect a quantified analysis of the probability or severity of this harm' rather than 'the controller has not quantified this harm' — the tool only sees what's in the output, not the controller's actual internal documentation.",
  "DO NOT CONFLATE ARTICLE 13 AND 14 TIMING FOR RIGHT TO OBJECT: Article 13 (data obtained directly from the subject) requires information provided 'at the time when personal data are obtained.' Article 14 (data NOT obtained directly) requires it 'at the latest at the time of first communication.' These are different triggers for different collection scenarios — do not use 'at the latest at the time of first communication' as if it were the universal standard; specify which article applies based on whether the data was obtained directly from the subject.",
  "PUBLIC-AUTHORITY STATUS IS A CLASSIFICATION FACT: whether the controller is a public authority is a threshold determination, not an open analytical question. Determine it in the classification section from the intake; if the intake does not state it, flag it there as missing intake data — do NOT leave \"Is [X] a public authority?\" sitting in open_questions.",
  "PRECEDENT SOURCES — DISTINGUISH REFERENCE FROM RETRIEVAL: closest_accepted_precedent and closest_rejected_precedent may draw on a reference precedent database distinct from the enforcement_precedents retrieval. When enforcement_precedents is empty but you cite a closest precedent, add a brief note that the closest precedent is drawn from the reference database and is illustrative — not a retrieved enforcement decision — so the empty retrieval and the cited precedent do not read as a contradiction.",
  "NECESSITY TEST RETENTION SPECIFICITY: where the necessity analysis discusses data minimisation, recommend that the organisation specify concrete retention periods per data category (not just assert that retention should be 'no longer than necessary') to strengthen the documented necessity analysis.",
  "ARTICLE 12(1) TRANSPARENCY STANDARD: When describing the GDPR transparency standard, do not use the unanchored phrase 'plain language accessible to data subjects' alone — cite the Article 12(1) standard precisely: 'in a concise, transparent, intelligible and easily accessible form, using clear and plain language (Article 12(1))'.",
  "GRAMMAR — READ TOGETHER WITH: Use 'read together with,' not 'reads together with,' when connecting two provisions in passive construction.",
  "EACH GAP IS DOCUMENTED ONCE: a single information gap (e.g. an unquantified retention period) is documented fully — governing provision, consequence for the assessment — in ONE place: blocking_issues where it blocks the determination, otherwise the single most relevant test. Where the same gap bears on other dimensions (purpose_test, necessity_test, or balancing_test risk_factors), those entries carry a one-line cross-reference ('See blocking issues: retention period unquantified') and never restate the full diagnosis, so one gap cannot read as several independent defects.",
  "REFERENCE CATEGORIES ARE NOT RETRIEVED DECISIONS: where a precedent entry is a synthesised reference category rather than a retrieved enforcement decision (the enforcement_precedents array is empty, or no on-point decision was retrieved), label it as such — e.g. 'Basic anti-abuse measures and platform account security (reference category)' — and never attach an authority or jurisdiction attribution such as '(EDPB, EU)' that could imply a specific matched decision. Keep the existing illustrative caveat alongside the label.",
  "ADJACENT REGIMES ARE STATED ONCE, OUTSIDE THE THREE TESTS: observations about separate compliance regimes that do not bear on the three-part test's own verdicts (e.g. ePrivacy/PECR consent for device storage or access) are recorded ONCE, in documentation_recommendations (per the PECR rule above) or the overall assessment narrative — NEVER inside purpose_test, necessity_test, or balancing_test risk_factors arrays, and NEVER in blocking_issues. Cross-reference from a test where relevant ('see documentation_recommendations: ePrivacy/PECR') instead of restating.",
  "REFERENCE-CATEGORY LABEL AND CAVEAT: every synthesised reference precedent carries the exact label suffix ' (reference category)' — no variants — AND an accompanying caveat sentence in this form: 'No directly analogous enforcement decision was retrieved; this category is a thematic grouping from the precedent reference database, not a cited case.' Never describe such an entry as merely 'illustrative' (which can read as invented), and never attach an authority or jurisdiction attribution that could imply a matched decision.",
  "MECHANISMS STATE THEIR RELATIONSHIP TO THE OBLIGATION: where a described control (e.g. preference settings) relates to a legal obligation under assessment (e.g. the Article 21(1) right to object), add one sentence stating the relationship explicitly — the control provides a mechanism for exercising the right, and its adequacy depends on [the named open question] — never leaving the reader unable to tell whether the control is being asserted as sufficient. Where DUAA-inserted UK GDPR provisions are cited, state their provenance and effective date ONLY as carried in the provided authority text; where the provided text does not carry provenance, cite the provision without asserting dates from memory.",
  "REPEATED CONTENT APPEARS ONCE: an open question, gap statement, or fill-in placeholder appears exactly ONCE in the document, in its single most relevant field; every other field that needs it carries a short cross-reference ('see information_needed[3]' / 'see necessity_test.risk_factors[0]') and never restates the text. A retention placeholder repeated verbatim in a risk factor and a blocking issue, or an opt-out scope question repeated across information_needed and documentation_recommendations, is a defect.",
  "CAVEATS MATCH THE DOCUMENT: the no-matching-precedents note states only what is true of THIS output. Where no specific enforcement decisions are cited anywhere in the analysis (all references are labelled reference categories), the note is simply: 'No enforcement decisions matching this jurisdiction and processing theory were retrieved from the precedent database; the precedent references above are database reference categories, not cited cases.' Never include the sentence warning that 'the analysis above may reference relevant decisions that are not yet indexed' when the analysis cites no decisions.",
  "OUTPUT-ABSENCE, NOT CONTROLLER-FAILURE: the assessment sees the intake and its own output — it does not see the controller's files. Where information is missing, say what the OUTPUT or the INTAKE does not present ('no specific retention period is stated in the intake'; 'the documented basis for preferring full retention is not presented in the record provided') — never that the controller 'has not documented', 'failed to record', or acted 'in the controller's own words' or otherwise, which asserts facts about materials the assessment has not seen. Where the intake affirmatively answers a question (a populated field, including 'No'), that answer RESOLVES the question — describe it as answered, not as undocumented. This register extends to characterising formulations: never critique the quality of a formulation the assessment was not shown ('a bundled or generic formulation does not meet this standard') — state the provision's precision requirement and that the intake supplied to this assessment does not present the articulation, and stop.",
  "STATE THE PROVISION, DON'T GRADE PROSPECTIVE SUFFICIENCY: where a transparency or documentation requirement is engaged (e.g. Article 13(1) UK GDPR), state what the provision requires and what the record must contain — never instruct that language must be 'clear and specific enough to satisfy' the provision, which grades a future artefact's legal sufficiency. Correct form: 'the scope must be communicated to data subjects in the transparency statement; Article 13(1) UK GDPR requires the information provided to be concise, transparent, intelligible, and easily accessible.'",
  EDPB_1_2024_AUTHORITY,
  "EDPB 1/2024 IS CITED FROM THE SUPPLIED EXCERPTS ONLY: every statement of what EDPB Guidelines 1/2024 require must be supported by the SUPPLIED AUTHORITY EXCERPTS block, cited with the paragraph number where the block carries one; where the block does not cover a point, state the requirement generically ('the balancing record should document…') without attributing it to a specific guidelines section from memory.",
  "EDPB CLAIMS QUOTE THE SUPPLIED EXCERPT: any statement that EDPB Guidelines 1/2024 'require' something must quote the relevant SUPPLIED AUTHORITY EXCERPTS text (e.g. the excerpt stating an interest must be 'clearly and precisely articulated') or be phrased as VERIFY-FIRST. A bare 'Section II.A requires…' assertion without the excerpt text is a defect under the citation rules.",
   "LIKELY IMPACT, NOT QUANTIFIED IMPACT: the guidelines require a careful assessment of the likely impact of processing (para. 39) — a qualitative standard covering nature, context, and consequences. Never state that the guidelines require a QUANTIFIED analysis of probability or severity, and never treat the absence of quantification as, by itself, a deficiency. Where quantification would strengthen the record, frame it as strengthening ('a quantified estimate would strengthen the documented balancing record'), never as a guidelines requirement.",
   "FLAG THE ABSENCE, DO NOT PERFORM THE OPERATIONAL ANALYSIS (QL2-FIX-1 Item 7.1): where the intake omits operational reasoning that the necessity or balancing test requires from the controller — e.g. why aggregate or anonymised signals would be insufficient for the stated purpose, why a less-intrusive alternative was rejected, why a shorter retention period would not meet the operational need — the assessment FLAGS the absence and directs the controller to document it, and it stops. It does NOT invent or infer the missing operational analysis on the controller's behalf ('presumably aggregate signals would not suffice because …' is a fatal defect). Canonical form: 'The record supplied to this assessment does not present the controller's operational reasoning for [the specific point]; document that reasoning in the balancing record before relying on legitimate interests for this processing.' This rule is a specific application of OUTPUT-ABSENCE, NOT CONTROLLER-FAILURE and NO EXPLANATORY / GENERATOR-REASONING VOICE — the assessment characterises what the record does not present and identifies what the controller must document, without supplying the controller's answer.",
   "TEST-STATES ARE BINDING (R1b2 rule 2a): the injected TEST-STATES block records the deterministic state of each mechanical determination (M1 relationship_declared, M2 jurisdictions_declared, M3 data_categories_declared, M4 special_category_flag, M5 vulnerable_subjects_declared, M6 alternatives_considered, M7 safeguards_declared, M8 opt_out_mechanism_present, M9 reasonable_expectation_answered, M10 potential_harm_answered, M11 employment_context). Any test whose state is RESOLVED — resolved_met, resolved_not_met, or resolved_not_applicable — is stated as concluded in the report with the basis given; NEVER hedge it, NEVER emit an information_needed entry that re-asks the intake field the state was computed from (e.g. do NOT ask for 'alternatives_considered' when M6 is RESOLVED_MET), and NEVER contradict it in test prose (e.g. do NOT ask the controller to 'confirm whether special-category data is in scope' when M4 is RESOLVED_MET or RESOLVED_NOT_MET). INDETERMINATE tests use insufficient-basis language anchored to the specific missing intake key. Argument-strength, verdict, and framework/regime remain JUDGMENT calls per the existing rules — no mechanical test binds them in this tool.",
    "PROPORTIONATE ASKS (R1b2 rule 2b): (i) ASK CLASSES — classify every surfaced item as verdict-blocking, record-completeness, or enhancement. Verdict-blocking items belong in overall_assessment.blocking_issues with the cited provision they block; record-completeness items belong in information_needed with the intake field key and the provision that makes the missing dimension relevant; enhancement items — model-observed depth improvements that no cited provision requires — belong in documentation_recommendations prose ONLY when tied to a cited standard (e.g. Article 5(2) accountability, EDPB Guidelines 1/2024 balancing-record documentation) and NEVER as an open_question or information_needed entry. (ii) CREDIT-FIRST — where the intake supplies a partial answer (e.g. safeguards[] populated but retention period unquantified), name what the intake establishes BEFORE the residual; the residual is incremental and NEVER re-requests content the intake already supplies. (iii) BANNED COLLAPSE — the phrases 'cannot be determined', 'no basis to assess', and 'not established' may NOT be applied to a whole test where the intake supplies the enum/presence answers the test binds to; where a specific missing piece IS verdict-blocking, name that element rather than collapsing the whole test.",
    "TEST-STATES ARE INTERNAL VOCABULARY (leg-(b) 2026-07-11): the TEST-STATES machinery is internal — its tokens NEVER appear in any user-facing field. Do NOT emit the literal string 'TEST-STATES', the test ids (M1, M6, M9, …), or the state tokens (resolved, resolved_met, resolved_not_met, RESOLVED_MET, INDETERMINATE, CANDIDATE) anywhere in test analyses, strength_basis, blocking_issues, information_needed, documentation_recommendations, or any other user-visible output. State the conclusion with its factual basis instead — e.g. 'the intake records four alternatives considered before selecting legitimate interests as the basis' — never '(M6 resolved met)' or 'per TEST-STATES M6'. Inline parentheticals like '(M1 resolved)' are the exact defect this rule bans. Same philosophy as NO SYSTEM-ROUTING VOICE.",
].join("\n\n");

// ─────────────────────────────────────────────────────────────────────────────
// R1b2 — deterministic TEST-STATES for the LIA generator.
// Computed from the LIA intake shape produced by src/pages/LIAssessmentIntake.tsx.
// Applicability, argument_strength, verdict, and regime remain JUDGMENT per the
// existing SINGLE-FRAMEWORK / MANDATORY FIELDS / balancing rules.
// ─────────────────────────────────────────────────────────────────────────────
type LiaTestState = "resolved_met" | "resolved_not_met" | "resolved_not_applicable" | "indeterminate";
interface LiaTestStateEntry {
  state: LiaTestState;
  basis: string;
  source_fields: string[];
}

export function computeLiaTestStates(row: Record<string, any> | null | undefined): Record<string, LiaTestStateEntry> {
  const r = row ?? {};
  const balancing = (r.balancing_details ?? {}) as Record<string, any>;
  const necessity = (r.necessity_details ?? {}) as Record<string, any>;
  const out: Record<string, LiaTestStateEntry> = {};

  const relationship = String(r.relationship_type ?? "").trim();
  out.M1 = relationship
    ? { state: "resolved_met", basis: `intake declares relationship_type "${relationship.slice(0, 60)}"`, source_fields: ["relationship_type"] }
    : { state: "indeterminate", basis: "relationship_type is empty", source_fields: ["relationship_type"] };

  const jurisdictions: string[] = Array.isArray(r.jurisdictions) ? r.jurisdictions : [];
  out.M2 = jurisdictions.length
    ? { state: "resolved_met", basis: `intake declares jurisdictions ${JSON.stringify(jurisdictions)}`, source_fields: ["jurisdictions"] }
    : { state: "indeterminate", basis: "jurisdictions is empty", source_fields: ["jurisdictions"] };

  const dataCats: string[] = Array.isArray(r.data_categories) ? r.data_categories : [];
  out.M3 = dataCats.length
    ? { state: "resolved_met", basis: `intake declares data_categories ${JSON.stringify(dataCats)}`, source_fields: ["data_categories"] }
    : { state: "indeterminate", basis: "data_categories is empty", source_fields: ["data_categories"] };

  const scdRaw = balancing.special_category_data;
  out.M4 = typeof scdRaw === "boolean"
    ? (scdRaw
        ? { state: "resolved_met", basis: "balancing_details.special_category_data = true (Article 9 in scope)", source_fields: ["balancing_details.special_category_data"] }
        : { state: "resolved_not_met", basis: "balancing_details.special_category_data = false (Article 9 not engaged)", source_fields: ["balancing_details.special_category_data"] })
    : { state: "indeterminate", basis: "balancing_details.special_category_data is not set", source_fields: ["balancing_details.special_category_data"] };

  const vuln: string[] = Array.isArray(balancing.vulnerable_subjects) ? balancing.vulnerable_subjects : [];
  const vulnActive = vuln.filter((v) => v && v !== "None");
  out.M5 = vuln.length === 0
    ? { state: "indeterminate", basis: "balancing_details.vulnerable_subjects is not answered", source_fields: ["balancing_details.vulnerable_subjects"] }
    : (vulnActive.length
        ? { state: "resolved_met", basis: `intake declares vulnerable groups ${JSON.stringify(vulnActive)}`, source_fields: ["balancing_details.vulnerable_subjects"] }
        : { state: "resolved_not_met", basis: "intake declares no vulnerable groups (\"None\")", source_fields: ["balancing_details.vulnerable_subjects"] });

  const alternatives = String(necessity.alternatives ?? r.alternatives_considered ?? "").trim();
  out.M6 = alternatives
    ? { state: "resolved_met", basis: `intake supplies alternatives_considered ("${alternatives.slice(0, 80)}")`, source_fields: ["alternatives_considered", "necessity_details.alternatives"] }
    : { state: "indeterminate", basis: "alternatives_considered is empty", source_fields: ["alternatives_considered", "necessity_details.alternatives"] };

  const safeguards: string[] = Array.isArray(balancing.safeguards) ? balancing.safeguards : [];
  out.M7 = safeguards.length
    ? { state: "resolved_met", basis: `intake declares safeguards ${JSON.stringify(safeguards)}`, source_fields: ["balancing_details.safeguards"] }
    : { state: "indeterminate", basis: "balancing_details.safeguards is empty", source_fields: ["balancing_details.safeguards"] };

  const optOut = String(balancing.opt_out_mechanism ?? "").trim();
  out.M8 = optOut
    ? { state: "resolved_met", basis: `intake describes opt_out_mechanism ("${optOut.slice(0, 80)}")`, source_fields: ["balancing_details.opt_out_mechanism"] }
    : { state: "indeterminate", basis: "balancing_details.opt_out_mechanism is empty", source_fields: ["balancing_details.opt_out_mechanism"] };

  const re = String(balancing.reasonable_expectation ?? "").trim();
  out.M9 = re
    ? { state: "resolved_met", basis: `intake supplies reasonable_expectation ("${re.slice(0, 60)}")`, source_fields: ["balancing_details.reasonable_expectation"] }
    : { state: "indeterminate", basis: "balancing_details.reasonable_expectation is empty", source_fields: ["balancing_details.reasonable_expectation"] };

  const harm = String(balancing.potential_harm ?? "").trim();
  out.M10 = harm
    ? { state: "resolved_met", basis: `intake supplies potential_harm ("${harm.slice(0, 60)}")`, source_fields: ["balancing_details.potential_harm"] }
    : { state: "indeterminate", basis: "balancing_details.potential_harm is empty", source_fields: ["balancing_details.potential_harm"] };

  const empIndicators = relationship.toLowerCase();
  out.M11 = /employee|worker|staff|applicant/i.test(empIndicators)
    ? { state: "resolved_met", basis: `relationship_type indicates employment context ("${relationship.slice(0, 60)}")`, source_fields: ["relationship_type"] }
    : (relationship
        ? { state: "resolved_not_met", basis: `relationship_type "${relationship.slice(0, 60)}" does not indicate employment context`, source_fields: ["relationship_type"] }
        : { state: "indeterminate", basis: "relationship_type is empty", source_fields: ["relationship_type"] });

  return out;
}

export function renderLiaTestStatesBlock(states: Record<string, LiaTestStateEntry>): string {
  const lines: string[] = [];
  lines.push("TEST-STATES (deterministic — computed from the intake). A test whose state is RESOLVED (met / not met / not applicable) is BINDING per rule 2a: state its conclusion with the basis given, do NOT hedge, do NOT emit an information_needed / open_questions entry re-asking for the intake field it was computed from, and do NOT contradict it in prose. INDETERMINATE tests use insufficient-basis language anchored to the named source field.");
  for (const id of Object.keys(states)) {
    const e = states[id];
    lines.push(`- ${id} state=${e.state} basis="${e.basis}" source_fields=${JSON.stringify(e.source_fields)}`);
  }
  return lines.join("\n");
}



const LIA_ANALYSIS_TOOL_MODULE: ToolModule = {
  identity:
    "You are a senior privacy regulatory analyst producing a formal legitimate interest assessment under GDPR / UK GDPR, applying the EDPB Guidelines 1/2024 three-part test (purpose, necessity, balancing) to the specific facts provided.",
  citationFramework: LIA_SHARED_CITATION_FRAMEWORK,
  outputMode: "strict-JSON",
  extraRules: LIA_ANALYSIS_EXTRA_RULES,
  languageVariant: "jurisdiction-conditional",
};

const LIA_CLASSIFY_TOOL_MODULE: ToolModule = {
  identity:
    "You are a privacy regulatory analyst classifying processing activities for legitimate interest analysis.",
  citationFramework: LIA_SHARED_CITATION_FRAMEWORK,
  outputMode: "strict-JSON",
  languageVariant: "jurisdiction-conditional",
};

const LIA_DOCS_TOOL_MODULE: ToolModule = {
  identity:
    "You are a privacy regulatory analyst producing practical documentation guidance for a legitimate interest assessment. Focus on what documentation would make this LIA defensible.",
  citationFramework: LIA_SHARED_CITATION_FRAMEWORK,
  outputMode: "strict-JSON",
  languageVariant: "jurisdiction-conditional",
  extraRules: [
    "FACT DISCIPLINE: Describe the processing only as generically or specifically as the controller and the analysis actually did. Do NOT introduce any diagnosis, condition, technology, or use case (e.g. 'cancer', 'AI model training') that does not appear in the processing activity or the analysis you were given.",
    "CITATION FORM: Cite regulatory instruments by name and provision in general terms only (e.g. 'GDPR Article 35 and EDPB Guidelines on DPIA'). Do NOT cite specific enforcement case names, fine amounts, or decision dates — those are only available in Stage 2. If unsure of a specific provision number, describe the obligation in plain language.",
    "DPO ROLE RULE: Articles 38–39 assign the DPO an advisory/monitoring role — not approval. NEVER use 'DPO sign-off' or 'DPO approval'. Always use 'DPO consulted and advice documented' or 'record of DPO consultation under Article 38(1)'.",
    "ARTICLE 36 CHAIN RULE: GDPR Article 36 prior consultation is triggered by a DPIA identifying residual high risk AFTER mitigation — not a routine LIA output. If you reference it, make the chain explicit (LIA → DPIA under Art. 35 → residual-risk assessment → Art. 36 only if high residual risk remains).",
  ].join("\n\n"),
};


export { LIA_ANALYSIS_TOOL_MODULE, LIA_CLASSIFY_TOOL_MODULE, LIA_DOCS_TOOL_MODULE };


// Heavy generation work. Returns when the row has been finalised (status=ready
// or status=failed). Invoked via EdgeRuntime.waitUntil so we can return 202 to
// the caller immediately and avoid the 150s HTTP idle-timeout — generation
// regularly runs 60–120s and an awaited HTTP response can be cut off by the
// platform even though the row eventually finishes.
async function generateAssessment(assessment_id: string, assessment: any, fnRun: FnRunHandle): Promise<void> {
  try {
    await runAssessment(assessment_id, assessment);
    await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "li_assessments", sourceRowId: assessment_id });
  } catch (e) {
    console.error("run-li-assessment background error:", e);
    await lifecycleUpdate(supabase, "li_assessments", assessment_id, { status: "failed" }, { fn: "run-li-assessment", phase: "background_catch" });
    await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id } });
  }
}

// QB9-3(a): information_needed is emitted once, at the top level only.
function dedupeInformationNeeded(report: any): any {
  try {
    const top = Array.isArray(report?.information_needed) ? report.information_needed : [];
    const nested = Array.isArray(report?.three_part_test?.information_needed)
      ? report.three_part_test.information_needed : [];
    if (nested.length) {
      const seen = new Set(top.map((s: any) => String(s).trim()));
      for (const item of nested) {
        if (!seen.has(String(item).trim())) top.push(item);
      }
      report.information_needed = top;
      delete report.three_part_test.information_needed;
    }
  } catch (e) {
    console.error("[LIA] QB9-3(a) dedupe errored:", e);
  }
  return report;
}

// QB9-3(b): a reference-category label may not appear without its caveat sentence.
const REFERENCE_CATEGORY_CAVEAT = "Reference-category note: no directly analogous enforcement decision was retrieved; this category is a thematic grouping from the precedent reference database, not a cited case.";
function ensureReferenceCategoryCaveat(report: any): any {
  try {
    const doc = JSON.stringify(report);
    if (/reference categor/i.test(doc) && !doc.includes("not a cited case")) {
      const oa = report?.overall_assessment;
      if (oa && typeof oa === "object") {
        oa.reference_category_caveat = REFERENCE_CATEGORY_CAVEAT;
        console.warn("[LIA] QB9-3(b): reference-category label present without caveat — caveat injected into overall_assessment");
      }
    }
  } catch (e) {
    console.error("[LIA] QB9-3(b) caveat guard errored:", e);
  }
  return report;
}


Deno.serve(async (req) => {
  console.log(`[qb9] run-li-assessment build active · core=${PROMPT_CORE_VERSION}`);
  console.log("[run-li-assessment] qb7 qb7r build active");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { assessment_id } = await req.json();
    if (!assessment_id) {
      return new Response(JSON.stringify({ error: "assessment_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ent = await requireEntitlement(caller, "li_assessment", { rowId: assessment_id });
    if (!ent.ok) {
      console.log(JSON.stringify({ evt: "entitlement_denied", fn: "run-li-assessment", reason: ent.reason }));
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: ent.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: assessment, error: fetchErr } = await supabase
      .from("li_assessments")
      .select("*")
      .eq("id", assessment_id)
      .single();

    if (fetchErr || !assessment) {
      return new Response(JSON.stringify({ error: "Assessment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const procWrite = await lifecycleUpdate(supabase, "li_assessments", assessment_id, { status: "processing" }, { fn: "run-li-assessment", phase: "pre_generation" });
    if (!procWrite.ok) {
      return new Response(JSON.stringify({ error: "lifecycle_write_failed", message: procWrite.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fnRun = await startFunctionRun(supabase, "run-li-assessment", {
      archetype: "background",
      trustClass: "user",
      userId: caller.internal ? (assessment.user_id ?? null) : caller.userId,
      invokedBy: caller.internal ? "internal" : "user",
      metadata: { assessment_id },
    });

    // Kick off heavy work in the background; respond immediately so the
    // caller's HTTP request doesn't sit open for 60–120s and trip the 150s
    // idle-timeout. All client callers (webhook, admin harness, result page)
    // already poll the li_assessments row for status.
    // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
    EdgeRuntime.waitUntil(generateAssessment(assessment_id, assessment, fnRun));

    return new Response(
      JSON.stringify({ success: true, assessment_id, status: "processing" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("run-li-assessment dispatch error:", e);
    return new Response(JSON.stringify({ error: "Failed to start assessment." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Heavy generation logic (previously inline in Deno.serve). Moved verbatim so
// it can run under EdgeRuntime.waitUntil after we respond to the caller.
// ─────────────────────────────────────────────────────────────────────────────
async function runAssessment(assessment_id: string, assessment: any): Promise<void> {
  try {


    // ── STAGE 1: Classify use case ──
    const t1Start = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    // Determine jurisdiction for GDPR authority retrieval (UK if any verified
    // assessment.jurisdictions value matches /united kingdom|uk|gb/i, else EU).
    const liaJurisdictions: string[] = Array.isArray(assessment.jurisdictions) ? assessment.jurisdictions : [];
    const isUk = liaJurisdictions.some((j: string) => /united kingdom|uk|gb/i.test(String(j)));
    const isEu = liaJurisdictions.some((j: string) => /eu|gdpr|european/i.test(String(j))) && !isUk;
    const gdprJurisdiction: "eu" | "uk" = isUk ? "uk" : "eu";
    // Regime gates which enforcement precedents the LIA may cite. UK runs only
    // see UK GDPR / DPA 2018; EU runs only see EU/EEA GDPR enforcement.
    const enforcementRegime: "gdpr" | "uk_gdpr" = isUk ? "uk_gdpr" : "gdpr";
    // Defensive guard: GDPR tools must never query the California corpus.
    if (enforcementRegime !== "gdpr" && enforcementRegime !== "uk_gdpr") {
      throw new Error(`[LIA] invalid enforcementRegime '${enforcementRegime}' — must be 'gdpr' or 'uk_gdpr'`);
    }
    const regimeLabel = isUk ? "UK GDPR" : "EU GDPR";

    const classifySystemBlocks = buildSystemContent({
      toolModule: LIA_CLASSIFY_TOOL_MODULE,
      currentDate: today,
    });

    // Run classification, enforcement context fetch, and GDPR authority retrieval in parallel
    const [classifyResult, enforcementCtxResult, gdprCtxResult] = await Promise.all([
      callAnthropic(
        "claude-haiku-4-5-20251001",
        classifySystemBlocks,
        `Classify this processing activity for legitimate interest analysis:\nOrganisation (controller) being assessed: ${assessment.organization_name || "not specified"}\nDescription: ${assessment.processing_description}\nData categories: ${(assessment.data_categories || []).join(", ")}\nRelationship type: ${assessment.relationship_type || "not specified"}\nSector: ${assessment.sector || "not specified"}\n\nReturn JSON:\n{\n  "use_case_category": "one of: direct_marketing | fraud_prevention | employee_monitoring | behavioral_advertising | research_analytics | it_security | contractual_administration | other",\n  "primary_data_categories": ["list of data categories involved"],\n  "special_category_data": true or false,\n  "relationship_exists": true or false,\n  "jurisdictions_scope": ["list of relevant jurisdictions"]\n}`,
        500
      ),

      supabase.functions.invoke("get-enforcement-context", {
        body: {
          tool: "LIA",
          data_categories: assessment.data_categories || [],
          jurisdictions: liaJurisdictions,
          sector: assessment.sector || undefined,
          articles: ["gdpr:6"],
          regime: enforcementRegime,
          limit: 5,
        },
      }).catch((e: Error) => { console.error("get-enforcement-context failed (non-fatal):", e); return { data: null }; }),
      getGdprContext(supabase as any, {
        // Extend beyond Art. 6: LIA reasoning routinely cites Art. 5 (principles,
        // esp. 5(1)(a) fairness/lawfulness/transparency) and Art. 21 (right to
        // object) — inject verbatim so the lint supply reflects what the model
        // actually receives.
        articles: ["6", "5", "21"],
        jurisdiction: gdprJurisdiction,
        recitals: [47],
        guidelineArticles: ["6"],
        semanticQuery: assessment.processing_description || "",
      }).catch((e: Error) => { console.error("getGdprContext failed (non-fatal):", e); return { block: "", meta: { attempted: false, error: String(e).slice(0, 200) } as any }; })
    ]);
    console.log(`[LIA] stage=1 classify+context elapsed=${Date.now() - t1Start}ms`);

    const classifyText = classifyResult.text;
    let classification: any = {};
    try {
      const m = classifyText.match(/\{[\s\S]*\}/);
      if (m) classification = JSON.parse(m[0]);
    } catch { classification = { use_case_category: "other" }; }

    let enforcementPrecedents: any[] = [];
    let enforcementMeta: any = { attempted: false };
    try {
      const ctx = (enforcementCtxResult as any)?.data;
      enforcementPrecedents = (ctx?.results || []).slice(0, 5);
      if (ctx) {
        const descParts: string[] = [];
        if (assessment.sector) descParts.push(`${assessment.sector} sector`);
        if ((assessment.jurisdictions || []).length) descParts.push(`processing in ${(assessment.jurisdictions || []).join(", ")}`);
        enforcementMeta = {
          attempted: true,
          total_matched: typeof ctx.total_matched === "number" ? ctx.total_matched : null,
          query_descriptor: descParts.join(" — ") || undefined,
        };
      }
    } catch { /* non-fatal */ }

    // Build a quick id → row map for downstream validation
    const precedentById: Record<string, any> = {};
    for (const r of enforcementPrecedents) { if (r?.id) precedentById[r.id] = r; }

    const tierTagFor = (r: any): string => {
      const t = r?.authority_tier;
      if (t === 1) return `TIER 1 — ${regimeLabel}`;
      if (t === 2) return enforcementRegime === "uk_gdpr"
        ? "TIER 2 — EU persuasive"
        : "TIER 2 — UK persuasive";
      if (t === 3) return "TIER 3 — non-EU/UK supportive only";
      return "TIER ?";
    };

    const enforcementContextStr = enforcementPrecedents.length > 0
      ? enforcementPrecedents.map((r: any, i: number) => {
          const provs = Array.isArray(r.statutory_provisions) && r.statutory_provisions.length
            ? ` — citing ${r.statutory_provisions.join(", ")}` : "";
          const tier = tierTagFor(r);
          const fineUnverified = r.fine_verified === false;
          const verifiedTag = (r.verified === false || fineUnverified) ? " | UNVERIFIED — omit fine" : "";
          const fine = (r.verified === false || fineUnverified)
            ? "—"
            : (r.fine_eur_equivalent ? `€${Number(r.fine_eur_equivalent).toLocaleString()}` : "n/a");
          return `[E${i + 1} | ${tier}${verifiedTag}] id:${r.id} ${r.subject || "Unnamed"} — ${r.regulator} (${r.jurisdiction}, ${r.decision_date || "n.d."}) — Fine: ${fine} — Failure: ${r.key_compliance_failure || r.violation || "n/a"}${provs}`;
        }).join("\n")
      : "No directly analogous enforcement precedents retrieved.";

    // Unpack GDPR authority context from the parallel call
    const gdprBlock: string = (gdprCtxResult as any)?.block || "";
    const gdprMeta: any = (gdprCtxResult as any)?.meta || { attempted: false };

    // Open-queue #5 — deterministically reconcile the model-emitted
    // classification.jurisdictions_scope with the RESOLVED jurisdiction so the
    // report never presents a framework that was not actually applied. The GDPR
    // context resolver returns jurisdiction strictly as "eu" | "uk"; a UK
    // assessment may cite retained-EU-law equivalents but is a single-framework
    // UK GDPR analysis, not a separate EU GDPR application.
    {
      const resolvedJur = String(gdprMeta?.jurisdiction || "").toLowerCase();
      const reconciledScope =
        resolvedJur === "uk" ? ["UK"] :
        resolvedJur === "eu" ? ["EU", "EEA"] : null;
      if (reconciledScope) {
        classification.jurisdictions_scope = reconciledScope;
        gdprMeta.jurisdictions_scope = reconciledScope;
      }
    }

    // Fetch precedents from li_tracker_entries
    const { data: allPrecedents } = await supabase
      .from("li_tracker_entries")
      .select("*")
      .order("last_confirmed", { ascending: false })
      .limit(80);

    const precedents = (allPrecedents || []).filter((p: any) => {
      const activity = (p.processing_activity || "").toLowerCase();
      const cat = classification.use_case_category || "";
      const keywords: Record<string, string[]> = {
        direct_marketing: ["marketing", "advertising", "promotional", "newsletter"],
        fraud_prevention: ["fraud", "security", "risk", "prevention"],
        employee_monitoring: ["employee", "worker", "workplace", "monitoring"],
        behavioral_advertising: ["behavioral", "tracking", "advertising", "targeting"],
        research_analytics: ["research", "analytics", "statistics", "profiling"],
        it_security: ["security", "network", "it ", "technical", "system"],
        contractual_administration: ["contract", "administration", "service", "customer"],
      };
      const cats = keywords[cat] || [];
      return cats.some(k => activity.includes(k));
    }).slice(0, 15);

    const precedentContext = precedents.length > 0
      ? precedents.map((p: any) =>
          `[${p.outcome?.toUpperCase() || "UNKNOWN"}] ${p.processing_activity} (${p.dpa_source}, ${p.jurisdiction}) — ${p.summary}`
        ).join("\n")
      : "No closely analogous precedents found in tracked database. Analysis proceeds on regulatory principles.";

    // ── STAGE 2: Three-part test analysis (EDPB Guidelines 1/2024 grounded) ──
    const purposeDetails = (assessment as any).purpose_details || {};
    const necessityDetails = (assessment as any).necessity_details || {};
    const balancingDetails = (assessment as any).balancing_details || {};

    // R1b2 — deterministic TEST-STATES computed from the intake row.
    const liaTestStates = computeLiaTestStates(assessment as Record<string, any>);
    const liaTestStatesBlock = renderLiaTestStatesBlock(liaTestStates);

    const ukGuidanceFraming = isUk
      ? `UK GUIDANCE FRAMING (regime is UK GDPR): Where this analysis cites EDPB Guidelines 1/2024, frame EDPB guidance as persuasive post-Brexit — the ICO's legitimate interests guidance is the primary UK reference. Note where the Data (Use and Access) Act 2025 recognised-legitimate-interests changes may be relevant.`
      : "";

    const gdprCitations = renderGdprCitationBlock({
      regime: enforcementRegime,
      jurisdictions: liaJurisdictions,
    });

    const analysisInjected = [
      gdprCitations,
      enforcementContextStr ? `ENFORCEMENT PRECEDENTS (cite by code [E1]–[E5]; each entry shows its tier and verification status):\n${enforcementContextStr}` : "",
      gdprBlock ? `STATUTORY AND EDPB AUTHORITY (cite as [Art. X] / [Recital N] / [EDPB ref]; statutory text is verbatim — do not alter it):\n${gdprBlock}` : "",
      ukGuidanceFraming,
      liaTestStatesBlock,
    ].filter(Boolean).join("\n\n");

    const analysisSystemBlocks = buildSystemContent({
      toolModule: LIA_ANALYSIS_TOOL_MODULE,
      currentDate: today,
      injected: analysisInjected,
    });


    const analysisUserBase = `Conduct a three-part legitimate interest assessment for the following proposed processing.

PROPOSED PROCESSING (Stage A):
Organisation (controller) being assessed: ${assessment.organization_name || "not specified"}
Description: ${assessment.processing_description}
Data categories: ${(assessment.data_categories || []).join(", ")}
Relationship with data subjects: ${assessment.relationship_type || "not specified"}
Jurisdictions: ${(assessment.jurisdictions || []).join(", ")}
Sector: ${assessment.sector || "not specified"}

STAGE B — PURPOSE FACTS:
Whose interest: ${purposeDetails.interest_holder || "not specified"}
Type of interest: ${purposeDetails.interest_type || "not specified"}
Interest — controller's clarification (if "Other"): ${purposeDetails.interest_holder_other || purposeDetails.interest_type_other || "n/a"}
Legitimate interest in the controller's own words: ${purposeDetails.interest_statement || "not provided"}
Stated purpose to data subjects: ${assessment.stated_purpose || "not specified"}
Statutory restrictions noted: ${balancingDetails.statutory_restrictions || "none noted"}

STAGE B — NECESSITY FACTS:
Alternatives considered: ${necessityDetails.alternatives || assessment.alternatives_considered || "not specified"}
Why consent not used: ${necessityDetails.why_consent_not_used || "not addressed"}
Data minimisation steps: ${necessityDetails.data_minimised || "not specified"}
Pseudonymisation/aggregation options: ${necessityDetails.pseudonymisation_options || "not addressed"}

STAGE B — BALANCING FACTS:
Reasonable expectation: ${balancingDetails.reasonable_expectation || "not specified"}
Reasonable expectation — controller's explanation: ${balancingDetails.reasonable_expectation_detail || "none given"}
Vulnerable subjects involved: ${(balancingDetails.vulnerable_subjects || []).join(", ") || "none indicated"}
Vulnerable subjects — other (if specified): ${balancingDetails.vulnerable_subjects_other || "n/a"}
Worst-case harm: ${balancingDetails.potential_harm || "not specified"}
Worst-case harm — controller's description: ${balancingDetails.potential_harm_detail || "none given"}
Safeguards in place: ${(balancingDetails.safeguards || []).join(", ") || "none specified"}
Safeguards — other (if specified): ${balancingDetails.safeguards_other || "n/a"}
Additional context from the controller: ${balancingDetails.additional_context || "none provided"}
Opt-out mechanism: ${balancingDetails.opt_out_mechanism || "not specified"}
Special category data flag: ${balancingDetails.special_category_data ? "YES — Article 9 condition required in addition" : "no"}
Employment-context safeguards: ${balancingDetails.employment_safeguards || "not applicable / not addressed"}

PRECEDENT DATABASE (tracked regulatory decisions):
${precedentContext}

CITATION AUTHORITY RULES (HARD CONSTRAINTS):
Each enforcement precedent below is tagged TIER 1, TIER 2, or TIER 3.
- TIER 1 (in-regime): may be cited as directly relevant regulatory practice under ${regimeLabel}.
- TIER 2 (cross-channel persuasive): may be cited ONLY as persuasive, non-binding authority. Every TIER 2 citation must state that the decision arises under a different implementation of the GDPR and is not binding in this regime. For UK assessments, also note where relevant that UK GDPR has diverged from EU GDPR since 2021 — including the Data (Use and Access) Act 2025 changes to the legitimate-interests framework — so EU reasoning must be checked against current UK law.
- TIER 3 (non-EU/UK supportive): NEVER cite as authority, direct or persuasive. May be referenced at most where the underlying fact pattern supports an argument the user must make under the ${regimeLabel} test, and every such reference must be expressly framed as not authoritative under ${regimeLabel}.
- Rows marked UNVERIFIED: never state a fine amount; describe the action and its compliance lesson only.
- Never cite any decision not present in the list below.
- If the ENFORCEMENT PRECEDENTS list below is empty or does not contain a relevant ${regimeLabel} decision, state explicitly that no directly analogous ${regimeLabel} precedent was retrieved — do not substitute precedent from training knowledge.

ENFORCEMENT PRECEDENTS (cite by code [E1]–[E5]; each entry shows its tier and verification status):
${enforcementContextStr}

ANNOTATION REQUIREMENT: For each enforcement action you actually cite (tagged [E1], [E2], etc.), include it in the annotations array using the id value from the enforcement context exactly as provided AND include its authority_tier (1|2|3) and authority_framing ('in_regime' | 'persuasive_not_binding' | 'supportive_not_authoritative'). The tier/framing pairing must follow this mapping exactly: tier 1 → in_regime; tier 2 → persuasive_not_binding; tier 3 → supportive_not_authoritative. You MUST only cite enforcement actions from the ENFORCEMENT PRECEDENTS provided above — never cite cases from training knowledge.

Apply the EDPB Guidelines 1/2024 three-part test to the SPECIFIC facts above — and only those facts. "Specific" means test exactly what the controller stated; it does NOT license inventing details they did not provide. Where a fact a step needs is missing, record it under open_questions rather than assuming it. Return JSON with this exact structure:
{
  "purpose_test": {
    "verdict": "passes | fails | uncertain",
    "analysis": "3-4 sentences testing whether the named interest holder has a lawful, specific, present interest. Address any statutory restrictions noted. Cite the applicable standard.",
    "risk_factors": ["factors weakening the purpose test, drawn from the facts above"],
    "supporting_factors": ["factors strengthening it, drawn from the facts above"],
    "open_questions": ["facts the user did not provide that would affect this verdict"]
  },
  "necessity_test": {
    "verdict": "passes | fails | uncertain",
    "analysis": "3-4 sentences. Test whether the processing is the LEAST intrusive way to achieve the stated purpose, given the alternatives the user considered, the data minimisation they described, and any pseudonymisation potential. For EACH data category identified in the intake, state the retention period AND the deletion trigger (event that starts the clock) drawn from the intake — Article 5(1)(e) UK GDPR / GDPR requires storage limitation to be documented per category and purpose. Where the intake does not state a specific retention period or deletion trigger for a category, name that category and record the gap in open_questions and (if it blocks the necessity verdict) blocking_issues — do NOT invent a period.",
    "risk_factors": ["factors weakening necessity, e.g. overly broad data, weak alternatives analysis, retention period or deletion trigger not stated for a specific data category"],
    "supporting_factors": ["factors strengthening necessity"],
    "open_questions": ["facts that would affect this verdict"]
  },
  "balancing_test": {
    "verdict": "likely_passes | likely_fails | uncertain",
    "analysis": "4-5 sentences applying the EDPB four-factor balancing: (1) reasonable expectations, (2) nature of the relationship, (3) potential impact and severity, (4) safeguards including opt-out. Address vulnerable subjects if any. Where the analysis references a worst-case harm scenario (e.g. 'unexpected profiling if safeguards fail'), include a QUALITATIVE assessment of BOTH (a) the likelihood that the safeguard-failure scenario occurs on the facts stated (rare / plausible / foreseeable) AND (b) the nature and severity of the resulting harm to data subjects (limited / significant / severe, and the type of harm — reputational, financial, discrimination, chilling effect on rights, etc.), per EDPB Guidelines 1/2024 para. 39 (impact of the processing on the data subjects — qualitative assessment of the likely impact covering nature, context and further consequences). Do NOT quantify probability numerically and do NOT treat the absence of quantification as, by itself, a deficiency (see LIKELY IMPACT rule).",
    "risk_factors": ["factors tipping the balance toward data subjects"],
    "supporting_factors": ["factors supporting the controller's interest"],
    "open_questions": ["facts that would affect this verdict"],
    "special_category_flag": ${balancingDetails.special_category_data ? "true" : "false"},
    "vulnerable_subject_flag": ${(balancingDetails.vulnerable_subjects || []).filter((v: string) => v && v !== "None").length > 0 ? "true" : "false"}
  },
  "overall_assessment": {
    "argument_strength": "strong | moderate | weak | insufficient | uncertain (REQUIRED, never null or omitted — use 'uncertain' if genuinely unclear)",
    "strength_basis": "One sentence explaining why this rating, referencing the strongest analogous precedent.",
    "closest_accepted_precedent": "Name from the database (REQUIRED non-empty string; if none, write 'None identified in current database' — never null)",
    "closest_rejected_precedent": "Name from the database (REQUIRED non-empty string; if none, write 'None identified in current database' — never null)",
    "key_distinguishing_factors": ["factors distinguishing this case from precedents"],
    "blocking_issues": ["issues that would prevent reliance on legitimate interest unless resolved — empty array if none"]
  },
  "annotations": [
    {
      "enforcement_action_id": "exact id string from the enforcement context above (the value after 'id:')",
      "authority_tier": "REQUIRED integer 1, 2, or 3 — must equal the TIER tag shown on this entry above",
      "authority_framing": "REQUIRED: 'in_regime' (tier 1) | 'persuasive_not_binding' (tier 2) | 'supportive_not_authoritative' (tier 3) — must match authority_tier per the mapping",
      "regulator": "regulator name",
      "jurisdiction": "jurisdiction",
      "decision_date": "YYYY-MM-DD or null",
      "summary": "one sentence what the case involved, max 25 words, plain English",
      "outcome": "rejected | accepted | penalised | required",
      "relevance": "one sentence why this case is relevant to this assessment"
    }
  ],
  "information_needed": [
    // REQUIRED whenever any finding in this report is insufficient-basis / Insufficient information / "uncertain" verdict; otherwise an empty array. One entry per gap.
    { "field": "<intake field key that exists in the intake — one of: organization_name, subject_anchor, relationship_type, jurisdictions, data_categories, processing_description, stated_purpose, sector, alternatives_considered>",
      "dimensions": "<what specifically to add — dimensions, never suggested values>",
      "provision": "<already-cited provision making these dimensions relevant>",
      "enables": "<which section/determination completes with it>" }
  ]
}

Every insufficient-basis or Insufficient-information finding elsewhere in this output (including any "uncertain" verdict in purpose_test, necessity_test, or balancing_test) MUST have a corresponding information_needed entry.${renderSupplementalBlock({ responses: (assessment as any).supplemental_responses, context: (assessment as any).supplemental_context })}`;

    async function runStage2(extraUser: string, maxTokens: number = PRODUCT_MAX_OUTPUT_TOKENS): Promise<{ text: string; stopReason: string | null }> {
      const finalUser = extraUser ? `${analysisUserBase}\n\n${extraUser}` : analysisUserBase;
      return await callAnthropic("claude-sonnet-4-6", analysisSystemBlocks, finalUser, maxTokens);
    }

    const t2Start = Date.now();
    let stage2 = await runStage2("");
    if (stage2.stopReason === "max_tokens") {
      console.warn(`[LIA] Stage 2 truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} — single retry`);
      stage2 = await runStage2("", PRODUCT_MAX_OUTPUT_TOKENS);
      if (stage2.stopReason === "max_tokens") {
        console.error("[LIA] Stage 2 truncated_output after retry — failing run");
        throw new Error("truncated_output: LIA Stage 2 (analysis) exceeded token budget twice");
      }
    }
    console.log(`[LIA] stage=2 analysis elapsed=${Date.now() - t2Start}ms`);
    const analysisText = stage2.text;
    let analysis: any = parseLlmJson(analysisText);
    if (!analysis) {
      console.error("[LIA] Stage 2 parse failed even with repair. Length:", analysisText.length);
      console.error("[LIA] Tail:", analysisText.slice(-300));
      analysis = { overall_assessment: { argument_strength: "uncertain" } };
    }

    // Lint narrative fields and retry once on hard violations.
    const lintViolations: any[] = [];
    function lintAnalysis(a: any): boolean {
      let hardSeen = false;
      const testKeys = ["purpose_test", "necessity_test", "balancing_test"];
      for (const tk of testKeys) {
        const t = a?.[tk];
        if (!t || typeof t !== "object") continue;
        for (const f of ["analysis"]) {
          if (typeof t[f] === "string") {
            const r = lintReportText(t[f]);
            t[f] = r.clean;
            for (const v of r.violations) lintViolations.push({ field: `${tk}.${f}`, ...v });
            if (hasHardViolations(r)) hardSeen = true;
          }
        }
        for (const f of ["risk_factors", "supporting_factors", "open_questions"]) {
          if (Array.isArray(t[f])) {
            t[f] = t[f].map((s: any) => {
              if (typeof s !== "string") return s;
              const r = lintReportText(s);
              for (const v of r.violations) lintViolations.push({ field: `${tk}.${f}`, ...v });
              if (hasHardViolations(r)) hardSeen = true;
              return r.clean;
            });
          }
        }
      }
      const oa = a?.overall_assessment;
      if (oa && typeof oa === "object") {
        for (const f of ["strength_basis", "closest_accepted_precedent", "closest_rejected_precedent"]) {
          if (typeof oa[f] === "string") {
            const r = lintReportText(oa[f]);
            oa[f] = r.clean;
            for (const v of r.violations) lintViolations.push({ field: `overall_assessment.${f}`, ...v });
            if (hasHardViolations(r)) hardSeen = true;
          }
        }
        for (const f of ["key_distinguishing_factors", "blocking_issues"]) {
          if (Array.isArray(oa[f])) {
            oa[f] = oa[f].map((s: any) => {
              if (typeof s !== "string") return s;
              const r = lintReportText(s);
              for (const v of r.violations) lintViolations.push({ field: `overall_assessment.${f}`, ...v });
              if (hasHardViolations(r)) hardSeen = true;
              return r.clean;
            });
          }
        }
      }
      return hardSeen;
    }

    if (lintAnalysis(analysis)) {
      try {
        const details = lintViolations.map((v) => `${v.code}: ${v.detail}`).join("; ");
        lintViolations.length = 0;
        const retryStage = await runStage2(
          `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`
        );
        const retryParsed = parseLlmJson(retryStage.text);
        if (retryParsed) {
          analysis = retryParsed;
          lintAnalysis(analysis);
        }
      } catch (e) {
        console.warn("[LIA] lint retry failed (non-fatal):", e);
      }
    }

    // ── Tier/Authority deterministic validation (hard violations → retry once) ──
    const FRAMING_BY_TIER: Record<number, string> = {
      1: "in_regime",
      2: "persuasive_not_binding",
      3: "supportive_not_authoritative",
    };
    function validateAuthority(a: any): { hard: boolean; details: string[] } {
      const details: string[] = [];
      const anns: any[] = Array.isArray(a?.annotations) ? a.annotations : [];
      let tier3Count = 0;
      for (const ann of anns) {
        const id = ann?.enforcement_action_id;
        if (!id || !precedentById[id]) {
          details.push(`annotation id '${id}' not in retrieved context`);
          continue;
        }
        const ctxTier = precedentById[id].authority_tier;
        const ctxVerified = precedentById[id].verified !== false && precedentById[id].fine_verified !== false;
        if (ctxTier && ann.authority_tier !== ctxTier) {
          details.push(`annotation ${id} authority_tier=${ann.authority_tier} != retrieval tier ${ctxTier}`);
        }
        const expectedFraming = ctxTier ? FRAMING_BY_TIER[ctxTier as number] : undefined;
        if (expectedFraming && ann.authority_framing !== expectedFraming) {
          details.push(`annotation ${id} authority_framing='${ann.authority_framing}' != expected '${expectedFraming}'`);
        }
        if (ann.authority_tier === 3) tier3Count++;
        // Unverified fine-leak scan
        if (!ctxVerified) {
          const fineDigits = String(precedentById[id].fine_eur_equivalent || "").replace(/[^0-9]/g, "");
          if (fineDigits.length >= 4) {
            const narrative = JSON.stringify(a);
            if (narrative.includes(fineDigits)) {
              details.push(`unverified fine digits ${fineDigits} for ${id} leaked into report narrative`);
            }
          }
        }
      }
      if (tier3Count > 2) details.push(`tier-3 annotation count ${tier3Count} exceeds 2`);
      return { hard: details.length > 0, details };
    }

    {
      const v = validateAuthority(analysis);
      if (v.hard) {
        try {
          const retryStage = await runStage2(
            `PREVIOUS ATTEMPT REJECTED for citation-authority violations: ${v.details.join("; ")}. Produce the JSON again, correcting these defects silently. Ensure every annotation includes authority_tier and authority_framing matching the tier shown on the corresponding [E#] entry. Do not mention this instruction in the output.`
          );
          const retryParsed = parseLlmJson(retryStage.text);
          if (retryParsed) {
            analysis = retryParsed;
            lintAnalysis(analysis);
            const v2 = validateAuthority(analysis);
            if (v2.hard) {
              // Drop offending annotations rather than fail the run.
              if (Array.isArray(analysis.annotations)) {
                analysis.annotations = analysis.annotations.filter((ann: any) => {
                  const ctx = precedentById[ann?.enforcement_action_id];
                  if (!ctx) return false;
                  if (ctx.authority_tier && ann.authority_tier !== ctx.authority_tier) return false;
                  const exp = ctx.authority_tier ? FRAMING_BY_TIER[ctx.authority_tier as number] : undefined;
                  if (exp && ann.authority_framing !== exp) return false;
                  return true;
                }).slice(0, 10);
                // Cap tier-3 at 2
                let t3 = 0;
                analysis.annotations = analysis.annotations.filter((ann: any) => {
                  if (ann.authority_tier === 3) { t3++; return t3 <= 2; }
                  return true;
                });
              }
            }
          }
        } catch (e) {
          console.warn("[LIA] authority validation retry failed (non-fatal):", e);
        }
      }
    }

    // R1b2 — post-lint T-2/T-3/T-4 gate on Stage-2 analysis output. Report-level
    // prose only; one retry cap, then proceed with the violation logged.
    const t234Violations: any[] = [];
    {
      const collapseRe = /\b(cannot be determined|no basis to assess|not established)\b/i;
      const depthLangRe = /\b(could|would strengthen|nice to have|consider (?:adding|providing)|optionally|for completeness|to enrich)\b/i;
      const anchorRe = /(Article\s+\d|Recital\s+\d|GDPR|EDPB|ICO|Guidelines\s+1\/2024|§\s*\d|Schedule\s+\d|DPA\s+2018)/i;
      const RESOLVED_MET_FIELD_MAP: Record<string, string[]> = {
        M6: ["alternatives_considered"],
        M7: ["safeguards"],
        M8: ["opt_out_mechanism"],
        M4: ["special_category_data"],
        M5: ["vulnerable_subjects"],
        M9: ["reasonable_expectation"],
        M10: ["potential_harm"],
      };
      function detectT234(a: any): { t2: any[]; t3: any[]; t4: any[] } {
        const t2: any[] = []; const t3: any[] = []; const t4: any[] = [];
        const info: any[] = Array.isArray(a?.information_needed) ? a.information_needed : [];
        for (const item of info) {
          const f = String(item?.field ?? "").trim();
          if (!f) continue;
          for (const [id, keys] of Object.entries(RESOLVED_MET_FIELD_MAP)) {
            const st = liaTestStates[id]?.state;
            if ((st === "resolved_met" || st === "resolved_not_met") && keys.includes(f)) {
              t2.push({ test: id, kind: "info_needed_reasks_resolved", field: f });
            }
          }
        }
        const testFields = ["purpose_test", "necessity_test", "balancing_test"];
        for (const tf of testFields) {
          const t = a?.[tf]; if (!t) continue;
          const text = [t.analysis, ...(Array.isArray(t.open_questions) ? t.open_questions : [])].filter((s: any) => typeof s === "string").join(" ");
          if (liaTestStates.M4?.state !== "indeterminate" && /(confirm|clarify)\s+whether[^.]{0,80}special\s?category/i.test(text)) {
            t2.push({ test: "M4", kind: "reasks_resolved_special_category", field: tf });
          }
          if (liaTestStates.M8?.state === "resolved_met" && /(confirm|clarify)\s+whether[^.]{0,80}opt[-\s]?out/i.test(text)) {
            t2.push({ test: "M8", kind: "reasks_resolved_opt_out", field: tf });
          }
        }
        const anyResolved = Object.values(liaTestStates).some((s) => s.state === "resolved_met");
        if (anyResolved) {
          const strBasis = String(a?.overall_assessment?.strength_basis ?? "");
          if (collapseRe.test(strBasis)) t3.push({ field: "overall_assessment.strength_basis", detail: strBasis.slice(0, 160) });
          for (const tf of testFields) {
            const s = String(a?.[tf]?.analysis ?? "");
            if (collapseRe.test(s)) t3.push({ field: `${tf}.analysis`, detail: s.slice(0, 160) });
          }
        }
        const blocking: any[] = Array.isArray(a?.overall_assessment?.blocking_issues) ? a.overall_assessment.blocking_issues : [];
        for (const b of blocking) {
          const s = typeof b === "string" ? b : "";
          if (!s) continue;
          if (depthLangRe.test(s) && !anchorRe.test(s)) t4.push({ field: "blocking_issues", detail: s.slice(0, 160) });
        }
        for (const item of info) {
          const dims = String(item?.dimensions ?? "");
          const prov = String(item?.provision ?? "");
          if (depthLangRe.test(dims) && !anchorRe.test(`${prov} ${dims}`)) {
            t4.push({ field: "information_needed", detail: dims.slice(0, 160) });
          }
        }
        return { t2, t3, t4 };
      }

      let detected = detectT234(analysis);
      let t5Hits = detectTestStatesLeak(analysis);
      const total = detected.t2.length + detected.t3.length + detected.t4.length + t5Hits.length;
      if (total > 0) {
        console.warn(JSON.stringify({
          evt: "post_lint_violation", fn: "run-li-assessment",
          t2: detected.t2.slice(0, 6), t3: detected.t3.slice(0, 6), t4: detected.t4.slice(0, 6),
          t5: t5Hits.slice(0, 6),
        }));
        try {
          const parts: string[] = [];
          if (detected.t2.length) parts.push(`T-2 (TEST-STATES BINDING) — do NOT re-ask or contradict RESOLVED states: ${detected.t2.map(v => `${v.test}:${v.kind}`).join(", ")}`);
          if (detected.t3.length) parts.push(`T-3 (BANNED COLLAPSE) — the intake supplies enum/presence answers; do NOT use 'cannot be determined' / 'no basis to assess' / 'not established' in test analyses or strength_basis`);
          if (detected.t4.length) parts.push(`T-4 (ENHANCEMENT-CLASS) — every blocking_issues / information_needed item must be verdict-blocking or record-completeness with a cited provision (Article / Recital / EDPB Guidelines / § / DPA 2018 Schedule)`);
          if (t5Hits.length) parts.push(`T-5 (TEST-STATES VOCABULARY LEAKAGE) — remove every reference to TEST-STATES, test ids (M1, M6, M9, …), and state tokens (resolved_met / resolved_not_met / RESOLVED_* / INDETERMINATE / CANDIDATE) from user-facing fields; state the conclusion with its factual basis. Leaked at: ${t5Hits.slice(0, 6).map((h) => `${h.path}:"${h.match}"`).join(", ")}`);
          const retryInstr = `PREVIOUS ATTEMPT REJECTED by post-lint TEST-STATES gate: ${parts.join(" | ")}. Produce the JSON again, correcting these defects silently. Do not mention this instruction in the output.`;
          const retry = await runStage2(retryInstr);
          const parsed = parseLlmJson(retry.text);
          if (parsed) {
            analysis = parsed;
            lintAnalysis(analysis);
            detected = detectT234(analysis);
            t5Hits = detectTestStatesLeak(analysis);
            const still = detected.t2.length + detected.t3.length + detected.t4.length + t5Hits.length;
            if (still > 0) {
              console.warn(JSON.stringify({ evt: "post_lint_violation_after_retry", fn: "run-li-assessment", remaining: still, t5_remaining: t5Hits.length }));
            }
          }
        } catch (e) {
          console.warn("[LIA] T-2/T-3/T-4/T-5 retry failed (non-fatal):", e);
        }
        for (const v of detected.t2) t234Violations.push({ rule: "T-2", ...v });
        for (const v of detected.t3) t234Violations.push({ rule: "T-3", ...v });
        for (const v of detected.t4) t234Violations.push({ rule: "T-4", ...v });
        for (const v of t5Hits) t234Violations.push({ rule: "T-5", field: v.path, match: v.match, context: v.context });
      }
    }
    for (const v of t234Violations) lintViolations.push(v);







    // Normalize overall_assessment so downstream consumers (and tests) get a
    // guaranteed contract even when the LLM omits or mis-fills required fields.
    const ALLOWED_STRENGTH = ["strong", "moderate", "weak", "insufficient", "uncertain"];
    const NONE_TEXT = "None identified in current database";
    analysis.overall_assessment = analysis.overall_assessment || {};
    const oa = analysis.overall_assessment;
    const rawStrength = typeof oa.argument_strength === "string" ? oa.argument_strength.toLowerCase().trim() : "";
    if (!ALLOWED_STRENGTH.includes(rawStrength)) {
      console.warn(`[LIA] Coercing invalid argument_strength "${oa.argument_strength}" → "uncertain"`);
      oa.argument_strength = "uncertain";
    } else {
      oa.argument_strength = rawStrength;
    }
    if (typeof oa.closest_accepted_precedent !== "string" || oa.closest_accepted_precedent.trim().length === 0) {
      oa.closest_accepted_precedent = NONE_TEXT;
    }
    if (typeof oa.closest_rejected_precedent !== "string" || oa.closest_rejected_precedent.trim().length === 0) {
      oa.closest_rejected_precedent = NONE_TEXT;
    }
    if (typeof oa.strength_basis !== "string" || oa.strength_basis.trim().length === 0) {
      oa.strength_basis = "Insufficient analysis returned by the model to support a confident rating.";
    }
    if (!Array.isArray(oa.key_distinguishing_factors)) oa.key_distinguishing_factors = [];
    if (!Array.isArray(oa.blocking_issues)) oa.blocking_issues = [];

    // Always attach a plain-language note explaining the argument-strength rating
    // so end users (especially non-specialists) understand what "uncertain" means.
    const STRENGTH_NOTES: Record<string, string> = {
      strong: "Strong: the facts and precedents available support a defensible legitimate-interest claim.",
      moderate: "Moderate: legitimate interest is plausibly available but rests on contested or fact-sensitive points; resolve open questions before deployment.",
      weak: "Weak: significant factors weigh against a legitimate-interest claim on the facts provided; consider an alternative legal basis or additional safeguards.",
      insufficient: "Insufficient: not enough information has been provided to reach a verdict; supply the open-question items and re-run.",
      uncertain: "Uncertain: blocking issues have been identified that must be resolved before a defensible LI claim can be established — this does NOT mean legitimate interest is categorically unavailable.",
    };
    oa.argument_strength_note = STRENGTH_NOTES[oa.argument_strength] ?? STRENGTH_NOTES.uncertain;


    // ── STAGE 3: Documentation recommendations ──
    const docsSystemBlocks = buildSystemContent({
      toolModule: LIA_DOCS_TOOL_MODULE,
      currentDate: today,
    });


    const ukDocsAddendum = isUk
      ? `\n\nUK ARTICLE 9(2)(b) MECHANISM (regime is UK GDPR): For any 'Article 9(2)(b) Employment Law Condition Assessment' document, the description MUST name the UK implementing mechanism: 'Reliance on Article 9(2)(b) under UK GDPR additionally requires satisfying Data Protection Act 2018 s.10 and Schedule 1, Part 1, paragraph 1 (employment, social security and social protection), including having an APPROPRIATE POLICY DOCUMENT (APD) in place per Schedule 1, Part 4. The APD must describe the lawful basis and Schedule 1 condition relied on, retention and erasure policy for the special-category data, and compliance procedures.'${balancingDetails.special_category_data ? `\nFor this UK assessment involving special-category data, you MUST also include a DISTINCT 'Appropriate Policy Document (APD)' entry in recommended_documentation whose key_elements list contains: (i) the lawful basis and Schedule 1 condition relied on, (ii) retention and erasure policy for the special-category data, and (iii) compliance procedures. Cite 'UK Data Protection Act 2018 Schedule 1, Part 4' as its basis.` : ""}`
      : "";

    const docsUserPrompt = `Based on this legitimate interest analysis, provide documentation recommendations.

Processing activity: ${assessment.processing_description}
Argument strength: ${analysis.overall_assessment?.argument_strength || "uncertain"}
Balancing test status: ${analysis.balancing_test?.verdict || "uncertain"}
Key risk factors: ${JSON.stringify(analysis.balancing_test?.risk_factors || [])}

PRECEDENT DATABASE:
${precedentContext}${ukDocsAddendum}

IMPORTANT: You must return at least 2–4 items in recommended_documentation regardless of argument strength. Even a weak or insufficient LIA requires documentation to be defensible or to support a re-assessment. Every LIA requires at minimum: (1) a balancing record document, and (2) a legitimate interests notice or transparency document.

Return JSON:
{
  "recommended_documentation": [
    {
      "document": "Document name",
      "purpose": "Why this document is needed for a defensible LIA",
      "key_elements": ["what must be included"],
      "basis": "Which precedent or regulatory guidance requires this"
    }
  ],
  "balancing_record_elements": [
    "specific element to document in the LI balancing record"
  ],
  "opt_out_mechanism": {
    "required": true or false,
    "basis": "regulatory requirement or recommendation",
    "recommended_approach": "how to implement"
  },
  "review_triggers": [
    "circumstances that would require this LIA to be revisited"
  ],
  "disclaimer": "This analysis helps your organisation assess whether legitimate interest is an appropriate processing basis. It does not constitute legal advice. Review the findings with qualified legal counsel before relying on legitimate interest as a processing legal basis."
}`;

    const t3Start = Date.now();
    let docsStage = await callAnthropic("claude-sonnet-4-6", docsSystemBlocks, docsUserPrompt, PRODUCT_MAX_OUTPUT_TOKENS);
    if (docsStage.stopReason === "max_tokens") {
      console.warn(`[LIA] Stage 3 truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} — single retry`);
      docsStage = await callAnthropic("claude-sonnet-4-6", docsSystemBlocks, docsUserPrompt, PRODUCT_MAX_OUTPUT_TOKENS);
      if (docsStage.stopReason === "max_tokens") {
        console.error("[LIA] Stage 3 truncated_output after retry — failing run");
        throw new Error("truncated_output: LIA Stage 3 (docs) exceeded token budget twice");
      }
    }
    console.log(`[LIA] stage=3 docs elapsed=${Date.now() - t3Start}ms`);
    const docsText = docsStage.text;

    let docRecs: any = parseLlmJson(docsText);
    if (!docRecs) {
      console.error("[LIA] Stage 3 parse failed even with repair. Length:", docsText.length);
      docRecs = {
        recommended_documentation: [],
        disclaimer: "This is not legal advice."
      };
    }


    // ── ASSEMBLE FINAL REPORT ──
    const reportData = {
      generated_at: new Date().toISOString(),
      assessment_id,
      classification,
      precedents_reviewed: precedents.length,
      precedent_database_size: (allPrecedents || []).length,
      enforcement_precedents: enforcementPrecedents,
      enforcement_meta: enforcementMeta,
      gdpr_meta: gdprMeta,
      enforcement_precedents_note: enforcementPrecedents.length === 0
        ? "The analysis references database reference categories only; no individual enforcement decisions were matched or cited."
        : null,
      three_part_test: analysis,
      lint_warnings: lintViolations,
      annotations: (() => { try { return Array.isArray(analysis?.annotations) ? analysis.annotations : []; } catch { return []; } })(),
      information_needed: Array.isArray((analysis as any)?.information_needed) ? (analysis as any).information_needed : [],
      documentation_recommendations: docRecs,
      disclaimer: "This report helps your organisation identify areas for legal review. It does not constitute legal advice. All findings should be reviewed with qualified legal counsel before relying on legitimate interest as a processing legal basis under UK GDPR, EU GDPR, or equivalent provisions.",
      data_currency_note: `Precedent database last updated: ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}. Regulatory positions evolve. Verify against current DPA guidance.`,
      _meta: { prompt_version: stampPromptVersion("li-assessment", "r1b2") },
    };

    // 2.9 — LIA has no intake_data column; build the guard's intake object
    // from the row's dedicated columns (never invent an intake_data field).
    const liaIntakeObject: Record<string, unknown> = {
      organization_name: assessment.organization_name,
      subject_anchor: (assessment as any).subject_anchor ?? null,
      relationship_type: assessment.relationship_type,
      jurisdictions: assessment.jurisdictions,
      data_categories: assessment.data_categories,
      processing_description: (assessment as any).processing_description ?? null,
      stated_purpose: (assessment as any).stated_purpose ?? null,
      sector: (assessment as any).sector ?? null,
      alternatives_considered: (assessment as any).alternatives_considered ?? null,
    };
    const guarded = guardInformationNeeded(reportData, liaIntakeObject);
    Object.assign(reportData, guarded.report);
    ensureReferenceCategoryCaveat(dedupeInformationNeeded(reportData));



    // Stage 1: metering + version retention (successful runs only).
    // Written BEFORE status:complete so that any client observing "complete"
    // will also see the meter/version rows.
    await recordRunMeterAndVersion(supabase, {
      toolType: "li_assessment",
      assessmentId: assessment_id,
      userId: assessment.user_id ?? null,
      intake: liaIntakeObject,
      reportData,
    });

    const completeWrite = await lifecycleUpdate(supabase, "li_assessments", assessment_id, {
      status: "complete",
      report_data: reportData,
      updated_at: new Date().toISOString(),
    }, { fn: "run-li-assessment", phase: "terminal_complete" });
    if (!completeWrite.ok) {
      await lifecycleUpdate(supabase, "li_assessments", assessment_id, { status: "failed" }, { fn: "run-li-assessment", phase: "terminal_fallback" });
    }

    // L2 — observe-only citation lint (never blocks, never mutates output).
    try {
      // Supply list mirrors what getGdprContext actually injected. Include the
      // UK-form variant when UK jurisdiction was selected so extracted tokens
      // like "Article 5 UK GDPR" canonicalise-match the supply.
      const matched: string[] = gdprMeta?.matched_articles ?? [];
      const supplied: string[] = [];
      for (const n of matched) {
        supplied.push(`Article ${n} GDPR`);
        if (gdprJurisdiction === "uk") supplied.push(`Article ${n} UK GDPR`);
      }
      await observeCitations(
        supabase,
        "run-li-assessment",
        assessment_id,
        JSON.stringify(reportData),
        supplied,
      );
    } catch (obsErr) {
      console.error("[citation-observe] non-fatal:", String(obsErr));
    }



    // C4 RoPA accumulator: draft a suggested processing activity into the
    // client's active RoPA session (fire-and-forget, non-fatal).
    if (assessment.client_id) {
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: assessment.client_id,
          source_tool: "li_assessment",
          source_assessment_id: assessment_id,
          display_name: (assessment.processing_description || "").slice(0, 120) || "Processing requiring LIA",
          source_summary: assessment.processing_description || null,
          is_high_risk: false,
          category: "other",
        },
      }).catch((e: Error) => console.error("[li] accumulate-ropa failed (non-fatal):", e.message));
    }


    // Fetch user email for delivery
    const { data: userData } = await supabase.auth.admin.getUserById(
      assessment.user_id
    ).catch(() => ({ data: null as any }));

    // Fire-and-forget upsell signals (non-fatal).
    supabase.functions.invoke('trigger-upsell', {
      body: { tool_type: 'li_assessment', assessment_id, user_id: assessment.user_id },
    }).catch((e: Error) => console.error('[lia] trigger-upsell failed (non-fatal):', e.message));

    await supabase.functions.invoke("generate-report-pdf", {
      body: {
        tool_type: "li_assessment",
        assessment_id,
        user_email: userData?.user?.email || null,
        user_name: userData?.user?.user_metadata?.full_name || null,
        result_url: `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/li-assessment/result/${assessment_id}`,
      },
    }).catch((e: Error) => console.error("PDF/email delivery failed (non-fatal):", e));

    return;

  } catch (e) {
    console.error("run-li-assessment error:", e);
    await lifecycleUpdate(supabase, "li_assessments", assessment_id, { status: "failed" }, { fn: "run-li-assessment", phase: "terminal_error_catch" });
    throw e;
  }
}

