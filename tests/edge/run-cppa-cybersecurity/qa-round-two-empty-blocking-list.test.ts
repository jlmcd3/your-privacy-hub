// QA round two (CY-A-01 / CY-B-02, Low, 2026-09-06) — the Cyber executive
// summary printed the literal sentence "The blocking components are: ." with
// nothing after the colon.
//
// "not_ready" is reached by ANY of three independent triggers (build.ts ~858):
// a blocking § 7123(c) component, a failed § 7122 independence condition, or
// failed § 7123(b)(3) enforcement evidence. Both the headline and the reasoning
// nevertheless always asserted the component clause, so a record whose ONLY
// failure was the auditor's independence — customer A's exact record, where the
// report correctly identified the absent independent auditor — emitted an empty
// list and a "zero components" count.
//
// This is the same defect the record_insufficient branch immediately below it
// had already been fixed for (2026-08-25, "0 § 7123(c) components are not
// assessable"); it simply had not been applied to the not_ready branch.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { CYBER_7123_COMPONENTS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/components.ts";

/**
 * Every component implemented and evidenced — so nothing blocks on § 7123(c) —
 * with an internal auditor reporting to the executive who owns the programme,
 * which is the arrangement § 7122 forbids. not_ready via independence alone.
 */
function independenceOnlyIntake(): Record<string, unknown> {
  return {
    profile: {
      entity_name: "Northwind Testing, Inc.",
      industry: "Retail",
      framework: "NIST CSF",
      last_audit: "Never",
      incidents_12mo: "0",
      auditor_engagement_status:
        "Internal auditor engaged, reports to the executive responsible for the cybersecurity program",
      q1_revenue: "Under $25M",
      q5_sell_share: "No",
    },
    controls: CYBER_7123_COMPONENTS.map((c) => ({
      key: c.slug,
      label: c.label,
      maturity: "Implemented across organization",
      notes: "Operating across the managed estate.",
      evidence: ["Configuration export", "Sample log"],
    })),
  };
}

/** Same record, but one component is not implemented — a real blocking list. */
function blockingComponentIntake(): Record<string, unknown> {
  const intake = independenceOnlyIntake();
  const controls = intake.controls as Array<Record<string, unknown>>;
  controls[0] = { ...controls[0], maturity: "Not implemented", evidence: [] };
  return intake;
}

Deno.test("CY-A-01 — no blocking component: the summary never emits an empty list", () => {
  const d = buildCyberDeliverables(independenceOnlyIntake());
  assertEquals(d.readiness_determination.conclusion, "not_ready");
  assertEquals(d.readiness_determination.blocking_components.length, 0);

  const { headline, reasoning } = d.readiness_determination;
  const text = `${headline}\n${reasoning}`;

  // The reported symptom, exactly.
  assert(!text.includes("The blocking components are: ."), "still emits the empty blocking-component sentence");
  assert(!/blocking components are:\s*\.?$/m.test(text), "blocking-component list is present but empty");
  // And no "zero components would be reported as not implemented" count.
  assert(
    !/\b(zero|no)\s+§ 7123\(c\) components? would be reported as not implemented/i.test(headline),
    `headline still counts a component clause that does not apply: ${headline}`,
  );
  // The finding that DOES hold must still be stated.
  assert(/§ 7122/.test(text), "the § 7122 independence failure must still be reported");
  assert(!text.includes(": ."), "a list lead-in was left with nothing after it");
});

Deno.test("CY-A-01 — a real blocking component still names itself", () => {
  const d = buildCyberDeliverables(blockingComponentIntake());
  assertEquals(d.readiness_determination.conclusion, "not_ready");
  assert(d.readiness_determination.blocking_components.length > 0);

  const { headline, reasoning } = d.readiness_determination;
  assert(
    reasoning.includes("The blocking components are:"),
    "the component list must still be printed when there is one",
  );
  assert(
    reasoning.includes(CYBER_7123_COMPONENTS[0].label),
    "the unimplemented component must be named",
  );
  // Both clauses apply here, so both are stated, as before.
  assert(headline.includes("§ 7123(c) component"), "the component count clause is missing");
  assert(headline.includes("§ 7122"), "the independence clause is missing");
  assert(!reasoning.includes(": ."), "a list lead-in was left with nothing after it");
});
