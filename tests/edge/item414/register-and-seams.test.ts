// ITEM 414 — IR REGISTER BATTERIES, SEAM LINT (R1–R11) AND THE LEDGER, over
// the FINAL rendered strings of BOTH artifacts assembled through the finalize
// battery in-test.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  IR_BANNED_SHARED,
  IR_HIPAA_VERIFIED_ANCHORS,
  irBannedRegister,
  IR_PIPELINE_STAMP,
  unverifiedCfrAnchors,
} from "../../../supabase/functions/generate-ir-playbook/_local/prose/ir.spine.ts";
import {
  applyIrProseGold,
  templateReadsAsAuthority,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-prose-gold.ts";
import { runIrFinalizeBattery } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-finalize.ts";
import {
  buildStandingPlaybook,
  FIRST_HOUR_ITEMS,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/standing-playbook.ts";
import { buildIncidentWorksheet } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/incident-worksheet.ts";
import { lintAssembledProse } from "../../../supabase/functions/_shared/prose/assembled-prose-lint.ts";
import {
  hasBareEnum,
  hasSplice,
  duplicateSentences,
  openingCarriesFinding,
} from "../../../archive/unwired/_shared/prose/risk-seam-lint.ts";

// ── the two records ─────────────────────────────────────────────────────────

const THIN = {
  organizationName: "Meridian Health Systems",
  discoveryDateTime: "2026-07-30T09:15:00Z",
  cause: "Ransomware or malware",
  dataTypes: ["Health / medical records"],
  affectedCount: "10,000–100,000",
  jurisdictions: ["United States (HIPAA)"],
  contained: "No",
  organisationType: "Healthcare provider",
};

const COMPLETE = {
  ...THIN,
  activationCriteria: ["Any confirmed unauthorised access to a clinical system."],
  severityMatrix: [{ level: "Critical", definition: "Clinical care is interrupted.", escalation: "Executive team within one hour." }],
  severityThresholds: ["Critical: more than 500 records"],
  responseTeamRoster: [{ role: "Incident Lead", primary: "A. Okafor", alternate: "R. Bell" }],
  outsideCounselName: "Harrow & Vance LLP",
  outsideCounselContact: "+1 555 0100",
  privilegeProtocol: true,
  insurerContact: "Northbank Cyber, +1 555 0111",
  forensicVendorContact: "Kestrel Forensics, +1 555 0122",
  lawEnforcementContact: "FBI Field Office, +1 555 0133",
  itIsolationAuthority: "Director of IT Operations",
  keySystems: ["Electronic health record platform"],
  logSources: ["VPN concentrator authentication logs"],
  breachNoticeContracts: [{ counterparty: "Cardinal Labs", deadline: "48 hours", clause: "MSA cl. 12.4" }],
  firstHourConfirmations: FIRST_HOUR_ITEMS.map((i) => i.id),
  nextTabletopDate: "2026-11-04",
};

function assemble(intake: Record<string, unknown>): Record<string, unknown> {
  const report: Record<string, unknown> = {
    standing_playbook: buildStandingPlaybook(intake),
    incident_worksheet: buildIncidentWorksheet(String(intake.organizationName ?? "")),
    generated_at: new Date().toISOString(),
  };
  return runIrFinalizeBattery(report, intake).report;
}

function strings(node: unknown, path = "$"): { path: string; value: string }[] {
  if (typeof node === "string") return node.trim() ? [{ path, value: node }] : [];
  if (Array.isArray(node)) return node.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (node && typeof node === "object") {
    return Object.entries(node as Record<string, unknown>)
      .filter(([k]) => k !== "_meta" && k !== "_staging")
      .flatMap(([k, v]) => strings(v, `${path}.${k}`));
  }
  return [];
}

// ── REGISTER BATTERY — one per artifact ─────────────────────────────────────

for (const artifact of ["standing_playbook", "incident_worksheet"] as const) {
  Deno.test(`item414: the ${artifact} banned register appears nowhere`, () => {
    const banned = [...IR_BANNED_SHARED, ...irBannedRegister(artifact)];
    for (const intake of [THIN, COMPLETE]) {
      const leaves = strings(assemble(intake)[artifact]);
      for (const { path, value } of leaves) {
        for (const phrase of banned) {
          assert(
            !value.toLowerCase().includes(phrase.toLowerCase()),
            `${artifact} ${path} carries the banned phrase "${phrase}": ${value.slice(0, 160)}`,
          );
        }
      }
    }
  });
}

Deno.test("item414: A6 — 'on this record' and its variants appear in neither artifact", () => {
  for (const intake of [THIN, COMPLETE]) {
    for (const { path, value } of strings(assemble(intake))) {
      assert(!/\bon (?:this|the) record\b/i.test(value), `${path}: ${value.slice(0, 160)}`);
      assert(!/\brecorded on this intake\b/i.test(value), `${path}: ${value.slice(0, 160)}`);
    }
  }
});

// ── IR-2 / R4 — no field labels, no bare enums ──────────────────────────────

Deno.test("item414: IR-2 — no intake field name reaches prose", () => {
  for (const intake of [THIN, COMPLETE]) {
    for (const { path, value } of strings(assemble(intake))) {
      assert(!/\(intake fields?:/i.test(value), `${path} leaks a field label: ${value.slice(0, 160)}`);
      assert(!/\bactivationCriteria\b|\bbreachNoticeContracts\b|\bseverityMatrix\b/.test(value), `${path}: ${value}`);
    }
  }
});

Deno.test("item414: R4 — the asks and the ledger carry no bare enum token", () => {
  const sp = assemble(THIN).standing_playbook as Record<string, unknown>;
  const asks = (sp.information_needed as string[]) ?? [];
  for (const ask of asks) assert(!hasBareEnum(ask), `bare enum in ask: ${ask}`);
  assert(!hasBareEnum(String(sp.unrecorded_ledger ?? "")), "bare enum in the ledger");
});

// ── IR-1 — THE LEDGER, BOTH DIRECTIONS ──────────────────────────────────────

Deno.test("item414: IR-1 — a thin record gets ONE ledger, honest and readable", () => {
  const sp = assemble(THIN).standing_playbook as Record<string, unknown>;
  const ledger = String(sp.unrecorded_ledger ?? "");
  assert(ledger.length > 0, "a thin record must carry the ledger");
  assert(/incomplete/.test(ledger), "the ledger must say the sections are incomplete");
  assert(/Each of those sections states what would complete it\.$/.test(ledger));
  // Every ask says what would fill it, and none is a bare fragment.
  const asks = (sp.information_needed as string[]) ?? [];
  assert(asks.length > 0);
  for (const a of asks) {
    assert(a.length > 40, `ask is a bare fragment: ${a}`);
    assert(/complete once the organisation records/.test(a), `ask does not say what would fill it: ${a}`);
  }
  // R8 — deduplicated: the shipped defect emitted the same ask twice.
  assertEquals(new Set(asks).size, asks.length, "asks must be deduplicated");
});

Deno.test("item414: IR-1 — a complete record gets NO ledger and no 'not recorded' fragment", () => {
  const sp = assemble(COMPLETE).standing_playbook as Record<string, unknown>;
  assertEquals(sp.unrecorded_ledger, undefined, "a complete record must carry no ledger");
  assertEquals((sp.information_needed as string[]).length, 0);
  assertEquals(sp.status, "analysed");
  for (const { path, value } of strings(sp)) {
    assert(!/^not recorded\.?$/i.test(value.trim()), `${path} ships a bare absence fragment`);
  }
});

// ── IR-3 — no apparatus in a fixed table cell ───────────────────────────────

Deno.test("item414: IR-3 — a degraded first-hour action is restored to its fixed item", () => {
  const report = {
    standing_playbook: {
      artifact: "standing_playbook",
      sections: [{
        kind: "table",
        id: "first_hour_checklist",
        heading: "First-hour checklist",
        columns: ["Action", "Owner", "Standing confirmation"],
        rows: FIRST_HOUR_ITEMS.map((it, i) => [
          i === 4
            ? "We could not verify this item from the information provided; it is listed under information needed."
            : it.item,
          it.owner,
          "Not confirmed",
        ]),
      }],
      information_needed: [],
    },
  };
  const out = applyIrProseGold(report as Record<string, unknown>, FIRST_HOUR_ITEMS.map((i) => i.item));
  assertEquals(out.restored_checklist_cells, 1);
  const rows = (out.report.standing_playbook as any).sections[0].rows as string[][];
  assertEquals(rows[4][0], FIRST_HOUR_ITEMS[4].item);
});

Deno.test("item414: no apparatus opener survives in either assembled artifact", () => {
  for (const intake of [THIN, COMPLETE]) {
    for (const { path, value } of strings(assemble(intake))) {
      if (value.length < 40) continue;
      assert(openingCarriesFinding(value), `${path} opens with apparatus: ${value.slice(0, 120)}`);
    }
  }
});

// ── IR-4 — the worksheet placeholder never enters the standing register ─────

Deno.test("item414: IR-4 — '[TO BE COMPLETED]' is worksheet-only", () => {
  for (const intake of [THIN, COMPLETE]) {
    const report = assemble(intake);
    for (const { path, value } of strings(report.standing_playbook)) {
      assert(!value.includes("[TO BE COMPLETED]"), `${path} carries the worksheet placeholder`);
    }
  }
});

// ── IR-6 — the Art. 33(3) rows are not a mould litany ───────────────────────

Deno.test("item414: IR-6 — the notification-content rows name their element", () => {
  const mapping = {
    elements: [
      { element: "a_nature", citation: "GDPR Art. 33(3)(a)", requirement_verbatim: "…", owner: "Legal", source_of_truth: "x", record_value: "y" },
      { element: "b_dpo_contact", citation: "GDPR Art. 33(3)(b)", requirement_verbatim: "…", owner: "Legal", source_of_truth: "x", record_value: "y" },
      { element: "c_likely_consequences", citation: "GDPR Art. 33(3)(c)", requirement_verbatim: "…", owner: "Legal", source_of_truth: "x", record_value: "y" },
      { element: "d_measures", citation: "GDPR Art. 33(3)(d)", requirement_verbatim: "…", owner: "Legal", source_of_truth: "x", record_value: "y" },
    ],
    phasing: { first_tranche: ["a_nature"], phased: [] },
  } as any;
  const sp = buildStandingPlaybook(COMPLETE, mapping);
  const sec = sp.sections.find((s) => s.id === "first_24_hours_checklist") as any;
  const actions: string[] = sec.rows.map((r: string[]) => r[0]);
  const content = actions.filter((a) => /Art\. 33\(3\)/.test(a));
  assertEquals(content.length, 4);
  assertEquals(new Set(content).size, 4, "the four rows must not be one mould");
  assert(content.some((a) => /categories and approximate numbers/.test(a)));
  assert(content.some((a) => /likely consequences/.test(a)));
});

// ── AUTHORITY vs TEMPLATE ───────────────────────────────────────────────────

Deno.test("item414: template material never reads as legal authority", () => {
  for (const intake of [THIN, COMPLETE]) {
    for (const { path, value } of strings(assemble(intake))) {
      assert(!templateReadsAsAuthority(value), `${path} states a template as authority: ${value.slice(0, 160)}`);
    }
  }
  // and the detector is live
  assert(templateReadsAsAuthority("NIST SP 800-61r3 requires the organisation to isolate the host."));
});

Deno.test("item414: the framing note keeps the template/authority distinction", () => {
  const sp = assemble(THIN).standing_playbook as Record<string, unknown>;
  const note = String(sp.template_note ?? "");
  assert(/NIST/.test(note) && /not .*(authority|law)/i.test(note), note.slice(0, 240));
});

Deno.test("item414: every 45 CFR pinpoint sits on a Part-164 verified anchor", () => {
  for (const intake of [THIN, COMPLETE]) {
    for (const { path, value } of strings(assemble(intake))) {
      const bad = unverifiedCfrAnchors(value);
      assertEquals(bad, [], `${path} cites an unverified CFR anchor ${bad.join(", ")}`);
    }
  }
  assert(IR_HIPAA_VERIFIED_ANCHORS.includes("164.404"));
});

// ── R6 / R8 / R11 over the final assembled strings ──────────────────────────

Deno.test("item414: R6 — no comma splice in either artifact", () => {
  for (const intake of [THIN, COMPLETE]) {
    for (const { path, value } of strings(assemble(intake))) {
      assert(!hasSplice(value), `${path}: ${value.slice(0, 160)}`);
    }
  }
});

Deno.test("item414: R8 — no sentence ships twice in the standing playbook", () => {
  for (const intake of [THIN, COMPLETE]) {
    const sp = assemble(intake).standing_playbook;
    const text = strings(sp).map((l) => l.value).join("\n");
    assertEquals(duplicateSentences(text), []);
  }
});

Deno.test("item414: R11 — the assembled prose lint is clean on both artifacts", () => {
  for (const intake of [THIN, COMPLETE]) {
    const report = assemble(intake);
    for (const artifact of ["standing_playbook", "incident_worksheet"]) {
      const res = lintAssembledProse({ [artifact]: report[artifact] } as Record<string, unknown>);
      const blocking = res.findings.filter((f) => !f.advisory);
      assertEquals(
        blocking.map((f) => `${f.rule}@${f.path}`),
        [],
        `${artifact} R11 findings`,
      );
    }
  }
});

// ── COVERAGE ────────────────────────────────────────────────────────────────

Deno.test("item414: coverage — a complete record leaves no orphan", () => {
  const report: Record<string, unknown> = {
    standing_playbook: buildStandingPlaybook(COMPLETE),
    incident_worksheet: buildIncidentWorksheet("Meridian Health Systems"),
  };
  const out = runIrFinalizeBattery(report, COMPLETE);
  assertEquals(out.coverage.crashed, false);
  assertEquals(out.coverage.orphans.map((o) => `${o.type}@${o.path}`), []);
  assert(out.coverage.counts.links_checked > 0);
});

Deno.test("item414: coverage — honest silence on a thin record is not an orphan", () => {
  const report: Record<string, unknown> = {
    standing_playbook: buildStandingPlaybook(THIN),
    incident_worksheet: buildIncidentWorksheet("Meridian Health Systems"),
  };
  const out = runIrFinalizeBattery(report, THIN);
  assertEquals(out.coverage.orphans.map((o) => `${o.type}@${o.path}`), []);
});

// ── THE STAMP AND ITS SERIALIZER SURVIVAL ───────────────────────────────────

Deno.test("item414: the stamp lands on the record both artifacts derive from", () => {
  const report = assemble(THIN);
  const internal = (report._meta as any)?.internal;
  assertEquals(internal?.ir_pipeline_stamp, IR_PIPELINE_STAMP);
  assert(report.standing_playbook && report.incident_worksheet);
});

Deno.test("item414: the stamp survives the P2 whitelist serializer", async () => {
  const { serializeCustomerReport } = await import("../../../supabase/functions/_shared/report-serialize.ts");
  const { IR_PLAYBOOK_REPORT_SCHEMA } = await import("../../../supabase/functions/generate-ir-playbook/_local/report-schemas/ir-playbook.ts");
  const report = assemble(THIN);
  const { report: out, telemetry } = serializeCustomerReport(report as any, IR_PLAYBOOK_REPORT_SCHEMA);
  assertEquals(telemetry.crashed, false);
  assertEquals(((out as any)._meta?.internal ?? {}).ir_pipeline_stamp, IR_PIPELINE_STAMP);
  assert((out as any).standing_playbook?.unrecorded_ledger, "the ledger must survive serialization");
  assert((out as any).incident_worksheet?.forms?.length > 0);
});
