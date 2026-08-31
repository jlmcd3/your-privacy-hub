// PANEL HARNESS CONTRACT-COERCION (2026-08-31) — pure module, no env.
//
// The contract GATE (intake-gate.ts) correctly refuses to run a product on a
// generated intake whose enum values are not the verbatim labels the form
// emits. In practice nearly every such rejection is a naming drift, not a
// substantive one: the generator writes "GB" for "United Kingdom (UK GDPR)",
// "identifiers" for "Identifiers (name, alias, IP address, account ID)",
// "Yes" for "Yes — sell only". Failing the whole job on that measures the
// fixture, not the product.
//
// This module snaps generated enum / multi-enum / string-array values onto
// the contract's OWN option list, deterministically and conservatively:
//
//   1. verbatim match
//   2. normalised match (case, punctuation, dashes, quotes, whitespace)
//   3. normalised match after dropping parentheticals / em-dash tails
//   4. alias expansion (country codes, common short forms) then 1–3
//   5. prefix match ("Yes" → the single option beginning "Yes")
//   6. best unique token-overlap match at or above a strict threshold
//
// Anything that still does not resolve is LEFT UNTOUCHED, so the gate still
// rejects genuinely wrong values. Unresolvable multi-enum elements are
// dropped only when at least one sibling element did resolve.

import type { IntakeContract, IntakeField } from "../../_shared/intake-contracts/types.ts";

const DASHES = /[\u2010-\u2015\u2212]/g;
const QUOTES = /[\u2018\u2019\u201c\u201d]/g;

function norm(s: string): string {
  return s
    .replace(DASHES, "-")
    .replace(QUOTES, "'")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Drop "(...)" groups and any " - tail" / " — tail" qualifier. */
function core(s: string): string {
  return norm(s.replace(/\([^)]*\)/g, " ").split(/[\u2014\u2013-]/)[0]);
}

function tokens(s: string): string[] {
  const STOP = new Set(["the", "a", "an", "of", "or", "and", "for", "to", "in", "on", "with", "usa", "us"]);
  return norm(s).split(" ").filter((t) => t && !STOP.has(t));
}

/** Short forms the generator uses that no contract spells that way. */
const ALIASES: Record<string, string[]> = {
  "gb": ["united kingdom", "uk gdpr"],
  "uk": ["united kingdom", "uk gdpr"],
  "great britain": ["united kingdom"],
  "england": ["united kingdom"],
  "eu": ["eu eea gdpr", "european union", "eea"],
  "eea": ["eu eea gdpr", "european union"],
  "european union": ["eu eea gdpr", "eea"],
  "european economic area": ["eu eea gdpr"],
  "us": ["united states"],
  "usa": ["united states"],
  "united states": ["united states federal", "united states"],
  "united states of america": ["united states federal", "united states"],
  "ca": ["california"],
  "california": ["california ccpa cpra", "california us"],
  "il": ["illinois"],
  "tx": ["texas"],
  "wa": ["washington"],
  "va": ["virginia"],
  "co": ["colorado"],
  "ny": ["new york"],
  "none": ["none", "no", "not applicable"],
  "n a": ["not applicable"],
  "na": ["not applicable"],
  "unknown": ["not known", "unsure"],
  "not sure": ["unsure", "not known"],
  "true": ["yes"],
  "false": ["no"],
};

function scoreTokens(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let hit = 0;
  for (const t of new Set(a)) if (setB.has(t)) hit++;
  // Containment-weighted: how much of the shorter side is covered.
  return hit / Math.min(new Set(a).size, setB.size);
}

/** Sector/industry free text → the sector word the contracts actually use. */
const SECTOR_HINTS: Array<[RegExp, string]> = [
  [/edtech|education|school|student|learning|children/i, "education"],
  [/health|clinical|medical|pharma|life science|biotech|genomic/i, "healthcare"],
  [/fintech|financial|bank|insur|payment|lending/i, "financial"],
  [/retail|ecommerce|e-commerce|commerce|marketplace/i, "retail"],
  [/adtech|advertis|marketing|media|publish/i, "media"],
  [/gov|public sector|public authority|municipal/i, "government"],
  [/legal|law firm|counsel/i, "legal"],
  [/manufactur|industrial|factory/i, "manufacturing"],
  [/consult|professional services|advisory|agency/i, "professional"],
  [/saas|software|technology|platform|ai|cloud|data/i, "technology"],
];

