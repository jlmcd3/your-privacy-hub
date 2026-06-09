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
      max_tokens: 12000,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || "";
}

async function runAssessment(assessment_id: string): Promise<void> {
  const { data: row } = await supabase
    .from("cppa_assessments")
    .select("*")
    .eq("id", assessment_id)
    .single();

  if (!row) {
    console.error(`[CPPA Cyber] assessment ${assessment_id} not found`);
    return;
  }

  await supabase
    .from("cppa_assessments")
    .update({ status: "processing" })
    .eq("id", assessment_id);

  try {
    // Fetch CPPA cybersecurity-relevant enforcement context (breach + CA focus)
    let enforcementContext = "";
    let enforcementResults: any[] = [];
    try {
      // Hotfix (June 8): intake submits `{ profile: { industry, ... }, maturity, notes }`,
      // so the correct sector path is intake_data.profile.industry.
      const intake = (row.intake_data as any) ?? {};
      const sector = intake?.profile?.industry
        ?? intake?.industry_sector
        ?? intake?.sector
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
      console.warn("[CPPA Cyber] enforcement context fetch failed:", e);
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
    let report: any = null;
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) {
      // Structured parse-failure log (hotfix): never silently mark `complete` with an empty report.
      console.error(JSON.stringify({
        event: "cppa_cyber_parse_failure",
        reason: "no_json_object_in_response",
        assessment_id,
        response_length: text.length,
        preview: text.slice(0, 300),
      }));
    } else {
      try {
        report = JSON.parse(m[0]);
      } catch (e) {
        console.error(JSON.stringify({
          event: "cppa_cyber_parse_failure",
          reason: "json_parse_error",
          assessment_id,
          error: String(e),
          tail: text.slice(-300),
        }));
      }
    }

    if (!report || typeof report !== "object" || !Array.isArray(report.controls) || report.controls.length === 0) {
      // Don't land an empty report as `complete` — surface as error so UI shows retry, not blank page.
      await supabase
        .from("cppa_assessments")
        .update({ status: "error" })
        .eq("id", assessment_id);
      return;
    }

    report.annotations = Array.isArray(report?.annotations) ? report.annotations : [];

    // Strip any stray markdown the model produced in prose fields
    report.executive_summary = stripMd(report.executive_summary);
    report.enforcement_context = stripMd(report.enforcement_context);
    report.controls = report.controls.map((c: any) => ({
      ...c,
      finding: stripMd(c?.finding),
      regulatory_basis: stripMd(c?.regulatory_basis),
      remediation: stripMd(c?.remediation),
    }));
    report.top_risks = (Array.isArray(report.top_risks) ? report.top_risks : []).map((r: any) => ({
      ...r,
      title: stripMd(r?.title),
      description: stripMd(r?.description),
      consequence: stripMd(r?.consequence),
    }));
    report.next_steps = (Array.isArray(report.next_steps) ? report.next_steps : []).map((s: any) =>
      typeof s === "string" ? stripMd(s) : s
    );

    // Obligation snapshot: freeze the cybersecurity audit corpus (§§ 7120–7124)
    // used to evaluate the 18 controls, so the report stays reproducible if any
    // section is later superseded. Pull current rows once at completion.
    const CYBER_CITATIONS = [
      "11 CCR § 7120",
      "11 CCR § 7121",
      "11 CCR § 7122",
      "11 CCR § 7123",
      "11 CCR § 7124",
    ];
    const { data: authRows } = await supabase
      .from("cppa_authorities")
      .select("id, citation, version, authority_type, authority_weight, effective_date, official_url, title, status")
      .in("citation", CYBER_CITATIONS)
      .eq("status", "current");
    const { data: fsorRows } = await supabase
      .from("cppa_fsor_commentary")
      .select("id, regulation_citation, page_ref, fsor_package, comment_summary, agency_response, source_url")
      .in("regulation_citation", CYBER_CITATIONS);

    // Per-control "What the agency said" attachment.
    // The 18 enumerated cybersecurity components live in § 7122(a)(1)–(18).
    // For each control, attach matching subsection commentary plus the
    // section-level § 7122 commentary as context. Controls whose mapping
    // resolves to §§ 7125–7128 (currently none of the 18) will produce
    // an empty array — the UI omits the callout in that case.
    const fsorByCitation = new Map<string, any[]>();
    for (const row of fsorRows ?? []) {
      const key = row.regulation_citation;
      if (!fsorByCitation.has(key)) fsorByCitation.set(key, []);
      fsorByCitation.get(key)!.push(row);
    }
    const sectionFsor = fsorByCitation.get("11 CCR § 7122") ?? [];
    report.controls = report.controls.map((c: any, idx: number) => {
      const subsection = `11 CCR § 7122(a)(${idx + 1})`;
      const subFsor = fsorByCitation.get(subsection) ?? [];
      return {
        ...c,
        fsor_citation: subsection,
        fsor_commentary: [...subFsor, ...sectionFsor],
      };
    });

    const obligation_snapshot = {
      captured_at: new Date().toISOString(),
      module: "cybersecurity",
      authorities: authRows ?? [],
      fsor: fsorRows ?? [],
      retrieval_meta: {
        authority_count: (authRows ?? []).length,
        fsor_count: (fsorRows ?? []).length,
      },
    };

    await supabase
      .from("cppa_assessments")
      .update({ status: "complete", report_data: report, obligation_snapshot })
      .eq("id", assessment_id);

  } catch (e) {
    console.error("[CPPA Cyber] runAssessment error:", e);
    await supabase
      .from("cppa_assessments")
      .update({ status: "error" })
      .eq("id", assessment_id);
  }
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

    // Hotfix (June 8): Anthropic call can run for several minutes; return 202 immediately
    // and continue work in the background so the client doesn't time out (504).
    // Client polls cppa_assessments.status to know when the report is ready.
    // @ts-ignore — EdgeRuntime is provided by the Supabase edge runtime
    EdgeRuntime.waitUntil(runAssessment(assessment_id));

    return new Response(JSON.stringify({ accepted: true, assessment_id }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-cppa-cybersecurity dispatch error:", e);
    return new Response(JSON.stringify({ error: "Assessment dispatch failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
