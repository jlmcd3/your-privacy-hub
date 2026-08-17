// DPIA CONVERSION BATTERY (2026-08-17) — regression locks for the failure
// classes the historical grading corpus proved matter. Each seeded-defect case
// (1–5) seeds a would-be defect, proves the detector catches it, then runs the
// same detector over the live deterministic builders. Each metamorphic case
// (6–10) asserts a property over the builders rather than an example.
//
// Historical fail counts these lock against:
//   1. rubric_citation_misapplied ......... 134
//   2. rubric_unsupported_business_claim .. 120
//   3. e6_counsel_referral ................  34
//   4. rubric_internal_reasoning_leak .....  59
//   5. no_british_spelling ................  34
//
// CONSTRAINTS: pure unit tests. No network, no model calls, fixtures inline.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachDpiaDeliverables,
  buildDpiaDeliverables,
  buildOperations,
} from "../ltp/dpia-deliverables/build.ts";
import { DPIA_VERIFIED_AUTHORITIES } from "../registry/dpia-verified-authorities.ts";
import {
  OWNERSHIP_DISCLAIMER_RE,
  runFormatChecksGeneric,
} from "../grader/format-checks.ts";

// ─────────────────────────────────────────────────────────── fixtures

type Bag = Record<string, unknown>;

const BASE: Bag = {
  organization_name: "Northwind Clinics Ltd",
  processing_activity_name: "Patient triage scoring",
  purpose: "To triage patients arriving at urgent care.",
  description: "A scoring model applied at intake.",
  data_categories: ["Contact details", "Health or medical data"],
  data_subjects: "Patients",
  volume_frequency: "About 4,000 patients per month, continuously.",
  jurisdictions: ["EU (GDPR)"],
  legal_basis_proposed: "Legitimate interests (Art. 6(1)(f))",
  necessity_proportionality: "The scoring is limited to triage.",
  retention_period: "24 months",
  controller_contact: "Clinical Operations, privacy@northwind.example",
  dpo_info: "Dr A. Okafor, dpo@northwind.example",
  article_9_condition: "Health or social care (Art. 9(2)(h))",
  third_party_processors: ["Acme Cloud"],
  processor_obligations: "Processing only on documented instructions.",
  security_measures: ["Encryption at rest", "Access controls"],
  existing_safeguards: ["Encryption at rest", "Access controls"],
  nature_scope_context: "Triage runs in the urgent care unit.",
  secondary_uses: "None.",
};

/** Minimal-purpose record with no secondary uses (case 2 fixture). */
const MINIMAL: Bag = {
  organization_name: "Bramley Freight Ltd",
  processing_activity_name: "Driver shift rostering",
  purpose: "To roster drivers onto shifts.",
  description: "Shift allocation from the staff list.",
  data_categories: ["Contact details"],
  data_subjects: "Drivers employed by the organization",
  volume_frequency: "About 60 drivers, weekly.",
  jurisdictions: ["EU (GDPR)"],
  legal_basis_proposed: "Contract (Art. 6(1)(b))",
  necessity_proportionality: "Only the shift and contact fields are used.",
  retention_period: "12 months",
  existing_safeguards: ["Access controls"],
  secondary_uses: "None.",
};

const mk = (over: Bag = {}, from: Bag = BASE): Bag => ({ ...from, ...over });

const REGIMES: Bag[] = [{ jurisdictions: ["EU (GDPR)"] }, { jurisdictions: ["UK GDPR"] }];
const BASES = [
  "Legitimate interests (Art. 6(1)(f))",
  "Consent (Art. 6(1)(a))",
  "Contract (Art. 6(1)(b))",
  "Legal obligation (Art. 6(1)(c))",
  "Vital interests (Art. 6(1)(d))",
  "Public task (Art. 6(1)(e))",
];

/** The cartesian sweep every seeded-defect case runs over. */
function sweep(): Bag[] {
  const out: Bag[] = [];
  for (const r of REGIMES) {
    for (const lb of BASES) out.push(mk({ ...r, legal_basis_proposed: lb }));
  }
  out.push(mk({}, MINIMAL));
  return out;
}

