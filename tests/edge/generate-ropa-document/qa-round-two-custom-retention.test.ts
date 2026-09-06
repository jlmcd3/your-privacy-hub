// QA round two (ROPA-A-01, Medium, 2026-09-06) — "Q11 Custom needs its own
// period field".
//
// The retention question offers a "Custom" option that revealed no input, on
// all three customers. Customer A worked around it by typing the real period
// (24 hours active, 30 days backup) into the security description, where it
// never reaches the register's Art. 30(1)(f) retention column — and the column
// itself would have printed the bare token "custom".
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  retentionDisplay,
  type AnswerBag,
} from "../../../supabase/functions/generate-ropa-document/register/assemble-input.ts";

Deno.test("ROPA-A-01 — a custom period renders the period, not the token", () => {
  const ans: AnswerBag = {
    retention_period: "custom",
    retention_period_custom:
      "24 hours after the delivery completes or is cancelled; encrypted backups expire after 30 days",
  };
  assertEquals(
    retentionDisplay(ans),
    "24 hours after the delivery completes or is cancelled; encrypted backups expire after 30 days",
  );
});

Deno.test("ROPA-A-01 — 'custom' with nothing behind it says so, rather than printing the token", () => {
  assertEquals(
    retentionDisplay({ retention_period: "custom" }),
    "A custom retention period was selected but has not been stated.",
  );
  assertEquals(
    retentionDisplay({ retention_period: "custom", retention_period_custom: "   " }),
    "A custom retention period was selected but has not been stated.",
  );
});

Deno.test("ROPA-A-01 — every other selection is unchanged", () => {
  assertEquals(retentionDisplay({ retention_period: "1y" }), "1y");
  assertEquals(retentionDisplay({ retention_period: "7y" }), "7y");
  assertEquals(retentionDisplay({ retention_period: "indefinitely" }), "indefinitely");
  // No answer at all keeps the existing em-dash placeholder.
  assertEquals(retentionDisplay({}), "—");
});

Deno.test("ROPA-A-01 — a stray custom value never overrides a fixed selection", () => {
  assertEquals(
    retentionDisplay({ retention_period: "6y", retention_period_custom: "leftover text" }),
    "6y",
  );
});
