// /all-ptest v2 (DOC 261, 2026-09-14) — GROUNDING PACK BUILDERS.
//
// Pure builders that read the product registries and run the risk engine
// over the golden panel to produce the packs committed under
// supabase/functions/_shared/review/packs/. Used by export-packs.ts (writes
// the files) and by tests/edge/ptest/packs.test.ts (rebuilds in memory and
// asserts the committed files equal the rebuild — drift guard).
//
// This module imports product `_local` trees and therefore lives OUTSIDE
// supabase/functions (scripts/tests only).

import type { BlockCatalogue, BlockCatalogueEntry, RegistryPack } from "../../supabase/functions/_shared/review/packs/types.ts";
import {
  RISK_VERIFIED_AUTHORITY_ROWS,
  RISK_VERIFIED_AUTHORITY_VERSION,
} from "../../supabase/functions/_shared/registry/risk-verified-authorities.ts";
import {
  ADMT_VERIFIED_AUTHORITY_ROWS,
  ADMT_VERIFIED_AUTHORITY_VERSION,
} from "../../supabase/functions/run-admt-checker-v2/_local/registry/admt-verified-authorities.ts";
import {
  CYBER_AUTHORITY_LOCATORS,
  CYBER_VERIFIED_AUTHORITY_VERSION,
} from "../../supabase/functions/run-cppa-cybersecurity/_local/registry/cyber-verified-authorities.ts";
import { SKELETON_SECTIONS, RISK_SKELETON_VERSION } from "../../supabase/functions/run-cppa-risk-assessment-v2/_local/prose/plans/cppa-risk.spine.ts";
import { generateCppaRiskReport } from "../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { CPPA_RISK_GOLDEN, CPPA_RISK_PERFECT } from "../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk.ts";
import { ADMT_PERFECT } from "../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";
import { CYBER_PERFECT } from "../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";
import type { GoldenPanelPack } from "../../supabase/functions/_shared/review/packs/types.ts";

type Bag = Record<string, unknown>;

/** Fixed so a rebuild on any day reproduces the committed file byte for byte. */
export const PACK_GENERATED_ON = "2026-09-14";
/** The date the catalogue's golden runs are stamped with (determinism harness date). */
export const PACK_RUN_DATE = "2026-09-14";

export function buildRiskRegistryPack(): RegistryPack {
  return {
    product: "cppa-risk",
    registry_version: RISK_VERIFIED_AUTHORITY_VERSION,
    generated_on: PACK_GENERATED_ON,
    rows: RISK_VERIFIED_AUTHORITY_ROWS.map((r) => ({
      proposition_key: r.proposition_key,
      citation: r.citation,
      subsection: r.subsection,
      verbatim_quote: r.verbatim_quote,
    })),
  };
}

export function buildAdmtRegistryPack(): RegistryPack {
  return {
    product: "cppa-admt",
    registry_version: ADMT_VERIFIED_AUTHORITY_VERSION,
    generated_on: PACK_GENERATED_ON,
    rows: ADMT_VERIFIED_AUTHORITY_ROWS.map((r) => ({
      proposition_key: r.proposition_key,
      citation: r.citation,
      subsection: r.subsection,
      verbatim_quote: r.verbatim_quote,
    })),
  };
}

export function buildCyberRegistryPack(): RegistryPack {
  return {
    product: "cppa-cyber",
    registry_version: CYBER_VERIFIED_AUTHORITY_VERSION,
    generated_on: PACK_GENERATED_ON,
    rows: CYBER_AUTHORITY_LOCATORS.map((l) => ({
      proposition_key: l.proposition_key,
      citation: l.citation,
      subsection: l.subsection,
      verbatim_quote: null,
      locator: { provision_key: l.provision_key, path: l.path, starts_with: l.starts_with, ends_with: l.ends_with },
    })),
  };
}

interface ProvRow {
  block_key: string | null;
  factor_id: string;
  factor_class: string;
  sources: readonly string[];
  authorities: readonly string[];
}

/** The risk fixtures the catalogue unions over: golden + PERFECT + the batch-ee860fd0 Verilink record. */
export async function riskCatalogueFixtures(): Promise<Array<{ id: string; intake: Bag }>> {
  const out: Array<{ id: string; intake: Bag }> = [
    ...CPPA_RISK_GOLDEN.map((c) => ({ id: c.id, intake: c.intake as Bag })),
    ...CPPA_RISK_PERFECT.map((c) => ({ id: c.id, intake: c.intake as Bag })),
  ];
  try {
    const verilink = JSON.parse(
      await Deno.readTextFile(new URL("../../tests/edge/fixtures/batch-ee860fd0/verilink.json", import.meta.url)),
    ) as Bag;
    out.push({ id: "batch-ee860fd0-verilink", intake: verilink });
  } catch { /* fixture optional */ }
  return out;
}

