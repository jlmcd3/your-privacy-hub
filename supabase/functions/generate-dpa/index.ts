// qb8 build active
// run-meter deploy-check v1
// generate-dpa: produces a GDPR Article 28 DPA, calibrated to live enforcement context.
export const BUILD_STAMP = "qbp25-dpa-drafting-record@2026-07-23T04:00:00Z";
console.log(`[generate-dpa] boot build_stamp=${BUILD_STAMP}`);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun, logPostGenLint } from "../_shared/function-run-logger.ts";
import { stripEnforcementTags } from "../_shared/enforcement-id-hygiene.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { freezeOpenItemsOnFirstRun } from "../_shared/open-items.ts";
import { handleRevisionMode } from "../_shared/revision-mode.ts"; // RC-B.1
import { observeCitations } from "../_shared/citation-observe.ts";
import { PROMPT_CORE_VERSION, SPECIFICITY_ACTIONABILITY_RULE, ENGAGED_JURISDICTION_CITATION_RULE } from "../_shared/prompt-core.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { renderSupplementalBlock } from "../_shared/supplemental-block.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";
import { detectBlacklistPhrases, formatBlacklistRetrySuffix } from "../_shared/blacklist-phrases.ts";
import { deriveEngagedStates, detectNonEngagedStateAssertions } from "../_shared/dpa-engaged-states.ts";
import { ADVISORY_VOICE_RULES, hasCounselReferral } from "../_shared/advisory-voice.ts";

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
  // dataSubjectCount removed per CEO ruling 2026-07-14 (never-asked phantom field);
  // requests that still send the key are accepted and the value ignored (Body interface
  // is a superset of the wire — extra keys are dropped by TS at read sites).

  // Post-ruling 2026-07-14: retention / auditRights / transfer question are ASKED;
  // legalFramework and includeTransferClause are DERIVED server-side. All four
  // fields remain accepted on legacy payloads with the OLD default fall-backs
  // applied below so replays don't 400 — but the current form never omits them.
  retention?: string;
  hasSubProcessors: boolean;
  subProcessorList?: string;
  // HF1 Task 3 — legalFramework accepted as an object ({ primary, additionalFrameworks[] })
  // from the DPA intake; legacy string form remains accepted (BC only, framework is
  // still derived from documentType). additionalFrameworks[] is READ from intake and
  // surfaced into the prompt via renderAdditionalFrameworksBlock.
  legalFramework?: string | { primary?: string; additionalFrameworks?: string[] };
  auditRights?: string;
  includeTransferClause?: boolean;
  transferMechanism?: string;
  documentType?: "gdpr" | "us-state" | "canada" | "dual-eu-us" | "dual-eu-ca" | "uk";
  assessment_id?: string;
  user_id?: string;
}

// CEO ruling 2026-07-14 — legal framework derived from documentType.
// FF-DPA nd6 — UK is a distinct framework (UK GDPR + DPA 2018), not EU GDPR.
// Task 9 (FF-DPA) — derivation logic extracted to _shared/dpa-derivation.ts
// so the UK derivation matrix and 11-case REBUILD-DPA set are unit-testable
// without loading the full edge-function module. Behaviour is unchanged; the
// QL2-FIX-1 UK territorial-scope block inside GDPR_SYSTEM continues to fire
// for EU+UK mixed derivations (routed to gdpr mode).
import {
  frameworkFor,
  EU_JURS, UK_JURS, US_JURS, CA_JURS,
  VALID_DOC_TYPES, JURISDICTION_ALIASES,
  normalizeJurisdiction, detectDocType,
} from "../_shared/dpa-derivation.ts";


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

// REBUILD-DPA T2/T5 — post-generation deterministic checks. Fire HARD
// violations into the existing lintReportText/hasHardViolations retry gate
// so the caller does not need bespoke retry plumbing. Every hit is also
// echoed to logPostGenLint so the retry / fall-back is discoverable in
// function_runs (parity with the risk/dpia MC-G1 pattern).
type SpecViolation = { code: string; severity: "hard"; detail: string };

