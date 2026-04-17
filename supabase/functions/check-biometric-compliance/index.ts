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
        `${i + 1}. ${e.regulator ?? "Regulator"} (${e.jurisdiction ?? "—"}), ${
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
` : ""}
ENFORCEMENT PRECEDENTS
${formatEnforcementContext(enforcement_context)}

For each jurisdiction, structure your output EXACTLY as follows:

### [JURISDICTION] — [LAW NAME]

**Applies to this organisation:** [Yes / Conditional / No] — [one sentence reason]

**Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:**
[Numbered list of specific obligations relevant to this org type and purpose]

**Consent and notice:**
[Specific format, timing, and language requirements]

**Retention and destruction:**
[Specific rules including any mandatory destruction timelines or schedules]

**Sale and sharing restrictions:**
[Specific prohibitions]

**Current enforcement posture:**
[Based on enforcement context: what regulators are actively targeting]

**Priority actions:**
[3–5 numbered actions specific to this organisation type and purpose]

**Compliance risk rating:** [LOW / MEDIUM / HIGH / CRITICAL]
[One sentence explaining the rating based on enforcement activity and likely gap]
---

Output ONLY the compliance assessment. No preamble.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
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
    const assessment_text = aiData.content?.[0]?.text ?? "";

    const report_data = {
      bipa_risk: bipaRisk,
      jurisdictions_analysed: body.jurisdictions,
      enforcement_precedents: enforcement_context.slice(0, 5),
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
