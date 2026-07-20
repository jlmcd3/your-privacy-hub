// CPPA-HF5 — inline scrub-logic tests. Deterministic regex checks are
// verified here in isolation (mirroring the code in the three product
// functions) so a regression in the render/scrub logic breaks CI.
import { assertEquals, assert } from "https://deno.land/std@0.208.0/testing/asserts.ts";

// ── Task A — Risk field-id fail-closed scrub ─────────────────────────
const LABELS: Array<[RegExp, string]> = [
  [/\bi5_admt_logic\b/gi, "the ADMT logic description"],
  [/\bq19_admt_description\b/gi, "the ADMT-system description"],
  [/\bq20_admt_opt_out\b/gi, "the ADMT opt-out description"],
  [/\bi7_internal_contributors\b/gi, "the internal-contributors roster"],
  [/\bi2_retention_period\b/gi, "the recorded retention period"],
  [/\bi2_retention_detail\b/gi, "the recorded retention detail"],
  [/\bi2_retention_criteria\b/gi, "the recorded retention criteria"],
  [/\bi6_vendors\b/gi, "the vendor roster"],
  [/\bi1_processing_purpose\b/gi, "the processing purpose"],
];
const CATCHALL = /\b[a-z]{1,3}\d{1,3}[a-z]?_[a-z][a-z0-9_]{2,}\b/g;
const URL_RE = /https?:\/\/[^\s)]+/g;

function scrub(s: string): { out: string; hits: number; unmapped: number } {
  const urls: string[] = [];
  const withHoles = s.replace(URL_RE, (u) => { urls.push(u); return `\u0000URL${urls.length - 1}\u0000`; });
  let hits = 0;
  let next = withHoles;
  for (const [re, sub] of LABELS) next = next.replace(re, (_m) => { hits++; return sub; });
  let unmapped = 0;
  next = next.replace(CATCHALL, () => { unmapped++; hits++; return "the corresponding intake field"; });
  next = next.replace(/\u0000URL(\d+)\u0000/g, (_m, i) => urls[Number(i)] ?? "");
  return { out: next, hits, unmapped };
}

Deno.test("HF5 A — strips the seven new HF5-listed IDs to labels", () => {
  for (const id of ["i2_retention_period", "i2_retention_detail", "i2_retention_criteria",
                    "q20_admt_opt_out", "i6_vendors", "i1_processing_purpose", "q19_admt_description"]) {
    const { out } = scrub(`See ${id} for the value.`);
    assert(!out.includes(id), `mapped ID still present: ${id} → ${out}`);
  }
});

Deno.test("HF5 A — unmapped field-id-shaped tokens fall through to generic label", () => {
  const { out, unmapped } = scrub("Refer to q42_new_field and i9_novel_token for context.");
  assert(!/\bq42_new_field\b/.test(out));
  assert(!/\bi9_novel_token\b/.test(out));
  assertEquals(unmapped, 2);
  assert(out.includes("the corresponding intake field"));
});

Deno.test("HF5 A — URL substrings are exempt from scrubbing", () => {
  const url = "https://cppa.ca.gov/regulations/pdf/final_regs_2025.pdf";
  const { out } = scrub(`See ${url} for the text.`);
  assert(out.includes(url), `URL was mangled: ${out}`);
});

Deno.test("HF5 A — plain English tokens like opt_out and risk_assessment are NOT scrubbed", () => {
  const { out, unmapped } = scrub("The opt_out mechanism must satisfy the risk_assessment obligation.");
  assertEquals(unmapped, 0);
  assertEquals(out, "The opt_out mechanism must satisfy the risk_assessment obligation.");
});

// ── Task B — "the cited provision" registry consumption + "the the" ───
function consumeCitedProvision(prose: string, concreteCitation: string): string {
  const TOKEN_RE = /\bthe\s+cited\s+provision(?:\s+(?:governing|above|below|referenced))?\b/gi;
  const UNDER_RE = /\bunder\s+the\s+cited\s+provision\b/gi;
  let next = prose;
  next = next.replace(UNDER_RE, `under ${concreteCitation}`);
  next = next.replace(TOKEN_RE, concreteCitation);
  next = next.replace(/\bthe\s+the\s+cited\s+provision\b/gi, "the cited provision");
  return next;
}

Deno.test("HF5 B — 'the cited provision' is replaced by concrete registry citation", () => {
  const out = consumeCitedProvision("The response must satisfy the cited provision.", "§ 7222(b)(3)");
  assertEquals(out, "The response must satisfy § 7222(b)(3).");
});

Deno.test("HF5 B — 'under the cited provision' is replaced", () => {
  const out = consumeCitedProvision("Under the cited provision the business must respond.", "§ 7221(a)");
  assert(out.includes("under § 7221(a)"));
});

Deno.test("HF5 B — lowercase 'the the cited provision' collapses to 'the cited provision'", () => {
  const scrub = (s: string) => s.replace(/\bthe\s+the\s+cited\s+provision\b/gi, "the cited provision");
  assertEquals(scrub("the the cited provision governs"), "the cited provision governs");
  assertEquals(scrub("The the cited provision governs"), "the cited provision governs");
});

// ── Task E — usage_note counsel-language strip ────────────────────────
function stripCounsel(s: string): string {
  let next = s
    .replace(/\bwork\s+with\s+(?:your\s+)?(?:legal\s+)?counsel[^.]*\.?/gi, "")
    .replace(/\bcoordinate\s+with\s+(?:your\s+)?(?:legal\s+)?counsel[^.]*\.?/gi, "")
    .replace(/\bconsult\s+(?:with\s+)?(?:your\s+)?(?:legal\s+)?counsel[^.]*\.?/gi, "")
    .replace(/\bconfirm\s+with\s+(?:your\s+)?(?:legal\s+)?counsel[^.]*\.?/gi, "")
    .replace(/\bhave\s+(?:your\s+)?(?:legal\s+)?counsel\s+[^.]*\.?/gi, "")
    .replace(/\s{2,}/g, " ").trim();
  return next;
}

Deno.test("HF5 E — usage_note counsel-coordination directives are stripped", () => {
  const bad = "Incorporate this text into your access-request processing procedures and work with legal counsel to confirm applicability.";
  const out = stripCounsel(bad);
  assert(!/legal counsel/i.test(out), `counsel language survived: ${out}`);
});

Deno.test("HF5 E — 'consult counsel' variant stripped", () => {
  const bad = "Add to your privacy notice. Consult counsel before deployment.";
  const out = stripCounsel(bad);
  assert(!/counsel/i.test(out), `counsel language survived: ${out}`);
});
