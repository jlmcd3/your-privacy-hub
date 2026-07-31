// qb8 build active
import { attachDeterministicChecks, extractProseFromReport } from '../_shared/advisory-voice.ts';
import { runFormatChecksGeneric } from '../_shared/grader/format-checks.ts';
import { extractIntakeRoster } from '../_shared/grader/intake-roster.ts';
// run-meter deploy-check v1
// doc-y-7 build marker — R-TURN-3 Turn B: CAL_CIV regex case-fold, comparative-exemption ban in gap/basis fields, owner-roster consistency (prompt rule (d); deterministic post-check deferred).
const DOC_Y_BUILD_MARKER = "doc-y-7";
export const BUILD_STAMP = "gov-t6fix@2026-07-25T23:48:00Z";
console.log(`[run-governance-assessment] boot build_marker=${DOC_Y_BUILD_MARKER} build_stamp=${BUILD_STAMP}`);
console.log(`[run-governance-assessment] boot governance-registry-wiring@2026-07-25T14:03:54Z registry_loaded=governance-va-w1-2026-07-25`);
console.log(`[run-governance-assessment] boot gov-t6fix@2026-07-25T23:47:00Z stage=post-w1 pre-emitgate`);
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { buildSystemContent, type ToolModule, type SystemBlock, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { renderGdprCitationBlock } from "../_shared/gdpr-registry.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { freezeOpenItemsOnFirstRun } from "../_shared/open-items.ts";
import { handleRevisionMode } from "../_shared/revision-mode.ts"; // RC-B.1
import { renderSupplementalBlock } from "../_shared/supplemental-block.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { docY5StripIllustrativeFrequency } from "./_doc_y_5.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";
import { invokeGated } from "../_shared/invoke-gated.ts";
import {
  findingHasV2Deadline,
  isRecommendedActionV2Valid,
  isRegulatoryBasisV2Valid,
} from "./_qbp25_b1_v2.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripMd(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : (() => {
    try { return typeof s === "object" ? JSON.stringify(s) : String(s); }
    catch { return String(s); }
  })();
  return str
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

// ---------------------------------------------------------------------------
// Doc Y post-generation deterministic gates (Governance only).
//   (Y-2) Non-EU/UK runs: strip unlabeled transfer-mechanism sentences.
//   (Y-1) Cal. Civ. Code citation-existence validator with hard-fail on the
//         Readers' Privacy Act / 1798.1xx pairing.
// Non-fatal try/catch; no status/metering writes; console.warn per action.
// ---------------------------------------------------------------------------
const DOC_Y_TRANSFER_TERMS = [
  "standard contractual clauses","scc","binding corporate rules","bcr",
  "adequacy decision","adequacy mechanism","gdpr chapter v","uk gdpr chapter v",
  "transfer impact assessment","transfer risk assessment",
  // Y-2b add: DPF terms.
  "data privacy framework","dpf",
];
// Y-2b add: regex patterns for Chapter V articles 44-49.
const DOC_Y_TRANSFER_REGEXES: RegExp[] = [
  /\bArt(?:icle|\.)?\s*4[4-9]\b/i,
];
// Y-2b add: 'adequacy' triggers only within 12 words of transfer/vendor/cross-border.
const DOC_Y_ADEQUACY_ANCHOR_TOKENS = new Set([
  "transfer","transfers","transferring","vendor","vendors","cross","cross-border","crossborder",
]);
const DOC_Y_ADEQUACY_PROXIMITY = 12;
const DOC_Y_COMPARATIVE_MARKERS = [
  "for comparison","by contrast","unlike the gdpr","unlike gdpr",
  "as compared with the gdpr","compared to the gdpr","compared with the gdpr",
  "for reference only",
  // Note: "analogously" is deliberately NOT a comparative marker (Y-2b).
];
// Y-2b (original): field-token-gated GDPR article strip.
// Y-3: drop the field-contains-'gdpr' precondition. Per-sentence strip when
// the sentence contains a GDPR-style article citation AND (an EU/UK/EDPB/
// authority context token OR the article number is in the GDPR-typical set).
const DOC_Y_GDPR_ARTICLE_RE = /\bArt(?:icle|\.)?\s*\d{1,2}(?:\(\d+\))?(?:\([a-z]\))?/i;
const DOC_Y_GDPR_ARTICLE_NUM_RE = /\bArt(?:icle|\.)?\s*(\d{1,2})\b/i;
const DOC_Y_GDPR_CONTEXT_RE = /\b(?:uk\s*gdpr|gdpr|edpb|wp29|cnil|ico|dpia\s+list)\b/i;
const DOC_Y_GDPR_TYPICAL_ARTICLES = new Set([
  5,6,9,12,13,14,15,17,20,21,22,24,25,27,28,30,32,33,34,35,36,
  44,45,46,47,48,49,
]);
// Cal. Civ. Code allowlist. Values: null = whole section allowed without
// subsection validation; array = allowed subsection letters (enumerated).
const DOC_Y_CAL_CIV_ALLOWLIST: Record<string, string[] | null> = {
  // Breach notification (agencies / individuals)
  "1798.29": null,
  "1798.82": null,
  // Readers' Privacy Act (Cal. Civ. Code §§ 1798.90 - 1798.90.05)
  "1798.90": null,
  "1798.90.05": null,
  // CCPA / CPRA operative sections the tool cites today
  "1798.100": ["a","b","c","d","e"],
  "1798.105": null,
  "1798.106": null,
  "1798.110": null,
  "1798.115": null,
  "1798.120": null,
  "1798.121": null,
  "1798.125": null,
  "1798.130": null,
  "1798.135": null,
  "1798.140": null,
  "1798.145": null,
  "1798.150": null,
  "1798.155": null,
  "1798.185": null,
  "1798.199.10": null,
  "1798.199.40": null,
  "1798.199.90": null,
  "1798.199.100": null,
};

function docYIsEuUkInScope(intake: any): boolean {
  const jl = (Array.isArray(intake?.jurisdictions) ? intake.jurisdictions : [])
    .map((j: any) => String(j).toLowerCase());
  const EU_UK = new Set([
    "gb","uk","united kingdom","eu",
    "at","austria","be","belgium","bg","bulgaria","hr","croatia","cy","cyprus",
    "cz","czechia","czech republic","dk","denmark","ee","estonia","fi","finland",
    "fr","france","de","germany","gr","greece","hu","hungary","ie","ireland","irl",
    "it","italy","lv","latvia","lt","lithuania","lu","luxembourg","mt","malta",
    "nl","netherlands","pl","poland","pt","portugal","ro","romania","sk","slovakia",
    "si","slovenia","es","spain","se","sweden",
  ]);
  const eu = String(intake?.eu_uk_data ?? "").toLowerCase();
  if (eu === "yes" || intake?.eu_uk_data === true) return true;
  return jl.some((j: string) => EU_UK.has(j) || [...EU_UK].some((c) => j.includes(c)));
}

