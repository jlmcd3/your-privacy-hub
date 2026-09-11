// Batch b83ea3c4 (2026-09-05) — the RoPA harness arm's row builders, pure so
// they can be tested (run-stress-job/index.ts calls Deno.serve at module
// scope).
//
// Two harness defects on the first batch after doc 168:
//   1. The per-activity answer map stopped at the ten pre-doc-168 keys. The
//      generator already produced activity_owner, collection_sources,
//      processing_operations, access_controls, notices_displayed,
//      incident_log and related_assessments — and the register read every one
//      of them as "not recorded" ("owned by an owner it has not named",
//      "collected from sources it has not recorded") on all four companies.
//   2. The client profile upsert never wrote `rights_handling_process`, so a
//      value left on the shared stress client by an earlier sample fixture
//      ("privacy@northpolemanualmining.example …") rendered as every
//      company's rights-handling sentence. The upsert now writes every
//      profile column it owns, null when the persona is silent.
//
// Keys mirror generate-ropa-document/register/assemble-input.ts
// (buildRopaAssembleInput) — the reader, not this file, is the source of
// truth; a key added there must be added here.

export const ROPA_ACTIVITY_ANSWER_KEYS = [
  "purpose",
  "lawful_basis",
  "special_category_basis",
  "data_subjects",
  "data_categories",
  "recipients",
  "transfer_destination",
  "transfer_mechanism",
  "retention_period",
  "security_measures",
  // DOC 168 structured Art. 30 elements.
  "activity_owner",
  "collection_sources",
  "processing_operations",
  "access_controls",
  "notices_displayed",
  "incident_log",
  "related_assessments",
] as const;

/** Shaped as a plain record so it feeds `insertAnswerRows(db, table, rows)`. */
export type RopaAnswerRow = Record<string, unknown> & {
  activity_id: string;
  session_id: string;
  question_key: string;
  answer_value: unknown;
};

/**
 * One row per (activity, answered key). Unanswered questions (undefined/null)
 * are simply not rows — PostgREST refuses a bulk insert whose rows do not
 * share one key set, and `answer_value` is NOT NULL (batch 4ed05f22).
 */
