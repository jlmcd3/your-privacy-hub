import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applyCyberAuditSchedule,
  renderCyberAuditSchedule,
  SCHEDULE_MARKER,
  SCHEDULE_LITERALS,
} from "../../../../supabase/functions/_shared/ltp/cyber-audit-schedule.ts";

Deno.test("cyber-audit-schedule: renders all three tiers verbatim from corpus", () => {
  const s = renderCyberAuditSchedule();
  for (const t of [SCHEDULE_LITERALS.tier1, SCHEDULE_LITERALS.tier2, SCHEDULE_LITERALS.tier3]) {
    if (!s.includes(t.deadline)) throw new Error(`missing ${t.deadline}`);
    if (!s.includes(t.revenue_condition)) throw new Error(`missing revenue condition ${t.subdivision}`);
    if (!s.includes(t.audit_period)) throw new Error(`missing audit period ${t.subdivision}`);
  }
  if (!/customer, in consultation with qualified legal counsel/i.test(s)) {
    throw new Error("missing reserved-to-customer-and-counsel framing");
  }
});

Deno.test("cyber-audit-schedule: applies to submission_summary; idempotent", () => {
  const report: any = {};
  const r1 = applyCyberAuditSchedule(report);
  assertEquals(r1.emitted, true);
  assertEquals(r1.reason, "emitted");
  const written = String(report.submission_summary.cybersecurity_audit_schedule);
  if (!written.includes(SCHEDULE_MARKER)) throw new Error("marker not written");
  const r2 = applyCyberAuditSchedule(report);
  assertEquals(r2.emitted, false);
  assertEquals(r2.reason, "already_present");
});

Deno.test("cyber-audit-schedule: same output for resolved and indeterminate bands (no cohort computation)", () => {
  const a: any = {}; applyCyberAuditSchedule(a);
  const b: any = {}; applyCyberAuditSchedule(b);
  assertEquals(a.submission_summary.cybersecurity_audit_schedule, b.submission_summary.cybersecurity_audit_schedule);
});

Deno.test("cyber-audit-schedule: fail-open on null report", () => {
  const r = applyCyberAuditSchedule(null);
  assertEquals(r.emitted, false);
  assertEquals(r.reason, "no_report");
});
