// DOC 137 FIX 1 — the compact Action panel table
// (biometric-skeleton-assemble.ts, deriveActionPanelTable) named an action's
// Type and citation but no Owner, even though the fuller recommendation
// prose elsewhere in the same pipeline (check-biometric-compliance/index.ts)
// already derives a suggested owner role from orgType and prints it as
// "Suggested owner (confirm): [role]." This test asserts the table now
// carries an Owner column, and that its value is the SAME owner-role text
// (deriveBiometricOwnerRole) for a given orgType — not an independently
// invented value.

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleBiometricSkeletonDocument,
  deriveBiometricOwnerRole,
} from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

// A report with both an unlawful-now duty and an unresolved-on-record duty,
// so deriveActionPanelTable emits one row of each type.
const REPORT: Bag = {
  duty_findings: [
    {
      statute_key: "us_il_bipa",
      key: "bipa_15b1_notice",
      label: "Written notice before collection",
      citation: "740 ILCS 14/15(b)(1)",
      verdict: "not_satisfied",
    },
    {
      statute_key: "us_il_bipa",
      key: "bipa_15a_retention_schedule",
      label: "Public written retention schedule and destruction guidelines",
      citation: "740 ILCS 14/15(a)",
      verdict: "record_insufficient",
      information_needed: "whether the written policy has been in place since first possession of biometric data",
    },
  ],
  consequence_determination: {
    unlawful_now: [
      {
        duty: "Written notice before collection",
        citation: "740 ILCS 14/15(b)(1)",
        statute_short: "BIPA",
      },
    ],
    unresolved_on_record: [
      {
        duty: "Public written retention schedule and destruction guidelines",
        citation: "740 ILCS 14/15(a)",
        information_needed: "whether the written policy has been in place since first possession of biometric data",
      },
    ],
  },
};

function actionPanelTable(intake: Bag) {
  const out = assembleBiometricSkeletonDocument(REPORT as never, intake as never);
  const exec = out.document.sections.find((sec) => sec.id === "review_approval");
  const table = exec?.paragraphs.find((p) => p.kind === "table");
  return (table as { table?: { columns: string[]; rows: string[][] } } | undefined)?.table;
}

Deno.test("DOC 137 FIX 1: Action panel table carries an Owner column", () => {
  const intake: Bag = { orgName: "Busted Sled Solutions, Inc.", orgType: "Employer (employee biometrics)" };
  const table = actionPanelTable(intake);
  assertExists(table, "Action panel table missing");
  assertEquals(table!.columns, ["#", "Type", "Action", "Owner"]);
  assert(table!.rows.length >= 2, "expected one unlawful-now row and one unresolved-on-record row");
  for (const row of table!.rows) {
    assertEquals(row.length, 4, "every row must carry an Owner cell");
  }
});

Deno.test("DOC 137 FIX 1: the Owner cell matches deriveBiometricOwnerRole for the intake's orgType", () => {
  const intake: Bag = { orgName: "Busted Sled Solutions, Inc.", orgType: "Employer (employee biometrics)" };
  const table = actionPanelTable(intake);
  const expectedOwner = deriveBiometricOwnerRole("Employer (employee biometrics)");
  assertEquals(expectedOwner, "the HR lead, in coordination with the DPO or Head of Privacy");
  for (const row of table!.rows) {
    assertEquals(row[3], expectedOwner);
  }
});

Deno.test("DOC 137 FIX 1: owner role tracks orgType across the other branches", () => {
  assertEquals(deriveBiometricOwnerRole("Healthcare provider"), "the Privacy Officer and CISO");
  assertEquals(deriveBiometricOwnerRole("Financial services firm"), "the Chief Compliance Officer and CISO");
  assertEquals(
    deriveBiometricOwnerRole("Retail / consumer-facing"),
    "the Head of Privacy (or DPO where designated) and the Head of Security",
  );

  const table = actionPanelTable({ orgName: "Acme Health", orgType: "Healthcare provider" });
  for (const row of table!.rows) {
    assertEquals(row[3], "the Privacy Officer and CISO");
  }
});
