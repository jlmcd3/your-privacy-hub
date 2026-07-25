// LEAK-PREV-P0 — customer-messages catalog tests + source-level lint.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CUSTOMER_MESSAGES,
  CUSTOMER_MESSAGES_VERSION,
  FIELD_LABELS,
  KNOWN_INTAKE_KEYS,
  labelForField,
  P,
  renderMessage,
} from "./customer-messages.ts";

Deno.test("version stamp exists", () => {
  assert(CUSTOMER_MESSAGES_VERSION.startsWith("cm-w"));
});

Deno.test("labelForField NEVER returns raw snake_case IDs", () => {
  const snake = /^[a-z0-9]+(_[a-z0-9]+)+$/i;
  // Every known intake key resolves to a curated label OR the neutral fallback.
  for (const k of KNOWN_INTAKE_KEYS) {
    const label = labelForField(k);
    assert(
      !snake.test(label),
      `labelForField("${k}") returned a raw-ID-shaped string: "${label}"`,
    );
    assert(label.length > 0);
  }
  // Unknown fields fall back to the neutral phrase — never a cosmetic
  // underscore-stripping of the raw ID.
  assertEquals(labelForField("some_never_seen_field_id"), "this intake area");
  assertEquals(labelForField(undefined), "this intake area");
  assertEquals(labelForField(""), "this intake area");
});

Deno.test("FIELD_LABELS covers each CPPA intake contract meaningfully", () => {
  // Count contract fields with a curated (non-fallback) label.
  const covered = KNOWN_INTAKE_KEYS.filter((k) => k in FIELD_LABELS);
  assert(
    covered.length >= Math.floor(KNOWN_INTAKE_KEYS.length * 0.75),
    `only ${covered.length}/${KNOWN_INTAKE_KEYS.length} intake keys have curated labels`,
  );
});

Deno.test("renderMessage — unknown catalog ID returns the information-needed generic (no throw)", () => {
  const out = renderMessage("nonexistent.id");
  assertEquals(out, CUSTOMER_MESSAGES["information.needed"].render({}));
});

Deno.test("renderMessage — no rendered message contains a raw intake ID", () => {
  const snakeSample = /q5b_profiling_observation|i1b_min_pi|admt_detail\.hi_trained/;
  for (const id of Object.keys(CUSTOMER_MESSAGES)) {
    const out = renderMessage(id, {
      field: P.field("q5b_profiling_observation"),
      verbatim: P.verbatim("Yes"),
    });
    assert(!snakeSample.test(out), `[${id}] leaked a raw intake ID: ${out}`);
  }
});

Deno.test("renderMessage — humanizes field param through labelForField", () => {
  const out = renderMessage("unsupported.silent", {
    field: P.field("q5b_profiling_observation"),
  });
  assert(out.includes("profiling and systematic observation"), out);
  assert(!out.includes("q5b_profiling_observation"), out);
});

Deno.test("renderMessage — unknown field param falls back to neutral phrase", () => {
  const out = renderMessage("unsupported.silent", {
    field: P.field("this_field_does_not_exist"),
  });
  assert(out.includes("this intake area"), out);
  assert(!/this_field_does_not_exist/.test(out), out);
});

// ── SOURCE-LEVEL LINT ────────────────────────────────────────────────────
// Detect regressions where guard/wiring code assigns a sentence-like
// customer-register string (or one interpolating a `source_field`) onto a
// report surface outside the catalog module.

const LINT_TARGETS = [
  "supabase/functions/_shared/intake/fact-ledger.ts",
  "supabase/functions/run-admt-checker/_w6_admt_fix.ts",
  "supabase/functions/run-admt-checker/_w9_admt_slots.ts",
  "supabase/functions/run-cppa-risk-assessment/_w10_risk_b1.ts",
  "supabase/functions/run-cppa-cybersecurity/_w6_cyber_fix.ts",
];

Deno.test("SOURCE LINT — no source_field interpolation into customer text outside catalog", async () => {
  const bad: string[] = [];
  for (const rel of LINT_TARGETS) {
    const path = new URL("../../../" + rel, import.meta.url);
    let src = "";
    try { src = await Deno.readTextFile(path); } catch { continue; }
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      // Flag template literals that interpolate a `source_field` expression.
      if (/`[^`]*\$\{[^}]*source_field[^}]*\}[^`]*`/.test(ln)) {
        bad.push(`${rel}:${i + 1} — source_field interpolated into a template literal: ${ln.trim()}`);
      }
    }
  }
  assertEquals(bad, [], bad.join("\n"));
});
