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

async function callAnthropic(system: string, user: string, maxTokens: number): Promise<{ text: string; stopReason: string | null }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(900_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const d = await res.json();
  const text = d.content?.[0]?.text || "";
  const stopReason: string | null = d.stop_reason ?? null;
  console.log(`[run-cppa-cybersecurity] gen done stop=${stopReason} chars=${text.length}`);
  return { text, stopReason };
}

const ALL_COMPONENTS: string[] = [
  "Authentication and access controls",
  "Encryption of personal information",
  "Account management and access control",
  "Inventory of personal information and systems",
  "Secure configuration of hardware and software",
  "Vulnerability management and patching",
  "Audit-log management",
  "Network monitoring and defence",
  "Anti-malware protections",
  "Network segmentation",
  "Limitation of physical access",
  "Secure development of software",
  "Oversight of service providers, contractors, and third parties",
  "Cybersecurity awareness, education and training",
  "Retention schedules and secure disposal",
  "Incident response and post-incident analysis",
  "Business continuity and disaster recovery",
];

// Per-control citations verified against the final 11 CCR § 7123 regulatory text
// (OAL approved September 22, 2025; effective January 1, 2026)
// Source: Cal. Code Regs. tit. 11, § 7123(c)(1)–(18). Note: (c)(15) is not
// assigned in this product because "Zero-trust architecture" was deleted from
// the final regulations by CalPrivacy before OAL approval.
const COMPONENT_CITATIONS: Record<string, string> = {
  "Authentication and access controls":                             "11 CCR § 7123(c)(1)",
  "Encryption of personal information":                             "11 CCR § 7123(c)(2)",
  "Account management and access control":                          "11 CCR § 7123(c)(3)",
  "Inventory of personal information and systems":                  "11 CCR § 7123(c)(4)",
  "Secure configuration of hardware and software":                  "11 CCR § 7123(c)(5)",
  "Vulnerability management and patching":                          "11 CCR § 7123(c)(6)",
  "Audit-log management":                                           "11 CCR § 7123(c)(7)",
  "Network monitoring and defence":                                 "11 CCR § 7123(c)(8)",
  "Anti-malware protections":                                       "11 CCR § 7123(c)(9)",
  "Network segmentation":                                           "11 CCR § 7123(c)(10)",
  "Limitation of physical access":                                  "11 CCR § 7123(c)(11)",
  "Secure development of software":                                 "11 CCR § 7123(c)(12)",
  "Oversight of service providers, contractors, and third parties": "11 CCR § 7123(c)(13)",
  "Cybersecurity awareness, education and training":                "11 CCR § 7123(c)(14)",
  "Retention schedules and secure disposal":                        "11 CCR § 7123(c)(16)",
  "Incident response and post-incident analysis":                   "11 CCR § 7123(c)(17)",
  "Business continuity and disaster recovery":                      "11 CCR § 7123(c)(18)",
};

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
          enforcementContext = enforcementResults.map((r: any, i: number) => {
            const fineVerified = r.fine_verified !== false;
            const fine = !fineVerified
              ? "fine amount under verification — omitted"
              : (r.fine_eur_equivalent ? `€${Number(r.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
            return `[E${i + 1}] id:${r.id} ${r.regulator} v ${r.subject} (${r.decision_date ?? "n.d."}): ${r.violation ?? r.key_compliance_failure ?? ""} | Fine: ${fine} | ${r.source_url ?? ""}`;
          }).join("\n");
        }
      }
    } catch (e) {
      console.warn("[CPPA Cyber] enforcement context fetch failed:", e);
    }

    const system = `You are a cybersecurity readiness analyst specializing in California's CPPA cybersecurity audit regulations. The CPPA cybersecurity audit regulations (11 CCR §§ 7120–7124) were approved by OAL in September 2025 and took effect January 1, 2026; first audit certifications are due April 1, 2028 (businesses >$100M 2026 annual gross revenue), April 1, 2029 ($50–100M), and April 1, 2030 (<$50M), as established under 11 CCR § 7121(a). Never describe the regulations as proposed, and never present a readiness deadline earlier than the business's applicable phase-in date. You map an organization's controls against the CPPA's 17 enumerated cybersecurity program components under 11 CCR § 7123(c) and produce a structured readiness assessment. You never give legal advice.
LANGUAGE: Use US English spelling throughout — organization, program, defense, authorized, customized, analyze. Never use organisation, programme, defence, authorised, or customised.
NIST: Always write "NIST CSF 2.0" when referencing the NIST Cybersecurity Framework. Never write just "NIST CSF" without the version number.
Respond ONLY with valid JSON matching the schema provided.`;

    const enforcementBlock = enforcementContext
      ? `Recent breach / cybersecurity enforcement context (use to calibrate severity and cite where directly relevant, tagged [E1], [E2], etc.):\n${enforcementContext}\n\nANNOTATION REQUIREMENT: For each enforcement action cited above, if it directly supports a control finding, severity rating, or remediation in your report, include it in the annotations array using the id value from the enforcement context exactly as provided (the value after 'id:'). You MUST only cite enforcement actions from the context above — never cite cases from training knowledge.\n`
      : "";

    const intakeJson = JSON.stringify(row.intake_data, null, 2);

    function buildControlsPrompt(startIdx: number, endIdx: number): string {
      // startIdx/endIdx are 1-based inclusive
      const slice = ALL_COMPONENTS.slice(startIdx - 1, endIdx);
      const numbered = slice.map((c, i) => `${startIdx + i}. ${c}`).join("\n");
      return `Based on this organisation's CPPA cybersecurity readiness intake, assess CPPA cybersecurity programme components ${startIdx}–${endIdx} ONLY (one object per component, in the exact order listed below). Do NOT emit any other components, and do NOT emit executive_summary, overall_score, readiness_level, top_risks, enforcement_context, or next_steps.

Intake data:
${intakeJson}

${enforcementBlock}Respond with this exact JSON structure (controls array MUST contain exactly ${slice.length} items, one per listed component, in order):
{
  "controls": [
    {
      "control": "string (the component name exactly as listed)",
      "score": 0,
      "status": "Implemented | Partial | Gap | Critical Gap",
      "finding": "string (1-2 sentences — specific gap or confirmation only)",
      "regulatory_basis": "string (the specific programme component being assessed, in plain language — do NOT include a section citation; the citation is added by the system)",
      "remediation": "string (2-3 specific steps, plain language)",
      "priority": "Immediate | Within 90 days | Within 6 months | Monitor"
    }
  ],
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

Components ${startIdx}–${endIdx} to assess (in this order):
${numbered}`;
    }

    function buildSynthesisPrompt(controlsDigest: string, computedScore: number): string {
      return `Based on this organisation's CPPA cybersecurity readiness intake and the per-control assessment digest below, produce the summary sections of the report. Do NOT emit controls or annotations.

Intake data:
${intakeJson}

Per-control digest (already assessed; do not re-score):
${controlsDigest}

System-computed overall_score (mean of the 17 control scores, rounded): ${computedScore}
Your executive_summary and readiness_level MUST be consistent with this overall_score.

NEXT-STEPS CONSISTENCY: every deadline in next_steps must restate a deadline already given in a control's remediation — never introduce a different timeframe for the same action. Refer to controls by NAME, never "component N" (component numbers are not rendered).

EXEC SUMMARY: the audit is performed by a qualified, independent auditor; the business's executive submits the certification — do not conflate them. Audits may document gaps with remediation plans; do not state that all gaps must be fully remediated before certification.


${enforcementBlock}Respond with ONLY this exact JSON structure:
{
  "executive_summary": "string (150-200 words — overall readiness posture and top 3 priorities)",
  "readiness_level": "Audit-Ready | Substantially Ready | Material Gaps | Critical Gaps",
  "top_risks": [
    { "title": "string", "description": "string", "deadline": "string", "consequence": "string" }
  ],
  "enforcement_context": "string (2-3 sentences on CPPA cybersecurity audit timing and enforcement priorities — cite the phase-in deadlines as established under § 7121(a): April 1, 2028 for businesses whose 2026 annual gross revenue exceeded $100 million; April 1, 2029 for $50–100 million; April 1, 2030 for under $50 million)",
  "next_steps": ["string"]
}`;
    }

    function tryParseJson(text: string, label: string): any | null {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) {
        console.error(JSON.stringify({
          event: "cppa_cyber_parse_failure",
          reason: "no_json_object_in_response",
          assessment_id,
          label,
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
          label,
          error: String(e),
          tail: m[0].slice(-300),
        }));
        return null;
      }
    }

    async function callControlsHalf(startIdx: number, endIdx: number, extra: string): Promise<{ controls: any[]; annotations: any[] } | null> {
      const base = buildControlsPrompt(startIdx, endIdx);
      const user = extra ? `${base}\n\n${extra}` : base;
      const first = await callAnthropic(system, user, 4500);
      let parsed: any = null;
      if (first.stopReason === "max_tokens") {
        console.warn(`[CPPA Cyber] controls_${startIdx}_${endIdx} truncated_output — skipping parse, retrying at 1.5x`);
      } else {
        parsed = tryParseJson(first.text, `controls_${startIdx}_${endIdx}`);
      }
      if (!parsed || !Array.isArray(parsed.controls)) {
        // One retry — at 1.5x tokens when previous attempt truncated.
        const retryBudget = first.stopReason === "max_tokens" ? Math.ceil(4500 * 1.5) : 4500;
        const retry = await callAnthropic(system, `${base}\n\nPREVIOUS ATTEMPT did not return valid JSON. Produce the JSON again, ensuring it is well-formed.`, retryBudget);
        if (retry.stopReason === "max_tokens") {
          console.error(`[CPPA Cyber] controls_${startIdx}_${endIdx} truncated_output after retry`);
          return null;
        }
        parsed = tryParseJson(retry.text, `controls_${startIdx}_${endIdx}_retry`);
      }
      if (!parsed || !Array.isArray(parsed.controls) || parsed.controls.length === 0) return null;
      return {
        controls: parsed.controls,
        annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
      };
    }

    async function callSynthesis(controlsDigest: string, computedScore: number, extra: string): Promise<any | null> {
      const base = buildSynthesisPrompt(controlsDigest, computedScore);
      const user = extra ? `${base}\n\n${extra}` : base;
      const first = await callAnthropic(system, user, 1800);
      let parsed: any = null;
      if (first.stopReason === "max_tokens") {
        console.warn("[CPPA Cyber] synthesis truncated_output — skipping parse, retrying at 1.5x");
      } else {
        parsed = tryParseJson(first.text, "synthesis");
      }
      if (!parsed) {
        const retryBudget = first.stopReason === "max_tokens" ? Math.ceil(1800 * 1.5) : 1800;
        const retry = await callAnthropic(system, `${base}\n\nPREVIOUS ATTEMPT did not return valid JSON. Produce the JSON again, ensuring it is well-formed.`, retryBudget);
        if (retry.stopReason === "max_tokens") {
          console.error("[CPPA Cyber] synthesis truncated_output after retry");
          return null;
        }
        parsed = tryParseJson(retry.text, "synthesis_retry");
      }
      return parsed;
    }

    function buildDigest(controls: any[]): string {
      return controls.map((c, i) =>
        `${i + 1}. ${c?.control ?? ""} | score=${c?.score ?? 0} | status=${c?.status ?? ""} | priority=${c?.priority ?? ""} | finding=${String(c?.finding ?? "").slice(0, 240)}`
      ).join("\n");
    }

    function assembleControls(h1: any[], h2: any[]): any[] {
      return [...h1, ...h2];
    }

    function dedupeAnnotations(a: any[], b: any[]): any[] {
      const seen = new Set<string>();
      const out: any[] = [];
      for (const ann of [...a, ...b]) {
        const id = String(ann?.enforcement_action_id ?? "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(ann);
      }
      return out;
    }

    function validateControls(controls: any[]): { ok: boolean; missing: number[] } {
      if (!Array.isArray(controls) || controls.length !== 17) {
        // Determine which half is deficient
        const namesSeen = new Set(controls.map((c: any) => String(c?.control ?? "").trim().toLowerCase()));
        const missing: number[] = [];
        ALL_COMPONENTS.forEach((name, i) => {
          if (!namesSeen.has(name.toLowerCase())) missing.push(i + 1);
        });
        return { ok: false, missing };
      }
      const missing: number[] = [];
      const namesSeen = new Set(controls.map((c: any) => String(c?.control ?? "").trim().toLowerCase()));
      ALL_COMPONENTS.forEach((name, i) => {
        if (!namesSeen.has(name.toLowerCase())) missing.push(i + 1);
      });
      return { ok: missing.length === 0, missing };
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

    function assembleControlsNarrative(controls: any[]): string {
      const parts: string[] = [];
      for (const c of controls) {
        parts.push([c?.finding, c?.regulatory_basis, c?.remediation].filter(Boolean).join(" "));
      }
      return parts.join("\n\n");
    }

    function assembleSynthesisNarrative(r: any): string {
      const parts: string[] = [];
      if (r?.executive_summary) parts.push(String(r.executive_summary));
      if (r?.enforcement_context) parts.push(String(r.enforcement_context));
      for (const t of (r?.top_risks || [])) {
        parts.push([t?.title, t?.description, t?.consequence].filter(Boolean).join(" "));
      }
      for (const n of (r?.next_steps || [])) parts.push(String(n || ""));
      return parts.join("\n\n");
    }

    function assembleNarrative(r: any): string {
      return `${assembleSynthesisNarrative(r)}\n\n${assembleControlsNarrative(r?.controls || [])}`;
    }

    function computeOverallScore(controls: any[]): number {
      const scores = controls.map((c: any) => Number(c?.score)).filter((n) => Number.isFinite(n));
      if (scores.length === 0) return 0;
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      return Math.round(mean);
    }

    // ── Run two parallel controls halves ─────────────────────────────────
    let [half1, half2] = await Promise.all([
      callControlsHalf(1, 9, ""),
      callControlsHalf(10, 17, ""),
    ]);

    if (!half1 || !half2) {
      await supabase
        .from("cppa_assessments")
        .update({ status: "error" })
        .eq("id", assessment_id);
      return;
    }

    // Validate completeness; retry only deficient half once.
    {
      const assembled = assembleControls(half1.controls, half2.controls);
      const v = validateControls(assembled);
      if (!v.ok) {
        const missing1 = v.missing.filter((n) => n >= 1 && n <= 9);
        const missing2 = v.missing.filter((n) => n >= 10 && n <= 17);
        const retries: Promise<any>[] = [];
        if (missing1.length) retries.push(callControlsHalf(1, 9, "PREVIOUS ATTEMPT was incomplete or out of order — emit exactly the 9 listed components, in order.").then((r) => { if (r) half1 = r; }));
        if (missing2.length) retries.push(callControlsHalf(10, 17, "PREVIOUS ATTEMPT was incomplete or out of order — emit exactly the 8 listed components, in order.").then((r) => { if (r) half2 = r; }));
        await Promise.all(retries);
        const reAssembled = assembleControls(half1!.controls, half2!.controls);
        const v2 = validateControls(reAssembled);
        if (!v2.ok) {
          console.error(`[CPPA Cyber] controls incomplete after retry: missing=${JSON.stringify(v2.missing)}`);
          await supabase
            .from("cppa_assessments")
            .update({ status: "error" })
            .eq("id", assessment_id);
          return;
        }
      }
    }

    let allControls = assembleControls(half1!.controls, half2!.controls);
    const overall_score = computeOverallScore(allControls);
    const digest = buildDigest(allControls);

    const synthesis = await callSynthesis(digest, overall_score, "");
    if (!synthesis || typeof synthesis !== "object") {
      await supabase
        .from("cppa_assessments")
        .update({ status: "error" })
        .eq("id", assessment_id);
      return;
    }

    let report: any = {
      executive_summary: synthesis.executive_summary,
      overall_score,
      readiness_level: synthesis.readiness_level,
      controls: allControls,
      top_risks: Array.isArray(synthesis.top_risks) ? synthesis.top_risks : [],
      enforcement_context: synthesis.enforcement_context,
      next_steps: Array.isArray(synthesis.next_steps) ? synthesis.next_steps : [],
      annotations: dedupeAnnotations(half1!.annotations, half2!.annotations),
    };

    normaliseReport(report);

    // Output lint: surgical retry — re-run only the call(s) whose text violates.
    const lintViolations: any[] = [];
    {
      const lintHalf1 = lintReportText(assembleControlsNarrative(half1!.controls));
      const lintHalf2 = lintReportText(assembleControlsNarrative(half2!.controls));
      const lintSynth = lintReportText(assembleSynthesisNarrative(report));

      const half1Bad = hasHardViolations(lintHalf1);
      const half2Bad = hasHardViolations(lintHalf2);
      const synthBad = hasHardViolations(lintSynth);

      if (half1Bad || half2Bad || synthBad) {
        try {
          const retries: Promise<void>[] = [];
          if (half1Bad) {
            const details = lintHalf1.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
            retries.push(callControlsHalf(1, 9, `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`).then((r) => { if (r) half1 = r; }));
          }
          if (half2Bad) {
            const details = lintHalf2.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
            retries.push(callControlsHalf(10, 17, `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`).then((r) => { if (r) half2 = r; }));
          }
          if (synthBad) {
            const details = lintSynth.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
            // Re-run synthesis with retry instruction; use current digest/score (controls may be replaced below).
            retries.push((async () => {
              const r = await callSynthesis(digest, overall_score, `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`);
              if (r) {
                report.executive_summary = r.executive_summary;
                report.readiness_level = r.readiness_level;
                report.top_risks = Array.isArray(r.top_risks) ? r.top_risks : report.top_risks;
                report.enforcement_context = r.enforcement_context;
                report.next_steps = Array.isArray(r.next_steps) ? r.next_steps : report.next_steps;
              }
            })());
          }
          await Promise.all(retries);

          // If a controls half was re-rolled, recompute controls/score and (if score moved) re-run synthesis once.
          if (half1Bad || half2Bad) {
            allControls = assembleControls(half1!.controls, half2!.controls);
            const newScore = computeOverallScore(allControls);
            report.controls = allControls;
            (report as any).overall_score = newScore;
            report.annotations = dedupeAnnotations(half1!.annotations, half2!.annotations);
          }

          normaliseReport(report);
          const finalLint = lintReportText(assembleNarrative(report));
          for (const v of finalLint.violations) lintViolations.push(v);
        } catch (e) {
          console.warn("[CPPA Cyber] lint retry failed (non-fatal):", e);
          const finalLint = lintReportText(assembleNarrative(report));
          for (const v of finalLint.violations) lintViolations.push(v);
        }
      } else {
        for (const v of lintHalf1.violations) lintViolations.push(v);
        for (const v of lintHalf2.violations) lintViolations.push(v);
        for (const v of lintSynth.violations) lintViolations.push(v);
      }
    }


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
      const citation = COMPONENT_CITATIONS[c?.control ?? ""] ?? "11 CCR § 7123(c)";
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
      const cleanedRegBasis = (() => {
        let s = stripMd(c?.regulatory_basis ?? "")
          .replace(/^\(?\s*(?:11\s*CCR\s+)?§?\s*\d+[^—–\-]*?\)?\s*[—–\-]?\s*/i, "")
          // Remove mandate-opener phrases so the prepended frame reads grammatically
          .replace(/^(?:Businesses?\s+must\s+(?:implement|maintain|establish|ensure|provide|limit|document|collect|develop|oversee|conduct)\s+)/i, "")
          .replace(/^(?:The\s+(?:programme|program|business)\s+must\s+include\s+)/i, "")
          .replace(/^(?:Maintaining\s+and\s+)/i, "Maintaining ")
          // Strip "The {noun} must {verb} " openers (capital-letter mandate phrases)
          .replace(/^The\s+(?:organisation|organization|business|controller|entity|company|programme|program)\s+must\s+\w+\s+/i, "")
          // Strip "An organisation must …", "A business must …"
          .replace(/^An?\s+(?:organisation|organization|business|controller|entity|company)\s+must\s+\w+\s+/i, "")
          // Strip "Organisations must …", "Businesses must …"
          .replace(/^(?:Organisations|Organizations|Businesses|Controllers|Entities|Companies)\s+must\s+\w+\s+/i, "")
          .trim();
        // Lowercase the leading capital so it reads as a continuation of the frame
        if (s && /^[A-Z][a-z]/.test(s)) {
          s = s.charAt(0).toLowerCase() + s.slice(1);
        }
        return s;
      })();

      controlsOut.push({
        ...c,
        regulatory_basis: `Assessed under ${citation}: the annual cybersecurity audit must assess ${cleanedRegBasis}, as applicable to the business.`,
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

    // CF-1 (4): Single-source precedent/annotation parity.
    const retrievedById = new Map<string, any>();
    for (const r of (enforcementResults as any[])) {
      if (r?.id) retrievedById.set(String(r.id), r);
    }
    const rawAnnotations: any[] = Array.isArray((report as any).annotations) ? (report as any).annotations : [];
    const validatedAnnotations: any[] = [];
    const orphans: any[] = [];
    const seenIds = new Set<string>();
    for (const a of rawAnnotations) {
      const aid = String(a?.enforcement_action_id ?? "");
      if (aid && retrievedById.has(aid) && !seenIds.has(aid)) {
        validatedAnnotations.push(a);
        seenIds.add(aid);
      } else {
        orphans.push({ id: aid || null, reason: aid ? "id_not_in_retrieved" : "missing_id" });
      }
    }
    if (orphans.length > 0) {
      console.warn("[CPPA Cyber] dropped orphan annotations:", JSON.stringify(orphans));
    }
    const validatedIdSet = new Set(validatedAnnotations.map((a) => String(a.enforcement_action_id)));
    const rebuiltPrecedents = (enforcementResults as any[]).filter((r: any) => validatedIdSet.has(String(r?.id)));

    (report as any).annotations = validatedAnnotations;
    (report as any).enforcement_precedents = rebuiltPrecedents;

    if (validatedAnnotations.length !== rebuiltPrecedents.length) {
      console.error(
        `[CPPA Cyber] precedent/annotation parity mismatch after rebuild: ` +
        `annotations=${validatedAnnotations.length} precedents=${rebuiltPrecedents.length}`,
      );
      const precedentIds = new Set(rebuiltPrecedents.map((r: any) => String(r?.id)));
      (report as any).annotations = validatedAnnotations.filter((a: any) =>
        precedentIds.has(String(a.enforcement_action_id))
      );
    }

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
