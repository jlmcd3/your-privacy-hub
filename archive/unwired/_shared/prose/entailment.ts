/**
 * ITEM 340 (PROSE PROGRAM 4 of 4) — ENTAILMENT VALIDATOR.
 *
 * The hard gate for the optional fluency polish pass. Deterministic, pure, no
 * I/O, never throws. It compares a POLISHED candidate against the
 * DETERMINISTIC input that the engine already produced and persisted, and
 * answers exactly one question: does the polished text say the same things,
 * with nothing added and nothing lost?
 *
 * FAIL-CLOSED LAW. Every rule below rejects on uncertainty. A rejection costs
 * a little fluency; an acceptance of unverified prose costs a false statement
 * in a legal document. The asymmetry is deliberate and is not tunable.
 *
 * THE FIVE RULES (dispatch VALIDATOR CONTRACT, Item 340):
 *   R1 NO NEW ANCHORS   — every number, date, money amount, citation,
 *                         statutory quote, proper noun and verbatim record
 *                         value in the OUTPUT must appear in the INPUT.
 *   R2 NO LOST ANCHORS  — every citation, quote, information-needed /
 *                         "not stated on the record" disclosure and
 *                         counsel-voice close in the INPUT must survive.
 *   R3 NO PARAPHRASE    — protected spans (statutory quotes, customer record
 *                         values) must survive as EXACT substrings.
 *   R4 SENTENCE COVERAGE— every polished sentence must be traceable to input
 *                         content by conservative lexical overlap.
 *   R5 (runner) rejection ships the deterministic text; see polish.ts.
 *
 * Matching is byte-exact after TYPOGRAPHY normalisation only (curly quotes,
 * NBSP, dash forms, whitespace runs). Nothing is stemmed, lemmatised or
 * semantically compared: "similar meaning" is not a defence here.
 */

export const ENTAILMENT_VALIDATOR_VERSION =
  "prose-entailment-2026-08-01-item340";

export const ENTAILMENT_RULE_IDS = [
  "no_new_anchors",
  "no_lost_anchors",
  "no_paraphrase_of_protected_spans",
  "sentence_coverage",
] as const;
export type EntailmentRuleId = typeof ENTAILMENT_RULE_IDS[number];

export type EntailmentAnchorKind =
  | "number"
  | "date"
  | "money"
  | "citation"
  | "quote"
  | "entity"
  | "record_value"
  | "disclosure"
  | "counsel_close";

export interface EntailmentFinding {
  readonly rule: EntailmentRuleId;
  readonly code: string;
  readonly kind?: EntailmentAnchorKind;
  readonly detail: string;
  /** Offending spans, capped. Enough to act on, never the whole document. */
  readonly evidence: readonly string[];
}

export interface EntailmentInput {
  /** The deterministic text. The only source of truth for this comparison. */
  readonly deterministic: string;
  /** The candidate polish. */
  readonly polished: string;
  /**
   * Spans that may not be paraphrased under R3 — statutory quotes and
   * customer record values, supplied by the calling product because only the
   * product knows which of its values came verbatim from the customer.
   */
  readonly protected_spans?: readonly string[];
  /**
   * Additional entity names the product carries (company, vendors, products).
   * Proper nouns in the output are checked against the input first and this
   * list second.
   */
  readonly carried_entities?: readonly string[];
}

export interface EntailmentResult {
  readonly version: string;
  readonly ok: boolean;
  readonly findings: readonly EntailmentFinding[];
  /** Structured reason, fed back verbatim on retry (pass2r §2R.6 pattern). */
  readonly reject_reason: string;
  /** Per-rule pass/fail, for calibration reporting. */
  readonly rules: Readonly<Record<EntailmentRuleId, boolean>>;
}

// ---------------------------------------------------------------------
// Normalisation — typography only. Never semantic.
// ---------------------------------------------------------------------

export function normaliseTypography(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201f]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_EVIDENCE = 6;

function finding(
  rule: EntailmentRuleId,
  code: string,
  detail: string,
  evidence: readonly string[],
  kind?: EntailmentAnchorKind,
): EntailmentFinding {
  return { rule, code, kind, detail, evidence: evidence.slice(0, MAX_EVIDENCE) };
}

// ---------------------------------------------------------------------
// Anchor extraction
// ---------------------------------------------------------------------