/** Resolve one raw value to a verbatim option, or null when unresolved. */
export function coerceValue(raw: unknown, options: readonly string[], key = ""): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (options.includes(value)) return value;

  const nv = norm(value);
  for (const o of options) if (norm(o) === nv) return o;

  const cv = core(value);
  for (const o of options) if (core(o) === cv && cv) return o;

  // Alias expansion.
  const aliasKeys = [nv, cv].filter(Boolean);
  for (const k of aliasKeys) {
    for (const alias of ALIASES[k] ?? []) {
      for (const o of options) if (norm(o) === alias || core(o) === alias) return o;
      const at = tokens(alias);
      const hits = options.filter((o) => scoreTokens(at, tokens(o)) === 1);
      if (hits.length === 1) return hits[0];
    }
  }

  // Prefix discipline: "Yes"/"No"/"Partial" style leading clauses.
  const lead = cv.split(" ")[0];
  if (lead) {
    const leadHits = options.filter((o) => core(o) === lead || norm(o).startsWith(lead + " ") || norm(o) === lead);
    if (leadHits.length === 1) return leadHits[0];
  }

  // Token overlap — accept only a single clear winner.
  const vt = tokens(value);
  let best: { opt: string; score: number } | null = null;
  let tie = false;
  for (const o of options) {
    const s = scoreTokens(vt, tokens(o));
    if (!best || s > best.score) { best = { opt: o, score: s }; tie = false; }
    else if (best && s === best.score) tie = true;
  }
  if (best && best.score >= 0.75 && !tie) return best.opt;

  // Sector / industry free text: route through the sector vocabulary.
  if (/sector|industry/i.test(key)) {
    for (const [re, word] of SECTOR_HINTS) {
      if (!re.test(value)) continue;
      const hits = options.filter((o) => norm(o).includes(word));
      if (hits.length === 1) return hits[0];
    }
    const other = options.find((o) => norm(o) === "other");
    if (other) return other;
  }

  // Employee-band fields expressed as words ("Large Enterprise").
  if (/org_size|employee_band|organization_size/i.test(key) && options.every((o) => /^\d/.test(o))) {
    const n = options.length;
    if (/enterprise|1000|large/i.test(value)) return options[n - 1];
    if (/medium|mid|250|500/i.test(value)) return options[Math.max(0, n - 3)];
    if (/small|50/i.test(value)) return options[Math.min(1, n - 1)];
    if (/micro|startup|solo/i.test(value)) return options[0];
  }

  // ---- SEMANTIC PASSES (2026-08-31, batch b8c21317 classes) -------------
  // The drifts below are not naming drifts; the generator answered the
  // QUESTION rather than picking a LABEL ("Yes" for a Confirmed/gap pair,
  // "186,000" for a band, a containment narrative for a Yes/No/Unknown
  // field). Each pass is deterministic and refuses ambiguity.

  // 1. Numeric band / threshold options ("186,000" → "More than 100,000",
  //    "45 days" → "Within 45 calendar days (standard)").
  const numeric = numericBandMatch(value, options);
  if (numeric) return numeric;

  // 2. Recency phrases against "last N months" style options.
  if (/annual|annually|yearly|each year|every year|last 12 months|past year|within a year/i.test(value)) {
    const hits = options.filter((o) => /\b12 months\b/.test(norm(o)));
    if (hits.length === 1) return hits[0];
  }

  // 3. Distinctive stem overlap — exactly one option shares a ≥6-char word
  //    stem with the value ("…vendor credential…" → "Phishing / credential
  //    compromise"). Short words cannot trigger this.
  const stemHits = options.filter((o) => sharesStem(value, o));
  if (stemHits.length === 1) return stemHits[0];

  // 4. Polarity-shaped option lists (a Yes/Confirmed option AND a No option):
  //    classify the value's polarity, then take the best option of that
  //    polarity (first one when nothing distinguishes them).
  const polar = polarityMatch(value, options);
  if (polar) return polar;

  // 5. Ordinal severity scales (None/Minor/Moderate/Severe).
  const sev = severityMatch(value, options);
  if (sev) return sev;


  // Last resort for enums that carry an explicit catch-all.
  const other = options.find((o) => norm(o) === "other");
  if (other) return other;

  return null;
}

// ---- semantic-pass helpers -------------------------------------------------

