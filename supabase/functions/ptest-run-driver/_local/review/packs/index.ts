// /all-ptest v2 (DOC 261, 2026-09-14) — GROUNDING PACK ACCESS + PROMPT TEXT.
//
// Deployable from `_shared`: imports only the generated pack modules beside
// it, never a product's `_local` tree. The text renderers here produce the
// STATIC system-block strings (prompt-cache law — nothing per-document).

import type { BlockCatalogue, GoldenPanelPack, RegistryPack, RegistryPackRow } from "./types.ts";
import { RISK_REGISTRY_PACK } from "./risk-registry.pack.ts";
import { ADMT_REGISTRY_PACK } from "./admt-registry.pack.ts";
import { CYBER_REGISTRY_PACK } from "./cyber-registry.pack.ts";
import { DPIA_REGISTRY_PACK } from "./dpia-registry.pack.ts";
import { LIA_REGISTRY_PACK } from "./lia-registry.pack.ts";
import { GOVERNANCE_REGISTRY_PACK } from "./governance-registry.pack.ts";
import { RISK_BLOCK_CATALOGUE } from "./risk-block-catalogue.pack.ts";
import { ADMT_BLOCK_CATALOGUE } from "./admt-block-catalogue.pack.ts";
import { CYBER_BLOCK_CATALOGUE } from "./cyber-block-catalogue.pack.ts";
import { GOLDEN_PANEL_PACK } from "./golden-panel.pack.ts";

export type { BlockCatalogue, BlockCatalogueEntry, GoldenPanelPack, RegistryPack, RegistryPackRow } from "./types.ts";

export const GOLDEN_PANEL: GoldenPanelPack = GOLDEN_PANEL_PACK;

export const REGISTRY_PACKS: Readonly<Record<string, RegistryPack>> = {
  "cppa-risk": RISK_REGISTRY_PACK,
  "cppa-admt": ADMT_REGISTRY_PACK,
  "cppa-cyber": CYBER_REGISTRY_PACK,
  // doc 263 run 1 (2026-09-17) — the GDPR products, built from their own registries.
  "dpia": DPIA_REGISTRY_PACK,
  "lia": LIA_REGISTRY_PACK,
  "governance": GOVERNANCE_REGISTRY_PACK,
};

export const BLOCK_CATALOGUES: Readonly<Record<string, BlockCatalogue>> = {
  "cppa-risk": RISK_BLOCK_CATALOGUE,
  // ADMT and Cyber: built from the rendered documents (citations observed in
  // each block's text); no engine provenance yet — see scripts/ptest/build-packs.ts.
  "cppa-admt": ADMT_BLOCK_CATALOGUE,
  "cppa-cyber": CYBER_BLOCK_CATALOGUE,
};

export function registryPackFor(product: string): RegistryPack | null {
  return REGISTRY_PACKS[product] ?? null;
}

export function blockCatalogueFor(product: string): BlockCatalogue | null {
  return BLOCK_CATALOGUES[product] ?? null;
}

/**
 * Hydrate a locator pack (cyber) with verbatim text cut from the approved
 * corpus excerpts, keyed by provision key — the same cut the product makes.
 * Rows whose locator does not match stay null and are reported.
 */
export function hydrateLocatorPack(
  pack: RegistryPack,
  excerptsByProvision: Readonly<Record<string, string | null | undefined>>,
): { pack: RegistryPack; unresolved: string[] } {
  const unresolved: string[] = [];
  const rows = pack.rows.map((r) => {
    if (r.verbatim_quote !== null || !r.locator) return r;
    const excerpt = excerptsByProvision[r.locator.provision_key];
    const sub = excerpt ? textAtPath(excerpt, r.locator.path) : null;
    const cut = sub ? cutQuote(sub, r.locator.starts_with, r.locator.ends_with) : null;
    if (!cut) { unresolved.push(r.proposition_key); return r; }
    return { ...r, verbatim_quote: cut };
  });
  return { pack: { ...pack, rows }, unresolved };
}

// Locator helpers — VERBATIM mirrors of cyber-verified-authorities.ts
// (normalizeCorpusText / topSubsections / numberedChild / textAtPath /
// cutQuote), copied here because that module lives in the product's `_local`
// tree. tests/edge/ptest/packs.test.ts pins the two behaviours together.

function normalizeCorpusText(s: string): string {
  return String(s ?? "")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/ /g, " ")
    .replace(/[\s\f]+/g, " ")
    .trim();
}

