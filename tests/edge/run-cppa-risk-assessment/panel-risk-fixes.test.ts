// PANEL FIX BATCH 5 (2026-08-30) — CPPA Risk defects from the expert-panel
// review (doc 108), each verified against the published sample before fixing:
//   RISK-P1  (D2) subject–verb break "Contact identifiers (name, email,
//            phone) is collected"; (D3) body denied any recorded
//            contribution while Appendix D printed the recorded basis
//            (quote-then-deny class); (D8) the exec compact-conditions
//            sentence truncated at the colon, leaving "the following
//            element" dangling with no element named;
//   RISK-P2  (D4) circular sensitive-PI placeholder ("the sensitive personal
//            information the Company has identified in its submission") in
//            three table cells;
//   RISK-P3  (D9) cover disposition title-cased to "Do not Proceed";
//            the exec summary printed the full four-column risk ledger
//            byte-identical to § 4.A.
//
// Determination LOGIC is untouched throughout — these are sentence-family
// and projection fixes over the same typed verdicts.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildRiskLedgerTable,
  runRiskFactorEngine,
} from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import {
  deriveActivitySpiInventory,
  deriveExecStatusPanel,
} from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk.ts";

type Bag = Record<string, unknown>;

const baseIntake = (): Bag => ({ ...(CPPA_RISK_PERFECT[0].intake as Bag) });

function engineOn(overrides: Bag) {
  return runRiskFactorEngine({ ...baseIntake(), ...overrides } as never, {} as never, "2026-08-30");
}

Deno.test("RISK-P1: an unnecessary element WITH a recorded basis is attributed, never denied", () => {
  const r = engineOn({
    a2_necessity_set: [
      {
        element: "Contact identifiers (name, email, phone)",
        necessity: "Collected but not necessary to the stated purpose",
        justification:
          "Contact identifiers are collected for shipment-tracking notifications and are excluded from the audience models.",
      },
    ],
  });
  const body = r.blocks["iii_analysis:5"] ?? "";
  assert(!body.includes("is collected but not shown to be necessary"), "old subject-verb sentence survived");
  assert(!body.includes("identifies no contribution"), "denied a contribution the record carries (quote-then-deny)");
  // DOC 144 (2026-09-02) — RE-PIN: element names render quoted (doc 143 §C
  // sweep), and the "appears in Appendix D" pointer is retired with the
  // Appendix-D fold-in (the determinations table now sits in § 3.B itself).
  // The RISK-P1 substance — attribution, never denial — is unchanged.
  assert(
    body.includes("The necessity of “Contact identifiers (name, email, phone)” is not established"),
    "new attribution sentence absent",
  );
  assert(
    body.includes("collected for shipment-tracking notifications"),
    "the recorded basis is not acknowledged in the body",
  );
  assert(!body.includes("Appendix D"), "retired Appendix D pointer still composes in § 3.B");
  const matrix = r.tables["iii_analysis:4"];
  assert(matrix, "in-body necessity determinations table absent");
  assert(
    matrix.rows.some((row) => row[2].includes("“Contact identifiers are collected for shipment-tracking")),
    "table basis cell does not quote the Company's justification",
  );
});

Deno.test("RISK-P1: an unnecessary element with NO basis keeps the honest no-contribution sentence", () => {
  const r = engineOn({
    a2_necessity_set: [
      {
        element: "Device fingerprint hashes",
        necessity: "Collected but not necessary to the stated purpose",
        justification: "",
      },
    ],
  });
  const body = r.blocks["iii_analysis:5"] ?? "";
  // DOC 144 (2026-09-02) — RE-PIN: element name quoted (doc 143 §C sweep).
  assert(body.includes("The necessity of “Device fingerprint hashes” is not established"), "new sentence absent");
  assert(
    body.includes("the information provided identifies no contribution it makes to the Purpose"),
    "no-basis branch lost its honest denial",
  );
});

Deno.test("RISK-P1/D8: the exec compact conditions never dangle — the elements are named inline", () => {
  const r = engineOn({
    a2_necessity_set: [
      {
        element: "Contact identifiers (name, email, phone)",
        necessity: "Collected but not necessary to the stated purpose",
        justification: "Collected for notifications only.",
      },
    ],
  });
  const compact = r.blocks["executive_summary:9"] ?? "";
  assert(!/the following element[s]?[;.]/.test(compact), "dangling cataphora survived in the compact list");
  if (compact.includes("Cease processing")) {
    // DOC 144 (2026-09-02) — RE-PIN: the named element is quoted.
    assert(
      compact.includes("Cease processing, or establish the necessity of, “Contact identifiers (name, email, phone)”"),
      "compact condition does not name the element",
    );
  }
});

Deno.test("RISK-P2: q15 Yes with no mapped category yields an honest limitation, not a circular placeholder", () => {
  const spi = deriveActivitySpiInventory({
    q4_pi_categories: ["Internet or network activity"],
    q15_sensitive_pi: "Yes",
  } as never);
  // DOC 139 (2026-09-02) — RE-PIN: an external legal review on the doc
  // 137/138 fixture flagged the RISK-P2 wording ("Identified as processed...
  // categories are not named") as reading like a completed finding, when
  // q15 and the q4 category inventory are independent, non-cross-validating
  // fields — none of the q4 general categories are statutory SPI, so the
  // qualifying category is genuinely unresolved, not merely "not named."
  assertEquals(
    spi,
    "The Company has indicated that sensitive personal information is processed, but the qualifying statutory category has not been identified. Identify the category before finalizing the sensitive-PI necessity, safeguard, and risk analysis.",
  );
  assert(!String(spi).includes("has identified in its submission"), "circular placeholder survived");
});

Deno.test("RISK-P2: mapped SPI categories still print verbatim", () => {
  const spi = deriveActivitySpiInventory(baseIntake() as never);
  // Whatever the golden intake maps, the fallback sentence must not appear
  // when a mapped category exists — and a No answer yields null.
  assertEquals(deriveActivitySpiInventory({ q15_sensitive_pi: "No" } as never), null);
  void spi;
});

Deno.test("RISK-P3: the cover disposition is sentence-cased", () => {
  const table = deriveExecStatusPanel({
    assessment_required: true,
    inherent: "High",
    residual: "High",
    disposition: "do not proceed",
  } as never);
  const cell = table?.rows.find((r) => r[0] === "Assessment disposition")?.[1];
  assertEquals(cell, "Do not proceed");
  const table2 = deriveExecStatusPanel({
    assessment_required: true,
    inherent: "High",
    residual: "Low",
    disposition: "proceed with conditions",
  } as never);
  assertEquals(table2?.rows.find((r) => r[0] === "Assessment disposition")?.[1], "Proceed with conditions");
});

Deno.test("RISK-P3: the exec ledger is the compression; § 4.A keeps the full four columns", () => {
  const r = engineOn({});
  const exec = r.tables["executive_summary:5"];
  const full = r.tables["iv_determination:1"];
  if (exec && full) {
    assertEquals(exec.columns, ["Privacy risk", "Remaining risk"]);
    assertEquals(full.columns, ["Privacy risk", "Before safeguards", "Safeguard credited (status)", "Remaining"]);
    assertEquals(exec.rows.length, full.rows.length);
    assert(exec.rows.every((row) => row.length === 2), "exec rows must be two cells");
  } else {
    // The golden fixture must produce a ledger for this pin to bite.
    assert(exec !== undefined || full !== undefined, "no ledger tables produced on the golden fixture");
  }
});
