// DOC 207 TRACK 3a — `applyLiaRules`: the LIA adapter over the generic rule
// interpreter (`_shared/corpus/rule-interpreter.ts`). Runs the typed
// three-part-test result through `LIA_RULES` (empty until the CEO stamps a
// rule — see `../../corpus/maps/lia-rules.ts`), then maps each fired
// application back onto the LIA-shaped bags: `three_part_test.<element>_test`
// (verdict + risk_factors/supporting_factors), `information_needed`
// (require_condition), and `determination_override` (override_outcome, plus
// the B3-9 outcome-degradation ladder this file computes — the generic
// interpreter has no notion of LIA's own outcome enum).
//
// Pure; no I/O; never throws on data (the effect-mapping below reads through
// the same total `bag()`/`s()`-style coercions the rest of the LIA pipeline
// uses, and the whole body is additionally wrapped so a truly unexpected
// shape degrades to an invariant violation rather than propagating).
//
// SINGLE DOOR: this module is the only place besides a `*-gate.ts` file or a
// test allowed to import `rule-interpreter.ts`/`rule-types.ts`
// (tests/edge/corpus/corpus-relevance-rule-boundary.test.ts enforces it) —
// and the only place allowed to import `lia-rules.ts` (same test, doc 207
// extension).

import {
  ADVERSE_KINDS,
  type AuthorityRule,
  type CurrentDetermination,
  type RuleApplication,
  type RuleEffect,
} from "../../../../_shared/corpus/rule-types.ts";
import { applyRules } from "../../../../_shared/corpus/rule-interpreter.ts";
import { buildLiaRuleStates } from "./rule-states.ts";
import { LIA_RULES, LIA_RULE_CONTEXT, LIA_RULES_VERSION } from "../../corpus/maps/lia-rules.ts";
// Re-exported so index.ts's telemetry can stamp the rules version without
// importing lia-rules.ts directly — this module is its one sanctioned door
// (tests/edge/corpus/corpus-relevance-rule-boundary.test.ts enforces it).
export { LIA_RULES_VERSION };
import type { LiaTypedStage2Result } from "./three-part-test-typed.ts";
import type { LiaDetermination, LiaOutcome } from "./types.ts";
// DOC 217 §5.2 — the V3 readings index.ts loads under LIA_V3_ENABLED; threaded
// straight through to buildLiaRuleStates (the emitter), never read here.
import type { ConfirmedReading } from "../v3/readings.ts";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const bag = (v: unknown): Bag => (v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {});
const stop = (t: string): string => (t ? (/[.!?]$/.test(t) ? t : `${t}.`) : "");

/** The three-part test's element keys, by the interpreter's element name. */
const TEST_KEY: Readonly<Record<string, "purpose_test" | "necessity_test" | "balancing_test">> = {
  purpose: "purpose_test",
  necessity: "necessity_test",
  balancing: "balancing_test",
};

export interface ApplyLiaRulesResult {
  readonly typed: LiaTypedStage2Result;
  readonly applications: readonly RuleApplication[];
  readonly invariant_violations: readonly string[];
}

function elementOf(effect: RuleEffect): string | undefined {
  if (
    effect.kind === "cap_verdict" || effect.kind === "precedent_verdict" ||
    effect.kind === "recognise_interest" || effect.kind === "flag_risk"
  ) {
    return effect.element;
  }
  return undefined;
}

/** An application whose effect actually landed this pass: matched, not
 *  ineligible, not suppressed by a stronger rule, and either changed the
 *  record or concurred with what was already there. Concurred applications
 *  still evidence an authority bearing on the record — the same criterion
 *  `renderRuleClause` (Track 3b) uses for the customer-visible lead clause. */
function landed(app: RuleApplication): boolean {
  return !app.ineligible && !app.suppressed_by && (app.changed || app.concurred);
}

