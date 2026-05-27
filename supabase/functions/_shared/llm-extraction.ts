// Shared extraction helpers for per-regulator-ingestion pipeline.
// Uses Anthropic Haiku for verbatim key_compliance_failure extraction.
// Deterministic keyword classifiers for compliance_failure and sector.
// Currency normalisation to EUR.
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

export interface KcfResult {
  text: string | null;
  confidence: "verbatim" | "near_verbatim" | "uncertain";
}

export async function extractKeyComplianceFailure(
  documentText: string,
  language: string,
  regulatorCanonical: string,
): Promise<KcfResult> {
  const truncated = (documentText || "").substring(0, 8000);
  if (truncated.length < 60) return { text: null, confidence: "uncertain" };

  const prompt = `You are extracting a specific fact from an official regulatory enforcement decision published by ${regulatorCanonical}. The document is in ${language}.

TASK: Find and extract the primary compliance failure — the specific conduct or practice that violated privacy law. Extract it in the ORIGINAL LANGUAGE of the document, as close to verbatim as possible. Do not translate. Do not paraphrase. Do not summarise.

Rules:
- Extract 1 to 3 sentences maximum
- The extracted text must appear word-for-word (or near word-for-word) in the source document
- Include the specific data category involved (e.g. employee data, health data, customer data) if mentioned
- Include the specific technical or organisational failure if mentioned (e.g. "failed to implement adequate encryption", "processed data without legal basis")
- If you cannot find a clear compliance failure description, return exactly: NULL

Respond with ONLY the extracted text, or the word NULL. No preamble, no explanation, no quotation marks.

Document text:
${truncated}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content[0];
    const result = block && block.type === "text" ? block.text.trim() : null;
    if (!result || result === "NULL" || result.length < 10) {
      return { text: null, confidence: "uncertain" };
    }
    const normalised = documentText.toLowerCase().replace(/\s+/g, " ");
    const extractedNorm = result.toLowerCase().replace(/\s+/g, " ");
    const checkFragment = extractedNorm.substring(0, 40);
    const confidence = normalised.includes(checkFragment) ? "verbatim" : "near_verbatim";
    return { text: result, confidence };
  } catch (err) {
    console.error("LLM extraction failed:", err);
    return { text: null, confidence: "uncertain" };
  }
}

export function classifyComplianceFailure(
  keyComplianceFailure: string | null,
  statutoryProvisions: string[],
): string {
  if (!keyComplianceFailure) return "other";
  const text = keyComplianceFailure.toLowerCase();
  const provisions = (statutoryProvisions || []).join(" ").toLowerCase();
  const combined = text + " " + provisions;
  if (/breach.notif|data.breach|security.incident|unauthorized.access|breach.report/i.test(combined)) return "data_breach";
  if (/consent|legitimate.basis|legal.basis|lawful.basis|without.consent|no.consent/i.test(combined)) return "consent";
  if (/transparen|privacy.notice|privacy.policy|inform|article.13|article.14|art\.?\s*13|art\.?\s*14/i.test(combined)) return "transparency";
  if (/security|encrypt|pseudonym|technical.measure|organisational.measure|art\.?\s*32/i.test(combined)) return "security";
  if (/minimis|excessive|unnecessary.data|more.than.necessary|art\.?\s*5.*[cd]/i.test(combined)) return "data_minimisation";
  if (/access.right|erasure|deletion|portability|object|restrict|art\.?\s*1[5-8]|art\.?\s*2[01]/i.test(combined)) return "access_rights";
  if (/transfer|third.countr|adequacy|standard.contract|binding.corporate|art\.?\s*4[4-9]/i.test(combined)) return "international_transfer";
  if (/processor|controller.processor|data.processing.agreement|art\.?\s*28/i.test(combined)) return "processor_obligations";
  if (/accountability|dpia|data.protection.impact|dpo|data.protection.officer|art\.?\s*3[5-9]/i.test(combined)) return "accountability";
  return "other";
}

export const VALID_SECTORS = new Set([
  "healthcare", "finance", "retail", "telecommunications", "education",
  "public_sector", "hospitality", "media", "technology", "employment",
  "energy_utilities", "transport",
]);

export function extractSector(subjectName: string, documentText: string): string | null {
  const combined = ((subjectName || "") + " " + (documentText || "")).substring(0, 2000).toLowerCase();
  if (/hospital|clinic|health|medical|pharma|nhs|patient|healthcare/i.test(combined)) return "healthcare";
  if (/bank|insurance|financial|fintech|credit|loan|payment|invest/i.test(combined)) return "finance";
  if (/retail|shop|store|supermarket|ecommerce|e-commerce|marketplace/i.test(combined)) return "retail";
  if (/telecoms?|mobile|internet.provider|isp|broadband|wireless/i.test(combined)) return "telecommunications";
  if (/school|university|education|student|college|academy/i.test(combined)) return "education";
  if (/government|ministry|public.sector|municipality|council|authority|agency/i.test(combined)) return "public_sector";
  if (/hotel|travel|airline|tourism|booking|hospitality/i.test(combined)) return "hospitality";
  if (/media|publisher|newspaper|broadcast|streaming|social.media/i.test(combined)) return "media";
  if (/software|technology|platform|app|saas|cloud|data.broker|tech/i.test(combined)) return "technology";
  if (/employ|recruitment|hr |human.resource|workforce|payroll/i.test(combined)) return "employment";
  if (/energy|utility|electric|gas.supply|water.utility/i.test(combined)) return "energy_utilities";
  if (/transport|logistics|delivery|shipping|freight/i.test(combined)) return "transport";
  return null;
}

const DEFAULT_RATES: Record<string, number> = {
  EUR: 1, GBP: 1.17, USD: 0.92, PLN: 0.23, RON: 0.20, HUF: 0.0026,
  CZK: 0.041, AUD: 0.60, CAD: 0.68, CHF: 1.04, SEK: 0.088, NOK: 0.086, DKK: 0.134,
};

export function normaliseFineToEur(
  fineAmount: string | null,
  currency: string,
  approximateRates: Record<string, number> = {},
): number | null {
  if (!fineAmount) return null;
  const numStr = fineAmount.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const amount = parseFloat(numStr);
  if (isNaN(amount)) return null;
  const multiplier = /billion/i.test(fineAmount) ? 1_000_000_000
    : /million|M€|millions?\s*d.?euros?/i.test(fineAmount) ? 1_000_000
    : /thousand/i.test(fineAmount) ? 1_000
    : 1;
  const base = amount * multiplier;
  const rates = { ...DEFAULT_RATES, ...approximateRates };
  const rate = rates[(currency || "EUR").toUpperCase()] ?? 1;
  return Math.round(base * rate * 100) / 100;
}

export const PLACEHOLDER_SUBJECTS = new Set([
  "company", "controller", "data controller", "respondent", "operator",
  "subject", "n/a", "unknown", "the company", "a company",
]);
