// generate-dpa: produces a GDPR Article 28 DPA, calibrated to live enforcement context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  controllerName: string;
  controllerJurisdiction: string;
  processorName: string;
  processorJurisdiction: string;
  services: string;
  dataCategories: string[];
  dataSubjectCount: string;
  retention: string;
  hasSubProcessors: boolean;
  subProcessorList?: string;
  legalFramework: string;
  auditRights: string;
  includeTransferClause: boolean;
  transferMechanism: string;
  documentType?: "gdpr" | "us-state" | "canada" | "dual-eu-us" | "dual-eu-ca";
  assessment_id?: string;
  user_id?: string;
}

const EU_JURS = new Set(["Germany","France","Ireland","Spain","Italy","Netherlands",
  "United Kingdom","Belgium","Sweden","Denmark","Poland","Norway","Portugal",
  "Austria","Finland","Luxembourg","Greece","Switzerland"]);
const US_JURS = new Set(["California","Texas","New York","Connecticut","Colorado",
  "Virginia","Florida","Washington","Illinois","Massachusetts","Oregon","Indiana",
  "Montana","Iowa","Tennessee","Minnesota","Utah","Delaware","United States (federal)"]);
const CA_JURS = new Set(["Canada (federal / PIPEDA)","Quebec (Law 25)","Ontario (PHIPA)",
  "British Columbia (PIPA)","Alberta (PIPA)"]);

function detectDocType(ctrl: string, proc: string, explicit?: string): string {
  if (explicit) return explicit;
  const ctrlEU = EU_JURS.has(ctrl); const procEU = EU_JURS.has(proc);
  const ctrlUS = US_JURS.has(ctrl); const procUS = US_JURS.has(proc);
  const ctrlCA = CA_JURS.has(ctrl); const procCA = CA_JURS.has(proc);
  if ((ctrlEU || procEU) && (ctrlUS || procUS)) return "dual-eu-us";
  if ((ctrlEU || procEU) && (ctrlCA || procCA)) return "dual-eu-ca";
  if (ctrlUS || procUS) return "us-state";
  if (ctrlCA || procCA) return "canada";
  return "gdpr";
}


const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_MODEL = "google/gemini-2.5-flash";

interface EnforcementCtx {
  id?: string;
  regulator?: string;
  jurisdiction?: string;
  decision_date?: string;
  industry_sector?: string;
  sector?: string;
  fine_amount?: string;
  fine_eur_equivalent?: number;
  key_compliance_failure?: string;
  preventive_measures?: string;
  violation?: string;
}

function fmtFine(e: EnforcementCtx): string {
  if (e.fine_amount) return e.fine_amount;
  if (e.fine_eur_equivalent) return `€${Number(e.fine_eur_equivalent).toLocaleString()}`;
  return "Not disclosed";
}

