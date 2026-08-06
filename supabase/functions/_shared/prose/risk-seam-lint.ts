/**
 * ITEM 384 — PROSE EXCELLENCE SEAM LINT (R1 … R10 detectors).
 *
 * Deterministic detectors for the panel-ratified prose standard. These are
 * TEST INSTRUMENTS and builder guards — they never rewrite customer text.
 *
 *   opening-12-words  (R1) — a surface opens with the finding, not apparatus.
 *   bare-enum         (R4) — a raw enum token leaks into prose.
 *   splice            (R6) — two clauses joined without terminal punctuation.
 *   litany            (R7) — the same stem repeated across consecutive items.
 *   duplicate-sentence(R8) — the same sentence shipped twice in one document.
 *   wrong-field       (R9) — a surface renders another field's content.
 */

export const RISK_SEAM_LINT_VERSION = "risk-seam-lint@item384-2026-08-06";

export interface SeamFinding {
  rule: string;
  path: string;
  evidence: string;
}

const APPARATUS_OPENERS: readonly RegExp[] = [
  /^we could not verify/i,
  /^the information provided does not resolve/i,
  /^insufficient information/i,
  /^this section/i,
  /^this assessment (?:section|surface)/i,
  /^the following (?:table|list|section)/i,
  /^pursuant to the methodology/i,
  /^in accordance with the framework set out/i,
];

/** R1 — the first twelve words must carry the finding, never apparatus. */
export function openingCarriesFinding(text: string): boolean {
  const first = String(text ?? "").trim();
  if (!first) return false;
  const head = first.split(/\s+/).slice(0, 12).join(" ");
  return !APPARATUS_OPENERS.some((re) => re.test(first)) && head.length > 0;
}

/** R4 — snake_case / SCREAMING enum tokens must never appear in prose. */
export const BARE_ENUM_RE = /\b(?:[a-z0-9]+_[a-z0-9_]{2,}|[A-Z]{3,}_[A-Z_]{2,})\b/;

export function hasBareEnum(text: string): boolean {
  const t = String(text ?? "");
  // § pinpoints, URLs and quoted intake verbatims are not enum leaks.
  const scrub = t
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/"[^"]*"/g, " ")
    .replace(/“[^”]*”/g, " ");
  return BARE_ENUM_RE.test(scrub);
}

/**
 * R6 — SPLICE. A clause that ends without terminal punctuation immediately
 * followed by a new sentence-like clause. The shipped defect was
 * "…listing each modification and the risk it addresses complete and retain
 * the assessment record by December 31, 2027 … this is an ongoing obligation
 * Owner: Chief Compliance Officer."
 */
export const SPLICE_RES: readonly RegExp[] = [
  /\b(?:addresses|requires|records?|documents?|states?)\s+(?:complete|retain|confirm|record|document)\s+and\s+/i,
  /[a-z,]\s+Owner:\s/,
  /;\s*this is an ongoing obligation\s+[A-Z]/,
];

export function hasSplice(text: string): boolean {
  const t = String(text ?? "");
  return SPLICE_RES.some((re) => re.test(t));
}

/**
 * R7 — LITANY. Three or more consecutive items built from the same mould:
 * the same opening word AND the same closing six words. The recorded
 * defect was four consecutive "Confirm <element> is documented in the
 * assessment record — present on the record; retain …" steps, whose leading
 * six words differ but whose mould is identical.
 */
export function hasLitany(items: readonly string[], run = 3): boolean {
  const stem = (s: string) => {
    const w = String(s ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (w.length < 4) return "";
    return `${w[0]}|${w.slice(-6).join(" ")}`;
  };
  let streak = 1;
  for (let i = 1; i < items.length; i++) {
    if (stem(items[i]) && stem(items[i]) === stem(items[i - 1])) {
      streak += 1;
      if (streak >= run) return true;
    } else streak = 1;
  }
  return false;
}

/** R8 — the same sentence may not ship twice in one document. */
export function duplicateSentences(text: string, minChars = 60): string[] {
  const seen = new Map<string, number>();
  for (const s of String(text ?? "").split(/(?<=[.!?])\s+/)) {
    const k = s.trim().toLowerCase().replace(/\s+/g, " ");
    if (k.length < minChars) continue;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

/**
 * R9 — WRONG FIELD. A surface must not render a value the record holds under
 * a different field. Detected by exact-value collision against a map of
 * foreign field values.
 */
export function rendersWrongField(
  text: string,
  foreignValues: Readonly<Record<string, string>>,
): string[] {
  const t = String(text ?? "");
  return Object.entries(foreignValues)
    .filter(([, v]) => typeof v === "string" && v.trim().length >= 24 && t.includes(v.trim()))
    .map(([k]) => k);
}

/** Walk a report's string leaves, skipping internal metadata. */
export function proseLeaves(node: unknown, path = "$"): { path: string; value: string }[] {
  const out: { path: string; value: string }[] = [];
  if (typeof node === "string") {
    if (node.trim()) out.push({ path, value: node });
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => out.push(...proseLeaves(v, `${path}[${i}]`)));
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "_meta" || k === "_staging") continue;
      out.push(...proseLeaves(v, `${path}.${k}`));
    }
  }
  return out;
}