/** "§ 7152(a)(5)", "§§ 7150-7157", "Art. 6(1)(f)", "Sec. 1798.100", "RCW 19.373.010". */
export const CITATION_RE =
  /(?:\bRCW\s+\d[\d.]*|\b\d{1,3}\s+(?:CCR|U\.S\.C\.|C\.F\.R\.)\s+[\d§.]+|§{1,2}\s*\d[\dA-Za-z.()\-]*|\bArt(?:icle|\.)\s*\d[\dA-Za-z.()\-]*|\bRecital\s+\d+|\bSec\.\s*\d[\dA-Za-z.()\-]*)/g;

/** "$1,200,000", "EUR 20 million", "€2.5m", "£17,500". */
export const MONEY_RE =
  /(?:[$€£]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|billion|m|bn))?|\b(?:EUR|USD|GBP|CHF)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|billion))?)/gi;

/** "1 January 2026", "January 1, 2026", "2026-01-01", "01/01/2026". */
export const DATE_RE = new RegExp(
  [
    "\\b\\d{4}-\\d{2}-\\d{2}\\b",
    "\\b\\d{1,2}/\\d{1,2}/\\d{2,4}\\b",
    "\\b\\d{1,2}\\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4}\\b",
    "\\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},?\\s+\\d{4}\\b",
  ].join("|"),
  "g",
);

/** Bare numbers, percentages included. Citation/money/date spans are masked first. */
export const NUMBER_RE = /\b\d[\d,]*(?:\.\d+)?\s?%?/g;

/** Double-quoted spans of 3+ words — the shape a statutory quote takes. */
export const QUOTED_RE = /"([^"\n]{12,400})"/g;

/**
 * Disclosure sentences the report owes the reader. These are the honesty
 * surfaces: if the deterministic text degrades, the polish may not smooth the
 * degradation away.
 */
export const DISCLOSURE_PATTERNS: readonly RegExp[] = [
  /\bnot stated on the record\b/i,
  /\bdoes not state\b/i,
  /\bthe record does not\b/i,
  /\bno(?:t)? (?:enough|sufficient) (?:information|detail)\b/i,
  /\binformation needed\b/i,
  /\brecord[_ ]insufficient\b/i,
  /\bhas not been (?:supplied|provided)\b/i,
  /\b\[TO BE COMPLETED\]/i,
  /\b\[TO COMPLETE[^\]]*\]/i,
  /\bsilent on\b/i,
];

/** Counsel-voice close — the reservation that must never be polished away. */
export const COUNSEL_CLOSE_PATTERNS: readonly RegExp[] = [
  /\bnot legal advice\b/i,
  /\bqualified legal counsel\b/i,
  /\breviewed by (?:counsel|qualified legal counsel)\b/i,
  /\bbefore any operational use\b/i,
];

function matchAll(text: string, re: RegExp): string[] {
  const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  return (text.match(rx) ?? [])
    // A pinpoint that ends a sentence swallows the full stop. The stop is
    // punctuation, not part of the citation, and must not make the citation
    // look "dropped" when the polish moves the clause elsewhere.
    .map((m) => m.trim().replace(/[.,;:]+$/, ""))
    .filter(Boolean);
}


function mask(text: string, re: RegExp): string {
  const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  return text.replace(rx, (m) => " ".repeat(m.length));
}

/** Comparison key for numbers: thousands separators and trailing zeros are typography. */
function numberKey(s: string): string {
  return s.replace(/[,\s]/g, "").replace(/%$/, "%");
}

const ENTITY_STOPWORDS = new Set(
  (
    "The A An And Or But If Then This That These Those There Here It Its We Our You Your They Their " +
    "Where When While Because However Nothing No Not Yes Under Per As At By For From In On Of To With " +
    "Without Whether Each Every Any All Both Neither Either Accordingly Further Separately Moreover " +
    "Overall Together Given Although Notwithstanding Nevertheless Consequently Therefore Thus Meanwhile " +
    "January February March April May June July August September October November December " +
    "Monday Tuesday Wednesday Thursday Friday Saturday Sunday " +
    "Part Section Sections Article Articles Chapter Title Appendix Exhibit Schedule Step Steps Table Figure " +
    "Company Business Consumer Consumers Organisation Organization Controller Processor Assessment Risk " +
    "Determination Conclusion Analysis Overview Record Records Data Processing Purpose Purposes Safeguard " +
    "Safeguards Benefit Benefits Impact Impacts Owner Role Roles Officer Report Reports Document Documents " +
    "Law Legal Counsel Advice Required Result Recommendation Recommendations Next Missing"
  ).split(/\s+/),
);

