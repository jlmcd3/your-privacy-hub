// DOC 189 (2026-09-05) — relevance-ranked persuasive authority (Ask 2).
//
// Pins: every LIA AP row carries a relevance profile in the map's own
// vocabularies; the shared scorer's weights, tiers, instrument gating,
// zero-score exclusion, dedupe and ordering; the LIA query built from typed
// states; the template relevance sentence on every rendered entry; and the
// determinism of the whole composition.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { LIA_CORPUS_MAP, LIA_FACTOR_VOCABULARY } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-corpus-map.ts";
import {
  LIA_FACTOR_ELEMENT,
  LIA_RELEVANCE_PROFILES,
  liaElementOf,
  liaProfileOf,
} from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-relevance-profiles.ts";
import {
  rankByRelevance,
  RELEVANCE_WEIGHTS,
  relevanceTier,
  scoreRelevance,
  type RelevanceQuery,
} from "../../../supabase/functions/_shared/corpus/cam-relevance.ts";
import type { CamRelevanceProfile, CamRow } from "../../../supabase/functions/_shared/corpus/cam-types.ts";
import { USE_CASE_LABELS } from "../../../supabase/functions/_shared/lia/lia-use-case-classifier.ts";
import { DATA_CATEGORIES } from "../../../src/pages/LIAssessment.enums.ts";
import {
  buildLiaPersuasiveAuthority,
  buildLiaRelevanceQuery,
  LIA_PERSUASIVE_AUTHORITY_LIMIT,
  liaInstrumentOf,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-persuasive-authority.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { buildThreePartTestTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { assembleLiaSkeletonDocument } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";

type Bag = Record<string, unknown>;

const AP_ROWS = LIA_CORPUS_MAP.rows.filter((r) => r.role === "AP");
const VOCAB = new Set<string>(LIA_FACTOR_VOCABULARY as readonly string[]);
const CLASSES = new Set(Object.keys(USE_CASE_LABELS).filter((k) => k !== "other"));
const CATS = new Set<string>(DATA_CATEGORIES);
const FLAGS = new Set([
  "special_category", "children", "eprivacy_terminal_equipment", "electronic_marketing",
  "public_authority", "large_scale", "automated_decision",
]);

function typedReportFor(intake: Bag): Bag {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  return report;
}

// ── Profiles ─────────────────────────────────────────────────────────────────

Deno.test("doc189 — every LIA AP row has a relevance profile; no profile is orphaned", () => {
  for (const r of AP_ROWS) {
    assert(liaProfileOf(r), `AP row ${r.id} has no relevance profile — author one in lia-relevance-profiles.ts`);
  }
  const ids = new Set(AP_ROWS.map((r) => r.id));
  for (const id of Object.keys(LIA_RELEVANCE_PROFILES)) {
    assert(ids.has(id), `profile ${id} names no AP row in the map`);
  }
  assertEquals(Object.keys(LIA_RELEVANCE_PROFILES).length, AP_ROWS.length);
});

Deno.test("doc189 — profiles speak the map's vocabularies (factors, classes, data categories, flags)", () => {
  for (const r of AP_ROWS) {
    const p = liaProfileOf(r)!;
    assert(p.factor_ids.length > 0, `${r.id}: factor_ids empty`);
    assert(p.factor_ids.includes(r.factor_id), `${r.id}: the row's own factor must be among the profile's factor_ids`);
    for (const f of p.factor_ids) assert(VOCAB.has(f), `${r.id}: factor "${f}" not in LIA_FACTOR_VOCABULARY`);
    if (p.use_case_class !== null) assert(CLASSES.has(p.use_case_class), `${r.id}: class "${p.use_case_class}" unknown`);
    for (const c of p.data_categories) assert(CATS.has(c), `${r.id}: data category "${c}" not in DATA_CATEGORIES`);
    for (const fl of p.flags) assert(FLAGS.has(fl), `${r.id}: flag "${fl}" unknown`);
    assert(/^[A-Z]{2}$/.test(p.country), `${r.id}: country must be ISO-2`);
    assert(["EU GDPR", "UK GDPR", "EU GDPR (pre-2021 UK)"].includes(p.instrument));
  }
});

Deno.test("doc189 — sibling rows on one source share one profile; the profile's country matches the citation", () => {
  const bySource = new Map<string, CamRelevanceProfile>();
  for (const r of AP_ROWS) {
    const p = liaProfileOf(r)!;
    const prior = bySource.get(r.source_row_id);
    if (prior) assertEquals(p, prior, `${r.id} disagrees with its sibling on source ${r.source_row_id}`);
    bySource.set(r.source_row_id, p);
    const jur = r.citation_source?.jurisdiction ?? "";
    const expected: Record<string, string> = { Ireland: "IE", France: "FR", Spain: "ES", Romania: "RO", Poland: "PL" };
    if (expected[jur]) assertEquals(p.country, expected[jur], `${r.id}: country vs citation jurisdiction`);
  }
});

Deno.test("doc189 — the factor→element map covers every non-gate factor and only the vocabulary", () => {
  for (const f of Object.keys(LIA_FACTOR_ELEMENT)) assert(VOCAB.has(f), `element map names "${f}" outside the vocabulary`);
  assertEquals(liaElementOf("Special-category and ePrivacy interplay"), null);
  assertEquals(liaElementOf("Necessity and less-intrusive means"), "necessity");
  assertEquals(liaElementOf("Interest legitimacy"), "purpose");
  assertEquals(liaElementOf("Reasonable expectations of the data subject"), "balancing");
});

// ── The scorer (doc 189 §2.4, CEO-approved weights and tiers) ────────────────

const EMPLOYEE_MONITORING: CamRelevanceProfile = {
  country: "FR", instrument: "EU GDPR",
  factor_ids: ["Necessity and less-intrusive means", "Balancing of interests, rights and freedoms", "Potential harms and severity"],
  use_case_class: "employee_monitoring", outcome_posture: "rejected",
  relationship: "employee", data_categories: ["Employment data", "Location data"], flags: ["large_scale"],
};

const query = (over: Partial<RelevanceQuery> = {}): RelevanceQuery => ({
  instrument: "EU GDPR",
  use_case_class: null,
  live_factor_ids: new Set(),
  passing_factor_ids: new Set(),
  relationship: null,
  data_categories: new Set(),
  flags: new Set(),
  ...over,
});

Deno.test("doc189 — the CEO's example: same class + two live elements = 3 + 4 = 7, highly relevant", () => {
  const q = query({
    use_case_class: "employee_monitoring",
    live_factor_ids: new Set(["Necessity and less-intrusive means", "Balancing of interests, rights and freedoms", "Potential harms and severity"]),
  });
  const { score, match } = scoreRelevance(EMPLOYEE_MONITORING, q, liaElementOf, false);
  assertEquals(score, 7);
  assertEquals(relevanceTier(score), "highly relevant");
  assertEquals(match.class_matched, true);
  assertEquals([...match.live_elements].sort(), ["balancing", "necessity"]);
});

Deno.test("doc189 — weights: passing element +1, relationship +1, categories +1 each capped at two, flags +1", () => {
  const q = query({
    passing_factor_ids: new Set(["Necessity and less-intrusive means"]),
    relationship: "employee",
    data_categories: new Set(["Employment data", "Location data", "Device/technical data"]),
    flags: new Set(["large_scale", "children"]),
  });
  const { score, match } = scoreRelevance(EMPLOYEE_MONITORING, q, liaElementOf, false);
  // necessity passing (1) + relationship (1) + two categories (2, third would exceed the cap) + large_scale (1)
  assertEquals(score, 5);
  assertEquals(relevanceTier(score), "relevant");
  assertEquals(match.passing_elements, ["necessity"]);
  assertEquals(match.data_categories.length, 2);
  assertEquals(match.flags, ["large_scale"]);
  assertEquals(RELEVANCE_WEIGHTS.data_category_cap, 2);
});

Deno.test("doc189 — one element counts once however many of its factors the authority bears on; live outranks passing", () => {
  const p: CamRelevanceProfile = {
    ...EMPLOYEE_MONITORING,
    factor_ids: ["Reasonable expectations of the data subject", "Relationship with the individual", "Potential harms and severity"],
  };
  const q = query({
    live_factor_ids: new Set(["Reasonable expectations of the data subject"]),
    passing_factor_ids: new Set(["Relationship with the individual", "Potential harms and severity"]),
  });
  const { score, match } = scoreRelevance(p, q, liaElementOf, false);
  assertEquals(score, 2, "balancing is one element: live (+2), not live + passing");
  assertEquals(match.live_elements, ["balancing"]);
  assertEquals(match.passing_elements, []);
});

Deno.test("doc189 — tiers: ≥6 highly relevant, 3–5 relevant, 1–2 context, 0 not rendered", () => {
  assertEquals(relevanceTier(0), null);
  assertEquals(relevanceTier(1), "context");
  assertEquals(relevanceTier(2), "context");
  assertEquals(relevanceTier(3), "relevant");
  assertEquals(relevanceTier(5), "relevant");
  assertEquals(relevanceTier(6), "highly relevant");
});

const row = (id: string, src: string, profile: CamRelevanceProfile, date: string, live = true): CamRow => ({
  id, factor_id: profile.factor_ids[0], role: "AP", source_table: "enforcement_actions", source_row_id: src,
  excerpt_field: "key_compliance_failure", pinned_excerpt: "", render_eligible: live,
  ...(live
    ? {
      render_surface: "S5" as const, purpose_class: "authority" as const, render_when: ["assessment_rendered"],
      display: { matter: `M ${id}`, what_happened: "W.", bearing: "B.", authority_label: `L ${id}`, trail_cite: "T" },
      citation_source: { regulator: "R", subject: "S", jurisdiction: "France", decision_date: date },
    }
    : {}),
  direction: "limits", logic_bearing: false,
  provenance: { verified_on: "2026-09-05" }, curation_note: "test",
});

Deno.test("doc189 — ranking: zero scores drop, dark rows never rank, dedupe by source keeps the best, ties by newer date then map order", () => {
  const A: CamRelevanceProfile = { ...EMPLOYEE_MONITORING, use_case_class: "fraud_prevention" };
  const B: CamRelevanceProfile = { ...EMPLOYEE_MONITORING, use_case_class: null, factor_ids: ["Interest legitimacy"] };
  const rows = [
    row("t/a1", "srcA", A, "2021-01-01"),           // class match → 3
    row("t/a2", "srcA", A, "2021-01-01"),           // same source, same score → deduped
    row("t/b1", "srcB", B, "2020-01-01"),           // purpose passing → 1
    row("t/c1", "srcC", B, "2023-01-01"),           // purpose passing → 1, newer → before b1
    row("t/d1", "srcD", { ...B, factor_ids: ["Children's data"] }, "2024-01-01"), // no match → 0 → dropped
    row("t/e1", "srcE", A, "2025-01-01", false),    // dark → never ranks
  ];
  const q = query({ use_case_class: "fraud_prevention", passing_factor_ids: new Set(["Interest legitimacy"]) });
  const profiles = new Map(rows.map((r) => [r.id, r.id === "t/a1" || r.id === "t/a2" || r.id === "t/e1" ? A : r.id === "t/d1" ? { ...B, factor_ids: ["Children's data"] } : B]));
  const ranked = rankByRelevance(rows, q, { profileOf: (r) => profiles.get(r.id), elementOf: liaElementOf });
  assertEquals(ranked.map((s) => s.row.id), ["t/a1", "t/c1", "t/b1"]);
  assertEquals(ranked.map((s) => s.score), [3, 1, 1]);
  const limited = rankByRelevance(rows, q, { profileOf: (r) => profiles.get(r.id), elementOf: liaElementOf, limit: 2 });
  assertEquals(limited.length, 2);
});

Deno.test("doc189 — instrument gating: a UK record over an EU-only pool is served cross-instrument and labelled; a UK row would exclude the EU ones", () => {
  const eu = row("t/eu", "srcEU", EMPLOYEE_MONITORING, "2023-01-01");
  const q = query({ instrument: "UK GDPR", use_case_class: "employee_monitoring" });
  const cross = rankByRelevance([eu], q, { profileOf: () => EMPLOYEE_MONITORING, elementOf: liaElementOf });
  assertEquals(cross.length, 1);
  assertEquals(cross[0].match.cross_instrument, true);
  const uk = row("t/uk", "srcUK", { ...EMPLOYEE_MONITORING, instrument: "UK GDPR", country: "GB" }, "2022-01-01");
  const profiles = new Map<string, CamRelevanceProfile>([["t/eu", EMPLOYEE_MONITORING], ["t/uk", { ...EMPLOYEE_MONITORING, instrument: "UK GDPR", country: "GB" }]]);
  const gated = rankByRelevance([eu, uk], q, { profileOf: (r) => profiles.get(r.id), elementOf: liaElementOf });
  assertEquals(gated.map((s) => s.row.id), ["t/uk"]);
  assertEquals(gated[0].match.cross_instrument, false);
});

// ── The LIA query from typed states ──────────────────────────────────────────

Deno.test("doc189 — the LIA query reads the typed verdicts, the class, the relationship and the closed-list facts", () => {
  const intake = LIA_PERFECT_PINNED[0].intake as Bag;
  const report = typedReportFor(intake);
  const q = buildLiaRelevanceQuery(report, intake);
  assertEquals(q.instrument, "EU GDPR");
  assertEquals(q.use_case_class, "product_improvement");
  assertEquals(q.relationship, "customer");
  assert(q.data_categories.has("Device/technical data"));
  assert(q.data_categories.has("Contact data"));
  // The perfect fixture passes purpose and necessity: those factors are passing, never live.
  assert(q.passing_factor_ids.has("Interest legitimacy"));
  assert(q.passing_factor_ids.has("Necessity and less-intrusive means"));
  assert(!q.live_factor_ids.has("Interest legitimacy"));
  // Gate/overlay factors never enter either set.
  assert(!q.passing_factor_ids.has("Special-category and ePrivacy interplay"));
  assert(!q.live_factor_ids.has("Special-category and ePrivacy interplay"));
  assert(!q.flags.has("special_category"));
});

Deno.test("doc189 — instrument: EU where the EU is recorded (dual records included), UK where the UK stands alone", () => {
  assertEquals(liaInstrumentOf({ jurisdictions: ["EU (GDPR)"] }), "EU GDPR");
  assertEquals(liaInstrumentOf({ jurisdictions: ["United Kingdom (UK GDPR)", "EU (GDPR)"] }), "EU GDPR");
  assertEquals(liaInstrumentOf({ jurisdictions: ["United Kingdom (UK GDPR)"] }), "UK GDPR");
  assertEquals(liaInstrumentOf({}), "EU GDPR");
});

// ── The rendered section ─────────────────────────────────────────────────────

Deno.test("doc189 — every rendered AP entry closes with the template relevance sentence; LinkedIn ranks first on the perfect fixture", () => {
  const intake = LIA_PERFECT_PINNED[0].intake as Bag;
  const report = typedReportFor(intake);
  const res = buildLiaPersuasiveAuthority(report, false, { intake });
  assert(res.ranked.length > 0 && res.ranked.length <= LIA_PERSUASIVE_AUTHORITY_LIMIT);
  assertEquals(res.ranked[0].row_id, "lia/f04-balancing/ap-01", "LinkedIn: two passing elements + customer + two categories");
  assertEquals(res.ranked[0].score, 5);
  assertEquals(res.ranked[0].tier, "relevant");
  for (const r of res.ranked) assert(r.score >= 1 && !r.cross_instrument);
  const paragraphs = res.body.split("\n\n").slice(1); // drop the lead
  const apParagraphs = paragraphs.filter((p) => p.includes("— persuasive authority."));
  assertEquals(apParagraphs.length, res.ranked.length);
  for (const p of apParagraphs) {
    assert(/Relevance \((highly relevant|relevant|context)\): .*; decided under the EU GDPR\.$/.test(p), p.slice(-200));
  }
  assertStringIncludes(res.body, "Relevance (relevant): bears on purpose and balancing; the same customer relationship; shared data categories (Device/technical data, Contact data); decided under the EU GDPR.");
});

Deno.test("doc189 — a UK-only record is served cross-instrument and the sentence says so", () => {
  const base = LIA_PERFECT_PINNED[0].intake as Bag;
  const intake = { ...base, jurisdictions: ["United Kingdom (UK GDPR)"] };
  const report = typedReportFor(intake);
  const res = buildLiaPersuasiveAuthority(report, false, { intake });
  assert(res.ranked.length > 0);
  assert(res.ranked.every((r) => r.cross_instrument));
  assertStringIncludes(res.body, "offered as cross-instrument context because no UK GDPR authority is yet in the corpus");
});

Deno.test("doc189 — an employee-monitoring record leaves balancing open: Amazon's precedent entry still renders beside the ranked rows, deduped", () => {
  const base = LIA_PERFECT_PINNED[0].intake as Bag;
  const intake = {
    ...base,
    processing_description: "We monitor warehouse employees' scanner activity and idle time to manage staff productivity.",
    relationship_type: "Employee",
    balancing_details: { ...(base.balancing_details as Bag), relationship_category: "Employee" },
  };
  const report = typedReportFor(intake);
  const res = buildLiaPersuasiveAuthority(report, false, { intake });
  const sources = res.body.split("\n\n").filter((p) => p.includes("— persuasive authority."));
  const labels = res.ledger;
  assertEquals(new Set(labels).size, labels.length, "no authority is listed twice");
  assert(sources.length >= res.ranked.length);
});

Deno.test("doc189 — deterministic: identical input, identical section; the assembler passes the record through", () => {
  const intake = LIA_PERFECT_PINNED[0].intake as Bag;
  const report = typedReportFor(intake);
  assertEquals(
    buildLiaPersuasiveAuthority(report, false, { intake }),
    buildLiaPersuasiveAuthority(report, false, { intake }),
  );
  const sk = assembleLiaSkeletonDocument(report, intake, { deterministic: true });
  const text = skeletonDocumentToText(sk.document);
  assertStringIncludes(text, "Relevance (relevant): bears on purpose and balancing; the same customer relationship");
  // Without the record the query still builds (no relationship / category matches).
  const bare = buildLiaPersuasiveAuthority(report, false);
  assert(bare.ranked.length > 0);
  assert(bare.ranked[0].score <= res0(report, intake));
});

function res0(report: Bag, intake: Bag): number {
  return buildLiaPersuasiveAuthority(report, false, { intake }).ranked[0].score;
}
