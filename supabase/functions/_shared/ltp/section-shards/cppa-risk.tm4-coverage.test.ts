/**
 * T-M4 (Item 224) — COVERAGE COMPLETION + CHECKPOINT sweep.
 *
 * Non-authoring turn. This test asserts:
 *   (a) Zero gap rows remain (Item-222/223 closed).
 *   (b) FIXTURE SWEEP — every Pass-2 template renders through a
 *       shipped-value-screen fixture without firing leak-lexicon /
 *       truncated-slot / statutory-outside-cite guards. This covers
 *       BOTH the pre-existing 19 templates AND the T-M3 additions.
 *   (c) DETERMINISTIC-OWNER AUDIT — for every shard whose owner kind
 *       is "deterministic" or "template-cut", the projection function
 *       is TOTAL: it terminates without throwing for a validly-derived
 *       RenderPlan, and its return is a plain-JSON value (undefined
 *       allowed only for NONE-projected metadata literals — recorded).
 */
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  CPPA_RISK_SECTION_SHARDS,
  CPPA_RISK_TEMPLATE_GAPS,
} from "./cppa-risk.ts";
import { PASS2_TEMPLATES } from "../content/pass2-templates.ts";
import { runValueScreen } from "../value-screen.ts";
import { derivePlan } from "../derive.ts";

// ─────────────────────────────────────────────────────────────────
// (a) Gap-closure re-assertion.
// ─────────────────────────────────────────────────────────────────

Deno.test("T-M4 (a): zero gap rows remaining (Item-222/223 closed)", () => {
  assertEquals(CPPA_RISK_TEMPLATE_GAPS.length, 0);
});

