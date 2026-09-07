// The generic rule interpreter (doc 206): `applyRules` takes a set of typed
// `AuthorityRule`s and a customer's typed state bag and produces the next
// `CurrentDetermination`, plus a full application trail. Pure — no I/O, no
// Date, no random — and it never throws on data: a rule whose trigger is
// malformed, or whose effect isn't eligible at its own settledness, is
// recorded as `ineligible` and skipped rather than allowed to abort the pass.
//
// See rule-types.ts for the grammar this evaluates triggers against, and for
// the IMPORT BOUNDARY note repeated there: only a product's `rule-pass.ts`,
// a `*-gate.ts` / `*-gates.ts` file, or a test may import this module.

import {
  type ApplyRulesResult,
  type AuthorityRule,
  type CurrentDetermination,
  type ElementScale,
  type RuleApplication,
  type RuleContext,
  type RuleEffect,
  type Settledness,
  type TypedStateBag,
  evaluateTrigger,
} from "./rule-types.ts";

/**
 * Fixed application order across rule kinds — adverse outcome/verdict
 * effects land before any favorable one is even considered, so a favorable
 * rule can see (and be suppressed by) what fired ahead of it this pass.
 * Within one kind, rules apply in `rule_id` ascending order — deterministic,
 * independent of the order they were passed in.
 */
const KIND_ORDER: readonly RuleEffect["kind"][] = [
  "override_outcome",
  "cap_verdict",
  "route_to_basis",
  "recognise_interest",
  "precedent_verdict",
  "require_condition",
  "flag_risk",
];

/** Settledness eligibility per effect kind (doc 206). */
function isEligible(effect: RuleEffect, settledness: Settledness): boolean {
  switch (effect.kind) {
    case "override_outcome":
      return settledness === "R1" || settledness === "R2";
    case "cap_verdict":
    case "require_condition":
    case "flag_risk":
      return settledness === "R1" || settledness === "R2" || settledness === "R3";
    case "recognise_interest":
    case "route_to_basis":
      return settledness === "R1";
    case "precedent_verdict":
      // `necessity` is the one element where only a settled-enough (R2)
      // precedent may raise the verdict; every other element accepts a
      // precedent at any settledness, R1 included.
      return effect.element === "necessity" ? settledness === "R2" : true;
  }
}

function sortedByRuleId(rules: AuthorityRule[]): AuthorityRule[] {
  return [...rules].sort((a, b) => (a.rule_id < b.rule_id ? -1 : a.rule_id > b.rule_id ? 1 : 0));
}

function makeIneligible(rule: AuthorityRule, reason: string): RuleApplication {
  return {
    rule_id: rule.rule_id,
    effect: rule.effect,
    before: undefined,
    after: undefined,
    changed: false,
    concurred: false,
    ineligible: reason,
    reason_sentence: rule.reason_sentence,
    authority_citation: rule.authority_citation,
    sources: rule.sources,
  };
}

function findScale(ctx: RuleContext, element: string): ElementScale | undefined {
  return ctx.scales.find((s) => s.element === element);
}

/**
 * Shared application logic for the two "raise a verdict if it's actually
 * more favorable" effect kinds (`recognise_interest`, `precedent_verdict`).
 * Both carry the same `{ element, value }` shape and the same suppression
 * rules: blocked outright by an adverse `override_outcome` this pass, or by
 * an adverse `cap_verdict` that lowered the SAME element this pass (never
 * raise back what an adverse rule just lowered) — the latter also marks
 * `contrary_authority` since `loweredElementRuleId` is populated only by
 * `cap_verdict`.
 */
