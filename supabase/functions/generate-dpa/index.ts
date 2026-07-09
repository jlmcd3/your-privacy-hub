// qb8 build active
// run-meter deploy-check v1
// generate-dpa: produces a GDPR Article 28 DPA, calibrated to live enforcement context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { stripEnforcementTags } from "../_shared/enforcement-id-hygiene.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { observeCitations } from "../_shared/citation-observe.ts";
import { PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";

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
  const normalize = (raw: string): string => {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) return trimmed;
    if (/^(the )?united states( of america)?$|^usa$|^u\.?s\.?a?\.?$/i.test(trimmed)) {
      return "United States (federal)";
    }
    if (/^(the )?united kingdom$|^uk$|^great britain$|^gb$/i.test(trimmed)) {
      return "United Kingdom";
    }
    return trimmed;
  };
  const ctrlN = normalize(ctrl);
  const procN = normalize(proc);
  const ctrlEU = EU_JURS.has(ctrlN); const procEU = EU_JURS.has(procN);
  const ctrlUS = US_JURS.has(ctrlN); const procUS = US_JURS.has(procN);
  const ctrlCA = CA_JURS.has(ctrlN); const procCA = CA_JURS.has(procN);
  if ((ctrlEU || procEU) && (ctrlUS || procUS)) return "dual-eu-us";
  if ((ctrlEU || procEU) && (ctrlCA || procCA)) return "dual-eu-ca";
  if (ctrlUS || procUS) return "us-state";
  if (ctrlCA || procCA) return "canada";
  if (ctrlN && procN && !ctrlEU && !procEU && !ctrlUS && !procUS && !ctrlCA && !procCA) {
    console.warn(`[generate-dpa] detectDocType fell through to gdpr default — raw values: controller="${ctrl}", processor="${proc}"`);
  }
  return "gdpr";
}


