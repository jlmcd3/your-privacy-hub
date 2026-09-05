// DOC 188 (2026-09-05) — all-products batch e38460 ran the PRE-SET data
// packages (src/lib/sampleFixtures.ts × sampleDataPackages.ts). Five findings
// the graders raised as product defects were fixture defects:
//
//   F1  the US and EU notice fixtures wrote keys the forms never ask
//       (`sensitive_data_types`, `supervisory_authority_eu/_uk`) instead of
//       the real ones (`ccpa_sensitive_data`, `gdpr_dpa_contact`);
//   F2  the dataset derivation lost the comma in "Busted Sled Solutions,
//       Inc.", so the short form never matched the prose and us-ds3 rendered
//       Glacier Creek Mining over a description of Busted Sled;
//   F3  the Risk fixture answered "Yes" to sensitive PI with no qualifying
//       category selected;
//   F4  the LIA fixture's own minimisation text carried code-style tokens;
//   F5  optional fields the scenarios describe were left blank (DPIA
//       dpo_advice / transfer_flows, IR processorName / awarenessConfirmed).
//
// These pins keep every notice fixture on real question keys, every Risk
// fixture internally consistent, and every derived dataset free of the
// canonical company's name.

import { describe, expect, it } from "vitest";
import { SAMPLE_FIXTURES } from "@/lib/sampleFixtures";
import { applyProfile, datasetsFor, DERIVED_PROFILES, shortForm } from "@/lib/sampleDataPackages";
import { UNIVERSAL_US_NOTICE_QUESTIONS } from "@/data/us-notice-questions/universal-questions";
import { CCPA_SPECIFIC_QUESTIONS } from "@/data/us-notice-questions/ccpa-questions";
import { VIRGINIA_MODEL_QUESTIONS, VIRGINIA_MODEL_STATE_ADDONS } from "@/data/us-notice-questions/virginia-model-questions";
import { STATE_SPECIFIC_QUESTIONS } from "@/data/us-notice-questions/state-specific-questions";
import { UNIVERSAL_EU_NOTICE_QUESTIONS } from "@/data/eu-notice-questions/universal-questions";
import { CHADP_ADDITIONS, GDPR_ART13_QUESTIONS, UKGDPR_ADDITIONS } from "@/data/eu-notice-questions/gdpr-questions";
import { US_NOTICE_VARIANTS, EU_NOTICE_VARIANTS, CPPA_RISK_VARIANTS } from "@/lib/stress/fixtures";
import { usNoticeContract } from "../../supabase/functions/_shared/intake-contracts/us-notice.ts";
import { euNoticeContract } from "../../supabase/functions/_shared/intake-contracts/eu-notice.ts";

type Bag = Record<string, unknown>;

const US_QUESTION_KEYS = new Set<string>([
  ...UNIVERSAL_US_NOTICE_QUESTIONS.map((q) => q.key),
  ...CCPA_SPECIFIC_QUESTIONS.map((q) => q.key),
  ...VIRGINIA_MODEL_QUESTIONS.map((q) => q.key),
  ...Object.values(VIRGINIA_MODEL_STATE_ADDONS).flat().map((q) => q.key),
  ...STATE_SPECIFIC_QUESTIONS.map((q) => q.key),
]);
const EU_QUESTION_KEYS = new Set<string>([
  ...UNIVERSAL_EU_NOTICE_QUESTIONS.map((q) => q.key),
  ...GDPR_ART13_QUESTIONS.map((q) => q.key),
  ...UKGDPR_ADDITIONS.map((q) => q.key),
  ...CHADP_ADDITIONS.map((q) => q.key),
]);

// Cal. Civ. Code § 1798.140(ae) — the q4 categories that are sensitive PI.
// Matched on the label's distinctive stem (the engine tolerates the legacy
// short labels some stress variants still carry, e.g. "Precise geolocation").
const SENSITIVE_Q4_STEM =
  /government identifiers|account log-in|financial[- ]account (credentials|information)|precise geolocation|racial or ethnic|religious or philosophical|union membership|contents of mail|genetic|biometric|health or medical|sexual orientation|citizenship or immigration|neural data/i;
