import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      max_tokens: 6000,
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

    // Fetch CPPA cybersecurity-relevant enforcement context (breach + CA focus)
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
            breach: true,
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

    const system = `You are a cybersecurity readiness analyst specialising in California's CPPA cybersecurity audit regulations (effective 2026 for highest-risk businesses). You map an organisation's controls against the CPPA's 18 enumerated cybersecurity programme components and produce a structured readiness report. You never give legal advice.
Respond ONLY with valid JSON matching the schema provided.`;

    const userPrompt = `Based on this organisation's CPPA cybersecurity readiness intake, produce a structured report scoring each of the 18 control areas.

Intake data:
${JSON.stringify(row.intake_data, null, 2)}

${enforcementContext ? `Recent breach / cybersecurity enforcement context (use to calibrate severity and cite where directly relevant, tagged [E1], [E2], etc.):\n${enforcementContext}\n\nANNOTATION REQUIREMENT: For each enforcement action cited above, if it directly supports a control finding, severity rating, or remediation in your report, include it in the annotations array using the id value from the enforcement context exactly as provided (the value after 'id:'). You MUST only cite enforcement actions from the context above — never cite cases from training knowledge.\n` : ""}
Respond with this exact JSON structure:
{
  "executive_summary": "string (150-200 words — overall readiness posture and top 3 priorities)",
  "overall_score": 0,
  "readiness_level": "Audit-Ready | Substantially Ready | Material Gaps | Critical Gaps",
  "controls": [
    {
      "control": "string (one of the 18 CPPA cybersecurity programme components)",
      "score": 0,
      "status": "Implemented | Partial | Gap | Critical Gap",
      "finding": "string (1-2 sentences — specific gap or confirmation only)",
      "regulatory_basis": "string (cite the CPPA cybersecurity audit regulation section)",
      "remediation": "string (2-3 specific steps, plain language)",
      "priority": "Immediate | Within 90 days | Within 6 months | Monitor"
    }
  ],
  "top_risks": [
    { "title": "string", "description": "string", "deadline": "string", "consequence": "string" }
  ],
  "enforcement_context": "string (2-3 sentences on CPPA cybersecurity audit timing and enforcement priorities)",
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

The 18 CPPA cybersecurity programme components to assess (one object per control):
1. Authentication and access controls
2. Encryption of personal information
3. Zero-trust architecture
4. Account management and access control
5. Inventory of personal information and systems
6. Secure configuration of hardware and software
7. Vulnerability management and patching
8. Audit-log management
9. Network monitoring and defence
10. Anti-malware protections
11. Network segmentation
12. Limitation of physical access
13. Secure development of software
14. Oversight of service providers, contractors, and third parties
15. Retention schedules and secure disposal
16. Cybersecurity awareness, education and training
17. Incident response and post-incident analysis
18. Business continuity and disaster recovery`;

    const text = await callAnthropic(system, userPrompt);
    let report: any = {};
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) {
      console.error("[CPPA Cyber] No JSON found in response. Length:", text.length, "Preview:", text.slice(0, 300));
    } else {
      try { report = JSON.parse(m[0]); } catch (e) {
        console.error("[CPPA Cyber] Parse error:", e, "Tail:", text.slice(-200));
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
    console.error("run-cppa-cybersecurity error:", e);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.assessment_id) {
        await supabase.from("cppa_assessments").update({ status: "error" }).eq("id", body.assessment_id);
      }
    } catch (_) { /* ignore */ }
    const isTimeout = (e as any)?.name === "TimeoutError";
    return new Response(JSON.stringify({ error: isTimeout ? "Assessment timed out — please retry" : "Assessment failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