export async function buildRiskBlockCatalogue(): Promise<BlockCatalogue> {
  const fixtures = await riskCatalogueFixtures();
  const observed = new Map<string, { factor_ids: Set<string>; sources: Set<string>; authorities: Set<string> }>();
  const bucket = (key: string) => {
    let b = observed.get(key);
    if (!b) { b = { factor_ids: new Set(), sources: new Set(), authorities: new Set() }; observed.set(key, b); }
    return b;
  };
  for (const f of fixtures) {
    const gen = await generateCppaRiskReport(f.intake, {
      buildStamp: "ptest-packs", runId: `packs:${f.id}`, mode: "enforce",
      pass1: "deterministic", pass2rEnabled: false, refinementEnabled: false, euCorpus: [], reportDate: PACK_RUN_DATE,
    });
    const rows = (((gen.report._meta as Bag | undefined)?.internal as Bag | undefined)?.factor_provenance ?? []) as ProvRow[];
    for (const r of rows) {
      if (!r.block_key) continue;
      const b = bucket(r.block_key);
      b.factor_ids.add(r.factor_id);
      for (const s of r.sources) b.sources.add(s);
      for (const a of r.authorities) b.authorities.add(a);
    }
  }
  const entries: BlockCatalogueEntry[] = [];
  for (const s of SKELETON_SECTIONS) {
    s.blocks.forEach((b, i) => {
      const key = `${s.id}:${i}`;
      const o = observed.get(key);
      entries.push({
        block_key: key,
        section_id: s.id,
        section_title: s.title,
        kind: b.kind,
        fixed_text_prefix: b.kind === "skeleton" ? b.text.replace(/\s+/g, " ").trim().slice(0, 160) : null,
        factor_ids: o ? [...o.factor_ids].sort() : [],
        sources: o ? [...o.sources].sort() : [],
        authorities: o ? [...o.authorities].sort() : [],
      });
    });
  }
  // Engine keys that render but sit outside the spine's block list (should be
  // none; listed so drift is visible rather than silent).
  for (const key of [...observed.keys()].sort()) {
    if (entries.some((e) => e.block_key === key)) continue;
    const o = observed.get(key)!;
    entries.push({
      block_key: key, section_id: key.split(":")[0], section_title: "(not in spine)", kind: "engine-only",
      fixed_text_prefix: null, factor_ids: [...o.factor_ids].sort(), sources: [...o.sources].sort(), authorities: [...o.authorities].sort(),
    });
  }
  return {
    product: "cppa-risk",
    spine_version: RISK_SKELETON_VERSION,
    generated_on: PACK_GENERATED_ON,
    generated_from: fixtures.map((f) => f.id),
    entries,
  };
}

// ── ADMT and Cyber block catalogues (Rev 2 §0A V2 / §3.3) ───────────────────
//
// Neither engine records per-block provenance yet, so their catalogues are
// built from the RENDERED documents: every block key the spine can emit, its
// kind, the fixed text prefix, and the 11 CCR / Civil Code citations observed
// IN THE BLOCK'S OWN TEXT across the golden panel. `factor_ids` and `sources`
// stay empty (there is no engine trace to read); W-LAW binds on the observed
// citations. When an engine gains provenance, this builder is replaced by the
// risk-style one and the drift test forces the pack to be rebuilt.

import { CPPA_ADMT_GOLDEN } from "../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";
import { CPPA_CYBER_GOLDEN } from "../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";
import { computeAdmtV2 } from "../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document, ADMT_V2_SPINE_VERSION } from "../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { gatherCitations } from "../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-citations.ts";
import { vaRegistryAsProvisions } from "../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-corpus.ts";
import { buildAuthorityExhibit } from "../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";
import { buildCyberDeliverables } from "../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { buildCyberComponentRecommendations, buildCyberNextSteps } from "../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { assembleCyberSkeletonDocumentV4, CYBER_V4_ASSEMBLER_STAMP } from "../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { extractBlocks } from "../../supabase/functions/_shared/review/document-blocks.ts";

const CITE_RE = /11\s?CCR\s?§§?\s?\d{4}(?:\([a-z0-9A-Z]{1,3}\))*|(?<!\d)§§?\s?7\d{3}(?:\([a-z0-9A-Z]{1,3}\))*|Cal\.\s?Civ\.\s?Code\s?§§?\s?\d{4}(?:\.\d+)?(?:\([a-z0-9A-Z]{1,3}\))*/g;

