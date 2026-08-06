/**
 * ITEM 390 — THE ITEM-337 REGRESSION FAMILY: CANARIES.
 *
 * FIX 1 — sentence-valued slot exemption (locked-sentence canary + fragment
 *         canary: ITEM 337's authorized folding must stay byte-identical).
 * FIX 2 — LAW 3 single-writer restore (structural canary, matching the
 *         mechanism surface-ownership.test.ts already uses: source grep).
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderSlotValue } from "../../../supabase/functions/_shared/prose/slots.ts";
import { CPPA_RISK_SECTION_SHARDS } from "../../../supabase/functions/_shared/ltp/section-shards/cppa-risk.ts";

const ASSEMBLER = new URL(
  "../../../supabase/functions/_shared/ltp/pass2-assembler.ts",
  import.meta.url,
);

// ── FIX 1 ────────────────────────────────────────────────────────────────

Deno.test("ITEM 390 canary: two locked sentences render byte-identical, with casing", () => {
  // The exact shipped mangle: ITEM 319's locked pair fused into a lowercase
  // run-on ("…assessed activity recommended: marketing…").
  const first = "The secondary use diverges materially from the assessed activity.";
  const second = "Recommended: conduct a separate risk assessment for marketing look-alike modelling.";

  const a = renderSlotValue(first, { stem: "On this record, ", next: " ", isSentence: true });
  assertEquals(a, first, "locked sentence 1 must render byte-identical");

  // The boundary sentence 1 keeps is what lets sentence 2 hold its capital.
  const b = renderSlotValue(second, { stem: `On this record, ${a} `, next: "", isSentence: true });
  assertEquals(b, second, "locked sentence 2 must render byte-identical");

  const joined = `On this record, ${a} ${b}`;
  assert(joined.includes("assessed activity. Recommended:"), joined);
  assert(!/activity recommended:/.test(joined), `run-on mangle recurred: ${joined}`);
});

Deno.test("ITEM 390 canary: a sentence value keeps its capital even after a non-sentence stem", () => {
  // item264's factor line: "Fraud reduction: {{plan:factor_basis}}." — the
  // terminal mark is template-supplied, so the value is sentence-valued by
  // CONTRACT (the `_basis` slot class), not by its own trailing byte.
  const v = "The record states a 31% reduction in disputed transactions since deployment";
  const out = renderSlotValue(v, { stem: "Fraud reduction: ", next: ".", isSentence: true });
  assertEquals(out, v);
});

Deno.test("ITEM 390 canary: ITEM 337 fragment folding is byte-identical", () => {
  // Every case named in the slots.ts docstring — the authorized purpose.
  assertEquals(
    renderSlotValue("Directly from account signup", { stem: "collected from ", next: "." }),
    "account signup",
  );
  assertEquals(
    renderSlotValue("Deliver the service", { stem: "the data is used to ", next: "." }),
    "deliver the service",
  );
  assertEquals(
    renderSlotValue("Fixed period", { stem: "a criterion that ", next: "." }),
    "fixed period",
  );
  assertEquals(renderSlotValue("telemetry..", { stem: "including ", next: "" }), "telemetry");
  // Enum humanisation untouched.
  assertEquals(renderSlotValue("fixed_period", { stem: "a ", next: "." }), "fixed period");
});

// ── FIX 2 ────────────────────────────────────────────────────────────────

Deno.test("ITEM 390 canary: assembler has EXACTLY ONE report-write site", async () => {
  const src = await Deno.readTextFile(ASSEMBLER);
  const sites = [...src.matchAll(/\breport\[([^\]]+)\]\s*=/g)];
  assertEquals(
    sites.length,
    1,
    `LAW 3(a): expected 1 report[...] write site, found ${sites.length}: ` +
      sites.map((m) => m[0]).join(" | "),
  );
  assertEquals(sites[0][1].trim(), "shard.key");
});

Deno.test("ITEM 390 canary: methodology_note is registry-owned (LAW 2 iii)", () => {
  const shard = CPPA_RISK_SECTION_SHARDS.find((s) => s.key === "methodology_note");
  assert(shard, "methodology_note must be a registered shard");
  assertEquals(shard!.owner.kind, "deterministic");
});
