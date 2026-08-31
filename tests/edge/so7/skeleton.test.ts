// SO-7 — IR PLAYBOOK SKELETON CONFORMANCE BATTERY.
//
// Proves: the spine is byte-pinned to the CEO-corrected v3 skeleton (hash
// recomputed here over the paragraph list), the eight CEO-resolved slots
// cannot come back under their old names, every slot in the fixed prose has a
// live binding in the slot map and vice versa, the assembled document
// byte-matches the skeleton outside the slots, the v3 banned register never
// reaches the customer, the worksheet degrades to honest blanks and is never
// padded, the processors conditional fires only on its trigger and opens with
// the pinned first words, the two registers do not mix, and the two SO-3
// defect classes (proper-noun case-folding, abbreviation-blind truncation)
// cannot recur.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  IR_PROCESSOR_FIXED_FIRST_WORDS,
  IR_SKELETON_CONTENT_HASH,
  IR_SKELETON_PARAGRAPHS,
  IR_SKELETON_PINPOINTS,
  IR_SKELETON_SECTIONS,
  IR_SKELETON_SUBTITLE,
  IR_TEMPLATE_FRAMING_NOTE,
  IR_V3_BANNED_REGISTER,
} from "../../../supabase/functions/generate-ir-playbook/_local/prose/plans/ir-playbook.spine.ts";
import {
  IR_RETIRED_SLOTS,
  IR_SLOT_MAP,
} from "../../../supabase/functions/generate-ir-playbook/_local/prose/plans/ir-playbook.slotmap.ts";
import { skeletonDocumentToText, slotsIn } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { assembleIRSkeletonDocument } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { IR_PLAYBOOK_VERIFIED_AUTHORITIES } from "../../../supabase/functions/generate-ir-playbook/_local/registry/ir-playbook-verified-authorities.ts";

const INTAKE: Record<string, unknown> = {
  organizationName: "Northwind Logistics Group",
  organisationType: "Healthcare provider",
  discoveryDateTime: "2026-08-04T09:15:00Z",
  cause: "Ransomware or malware",
  dataTypes: ["Names and contact details", "Health / medical records"],
  affectedCount: "1,000\u201310,000",
  jurisdictions: ["Ireland", "United Kingdom"],
  contained: "No",
  processorInvolved: true,
  processorName: "Aventine Hosting Ltd",
  responseTeamRoster: [
    { role: "Incident Lead", primary: "R. Delacroix", alternate: "M. O'Shea" },
    { role: "Communications Lead", primary: "T. Bergström", alternate: "" },
  ],
  outsideCounselName: "Fitzgerald & Roe LLP",
  outsideCounselContact: "+353 1 555 0100",
  forensicVendorContact: "Cirrus Forensics",
  insurerContact: "Anselm Underwriting",
};

