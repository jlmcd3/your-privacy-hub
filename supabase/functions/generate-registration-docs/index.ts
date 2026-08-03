// Generate registration documents (DPO appointment letter, RoPA template,
// AI Act registration draft, Article 27 representative letter) for each
// jurisdiction in a registration order, using Anthropic Claude.
// Filing Instructions are deterministic and never AI-composed.
//
// Writes one row per (order, jurisdiction, document_type) into
// registration_documents with content_text. PDFs can be generated lazily by
// the existing generate-report-pdf function on download.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withReportDisclaimer } from "../_shared/report-disclaimer.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { auditCitations } from "./_local/citation-audit.ts";
import { buildSystemContent, type ToolModule, type SystemBlock, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";

console.log(`[generate-registration-docs] build active · core=${PROMPT_CORE_VERSION}`);
import {
  renderGdprCitationBlock,
  renderAiActCitationBlock,
  renderTransferAdequacyNote,
} from "../_shared/gdpr-registry.ts";
import { renderIcoPenaltyFigures } from "../_shared/enforcement-figures-registry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SONNET_MODEL = "claude-sonnet-4-6";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// Verbatim system prompt — guardrails for AI Act citations, monetary penalties,
// adequacy decisions, English-only, plain text formatting.
const REGISTRATION_TOOL_MODULE: ToolModule = {
  outputMode: "document",
  languageVariant: "jurisdiction-conditional",
  citationFramework:
    "Cite primary instruments by their official identifier (e.g. \"Regulation (EU) 2016/679\" for the GDPR; \"Regulation (EU) 2024/1689\" for the EU AI Act). Use the real registration/supervisory authority name for the filing jurisdiction. Do not invent statute numbers, article numbers, or filing-reference formats you are not certain of — use a [Verify] placeholder instead.",
  identity:
    "You are a privacy compliance specialist drafting a single jurisdiction-specific regulatory filing (one of: Data Protection Officer appointment letter, Records of Processing Activities template, EU AI Act registration draft, or Article 27 representative appointment letter). Produce only the requested document, for the stated jurisdiction and authority.",
  extraRules: [
    "FORMAT — output clean plain text only. No markdown symbols of any kind (#, ##, ###, **, *, _, backticks, >). Section headings sit on their own line in Title Case, followed by a blank line, then prose or bullets. Bullets use the character • followed by a space (never * or -). Numbered lists use incrementing integers starting at 1 with no repeats. No preamble, no closing commentary, no translated text — the document only.",
    "PLACEHOLDERS — use [Bracketed Title Case] placeholders for organization-specific values the filer must complete (e.g. [Organization Name], [DPO Full Name], [Filing Date]). Never fabricate a concrete value where a placeholder belongs.",
    "JURISDICTION FIELD COMPLETENESS: never leave law or region null for a jurisdiction that is in scope. For an EU jurisdiction, law is \"GDPR\" (Regulation (EU) 2016/679) and region is \"EU\"; for the UK, law is \"UK GDPR / DPA 2018\" and region is \"UK\". If a jurisdiction is included because the organisation targets its residents without an establishment there, still populate law/region and add a brief note on the Article 27 representative threshold rather than emitting an empty entry.",
    "UK REGISTRATION = ICO FEE: in the UK there is no separate registration filing distinct from the ICO data-protection fee — payment of the fee IS the registration. Do not list \"registration\" and \"ico_fee\" as two separate obligations as though they were distinct steps; list the ICO fee obligation and state in the notes that paying the fee constitutes UK data-protection registration.",
    "ICO FEE TIERS — DO NOT STATE ELIGIBILITY THRESHOLDS FROM MEMORY: state the applicable fee as the amount supplied in the record. Do NOT generate the staff-count or turnover thresholds that define the ICO fee tiers (e.g. \"≤10 staff or turnover ≤£632K\", \"≤250 staff and turnover ≤£36M\") from training knowledge — they are easily mis-stated and mis-mapped between tiers. Where the tier basis is relevant, direct the user to the ICO's published fee schedule under the Data Protection (Charges and Information) Regulations 2018 (as amended) to confirm which tier applies, rather than asserting the thresholds yourself.",
    "REPRESENTATIVE-REQUIRED BASIS: whenever representative_required is set true or false for a jurisdiction the organisation targets without an establishment there, state the basis. Under GDPR/UK GDPR Article 27 a non-established controller targeting that jurisdiction's residents must appoint a representative UNLESS processing is occasional, does not include large-scale special-category data, and is unlikely to result in risk. If the intake does not establish which limb applies, do not silently set false — set the value conditionally and flag that the Article 27 threshold must be confirmed (regular/systematic monitoring or large-scale special-category processing).",
    // EU AI Act phased dates, adequacy citations, and ICO penalty figures are
    // injected verbatim from the shared registry (see `injected` below). The
    // load-bearing guards ("never call the AI Act a proposal", "never state a
    // training-data figure", "[Verify current status]" for other adequacy
    // decisions) survive intact inside those renderers.
  ].join("\n\n"),
};

const DOCUMENT_TYPES = [
  { type: "dpo_appointment", title: "Data Protection Officer Appointment Letter", when: (r: any) => r.dpo_required },
  { type: "ropa", title: "Record of Processing Activities (RoPA) Template", when: () => true },
  { type: "ai_registration", title: "AI System Registration Draft", when: (r: any) => r.ai_registration_required },
  { type: "representative_letter", title: "Article 27 Representative Designation", when: (r: any) => r.representative_required },
  { type: "filing_instructions", title: "Filing Instructions & Checklist", when: () => true },
];

async function callClaude(
  model: string,
  system: string | SystemBlock[],
  userContent: string,
  maxTokens: number = PRODUCT_MAX_OUTPUT_TOKENS,
  timeoutMs: number = 720_000
): Promise<{ text: string; stopReason: string | null }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const startedAt = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const stopReason: string | null = data.stop_reason ?? null;
  const elapsed = Date.now() - startedAt;
  console.log(`[generate-registration-docs] stage=callClaude model=${model} elapsed=${elapsed}ms stop=${stopReason} chars=${text.length}`);
  return { text, stopReason };
}

