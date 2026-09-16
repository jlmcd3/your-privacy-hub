// Governance (GDPR Accountability) master review — coverage pins.
//
// Mirrors the LIA review's F22 pin (src/test/lia-intake-review-2026-09-15.test.ts):
// every key the page's buildIntake() emits must be reviewable (or named as a
// deliberate skip), so nothing the customer answered is silently omitted
// from what they confirm before paying.
//
// The page (src/pages/GovernanceAssessment.tsx) is being edited concurrently
// to add seven new intake keys (sector_other, jurisdictions_other,
// data_categories_other, territorial_scope_basis, processor_count,
// uncovered_vendors, transfer_routes). This module reviews them ahead of
// that landing, so their absence from the page's current buildIntake() is
// expected here and must not fail this test.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GOVERNANCE_REVIEW_KEYS,
  GOVERNANCE_REVIEW_FIELDS,
  GOVERNANCE_REVIEW_SKIPPED_KEYS,
  buildGovernanceReview,
  governanceUnresolvedRows,
} from "@/lib/governanceReview";
import { governanceContract } from "../../supabase/functions/_shared/intake-contracts/governance-assessment";

const PAGE = readFileSync("src/pages/GovernanceAssessment.tsx", "utf8");

// Keys this module reviews ahead of the page landing them. Their absence
// from the page's current buildIntake() is expected, not a bug.
const PENDING_NEW_KEYS = [
  "sector_other",
  "jurisdictions_other",
  "data_categories_other",
  "territorial_scope_basis",
  "processor_count",
  "uncovered_vendors",
  "transfer_routes",
];

/**
 * Extracts the top-level keys of the object literal returned by
 * `const buildIntake = () => ({ ... });` in GovernanceAssessment.tsx.
 *
 * Handles both explicit `key: value` and ES6 shorthand (`key,`) entries —
 * the page mixes both on the same line (e.g. `sector, org_size: orgSize,`)
 * — by splitting the object body on depth-0 commas (bracket-depth tracked,
 * so commas inside arrays/objects/calls/ternaries never split an entry),
 * stripping `//` comment lines from each entry, and reading the entry's
 * leading identifier. The nested `remediation_defaults: { ... }` object is
 * therefore reported as the single top-level key "remediation_defaults";
 * its inner keys are never split out as top-level keys.
 */
