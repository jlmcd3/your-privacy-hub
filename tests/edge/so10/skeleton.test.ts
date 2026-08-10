// SO-10 — RoPA REGISTER SKELETON CONFORMANCE BATTERY.
//
// Proves: the spine is byte-pinned to the governing Aug-10 v3 skeleton (hash
// recomputed here over the paragraph list), the assembled register byte-matches
// the skeleton outside the slots, every Art. 30(1)(a)-(g) column label maps to
// the limb of the approved corpus text it claims to record, {home_base} renders
// as a REGION label and never as a fabricated country, the absent branch drops
// the whole home-base sentence honestly, the two-part access-controls answer
// renders as ONE fact, related assessments cite only the company's own
// documents, the completeness review names what is missing rather than
// asserting completeness, the Table of Authorities is iff-cited, and the v3
// banned register never reaches the customer.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ART30_SUBITEMS,
  ART30_VERIFIED_LIMBS,
  ROPA_SKELETON_CONTENT_HASH,
  ROPA_SKELETON_PARAGRAPHS,
  ROPA_SKELETON_PINPOINTS,
  ROPA_V3_BANNED_REGISTER,
} from "../../../supabase/functions/generate-ropa-document/register/ropa.spine.ts";
import {
  assembleRopaRegister,
  ROPA_HOME_BASE_LABELS,
  ROPA_PIPELINE_STAMP,
  type RopaActivityInput,
  type RopaAssembleInput,
} from "../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";

const ACTIVITY: RopaActivityInput = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Customer support ticketing",
  owner: "Head of Customer Operations",
  purpose: "resolving support requests and tracking service quality",
  lawfulBasis: "Legitimate interests",
  dataSubjects: "customers and prospective customers",
  dataCategories: "identity data, contact data, correspondence content",
  collectionSources: "the individual directly and the company's web forms",
  processingOperations: "collection, storage, consultation, erasure",
  recipients: "Zendesk, Inc. (support platform)",
  retention: "24 months from ticket closure",
  retentionByCategory: null,
  security: "encryption in transit and at rest, logging, annual penetration testing",
  accessControls: "role-based access limited to the support team, reviewed quarterly",
  transferDestination: "United States",
  transferMechanism: "EU Commission standard contractual clauses (2021/914)",
  transferBasis: "Art. 46(2)(c) GDPR",
  rightsHandling: "through a central privacy inbox within one month",
  rightsOverride: "",
  relatedAssessments: ["Legitimate Interest Assessment — Customer support ticketing (2026-05-04)"],
  noticesDisplayed: "the customer privacy notice, linked at the point of collection",
  incidentLog: "maintained in the incident register; no incidents in the period",
};

const INPUT: RopaAssembleInput = {
  organisationName: "Halden Data Services Ltd",
  legalEntityType: "private_limited",
  incorporationJurisdiction: "England and Wales",
  registrationNumber: "09912345",
  registeredAddress: "18 Copperfield Row, London EC1V 4PW",
  isController: true,
  isProcessor: false,
  dpoName: "Ingrid Halden",
  dpoEmail: "dpo@haldendata.example",
  dpoPhone: "+44 20 7946 0102",
  euRepName: "Halden Data Ireland Ltd",
  euRepEmail: "eurep@haldendata.example",
  ukRepName: "",
  ukRepEmail: "",
  homeBase: "EU_EEA",
  employeeBand: "50-249",
  jurisdictionCodes: ["EU", "UK"],
  jurisdictionLabels: ["EU GDPR", "UK GDPR"],
  activities: [ACTIVITY],
};

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("spine is byte-pinned to the governing skeleton", async () => {
  assertEquals(ROPA_SKELETON_PARAGRAPHS.length, 12);
  assertEquals(await sha256(ROPA_SKELETON_PARAGRAPHS.join("\n")), ROPA_SKELETON_CONTENT_HASH);
});

Deno.test("assembly is conformant and carries the SO-10 stamp", () => {
  const out = assembleRopaRegister(INPUT);
  assertEquals(out.conformance.ok, true, JSON.stringify(out.conformance.findings));
  assertEquals(out.stamp, ROPA_PIPELINE_STAMP);
  assertEquals(out.skeleton_hash, ROPA_SKELETON_CONTENT_HASH);
  assertEquals(out._typed, "ropa-register-document@so10");
});

