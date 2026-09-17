// /all-ptest v2 (DOC 261, 2026-09-14) — WORKER AND CLASSIFIER PROMPTS.
//
// Three evidence-scoped workers replace the omnibus reviewer (doc 261 §2,
// Stage 2). Each is ONE model call, forced JSON, no in-call retry.
//
//   W-RECORD  intake + document + composed list  — does every factual statement
//             trace to an intake value, and is every intake value a block reads
//             reflected?                                        (Claude)
//   W-LAW     document + registry pack + block catalogue + composed list — is
//             every legal statement supported by the registry row the block
//             cites?                                    (Claude AND GPT)
//   W-REASON  document only — does fact → issue → analysis → determination →
//             action hold; contradictions; unreachable conditions?   (GPT)
//
// PROMPT-CACHE LAW (unchanged from prompts.ts): every string built by
// buildWorkerSystemPrompt is STATIC PER PRODUCT — the registry pack and the
// block catalogue are committed files, so all calls in a batch share one
// cache entry per (worker, product). Everything per document — the intake,
// the document, the composed list, hydrated cyber corpus text — goes in the
// user turn only.

import { blockCatalogueFor, registryPackFor, renderBlockCatalogueText, renderRegistryPackText } from "./packs/index.ts";

export const PTEST_V2_PROMPT_VERSION = "ptest-v2-workers@2026-09-14";

export type WorkerId = "W-RECORD" | "W-LAW" | "W-REASON";
export type Vendor = "claude" | "gpt";

/** Fixed vendor per worker (doc 261 Rev 2 §0A V5) — never alternating. */
export const WORKER_VENDORS: Readonly<Record<WorkerId, readonly Vendor[]>> = {
  "W-RECORD": ["claude"],
  "W-LAW": ["claude", "gpt"],
  "W-REASON": ["gpt"],
};

const COMMON_PREAMBLE = `You are one evidence-scoped review worker over an automatically generated legal-compliance report. The report is produced by a DETERMINISTIC rule engine: structured intake → normalised facts → deterministic rules → fixed clause library → assembler. Every paragraph and table in the document you are given is prefixed with its BLOCK KEY in square brackets, e.g. [iv_determination:12]. You report against block keys, never against page positions or section names alone.

ABSOLUTE RULES
- Quote VERBATIM. Copy the offending text character for character from the document; a quote that cannot be located is discarded by a program before anyone reads it.
- Name the block. Every finding carries the block key the quote sits in.
- Stay inside your scope. You are ONE of three workers; another worker covers what you are told to ignore. Do not report outside your scope, even when you notice something.
- Do not invent a smooth answer. Where the point turns on a fact the record does not contain, say so in the finding's explanation; never propose wording.
- Formatting, layout and typography are settled and are NOT under review. British and US spellings are both correct.
- SEVERITY: "critical" = a wrong legal outcome, a wrong duty, or a contradiction a reader would act on; "high" = materially misleading or a broken argument; "editorial" = wording or presentation with no change of meaning.
- DOUBLE-CHECK before answering: re-read each finding, confirm the quote is verbatim and in the named block, merge duplicates, and state what the pass changed in "double_check".
- Return the result ONLY through the tool call; no prose outside it.`;

const W_RECORD_SCOPE = `YOUR SCOPE — RECORD FIDELITY. You are given the INTAKE (the facts the company supplied, as JSON), the COMPOSED LIST (for each generated block: the intake keys the engine read and the authorities it cited) and the DOCUMENT with block keys.

Report exactly three kinds of finding:
1. "unsupported" — a factual statement about the company that no intake value supports. intake_key = the key you looked for; intake_value = null.
2. "contradicts" — a statement that contradicts an intake value. intake_key = the key, intake_value = the value EXACTLY as it appears in the intake JSON (copy it).
3. "omitted" — an intake value that a block's composed sources name (see the COMPOSED LIST) but the block does not reflect. quote = the block's text where it should appear; intake_key/intake_value = the value omitted.

Do NOT report: legal correctness (another worker), reasoning or contradictions between two blocks (another worker), wording. A document that faithfully reports a contradictory or incomplete intake is CORRECT — report the intake contradiction as "contradicts" against the block that states one side, with the other side's value, and say in "mismatch" that the intake itself is inconsistent; the classifier routes it. Never suggest the engine should have inferred its way around an intake.

Read nested objects before reporting a value as absent (intake keys may be dotted paths into nested objects or arrays, e.g. impact_intake.benefitsOutweigh or a6_safeguards[2].safeguard — use that path form as intake_key).`;

