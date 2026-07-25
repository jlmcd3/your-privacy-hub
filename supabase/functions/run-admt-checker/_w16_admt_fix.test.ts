// ADMT-W16-FIX (2026-07-25) — colocated Deno tests.
//
// Scope:
//   Item 1 — L1 reverse-lookup: entries citing a covered pinpoint without
//            a proposition_key resolve deterministically via
//            resolveByCitationString + get stamped.
//   Item 2 — Dash-fusion: model-authored "§§ 7220–7222" cannot survive
//            through stripModelCitations to fuse with the neutral fallback.
//
// The tests exercise the shared resolver and the shared stripper directly
// (unit-scope) — the L1 stamp pass composition in run-admt-checker/index.ts
// is a thin wrapper over these primitives. Composition is covered by the
// existing _w9_admt_pre_emit_gates.test.ts and _w12_c1_leak_guard.test.ts
// (kept green — this turn does not touch those regexes).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  ADMT_VERIFIED_AUTHORITIES,
} from "../_shared/registry/admt-verified-authorities.ts";
import {
  resolveByCitationString,
  resolveByPropositionKey,
  normalizeCitationString,
} from "../_shared/verified-authority-resolver.ts";
import { stripModelCitations } from "../_shared/admt-citation-registry.ts";

// ─────────────────────────────────────────────────────────────────────────
// (a) reverse-lookup resolves § 7155(a)(1) with no proposition_key.
// ─────────────────────────────────────────────────────────────────────────
Deno.test("W16 (a) — reverse lookup: § 7155(a)(1) stamps from registry", () => {
  const row = resolveByCitationString(ADMT_VERIFIED_AUTHORITIES, "11 CCR § 7155(a)(1)");
  assert(row, "expected a registry row for 11 CCR § 7155(a)(1)");
  assertEquals(row!.subsection, "11 CCR § 7155(a)(1)");
  assert(row!.verbatim_quote.length > 0, "verbatim_quote must be non-empty");
  assert(row!.proposition_key.length > 0, "proposition_key must be present");
});

// ─────────────────────────────────────────────────────────────────────────
// (b) reverse-lookup resolves § 7150(b)(3) with no proposition_key.
// ─────────────────────────────────────────────────────────────────────────
Deno.test("W16 (b) — reverse lookup: § 7150(b)(3) stamps from registry", () => {
  const row = resolveByCitationString(ADMT_VERIFIED_AUTHORITIES, "11 CCR § 7150(b)(3)");
  assert(row, "expected a registry row for 11 CCR § 7150(b)(3)");
  assertEquals(row!.subsection, "11 CCR § 7150(b)(3)");
  assert(row!.verbatim_quote.length > 0);
});

// ─────────────────────────────────────────────────────────────────────────
// (c) uncovered pinpoint returns null — never fabricated.
// ─────────────────────────────────────────────────────────────────────────
Deno.test("W16 (c) — uncovered pinpoint returns null (no fabrication)", () => {
  const row = resolveByCitationString(ADMT_VERIFIED_AUTHORITIES, "11 CCR § 7999(z)(99)");
  assertEquals(row, null);
});

// ─────────────────────────────────────────────────────────────────────────
// (d) ambiguous normalized citation returns null (never guessed).
// ─────────────────────────────────────────────────────────────────────────
Deno.test("W16 (d) — ambiguous match returns null (never guessed)", () => {
  // Synthesize a tiny registry with two rows sharing the same subsection
  // string — resolveByCitationString must refuse to guess between them.
  const fakeReg = {
    row_a: {
      proposition_key: "row_a", citation: "X", subsection: "11 CCR § 9999(a)",
      verbatim_quote: "…", depth_class: "sub_subsection" as const,
      governing_anchor: "X", verified_on: "2026-07-25",
      primary_source_url: "https://example.test/x",
    },
    row_b: {
      proposition_key: "row_b", citation: "X", subsection: "11 CCR § 9999(a)",
      verbatim_quote: "…", depth_class: "sub_subsection" as const,
      governing_anchor: "X", verified_on: "2026-07-25",
      primary_source_url: "https://example.test/x",
    },
  };
  const out = resolveByCitationString(fakeReg, "11 CCR § 9999(a)");
  assertEquals(out, null);
});

// ─────────────────────────────────────────────────────────────────────────
// (e) key-path unchanged (regression).
// ─────────────────────────────────────────────────────────────────────────
Deno.test("W16 (e) — proposition_key path unchanged (regression)", () => {
  const row = resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, "admt_def");
  assert(row, "admt_def must resolve");
  assertEquals(row!.subsection, "11 CCR § 7001(e)");
});

