// DOC 191 §6.2 STAGE 0 — THE PRIOR.
//
// Classify from `source_table` / `role` metadata alone. No text is read.
//
//   enforcement_actions-sourced AP rows  → pattern-prior. An enforcement
//        action against a named party is definitionally an OUTCOME.
//   edpb_guidelines / cppa_fsor_commentary / regulatory-guidance FC rows
//        → rule-eligible-prior. Guidance is definitionally the regulator
//        interpreting its own rule.
//
// Two consequences worth stating out loud, because both are load-bearing:
//
// 1. Stage 0 NEVER outputs `rule`. A rule row needs a rule_statement AND a
//    mechanically verified quote (doc 191 §4's two check constraints), and
//    stage 0 extracts nothing. "rule_eligible" means "send this to stage 1",
//    not "this is a rule". Promotion can only happen through stages 2 and 3.
//
// 2. The prior is about the SOURCE TYPE, so a role that disagrees with its
//    source type weakens it (an AP row sourced from a guideline, an FC row
//    sourced from an enforcement action) — those land at a lower confidence
//    tier, which is exactly what §6.3's checkpoint sample is weighted toward.

import type { ClassificationCandidate, Stage0Result } from "./types.ts";

const PATTERN_PRIOR_SOURCES = new Set(["enforcement_actions"]);

const RULE_ELIGIBLE_PRIOR_SOURCES = new Set([
  "edpb_guidelines",
  "cppa_fsor_commentary",
  "regulatory_guidance",
]);

/** Statute/authority text: the law itself, or an agency's own instrument. The
 *  prior is rule-eligible, but only at MEDIUM confidence — a CAM pin of a
 *  statute is often purely descriptive scaffolding for a factor, not a
 *  statement the product could ever gate on. */
const STATUTE_SOURCES = new Set([
  "provision_texts",
  "gdpr_articles",
  "gdpr_recitals",
  "cppa_authorities",
]);

/** Litigation. Doc 191 §7.1 leaves the ingestion shape for these to a CEO
 *  call before doc 201's build; until then a court decision is treated as a
 *  pattern-prior at LOW confidence, so it always reaches stage 1 rather than
 *  resting on a prior nobody has ratified. */
const LITIGATION_SOURCES = new Set(["court_decisions"]);

export function stage0Prior(c: ClassificationCandidate): Stage0Result {
  const src = c.source_table;
  const role = c.role ?? "";

  if (PATTERN_PRIOR_SOURCES.has(src)) {
    const aligned = role === "AP" || role === "AOW";
    return {
      prior: "pattern",
      rule_or_pattern: "pattern",
      confidence_tier: aligned ? "high" : "medium",
      pipeline_stage: "stage0_prior",
      basis: aligned
        ? `${src} + role ${role || "(none)"}: an enforcement action against a named party is definitionally an outcome — pattern-prior`
        : `${src} + role ${role || "(none)"}: enforcement source but a non-AP role — pattern-prior, weakened by the role mismatch`,
    };
  }

  if (RULE_ELIGIBLE_PRIOR_SOURCES.has(src)) {
    const aligned = role === "FC" || role === "AQ" || role === "";
    return {
      prior: "rule_eligible",
      rule_or_pattern: "pattern",
      confidence_tier: aligned ? "high" : "medium",
      pipeline_stage: "stage0_prior",
      basis: aligned
        ? `${src} + role ${role || "(none)"}: regulator guidance interpreting its own rule — rule-eligible-prior`
        : `${src} + role ${role || "(none)"}: guidance source but an ${role} role — rule-eligible-prior, weakened by the role mismatch`,
    };
  }

  if (STATUTE_SOURCES.has(src)) {
    return {
      prior: "rule_eligible",
      rule_or_pattern: "pattern",
      confidence_tier: "medium",
      pipeline_stage: "stage0_prior",
      basis: `${src}: statute or agency instrument text — rule-eligible-prior, but a CAM pin of a provision is frequently descriptive scaffolding rather than a gate-bearing statement`,
    };
  }

  if (LITIGATION_SOURCES.has(src)) {
    return {
      prior: "pattern",
      rule_or_pattern: "pattern",
      confidence_tier: "low",
      pipeline_stage: "stage0_prior",
      basis: `${src}: litigation. Doc 191 §7.1 leaves the ingestion shape for court decisions to a CEO call — pattern-prior at low confidence so the row always reaches stage 1`,
    };
  }

  return {
    prior: "pattern",
    rule_or_pattern: "pattern",
    confidence_tier: "low",
    pipeline_stage: "stage0_prior",
    basis: `${src || "(no source_table)"}: unrecognised source type — defaults to pattern-prior at low confidence (the safe direction, doc 191 §6.1)`,
  };
}
