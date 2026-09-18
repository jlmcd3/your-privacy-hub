// Batch 3edc00df (2026-09-17, ptest run 2026-09-17-3edc00df.md, cppa-cyber
// f1/f8, Sterling Wealth Advisors LLC) — readiness_actions:0 read "for 3
// components (... : 2026-05-01; ... : 2026-05-15; ... : 2026-05-25), a
// Company target date stated in its notes," but all three dates are
// historical event dates in the fixture's own notes, never remediation
// targets:
//   - controls[5]  (c6_vuln_mgmt) 2026-05-01 is the date of a COMPLETED
//     penetration test ("the 2026-05-01 test found zero critical or high
//     findings").
//   - controls[12] (c13_training) 2026-05-15 is an AS-OF completion date
//     ("tracked with 100% completion for 2026 as of 2026-05-15").
//   - controls[17] (c18_continuity) 2026-05-25 is the date of a SUCCESSFUL
//     restore test ("the most recent restore test (2026-05-25) succeeded
//     within RTO").
// The prior extraction (/\b(20\d{2}-\d{2}-\d{2})\b/) took the first ISO date
// in the notes unconditionally. noteTargetDate() now requires a
// forward-looking cue ("by", "target", "due", "planned", "scheduled", "to
// be", "will" — reusing _shared/prose/temporal.ts's datedCommitments) in the
// same sentence as the date, and never returns a date whose sentence reports
// something already completed/tested/succeeded/as of.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { noteTargetDate } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";

Deno.test("batch 3edc00df — a completed penetration test date is not a Company target (controls[5].notes, c6_vuln_mgmt)", () => {
  const notes =
    "Monthly authenticated scans and an annual third-party penetration test cover all three in-scope systems; the 2026-05-01 test found zero critical or high findings.";
  assertEquals(noteTargetDate(notes), "");
});

Deno.test("batch 3edc00df — an as-of training-completion date is not a Company target (controls[12].notes, c13_training)", () => {
  const notes =
    "Annual security and privacy training is mandatory for all staff, tracked with 100% completion for 2026 as of 2026-05-15.";
  assertEquals(noteTargetDate(notes), "");
});

Deno.test("batch 3edc00df — a successful restore-test date is not a Company target (controls[17].notes, c18_continuity)", () => {
  const notes =
    "The continuity plan sets a 4-hour RTO for the portfolio-management system, supported by daily backups to a geographically separate facility; the most recent restore test (2026-05-25) succeeded within RTO.";
  assertEquals(noteTargetDate(notes), "");
});

Deno.test("batch 3edc00df — a genuinely forward-looking date IS still recognized as a Company target", () => {
  // cppa-cyber-p11-edtech-not-met fixture, c9_anti_malware.
  const notes =
    "Company-issued laptops (14 of 22) run managed endpoint protection with centralized reporting; the remaining 8 staff use contractor-owned devices with no centrally verified anti-malware coverage. Target: require managed endpoint protection on all contractor devices accessing company systems by 2026-12-01, owned by the Head of Engineering.";
  assertEquals(noteTargetDate(notes), "2026-12-01");
});

Deno.test("batch 3edc00df — no date, no notes, and a bare unqualified date all yield no target", () => {
  assertEquals(noteTargetDate(""), "");
  assertEquals(noteTargetDate("No date here at all."), "");
  // A bare date with no cue either way is not asserted as a target.
  assertEquals(noteTargetDate("The vendor contract renews 2026-11-01."), "");
});
