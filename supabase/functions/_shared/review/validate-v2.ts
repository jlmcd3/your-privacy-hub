// /all-ptest v2 (DOC 261, 2026-09-14) — STAGE 3: DETERMINISTIC VALIDATION OF
// WORKER FINDINGS.
//
// A finding survives only if (doc 261 §2, Stage 3):
//   * its quote is locatable in the document (the existing quote law);
//   * its block key exists in the rendered document — and the quote sits in
//     that block (otherwise the finding is RE-ANCHORED to the block that does
//     contain it, and marked so);
//   * W-RECORD: the intake key exists in the intake, and the intake value the
//     worker reports equals the stored value;
//   * W-LAW: the registry row exists and the registry quote is a verbatim
//     substring of that row's text;
//   * W-REASON: both quotes locate.
//
// Dropped findings are RECORDED with a reason, never hidden: drop counts per
// worker are the quality signal about the worker.

import type { WorkerId } from "./prompts-v2.ts";
import type { RegistryPack } from "./packs/types.ts";
import { registryRowById } from "./packs/index.ts";

type Bag = Record<string, unknown>;

export type DropReason =
  | "no_quote"
  | "unlocatable_quote"
  | "unknown_block_key"
  | "unknown_intake_key"
  | "value_mismatch"
  | "unknown_registry_row"
  | "misquoted_registry"
  | "registry_text_unavailable"
  | "malformed";

export interface ValidatedFinding {
  readonly id: string;
  readonly worker: WorkerId;
  readonly kind: string | null;
  readonly severity: "critical" | "high" | "editorial";
  readonly confidence: string | null;
  readonly block_key: string;
  readonly quote: string;
  readonly why: string;
  readonly intake_key: string | null;
  readonly intake_value: string | null;
  readonly registry_row_id: string | null;
  readonly registry_quote: string | null;
  readonly binding: string | null;
  readonly block_key_b: string | null;
  readonly quote_b: string | null;
  /** True when the worker's block key did not contain the quote and the validator moved it. */
  readonly reanchored: boolean;
}

export interface DroppedFinding {
  readonly id: string;
  readonly worker: WorkerId;
  readonly reason: DropReason;
  readonly quote: string | null;
  readonly detail: string;
}

export interface ValidationContext {
  readonly documentText: string;
  /** block key → text, from document-blocks.ts */
  readonly blocks: ReadonlyMap<string, string>;
  readonly intake: unknown;
  readonly registryPack: RegistryPack | null;
}

export interface ValidationV2Result {
  readonly findings: ValidatedFinding[];
  readonly dropped: DroppedFinding[];
  /** W-LAW only: the unbound statements the worker listed, passed through with locatability checked. */
  readonly unbound: Array<{ block_key: string; quote: string; proposed_row_id: string | null; consistent: boolean; note: string | null; locatable: boolean }>;
}

