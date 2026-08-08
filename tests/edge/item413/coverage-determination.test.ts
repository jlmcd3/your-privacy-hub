// ITEM 413 §2 — THE COVERAGE DETERMINATION, WITH ITS EVIDENCE ENCODED.
//
// ANSWER: coverage is NOT vacuous for registration and IS wired. The two
// evidenced drop paths are asserted mechanically below, so the determination
// cannot rot into folklore:
//
//   E1  `cross_border_transfers` is declared on the form and on the engine's
//       IntakeData and is read by NO emission path. Asserted by scanning the
//       product's own sources.
//   E2  `filing_*` answers are dropped whenever no US state is in scope,
//       because `buildRegistrationDeliverables` gates `filing_readiness` on
//       `stateInScope` AND on verdict. Asserted by assembling a UK/EU-only
//       record and reading the coverage telemetry.
//
// And the counter-assertion that makes the matrix worth having: on a
// perfect-shaped record, every link that is not one of the above resolves.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { REGISTRATION_LINKED_INTAKE_KEYS } from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { assembleRegistrationReport, PERFECT_INTAKE } from "./_assemble.ts";

const SRC_ROOT = new URL(
  "../../../supabase/functions/run-registration-assessment/",
  import.meta.url,
);

const SOURCES = [
  "index.ts",
  "_local/registration-engine.ts",
  "_local/ltp/registration-deliverables/build.ts",
];

async function productSource(): Promise<string> {
  const parts: string[] = [];
  for (const rel of SOURCES) {
    parts.push(await Deno.readTextFile(new URL(rel, SRC_ROOT)));
  }
  return parts.join("\n");
}

Deno.test("E1 — cross_border_transfers has NO emission path in this product", async () => {
  const src = await productSource();
  // Any read would take one of these forms. A comment mentioning the key is
  // not a read, so comment lines are stripped first.
  const code = src
    .split("\n")
    .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
    .join("\n");
  const reads = [
    /intake\.cross_border_transfers/,
    /intake\[["']cross_border_transfers["']\]/,
    /\.cross_border_transfers\b/,
  ].filter((re) => re.test(code));
  assertEquals(
    reads.length,
    0,
    "cross_border_transfers now HAS an emission path — remove its no-emission-path coverage link and record the new surface.",
  );
});

Deno.test("E1 — supplying cross_border_transfers therefore orphans", () => {
  const { coverage } = assembleRegistrationReport(PERFECT_INTAKE);
  const orphan = coverage.orphans.find((o) => o.detail.includes("cross_border_transfers"));
  assert(orphan, `expected a no-emission-path orphan, got ${JSON.stringify(coverage.orphans)}`);
  assertEquals(orphan!.type, "supplied_fact_with_no_emission_path");
});

Deno.test("E2 — filing_* answers are dropped when no US state is in scope", () => {
  const ukOnly: Record<string, unknown> = {
    ...PERFECT_INTAKE,
    organization_country: "GB",
    markets_served: ["GB", "DE"],
    acts_as_data_broker: false,
    sells_or_licenses_brokered_data: false,
    collects_data_not_directly_from_individuals: false,
    has_uk_establishment: true,
  };
  const { report, coverage } = assembleRegistrationReport(ukOnly);
  const fr = (report.registration_deliverables as Record<string, unknown>).filing_readiness;
  assertEquals(Array.isArray(fr) ? fr.length : -1, 0, "expected no filing_readiness rows");
  const orphan = coverage.orphans.find((o) => o.path === "registration_deliverables.filing_readiness");
  assert(
    orphan,
    `five filing_* answers were supplied and dropped, yet coverage was silent: ${
      JSON.stringify(coverage.orphans)
    }`,
  );
});

Deno.test("a perfect-shaped US record leaves only the known no-emission-path orphan", () => {
  const { coverage } = assembleRegistrationReport(PERFECT_INTAKE);
  const unexpected = coverage.orphans.filter(
    (o) => o.type !== "supplied_fact_with_no_emission_path",
  );
  assertEquals(unexpected.length, 0, JSON.stringify(unexpected, null, 2));
  assertEquals(coverage.unused_intake_facts.length, 0, coverage.unused_intake_facts.join(", "));
  assert(coverage.counts.links_checked >= 8, `only ${coverage.counts.links_checked} links checked`);
  assertEquals(coverage.crashed, false, coverage.error ?? "");
});

Deno.test("no ask is raised against a fact the record supplies", () => {
  const { coverage } = assembleRegistrationReport(PERFECT_INTAKE);
  const bad = coverage.orphans.filter((o) => o.type === "ask_against_supplied_fact");
  assertEquals(bad.length, 0, JSON.stringify(bad, null, 2));
});

Deno.test("every form key the product reads is anchored in the link config", () => {
  // The link config must not silently narrow: each key it names is a real form
  // key, and the keys with a known emission path are all present.
  const mustBeLinked = [
    "filing_contact_details_ready",
    "acts_as_data_broker",
    "has_eu_establishment",
    "has_uk_establishment",
    "employee_count",
    "approved_by_name",
    "markets_served",
    "cross_border_transfers",
  ];
  for (const k of mustBeLinked) {
    assert(REGISTRATION_LINKED_INTAKE_KEYS.includes(k), `${k} is not linked`);
  }
});
