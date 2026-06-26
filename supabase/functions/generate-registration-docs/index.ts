// Generate registration documents (DPO appointment letter, RoPA template,
// AI Act registration draft, Article 27 representative letter) for each
// jurisdiction in a registration order, using Anthropic Claude.
// Filing Instructions are deterministic and never AI-composed.
//
// Writes one row per (order, jurisdiction, document_type) into
// registration_documents with content_text. PDFs can be generated lazily by
// the existing generate-report-pdf function on download.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { auditCitations } from "../_shared/citation-audit.ts";
import { buildSystemContent, type ToolModule, type SystemBlock } from "../_shared/prompt-core.ts";
import { renderGdprCitationBlock } from "../_shared/gdpr-registry.ts";

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
const SYSTEM_PROMPT =
  "You are a privacy compliance expert drafting jurisdiction-specific filings. Always write in English regardless of the jurisdiction. Output clean plain text only — NO markdown symbols of any kind. Do not use #, ##, ###, **, *, _, backticks, or > for formatting. Structure documents with section headings on their own line in Title Case followed by a blank line, then prose or bullet items. For bullets, use the bullet character • followed by a space at the start of the line (not * or -). Use real authority names, real laws, and realistic but generic placeholder values like [Organization Name]. Do not invent statute numbers you are not sure of. MANDATORY CITATIONS — these must be used exactly as shown: EU Artificial Intelligence Act: \"Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024\" — this regulation entered into force on 1 August 2024. NEVER call it a \"proposal\", \"proposed regulation\", or \"draft\". It is enacted law. Never use 2024/900 or any other regulation number for the AI Act. AI ACT PHASED APPLICATION DATES — cite the date that matches the registration/system type: prohibited AI practices (Article 5) applied from 2 February 2025; general-purpose AI model obligations (Chapter V) applied from 2 August 2025; the majority of high-risk AI system obligations (Article 6(2) / Annex III systems and most of Chapters III, IV, VI–IX) apply from 2 August 2026; obligations for high-risk AI systems embedded as safety components in products covered by the Union harmonisation legislation in Annex I apply from 2 August 2027. Do not state a single blanket application date for the entire AI Act. EU GDPR: \"Regulation (EU) 2016/679\". EU Adequacy decisions: always add the note \"[Verify current status — adequacy decisions are subject to periodic Commission review]\" when citing any adequacy decision (including the EU-UK adequacy decision) as a transfer mechanism. MONETARY PENALTY RULE: Never state a specific fine amount from training knowledge. If referencing an enforcement case, use the format: \"the [regulator] imposed a significant penalty — see [regulator enforcement register URL] for current figures.\" Numbered lists MUST use incrementing integers: the first item in any numbered list is 1, the second is 2, the third is 3. Never repeat a number within the same list. If you find yourself writing \"1.\" for the third or fourth item in a sequence, stop and correct the numbering. No preamble, no chat, no translated text.";

const DOCUMENT_TYPES = [
  { type: "dpo_appointment", title: "Data Protection Officer Appointment Letter", when: (r: any) => r.dpo_required },
  { type: "ropa", title: "Record of Processing Activities (RoPA) Template", when: () => true },
  { type: "ai_registration", title: "AI System Registration Draft", when: (r: any) => r.ai_registration_required },
  { type: "representative_letter", title: "Article 27 Representative Designation", when: (r: any) => r.representative_required },
  { type: "filing_instructions", title: "Filing Instructions & Checklist", when: () => true },
];