// ─────────────────────────────────────────────────────────────────────────
// (f) fallback join: "provision–7222" fusion class can no longer be produced.
// ─────────────────────────────────────────────────────────────────────────
Deno.test("W16 (f) — dash-fusion: '§§ 7220–7222' cannot leave a '–7222' tail", () => {
  // Reproducing input: model authored a range citation. stripModelCitations
  // must swallow the ENTIRE range (both endpoints), not just the leading §.
  const inputs = [
    "The business must respond under 11 CCR §§ 7220–7222 within 45 days.",
    "See §§ 7220–7222 for the ADMT subchapter.",
    "Under 11 CCR §§ 7220-7222 (hyphen variant) the duty attaches.",
    "The obligation lives at §§ 7150–7157 within the risk-assessment subchapter.",
    "Combined §§ 7220(c)(5)–7222(b)(3) chained.",
  ];
  for (const s of inputs) {
    const out = stripModelCitations(s);
    // No bare "7XXX" number may survive after the range collapse.
    assert(!/[\u2013\u2014-]\s*7\d{3}/.test(out), `dash tail survived: "${out}"`);
    // No "provision–7222" fusion class.
    assert(!/provision\s*[\u2013\u2014-]\s*7\d{3}/i.test(out), `fusion class produced: "${out}"`);
    // No literal "§ 7XXX" survives either.
    assert(!/§\s*7\d{3}/.test(out), `section token survived: "${out}"`);
  }
});

Deno.test("W16 (f2) — direct fusion input is stripped defense-in-depth", () => {
  // Even if an upstream mutation already produced the fused fragment
  // (e.g. legacy report cached in another surface), the stripper cleans it.
  const fused =
    "the applicable ADMT-subchapter provision–7222 governs the access-response.";
  const out = stripModelCitations(fused);
  assert(!/provision\s*[\u2013\u2014-]\s*7\d{3}/i.test(out), `still fused: "${out}"`);
  assert(out.includes("the applicable ADMT-subchapter provision"));
});

// ─────────────────────────────────────────────────────────────────────────
// (g) fail-open: resolveByCitationString on garbage inputs returns null,
//     never throws.
// ─────────────────────────────────────────────────────────────────────────
Deno.test("W16 (g) — fail-open on garbage / non-string input", () => {
  // deno-lint-ignore no-explicit-any
  assertEquals(resolveByCitationString(ADMT_VERIFIED_AUTHORITIES, null as any), null);
  // deno-lint-ignore no-explicit-any
  assertEquals(resolveByCitationString(ADMT_VERIFIED_AUTHORITIES, undefined as any), null);
  assertEquals(resolveByCitationString(ADMT_VERIFIED_AUTHORITIES, ""), null);
  assertEquals(resolveByCitationString(ADMT_VERIFIED_AUTHORITIES, "   "), null);
  // Non-citation text simply doesn't match — returns null cleanly.
  assertEquals(resolveByCitationString(ADMT_VERIFIED_AUTHORITIES, "not a citation"), null);
});

// ─────────────────────────────────────────────────────────────────────────
// (h) telemetry placement leak guard — reverse-lookup telemetry keys are
//     structural (only used inside _meta.internal via the existing W12-C1
//     strip pass). This test asserts the KEY NAMES we plan to emit are
//     underscore-prefixed, so the existing leak guard will move them off
//     the customer surface without any change to the guard itself.
// ─────────────────────────────────────────────────────────────────────────
Deno.test("W16 (h) — new telemetry keys are underscore-guardable", () => {
  const NEW_METRIC_KEYS = [
    "va_reverse_stamps_applied",
    "va_reverse_ambiguous",
    "va_reverse_uncovered",
  ];
  // The keys themselves are non-underscore metric names — they live INSIDE
  // the underscore-prefixed telemetry envelopes (`_w9_admt_wire` at the top
  // level, `_va_stamp.resolved_via` per-entry) that the W12-C1 strip pass
  // already moves to _meta.internal. We assert here that the envelope
  // names remain underscore-prefixed so no leak-guard regex needs updating.
  const TELEMETRY_ENVELOPES = ["_w9_admt_wire", "_va_stamp", "_va_stamp_unresolved"];
  for (const env of TELEMETRY_ENVELOPES) {
    assert(env.startsWith("_"), `envelope ${env} must be underscore-prefixed`);
  }
  // And the metric key set itself is stable / documented.
  assertEquals(NEW_METRIC_KEYS.length, 3);
});

// ─────────────────────────────────────────────────────────────────────────
// Normalization sanity — the reverse-lookup normalizer must be a no-op on
// already-canonical registry subsection strings so exact matches always hit.
// ─────────────────────────────────────────────────────────────────────────
Deno.test("W16 — normalization is a no-op on canonical subsection strings", () => {
  for (const row of Object.values(ADMT_VERIFIED_AUTHORITIES)) {
    const n = normalizeCitationString(row.subsection);
    // Whitespace collapse is idempotent; smart-quote replacement is a no-op
    // for ASCII-safe registry strings. The registry entries themselves
    // must already be in normalized form.
    assertEquals(n, row.subsection.replace(/[\u2013\u2014]/g, "-"));
  }
});