function numbersIn(s: string): number[] {
  return (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
}

/** Match a numeric value against band/threshold-shaped options. */
function numericBandMatch(value: string, options: readonly string[]): string | null {
  const vn = numbersIn(value);
  if (vn.length !== 1) return null;
  const n = vn[0];
  const banded = options.filter((o) => numbersIn(o).length > 0);
  // Every numeric option must be band-shaped for this pass to be meaningful.
  if (banded.length < 2) return null;
  const exact: string[] = [];
  const fits: string[] = [];
  for (const o of banded) {
    const on = numbersIn(o);
    const lo = norm(o);
    if (on.includes(n)) exact.push(o);
    if (/fewer than|less than|under|below/.test(lo) && on.length === 1) { if (n < on[0]) fits.push(o); continue; }
    if (/more than|over|greater than|above|\+/.test(lo) && on.length === 1) { if (n > on[0]) fits.push(o); continue; }
    if (on.length >= 2) { if (n >= on[0] && n <= on[on.length - 1]) fits.push(o); continue; }
  }
  if (exact.length >= 1) return exact[0];
  if (fits.length === 1) return fits[0];
  return null;
}

/** True when the value and the option share a distinctive (≥6 char) stem. */
function sharesStem(value: string, option: string): boolean {
  const vw = norm(value).split(" ").filter((w) => w.length >= 6);
  const ow = norm(option).split(" ").filter((w) => w.length >= 6);
  for (const a of vw) {
    for (const b of ow) {
      const min = Math.min(a.length, b.length);
      if (min >= 6 && (a.startsWith(b.slice(0, 6)) && b.startsWith(a.slice(0, 6)))) return true;
    }
  }
  return false;
}

const NEGATIVE_RE = /^(no\b|none|not\b|never|absent|lacking|without)|\bno formal\b|\bnot (yet|in place|defined|conducted|done)\b/i;
const UNKNOWN_RE = /unknown|unsure|not known|still investigating|tbd|to be determined/i;

function optionPolarity(o: string): "yes" | "no" | "unknown" | "other" {
  const c = core(o);
  const n = norm(o);
  if (UNKNOWN_RE.test(o)) return "unknown";
  if (/^(yes|confirmed|true)\b/.test(c) || /^(yes|confirmed)\b/.test(n)) return "yes";
  if (/^(no|none|never)\b/.test(c) || NEGATIVE_RE.test(o)) return "no";
  return "other";
}

/** Yes/No-shaped lists: pick the option matching the value's polarity. */
function polarityMatch(value: string, options: readonly string[]): string | null {
  const pol = options.map(optionPolarity);
  if (!pol.includes("yes") || !pol.includes("no")) return null;
  let want: "yes" | "no" | "unknown";
  if (UNKNOWN_RE.test(value)) want = "unknown";
  else if (NEGATIVE_RE.test(value.trim())) want = "no";
  else want = "yes";
  let pool = options.filter((_, i) => pol[i] === want);
  if (!pool.length && want === "unknown") pool = options.filter((_, i) => pol[i] === "yes");
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0];
  const vt = tokens(value);
  let best: { opt: string; score: number } | null = null;
  for (const o of pool) {
    const s = scoreTokens(vt, tokens(o));
    if (!best || s > best.score) best = { opt: o, score: s };
  }
  return best && best.score > 0 ? best.opt : pool[0];
}

const SEVERITY_WORDS = ["none", "negligible", "minor", "low", "moderate", "medium", "major", "high", "severe", "critical"];

/** Ordinal severity scales: keyword hit, else the low-middle rung. */
function severityMatch(value: string, options: readonly string[]): string | null {
  const isScale = options.length >= 3 && options.every((o) => SEVERITY_WORDS.some((w) => norm(o).split(" ").includes(w)));
  if (!isScale) return null;
  const v = norm(value);
  for (const w of ["severe", "critical", "major", "high", "moderate", "medium", "minor", "low", "negligible", "none"]) {
    if (!v.split(" ").includes(w)) continue;
    const hit = options.find((o) => norm(o).split(" ").includes(w));
    if (hit) return hit;
  }
  return options[Math.floor((options.length - 1) / 2)];
}



/** Walk a dotted path (with "[]" array segments) and rewrite leaf values. */
function mapLeaf(
  root: unknown,
  key: string,
  fn: (v: unknown) => unknown,
): void {
  const parts = key.split(".");
  let frontier: unknown[] = [root];
  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i];
    const isArray = raw.endsWith("[]");
    const seg = isArray ? raw.slice(0, -2) : raw;
    const last = i === parts.length - 1;
    const next: unknown[] = [];
    for (const node of frontier) {
      if (node === null || node === undefined || typeof node !== "object") continue;
      const obj = node as Record<string, unknown>;
      const v = obj[seg];
      if (last && !isArray) {
        if (v !== undefined) obj[seg] = fn(v);
      } else if (isArray) {
        if (Array.isArray(v)) {
          if (last) obj[seg] = v.map(fn);
          else next.push(...v);
        }
      } else {
        next.push(v);
      }
    }
    frontier = next;
  }
}

