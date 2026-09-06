// DOC 191 §5 — THE GENERATION STEP (pure core).
//
// Reads every `authority_relevance_profiles` row for one product, validates
// it, and emits that product's `*-relevance-profiles.ts` with a
// PROFILES_VERSION stamp and the RULE_PROFILES / PATTERN_PROFILES export
// split. No I/O here: the edge function (../index.ts) does the DB read and
// the response; this module is a pure function so the unit tests exercise the
// validation checks against FIXTURE rows, never live data.
//
// KEYING. A DB row is unique per (product, source_table, source_row_id) — the
// profile is a fact about the AUTHORITY, not about one CAM row, which is why
// LIA's hand-authored sidecar already gives sibling rows on one source the
// same profile object. The generated map is keyed by CamRow.id, resolved by
// joining each profile onto every AP row of the product's map that shares its
// (source_table, source_row_id). That reproduces today's sidecar exactly.
//
// ─────────────────────────────────────────────────────────────────────────
// THE ONE DELIBERATE DEPARTURE FROM A LITERAL READING OF §5, FLAGGED FOR THE
// CEO (doc 191 §5 check 3 vs §6.1's asymmetric-risk framing):
//
// §5 says validation failures "fail the build, does not silently drop rows",
// and lists "an unratified rule-row cannot ship, ever" as check 3. Read
// literally, ONE unratified rule candidate anywhere in a product's curation
// data would break that product's build — and since curation is exactly where
// unratified candidates are supposed to accumulate while they wait for the
// CEO, that reading makes the normal state of the table a broken build.
//
// §6.1 settles which way to resolve it: excluding a good row is the SAFE
// failure mode (the row sits where every row in the fleet sits today,
// persuasive-only); shipping a bad one is not. So an unratified `rule` row is
// EXCLUDED from the generated map with a loud build WARNING, and the rest of
// the product's batch still ships. It is not silently dropped: it is named,
// with its reason, in the generator's result.
//
// Everything else in §5 still HARD-FAILS the build: an unknown factor, an
// unregistered instrument, a `rule` row missing its statement or its verified
// quote (both of which the DB's own check constraints already forbid, so
// their presence means something is badly wrong upstream), and a cam_row_id
// naming a row that does not exist in the product's map.
// ─────────────────────────────────────────────────────────────────────────

import type {
  AuthorityRelevanceProfile,
  AuthorityRelevanceProfileRow,
} from "../../_shared/corpus/authority-relevance-profile.ts";
import { isRuleRatified, rowToProfile } from "../../_shared/corpus/authority-relevance-profile.ts";

/** The subset of a CamRow the generator needs. Kept structural so the caller
 *  can pass a real CorpusMap's rows without this module importing every map. */
export interface GeneratorCamRow {
  readonly id: string;
  readonly role: string;
  readonly source_table: string;
  readonly source_row_id: string;
}

export interface GenerationVocabulary {
  readonly factors: readonly string[];
  readonly instruments: readonly string[];
}

export interface GenerationInput {
  readonly product: string;
  /** This product's rows. */
  readonly rows: readonly AuthorityRelevanceProfileRow[];
  /** Every product's rows, for the §6.4 sibling-consistency check. Defaults
   *  to `rows` (a single-product run can still not contradict itself). */
  readonly allProductRows?: readonly AuthorityRelevanceProfileRow[];
  /** The product's CAM rows (all roles; only AP rows are joined). */
  readonly camRows: readonly GeneratorCamRow[];
  readonly vocabulary: GenerationVocabulary;
  /** "<product>-relevance-profiles-vN-YYYY-MM-DD". */
  readonly profilesVersion: string;
  readonly exportPrefix: string;
  readonly factorVocabularySource?: string;
  /** Roles whose rows a profile may key onto. Default ["AP"]. */
  readonly joinRoles?: readonly string[];
  /** Repo-relative path the generated file will be written to. The emitted
   *  type import is computed FROM it (see typeImportSpecifier) — a hardcoded
   *  specifier would be wrong for every product whose corpus directory sits
   *  at a different depth, and would also trip
   *  tests/edge/_tests/no-archive-imports.test.ts. */
  readonly outputPath?: string;
}

/** Where `_shared/corpus/authority-relevance-profile.ts` lives, repo-relative. */
const PROFILE_TYPE_MODULE = "supabase/functions/_shared/corpus/authority-relevance-profile.ts";

/**
 * The relative specifier a file at `outputPath` needs to import the profile
 * type. Computed, never hardcoded: every product's corpus directory sits at
 * its own depth, and a generated file that escapes `supabase/functions/`
 * resolves locally but fails at cold start in the deployed isolate (the
 * ITEM 402-D law, tests/edge/_tests/no-archive-imports.test.ts).
 */