/** Top-level "(a)"-style subsections of a provision's verbatim excerpt. */
function topSubsections(text: string): Map<string, string> {
  const out = new Map<string, string>();
  let label: string | null = null;
  let buf: string[] = [];
  for (const raw of String(text ?? "").replace(/\f/g, "").split("\n")) {
    const m = /^\(([a-z])\)[ \t]*(.*)$/.exec(raw);
    if (m) {
      if (label) out.set(label, buf.join("\n"));
      label = m[1];
      buf = [m[2]];
    } else if (label) {
      buf.push(raw);
    }
  }
  if (label) out.set(label, buf.join("\n"));
  return out;
}

/** The n-th numbered child "(n)" of a subsection block. */
function numberedChild(block: string, n: number): string | null {
  const start = new RegExp(`(?:^|\\n)[ \\t\\f]*\\(${n}\\)[ \\t]+`, "g").exec(block);
  if (!start) return null;
  const from = start.index + start[0].length;
  const nextRe = new RegExp(`(?:^|\\n)[ \\t\\f]*\\(${n + 1}\\)[ \\t]+`, "g");
  nextRe.lastIndex = from;
  const next = nextRe.exec(block);
  return block.slice(from, next ? next.index : undefined);
}

/** Resolve a "a" / "c(17)" path to its normalized corpus text. */
export function textAtPath(excerpt: string, path: string): string | null {
  const m = /^([a-z])(?:\((\d+)\))?$/.exec(path);
  if (!m) return null;
  const subs = topSubsections(excerpt);
  let block = subs.get(m[1]);
  if (block == null) return null;
  if (m[2]) {
    const child = numberedChild(block, Number(m[2]));
    if (child == null) return null;
    block = child;
  }
  return normalizeCorpusText(block);
}

/** Cut the located quote out of a subsection's normalized text. */
export function cutQuote(subsectionText: string, startsWith: string, endsWith: string): string | null {
  const start = subsectionText.indexOf(startsWith);
  if (start < 0) return null;
  const endIdx = subsectionText.indexOf(endsWith, start);
  if (endIdx < 0) return null;
  return subsectionText.slice(start, endIdx + endsWith.length);
}

// ── Prompt text (static) ────────────────────────────────────────────────────

export function renderRegistryPackText(pack: RegistryPack): string {
  const lines: string[] = [
    `REGISTRY PACK — ${pack.product} (${pack.registry_version}). Every legal statement in the document must rest on one of these rows. Cite rows by ROW ID only.`,
    "",
  ];
  for (const r of pack.rows) {
    const quote = r.verbatim_quote === null ? "(text supplied at review time from the approved corpus row)" : `"${r.verbatim_quote}"`;
    lines.push(`ROW ${r.proposition_key} | ${r.subsection} | ${quote}`);
  }
  return lines.join("\n");
}

export function renderBlockCatalogueText(cat: BlockCatalogue): string {
  const provenanceBacked = cat.entries.some((e) => e.factor_ids.length > 0);
  const lines: string[] = [
    provenanceBacked
      ? `BLOCK CATALOGUE — ${cat.product} (${cat.spine_version}). Every paragraph and table in the document carries a block key (section:index). Fixed prose is the spine's own text; generated blocks are composed by the deterministic engine from the intake keys and cite the authorities listed.`
      : `BLOCK CATALOGUE — ${cat.product} (${cat.spine_version}). Every paragraph and table in the document carries a block key (section:index). Fixed prose is the spine's own text. This product's engine records no per-block provenance yet: "cites" lists the authorities observed in each block's own text across the golden panel — treat a generated block as BOUND to those citations and as UNBOUND when none is listed.`,
    "",
  ];
  let section = "";
  for (const e of cat.entries) {
    if (e.section_id !== section) {
      section = e.section_id;
      lines.push(`# ${e.section_id} — ${e.section_title}`);
    }
    const parts = [`${e.block_key} [${e.kind}]`];
    if (e.fixed_text_prefix) parts.push(`fixed: "${e.fixed_text_prefix}"`);
    if (e.factor_ids.length) parts.push(`factors: ${e.factor_ids.join(", ")}`);
    if (e.sources.length) parts.push(`reads: ${e.sources.join(", ")}`);
    if (e.authorities.length) parts.push(`cites: ${e.authorities.join("; ")}`);
    lines.push(parts.join(" | "));
  }
  return lines.join("\n");
}

/** Row lookup for the validator (Stage 3). */
export function registryRowById(pack: RegistryPack, id: string): RegistryPackRow | null {
  const key = id.trim();
  return pack.rows.find((r) => r.proposition_key === key) ?? null;
}
