// GOVERNANCE-REGISTRY-AUTHORING (2026-07-25) — LIVE-CORPUS pin-tests.
//
// Every row in `GOVERNANCE_VERIFIED_AUTHORITIES` must have a `verbatim_quote`
// that is a byte-exact substring of its APPROVED corpus source pulled LIVE
// from PostgREST at test time. No pasted snapshots — the corpus itself is
// queried.
//
// Sources:
//   - public.provision_texts   (status='approved', jurisdiction='EU', key like gdpr-art-*)
//   - public.edpb_guidelines   (guideline_ref='EDPB Guidelines 2/2019', status='final')
//
// If any assert fails, do NOT rewrite the quote — either (a) confirm the row
// against the corpus and fix the paraphrase, or (b) move the proposition_key
// onto `GOVERNANCE_UNANCHORED_PROPOSITIONS`.
//
// Env: reads VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (project .env).

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  GOVERNANCE_VERIFIED_AUTHORITIES,
  GOVERNANCE_VERIFIED_AUTHORITY_VERSION,
  GOVERNANCE_UNANCHORED_PROPOSITIONS,
  KNOWN_PARAPHRASED_KEYS,
} from "../../../supabase/functions/_shared/registry/governance-verified-authorities.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

/** proposition_key -> corpus source that must contain the verbatim_quote.
 * ITEM 387 (2026-08-06): extended from the w1 (2026-07-25) set to the UK GDPR
 * rows added by items 326/327. */
const ROW_TO_SOURCE: Record<
  string,
  | { table: "provision_texts"; key: string }
  | { table: "edpb_guidelines"; section: string }
  | { table: "edpb_guidelines"; guideline: string }
