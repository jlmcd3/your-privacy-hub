/**
 * IR PLAYBOOK REFINEMENT PASS — item417 (IR fleet-template package, leg D of 4;
 * the final build leg of the final product).
 *
 * The ratified refinement template (item376/377 DPIA, item378 cppa-risk,
 * item386 LIA, item395 ADMT, item403 Governance, item407 Cyber, item412
 * Biometric) applied to the IR Playbook. The engine —
 * `_shared/ltp/refinement-core.ts` — is UNTOUCHED (item-417 acceptance: a
 * ZERO-LINE DIFF on the core): this module is CONFIG ONLY, consuming the
 * mined W1–W8 watchlist, `W-COPYEDIT` and the xp-ir designed-output exemplars
 * from `./ir-refinement-config.ts` (item416 leg C).
 *
 * Architecture: CRITIC (Claude) -> VERIFIER (GPT-4o) -> DETERMINISTIC SPLICER.
 * Every core invariant is inherited unchanged from refinement-core.ts:
 *   • the critic sees the document WITHOUT `_meta` (stripMeta)
 *   • impossible proposals (protected path, quote not present at the node) are
 *     killed deterministically BEFORE the verifier call
 *   • the verifier receives per-proposal `node_content`
 *   • condition (5) is the necessity condition
 *   • MAX_SPLICES = 12
 *   • the splicer is double-anchored (path resolves AND the quote survives)
 *     and `_meta` is barred in code
 *   • FAIL-OPEN in every branch — the document always proceeds
 *
 * ── THE TWO ARTIFACTS (item417 §1, stated choice) ───────────────────────────
 * ONE CRITIC PASS OVER THE PERSISTED RECORD — not one pass per artifact.
 * Reasons, in order:
 *   (a) The INCIDENT WORKSHEET is BLANK BY DESIGN (xp-ir-1). It carries no
 *       assertions to refine; a critic pass dedicated to it could only produce
 *       proposals that fill it in — the exact regression the exemplar bars.
 *       It is therefore a PROTECTED ROOT here, not a second critic subject.
 *   (b) The defects the archive actually shows (W1/W2/W4/W8) are
 *       CROSS-ARTIFACT: an absence sentence in the standing playbook is only
 *       false against the record, and a pinpoint is only misapplied against
 *       the determinations. A critic that saw one artifact at a time would be
 *       reasoning from a partial document.
 *   (c) THE 12-CAP STAYS HONEST. MAX_SPLICES is a per-DOCUMENT budget. One
 *       pass means one budget of 12 splices for the whole persisted record —
 *       exactly the semantics every other product has. Two passes would
 *       silently double it to 24 while every telemetry field still read "12".
 * Consequence: `critic_findings`, `verifier_approved`, `spliced`, `capped` and
 * `cap_overflow` are whole-document counts, as everywhere else in the fleet.
 *
 * ── IR PROTECTED-LEAF TAXONOMY (item417 §2) ─────────────────────────────────
 * Nine named classes, each with its own refusal test in
 * `tests/edge/item417/refinement-wiring.test.ts`. Two are IR-specific:
 *   • I4 — THE TEMPLATE-VS-AUTHORITY FRAMING NOTE. `template_note` states that
 *     NIST SP 800-61r3 / CISA / the ICO toolkit are TEMPLATES, not authority
 *     (item414 IR-3). A model "tightening" it is one verb away from asserting
 *     that NIST *requires* something. Barred outright and carried as the named
 *     BARRED-LEAF CANARY, asserted byte-identical through a full pass.
 *   • I6 — THE UNRECORDED-SECTION LEDGER (item414 IR-1). The single absence
 *     ledger replaced a per-cell "Not recorded" litany; a proposal that
 *     rewrites the ledger sentence machinery re-scatters absence phrasing.
 */

import {
  applySplicesWith,
  composePrompt,
  CRITIC_PROMPT_BASE,
  isProtectedPathFor,
  parseJsonLoose,
  parsePath,
  protectedReasonFor,
  readPath,
  runRefinement,
  VERIFIER_PROMPT_BASE,
  type CriticFinding,
  type RefinementConfig,
  type RefinementDeps,
  type RefinementRunOptions,
  type RefinementTelemetry,
  type SpliceResult,
} from "../../../_shared/ltp/refinement-core.ts";
import {
  IR_CRITIC_WATCHLIST,
  IR_REFINEMENT_CONFIG_VERSION,
  IR_VERIFIER_EXEMPLARS,
  IR_WATCH_CLASSES,
} from "./ir-refinement-config.ts";
import { IR_SECTION_SPECS } from "../prose/ir.spine.ts";

