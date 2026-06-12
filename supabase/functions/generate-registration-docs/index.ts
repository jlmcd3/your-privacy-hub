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
  "You are a privacy compliance expert drafting jurisdiction-specific filings. Always write in English regardless of the jurisdiction. Output clean plain text only — NO markdown symbols of any kind. Do not use #, ##, ###, **, *, _, backticks, or > for formatting. Structure documents with section headings on their own line in Title Case followed by a blank line, then prose or bullet items. For bullets, use the bullet character • followed by a space at the start of the line (not * or -). Use real authority names, real laws, and realistic but generic placeholder values like [Organization Name]. Do not invent statute numbers you are not sure of. MANDATORY CITATIONS — these must be used exactly as shown: EU Artificial Intelligence Act: \"Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024\" — this regulation entered into force on 1 August 2024. NEVER call it a \"proposal\", \"proposed regulation\", or \"draft\". It is enacted law. Never use 2024/900 or any other regulation number for the AI Act. EU GDPR: \"Regulation (EU) 2016/679\". EU Adequacy decisions: always add the note \"[Verify current status — adequacy decisions are subject to periodic Commission review]\" when citing any adequacy decision (including the EU-UK adequacy decision) as a transfer mechanism. MONETARY PENALTY RULE: Never state a specific fine amount from training knowledge. If referencing an enforcement case, use the format: \"the [regulator] imposed a significant penalty — see [regulator enforcement register URL] for current figures.\" Numbered lists MUST use incrementing integers: the first item in any numbered list is 1, the second is 2, the third is 3. Never repeat a number within the same list. If you find yourself writing \"1.\" for the third or fourth item in a sequence, stop and correct the numbering. No preamble, no chat, no translated text.";

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
  maxTokens: number = 4000
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
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
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
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

async function haikuCitationCheck(
  text: string,
  r: any
): Promise<{ replacements: string[]; updatedText: string }> {
  const facts = `Authority: ${r.authority_name}\nLaw: ${r.law_name}\nJurisdiction: ${r.jurisdiction_name}\nNotes: ${r.notes || ""}`;
  const instruction = `List every statutory or regulatory citation in this document. For each, answer SUPPORTED if it appears in the provided facts or is one of: Regulation (EU) 2016/679, Regulation (EU) 2024/1689, ${r.law_name}. Otherwise UNSUPPORTED. Return JSON array of {citation, verdict}.

Document:
${text}

Facts:
${facts}`;
  let resp: string;
  try {
    resp = await callClaude(HAIKU_MODEL, "You are a precise legal citation auditor. Output ONLY a JSON array.", instruction, 1500);
  } catch (e) {
    console.warn("[reg-docs] Haiku citation check failed (non-fatal):", (e as Error).message);
    return { replacements: [], updatedText: text };
  }
  const replacements: string[] = [];
  let updated = text;
  try {
    const m = resp.match(/\[[\s\S]*\]/);
    if (!m) return { replacements, updatedText: text };
    const arr: any[] = JSON.parse(m[0]);
    for (const item of arr) {
      const cite = String(item?.citation || "").trim();
      const verdict = String(item?.verdict || "").toUpperCase();
      if (!cite || verdict !== "UNSUPPORTED") continue;
      const replacement = `see ${r.law_name}, administered by ${r.authority_name}`;
      // Escape regex special chars in the literal citation
      const safe = cite.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const before = updated;
      updated = updated.replace(new RegExp(safe, "g"), replacement);
      if (updated !== before) {
        replacements.push(`replaced "${cite}" with "${replacement}"`);
      }
    }
  } catch (e) {
    console.warn("[reg-docs] Haiku JSON parse failed:", (e as Error).message);
  }
  return { replacements, updatedText: updated };
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
          let raw = await callClaude(SONNET_MODEL, SYSTEM_PROMPT, buildUserPrompt(docDef, r, orgSnapshot));
          let cleaned = stripMarkdown(raw);
          let failures = validateDocument(cleaned, r, otherAuthorityNames);

          // Regenerate once on failure
          if (failures.length > 0) {
            try {
              raw = await callClaude(SONNET_MODEL, SYSTEM_PROMPT, buildUserPrompt(docDef, r, orgSnapshot, failures));
              cleaned = stripMarkdown(raw);
              failures = validateDocument(cleaned, r, otherAuthorityNames);
            } catch (e) {
              failures.push(`regeneration failed: ${(e as Error).message}`);
            }
          }

          let status: "ready" | "needs_review" = "ready";
          const notes: string[] = [];
          if (failures.length > 0) {
            status = "needs_review";
            notes.push(`Validation: ${failures.join("; ")}`);
          } else {
            // Haiku citation check on passing docs
            const { replacements, updatedText } = await haikuCitationCheck(cleaned, r);
            cleaned = updatedText;
            if (replacements.length) notes.push(`Citation check: ${replacements.join("; ")}`);
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

    return new Response(JSON.stringify({ generated_count: generated.length, generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-registration-docs error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
