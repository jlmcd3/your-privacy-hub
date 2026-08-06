// ITEM 385 LEG 2 — LIA coverage matrix + generation-seam repairs.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  LIA_COVERAGE_LINKS,
  runCoverageMatrix,
} from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { LIA_PERFECT } from "../../../supabase/functions/_shared/golden/lia-perfect.ts";
import { buildLiaDeliverables } from "../../../supabase/functions/_shared/ltp/lia-deliverables/build.ts";
import { buildLiaUpgrade4 } from "../../../supabase/functions/_shared/ltp/lia-deliverables/build-upgrade4.ts";
import {
  hasBareEnum,
  openingCarriesFinding,
  proseLeaves,
} from "../../../supabase/functions/_shared/prose/risk-seam-lint.ts";

const INTAKE = LIA_PERFECT[0].intake as Record<string, unknown>;

function assembleLiaReport(intake: Record<string, unknown>): Record<string, unknown> {
  const core = buildLiaDeliverables(intake) as unknown as Record<string, unknown>;
  const up4 = buildLiaUpgrade4(intake) as unknown as Record<string, unknown>;
  return {
    classification: {
      text:
        `${String(intake.processing_description ?? "")} ${
          (intake.data_categories as string[] ?? []).join(", ")
        } ${(intake.jurisdictions as string[] ?? []).join(", ")}`,
    },
    ...core,
    ...up4,
  };
}

// ── coverage ───────────────────────────────────────────────────────────────

Deno.test("ITEM 385 — LIA_PERFECT assembles with ZERO coverage orphans", () => {
  const report = assembleLiaReport(INTAKE);
  const t = runCoverageMatrix("lia", report, INTAKE);
  assertEquals(t.crashed, false);
  assertEquals(
    t.orphans.length,
    0,
    `orphans: ${JSON.stringify(t.orphans, null, 2)}`,
  );
  assert(t.counts.links_checked > 0);
});

Deno.test("ITEM 385 — a supplied fact with an empty section is an HONEST orphan", () => {
  const report = assembleLiaReport(INTAKE);
  delete report.opt_out_feasibility;
  const t = runCoverageMatrix("lia", report, INTAKE);
  assert(
    t.orphans.some((o) => o.path === "opt_out_feasibility"),
    "the unlinked supplied fact was not detected",
  );
});

Deno.test("ITEM 385 — silence in the record is never an orphan", () => {
  const t = runCoverageMatrix("lia", {}, { organization_name: "Silent Ltd" });
  assertEquals(t.orphans.length, 0);
  assert(LIA_COVERAGE_LINKS.length >= 10);
});

// ── generation-seam repairs (a)…(d) ────────────────────────────────────────

Deno.test("SEAM (a) — lia_determination.why OPENS with the finding, not the statute", () => {
  const report = assembleLiaReport(INTAKE);
  const why = String((report.lia_determination as any).why ?? "");
  assert(why.length > 0);
  assert(openingCarriesFinding(why), `apparatus opener: ${why.slice(0, 120)}`);
  assertEquals(
    /^(The processing of personal data|Processing shall be lawful|Article 6)/.test(why),
    false,
    `the statute still opens the surface: ${why.slice(0, 120)}`,
  );
});

Deno.test("SEAM (b) — an authority field carries authority or is ABSENT", () => {
  const report = assembleLiaReport(INTAKE);
  for (const m of ((report.lia_determination as any).mitigations ?? []) as any[]) {
    if (!("authority_verbatim" in m)) continue;
    assert(
      String(m.authority_verbatim).trim().length > 0,
      "an empty authority_verbatim shipped as a fillable leaf",
    );
  }
});

Deno.test("SEAM (c) — the lawfulness sub-test reasons from SUBSTANCE, not the option value", () => {
  const report = assembleLiaReport(INTAKE);
  const legit = JSON.stringify(report.interest_legitimacy ?? {});
  assertEquals(
    /interest as other\b/i.test(legit),
    false,
    "prose reasoned from the stored enum value",
  );
  assert(
    legit.includes("fraud-prevention interest"),
    "prose did not reason from interest_type_other",
  );
});

Deno.test("SEAM (d) — the expectation answer is written, never quoted as a bare form value", () => {
  const report = assembleLiaReport(INTAKE);
  const re = JSON.stringify(report.reasonable_expectations ?? {});
  assertEquals(/answer on expectation is "/.test(re), false);
  assertEquals(/answer of ['"]Yes['"]/i.test(re), false);
});

// ── item384 seam lint on the LIA battery ───────────────────────────────────

// Machine leaves (determination/verdict/status/factor enums) and the asks,
// which legitimately name the intake key the reader must fill, are not prose.
const MACHINE_LEAF =
  /(rule_id|_id|anchor_keys|outcome|status|verdict|category|determination|factor|feasibility|default_position|information_needed|citation|id)$/;

Deno.test("SEAM LINT — no bare enum token reaches LIA prose", () => {
  const report = assembleLiaReport(INTAKE);
  const offenders = proseLeaves(report)
    .filter(({ path }) => !MACHINE_LEAF.test(path))
    .filter(({ value }) => hasBareEnum(value))
    .map(({ path, value }) => `${path}: ${value.slice(0, 90)}`);
  assertEquals(offenders, [], offenders.join("\n"));
});