// Concurrency-capped parallel map — keeps Anthropic load bounded while
// collapsing per-document latency, so the 400s wall-clock budget holds.
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

function fmtFee(cents: number | null | undefined, currency: string | null | undefined): string {
  if (!cents || cents <= 0) return "";
  const amount = (cents / 100).toFixed(2).replace(/\.00$/, "");
  return `${amount} ${currency || ""}`.trim();
}

function buildFilingInstructions(r: any, applicableDocTypes: string[]): string {
  const out: string[] = [];
  out.push(`Filing Instructions & Checklist`);
  out.push("");
  out.push(`Filing checklist for ${r.jurisdiction_name} under ${r.law_name}, supervised by ${r.authority_name}.`);
  out.push("");

  const buckets = new Set<string>();
  if (r.registration_required && applicableDocTypes.length > 0) buckets.add("registration");
  if (applicableDocTypes.includes("dpo_appointment")) buckets.add("dpo");
  if (applicableDocTypes.includes("ai_registration")) buckets.add("ai");
  if (applicableDocTypes.includes("representative_letter")) buckets.add("representative");

  const steps: any[] = Array.isArray(r.filing_steps) ? r.filing_steps : [];
  const filtered = steps.filter((s) => !s.applies_when || buckets.has(s.applies_when));

  let n = 1;
  for (const s of filtered) {
    out.push(`${n}. ${s.title}`);
    if (s.detail) out.push(`   ${s.detail}`);
    if (s.url) out.push(`   ${s.url}`);
    out.push("");
    n += 1;
  }
  return out.join("\n");
}

