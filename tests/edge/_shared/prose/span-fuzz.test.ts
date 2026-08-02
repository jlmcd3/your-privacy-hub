// ITEM 368(2) — PROPERTY-BASED / FUZZ COVERAGE for the style-lint battery,
// the sentinel hard fail, and the span-safe polish pass.
//
// APPROACH. A seeded xorshift PRNG (deterministic, reproducible from the seed
// printed on failure) assembles adversarial section text from a small corpus
// of prose atoms, attribution clauses, punctuation hazards and TRACKED SPANS.
// The generator deliberately places spans at the hazardous positions the
// fourteen rules interact at:
//
//   - span flush against a sentence boundary (before/after "." )
//   - two spans adjacent with no text between them
//   - a span immediately following a paragraph break, and a segment that
//     spans a paragraph break
//   - a span inside a record-card line ("- Label: value")
//   - a span inside quoted text (must be caught by quoted_intake_value)
//   - malformed sentinels (must be caught by unbalanced_sentinel / throw)
//
// PROPERTIES ASSERTED
//   P1 extractSpans never crashes on well-formed marks and round-trips every
//      value verbatim; offsets always address the value exactly.
//   P2 extractSpans THROWS on any malformed mark (Item 368(1)).
//   P3 lintDocumentStyle never throws on arbitrary input.
//   P4 no false-clean: text carrying a planted, detectable defect always
//      yields at least one finding of the expected rule.
//   P5 the polish pass can never alter a tracked span, even with an
//      adversarial rewriter that tries to.

import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  auditSentinels,
  extractSpans,
  rec,
  SPAN_END,
  SPAN_SEP,
  SPAN_START,
  UnbalancedSentinelError,
} from "../../../../supabase/functions/_shared/prose/span-tracking.ts";
import { lintDocumentStyle } from "../../../../supabase/functions/_shared/prose/style-lint.ts";
import {
  editableSegments,
  runSpanSafePolish,
} from "../../../../supabase/functions/_shared/prose/span-safe-polish.ts";

// ── deterministic PRNG ─────────────────────────────────────────────────────
function rng(seed: number) {
  let x = seed >>> 0 || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 0x100000000;
  };
}
const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length) % xs.length];

const CLAUSES = [
  "The company states that ",
  "The company describes ",
  "It reports ",
  "The company sets out ",
  "The company lists ",
  "The assessment finds that the activity engages § 7152(a)(3). ",
  "That determination follows from the record itself. ",
];
const VALUES = [
  "marketing analytics",
  "device identifiers",
  "a 24-month retention window",
  "Acme Data Ltd",
  "§ 7152(a)(2)",
  "personnel screening, inference-based",
];
const SOURCES = ["intake.purpose", "intake.data_types", "engine.factor_a", "intake.entity_name"];

/** Build one marked (pre-extraction) section body with hazards planted. */
function generateMarked(r: () => number): string {
  let out = "";
  const paras = 1 + Math.floor(r() * 3);
  for (let p = 0; p < paras; p++) {
    const sentences = 1 + Math.floor(r() * 4);
    for (let i = 0; i < sentences; i++) {
      const shape = Math.floor(r() * 7);
      const span = () => rec(pick(r, VALUES), pick(r, SOURCES));
      if (shape === 0) out += `${pick(r, CLAUSES)}${span()}.`; // span at sentence end
      else if (shape === 1) out += `${span()} follows from the record.`; // span at start
      else if (shape === 2) out += `${pick(r, CLAUSES)}${span()}${span()}.`; // adjacent spans
      else if (shape === 3) out += `\n- Purpose: ${span()}\n`; // record-card line
      else if (shape === 4) out += `${pick(r, CLAUSES)}${span()} and ${span()} together.`;
      else if (shape === 5) out += `${pick(r, CLAUSES)}"${span()}".`; // quoted — a defect
      else out += pick(r, CLAUSES).trim() + ".";
      out += " ";
    }
    if (p < paras - 1) out += "\n\n";
  }
  return out;
}

const LINT_OPTS = { entity: "Acme Data Ltd" };

Deno.test("fuzz P1/P3 — extraction round-trips and the battery never throws", () => {
  for (let seed = 1; seed <= 400; seed++) {
    const r = rng(seed);
    const marked = generateMarked(r);
    assertEquals(auditSentinels(marked).length, 0, `seed ${seed}: generator emitted a bad mark`);
    const { text, spans } = extractSpans(marked);
    for (const sp of spans) {
      assertEquals(text.slice(sp.start, sp.end), sp.value, `seed ${seed}: span offsets drifted`);
    }
    assert(!/[\uE000\uE001\uE002]/.test(text), `seed ${seed}: sentinel survived extraction`);
    // P3 — no crash on the clean text, nor on the RAW marked text.
    lintDocumentStyle([{ section_id: "s", title: "S", text, spans }], LINT_OPTS);
    lintDocumentStyle([{ section_id: "s", title: "S", text: marked, spans: [] }], LINT_OPTS);
  }
});

