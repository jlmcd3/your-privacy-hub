// generate-ir-playbook: produces a 7-section breach response playbook.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DPA_PORTALS: Record<string, string> = {
  "United Kingdom":
    "ICO Online Breach Report: https://ico.org.uk/make-a-complaint/data-security-and-journalism/report-a-breach/",
  Ireland:
    "Irish DPC Breach Form: https://www.dataprotection.ie/en/organisations/breach-notification/data-breach-notification-form",
  France: "CNIL NOTIF RGPD Portal: https://notifications.cnil.fr/notifications/",
  Germany:
    "BfDI Breach Notification: https://www.bfdi.bund.de/EN/Datenschutz/DatenpannenMeldung/DatenpannenMeldung_node.html",
  Spain: "AEPD Electronic Seat: https://sedeagpd.gob.es/",
  Italy: "Garante Breach Report: https://www.garanteprivacy.it/",
  Netherlands: "AP Breach Portal: https://autoriteitpersoonsgegevens.nl/en/report-data-breach",
  Belgium: "APD/GBA Notification: https://www.dataprotectionauthority.be/",
  Sweden: "IMY Breach Form: https://www.imy.se/en/",
  Denmark: "Datatilsynet Report: https://www.datatilsynet.dk/english/",
  Poland: "UODO Breach Report: https://uodo.gov.pl/en/",
  "United States (HIPAA)":
    "HHS OCR Breach Portal: https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf",
  "United States (FTC)":
    "FTC Data Breach Resources: https://www.ftc.gov/tips-advice/business-center/privacy-and-security/data-security",
};

interface Body {
  discoveryDateTime: string;
  cause: string;
  dataTypes: string[];
  affectedCount: string;
  jurisdictions: string[];
  processorInvolved: boolean;
  processorName?: string;
  contained: string;
  organisationType: string;
  assessment_id?: string;
  user_id?: string;
  client_id?: string | null;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function mapDataTypesToCategories(types: string[]): string[] {
  const map: Record<string, string> = {
    "Health / medical records": "health",
    "Financial / payment data": "financial",
    "Biometric data": "biometric",
    "Children's data": "children",
    "Location data": "location",
    "Employee / HR data": "employee",
  };
  return [...new Set(types.map((t) => map[t] || "general"))];
}

function formatEnforcementContext(rows: any[]): string {
  if (!rows || rows.length === 0) return "No specific enforcement precedents retrieved for these parameters.";
  return rows
    .map(
      (e, i) =>
        `[E${i + 1}] id:${e.id ?? "—"} ${e.regulator ?? "Regulator"} (${e.jurisdiction ?? "—"}), ${
          e.decision_date ? new Date(e.decision_date).getFullYear() : "—"
        }\n   Fine: ${
          e.fine_amount ?? (e.fine_eur_equivalent ? `€${Number(e.fine_eur_equivalent).toLocaleString()}` : "Not disclosed")
        }\n   Failure: ${e.key_compliance_failure ?? e.violation ?? "—"}\n   Lesson: ${e.preventive_measures ?? "—"}`
    )
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
          tool: "ir-playbook",
          jurisdictions: body.jurisdictions,
          data_categories: mapDataTypesToCategories(body.dataTypes || []),
          breach: true,
          limit: 10,
        }),
      });
      if (er.ok) {
        const j = await er.json();
        enforcement_context = j.results || j.enforcement_context || [];
      }
    } catch (e) {
      console.error("enforcement fetch failed:", e);
    }

    // Step 2 — relevant DPA portals
    const relevantPortals = body.jurisdictions
      .filter((j) => DPA_PORTALS[j])
      .map((j) => `${j}: ${DPA_PORTALS[j]}`)
      .join("\n");

    // Step 3 — Sonnet
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a senior data protection incident response specialist. Generate a complete, actionable incident response playbook for a data breach. The playbook must be immediately usable by a privacy or legal team during a live incident.

INCIDENT DETAILS
Discovery: ${body.discoveryDateTime}
Cause: ${body.cause}
Data types: ${body.dataTypes.join(", ")}
Affected individuals: approximately ${body.affectedCount}
Jurisdictions: ${body.jurisdictions.join(", ")}
Processor involved: ${body.processorInvolved ? "Yes — " + (body.processorName || "(name not provided)") : "No"}
Contained: ${body.contained}
Organisation type: ${body.organisationType}

DPA NOTIFICATION PORTALS FOR RELEVANT JURISDICTIONS
${relevantPortals || "(No portal URLs available for the selected jurisdictions — direct the team to consult the relevant DPA's website.)"}

ENFORCEMENT CONTEXT — BREACH NOTIFICATION FAILURES
The following cases show where organisations were penalised for breach notification failures. Use this to calibrate your timeline and content recommendations:
${formatEnforcementContext(enforcement_context)}

Generate the following seven sections. Each section MUST begin with the exact heading line shown (including the word "Section" and the number), so downstream tooling can locate them:

Section 1: IMMEDIATE ACTIONS (0–2 HOURS)
Numbered, specific steps. Name the role responsible for each. Be direct.

