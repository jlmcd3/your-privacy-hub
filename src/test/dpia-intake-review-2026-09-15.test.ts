// DPIA Intake Master Review (2026-09-15) — pins for the pure intake helpers
// (F01 screening negation and shared labels, F04 supplier restore, F05/F11
// transfer rows, F08 special-category status, F09 alternatives).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  assertedMentions,
  dpiaScreeningPrompts,
  specialCategoryStatus,
  art9Asked,
  art9PayloadValue,
  ART9_NOT_APPLICABLE_BIOMETRIC,
  splitOtherProcessor,
  normaliseTransferRow,
  transferRowsIssue,
  emptyTransferRow,
  TRANSFER_PRESENCE_YES,
  TRANSFER_PRESENCE_NO,
  normaliseAlternativeRow,
  alternativesIssue,
  isEeaCountry,
  BIOMETRIC_NO,
  BIOMETRIC_YES,
} from "@/lib/dpiaIntake";
import { ARTICLE_9_CONDITIONS, BIOMETRIC_UNIQUE_ID, TRANSFER_PRESENCE, PROCESSING_END_STATUS, DATA_CATS } from "@/pages/DPIAFramework.enums";
import {
  DPIA_ART9, DPIA_BIOMETRIC_UNIQUE_ID, DPIA_TRANSFER_PRESENCE, DPIA_PROCESSING_END_STATUS,
  dpiaFrameworkContract,
} from "../../supabase/functions/_shared/intake-contracts/dpia-framework";

const page = readFileSync("src/pages/DPIAFramework.tsx", "utf8");

describe("F01 — screening predicates", () => {
  it("honours negation inside a clause and asserts across a contrastive connector", () => {
    expect(assertedMentions("We do not perform profiling or automated decisions.", "profil")).toEqual({ asserted: 0, negated: 1 });
    expect(assertedMentions("We do not track people, but we do profile purchases.", "profil")).toEqual({ asserted: 1, negated: 0 });
    expect(assertedMentions("Note: profiling is used for pricing.", "profil")).toEqual({ asserted: 1, negated: 0 });
  });

  it("raises no Art. 35(3)(a) prompt on a negated profiling statement and names the negated cue", () => {
    const r = dpiaScreeningPrompts({ dataCategories: ["Contact details"], description: "The activity does not involve profiling or automated decisions." });
    expect(r.prompts.map((p) => p.citation)).toEqual([]);
    expect(r.negated).toContain("profil");
  });

  it("uses the shared data-category label for health data and phrases special-category as a check", () => {
    expect(DATA_CATS).toContain("Health or medical data");
    const r = dpiaScreeningPrompts({ dataCategories: ["Health or medical data"], description: "" });
    expect(r.prompts).toHaveLength(1);
    expect(r.prompts[0].citation).toBe("Art. 35(3)(b) GDPR");
    expect(r.prompts[0].label).toMatch(/^Check whether/);
    expect(r.prompts[0].label).not.toMatch(/Large-scale processing of special category data/);
  });

  it("biometric data alone is an OPEN check, and no check at all once the company says it does not identify people", () => {
    const open = dpiaScreeningPrompts({ dataCategories: ["Biometric data"], description: "" });
    expect(open.prompts[0].basis).toMatch(/not yet stated/);
    const none = dpiaScreeningPrompts({ dataCategories: ["Biometric data"], description: "", biometricAnswer: BIOMETRIC_NO });
    expect(none.prompts).toEqual([]);
  });

  it("children's data is a WP248 criterion prompt, not an Art. 35(3) trigger", () => {
    const r = dpiaScreeningPrompts({ dataCategories: ["Children's data"], description: "" });
    expect(r.prompts[0].citation).toMatch(/Recital 38/);
    expect(r.prompts[0].stillNeeded).toMatch(/not an Art\. 35\(3\) trigger on its own/);
  });
});

