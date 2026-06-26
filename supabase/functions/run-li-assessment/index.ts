import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3.8.0";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun, type FnRunHandle } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type ToolModule, type SystemBlock } from "../_shared/prompt-core.ts";
import { renderGdprCitationBlock } from "../_shared/gdpr-registry.ts";



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
  "Cite Article 6(1)(f) GDPR/UK GDPR, EDPB Guidelines 1/2024 (balancing test = §4; necessity = §3, proportionality §3.2; purpose §2 — never cite a non-existent §3.3), ICO LIA guidance, and applicable national DPA positions. Use ONLY the injected RESOLVED GDPR CITATIONS block for Article-6 legitimate-interest examples (direct marketing / intra-group / network-information security), for the recognised-LI basis where applicable, and for supervisory-authority names. Do NOT cite Article-6 examples or SA names from your own recollection.";

const LIA_ANALYSIS_EXTRA_RULES = [
  "FACT DISCIPLINE — non-negotiable: Analyse ONLY the facts the controller actually stated. Do NOT introduce any specific diagnosis, disease, condition, technology, methodology, or named use case the controller did not write — for example, do not infer 'cancer', 'oncology', 'recurrence prediction', 'AI', 'machine learning', or 'model training' from a general description of research or data use. Do NOT make a vague description concrete by supplying a plausible specific example of it. Restate the controller's purpose and processing in their own terms, and characterise them no more specifically than they did. When the description is generic or vague, that vagueness is itself a finding: record it under risk_factors / open_questions (e.g. 'the stated purpose is described too generically to assess specificity under §2') rather than inventing a specific version to assess.",
  "CITATION ACCURACY RULES — non-negotiable:\n- ICO Royal Free / DeepMind: the enforcement decision was issued in 2017, NOT 2023. If you reference it, cite as 'ICO Royal Free / DeepMind enforcement decision (2017) and subsequent guidance' — never as '2023 Royal Free / DeepMind enforcement.'\n- EDPB Recommendations 01/2021 address supplementary measures for international data transfers post-Schrems II, not LIA necessity analysis. Do NOT cite EDPB Recommendations 01/2021 as authority for pseudonymisation in a necessity test. For pseudonymisation as a necessity/proportionality measure, cite EDPB Guidelines 1/2024 §3.2 (necessity and proportionality) as the primary source.\n- Do NOT invent enforcement years, fine amounts, or case names.",
  "EDPB BALANCING SECTION RULE — non-negotiable: When citing EDPB Guidelines 1/2024 for the balancing test (the four-factor framework), always cite §4. NEVER cite '§3.3' — section 3.3 does not exist in those Guidelines. Structure: §2 = purpose test, §3 = necessity test (§3.1 general, §3.2 proportionality), §4 = balancing test.",
  "RECITAL/EXAMPLE CITATION RULE: Cite Article-6 legitimate-interest examples and the recognised-LI basis ONLY from the injected RESOLVED GDPR CITATIONS block. Do not author Article 6(11), Article 6(1)(ea), or Recital 47/48/49 references from memory; copy the form supplied in that block.",
  "DPO ROLE RULE — non-negotiable: The DPO's role under GDPR Articles 38–39 is to advise, inform, and monitor — NOT to approve or sign off on the controller's lawful basis decisions. NEVER use language such as 'DPO sign-off', 'DPO approval', 'DPO approves the LIA'. The correct formulation is always: 'DPO consulted and advice documented' or 'record of DPO consultation' or 'DPO involvement recorded per Article 38(1)'.",
  "ePRIVACY / PECR RULE: If the proposed processing involves cookies, device identifiers, advertising identifiers (GAID, IDFA), device fingerprints, SDKs, pixels, local storage, or any mechanism for storing or accessing information on a user's device, you MUST include the following as a risk factor: 'This GDPR Article 6(1)(f) analysis does not resolve ePrivacy obligations. Storing or accessing information on user devices requires a separate consent or exemption under the ePrivacy Directive (2002/58/EC) and, in the UK, PECR 2003. A valid GDPR lawful basis alone is not sufficient.'",
  "ADTECH PECR CROSS-REFERENCE RULE: If the sector is AdTech, Digital Media, advertising, or programmatic advertising AND device identifiers appear in the data categories, add to purpose_test.risk_factors verbatim: 'Note: ePrivacy Directive / UK PECR compliance for storage of or access to device identifiers (including SDK identifiers, mobile advertising IDs, and browser fingerprints) must be assessed separately — GDPR Article 6(1)(f) lawful basis does not satisfy PECR consent requirements.'",
  "PRECEDENT PROSE RULE: The precedent block tags each entry with a bracketed outcome marker like [REJECTED] for machine readability. NEVER reproduce these bracketed markers in your prose. Refer to precedents in natural language naming the deciding regulator. Never attribute an enforcement decision to the EDPB unless the entry's source is an EDPB Article 65 binding decision.",
  "INTAKE-FACT CONSISTENCY RULE: if the intake names the controller/organisation, use that name and NEVER state that the controller has not been named.",
  "MINES REGULATIONS CITATION RULE: When citing the Mines Regulations 2014, describe the duty as arrangements to know who is below ground and to respond to emergencies. Do not characterise it as requiring continuous location monitoring.",
  "HANDBOOK TRANSPARENCY RULE: If a handbook addendum is cited as a transparency mitigation, note in the same breath that a standalone worker notice is still expected.",
  "BALANCING-RECORD RULE: Do not duplicate balancing-record content: the 'Balancing Record — Must Include' list should reference, not restate, items already specified under the LIA documentation recommendation. Use UK employment terminology (trade union / elected worker representatives) rather than 'works council' unless the intake uses that term.",
  "CHILDREN'S CODE ATTRIBUTION RULE: The ICO Age Appropriate Design Code is a statutory code of practice issued under section 123 of the Data Protection Act 2018 — NOT under PECR. Always describe it as 'ICO statutory code of practice under DPA 2018 s.123'.",
  "MANDATORY FIELDS: The 'verdict' field is REQUIRED in every test object (use 'uncertain' if unclear — never omit). 'closest_accepted_precedent' and 'closest_rejected_precedent' MUST be non-empty strings; write 'None identified in current database' if no match.",
  "TIER FRAMING (annotations): Each enforcement precedent is tagged TIER 1/2/3. TIER 1 = in-regime (binding). TIER 2 = cross-channel persuasive (non-binding; expressly framed as such). TIER 3 = non-EU/UK supportive only (never cite as authority). Every annotation MUST include authority_tier matching the [E#] tag and authority_framing per the mapping: 1→in_regime, 2→persuasive_not_binding, 3→supportive_not_authoritative. UNVERIFIED rows: never state a fine amount.",
].join("\n\n");

