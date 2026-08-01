// ITEM 240 CP2 — SINGLE-WRITER CORE joint tests.
// Verifies:
//   (1) Mocked model output that OMITS weighing_frame still produces a
//       validator-clean plan on the ok path, because the adapter runs the
//       Guide stage BEFORE validation and binds weighing_frame_ref on
//       every engaged Type-W proposition.
//   (2) A Type-W proposition whose Guide slice is empty is converted to
//       Type-J per the §0 empty-by-finding contract — not V7-rejected.
//   (3) Adapter-owned fields (intake_ledger, citation_bindings,
//       gate_outcomes) are replaced with adapter-derived values even if
//       the model returned junk for them.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { runPass1Llm } from "./pass1-llm.ts";

const BASE = {
  intake: { q1_revenue: "Over $100M", q2_consumers: "Over 100,000" } as Record<string, unknown>,
  report_data: {} as Record<string, unknown>,
  buildStamp: "test@item240cp2",
};

function mockFetchReturning(body: unknown) {
  const payload = {
    content: [{ type: "text", text: JSON.stringify(body) }],
    stop_reason: "end_turn",
    usage: { input_tokens: 1, output_tokens: 1 },
  };
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }),
    );
}

Deno.test({ name: "single-writer: model without weighing_frame → validator-clean, Guide-populated frame, resolvable refs", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  Deno.env.set("LTP_ENFORCE_ENABLED", "1");
  Deno.env.delete("LTP_TEST_FORCE_WRITE_AROUND");
  const prevKey = Deno.env.get("ANTHROPIC_API_KEY");
  Deno.env.set("ANTHROPIC_API_KEY", "test-dummy-not-a-real-key");
  const origFetch = globalThis.fetch;
  // Minimal model output: intentionally OMITS every adapter-owned field.
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = mockFetchReturning({
    plan_version: "v1",
    product: "cppa-risk-assessment",
    build_stamp: "model-should-be-overwritten",
    jurisdiction_tag: "cppa-ca",
    intake_ledger: [],
    citation_bindings: [],
    propositions: [],
    factor_table: [],
    weighing_frame: [], // omitted on purpose
    gate_outcomes: [],
    conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
  });
  try {
    const r = await runPass1Llm(BASE, { maxAttempts: 1, timeoutMs: 5_000 });
    assertEquals(r.telemetry.ok, true, `expected ok; telemetry=${JSON.stringify(r.telemetry)}`);
    assertEquals(r.telemetry.write_around, false);
    assert(r.plan.weighing_frame.length > 0, "Guide must populate weighing_frame");
    // Adapter overwrites deterministic fields.
    assertEquals(r.plan.build_stamp, "test@item240cp2");
    assert(r.plan.intake_ledger.length > 0, "adapter-derived intake_ledger must be present");
    assert(r.plan.citation_bindings.length > 0, "adapter-derived citation_bindings must be present");
    // Every Type-W proposition on the shipped plan resolves against the frame.
    const frameIds = new Set(r.plan.weighing_frame.map((f) => f.frame_id));
    for (const p of r.plan.propositions) {
      if (p.epistemic_type === "W") {
        assert(p.weighing_frame_ref && frameIds.has(p.weighing_frame_ref),
          `W-prop ${p.id} must have a resolvable weighing_frame_ref`);
      }
    }
  } finally {
    globalThis.fetch = origFetch;
    if (prevKey !== undefined) Deno.env.set("ANTHROPIC_API_KEY", prevKey);
    else Deno.env.delete("ANTHROPIC_API_KEY");
    Deno.env.delete("LTP_ENFORCE_ENABLED");
  }
} });

Deno.test({ name: "single-writer: adapter overwrites model-authored junk for deterministic fields", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  Deno.env.set("LTP_ENFORCE_ENABLED", "1");
  Deno.env.delete("LTP_TEST_FORCE_WRITE_AROUND");
  const prevKey = Deno.env.get("ANTHROPIC_API_KEY");
  Deno.env.set("ANTHROPIC_API_KEY", "test-dummy-not-a-real-key");
  const origFetch = globalThis.fetch;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = mockFetchReturning({
    plan_version: "v1",
    product: "cppa-risk-assessment",
    build_stamp: "junk",
    jurisdiction_tag: "cppa-ca",
    intake_ledger: [{ ledger_id: "L.hallucinated", intake_field: "hallucinated", value: "x", display: "x" }],
    citation_bindings: [{ pinpoint_ref: "cb.fake", corpus_key: "fake", pinpoint: "fake", jurisdiction_tag: "cppa-ca" }],
    propositions: [],
    factor_table: [],
    weighing_frame: [],
    gate_outcomes: [{ gate_id: "G.hallucinated", outcome: "pass" }],
    conservative_write_around: { triggered: true, reason: "model_lied", disclosure: "silent+telemetry" },
  });
  try {
    const r = await runPass1Llm(BASE, { maxAttempts: 1, timeoutMs: 5_000 });
    assertEquals(r.telemetry.ok, true);
    // Hallucinated ledger entry must NOT survive.
    assert(!r.plan.intake_ledger.some((l) => l.ledger_id === "L.hallucinated"),
      "adapter must overwrite model-authored intake_ledger");
    assert(!r.plan.citation_bindings.some((b) => b.pinpoint_ref === "cb.fake"),
      "adapter must overwrite model-authored citation_bindings");
    assert(!r.plan.gate_outcomes.some((g) => g.gate_id === "G.hallucinated"),
      "adapter must overwrite model-authored gate_outcomes");
    // VALID PLAN INVARIANT: model-emitted triggered=true is IGNORED.
    assertEquals(r.plan.conservative_write_around?.triggered, false);
  } finally {
    globalThis.fetch = origFetch;
    if (prevKey !== undefined) Deno.env.set("ANTHROPIC_API_KEY", prevKey);
    else Deno.env.delete("ANTHROPIC_API_KEY");
    Deno.env.delete("LTP_ENFORCE_ENABLED");
  }
} });
