// A-TEAM S3 RULINGS III.10 / V.7 (doc 115, 2026-08-31) — ACRONYM-SAFE
// MID-SENTENCE CASING.
//
// Two composers lowercased recorded values when splicing them mid-sentence
// and mangled leading acronyms in the process:
//   * governance lowercased the first character: "DLP rules" → "dLP rules";
//   * ADMT lowercased the whole string: "Gradient-boosted ML model" →
//     "gradient-boosted ml model".
// Both printed a corrupted form of the customer's own recorded value.
//
// This helper lowercases ONLY the first character, and only when the second
// character is lowercase — a word opening with two capitals is an acronym
// (DLP, ICO, SCCs, ML) and is preserved. The remainder of the string is
// NEVER rewritten.

export function lowerFirstWordSafe(v: string): string {
  const t = String(v ?? "");
  if (t.length < 2) return t.toLowerCase();
  const first = t.charAt(0);
  const second = t.charAt(1);
  if (first === first.toLowerCase()) return t;
  // Acronym guard: second char uppercase ⇒ leave untouched.
  if (second !== second.toLowerCase() && /[A-Za-z]/.test(second)) return t;
  return first.toLowerCase() + t.slice(1);
}
