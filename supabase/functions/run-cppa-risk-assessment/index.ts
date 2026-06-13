// CPPA Risk Assessment — v3 (June 2026)
// Produces a § 7152(a)(1)–(9) Part A report + § 7157 Part B annual submission
// worksheet. The user document never references our internal corpus or any
// enforcement record (per locked design principles 4 + 5).
//
// Pipeline:
//   1. Retrieve statute + regulation + FSOR context (existing function).
//   2. Single generation call → structured Part A / Part B JSON.
//   3. Code-side banned-phrase validator on §§ 2 and 5.
//   4. Code-side gating: linked High harms, mandatory user decisions, exec sign-off.
//   5. Persist to cppa_assessments.report_data.
//
// Admin-only fields (citation_ledger, fsor_commentary, retrieval metadata) are
// preserved when available so the existing admin UI continues to render them.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BANNED_PHRASES, checkBannedPhrases } from "../_shared/citation-verifier.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";

// Re-export so any downstream importers of this module see no behavioural change.
export { BANNED_PHRASES, checkBannedPhrases };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- Topic derivation (used to scope retrieval) ----
const SENSITIVE_CATEGORIES = new Set([
  "Health or medical information", "Biometric information", "Genetic data",
  "Racial or ethnic origin", "Religious or philosophical beliefs", "Union membership",
  "Sexual orientation or gender identity", "Citizenship or immigration status",
  "Financial information", "Geolocation data", "Children's data (under 16)",
]);

function deriveTopics(intake: any): string[] {
  const topics = new Set<string>([
    "thresholds", "risk-assessment", "purpose-limitation", "minimum-necessary",
    "notice-at-collection", "service-providers", "retention", "governance",
  ]);
  const q4: string[] = Array.isArray(intake.q4_pi_categories) ? intake.q4_pi_categories : [];
  if (q4.some((c) => SENSITIVE_CATEGORIES.has(c)) || intake.q15_sensitive_pi === "Yes") {
    topics.add("sensitive-pi"); topics.add("limit-sensitive-pi");
  }
  const sells = typeof intake.q5_sell_share === "string"
    && /sell|share|both/i.test(intake.q5_sell_share)
    && !/^no/i.test(intake.q5_sell_share);
  if (sells) {
    ["opt-out-sale-sharing", "third-party", "contract-requirements"].forEach((t) => topics.add(t));
  }
  if (intake.q18_admt_use === "Yes" || intake.q18_admt_use === "In evaluation") {
    ["admt", "significant-decision", "profiling", "pre-use-notice"].forEach((t) => topics.add(t));
  }
  return Array.from(topics);
}

// ---- Generation call helpers (Lovable AI Gateway, Gemini Flash) ----
// Switched from direct Anthropic Claude to Lovable AI Gateway with
// google/gemini-3-flash-preview to fit the full Part A/B generation
// inside the edge-function response window. Gemini Flash handles ~16k
// output tokens an order of magnitude faster than claude-sonnet-4-6.
async function callModel(model: string, system: string, user: string, maxTokens: number, label = "gen"): Promise<string> {
  const t0 = Date.now();
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(240_000),
  });
  const elapsed = Date.now() - t0;
  if (!res.ok) {
    const t = await res.text();
    console.error(`[${label}] ${model} HTTP ${res.status} in ${elapsed}ms: ${t.slice(0, 300)}`);
    throw new Error(`Gateway ${res.status}: ${t.slice(0, 300)}`);
  }
  const d = await res.json();
  console.log(`[${label}] ${model} ok in ${elapsed}ms, output ~${d.usage?.completion_tokens ?? "?"} tokens`);
  return d.choices?.[0]?.message?.content || "";
}
function tryParseJson(text: string): any | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
async function generateOrRetry(model: string, system: string, user: string, maxTokens: number, label = "gen") {
  let text = await callModel(model, system, user, maxTokens, label);
  let parsed = tryParseJson(text);
  if (!parsed) {
    console.warn(`[${label}] first parse failed, retrying once`);
    text = await callModel(model, system, user, maxTokens, label + "-retry");
    parsed = tryParseJson(text);
  }
  return { parsed, rawText: text };
}

