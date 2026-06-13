// check-biometric-compliance: per-jurisdiction biometric obligations + BIPA risk.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";

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
  client_id?: string | null;
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
    note: `Based on ${count.toLocaleString()} enrolled individuals (midpoint of the stated ${enrolledCount} range) × $1,000 (negligent) to $5,000 (intentional) per person. This is a mathematical illustration only — not a legal opinion.`,
  };
}

function formatEnforcementContext(rows: any[]): string {
  if (!rows || rows.length === 0) return "No specific biometric enforcement precedents retrieved.";
  return rows
    .map((e, i) => {
      const fineVerified = e.fine_verified !== false;
      const fine = !fineVerified
        ? "fine amount under verification — omitted"
        : (e.fine_eur_equivalent ? `€${Number(e.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
      return `[E${i + 1}] id:${e.id ?? "—"} ${e.regulator ?? "Regulator"} (${e.jurisdiction ?? "—"}), ${
        e.decision_date ? new Date(e.decision_date).getFullYear() : "—"
      }\n   Fine: ${fine}\n   Failure: ${e.key_compliance_failure ?? e.violation ?? "—"}`;
    })
    .join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = (await req.json()) as Body;
    const resolvedUserId = caller.internal ? (body.user_id ?? null) : caller.userId;


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
    let enforcementMeta: any = { attempted: false };
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
        enforcementMeta = {
          attempted: true,
          total_matched: typeof j?.total_matched === "number" ? j.total_matched : null,
          query_descriptor: `biometric processing in ${(body.jurisdictions || []).join(", ") || "—"}`,
        };
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
${wamhmdApplies ? `
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
${bipaRisk ? `
BIPA LITIGATION RISK ESTIMATE (Illinois) — USE ONLY IF BIPA APPLIES
Use these figures only inside the Illinois section, and only after you have determined that BIPA applies (Applies = Yes or Conditional). Do not surface these numbers before the applicability determination.
Based on ${body.enrolledCount} enrolled individuals:
Low end (negligent violations): $${bipaRisk.lowEnd.toLocaleString()}
High end (intentional violations): $${bipaRisk.highEnd.toLocaleString()}
${bipaRisk.note}
` : ""}
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
        system: `You are a biometric privacy compliance analyst with expertise in BIPA (Illinois), Texas CUBI, Washington My Health My Data, CCPA biometric provisions, GDPR Article 9(1) biometric data, and EDPB biometric guidance.

Your task: produce a structured compliance assessment for a described biometric data processing activity, calibrated to the jurisdictions in scope and recent enforcement precedents.

BIPA — STATUTORY UPDATE (Illinois P.A. 103-0769 (SB 2979), signed and effective 2 August 2024):
  - The 2024 amendment to 740 ILCS 14/20 caps liquidated damages so that a single course of conduct involving the same biometric identifier or information from the same person constitutes a SINGLE violation per person (not one-per-scan as held in Cothron v. White Castle, 2023 IL 128004). Reflect this in the BIPA risk discussion: the per-person figures supplied above remain the ceiling for new conduct on or after 2 Aug 2024; pre-amendment conduct may still face per-scan exposure.
  - Retroactivity of P.A. 103-0769: on April 1, 2026, a unanimous panel of the U.S. Court of Appeals for the Seventh Circuit resolved the district-court split on retroactivity in Clay v. Union Pacific Railroad Co., No. 25-2185, 2026 WL 891902 (7th Cir. Apr. 1, 2026) (consolidated with Gregg v. Central Transport LLC and Willis v. Universal Intermodal Services, Inc.). The court held that the P.A. 103-0769 amendment is a remedial/procedural change under Illinois law and therefore applies retroactively to cases pending at enactment — limiting pre-amendment conduct to one recovery per person in federal court. Note that Illinois state courts are not bound by the Seventh Circuit on this question of Illinois law, and the Illinois Supreme Court has not addressed retroactivity; residual per-scan exposure in state court therefore cannot be fully excluded. Describe pre-amendment exposure as: substantially reduced in federal court by the Seventh Circuit's Clay ruling, with an unresolved residual risk in Illinois state court — NOT as an open federal split, and do not cite Gregg or Schwartz as the current state of federal law.
  - CITATION RULE: When referencing the Seventh Circuit's BIPA retroactivity ruling, always cite it as Clay v. Union Pacific Railroad Co., No. 25-2185, 2026 WL 891902 (7th Cir. Apr. 1, 2026). Do not use "Gregg v. Central Transport LLC" as the primary citation for the appellate decision — Gregg is one of the three consolidated appeals; Clay is the published lead case docket.
  - HEDGING RULE: Do not state that Illinois courts have "consistently held" boilerplate-embedded consent insufficient. Say plaintiffs routinely challenge consent embedded in onboarding paperwork and a standalone release is the defensible practice — frame as risk guidance, not settled holding, unless citing a specific case from the enforcement context.
  - PROOFREADING: proofread headings and prose for duplicated adjacent words (e.g. "vendor-disclosure disclosure") before output.
  - CURRENCY FOOTER: Append to the END of the assessment output: "Precedent and enforcement positions current to the database's last update (June 2026). Verify before reliance."
  - Section 15(b) written-consent and Section 15(a) public retention-and-destruction policy obligations are unchanged. A private right of action remains.
  - HEADCOUNT CONSISTENCY: Whenever you present an illustrative damages calculation using a single enrollment figure drawn from a range in the intake, state the assumption explicitly (e.g. "assumes the midpoint (2,500) of the stated 500–5,000 range") and present the full-range figure alongside it.

CITATION GUARDRAILS:
  - Cite enforcement actions ONLY from the ENFORCEMENT PRECEDENTS block in the user prompt (each tagged [E#] with an id). Never reference ICO, CNIL, AEPD, Garante, or other regulator fines from training knowledge if they are not in that block.
  - Do not invent statute years, fine amounts, or case names. If the enforcement block is empty for a jurisdiction, say so plainly rather than backfilling from memory.
  - ICO v Clearview AI (2022): the actual penalty was £7,552,800. Do NOT write '£9 million' or any other amount. CRITICAL: If Clearview AI does not appear in the ENFORCEMENT PRECEDENTS block provided in this prompt, do NOT reference it at all — not even with the correct figure. Instead write: "The ICO has imposed significant penalties for unlawful biometric data processing — refer to the ICO enforcement register at ico.org.uk for current enforcement figures."
  - Do NOT cite any 2025 or 2026 ICO fine figure from training knowledge. If the ENFORCEMENT PRECEDENTS block contains no ICO biometric cases, write: 'The ICO has imposed significant penalties for unlawful biometric data processing — refer to the ICO enforcement register at ico.org.uk for current figures.' Do not substitute a specific amount.

ENFORCEMENT FIGURES — ACCURACY RULE: When referencing specific monetary penalties, fine amounts, or settlement figures from enforcement actions, use ONLY figures provided in the ENFORCEMENT PRECEDENTS block. Do NOT recall penalty amounts from training knowledge — these change on appeal, may be misremembered, or may refer to the wrong case. Specific risks: (1) The ICO's Clearview AI enforcement (2022) resulted in a £7.5 million penalty — do NOT cite "£9 million" or any other amount. (2) Do NOT cite any specific 2025 fine figure unless it appears in the ENFORCEMENT PRECEDENTS provided. If no enforcement context was retrieved for a specific figure, write: "The ICO has imposed significant penalties for biometric data processing violations — refer to the ICO enforcement register at ico.org.uk for current figures" rather than stating a specific amount.

ENFORCEMENT CASE CITATION FORMAT IN PROSE: When referencing any enforcement case in the body of the compliance assessment, use the human-readable citation shown in the ENFORCEMENT PRECEDENTS block (e.g. "ICO (2022) — Clearview AI" or "DPC (2023) — Centric Health Ltd.") — NEVER the bracketed [E#] code. The [E#] tag exists only for your internal lookup. The [E#] labels are NOT visible to the user and must NOT appear in the output text. Reserve the exact id values exclusively for the ===ANNOTATIONS=== JSON block at the end.

QUALITY STANDARDS:
1. Risk ratings (LOW/MEDIUM/HIGH/CRITICAL) must reflect actual enforcement posture in the named jurisdictions, not theoretical exposure.
2. For BIPA: the litigation risk calculation must account for per-person per-violation statutory damages ($1,000 negligent / $5,000 intentional), the scale of enrolled individuals provided, AND the P.A. 103-0769 single-violation rule for post-August 2024 conduct.
3. Priority actions must be specific — name the law, the requirement, and the concrete control or document the organisation must put in place. No generic "review your practices".
4. Where enforcement precedents show specific omissions that have been sanctioned (e.g. missing written consent, no retention schedule), call those out as priority gaps.

CITATION INTEGRITY RULE: Every specific statutory citation you produce (act name, section number, subsection letter) must be verifiable against the actual statute. Known hallucination risks to guard against: (1) PIPEDA does not use decimal sub-principle numbering — cite as "Schedule 1, Principle N (Name)" only. (2) The Breach of Security Safeguards Regulations under PIPEDA are SOR/2018-64 — no other SOR number is correct. (3) US state privacy laws do not have a universal 72-hour breach notification deadline — that is a GDPR Article 33 concept only. Apply it only where GDPR explicitly applies. (4) Quebec Law 25 uses "without delay" not "72 hours" — present 72 hours as a planning benchmark only. (5) The California breach notification standard is "most expedient time possible" under Cal. Civ. Code §1798.82 — not 30 days or 72 hours. (6) MONETARY PENALTY RULE: Never state a specific monetary fine, penalty, or settlement amount unless that exact figure appears in the ENFORCEMENT PRECEDENTS block provided in this prompt. Training knowledge of regulatory fines is unreliable. If a relevant case exists but its amount is not in the provided block, write "[Regulator] imposed a significant penalty for this type of violation — verify the current figure at the regulator's enforcement register" instead of recalling an amount. Known correct figures (use only if the case is in your enforcement block): ICO Clearview AI (2022) £7,552,800; ICO Interserve (2022) £4,400,000; ICO Capita Pension Solutions (2024) £6,090,000; ICO British Airways (2020) £20,000,000. If you are uncertain of a specific section number, write the section in descriptive terms and flag it: "[statutory reference to be confirmed with counsel]" rather than inventing a section number.

CCPA GLBA SEQUENCING RULE (financial institutions in California): When the Organisation type in the user prompt contains "financial institution", "bank", "credit union", "broker-dealer", "insurer", "lender", "wealth management", or similar financial-services language AND the jurisdictions include California, the GLBA exemption analysis MUST be completed before the CCPA applicability determination. Specifically:
  - The first sub-section of the California section must be a GLBA boundary analysis identifying which data elements and which consumers fall within the GLBA carve-out from CCPA under Cal. Civ. Code § 1798.145(e), and which fall outside it.
  - Only after that boundary analysis may you state CCPA applicability — and only for the data and consumers not covered by the exemption.
  - The "Applies to this organisation" line for California must reflect this scoping. If GLBA covers some but not all of the data, the applicability must read "Conditional — see GLBA boundary analysis below" rather than a flat "Yes".
  - The GLBA analysis must appear as the first sub-section of the California jurisdiction section, before the CCPA Key requirements list.

TEXAS CUBI RETENTION TRIGGER RULE (when Texas CUBI is in scope, via explicit Texas jurisdiction selection OR the OTHER US STATE flag): The Retention and destruction section must reflect the following:
  - The CUBI destruction obligation is triggered when the collection purpose has been satisfied — not on a calendar date from initial collection. The user's stated retention period is the outer ceiling only; destruction may be required earlier when the purpose expires (e.g. account closure, consent withdrawal, service termination, employment ending).
  - Instruct the organisation to define the specific event that triggers purpose expiry for their use case, and to apply the stated retention period as a maximum running from that event, not from the date of collection.
  - If the intake does not specify what event triggers purpose expiry, flag this explicitly as a gap the organisation must address in their retention policy before relying on any stated retention period as a safe harbour.

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
    console.log(`[check-biometric-compliance] gen done stop=${aiData.stop_reason ?? null} chars=${fullText.length}`);
    let assessment_text = fullText
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/^>\s?/gm, '')
      .replace(/^\*\s+/gm, '• ');
    let parsedAnnotations: any[] = [];
    try {
      const sepIdx = fullText.indexOf("===ANNOTATIONS===");
      if (sepIdx !== -1) {
        assessment_text = fullText.slice(0, sepIdx).trim()
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*\*\*/g, '')
          .replace(/\*\*/g, '')
          .replace(/\*([^*\n]+)\*/g, '$1')
          .replace(/^>\s?/gm, '')
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

    // ── R0 PART 3: Output lint on final narrative. Apply auto-fixes;
    // retry once on hard violations; persist lint summary.
    const referenceDate = new Date().toISOString();
    const lintViolations: any[] = [];
    {
      let lint = lintReportText(assessment_text, {
        checkDates: true, checkUnresolvedTokens: true, referenceDate,
      });
      if (lint.clean !== assessment_text) assessment_text = lint.clean;
      if (hasHardViolations(lint)) {
        try {
          const details = lint.violations.filter((v) => v.severity === "hard")
            .map((v) => `${v.code}: ${v.detail}`).join("; ");
          const retryRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 4000,
              system: "You are a biometric privacy compliance analyst. Reproduce the prior assessment, correcting these automated-lint defects silently and without meta-commentary: " + details,
              messages: [
                { role: "user", content: prompt },
                { role: "assistant", content: fullText },
                { role: "user", content: `Regenerate the assessment correcting: ${details}. Same output format, same ===ANNOTATIONS=== block.` },
              ],
            }),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryFull = retryData.content?.[0]?.text ?? "";
            console.log(`[check-biometric-compliance] gen done stop=${retryData.stop_reason ?? null} chars=${retryFull.length}`);
            let retryText = retryFull;
            const sep2 = retryFull.indexOf("===ANNOTATIONS===");
            if (sep2 !== -1) retryText = retryFull.slice(0, sep2).trim();
            retryText = retryText
              .replace(/^#{1,6}\s+/gm, '').replace(/\*\*\*/g, '').replace(/\*\*/g, '')
              .replace(/\*([^*\n]+)\*/g, '$1').replace(/^>\s?/gm, '').replace(/^\*\s+/gm, '• ');
            assessment_text = retryText;
            lint = lintReportText(assessment_text, {
              checkDates: true, checkUnresolvedTokens: true, referenceDate,
            });
            assessment_text = lint.clean;
          }
        } catch (e) {
          console.warn("[Biometric] lint retry failed (non-fatal):", e);
        }
      }
      for (const v of lint.violations) lintViolations.push(v);
    }

    const report_data = {
      bipa_risk: bipaRisk,
      jurisdictions_analysed: body.jurisdictions,
      enforcement_precedents: enforcement_context.slice(0, 5),
      enforcement_meta: enforcementMeta,
      annotations: parsedAnnotations,
      lint_warnings: lintViolations,
      generated_at: new Date().toISOString(),
    };


    let savedId: string | null = null;
    try {
      if (body.assessment_id) {
        const { data, error } = await supabase
          .from("biometric_assessments")
          .update({
            client_id: body.client_id ?? null,
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
            user_id: resolvedUserId,
            client_id: body.client_id ?? null,
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

    // C4 RoPA accumulator: biometric processing is always RoPA-relevant & high-risk
    if (savedId && body.client_id) {
      const useCase = (body as any).use_case || (body as any).biometric_use_case || "Biometric processing";
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: body.client_id,
          source_tool: "biometric_checker",
          source_assessment_id: savedId,
          display_name: `Biometric: ${String(useCase).slice(0, 80)}`,
          source_summary: String(useCase),
          is_high_risk: true,
          category: "technology",
        },
      }).catch((e: Error) => console.error("[biometric] accumulate-ropa failed (non-fatal):", e.message));
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
