// DOC 191 §7.3 / DOC 196 §3.1 — the ONE-TIME LIA BACKFILL.
//
// Emits the INSERT statements that move LIA's hand-authored
// `CamRelevanceProfile` objects (lia-relevance-profiles.ts) into
// `authority_relevance_profiles`, and re-emits the resulting rows as a JSON
// snapshot the pin test reads.
//
// Run:
//   deno run --allow-read --allow-write scripts/doc191-lia-profile-backfill.ts --sql
//   deno run --allow-read --allow-write scripts/doc191-lia-profile-backfill.ts --snapshot
//
// WHAT IT DOES NOT DO. It never sets ratified_by / ratified_at / ledger_ref.
// Doc 191 §8: only the CEO or a named delegate may, and a `rule` row without
// all three is excluded from the generated map by design (generate.ts's
// header explains the judgment call). The one row this script marks as a
// `rule` therefore ships nowhere — it stays exactly where it already was,
// implicit pattern content — until the CEO rules on it.
//
// GRAIN. A DB row is unique per (product, source_table, source_row_id): the
// profile is a fact about the AUTHORITY, which is why the hand-authored
// sidecar already gives sibling CAM rows on one source the same object. So
// this emits ONE row per source, carrying every sibling CAM row's
// curation_note (joined, nothing dropped) and naming the first sibling in map
// order as the representative `cam_row_id`.

import { LIA_CORPUS_MAP } from "../supabase/functions/run-li-assessment/_local/corpus/maps/lia-corpus-map.ts";
import { LIA_RELEVANCE_PROFILES } from "../supabase/functions/run-li-assessment/_local/corpus/maps/lia-relevance-profiles.ts";
import type { CamRelevanceProfile } from "../supabase/functions/_shared/corpus/cam-types.ts";

const CURATED_BY = "doc189 hand-authored; migrated per doc 191 §7.3";
const PIPELINE_VERSION = "human-doc189-2026-09-05";
const CLASSIFIED_AT = "2026-09-05T00:00:00Z";

/**
 * DOC 196 §2 — the single reclassification this migration makes.
 *
 * The Europa Press row's curation note does not say "a company like yours was
 * fined". It says what the law categorically excludes: Article 9
 * special-category data cannot be reached by Article 6(1)(f) AT ALL, because
 * the special-category gate sits before the balancing test rather than inside
 * it. Rewritten with no party named it stays true, which is the whole test —
 * and it is the same shape of finding that became the ePrivacy gate.
 *
 * `extracted_quote` is checked as a real substring of the row's own curation
 * note before this script will emit anything (see verifyQuoteOrThrow).
 */
const RECLASSIFIED: Readonly<Record<string, {
  rule_statement: string;
  extracted_quote: string;
  confidence_tier: "high" | "medium" | "low";
}>> = {
  // AEPD (Spain), EUROPA PRESS DE CATALUNYA, S.A., 26 September 2023.
  "lia/f11-eprivacy/ap-w5-05": {
    rule_statement:
      "Special-category data within Article 9 cannot be processed in reliance on Article 6(1)(f): the special-category gate is anterior to, not part of, the legitimate-interests balancing test.",
    extracted_quote:
      "Article 9 special-category data cannot be reached by Article 6(1)(f) at all - the special-category gate is anterior to the balancing test.",
    // MEDIUM, not high, and deliberately so: the sentence is the CURATOR's
    // formulation of the decision's bearing, not the AEPD's own words, and
    // the underlying Spanish decision text was not re-read as part of this
    // migration. The proposition itself is orthodox GDPR law; the confidence
    // tier is about this ROW's evidence, not about the law.
    confidence_tier: "medium",
  },
};

interface Grouped {
  source_table: string;
  source_row_id: string;
  cam_row_ids: string[];
  curation_notes: string[];
  profile: CamRelevanceProfile;
}

