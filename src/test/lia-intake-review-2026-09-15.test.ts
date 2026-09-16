// LIA master review (2026-09-15/16) — source-level pins on the two LIA
// pages plus unit pins on the modules they lean on.
//
// F01: the draft is scoped to the route id and the choice about a found
// draft is explicit. F02: a stale preview blocks Continue. F03: the detected
// activity is shown with its evidence and can be corrected. F05: no age is
// inferred from a general "Yes". F06: harm suggestions are negation-aware
// and shown with their sentence. F07: the bench (coaching + law) is mounted.
// F08: every focused rail key resolves. F14/F18: fail keys are anchored and
// pills expose state. F17: hidden answers do not outlive their question.
// F22: every payload key is reviewable.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIA_RAIL } from "@/components/lia/LIARailEntries";
import { LIA_REVIEW_KEYS, buildLiaReview, liaUnresolvedRows } from "@/lib/liaReview";
import { HARM_PREFILL, harmSuggestions } from "@/lib/liaHarmSuggestions";

const INTAKE = readFileSync("src/pages/LIAssessmentIntake.tsx", "utf8");
const SCREEN = readFileSync("src/pages/LIAssessment.tsx", "utf8");
const uniq = (src: string, re: RegExp) => [...new Set([...src.matchAll(re)].map((m) => m[1]))];