export function typeImportSpecifier(outputPath: string): string {
  const fromDir = outputPath.replace(/\\/g, "/").split("/").slice(0, -1);
  const to = PROFILE_TYPE_MODULE.split("/");
  let i = 0;
  while (i < fromDir.length && i < to.length - 1 && fromDir[i] === to[i]) i++;
  const up = fromDir.length - i;
  if (up === 0) return "./" + to.slice(i).join("/");
  return [...new Array(up).fill(".."), ...to.slice(i)].join("/");
}

export interface ExcludedRow {
  readonly source_table: string;
  readonly source_row_id: string;
  readonly cam_row_id: string | null;
  readonly reason: string;
}

export interface GenerationResult {
  /** False when any HARD validation failure fired. No file is emitted. */
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly excluded: readonly ExcludedRow[];
  /** Keyed by CamRow.id. */
  readonly rule: Readonly<Record<string, AuthorityRelevanceProfile>>;
  readonly pattern: Readonly<Record<string, AuthorityRelevanceProfile>>;
  /** The emitted TypeScript source, or "" when !ok. */
  readonly file: string;
  /** Where it belongs (the caller writes it; an edge function cannot). */
  readonly profiles_version: string;
}

const sourceKey = (t: string, id: string) => `${t}::${id}`;

/**
 * The §6.4 SIBLING-CONSISTENCY CHECK — computed fresh on every run, never a
 * stored column (a stored one goes stale the moment a sibling is added or
 * reclassified). Groups every product's profiles by `source_row_id` and flags
 * any group where `rule_or_pattern` disagrees across products. Warning only:
 * a genuine product-specific difference is possible, it is just usually a
 * sign one of the two is wrong, so it is routed to the stage-4 sample rather
 * than blocking a build.
 */
