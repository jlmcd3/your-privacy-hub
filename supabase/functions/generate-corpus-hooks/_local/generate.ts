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
  /** Track H3's `relevance` block — copied verbatim onto the emitted hook. */
  readonly use_case_class?: string | null;
  readonly relationship?: string | null;
  readonly data_categories?: readonly string[] | null;
  readonly flags?: readonly string[] | null;
  readonly curation_note?: string | null;
  readonly endorsement?: string | null;
  readonly ratified_by: string | null;
  readonly ratified_at: string | null;
  readonly ledger_ref: string | null;
}

/**
 * The citation facts read from the profile's own source row — the same row the
 * drafter was given. `authority_label` is composed here (never by a model) in
 * the persuasive section's ratified citation form.
 */
export interface HookSourceRow {
  readonly source_table: string;
  readonly regulator?: string | null;
  readonly subject?: string | null;
  readonly decision_date?: string | null;
  readonly title?: string | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "22 October 2024" from an ISO date. Null (never a guess) if malformed. */
export function citationDate(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!m) return null;
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return `${Number(m[3])} ${MONTHS[monthIdx]} ${m[1]}`;
}

/** The "¶150" pin a curated EDPB profile records in its curation note. */
export function paragraphPin(curationNote: string | null | undefined): string | null {
  const m = /¶\s*(\d+)/.exec(String(curationNote ?? ""));
  return m ? `¶${m[1]}` : null;
}

/**
 * regulator + authority_label for the emitted hook. Returns null when a part
 * is missing — the caller EXCLUDES that hook by name rather than shipping a
 * blank citation.
 */
export function citationFor(
  profile: HookProfileRow,
  source: HookSourceRow | undefined,
): { regulator: string; authority_label: string } | null {
  if (!source) return null;
  if (profile.source_table === "enforcement_actions") {
    const regulator = (source.regulator ?? "").trim();
    const subject = (source.subject ?? "").trim();
    const date = citationDate(source.decision_date);
    if (!regulator || !subject || !date) return null;
    return { regulator, authority_label: `${regulator}, ${subject}, decision of ${date}` };
  }
  if (profile.source_table === "edpb_guidelines") {
    const title = (source.title ?? "").trim();
    const pin = paragraphPin(profile.curation_note);
    if (!title || !pin) return null;
    return { regulator: "EDPB", authority_label: `${title} ${pin}` };
  }
  if (profile.source_table === "regulatory_guidance") {
    const title = (source.title ?? "").trim();
    if (!title) return null;
    const regulator = (source.regulator ?? "").trim();
    if (!regulator) return null;
    return { regulator, authority_label: title };
  }
  return null;
}


export interface Exclusion {
  readonly hook_id: string;
  readonly reason: string;
}

export interface GenerateHooksInput {
  readonly product: string;
  readonly rows: readonly HookRow[];
  readonly profiles: ReadonlyMap<string, HookProfileRow>;
  /** Citation facts from each profile's source row, keyed by profile id. */
  readonly sources: ReadonlyMap<string, HookSourceRow>;
  /** factor label -> three-part-test element (_local/factor-element.ts). */
  readonly elementOf: (factorId: string) => string | null;

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

const POSTURES = new Set(["accepted", "conditional", "rejected", "contested"]);

/**
 * The RUNTIME projection — exactly the fields `AuthorityHook`
 * (_shared/corpus/hook-types.ts) declares, plus Track H3's `relevance` block.
 * Nothing else: an emitted file must pass `deno check` against that type.
 */
function shippedHook(
  row: HookRow,
  profile: HookProfileRow,
  citation: { regulator: string; authority_label: string },
  factorId: string,
  element: string,
) {
  return {
    hook_id: `${profile.source_table}:${profile.source_row_id}:v${row.hook_version}`,
    profile_id: row.profile_id,
    source_row_id: profile.source_row_id,
    fact_atoms: [...(row.fact_atoms ?? [])],
    distinguishing_atoms: [...(row.distinguishing_atoms ?? [])],
    not_distinguishable: row.not_distinguishable,
    required_atoms: [...(row.required_atoms ?? [])],
    finding_span: row.finding_span,
    fact_pattern_paraphrase: row.fact_pattern_paraphrase,
    finding_paraphrase: row.finding_paraphrase,
    settledness: row.settledness,
    posture: profile.outcome_posture,
    factor_id: factorId,
    bears_on_element: element,
    authority_label: citation.authority_label,
    regulator: citation.regulator,
    // Track H3 — the profile's own typed relevance, copied verbatim.
    relevance: {
      instrument: profile.instrument,
      factor_ids: [...(profile.factor_ids ?? [])],
      use_case_class: profile.use_case_class ?? null,
      relationship: profile.relationship ?? null,
      data_categories: [...(profile.data_categories ?? [])],
      flags: [...(profile.flags ?? [])],
      outcome_posture: profile.outcome_posture,
    },
  };
}

export function generateHooks(input: GenerateHooksInput): GenerateHooksResult {
  const excluded: Exclusion[] = [];
  const errors: string[] = [];
  const emitted: {
    row: HookRow;
    profile: HookProfileRow;
    citation: { regulator: string; authority_label: string };
    factorId: string;
    element: string;
  }[] = [];

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
    // A blank is never shipped: every field the runtime type requires must
    // resolve from ratified data, or the hook is excluded BY NAME.
    if (!profile.outcome_posture || !POSTURES.has(profile.outcome_posture)) {
      excluded.push({ hook_id: label, reason: `profile outcome_posture "${profile.outcome_posture}" is not a hook posture` });
      continue;
    }
    const factorId = (profile.factor_ids ?? [])[0];
    if (!factorId) { excluded.push({ hook_id: label, reason: "profile has no factor_ids[0]" }); continue; }
    const element = input.elementOf(factorId);
    if (!element) {
      excluded.push({ hook_id: label, reason: `factor "${factorId}" maps to no three-part-test element` });
      continue;
    }
    const citation = citationFor(profile, input.sources.get(row.profile_id));
    if (!citation) {
      excluded.push({ hook_id: label, reason: `citation facts incomplete for ${profile.source_table} row ${profile.source_row_id}` });
      continue;
    }
    emitted.push({ row, profile, citation, factorId, element });
  }



  if (errors.length > 0) return { ok: false, emitted: 0, excluded, errors, contents: null };

  const sorted = [...emitted].sort((a, b) => (a.row.profile_id < b.row.profile_id ? -1 : a.row.profile_id > b.row.profile_id ? 1 : 0));
  const body = sorted.map(({ row, profile, citation, factorId, element }) =>
    JSON.stringify(shippedHook(row, profile, citation, factorId, element), null, 2)
      .split("\n").map((line) => `  ${line}`).join("\n")
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
