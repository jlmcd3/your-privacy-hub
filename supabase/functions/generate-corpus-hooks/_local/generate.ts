// DOC 213 §2 — the pure generation core for analogy hooks.
//
// No I/O. The edge function does the DB read and the response; this module
// decides what is emitted and returns the CONTENTS of the product's pinned
// hooks file. Nothing is written to the repo by an edge function.
//
// EXCLUSION vs ERROR is the same discipline as generate-corpus-rules: an
// unratified or draft-consultation row is EXCLUDED by name; there is no
// silent drop.

export interface HookRow {
  readonly id: string;
  readonly profile_id: string;
  readonly product: string;
  readonly hook_version: number;
  readonly hook_status: string;
  readonly fact_atoms: readonly string[] | null;
  readonly distinguishing_atoms: readonly string[] | null;
  readonly not_distinguishable: boolean;
  readonly required_atoms: readonly string[] | null;
  readonly finding_span: string;
  readonly fact_pattern_paraphrase: string;
  readonly finding_paraphrase: string;
  readonly trigger_terms: readonly string[] | null;
  readonly settledness: string;
  readonly ratified_by: string | null;
  readonly ratified_at: string | null;
  readonly ledger_ref: string | null;
  readonly retired_at: string | null;
}

export interface HookProfileRow {
  readonly id: string;
  readonly source_table: string;
  readonly source_row_id: string;
  readonly outcome_posture: string | null;
  readonly instrument: string | null;
  readonly factor_ids: readonly string[] | null;
  readonly endorsement?: string | null;
  readonly ratified_by: string | null;
  readonly ratified_at: string | null;
  readonly ledger_ref: string | null;
}

export interface Exclusion {
  readonly hook_id: string;
  readonly reason: string;
}

export interface GenerateHooksInput {
  readonly product: string;
  readonly rows: readonly HookRow[];
  readonly profiles: ReadonlyMap<string, HookProfileRow>;
  readonly hooksVersion: string;
  readonly outputPath: string;
  readonly exportPrefix: string;
  /** The direction / vocabulary / shape blocks copied verbatim from the
   *  existing pinned file. Empty placeholders when that file does not exist
   *  yet — the caller says so in its response. */
  readonly contextBlock: string;
}

export interface GenerateHooksResult {
  readonly ok: boolean;
  readonly emitted: number;
  readonly excluded: Exclusion[];
  readonly errors: string[];
  readonly contents: string | null;
}

function stamped(row: { ratified_by: string | null; ratified_at: string | null; ledger_ref: string | null }): boolean {
  return !!row.ratified_by && !!row.ratified_at && !!row.ledger_ref;
}

/** Relative specifier from the output file to _shared/corpus/hook-types.ts. */
export function typeImportSpecifier(outputPath: string): string {
  const parts = outputPath.split("/");
  const fnIndex = parts.indexOf("functions");
  const depth = parts.length - fnIndex - 2;
  return `${"../".repeat(depth)}_shared/corpus/hook-types.ts`;
}

function shippedHook(row: HookRow, profile: HookProfileRow) {
  return {
    hook_id: `${profile.source_table}:${profile.source_row_id}:v${row.hook_version}`,
    product: row.product,
    profile_id: row.profile_id,
    settledness: row.settledness,
    outcome_posture: profile.outcome_posture,
    instrument: profile.instrument,
    bears_on_factor_ids: [...(profile.factor_ids ?? [])],
    fact_atoms: [...(row.fact_atoms ?? [])],
    distinguishing_atoms: [...(row.distinguishing_atoms ?? [])],
    not_distinguishable: row.not_distinguishable,
    required_atoms: [...(row.required_atoms ?? [])],
    finding_span: row.finding_span,
    fact_pattern_paraphrase: row.fact_pattern_paraphrase,
    finding_paraphrase: row.finding_paraphrase,
    trigger_terms: [...(row.trigger_terms ?? [])],
    sources: [{ table: profile.source_table, row_id: profile.source_row_id }],
    retired_at: row.retired_at ?? null,
  };
}

export function generateHooks(input: GenerateHooksInput): GenerateHooksResult {
  const excluded: Exclusion[] = [];
  const errors: string[] = [];
  const emitted: { row: HookRow; profile: HookProfileRow }[] = [];

  for (const row of input.rows) {
    const label = `${row.profile_id}#v${row.hook_version}`;
    if (row.retired_at) { excluded.push({ hook_id: label, reason: "hook row is retired" }); continue; }
    if (row.hook_status !== "ratified") {
      excluded.push({ hook_id: label, reason: `hook_status is "${row.hook_status}", not "ratified"` });
      continue;
    }
    const profile = input.profiles.get(row.profile_id);
    if (!profile) { excluded.push({ hook_id: label, reason: `profile ${row.profile_id} not found` }); continue; }
    if (!stamped(profile)) {
      excluded.push({ hook_id: label, reason: `profile ${row.profile_id} is not ratified` });
      continue;
    }
    if (profile.source_table === "edpb_guidelines" && profile.endorsement === "draft_consultation") {
      excluded.push({ hook_id: label, reason: "primary_source_is_consultation_draft" });
      continue;
    }
    emitted.push({ row, profile });
  }

  if (errors.length > 0) return { ok: false, emitted: 0, excluded, errors, contents: null };

  const sorted = [...emitted].sort((a, b) => (a.row.profile_id < b.row.profile_id ? -1 : a.row.profile_id > b.row.profile_id ? 1 : 0));
  const body = sorted.map(({ row, profile }) =>
    JSON.stringify(shippedHook(row, profile), null, 2).split("\n").map((line) => `  ${line}`).join("\n")
  ).join(",\n");

  const excludedLines = excluded.length === 0
    ? "//   (none)"
    : excluded.map((item) => `//   ${item.hook_id} — ${item.reason}`).join("\n");

  const prefix = input.exportPrefix;
  const contents = `// ${input.product.toUpperCase()} ANALOGY HOOKS — pinned, generated file (doc 213).
//
// Generated by \`generate-corpus-hooks\` (action "generate") from RATIFIED
// \`public.authority_hooks\` rows. Do not hand-edit the hooks array:
// regenerate it. Run: ${input.hooksVersion}
//
// EXCLUDED ROWS (named, not silently dropped):
${excludedLines}

import type { AuthorityHook } from "${typeImportSpecifier(input.outputPath)}";


export const ${prefix}_HOOKS_VERSION = ${JSON.stringify(input.hooksVersion)};

export const ${prefix}_HOOKS: readonly AuthorityHook[] = [${sorted.length === 0 ? "" : `\n${body}\n`}];

${input.contextBlock}`;

  return { ok: true, emitted: sorted.length, excluded, errors: [], contents };
}
