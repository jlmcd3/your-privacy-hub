import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  assertCreatedByIsRealUser,
  CreatedByGuardError,
  CREATED_BY_GUARD_VERSION,
} from "../../../../supabase/functions/quality-batch-orchestrator/_local/harness/created-by-guard.ts";

const REAL = "02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122";
const alwaysTrue = async (_id: string) => true;
const alwaysFalse = async (_id: string) => false;

Deno.test("created-by-guard: version stamp", () => {
  assertEquals(CREATED_BY_GUARD_VERSION, "created-by-guard@2026-07-27");
});

Deno.test("created-by-guard: rejects malformed UUID (§25)", async () => {
  const err = await assertRejects(
    () => assertCreatedByIsRealUser("not-a-uuid", alwaysTrue),
    CreatedByGuardError,
  );
  assertEquals(err.code, "malformed");
});

Deno.test("created-by-guard: rejects nil UUID (§25)", async () => {
  const err = await assertRejects(
    () =>
      assertCreatedByIsRealUser("00000000-0000-0000-0000-000000000000", alwaysTrue),
    CreatedByGuardError,
  );
  assertEquals(err.code, "nil");
});

Deno.test("created-by-guard: rejects well-formed but unknown UUID (§19)", async () => {
  const err = await assertRejects(
    () => assertCreatedByIsRealUser(REAL, alwaysFalse),
    CreatedByGuardError,
  );
  assertEquals(err.code, "unknown");
});

Deno.test("created-by-guard: accepts real admin UUID", async () => {
  const returned = await assertCreatedByIsRealUser(REAL, alwaysTrue);
  assertEquals(returned, REAL);
});

Deno.test("created-by-guard: rejects non-string input", async () => {
  await assertRejects(
    () => assertCreatedByIsRealUser(undefined, alwaysTrue),
    CreatedByGuardError,
  );
  await assertRejects(
    () => assertCreatedByIsRealUser(null, alwaysTrue),
    CreatedByGuardError,
  );
});
