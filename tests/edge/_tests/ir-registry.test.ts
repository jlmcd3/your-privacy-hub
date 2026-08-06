// IR-REGISTRY-AUTHORING (2026-07-25) — LIVE-CORPUS pin-tests.
//
// Every row in `IR_PLAYBOOK_VERIFIED_AUTHORITIES` must have a `verbatim_quote`
// that is a byte-exact substring of its APPROVED corpus source pulled LIVE
// from PostgREST at test time. No pasted snapshots — the corpus itself is
// queried.
//
// Source this turn:
//   - public.provision_texts (status='approved', jurisdiction='EU', key like gdpr-*)
//
// If any assert fails, do NOT rewrite the quote — either (a) confirm the row
// against the corpus and fix the paraphrase, or (b) move the proposition_key
// onto `IR_PLAYBOOK_UNANCHORED_PROPOSITIONS`.
//
// Env: reads VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (project .env)
// via std/dotenv/load.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  IR_PLAYBOOK_VERIFIED_AUTHORITIES,
  IR_PLAYBOOK_VERIFIED_AUTHORITY_VERSION,
  IR_PLAYBOOK_UNANCHORED_PROPOSITIONS,
  KNOWN_PARAPHRASED_KEYS,
} from "../../../supabase/functions/_shared/registry/ir-playbook-verified-authorities.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

/** proposition_key -> provision_texts key that must contain the verbatim_quote.
 * ITEM 387 (2026-08-06): extended from the w1 (2026-07-25) set to the UK GDPR
 * rows added by items 311/326/327. */
