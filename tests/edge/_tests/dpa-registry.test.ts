// DPA-REGISTRY-AUTHORING (2026-07-25) — LIVE-CORPUS pin-tests.
//
// Every row in `DPA_VERIFIED_AUTHORITIES` must have a `verbatim_quote` that is
// a byte-exact substring of its APPROVED corpus source pulled LIVE from
// PostgREST at test time. No pasted snapshots — the corpus itself is queried.
//
// Sources:
//   - public.provision_texts   (status='approved', jurisdiction='EU', key like gdpr-*)
//   - public.edpb_guidelines   (guideline_ref='EDPB Guidelines 2/2019', status='final')
//
// If any assert fails, do NOT rewrite the quote — either (a) confirm the row
// against the corpus and fix the paraphrase, or (b) move the proposition_key
// onto `DPA_UNANCHORED_PROPOSITIONS`.
//
// Env: reads VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (project .env)
// via std/dotenv/load.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DPA_VERIFIED_AUTHORITIES,
  DPA_VERIFIED_AUTHORITY_VERSION,
  DPA_UNANCHORED_PROPOSITIONS,
  KNOWN_PARAPHRASED_KEYS,
} from "../../../supabase/functions/_shared/registry/dpa-verified-authorities.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

/** proposition_key -> corpus source key that must contain the verbatim_quote. */
const ROW_TO_SOURCE: Record<
  string,
  { table: "provision_texts"; key: string } | { table: "edpb_guidelines"; section: string }
> = {
  processor_sufficient_guarantees:                            { table: "provision_texts", key: "gdpr-art-28" },
  sub_processor_authorisation_required:                       { table: "provision_texts", key: "gdpr-art-28" },
  sub_processor_general_authorisation_change_notice:          { table: "provision_texts", key: "gdpr-art-28" },
  processing_governed_by_binding_contract:                    { table: "provision_texts", key: "gdpr-art-28" },
  processor_documented_instructions:                          { table: "provision_texts", key: "gdpr-art-28" },
  personnel_confidentiality:                                  { table: "provision_texts", key: "gdpr-art-28" },
  processor_security_measures_ref:                            { table: "provision_texts", key: "gdpr-art-28" },
  sub_processor_conditions_ref:                               { table: "provision_texts", key: "gdpr-art-28" },
  processor_assists_data_subject_requests:                    { table: "provision_texts", key: "gdpr-art-28" },
  processor_assists_arts_32_to_36:                            { table: "provision_texts", key: "gdpr-art-28" },
  return_or_delete_at_end:                                    { table: "provision_texts", key: "gdpr-art-28" },
  demonstrate_compliance_and_audits:                          { table: "provision_texts", key: "gdpr-art-28" },
  processor_infringement_notification_duty:                   { table: "provision_texts", key: "gdpr-art-28" },
  sub_processor_flow_down_obligations:                        { table: "provision_texts", key: "gdpr-art-28" },
  initial_processor_remains_liable:                           { table: "provision_texts", key: "gdpr-art-28" },
  contract_in_writing:                                        { table: "provision_texts", key: "gdpr-art-28" },
  processor_becomes_controller_if_exceeds_instructions:       { table: "provision_texts", key: "gdpr-art-28" },
  processor_ropa_duty:                                        { table: "provision_texts", key: "gdpr-art-30" },
  security_appropriate_measures:                              { table: "provision_texts", key: "gdpr-art-32" },
  security_pseudonymisation_encryption:                       { table: "provision_texts", key: "gdpr-art-32" },
  security_confidentiality_integrity_availability_resilience: { table: "provision_texts", key: "gdpr-art-32" },
  security_restore_availability:                              { table: "provision_texts", key: "gdpr-art-32" },
  security_regular_testing:                                   { table: "provision_texts", key: "gdpr-art-32" },
  staff_process_only_on_instructions:                         { table: "provision_texts", key: "gdpr-art-32" },
  processor_breach_notify_controller:                         { table: "provision_texts", key: "gdpr-art-33" },
  principle_purpose_limitation:                               { table: "provision_texts", key: "gdpr-art-5-1-b" },
  principle_data_minimisation:                                { table: "provision_texts", key: "gdpr-art-5-1-c" },
  special_categories_prohibition:                             { table: "provision_texts", key: "gdpr-art-9-1" },
  transfers_chapter_v_general_principle:                      { table: "provision_texts", key: "gdpr-art-44" },
  transfers_appropriate_safeguards_required:                  { table: "provision_texts", key: "gdpr-art-46" },
  transfers_bcr_safeguard:                                    { table: "provision_texts", key: "gdpr-art-46" },
  transfers_scc_safeguard:                                    { table: "provision_texts", key: "gdpr-art-46" },
  necessity_less_intrusive_alternatives:                      { table: "edpb_guidelines", section: "2.4 Necessity" },
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
  /** section_heading -> list of excerpt bodies (multiple rows may share a heading). */
  edpb: Map<string, string[]>;
}

