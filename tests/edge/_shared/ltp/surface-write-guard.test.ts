import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  assertSurfaceWriteAllowed,
  SurfaceWriteGuardError,
  SURFACE_WRITE_GUARD_VERSION,
} from "../../../../supabase/functions/_shared/ltp/surface-write-guard.ts";

Deno.test("surface-write-guard: version stamp", () => {
  assertEquals(
    SURFACE_WRITE_GUARD_VERSION.startsWith("surface-write-guard@2026-07-27+risk-surface-map"),
    true,
  );
});

Deno.test("surface-write-guard: allowed template on owned surface passes", () => {
  assertSurfaceWriteAllowed({
    path: "risk_assessment_by_activity[0].benefits_outweigh_risks_rationale",
    template: "T.risk.balance.hedged",
  });
});

Deno.test("surface-write-guard: cohort template into submission_summary is allowed", () => {
  assertSurfaceWriteAllowed({
    path: "submission_summary",
    template: "T.risk.cohort",
  });
});

Deno.test("surface-write-guard: cohort into cross_tool_recommendations is CUT-rejected (the A.i bug)", () => {
  const err = assertThrows(
    () =>
      assertSurfaceWriteAllowed({
        path: "cross_tool_recommendations",
        template: "T.risk.cohort",
      }),
    SurfaceWriteGuardError,
  );
  assertEquals(err.reason, "cut");
});

Deno.test("surface-write-guard: unowned path rejects", () => {
  const err = assertThrows(
    () =>
      assertSurfaceWriteAllowed({
        path: "made_up_surface",
        template: "T.risk.balance.firm",
      }),
    SurfaceWriteGuardError,
  );
  assertEquals(err.reason, "unowned");
});

Deno.test("surface-write-guard: wrong template on owned surface rejects", () => {
  const err = assertThrows(
    () =>
      assertSurfaceWriteAllowed({
        // opening_summary is deterministic-only; a balance template must not write here.
        path: "opening_summary",
        template: "T.risk.balance.firm",
      }),
    SurfaceWriteGuardError,
  );
  assertEquals(err.reason, "template-not-allowed");
});

Deno.test("surface-write-guard: token-list on adverse_effects passes", () => {
  assertSurfaceWriteAllowed({
    path: "risk_assessment_by_activity[2].adverse_effects",
    template: "token-list",
  });
});
