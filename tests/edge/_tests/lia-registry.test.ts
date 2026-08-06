// LIA-REGISTRY-AUTHORING (2026-07-25) — LIVE-CORPUS pin-tests.
//
// Every row in `LIA_VERIFIED_AUTHORITIES` must have a `verbatim_quote` that is
// a byte-exact substring of its APPROVED corpus source pulled LIVE from
// PostgREST at test time. No pasted snapshots — the corpus itself is queried.
//
// Sources:
//   - public.provision_texts   (status='approved', jurisdiction='EU', key like gdpr-*)
//   - public.edpb_guidelines   (guideline_ref='EDPB Guidelines 2/2019', status='final')
//
// If any assert fails, do NOT rewrite the quote — either (a) confirm the row
// against the corpus and fix the paraphrase, or (b) move the proposition_key
// onto `LIA_UNANCHORED_PROPOSITIONS`.
//
// Env: reads VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (project .env)
// via std/dotenv/load.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  LIA_VERIFIED_AUTHORITIES,
  LIA_VERIFIED_AUTHORITY_VERSION,
  LIA_UNANCHORED_PROPOSITIONS,
  KNOWN_PARAPHRASED_KEYS,
} from "../../../supabase/functions/_shared/registry/lia-verified-authorities.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

/** proposition_key -> corpus source that must contain the verbatim_quote.
 * ITEM 387 (2026-08-06): extended from the w1 (2026-07-25) set to the rows
 * added by item 311 (EDPB 1/2024 + Recital 47) and item 326/327 (UK GDPR).
 * EDPB 1/2024 rows carry an empty section_heading in the corpus, so they are
 * pinned against every excerpt row of that guideline_ref. */
const ROW_TO_SOURCE: Record<
  string,
  | { table: "provision_texts"; key: string }
  | { table: "edpb_guidelines"; section: string }
  | { table: "edpb_guidelines"; guideline: string }
> = {
  li_lawful_basis_legitimate_interests: { table: "provision_texts", key: "gdpr-art-6-1-f" },
  li_public_authorities_exclusion: { table: "provision_texts", key: "gdpr-art-6-1-f" },
  principle_lawfulness_fairness_transparency: { table: "provision_texts", key: "gdpr-art-5-1-a" },
  principle_purpose_limitation: { table: "provision_texts", key: "gdpr-art-5-1-b" },
  principle_data_minimisation: { table: "provision_texts", key: "gdpr-art-5-1-c" },
  special_categories_prohibition: { table: "provision_texts", key: "gdpr-art-9-1" },
  art_13_legitimate_interests_disclosure: { table: "provision_texts", key: "gdpr-art-13" },
  art_13_object_right_information: { table: "provision_texts", key: "gdpr-art-13" },
  art_14_legitimate_interests_disclosure: { table: "provision_texts", key: "gdpr-art-14" },
  art_14_object_right_information: { table: "provision_texts", key: "gdpr-art-14" },
  art_22_admt_right: { table: "provision_texts", key: "gdpr-art-22" },
  data_protection_by_design: { table: "provision_texts", key: "gdpr-art-25" },
  ropa_controller_record: { table: "provision_texts", key: "gdpr-art-30" },
  dpia_when_required: { table: "provision_texts", key: "gdpr-art-35" },
  necessity_less_intrusive_alternatives: { table: "edpb_guidelines", section: "2.4 Necessity" },
  necessity_useful_not_necessary: { table: "edpb_guidelines", section: "2.4 Necessity" },
  edpb_1_2024_legitimate_interest_qualities: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_three_cumulative_conditions: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_public_authorities_exclusion: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_necessity_less_restrictive_means: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_reasonable_expectations_weighed: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_reasonable_expectations_contextual_elements: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_notice_alone_not_sufficient: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_child_interests_prevail: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_child_specific_protection: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_mitigating_measures_beyond_gdpr: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_mitigating_measures_exclusions: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  edpb_1_2024_balance_override_outcome: { table: "edpb_guidelines", guideline: "EDPB Guidelines 1/2024" },
  li_child_data_subject_clause: { table: "provision_texts", key: "gdpr-art-6-1-f" },
  recital_47_reasonable_expectation_at_collection: { table: "provision_texts", key: "gdpr-recital-47" },
  recital_47_override_where_not_expected: { table: "provision_texts", key: "gdpr-recital-47" },
  recital_47_expectations_from_relationship: { table: "provision_texts", key: "gdpr-recital-47" },
  uk_art_22_substituted: { table: "provision_texts", key: "ukgdpr-art-22" },
  uk_art_22a_solely_automated_definition: { table: "provision_texts", key: "ukgdpr-art-22a" },
  uk_art_22a_significant_decision_definition: { table: "provision_texts", key: "ukgdpr-art-22a" },
  uk_art_22a_profiling_consideration: { table: "provision_texts", key: "ukgdpr-art-22a" },
  uk_art_22b_special_category_restriction: { table: "provision_texts", key: "ukgdpr-art-22b" },
  uk_art_22b_recognised_li_bar: { table: "provision_texts", key: "ukgdpr-art-22b" },
  uk_art_22c_safeguards_duty: { table: "provision_texts", key: "ukgdpr-art-22c" },
  uk_art_22c_safeguard_measures: { table: "provision_texts", key: "ukgdpr-art-22c" },
  uk_art_22d_safeguard_regulations: { table: "provision_texts", key: "ukgdpr-art-22d" },
  uk_art_6_1_ea_recognised_li: { table: "provision_texts", key: "ukgdpr-art-6" },
  uk_art_6_ea_annex_1_condition: { table: "provision_texts", key: "ukgdpr-art-6" },
  uk_art_6_1_f_legitimate_interests: { table: "provision_texts", key: "ukgdpr-art-6-1-f" },
};

