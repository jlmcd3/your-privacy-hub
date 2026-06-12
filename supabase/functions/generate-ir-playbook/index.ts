// generate-ir-playbook: produces a 7-section breach response playbook.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";

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
  organizationName?: string;
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
      const fineVerified = e.fine_verified !== false;
      const fine = !fineVerified
        ? "fine amount under verification — omitted"
        : (e.fine_eur_equivalent ? `€${Number(e.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
      return `[E${i + 1}] id:${e.id ?? "—"} CITATION: ${citation} — ${e.subject ?? ""} — ${e.jurisdiction ?? "—"}\n   Fine: ${fine}\n   Failure: ${e.key_compliance_failure ?? e.violation ?? "—"}\n   Lesson: ${e.preventive_measures ?? "—"}`;
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
    let enforcementMeta: any = { attempted: false };
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
        enforcementMeta = {
          attempted: true,
          total_matched: typeof j?.total_matched === "number" ? j.total_matched : null,
          query_descriptor: `breach response in ${(body.jurisdictions || []).join(", ") || "—"}`,
        };
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

    // ── Split into TWO PARALLEL Sonnet calls to stay inside the edge runtime
    // wall-clock budget. The prior sequential split still exceeded the platform's
    // ~150s request ceiling because the two generations were additive. Both calls
    // now share the same system prompt and intake block, plus explicit consistency
    // rules, so quality is preserved without making Call B wait for Call A.
    const INTAKE_BLOCK = `INCIDENT DETAILS
Organisation (controller) being assessed: ${body.organizationName || "not specified"}
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
CITATION RULE: When you reference any of these in section text, use the human-readable CITATION shown (e.g. "ICO (2023)" or "CNIL (2022)") — NEVER the bracketed [E#] code. The [E#] tag is only for your internal lookup. Reserve the exact id values for the ===ANNOTATIONS=== JSON block at the very end of the playbook.
${formatEnforcementContext(enforcement_context)}

CROSS-JURISDICTIONAL CITATION NOTE: Where an enforcement precedent in the ENFORCEMENT CONTEXT above was issued by a regulator from a different legal system than the jurisdiction being addressed in a section (for example, an AEPD/Spanish DPA decision cited in a Quebec or PIPEDA section), you MUST note explicitly in the text: "This case is from a different legal system and is cited as cross-jurisdictional precedent illustrating regulatory expectations, not as direct authority." Do not present such cases as directly binding. This rule applies in EVERY section of the playbook including documentation checklists, root-cause-analysis sections, and post-incident sections — not only the first mention. NEVER describe a decision of one national DPA as directly applicable, directly binding, or EU-law precedent in another member state; decisions of national supervisory authorities bind only within their own jurisdiction and are persuasive elsewhere. Only EDPB Article 65 binding decisions and CJEU judgments may be described as binding across member states.`;

    const PROMPT_PART_A = `You are a senior data protection incident response specialist. Generate the FIRST HALF (Sections 1–4) of a complete, actionable 7-section incident response playbook for a data breach. The playbook must be immediately usable by a privacy or legal team during a live incident.

${INTAKE_BLOCK}

Generate ONLY the following four sections now. Each section MUST begin with a markdown H2 heading using the EXACT format shown (the line "## Section N: TITLE"), so downstream tooling can locate them. Do not omit any section, even if you think it is not applicable — instead, state explicitly within the section why it does not apply. Do NOT output Sections 5, 6, 7, or the ===ANNOTATIONS=== block in this response — those will be generated in a follow-up call.

## Section 1: IMMEDIATE ACTIONS (0–2 HOURS)
Numbered, specific steps. Name the role responsible for each. Be direct.

## Section 2: BREACH ASSESSMENT CHECKLIST
For each jurisdiction listed, state: (a) the notification threshold test, (b) whether this incident likely meets it based on the data types and count provided, (c) your confidence level (High / Medium / Low) and a one-sentence reason.

## Section 3: REGULATORY NOTIFICATION TIMELINE
For each jurisdiction: the deadline (hours from discovery), the notification portal URL (use the portals provided above), the minimum content required for initial notification, what can be filed as preliminary versus what must follow, and – based on the enforcement context – specific omissions that have been penalised. If a processor is involved, include a dedicated step titled "Processor notification" describing how and when the processor must be notified.

## Section 4: INDIVIDUAL NOTIFICATION DECISION TREE
Step-by-step logic for determining whether individuals must be notified, with jurisdiction-specific thresholds. If required: content elements, delivery method, and deadline. Include the verbatim phrase "individual notification" in the section body.

Output ONLY Sections 1–4. No preamble, no commentary, no Sections 5–7, no annotations.`;

    const PROMPT_PART_B = `You are a senior data protection incident response specialist. Generate the SECOND HALF (Sections 5–7) of the same complete, actionable 7-section incident response playbook for a data breach, followed by the ===ANNOTATIONS=== block. The playbook must be immediately usable by a privacy or legal team during a live incident.

${INTAKE_BLOCK}

Generate ONLY the following three sections plus annotations now. Each section MUST begin with a markdown H2 heading using the EXACT format shown. Maintain the same deadlines, threshold tests, regulator names, portal URLs, and statutory caution rules that Sections 1–4 will use from the same incident facts and system instructions. Do not refer to "the previous section" or "as above" because this half is generated independently and later merged with Sections 1–4.

## Section 5: NOTIFICATION TEMPLATES
(a) A DPA initial notification letter template for the primary jurisdiction.
(b) An individual notification template if individual notification is required.
Mark all placeholder fields [IN SQUARE BRACKETS]. The word "template" MUST appear in this section heading or body at least twice.

## Section 6: DOCUMENTATION & ACCOUNTABILITY CHECKLIST
A documentation checklist of records to create and maintain under GDPR Article 33(5) and equivalent requirements. Format as a list of documents with the information each must contain. This is the organisation's accountability trail. The verbatim phrase "documentation checklist" MUST appear in this section.

## Section 7: POST-INCIDENT ACTIONS
Remediation steps, root cause analysis requirements, and follow-up obligations.

ANNOTATIONS: After Section 7, add a line:
===ANNOTATIONS===
followed by a JSON array of enforcement citations that directly supported a timeline deadline, threshold test, or notification requirement anywhere in the intended full 7-section playbook. Use the exact id values from the enforcement context (the value after 'id:'). Only cite cases from the ENFORCEMENT CONTEXT — never from training knowledge. Each annotation object has this shape:
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

Output ONLY Sections 5–7 followed by the ===ANNOTATIONS=== block. No preamble, no commentary, do NOT re-output Sections 1–4.`;

    // LEGAL CONSTANTS — verified 2026-06-12 against statute text.
    // Any edit requires re-verification; see lint class past_deadline.
    const SYSTEM_PROMPT = `You are a senior data protection incident response specialist with extensive experience advising organizations through live data breach incidents under GDPR, UK GDPR, HIPAA, and US state breach notification laws.

US STATE BREACH NOTIFICATION — KEY TIMELINES (for Section 3) — Last verified: June 2026:
- California: notify individuals within 30 CALENDAR DAYS of discovery or notification of the breach (Cal. Civ. Code §1798.82, as amended by SB 446, effective 1 Jan 2026); delay only for law enforcement needs or to determine scope/restore system integrity. If 500+ CA residents: electronically submit a sample copy to the CA AG within 15 calendar days of notifying consumers (§1798.82(f)).
- Texas: notify individuals "as soon as possible" under Tex. Bus. & Com. Code §521.053 (Texas Identity Theft Enforcement and Protection Act — NOT the TDPSA, which does not create breach notification obligations); notify TX AG if 250+ Texans affected. Note: the TDPSA (Texas Data Privacy and Security Act, Tex. Bus. & Com. Code Ch. 541) governs data processing rights and obligations but does NOT independently create breach notification duties.
- New York: notify individuals in most expedient time (no fixed window); notify NY AG, DFS, or other regulators if 500+ NY residents; SHIELD Act triggers
- Connecticut: notify individuals ≤60 days; notify CT AG simultaneously
- Colorado: notify individuals in the most expedient time possible and no later than 30 DAYS after determination that a breach occurred (C.R.S. §6-1-716(2)(a)); notify CO AG within the SAME 30-day window if 500+ CO residents. There is no 60-day allowance in Colorado.
- Virginia: notify the Office of the Attorney General AND affected residents without unreasonable delay WHENEVER resident notice is triggered (Va. Code §18.2-186.6(B)) — the AG notice is NOT limited to 1,000+ breaches. There is NO fixed day-count deadline in §18.2-186.6. The 1,000+ threshold additionally triggers notice to nationwide consumer reporting agencies (§E). Notification turns on a harm trigger: the breach causes, or the entity reasonably believes has caused or will cause, identity theft or other fraud.
- Florida: notify individuals ≤30 days; notify FL AG ≤30 days if 500+ FL residents
- Washington: notify individuals ≤30 days; notify WA AG ≤30 days if 500+ WA residents
- Massachusetts: notify individuals + MA AG + OCABR ≤30 days; must include specific content
- Oregon: notify individuals ≤30 days; notify OR AG if 250+ OR residents
- Illinois: notify individuals "in most expedient time"; notify IL AG if 500+ IL residents


CANADA BREACH NOTIFICATION — KEY TIMELINES (for Section 3):
- PIPEDA (federal): log ALL breaches internally regardless of harm. Notify OPC and affected individuals "as soon as feasible" when real risk of significant harm (RROSH) exists. PIPEDA sets NO fixed notification clock — do NOT state a 30-day outer limit or any other fixed deadline as if it were law. The OPC expects prompt action; frame this as "as soon as feasible."
- Quebec Law 25: notify CAI and affected individuals "without delay" (sans délai). There is NO 72-hour statutory deadline in Quebec Law 25 — that deadline comes from GDPR Article 33 and does NOT apply in Quebec. Present this as: notify the CAI promptly once a risk of serious injury is determined; 72 hours is a planning benchmark, not a legal requirement.
- Alberta PIPA: notify OIPC and individuals "as soon as practical" when real risk of significant harm exists.
- BC PIPA: notify OIPC and individuals when real risk of significant harm exists (no fixed clock).
- Ontario PHIPA: notify IPC and individuals when breach creates real risk of significant harm to health. PHIPA applies only where a party qualifies as a health information custodian under PHIPA s.3.

Note: US state breach notification laws apply to ALL businesses with data on state residents, regardless of whether the business has a physical presence in that state. A breach affecting California residents triggers California law even if the company is Texas-based.

Your task: generate a complete, immediately usable incident response playbook tailored to the incident facts and jurisdictions provided. The playbook is generated in TWO sequential turns: Sections 1–4 first, then Sections 5–7 + annotations. Stay perfectly consistent between turns — the deadlines, thresholds, and case citations you use in the second turn must match what you established in the first turn.

QUALITY STANDARDS:
1. Every notification deadline must state the specific hour count from discovery, the legal basis, and the regulator or affected-individual recipient.
2. Every threshold test must state the specific legal standard for this jurisdiction (e.g. "likely to result in a risk to the rights and freedoms of natural persons" — GDPR Art. 33).
3. Notification templates must be immediately usable — mark all placeholder fields as [TO BE COMPLETED: description].
4. Where enforcement context shows regulators have penalised specific omissions (late notification, vague disclosure, missing categories), incorporate concrete steps that close those gaps.
5. DPA portal URLs: use only URLs provided in the prompt. Do not fabricate or recall URLs from training.

CITATION INTEGRITY RULE: Every specific statutory citation you produce (act name, section number, subsection letter) must be verifiable against the actual statute. Known hallucination risks to guard against: (1) PIPEDA does not use decimal sub-principle numbering — cite as "Schedule 1, Principle N (Name)" only. (2) The Breach of Security Safeguards Regulations under PIPEDA are SOR/2018-64 — no other SOR number is correct. (3) US state privacy laws do not have a universal 72-hour breach notification deadline — that is a GDPR Article 33 concept only. Apply it only where GDPR explicitly applies. (4) Quebec Law 25 uses "without delay" not "72 hours" — present 72 hours as a planning benchmark only. (5) California breach notification (Cal. Civ. Code §1798.82, as amended by SB 446 effective 1 Jan 2026): individuals within 30 calendar days of discovery; AG sample copy within 15 calendar days of consumer notice when 500+ CA residents affected. Do NOT describe California as having no fixed deadline — that was the pre-2026 standard. 72 hours remains a GDPR Article 33 concept only. (6) The EU Artificial Intelligence Act must always be cited as "Regulation (EU) 2024/1689" — never 2024/900 or any other number. (7) MONETARY PENALTY RULE: Never state a specific fine, penalty, or settlement amount unless that exact figure appears in the ENFORCEMENT PRECEDENTS block in this prompt. If a case is relevant but its amount is not in the block, write "[fine — verify at ico.org.uk/action-weve-taken/enforcement]" or the relevant regulator's enforcement register URL. Known wrong figures to never use from training: ICO Interserve (2022) is £4,400,000 NOT £5.03M; ICO Capita Pension Solutions (2024) is £6,090,000 NOT £6.88M; ICO Clearview AI (2022) is £7,552,800 NOT £9M; ICO British Airways (2020) is £20,000,000. If any of these cases is not in your enforcement block, do not state any figure for it. (8) EU-UK ADEQUACY: When citing the EU-UK adequacy decision under GDPR Article 45 as a transfer mechanism, add the note "[Verify current status — adequacy decisions are subject to periodic Commission review]". If you are uncertain of a specific section number, write the section in descriptive terms and flag it: "[statutory reference to be confirmed with counsel]" rather than inventing a section number. (9) When stating a computed notification deadline, give the date and time only — NEVER state the day of the week, as computing weekday names is error-prone; if the input data explicitly provides a weekday you may repeat it verbatim. (10) Danish Data Protection Act (Databeskyttelsesloven, Act No. 502 of 23 May 2018): cite the employment-context processing provision as §12. NEVER cite this Act by chapter number — refer to numbered sections (§) only, and if uncertain of the section, describe the obligation and flag [statutory reference to be confirmed with counsel].

Output ONLY the playbook content requested in each turn. No preamble or commentary.`;

    async function callClaude(messages: any[], maxTokens: number): Promise<string> {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: maxTokens,
          stream: true,
          system: SYSTEM_PROMPT,
          messages,
        }),
        signal: AbortSignal.timeout(180000),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Claude error:", errText);
        throw new Error("AI generation failed");
      }
      let out = "";
      const reader = res.body!.getReader();
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
              out += evt.delta.text ?? "";
            }
          } catch { /* keepalive */ }
        }
      }
      return out;
    }

    // CF-2: validate each part's completeness; retry that part once at 9000 tokens.
    const PART_A_HEADINGS = ["## Section 1:", "## Section 2:", "## Section 3:", "## Section 4:"];
    const PART_B_HEADINGS = ["## Section 5:", "## Section 6:", "## Section 7:"];
    const TERMINAL_RE = /[\.\:\?\!\)\]\}"'»”’](\s|$)/;

    function validatePart(text: string, which: "A" | "B"): { ok: boolean; reason?: string } {
      if (!text || !text.trim()) return { ok: false, reason: "empty" };
      const headings = which === "A" ? PART_A_HEADINGS : PART_B_HEADINGS;
      for (const h of headings) {
        if (!text.includes(h)) return { ok: false, reason: `missing heading ${h}` };
      }
      if (which === "B" && !text.includes("===ANNOTATIONS===")) {
        return { ok: false, reason: "missing ===ANNOTATIONS=== block" };
      }
      const beforeAnnot = which === "B"
        ? text.slice(0, text.indexOf("===ANNOTATIONS==="))
        : text;
      const lines = beforeAnnot.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const last = lines[lines.length - 1] ?? "";
      if (!TERMINAL_RE.test(last + " ")) {
        return { ok: false, reason: `last line not terminally punctuated: "${last.slice(-80)}"` };
      }
      return { ok: true };
    }

    async function generatePart(which: "A" | "B", extra: string, maxTokens: number): Promise<string> {
      const base = which === "A" ? PROMPT_PART_A : PROMPT_PART_B;
      const prompt = extra ? `${base}\n\n${extra}` : base;
      return await callClaude([{ role: "user", content: prompt }], maxTokens);
    }

    async function generateHalves(extra: string): Promise<{ partA: string; partB: string; incomplete?: string }> {
      const [a, b] = await Promise.all([
        generatePart("A", extra, 8000),
        generatePart("B", extra, 8000),
      ]);
      let partA = a;
      let partB = b;
      const vA = validatePart(partA, "A");
      if (!vA.ok) {
        console.warn(`[IR Playbook] Part A failed validation (${vA.reason}); retrying at 9000`);
        const retryA = await generatePart(
          "A",
          `${extra}\n\nYour previous attempt was cut off before completing all required sections — produce the complete sections within the response.`.trim(),
          9000,
        );
        const vA2 = validatePart(retryA, "A");
        if (!vA2.ok) return { partA: retryA, partB, incomplete: `partA: ${vA2.reason}` };
        partA = retryA;
      }
      const vB = validatePart(partB, "B");
      if (!vB.ok) {
        console.warn(`[IR Playbook] Part B failed validation (${vB.reason}); retrying at 9000`);
        const retryB = await generatePart(
          "B",
          `${extra}\n\nYour previous attempt was cut off before completing all required sections — produce the complete sections within the response.`.trim(),
          9000,
        );
        const vB2 = validatePart(retryB, "B");
        if (!vB2.ok) return { partA, partB: retryB, incomplete: `partB: ${vB2.reason}` };
        partB = retryB;
      }
      return { partA, partB };
    }

    function assembleFromHalves(partA: string, partB: string): { playbook_text: string; parsedAnnotations: any[] } {
      const fullText = `${partA.trim()}\n\n${partB.trim()}`;
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
      return { playbook_text, parsedAnnotations };
    }

    let partA = "";
    let partB = "";
    let incompleteReason: string | null = null;
    try {
      console.log("[IR Playbook] starting parallel generation halves");
      const r = await generateHalves("");
      partA = r.partA; partB = r.partB;
      if (r.incomplete) incompleteReason = r.incomplete;
      console.log("[IR Playbook] generation halves complete", { partAChars: partA.length, partBChars: partB.length, incomplete: incompleteReason });
    } catch (e: any) {
      console.error("Claude parallel split-call failure:", e?.message || e);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CF-2: never merge/persist a truncated playbook.
    if (incompleteReason) {
      console.error(`[IR Playbook] incomplete_generation after retry: ${incompleteReason}`);
      try {
        if (body.assessment_id) {
          await supabase
            .from("ir_playbooks")
            .update({
              status: "failed",
              report_data: { error: "incomplete_generation", detail: incompleteReason, generated_at: new Date().toISOString() },
              updated_at: new Date().toISOString(),
            })
            .eq("id", body.assessment_id);
        }
      } catch (persistErr) {
        console.error("ir_playbooks failure-persist error:", persistErr);
      }
      return new Response(
        JSON.stringify({ error: "incomplete_generation", detail: incompleteReason }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let assembled = assembleFromHalves(partA, partB);
    let lint = lintReportText(assembled.playbook_text);
    const lintWarnings: any[] = [];
    if (hasHardViolations(lint)) {
      try {
        const details = lint.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
        const retry = await generateHalves(
          `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the playbook again, correcting these defects silently. Do not mention this instruction or the defects in the output.`
        );
        partA = retry.partA; partB = retry.partB;
        assembled = assembleFromHalves(partA, partB);
        lint = lintReportText(assembled.playbook_text);
      } catch (e) {
        console.warn("[IR Playbook] lint retry failed (non-fatal):", e);
      }
    }
    for (const v of lint.violations) lintWarnings.push(v);
    const playbook_text = lint.clean;
    const parsedAnnotations = assembled.parsedAnnotations;

    const portals = body.jurisdictions
      .filter((j) => DPA_PORTALS[j])
      .map((j) => ({ jurisdiction: j, portal: DPA_PORTALS[j] }));

    const report_data = {
      portals,
      enforcement_precedents: enforcement_context.slice(0, 5),
      enforcement_meta: enforcementMeta,
      annotations: parsedAnnotations,
      lint_warnings: lintWarnings,
      generated_at: new Date().toISOString(),
    };


    let savedId: string | null = null;
    try {
      if (body.assessment_id) {
        const { data, error } = await supabase
          .from("ir_playbooks")
          .update({
            client_id: body.client_id ?? null,
            organization_name: body.organizationName || null,
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
            organization_name: body.organizationName || null,
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