describe("LIA intake — 2026-09-15 review pins", () => {
  it("every rail key the full intake focuses resolves to a registry entry (F08)", () => {
    const keys = uniq(INTAKE, /focusField\("([a-z0-9_]+)"\)/g);
    expect(keys.length).toBeGreaterThan(20);
    const missing = keys.filter((k) => !(k in LIA_RAIL));
    expect(missing, `focused keys without a rail entry: ${missing.join(", ")}`).toEqual([]);
    for (const k of uniq(INTAKE, /setActiveFieldRailKey\("([a-z0-9_]+)"\)/g)) expect(k in LIA_RAIL, k).toBe(true);
    for (const k of uniq(SCREEN, /focusLia\("([a-z0-9_]+)"\)/g)) expect(k in LIA_RAIL, k).toBe(true);
  });

  it("the bench mounts coaching and law on the full intake; the placeholder rail is gone (F07, F09)", () => {
    expect(INTAKE.includes('<BenchLayout toolType="lia"')).toBe(true);
    expect(INTAKE.includes("<StatuteRail entry={liaRailEntry} />")).toBe(false);
  });

  it("every fail() key is anchored and the summary links to it (F14, F18)", () => {
    const failKeys = uniq(INTAKE, /fail\("([a-z0-9_]+)"/g);
    expect(failKeys.length).toBeGreaterThanOrEqual(15);
    const anchors = uniq(INTAKE, /errAnchor\("([a-z0-9_]+)"\)/g);
    const unanchored = failKeys.filter((k) => !anchors.includes(k));
    expect(unanchored, `fail keys without an errAnchor: ${unanchored.join(", ")}`).toEqual([]);
    expect(INTAKE.includes("fieldErrors.show(issue.fields, issue.message)")).toBe(true);
    expect(INTAKE.includes("fieldKey={fieldErrors.fields[0] ?? null}")).toBe(true);
    // Pills expose their selected state and carry an accessible name.
    expect(INTAKE.includes("aria-pressed={checked}")).toBe(true);
    expect(SCREEN.includes("aria-pressed={checked}")).toBe(true);
    expect(INTAKE.includes('role="group" aria-labelledby={labelledBy}')).toBe(true);
  });

  it("the draft is scoped to the assessment and the found-draft choice is explicit (F01)", () => {
    expect(INTAKE.includes("assessmentKey: id ?? null,")).toBe(true);
    expect(INTAKE.includes("assessment_id: id,")).toBe(false);
    expect(INTAKE.includes("draftMatchesRoute")).toBe(false);
    expect(INTAKE.includes("resumeDraft();")).toBe(true);
    expect(INTAKE.includes("onKeepSeparate={startNewDraft}")).toBe(true);
    expect(INTAKE.includes("saveError={draftSaveError}")).toBe(true);
  });

  it("a stale preview blocks Continue and the detected activity can be corrected (F02, F03, F04)", () => {
    expect(SCREEN.includes("const previewStale = !!preview && previewInputs !== null && previewInputs !== inputsSnapshot;")).toBe(true);
    expect(SCREEN.includes("if (!previewId || previewStale) return;")).toBe(true);
    expect(SCREEN.includes('id="lia-use-case-override"')).toBe(true);
    expect(SCREEN.includes("use_case_override: chosen")).toBe(true);
    expect(SCREEN.includes('data-testid="lia-precedent-method"')).toBe(true);
    expect(SCREEN.includes("Most analogous regulator decisions")).toBe(false);
    // The confirmed class travels to the engine.
    expect(INTAKE.includes("use_case_code_confirmed: useCaseConfirmed,")).toBe(true);
  });

  it("no age is inferred from a general Yes; the shortcut follows the recorded age range (F05)", () => {
    expect(INTAKE.includes('onClick={() => setVulnerableSubjects([...vulnerableSubjects.filter((v) => v !== "None"), "Children under 16"])}')).toBe(false);
    expect(INTAKE.includes('childrenAgeBand === "Under 13" || childrenAgeBand === "13 to 15"')).toBe(true);
    expect(INTAKE.includes('children_age_band: childrenDataSubjects === "Yes" ? childrenAgeBand : ""')).toBe(true);
  });

  it("harm suggestions are negation-aware and carry their sentence (F06)", () => {
    const s = harmSuggestions(
      "Unwanted messages may cause annoyance and intrusion. We do not anticipate financial loss or identity fraud from the described activity; those risks require separate evidence if identified.",
    );
    const byOption = Object.fromEntries(s.map((x) => [x.option, x]));
    expect(byOption["Distress or intrusion"]?.negated).toBe(false);
    expect(byOption["Distress or intrusion"]?.sentence).toContain("annoyance and intrusion");
    expect(byOption["Financial loss"]?.negated).toBe(true);
    expect(byOption["Identity theft or fraud exposure"]?.negated).toBe(true);
    expect(HARM_PREFILL("Unwanted messages may cause annoyance and intrusion. We do not anticipate financial loss or identity fraud.")).toEqual(["Distress or intrusion"]);
    // Asserted harms still prefill (INTAKE-4e pin kept).
    expect(HARM_PREFILL("Individuals could suffer financial loss and reputational damage if the data leaked.")).toEqual(["Financial loss", "Reputational damage"]);
    expect(INTAKE.includes('data-testid="lia-harm-suggestions"')).toBe(true);
  });

  it("hidden answers do not outlive their question (F17)", () => {
    expect(INTAKE.includes('public_task_processing: controllerIsPublicAuthority === "Yes" ? publicTaskProcessing : ""')).toBe(true);
    expect(INTAKE.includes('vulnerable_subjects_other: vulnerableSubjects.includes("Other") ? vulnerableSubjectsOther : ""')).toBe(true);
    expect(INTAKE.includes('safeguards_other: safeguards.includes("Other") ? safeguardsOther : ""')).toBe(true);
    expect(INTAKE.includes('interest_holder_other: interestHolder === "Other (describe below)" ? interestHolderOther : ""')).toBe(true);
  });

  it("every payload key the page sends is reviewable, and unanswered rows are listed (F22)", () => {
    const start = INTAKE.indexOf("const buildIntake = (): Record<string, unknown> => ({");
    const end = INTAKE.indexOf("  });", start);
    const body = INTAKE.slice(start, end);
    const top = [...body.matchAll(/^ {6}([a-z0-9_]+):/gm)].map((m) => m[1]);
    const nested = [...body.matchAll(/^ {8}([a-z0-9_]+):/gm)].map((m) => m[1]);
    expect(top.length).toBeGreaterThan(10);
    expect(nested.length).toBeGreaterThan(30);
    const groups = ["purpose_details", "necessity_details", "balancing_details", "attestation"];
    // alternatives_considered duplicates necessity_details.alternatives byte-for-byte (legacy top-level copy); reviewed once.
    const missingTop = top.filter((k) => !groups.includes(k) && k !== "stage" && k !== "preview_assessment_id" && k !== "alternatives_considered" && !LIA_REVIEW_KEYS.has(k));
    expect(missingTop, `top-level keys missing from the review: ${missingTop.join(", ")}`).toEqual([]);
    const known = new Set([...LIA_REVIEW_KEYS].map((k) => k.split(".").pop()));
    const missingNested = nested.filter((k) => !known.has(k));
    expect(missingNested, `nested keys missing from the review: ${missingNested.join(", ")}`).toEqual([]);
    const sections = buildLiaReview({ organization_name: "X", purpose_details: { interest_holder: "Other (describe below)", interest_holder_other: "" }, balancing_details: { potential_harm: "Not assessed", children_data_subjects: "No" } });
    const rows = sections.flatMap((s) => s.rows);
    expect(rows.find((r) => r.key === "purpose_details.interest_holder_other")?.state).toBe("unanswered");
    expect(rows.find((r) => r.key === "balancing_details.children_age_band")?.state).toBe("inactive");
    expect(rows.find((r) => r.key === "balancing_details.potential_harm")?.state).toBe("negative");
    expect(liaUnresolvedRows(sections).some((r) => r.key === "purpose_details.interest_holder_other")).toBe(true);
    expect(INTAKE.includes('id="lia-review"')).toBe(true);
  });

  it("the acknowledgment records the checkbox state and a pending purchase keeps the draft (F20, F22)", () => {
    expect(INTAKE.includes('logToolAcknowledgment("li_assessment", user.id, row.id, { acknowledged })')).toBe(true);
    expect(INTAKE.includes('if (status === "pending") { navigate(`/li-assessment/result/${id}?purchase=pending`); return; }')).toBe(true);
  });

  it("the copy that made false or categorical claims is gone (F10, F11, F13, F14, F15, F19)", () => {
    for (const gone of [
      "A single alternative rarely evidences",
      "it commits no one",
      "shows processing you have not disclosed",
      "Encryption, access control and retention limits are obligations, not mitigations.",
      "The full assessment will flag",
      "A channel with no service standard is not a facilitated right to object.",
      "legitimate interests is unavailable and Article 6(1)(e) applies instead",
      "the balancing section treats the imbalance as unaddressed",
      'shows up as "not addressed" in your report',
      "the report cannot confirm the sector overlay was considered",
    ]) {
      expect(INTAKE.includes(gone), `still present: ${gone}`).toBe(false);
    }
    expect(INTAKE.includes("Review or approval details were not provided.")).toBe(true);
    expect(INTAKE.includes("There is no hierarchy of lawful bases")).toBe(true);
  });
});
