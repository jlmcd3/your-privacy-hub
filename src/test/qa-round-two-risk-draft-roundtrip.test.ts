// QA round two (RA-A-05, High, 2026-09-06) — "Saved draft silently loses
// analytical answers".
//
// CPPARiskAssessment builds its autosave payload from a HAND-MAINTAINED object
// literal rather than from the canonical intake, so a field added to the form
// is persisted only if someone also remembers to add it in two more places.
// The ITEM 305 / UPGRADE-2 analytic deliverables were never added: the
// § 7152(a)(2) necessity set, the four (a)(4) benefit narratives and their four
// supporting facts, the (a)(5) harm pathways and the (a)(6) safeguards all
// vanished on Save/Resume — while the Yes gates and magnitude-basis selections
// that depend on them survived, leaving an assessment asserting benefits whose
// evidence had been dropped. The (a)(8)-(9) information-provider and approver
// fields were lost the same way.
//
// A unit test cannot exercise the round trip without mounting an ~4,000-line
// page, but the defect is structural: a field exists in state and is missing
// from the draft. This test enforces that invariant directly against the
// source, which is exactly what would have caught the original bug and what
// will catch the next field added to the form.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SOURCE = readFileSync(
  resolve(__dirname, "../pages/CPPARiskAssessment.tsx"),
  "utf8",
);

/**
 * State that is deliberately NOT part of the answer record: transient UI, or
 * values carried outside the draft payload. `step` travels as `currentStage`.
 */
const UI_ONLY = new Set([
  "open",
  "step",
  "validationError",
  "authGateOpen",
  "checkoutOpen",
  "coachOpen",
  "coachSeen",
  "finalizationOpen",
  "activeRiskRailKey",
]);

function stateNames(): string[] {
  return [...SOURCE.matchAll(/const \[(\w+), set\w+\] = useState/g)].map((m) => m[1]);
}

/** The object literal passed to useToolDraft as `data`. */
function draftPayloadKeys(): Set<string> {
  const start = SOURCE.indexOf("const draftData = useMemo(() => ({");
  expect(start, "draftData object literal not found — has the draft wiring changed?").toBeGreaterThan(-1);
  const end = SOURCE.indexOf("}), [", start);
  // Strip line comments first, so prose that merely names a field cannot be
  // mistaken for a persisted key, then read the shorthand properties.
  const body = SOURCE.slice(start, end)
    .replace(/^const draftData = useMemo\(\(\) => \(\{/, "")
    .replace(/\/\/[^\n]*/g, "");
  return new Set(
    body
      .split(",")
      .map((tok) => tok.trim())
      .filter((tok) => /^\w+$/.test(tok)),
  );
}

/** The body of applyRestore, which writes a saved draft back into state. */
function restoreBody(): string {
  const start = SOURCE.indexOf("const applyRestore = () => {");
  expect(start, "applyRestore not found — has the draft wiring changed?").toBeGreaterThan(-1);
  const end = SOURCE.indexOf("useAutoRestoreDraft(", start);
  return SOURCE.slice(start, end).replace(/\/\/[^\n]*/g, "");
}

describe("RA-A-05 — every canonical Risk answer survives Save/Resume", () => {
  const answerFields = stateNames().filter((n) => !UI_ONLY.has(n));

  it("finds the intake state to check (guards against the parser silently matching nothing)", () => {
    expect(answerFields.length).toBeGreaterThan(100);
    // The fields the QA report named as lost must be present as state.
    for (const f of ["a2NecessitySet", "a4BenefitBusiness", "a5HarmPathways", "a6Safeguards"]) {
      expect(answerFields).toContain(f);
    }
  });

  it("writes every answer field into the autosaved draft", () => {
    const persisted = draftPayloadKeys();
    const missing = answerFields.filter((f) => !persisted.has(f));
    expect(
      missing,
      `These answers are collected by the form but never saved, so Save/Resume drops them: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("reads every answer field back out of a restored draft", () => {
    const body = restoreBody();
    const missing = answerFields.filter((f) => !new RegExp(`\\bd\\.${f}\\b`).test(body));
    expect(
      missing,
      `These answers are saved but never restored, so Resume returns them blank: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("pins the specific fields RA-A-05 observed being lost", () => {
    const persisted = draftPayloadKeys();
    const body = restoreBody();
    const observed = [
      "a2NecessitySet",
      "a4BenefitBusiness",
      "a4BenefitConsumer",
      "a4BenefitOtherStakeholders",
      "a4BenefitPublic",
      "a4BenefitBusinessFact",
      "a4BenefitConsumerFact",
      "a4BenefitOtherStakeholdersFact",
      "a4BenefitPublicFact",
      "a5HarmPathways",
      "a6Safeguards",
      // Lost the same way, and directly relevant to the RA-A-08 approval
      // finding: a recorded approver could disappear between drafting and
      // generation.
      "a8InformationProviders",
      "a9ApproverName",
      "a9ApproverPosition",
      "a9ApprovalDate",
    ];
    for (const f of observed) {
      expect(persisted.has(f), `${f} is not saved`).toBe(true);
      expect(new RegExp(`\\bd\\.${f}\\b`).test(body), `${f} is not restored`).toBe(true);
    }
  });
});