async function callClaude(
  model: string,
  systemPrompt: string,
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
      system: systemPrompt,
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
- Languages: ${(r.language_requirements || []).join(", ") || "English"}
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
    archetype: "sync",
    trustClass: "user",
    invokedBy: "user",
  });

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await supabase
      .from("registration_orders")
      .select("*")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) throw orderErr || new Error("Order not found");

    const codes: string[] = order.jurisdictions || [];
    const { data: reqs, error: reqsErr } = await supabase
      .from("jurisdiction_requirements")
      .select("*")
      .in("jurisdiction_code", codes.length ? codes : ["__none__"]);
    if (reqsErr) throw reqsErr;

    // For "wrong authority referenced" check: load all other authority names
    const { data: allReqs } = await supabase
      .from("jurisdiction_requirements")
      .select("authority_name");
    const allAuthorityNames: string[] = ((allReqs as any[]) || [])
      .map((x) => x?.authority_name)
      .filter((n): n is string => typeof n === "string" && n.length > 0);

    const orgSnapshot = order.organization_snapshot || {};
    const generated: Array<{ jurisdiction_code: string; document_type: string }> = [];

    for (const r of reqs || []) {
      const applicableDocs = DOCUMENT_TYPES.filter((docDef) => docDef.when(r));
      const applicableTypes = applicableDocs.map((d) => d.type);
      const otherAuthorityNames = allAuthorityNames.filter((n) => n !== r.authority_name);

      const results = await Promise.all(
        applicableDocs.map(async (docDef) => {
          if (docDef.type === "filing_instructions") {
            return {
              docDef,
              cleaned: buildFilingInstructions(r, applicableTypes),
              model: "deterministic-template",
              status: "ready" as const,
              validation_notes: null as string | null,
            };
          }

          // First attempt
          const notesEarly: string[] = [];
          let initial = await callClaude(SONNET_MODEL, SYSTEM_PROMPT, buildUserPrompt(docDef, r, orgSnapshot));
          if (initial.stopReason === "max_tokens") {
            console.warn(`[reg-docs] ${r.jurisdiction_code}/${docDef.type} truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} — single retry`);
            initial = await callClaude(SONNET_MODEL, SYSTEM_PROMPT, buildUserPrompt(docDef, r, orgSnapshot), PRODUCT_MAX_OUTPUT_TOKENS);
            if (initial.stopReason === "max_tokens") {
              notesEarly.push("truncated_output: document hit token ceiling twice");
            }
          }
          let raw = initial.text;
          let cleaned = stripMarkdown(raw);
          let failures = validateDocument(cleaned, r, otherAuthorityNames);

          // Regenerate once on failure
          if (failures.length > 0) {
            try {
              const r2 = await callClaude(SONNET_MODEL, SYSTEM_PROMPT, buildUserPrompt(docDef, r, orgSnapshot, failures));
              raw = r2.text;
              cleaned = stripMarkdown(raw);
              failures = validateDocument(cleaned, r, otherAuthorityNames);
            } catch (e) {
              failures.push(`regeneration failed: ${(e as Error).message}`);
            }
          }

          let status: "ready" | "needs_review" = "ready";
          const notes: string[] = [];
          for (const ne of notesEarly) notes.push(ne);
          if (notesEarly.some((n) => n.startsWith("truncated_output"))) {
            status = "needs_review";
          }
          if (failures.length > 0) {
            status = "needs_review";
            notes.push(`Validation: ${failures.join("; ")}`);
          } else {
            // Haiku citation check on passing docs
            const { replacements, flaggedForReview, updatedText } = await haikuCitationCheck(cleaned, r);
            cleaned = updatedText;
            if (replacements.length) notes.push(`Citation check: ${replacements.join("; ")}`);
            if (flaggedForReview.length) {
              notes.push(`Citations flagged for human review (not rewritten): ${flaggedForReview.join("; ")}`);
              status = "needs_review";
            }
          }

          // ── R0 PART 3: Output lint on final narrative.
          const referenceDate = new Date().toISOString();
          let lint = lintReportText(cleaned, {
            checkDates: true, checkUnresolvedTokens: true, referenceDate,
          });
          if (lint.clean !== cleaned) cleaned = lint.clean;
          if (hasHardViolations(lint)) {
            try {
              const details = lint.violations.filter((v) => v.severity === "hard")
                .map((v) => `${v.code}: ${v.detail}`).join("; ");
              const retryRaw = await callClaude(
                SONNET_MODEL,
                SYSTEM_PROMPT,
                buildUserPrompt(docDef, r, orgSnapshot, [`lint: ${details}`]) +
                `\n\nPREVIOUS DRAFT REJECTED by automated lint for: ${details}. Reproduce the document correcting these defects silently. Do not mention this instruction.`,
              );
              const retryCleaned = stripMarkdown(retryRaw.text);
              const retryLint = lintReportText(retryCleaned, {
                checkDates: true, checkUnresolvedTokens: true, referenceDate,
              });
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
          if (lint.violations.length) {
            notes.push(`Lint: ${lint.violations.map((v) => v.code).join(", ")}`);
          }

          return {
            docDef,
            cleaned,
            model: SONNET_MODEL,
            status,
            validation_notes: notes.length ? notes.join(" | ") : null,
          };

        })
      );

      for (const { docDef, cleaned, model, status, validation_notes } of results) {
        await supabase.from("registration_documents").insert({
          order_id,
          jurisdiction_code: r.jurisdiction_code,
          document_type: docDef.type,
          language: "en",
          content_text: cleaned,
          generation_model: model,
          status,
          validation_notes,
        });
        generated.push({ jurisdiction_code: r.jurisdiction_code, document_type: docDef.type });
      }
    }

    await supabase
      .from("registration_orders")
      .update({
        documents_generated_at: new Date().toISOString(),
        fulfillment_status: order.tier === "diy" ? "documents_ready" : "ready_to_file",
      })
      .eq("id", order_id);

    try {
      await supabase.functions.invoke("schedule-registration-renewals", { body: { order_id } });
    } catch (e) {
      console.warn("schedule-registration-renewals failed:", (e as Error).message);
    }

    try {
      await supabase.functions.invoke("send-registration-delivery-email", { body: { order_id } });
    } catch (e) {
      console.warn("send-registration-delivery-email failed:", (e as Error).message);
    }

    await finishFunctionRun(supabase, fnRun, {
      status: "success",
      sourceTable: "registration_orders",
      sourceRowId: order_id,
      metadata: { generated_count: generated.length },
    });
    return new Response(JSON.stringify({ generated_count: generated.length, generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-registration-docs error", e);
    await failFunctionRun(supabase, fnRun, e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
