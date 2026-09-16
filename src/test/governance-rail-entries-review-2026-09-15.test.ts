// Governance Intake Master Review (2026-09-15) — F07 field-level rail.
//
// Verifies GOVERNANCE_RAIL_BY_FIELD (new), GOVERNANCE_RAIL_BY_STEP
// (must keep working unchanged) and the four revised DEFINITIONS entries
// (gdpr_transparency / gdpr_dpo / gdpr_breach_notification /
// gdpr_data_subject_rights).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GOVERNANCE_RAIL_BY_FIELD,
  GOVERNANCE_RAIL_BY_STEP,
} from "../components/governance/GovernanceRailEntries";
import { DEFINITIONS } from "../lib/definitions";

const RAIL_SRC = readFileSync(
  "src/components/governance/GovernanceRailEntries.ts",
  "utf8",
);
const GOV_SRC = readFileSync("src/pages/GovernanceAssessment.tsx", "utf8");

// ── Extract buildIntake()'s top-level payload keys ─────────────────────────
// buildIntake mixes shorthand props, ternaries and one nested object
// (remediation_defaults). A plain "identifier:" regex misreads a ternary's
// "consequent : alternate" as a property (e.g. "specialCategory === 'Yes' ?
// specialCategoriesList : []" looks exactly like "specialCategoriesList: []").
// Splitting on top-level (depth-0) commas first, then reading only the
// leading identifier of each resulting clause, avoids that ambiguity because
// a real property is always preceded by a depth-0 comma (or the opening
// brace); a ternary's branches are preceded by "?" / ":", never ",".
function splitTopLevel(body: string): string[] {
  const segments: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    else if (ch === "}" || ch === "]" || ch === ")") depth--;
    if (ch === "," && depth === 0) {
      segments.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) segments.push(current);
  return segments;
}

function extractBuildIntakeKeys(src: string): string[] {
  const marker = "const buildIntake = () => ({";
  const start = src.indexOf(marker);
  if (start === -1) throw new Error("buildIntake object literal not found");
  let i = start + marker.length; // just past the object literal's opening '{'
  let depth = 1;
  const bodyStart = i;
  for (; i < src.length && depth > 0; i++) {
    const ch = src[i];
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    else if (ch === "}" || ch === "]" || ch === ")") depth--;
  }
  const rawBody = src.slice(bodyStart, i - 1);
  const body = rawBody.replace(/\/\/[^\n]*/g, ""); // strip line comments
  const keys: string[] = [];
  for (const seg of splitTopLevel(body)) {
    const m = /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(:|$)/.exec(seg);
    if (m) keys.push(m[1]);
  }
  return [...new Set(keys)];
}

const buildIntakeKeys = extractBuildIntakeKeys(GOV_SRC);

// Review key (left) named in the master-review task -> actual buildIntake /
// GOVERNANCE_RAIL_BY_FIELD payload key (right), where they differ.
const REVIEW_TO_PAYLOAD_KEY: Record<string, string> = {
  organization_name: "organization_name",
  sector: "sector",
  org_size: "org_size",
  jurisdictions: "jurisdictions",
  eu_uk_data: "eu_uk_data",
  tools: "tools",
  data_categories: "data_categories",
  special_category: "special_category",
  special_categories: "special_categories_list", // review name -> payload key
  core_activity: "sc_core_activity", // review name -> payload key
  sc_data_subjects_count: "sc_data_subjects_count",
  sc_population_proportion: "sc_population_proportion",
  sc_data_volume: "sc_data_volume",
  sc_duration: "sc_duration",
  sc_geographic_scope: "sc_geographic_scope",
  privacy_policy: "privacy_policy",
  privacy_notice_coverage: "privacy_notice_coverage",
  dpo_status: "dpo_status",
  dpia_status: "dpia_status",
  dpia_ai_coverage: "dpia_ai_coverage",
  incident_response: "incident_response",
  dsr_capability: "dsr_capability",
  dsr_rights_tested: "dsr_rights_tested",
  inventory_status: "inventory_audit", // review name -> payload key
  retention_schedule_status: "retention_schedule_status",
  training_status: "training_status",
  training_ai_coverage: "training_ai_coverage",
  data_submission_instruction: "tool_instruction", // review name -> payload key
  technical_controls: "technical_controls",
  measures_review_cadence: "measures_review_cadence",
  measures_last_review_date: "measures_last_review_date",
  processing_nature: "processing_nature",
  processing_scope: "processing_scope",
  processing_context: "processing_context",
  processing_purposes: "processing_purposes",
  dpa_status: "dpa_status",
  dpa_art28_verified: "dpa_art28_verified",
  transfer_status: "transfer_status",
  transfer_mechanism: "transfer_mechanism",
  additional_context: "additional_context",
};

// buildIntake keys that are not, and are not expected to be, individually
// answerable rail fields: sc_core_activity_explanation and
// technical_controls_list are optional free-text/list companions to fields
// already covered (sc_core_activity, technical_controls); remediation_defaults
// is the nested aggregate object buildIntake also flattens into the four
// remediation_default_* keys, which do have entries.
const SYSTEM_KEY_EXCEPTIONS = [
  "sc_core_activity_explanation",
  "technical_controls_list",
  "remediation_defaults",
];