// ─────────────────────────────────────────────────────────── walkers

interface Leaf {
  path: string;
  key: string;
  value: string;
}

function leaves(node: unknown, path = "", out: Leaf[] = []): Leaf[] {
  if (Array.isArray(node)) {
    node.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as unknown as Bag)) leaves(v, `${path}.${k}`, out);
    return out;
  }
  if (typeof node === "string") {
    const key = path.split(".").pop()!.replace(/\[\d+\]$/, "");
    out.push({ path, key, value: node });
  }
  return out;
}

/** Statute text carried by a node — never customer prose. */
const STATUTE_VERBATIM_KEYS = new Set([
  "authority_verbatim",
  "guidance_verbatim",
  "procedural_verbatim",
  "condition_verbatim",
  "mechanism_verbatim",
]);

/** Machine keys: enums, ids and provenance pointers, not customer prose. */
const MACHINE_KEY_RE =
  /(_id|_ids|_key|_field|_class|_code)$|^(status|verdict|band|inherent_band|residual_band|likelihood|severity|determination|field|source|source_field|rule_id|negation|citation_verified)$|citation|verbatim/;

const isCustomerText = (l: Leaf) =>
  !MACHINE_KEY_RE.test(l.key) && l.value.trim().split(/\s+/).length >= 4;

// ═════════════════════════════════════════ CASE 1 — CITATION INTEGRITY

const normCite = (s: string) =>
  s.replace(/\s+/g, " ").trim().replace(/^UK\s+GDPR/, "GDPR").toLowerCase();

/** citation key (regime-normalised) → every verbatim the registry returns. */
const REGISTRY_QUOTES: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const row of Object.values(DPIA_VERIFIED_AUTHORITIES) as unknown as Bag[]) {
    for (const k of [row.citation, row.subsection]) {
      if (typeof k !== "string" || !k) continue;
      const n = normCite(k);
      const arr = m.get(n) ?? [];
      arr.push(String(row.verbatim_quote ?? ""));
      m.set(n, arr);
    }
  }
  return m;
})();

interface CiteViolation {
  path: string;
  citations: string[];
  residue: string;
}

/**
 * Walks every object that carries statute text and asserts that text resolves
 * through the registry for THAT object's OWN citation keys. Any span left over
 * after removing the registry's quotes is statute text the cited provision
 * does not return — the rubric_citation_misapplied signature.
 */
function citationViolations(node: unknown, path = "", out: CiteViolation[] = []): CiteViolation[] {
  if (Array.isArray(node)) {
    node.forEach((v, i) => citationViolations(v, `${path}[${i}]`, out));
    return out;
  }
  if (!node || typeof node !== "object") return out;
  const obj = node as Bag;

  const citations = Object.entries(obj)
    .filter(([k, v]) => /citation/.test(k) && typeof v === "string" && v.trim())
    .flatMap(([, v]) => String(v).split(";"))
    .map((c) => c.trim())
    .filter(Boolean);
  const allowed = citations
    .flatMap((c) => REGISTRY_QUOTES.get(normCite(c)) ?? [])
    .sort((a, b) => b.length - a.length);

  for (const [k, v] of Object.entries(obj)) {
    if (!STATUTE_VERBATIM_KEYS.has(k) || typeof v !== "string" || !v.trim()) continue;
    let residue = v;
    for (const q of allowed) if (q) residue = residue.split(q).join(" ");
    if (residue.replace(/[\s;.,]/g, "") !== "") {
      out.push({ path: `${path}.${k}`, citations, residue: residue.trim().slice(0, 180) });
    }
  }
  for (const [k, v] of Object.entries(obj)) citationViolations(v, `${path}.${k}`, out);
  return out;
}

Deno.test("case 1a — seeded defect: statute text under a citation that does not return it is caught", () => {
  const seeded = {
    finding: {
      citation: "GDPR Art. 35(7)(b)",
      authority_verbatim:
        "the measures envisaged to address the risks, including safeguards, security measures and mechanisms to ensure the protection of personal data",
    },
  };
  assertEquals(citationViolations(seeded).length, 1);
});