export type { CriticFinding, RefinementDeps, RefinementTelemetry, SpliceResult };
export {
  IR_CRITIC_WATCHLIST,
  IR_REFINEMENT_CONFIG_VERSION,
  IR_VERIFIER_EXEMPLARS,
  IR_WATCH_CLASSES,
};

export const IR_REFINEMENT_VERSION = "refine-ir-2026-08-09-item417";

// ── PROTECTED-LEAF TAXONOMY (item417 §2) ────────────────────────────────────

/**
 * I1 — DETERMINATION / VERDICT FIELDS. Every Art. 33/34 determination, every
 * finding verdict and every derived status is a deterministic output of the
 * item312/414 deliverables builder (xp-ir-5). A model rewording a
 * determination is the specific harm this taxonomy exists to prevent.
 */
export const IR_PROTECTED_VERDICT_KEYS = [
  "verdict",
  "decision",
  "determination",
  "determination_outcome",
  "outcome",
  "conclusion",
  "conclusion_label",
  "status",
  "rule_id",
  "rule_ids",
  "record_backed",
  "blank_by_design",
] as const;

/**
 * I2 — ENUM / DATE / NAME keys per the IR report schema
 * (`_local/report-schemas/ir-playbook.ts`).
 */
export const IR_PROTECTED_ENUM_DATE_NAME_KEYS = [
  "kind",
  "artifact",
  "authority_class",
  "jurisdiction",
  "jurisdictions",
  "regulator",
  "organisation_type",
  "organization_type",
  "org_type",
  "cause",
  "contained",
  "entity_name",
  "organization_name",
  "organisation_name",
  "processor_name",
  "counterparty",
  "title",
  "heading",
  "label",
  "role",
  "columns",
  "date",
  "discovery_datetime",
  "effective_date",
  "generated_at",
  "assessed_at",
] as const;

/**
 * I3 — CITATIONS AND VERBATIM AUTHORITY TEXT. `standard` is the leaf every
 * verified corpus passage renders onto; the citation family addresses the same
 * authority. Byte-identical to the enrolled row or it does not ship.
 */
export const IR_PROTECTED_AUTHORITY_KEYS = [
  "standard",
  "standard_citation",
  "citation",
  "citations",
  "as_cited",
  "excerpt",
  "verbatim",
  "verbatim_quote",
  "quoted_text",
  "pinpoint",
  "subsection",
  "provision",
  "statutory_basis",
  "authority",
  "corpus_key",
  "corpus_row_id",
  "proposition_key",
  "proposition_keys",
  "pin_verified",
  "citation_verified",
  "source_url",
  "portal",
] as const;

/**
 * I4 — THE TEMPLATE-VS-AUTHORITY FRAMING NOTE (item414 IR-3). BARRED.
 * Carried as the named barred-leaf canary.
 */
export const IR_PROTECTED_TEMPLATE_NOTE_KEYS = [
  "template_note",
] as const;

/**
 * I5 — NOTIFICATION CLOCKS AND STATUTORY DEADLINES. The 72-hour Art. 33(1)
 * clock, the HIPAA 60-day outer limit, the Cal. Civ. Code § 1798.82 individual
 * notice deadline and every arithmetic output derived from them.
 */
export const IR_PROTECTED_CLOCK_KEYS = [
  "deadline",
  "deadlines",
  "deadline_utc",
  "due_at",
  "due_by",
  "clock",
  "clock_start",
  "hours",
  "hours_remaining",
  "days",
  "notification_window",
  "notification_deadline",
  "awareness_at",
  "awareness_timestamp",
  "discoveryDateTime",
  "discovery_at",
] as const;

/**
 * I6 — THE ITEM 414 UNRECORDED-SECTION LEDGER SENTENCE MACHINERY (IR-1).
 * One ledger, said once. Never rewritten, never re-scattered.
 */
export const IR_PROTECTED_LEDGER_KEYS = [
  "unrecorded_ledger",
  "information_needed",
  "scope_note",
] as const;