describe("F08 — special-category status and Art. 9 payload", () => {
  it("health is established; biometric follows the purpose answer; unstated purpose is open", () => {
    expect(specialCategoryStatus(["Health or medical data"], "")).toBe("established");
    expect(specialCategoryStatus(["Biometric data"], BIOMETRIC_YES)).toBe("established");
    expect(specialCategoryStatus(["Biometric data"], BIOMETRIC_NO)).toBe("not_established");
    expect(specialCategoryStatus(["Biometric data"], "")).toBe("open");
    expect(specialCategoryStatus(["Contact details"], "")).toBe("none");
  });
  it("the selector is asked for established and open; not-established travels the explicit not-applicable answer", () => {
    expect(art9Asked("established")).toBe(true);
    expect(art9Asked("open")).toBe(true);
    expect(art9Asked("not_established")).toBe(false);
    expect(art9PayloadValue("not_established", "")).toBe(ART9_NOT_APPLICABLE_BIOMETRIC);
    expect(art9PayloadValue("none", ARTICLE_9_CONDITIONS[0])).toBe("");
    expect(art9PayloadValue("established", ARTICLE_9_CONDITIONS[0])).toBe(ARTICLE_9_CONDITIONS[0]);
  });
  it("the contract and the form carry the two honest Art. 9 answers and the biometric-purpose enum verbatim", () => {
    expect([...DPIA_ART9]).toEqual([...ARTICLE_9_CONDITIONS]);
    expect(ARTICLE_9_CONDITIONS).toContain(ART9_NOT_APPLICABLE_BIOMETRIC);
    expect(ARTICLE_9_CONDITIONS).toContain("Not yet established — condition still to be identified");
    expect([...DPIA_BIOMETRIC_UNIQUE_ID]).toEqual([...BIOMETRIC_UNIQUE_ID]);
    expect([...DPIA_TRANSFER_PRESENCE]).toEqual([...TRANSFER_PRESENCE]);
    expect([...DPIA_PROCESSING_END_STATUS]).toEqual([...PROCESSING_END_STATUS]);
  });
  it("the contract now carries a machine trigger for article_9_condition (F07)", () => {
    const f = dpiaFrameworkContract.fields.find((x) => x.key === "article_9_condition") as any;
    expect(f.trigger).toEqual({ key: "data_categories[]", equals: ["Health or medical data", "Biometric data"] });
    const bio = dpiaFrameworkContract.fields.find((x) => x.key === "biometric_unique_identification") as any;
    expect(bio.trigger).toEqual({ key: "data_categories[]", equals: ["Biometric data"] });
  });
});

describe("F04 — supplier restore", () => {
  it("restores the folded Other entry to its own control", () => {
    expect(splitOtherProcessor(["HubSpot", "Other: Acme Hosting"])).toEqual({ processors: ["HubSpot"], otherProcessor: "Acme Hosting" });
    expect(splitOtherProcessor("nope")).toEqual({ processors: [], otherProcessor: "" });
  });
});

describe("F05 / F11 — transfer rows", () => {
  it("reads the legacy camelCase row and the resolver shape losslessly into the contract schema", () => {
    expect(normaliseTransferRow({ importer: "Acme", destination: "us", originRegime: "UK", dpfCertified: true, ukExtensionCertified: false }))
      .toEqual({ recipient: "Acme", destination_country: "US", origin_regime: "UK", transfer_mechanism: "", notes: "", dpf_certified: true, uk_extension_certified: false });
    expect(normaliseTransferRow({ recipient: "Beacon", destination_country: "US", transfer_mechanism: "UK Extension", uk_extension_certified: true, notes: "archive" }))
      .toMatchObject({ recipient: "Beacon", destination_country: "US", origin_regime: "", transfer_mechanism: "UK Extension", uk_extension_certified: true, notes: "archive" });
    expect(normaliseTransferRow({ importerEntity: "X", destinationCountry: "de", importerDpfCertified: false }).destination_country).toBe("DE");
  });
  it("a new row has no default origin; presence and rows must agree; incomplete rows are named", () => {
    expect(emptyTransferRow().origin_regime).toBe("");
    expect(transferRowsIssue([], TRANSFER_PRESENCE_YES)?.field).toBe("transfer_presence");
    expect(transferRowsIssue([emptyTransferRow()], TRANSFER_PRESENCE_NO)?.field).toBe("transfer_presence");
    const row = { ...emptyTransferRow(), recipient: "Acme", destination_country: "US" };
    expect(transferRowsIssue([row], TRANSFER_PRESENCE_YES)).toMatchObject({ index: 0, field: "origin_regime" });
    expect(transferRowsIssue([{ ...row, origin_regime: "EU" }], TRANSFER_PRESENCE_YES)).toBeNull();
  });
  it("the page emits the snake_case schema and confirms the origin", () => {
    expect(page).toContain("origin_regime");
    expect(page).toContain("destination_country");
    expect(page).not.toMatch(/originRegime:\s*"EU"/);
  });
});

describe("F09 — alternatives", () => {
  it("normalises the drifted key and requires a named alternative before a copied narrative counts", () => {
    expect(normaliseAlternativeRow({ alternative: "Aggregates", reason_rejected: "misses 18%" })).toEqual({ processing_operation: "", alternative: "Aggregates", rejection_reason: "misses 18%" });
    expect(alternativesIssue([{ processing_operation: "", alternative: "", rejection_reason: "long narrative" }])).toMatchObject({ index: 0, field: "alternative" });
    expect(alternativesIssue([{ processing_operation: "", alternative: "Aggregates", rejection_reason: "", outcome: "Viable — still under consideration" }])).toBeNull();
    expect(alternativesIssue([{ processing_operation: "", alternative: "Aggregates", rejection_reason: "" }])).toMatchObject({ field: "rejection_reason" });
  });
  it("the page labels the copy action honestly", () => {
    expect(page).toContain("Copy my necessity notes into a draft row");
    expect(page).not.toContain("Start from my earlier answer");
  });
});

describe("F06 — countries", () => {
  it("the UK is not an EEA establishment; sentinels are preserved", () => {
    expect(isEeaCountry("GB")).toBe(false);
    expect(isEeaCountry("ie")).toBe(true);
    expect(isEeaCountry("OTHER")).toBe(false);
  });
});
