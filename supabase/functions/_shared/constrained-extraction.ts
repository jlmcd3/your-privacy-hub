// Constrained extraction via Claude Haiku 4.5. One API call per row.
// Validates that every non-null field has a verbatim evidence_quote from the source.

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const DISPOSITION_VOCAB = new Set([
  "settlement","consent_order","administrative_fine",
  "final_decision","civil_penalty","injunctive_relief",
  // Existing corpus vocabulary values (present on already-classified rows).
  "court_decision","proposed_fine_reported_to_police",
]);
// Instrument class: distinguishes a FINAL enforcement instrument from an open
// investigation, guidance, or a press summary. Orthogonal to disposition_type
// (which names the instrument); this names its procedural standing.
const INSTRUMENT_VOCAB = new Set([
  "final_enforcement_decision",
  "open_investigation",
  "guidance",
  "press_summary",
  "other",
]);
const APPEAL_VOCAB = new Set(["final","appeal_pending","affirmed","vacated","remanded","unknown"]);

const SECTOR_VOCAB = new Set([
  "financial_services","healthcare","technology","retail","telecommunications",
  "automotive","insurance","education","government","energy","hospitality",
  "media","manufacturing","transportation","other",
]);

const SYSTEM_PROMPT = `You are extracting structured data from a regulator enforcement document.

Strict rules:
1. Every value you return must be either (a) a verbatim substring of the input document, or (b) a controlled-vocabulary value from the list below, chosen only when the document text supports that choice.
2. You may NOT infer, paraphrase, or generate any value not present in the document. If a field is not stated in the document, return null (or an empty array for statutory_provisions).
3. For every non-null field, return a verbatim evidence_quote (max 200 characters) from the document supporting the value. The evidence_quote MUST be a substring of the input. If you cannot quote evidence, return null for the field.

Output JSON schema:
{
  "statutory_provisions": [
    {"provision": "string (canonical form)", "evidence_quote": "string"}
  ],
  "disposition_type": "settlement|consent_order|administrative_fine|final_decision|civil_penalty|injunctive_relief|court_decision|proposed_fine_reported_to_police|null",
  "disposition_evidence_quote": "string or null",
  "instrument_class": "final_enforcement_decision|open_investigation|guidance|press_summary|other|null",
  "instrument_class_evidence_quote": "string or null",
  "appeal_status": "final|appeal_pending|affirmed|vacated|remanded|unknown",
  "appeal_status_evidence_quote": "string or null",
  "case_reference": "string or null",
  "case_reference_evidence_quote": "string or null",
  "sector": "string from controlled list or null",
  "sector_evidence_quote": "string or null",
  "original_currency": "ISO 4217 code (USD, EUR, GBP, PLN, etc.) or null",
  "original_amount": "number or null",
  "amount_evidence_quote": "string or null"
}

Controlled vocabularies:
- disposition_type: settlement, consent_order, administrative_fine, final_decision, civil_penalty, injunctive_relief, court_decision, proposed_fine_reported_to_police
- instrument_class: final_enforcement_decision, open_investigation, guidance, press_summary, other
- appeal_status: final, appeal_pending, affirmed, vacated, remanded, unknown
- sector: financial_services, healthcare, technology, retail, telecommunications, automotive, insurance, education, government, energy, hospitality, media, manufacturing, transportation, other

instrument_class definitions (choose the one the document itself evidences; the
evidence_quote must be a verbatim substring showing that standing):
- final_enforcement_decision: the document IS the operative decision, order,
  sanction, settlement or judgment concluding the matter.
- open_investigation: the document announces or reports an inquiry, probe, or
  proceeding that has been opened and not concluded.
- guidance: advisory, opinion, guidelines, FAQ, or other non-adjudicative
  regulator publication.
- press_summary: a press release or news summary ABOUT a decision rather than
  the decision text itself.
- other: none of the above is evidenced.
If the document does not evidence any of these, return null.


For statutory_provisions, use canonical form when possible:
- GDPR articles: "GDPR Article 6(1)(f)" not "Art. 6(1)(f)"
- CCPA sections: "CCPA §1798.100(b)" not "Section 1798.100(b)"
- BIPA: "BIPA Section 15(b)" not "740 ILCS 14/15(b)"
- TDPSA: "TDPSA §541.052"

Spanish-language documents (AEPD, etc.) cite provisions in Spanish format. Translate the form to canonical English while keeping the original Spanish text verbatim in evidence_quote. Worked examples:
- Source text: "artículo 6.1.f) del RGPD"
  → {"provision": "GDPR Article 6(1)(f)", "evidence_quote": "artículo 6.1.f) del RGPD"}
- Source text: "Artículo 83.5 del RGPD"
  → {"provision": "GDPR Article 83(5)", "evidence_quote": "Artículo 83.5 del RGPD"}
- Source text: "artículo 13 del RGPD"
  → {"provision": "GDPR Article 13", "evidence_quote": "artículo 13 del RGPD"}
- Source text: "artículo 65 de la LOPDGDD"
  → {"provision": "LOPDGDD Article 65", "evidence_quote": "artículo 65 de la LOPDGDD"}
- Source text: "art. 5.1 c) RGPD"
  → {"provision": "GDPR Article 5(1)(c)", "evidence_quote": "art. 5.1 c) RGPD"}
Translating Spanish citation format to canonical English form is REQUIRED and does NOT violate rule 2 — it is a controlled format normalization, not inference.

Italian-language documents (Garante, etc.) cite provisions in Italian format using "art." / "artt." / "par." / "lett." with sources "del Regolamento" (GDPR), "del RGPD", or "del Codice" (Codice in materia di protezione dei dati personali, D.Lgs. 196/2003). Translate the form to canonical English while keeping the original Italian text verbatim in evidence_quote. Worked examples:
- Source text: "art. 5, par. 1, lett. a) del Regolamento"
  → {"provision": "GDPR Article 5(1)(a)", "evidence_quote": "art. 5, par. 1, lett. a) del Regolamento"}
- Source text: "artt. 5, 6 e 9 del Regolamento"
  → {"provision": "GDPR Articles 5, 6 and 9", "evidence_quote": "artt. 5, 6 e 9 del Regolamento"}
- Source text: "ai sensi dell'art. 83, par. 5, del RGPD"
  → {"provision": "GDPR Article 83(5)", "evidence_quote": "ai sensi dell'art. 83, par. 5, del RGPD"}
- Source text: "art. 166 del Codice"
  → {"provision": "Codice Privacy Article 166", "evidence_quote": "art. 166 del Codice"}
Translating Italian citation format to canonical English form is REQUIRED and does NOT violate rule 2 — it is a controlled format normalization, not inference.

The canonical form is the value; the evidence_quote is the verbatim text from the document showing the citation in its original form.

Scope of statutory_provisions: extract every statutory provision cited in the document in the context of (a) the violation finding, (b) the legal basis the regulator relies on, or (c) the sanction disposition. This includes provisions discussed in the legal-framework recital when they support the violation finding. Do NOT include procedural articles cited only as administrative boilerplate (rules of procedure, notification deadlines, agency competence) unless those procedural provisions themselves are part of the charged violation.

Minimum-extract rule: if the document contains ANY statutory citation patterns — Spanish ("artículo N del RGPD", "Art. N LOPDGDD", "artículo N de la LOPDGDD", "artículo N del Reglamento", "art. N RGPD"), Italian ("art. N del Regolamento", "artt. N del Regolamento", "art. N, par. N del Regolamento", "art. N, par. N, lett. X del Regolamento", "art. N del RGPD", "art. N del Codice"), or English/other-language equivalents for documents in other languages — you MUST extract at least one provision tied to the violation finding or sanction. Returning an empty array [] is acceptable ONLY when the document genuinely contains no statutory citation patterns at all (e.g. pure procedural orders, press notices, or unrelated content). If you see citations but are unsure which one is "the" charged provision, include the citation(s) most adjacent to disposition language or violation findings — do not return [].


If the document is empty, truncated, or unrelated to the action you were asked to verify, return all fields as null and statutory_provisions as an empty array.

Respond with the JSON object only. No prose before or after.`;