function fmtYear(e: EnforcementCtx): string {
  return e.decision_date ? new Date(e.decision_date).getFullYear().toString() : "—";
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
    // Trust user identity only from the verified JWT; internal webhook
    // callers may pass user_id in the body (service-role bearer).
    const resolvedUserId = caller.internal ? (body.user_id ?? null) : caller.userId;


    // Minimal validation
    const required = ["controllerName", "controllerJurisdiction", "processorName", "processorJurisdiction", "services"];
    for (const k of required) {
      if (!(body as any)[k] || typeof (body as any)[k] !== "string") {
        return new Response(JSON.stringify({ error: `Missing required field: ${k}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // Resolve document type (from request or jurisdictional inference)
    const documentType = detectDocType(
      body.controllerJurisdiction,
      body.processorJurisdiction,
      body.documentType
    );

    // Step 1 — fetch enforcement context
    let enforcement_context: EnforcementCtx[] = [];
    try {
      const enforcementController = new AbortController();
      const enforcementTimeout = setTimeout(() => enforcementController.abort(), 8_000);
      const enforcementRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/get-enforcement-context`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            tool: "dpa-generator",
            jurisdictions: [body.controllerJurisdiction, body.processorJurisdiction],
            data_categories: (body.dataCategories || []).map((c) => c.toLowerCase()),
            document_type: documentType,
            limit: 8,
          }),
          signal: enforcementController.signal,
        }

          signal: enforcementController.signal,
        }
      );
      clearTimeout(enforcementTimeout);
      if (enforcementRes.ok) {
        const json = await enforcementRes.json();
        enforcement_context = json.results || json.enforcement_context || [];
      }
    } catch (e) {
      console.error("get-enforcement-context fetch failed:", e);
    }

    // Step 2 — format for injection
    const enforcementBlock =
      enforcement_context.length > 0
        ? enforcement_context
            .map(
              (e, i) =>
                `[E${i + 1}] id:${e.id ?? "—"} ${e.regulator ?? "Regulator"} (${e.jurisdiction ?? "—"}), ${fmtYear(e)}, ${
                  e.industry_sector ?? e.sector ?? "—"
                } sector\n   Fine: ${fmtFine(e)}\n   What went wrong: ${
                  e.key_compliance_failure ?? e.violation ?? "—"
                }\n   What should have been done: ${e.preventive_measures ?? "—"}`
            )
            .join("\n\n")
        : "No specific enforcement precedents retrieved for these parameters.";

    // Step 3 — Draft via Lovable AI Gateway
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI generation is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GDPR_SYSTEM = `You are a senior data protection counsel specialising in GDPR compliance. Draft a complete, legally rigorous controller-processor Data Processing Agreement (DPA) compliant with GDPR Article 28. The agreement must be immediately usable as a professional document without further editing, except where fields are explicitly marked [TO BE COMPLETED].`;

    const US_SYSTEM = `You are a senior data protection counsel specialising in US state privacy law. Draft a complete, legally rigorous Data Processing Agreement compliant with all applicable US state privacy laws including CCPA/CPRA (California), TDPSA (Texas), CTDPA (Connecticut), VCDPA (Virginia), CPA (Colorado), OCPA (Oregon), and other state laws applicable based on the parties' jurisdictions and where their data subjects reside. The agreement must be immediately usable without further editing except where marked [TO BE COMPLETED].`;

    const CA_SYSTEM = `You are a senior privacy counsel specialising in Canadian privacy law. Draft a complete, legally rigorous Data Processing Agreement compliant with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), Quebec's Act Respecting the Protection of Personal Information in the Private Sector (Law 25 / Bill 64), and applicable provincial privacy laws (PIPA Alberta, PIPA BC, PHIPA Ontario) based on the parties' jurisdictions. The agreement must be immediately usable without further editing except where marked [TO BE COMPLETED].`;

    const DUAL_EU_US_SYSTEM = `You are a senior data protection counsel with expertise in both EU/UK GDPR and US state privacy law. Draft a dual-compliance Data Processing Agreement that satisfies both GDPR Article 28 and US state privacy law requirements (CCPA/CPRA, TDPSA, CTDPA, VCDPA, CPA as applicable). The document must work as a single integrated agreement — not two separate documents stapled together. Where GDPR requirements are stricter, GDPR prevails; where US state requirements are additional, both are captured.`;

    const DUAL_EU_CA_SYSTEM = `You are a senior data protection counsel with expertise in both EU/UK GDPR and Canadian privacy law (PIPEDA, Quebec Law 25, PIPA AB/BC, PHIPA ON). Draft a dual-compliance Data Processing Agreement that satisfies both GDPR Article 28 and applicable Canadian federal/provincial privacy laws as a single integrated agreement. Where GDPR is stricter, GDPR prevails; where Canadian requirements are additional, both are captured.`;

    const transferSection = body.includeTransferClause
      ? `10. INTERNATIONAL TRANSFER PROVISIONS – mechanism: ${body.transferMechanism}`
      : "";

    const PARTIES_BLOCK = `PARTIES
Controller: ${body.controllerName} (${body.controllerJurisdiction})
Processor: ${body.processorName} (${body.processorJurisdiction})
Services: ${body.services}
Data categories: ${body.dataCategories.join(", ")}
Data subjects: approximately ${body.dataSubjectCount} individuals
Retention: ${body.retention}
Sub-processors: ${body.hasSubProcessors ? "Yes — " + (body.subProcessorList || "(list to be provided)") : "None"}
Audit rights: ${body.auditRights}`;

    const ANNOTATIONS_INSTRUCTIONS = `Requirements:
- Use professional legal drafting conventions throughout
- Be specific – avoid vague obligations
- Where enforcement context shows regulators have penalised absent or vague provisions, make those provisions explicit and detailed
- Mark any fields requiring controller/processor input as [TO BE COMPLETED: description]
- Include an annotations array listing every enforcement case from the ENFORCEMENT CONTEXT above that informed a clause choice. Use the exact id value from each case (the value after 'id:'). Only cite cases from the ENFORCEMENT CONTEXT above — never from training knowledge.

Output format:
- First, output ONLY the DPA document. No preamble, commentary, or explanation.
- Then, on a new line, output the exact separator:
===ANNOTATIONS===
- Then, output a JSON array of annotation objects with this shape:
[
  {
    "enforcement_action_id": "exact id string from the enforcement context above",
    "regulator": "regulator name",
    "jurisdiction": "jurisdiction",
    "decision_date": "YYYY-MM-DD or null",
    "summary": "one sentence what the case involved, max 25 words, plain English",
    "outcome": "rejected | accepted | penalised | required",
    "relevance": "one sentence why this case informed a specific clause choice"
  }
]
- If no cases from the context informed any clause choice, output an empty array [].`;

    const GDPR_USER = `${PARTIES_BLOCK}
Legal framework: ${body.legalFramework}
Transfer clause: ${body.includeTransferClause ? body.transferMechanism : "Not required"}

ENFORCEMENT CONTEXT
The following recent enforcement cases are relevant to this DPA. Ensure the provisions in the Security, Sub-Processor, and Audit sections specifically address the compliance failures documented in these cases:

${enforcementBlock}

Draft the complete DPA with ALL of the following sections. Number clauses hierarchically (1.1, 1.2, 1.2.1 etc.):

1. PARTIES AND RECITALS
2. SUBJECT MATTER, NATURE, DURATION AND PURPOSE
3. PROCESSOR OBLIGATIONS (all eight Article 28(3) elements: instructions, confidentiality, security, sub-processors, assistance with rights, assistance with security/breach/DPIA, deletion/return, information/audit)
4. SUB-PROCESSOR PROVISIONS (Articles 28(2) and 28(4)) – include specific approval mechanism and notification timeline
5. SECURITY MEASURES (Article 32) – specify technical and organisational measures calibrated to the data categories listed above
6. DATA BREACH NOTIFICATION (Article 33) – include the specific notification timeline and minimum content requirements
7. DATA SUBJECT RIGHTS ASSISTANCE (Articles 12-23)
8. POST-TERMINATION OBLIGATIONS — MUST include an explicit clause stating that, at the Controller's choice, the Processor shall delete or return all Personal Data to the Controller after the end of the provision of services, and delete existing copies unless retention is required by law (Article 28(3)(g)). Use the exact phrase "delete or return" and reference "Personal Data" within the same sentence.
9. AUDIT AND INSPECTION RIGHTS – use ${body.auditRights} standard
${transferSection}
10. LIABILITY
11. TERM AND TERMINATION
12. GOVERNING LAW
13. GENERAL PROVISIONS

[SIGNATURE BLOCK]

${ANNOTATIONS_INSTRUCTIONS}`;

    const US_USER = `${PARTIES_BLOCK}

ENFORCEMENT CONTEXT
${enforcementBlock}

Draft a complete US State Data Processing Agreement with ALL of the following sections. Number clauses hierarchically (1.1, 1.2, 1.2.1 etc.):

1. PARTIES AND RECITALS — identify applicable state laws based on the parties' jurisdictions and the residency of data subjects likely affected.
2. DEFINITIONS — Personal Data, Sensitive Personal Data, Controller/Business, Processor/Service Provider, Consumer, Processing, Sale, Sharing, Targeted Advertising, Business Purpose — using CCPA § 1798.140 and equivalent state-law definitions.
3. SUBJECT MATTER, NATURE, DURATION AND PURPOSE — state specific business purpose(s); not "as necessary to perform the services."
4. PROCESSOR OBLIGATIONS
   4.1 Processing only on Controller instructions
   4.2 Confidentiality of personnel
   4.3 Security measures (see Section 9)
   4.4 Sub-processor obligations (see Section 7)
   4.5 Consumer rights assistance (see Section 6)
   4.6 Risk assessment / DPIA assistance — TDPSA § 541.109, CTDPA § 8, VCDPA § 59.1-579, CPA § 6-1-1309, OCPA § 646A.574
   4.7 Deletion or return of data at termination (see Section 11)
   4.8 Audit cooperation (see Section 12)
5. PROHIBITED PROCESSING (CCPA/CPRA § 1798.100(d) and equivalents)
   5.1 No Sale or Sharing
   5.2 No Targeted Advertising outside the agreed business purpose
   5.3 No Cross-Context Combination except as permitted by law
   5.4 No Retention Beyond Purpose
   Cite Cal. Civ. Code § 1798.100(d)(1)-(5) and equivalent state provisions explicitly.
6. CONSUMER RIGHTS PASS-THROUGH (Know/Access, Delete, Correct, Opt-Out of Sale/Sharing incl. GPC for California, Limit Use of Sensitive PI, Non-Discrimination) with applicable response timelines per state law.
7. SUB-PROCESSOR PROVISIONS — prior written consent; equivalent obligations flow-down; Processor liable for sub-processors; Schedule A listing.
8. SENSITIVE PERSONAL DATA — heightened protections; opt-in consent for minors' data for targeted advertising or profiling.
9. SECURITY MEASURES — calibrated to data categories and subject count; encryption, access controls, employee training, incident response, pen testing cadence; address failures in enforcement context.
10. DATA BREACH NOTIFICATION — state-specific timelines:
    - California: notify Controller within 72 hours; Controller notifies CA AG if 500+ affected
    - Texas: notify Controller promptly; Controller notifies AG if 250+ Texans affected
    - Connecticut: 72 hours to Controller; Controller notifies AG within 60 days
    - Colorado: 30 days to Controller; Controller notifies AG if 500+ CO residents
    - Virginia: notify Controller within 72 hours; Controller notifies AG within 60 days
    Include minimum notification content per applicable state law.
11. POST-TERMINATION OBLIGATIONS — at Controller's election, Processor shall delete or return all Personal Data and certify deletion in writing within 30 days; no retention except as required by law. Use the exact phrase "delete or return" and reference "Personal Data" in the same sentence.
12. AUDIT AND INSPECTION RIGHTS — use ${body.auditRights} standard; 30 days' notice; more frequent if breach suspected.
13. RECORDKEEPING — sufficient to demonstrate compliance.
14. LIABILITY AND INDEMNIFICATION
15. TERM AND TERMINATION
16. GOVERNING LAW AND DISPUTE RESOLUTION
17. GENERAL PROVISIONS (amendments, entire agreement, severability, counterparts)

[SIGNATURE BLOCK]

Additional requirements:
- Cite the specific statutory provision (e.g. "Cal. Civ. Code § 1798.100(d)(1)") for each key obligation.
- Use the phrases "business purpose" and "prohibited from selling or sharing" explicitly where applicable.

${ANNOTATIONS_INSTRUCTIONS}`;

    const CA_USER = `${PARTIES_BLOCK}

ENFORCEMENT CONTEXT
${enforcementBlock}

Draft a complete Canadian Data Processing Agreement with ALL of the following sections. Number clauses hierarchically:

1. PARTIES AND RECITALS — identify applicable Canadian federal and provincial privacy laws (PIPEDA, Quebec Law 25, PIPA AB, PIPA BC, PHIPA ON) based on parties' jurisdictions and residency of data subjects.
2. DEFINITIONS — Personal Information, Sensitive Personal Information, Controller, Service Provider, Processing, Disclosure — using PIPEDA s.2 and Law 25 definitions.
3. ACCOUNTABILITY (PIPEDA Schedule 1, Principle 1; Law 25 Art. 3.1) — Controller remains accountable; Processor acts on behalf of Controller.
4. CONTRACTUAL PROTECTION REQUIREMENT (PIPEDA Principle 1.2 / Schedule 1 cl. 4.1.3; Quebec Law 25 Art. 18.3) — written contract with service providers, comparable safeguards.
5. PURPOSE LIMITATION AND INSTRUCTIONS — Processor processes only on documented instructions; no secondary use.
6. CONSENT SUPPORT — Processor shall not undermine Controller's consent obligations; assist with withdrawal of consent requests.
7. SECURITY SAFEGUARDS (PIPEDA Principle 7 / Schedule 1 cl. 4.7; Law 25 Art. 10; PIPA AB s.34; PIPA BC s.34; PHIPA s.12) — calibrated technical, physical and organisational safeguards.
8. SUB-PROCESSOR PROVISIONS — prior written consent; flow-down obligations; Processor remains accountable through the chain.
9. INDIVIDUAL RIGHTS ASSISTANCE — Access, Correction, Withdrawal of Consent, Data Portability (Law 25 Art. 27), De-indexing (Law 25 Art. 28.1).
10. CROSS-BORDER TRANSFER ASSESSMENT (Law 25 Art. 17; OPC guidance) — privacy impact assessment for transfers outside Quebec/Canada.
11. BREACH OF SECURITY SAFEGUARDS NOTIFICATION (PIPEDA s.10.1 and Breach of Security Safeguards Regulations; Law 25 Art. 3.5; PIPA AB s.34.1) — real risk of significant harm; notify Controller without delay; Controller obligations to OPC/CAI and affected individuals.
12. RETENTION AND DESTRUCTION — destroy or anonymise when purposes accomplished (Law 25 Art. 23).
13. POST-TERMINATION OBLIGATIONS — at Controller's election, Processor shall delete or return all Personal Information and certify in writing. Use the exact phrase "delete or return" and reference "Personal Information" in the same sentence.
14. AUDIT AND INSPECTION RIGHTS — use ${body.auditRights} standard.
15. RECORDKEEPING — Law 25 Art. 8 register of confidentiality incidents (Processor assists).
16. LIABILITY AND INDEMNIFICATION
17. TERM AND TERMINATION
18. GOVERNING LAW (specify province) AND DISPUTE RESOLUTION
19. GENERAL PROVISIONS

[SIGNATURE BLOCK]

Additional requirements:
- Cite specific PIPEDA principles/sections, Law 25 articles, and provincial PIPA/PHIPA sections where applicable.

${ANNOTATIONS_INSTRUCTIONS}`;

    const DUAL_EU_US_USER = `${PARTIES_BLOCK}
Legal framework: GDPR Article 28 + US State Privacy Laws (CCPA/CPRA, TDPSA, CTDPA, VCDPA, CPA as applicable)
Transfer clause: ${body.includeTransferClause ? body.transferMechanism : "SCCs recommended for EU-to-US transfers"}

ENFORCEMENT CONTEXT
${enforcementBlock}

Draft a single integrated dual-compliance DPA. The header recital must include:
"This DPA is entered into to satisfy the requirements of (a) GDPR Article 28, (b) CCPA/CPRA § 1798.100(d), and (c) other applicable US state privacy laws."

Sections (numbered hierarchically):

1. PARTIES AND RECITALS (incl. dual-compliance recital above)
2. DEFINITIONS (harmonised GDPR + US state definitions; where definitions diverge, state both)
3. SUBJECT MATTER, NATURE, DURATION AND PURPOSE (specific business purpose)
4. PROCESSOR OBLIGATIONS — all eight GDPR Art. 28(3) elements PLUS US processor obligations (DPIA assistance, consumer-rights assistance)
5. PROHIBITED PROCESSING (US-specific) — No Sale/Sharing; No Targeted Advertising outside business purpose; No Cross-Context Combination; No Retention Beyond Purpose. Cite Cal. Civ. Code § 1798.100(d)(1)-(5).
6. CONSUMER / DATA SUBJECT RIGHTS — combined GDPR Arts. 12-23 + US state consumer rights (Know/Access, Delete, Correct, Opt-Out of Sale/Sharing incl. GPC, Limit Use of Sensitive PI, Non-Discrimination)
7. SUB-PROCESSOR PROVISIONS (GDPR Arts. 28(2)/(4) + US flow-down)
8. SENSITIVE DATA / SPECIAL CATEGORIES (GDPR Art. 9 + US sensitive PI heightened protections)
9. SECURITY MEASURES (GDPR Art. 32 standards apply)
10. DATA BREACH NOTIFICATION — GDPR Art. 33 (72 hours to supervisory authority) PLUS US state notification timelines (California, Texas, Connecticut, Colorado, Virginia as applicable)
11. INTERNATIONAL TRANSFER PROVISIONS — ${body.includeTransferClause ? body.transferMechanism : "SCCs / supplementary measures"}
12. POST-TERMINATION OBLIGATIONS — at Controller's choice, Processor shall delete or return all Personal Data (Art. 28(3)(g) + US state equivalents). Use the exact phrase "delete or return" and reference "Personal Data".
13. AUDIT AND INSPECTION RIGHTS — ${body.auditRights}
14. RECORDKEEPING (Art. 30 + US state)
15. LIABILITY AND INDEMNIFICATION
16. TERM AND TERMINATION
17. GOVERNING LAW AND DISPUTE RESOLUTION
18. GENERAL PROVISIONS

[SIGNATURE BLOCK]

Where GDPR is stricter, GDPR prevails; where US state law adds requirements, both apply.

${ANNOTATIONS_INSTRUCTIONS}`;

    const DUAL_EU_CA_USER = `${PARTIES_BLOCK}
Legal framework: GDPR Article 28 + Canadian PIPEDA / Quebec Law 25 / applicable provincial PIPA/PHIPA
Transfer clause: ${body.includeTransferClause ? body.transferMechanism : "SCCs / adequacy reliance for EU-Canada"}

ENFORCEMENT CONTEXT
${enforcementBlock}

Draft a single integrated dual-compliance DPA covering GDPR Art. 28 and Canadian federal/provincial privacy law. Header recital:
"This DPA is entered into to satisfy the requirements of (a) GDPR Article 28, (b) PIPEDA Schedule 1 (accountability and contractual protection), and (c) Quebec Law 25 Art. 18.3 and applicable provincial privacy laws."

Sections: combine GDPR Art. 28 obligations (parties, instructions, confidentiality, security Art. 32, sub-processors Arts. 28(2)/(4), data subject rights assistance, breach Art. 33, deletion/return Art. 28(3)(g), audit) with Canadian-specific clauses (accountability through the chain, contractual protection requirement, real-risk-of-significant-harm breach notification, Law 25 PIA for transfers outside Quebec, retention/destruction). Use "delete or return" + "Personal Data" in the post-termination clause.

[SIGNATURE BLOCK]

Where GDPR is stricter, GDPR prevails; where Canadian law adds requirements, both apply.

${ANNOTATIONS_INSTRUCTIONS}`;

    let systemPrompt = GDPR_SYSTEM;
    let userPrompt = GDPR_USER;
    if (documentType === "us-state") { systemPrompt = US_SYSTEM; userPrompt = US_USER; }
    else if (documentType === "canada") { systemPrompt = CA_SYSTEM; userPrompt = CA_USER; }
    else if (documentType === "dual-eu-us") { systemPrompt = DUAL_EU_US_SYSTEM; userPrompt = DUAL_EU_US_USER; }
    else if (documentType === "dual-eu-ca") { systemPrompt = DUAL_EU_CA_SYSTEM; userPrompt = DUAL_EU_CA_USER; }


    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 85_000);
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 6000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: aiController.signal,
    });
    clearTimeout(aiTimeout);

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("DPA AI generation failed:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const fullText = aiData.choices?.[0]?.message?.content ?? "";
    let dpa_text = fullText
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
        dpa_text = fullText.slice(0, sepIdx).trim()
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
      console.warn("[DPA] annotation parse failed (non-fatal):", e);
      parsedAnnotations = [];
    }

    if (!dpa_text.trim()) {
      return new Response(JSON.stringify({ error: "AI generation returned an empty document" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const report_data = {
      enforcement_precedents: enforcement_context.slice(0, 5),
      annotations: parsedAnnotations,
      generated_at: new Date().toISOString(),
    };

    let savedId: string | null = null;
    try {
      if (body.assessment_id) {
        const { data, error } = await supabase
          .from("dpa_documents")
          .update({
            status: "complete",
            intake_data: body,
            document_text: dpa_text,
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
          .from("dpa_documents")
          .insert({
            user_id: resolvedUserId,
            client_id: (body as any).client_id ?? null,
            status: "complete",
            intake_data: body,
            document_text: dpa_text,
            report_data,
          })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }
    } catch (persistErr) {
      console.error("dpa_documents persist failed:", persistErr);
    }

    return new Response(
      JSON.stringify({
        id: savedId,
        dpa_text,
        enforcement_precedents: report_data.enforcement_precedents,
        generated_at: report_data.generated_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-dpa error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