const isSensitiveQ4 = (label: string): boolean => SENSITIVE_Q4_STEM.test(label);

// The US-notice contract (and the spine's "Sources of Personal Information"
// read) carry `data_sources`, which the client form does not ask — a doc-181
// no-new-intake question for the CEO, noted in doc 188 §4. Until it is
// decided, a contract key is a legitimate fixture key.
const US_CONTRACT_KEYS = new Set(usNoticeContract.fields.map((f) => f.key.split(".")[0]));

describe("doc188 — pinned notice fixtures use only real question keys (F1)", () => {
  it("the US notice sample fixture asks only questions the US form (or its contract) has", () => {
    const f = SAMPLE_FIXTURES.find((x) => x.tool_slug === "us_notice" && x.variant === "us")!;
    const universal = (f.fixture as Bag).universal as Bag;
    const unknown = Object.keys(universal).filter((k) => !US_QUESTION_KEYS.has(k) && !US_CONTRACT_KEYS.has(k));
    expect(unknown).toEqual([]);
    expect(universal.sensitive_data_types).toBeUndefined();
    expect(universal.ccpa_sensitive_data).toBe("yes");
  });

  it("the EU notice sample fixture asks only questions the EU form has, and names the supervisory authority under gdpr_dpa_contact", () => {
    const f = SAMPLE_FIXTURES.find((x) => x.tool_slug === "eu_notice" && x.variant === "eu")!;
    const universal = (f.fixture as Bag).universal as Bag;
    const unknown = Object.keys(universal).filter((k) => !EU_QUESTION_KEYS.has(k));
    expect(unknown).toEqual([]);
    expect(universal.supervisory_authority_eu).toBeUndefined();
    expect(universal.supervisory_authority_uk).toBeUndefined();
    expect(universal.gdpr_dpa_contact).toBe("Data Protection Commission (Ireland)");
    expect(universal.special_category_basis).toBeUndefined();
  });

  it("the stress-harness notice variants (src/lib/stress) carry only contract keys", () => {
    const usKeys = new Set(usNoticeContract.fields.map((f) => f.key.split(".")[0]));
    const euKeys = new Set(euNoticeContract.fields.map((f) => f.key.split(".")[0]));
    for (const v of US_NOTICE_VARIANTS) {
      expect(Object.keys(v).filter((k) => !usKeys.has(k))).toEqual([]);
    }
    for (const v of EU_NOTICE_VARIANTS) {
      expect(Object.keys(v).filter((k) => !euKeys.has(k))).toEqual([]);
      expect((v as Bag).gdpr_dpa_contact).toBeTruthy();
    }
  });
});

describe("doc188 — dataset derivation substitutes the whole identity (F2)", () => {
  it("shortForm drops the comma with the legal suffix", () => {
    expect(shortForm("Busted Sled Solutions, Inc.")).toBe("Busted Sled Solutions");
    expect(shortForm("Silverbell Health Networks Ltd")).toBe("Silverbell Health Networks");
    expect(shortForm("North Pole Manual Mining Ltd")).toBe("North Pole Manual Mining");
    expect(shortForm("Meridiaan Datadiensten B.V.")).toBe("Meridiaan Datadiensten");
  });

  it("a derived US notice dataset describes the profile's company, not Busted Sled", () => {
    const f = SAMPLE_FIXTURES.find((x) => x.tool_slug === "us_notice" && x.variant === "us")!;
    const glacier = DERIVED_PROFILES.find((p) => p.key === "glacier")!;
    const d = applyProfile(f, glacier, 2);
    const universal = (d.fixture as Bag).universal as Bag;
    expect(universal.business_name).toBe("Glacier Creek Mining Corporation");
    expect(String(universal.business_description)).toContain("Glacier Creek Mining operates");
    expect(JSON.stringify(d.fixture)).not.toContain("Busted Sled");
  });

  it("no derived dataset of any canonical fixture still names the canonical company", () => {
    for (const f of SAMPLE_FIXTURES.filter((x) => !x.variant.endsWith("-supplemental"))) {
      const canonicalNames = new Set<string>();
      const walk = (node: unknown, key = ""): void => {
        if (typeof node === "string") {
          if (/^(organization_name|organizationName|entity_name|orgName|org_name|controller_name|controllerName|business_name|entityName)$/.test(key) && node.trim().length > 3) {
            canonicalNames.add(node.trim());
            canonicalNames.add(shortForm(node.trim()));
          }
          return;
        }
        if (Array.isArray(node)) return node.forEach((x) => walk(x, key));
        if (node && typeof node === "object") for (const [k, v] of Object.entries(node as Bag)) walk(v, k);
      };
      walk(f.fixture);
      for (const d of datasetsFor(f).slice(1)) {
        const blob = JSON.stringify(d.fixture);
        for (const name of canonicalNames) {
          expect(blob, `${d.variant} still names "${name}"`).not.toContain(name);
        }
      }
    }
  });
});

