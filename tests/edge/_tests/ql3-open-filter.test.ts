// QL3-OPEN-1 pin: register with mixed statuses yields OPEN-only dummy set.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { selectOpenForRevision, BUILD_STAMP } from "../../../supabase/functions/ql3-orchestrator/index.ts";

Deno.test("QL3-OPEN-1 selectOpenForRevision — [open, resolved, not_resolved] → 1 open item", () => {
  const register = [
    { id: "gov-open-1",                 status: "open",         input_spec: { type: "enum" } },
    { id: "gov-dpo-status-unknown",     status: "resolved",     input_spec: { type: "enum" } },
    { id: "gov-transfer-mech-unknown",  status: "not_resolved", input_spec: { type: "enum" } },
  ];
  const picked = selectOpenForRevision(register);
  assertEquals(picked.length, 1, "exactly one dummy answer must be minted");
  assertEquals(picked[0].id, "gov-open-1");
  // items_before semantics (QL3-OPEN-1): count of OPEN items at dispatch.
  assertEquals(picked.length, 1);
});

Deno.test("QL3-OPEN-1 selectOpenForRevision — drops items missing id AND item_id", () => {
  const picked = selectOpenForRevision([
    { status: "open" },
    { id: "a", status: "open" },
    { item_id: "b", status: "open" },
  ]);
  assertEquals(picked.length, 2);
});

Deno.test("QL3-OPEN-1 selectOpenForRevision — 12-item bound preserved", () => {
  const register = Array.from({ length: 20 }, (_, i) => ({ id: `i-${i}`, status: "open" }));
  const picked = selectOpenForRevision(register);
  assertEquals(picked.length, 12);
});

Deno.test("QL3-OPEN-1 selectOpenForRevision — non-array yields []", () => {
  assertEquals(selectOpenForRevision(null).length, 0);
  assertEquals(selectOpenForRevision(undefined).length, 0);
  assertEquals(selectOpenForRevision({}).length, 0);
});

Deno.test("QL3-OPEN-1 BUILD_STAMP bumped", () => {
  assertEquals(BUILD_STAMP, "a91e37b4-rcP5-fixtures@2026-07-14T22:30Z");
});