function docYSplitSentences(s: string): string[] {
  return s.split(/(?<=[.!?])\s+(?=[A-Z(“"])/);
}

function docYAdequacyProximityHit(sentLower: string): boolean {
  if (!/\badequacy\b/.test(sentLower)) return false;
  const tokens = sentLower.split(/[^a-z0-9\-]+/).filter(Boolean);
  const adequacyIdx: number[] = [];
  const anchorIdx: number[] = [];
  tokens.forEach((t, i) => {
    if (t === "adequacy") adequacyIdx.push(i);
    if (DOC_Y_ADEQUACY_ANCHOR_TOKENS.has(t)) anchorIdx.push(i);
  });
  return adequacyIdx.some((a) => anchorIdx.some((b) => Math.abs(a - b) <= DOC_Y_ADEQUACY_PROXIMITY));
}

function docYStripTransferSentences(s: string, fieldPath: string): string {
  if (!s || typeof s !== "string") return s;
  const sentences = docYSplitSentences(s);
  const kept: string[] = [];
  for (const sent of sentences) {
    const lower = sent.toLowerCase();
    let hit: string | null = DOC_Y_TRANSFER_TERMS.find((t) => lower.includes(t)) ?? null;
    if (!hit) {
      const rx = DOC_Y_TRANSFER_REGEXES.find((r) => r.test(sent));
      if (rx) hit = `regex:${rx.source}`;
    }
    if (!hit && docYAdequacyProximityHit(lower)) hit = "adequacy~transfer/vendor/cross-border";
    if (!hit) { kept.push(sent); continue; }
    const labeled = DOC_Y_COMPARATIVE_MARKERS.some((m) => lower.includes(m));
    if (labeled) { kept.push(sent); continue; }
    console.warn(`[run-governance-assessment] doc-y transfer-gate removed field=${fieldPath} term="${hit}" sentence="${sent.trim().slice(0,240)}"`);
  }
  return kept.join(" ").replace(/\s+/g, " ").trim();
}

// Y-3: pattern-based GDPR-article strip on US-only runs. No field-token gate.
// Per-sentence: strip when the sentence has a GDPR-style article citation AND
// (sentence carries an EU/UK/EDPB/authority context token OR the article
// number is in the GDPR-typical set), unless the sentence carries a
// comparative label per DOC_Y_COMPARATIVE_MARKERS.
function docYStripUnlabeledGdprSentences(s: string, fieldPath: string): string {
  if (!s || typeof s !== "string") return s;
  const sentences = docYSplitSentences(s);
  const kept: string[] = [];
  for (const sent of sentences) {
    if (!DOC_Y_GDPR_ARTICLE_RE.test(sent)) { kept.push(sent); continue; }
    const lower = sent.toLowerCase();
    const hasCtx = DOC_Y_GDPR_CONTEXT_RE.test(sent);
    let numHit = false;
    const numMatch = sent.match(DOC_Y_GDPR_ARTICLE_NUM_RE);
    if (numMatch) {
      const n = parseInt(numMatch[1], 10);
      if (Number.isFinite(n) && DOC_Y_GDPR_TYPICAL_ARTICLES.has(n)) numHit = true;
    }
    if (!hasCtx && !numHit) { kept.push(sent); continue; }
    const labeled = DOC_Y_COMPARATIVE_MARKERS.some((m) => lower.includes(m));
    if (labeled) { kept.push(sent); continue; }
    console.warn(`[run-governance-assessment] doc-y gdpr-unlabeled removed field=${fieldPath} ctx=${hasCtx?"1":"0"} num=${numHit?"1":"0"} sentence="${sent.trim().slice(0,240)}"`);
  }
  return kept.join(" ").replace(/\s+/g, " ").trim();
}

const DOC_Y_CAL_CIV_RE = /Cal\.?\s*Civ\.?\s*Code\s*(?:§\s*)?(\d{4}\.\d+(?:\.\d+)?)(\([a-zA-Z0-9]+(?:\)\([a-zA-Z0-9]+)*\))?/gi;

function docYValidateCalCivCitations(s: string, fieldPath: string): string {
  if (!s || typeof s !== "string") return s;
  const lowerCtx = s.toLowerCase();
  const readersCtx = lowerCtx.includes("readers' privacy act") || lowerCtx.includes("readers privacy act") || lowerCtx.includes("reader's privacy act");
  return s.replace(DOC_Y_CAL_CIV_RE, (match: string, section: string, sub: string | undefined) => {
    // Y-3c: Readers' Privacy Act paired with a 1798.1xx section is a hard-fail.
    if (readersCtx && /^1798\.1\d\d/.test(section)) {
      console.warn(`[run-governance-assessment] doc-y calciv-hardfail readers/1798.1xx field=${fieldPath} match="${match}"`);
      return "";
    }
    const hasSection = Object.prototype.hasOwnProperty.call(DOC_Y_CAL_CIV_ALLOWLIST, section);
    if (!hasSection) {
      console.warn(`[run-governance-assessment] doc-y calciv-invalid section field=${fieldPath} match="${match}"`);
      return "";
    }
    const allowedSubs = DOC_Y_CAL_CIV_ALLOWLIST[section];
    if (sub && Array.isArray(allowedSubs)) {
      const letter = (sub.match(/^\(([a-z])\)/i)?.[1] || "").toLowerCase();
      if (letter && !allowedSubs.includes(letter)) {
        console.warn(`[run-governance-assessment] doc-y calciv-invalid subsection field=${fieldPath} match="${match}"`);
        return "";
      }
    }
    return match;
  });
}

// Doc Y-5 Defect 2 backstop is imported at the top of the file (see imports).


function docYWalkStrings(obj: any, path: string, fn: (s: string, path: string) => string): void {
  if (obj == null) return;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const v = obj[i];
      if (typeof v === "string") obj[i] = fn(v, `${path}[${i}]`);
      else docYWalkStrings(v, `${path}[${i}]`, fn);
    }
    return;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      if (k === "organisation_profile") continue; // never mutate intake echo
      const v = obj[k];
      if (typeof v === "string") obj[k] = fn(v, `${path}.${k}`);
      else docYWalkStrings(v, `${path}.${k}`, fn);
    }
  }
}

// Y-3 Step 3: deterministic fallback for basis/regulatory fields left empty
// or under 20 chars by the strips. Assembled from the run's US jurisdictions.
const DOC_Y_BASIS_FIELD_RE = /basis|regulatory/i;
function docYBuildUsBasisFallback(intake: any): string {
  const jl = (Array.isArray(intake?.jurisdictions) ? intake.jurisdictions : [])
    .map((j: any) => String(j).toLowerCase());
  const parts: string[] = [];
  const has = (needles: string[]) => jl.some((j: string) => needles.some((n) => j.includes(n)));
  if (has(["us-ca","california"])) parts.push("Cal. Civ. Code § 1798.185; 11 CCR §§ 7150-7157 (risk assessments)");
  if (has(["us-va","virginia"])) parts.push("Va. Code § 59.1-580 (data protection assessments)");
  if (has(["us-co","colorado"])) parts.push("C.R.S. § 6-1-1309 (data protection assessments)");
  parts.push("applicable US state privacy assessment obligations");
  return parts.join("; ");
}

// Y-3b deterministic backstop: on US-only runs, when a single sentence
// co-cites 'DPIA'/'Data Protection Impact Assessment' AND a US statute
// citation AND carries no comparative label, replace the DPIA token with
// 'data protection assessment'. Own-document echoes and labeled comparative
// sentences do not co-cite a US statute in the same sentence and are
// therefore untouched.
const DOC_Y3B_DPIA_TOKEN_RE = /\b(Data Protection Impact Assessments?|DPIAs?)\b/g;
const DOC_Y3B_US_STATUTE_RE = /(C\.R\.S\.|Va\.\s*Code|Cal\.\s*Civ\.\s*Code|11\s*CCR|1798\.|6-1-13|59\.1-5)/i;
const DOC_Y3B_DPIA_SENTINEL_RE = /\bDPIA\b|data protection impact assessment/i;
function docY3bRewriteDpiaCoCitations(s: string, fieldPath: string): string {
  if (!s || typeof s !== "string") return s;
  if (!DOC_Y3B_DPIA_SENTINEL_RE.test(s)) return s;
  const sentences = docYSplitSentences(s);
  const out: string[] = [];
  for (const sent of sentences) {
    if (!DOC_Y3B_DPIA_SENTINEL_RE.test(sent) || !DOC_Y3B_US_STATUTE_RE.test(sent)) { out.push(sent); continue; }
    const lower = sent.toLowerCase();
    const labeled = DOC_Y_COMPARATIVE_MARKERS.some((m) => lower.includes(m));
    if (labeled) { out.push(sent); continue; }
    const replaced = sent.replace(DOC_Y3B_DPIA_TOKEN_RE, (m) => {
      const isPlural = /s$/i.test(m);
      return isPlural ? "data protection assessments" : "data protection assessment";
    });
    console.warn(`[run-governance-assessment] doc-y3b dpia-cocite-rewrite field=${fieldPath} original="${sent.trim().slice(0,240)}" rewritten="${replaced.trim().slice(0,240)}"`);
    out.push(replaced);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function applyDocYPostGeneration(reportData: any, intake: any): void {
  try {
    const euUkInScope = docYIsEuUkInScope(intake);
    if (!euUkInScope) {
      docYWalkStrings(reportData, "report", (s, p) => docYStripTransferSentences(s, p));
      docYWalkStrings(reportData, "report", (s, p) => docYStripUnlabeledGdprSentences(s, p));
      // Y-3 Step 3: coherence backstop for basis/regulatory fields.
      const fallback = docYBuildUsBasisFallback(intake);
      const backfill = (obj: any, path: string): void => {
        if (obj == null || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) backfill(obj[i], `${path}[${i}]`);
          return;
        }
        for (const k of Object.keys(obj)) {
          if (k === "organisation_profile") continue;
          const v = obj[k];
          const p = `${path}.${k}`;
          if (typeof v === "string") {
            if (DOC_Y_BASIS_FIELD_RE.test(k) && v.trim().length < 20) {
              console.warn(`[run-governance-assessment] doc-y3 basis-backfill field=${p} prev_len=${v.trim().length} fallback="${fallback}"`);
              obj[k] = fallback;
            }
          } else {
            backfill(v, p);
          }
        }
      };
      backfill(reportData, "report");
      docYWalkStrings(reportData, "report", (s, p) => docY3bRewriteDpiaCoCitations(s, p));
    }
    docYWalkStrings(reportData, "report", (s, p) => docYValidateCalCivCitations(s, p));
    // Doc Y-5 Defect 2 backstop — runs on ALL geos (not gated by euUkInScope).
    docYWalkStrings(reportData, "report", (s, p) => docY5StripIllustrativeFrequency(s, p));
  } catch (e) {
    console.warn(`[run-governance-assessment] doc-y post-generation error: ${(e as Error).message}`);
  }
}


async function callAnthropic(model: string, system: string | SystemBlock[], user: string, maxTokens = 6000, timeoutMs = 720_000): Promise<string> {
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
  const elapsed = Date.now() - startedAt;
  const usage = d.usage || {};
  console.log(`[run-governance-assessment] stage=callAnthropic model=${model} elapsed=${elapsed}ms stop=${d.stop_reason ?? null} chars=${text.length} cache_read=${usage.cache_read_input_tokens ?? 0} cache_create=${usage.cache_creation_input_tokens ?? 0}`);
  return text;
}

const DOMAIN_DEFINITIONS = [
  { id: 1, name: "Tool Inventory and Sanctioning", key: "tool_inventory", escalate: false,
    prompt: "Assess whether the organisation has a complete, formally sanctioned inventory of technology tools used to process personal data. Review: completeness of inventory, formal approval process, shadow tool detection, DPA review status per tool. Rate severity: Critical/High/Medium/Low." },
  { id: 2, name: "Data Submission Risk", key: "data_submission", escalate: false,
    prompt: "Assess the risk of sensitive or personal data being submitted to external technology tools without appropriate controls. Review: prohibited data categories policy, technical controls enforcing restrictions, employee awareness of data minimisation obligations. Rate severity." },
  { id: 3, name: "Vendor Data Terms Compliance", key: "vendor_terms", escalate: true,
    prompt: "Assess whether vendor data terms for each external tool comply with applicable data protection law. Review: DPA/DPA equivalent signed, data residency compliance, subprocessor review, training opt-out where applicable, transfer mechanism for cross-border processing. Rate severity." },
  { id: 4, name: "Internal Policy Coverage", key: "internal_policy", escalate: false,
    prompt: "Assess whether internal policies adequately govern how employees use technology tools that process personal data. Review: policy existence, data minimisation instruction, prohibited data categories, personal data handling, update recency. Rate severity." },
  { id: 5, name: "Employee Training and Awareness", key: "training", escalate: false,
    prompt: "Assess whether employees understand their obligations when using technology tools that process personal data. Review: onboarding training, periodic refreshers, prohibited submission awareness, escalation path for incidents. Rate severity." },
  { id: 6, name: "Incident Response and Breach Readiness", key: "incident_response", escalate: true,
    prompt: "Assess whether the incident response plan covers data exposure through external technology tools as a notifiable breach scenario. Review: plan coverage, notification timelines, vendor contact procedures, regulatory reporting triggers. Rate severity." },
  { id: 7, name: "Regulatory Exposure Summary", key: "regulatory_exposure", escalate: true,
    prompt: "Map the organisation's data processing activities to applicable regulatory frameworks based on jurisdictions and data types. Identify specific provisions triggered. Rate severity." },
  { id: 8, name: "Privacy Impact Assessment Status", key: "dpia_status", escalate: true,
    prompt: "Assess whether Data Protection Impact Assessments have been conducted for high-risk processing activities. Identify which processing activities require a DPIA under Article 35 GDPR or equivalent. When identifying DPIA triggers, apply the Art. 35(3) subsections precisely as defined in the STATUTE-GLOSS INTEGRITY RULE: (a) applies to automated profiling with significant effects; (b) applies only where special category data (Art. 9(1)) or criminal data (Art. 10) is processed at large scale — NOT to employee monitoring without special category data; (c) applies only to systematic monitoring of publicly accessible PHYSICAL areas (CCTV-type surveillance) — NOT to online tracking, mobile analytics, IoT home monitoring, or digital behavioural profiling. For activities that do not match a specific Art. 35(3) subsection, cite the Art. 35(1) general high-risk threshold and the applicable supervisory authority DPIA list instead of forcing a subsection match. Art. 35(3) is a NON-EXHAUSTIVE LIST OF EXAMPLES of processing that meets the Art. 35(1) high-risk threshold — it is NOT a separate, independent, or parallel obligation. When citing both, present Art. 35(3) as illustrating the Art. 35(1) trigger (e.g. \"Art. 35(1) high-risk threshold; Art. 35(3)(a) is one example of such processing\"), never as a second requirement to be satisfied alongside Art. 35(1). Where whether an Art. 35(3)(b) or (c) trigger applies turns on a fact not established in the intake (e.g. whether special-category data is processed at large scale, or whether monitoring covers a publicly accessible physical area), do NOT conclude that the trigger \"does not apply\" — flag it as a trigger to assess and record the assessment outcome. Rate severity." },
  { id: 9, name: "Data Subject Rights Integrity", key: "subject_rights", escalate: false,
    prompt: "Assess whether the organisation can fulfil data subject rights (erasure, access, portability) for data held by or processed through external technology tools. Rate severity." },
  { id: 10, name: "Privacy Notice Accuracy", key: "privacy_notice", escalate: false,
    prompt: "Assess whether the organisation's privacy notice accurately describes all processing activities including those involving external technology tools. Rate severity." },
];

// ---------------------------------------------------------------------------
// Tool Module factories (prompt-core v2.2). Substantive audited rules are
// preserved verbatim and moved out of the inline domainSystem string.
// ---------------------------------------------------------------------------
export const GOVERNANCE_CITATION_FRAMEWORK = "Cite regulatory bases ONLY for the jurisdictions in the intake. If the intake has no EU/UK jurisdiction, do NOT cite GDPR/UK GDPR/EU authorities anywhere; the number of applicable frameworks must equal the number of intake jurisdictions. In domain findings cite statutes only — no enforcement case names, fines, or SA guidance titles. Name supervisory authorities only from the injected RESOLVED GDPR CITATIONS block; if a jurisdiction is absent from it, write 'the relevant supervisory authority in [country]'. Never name the BfDI for a private-sector controller — Germany private-sector controllers are supervised by the relevant Land authority.";

// PRECEDENT LEDGER (battery-5 seat pass, finding C-4 — owner decision, do not "fix"):
// Governance action-plan timelines carry an illustrative cadence inside the
// "timeline to be set by the organisation (e.g. ...)" formulation. This is an owner-approved
// exception to Principle 1's no-illustrated-values clause, scoped to Governance timelines ONLY.
// It is not licence for illustrated values in any other tool or field. Reviewer proposals to
// strip the e.g. cadence are not adopted. Owner (role) assignments are approved product
// structure. Motivating finding and decision: EUP_Battery5_Seat_Findings_Adjudication.md (C-4).
export function buildGovernanceSharedRules(jurisdictions: unknown, euUkData: string): string {
  const intakeJurisdictionsJson = JSON.stringify(Array.isArray(jurisdictions) ? jurisdictions : []);
  const euUkValue = euUkData || "not specified";
  const jurisdictionList = (Array.isArray(jurisdictions) ? jurisdictions : []).map((j) => String(j).toLowerCase());
  const hasIreland = jurisdictionList.some((j) => j.includes("ireland") || j === "ie" || j === "irl");
  // Doc L: gate GDPR-specific rule content on EU/UK scope, mirroring the
  // gdprCitationsBlock derivation at ~line 472. hasEuUk is true when the
  // intake lists any EU/EEA member state or the UK, OR eu_uk_data === "Yes".
  const EU_UK_CODES = new Set([
    "gb","uk","united kingdom","eu",
    "at","austria","be","belgium","bg","bulgaria","hr","croatia","cy","cyprus","cz","czechia","czech republic",
    "dk","denmark","ee","estonia","fi","finland","fr","france","de","germany","gr","greece","hu","hungary",
    "ie","ireland","irl","it","italy","lv","latvia","lt","lithuania","lu","luxembourg","mt","malta",
    "nl","netherlands","pl","poland","pt","portugal","ro","romania","sk","slovakia","si","slovenia",
    "es","spain","se","sweden",
  ]);
  const hasEuUk = String(euUkData || "").toLowerCase() === "yes"
    || jurisdictionList.some((j) => EU_UK_CODES.has(j) || [...EU_UK_CODES].some((c) => j.includes(c)));
  const hasCalifornia = jurisdictionList.some((j) => /california|^ca$/.test(j));
  const hasColorado = jurisdictionList.some((j) => /colorado|^co$/.test(j));
  const hasVirginia = jurisdictionList.some((j) => /virginia|^va$/.test(j));
  const hasAnyUsState = hasCalifornia || hasColorado || hasVirginia
    || jurisdictionList.some((j) => /texas|florida|washington|oregon|utah|connecticut|montana|iowa|indiana|tennessee|delaware|new hampshire|new jersey|maryland|minnesota|kentucky|rhode island|nebraska|maine|illinois|^tx$|^fl$|^wa$|^or$|^ut$|^ct$|^mt$|^ia$|^in$|^tn$|^de$|^nh$|^nj$|^md$|^mn$|^ky$|^ri$|^ne$|^me$|^il$/.test(j));
  return `LANGUAGE: use the English variant matching the intake's jurisdictions — American English when no EU/UK jurisdiction is present; British English when any EU/UK jurisdiction is present. Never mix variants within one report. (This overrides the core's default American-English rule for this jurisdiction-aware tool.)

CITATION INTEGRITY: Cite provisions ONLY in the exact forms below. If you cannot match a citation to one of these patterns with certainty, name the law and obligation in plain language instead (e.g. 'CCPA — service provider contract requirement') rather than fabricate.
- Illinois BIPA: only the form "740 ILCS 14/<section>" (e.g. 740 ILCS 14/15(b)). NEVER write "§15-101", "§15-2", "§1401", "15 ILCS", or "15 USC".
- Colorado CPA: only "C.R.S. §6-1-1301" through "§6-1-1313". Consumer rights §6-1-1306; controller duties §6-1-1308; processor duties §6-1-1305; data protection assessments §6-1-1309.
- Virginia VCDPA: only "Va. Code §59.1-575" through "§59.1-585". Consumer rights §59.1-577; controller duties §59.1-578; processor duties §59.1-579; data protection assessments §59.1-580.
- CCPA/CPRA right to correct is §1798.106. NEVER cite §1798.120 (that is opt-out of sale) or §1798.100(a)(2) for the right to correct.
- §1798.150 is ONLY the data-breach private right of action. Do not cite §1798.150 for any other proposition.
- The CPRA service provider definition is §1798.140(ag).
- UK DPA 2018 Schedule 1 contains special-category processing conditions ONLY. Never cite Schedule 1 for general processing principles. The UK GDPR has NO Schedules — do not invent any.
- There is NO French "Data Protection Act 2018". NEVER write "Data Protection Act 2018 (France …)", "(France and UK implementation)", or otherwise attach the DPA 2018 to France. France's implementing statute is the Loi Informatique et Libertés (as amended); cite the operative provision as a GDPR article ("GDPR Art. X", or "UK GDPR Art. X" for the UK) and name the CNIL as supervisory authority. NEVER attach a GDPR article number to the Loi — do not write "Loi Informatique et Libertés Art. 57", "Loi … Articles 15–22", or similar; the Loi has its own separate numbering that does not mirror the GDPR's, so refer to it only generally as France's implementing and supplementary framework (enforced by the CNIL). A "Data Protection Act 2018" exists only for the UK and Ireland, and may be referenced only when that jurisdiction is in the intake. NEVER cite any other French statute or code for GDPR obligations — in particular never the Code monétaire et financier, the Code civil, the Code du travail, or any invented "Article R./L./D. …" number. For France, cite the operative obligation as a GDPR article and name the CNIL; refer to French implementing law only generally as the Loi Informatique et Libertés (as amended). If you cannot ground a specific French provision in the supplied context, state the obligation at GDPR-article level rather than inventing a French citation.
- UK GDPR DATA-SUBJECT-RIGHTS DEADLINE: the response deadline for a data subject request under GDPR Art. 12(3) AND UK GDPR Art. 12(3) is ONE MONTH from receipt, extendable by two further months for complex or numerous requests — the two regimes are identical here. NEVER state a "45-day" UK or EU deadline (45 days is the CCPA/US figure), and DPA 2018 Schedule 1 does NOT extend or modify the Art. 12(3) deadline.
- DIRECTLY-APPLICABLE GDPR — NO SUPPLEMENTARY NATIONAL LAYER: GDPR and retained UK GDPR are directly applicable; national implementing laws do NOT create a separate or "supplementary" obligation layer on top of them. For breach notification (Arts. 33/34) and data-subject rights (Arts. 12–22), state the obligation as a GDPR / UK GDPR article and name the competent authority (CNIL, ICO, etc.) — do NOT describe the Loi Informatique et Libertés or DPA 2018 as imposing "supplementary requirements," and do NOT cite DPA 2018 Schedule 1 for data-subject-rights accountability (those rights flow from UK GDPR Arts. 12–22; Schedule 1 governs special-category / criminal-offence-data conditions only).
${hasIreland ? `- Ireland: NEVER cite specific Irish Data Protection Act 2018 section numbers. Cite the GDPR article directly and refer to "the Data Protection Act 2018 (Ireland)" generally. There is NO general registration or notification requirement with the Irish DPC.` : ``}
- GDPR Recital 47 concerns legitimate interests only. Recital 39 concerns transparency and awareness. Do not swap them.
- DPO awareness-raising and training tasks are Article 39(1)(b), NOT Article 37(5). Article 37 has no SME or sector exemption — do not assert one.
${hasEuUk ? `- DEFINITIONAL-ARTICLE RULE: GDPR Article 4 contains definitions only and must NEVER be cited as the legal basis of an obligation. For consent requirements, cite Article 6(1)(a) and Article 7 (Article 4(11) merely defines consent). For staff/personnel obligations, use the precise GDPR articles below — never cite bare "Article 29" without the surrounding context:
  • Article 28(3)(a) — processor (and its staff) must process personal data only on documented instructions from the controller. Cite this when the obligation flows from a controller-processor relationship.
  • Article 29 — any natural person acting under the authority of the controller or processor who has access to personal data shall not process those data except on instructions from the controller (a one-sentence article; it does NOT govern DPO appointment, which is Articles 37–39). Cite this for the duty itself, not for confidentiality.
  • Article 32(4) — the controller and processor must take steps to ensure that any natural person acting under their authority who has access to personal data does not process them except on instructions from the controller, unless required by Union or Member State law, and is committed to confidentiality or under a statutory obligation of confidentiality. Cite this for the staff-confidentiality obligation specifically.
  Do not pair "Article 29" with "(staff confidentiality)" — confidentiality is Article 32(4). Do not pair "Article 29" with "(DPO duties)" — DPO duties are Articles 37–39.` : ``}

VENDOR NAMING RULE: Name ONLY vendors that are explicitly provided in the intake. Never introduce additional vendor or company names that the organisation did not list.

OUTPUT HYGIENE RULE: Emit only clean, final report prose. NEVER include self-correction notes, editorial asides, meta-commentary, reviewer-style remarks, or bracketed notes such as "[CORRECTION: …]", "[disregard sentence …]", "[Note: …]", or "(based on …)" in the output. If any rule causes you to begin a sentence or recommendation that turns out not to apply to this intake, OMIT it entirely — do not write it and then retract, annotate, or correct it. The reader must see only the finished assessment.

AI VENDOR DATA-HANDLING RULE: This rule applies ONLY to generative-AI / LLM tools explicitly named in the intake technology tools list (e.g. Microsoft 365 Copilot, Google Workspace / Gemini, ChatGPT Enterprise, Anthropic Claude). For such a tool, never assert as fact that it uses tenant data for AI model training. Frame any such concern as "verify [AI vendor]'s data-handling and model-training commitments for the tenant", substituting the actual vendor named in the intake. If the intake lists NO generative-AI / LLM tool, do not emit any such verification instruction, and never introduce an AI vendor that the organisation did not list — this is subordinate to the VENDOR NAMING RULE above.

EVIDENCE-BASIS SEVERITY RULE (calibration): Severity tiers mean exactly: Critical = no controls in place; High = controls exist but are materially incomplete; Medium = controls mostly in place with identified gaps, OR a control whose status cannot be confirmed from the intake; Low = minor gaps only; Compliant = requirements met. Apply this evidentiary discipline when assigning severity, and apply it identically in domain findings and in the synthesis:
- EVIDENCE GAP vs CONFIRMED DEFICIENCY. When an intake answer for a control is an explicit statement of uncertainty ("Unsure", "Don't know", "Not sure", "Uncertain") or renders as "not specified"/blank, that is an EVIDENCE GAP, not a confirmed deficiency. (a) Cap that domain's severity at Medium; do NOT rate it High or Critical on the basis of the uncertainty alone. (b) Never describe it as "no controls in place", "absence of controls", "controls are missing", or "controls are absent" — that Critical-tier language is reserved for a CONFIRMED negative answer ("No", "None"). (c) Frame gap_description and recommended_action as "[control] cannot be confirmed from the intake — verify, and if found absent, remediate". (d) Do NOT elevate an evidence-gap-only finding into top_three_risks; a top-three risk must rest on a confirmed deficiency.
- CREDIT CONFIRMED ADJACENT CONTROLS. Where the intake confirms a related control bearing on the same risk, do not characterise the area as having "no controls in place" merely because a different control is unconfirmed. State what is confirmed and what is unverified.
- THIS RULE NARROWS ONLY UNKNOWNS. A confirmed negative ("No"/"None"), a confirmed partial gap ("Most"/"Some"), or a confirmed material inadequacy is still rated at its genuine severity, which may be Critical or High.

ENFORCEMENT CASE RULE: Do NOT reference specific enforcement case names, fine amounts, or regulator decisions in any domain field. Enforcement precedents are injected only into the synthesis stage. Domain findings must cite statutes only.

JURISDICTION SCOPING RULE (critical): Cite regulatory bases ONLY for the jurisdictions listed in the intake jurisdictions field provided below. If eu_uk_data is "No", do NOT cite GDPR, UK GDPR, EU member-state law, or any EU/UK authority anywhere in the report. Never reference a country absent from the intake, and do not name any example country that is not in the intake jurisdictions list. The number of "applicable regulatory frameworks" must equal the number of intake jurisdictions.

INTAKE JURISDICTIONS: ${intakeJurisdictionsJson}
EU_UK_DATA: ${euUkValue}

ARTICLE 32 SUBSECTION PRECISION: Art. 32(1) = the general obligation to implement appropriate technical/organisational security measures. Art. 32(4) = the narrower obligation that persons acting under the controller/processor's authority process data only on instructions (a staff-confidentiality provision, not a general security-measures provision). When describing 'appropriate measures' for breach remediation or security generally, cite Art. 32(1) — reserve Art. 32(4) specifically for staff-instruction/confidentiality contexts.

ARTICLE 35 SUBSECTION PRECISION: Art. 35(1) = the general DPIA obligation, triggered where processing is 'likely to result in a high risk.' Art. 35(3)(a)–(c) = specific enumerated processing types that are illustrative examples of the Art. 35(1) threshold (NOT independent triggers separate from 35(1)). Do not present 35(3)(a) or (c) as standalone triggers, and do not write that '35(3) does not apply' in the same passage that asserts a DPIA is mandatory under 35(1) on the same facts — state plainly which provision is engaged: 35(1) if the WP248 high-risk criteria are met, and additionally cite the specific 35(3) subparagraph only if an enumerated type is also present.

STATUTE-GLOSS INTEGRITY RULE (US / UNCONDITIONAL): When citing a statute at the section/subsection level, the parenthetical gloss must match that exact subsection. If unsure of the subsection, cite at the statute level only. Verified anchors — CCPA: §1798.100 notice/collection; §1798.105 right to DELETE; §1798.106 right to CORRECT; §1798.110 right to know; §1798.120 opt-out of sale/sharing; §1798.121 limit SPI; §1798.130 request methods; §1798.135 opt-out links; §1798.140(ag) service-provider definition; §1798.150 breach private right of action. §1798.100(d) = service-provider/third-party CONTRACT requirements — the agreement must (1) limit purposes, (2) obligate the same level of privacy protection, (3) grant the business oversight rights, (4) require the service provider to notify the business if it determines it can no longer meet its obligations, and (5) grant stop-and-remediate rights. §1798.100(d) does NOT itself impose a breach-notification timeline — never gloss it as requiring breach notification 'without unreasonable delay' or any notification deadline. §1798.100(d) is never authority for the controller's OWN internal obligations (employee training, internal security programmes) — it governs only what contracts with service providers and third parties must contain. And never describe §1798.100(d)'s contract elements using GDPR numbering ('Art. 28(3)(a)–(e)') or attribute any GDPR article enumeration to a California statute — where a GDPR parallel is genuinely useful in a narrative field, label it as a comparison and keep the California citation free of GDPR article numbers. And never present Cal. Civ. Code §1798.82 as part of the CCPA — it is the pre-existing breach-notification statute in Title 1.81 (Customer Records); cite it by section, not under a 'CCPA' label. There is NO §1798.104. BIPA 740 ILCS 14/15: (a) retention/destruction policy; (b) informed written consent; (c) no profit; (d) disclosure restrictions; (e) reasonable safeguards. DSR response deadlines (US): CCPA 45 days (extendable 45); Colorado 45 days; Virginia 45 days. California breach notification (Cal. Civ. Code §1798.82, as amended by SB 446): for breaches occurring on or after 1 January 2026, notification to affected California residents is due within 30 calendar days of discovery or notification of the breach, subject to the law-enforcement and scope-determination carve-outs — cite using the canonical form in CORE-3(d). The pre-2026 "most expedient time possible and without unreasonable delay" standard governs only incidents predating 1 January 2026; never present it as the currently operative standard. AG receives a SAMPLE COPY within 15 days of consumer notice when MORE THAN 500 CA residents are affected.
${hasEuUk ? `
STATUTE-GLOSS INTEGRITY RULE (GDPR): GDPR anchors — Art 24 accountability; Art 28(3)(b) processor confidentiality undertaking; Art 32(1)(b) confidentiality/integrity/availability/resilience; Art 32(4)/29 act-only-on-instructions (NOT a confidentiality provision — confidentiality is Art 28(3)(b)); Art 37 = WHEN a DPO must be designated (37(1)(b) systematic monitoring; 37(1)(c) large-scale special categories), NOT DPO tasks; Art 39 = DPO TASKS (39(1)(a) inform/advise; 39(1)(b) monitor compliance incl. awareness-raising and staff training; 39(1)(e) cooperate with the SA) — cite DPO tasks as Art 39, never Art 37; Art 77 = right to lodge a complaint with a supervisory authority, in particular in the data subject's habitual residence, place of work, or place of the alleged infringement (a privacy-notice complaint-rights disclosure must reflect Art 77 generally, not restrict it to the lead/main-establishment SA). Art 13(2) subsections: (a) = the storage period, or the criteria used to determine it (cite Art 13(2)(a) for retention-period / storage-limitation transparency and for erasure/retention-limitation disclosure — NOT (e)); (b) = the rights enumeration (access, rectification, erasure, restriction, object, portability); (d) = right to lodge a complaint with a supervisory authority; (e) = whether providing the data is a statutory/contractual requirement and the consequences of failure. Cite the data-subject rights enumeration as Art 13(2)(b) — do NOT cite (e) for it, and do NOT cite (e) for retention-period transparency (that is (a)). Art 28(3)(f) = processor assistance with the controller's Arts 32–36 obligations (security, breach notification, DPIA, prior consultation) ONLY — do NOT cite Art 28(3)(f) as a basis for general accountability, tool inventory, or vendor-sanctioning governance; the bases for those are Art 5(2) (accountability), Art 24 (controller responsibility), and Art 32(1) (security measures). DSR response deadline (GDPR/UK GDPR): one month from receipt under Art 12(3), extendable by two further months for complex or numerous requests.` : ``}

Virginia breach notification: Va. Code §18.2-186.6 requires notice "without unreasonable delay" — NO statutory 60-day deadline. Texas breach notification: Tex. Bus. & Com. Code §521.053 "without unreasonable delay" — NO 60-day deadline. TDPSA is Tex. Bus. & Com. Code Chapter 541 — do NOT cite it as §343.001. Dutch implementing law is the UAVG (the WBP/WBPG was repealed in 2018 — never cite it). Florida Digital Bill of Rights (FDBR) applicability gate: cite only when thresholds confirmed; otherwise cite Fla. Stat. §501.171 for breach. Illinois BIPA applicability gate: cite 740 ILCS 14/15 only when the intake confirms biometric collection AND Illinois residents. GDPR Art. 35(3): (a) systematic and extensive automated profiling with significant effects; (b) large-scale Art. 9(1) special-category or Art. 10 criminal data — NOT general employee monitoring; (c) systematic monitoring of a PUBLICLY ACCESSIBLE PHYSICAL AREA (CCTV-type). Online tracking, mobile analytics, and IoT/website profiling are NOT (3)(c) — they fall under (3)(a) or the Art. 35(1) general threshold.

CORE-3 NEGATIVE CITATION RULES (apply per prompt-core CITATION SUBJECT-MATTER MUST MATCH THE CLAIM):
(a) TRAINING regulatory_basis — do NOT cite Cal. Civ. Code §1798.100(d) as authority for an EMPLOYER TRAINING obligation. §1798.100(d) governs SERVICE-PROVIDER CONTRACT restrictions, not employer training. Rely on the Colorado (C.R.S. §6-1-1308) and Virginia (Va. Code §59.1-574) controller-obligation citations already present, or frame training as an operational best practice supporting those statutes' controller duties without a specific §1798.100(d) pairing.
(b) VENDOR_TERMS regulatory_basis — do NOT cite Cal. Civ. Code §1798.82 as authority for a DPA CONTENT requirement. §1798.82 is BREACH NOTIFICATION, not DPA content. Cite §1798.100(d), C.R.S. §6-1-1308(3)(a), and Va. Code §59.1-579 for DPA content requirements. This exclusion applies to EVERY citation, basis, and authority field outside the incident_response domain — vendor_terms, training, dsr_workflow, and all other domains never cite §1798.82 for any purpose; the breach-notification citation lives in incident_response only.
(c) DATA-PORTABILITY citation — do NOT cite §1798.110 for portability. §1798.110 is right-to-know-what's-collected. For the right to receive personal information in a readily useable format, cite Cal. Civ. Code §1798.130(a)(2).
(d) CALIFORNIA BREACH-NOTIFICATION deadline citation — state as: "Cal. Civ. Code § 1798.82 (breach notification within 30 days of discovery; in force since 1 January 2026 (SB 446), subject to the law-enforcement and scope-determination carve-outs)". This verified fact is stated in FULL exactly ONCE per document, in the single most relevant location; later mentions cross-reference it and never restate the parenthetical (per VERIFIED FACTS ARE STATED ONCE). Do NOT use the ambiguous "without unreasonable delay; 30-day timeline" phrasing that reads as two competing standards — the operative post-SB-446 language is the 30-day deadline (subject to the carve-outs above). Frame the "in force since" clause per the TEMPORAL FRAMING RULE: on any assessment dated on/after 1 January 2026 the clause reads as operative; if the assessment date is genuinely before 1 January 2026, replace with "takes effect 1 January 2026 (SB 446)".
${hasCalifornia ? `(e) PRODUCT-FIX-2 T2(a) — CATEGORIES-OF-SOURCES citation: Cal. Civ. Code §1798.100(c) does NOT enumerate "categories of sources from which personal information is collected". §1798.100(c) is a data-minimization / proportionality provision ("A business's collection, use, retention, and sharing of a consumer's personal information shall be reasonably necessary and proportionate…"). Categories of sources belong to the notice-at-collection requirement at Cal. Civ. Code §1798.130(a)(5)(B) and the right-to-know at §1798.110(c)(2). NEVER pair §1798.100(c) with a "categories of sources" gloss; cite §1798.130(a)(5)(B) or §1798.110(c)(2) instead. If the finding is about minimization/proportionality, keep §1798.100(c) but the gloss must read "collection, use, retention, and sharing must be reasonably necessary and proportionate to the disclosed purposes" — never "categories of sources".` : ``}
${hasColorado || hasVirginia ? `(f) PRODUCT-FIX-2 T2(b) — SECURITY-PROGRAM authority pins (CO / VA): the reasonable-security-safeguards duty is anchored at C.R.S. §6-1-1308(5) (controller duty of care — reasonable data-security practices) and Va. Code §59.1-578(A)(3) (establish, implement, and maintain reasonable administrative, technical, and physical data-security practices). NEVER cite C.R.S. §6-1-1308(2), §6-1-1308(2)(a), or Va. Code §59.1-578(2)/(A)(2) as authority for a security-program duty — §6-1-1308(2) is the duty of purpose specification (the duty of transparency / privacy-notice contents is §6-1-1308(1)) and Va. Code §59.1-578(A)(1) is data-minimization ("adequate, relevant, and reasonably necessary") and (A)(2) is the secondary-use/purpose limit. Whenever the training or security-program regulatory_basis needs a CO/VA anchor, the pins are §6-1-1308(5) and §59.1-578(A)(3) respectively — treat other subsections in those sections as WRONG SUBJECT-MATTER for security duties.` : ``}
(g) POST-GOVERNANCE-FIX-1 T2(a) — JURISDICTION-GATED CITATION RULES: rules (a)–(f) above apply ONLY when the corresponding jurisdiction is present in the intake — California-specific rules apply only when California is engaged; C.R.S. rules only when Colorado is engaged; Va. Code rules only when Virginia is engaged; BIPA (740 ILCS 14/*) only when Illinois is engaged. Never cite a US-state statute as the regulatory basis for a finding when that state is absent from the intake, and never rely on a US-state citation as a fallback when the intake is EU/UK-only. Where the intake is EU/UK-only, use the GDPR/UK GDPR anchors and, if truly no operative anchor is engaged, name the obligation in plain language rather than reaching outside the intake's engaged jurisdictions.

VENDOR AI-TRAINING LANGUAGE IS VERIFICATION FRAMING, NEVER A PRESUMED PROHIBITION: where a vendor may use personal data for AI model training or optimisation, the recommended action is to verify and document that any such use is (i) disclosed in the privacy notice, (ii) within the stated processing purposes, and (iii) contractually restricted per §1798.100(d) — never a blanket demand for confirmation that training use is prohibited, which depends on the parties' arrangement.



DPO RULE: Frame the GDPR Art. 37 DPO question identically in every domain: "assess and document whether Art. 37(1) triggers apply." Never assert appointment is mandatory, and never give "cross-border processing" as an Art. 37 trigger — it is not one. Do NOT inject the Art. 37(1) DPO-designation question into the DPIA-Status domain's findings or recommended actions — DPO designation is a distinct governance matter, not part of DPIA scope. Raise Art. 37(1) only in its own governance context, OR, if a genuine link exists, state the conditional link explicitly (e.g. "if the DPIA identifies new high-risk processing, reassess whether the Art. 37(1)(b)/(c) DPO-designation triggers are met") rather than appending a free-standing DPO-designation step.

VENDOR CLASSIFICATION RULE: Do not assume all vendors are processors. For each named technology vendor, identify whether it is acting as: (a) a processor; (b) a joint controller; or (c) an independent controller. Flag the classification as requiring legal confirmation rather than asserting it. Where genuinely uncertain (e.g. a generative-AI / LLM platform), say so explicitly: "The controller-processor boundary for [vendor] depends on the tenant configuration and enterprise commitments in place — the organisation must confirm and document the classification before executing a DPA." Never describe the absence of a DPA as meaning "no lawful basis exists for processing" — the correct framing is "processing without an Art. 28-compliant contract is a GDPR violation, but the absence of a DPA does not by itself extinguish all lawful bases for the underlying processing activity."

VENDOR PRODUCT CLASSIFICATIONS COME FROM INTAKE ONLY: never assert what kind of product or platform a named vendor is (e.g. 'generative-AI / LLM platform', 'data broker', 'adtech platform') unless the intake states it. Where AI/ML data-handling verification is the point, use capability-neutral phrasing: 'platforms that may incorporate AI/ML features and whose data handling for model training or optimisation should be verified.'

NO RESOLUTION-METHOD PRESCRIPTION: where a determination is left to the organisation (a vendor classification, a lawful-basis selection, a scope or applicability decision), state that the organisation must resolve and document it, citing the governing provision — and stop. NEVER direct a specific resolution method: no 'consult legal counsel', 'seek legal advice', 'commission an audit', 'engage a consultant', or any equivalent. The choice of method belongs to the organisation. This rule governs findings, recommended actions, and every narrative field; it does not alter the report-level disclaimer, which is fixed system-supplied text.

BODY-TEXT COUNSEL-REFERRAL ZONE DISCIPLINE (POST-GOVERNANCE-FIX-1 T2(b)): counsel-ownership language ("Legal Counsel must", "legal counsel must review", "outside counsel must", "your qualified counsel must", "your DPO or legal counsel must") is sanctioned ONLY in the preamble/closing ownership-disclaimer zones (the report-level "This document is not legal advice…" banner, the disclaimer field, and analogous closing zones). In body text — findings, gap_description, recommended_action, current_state, priority_actions, executive_summary, and every other reader-facing domain field — actions are assigned to internal owner roles the intake establishes — for example, where the intake names them: DPO, CISO, HR lead, Head of Vendor Management, Privacy Program Manager, the head of the affected business unit. Never write "The DPO (or designated privacy lead) must, in coordination with the CISO and Legal Counsel, complete the following" mid-document; where the intake establishes both roles: "The DPO, working with the CISO, must complete the following". Reserve external referral entirely for the disclaimer zone. ALLOWED-ROLES DISCIPLINE (PRODUCT-FIX-5 T3): action owners in every field (immediate actions, priority_actions, recommended_action, suggested_owner, roadmap) may ONLY be (i) roles/positions the intake itself establishes (named roles, described functions — e.g. "a senior IT manager acting as informal privacy lead" may be referenced exactly as the intake describes it), or (ii) the generic form "the organisation's [function] lead (role to be designated)". NEVER assign an action to a role the intake does not establish — no CISO, Head of Vendor Management, Privacy Program Manager, DPO, or any titled position unless the intake names it or an equivalent. Inventing an organisational position is an unsupported business claim. PF6 T5 ROLE-REFERENCE DISCIPLINE (EXTENDS PRODUCT-FIX-5 T3): recommended_action, priority_actions, current_state, gap_description, and every other reader-facing field reference ONLY roles the intake establishes AND ONLY BY THE INTAKE'S OWN DESCRIPTION — e.g. where the intake describes an informal privacy lead, refer to them as "the informal privacy lead" (using the intake's exact framing), NEVER as "the organisation's designated compliance function", "the compliance function", "the privacy office", "the compliance team", "the governance committee", "the data protection function", or any other organisational construct the intake does not establish. Where a role is needed but not established, phrase the item as a DESIGNATION action ("designate an owner for [named domain — e.g. vendor-risk management, records-of-processing maintenance]") rather than asserting the role exists. NEVER assert the existence of a function, team, committee, office, or programme the intake does not establish; the presence of an "informal privacy lead" does not entail a "compliance function" or any other formalised structure. DOMAIN-SCOPE DISCIPLINE (PF6 T5): recommendations MUST NOT extend the operational domain beyond what the intake establishes — where the intake describes training scope, data categories, staff coverage, product surface, customer base, or any other domain-defining fact, action items name only those elements; NEVER expand a training programme to "clinical research", "marketing analytics", "product engineering", or any adjacent domain the intake does not identify. Where a broader scope may be appropriate, surface the missing element as an information_needed / conditional item, not as an assertion that broader scope is engaged. REGULATORY-STATUS CLAIMS (PRODUCT-FIX-5 T3d): never assert that the organisation is a HIPAA covered entity or business associate, that data constitutes PHI, or any analogous regulatory classification (GLBA institution, NYDFS covered entity, etc.) unless the intake establishes it. Where sector context makes a classification plausible but unestablished, frame conditionally: "if [organisation] is a HIPAA covered entity or business associate — a determination the record does not resolve — then…" with the canonical advisory close.

EVIDENCE-BOUND VENDOR CLAIMS (POST-GOVERNANCE-FIX-1 T2(c)): vendor-posture and vendor-compliance findings NEVER escalate absence-of-evidence into an affirmative claim of absence. Where the intake merely does not record whether a vendor has a compliant DPA, an Article 28-compliant agreement, or any other artefact, the finding uses intake-faithful phrasing: "The intake does not evidence a verified Article 28-compliant DPA with [vendor]", "DPA status for [vendor] is not verified in the intake — verify existence, currency, and Article 28 sufficiency", "[vendor]'s data-handling commitments are not confirmed on the record". NEVER write "[vendor] lacks a verified, up-to-date Article 28-compliant DPA", "no DPA exists", "the vendor has no DPA", or any equivalent asserting absence, unless the intake explicitly says the artefact is absent. This applies to DPAs, sub-processor lists, TIAs, SCCs, ROPA entries, vendor security attestations, and every other vendor artefact.



TESTING RECOMMENDATIONS STATE THE OBJECTIVE, NOT THE METHODOLOGY: recommended actions may direct that a workflow be tested and documented, but never prescribe testing scope or method ('at least one representative request per tool'). Canonical form: 'document the testing plan for the workflow, including which tools will be tested and the acceptance criteria for end-to-end functionality and timeliness, and conduct the test.' Additionally, where Colorado (C.R.S. § 6-1-1309) and Virginia (Va. Code § 59.1-580) assessment duties are cited in dpia_status on a run that includes California, state once: 'The CCPA does not impose a data protection assessment requirement analogous to C.R.S. § 6-1-1309 or Va. Code § 59.1-580; California risk-assessment obligations arise separately under Cal. Civ. Code § 1798.185 and 11 CCR §§ 7150–7157 where applicable.'

TIMELINE VOICE: timelines in domain findings and action plans belong to the organisation. Where a statutory or regulatory provision supplies a concrete deadline for the action (e.g. the 72-hour supervisory-authority notification window under Art. 33(1), or a named compliance date in an applicable law), state that deadline with its citation — e.g. 'within 72 hours of awareness — Art. 33(1)'. For every other action, never state a bare invented deadline: use exactly the form 'timeline to be set by the organisation (e.g. within 30 days)', where the parenthetical carries one illustrative cadence per action component, proportionate to the finding's severity (within 7 days / within 30 days / this quarter / this year / ongoing). Owner (role) assignments are unaffected by this rule.

REPETITION AND DEADLINES RULE: Immediate-action deadlines must be staggered realistically: 7 days only for actions executable unilaterally; 30 days for policies and training rollout; "this quarter" for negotiated outcomes such as executed vendor DPAs and completed DPIAs. Never assign the same deadline to all ten actions.

AI VENDOR VERIFICATION REPETITION RULE — STRICT: When the intake names a generative-AI / LLM tool, the full verification instruction must appear IN FULL in exactly ONE place: the Domain 3 (Vendor Data Terms Compliance) recommended action. In every other domain where the AI tool is relevant, use only this cross-reference: "([AI tool] data-handling and model-training commitments: see the Vendor Data Terms Compliance recommended action.)" A duplicate full instruction across multiple domains is a fatal output error. If the intake names NO generative-AI / LLM tool, this rule does not apply.

SUPERVISORY AUTHORITY NAMING RULE: Name supervisory authorities ONLY from the injected RESOLVED GDPR CITATIONS block. If a jurisdiction is absent from that block, write "the relevant supervisory authority in [country]". For German private-sector controllers, name the relevant Land authority (e.g. BayLDA for Bavaria) — never the BfDI, which supervises only federal public bodies, telecoms, and postal services.

SUPERVISORY AUTHORITY GUIDANCE DOCUMENTS RULE: Do not cite specific SA guidance documents, opinions, recommendations, or working papers by title or section number unless the document is listed in the ENFORCEMENT PRECEDENTS block provided in this prompt. To reference SA guidance generally, write "the [SA] has published guidance on this topic — verify the current version at [SA]'s website". Acceptable without source block: "EDPB Guidelines [number]/[year]" if certain; "WP248" (DPIA); "WP259" (consent).

ONE-STOP-SHOP RULE: For controllers with a main establishment in an EU member state processing personal data across multiple EU states, the lead supervisory authority mechanism under GDPR Art. 56 means enforcement is primarily led by the SA of the member state of main establishment, with concerned SAs having involvement rights under Arts. 60–62. Exception: where there is no single EU main establishment, each SA retains independent jurisdiction and the one-stop-shop does not apply.

TERMINOLOGY RULE: DPA expands to "Data Processing Agreement" only. Do not describe a missing privacy notice as making processing "presumptively unlawful under Article 6" — a transparency failure breaches Arts. 13/14; keep lawfulness and transparency distinct (and omit both when GDPR is out of scope).

CITATION-FORM CONSISTENCY RULE: Use the SAME citation form for the GDPR everywhere in the document. Acceptable forms are "GDPR Art. X" (for EU GDPR) and "UK GDPR Art. X" (for UK GDPR). Do NOT prefix a GDPR citation with a country name — never write "France — GDPR Art. 32(4)", "France GDPR Art. X", or "(France and UK implementation)"; the GDPR applies uniformly across the EU, so cite "GDPR Art. X" and name the competent authority (e.g. the CNIL) separately, not as part of the citation token. Do NOT append the parenthetical "(Regulation (EU) 2016/679)" or "(Regulation 2016/679)" to any citation — this long form must never appear in domain findings, in synthesis text, or in regulatory_basis fields. If a long-form regulation identifier is genuinely required, it must appear once at the document level only — never selectively in one field. NO REPEATED CITATION: within any single regulatory_basis or citation list, never cite the same provision twice (e.g. do not list "UK GDPR Art. 33(1)" or "Art. 28(3)(f)" more than once in the same field) — state each provision once. BREACH CLOCK: the Article 33(1) 72-hour notification clock starts when the controller becomes AWARE of a breach, never before; if a processor's notice is delayed, frame the risk as delayed controller awareness, not an earlier clock start. REGULATOR ATTRIBUTION: the ICO is the UK supervisory authority ONLY — cite it solely in the UK GDPR / DPA 2018 context. Never group "the ICO" with "the relevant EU supervisory authority" or list it as an EU authority. Under EU GDPR, refer to the competent EU lead supervisory authority by name where known (e.g. CNIL for France, DPC for Ireland, Garante for Italy) or generically as "the competent EU supervisory authority" — never as the ICO.

VERSION-CURRENCY NOTES: where the output references the CNIL's or ICO's published list of processing operations requiring a DPIA, or references SCCs/UK IDTA in use, add a brief parenthetical directing the user to the source, written in third person addressed to the reader (never second-person "you," which reads as an instruction to the generator rather than the end-user): '(consult the CNIL's list of processing operations requiring a DPIA and the ICO's guidance on when to conduct a DPIA, both on their respective websites, and verify the current version before relying on it)' and similarly for SCC/addendum currency. Keep this to one added clause, not a restated caveat in every domain finding.

CONSECUTIVE SUBSECTION CITATION FORM: when citing three or more consecutive lettered subsections of the same article (e.g. Art. 35(3)(a), (b), (c)), consolidate as 'Art. 35(3)(a)–(c)' rather than listing each separately, and apply the same consolidation to UK GDPR equivalents. This is a formatting preference — do not apply it to non-consecutive subsections.

${hasEuUk ? `FIRST-MENTION PARENTHETICALS FOR NAMED SUBSECTIONS: on the first mention of a specific processor-obligation subsection in prose (e.g. Art. 28(3)(e)), add a brief parenthetical describing what it requires, e.g. '(the processor's obligation to assist the controller in fulfilling data subject rights requests)', so the citation is self-explanatory without cross-referencing the statute.` : ``}

INTERACTION_EFFECTS LENGTH: if interaction_effects would otherwise exceed roughly 700 characters as a single paragraph, break it into 2–3 shorter paragraphs by logical grouping (e.g. inventory/DPA/controls compounding; notice/training extension; incident-response and overall accountability exposure) rather than one dense block. Content only — do not add headers.

ART 33(1) CLOCK TRIGGER: when describing the 72-hour breach-notification clock, state explicitly that it begins when the CONTROLLER becomes aware of the breach (typically upon receipt of the processor's Art. 33(2) notice), not from the processor's notification itself — avoid phrasing that could be read as the clock starting at the moment of processor notice.

IMPLEMENT-OR-VERIFY DISAMBIGUATION: Avoid the ambiguous phrase 'implement or verify' when directing the user to secure a control. Split it into two explicit steps: 'Then, either implement technical controls... if none exist, or verify and document existing controls, ensuring the controls enforce the policy across all named platforms.'

ARTICLE-GLOSS CORRECTIONS (2.3):
- Art. 24: "GDPR Art. 24 (controller must implement appropriate technical and organisational measures to ensure and to be able to demonstrate that processing is performed in accordance with this Regulation)".
${hasEuUk ? `- Art. 29: "GDPR Art. 29 (persons acting under the authority of the controller or processor may process personal data only on the controller's instructions, unless required by Union or Member State law)". Do not mention confidentiality here — that is Art. 28(3)(b).` : ``}
${hasEuUk ? `- Art. 39(1)(b): "GDPR Art. 39(1)(b) (the DPO's task to monitor compliance with the GDPR, with other Union or Member State data protection provisions, and with the controller's or processor's policies in relation to the protection of personal data, including the assignment of responsibilities, awareness-raising and training of staff involved in processing operations, and the related audits)". Do NOT paraphrase this as "training and staff training" or any variant that repeats "training" as if it were two distinct items — awareness-raising and training of staff is a single conjoined task element. If a shorter reference is needed, use "GDPR Art. 39(1)(b) (DPO monitoring task, including awareness-raising and staff training)".` : ``}
- Art. 14: "(information to be provided where personal data have not been obtained from the data subject)".
- Art. 12: "(transparent information, communication and modalities for the exercise of the rights of the data subject)" — replace "consumer-rights"; the GDPR term is data subject rights.
- DPF sentence, user-facing voice: "including the EU–US Data Privacy Framework (Commission Implementing Decision (EU) 2023/1795) for US-established importers certified under the Framework — verify current certification status at dataprivacyframework.gov".
${hasEuUk ? `- UK EXTENSION ARTICLE PRECISION: the UK Extension to the EU–US Data Privacy Framework is an ADEQUACY REGULATION under UK GDPR Art. 45, NOT an Art. 46 appropriate safeguard. Any sentence describing a transfer leg to a US importer certified under the UK Extension must cite "UK GDPR Art. 45 adequacy" (or "the UK adequacy regulation for the UK Extension") and MUST NOT cite Art. 46, Art. 46(1), Art. 46(2), or the phrase "appropriate safeguard" for that leg. Art. 46 mechanisms (SCCs, IDTA, UK Addendum, BCRs) apply only where the importer is NOT relying on the UK Extension adequacy.` : ``}
- DPIA-trigger gloss addition: "Art. 35(3) provides examples and is not exhaustive — any processing likely to result in a high risk under Art. 35(1) requires a DPIA even if not listed in Art. 35(3)."
- REGULATORY-BASIS SCOPE RULE: a provision appears in a domain's regulatory_basis only if it grounds a gap or recommended action in that domain (e.g. drop Art. 37(1) where the DPO is already appointed and no 37(1) gap exists).

OBLIGATIONS CARRY THEIR SOURCE: any stated compliance obligation — including data-residency requirements in DPAs, verification duties, and retention duties — names the legal basis that imposes it (the provision, or the contractual clause class where the obligation is contractual). An obligation asserted without a source is incomplete; where the source is genuinely uncertain, say so and route it through information_needed rather than asserting the obligation bare.

VERIFIED CALIFORNIA BREACH DEADLINES (cite these; do not recall breach-notification timelines from memory): Cal. Civ. Code § 1798.82, as amended by SB 446 (signed October 2025, effective January 1, 2026), requires (1) disclosure to affected California residents within 30 calendar days of discovery or notification of the breach, subject to the law-enforcement and scope-determination delay provisions, and (2) for breaches affecting more than 500 California residents, electronic submission of a single sample copy of the notification to the California Attorney General within 15 calendar days of notifying affected consumers. Where the incident predates January 1, 2026, the prior 'most expedient time possible and without unreasonable delay' standard governed; state which regime applies by incident date.

"CITATIONS MATCH THE ORGANISATION'S JURISDICTIONS: the regulatory_basis for any finding cites only regimes the organisation is subject to per its profile. Where the profile records no EU/UK data (eu_uk_data is No and no EU/UK jurisdiction is listed), NEVER cite GDPR or UK GDPR provisions as the basis for an obligation — cite the applicable state-law provisions the profile supports (e.g. the CCPA compliance-demonstration requirements, Colorado C.R.S. § 6-1-1308, Va. Code § 59.1-578, as applicable to the listed jurisdictions), or state the obligation as a general accountability practice without a statutory citation. The reverse also holds: no US state statutes as the basis for an EU-only organisation's obligations."

"MOOT ITEMS ARE OMITTED, NOT NARRATED: where a candidate gap item is determined not to apply on the facts (e.g. an AI-training clause where no generative-AI tools are in the inventory), omit the item entirely rather than including it with a parenthetical explaining that it does not apply. Gap lists carry only applicable items."

"NATIONAL IMPLEMENTING ACTS ARE NAMED ONLY FROM SUPPLIED DATA: never expand, translate, or attribute a national implementing act's name or acronym from memory. Acronyms belong to specific countries (UAVG is the Netherlands' Uitvoeringswet AVG; Germany's federal act is the Bundesdatenschutzgesetz (BDSG)) and a mismatched attribution or an invented expansion is a fatal citation error. Where a finding must reference the national implementing framework and no verified act name is supplied in the prompt or the organisation's profile, write 'the national implementing legislation of [Member State]' generically — never a named act from recall."

"REPEATED CONTENT APPEARS ONCE: a verification instruction, cross-reference direction, or documentation step appears in full exactly ONCE, in its single most relevant finding; every other finding that needs it carries a short cross-reference ('apply the DPIA-list verification set out in the Privacy Impact Assessment Status finding') and never restates the text. The same sentence appearing verbatim in two or more findings, or in both a finding and immediate_actions, is a defect."

"NO ILLUSTRATIVE FREQUENCIES OR PERIODS FOR ORGANISATION-DETERMINED TERMS: where a recommendation directs the organisation to set, adopt, verify, or maintain a schedule, cadence, interval, cycle, or refresher — the frequency is for the organisation to determine and MUST NOT be illustrated. Never emit parenthetical or 'e.g.' examples such as 'quarterly', 'biannual', 'annual', 'monthly', 'weekly', 'daily', 'every N months/years', or any comparable interval. Direct the organisation to establish or verify the schedule without proposing periods. The only exception is a period fixed by a cited statute (e.g., the GDPR Art. 33(1) 72-hour breach clock) — statutory periods are cited, never illustrated."

${hasEuUk ? `"ARTICLE 28 PRECISION: (1) sub-processor authorisation is grounded in Art. 28(2) (prior specific or general written authorisation) and Art. 28(4) (the same data protection obligations imposed on the sub-processor); Art. 28(3)(d) may be cited only as the contract element that stipulates the processor respects those conditions — never with a gloss presenting 28(3)(d) as itself containing the authorisation requirement. (2) Art. 28(3)(e) requires the processor to ASSIST the controller with data subject rights obligations under Arts. 15–22; the Art. 12(3) one-month window is the CONTROLLER'S deadline — state that DPAs should specify a contractual assistance mechanism and timeframe that enables the controller to meet its Art. 12(3) obligations, never that the processor must fulfil requests within it, and NEVER as a parenthetical glossing the content of Art. 28(3)(e) itself — Art. 28(3)(e) requires assistance; it does not mandate a contractual timeframe. The timeframe is the operational mechanism, not a statutory element, and the sentence must read that way. (3) Art. 33(1) awareness is not limited to receipt of a processor's Art. 33(2) notice — where that notice is described as the typical trigger, add 'or through internal detection or any other means'. (4) The EU–US Data Privacy Framework list and the UK Extension are verified on the same public list at dataprivacyframework.gov — say so when directing both verifications."` : ``}

"NATIONAL IMPLEMENTING LAW WITHOUT A SUPPLIED PROVISION IS CITED GENERICALLY: where a national implementing act (BDSG, UAVG, DPA 2018) is relevant but no specific provision is carried in the supplied context, frame it as a verification pointer — 'the [act] as [country]'s national implementing legislation; consult the current text to verify any jurisdiction-specific requirements beyond the GDPR baseline' — never cite specific sections of the act from memory and never leave a bare act-level citation implying a specific obligation."



"OUTPUT-ABSENCE, NOT CONTROLLER-FAILURE: the assessment sees the intake and its own output — it does not see the organisation's files. Where a finding rests on unverified coverage, say what the record does not confirm ('the organisation has not demonstrated', 'it has not been confirmed that') — never an affirmative-inability claim ('the organisation cannot currently demonstrate', 'the organisation is unable to') about capability the assessment has not tested. Where the intake affirmatively answers a question (a populated field, including 'No'), that answer RESOLVES the question — describe it as answered, not as undocumented. why_urgent and synthesis prose follow this register with no exceptions."

US-ONLY FRAMING: where the intake records no EU/UK data or establishment, all processor/vendor obligations are framed under the applicable US state provisions (e.g. CCPA §1798.140(ag) service-provider restrictions and §1798.100(d); Va. Code §59.1-579; C.R.S. §6-1-1305/§6-1-1308). GDPR articles are cited ONLY as explicitly labeled comparative context ("for comparison, under EU law...") and never as the governing obligation, never in a regulatory_basis field, and never as the standard a US DPA is verified against. US state privacy laws impose no Article 45/46-style cross-border transfer-mechanism requirement: never assert a transfer-mechanism obligation under CCPA/VCDPA/CPA; where the risk is disclosure/transparency of transfers, cite the notice provision that actually imposes it.

ENFORCEMENT CLAIMS CARRY CITATIONS OR DO NOT APPEAR: any statement about what a regulator prioritises, targets, or has penalised (enforcement trends, priorities, patterns) must cite a specific action, guidance document, or statement FROM THE SUPPLIED enforcement context. If no supporting item is in the supplied context, omit the claim entirely and rest the risk on the cited statutory provisions. Enforcement knowledge is never recalled from training.

NO UNDEFINED DOCTRINE LABELS: do not attach doctrinal labels the cited provision does not use ("safe harbour", "strict liability", "per se violation"). State the liability mechanics with the provision instead (e.g. exposure under §1798.100(d) absent the contractual restrictions required by §1798.140(ag)).

RESOLVE JURISDICTION QUESTIONS FROM THE INTAKE: never direct the user to verify a fact the intake already answers. Where the intake records EU/UK data as No, GDPR-specific obligations (DPIA under Art 35, DPO under Art 37, representatives under Art 27) are marked out-of-scope on the intake's stated basis — with one sentence noting the basis — and the analysis addresses the applicable US analog instead where one exists (e.g. risk/data-protection assessments under C.R.S. §6-1-1309 or Va. Code §59.1-580, citing ONLY provisions present in the supplied context; where the analog provision is not in supply, name the obligation generically without a pinpoint citation). An obligation is either in scope, out of scope on a stated basis, or contingent on a fact the intake does NOT answer — only the third kind generates a verification item."

${!hasEuUk ? `US-ONLY ASSESSMENT FRAMING (Y-3): every domain finding, including dpia_status, is framed EXCLUSIVELY under the applicable US authorities for the run's jurisdictions — assessment obligations under C.R.S. § 6-1-1309 and Va. Code § 59.1-580 where Colorado or Virginia apply, and California risk-assessment obligations under Cal. Civ. Code § 1798.185 and 11 CCR §§ 7150-7157 where California applies. Thresholds, triggers, current-state descriptions, gap descriptions, and recommended actions all use the US authorities' own terms. GDPR or UK GDPR provisions (including Art. 35 and any other Chapter III/IV/V article) may appear ONLY as an explicitly labeled comparison ("for comparison", "by contrast", "for reference only") and a labeled sentence never licenses unlabeled use elsewhere; never direct the user to evaluate anything against a GDPR threshold on a US-only run. Comparative GDPR references, where used, appear ONLY in narrative fields — NEVER inside regulatory_basis, citation, or authority fields, which carry the governing US authorities exclusively. The token 'DPIA' (and 'Data Protection Impact Assessment') may appear ONLY in one of three contexts: (1) an explicitly labeled comparative sentence contrasting EU/GDPR with the US regime; (2) a factual reference to the company's own existing document as recorded in intake (e.g. echoing dpia_status or i9_existing_dpia_summary); (3) inside the internal schema key name dpia_status. For every US-law obligation, use the statute's own term — 'data protection assessment' for Colorado (C.R.S. § 6-1-1309) and Virginia (Va. Code § 59.1-580), and 'risk assessment' for California (11 CCR §§ 7150-7157). Never write 'DPIA' alongside a US statute citation, and never write 'DPIA / data protection assessment' as a slash-alternative.` : ``}

PROPORTIONATE ASKS (R1b2 rule 2b): every enumerated intake field ('Organisation sector', 'Organisation size', 'Jurisdictions of operation', 'EU/UK personal data processed', 'Technology tools in use', 'Data categories processed', 'Existing privacy policy', 'Privacy notice coverage', 'Existing acceptable use policy', 'DPO status', 'DPIA status', 'DPIA AI/high-risk coverage', 'Incident response plan', 'Employee privacy training', 'Training AI-tool coverage', 'Special category data', 'Tool inventory audit', 'Technical controls preventing prohibited submission', 'DSR fulfilment capability', 'Vendor DPA status', 'DPA Article 28(3) verification', 'Cross-border transfer status', 'Transfer mechanism in place') with a populated value in the INTAKE SUMMARY — including a populated "No" — is a RESOLVED intake fact for this run and MUST NOT appear in information_needed, in a domain finding's asks/verification items, or as a "please confirm" line in narrative. Legitimate asks are (i) fields whose intake value is exactly "not specified" (i.e. structurally absent), (ii) specific downstream refinements the intake cannot carry (per-record retention schedules, specific tool-processing purposes, per-vendor DPA effective dates, per-transfer mechanism identity), and (iii) verification items for facts the intake structurally does not answer (per RESOLVE JURISDICTION QUESTIONS FROM THE INTAKE above, which is unchanged and controls). Every ask is framed as one specific missing fact tied to the determination it unblocks — never a generic "please provide more information" line, never a re-ask of a RESOLVED input.

ADDITIONAL_CONTEXT CONSUMPTION (R1b2 rule 2d): the intake carries a free-text 'Additional context (user narrative)' field. Treat its content as user-supplied NARRATIVE — never as binding structured intake. Specifically: (a) statements in additional_context may nominate CANDIDATE hypotheses (e.g. a mentioned tool, a described practice, a stated retention approach) that a domain finding may raise as an item to CONFIRM, never assert as met; (b) additional_context can never OVERRIDE a structured intake field that has a populated value — where the two disagree, the structured field is authoritative and the divergence is itself a verification item; (c) absence of a topic in additional_context is NEVER treated as evidence that the topic does not apply; (d) do not quote additional_context verbatim into a regulatory_basis, citation, or authority field — those fields carry statutory authority exclusively; short paraphrased references in narrative fields are permitted with the "the organisation notes that…" register; (e) additional_context does not license any exception to CITATION INTEGRITY, ENFORCEMENT CLAIMS CARRY CITATIONS OR DO NOT APPEAR, or the OUTPUT-ABSENCE, NOT CONTROLLER-FAILURE register above (all unchanged and controlling).

CROSS-READ THE FULL INTAKE (QB-TEAM 2026-07-22; adapted from run-cppa-cybersecurity — EXTENDS ADDITIONAL_CONTEXT CONSUMPTION above, does not replace it): before stating that the intake does not establish a fact, scan every structured intake field including sibling domains AND the additional_context narrative; a fact recorded anywhere in the record is consumed, never declared absent. Where a fact recorded under one domain (e.g. a named vendor in vendor-risk domain) bears on another (e.g. cross-border transfers), reference it in the second domain's finding rather than treating that domain as evidence-free. The ADDITIONAL_CONTEXT CONSUMPTION rules governing structured-vs-narrative precedence (a)–(e) continue to apply unchanged during this cross-read.

JURISDICTION COVERAGE (QB-TEAM 2026-07-22; adapted from run-registration-assessment market-coverage): every jurisdiction the intake engages (each entry in the intake jurisdictions list, and any engaged sectoral overlay) receives EITHER substantive treatment in the report OR an explicit named reason for exclusion — silent omission of an engaged jurisdiction is a defect. Where a listed jurisdiction is excluded because a sectoral or size threshold is not met on the record, name the specific threshold and the intake fact that puts the organisation outside it. This rule operates within the JURISDICTION SCOPING RULE and the shared engaged-jurisdiction anchor rule — it never licenses citing jurisdictions absent from the intake.



SPEC-PACK-1 R6 — BUSINESS CLAIMS ARE RECORD-GROUNDED: every characterisation of the organisation's operating posture, business model, market position, sectoral role, customer base, product surface, or maturity — in the executive_summary, key_findings, domain findings' current_state, gap description, or recommended_actions — RESTS on a specific value carried by a named intake field OR on the "the organisation notes that…" register drawn from additional_context. Never emit a business-fact claim from memory, from sector priors, or from general commercial knowledge (e.g. "the organisation operates a subscription SaaS model", "the organisation serves enterprise customers", "the organisation has a mature security programme", "the organisation is a mid-market vendor to the healthcare sector") without the intake anchor. Form: "The intake records [field]: [value], from which the assessment treats [derived characterisation]." Where the record does not carry the fact and no additional_context sentence supplies it, either omit the characterisation or surface the missing piece as an information_needed item — never fabricate the fact to complete a paragraph. This rule SUPPLEMENTS the shared engaged-jurisdiction/anchor rule and the PROPORTIONATE ASKS rule; it does not narrow either.

R-TURN-3 TURN B ITEM 2 — GOVERNANCE FIELD DISCIPLINE:
(a) WP248 VOCABULARY: when invoking DPIA "high-risk" criteria, use the WP248rev.01 vocabulary verbatim — "evaluation or scoring", "automated decision-making with legal or similar significant effect", "systematic monitoring", "sensitive data or data of a highly personal nature", "data processed on a large scale", "matching or combining datasets", "data concerning vulnerable data subjects", "innovative use or applying new technological or organisational solutions", "processing that prevents data subjects from exercising a right or using a service". Do not paraphrase these criteria; do not substitute synonyms; do not invent additional criteria.
(b) NO COMPARATIVE-EXEMPTION PHRASING IN gap_description OR regulatory_basis: those two fields NEVER contain phrasing that frames a gap or basis as an exemption relative to another regime ("unlike GDPR, US law does not require …", "in contrast to Colorado, California exempts …", "by comparison the organisation is exempt from …"). State the operative rule affirmatively in the governing regime and confine any comparative framing to explicitly-labelled narrative fields (executive_summary, key_findings body prose).
(c) ALLOWED-ROLES PLACEHOLDERS: every action owner in immediate_actions, priority_actions, recommended_action, suggested_owner, and roadmap resolves to a role the intake establishes OR the placeholder form "the organisation's [function] lead (role to be designated)" — never a role the intake does not establish.
(d) OWNER-ROSTER CONSISTENCY: every named owner appearing anywhere in the report must also appear in the owner roster derived from the intake (or be the designated-placeholder form above). A named owner not on the roster is a defect.

PRODUCT-PROMPT-GOV — ENUMERATION SELF-CONSISTENCY: NEVER emit engagement-status parentheticals such as "(not engaged on this intake)", "(does not apply here)", "(internal only)", or equivalent bookkeeping asides — that is internal logic leaking to the reader. Conditional phrasing ("where engaged", "if applicable") stands alone without the parenthetical.

(QB-P22) NO EXTERNAL-LIST DEFERRALS: never direct the reader to consult external regulator websites or lists as a substitute for analysis (e.g. "consult the CNIL's published list", "check the ICO's guidance on their website", "verify the current version at the EDPB site"). Apply the relevant criteria from the record and STATE the conclusion; cite the regulator instrument by name and date where engaged. A pointer to "confirm the current version" may appear only as a trailing caveat AFTER the applied analysis, never in place of it. This rule operates alongside the existing fact-discipline rules above.

PRODUCT-FIX-4 TASK 2 — TERMINAL JURISDICTION-CLOSURE MUST-NOT (READ LAST; OVERRIDES ANY EARLIER TEMPTATION TO REACH FOR A US-STATE ANCHOR): before emitting the final JSON, the drafter performs an internal jurisdiction closure pass over every domain finding, priority action, executive_summary sentence, and regulatory_basis / authority / citation field. In that pass:
 (i) The intake's ENGAGED-US-STATE SET is defined as exactly the US states the intake lists in jurisdictions (California, Colorado, Virginia, Illinois, Texas, Connecticut, etc.). No other US state is engaged, regardless of how "typical" its statute is, regardless of whether the finding rhymes with a Colorado or Virginia pattern, and regardless of whether the drafter recalls a familiar anchor.
 (ii) A US-state statutory citation — including but not limited to "C.R.S. § …", "Colo. Rev. Stat. § …", "Va. Code § …", "Cal. Civ. Code § …", "11 CCR § …", "740 ILCS 14/…", "N.Y. Gen. Bus. L. § …", "Tex. Bus. & Com. Code § …", "Conn. Gen. Stat. § …" — MAY appear in the emitted document ONLY when the intake engages the state that owns the statute. This applies to every field type (regulatory_basis, authority, citation, narrative body text, current_state, gap_description, recommended_action, priority_actions, and executive_summary) without exception. This is the terminal rule for jurisdictional closure and it overrides earlier rules (a)–(f) where they might be read to license a US-state cite as a "default" or "training-domain" hook. In an EU/UK-only intake, ZERO US-state statutory citations appear anywhere in the output; in a California-only intake, no Colorado or Virginia citations appear; in a Colorado-only intake, no California, Virginia, or Illinois citations appear; and so on.
 (iii) Where the drafter would otherwise have cited a US-state statute for a training, DPIA, security-program, or other duty on an intake that does not engage that state, the drafter INSTEAD (a) cites the GDPR / UK GDPR anchor when the intake engages EU/UK, (b) cites the engaged US-state anchor when a different US state is engaged, or (c) states the obligation in plain regulatory language without a pinpoint citation when no engaged jurisdiction anchors it. A generic "training as a best practice supporting controller duties" sentence with no US-state cite is preferred to a US-state cite drawn from a non-engaged state.
 (iv) A deterministic post-generation self-check scans the emitted JSON for US-state statutory citation tokens; any token whose owning state is absent from the intake's ENGAGED-US-STATE SET is either stripped or rewritten to descriptive language before the JSON is returned. The prompt-level rule and the post-gen self-check together are the two enforcement layers; the drafter's job is to make the second layer a no-op.`;
}

export function buildGovernanceDomainToolModule(jurisdictions: unknown, euUkData: string): ToolModule {
  return {
    identity: "You are a senior privacy and data protection compliance analyst assessing an organisation's data governance practices against the regulatory frameworks applicable to the intake's jurisdictions. This is a compliance framework tool.",
    citationFramework: GOVERNANCE_CITATION_FRAMEWORK,
    outputMode: "strict-JSON",
    extraRules: buildGovernanceSharedRules(jurisdictions, euUkData),
    languageVariant: "american",
  };
}

export function buildGovernanceSynthesisToolModule(jurisdictions: unknown, euUkData: string): ToolModule {
  return {
    identity: "You are a senior privacy compliance analyst synthesising ten domain findings into an executive governance assessment.",
    citationFramework: `${GOVERNANCE_CITATION_FRAMEWORK} In the synthesis you may cite enforcement precedents, but ONLY those provided in the ENFORCEMENT PRECEDENTS / ENFORCEMENT CONTEXT block. Never state a monetary fine amount unless it appears in that block; otherwise write '[Regulator] imposed a significant penalty for this type of violation — verify the current figure at the regulator's enforcement register'. Known correct figures (use only if the case is in your block): ICO Clearview AI (2022) £7,552,800; ICO Interserve (2022) £4,400,000; ICO Capita Pension Solutions (2024) £6,090,000; ICO British Airways (2020) £20,000,000.`,
    outputMode: "strict-JSON",
    extraRules: buildGovernanceSharedRules(jurisdictions, euUkData),
    languageVariant: "american",
  };
}

// QB7-3(a): deterministic TIMELINE VOICE wrapper — ensures every timeline-bearing field
// is either citation-bearing (statutory deadline with a §/Art. citation) or wrapped in
// the mandated 'timeline to be set by the organisation (e.g. …)' form.
// PRODUCT-FIX-4 T2 — post-generation US-state citation closure. Strips or
// rewrites any US-state statutory citation whose owning state is absent from
// the intake's engaged-state set. This is the second enforcement layer beneath
// the prompt-level terminal MUST-NOT rule; the prompt is expected to make this
// a no-op, but any leak is caught here before the JSON is returned.
function applyJurisdictionClosureScrub(reportData: any, intakeJurisdictions: string[]): number {
  const engagedList = (intakeJurisdictions || []).map((s) => String(s || "").toLowerCase().trim());
  const CODE: Record<string, string> = {
    california: "ca", colorado: "co", virginia: "va", illinois: "il",
    connecticut: "ct", texas: "tx", "new york": "ny",
  };
  // Map from US-state citation prefix → engagement key(s).
  const STATE_PATTERNS: Array<{ re: RegExp; states: string[]; label: string }> = [
    { re: /\bC\.R\.S\.\s*§\s*[\d\-.()a-zA-Z]+/g, states: ["colorado"], label: "Colorado privacy statute" },
    { re: /\bColo\.\s*Rev\.\s*Stat\.\s*§\s*[\d\-.()a-zA-Z]+/g, states: ["colorado"], label: "Colorado privacy statute" },
    { re: /\bVa\.\s*Code\s*§\s*[\d\-.()a-zA-Z]+/g, states: ["virginia"], label: "Virginia privacy statute" },
    { re: /\bCal\.\s*Civ\.\s*Code\s*§\s*[\d\-.()a-zA-Z]+/g, states: ["california"], label: "California privacy statute" },
    { re: /\b11\s*CCR\s*§+\s*[\d\-.()a-zA-Z]+/g, states: ["california"], label: "California ADMT/risk regulation" },
    { re: /\b740\s*ILCS\s*14\/[\d\-.()a-zA-Z]+/g, states: ["illinois"], label: "Illinois BIPA" },
    { re: /\bConn\.\s*Gen\.\s*Stat\.\s*§\s*[\d\-.()a-zA-Z]+/g, states: ["connecticut"], label: "Connecticut privacy statute" },
    { re: /\bTex\.\s*Bus\.\s*&\s*Com\.\s*Code\s*§\s*[\d\-.()a-zA-Z]+/g, states: ["texas"], label: "Texas privacy statute" },
    { re: /\bN\.Y\.\s*Gen\.\s*Bus\.\s*L\.\s*§\s*[\d\-.()a-zA-Z]+/g, states: ["new york"], label: "New York privacy statute" },
  ];
  const isEngaged = (states: string[]) => states.some((name) => engagedList.some((j) => j.includes(name) || j === CODE[name]));
  let scrubbed = 0;
  const rewrite = (s: string): string => {
    let out = s;
    for (const { re, states, label } of STATE_PATTERNS) {
      if (isEngaged(states)) continue;
      out = out.replace(re, () => {
        scrubbed++;
        // P-QB-P15 fix — internal-logic parenthetical ("(not engaged on this
        // intake)") was leaking to reader-facing prose. Strip it: the clause
        // "where engaged" already signals conditionality without exposing
        // engagement-status bookkeeping.
        return `the applicable ${label} where engaged`;
      });
    }
    return out;
  };
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) { for (const v of node) walk(v); return; }
    if (typeof node !== "object") return;
    for (const k of Object.keys(node)) {
      const v = (node as any)[k];
      if (typeof v === "string") {
        const next = rewrite(v);
        if (next !== v) (node as any)[k] = next;
      } else if (v && typeof v === "object") walk(v);
    }
  };
  walk(reportData);
  return scrubbed;
}

