import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAnthropic(model: string, system: string, user: string, maxTokens = 7500, timeoutMs = 720_000): Promise<{ text: string; stopReason: string | null }> {
  const startedAt = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const d = await res.json();
  const text = d.content?.[0]?.text || "";
  const stopReason: string | null = d.stop_reason ?? null;
  const elapsed = Date.now() - startedAt;
  console.log(`[run-dpia-framework] stage=callAnthropic model=${model} elapsed=${elapsed}ms stop=${stopReason} chars=${text.length}`);
  return { text, stopReason };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { dpia_id } = await req.json();
    if (!dpia_id) return new Response(JSON.stringify({ error: "dpia_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: dpia } = await supabase
      .from("dpia_frameworks").select("*").eq("id", dpia_id).single();

    if (!dpia) return new Response(JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const intake = dpia.intake_data as any;
    const orgName = (dpia as any).organization_name || intake?.organization_name || null;
    await supabase.from("dpia_frameworks").update({
      status: "processing",
      ...(orgName && !(dpia as any).organization_name ? { organization_name: orgName } : {}),
    }).eq("id", dpia_id);

    // Dispatch heavy work in background — return 202 immediately so the caller
    // is not held open past the platform's 150s HTTP idle ceiling. The result
    // page polls dpia_frameworks.status. On unhandled error we mark the row
    // failed so callers don't poll forever.
    // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
    EdgeRuntime.waitUntil((async () => {
      try {
    let orgContext = "";
    if (dpia.source_assessment_id) {
      const { data: sourceAssessment } = await supabase
        .from("governance_assessments")
        .select("intake_data, report_data")
        .eq("id", dpia.source_assessment_id).single();
      if (sourceAssessment) {
        const srcIntake = sourceAssessment.intake_data as any;
        orgContext = `
SOURCE GOVERNANCE ASSESSMENT CONTEXT:
Organisation sector: ${srcIntake.sector || "not specified"}
Jurisdictions: ${(srcIntake.jurisdictions || []).join(", ")}
EU/UK data: ${srcIntake.eu_uk_data ? "Yes" : "No"}
DPO appointed: ${srcIntake.has_dpo ? "Yes" : "No"}
`;
      }
    }

    const system = `You are a senior privacy lawyer producing a structured DPIA framework document. The document must follow the structure required by GDPR Article 35 and applicable supervisory authority templates (EDPB, ICO). Be specific but CONCISE: every string value must be at most 2 sentences (<= 300 characters). Risk arrays must contain at most 4 items; measure arrays at most 4 items. This is a framework document for the organisation's own legal or privacy team to complete and own — not a finished DPIA. All analysis is structured as guidance and framework, not legal opinion. Return ONLY valid JSON, no preamble, no markdown fences. Ensure the JSON is complete and well-formed. When citing regulatory provisions, use only well-established article numbers (e.g. GDPR Article 35, Article 32). Do not invent sub-article or paragraph numbers you are not certain of — write the article reference only (e.g. 'GDPR Article 35' not 'GDPR Article 35(3)(b)(ii)') unless the sub-provision is explicitly described in the processing context. Do NOT reference specific enforcement case names, fine amounts, or regulator decisions in framework section content — enforcement context is injected separately and must only appear in the annotations array. CITATION INTEGRITY RULE (6): Where specifying encryption-in-transit standards, always use the phrase "TLS 1.2 or higher (TLS 1.3 recommended)" — never state a single version in isolation. This applies to all security measures sections and mitigation sections, so that no two sections of the document specify different TLS versions. EDPB GUIDELINE CITATION RULE: The authoritative EDPB guidance on DPIAs is "Guidelines on Data Protection Impact Assessment (WP248 rev.01)" — endorsed by the EDPB as successor to the Article 29 Working Party. Do NOT cite "EDPB Guidelines 09/2022" for DPIAs — Guidelines 09/2022 addresses personal data breach notification, not DPIAs. When citing DPIA guidance, use: "EDPB (endorsed) Guidelines on DPIA (WP248 rev.01)". MONETARY PENALTY RULE: Never state a specific monetary fine, penalty, or settlement amount unless that exact figure appears in the ENFORCEMENT PRECEDENTS or ENFORCEMENT CONTEXT block provided in this prompt. Training knowledge of regulatory fines is unreliable. If a relevant case exists but its amount is not in the provided block, write "[Regulator] imposed a significant penalty for this type of violation — verify the current figure at the regulator's enforcement register" instead of recalling an amount. Known correct figures (use only if the case is in your enforcement block): ICO Clearview AI (2022) £7,552,800; ICO Interserve (2022) £4,400,000; ICO Capita Pension Solutions (2024) £6,090,000; ICO British Airways (2020) £20,000,000. ARTICLE 35(11) RULE: Article 35(11) GDPR requires a DPIA review when there is a change in the risk represented by the processing — it does NOT mandate an annual review. When writing review schedules, present annual review as good practice and attribute only the change-of-risk trigger to Article 35(11). Example: 'at minimum annually as good practice, and in any event whenever the risk represented by the processing changes (GDPR Article 35(11))'. TRANSPARENCY FOR INDIRECT DATA SUBJECTS RULE: where the processing captures individuals with no relationship to the controller (e.g., incidental capture in imagery), the framework MUST include an Art. 14 section: how affected individuals will be informed, whether the Art. 14(5)(b) disproportionate-effort exemption is claimed, and the compensating measures (public notice of campaigns, website notice, signage) if so. NUMERIC VOLUME AND POPULATION ESTIMATE RULE (CRITICAL — applies to ALL sections, not just incidental capture): Never generate, estimate, infer, or extrapolate any numeric figure for: (a) the number of data subjects, (b) the volume of processing events, (c) the frequency of processing per time period (events per day/week/month/year), (d) any data volume metric in bytes/records/transactions, (e) the number of individuals incidentally captured, (f) bystander or third-party individual counts — unless that exact figure was explicitly provided in the user's intake data. This rule applies to every section of the DPIA framework output, including but not limited to: processing scope, proportionality analysis, necessity assessment, risk assessments, residual risk, mitigation measures, monitoring plans, and review schedules. Where a volume or population figure is required for completeness but was not provided, render the placeholder "[TO BE ASSESSED — confirm from operational data before the DPIA is finalised]" — never a range, approximation, order-of-magnitude estimate, model-derived figure, or industry benchmark. Do NOT phrase estimates as "approximately", "in the order of", "potentially several thousand", "tens of millions", or any equivalent. The placeholder is the only acceptable substitute. RESIDUAL-RISK CONSISTENCY RULE: if a section instructs the organisation to re-score residual risk before sign-off, any residual-risk levels stated elsewhere must be labelled 'proposed — subject to the organisation's re-scoring', not presented as final.`;

    const processingDesc = intake.processing_description || "Not provided";
    const purpose = intake.purpose || "Not provided";
    const dataCategories = (intake.data_categories || []).join(", ") || "Not specified";
    const dataSubjects = intake.data_subjects || "Not specified";
    const volume = intake.volume_frequency || "Not specified";
    const thirdParties = (intake.third_party_processors || []).join(", ") || "None identified";
    const safeguards = (intake.existing_safeguards || []).join(", ") || "None identified";
    const jurisdictions = (intake.jurisdictions || []).join(", ") || "Not specified";
    const legalBasisProposed = intake.legal_basis_proposed || "Not specified";
    const sector = intake.sector || intake.organization_sector || "Not specified";

    // Determine GDPR jurisdiction from verified jurisdictions (srcIntake preferred).
    let srcIntakeJurisdictions: string[] | null = null;
    if (dpia.source_assessment_id) {
      try {
        const { data: sa } = await supabase
          .from("governance_assessments")
          .select("intake_data")
          .eq("id", dpia.source_assessment_id).maybeSingle();
        const sj = (sa?.intake_data as any)?.jurisdictions;
        if (Array.isArray(sj)) srcIntakeJurisdictions = sj;
      } catch { /* non-fatal */ }
    }
    const effectiveJurisdictions: string[] = srcIntakeJurisdictions ?? (intake.jurisdictions || []);
    const gdprJurisdiction: "eu" | "uk" = effectiveJurisdictions.some((j: string) => /united kingdom|uk|gb/i.test(String(j))) ? "uk" : "eu";

    // Fetch enforcement precedents (3-5) and GDPR authority context in parallel
    let enforcementPrecedents: any[] = [];
    let enforcementMeta: any = { attempted: false };
    let gdprBlock = "";
    let gdprMeta: any = { attempted: false };
    try {
      const [ecRes, gdprRes] = await Promise.all([
        supabase.functions.invoke("get-enforcement-context", {
          body: {
            tool: "DPIA",
            data_categories: intake.data_categories || [],
            jurisdictions: intake.jurisdictions || [],
            sector: intake.sector || undefined,
            articles: ["gdpr:35", "gdpr:36"],
            limit: 5,
          },
        }),
        getGdprContext(supabase, {
          articles: ["35", "36"],
          jurisdiction: gdprJurisdiction,
          recitals: [75, 84, 90],
          guidelineArticles: ["35"],
          semanticQuery: processingDesc,
        }).catch((e: Error) => { console.error("getGdprContext failed (non-fatal):", e); return { block: "", meta: { attempted: false, error: String(e).slice(0, 200) } as any }; }),
      ]);
      const ctxData = (ecRes as any)?.data;
      enforcementPrecedents = (ctxData?.results || []).slice(0, 5);
      const descParts: string[] = [];
      if (intake.sector) descParts.push(`${intake.sector} sector`);
      if ((intake.jurisdictions || []).length) descParts.push(`processing in ${(intake.jurisdictions || []).join(", ")}`);
      enforcementMeta = {
        attempted: true,
        total_matched: typeof ctxData?.total_matched === "number" ? ctxData.total_matched : null,
        query_descriptor: descParts.join(" — ") || undefined,
      };
      gdprBlock = (gdprRes as any)?.block || "";
      gdprMeta = (gdprRes as any)?.meta || { attempted: false };
    } catch (e) {
      console.error("DPIA context fetch failed (non-fatal):", e);
    }

    const enforcementContextStr = enforcementPrecedents.length > 0
      ? enforcementPrecedents.map((r: any, i: number) => {
          const provs = Array.isArray(r.statutory_provisions) && r.statutory_provisions.length
            ? ` — citing ${r.statutory_provisions.join(", ")}` : "";
          const fineVerified = r.fine_verified !== false;
          const fine = !fineVerified
            ? "fine amount under verification — omitted"
            : (r.fine_eur_equivalent ? `€${Number(r.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
          return `[E${i + 1}] id:${r.id} ${r.subject || "Unnamed"} — ${r.regulator} (${r.jurisdiction}, ${r.decision_date || "n.d."}) — Fine: ${fine} — Failure: ${r.key_compliance_failure || r.violation || "n/a"} — Preventive: ${r.preventive_measures || "n/a"}${provs}`;
        }).join("\n")
      : "No directly analogous enforcement precedents retrieved.";

    // Append GDPR authority context to the system prompt for both halves.
    const systemWithGdpr = gdprBlock
      ? `${system}\n\nSTATUTORY AND EDPB AUTHORITY (cite as [Art. X] / [Recital N] / [EDPB ref]; statutory text is verbatim — do not alter it):\n${gdprBlock}`
      : system;

    // ── Split DPIA generation into two parallel calls to stay within timeout ──
    const sharedContext = `PROCESSING ACTIVITY DETAILS:
Organisation (controller) being assessed: ${orgName || "not specified"}
Sector: ${sector}
Legal basis selected by user: ${legalBasisProposed}
Description: ${processingDesc}
Purpose: ${purpose}
Data categories: ${dataCategories}
Data subjects: ${dataSubjects}
Volume/frequency: ${volume}
Third-party processors: ${thirdParties}
Existing safeguards: ${safeguards}
Jurisdictions: ${jurisdictions}
${orgContext}

ENFORCEMENT PRECEDENTS (cite by [E1]–[E5] where relevant):
${enforcementContextStr}

ANNOTATION REQUIREMENT: For each enforcement action cited above (tagged [E1], [E2], etc.), if it directly supports a risk identification, severity rating, or mitigation measure in section_3_risks, include it in the section_3_risks.annotations array using the id value from the enforcement context exactly as provided. You MUST only cite enforcement actions from the ENFORCEMENT PRECEDENTS provided above — never cite cases from training knowledge. If an enforcement action is not in the provided context, do not cite it.`;

    const promptA = `${sharedContext}

Generate the first half of a DPIA framework document. Return ONLY this JSON structure, no preamble:

{
  "dpia_metadata": {
    "processing_activity_name": "brief name for this processing activity",
    "framework_version": "1.0",
    "applicable_frameworks": ["list of applicable frameworks — GDPR Art. 35, UK GDPR, etc."],
    "article_35_3_trigger": "Identify which Article 35(3) subparagraph mandates this DPIA, or state that this DPIA is precautionary. Options: Art. 35(3)(a) — systematic evaluation of personal aspects including profiling with significant effects; Art. 35(3)(b) — large-scale processing of special category or criminal offence data; Art. 35(3)(c) — systematic monitoring of publicly accessible area at large scale; Precautionary — processing does not meet Art. 35(3) thresholds but DPIA is conducted as best practice or because supervisory authority list applies.",
    "consultation_requirement": "State whether DPO consultation is required under GDPR Article 35(2) (applies only if a DPO is designated per Article 37). If no DPO is designated, state this and document whether an Article 37 appointment obligation is triggered. DPO CONSULTATION REQUIRED: [Required under Art. 35(2) — DPO designated / Not required — no DPO designated, Article 37 assessment: [TO COMPLETE] / Not confirmed — confirm DPO designation status]",
    "supervisory_authority_consultation_trigger": "For cross-border EU processing, identify the lead supervisory authority under the one-stop-shop mechanism (GDPR Article 56). Prior consultation under Article 36 is required if residual risk remains High after all measures are applied."
  },
  "section_1_description": {
    "title": "Description of the Processing",
    "guidance_note": "GDPR Article 35(7)(a) requires a systematic description of the processing operations and purposes.",
    "processing_nature": "describe the nature of the processing",
    "processing_scope": "describe the scope — volume, range of data subjects, geographic reach",
    "processing_context": "describe the context — relationships, reasonable expectations of data subjects",
    "processing_purposes": "clearly state each purpose",
    "legal_basis_proposed": "the proposed legal basis and why",
    "completion_guidance": "What the organisation's counsel/DPO must complete or verify in this section"
  },
  "section_2_necessity": {
    "title": "Assessment of Necessity and Proportionality",
    "guidance_note": "GDPR Article 35(7)(b) requires assessment of necessity and proportionality.",
    "necessity_analysis": "framework analysis of whether processing is necessary for the stated purpose",
    "proportionality_analysis": "framework analysis of whether processing is proportionate",
    "alternatives_considered": "list alternatives evaluated and why rejected",
    "completion_guidance": "What the organisation must complete or verify in this section"
  },
  "section_3_risks": {
    "title": "Assessment of Risks to Data Subjects",
    "guidance_note": "GDPR Article 35(7)(c) requires identification of risks to the rights and freedoms of natural persons.",
    "risk_assessment": [
      {
        "risk_type": "name of risk",
        "description": "how this risk could materialise",
        "likelihood": "Low | Medium | High",
        "severity": "Low | Medium | High",
        "affected_rights": ["which data subject rights are implicated"]
      }
    ],
    "residual_risk_assessment": "framework guidance on assessing residual risk after mitigation",
    "completion_guidance": "What the organisation must complete in this section",
    "annotations": [
      {
        "enforcement_action_id": "exact id string from the enforcement context above (the value after 'id:')",
        "regulator": "regulator name",
        "jurisdiction": "jurisdiction",
        "decision_date": "YYYY-MM-DD or null",
        "summary": "one sentence what the case involved, max 25 words, plain English",
        "outcome": "rejected | accepted | penalised | required",
        "relevance": "one sentence why this case is relevant to a risk in this DPIA"
      }
    ]
  }
}`;

    const promptB = `${sharedContext}

Generate the second half of a DPIA framework document. Return ONLY this JSON structure, no preamble:

{
  "section_4_mitigation": {
    "title": "Measures to Address Risks",
    "guidance_note": "GDPR Article 35(7)(d) requires measures envisaged to address the risks.",
    "proposed_measures": [
      {
        "measure": "name of measure",
        "addresses_risk": "which risk this addresses",
        "implementation_guidance": "how to implement",
        "residual_risk_after": "expected residual risk level after implementation"
      }
    ],
    "completion_guidance": "What the organisation must complete in this section"
  },
  "section_5_consultation": {
    "title": "DPO and Stakeholder Consultation",
    "guidance_note": "Where a DPO is designated (GDPR Article 35(2)), their advice must be sought and documented. The DPO's role is advisory — the controller is responsible for the DPIA decision and sign-off. Do not give the DPO an approval or sign-off gating role; record their advice and whether it was accepted.",
    "dpo_consultation_required": "Required if a DPO is designated (GDPR Article 35(2)). If no DPO is designated, assess whether Article 37 appointment is triggered (public authority, large-scale systematic monitoring, or large-scale special category processing) and document that assessment here.",
    "dpo_consultation_record": "Template for recording DPO consultation — DPO name and contact: [TO COMPLETE] | Date consulted: [TO COMPLETE DD/MM/YYYY] | Summary of advice given: [TO COMPLETE] | DPO recommendations accepted / partially accepted / not accepted (with reasons): [TO COMPLETE]",
    "stakeholder_consultation": "list any other stakeholders who should be consulted",
    "completion_guidance": "What the organisation must complete in this section"
  },
  "section_6_conclusion": {
    "title": "Conclusion and Sign-Off",
    "guidance_note": "Document whether identified risks are acceptable and whether supervisory authority consultation is required.",
    "supervisory_authority_consultation_required": "conditional guidance on when consultation is required",
    "sign_off_template": "template for DPO/counsel sign-off attestation",
    "review_schedule": "recommended review triggers for this DPIA"
  },
  "framework_disclaimer": "This DPIA framework document is provided as a compliance framework tool to assist organisations in structuring their Data Protection Impact Assessment process. It is not a completed DPIA and does not satisfy the requirements of GDPR Article 35 on its own. The organisation's qualified Data Protection Officer or legal counsel must review, complete, and own this document. This framework does not constitute legal advice."
}`;

    function parseJsonish(text: string): any {
      try {
        const m = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : {};
      } catch (e) {
        console.error("[DPIA] parse error:", e, "Tail:", text.slice(-200));
        return {};
      }
    }

    async function genHalf(prompt: string, extraUser: string): Promise<any> {
      const finalUser = extraUser ? `${prompt}\n\n${extraUser}` : prompt;
      let r = await callAnthropic("claude-sonnet-4-6", systemWithGdpr, finalUser, 6000);
      if (r.stopReason === "max_tokens") {
        console.warn("[DPIA] genHalf truncated_output — retrying once at 1.5x");
        r = await callAnthropic("claude-sonnet-4-6", systemWithGdpr, finalUser, Math.ceil(6000 * 1.5));
        if (r.stopReason === "max_tokens") {
          console.error("[DPIA] genHalf truncated_output after retry — returning empty half");
          return {};
        }
      }
      return parseJsonish(r.text);
    }

    let [partA, partB] = await Promise.all([genHalf(promptA, ""), genHalf(promptB, "")]);

    let reportData: any = { ...partA, ...partB };

    // Lint narrative strings across the framework JSON; one retry on hard violations
    // — surgically regenerating ONLY the half(s) whose top-level keys contain hard
    // violations, so a clean half is preserved.
    const lintViolations: any[] = [];
    const hardKeys = new Set<string>(); // top-level keys (e.g. "section_3_risks") with hard violations
    const hardDetailsByKey = new Map<string, string[]>();
    function walkAndLint(obj: any, path: string, topKey: string | null): boolean {
      let hardSeen = false;
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          if (typeof obj[i] === "string") {
            const r = lintReportText(obj[i]);
            for (const v of r.violations) lintViolations.push({ field: `${path}[${i}]`, ...v });
            if (hasHardViolations(r)) {
              hardSeen = true;
              if (topKey) {
                hardKeys.add(topKey);
                const arr = hardDetailsByKey.get(topKey) ?? [];
                for (const v of r.violations) arr.push(`${v.code}: ${v.detail}`);
                hardDetailsByKey.set(topKey, arr);
              }
            }
            obj[i] = r.clean;
          } else if (obj[i] && typeof obj[i] === "object") {
            if (walkAndLint(obj[i], `${path}[${i}]`, topKey)) hardSeen = true;
          }
        }
      } else if (obj && typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          const nextTop = topKey ?? k;
          if (typeof v === "string") {
            const r = lintReportText(v);
            for (const vi of r.violations) lintViolations.push({ field: `${path}.${k}`, ...vi });
            if (hasHardViolations(r)) {
              hardSeen = true;
              hardKeys.add(nextTop);
              const arr = hardDetailsByKey.get(nextTop) ?? [];
              for (const vi of r.violations) arr.push(`${vi.code}: ${vi.detail}`);
              hardDetailsByKey.set(nextTop, arr);
            }
            obj[k] = r.clean;
          } else if (v && typeof v === "object") {
            if (walkAndLint(v, `${path}.${k}`, nextTop)) hardSeen = true;
          }
        }
      }
      return hardSeen;
    }

    const HALF_A_KEYS = new Set(["dpia_metadata", "section_1_description", "section_2_necessity", "section_3_risks"]);
    const HALF_B_KEYS = new Set(["section_4_mitigation", "section_5_consultation", "section_6_conclusion", "framework_disclaimer"]);

    if (walkAndLint(reportData, "report", null)) {
      try {
        const detailsA: string[] = [];
        const detailsB: string[] = [];
        let retryA = false;
        let retryB = false;
        for (const k of hardKeys) {
          const inA = HALF_A_KEYS.has(k);
          const inB = HALF_B_KEYS.has(k);
          const details = hardDetailsByKey.get(k) ?? [];
          if (!inA && !inB) {
            // Unknown top-level key — safety: include in both halves
            retryA = true; retryB = true;
            detailsA.push(...details);
            detailsB.push(...details);
            continue;
          }
          if (inA) { retryA = true; detailsA.push(...details); }
          if (inB) { retryB = true; detailsB.push(...details); }
        }
        lintViolations.length = 0;
        hardKeys.clear();
        hardDetailsByKey.clear();

        const retries: Promise<any>[] = [];
        let newA: any = null;
        let newB: any = null;
        if (retryA) {
          const retryInstrA = `PREVIOUS ATTEMPT REJECTED by automated lint for: ${detailsA.join("; ")}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`;
          retries.push(genHalf(promptA, retryInstrA).then((r) => { newA = r; }));
        }
        if (retryB) {
          const retryInstrB = `PREVIOUS ATTEMPT REJECTED by automated lint for: ${detailsB.join("; ")}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`;
          retries.push(genHalf(promptB, retryInstrB).then((r) => { newB = r; }));
        }
        await Promise.all(retries);

        // Merge: retained half stays as-is; affected half(s) overwrite their keys.
        const mergedA = newA ?? partA;
        const mergedB = newB ?? partB;
        reportData = { ...mergedA, ...mergedB };
        walkAndLint(reportData, "report", null);
      } catch (e) {
        console.warn("[DPIA] lint retry failed (non-fatal):", e);
      }
    }

    if (!reportData.section_1_description && !reportData.section_4_mitigation) {
      reportData = {
        framework_disclaimer: "This is a compliance framework tool, not legal advice.",
        error: "Report generation encountered an issue. Please retry."
      };
    }


    reportData.generated_at = new Date().toISOString();
    reportData.dpia_id = dpia_id;
    reportData.enforcement_precedents = enforcementPrecedents;
    reportData.enforcement_meta = enforcementMeta;
    reportData.gdpr_meta = gdprMeta;
    reportData.lint_warnings = lintViolations;
    try {
      reportData.annotations = Array.isArray(reportData?.section_3_risks?.annotations)
        ? reportData.section_3_risks.annotations
        : [];
    } catch { reportData.annotations = []; }

    await supabase.from("dpia_frameworks").update({
      status: "complete",
      report_data: reportData,
      updated_at: new Date().toISOString(),
    }).eq("id", dpia_id);

    // C4 RoPA accumulator
    if (dpia.client_id) {
      const intakeAny = (dpia.intake_data as any) || {};
      const summary = intakeAny.processing_description || intakeAny.activity_description || "Processing activity requiring DPIA";
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: dpia.client_id,
          source_tool: "dpia_framework",
          source_assessment_id: dpia_id,
          display_name: String(summary).slice(0, 120),
          source_summary: String(summary),
          is_high_risk: true,
          category: "other",
        },
      }).catch((e: Error) => console.error("[dpia] accumulate-ropa failed (non-fatal):", e.message));
    }


    const { data: userData } = await supabase.auth.admin.getUserById(
      dpia.user_id
    ).catch(() => ({ data: null as any }));

    // Fire-and-forget upsell signals (non-fatal).
    supabase.functions.invoke('trigger-upsell', {
      body: { tool_type: 'dpia_framework', assessment_id: dpia_id, user_id: dpia.user_id },
    }).catch((e: Error) => console.error('[dpia] trigger-upsell failed (non-fatal):', e.message));

    await supabase.functions.invoke("generate-report-pdf", {
      body: {
        tool_type: "dpia_framework",
        assessment_id: dpia_id,
        user_email: userData?.user?.email || null,
        user_name: userData?.user?.user_metadata?.full_name || null,
        result_url: `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/dpia-framework/result/${dpia_id}`,
      },
    }).catch((e: Error) => console.error("PDF/email delivery failed (non-fatal):", e));

      } catch (bgErr) {
        console.error("run-dpia-framework background error:", bgErr);
        await supabase.from("dpia_frameworks").update({ status: "failed" }).eq("id", dpia_id);
      }
    })());

    return new Response(JSON.stringify({ success: true, dpia_id, status: "processing" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("run-dpia-framework error:", e);
    return new Response(JSON.stringify({ error: "DPIA framework generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