export type ExtractionResult = {
  statutory_provisions: string[];
  disposition_type: string | null;
  instrument_class: string | null;
  appeal_status: string;
  case_reference: string | null;
  sector: string | null;
  original_currency: string | null;
  original_amount: number | null;
  evidence_quotes: Record<string, string>; // field name -> quote
  parse_error?: string;
  usage: { input_tokens: number; output_tokens: number };
};

function substringMatch(doc: string, quote: string): boolean {
  if (!quote || typeof quote !== "string") return false;
  return doc.toLowerCase().includes(quote.toLowerCase().trim());
}

// Salvage path for AEPD-class JSON failures: scan the raw model output
// (embedded in the parse_error string) for "provision"/"evidence_quote"
// pairs via tolerant regex and keep only those whose evidence_quote
// substring-matches the source document.
function salvageStatutoryProvisions(
  raw: string,
  doc: string,
): { provisions: string[]; evidence_quotes: Record<string, string> } {
  const provisions: string[] = [];
  const evidence_quotes: Record<string, string> = {};
  if (!raw) return { provisions, evidence_quotes };

  // Tolerant pair extractor — assumes the model emits provision before
  // evidence_quote within each object (matches our schema example).
  const re = /"provision"\s*:\s*"([^"]{1,200})"[^}]*?"evidence_quote"\s*:\s*"((?:[^"\\]|\\.){1,400}?)"/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(raw)) !== null) {
    const prov = m[1].trim();
    const quote = m[2].replace(/\\"/g, '"').trim();
    if (!prov || seen.has(prov)) continue;
    if (substringMatch(doc, quote)) {
      provisions.push(prov);
      evidence_quotes[`statutory_provision:${prov}`] = quote;
      seen.add(prov);
    }
  }
  return { provisions, evidence_quotes };
}

async function callAnthropic(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ res: Response; text: string }> {
  let attempt = 0;
  const backoffs = [5_000, 20_000, 60_000];
  while (true) {
    attempt++;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60_000);
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const text = await res.text();
      if (res.status === 429 && attempt <= 3) {
        await new Promise((r) => setTimeout(r, backoffs[attempt - 1] ?? 60_000));
        continue;
      }
      if (res.status >= 500 && attempt <= 2) {
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }
      return { res, text };
    } catch (e) {
      clearTimeout(t);
      if (attempt <= 2) {
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }
      throw e;
    }
  }
}