export function applyLiaRules(
  typed: LiaTypedStage2Result,
  report: Bag,
  intake: Bag,
  rules: readonly AuthorityRule[] = LIA_RULES,
  // DOC 217 §5.2 — optional; omitted (or []) leaves the state bag without a
  // `props` key, so every rule keyed on a `prop:` atom stays silent (B2).
  readings?: readonly ConfirmedReading[],
): ApplyLiaRulesResult {
  try {
    const states = buildLiaRuleStates(report, intake, typed, readings);

    const tpt = bag(typed.three_part_test);
    const verdicts: Record<string, string> = {
      purpose: s(bag(tpt.purpose_test).verdict),
      necessity: s(bag(tpt.necessity_test).verdict),
      balancing: s(bag(tpt.balancing_test).verdict),
    };
    const baseline = (typed.determination_override ?? bag(report.lia_determination)) as unknown as LiaDetermination;
    const current: CurrentDetermination = {
      verdicts,
      outcome: s(baseline.outcome),
      conditions: [],
      risks: {},
    };

    let necessityConditionOpen = false;
    const result = applyRules([...rules], states, current, LIA_RULE_CONTEXT);

    if (result.invariant_violations.length > 0) {
      console.error(JSON.stringify({ evt: "lia_rule_invariant_violation", violations: result.invariant_violations }));
      return { typed, applications: result.applications, invariant_violations: result.invariant_violations };
    }

    if (result.applications.length === 0) {
      // Identity: zero rules fired (or LIA_RULES is empty, the default
      // until the CEO ratifies one) — nothing to map, return `typed` as-is.
      return { typed, applications: [], invariant_violations: [] };
    }

    const ruleById = new Map(rules.map((r) => [r.rule_id, r]));
    const mutated: {
      three_part_test: Bag;
      information_needed: Bag[];
      determination_override: LiaDetermination | null;
      eprivacy_foreclosed: boolean;
    } = {
      three_part_test: structuredClone(tpt),
      information_needed: structuredClone(typed.information_needed) as Bag[],
      determination_override: typed.determination_override
        ? structuredClone(typed.determination_override)
        : null,
      eprivacy_foreclosed: typed.eprivacy_foreclosed,
    };

    // ── 1. Verdicts — the interpreter's own final value per element, set
    // once (never per-application: several rules may target one element,
    // and `result.next.verdicts` already holds the authoritative outcome
    // of that whole contest). ──────────────────────────────────────────
    // BATCH d573cc4f (2026-09-12, LIA6-01, ChatGPT + Claude joint review) —
    // a recognise_interest rule (e.g. lia/rule/recognised-interest-security-
    // fraud, keyed only on purpose_details.interest_type) recognizes that
    // the INTEREST CATEGORY is one GDPR contemplates; it says nothing about
    // whether the record's own statement of that interest is clearly and
    // precisely articulated — the SEPARATE second sub-test build-upgrade4.ts's
    // interest_legitimacy already resolves (e.g. detecting a bundled
    // two-interest statement). Applying the rule's raise unconditionally
    // overwrote an already-correct "undetermined" purpose verdict with
    // "passes", while the generated Section II prose (sourced from
    // interest_legitimacy directly, never touched by this pass) kept
    // correctly saying "not yet determined" — a customer-visible, internally
    // contradictory report. A recognise_interest effect on "purpose" must
    // never raise the verdict past what interest_legitimacy itself already
    // established for THIS record.
    const interestLegitimacyVerdict = s(bag(report.interest_legitimacy).verdict);
    const purposeRaiseBlocked = interestLegitimacyVerdict === "undetermined_on_the_record" ||
      interestLegitimacyVerdict === "legitimate_interest_not_established";
    for (const [element, key] of Object.entries(TEST_KEY)) {
      let finalVerdict = result.next.verdicts[element];
      if (element === "purpose" && finalVerdict === "passes" && purposeRaiseBlocked) {
        finalVerdict = verdicts[element];
      }
      if (finalVerdict !== undefined && finalVerdict !== verdicts[element]) {
        bag(mutated.three_part_test[key]).verdict = finalVerdict;
      }
    }

    // ── 2. risk_factors / supporting_factors — additive, per landed
    // application, adverse kinds to risk_factors and favorable kinds to
    // supporting_factors (doc 207 §2.3; ADVERSE_KINDS/FAVORABLE_KINDS from
    // rule-types.ts partition the seven effect kinds). ──────────────────
    for (const app of result.applications) {
      const element = elementOf(app.effect);
      if (!element) continue;
      if (app.effect.kind !== "cap_verdict" && app.effect.kind !== "precedent_verdict" &&
        app.effect.kind !== "recognise_interest" && app.effect.kind !== "flag_risk") continue;
      if (!landed(app)) continue;
      const key = TEST_KEY[element];
      if (!key) continue;
      const test = bag(mutated.three_part_test[key]);
      const bucketKey = ADVERSE_KINDS.has(app.effect.kind) ? "risk_factors" : "supporting_factors";
      const bucket = Array.isArray(test[bucketKey]) ? [...(test[bucketKey] as string[])] : [];
      if (!bucket.includes(app.reason_sentence)) bucket.push(app.reason_sentence);
      test[bucketKey] = bucket;
      mutated.three_part_test[key] = test;
    }

    // ── 3. require_condition — additive to information_needed, deduped by
    // `dimensions` against both the typed builder's own entries and other
    // require_condition applications this pass (B3-8). `RuleEffect`'s
    // require_condition carries no per-rule `field`/`element` — the field
    // is therefore always the documented default, and the `enables` clause
    // names the rule's own `bears_on_element` (looked up by rule_id, since
    // `RuleApplication` itself carries no element for this effect kind). ──
    for (const app of result.applications) {
      if (app.effect.kind !== "require_condition") continue;
      if (!app.changed || app.ineligible) continue; // a concurred (duplicate-text) one is already represented
      const text = (app.effect as Extract<RuleEffect, { kind: "require_condition" }>).text;
      if (mutated.information_needed.some((e) => s(e.dimensions) === text)) continue;
      const rule = ruleById.get(app.rule_id);
      const element = rule?.bears_on_element ?? "";
      mutated.information_needed.push({
        field: "balancing_details.additional_mitigations",
        dimensions: text,
        provision: app.authority_citation,
        enables: element ? `the ${element} test` : "the assessment",
      });
      // BATCH c4d0b8a0 (2026-09-12, GPT rubric_unsupported_business_claim,
      // high) — a require_condition rule bearing on necessity is an OPEN
      // necessity question by construction (its own text asks the company
      // to resolve it); the fixed "legitimate_interests_available" sentence
      // elsewhere claims the less-intrusive-means comparison "is documented"
      // regardless, so the two directly contradicted each other on the same
      // page. Recorded here for the patch below.
      if (element === "necessity") necessityConditionOpen = true;
    }

    // ── 4. override_outcome / B3-9 outcome degradation ──────────────────
    // Only a `cap_verdict` can push a verdict to a WORSE value — the two
    // favorable kinds (recognise_interest, precedent_verdict) only raise,
    // so they can never source a degradation. Favorable effects never
    // change the outcome (doc 207 §2.3).
    // `changed` alone would miss the case where the ePrivacy override (or
    // another rule) already set the SAME outcome this rule proposes — the
    // interpreter records that as `concurred`, not `changed`, since the
    // raw value didn't move. The rule still fired and still bears an
    // authority the reader should see in `why`.
    const overrideApp = result.applications.find((a) =>
      a.effect.kind === "override_outcome" && (a.changed || a.concurred) && !a.ineligible
    );
    let outcomeSource: { outcome: string; reason_sentence: string } | null = null;
    if (overrideApp) {
      outcomeSource = { outcome: result.next.outcome, reason_sentence: overrideApp.reason_sentence };
    } else {
      const capApps = result.applications.filter((a) =>
        a.effect.kind === "cap_verdict" && a.changed && !a.ineligible
      );
      const capFor = (el: string) =>
        capApps.find((a) => (a.effect as Extract<RuleEffect, { kind: "cap_verdict" }>).element === el);
      const purposeCap = capFor("purpose");
      const necessityCap = capFor("necessity");
      const balancingCap = capFor("balancing");
      const baseOutcome = current.outcome;

      if (purposeCap && result.next.verdicts.purpose === "fails") {
        outcomeSource = { outcome: "legitimate_interests_not_available", reason_sentence: purposeCap.reason_sentence };
      } else if (
        balancingCap && result.next.verdicts.balancing === "likely_fails" &&
        baseOutcome === "legitimate_interests_available"
      ) {
        outcomeSource = {
          outcome: "available_only_with_mitigations",
          reason_sentence: balancingCap.reason_sentence,
        };
      } else if (baseOutcome === "legitimate_interests_available") {
        const uncertainCap = (purposeCap && result.next.verdicts.purpose === "uncertain" && purposeCap) ||
          (necessityCap && result.next.verdicts.necessity === "uncertain" && necessityCap) ||
          (balancingCap && result.next.verdicts.balancing === "uncertain" && balancingCap) || undefined;
        if (uncertainCap) {
          outcomeSource = { outcome: "undetermined_on_the_record", reason_sentence: uncertainCap.reason_sentence };
        }
      }
    }

    // BATCH c4d0b8a0 — patch the "documented" claim BEFORE the cap_verdict
    // block below, so a later override (if any) builds on the corrected
    // text via the same existingOverride ?? report.lia_determination read.
    if (necessityConditionOpen && current.outcome === "legitimate_interests_available") {
      const priorDet = (mutated.determination_override ?? bag(report.lia_determination)) as unknown as LiaDetermination;
      const priorWhy = s(priorDet.why);
      const DOCUMENTED_CLAIM = "the comparison against less intrusive means is documented, and";
      if (priorWhy.includes(DOCUMENTED_CLAIM)) {
        mutated.determination_override = {
          ...priorDet,
          outcome: priorDet.outcome || current.outcome,
          why: priorWhy.replace(
            DOCUMENTED_CLAIM,
            "whether the purpose could be achieved with less intrusive means remains an open record-completion item (see the necessity condition below), and",
          ),
          status: priorDet.status || "analysed",
        };
      }
    }

    if (outcomeSource) {
      const existingOverride = mutated.determination_override;
      const baseDet = (existingOverride ?? bag(report.lia_determination)) as unknown as LiaDetermination;
      // If the ePrivacy override already exists, its outcome is kept
      // (nothing can be worse than "not_available"); the new reason is
      // still prepended to `why` so the rule's authority reaches the record.
      const finalOutcome: LiaOutcome = existingOverride
        ? existingOverride.outcome
        : (outcomeSource.outcome as LiaOutcome);
      mutated.determination_override = {
        ...baseDet,
        outcome: finalOutcome,
        why: `${stop(outcomeSource.reason_sentence)} ${stop(s(baseDet.why))}`.trim(),
        rebalance_required: false,
        status: "analysed",
      };
    }

    const mutatedTyped: LiaTypedStage2Result = {
      three_part_test: mutated.three_part_test,
      information_needed: mutated.information_needed,
      determination_override: mutated.determination_override,
      eprivacy_foreclosed: mutated.eprivacy_foreclosed,
    };

    return { typed: mutatedTyped, applications: result.applications, invariant_violations: [] };
  } catch (e) {
    console.error(JSON.stringify({ evt: "lia_rule_invariant_violation", violations: [`rule_pass_threw: ${String((e as Error)?.message ?? e)}`] }));
    return { typed, applications: [], invariant_violations: [`rule_pass_threw: ${String((e as Error)?.message ?? e)}`] };
  }
}