export function siblingConsistencyWarnings(
  rows: readonly AuthorityRelevanceProfileRow[],
): string[] {
  const bySource = new Map<string, AuthorityRelevanceProfileRow[]>();
  for (const r of rows) {
    const list = bySource.get(r.source_row_id) ?? [];
    list.push(r);
    bySource.set(r.source_row_id, list);
  }
  const out: string[] = [];
  for (const [sourceRowId, group] of [...bySource.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const kinds = new Set(group.map((g) => g.rule_or_pattern));
    if (kinds.size < 2) continue;
    const detail = group
      .map((g) => `${g.product}=${g.rule_or_pattern}`)
      .sort()
      .join(", ");
    out.push(
      `sibling-consistency (doc 191 §6.4): source_row_id ${sourceRowId} is classified differently across products (${detail}) — route to the stage-4 audit sample`,
    );
  }
  return out;
}

export function generateRelevanceProfiles(input: GenerationInput): GenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const excluded: ExcludedRow[] = [];

  const factors = new Set(input.vocabulary.factors);
  const instruments = new Set(input.vocabulary.instruments);
  const joinRoles = new Set(input.joinRoles ?? ["AP"]);

  if (factors.size === 0) {
    errors.push(
      `${input.product}: no registered factor vocabulary — doc 191 §3 lists this product's vocabulary as not yet defined; whoever curates the first row proposes it (§7.2), the generator does not invent one`,
    );
  }
  if (instruments.size === 0) {
    errors.push(`${input.product}: no registered instrument list (doc 191 §3)`);
  }

  const camById = new Map(input.camRows.map((r) => [r.id, r] as const));
  const camBySource = new Map<string, GeneratorCamRow[]>();
  for (const r of input.camRows) {
    if (!joinRoles.has(r.role)) continue;
    const k = sourceKey(r.source_table, r.source_row_id);
    const list = camBySource.get(k) ?? [];
    list.push(r);
    camBySource.set(k, list);
  }

  // Guard the table's own uniqueness assumption on the way in — a duplicated
  // (product, source_table, source_row_id) would silently pick a winner.
  const seen = new Set<string>();
  for (const row of input.rows) {
    if (row.product !== input.product) {
      errors.push(`row ${row.id}: product "${row.product}" does not match the requested product "${input.product}"`);
      continue;
    }
    const k = sourceKey(row.source_table, row.source_row_id);
    if (seen.has(k)) {
      errors.push(`duplicate profile for (${input.product}, ${row.source_table}, ${row.source_row_id})`);
    }
    seen.add(k);
  }

  const rule: Record<string, AuthorityRelevanceProfile> = {};
  const pattern: Record<string, AuthorityRelevanceProfile> = {};
  // Emission order follows map order, so the generated file reads like the map.
  const orderOf = new Map(input.camRows.map((r, i) => [r.id, i] as const));

  interface Emitted {
    readonly camRowId: string;
    readonly profile: AuthorityRelevanceProfile;
    readonly kind: "rule" | "pattern";
  }
  const emitted: Emitted[] = [];

  for (const row of input.rows) {
    if (row.product !== input.product) continue;

    // ── VALIDATION 1: factor_ids ⊆ the product's registered vocabulary ──
    for (const f of row.factor_ids) {
      if (!factors.has(f)) {
        errors.push(
          `row ${row.id} (${row.source_table}/${row.source_row_id}): factor_id "${f}" is not in ${input.product}'s registered factor vocabulary (doc 191 §5 check 1)`,
        );
      }
    }

    // ── VALIDATION 2: instrument ∈ the product's registered list ────────
    if (!instruments.has(row.instrument)) {
      errors.push(
        `row ${row.id} (${row.source_table}/${row.source_row_id}): instrument "${row.instrument}" is not in ${input.product}'s registered instrument list (doc 191 §5 check 2)`,
      );
    }

    // ── VALIDATION 4: a named cam_row_id must exist in the map ──────────
    if (row.cam_row_id !== null && row.cam_row_id !== "" && !camById.has(row.cam_row_id)) {
      errors.push(
        `row ${row.id}: cam_row_id "${row.cam_row_id}" names no row in ${input.product}'s CorpusMap (doc 191 §5 check 4)`,
      );
    }

    // ── VALIDATION 3: rule-row completeness ─────────────────────────────
    let kind: "rule" | "pattern" = row.rule_or_pattern === "rule" ? "rule" : "pattern";
    if (row.rule_or_pattern !== "rule" && row.rule_or_pattern !== "pattern") {
      errors.push(`row ${row.id}: rule_or_pattern "${row.rule_or_pattern}" is neither "rule" nor "pattern"`);
      continue;
    }
    if (kind === "rule") {
      // HARD failures — the DB check constraints already forbid both, so
      // reaching either means the data got in some other way.
      if (!row.rule_statement || row.rule_statement.trim() === "") {
        errors.push(
          `row ${row.id}: rule_or_pattern='rule' with no rule_statement (doc 191 §5 check 3; the rule_requires_statement constraint should have prevented this)`,
        );
        continue;
      }
      if (!row.quote_verified) {
        errors.push(
          `row ${row.id}: rule_or_pattern='rule' with quote_verified=false (doc 191 §5 check 3; the rule_requires_verified_quote constraint should have prevented this)`,
        );
        continue;
      }
      // The documented judgment call (see this file's header): unratified
      // rule rows are EXCLUDED with a warning, not a build failure.
      if (!isRuleRatified(row)) {
        excluded.push({
          source_table: row.source_table,
          source_row_id: row.source_row_id,
          cam_row_id: row.cam_row_id,
          reason:
            "rule_or_pattern='rule' but ratified_by/ratified_at/ledger_ref are not all set — an unratified rule row cannot ship (doc 191 §5 check 3, §8)",
        });
        warnings.push(
          `EXCLUDED row ${row.id} (${row.source_table}/${row.source_row_id}${row.cam_row_id ? `, cam_row_id ${row.cam_row_id}` : ""}): an unratified 'rule' row cannot ship. Only the CEO or a named delegate may set ratified_by/ratified_at/ledger_ref (doc 191 §8). The row stays out of the generated map until then.`,
        );
        continue;
      }
    }

    const targets = camBySource.get(sourceKey(row.source_table, row.source_row_id)) ?? [];
    if (targets.length === 0) {
      warnings.push(
        `row ${row.id}: no ${[...joinRoles].join("/")} row in ${input.product}'s CorpusMap uses source (${row.source_table}, ${row.source_row_id}) — the profile is curated but attaches to nothing`,
      );
      continue;
    }

    const profile = rowToProfile(row);
    for (const t of targets) {
      if ((kind === "rule" ? rule : pattern)[t.id]) {
        errors.push(`cam row ${t.id} resolves to more than one profile`);
        continue;
      }
      (kind === "rule" ? rule : pattern)[t.id] = profile;
      emitted.push({ camRowId: t.id, profile, kind });
    }
  }

  // ── VALIDATION 5 (§6.4): sibling consistency, computed, warning only ──
  warnings.push(...siblingConsistencyWarnings(input.allProductRows ?? input.rows));

  emitted.sort((a, b) => (orderOf.get(a.camRowId) ?? 0) - (orderOf.get(b.camRowId) ?? 0));

  const ok = errors.length === 0;
  return {
    ok,
    errors,
    warnings,
    excluded,
    rule,
    pattern,
    file: ok ? emitFile(input, emitted) : "",
    profiles_version: input.profilesVersion,
  };
}

// ── Emission ────────────────────────────────────────────────────────────────

const q = (s: string) => JSON.stringify(s);