/** I7 — MACHINE IDENTIFIERS the renderers and the P2 serializer key on. */
export const IR_PROTECTED_IDENTIFIER_KEYS = [
  "id",
  "key",
  "check_id",
  "finding_id",
  "assessment_id",
  "playbook_id",
  "schema_version",
  "version",
  "emit_gate",
  "build_stamp",
  "section_order",
  "report_keys",
  "source_fields",
] as const;

/** I8 — DECLARED ANCHORAGE (leg-C coverage). Never rewritten. */
export const IR_PROTECTED_ANCHORAGE_KEYS = [
  "anchor_keys",
  "anchor_key",
  "anchors",
] as const;

/**
 * I9 — THE ITEM 414 SPINE SECTION IDS. COMPUTED from `ir.spine.ts`, never
 * re-typed: a leaf whose KEY is a plan section id is that section's machine
 * address (W7 — identity and order are structural).
 */
export const IR_PROTECTED_SPINE_SECTION_IDS: readonly string[] = IR_SECTION_SPECS.map((s) => s.id);

export const IR_PROTECTED_LEAF_CLASSES = {
  verdict: IR_PROTECTED_VERDICT_KEYS,
  enum_date_name: IR_PROTECTED_ENUM_DATE_NAME_KEYS,
  authority: IR_PROTECTED_AUTHORITY_KEYS,
  template_note: IR_PROTECTED_TEMPLATE_NOTE_KEYS,
  clock: IR_PROTECTED_CLOCK_KEYS,
  ledger: IR_PROTECTED_LEDGER_KEYS,
  identifier: IR_PROTECTED_IDENTIFIER_KEYS,
  anchorage: IR_PROTECTED_ANCHORAGE_KEYS,
  spine_section_id: IR_PROTECTED_SPINE_SECTION_IDS,
} as const;

/**
 * PROTECTED ROOTS — a proposal may not enter these subtrees at all, at any
 * depth: the blank-by-design worksheet, the authority exhibit and its corpus
 * metadata, the determination machinery, the per-regime duty sets, the
 * enforcement material, the deterministic check ledger and the portals table.
 */
export const IR_PROTECTED_ROOTS: string[] = [
  "incident_worksheet",
  "authority_exhibit",
  "ir_corpus_meta",
  "sa_notification_determination",
  "data_subject_communication_determination",
  "art34_exemption_analysis",
  "content_owner_mapping",
  "notification_duties",
  "enforcement_precedents",
  "enforcement_meta",
  "deterministic_checks",
  "lint_warnings",
  "portals",
  "disclaimer",
  "standing_disclaimer",
  "schema_version",
  "_revision",
];

export const IR_PROTECTED_LEAF_KEYS: string[] = Array.from(
  new Set(Object.values(IR_PROTECTED_LEAF_CLASSES).flatMap((v) => [...v])),
);

// ── Config ──────────────────────────────────────────────────────────────────

export const IR_CRITIC_SYSTEM_PROMPT = composePrompt(CRITIC_PROMPT_BASE, IR_CRITIC_WATCHLIST);
export const IR_VERIFIER_SYSTEM_PROMPT = composePrompt(VERIFIER_PROMPT_BASE, IR_VERIFIER_EXEMPLARS);

export const IR_REFINEMENT_CONFIG: RefinementConfig = {
  product: "ir-playbook",
  version: IR_REFINEMENT_VERSION,
  criticSystemPrompt: IR_CRITIC_SYSTEM_PROMPT,
  verifierSystemPrompt: IR_VERIFIER_SYSTEM_PROMPT,
  protectedRootKeys: IR_PROTECTED_ROOTS,
  protectedLeafKeys: IR_PROTECTED_LEAF_KEYS,
};

export function isIrProtectedPath(path: string): boolean {
  return isProtectedPathFor(path, IR_REFINEMENT_CONFIG);
}

export function irProtectedReason(path: string): string | null {
  return protectedReasonFor(path, IR_REFINEMENT_CONFIG);
}

export function applyIrSplices(
  report: Record<string, unknown>,
  approved: CriticFinding[],
): SpliceResult {
  return applySplicesWith(report, approved, IR_REFINEMENT_CONFIG);
}

