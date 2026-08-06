/**
 * ITEM 337 (PROSE PROGRAM 1 of 4) — TYPED SLOT RENDERING.
 *
 * ONE shared module every composer slots values through. Fixes the recorded
 * cppa-risk processing_narrative defects:
 *
 *   • raw JSON array   → ["Email","Telemetry"]  ⇒ "Email, and Telemetry"
 *   • "from Directly from account signup"       ⇒ "from account signup"
 *   • "is used Deliver the service"             ⇒ "is used to deliver…"(fold)
 *   • "criterion that Fixed period"             ⇒ "criterion that a fixed period"
 *   • "telemetry.."                             ⇒ "telemetry."
 *
 * Pure. Never throws. No I/O.
 */

export const PROSE_SLOTS_VERSION = "prose-slots-2026-08-01-item337";

/** Prepositions/conjunctions we de-duplicate across the stem/value seam. */
const SEAM_WORDS: readonly string[] = [
  "from", "to", "for", "of", "in", "on", "with", "by", "at", "about",
  "into", "under", "through", "across", "between", "that", "than", "as",
];

/** Acronyms and proper tokens that must never be case-folded. */
const KEEP_CAPS = new Set([
  "CPPA", "CCPA", "CPRA", "GDPR", "UK", "EU", "EEA", "US", "U.S.", "ADMT",
  "DPIA", "LIA", "DPA", "DPO", "PI", "SPI", "AI", "ML", "API", "SaaS",
  "HIPAA", "GLBA", "FCRA", "COPPA", "NIST", "ISO", "SOC", "MFA", "SSO",
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December",
]);

export interface SlotRenderOptions {
  /** Template text immediately preceding the slot token (tail is enough). */
  stem?: string;
  /** Template text immediately following the slot token. */
  next?: string;
  /** Per-contract enum → prose map. */
  adapter?: Record<string, string>;
  /** Force/forbid mid-sentence treatment; inferred from `stem` when absent. */
  midSentence?: boolean;
  /** Slot values that are whole sentences keep their terminal punctuation. */
  isSentence?: boolean;
}

/** "X", "X and Y", "X, Y, and Z" (Oxford comma — fleet house style). */
export function joinNaturalList(items: readonly unknown[]): string {
  const parts = items
    .map((v) => (v === null || v === undefined ? "" : typeof v === "string" ? v.trim() : stringifyScalar(v)))
    .filter((s) => s.length > 0);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function stringifyScalar(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["label", "name", "text", "value", "title"]) {
      if (typeof o[k] === "string" && (o[k] as string).trim()) return (o[k] as string).trim();
    }
    return "";
  }
  return String(v);
}

/** Parse values that arrive as a JSON-encoded array/string. */
function coerceValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const t = value.trim();
  if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
    try {
      return JSON.parse(t);
    } catch {
      return value;
    }
  }
  return value;
}

/** Enum-ish tokens: snake_case / SCREAMING_CASE → spaced words. */
function humaniseEnum(s: string): string {
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(s)) return s;
  return s.replace(/_/g, " ").trim();
}