export function ropaAnswerRows(
  activities: ReadonlyArray<Record<string, unknown>>,
  activityRows: ReadonlyArray<{ id: string; display_order: number }>,
  sessionId: string,
): RopaAnswerRow[] {
  const out: RopaAnswerRow[] = [];
  for (const a of activityRows) {
    const src = activities[a.display_order];
    if (!src) continue;
    for (const k of ROPA_ACTIVITY_ANSWER_KEYS) {
      const v = src[k];
      if (v === undefined || v === null) continue;
      out.push({ activity_id: a.id, session_id: sessionId, question_key: k, answer_value: v });
    }
  }
  return out;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// DOC 254 (2026-09-11, ChatGPT review CR-6 / ROPA-06) — batch bcf0a706's RoPA
// rendered Silverbell Health Networks' DPO, representatives and rights-handling
// process as Velorix Digital Services' own. Root cause, verified in the
// database: the fixture's employee_band ("500–2,000") violates the
// ropa_client_profiles CHECK constraint ('<50','50-249','250-999','1000+'), so
// the profile upsert failed; the harness never read the upsert's error, and
// the profile row the shared stress client had carried since 2026-09-05
// rendered instead. The band is now normalised to the constraint's own
// vocabulary here, and the arm throws on any write error (fail closed — a
// stale profile must never render as a company's own facts).
export const ROPA_EMPLOYEE_BANDS = ["<50", "50-249", "250-999", "1000+"] as const;

export function normalizeEmployeeBand(v: unknown): string | null {
  const t = str(v);
  if (!t) return null;
  if ((ROPA_EMPLOYEE_BANDS as readonly string[]).includes(t)) return t;
  const nums = (t.match(/\d[\d,]*/g) ?? [])
    .map((n) => Number(n.replace(/,/g, "")))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  const lessThan = /^\s*(<|fewer than|less than|under)\b/i.test(t);
  const orMore = /\+|or more|and above|and over|over\b|more than/i.test(t);
  // A range is banded by its upper bound; "<50" / "fewer than 50" by the
  // bound minus one; "1,000+" / "over 1,000" by the bound itself.
  const upper = orMore ? Math.max(...nums) : lessThan ? Math.max(...nums) - 1 : Math.max(...nums);
  if (upper < 50) return "<50";
  if (upper <= 249) return "50-249";
  if (upper <= 999) return "250-999";
  return "1000+";
}

export interface RopaJurisdictionRow {
  code: string;
  name: string;
  region: string;
}

// The product's own jurisdiction vocabulary (src/data/jurisdiction-codes.ts):
// every register jurisdiction is a law code, never a country code. The
// generator is told the same vocabulary; this map catches drift ("EU (GDPR)",
// "United Kingdom (UK GDPR)", { code: "IE" }) so the selections table is
// written in the vocabulary the register reads, or not at all.
const ROPA_JURISDICTIONS: ReadonlyArray<readonly [string, string, string, RegExp]> = [
  ["UK_GDPR", "United Kingdom", "EU & UK", /\b(uk|united kingdom|uk gdpr|great britain|england|scotland|wales)\b/i],
  ["EU_GDPR", "European Union", "EU & UK", /\b(eu|eea|european union|gdpr|ireland|germany|france|netherlands|spain|italy|belgium|sweden|denmark|finland|austria|poland|portugal|greece|luxembourg|ie|de|fr|nl|es|it|be|se|dk|fi|at|pl|pt|gr|lu)\b/i],
  ["CH_FADP", "Switzerland", "EU & UK", /\b(ch|switzerland|swiss|fadp|nfadp)\b/i],
  ["US_CCPA", "California", "United States", /\b(california|ccpa|cpra|us_ccpa|us-ca|ca)\b/i],
  ["US_VA", "Virginia", "United States", /\b(virginia|vcdpa|us_va)\b/i],
  ["US_CO", "Colorado", "United States", /\b(colorado|cpa|us_co)\b/i],
  ["US_CT", "Connecticut", "United States", /\b(connecticut|ctdpa|us_ct)\b/i],
  ["US_TX", "Texas", "United States", /\b(texas|tdpsa|us_tx)\b/i],
  ["US_FL", "Florida", "United States", /\b(florida|fdbr|us_fl)\b/i],
  ["BR_LGPD", "Brazil", "International", /\b(brazil|brasil|lgpd)\b/i],
  ["CA_PIPEDA", "Canada", "International", /\b(canada|pipeda)\b/i],
  ["CN_PIPL", "China", "International", /\b(china|pipl)\b/i],
  ["JP_APPI", "Japan", "International", /\b(japan|appi)\b/i],
  ["KR_PIPA", "South Korea", "International", /\b(korea|pipa)\b/i],
  ["AU_PRIVACY", "Australia", "International", /\b(australia|au_privacy)\b/i],
  ["IN_DPDPA", "India", "International", /\b(india|dpdp|dpdpa)\b/i],
  ["ZA_POPIA", "South Africa", "International", /\b(south africa|popia)\b/i],
];

export function normalizeJurisdictions(v: unknown): RopaJurisdictionRow[] {
  const items = Array.isArray(v) ? v : [];
  const out: RopaJurisdictionRow[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const code = typeof item === "object" && item !== null ? str((item as Record<string, unknown>).code) : null;
    const name = typeof item === "object" && item !== null ? str((item as Record<string, unknown>).name) : str(item);
    const probe = [code, name].filter(Boolean).join(" ");
    let row: RopaJurisdictionRow | null = null;
    const exact = ROPA_JURISDICTIONS.find(([c]) => c === code);
    if (exact) row = { code: exact[0], name: exact[1], region: exact[2] };
    else {
      const hit = ROPA_JURISDICTIONS.find(([, , , re]) => re.test(probe));
      if (hit) row = { code: hit[0], name: hit[1], region: hit[2] };
    }
    if (!row || seen.has(row.code)) continue;
    seen.add(row.code);
    out.push(row);
  }
  return out;
}

/** The full `ropa_client_profiles` row for a persona — every owned column set. */
export function ropaProfileRow(persona: Record<string, unknown>, clientId: string): Record<string, unknown> {
  return {
    client_id: clientId,
    legal_entity_type: str(persona.legal_entity_type),
    employee_band: normalizeEmployeeBand(persona.employee_band),
    is_controller: true,
    is_processor: false,
    dpo_name: str(persona.dpo_name),
    dpo_email: str(persona.dpo_email),
    dpo_phone: str(persona.dpo_phone),
    eu_rep_name: str(persona.eu_rep_name),
    eu_rep_email: str(persona.eu_rep_email),
    uk_rep_name: str(persona.uk_rep_name),
    uk_rep_email: str(persona.uk_rep_email),
    registered_address: str(persona.registered_address),
    registration_number: str(persona.registration_number),
    incorporation_jurisdiction: str(persona.incorporation_jurisdiction),
    rights_handling_process: str(persona.rights_handling_process),
    home_base: str(persona.home_base),
  };
}