const LIA_ANALYSIS_TOOL_MODULE: ToolModule = {
  identity:
    "You are a senior privacy regulatory analyst producing a formal legitimate interest assessment under GDPR / UK GDPR, applying the EDPB Guidelines 1/2024 three-part test (purpose, necessity, balancing) to the specific facts provided.",
  citationFramework: LIA_SHARED_CITATION_FRAMEWORK,
  outputMode: "strict-JSON",
  extraRules: LIA_ANALYSIS_EXTRA_RULES,
};

const LIA_CLASSIFY_TOOL_MODULE: ToolModule = {
  identity:
    "You are a privacy regulatory analyst classifying processing activities for legitimate interest analysis.",
  citationFramework: LIA_SHARED_CITATION_FRAMEWORK,
  outputMode: "strict-JSON",
};

const LIA_DOCS_TOOL_MODULE: ToolModule = {
  identity:
    "You are a privacy regulatory analyst producing practical documentation guidance for a legitimate interest assessment. Focus on what documentation would make this LIA defensible.",
  citationFramework: LIA_SHARED_CITATION_FRAMEWORK,
  outputMode: "strict-JSON",
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
    await supabase.from("li_assessments")
      .update({ status: "failed" }).eq("id", assessment_id);
    await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id } });
  }
}

Deno.serve(async (req) => {
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

    const { data: assessment, error: fetchErr } = await supabase
      .from("li_assessments")
      .select("*")
      .eq("id", assessment_id)
      .single();

    if (fetchErr || !assessment) {
      return new Response(JSON.stringify({ error: "Assessment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("li_assessments").update({ status: "processing" })
      .eq("id", assessment_id);

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
        articles: ["6"],
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

    const ukGuidanceFraming = isUk
      ? `UK GUIDANCE FRAMING (regime is UK GDPR): Where this analysis cites EDPB Guidelines 1/2024, frame EDPB guidance as persuasive post-Brexit — the ICO's legitimate interests guidance is the primary UK reference. Note where the Data (Use and Access) Act 2025 recognised-legitimate-interests changes may be relevant.`
      : "";

    const analysisInjected = [
      enforcementContextStr ? `ENFORCEMENT PRECEDENTS (cite by code [E1]–[E5]; each entry shows its tier and verification status):\n${enforcementContextStr}` : "",
      gdprBlock ? `STATUTORY AND EDPB AUTHORITY (cite as [Art. X] / [Recital N] / [EDPB ref]; statutory text is verbatim — do not alter it):\n${gdprBlock}` : "",
      ukGuidanceFraming,
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
    "analysis": "3-4 sentences. Test whether the processing is the LEAST intrusive way to achieve the stated purpose, given the alternatives the user considered, the data minimisation they described, and any pseudonymisation potential.",
    "risk_factors": ["factors weakening necessity, e.g. overly broad data, weak alternatives analysis"],
    "supporting_factors": ["factors strengthening necessity"],
    "open_questions": ["facts that would affect this verdict"]
  },
  "balancing_test": {
    "verdict": "likely_passes | likely_fails | uncertain",
    "analysis": "4-5 sentences applying the EDPB four-factor balancing: (1) reasonable expectations, (2) nature of the relationship, (3) potential impact and severity, (4) safeguards including opt-out. Address vulnerable subjects if any.",
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
  ]
}`;

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
        ? "No enforcement decisions matching this jurisdiction and processing theory were retrieved from the precedent database. The analysis above may reference relevant decisions that are not yet indexed against this scenario — verify any cited cases directly."
        : null,
      three_part_test: analysis,
      lint_warnings: lintViolations,
      annotations: (() => { try { return Array.isArray(analysis?.annotations) ? analysis.annotations : []; } catch { return []; } })(),
      documentation_recommendations: docRecs,
      disclaimer: "This report helps your organisation identify areas for legal review. It does not constitute legal advice. All findings should be reviewed with qualified legal counsel before relying on legitimate interest as a processing legal basis under UK GDPR, EU GDPR, or equivalent provisions.",
      data_currency_note: `Precedent database last updated: ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}. Regulatory positions evolve. Verify against current DPA guidance.`
    };

    await supabase.from("li_assessments").update({
      status: "complete",
      report_data: reportData,
      updated_at: new Date().toISOString(),
    }).eq("id", assessment_id);

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
    await supabase.from("li_assessments")
      .update({ status: "failed" }).eq("id", assessment_id);
    throw e;
  }
}