Section 2: BREACH ASSESSMENT CHECKLIST
For each jurisdiction listed, state: (a) the notification threshold test, (b) whether this incident likely meets it based on the data types and count provided, (c) your confidence level (High / Medium / Low) and a one-sentence reason.

Section 3: REGULATORY NOTIFICATION TIMELINE
For each jurisdiction: the deadline (hours from discovery), the notification portal URL (use the portals provided above), the minimum content required for initial notification, what can be filed as preliminary versus what must follow, and – based on the enforcement context – specific omissions that have been penalised.

Section 4: INDIVIDUAL NOTIFICATION DECISION TREE
Step-by-step logic for determining whether individuals must be notified, with jurisdiction-specific thresholds. If required: content elements, delivery method, and deadline.

Section 5: NOTIFICATION TEMPLATES
(a) A DPA initial notification letter template for the primary jurisdiction.
(b) An individual notification template if individual notification is required.
Mark all placeholder fields [IN SQUARE BRACKETS]. The word "template" MUST appear in this section heading or body.

Section 6: DOCUMENTATION & ACCOUNTABILITY CHECKLIST
A documentation checklist of records to create and maintain under GDPR Article 33(5) and equivalent requirements. Format as a list of documents with the information each must contain. This is the organisation's accountability trail. The words "documentation" and "checklist" MUST both appear in this section.

Section 7: POST-INCIDENT ACTIONS
Remediation steps, root cause analysis requirements, and follow-up obligations.

ANNOTATIONS: After the seven sections, add a line:
===ANNOTATIONS===
followed by a JSON array of enforcement citations that directly supported a timeline deadline, threshold test, or notification requirement in sections 1-7. Use the exact id values from the enforcement context above (the value after 'id:'). Only cite cases from the ENFORCEMENT CONTEXT above — never from training knowledge. Each annotation object has this shape:
{
  "enforcement_action_id": "exact id string",
  "regulator": "regulator name",
  "jurisdiction": "jurisdiction",
  "decision_date": "YYYY-MM-DD or null",
  "summary": "one sentence what the case involved, max 25 words, plain English",
  "outcome": "rejected | accepted | penalised | required",
  "relevance": "one sentence why this case is relevant to this playbook"
}
If no cases informed the playbook, output an empty array [].

Output ONLY the playbook (then the ===ANNOTATIONS=== block). No preamble or commentary.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        system: `You are a senior data protection incident response specialist with extensive experience advising organizations through live data breach incidents under GDPR, UK GDPR, HIPAA, and US state breach notification laws.

Your task: generate a complete, immediately usable incident response playbook tailored to the incident facts and jurisdictions provided.

QUALITY STANDARDS:
1. Every notification deadline must state the specific hour count from discovery, the legal basis, and the regulator or affected-individual recipient.
2. Every threshold test must state the specific legal standard for this jurisdiction (e.g. "likely to result in a risk to the rights and freedoms of natural persons" — GDPR Art. 33).
3. Notification templates must be immediately usable — mark all placeholder fields as [TO BE COMPLETED: description].
4. Where enforcement context shows regulators have penalised specific omissions (late notification, vague disclosure, missing categories), incorporate concrete steps that close those gaps.
5. DPA portal URLs: use only URLs provided in the prompt. Do not fabricate or recall URLs from training.

Output ONLY the playbook. No preamble or commentary.`,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(120000),
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
    let playbook_text = fullText
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*/g, '')
      .replace(/^>\s?/gm, '')
      .replace(/^\*\s+/gm, '• ');
    let parsedAnnotations: any[] = [];
    try {
      const sepIdx = fullText.indexOf("===ANNOTATIONS===");
      if (sepIdx !== -1) {
        playbook_text = fullText.slice(0, sepIdx).trim()
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*\*/g, '')
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
      console.warn("[IR Playbook] annotation parse failed (non-fatal):", e);
      parsedAnnotations = [];
    }

    const portals = body.jurisdictions
      .filter((j) => DPA_PORTALS[j])
      .map((j) => ({ jurisdiction: j, portal: DPA_PORTALS[j] }));

    const report_data = {
      portals,
      enforcement_precedents: enforcement_context.slice(0, 5),
      annotations: parsedAnnotations,
      generated_at: new Date().toISOString(),
    };

    let savedId: string | null = null;
    try {
      if (body.assessment_id) {
        const { data, error } = await supabase
          .from("ir_playbooks")
          .update({
            client_id: body.client_id ?? null,
            status: "complete",
            intake_data: body,
            playbook_text,
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
          .from("ir_playbooks")
          .insert({
            user_id: resolvedUserId,
            client_id: body.client_id ?? null,
            status: "complete",
            intake_data: body,
            playbook_text,
            report_data,
          })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }
    } catch (persistErr) {
      console.error("ir_playbooks persist failed:", persistErr);
    }

    return new Response(
      JSON.stringify({
        id: savedId,
        playbook_text,
        portals,
        enforcement_precedents: report_data.enforcement_precedents,
        generated_at: report_data.generated_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-ir-playbook error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
