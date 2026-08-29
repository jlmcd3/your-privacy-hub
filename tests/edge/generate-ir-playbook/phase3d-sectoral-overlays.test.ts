// PHASE 3d — SEC 8-K, NYDFS, DORA (2026-08-29, doc 104, CEO-approved
// verbatim §3/§4, DORA figures added per follow-up ruling). NIS2 excluded
// entirely per CEO direction — no defensible trigger without a new intake
// field. Pins: SEC 8-K's direct jurisdiction trigger (no proxy — the value
// already existed, unused, in the intake); NYDFS's and DORA's
// organisationType==="Financial institution" proxy (same pattern as
// HIPAA); DORA's EU/EEA-only scope (deliberately excludes the UK, which
// has its own separate post-Brexit operational-resilience framework, not
// DORA — a mistake I made and caught in my own first draft before
// shipping it); and the STACKING behavior the CEO specifically asked
// about — a NY financial institution gets both NYDFS and New York's
// existing general breach-law row, because the two triggers are
// independent, not exclusive.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSectoralDuties } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/sectoral-duties.ts";
import { buildIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";

// ── SEC 8-K — direct trigger, no proxy ──────────────────────────────────

Deno.test("SEC 8-K — fires directly on the 'United States (SEC)' jurisdiction, independent of organisationType", () => {
  const r = buildSectoralDuties(["United States (SEC)"], "Company");
  assertEquals(r.duties.length, 1);
  const sec = r.duties[0];
  assertEquals(sec.state_label, "SEC Form 8-K (Item 1.05)");
  assertStringIncludes(sec.citation, "229.106");
  assertStringIncludes(sec.citation, "1.05");
  assertStringIncludes(sec.individual_deadline, "four business days");
  assertStringIncludes(sec.individual_deadline, "without unreasonable delay");
  assertStringIncludes(sec.individual_deadline, "Attorney General");
});

Deno.test("SEC 8-K — never fires without the jurisdiction selected, regardless of organisationType", () => {
  const r = buildSectoralDuties(["California"], "Financial institution");
  assertEquals(r.duties.filter((d) => d.state_label.includes("8-K")).length, 0);
});

Deno.test("SEC 8-K — contributes no proxy assumption note (its trigger is a direct selection, not a proxy)", () => {
  const r = buildSectoralDuties(["United States (SEC)"], "Company");
  assertEquals(r.proxy_assumption_note, "");
});

// ── NYDFS — proxy: New York + Financial institution ─────────────────────

Deno.test("NYDFS — fires only when BOTH New York is recorded AND organisationType is Financial institution", () => {
  assertEquals(buildSectoralDuties(["New York"], "Company").duties.length, 0, "NY alone, wrong org type");
  assertEquals(buildSectoralDuties(["California"], "Financial institution").duties.length, 0, "financial institution, wrong state");
  const r = buildSectoralDuties(["New York"], "Financial institution");
  assertEquals(r.duties.length, 1);
});

Deno.test("NYDFS — cites 23 NYCRR 500.17(a) and (c), the 72-hour trigger, and the 24-hour extortion-payment sub-duty", () => {
  const r = buildSectoralDuties(["New York"], "Financial institution");
  const nydfs = r.duties[0];
  assertEquals(nydfs.jurisdiction, "NYDFS");
  assertStringIncludes(nydfs.citation, "500.17");
  assertStringIncludes(nydfs.individual_deadline, "72 hours");
  assertStringIncludes(nydfs.individual_deadline, "24 hours");
  assertStringIncludes(nydfs.individual_deadline, "extortion payment");
  assertStringIncludes(nydfs.individual_deadline, "Superintendent");
});

Deno.test("NYDFS — firing sets the proxy assumption note", () => {
  const r = buildSectoralDuties(["New York"], "Financial institution");
  assertStringIncludes(r.proxy_assumption_note, "financial institution");
  assertStringIncludes(r.proxy_assumption_note, "should be confirmed before these duties are relied on");
});

// ── DORA — proxy: EU/EEA + Financial institution, UK explicitly excluded ─

Deno.test("DORA — fires only when BOTH an EEA country is recorded AND organisationType is Financial institution", () => {
  assertEquals(buildSectoralDuties(["Ireland"], "Company").duties.length, 0, "EEA alone, wrong org type");
  assertEquals(buildSectoralDuties(["California"], "Financial institution").duties.length, 0, "financial institution, no EEA jurisdiction");
  const r = buildSectoralDuties(["Ireland"], "Financial institution");
  assertEquals(r.duties.filter((d) => d.jurisdiction === "DORA").length, 1);
});

Deno.test("DORA — NEVER fires on the United Kingdom alone: DORA is EU-only and does not extend to the UK post-Brexit", () => {
  const r = buildSectoralDuties(["United Kingdom"], "Financial institution");
  assertEquals(r.duties.filter((d) => d.jurisdiction === "DORA").length, 0);
});

Deno.test("DORA — includes the specific 4h/24h/72h/1-month figures (CEO-approved despite secondary sourcing) and cites RTS 2025/301 Art. 5", () => {
  const r = buildSectoralDuties(["France"], "Financial institution");
  const dora = r.duties.find((d) => d.jurisdiction === "DORA")!;
  assertStringIncludes(dora.citation, "Art. 19");
  assertStringIncludes(dora.citation, "2025/301");
  assertStringIncludes(dora.individual_deadline, "4 hours");
  assertStringIncludes(dora.individual_deadline, "24 hours");
  assertStringIncludes(dora.individual_deadline, "72 hours");
  assertStringIncludes(dora.individual_deadline, "one month");
});

Deno.test("DORA — three-stage structure named: initial notification, intermediate report, final report", () => {
  const r = buildSectoralDuties(["Germany"], "Financial institution");
  const dora = r.duties.find((d) => d.jurisdiction === "DORA")!;
  for (const term of ["initial notification", "intermediate report", "final report"]) {
    assertStringIncludes(dora.individual_deadline, term);
  }
});

// ── Stacking — the exact behavior the CEO asked about ────────────────────

Deno.test("Stacking — a NY financial institution gets NYDFS AND New York's own general breach-law duty side by side, not one or the other", () => {
  const built = buildIrPlaybookDeliverables({
    organizationName: "Empire State Trust Co.",
    discoveryDateTime: new Date(Date.now() - 86_400_000).toISOString(),
    cause: "Unauthorized external access / cyberattack",
    dataTypes: ["Financial / payment data"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["New York"],
    contained: "Yes",
    organisationType: "Financial institution",
  });
  const labels = built.state_notification_duties.map((d) => d.state_label);
  assertStringIncludes(labels.join("|"), "NYDFS");
  assert(labels.some((l) => l === "New York"), "the pre-existing general NY breach-law row must still be present");
  assertEquals(labels.filter((l) => l === "NYDFS (23 NYCRR Part 500)").length, 1);
});

Deno.test("Stacking — an EU financial institution touched by both GDPR and DORA gets both, since they are parallel obligations", () => {
  const built = buildIrPlaybookDeliverables({
    organizationName: "Continental Assurance SA",
    discoveryDateTime: new Date(Date.now() - 86_400_000).toISOString(),
    cause: "Unauthorized external access / cyberattack",
    dataTypes: ["Financial / payment data"],
    affectedCount: "10,000–100,000",
    jurisdictions: ["Ireland"],
    contained: "No",
    organisationType: "Financial institution",
  });
  // GDPR regime engaged (notification_duties non-empty) AND DORA present in state_notification_duties.
  assert(built.notification_duties.length > 0, "GDPR/Ireland duty set must be present");
  assert(built.state_notification_duties.some((d) => d.jurisdiction === "DORA"), "DORA row must also be present");
});

Deno.test("Stacking — a business with all three sectoral signals (SEC, NY financial institution) gets SEC 8-K and NYDFS simultaneously", () => {
  const r = buildSectoralDuties(["United States (SEC)", "New York"], "Financial institution");
  const jurisdictions = r.duties.map((d) => d.jurisdiction);
  assert(jurisdictions.includes("United States (SEC)"));
  assert(jurisdictions.includes("NYDFS"));
  assertEquals(r.duties.length, 2);
});

// ── Standing-playbook proxy assumption section ──────────────────────────

Deno.test("standing-playbook — sectoral_proxy_assumption always renders, not-engaged default when neither NYDFS nor DORA fires", async () => {
  const { buildStandingPlaybook } = await import(
    "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/standing-playbook.ts"
  );
  const pb = buildStandingPlaybook({ organizationName: "Test Co", organisationType: "Company", jurisdictions: [] });
  const section = (pb.sections as { id: string; body: string[] }[]).find((s) => s.id === "sectoral_proxy_assumption")!;
  assert(section, "sectoral_proxy_assumption must always be present");
  assertStringIncludes(section.body.join(" "), "not engaged on this record");
});

// ── Determinism ───────────────────────────────────────────────────────────

Deno.test("Phase 3d — determinism: identical input produces byte-identical sectoral output", () => {
  const a = JSON.stringify(buildSectoralDuties(["New York", "United States (SEC)"], "Financial institution"));
  const b = JSON.stringify(buildSectoralDuties(["New York", "United States (SEC)"], "Financial institution"));
  assertEquals(a, b);
});
