// PHASE 3a — HIPAA'S FOUR BREACH-NOTIFICATION DUTIES (2026-08-29, doc 102,
// CEO-approved verbatim §4/§5). Every citation was verified fresh against
// Cornell LII (law.cornell.edu/cfr/text/45/164.4xx) during drafting, not
// carried over from the old retired prompt's text. Pins: the dual gating
// signal (organisationType OR a "United States (HIPAA)" jurisdiction — the
// jurisdiction signal was a pre-existing convention in ir-skeleton-
// assemble.ts discovered only after the first implementation pass, which
// gated on organisationType alone and left a stale "not in this product's
// verified corpus" sentence firing self-contradictorily alongside the now-
// real duty rows), the 500-affected-individual band classifier for the
// media/Secretary duties, the business-associate conditional, the law-
// enforcement-delay modifier folded into the individual-notice row rather
// than a standalone fifth duty, and the StateDutySet shape reuse that gives
// HIPAA duties the exact same rendering as the US-state clocks with zero
// new wiring.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildHipaaDuties, isHealthcareOrgType, isHipaaEngaged } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/hipaa-duties.ts";
import { buildIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { buildStandingPlaybook } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/standing-playbook.ts";

type Bag = Record<string, unknown>;

function section(pb: ReturnType<typeof buildStandingPlaybook>, id: string): Bag {
  const s = (pb.sections as Bag[]).find((x) => x.id === id);
  assert(s, `expected section "${id}" to be present`);
  return s as Bag;
}

const HEALTHCARE_INTAKE = {
  organizationName: "Meridian Health Systems",
  discoveryDateTime: new Date(Date.now() - 86_400_000).toISOString(),
  cause: "Unauthorized external access / cyberattack",
  dataTypes: ["Health / medical records"],
  affectedCount: "10,000–100,000",
  jurisdictions: ["California"],
  contained: "Yes",
  organisationType: "Healthcare provider",
};

// ── Gating ────────────────────────────────────────────────────────────────

Deno.test("isHealthcareOrgType — exact match only, no fuzzy matching a real-world org-type string", () => {
  assert(isHealthcareOrgType("Healthcare provider"));
  assert(!isHealthcareOrgType("Financial institution"));
  assert(!isHealthcareOrgType("Company"));
  assert(!isHealthcareOrgType(""));
});

Deno.test("isHipaaEngaged — fires on organisationType alone", () => {
  assert(isHipaaEngaged("Healthcare provider", []));
  assert(!isHipaaEngaged("Financial institution", []));
});

Deno.test("isHipaaEngaged — fires on the 'United States (HIPAA)' jurisdiction alone, matching the pre-existing ir-skeleton-assemble.ts /hipaa/i convention", () => {
  assert(isHipaaEngaged("Company", ["United States (HIPAA)"]));
  assert(isHipaaEngaged("Company", ["California", "United States (HIPAA)"]));
  assert(!isHipaaEngaged("Company", ["California", "United States (FTC)"]));
});

Deno.test("isHipaaEngaged — either signal alone is sufficient; neither is required if the other is present", () => {
  assert(isHipaaEngaged("Healthcare provider", ["United States (FTC)"]), "org type alone");
  assert(isHipaaEngaged("Financial institution", ["United States (HIPAA)"]), "jurisdiction alone, non-healthcare org type");
});

Deno.test("buildHipaaDuties — no duties and no assumption note when neither signal is present", () => {
  const r = buildHipaaDuties("Financial institution", ["California"], "10,000–100,000", false, "");
  assertEquals(r.duties.length, 0);
  assertEquals(r.assumption_note, "");
});

Deno.test("buildHipaaDuties — a jurisdiction-only signal (no healthcare org type) still produces the full duty set — this is the exact case the old stale placeholder text used to mishandle", () => {
  const r = buildHipaaDuties("Financial institution", ["United States (HIPAA)"], "10,000–100,000", false, "");
  assertEquals(r.duties.length, 3);
  assert(r.assumption_note.length > 0);
});

// ── The three unconditional duties ──────────────────────────────────────

Deno.test("buildHipaaDuties — a healthcare org always gets the individual, media, and Secretary duties", () => {
  const r = buildHipaaDuties("Healthcare provider", [], "10,000–100,000", false, "");
  const labels = r.duties.map((d) => d.state_label);
  assertStringIncludes(labels.join("|"), "HIPAA (individual notice)");
  assertStringIncludes(labels.join("|"), "HIPAA (media notice)");
  assertStringIncludes(labels.join("|"), "HIPAA (notice to the HHS Secretary)");
  assertEquals(r.duties.length, 3, "no business-associate row without a recorded processor");
});

Deno.test("buildHipaaDuties — every HIPAA row is marked verified and carries its own 45 C.F.R. citation", () => {
  const r = buildHipaaDuties("Healthcare provider", [], "Fewer than 100", false, "");
  for (const d of r.duties) {
    assert(d.verified, `${d.state_label} must be verified`);
    assertStringIncludes(d.citation, "45 C.F.R.");
    assertEquals(d.jurisdiction, "HIPAA");
  }
});

Deno.test("buildHipaaDuties — individual notice carries the 60-day clock, the discovery definition, and the law-enforcement-delay modifier (not a separate row)", () => {
  const r = buildHipaaDuties("Healthcare provider", [], "10,000–100,000", false, "");
  const individual = r.duties.find((d) => d.state_label === "HIPAA (individual notice)")!;
  assertStringIncludes(individual.individual_deadline, "60 calendar days after discovery");
  assertStringIncludes(individual.individual_deadline, "reasonable diligence");
  assertStringIncludes(individual.individual_deadline, "45 C.F.R. § 164.412");
  assertStringIncludes(individual.individual_deadline, "30 days on an oral request");
  assert(!r.duties.some((d) => d.state_label.includes("164.412") || d.citation.includes("164.412")), "164.412 must not appear as its own row");
});

// ── Band-dependent media/Secretary framing ──────────────────────────────

Deno.test("HIPAA media/Secretary duties — a band clearly at or above 500 triggers the affirmative branch for both", () => {
  for (const band of ["1,000–10,000", "10,000–100,000", "More than 100,000"]) {
    const r = buildHipaaDuties("Healthcare provider", [], band, false, "");
    const media = r.duties.find((d) => d.state_label === "HIPAA (media notice)")!;
    const sec = r.duties.find((d) => d.state_label === "HIPAA (notice to the HHS Secretary)")!;
    assertStringIncludes(media.individual_deadline, "exceeds 500 individuals in aggregate", `band ${band}`);
    assertStringIncludes(sec.individual_deadline, "contemporaneously with the individual notice", `band ${band}`);
  }
});

Deno.test("HIPAA media/Secretary duties — 'Fewer than 100' triggers the under-500 branch for both", () => {
  const r = buildHipaaDuties("Healthcare provider", [], "Fewer than 100", false, "");
  const media = r.duties.find((d) => d.state_label === "HIPAA (media notice)")!;
  const sec = r.duties.find((d) => d.state_label === "HIPAA (notice to the HHS Secretary)")!;
  assertStringIncludes(media.individual_deadline, "not triggered on this record");
  assertStringIncludes(sec.individual_deadline, "logged and reported to the HHS Secretary annually");
});

Deno.test("HIPAA media/Secretary duties — a straddling or unknown band degrades honestly to undetermined, never guesses", () => {
  for (const band of ["100–1,000", "Unknown"]) {
    const r = buildHipaaDuties("Healthcare provider", [], band, false, "");
    const media = r.duties.find((d) => d.state_label === "HIPAA (media notice)")!;
    const sec = r.duties.find((d) => d.state_label === "HIPAA (notice to the HHS Secretary)")!;
    assertStringIncludes(media.individual_deadline, "undetermined on the record", `band ${band}`);
    assertStringIncludes(sec.individual_deadline, "undetermined on the record", `band ${band}`);
  }
});

// ── Business-associate conditional ──────────────────────────────────────

Deno.test("buildHipaaDuties — the business-associate row only appears when processorInvolved is true, and names the recorded processor", () => {
  const withoutBA = buildHipaaDuties("Healthcare provider", [], "10,000–100,000", false, "Acme Cloud");
  assertEquals(withoutBA.duties.length, 3);
  const withBA = buildHipaaDuties("Healthcare provider", [], "10,000–100,000", true, "Acme Cloud");
  assertEquals(withBA.duties.length, 4);
  const ba = withBA.duties.find((d) => d.state_label === "HIPAA (business-associate notice)")!;
  assertStringIncludes(ba.individual_deadline, "Acme Cloud");
  assertStringIncludes(ba.citation, "164.410");
});

Deno.test("buildHipaaDuties — the business-associate row falls back to a generic label when processorInvolved is true but no name is recorded", () => {
  const r = buildHipaaDuties("Healthcare provider", [], "10,000–100,000", true, "");
  const ba = r.duties.find((d) => d.state_label === "HIPAA (business-associate notice)")!;
  assertStringIncludes(ba.individual_deadline, "the recorded processor");
});

// ── Integration: build.ts wiring ────────────────────────────────────────

Deno.test("buildIrPlaybookDeliverables — HIPAA duties are appended to state_notification_duties, riding the same array as the US-state clocks", () => {
  const built = buildIrPlaybookDeliverables(HEALTHCARE_INTAKE);
  const jurisdictions = built.state_notification_duties.map((d) => d.jurisdiction);
  assertStringIncludes(jurisdictions.join("|"), "California");
  assertStringIncludes(jurisdictions.join("|"), "HIPAA");
  const hipaaCount = jurisdictions.filter((j) => j === "HIPAA").length;
  assertEquals(hipaaCount, 3, "individual + media + Secretary, no processor recorded");
});

Deno.test("buildIrPlaybookDeliverables — a non-healthcare org with no HIPAA jurisdiction gets zero HIPAA rows", () => {
  const built = buildIrPlaybookDeliverables({ ...HEALTHCARE_INTAKE, organisationType: "Financial institution" });
  const jurisdictions = built.state_notification_duties.map((d) => d.jurisdiction);
  assert(!jurisdictions.includes("HIPAA"));
  assertStringIncludes(jurisdictions.join("|"), "California");
});

Deno.test("buildIrPlaybookDeliverables — a non-healthcare-typed org that records the 'United States (HIPAA)' jurisdiction still gets HIPAA rows", () => {
  const built = buildIrPlaybookDeliverables({
    ...HEALTHCARE_INTAKE,
    organisationType: "Company",
    jurisdictions: ["California", "United States (HIPAA)"],
  });
  const jurisdictions = built.state_notification_duties.map((d) => d.jurisdiction);
  assertEquals(jurisdictions.filter((j) => j === "HIPAA").length, 3);
});

// ── Standing-playbook section ────────────────────────────────────────────

Deno.test("standing-playbook — the hipaa_assumption section always renders (never omitted), with the not-engaged default when neither signal is present", () => {
  const pb = buildStandingPlaybook({ ...HEALTHCARE_INTAKE, organisationType: "Financial institution" });
  const note = section(pb, "hipaa_assumption");
  assertEquals(note.status, "analysed");
  assertStringIncludes((note.body as string[]).join(" "), "not engaged on this record");
});

Deno.test("standing-playbook — the hipaa_assumption section states the healthcare-provider proxy assumption once when HIPAA is engaged", () => {
  const pb = buildStandingPlaybook(HEALTHCARE_INTAKE);
  const body = (section(pb, "hipaa_assumption").body as string[]).join(" ");
  assertStringIncludes(body, "healthcare provider");
  assertStringIncludes(body, "health plans, healthcare clearinghouses, and business associates by a different route");
});

Deno.test("standing-playbook — hipaa_assumption sits immediately after statutory_notification_determinations", () => {
  const pb = buildStandingPlaybook(HEALTHCARE_INTAKE);
  const ids = (pb.sections as Bag[]).map((s) => s.id);
  assertEquals(ids.indexOf("hipaa_assumption"), ids.indexOf("statutory_notification_determinations") + 1);
});

// ── The removed self-contradiction ──────────────────────────────────────

Deno.test("the stale 'HIPAA's operative text is not in this product's verified corpus' placeholder cannot come back as live runtime text", async () => {
  const src = await Deno.readTextFile(
    new URL(
      "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts",
      import.meta.url,
    ),
  );
  // A substring unique to the OLD runtime `blocks.push(...)` string, not
  // reused in the removal comment that quotes the shorter overlapping
  // phrase "...is not in this product's verified corpus" for context.
  assert(
    !src.includes("so its clocks are not quoted here"),
    "the pre-fix placeholder text must never reappear as live runtime text now that hipaa-duties.ts carries verified 45 C.F.R. text",
  );
});

// ── Determinism ───────────────────────────────────────────────────────────

Deno.test("Phase 3a — determinism: identical input produces byte-identical HIPAA output", () => {
  const a = JSON.stringify(buildHipaaDuties("Healthcare provider", ["United States (HIPAA)"], "10,000–100,000", true, "Acme Cloud"));
  const b = JSON.stringify(buildHipaaDuties("Healthcare provider", ["United States (HIPAA)"], "10,000–100,000", true, "Acme Cloud"));
  assertEquals(a, b);
});
