// W22-RISK-TURNA — unit tests.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applyW22RiskTurnA,
  W22_RISK_TURNA_STAMP,
} from "../run-cppa-risk-assessment/_w22_risk_turna.ts";
import { buildFactLedger } from "../_shared/intake/fact-ledger.ts";

const PLACEHOLDER =
  "We could not verify this item from the information provided; it is listed under information needed.";

Deno.test("W22 P1 — placeholder-only triggered_activities entries dropped", () => {
  const src = {
    assessment_summary: {
      triggered_activities: [
        PLACEHOLDER,
        "Cross-context behavioural advertising under § 7150(b)(1)",
        "  " + PLACEHOLDER + "  ",
      ],
    },
  } as any;
  const { report, counters } = applyW22RiskTurnA(src);
  const kept = (report as any).assessment_summary.triggered_activities;
  assertEquals(kept.length, 1);
  assert(!/information needed/i.test(kept[0]));
  assert(counters.placeholder_entries_dropped >= 2);
});

Deno.test("W22 P1 regression — no customer-visible field carries placeholder phrasing", () => {
  const src = {
    assessment_summary: {
      triggered_activities: [PLACEHOLDER, "Selling PI under § 7150(b)(1)"],
    },
    scope_and_triggers: {
      scope_notes: "Profiling is present. " + PLACEHOLDER,
      triggered_activities_detail: [
        { activity: "targeted advertising", rationale: PLACEHOLDER + " Additional context." },
      ],
    },
    inconsistency_flags: [{ description: "Sensitive PI: " + PLACEHOLDER }],
    information_needed: [{ field: "q3_sell_share", description: PLACEHOLDER + " Please confirm." }],
  } as any;
  const { report } = applyW22RiskTurnA(src);
  const blob = JSON.stringify(report);
  assert(!/information needed placeholder/i.test(blob));
  assert(!/could not verify this item from the information provided/i.test(blob),
    "placeholder leaked");
  assert(!/listed under information needed/i.test(blob),
    "placeholder fragment leaked");
});

Deno.test("W22 P2 — bare § 7150(b) survives as parent form, empty paren stripped", () => {
  const src = {
    scope_and_triggers: {
      scope_notes: "The activity falls under § 7150(b) and requires assessment.",
    },
    inconsistency_flags: [
      { description: "See § 7150(b)() for the trigger source." },
    ],
    triggered_activities_detail: [
      { activity: "profiling", note: "Assessed under ." }, // orphan under
    ],
  } as any;
  const { report, counters } = applyW22RiskTurnA(src);
  const notes = (report as any).scope_and_triggers.scope_notes;
  const flag = (report as any).inconsistency_flags[0].description;
  const note = (report as any).triggered_activities_detail[0].note;
  // Bare § 7150(b) stays as parent (no invented subsection).
  assert(/§ 7150\(b\)/.test(notes));
  assert(!/§ 7150\(b\)\(\)/.test(flag), `empty paren survived: ${flag}`);
  // Orphan "under" removed.
  assert(!/\bunder\s*\./.test(note), `orphan under survived: ${note}`);
  assert(counters.pinpoint_rewrites >= 1);
});

Deno.test("W22 P2 — completed subsection cites NOT touched", () => {
  const src = {
    scope_and_triggers: {
      scope_notes: "Systematic observation is captured under § 7150(b)(4).",
    },
  } as any;
  const { report } = applyW22RiskTurnA(src);
  const notes = (report as any).scope_and_triggers.scope_notes;
  assert(/§ 7150\(b\)\(4\)/.test(notes), `completed cite altered: ${notes}`);
});

Deno.test("W22 P3 — scope_notes contradiction downgraded when intake denies", () => {
  const intake = { q4_targeted_ads: "No" };
  const ledger = buildFactLedger(intake);
  const src = {
    scope_and_triggers: {
      scope_notes: "The record confirms cross-context tracking on the business's website.",
    },
  } as any;
  const { report, counters } = applyW22RiskTurnA(src, { intake, ledger });
  const notes = (report as any).scope_and_triggers.scope_notes;
  assert(!/record\s+confirms/i.test(notes), `contradiction survived: ${notes}`);
  assert(/intake does not itself establish/i.test(notes));
  assert(counters.scope_downgrades >= 1);
});

Deno.test("W22 P3 — supported claim NOT downgraded", () => {
  const intake = { q4_targeted_ads: "Yes" };
  const ledger = buildFactLedger(intake);
  const src = {
    scope_and_triggers: {
      scope_notes: "The record confirms cross-context tracking on the business's website.",
    },
  } as any;
  const { report, counters } = applyW22RiskTurnA(src, { intake, ledger });
  const notes = (report as any).scope_and_triggers.scope_notes;
  assert(/record\s+confirms/i.test(notes), `supported claim wrongly rewritten: ${notes}`);
  assertEquals(counters.scope_downgrades, 0);
});

Deno.test("W22 P4 — identical current_safeguards dedup'd to baseline pointer", () => {
  const shared = "Access controls, encryption at rest, and quarterly review.";
  const src = {
    risk_register: {
      entries: [
        { id: "RR-001", current_safeguards: shared },
        { id: "RR-002", current_safeguards: shared },
        { id: "RR-003", current_safeguards: shared },
        { id: "RR-004", current_safeguards: "MFA and role-based access." },
      ],
    },
  } as any;
  const { report, counters } = applyW22RiskTurnA(src);
  const e = (report as any).risk_register.entries;
  assertEquals(e[0].current_safeguards, shared);
  assert(/baseline/i.test(e[1].current_safeguards));
  assert(/baseline/i.test(e[2].current_safeguards));
  assertEquals(e[3].current_safeguards, "MFA and role-based access.");
  assertEquals(counters.safeguards_dedup, 2);
});

Deno.test("W22 — anchor keys (citation/field) never mutated", () => {
  const src = {
    information_needed: [
      {
        field: "q3_sell_share",
        citation: "11 CCR § 7150(b)",   // bare cite in ANCHOR key
        description: "Please confirm sell/share status.",
      },
    ],
  } as any;
  const { report } = applyW22RiskTurnA(src);
  const row = (report as any).information_needed[0];
  assertEquals(row.field, "q3_sell_share");
  assertEquals(row.citation, "11 CCR § 7150(b)"); // untouched
});

Deno.test("W22 — stamp is well-formed", () => {
  assert(/^w22-risk-turna@\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(W22_RISK_TURNA_STAMP));
});