function textCatalogue(
  product: "cppa-admt" | "cppa-cyber",
  spineVersion: string,
  docs: Array<{ id: string; report: Bag }>,
): BlockCatalogue {
  const observed = new Map<string, { section_id: string; section_title: string; kind: string; fixed: string | null; cites: Set<string>; order: number }>();
  let order = 0;
  for (const d of docs) {
    for (const b of extractBlocks(d.report)) {
      let e = observed.get(b.key);
      if (!e) {
        e = { section_id: b.section_id, section_title: b.section_title, kind: b.kind, fixed: b.kind === "skeleton" ? b.text.replace(/\s+/g, " ").slice(0, 160) : null, cites: new Set(), order: order++ };
        observed.set(b.key, e);
      }
      for (const m of b.text.matchAll(CITE_RE)) e.cites.add(m[0].replace(/\s+/g, " ").trim());
    }
  }
  const entries: BlockCatalogueEntry[] = [...observed.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, e]) => ({
      block_key: key, section_id: e.section_id, section_title: e.section_title, kind: e.kind,
      fixed_text_prefix: e.fixed, factor_ids: [], sources: [], authorities: [...e.cites].sort(),
    }));
  return { product, spine_version: spineVersion, generated_on: PACK_GENERATED_ON, generated_from: docs.map((d) => d.id), entries };
}

export function buildAdmtBlockCatalogue(): BlockCatalogue {
  const docs = [...CPPA_ADMT_GOLDEN, ...ADMT_PERFECT].map((c) => {
    const intake = c.intake as Bag;
    const computed = computeAdmtV2(intake);
    const citations = gatherCitations(computed.allFindings.map((f) => f.authority).filter(Boolean));
    const exhibit = buildAuthorityExhibit(citations, vaRegistryAsProvisions());
    const skeleton = assembleAdmtV2Document({
      intake, computed, exhibit,
      organizationName: String(intake.organization_name ?? "").trim(), systemName: String(intake.system_name ?? "").trim(),
    });
    return { id: c.id, report: { skeleton_document: skeleton } as Bag };
  });
  return textCatalogue("cppa-admt", ADMT_V2_SPINE_VERSION, docs);
}

export function buildCyberBlockCatalogue(): BlockCatalogue {
  const docs = [...CPPA_CYBER_GOLDEN, ...CYBER_PERFECT].map((c) => {
    const intake = c.intake as Bag;
    const d = buildCyberDeliverables(intake);
    const recommendations = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, [], PACK_RUN_DATE);
    const nextSteps = buildCyberNextSteps(recommendations, String(((intake.profile ?? {}) as Bag).remediation_owner ?? ""));
    const report: Bag = { ...(d as unknown as Bag), authority_exhibit: { entries: [] }, _meta: { internal: { cyber_recommendations: { recommendations, next_steps: nextSteps } } } };
    const sk = assembleCyberSkeletonDocumentV4(report, intake, "", PACK_RUN_DATE);
    return { id: c.id, report: { skeleton_document: sk.document } as Bag };
  });
  return textCatalogue("cppa-cyber", CYBER_V4_ASSEMBLER_STAMP, docs);
}

/** The golden panel seed: the *_PERFECT cases of the three CPPA products (Rev 2 §0A V7). */
export function buildGoldenPanelPack(): GoldenPanelPack {
  const entry = (product: GoldenPanelPack["entries"][number]["product"], c: { id: string; intake: Record<string, unknown> }) => ({
    product, ref: c.id, label: c.id, intake_data: c.intake,
  });
  return {
    generated_on: PACK_GENERATED_ON,
    entries: [
      ...CPPA_RISK_PERFECT.map((c) => entry("cppa-risk", c)),
      ...ADMT_PERFECT.map((c) => entry("cppa-admt", c)),
      ...CYBER_PERFECT.map((c) => entry("cppa-cyber", c)),
    ],
  };
}

/** Serialise a pack as a committed `.ts` module. */
export function packModuleSource(exportName: string, typeName: string, value: unknown): string {
  return [
    "// GENERATED by scripts/ptest/export-packs.ts (DOC 261) — do not edit by hand.",
    "// Rebuild: deno run --allow-read --allow-write --allow-env scripts/ptest/export-packs.ts",
    "// Drift guard: tests/edge/ptest/packs.test.ts",
    `import type { ${typeName} } from "./types.ts";`,
    "",
    `export const ${exportName}: ${typeName} = ${JSON.stringify(value, null, 2)};`,
    "",
  ].join("\n");
}