async function pgrest(path: string): Promise<unknown[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`PostgREST ${r.status}: ${body}`);
  return JSON.parse(body);
}

interface CorpusBundle {
  provision: Map<string, string>;
  /** section_heading -> excerpt bodies. */
  edpb: Map<string, string[]>;
  /** guideline_ref -> every excerpt body of that guideline. */
  edpbByRef: Map<string, string[]>;
}

async function loadCorpus(): Promise<CorpusBundle> {
  const keys = new Set<string>();
  const sections = new Set<string>();
  const refs = new Set<string>();
  for (const src of Object.values(ROW_TO_SOURCE)) {
    if (src.table === "provision_texts") keys.add(src.key);
    else if ("section" in src) sections.add(src.section);
    else refs.add(src.guideline);
  }
  const keyList = [...keys].map((k) => `"${k}"`).join(",");
  const provisions = (await pgrest(
    `provision_texts?select=key,verbatim_excerpt&status=eq.approved&key=in.(${keyList})`,
  )) as Array<{ key: string; verbatim_excerpt: string }>;
  const provision = new Map(provisions.map((r) => [r.key, r.verbatim_excerpt]));

  const edpbRows = (await pgrest(
    `edpb_guidelines?select=guideline_ref,section_heading,excerpt_text&status=eq.final`,
  )) as Array<{ guideline_ref: string | null; section_heading: string | null; excerpt_text: string | null }>;
  const edpb = new Map<string, string[]>();
  const edpbByRef = new Map<string, string[]>();
  for (const r of edpbRows) {
    if (!r.excerpt_text) continue;
    if (r.section_heading) {
      const list = edpb.get(r.section_heading) ?? [];
      list.push(r.excerpt_text);
      edpb.set(r.section_heading, list);
    }
    if (r.guideline_ref) {
      const list = edpbByRef.get(r.guideline_ref) ?? [];
      list.push(r.excerpt_text);
      edpbByRef.set(r.guideline_ref, list);
    }
  }
  return { provision, edpb, edpbByRef };
}

Deno.test("lia-registry: version tag is the current authored wave (w2, item 326)", () => {
  assert(LIA_VERIFIED_AUTHORITY_VERSION === "lia-va-w2-2026-08-01-item326");
});

Deno.test("lia-registry: no paraphrase on entry (KNOWN_PARAPHRASED_KEYS empty)", () => {
  assert(KNOWN_PARAPHRASED_KEYS.length === 0);
});

Deno.test("lia-registry: unanchorable list is non-empty (write-around targets registered)", () => {
  assert(LIA_UNANCHORED_PROPOSITIONS.length > 0);
});

Deno.test("lia-registry: every row is a byte-exact substring of its LIVE approved-corpus source", async () => {
  const corpus = await loadCorpus();
  const rows = Object.values(LIA_VERIFIED_AUTHORITIES);
  assert(rows.length > 0, "registry must have at least one row");

  const failures: string[] = [];
  for (const row of rows) {
    const src = ROW_TO_SOURCE[row.proposition_key];
    if (!src) {
      failures.push(`UNMAPPED: ${row.proposition_key} has no ROW_TO_SOURCE entry`);
      continue;
    }
    const bodies: string[] = src.table === "provision_texts"
      ? (corpus.provision.get(src.key) ? [corpus.provision.get(src.key)!] : [])
      : ("section" in src
        ? (corpus.edpb.get(src.section) ?? [])
        : (corpus.edpbByRef.get(src.guideline) ?? []));
    if (bodies.length === 0) {
      failures.push(`NO CORPUS ROW: ${row.proposition_key} -> ${JSON.stringify(src)}`);
      continue;
    }
    // Pass if ANY row with the same key/section carries the substring — the
    // corpus may hold multiple rows sharing a heading (e.g. paragraph split).
    const hit = bodies.some((b) => b.includes(row.verbatim_quote));
    if (!hit) {
      const maxLen = Math.max(...bodies.map((b) => b.length));
      failures.push(`NO PIN: ${row.proposition_key} -> ${JSON.stringify(src)} — verbatim_quote not found across ${bodies.length} candidate row(s) (max len=${maxLen})`);
    }
  }
  if (failures.length) console.error(failures.join("\n"));
  assert(failures.length === 0, `${failures.length} live-corpus pin failures`);
});

Deno.test("lia-registry: registry keys match proposition_key on each row and required fields are non-empty", () => {
  for (const [k, row] of Object.entries(LIA_VERIFIED_AUTHORITIES)) {
    assert(k === row.proposition_key, `key/proposition_key mismatch: ${k} vs ${row.proposition_key}`);
    assert(row.citation.length > 0, `citation empty on ${k}`);
    assert(row.subsection.length > 0, `subsection empty on ${k}`);
    assert(row.verbatim_quote.length > 0, `verbatim_quote empty on ${k}`);
    assert(row.governing_anchor.length > 0, `governing_anchor empty on ${k}`);
    // ITEM 387: three authored waves — w1 (2026-07-25), item 311 (2026-07-31,
    // EDPB 1/2024 + Recital 47), item 326 (2026-08-01, UK GDPR).
    assert(
      ["2026-07-25", "2026-07-31", "2026-08-01"].includes(row.verified_on),
      `verified_on wrong on ${k}: ${row.verified_on}`,
    );
  }
});
