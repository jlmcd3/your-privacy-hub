// PRE-SET DATA PACKAGES — 5 complete intake datasets per product (2026-08-31).
//
// The "Pre-set data package" source on /admin/all-products-test previously ran
// ONE canonical fixture per product, so a batch size of 5 produced five
// identical documents. This module derives FIVE complete, distinct datasets per
// product fixture.
//
// DERIVATION LAW: dataset 1 is the canonical fixture byte-for-byte. Datasets
// 2–5 are deep clones in which only IDENTITY-bearing values are rewritten —
// organisation name (every inflection, including the legal-suffix-free short
// form), email domain, web domain, and the named people (DPO / certifying
// executive / approver). Every substantive intake answer — enum labels,
// jurisdictions, control statuses, narratives, arrays — is carried over
// unchanged from a fixture that already passes BOTH the shape preflight
// (sampleFixturePreflight) and the canonical contract check
// (sampleFixtureContractCheck). A derived dataset is therefore complete and
// contract-conformant by construction: no field can be missing, blank, or
// off-enum unless it already was in the canonical fixture.
//
// SELECTION LAW (batch size N):
//   N < 5  → N datasets chosen at random WITHOUT replacement from the 5
//   N >= 5 → exactly the 5 datasets (the package never repeats data)

import { SAMPLE_FIXTURES, type SampleFixture, type ToolSlug } from "@/lib/sampleFixtures";

export interface DataProfile {
  key: string;
  org: string;
  /** Legal-suffix-free short form used inside prose. */
  orgShort: string;
  domain: string;
  dpoName: string;
  execName: string;
  execTitle: string;
  city: string;
}

/** Profile 1 is the canonical fixture (no substitution) — hence 4 entries. */
export const DERIVED_PROFILES: DataProfile[] = [
  {
    key: "aurora",
    org: "Aurora Borealis Logistics AB",
    orgShort: "Aurora Borealis Logistics",
    domain: "auroraborealislogistics.com",
    dpoName: "Ingrid Halvorsen",
    execName: "Ingrid Halvorsen",
    execTitle: "Chief Privacy Officer",
    city: "Gothenburg",
  },
  {
    key: "glacier",
    org: "Glacier Creek Mining Corporation",
    orgShort: "Glacier Creek Mining",
    domain: "glaciercreekmining.com",
    dpoName: "Marcus Feldt",
    execName: "Marcus Feldt",
    execTitle: "General Counsel",
    city: "Anchorage",
  },
  {
    key: "silverbell",
    org: "Silverbell Health Networks Ltd",
    orgShort: "Silverbell Health Networks",
    domain: "silverbellhealth.com",
    dpoName: "Priya Raghunathan",
    execName: "Priya Raghunathan",
    execTitle: "Data Protection Officer",
    city: "Manchester",
  },
  {
    key: "kestrel",
    org: "Kestrel Harbour Financial Group Inc.",
    orgShort: "Kestrel Harbour Financial Group",
    domain: "kestrelharbour.com",
    dpoName: "Tomas Almeida",
    execName: "Tomas Almeida",
    execTitle: "Head of Compliance",
    city: "Boston",
  },
];

/**
 * GDPR-ONLY PRODUCTS (2026-08-31, CEO instruction).
 *
 * A US-established company does not run the Governance assessment, the DPIA
 * or Registration — those products exist because the client is subject to the
 * GDPR. Their pre-set datasets therefore carry EU/UK identities only, and the
 * US-jurisdiction canonical variants of those products are not offered as
 * pre-set data on /admin/all-products-test.
 */
export const GDPR_ONLY_SLUGS: ToolSlug[] = ["governance", "dpia", "registration"];