Deno.test("fuzz P2 — every malformed mark hard-fails extraction and lints", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const r = rng(seed * 7919);
    const marked = generateMarked(r);
    const mutations = [
      () => marked + SPAN_START + "intake.x" + SPAN_SEP + "orphan",
      () => marked + SPAN_START + "intake.x",
      () => marked + SPAN_END,
      () => marked + SPAN_SEP,
      () => SPAN_START + "a" + SPAN_SEP + SPAN_START + "b" + SPAN_SEP + "v" + SPAN_END + SPAN_END,
    ];
    for (const mutate of mutations) {
      const bad = mutate();
      assert(auditSentinels(bad).length > 0, `seed ${seed}: defect not detected`);
      assertThrows(() => extractSpans(bad), UnbalancedSentinelError);
      const findings = lintDocumentStyle(
        [{ section_id: "s", title: "S", text: bad, spans: [] }],
        LINT_OPTS,
      );
      assert(
        findings.some((f) => f.rule === "unbalanced_sentinel"),
        `seed ${seed}: lint returned a false-clean verdict on a malformed mark`,
      );
    }
  }
});

Deno.test("fuzz P4 — planted defects are never reported clean", () => {
  const planted: Array<{ rule: string; make: (base: string) => string }> = [
    { rule: "banned_record_phrase", make: (b) => `${b} The record states the position.` },
    { rule: "pluralisation_artifact", make: (b) => `${b} There are 1 element(s) present.` },
    { rule: "punctuation_collision", make: (b) => `${b} The finding stands ,.` },
  ];
  for (let seed = 1; seed <= 120; seed++) {
    const { text, spans } = extractSpans(generateMarked(rng(seed * 31)));
    for (const p of planted) {
      const findings = lintDocumentStyle(
        [{ section_id: "s", title: "S", text: p.make(text), spans }],
        LINT_OPTS,
      );
      assert(
        findings.some((f) => f.rule === p.rule),
        `seed ${seed}: ${p.rule} planted but not reported`,
      );
    }
  }
  // Quoted record value — the span must be caught even at a sentence boundary.
  const q = extractSpans(`The company states "${rec("device identifiers", "intake.d")}".`);
  const findings = lintDocumentStyle([{ section_id: "s", title: "S", ...q }], LINT_OPTS);
  assert(findings.some((f) => f.rule === "quoted_intake_value"));
});

Deno.test("fuzz P5 — an adversarial rewriter cannot touch a tracked span", async () => {
  for (let seed = 1; seed <= 150; seed++) {
    const { text, spans } = extractSpans(generateMarked(rng(seed * 104729)));
    if (!spans.length) continue;

    // The rewriter tries every attack available to it: rewriting span text,
    // injecting sentinels, emptying the segment, returning garbage.
    const hostile = () =>
      Promise.resolve(
        `${SPAN_START}fake${SPAN_SEP}TAMPERED${SPAN_END} ` +
          spans.map((s) => s.value.toUpperCase()).join(" ") + " XX ",
      );

    const res = await runSpanSafePolish(
      [{ section_id: "s", title: "S", text, spans }],
      { product: "cppa-risk", force: true, rewrite: hostile, lint: LINT_OPTS },
    );
    const out = res.sections[0];
    const candidate = out.candidate ?? out.text;
    // Structural guarantee: every original value still present, verbatim,
    // in the candidate — regardless of accept/reject.
    for (const sp of spans) {
      assert(candidate.includes(sp.value), `seed ${seed}: span value lost from candidate`);
    }
    assert(!/[\uE000\uE001\uE002]/.test(candidate), `seed ${seed}: rewriter injected a sentinel`);
    // Shadow/observe: the shipped text is always the deterministic text.
    assertEquals(out.text, text, `seed ${seed}: polish shipped under force/shadow`);
  }
});

Deno.test("segments never overlap a span and cover the rest of the text", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { text, spans } = extractSpans(generateMarked(rng(seed * 6151)));
    const segs = editableSegments(text, spans);
    for (const seg of segs) {
      for (const sp of spans) {
        assert(
          seg.end <= sp.start || seg.start >= sp.end,
          `seed ${seed}: editable segment overlaps a tracked span`,
        );
      }
    }
    const covered = segs.reduce((n, s) => n + (s.end - s.start), 0) +
      spans.reduce((n, s) => n + (s.end - s.start), 0);
    assertEquals(covered, text.length, `seed ${seed}: segmentation lost characters`);
  }
});

Deno.test("polish pass is OFF by default for cppa-risk", async () => {
  const { text, spans } = extractSpans(`The company states ${rec("marketing analytics", "intake.p")}.`);
  const res = await runSpanSafePolish(
    [{ section_id: "s", title: "S", text, spans }],
    { product: "cppa-risk", rewrite: () => Promise.resolve("REWRITTEN") },
  );
  assertEquals(res.mode, "off");
  assertEquals(res.sections[0].skipped_reason, "flag_off");
  assertEquals(res.sections[0].text, text);
});