const W_LAW_SCOPE = `YOUR SCOPE — LEGAL GROUNDING. You are given the REGISTRY PACK (every verified-authority row for this product: row id, pinpoint, and the regulation's VERBATIM text), the BLOCK CATALOGUE (every block the engine can emit, the authorities it cites), the COMPOSED LIST for this document, and the DOCUMENT with block keys.

For every block that makes a legal statement (a duty, a test, a deadline, an exception, an authority attribution):
- If the block is BOUND (its composed row cites an authority that has a registry row): compare the statement to that row's verbatim text. Report a finding when the statement contradicts the row, states a condition the row does not contain, omits a condition the row requires, or attributes the point to the wrong provision. binding = "bound"; registry_row_id = the row; registry_quote = the verbatim substring of that row's text you rely on (copied character for character from the pack).
- If the block is UNBOUND (fixed prose, or a generated block with no cited authority): do not report a finding unless the statement is legally WRONG against a registry row; instead list it in unbound_statements with the row id it rests on (proposed_row_id) and whether it is consistent with that row. This list builds the fixed-prose ↔ authority table counsel reviews; be complete and be honest about "consistent".
- A statement with NO applicable row anywhere in the pack is reported as a finding with registry_row_id = null and divergence beginning "NO ROW:" — that is a registry gap, routed to counsel, never to code.

Do NOT report: whether the facts match the intake (another worker), reasoning between blocks (another worker), wording. Never cite law from memory: the REGISTRY PACK is the only law you may rely on.`;

const W_REASON_SCOPE = `YOUR SCOPE — REASONING. You are given the DOCUMENT with block keys only. Read it as one connected argument: company fact → legal issue → analysis → determination → required action.

Report exactly these kinds of finding:
- "broken_chain" — a determination or action that does not follow from the analysis stated (quote both the premise block and the conclusion block).
- "contradiction" — two blocks that state incompatible things about the same point (executive summary vs body vs table vs appendix; a status label vs its narrative; a date vs another date).
- "unreachable_condition" — a condition that can never be met on the facts the document itself states.
- "self_cancelling" — a condition, follow-up or recommendation that the document elsewhere records as already satisfied or inapplicable.
- "unsupported_step" — a step in the chain asserted with no stated basis in the document.

Every finding names block_key_a / quote_a (the primary block) and, for the two-block kinds, block_key_b / quote_b.

Do NOT report: whether facts match the intake (you do not have the intake; another worker does), legal correctness against the regulation (another worker), wording. Do not treat a deliberate "remains to be confirmed" / Follow-Up as a contradiction: the document is allowed to carry an open point as long as it says it is open.`;

export function buildWorkerSystemPrompt(worker: WorkerId, product: string): string {
  const scope = worker === "W-RECORD" ? W_RECORD_SCOPE : worker === "W-LAW" ? W_LAW_SCOPE : W_REASON_SCOPE;
  const parts = [`You are worker ${worker} for product ${product}.`, "", COMMON_PREAMBLE, "", scope];
  if (worker === "W-LAW") {
    const pack = registryPackFor(product);
    const cat = blockCatalogueFor(product);
    parts.push("", pack ? renderRegistryPackText(pack) : `(no registry pack is committed for ${product})`);
    parts.push("", cat ? renderBlockCatalogueText(cat) : `(no block catalogue is committed for ${product}; treat every generated block as unbound unless the composed list cites an authority)`);
  }
  return parts.join("\n");
}

