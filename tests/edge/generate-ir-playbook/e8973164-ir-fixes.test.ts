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
  normalizeResponseTeamRoster,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { composeContractualTriggers } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";

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
