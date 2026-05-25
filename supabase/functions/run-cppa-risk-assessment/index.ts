import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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



async function callAnthropic(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(140_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || "";
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

    const { data: row } = await supabase
      .from("cppa_assessments")
      .select("*")
      .eq("id", assessment_id)
      .single();

    if (!row) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("cppa_assessments")
      .update({ status: "processing" })
      .eq("id", assessment_id);

    // Fetch CPPA/CCPA-relevant enforcement context for grounding
    let enforcementContext = "";
    let enforcementResults: any[] = [];
    try {
      const sector = (row.intake_data as any)?.industry_sector
        ?? (row.intake_data as any)?.sector
        ?? undefined;
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
            jurisdictions: ["California", "United States", "US-CA"],
            sector,
            limit: 6,
          }),
        },
      );
      if (ecRes.ok) {
        const ec = await ecRes.json();
        enforcementResults = ec?.results || [];
        if (enforcementResults.length) {
          enforcementContext = enforcementResults.map((r: any, i: number) =>
            `[E${i + 1}] id:${r.id} ${r.regulator} v ${r.subject} (${r.decision_date ?? "n.d."}): ${r.violation ?? r.key_compliance_failure ?? ""} | Fine: ${r.fine_amount ?? "n/a"} | ${r.source_url ?? ""}`
          ).join("\n");
        }
      }
    } catch (e) {
      console.warn("enforcement context fetch failed:", e);
    }

    const system = `You are a California privacy law compliance analyst specialising in CCPA/CPRA and CPPA enforcement. You produce structured compliance gap reports for businesses preparing for CPPA audits. You never give legal advice — you present findings calibrated to enforcement patterns from CPPA and AG enforcement actions.
Respond ONLY with valid JSON matching the schema provided.`;

    const userPrompt = `Based on this organisation's CPPA compliance intake answers, produce a structured risk assessment report.

Intake data:
${JSON.stringify(row.intake_data, null, 2)}

${enforcementContext ? `Recent CPPA / California AG enforcement context (use to calibrate risk levels and cite where directly relevant, tagged [E1], [E2], etc.):\n${enforcementContext}\n\nANNOTATION REQUIREMENT: For each enforcement action cited above, if it directly supports a finding, risk rating, or remediation in your report, include it in the annotations array using the id value from the enforcement context exactly as provided (the value after 'id:'). You MUST only cite enforcement actions from the context above — never cite cases from training knowledge.\n` : ""}
Respond with this exact JSON structure:
{
  "executive_summary": "string (150-200 words — overall compliance posture and top 3 priorities)",
  "scope_confirmation": {
    "in_scope": true,
    "threshold_met": "string (which threshold was met)",
    "applicable_deadlines": ["string"]
  },
  "overall_score": 0,
  "risk_level": "Critical | High | Medium | Low",
  "domains": [
    {
      "domain": "string",
      "score": 0,
      "status": "Compliant | Partial | Gap | Critical Gap",
      "finding": "string (2-3 sentences)",
      "regulatory_basis": "string (cite specific CCPA/CPRA section or CPPA regulation)",
      "remediation": "string (specific, actionable steps)",
      "priority": "Immediate | Within 90 days | Within 6 months | Monitor"
    }
  ],
  "top_risks": [
    { "title": "string", "description": "string", "deadline": "string", "consequence": "string" }
  ],
  "enforcement_context": "string (2-3 sentences on CPPA enforcement priorities relevant to this business)",
  "next_steps": ["string"],
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

Domains to assess (one object per domain):
1. Consumer Rights Infrastructure
2. Privacy Notices and Transparency
3. Opt-Out of Sale and Sharing
4. Sensitive Personal Information
5. Automated Decision-Making
6. Data Retention and Minimisation
7. Third-Party Contracts and Data Sharing Agreements
8. Incident Response and Breach Notification
9. Employee Training and Awareness
10. CPPA Audit Readiness

Key regulatory deadline: CPPA cybersecurity audit regulations take effect for highest-risk businesses by December 31, 2027. This deadline must be referenced in applicable_deadlines and in at least one domain finding.`;

    const text = await callAnthropic(system, userPrompt);
    let report: any = {};
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) {
      console.error("[CPPA Risk] No JSON found in response. Length:", text.length, "Preview:", text.slice(0, 300));
    } else {
      try { report = JSON.parse(m[0]); } catch (e) {
        console.error("[CPPA Risk] Parse error:", e, "Tail:", text.slice(-200));
      }
    }

    try {
      report.annotations = Array.isArray(report?.annotations) ? report.annotations : [];
    } catch { report.annotations = []; }

    await supabase
      .from("cppa_assessments")
      .update({ status: "complete", report_data: report })
      .eq("id", assessment_id);

    return new Response(JSON.stringify({ success: true, assessment_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-cppa-risk-assessment error:", e);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.assessment_id) {
        await supabase.from("cppa_assessments").update({ status: "error" }).eq("id", body.assessment_id);
      }
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ error: "Assessment failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