/** Whitespace- and quote-mark-insensitive form (mirrors validate.ts). */
export function normalise(s: string): string {
  return s
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null;

const SEVERITIES = new Set(["critical", "high", "editorial"]);
const severityOf = (v: unknown): "critical" | "high" | "editorial" => {
  const s = String(v ?? "").toLowerCase();
  return SEVERITIES.has(s) ? s as "critical" | "high" | "editorial" : "editorial";
};

/** Minimum quote length that is evidence of anything. */
const MIN_QUOTE = 12;

function locate(quote: string, ctx: ValidationContext): { ok: boolean; blocksContaining: string[] } {
  const needle = normalise(quote);
  if (needle.length < MIN_QUOTE) return { ok: false, blocksContaining: [] };
  const inDoc = normalise(ctx.documentText).includes(needle);
  const blocksContaining: string[] = [];
  for (const [key, text] of ctx.blocks) if (normalise(text).includes(needle)) blocksContaining.push(key);
  return { ok: inDoc || blocksContaining.length > 0, blocksContaining };
}

/** Resolve `a.b[2].c` / `a.b.2.c` against the intake. */
export function lookupIntake(intake: unknown, path: string): { found: boolean; value: unknown } {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").map((p) => p.trim()).filter(Boolean);
  let cur: unknown = intake;
  for (const p of parts) {
    if (cur === null || cur === undefined) return { found: false, value: undefined };
    if (Array.isArray(cur)) {
      const i = Number(p);
      if (!Number.isInteger(i) || i < 0 || i >= cur.length) return { found: false, value: undefined };
      cur = cur[i];
      continue;
    }
    if (typeof cur !== "object") return { found: false, value: undefined };
    if (!(p in (cur as Bag))) return { found: false, value: undefined };
    cur = (cur as Bag)[p];
  }
  return { found: true, value: cur };
}

function scalarText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

/** Does the worker's reported value match the stored one? Scalars compare normalised; a scalar may name one element of an array; objects/arrays compare as JSON. */
export function valueMatches(reported: string | null, stored: unknown): boolean {
  if (reported === null) return stored === null || stored === undefined || stored === "";
  const r = normalise(reported);
  if (Array.isArray(stored)) {
    if (stored.some((e) => normalise(scalarText(e)) === r)) return true;
    return normalise(JSON.stringify(stored)) === r || normalise(stored.map(scalarText).join(", ")) === r;
  }
  if (stored && typeof stored === "object") return normalise(JSON.stringify(stored)) === r;
  const s = normalise(scalarText(stored));
  if (s === r) return true;
  // A reported value may be the stored value with surrounding quotes or a
  // trailing period the worker copied from the document.
  return s === r.replace(/^["']|["'.]$/g, "") || r.includes(s) && s.length >= MIN_QUOTE;
}

function anchor(
  quote: string, claimedKey: string, ctx: ValidationContext,
): { ok: true; key: string; reanchored: boolean } | { ok: false; reason: DropReason; detail: string } {
  const loc = locate(quote, ctx);
  if (!loc.ok) return { ok: false, reason: "unlocatable_quote", detail: `quote not found in the document` };
  if (ctx.blocks.has(claimedKey)) {
    if (loc.blocksContaining.includes(claimedKey)) return { ok: true, key: claimedKey, reanchored: false };
    if (loc.blocksContaining.length) return { ok: true, key: loc.blocksContaining[0], reanchored: true };
    return { ok: true, key: claimedKey, reanchored: false }; // quote in the flattened doc but not in a block (title/subtitle)
  }
  if (loc.blocksContaining.length) return { ok: true, key: loc.blocksContaining[0], reanchored: true };
  return { ok: false, reason: "unknown_block_key", detail: `block ${claimedKey} does not exist and the quote sits in no block` };
}

export function validateWorkerFindings(worker: WorkerId, parsed: unknown, ctx: ValidationContext): ValidationV2Result {
  const src = (parsed ?? {}) as Bag;
  const list = Array.isArray(src.findings) ? src.findings as Bag[] : [];
  const findings: ValidatedFinding[] = [];
  const dropped: DroppedFinding[] = [];

  list.forEach((f, i) => {
    const id = str(f.id) ?? `${worker.toLowerCase()}-${i + 1}`;
    const drop = (reason: DropReason, detail: string, quote: string | null) => dropped.push({ id, worker, reason, quote: quote?.slice(0, 200) ?? null, detail });

    const quote = str(worker === "W-REASON" ? f.quote_a : f.quote);
    if (!quote) { drop("no_quote", "finding carries no quote", null); return; }
    const claimedKey = str(worker === "W-REASON" ? f.block_key_a : f.block_key);
    if (!claimedKey) { drop("malformed", "finding carries no block key", quote); return; }
    const a = anchor(quote, claimedKey, ctx);
    if (!a.ok) { drop(a.reason, a.detail, quote); return; }

    let intake_key: string | null = null;
    let intake_value: string | null = null;
    let registry_row_id: string | null = null;
    let registry_quote: string | null = null;
    let binding: string | null = null;
    let block_key_b: string | null = null;
    let quote_b: string | null = null;
    let reanchored = a.reanchored;

    if (worker === "W-RECORD") {
      intake_key = str(f.intake_key);
      intake_value = str(f.intake_value);
      const kind = str(f.kind);
      if (!intake_key) { drop("malformed", "W-RECORD finding carries no intake key", quote); return; }
      const looked = lookupIntake(ctx.intake, intake_key);
      if (kind === "unsupported") {
        // The worker says NO value supports the statement: the key it looked
        // for may legitimately be absent. Nothing further to check.
      } else {
        if (!looked.found) { drop("unknown_intake_key", `intake key ${intake_key} does not exist`, quote); return; }
        if (!valueMatches(intake_value, looked.value)) {
          drop("value_mismatch", `reported "${(intake_value ?? "").slice(0, 80)}" vs stored "${scalarText(looked.value).slice(0, 80)}"`, quote);
          return;
        }
      }
    }

    if (worker === "W-LAW") {
      binding = str(f.binding) ?? "bound";
      registry_row_id = str(f.registry_row_id);
      registry_quote = str(f.registry_quote);
      const divergence = str(f.divergence) ?? "";
      const noRow = /^NO ROW:/i.test(divergence);
      if (registry_row_id) {
        const row = ctx.registryPack ? registryRowById(ctx.registryPack, registry_row_id) : null;
        if (!row) { drop("unknown_registry_row", `registry row ${registry_row_id} does not exist`, quote); return; }
        if (registry_quote) {
          if (row.verbatim_quote === null) { drop("registry_text_unavailable", `row ${registry_row_id} has no text at review time (locator not hydrated)`, quote); return; }
          if (!normalise(row.verbatim_quote).includes(normalise(registry_quote))) {
            drop("misquoted_registry", `registry quote is not a verbatim substring of row ${registry_row_id}`, quote);
            return;
          }
        }
      } else if (!noRow && binding === "bound") {
        drop("malformed", "a bound W-LAW finding names no registry row", quote); return;
      }
    }

    if (worker === "W-REASON") {
      block_key_b = str(f.block_key_b);
      quote_b = str(f.quote_b);
      if (quote_b) {
        const b = anchor(quote_b, block_key_b ?? a.key, ctx);
        if (!b.ok) { drop(b.reason, `second quote: ${b.detail}`, quote_b); return; }
        block_key_b = b.key;
        reanchored = reanchored || b.reanchored;
      }
    }

    findings.push({
      id,
      worker,
      kind: str(f.kind),
      severity: severityOf(f.severity),
      confidence: str(f.confidence),
      block_key: a.key,
      quote,
      why: str(worker === "W-RECORD" ? f.mismatch : worker === "W-LAW" ? f.divergence : f.why) ?? "",
      intake_key,
      intake_value,
      registry_row_id,
      registry_quote,
      binding,
      block_key_b,
      quote_b,
      reanchored,
    });
  });

  const unbound: ValidationV2Result["unbound"] = [];
  if (worker === "W-LAW" && Array.isArray(src.unbound_statements)) {
    for (const u of src.unbound_statements as Bag[]) {
      const q = str(u.quote);
      const k = str(u.block_key);
      if (!q || !k) continue;
      unbound.push({
        block_key: k,
        quote: q,
        proposed_row_id: str(u.proposed_row_id),
        consistent: u.consistent === true,
        note: str(u.note),
        locatable: locate(q, ctx).ok,
      });
    }
  }

  return { findings, dropped, unbound };
}