function stripMarkdown(s: string): string {
  return (s || "")
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

// ── Deterministic validation ───────────────────────────────────────────────
function validateDocument(
  text: string,
  r: any,
  otherAuthorityNames: string[]
): string[] {
  const failures: string[] = [];
  const expectedFee = fmtFee(r.filing_fee_cents, r.filing_currency);

  // a) Fee contradiction. Find currency-amount patterns; any 4+ digit amount in a
  //    fee context that does not equal the injected fee fails.
  if (r.filing_fee_cents && r.filing_fee_cents > 0) {
    const feeContextRegex = /(fee|filing fee|cost|charge|amount)[^.\n]{0,80}?([€$£¥]\s?[\d,]+(?:\.\d+)?|(?:USD|EUR|GBP|CHF|JPY|CAD|AUD)\s?[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s?(?:USD|EUR|GBP|CHF|JPY|CAD|AUD))/gi;
    let m: RegExpExecArray | null;
    while ((m = feeContextRegex.exec(text)) !== null) {
      const amountStr = m[2].replace(/[^\d.,]/g, "").replace(/,/g, "");
      const amount = parseFloat(amountStr);
      const expectedAmount = r.filing_fee_cents / 100;
      if (Number.isFinite(amount) && Math.abs(amount - expectedAmount) > 0.01) {
        failures.push(`fee contradiction (found ${m[2]} but expected ${expectedFee})`);
        break;
      }
    }
  }

  // b) Authority/law presence
  if (r.authority_name && !text.toLowerCase().includes(String(r.authority_name).toLowerCase())) {
    failures.push("missing authority/law reference (authority_name not present)");
  }
  if (r.law_name && !text.toLowerCase().includes(String(r.law_name).toLowerCase())) {
    failures.push("missing authority/law reference (law_name not present)");
  }
  for (const otherName of otherAuthorityNames) {
    if (!otherName || otherName === r.authority_name) continue;
    if (text.toLowerCase().includes(otherName.toLowerCase())) {
      failures.push(`wrong authority referenced (${otherName})`);
      break;
    }
  }

  // c) Banned-claims scan
  const proposalRegex = /\b(proposal|proposed)\b(?:\s+\S+){0,5}\s+AI Act|AI Act(?:\s+\S+){0,5}\s+\b(proposal|proposed)\b/i;
  if (proposalRegex.test(text)) failures.push('banned phrase: "proposal/proposed" near "AI Act"');

  const regulationRegex = /Regulation\s*\(EU\)\s*(\d{4}\/\d+)/gi;
  let rm: RegExpExecArray | null;
  while ((rm = regulationRegex.exec(text)) !== null) {
    const num = rm[1];
    if (num !== "2024/1689" && num !== "2016/679") {
      failures.push(`disallowed Regulation (EU) ${num}`);
      break;
    }
  }

  // d) Monetary penalty: currency symbol followed by 4+ digit number outside fee statement context
  const feeFreeText = text.replace(/(fee|filing fee|cost|charge|amount)[^.\n]{0,80}?[€$£¥]\s?[\d,]+(?:\.\d+)?/gi, "");
  if (/[€$£¥]\s?\d{4,}/.test(feeFreeText)) {
    failures.push("specific monetary penalty outside fee statement");
  }

  return failures;
}

// Per-jurisdiction recognised national implementing statute(s). Sourced here
// rather than from a single global list so a correct national citation survives
// the auditor untouched.
const JURISDICTION_IMPLEMENTING_STATUTES: Record<string, string[]> = {
  UK: ["Data Protection Act 2018", "DPA 2018", "PECR 2003", "Privacy and Electronic Communications (EC Directive) Regulations 2003", "Data (Use and Access) Act 2025", "DUAA"],
  DE: ["Bundesdatenschutzgesetz", "BDSG"],
  IE: ["Data Protection Act 2018"],
  FR: ["Loi Informatique et Libertés", "Loi n° 78-17"],
  ES: ["Ley Orgánica 3/2018", "LOPDGDD"],
  NL: ["Uitvoeringswet AVG", "UAVG"],
  IT: ["Decreto Legislativo 196/2003", "Codice Privacy"],
  SE: ["Dataskyddslagen", "Lag (2018:218)"],
  DK: ["Databeskyttelsesloven", "Lov nr. 502 af 23. maj 2018"],
  BE: ["Loi du 30 juillet 2018", "Wet van 30 juli 2018"],
  AT: ["Datenschutzgesetz", "DSG"],
  FI: ["Tietosuojalaki", "Data Protection Act (1050/2018)"],
  PL: ["Ustawa o ochronie danych osobowych z dnia 10 maja 2018"],
  PT: ["Lei n.º 58/2019"],
  CZ: ["Zákon č. 110/2019 Sb."],
  HU: ["2011. évi CXII. törvény", "Infotv."],
  RO: ["Legea nr. 190/2018"],
  GR: ["Νόμος 4624/2019", "Law 4624/2019"],
  LU: ["Loi du 1er août 2018"],
  CH: ["Federal Act on Data Protection", "FADP", "nFADP", "revFADP"],
  US: ["California Consumer Privacy Act", "CCPA", "California Privacy Rights Act", "CPRA"],
};

// Recognised EU regulation/decision numbers — anything else of the form
// "Regulation (EU) NNNN/NNNN" or "Decision (EU) NNNN/NNNN" is treated as
// potentially fabricated and may be silently replaced. Other UNSUPPORTED
// citations (real laws/cases/decisions not in the provided facts) are flagged
// for human review rather than rewritten.
const RECOGNISED_EU_INSTRUMENT_NUMBERS = new Set<string>([
  "2016/679", // GDPR
  "2024/1689", // AI Act
  "2018/1725", // EUDPR
  "2016/680", // LED
  "2022/2065", // DSA
  "2022/1925", // DMA
  "2023/2854", // Data Act
  "2022/868", // Data Governance Act
]);

function looksLikeFabricatedEuInstrument(cite: string): boolean {
  const m = cite.match(/(Regulation|Decision|Directive)\s*\(EU\)\s*(\d{4}\/\d+)/i);
  if (!m) return false;
  return !RECOGNISED_EU_INSTRUMENT_NUMBERS.has(m[2]);
}

async function haikuCitationCheck(
  text: string,
  r: any,
): Promise<{ replacements: string[]; flaggedForReview: string[]; updatedText: string }> {
  const nationalStatutes = JURISDICTION_IMPLEMENTING_STATUTES[r.jurisdiction_code] || [];
  return await auditCitations(
    {
      text,
      lawName: r.law_name,
      authorityName: r.authority_name,
      jurisdictionStatutes: nationalStatutes,
    },
    async (model, system, user, maxTokens) => {
      const resp = await callClaude(model, system, user, maxTokens ?? 1500);
      return { text: resp.text };
    },
    HAIKU_MODEL,
  );
}


function buildUserPrompt(
  docDef: { type: string; title: string },
  r: any,
  orgSnapshot: any,
  retryReasons?: string[]
): string {
  let prompt = `Draft a "${docDef.title}" for the following organization, tailored to ${r.jurisdiction_name} (${r.law_name}, supervised by ${r.authority_name}).

Organization details:
${JSON.stringify(orgSnapshot, null, 2)}

Jurisdiction requirements:
- Authority: ${r.authority_name} (${r.authority_url || "N/A"})
- Law: ${r.law_name}
- Registration required: ${r.registration_required ? "Yes — " + (r.registration_threshold || "see threshold") : "No"}
- DPO required: ${r.dpo_required ? "Yes — " + (r.dpo_threshold || "") : "No"}
- AI registration: ${r.ai_registration_required ? "Yes — " + (r.ai_threshold || "") : "No"}
- Filing fee: ${r.filing_fee_cents ? (r.filing_fee_cents / 100) + " " + r.filing_currency : "Free"}
- Renewal: ${r.renewal_period_months ? r.renewal_period_months + " months" : "None"}
- Languages: ${(Array.isArray(r.language_requirements) ? r.language_requirements : []).join(", ") || "English"}
- Notes: ${r.notes || "None"}

Output clean plain text with clear section headings (Title Case, on their own line, followed by a blank line), bullet items using the • character, and signature blocks where relevant. Do not use markdown symbols (#, **, *, _, backticks, >). Use [Bracketed Placeholders] for fields the user must complete.`;
  if (retryReasons && retryReasons.length) {
    prompt += `\n\nPREVIOUS ATTEMPT FAILED VALIDATION: ${retryReasons.join("; ")}. Correct these issues. Do not introduce any new factual claims.`;
  }
  return prompt;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const fnRun = await startFunctionRun(supabase, "generate-registration-docs", {
    archetype: "async",
    trustClass: "user",
    invokedBy: "user",
  });

  try {
    const { order_id, jurisdiction_code } = await req.json();
    if (!order_id) {
      await failFunctionRun(supabase, fnRun, new Error("order_id required"));
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fast existence check.
    const { data: order, error: orderErr } = await supabase
      .from("registration_orders")
      .select("*")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) {
      await failFunctionRun(supabase, fnRun, orderErr || new Error("Order not found"));
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DISPATCHER (no jurisdiction_code): claim order, fan out, return fast ──
    if (!jurisdiction_code) {
      await supabase.from("registration_orders").update({
        fulfillment_status: "generating",
        documents_generation_started_at: new Date().toISOString(),
      }).eq("id", order_id);

      const codes: string[] = order.jurisdictions || [];
      // @ts-ignore EdgeRuntime is a Deno Deploy/Supabase runtime global
      EdgeRuntime.waitUntil((async () => {
        // CRITICAL: await each invoke so the isolate stays alive until the
        // Functions Gateway has accepted every worker request. Previously these
        // were fire-and-forget, which let the runtime tear down before any
        // worker fetch actually left the box — orders sat in `generating`
        // forever with zero worker function_runs recorded.
        const results = await Promise.allSettled(
          codes.map((code) =>
            supabase.functions.invoke("generate-registration-docs", {
              body: { order_id, jurisdiction_code: code },
            }),
          ),
        );
        results.forEach((r, i) => {
          if (r.status === "rejected") {
            console.error(`[reg] dispatch ${codes[i]} failed`, r.reason);
          }
        });
      })());

      await finishFunctionRun(supabase, fnRun, {
        status: "success",
        sourceTable: "registration_orders",
        sourceRowId: order_id,
        metadata: { dispatched: codes.length, role: "dispatcher" },
      });
      return new Response(JSON.stringify({
        order_id, status: "generating", dispatched: codes.length,
      }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── WORKER (jurisdiction_code present): generate just this jurisdiction ──
    // @ts-ignore EdgeRuntime is a Deno Deploy/Supabase runtime global
    EdgeRuntime.waitUntil((async () => {
      try {
        const { data: reqRows, error: reqsErr } = await supabase
          .from("jurisdiction_requirements")
          .select("*")
          .eq("jurisdiction_code", jurisdiction_code);
        if (reqsErr) throw reqsErr;
        const r = reqRows?.[0];
        if (!r) throw new Error(`worker: missing requirement for ${jurisdiction_code}`);

        const { data: allReqs } = await supabase
          .from("jurisdiction_requirements")
          .select("authority_name");
        const allAuthorityNames: string[] = ((allReqs as any[]) || [])
          .map((x) => x?.authority_name)
          .filter((n): n is string => typeof n === "string" && n.length > 0);
        const otherAuthorityNames = allAuthorityNames.filter((n) => n !== r.authority_name);

        const orgSnapshot = order.organization_snapshot || {};
        const today = new Date().toISOString().slice(0, 10);
        const orderCodes: string[] = Array.isArray(order.jurisdictions) ? order.jurisdictions : [];
        const upperCodes = orderCodes.map((c) => String(c).toUpperCase());
        const isUk = upperCodes.includes("UK") || upperCodes.includes("GB");
        const gdprBlock = renderGdprCitationBlock({
          regime: isUk ? "uk_gdpr" : "gdpr",
          jurisdictions: orderCodes,
        });
        const registryInjections = [
          gdprBlock,
          renderAiActCitationBlock(),
          renderTransferAdequacyNote(),
          renderIcoPenaltyFigures(),
        ].filter(Boolean).join("\n\n");
        const registrationSystem: SystemBlock[] = buildSystemContent({
          toolModule: REGISTRATION_TOOL_MODULE,
          currentDate: today,
          injected: registryInjections || undefined,
          cache: true,
        });

        const applicableDocs = DOCUMENT_TYPES.filter((d) => d.when(r));
        const applicableTypes = applicableDocs.map((d) => d.type);

        // Edit C: insert each document immediately so a kill loses at most one.
        await mapPool(applicableDocs, 5, async (docDef) => {
          let cleaned: string;
          let model: string;
          let status: "ready" | "needs_review" = "ready";
          const notes: string[] = [];

          if (docDef.type === "filing_instructions") {
            cleaned = buildFilingInstructions(r, applicableTypes);
            model = "deterministic-template";
          } else {
            const notesEarly: string[] = [];
            let initial = await callClaude(SONNET_MODEL, registrationSystem, buildUserPrompt(docDef, r, orgSnapshot));
            if (initial.stopReason === "max_tokens") {
              console.warn(`[reg-docs] ${r.jurisdiction_code}/${docDef.type} truncated — single retry`);
              initial = await callClaude(SONNET_MODEL, registrationSystem, buildUserPrompt(docDef, r, orgSnapshot), PRODUCT_MAX_OUTPUT_TOKENS);
              if (initial.stopReason === "max_tokens") {
                notesEarly.push("truncated_output: document hit token ceiling twice");
              }
            }
            let raw = initial.text;
            cleaned = stripMarkdown(raw);
            let failures = validateDocument(cleaned, r, otherAuthorityNames);
            if (failures.length > 0) {
              try {
                const r2 = await callClaude(SONNET_MODEL, registrationSystem, buildUserPrompt(docDef, r, orgSnapshot, failures));
                raw = r2.text;
                cleaned = stripMarkdown(raw);
                failures = validateDocument(cleaned, r, otherAuthorityNames);
              } catch (e) {
                failures.push(`regeneration failed: ${(e as Error).message}`);
              }
            }
            model = SONNET_MODEL;
            for (const ne of notesEarly) notes.push(ne);
            if (notesEarly.some((n) => n.startsWith("truncated_output"))) status = "needs_review";
            if (failures.length > 0) {
              status = "needs_review";
              notes.push(`Validation: ${failures.join("; ")}`);
            } else {
              const { replacements, flaggedForReview, updatedText } = await haikuCitationCheck(cleaned, r);
              cleaned = updatedText;
              if (replacements.length) notes.push(`Citation check: ${replacements.join("; ")}`);
              if (flaggedForReview.length) {
                notes.push(`Citations flagged for human review (not rewritten): ${flaggedForReview.join("; ")}`);
                status = "needs_review";
              }
            }

            const referenceDate = new Date().toISOString();
            let lint = lintReportText(cleaned, { checkDates: true, checkUnresolvedTokens: true, referenceDate });
            if (lint.clean !== cleaned) cleaned = lint.clean;
            if (hasHardViolations(lint)) {
              try {
                const details = lint.violations.filter((v) => v.severity === "hard")
                  .map((v) => `${v.code}: ${v.detail}`).join("; ");
                const retryRaw = await callClaude(
                  SONNET_MODEL,
                  registrationSystem,
                  buildUserPrompt(docDef, r, orgSnapshot, [`lint: ${details}`]) +
                  `\n\nPREVIOUS DRAFT REJECTED by automated lint for: ${details}. Reproduce the document correcting these defects silently. Do not mention this instruction.`,
                );
                const retryCleaned = stripMarkdown(retryRaw.text);
                const retryLint = lintReportText(retryCleaned, { checkDates: true, checkUnresolvedTokens: true, referenceDate });
                if (!hasHardViolations(retryLint)) {
                  cleaned = retryLint.clean;
                  lint = retryLint;
                } else {
                  notes.push(`Lint (post-retry): ${retryLint.violations.map((v) => v.code).join(", ")}`);
                  status = "needs_review";
                }
              } catch (e) {
                notes.push(`Lint retry failed: ${(e as Error).message}`);
                status = "needs_review";
              }
            }
            if (lint.violations.length) notes.push(`Lint: ${lint.violations.map((v) => v.code).join(", ")}`);
          }

          // Universal EUP report disclaimer — exactly once, at the very end.
          const contentWithDisclaimer = withReportDisclaimer(cleaned);


          // Edit C — INSERT IMMEDIATELY (no post-loop batch).
          await supabase.from("registration_documents").insert({
            order_id,
            jurisdiction_code: r.jurisdiction_code,
            document_type: docDef.type,
            language: "en",
            content_text: contentWithDisclaimer,
            generation_model: model,
            status,
            validation_notes: notes.length ? notes.join(" | ") : null,
          });
        });

        // Optimistic finalize: if every jurisdiction has docs, flip terminal (guarded).
        // Race with sibling workers is fine — the guard + scheduled finalizer cover us.
        const { data: docs } = await supabase
          .from("registration_documents")
          .select("jurisdiction_code")
          .eq("order_id", order_id);
        const haveJur = new Set((docs ?? []).map((d: any) => d.jurisdiction_code));
        if (haveJur.size >= (order.jurisdictions ?? []).length) {
          const { data: flipped } = await supabase.from("registration_orders").update({
            fulfillment_status: order.tier === "diy" ? "documents_ready" : "ready_to_file",
            documents_generated_at: new Date().toISOString(),
          }).eq("id", order_id).eq("fulfillment_status", "generating").select("id").maybeSingle();
          if (flipped) {
            try { await supabase.functions.invoke("schedule-registration-renewals", { body: { order_id } }); } catch (_) {}
            try { await supabase.functions.invoke("send-registration-delivery-email", { body: { order_id } }); } catch (_) {}
          }
        }

        await finishFunctionRun(supabase, fnRun, {
          status: "success",
          sourceTable: "registration_orders",
          sourceRowId: order_id,
          metadata: { jurisdiction_code, role: "worker" },
        });
      } catch (e) {
        console.error(`[reg worker ${jurisdiction_code}]`, e);
        await failFunctionRun(supabase, fnRun, e);
        // Do NOT fail the whole order here — the scheduled finalizer (retry-failed-generations)
        // decides terminal state across all sibling workers.
      }
    })());

    return new Response(JSON.stringify({
      order_id, jurisdiction_code, status: "generating",
    }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await failFunctionRun(supabase, fnRun, e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