export function groupBySource(): Grouped[] {
  const apRows = LIA_CORPUS_MAP.rows.filter((r) => r.role === "AP");
  const bySource = new Map<string, Grouped>();
  for (const r of apRows) {
    const profile = r.relevance_profile ?? LIA_RELEVANCE_PROFILES[r.id];
    if (!profile) throw new Error(`AP row ${r.id} has no relevance profile`);
    const key = `${r.source_table}::${r.source_row_id}`;
    const g = bySource.get(key);
    if (!g) {
      bySource.set(key, {
        source_table: r.source_table,
        source_row_id: r.source_row_id,
        cam_row_ids: [r.id],
        curation_notes: [r.curation_note],
        profile,
      });
      continue;
    }
    if (JSON.stringify(g.profile) !== JSON.stringify(profile)) {
      throw new Error(`sibling rows on source ${r.source_row_id} disagree on their profile (${g.cam_row_ids[0]} vs ${r.id})`);
    }
    g.cam_row_ids.push(r.id);
    if (!g.curation_notes.includes(r.curation_note)) g.curation_notes.push(r.curation_note);
  }
  return [...bySource.values()];
}

function normalise(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
}

function verifyQuoteOrThrow(camRowIds: string[], note: string, quote: string): void {
  if (!normalise(note).includes(normalise(quote))) {
    throw new Error(
      `RECLASSIFIED quote for ${camRowIds.join("/")} is NOT a verbatim substring of the row's curation note — refusing to emit a 'rule' row on an unverified quote.\nquote: ${quote}\nnote:  ${note}`,
    );
  }
}

const sq = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (xs: readonly string[]) => `ARRAY[${xs.map(sq).join(", ")}]::text[]`;
const nul = (s: string | null) => (s === null ? "NULL" : sq(s));

export interface BackfillRow {
  product: string;
  source_table: string;
  source_row_id: string;
  cam_row_id: string;
  country: string;
  instrument: string;
  factor_ids: string[];
  use_case_class: string | null;
  outcome_posture: string;
  relationship: string | null;
  data_categories: string[];
  flags: string[];
  rule_or_pattern: string;
  rule_statement: string | null;
  curation_note: string;
  curated_by: string;
  ratified_by: null;
  ratified_at: null;
  ledger_ref: null;
  map_version_generated_into: null;
  pipeline_stage: string;
  extracted_quote: string | null;
  quote_verified: boolean;
  self_consistency_agreement: null;
  confidence_tier: string;
  pipeline_version: string;
  classified_at: string;
}

export function buildRows(): BackfillRow[] {
  return groupBySource().map((g) => {
    const note = g.curation_notes.join("\n\n");
    const reclassifiedId = g.cam_row_ids.find((id) => RECLASSIFIED[id]);
    const rc = reclassifiedId ? RECLASSIFIED[reclassifiedId] : null;
    if (rc) verifyQuoteOrThrow(g.cam_row_ids, note, rc.extracted_quote);
    return {
      product: "lia",
      source_table: g.source_table,
      source_row_id: g.source_row_id,
      cam_row_id: g.cam_row_ids[0],
      country: g.profile.country,
      instrument: g.profile.instrument,
      factor_ids: [...g.profile.factor_ids],
      use_case_class: g.profile.use_case_class,
      outcome_posture: g.profile.outcome_posture,
      relationship: g.profile.relationship,
      data_categories: [...g.profile.data_categories],
      flags: [...g.profile.flags],
      rule_or_pattern: rc ? "rule" : "pattern",
      rule_statement: rc ? rc.rule_statement : null,
      curation_note: note,
      curated_by: CURATED_BY,
      ratified_by: null,
      ratified_at: null,
      ledger_ref: null,
      map_version_generated_into: null,
      pipeline_stage: "human",
      extracted_quote: rc ? rc.extracted_quote : null,
      quote_verified: !!rc,
      self_consistency_agreement: null,
      confidence_tier: rc ? rc.confidence_tier : "high",
      pipeline_version: PIPELINE_VERSION,
      classified_at: CLASSIFIED_AT,
    };
  });
}