/**
 * Capitalized tokens that read as names rather than as structure.
 *
 * A sentence-initial capital is ambiguous — "Processing is described" opens
 * with an ordinary word wearing a capital. It is admitted as a name only when
 * the next token is itself a capitalized non-structural word, which is the
 * shape a name chain takes ("Northwind Data Ltd operates ..."). Elsewhere an
 * unrecognised capitalized word IS treated as a name, so an invented party
 * rejects rather than slipping through.
 */
export function properNouns(text: string): string[] {
  const out: string[] = [];
  const bareOf = (tok: string | undefined, last: boolean): string => {
    if (!tok) return "";
    let bare = tok.replace(/^[^\w§$€£]+|[^\w.]+$/g, "");
    if (/^[A-Z][A-Za-z0-9'&\-]*\.$/.test(bare) && last) bare = bare.slice(0, -1);
    return bare;
  };
  const nameLike = (bare: string): boolean =>
    Boolean(bare) && /^[A-Z][A-Za-z0-9'&.\-]*$/.test(bare) && !ENTITY_STOPWORDS.has(bare);

  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const tokens = sentence.trim().split(/\s+/);
    tokens.forEach((tok, i) => {
      const bare = bareOf(tok, i === tokens.length - 1);
      if (!nameLike(bare)) return;
      // The follower only has to LOOK like a name (capitalized word); it may
      // itself be a structural word inside a company name ("Northwind Data Ltd").
      if (i === 0 && !/^[A-Z][A-Za-z0-9'&.\-]*$/.test(bareOf(tokens[1], tokens.length === 2))) return;
      if (!out.includes(bare)) out.push(bare);
    });
  }
  return out;
}


export interface ExtractedAnchors {
  readonly citations: readonly string[];
  readonly money: readonly string[];
  readonly dates: readonly string[];
  readonly numbers: readonly string[];
  readonly quotes: readonly string[];
  readonly entities: readonly string[];
}

/** All anchor classes, extracted from already-normalised text. */
export function extractAnchors(normalised: string): ExtractedAnchors {
  const citations = matchAll(normalised, CITATION_RE);
  const money = matchAll(normalised, MONEY_RE);
  const dates = matchAll(normalised, DATE_RE);
  // Numbers are read only from what is left after the richer classes are masked,
  // so "7152" inside a citation is never treated as a free-standing number.
  const bare = mask(mask(mask(normalised, CITATION_RE), MONEY_RE), DATE_RE);
  const numbers = matchAll(bare, NUMBER_RE);
  const quotes: string[] = [];
  const rx = new RegExp(QUOTED_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = rx.exec(normalised)) !== null) quotes.push(m[1].trim());
  return {
    citations,
    money,
    dates,
    numbers,
    quotes,
    entities: properNouns(normalised),
  };
}

// ---------------------------------------------------------------------
// R1 — NO NEW ANCHORS
// ---------------------------------------------------------------------

function ruleNoNewAnchors(
  inputN: string,
  outputN: string,
  carriedEntities: readonly string[],
): EntailmentFinding[] {
  const src = extractAnchors(inputN);
  const out = extractAnchors(outputN);
  const findings: EntailmentFinding[] = [];

  const inputHay = inputN;
  const carriedHay = normaliseTypography(carriedEntities.join(" | "));

  const check = (
    values: readonly string[],
    kind: EntailmentAnchorKind,
    present: (v: string) => boolean,
  ) => {
    const bad: string[] = [];
    for (const v of values) if (!present(v) && !bad.includes(v)) bad.push(v);
    if (bad.length > 0) {
      findings.push(finding(
        "no_new_anchors",
        `new_${kind}`,
        `${bad.length} ${kind} value(s) appear in the polished text but not in the deterministic text. Polish may re-word connective tissue only; it may never introduce a value.`,
        bad,
        kind,
      ));
    }
  };

  const numberKeys = new Set(src.numbers.map(numberKey));
  // A number inside a source citation, money amount or date is still a value
  // the input carries; admit those keys too so re-phrasing does not reject.
  for (const s of [...src.citations, ...src.money, ...src.dates]) {
    for (const n of matchAll(s, NUMBER_RE)) numberKeys.add(numberKey(n));
  }

  check(out.citations, "citation", (v) => inputHay.includes(v));
  check(out.money, "money", (v) => inputHay.includes(v));
  check(out.dates, "date", (v) => inputHay.includes(v));
  check(out.numbers, "number", (v) => numberKeys.has(numberKey(v)));
  check(out.quotes, "quote", (v) => inputHay.includes(v));
  check(
    out.entities,
    "entity",
    (v) =>
      inputHay.includes(v) ||
      carriedHay.includes(v) ||
      // A possessive or hyphenated compound of a carried name is the same name.
      inputHay.includes(v.replace(/'s$/, "")) ||
      carriedHay.includes(v.replace(/'s$/, "")),
  );

  return findings;
}

// ---------------------------------------------------------------------
// R2 — NO LOST ANCHORS
// ---------------------------------------------------------------------

function patternsPresent(text: string, patterns: readonly RegExp[]): RegExp[] {
  return patterns.filter((p) => p.test(text));
}

function ruleNoLostAnchors(inputN: string, outputN: string): EntailmentFinding[] {
  const src = extractAnchors(inputN);
  const findings: EntailmentFinding[] = [];

  const lostCites = src.citations.filter((c) => !outputN.includes(c));
  if (lostCites.length > 0) {
    findings.push(finding(
      "no_lost_anchors",
      "citation_dropped",
      `${lostCites.length} citation(s) in the deterministic text are missing from the polished text. Every pinpoint must survive, written exactly as the deterministic text writes it.`,
      lostCites,
      "citation",
    ));
  }

  const lostQuotes = src.quotes.filter((q) => !outputN.includes(q));
  if (lostQuotes.length > 0) {
    findings.push(finding(
      "no_lost_anchors",
      "quote_dropped",
      `${lostQuotes.length} quoted passage(s) did not survive. Quotations are reproduced, never summarised.`,
      lostQuotes.map((q) => q.slice(0, 120)),
      "quote",
    ));
  }

  const lostDisclosures = patternsPresent(inputN, DISCLOSURE_PATTERNS)
    .filter((p) => !p.test(outputN));
  if (lostDisclosures.length > 0) {
    findings.push(finding(
      "no_lost_anchors",
      "disclosure_dropped",
      `${lostDisclosures.length} honesty disclosure(s) — what the record does not state, or what is still needed — were removed. A degradation may be re-worded but never smoothed away.`,
      lostDisclosures.map((p) => String(p)),
      "disclosure",
    ));
  }

  const lostClose = patternsPresent(inputN, COUNSEL_CLOSE_PATTERNS)
    .filter((p) => !p.test(outputN));
  if (lostClose.length > 0) {
    findings.push(finding(
      "no_lost_anchors",
      "counsel_close_dropped",
      "The counsel-voice reservation is missing from the polished text.",
      lostClose.map((p) => String(p)),
      "counsel_close",
    ));
  }

  return findings;
}

// ---------------------------------------------------------------------
// R3 — PROTECTED SPANS SURVIVE VERBATIM
// ---------------------------------------------------------------------

function ruleNoParaphrase(
  inputN: string,
  outputN: string,
  protectedSpans: readonly string[],
): EntailmentFinding[] {
  const missing: string[] = [];
  for (const raw of protectedSpans) {
    const span = normaliseTypography(raw);
    if (!span) continue;
    // A span the deterministic text itself does not carry is not this pass's
    // problem: the gate compares output to input, and only to input.
    if (!inputN.includes(span)) continue;
    if (!outputN.includes(span)) missing.push(span);
  }
  if (missing.length === 0) return [];
  return [finding(
    "no_paraphrase_of_protected_spans",
    "protected_span_altered",
    `${missing.length} protected span(s) — statutory quotations and customer record values — were altered. These survive as exact substrings; only the connective tissue around them may change.`,
    missing.map((s) => s.slice(0, 120)),
    "record_value",
  )];
}

// ---------------------------------------------------------------------
// R4 — SENTENCE COVERAGE
// ---------------------------------------------------------------------

const CONTENT_STOPWORDS = new Set(
  (
    "the a an and or but if then of to in on at by for from with without as is are was were be been being " +
    "it its this that these those which who whom whose there here we our you your they their he she his her " +
    "not no nor so than that's do does did done has have had having may might must shall should will would can " +
    "could however therefore accordingly further separately moreover overall because while whereas although"
  ).split(/\s+/),
);

export function contentTokens(sentence: string): string[] {
  return normaliseTypography(sentence)
    .toLowerCase()
    .split(/[^a-z0-9§$€£%.'\-]+/)
    // Possessives are inflection, not new content: "northwind's" -> "northwind".
    .map((t) => t.replace(/'s$/, "").replace(/^[.'-]+|[.'-]+$/g, ""))
    .filter((t) => t.length > 2 && !CONTENT_STOPWORDS.has(t));
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"§$€£(\[])|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** A polished sentence is traceable when most of its content words came from the input. */
export const COVERAGE_THRESHOLD = 0.8;
/** Very short sentences are all connective tissue; below this they are exempt. */
export const COVERAGE_MIN_TOKENS = 4;

function ruleSentenceCoverage(
  inputN: string,
  outputN: string,
  carriedEntities: readonly string[] = [],
): EntailmentFinding[] {
  // Entities the PRODUCT carries are legitimate input content even when the
  // deterministic sentence used a role noun ("the controller") instead.
  const inputVocab = new Set([
    ...contentTokens(inputN),
    ...carriedEntities.flatMap((e) => contentTokens(e)),
  ]);

  const untraceable: string[] = [];

  for (const sentence of splitSentences(outputN)) {
    const tokens = contentTokens(sentence);
    if (tokens.length < COVERAGE_MIN_TOKENS) continue;
    const hits = tokens.filter((t) => inputVocab.has(t)).length;
    if (hits / tokens.length < COVERAGE_THRESHOLD) {
      untraceable.push(sentence.slice(0, 160));
    }
  }

  if (untraceable.length === 0) return [];
  return [finding(
    "sentence_coverage",
    "sentence_not_traceable",
    `${untraceable.length} polished sentence(s) contain material that is not traceable to the deterministic text. Every sentence must restate input content; none may add commentary, framing or conclusions.`,
    untraceable,
  )];
}

// ---------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------

export function validateEntailment(input: EntailmentInput): EntailmentResult {
  const inputN = normaliseTypography(input.deterministic ?? "");
  const outputN = normaliseTypography(input.polished ?? "");

  // FAIL-CLOSED: an empty or absent candidate is a rejection, never a pass.
  if (!outputN) {
    const f = finding(
      "sentence_coverage",
      "empty_polish",
      "The polish produced no text. The deterministic text ships.",
      [],
    );
    return {
      version: ENTAILMENT_VALIDATOR_VERSION,
      ok: false,
      findings: [f],
      reject_reason: reasonOf([f]),
      rules: {
        no_new_anchors: true,
        no_lost_anchors: true,
        no_paraphrase_of_protected_spans: true,
        sentence_coverage: false,
      },
    };
  }

  const findings: EntailmentFinding[] = [
    ...ruleNoNewAnchors(inputN, outputN, input.carried_entities ?? []),
    ...ruleNoLostAnchors(inputN, outputN),
    ...ruleNoParaphrase(inputN, outputN, input.protected_spans ?? []),
    ...ruleSentenceCoverage(inputN, outputN, input.carried_entities ?? []),
  ];

  const rules = Object.fromEntries(
    ENTAILMENT_RULE_IDS.map((id) => [id, !findings.some((f) => f.rule === id)]),
  ) as Record<EntailmentRuleId, boolean>;

  return {
    version: ENTAILMENT_VALIDATOR_VERSION,
    ok: findings.length === 0,
    findings,
    reject_reason: reasonOf(findings),
    rules,
  };
}

/** Structured, model-readable reason — fed back verbatim on the retry attempt. */
export function reasonOf(findings: readonly EntailmentFinding[]): string {
  if (findings.length === 0) return "";
  return findings
    .map((f) =>
      `[${f.rule}/${f.code}] ${f.detail}${
        f.evidence.length > 0 ? ` Offending: ${f.evidence.map((e) => `"${e}"`).join(", ")}.` : ""
      }`
    )
    .join("\n");
}