/** EU/UK substitution identities used for the GDPR-only products. */
export const EU_DERIVED_PROFILES: DataProfile[] = [
  DERIVED_PROFILES[0], // Aurora Borealis Logistics AB — Gothenburg (SE)
  {
    key: "meridiaan",
    org: "Meridiaan Datadiensten B.V.",
    orgShort: "Meridiaan Datadiensten",
    domain: "meridiaandata.eu",
    dpoName: "Wouter van Leeuwen",
    execName: "Wouter van Leeuwen",
    execTitle: "General Counsel",
    city: "Rotterdam",
  },
  DERIVED_PROFILES[2], // Silverbell Health Networks Ltd — Manchester (UK)
  {
    key: "lumiere",
    org: "Lumière Santé Group SAS",
    orgShort: "Lumière Santé Group",
    domain: "lumieresante.eu",
    dpoName: "Camille Devereux",
    execName: "Camille Devereux",
    execTitle: "Head of Compliance",
    city: "Lyon",
  },
];

/** The substitution identities a given product's datasets are built from. */
export function profilesFor(slug: ToolSlug): DataProfile[] {
  return GDPR_ONLY_SLUGS.includes(slug) ? EU_DERIVED_PROFILES : DERIVED_PROFILES;
}

/**
 * True when a canonical fixture must not be offered as pre-set data because it
 * gives a GDPR-only product a US-established company.
 */
export function isNonGdprFixtureForGdprOnlyProduct(f: SampleFixture): boolean {
  return (
    GDPR_ONLY_SLUGS.includes(f.tool_slug) &&
    /^(us|broker_multistate)(-|$)/.test(f.variant)
  );
}

/** Keys whose value names the organisation, at any depth. */
const ORG_KEYS = new Set([
  "organization_name", "organisation_name", "organizationName", "organisationName",
  "entity_name", "orgName", "org_name",
  "company_name", "companyName", "controllerName", "controller_name",
  "business_name", "businessName", "legal_entity_name", "title_org",
]);

/** Keys whose value names a person. */
const PERSON_KEYS = new Set([
  "dpo_name", "dpoName", "approved_by_name", "i8_certifying_exec_name",
  "certifying_exec_name", "signatory_name", "contact_name", "preparer_name",
]);

const LEGAL_SUFFIX =
  /\s+(?:Ltd\.?|Limited|LLC|L\.L\.C\.|Inc\.?|Incorporated|PLC|plc|GmbH|AB|AS|A\/S|SE|SA|S\.A\.|NV|N\.V\.|BV|B\.V\.|SAS|Oy|SpA|Corp\.?|Corporation|Company|Co\.?|Group|Holdings|GbR|KG|AG)$/;

function shortForm(name: string): string {
  return name.replace(LEGAL_SUFFIX, "").trim();
}

function walkStrings(node: unknown, visit: (s: string, key: string) => void, key = ""): void {
  if (typeof node === "string") return visit(node, key);
  if (Array.isArray(node)) {
    for (const el of node) walkStrings(el, visit, key);
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) walkStrings(v, visit, k);
  }
}

function mapStrings(node: unknown, fn: (s: string, key: string) => string, key = ""): unknown {
  if (typeof node === "string") return fn(node, key);
  if (Array.isArray(node)) return node.map((el) => mapStrings(el, fn, key));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = mapStrings(v, fn, k);
    return out;
  }
  return node;
}

interface Identity {
  orgs: string[];
  people: string[];
  domains: string[];
}