function extractBuildIntakeKeys(src: string): string[] {
  const marker = "const buildIntake = () => ({";
  const start = src.indexOf(marker);
  if (start === -1) {
    throw new Error("buildIntake signature `const buildIntake = () => ({` not found in GovernanceAssessment.tsx");
  }
  const braceStart = src.indexOf("{", start);

  // Find the matching close of the object literal by overall bracket depth.
  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{" || ch === "(" || ch === "[") depth++;
    else if (ch === "}" || ch === ")" || ch === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error("could not find the matching close brace for buildIntake's object literal");
  const body = src.slice(braceStart + 1, end);

  // Split into top-level entries on depth-0 commas.
  const entries: string[] = [];
  let cur = "";
  let d = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{" || ch === "(" || ch === "[") d++;
    else if (ch === "}" || ch === ")" || ch === "]") d--;
    if (ch === "," && d === 0) {
      entries.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) entries.push(cur);

  const keys: string[] = [];
  for (const raw of entries) {
    const stripped = raw
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
      .trim();
    const m = stripped.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?::|$)/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

const EMITTED_KEYS = extractBuildIntakeKeys(PAGE);

describe("governanceReview — buildIntake coverage", () => {
  it("covers every key buildIntake emits, or names it as a deliberate skip (and reports the diff)", () => {
    expect(EMITTED_KEYS.length).toBeGreaterThan(30);
    // Sanity: the extractor must find both shorthand entries (no colon —
    // `sector,` / `jurisdictions,`) and the nested aggregate.
    expect(EMITTED_KEYS).toContain("sector");
    expect(EMITTED_KEYS).toContain("jurisdictions");
    expect(EMITTED_KEYS).toContain("remediation_defaults");

    const missing = EMITTED_KEYS.filter(
      (k) => !GOVERNANCE_REVIEW_KEYS.has(k) && !GOVERNANCE_REVIEW_SKIPPED_KEYS.has(k),
    );
    expect(missing, `keys emitted by buildIntake but not reviewed or named as a skip: ${missing.join(", ")}`).toEqual([]);
  });

  it("names remediation_defaults as the one deliberate skip, and does not review it as its own row", () => {
    expect([...GOVERNANCE_REVIEW_SKIPPED_KEYS]).toEqual(["remediation_defaults"]);
    expect(GOVERNANCE_REVIEW_FIELDS.some((f) => f.key === "remediation_defaults")).toBe(false);
    // Its four flat siblings are reviewed instead.
    for (const k of [
      "remediation_default_owner",
      "remediation_default_target_date",
      "remediation_default_priority",
      "remediation_default_validation_method",
    ]) {
      expect(GOVERNANCE_REVIEW_KEYS.has(k), k).toBe(true);
    }
  });
});

describe("governanceReview — state semantics", () => {
  it('treats a stored "n/a" as inactive, never as an answer', () => {
    const sections = buildGovernanceReview({
      privacy_policy: "No",
      privacy_notice_coverage: "n/a",
      dpo_status: "n/a",
      dpa_status: "n/a",
      transfer_status: "n/a",
      dpia_ai_coverage: "n/a",
      training_ai_coverage: "n/a",
      dpa_art28_verified: "n/a",
      transfer_mechanism: "n/a",
      sc_core_activity: "n/a",
      sc_population_proportion: "n/a",
      sc_duration: "n/a",
      sc_geographic_scope: "n/a",
    });
    const rows = sections.flatMap((s) => s.rows);
    for (const key of [
      "privacy_notice_coverage", "dpo_status", "dpa_status", "transfer_status",
      "dpia_ai_coverage", "training_ai_coverage", "dpa_art28_verified", "transfer_mechanism",
      "sc_core_activity", "sc_population_proportion", "sc_duration", "sc_geographic_scope",
    ]) {
      const row = rows.find((r) => r.key === key);
      expect(row?.state, key).toBe("inactive");
      expect(row?.text, key).toBe("");
    }
  });

  it('treats "No formal training" as an honest negative', () => {
    const sections = buildGovernanceReview({ training_status: "No formal training" });
    const rows = sections.flatMap((s) => s.rows);
    expect(rows.find((r) => r.key === "training_status")?.state).toBe("negative");
  });

  it("treats other blank/negative phrasings correctly and never flags n/a itself as negative", () => {
    const sections = buildGovernanceReview({
      inventory_audit: "No formal inventory",
      incident_response: "No",
      dpia_status: "Unsure",
      transfer_status: "Unsure",
      technical_controls: "Unsure",
    });
    const rows = sections.flatMap((s) => s.rows);
    expect(rows.find((r) => r.key === "inventory_audit")?.state).toBe("negative");
    expect(rows.find((r) => r.key === "incident_response")?.state).toBe("negative");
    expect(rows.find((r) => r.key === "dpia_status")?.state).toBe("negative");
    expect(rows.find((r) => r.key === "transfer_status")?.state).toBe("negative");
    expect(rows.find((r) => r.key === "technical_controls")?.state).toBe("negative");
  });

  it("treats an empty string as unanswered", () => {
    const sections = buildGovernanceReview({ organization_name: "" });
    const rows = sections.flatMap((s) => s.rows);
    expect(rows.find((r) => r.key === "organization_name")?.state).toBe("unanswered");
  });

  it("governanceUnresolvedRows lists only unanswered rows on the active path", () => {
    const sections = buildGovernanceReview({
      organization_name: "",
      sector: "Technology/SaaS",
      privacy_policy: "No",
      privacy_notice_coverage: "n/a", // inactive — must not appear as unresolved
      dpo_status: "n/a", // inactive
      training_status: "No formal training", // negative, answered — not unresolved
      inventory_audit: "", // unanswered, active
    });
    const unresolved = governanceUnresolvedRows(sections);
    const unresolvedKeys = unresolved.map((r) => r.key);
    expect(unresolvedKeys).toContain("organization_name");
    expect(unresolvedKeys).toContain("inventory_audit");
    expect(unresolvedKeys).not.toContain("privacy_notice_coverage");
    expect(unresolvedKeys).not.toContain("dpo_status");
    expect(unresolvedKeys).not.toContain("training_status");
    expect(unresolvedKeys).not.toContain("sector");
    for (const r of unresolved) expect(r.state).toBe("unanswered");
  });

  it("activates the seven pending keys on their stated triggers", () => {
    const sections = buildGovernanceReview({
      sector: "Other",
      sector_other: "",
      jurisdictions: ["Other"],
      jurisdictions_other: "",
      data_categories: ["Other"],
      data_categories_other: "",
      territorial_scope_basis: [],
      dpa_status: "Most vendors",
      processor_count: "",
      uncovered_vendors: "",
      transfer_status: "Yes, US-based tools",
      transfer_routes: "",
    });
    const rows = sections.flatMap((s) => s.rows);
    for (const key of [
      "sector_other", "jurisdictions_other", "data_categories_other",
      "territorial_scope_basis", "processor_count", "uncovered_vendors", "transfer_routes",
    ]) {
      expect(rows.find((r) => r.key === key)?.state, key).toBe("unanswered");
    }

    const inactive = buildGovernanceReview({
      sector: "Technology/SaaS",
      jurisdictions: ["EU (GDPR)"],
      data_categories: ["Contact details"],
      dpa_status: "n/a",
      transfer_status: "",
    }).flatMap((s) => s.rows);
    expect(inactive.find((r) => r.key === "sector_other")?.state).toBe("inactive");
    expect(inactive.find((r) => r.key === "jurisdictions_other")?.state).toBe("inactive");
    expect(inactive.find((r) => r.key === "data_categories_other")?.state).toBe("inactive");
    expect(inactive.find((r) => r.key === "processor_count")?.state).toBe("inactive");
    expect(inactive.find((r) => r.key === "uncovered_vendors")?.state).toBe("inactive");
    expect(inactive.find((r) => r.key === "transfer_routes")?.state).toBe("inactive");
    // territorial_scope_basis is always active.
    expect(inactive.find((r) => r.key === "territorial_scope_basis")?.state).toBe("unanswered");
  });
});

describe("governanceReview — contract parity", () => {
  it("every review key other than the seven pending new keys exists in the governance contract", () => {
    const contractKeys = new Set(governanceContract.fields.map((f) => f.key));
    const reviewOnlyKeys = [...GOVERNANCE_REVIEW_KEYS].filter((k) => !PENDING_NEW_KEYS.includes(k));
    expect(reviewOnlyKeys.length).toBeGreaterThan(30);
    const missing = reviewOnlyKeys.filter((k) => !contractKeys.has(k));
    expect(missing, `review keys missing from governanceContract.fields: ${missing.join(", ")}`).toEqual([]);
  });

  it("the seven pending keys are also already named in the governance contract (contract landed ahead of the page)", () => {
    // The contract (supabase/functions/_shared/intake-contracts/governance-assessment.ts)
    // already carries these seven keys with the exact trigger conditions this
    // module's activeWhen predicates encode — only GovernanceAssessment.tsx's
    // buildIntake() has not emitted them yet. Recorded here so a future
    // change removing them from the contract is caught.
    const contractKeys = new Set(governanceContract.fields.map((f) => f.key));
    const missingFromContract = PENDING_NEW_KEYS.filter((k) => !contractKeys.has(k));
    expect(missingFromContract).toEqual([]);
  });
});