function emitProfileLiteral(p: AuthorityRelevanceProfile, indent: string): string {
  const lines: string[] = [];
  const push = (k: string, v: string) => lines.push(`${indent}  ${k}: ${v},`);
  push("product", q(p.product));
  push("country", q(p.country));
  push("instrument", q(p.instrument));
  push("factor_ids", `[${p.factor_ids.map(q).join(", ")}]`);
  push("use_case_class", p.use_case_class === null ? "null" : q(p.use_case_class));
  push("outcome_posture", q(p.outcome_posture));
  push("relationship", p.relationship === null ? "null" : q(p.relationship));
  push("data_categories", `[${p.data_categories.map(q).join(", ")}]`);
  push("flags", `[${p.flags.map(q).join(", ")}]`);
  push("rule_or_pattern", q(p.rule_or_pattern));
  if (p.rule_statement) push("rule_statement", q(p.rule_statement));
  push("curation_note", q(p.curation_note));
  push("pipeline_stage", q(p.pipeline_stage));
  push("extracted_quote", p.extracted_quote === null ? "null" : q(p.extracted_quote));
  push("quote_verified", String(p.quote_verified));
  push(
    "self_consistency_agreement",
    p.self_consistency_agreement === null ? "null" : String(p.self_consistency_agreement),
  );
  push("confidence_tier", q(p.confidence_tier));
  push("pipeline_version", q(p.pipeline_version));
  push("classified_at", q(p.classified_at));
  return `{\n${lines.join("\n")}\n${indent}}`;
}

function emitFile(
  input: GenerationInput,
  emitted: readonly { camRowId: string; profile: AuthorityRelevanceProfile; kind: "rule" | "pattern" }[],
): string {
  const prefix = input.exportPrefix;
  const rules = emitted.filter((e) => e.kind === "rule");
  const patterns = emitted.filter((e) => e.kind === "pattern");

  const block = (name: string, items: typeof rules) =>
    items.length === 0
      ? `export const ${name}: Readonly<Record<string, AuthorityRelevanceProfile>> = {};`
      : `export const ${name}: Readonly<Record<string, AuthorityRelevanceProfile>> = {\n` +
        items.map((e) => `  ${q(e.camRowId)}: ${emitProfileLiteral(e.profile, "  ")},`).join("\n") +
        `\n};`;

  return `// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Produced by the \`generate-corpus-relevance-profiles\` edge function from
// the \`authority_relevance_profiles\` curation table (doc 191 §5). Edit the
// table and re-generate; a hand edit here is overwritten and, worse,
// un-reviewed — the table is where curation is recorded and ratified.
//
// Product: ${input.product}
// Factor vocabulary: ${input.factorVocabularySource ?? "(registered per doc 191 §3)"}
// Profiles version: ${input.profilesVersion}
//
// THE EXPORT SPLIT IS THE ENFORCEMENT (doc 191 §5). A gate or outcome-override
// file (\`*-gate.ts\`, \`*-override.ts\`, a product's \`three-part-test-typed.ts\`
// equivalent) may import ${prefix}_RULE_PROFILES only. Importing
// ${prefix}_PATTERN_PROFILES from such a file fails
// tests/edge/corpus/corpus-relevance-rule-boundary.test.ts. Pattern content is
// persuasive-only, forever; it can never carry deterministic legal weight.
//
// Every profile in ${prefix}_RULE_PROFILES has been ratified by the CEO or a
// named delegate (doc 191 §8) — the generator refuses to emit an unratified
// rule row into this map.

${"import type { AuthorityRelevanceProfile } from " + q(typeImportSpecifier(input.outputPath ?? PROFILE_TYPE_MODULE)) + ";"}

export const ${prefix}_PROFILES_VERSION = ${q(input.profilesVersion)};

${block(`${prefix}_RULE_PROFILES`, rules)}

${block(`${prefix}_PATTERN_PROFILES`, patterns)}
`;
}

/**
 * The pin surface (doc 191 §7.3). The scorer (cam-relevance.ts) reads exactly
 * these eight fields; everything else on a profile is curation evidence that
 * reaches no customer. So "byte-identical for every row not reclassified"
 * means: these eight fields, canonically serialised, are identical.
 */
export function canonicalCamProfileBytes(p: {
  country: string;
  instrument: string;
  factor_ids: readonly string[];
  use_case_class: string | null;
  outcome_posture: string;
  relationship: string | null;
  data_categories: readonly string[];
  flags: readonly string[];
}): string {
  return JSON.stringify([
    p.country,
    p.instrument,
    [...p.factor_ids],
    p.use_case_class,
    p.outcome_posture,
    p.relationship,
    [...p.data_categories],
    [...p.flags],
  ]);
}