Deno.test("every Art. 30(1)(a)-(g) column label maps to the verified limb", () => {
  const out = assembleRopaRegister(INPUT);
  const cells = out.activity_records[0].art30;
  assertEquals(cells.length, ART30_SUBITEMS.length);
  for (const cell of cells) {
    const limb = ART30_VERIFIED_LIMBS[cell.key];
    assert(limb, `no verified limb for ${cell.key}`);
    // Each label's substantive noun phrase must appear in the verified limb.
    const words = cell.label
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4);
    const hit = words.some((w) => limb.toLowerCase().includes(w.replace(/s$/, "")));
    assert(hit, `label "${cell.label}" does not track Art. 30(1)(${cell.key})`);
  }
});

Deno.test("every statutory pinpoint is registered against an approved corpus row", () => {
  assertEquals(ROPA_SKELETON_PINPOINTS.length, 4);
  for (const pin of ROPA_SKELETON_PINPOINTS) {
    assert(/^(gdpr|ukgdpr)-art-(27|30)$/.test(pin.provisionKey), pin.provisionKey);
    assert(pin.verifiedFragment.length > 40, pin.pinpoint);
  }
  // The fixed prose quotes no statute; it cites. Guard that.
  const quoted = ROPA_SKELETON_PARAGRAPHS.join("\n");
  assert(!quoted.includes("shall maintain a record of processing activities"));
});

Deno.test("{home_base} renders as a region label, never a country", () => {
  for (const [code, label] of Object.entries(ROPA_HOME_BASE_LABELS)) {
    const out = assembleRopaRegister({ ...INPUT, homeBase: code });
    assert(out.text.includes(`It operates from ${label}`), `${code} → ${label}`);
  }
  // A region answer is never stretched into a specific country.
  const eu = assembleRopaRegister({ ...INPUT, homeBase: "EU_EEA" });
  assert(!/It operates from (Germany|France|Ireland|the Netherlands)/.test(eu.text));
});

Deno.test("absent home base drops the sentence honestly", () => {
  const out = assembleRopaRegister({ ...INPUT, homeBase: "" });
  assertEquals(out.conformance.ok, true, JSON.stringify(out.conformance.findings));
  assert(!out.text.includes("It operates from "));
  assert(out.text.includes("It operates across"));
});

Deno.test("the two-part access-controls answer renders as ONE fact", () => {
  const out = assembleRopaRegister(INPUT);
  const body = out.activity_records[0].sentence;
  assertEquals(body.split("access is controlled as the company describes").length - 1, 1);
  assert(body.includes(ACTIVITY.accessControls));
});

Deno.test("related assessments cite only the company's own documents", () => {
  const out = assembleRopaRegister(INPUT);
  assert(out.text.includes("Legitimate Interest Assessment — Customer support ticketing"));
  const none = assembleRopaRegister({
    ...INPUT,
    activities: [{ ...ACTIVITY, relatedAssessments: [] }],
  });
  assert(!none.text.includes("Legitimate Interest Assessment —"));
});

Deno.test("completeness review names what is missing rather than asserting completeness", () => {
  const gappy = assembleRopaRegister({
    ...INPUT,
    activities: [{ ...ACTIVITY, retention: "", purpose: "" }],
  });
  assertEquals(gappy.completeness.complete, false);
  assert(gappy.completeness.activities_incomplete >= 1);
  const missing = gappy.completeness.missing_by_activity[0].missing.join(" ");
  assert(missing.length > 0);
});

Deno.test("Table of Authorities is cited iff it appears", () => {
  const out = assembleRopaRegister(INPUT);
  for (const cited of out.citation_ledger) {
    assert(out.table_of_authorities.includes(cited), `ToA missing ${cited}`);
  }
  for (const line of out.table_of_authorities.split("\n")) {
    const m = /Art\. \d+[^\s]*/.exec(line);
    if (!m) continue;
    assert(
      out.citation_ledger.some((c) => c.includes(m[0])),
      `ToA carries an uncited authority: ${line}`,
    );
  }
});

Deno.test("the v3 banned register never reaches the customer", () => {
  const out = assembleRopaRegister(INPUT).text.toLowerCase();
  for (const phrase of ROPA_V3_BANNED_REGISTER) {
    assert(!out.includes(phrase), `banned register phrase leaked: ${phrase}`);
  }
  // Authoring law never prints.
  assert(!out.includes("register guide (v3"));
  assert(!out.includes("[repeating record"));
  assert(!out.includes("[determination lead]"));
  assert(!out.includes("[generated]"));
});
