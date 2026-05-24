// check-biometric-compliance: per-jurisdiction biometric obligations + BIPA risk.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  biometricTypes: string[];
  orgType: string;
  purpose: string;
  jurisdictions: string[];
  enrolledCount: string;
  assessment_id?: string;
  user_id?: string;
  is_free_tier?: boolean;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// BIPA statutory damages: $1,000/negligent, $5,000/intentional. Mathematical illustration only.
function estimateBIPARisk(enrolledCount: string): { lowEnd: number; highEnd: number; note: string } {
  const countMap: Record<string, number> = {
    "Fewer than 500": 250,
    "500-5,000": 2500,
    "5,000-50,000": 25000,
    "50,000-500,000": 250000,
    "More than 500,000": 500000,
  };
  const count = countMap[enrolledCount] ?? 2500;
  return {
    lowEnd: count * 1000,
    highEnd: count * 5000,
    note: `Based on ${count.toLocaleString()} enrolled individuals × $1,000 (negligent) to $5,000 (intentional) per violation. This is a mathematical illustration only — not a legal opinion.`,
  };
}

function formatEnforcementContext(rows: any[]): string {
  if (!rows || rows.length === 0) return "No specific biometric enforcement precedents retrieved.";
  return rows
    .map(
      (e, i) =>
        `[E${i + 1}] id:${e.id ?? "—"} ${e.regulator ?? "Regulator"} (${e.jurisdiction ?? "—"}), ${
          e.decision_date ? new Date(e.decision_date).getFullYear() : "—"
        }\n   Fine: ${
          e.fine_amount ?? (e.fine_eur_equivalent ? `€${Number(e.fine_eur_equivalent).toLocaleString()}` : "Not disclosed")
        }\n   Failure: ${e.key_compliance_failure ?? e.violation ?? "—"}`
    )
    .join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;

    if (!Array.isArray(body.jurisdictions) || body.jurisdictions.length === 0) {
      return new Response(JSON.stringify({ error: "At least one jurisdiction required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(body.biometricTypes) || body.biometricTypes.length === 0) {
      return new Response(JSON.stringify({ error: "At least one biometric type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1 — enforcement context
    let enforcement_context: any[] = [];
    try {
      const er = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/get-enforcement-context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          tool: "biometric-checker",
          jurisdictions: body.jurisdictions,
          data_categories: ["biometric"],
          biometric: true,
          limit: 12,
        }),
      });
      if (er.ok) {
        const j = await er.json();
        enforcement_context = j.results || j.enforcement_context || [];
      }
    } catch (e) {
      console.error("enforcement fetch failed:", e);
    }

    // Step 2 — BIPA risk
    const bipaApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("illinois") || j.toLowerCase().includes("bipa")
    );
    const bipaRisk = bipaApplies ? estimateBIPARisk(body.enrolledCount) : null;

    // Washington My Health My Data Act applies broadly to "consumer health data"
    // including biometric data tied to health inferences. Private right of action
    // under WA Consumer Protection Act creates litigation exposure.
    const wamhmdApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("washington") || j.toLowerCase().includes("mhmd")
    );

    // "Other US state" is a generic catch-all selection — flag explicitly so the
    // model produces a section covering Texas CUBI + WA MHMD + general state-law
    // posture rather than silently dropping the jurisdiction from output.
    const otherUsStateApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("other us"));

    // Step 3 — Haiku
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a biometric privacy compliance analyst. Analyse the biometric data processing described below and produce a structured compliance assessment for each jurisdiction.

PROCESSING DETAILS
Biometric data types: ${body.biometricTypes.join(", ")}
Organisation type: ${body.orgType}
Primary purpose: ${body.purpose}
Individuals enrolled: ${body.enrolledCount}
Jurisdictions: ${body.jurisdictions.join(", ")}
${bipaRisk ? `
BIPA LITIGATION RISK ESTIMATE (Illinois)
Based on ${body.enrolledCount} enrolled individuals:
Low end (negligent violations): $${bipaRisk.lowEnd.toLocaleString()}
High end (intentional violations): $${bipaRisk.highEnd.toLocaleString()}
${bipaRisk.note}
` : ""}${wamhmdApplies ? `
WASHINGTON MY HEALTH MY DATA ACT (MHMD) — APPLICABILITY FLAG
Washington is in scope. If the biometric data is used to identify health status,
diagnosis, treatment, or to infer any consumer health condition, MHMD applies in
addition to general WA consumer protection law. MHMD requires:
  - separate, opt-in consent (distinct from any biometric consent),
  - a published "consumer health data privacy policy" with specific contents,
  - heightened restrictions on sale and on geofencing around health facilities.
MHMD has a private right of action via the WA Consumer Protection Act.
Address MHMD obligations explicitly in the Washington section.
` : ""}${otherUsStateApplies ? `
OTHER US STATE — APPLICABILITY FLAG
"Other US state" is in scope. Produce a dedicated "Other US State — General US Biometric Privacy Posture" section that:
  - notes Texas Capture or Use of Biometric Identifier Act (CUBI) requirements (notice, consent, retention <=1 year past purpose, no sale absent consent — Texas AG enforcement only, no private right of action),
  - notes Washington My Health My Data Act exposure where biometrics infer health status,
  - covers the broader pattern across CA/CO/CT/VA/UT/OR comprehensive privacy laws treating biometrics as sensitive data requiring opt-in consent and DPIAs,
  - identifies the most likely applicable state regime based on the organisation type and purpose described.
Do NOT skip this section even though no specific state was named.
` : ""}ENFORCEMENT PRECEDENTS
${formatEnforcementContext(enforcement_context)}

For each jurisdiction, structure your output EXACTLY as follows:

[JURISDICTION] — [LAW NAME]

Applies to this organisation: [Yes / Conditional / No] — [one sentence reason]

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
[Numbered list of specific obligations relevant to this org type and purpose]

Consent and notice:
[Specific format, timing, and language requirements]

Retention and destruction:
[Specific rules including any mandatory destruction timelines or schedules]

Sale and sharing restrictions:
[Specific prohibitions]

Current enforcement posture:
[Based on enforcement context: what regulators are actively targeting]

Priority actions:
[3–5 numbered actions specific to this organisation type and purpose]

Compliance risk rating: [LOW / MEDIUM / HIGH / CRITICAL]
[One sentence explaining the rating based on enforcement activity and likely gap]
---

After all jurisdiction sections, add:
===ANNOTATIONS===
followed by a JSON array citing enforcement actions that directly supported a priority action, risk rating, or enforcement posture assessment above. Use the exact id values from the enforcement context above (the value after 'id:'). Only cite cases from the ENFORCEMENT PRECEDENTS above — never from training knowledge. Each annotation object has this shape:
{
  "enforcement_action_id": "exact id string",
  "regulator": "regulator name",
  "jurisdiction": "jurisdiction",
  "decision_date": "YYYY-MM-DD or null",
  "summary": "one sentence what the case involved, max 25 words, plain English",
  "outcome": "rejected | accepted | penalised | required",
  "relevance": "one sentence why this case is relevant to this assessment"
}
If no cases informed the assessment, output an empty array [].

Output ONLY the compliance assessment (then the ===ANNOTATIONS=== block). No preamble.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: `You are a biometric privacy compliance analyst with expertise in BIPA (Illinois), Texas CUBI, Washington MY Health MY Data, CCPA biometric provisions, GDPR Article 9(1) biometric data, and EDPB biometric guidance.

Your task: produce a structured compliance assessment for a described biometric data processing activity, calibrated to the jurisdictions in scope and recent enforcement precedents.

QUALITY STANDARDS:
1. Risk ratings (LOW/MEDIUM/HIGH/CRITICAL) must reflect actual enforcement posture in the named jurisdictions, not theoretical exposure.
2. For BIPA: the litigation risk calculation must account for per-person per-violation statutory damages ($1,000 negligent / $5,000 intentional) and the scale of enrolled individuals provided.
3. Priority actions must be specific — name the law, the requirement, and the concrete control or document the organisation must put in place. No generic "review your practices".
4. Where enforcement precedents show specific omissions that have been sanctioned (e.g. missing written consent, no retention schedule), call those out as priority gaps.

Output ONLY the compliance assessment. No preamble.`,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Claude error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const fullText = aiData.content?.[0]?.text ?? "";
    let assessment_text = fullText
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*/g, '')
      .replace(/^\*\s+/gm, '• ');
    let parsedAnnotations: any[] = [];
    try {
      const sepIdx = fullText.indexOf("===ANNOTATIONS===");
      if (sepIdx !== -1) {
        assessment_text = fullText.slice(0, sepIdx).trim()
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*\*/g, '')
          .replace(/^\*\s+/gm, '• ');
        const annotationsRaw = fullText.slice(sepIdx + "===ANNOTATIONS===".length).trim();
        const cleaned = annotationsRaw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const start = cleaned.indexOf("[");
        const end = cleaned.lastIndexOf("]");
        if (start !== -1 && end !== -1) {
          const arr = JSON.parse(cleaned.slice(start, end + 1));
          if (Array.isArray(arr)) parsedAnnotations = arr;
        }
      }
    } catch (e) {
      console.warn("[Biometric] annotation parse failed (non-fatal):", e);
      parsedAnnotations = [];
    }

    const report_data = {
      bipa_risk: bipaRisk,
      jurisdictions_analysed: body.jurisdictions,
      enforcement_precedents: enforcement_context.slice(0, 5),
      annotations: parsedAnnotations,
      generated_at: new Date().toISOString(),
    };

    let savedId: string | null = null;
    try {
      if (body.assessment_id) {
        const { data, error } = await supabase
          .from("biometric_assessments")
          .update({
            status: "complete",
            intake_data: body,
            jurisdictions: body.jurisdictions,
            analysis_text: assessment_text,
            report_data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.assessment_id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        savedId = data?.id ?? body.assessment_id;
      } else {
        const { data, error } = await supabase
          .from("biometric_assessments")
          .insert({
            user_id: body.user_id ?? null,
            status: "complete",
            intake_data: body,
            jurisdictions: body.jurisdictions,
            analysis_text: assessment_text,
            report_data,
            is_free_tier: !!body.is_free_tier,
          })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }
    } catch (persistErr) {
      console.error("biometric_assessments persist failed:", persistErr);
    }

    return new Response(
      JSON.stringify({
        id: savedId,
        assessment_text,
        bipa_risk: bipaRisk,
        jurisdictions_analysed: body.jurisdictions,
        enforcement_precedents: report_data.enforcement_precedents,
        generated_at: report_data.generated_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("check-biometric-compliance error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