/** Everything in a fixture that identifies the (fictional) company. */
export function readIdentity(fixture: unknown): Identity {
  const orgs = new Set<string>();
  const people = new Set<string>();
  const domains = new Set<string>();
  walkStrings(fixture, (s, key) => {
    const v = s.trim();
    if (!v) return;
    if (ORG_KEYS.has(key) && v.length > 3) {
      orgs.add(v);
      const short = shortForm(v);
      if (short && short !== v && short.length > 3) orgs.add(short);
    }
    if (PERSON_KEYS.has(key) && /^[A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+)+/.test(v)) {
      // Strip a trailing ", Title" the profile prompt sometimes appends.
      people.add(v.split(",")[0].trim());
    }
    for (const m of v.matchAll(/[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g)) domains.add(m[1].toLowerCase());
    for (const m of v.matchAll(/\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.(?:com|co\.uk|io|net|org|eu|de|se))\b/gi)) {
      domains.add(m[1].toLowerCase());
    }
  });
  // Longest-first so a short form never eats part of the full legal name.
  const byLen = (a: string, b: string) => b.length - a.length;
  return {
    orgs: [...orgs].sort(byLen),
    people: [...people].sort(byLen),
    domains: [...domains].sort(byLen),
  };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Rewrite one fixture's identity onto a profile. Pure; never mutates input. */
export function applyProfile(base: SampleFixture, profile: DataProfile, index: number): SampleFixture {
  const id = readIdentity(base.fixture);
  const clone = JSON.parse(JSON.stringify(base.fixture));

  const substituted = mapStrings(clone, (s, key) => {
    let out = s;
    for (const org of id.orgs) {
      out = out.replace(
        new RegExp(escapeRe(org), "g"),
        org === shortForm(org) ? profile.orgShort : profile.org,
      );
    }
    for (const person of id.people) {
      out = out.replace(new RegExp(escapeRe(person), "g"), profile.dpoName);
    }
    for (const domain of id.domains) {
      out = out.replace(new RegExp(escapeRe(domain), "gi"), profile.domain);
    }
    return out;
  }) as Record<string, unknown>;

  // Named-people keys are set outright so a fixture that never spells a name in
  // prose still carries the profile's people.
  const setPeople = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(setPeople);
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && PERSON_KEYS.has(k) && v.trim()) {
        obj[k] = k === "i8_certifying_exec_name" || k === "certifying_exec_name" ? profile.execName : profile.dpoName;
      } else if (typeof v === "string" && (k === "i8_certifying_exec_title" || k === "approved_by_title") && v.trim()) {
        obj[k] = profile.execTitle;
      } else {
        setPeople(v);
      }
    }
  };
  setPeople(substituted);

  return {
    ...base,
    variant: `${base.variant}-ds${index + 1}`,
    title: `${base.title} — ${profile.orgShort}`,
    scenario_summary: `Dataset ${index + 1} of the pre-set package (${profile.orgShort}, ${profile.city}). Same contract-conformant intake answers as the canonical fixture with a distinct corporate identity.`,
    fixture: substituted,
  };
}

/** The 5 datasets for one canonical fixture (dataset 1 = the fixture itself). */
export function datasetsFor(base: SampleFixture): SampleFixture[] {
  return [base, ...profilesFor(base.tool_slug).map((p, i) => applyProfile(base, p, i + 1))];
}

export const PRESET_DATASET_COUNT = 5;

/** All 5 datasets, keyed by `tool_slug/variant` of the canonical fixture. */
export const PRESET_DATA_PACKAGES: Record<string, SampleFixture[]> = Object.fromEntries(
  SAMPLE_FIXTURES.map((f) => [`${f.tool_slug}/${f.variant}`, datasetsFor(f)]),
);

/** Every dataset for a product slug (all its canonical variants × 5). */
export function packagesForSlug(slug: ToolSlug): SampleFixture[] {
  return SAMPLE_FIXTURES.filter((f) => f.tool_slug === slug).flatMap(datasetsFor);
}

/**
 * SELECTION LAW. `n < 5` → n random distinct datasets; `n >= 5` → all 5.
 * `rng` is injectable so the behaviour is testable.
 */
export function pickPresetDatasets(
  base: SampleFixture,
  n: number,
  rng: () => number = Math.random,
): SampleFixture[] {
  const all = PRESET_DATA_PACKAGES[`${base.tool_slug}/${base.variant}`] ?? datasetsFor(base);
  if (n >= PRESET_DATASET_COUNT) return all;
  const pool = [...all];
  const out: SampleFixture[] = [];
  for (let i = 0; i < Math.max(1, n) && pool.length; i++) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}
