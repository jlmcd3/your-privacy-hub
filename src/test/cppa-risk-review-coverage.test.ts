/**
 * Doc 261-review (2026-09-15, EX 11 / EX 18) — the Step 8 review must cover
 * the whole generation payload.
 *
 * Source-level test in the style of qa-round-two-risk-draft-roundtrip.test.ts:
 * it parses the top-level keys of the `intake` object the page sends and
 * checks that every one of them has an entry in the review's field inventory,
 * and that the inventory has no stale key. A field that is collected but never
 * shown back at review — the defect LIVE07 found — fails this test.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCppaRiskReview, CPPA_RISK_REVIEW_KEYS } from "@/lib/cppaRiskReview";

const SOURCE = readFileSync("src/pages/CPPARiskAssessment.tsx", "utf8");

/** Top-level keys of the payload object, read from the page source. */
function payloadKeys(): Set<string> {
  const start = SOURCE.indexOf("// legacy keys preserved");
  expect(start, "payload builder marker not found — has the intake builder changed?").toBeGreaterThan(-1);
  // The builder starts a little before the marker (entity/subject/activity keys).
  const from = SOURCE.lastIndexOf("const intake", start);
  expect(from).toBeGreaterThan(-1);
  const to = SOURCE.indexOf("}), [", start);
  expect(to).toBeGreaterThan(start);
  const body = SOURCE.slice(from, to).replace(/\/\/[^\n]*/g, "");
  // Depth-1 keys only: a `key:` at four spaces of indentation inside the
  // object literal, or several such keys on one line (the q1…q14 rows).
  const keys = new Set<string>();
  for (const line of body.split("\n")) {
    if (!/^ {4}[a-z0-9_]+:/.test(line)) continue;
    for (const m of line.matchAll(/(?:^\s*|,\s*)([a-z0-9_]+):/g)) keys.add(m[1]);
  }
  return keys;
}

describe("CPPA Risk review coverage", () => {
  const keys = payloadKeys();

  it("finds the payload keys (guards against the parser silently matching nothing)", () => {
    expect(keys.size).toBeGreaterThan(100);
    for (const k of ["a2_necessity_set", "a5_harm_pathways", "a6_safeguards", "recipients", "exceptions_intake", "human_review_facts"]) {
      expect([...keys]).toContain(k);
    }
  });

  it("every payload key is rendered by the review", () => {
    const missing = [...keys].filter((k) => !CPPA_RISK_REVIEW_KEYS.has(k));
    expect(missing, `Collected but never shown at review: ${missing.join(", ")}`).toEqual([]);
  });

  it("the review inventory carries no stale key", () => {
    const stale = [...CPPA_RISK_REVIEW_KEYS].filter((k) => !keys.has(k));
    expect(stale, `In the review inventory but not in the payload: ${stale.join(", ")}`).toEqual([]);
  });

  it("distinguishes answered, negative, unanswered and exhibit states", () => {
    const sections = buildCppaRiskReview({
      entity_name: "Acme",
      q15_sensitive_pi: "No",
      i1b_min_pi: "[See attached Exhibit — to be completed and attached to the report separately]",
      a5_harm_pathways: [{ harm: "(A) Unauthorized access", data_involved: "emails", actor: "attacker", source: "", cause: "", likelihood: "Possible", severity: "Moderate" }],
      exceptions_intake: { fraud_detection: { claimed: true, scope: "s", safeguards: "", authority_basis: "", retention_period: "" } },
    });
    const rows = new Map(sections.flatMap((s) => s.rows).map((r) => [r.key, r]));
    expect(rows.get("entity_name")?.state).toBe("answered");
    expect(rows.get("q15_sensitive_pi")?.state).toBe("negative");
    expect(rows.get("i1b_min_pi")?.state).toBe("exhibit");
    expect(rows.get("subject_anchor")?.state).toBe("unanswered");
    expect(rows.get("a5_harm_pathways")?.items?.length).toBe(1);
    expect(rows.get("exceptions_intake")?.items?.[0].label).toBe("fraud detection");
  });
});
