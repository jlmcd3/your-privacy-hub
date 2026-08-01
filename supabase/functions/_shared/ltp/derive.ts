/**
 * LTP — DERIVE stage (Phase-2 shadow-mode).
 *
 * Deterministically assembles a RenderPlan v1 from intake + already-generated
 * report_data. The intent of the design is a Pass-1 structured-output model
 * call; the shadow-mode landing here uses deterministic derivation over the
 * canonical Phase-1 registries so the pipeline scaffold (validators, gates,
 * telemetry, Pass G, closeness heuristic) is exercised end-to-end without
 * disturbing the customer path. LLM-driven Pass-1 replaces this body in a
 * downstream turn after two clean shadow waves.
 *
 * Pure; never throws (returns a plan with conservative_write_around triggered
 * on any internal error).
 */
import type {
  CitationBinding,
  FactorTableEntry,
  IntakeLedgerEntry,
  Proposition,
  RenderPlan,
} from "../render-plan/schema.ts";
import { CPPA_RISK_CONCLUSIONS } from "../legal-test/cppa-risk-conclusions.ts";
import { CPPA_RISK_FACTORS, WEIGHING_TESTS } from "../factors/cppa-risk-factors.ts";
import { evaluateCppaRiskGates } from "./gate-eval.ts";
import { cppaRiskContract } from "../intake-contracts/cppa-risk-assessment.ts";
// ITEM 305 — the five per-activity analytic deliverables. SINGLE-WRITER:
// derivePlan is the only caller; the assembler shard merely projects it.
import { buildActivityAnalytics } from "./analytic-deliverables/build.ts";
// ITEM 341 — EU persuasive-authority section (separately labelled; never
// folded into the CPPA-scoped enforcement surfaces). Corpus is fetched by
// the caller (eu-authority/fetch.ts) and passed in; the builder is pure and
// degrades honestly when the corpus is absent.
import { buildEuAuthoritySection } from "./eu-authority/build.ts";
import type { EuAuthorityCorpus } from "./eu-authority/types.ts";


export interface DeriveInput {
  readonly intake: Record<string, unknown>;
  readonly report_data: Record<string, unknown>;
  readonly buildStamp: string;
  /** ITEM 341 — optional EU/EEA corpus payload. Absent => honest degradation. */
  readonly eu_authority_corpus?: EuAuthorityCorpus | null;
}

/**
 * ITEM 258 — SPEC §2 FULL-CONTRACT LEDGER (Build-Issues Issue-4 code half CLOSED).
 *
 * The ledger is now derived from the intake contract source of truth
 * (`cppaRiskContract.fields[].key`) so every contract field the customer
 * populates is grounded vocabulary for the grounded-note screen — not just
 * the hand-typed subset previously listed here. Two exclusions apply:
 *
 *  (1) Dotted-leaf keys (contain "."): the parent structured key
 *      (e.g. `impact_intake`) carries the verbatim payload; the leaves
 *      (`impact_intake.harmTypes`, etc.) are enum-parity anchors only.
 *
 *  (2) PII CARVE-OUT: `i8_certifying_exec_name`, `i8_contact_email`,
 *      `i8_contact_phone`. SPEC §2's "full contract key list" is qualified
 *      by SPEC §4's PII law ("PII verbatim only in attestation/metadata
 *      with post-render email/phone reject"). Ledger verbatims feed the
 *      grounded-note ALLOWED vocabulary; including name/email/phone would
 *      license PII into customer-facing weight_notes. Excluding these
 *      three fields is a non-material deviation from §2's literal text in
 *      service of §4's explicit law. `i8_certifying_exec_title` (role
 *      title, PII-law-permitted) STAYS.
 *
 * The five shadow-era fossils (`sell_share`, `sensitive_pi`,
 * `processing_purposes`, `safeguards_summary`, `retention_period`) are
 * NOT contract keys and therefore disappear naturally — this CLOSES the
 * code half of Build-Issues Issue 4.
 */
const PII_EXCLUDED_LEDGER_KEYS: ReadonlySet<string> = new Set([
  "i8_certifying_exec_name",
  "i8_contact_email",
  "i8_contact_phone",
  // ITEM 305 — § 7152(a)(9) approver NAME is PII; the POSITION stays.
  "a9_approver_name",
]);

const LEDGER_KEYS: readonly string[] = cppaRiskContract.fields
  .map((f) => f.key)
  .filter((k) => !k.includes("."))
  .filter((k) => !PII_EXCLUDED_LEDGER_KEYS.has(k));


export { LEDGER_KEYS };

import { displayLabelForField } from "./grounded-note.ts";

