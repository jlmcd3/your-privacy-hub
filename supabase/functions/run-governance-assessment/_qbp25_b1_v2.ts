// QB-P25 Turn B2 — Governance recommended_action_v2 / regulatory_basis_v2
// helpers. Extracted to a sibling module so the rules are unit-testable
// without pulling the full generator boot chain into Deno.test.
//
// SHAPE CONTRACT (additive; legacy strings remain unchanged beside these):
//
// recommended_action_v2 = {
//   action: string,                                   // imperative sentence
//   owner: { role: string, intake_field: string },   // both required; role
//                                                    //   must be a role the
//                                                    //   intake establishes,
//                                                    //   OR "role to be
//                                                    //   designated"; the
//                                                    //   intake_field names
//                                                    //   the intake key that
//                                                    //   establishes the role
//                                                    //   (or "designation").
//   trigger: string,                                 // when the action fires
//   deadline:
//     | { kind: "statutory", citation: string, illustrative_default?: string }
//     | { kind: "org_set",   illustrative_default: string }
// }
//
// regulatory_basis_v2 = [
//   { citation: string, engaged_because: string }    // engaged_because names a
//                                                    //   SPECIFIC intake fact
//                                                    //   that engages the
//                                                    //   provision. Entries
//                                                    //   are omitted, never
//                                                    //   hedged.
// ]
//
// DESIGN NOTES:
//  * v2 objects are OPTIONAL. Absence is not a defect. A v2 entry that would
//    require hedging ("if this applies …", "may apply …", "possibly …") MUST
//    be omitted instead — there is no hedged-placeholder slot.
//  * The renderer composes the timeline SENTENCE from `deadline` — no wrapper
//    like applyTimelineForm is applied to v2 fields.
//  * When recommended_action_v2 is structurally valid, the finding is exempt
//    from applyTimelineForm's suggested_timeline wrapping (v2 supersedes).

export type RecommendedActionV2 = {
  action: string;
  owner: { role: string; intake_field: string };
  trigger: string;
  deadline:
    | { kind: "statutory"; citation: string; illustrative_default?: string }
    | { kind: "org_set"; illustrative_default: string };
};

export type RegulatoryBasisV2Entry = {
  citation: string;
  engaged_because: string;
};

export function isRecommendedActionV2Valid(v: unknown): v is RecommendedActionV2 {
  if (!v || typeof v !== "object") return false;
  const o = v as any;
  if (typeof o.action !== "string" || !o.action.trim()) return false;
  if (!o.owner || typeof o.owner !== "object") return false;
  if (typeof o.owner.role !== "string" || !o.owner.role.trim()) return false;
  if (typeof o.owner.intake_field !== "string" || !o.owner.intake_field.trim()) return false;
  if (typeof o.trigger !== "string" || !o.trigger.trim()) return false;
  const d = o.deadline;
  if (!d || typeof d !== "object") return false;
  if (d.kind === "statutory") {
    if (typeof d.citation !== "string" || !d.citation.trim()) return false;
    return true;
  }
  if (d.kind === "org_set") {
    if (typeof d.illustrative_default !== "string" || !d.illustrative_default.trim()) return false;
    return true;
  }
  return false;
}

export function isRegulatoryBasisV2Valid(v: unknown): v is RegulatoryBasisV2Entry[] {
  if (!Array.isArray(v)) return false;
  for (const e of v) {
    if (!e || typeof e !== "object") return false;
    const o = e as any;
    if (typeof o.citation !== "string" || !o.citation.trim()) return false;
    if (typeof o.engaged_because !== "string" || !o.engaged_because.trim()) return false;
  }
  return true;
}

/**
 * Compose the human-readable timeline sentence from a v2 deadline object.
 * The renderer (React + PDF) uses this so applyTimelineForm never has to
 * wrap a v2 deadline.
 */
export function composeTimelineSentence(deadline: RecommendedActionV2["deadline"] | undefined | null): string {
  if (!deadline || typeof deadline !== "object") return "";
  if (deadline.kind === "statutory") {
    const base = `Statutory deadline: ${deadline.citation}`;
    return deadline.illustrative_default
      ? `${base} (illustrative cadence — ${deadline.illustrative_default})`
      : base;
  }
  if (deadline.kind === "org_set") {
    return `Timeline to be set by the organisation (e.g. ${deadline.illustrative_default})`;
  }
  return "";
}

/**
 * A domain finding is exempt from applyTimelineForm's suggested_timeline
 * wrapping iff it carries a structurally-valid recommended_action_v2 with a
 * deadline. Legacy findings continue to flow through the wrapper.
 */
export function findingHasV2Deadline(finding: unknown): boolean {
  if (!finding || typeof finding !== "object") return false;
  const v2 = (finding as any).recommended_action_v2;
  return isRecommendedActionV2Valid(v2);
}
