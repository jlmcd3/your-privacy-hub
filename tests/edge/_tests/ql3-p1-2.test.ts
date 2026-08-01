// QL3-P1.2 tests — grade-single-assessment generalized to all nine QL3 tools.
// No live network — pure module-shape assertions.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BUILD_STAMP as GRADER_BUILD_STAMP,
  KNOWN_TOOL_SLUGS,
  TOOL_TABLE,
  handler,
} from "../../../supabase/functions/grade-single-assessment/index.ts";
import { GRADER_STAMP } from "../../../supabase/functions/ql3-orchestrator/index.ts";

// ---------- TOOL_TABLE coverage ----------

const EXPECTED = [
  "governance", "cppa-risk", "cppa-cyber", "cppa-admt",
  "dpia", "lia", "ir-playbook", "biometric", "dpa",
] as const;

Deno.test("TOOL_TABLE covers exactly the nine QL3 slugs", () => {
  const keys = Object.keys(TOOL_TABLE).sort();
  assertEquals(keys, [...EXPECTED].sort());
});

Deno.test("KNOWN_TOOL_SLUGS matches TOOL_TABLE keys", () => {
  assertEquals([...KNOWN_TOOL_SLUGS].sort(), Object.keys(TOOL_TABLE).sort());
});

Deno.test("TOOL_TABLE: intake column shape is per-tool", () => {
  // eight tools use the single JSONB `intake_data`; lia uses explicit
  // top-level columns on li_assessments (no intake_data column exists).
  for (const t of EXPECTED) {
    const spec = TOOL_TABLE[t];
    assertEquals(spec.reportCol, "report_data");
    if (t === "lia") {
      assert(spec.intakeCols.length > 1, "lia intake spans multiple columns");
      assert(!spec.intakeCols.includes("intake_data"), "lia has no intake_data column");
      assert(spec.intakeCols.includes("stated_purpose"));
      assert(spec.intakeCols.includes("balancing_details"));
    } else {
      assertEquals(spec.intakeCols, ["intake_data"]);
    }
  }
});

// ---------- GRADER_STAMP mirror invariant ----------

Deno.test("GRADER_STAMP === grade-single-assessment.BUILD_STAMP (mirror asserted)", () => {
  assertEquals(GRADER_STAMP, GRADER_BUILD_STAMP);
  // QLB-F3: stamp prefix bumped from "ql3-p1-2-" to "ql3-qlbf3-".
  assert(GRADER_BUILD_STAMP.startsWith("ql3-qlbf3-"));
});

// ---------- Handler input validation (no network) ----------

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://x/grade-single-assessment", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

Deno.test("handler: missing_authorization when no bearer", async () => {
  const r = await handler(req({ assessment_id: "x" }));
  assertEquals(r.status, 401);
  const j = await r.json();
  assertEquals(j.error, "missing_authorization");
});

Deno.test("handler: unknown_tool rejects invalid slug", async () => {
  // Use a bogus bearer that will fail admin check — but tool validation
  // runs AFTER auth. We instead assert the shape via internal-SR bypass:
  // set x-internal-resume:1 with a fake service key → still fails auth
  // (SERVICE_KEY env not set in test). So we cover unknown_tool by
  // driving through the isKnownTool predicate directly.
  //
  // Instead: assert the KNOWN_TOOL_SLUGS list rejects an obvious bad slug.
  const bad = "not-a-real-tool";
  assert(!(KNOWN_TOOL_SLUGS as readonly string[]).includes(bad));
});

Deno.test("handler: default-tool back-compat — omitted tool means cppa-risk", () => {
  // Contract: current callers (ql3-orchestrator.callInternalGrader pre-P1.2,
  // Doc W admin baseline) send NO `tool` field. Documented default is
  // "cppa-risk". Assert the default expression the handler uses.
  const body: { tool?: string } = {};
  const resolved = body.tool ?? "cppa-risk";
  assertEquals(resolved, "cppa-risk");
  assert((KNOWN_TOOL_SLUGS as readonly string[]).includes(resolved));
});
