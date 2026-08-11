// SO-FT FIX 3 (2026-08-11) — US state notification duties reach Part One.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildStateNotificationDuties,
  isUsStateJurisdiction,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/us-state-duties.ts";
import { buildDeadlinesProse } from "../../../supabase/functions/_shared/ltp/ir-skeleton-assemble.ts";

Deno.test("state duties: one per recorded state, deduped, GDPR jurisdictions ignored", () => {
  const d = buildStateNotificationDuties(
    ["Ireland", "California", "Texas", "New York", "Colorado", "California", "United Kingdom"],
    "2026-03-02T10:00:00Z",
  );
  assertEquals(d.map((x) => x.jurisdiction), ["California", "Texas", "New York", "Colorado"]);
  for (const x of d) {
    assert(x.verified);
    assert(!/72 hours/.test(x.individual_deadline), "no GDPR clock may leak into a state duty");
    assert(x.citation.length > 0);
  }
  assert(!isUsStateJurisdiction("Ireland"));
});

Deno.test("California regime split is date-driven", () => {
  const before = buildStateNotificationDuties(["California"], "2025-11-04T00:00:00Z")[0];
  const after = buildStateNotificationDuties(["California"], "2026-03-02T00:00:00Z")[0];
  assert(before.citation.includes("pre-SB-446"));
  assert(after.citation.includes("SB 446"));
  assert(after.individual_deadline.includes("30 calendar days"));
});

Deno.test("an unnamed state gets no invented clock", () => {
  const [d] = buildStateNotificationDuties(["Other US State"], "");
  assertEquals(d.verified, false);
  assert(d.individual_deadline.includes("must be confirmed"));
});

Deno.test("buildDeadlinesProse renders GDPR and state clocks side by side", () => {
  const prose = buildDeadlinesProse({
    notification_duties: [{
      regime_label: "the EU GDPR",
      supervisory_authority: "the Irish Data Protection Commission",
      sa_notification_determination: { standard_citation: "GDPR Art. 33(1)", regime: "eu" },
    }],
    state_notification_duties: buildStateNotificationDuties(["California", "Texas"], "2026-03-02T00:00:00Z"),
  } as Record<string, unknown>);
  assert(prose.includes("72 hours after awareness"));
  assert(prose.includes("under the law of California"));
  assert(prose.includes("Cal. Civ. Code § 1798.82"));
  assert(prose.includes("Tex. Bus. & Com. Code § 521.053"));
});

Deno.test("no state duties: prose is exactly the GDPR clause, unchanged", () => {
  const prose = buildDeadlinesProse({
    notification_duties: [{
      regime_label: "the UK GDPR",
      supervisory_authority: "the ICO",
      sa_notification_determination: { standard_citation: "UK GDPR Art. 33(1)", regime: "uk" },
    }],
  } as Record<string, unknown>);
  assertEquals(
    prose,
    "under the UK GDPR, notification to the ICO without undue delay and, where feasible, not later than 72 hours after awareness (UK GDPR Art. 33(1))",
  );
});