function foldInitialCap(s: string): string {
  const m = /^(\S+)(\s|$)/.exec(s);
  if (!m) return s;
  const first = m[1];
  const bare = first.replace(/[^A-Za-z0-9.'&-]/g, "");
  if (!bare) return s;
  if (KEEP_CAPS.has(bare) || KEEP_CAPS.has(bare.toUpperCase())) return s;
  // All-caps or mixed-caps acronym → leave alone.
  if (bare.length > 1 && bare === bare.toUpperCase()) return s;
  // Proper-noun run: "Meridian Health Systems" (2+ capitalised words) → leave.
  const words = s.split(/\s+/);
  if (words.length > 1 && /^[A-Z][a-z]/.test(words[0]) && /^[A-Z][a-z]/.test(words[1])) return s;
  if (!/^[A-Z][a-z']*$/.test(bare)) return s;
  return s[0].toLowerCase() + s.slice(1);
}

/**
 * ITEM 390 (FIX 1) — SENTENCE-VALUED SLOT EXEMPTION.
 *
 * ITEM 337's authorized purpose (see this module's docstring) is enum and
 * FRAGMENT repair: "Directly from account signup" ⇒ "from account signup",
 * "Fixed period" ⇒ "a fixed period", "telemetry.." ⇒ "telemetry.". It was
 * never authorized for slot values that are already COMPLETE, byte-pinned
 * SENTENCES. Applied to those, step-4 stripped the locked terminal period and
 * step-6 lowercased the locked initial capital — and because the strip removed
 * the sentence boundary, `stemTail` then reported `endsSentence: false` for the
 * NEXT slot, cascading the fold down the template. Shipped result on the
 * ITEM 319 locked pair: "…assessed activity recommended: marketing…".
 *
 * A value is a complete sentence when it opens with a capital, carries more
 * than one word, and closes with a single terminal mark. Such a value is
 * neither stripped nor folded: it renders verbatim, and the boundary it keeps
 * lets the FOLLOWING slot retain its own initial capital.
 *
 * Deliberately strict so ITEM 337's fragment behaviour stays byte-identical:
 *   • "telemetry.."          → doubled mark, lowercase opener  → NOT a sentence
 *   • "Fixed period"         → no terminal mark                → NOT a sentence
 *   • "Deliver the service"  → no terminal mark                → NOT a sentence
 */
function isSentenceValue(s: string): boolean {
  const t = s.trim();
  if (t.length < 12) return false;
  if (!/\s/.test(t)) return false;                 // a lone token is never a sentence
  if (!/^["'(\[]?[A-Z]/.test(t)) return false;     // must open with a capital
  if (/[.!?]{2,}["')\]]?$/.test(t)) return false;  // doubled mark = ITEM 337 artifact
  return /[.!?]["')\]]?$/.test(t);
}

function stemTail(stem: string): { lastWord: string; endsSentence: boolean; endsPunct: string } {
  const t = stem.replace(/\s+$/, "");
  const lastWord = (/([A-Za-z']+)$/.exec(t)?.[1] ?? "").toLowerCase();
  const endsPunct = /([.,;:])$/.exec(t)?.[1] ?? "";
  const endsSentence = t === "" || /[.!?]["')\]]?$/.test(t);
  return { lastWord, endsSentence, endsPunct };
}

/**
 * Render one slot value into prose. Applies, in order:
 *   1. per-contract adapter map (exact match on the raw value)
 *   2. array/list → natural-language join (never raw JSON)
 *   3. enum humanisation (snake_case → words)
 *   4. value-trailing punctuation strip (unless the value is a sentence and
 *      the template does not already supply terminal punctuation)
 *   5. stem/value seam preposition de-duplication
 *   6. mid-sentence initial-capital folding
 */
export function renderSlotValue(value: unknown, opts: SlotRenderOptions = {}): string {
  const adapter = opts.adapter ?? {};
  const rawKey = typeof value === "string" ? value.trim() : "";
  if (rawKey && Object.prototype.hasOwnProperty.call(adapter, rawKey)) {
    return finish(adapter[rawKey], opts);
  }

  const coerced = coerceValue(value);
  let out: string;
  let wasList = false;
  if (Array.isArray(coerced)) {
    out = joinNaturalList(coerced);
    wasList = coerced.length > 1;
  } else if (coerced && typeof coerced === "object") {
    out = stringifyScalar(coerced);
  } else {
    out = stringifyScalar(coerced);
  }
  if (!out) return "";
  out = humaniseEnum(out);
  if (Object.prototype.hasOwnProperty.call(adapter, out)) out = adapter[out];
  return finish(out, { ...opts, midSentence: wasList ? false : opts.midSentence });
}

function finish(input: string, opts: SlotRenderOptions): string {
  let out = String(input ?? "").trim();
  if (!out) return "";

  const stem = opts.stem ?? "";
  const next = opts.next ?? "";
  const { lastWord, endsSentence } = stemTail(stem);
  const midSentence = opts.midSentence ?? (stem.trim().length > 0 && !endsSentence);

  // (2) value-trailing punctuation — strip when the template continues with a
  // word or already supplies punctuation. ITEM 390 (FIX 1): a complete
  // sentence keeps its terminal mark unless the template itself supplies one.
  const templateSuppliesPunct = /^\s*[.,;:)]/.test(next);
  const templateContinues = /^\s*\S/.test(next);
  // A slot is sentence-valued either because the value carries its own
  // terminal mark, or because the CONTRACT declares it so (`opts.isSentence`,
  // set from the `_sentence`/`_clause`/`_note` slot-name classes) and the value
  // has the shape of a sentence — the terminal mark is template-supplied there
  // ("{{plan:customer_recorded_fact_clause}}."). Enum/fragment slots never
  // carry `isSentence`, so ITEM 337's behaviour on them is byte-identical.
  const declaredSentence = opts.isSentence === true && /\s/.test(out) &&
    /^["'(\[]?[A-Z]/.test(out);
  const valueIsSentence = declaredSentence || isSentenceValue(out);
  const keepTerminal = !templateSuppliesPunct &&
    (isSentenceValue(out) || (opts.isSentence === true && !templateContinues));
  if (!keepTerminal) out = out.replace(/[\s.,;:]+$/, "");
  if (!out) return "";

  // (4) seam preposition de-duplication.
  if (lastWord && SEAM_WORDS.includes(lastWord)) {
    // Drop the value's duplicate of the stem's trailing seam word, including a
    // leading adverb before it ("Directly from account signup" after "… from").
    const re = new RegExp(`^(?:\\S+\\s+){0,1}${lastWord}\\s+`, "i");
    if (re.test(out)) out = out.replace(re, "");
  }

  // (3) mid-sentence case folding. ITEM 390 (FIX 1): never fold a complete
  // sentence — its opening capital is part of the byte-pinned form.
  if (midSentence && !valueIsSentence) out = foldInitialCap(out);
  return out;
}

/**
 * Post-render cleanup for a fully assembled string: doubled terminal
 * punctuation, space-before-punctuation, and collapsed whitespace.
 */
export function collapseRenderArtifacts(text: string): string {
  return String(text ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.,;:])\1+/g, "$1")
    .replace(/\.{2,}(?!\.)/g, ".")
    .replace(/,\s*\./g, ".")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/**
 * Per-contract enum → prose adapters. Mechanical rules apply where no entry
 * exists (see renderSlotValue).
 */
export const PROSE_ADAPTERS: Record<string, Record<string, string>> = {
  "cppa-risk": {
    "fixed_period": "a fixed retention period",
    "Fixed period": "a fixed retention period",
    "until_purpose_met": "retention until the processing purpose is met",
    "indefinite": "an indefinite retention period",
    "no_criterion": "no stated retention criterion",
    "direct_collection": "collection directly from the consumer",
    "third_party": "collection from third parties",
    "service_delivery": "delivering the service",
    "Deliver": "delivering the service",
    "not_applicable": "not applicable to the activity described",
    "insufficient_basis": "an insufficient basis in the facts provided",

  },
};

export function adapterFor(contract: string | undefined): Record<string, string> {
  if (!contract) return {};
  return PROSE_ADAPTERS[contract] ?? {};
}
