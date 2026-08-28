// E8973164 (2026-08-28, quality batch) — IR playbook defects, all traced to
// `responseTeamRoster` and `breachNoticeContracts` arriving in shapes the
// consumers did not anticipate:
//
// 1. MEDIUM/HIGH actionability — `responseTeamRoster` as an OBJECT keyed by
//    arbitrary camelCase role slugs (itForensicsLead, incidentResponseLead,
//    privacyCounsel, ...) each carrying {name, title, email, phone} was
//    read by `asArray()` as empty, so the Art. 33(3) action plan fell back
//    to "assign on the recorded roster" for every element despite the
//    record naming Tomasz Wierzbicki, Harriet Okonkwo and Declan Farrell in
//    full, and the (b) DPO-contact element (which had its own prior fix,
//    D1D2B3B8-I2, for exactly one hardcoded key spelling
//    "dataProtectionOfficer") stayed "Outstanding" because this fixture's
//    key was "privacyCounsel" instead.
//
// 2. MEDIUM boilerplate — `breachNoticeContracts` rows carrying
//    `noticePeriod` (free text) and `contractReference` (not this
//    normalizer's `deadline`/`clauseRef`/`contractRef`) rendered an empty
//    deadline and an empty clause reference for every counterparty, so all
//    three rendered the identical bare sentence.
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildIrPlaybookDeliverables,
  normalizeBreachNoticeContracts,
  normalizeResponseTeamRoster,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { buildStandingPlaybook } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/standing-playbook.ts";
import { buildEscalationProse, composeContractualTriggers } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";

const OBJECT_ROSTER = {
  incidentResponseLead: { name: "Harriet Okonkwo", title: "Chief Information Security Officer", email: "h.okonkwo@example.com", phone: "+44 20 7946 0831" },
  itForensicsLead: { name: "Tomasz Wierzbicki", title: "Head of Cyber Threat Intelligence", email: "t.wierzbicki@example.com", phone: "+44 20 7946 0955" },
  privacyCounsel: { name: "Declan Farrell", title: "Group Data Protection Officer", email: "d.farrell@example.com", phone: "+353 1 555 0274" },
};

Deno.test("E8973164-I1 — normalizeResponseTeamRoster finds roles by key words + title on an object-shaped roster", () => {
  const rows = normalizeResponseTeamRoster({ responseTeamRoster: OBJECT_ROSTER } as never);
  assert(rows.length === 3);
  const forensics = rows.find((r) => /forensic/.test(r.searchable));
  assert(forensics && forensics.name === "Tomasz Wierzbicki");
  const dpo = rows.find((r) => /data protection/.test(r.searchable));
  assert(dpo && dpo.name === "Declan Farrell");
});

Deno.test("E8973164-I1 — the array-of-rows roster shape still works unchanged", () => {
  const rows = normalizeResponseTeamRoster({
    responseTeamRoster: [
      { role: "Incident Commander", primary: "Jane Doe", email: "jane@example.com" },
    ],
  } as never);
  assert(rows.length === 1);
  assert(rows[0].name === "Jane Doe");
  assertStringIncludes(rows[0].searchable, "incident commander");
});

Deno.test("E8973164-I1 — the (b) DPO-contact content element is not 'Outstanding' when the roster key is 'privacyCounsel'", () => {
  const built = buildIrPlaybookDeliverables({
    organizationName: "Crestline Financial Services",
    cause: "Phishing / credential compromise",
    dataTypes: ["Financial account numbers", "Government identifiers"],
    affectedDataSubjectCount: "42,000",
    affectedRecordCount: "42,000",
    jurisdictions: ["UK"],
    responseTeamRoster: OBJECT_ROSTER,
  } as never);
  const dpoElement = built.content_owner_mapping.elements.find((e) => e.element === "b_dpo_contact")!;
  assert(dpoElement.status === "analysed", `DPO element must resolve from the roster: ${JSON.stringify(dpoElement)}`);
  assertStringIncludes(dpoElement.record_value, "Declan Farrell");
});

Deno.test("E8973164-I2 — contractual notification lines differ per counterparty when rows use noticePeriod/contractReference", () => {
  const text = composeContractualTriggers({
    cause: "Phishing / credential compromise",
    discoveryDateTime: "2026-03-01T00:00:00Z",
    breachNoticeContracts: {
      obligations: [
        {
          contractReference: "Data Processing Agreement DPA-CLF-2024-07, Clause 9.2",
          counterparty: "Vaultridge Cloud Solutions",
          noticePeriod: "Processor must notify Crestline within 24 hours of becoming aware of any personal data breach",
        },
        {
          contractReference: "Payment Processing Services Agreement, Section 14.3",
          counterparty: "FinnCore Payments Network",
          noticePeriod: "Crestline must notify FinnCore within 48 hours of a confirmed breach affecting payment card data",
        },
      ],
    },
  } as never);
  assertStringIncludes(text, "within 24 hours");
  assertStringIncludes(text, "within 48 hours of a confirmed breach affecting payment card data");
  assertStringIncludes(text, "DPA-CLF-2024-07");
  assertStringIncludes(text, "Section 14.3");
  const vaultridgeLine = text.split("\n").find((l) => l.includes("Vaultridge"))!;
  const finnCoreLine = text.split("\n").find((l) => l.includes("FinnCore"))!;
  assert(vaultridgeLine !== finnCoreLine, "the two counterparties must not render identically");
});