// ── ITEM 412-C LESSON, APPLIED (item417 §1) — MONOLITH-LEAF SPAN SPLICING ────
//
// FINDING. The shared splicer's replacement semantics are NODE-LEVEL
// (`writePath(report, f.path, f.replacement)`). The IR shape was measured leaf
// by leaf against `IR_PERFECT`: every leaf of `standing_playbook` is
// sentence-sized (333 string leaves, LONGEST 323 characters —
// `standing_playbook.template_note`, which is barred anyway), and
// `incident_worksheet` is blank by design and a protected root. Node-level
// replacement is therefore SAFE across both artifacts.
//
// EXCEPT ONE LEAF. `playbook_text` — the generated narrative that
// `generate-ir-playbook` carries OUTSIDE `report_data` and attaches to the
// refinement document for the duration of the pass — is this product's
// monolith, the direct analogue of biometric's `assessment_text`. A node-level
// splice there is document destruction. It is enumerated below and both
// item-412-C mechanisms apply to it unchanged:
//   1. SPAN SPLICE — only the double-anchored quote inside the string is
//      replaced; every byte outside the span is identical.
//   2. LEAF-INTEGRITY GUARD — a splice whose applied length delta is not
//      exactly (replacement.length − quote.length), or which would shrink the
//      leaf below 90% of its pre-splice length, is REJECTED: the leaf is
//      restored byte-identical, the proposal is logged in `leaf_guard_rejected`
//      and the bucket accounting is rebalanced.
//
// A SECOND, DYNAMIC ARM. The static list is the enumerated contract; because
// `playbook_text` is model-generated and future builders may grow a second
// long leaf, any UNPROTECTED string leaf at or above
// `IR_MONOLITH_MIN_LENGTH` is treated as a monolith at run time too and is
// reported in `monolith_paths_detected`. The static list can never shrink
// silently; the dynamic arm can only ADD protection.

/** Leaves whose size makes node-level replacement unsafe. ENUMERATED. */
export const IR_MONOLITH_LEAF_PATHS: readonly string[] = ["$.playbook_text"];

/** Run-time monolith threshold (characters) for the dynamic arm. */
export const IR_MONOLITH_MIN_LENGTH = 2000;

/** A splice may never shrink a monolith leaf below this fraction of itself. */
export const IR_LEAF_MIN_RETAINED_FRACTION = 0.9;

export interface IrLeafGuardRejection {
  path: string;
  reason: "whole_leaf_replacement" | "length_delta_mismatch" | "shrank_below_floor" | "quote_absent";
  pre_length: number;
  attempted_length: number;
  expected_length: number;
}

export interface IrRefinementTelemetry extends RefinementTelemetry {
  /** ITEM 412-C mechanism — proposals killed by the leaf-integrity guard. */
  leaf_guard_rejected: { count: number; items: IrLeafGuardRejection[] };
  /** Monolith-leaf paths that were spliced SPAN-LEVEL (not node-level). */
  span_spliced_paths: string[];
  /** Every path treated as a monolith on this run (static ∪ dynamic). */
  monolith_paths_detected: string[];
  /** The item417 choice, recorded in telemetry so the pilots can see it. */
  artifact_pass_mode: "single_pass_over_persisted_record";
  /** ITEM 417-B — set when the pass was skipped fail-open on TIME, not error. */
  skipped_reason: string | null;
  /** ITEM 417-B — the budget reading that produced the decision. */
  time_budget: IrBudgetVerdict | null;
}

/**
 * Replace ONLY the first occurrence of `quote` inside `pre` with
 * `replacement`. Returns null when the quote is not present.
 */
export function spanSplice(pre: string, quote: string, replacement: string): string | null {
  if (typeof pre !== "string" || typeof quote !== "string" || !quote) return null;
  const at = pre.indexOf(quote);
  if (at < 0) return null;
  return pre.slice(0, at) + replacement + pre.slice(at + quote.length);
}

/**
 * The deterministic leaf-integrity guard. `null` = accept; otherwise the
 * rejection record.
 */
export function checkLeafIntegrity(
  path: string,
  pre: string,
  post: string,
  quote: string,
  replacement: string,
): IrLeafGuardRejection | null {
  const expected = pre.length + (replacement.length - quote.length);
  const base = { path, pre_length: pre.length, attempted_length: post.length, expected_length: expected };
  if (!quote || !pre.includes(quote)) return { ...base, reason: "quote_absent" };
  if (post.length !== expected) {
    const whole = post === replacement && replacement.length !== pre.length;
    return { ...base, reason: whole ? "whole_leaf_replacement" : "length_delta_mismatch" };
  }
  if (post.length < Math.floor(pre.length * IR_LEAF_MIN_RETAINED_FRACTION)) {
    return { ...base, reason: "shrank_below_floor" };
  }
  return null;
}