// ---- Authority / FSOR retrieval (server-side only; NEVER surfaced to user as "corpus") ----
function buildAuthoritiesBlock(authorities: any[]): string {
  return authorities.map((a, i) =>
    `[A${i + 1}] ${a.citation} — ${a.title}\nTEXT: ${(a.full_text ?? a.plain_summary ?? "").slice(0, 4000)}`,
  ).join("\n\n");
}
function buildDeadlinesBlock(deadlines: any[]): string {
  if (!deadlines?.length) return "(none)";
  return deadlines.map((d, i) =>
    `[D${i + 1}] ${d.obligation} | effective: ${d.effective_date ?? "—"} | deadline: ${d.compliance_deadline ?? "—"} | basis: ${d.primary_authority_citation}`,
  ).join("\n");
}
function buildFsorBlock(fsor: any[]): string {
  if (!fsor?.length) return "(none)";
  return fsor.map((f, i) =>
    `[F${i + 1}] re ${f.regulation_citation}: ${(f.comment_summary ?? "").slice(0, 400)} — Agency response: ${(f.agency_response ?? "").slice(0, 800)}`,
  ).join("\n\n");
}

async function retrieveFsorCommentary(authorities: any[], topics: string[], intake: any): Promise<any[]> {
  if (!LOVABLE_API_KEY) return [];
  if (!authorities?.length && !topics?.length) return [];
  try {
    const citations = authorities.map((a) => a.citation).filter(Boolean);
    const queryText =
      `California privacy risk assessment for: topics=${topics.join(", ")}. ` +
      `Sensitive PI=${intake.q15_sensitive_pi ?? "?"}, ADMT=${intake.q18_admt_use ?? "?"}, ` +
      `sells_or_shares=${intake.q5_sell_share ?? "?"}, purpose=${(intake.i1_processing_purpose ?? "").slice(0, 200)}.`;
    const er = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: queryText.slice(0, 6000), dimensions: 1536 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!er.ok) return [];
    const ed = await er.json();
    const embedding = ed?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) return [];
    const { data, error } = await supabase.rpc("match_cppa_fsor_commentary", {
      query_embedding: embedding,
      citation_filter: citations.length ? citations : null,
      topic_filter: topics.length ? topics : null,
      match_count: 10,
    });
    if (error) { console.warn(`[fsor] rpc error: ${error.message}`); return []; }
    const rows = Array.isArray(data) ? data : [];
    // Supersession ordering: 2025 cyber/risk/ADMT package controls over older
    // packages on the same regulation section. Stable sort preserves similarity
    // order within each package.
    const PKG_PRIORITY: Record<string, number> = {
      "ccpa-2025-cyber-risk-admt": 0,
      "dbr-2024-registration": 1,
      "ccpa-2023-original": 2,
    };
    const indexed = rows.map((r: any, i: number) => ({ r, i }));
    indexed.sort((a, b) => {
      const pa = PKG_PRIORITY[a.r?.fsor_package] ?? 99;
      const pb = PKG_PRIORITY[b.r?.fsor_package] ?? 99;
      if (pa !== pb) return pa - pb;
      return a.i - b.i;
    });
    return indexed.map((x) => x.r);
  } catch (e) {
    console.warn(`[fsor] retrieve threw: ${e}`);
    return [];
  }
}

// ---- Banned-phrase validator (post-generation, code-side) ----
// BANNED_PHRASES is imported from ../_shared/citation-verifier.ts (unchanged contents).
const BANNED_BARE_WORDS = ["analytics"]; // bare token, no surrounding specificity