// Sector-specific data category detection for US DPA module injection
function detectDataSectorFlags(dataCategories: string[], services = ""): {
  hasChildrensData: boolean;
  hasHealthData: boolean;
  hasFinancialData: boolean;
  isComplexRoleSector: boolean;
  complexRoleSectorName: string;
} {
  const cats = dataCategories.map((c) => c.toLowerCase());
  const svc = services.toLowerCase();
  const isAdTech = svc.includes("adtech") || svc.includes("programmatic") || svc.includes("rtb") || svc.includes("audience") || svc.includes("targeting") || svc.includes("identity resolution");
  const isDataBroker = svc.includes("data broker") || svc.includes("enrichment") || svc.includes("data intelligence") || svc.includes("audience data") || svc.includes("data onboarding");
  const isAI = svc.includes("model training") || svc.includes("machine learning") || svc.includes("ai training") || svc.includes("inference platform") || svc.includes("llm");
  const isSocial = svc.includes("social media") || svc.includes("social platform") || svc.includes("user-generated content");
  const complexRoleSectorName = isAdTech ? "AdTech/programmatic advertising" : isDataBroker ? "data brokerage/enrichment" : isAI ? "AI/ML model training" : isSocial ? "social media platform" : "";
  return {
    hasChildrensData: cats.some((c) => c.includes("children") || c.includes("minor") || c.includes("under 18")),
    hasHealthData: cats.some((c) => c.includes("health") || c.includes("medical") || c.includes("clinical") || c.includes("patient")),
    hasFinancialData: cats.some((c) => c.includes("financial") || c.includes("payment") || c.includes("banking") || c.includes("credit") || c.includes("insurance")),
    isComplexRoleSector: isAdTech || isDataBroker || isAI || isSocial,
    complexRoleSectorName,
  };
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const AI_MODEL = "claude-sonnet-4-6";

interface EnforcementCtx {
  id?: string;
  regulator?: string;
  jurisdiction?: string;
  decision_date?: string;
  industry_sector?: string;
  sector?: string;
  fine_amount?: string;
  fine_eur_equivalent?: number;
  fine_verified?: boolean;
  key_compliance_failure?: string;
  preventive_measures?: string;
  violation?: string;
}

function fmtFine(e: EnforcementCtx): string {
  if (e.fine_verified === false) return "fine amount under verification — omitted";
  if (e.fine_eur_equivalent) return `€${Number(e.fine_eur_equivalent).toLocaleString()}`;
  return "fine: n/a";
}

function fmtYear(e: EnforcementCtx): string {
  return e.decision_date ? new Date(e.decision_date).getFullYear().toString() : "—";
}

Deno.serve(async (req) => {
  console.log(`[qb9] generate-dpa build active · core=${PROMPT_CORE_VERSION}`);
  console.log("[generate-dpa] qb7 qb7r build active");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let body = (await req.json()) as Body;
    // Trust user identity only from the verified JWT; internal webhook
    // callers may pass user_id in the body (service-role bearer).
    const resolvedUserId = caller.internal ? (body.user_id ?? null) : caller.userId;

    // Row-first dispatch — on the webhook path (payments-webhook invokes with
    // only { assessment_id }), hydrate body from the stored intake_data BEFORE
    // validating. Then create/update the row with status='processing' and
    // dispatch the heavy work via EdgeRuntime.waitUntil, returning 202.
    let rowId: string;
    if (body.assessment_id) {
      const { data: row, error: rowErr } = await supabase
        .from("dpa_documents")
        .select("id, intake_data, client_id")
        .eq("id", body.assessment_id)
        .maybeSingle();
      if (rowErr || !row) {
        return new Response(JSON.stringify({ error: "DPA document not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      body = { ...((row.intake_data as any) ?? {}), ...body };
    }

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

    if (body.assessment_id) {
      await supabase
        .from("dpa_documents")
        .update({ status: "processing", intake_data: body, updated_at: new Date().toISOString() })
        .eq("id", body.assessment_id);
      rowId = body.assessment_id;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("dpa_documents")
        .insert({
          user_id: resolvedUserId,
          client_id: (body as any).client_id ?? null,
          status: "processing",
          intake_data: body,
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        console.error("[generate-dpa] insert failed:", insErr);
        return new Response(JSON.stringify({ error: "Failed to create DPA row" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rowId = inserted.id;
    }

    if (!ANTHROPIC_API_KEY) {
      await supabase.from("dpa_documents").update({
        status: "failed",
        updated_at: new Date().toISOString(),
      }).eq("id", rowId);
      return new Response(JSON.stringify({ error: "AI generation is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const runBackground = async () => {
      // Stamp attempt time immediately so watchdog/operator can see the row is
      // being worked on and distinguish from an abandoned 'processing' row.
      try {
        await supabase.from("dpa_documents").update({
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", rowId);
      } catch (_e) { /* non-fatal */ }
      try {
    // Resolve document type (from request or jurisdictional inference)
    const documentType = detectDocType(
      body.controllerJurisdiction,
      body.processorJurisdiction,
      body.documentType
    );

    // Sector-specific data category flags (used for US-mode module injection)
    const sectorFlags = detectDataSectorFlags(body.dataCategories || [], body.services || "");

    // Step 1 — fetch enforcement context
    let enforcement_context: EnforcementCtx[] = [];
    let enforcementMeta: any = { attempted: false };
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
            articles: ["gdpr:28", "gdpr:32", "gdpr:33"],
            limit: 8,
          }),
          signal: enforcementController.signal,
        }
      );

      clearTimeout(enforcementTimeout);
      if (enforcementRes.ok) {
        const json = await enforcementRes.json();
        enforcement_context = json.results || json.enforcement_context || [];
        enforcementMeta = {
          attempted: true,
          total_matched: typeof json?.total_matched === "number" ? json.total_matched : null,
          query_descriptor: `${documentType} between ${body.controllerJurisdiction || "—"} and ${body.processorJurisdiction || "—"}`,
        };
      }
    } catch (e) {
      console.error("get-enforcement-context fetch failed:", e);
    }

    // Step 1b — GDPR authority context (deterministic articles + EDPB Art. 28 guidance)
    const dpaJurisdiction: "eu" | "uk" =
      [body.controllerJurisdiction, body.processorJurisdiction]
        .some((j) => /united kingdom|uk|gb/i.test(String(j ?? "")))
        ? "uk" : "eu";
    let gdprBlock = "";
    let gdprMeta: any = { attempted: false };
    try {
      const semanticQuery =
        `Controller-processor DPA: ${body.controllerName} (${body.controllerJurisdiction}) engages ${body.processorName} (${body.processorJurisdiction}) for ${body.services}. Data: ${(body.dataCategories || []).join(", ")}.`;
      const r = await getGdprContext(supabase, {
        articles: ["28", "32", "33"],
        jurisdiction: dpaJurisdiction,
        guidelineArticles: ["28"],
        semanticQuery,
      });
      gdprBlock = r.block;
      gdprMeta = r.meta;
    } catch (e) {
      console.error("getGdprContext failed (non-fatal):", e);
    }

    // Step 2 — format for injection
    const enforcementBlock =
      enforcement_context.length > 0
        ? enforcement_context
            .map((e, i) => {
              const provs = Array.isArray((e as any).statutory_provisions) && (e as any).statutory_provisions.length
                ? ` — citing ${(e as any).statutory_provisions.join(", ")}` : "";
              return `[E${i + 1}] id:${e.id ?? "—"} ${e.regulator ?? "Regulator"} (${e.jurisdiction ?? "—"}), ${fmtYear(e)}, ${
                e.industry_sector ?? e.sector ?? "—"
              } sector${provs}\n   Fine: ${fmtFine(e)}\n   What went wrong: ${
                e.key_compliance_failure ?? e.violation ?? "—"
              }\n   What should have been done: ${e.preventive_measures ?? "—"}`;
            })
            .join("\n\n")
        : "No specific enforcement precedents retrieved for these parameters.";

    // Step 3 — Draft via Anthropic API (ANTHROPIC_API_KEY presence already verified before dispatch)



    const GDPR_SYSTEM = `You are a senior data protection counsel specialising in GDPR compliance. Draft a complete, legally rigorous controller-processor Data Processing Agreement (DPA) compliant with GDPR Article 28. The agreement must be immediately usable as a professional document without further editing, except where fields are explicitly marked [TO BE COMPLETED].

EU-CONTROLLER PRIMARY RULE: Identify the controller's jurisdiction from the PARTIES block. If the controller is established in an EU/EEA member state (Germany, France, Ireland, Spain, Italy, Netherlands, Belgium, Sweden, Denmark, Poland, Norway, Portugal, Austria, Finland, Luxembourg, Greece, Switzerland, or any other EU/EEA state), the PRIMARY legal framework is EU GDPR (Regulation (EU) 2016/679). UK GDPR TERRITORIAL-SCOPE TRIGGER (QL2-FIX-1 Item 6, verified against UK GDPR Article 3 as retained in UK law by section 3 of the European Union (Withdrawal) Act 2018 and modified by the Data Protection, Privacy and Electronic Communications (Amendments etc) (EU Exit) Regulations 2019/419, published at legislation.gov.uk): UK GDPR applies IN ADDITION where, and only where, the processing falls within the TERRITORIAL SCOPE of the UK GDPR — that is, either (i) Article 3(1): the processing is carried out in the context of the activities of an establishment of a controller or processor in the United Kingdom, regardless of whether the processing takes place in the United Kingdom, or (ii) Article 3(2): the controller or processor is not established in the United Kingdom but the processing activities relate to (a) the offering of goods or services to data subjects in the United Kingdom or (b) the monitoring of the behaviour of data subjects in the United Kingdom as far as their behaviour takes place within the United Kingdom. Applicability is a territorial-scope determination, NOT the weaker "involves data subjects in the UK or a UK-established party" test. Do NOT produce a DPA that references only UK GDPR for an EU-established controller. The recitals must cite Regulation (EU) 2016/679 as the operative instrument. If the intake confirms that the processing falls within UK GDPR territorial scope under Article 3(1) or 3(2) (not merely that UK involvement is possible), add, unambiguously as a present-tense statement of applicability, not a hedge: "This DPA is also governed by the UK General Data Protection Regulation ('UK GDPR') as defined in section 3(10) of the Data Protection Act 2018, in respect of processing that falls within its territorial scope under Article 3(1) (UK-established controller or processor) or Article 3(2) (offering of goods or services to, or monitoring of behaviour of, data subjects in the United Kingdom)." If UK GDPR territorial scope is NOT engaged by the intake, do not add any UK-GDPR sentence at all — state plainly that this DPA is governed by EU GDPR only, that it does not purport to govern UK GDPR obligations, and that a separate addendum addressing UK GDPR compliance is required if the processing later falls within UK GDPR territorial scope (use this exact operative phrasing: "This DPA is governed by the EU GDPR only and does not purport to govern UK GDPR obligations. If, at any time after the Effective Date, the processing under this DPA falls within the territorial scope of the UK GDPR under Article 3(1) or Article 3(2), the Parties shall execute a separate addendum addressing UK GDPR compliance before any such processing commences.") — and, where the document's transfer section separately governs transfers to UK-established recipients under the European Commission's adequacy decision for the UK, the recital adds 'This is without prejudice to the transfer provisions of this DPA governing transfers to UK-established recipients under the European Commission's adequacy decision.' The addendum statement concerns UK GDPR obligations on the Parties; it must never be phrased so it could be read as restricting EEA-to-UK transfers the transfer section already permits. Never use language that could be read as leaving it open whether UK GDPR currently applies (e.g. "where applicable," "to the extent the processing... also involve[s]...") without the intake having actually confirmed UK GDPR territorial scope. CLAUSE 3.2 INFRINGEMENT-NOTIFICATION LIST (QL2-FIX-1 Item 6): where the DPA includes a Processor duty under Article 28(3)(h) to inform the Controller if, in the Processor's opinion, an instruction infringes data-protection law, the enumerated list of laws is: 'the EU GDPR, other applicable Union or Member State data protection provisions, the UK GDPR (where applicable under its Article 3 territorial scope), and any other applicable data protection laws to which the Processor is subject.' Never omit the UK GDPR clause where UK GDPR territorial scope is engaged.

UK-TO-EEA TRANSFER RULE: Where the Controller is established in the UK and the Processor in an EEA member state, the transfer-confirmation clause must state that the transfer is permitted under the UK's adequacy regulations covering the EEA, and that no additional Article 46 UK GDPR safeguards are required while those regulations remain in force. Do not describe such transfers as merely 'covered under the GDPR regime'.

EEA-TO-UK SUB-PROCESSOR TRANSFER RULE: Where a named sub-processor is established in the United Kingdom and the data originates from an EEA-established Controller or Processor, the transfer clause must state that the EU's adequacy decision for the United Kingdom (Article 45 GDPR, adopted 19 December 2025, valid until 27 December 2031) governs the transfer, and that NO Article 46 safeguard (SCCs, BCRs) is required while that adequacy decision remains in force. Never describe UK adequacy as something a party 'may rely on' as one option among Article 46 safeguards — adequacy under Article 45 and safeguards under Article 46 are different tiers; a transfer covered by adequacy does not need an Article 46 safeguard at all. Correct phrasing: 'Transfers to [Sub-processor], established in the United Kingdom, are governed by the European Commission's adequacy decision for the United Kingdom under Article 45 GDPR; no additional Article 46 safeguard is required for this transfer while that adequacy decision remains in force.'

INTRA-EEA TRANSFER RULE: Where both Controller and Processor are established within the EU/EEA, the international transfer section must open with an explicit statement that the direct Controller-to-Processor transfer does not require an Article 46 safeguard (it is an intra-EEA transfer governed by GDPR without further mechanism). Any SCC or IDTA provisions that follow apply only to onward transfers by the Processor to sub-processors or recipients outside the EEA/UK.

CHILDREN'S DATA ARTICLE 9 RULE: Children's data (data relating to individuals under 18) is NOT Article 9 special-category data merely because the data subjects are children. Do not state or imply that children's data "falls under heightened protection similar to special categories" or triggers Article 35(3)(b). Children's data may require a DPIA for other reasons (Article 35(1) high-risk processing, or supervisory authority lists), but this must not be framed as an Article 9 or Article 35(3)(b) obligation. If children's data is listed in the data categories, note the heightened data protection obligations for children under GDPR Recital 38 and Article 8, and recommend a DPIA assessment under Article 35(1) — but do NOT cite Article 35(3)(b) as the trigger.

BREACH NOTIFICATION PARTY RULE: Section 6 governs the Processor's notification obligation to the Controller. Sub-clause 6.2.4 (measures to address the breach) must state: "Describe the measures taken or proposed to be taken by the Processor to address the Personal Data Breach" — NOT "by the Controller." The Controller's own measures are described in its separate Article 33(1) notification to the supervisory authority, which is a distinct instrument. Never write "measures taken or proposed to be taken by the Controller" in the Processor's DPA notification clause.`;

    const US_STATE_CITATION_ANCHORS = `

VERIFIED US-STATE CITATION ANCHORS (verified against the official state legislative sources, July 2026 — cite these WITHOUT the '[statutory reference to be confirmed with counsel]' hedge; the hedge is reserved for citations OUTSIDE this list):

CONNECTICUT (CTDPA, Conn. Gen. Stat. ch. 743jj): §42-515 definitions; §42-516 applicability; §42-518 consumer rights (access, correction, deletion, portability, opt-out) and controller response duties — respond without undue delay, no later than 45 days of receipt, extendable once by 45 days, with an appeal process; §42-520 controller duties, including the duty not to process sensitive data without the consumer's consent (COPPA compliance for known children); §42-521 processor duties and the required controller-processor contract; §42-522 data protection assessments (NEVER cite §42-523 for assessments — §42-523 is de-identified and pseudonymous data); §42-525 enforcement by the Attorney General.

OREGON (OCPA, ORS 646A.570–646A.589): 646A.570 definitions; 646A.572 scope and exclusions (NOT a sensitive-data provision); 646A.574 consumer rights — response without undue delay and not later than 45 days after receiving the request (646A.574(5)(a)), extendable; 646A.578 controller duties, including the prohibition on processing sensitive data about a consumer without first obtaining the consumer's consent; 646A.581 processor duties and the required controller-processor contract; 646A.586 data protection assessments; 646A.589 Attorney General investigative authority. Oregon BREACH notification is the separate Oregon Consumer Information Protection Act — cite the operative notice provision ORS 646A.604, never 646A.600 (the short title).

VIRGINIA (VCDPA, Va. Code §§59.1-575–585): 59.1-575 DEFINITIONS ONLY (biometric data; the consumer definition excludes employment context) — never cite 59.1-575 for minimization or substantive duties; 59.1-576 scope and exemptions; 59.1-577 consumer rights with the 45-day response at 59.1-577(B)(1), extendable once, and appeals at 59.1-577(C); 59.1-578 controller duties — minimization 578(A)(1), purpose limitation 578(A)(2), security 578(A)(3), non-discrimination 578(A)(4), sensitive-data consent 578(A)(5), privacy notice 578(C), sale/targeted-advertising disclosure 578(D); the 2024 VCDPA amendment (cc. 840/844) added the CHILDREN'S-DATA provisions at 578(F) and is the only 2024 VCDPA amendment — never attribute breach-notification content to it; 59.1-579 controller-processor responsibility and contract; 59.1-580 data protection assessments. Virginia breach notification is Va. Code §18.2-186.6, outside the VCDPA.

COLORADO (CPA, C.R.S. 6-1-1301–1313): cite Colorado at the SECTION level with a descriptive gloss — 6-1-1303 definitions; 6-1-1305 responsibility according to role (controller-processor obligations); 6-1-1306 consumer personal data rights; 6-1-1308 duties of controllers; 6-1-1309 data protection assessments. NEVER cite 6-1-1313 for any substantive duty or breach obligation — it is the Attorney General rulemaking/opt-out-mechanism provision. Colorado's breach-notification statute is C.R.S. 6-1-716, outside the CPA. Do not assert Colorado subsection letters not listed here; use the section number plus a descriptive gloss.

HEDGE DISCIPLINE: for any state-law citation NOT covered by these anchors, either cite at the statute level with a descriptive gloss or use the [statutory reference to be confirmed with counsel] flag — never invent a subsection.`;

    const US_SYSTEM = `You are a senior data protection counsel specialising in US state privacy law. Draft a complete, legally rigorous Data Processing Agreement compliant with all applicable US state privacy laws including CCPA/CPRA (California), TDPSA (Texas), CTDPA (Connecticut), VCDPA (Virginia), CPA (Colorado), OCPA (Oregon), and other state laws applicable based on the parties' jurisdictions and where their data subjects reside. The agreement must be immediately usable without further editing except where marked [TO BE COMPLETED].

OUTPUT SCOPE AND LENGTH DISCIPLINE: Draft ONE integrated agreement scoped to the state laws actually engaged by the intake — the parties' stated jurisdictions and the states where the described data subjects reside. Address those states' requirements in consolidated clauses (one obligation clause satisfying all engaged states, noting the strictest standard where they differ), NEVER a separate addendum, restatement, or clause-set per statute. States not engaged by the intake are covered by a single savings clause: 'To the extent the personal information of residents of other US states is processed, the Parties shall comply with the applicable state privacy laws of those states, applying the standards of this DPA as a baseline.' Do not enumerate or summarise statutes beyond the engaged states. Target a complete agreement of ordinary commercial length — comparable to the GDPR-mode DPA — not a treatise; completeness comes from consolidated coverage, not per-state repetition.

BREACH NOTIFICATION PARTY RULE: The breach notification section governs the Processor's notification obligation to the Controller. Any sub-clause requiring description of remedial measures must state those are the measures "taken or proposed to be taken by the Processor" — NOT "by the Controller." The Controller's own measures belong in the Controller's separate notification to regulators and individuals, not in the Processor's DPA notification clause.`;

    const CA_SYSTEM = `You are a senior privacy counsel specialising in Canadian privacy law. Draft a complete, legally rigorous Data Processing Agreement compliant with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), Quebec's Act Respecting the Protection of Personal Information in the Private Sector (Law 25 / Bill 64), and applicable provincial privacy laws (PIPA Alberta, PIPA BC, PHIPA Ontario) based on the parties' jurisdictions. The agreement must be immediately usable without further editing except where marked [TO BE COMPLETED]. PHIPA (Ontario's Personal Health Information Protection Act) applies ONLY where a party qualifies as a health information custodian or agent under PHIPA s.3. If the intake data does not establish health information custodian status for either party, do NOT assert that PHIPA applies. Instead, note in the recitals that PHIPA "may apply to the extent either party qualifies as a health information custodian under PHIPA s.3 — this should be confirmed with legal counsel."

UK DPA 2018 SCHEDULE 1 STRUCTURE — do not confuse these:
- Part 1, paragraph 1: employment, social security, and social protection purposes
- Part 1, paragraph 2: health or social care purposes
- Part 1, paragraph 3: public health
- Part 1, paragraph 4: safeguarding of children and individuals at risk
- Part 2, paragraphs 6–28: substantial public interest conditions (research, journalism, etc.)
When citing a Schedule 1 condition, state the correct Part and paragraph number and its title. "Schedule 1, Part 1, paragraph 2 (health or social care)" is correct. "Schedule 1, paragraph 1 (substantial public interest)" is INCORRECT — substantial public interest is in Part 2. Where a Schedule 1 condition is relevant, cite it as "Schedule 1, Part [1 or 2], paragraph [N] DPA 2018" with the correct title.

ALBERTA PIPA BREACH NOTIFICATION: Sections 34.1–34.6 were added by 2022 amendments and introduce a real-risk-of-significant-harm based notification obligation. These are valid citations for Alberta-based processing. When citing them, note: "applies to processing of personal information of Alberta residents or conducted in Alberta in the course of commercial activity. The standard is 'real risk of significant harm' consistent with PIPEDA."

BREACH NOTIFICATION PARTY RULE: The breach notification section governs the Processor's notification obligation to the Controller. Any sub-clause requiring description of remedial measures must state those are the measures "taken or proposed to be taken by the Processor" — NOT "by the Controller."`;

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
- CONTROLLER/PROCESSOR ROLE VERIFICATION: Before drafting, assess whether the stated Controller-Processor relationship is accurate for the described services. For the following sectors and service types, the model may not be a simple processor — include a recital noting the role determination and recommending legal review: (a) AdTech/programmatic advertising — the ad tech vendor may be an independent controller or joint controller for audience data, bidding decisions, or cross-client profiling; (b) Data brokers/data enrichment — the data broker typically acts as an independent controller, not a processor; a DPA may be insufficient and a controller-to-controller data sharing agreement may be more appropriate; (c) AI/ML model training — if the Processor uses the Controller's data to train models benefiting other clients, it may be acting as an independent controller for that purpose; (d) Social media platforms — platform-level data use for targeting, analytics, or product improvement may constitute independent controllership. For each of these sectors, add a recital in Section 1 stating: "The Parties acknowledge that the role characterisation of [Processor name] as a processor under GDPR Article 28 has been assumed for the purposes of this DPA and should be confirmed with qualified legal counsel, particularly if [Processor name] uses Personal Data for purposes beyond the immediate Services described herein."
- Be specific – avoid vague obligations
- Where enforcement context shows regulators have penalised absent or vague provisions, make those provisions explicit and detailed
- Mark any fields requiring controller/processor input as [TO BE COMPLETED: description]
- PLACEHOLDER NEUTRALITY: a [TO BE COMPLETED: …] placeholder describes WHAT to supply, never a suggested value. Do NOT embed example values or "e.g. …" inside a placeholder (no "[TO BE COMPLETED: key rotation frequency, e.g. 12 months]"). Write "[TO BE COMPLETED: key rotation frequency]". This applies to retention periods, backup/rotation frequencies, remediation timeframes, and all numeric or duration fields. Likewise, do not state a specific encryption standard, retention period, or timeframe as the drafted value unless the intake supplies it — mark it [TO BE COMPLETED]. The ban covers a suggested value in ANY form, not only "e.g.": do NOT write "recommended", "at minimum", "at least", "typically", "commonly", or a stated range inside a placeholder. "[TO BE COMPLETED: notice period, at minimum 30 days is recommended]" and "[TO BE COMPLETED: resolution period — commonly 15–30 days]" are BOTH prohibited; write "[TO BE COMPLETED: notice period]" and "[TO BE COMPLETED: resolution period]". A placeholder names what to supply and stops there.
- ACCOUNTABILITY-MINIMUM EXCEPTION (narrow): the only fields exempt from PLACEHOLDER NEUTRALITY are retention periods for records that exist SOLELY to demonstrate GDPR Art. 5(2) accountability — specifically (a) the processor's retention period for records of controller instructions, and (b) the retention period for sub-processor due-diligence records. For these two fields only, draft a deterministic minimum directly into the clause rather than a placeholder: "for the duration of this DPA and for a period of at least three (3) years thereafter, or such longer period as is required by applicable law." Do NOT extend this exception to any other field — commercial/operational terms (audit-cost allocation, remediation timeframes, RTO/RPO, password policy, backup frequency, key-rotation frequency, access-review frequency, vulnerability-scanning frequency, account-deprovisioning timeframe) remain governed by PLACEHOLDER NEUTRALITY with no drafted value.
- CONTRACTUAL VOICE, NOT ADVICE: every operative sentence in the DPA binds or obligates the Parties or states a representation — it never advises the reader what they "should" do. Do NOT write "the Parties should confirm…", "the Controller should assess…", or "the Parties should consult…". Use "The Parties shall confirm…", "The Controller shall assess…", or a representation ("Each Party represents that…"). Use a single, consistent modal within a clause — do not mix "shall verify" in one sentence with "should consult" in the next for the same obligation. Where a genuine pre-execution verification is needed, express it as an obligation ("The Parties shall verify […] before execution"), never as advisory guidance.
- SPECIAL-CATEGORY DATA — INADVERTENT INCLUSION IS NOT A DPA AMENDMENT EVENT: where the data categories clause states the categories do not include Article 9 special category data "on their face," do not impose a blanket requirement that the DPA be amended in writing before the Processor may act on special category data that is inadvertently included (e.g. appearing in free-text support records). Instead: the Controller represents it does not intend special-category-data transfer under this DPA; if special-category processing is INTENDED, the DPA must be amended before that processing begins; but INADVERTENT inclusion does not void the DPA and must be handled per the Controller's documented instructions, including immediate deletion where instructed. Draft the clause to reflect this distinction rather than a single blanket amendment requirement.
- LIABILITY-CAP FALLBACK CLAUSE: where the liability-cap field is a [TO BE COMPLETED] placeholder deferring to the Principal Agreement, also state the fallback position if the Principal Agreement does not address data-protection liability: e.g. "Where the Principal Agreement does not address limitations applicable to data protection obligations, liability under this DPA shall be [TO BE COMPLETED: unlimited / capped at [X] times annual fees / as otherwise agreed by the Parties]." Do not leave the fallback scenario entirely unaddressed.
- LEAD SA QUALIFICATION: when the Annex names a supervisory authority (e.g. CNIL) as competent for the controller, do not state it is unqualifiedly "the lead supervisory authority" without noting the Art. 55/56 basis: "Where [Controller]'s main establishment is in [Member State] and the processing is cross-border, [authority] will typically be the lead supervisory authority under Article 56 GDPR; the Parties should confirm the lead authority determination if the controller has establishments in other EU Member States."
- NO UNVERIFIED CONCLUSIONS: do not assert a conclusion the intake cannot support — e.g. "No legal form mismatch is identified" or "the registration is current". Where a fact (registered seat, legal form, sub-processor location, transfer mechanism) is not established by the intake, state that the Parties must verify it before execution rather than concluding its status.
- NO ENFORCEMENT FROM MEMORY — AND NO INTAKE META-COMMENTARY IN THE INSTRUMENT: do not assert that a regulator has taken enforcement action, issued decisions, or imposed penalties — neither a specific case nor a general characterisation such as "German regulatory authorities have issued significant enforcement decisions penalising…" — unless that action is supplied in the intake. Recitals must not describe a regulator's enforcement record from training knowledge. State the legal obligation itself and, where motivation is needed, note that the Parties should consult the regulator's published enforcement record — do not present enforcement history, specific or general, as fact. The ABSENCE of enforcement or intake material is never stated in the document either: a recital or clause never reports what the intake did or did not provide ("No specific enforcement precedents have been provided in the intake materials" is a fatal output error — it is generator meta-commentary inside an executable instrument). Recitals state only facts about the Parties, the Services, the purposes, and the governing framework. Where the intake supplies nothing on a topic, the document is silent on that topic or carries a [TO BE COMPLETED: …] placeholder — never a report about the intake.
- NON-EEA PARTIES ON A GDPR FRAMEWORK SAY WHY: where neither Party is established in the EEA or the UK but the DPA is drafted on the GDPR Article 28(3) framework, the Legal Framework section must state the design rationale in one sentence so the framework choice and the applicability statement cannot read as contradictory: "Although neither Party is currently established in the EEA or the UK and the EU GDPR does not, on its face, engage, this DPA adopts the GDPR Article 28(3) framework as its contractual baseline standard; its GDPR-derived provisions apply as contractual obligations between the Parties, and additionally as statutory obligations if and to the extent the processing comes within the scope of the EU GDPR or UK GDPR (including under Article 3(2))." Never assert facial non-applicability and then deploy the full GDPR structure without this baseline-standard sentence.
- OPERATIVE VOICE ONLY: every sentence inside a clause, schedule, or annex is contract language — an obligation, representation, warranty, acknowledgment, definition, or condition. Rationale is expressed through the Parties' voice ('The Processor acknowledges that documented vendor due diligence and ongoing oversight are necessary to …', 'The Processor represents and warrants that …'), NEVER as a compliance advisory or drafter's note. 'The absence of X is a material compliance risk under Article 5(1)(e)' and 'This measure is required to address the risk of …' are fatal voice errors inside operative text. Where a risk observation has no operative home, it becomes a [TO BE COMPLETED: …] instruction to the Parties or is omitted — the executed document argues nothing; it binds.
- DATA-SUBJECT REMEDY CARVE-OUT: where the agreement contains an exclusive-jurisdiction or governing-law clause, include a clause preserving data subjects' rights under GDPR Article 79(2) to bring proceedings in the courts of their habitual-residence Member State, and state that the exclusive-jurisdiction clause governs disputes between the Parties only. Where any transfer to or processing in the UK is possible, note that the UK is a separate third country requiring its own transfer mechanism (UK adequacy, IDTA, or the UK Addendum) assessed separately from EU transfers.
- SCC INCORPORATION LANGUAGE: do not state that the EU SCCs are 'incorporated in Section 10' — Section 10 describes WHEN SCCs are required and references the annex/schedule for execution; the clauses themselves are not attached or executed as part of the generated draft. Use: 'Transfer mechanisms pursuant to Section 10 of this DPA, including EU Standard Contractual Clauses where required,' and clarify that SCCs must be separately executed for each onward transfer in accordance with Section 10 — do not imply the SCCs are already incorporated by reference alone. THE FULL SCC-INCORPORATION SENTENCE APPEARS EXACTLY ONCE IN THE DOCUMENT, wherever the incorporation-by-reference caveat is first stated (typically Section 10.4). Do NOT emit the sentence "Transfer mechanisms pursuant to this Section 10, including EU Standard Contractual Clauses where required, must be separately executed for each onward transfer in accordance with this Section 10 — the EU SCCs are not incorporated into this DPA by reference alone" (or any substantive paraphrase of it) in two consecutive sub-clauses, in the same sub-clause twice, or in both Section 10 and any subsequent Schedule that cross-references Section 10. Subsequent references cross-reference Section 10.4 by number ("as set out in Section 10.4") rather than restating the sentence. A verbatim or near-verbatim second emission of this sentence is a fatal duplication defect equivalent to the sub-processor note defect governed by "REPEATED CONTENT APPEARS ONCE".
- UK ADEQUACY IS CURRENT, NOT A VERIFICATION TASK: the EU's adequacy decisions for the United Kingdom, adopted 19 December 2025, are in force and valid until 27 December 2031. State this as a settled fact ('...are in force as of the Effective Date and remain valid until 27 December 2031, subject to any subsequent withdrawal or suspension'), not as an open item requiring the Parties to 'verify continued validity' — that phrasing manufactures uncertainty where the decision's term is already fixed and known.
- UK IDTA DIRECTIONALITY (CORRECTED): the UK IDTA (or the UK Addendum to the EU SCCs) is a UK GDPR Article 46 safeguard for restricted transfers FROM the United Kingdom to destinations not covered by UK adequacy regulations. It is NEVER required for transfers from the EEA to the UK — those transfers proceed under the European Commission's adequacy decision for the UK while it remains in force, and inbound transfers are not restricted transfers under UK GDPR. State: 'The UK IDTA (or the UK Addendum to the EU SCCs) applies to transfers of personal data from the United Kingdom to third countries not covered by UK adequacy regulations, including onward transfers by UK-established recipients or sub-processors; it does not apply to transfers from the EEA to the United Kingdom, which are governed by the European Commission's adequacy decision for the UK.' Never state or imply that an IDTA or UK Addendum may be required for an EEA-to-UK transfer.
- NO REDUNDANT THIRD-COUNTRY RESTATEMENT: if Section 10 already addresses the UK's third-country status and adequacy coverage, do not repeat the same statement in the governing-law section (or any other section). State it once, in the transfer-provisions section, and cross-reference from elsewhere if needed — do not restate substantively identical transfer-status language in two places.
- US SUB-PROCESSOR TRANSFER GUIDANCE: where a named sub-processor's location or corporate domicile in the intake indicates a likely US establishment, add to the transfer-mechanism NOTE (without filling in the placeholder itself): 'For Sub-processors headquartered or processing in the United States, verify whether they participate in the EU–US Data Privacy Framework (Article 45 adequacy) or whether EU SCCs Module 3 is required; the applicable mechanism must be documented before execution.' This guides the user's verification without asserting which mechanism applies — the placeholder itself remains [TO BE COMPLETED]. THE NOTE APPEARS EXACTLY ONCE, as a standalone note immediately before the sub-processor table; the table's Transfer Mechanism entries carry only the [TO BE COMPLETED] placeholder and a short cross-reference ('see note above') — never a restatement of the note text IN ANY WORDING — a closing paragraph that paraphrases the note ('The Parties shall verify each sub-processor's participation status… the note above applies to all listed sub-processors') is the same defect as a verbatim duplicate (see REPEATED CONTENT APPEARS ONCE in the core).
- GERMAN SUPERVISORY AUTHORITY PRECISION (SUPERVISORY AUTHORITIES ONLY): Germany has 17 state-level supervisory authorities (16 Länder plus the federal BfDI for specific sectors). Do not state 'the competent German supervisory authority' as if there is one national authority. State: 'The competent supervisory authority for [German entity] shall be [TO BE COMPLETED: the German state data protection authority (Landesdatenschutzbehörde) with jurisdiction over the entity's registered seat — complete after the entity's registered-seat placeholder earlier in this Agreement is finalised].' Where a placeholder depends on the completion of an earlier placeholder, it says so and names the location — a placeholder must never request information the user cannot supply until another field is completed without stating that dependency. If a lead supervisory authority for the overall controller-processor relationship has already been established elsewhere in the document (e.g. CNIL for a French controller), distinguish that from the German sub-processor's own state-authority registration. THIS PRECISION APPLIES ONLY TO SUPERVISORY-AUTHORITY IDENTIFICATION — never to governing-law or forum clauses. German contract and data-protection law is federal: a governing-law clause states 'the laws of the Federal Republic of Germany' definitively with NO Land-law hedge and NO pre-execution confirmation instruction, and a jurisdiction clause states 'the courts of Germany, with specific jurisdiction determined in accordance with the Zivilprozessordnung (ZPO) having regard to the Parties' registered seats' rather than inviting the Parties to confirm a court.
- BC/DR TEST-RESULT RETENTION: where the DPA requires a business continuity/disaster recovery plan tested at [TO BE COMPLETED: frequency], also require that test results be documented and retained for [TO BE COMPLETED: retention period] and made available to the Controller upon request. Do not leave test-result retention unaddressed when test frequency is already required.
- DRAFT STATUS NOTICE: At the very top of the document, immediately after the title line "Your Custom DPA — [Controller] / [Processor]" and before the first recital, insert the following notice on its own line: "DRAFT — REQUIRED FIELDS INCOMPLETE — DO NOT SIGN OR RELY ON THIS DOCUMENT UNTIL ALL [TO BE COMPLETED] FIELDS HAVE BEEN REVIEWED AND COMPLETED BY QUALIFIED LEGAL COUNSEL." This notice must appear in every generated DPA regardless of how many placeholders remain.
- PRE-EXECUTION TASKS ARE NOT OPERATIVE TERMS: an executed instrument never instructs the Parties to perform a verification 'before execution of this DPA' inside its own operative text — the document cannot condition its own execution on tasks stated within it. Where a fact must be established before signature (the competent supervisory authority for a registered seat, a sub-processor's Data Privacy Framework participation), the clause carries a [TO BE COMPLETED: …] placeholder naming the fact and how it is determined, and any verification instruction lives in a schedule header note — never in a clause, recital, or annex body. A pre-execution instruction appearing more than once for the same fact is additionally a repetition defect.
- ALTERNATIVES ARE SELECT-ONE PLACEHOLDERS: mutually exclusive substantive alternatives are never left in executed text separated by slashes ('unlimited / capped at a specified multiple of annual fees / as otherwise agreed'). Present them as a single select-one placeholder: '[TO BE COMPLETED: select one — (Option A) unlimited; (Option B) capped at [amount or multiple]; (Option C) as set out in the Principal Agreement — delete the options not selected].' Slash-separated alternatives in an operative clause are a drafting defect.
- DEFERRED COMPLIANCE-CRITICAL PERIODS CARRY THEIR CONSTRAINT: where a notification or assistance period is deferred to the Parties and a statutory deadline depends on it (e.g. the Processor's obligation to pass on data subject requests, which feeds the Controller's Article 12(3) one-month response deadline), the placeholder states the governing constraint without supplying a value: '[TO BE COMPLETED: notification period — must be short enough to enable the Controller to meet its Article 12(3) one-month response deadline]'. Never a bare '[TO BE COMPLETED: notification period]' where a statutory clock depends on the term, and never a supplied default value. THE ARTICLE 12(3) ANNOTATION ATTACHES ONLY to periods that feed the Controller's data-subject-request response deadline (the Processor's obligation to pass on or assist with data subject requests). DPIA-assistance periods, audit-response periods, and breach-notification periods each carry their OWN governing constraint where one exists (e.g. Article 33(2) 'without undue delay' for breach notification) or a plain '[TO BE COMPLETED: response period for [the assistance type]]' placeholder where none does — never the Article 12(3) annotation.
- Include an annotations array listing every enforcement case from the ENFORCEMENT CONTEXT above that informed a clause choice. Use the exact id value from each case (the value after 'id:'). Only cite cases from the ENFORCEMENT CONTEXT above — never from training knowledge.

CRITICAL DRAFTING RULES — NON-NEGOTIABLE:
- NO SELF-CORRECTIONS, VERIFIED CROSS-REFERENCES: never emit a bracketed or inline self-correction ('[correction: …]', 'that is to say, Section N') — resolve the correct reference internally and write it once. Before emitting any internal cross-reference ('see Section N', 'as set out in Section N'), verify N against the section titles actually present in this document; a cross-reference to a section number whose title does not match the referenced subject is a defect. Where assistance obligations span multiple sections, enumerate all of them ('Sections 6, 8 and 9') rather than a stale pair.
0. PRE-OUTPUT SELF-CHECK (do this before writing any content): Count the number of top-level sections you intend to output. Assign them numbers 1, 2, 3... in order. Write the first heading as "1. [TITLE]", the second as "2. [TITLE]", the third as "3. [TITLE]" and so on. After completing the document, verify: does every top-level heading begin with a unique sequential number? If any two headings share the same number, you have a numbering error — correct it before output.
1. SEQUENTIAL SECTION NUMBERING. Top-level section headings MUST be numbered sequentially: "1.", "2.", "3.", "4." and so on through to the final section. Do NOT restart numbering, do NOT output "1." for every section, and do NOT use markdown heading syntax (# / ## / ###). Output section headings as plain text in the form: "1. PARTIES AND RECITALS", "2. DEFINITIONS", "3. ACCOUNTABILITY", etc. Sub-clauses MUST be hierarchical (1.1, 1.2, 1.2.1, 2.1, 2.2, …). Within any numbered list, each item MUST have a unique sequential number. The sequence 1.1, 1.2, 1.3 is correct. The sequence 1.1, 1.1, 1.1 is a fatal error. Never repeat a sub-clause number within the same parent section. Verify before output that every internal cross-reference (e.g. "see Section 7.2") points to the correct sequential number. NEVER output a sub-clause such as "100.3.7" — that indicates a numbering collision; the correct form is "10.3.7". If your self-check detects a numbering or drafting error, correct it SILENTLY by fixing the text. NEVER include meta-commentary, parenthetical self-corrections, editorial notes, or remarks about the document's own text — e.g. '(This sub-clause number is incorrect and should be 10.3.8)' is a fatal output error. The document must contain only contract text and [TO BE COMPLETED: ...] placeholders.
2. COMPLETE OUTPUT. The document MUST run continuously through every required section, ending with a fully formed General Provisions section, a complete Term & Termination clause, and a SIGNATURE BLOCK with name / title / date lines for both Controller and Processor, followed by any required Schedules. SIGNATURE BLOCK FORMAT: The signature block must appear as properly formatted execution lines — NOT as the literal text "[SIGNATURE BLOCK]". The correct format is:
FOR AND ON BEHALF OF [CONTROLLER NAME] ("Controller"):
Signature: ___________________________
Name: [TO BE COMPLETED: Name]
Title: [TO BE COMPLETED: Title]
Date: [TO BE COMPLETED: Date]

FOR AND ON BEHALF OF [PROCESSOR NAME] ("Processor"):
Signature: ___________________________
Name: [TO BE COMPLETED: Name]
Title: [TO BE COMPLETED: Title]
Date: [TO BE COMPLETED: Date]

Never output the literal string "[SIGNATURE BLOCK]" as a standalone line — this is a template instruction, not document content. Always output the formatted execution block instead.
3. NO ALL-CAPS CLAUSE TEXT. Do not write operative clause text in all-capital letters. Section headings may be in title case or upper case, but clause body text (sub-clauses 1.1, 1.2, 2.1 etc.) must be in normal sentence case. The following is PROHIBITED: "2.1 THE SUBJECT MATTER OF THE PROCESSING IS THE PERSONAL DATA TRANSFERRED FROM THE CONTROLLER..." The correct form is: "2.1 The subject matter of the processing is the Personal Data transferred from the Controller..." Apply this rule to every sub-clause throughout the document.
4. CONSISTENT BLANK FORMAT. Use the form "[TO BE COMPLETED: description]" for every user-fillable blank — do not mix "[TO BE COMPLETED: …]" with bare "[City, Province]" or other bracketed placeholders.
5. NO STRAY MARKDOWN. Do not emit "**bold**", "*italics*", or markdown headings; the document must read as plain legal text.
6. SUB-PROCESSOR SCHEDULE INTEGRITY. CRITICAL: Populate Schedule A / Schedule 1 ONLY from the "subProcessorList" field in the intake data. If that field is empty or not provided, output a blank Schedule with headers only and the instruction line "[TO BE COMPLETED: list approved Sub-processors here]". NEVER add Microsoft Azure, Snowflake, AWS, Google Cloud, Salesforce, or any other company name from training knowledge. Adding companies from training knowledge to a legal contract schedule is a critical accuracy error that could create false legal commitments. If any sub-processor IS named in subProcessorList, do NOT also emit a "[TO BE COMPLETED: list approved Sub-processors]" placeholder in the same schedule — emit the placeholder only when the list is empty. LOCATION SPECIFICITY: In the sub-processor schedule, the Location column must identify the specific country or countries where the sub-processor processes data — not "Global." "Global" is not a valid location for international transfer analysis. If the intake data does not specify the location, use the placeholder "[TO BE COMPLETED: country/region where processing occurs]" rather than "Global." Where a sub-processor is located outside the EEA/UK, note in the schedule what transfer mechanism applies (e.g. "EU SCCs in place" or "[TO BE COMPLETED: transfer mechanism]").
7. SCC ANNEX POPULATION: Where EU SCCs (Commission Implementing Decision (EU) 2021/914) are incorporated by reference, the DPA must also include or reference populated SCC Annexes. At minimum, include as Schedule 2 (or an equivalent named schedule) the following SCC Annex I content: (a) Annex I.A — Parties: list the data exporter (Controller) and data importer (Processor) with their roles and contact details; (b) Annex I.B — Description of the Transfer: state the categories of data subjects, personal data categories, transfer frequency, nature and purpose of processing, and retention period, drawing from the PARTIES block above; (c) Annex I.C — Competent Supervisory Authority: identify the lead supervisory authority for the data exporter. For Annex II (TOMs), cross-reference Section 5 of the DPA (Security Measures). For Annex III (sub-processors), cross-reference Schedule 1. Where the SCC Annexes cannot be fully populated from intake data, include them as named placeholders: "SCHEDULE 2 — ANNEX I TO THE EU STANDARD CONTRACTUAL CLAUSES (to be completed by the parties)." Do not merely state "the SCC Annexes are hereby incorporated" without producing the schedule structure. RETENTION-PERIOD FIELD IN SCHEDULE 2 IS A CROSS-REFERENCE, NOT A RE-REQUEST: where clause 2.6 (Duration / Retention) of the DPA already defers the retention-commencement event to the Parties by placeholder, the retention-period entry in Schedule 2 (Annex I.B) MUST NOT re-request that event definition or repeat the placeholder. The Schedule 2 retention-period entry reads exactly: "As set out in clause 2.6 of this DPA (24 months from the event defined therein)" — substituting the actual duration from body.retention where it is a fixed period, otherwise "As set out in clause 2.6 of this DPA ([duration from clause 2.6] from the event defined therein)." Asking for the trigger event in two places is a two-places-same-question defect.
8. ENFORCEMENT ID HYGIENE. The "id:" values in the ENFORCEMENT CONTEXT (e.g. "E3") exist ONLY for the annotations array. They must NEVER appear in document_text — not as "[E3]", "[E2, E8]", "(E3)", or in any other form. In the contract body, do not name, quote, or allude to specific enforcement cases at all (no case names, authorities, dates, or fine amounts) — enforcement context informs your drafting choices silently. Any enforcement reference in the body is a defect.
9. SUB-PROCESSOR AUTHORISATION MODEL. Use exactly one coherent regime: general authorisation limited to the sub-processors listed in Schedule 1, with new sub-processors permitted only via 30-day advance written notice and a 15-day objection right. Do NOT use the phrase "specific authorisation" anywhere; specific authorisation and notice-with-objection are alternatives under Art. 28(2) and must not be mixed.
10. CITATION FORM. The UK Data Protection Act 2018 is an Act with sections and schedules — never cite "Regulation N of the Data Protection Act 2018". For UK→EEA transfers, cite the UK adequacy regulations / Schedule 21 DPA 2018 and state that no Art. 46 safeguard is required. Use "pseudonymisation" (Art. 32(1)(a)) — never "pseudo-anonymisation".
11. GOVERNING LAW & JURISDICTION. The governing law clause MUST resolve to a SINGLE jurisdiction — never offer two alternatives joined by "or". Derive the single governing law from the intake:
(a) EU/EEA entities: use the law of the controller's member state (e.g. "French law" for a France-incorporated controller, "German law" for a German company, "the laws of England and Wales" for a UK-incorporated controller, "Irish law" for an Irish entity, "Spanish law" for a Spanish entity, "Dutch law" for a Netherlands entity).
(b) US entities — CRITICAL: "United States" or "United States (federal)" is NOT a valid governing law for a data processing agreement. US privacy law is state-level. When the controller's jurisdiction is "United States (federal)" or any generic US designation, output the governing law as: "the laws of the State of Delaware, without regard to its conflict-of-laws principles" — Delaware is the most widely used US state for commercial contract governing law — and add a parenthetical: "(the parties should confirm whether a different state is preferred, particularly if either party's principal place of business or state of incorporation is in another state)." When the controller's jurisdiction IS a specific US state (e.g. "California", "Texas"), use the laws of that state instead.
(c) Canadian entities: use the law of the controller's province or "Canadian federal law (PIPEDA)" as applicable.
(d) If no jurisdiction is provided at all, output: "[TO BE COMPLETED: governing law — state the jurisdiction whose law will govern this agreement]" — never two alternatives.
The dispute resolution / jurisdiction clause that follows MUST identify courts consistent with the single governing law (e.g. courts of England and Wales for English law; courts of Paris for French law; courts of the State of Delaware or federal courts sitting in Delaware for Delaware law). Never write "UK law"; use "the laws of England and Wales", "the laws of Scotland", or "the law of Northern Ireland" as appropriate. Single forum only — never offer two.
- ENGAGEMENT DIRECTION IS INVARIANT: every recital and clause states the same direction — the Controller engages the Processor; the Processor provides the Services to the Controller and processes personal data on the Controller's documented instructions. Never phrase party roles so that the direction of engagement or of service provision could read reversed, and never describe the Controller as providing the Services. Canonical recital form: "The Controller wishes to engage the Processor to provide [the Services] and, in the course of providing them, the Processor will process personal data on the Controller's behalf."
- EVENT-DEFINED RETENTION TRIGGERS MUST BE DEFINED: where a retention period runs from an event (e.g. "the end of the last active relationship"), the clause must include a bracketed placeholder requiring the Parties to define the trigger event in writing — "[TO BE COMPLETED: the event marking the end of the last active relationship, to be defined by the Parties (e.g. by reference to the Principal Agreement)]". Never supply a default definition, a default trigger, or a default period.
- BREACH-NOTIFICATION TIMING COHERENCE: the Processor's breach-notification obligation must not be capable of consuming the Controller's Article 33(1) window. Where a fixed notification period is used, draft the obligation as: notification without undue delay and in any event within the stated period from the Processor becoming aware of the breach, or within such shorter period as is necessary to enable the Controller to notify the supervisory authority within 72 hours under Article 33(1) GDPR if the stated period would be insufficient.
- SCHEDULES ARE DESCRIBED ACCURATELY: never describe a schedule that contains [TO BE COMPLETED] placeholders as "populated" or "completed". Describe it as framework content that the responsible Party must populate before the relevant processing or transfer commences, and name that Party.
- REPEATED VERIFICATION NOTES CONSOLIDATE: where an identical verification note applies to every row of a schedule (e.g. Data Privacy Framework participation checks for US sub-processors), state it once as a note immediately following the schedule heading and do not repeat it inline per row.
- OFFICIAL AUTHORITY NAMES: where a supervisory authority is named, use its official full name with the abbreviation — for Germany's federal authority, "Bundesbeauftragte(r) für den Datenschutz und die Informationsfreiheit (BfDI)", never the shorthand "Bundesdatenschutzbeauftragter" as the full form. Where uncertain of an official name, use the English descriptor plus abbreviation and do not invent a native-language full form.
- ONE MEANING PER ACRONYM: within a single document, an acronym carries one meaning. "DPA" means this Data Processing Agreement; refer to supervisory bodies as "supervisory authority" or "data protection authority" written out, never abbreviated to "DPA".
- COMPLETION TIMING IS STATED CONSISTENTLY: where the operative clauses require a determination or schedule field to be completed "before execution", the schedule must not simultaneously present that field as completable after execution — and vice versa. Pick one regime per item and state it identically in the clause and the schedule: either "to be completed before execution of this DPA" or "to be completed before the first transfer to that Sub-processor commences", never both.
- PER-RECIPIENT, NOT PER-TRANSMISSION: obligations to execute transfer mechanisms attach per recipient relationship, not per data-transmission event. Draft as "executed with each Sub-processor or recipient to which an onward transfer is made, before any transfer to that Sub-processor or recipient commences" — never phrasing that could be read as requiring execution for each individual transfer event.
- LIABILITY PROVISIONS STATE THEIR INTERACTION: where the DPA contains both a liability cap and an indemnity, the indemnity clause states expressly whether it is subject to the cap, presented as a select-one placeholder — "[TO BE COMPLETED: select one — (Option A) the indemnity is subject to the limitations in clause 11.2; (Option B) the indemnity is not subject to the limitations in clause 11.2 — delete the option not selected]" — never slash-separated alternatives in operative text, never silent on the interaction, and never selecting a default.
- ENTITY-FORM OBSERVATIONS ARE VERIFICATION ITEMS: where a party's legal-form suffix appears atypical for its stated incorporation jurisdiction (e.g. 'Ltd' with a German seat), note it as a neutral verification item — 'the legal form may indicate incorporation in another jurisdiction, a registered branch, or a group structure; the Parties should confirm the exact legal form, incorporation jurisdiction, and registered address before execution' — never as an asserted inconsistency ('appears inconsistent'). The intake supplied the jurisdiction; the note verifies, it does not contradict. THE NOTE APPEARS EXACTLY ONCE, inside the clause it concerns — never additionally as a standalone paragraph, in any wording.
- VERIFICATION INSTRUCTIONS APPEAR ONCE: where the same verification duty applies to both Parties (e.g. confirming each party's competent state-level supervisory authority), state it ONCE covering both Parties, and cross-reference from the second location ('see clause X') — never repeat the instruction verbatim in two clauses.
- RETENTION TRIGGERS CARRY AN ILLUSTRATIVE MENU: where the retention commencement event is deferred to the Parties, the placeholder names the class of event and offers an illustrative menu without selecting one — '[TO BE COMPLETED: the event marking the start of the retention period — to be defined by the Parties by reference to the Principal Agreement]', with the illustrative menu matched to the clause's stated scope: where the clause defines retention per data subject, the examples are per-subject events ('e.g., closure of that data subject's account, the last service interaction with that data subject, or the last processing activity involving that data subject's personal data'); where the clause defines a single agreement-level period, the examples are agreement-level events ('e.g., termination of the Principal Agreement, closure of the last support ticket, or the Processor's final processing activity under this DPA'). Never mix per-subject lead-in language with agreement-level examples or vice versa. Never leave a bare 'to be defined by the Parties' with no indication of what kind of event is intended, and never pre-select one.
- CLAUSE NUMBERING IS CONTIGUOUS AT EVERY LEVEL: within any numbered list of sub-clauses, the numbering extends the SAME parent contiguously (6.2.1.1, 6.2.1.2, 6.2.1.3, 6.2.1.4) and never jumps to a different parent (…6.2.1.3 followed by 6.2.4 is a numbering defect). Before emitting the document, verify every multi-item enumeration for contiguous sequence and correct any break. A skipped, repeated, or parent-switching number anywhere in the instrument is a drafting defect.
- SUBCLAUSE PARALLEL STRUCTURE AND ECONOMY: items in an enumerated list share one grammatical form (all noun phrases: 'A description of…', 'The name and contact details of…' — never one bare-verb item among noun phrases); a clause never cross-references the section it is already inside ('in accordance with this Section 10' from within Section 10); and qualifier phrases that add no operative precision ('as part of an intended programme of processing') are omitted.


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
- If no cases from the context informed any clause choice, output an empty array [].

12. ENTITY LEGAL FORM CONSISTENCY. Before drafting, inspect the controller name and processor name for legal form suffixes and verify they are consistent with the stated incorporation jurisdiction. Apply these known mappings:
- B.V. (Besloten Vennootschap) → Netherlands only. If the stated jurisdiction is not the Netherlands, flag it.
- GmbH (Gesellschaft mit beschränkter Haftung) → Germany, Austria, or Switzerland only.
- SE (Societas Europaea) → any EU member state; SE is a supranational form, not UK-specific. Do NOT describe an SE entity as incorporated under English law.
- Ltd → typically England and Wales, Scotland, Northern Ireland, or Ireland. For Ireland, specify "Republic of Ireland."
- SRL → typically France, Italy, Spain, Romania, or Latin American jurisdictions.
- SA / S.A. → typically France, Spain, Belgium, or Switzerland.
- LLC / Inc / Corp → United States only.
- AB → Sweden only.
- OY / OYJ → Finland only.
- AS → Norway or Denmark.
- NV → Netherlands or Belgium.
- PLC → England and Wales or Ireland.
If a detected mismatch exists between the entity's legal form and the stated incorporation jurisdiction, include a flagging recital in Section 1 (Parties and Recitals) immediately after the party identification:
"NOTE FOR LEGAL REVIEW: The [Controller/Processor] entity [name] uses the legal form [form], which is typically associated with [expected jurisdiction]. The stated incorporation jurisdiction ([stated jurisdiction]) appears inconsistent with this legal form. The parties should confirm the correct incorporation jurisdiction and legal form before executing this agreement."
13. CHILD-NUMBERING DISCIPLINE (2.4a). A heading number is never reused by its own child items — children of a numbered heading are numbered heading.1, heading.2, …
14. SUB-PROCESSOR VERIFICATION CONSOLIDATION (2.4b). Where the same verification instruction applies to every listed Sub-processor, state it once in a closing subsection covering all of them instead of repeating verbatim per entry.
15. FORMAL CONTRACT LANGUAGE ONLY (2.4c). Headings and body use only formal contract language — no meta-commentary headings. Do NOT emit any heading of the form "Transfer Status — No Redundant Restatement" or any similar meta-commentary. Replace such a heading with a formal cross-reference: "International Transfers. The international transfer provisions applicable to this DPA are set out in Section 10."
16. LEAD-SA SENTENCE (2.4d). "…this does not affect the competence of the German state DPA in respect of [Processor] as an establishment under German law."`;

    const GDPR_USER = `${PARTIES_BLOCK}
Legal framework: ${body.legalFramework}
${sectorFlags.isComplexRoleSector ? `
CONTROLLER/PROCESSOR ROLE ALERT — ${sectorFlags.complexRoleSectorName.toUpperCase()}
The services described suggest a ${sectorFlags.complexRoleSectorName} context where the Processor's role as a pure processor under GDPR Article 28 may be uncertain. Include in Section 1 (Parties and Recitals) the following recital:
"(D) The Parties acknowledge that the characterisation of ${body.processorName} as a data processor under GDPR Article 28 is based on the scope of the Services as described herein. Where ${body.processorName} processes Personal Data for purposes beyond the immediate Services — including but not limited to model training on aggregated data, cross-client audience profiling, or independent commercial use of Personal Data — such processing may constitute independent controllership and would not be governed by this DPA. The Parties should seek qualified legal counsel to confirm the appropriate role characterisation before reliance on this agreement."
` : ""}
Transfer clause: ${body.includeTransferClause ? body.transferMechanism : "Not required"}

ENFORCEMENT CONTEXT
The following recent enforcement cases are relevant to this DPA. Ensure the provisions in the Security, Sub-Processor, and Audit sections specifically address the compliance failures documented in these cases:

${enforcementBlock}

Draft the complete DPA with ALL of the following sections. Number clauses hierarchically (1.1, 1.2, 1.2.1 etc.):

1. PARTIES AND RECITALS
2. SUBJECT MATTER, NATURE, DURATION AND PURPOSE
3. PROCESSOR OBLIGATIONS (all eight Article 28(3) elements: instructions, confidentiality, security, sub-processors, assistance with rights, assistance with security/breach/DPIA, deletion/return, information/audit)
4. SUB-PROCESSOR PROVISIONS (Articles 28(2) and 28(4)) – include specific approval mechanism and notification timeline. The clause MUST state explicitly: "General authorisation under this clause applies ONLY to the Sub-processors listed in Schedule 1 at the Effective Date. All subsequent additions or replacements require prior written notice under the 30-day notice procedure set out in this clause." Use a 30-day notice window.
5. SECURITY MEASURES (Article 32) – specify technical and organisational measures calibrated to the data categories listed above
6. DATA BREACH NOTIFICATION (Article 33) – the Processor MUST notify the Controller without undue delay and in any event within forty-eight (48) hours of becoming aware of a Personal Data Breach. Include minimum content requirements. Do NOT add any sentence explaining WHY the 48-hour window exists or how it relates to the Controller's own Article 33(1) obligation — the obligation is established by this clause and needs no restatement in generator-reasoning voice (see prompt-core: NO EXPLANATORY / GENERATOR-REASONING VOICE).
7. DATA SUBJECT RIGHTS ASSISTANCE (ARTICLES 12-23) AND DPIA ASSISTANCE — output this section heading verbatim, with a space between DPIA and ASSISTANCE. Never concatenate words in headings. The DPIA-assistance clause must reflect the actual processing: cite Article 35(3)(b) as the mandatory DPIA trigger ONLY if the data categories listed above include special category data under Article 9 (health/medical data, genetic data, biometric data used for unique identification, data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, data concerning sex life or sexual orientation, or criminal records/offences). For processing that does NOT involve Article 9 special category data, use a general DPIA-assistance clause without citing Article 35(3)(b): "To the extent any processing activities covered by this DPA are likely to result in a high risk to the rights and freedoms of natural persons (as assessed under GDPR Article 35), the Processor shall assist the Controller in conducting a Data Protection Impact Assessment."
8. POST-TERMINATION OBLIGATIONS — MUST include an explicit clause stating that, at the Controller's choice, the Processor shall delete or return all Personal Data to the Controller after the end of the provision of services, and delete existing copies unless retention is required by law (Article 28(3)(g)). Use the exact phrase "delete or return" and reference "Personal Data" within the same sentence.
9. AUDIT AND INSPECTION RIGHTS – use ${body.auditRights} standard
${transferSection ? transferSection : "10. INTERNATIONAL TRANSFER PROVISIONS — Open this section with the following sub-clause: '10.1 The Controller and Processor acknowledge that any direct transfer of Personal Data between the Controller and the Processor within the European Economic Area does not constitute an international transfer under GDPR and requires no additional Article 46 safeguard. The transfer provisions in clauses 10.2 onwards apply only to any onward transfers of Personal Data by the Processor to sub-processors or other recipients located outside the EEA or the United Kingdom.' Then address third-country transfers from clause 10.2 onwards using the EU SCCs (Commission Implementing Decision (EU) 2021/914) or UK Addendum as applicable."}
10. LIABILITY
11. TERM AND TERMINATION
12. GOVERNING LAW
13. GENERAL PROVISIONS

[SIGNATURE BLOCK]

SCHEDULE 1 — APPROVED SUB-PROCESSORS (populate from intake; if none provided, output a blank Schedule 1 with column headers Name / Service / Location / Date Authorised and an instruction line "[TO BE COMPLETED: list approved Sub-processors here]")

${ANNOTATIONS_INSTRUCTIONS}`;

    const US_USER = `${PARTIES_BLOCK}

ENFORCEMENT CONTEXT
${enforcementBlock}
${sectorFlags.hasChildrensData ? `
CHILDREN'S DATA MODULE — COPPA AND FERPA REQUIRED
The data categories include children's data (individuals under 18). The following additional provisions are MANDATORY in this DPA:

COPPA (Children's Online Privacy Protection Act, 15 U.S.C. §§ 6501-6506 and 16 C.F.R. Part 312):
- If the Processor operates a website or online service directed to children under 13, or has actual knowledge it collects personal information from children under 13, COPPA applies to it as an operator.
- The Processor must obtain verifiable parental consent before collecting, using, or disclosing personal information from children under 13, unless a COPPA exception applies.
- The Processor must not condition a child's participation in an activity on disclosing more personal information than is reasonably necessary.
- The DPA must contain a COPPA compliance clause requiring the Processor to: (a) maintain a COPPA-compliant privacy policy; (b) obtain and document verifiable parental consent; (c) permit parents to review and delete their child's personal information; (d) not retain children's personal information longer than necessary.
- Include a dedicated section titled "Children's Data and COPPA Compliance" citing 15 U.S.C. § 6502 and 16 C.F.R. Part 312.

FERPA (Family Educational Rights and Privacy Act, 20 U.S.C. § 1232g; 34 C.F.R. Part 99):
- If the Controller is an educational agency or institution and the data includes education records, FERPA governs access and disclosure.
- The Processor may receive education records only as a "school official" under FERPA (34 C.F.R. § 99.31(a)(1)) or under another FERPA exception. The DPA must establish the Processor's school-official status: under the direct control of the institution; subject to FERPA requirements; prohibited from re-disclosing education records without further FERPA authorization.
- The Processor must: (a) use education records only for authorized purposes; (b) not re-disclose to third parties without written consent or applicable FERPA exception; (c) destroy or return education records when no longer needed; (d) permit the institution to conduct compliance reviews.
- Include a dedicated "FERPA Compliance" section citing 20 U.S.C. § 1232g and 34 C.F.R. § 99.31(a)(1).
- Note: Children's data is NOT Article 9 special-category data under GDPR. Do not conflate COPPA/FERPA obligations with GDPR Article 9 or cite Article 35(3)(b) for children's data.
` : ""}${sectorFlags.hasHealthData ? `
HEALTH DATA MODULE — HIPAA BAA REQUIRED
The data categories include health/medical data. If either party is a HIPAA Covered Entity or Business Associate (as defined in 45 C.F.R. § 160.103), this DPA must function as or incorporate a HIPAA Business Associate Agreement (BAA) under 45 C.F.R. § 164.308(b)(1). The following provisions are MANDATORY:

HIPAA BAA REQUIREMENTS (45 C.F.R. §§ 164.308(b), 164.314(a)):
The Processor (as Business Associate) must:
(a) Not use or disclose Protected Health Information (PHI) other than as permitted by this DPA or required by law (45 C.F.R. § 164.504(e)(2)(i));
(b) Use appropriate safeguards to prevent unauthorized use or disclosure of PHI (45 C.F.R. § 164.504(e)(2)(ii)(A));
(c) Comply with the HIPAA Security Rule (45 C.F.R. §§ 164.302-318) for any Electronic PHI (ePHI);
(d) Report to the Controller any use or disclosure of PHI not provided for by this DPA, including breaches under 45 C.F.R. §§ 164.400-414, within 60 days of discovery (or such shorter period as the Controller requires to meet its own notification obligations);
(e) Ensure any subcontractors that receive PHI agree to the same restrictions and conditions as apply to the Processor under this DPA (45 C.F.R. § 164.504(e)(2)(ii)(D));
(f) Make PHI available to the Controller to enable the Controller to respond to individual rights requests under 45 C.F.R. §§ 164.524 (access) and 164.526 (amendment);
(g) Return or destroy all PHI upon termination of the agreement (45 C.F.R. § 164.504(e)(2)(ii)(J));
(h) Make its internal practices available to the Secretary of HHS for compliance reviews (45 C.F.R. § 164.504(e)(2)(ii)(H)).

Include a dedicated section titled "HIPAA Business Associate Terms" with these provisions. Identify which party is the Covered Entity and which is the Business Associate, or note that the parties must confirm these roles with counsel. Do NOT apply HIPAA if the services clearly do not involve PHI (e.g. purely administrative SaaS with no patient data access).
` : ""}${sectorFlags.hasFinancialData ? `
FINANCIAL DATA MODULE — GLBA AND FCRA
The data categories include financial/payment data. The following federal financial privacy frameworks may apply:

GLBA GRAMM-LEACH-BLILEY ACT (15 U.S.C. §§ 6801-6809; 16 C.F.R. Part 313):
- GLBA applies to "financial institutions" — entities significantly engaged in financial activities (banks, insurance companies, mortgage lenders, investment advisers, etc.) and their service providers.
- The GLBA Safeguards Rule (16 C.F.R. Part 314, as amended effective June 9, 2023) requires financial institutions to implement a comprehensive information security program and imposes specific requirements on service provider arrangements: contracts must require service providers to implement appropriate safeguards and permit monitoring of their compliance (16 C.F.R. § 314.4(f)).
- If the Controller is a financial institution under GLBA, include a dedicated "GLBA Service Provider Provisions" section requiring: (a) Processor to implement and maintain the safeguards required under the Safeguards Rule; (b) Processor to permit the Controller to monitor compliance; (c) Processor not to use customer nonpublic personal information (NPI) for any purpose other than providing the contracted services.
- NPI must be defined consistently with GLBA: "personally identifiable financial information" provided by consumers in connection with financial products or services.

FCRA FAIR CREDIT REPORTING ACT (15 U.S.C. § 1681 et seq.):
- If the Processor provides consumer reports, accesses credit information, or functions as a consumer reporting agency, FCRA applies.
- The DPA must include permissible purpose restrictions, accuracy obligations, adverse action notice requirements, and data security provisions consistent with FCRA.
- If FCRA applies, include a dedicated "FCRA Compliance" section citing the applicable permissible purpose under 15 U.S.C. § 1681b.

Assess applicability based on the Controller's business type and the services described. If applicability is uncertain, include the provisions with a note that "parties should confirm applicability with counsel."
` : ""}
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
   4.6 Risk assessment / DPIA assistance — Cal. Civ. Code § 1798.185(a)(15) and CPPA risk-assessment regulations; TDPSA § 541.109; CTDPA § 8; VCDPA § 59.1-579; CPA § 6-1-1309; OCPA § 646A.574
   4.7 Deletion or return of data at termination (see Section 11)
   4.8 Audit cooperation (see Section 12)
5. PROHIBITED PROCESSING (CCPA/CPRA § 1798.100(d) and equivalents) — this section MUST contain, verbatim, the phrases "shall not sell" AND "shall not share" applied to Personal Data, and MUST explicitly state that the Processor is "prohibited from selling or sharing" Personal Data outside the business purpose.
   5.1 No Sale or Sharing
   5.2 No Targeted Advertising outside the agreed business purpose
   5.3 No Cross-Context Combination except as permitted by law
   5.4 No Retention Beyond Purpose
   Cite Cal. Civ. Code § 1798.100(d)(1)-(5) and equivalent state provisions explicitly.
6. CONSUMER RIGHTS PASS-THROUGH — the section heading MUST contain the exact phrase "Consumer Rights" and the body MUST include the verbatim phrases "right to access", "right to delete" and "right to correct" with applicable response timelines per state law (Know/Access, Delete, Correct, Opt-Out of Sale/Sharing incl. GPC for California, Limit Use of Sensitive PI, Non-Discrimination).
7. SUB-PROCESSOR PROVISIONS — prior written consent; equivalent obligations flow-down; Processor liable for sub-processors; populate Schedule A from the parties' inputs. If no sub-processors were provided in the intake, output a blank Schedule A with column headers (Name / Service / Location / Date Authorised) and the instruction line "[TO BE COMPLETED: list approved Sub-processors here]". Do NOT hard-code "no Sub-Processors at the Effective Date" unless the intake expressly stated none.
8. SENSITIVE PERSONAL DATA — heightened protections; opt-in consent for minors' data for targeted advertising or profiling.
9. SECURITY MEASURES — calibrated to data categories and subject count; encryption, access controls, employee training, incident response, pen testing cadence; address failures in enforcement context.
10. DATA BREACH NOTIFICATION — state-specific timelines (use the wording below verbatim where indicated):
    - California: Processor shall notify Controller of any Data Breach impacting Personal Data of California residents "without unreasonable delay and in the most expedient time possible" after discovery. Do NOT impose a fixed 72-hour processor-to-controller window for California — Cal. Civ. Code § 1798.82 governs notification to individuals, not B2B processor timelines. The Controller is responsible for notifying the California Attorney General if 500+ California residents are affected.
    - Texas: notify Controller promptly; Controller notifies AG if 250+ Texans affected (Tex. Bus. & Com. Code § 521.053)
    - Connecticut: Processor shall notify Controller without unreasonable delay after discovery. Under Conn. Gen. Stat. § 36a-701b (Connecticut's breach notification statute — NOT the CTDPA, which does not set an independent breach notification timeline), the Controller must notify affected Connecticut residents "in the most expedient time possible." Controller notifies the CT AG simultaneously with individual notification. Do NOT state a 72-hour deadline for Connecticut — no such deadline exists in Connecticut law.
    - Colorado: Processor shall notify Controller without undue delay; Controller notifies the Colorado Attorney General as required by C.R.S. § 6-1-716 (Colorado breach notification statute). Do NOT cite "CPA § 6-1-1309" for breach notification — the Colorado Privacy Act does not set breach notification timelines; those come from C.R.S. § 6-1-716.
    - Virginia: Processor shall notify Controller without unreasonable delay after discovery. Under the VCDPA, the Controller must notify the Virginia Attorney General within 60 days when the breach affects more than 100,000 Virginia consumers (VCDPA 2024 amendment). Do NOT state a 72-hour notification deadline for Virginia — the VCDPA does not set one.
    Include minimum notification content per applicable state law.
11. POST-TERMINATION OBLIGATIONS — at Controller's election, Processor shall delete or return all Personal Data and certify deletion in writing within 30 days; no retention except as required by law. Use the exact phrase "delete or return" and reference "Personal Data" in the same sentence.
12. AUDIT AND INSPECTION RIGHTS — use ${body.auditRights} standard; 30 days' notice; more frequent if breach suspected.
13. RECORDKEEPING — sufficient to demonstrate compliance.
14. LIABILITY AND INDEMNIFICATION
15. TERM AND TERMINATION
16. GOVERNING LAW AND DISPUTE RESOLUTION
17. GENERAL PROVISIONS (amendments, entire agreement, severability, counterparts)

[SIGNATURE BLOCK]

SCHEDULE A — APPROVED SUB-PROCESSORS

Additional requirements:
- Include a dedicated section titled 'Consumer Rights Assistance' or 'Data Subject / Consumer Rights' that explicitly requires the Processor to:
  (a) assist the Controller in responding to consumer access requests under Cal. Civ. Code § 1798.100 (CCPA) and equivalent provisions of any other applicable state laws (TDPSA, CPA, VCDPA, etc.);
  (b) assist the Controller in responding to consumer deletion requests under Cal. Civ. Code § 1798.105 and equivalent state provisions;
  (c) pass through and honor any opt-out of sale/sharing signals under Cal. Civ. Code § 1798.120;
  (d) notify the Controller within five (5) business days upon receiving any consumer rights request directly;
  (e) not respond to consumer rights requests directly without Controller's prior written authorization.
  This clause must appear as an explicit named section in the document, not merely as implied language elsewhere.
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
4. CONTRACTUAL PROTECTION REQUIREMENT (PIPEDA Schedule 1, Principle 1 (Accountability) — OPC guidance confirms accountability extends to third-party processors through contract; Quebec Law 25, s.18.3 — requires a written contract with service providers specifying the measures the service provider must take to protect Personal Information). Note: PIPEDA Schedule 1 does not use decimal sub-principle numbering — do NOT cite "Principle 1.2" or "clause 4.1.3" as these are not valid PIPEDA citation formats.
5. PURPOSE LIMITATION AND INSTRUCTIONS — Processor processes only on documented instructions; no secondary use.
6. CONSENT SUPPORT — Processor shall not undermine Controller's consent obligations. On a withdrawal-of-consent request, the Processor shall (a) cease Processing of the relevant Personal Information and (b) notify the Controller of any technical limitations preventing full implementation. Do NOT use advisory/consultative language such as "advising the Controller on the scope and feasibility" — the Processor implements; it does not advise.
7. SECURITY SAFEGUARDS (PIPEDA Principle 7 / Schedule 1 cl. 4.7; Law 25 Art. 10; PIPA AB Part 3 Div. 1.1; PIPA BC s.34; PHIPA s.12) — calibrated technical, physical and organisational safeguards.
8. SUB-PROCESSOR PROVISIONS — prior written consent; flow-down obligations; Processor remains accountable through the chain; populate Schedule A from intake; if none provided, output a blank Schedule A with column headers (Name / Service / Location / Date Authorised) and the line "[TO BE COMPLETED: list approved Sub-processors here]".
9. INDIVIDUAL RIGHTS ASSISTANCE — Access, Correction, Withdrawal of Consent, Data Portability (Law 25 Art. 27), De-indexing (cite as "section 28.1 of the Act respecting the protection of personal information in the private sector, or a court order" — do NOT cite ambiguously as "the law or a court order").
10. CROSS-BORDER TRANSFER ASSESSMENT (Law 25 Art. 17; OPC guidance) — privacy impact assessment for transfers outside Quebec/Canada; include a Schedule B for approved transfer destinations OR a reference to OPC cross-border transfer guidance.
11. BREACH OF SECURITY SAFEGUARDS NOTIFICATION (PIPEDA s.10.1 and Breach of Security Safeguards Regulations SOR/2018-64 — CRITICAL: the correct regulation number is SOR/2018-64. Do NOT cite SOR/2018-161 or any other SOR number — SOR/2018-161 is a different regulation and its use here would be a citation error; Law 25 Art. 3.5; PIPA Alberta — Part 3, Division 1.1 of PIPA Alberta (S.A. 2003, c. P-6.5, as amended; sections 34.1–34.6 added by amendments in force January 2022)) — real risk of significant harm; notify Controller without delay; Controller obligations to OPC/CAI and affected individuals.
12. RETENTION AND DESTRUCTION — destroy or anonymise when purposes accomplished (Law 25 Art. 23). Where the parties have agreed a specific retention period for HR data, state it as the parties' contractual choice. CRITICAL — DO NOT default to "duration of employment plus five (5) years" as if statutorily required — neither PIPEDA nor Quebec Law 25 prescribes a fixed post-employment retention period. Frame any such figure as "unless applicable employment law or the Controller's documented retention policy requires otherwise" and include the note: "Quebec Law 25 and PIPEDA do not prescribe a fixed post-employment retention period — this duration should reflect the organisation's documented retention policy."
13. POST-TERMINATION OBLIGATIONS — at Controller's election, Processor shall delete or return all Personal Information and certify in writing. Use the exact phrase "delete or return" and reference "Personal Information" in the same sentence.
14. AUDIT AND INSPECTION RIGHTS — use ${body.auditRights} standard.
15. RECORDKEEPING — Law 25 Art. 8 register of confidentiality incidents (Processor assists).
16. LIABILITY AND INDEMNIFICATION
17. TERM AND TERMINATION
18. GOVERNING LAW (specify province) AND DISPUTE RESOLUTION — for arbitration clauses, the city/province blank MUST use the form "[TO BE COMPLETED: City, Province]".
19. GENERAL PROVISIONS

[SIGNATURE BLOCK]

SCHEDULE A — APPROVED SUB-PROCESSORS

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
5. PROHIBITED PROCESSING (US-specific) — this section MUST contain, verbatim, the phrases "shall not sell" AND "shall not share" applied to Personal Data, and MUST explicitly state that the Processor is "prohibited from selling or sharing" Personal Data. Cover No Sale/Sharing; No Targeted Advertising outside business purpose; No Cross-Context Combination; No Retention Beyond Purpose. Cite Cal. Civ. Code § 1798.100(d)(1)-(5).
6. CONSUMER / DATA SUBJECT RIGHTS — heading MUST contain "Consumer Rights" or "Data Subject Rights"; body MUST include verbatim "right to access", "right to delete" and "right to correct" and the GDPR rights under Arts. 12-23.
7. SUB-PROCESSOR PROVISIONS (GDPR Arts. 28(2)/(4) + US flow-down) — populate Schedule A from intake. If no sub-processors were provided, output a blank Schedule A with column headers (Name / Service / Location / Date Authorised) and the line "[TO BE COMPLETED: list approved Sub-processors here]". Do NOT hard-code "no Sub-Processors" unless the intake expressly stated none.
8. SENSITIVE DATA / SPECIAL CATEGORIES (GDPR Art. 9 + US sensitive PI heightened protections)
9. SECURITY MEASURES (GDPR Art. 32 standards apply)
10. DATA BREACH NOTIFICATION — Processor notifies Controller without undue delay and in any event within forty-eight (48) hours of awareness, to enable the Controller to comply with Article 33(1) GDPR (72-hour supervisory authority window). PLUS US state notification timelines: California — "without unreasonable delay" (Cal. Civ. Code § 1798.82 governs notification to individuals); Texas (Tex. Bus. & Com. Code § 521.053); Connecticut; Colorado — C.R.S. § 6-1-716 (NOT "CPA § 6-1-1309"); Virginia. Apply only those state regimes triggered by the parties' jurisdictions or affected data subjects' residency.
11. INTERNATIONAL TRANSFER PROVISIONS — ${body.includeTransferClause ? body.transferMechanism : "EU SCCs (Commission Implementing Decision (EU) 2021/914) for EU-origin transfers; UK Addendum to the EU SCCs (ICO-approved) for UK-origin transfers"}. UK TRANSFER INSTRUMENT TERMINOLOGY: The ICO provides two alternative UK GDPR Article 46 transfer tools: (a) the International Data Transfer Agreement (IDTA) — a standalone UK transfer contract; and (b) the UK Addendum to the EU Commission Standard Contractual Clauses — an addendum that modifies EU SCCs for UK use. These are DISTINCT instruments. When incorporating the addendum to the EU SCCs, call it the "UK Addendum" or "International Data Transfer Addendum to the EU Commission Standard Contractual Clauses" — do NOT call it the "UK IDTA." Reserve "UK IDTA" for references to the standalone International Data Transfer Agreement. Use only ONE UK transfer mechanism — either the UK IDTA or the UK Addendum, not both. The protection standard for UK transfers must be expressed as "not less than equivalent to the protections afforded by UK data protection law" — do NOT use the EU adequacy phrase "essentially equivalent" for UK transfers.
12. POST-TERMINATION OBLIGATIONS — at Controller's choice, Processor shall delete or return all Personal Data (Art. 28(3)(g) + US state equivalents). Use the exact phrase "delete or return" and reference "Personal Data".
13. AUDIT AND INSPECTION RIGHTS — ${body.auditRights}
14. RECORDKEEPING (Art. 30 + US state)
15. LIABILITY AND INDEMNIFICATION
16. TERM AND TERMINATION
17. GOVERNING LAW AND DISPUTE RESOLUTION
18. GENERAL PROVISIONS

[SIGNATURE BLOCK]

SCHEDULE A — APPROVED SUB-PROCESSORS

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

    const CITATION_INTEGRITY_RULE = `

CITATION INTEGRITY RULE: Every specific statutory citation you produce (act name, section number, subsection letter) must be verifiable against the actual statute. Known hallucination risks to guard against: (1) PIPEDA does not use decimal sub-principle numbering — cite as "Schedule 1, Principle N (Name)" only. (2) The Breach of Security Safeguards Regulations under PIPEDA are SOR/2018-64 — no other SOR number is correct. (3) US state privacy laws do not have a universal 72-hour breach notification deadline — that is a GDPR Article 33 concept only. Apply it only where GDPR explicitly applies. (4) Quebec Law 25 uses "without delay" not "72 hours" — present 72 hours as a planning benchmark only. (5) California breach notification (Cal. Civ. Code §1798.82, as amended by SB 446 effective 1 Jan 2026): notify affected individuals within 30 calendar days of discovery; for breaches affecting 500+ California residents, submit a sample copy to the California Attorney General within 15 calendar days of notifying consumers. The two statutory delay exceptions (legitimate needs of law enforcement; time necessary to determine the breach scope and restore system integrity) are retained. Do NOT describe California as having no fixed deadline or use the "most expedient time possible" phrasing — that was the pre-2026 standard. 72 hours remains a GDPR Article 33 concept only. (6) The EU Artificial Intelligence Act must always be cited as "Regulation (EU) 2024/1689" — never 2024/900 or any other number. (7) MONETARY PENALTY RULE: Never state a specific monetary fine, penalty, or settlement amount unless that exact figure appears in the ENFORCEMENT CONTEXT block provided in this prompt. Training knowledge of regulatory fines is unreliable. If a relevant case exists but its amount is not in the provided block, write "[Regulator] imposed a significant penalty for this type of violation — verify the current figure at the regulator's enforcement register" instead of recalling an amount. Known correct figures (use only if the case is in your enforcement block): ICO Clearview AI (2022) £7,552,800; ICO Interserve (2022) £4,400,000 (NOT £5.03M); ICO Capita Pension Solutions (2024) £6,090,000 (NOT £6.88M); ICO British Airways (2020) £20,000,000. If you are uncertain of a specific section number, write the section in descriptive terms and flag it: "[statutory reference to be confirmed with counsel]" rather than inventing a section number.`;
    systemPrompt = systemPrompt + CITATION_INTEGRITY_RULE;
    if (gdprBlock) {
      systemPrompt = systemPrompt +
        `\n\nSTATUTORY AND EDPB AUTHORITY (cite as [Art. X] / [Recital N] / [EDPB ref]; statutory text is verbatim — do not alter it):\n${gdprBlock}` +
        `\n\nART. 28(3) FIDELITY: Every Article 28(3) sub-clause provision you draft (instructions, confidentiality, security, sub-processors, assistance with rights, assistance with security/breach/DPIA, deletion/return, audit/information) MUST track the statutory language provided in the AUTHORITY block above. Do not paraphrase away an Art. 28(3) obligation; mirror the verb and the scope of the source text.`;
    }


    // Fallback ladder: if the gateway/upstream rejects the request because
    // max_tokens exceeds the model's allowed output, dial the ceiling down and
    // retry. Anthropic returns 400 with "max_tokens" in the body for this case;
    // we also retry on 413 (request entity too large) defensively.
    const MAX_TOKENS_LADDER = documentType === "us-state"
      ? [32000, 16000, 8000]
      : [48000, 32000, 16000, 8000];

    async function callAi(extraUser: string, timeoutMs: number = 720_000): Promise<{ text: string; finishReason: string | null }> {
      const finalUser = extraUser ? `${userPrompt}\n\n${extraUser}` : userPrompt;
      let lastErr: Error | null = null;
      for (let i = 0; i < MAX_TOKENS_LADDER.length; i++) {
        const maxTokens = MAX_TOKENS_LADDER[i];
        const aiController = new AbortController();
        const aiTimeout = setTimeout(() => aiController.abort(), timeoutMs);
        try {
          const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_API_KEY!,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: AI_MODEL,
              max_tokens: maxTokens,
              system: systemPrompt,
              messages: [
                { role: "user", content: finalUser },
              ],
            }),
            signal: aiController.signal,
          });
          clearTimeout(aiTimeout);
          if (!aiRes.ok) {
            const errText = await aiRes.text();
            const isTokenCapError =
              (aiRes.status === 400 || aiRes.status === 413) &&
              /max_tokens|too\s*large|exceed|maximum/i.test(errText);
            console.error(`[generate-dpa] AI call failed (max_tokens=${maxTokens}) status=${aiRes.status}: ${errText.slice(0, 300)}`);
            if (isTokenCapError && i < MAX_TOKENS_LADDER.length - 1) {
              console.warn(`[generate-dpa] dialing max_tokens down to ${MAX_TOKENS_LADDER[i + 1]} and retrying`);
              lastErr = new Error(`token-cap rejection at ${maxTokens}`);
              continue;
            }
            throw new Error(`AI generation failed (status ${aiRes.status})`);
          }
          const aiData = await aiRes.json();
          const text = aiData.content?.[0]?.text ?? "";
          const stopReason: string | null = aiData.stop_reason ?? null;
          // Normalize to the signal the call sites already expect: the truncation-refusal
          // logic downstream checks finishReason === "length". Anthropic uses "max_tokens".
          const finishReason: string | null = stopReason === "max_tokens" ? "length" : stopReason;
          console.log(`[generate-dpa] gen done stop=${stopReason} chars=${text.length} max_tokens=${maxTokens}`);
          return { text, finishReason };
        } catch (e) {
          clearTimeout(aiTimeout);
          lastErr = e as Error;
          // Abort/timeout/network — don't loop, surface immediately
          if ((e as Error).name === "AbortError") throw e;
          if (!String((e as Error).message).startsWith("token-cap")) throw e;
        }
      }
      throw lastErr ?? new Error("AI generation failed (ladder exhausted)");
    }


    function parseDpa(fullText: string): { dpa_text: string; annotations: any[] } {
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
      return { dpa_text, annotations: parsedAnnotations };
    }

    let fullText: string;
    try {
      let firstCall = await callAi("");
      if (firstCall.finishReason === "length") {
        console.warn("[generate-dpa] truncated_output on first attempt — retrying once with concise instruction");
        const retryCall = await callAi(
          "Your previous attempt exceeded the length limit and was cut off. Produce the complete document more concisely; every numbered section, the signature block, and all Schedules must be present.",
          360_000,
        );
        if (retryCall.finishReason === "length") {
          throw new Error("truncated_output: DPA generation hit length limit twice; refusing to persist truncated contract");
        }
        firstCall = retryCall;
      }
      fullText = firstCall.text;
    } catch (e) {
      throw e instanceof Error ? e : new Error("AI generation failed");
    }

    let parsed = parseDpa(fullText);
    let lint = lintReportText(parsed.dpa_text, { checkClauseNumbering: true });
    let dpa_text = stripEnforcementTags(lint.clean);
    let parsedAnnotations = parsed.annotations;

    if (!dpa_text.trim()) {
      throw new Error("AI generation returned an empty document");
    }

    const buildReportData = () => ({
      enforcement_precedents: enforcement_context.slice(0, 5),
      enforcement_meta: enforcementMeta,
      gdpr_meta: gdprMeta,
      annotations: parsedAnnotations,
      information_needed: Array.isArray((parsed as any)?.information_needed)
        ? (parsed as any).information_needed
        : [],
      generated_at: new Date().toISOString(),
    });
    let report_data: ReturnType<typeof buildReportData> = buildReportData();

    try {
      const guarded = guardInformationNeeded(
        { ...report_data, document_text: dpa_text } as Record<string, unknown>,
        (body as unknown) as Record<string, unknown>,
      );
      (report_data as any).information_needed = (guarded as any).information_needed ?? report_data.information_needed;
    } catch (e) {
      console.warn("[generate-dpa] insufficient-info guard error:", e);
    }

    // PRIMARY PERSISTENCE — persist-first, BEFORE the lint-repair regeneration.
    // The generated document must never be lost to a downstream repair failure
    // or a wall-time kill during repair. If repair later succeeds, we update
    // the row again with the repaired text; if it fails, the original document
    // stays saved with its lint warnings recorded.
    console.log(`[generate-dpa] persisting rowId=${rowId} chars=${dpa_text.length}`);
    const { error: updateErr } = await supabase
      .from("dpa_documents")
      .update({
        status: "complete",
        intake_data: body,
        document_text: dpa_text,
        report_data,
        lint_warnings: lint.violations,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);
    if (updateErr) {
      console.error("[generate-dpa] dpa_documents persist failed:", updateErr);
      throw updateErr;
    }
    console.log(`[generate-dpa] persisted rowId=${rowId} status=complete`);

    // Post-persist lint repair (non-fatal). If hard violations exist, attempt
    // one regeneration and update the row with repaired text on success. On
    // failure, keep the already-persisted document with its lint warnings.
    if (hasHardViolations(lint)) {
      try {
        const details = lint.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
        const retryCall = await callAi(
          `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the document again, correcting these defects silently. Do not mention this instruction or the defects in the document.`,
          360_000,
        );
        const retryParsed = parseDpa(retryCall.text);
        const retryLint = lintReportText(retryParsed.dpa_text, { checkClauseNumbering: true });
        const repairedText = stripEnforcementTags(retryLint.clean);
        if (repairedText.trim()) {
          parsed = retryParsed;
          lint = retryLint;
          dpa_text = repairedText;
          parsedAnnotations = retryParsed.annotations;
          report_data = buildReportData();
          try {
            const guarded = guardInformationNeeded(
              { ...report_data, document_text: dpa_text } as Record<string, unknown>,
              (body as unknown) as Record<string, unknown>,
            );
            (report_data as any).information_needed = (guarded as any).information_needed ?? report_data.information_needed;
          } catch (e) {
            console.warn("[generate-dpa] insufficient-info guard error (post-repair):", e);
          }
          console.log(`[generate-dpa] persisting repaired rowId=${rowId} chars=${dpa_text.length}`);
          const { error: repairUpdateErr } = await supabase
            .from("dpa_documents")
            .update({
              document_text: dpa_text,
              report_data,
              lint_warnings: lint.violations,
              updated_at: new Date().toISOString(),
            })
            .eq("id", rowId);
          if (repairUpdateErr) {
            console.warn("[generate-dpa] repaired persist failed (non-fatal):", repairUpdateErr);
          } else {
            console.log(`[generate-dpa] persisted repaired rowId=${rowId}`);
          }
        }
      } catch (e) {
        console.warn("[DPA] lint repair failed (non-fatal, original document retained):", e);
      }
    }


    // Stage 2 (non-fatal): metering + version retention.
    try {
      await recordRunMeterAndVersion(supabase, {
        toolType: "dpa_generator",
        assessmentId: rowId,
        userId: resolvedUserId ?? null,
        intake: (body as unknown) as Record<string, unknown>,
        reportData: report_data,
        documentText: dpa_text,
      });
    } catch (meterErr) {
      console.error("[generate-dpa] recordRunMeterAndVersion non-fatal:", meterErr);
    }

    // L2 — observe-only citation lint (never blocks, never mutates output).
    try {
      await observeCitations(
        supabase,
        "generate-dpa",
        rowId,
        dpa_text,
        (gdprMeta?.matched_articles ?? []).map((n: string) => `Article ${n} GDPR`),
      );
    } catch (obsErr) {
      console.error("[citation-observe] non-fatal:", String(obsErr));
    }

    // C4 RoPA accumulator: third-party processor onboarding is a RoPA event
    const dpaClientId = (body as any).client_id as string | null | undefined;
    if (dpaClientId) {
      const processorName = (body as any).processor_name || (body as any).vendor_name || "third-party processor";
      const purpose = (body as any).processing_purpose || (body as any).description || "Data sharing with processor";
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: dpaClientId,
          source_tool: "dpa_generator",
          source_assessment_id: rowId,
          display_name: `Processor: ${String(processorName).slice(0, 80)}`,
          source_summary: String(purpose),
          is_high_risk: false,
          category: "third_party",
        },
      }).catch((e: Error) => console.error("[dpa] accumulate-ropa failed (non-fatal):", e.message));
    }
      } catch (bgErr) {
        const errMsg = bgErr instanceof Error ? bgErr.message : String(bgErr);
        console.error("[generate-dpa] background error:", errMsg, bgErr);
        // Write the actual error to last_error so watchdog/operator can diagnose
        // instead of leaving the row silently stuck in 'processing'.
        try {
          await supabase.from("dpa_documents").update({
            status: "failed",
            last_error: `bg: ${errMsg}`.slice(0, 500),
            last_attempt_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", rowId);
        } catch (writeErr) {
          console.error("[generate-dpa] failed to write failure state:", writeErr);
        }
        await failFunctionRun(supabase, fnRun, bgErr, { metadata: { rowId } });
        return;
      }
      await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "dpa_documents", sourceRowId: rowId });
    };

    const fnRun = await startFunctionRun(supabase, "generate-dpa", {
      archetype: "background",
      trustClass: "user",
      userId: resolvedUserId,
      invokedBy: caller.internal ? "internal" : "user",
      metadata: { rowId },
    });
    // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
    EdgeRuntime.waitUntil(runBackground());

    return new Response(
      JSON.stringify({ success: true, id: rowId, status: "processing" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-dpa error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