/** Write a string back to `path`. Local — the core's writer is private. */
function writeStringPath(root: unknown, path: string, value: string): boolean {
  const segs = parsePath(path);
  if (!segs || segs.length === 0) return false;
  // deno-lint-ignore no-explicit-any
  let cur: any = root;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur === null || cur === undefined || typeof cur !== "object") return false;
    cur = cur[segs[i] as never];
  }
  if (cur === null || cur === undefined || typeof cur !== "object") return false;
  cur[segs[segs.length - 1] as never] = value;
  return true;
}

/** Every unprotected string leaf at or above the monolith threshold. */
export function detectMonolithLeaves(report: Record<string, unknown>): string[] {
  const out: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (typeof node === "string") {
      if (node.length >= IR_MONOLITH_MIN_LENGTH && !isIrProtectedPath(path)) out.push(path);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === "_meta" || k === "_staging") continue;
        walk(v, `${path}.${k}`);
      }
    }
  };
  walk(report, "$");
  return out;
}

function emptyLeafGuard(): { count: number; items: IrLeafGuardRejection[] } {
  return { count: 0, items: [] };
}

export async function runIrRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  opts: RefinementRunOptions = {},
): Promise<IrRefinementTelemetry> {
  // The monolith set: the enumerated contract ∪ anything the dynamic arm sees.
  const monolithPaths = Array.from(new Set([
    ...IR_MONOLITH_LEAF_PATHS,
    ...detectMonolithLeaves(report),
  ]));

  // Pre-splice snapshot of every monolith leaf.
  const pre = new Map<string, string>();
  for (const p of monolithPaths) {
    const v = readPath(report, p);
    if (typeof v === "string") pre.set(p, v);
  }

  // Capture the critic's proposals so a monolith splice can be REDONE
  // span-level from the same (quote, replacement) pair the core used. The
  // critic call itself is untouched — this only observes its output.
  let proposals: CriticFinding[] = [];
  const observingDeps: RefinementDeps = {
    critic: async (system, user) => {
      const raw = await deps.critic(system, user);
      try {
        const parsed = parseJsonLoose(raw);
        if (parsed && Array.isArray(parsed.findings)) proposals = parsed.findings as CriticFinding[];
      } catch { /* fail-open: observation never breaks the pass */ }
      return raw;
    },
    verifier: deps.verifier,
  };

  const base = await runRefinement(report, intake, observingDeps, IR_REFINEMENT_CONFIG, opts);
  const tel = base as IrRefinementTelemetry;
  tel.leaf_guard_rejected = emptyLeafGuard();
  tel.span_spliced_paths = [];
  tel.monolith_paths_detected = monolithPaths;
  tel.artifact_pass_mode = "single_pass_over_persisted_record";

  for (const [path, before] of pre) {
    const after = readPath(report, path);
    if (typeof after !== "string" || after === before) continue;
    // The core replaced the whole leaf. Recover the proposal and redo it as a
    // span splice, then run the guard on the result.
    const f = proposals.find((p) =>
      p && p.path === path && typeof p.replacement === "string" && p.replacement === after
    ) ?? proposals.find((p) => p && p.path === path);
    const quote = typeof f?.quote === "string" ? f.quote : "";
    const replacement = typeof f?.replacement === "string" ? f.replacement : after;
    const spanned = spanSplice(before, quote, replacement);
    const candidate = spanned ?? after;
    const rejection = spanned === null
      ? {
        path,
        reason: "quote_absent" as const,
        pre_length: before.length,
        attempted_length: after.length,
        expected_length: before.length,
      }
      : checkLeafIntegrity(path, before, candidate, quote, replacement);

    if (rejection) {
      // REJECT — restore the leaf byte-identical and rebalance the buckets.
      writeStringPath(report, path, before);
      tel.leaf_guard_rejected.items.push(rejection);
      tel.leaf_guard_rejected.count++;
      if (tel.spliced > 0) tel.spliced--;
      tel.spliced_paths = tel.spliced_paths.filter((p) => p !== path);
      continue;
    }
    // ACCEPT — span-level, every byte outside the span identical.
    writeStringPath(report, path, candidate);
    if (!tel.span_spliced_paths.includes(path)) tel.span_spliced_paths.push(path);
  }
  return tel;
}
