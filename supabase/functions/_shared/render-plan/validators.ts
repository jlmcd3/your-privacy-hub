/**
 * RENDERPLAN VALIDATORS (Two-Pass Architecture, Phase-1 authoring)
 * -----------------------------------------------------------------
 * Pure functions that enforce the Pass-1 → Pass 2 contract. All 7
 * validators from TWO-PASS-ARCHITECTURE.md §3.2 are implemented:
 *
 *   V1  intake-ledger closure         (every ledger_ref in propositions resolves)
 *   V2  citation-binding closure      (every pinpoint_ref resolves)
 *   V3  authority-domain filter       (Q4(e): every anchor + binding + frame
 *                                      entry matches plan.jurisdiction_tag)
 *   V4  guidance-closure              (factor_table.guidance_refs are same-domain)
 *   V5  Pass-G candidate-set closure  (weighing_frame entries are same-domain
 *                                      and belong to a known weighing test)
 *   V6  Type-R polarity determinism   (SCOPED TO TYPE R: every R proposition
 *                                      has a polarity)
 *   V7  Type-W factor completeness    (each Type-W proposition has ≥1 factor
 *                                      of each of the 3 kinds and ≥1 weighing
 *                                      frame entry)
 *
 * Plus a comparative-token linter for Pass-2 output.
 *
 * All validators are pure — no I/O, no throws. They return `Issue[]`.
 */

import type {
  RenderPlan,
  Proposition,
  FactorTableEntry,
  WeighingFrameEntry,
  JurisdictionTag,
} from "./schema.ts";
import { FORBIDDEN_COMPARATIVE_TOKENS, PERSUASIVE_MARKERS } from "./schema.ts";
import type { WeighingTest } from "../factors/cppa-risk-factors.ts";

export interface Issue {
  readonly code: string;
  readonly severity: "error" | "warn";
  readonly message: string;
  readonly path?: string;
}

// ---------------------------------------------------------------------------
// V1 — Intake-ledger closure
// ---------------------------------------------------------------------------