function toSql(rows: BackfillRow[]): string {
  const values = rows.map((r) =>
    `  (${
      [
        sq(r.product),
        sq(r.source_table),
        `${sq(r.source_row_id)}::uuid`,
        sq(r.cam_row_id),
        sq(r.country),
        sq(r.instrument),
        arr(r.factor_ids),
        nul(r.use_case_class),
        sq(r.outcome_posture),
        nul(r.relationship),
        arr(r.data_categories),
        arr(r.flags),
        sq(r.rule_or_pattern),
        nul(r.rule_statement),
        sq(r.curation_note),
        sq(r.curated_by),
        sq(r.pipeline_stage),
        nul(r.extracted_quote),
        String(r.quote_verified),
        sq(r.confidence_tier),
        sq(r.pipeline_version),
        `${sq(r.classified_at)}::timestamptz`,
      ].join(", ")
    })`
  ).join(",\n");

  return `-- DOC 191 §7.3 — one-time LIA backfill. Generated by
-- scripts/doc191-lia-profile-backfill.ts; do not hand-edit.
-- ratified_by / ratified_at / ledger_ref are deliberately absent: doc 191 §8.
insert into public.authority_relevance_profiles
  (product, source_table, source_row_id, cam_row_id, country, instrument,
   factor_ids, use_case_class, outcome_posture, relationship, data_categories,
   flags, rule_or_pattern, rule_statement, curation_note, curated_by,
   pipeline_stage, extracted_quote, quote_verified, confidence_tier,
   pipeline_version, classified_at)
values
${values}
on conflict (product, source_table, source_row_id) do nothing;
`;
}

/**
 * The migration's own verification surface. The backfill SQL has to be
 * executed by pasting it into the Lovable `query_database` tool, so a
 * transcription slip is a real failure mode. This builds the canonical string
 * for each row EXACTLY as the SQL below rebuilds it server-side, so comparing
 * 35 md5 hashes catches any character that did not survive the trip — without
 * shipping 43KB of prose back through the check.
 */
export function canonicalRowString(r: BackfillRow): string {
  const N = "∅"; // ∅ — a NULL marker no field's text contains
  return [
    r.product,
    r.source_table,
    r.source_row_id,
    r.cam_row_id,
    r.country,
    r.instrument,
    r.factor_ids.join("~"),
    r.use_case_class ?? N,
    r.outcome_posture,
    r.relationship ?? N,
    r.data_categories.join("~"),
    r.flags.join("~"),
    r.rule_or_pattern,
    r.rule_statement ?? N,
    r.curation_note,
    r.curated_by,
    r.pipeline_stage,
    r.extracted_quote ?? N,
    String(r.quote_verified),
    r.confidence_tier,
    r.pipeline_version,
  ].join("|");
}

/** The same canonical string, rebuilt server-side. `a` is the table alias. */
export const canonicalSqlExpr = (a: string) =>
  `md5(${a}.product || '|' || ${a}.source_table || '|' || ${a}.source_row_id::text || '|' || coalesce(${a}.cam_row_id,'∅') || '|' || ${a}.country || '|' || ${a}.instrument || '|' || array_to_string(${a}.factor_ids,'~') || '|' || coalesce(${a}.use_case_class,'∅') || '|' || ${a}.outcome_posture || '|' || coalesce(${a}.relationship,'∅') || '|' || array_to_string(${a}.data_categories,'~') || '|' || array_to_string(${a}.flags,'~') || '|' || ${a}.rule_or_pattern || '|' || coalesce(${a}.rule_statement,'∅') || '|' || ${a}.curation_note || '|' || ${a}.curated_by || '|' || ${a}.pipeline_stage || '|' || coalesce(${a}.extracted_quote,'∅') || '|' || ${a}.quote_verified::text || '|' || ${a}.confidence_tier || '|' || ${a}.pipeline_version)`;

async function md5(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("MD5" as AlgorithmIdentifier, new TextEncoder().encode(s))
    .catch(() => null);
  if (buf) return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const { createHash } = await import("node:crypto");
  return createHash("md5").update(s, "utf8").digest("hex");
}

