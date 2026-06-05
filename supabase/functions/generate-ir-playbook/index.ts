// generate-ir-playbook: produces a 7-section breach response playbook.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DPA_PORTALS: Record<string, string> = {
  // ── EU / EEA ─────────────────────────────────────────────────────────────
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
  Greece: "HDPA Breach Report: https://www.dpa.gr/",
  Portugal: "CNPD Breach Notification: https://www.cnpd.pt/",
  Austria: "DSB Breach Notification: https://www.dsb.gv.at/",
  Finland: "Tietosuojavaltuutettu: https://tietosuoja.fi/en/",
  Norway:
    "Datatilsynet NO Report: https://www.datatilsynet.no/en/about-privacy/virksomheters-rettigheter-og-plikter/report-a-data-breach/",
  Luxembourg: "CNPD Luxembourg: https://cnpd.public.lu/en/particuliers/droits/violation.html",

  // ── US FEDERAL ───────────────────────────────────────────────────────────
  "United States (HIPAA)":
    "HHS OCR Breach Portal: https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf",
  "United States (FTC)":
    "FTC Data Breach Resources: https://www.ftc.gov/tips-advice/business-center/privacy-and-security/data-security",
  "United States (SEC)":
    "SEC 8-K / Form 6-K cybersecurity incident disclosure: https://www.sec.gov/",

  // ── US STATES ────────────────────────────────────────────────────────────
  California:
    "California AG Breach Report (500+ CA residents): https://oag.ca.gov/ecrime/databreach/reporting | CPPA Enforcement: https://cppa.ca.gov/",
  Texas:
    "Texas AG Breach Notification (written notice required if 250+ Texans affected — no dedicated online breach notification portal exists; use the consumer protection contact page as reference only): https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint",
  "New York":
    "NY AG Breach Notification (most expedient time, notify AG if 500+ NY residents): https://ag.ny.gov/resources/individuals/data-security",
  Connecticut:
    "CT AG Breach Notification (60 days to individuals, notify AG): https://portal.ct.gov/ag/common-elements/ag-form-items/data-breach-reporting",
  Colorado:
    "CO AG Breach Notification (30 days to AG if 500+ CO residents, 60 days to individuals): https://coag.gov/office-sections/consumer-protection/",
  Virginia:
    "VA AG Breach Notification (60 days): https://www.oag.state.va.us/consumer-protection",
  Oregon:
    "OR AG Breach Notification (30 days to individuals, notify AG): https://www.doj.state.or.us/consumer-protection/",
  Florida:
    "FL AG Breach Notification (30 days, notify AG if 500+ FL residents): https://myfloridalegal.com/",
  Washington:
    "WA AG Breach Notification (30 days if 500+ WA residents, notify AG): https://www.atg.wa.gov/data-breach-notifications",
  Illinois:
    "IL AG Breach Notification (most expedient time, notify AG): https://illinoisattorneygeneral.gov/",
  Massachusetts:
    "MA AG + OCABR Breach Notification (30 days, written notice to AG and OCABR): https://www.mass.gov/info-details/data-breach-notification-requirements",

  // ── CANADA ───────────────────────────────────────────────────────────────
  "Canada (PIPEDA)":
    "OPC PIPEDA Breach Report (report to OPC as soon as feasible when real risk of significant harm): https://www.priv.gc.ca/en/report-a-concern/report-a-privacy-breach-as-an-organization/",
  "Quebec (Law 25)":
    "CAI Breach Notification (notify CAI and individuals 'without delay' — Quebec Law 25 does NOT set a fixed 72-hour statutory deadline; treat 72 hours as a planning benchmark only, not a legal requirement): https://www.cai.gouv.qc.ca/en/organizations/breach-of-confidentiality",
  "Alberta (PIPA)":
    "OIPC AB Breach Report (notify OIPC and affected individuals as soon as practical): https://www.oipc.ab.ca/actions-decisions/breach-reporting/",
  "British Columbia (PIPA)":
    "OIPC BC Breach Report: https://www.oipc.bc.ca/guidance-documents/2070",
  "Ontario (PHIPA)":
    "IPC Ontario PHIPA Breach (notify IPC and affected individuals if risk of harm): https://www.ipc.on.ca/privacy-organizations/breach-notification/",

  // ── APAC ─────────────────────────────────────────────────────────────────
  Australia:
    "OAIC Notifiable Data Breach Report: https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach",
  Singapore:
    "PDPC Breach Notification (3 days for significant harm, 30 days for all qualifying breaches): https://www.pdpc.gov.sg/Overview-of-PDPA/The-Legislation/Personal-Data-Protection-Act/Data-Breach-Notification",
  Japan:
    "PPC Breach Report (as soon as practicable): https://www.ppc.go.jp/en/",
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
    .map((e, i) => {
      const year = e.decision_date ? new Date(e.decision_date).getFullYear() : "—";
      const citation = `${e.regulator ?? "Regulator"} (${year})`;
      return `[E${i + 1}] id:${e.id ?? "—"} CITATION: ${citation} — ${e.subject ?? ""} — ${e.jurisdiction ?? "—"}\n   Fine: ${
        e.fine_amount ?? (e.fine_eur_equivalent ? `€${Number(e.fine_eur_equivalent).toLocaleString()}` : "Not disclosed")
      }\n   Failure: ${e.key_compliance_failure ?? e.violation ?? "—"}\n   Lesson: ${e.preventive_measures ?? "—"}`;
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
The following cases show where organisations were penalised for breach notification failures. Use this to calibrate your timeline and content recommendations.
CITATION RULE: When you reference any of these in section text, use the human-readable CITATION shown (e.g. "ICO (2023)" or "CNIL (2022)") — NEVER the bracketed [E#] code. The [E#] tag is only for your internal lookup. Reserve the exact id values for the ===ANNOTATIONS=== JSON block below.
${formatEnforcementContext(enforcement_context)}

CROSS-JURISDICTIONAL CITATION NOTE: Where an enforcement precedent in the ENFORCEMENT CONTEXT above was issued by a regulator from a different legal system than the jurisdiction being addressed in a section (for example, an AEPD/Spanish DPA decision cited in a Quebec or PIPEDA section), you MUST note explicitly in the text: "This case is from a different legal system and is cited as cross-jurisdictional precedent illustrating regulatory expectations, not as direct authority." Do not present such cases as directly binding.

Generate the following seven sections. Each section MUST begin with a markdown H2 heading using the EXACT format shown (the line "## Section N: TITLE"), so downstream tooling can locate them. Do not omit any section, even if you think it is not applicable — instead, state explicitly within the section why it does not apply.

## Section 1: IMMEDIATE ACTIONS (0–2 HOURS)
Numbered, specific steps. Name the role responsible for each. Be direct.

## Section 2: BREACH ASSESSMENT CHECKLIST
For each jurisdiction listed, state: (a) the notification threshold test, (b) whether this incident likely meets it based on the data types and count provided, (c) your confidence level (High / Medium / Low) and a one-sentence reason.

## Section 3: REGULATORY NOTIFICATION TIMELINE
For each jurisdiction: the deadline (hours from discovery), the notification portal URL (use the portals provided above), the minimum content required for initial notification, what can be filed as preliminary versus what must follow, and – based on the enforcement context – specific omissions that have been penalised. If a processor is involved, include a dedicated step titled "Processor notification" describing how and when the processor must be notified.

## Section 4: INDIVIDUAL NOTIFICATION DECISION TREE
Step-by-step logic for determining whether individuals must be notified, with jurisdiction-specific thresholds. If required: content elements, delivery method, and deadline. Include the verbatim phrase "individual notification" in the section body.

## Section 5: NOTIFICATION TEMPLATES
(a) A DPA initial notification letter template for the primary jurisdiction.
(b) An individual notification template if individual notification is required.
Mark all placeholder fields [IN SQUARE BRACKETS]. The word "template" MUST appear in this section heading or body at least twice.

## Section 6: DOCUMENTATION & ACCOUNTABILITY CHECKLIST
A documentation checklist of records to create and maintain under GDPR Article 33(5) and equivalent requirements. Format as a list of documents with the information each must contain. This is the organisation's accountability trail. The verbatim phrase "documentation checklist" MUST appear in this section.

## Section 7: POST-INCIDENT ACTIONS
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
        max_tokens: 12000,
        stream: true,
        system: `You are a senior data protection incident response specialist with extensive experience advising organizations through live data breach incidents under GDPR, UK GDPR, HIPAA, and US state breach notification laws.

US STATE BREACH NOTIFICATION — KEY TIMELINES (for Section 3):
- California: notify individuals in most expedient time / ≤30 days; notify CA AG if 500+ CA residents affected; no set clock for CPPA
- Texas: notify individuals "as soon as possible" (no fixed window); notify AG if breach affects 250+ Texans; TDPSA adds requirements for personal data breaches
- New York: notify individuals in most expedient time (no fixed window); notify NY AG, DFS, or other regulators if 500+ NY residents; SHIELD Act triggers
- Connecticut: notify individuals ≤60 days; notify CT AG simultaneously
- Colorado: notify individuals ≤60 days; notify CO AG ≤30 days if 500+ CO residents
- Virginia: notify individuals ≤60 days; notify VA AG ≤60 days
- Florida: notify individuals ≤30 days; notify FL AG ≤30 days if 500+ FL residents
- Washington: notify individuals ≤30 days; notify WA AG ≤30 days if 500+ WA residents
- Massachusetts: notify individuals + MA AG + OCABR ≤30 days; must include specific content
- Oregon: notify individuals ≤30 days; notify OR AG if 250+ OR residents
- Illinois: notify individuals "in most expedient time"; notify IL AG if 500+ IL residents

CANADA BREACH NOTIFICATION — KEY TIMELINES (for Section 3):
- PIPEDA: internal log all breaches; notify OPC + individuals "as soon as feasible" when real risk of significant harm (RROSH); no fixed clock but OPC expects prompt action
- Quebec Law 25: notify CAI + affected individuals "without delay" — OPC interprets this as within 72 hours of internal discovery for high-risk incidents
- Alberta PIPA: notify OIPC + individuals "as soon as practical" when real risk of significant harm
- BC PIPA: notify OIPC + individuals when real risk of significant harm (no fixed clock)
- Ontario PHIPA: notify IPC + individuals when breach creates real risk of significant harm to health

Note: US state breach notification laws apply to ALL businesses with data on state residents, regardless of whether the business has a physical presence in that state. A breach affecting California residents triggers California law even if the company is Texas-based.

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
      signal: AbortSignal.timeout(145000),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Claude error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consume SSE stream and concatenate text deltas. Streaming keeps the
    // connection warm for long generations that previously hit the 105s
    // AbortSignal cap when using non-streaming mode.
    let fullText = "";
    const reader = aiRes.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            fullText += evt.delta.text ?? "";
          }
        } catch { /* ignore keepalives / non-JSON */ }
      }
    }
    let playbook_text = fullText
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
        playbook_text = fullText.slice(0, sepIdx).trim()
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