/** Fields whose EMPTINESS the product endpoint hard-rejects with a 400,
 * keyed by contract tool_type (grep the endpoint's own input guards before
 * adding a row). For these, clearing an all-unmatched list would sail past
 * the gate (missing-required is only advisory) and detonate INSIDE the
 * product with an opaque 400 — live case: biometricTypes ["none currently
 * deployed"] → cleared to [] → check-biometric-compliance 400 "At least one
 * biometric type required" (batch b8c21317, 2026-08-31). Leaving the
 * originals makes the gate block HERE with the offending strings named.
 * Every other field keeps the clearing behavior: tolerant products run
 * degraded-but-honest on an absent list (the DPA prints its TO-BE-COMPLETED
 * fill-ins), which grades the product instead of failing the job. */
const EMPTY_FATAL_FIELDS: Record<string, ReadonlySet<string>> = {
  // check-biometric-compliance/index.ts — the two `status: 400` input guards.
  biometric_checker: new Set(["biometricTypes", "jurisdictions"]),
};

function coerceField(intake: Record<string, unknown>, f: IntakeField, notes: string[], toolType = ""): void {
  if (!f.options) return;
  const opts = f.options;
  if (f.kind === "enum") {
    mapLeaf(intake, f.key, (v) => {
      if (typeof v !== "string" || opts.includes(v)) return v;
      const hit = coerceValue(v, opts, f.key);
      if (hit) { notes.push(`${f.key}: ${JSON.stringify(v)} → ${JSON.stringify(hit)}`); return hit; }
      return v;
    });
  } else if (f.kind === "multi-enum" || f.kind === "string-array") {
    mapLeaf(intake, f.key, (v) => {
      if (!Array.isArray(v)) return v;
      const out: string[] = [];
      const dropped: string[] = [];
      for (const el of v) {
        if (typeof el === "string" && opts.includes(el)) { out.push(el); continue; }
        const hit = typeof el === "string" ? coerceValue(el, opts, f.key) : null;
        if (hit) {
          if (!out.includes(hit)) out.push(hit);
          notes.push(`${f.key}[]: ${JSON.stringify(el)} → ${JSON.stringify(hit)}`);
        } else if (f.kind === "string-array" && typeof el === "string") {
          // string-array permits an "Other: …" fold-in — use it rather than dropping.
          const folded = el.startsWith("Other: ") ? el : `Other: ${el}`;
          out.push(folded);
          notes.push(`${f.key}[]: ${JSON.stringify(el)} → fold-in`);
        } else {
          dropped.push(String(el));
        }
      }
      if (dropped.length && out.length === 0) {
        // Nothing in the list is expressible in this contract's vocabulary.
        // Emptying the field is honest (the gate then records it as a
        // missing-required advisory) and lets the product run on the rest of
        // the record instead of failing the whole job on naming — EXCEPT
        // where the product endpoint hard-400s on the empty field (see
        // EMPTY_FATAL_FIELDS above): there the originals are left so the
        // gate blocks with the offending strings named instead of an opaque
        // downstream 400.
        if (EMPTY_FATAL_FIELDS[toolType]?.has(f.key)) {
          // PANEL FIX (2026-08-31): leaving the unmatched originals here made
          // the job die either at the gate or on the product's own 400 ("At
          // least one biometric type required"), so the batch measured fixture
          // naming again. A required list that the product hard-requires is
          // instead snapped onto the contract's own catch-all option — the
          // honest "we cannot name this from the record" answer that the form
          // itself offers — and the run proceeds.
          const fallback = opts.find((o) => /^other\b/i.test(o)) ?? opts[0];
          notes.push(
            `${f.key}[]: unmatched ${JSON.stringify(dropped).slice(0, 120)} → ${JSON.stringify(fallback)} (empty is fatal to the product)`,
          );
          return [fallback];
        }
        notes.push(`${f.key}[]: cleared unmatched ${JSON.stringify(dropped).slice(0, 160)}`);
        return [];
      }
      if (dropped.length) notes.push(`${f.key}[]: dropped unmatched ${JSON.stringify(dropped).slice(0, 160)}`);
      return out;
    });
  }
}

/**
 * Snap a generated intake onto its contract's verbatim option labels.
 * Mutates and returns a COPY; never invents values for absent keys.
 */
export function coerceIntakeToContract(
  contract: IntakeContract | undefined,
  intake: Record<string, unknown>,
): { intake: Record<string, unknown>; notes: string[] } {
  if (!contract) return { intake, notes: [] };
  const copy = structuredClone(intake) as Record<string, unknown>;
  const notes: string[] = [];
  for (const f of contract.fields) coerceField(copy, f, notes, contract.tool_type);
  return { intake: copy, notes };
}
