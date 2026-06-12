import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";

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
    let enforcementMeta: any = { attempted: false };
    let enforcementSector: string | undefined;
    try {
      // Hotfix (June 8): intake submits `{ profile: { industry, ... }, maturity, notes }`,
      // so the correct sector path is intake_data.profile.industry.
      const intake = (row.intake_data as any) ?? {};
      const sector = intake?.profile?.industry
        ?? intake?.industry_sector
        ?? intake?.sector
        ?? undefined;
      enforcementSector = sector;
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
        enforcementMeta = {
          attempted: true,
          total_matched: typeof ec?.total_matched === "number" ? ec.total_matched : null,
          query_descriptor: `cybersecurity breach context${enforcementSector ? ` in ${enforcementSector}` : ""}`,
        };
        if (enforcementResults.length) {
          enforcementContext = enforcementResults.map((r: any, i: number) =>
            `[E${i + 1}] id:${r.id} ${r.regulator} v ${r.subject} (${r.decision_date ?? "n.d."}): ${r.violation ?? r.key_compliance_failure ?? ""} | Fine: ${r.fine_amount ?? "n/a"} | ${r.source_url ?? ""}`
          ).join("\n");
        }
      }
    } catch (e) {
      console.warn("[CPPA Cyber] enforcement context fetch failed:", e);
    }

    const system = `You are a cybersecurity readiness analyst specialising in California's CPPA cybersecurity audit regulations. The CPPA cybersecurity audit regulations (11 CCR §§ 7120–7124) were approved by OAL in September 2025 and took effect January 1, 2026; first audit certifications are due April 1, 2028 (businesses >$100M 2026 revenue), April 1, 2029 ($50–100M), and April 1, 2030 (<$50M). Never describe the regulations as proposed, and never present a readiness deadline earlier than the business's applicable phase-in date. You map an organisation's controls against the CPPA's 18 enumerated cybersecurity programme components and produce a structured readiness report. You never give legal advice.
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
      "regulatory_basis": "string (the specific programme component being assessed, in plain language — do NOT include a section citation; the citation is added by the system)",
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

    async function generateReport(extra: string): Promise<any | null> {
      const finalUser = extra ? `${userPrompt}\n\n${extra}` : userPrompt;
      const text = await callAnthropic(system, finalUser);
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) {
        console.error(JSON.stringify({
          event: "cppa_cyber_parse_failure",
          reason: "no_json_object_in_response",
          assessment_id,
          response_length: text.length,
          preview: text.slice(0, 300),
        }));
        return null;
      }
      try {
        return JSON.parse(m[0]);
      } catch (e) {
        console.error(JSON.stringify({
          event: "cppa_cyber_parse_failure",
          reason: "json_parse_error",
          assessment_id,
          error: String(e),
          tail: text.slice(-300),
        }));
        return null;
      }
    }

    function normaliseReport(r: any): void {
      r.annotations = Array.isArray(r?.annotations) ? r.annotations : [];
      r.executive_summary = stripMd(r.executive_summary);
      r.enforcement_context = stripMd(r.enforcement_context);
      r.controls = (Array.isArray(r.controls) ? r.controls : []).map((c: any) => ({
        ...c,
        finding: stripMd(c?.finding),
        regulatory_basis: stripMd(c?.regulatory_basis),
        remediation: stripMd(c?.remediation),
      }));
      r.top_risks = (Array.isArray(r.top_risks) ? r.top_risks : []).map((t: any) => ({
        ...t,
        title: stripMd(t?.title),
        description: stripMd(t?.description),
        consequence: stripMd(t?.consequence),
      }));
      r.next_steps = (Array.isArray(r.next_steps) ? r.next_steps : []).map((s: any) =>
        typeof s === "string" ? stripMd(s) : s
      );
    }

    function assembleNarrative(r: any): string {
      const parts: string[] = [];
      if (r?.executive_summary) parts.push(String(r.executive_summary));
      if (r?.enforcement_context) parts.push(String(r.enforcement_context));
      for (const c of (r?.controls || [])) {
        parts.push([c?.finding, c?.regulatory_basis, c?.remediation].filter(Boolean).join(" "));
      }
      for (const t of (r?.top_risks || [])) {
        parts.push([t?.title, t?.description, t?.consequence].filter(Boolean).join(" "));
      }
      for (const n of (r?.next_steps || [])) parts.push(String(n || ""));
      return parts.join("\n\n");
    }

    let report: any = await generateReport("");

    if (!report || typeof report !== "object" || !Array.isArray(report.controls) || report.controls.length === 0) {
      // Don't land an empty report as `complete` — surface as error so UI shows retry, not blank page.
      await supabase
        .from("cppa_assessments")
        .update({ status: "error" })
        .eq("id", assessment_id);
      return;
    }

    normaliseReport(report);

    // Output lint: regenerate once on hard violations; never block delivery.
    let lint = lintReportText(assembleNarrative(report));
    const lintViolations: any[] = [];
    if (hasHardViolations(lint)) {
      try {
        const details = lint.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
        const retry = await generateReport(
          `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`
        );
        if (retry && Array.isArray(retry.controls) && retry.controls.length > 0) {
          report = retry;
          normaliseReport(report);
          lint = lintReportText(assembleNarrative(report));
        }
      } catch (e) {
        console.warn("[CPPA Cyber] lint retry failed (non-fatal):", e);
      }
    }
    for (const v of lint.violations) lintViolations.push(v);


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
    // The 18 enumerated cybersecurity components live in § 7123(b) (audit scope
    // / programme components); § 7122 covers thoroughness and independence of
    // audits and is attached once at report level, not per control.
    // Primary source: deterministic exact lookup on the § 7123 control-level
    // commentary. Secondary source: semantic fallback/enrichment via embeddings
    // + match_cppa_fsor_commentary RPC, mirroring run-cppa-risk-assessment. On
    // any embedding/RPC failure we silently fall back to exact-only — never
    // fail the run.
    const fsorByCitation = new Map<string, any[]>();
    for (const row of fsorRows ?? []) {
      const key = row.regulation_citation;
      if (!fsorByCitation.has(key)) fsorByCitation.set(key, []);
      fsorByCitation.get(key)!.push(row);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PKG_PRIORITY: Record<string, number> = {
      "ccpa-2025-cyber-risk-admt": 0,
      "dbr-2024-registration": 1,
      "ccpa-2023-original": 2,
    };

    async function semanticFsorForControl(controlName: string, gapContext: string): Promise<any[]> {
      if (!LOVABLE_API_KEY) return [];
      try {
        const queryText =
          `California CPPA cybersecurity control: ${controlName}. ` +
          `Gap/finding context: ${gapContext}`;
        const er = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/text-embedding-3-small",
            input: queryText.slice(0, 6000),
            dimensions: 1536,
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!er.ok) {
          console.warn(`[cppa-cyber fsor-semantic] embedding HTTP ${er.status}`);
          return [];
        }
        const ed = await er.json();
        const embedding = ed?.data?.[0]?.embedding;
        if (!Array.isArray(embedding)) return [];
        const { data, error } = await supabase.rpc("match_cppa_fsor_commentary", {
          query_embedding: embedding,
          citation_filter: null,
          topic_filter: null,
          match_count: 10,
        });
        if (error) {
          console.warn(`[cppa-cyber fsor-semantic] rpc error: ${error.message}`);
          return [];
        }
        const rowsArr = Array.isArray(data) ? data : [];
        const indexed = rowsArr.map((r: any, i: number) => ({ r, i }));
        indexed.sort((a, b) => {
          const pa = PKG_PRIORITY[a.r?.fsor_package] ?? 99;
          const pb = PKG_PRIORITY[b.r?.fsor_package] ?? 99;
          if (pa !== pb) return pa - pb;
          return a.i - b.i;
        });
        return indexed.map((x) => x.r);
      } catch (e) {
        console.warn(`[cppa-cyber fsor-semantic] threw: ${e}`);
        return [];
      }
    }

    function shapeFsorItem(r: any): any {
      return {
        ...r,
        agency_response: r?.agency_response ?? null,
        agency_response_verbatim: true,
        comment_summary: r?.comment_summary ?? null,
        comment_summary_verbatim: false,
        citation: r?.regulation_citation ?? r?.citation ?? null,
        package: r?.fsor_package ?? null,
      };
    }

    const controlsOut: any[] = [];
    for (let idx = 0; idx < report.controls.length; idx++) {
      const c = report.controls[idx];
      const citation = `11 CCR § 7123(b)`;
      const exact = (fsorByCitation.get("11 CCR § 7123") ?? []).slice();
      const exactIds = new Set(exact.map((r: any) => r?.id).filter(Boolean));

      const gapContext = [c?.finding, c?.remediation, c?.regulatory_basis]
        .filter(Boolean).join(" ").slice(0, 1500);
      const semantic = await semanticFsorForControl(c?.control ?? "", gapContext);

      let merged = exact.slice();
      if (exact.length === 0) {
        merged = semantic.slice(0, 5);
      } else {
        const extras: any[] = [];
        for (const r of semantic) {
          if (extras.length >= 2) break;
          if (r?.id && exactIds.has(r.id)) continue;
          extras.push(r);
          if (r?.id) exactIds.add(r.id);
        }
        merged = [...exact, ...extras];
      }

      // R2: Strip any model-hallucinated section citation prefix from
      // regulatory_basis, then prepend the verified CPPA citation deterministically.
      const cleanedRegBasis = stripMd(c?.regulatory_basis ?? "")
        .replace(/^\(?(?:11\s*CCR\s+)?§?\s*\d+[^—–\-]*?\)?\s*[—–\-]?\s*/i, "")
        .trim();

      controlsOut.push({
        ...c,
        regulatory_basis: `11 CCR § 7123(b) — ${cleanedRegBasis}`,
        fsor_citation: citation,
        fsor_commentary: merged.slice(0, 2).map(shapeFsorItem),
      });

    }
    report.controls = controlsOut;

    // Section-level FSOR commentary attached once at report level (not per
    // control) to avoid 18x duplication of the same agency text.
    (report as any).fsor_section_commentary = {
      "11 CCR § 7122": (fsorByCitation.get("11 CCR § 7122") ?? []).map(shapeFsorItem),
      "11 CCR § 7123": (fsorByCitation.get("11 CCR § 7123") ?? []).map(shapeFsorItem),
    };

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

    (report as any).enforcement_precedents = enforcementResults.slice(0, 5);
    (report as any).enforcement_meta = enforcementMeta;
    (report as any).lint_warnings = [
      ...(Array.isArray((report as any).lint_warnings) ? (report as any).lint_warnings : []),
      ...lintViolations,
    ];


    await supabase
      .from("cppa_assessments")
      .update({ status: "complete", report_data: report, obligation_snapshot })
      .eq("id", assessment_id);

    // C4 RoPA accumulator: cybersecurity controls map to a Security activity
    if ((row as any).client_id) {
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: (row as any).client_id,
          source_tool: "cppa_cybersecurity",
          source_assessment_id: assessment_id,
          display_name: "Cybersecurity & threat monitoring",
          source_summary: "Drafted from CPPA Cybersecurity Audit — review control gaps and link safeguards.",
          is_high_risk: false,
          category: "technology",
        },
      }).catch((e: Error) => console.error("[cppa-cyber] accumulate-ropa failed (non-fatal):", e.message));
    }


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