function applyTimelineForm(report: any): void {
  const CITED = /§|Art\.|Article|C\.F\.R\.|Code/;
  const WRAPPED = /^timeline to be set by the organisation \(e\.g\./i;
  const wrap = (v: any) =>
    typeof v === "string" && v.trim() && !WRAPPED.test(v.trim()) && !CITED.test(v)
      ? `timeline to be set by the organisation (e.g. ${v.trim()})`
      : v;
  for (const df of Object.values(report?.domain_findings ?? {})) {
    // QB-P25 B2: v2 findings compose the timeline sentence from
    // recommended_action_v2.deadline; the legacy wrapper is retired for them.
    if (findingHasV2Deadline(df)) continue;
    if (df && typeof df === "object" && "suggested_timeline" in (df as any)) {
      (df as any).suggested_timeline = wrap((df as any).suggested_timeline);
    }
  }
  for (const arr of [report?.action_plan, report?.immediate_actions]) {
    if (Array.isArray(arr)) for (const item of arr) {
      if (item && typeof item === "object" && "timeline" in item) item.timeline = wrap(item.timeline);
    }
  }
}

// QB7-3(b): deduplicate lint warnings that describe the same underlying deadline
// or defect. Dedup key = code + normalised detail (lowercased, whitespace collapsed,
// SB-446 phrasing variants normalised, dates extracted).
function dedupeLintWarnings(warnings: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const w of warnings) {
    if (!w || typeof w !== "object") { out.push(w); continue; }
    const detail = String((w as any).detail ?? "").toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/deadline as amended by sb\s*446/g, "sb446")
      .replace(/as amended by sb\s*446/g, "sb446")
      .replace(/by sb\s*446/g, "sb446")
      .trim();
    const dateMatch = detail.match(/\d{4}-\d{2}-\d{2}/);
    const key = `${(w as any).code ?? ""}|${dateMatch ? dateMatch[0] : detail.slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

// QB9-5: intake-gap requests live in the top-level information_needed array only.
function hoistNestedInformationNeeded(reportData: any): any {
  try {
    const top = Array.isArray(reportData?.information_needed) ? reportData.information_needed : [];
    const seen = new Set(top.map((s: any) => String(s).trim()));
    const findings = reportData?.domain_findings;
    if (findings && typeof findings === "object") {
      for (const key of Object.keys(findings)) {
        const f = (findings as any)[key];
        if (f && Array.isArray(f.information_needed)) {
          for (const item of f.information_needed) {
            if (!seen.has(String(item).trim())) { top.push(item); seen.add(String(item).trim()); }
          }
          delete f.information_needed;
          console.warn(`[GOV] QB9-5: hoisted information_needed from domain '${key}' to top level`);
        }
      }
    }
    reportData.information_needed = top;
  } catch (e) {
    console.error("[GOV] QB9-5 hoist errored:", e);
  }
  return reportData;
}


function buildStressGovernanceReport(assessmentId: string, intake: any) {
  const jurisdictions = Array.isArray(intake?.jurisdictions) ? intake.jurisdictions.map(String) : [];
  const hasEuUk = intake?.eu_uk_data === true || jurisdictions.some((j: string) => ["EU", "GB", "UK"].includes(j.toUpperCase()));
  const sector = String(intake?.sector || "").toLowerCase();
  const isHealthcare = /healthcare|life science|medical|clinical|pharma/i.test(sector);
  const isPublicSector = /gov|public sector|public authority|government/i.test(sector);
  const isFintech = /fintech|financial|banking|insurance/i.test(sector);
  const isEdTech = /edtech|children|child|schools|students/i.test(sector);

  const framework = hasEuUk
    ? "GDPR Art. 24, Art. 28, Art. 32 and Art. 35"
    : isHealthcare
    ? "HIPAA (45 C.F.R. Parts 160 and 164); C.R.S. §6-1-1309 and Va. Code §59.1-580 where applicable"
    : isPublicSector
    ? "C.R.S. §6-1-1309 and Va. Code §59.1-580 where applicable — Note: CCPA generally does not apply to government entities"
    : isFintech
    ? "GLBA Safeguards Rule (16 C.F.R. Part 314); CCPA §1798.100(d) where applicable; C.R.S. §6-1-1309 and Va. Code §59.1-580"
    : isEdTech
    ? "COPPA (16 C.F.R. Part 312); FERPA (34 C.F.R. Part 99) where applicable; CCPA §1798.100(d); C.R.S. §6-1-1309 and Va. Code §59.1-580"
    : "CCPA §1798.100(d); C.R.S. §6-1-1309 and Va. Code §59.1-580";
  const tools = Array.isArray(intake?.tools) && intake.tools.length ? intake.tools.join(", ") : "external workflow tools";
  const profile = intake?.sector ? `${intake.sector} organisation` : "organisation";
  const hasCoreControls = Boolean(intake?.privacy_policy || intake?.training_status || intake?.dpa_status);

  const domain_findings = Object.fromEntries(DOMAIN_DEFINITIONS.map((domain, idx) => {
    const severity = hasCoreControls
      ? (domain.escalate ? "Medium" : idx % 3 === 0 ? "Low" : "Medium")
      : (domain.escalate ? "High" : "Medium");
    const timeline = `timeline to be set by the organisation (e.g. ${idx < 3 ? "within 7 days" : idx < 7 ? "this quarter" : "ongoing"})`;
    return [domain.key, {
      domain_id: domain.id,
      domain_name: domain.name,
      current_state: `${profile} uses ${tools}; the intake responses indicate ${intake?.privacy_policy || "a privacy notice status not specified"}, ${intake?.dpa_status || "vendor contract status not specified"}, and ${intake?.training_status || "training status not specified"}.`,
      gap_description: `Confirm evidence quality, ownership, and audit trail completeness for ${domain.name.toLowerCase()}. Document the specific artifacts (policies, DPAs, training records, DPIA approvals) that support each control claim.`,
      severity,
      regulatory_basis: framework,
      recommended_action: `Validate documented evidence for ${domain.name.toLowerCase()} against ${framework} and record accountable remediation owners.`,
      suggested_owner: domain.escalate ? "Legal Counsel" : "Compliance Manager",
      suggested_timeline: timeline,
    }];
  }));

  const report = {
    generated_at: new Date().toISOString(),
    assessment_id: assessmentId,
    organisation_profile: intake,
    executive_summary: `The ${profile} shows baseline privacy-governance controls across policies, vendor management, training, and incident response. The primary areas requiring attention are evidence completeness, vendor classification, and ${hasEuUk ? "DPIA" : "data protection assessment"} scoping for high-risk workflows. Immediate action is focused on confirming documentation and ownership rather than rebuilding the program from scratch. All findings should be validated against actual organisational artifacts before sign-off.`,
    top_three_risks: [
      { risk: "Vendor terms evidence", domain: "Vendor Data Terms Compliance", why_urgent: "Processor and independent-controller classifications must be supportable before audit or regulatory review.", severity: "High" },
      { risk: "DPIA evidence trail", domain: "Privacy Impact Assessment Status", why_urgent: "High-risk workflows need documented assessment scope, approvals, and residual-risk decisions.", severity: "High" },
      { risk: "Operational proof", domain: "Employee Training and Awareness", why_urgent: "Policies and training must be backed by completion records and exception handling.", severity: "High" },
    ],
    immediate_actions: [
      { action: "Confirm that each listed tool has an owner, approved use case, and current vendor-risk record.", domain: "Tool Inventory and Sanctioning", timeline: "timeline to be set by the organisation (e.g. within 7 days)", owner: "Compliance Manager" },
      { action: "Review vendor classification and contract coverage for each listed tool.", domain: "Vendor Data Terms Compliance", timeline: "timeline to be set by the organisation (e.g. this quarter)", owner: "Legal Counsel" },
      { action: "Document DPIA rationale for high-risk workflows and record residual-risk approval.", domain: "Privacy Impact Assessment Status", timeline: "timeline to be set by the organisation (e.g. this quarter)", owner: "DPO" },
    ],
    overall_readiness_rating: hasCoreControls ? "Defined" : "Developing",
    readiness_rationale: "Severity ratings reflect whether controls are present, documented, and ready for evidence review. Confirm each rating against actual artifacts before relying on this assessment.",
    interaction_effects: "Inventory, vendor terms, DPIA records, and privacy notices reinforce each other; gaps in one area weaken the reliability of the others.",
    dpia_scope: hasEuUk || intake?.special_category === "Yes" || intake?.special_category_data
      ? [{ processing_activity: "High-risk platform and workflow processing", regulatory_basis: hasEuUk ? "GDPR Art. 35" : "State privacy assessment requirements", priority: "This quarter" }]
      : [],
    domain_findings,
    enforcement_precedents: [],
    enforcement_meta: { attempted: false, skipped: "stress_run" },
    annotations: [],
    lint_warnings: [],
    disclaimer: hasEuUk
      ? "This report helps your organisation identify potential GDPR governance gaps. It does not constitute legal advice. Findings should be validated against your organisation's authoritative records before operational reliance."
      : "This report helps your organisation identify potential privacy governance gaps under the applicable US state privacy laws. It does not constitute legal advice. Findings should be validated against your organisation's authoritative records before operational reliance.",
  };
  applyTimelineForm(report);
  return report;
}


// BUILD_STAMP is exported at file top (line 8); do not redeclare.

Deno.serve(async (req) => {
  console.log(`[qb9-rcb1] run-governance-assessment build active · core=${PROMPT_CORE_VERSION} · build_stamp=${BUILD_STAMP}`);
  console.log(JSON.stringify({ evt: "gov_build_stamp", build_stamp: BUILD_STAMP }));
  console.log("[run-governance-assessment] qb7 build active · doc-y-2b");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let assessment_id: string | undefined;
  try {
    const caller = await verifyCaller(req, "user");
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json().catch(() => ({}));
    ({ assessment_id } = body);
    const stressRun = body?.stress_run === true;
    if (!assessment_id) return new Response(JSON.stringify({ error: "assessment_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    // RC-B.1 — scoped-delta revision short-circuit.
    {
      const __rev = await handleRevisionMode(supabase, body, { toolType: "governance_assessment" });
      if (__rev) return __rev;
    }

    const ent = await requireEntitlement(caller, "governance_assessment", { rowId: assessment_id });
    if (!ent.ok) {
      console.log(JSON.stringify({ evt: "entitlement_denied", fn: "run-governance-assessment", reason: ent.reason }));
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: ent.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: assessment } = await supabase
      .from("governance_assessments")
      .select("*").eq("id", assessment_id).single();

    if (!assessment) return new Response(JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const intake = assessment.intake_data as any;
    const orgName = (assessment as any).organization_name || intake?.organization_name || null;
    const procWrite = await lifecycleUpdate(supabase, "governance_assessments", assessment_id, {
      status: "processing",
      ...(orgName && !(assessment as any).organization_name ? { organization_name: orgName } : {}),
    }, { fn: "run-governance-assessment", phase: "pre_generation" });
    if (!procWrite.ok) {
      return new Response(JSON.stringify({ error: "lifecycle_write_failed", message: procWrite.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    const fnRun = await startFunctionRun(supabase, "run-governance-assessment", {
      archetype: "background",
      trustClass: "user",
      userId: caller.internal ? (assessment.user_id ?? null) : caller.userId,
      invokedBy: caller.internal ? "internal" : "user",
      metadata: { assessment_id },
    });

    // Dispatch heavy work in background — return 202 immediately so the caller
    // is not held open past the platform's 150s HTTP idle ceiling. Result page
    // polls governance_assessments.status. On unhandled error we mark failed.
    // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
    EdgeRuntime.waitUntil((async () => {
      try {
    // RC-Gov-Crash-2026-07-15 — asList() mirror of run-dpia-framework's
    // helper. Defends the render prompt against non-array intake shapes
    // that slipped past validateIntake (or came in via legacy rows).
    const asList = (v: unknown): string[] =>
      Array.isArray(v) ? v.map((x) => String(x))
        : (v == null || v === "" ? [] : [String(v)]);
    const intakeSummary = `
Organisation (controller) being assessed: ${orgName || "not specified"}
Organisation sector: ${intake.sector || "not specified"}
Organisation size: ${intake.org_size || "not specified"}
Jurisdictions of operation: ${asList(intake.jurisdictions).join(", ") || "not specified"}
EU/UK personal data processed: ${intake.eu_uk_data || "not specified"}
Technology tools in use: ${asList(intake.tools).join(", ") || "not specified"}
  Data categories processed: ${asList(intake.data_categories).join(", ") || "not specified"}
  Existing privacy policy: ${intake.privacy_policy || "not specified"}
  Privacy notice coverage: ${intake.privacy_notice_coverage || "not specified"}
  
DPO status: ${intake.dpo_status || "not specified"}
DPIA status: ${intake.dpia_status || "not specified"}
DPIA AI/high-risk coverage: ${intake.dpia_ai_coverage || "not specified"}
Incident response plan: ${intake.incident_response || "not specified"}
Employee privacy training: ${intake.training_status || "not specified"}
Training AI-tool coverage: ${intake.training_ai_coverage || "not specified"}
Special category data: ${intake.special_category || "not specified"}${intake.special_categories_list?.length ? ` — ${intake.special_categories_list.join(", ")}` : ""}
Tool inventory audit: ${intake.inventory_audit || "not specified"}
Technical controls preventing prohibited submission: ${intake.technical_controls || "not specified"}${intake.technical_controls_list?.length ? ` — ${intake.technical_controls_list.join(", ")}` : ""}
DSR fulfilment capability: ${intake.dsr_capability || "not specified"}${intake.dsr_rights_tested?.length ? ` (rights tested end-to-end: ${intake.dsr_rights_tested.join(", ")})` : ""}
Vendor DPA status: ${intake.dpa_status || "not specified"}
DPA Article 28(3) verification: ${intake.dpa_art28_verified || "not specified"}
Cross-border transfer status: ${intake.transfer_status || "not specified"}
Transfer mechanism in place: ${intake.transfer_mechanism || "not specified"}${intake.tool_instruction ? `\nTool-specific note: ${intake.tool_instruction}` : ""}
Additional context (user narrative — treat per R1b2 rule 2d ADDITIONAL_CONTEXT CONSUMPTION; NOT structured intake): ${intake.additional_context ? String(intake.additional_context).trim() : "not specified"}

`;

    // --- Prompt-core v2.2 assembly --------------------------------------
    const today = new Date().toISOString().slice(0, 10);
    const GOVERNANCE_DOMAIN_TOOL_MODULE = buildGovernanceDomainToolModule(
      intake.jurisdictions || [],
      intake.eu_uk_data || "not specified",
    );
    const GOVERNANCE_SYNTHESIS_TOOL_MODULE = buildGovernanceSynthesisToolModule(
      intake.jurisdictions || [],
      intake.eu_uk_data || "not specified",
    );
    // Build the RESOLVED GDPR CITATIONS block (single source for SA names + Art-6 examples).
    const intakeJurisdictionList: string[] = Array.isArray(intake.jurisdictions)
      ? intake.jurisdictions.map((j: any) => String(j)) : [];
    const euUkJurisdictions = intakeJurisdictionList.filter((j) => {
      const u = j.toUpperCase();
      return ["GB", "UK", "EU"].includes(u) || Object.keys({
        AT:1,BE:1,BG:1,HR:1,CY:1,CZ:1,DK:1,EE:1,FI:1,FR:1,DE:1,GR:1,HU:1,IE:1,IT:1,LV:1,LT:1,LU:1,MT:1,NL:1,PL:1,PT:1,RO:1,SK:1,SI:1,ES:1,SE:1,
      }).includes(u);
    });
    const hasUkInScope = intakeJurisdictionList.some((j) => /united kingdom|^uk$|^gb$/i.test(j));
    const hasEuInScope = euUkJurisdictions.length > 0 && !(hasUkInScope && euUkJurisdictions.length === 1);
    const governanceRegime: "gdpr" | "uk_gdpr" = hasUkInScope && !hasEuInScope ? "uk_gdpr" : "gdpr";
    const gdprCitationsBlock = euUkJurisdictions.length
      ? renderGdprCitationBlock({ regime: governanceRegime, jurisdictions: euUkJurisdictions })
      : "";

    const domainSystem = buildSystemContent({
      toolModule: GOVERNANCE_DOMAIN_TOOL_MODULE,
      currentDate: today,
      injected: gdprCitationsBlock || undefined,
      cache: true,
    });

    const domainResults: Record<string, any> = {};

    const sector = (intake.sector || "").toLowerCase();
    const dataTypes: string[] = Array.isArray(intake.data_types) ? intake.data_types : [];
    const jurisdictionsLower: string[] = (intake.jurisdictions || []).map((j: string) => String(j).toLowerCase());
    const needsHigherQuality =
      intake.eu_uk_data === "Yes" ||
      intake.special_category === "Yes" ||
      sector === "healthcare" ||
      sector === "financial_services" || sector === "finance" ||
      dataTypes.some((t: string) =>
        ["biometric", "health", "financial", "genetic", "children"].includes(String(t).toLowerCase())
      ) ||
      jurisdictionsLower.some((j: string) =>
        ["us-federal", "california", "new-york"].includes(j)
      );

    const tryParseJson = (text: string): any | null => {
      try {
        const m = text.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : null;
      } catch { return null; }
    };

    const domainResultsArray = await Promise.all(
      DOMAIN_DEFINITIONS.map(async (domain) => {
        const model = (domain.escalate && needsHigherQuality)
          ? "claude-sonnet-4-6"
          : "claude-haiku-4-5-20251001";
        const userPrompt = `DOMAIN ${domain.id}: ${domain.name}

ORGANISATION PROFILE:
${intakeSummary}

ASSESSMENT TASK:
${domain.prompt}

Return JSON:
{
  "domain_id": ${domain.id},
  "domain_name": "${domain.name}",
  "current_state": "one sentence describing what exists today",
  "gap_description": "one sentence describing what is missing or inadequate, or null if no gap",
  "severity": "Critical | High | Medium | Low | Compliant",
  "regulatory_basis": "specific regulatory provision(s) requiring this — e.g. GDPR Art. 28, CCPA §1798.100",
  "recommended_action": "specific action required — must name the regulation and the action",
  "suggested_owner": "one of the roles the intake establishes, or 'role to be designated'",
  "suggested_timeline": "a statutory deadline with citation where one governs the action; otherwise exactly: timeline to be set by the organisation (e.g. within 7 days | this quarter | this year | ongoing — pick ONE as the illustrative cadence)",

  // ── QB-P25 B2 — STRUCTURED V2 FIELDS (additive; legacy strings above stay unchanged) ──
  // OMIT a v2 field entirely when you cannot ground it in a named intake fact
  // and a specific engaged statute. There is NO hedged-placeholder slot; a v2
  // entry either names an ENGAGED provision/fact or is omitted.
  //
  // "recommended_action_v2": {
  //   "action":  "imperative sentence — same discipline as recommended_action",
  //   "owner":   { "role": "<role the intake establishes, or 'role to be designated'>",
  //                "intake_field": "<intake key that establishes the role, e.g. 'dpo_status', or 'designation' when the role must be created>" },
  //   "trigger": "the condition that fires the action, in the intake's terms",
  //   "deadline":
  //      { "kind": "statutory", "citation": "e.g. GDPR Art. 33(1)", "illustrative_default": "optional cadence hint" }
  //      OR
  //      { "kind": "org_set",   "illustrative_default": "within 7 days | this quarter | this year | ongoing" }
  // }
  //
  // "regulatory_basis_v2": [
  //   { "citation": "e.g. GDPR Art. 28(3)(f)", "engaged_because": "<named intake fact that engages the provision — never generic>" }
  // ]
  //
  // The renderer composes the timeline sentence from deadline; do not repeat
  // the timeline in the "action" string. Legacy suggested_timeline is retired
  // for domains that emit a valid recommended_action_v2 — do not wrap.
  "recommended_action_v2": null,
  "regulatory_basis_v2": null
}${renderSupplementalBlock({ responses: (intake as any)?.supplemental_responses, context: (intake as any)?.supplemental_context })}`;
        const firstText = await callAnthropic(model, domainSystem, userPrompt, PRODUCT_MAX_OUTPUT_TOKENS);
        let parsed = tryParseJson(firstText);
        if (!parsed) {
          // Retry once before giving up. Never emit placeholder "parse error"
          // copy into customer-facing report; failed domains are excluded
          // from the report entirely and recorded as a lint warning.
          console.warn(`[Governance] domain ${domain.id} (${domain.name}) parse failed; retrying once.`);
          const retryText = await callAnthropic(model, domainSystem, userPrompt, PRODUCT_MAX_OUTPUT_TOKENS);
          parsed = tryParseJson(retryText);
        }
        if (!parsed) {
          return {
            key: domain.key,
            result: { assessment_failed: true, domain_id: domain.id, domain_name: domain.name },
          };
        }
        return { key: domain.key, result: parsed };
      })
    );

    // Partition successful vs failed domains. Failed domains are excluded
    // from synthesis input, from the rendered report, and from any
    // immediate-actions list.
    const failedDomains: Array<{ domain_id: any; domain_name: string }> = [];
    for (const { key, result } of domainResultsArray) {
      if (result && (result as any).assessment_failed) {
        failedDomains.push({
          domain_id: (result as any).domain_id,
          domain_name: (result as any).domain_name,
        });
        continue;
      }
      domainResults[key] = result;
    }
    const failedDomainNames = new Set(failedDomains.map((d) => String(d.domain_name || "").toLowerCase()));

    // Fetch enforcement precedents (3-5) relevant to this org's profile (before synthesis so they can be cited)
    let enforcementPrecedents: any[] = [];
    let enforcementMeta: any = { attempted: false };
    try {
      const { data: ctxData } = await supabase.functions.invoke("get-enforcement-context", {
        body: {
          tool: "Governance",
          jurisdictions: intake.jurisdictions || [],
          sector: intake.sector || undefined,
          biometric: intake.special_category_data || undefined,
          limit: 5,
        },
      });
      enforcementPrecedents = (ctxData?.results || []).slice(0, 5);
      const descParts: string[] = [];
      if (intake.sector) descParts.push(`${intake.sector} sector`);
      const jurs = Array.isArray(intake.jurisdictions) ? intake.jurisdictions : [];
      if (jurs.length) descParts.push(`governance in ${jurs.join(", ")}`);
      enforcementMeta = {
        attempted: true,
        total_matched: typeof ctxData?.total_matched === "number" ? ctxData.total_matched : null,
        query_descriptor: descParts.join(" — ") || undefined,
      };
    } catch (e) {
      console.error("get-enforcement-context failed (non-fatal):", e);
    }

    const enforcementContextStr = enforcementPrecedents.length > 0
      ? enforcementPrecedents.map((r: any, i: number) =>
          (() => {
            const fineVerified = r.fine_verified !== false;
            const fine = !fineVerified
              ? "fine amount under verification — omitted"
              : (r.fine_eur_equivalent ? `€${Number(r.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
            return `[E${i + 1}] id:${r.id} ${r.subject || "Unnamed"} — ${r.regulator} (${r.jurisdiction}, ${r.decision_date || "n.d."}) — Fine: ${fine} — Failure: ${r.key_compliance_failure || r.violation || "n/a"}`;
          })()
        ).join("\n")
      : "No directly analogous enforcement precedents retrieved.";

    // ── SYNTHESIS ──
    const synthesisUserBase = `Synthesise these ten domain findings into cross-domain patterns and an executive summary.

TEN DOMAIN FINDINGS:
${JSON.stringify(domainResults, null, 2)}

ORGANISATION PROFILE:
${intakeSummary}

ENFORCEMENT PRECEDENTS (cite by [E1]–[E5] where relevant):
${enforcementContextStr}

BRACKETED-CODE RENDERING RULE: When you reference any of these in narrative text (including domain findings and the cross-domain synthesis), use the human-readable form — regulator and year, e.g. "the Hamburg DPA's 2020 decision" — NEVER the bracketed [E#] code. The [E#] tags are for the annotations array only. If an enforcement example is not in the list above, do not reference it at all — no placeholder codes.

ANNOTATION REQUIREMENT: For each enforcement action cited above (tagged [E1], [E2], etc.), if it directly supports a top risk, immediate action, or readiness rating in your synthesis, include it in the annotations array using the id value from the enforcement context exactly as provided. You MUST only cite enforcement actions from the ENFORCEMENT PRECEDENTS provided above — never cite cases from training knowledge. If an enforcement action is not in the provided context, do not cite it.

SYNTHESIS REFERENCES: Refer to domains by NAME (e.g., "the Vendor Data Terms findings"), never by number.

Return JSON:
{
  "executive_summary": "3-5 sentence board-ready summary. Name the top three risks. Specify if immediate action is required. No jargon.",
  "top_three_risks": [
    { "risk": "risk name", "domain": "domain name", "why_urgent": "one sentence", "severity": "Critical|High" }
  ],
  "immediate_actions": [
    { "action": "specific action", "domain": "domain name", "timeline": "statutory deadline with citation, or exactly: timeline to be set by the organisation (e.g. within X days)", "owner": "role" }
  ],
  "interaction_effects": "one paragraph describing where findings in multiple domains compound each other",
  "dpia_scope": [
    { "processing_activity": "name the activity", "regulatory_basis": "why a DPIA is required", "priority": "Immediate | This quarter" }
  ],
  "overall_readiness_rating": "one of: Initial | Developing | Defined | Managed | Optimised",
  "readiness_rationale": "one sentence explaining the rating, including a brief methodology note (e.g., 'Domain severities reflect: Critical = no controls in place; High = controls materially incomplete; Medium = mostly in place with identified gaps; Low = minor gaps only; Compliant = requirements met.')",
  "annotations": [
    {
      "enforcement_action_id": "exact id string from the enforcement context above (the value after 'id:')",
      "regulator": "regulator name",
      "jurisdiction": "jurisdiction",
      "decision_date": "YYYY-MM-DD or null",
      "summary": "one sentence what the case involved, max 25 words, plain English",
      "outcome": "rejected | accepted | penalised | required",
      "relevance": "one sentence why this case is relevant to this synthesis"
    }
  ],
  "information_needed": [
    { "field": "<intake field key that exists in the intake>", "dimensions": "<what specifically to add — dimensions, never suggested values>", "provision": "<already-cited provision that makes these dimensions relevant>", "enables": "<which section/determination of this report completes with it>" }
  ]
}

GOVERNANCE information_needed CLOSURE (2026-07-14 CEO ruling): every governance intake field is a required question with a definite answer on the current form — there is no customer-reachable "unknown" state for enumerated fields. information_needed MUST be [] unless a field's value in the INTAKE SUMMARY is literally empty (structurally absent / blank string). Do not populate information_needed to request confirmation, elaboration, or "please provide" refinements on any populated enumerated field; those go in domain-finding remediation as verification items, not as intake asks.

Every insufficient-basis or "Insufficient information" finding elsewhere in this output MUST have a corresponding information_needed entry; otherwise return an empty array.`;


    // L5 GOVERNANCE INJECTION (synthesis stage only): verbatim GDPR article text
    // for the applicable regime. Domain stage is untouched.
    let gdprAuthorityBlock = "";
    if (euUkJurisdictions.length) {
      try {
        const jurisdictionForCtx: "eu" | "uk" = governanceRegime === "uk_gdpr" ? "uk" : "eu";
        const ctx = await getGdprContext(supabase, {
          jurisdiction: jurisdictionForCtx,
          articles: ["5", "24", "28", "32", "33", "35", "37", "39"],
          maxChars: 14000,
        });
        if (ctx?.block) {
          gdprAuthorityBlock =
            `${ctx.block}\n\nRULE: Where the GDPR AUTHORITY block is present, statements of these articles' content in the synthesis must be drawn from it.`;
        }
      } catch (e) {
        console.warn(`[Governance] getGdprContext failed: ${String(e).slice(0, 200)}`);
      }
    }

    const synthesisSystem = buildSystemContent({
      toolModule: GOVERNANCE_SYNTHESIS_TOOL_MODULE,
      currentDate: today,
      injected: [
        gdprCitationsBlock,
        gdprAuthorityBlock,
        `ENFORCEMENT CONTEXT (synthesis only):\n${enforcementContextStr}`,
      ].filter(Boolean).join("\n\n"),
      cache: true,
    });

    async function runSynthesis(extra: string): Promise<any> {
      const finalUser = extra ? `${synthesisUserBase}\n\n${extra}` : synthesisUserBase;
      const synthesisText = await callAnthropic("claude-sonnet-4-6", synthesisSystem, finalUser, PRODUCT_MAX_OUTPUT_TOKENS);
      try {
        const m = synthesisText.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
      } catch (e) {
        console.error("[Governance] Synthesis parse error:", e);
      }
      return {
        executive_summary: "Assessment complete. Review domain findings above for full detail.",
        top_three_risks: [],
        immediate_actions: [],
        overall_readiness_rating: "Initial",
        readiness_rationale: "Synthesis could not be completed.",
        interaction_effects: "",
        dpia_scope: [],
      };
    }

    function assembleSynthesisNarrative(syn: any, domains: Record<string, any>): string {
      const parts: string[] = [];
      if (syn?.executive_summary) parts.push(String(syn.executive_summary));
      if (syn?.interaction_effects) parts.push(String(syn.interaction_effects));
      if (syn?.readiness_rationale) parts.push(String(syn.readiness_rationale));
      for (const r of (syn?.top_three_risks || [])) {
        parts.push([r?.risk, r?.why_urgent].filter(Boolean).join(" "));
      }
      for (const a of (syn?.immediate_actions || [])) parts.push(String(a?.action || ""));
      for (const d of Object.values(domains || {})) {
        const dn: any = d;
        parts.push([dn?.current_state, dn?.gap_description, dn?.regulatory_basis, dn?.recommended_action]
          .filter(Boolean).join(" "));
      }
      return parts.join("\n\n");
    }

    let synthesis: any = await runSynthesis("");

    // Output lint: regenerate synthesis once on hard violations; never block delivery.
    const lintOpts = { checkUnresolvedTokens: true, checkDates: true, referenceDate: new Date() };
    let lint = lintReportText(assembleSynthesisNarrative(synthesis, domainResults), lintOpts);
    const lintViolations: any[] = [];
    if (hasHardViolations(lint)) {
      try {
        const details = lint.violations.map((v) => `${v.code}: ${v.detail}`).join("; ");
        synthesis = await runSynthesis(
          `PREVIOUS ATTEMPT REJECTED by automated lint for: ${details}. Produce the JSON again, correcting these defects silently. Do not mention this instruction or the defects in the output.`
        );
        lint = lintReportText(assembleSynthesisNarrative(synthesis, domainResults), lintOpts);
      } catch (e) {
        console.warn("[Governance] lint retry failed (non-fatal):", e);
      }
    }
    for (const v of lint.violations) lintViolations.push(v);



    const strippedDomainFindings: Record<string, any> = {};
    for (const [k, v] of Object.entries(domainResults || {})) {
      const dn: any = v;
      // QB-P25 B2: v2 fields pass through untouched when structurally valid.
      // Malformed or hedged-placeholder v2 objects are dropped (there is no
      // hedged-placeholder slot; either the entry names a specific engaged
      // fact/statute or it is omitted).
      const recV2Valid = isRecommendedActionV2Valid(dn?.recommended_action_v2);
      const basV2Valid = isRegulatoryBasisV2Valid(dn?.regulatory_basis_v2);
      strippedDomainFindings[k] = {
        ...dn,
        current_state: stripMd(dn?.current_state),
        gap_description: stripMd(dn?.gap_description),
        regulatory_basis: stripMd(dn?.regulatory_basis),
        recommended_action: stripMd(dn?.recommended_action),
        recommended_action_v2: recV2Valid ? dn.recommended_action_v2 : undefined,
        regulatory_basis_v2: basV2Valid ? dn.regulatory_basis_v2 : undefined,
      };
    }


    let reportData: any = {
      generated_at: new Date().toISOString(),
      assessment_id,
      organisation_profile: intake,
      executive_summary: stripMd(synthesis.executive_summary),
      top_three_risks: (synthesis.top_three_risks || []).map((r: any) => ({
        ...r,
        risk: stripMd(r?.risk),
        why_urgent: stripMd(r?.why_urgent),
      })),
      immediate_actions: (synthesis.immediate_actions || [])
        .filter((a: any) => !failedDomainNames.has(String(a?.domain || "").toLowerCase()))
        .map((a: any) => ({
          ...a,
          action: stripMd(a?.action),
        })),
      overall_readiness_rating: synthesis.overall_readiness_rating || "Initial",
      readiness_rationale: stripMd(synthesis.readiness_rationale || ""),
      interaction_effects: stripMd(synthesis.interaction_effects || ""),
      domain_findings: strippedDomainFindings,
      enforcement_precedents: enforcementPrecedents,
      enforcement_meta: enforcementMeta,
      annotations: (() => { try { return Array.isArray(synthesis?.annotations) ? synthesis.annotations : []; } catch { return []; } })(),
      information_needed: Array.isArray((synthesis as any)?.information_needed) ? (synthesis as any).information_needed : [],
      lint_warnings: dedupeLintWarnings([
        ...failedDomains.map((d) => ({
          code: "domain_assessment_failed",
          severity: "hard",
          detail: d.domain_name,
        })),
        ...lintViolations,
      ]),
      disclaimer: (() => {
        const _juris = (intake?.jurisdictions || []) as string[];
        const _hasEuUk = intake?.eu_uk_data === true
          || String(intake?.eu_uk_data || "").toLowerCase() === "yes"
          || _juris.some((j: string) => ["EU", "GB", "UK"].includes(String(j).toUpperCase()));
        return _hasEuUk
          ? "This report helps your organisation identify potential GDPR governance gaps. It does not constitute legal advice. Findings should be validated against your organisation's authoritative records before operational reliance."
          : "This report helps your organisation identify potential privacy governance gaps under the applicable US state privacy laws. It does not constitute legal advice. Findings should be validated against your organisation's authoritative records before operational reliance.";
      })(),
    };

    // Stage 5: forward-path guard (strip invented information_needed fields; log dead-ends).
    const guarded = guardInformationNeeded(reportData, ((assessment as any).intake_data as Record<string, unknown>) ?? intake ?? {}, "governance_assessment");
    reportData = guarded.report;

    // QB7-3(a): enforce TIMELINE VOICE post-generation (main path).
    applyTimelineForm(reportData);
    hoistNestedInformationNeeded(reportData);

    // Doc Y: post-generation transfer-language gate (non-EU/UK runs) + Cal.
    // Civ. Code citation-existence validator. Non-fatal; console.warn only.
    applyDocYPostGeneration(
      reportData,
      ((assessment as any).intake_data as Record<string, unknown>) ?? intake ?? {},
    );

    // PRODUCT-FIX-4 T2 — terminal US-state jurisdiction-closure scrub.
    try {
      const scrubbed = applyJurisdictionClosureScrub(
        reportData,
        Array.isArray((intake as any)?.jurisdictions) ? ((intake as any).jurisdictions as string[]) : [],
      );
      if (scrubbed > 0) {
        console.warn(`[run-governance-assessment] PRODUCT-FIX-4 T2 jurisdiction-closure scrub: ${scrubbed} occurrence(s) rewritten`);
      }
    } catch (e) {
      console.warn("[run-governance-assessment] PRODUCT-FIX-4 T2 scrub failed (non-fatal):", e);
    }



    const dpiaScope = synthesis.dpia_scope || [];

    (reportData as any)._meta = { ...((reportData as any)._meta ?? {}), prompt_version: stampPromptVersion("governance-assessment", "r1b2.2-cv1-r") };

    // Stage 1: metering + version retention (written BEFORE status:complete).
    await recordRunMeterAndVersion(supabase, {
      toolType: "governance_assessment",
      assessmentId: assessment_id,
      userId: assessment.user_id ?? null,
      intake: {
        organization_name: (assessment as any).organization_name ?? (assessment as any).intake_data?.organization_name ?? null,
        jurisdiction: (assessment as any).jurisdiction ?? (assessment as any).intake_data?.jurisdiction ?? null,
      },
      reportData,
    });

    try { const _prose = extractProseFromReport(reportData); const _roster = extractIntakeRoster((assessment as any).intake_data ?? intake ?? {}); const _det = runFormatChecksGeneric(_prose, { intakeRoster: _roster }).map(x=>({...x, check_type:'deterministic' as const})); attachDeterministicChecks(reportData as any, _det as any); } catch(_) {}

    // ── GOVERNANCE-REGISTRY-WIRING — deterministic post-pass (2026-07-25) ──
    // Registry-first citation stamping + write-around for unanchorable
    // propositions. Telemetry writes to `_meta.internal.governance_w1`.
    try {
      const { applyW1GovernanceWire } = await import("./_w1_governance_wire.ts");
      applyW1GovernanceWire(reportData);
    } catch (e) {
      console.warn("[run-governance-assessment] GOVERNANCE-REGISTRY-WIRING post-pass failed (non-fatal):", (e as Error)?.message);
    }

    // ── GOVERNANCE-T6-FIX — Class A citation audit + Class B business-claim
    // scrub (2026-07-25). Runs AFTER _w1_governance_wire and BEFORE the
    // LEAK-PREV-P1 emit gate so the gate sees the neutralized surface.
    // Telemetry writes to `_meta.internal.gov_t6fix`. Fail-open.
    try {
      const { applyGovT6Fix } = await import("./_gov_t6_fix.ts");
      applyGovT6Fix(reportData, {
        intake: ((assessment as any).intake_data as Record<string, unknown>) ?? intake ?? {},
        buildStamp: BUILD_STAMP,
      });
    } catch (e) {
      console.warn("[run-governance-assessment] GOVERNANCE-T6-FIX post-pass failed (non-fatal):", (e as Error)?.message);
    }

    // ── ITEM 313 — GOVERNANCE ANALYTIC DELIVERABLES (single-writer) ────
    // Deterministic builder for the Art. 5(2)/24(1) accountability
    // determination, demonstrability findings, the Art. 30(1)(a)-(g) element
    // walk plus the Art. 30(5) exemption, the Art. 37/38/39 DPO determination,
    // and the Art. 24(1) risk-calibration and review-and-update findings.
    // DEMOTION LAW: this pass also removes `overall_readiness_rating` /
    // `readiness_rationale` from the headline and re-emits the tier as a
    // labelled non-statutory readability aid. Fail-open.
    try {
      const { attachGovernanceDeliverables } = await import("../_shared/ltp/governance-deliverables/build.ts");
      const govTelemetry = attachGovernanceDeliverables(
        reportData as Record<string, unknown>,
        ((assessment as any).intake_data as Record<string, unknown>) ?? intake ?? {},
      );
      (reportData as any)._meta = {
        ...((reportData as any)._meta ?? {}),
        internal: { ...(((reportData as any)._meta ?? {}).internal ?? {}), governance_item313: govTelemetry },
      };
    } catch (e) {
      console.warn("[run-governance-assessment] ITEM 313 deliverables failed (non-fatal):", (e as Error)?.message);
    }



    // ── LEAK-PREV-P1 — EMIT GATE (2026-07-25) ──────────────────────────
    // Runs AFTER the wire post-pass and BEFORE the P2 serializer so gate
    // telemetry rides `_meta.internal`. Fail-visible; never blocks.
    try {
      const { runEmitGate } = await import("../_shared/emit-gate.ts");
      runEmitGate(reportData as any, {
        tool: "governance_assessment",
        intakeRoster: ((assessment as any).intake_data as Record<string, unknown>) ?? intake ?? {},
      });
    } catch (e) {
      console.warn("[run-governance-assessment] LEAK-PREV-P1 emit-gate wrapper failed (non-fatal):", (e as Error)?.message);
    }

    // ── LEAK-PREV-P2 — SCHEMA-DRIVEN SERIALIZER (2026-07-25) ───────────
    // Whitelist top-level keys; internal telemetry survives via
    // `_meta.internal` reduction inside the serializer (stamp-echo key
    // `_meta.internal.governance_w1` per dispatch §5). On crash, keep
    // pre-serialized reportData (previous behaviour).
    try {
      const { serializeCustomerReport } = await import("../_shared/report-serialize.ts");
      const { GOVERNANCE_REPORT_SCHEMA } = await import("../_shared/report-schemas/governance.ts");
      const { report: serialized, telemetry } = serializeCustomerReport(reportData as any, GOVERNANCE_REPORT_SCHEMA);
      if (!telemetry.crashed && serialized && typeof serialized === "object") {
        reportData = serialized as any;
      }
    } catch (e) {
      console.warn("[run-governance-assessment] LEAK-PREV-P2 serializer failed (non-fatal):", (e as Error)?.message);
    }

    const completeWrite = await lifecycleUpdate(supabase, "governance_assessments", assessment_id, {
      status: "complete",
      report_data: reportData,
      dpia_scope: dpiaScope,
      updated_at: new Date().toISOString(),
    }, { fn: "run-governance-assessment", phase: "terminal_complete" });
    if (!completeWrite.ok) {
      await lifecycleUpdate(supabase, "governance_assessments", assessment_id, { status: "failed" }, { fn: "run-governance-assessment", phase: "terminal_fallback" });
    }


    await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "governance_assessments", sourceRowId: assessment_id });

    // C4 RoPA accumulator: governance assessment surfaces a "Programme governance" obligation
    if (assessment.client_id) {
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: assessment.client_id,
          source_tool: "governance_assessment",
          source_assessment_id: assessment_id,
          display_name: "Privacy programme governance",
          source_summary: "Drafted from Governance Assessment — review domain findings and link to RoPA categories.",
          is_high_risk: false,
          category: "finance_legal",
        },
      }).catch((e: Error) => console.error("[gov] accumulate-ropa failed (non-fatal):", e.message));
    }


    const { data: userData } = await supabase.auth.admin.getUserById(
      assessment.user_id
    ).catch(() => ({ data: null as any }));

    // Fire-and-forget upsell signals (non-fatal).
    supabase.functions.invoke('trigger-upsell', {
      body: { tool_type: 'governance_assessment', assessment_id, user_id: assessment.user_id },
    }).catch((e: Error) => console.error('[gov] trigger-upsell failed (non-fatal):', e.message));

    // INC-2: generate-report-pdf is verifyCaller-gated. Use raw fetch with
    // explicit service-role bearer — supabase.functions.invoke drops the
    // header server-to-server and every PDF silently 401s. Awaited so the
    // background block does not exit before the PDF write completes.
    await invokeGated("generate-report-pdf", {
      tool_type: "governance_assessment",
      assessment_id,
      user_email: userData?.user?.email || null,
      user_name: userData?.user?.user_metadata?.full_name || null,
      result_url: `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/governance-assessment/result/${assessment_id}`,
    }).then((r) => { if (!r.ok) console.error("[gov] PDF/email delivery failed (non-fatal):", r.status, r.body || r.error); });

      } catch (bgErr) {
        await failFunctionRun(supabase, fnRun, bgErr);
        console.error("run-governance-assessment background error:", bgErr);
        if (assessment_id) {
          await lifecycleUpdate(supabase, "governance_assessments", assessment_id, { status: "failed" }, { fn: "run-governance-assessment", phase: "terminal_error_catch" });
        }
      }
    })());

    return new Response(JSON.stringify({ success: true, assessment_id, status: "processing" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("run-governance-assessment error:", e);
    if (assessment_id) {
      await lifecycleUpdate(supabase, "governance_assessments", assessment_id, { status: "failed" }, { fn: "run-governance-assessment", phase: "outer_catch" });
    }
    return new Response(JSON.stringify({ error: "Assessment failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