const REPORT: Record<string, unknown> = {
  standing_playbook: {
    status: "record_insufficient",
    sections: [
      { id: "response_team", heading: "Response team and alternates", status: "analysed" },
      { id: "key_contacts", heading: "Key contacts", status: "analysed" },
      {
        id: "testing_training",
        heading: "Testing and training",
        status: "record_insufficient",
        information_needed: "Record the date of the last tabletop exercise and the next scheduled one",
      },
    ],
    information_needed: ["Record the date of the last tabletop exercise and the next scheduled one"],
  },
  notification_duties: [
    {
      regime: "eu",
      regime_label: "EU GDPR",
      supervisory_authority: "the Data Protection Commission (Ireland)",
      sa_notification_determination: {
        regime: "eu",
        regime_label: "EU GDPR",
        verdict: "notification_required",
        standard_citation: "GDPR Art. 33(1)",
        why: "The affected categories include health data and the incident is not recorded as contained. The risk to rights and freedoms is not unlikely on those answers.",
        status: "analysed",
      },
      data_subject_communication_determination: {
        verdict: "communication_required",
        why: "Health data with an uncontained hostile cause meets the high-risk threshold.",
      },
    },
    {
      regime: "uk",
      regime_label: "UK GDPR",
      supervisory_authority: "the Information Commissioner's Office",
      sa_notification_determination: {
        regime: "uk",
        regime_label: "UK GDPR",
        verdict: "undetermined_on_the_record",
        standard_citation: "UK GDPR Art. 33(1)",
        why: "Whether UK data subjects are affected is not established on the answers given.",
        information_needed: "Whether any UK-resident individuals are among those affected",
        status: "record_insufficient",
      },
      data_subject_communication_determination: {},
    },
  ],
  sa_notification_determination: {
    regime_label: "EU GDPR",
    verdict: "notification_required",
    standard_citation: "GDPR Art. 33(1)",
  },
  content_owner_mapping: {
    elements: [
      { element: "a_nature", action: "Establish the nature of the breach and the categories concerned", owner: "Security / Forensics Lead", phase: "First 24 hours" },
      { element: "b_dpo_contact", action: "Give the name and contact details of the data protection officer", owner: "Legal", phase: "First hour" },
    ],
  },
  authority_exhibit: {
    entries: [
      { citation: "GDPR Art. 33(1)", authority_class: "regulation" },
      { citation: "GDPR Art. 33(2)", authority_class: "regulation" },
      { citation: "GDPR Art. 28(3)(f)", authority_class: "regulation" },
      { citation: "GDPR Art. 99", authority_class: "regulation" },
    ],
  },
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("SO-7: the spine is byte-pinned to the CEO-corrected skeleton", async () => {
  assertEquals(IR_SKELETON_PARAGRAPHS.length, 17);
  assertEquals(await sha256(IR_SKELETON_PARAGRAPHS.join("\n")), IR_SKELETON_CONTENT_HASH);
});

Deno.test("SO-7: pinpoints in fixed prose match the verified registry byte-for-byte", () => {
  const byPinpoint: Record<string, string> = {
    "GDPR Art. 33(2)":
      IR_PLAYBOOK_VERIFIED_AUTHORITIES.processor_notify_controller_without_undue_delay.verbatim_quote,
    "GDPR Art. 28(3)(f)":
      IR_PLAYBOOK_VERIFIED_AUTHORITIES.processor_assists_arts_32_to_36.verbatim_quote,
  };
  for (const p of IR_SKELETON_PINPOINTS) {
    assertEquals(p.verbatim, byPinpoint[p.pinpoint], `pinpoint drift: ${p.pinpoint}`);
  }
});

Deno.test("SO-7: slot map is complete in both directions", () => {
  const inSpine = new Set<string>();
  for (const section of IR_SKELETON_SECTIONS) {
    for (const block of section.blocks) {
      if (block.kind !== "skeleton") continue;
      for (const slot of slotsIn(block.text)) inSpine.add(slot);
    }
  }
  for (const slot of slotsIn(IR_SKELETON_SUBTITLE)) inSpine.add(slot);

  const mapped = new Set(IR_SLOT_MAP.map((b) => b.slot));
  for (const slot of inSpine) assert(mapped.has(slot), `unmapped slot: ${slot}`);
  for (const slot of mapped) assert(inSpine.has(slot), `slot map carries a slot the spine no longer has: ${slot}`);
});

Deno.test("SO-7: the eight CEO-resolved slot names cannot come back", () => {
  const all = [...IR_SKELETON_PARAGRAPHS].join("\n");
  for (const retired of IR_RETIRED_SLOTS) {
    assert(!all.includes(`{${retired}`), `retired slot re-introduced: ${retired}`);
  }
  assertEquals(IR_RETIRED_SLOTS.length, 8);
});

Deno.test("SO-7: assembled document conforms and carries no banned register", () => {
  const out = assembleIRSkeletonDocument(REPORT, INTAKE);
  assertEquals(out.conformance, []);
  assertEquals(out.register_findings, []);
  const text = skeletonDocumentToText(out.document);
  for (const banned of IR_V3_BANNED_REGISTER) {
    assert(!text.toLowerCase().includes(banned), `banned register reached the customer: ${banned}`);
  }
});

Deno.test("SO-7: fixed prose renders with the reader's own labels, never case-folded", () => {
  const text = skeletonDocumentToText(assembleIRSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes("Northwind Logistics Group"));
  assert(text.includes("(Healthcare provider)"), "sector label was case-folded or dropped");
  assert(text.includes("R. Delacroix"));
  assert(text.includes("Fitzgerald & Roe LLP"));
  assert(text.includes("Aventine Hosting Ltd"));
  assert(!text.includes("northwind"), "organisation name was case-folded");
});

Deno.test("SO-7: the byte-pinned framing note is printed verbatim without its marker", () => {
  const text = skeletonDocumentToText(assembleIRSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes(IR_TEMPLATE_FRAMING_NOTE));
  assert(!text.includes("[BYTE-PINNED]"));
  assert(!text.includes("[REGISTER RULE]"), "authoring law leaked into the customer document");
  assert(!text.includes("[GENERATED]") && !text.includes("[DETERMINATION LEAD]") && !text.includes("[CONDITIONAL]"));
});

Deno.test("SO-7: the processors conditional fires only on its trigger, with the pinned first words", () => {
  const on = skeletonDocumentToText(assembleIRSkeletonDocument(REPORT, INTAKE).document);
  assert(on.includes(IR_PROCESSOR_FIXED_FIRST_WORDS));
  assert(on.includes("The processor shall notify the controller without undue delay after becoming aware of a personal data breach."));
  assert(on.includes("assists the controller in ensuring compliance with the obligations pursuant to Articles 32 to 36"));

  const off = skeletonDocumentToText(
    assembleIRSkeletonDocument(REPORT, { ...INTAKE, processorInvolved: false, processorName: "" }).document,
  );
  assert(!off.includes(IR_PROCESSOR_FIXED_FIRST_WORDS));
});

Deno.test("SO-7: notification analysis is jurisdiction by jurisdiction and reserves what is reserved", () => {
  // D1D2B3B8-I1/I2 (2026-08-28) — the assembler now composes the
  // notification surfaces from the PURE builder over the live intake (the
  // attached report's copies pass through post-attach sweeps that mangled
  // them in live batch d1d2b3b8), so the pins below assert the builder's own
  // determinations for this intake rather than the hand-authored REPORT
  // fixtures the composer previously echoed.
  const text = skeletonDocumentToText(assembleIRSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes("GDPR (Regulation (EU) 2016/679)"));
  assert(text.includes("UK GDPR"));
  assert(text.includes("the competent supervisory authority"));
  assert(text.includes("is not determined, and that determination is reserved"));
  // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, EU
  // Incident P0-2) — plain language, not the raw field names.
  assert(text.includes("What would settle it is whether the affected data were encrypted"));
  assert(!text.includes("encryptionStatus"));
  assert(text.includes("The action plan, in the order the clocks run:"));
});

Deno.test("SO-7 (D1D2B3B8-I1): a record with no GDPR-family jurisdiction gets its own clocks, never the GDPR apparatus", () => {
  const usIntake = {
    ...INTAKE,
    jurisdictions: ["United States (HIPAA)", "California", "Texas", "Florida"],
  };
  const text = skeletonDocumentToText(assembleIRSkeletonDocument(REPORT, usIntake).document);
  assert(text.includes("No EU or UK jurisdiction is recorded"), "the not-engaged posture must be stated");
  assert(!text.includes("72-hour outer limit runs to"), "no GDPR clock may be computed");
  assert(!text.includes("GDPR Art. 33(3)(a)"), "the Art. 33(3) content plan must not render");
  assert(!text.includes("Communication to the affected data subjects is required"), "no Art. 34 conclusion may be asserted");
  assert(text.includes("California"), "the state clocks must carry the analysis");
  assert(text.includes("Fla. Stat.") && text.includes("501.171"), "Florida's registry row must render with its citation");
  // The processor block survives but states contractual, not GDPR, clocks.
  assert(text.includes("Aventine Hosting Ltd"));
  assert(!text.includes("The processor shall notify the controller without undue delay"), "GDPR Art. 33(2) must not be quoted");
});

Deno.test("SO-7: a blank worksheet degrades to honest blanks and is never padded", () => {
  const blankIntake = {
    organizationName: "Northwind Logistics Group",
    organisationType: "Healthcare provider",
    responseTeamRoster: (INTAKE as Record<string, unknown>).responseTeamRoster,
  };
  const out = assembleIRSkeletonDocument({ standing_playbook: (REPORT as any).standing_playbook }, blankIntake);
  assertEquals(out.conformance, []);
  const text = skeletonDocumentToText(out.document);
  assert(text.includes("ships blank by design"));
  assert(!text.includes("The company classifies the incident as"), "an unanswered worksheet clause was padded");
  assert(!text.includes("containment state"), "an unanswered containment clause was padded");
  assert(!text.includes("Not recorded") && !text.includes("TBD") && !text.includes("N/A"));
});

Deno.test("SO-7: the two registers do not mix", () => {
  const playbook = IR_SLOT_MAP.filter((b) => b.register === "playbook").map((b) => b.slot);
  const worksheet = IR_SLOT_MAP.filter((b) => b.register === "worksheet").map((b) => b.slot);
  for (const slot of playbook) assert(!worksheet.includes(slot));
  // Blank-by-design belongs to the worksheet only; playbook slots are never
  // "blank by design" — an absent playbook answer goes on the ledger.
  for (const b of IR_SLOT_MAP) {
    if (b.register === "playbook") assertEquals(b.blank_by_design, false, `${b.slot} must not be blank-by-design`);
  }
  assertEquals(worksheet.length, 5);
});

Deno.test("SO-7: the Table of Authorities is iff-cited", () => {
  const text = skeletonDocumentToText(assembleIRSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes("GDPR Art. 33(1)"));
  assert(text.includes("GDPR Art. 33(2)"));
  assert(text.includes("GDPR Art. 28(3)(f)"));
  assert(!text.includes("GDPR Art. 99"), "an uncited authority reached the Table of Authorities");
});

Deno.test("SO-7: statutory abbreviations survive sentence handling", () => {
  const text = skeletonDocumentToText(assembleIRSkeletonDocument(REPORT, INTAKE).document);
  assert(text.includes("GDPR Art. 33(1)"), "abbreviation-blind truncation clipped a pinpoint");
  assert(text.includes("NIST SP 800-61r3"));
});
