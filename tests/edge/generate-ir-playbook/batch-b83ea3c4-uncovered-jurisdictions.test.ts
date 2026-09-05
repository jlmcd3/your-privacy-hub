// Batch b83ea3c4 (2026-09-05, Clarivex/Cloverpath): "United States (FTC)" is a
// form option the record carried and the playbook said nothing about it — no
// clock, no scope statement. A recorded jurisdiction no duty row covers now
// gets its own clocks-table row stating that no covered statute attaches: a
// scope statement, never a duty.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildStateNotificationDuties } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/us-state-duties.ts";
import {
  UNCOVERED_JURISDICTION_NOTE,
  uncoveredRecordedJurisdictions,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";

Deno.test("batch b83ea3c4 — recorded jurisdictions the playbook states no duty for are named, never silent", () => {
  const report = {
    state_notification_duties: [
      ...buildStateNotificationDuties(["California", "Texas", "Illinois"], "2026-09-05T07:19:00Z"),
      { jurisdiction: "United States (SEC)", state_label: "SEC Form 8-K Item 1.05", citation: "17 C.F.R. § 229.106", individual_deadline: "file within four business days", verified: true },
    ],
  } as Record<string, unknown>;
  // FTC: recorded, no row → named. SEC: recorded, row present → covered. HIPAA
  // recorded with no HIPAA rows (the organisation is not a healthcare
  // provider) → named. EU/UK and the covered states never appear; a repeat
  // selection collapses.
  const out = uncoveredRecordedJurisdictions(report, {
    jurisdictions: ["United States (FTC)", "California", "Texas", "Illinois", "United States (SEC)", "United States (HIPAA)", "Ireland", "United Kingdom", "EU/EEA", "United States (FTC)"],
  });
  assertEquals(out, ["United States (FTC)", "United States (HIPAA)"]);

  const withHipaa = {
    state_notification_duties: [
      ...(report.state_notification_duties as unknown[]),
      { jurisdiction: "HIPAA", state_label: "HIPAA — individuals", citation: "45 C.F.R. § 164.404", individual_deadline: "without unreasonable delay", verified: true },
    ],
  } as Record<string, unknown>;
  assertEquals(uncoveredRecordedJurisdictions(withHipaa, { jurisdictions: ["United States (HIPAA)", "United States (FTC)"] }), ["United States (FTC)"]);
  assertEquals(uncoveredRecordedJurisdictions(report, {}), []);
  assertEquals(uncoveredRecordedJurisdictions({}, { jurisdictions: ["Ireland", "Germany"] }), []);
});

Deno.test("batch b83ea3c4 — the note is a scope statement, not a duty", () => {
  assert(UNCOVERED_JURISDICTION_NOTE.includes("separate advice"));
  assert(!/\b(must|shall) notify/i.test(UNCOVERED_JURISDICTION_NOTE));
  assert(!/\d+\s*(hours|days)/i.test(UNCOVERED_JURISDICTION_NOTE), "no clock is invented");
});