> = {
  principle_lawfulness_fairness_transparency: { table: "provision_texts", key: "gdpr-art-5-1-a" },
  principle_purpose_limitation: { table: "provision_texts", key: "gdpr-art-5-1-b" },
  principle_data_minimisation: { table: "provision_texts", key: "gdpr-art-5-1-c" },
  lawful_basis_legitimate_interests: { table: "provision_texts", key: "gdpr-art-6-1-f" },
  special_categories_prohibition: { table: "provision_texts", key: "gdpr-art-9-1" },
  art_13_controller_identity: { table: "provision_texts", key: "gdpr-art-13" },
  art_13_rights_information: { table: "provision_texts", key: "gdpr-art-13" },
  art_14_rights_information: { table: "provision_texts", key: "gdpr-art-14" },
  art_22_admt_right: { table: "provision_texts", key: "gdpr-art-22" },
  data_protection_by_design: { table: "provision_texts", key: "gdpr-art-25" },
  processor_sufficient_guarantees: { table: "provision_texts", key: "gdpr-art-28" },
  processor_sub_processor_authorisation: { table: "provision_texts", key: "gdpr-art-28" },
  processor_documented_instructions: { table: "provision_texts", key: "gdpr-art-28" },
  processor_confidentiality: { table: "provision_texts", key: "gdpr-art-28" },
  processor_return_or_delete: { table: "provision_texts", key: "gdpr-art-28" },
  processor_audit_rights: { table: "provision_texts", key: "gdpr-art-28" },
  ropa_controller_record: { table: "provision_texts", key: "gdpr-art-30" },
  ropa_processor_record: { table: "provision_texts", key: "gdpr-art-30" },
  ropa_small_enterprise_carveout: { table: "provision_texts", key: "gdpr-art-30" },
  security_appropriate_measures: { table: "provision_texts", key: "gdpr-art-32" },
  security_staff_instructions: { table: "provision_texts", key: "gdpr-art-32" },
  breach_notify_sa_72h: { table: "provision_texts", key: "gdpr-art-33" },
  breach_processor_notify_controller: { table: "provision_texts", key: "gdpr-art-33" },
  breach_notify_data_subject_high_risk: { table: "provision_texts", key: "gdpr-art-34" },
  dpia_when_required: { table: "provision_texts", key: "gdpr-art-35" },
  dpia_trigger_automated_profiling: { table: "provision_texts", key: "gdpr-art-35" },
  dpia_trigger_special_categories_large_scale: { table: "provision_texts", key: "gdpr-art-35" },
  dpia_trigger_public_area_monitoring: { table: "provision_texts", key: "gdpr-art-35" },
  transfers_general_principle: { table: "provision_texts", key: "gdpr-art-44" },
  transfers_appropriate_safeguards: { table: "provision_texts", key: "gdpr-art-46" },
  transfers_scc_mechanism: { table: "provision_texts", key: "gdpr-art-46" },
  transfers_bcr_mechanism: { table: "provision_texts", key: "gdpr-art-46" },
  uk_art_44_not_in_force: { table: "provision_texts", key: "ukgdpr-art-44" },
  uk_transfers_general_principle: { table: "provision_texts", key: "ukgdpr-art-44a" },
  uk_transfers_adequacy_route: { table: "provision_texts", key: "ukgdpr-art-44a" },
  uk_transfers_safeguards_route: { table: "provision_texts", key: "ukgdpr-art-44a" },
  uk_transfers_art_49a_restriction: { table: "provision_texts", key: "ukgdpr-art-44a" },
  uk_adequacy_regulations_power: { table: "provision_texts", key: "ukgdpr-art-45a" },
  uk_adequacy_data_protection_test: { table: "provision_texts", key: "ukgdpr-art-45b" },
  uk_adequacy_test_factors: { table: "provision_texts", key: "ukgdpr-art-45b" },
  uk_transfers_appropriate_safeguards: { table: "provision_texts", key: "ukgdpr-art-46" },
  uk_transfers_exporter_own_assessment: { table: "provision_texts", key: "ukgdpr-art-46" },
  uk_transfers_sos_clauses: { table: "provision_texts", key: "ukgdpr-art-46" },
  uk_transfers_commissioner_clauses: { table: "provision_texts", key: "ukgdpr-art-46" },
  uk_transfers_bcr_mechanism: { table: "provision_texts", key: "ukgdpr-art-46" },
  uk_transfers_data_protection_test: { table: "provision_texts", key: "ukgdpr-art-46" },
  uk_transfers_reasonable_and_proportionate: { table: "provision_texts", key: "ukgdpr-art-46" },
  uk_bcr_commissioner_approval: { table: "provision_texts", key: "ukgdpr-art-47" },
  uk_standard_clauses_secretary_of_state: { table: "provision_texts", key: "ukgdpr-art-47a" },
  necessity_less_intrusive_alternatives: { table: "edpb_guidelines", section: "2.4 Necessity" },
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

Deno.test("governance-registry: version tag is the current authored wave (w2, item 327)", () => {
  assert(
    GOVERNANCE_VERIFIED_AUTHORITY_VERSION === "governance-va-w2-2026-08-01-item327",
  );
});

Deno.test("governance-registry: no paraphrase on entry (KNOWN_PARAPHRASED_KEYS empty)", () => {
  assert(KNOWN_PARAPHRASED_KEYS.length === 0);
});

Deno.test("governance-registry: unanchorable list is non-empty (write-around targets registered)", () => {
  assert(GOVERNANCE_UNANCHORED_PROPOSITIONS.length > 0);
});

Deno.test("governance-registry: every row is a byte-exact substring of its LIVE approved-corpus source", async () => {
  const corpus = await loadCorpus();
  const rows = Object.values(GOVERNANCE_VERIFIED_AUTHORITIES);
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
    const hit = bodies.some((b) => b.includes(row.verbatim_quote));
    if (!hit) {
      const maxLen = Math.max(...bodies.map((b) => b.length));
      failures.push(
        `NO PIN: ${row.proposition_key} -> ${JSON.stringify(src)} — verbatim_quote not found across ${bodies.length} candidate row(s) (max len=${maxLen})`,
      );
    }
  }
  if (failures.length) console.error(failures.join("\n"));
  assert(failures.length === 0, `${failures.length} live-corpus pin failures`);
});

Deno.test("governance-registry: registry keys match proposition_key and required fields are non-empty", () => {
  for (const [k, row] of Object.entries(GOVERNANCE_VERIFIED_AUTHORITIES)) {
    assert(k === row.proposition_key, `key/proposition_key mismatch: ${k} vs ${row.proposition_key}`);
    assert(row.citation.length > 0, `citation empty on ${k}`);
    assert(row.subsection.length > 0, `subsection empty on ${k}`);
    assert(row.verbatim_quote.length > 0, `verbatim_quote empty on ${k}`);
    assert(row.governing_anchor.length > 0, `governing_anchor empty on ${k}`);
    // ITEM 387: two authored waves — w1 (2026-07-25) and item 327 UK GDPR
    // (2026-08-01).
    assert(
      ["2026-07-25", "2026-08-01"].includes(row.verified_on),
      `verified_on wrong on ${k}: ${row.verified_on}`,
    );
  }
});
