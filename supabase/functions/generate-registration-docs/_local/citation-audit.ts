// Shared citation-audit helper (Part B of shared infrastructure).
//
// Audits a generated document for unsupported citations using a small auditor
// LLM. Real-but-unverified instruments are FLAGGED for human review and the
// document is left intact; only clear EU-number fabrications are silently
// replaced with a safe reference back to the supplied law / authority.
//
// The caller supplies an Anthropic-compatible function (`callLLM`) so we don't
// need to bind to any specific shared client.

// Always-recognised EU instruments — never flagged.
const RECOGNISED = [
  "Regulation (EU) 2016/679",
  "Regulation (EU) 2024/1689",
  "Regulation (EU) 2018/1725",
  "Directive (EU) 2016/680",
];

export interface CitationAuditInput {
  text: string;
  lawName?: string;
  authorityName?: string;
  /** National implementing statutes (e.g. ["Data Protection Act 2018"]). */
  jurisdictionStatutes?: string[];
}

export interface CitationAuditResult {
  /** Document text — only clear fabrications are replaced; real-but-unverified citations are not rewritten. */
  updatedText: string;
  replacements: string[];
  flaggedForReview: string[];
}

export type CitationAuditLLM = (
  model: string,
  systemPrompt: string,
  userContent: string,
  maxTokens?: number,
) => Promise<{ text: string }>;

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export async function auditCitations(
  input: CitationAuditInput,
  callLLM: CitationAuditLLM,
  model: string = DEFAULT_MODEL,
): Promise<CitationAuditResult> {
  const supported = [
    ...RECOGNISED,
    input.lawName,
    input.authorityName,
    ...(input.jurisdictionStatutes ?? []),
  ].filter(Boolean) as string[];

  const instruction =
    `List every statutory or regulatory citation in the document. For each, return {citation, verdict, looksFabricated}. ` +
    `verdict=SUPPORTED if it matches one of the SUPPORTED list (case-insensitive substring) OR is a well-established instrument; otherwise UNSUPPORTED. ` +
    `looksFabricated=true ONLY for an EU regulation/decision NUMBER not on the SUPPORTED list (e.g. an invented "Regulation (EU) 20xx/xxxx"). ` +
    `Return ONLY a JSON array.\n\nSUPPORTED:\n${supported.join("\n")}\n\nDocument:\n${input.text}`;

  let arr: any[] = [];
  try {
    const resp = await callLLM(
      model,
      "You are a precise legal citation auditor. Output ONLY a JSON array.",
      instruction,
      1500,
    );
    arr = JSON.parse((resp.text.match(/\[[\s\S]*\]/) || ["[]"])[0]);
  } catch {
    return { updatedText: input.text, replacements: [], flaggedForReview: [] };
  }

  let updated = input.text;
  const replacements: string[] = [];
  const flaggedForReview: string[] = [];

  for (const it of arr) {
    const cite = String(it?.citation || "").trim();
    if (!cite || String(it?.verdict).toUpperCase() !== "UNSUPPORTED") continue;

    if (it?.looksFabricated === true) {
      // ONLY clear fabrications are rewritten.
      const safe = cite.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const replacement = input.lawName && input.authorityName
        ? `see ${input.lawName}, administered by ${input.authorityName}`
        : "[citation removed — verify]";
      const before = updated;
      updated = updated.replace(new RegExp(safe, "g"), replacement);
      if (updated !== before) {
        replacements.push(`replaced "${cite}" with "${replacement}"`);
      }
    } else {
      // Real-but-unverified — surfaced, never deleted.
      flaggedForReview.push(cite);
    }
  }

  return { updatedText: updated, replacements, flaggedForReview };
}