Deno.test("case 1b — seeded control: registry-resolved statute text passes", () => {
  const clean = {
    finding: {
      citation: "GDPR Art. 35(7)(b)",
      authority_verbatim:
        "an assessment of the necessity and proportionality of the processing operations in relation to the purposes;",
    },
  };
  assertEquals(citationViolations(clean).length, 0);
});

Deno.test("case 1 — every citation emitted by every DPIA builder resolves through the registry", () => {
  const violations: CiteViolation[] = [];
  for (const intake of sweep()) citationViolations(buildDpiaDeliverables(intake), "", violations);
  const classes = [
    ...new Set(violations.map((v) => `${v.citations.join(" + ")} :: ${v.residue.slice(0, 90)}`)),
  ];
  assertEquals(violations.length, 0, `citation/verbatim mismatch:\n${classes.join("\n")}`);
});

// ═══════════════════════════════ CASE 2 — UNSUPPORTED BUSINESS CLAIMS

/** Every quoted span in customer text must be a substring of some intake value. */
function unsourcedQuotedSpans(built: unknown, intake: Bag): string[] {
  const values = leaves(intake).map((l) => l.value).concat(
    Object.values(intake).flatMap((v) => (Array.isArray(v) ? v.map(String) : [String(v)])),
  );
  const hits: string[] = [];
  for (const l of leaves(built)) {
    if (!isCustomerText(l)) continue;
    for (const m of l.value.matchAll(/[“"]([^”"]{3,})[”"]/g)) {
      const span = m[1].trim();
      if (!values.some((v) => v.includes(span))) hits.push(`${l.path} :: ${span}`);
    }
  }
  return [...new Set(hits)];
}

Deno.test("case 2a — seeded defect: a quoted span absent from intake is caught", () => {
  const seeded = { section: { narrative: 'The record describes “a fraud-detection uplift of 30%” for the activity.' } };
  assertEquals(unsourcedQuotedSpans(seeded, MINIMAL).length, 1);
});

Deno.test("case 2 — minimal purpose, no secondary uses: every quoted span traces to an intake field", () => {
  const hits = unsourcedQuotedSpans(buildDpiaDeliverables(MINIMAL), MINIMAL);
  assertEquals(hits.length, 0, `quoted spans with no intake source:\n${hits.join("\n")}`);
});

Deno.test("case 2 — sweep: every quoted span traces to an intake field", () => {
  const hits: string[] = [];
  for (const intake of sweep()) hits.push(...unsourcedQuotedSpans(buildDpiaDeliverables(intake), intake));
  assertEquals([...new Set(hits)].length, 0, `quoted spans with no intake source:\n${[...new Set(hits)].join("\n")}`);
});

// ═══════════════════════════════════ CASE 3 — COUNSEL-REFERRAL ZONE

/** Ownership-disclaimer sentence and its close paraphrases. */
const OWNERSHIP_PARAPHRASE_RE: readonly RegExp[] = [
  OWNERSHIP_DISCLAIMER_RE,
  /must\s+review,?\s+(?:complete|finalis[sz]e)\s+and\s+(?:own|adopt)\b/i,
  /(?:review|complete)\s+and\s+take\s+ownership\s+of\s+(?:this|the)\s+(?:document|assessment)/i,
  /your\s+(?:qualified\s+)?(?:data\s+protection\s+officer|legal\s+counsel)\s+must\s+(?:review|own)/i,
];

function customerProse(built: unknown): string {
  return leaves(built).filter(isCustomerText).map((l) => l.value).join("\n\n");
}

Deno.test("case 3a — seeded defect: the ownership sentence is caught outside the disclaimer", () => {
  const seeded =
    "Your qualified Data Protection Officer or legal counsel must review, complete, and own it.";
  assert(OWNERSHIP_PARAPHRASE_RE.some((re) => re.test(seeded)));
});

Deno.test("case 3 — no builder output carries the ownership disclaimer or a close paraphrase", () => {
  for (const intake of sweep()) {
    const text = customerProse(buildDpiaDeliverables(intake));
    for (const re of OWNERSHIP_PARAPHRASE_RE) {
      assertEquals(re.test(text), false, `ownership disclaimer leaked: ${re}`);
    }
  }
});

Deno.test("case 3 — no builder output carries a counsel referral (e6)", () => {
  for (const intake of sweep()) {
    const fails = runFormatChecksGeneric(customerProse(buildDpiaDeliverables(intake)))
      .filter((f) => f.check_id.includes("e6") && !f.passed);
    assertEquals(fails.length, 0, JSON.stringify(fails.slice(0, 3)));
  }
});

// ═════════════════════════════════════ CASE 4 — INTERNAL VOCABULARY

const INTERNAL_VOCAB_RE: readonly RegExp[] = [
  /TEST-STATES?/,
  /\bM[1-9]\b/,
  /\bu[1-9]\b(?!\s*=)/,
  /\bsection_\d/,
  /\b(?:nature_scope_context|existing_safeguards|secondary_uses|legal_basis_proposed|data_subject_rights_mechanisms|processing_activity_name|organization_name|necessity_proportionality|retention_period|transfer_flows|article_9_condition|volume_frequency|risk_register|gap_ledger|processing_inventory|section2_coverage)\b/,
  /\brecord_insufficient\b|\bbasis_supported_on_the_record\b|\bundetermined_on_the_record\b/,
];

function vocabLeaks(built: unknown): string[] {
  const hits: string[] = [];
  for (const l of leaves(built)) {
    if (!isCustomerText(l)) continue;
    for (const re of INTERNAL_VOCAB_RE) {
      const m = l.value.match(re);
      if (m) hits.push(`${l.path} :: ${m[0]}`);
    }
  }
  return [...new Set(hits)];
}

Deno.test("case 4a — seeded defect: a schema field name in customer text is caught", () => {
  const seeded = { section: { narrative: "The record does not populate existing_safeguards for this activity." } };
  assertEquals(vocabLeaks(seeded).length, 1);
});

Deno.test("case 4b — seeded defect: a TEST-STATES token and an M-id are caught", () => {
  const seeded = {
    a: { narrative: "Under TEST-STATES the branch is exercised for the record." },
    b: { narrative: "Marker M4 is applied to this determination for the record." },
  };
  assertEquals(vocabLeaks(seeded).length, 2);
});

Deno.test("case 4 — no internal vocabulary in customer-facing builder text", () => {
  const hits: string[] = [];
  for (const intake of sweep()) hits.push(...vocabLeaks(buildDpiaDeliverables(intake)));
  assertEquals([...new Set(hits)].length, 0, `internal vocabulary leaked:\n${[...new Set(hits)].join("\n")}`);
});

// ═══════════════════════════════════════ CASE 5 — SPELLING REGISTER

/**
 * PINNED LEXICON. British spellings screened for in customer-facing text.
 * A term is SANCTIONED only where the ratified template bytes carry it — that
 * is, where it appears in the verified-authority corpus (statutory quotation
 * such as "data minimisation", "organisational measures", "pseudonymisation").
 * Everything else in the lexicon is a builder-authored British spelling.
 */
const BRITISH_LEXICON: readonly string[] = [
  "anonymisation", "anonymised", "authorised", "behaviour", "behavioural",
  "categorise", "categorised", "centre", "colour", "defence", "emphasise",
  "fulfil", "judgement", "labour", "licence", "minimisation", "modelling",
  "organisation", "organisational", "organise", "prioritise", "programme",
  "pseudonymisation", "pseudonymised", "recognise", "summarise",
  "unauthorised", "utilise", "whilst",
];

/** Ratified template bytes: the verified-authority corpus this product quotes. */
const RATIFIED_CORPUS = (Object.values(DPIA_VERIFIED_AUTHORITIES) as unknown as Bag[])
  .map((r) => String(r.verbatim_quote ?? "")).join(" ").toLowerCase();

const SANCTIONED_BRITISH = new Set(BRITISH_LEXICON.filter((w) => RATIFIED_CORPUS.includes(w)));

function britishHits(built: unknown): string[] {
  const hits: string[] = [];
  for (const l of leaves(built)) {
    if (!isCustomerText(l)) continue;
    const lower = l.value.toLowerCase();
    for (const w of BRITISH_LEXICON) {
      if (SANCTIONED_BRITISH.has(w)) continue;
      if (new RegExp(`\\b${w}\\b`).test(lower)) hits.push(`${w} @ ${l.path}`);
    }
  }
  return [...new Set(hits)];
}

Deno.test("case 5a — seeded defect: an unsanctioned British spelling is caught", () => {
  const seeded = { s: { narrative: "The organisation has not recorded a colour for the register." } };
  assert(britishHits(seeded).length >= 1);
});

Deno.test("case 5b — the sanctioned set is pinned to the ratified corpus", () => {
  assertEquals(
    [...SANCTIONED_BRITISH].sort(),
    ["minimisation", "organisation", "organisational", "pseudonymisation"],
  );
});

Deno.test("case 5 — no unsanctioned British spellings in customer-facing builder text", () => {
  const hits: string[] = [];
  for (const intake of sweep()) hits.push(...britishHits(buildDpiaDeliverables(intake)));
  assertEquals([...new Set(hits)].length, 0, `British spellings:\n${[...new Set(hits)].join("\n")}`);
});

// ═══════════════════════════════════════════ CASE 6 — IRRELEVANCE

/** Every determination the document turns on. */
function determinations(built: Bag): string {
  const arr = (k: string) => (Array.isArray(built[k]) ? built[k] as unknown as Bag[] : []);
  return JSON.stringify({
    decision: built.decision,
    legal_basis: arr("legal_basis").map((f) => [f.status, f.verdict]),
    necessity: arr("necessity_findings").map((f) => [f.status, f.verdict]),
    proportionality: arr("proportionality").map((f) => [f.status, f.verdict]),
    risks: arr("risk_register").map((r) => [r.risk_id, r.likelihood, r.severity, r.inherent_band, r.residual_band]),
    art36: (built.art36_consultation as unknown as Bag)?.status,
  });
}

Deno.test("case 6 — appending an irrelevant sentence to nature_scope_context changes no determination", () => {
  for (const intake of sweep()) {
    const before = determinations(buildDpiaDeliverables(intake) as unknown as Bag);
    const after = determinations(
      buildDpiaDeliverables(mk({
        nature_scope_context:
          `${String(intake.nature_scope_context ?? "")} The office cafeteria serves lunch at noon.`.trim(),
      }, intake)) as unknown as Bag,
    );
    assertEquals(after, before, `determination moved on irrelevant text (${String(intake.legal_basis_proposed)})`);
  }
});

// ══════════════════════════════════════════ CASE 7 — MONOTONICITY

const LIKELIHOOD_ORDER = ["rare", "unlikely", "possible", "likely", "highly likely"];
const rankLikelihood = (v: unknown) => LIKELIHOOD_ORDER.indexOf(String(v ?? "").toLowerCase());

Deno.test("case 7 — adding a safeguard never moves a risk_register likelihood band upward", () => {
  const additions = [
    ["Pseudonymisation at rest"],
    ["Staff training", "Retention schedule enforced"],
    ["Audit logging", "Access reviews", "Vendor due diligence", "Data minimisation review"],
  ];
  for (const intake of sweep()) {
    const base = buildDpiaDeliverables(intake).risk_register as unknown as Bag[];
    for (const extra of additions) {
      const more = buildDpiaDeliverables(mk({
        existing_safeguards: [...(intake.existing_safeguards as string[] ?? []), ...extra],
      }, intake)).risk_register as unknown as Bag[];
      for (const r of base) {
        const m = more.find((x) => x.risk_id === r.risk_id);
        if (!m) continue;
        assert(
          rankLikelihood(m.likelihood) <= rankLikelihood(r.likelihood),
          `${r.risk_id}: ${r.likelihood} → ${m.likelihood} after adding ${extra.join(", ")}`,
        );
      }
    }
  }
});

// ══════════════════════════════ CASE 8 — REDACTION-MONOTONICITY

/** 2 = supported, 1 = undetermined, 0 = record_insufficient. */
const confidence = (f: Bag) =>
  f.verdict === "basis_supported_on_the_record" ? 2 : f.status === "record_insufficient" ? 0 : 1;

const OPTIONAL_FIELDS = [
  "nature_scope_context",
  "volume_frequency",
  "data_subject_rights_mechanisms",
  "retention_period",
  "dpo_info",
  "third_party_processors",
  "existing_safeguards",
  "article_9_condition",
  "description",
  "processor_obligations",
  "security_measures",
];

Deno.test("case 8 — removing an optional intake field never produces a more confident output", () => {
  const rich = mk({
    legal_basis_proposed: "Consent (Art. 6(1)(a))",
    data_subject_rights_mechanisms:
      "Consent is collected at sign-up and can be withdrawn from the preference centre at any time.",
  });
  for (const intake of [rich, mk({}), mk({}, MINIMAL)]) {
    const base = buildDpiaDeliverables(intake);
    for (const field of OPTIONAL_FIELDS) {
      if (!(field in intake)) continue;
      const redacted = buildDpiaDeliverables(
        mk({ [field]: Array.isArray(intake[field]) ? [] : "" }, intake),
      );
      (base.legal_basis as unknown as Bag[]).forEach((f, i) => {
        const r = (redacted.legal_basis as unknown as Bag[])[i];
        if (!r) return;
        assert(
          confidence(r) <= confidence(f),
          `legal_basis grew more confident when ${field} was removed: ${f.verdict} → ${r.verdict}`,
        );
      });
      (base.necessity_findings as unknown as Bag[]).forEach((f, i) => {
        const r = (redacted.necessity_findings as unknown as Bag[])[i];
        if (!r) return;
        assert(
          confidence(r) <= confidence(f),
          `necessity grew more confident when ${field} was removed: ${f.verdict} → ${r.verdict}`,
        );
      });
    }
  }
});

// ═════════════════════════════════════════════ CASE 9 — IDEMPOTENCE

Deno.test("case 9 — attachDpiaDeliverables twice yields byte-identical surfaces", () => {
  for (const intake of sweep()) {
    const report: Bag = { dpia_metadata: { organization: String(intake.organization_name) } };
    attachDpiaDeliverables(report, intake);
    const once = JSON.stringify(report);
    attachDpiaDeliverables(report, intake);
    assertEquals(JSON.stringify(report), once, `attach is not idempotent for ${String(intake.legal_basis_proposed)}`);
  }
});

// ════════════════════════════════════════ CASE 10 — NEGATION HANDLING

const NEGATIONS = [
  "None.",
  "No secondary uses.",
  "No secondary uses; the data is not used beyond triage.",
  "The data is not used for any purpose beyond the primary purpose.",
];

Deno.test("case 10 — a secondary_uses negation produces no secondary operation downstream", () => {
  for (const text of NEGATIONS) {
    const intake = mk({ secondary_uses: text });
    const ops = buildOperations(intake);
    assertEquals(
      ops.some((o) => o.operation_id === "op_secondary"),
      false,
      `op_secondary built from a negation: ${text}`,
    );
    const built = buildDpiaDeliverables(intake);
    assertEquals(
      JSON.stringify(built).includes("op_secondary"),
      false,
      `op_secondary referenced downstream: ${text}`,
    );
    const inventory = (built.processing_inventory as unknown as Bag)?.secondary_uses as unknown as Bag[] | undefined;
    for (const row of inventory ?? []) {
      assertEquals(row.negation, true, `secondary use recorded as real from a negation: ${text}`);
    }
    for (const f of built.legal_basis as unknown as Bag[]) {
      assertEquals(
        /secondary\s+(?:use|purpose)/i.test(JSON.stringify(f.justification ?? "")) &&
          !/no\s+secondary|not\s+used/i.test(String(f.justification ?? "")),
        false,
        `legal_basis asserts a secondary use: ${text}`,
      );
    }
  }
});
