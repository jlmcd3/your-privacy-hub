import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3.8.0";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";


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
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 2000
): Promise<string> {
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
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// Heavy generation work. Returns when the row has been finalised (status=ready
// or status=failed). Invoked via EdgeRuntime.waitUntil so we can return 202 to
// the caller immediately and avoid the 150s HTTP idle-timeout — generation
// regularly runs 60–120s and an awaited HTTP response can be cut off by the
// platform even though the row eventually finishes.
async function generateAssessment(assessment_id: string, assessment: any): Promise<void> {
  try {
    await runAssessment(assessment_id, assessment);
  } catch (e) {
    console.error("run-li-assessment background error:", e);
    await supabase.from("li_assessments")
      .update({ status: "failed" }).eq("id", assessment_id);
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

    // Kick off heavy work in the background; respond immediately so the
    // caller's HTTP request doesn't sit open for 60–120s and trip the 150s
    // idle-timeout. All client callers (webhook, admin harness, result page)
    // already poll the li_assessments row for status.
    // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
    EdgeRuntime.waitUntil(generateAssessment(assessment_id, assessment));

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
    const classifySystem = `You are a privacy regulatory analyst. Classify processing activities for legitimate interest analysis. Return ONLY valid JSON, no preamble.`;

    // Determine jurisdiction for GDPR authority retrieval (UK if any verified
    // assessment.jurisdictions value matches /united kingdom|uk|gb/i, else EU).
    const liaJurisdictions: string[] = Array.isArray(assessment.jurisdictions) ? assessment.jurisdictions : [];
    const isUk = liaJurisdictions.some((j: string) => /united kingdom|uk|gb/i.test(String(j)));
    const isEu = liaJurisdictions.some((j: string) => /eu|gdpr|european/i.test(String(j))) && !isUk;
    const gdprJurisdiction: "eu" | "uk" = isUk ? "uk" : "eu";
    // Regime gates which enforcement precedents the LIA may cite. UK runs only
    // see UK GDPR / DPA 2018; EU runs only see EU/EEA GDPR enforcement.
    const enforcementRegime: "gdpr" | "uk_gdpr" = isUk ? "uk_gdpr" : "gdpr";
    const regimeLabel = isUk ? "UK GDPR" : "EU GDPR";

    // Run classification, enforcement context fetch, and GDPR authority retrieval in parallel
    const [classifyText, enforcementCtxResult, gdprCtxResult] = await Promise.all([
      callAnthropic(
        "claude-haiku-4-5-20251001",
        classifySystem,
        `Classify this processing activity for legitimate interest analysis:\nDescription: ${assessment.processing_description}\nData categories: ${(assessment.data_categories || []).join(", ")}\nRelationship type: ${assessment.relationship_type || "not specified"}\nSector: ${assessment.sector || "not specified"}\n\nReturn JSON:\n{\n  "use_case_category": "one of: direct_marketing | fraud_prevention | employee_monitoring | behavioral_advertising | research_analytics | it_security | contractual_administration | other",\n  "primary_data_categories": ["list of data categories involved"],\n  "special_category_data": true or false,\n  "relationship_exists": true or false,\n  "jurisdictions_scope": ["list of relevant jurisdictions"]\n}`,
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
      getGdprContext(supabase, {
        articles: ["6"],
        jurisdiction: gdprJurisdiction,
        recitals: [47],
        guidelineArticles: ["6"],
        semanticQuery: assessment.processing_description || "",
      }).catch((e: Error) => { console.error("getGdprContext failed (non-fatal):", e); return { block: "", meta: { attempted: false, error: String(e).slice(0, 200) } as any }; })
    ]);

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
          const verifiedTag = r.verified === false ? " | UNVERIFIED — omit fine" : "";
          const fine = r.verified === false ? "—" : `€${r.fine_eur_equivalent || 0}`;
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

    const analysisSystem = `You are a senior privacy regulatory analyst producing a formal legitimate interest assessment. Your analysis is precise, cites specific regulatory standards (Article 6(1)(f) GDPR, EDPB Guidelines 1/2024 on legitimate interests, ICO LIA guidance, applicable national DPA positions), and is grounded strictly in the facts provided and precedent database. Do NOT invent facts the user did not provide. Where a relevant fact is missing, say so and flag it as an open question. This is a compliance framework tool. All outputs must include the statement: "This analysis is a compliance framework tool and does not constitute legal advice. Review findings with qualified legal counsel." Return ONLY valid JSON, no preamble.

CITATION ACCURACY RULES — non-negotiable:
- ICO Royal Free / DeepMind: the enforcement decision was issued in **2017**, NOT 2023. If you reference it, cite as "ICO Royal Free / DeepMind enforcement decision (2017) and subsequent guidance" — never as "2023 Royal Free / DeepMind enforcement."
- EDPB Recommendations 01/2021 address **supplementary measures for international data transfers post-Schrems II**, not LIA necessity analysis. Do NOT cite EDPB Recommendations 01/2021 as authority for pseudonymisation in a necessity test. For pseudonymisation as a necessity/proportionality measure, cite **EDPB Guidelines 1/2024 §3.2 (necessity and proportionality)** as the primary source; EDPB Recommendations 01/2021 may be cited only as supplementary context if the technical-measures argument also concerns international transfers.
- Do NOT invent enforcement years, fine amounts, or case names. If unsure of a citation detail, use a hedged form (e.g. "ICO guidance, c. 2023") rather than a precise but fabricated date.

MANDATORY FIELD RULES — violations will cause downstream system failures:

1. The "verdict" field is REQUIRED in every test object (purpose_test, necessity_test, balancing_test). You MUST include it even when evidence is incomplete or the outcome is genuinely uncertain. Use "uncertain" — never omit the field.

2. The "closest_accepted_precedent" field MUST be a non-empty string. If no close match exists in the database, write "None identified in current database" — never return null.

3. The "closest_rejected_precedent" field MUST be a non-empty string. If none, write "None identified in current database".

4. PRECEDENT PROSE RULE: The precedent block above tags each entry with a bracketed outcome marker like [REJECTED] for machine readability. NEVER reproduce these bracketed markers in your prose. Refer to precedents in natural language naming the deciding regulator from the entry, e.g. 'a rejected decision by the Hessian DPA concerning keystroke logging'. Never attribute an enforcement decision to the EDPB unless the entry's source field is an EDPB Article 65 binding decision; the EDPB is not a first-instance enforcement body.`
      + (gdprBlock ? `\n\nSTATUTORY AND EDPB AUTHORITY (cite as [Art. X] / [Recital N] / [EDPB ref]; statutory text is verbatim — do not alter it):\n${gdprBlock}` : "");

    const analysisUserBase = `Conduct a three-part legitimate interest assessment for the following proposed processing.

PROPOSED PROCESSING (Stage A):
Description: ${assessment.processing_description}
Data categories: ${(assessment.data_categories || []).join(", ")}
Relationship with data subjects: ${assessment.relationship_type || "not specified"}
Jurisdictions: ${(assessment.jurisdictions || []).join(", ")}
Sector: ${assessment.sector || "not specified"}

STAGE B — PURPOSE FACTS:
Whose interest: ${purposeDetails.interest_holder || "not specified"}
Type of interest: ${purposeDetails.interest_type || "not specified"}
Stated purpose to data subjects: ${assessment.stated_purpose || "not specified"}
Statutory restrictions noted: ${balancingDetails.statutory_restrictions || "none noted"}

STAGE B — NECESSITY FACTS:
Alternatives considered: ${necessityDetails.alternatives || assessment.alternatives_considered || "not specified"}
Why consent not used: ${necessityDetails.why_consent_not_used || "not addressed"}
Data minimisation steps: ${necessityDetails.data_minimised || "not specified"}
Pseudonymisation/aggregation options: ${necessityDetails.pseudonymisation_options || "not addressed"}

STAGE B — BALANCING FACTS:
Reasonable expectation: ${balancingDetails.reasonable_expectation || "not specified"}
Vulnerable subjects involved: ${(balancingDetails.vulnerable_subjects || []).join(", ") || "none indicated"}
Worst-case harm: ${balancingDetails.potential_harm || "not specified"}
Safeguards in place: ${(balancingDetails.safeguards || []).join(", ") || "none specified"}
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

Apply the EDPB Guidelines 1/2024 three-part test. For each step, test the SPECIFIC facts above — do not generalise. Return JSON with this exact structure:
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

    async function runStage2(extraUser: string): Promise<string> {
      const finalUser = extraUser ? `${analysisUserBase}\n\n${extraUser}` : analysisUserBase;
      return await callAnthropic("claude-sonnet-4-6", analysisSystem, finalUser, 5000);
    }

    let analysisText = await runStage2("");
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
        const retryText = await runStage2(
          `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`
        );
        const retryParsed = parseLlmJson(retryText);
        if (retryParsed) {
          analysis = retryParsed;
          lintAnalysis(analysis);
        }
      } catch (e) {
        console.warn("[LIA] lint retry failed (non-fatal):", e);
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
    const docsSystem = `You are a privacy regulatory analyst producing practical documentation guidance. Focus on what documentation would make this legitimate interest assessment defensible. Return ONLY valid JSON, no preamble.

CITATION ACCURACY RULE: In the 'basis' field for each recommended document, cite regulatory instruments by name and provision in general terms only (e.g. 'GDPR Article 35 and EDPB Guidelines on DPIA'). Do NOT cite specific enforcement case names, fine amounts, or decision dates — those are only available in Stage 2 where the enforcement corpus is injected. If you are uncertain of a specific provision number, describe the obligation in plain language rather than citing a potentially incorrect section number.`;

    const docsText = await callAnthropic(
      "claude-sonnet-4-6",
      docsSystem,
      `Based on this legitimate interest analysis, provide documentation recommendations.

Processing activity: ${assessment.processing_description}
Argument strength: ${analysis.overall_assessment?.argument_strength || "uncertain"}
Balancing test status: ${analysis.balancing_test?.verdict || "uncertain"}
Key risk factors: ${JSON.stringify(analysis.balancing_test?.risk_factors || [])}

PRECEDENT DATABASE:
${precedentContext}

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
  "disclaimer": "This analysis is a compliance framework tool and does not constitute legal advice. Review findings with qualified legal counsel before relying on legitimate interest as a processing legal basis."
}`,
      3500
    );

    let docRecs: any = parseLlmJson(docsText);
    if (!docRecs) {
      console.error("[LIA] Stage 3 parse failed even with repair. Length:", docsText.length);
      docRecs = {
        recommended_documentation: [],
        disclaimer: "This is a compliance framework tool, not legal advice."
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
      disclaimer: "This report is a compliance framework tool produced to assist in identifying areas for legal review. It does not constitute legal advice. All findings should be reviewed with qualified legal counsel before relying on legitimate interest as a processing legal basis under GDPR Article 6(1)(f) or equivalent provisions.",
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