describe("doc188 — the Risk fixtures are internally consistent on sensitive PI (F3)", () => {
  const riskFixtures = SAMPLE_FIXTURES.filter((x) => x.tool_slug === "cppa_risk");
  it("every sample Risk fixture answering q15 'Yes' selects a qualifying q4 category", () => {
    expect(riskFixtures.length).toBeGreaterThan(0);
    for (const f of riskFixtures) {
      const intake = ((f.fixture as Bag).insert as Bag).intake_data as Bag;
      if (intake.q15_sensitive_pi !== "Yes") continue;
      const q4 = (intake.q4_pi_categories as string[]) ?? [];
      expect(q4.some(isSensitiveQ4), `${f.variant}: q15 Yes with no sensitive q4 category (${q4.join(" | ")})`).toBe(true);
    }
  });

  it("every stress-harness Risk variant answering q15 'Yes' selects a qualifying q4 category", () => {
    for (const v of CPPA_RISK_VARIANTS as Bag[]) {
      if (v.q15_sensitive_pi !== "Yes") continue;
      const q4 = (v.q4_pi_categories as string[]) ?? [];
      expect(q4.some(isSensitiveQ4), `${v.entity_name}: q15 Yes with no sensitive q4 category (${q4.join(" | ")})`).toBe(true);
    }
  });
});

describe("doc188 — the pinned fixtures answer the optional fields their scenarios describe (F4/F5)", () => {
  it("the LIA fixture's minimisation account carries no code-style tokens", () => {
    const f = SAMPLE_FIXTURES.find((x) => x.tool_slug === "li_assessment" && x.variant === "uk")!;
    const blob = JSON.stringify(f.fixture);
    expect(blob).not.toMatch(/\b[a-z]+_ts\b/);
    expect(blob).not.toContain("deletion_ledger");
  });

  it("the DPIA fixture records the DPO's advice and the Swiss transfer flow", () => {
    const f = SAMPLE_FIXTURES.find((x) => x.tool_slug === "dpia" && x.variant === "eu")!;
    const intake = ((f.fixture as Bag).insert as Bag).intake_data as Bag;
    expect(String(intake.dpo_advice)).toContain("advised");
    const flows = intake.transfer_flows as Bag[];
    expect(flows).toHaveLength(1);
    expect(flows[0].destination_country).toBe("CH");
    expect(String(flows[0].transfer_mechanism)).toMatch(/Adequacy/);
  });

  it("the EU IR fixture names its processor and confirms the awareness timestamp", () => {
    const f = SAMPLE_FIXTURES.find((x) => x.tool_slug === "ir_playbook" && x.variant === "eu")!;
    const body = (f.fixture as Bag).invoke_body_extras as Bag;
    expect(body.processorName).toBe("Nordisk WMS Hosting ApS");
    expect(body.awarenessConfirmed).toBe("Confirmed — discovery timestamp verified as the moment of awareness");
  });
});