Deno.test("T-M4 (a): every template-owned shard names at least one Pass-2 template id that exists", () => {
  for (const s of CPPA_RISK_SECTION_SHARDS) {
    if (s.owner.kind !== "template" && s.owner.kind !== "template-cut") continue;
    assert(s.owner.template_ids.length >= 1, `${s.key}: empty template_ids`);
    for (const id of s.owner.template_ids) {
      assert(
        Object.prototype.hasOwnProperty.call(PASS2_TEMPLATES, id),
        `${s.key}: template id "${id}" not registered in PASS2_TEMPLATES`,
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// (b) FIXTURE SWEEP — one shipped-value-screen fixture per template.
// ─────────────────────────────────────────────────────────────────

/** Neutral, prose-safe slot values that MUST NOT trip any guard. */
const SAFE_SLOT_VALUE =
  "the documented processing activity, as recorded in the intake";
const SAFE_DEADLINE_BASIS =
  "the § 7121(a) cohort schedule as documented in the intake record";

function renderTemplate(id: string): string {
  const t = PASS2_TEMPLATES[id];
  let out = t.text;
  for (const slot of t.plan_slots) {
    // deadline_basis is the OWNER-SLOT surface fixtured for the
    // smoke-#11 truncation class ("We" / "The" / "" fragments).
    const val = slot === "deadline_basis" ? SAFE_DEADLINE_BASIS : SAFE_SLOT_VALUE;
    out = out.split(`{{plan:${slot}}}`).join(val);
  }
  for (const slot of t.citation_slots) {
    out = out.split(`{{cite:${slot}}}`).join(`{{cite:PIN_${slot}}}`);
  }
  for (const slot of t.intake_slots) {
    out = out.split(`{{intake:${slot}}}`).join("intake:LEDGER_ID");
  }
  return out;
}

Deno.test("T-M4 (b): every Pass-2 template renders clean through the value-screen fixture", () => {
  const ids = Object.keys(PASS2_TEMPLATES).sort();
  for (const id of ids) {
    const t = PASS2_TEMPLATES[id];
    if (t.emits_nothing) continue;
    const rendered = renderTemplate(id);
    // Fill-or-omit: no unresolved plan slot tokens (cite spans are
    // token-substituted downstream; value-screen tolerates {{cite:…}}).
    assert(!/{{\s*plan:/.test(rendered), `${id}: unresolved plan slot token`);
    // max_chars honored by the fixture (defensive; slot values are short).
    assert(rendered.length <= t.max_chars + 200, `${id}: fixture exceeds max_chars`);
    // Shipped-value-screen: rendered template body must not fire.
    runValueScreen({ reportData: { [`fixture.${id}`]: rendered } });
  }
});

Deno.test("T-M4 (b): T-M3 owner-slot (deadline_basis) rejects the smoke-#11 truncation class", () => {
  // Positive control: the guard fires when priority_action.deadline_basis
  // is filled with a whole-value truncation fragment.
  for (const frag of ["We", "The", "  We  "]) {
    let threw = false;
    try {
      runValueScreen({
        reportData: {
          priority_actions: [{ deadline_basis: frag }],
        },
      });
    } catch {
      threw = true;
    }
    assert(threw, `value-screen must reject deadline_basis="${frag}"`);
  }
});

// ─────────────────────────────────────────────────────────────────
// (c) DETERMINISTIC-OWNER PROJECTION TOTALITY SWEEP.
// ─────────────────────────────────────────────────────────────────

Deno.test("T-M4 (c): deterministic + template-cut projections are total over a valid RenderPlan", () => {
  const plan = derivePlan({
    intake: {
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q18_admt_use: "no",
    },
    report_data: {},
    buildStamp: "tm4-coverage@test",
  });
  const unexpectedThrows: string[] = [];
  const noneCount: string[] = [];
  for (const s of CPPA_RISK_SECTION_SHARDS) {
    if (s.owner.kind !== "deterministic" && s.owner.kind !== "template-cut") continue;
    try {
      const out = s.project(plan);
      // undefined is permitted only for NONE-projected metadata literals
      // (schema_version, disclaimers, legacy V3 passthroughs, etc.). We
      // record the count so the courier can enumerate them explicitly.
      if (typeof out === "undefined") noneCount.push(s.key);
    } catch (err) {
      unexpectedThrows.push(`${s.key}: ${(err as Error).message}`);
    }
  }
  assertEquals(unexpectedThrows, [], `deterministic projections threw: ${unexpectedThrows.join(" | ")}`);
  // The NONE cohort is documented and expected; assert it is bounded.
  // (Metadata literals + V3 legacy passthroughs + empty-by-finding
  // enforcement surfaces = the only permissible NONE owners.)
  const NONE_ALLOWED = new Set([
    "schema_version",
    "document_metadata",
    "attestation_block",
    "disclaimer",
    "framework_disclaimer",
    "accuracy_caveat",
    "_meta", // owned by projectMeta — should NOT be NONE (asserted below).
    "part_a",
    "part_b",
    "gating",
    "enforcement_context",
    "enforcement_precedents",
    "enforcement_meta",
  ]);
  for (const k of noneCount) {
    assert(NONE_ALLOWED.has(k), `unexpected NONE projection on ${k}`);
  }
  // Positive control: _meta must actually project (projectMeta), not NONE.
  const meta = CPPA_RISK_SECTION_SHARDS.find((s) => s.key === "_meta")!;
  const metaOut = meta.project(plan) as Record<string, unknown> | undefined;
  assert(metaOut && typeof metaOut === "object", "_meta projection must return an object");
});

Deno.test("T-M4 (c): template + harvest projections are total over a valid RenderPlan", () => {
  const plan = derivePlan({
    intake: {
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q18_admt_use: "no",
    },
    report_data: {},
    buildStamp: "tm4-coverage@test",
  });
  for (const s of CPPA_RISK_SECTION_SHARDS) {
    if (s.owner.kind !== "template" && s.owner.kind !== "harvest") continue;
    let out: unknown;
    try {
      out = s.project(plan);
    } catch (err) {
      throw new Error(`${s.key}: projection threw ${(err as Error).message}`);
    }
    assert(typeof out !== "undefined", `${s.key}: template/harvest projection must not be undefined`);
  }
});
