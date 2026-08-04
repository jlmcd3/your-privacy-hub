// MODEL A/B HARNESS — RESURRECTION MUST CARRY THE AMBIENT GENERATION MODEL.
//
// `resurrectGenerator` re-invokes a stalled resumable generator (dpia,
// cppa-admt) so the remaining units of a partially-written document finish.
// If the request body omits `generation_model`, the resurrected chain falls
// back to the DEFAULT model and the document becomes mixed-model while still
// being scored as the alternate arm. The slower model crosses the stale
// threshold more often, so the contamination is systematic, not random.
//
// This test drives the real function with a stubbed fetch and asserts the
// captured body, so any future edit that drops the field fails here.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  DEFAULT_GENERATION_MODEL,
  AB_ALT_GENERATION_MODEL,
  withGenerationModel,
} from "../../../supabase/functions/_shared/generation-model.ts";

// The module reads env at import time and calls Deno.serve at the bottom.
for (
  const [k, v] of [
    ["SUPABASE_URL", "http://stub.local"],
    ["SUPABASE_SERVICE_ROLE_KEY", "stub-service-key"],
    ["SUPABASE_ANON_KEY", "stub-anon-key"],
    ["ANTHROPIC_API_KEY", "stub-anthropic-key"],
  ]
) {
  if (!Deno.env.get(k)) Deno.env.set(k, v);
}

// Neutralise the server bootstrap so importing the module has no side effect.
// deno-lint-ignore no-explicit-any
(Deno as any).serve = () => ({
  finished: Promise.resolve(),
  shutdown: () => Promise.resolve(),
  ref: () => {},
  unref: () => {},
  addr: { transport: "tcp", hostname: "127.0.0.1", port: 0 },
});

const { resurrectGenerator } = await import(
  "../../../supabase/functions/run-quality-batch/index.ts"
);

const realFetch = globalThis.fetch;

async function captureBody(run: () => Promise<unknown>): Promise<{ url: string; body: string }> {
  let captured: { url: string; body: string } | null = null;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = (input: any, init: any) => {
    captured = { url: String(input), body: String(init?.body ?? "") };
    return Promise.resolve(new Response("ok", { status: 200 }));
  };
  try {
    await run();
  } finally {
    globalThis.fetch = realFetch;
  }
  assert(captured, "resurrectGenerator did not issue a request");
  return captured!;
}

Deno.test("resurrection inside a scope carries that scope's generation model", async () => {
  const { url, body } = await captureBody(() =>
    withGenerationModel(
      AB_ALT_GENERATION_MODEL,
      () => resurrectGenerator("dpia", "984f243e-0000-4000-8000-000000000000"),
    )
  );
  assert(url.endsWith("/functions/v1/run-dpia-framework"), `unexpected target: ${url}`);
  const parsed = JSON.parse(body);
  assertEquals(parsed.generation_model, AB_ALT_GENERATION_MODEL);
  assertEquals(parsed.dpia_id, "984f243e-0000-4000-8000-000000000000");
  assert(
    body.includes(`"generation_model":"${AB_ALT_GENERATION_MODEL}"`),
    "resurrection body must serialise generation_model",
  );
});

Deno.test("resurrection outside any scope carries the default model explicitly", async () => {
  const { body } = await captureBody(() =>
    resurrectGenerator("cppa-admt", "11111111-2222-4333-8444-555555555555")
  );
  const parsed = JSON.parse(body);
  assertEquals(parsed.generation_model, DEFAULT_GENERATION_MODEL);
  assertEquals(parsed.assessment_id, "11111111-2222-4333-8444-555555555555");
});