function applyFavorableVerdictEffect(
  rule: AuthorityRule,
  eff: { element: string; value: string },
  next: CurrentDetermination,
  ctx: RuleContext,
  adverseOverrideFired: boolean,
  overrideRuleId: string | null,
  loweredElementRuleId: Map<string, string>,
): RuleApplication {
  const base = {
    rule_id: rule.rule_id,
    effect: rule.effect,
    reason_sentence: rule.reason_sentence,
    authority_citation: rule.authority_citation,
    sources: rule.sources,
  };

  if (adverseOverrideFired) {
    const value = next.verdicts[eff.element];
    return {
      ...base,
      before: value,
      after: value,
      changed: false,
      concurred: false,
      suppressed_by: overrideRuleId ?? undefined,
    };
  }

  if (loweredElementRuleId.has(eff.element)) {
    const value = next.verdicts[eff.element];
    return {
      ...base,
      before: value,
      after: value,
      changed: false,
      concurred: false,
      suppressed_by: loweredElementRuleId.get(eff.element),
      contrary_authority: true,
    };
  }

  const scale = findScale(ctx, eff.element);
  const currentValue = next.verdicts[eff.element];
  if (
    !scale ||
    !scale.order.includes(eff.value) ||
    currentValue === undefined ||
    !scale.order.includes(currentValue)
  ) {
    return { ...base, before: currentValue, after: currentValue, changed: false, concurred: false, ineligible: "unknown_scale_value" };
  }

  const idxCurrent = scale.order.indexOf(currentValue);
  const idxNew = scale.order.indexOf(eff.value);
  if (idxNew < idxCurrent) {
    next.verdicts[eff.element] = eff.value;
    return { ...base, before: currentValue, after: eff.value, changed: true, concurred: false };
  }
  return { ...base, before: currentValue, after: currentValue, changed: false, concurred: true };
}

/**
 * The monotonicity invariant, checked once per `applyRules` pass (exported
 * so it can also be unit-tested directly): no element's verdict may become
 * more favorable than it was `before` this pass unless an APPLIED favorable
 * application (`recognise_interest` or `precedent_verdict`, `changed: true`,
 * not suppressed, not ineligible) accounts for it; the outcome may only
 * differ from `before.outcome` if an applied `override_outcome` or `route_to_basis`
 * application set exactly that value. Anything else is a bug in the
 * interpreter (or in the `RuleContext` it was given), not a legal
 * determination the caller should ever see — `applyRules` falls back to
 * `before` wholesale when this reports a violation.
 */
export function checkMonotonicity(
  before: CurrentDetermination,
  next: CurrentDetermination,
  ctx: RuleContext,
  applications: RuleApplication[],
): string[] {
  const violations: string[] = [];
  const scaleByElement = new Map(ctx.scales.map((s) => [s.element, s.order]));

  const raisedElements = new Set(
    applications
      .filter((a) =>
        (a.effect.kind === "recognise_interest" || a.effect.kind === "precedent_verdict") &&
        a.changed && !a.suppressed_by && !a.ineligible
      )
      .map((a) => (a.effect as { element: string }).element),
  );

  const elements = new Set([...Object.keys(before.verdicts), ...Object.keys(next.verdicts)]);
  for (const element of elements) {
    const order = scaleByElement.get(element);
    if (!order) continue; // unknown scale — nothing to check this element against
    const beforeValue = before.verdicts[element];
    const nextValue = next.verdicts[element];
    if (beforeValue === undefined || nextValue === undefined) continue;
    const idxBefore = order.indexOf(beforeValue);
    const idxNext = order.indexOf(nextValue);
    if (idxBefore < 0 || idxNext < 0) continue; // unknown values — nothing to check
    if (idxNext < idxBefore && !raisedElements.has(element)) {
      violations.push(
        `element "${element}" became more favorable ("${beforeValue}" -> "${nextValue}") without an applied favorable rule justifying the raise`,
      );
    }
  }

  const outcomeOk = next.outcome === before.outcome ||
    applications.some((a) =>
      a.effect.kind === "override_outcome" && a.changed && !a.ineligible &&
      (a.effect as { outcome: string }).outcome === next.outcome
    ) ||
    applications.some((a) =>
      a.effect.kind === "route_to_basis" && a.changed && !a.suppressed_by && !a.ineligible &&
      (a.effect as { outcome: string }).outcome === next.outcome
    );
  if (!outcomeOk) {
    violations.push(
      `outcome changed from "${before.outcome}" to "${next.outcome}" without an applied override_outcome or route_to_basis rule justifying it`,
    );
  }

  return violations;
}