export interface WorkerUserTurnInput {
  readonly tool: string;
  readonly intakeJson: string;
  readonly composedListText: string;
  readonly blocksText: string;
  /** Cyber: the locator rows cut from the approved corpus at review time. */
  readonly hydratedRegistryText?: string | null;
  readonly truncated: boolean;
}

export function buildWorkerUserTurn(worker: WorkerId, doc: WorkerUserTurnInput): string {
  const parts: string[] = [`PRODUCT: ${doc.tool}`, ""];
  if (worker === "W-RECORD") {
    parts.push("INTAKE (the facts the company supplied; the document may not go beyond these):", doc.intakeJson, "");
  }
  if (worker !== "W-REASON") {
    parts.push("COMPOSED LIST (block key → factors, intake keys read, authorities cited):", doc.composedListText, "");
  }
  if (worker === "W-LAW" && doc.hydratedRegistryText) {
    parts.push("REGISTRY TEXT (verbatim, cut from the approved corpus for the locator rows above):", doc.hydratedRegistryText, "");
  }
  parts.push("DOCUMENT (the exact customer-facing text under review, with block keys):", doc.blocksText);
  if (doc.truncated) parts.push("", "[NOTE: the document was truncated for length. Do not report the truncation itself as a defect.]");
  parts.push("", "Review this document now. Quote verbatim. Return the result through the tool call.");
  return parts.join("\n");
}

// ── Stage 4 — classification ────────────────────────────────────────────────

export const CLASSIFY_SYSTEM = `You classify validated review findings about a document produced by a DETERMINISTIC rule engine (structured intake → normalised facts → deterministic rules → fixed clause library → assembler). Every finding has already been checked by a program: its quote exists in the document, its block key exists, its intake value or registry quote is verbatim.

Assign EXACTLY ONE class to each finding:
- rule_bug — a deterministic rule fires or fails to fire contrary to its own written specification (the block's factor composed the wrong thing from the intake it read).
- clause_defect — fixed prose in the clause library is wrong against the registry text, contradicts another fixed clause, or mis-references the document's own structure.
- missing_structured_input — the rule needs a fact that the intake does not collect as a typed field; the fix is a field and a rule that reads it, never a regex over free text.
- presentation — cross-reference, quotation balance, citation form, table lead-in, enum leak, duplicated sentence, numbering.
- judgment — a legal position, a methodology change, or a new inference; a human must decide.
- intake_artifact — the document faithfully reports a contradictory or incomplete synthetic intake; the defect is in the intake, not the engine.

rule_ref: the factor id, block key or clause key the finding binds to (from the finding's own block key and factor list), or null. Never invent code paths.

Be conservative: when a finding could be a rule_bug OR a judgment, it is a judgment. When the engine reported an intake contradiction honestly, it is an intake_artifact. Return the result ONLY through the tool call.`;

export interface ClassifyInputFinding {
  readonly id: string;
  readonly worker: string;
  readonly raised_by: readonly string[];
  readonly block_key: string;
  readonly block_kind: string | null;
  readonly factor_ids: readonly string[];
  readonly kind: string | null;
  readonly severity: string;
  readonly quote: string;
  readonly why: string;
  readonly intake_key?: string | null;
  readonly intake_value?: string | null;
  readonly registry_row_id?: string | null;
  readonly binding?: string | null;
  readonly block_key_b?: string | null;
  readonly quote_b?: string | null;
}

export function buildClassifyUserTurn(tool: string, findings: readonly ClassifyInputFinding[]): string {
  const parts = [`PRODUCT: ${tool}`, `FINDINGS: ${findings.length}`, ""];
  for (const f of findings) parts.push(JSON.stringify(f));
  parts.push("", "Classify every finding now. Return the result through the tool call.");
  return parts.join("\n");
}
