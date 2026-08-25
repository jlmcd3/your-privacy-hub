// C1.2 (doc 67 §2, 2026-08-25) — the § 7120(a)-(b) audit-applicability
// table: predicate truth-table coverage, the doc-67-mandated metamorphic
// test (flip the revenue/consumer/SPI enums across their statutory
// boundaries and confirm the rendered determination moves by exactly the
// predicted delta), and end-to-end assembly gating (present under the
// flag, honestly absent — NO-PADDING law — without it).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCyberApplicabilityTable,
  resolveA1,
  resolveA2,
  resolveCyberApplicability,
  triAnd,
  triOr,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-applicability.ts";
import { assembleCyberSkeletonDocument } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble.ts";
import { CPPA_CYBER_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-cyber.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";

// ── Tri-state boolean algebra ────────────────────────────────────────────

Deno.test("triAnd/triOr — full 3x3 truth tables", () => {
  const vals = [true, false, null] as const;
  const expectedAnd: Record<string, boolean | null> = {
    "true,true": true, "true,false": false, "true,null": null,
    "false,true": false, "false,false": false, "false,null": false,
    "null,true": null, "null,false": false, "null,null": null,
  };
  const expectedOr: Record<string, boolean | null> = {
    "true,true": true, "true,false": true, "true,null": true,
    "false,true": true, "false,false": false, "false,null": null,
    "null,true": true, "null,false": null, "null,null": null,
  };
  for (const a of vals) for (const b of vals) {
    const key = `${a},${b}`;
    assertEquals(triAnd(a, b), expectedAnd[key], `triAnd(${a},${b})`);
    assertEquals(triOr(a, b), expectedOr[key], `triOr(${a},${b})`);
  }
});

// ── A1 — § 7120(b)(1) / § 1798.140(d)(1)(C) ─────────────────────────────

Deno.test("resolveA1 — unanswered q5_sell_share is indeterminate", () => {
  assertEquals(resolveA1({}).value, null);
});
Deno.test("resolveA1 — q5_sell_share=No resolves false without needing q5c", () => {
  assertEquals(resolveA1({ q5_sell_share: "No" }).value, false);
});
Deno.test("resolveA1 — sells/shares but q5c unanswered is indeterminate", () => {
  assertEquals(resolveA1({ q5_sell_share: "Yes — sell only" }).value, null);
  assertEquals(resolveA1({ q5_sell_share: "Yes — sell only", q5c_share_revenue_50pct: "Unsure" }).value, null);
});
Deno.test("resolveA1 — q5c=Yes/No resolve true/false", () => {
  assertEquals(resolveA1({ q5_sell_share: "Both", q5c_share_revenue_50pct: "Yes" }).value, true);
  assertEquals(resolveA1({ q5_sell_share: "Both", q5c_share_revenue_50pct: "No" }).value, false);
});

// ── A2 — § 7120(b)(2) ────────────────────────────────────────────────────

Deno.test("resolveA2 — revenue under $25M resolves false regardless of volume", () => {
  const r = resolveA2({ q1_revenue: "Under $25M", q2_consumers: "1,000,000 or more" });
  assertEquals(r.value, false);
});
Deno.test("resolveA2 — revenue over $25M but volume unanswered is indeterminate", () => {
  assertEquals(resolveA2({ q1_revenue: "Over $100M" }).value, null);
});
Deno.test("resolveA2 — revenue over $25M, both volume prongs resolved false, resolves false", () => {
  const r = resolveA2({
    q1_revenue: "Over $100M", q2_consumers: "100,000 to under 250,000", q15_sensitive_pi: "No",
  });
  assertEquals(r.value, false);
});
Deno.test("resolveA2 — true via consumer volume alone", () => {
  const r = resolveA2({ q1_revenue: "$50M to $100M", q2_consumers: "250,000 to under 1,000,000" });
  assertEquals(r.value, true);
});
Deno.test("resolveA2 — true via sensitive-PI volume alone", () => {
  const r = resolveA2({
    q1_revenue: "$25M to under $50M", q15_sensitive_pi: "Yes", q15c_spi_volume: "50,000 or more",
  });
  assertEquals(r.value, true);
});

// ── METAMORPHIC (doc 67 §2's own mandate for this class of test) —
// flip an enum across its statutory boundary and confirm the resolved
// value moves by exactly the predicted delta, nothing else changing. ────

Deno.test("METAMORPHIC — q1_revenue crossing the $25M gate flips A2 (all else held constant, over-threshold volume)", () => {
  const base = { q2_consumers: "1,000,000 or more" };
  const under = resolveA2({ ...base, q1_revenue: "Under $25M" });
  const over = resolveA2({ ...base, q1_revenue: "$25M to under $50M" });
  assertEquals(under.value, false);
  assertEquals(over.value, true);
});

Deno.test("METAMORPHIC — q2_consumers crossing the 250,000 line flips the volume prong (revenue held over $25M)", () => {
  const base = { q1_revenue: "Over $100M", q15_sensitive_pi: "No" };
  const under = resolveA2({ ...base, q2_consumers: "100,000 to under 250,000" });
  const over = resolveA2({ ...base, q2_consumers: "250,000 to under 1,000,000" });
  assertEquals(under.value, false);
  assertEquals(over.value, true);
});

Deno.test("METAMORPHIC — q15c_spi_volume crossing the 50,000 line flips the volume prong (revenue held over $25M, consumers held under 250k)", () => {
  const base = { q1_revenue: "Over $100M", q2_consumers: "Under 100,000", q15_sensitive_pi: "Yes" };
  const under = resolveA2({ ...base, q15c_spi_volume: "Fewer than 50,000" });
  const over = resolveA2({ ...base, q15c_spi_volume: "50,000 or more" });
  assertEquals(under.value, false);
  assertEquals(over.value, true);
});

Deno.test("METAMORPHIC — q5c_share_revenue_50pct crossing Yes/No flips A1 (q5_sell_share held constant)", () => {
  const base = { q5_sell_share: "Yes — share for advertising only" };
  const no = resolveA1({ ...base, q5c_share_revenue_50pct: "No" });
  const yes = resolveA1({ ...base, q5c_share_revenue_50pct: "Yes" });
  assertEquals(no.value, false);
  assertEquals(yes.value, true);
});

Deno.test("METAMORPHIC — auditRequired only moves when a trigger's OWN resolution moves; an untouched sibling never re-derives it", () => {
  // Holding A1 fixed at true, flip A2 across its gate — auditRequired stays
  // true throughout (A1 alone already carries it), proving triOr doesn't
  // spuriously re-derive from the wrong operand.
  const a1True = { q5_sell_share: "Both", q5c_share_revenue_50pct: "Yes" };
  const lo = resolveCyberApplicability({ ...a1True, q1_revenue: "Under $25M" });
  const hi = resolveCyberApplicability({ ...a1True, q1_revenue: "Over $100M", q2_consumers: "1,000,000 or more" });
  assertEquals(lo.auditRequired.value, true);
  assertEquals(hi.auditRequired.value, true);
  assertEquals(lo.a1.value, true);
  assertEquals(hi.a1.value, true);
});

// ── Rendered table shape ─────────────────────────────────────────────────

Deno.test("buildCyberApplicabilityTable — two rows, real header, non-empty note on every resolution state", () => {
  for (const profile of [
    {},
    { q1_revenue: "Under $25M", q2_consumers: "Under 100,000", q5_sell_share: "No", q15_sensitive_pi: "No" },
    { q1_revenue: "Over $100M", q2_consumers: "1,000,000 or more", q5_sell_share: "No", q15_sensitive_pi: "No" },
  ]) {
    const t = buildCyberApplicabilityTable(profile);
    assertEquals(t.columns.length, 3);
    assertEquals(t.rows.length, 2);
    assertEquals(t.rows[0][0], "A1 — § 7120(b)(1)");
    assertEquals(t.rows[1][0], "A2 — § 7120(b)(2)");
    assert(t.note && t.note.length > 0);
    assert(!t.hideHeader, "a real multi-column data table keeps its header (doc 66 Rule 1)");
  }
});

Deno.test("buildCyberApplicabilityTable — indeterminate cells name the SPECIFIC missing input, never a bare 'unknown'", () => {
  const t = buildCyberApplicabilityTable({});
  assert(t.rows[0][2].includes("has not stated whether it sells or shares"), t.rows[0][2]);
  assert(t.rows[1][2].includes("has not stated its annual gross revenue"), t.rows[1][2]);
});

// ── End-to-end assembly: flag gating (NO-PADDING law) ────────────────────

const PERFECT = CPPA_CYBER_GOLDEN.find((g) => g.id === "cyber-perfect-record")!;

Deno.test("assembleCyberSkeletonDocument — applicability table present under the flag, absent without it", () => {
  const report = buildCyberDeliverables(PERFECT.intake as Record<string, unknown>) as unknown as Record<string, unknown>;
  const intake = PERFECT.intake as Record<string, unknown>;

  const on = assembleCyberSkeletonDocument(report, intake, "", true);
  const onSection = on.document.sections.find((s) => s.id === "audit_scope")!;
  const onTable = onSection.paragraphs.find((p) => p.kind === "table");
  assert(onTable, "applicability table missing with the flag ON");

  const off = assembleCyberSkeletonDocument(report, intake, "", false);
  const offSection = off.document.sections.find((s) => s.id === "audit_scope")!;
  const offTable = offSection.paragraphs.find((p) => p.kind === "table");
  assertEquals(offTable, undefined, "applicability table rendered with the flag OFF — this must never ship live pre-C2");

  // Default (no 4th arg) matches flag-off — every existing call site that
  // doesn't pass the new parameter keeps today's behavior.
  const defaulted = assembleCyberSkeletonDocument(report, intake, "");
  const defaultedSection = defaulted.document.sections.find((s) => s.id === "audit_scope")!;
  assertEquals(defaultedSection.paragraphs.find((p) => p.kind === "table"), undefined);
});

Deno.test("assembleCyberSkeletonDocument — the ITEM-204 byte-pinned corpus block still renders (key shift audit_scope:1 -> audit_scope:2 didn't break the phase-in composition)", () => {
  const report = buildCyberDeliverables(PERFECT.intake as Record<string, unknown>) as unknown as Record<string, unknown>;
  const intake = PERFECT.intake as Record<string, unknown>;
  // buildPhaseInBlock() only composes when the excerpt contains a "(a)"
  // marker followed eventually by "\n(b)" — a realistic shape of the real
  // provision_texts excerpt, not the bare pinned_excerpt substring.
  const phaseInExcerpt =
    "(a) A business shall complete its first cybersecurity audit report no later than:\n" +
    "April 1, 2028, if the business's annual gross revenue for 2026 was more than $100,000,000.\n" +
    "(b) After April 1, 2030, ...";
  const result = assembleCyberSkeletonDocument(report, intake, phaseInExcerpt, true);
  const text = result.document.sections.flatMap((s) => s.paragraphs.map((p) => p.text ?? "")).join("\n");
  assert(
    text.includes("The customer, in consultation with qualified legal counsel, determines which tier"),
    "the ITEM-204 corpus block did not render after the block-index shift",
  );
});