const ROW_TO_SOURCE: Record<string, { table: "provision_texts"; key: string }> = {
  breach_notify_sa_72h: { table: "provision_texts", key: "gdpr-art-33" },
  breach_notify_reasons_for_delay: { table: "provision_texts", key: "gdpr-art-33" },
  processor_notify_controller_without_undue_delay: { table: "provision_texts", key: "gdpr-art-33" },
  notification_content_describe_breach: { table: "provision_texts", key: "gdpr-art-33" },
  notification_content_dpo_contact: { table: "provision_texts", key: "gdpr-art-33" },
  notification_content_likely_consequences: { table: "provision_texts", key: "gdpr-art-33" },
  notification_content_measures_taken: { table: "provision_texts", key: "gdpr-art-33" },
  phased_notification_permitted: { table: "provision_texts", key: "gdpr-art-33" },
  document_breaches_duty: { table: "provision_texts", key: "gdpr-art-33" },
  communicate_to_data_subject_high_risk: { table: "provision_texts", key: "gdpr-art-34" },
  communication_clear_plain_language: { table: "provision_texts", key: "gdpr-art-34" },
  exception_encryption_unintelligibility: { table: "provision_texts", key: "gdpr-art-34" },
  exception_subsequent_measures: { table: "provision_texts", key: "gdpr-art-34" },
  exception_disproportionate_effort: { table: "provision_texts", key: "gdpr-art-34" },
  sa_may_require_communication: { table: "provision_texts", key: "gdpr-art-34" },
  security_appropriate_measures: { table: "provision_texts", key: "gdpr-art-32" },
  security_pseudonymisation_encryption: { table: "provision_texts", key: "gdpr-art-32" },
  security_confidentiality_integrity_availability_resilience: { table: "provision_texts", key: "gdpr-art-32" },
  security_restore_availability: { table: "provision_texts", key: "gdpr-art-32" },
  security_regular_testing: { table: "provision_texts", key: "gdpr-art-32" },
  security_risk_factors_scope: { table: "provision_texts", key: "gdpr-art-32" },
  staff_process_only_on_instructions: { table: "provision_texts", key: "gdpr-art-32" },
  processor_assists_arts_32_to_36: { table: "provision_texts", key: "gdpr-art-28" },
  demonstrate_compliance_and_audits: { table: "provision_texts", key: "gdpr-art-28" },
  controller_ropa_duty: { table: "provision_texts", key: "gdpr-art-30" },
  processor_ropa_duty: { table: "provision_texts", key: "gdpr-art-30" },
  principle_purpose_limitation: { table: "provision_texts", key: "gdpr-art-5-1-b" },
  principle_data_minimisation: { table: "provision_texts", key: "gdpr-art-5-1-c" },
  special_categories_prohibition: { table: "provision_texts", key: "gdpr-art-9-1" },
  transfers_chapter_v_general_principle: { table: "provision_texts", key: "gdpr-art-44" },
  transfers_appropriate_safeguards_required: { table: "provision_texts", key: "gdpr-art-46" },
  transfers_bcr_safeguard: { table: "provision_texts", key: "gdpr-art-46" },
  transfers_scc_safeguard: { table: "provision_texts", key: "gdpr-art-46" },
  uk_gdpr_art_33_mirror: { table: "provision_texts", key: "ukgdpr-art-33" },
  uk_gdpr_art_34_mirror: { table: "provision_texts", key: "ukgdpr-art-34" },
  uk_art_44_not_in_force: { table: "provision_texts", key: "ukgdpr-art-44" },
  uk_transfers_general_principle: { table: "provision_texts", key: "ukgdpr-art-44a" },
  uk_transfers_adequacy_route: { table: "provision_texts", key: "ukgdpr-art-44a" },
  uk_transfers_safeguards_route: { table: "provision_texts", key: "ukgdpr-art-44a" },
  uk_adequacy_data_protection_test: { table: "provision_texts", key: "ukgdpr-art-45b" },
  uk_transfers_appropriate_safeguards: { table: "provision_texts", key: "ukgdpr-art-46" },
  uk_transfers_sos_clauses: { table: "provision_texts", key: "ukgdpr-art-46" },
  uk_transfers_commissioner_clauses: { table: "provision_texts", key: "ukgdpr-art-46" },
  uk_transfers_data_protection_test: { table: "provision_texts", key: "ukgdpr-art-46" },
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

async function loadCorpus(): Promise<Map<string, string>> {
  const keys = new Set<string>();
  for (const src of Object.values(ROW_TO_SOURCE)) keys.add(src.key);
  const keyList = [...keys].map((k) => `"${k}"`).join(",");
  const provisions = await pgrest(
    `provision_texts?select=key,verbatim_excerpt&status=eq.approved&key=in.(${keyList})`,
  ) as Array<{ key: string; verbatim_excerpt: string }>;
  return new Map(provisions.map((r) => [r.key, r.verbatim_excerpt]));
}

Deno.test("ir-registry: version tag is the current authored wave (w2, item 328)", () => {
  assert(IR_PLAYBOOK_VERIFIED_AUTHORITY_VERSION === "ir-va-w2-2026-08-01-item328");
});

Deno.test("ir-registry: no paraphrase on entry (KNOWN_PARAPHRASED_KEYS empty)", () => {
  assert(KNOWN_PARAPHRASED_KEYS.length === 0);
});

Deno.test("ir-registry: unanchorable list is non-empty (write-around targets registered)", () => {
  assert(IR_PLAYBOOK_UNANCHORED_PROPOSITIONS.length > 0);
});

Deno.test("ir-registry: every row is a byte-exact substring of its LIVE approved-corpus source", async () => {
  const corpus = await loadCorpus();
  const rows = Object.values(IR_PLAYBOOK_VERIFIED_AUTHORITIES);
  assert(rows.length > 0, "registry must have at least one row");

  const failures: string[] = [];
  for (const row of rows) {
    const src = ROW_TO_SOURCE[row.proposition_key];
    if (!src) {
      failures.push(`UNMAPPED: ${row.proposition_key} has no ROW_TO_SOURCE entry`);
      continue;
    }
    const body = corpus.get(src.key);
    if (!body) {
      failures.push(`NO CORPUS ROW: ${row.proposition_key} -> ${JSON.stringify(src)}`);
      continue;
    }
    if (!body.includes(row.verbatim_quote)) {
      failures.push(`NO PIN: ${row.proposition_key} -> ${JSON.stringify(src)} — verbatim_quote not found (body len=${body.length})`);
    }
  }
  if (failures.length) console.error(failures.join("\n"));
  assert(failures.length === 0, `${failures.length} live-corpus pin failures`);
});

Deno.test("ir-registry: registry keys match proposition_key on each row and required fields are non-empty", () => {
  for (const [k, row] of Object.entries(IR_PLAYBOOK_VERIFIED_AUTHORITIES)) {
    assert(k === row.proposition_key, `key/proposition_key mismatch: ${k} vs ${row.proposition_key}`);
    assert(row.citation.length > 0, `citation empty on ${k}`);
    assert(row.subsection.length > 0, `subsection empty on ${k}`);
    assert(row.verbatim_quote.length > 0, `verbatim_quote empty on ${k}`);
    assert(row.governing_anchor.length > 0, `governing_anchor empty on ${k}`);
    // ITEM 387: three authored waves — w1 (2026-07-25), UK mirrors
    // (2026-07-31), item 328 UK Chapter V (2026-08-01).
    assert(
      ["2026-07-25", "2026-07-31", "2026-08-01"].includes(row.verified_on),
      `verified_on wrong on ${k}: ${row.verified_on}`,
    );
  }
});