export function validateIntakeLedgerClosure(plan: RenderPlan): Issue[] {
  const ledgerIds = new Set(plan.intake_ledger.map((e) => e.ledger_id));
  const issues: Issue[] = [];
  for (const p of plan.propositions) {
    for (const ref of p.intake_ledger_refs) {
      if (!ledgerIds.has(ref)) {
        issues.push({
          code: "V1_LEDGER_MISS",
          severity: "error",
          message: `Proposition ${p.id} references unknown intake ledger id "${ref}".`,
          path: `propositions.${p.id}.intake_ledger_refs`,
        });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// V2 — Citation-binding closure
// ---------------------------------------------------------------------------

export function validateCitationBindingClosure(plan: RenderPlan): Issue[] {
  const bindingIds = new Set(plan.citation_bindings.map((b) => b.pinpoint_ref));
  const issues: Issue[] = [];
  for (const p of plan.propositions) {
    for (const ref of p.citation_binding_refs) {
      if (!bindingIds.has(ref)) {
        issues.push({
          code: "V2_CITE_MISS",
          severity: "error",
          message: `Proposition ${p.id} references unknown citation binding "${ref}".`,
          path: `propositions.${p.id}.citation_binding_refs`,
        });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// V3 — Authority-domain filter (Q4(e); v2.3 generalized forum rule)
// ---------------------------------------------------------------------------
//
// v2.3 (CEO-CORRECTED 2026-07-26): for any U.S.-forum plan (cppa-ca or
// us-state-*), U.S. FEDERAL law (`jurisdiction_tag: "us-federal"`, incl.
// FTC and other federal agency rulings) is BINDING-tier eligible and does
// NOT trigger a cross-domain error at V3. Sister-state law crossing into a
// U.S.-forum plan at BINDING tier is caught by V8 (must be persuasive-tier
// instead). Persuasive weighing_frame entries carry cross-domain tags by
// design and are governed by V8, so V3 does not error on them either.
// GDPR/UK plans remain untouched: no U.S. tag (state OR federal) is
// admissible in any tier — the bridge is one-way.

export function isUsForumTag(tag: JurisdictionTag): boolean {
  return tag === "cppa-ca" || (typeof tag === "string" && tag.startsWith("us-state-"));
}

function isBindingDomainMatch(
  planDomain: JurisdictionTag,
  refDomain: JurisdictionTag,
): boolean {
  if (refDomain === planDomain) return true;
  // v2.3 — U.S. Federal is binding-tier for any U.S.-forum plan.
  if (refDomain === "us-federal" && isUsForumTag(planDomain)) return true;
  return false;
}

export function validateAuthorityDomain(plan: RenderPlan): Issue[] {
  const issues: Issue[] = [];
  const domain = plan.jurisdiction_tag;

  for (const p of plan.propositions) {
    if (!isBindingDomainMatch(domain, p.jurisdiction_tag)) {
      issues.push({
        code: "V3_PROP_DOMAIN_MISMATCH",
        severity: "error",
        message: `Proposition ${p.id} has jurisdiction_tag "${p.jurisdiction_tag}" but plan is "${domain}".`,
        path: `propositions.${p.id}.jurisdiction_tag`,
      });
    }
  }
  for (const b of plan.citation_bindings) {
    const w = b.authority_weight ?? "binding";
    // Persuasive citation bindings (rare; author-controlled) are governed by V8.
    if (w === "persuasive") continue;
    if (!isBindingDomainMatch(domain, b.jurisdiction_tag)) {
      issues.push({
        code: "V3_CITE_DOMAIN_MISMATCH",
        severity: "error",
        message: `Citation binding ${b.pinpoint_ref} (${b.pinpoint}) is cross-domain "${b.jurisdiction_tag}" vs plan "${domain}".`,
        path: `citation_bindings.${b.pinpoint_ref}`,
      });
    }
  }
  for (const e of plan.factor_table) {
    // Factor guidance is binding-tier only (V8b); factor rows must match plan domain
    // OR carry us-federal on a U.S.-forum plan.
    if (!isBindingDomainMatch(domain, e.jurisdiction_tag)) {
      issues.push({
        code: "V3_FACTOR_DOMAIN_MISMATCH",
        severity: "error",
        message: `Factor table entry ${e.factor_id} is cross-domain "${e.jurisdiction_tag}" vs plan "${domain}".`,
        path: `factor_table.${e.factor_id}`,
      });
    }
  }
  for (const f of plan.weighing_frame) {
    const w = f.authority_weight ?? "binding";
    // Persuasive frame entries are governed by V8 (allowed for CPPA plans with mediation).
    if (w === "persuasive") continue;
    if (!isBindingDomainMatch(domain, f.jurisdiction_tag)) {
      issues.push({
        code: "V3_FRAME_DOMAIN_MISMATCH",
        severity: "error",
        message: `Weighing frame ${f.frame_id} is cross-domain "${f.jurisdiction_tag}" vs plan "${domain}".`,
        path: `weighing_frame.${f.frame_id}`,
      });
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// V4 — Guidance closure (factor_table.guidance_refs must be same-domain via
//      the FSOR corpus surrogate: for CPPA plans, only cppa_fsor_* rows.)
// ---------------------------------------------------------------------------

const CPPA_GUIDANCE_TABLES = new Set([
  "cppa_fsor_commentary",
  "cppa_fsor_callouts",
]);

export function validateGuidanceClosure(plan: RenderPlan): Issue[] {
  const issues: Issue[] = [];
  const domain = plan.jurisdiction_tag;
  for (const e of plan.factor_table) {
    for (const g of e.guidance_refs) {
      if (domain === "cppa-ca" && !CPPA_GUIDANCE_TABLES.has(g.source_table)) {
        issues.push({
          code: "V4_GUIDANCE_CROSS_DOMAIN",
          severity: "error",
          message: `Factor ${e.factor_id} guidance row from "${g.source_table}" is not CPPA-domain.`,
          path: `factor_table.${e.factor_id}.guidance_refs`,
        });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// V5 — Pass-G candidate-set closure
// ---------------------------------------------------------------------------

export function validatePassGCandidateClosure(
  plan: RenderPlan,
  weighingTests: readonly WeighingTest[],
): Issue[] {
  const issues: Issue[] = [];
  const knownTests = new Map(weighingTests.map((t) => [t.test_id, t]));
  for (const f of plan.weighing_frame) {
    const t = knownTests.get(f.test_id);
    if (!t) {
      issues.push({
        code: "V5_UNKNOWN_TEST",
        severity: "error",
        message: `Weighing frame ${f.frame_id} refs unknown test "${f.test_id}".`,
        path: `weighing_frame.${f.frame_id}.test_id`,
      });
      continue;
    }
    if (t.jurisdiction_tag !== f.jurisdiction_tag) {
      issues.push({
        code: "V5_FRAME_TEST_DOMAIN_MISMATCH",
        severity: "error",
        message:
          `Weighing frame ${f.frame_id} domain "${f.jurisdiction_tag}" does not match test "${t.test_id}" domain "${t.jurisdiction_tag}".`,
        path: `weighing_frame.${f.frame_id}`,
      });
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// V6 — Type-R polarity determinism (SCOPED TO TYPE R only per LEGAL-TEST v1)
// ---------------------------------------------------------------------------

export function validateTypeRPolarity(plan: RenderPlan): Issue[] {
  const issues: Issue[] = [];
  for (const p of plan.propositions) {
    if (p.epistemic_type !== "R") continue;
    if (!p.polarity) {
      issues.push({
        code: "V6_TYPE_R_NO_POLARITY",
        severity: "error",
        message: `Type-R proposition ${p.id} has no polarity — rules must resolve deterministically.`,
        path: `propositions.${p.id}.polarity`,
      });
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// V7 — Type-W factor completeness + frame presence + closeness heuristic
// ---------------------------------------------------------------------------

export function validateTypeWFactorCompleteness(plan: RenderPlan): Issue[] {
  const issues: Issue[] = [];
  const wProps = plan.propositions.filter((p) => p.epistemic_type === "W");
  if (wProps.length === 0) return issues;

  const kinds = new Set(plan.factor_table.map((f) => f.kind));
  if (!kinds.has("benefit")) {
    issues.push({
      code: "V7_MISSING_BENEFIT",
      severity: "error",
      message: "Type-W propositions present but factor_table has no benefit rows.",
    });
  }
  if (!kinds.has("negative_impact")) {
    issues.push({
      code: "V7_MISSING_NEGATIVE_IMPACT",
      severity: "error",
      message: "Type-W propositions present but factor_table has no negative_impact rows.",
    });
  }
  if (!kinds.has("safeguard")) {
    issues.push({
      code: "V7_MISSING_SAFEGUARD",
      severity: "error",
      message: "Type-W propositions present but factor_table has no safeguard rows.",
    });
  }

  const frameIds = new Set(plan.weighing_frame.map((f) => f.frame_id));
  for (const p of wProps) {
    if (!p.weighing_frame_ref || !frameIds.has(p.weighing_frame_ref)) {
      issues.push({
        code: "V7_W_PROP_NO_FRAME",
        severity: "error",
        message: `Type-W proposition ${p.id} has no resolvable weighing_frame_ref.`,
        path: `propositions.${p.id}.weighing_frame_ref`,
      });
    }
  }

  // Closeness heuristic: at least one frame entry per test with
  // closeness_contribution > 0 (otherwise Pass 2 has nothing to lean on).
  const closenessByTest = new Map<string, number>();
  for (const f of plan.weighing_frame) {
    closenessByTest.set(f.test_id, (closenessByTest.get(f.test_id) ?? 0) + f.closeness_contribution);
  }
  for (const [testId, sum] of closenessByTest) {
    if (sum <= 0) {
      issues.push({
        code: "V7_ZERO_CLOSENESS",
        severity: "warn",
        message: `Weighing test ${testId} frame entries sum to zero closeness — Pass 2 will render on statutory factors only.`,
      });
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Pass-2 output linter — comparative-token ban (Q4(e))
// ---------------------------------------------------------------------------

export function lintPass2Output(
  rendered: string,
  plan: RenderPlan,
): Issue[] {
  const issues: Issue[] = [];
  if (plan.jurisdiction_tag !== "cppa-ca") return issues;
  const lower = rendered.toLowerCase();
  for (const token of FORBIDDEN_COMPARATIVE_TOKENS) {
    if (lower.includes(token.toLowerCase())) {
      issues.push({
        code: "LINT_COMPARATIVE_TOKEN",
        severity: "error",
        message: `Pass-2 output contains banned comparative token "${token}" for CPPA-domain plan.`,
      });
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// V8 — Authority-weight tiering (Q4(e) v2.2)
// ---------------------------------------------------------------------------

export function validateAuthorityWeight(plan: RenderPlan): Issue[] {
  const issues: Issue[] = [];
  const bindingIndex = new Map(plan.citation_bindings.map((b) => [b.pinpoint_ref, b]));
  const domain = plan.jurisdiction_tag;

  // (a) Type-R proposition citation bindings must be binding-tier.
  for (const p of plan.propositions) {
    if (p.epistemic_type !== "R") continue;
    for (const ref of p.citation_binding_refs) {
      const b = bindingIndex.get(ref);
      if (!b) continue; // caught by V2
      const w = b.authority_weight ?? "binding";
      if (w !== "binding") {
        issues.push({
          code: "V8_TYPE_R_NON_BINDING",
          severity: "error",
          message: `Type-R proposition ${p.id} anchors on citation ${ref} with authority_weight="${w}"; Type-R requires binding-tier.`,
          path: `citation_bindings.${ref}.authority_weight`,
        });
      }
    }
  }

  // (b) Factor-registry guidance_refs must be binding-tier.
  for (const e of plan.factor_table) {
    for (const g of e.guidance_refs) {
      const w = (g as { authority_weight?: string }).authority_weight ?? "binding";
      if (w !== "binding") {
        issues.push({
          code: "V8_FACTOR_GUIDANCE_NON_BINDING",
          severity: "error",
          message: `Factor ${e.factor_id} guidance_ref carries authority_weight="${w}"; factor guidance must be binding-tier.`,
          path: `factor_table.${e.factor_id}.guidance_refs`,
        });
      }
    }
  }

  // (c) Persuasive weighing_frame entries require fsor_mediation_ref.
  // (d) GDPR plans reject any persuasive entry (US/CA bridge banned one-way).
  for (const f of plan.weighing_frame) {
    const w = f.authority_weight ?? "binding";
    if (w === "persuasive") {
      if (!f.fsor_mediation_ref || f.fsor_mediation_ref.length === 0) {
        issues.push({
          code: "V8_PERSUASIVE_NO_MEDIATION",
          severity: "error",
          message: `Weighing frame ${f.frame_id} is authority_weight="persuasive" but has no fsor_mediation_ref.`,
          path: `weighing_frame.${f.frame_id}.fsor_mediation_ref`,
        });
      }
      if (domain !== "cppa-ca") {
        issues.push({
          code: "V8_PERSUASIVE_NON_CPPA_PLAN",
          severity: "error",
          message: `Weighing frame ${f.frame_id} carries persuasive tier on non-CPPA plan (${domain}); the US/CA→other bridge is banned one-way.`,
          path: `weighing_frame.${f.frame_id}.authority_weight`,
        });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Pass-2 persuasive-marking lint (Q4(e) v2.2 rendering discipline)
// ---------------------------------------------------------------------------

export function lintPersuasiveMarking(
  rendered: string,
  persuasiveEntriesRendered: readonly WeighingFrameEntry[],
): Issue[] {
  const issues: Issue[] = [];
  if (persuasiveEntriesRendered.length === 0) return issues;
  const lower = rendered.toLowerCase();
  const hasMarker = PERSUASIVE_MARKERS.some((m) => lower.includes(m.toLowerCase()));
  if (!hasMarker) {
    issues.push({
      code: "V8_PERSUASIVE_UNMARKED",
      severity: "error",
      message:
        `Pass-2 output renders ${persuasiveEntriesRendered.length} persuasive frame entr(y|ies) without any persuasive marker phrase; template must include one of: ${PERSUASIVE_MARKERS.join(" | ")}.`,
    });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Aggregator
// ---------------------------------------------------------------------------

export function validateRenderPlan(
  plan: RenderPlan,
  weighingTests: readonly WeighingTest[],
): Issue[] {
  return [
    ...validateIntakeLedgerClosure(plan),
    ...validateCitationBindingClosure(plan),
    ...validateAuthorityDomain(plan),
    ...validateGuidanceClosure(plan),
    ...validatePassGCandidateClosure(plan, weighingTests),
    ...validateTypeRPolarity(plan),
    ...validateTypeWFactorCompleteness(plan),
    ...validateAuthorityWeight(plan),
  ];
}
