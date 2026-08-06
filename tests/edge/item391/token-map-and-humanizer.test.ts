// ITEM 391 — class-ending canaries for the four customer-surface defects.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { formatAnswer } from "../../../supabase/functions/generate-eu-notice/index.ts";
import {
  computeCyberAggregates,
  scrubAuthoredAggregates,
} from "../../../supabase/functions/run-cppa-cybersecurity/_w10_cyber_aggregates.ts";

// ── FIX 1 — humanizer never touches free text (emails, URLs, prose) ────────
Deno.test("ITEM 391 F1 — unmapped free-text values pass through verbatim", () => {
  assertEquals(formatAnswer("dpo_email", "dpo@acme.test"), "dpo@acme.test");
  assertEquals(formatAnswer("public_privacy_policy_url", "https://acme.test/privacy"),
    "https://acme.test/privacy");
  assertEquals(formatAnswer("controller_name", "acme_widgets ltd"), "acme_widgets ltd");
});

Deno.test("ITEM 391 F1 — mapped enum tokens still render their label byte-identically", () => {
  assertEquals(
    formatAnswer("lawful_basis", ["contract", "consent"]),
    "Contractual necessity (Art.6(1)(b)), Consent (Art.6(1)(a))",
  );
});

// ── FIX 2 — no M_TOKEN_MAP value carries internal vocabulary ───────────────
const INTERNAL_VOCAB_RE =
  /\b(?:cyber-audit|module|shard|pipeline|stamp|tier\s+review|stage\s+\d|pass\s?[12]|ltp|slot|token|harness|orchestrator)\b/i;

Deno.test("ITEM 391 F2 — M_TOKEN_MAP carries no internal module/tier vocabulary", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-cppa-risk-assessment/index.ts", import.meta.url),
  );
  const block = src.slice(src.indexOf("const M_TOKEN_MAP"));
  const body = block.slice(0, block.indexOf("};"));
  const values = [...body.matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert(values.length >= 10, `expected the full M-token map, got ${values.length}`);
  const leaks = values.filter((v) => INTERNAL_VOCAB_RE.test(v));
  assertEquals(leaks, [], `internal vocabulary on a customer surface: ${leaks.join(" | ")}`);
});

// ── FIX 3 — ADMT subchapter never referenced as bare "Article 11" ──────────
Deno.test("ITEM 391 F3 — run-admt-checker carries no bare Article 10/11 shorthand", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-admt-checker/index.ts", import.meta.url),
  );
  const violations = src.split("\n").filter((ln) =>
    /Article 1[01]/.test(ln) && !/CPPA-HF1 A2|CPPA-HF2 E|CPPA-HF3/.test(ln)
  );
  assertEquals(violations, []);
});

// ── FIX 4 — aggregate dedup is idempotent over its own substitution ────────
Deno.test("ITEM 391 F4 — canonical sentence survives the loose-token fallback intact", () => {
  const agg = computeCyberAggregates([
    { status: "Implemented", score: 60 },
    { status: "Implemented", score: 66 },
    { status: "Insufficient information", score: 0 },
  ]);
  const { out, replaced } = scrubAuthoredAggregates(
    "The organisation demonstrates a mean score of 81 across the 18 audit components.",
    agg,
  );
  assert(replaced >= 1);
  assertEquals(out, agg.canonical_sentence);
  assert(!/figure stated above/.test(out), out);
});

Deno.test("ITEM 391 F4 — genuine repeats still dedup to one canonical sentence", () => {
  const agg = computeCyberAggregates([{ status: "Mature", score: 90 }]);
  const { out } = scrubAuthoredAggregates(
    "A mean score of 81 was observed. Separately, the average score of 77 was reported.",
    agg,
  );
  const hits = out.split(agg.canonical_sentence).length - 1;
  assertEquals(hits, 1, out);
  assert(!/\b(?:81|77)\b/.test(out), out);
});