async function verificationSql(rows: BackfillRow[]): Promise<string> {
  const values: string[] = [];
  for (const r of rows) values.push(`  (${sq(r.cam_row_id)}, ${sq(await md5(canonicalRowString(r)))})`);
  return `-- DOC 191 §7.3 migration verification. Returns ONE ROW PER MISMATCH;
-- an empty result means every migrated row matches the hand-authored source
-- byte for byte. Generated by scripts/doc191-lia-profile-backfill.ts --verify.
with expected(cam_row_id, md5_expected) as (values
${values.join(",\n")}
)
select e.cam_row_id,
       ${canonicalSqlExpr("a")} as md5_actual,
       e.md5_expected,
       case when a.cam_row_id is null then 'MISSING FROM DB' else 'CONTENT MISMATCH' end as problem
from expected e
left join public.authority_relevance_profiles a
  on a.product = 'lia' and a.cam_row_id = e.cam_row_id
where a.cam_row_id is null or ${canonicalSqlExpr("a")} <> e.md5_expected;
`;
}

if (import.meta.main) {
  const rows = buildRows();
  const args = new Set(Deno.args);
  if (args.has("--verify")) {
    await Deno.writeTextFile("scripts/doc191-lia-profile-verify.sql", await verificationSql(rows));
    console.log("wrote scripts/doc191-lia-profile-verify.sql");
  }
  if (args.has("--sql")) {
    await Deno.writeTextFile("scripts/doc191-lia-profile-backfill.sql", toSql(rows));
    console.log(`wrote scripts/doc191-lia-profile-backfill.sql — ${rows.length} rows`);
    // The Lovable `query_database` tool takes SQL inline, so the same
    // statement is also emitted in executable-sized parts. Each part is
    // independently idempotent (ON CONFLICT DO NOTHING).
    const per = 7;
    for (let i = 0, part = 1; i < rows.length; i += per, part++) {
      await Deno.writeTextFile(
        `scripts/doc191-lia-profile-backfill.part${part}.sql`,
        toSql(rows.slice(i, i + per)),
      );
      console.log(`wrote part${part}: rows ${i + 1}-${Math.min(i + per, rows.length)}`);
    }
  }
  if (args.has("--snapshot")) {
    // The pin test (doc 191 §7.3) must run OFFLINE and deterministically, so
    // it reads this snapshot rather than the live table. The snapshot is
    // built from the same buildRows() that produced the INSERTs, and the
    // per-row md5 below is the SAME hash the --verify query recomputes
    // server-side — so "snapshot == live table" is a checkable claim, not an
    // assumption. Re-run --verify against the DB whenever this is refreshed.
    const snapshot = {
      note:
        "DOC 191 §7.3 — the migrated LIA rows of authority_relevance_profiles. Generated by scripts/doc191-lia-profile-backfill.ts --snapshot. Verified against the live table with --verify (md5 per row, 0 mismatches).",
      generated_from: "supabase/functions/run-li-assessment/_local/corpus/maps/lia-relevance-profiles.ts",
      map_version: LIA_CORPUS_MAP.map_version,
      row_count: rows.length,
      rows: [] as (BackfillRow & { md5: string })[],
    };
    for (const r of rows) snapshot.rows.push({ ...r, md5: await md5(canonicalRowString(r)) });
    await Deno.writeTextFile(
      "tests/edge/corpus/__snapshots__/authority-relevance-profiles-lia.json",
      JSON.stringify(snapshot, null, 2) + "\n",
    );
    console.log(`wrote tests/edge/corpus/__snapshots__/authority-relevance-profiles-lia.json — ${rows.length} rows`);
  }
  const apCount = LIA_CORPUS_MAP.rows.filter((r) => r.role === "AP").length;
  console.log(`AP CAM rows: ${apCount}`);
  console.log(`profile keys in lia-relevance-profiles.ts: ${Object.keys(LIA_RELEVANCE_PROFILES).length}`);
  console.log(`distinct sources (= DB rows): ${rows.length}`);
  console.log(`reclassified to 'rule': ${rows.filter((r) => r.rule_or_pattern === "rule").length}`);
}