describe("Governance Intake Master Review 2026-09-15 — GOVERNANCE_RAIL_BY_FIELD", () => {
  it("extracted at least 40 top-level buildIntake keys (sanity on the parser)", () => {
    expect(buildIntakeKeys.length).toBeGreaterThanOrEqual(40);
    expect(buildIntakeKeys).toContain("organization_name");
    expect(buildIntakeKeys).toContain("special_categories_list");
    expect(buildIntakeKeys).toContain("sc_core_activity");
    expect(buildIntakeKeys).toContain("inventory_audit");
    expect(buildIntakeKeys).toContain("tool_instruction");
    expect(buildIntakeKeys).toContain("remediation_defaults");
  });

  it("has a GOVERNANCE_RAIL_BY_FIELD entry for every review-listed field that exists in buildIntake", () => {
    const missingFromBuildIntake: string[] = [];
    const missingFromRail: string[] = [];
    for (const [reviewKey, payloadKey] of Object.entries(REVIEW_TO_PAYLOAD_KEY)) {
      if (!buildIntakeKeys.includes(payloadKey)) {
        missingFromBuildIntake.push(`${reviewKey} -> ${payloadKey}`);
        continue;
      }
      if (!GOVERNANCE_RAIL_BY_FIELD[payloadKey]) {
        missingFromRail.push(`${reviewKey} -> ${payloadKey}`);
      }
    }
    expect(missingFromBuildIntake, "review keys absent from buildIntake").toEqual([]);
    expect(missingFromRail, "review keys missing a GOVERNANCE_RAIL_BY_FIELD entry").toEqual([]);
  });

  it("reports, and keeps small, the buildIntake keys with no dedicated rail entry", () => {
    const unexplained = buildIntakeKeys.filter(
      (k) => !GOVERNANCE_RAIL_BY_FIELD[k] && !SYSTEM_KEY_EXCEPTIONS.includes(k),
    );
    if (unexplained.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        "buildIntake keys with no GOVERNANCE_RAIL_BY_FIELD entry and no listed exception:",
        unexplained,
      );
    }
    expect(unexplained).toEqual([]);
    expect(SYSTEM_KEY_EXCEPTIONS.length).toBeLessThanOrEqual(5);
  });

  it("never uses the bare ellipsis placeholder for regulationText", () => {
    for (const [key, entry] of Object.entries(GOVERNANCE_RAIL_BY_FIELD)) {
      const text = entry.regulationText.trim();
      expect(text, `${key} regulationText`).not.toBe("…");
      expect(text, `${key} regulationText`).not.toBe("...");
    }
  });

  it("gives every field-level entry a citationUrl", () => {
    for (const [key, entry] of Object.entries(GOVERNANCE_RAIL_BY_FIELD)) {
      expect(entry.citationUrl, `${key} citationUrl`).toBeTruthy();
    }
  });

  it("keeps GOVERNANCE_RAIL_BY_STEP working with its original five step keys", () => {
    expect(Object.keys(GOVERNANCE_RAIL_BY_STEP).map(Number).sort()).toEqual([1, 2, 3, 4, 5]);
    for (const step of [1, 2, 3, 4, 5]) {
      expect(GOVERNANCE_RAIL_BY_STEP[step]).toBeTruthy();
      expect(GOVERNANCE_RAIL_BY_STEP[step].fieldLabel).toBeTruthy();
    }
  });

  it("never mischaracterises Art. 32(4), Chapter V, or 'core activities' (F11)", () => {
    expect(RAIL_SRC).not.toContain("staff training obligation");
    expect(RAIL_SRC).not.toContain("requires an Article 46 mechanism");
    expect(RAIL_SRC).not.toContain("the primary business");
  });
});

describe("Governance Intake Master Review 2026-09-15 — DEFINITIONS", () => {
  it("gdpr_transparency separates Art. 13 direct-collection timing from Art. 14(3) indirect-collection timing", () => {
    const def = DEFINITIONS.gdpr_transparency.definition;
    expect(/Article 13|Art\. 13/.test(def)).toBe(true);
    expect(/Article 14\(3\)|Art\. 14\(3\)/.test(def)).toBe(true);
    expect(def).toContain("one month");
  });

  it("gdpr_data_subject_rights states the two-further-months extension", () => {
    expect(DEFINITIONS.gdpr_data_subject_rights.definition).toContain("two further months");
  });

  it("gdpr_dpo keeps the three designation limbs separate and notes headcount is not a criterion", () => {
    const def = DEFINITIONS.gdpr_dpo.definition;
    expect(def).toContain("(a)");
    expect(def).toContain("(b)");
    expect(def).toContain("(c)");
    expect(def.toLowerCase()).toContain("headcount");
  });

  it("gdpr_breach_notification keeps the risk exception and adds the processor's Art. 33(2) duty", () => {
    const def = DEFINITIONS.gdpr_breach_notification.definition;
    expect(def).toContain("unlikely to result in a risk");
    expect(def).toContain("The processor shall notify the controller without undue delay");
  });
});