/** Returns null if the statement is acceptable; otherwise an explanation. */
function checkBannedPhrase(statement: string | undefined | null): string | null {
  if (!statement || typeof statement !== "string") return null;
  const s = statement.trim();
  if (!s) return null;
  const lower = s.toLowerCase();

  // Very short statements that consist mostly of a banned phrase are non-compliant.
  for (const phrase of BANNED_PHRASES) {
    if (lower === phrase || lower === phrase + ".") {
      return `Statement is exactly the banned phrase "${phrase}"; the regulation requires a specific operationalising description.`;
    }
    // banned phrase makes up most of the statement (no specific detail attached)
    if (lower.includes(phrase) && s.length < phrase.length + 40) {
      return `Statement is dominated by the banned phrase "${phrase}" with no specific detail.`;
    }
  }
  for (const word of BANNED_BARE_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(lower) && s.length < 60) {
      return `Statement uses the bare term "${word}" without operationalising what is measured or why.`;
    }
  }
  return null;
}

function validateSection(text: string | undefined): { status: "pass" | "warn" | "fail"; note: string | null } {
  const note = checkBannedPhrase(text);
  if (!text || text.length < 20) return { status: "warn", note: "Statement is too short to satisfy the regulation's specificity requirement." };
  if (note) return { status: "fail", note };
  return { status: "pass", note: null };
}