export async function constrainedExtract(args: {
  apiKey: string;
  doc: string;
  regulator: string | null;
  subject: string | null;
  decisionDate: string | null;
  law: string | null;
}): Promise<ExtractionResult> {
  const { apiKey, doc, regulator, subject, decisionDate, law } = args;

  // Truncate doc to ~60k chars to stay within Haiku context comfortably.
  const truncated = doc.slice(0, 60_000);

  const userPrompt = `ENFORCEMENT ACTION CONTEXT (for matching only — do not extract from this):
- Regulator: ${regulator ?? "unknown"}
- Subject: ${subject ?? "unknown"}
- Decision date: ${decisionDate ?? "unknown"}
- Statute family: ${law ?? "unknown"}

SOURCE DOCUMENT:
${truncated}`;

  const STRICTER_SUFFIX = `

CRITICAL OUTPUT FORMAT (retry attempt):
Your previous response could not be parsed as JSON. Common causes:
- Including prose before or after the JSON object
- Using markdown code fences (\`\`\`json ... \`\`\`)
- Including a trailing comma after the last field
- Including unescaped quotes inside string values

Respond with ONLY the raw JSON object. No prose. No code fences. No comments.
The first character of your response must be { and the last must be }.`;

  let usage = { input_tokens: 0, output_tokens: 0 };
  let parsed: any = null;
  let lastParseError: string | null = null;
  let lastRawOutput: string = "";
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const sys = attempt === 1 ? SYSTEM_PROMPT : SYSTEM_PROMPT + STRICTER_SUFFIX;
    const { res, text } = await callAnthropic(apiKey, {
      model: HAIKU_MODEL,
      max_tokens: 4096,
      system: sys,
      messages: [{ role: "user", content: userPrompt }],
    });

    if (!res.ok) {
      return {
        statutory_provisions: [],
        disposition_type: null,
      instrument_class: null,
        appeal_status: "unknown",
        case_reference: null,
        sector: null,
        original_currency: null,
        original_amount: null,
        evidence_quotes: {},
        parse_error: `http_${res.status}: ${text.slice(0, 200)}`,
        usage,
      };
    }

    let envelope: any;
    try {
      envelope = JSON.parse(text);
    } catch (e) {
      lastParseError = `envelope_parse: ${(e as Error).message}`;
      continue;
    }
    // Accumulate token usage across attempts so the cost tracker reflects retries.
    usage = {
      input_tokens: usage.input_tokens + (envelope?.usage?.input_tokens ?? 0),
      output_tokens: usage.output_tokens + (envelope?.usage?.output_tokens ?? 0),
    };

    const raw = (envelope?.content?.[0]?.text ?? "").trim();
    lastRawOutput = raw;
    // Defensive cleanup: strip code fences and isolate the {...} body.
    let cleaned = raw;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    try {
      parsed = JSON.parse(cleaned);
      break; // success
    } catch (e) {
      lastParseError = `json_parse: ${(e as Error).message} (attempt ${attempt}); raw[0:500]=${raw.slice(0, 500)}`;
      // loop to retry with stricter system prompt
    }
  }

  // Salvage path: if both JSON parse attempts failed, try to extract
  // statutory_provisions via regex so a single malformed character in
  // Haiku's output doesn't blank the whole row. Other fields stay null
  // since we can't trust them without a structured parse.
  if (!parsed) {
    const salvaged = salvageStatutoryProvisions(lastRawOutput, truncated);
    if (salvaged.provisions.length > 0) {
      return {
        statutory_provisions: salvaged.provisions,
        disposition_type: null,
      instrument_class: null,
        appeal_status: "unknown",
        case_reference: null,
        sector: null,
        original_currency: null,
        original_amount: null,
        evidence_quotes: salvaged.evidence_quotes,
        parse_error: `salvaged_from_malformed_json: ${lastParseError?.slice(0, 200)}`,
        usage,
      };
    }
    return {
      statutory_provisions: [],
      disposition_type: null,
      instrument_class: null,
      appeal_status: "unknown",
      case_reference: null,
      sector: null,
      original_currency: null,
      original_amount: null,
      evidence_quotes: {},
      parse_error: lastParseError ?? "json_parse: unknown",
      usage,
    };
  }


  // Validate per field
  const evidence_quotes: Record<string, string> = {};

  // statutory_provisions
  const sp: string[] = [];
  if (Array.isArray(parsed.statutory_provisions)) {
    for (const entry of parsed.statutory_provisions) {
      // Accept both object form {provision, evidence_quote} and bare string
      // form (defensive — schema asks for objects).
      if (typeof entry === "string") {
        sp.push(entry.trim());
        continue;
      }
      if (!entry || typeof entry.provision !== "string") continue;
      if (typeof entry.evidence_quote !== "string") continue;
      if (substringMatch(truncated, entry.evidence_quote)) {
        sp.push(entry.provision.trim());
        evidence_quotes[`statutory_provision:${entry.provision.trim()}`] = entry.evidence_quote;
      }
    }
  }

  const validatedScalar = (
    val: any,
    quote: any,
    field: string,
    vocab?: Set<string>,
  ): string | null => {
    if (val == null || val === "null" || val === "") return null;
    if (typeof val !== "string") return null;
    if (vocab && !vocab.has(val)) return null;
    if (typeof quote !== "string" || !substringMatch(truncated, quote)) return null;
    evidence_quotes[field] = quote;
    return val;
  };

  const disposition_type = validatedScalar(
    parsed.disposition_type,
    parsed.disposition_evidence_quote,
    "disposition_type",
    DISPOSITION_VOCAB,
  );

  const instrument_class = validatedScalar(
    parsed.instrument_class,
    parsed.instrument_class_evidence_quote,
    "instrument_class",
    INSTRUMENT_VOCAB,
  );

  let appeal_status: string;
  if (typeof parsed.appeal_status === "string" && APPEAL_VOCAB.has(parsed.appeal_status)) {
    if (parsed.appeal_status === "unknown") {
      appeal_status = "unknown";
    } else if (
      typeof parsed.appeal_status_evidence_quote === "string" &&
      substringMatch(truncated, parsed.appeal_status_evidence_quote)
    ) {
      appeal_status = parsed.appeal_status;
      evidence_quotes["appeal_status"] = parsed.appeal_status_evidence_quote;
    } else {
      appeal_status = "unknown";
    }
  } else {
    appeal_status = "unknown";
  }

  const case_reference = validatedScalar(
    parsed.case_reference,
    parsed.case_reference_evidence_quote,
    "case_reference",
  );
  const sector = validatedScalar(
    parsed.sector,
    parsed.sector_evidence_quote,
    "sector",
    SECTOR_VOCAB,
  );

  // amount
  let original_amount: number | null = null;
  let original_currency: string | null = null;
  const amt = parsed.original_amount;
  const cur = parsed.original_currency;
  const amtQuote = parsed.amount_evidence_quote;
  if (
    typeof amt === "number" && Number.isFinite(amt) && amt > 0 &&
    typeof cur === "string" && /^[A-Z]{3}$/.test(cur) &&
    typeof amtQuote === "string" && substringMatch(truncated, amtQuote)
  ) {
    original_amount = amt;
    original_currency = cur;
    evidence_quotes["amount"] = amtQuote;
  }

  return {
    statutory_provisions: sp,
    disposition_type,
    instrument_class,
    appeal_status,
    case_reference,
    sector,
    original_currency,
    original_amount,
    evidence_quotes,
    usage,
  };
}

export const HAIKU_MODEL_ID = HAIKU_MODEL;