// ── E8973164 FOLLOW-UP (CEO old-vs-new PDF comparison, 2026-08-28) ──────────
// The standing playbook (Part One) had TWO MORE consumers of the same
// structured fields with the same array-only blindness: buildResponseTeam and
// buildContractualNotifications (standing-playbook.ts), plus the escalation-
// path prose slot (buildEscalationProse). On the Crestline record these
// carried "Response team and alternates" and "Contractual notification
// obligations" as UNRECORDED (the ledger's "3 standing sections are not
// settled") and dropped the escalation sentence entirely, against an intake
// naming a full 7-role roster and three counterparty contracts.

const OBJECT_CONTRACTS = {
  obligations: [
    {
      contractReference: "Data Processing Agreement DPA-CLF-2024-07, Clause 9.2",
      counterparty: "Vaultridge Cloud Solutions",
      noticePeriod: "Processor must notify Crestline within 24 hours of becoming aware of any personal data breach",
    },
    {
      contractReference: "Payment Processing Services Agreement, Section 14.3",
      counterparty: "FinnCore Payments Network",
      noticePeriod: "Crestline must notify FinnCore within 48 hours of a confirmed breach affecting payment card data",
    },
  ],
};

Deno.test("E8973164-I3 — the standing playbook's response-team section is complete on an object-shaped roster", () => {
  const pb = buildStandingPlaybook({ organizationName: "Crestline", responseTeamRoster: OBJECT_ROSTER } as never);
  const team = pb.sections.find((s) => s.id === "response_team")!;
  assert(team.kind === "table", `response_team must render as a table, not a gap: ${JSON.stringify(team)}`);
  const rows = (team as { rows: string[][] }).rows;
  assert(rows.length === 3);
  assert(rows.some((r) => r.some((c) => c.includes("Tomasz Wierzbicki"))), JSON.stringify(rows));
  assert(rows.some((r) => r.some((c) => c.includes("Group Data Protection Officer"))), JSON.stringify(rows));
  assert(
    !pb.information_needed.some((n) => /response role with a named primary/i.test(n)),
    "the roster must not be ledgered as unrecorded",
  );
});

Deno.test("E8973164-I3 — the standing playbook's contracts section is complete on the obligations-object shape", () => {
  const pb = buildStandingPlaybook({ organizationName: "Crestline", breachNoticeContracts: OBJECT_CONTRACTS } as never);
  const table = pb.sections.find((s) => s.id === "contractual_notifications")!;
  assert(table.kind === "table", `contracts must render as a table, not a gap: ${JSON.stringify(table)}`);
  const rows = (table as { rows: string[][] }).rows;
  assert(rows.length === 2);
  assert(rows.some((r) => r.includes("FinnCore Payments Network")));
  assert(rows.some((r) => r.some((c) => c.includes("Section 14.3"))));
  const finding = pb.sections.find((s) => s.id === "contractual_notification_finding")!;
  assert((finding as { status: string }).status === "analysed", "the determination must not degrade to record_insufficient");
  assert(
    !pb.information_needed.some((n) => /breach-notice clause/i.test(n)),
    "the contracts must not be ledgered as unrecorded",
  );
});

Deno.test("E8973164-I3 — the tighter-clock detection reads noticePeriod text (sub-24h clause governs; 24h+ runs in parallel per the existing proxy)", () => {
  // The ratified proxy for "tighter than the statutory window" is a period
  // STRICTLY shorter than 24 hours (regex 0–23 hours). A 12-hour clause in
  // noticePeriod free text must now be seen; the Crestline 24h/48h clauses
  // correctly stay on the parallel verdict under the existing semantics.
  const pb = buildStandingPlaybook({ organizationName: "Crestline", breachNoticeContracts: OBJECT_CONTRACTS } as never);
  const finding = pb.sections.find((s) => s.id === "contractual_notification_finding")!;
  assert((finding as { verdict: string }).verdict === "contractual_duties_run_in_parallel");

  const pbTight = buildStandingPlaybook({
    organizationName: "Crestline",
    breachNoticeContracts: {
      obligations: [{
        counterparty: "Acme Clearing",
        noticePeriod: "Notify Acme within 12 hours of any suspected breach",
        contractReference: "MSA § 9",
      }],
    },
  } as never);
  const findingTight = pbTight.sections.find((s) => s.id === "contractual_notification_finding")!;
  assert(
    (findingTight as { verdict: string }).verdict === "contractual_clock_governs",
    `a 12-hour clause in noticePeriod text must trip the tighter-clock branch: ${JSON.stringify(findingTight)}`,
  );
});

Deno.test("E8973164-I3 — the escalation-path prose renders from an object-shaped roster", () => {
  const prose = buildEscalationProse({ responseTeamRoster: OBJECT_ROSTER } as never);
  assertStringIncludes(prose, "Harriet Okonkwo");
  assertStringIncludes(prose, "Tomasz Wierzbicki");
  assertStringIncludes(prose, "Declan Farrell");
});

Deno.test("E8973164-I3 — normalizeBreachNoticeContracts handles the flat-array legacy shape unchanged", () => {
  const rows = normalizeBreachNoticeContracts({
    breachNoticeContracts: [
      { party: "Acme Corp", deadline: "48 hours", clauseRef: "Clause 12" },
    ],
  } as never);
  assert(rows.length === 1);
  assert(rows[0].party === "Acme Corp" && rows[0].deadline === "48 hours" && rows[0].clause === "Clause 12");
});