// ---- Gating logic ----
function computeGating(partA: any): { ready_for_signoff: boolean; blockers: string[] } {
  const blockers: string[] = [];
  // 1. Banned-phrase validators must pass.
  if (partA?.sec_2_purpose?.validator?.status === "fail") {
    blockers.push("§ 2 purpose statement uses non-specific language; edit before sign-off.");
  }
  if (partA?.sec_5_benefits?.validator?.status === "fail") {
    blockers.push("§ 5 benefits statement uses non-specific language; edit before sign-off.");
  }
  // 2. Every High harm must have at least one linked safeguard.
  const harms = Array.isArray(partA?.sec_6_harms?.harms) ? partA.sec_6_harms.harms : [];
  const allSafeguards = [
    ...(partA?.sec_7_safeguards?.technical ?? []),
    ...(partA?.sec_7_safeguards?.organizational ?? []),
    ...(partA?.sec_7_safeguards?.consumer_facing ?? []),
    ...(partA?.sec_7_safeguards?.contractual ?? []),
  ];
  const linkedHarmCats = new Set<string>();
  for (const sg of allSafeguards) {
    for (const h of sg?.linked_harms ?? []) linkedHarmCats.add(String(h).toLowerCase());
  }
  const unlinked = harms
    .filter((h: any) => (h?.residual_after_safeguards ?? h?.magnitude ?? "").toString().toLowerCase() === "high")
    .filter((h: any) => !linkedHarmCats.has(String(h.category ?? "").toLowerCase()))
    .map((h: any) => h.category);
  if (unlinked.length) {
    blockers.push(`Unlinked High residual-risk harm(s): ${unlinked.join(", ")}. Add a § 7 safeguard linked to each.`);
  }
  // 3. § 8 decision must be actively selected by the user.
  if (!partA?.sec_8_decision?.user_decision) {
    blockers.push("§ 8 decision has not been recorded. The certifying executive must select Proceed / Proceed with conditions / Do not proceed.");
  }
  // 4. Certifying executive identification.
  if (!partA?.cover?.certifying_executive?.name || !partA?.cover?.certifying_executive?.title) {
    blockers.push("Certifying executive name and title are required for sign-off.");
  }
  // 5. Business legal name is required because Part B carries a penalty-of-perjury attestation.
  const bln = String(partA?.cover?.business_legal_name ?? "").trim();
  if (!bln || /\[FILL IN/i.test(bln)) {
    blockers.push("Business legal name missing — Part B contains a penalty-of-perjury attestation; the legal name must be supplied before this document can be signed or submitted.");
  }
  // Strip a trailing "(advisory)" or similar parenthetical from the certifying executive title.
  if (partA?.cover?.certifying_executive?.title) {
    partA.cover.certifying_executive.title = String(partA.cover.certifying_executive.title)
      .replace(/\s*\((?:advisory|interim|acting|temporary|proposed)\)\s*$/i, "")
      .trim();
  }
  return { ready_for_signoff: blockers.length === 0, blockers };
}

// ---- System prompt for the single Part A / Part B generation call ----
const GENERATION_SYSTEM =
`You are a senior California privacy compliance analyst. You are NOT a lawyer and you do not give legal advice. Your job is to draft a structured CPPA Risk Assessment FRAMEWORK that maps 1:1 to Cal. Code Regs. tit. 11 § 7152(a)(1)–(9), pre-populated from the user's intake answers, ready for the user's team to review, complete, and sign.

ABSOLUTE RULES:
1. Output is JSON only. No prose outside JSON. No markdown fences.
2. NEVER use the word "corpus", "retrieval", "RAG", or any synonym for an internal source store. The user document must be silent on coverage.
3. NEVER cite an enforcement record. No FTC matters, no enforcement actions, no settlements as the basis for any conclusion. Guidance is sourced from Cal. Code Regs. tit. 11 §§ 7150–7157, the underlying Civil Code provisions, and the CPPA Final Statement of Reasons only.
4. The RETRIEVED AUTHORITIES, DEADLINES, and FSOR blocks are the ONLY permitted basis for legal/regulatory statements. If a section has no on-point retrieved authority, do not invent one — provide a clearly-marked fill-in prompt for the user instead.
5. You NEVER select the § 8 decision (Proceed / Proceed with conditions / Do not proceed) and you MUST NOT produce any directional recommendation about whether processing should proceed. Always leave sec_8_decision.user_decision = null. The "analysis" field must be a neutral summary of the balance of benefits against residual risks after the § 7 safeguards are applied — it must not endorse, recommend, or argue for any particular outcome. The decision field is reserved for the certifying executive to complete.
6. You NEVER fabricate counts. Any value the user did not provide must be a clearly-marked fill-in placeholder like "[FILL IN]".
7. § 2 (Purpose) and § 5 (Benefits) must be specific. Avoid these phrases entirely unless they appear as one component of a larger specific description: "improve services", "for security purposes", "for business purposes", "analytics" (bare), "to enhance user experience", "as described in our privacy policy", "to provide better services", "to support our business objectives".
8. § 6 (Harms) MUST cover all eight statutory harm categories from § 7152(a)(5): (A) Security, (B) Discrimination on protected characteristics, (C) Loss of control or autonomy over PI, (D) Coercion or compelled disclosure, (E) Economic, (F) Physical, (G) Reputational, (H) Psychological. For each: source/cause, likelihood (Low/Medium/High), magnitude (Low/Medium/High), residual_after_safeguards (Low/Medium/High).
9. § 7 (Safeguards) MUST be organised into four groupings: technical, organizational, consumer_facing, contractual. Every safeguard MUST include linked_harms = an array of § 6 category names it mitigates.
10. § 4 sub-mapping is fixed: A=collection sources, B=retention, C=consumer interaction, D=consumer count, E=disclosures to consumers, F=service providers/contractors/third parties, G=ADMT logic (null unless ADMT trigger fires).
11. § 10 governance commitments: triennial review (§ 7155(a)); 45-day material-change update (§ 7155(a)); 5-year retention (§ 7155(b)); 30-day on-demand production (§ 7156(c)).
12. Where commentary from both the 2025 and 2023 rulemaking packages addresses the same regulation section, treat the 2025 package as controlling and the 2023 package as historical background.
13. SIGNIFICANT-DECISION RULE (critical): Under the final regulations (OAL-approved Sept 2025), "significant decisions" are limited to decisions concerning financial or lending services, housing, education, employment, or healthcare. Advertising — including ad-auction eligibility, audience scoring, and targeting — is NOT a significant decision; behavioral-advertising references were removed from the final regulations. Select § 7150(b)(3) (ADMT for a significant decision) and § 7150(b)(6) (training ADMT) ONLY when the activity's decisions fall in those enumerated categories or the training is for identity/facial/emotion-recognition verification. For advertising activities, the correct triggers are § 7150(b)(1) (selling/sharing for cross-context behavioral advertising) and, where genuinely applicable, § 7150(b)(2) (sensitive PI). When the ADMT triggers do not apply, do not assert § 7220 pre-use-notice or ADMT-opt-out obligations as requirements — describe any such measures as voluntary safeguards.
13a. SELL/SHARE TRIGGER RULE (§ 7150(b)(1)): § 7150(b)(1) applies only when personal information is sold or shared for cross-context behavioural advertising as defined in Civil Code § 1798.140(s). Disclosing personal information to a service provider or contractor under a compliant CCPA service-provider contract that prohibits any use beyond the contracted service is NOT a sale or share and does NOT trigger § 7150(b)(1). When the processing activity is fraud prevention, payment processing, authentication, security, or any back-office operational purpose using contracted processors, § 7150(b)(1) must NOT be selected unless the intake explicitly states the data is sold or shared for advertising. Where the intake value for q5_sell_share does not indicate actual sale or sharing for advertising, do not include § 7150(b)(1) in triggers_selected.
14. SPI CLASSIFICATION RULE: Sensitive personal information includes precise geolocation, government IDs, financial account credentials, racial/ethnic origin, religious beliefs, union membership, genetic data, biometric identifiers used for identification, health data, and contents of mail/email/text. Classification must follow Civil Code § 1798.140(ae) — do not invent additional categories.
15. APPENDIX-CONSISTENCY RULE: Appendix D's § 1798.121 statement must follow from the § 2 purpose. If the purpose includes advertising use of SPI, you cannot state SPI is "used only for service delivery and fraud prevention" — either the SPI classification is wrong or the limitation statement is; resolve before output. Appendices must never contradict the body.
16. RESIDUAL-RISK RUBRIC: When assigning residual_after_safeguards values (Low/Medium/High) in §6 harms, apply this consistent rubric:
- Low = the identified safeguards address the primary risk pathways and residual exposure is unlikely to materialise without a safeguard failure;
- Medium = material residual exposure remains that the safeguards reduce but do not eliminate;
- High = safeguards are insufficient and the risk is likely to materialise without additional mitigations.
Include a one-sentence rationale for each residual-risk level within the harm's guidance field.

OUTPUT SHAPE (every field required unless marked optional):
{
  "part_a": {
    "cover": {
      "business_legal_name": "[FILL IN — business legal name]",
      "activity_name": "string drawn from intake",
      "version": "1.0",
      "effective_date": "ISO date today",
      "scope_statement": "1-2 sentence scope, drawn from intake",
      "next_review_date": "ISO date approx 3 years from today",
      "certifying_executive": { "name": "from i8_certifying_exec_name or [FILL IN]", "title": "from i8_certifying_exec_title or [FILL IN]" }
    },
    "sec_1_trigger": {
      "statute": "Cal. Code Regs. tit. 11 § 7150(b)",
      "triggers_selected": ["array of trigger descriptions matched from intake; cite the subdivision letter"],
      "narrative": "1-2 sentence summary of why this activity is in scope"
    },
    "sec_2_purpose": {
      "statute": "Cal. Code Regs. tit. 11 § 7152(a)(1)",
      "purpose_statement": "specific purpose drawn primarily from intake i1_processing_purpose; do not paraphrase to be vaguer",
      "user_guidance": "short instruction on how the user should refine this section"
    },
    "sec_3_pi_inventory": {
      "statute": "Cal. Code Regs. tit. 11 § 7152(a)(2)",
      "pi_categories": [{"category": "from intake q4", "is_spi": true_or_false_per_7001(ccc)}],
      "minimum_necessary_justification": "draft justification for why each PI category is the minimum necessary to achieve the § 2 purpose",
      "user_guidance": "string"
    },
    "sec_4_operations": {
      "statute": "Cal. Code Regs. tit. 11 § 7152(a)(3)(A)–(G)",
      "a_sources": "collection sources and methods",
      "b_retention": "retention period + criteria from i2_*",
      "c_consumer_interaction": "how consumers interact with the activity",
      "d_consumer_count": "value from i3_ca_consumer_band",
      "e_disclosures": "list disclosure mechanisms from i4_disclosure_mechanisms, mapped against § 7003 conspicuousness",
      "f_service_providers": "list from i6_vendors",
      "g_admt": null_or_object_with_logic_training_fairness_humanReview_from_i5_fields
    },
    "sec_5_benefits": {
      "statute": "Cal. Code Regs. tit. 11 § 7152(a)(4)",
      "to_business": "specific benefit to the business",
      "to_consumer": "specific benefit to the consumer",
      "to_public": "specific benefit to the public (may be 'None identified.' if none)",
      "user_guidance": "string"
    },
    "sec_6_harms": {
      "statute": "Cal. Code Regs. tit. 11 § 7152(a)(5)",
      "harms": [
        {"category": "Security", "source": "...", "likelihood": "...", "magnitude": "...", "residual_after_safeguards": "...", "user_guidance": "..."},
        {"category": "Discrimination on protected characteristics", ...},
        {"category": "Loss of control or autonomy over PI", ...},
        {"category": "Coercion or compelled disclosure", ...},
        {"category": "Economic", ...},
        {"category": "Physical", ...},
        {"category": "Reputational", ...},
        {"category": "Psychological", ...}
      ]
    },
    "sec_7_safeguards": {
      "statute": "Cal. Code Regs. tit. 11 § 7152(a)(6)",
      "technical": [{"name": "...", "description": "...", "linked_harms": ["Security"]}],
      "organizational": [...],
      "consumer_facing": [...],
      "contractual": [...]
    },
    "sec_8_decision": {
      "statute": "Cal. Code Regs. tit. 11 §§ 7152(a)(7), 7154",
      "analysis": "neutral, balanced paragraph weighing benefits against residual risks after § 7 safeguards. Do not endorse or recommend any outcome.",
      "user_decision": null,
      "user_conditions": null,
      "user_guidance": "The certifying executive must record the decision in this section. The analysis above is provided for their consideration only and contains no tool-generated recommendation."
    },
    "sec_9_stakeholders": {
      "statute": "Cal. Code Regs. tit. 11 §§ 7151, 7152(a)(8)",
      "internal_contributors": [{"role": "...", "name": "[FILL IN]"}],
      "external_consultees": [{"role": "...", "name": "[FILL IN]"}]
    },
    "sec_10_governance": {
      "statute": "Cal. Code Regs. tit. 11 §§ 7152(a)(9), 7155, 7156(c)",
      "triennial_review_date": "ISO date",
      "material_change_commitment": "We will update this assessment within 45 days of a material change to the processing activity, per § 7155(a).",
      "retention_commitment": "This assessment will be retained for at least 5 years or for as long as the processing continues, whichever is longer, per § 7155(b).",
      "production_commitment": "We will produce this assessment to the CPPA within 30 days of a written request, per § 7156(c).",
      "approver": {"name": "from i8", "title": "from i8", "date": null}
    },
    "appendices": {
      "a_data_flow": "textual data flow diagram",
      "b_vendor_register": [{"vendor": "...", "role": "...", "pi_categories": [...]}],
      "c_admt_note": null_or_object_when_ADMT,
      "d_spi_note": null_or_object_when_SPI,
      "e_dpia_gap_fill": null_or_object_when_i9_yes
    }
  },
  "part_b": {
    "statute": "Cal. Code Regs. tit. 11 § 7157",
    "business_legal_name": "[FILL IN]",
    "point_of_contact": "from i8 fields",
    "assessment_count_in_period": 1,
    "pi_categories_aggregated": ["from § 3"],
    "spi_flagged": ["subset of above flagged as SPI"],
    "perjury_attestation_block": "I, [NAME], [TITLE], certify under penalty of perjury under the laws of the State of California that the foregoing is true and correct. Executed on [DATE].",
    "submission_banner": "Assessments for processing activities existing when the regulations took effect must be completed by December 31, 2027; first submissions to the CPPA are due April 1, 2028. The California Privacy Protection Agency has not yet opened a submission portal for risk-assessment certifications. Check cppa.ca.gov/regulations for current filing instructions before the April 1, 2028 deadline."
  }
}`;

// ---- Background pipeline ----
async function runPipeline(assessment_id: string) {
  try {
    const { data: row } = await supabase.from("cppa_assessments").select("*").eq("id", assessment_id).single();
    if (!row) return;
    await supabase.from("cppa_assessments").update({ status: "processing" }).eq("id", assessment_id);
    const intake = row.intake_data ?? {};
    const topics = deriveTopics(intake);

    // Retrieve authorities + FSOR (server-side only).
    const retrieval = await fetch(`${SUPABASE_URL}/functions/v1/cppa-retrieve-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
      body: JSON.stringify({ topics, include_deadlines: true, full_text_limit: 8, limit: 14 }),
    }).then((r) => r.json()).catch(() => ({}));
    const authorities = retrieval?.authorities ?? [];
    const deadlines = retrieval?.deadlines ?? [];
    const fsorCommentary = await retrieveFsorCommentary(authorities, topics, intake);

    // Generate Part A + Part B.
    const genUser =
`Produce the CPPA Risk Assessment framework (Part A + Part B) for this intake, grounded in the authorities and FSOR commentary provided. Never reference "corpus" or any enforcement record.

INTAKE DATA:
${JSON.stringify(intake, null, 2)}

RETRIEVED AUTHORITIES (the only permitted basis for legal statements):
${authorities.length ? buildAuthoritiesBlock(authorities) : "(none on point — provide fill-in placeholders rather than inventing citations)"}

RETRIEVED DEADLINES:
${buildDeadlinesBlock(deadlines)}

CPPA FSOR COMMENTARY (Final Statement of Reasons — agency rationale, persuasive only):
${buildFsorBlock(fsorCommentary)}

Return the full JSON in the exact shape specified by the system message. All eight § 7152(a)(5) harm categories must appear. Every § 7 safeguard must include linked_harms.`;

    const tGen = Date.now();
    const gen = await generateOrRetry("google/gemini-3-flash-preview", GENERATION_SYSTEM, genUser, 16000, "generate-v3");
    console.log(`[v3] generate total ${Date.now() - tGen}ms`);
    if (!gen.parsed || !gen.parsed.part_a) {
      await supabase.from("cppa_assessments").update({
        status: "error",
        report_data: { error: "generation_parse_failed", debug: gen.rawText?.slice(0, 4000) ?? "" },
      }).eq("id", assessment_id);
      return;
    }

    let partA = gen.parsed.part_a;
    let partB = gen.parsed.part_b ?? null;

    // ── R0 PART 3: Output lint (gated date + unresolved-token checks). ──
    // Assemble a narrative string from the prose-bearing fields and lint.
    // Retry generation once on hard violations; persist a lint summary
    // alongside the report. Never block delivery.
    const lintViolations: any[] = [];
    {
      const assembleNarrative = (a: any, b: any): string => {
        const out: string[] = [];
        const walk = (o: any) => {
          if (!o) return;
          if (typeof o === "string") { out.push(o); return; }
          if (Array.isArray(o)) { o.forEach(walk); return; }
          if (typeof o === "object") {
            for (const [k, v] of Object.entries(o)) {
              if (["validator", "embedding", "id", "ids"].includes(k)) continue;
              walk(v);
            }
          }
        };
        walk(a); walk(b);
        return out.join("\n\n");
      };
      const referenceDate = new Date().toISOString();
      let lint = lintReportText(assembleNarrative(partA, partB), {
        checkDates: true, checkUnresolvedTokens: true, referenceDate,
      });
      if (hasHardViolations(lint)) {
        try {
          const details = lint.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
          const retry = await generateOrRetry(
            "google/gemini-3-flash-preview", GENERATION_SYSTEM,
            genUser + `\n\nPREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`,
            16000, "generate-v3-lint-retry");
          if (retry.parsed && retry.parsed.part_a) {
            partA = retry.parsed.part_a;
            partB = retry.parsed.part_b ?? partB;
            lint = lintReportText(assembleNarrative(partA, partB), {
              checkDates: true, checkUnresolvedTokens: true, referenceDate,
            });
          }
        } catch (e) {
          console.warn("[cppa-risk] lint retry failed (non-fatal):", e);
        }
      }
      for (const v of lint.violations) lintViolations.push(v);
    }

    // Banned-phrase validators (§§ 2 and 5).
    const v2 = validateSection(partA?.sec_2_purpose?.purpose_statement);
    if (partA?.sec_2_purpose) partA.sec_2_purpose.validator = v2;
    const benefitsConcat = [
      partA?.sec_5_benefits?.to_business,
      partA?.sec_5_benefits?.to_consumer,
      partA?.sec_5_benefits?.to_public,
    ].filter(Boolean).join(" | ");
    const v5 = validateSection(benefitsConcat);
    if (partA?.sec_5_benefits) partA.sec_5_benefits.validator = v5;

    // Gating.
    const gating = computeGating(partA);

    const report_data: any = {
      schema_version: "v3-part-a-part-b",
      generated_at: new Date().toISOString(),
      part_a: partA,
      part_b: partB,
      gating,
      lint_warnings: lintViolations,
      // Admin-only metadata (preserved for the admin sections of the result page):
      retrieval: {
        topics,
        authority_count: authorities.length,
        deadline_count: deadlines.length,
        fsor_count: fsorCommentary.length,
        verified_only_mode: retrieval?.verified_only_mode ?? false,
        warning: retrieval?.warning ?? null,
      },
      fsor_commentary: fsorCommentary,
    };


    const obligation_snapshot = {
      captured_at: new Date().toISOString(),
      module: "risk-assessment-v3",
      topics,
      authorities: (authorities ?? []).map((a: any) => ({
        id: a.id ?? null, citation: a.citation, version: a.version ?? null,
        authority_type: a.authority_type ?? null, effective_date: a.effective_date ?? null,
        official_url: a.official_url ?? null, title: a.title ?? null, status: a.status ?? null,
      })),
      deadlines: (deadlines ?? []).map((d: any) => ({ id: d.id ?? null, citation: d.citation ?? null, label: d.label ?? d.deadline_text ?? null })),
      fsor: (fsorCommentary ?? []).map((f: any) => ({ id: f.id ?? null, regulation_citation: f.regulation_citation ?? null, page_ref: f.page_ref ?? null })),
    };

    await supabase.from("cppa_assessments")
      .update({ status: "complete", report_data, obligation_snapshot })
      .eq("id", assessment_id);
  } catch (e) {
    console.error("run-cppa-risk-assessment v3 error:", e);
    try {
      await supabase.from("cppa_assessments")
        .update({ status: "error", report_data: { error: String(e) } })
        .eq("id", assessment_id);
    } catch { /* ignore */ }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let assessment_id: string | undefined;
  try {
    const body = await req.json();
    assessment_id = body?.assessment_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!assessment_id) {
    return new Response(JSON.stringify({ error: "assessment_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    await supabase.from("cppa_assessments").update({ status: "processing" }).eq("id", assessment_id);
  } catch { /* row presence is re-checked inside runPipeline */ }

  // @ts-ignore Deno Edge Runtime API
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) {
    er.waitUntil(runPipeline(assessment_id));
  } else {
    runPipeline(assessment_id).catch((e) => console.error("pipeline error:", e));
  }

  return new Response(JSON.stringify({ accepted: true, assessment_id }), {
    status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