async function loadCorpus(): Promise<CorpusBundle> {
  const keys = new Set<string>();
  const sections = new Set<string>();
  for (const src of Object.values(ROW_TO_SOURCE)) {
    if (src.table === "provision_texts") keys.add(src.key);
    else sections.add(src.section);
  }
  const keyList = [...keys].map((k) => `"${k}"`).join(",");
  const provisions = await pgrest(
    `provision_texts?select=key,verbatim_excerpt&jurisdiction=eq.EU&status=eq.approved&key=in.(${keyList})`,
  ) as Array<{ key: string; verbatim_excerpt: string }>;
  const provision = new Map(provisions.map((r) => [r.key, r.verbatim_excerpt]));

  const edpbRows = await pgrest(
    `edpb_guidelines?select=section_heading,excerpt_text&guideline_ref=eq.EDPB%20Guidelines%202%2F2019&status=eq.final`,
  ) as Array<{ section_heading: string | null; excerpt_text: string | null }>;
  const edpb = new Map<string, string[]>();
  for (const r of edpbRows) {
    if (!r.section_heading || !r.excerpt_text) continue;
    const list = edpb.get(r.section_heading) ?? [];
    list.push(r.excerpt_text);
    edpb.set(r.section_heading, list);
  }
  return { provision, edpb };
}

Deno.test("dpa-registry: version tag is w1", () => {
  assert(DPA_VERIFIED_AUTHORITY_VERSION === "dpa-va-w1-2026-07-25");
});

Deno.test("dpa-registry: no paraphrase on entry (KNOWN_PARAPHRASED_KEYS empty)", () => {
  assert(KNOWN_PARAPHRASED_KEYS.length === 0);
});

Deno.test("dpa-registry: unanchorable list is non-empty (write-around targets registered)", () => {
  assert(DPA_UNANCHORED_PROPOSITIONS.length > 0);
});

Deno.test("dpa-registry: every row is a byte-exact substring of its LIVE approved-corpus source", async () => {
  const corpus = await loadCorpus();
  const rows = Object.values(DPA_VERIFIED_AUTHORITIES);
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
      : (corpus.edpb.get(src.section) ?? []);
    if (bodies.length === 0) {
      failures.push(`NO CORPUS ROW: ${row.proposition_key} -> ${JSON.stringify(src)}`);
      continue;
    }
    const hit = bodies.some((b) => b.includes(row.verbatim_quote));
    if (!hit) {
      const maxLen = Math.max(...bodies.map((b) => b.length));
      failures.push(`NO PIN: ${row.proposition_key} -> ${JSON.stringify(src)} — verbatim_quote not found across ${bodies.length} candidate row(s) (max len=${maxLen})`);
    }
  }
  if (failures.length) console.error(failures.join("\n"));
  assert(failures.length === 0, `${failures.length} live-corpus pin failures`);
});

Deno.test("dpa-registry: registry keys match proposition_key on each row and required fields are non-empty", () => {
  for (const [k, row] of Object.entries(DPA_VERIFIED_AUTHORITIES)) {
    assert(k === row.proposition_key, `key/proposition_key mismatch: ${k} vs ${row.proposition_key}`);
    assert(row.citation.length > 0, `citation empty on ${k}`);
    assert(row.subsection.length > 0, `subsection empty on ${k}`);
    assert(row.verbatim_quote.length > 0, `verbatim_quote empty on ${k}`);
    assert(row.governing_anchor.length > 0, `governing_anchor empty on ${k}`);
    assert(row.verified_on === "2026-07-25", `verified_on wrong on ${k}`);
  }
});