export function pickLedger(intake: Record<string, unknown>): IntakeLedgerEntry[] {
  const out: IntakeLedgerEntry[] = [];
  for (const k of LEDGER_KEYS) {
    if (intake && k in intake) {
      const v = (intake as any)[k];
      out.push({
        ledger_id: `L.${k}`,
        intake_field: k,
        value: (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) ? v : JSON.stringify(v),
        // ITEM 243 defect 1(d) — display is the HUMAN LABEL for the
        // intake field, not the value. Previously `display` was the value
        // itself, which starved the grounded-note vocabulary of the
        // field-label tokens.
        display: displayLabelForField(k),
      });
    }
  }
  return out;
}

export function pickCitationBindings(): CitationBinding[] {
  // ITEM 240 CP2: one binding per conclusion so `cb.<conclusion_id>`
  // always resolves. Deduplication by (corpus_key, pinpoint) was
  // cosmetic and caused V2_CITE_MISS on Type-J propositions that
  // share an anchor with earlier conclusions once the plan is
  // validated on the authoritative Pass-1 path.
  return CPPA_RISK_CONCLUSIONS.map((c) => ({
    pinpoint_ref: `cb.${c.id}`,
    corpus_key: c.anchor.corpus_key,
    pinpoint: c.anchor.pinpoint,
    jurisdiction_tag: c.jurisdiction_tag,
    authority_weight: "binding" as const,
  }));
}


function pickPropositions(bindings: readonly CitationBinding[], ledger: readonly IntakeLedgerEntry[]): Proposition[] {
  const bindingIdByConclusion = new Map(bindings.map((b) => [b.pinpoint_ref.replace(/^cb\./, ""), b.pinpoint_ref]));
  const ledgerIds = ledger.map((l) => l.ledger_id);
  return CPPA_RISK_CONCLUSIONS.map((c) => {
    const p: Proposition = {
      id: `p.${c.id}`,
      conclusion_id: c.id,
      epistemic_type: c.epistemic_type,
      jurisdiction_tag: c.jurisdiction_tag,
      anchor: c.anchor,
      display_label: c.display_label,
      intake_ledger_refs: c.epistemic_type === "R" ? ledgerIds.slice(0, 2) : [],
      citation_binding_refs: [bindingIdByConclusion.get(c.id) ?? `cb.${c.id}`],
      ...(c.epistemic_type === "R" ? { polarity: "not_applicable" as const } : {}),
      ...(c.epistemic_type === "W" && c.weighing_test_id ? { weighing_frame_ref: `wf.${c.weighing_test_id}` } : {}),
    };
    return p;
  });
}

export function pickFactorTable(): FactorTableEntry[] {
  return CPPA_RISK_FACTORS.map((f) => ({
    factor_id: f.id,
    kind: f.kind,
    jurisdiction_tag: f.jurisdiction_tag,
    present_in_intake: false, // shadow-mode: presence detection is a Pass-1 model responsibility
    intake_ledger_refs: [],
    guidance_refs: f.guidance_refs ?? [],
    anchor: f.anchor,
    display_label: f.label,
  }));
}


export function derivePlan(input: DeriveInput): RenderPlan {
  try {
    const ledger = pickLedger(input.intake ?? {});
    const bindings = pickCitationBindings();
    const propositions = pickPropositions(bindings, ledger);
    const factor_table = pickFactorTable();
    const gate_outcomes = evaluateCppaRiskGates(input.intake ?? {});
    return {
      plan_version: "v1",
      product: "cppa-risk-assessment",
      build_stamp: input.buildStamp,
      jurisdiction_tag: "cppa-ca",
      intake_ledger: ledger,
      citation_bindings: bindings,
      propositions,
      factor_table,
      weighing_frame: [], // populated by Guide stage
      gate_outcomes,
      conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
      // ITEM 305 — deterministic per-activity analytic deliverables.
      activity_analytics: buildActivityAnalytics(input.intake ?? {}) as unknown as readonly Record<string, unknown>[],
      // ITEM 341 — persuasive EU authority, separately labelled.
      eu_persuasive_authority: buildEuAuthoritySection(
        input.intake ?? {},
        input.eu_authority_corpus ?? null,
      ) as unknown as Record<string, unknown>,

    };
  } catch (e) {
    return {
      plan_version: "v1",
      product: "cppa-risk-assessment",
      build_stamp: input.buildStamp,
      jurisdiction_tag: "cppa-ca",
      intake_ledger: [],
      citation_bindings: [],
      propositions: [],
      factor_table: [],
      weighing_frame: [],
      gate_outcomes: [],
      conservative_write_around: { triggered: true, reason: `derive_error:${(e as Error)?.message ?? "?"}`, disclosure: "silent+telemetry" },
      // ITEM 305 — degraded envelope; never omitted, never invented.
      activity_analytics: buildActivityAnalytics({}) as unknown as readonly Record<string, unknown>[],
      // ITEM 341 — degraded envelope; emitted, never invented.
      eu_persuasive_authority: buildEuAuthoritySection({}, null) as unknown as Record<string, unknown>,

    };
  }
}

export { WEIGHING_TESTS };