// Word-boundary regex helpers — narrow scope to prose. `\b` around the
// phrases keeps enum literals and machine tokens out of scope; casing is
// case-insensitive.
const RE_CHILDRENS_SIGNAL = /\b(COPPA|FERPA|Recital 38|Article 8 GDPR|Article 8(?:\(1\))? of the GDPR|children'?s data|children under 13|children under 18|minors?|under 18)\b/i;
const RE_AI_TRAINING_SIGNAL = /\b(model training|ML training|machine learning training|training (?:its|the|our) models|use[s]? .* to train (?:its|the|our) models?|inference platform)\b/i;
const RE_HIPAA_SIGNAL = /\b(HIPAA|Business Associate Agreement|Business Associate\b|BAA\b|Protected Health Information|\bPHI\b|Covered Entity|45 C\.?F\.?R\.? § 16[04])/i;
const RE_GLBA_FCRA_SIGNAL = /\b(GLBA|Gramm[- ]Leach[- ]Bliley|Safeguards Rule|Nonpublic Personal Information|\bNPI\b|FCRA|Fair Credit Reporting Act|15 U\.?S\.?C\.? § 168)/i;

function detectSpeculativeClauseViolations(
  text: string,
  flags: { hasChildrensData: boolean; hasHealthData: boolean; hasFinancialData: boolean; isAI: boolean },
): SpecViolation[] {
  const out: SpecViolation[] = [];
  if (!flags.hasChildrensData) {
    const m = text.match(RE_CHILDRENS_SIGNAL);
    if (m) out.push({ code: "speculative_childrens_module", severity: "hard", detail: `children/COPPA/FERPA content without hasChildrensData flag (match: "${m[0]}")` });
  }
  if (!flags.isAI) {
    const m = text.match(RE_AI_TRAINING_SIGNAL);
    if (m) out.push({ code: "speculative_ai_training_scenario", severity: "hard", detail: `ML-training scenario without AI sector flag (match: "${m[0]}")` });
  }
  if (!flags.hasHealthData) {
    const m = text.match(RE_HIPAA_SIGNAL);
    if (m) out.push({ code: "speculative_health_module", severity: "hard", detail: `HIPAA/BAA/PHI content without hasHealthData flag (match: "${m[0]}")` });
  }
  if (!flags.hasFinancialData) {
    const m = text.match(RE_GLBA_FCRA_SIGNAL);
    if (m) out.push({ code: "speculative_financial_module", severity: "hard", detail: `GLBA/FCRA content without hasFinancialData flag (match: "${m[0]}")` });
  }
  return out;
}

// REBUILD-DPA T1c — the mandated "baseline standard" sentence may only appear
// when framework is affirmatively GDPR. If a misclassified non-GDPR intake
// ships with the sentence, treat as HARD so the retry regenerates.
const RE_BASELINE_STANDARD =
  /adopts the GDPR Article 28\(3\) framework as its contractual baseline standard/i;
function detectBaselineStandardMisuse(text: string, docType: string): SpecViolation[] {
  if (docType === "gdpr" || docType === "dual-eu-us" || docType === "dual-eu-ca") return [];
  if (RE_BASELINE_STANDARD.test(text)) {
    return [{ code: "baseline_standard_sentence_out_of_scope", severity: "hard", detail: `baseline-standard sentence emitted in docType=${docType}` }];
  }
  return [];
}

// GRADER-CAL-1 C1 — Cal. Civ. Code §1798.150 is the CCPA private right of
// action, NOT the breach-notification section. §1798.82 is the breach-
// notification section. Any co-occurrence of §1798.150 with a breach /
// notification verb in the same clause is a HARD misapplication so the
// retry gate regenerates.
const RE_1798_150 = /\b1798\.150\b/g;
const RE_BREACH_NOTIFICATION_VERB =
  /\b(breach\s+notification|notify(?:\s+the)?\s+(?:individuals?|affected|regulator|attorney\s+general)|breach[- ]notification\s+(?:deadline|requirement|obligation|window))\b/i;
function detectSection150BreachMisapplication(text: string): SpecViolation[] {
  const out: SpecViolation[] = [];
  let m: RegExpExecArray | null;
  while ((m = RE_1798_150.exec(text)) !== null) {
    // Look at a 180-char window on either side of the citation.
    const start = Math.max(0, m.index - 180);
    const end = Math.min(text.length, m.index + 180);
    const window = text.slice(start, end);
    if (RE_BREACH_NOTIFICATION_VERB.test(window)) {
      out.push({
        code: "misapplied_1798_150_as_breach_notice",
        severity: "hard",
        detail: `§1798.150 (private right of action) co-occurs with a breach-notification verb — cite §1798.82 for breach notification. Window: "${window.replace(/\s+/g, " ").slice(0, 140)}"`,
      });
      break; // one is enough to force a regen
    }
  }
  return out;
}

// REBUILD-DPA T5 — surface blacklist prose hits as HARD lint violations.
function detectBlacklistViolations(text: string): SpecViolation[] {
  const hits = detectBlacklistPhrases(text);
  return hits.map((h) => ({
    code: "blacklist_phrase",
    severity: "hard" as const,
    detail: `"${h.match}" @ ${h.path || "$"} — "${h.context.trim().slice(0, 80)}"`,
  }));
}

// HF2 Task 6 — sub-processor contradiction detector (BIDIRECTIONAL).
// When hasSubProcessors===false, the model must NOT emit a sub-processor
// authorisation framework (Schedule 1 / general-authorisation list). The
// prior regex required Schedule 1 (or "general authorisation") to appear
// FIRST — text ordering it after "sub-processor" escaped detection. Now the
// detector fires on either order within the proximity window.
const SUBPROC_TOKEN = /(?:sub[- ]?processor|approved\s+Sub[- ]?processors|list\s+of\s+Sub[- ]?processors)/i;
const RE_SCHEDULE1_SUBPROC_FWD =
  /\bSchedule\s*1\b[^\n]{0,80}(?:sub[- ]?processor|approved\s+Sub[- ]?processors|list\s+of\s+Sub[- ]?processors)/i;
const RE_SCHEDULE1_SUBPROC_REV =
  /(?:sub[- ]?processor|approved\s+Sub[- ]?processors|list\s+of\s+Sub[- ]?processors)[^\n]{0,80}\bSchedule\s*1\b/i;
const RE_GENERAL_AUTH_SUBPROC_FWD =
  /\bgeneral\s+authorisation\b[^.\n]{0,120}\bsub[- ]?processor/i;
const RE_GENERAL_AUTH_SUBPROC_REV =
  /\bsub[- ]?processor[^.\n]{0,120}\bgeneral\s+authorisation\b/i;
// Retained aliases for downstream imports/telemetry.
const RE_SCHEDULE1_SUBPROC = RE_SCHEDULE1_SUBPROC_FWD;
const RE_GENERAL_AUTH_SUBPROC = RE_GENERAL_AUTH_SUBPROC_FWD;
function detectSubProcessorContradiction(text: string, hasSubProcessors: boolean): SpecViolation[] {
  if (hasSubProcessors) return [];
  const hits: SpecViolation[] = [];
  const m1 = text.match(RE_SCHEDULE1_SUBPROC_FWD) ?? text.match(RE_SCHEDULE1_SUBPROC_REV);
  if (m1) hits.push({ code: "sub_processor_framework_when_disabled", severity: "hard", detail: `Schedule-1/list-of-sub-processors framework emitted when hasSubProcessors=false (match: "${m1[0].slice(0, 120)}")` });
  const m2 = text.match(RE_GENERAL_AUTH_SUBPROC_FWD) ?? text.match(RE_GENERAL_AUTH_SUBPROC_REV);
  if (m2) hits.push({ code: "sub_processor_framework_when_disabled", severity: "hard", detail: `general-authorisation sub-processor clause emitted when hasSubProcessors=false (match: "${m2[0].slice(0, 120)}")` });
  return hits;
}

// IR-HF1 T4 (F1) — DETERMINISTIC SUB-PROCESSOR SUPPRESSION.
// When hasSubProcessors===false, the final DPA must (a) NOT contain the
// Schedule-1 sub-processor authorisation framework or general-authorisation
// clause and (b) contain the exact literal "None — confirmed on the record".
// Run D shipped the Schedule-1 framework in 2/5 docs and the confirmed
// literal in 0/5 despite the hard-severity lint firing — retry_within_budget
// was null because the hard lint never drove a regen. We now suppress
// mechanically at assembly (does not rely on model compliance); the hard
// lint below acts as a true backstop.
const SUBPROC_CONFIRMED_LITERAL =
  "Sub-processors: None — confirmed on the record that no Sub-processors are engaged as of the Effective Date. Any future engagement by the Processor requires the Controller's prior specific written authorisation obtained before the engagement commences.";
function suppressSubProcessorFramework(text: string, hasSubProcessors: boolean): { text: string; suppressed: boolean } {
  if (hasSubProcessors) return { text, suppressed: false };
  const paras = text.split(/\n{2,}/);
  const offending = (p: string) =>
    RE_SCHEDULE1_SUBPROC_FWD.test(p) ||
    RE_SCHEDULE1_SUBPROC_REV.test(p) ||
    RE_GENERAL_AUTH_SUBPROC_FWD.test(p) ||
    RE_GENERAL_AUTH_SUBPROC_REV.test(p) ||
    /SCHEDULE\s*1\s*[—\-–]\s*(APPROVED\s+)?SUB[- ]?PROCESSORS?/i.test(p) ||
    /LIST\s+OF\s+SUB[- ]?PROCESSORS/i.test(p);
  let suppressed = false;
  let inserted = false;
  const out: string[] = [];
  for (const p of paras) {
    if (offending(p)) {
      suppressed = true;
      if (!inserted) {
        out.push(SUBPROC_CONFIRMED_LITERAL);
        inserted = true;
      }
      continue;
    }
    out.push(p);
  }
  let joined = out.join("\n\n");
  if (!/None\s+—\s+confirmed\s+on\s+the\s+record/i.test(joined)) {
    joined = joined.trimEnd() + `\n\n${SUBPROC_CONFIRMED_LITERAL}`;
    suppressed = true;
  }
  return { text: joined, suppressed };
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
  console.log(`[qb9-rcb1] generate-dpa build active · core=${PROMPT_CORE_VERSION}`);
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
    // RC-B.1 — scoped-delta revision short-circuit.
    {
      const __rev = await handleRevisionMode(supabase, body as any, { toolType: "dpa_generator" });
      if (__rev) return __rev;
    }


    if (body.assessment_id) {
      const ent = await requireEntitlement(caller, "dpa_generator", { rowId: body.assessment_id });
      if (!ent.ok) {
        console.log(JSON.stringify({ evt: "entitlement_denied", fn: "generate-dpa", reason: ent.reason }));
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: ent.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!caller.internal) {
      // Non-service callers must operate on an existing row (created by the
      // subscriber/checkout flow). Creating-and-generating in one shot is
      // reserved for the payments-webhook (internal) path.
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Backward compatibility (CEO ruling 2026-07-14): legacy payloads that omit
    // the newly-asked fields fall back to the OLD form defaults server-side so
    // replays don't 400. The current form never produces this shape. Any client
    // legalFramework value is IGNORED — the framework is derived below.
    if (typeof body.retention !== "string" || !body.retention.trim()) {
      body.retention = "As directed by controller";
    }
    if (typeof body.auditRights !== "string" || !body.auditRights.trim()) {
      body.auditRights = "Standard";
    }
    // PRODUCT-FIX-5 T5(a) — normalize includeTransferClause accepting both
    // boolean and object shapes. Object shape { include?: boolean, basis?: string }
    // → body.includeTransferClause = (include === true); capture basis into
    // transferBasis. Any other type → false, transferBasis "".
    let transferBasis = "";
    const _itc: any = (body as any).includeTransferClause;
    if (typeof _itc === "boolean") {
      // unchanged
    } else if (_itc && typeof _itc === "object") {
      body.includeTransferClause = _itc.include === true;
      transferBasis = typeof _itc.basis === "string" ? _itc.basis.trim() : "";
    } else {
      body.includeTransferClause = false;
    }
    if (typeof body.transferMechanism !== "string") {
      body.transferMechanism = body.includeTransferClause ? "SCCs" : "";
    }

    // PRODUCT-FIX-5 T5(c) — deterministic SCC module cross-check between
    // transferBasis and body.transferMechanism.
    const _extractModule = (s: string): string => {
      const m = /module\s*(one|two|three|four|1|2|3|4)|\b(C2C|C2P|P2P|P2C)\b/i.exec(s || "");
      if (!m) return "";
      const raw = (m[1] || m[2] || "").toLowerCase();
      const map: Record<string, string> = {
        one: "module 1", two: "module 2", three: "module 3", four: "module 4",
        "1": "module 1", "2": "module 2", "3": "module 3", "4": "module 4",
        c2c: "module 1", c2p: "module 2", p2p: "module 3", p2c: "module 4",
      };
      return map[raw] || "";
    };
    const _basisMod = _extractModule(transferBasis);
    const _mechMod = _extractModule(body.transferMechanism || "");
    const _moduleContradiction = (_basisMod && _mechMod && _basisMod !== _mechMod)
      ? { X: _mechMod, Y: _basisMod }
      : null;

    if (body.assessment_id) {
      const procWrite = await lifecycleUpdate(supabase, "dpa_documents", body.assessment_id, { status: "processing", intake_data: body, updated_at: new Date().toISOString() }, { fn: "generate-dpa", phase: "pre_generation" });
      if (!procWrite.ok) {
        return new Response(JSON.stringify({ error: "lifecycle_write_failed", message: procWrite.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
      await lifecycleUpdate(supabase, "dpa_documents", rowId, {
        status: "failed",
        updated_at: new Date().toISOString(),
      }, { fn: "generate-dpa", phase: "terminal_error_no_key" });
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
    // Resolve document type (from request or jurisdictional inference).
    // REBUILD-DPA T1 — non-string documentType (fixture regression: object
    // {type:"DPA",version:"2.1",...}) is IGNORED, not returned. Unmapped
    // jurisdictions are surfaced via mapped flags and route to both the
    // in-document NOTE FOR LEGAL REVIEW and function_runs telemetry.
    const detected = detectDocType(
      body.controllerJurisdiction,
      body.processorJurisdiction,
      (body as any).documentType,
    );
    const documentType = detected.docType;
    const frameworkFallback = !detected.explicitAccepted && (!detected.ctrlMapped || !detected.procMapped);
    const explicitTypeIgnored = ((body as any).documentType != null) && !detected.explicitAccepted;
    if (frameworkFallback) {
      console.warn(`[generate-dpa] framework fallback — ctrl="${body.controllerJurisdiction}" (mapped=${detected.ctrlMapped}) proc="${body.processorJurisdiction}" (mapped=${detected.procMapped}) → docType=${documentType}`);
    }
    if (explicitTypeIgnored) {
      console.warn(`[generate-dpa] explicit documentType ignored (rawType=${detected.explicitRawType}) — derived docType=${documentType}`);
    }

    // Sector-specific data category flags (used for US-mode module injection)
    const sectorFlags = detectDataSectorFlags(body.dataCategories || [], body.services || "");
    const isAISector = /model training|machine learning|ai training|inference platform|llm/i.test(body.services || "");


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
        `Controller-processor DPA: ${body.controllerName} (${body.controllerJurisdiction}) engages ${body.processorName} (${body.processorJurisdiction}) for ${body.services}. Data: ${(Array.isArray(body.dataCategories) ? body.dataCategories : []).join(", ")}.`;
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

VERIFIED US-STATE CITATION ANCHORS (verified against the official state legislative sources, July 2026 — cite these WITHOUT the '[statutory reference to be confirmed]' hedge; the hedge is reserved for citations OUTSIDE this list):

CONNECTICUT (CTDPA, Conn. Gen. Stat. ch. 743jj): §42-515 definitions; §42-516 applicability; §42-518 consumer rights (access, correction, deletion, portability, opt-out) and controller response duties — respond without undue delay, no later than 45 days of receipt, extendable once by 45 days, with an appeal process; §42-520 controller duties, including the duty not to process sensitive data without the consumer's consent (COPPA compliance for known children); §42-521 processor duties and the required controller-processor contract; §42-522 data protection assessments (NEVER cite §42-523 for assessments — §42-523 is de-identified and pseudonymous data); §42-525 enforcement by the Attorney General.

OREGON (OCPA, ORS 646A.570–646A.589): 646A.570 definitions; 646A.572 scope and exclusions (NOT a sensitive-data provision); 646A.574 consumer rights — response without undue delay and not later than 45 days after receiving the request (646A.574(5)(a)), extendable; 646A.578 controller duties, including the prohibition on processing sensitive data about a consumer without first obtaining the consumer's consent; 646A.581 processor duties and the required controller-processor contract; 646A.586 data protection assessments; 646A.589 Attorney General investigative authority. Oregon BREACH notification is the separate Oregon Consumer Information Protection Act — cite the operative notice provision ORS 646A.604, never 646A.600 (the short title).

VIRGINIA (VCDPA, Va. Code §§59.1-575–585): 59.1-575 DEFINITIONS ONLY (biometric data; the consumer definition excludes employment context) — never cite 59.1-575 for minimization or substantive duties; 59.1-576 scope and exemptions; 59.1-577 consumer rights with the 45-day response at 59.1-577(B)(1), extendable once, and appeals at 59.1-577(C); 59.1-578 controller duties — minimization 578(A)(1), purpose limitation 578(A)(2), security 578(A)(3), non-discrimination 578(A)(4), sensitive-data consent 578(A)(5), privacy notice 578(C), sale/targeted-advertising disclosure 578(D); the 2024 VCDPA amendment (cc. 840/844) added the CHILDREN'S-DATA provisions at 578(F) and is the only 2024 VCDPA amendment — never attribute breach-notification content to it; 59.1-579 controller-processor responsibility and contract; 59.1-580 data protection assessments. Virginia breach notification is Va. Code §18.2-186.6, outside the VCDPA.

COLORADO (CPA, C.R.S. 6-1-1301–1313): cite Colorado at the SECTION level with a descriptive gloss — 6-1-1303 definitions; 6-1-1305 responsibility according to role (controller-processor obligations); 6-1-1306 consumer personal data rights; 6-1-1308 duties of controllers; 6-1-1309 data protection assessments. NEVER cite 6-1-1313 for any substantive duty or breach obligation — it is the Attorney General rulemaking/opt-out-mechanism provision. Colorado's breach-notification statute is C.R.S. 6-1-716, outside the CPA. Do not assert Colorado subsection letters not listed here; use the section number plus a descriptive gloss.

CALIFORNIA BREACH SEQUENCING (state it in this order, never merged into one clause): first, the Controller notifies affected California residents within 30 calendar days of discovery or notification of the breach (Cal. Civ. Code § 1798.82, as amended by SB 446, for breaches on or after 1 January 2026, subject to the law-enforcement and scope-determination carve-outs); second, where MORE THAN 500 California residents are notified, the Controller electronically submits a single sample copy of that notification to the California Attorney General within 15 calendar days AFTER notifying consumers (§ 1798.82(f)). The 15-day AG clock starts at consumer notification, not at discovery.

HEDGE DISCIPLINE: for any state-law citation NOT covered by these anchors, either cite at the statute level with a descriptive gloss or use the [statutory reference to be confirmed] flag — never invent a subsection.`;

    const US_SYSTEM = `You are a senior data protection counsel specialising in US state privacy law. Draft a complete, legally rigorous Data Processing Agreement compliant with all applicable US state privacy laws including CCPA/CPRA (California), TDPSA (Texas), CTDPA (Connecticut), VCDPA (Virginia), CPA (Colorado), OCPA (Oregon), and other state laws applicable based on the parties' jurisdictions and where their data subjects reside. The agreement must be immediately usable without further editing except where marked [TO BE COMPLETED].

OUTPUT SCOPE AND LENGTH DISCIPLINE: Draft ONE integrated agreement scoped to the state laws actually engaged by the intake — the parties' stated jurisdictions and the states where the described data subjects reside. Address those states' requirements in consolidated clauses (one obligation clause satisfying all engaged states, noting the strictest standard where they differ), NEVER a separate addendum, restatement, or clause-set per statute. States not engaged by the intake are covered by a single savings clause: 'To the extent the personal information of residents of other US states is processed, the Parties shall comply with the applicable state privacy laws of those states, applying the standards of this DPA as a baseline.' Do not enumerate or summarise statutes beyond the engaged states. Target a complete agreement of ordinary commercial length — comparable to the GDPR-mode DPA — not a treatise; completeness comes from consolidated coverage, not per-state repetition.

VERIFIED VIRGINIA BREACH FACTS (verified against law.lis.virginia.gov, July 2026 — cite these; never recall Virginia breach law from memory): Virginia's breach-notification statute is Va. Code § 18.2-186.6 (NOT part of the VCDPA; the VCDPA, Va. Code §§ 59.1-575 through 59.1-585, contains no breach-notification provisions). The standard is notice to the Office of the Attorney General and affected residents 'without unreasonable delay'; where more than 1,000 persons are notified at one time, the Office of the Attorney General and nationwide consumer reporting agencies must also be notified without unreasonable delay of the timing, distribution, and content of the notice. There is NO 60-day deadline, NO 100,000-consumer threshold, and NO 2024 breach-notification amendment. NEVER assert that any statute was amended in a given year, or attribute a requirement to an amendment, unless that amendment appears in the supplied context — inventing amendment history is the most serious defect this document can contain.


BREACH NOTIFICATION PARTY RULE: The breach notification section governs the Processor's notification obligation to the Controller. Any sub-clause requiring description of remedial measures must state those are the measures "taken or proposed to be taken by the Processor" — NOT "by the Controller." The Controller's own measures belong in the Controller's separate notification to regulators and individuals, not in the Processor's DPA notification clause.` + US_STATE_CITATION_ANCHORS;

    const CA_SYSTEM = `You are a senior privacy counsel specialising in Canadian privacy law. Draft a complete, legally rigorous Data Processing Agreement compliant with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), Quebec's Act Respecting the Protection of Personal Information in the Private Sector (Law 25 / Bill 64), and applicable provincial privacy laws (PIPA Alberta, PIPA BC, PHIPA Ontario) based on the parties' jurisdictions. The agreement must be immediately usable without further editing except where marked [TO BE COMPLETED]. PHIPA (Ontario's Personal Health Information Protection Act) applies ONLY where a party qualifies as a health information custodian or agent under PHIPA s.3. If the intake data does not establish health information custodian status for either party, do NOT assert that PHIPA applies. Instead, note in the recitals in advisory voice: "The record does not establish that either party qualifies as a health information custodian under PHIPA s.3, so PHIPA has not been treated as applicable in this Agreement; further clarification is advisable."

UK DPA 2018 SCHEDULE 1 STRUCTURE — do not confuse these:
- Part 1, paragraph 1: employment, social security, and social protection purposes
- Part 1, paragraph 2: health or social care purposes
- Part 1, paragraph 3: public health
- Part 1, paragraph 4: safeguarding of children and individuals at risk
- Part 2, paragraphs 6–28: substantial public interest conditions (research, journalism, etc.)
When citing a Schedule 1 condition, state the correct Part and paragraph number and its title. "Schedule 1, Part 1, paragraph 2 (health or social care)" is correct. "Schedule 1, paragraph 1 (substantial public interest)" is INCORRECT — substantial public interest is in Part 2. Where a Schedule 1 condition is relevant, cite it as "Schedule 1, Part [1 or 2], paragraph [N] DPA 2018" with the correct title.

ALBERTA PIPA BREACH NOTIFICATION: Sections 34.1–34.6 were added by 2022 amendments and introduce a real-risk-of-significant-harm based notification obligation. These are valid citations for Alberta-based processing. When citing them, note: "applies to processing of personal information of Alberta residents or conducted in Alberta in the course of commercial activity. The standard is 'real risk of significant harm' consistent with PIPEDA."

BREACH NOTIFICATION PARTY RULE: The breach notification section governs the Processor's notification obligation to the Controller. Any sub-clause requiring description of remedial measures must state those are the measures "taken or proposed to be taken by the Processor" — NOT "by the Controller."`;

    const DUAL_EU_US_SYSTEM = `You are a senior data protection counsel with expertise in both EU/UK GDPR and US state privacy law. Draft a dual-compliance Data Processing Agreement that satisfies both GDPR Article 28 and US state privacy law requirements (CCPA/CPRA, TDPSA, CTDPA, VCDPA, CPA as applicable). The document must work as a single integrated agreement — not two separate documents stapled together. Where GDPR requirements are stricter, GDPR prevails; where US state requirements are additional, both are captured.` + US_STATE_CITATION_ANCHORS;

    const DUAL_EU_CA_SYSTEM = `You are a senior data protection counsel with expertise in both EU/UK GDPR and Canadian privacy law (PIPEDA, Quebec Law 25, PIPA AB/BC, PHIPA ON). Draft a dual-compliance Data Processing Agreement that satisfies both GDPR Article 28 and applicable Canadian federal/provincial privacy laws as a single integrated agreement. Where GDPR is stricter, GDPR prevails; where Canadian requirements are additional, both are captured.`;

    // CEO ruling 2026-07-14: "None in place yet" → the section states no Art. 46
    // mechanism is currently in place and emits a [TO BE COMPLETED: …] placeholder,
    // rather than drafting SCC incorporation.
    const noMechanismYet = body.includeTransferClause && body.transferMechanism === "None in place yet";
    // PRODUCT-FIX-5 T5(c) — deterministic contradiction directive when the
    // record's transferMechanism and transferBasis specify different SCC modules.
    const _contradictionDirective = _moduleContradiction
      ? ` RECORD CONTRADICTION TO FLAG (deterministic): the record's transfer-mechanism field specifies ${_moduleContradiction.X} while the record's transfer-clause basis specifies ${_moduleContradiction.Y}. The DPA must NOT silently pick one: draft the transfer clause on the module consistent with the instrument's controller-processor relationship per SCC MODULE PINNING, AND flag the contradiction with one advisory sentence in Section 1 (record fact + assumption + canonical close "further clarification is advisable.") plus "[TO BE COMPLETED: confirm the applicable SCC module on the record]" sited in the transfer clause.`
      : "";
    // PRODUCT-FIX-5 T5(d) — when includeTransferClause normalizes to false,
    // replace the empty transferSection with an explicit negative directive.
    const transferSection = body.includeTransferClause
      ? (noMechanismYet
          ? `10. INTERNATIONAL TRANSFER PROVISIONS — The Parties confirm that no Article 46 GDPR transfer mechanism is currently in place for the transfers contemplated by this DPA. State this fact in operative voice and emit a [TO BE COMPLETED: transfer mechanism to be adopted before transfers occur] placeholder covering (a) the mechanism to be adopted (EU SCCs, UK IDTA / UK Addendum, Binding Corporate Rules, adequacy decision), (b) the effective date, and (c) the execution party. Do NOT draft SCC incorporation language or represent that SCCs apply. The Parties shall not commence any restricted transfer until that placeholder is populated.${_contradictionDirective}`
          : `10. INTERNATIONAL TRANSFER PROVISIONS – mechanism: ${body.transferMechanism}${_contradictionDirective}`)
      : `10. INTERNATIONAL TRANSFER PROVISIONS — The record does not engage international-transfer provisions. Do NOT draft SCC incorporation language, module references, or transfer-mechanism representations beyond the generic intra-EEA acknowledgment the section template requires.`;

    // FF-DPA nd1 — the rendered NOTE FOR LEGAL REVIEW is a customer-facing
    // instrument in professional voice. Machine tokens ("could not map",
    // "canonical supported jurisdiction", "generator", raw docType tokens like
    // "US-STATE" / "DUAL-EU-CA") are BANNED from prose. The framework name is
    // rendered via frameworkFor(documentType), never the raw documentType.
    // The wrapper below carries the render instruction to the model; the note
    // itself is the exact literal customer-facing text and must not be paraphrased.
    const _rawCtrl = String(body.controllerJurisdiction ?? "");
    const _rawProc = String(body.processorJurisdiction ?? "");
    const _ctrlClause = !detected.ctrlMapped ? `the Controller's jurisdiction as "${_rawCtrl}"` : "";
    const _procClause = !detected.procMapped ? `the Processor's jurisdiction as "${_rawProc}"` : "";
    const _joinClause = (!detected.ctrlMapped && !detected.procMapped) ? " and " : "";
    const _idClause = `${_ctrlClause}${_joinClause}${_procClause}`;
    const _frameworkName = frameworkFor(documentType);
    const _fallbackLiteral = `The record identifies ${_idClause}, for which the governing data-protection framework has not been confirmed on the record, and this DPA has been drafted under ${_frameworkName} as the closest-fit baseline; further clarification is advisable.`;
    const frameworkFallbackNote = frameworkFallback
      ? `

RENDER THE FOLLOWING NOTE VERBATIM IN SECTION 1 (Parties and Recitals) IMMEDIATELY AFTER PARTY IDENTIFICATION — copy the text between the delimiters exactly, do not paraphrase, do not reword, do not add or remove any word:
<<<NOTE_BEGIN>>>
${_fallbackLiteral}
<<<NOTE_END>>>`
      : "";

    // HF1 Task 3 — additional frameworks are surfaced verbatim from the record so
    // the drafter must address each one (incorporate where anchors exist, or
    // acknowledge with a NOTE FOR LEGAL REVIEW placeholder). Legacy string-form
    // legalFramework values carry no additional frameworks.
    const _lfObj = (body.legalFramework && typeof body.legalFramework === "object") ? body.legalFramework as { additionalFrameworks?: string[] } : null;
    const _additionalFrameworks = Array.isArray(_lfObj?.additionalFrameworks) ? (_lfObj!.additionalFrameworks as string[]).filter((x) => typeof x === "string" && x.trim().length) : [];
    const additionalFrameworksLine = _additionalFrameworks.length
      ? `\nAdditional frameworks named on the record: ${_additionalFrameworks.map((f) => `"${f}"`).join(", ")}`
      : "";

    const PARTIES_BLOCK = `PARTIES
Controller: ${body.controllerName} (${body.controllerJurisdiction})
Processor: ${body.processorName} (${body.processorJurisdiction})
Services: ${body.services}
Data categories: ${body.dataCategories.join(", ")}
Retention: ${body.retention}
Sub-processors: ${body.hasSubProcessors ? "Yes — " + (body.subProcessorList || "(list to be provided)") : "None — the Controller has confirmed on the record that no sub-processors are engaged for the Services"}
Audit rights: ${body.auditRights}${additionalFrameworksLine}${frameworkFallbackNote}`;


    const ANNOTATIONS_INSTRUCTIONS = `Requirements:
- SPECULATIVE-CLAUSE BAN (REBUILD-DPA T2): the ONLY driver for a children's / COPPA / FERPA / Recital 38 / GDPR Article 8 module is the record establishing children's data in the data categories. Do NOT draft a children's-data module (or any COPPA/FERPA content, or a Recital 38 / Article 8 rationale) on any other basis — including "the services could conceivably involve minors" or "in the event children's data is collected in future". Likewise, do NOT draft an AI/ML-training scenario, HIPAA BAA / PHI content, or GLBA/FCRA content unless the record establishes the corresponding sector (services describe model training / ML training / inference platform for the AI clause; hasHealthData true for HIPAA; hasFinancialData true for GLBA/FCRA). The record is the ONLY basis for any sector-specific module. If the record is silent, the document is silent on that module — no hedged, "in the event", or "should the Processor…" alternative-scenario clauses. Speculative-clause content in prose is a deterministic HARD violation and will regenerate the document.
- DRAFTING-NOTE DISCIPLINE (REBUILD-DPA T3, recast per COUNSEL-VOICE-1): every sentence inside an operative clause, sub-clause, definition, schedule entry, or annex body asserts a record fact or a drafted obligation. Reasoning, inference, role doubts, legal-form analyses, framework choices, and consistency observations DO NOT belong inside operative text. Their only homes are (i) recitals in Section 1 (Parties and Recitals), or (ii) a single inline advisory sentence placed immediately after the party identification or the affected recital, using a canonical close — "<specific fact + assumption>; further clarification is advisable." for record ambiguity, or "<specific fact + assumption>; further internal investigation is advisable." for internal facts. NEVER emit a "NOTE FOR LEGAL REVIEW:" heading or block; the retired heading is prohibited anywhere in the output. Inside recitals and advisory sentences, refer to the intake as "the record"; never say "the intake data", "the questionnaire", "the input", or "the form".
- FF-DPA nd2 — ENGAGED-STATES DISCIPLINE (HF1 Task 1 tightened, recast per COUNSEL-VOICE-1): US state privacy statutes (CCPA/CPRA, VCDPA, CTDPA, Colorado Privacy Act, TDPSA, FDBR, Washington MHMDA, Illinois BIPA, Oregon CPA, Indiana/Iowa/Tennessee/Montana/Minnesota/Utah/Delaware acts, New York SHIELD Act, Massachusetts DPA) may only be asserted as OPERATIVE where the corresponding state appears in the engaged US states derived from the record (controllerJurisdiction / processorJurisdiction). Do NOT enumerate or summarise statutes beyond the engaged states in ANY form — including inside a definitions block, an obligations mapping, a purpose-scope clause, or trailing an "and any other applicable state privacy laws" savings tail. The only permitted homes for a non-engaged state's statute mention are (i) an explicitly comparative sentence within an operative clause ("unlike the CCPA, …"), (ii) a Recital or a labelled Comparative Appendix, and (iii) a single inline advisory sentence using a canonical close ("<specific fact + assumption>; further clarification is advisable."). A savings clause is permitted ONLY in its canonical generic form — "The Processor shall comply with all applicable state privacy laws" — with NO enumerated state names or statute abbreviations. Emitting a non-engaged state statute anywhere else in operative text (including definitions, obligations blocks, and general-applicability sentences that name the statute) is a deterministic HARD violation and will regenerate the document.
- HF1 Task 2 — SUB-PROCESSOR AUTHORISATION SCOPE: where the record's Sub-processors field states "None — the Controller has confirmed on the record that no sub-processors are engaged for the Services", the DPA must draft the sub-processor section to state that no sub-processors are engaged as of the Effective Date and that any future engagement requires the Controller's prior specific written authorisation obtained before the engagement commences. Do NOT draft a general-authorisation framework, a Schedule 1 / Schedule A list-of-sub-processors, a notice-with-objection right against a pre-authorised list, or any prose that presupposes an existing list — those clauses are prohibited for this configuration. Emitting a Schedule-1 list-of-sub-processors or general-authorisation framework when the record confirms no sub-processors are engaged is a deterministic HARD violation and will regenerate the document.
- HF1 Task 3 — ADDITIONAL FRAMEWORK FIDELITY: every framework listed in "Additional frameworks named on the record" above MUST be addressed in the document. If the drafter has verified anchors for the named framework, incorporate its material obligations in the appropriate operative clause and cite by section number only. If the drafter does not have verified anchors, add an ADVISORY recital in Section 1 in the exact form (recast per COUNSEL-VOICE-1): "The record names {named framework} as applicable to this processing, and this DPA has not incorporated {named framework}-specific obligations because verified anchors for {named framework} are not on the record; further clarification is advisable." Follow that recital with a "[TO BE COMPLETED: confirm obligations under {named framework}]" pointer sited in the clause the framework would most naturally engage. Never silently substitute another framework for a named one, never drop a named framework from the analysis, never re-name a framework the record supplies verbatim, and NEVER emit "NOTE FOR LEGAL REVIEW" headings or direct the reader to counsel.
- FF-DPA nd3 — GEOGRAPHIC-SCOPE / MARKET RECORD-GROUNDING (recast per COUNSEL-VOICE-1): every geographic-scope or market characterisation the document makes (e.g. "the Parties operate primarily in the EU", "the Processor's customer base is predominantly US", "cross-border transfers are limited to EEA↔UK flows", "operations are concentrated in [region]") must be traceable to a specific field of the record — the Parties' jurisdictions, the services description, or the data-categories entries. If the record does not supply the basis, the document is silent on that scope characterisation or states the unresolved fact in an inline advisory sentence with a canonical close (e.g. "The record does not establish the Parties' primary market; further clarification is advisable."); the drafter may not infer market or operational-scope facts from priors, general knowledge, or the sector name.
- Use professional legal drafting conventions throughout
- CONTROLLER/PROCESSOR ROLE VERIFICATION (recast per CV1-ALL): Before drafting, assess whether the stated Controller-Processor relationship is accurate for the described services. For the following sectors and service types, the model may not be a simple processor — add a Section 1 recital noting the role determination in advisory voice: (a) AdTech/programmatic advertising — the ad tech vendor may be an independent controller or joint controller for audience data, bidding decisions, or cross-client profiling; (b) Data brokers/data enrichment — the data broker typically acts as an independent controller, not a processor; a DPA may be insufficient and a controller-to-controller data sharing agreement may be more appropriate; (c) AI/ML model training — if the Processor uses the Controller's data to train models benefiting other clients, it may be acting as an independent controller for that purpose; (d) Social media platforms — platform-level data use for targeting, analytics, or product improvement may constitute independent controllership. For each of these sectors, add a recital in Section 1 in this exact form: "The Parties acknowledge that the role characterisation of [Processor name] as a processor under GDPR Article 28 has been assumed for the purposes of this DPA on the basis that [Processor name] processes Personal Data only on the Controller's documented instructions for the Services described herein; further clarification is advisable." Never direct the reader to counsel and never emit "NOTE FOR LEGAL REVIEW" headings.
- Be specific – avoid vague obligations
- Where enforcement context shows regulators have penalised absent or vague provisions, make those provisions explicit and detailed
- Mark any fields requiring controller/processor input as [TO BE COMPLETED: description]
- PLACEHOLDER NEUTRALITY: a [TO BE COMPLETED: …] placeholder describes WHAT to supply, never a suggested value. Do NOT embed example values or "e.g. …" inside a placeholder (no "[TO BE COMPLETED: key rotation frequency, e.g. 12 months]"). Write "[TO BE COMPLETED: key rotation frequency]". This applies to retention periods, backup/rotation frequencies, remediation timeframes, and all numeric or duration fields. Likewise, do not state a specific encryption standard, retention period, or timeframe as the drafted value unless the intake supplies it — mark it [TO BE COMPLETED]. The ban covers a suggested value in ANY form, not only "e.g.": do NOT write "recommended", "at minimum", "at least", "typically", "commonly", or a stated range inside a placeholder. "[TO BE COMPLETED: notice period, at minimum 30 days is recommended]" and "[TO BE COMPLETED: resolution period — commonly 15–30 days]" are BOTH prohibited; write "[TO BE COMPLETED: notice period]" and "[TO BE COMPLETED: resolution period]". A placeholder names what to supply and stops there.
- ACCOUNTABILITY-MINIMUM EXCEPTION (narrow): the only fields exempt from PLACEHOLDER NEUTRALITY are retention periods for records that exist SOLELY to demonstrate GDPR Art. 5(2) accountability — specifically (a) the processor's retention period for records of controller instructions, and (b) the retention period for sub-processor due-diligence records. For these two fields only, draft a deterministic minimum directly into the clause rather than a placeholder: "for the duration of this DPA and for a period of at least three (3) years thereafter, or such longer period as is required by applicable law." Do NOT extend this exception to any other field — commercial/operational terms (audit-cost allocation, remediation timeframes, RTO/RPO, password policy, backup frequency, key-rotation frequency, access-review frequency, vulnerability-scanning frequency, account-deprovisioning timeframe) remain governed by PLACEHOLDER NEUTRALITY with no drafted value.
- POST-DPA-FIX-1 T4(a) PROFESSIONAL-DEFAULTS EXCEPTION (industry-standard technical/operational defaults, narrowly scoped): for the ENUMERATED field list below, draft a concrete professional default into the operative text and mark it "(default — confirm)" to invite Party review. This exception COEXISTS with PLACEHOLDER NEUTRALITY (which continues to govern every other numeric or duration field) and does NOT license drafting defaults for fields outside this enumeration. The enumeration is exhaustive; anything not listed here remains a [TO BE COMPLETED] placeholder.
  ENUMERATED DEFAULTS:
  (i) Encryption in transit — "TLS 1.2 or higher (TLS 1.3 recommended where supported) (default — confirm)".
  (ii) Encryption at rest — "AES-256 or an equivalent industry-standard algorithm (default — confirm)".
  (iii) Business-continuity / disaster-recovery test frequency — "at least annually (default — confirm)".
  (iv) Vulnerability-scan frequency for internet-facing systems — "at least quarterly, with critical findings remediated per the Processor's documented severity policy (default — confirm)".
  (v) Sub-processor objection resolution period — "thirty (30) days from the Controller's written objection notice (default — confirm)".
  (vi) Breach-notification forwarding period from Processor to Controller — "without undue delay and in any event within seventy-two (72) hours of the Processor becoming aware, so as to enable the Controller to meet its GDPR Art. 33 obligation to the supervisory authority; for personal-data breaches likely to result in a high risk to individuals, the Processor shall forward notification without undue delay so the Controller can meet Art. 34 (default — confirm the forwarding window)".
  (vii) DPIA / Art. 35 assistance response period — "within thirty (30) days of the Controller's written request, or such shorter period as is reasonably necessary to allow the Controller to complete a DPIA under GDPR Art. 35 (default — confirm)".
  (viii) Access-review frequency for Processor personnel — "at least quarterly (default — confirm)".
  (ix) Account-deprovisioning timeframe on personnel departure or role change — "within twenty-four (24) hours of termination or role change (default — confirm)".
  FORMAT: the "(default — confirm)" marker appears once per clause where the default is drafted; do NOT wrap the default in "[TO BE COMPLETED: …]" — the default is drafted content, not a placeholder. The Parties may replace any default with their own value at execution.
  DEFAULTS ARE NOT COMPLIANCE FLOORS: the marker "(default — confirm)" carries no representation that the default is sufficient for the Parties' specific facts; the surrounding operative language remains the binding obligation.
- PROPORTIONATE ASKS — NO PLACEHOLDER FOR A RESOLVED FACT (R1b2 rule 2b): a fact the PARTIES block supplies with a populated value (controller name, controller jurisdiction, processor name, processor jurisdiction, services description, data categories, retention description, sub-processor presence and named list where supplied, audit-rights level, transfer-clause inclusion flag, transfer mechanism where transfer clause is included, document-type framework) is a RESOLVED input for this run and MUST NOT be re-emitted as a [TO BE COMPLETED: …] placeholder in any clause, schedule, or annex — draft the supplied value into the operative text using the drafting register the surrounding rules require. Legitimate [TO BE COMPLETED: …] placeholders are (i) genuinely absent fields the intake structurally does not carry (effective date, notice addresses, principal-agreement identification, categories and approximate volume of data subjects, per-sub-processor location and role where only the list is supplied, per-vendor SCC module selection, per-recipient onward-transfer safeguards, security-control specifics that PLACEHOLDER NEUTRALITY forbids drafting inline), and (ii) fields governed by the ACCOUNTABILITY-MINIMUM EXCEPTION only where that exception applies. This rule sits alongside — not in place of — the PLACEHOLDER NEUTRALITY and ACCOUNTABILITY-MINIMUM EXCEPTION rules above, which are unchanged and continue to govern the SHAPE of any placeholder the drafter does emit; it addresses only the antecedent question of WHEN a placeholder is legitimate at all.
- CONTRACTUAL VOICE, NOT ADVICE: every operative sentence in the DPA binds or obligates the Parties or states a representation — it never advises the reader what they "should" do. Do NOT write "the Parties should confirm…", "the Controller should assess…", or "the Parties should consult…". Use "The Parties shall confirm…", "The Controller shall assess…", or a representation ("Each Party represents that…"). Use a single, consistent modal within a clause — do not mix "shall verify" in one sentence with "should consult" in the next for the same obligation. Where a genuine pre-execution verification is needed, express it as an obligation ("The Parties shall verify […] before execution"), never as advisory guidance.
- SPECIAL-CATEGORY DATA — INADVERTENT INCLUSION IS NOT A DPA AMENDMENT EVENT: where the data categories clause states the categories do not include Article 9 special category data "on their face," do not impose a blanket requirement that the DPA be amended in writing before the Processor may act on special category data that is inadvertently included (e.g. appearing in free-text support records). Instead: the Controller represents it does not intend special-category-data transfer under this DPA; if special-category processing is INTENDED, the DPA must be amended before that processing begins; but INADVERTENT inclusion does not void the DPA and must be handled per the Controller's documented instructions, including immediate deletion where instructed. Draft the clause to reflect this distinction rather than a single blanket amendment requirement.
 - POST-DPA-FIX-1 T4(b) ARTICLE 9 IS NOT A GENERAL OBLIGATIONS BASIS: GDPR Article 9 states the PROHIBITION on processing special categories of personal data and enumerates the derogating CONDITIONS in Art. 9(2)(a)–(j). It is NOT an ongoing-obligations regime and MUST NOT be cited as the anchor for continuing controller/processor duties, accountability, security-of-processing, or contractual undertakings. Wherever a clause anchors an ongoing obligation (records of processing, security measures, accountability, processor duties, contract elements, breach notification, DPIA-assistance, oversight rights), cite the operative provision: Art. 28(3) and its subparagraphs for processor-contract elements and duties; Art. 5(2) with Art. 24 for accountability; Art. 32(1) for security of processing; Art. 33/34 for breach notification; Art. 35 for DPIA (with Art. 35(3)(b) only where large-scale Art. 9 or Art. 10 data is actually processed). If a clause discusses special-category processing on the merits, cite Art. 9 to STATE the prohibition/condition, then cite the operative provision (typically Art. 28(3) and Art. 5(2)/24) for the continuing obligation. NEVER pair "as part of the Controller's obligations under Article 9 GDPR" with an ongoing-duty clause; the correct anchoring is "under Article 28(3) [and, where accountability is engaged, Article 5(2) and Article 24]".
 - PF6 T4 ART. 9(1) BIOMETRIC "UNIQUELY IDENTIFYING" QUALIFIER — INTAKE-FACT DISCIPLINE: GDPR Art. 9(1) covers biometric data ONLY where it is processed "for the purpose of uniquely identifying a natural person." This purpose is NOT a property of the data itself — plain "biometric data" listed as an intake category (e.g. voiceprints for a call-quality product, face images for a photo-tagging feature, fingerprints for a device-unlock feature) does NOT by itself establish the uniquely-identifying purpose required to bring the data within Art. 9(1). NEVER assert as a client fact that biometric data is processed "for the purpose of uniquely identifying natural persons" — or any equivalent phrasing that treats the Art. 9(1) qualifier as established — unless the intake ITSELF (data-category description, purposes-of-processing text, or an explicit qualifier field) supplies that purpose in terms. Where the intake lists biometric data without an established uniquely-identifying purpose, phrase the DPA clause conditionally: "to the extent any biometric data listed above is processed for the purpose of uniquely identifying natural persons within the meaning of GDPR Article 9(1), the Article 9 prohibition and the Article 9(2) conditions apply, and the Parties will confirm the applicable Article 9(2) condition and any additional safeguards required before that processing begins." This conditional framing applies wherever biometric data appears — in the special-categories clause, the DPIA-assistance clause, the security clause, and any other section that would otherwise assert Art. 9(1) engagement as a settled fact.
- POST-DPA-FIX-1 T4(c) SCC MODULE / ROLE CONSISTENCY VALIDATION: before drafting any SCC-incorporating clause, VALIDATE that the intake's stated SCC module matches the actual party relationship this DPA governs. Module mapping under Commission Implementing Decision (EU) 2021/914: MODULE ONE = Controller-to-Controller; MODULE TWO = Controller-to-Processor; MODULE THREE = Processor-to-Processor (Processor-Sub-processor); MODULE FOUR = Processor-to-Controller. This DPA is a controller-processor instrument, so the direct-transfer module is MODULE TWO. If the intake specifies a module INCONSISTENT with the actual relationship (e.g. "Module 1 Controller-to-Processor", which is internally contradictory; or "Module 1" while the DPA governs a controller-processor relationship; or "Module 2" while the exporter is a processor and Module 3 would apply), the generator MUST (a) DRAFT USING THE CORRECT MODULE for the actual relationship — Module 2 for a controller-to-processor direct transfer, Module 3 where the exporter is itself a processor and the importer is a further processor — and (b) INSERT a drafting note in the transfer clause in the exact form: "Drafting note: the intake designation for the SCC module is [intake value], which is inconsistent with the [controller-to-processor / processor-to-processor] relationship governed by this DPA under Commission Implementing Decision (EU) 2021/914. This clause uses [Module 2 (Controller-to-Processor) / Module 3 (Processor-to-Processor)] to match the actual party roles; the Parties shall confirm the intake designation before execution." NEVER propagate an intake-supplied module designation that is legally inconsistent with the parties' actual roles into the operative agreement. This rule OVERRIDES any earlier "use the intake's stated module verbatim" instruction where the intake designation is legally inconsistent — verbatim propagation applies only when the intake designation is internally consistent with the parties' roles.

- LIABILITY-CAP FALLBACK CLAUSE: where the liability-cap field is a [TO BE COMPLETED] placeholder deferring to the Principal Agreement, also state the fallback position if the Principal Agreement does not address data-protection liability: e.g. "Where the Principal Agreement does not address limitations applicable to data protection obligations, liability under this DPA shall be [TO BE COMPLETED: unlimited / capped at [X] times annual fees / as otherwise agreed by the Parties]." Do not leave the fallback scenario entirely unaddressed.
- LEAD SA QUALIFICATION: when the Annex names a supervisory authority (e.g. CNIL) as competent for the controller, do not state it is unqualifiedly "the lead supervisory authority" without noting the Art. 55/56 basis: "Where [Controller]'s main establishment is in [Member State] and the processing is cross-border, [authority] will typically be the lead supervisory authority under Article 56 GDPR; the Parties should confirm the lead authority determination if the controller has establishments in other EU Member States."
- NO UNVERIFIED CONCLUSIONS: do not assert a conclusion the intake cannot support — e.g. "No legal form mismatch is identified" or "the registration is current". Where a fact (registered seat, legal form, sub-processor location, transfer mechanism) is not established by the intake, state that the Parties must verify it before execution rather than concluding its status.
- NO ENFORCEMENT FROM MEMORY — AND NO INTAKE META-COMMENTARY IN THE INSTRUMENT: do not assert that a regulator has taken enforcement action, issued decisions, or imposed penalties — neither a specific case nor a general characterisation such as "German regulatory authorities have issued significant enforcement decisions penalising…" — unless that action is supplied in the intake. Recitals must not describe a regulator's enforcement record from training knowledge. State the legal obligation itself and, where motivation is needed, note that the Parties should consult the regulator's published enforcement record — do not present enforcement history, specific or general, as fact. The ABSENCE of enforcement or intake material is never stated in the document either: a recital or clause never reports what the intake did or did not provide ("No specific enforcement precedents have been provided in the intake materials" is a fatal output error — it is generator meta-commentary inside an executable instrument). Recitals state only facts about the Parties, the Services, the purposes, and the governing framework. Where the intake supplies nothing on a topic, the document is silent on that topic or carries a [TO BE COMPLETED: …] placeholder — never a report about the intake.
- NON-EEA PARTIES ON A GDPR FRAMEWORK SAY WHY: where neither Party is established in the EEA or the UK but the DPA is drafted on the GDPR Article 28(3) framework, the Legal Framework section must state the design rationale in one sentence so the framework choice and the applicability statement cannot read as contradictory: "Although neither Party is currently established in the EEA or the UK and the EU GDPR does not, on its face, engage, this DPA adopts the GDPR Article 28(3) framework as its contractual baseline standard; its GDPR-derived provisions apply as contractual obligations between the Parties, and additionally as statutory obligations if and to the extent the processing comes within the scope of the EU GDPR or UK GDPR (including under Article 3(2))." Never assert facial non-applicability and then deploy the full GDPR structure without this baseline-standard sentence. REBUILD-DPA T1c SCOPING: this baseline-standard sentence is emitted ONLY in a GDPR-mode draft (Legal framework = GDPR, or a dual-EU mode) where neither Party maps to the EEA/UK. It MUST NOT appear in a us-state, canada, or non-GDPR draft — the model must not use it as cover when the record establishes a non-GDPR framework. Where the record affirmatively selects or implies a non-GDPR framework, follow the record; do not import GDPR baseline language.
- OPERATIVE VOICE ONLY: every sentence inside a clause, schedule, or annex is contract language — an obligation, representation, warranty, acknowledgment, definition, or condition. Rationale is expressed through the Parties' voice ('The Processor acknowledges that documented vendor due diligence and ongoing oversight are necessary to …', 'The Processor represents and warrants that …'), NEVER as a compliance advisory or drafter's note. 'The absence of X is a material compliance risk under Article 5(1)(e)' and 'This measure is required to address the risk of …' are fatal voice errors inside operative text. Where a risk observation has no operative home, it becomes a [TO BE COMPLETED: …] instruction to the Parties or is omitted — the executed document argues nothing; it binds.
- DATA-SUBJECT REMEDY CARVE-OUT: where the agreement contains an exclusive-jurisdiction or governing-law clause, include a clause preserving data subjects' rights under GDPR Article 79(2) to bring proceedings in the courts of their habitual-residence Member State, and state that the exclusive-jurisdiction clause governs disputes between the Parties only. Where any transfer to or processing in the UK is possible, note that the UK is a separate third country requiring its own transfer mechanism (UK adequacy, IDTA, or the UK Addendum) assessed separately from EU transfers.
- SCC INCORPORATION LANGUAGE: do not state that the EU SCCs are 'incorporated in the DATA TRANSFERS section' — the DATA TRANSFERS section describes WHEN SCCs are required and references the annex/schedule for execution; the clauses themselves are not attached or executed as part of the generated draft. Use: 'Transfer mechanisms pursuant to the DATA TRANSFERS section of this DPA, including EU Standard Contractual Clauses where required,' and clarify that SCCs must be separately executed for each onward transfer in accordance with the DATA TRANSFERS section — do not imply the SCCs are already incorporated by reference alone. THE FULL SCC-INCORPORATION SENTENCE APPEARS EXACTLY ONCE IN THE DOCUMENT, wherever the incorporation-by-reference caveat is first stated (typically in the incorporation-by-reference sub-clause of the DATA TRANSFERS section). Do NOT emit the sentence "Transfer mechanisms pursuant to this section, including EU Standard Contractual Clauses where required, must be separately executed for each onward transfer in accordance with this section — the EU SCCs are not incorporated into this DPA by reference alone" (or any substantive paraphrase of it) in two consecutive sub-clauses, in the same sub-clause twice, or in both the DATA TRANSFERS section and any subsequent Schedule that cross-references it. Subsequent references cross-reference the incorporation-by-reference sub-clause by its actual sub-clause number in this draft (e.g. "as set out in Section [N].[m] of this DPA") rather than restating the sentence. A verbatim or near-verbatim second emission of this sentence is a fatal duplication defect equivalent to the sub-processor note defect governed by "REPEATED CONTENT APPEARS ONCE".
- UK ADEQUACY IS CURRENT, NOT A VERIFICATION TASK: the EU's adequacy decisions for the United Kingdom, adopted 19 December 2025, are in force and valid until 27 December 2031. State this as a settled fact ('...are in force as of the Effective Date and remain valid until 27 December 2031, subject to any subsequent withdrawal or suspension'), not as an open item requiring the Parties to 'verify continued validity' — that phrasing manufactures uncertainty where the decision's term is already fixed and known.
- UK IDTA DIRECTIONALITY (CORRECTED): the UK IDTA (or the UK Addendum to the EU SCCs) is a UK GDPR Article 46 safeguard for restricted transfers FROM the United Kingdom to destinations not covered by UK adequacy regulations. It is NEVER required for transfers from the EEA to the UK — those transfers proceed under the European Commission's adequacy decision for the UK while it remains in force, and inbound transfers are not restricted transfers under UK GDPR. State: 'The UK IDTA (or the UK Addendum to the EU SCCs) applies to transfers of personal data from the United Kingdom to third countries not covered by UK adequacy regulations, including onward transfers by UK-established recipients or sub-processors; it does not apply to transfers from the EEA to the United Kingdom, which are governed by the European Commission's adequacy decision for the UK.' Never state or imply that an IDTA or UK Addendum may be required for an EEA-to-UK transfer.
- NO REDUNDANT THIRD-COUNTRY RESTATEMENT: if the DATA TRANSFERS section already addresses the UK's third-country status and adequacy coverage, do not repeat the same statement in the governing-law section (or any other section). State it once, in the transfer-provisions section, and cross-reference from elsewhere if needed — do not restate substantively identical transfer-status language in two places.
- US SUB-PROCESSOR TRANSFER GUIDANCE: where a named sub-processor's location or corporate domicile in the intake indicates a likely US establishment, add to the transfer-mechanism NOTE (without filling in the placeholder itself): 'For Sub-processors headquartered or processing in the United States, verify whether they participate in the EU–US Data Privacy Framework (Article 45 adequacy) or whether EU SCCs Module 3 is required; the applicable mechanism must be documented before execution.' This guides the user's verification without asserting which mechanism applies — the placeholder itself remains [TO BE COMPLETED]. THE NOTE APPEARS EXACTLY ONCE, as a standalone note immediately before the sub-processor table; the table's Transfer Mechanism entries carry only the [TO BE COMPLETED] placeholder and a short cross-reference ('see note above') — never a restatement of the note text IN ANY WORDING — a closing paragraph that paraphrases the note ('The Parties shall verify each sub-processor's participation status… the note above applies to all listed sub-processors') is the same defect as a verbatim duplicate (see REPEATED CONTENT APPEARS ONCE in the core).
- GERMAN SUPERVISORY AUTHORITY PRECISION (SUPERVISORY AUTHORITIES ONLY): Germany has 17 state-level supervisory authorities (16 Länder plus the federal BfDI for specific sectors). Do not state 'the competent German supervisory authority' as if there is one national authority. State: 'The competent supervisory authority for [German entity] shall be [TO BE COMPLETED: the German state data protection authority (Landesdatenschutzbehörde) with jurisdiction over the entity's registered seat — complete after the entity's registered-seat placeholder earlier in this Agreement is finalised].' Where a placeholder depends on the completion of an earlier placeholder, it says so and names the location — a placeholder must never request information the user cannot supply until another field is completed without stating that dependency. If a lead supervisory authority for the overall controller-processor relationship has already been established elsewhere in the document (e.g. CNIL for a French controller), distinguish that from the German sub-processor's own state-authority registration. THIS PRECISION APPLIES ONLY TO SUPERVISORY-AUTHORITY IDENTIFICATION — never to governing-law or forum clauses. German contract and data-protection law is federal: a governing-law clause states 'the laws of the Federal Republic of Germany' definitively with NO Land-law hedge and NO pre-execution confirmation instruction, and a jurisdiction clause states 'the courts of Germany, with specific jurisdiction determined in accordance with the Zivilprozessordnung (ZPO) having regard to the Parties' registered seats' rather than inviting the Parties to confirm a court.
- BC/DR TEST-RESULT RETENTION: where the DPA requires a business continuity/disaster recovery plan tested at [TO BE COMPLETED: frequency], also require that test results be documented and retained for [TO BE COMPLETED: retention period] and made available to the Controller upon request. Do not leave test-result retention unaddressed when test frequency is already required.
- DRAFT STATUS NOTICE (recast per CV1-ALL): At the very top of the document, immediately after the title line "Your Custom DPA — [Controller] / [Processor]" and before the first recital, insert the following notice on its own line: "DRAFT — REQUIRED FIELDS INCOMPLETE — DO NOT SIGN OR RELY ON THIS DOCUMENT UNTIL ALL [TO BE COMPLETED] FIELDS HAVE BEEN REVIEWED AND COMPLETED." This notice must appear in every generated DPA regardless of how many placeholders remain. Do NOT append "by qualified legal counsel" or any counsel-referral clause — the hard-blank/draft-status protection is preserved by the [TO BE COMPLETED] fields themselves.
- PRE-EXECUTION TASKS ARE NOT OPERATIVE TERMS: an executed instrument never instructs the Parties to perform a verification 'before execution of this DPA' inside its own operative text — the document cannot condition its own execution on tasks stated within it. Where a fact must be established before signature (the competent supervisory authority for a registered seat, a sub-processor's Data Privacy Framework participation), the clause carries a [TO BE COMPLETED: …] placeholder naming the fact and how it is determined, and any verification instruction lives in a schedule header note — never in a clause, recital, or annex body. A pre-execution instruction appearing more than once for the same fact is additionally a repetition defect.
- ALTERNATIVES ARE SELECT-ONE PLACEHOLDERS: mutually exclusive substantive alternatives are never left in executed text separated by slashes ('unlimited / capped at a specified multiple of annual fees / as otherwise agreed'). Present them as a single select-one placeholder: '[TO BE COMPLETED: select one — (Option A) unlimited; (Option B) capped at [amount or multiple]; (Option C) as set out in the Principal Agreement — delete the options not selected].' Slash-separated alternatives in an operative clause are a drafting defect.
- DEFERRED COMPLIANCE-CRITICAL PERIODS CARRY THEIR CONSTRAINT: where a notification or assistance period is deferred to the Parties and a statutory deadline depends on it (e.g. the Processor's obligation to pass on data subject requests, which feeds the Controller's Article 12(3) one-month response deadline), the placeholder states the governing constraint without supplying a value: '[TO BE COMPLETED: notification period — must be short enough to enable the Controller to meet its Article 12(3) one-month response deadline]'. Never a bare '[TO BE COMPLETED: notification period]' where a statutory clock depends on the term, and never a supplied default value. THE ARTICLE 12(3) ANNOTATION ATTACHES ONLY to periods that feed the Controller's data-subject-request response deadline (the Processor's obligation to pass on or assist with data subject requests). DPIA-assistance periods, audit-response periods, and breach-notification periods each carry their OWN governing constraint where one exists (e.g. Article 33(2) 'without undue delay' for breach notification) or a plain '[TO BE COMPLETED: response period for [the assistance type]]' placeholder where none does — never the Article 12(3) annotation.
- RETENTION-SHAPE RENDERING (CEO ruling 2026-07-14): the "Retention:" field in the PARTIES block above carries ONE of exactly three shapes; render clause 2.6 (Duration / Retention) and the Schedule 2 / Annex I.B retention-period cross-reference accordingly, and do not conflate the two non-fixed shapes with the fixed one: (a) "As directed by the Controller's documented instructions" — clause 2.6 states the Processor retains Personal Data only for the period the Controller's documented instructions require and destroys or returns it in accordance with clause 8; Schedule 2 retention-period entry reads "As set out in clause 2.6 of this DPA (retention governed by the Controller's documented instructions)"; do NOT substitute a numeric duration in either place. (b) "For the duration of the principal agreement, then delete or return" — clause 2.6 states retention runs for the term of the Principal Agreement and Personal Data is deleted or returned in accordance with clause 8 at termination; Schedule 2 entry reads "As set out in clause 2.6 of this DPA (duration of the Principal Agreement, then deletion or return)"; do NOT emit a numeric duration. (c) "Fixed period: <duration>" — clause 2.6 states the fixed duration verbatim from the intake as an operative term and cross-references clause 8 for the deletion/return trigger; Schedule 2 entry reads "As set out in clause 2.6 of this DPA (<duration> from the event defined therein)" substituting the same duration; the event that starts the clock remains a [TO BE COMPLETED: …] placeholder per the event-defined retention-triggers rule below. Never emit the same retention question in two places — clause 2.6 is the source of truth and Schedule 2 cross-references it.
- Include an annotations array listing every enforcement case from the ENFORCEMENT CONTEXT above that informed a clause choice. Use the exact id value from each case (the value after 'id:'). Only cite cases from the ENFORCEMENT CONTEXT above — never from training knowledge.

CRITICAL DRAFTING RULES — NON-NEGOTIABLE:
- NO SELF-CORRECTIONS, VERIFIED CROSS-REFERENCES: never emit a bracketed or inline self-correction ('[correction: …]', 'that is to say, Section N') — resolve the correct reference internally and write it once. Before emitting any internal cross-reference ('see Section N', 'as set out in Section N'), verify N against the section titles actually present in this document; a cross-reference to a section number whose title does not match the referenced subject is a defect. Where assistance obligations span multiple sections, enumerate all of them ('Sections 6, 8 and 9') rather than a stale pair.
- PROCEDURAL ROLES ARE CONSISTENT ACROSS SECTIONS: where one section establishes a procedure with defined party roles (e.g. the Processor notifies of new Sub-processors and the Controller may object), every later reference to that procedure preserves those roles — never emit a later clause granting a different party a unilateral right the procedure section does not give it (e.g. 'the Controller may update Schedule A' where Section 7 makes the Processor the notifying party). Before emitting any 'Party X may [update/modify/approve]' sentence that references another section, verify the referenced section actually assigns that power to that Party.
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
- SUBCLAUSE PARALLEL STRUCTURE AND ECONOMY: items in an enumerated list share one grammatical form (all noun phrases: 'A description of…', 'The name and contact details of…' — never one bare-verb item among noun phrases); a clause never cross-references the section it is already inside (e.g. 'in accordance with this Section N' from within Section N); and qualifier phrases that add no operative precision ('as part of an intended programme of processing') are omitted.


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
- Then, on a new line, output the exact separator:
===DRAFTING_RECORD===
- Then, output a JSON object recording the deliberations behind the drafting choices in this document. This block is a private record retained on the assessment; it is NOT shown to reviewers, graders, or end users. Its purpose is to make future revisions traceable. Use this shape:
{
  "framework_selection": "one sentence: why this documentType/framework was used given the intake jurisdictions",
  "module_selection": "one sentence: which SCC / IDTA / addendum module(s) were selected and why (or 'n/a' if no transfer mechanism applies)",
  "clause_deviations": [
    { "clause": "clause number or heading", "choice": "the option taken", "reason": "one sentence why" }
  ],
  "open_placeholders": [ "short label of each [TO BE COMPLETED] placeholder deliberately left for the Parties" ],
  "enforcement_influence": "one sentence: how the enforcement context (if any) influenced clause choices — or 'no enforcement influence'"
}
- If no deviations or open placeholders exist, use empty arrays. Never place operative contract text, party-facing commentary, or apology language inside this block; it is a drafting record only.


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
If a detected mismatch exists between the entity's legal form and the stated incorporation jurisdiction, include an ADVISORY recital in Section 1 (Parties and Recitals) immediately after the party identification — state the verification ask in advisory voice WITHOUT reasoning-chain analysis of the legal-form suffix, the "typically associated with" mapping, or an "appears inconsistent with" conclusion. Use exactly this template (substituting the party role, name, and jurisdiction verbatim from the record):
"The record identifies the [Controller/Processor] [name] with jurisdiction of incorporation stated as '[stated jurisdiction]'; further clarification is advisable."
Do NOT emit a suffix-decoding chain, a legal-form mapping table, an "appears inconsistent" phrasing, or a "NOTE FOR LEGAL REVIEW" heading anywhere in the recital.
12b. PRODUCT-FIX-4 T4 DRAFTING-NOTE VOICE — CONCLUSION AND CORRECTION ONLY: every drafting note in the DPA (the entity-form verification recital, the T4(c) SCC module-correction note, any other note appended to a clause) states the conclusion and the correction ONLY — never a reasoning chain, never linguistic inference, never a "the suffix X (Y form), a form associated with countries Z…" narration, never a "because …, as therefore …" chain, never a parenthetical suffix-decode. Compliant example (SCC module correction): "Drafting note: Module Two (Controller-to-Processor) applies; the intake's Module One designation was corrected accordingly; the Parties shall confirm before execution." Non-compliant example (BANNED): "the suffix 'AG' (Aktiengesellschaft), a form associated with Germany, Austria, and Switzerland; as the record states…". The verification recital template at rule 12 above is the ONLY permitted form for entity-form notes — do not embellish it with inferential prose.
13. CHILD-NUMBERING DISCIPLINE (2.4a). A heading number is never reused by its own child items — children of a numbered heading are numbered heading.1, heading.2, …
14. SUB-PROCESSOR VERIFICATION CONSOLIDATION (2.4b). Where the same verification instruction applies to every listed Sub-processor, state it once in a closing subsection covering all of them instead of repeating verbatim per entry.
15. FORMAL CONTRACT LANGUAGE ONLY (2.4c). Headings and body use only formal contract language — no meta-commentary headings. Do NOT emit any heading of the form "Transfer Status — No Redundant Restatement" or any similar meta-commentary. Replace such a heading with a formal cross-reference: "International Transfers. The international transfer provisions applicable to this DPA are set out in Section 8."
16. LEAD-SA SENTENCE (2.4d). "…this does not affect the competence of the German state DPA in respect of [Processor] as an establishment under German law."`;

    const GDPR_USER = `${PARTIES_BLOCK}
Legal framework: ${frameworkFor(documentType)}
${sectorFlags.isComplexRoleSector ? `
CONTROLLER/PROCESSOR ROLE ALERT — ${sectorFlags.complexRoleSectorName.toUpperCase()}
The services described suggest a ${sectorFlags.complexRoleSectorName} context where the Processor's role as a pure processor under GDPR Article 28 may be uncertain. Include in Section 1 (Parties and Recitals) the following recital:
"(D) The Parties acknowledge that the characterisation of ${body.processorName} as a data processor under GDPR Article 28 is based on the scope of the Services as described herein. Where ${body.processorName} processes Personal Data for purposes beyond the immediate Services — including but not limited to model training on aggregated data, cross-client audience profiling, or independent commercial use of Personal Data — such processing may constitute independent controllership and would not be governed by this DPA; further clarification is advisable."
` : ""}
Transfer clause: ${body.includeTransferClause ? body.transferMechanism : "Not required"}${transferBasis ? `\nTransfer clause basis: ${transferBasis}` : ""}

ENFORCEMENT CONTEXT
The following recent enforcement cases are relevant to this DPA. Ensure the provisions in the Security, Sub-Processor, and Audit sections specifically address the compliance failures documented in these cases:

${enforcementBlock}

Draft the complete DPA with ALL of the following sections, in this exact order and using the exact heading tokens shown (top-level headings are AUTHORITATIVE and are matched against the deterministic grader's DPA_REQUIRED_SECTIONS list — do NOT rename, reorder, merge, or split them). Number clauses hierarchically (1.1, 1.2, 1.2.1 etc.):

1. PARTIES AND RECITALS
2. DEFINITIONS — define at minimum: "Personal Data", "Processing", "Controller", "Processor", "Sub-processor", "Data Subject", "Personal Data Breach", "Services", "Applicable Data Protection Law". Draw defined-term meanings from GDPR Article 4 verbatim where applicable; do not paraphrase Article 4 definitions.
3. SUBJECT MATTER, NATURE, DURATION AND PURPOSE OF THE PROCESSING
4. DATA PROCESSING — PROCESSOR OBLIGATIONS (all eight Article 28(3) elements: instructions, confidentiality, security, sub-processors, assistance with rights, assistance with security/breach/DPIA, deletion/return, information/audit). The heading MUST begin with the literal tokens "DATA PROCESSING —" so the section is recognisable as the "Data Processing" section.
5. SUB-PROCESSING PROVISIONS (Articles 28(2) and 28(4)) — the heading MUST contain the literal token "SUB-PROCESSING" (with the hyphen and the "-ING" suffix). Include specific approval mechanism and notification timeline. The clause MUST state explicitly: "General authorisation under this clause applies ONLY to the Sub-processors listed in Schedule 1 at the Effective Date. All subsequent additions or replacements require prior written notice under the 30-day notice procedure set out in this clause." Use a 30-day notice window.
6. DATA SUBJECT RIGHTS ASSISTANCE (ARTICLES 12-23) AND DPIA ASSISTANCE — output this section heading verbatim, with a space between DPIA and ASSISTANCE. Never concatenate words in headings. The DPIA-assistance clause must reflect the actual processing: cite Article 35(3)(b) as the mandatory DPIA trigger ONLY if the data categories listed above include special category data under Article 9 (health/medical data, genetic data, biometric data used for unique identification, data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, data concerning sex life or sexual orientation, or criminal records/offences). For processing that does NOT involve Article 9 special category data, use a general DPIA-assistance clause without citing Article 35(3)(b): "To the extent any processing activities covered by this DPA are likely to result in a high risk to the rights and freedoms of natural persons (as assessed under GDPR Article 35), the Processor shall assist the Controller in conducting a Data Protection Impact Assessment."
7. SECURITY MEASURES (Article 32) – specify technical and organisational measures calibrated to the data categories listed above.
8. DATA TRANSFERS — INTERNATIONAL TRANSFER PROVISIONS — the heading MUST begin with the literal tokens "DATA TRANSFERS —". ${transferSection ? `Content directive for this section: ${transferSection.replace(/^\s*10\.\s*/i, "")}` : "Open this section with the following sub-clause: '8.1 The Controller and Processor acknowledge that any direct transfer of Personal Data between the Controller and the Processor within the European Economic Area does not constitute an international transfer under GDPR and requires no additional Article 46 safeguard. The transfer provisions in clauses 8.2 onwards apply only to any onward transfers of Personal Data by the Processor to sub-processors or other recipients located outside the EEA or the United Kingdom.' Then address third-country transfers from clause 8.2 onwards using the EU SCCs (Commission Implementing Decision (EU) 2021/914) or UK Addendum as applicable."}
9. RETURN OR DELETION OF PERSONAL DATA (Article 28(3)(g)) — the heading MUST contain the literal tokens "RETURN OR DELETION". MUST include an explicit clause stating that, at the Controller's choice, the Processor shall delete or return all Personal Data to the Controller after the end of the provision of services, and delete existing copies unless retention is required by law. Use the exact phrase "delete or return" and reference "Personal Data" within the same sentence.
10. DATA BREACH NOTIFICATION (Article 33) – the Processor MUST notify the Controller without undue delay and in any event within forty-eight (48) hours of becoming aware of a Personal Data Breach. Include minimum content requirements. Do NOT add any sentence explaining WHY the 48-hour window exists or how it relates to the Controller's own Article 33(1) obligation.
11. AUDIT AND INSPECTION RIGHTS – use ${body.auditRights} standard.
12. LIABILITY
13. TERM AND TERMINATION
14. GOVERNING LAW
15. GENERAL PROVISIONS

SCC MODULE PINNING (deterministic). This DPA governs a Controller-to-Processor relationship. Wherever the EU SCCs (Commission Implementing Decision (EU) 2021/914) are cited or incorporated, the applicable module for the direct Controller-to-Processor transfer is MODULE TWO (Controller-to-Processor). Onward transfers by the Processor to Sub-processors that are themselves processors of the Controller are governed by MODULE THREE (Processor-to-Processor). MODULE ONE (Controller-to-Controller) and MODULE FOUR (Processor-to-Controller) are inapplicable to this instrument and MUST NOT be cited, described, or implied in any transfer clause, schedule, or annex. If the intake's transferMechanism value specifies a module, the transfer-clause basis MUST use that same module verbatim — do not silently substitute a different module number.

[SIGNATURE BLOCK]

SCHEDULE 1 — APPROVED SUB-PROCESSORS (populate from intake; if none provided, output a blank Schedule 1 with column headers Name / Service / Location / Date Authorised and an instruction line "[TO BE COMPLETED: list approved Sub-processors here]")

${ANNOTATIONS_INSTRUCTIONS}`;

    // DPA-FIX-3 Task 1 — ENGAGED-STATES STATIC-TEMPLATE PRUNING.
    // Derive the engaged US states from the record here so the US and DUAL-EU-US
    // template blocks below can splice per-state content dynamically instead of
    // enumerating non-engaged state statutes. Non-engaged state statutes are
    // banned from operative text by FF-DPA nd2 (rule 658); the static
    // enumerations that previously appeared inline (§4.6 risk-assessment list,
    // §11 breach bullets, §929 savings tail, dual-mode legal-framework line
    // and dual-mode §11 breach block) are now filtered to the engaged set.
    // The generic savings tail is the canonical nd2-permitted form: "and any
    // other applicable state privacy laws" with NO enumerated statute names.
    const promptEngagedStates: string[] = Array.from(
      deriveEngagedStates([detected.ctrlCanonical, detected.procCanonical]),
    );
    const _has = (s: string) => promptEngagedStates.includes(s);
    const engagedListLine = promptEngagedStates.length
      ? promptEngagedStates.join(", ")
      : "(none identified from the record — no state-specific enumerations should be emitted)";
    // §4.6 risk-assessment enumeration: state → clause fragment.
    const _riskAssessMap: Record<string, string> = {
      California: "Cal. Civ. Code § 1798.185(a)(15) and CPPA risk-assessment regulations",
      Texas: "TDPSA § 541.109",
      Connecticut: "CTDPA § 8",
      Virginia: "VCDPA § 59.1-579",
      Colorado: "CPA § 6-1-1309",
      Oregon: "OCPA § 646A.574",
    };
    const _riskAssessBits = promptEngagedStates
      .map((s) => _riskAssessMap[s])
      .filter(Boolean);
    const riskAssessLine = _riskAssessBits.length
      ? _riskAssessBits.join("; ")
      : "as required by any applicable state privacy law";
    // §11 breach-notification bullets: filter to engaged states only.
    const _breachBulletMap: Record<string, string> = {
      California: `California: Processor shall notify Controller of any Data Breach impacting Personal Data of California residents "without unreasonable delay and in the most expedient time possible" after discovery. Do NOT impose a fixed 72-hour processor-to-controller window for California — Cal. Civ. Code § 1798.82 governs notification to individuals, not B2B processor timelines. The Controller is responsible for notifying the California Attorney General if 500+ California residents are affected.`,
      Texas: `Texas: notify Controller promptly; Controller notifies AG if 250+ Texans affected (Tex. Bus. & Com. Code § 521.053)`,
      Connecticut: `Connecticut: Processor shall notify Controller without unreasonable delay after discovery. Under Conn. Gen. Stat. § 36a-701b (Connecticut's breach notification statute — NOT the CTDPA, which does not set an independent breach notification timeline), the Controller must notify affected Connecticut residents "in the most expedient time possible." Controller notifies the CT AG simultaneously with individual notification. Do NOT state a 72-hour deadline for Connecticut — no such deadline exists in Connecticut law.`,
      Colorado: `Colorado: Processor shall notify Controller without undue delay; Controller notifies the Colorado Attorney General as required by C.R.S. § 6-1-716 (Colorado breach notification statute). Do NOT cite "CPA § 6-1-1309" for breach notification — the Colorado Privacy Act does not set breach notification timelines; those come from C.R.S. § 6-1-716.`,
      Virginia: `Virginia: Processor shall notify Controller without unreasonable delay after discovery. Under the VCDPA, the Controller must notify the Virginia Attorney General within 60 days when the breach affects more than 100,000 Virginia consumers (VCDPA 2024 amendment). Do NOT state a 72-hour notification deadline for Virginia — the VCDPA does not set one.`,
    };
    const _breachBullets = promptEngagedStates
      .map((s) => _breachBulletMap[s])
      .filter(Boolean)
      .map((b) => `    - ${b}`);
    const breachBulletsBlock = _breachBullets.length
      ? _breachBullets.join("\n")
      : `    - Apply the breach-notification timing of each state whose statute the engaged US states set (identified above) makes operative. Do NOT enumerate the timelines of states outside the engaged set.`;
    // §929 savings tail — canonical generic form per FF-DPA nd2.
    const consumerAccessSavingsLine = _has("California")
      ? `assist the Controller in responding to consumer access requests under Cal. Civ. Code § 1798.100 (CCPA) and equivalent provisions of any other applicable state privacy laws`
      : `assist the Controller in responding to consumer access requests under any applicable state privacy laws`;
    const consumerDeletionSavingsLine = _has("California")
      ? `assist the Controller in responding to consumer deletion requests under Cal. Civ. Code § 1798.105 and equivalent state provisions`
      : `assist the Controller in responding to consumer deletion requests under any applicable state privacy laws`;
    const optOutSavingsLine = _has("California")
      ? `pass through and honor any opt-out of sale/sharing signals under Cal. Civ. Code § 1798.120`
      : `pass through and honor any opt-out of sale/sharing signals required by applicable state privacy law`;
    const citeExampleSavingsLine = _has("California")
      ? `Cite the specific statutory provision (e.g. "Cal. Civ. Code § 1798.100(d)(1)") for each key obligation.`
      : `Cite the specific statutory provision for each key obligation under an engaged state's statute; do not cite statutes of states outside the engaged set.`;
    // Dual-mode legal-framework enumeration (line ~980).
    const _dualStatuteMap: Record<string, string> = {
      California: "CCPA/CPRA",
      Texas: "TDPSA",
      Connecticut: "CTDPA",
      Virginia: "VCDPA",
      Colorado: "CPA",
      Oregon: "OCPA",
      Florida: "FDBR",
      Washington: "MHMDA",
      Illinois: "BIPA",
      Utah: "UCPA",
      Iowa: "Iowa CDPA",
      Indiana: "ICDPA",
      Tennessee: "TIPA",
      Montana: "MCDPA",
      Minnesota: "Minnesota CDPA",
      Delaware: "DPDPA",
      "New York": "New York SHIELD Act",
      Massachusetts: "Massachusetts DPA",
    };
    const _dualEngagedStatutes = promptEngagedStates
      .map((s) => _dualStatuteMap[s])
      .filter(Boolean);
    const dualLegalFrameworkLine = _dualEngagedStatutes.length
      ? `GDPR Article 28 + US State Privacy Laws (${_dualEngagedStatutes.join(", ")} as applicable)`
      : `GDPR Article 28 + any applicable US state privacy laws`;
    const dualHeaderRecitalLine = _has("California")
      ? `"This DPA is entered into to satisfy the requirements of (a) GDPR Article 28, (b) CCPA/CPRA § 1798.100(d), and (c) other applicable US state privacy laws."`
      : `"This DPA is entered into to satisfy the requirements of (a) GDPR Article 28 and (b) any applicable US state privacy laws."`;
    // Dual-mode §11 breach block — CA phrase + non-CA engaged bullets.
    const _dualBreachExtras = promptEngagedStates
      .filter((s) => s !== "California")
      .map((s) => _breachBulletMap[s])
      .filter(Boolean);
    const dualBreachStateLine = (() => {
      const parts: string[] = [];
      if (_has("California")) parts.push(`California — "without unreasonable delay" (Cal. Civ. Code § 1798.82 governs notification to individuals)`);
      if (_has("Colorado")) parts.push(`Colorado — C.R.S. § 6-1-716 (NOT "CPA § 6-1-1309")`);
      if (_has("Texas")) parts.push(`Texas (Tex. Bus. & Com. Code § 521.053)`);
      if (_has("Connecticut")) parts.push(`Connecticut`);
      if (_has("Virginia")) parts.push(`Virginia`);
      return parts.length
        ? parts.join("; ") + "."
        : `Apply only those state regimes triggered by the parties' jurisdictions or affected data subjects' residency; do NOT enumerate the timelines of states outside the engaged US states set derived from the record.`;
    })();

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

Include a dedicated section titled "HIPAA Business Associate Terms" with these provisions. Identify which party is the Covered Entity and which is the Business Associate, or — where the record does not establish these roles — state in advisory voice: "The record does not establish which party is the Covered Entity and which the Business Associate for HIPAA purposes; further clarification is advisable." Do NOT apply HIPAA if the services clearly do not involve PHI (e.g. purely administrative SaaS with no patient data access).
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

Assess applicability based on the Controller's business type and the services described. If applicability is uncertain, include the provisions with an advisory note in the form: "The record does not conclusively establish applicability of [GLBA/FCRA] to the services described; further clarification is advisable."
` : ""}${(sectorFlags.hasFinancialData && (/(^|\W)(New York|NY)(\W|$)/.test(String(body.controllerJurisdiction ?? "")) || /(^|\W)(New York|NY)(\W|$)/.test(String(body.processorJurisdiction ?? "")))) ? `
NYDFS CYBERSECURITY MODULE — 23 NYCRR PART 500 (New York jurisdiction engaged AND financial data present)
The record establishes that (a) at least one Party is in New York and (b) financial/payment data is in scope. Where either Party is a "Covered Entity" under 23 NYCRR § 500.1(c) (an entity operating under a licence, registration, charter, or similar authorisation under the New York Banking Law, Insurance Law, or Financial Services Law), the New York Department of Financial Services (NYDFS) Cybersecurity Requirements for Financial Services Companies at 23 NYCRR Part 500 apply. Consolidate the following into the SECURITY MEASURES and SUB-PROCESSOR sections (per OUTPUT SCOPE AND LENGTH DISCIPLINE — no addendum, no per-section restatement):
- Third-party service provider security policy under 23 NYCRR § 500.11: the Covered Entity's contract with the Processor as a "Third Party Service Provider" (as that term is used in § 500.1 and § 500.11) shall address, as applicable and to the extent required by § 500.11(a): (i) the Processor's access controls, including multi-factor authentication where required; (ii) encryption of Nonpublic Information both in transit over external networks and at rest, per § 500.15; (iii) prompt notice to the Covered Entity of any Cybersecurity Event directly impacting the Covered Entity's Information Systems or Nonpublic Information held by the Processor; (iv) representations and warranties addressing the Processor's cybersecurity practices related to the security of the Covered Entity's Information Systems or Nonpublic Information. Cite these as "23 NYCRR § 500.11(a)" and quote no subsection letter outside those verified against the primary source.
- Cybersecurity event notification under 23 NYCRR § 500.17(a): the Processor shall notify the Covered Entity of any Cybersecurity Event affecting the Covered Entity without unreasonable delay and in any event in time to permit the Covered Entity to meet its own 72-hour notice obligation to the Superintendent of Financial Services under 23 NYCRR § 500.17(a).
- Where a specific subsection letter or amendment date is not verified against the primary text of 23 NYCRR Part 500, use "[TO BE COMPLETED: verify subsection against 23 NYCRR Part 500 primary text]" rather than inventing a subsection. Do NOT cite 23 NYCRR Part 500 sections beyond §§ 500.1, 500.11, 500.15, and 500.17 in this draft; any additional section requires a [TO BE COMPLETED] flag.
- If neither Party is a Covered Entity under § 500.1(c), state the § 500.11 obligation as a contractual baseline the Parties adopt for the security of financial data and note that the statutory obligation attaches only if either Party subsequently becomes a Covered Entity.
` : ""}

Draft a complete US State Data Processing Agreement with ALL of the following sections, in this exact order and using the exact heading tokens shown (top-level headings are AUTHORITATIVE and are matched against the deterministic grader's DPA_REQUIRED_SECTIONS list — do NOT rename, reorder, merge, or split them). Number clauses hierarchically (1.1, 1.2, 1.2.1 etc.):

1. PARTIES AND RECITALS — identify applicable state laws based on the parties' jurisdictions and the residency of data subjects likely affected.
2. DEFINITIONS — Personal Data, Sensitive Personal Data, Controller/Business, Processor/Service Provider, Consumer, Processing, Sale, Sharing, Targeted Advertising, Business Purpose — using CCPA § 1798.140 and equivalent state-law definitions.
3. SUBJECT MATTER, NATURE, DURATION AND PURPOSE — state specific business purpose(s); not "as necessary to perform the services."
4. DATA PROCESSING — PROCESSOR OBLIGATIONS — the heading MUST begin with the literal tokens "DATA PROCESSING —".
   4.1 Processing only on Controller instructions
   4.2 Confidentiality of personnel
   4.3 Security measures (see Section 9)
   4.4 Sub-processor obligations (see Section 6)
   4.5 Consumer rights assistance (see Section 7)
   4.6 Risk assessment / DPIA assistance — ${riskAssessLine} (engaged US states from the record: ${engagedListLine}; do NOT cite statutes of states outside this set)
   4.7 Deletion or return of data at termination (see Section 12)
   4.8 Audit cooperation (see Section 13)
5. PROHIBITED PROCESSING (CCPA/CPRA § 1798.100(d) and equivalents) — this section MUST contain, verbatim, the phrases "shall not sell" AND "shall not share" applied to Personal Data, and MUST explicitly state that the Processor is "prohibited from selling or sharing" Personal Data outside the business purpose.
   5.1 No Sale or Sharing
   5.2 No Targeted Advertising outside the agreed business purpose
   5.3 No Cross-Context Combination except as permitted by law
   5.4 No Retention Beyond Purpose
   ${_has("California") ? `Cite Cal. Civ. Code § 1798.100(d)(1)-(5) and equivalent provisions of the other engaged states (from the engaged US states set above) explicitly.` : `Cite the specific statutory provisions of the engaged US states (from the engaged US states set above) explicitly; do NOT cite statutes of states outside that set.`}
6. SUB-PROCESSING PROVISIONS — the heading MUST contain the literal token "SUB-PROCESSING". Prior written consent; equivalent obligations flow-down; Processor liable for sub-processors; populate Schedule A from the parties' inputs. If no sub-processors were provided in the intake, output a blank Schedule A with column headers (Name / Service / Location / Date Authorised) and the instruction line "[TO BE COMPLETED: list approved Sub-processors here]". Do NOT hard-code "no Sub-Processors at the Effective Date" unless the intake expressly stated none.
7. DATA SUBJECT RIGHTS — CONSUMER RIGHTS PASS-THROUGH — the heading MUST contain BOTH the phrase "Data Subject Rights" AND the phrase "Consumer Rights". Body MUST include the verbatim phrases "right to access", "right to delete" and "right to correct" with applicable response timelines per state law (Know/Access, Delete, Correct, Opt-Out of Sale/Sharing incl. GPC for California, Limit Use of Sensitive PI, Non-Discrimination).
8. SENSITIVE PERSONAL DATA — heightened protections; opt-in consent for minors' data for targeted advertising or profiling.
9. SECURITY MEASURES — calibrated to data categories and subject count; encryption, access controls, employee training, incident response, pen testing cadence; address failures in enforcement context.
10. DATA TRANSFERS — CROSS-BORDER AND OFFSHORE DISCLOSURE — the heading MUST begin with the literal tokens "DATA TRANSFERS —". This section addresses onward disclosures or offshore processing of Personal Data by the Processor or its sub-processors. Include: (a) a representation that the Processor will disclose the location(s) of processing on request; (b) where processing occurs outside the United States, an obligation to maintain equivalent security safeguards and to comply with any US state-law obligations governing offshore disclosure (e.g., CCPA "sale/share" restrictions applied to onward disclosures, and any state-specific offshore-notice requirements applicable to sensitive personal data or health data); (c) a prohibition on onward transfer outside the business purpose without Controller consent. Do NOT invent EU SCCs, UK Addendum, or GDPR Article 46 obligations — those are inapplicable to a pure US-state DPA. If sub-processors process outside the US, note the location in Schedule A rather than invent a transfer instrument.
11. DATA BREACH NOTIFICATION — state-specific timelines for the engaged US states (use the wording below verbatim where indicated). Only the states in the engaged US states set from the record appear below; do NOT enumerate or add bullets for states outside that set:
${breachBulletsBlock}
    Include minimum notification content per applicable engaged-state law.
12. RETURN OR DELETION OF PERSONAL DATA — POST-TERMINATION OBLIGATIONS — the heading MUST contain the literal tokens "RETURN OR DELETION". At Controller's election, Processor shall delete or return all Personal Data and certify deletion in writing within 30 days; no retention except as required by law. Use the exact phrase "delete or return" and reference "Personal Data" in the same sentence.
13. AUDIT AND INSPECTION RIGHTS — use ${body.auditRights} standard; 30 days' notice; more frequent if breach suspected.
14. RECORDKEEPING — sufficient to demonstrate compliance.
15. LIABILITY AND INDEMNIFICATION
16. TERM AND TERMINATION
17. GOVERNING LAW AND DISPUTE RESOLUTION
18. GENERAL PROVISIONS (amendments, entire agreement, severability, counterparts)

[SIGNATURE BLOCK]

SCHEDULE A — APPROVED SUB-PROCESSORS

Additional requirements:
- Include a dedicated section titled 'Consumer Rights Assistance' or 'Data Subject / Consumer Rights' that explicitly requires the Processor to:
  (a) ${consumerAccessSavingsLine};
  (b) ${consumerDeletionSavingsLine};
  (c) ${optOutSavingsLine};
  (d) notify the Controller within five (5) business days upon receiving any consumer rights request directly;
  (e) not respond to consumer rights requests directly without Controller's prior written authorization.
  This clause must appear as an explicit named section in the document, not merely as implied language elsewhere.
- ${citeExampleSavingsLine}
- Use the phrases "business purpose" and "prohibited from selling or sharing" explicitly where applicable.

${ANNOTATIONS_INSTRUCTIONS}`;

    const CA_USER = `${PARTIES_BLOCK}

ENFORCEMENT CONTEXT
${enforcementBlock}

Draft a complete Canadian Data Processing Agreement with ALL of the following sections, in this exact order and using the exact heading tokens shown (top-level headings are AUTHORITATIVE and are matched against the deterministic grader's DPA_REQUIRED_SECTIONS list — do NOT rename, reorder, merge, or split them). Number clauses hierarchically:

1. PARTIES AND RECITALS — identify applicable Canadian federal and provincial privacy laws (PIPEDA, Quebec Law 25, PIPA AB, PIPA BC, PHIPA ON) based on parties' jurisdictions and residency of data subjects.
2. DEFINITIONS — Personal Information, Sensitive Personal Information, Controller, Service Provider, Processing, Disclosure — using PIPEDA s.2 and Law 25 definitions.
3. SUBJECT MATTER, NATURE, DURATION AND PURPOSE — state the specific business purposes for which the Service Provider processes Personal Information on the Controller's behalf; not "as necessary to perform the services."
4. DATA PROCESSING — ACCOUNTABILITY, CONTRACTUAL PROTECTION AND INSTRUCTIONS — the heading MUST begin with the literal tokens "DATA PROCESSING —". Consolidate the following mandatory content:
   4.1 Accountability (PIPEDA Schedule 1, Principle 1; Law 25 Art. 3.1) — Controller remains accountable; Processor acts on behalf of Controller.
   4.2 Contractual protection requirement (PIPEDA Schedule 1, Principle 1 (Accountability) — OPC guidance confirms accountability extends to third-party processors through contract; Quebec Law 25, s.18.3 — requires a written contract with service providers specifying the measures the service provider must take to protect Personal Information). Note: PIPEDA Schedule 1 does not use decimal sub-principle numbering — do NOT cite "Principle 1.2" or "clause 4.1.3" as these are not valid PIPEDA citation formats.
   4.3 Purpose limitation and instructions — Processor processes only on documented instructions; no secondary use.
   4.4 Consent support — Processor shall not undermine Controller's consent obligations. On a withdrawal-of-consent request, the Processor shall (a) cease Processing of the relevant Personal Information and (b) notify the Controller of any technical limitations preventing full implementation. Do NOT use advisory/consultative language such as "advising the Controller on the scope and feasibility" — the Processor implements; it does not advise.
5. SUB-PROCESSING PROVISIONS — the heading MUST contain the literal token "SUB-PROCESSING". Prior written consent; flow-down obligations; Processor remains accountable through the chain; populate Schedule A from intake; if none provided, output a blank Schedule A with column headers (Name / Service / Location / Date Authorised) and the line "[TO BE COMPLETED: list approved Sub-processors here]".
6. DATA SUBJECT RIGHTS — INDIVIDUAL RIGHTS ASSISTANCE — the heading MUST contain the literal phrase "Data Subject Rights". Access, Correction, Withdrawal of Consent, Data Portability (Law 25 Art. 27), De-indexing (cite as "section 28.1 of the Act respecting the protection of personal information in the private sector, or a court order" — do NOT cite ambiguously as "the law or a court order").
7. SECURITY SAFEGUARDS (PIPEDA Principle 7 / Schedule 1 cl. 4.7; Law 25 Art. 10; PIPA AB Part 3 Div. 1.1; PIPA BC s.34; PHIPA s.12) — calibrated technical, physical and organisational safeguards.
8. DATA TRANSFERS — CROSS-BORDER TRANSFER ASSESSMENT (Law 25 Art. 17; OPC guidance) — the heading MUST begin with the literal tokens "DATA TRANSFERS —". Privacy impact assessment for transfers outside Quebec/Canada; include a Schedule B for approved transfer destinations OR a reference to OPC cross-border transfer guidance. Do NOT invent EU SCC-based obligations — those apply only where an EU controller is a party.
9. BREACH OF SECURITY SAFEGUARDS NOTIFICATION (PIPEDA s.10.1 and Breach of Security Safeguards Regulations SOR/2018-64 — CRITICAL: the correct regulation number is SOR/2018-64. Do NOT cite SOR/2018-161 or any other SOR number — SOR/2018-161 is a different regulation and its use here would be a citation error; Law 25 Art. 3.5; PIPA Alberta — Part 3, Division 1.1 of PIPA Alberta (S.A. 2003, c. P-6.5, as amended; sections 34.1–34.6 added by amendments in force January 2022)) — real risk of significant harm; notify Controller without delay; Controller obligations to OPC/CAI and affected individuals.
10. RETENTION AND DESTRUCTION — destroy or anonymise when purposes accomplished (Law 25 Art. 23). Where the parties have agreed a specific retention period for HR data, state it as the parties' contractual choice. CRITICAL — DO NOT default to "duration of employment plus five (5) years" as if statutorily required — neither PIPEDA nor Quebec Law 25 prescribes a fixed post-employment retention period. Frame any such figure as "unless applicable employment law or the Controller's documented retention policy requires otherwise" and include the note: "Quebec Law 25 and PIPEDA do not prescribe a fixed post-employment retention period — this duration should reflect the organization's documented retention policy."
11. RETURN OR DELETION OF PERSONAL INFORMATION — POST-TERMINATION OBLIGATIONS — the heading MUST contain the literal tokens "RETURN OR DELETION". At Controller's election, Processor shall delete or return all Personal Information and certify in writing. Use the exact phrase "delete or return" and reference "Personal Information" in the same sentence.
12. AUDIT AND INSPECTION RIGHTS — use ${body.auditRights} standard.
13. RECORDKEEPING — Law 25 Art. 8 register of confidentiality incidents (Processor assists).
14. LIABILITY AND INDEMNIFICATION
15. TERM AND TERMINATION
16. GOVERNING LAW (specify province) AND DISPUTE RESOLUTION — for arbitration clauses, the city/province blank MUST use the form "[TO BE COMPLETED: City, Province]".
17. GENERAL PROVISIONS

[SIGNATURE BLOCK]

SCHEDULE A — APPROVED SUB-PROCESSORS

Additional requirements:
- Cite specific PIPEDA principles/sections, Law 25 articles, and provincial PIPA/PHIPA sections where applicable.

${ANNOTATIONS_INSTRUCTIONS}`;

    const DUAL_EU_US_USER = `${PARTIES_BLOCK}
Legal framework: ${dualLegalFrameworkLine}
Transfer clause: ${body.includeTransferClause ? body.transferMechanism : "SCCs recommended for EU-to-US transfers"}${transferBasis ? `\nTransfer clause basis: ${transferBasis}` : ""}

ENFORCEMENT CONTEXT
${enforcementBlock}

Draft a single integrated dual-compliance DPA. The header recital must include:
${dualHeaderRecitalLine}

Sections, in this exact order and using the exact heading tokens shown (top-level headings are AUTHORITATIVE and are matched against the deterministic grader's DPA_REQUIRED_SECTIONS list — do NOT rename, reorder, merge, or split them). Number clauses hierarchically:

1. PARTIES AND RECITALS (incl. dual-compliance recital above)
2. DEFINITIONS (harmonised GDPR + US state definitions; where definitions diverge, state both)
3. SUBJECT MATTER, NATURE, DURATION AND PURPOSE (specific business purpose)
4. DATA PROCESSING — PROCESSOR OBLIGATIONS — the heading MUST begin with the literal tokens "DATA PROCESSING —". Cover all eight GDPR Art. 28(3) elements PLUS US processor obligations (DPIA assistance, consumer-rights assistance).
5. PROHIBITED PROCESSING (US-specific) — this section MUST contain, verbatim, the phrases "shall not sell" AND "shall not share" applied to Personal Data, and MUST explicitly state that the Processor is "prohibited from selling or sharing" Personal Data. Cover No Sale/Sharing; No Targeted Advertising outside business purpose; No Cross-Context Combination; No Retention Beyond Purpose. ${_has("California") ? `Cite Cal. Civ. Code § 1798.100(d)(1)-(5).` : `Cite the specific statutory provisions of the engaged US states (engaged US states from the record: ${engagedListLine}); do NOT cite statutes of states outside that set.`}
6. SUB-PROCESSING PROVISIONS (GDPR Arts. 28(2)/(4) + US flow-down) — the heading MUST contain the literal token "SUB-PROCESSING". Populate Schedule A from intake. If no sub-processors were provided, output a blank Schedule A with column headers (Name / Service / Location / Date Authorised) and the line "[TO BE COMPLETED: list approved Sub-processors here]". Do NOT hard-code "no Sub-Processors" unless the intake expressly stated none.
7. DATA SUBJECT RIGHTS — CONSUMER RIGHTS PASS-THROUGH — the heading MUST contain BOTH the phrase "Data Subject Rights" AND the phrase "Consumer Rights". Body MUST include verbatim "right to access", "right to delete" and "right to correct" and the GDPR rights under Arts. 12-23.
8. SENSITIVE DATA / SPECIAL CATEGORIES (GDPR Art. 9 + US sensitive PI heightened protections)
9. SECURITY MEASURES (GDPR Art. 32 standards apply)
10. DATA TRANSFERS — INTERNATIONAL TRANSFER PROVISIONS — the heading MUST begin with the literal tokens "DATA TRANSFERS —". Content: ${body.includeTransferClause ? body.transferMechanism : "EU SCCs (Commission Implementing Decision (EU) 2021/914) for EU-origin transfers; UK Addendum to the EU SCCs (ICO-approved) for UK-origin transfers"}. UK TRANSFER INSTRUMENT TERMINOLOGY: The ICO provides two alternative UK GDPR Article 46 transfer tools: (a) the International Data Transfer Agreement (IDTA) — a standalone UK transfer contract; and (b) the UK Addendum to the EU Commission Standard Contractual Clauses — an addendum that modifies EU SCCs for UK use. These are DISTINCT instruments. When incorporating the addendum to the EU SCCs, call it the "UK Addendum" or "International Data Transfer Addendum to the EU Commission Standard Contractual Clauses" — do NOT call it the "UK IDTA." Reserve "UK IDTA" for references to the standalone International Data Transfer Agreement. Use only ONE UK transfer mechanism — either the UK IDTA or the UK Addendum, not both. The protection standard for UK transfers must be expressed as "not less than equivalent to the protections afforded by UK data protection law" — do NOT use the EU adequacy phrase "essentially equivalent" for UK transfers.
11. DATA BREACH NOTIFICATION — Processor notifies Controller without undue delay and in any event within forty-eight (48) hours of awareness, to enable the Controller to comply with Article 33(1) GDPR (72-hour supervisory authority window). PLUS US state notification timelines for the engaged US states (from the record: ${engagedListLine}) — do NOT enumerate states outside this set: ${dualBreachStateLine}
12. RETURN OR DELETION OF PERSONAL DATA — POST-TERMINATION OBLIGATIONS — the heading MUST contain the literal tokens "RETURN OR DELETION". At Controller's choice, Processor shall delete or return all Personal Data (Art. 28(3)(g) + US state equivalents). Use the exact phrase "delete or return" and reference "Personal Data".
13. AUDIT AND INSPECTION RIGHTS — ${body.auditRights}
14. RECORDKEEPING (Art. 30 + US state)
15. LIABILITY AND INDEMNIFICATION
16. TERM AND TERMINATION
17. GOVERNING LAW AND DISPUTE RESOLUTION
18. GENERAL PROVISIONS

SCC MODULE PINNING (deterministic). This DPA governs a Controller-to-Processor relationship. Wherever the EU SCCs (Commission Implementing Decision (EU) 2021/914) are cited or incorporated, the applicable module for the direct Controller-to-Processor transfer is MODULE TWO (Controller-to-Processor). Onward transfers by the Processor to Sub-processors that are themselves processors of the Controller are governed by MODULE THREE (Processor-to-Processor). MODULE ONE (Controller-to-Controller) and MODULE FOUR (Processor-to-Controller) are inapplicable to this instrument and MUST NOT be cited, described, or implied in any transfer clause, schedule, or annex. If the intake's transferMechanism value specifies a module, the transfer-clause basis MUST use that same module verbatim — do not silently substitute a different module number.

[SIGNATURE BLOCK]

SCHEDULE A — APPROVED SUB-PROCESSORS

Where GDPR is stricter, GDPR prevails; where US state law adds requirements, both apply.

${ANNOTATIONS_INSTRUCTIONS}`;

    const DUAL_EU_CA_USER = `${PARTIES_BLOCK}
Legal framework: GDPR Article 28 + Canadian PIPEDA / Quebec Law 25 / applicable provincial PIPA/PHIPA
Transfer clause: ${body.includeTransferClause ? body.transferMechanism : "SCCs / adequacy reliance for EU-Canada"}${transferBasis ? `\nTransfer clause basis: ${transferBasis}` : ""}

ENFORCEMENT CONTEXT
${enforcementBlock}

Draft a single integrated dual-compliance DPA covering GDPR Art. 28 and Canadian federal/provincial privacy law. Header recital:
"This DPA is entered into to satisfy the requirements of (a) GDPR Article 28, (b) PIPEDA Schedule 1 (accountability and contractual protection), and (c) Quebec Law 25 Art. 18.3 and applicable provincial privacy laws."

Sections, in this exact order and using the exact heading tokens shown (top-level headings are AUTHORITATIVE and are matched against the deterministic grader's DPA_REQUIRED_SECTIONS list — do NOT rename, reorder, merge, or split them). Number clauses hierarchically:

1. PARTIES AND RECITALS (incl. dual-compliance recital above)
2. DEFINITIONS — harmonised GDPR + Canadian definitions (Personal Data / Personal Information; Controller / Service Provider; Processing; Disclosure); where definitions diverge, state both.
3. SUBJECT MATTER, NATURE, DURATION AND PURPOSE — specific business purpose(s); not "as necessary to perform the services."
4. DATA PROCESSING — PROCESSOR OBLIGATIONS AND CANADIAN ACCOUNTABILITY — the heading MUST begin with the literal tokens "DATA PROCESSING —". Cover all eight GDPR Art. 28(3) elements (instructions, confidentiality, security, sub-processors, rights assistance, security/breach/DPIA assistance, deletion/return, information/audit) PLUS PIPEDA Schedule 1 accountability and Quebec Law 25 s.18.3 contractual-protection requirements (Controller remains accountable; Processor acts on behalf of Controller). Do NOT cite "Principle 1.2" or "clause 4.1.3" — PIPEDA Schedule 1 does not use decimal sub-principle numbering.
5. SUB-PROCESSING PROVISIONS (GDPR Arts. 28(2)/(4) + PIPEDA/Law 25 flow-down) — the heading MUST contain the literal token "SUB-PROCESSING". Prior written consent; equivalent obligations flow-down; Processor remains accountable through the chain; populate Schedule A from intake. If none provided, output a blank Schedule A with column headers (Name / Service / Location / Date Authorised) and the line "[TO BE COMPLETED: list approved Sub-processors here]".
6. DATA SUBJECT RIGHTS — INDIVIDUAL RIGHTS ASSISTANCE — the heading MUST contain the literal phrase "Data Subject Rights". Cover GDPR Arts. 12-23 rights (access, rectification, erasure, restriction, portability, objection) AND Canadian rights (Access, Correction, Withdrawal of Consent, Data Portability under Law 25 Art. 27, De-indexing under section 28.1 of the Act respecting the protection of personal information in the private sector).
7. SECURITY MEASURES (GDPR Art. 32; PIPEDA Principle 7 / Schedule 1 cl. 4.7; Law 25 Art. 10; provincial PIPA/PHIPA equivalents) — calibrated technical, physical and organisational safeguards.
8. DATA TRANSFERS — INTERNATIONAL AND CROSS-BORDER TRANSFERS — the heading MUST begin with the literal tokens "DATA TRANSFERS —". Content: ${body.includeTransferClause ? body.transferMechanism : "EU SCCs (Commission Implementing Decision (EU) 2021/914) for EU-origin transfers to non-adequate third countries; Canadian PIPEDA/Law 25 cross-border assessment (Law 25 Art. 17; OPC guidance) for transfers outside Canada or Quebec"}. Note that Canada benefits from a European Commission adequacy decision for private-sector transfers under PIPEDA, so EU→Canada transfers to PIPEDA-regulated recipients do not require an Art. 46 safeguard while that adequacy remains in force; document the adequacy reliance rather than duplicating SCCs where adequacy applies.
9. BREACH NOTIFICATION — GDPR Art. 33 (Processor notifies Controller without undue delay and in any event within forty-eight (48) hours of awareness, to enable the Controller to comply with its own 72-hour supervisory-authority window under Art. 33(1)) AND PIPEDA s.10.1 / Breach of Security Safeguards Regulations SOR/2018-64 (real-risk-of-significant-harm; correct SOR number is SOR/2018-64 — do NOT cite SOR/2018-161) AND Quebec Law 25 Art. 3.5.
10. RETENTION AND DESTRUCTION — Law 25 Art. 23 destroy-or-anonymise; do NOT default post-employment or HR retention to any fixed period as if statutorily required — neither PIPEDA nor Quebec Law 25 prescribes a fixed retention period.
11. RETURN OR DELETION OF PERSONAL DATA — POST-TERMINATION OBLIGATIONS — the heading MUST contain the literal tokens "RETURN OR DELETION". At Controller's choice, Processor shall delete or return all Personal Data (Art. 28(3)(g) + PIPEDA / Law 25 equivalents). Use the exact phrase "delete or return" and reference "Personal Data" in the same sentence.
12. AUDIT AND INSPECTION RIGHTS — ${body.auditRights}
13. RECORDKEEPING (GDPR Art. 30 + Law 25 Art. 8 register of confidentiality incidents; Processor assists)
14. LIABILITY AND INDEMNIFICATION
15. TERM AND TERMINATION
16. GOVERNING LAW (specify EU member state or Canadian province) AND DISPUTE RESOLUTION
17. GENERAL PROVISIONS

SCC MODULE PINNING (deterministic). This DPA governs a Controller-to-Processor relationship. Wherever the EU SCCs (Commission Implementing Decision (EU) 2021/914) are cited or incorporated, the applicable module for the direct Controller-to-Processor transfer is MODULE TWO (Controller-to-Processor). Onward transfers by the Processor to Sub-processors that are themselves processors of the Controller are governed by MODULE THREE (Processor-to-Processor). MODULE ONE (Controller-to-Controller) and MODULE FOUR (Processor-to-Controller) are inapplicable to this instrument and MUST NOT be cited, described, or implied in any transfer clause, schedule, or annex. If the intake's transferMechanism value specifies a module, the transfer-clause basis MUST use that same module verbatim — do not silently substitute a different module number.

[SIGNATURE BLOCK]

SCHEDULE A — APPROVED SUB-PROCESSORS

Where GDPR is stricter, GDPR prevails; where Canadian law adds requirements, both apply.

${ANNOTATIONS_INSTRUCTIONS}`;

    // FF-DPA nd6 — UK mode: operative instrument is UK GDPR (section 3(10) DPA
    // 2018) + DPA 2018; supervisory authority is the ICO; Article 28(3)
    // structure is retained AS UK GDPR Article 28(3). Verified citations
    // (legislation.gov.uk / ICO, July 2026): (a) UK GDPR as defined in section
    // 3(10) of the Data Protection Act 2018 (c.12), retained in UK law by
    // section 3 of the European Union (Withdrawal) Act 2018; (b) DPA 2018
    // (c.12), Parts 1–7; (c) UK IDTA and UK Addendum to the EU SCCs, issued
    // by the ICO under section 119A DPA 2018 (in force 21 March 2022);
    // (d) EU→UK adequacy: Commission Implementing Decision (EU) 2021/914
    // superseded by the renewed adequacy decision adopted 19 December 2025
    // (valid until 27 December 2031). Anything unverified against these
    // primary sources must be flagged [TO BE COMPLETED], never recalled.
    const UK_SYSTEM = `You are a senior data protection counsel specialising in UK data-protection law. Draft a complete, legally rigorous controller-processor Data Processing Agreement compliant with UK GDPR Article 28. The agreement must be immediately usable as a professional document without further editing except where fields are explicitly marked [TO BE COMPLETED].

UK-PRIMARY OPERATIVE LAW: The operative instrument for this DPA is the UK General Data Protection Regulation ("UK GDPR"), as defined in section 3(10) of the Data Protection Act 2018 (c.12), together with the Data Protection Act 2018 itself. The competent supervisory authority is the Information Commissioner's Office (the ICO). Every Article 28(3) obligation MUST be cited as "UK GDPR Article 28(3)" (never as Article 28(3) of Regulation (EU) 2016/679). Recitals must identify UK GDPR and DPA 2018 as the operative law; Regulation (EU) 2016/679 may appear ONLY in a clearly labelled comparative or transfer-context reference (for example, when describing an EU→UK adequacy decision), never as the operative instrument.

TRANSFER MECHANISMS UNDER UK RULES: For restricted transfers from the UK to a third country, the UK's international transfer instruments are (a) the UK International Data Transfer Agreement (UK IDTA) or (b) the UK Addendum to the EU SCCs, each issued by the ICO under section 119A DPA 2018 and in force from 21 March 2022. For transfers from the UK to countries covered by UK adequacy regulations made under section 17A DPA 2018, no additional Article 46 UK GDPR safeguard is required while those regulations remain in force. Do NOT cite EU 2021/914 SCCs as the UK transfer mechanism; the EU SCCs apply to a UK transfer only through the UK Addendum.

EU→UK ADEQUACY: The European Commission's adequacy decision for the United Kingdom was renewed on 19 December 2025 (valid until 27 December 2031). Where personal data flows from an EEA-established party to the UK party, the transfer is governed by that adequacy decision under Article 45 EU GDPR; no Article 46 safeguard is required while that decision remains in force. Never state or imply that EU→UK adequacy "does not apply post-Brexit" — that is factually incorrect.

CITATION DISCIPLINE: Any UK GDPR or DPA 2018 citation you draft must be verifiable against legislation.gov.uk or the ICO. If a specific section, subsection, or paragraph number is not verified, use a section-level citation with a descriptive gloss and flag "[statutory reference to be confirmed]" — never invent a subsection. Do NOT recall UK enforcement figures from memory; only use figures that appear in the ENFORCEMENT CONTEXT block.

CROSS-BORDER PARTY MODULE (UK+US or UK+CA derivations): Where the counterparty is established in the United States or Canada, the operative law remains UK GDPR + DPA 2018 with the ICO as competent authority. Address the cross-border character by adding an INTERNATIONAL TRANSFER section that (i) states the UK's transfer mechanism for the specific destination country under UK IDTA / UK Addendum or an applicable UK adequacy regulation, (ii) does NOT introduce US-state or Canadian federal/provincial statutes as operative for this DPA (they may be referenced only as onward-obligations of the counterparty in its own jurisdiction), and (iii) preserves UK-primary drafting throughout the operative clauses.

BREACH NOTIFICATION PARTY RULE: Any sub-clause requiring description of remedial measures within the Processor's notification to the Controller must state those are the measures "taken or proposed to be taken by the Processor" — NOT "by the Controller."`;
    const UK_USER = GDPR_USER;

    let systemPrompt = GDPR_SYSTEM;
    let userPrompt = GDPR_USER;
    if (documentType === "us-state") { systemPrompt = US_SYSTEM; userPrompt = US_USER; }
    else if (documentType === "canada") { systemPrompt = CA_SYSTEM; userPrompt = CA_USER; }
    else if (documentType === "dual-eu-us") { systemPrompt = DUAL_EU_US_SYSTEM; userPrompt = DUAL_EU_US_USER; }
    else if (documentType === "dual-eu-ca") { systemPrompt = DUAL_EU_CA_SYSTEM; userPrompt = DUAL_EU_CA_USER; }
    else if (documentType === "uk") { systemPrompt = UK_SYSTEM; userPrompt = UK_USER; }

    const CITATION_INTEGRITY_RULE = `

CITATION INTEGRITY RULE: Every specific statutory citation you produce (act name, section number, subsection letter) must be verifiable against the actual statute. Known hallucination risks to guard against: (1) PIPEDA does not use decimal sub-principle numbering — cite as "Schedule 1, Principle N (Name)" only. (2) The Breach of Security Safeguards Regulations under PIPEDA are SOR/2018-64 — no other SOR number is correct. (3) US state privacy laws do not have a universal 72-hour breach notification deadline — that is a GDPR Article 33 concept only. Apply it only where GDPR explicitly applies. (4) Quebec Law 25 uses "without delay" not "72 hours" — present 72 hours as a planning benchmark only. (5) California breach notification (Cal. Civ. Code §1798.82, as amended by SB 446 effective 1 Jan 2026): notify affected individuals within 30 calendar days of discovery; for breaches affecting 500+ California residents, submit a sample copy to the California Attorney General within 15 calendar days of notifying consumers. The two statutory delay exceptions (legitimate needs of law enforcement; time necessary to determine the breach scope and restore system integrity) are retained. Do NOT describe California as having no fixed deadline or use the "most expedient time possible" phrasing — that was the pre-2026 standard. 72 hours remains a GDPR Article 33 concept only. (6) The EU Artificial Intelligence Act must always be cited as "Regulation (EU) 2024/1689" — never 2024/900 or any other number. (7) MONETARY PENALTY RULE: Never state a specific monetary fine, penalty, or settlement amount unless that exact figure appears in the ENFORCEMENT CONTEXT block provided in this prompt. Training knowledge of regulatory fines is unreliable. If a relevant case exists but its amount is not in the provided block, write "[Regulator] imposed a significant penalty for this type of violation — verify the current figure at the regulator's enforcement register" instead of recalling an amount. Known correct figures (use only if the case is in your enforcement block): ICO Clearview AI (2022) £7,552,800; ICO Interserve (2022) £4,400,000 (NOT £5.03M); ICO Capita Pension Solutions (2024) £6,090,000 (NOT £6.88M); ICO British Airways (2020) £20,000,000. If you are uncertain of a specific section number, write the section in descriptive terms and flag it: "[statutory reference to be confirmed]" rather than inventing a section number.`;
    systemPrompt = systemPrompt + CITATION_INTEGRITY_RULE + `

GRADER-CAL-1 C1 — CCPA BREACH-NOTIFICATION vs. PRIVATE RIGHT OF ACTION (BINDING):
Cal. Civ. Code § 1798.82 is the BREACH-NOTIFICATION section. Cal. Civ. Code § 1798.150 is the CCPA PRIVATE RIGHT OF ACTION — it provides a consumer cause of action for statutorily-defined unauthorized access following inadequate security, NOT a notification duty and NOT a notification deadline. NEVER cite § 1798.150 as the source of a notification obligation, notification deadline, or notification window. Where the drafting concerns notifying individuals, the Attorney General, or affected consumers, the correct anchor is § 1798.82 (with SB 446 as amended per the CITATION INTEGRITY RULE above).

GRADER-CAL-1 C2 — FRAMEWORK-ASSERTION HEDGE (BINDING):
When the record does NOT engage a particular framework (e.g. GDPR is not engaged because no EU/UK data subjects appear in the record), do NOT assert that framework's obligations as governing law. Where a comparative note is helpful, frame it explicitly as comparative / prospective and label it: "For comparison, the GDPR framework would require … — this DPA is not currently governed by that framework on the record supplied."

GRADER-CAL-1 C3 — Art. 35(3)(b) SPECIAL-CATEGORY HEDGE (BINDING):
Do not assert Art. 35(3)(b) DPIA obligations against a controller unless the record shows special-category (Art. 9) or criminal-offence (Art. 10) data processed on a large scale. Absent that record predicate, frame the reference as: "If in future the processing expands to include large-scale special-category or criminal-offence data, Art. 35(3)(b) would engage — on the current record it does not."

GRADER-CAL-1 C4 — RECORD-DISCIPLINE FOR RECITAL-ONLY POINTS (BINDING):
Where a point is drawn from a Recital rather than an operative Article, prefer soft-guidance phrasing ("the Recital 78 guidance points toward …") over assertive obligation language ("must", "shall"). Recitals inform interpretation; they do not create standalone obligations.

PRODUCT-FIX-5 T5(e) — RECORD-CONTRADICTION SURFACING (BINDING): where the intake records two facts that cannot both be true of the same instrument (e.g. transfer-mechanism specifies one SCC module and transfer-clause basis specifies a different SCC module; controller and processor jurisdictions imply different operative frameworks than the documentType selected), the DPA must NOT silently pick one. Draft the operative clauses on the module/framework consistent with SCC MODULE PINNING and this DPA's controller-processor nature, AND flag the contradiction with ONE advisory-drafter sentence in Section 1 recitals stating the record fact + assumption + canonical close "further clarification is advisable.", plus a "[TO BE COMPLETED: …]" placeholder sited in the affected clause. Never invent facts to resolve the contradiction.


${SPECIFICITY_ACTIONABILITY_RULE}

CLAUSE TAILORING (QB-P3): Recitals and operative clauses are drafted for THESE parties, never as a generic template. Wherever an Article 28(3) (or equivalent) obligation is stated, anchor it to the record: use the defined party names, the specific Services description, the listed data categories and data-subject categories, the named sub-processors, and the selected audit, retention, and transfer options. Each major section must contain at least one sentence that could not appear verbatim in another customer's DPA. Statutory language that must be verbatim stays verbatim — tailoring supplements it, never rewrites it.

${ENGAGED_JURISDICTION_CITATION_RULE}

${ADVISORY_VOICE_RULES}`;
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

    // WS6 v2.1 — supplemental capture (regen path); byte-identical on first run
    // since renderSupplementalBlock returns "" when both inputs are empty. This
    // preserves DPA's placeholder-neutrality invariant on the first-run baseline.
    const _suppWs6 = renderSupplementalBlock({ responses: (body as any)?.supplemental_responses, context: (body as any)?.supplemental_context });
    async function callAi(extraUser: string, timeoutMs: number = 720_000): Promise<{ text: string; finishReason: string | null }> {
      const finalUser = (extraUser ? `${userPrompt}\n\n${extraUser}` : userPrompt) + _suppWs6;
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


    function parseDpa(fullText: string): { dpa_text: string; annotations: any[]; drafting_record: Record<string, unknown> | null } {
      // FF-DPA nd1 — defensive strip of the NOTE_BEGIN/NOTE_END render-instruction
      // delimiters used to fence the customer-facing fallback note. If the model
      // copies the delimiters through, remove them (the enclosed text stays).
      const stripFmt = (s: string) => s
        .replace(/<<<NOTE_BEGIN>>>\s*/g, '')
        .replace(/\s*<<<NOTE_END>>>/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*\*/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/^>\s?/gm, '')
        .replace(/^\*\s+/gm, '• ');
      let dpa_text = stripFmt(fullText);
      let parsedAnnotations: any[] = [];
      let drafting_record: Record<string, unknown> | null = null;
      try {
        // QB-P25 Item 3 — split into three ordered sections. DRAFTING_RECORD
        // follows ANNOTATIONS; either or both may be absent (defensive).
        const annIdx = fullText.indexOf("===ANNOTATIONS===");
        const drIdx = fullText.indexOf("===DRAFTING_RECORD===");
        const bodyEnd = annIdx !== -1 ? annIdx : (drIdx !== -1 ? drIdx : -1);
        if (bodyEnd !== -1) {
          dpa_text = stripFmt(fullText.slice(0, bodyEnd).trim());
        }
        if (annIdx !== -1) {
          const annEnd = drIdx !== -1 && drIdx > annIdx ? drIdx : fullText.length;
          const annotationsRaw = fullText.slice(annIdx + "===ANNOTATIONS===".length, annEnd).trim();
          const cleaned = annotationsRaw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
          const start = cleaned.indexOf("[");
          const end = cleaned.lastIndexOf("]");
          if (start !== -1 && end !== -1) {
            const arr = JSON.parse(cleaned.slice(start, end + 1));
            if (Array.isArray(arr)) parsedAnnotations = arr;
          }
        }
        if (drIdx !== -1) {
          const drRaw = fullText.slice(drIdx + "===DRAFTING_RECORD===".length).trim();
          const cleaned = drRaw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
          const start = cleaned.indexOf("{");
          const end = cleaned.lastIndexOf("}");
          if (start !== -1 && end !== -1) {
            try {
              const obj = JSON.parse(cleaned.slice(start, end + 1));
              if (obj && typeof obj === "object" && !Array.isArray(obj)) {
                drafting_record = obj as Record<string, unknown>;
              }
            } catch (e) {
              console.warn("[DPA] drafting_record parse failed (non-fatal):", (e as Error).message);
            }
          }
        }
      } catch (e) {
        console.warn("[DPA] annotation/drafting-record parse failed (non-fatal):", e);
        parsedAnnotations = [];
      }
      return { dpa_text, annotations: parsedAnnotations, drafting_record };
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
    // IR-HF1 T4 — deterministic sub-processor framework suppression BEFORE lint.
    const subprocSup1 = suppressSubProcessorFramework(parsed.dpa_text, !!body.hasSubProcessors);
    parsed = { ...parsed, dpa_text: subprocSup1.text } as typeof parsed;
    let lint = lintReportText(parsed.dpa_text, { checkClauseNumbering: true });
    // REBUILD-DPA T2/T3/T5 — deterministic net: speculative modules,
    // baseline-standard misuse, and blacklist-phrase hits merge in as HARD
    // violations so the existing retry gate at hasHardViolations(lint)
    // regenerates and logPostGenLint records the reason in function_runs.
    {
      const spec = detectSpeculativeClauseViolations(parsed.dpa_text, {
        hasChildrensData: sectorFlags.hasChildrensData,
        hasHealthData: sectorFlags.hasHealthData,
        hasFinancialData: sectorFlags.hasFinancialData,
        isAI: isAISector,
      });
      const baseline = detectBaselineStandardMisuse(parsed.dpa_text, documentType);
      const blacklist = detectBlacklistViolations(parsed.dpa_text);
      // FF-DPA nd2 — engaged-states deterministic check. Engaged US states
      // derive from the record (controllerJurisdiction / processorJurisdiction
      // after alias resolution). Non-engaged state statutes asserted as
      // operative are HARD violations that merge into the same `extras`
      // collector, feeding the retry gate at hasHardViolations(lint).
      const engagedStates = deriveEngagedStates([
        detected.ctrlCanonical,
        detected.procCanonical,
      ]);
      const engagedStateViolations = detectNonEngagedStateAssertions(parsed.dpa_text, engagedStates);
      // HF1 Task 2 — sub-processor contradiction (Schedule-1 / general-authorisation
      // framework where hasSubProcessors===false).
      const subprocContradictions = detectSubProcessorContradiction(parsed.dpa_text, !!body.hasSubProcessors);
      const s150 = detectSection150BreachMisapplication(parsed.dpa_text);
      const extras = [...spec, ...baseline, ...blacklist, ...engagedStateViolations, ...subprocContradictions, ...s150];
      if (extras.length) {
        lint.violations.push(...extras);
        try {
          logPostGenLint(supabase, {
            functionName: "generate-dpa",
            fallbackApplied: !!frameworkFallback,
            residualLeaks: extras.length,
            residualResolvedAsks: 0,
            notes: extras.map((v) => ({ code: v.code, detail: v.detail })).slice(0, 40),
            sourceTable: "dpa_documents",
            sourceRowId: rowId,
            extra: { attempt: 1, framework_fallback: frameworkFallback, doc_type: documentType, tool_type: "dpa_generator", retry_within_budget: true, subproc_suppressed: subprocSup1.suppressed },
          });
        } catch (e) {
          console.warn("[generate-dpa] logPostGenLint (attempt 1) failed:", (e as Error).message);
        }
      }
      // FF-DPA nd5 — UNCONDITIONAL framework-fallback telemetry. Whenever the
      // framework fallback fired, write a durable function_runs event even if
      // no lint violations occurred. Run B's two fallback docs were invisible
      // to telemetry precisely because the previous call site was gated on
      // `extras.length`. This row uses a distinct extra.event marker so it can
      // be filtered from violation-triggered rows in queries.
      if (frameworkFallback) {
        try {
          logPostGenLint(supabase, {
            functionName: "generate-dpa",
            fallbackApplied: true,
            residualLeaks: 0,
            residualResolvedAsks: 0,
            notes: [],
            sourceTable: "dpa_documents",
            sourceRowId: rowId,
            extra: {
              event_subtype: "framework_fallback_notice",
              framework_fallback: true,
              doc_type: documentType,
              framework_name: frameworkFor(documentType),
              raw_controller_jurisdiction: !detected.ctrlMapped ? String(body.controllerJurisdiction ?? "") : null,
              raw_processor_jurisdiction: !detected.procMapped ? String(body.processorJurisdiction ?? "") : null,
              ctrl_mapped: detected.ctrlMapped,
              proc_mapped: detected.procMapped,
              attempt: 1,
              tool_type: "dpa_generator",
              retry_within_budget: true,
            },
          });
        } catch (e) {
          console.warn("[generate-dpa] framework_fallback unconditional telemetry failed:", (e as Error).message);
        }
      }
    }
    let dpa_text = stripEnforcementTags(lint.clean);
    let parsedAnnotations = parsed.annotations;
    // QB-P25 Item 3 — mutable so a retry can overwrite it.
    let parsedDraftingRecord: Record<string, unknown> | null = parsed.drafting_record;

    if (!dpa_text.trim()) {
      throw new Error("AI generation returned an empty document");
    }

    // COUNSEL-VOICE-1 E-checks — deterministic format checks emitted for
    // consumption by run-quality-batch (checks_total / checks_passed).
    let deterministic_checks: any[] = [];
    try {
      const { runFormatChecksDPA } = await import("../_shared/grader/format-checks.ts");
      deterministic_checks = runFormatChecksDPA(dpa_text);
    } catch (e) {
      console.warn("[generate-dpa] format-checks failed non-fatal:", (e as Error).message);
    }

    const buildReportData = () => ({
      enforcement_precedents: enforcement_context.slice(0, 5),
      enforcement_meta: enforcementMeta,
      gdpr_meta: gdprMeta,
      annotations: parsedAnnotations,
      information_needed: Array.isArray((parsed as any)?.information_needed)
        ? (parsed as any).information_needed
        : [],
      deterministic_checks,
      generated_at: new Date().toISOString(),
      // QB-P25 Item 3 — grader-invisible drafting record (stripped by
      // METADATA_KEYS in _shared/grader/payload.ts and by _RESERVED_KEYS
      // in _shared/advisory-voice.ts extractProseFromReport).
      _drafting_record: parsedDraftingRecord,
      _meta: { prompt_version: stampPromptVersion("dpa", "r1b2.3-cv1-ff-2026-07-19") },
    });
    let report_data: ReturnType<typeof buildReportData> = buildReportData();


    try {
      const guarded = guardInformationNeeded(
        { ...report_data, document_text: dpa_text } as Record<string, unknown>,
        (body as unknown) as Record<string, unknown>, "dpa_generator");
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
    const completeWrite = await lifecycleUpdate(supabase, "dpa_documents", rowId, {
      status: "complete",
      intake_data: body,
      document_text: dpa_text,
      report_data,
      lint_warnings: lint.violations,
      updated_at: new Date().toISOString(),
    }, { fn: "generate-dpa", phase: "terminal_complete" });
    if (!completeWrite.ok) {
      await lifecycleUpdate(supabase, "dpa_documents", rowId, { status: "failed", last_error: `terminal_complete: ${completeWrite.message}`.slice(0, 500), updated_at: new Date().toISOString() }, { fn: "generate-dpa", phase: "terminal_fallback" });
      throw new Error(`dpa_documents persist failed: ${completeWrite.message}`);
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
        const retryParsedRaw = parseDpa(retryCall.text);
        // IR-HF1 T4 — attempt-2 suppression BEFORE lint (idempotent).
        const subprocSup2 = suppressSubProcessorFramework(retryParsedRaw.dpa_text, !!body.hasSubProcessors);
        const retryParsed = { ...retryParsedRaw, dpa_text: subprocSup2.text } as typeof retryParsedRaw;
        const retryLint = lintReportText(retryParsed.dpa_text, { checkClauseNumbering: true });
        {
          const spec = detectSpeculativeClauseViolations(retryParsed.dpa_text, {
            hasChildrensData: sectorFlags.hasChildrensData,
            hasHealthData: sectorFlags.hasHealthData,
            hasFinancialData: sectorFlags.hasFinancialData,
            isAI: isAISector,
          });
          const baseline = detectBaselineStandardMisuse(retryParsed.dpa_text, documentType);
          const blacklist = detectBlacklistViolations(retryParsed.dpa_text);
          // FF-DPA nd2 — attempt-2 also runs the engaged-states check so a
          // regenerated draft cannot slip a non-engaged state statute through.
          const engagedStates2 = deriveEngagedStates([
            detected.ctrlCanonical,
            detected.procCanonical,
          ]);
          const engagedStateViolations2 = detectNonEngagedStateAssertions(retryParsed.dpa_text, engagedStates2);
          const subprocContradictions2 = detectSubProcessorContradiction(retryParsed.dpa_text, !!body.hasSubProcessors);
          const s150_2 = detectSection150BreachMisapplication(retryParsed.dpa_text);
          const extras = [...spec, ...baseline, ...blacklist, ...engagedStateViolations2, ...subprocContradictions2, ...s150_2];
          if (extras.length) {
            retryLint.violations.push(...extras);
            try {
              logPostGenLint(supabase, {
                functionName: "generate-dpa",
                fallbackApplied: !!frameworkFallback,
                residualLeaks: extras.length,
                residualResolvedAsks: 0,
                notes: extras.map((v) => ({ code: v.code, detail: v.detail })).slice(0, 40),
                sourceTable: "dpa_documents",
                sourceRowId: rowId,
                extra: { attempt: 2, framework_fallback: frameworkFallback, doc_type: documentType, tool_type: "dpa_generator", retry_within_budget: false, subproc_suppressed: subprocSup2.suppressed },
              });
            } catch (e) {
              console.warn("[generate-dpa] logPostGenLint (attempt 2) failed:", (e as Error).message);
            }
          }
        }
        const repairedText = stripEnforcementTags(retryLint.clean);
        if (repairedText.trim()) {
          parsed = retryParsed;
          lint = retryLint;
          dpa_text = repairedText;
          parsedAnnotations = retryParsed.annotations;
          parsedDraftingRecord = retryParsed.drafting_record;
          report_data = buildReportData();
          try {
            const guarded = guardInformationNeeded(
              { ...report_data, document_text: dpa_text } as Record<string, unknown>,
              (body as unknown) as Record<string, unknown>, "dpa_generator");
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
          await lifecycleUpdate(supabase, "dpa_documents", rowId, {
            status: "failed",
            last_error: `bg: ${errMsg}`.slice(0, 500),
            last_attempt_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { fn: "generate-dpa", phase: "background_catch" });
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
