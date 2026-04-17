// generate-dpa: produces a GDPR Article 28 DPA, calibrated to live enforcement context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  assessment_id?: string;
  user_id?: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface EnforcementCtx {
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
    const body = (await req.json()) as Body;

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

    // Step 1 — fetch enforcement context
    let enforcement_context: EnforcementCtx[] = [];
    try {
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
            limit: 8,
          }),
        }
      );
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
                `${i + 1}. ${e.regulator ?? "Regulator"} (${e.jurisdiction ?? "—"}), ${fmtYear(e)}, ${
                  e.industry_sector ?? e.sector ?? "—"
                } sector\n   Fine: ${fmtFine(e)}\n   What went wrong: ${
                  e.key_compliance_failure ?? e.violation ?? "—"
                }\n   What should have been done: ${e.preventive_measures ?? "—"}`
            )
            .join("\n\n")
        : "No specific enforcement precedents retrieved for these parameters.";

    // Step 3 — Sonnet
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a senior data protection counsel specialising in GDPR compliance. Draft a complete, legally rigorous controller-processor Data Processing Agreement (DPA) compliant with GDPR Article 28. The agreement must be immediately usable as a professional document without further editing, except where fields are explicitly marked [TO BE COMPLETED].`;

    const transferSection = body.includeTransferClause
      ? `10. INTERNATIONAL TRANSFER PROVISIONS – mechanism: ${body.transferMechanism}`
      : "";

    const userPrompt = `PARTIES
Controller: ${body.controllerName} (${body.controllerJurisdiction})
Processor: ${body.processorName} (${body.processorJurisdiction})
Services: ${body.services}
Data categories: ${body.dataCategories.join(", ")}
Data subjects: approximately ${body.dataSubjectCount} individuals
Retention: ${body.retention}
Sub-processors: ${body.hasSubProcessors ? "Yes — " + (body.subProcessorList || "(list to be provided)") : "None"}
Legal framework: ${body.legalFramework}
Audit rights: ${body.auditRights}
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
8. POST-TERMINATION OBLIGATIONS
9. AUDIT AND INSPECTION RIGHTS – use ${body.auditRights} standard
${transferSection}
10. LIABILITY
11. TERM AND TERMINATION
12. GOVERNING LAW
13. GENERAL PROVISIONS

[SIGNATURE BLOCK]

Requirements:
- Use professional legal drafting conventions throughout
- Be specific – avoid vague obligations
- Where enforcement context shows regulators have penalised absent or vague provisions, make those provisions explicit and detailed
- Mark any fields requiring controller/processor input as [TO BE COMPLETED: description]
- Output ONLY the DPA document. No preamble, commentary, or explanation.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 6000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
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
    const dpa_text = aiData.content?.[0]?.text ?? "";

    const report_data = {
      enforcement_precedents: enforcement_context.slice(0, 5),
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
            user_id: body.user_id ?? null,
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
