// LIA F01 / Governance F02 / DPIA F02 (intake master reviews, 2026-09-15) —
// draft identity helpers, and the source-level pins on the shared hook.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DRAFT_ASSESSMENT_KEY,
  awaitingDraftChoice,
  draftRowMatches,
  mayTargetFoundDraft,
  withAssessmentKey,
  withoutAssessmentKey,
} from "@/lib/draftIdentity";
import { hasContent } from "@/lib/draftContent";

const HOOK = readFileSync("src/hooks/useToolDraft.ts", "utf8");

describe("draft identity (2026-09-15 reviews)", () => {
  it("the identity key is written with the payload and stripped before the blank-form guard", () => {
    const data = { a: "" };
    const saved = withAssessmentKey(data, "row-1");
    expect(saved[DRAFT_ASSESSMENT_KEY]).toBe("row-1");
    expect(withAssessmentKey(data, null)).toBe(data);
    // A form that carries only its identity is blank (LIA F01: it used to count as content).
    expect(hasContent(saved)).toBe(true);
    expect(hasContent(withoutAssessmentKey(saved))).toBe(false);
  });

  it("a row from another assessment is never offered; a legacy row is offered only when unscoped", () => {
    expect(draftRowMatches({ [DRAFT_ASSESSMENT_KEY]: "row-1", a: 1 }, "row-1")).toBe(true);
    expect(draftRowMatches({ [DRAFT_ASSESSMENT_KEY]: "row-2", a: 1 }, "row-1")).toBe(false);
    expect(draftRowMatches({ a: 1 }, "row-1")).toBe(false);
    expect(draftRowMatches({ a: 1 }, null)).toBe(true);
    expect(draftRowMatches(null, null)).toBe(true);
  });

  it("autosave may target the found draft only after Resume", () => {
    expect(mayTargetFoundDraft("resumed")).toBe(true);
    for (const c of ["none", "unresolved", "separate"] as const) expect(mayTargetFoundDraft(c)).toBe(false);
    expect(awaitingDraftChoice("unresolved", true)).toBe(true);
    expect(awaitingDraftChoice("unresolved", false)).toBe(false);
    expect(awaitingDraftChoice("resumed", true)).toBe(false);
  });

  it("the hook keeps found and target rows apart, resets on identity change, and keeps the local copy when migration fails", () => {
    expect(HOOK.includes("const foundIdRef = useRef<string | null>(null);")).toBe(true);
    expect(HOOK.includes("const targetIdRef = useRef<string | null>(null);")).toBe(true);
    // The lookup never sets the target; only resumeDraft does.
    expect(HOOK.includes("foundIdRef.current = row.id;")).toBe(true);
    expect(HOOK.includes("draftIdRef.current = row.id;")).toBe(false);
    expect(HOOK.includes("targetIdRef.current = foundIdRef.current;")).toBe(true);
    // Identity change resets every ref and every visible restore state.
    expect(HOOK.includes("}, [user?.id, toolType, clientId, assessmentKey]);")).toBe(true);
    expect(/foundIdRef\.current = null;\s*targetIdRef\.current = null;\s*lastSerializedRef\.current = "";/.test(HOOK)).toBe(true);
    // Anonymous migration: the insert error is checked BEFORE the local copy is removed.
    const insErrAt = HOOK.indexOf("if (insErr) {");
    const removeAt = HOOK.indexOf("removeLocalDraft(toolType, null);", HOOK.indexOf("1. Migrate a pending anonymous draft"));
    expect(insErrAt).toBeGreaterThan(0);
    expect(removeAt).toBeGreaterThan(insErrAt);
    // Scoped lookup filters on the stored identity key.
    expect(HOOK.includes("q = q.eq(`session_data->>${DRAFT_ASSESSMENT_KEY}`, assessmentKey);")).toBe(true);
    // Save failures surface, not just console.warn.
    expect(HOOK.includes("setSaveError(errorText(e));")).toBe(true);
  });
});