/**
 * Apply a set of typed authority rules to a customer's typed state bag,
 * against the current determination, and return the next determination plus
 * a full, ordered application trail. Never mutates `rules`, `states`, or
 * `current`; never throws on rule/data shape — malformed or ineligible rules
 * are recorded (`ineligible: "..."`) and skipped, not raised.
 */
export function applyRules(
  rules: AuthorityRule[],
  states: TypedStateBag,
  current: CurrentDetermination,
  ctx: RuleContext,
): ApplyRulesResult {
  const applications: RuleApplication[] = [];
  const fired: AuthorityRule[] = [];

  // Steps 1-3: scope filter (unrecorded), settledness eligibility (recorded),
  // trigger evaluation (invalid triggers recorded, non-firing rules dropped
  // silently — nothing happened, there is nothing to put in the trail).
  for (const rule of rules) {
    if (rule.retired_at) continue;
    if (!rule.instrument_scope.includes(states.instrument)) continue;

    if (!isEligible(rule.effect, rule.settledness)) {
      applications.push(makeIneligible(rule, "settledness_ineligible"));
      continue;
    }

    let matched: boolean;
    try {
      matched = evaluateTrigger(rule.trigger, states);
    } catch {
      applications.push(makeIneligible(rule, "invalid_trigger"));
      continue;
    }
    if (!matched) continue;

    fired.push(rule);
  }

  const byKind = new Map<RuleEffect["kind"], AuthorityRule[]>();
  for (const rule of fired) {
    const list = byKind.get(rule.effect.kind);
    if (list) list.push(rule);
    else byKind.set(rule.effect.kind, [rule]);
  }
  const kindRules = (kind: RuleEffect["kind"]) => sortedByRuleId(byKind.get(kind) ?? []);

  const next: CurrentDetermination = structuredClone(current);
  let adverseOverrideFired = false;
  let overrideRuleId: string | null = null;
  const loweredElementRuleId = new Map<string, string>();

  // 1. override_outcome — first firing rule (by rule_id) sets the outcome;
  // the rest concur with whatever got kept.
  for (const [i, rule] of kindRules("override_outcome").entries()) {
    const eff = rule.effect as Extract<RuleEffect, { kind: "override_outcome" }>;
    if (i === 0) {
      const before = next.outcome;
      next.outcome = eff.outcome;
      adverseOverrideFired = true;
      overrideRuleId = rule.rule_id;
      applications.push({
        rule_id: rule.rule_id,
        effect: rule.effect,
        before,
        after: next.outcome,
        changed: before !== next.outcome,
        concurred: before === next.outcome,
        reason_sentence: rule.reason_sentence,
        authority_citation: rule.authority_citation,
        sources: rule.sources,
      });
    } else {
      applications.push({
        rule_id: rule.rule_id,
        effect: rule.effect,
        before: next.outcome,
        after: next.outcome,
        changed: false,
        concurred: true,
        reason_sentence: rule.reason_sentence,
        authority_citation: rule.authority_citation,
        sources: rule.sources,
      });
    }
  }

  // 2. cap_verdict — floor the verdict at (never above) `max` on its scale.
  for (const rule of kindRules("cap_verdict")) {
    const eff = rule.effect as Extract<RuleEffect, { kind: "cap_verdict" }>;
    const scale = findScale(ctx, eff.element);
    const currentValue = next.verdicts[eff.element];
    if (
      !scale || !scale.order.includes(eff.max) || currentValue === undefined ||
      !scale.order.includes(currentValue)
    ) {
      applications.push(makeIneligible(rule, "unknown_scale_value"));
      continue;
    }
    const idxCurrent = scale.order.indexOf(currentValue);
    const idxMax = scale.order.indexOf(eff.max);
    const newValue = scale.order[Math.max(idxCurrent, idxMax)];
    const changed = newValue !== currentValue;
    next.verdicts[eff.element] = newValue;
    if (changed) loweredElementRuleId.set(eff.element, rule.rule_id);
    applications.push({
      rule_id: rule.rule_id,
      effect: rule.effect,
      before: currentValue,
      after: newValue,
      changed,
      concurred: !changed,
      reason_sentence: rule.reason_sentence,
      authority_citation: rule.authority_citation,
      sources: rule.sources,
    });
  }

  // 3. route_to_basis — a favorable statutory route to the outcome, unless
  // an adverse override already fired this pass.
  for (const rule of kindRules("route_to_basis")) {
    const eff = rule.effect as Extract<RuleEffect, { kind: "route_to_basis" }>;
    if (adverseOverrideFired) {
      applications.push({
        rule_id: rule.rule_id,
        effect: rule.effect,
        before: next.outcome,
        after: next.outcome,
        changed: false,
        concurred: false,
        suppressed_by: overrideRuleId ?? undefined,
        reason_sentence: rule.reason_sentence,
        authority_citation: rule.authority_citation,
        sources: rule.sources,
      });
      continue;
    }
    if (!ctx.favorable_outcomes.includes(eff.outcome)) {
      applications.push(makeIneligible(rule, "unknown_outcome"));
      continue;
    }
    const before = next.outcome;
    next.outcome = eff.outcome;
    const changed = before !== eff.outcome;
    applications.push({
      rule_id: rule.rule_id,
      effect: rule.effect,
      before,
      after: eff.outcome,
      changed,
      concurred: !changed,
      reason_sentence: rule.reason_sentence,
      authority_citation: rule.authority_citation,
      sources: rule.sources,
    });
  }

  // 4. recognise_interest — favorable, law-only (R1) verdict raise.
  for (const rule of kindRules("recognise_interest")) {
    const eff = rule.effect as Extract<RuleEffect, { kind: "recognise_interest" }>;
    applications.push(
      applyFavorableVerdictEffect(rule, eff, next, ctx, adverseOverrideFired, overrideRuleId, loweredElementRuleId),
    );
  }

  // 5. precedent_verdict — favorable, same-facts precedent verdict raise.
  for (const rule of kindRules("precedent_verdict")) {
    const eff = rule.effect as Extract<RuleEffect, { kind: "precedent_verdict" }>;
    applications.push(
      applyFavorableVerdictEffect(rule, eff, next, ctx, adverseOverrideFired, overrideRuleId, loweredElementRuleId),
    );
  }

  // 6. require_condition — adverse, additive, deduped by exact text.
  for (const rule of kindRules("require_condition")) {
    const eff = rule.effect as Extract<RuleEffect, { kind: "require_condition" }>;
    const already = next.conditions.includes(eff.text);
    if (!already) next.conditions.push(eff.text);
    applications.push({
      rule_id: rule.rule_id,
      effect: rule.effect,
      before: already ? eff.text : null,
      after: eff.text,
      changed: !already,
      concurred: already,
      reason_sentence: rule.reason_sentence,
      authority_citation: rule.authority_citation,
      sources: rule.sources,
    });
  }

  // 7. flag_risk — adverse, additive per element, deduped by exact text.
  for (const rule of kindRules("flag_risk")) {
    const eff = rule.effect as Extract<RuleEffect, { kind: "flag_risk" }>;
    const bucket = next.risks[eff.element] ?? (next.risks[eff.element] = []);
    const already = bucket.includes(eff.text);
    if (!already) bucket.push(eff.text);
    applications.push({
      rule_id: rule.rule_id,
      effect: rule.effect,
      before: already ? eff.text : null,
      after: eff.text,
      changed: !already,
      concurred: already,
      reason_sentence: rule.reason_sentence,
      authority_citation: rule.authority_citation,
      sources: rule.sources,
    });
  }

  const invariant_violations = checkMonotonicity(current, next, ctx, applications);
  if (invariant_violations.length > 0) {
    return { next: structuredClone(current), applications, invariant_violations };
  }
  return { next, applications, invariant_violations: [] };
}
